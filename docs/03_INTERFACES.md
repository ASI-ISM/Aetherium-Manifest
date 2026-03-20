# 03 — Interfaces

## External Interfaces
- **GunUI ↔ Logenesis:** realtime channel (WebSocket / equivalent)
- **Logenesis ↔ AetherBus:** envelope publish/subscribe over Tachyon path

## Internal Contracts

### Runtime Governor Boundary
Runtime Governor เป็น canonical middleware เดียวระหว่าง AI contract และ particle engine/renderer.

**Ingress contract:**
- `intent_vector`
- `particle_control.intent_state`
- `particle_control.renderer_controls`
- `governor_context.human_override`
- `governor_context.device_capability`
- `governor_context.last_accepted_command`
- legacy-compatible `visual_manifestation` for ABI parity only

**Governor pipeline (single path):**
1. `validate` — ตรวจทุก field ตาม schema กลาง `docs/schemas/ai_particle_control_contract_v1.json`
2. `clamp` — จำกัดค่าช่วง runtime เช่น density / velocity / turbulence / particle count
3. `fallback` — คืนค่า deterministic fallback หรือ `last_accepted_command` เมื่อ field ใช้ไม่ได้
4. `policy_block` — บล็อกค่าที่ผิด policy เช่น emergency-reserved palette
5. `capability_gate` — ปรับคำสั่งตาม device tier, low-power mode, sensor permission, motion capability
6. `telemetry_log` — บันทึกผล govern และ containment telemetry ลง runtime observability path

**Governor output contract:**
- `accepted_command`
- `rejected_fields`
- `fallback_reason`
- `policy_block_count`
- `last_accepted_command`
- `divergence_detected`
- `containment`
- `telemetry_logging`
- derived legacy `visual_manifestation`

Rules:
- Runtime Governor MUST be the only place that mutates AI-issued particle/runtime fields before renderer ingestion.
- `am_control_handler.js` and `api_gateway/main.py` MUST implement the same canonical governor stages and result shape.
- Human override and device capability state MUST enter through `governor_context`; point-specific conditionals are non-canonical.
- Renderer-facing fallback MUST preserve the existing `EMBODIMENT_V1` ABI.

### Embodiment Contract (UI ABI)
Input:
- cognitive_state
- intent
- certainty/latency signals
- governed `particle_control`

Output:
- canonical `AI Particle Control Contract` split into:
  - `intent_state` (stateful intent semantics for cognition)
  - `renderer_controls` (explicit renderer/runtime knobs)
- derived `visual_manifestation` generated after governor acceptance

Rule: แสงต้องเป็นภาษาของ state ไม่ใช่ ambient effect

Canonical control rules:
- `intent_state` is the only authoring surface for AI/backend planners.
- `renderer_controls` MUST be produced by `tools/contracts/particle_control_adapter.py` rather than ad-hoc frontend/backend normalization.
- Shared governed fields: `state`, `shape`, `particle_density`, `velocity`, `turbulence`, `cohesion`, `flow_direction`, `glow_intensity`, `flicker`, `attractor`, `palette`.
- Every governed field MUST be checked once by the schema-backed Runtime Governor before entering renderer compilation.

### Manifestation Gate
- CHAT intents ต้องผ่าน threshold
- COMMAND/REQUEST ต้องผ่านเสมอ
- เมื่อ gate ปิด server ต้องงดส่ง visual update
- Governor fallback MAY still update `last_accepted_command` telemetry but MUST NOT emit new renderer mutations when gate ปิด

### Ghost Commit/Rollback Boundary
- ghost path เขียนได้เฉพาะ future state buffers
- canonical commit เกิดหลัง wave collapse เท่านั้น
- containment rollback และ deterministic anchor replay MUST be reported through governor output rather than hidden side effects

### Canonical Light Cognition Runtime Sequence
Pipeline stage contract (canonical):
- `Intent -> SemanticField -> MorphogenesisEngine -> LightCompiler -> RuntimeGovernor -> CognitiveFieldRuntime`

Compatibility rules:
- `CognitiveFieldRuntime` MUST compile `intent_state -> renderer_controls` through the canonical adapter before emitting `EMBODIMENT_V1` or `EMBODIMENT_V2`.
- `RuntimeGovernor` MUST consume the same central schema as backend emit validation.
- `CognitiveFieldRuntime` MUST emit the existing renderer ingestion ABI (`EMBODIMENT_V1`) without breaking field compatibility.
- Direct visual mapping path remains available as fallback mode when either feature flag is disabled:
  - `light_cognition_layer_enabled`
  - `morphogenesis_runtime_enabled`

Latency/SLO rules:
- Stage handoff P95 overhead budget: `<= 3 ms` compared to direct mapping mode.
- Fallback mode parity target: visual contract compatibility pass rate `= 100%`.
- Containment activation target remains `<= 75 ms P95` and is attributed to Runtime Governor telemetry.
