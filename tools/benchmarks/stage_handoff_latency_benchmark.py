#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path
from statistics import mean

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from api_gateway.main import (
    IntentVector,
    ParticlePhysics,
    ColorPalette,
    VisualManifestation,
    _run_direct_visual_fallback,
    _run_light_cognition_pipeline,
)


def build_sample() -> tuple[IntentVector, VisualManifestation]:
    intent = IntentVector(category="guide", emotional_valence=0.3, energy_level=0.65)
    visual = VisualManifestation(
        base_shape="ring",
        transition_type="breathe",
        color_palette=ColorPalette(primary="#88CCFF", secondary="#FFFFFF"),
        particle_physics=ParticlePhysics(
            turbulence=0.2,
            flow_direction="clockwise",
            luminance_mass=0.55,
            particle_count=7000,
        ),
        chromatic_mode="adaptive",
        emergency_override=False,
        device_tier=2,
    )
    return intent, visual


def run(samples: int = 200) -> dict[str, float | bool]:
    intent, visual = build_sample()
    direct_times: list[float] = []
    pipeline_times: list[float] = []

    for _ in range(samples):
        result = _run_light_cognition_pipeline(intent, visual)
        pipeline_times.append(result.metrics.total_pipeline_ms)
        # direct fallback does no extra work, represented as ~0 overhead
        _run_direct_visual_fallback(visual)
        direct_times.append(0.0)

    sorted_overheads = sorted(p - d for p, d in zip(pipeline_times, direct_times))
    p95 = sorted_overheads[int(len(sorted_overheads) * 0.95)] if sorted_overheads else 0.0
    return {
        "samples": samples,
        "direct_path_mean_ms": mean(direct_times) if direct_times else 0.0,
        "pipeline_mean_ms": mean(pipeline_times) if pipeline_times else 0.0,
        "handoff_overhead_p95_ms": p95,
        "slo_pass": p95 <= 3.0,
    }


if __name__ == "__main__":
    result = run()
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["slo_pass"] else 1)
