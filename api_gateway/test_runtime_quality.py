import subprocess
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator

from api_gateway.deterministic_replay import replay_incident_package, replay_lockstep
from tools.benchmarks.creative_stress_scenarios import run_scenarios
from tools.benchmarks.intent_light_knowledge_graph import build_graph
from tools.benchmarks.latency_perception_benchmark import run_benchmark as run_latency_benchmark
from tools.benchmarks.runtime_semantic_benchmark import run_benchmark as run_release_benchmark
from tools.contracts.contract_checker import _apply_contract_policy


class DeterministicReplayTests(unittest.TestCase):
    def test_replay_lockstep_with_seed_and_log(self) -> None:
        event_log = [
            {"tick": 1, "event_type": "emotion", "intent": "comfort", "amplitude": 0.3},
            {"tick": 2, "event_type": "intent_switch", "intent": "guide", "amplitude": 0.4},
        ]
        result = replay_lockstep(seed=42, event_log=event_log, node_count=3)
        self.assertTrue(result["lockstep"])
        self.assertEqual(len(set(result["digests"])), 1)


class LatencyPerceptionBenchmarkTests(unittest.TestCase):
    def test_perception_benchmark_separate_from_raw_rtt(self) -> None:
        samples = [
            {"raw_rtt_ms": 50, "render_pipeline_ms": 34, "cognitive_settle_ms": 40, "prediction_mismatch": 0.1},
            {"raw_rtt_ms": 55, "render_pipeline_ms": 36, "cognitive_settle_ms": 43, "prediction_mismatch": 0.0},
        ]
        result = run_latency_benchmark(samples)
        self.assertIn("raw_rtt_ms", result)
        self.assertIn("perceived_latency_ms", result)
        self.assertNotEqual(result["raw_rtt_ms"]["mean"], result["perceived_latency_ms"]["mean"])

    def test_perception_benchmark_empty_samples_returns_safe_defaults(self) -> None:
        result = run_latency_benchmark([])
        self.assertEqual(result["sample_count"], 0)
        self.assertIsNone(result["raw_rtt_ms"]["mean"])
        self.assertIsNone(result["perceived_latency_ms"]["p95"])
        self.assertFalse(result["gunui_target_met"])


class RuntimeSemanticBenchmarkTests(unittest.TestCase):
    def test_release_gates_pass_when_all_acceptance_criteria_are_met(self) -> None:
        payload = {
            "compile_latency_ms": [62.1, 66.4, 71.0, 73.3, 68.8],
            "tick_delta_ms": [0.8, 1.1, 1.0, 1.4, 1.2],
            "render_pipeline_ms": [31.2, 33.4, 35.1, 37.0, 38.2],
            "resource_samples": [
                {"gpu_utilization": 0.61, "cpu_utilization": 0.52, "memory_mb": 1240},
                {"gpu_utilization": 0.67, "cpu_utilization": 0.58, "memory_mb": 1310},
                {"gpu_utilization": 0.71, "cpu_utilization": 0.62, "memory_mb": 1375},
            ],
            "intent_faithfulness_scores": [0.84, 0.86, 0.82, 0.88, 0.85],
            "temporal_continuity_scores": [0.81, 0.83, 0.84, 0.8, 0.82],
            "legibility_scores": [
                {"human": 0.88, "model": 0.83},
                {"human": 0.86, "model": 0.82},
                {"human": 0.89, "model": 0.85},
            ],
        }
        result = run_release_benchmark(payload)

        self.assertEqual(result["nightly_completion_rate"], 1.0)
        self.assertTrue(result["render_pipeline"]["pass"])
        self.assertGreaterEqual(result["semantic_composite_score"], 0.8)
        self.assertTrue(result["promotion_gates"]["canary"])
        self.assertTrue(result["promotion_gates"]["ga"])

    def test_ga_gate_blocks_when_semantic_composite_is_below_target(self) -> None:
        payload = {
            "compile_latency_ms": [60.0, 65.0, 70.0],
            "tick_delta_ms": [1.0, 1.1, 1.2],
            "render_pipeline_ms": [30.0, 35.0, 38.0],
            "resource_samples": [
                {"gpu_utilization": 0.6, "cpu_utilization": 0.5, "memory_mb": 1200},
                {"gpu_utilization": 0.7, "cpu_utilization": 0.6, "memory_mb": 1300},
            ],
            "intent_faithfulness_scores": [0.79, 0.77, 0.78],
            "temporal_continuity_scores": [0.78, 0.79, 0.77],
            "legibility_scores": [
                {"human": 0.79, "model": 0.78},
                {"human": 0.8, "model": 0.77},
            ],
        }
        result = run_release_benchmark(payload)

        self.assertEqual(result["nightly_completion_rate"], 1.0)
        self.assertTrue(result["render_pipeline"]["pass"])
        self.assertLess(result["semantic_composite_score"], 0.8)
        self.assertFalse(result["promotion_gates"]["canary"])
        self.assertFalse(result["promotion_gates"]["ga"])


