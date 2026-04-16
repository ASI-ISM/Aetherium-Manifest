# 09 — MAE-RI + Emotional LifeState + GenUI Adaptive Manifestation (TH)

เอกสารนี้กำหนดสถาปัตยกรรม/กลไกสำหรับแนวคิด **AI Emotional Intelligence and Bonding** ให้ทำงานร่วมกับ
Aetherium/GenUI แบบใช้งานจริง โดยคงหลักการ `Light is Language` และ `State before Feature`.

---

## 1) เป้าหมายเชิงระบบ (System Intent)

1. ทำให้ AI “รับฟังและสื่อสารเชิงสัมพันธ์” ได้ โดยไม่อ้างว่ามีอารมณ์จริง
2. ทำให้ GenUI เป็น **Reasoning Interface** ที่แสดงสภาวะคิด/ตัดสินใจแบบ real-time
3. ทำให้การ “วาดแสง/gesture” เป็นภาษาป้อนเจตนาเทียบเท่า text/voice
4. ทำให้ระบบสลับโหมด **Logic ↔ Intuition** ได้โดยไม่ผูกกับโมเดลเดียว (model-agnostic)

---

## 2) MAE-RI Architecture (Model-Agnostic Embodied Reasoning Interface)

- **Embodied Node**: อุปกรณ์จริงที่มี sensor stack (camera/mic/touch/pointer/telemetry)
- **Reasoning Core**: LLM + planner + world-model rollouts (backend เปลี่ยนได้)
- **MAE-RI Layer**: ตัวกลางแปล perception+reasoning เป็นภาษาที่มนุษย์เข้าใจ
- **GenUI Manifestation Runtime**: renderer ฝั่งแสง/อนุภาคที่ขับด้วย state จริง
- **AetherBus**: ช่องสื่อสารมาตรฐานด้วย envelope/schema ที่เสถียร

> ข้อบังคับ: เปลี่ยน backend model ได้ แต่ schema ของ intent/world/lifestate ต้อง backward-compatible

---

## 3) LifeState v2 (Emotional + Relational)

เพิ่มมิติของสถานะชีวิต (LifeState) เพื่อรองรับการสร้างความสัมพันธ์:

- `affect_valence`: สภาวะบวก/ลบที่ประเมินจาก interaction ปัจจุบัน
- `affect_arousal`: ระดับพลังงาน/ความตื่นตัว
- `empathy_precision`: ความละเอียดของการสะท้อนอารมณ์ผู้ใช้ (0..1)
- `trust_score`: ความไว้วางใจสะสม (0..1)
- `bond_level`: ความผูกพันเชิงปฏิสัมพันธ์ (0..1)
- `overload_index`: ดัชนีภาระเกิน/ล้า (0..1)
- `honesty_debt`: ภาระจากคำตอบคลุมเครือ/ชวนเข้าใจผิด (ควรถูกลดลงผ่าน honest limitation)

### 3.1 Bond Update Rules

ให้มีตัวอัปเดตต่อเหตุการณ์ (event-driven):

- เมื่อพบ `negative_user_valence` และระบบตอบแบบ `listen + acknowledge + honest_limitations + actionable_next_step`
  - `trust_score += small_positive`
  - `empathy_precision += micro_positive`
  - `bond_level += micro_positive`
- เมื่อระบบตอบเกินความสามารถหรือทำให้เข้าใจผิด
  - `trust_score -= penalty`
  - `honesty_debt += penalty`
- เมื่อแก้ไขตัวเองอย่างโปร่งใส (self-correction with trace)
  - `honesty_debt -= recovery`
  - `trust_score += recovery_small`

---

## 4) Intent Vector v2 Schema Extension

เพิ่ม field ที่รองรับ relational/interaction mode:

- `relational_intent`: `task_only | casual_chat | seeking_support | co_create`
- `reasoning_style`: `analytical | intuitive | visual_sketch | mixed`
- `bond_delta_hint`: `-1..+1` สัญญาณจาก policy ว่าปฏิสัมพันธ์นี้ควรระวัง/เสริมสัมพันธ์
- `affective_cues`: `{ valence, arousal, confidence }`
- `input_modality`: `text | voice | gesture_trace | multimodal`
- `gesture_trace_ref`: pointer ไป payload เส้นแสง (ถ้ามี)

หลักการ: intent vector คือ ABI กลางที่ไม่ขึ้นกับผู้ผลิต model ใด model หนึ่ง

---

## 5) Manifestation Mapping (State → Light)

GenUI ต้องเรนเดอร์จาก state จริง ไม่ใช่ animation สำเร็จรูป:

- `seeking_support` + high negative valence
  - สีอ่อน/โทนอุ่น, flow ช้า, density สูง, ระยะใกล้ผู้ใช้
