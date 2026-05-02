# คู่มือทำความเข้าใจ Codebase และโครงสร้างระบบ (สำหรับผู้มาใหม่)

## 1) เป้าหมายของเอกสารนี้
เอกสารนี้สรุปภาพรวมเชิงสถาปัตยกรรม, โครงสร้างโฟลเดอร์, จุดสำคัญด้านสัญญา (contract), ความปลอดภัย, telemetry, ช่องว่างที่ยังไม่สมบูรณ์ และแนวทางพัฒนาต่อแบบจัดลำดับความสำคัญ เพื่อช่วยให้ผู้พัฒนารายใหม่เข้าใจระบบได้เร็วและต่อยอดระบบได้อย่างปลอดภัย

---

## 2) สรุประบบแบบสั้น (Executive Summary)
Aetherium Manifest คือ runtime สำหรับแปลง “intent/state” ไปเป็นการแสดงผลเชิงแสง/อนุภาค โดยมี **Governor** เป็น canonical safety boundary

ลำดับควบคุมหลักที่ต้องรักษาไว้เสมอ:

`validate → transition → profile_map → clamp → fallback → policy_block → capability_gate → telemetry_log`

สาระสำคัญ:
- Frontend เป็น static runtime + first-use surface
- Backend เป็น FastAPI gateway + websocket/state sync
- Contract-first เป็นหัวใจ (schema เปลี่ยน = ABI change)
- Telemetry/Audit ปัจจุบันเน้น in-memory เพื่อ deterministic prototyping

---

## 3) แผนที่โครงสร้าง Repository (General Structure)

## 3.1 แกนระบบหลัก
- `index.html`, `clean-first-surface.*`, `first_use_surface/*`  
  UI หน้าแรกและประสบการณ์ผู้ใช้เชิง runtime
- `api_gateway/`  
  FastAPI gateway, cognitive endpoints, ws scaling, replay hooks, distributed adapters
- `governor/`  
  Runtime governor และ schema ฝั่งควบคุมความปลอดภัย
- `tools/contracts/`  
  contract checker/fuzzer/adapter/drift guard
- `tools/benchmarks/`  
  benchmark latency/semantic/stage-handoff
- `docs/`  
  เอกสารสถาปัตยกรรม, RFC, ops runbook, production blueprint, schema docs

## 3.2 โซนเสริมที่ควรรู้
- `tests/` + `*.test.ts|*.test.js|test_*.py`  
  ทดสอบหลายชั้น (frontend flow, runtime behavior, gateway integration)
- `aetherbus_tachyon_go/`  
  ส่วนทดลอง/ขยายด้าน messaging/server ฝั่ง Go
- `contracts/` และ `docs/schemas/`  
  schema ใช้งานจริง + schema เพื่อเอกสาร/สื่อสารข้ามทีม

---

## 4) โครงสร้างขั้นสูง (Advanced System Structure)

## 4.1 Runtime Planes
1. **First-use surface plane**: จุดเริ่ม UX แบบ clean-entry
2. **Gateway plane**: รับคำขอ, validate, จัดการ state/session/ticket
3. **Governor plane**: บังคับ policy และ capability gate แบบ deny-by-default
4. **Contracts + Tooling plane**: ตรึงความเข้ากันได้เชิง ABI และตรวจ drift

## 4.2 Data/State Topology (ฐานข้อมูลเชิงตรรกะในปัจจุบัน)
ระบบยังไม่มี primary durable SQL/NoSQL ที่เป็นศูนย์กลางใน runtime ปัจจุบัน โดยมี in-memory stores สำคัญ:
- `TELEMETRY_TS_DB`: time-series telemetry (ตัด retention ต่อ metric)
- `METRICS`: aggregate counters
- `EXPORT_AUDIT_TRAIL`: bounded audit log
- `TICKET_AUDIT_TRAIL`: audit log สำหรับ ticket/session scopes
- `STATE_SYNC_ROOMS`: shared/user state ต่อ room + lock
- `NONCE_CACHE`: cache ป้องกัน replay/duplication เชิงชั่วคราว

ข้อสรุปเชิงสถาปัตยกรรม:
- จุดแข็ง: deterministic, เริ่มทดสอบได้เร็ว, debugging ง่าย
- ข้อจำกัด: durability/horizontal consistency/ย้อนหลังระยะยาว

## 4.3 External Systems (Optional, not yet authoritative)
- Redis/NATS ถูกเตรียมจุดเชื่อมไว้ แต่ state หลักยังเป็น in-memory
- Production-grade ต้องย้าย state สำคัญไป backend กลางที่แชร์ได้และทนทานกว่า

---

## 5) สิ่งสำคัญที่ผู้มาใหม่ต้องรู้ (Critical Knowledge)

1. **Governor คือขอบเขต canonical control boundary**
   - การ mutation หลักต้องผ่าน stage pipeline ที่กำหนด
2. **Contract-first ไม่ใช่ทางเลือก แต่เป็นข้อบังคับของระบบ**
   - schema เปลี่ยนต้องพิจารณา ABI/version/migration
3. **Model output เป็น untrusted control signal**
   - policy_block + capability_gate ต้องคงแนวคิด deny-by-default
4. **Observability ต้อง deterministic**
   - benchmark/replay/telemetry ต้องสอดคล้องกันแบบ lockstep
5. **Prototype persistence เป็น non-durable โดยตั้งใจ**
   - ห้ามตีความว่า production-ready โดยอัตโนมัติ

---

