from tools.contracts.particle_control_adapter import to_renderer_controls, to_visual_manifestation


def test_to_renderer_controls_maps_canonical_fields() -> None:
    payload = {
        "intent_state": {
            "state": "thinking",
            "shape": "helix",
            "particle_density": 0.5,
            "velocity": 0.7,
            "turbulence": 0.3,
            "cohesion": 0.6,
            "flow_direction": "counterclockwise",
            "glow_intensity": 0.8,
            "flicker": 0.1,
            "attractor": "axis",
            "palette": {
                "mode": "spectral",
                "primary": "#112233",
                "secondary": "#445566"
            }
        }
    }

    renderer = to_renderer_controls(payload)

    assert renderer["base_shape"] == "helix"
    assert renderer["chromatic_mode"] == "spectral"
    assert renderer["particle_count"] == 25000
    assert renderer["flow_field"] == "counterclockwise"
    assert renderer["shader_uniforms"]["glow_intensity"] == 0.8
    assert renderer["runtime_profile"] == "adaptive"


def test_to_visual_manifestation_uses_compiled_renderer_controls() -> None:
    payload = {
        "intent_state": {
            "state": "responding",
            "shape": "sphere",
            "particle_density": 0.2,
            "velocity": 0.3,
            "turbulence": 0.2,
            "cohesion": 0.4,
            "flow_direction": "inward",
            "glow_intensity": 0.9,
            "flicker": 0.2,
            "attractor": "core",
            "palette": {
                "mode": "adaptive",
                "primary": "#AABBCC",
                "secondary": "#DDEEFF"
            }
        }
    }

    visual = to_visual_manifestation(payload, transition_type="morph", device_tier=3)

    assert visual["base_shape"] == "sphere"
    assert visual["transition_type"] == "morph"
    assert visual["particle_physics"]["flow_direction"] == "inward"
    assert visual["particle_physics"]["particle_count"] == 10000
    assert visual["chromatic_mode"] == "adaptive"
    assert visual["device_tier"] == 3


def test_to_renderer_controls_maps_intent_layer_fields() -> None:
    payload = {
        "intent_state": {
            "goal_type": "brand",
            "brand_profile_id": "brand-core-01",
            "safety_profile": "enterprise-safe",
            "output_constraints": {
                "target_format": "png",
                "quality_tier": "high",
                "size": {"width": 1920, "height": 1080},
            },
            "semantic_concepts": ["clarity", "trust"],
            "emotional_valence": 0.2,
        }
    }

    renderer = to_renderer_controls(payload)

    assert renderer["shader_uniforms"]["goal_type"] == "brand"
    assert renderer["shader_uniforms"]["brand_profile_id"] == "brand-core-01"
    assert renderer["shader_uniforms"]["safety_profile"] == "enterprise-safe"
    assert renderer["intent_layer"]["semantic_concepts"] == ["clarity", "trust"]
    assert renderer["intent_layer"]["emotional_valence"] == 0.2


def test_to_renderer_controls_intent_layer_is_backward_compatible() -> None:
    renderer = to_renderer_controls({"intent_state": {}})

    assert renderer["shader_uniforms"]["goal_type"] == "ambient"
    assert renderer["shader_uniforms"]["brand_profile_id"] == "default"
    assert renderer["shader_uniforms"]["safety_profile"] == "brand-safe"
    assert renderer["intent_layer"]["output_constraints"] == {}
    assert renderer["intent_layer"]["semantic_concepts"] == []
    assert renderer["intent_layer"]["emotional_valence"] is None
