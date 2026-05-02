# CODEBASE SYSTEM ATLAS (TH)

> เอกสารนี้เป็น **non-invasive documentation**: อธิบายภาพรวมเชิงโครงสร้างของโค้ดเบส Aetherium Manifest โดยไม่เปลี่ยนพฤติกรรมระบบ

## 1) เป้าหมายของเอกสาร

เอกสารนี้ออกแบบมาสำหรับผู้มาใหม่ที่ต้องการเข้าใจ 3 ระดับพร้อมกัน:
1. **โครงสร้างทั่วไปของ repo** (หาไฟล์ไหน ทำอะไร)
2. **โครงสร้างระบบขั้นสูง** (data/control boundary, governor-first safety)
3. **ช่องว่างสำคัญ** (ข้อมูล/ระบบที่ยังไม่สมบูรณ์ + แผนพัฒนาเชิงลำดับความสำคัญ)

---

## 2) Executive Summary (อ่าน 3 นาที)

- ระบบนี้เป็น runtime แบบ **intent → light/particle manifestation** โดยมี **Governor** เป็นเส้นเขตควบคุมหลัก
- สถานะ/ข้อมูล runtime ปัจจุบันจำนวนมากยังเป็น **in-memory** (prototype-oriented) มากกว่าฐานข้อมูลถาวร
- โค้ดเบสแบ่งได้เป็น 4 plane หลัก: frontend runtime, api/ws gateway, governor, contract+tooling
- จุดแข็ง: contract-first, safety stage ชัด, benchmark/tooling มีแกนพอสมควร
- จุดเสี่ยง: durability ของข้อมูล, ความซ้ำซ้อนของไฟล์ deployment/docs, และการปะปนระหว่าง vision-level docs กับ implementation reality

---

## 3) โครงสร้างระดับ Repository

## 3.1 โฟลเดอร์หลักและบทบาท

- `api_gateway/` — FastAPI gateway และ endpoint ทางเข้า runtime/control
- `governor/` — canonical control boundary สำหรับ mutation/safety gating
- `ws_gateway/` — websocket-focused gateway path
- `first_use_surface/` + root web assets (`index.html`, `clean-first-surface.js/css`) — first-view UI runtime
- `tools/contracts/` — contract checker/fuzz/drift guard
- `tools/benchmarks/` — latency/semantic benchmark scripts
- `docs/` — canonical/blueprint/ops/rfc/schemas docs
- `contracts/` + schema files ที่ root/governor/docs — ABI contract artifacts
- `deploy/`, `templates/`, `charts/` — deployment manifests และ Helm packaging
- `data/` — ตัวอย่างข้อมูล/ops/sql backlog และ sample artifacts

## 3.2 ภาพโครงสร้างแบบ Plane

1. **Experience Plane**: surface, renderer, language/input/event orchestration
2. **Control Plane**: API Gateway + WS Gateway + distributed adapters
3. **Safety Plane**: Governor policy pipeline (deny-by-default)
4. **Trust Plane**: Contracts, tests, fuzzing, benchmark, replay/telemetry assertions

---

## 4) สถาปัตยกรรมระบบขั้นสูง (Advanced Architecture)

## 4.1 Canonical Runtime Path

ลำดับที่ต้องรักษาไว้:

`validate → transition → profile_map → clamp → fallback → policy_block → capability_gate → telemetry_log`

ความหมายเชิงวิศวกรรม:
- **validate**: ตรวจ schema + semantic
- **transition/profile_map**: map จาก intent/state ไป runtime representation
- **clamp/fallback**: จำกัดพลังงาน/ค่าควบคุม + degraded safe mode
- **policy_block/capability_gate**: deny-by-default และตรวจความสามารถ runtime
- **telemetry_log**: เก็บ trace เพื่อ deterministic observability

## 4.2 Boundary ที่สำคัญ