class CreativeStressScenarioTests(unittest.TestCase):
    def test_manifestation_gate_stress_cases(self) -> None:
        result = run_scenarios()
        self.assertTrue(result["checks"]["no_spam"])
        self.assertTrue(result["checks"]["no_state_lie"])




def make_particle_control(base_shape: str = "ring", particle_count: int = 3200, flow_direction: str = "clockwise", turbulence: float = 0.25, glow_intensity: float = 0.4):
    from api_gateway.main import IntentState, ParticleControlContract, ParticlePalette, RendererControls

    return ParticleControlContract(
        intent_state=IntentState(
            state="thinking",
            shape=base_shape,
            particle_density=min(1.0, particle_count / 50000),
            velocity=0.5,
            turbulence=turbulence,
            cohesion=0.6,
            flow_direction=flow_direction,
            glow_intensity=glow_intensity,
            flicker=0.1,
            attractor="core",
            palette=ParticlePalette(mode="adaptive", primary="#88CCFF", secondary="#4466FF"),
        ),
        renderer_controls=RendererControls(
            base_shape=base_shape,
            chromatic_mode="adaptive",
            particle_count=particle_count,
            flow_field=flow_direction,
            shader_uniforms={"glow_intensity": glow_intensity, "flicker": 0.1, "cohesion": 0.6},
            runtime_profile="adaptive",
        ),
    )

class IntentLightKnowledgeGraphTests(unittest.TestCase):
    def test_graph_builder_applies_k_anon(self) -> None:
        records = [
            {"intent": "comfort", "light_pattern": "violet", "operator_confidence": 0.9},
            {"intent": "comfort", "light_pattern": "violet", "operator_confidence": 0.8},
            {"intent": "comfort", "light_pattern": "violet", "operator_confidence": 0.7},
            {"intent": "rare", "light_pattern": "flash", "operator_confidence": 0.95},
        ]
        graph = build_graph(records, min_k_anon=3)
        targets = {(edge["source"], edge["target"]) for edge in graph["edges"]}
        self.assertIn(("comfort", "violet"), targets)
        self.assertNotIn(("rare", "flash"), targets)


