# 04 — Data Schemas

ไฟล์นี้อธิบายเหตุผลของ schema โดย JSON canonical อยู่ใน `docs/schemas/`.

## AkashicEnvelope V2
ฟิลด์สำคัญ:
- `sync_id`: ordering เชิงตรรกะ
- `intent_vector`: embedding สำหรับ prediction-aware routing
- `entropy_seed`: deterministic simulation seed
- `payload_ptr` + `rkey`: zero-copy RDMA payload access
- `ghost_flag`: แยก speculative message ออกจาก canonical flow

## Embodiment Contract V1
แยกเป็นบล็อกสำคัญ:
- intent
- cognitive_state
- temporal_state
- visual_manifestation

เหตุผล: ทำให้ rendering logic ซื่อสัตย์ต่อสถานะการคิดจริง ไม่ผูกติด model vendor

## IPW V1
- predictions เป็น probability distribution เหนือ action space
- collapse threshold ใช้ตัดสิน match/mismatch
- evidence ช่วยอธิบายที่มาของการทำนาย

## ABI Governance
- schema ถือเป็น ABI ระหว่าง cognition ↔ manifestation
- การเปลี่ยน schema ต้อง version และระบุ migration impact


## Light Cognition Pipeline V1
Canonical contract file: `docs/schemas/light_cognition_pipeline_v1.json`

Internal stage data models:
- `SemanticField`
  - `semantic_tensors`
  - `confidence_gradients`
  - `polarity`
  - `ambiguity`
- `MorphogenesisPlan`
  - `topology_seeds`
  - `attractors`
  - `constraints`
  - `temporal_operators`
- `CompiledLightProgram`
  - `shader_uniforms`
  - `particle_targets`
  - `force_field_descriptors`
  - `update_cadence_hz`

Backwards compatibility:
- Runtime output still targets `EMBODIMENT_V1` renderer ingestion shape.
- New contracts are additive and can be gated by runtime feature flags.

## Embodiment Contract V2 (Explicit Envelope)
Canonical contract file: `docs/schemas/embodiment_v2.json`

Required envelope sections:
- `semantic_field`
- `morphogenesis_plan`
- `light_program`
- `runtime_tick_policy`

Compatibility policy:
- Legacy consumers reading `visual_parameters` MUST use adapter `tools/contracts/protocol_adapter.py`.
- Schema lint enforces `x-field-evolution` metadata + required section presence for every governed contract.
