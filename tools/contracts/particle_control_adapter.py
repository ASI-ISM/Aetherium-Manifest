from __future__ import annotations

from typing import Any

FLOW_DIRECTIONS = {
    "clockwise",
    "counterclockwise",
    "inward",
    "outward",
    "centripetal",
    "centrifugal",
    "bidirectional",
    "still",
}

SHAPES = {"ring", "helix", "spiral_vortex", "sphere", "stream", "burst", "lattice"}
PALETTE_MODES = {"adaptive", "dual_tone", "thermal", "spectral", "monochrome"}


def _clamp_float(value: Any, minimum: float = 0.0, maximum: float = 1.0, default: float = 0.0) -> float:
    try:
        coerced = float(value)
    except (TypeError, ValueError):
        coerced = default
    return max(minimum, min(maximum, coerced))


def _coerce_enum(value: Any, allowed: set[str], default: str) -> str:
    candidate = str(value or default)
    return candidate if candidate in allowed else default


def _particle_count_from_density(density: float) -> int:
    return int(round(density * 50000))


def to_renderer_controls(particle_control: dict[str, Any]) -> dict[str, Any]:
    """Compile canonical particle intent/state into explicit renderer/runtime controls."""
    intent = particle_control.get("intent_state", {})
    palette = intent.get("palette", {})

    shape = _coerce_enum(intent.get("shape"), SHAPES, "ring")
    density = _clamp_float(intent.get("particle_density"), default=0.2)
    glow_intensity = _clamp_float(intent.get("glow_intensity"), default=0.5)
    flicker = _clamp_float(intent.get("flicker"), default=0.0)
    cohesion = _clamp_float(intent.get("cohesion"), default=0.5)
    velocity = _clamp_float(intent.get("velocity"), default=0.3)
    turbulence = _clamp_float(intent.get("turbulence"), default=0.0)

    return {
        "base_shape": shape,
        "chromatic_mode": _coerce_enum(palette.get("mode"), PALETTE_MODES, "adaptive"),
        "particle_count": _particle_count_from_density(density),
        "flow_field": _coerce_enum(intent.get("flow_direction"), FLOW_DIRECTIONS, "still"),
        "shader_uniforms": {
            "glow_intensity": glow_intensity,
            "flicker": flicker,
            "cohesion": cohesion,
            "velocity": velocity,
            "turbulence": turbulence,
            "primary_color": palette.get("primary", "#FFFFFF"),
            "secondary_color": palette.get("secondary", "#FFFFFF"),
            "attractor": str(intent.get("attractor", "core")),
            "state": str(intent.get("state", "idle")),
        },
        "runtime_profile": "cinematic" if density >= 0.75 else "adaptive" if velocity >= 0.6 else "deterministic",
    }


def to_visual_manifestation(particle_control: dict[str, Any], transition_type: str = "pulse", device_tier: int = 1) -> dict[str, Any]:
    """Compile canonical particle control into legacy visual_manifestation shape."""
    intent = particle_control.get("intent_state", {})
    renderer = particle_control.get("renderer_controls") or to_renderer_controls(particle_control)
    uniforms = renderer.get("shader_uniforms", {})

    return {
        "base_shape": renderer.get("base_shape", "ring"),
        "transition_type": transition_type,
        "color_palette": {
            "primary": intent.get("palette", {}).get("primary", "#FFFFFF"),
            "secondary": intent.get("palette", {}).get("secondary"),
        },
        "particle_physics": {
            "turbulence": _clamp_float(intent.get("turbulence"), default=0.0),
            "flow_direction": renderer.get("flow_field", "still"),
            "luminance_mass": _clamp_float(intent.get("glow_intensity"), default=0.5),
            "particle_count": int(renderer.get("particle_count", 0)),
        },
        "chromatic_mode": renderer.get("chromatic_mode", "adaptive"),
        "emergency_override": False,
        "device_tier": max(1, min(4, int(device_tier))),
        "adapter_metadata": {
            "cohesion": _clamp_float(uniforms.get("cohesion"), default=0.5),
            "flicker": _clamp_float(uniforms.get("flicker"), default=0.0),
            "velocity": _clamp_float(uniforms.get("velocity"), default=0.3),
        },
    }