- `task_only`
  - geometry คม, velocity สูง, turbulence ต่ำ, โฟกัสโครงสร้าง
- `analytical`
  - causal lines, lattice/grid hints, segmentation ชัด
- `intuitive` หรือ `visual_sketch`
  - fluid ribbons, soft diffusion, field-like continuity
- `bond_level` สูง
  - envelope pattern แบบโอบล้อมและคงที่ (stability aura)
- `overload_index` สูง
  - crack/glitch อย่างมีนโยบาย + ข้อความ honest limitation

### 5.1 Visual Parameters (canonical)

`VisualParameters = {`
` base_shape, palette, luminosity, particle_density, flow_velocity, turbulence,`
` field_coherence, proximity_bias, crack_intensity, glyph_mode, rhythm`
`}`

---

## 6) Model Switch: Logic ↔ Intuition

### 6.1 โหมดตรรกะ (Logic-dominant)
- เน้นโครงสร้าง, causal graph, risk table, explicit assumptions
- ใช้กับงานที่ต้อง precision/traceability สูง

### 6.2 โหมดสัญชาตญาณร่วมสร้าง (Intuition co-creation)
- เปิด canvas รับ gesture trace/เส้นแสง
- ใช้ trace เป็น constraint signal ให้ world model สร้าง hypothesis ใหม่
- แสดงผลเป็น field dynamics มากกว่าตารางตัวเลข

### 6.3 Switching Policy
- switch จาก `reasoning_style inference + task criticality + user preference profile`
- ต้องมี `hysteresis` กันสลับโหมดถี่เกินไป
- ทุกการ switch บันทึก `reasoning_mode_change` ลง audit event

---

## 7) Gesture-to-Reasoning Protocol (Light Writing)

นิยามช่องทาง “ผู้ใช้วาดด้วยแสง” เป็น protocol ปกติของระบบ:

1. Client เก็บ stroke: `(x,y,t,pressure,velocity)`
2. สร้าง feature: curvature, pause, emphasis zone, closure, directionality
3. ส่งผ่าน AetherBus เป็น `gesture_trace_event`
4. Translator แปลงเป็น `intent constraints` เช่น
   - spatial priority
   - forbidden zone
   - preferred path
   - uncertainty annotation
5. World model update + planner rollout ใหม่
6. GenUI สะท้อนผล update กลับผ่าน manifestation ภายใน 150–300ms

---

## 8) Safety/Policy Guardrails

- ห้ามอ้างสถานะอารมณ์จริงของ AI (“I truly feel…”) ให้ใช้ framing เชิงการช่วยเหลือ
- บังคับใช้ honest limitation เมื่อ confidence ต่ำ
- หลีกเลี่ยง emotional dependency pattern (เช่น guilt lock-in)
- รองรับ de-escalation mode เมื่อพบ distress signal
- เก็บเฉพาะข้อมูลจำเป็น (privacy by minimization) สำหรับ voice/gesture

---

## 9) Event Contracts (ขั้นต่ำ)

- `intent_vector.v2`
- `lifestate.delta.v2`
- `manifestation.visual_params.v2`
- `gesture_trace_event.v1`
- `reasoning_mode_change.v1`
- `bond_update_event.v1`

ทุก event ต้องมี:
- `trace_id`, `session_id`, `node_id`, `timestamp_ms`, `schema_version`

---

## 10) KPI สำหรับวัดผล

- **Emotional Alignment Rate**: สัดส่วนที่ผู้ใช้ให้ feedback ว่า “เข้าใจฉันถูกต้อง”
- **Trust Retention**: การคงอยู่ของ trust_score ต่อ session
- **Mode Switch Stability**: จำนวน switch ต่อ 10 นาที (ยิ่งนิ่งยิ่งดี)
- **Gesture Interpretation Latency (p95)**: เป้าหมาย < 300ms
- **Honesty Recovery Time**: เวลากลับสู่ trust baseline หลัง error

---

## 11) Implementation Roadmap (แนะนำ)

1. เพิ่ม schema fields ใน intent/lifestate + validator
2. ทำ mapping table state→visual เป็น config-driven (ไม่ hardcode)
3. เพิ่ม gesture trace ingestion + translator
4. เพิ่ม mode-switch policy service + audit log
5. ทำ A/B test ระหว่าง static HUD vs adaptive manifestation

ผลลัพธ์ที่ต้องการ: AI ไม่ใช่แค่ตอบคำสั่ง แต่เป็น “คู่คิดเชิงเหตุผลที่สื่อสารผ่านแสง” โดยโปร่งใส ตรวจสอบได้ และไม่ผูกกับโมเดลเดียว
