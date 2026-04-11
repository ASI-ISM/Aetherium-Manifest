# RFC-0001: Contracts + Governor + Replay Schemas

- **Status:** Proposed  
- **Version:** 1.0  
- **Date:** 2026-04-11  
- **Authors:** Platform Eng, AI Safety, Product

## 1) Summary
Define a contract-first runtime where AI emits structured intent/contracts and **cannot invoke renderer directly**. The Governor is the canonical execution boundary.

## 2) Scope
- Creative Intent schema
- Manifest Contract schema
- Governor decision pipeline and log schema
- Session Replay schema
- Versioning + compatibility rules

## 3) Architecture (5 Layers)
1. Creative Intent Layer
2. Manifestation Contract Layer
3. Runtime Governor Layer
4. Renderer / Formation Engine Layer
5. Memory / Team / Replay / Telemetry Layer

## 4) Normative Requirements
- Renderer MUST only consume governor-approved contracts.
- Unknown fields/modes/profiles MUST default to deny or safe fallback.
- Replay timeline MUST be deterministic and immutable.
- Contract evolution MUST follow semantic versioning.

## 5) Schemas (v1)

## 5.1 `creative_intent.v1`
```json
{
  "schema_version": "creative_intent.v1",
  "intent_id": "uuid",
  "timestamp": "ISO-8601",
  "prompt_text": "string",
  "goal_type": "poster|brand|UI|concept|diagram|ambient",
  "emotional_valence": {
    "energy": 0.0,
    "serenity": 0.0,
    "gravity": 0.0
  },
  "semantic_concepts": ["string"],
  "output_constraints": {
    "format_targets": ["png", "svg", "mp4", "manifest_json"],
    "aspect_ratio": "1:1|4:5|16:9|custom",
    "quality_tier": "draft|standard|high"
  },
  "brand_profile_id": "string|null",
  "safety_profile": "brand-safe|enterprise-safe|sacred-safe",
  "session_id": "uuid",
  "room_id": "uuid|null"
}
```

## 5.2 `manifest_contract.v1`
```json
{
  "schema_version": "manifest_contract.v1",
  "manifest_id": "uuid",
  "state": "IDLE|LISTENING|THINKING|GENERATING|RESPONDING|WARNING|ERROR|NIRODHA|SENSOR_ACTIVE",
  "shape": "NEBULA_CLOUD|SPHERE|SPIRAL_VORTEX|CRACKED_SHELL|CUBE|STREAM|SHELL|FRACTURE|custom",
  "palette": {"mode": "CALM_IDLE|ACTIVE_LISTENING|DEEP_REASONING|CO_CREATION|WARNING_OVERLOAD|ERROR_POLICY|NIRODHA_DORMANT|CUSTOM", "primary": "hex", "secondary": "hex"},
  "particle_density": 0.0,
  "turbulence": 0.0,
  "glow_intensity": 0.0,
  "cohesion": 0.0,
  "flicker": 0.0,
  "flow_direction": "inward|outward|clockwise|counterclockwise|adaptive",
  "attractor": {"x": 0.0, "y": 0.0},
  "composition_hint": "string",
  "typography_hint": "string",
  "variation_branch": "base|calm|luxury|sacred|enterprise|minimal|cinematic",
  "lineage_parent_id": "uuid|null"
}
```

## 5.3 `governor_decision_log.v1`
```json
{
  "schema_version": "governor_decision_log.v1",
  "decision_id": "uuid",
  "intent_id": "uuid",
  "manifest_id": "uuid",
    "validate",
    "transition",
    "profile_map",
    "clamp",
    "fallback",
    "psycho_safety_gate",
    "validate_schema",
    "policy_block",
    "capability_gate",
    "telemetry_log"
  ],
  "result": "allow|modify|deny|fallback",
  "violations": ["string"],
  "modifications": [{"field": "string", "from": "any", "to": "any", "reason": "string"}],
  "confidence": 0.0,
  "latency_ms": 0,
  "timestamp": "ISO-8601"
}
```

## 5.4 `session_replay.v1`
```json
{
  "schema_version": "session_replay.v1",
  "replay_id": "uuid",
  "session_id": "uuid",
  "timeline": [
    {
      "seq": 1,
      "timestamp": "ISO-8601",
      "event_type": "intent|state_transition|variation_select|export",
      "payload_ref": "uri-or-id"
    }
  ],
  "selected_variation": "string|null",
  "export_history": [{"format": "png", "artifact_id": "string", "timestamp": "ISO-8601"}],
  "room_activity": [{"user_id": "string", "action": "string", "timestamp": "ISO-8601"}]
}
```

## 6) Governor Pipeline Semantics
1. **validate**: schema/range/type checks
2. **transition**: legal state transitions only
3. **profile_map**: apply brand + safety profile constraints
4. **clamp**: normalize risky numeric fields to safe bounds
5. **fallback**: safe preset on invalid/partial contracts
6. **policy_block**: hard deny for policy violations
7. **capability_gate**: permission checks (room/export/features)
8. **telemetry_log**: persist decision metadata before render

## 7) State Machine (Minimum)
- IDLE → LISTENING
- LISTENING → INTERPRETING
- INTERPRETING → MANIFESTING | WARNING
- MANIFESTING → REFINING | ERROR
- REFINING → MANIFESTING | EXPORTING
- EXPORTING → IDLE | WARNING
- ANY → NIRODHA (explicit safe settle)

## 8) Compatibility & Versioning
- Additive fields = minor version bump.
- Breaking type/semantic changes = major bump.
- Support deprecation windows with dual-read strategy.

## 9) Test Strategy
- Contract validation unit tests
- Governor allow/modify/deny/fallback behavior tests
- Replay determinism tests
- Variation lineage continuity tests
- Export lineage integrity tests

## 10) Rollout Plan
- Stage A: Shadow-mode governor logging
- Stage B: Non-prod hard enforcement
- Stage C: Production hard enforcement + alerting thresholds

## 11) Kickoff Template (Owner / Due Date / Status)
| Track | Task | Owner | Due Date | Status | Exit Criteria |
|---|---|---|---|---|---|
| Schema | Finalize v1 envelopes | TBD | YYYY-MM-DD | Not Started | JSON Schema artifacts merged |
| Governor | Implement pipeline stages | TBD | YYYY-MM-DD | Not Started | all 8 stages wired |
| Replay | Immutable timeline log | TBD | YYYY-MM-DD | Not Started | deterministic playback passes tests |
| Renderer | Contract-only input gateway | TBD | YYYY-MM-DD | Not Started | direct AI → renderer path removed |
| QA | Contract/governor/replay suites | TBD | YYYY-MM-DD | Not Started | CI green on required tests |
| Ops | Telemetry dashboards | TBD | YYYY-MM-DD | Not Started | latency/confidence/warnings visible |
