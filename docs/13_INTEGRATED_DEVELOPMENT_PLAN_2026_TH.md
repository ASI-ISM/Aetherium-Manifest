# Integrated Development Plan 2026 + Full Formal Architectural Report (TH)

**Document ID:** AM-ARCH-2026-INTG-TH  
**Status:** Draft for Architecture Review (L9 / Chief Architect)  
**Date:** 2026-03-29  
**Scope:** AETHERIUM Ecosystem (6 repositories) with deployment focus on `Aetherium-Manifest` integration boundary

---

## 1) ภาพรวมสถาปัตยกรรม (1 หน้า)

AETHERIUM ถูกออกแบบเป็น **Governed Real-time Control Loop** ที่แยก “การคิด”, “การตัดสินใจเชิงนโยบาย”, และ “การแสดงผลทางแสง” ออกจากกันอย่างชัดเจนเพื่อลด blast radius และทำ production hardening ได้แบบค่อยเป็นค่อยไป:

1. **Intent Ingress Layer** รับสัญญาณจากเสียง/ข้อความ/เหตุการณ์บริบท แล้ว normalize เป็น `Intent Contract` มาตรฐานเดียว (write-once, run-anywhere).
2. **Cognition & Planning Layer (Genesis + Logenesis)** แปลง intent เป็นแผนเชิงความหมาย (`Visual Plan`, `Scene Graph`, `Capability Demands`) โดยผูกกับ memory และ reasoning router เพื่อให้ deterministic replay ได้.
3. **Perception Adaptation Layer (BioVision)** วิเคราะห์สภาพแวดล้อมจริงแบบต่อเนื่อง (illumination, weather, occlusion, motion vector, depth proxies) เพื่อปรับแผนแสงให้กลมกลืนและปลอดภัย.
4. **Governance & Safety Layer (Governor + PRGX)** บังคับใช้ policy ก่อน render ทุกครั้ง: brightness caps, curfew, geo-fence, content safety, operator authorization, abuse detection, kill-switch.
5. **Real-time Distribution Layer (Tachyon + Time Sync)** กระจาย command/event stream สู่ edge/display ด้วยลำดับเหตุการณ์ที่ตรวจสอบได้ พร้อม jitter control และ predicted display time.
6. **Edge Runtime Layer (WASM/Native)** ประมวลผล compose/render ใกล้อุปกรณ์ (แว่น/จอ/โปรเจคเตอร์/edge box) เพื่อลด latency และรองรับ fail-safe เมื่อเครือข่ายมีปัญหา.
7. **Manifestation Layer (Aetherium-Manifest / ATR-MF)** แสดงแสงเป็น “connector layer” ซ้อนบน OS เดิมโดยไม่ทำลาย UX เดิม พร้อมสลับ 2 โหมด (Inspira-Firma Duality):
   - **A-mode (OS-native):** intent เดียวกันถูก route กลับไป Android/iOS/Windows app flow
   - **B-mode (Light-native):** intent เดียวกันถูกเรนเดอร์เป็น light/particle interface ตาม visual contract

**หลักการสถาปัตยกรรมหลัก**
- **Contract-first:** intent/visual/scene/time contracts เป็น ABI กลางและ versioned อย่างเข้มงวด
- **Safety-before-render:** ไม่มี frame ไหนข้าม Governor/PRGX ได้
- **Deterministic observability:** ทุก decision ต้อง replay ได้จาก event log + policy snapshot
- **Incremental capability rollout:** เริ่มจาก bounded environments ก่อนขยายสู่ public spaces

---

## 2) C4 (Text) + Dataflow + Interface Contracts

### 2.1 C4-Context

**Actors**
- End User (voice/intent)
- Developer (author intent+visual contracts)
- Enterprise Operator/Media Ops
- Compliance/Safety Officer

**System of Interest**
- AETHERIUM Governed Augmented Perception Platform

**External Systems**
- OS platforms (Android/iOS/Windows)
- External APIs (Drive, CMS, Ads platform)
- Identity Provider (OIDC/SAML)
- Geo/time policy providers

### 2.2 C4-Container

1. **Intent Gateway (API + stream ingest)**
2. **Genesis Planner Service**
3. **Manifest Registry/Compiler**
4. **BioVision Perception Service**
5. **Governor Runtime Policy Service**
6. **PRGX Policy Engine + Audit Ledger**
7. **Tachyon Realtime Bus**
8. **Edge Runtime Manager (WASM/native packager + sync agent)**
9. **Manifest Renderer (Aetherium-Manifest runtime)**
10. **Observability Stack (logs/metrics/traces/replay)**

### 2.3 C4-Component (ระดับโมดูล)

