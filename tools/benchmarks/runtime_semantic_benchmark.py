#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import statistics
from pathlib import Path
from typing import Any


DEFAULT_SLO = {
    "compile_latency_p95_ms": 85.0,
    "tick_stability_p95_delta_ms": 1.6,
    "gpu_p95_utilization": 0.85,
    "cpu_p95_utilization": 0.8,
    "memory_p95_mb": 2048.0,
    "render_pipeline_p95_ms": 45.0,
    "semantic_composite_min": 0.8,
}

PERFORMANCE_SUITES = [
    "compile_latency",
    "runtime_tick_stability",
    "resource_envelope",
]

SEMANTIC_SUITES = [
    "intent_to_field_faithfulness",
    "temporal_continuity_quality",
    "human_model_legibility",
]


def _percentile(values: list[float], percentile: float = 0.95) -> float | None:
    if not values:
        return None
    sorted_values = sorted(values)
    idx = max(0, int(len(sorted_values) * percentile) - 1)
    return round(sorted_values[idx], 4)


def _mean(values: list[float]) -> float | None:
    if not values:
        return None
    return round(statistics.fmean(values), 4)


def run_benchmark(payload: dict[str, Any]) -> dict[str, Any]:
    slo = {**DEFAULT_SLO, **payload.get("slo_targets", {})}

    compile_latency_samples = payload.get("compile_latency_ms", [])
    tick_delta_samples = payload.get("tick_delta_ms", [])
    render_pipeline_samples = payload.get("render_pipeline_ms", [])
    resource_samples = payload.get("resource_samples", [])

    faithfulness_scores = payload.get("intent_faithfulness_scores", [])
    temporal_scores = payload.get("temporal_continuity_scores", [])
    legibility_scores = payload.get("legibility_scores", [])

    compile_p95 = _percentile(compile_latency_samples)
    tick_p95 = _percentile(tick_delta_samples)
    render_p95 = _percentile(render_pipeline_samples)

    gpu_samples = [float(row.get("gpu_utilization", 0.0)) for row in resource_samples]
    cpu_samples = [float(row.get("cpu_utilization", 0.0)) for row in resource_samples]
    memory_samples = [float(row.get("memory_mb", 0.0)) for row in resource_samples]

    legibility_human = [float(row.get("human", 0.0)) for row in legibility_scores]
    legibility_model = [float(row.get("model", 0.0)) for row in legibility_scores]
    legibility_pairs = [
        round((human * 0.6) + (model * 0.4), 4)
        for human, model in zip(legibility_human, legibility_model)
    ]

    suite_results = {
        "compile_latency": {
            "mean_ms": _mean(compile_latency_samples),
            "p95_ms": compile_p95,
            "slo_target_p95_ms": slo["compile_latency_p95_ms"],
            "pass": compile_p95 is not None and compile_p95 <= slo["compile_latency_p95_ms"],
        },
        "runtime_tick_stability": {
            "mean_delta_ms": _mean(tick_delta_samples),
            "p95_delta_ms": tick_p95,
            "slo_target_p95_delta_ms": slo["tick_stability_p95_delta_ms"],
            "pass": tick_p95 is not None and tick_p95 <= slo["tick_stability_p95_delta_ms"],
        },
        "resource_envelope": {
            "gpu_p95": _percentile(gpu_samples),
            "cpu_p95": _percentile(cpu_samples),
            "memory_p95_mb": _percentile(memory_samples),
            "targets": {
                "gpu_p95_utilization": slo["gpu_p95_utilization"],
                "cpu_p95_utilization": slo["cpu_p95_utilization"],
                "memory_p95_mb": slo["memory_p95_mb"],
            },
            "pass": (
                _percentile(gpu_samples) is not None
                and _percentile(gpu_samples) <= slo["gpu_p95_utilization"]
                and _percentile(cpu_samples) is not None
                and _percentile(cpu_samples) <= slo["cpu_p95_utilization"]
                and _percentile(memory_samples) is not None
                and _percentile(memory_samples) <= slo["memory_p95_mb"]
            ),
        },
        "intent_to_field_faithfulness": {
            "mean_score": _mean(faithfulness_scores),
            "pass": _mean(faithfulness_scores) is not None and _mean(faithfulness_scores) >= slo["semantic_composite_min"],
        },
        "temporal_continuity_quality": {
            "mean_score": _mean(temporal_scores),
            "pass": _mean(temporal_scores) is not None and _mean(temporal_scores) >= slo["semantic_composite_min"],
        },
        "human_model_legibility": {
            "human_mean": _mean(legibility_human),
            "model_mean": _mean(legibility_model),
            "composite_mean": _mean(legibility_pairs),
            "pass": _mean(legibility_pairs) is not None and _mean(legibility_pairs) >= slo["semantic_composite_min"],
        },
    }

    expected_suites = PERFORMANCE_SUITES + SEMANTIC_SUITES
    completed_suites = [name for name in expected_suites if suite_results[name]["pass"] or suite_results[name]["pass"] is False]
    completion_rate = round(len(completed_suites) / len(expected_suites), 4) if expected_suites else 0.0

    semantic_composite = _mean(
        [
            score
            for score in [
                suite_results["intent_to_field_faithfulness"]["mean_score"],
                suite_results["temporal_continuity_quality"]["mean_score"],
                suite_results["human_model_legibility"]["composite_mean"],
            ]
            if score is not None
        ]
    )

    all_suites_green = all(suite_results[name]["pass"] for name in expected_suites)
    render_gate = render_p95 is not None and render_p95 <= slo["render_pipeline_p95_ms"]
    semantic_gate = semantic_composite is not None and semantic_composite >= slo["semantic_composite_min"]

    return {
        "performance_suites": {name: suite_results[name] for name in PERFORMANCE_SUITES},
        "semantic_quality_suites": {name: suite_results[name] for name in SEMANTIC_SUITES},
        "nightly_completion_rate": completion_rate,
        "render_pipeline": {
            "p95_ms": render_p95,
            "slo_target_p95_ms": slo["render_pipeline_p95_ms"],
            "pass": render_gate,
        },
        "semantic_composite_score": semantic_composite,
        "promotion_gates": {
            "canary": completion_rate == 1.0 and render_gate and semantic_gate,
            "ga": completion_rate == 1.0 and render_gate and semantic_gate and all_suites_green,
            "criteria": {
                "nightly_completion_rate": 1.0,
                "render_pipeline_p95_slo": slo["render_pipeline_p95_ms"],
                "semantic_composite_min": slo["semantic_composite_min"],
            },
        },
    }


def _main() -> int:
    parser = argparse.ArgumentParser(description="Runtime performance + semantic quality benchmark")
    parser.add_argument("--input", type=Path, required=True)
    args = parser.parse_args()

    with args.input.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    result = run_benchmark(payload)
    print(json.dumps(result, indent=2))
    return 0 if result["promotion_gates"]["canary"] else 1


if __name__ == "__main__":
    raise SystemExit(_main())
