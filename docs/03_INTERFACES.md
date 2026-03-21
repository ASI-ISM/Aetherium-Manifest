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
2. `transition` — resolve `requested state -> accepted state` จาก canonical state machine และ capability context
3. `profile_map` — map state ปลายทางไปยัง `density`, `velocity`, `turbulence`, `cohesion`, `flow`, `glow`, `flicker`, `palette`
4. `clamp` — จำกัดค่าช่วง runtime เช่น density / velocity / turbulence / particle count
5. `fallback` — คืนค่า deterministic fallback หรือ `last_accepted_command` เมื่อ field ใช้ไม่ได้
6. `policy_block` — บล็อกค่าที่ผิด policy เช่น emergency-reserved palette
7. `capability_gate` — ปรับคำสั่งตาม device tier, low-power mode, sensor permission, motion capability
8. `telemetry_log` — บันทึกผล govern และ transition telemetry ลง runtime observability path

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
- `am_control_handler.js` and `api_gateway/main.py` MUST implement the same canonical governor stages, state transition semantics, and result shape.
- Human override and device capability state MUST enter through `governor_context`; point-specific conditionals are non-canonical.
- Renderer-facing fallback MUST preserve the existing `EMBODIMENT_V1` ABI.

### Canonical State-to-Behavior Mapping
ทุก state ต้อง map ผ่านตารางกลางนี้ก่อนเข้า renderer หรือ kernel behavior layer.

| State | density | velocity | turbulence | cohesion | flow | glow | flicker | palette |
|---|---:|---:|---:|---:|---|---:|---:|---|
| `IDLE` | 0.10 | 0.08 | 0.04 | 0.92 | `still` | 0.28 | 0.01 | `#8EEEFF/#DFFAFF/#FFFFFF` |
| `LISTENING` | 0.18 | 0.16 | 0.08 | 0.84 | `clockwise` | 0.38 | 0.03 | `#00E5FF/#7AE8FF/#DFFAFF` |
| `GENERATING` | 0.42 | 0.58 | 0.34 | 0.56 | `clockwise` | 0.66 | 0.10 | `#7C3AED/#FFD166/#FFF3B0` |
| `THINKING` | 0.36 | 0.46 | 0.24 | 0.68 | `counterclockwise` | 0.58 | 0.06 | `#00F5FF/#7C3AED/#DFFAFF` |
| `CONFIRMING` | 0.28 | 0.22 | 0.10 | 0.82 | `inward` | 0.54 | 0.03 | `#36C6FF/#FFFFFF/#B8F2FF` |
| `RESPONDING` | 0.44 | 0.52 | 0.18 | 0.72 | `outward` | 0.72 | 0.07 | `#FFD166/#FF8C42/#FFF3B0` |
| `WARNING` | 0.24 | 0.20 | 0.12 | 0.88 | `still` | 0.70 | 0.02 | `#FFB347/#FF8800/#FFF0C2` |
| `ERROR` | 0.16 | 0.12 | 0.06 | 0.94 | `still` | 0.82 | 0.00 | `#FF6B6B/#A52A2A/#FFD6D6` |
| `STABILIZED` | 0.22 | 0.14 | 0.05 | 0.90 | `still` | 0.40 | 0.01 | `#4CC9FF/#DFFAFF/#FFFFFF` |
| `NIRODHA` | 0.05 | 0.02 | 0.01 | 0.98 | `still` | 0.12 | 0.00 | `#0B1026/#402A6E/#0B1026` |
| `SENSOR_PENDING_PERMISSION` | 0.14 | 0.10 | 0.03 | 0.90 | `still` | 0.34 | 0.02 | `#7AE8FF/#B8F2FF/#FFFFFF` |
| `SENSOR_ACTIVE` | 0.30 | 0.42 | 0.20 | 0.70 | `centripetal` | 0.60 | 0.05 | `#00E5FF/#36C6FF/#DFFAFF` |
| `SENSOR_UNAVAILABLE` | 0.12 | 0.08 | 0.02 | 0.93 | `still` | 0.30 | 0.01 | `#94A3B8/#CBD5E1/#E2E8F0` |

Mapping rules:
- AI MAY suggest explicit numeric fields, but governor MUST reconcile them with the destination state profile.
- If state and numeric hints conflict, accepted state profile wins, then capability/policy clamps are applied.
- Sensor/permission states are capability-owned and MUST NOT be spoofed by frontend-only animation logic.

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
- `intent_state.state` is REQUIRED in every AI-issued command and every governor output.
- `intent_state` is the only authoring surface for AI/backend planners.
- `renderer_controls` MUST be produced by `tools/contracts/particle_control_adapter.py` rather than ad-hoc frontend/backend normalization.
- Shared governed fields: `state`, `state_entered_at`, `state_duration_ms`, `transition_reason`, `shape`, `particle_density`, `velocity`, `turbulence`, `cohesion`, `flow_direction`, `glow_intensity`, `flicker`, `attractor`, `palette`.
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