## 6) ช่องว่าง/ข้อมูลที่ยังไม่สมบูรณ์ในปัจจุบัน (Gaps & Incompleteness)

## 6.1 Data durability gap
- telemetry/audit/state หลักยัง volatile ตาม lifecycle ของ process
- ยังไม่มี migration playbook จาก in-memory ไป durable store แบบครบวงจร

## 6.2 Contract lifecycle governance gap
- แม้มี checker/fuzzer แต่ยังควรเพิ่ม release gate ที่บังคับ semantic versioning + compatibility matrix เชิงอัตโนมัติ

## 6.3 Security hardening gap
- มี ticket/signature/scope พื้นฐาน แต่ควรเติม key rotation policy, nonce persistence, anti-replay ที่ข้าม process/node

## 6.4 SRE/Operations maturity gap
- มี runbook และ k8s blueprint แล้ว แต่ยังต้องเสริม:
  - SLO/SLA อย่างเป็นทางการ
  - error budget policy
  - incident timeline templates แบบมาตรฐาน

## 6.5 Developer onboarding gap
- มีเอกสารจำนวนมาก แต่ความหนาแน่นสูงและกระจายหลายไฟล์
- ยังขาด one-path learning ที่จัดเป็นระดับ beginner→intermediate→advanced แบบชัดเจน

---

## 7) Roadmap การเรียนรู้สำหรับผู้มาใหม่ (What to Learn Next)

## ระยะที่ 1: เข้าใจภาพรวม (1-2 วัน)
- อ่าน `README.md` และ `docs/01_SYSTEM_OVERVIEW.md`
- ดูลำดับ pipeline governor และ contract หลัก
- รันระบบ local frontend + api gateway

## ระยะที่ 2: เข้าใจความปลอดภัยและสัญญา (2-4 วัน)
- อ่าน `docs/06_POLICIES.md`, RFC contract/governor
- รัน `contract_checker.py` และ `contract_fuzz.py`
- วิเคราะห์ schema version จาก `docs/schemas/*`

## ระยะที่ 3: เข้าใจ runtime behavior และการวัดผล (2-4 วัน)
- รัน benchmark scripts (`tools/benchmarks/*`)
- อ่านรายงานใน `docs/reports/*`
- ฝึก replay/telemetry query เพื่อดู deterministic behavior

## ระยะที่ 4: เข้าใจ production blueprint (3-5 วัน)
- อ่าน `docs/ops/*`, `docs/ops/k8s/*`, websocket scaling blueprint
- map ระบบปัจจุบันเทียบกับ multi-region target architecture

---

## 8) ข้อเสนอแนะการปรับปรุงตามลำดับความสำคัญ

## P0 (ต้องทำก่อน เพื่อความเสถียรและความปลอดภัย)
1. ย้าย telemetry/audit/session-critical state ไป durable/shared backend
2. บังคับ contract compatibility gate ใน CI (fail-fast)
3. เพิ่ม key rotation + nonce persistence + replay defense ข้าม instance

## P1 (ควรทำต่อ เพื่อความพร้อม production)
1. สร้าง SLO/SLI ชัดเจน (latency/error/replay consistency)
2. เพิ่ม end-to-end chaos/game-day scenarios ที่เชื่อม governor + gateway + ws
3. ทำ release checklist ที่ผูก schema/runtime/docs sync อัตโนมัติ

## P2 (เพิ่มศักยภาพและนวัตกรรม)
1. semantic memory layer แบบ versioned lineage
2. policy DSL และ simulation sandbox สำหรับ preflight safety
3. adaptive rendering profiles ที่ยัง deterministic ภายใต้ capability constraints

---

## 9) แนวทางออกแบบเทคโนโลยีใหม่อย่างสร้างสรรค์ (โดยไม่ทำลายแกนระบบ)

1. **Dual-rail runtime architecture**
   - Rail A: deterministic production path
   - Rail B: experimental adaptive path (sandboxed)
   - ใช้ policy gate + replay compare ก่อน promote

2. **Intent lineage graph**
   - เก็บเส้นทาง intent→state→render outcome เป็นกราฟวิเคราะห์คุณภาพ
   - ช่วยทั้ง debugging, explainability และ optimization

3. **Capability-aware design tokens for light runtime**
   - ออกแบบ token กลางที่ map ได้ทั้ง low/high hardware tier
   - คง behavior contract เดิมแต่เพิ่ม adaptive quality

4. **Safety-first plugin surface**
   - เพิ่ม extension API สำหรับ logic ใหม่ แต่บังคับผ่าน governor capability profile
   - รองรับ ecosystem growth โดยคงแกนความปลอดภัย

---

## 10) Checklist สำหรับผู้พัฒนาที่จะเริ่มลงมือ
- [ ] รันชุดตรวจสอบขั้นต่ำ: pytest + contract checker/fuzzer
- [ ] เข้าใจ schema ที่แตะต้องก่อนแก้ logic
- [ ] ประเมินผลกระทบต่อ governor pipeline ทุกครั้ง
- [ ] อัปเดตเอกสารใน `docs/` หาก behavior เปลี่ยน
- [ ] ตรวจ lint/test ก่อนเปิด PR

---

## 11) หมายเหตุปิดท้าย
เอกสารนี้ตั้งใจเป็น “แผนที่กลาง” สำหรับ onboarding และ architectural alignment โดยไม่เปลี่ยน runtime behavior ใด ๆ หากต้องการรายละเอียดเชิง implementation รายไฟล์ ให้ตามต่อในเอกสารหมวด `docs/` ที่ระบุไว้ในแต่ละหัวข้อ