class ContractPolicyTests(unittest.TestCase):
    def test_embodiment_legacy_mode_reports_recommended_cadence_without_mutation(self) -> None:
        payload = {
            "contract_type": "EMBODIMENT_V1",
            "temporal_state": {"phase": "processing", "stability": 0.7},
            "visual_manifestation": {
                "core_shape": "ring",
                "particle_velocity": 0.3,
                "turbulence": 0.1,
                "chromatic_aberration": 0.02,
            },
        }
        audits: list[str] = []
        errors = _apply_contract_policy("embodiment_v1", payload, audits, mode="legacy")
        self.assertEqual(errors, [])
        self.assertNotIn("cadence", payload["visual_manifestation"])
        self.assertTrue(audits)
        self.assertIn("recommended deterministic default", audits[0])

    def test_strict_mode_rejects_missing_cadence(self) -> None:
        payload = {
            "contract_type": "EMBODIMENT_V1",
            "input_signal": {"source_model": "x", "latency_ms": 1, "reasoning_depth": 0.1},
            "intent": {"category": "guide", "confidence": 0.8},
            "cognitive_state": {"certainty": 0.7},
            "temporal_state": {"phase": "processing", "stability": 0.7},
            "visual_manifestation": {
                "core_shape": "ring",
                "particle_velocity": 0.3,
                "turbulence": 0.1,
                "chromatic_aberration": 0.02
            }
        }
        schema = {
            "type": "object",
            "required": ["visual_manifestation"],
            "properties": {
                "visual_manifestation": {
                    "type": "object",
                    "required": ["cadence"],
                    "properties": {"cadence": {"type": "object"}}
                }
            }
        }
        audits: list[str] = []
        policy_errors = _apply_contract_policy("embodiment_v1", payload, audits, mode="strict")
        schema_errors = list(Draft202012Validator(schema).iter_errors(payload))
        self.assertEqual(policy_errors, [])
        self.assertTrue(schema_errors)

    def test_ipw_policy_rejects_invalid_probability_sum(self) -> None:
        payload = {
            "ipw_type": "IPW_V1",
            "predictions": [
                {"action_id": "A", "p": 0.9},
                {"action_id": "B", "p": 0.9},
            ],
            "probability_policy": {
                "requires_normalization": True,
                "epsilon": 0.0001,
                "on_violation": "error",
            },
        }
        audits: list[str] = []
        errors = _apply_contract_policy("ipw_v1", payload, audits, mode="strict")
        self.assertTrue(errors)

    def test_ipw_policy_reports_sum_violation_without_normalization_side_effect(self) -> None:
        payload = {
            "ipw_type": "IPW_V1",
            "predictions": [
                {"action_id": "A", "p": 0.9},
                {"action_id": "B", "p": 0.6},
            ],
            "probability_policy": {
                "requires_normalization": True,
                "epsilon": 0.0001,
                "on_violation": "normalize",
            },
        }
        audits: list[str] = []
        errors = _apply_contract_policy("ipw_v1", payload, audits, mode="strict")
        self.assertEqual(len(errors), 1)
        self.assertAlmostEqual(sum(row["p"] for row in payload["predictions"]), 1.5, places=6)
        self.assertTrue(audits)
        self.assertIn("ipw_validation.audit.normalized=false", audits[0])
        self.assertIn("ipw_validation.audit.observed_sum=1.50000000", audits[0])


class ContractCheckerCliTests(unittest.TestCase):
    def test_cli_emits_audit_even_when_validation_fails(self) -> None:
        repo_root = Path(__file__).resolve().parent.parent
        payload_path = repo_root / "tools/contracts/payloads/ipw_v1.payload.json"
        original = payload_path.read_text(encoding="utf-8")
        try:
            payload_path.write_text(
                """{
  "ipw_type": "IPW_V1",
  "predictions": [{"action_id": "A", "p": 0.9}, {"action_id": "B", "p": 0.6}],
  "collapse_threshold": 0.61,
  "probability_policy": {"requires_normalization": true, "epsilon": 0.0001, "on_violation": "normalize"},
  "evidence": {"interaction_velocity": 0.73},
  "unexpected": true
}
""",
                encoding="utf-8",
            )
            proc = subprocess.run(
                ["python", "tools/contracts/contract_checker.py", "--strict"],
                capture_output=True,
                text=True,
                check=False,
                cwd=repo_root,
            )
            self.assertNotEqual(proc.returncode, 0)
            self.assertIn("[FAIL] ipw_v1", proc.stdout)
            self.assertIn("[AUDIT] ipw_validation.audit.normalized=false", proc.stdout)
        finally:
            payload_path.write_text(original, encoding="utf-8")


