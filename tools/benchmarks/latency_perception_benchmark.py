#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import statistics
from pathlib import Path
from typing import Any


def perceived_latency_ms(sample: dict[str, float]) -> float:
    raw_rtt = sample["raw_rtt_ms"]
    render = sample["render_pipeline_ms"]
    cognitive = sample["cognitive_settle_ms"]
    mismatch_penalty = sample.get("prediction_mismatch", 0.0) * 25
    return raw_rtt * 0.35 + render * 0.4 + cognitive * 0.25 + mismatch_penalty


def run_benchmark(samples: list[dict[str, float]]) -> dict[str, Any]:
    if not samples:
        return {
            "sample_count": 0,
            "raw_rtt_ms": {"mean": None, "p95": None},
            "perceived_latency_ms": {"mean": None, "p95": None},
            "gunui_target_met": False,
        }

    raw = [row["raw_rtt_ms"] for row in samples]
    perceived = [perceived_latency_ms(row) for row in samples]
    return {
        "sample_count": len(samples),
        "raw_rtt_ms": {
            "mean": round(statistics.fmean(raw), 3),
            "p95": round(sorted(raw)[max(0, int(len(raw) * 0.95) - 1)], 3),
        },
        "perceived_latency_ms": {
            "mean": round(statistics.fmean(perceived), 3),
            "p95": round(sorted(perceived)[max(0, int(len(perceived) * 0.95) - 1)], 3),
        },
        "gunui_target_met": round(statistics.fmean(perceived), 3) <= 120.0,
    }


def _main() -> int:
    parser = argparse.ArgumentParser(description="Latency perception benchmark")
    parser.add_argument("--input", type=Path, required=True)
    args = parser.parse_args()

    with args.input.open("r", encoding="utf-8") as handle:
        samples = json.load(handle)

    result = run_benchmark(samples)
    print(json.dumps(result, indent=2))
    return 0 if result["gunui_target_met"] else 1


if __name__ == "__main__":
    raise SystemExit(_main())