- **Intent Gateway**
  - ASR/Intent adapter
  - Contract validator
  - Idempotency key manager
- **Genesis Planner**
  - Reasoning Router
  - Scene Graph Composer
  - Capability Mapper
- **Manifest Registry**
  - Contract schema store
  - Compiler (visual presets → runtime artifact)
  - Compatibility checker
- **BioVision**
  - Layer segmentation
  - Motion/depth estimator
  - Qualia metrics exporter
- **Governor**
  - Brightness/curfew/geo evaluator
  - Dynamic throttler
  - Emergency fallback profile
- **PRGX**
  - Policy decision point (PDP)
  - Policy enforcement point (PEP)
  - Tamper-evident audit writer
- **Tachyon**
  - Ordered topic stream
  - Time-sync broadcaster
  - Jitter buffer controller
- **Edge Runtime**
  - Local compositor
  - Late-stage reprojection
  - Offline state cache
- **Manifest Runtime**
  - ATR-MF overlay renderer
  - Duality mode switcher
  - Device abstraction driver

### 2.4 Dataflow / Controlflow

#### Flow A: Voice/Intent → Output
1. User utterance → Intent Gateway (`intent.received`)
2. Validate + normalize → `Intent Contract vX`
3. Genesis สร้าง `Visual Plan + Scene Graph + Capability Demands`
4. Manifest Registry resolve visual contract + scene contract
5. Governor evaluate environmental constraints
6. PRGX enforce content/abuse/access policies
7. Tachyon publish `render.command` + `predicted_display_time`
8. Edge Runtime compose final frame
9. Aetherium-Manifest render ไปยัง display target
10. Telemetry + audit (`intent_id`, `policy_decision_id`, `frame_window_id`)

#### Flow B: BioVision → Governor/PRGX → Manifest/Tachyon
1. Sensors/video feed → BioVision layer analysis
2. Emit `environment.state.delta` (fog/rain/lux/motion/occlusion)
3. Governor recompute safety envelope (brightness/frequency/curfew)
4. PRGX re-evaluate policy constraints (location/content context)
5. Manifest patch visual parameters (color gain, contrast, opacity, rate)
6. Tachyon stream incremental patch (`scene.patch`) to edge devices
7. Edge apply patch idempotently; if stale sequence → discard + request sync

### 2.5 ตารางสัญญาระหว่างโมดูล (Interface List)

| Interface | Input (ย่อ) | Output (ย่อ) | Guarantees | Failure Modes | Handling |
|---|---|---|---|---|---|
| `IntentIngress.v1` | `intent_id, actor_id, utterance, locale, ts` | `normalized_intent` | at-least-once ingest + idempotency key | duplicate submit, invalid schema | dedup by `intent_id`; 422 contract error |
| `GenesisPlan.v1` | `normalized_intent, context_refs` | `visual_plan, scene_graph, demands` | deterministic plan per `plan_seed` | missing context, planner timeout | fallback template + retry (exp. backoff) |
| `VisualContract.Resolve.v1` | `manifest_id, device_caps` | `render_profile, shader_pack` | backward-compatible minor version | incompatible contract | compatibility downgrade / reject |
| `BioVision.EnvState.v1` | `sensor_frame/meta` | `env_delta, confidence, motion_vec` | ordered per source clock | camera jitter, low confidence | confidence gating + smoothing |
| `Governor.Evaluate.v1` | `plan + env_delta + geo/time` | `safety_envelope` | hard safety upper bounds | policy service unavailable | fail-closed to safe preset |
| `PRGX.AuthorizeRender.v1` | `actor, content_hash, geo, schedule` | `allow/deny + obligations` | deny-by-default + audit required | PDP timeout, policy conflict | deny + emit security incident |
| `Tachyon.RenderStream.v1` | `render_cmd, seq, predicted_display_time` | device-delivered frame events | per-partition ordering, bounded jitter | packet loss, reordering | FEC/retry window + seq repair |
| `Edge.ApplyPatch.v1` | `scene_patch, seq, idempotency_key` | `ack, applied_seq` | idempotent patch apply | stale patch, cache miss | request snapshot + resync |
| `Audit.Event.v1` | domain events | immutable audit record | append-only, hash-chained | storage lag | local queue + eventual flush |

---

## 3) Latency Budget & Benchmark Plan

### 3.1 Latency Budget (P95 target)

#### โหมด VR/AR (motion-to-light)
- Capture (sensor + pose): **4 ms**
- Infer (BioVision + intent context): **8 ms**
- Compose (Genesis patch + local compositor): **6 ms**
- Transport (Tachyon edge leg): **5 ms**
- Render/Reprojection: **7 ms**
- **รวม P95: 30 ms** (Stretch goal P95 ≤ 24 ms, P99 ≤ 40 ms)