class GatewayExtensionTests(unittest.IsolatedAsyncioTestCase):
    def test_voice_model_resolver_prefers_language_region_pair(self) -> None:
        from api_gateway.main import _resolve_voice_model

        self.assertEqual(_resolve_voice_model("th-TH", "apac"), "whisper-thai-pro")
        self.assertEqual(_resolve_voice_model("de-DE", "eu"), "whisper-general-de")

    async def test_telemetry_ingest_and_query(self) -> None:
        from api_gateway.main import TELEMETRY_TS_DB, TelemetryIngestRequest, ingest_telemetry, query_telemetry

        TELEMETRY_TS_DB.clear()
        payload = TelemetryIngestRequest(points=[{"metric": "ux_event_latency", "value": 22.0, "tags": {"event": "emit"}}])
        result = await ingest_telemetry(payload, x_api_key="demo")
        self.assertEqual(result["ingested"], 1)
        queried = await query_telemetry(metric="ux_event_latency", window_seconds=3600, x_api_key="demo")
        self.assertEqual(queried["count"], 1)

    def test_proxy_guard_blocks_loopback_resolution(self) -> None:
        from api_gateway.main import _is_blocked_proxy_target

        self.assertTrue(_is_blocked_proxy_target("localhost"))

    def test_state_sync_room_supports_shared_and_user_patch(self) -> None:
        from api_gateway.main import StateSyncRoom

        room = StateSyncRoom()
        snapshot = room.apply_delta({"shape": "sphere"}, user_id="alice", user_delta={"theme": "dark"})
        self.assertEqual(snapshot["shared_state"]["shape"], "sphere")
        self.assertEqual(snapshot["user_state"]["theme"], "dark")


    def test_proxy_guard_rejects_invalid_hostname(self) -> None:
        from api_gateway.main import _is_blocked_proxy_target

        self.assertTrue(_is_blocked_proxy_target("bad host name"))

    async def test_state_sync_room_broadcast_prunes_disconnected_clients(self) -> None:
        from api_gateway.main import StateSyncRoom

        class FailingSocket:
            async def send_json(self, _message: dict[str, object]) -> None:
                raise RuntimeError("cannot send")

        class GoodSocket:
            def __init__(self) -> None:
                self.messages: list[dict[str, object]] = []

            async def send_json(self, message: dict[str, object]) -> None:
                self.messages.append(message)

        room = StateSyncRoom()
        failing = FailingSocket()
        good = GoodSocket()
        room.clients = [failing, good]  # type: ignore[list-item]

        message = {"type": "state_updated", "version": 1}
        await room.broadcast_json(message)

        self.assertEqual(room.clients, [good])
        self.assertEqual(good.messages, [message])


class LightCognitionPipelineTests(unittest.TestCase):
    def test_pipeline_stages_produce_required_internal_models(self) -> None:
        from api_gateway.main import (
            ColorPalette,
            IntentVector,
            ParticlePhysics,
            VisualManifestation,
            GovernorContext,
            _run_light_cognition_pipeline,
        )

        intent = IntentVector(category="guide", emotional_valence=0.3, energy_level=0.7)
        visual = VisualManifestation(
            base_shape="ring",
            transition_type="breathe",
            color_palette=ColorPalette(primary="#88CCFF"),
            particle_physics=ParticlePhysics(
                turbulence=0.2,
                flow_direction="clockwise",
                luminance_mass=0.4,
                particle_count=4000,
            ),
            chromatic_mode="adaptive",
            emergency_override=False,
            device_tier=2,
        )

        result = _run_light_cognition_pipeline(intent, make_particle_control(base_shape="ring", particle_count=3200, turbulence=0.2, glow_intensity=0.4), visual, GovernorContext(), trace_id="unit-trace")
        self.assertIn("energy", result.semantic_field.semantic_tensors)
        self.assertTrue(result.morphogenesis_plan.temporal_operators)
        self.assertGreater(result.compiled_program.update_cadence_hz, 0)

    def test_fallback_mode_keeps_renderer_abi_parity(self) -> None:
        from api_gateway.main import ColorPalette, ParticlePhysics, VisualManifestation, _run_direct_visual_fallback

        visual = VisualManifestation(
            base_shape="ring",
            transition_type="breathe",
            color_palette=ColorPalette(primary="#88CCFF"),
            particle_physics=ParticlePhysics(
                turbulence=0.2,
                flow_direction="clockwise",
                luminance_mass=0.4,
                particle_count=4000,
            ),
            chromatic_mode="adaptive",
            emergency_override=False,
            device_tier=2,
        )

        fallback_visual = _run_direct_visual_fallback(visual)
        self.assertEqual(fallback_visual.model_dump(), visual.model_dump())


