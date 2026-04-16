import unittest

from runtime_governor import GovernorContext, RuntimeGovernor


def make_payload(*, flicker: float, glow_intensity: float, velocity: float, emitted_at: str = "2026-03-25T00:00:00Z", cadence_hz: float | None = None) -> dict:
    shader_uniforms = {}
    if cadence_hz is not None:
        shader_uniforms["cadence_hz"] = cadence_hz

    return {
        "contract_name": "AI Particle Control Contract V1",
        "contract_version": "1.0.0",
        "emitted_at": emitted_at,
        "intent_state": {
            "state": "THINKING",
            "shape": "SPIRAL_VORTEX",
            "particle_density": 0.78,
            "turbulence": 0.24,
            "glow_intensity": glow_intensity,
            "flicker": flicker,
            "palette": {
                "mode": "DEEP_REASONING",
                "primary": "#6A0DAD",
                "secondary": "#D8C7FF",
                "accent": "#55C7FF",
            },
            "state_entered_at": emitted_at,
            "state_duration_ms": 1000,
            "transition_reason": "test",
        },
        "renderer_controls": {
            "runtime_profile": "DETERMINISTIC",
            "shader_uniforms": shader_uniforms,
            "velocity": velocity,
        },
    }


class PsychoSafetyGateTests(unittest.TestCase):
    def test_pipeline_order_includes_psycho_safety_gate(self) -> None:
        governor = RuntimeGovernor()
        decision = governor.process(make_payload(flicker=0.05, glow_intensity=0.5, velocity=0.2), GovernorContext())
        stages = [event["stage"] for event in decision.telemetry]
        self.assertIn("psycho_safety_gate", stages)
        self.assertIn("validate_schema", stages)
        self.assertLess(stages.index("fallback"), stages.index("psycho_safety_gate"))
        self.assertLess(stages.index("psycho_safety_gate"), stages.index("validate_schema"))
        self.assertLess(stages.index("validate_schema"), stages.index("policy_block"))
        self.assertLess(stages.index("psycho_safety_gate"), stages.index("policy_block"))

    def test_noop_for_safe_inputs(self) -> None:
        governor = RuntimeGovernor()
        payload = make_payload(flicker=0.05, glow_intensity=0.5, velocity=0.2)
        decision = governor.process(payload, GovernorContext())

        self.assertTrue(decision.accepted)
        self.assertEqual(decision.effective_contract["intent_state"]["flicker"], 0.05)
        self.assertEqual(decision.effective_contract["intent_state"]["glow_intensity"], 0.5)
        self.assertEqual(decision.effective_contract["renderer_controls"]["velocity"], 0.2)
        self.assertFalse(any(note.startswith("psycho_safety_gate") for note in decision.mutations))

    def test_unsafe_per_field_caps_are_reduced(self) -> None:
        governor = RuntimeGovernor()
        payload = make_payload(flicker=0.19, glow_intensity=0.9, velocity=0.9)
        decision = governor.process(payload, GovernorContext())

        self.assertTrue(decision.accepted)
        self.assertEqual(decision.effective_contract["intent_state"]["flicker"], 0.12)
        self.assertEqual(decision.effective_contract["intent_state"]["glow_intensity"], 0.72)
        self.assertEqual(decision.effective_contract["renderer_controls"]["velocity"], 0.5)
        self.assertTrue(any(note.startswith("psycho_safety_gate") for note in decision.mutations))

    def test_backward_compatibility_for_existing_safe_contract(self) -> None:
        governor = RuntimeGovernor()
        payload = make_payload(flicker=0.0, glow_intensity=0.22, velocity=0.1)
        decision = governor.process(payload, GovernorContext(previous_state="IDLE"))

        self.assertTrue(decision.accepted)
        self.assertEqual(decision.effective_contract["intent_state"]["state"], "THINKING")
        self.assertEqual(decision.effective_contract["intent_state"]["flicker"], 0.0)
        self.assertEqual(decision.effective_contract["intent_state"]["glow_intensity"], 0.22)
        self.assertEqual(decision.effective_contract["renderer_controls"]["velocity"], 0.1)


    def test_wcag_flash_rate_is_capped(self) -> None:
        governor = RuntimeGovernor()
        payload = make_payload(flicker=0.05, glow_intensity=0.5, velocity=0.2, cadence_hz=6.0)
        decision = governor.process(payload, GovernorContext())

        cadence = decision.effective_contract["renderer_controls"]["shader_uniforms"]["cadence_hz"]
        self.assertEqual(cadence, 3.0)
        self.assertTrue(any("WCAG <=3 flashes/sec" in note for note in decision.mutations))

    def test_gradual_frequency_drift_is_detected(self) -> None:
        governor = RuntimeGovernor()
        samples = [
            ("2026-03-25T00:00:00Z", 1.0),
            ("2026-03-25T00:02:00Z", 1.1),
            ("2026-03-25T00:04:00Z", 1.2),
        ]

        last_decision = None
        for emitted_at, cadence_hz in samples:
            payload = make_payload(
                flicker=0.06,
                glow_intensity=0.6,
                velocity=0.4,
                emitted_at=emitted_at,
                cadence_hz=cadence_hz,
            )
            last_decision = governor.process(payload, GovernorContext())

        assert last_decision is not None
        self.assertTrue(any("gradual frequency drift detected" in note for note in last_decision.mutations))
        self.assertLessEqual(last_decision.effective_contract["renderer_controls"]["velocity"], 0.18)
        self.assertLessEqual(last_decision.effective_contract["intent_state"]["glow_intensity"], 0.35)

if __name__ == "__main__":
    unittest.main()