#### โหมดโปรเจคเตอร์/ตึก (motion-to-projection)
- Capture environmental sampling: **10 ms**
- Infer semantic layers: **20 ms**
- Compose scene adaptation: **15 ms**
- Transport to edge box/projector: **20 ms**
- Projector pipeline/display persistence: **25 ms**
- **รวม P95: 90 ms** (Target perceptual sync <100 ms)

#### Tachyon network budget
- End-to-end stream publish→edge receive: **P95 ≤ 20 ms**
- Jitter budget: **P95 ≤ 8 ms**, **P99 ≤ 15 ms**
- Packet recovery window: **≤ 30 ms**

### 3.2 วิธีวัด (Reproducible)

**Clock/Time discipline**
- ทุก node ใช้ monotonic clock + periodic sync
- ใส่ `t_capture`, `t_plan`, `t_policy`, `t_send`, `t_edge_recv`, `t_display_pred`, `t_display_actual`

**Benchmark suites ขั้นต่ำ**
1. `bench_intent_to_light.py` — synthetic intent burst (1x, 10x, 100x)
2. `bench_biovision_patch.py` — motion/occlusion scenarios
3. `bench_tachyon_stream.go` — throughput, jitter, reordering, packet loss profiles
4. `bench_edge_reconcile.ts` — reconnect + state reconciliation performance
5. `bench_end_to_end_replay.py` — deterministic replay drift score

**Acceptance metrics**
- Budget pass rate ≥ 95% ต่อ scenario
- Frame miss ratio < 1% (VR/AR), < 2% (projection)
- Reconciliation success < 2 วินาที หลัง reconnect

---

## 4) Reliability + Safety + Governance

### 4.1 Reliability Plan

**Idempotency / Ordering / Retry**
- ทุกคำสั่งสำคัญต้องมี `idempotency_key` และ `sequence_no`
- Retry strategy: exponential backoff with jitter (100ms → 200ms → 400ms, max 2s)
- Timeout defaults:
  - PRGX decision: 80ms
  - Governor evaluate: 50ms
  - Edge ack: 120ms

**Offline/Restore/Reconciliation**
- Edge เก็บ `last_known_scene_snapshot` + event delta log (bounded)
- เมื่อ reconnect:
  1) ส่ง `applied_seq`
  2) server ตอบ diff หาก gap เล็ก, snapshot หาก gap ใหญ่
  3) verify checksum ก่อน apply
- Conflict policy: authoritative state = Governor/PRGX-approved server state

**Observability Requirements (ขั้นต่ำ)**
- Logs: structured JSON, correlation ids (`intent_id`, `trace_id`, `device_id`)
- Metrics:
  - latency per stage
  - policy deny rate
  - frame drop / jitter / patch staleness
  - reconnect count + reconcile duration
- Traces: distributed tracing ครอบคลุม ingress→render
- Replay artifacts: เก็บ policy snapshot hash + manifest version + env stream slice

### 4.2 Safety & Governance Plan

#### Governor Policy
- Brightness caps by zone + device class
- Curfew windows (เช่น 22:00–06:00 ลด intensity หรือ disable public effects)
- Geo-fencing: ห้าม render ในพื้นที่ต้องห้าม (โรงพยาบาล, เขตจราจรเสี่ยง)
- Frequency controls: จำกัดการกระพริบ/transition rate ลดความเสี่ยงการรบกวน

#### PRGX Enforcement + Audit
- PDP/PEP แยกกันชัด (decision vs enforcement)
- Deny-by-default สำหรับ content ไม่ผ่าน policy
- Audit trail แบบ hash-chained, immutable retention ตามกฎหมายพื้นที่
- Emergency controls:
  - global kill switch
  - tenant-level suspension
  - device quarantining

#### แนวทาง “ฉายบนตึก” อย่างรับผิดชอบ
- Pre-approved content catalog สำหรับช่วง prime traffic
- Dynamic dimming ตามสภาพถนน/สภาพอากาศ/เวลาจริง
- Community disturbance guardrails:
  - max luminance ceilings
  - silent hours
  - incident hotline + auto rollback profile

### 4.3 Security / Abuse Prevention

**Threat model (ย่อ)**
- Attacker goals: takeover display, spread harmful/misleading light content, cause distraction/traffic hazard, exfiltrate behavioral data
- Misuse cases: unauthorized campaign injection, replay attacks, geo-fence bypass, malicious strobe patterns

