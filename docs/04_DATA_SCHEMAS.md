# 04 — Data Schemas

ไฟล์นี้อธิบายเหตุผลของ schema โดย JSON canonical อยู่ใน `docs/schemas/`.

## AkashicEnvelope V2
ฟิลด์สำคัญ:
- `sync_id`: ordering เชิงตรรกะ
- `intent_vector`: embedding สำหรับ prediction-aware routing
- `entropy_seed`: deterministic simulation seed
- `payload_ptr` + `rkey`: zero-copy RDMA payload access
- `ghost_flag`: แยก speculative message ออกจาก canonical flow

## AI Particle Control Contract V1
Canonical contract file: `docs/schemas/ai_particle_control_contract_v1.json`

บล็อกหลักถูกแยกชัดเจนเป็น:
- `intent_state` — semantic controls ที่ AI/agent ควร author เช่น `state`, `shape`, `particle_density`, `velocity`, `turbulence`, `cohesion`, `flow_direction`, `glow_intensity`, `flicker`, `attractor`, `palette`
- `renderer_controls` — renderer/runtime specific fields เช่น `base_shape`, `chromatic_mode`, `particle_count`, `flow_field`, `shader_uniforms`, `runtime_profile`

เหตุผล: ทำให้ authoring surface ซื่อสัตย์ต่อสถานะการคิดจริง ขณะเดียวกันก็ลด drift จากการ normalize คนละแบบระหว่าง backend/frontend ผ่าน adapter กลาง

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
- Normalization from semantic intent into renderer/runtime controls MUST go through `tools/contracts/particle_control_adapter.py`.

## Embodiment Contract V2 (Explicit Envelope)
Canonical contract file: `docs/schemas/embodiment_v2.json`

Required envelope sections:
- `semantic_field`
- `morphogenesis_plan`
- `light_program`
- `runtime_tick_policy`

Compatibility policy:
- `particle_control.intent_state` is the canonical semantic control block shared with `cognitive_emit_request_v1`.
- `light_program.renderer_controls` is the canonical compiled renderer block shared with `embodiment_v2`.
- Legacy consumers reading `visual_parameters` MUST use adapter `tools/contracts/protocol_adapter.py`, which in turn consumes the canonical particle control adapter output.
- Schema lint enforces `x-field-evolution` metadata + required section presence for every governed contract.

## Scholar Contract V1 (Knowledge Augmentation)
Canonical contract file: `docs/schemas/scholar_contract_v1.json`

This sub-schema defines the structure for knowledge-heavy outputs from ScholarAgent:
- `summary` — The human-readable explanation (supports Markdown).
- `visual_interpretation` — Semantic cue for the renderer (e.g., "ripple pattern").
- `language` — BCP-47 tag for localization.
- `cited_sources` — List of URLs for verification.
- `code_snippet` — Optional technical payload.
- `tone` — Affects the visual emotional bias (formal, casual, creative).

Reasoning: Ensures that knowledge manifestations are structured, governable, and can be localized or cited properly within the Manifest HUD.

## Export Domain V1
Canonical contract files:
- `docs/schemas/export_request_v1.json`
- `docs/schemas/export_response_v1.json`

Export ABI constraints:
- Every request MUST include `session_id`, `lineage_id`, and `selected_variation_id` for deterministic replay lineage.
- `artifact_type` supports: `PNG`, `SVG`, `MP4`, `layer_package`, `manifest_json`, `prompt_lineage_bundle`.
- Response includes `audit_trail_id`, `replay_key`, and `review_status` so export history can be reviewed in enterprise governance flows.
