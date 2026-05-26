# รายงานวิเคราะห์โครงสร้างระบบ Aetherium Manifest

วันที่: 26 พฤษภาคม 2026  
ขอบเขต: วิเคราะห์ AGENTS.md + Production Core Specification + โครงสร้างโฟลเดอร์/ไฟล์ + code surface หลัก

---

## 1) วัตถุประสงค์ของรายงาน

เอกสารฉบับนี้สรุปภาพรวมเชิงสถาปัตยกรรมของโค้ดเบสเทียบกับ Production Core Specification (mf-3.30.0) เพื่อให้ผู้ตัดสินใจสามารถ:

- เห็นจุดที่ “สอดคล้อง” กับหลัก Governor-first/Survival-first
- เห็นช่องว่างที่เสี่ยงต่อ boundary รั่ว (Cognition → Render)
- ตัดสินใจ roadmap: อะไรควรปรับปรุง, อะไรควรลบ, อะไรควรแก้ทันที
- รับรายการคำถามเชิง governance ที่ควรอนุมัติก่อนขยายระบบ

---

## 2) Executive Summary (สรุปผู้บริหาร)

สถานะปัจจุบัน: **ฐานระบบมีแกนที่ดีมาก แต่ยังเป็น hybrid runtime ที่ปะปน prototype logic หลายยุค**

จุดแข็งสำคัญ:
1. มี governor boundary จริงทั้งฝั่ง TS และ Python
2. มี contract-first tooling และ drift/fuzz guard
3. มีแนวคิด degradation และ runtime pressure handling ใน GPU sim

จุดเสี่ยงเชิงโครงสร้าง:
1. นิยาม state และ color canon ยังไม่ถูกบังคับแบบ single-source อย่างเข้มงวดทุก plane
2. gateway มี responsibility กว้างมาก (cognitive + auth + telemetry + sync + model routing) เสี่ยงต่อ non-determinism
3. มี artifact ที่ไม่ควรอยู่ใน repo หลัก production (เช่น `__pycache__`, `.venv` ภายในโค้ดเบส)

ข้อเสนอหลัก: ทำ “**Boundary Hardening Release**” แยกเป็น 3 เฟส (Normalize → Enforce → Isolate)

---

## 3) ภาพรวมโครงสร้างโฟลเดอร์

โครงสร้างที่พบ (กลุ่มหลัก):

- `first_use_surface/` + static root (`index.html`, `clean-first-surface.*`) = entry surface
- `api_gateway/` = canonical API + cognitive routes + state/telemetry/session ticket
- `governor/` และ `governor.ts` = governor logic หลาย implementation surface
- `runtime/gpu-sim/` = IR → GPU param mapping + pass shaders
- `tools/contracts/` = checker/fuzz/drift guard
- `contracts/` + `docs/schemas/` = schema/ABI assets
- `ws_gateway/`, `aetherbus_tachyon_go/` = realtime/distributed transport plane
- `deploy/`, `charts/`, `templates/` = deployment/k8s surfaces

ข้อสังเกต: โค้ดเบสเดินมาถูกทางแบบ multi-plane ตาม spec แต่ยังมี “plane overlap” สูงใน gateway plane.

---

## 4) การเทียบกับ Production Core Specification

### 4.1 สิ่งที่สอดคล้อง

- มีแนวคิด Governor เป็น authority และมีการ validate payload ก่อน manifest
- มี contract/schema เป็นศูนย์กลางสำหรับ payload compatibility
- มี runtime pressure adaptation ใน GPU sim (`mapIRToGpuParams`, dynamic scaling)

### 4.2 ช่องว่างที่ยังต้องปิด

1. **Canonical Runtime States ยังไม่ lock ทั้งระบบ**  
   - Spec กำหนด state canonical ชัดเจน (DORMANT/LISTENING/.../RECOVERY/LOCKED)
   - โค้ดมี state profile ฝั่ง governor แต่ต้อง verify ว่าทุก endpoint/event ใช้ dictionary เดียวกันแบบ deterministic

2. **Color Canon ยังเสี่ยง drift**  
   - Spec ระบุสี canonical ตายตัว แต่โค้ดหลายจุดยังใช้ palette เฉพาะ flow/feature
   - ต้องออก policy: runtime state → color mapping เพียงแหล่งเดียว

3. **Boundary “Renderer receives only governed IR” ยังต้องทำให้ตรวจสอบได้เชิงกลไก**  
   - ตอนนี้แนวคิดมีแล้ว แต่ยังควรเพิ่ม formal boundary tests แบบ e2e gate ที่ fail-build ทันทีหากมี direct text/render coupling

---

## 5) สิ่งที่ต้องปรับปรุง (Improve)

1. **แยก Domain Layer ใน `api_gateway/`**
   - แยก module ตามบทบาท: intake, governance orchestration, ticket security, telemetry store, sync rooms
   - ลด God-module pattern ของ `main.py`