- **User input ไม่ใช่ trusted signal**: ทุกเส้นทางต้องผ่าน validation/governor
- **Governor คือ mutation authority**: ส่วนแสดงผลไม่ควร bypass stage นี้
- **Schema = ABI**: แก้ schema ถือเป็นสัญญา compatibility change

## 4.3 ข้อเท็จจริงเรื่อง “ฐานข้อมูล” ในปัจจุบัน

แม้ระบบมี data flow ซับซ้อน แต่ authoritative storage ปัจจุบันยังเน้น **process-local in-memory structures** เช่น telemetry store, metrics counters, audit deque, room state map และ nonce cache

ผลกระทบ:
- restart process = ข้อมูล volatile หาย
- horizontal scale ต้องมี shared/durable backend เพิ่ม
- production observability ระยะยาวยังต้องเสริม TSDB/event store

---

## 5) มุมมอง “ฐานข้อมูลโค้ด” (Codebase Knowledge Database)

## 5.1 โดเมนข้อมูลที่มีอยู่

1. **Runtime state data**: session/state sync/runtime manifest state
2. **Contract data**: JSON schemas, payload examples, compatibility fixtures
3. **Operational data**: runbooks, k8s manifests, messaging configs
4. **Benchmark/Test data**: sample inputs, replay logs, semantic/latency cases
5. **Vision/Design knowledge**: canonical docs, blueprint docs, roadmap appendices

## 5.2 แหล่งข้อมูลเชิงลึกที่ควรอ่านก่อน

- `README.md` (ภาพรวมระบบและ runtime path)
- `docs/00-08` (purpose → overview → components → interfaces → schema → policies → safety → test)
- `docs/ops/` (production posture, runbooks, observability, k8s)
- `tools/contracts/*` และ `tools/benchmarks/*` (quality gates)

---

## 6) สิ่งสำคัญที่ผู้มาใหม่ต้องรู้ (Critical Onboarding Facts)

1. **โปรเจกต์นี้ไม่ใช่แค่ UI**: เป็น runtime+governance stack
2. **“ปลอดภัย” มาก่อน “สวยงาม”**: visual quality ต้องไม่ข้าม control boundary
3. **Contract compatibility สำคัญมาก**: หลีกเลี่ยง breaking change แบบไร้ migration note
4. **docs มีหลายระดับความจริง (truth level)**:
   - implementation reality
   - architectural target/blueprint
   ต้องแยกให้ออกเสมอ
5. **ทดสอบหลายภาษา/หลายเลเยอร์**: Python (pytest/scripts) + TypeScript parity tests

---

## 7) ข้อมูลที่ยังไม่สมบูรณ์ / ช่องว่างเชิงระบบ (Detailed Gaps)

## 7.1 Data & Persistence Gaps

- Telemetry/audit/state จำนวนมากยังไม่ durable
- ยังไม่มี canonical migration path ที่ประกาศเป็นขั้นเป็นตอนสำหรับ data backend production
- SQL files ใน `data/` เป็น package/backlog มากกว่าการเป็น live schema ที่ผูกกับ runtime โดยตรง

## 7.2 Architecture & Consistency Gaps

- พบ deployment artifacts หลายชุด (`deploy/`, `templates/`, `docs/ops/k8s/`, `charts/`) เสี่ยง drift
- มีทั้งไฟล์ runtime/governor ซ้ำข้ามตำแหน่ง ทำให้ผู้มาใหม่สับสนเรื่อง source-of-truth
- docs จำนวนมากและลึก แต่บางจุดยากต่อการแยก “ทำแล้ว” vs “วางแผนไว้”

## 7.3 Quality/Process Gaps

- ยังไม่เห็น unified lint/format/test matrix ที่บังคับครบทุก language/runtime path
- หลายส่วนพึ่งพา sample/prototype semantics มากกว่า production SLO/SLA ที่วัดได้จริง
- ความพร้อมด้าน security hardening สำหรับ production multi-tenant ยังต้องจัดลำดับและ lock baseline เพิ่ม

---

## 8) ลำดับความสำคัญในการพัฒนา (Prioritized Improvement Roadmap)