class EnvelopeCompatibilityTests(unittest.TestCase):
    def test_adapter_supports_embodiment_v1_and_v2(self) -> None:
        from tools.contracts.protocol_adapter import to_legacy_visual_parameters

        v1_payload = {
            "contract_type": "EMBODIMENT_V1",
            "visual_manifestation": {
                "core_shape": "ring",
                "particle_velocity": 0.4,
                "turbulence": 0.11,
                "chromatic_aberration": 0.02,
                "cadence": {"bpm": 60, "phase": 0.0, "jitter": 0.02},
            },
        }
        v2_payload = {
            "contract_type": "EMBODIMENT_V2",
            "semantic_field": {"semantic_tensors": {"energy": 0.7}, "polarity": 0.2, "ambiguity": 0.1},
            "morphogenesis_plan": {
                "topology_seeds": ["helix"],
                "attractors": ["coherence"],
                "constraints": [],
                "temporal_operators": ["phase_lock"],
            },
            "light_program": {
                "shader_uniforms": {"chromatic_aberration": 0.03},
                "particle_targets": {"count": 5500},
                "force_field_descriptors": [],
            },
            "runtime_tick_policy": {"tick_rate_hz": 20, "mode": "deterministic"},
        }

        legacy_v1 = to_legacy_visual_parameters(v1_payload)
        legacy_v2 = to_legacy_visual_parameters(v2_payload)

        self.assertEqual(legacy_v1["base_shape"], "ring")
        self.assertEqual(legacy_v2["base_shape"], "helix")
        self.assertGreater(legacy_v1["tick_rate_hz"], 0)
        self.assertGreater(legacy_v2["tick_rate_hz"], 0)

    def test_contract_checker_enforces_field_evolution_sections(self) -> None:
        from tools.contracts.contract_checker import _check_schema_field_evolution

        broken_schema = {
            "title": "Broken",
            "type": "object",
            "properties": {
                "semantic_field": {"type": "object"}
            },
            "x-field-evolution": {
                "introduced_in": "1.0.0"
            },
        }
        audits: list[str] = []
        errors = _check_schema_field_evolution("broken", broken_schema, audits)
        self.assertTrue(errors)
        self.assertFalse(audits)


if __name__ == "__main__":
    unittest.main()


