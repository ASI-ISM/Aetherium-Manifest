# 03 — Interfaces

## External Interfaces
- **GunUI ↔ Logenesis:** realtime channel (WebSocket / equivalent)
- **Logenesis ↔ AetherBus:** envelope publish/subscribe over Tachyon path

## Internal Contracts

### Embodiment Contract (UI ABI)
Input:
- cognitive_state
- intent
- certainty/latency signals

Output:
- canonical `AI Particle Control Contract` split into:
  - `intent_state` (stateful intent semantics for cognition)
  - `renderer_controls` (explicit renderer/runtime knobs)

Rule: แสงต้องเป็นภาษาของ state ไม่ใช่ ambient effect

Canonical control rules:
- `intent_state` is the only authoring surface for AI/backend planners.
- `renderer_controls` MUST be produced by `tools/contracts/particle_control_adapter.py` rather than ad-hoc frontend/backend normalization.
- Shared governed fields: `state`, `shape`, `particle_density`, `velocity`, `turbulence`, `cohesion`, `flow_direction`, `glow_intensity`, `flicker`, `attractor`, `palette`.

### Manifestation Gate
- CHAT intents ต้องผ่าน threshold
- COMMAND/REQUEST ต้องผ่านเสมอ
- เมื่อ gate ปิด server ต้องงดส่ง visual update

### Ghost Commit/Rollback Boundary
- ghost path เขียนได้เฉพาะ future state buffers
- canonical commit เกิดหลัง wave collapse เท่านั้น


### Canonical Light Cognition Runtime Sequence
Pipeline stage contract (canonical):
- `Intent -> SemanticField -> MorphogenesisEngine -> LightCompiler -> CognitiveFieldRuntime`

Compatibility rules:
- `CognitiveFieldRuntime` MUST compile `intent_state -> renderer_controls` through the canonical adapter before emitting `EMBODIMENT_V1` or `EMBODIMENT_V2`.
- `CognitiveFieldRuntime` MUST emit the existing renderer ingestion ABI (`EMBODIMENT_V1`) without breaking field compatibility.
- Direct visual mapping path remains available as fallback mode when either feature flag is disabled:
  - `light_cognition_layer_enabled`
  - `morphogenesis_runtime_enabled`

Latency/SLO rules:
- Stage handoff P95 overhead budget: `<= 3 ms` compared to direct mapping mode.
- Fallback mode parity target: visual contract compatibility pass rate `= 100%`.