2. **สร้าง Canonical State Registry กลาง**
   - source เดียว export ไป TS/Python (generate artifact หรือ shared JSON schema)
   - บังคับผ่าน CI ว่า state enum ทุกที่ต้องตรงกัน

3. **สร้าง Canonical Color Mapper**
   - runtime state → approved color palette เท่านั้น
   - forbid custom palette injection ใน production mode

4. **เพิ่ม Deterministic Boundary Tests**
   - test suite ที่พิสูจน์ว่า raw prompt/LLM text ไม่เข้าช่อง shader/gpu params โดยตรง
   - เพิ่ม tests สำหรับ transitions และ policy_block ordering

5. **ลด Surface ของ model provider drift**
   - model map ปัจจุบันยังเป็น string-based static map; ควรผูกกับ policy class + allowlist by deployment tier

---

## 6) สิ่งที่ต้องลบออก (Remove)

1. **ลบ artifacts ที่ไม่ควร versioned ใน repo**
   - `__pycache__/` หลายตำแหน่ง
   - `api_gateway/.venv/`

2. **ลบ/ย้ายไฟล์ prototype ที่ซ้ำหน้าที่ production plane**
   - ทบทวนไฟล์ gateway/distributed ที่ซ้ำชื่อคนละที่ (top-level vs submodule) เพื่อเหลือ canonical entry เดียว

3. **ลบ dependency path ที่เปิดโอกาส bypass governance**
   - endpoint/flow ใดที่ยังส่งผล render โดยไม่ผ่าน canonical governor pipeline ควรถูก deprecated

---

## 7) สิ่งที่ต้องแก้ไข (Fix)

1. **Fix สัญญา ABI ระหว่าง governor TS กับ governor Python**
   - นิยาม payload shape, state taxonomy, policy violation codes ให้เหมือนกัน

2. **Fix deployment contract parity**
   - เช็ค chart/template/config ให้ค่า default ด้าน safety (HPA, throttling, limits) สอดคล้อง survival law

3. **Fix observability model ให้รองรับ Reflect/Recover ตาม spec**
   - ปัจจุบัน telemetry in-memory เพียงพอสำหรับ prototype แต่ยังไม่ตอบโจทย์ reflective persistence

---

## 8) ข้อเสนอเพื่อขออนุมัติจากผู้มีอำนาจตัดสินใจ

### 8.1 Decision ที่ต้องอนุมัติทันที

1. อนุมัติ “Boundary Hardening Release” เป็น milestone แยกจาก feature release
2. อนุมัติ “Single Source of Truth” สำหรับ state/color/spec ABI
3. อนุมัติ “Repo Sanitation Policy” (ห้าม commit runtime artifacts เช่น `.venv`, `__pycache__`)

### 8.2 Decision ที่ควรวางกรอบล่วงหน้า

1. Production data strategy: จะคง ephemeral-first หรือย้ายสู่ durable telemetry/audit ตามระดับ environment
2. Runtime isolation policy: แยก cognitive inference ออกจาก render control plane ระดับ process/container หรือไม่
3. Governance exception workflow: ใครมีสิทธิ bypass policy ในเหตุฉุกเฉิน และ audit อย่างไร

---

## 9) คำถาม/ข้อความถึงผู้ดูแลระบบ

1. ต้องการให้ระบบ production phase ถัดไป “strict offline-first” ถึงระดับไหน (เฉพาะ cache หรือ full degraded operation)?
2. มีข้อกำหนดด้านความปลอดภัยข้อมูล (compliance) ใดที่บังคับ retention/erasure สำหรับ telemetry และ ticket audit หรือไม่?
3. ต้องการ lock model provider ใดเป็น canonical ต่อ region/tier เพื่อหลีกเลี่ยง semantic drift?
4. อนุญาตให้ refactor ใหญ่ `api_gateway/main.py` ใน release เดียวหรือแยกหลาย incremental PR?

---

## 10) แผนปฏิบัติการแนะนำ (90 วัน)

- Phase 1 (สัปดาห์ 1-3): Repo sanitation + state/color canonical registry + CI checks
- Phase 2 (สัปดาห์ 4-8): Gateway decomposition + boundary tests + policy enforcement hardening
- Phase 3 (สัปดาห์ 9-12): telemetry/audit persistence strategy + recover/reflect operational runbooks

ผลลัพธ์ที่คาดหวัง:
- ลดความเสี่ยง boundary leak
- เพิ่ม deterministic behavior ข้ามทุก plane
- ทำให้สถาปัตยกรรมสอดคล้องกับ Production Core Specification อย่างตรวจสอบได้

---

## 11) บทสรุป

Aetherium Manifest มีโครงสร้างแกนที่แข็งแรงและมีทิศทางถูกต้องตามแนวคิด “governed manifestation runtime” แล้ว แต่การไป production-grade เต็มรูปแบบต้องเน้น **ความเข้มงวดของ boundary, ความเป็นเอกภาพของ state/color ABI, และการแยกความรับผิดชอบของ gateway** ก่อนขยายความสามารถอื่นใด.