**Mitigations**
- AuthN: OIDC + mTLS service-to-service
- AuthZ: RBAC + ABAC (user/operator/org scope)
- Signed commands + nonce + expiry
- Content safety classifier before PRGX allow
- Rate limit + anomaly detection + device attestation on edge

---

## 5) Roadmap 4 เฟส (6–12 เดือน)

> สมมติฐานเวลาเริ่ม: Q2/2026 และเน้นลด blast radius ด้วย staged rollout

### P0 — PoC (เดือน 1–2)
**Deliverables**
- Contract set `Intent/Visual/Scene v1`
- Intent→Genesis→Manifest→Edge demo (single site)
- Baseline Tachyon latency harness

**Risks**
- Contract churn สูง
- device capability variance

**Exit Criteria**
- E2E flow ผ่านครบพร้อม audit log
- P95 intent-to-light ผ่าน baseline (VR ≤ 45ms, projection ≤ 140ms)

**Metrics**
- schema validation pass rate ≥ 99%
- deterministic replay success ≥ 95%

### P1 — Limited Prototype (เดือน 3–5)
**Deliverables**
- BioVision semantic layering + env delta loop
- Governor v1 (brightness/curfew/geo)
- PRGX v1 policy enforcement + incident pipeline

**Risks**
- false positive policy deny
- unstable lighting adaptation in dynamic scenes

**Exit Criteria**
- public-safe profile ใช้งานได้ในพื้นที่จำกัด
- reconnect reconcile < 2s P95

**Metrics**
- policy decision latency P95 < 80ms
- frame drop < 3% (projection testbed)

### P2 — Pilot (เดือน 6–9)
**Deliverables**
- Inspira-Firma Duality (OS-native + Light-native switch)
- Multi-device deployment (mobile + projector + AR glass)
- enterprise ops console + audit reporting

**Risks**
- cross-platform inconsistency
- compliance requirements ต่างเขต

**Exit Criteria**
- 3 use cases (U1/U2/U3) ผ่าน UAT
- zero critical safety incident ใน pilot window

**Metrics**
- user task success (U1) ≥ 90%
- developer portability success (U2) ≥ 85%
- campaign uptime (U3) ≥ 99.5%

### P3 — Production Hardening & Scale (เดือน 10–12)
**Deliverables**
- autoscaling Tachyon clusters + regional failover
- PRGX policy lifecycle (versioned rollout/canary/rollback)
- SLO dashboards + runbooks + gameday certification

**Risks**
- scaling-induced jitter
- operational complexity

**Exit Criteria**
- SLO pass 30 วันต่อเนื่อง
- compliance + safety sign-off พร้อม production change board approval

**Metrics**
- Tachyon jitter P95 ≤ 8ms
- MTTR < 15 นาที สำหรับ Sev-1 display incident
- audit completeness = 100%

---

## 6) ข้อมูลที่ยังไม่รู้ + Assumptions

### Unknowns
1. กรอบกฎหมายเฉพาะพื้นที่สำหรับการฉายแสงบนพื้นที่สาธารณะ
2. รายละเอียด hardware matrix ของโปรเจคเตอร์/แว่นที่ต้องรองรับจริง
3. งบประมาณ cloud/edge ต่อภูมิภาคและข้อจำกัดต้นทุนต่อเฟรม
4. ความพร้อมของ data privacy agreements สำหรับ sensor feeds
5. baseline traffic pattern ที่ต้องรองรับใน peak campaigns

### Assumptions ที่ใช้ตัดสินใจ
1. สามารถบังคับใช้ monotonic timestamp และ sequence control ได้ทุกโมดูล
2. มี IdP กลางรองรับ OIDC สำหรับ org/operator/user
3. Edge device สามารถเก็บ snapshot cache อย่างน้อย 30–60 วินาที
4. ทีมยอมรับแนวทาง fail-closed เมื่อ Governor/PRGX ไม่พร้อมใช้งาน
5. Phase rollout อนุญาตให้เริ่มจาก geofenced pilot ก่อน public-scale

---

## 7) สรุปเชิงสถาปัตยกรรม

การทำให้ “แสงเป็น connector” สำเร็จในระดับโปรดักชันไม่ใช่เรื่อง renderer อย่างเดียว แต่ต้องมี **contract discipline + realtime determinism + safety governance** เป็นแกนร่วมของทั้ง 6 repositories. แผนนี้จงใจจัดลำดับให้เริ่มจาก ABI/Policy/Observability ก่อนเพิ่ม capability ขั้นสูง เพื่อให้ระบบขยายตัวได้โดยควบคุมความเสี่ยง, ตรวจสอบย้อนหลังได้, และพร้อมต่อการใช้งานในสภาพแวดล้อมจริงที่มีข้อกำกับดูแลสูง.
