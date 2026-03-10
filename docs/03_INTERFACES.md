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
- visual_manifestation params (shape, turbulence, chroma, cadence)

Rule: แสงต้องเป็นภาษาของ state ไม่ใช่ ambient effect

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
- `CognitiveFieldRuntime` MUST emit the existing renderer ingestion ABI (`EMBODIMENT_V1`) without breaking field compatibility.
- Direct visual mapping path remains available as fallback mode when either feature flag is disabled:
  - `light_cognition_layer_enabled`
  - `morphogenesis_runtime_enabled`

Latency/SLO rules:
- Stage handoff P95 overhead budget: `<= 3 ms` compared to direct mapping mode.
- Fallback mode parity target: visual contract compatibility pass rate `= 100%`.