class TemporalMorphogenesisReliabilityTests(unittest.TestCase):
    def test_drift_detector_recall_on_seeded_corpus(self) -> None:
        from api_gateway.main import (
            ColorPalette,
            IntentVector,
            ParticlePhysics,
            SemanticField,
            VisualManifestation,
            _compute_drift_metrics,
        )

        intent = IntentVector(category="guide", emotional_valence=0.3, energy_level=0.75)
        baseline = SemanticField(
            semantic_tensors={"category_hash": 0.2, "valence": 0.3, "energy": 0.75},
            confidence_gradients=[0.9, 0.85],
            polarity=0.3,
            ambiguity=0.1,
        )
        visual = VisualManifestation(
            base_shape="ring",
            transition_type="breathe",
            color_palette=ColorPalette(primary="#88CCFF"),
            particle_physics=ParticlePhysics(
                turbulence=0.25,
                flow_direction="clockwise",
                luminance_mass=0.4,
                particle_count=3200,
            ),
            chromatic_mode="adaptive",
            emergency_override=False,
            device_tier=2,
        )
        from api_gateway.main import _morphogenesis_to_compiled, _semantic_to_morphogenesis

        compiled = _morphogenesis_to_compiled(_semantic_to_morphogenesis(baseline, visual), visual)

        seeded_divergent = [
            SemanticField(
                semantic_tensors={"category_hash": 0.2, "valence": -0.6, "energy": 0.15},
                confidence_gradients=[0.35, 0.2],
                polarity=-0.6,
                ambiguity=0.75,
            )
            for _ in range(50)
        ]
        seeded_stable = [
            SemanticField(
                semantic_tensors={"category_hash": 0.2, "valence": 0.29, "energy": 0.74},
                confidence_gradients=[0.89, 0.84],
                polarity=0.31,
                ambiguity=0.12,
            )
            for _ in range(2)
        ]

        true_positive = 0
        for telemetry in seeded_divergent:
            metrics = _compute_drift_metrics(baseline, telemetry, compiled)
            is_detected = (
                metrics.semantic_coherence_score < 0.86
                or metrics.topology_divergence_index > 0.25
                or metrics.temporal_instability_ratio > 0.2
            )
            if is_detected:
                true_positive += 1

        false_positive = 0
        for telemetry in seeded_stable:
            metrics = _compute_drift_metrics(baseline, telemetry, compiled)
            if (
                metrics.semantic_coherence_score < 0.86
                or metrics.topology_divergence_index > 0.25
                or metrics.temporal_instability_ratio > 0.2
            ):
                false_positive += 1

        recall = true_positive / len(seeded_divergent)
        self.assertGreaterEqual(recall, 0.98)
        self.assertLessEqual(false_positive, len(seeded_stable))

    def test_containment_activation_p95_within_target(self) -> None:
        from api_gateway.main import (
            ColorPalette,
            IntentVector,
            ParticlePhysics,
            VisualManifestation,
            GovernorContext,
            _run_light_cognition_pipeline,
        )

        intent = IntentVector(category="guide", emotional_valence=-0.2, energy_level=0.95)
        visual = VisualManifestation(
            base_shape="helix",
            transition_type="surge",
            color_palette=ColorPalette(primary="#AAEEFF"),
            particle_physics=ParticlePhysics(
                turbulence=0.9,
                flow_direction="counterclockwise",
                luminance_mass=0.9,
                particle_count=4500,
            ),
            chromatic_mode="adaptive",
            emergency_override=False,
            device_tier=2,
        )

        latencies: list[float] = []
        for i in range(200):
            result = _run_light_cognition_pipeline(intent, make_particle_control(base_shape="helix", particle_count=4500, flow_direction="counterclockwise", turbulence=0.9, glow_intensity=0.9), visual, GovernorContext(), trace_id=f"seeded-{i}")
            self.assertIsNotNone(result.runtime_guard)
            latencies.append(result.runtime_guard.containment.activation_latency_ms)

        latencies.sort()
        p95 = latencies[int(0.95 * (len(latencies) - 1))]
        self.assertLessEqual(p95, 75.0)

    def test_replay_reproducibility_is_100_percent_for_sev1(self) -> None:
        from api_gateway.main import SEV1_INCIDENT_PACKAGES

        self.assertTrue(SEV1_INCIDENT_PACKAGES)
        for package_name in SEV1_INCIDENT_PACKAGES:
            result = replay_incident_package(package_name, node_count=4)
            self.assertTrue(result["lockstep"])
