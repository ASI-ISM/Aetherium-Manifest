from __future__ import annotations

import hashlib
import uuid
from typing import Any

GOAL_PRESETS: dict[str, list[dict[str, Any]]] = {
    "pure_light": [
        {"name": "CALM", "constraints_delta": {"particle_bias": -0.12, "luma_bias": 0.08}},
        {"name": "DEEP_FOCUS", "constraints_delta": {"particle_bias": 0.06, "cohesion_bias": 0.16}},
        {"name": "AETHER_WAVE", "constraints_delta": {"motion_bias": 0.2, "flicker_limit": 0.18}},
        {"name": "SACRED_MINIMAL", "constraints_delta": {"particle_bias": -0.24, "symmetry": "radial"}},
        {"name": "AURORA_PULSE", "constraints_delta": {"hue_shift": 18, "flow_bias": "spiral"}},
    ],
    "image": [
        {"name": "EDITORIAL", "constraints_delta": {"contrast": 0.2, "grain": 0.05}},
        {"name": "CINEMATIC", "constraints_delta": {"contrast": 0.28, "bloom": 0.15}},
        {"name": "MINIMAL", "constraints_delta": {"saturation": -0.18, "space": 0.24}},
        {"name": "BRAND_STRICT", "constraints_delta": {"palette_lock": True, "typography": "precise"}},
        {"name": "STORYBOARD", "constraints_delta": {"panel_rhythm": "3-act", "camera_bias": "wide"}},
        {"name": "POSTER_GLOW", "constraints_delta": {"rim_light": 0.3, "particle_bias": 0.08}},
    ],
    "video": [
        {"name": "KINETIC", "constraints_delta": {"motion_blur": 0.25, "flow_bias": "vortex"}},
        {"name": "MEDITATIVE", "constraints_delta": {"tempo": "slow", "cohesion_bias": 0.2}},
        {"name": "MUSIC_SYNC", "constraints_delta": {"beat_sync": True, "flicker_limit": 0.22}},
        {"name": "NARRATIVE", "constraints_delta": {"scene_arcs": 4, "camera_bias": "dolly"}},
        {"name": "SAFETY_SOFT", "constraints_delta": {"flash_cap_hz": 2, "luma_cap": 0.72}},
        {"name": "TRAIL_CORE", "constraints_delta": {"trail_length": 0.33, "particle_bias": 0.1}},
        {"name": "AETHER_CUT", "constraints_delta": {"cut_rhythm": "adaptive", "energy_bias": 0.18}},
    ],
    "search": [
        {"name": "SCHOLAR_SUMMARY", "constraints_delta": {"citation_density": "high", "verbosity": "low"}},
        {"name": "COMPARATIVE", "constraints_delta": {"cross_reference": True, "table_view": True}},
        {"name": "TIMELINE", "constraints_delta": {"time_axis": "strict", "recency_bias": 0.3}},
        {"name": "RISK_SCAN", "constraints_delta": {"risk_tags": True, "confidence_floor": 0.62}},
    ],
}


def _stable_suffix(value: str) -> str:
    return hashlib.sha1(value.encode("utf-8")).hexdigest()[:8]


def generate_variation_set(request: dict[str, Any]) -> dict[str, Any]:
    goal_type = str(request.get("goal_type") or "pure_light")
    brand_profile = request.get("brand_profile") or {}
    safety_profile = request.get("safety_profile") or {}
    lineage = request.get("lineage") or {}

    presets = GOAL_PRESETS.get(goal_type, GOAL_PRESETS["pure_light"])
    strict_mode = bool(safety_profile.get("strict_mode", False))
    max_branches = int(safety_profile.get("max_branches") or (4 if strict_mode else 8))
    bounded_branches = max(4, min(8, max_branches))
    selected_presets = presets[:bounded_branches]

    palette_lock = brand_profile.get("palette_lock")
    set_id = f"vset_{uuid.uuid4().hex[:10]}"
    parent_id = str(lineage.get("active_context_id") or "genesis")

    variations: list[dict[str, Any]] = []
    for idx, preset in enumerate(selected_presets, start=1):
        variation_id = f"var_{_stable_suffix(f'{set_id}:{parent_id}:{preset['name']}:{idx}')}_{idx}"
        constraints_delta = dict(preset.get("constraints_delta") or {})
        if palette_lock:
            constraints_delta["palette_lock"] = True
        if strict_mode:
            constraints_delta["flash_cap_hz"] = min(float(constraints_delta.get("flash_cap_hz", 2.0)), 2.0)

        variations.append(
            {
                "variation_id": variation_id,
                "parent_id": parent_id,
                "preset": preset["name"],
                "constraints_delta": constraints_delta,
                "rank": idx,
            }
        )

    return {
        "set_id": set_id,
        "goal_type": goal_type,
        "parent_id": parent_id,
        "count": len(variations),
        "variations": variations,
    }
