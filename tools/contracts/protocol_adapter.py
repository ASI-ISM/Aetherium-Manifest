from __future__ import annotations

from typing import Any


def _to_float(value: Any, default: float = 0.0) -> float:
    if value is None or isinstance(value, bool):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def to_legacy_visual_parameters(payload: dict[str, Any]) -> dict[str, Any]:
    """Adapt embodiment envelopes to legacy consumers expecting visual_parameters."""
    contract_type = str(payload.get("contract_type", "")).upper()

    if contract_type == "EMBODIMENT_V1":
        visual = payload.get("visual_manifestation", {})
        cadence = visual.get("cadence", {})
        return {
            "base_shape": visual.get("core_shape", "ring"),
            "particle_density": _to_float(visual.get("particle_velocity"), 0.0),
            "turbulence": _to_float(visual.get("turbulence"), 0.0),
            "chromatic_aberration": _to_float(visual.get("chromatic_aberration"), 0.0),
            "tick_rate_hz": max(_to_float(cadence.get("bpm"), 60.0) / 60.0, 0.001),
        }

    if contract_type == "EMBODIMENT_V2":
        explicit = payload.get("visual_parameters")
        if isinstance(explicit, dict):
            return {
                "base_shape": explicit.get("base_shape", "ring"),
                "particle_density": _to_float(explicit.get("particle_density"), 0.0),
                "turbulence": _to_float(explicit.get("turbulence"), 0.0),
                "chromatic_aberration": _to_float(explicit.get("chromatic_aberration"), 0.0),
                "tick_rate_hz": max(_to_float(explicit.get("tick_rate_hz"), 0.001), 0.001),
            }

        semantic_field = payload.get("semantic_field", {})
        morphogenesis = payload.get("morphogenesis_plan", {})
        light_program = payload.get("light_program", {})
        tick_policy = payload.get("runtime_tick_policy", {})
        shader_uniforms = light_program.get("shader_uniforms", {})

        return {
            "base_shape": morphogenesis.get("topology_seeds", ["ring"])[0],
            "particle_density": _to_float(light_program.get("particle_targets", {}).get("count"), 0.0) / 10_000.0,
            "turbulence": _to_float(semantic_field.get("ambiguity"), 0.0),
            "chromatic_aberration": _to_float(shader_uniforms.get("chromatic_aberration"), 0.0),
            "tick_rate_hz": max(_to_float(tick_policy.get("tick_rate_hz"), 24.0), 0.001),
        }

    raise ValueError(f"unsupported contract_type for adapter: {contract_type!r}")


def roundtrip_envelope(payload: dict[str, Any]) -> dict[str, Any]:
    """Round-trip helper used in replay fixtures integrity checks."""
    legacy_visual = to_legacy_visual_parameters(payload)
    return {
        "contract_type": "EMBODIMENT_V1",
        "visual_parameters": legacy_visual,
    }