## P0 (สำคัญสูงสุด: เสถียรภาพ + ความปลอดภัย)

1. **กำหนด Source-of-Truth Matrix**
   - ระบุชัดว่าไฟล์ไหน canonical สำหรับ runtime/governor/deploy/docs
2. **ยกระดับ persistence ขั้นต่ำ**
   - telemetry + audit logs ไป durable store
3. **Contract Governance Gate ที่เข้มขึ้น**
   - required compatibility checks + release notes template

## P1 (ความพร้อม production)

4. **รวม deployment strategy**
   - ลด drift ระหว่าง k8s manifests / templates / Helm
5. **กำหนด observability SLO**
   - latency budget, error budget, governor rejection ratios
6. **ทำ runbook ให้ map กับ metric/alert จริง**

## P2 (ความสามารถเชิงนวัตกรรม)

7. **สร้าง replay lab แบบ deterministic-end-to-end**
8. **ยกระดับ semantic benchmark ให้รองรับ scenario library แบบ versioned**
9. **พัฒนา policy simulation sandbox สำหรับทดสอบ capability gate เชิงคาดการณ์**

---

## 9) เส้นทางการเรียนรู้ต่อสำหรับผู้พัฒนา

## Phase A: Understand
- อ่าน `README.md` + `docs/00-08`
- trace flow จาก input → gateway → governor → renderer

## Phase B: Verify
- รัน pytest/contracts/fuzz/benchmark และ TS parity test
- ตรวจว่า behavior สอดคล้องกับ canonical control path

## Phase C: Extend Safely
- เสนอ change ผ่าน schema-first + migration note
- เติม tests ก่อน optimize performance

## Phase D: Innovate
- ทดลองแนวคิดใหม่ใน layer ที่ไม่กระทบ safety boundary
- บันทึกผลด้วย benchmark/replay เพื่อเทียบ baseline เดิม

---

## 10) Checklist สำหรับคนที่จะเริ่มแก้ระบบ

- [ ] เข้าใจ governor path ครบทุก stage
- [ ] รู้ว่า endpoint ไหนเป็น canonical route
- [ ] อ่าน schema ที่เกี่ยวข้องครบ
- [ ] เพิ่ม/แก้ tests ที่จับ regression ได้
- [ ] อัปเดต docs ตาม behavior change (ถ้ามี)
- [ ] แยกแยะว่าแก้ implementation หรือแค่แก้ blueprint

---

## 11) ข้อเสนอเชิงสร้างสรรค์สำหรับเทคโนโลยีรุ่นถัดไป

1. **Policy-as-Code + Formal Constraints** สำหรับ perceptual safety
2. **Hybrid Runtime Memory**: in-memory speed + durable event backbone
3. **Adaptive Manifestation Profiles** ที่ปรับตาม capability จริงของอุปกรณ์แบบ deterministic
4. **Contract-aware AI tooling** ให้ agent/dev tool ช่วยเตือน breaking ABI ล่วงหน้า
5. **Design-to-Governor Compiler** ที่แปลง UX intent เป็น policy-safe control templates

---

## 12) บทสรุป

Aetherium Manifest มีรากฐานสถาปัตยกรรมที่แข็งแรงในมิติ **governor-first + contract-first + observability-aware** แต่ยังอยู่ในช่วงที่ต้องยกระดับจาก prototype runtime ไป production-grade platform โดยเฉพาะเรื่อง persistence, artifact consistency และ quality gates ข้าม stack

เอกสารฉบับนี้ตั้งใจเป็นแผนที่นำทาง: ช่วยผู้มาใหม่เข้าใจความจริงของระบบปัจจุบัน, ช่องว่างที่มีอยู่, และเส้นทางพัฒนาเชิงลำดับความสำคัญเพื่อเพิ่มศักยภาพระบบให้ก้าวสู่เทคโนโลยีเชิงสร้างสรรค์ที่ทันสมัยอย่างปลอดภัย
