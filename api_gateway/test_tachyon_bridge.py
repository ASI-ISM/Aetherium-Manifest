import unittest

from api_gateway.tachyon_bridge import build_tachyon_envelope


class TachyonBridgeTests(unittest.TestCase):
    def test_build_tachyon_envelope_shape(self) -> None:
        envelope = build_tachyon_envelope(
            trace_id="trace-1",
            session_id="sess-9",
            provider="openai",
            model_version="2026-03",
            model_name="gpt-4o",
            intent_vector={"category": "explain", "energy_level": 0.8},
            intent_state={"state": "THINKING", "shape": "vortex"},
            governor_result={"policy_block_count": 0},
            visual_manifestation={"base_shape": "vortex"},
            ghost_flag=True,
        )

        self.assertEqual(envelope["header"]["sync_id"], "sess-9:trace-1")
        self.assertEqual(envelope["header"]["trace_id"], "trace-1")
        self.assertEqual(envelope["header"]["ecosystem"], "AETHERIUM")
        self.assertEqual(envelope["header"]["bus_family"], "AetherBus-Tachyon")
        self.assertEqual(envelope["payload"]["intent_state"]["state"], "THINKING")
        self.assertTrue(envelope["payload"]["ghost_flag"])
        self.assertIsNone(envelope["payload"]["payload_ptr"])
        self.assertIsInstance(envelope["payload"]["entropy_seed"], int)


if __name__ == "__main__":
    unittest.main()
