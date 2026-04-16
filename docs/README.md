# AETHERBUS TACHYON + AETHERIUM-GENESIS Canonical Docs

เอกสารชุดนี้เป็น **Canonical Source of Truth** สำหรับสถาปัตยกรรม Aetherium Manifest ในแกน
- AETHERBUS TACHYON (infrastructure)
- AETHERIUM-GENESIS / 
Aetherium-Manifest UI (embodiment + cognition)

> หลักการสำคัญ: **เอกสาร = Canon / โค้ด = Implementation ที่ต้องเคารพ Canon**

## Design Philosophy
- UI ที่แท้จริงคือสิ่งที่ผู้ใช้ไม่เห็น (subsurface architecture)
- Light is Language
- State before Feature
- Predictive first, not reactive

## Document Map
- `00_PURPOSE_AND_SCOPE.md` — เป้าหมาย, ขอบเขต, in/out scope
- `01_SYSTEM_OVERVIEW.md` — ภาพรวมสถาปัตยกรรมและปัญหาที่แก้
- `02_COMPONENTS.md` — หน้าที่ของแต่ละองค์ประกอบ + non-negotiables
- `03_INTERFACES.md` — interface contracts และ boundaries
- `04_DATA_SCHEMAS.md` — อธิบาย schema และเหตุผลเชิงสถาปัตยกรรม
- `05_ALGORITHMS.md` — behavioral algorithms (run-ahead/IPW/CRDT)
- `06_POLICIES.md` — product/system policies (manifestation/predictive)
- `07_SAFETY_AND_GOVERNANCE.md` — governance, safety, privacy, security
- `08_TEST_PLAN.md` — test philosophy และ criteria
- `09_MAERI_LIFESTATE_GENUI_TH.md` — สถาปัตยกรรม MAE-RI, Emotional LifeState, Adaptive GenUI
- `10_AMUI_COLOR_SYSTEM.md` — Thermodynamic color subsystem, palette canon, state mapping, shader contract
- `11_PLATFORM_WORK_PLAN.md` — platform workstreams, backlog, rollout/rollback, and production DoD
- `12_FULL_STACK_INTEGRATION_REPORT_TH.md` — รายงานทางการเต็มรูปแบบสำหรับการเชื่อมต่อระบบภายในและภายนอก
- `CODEBASE_AUDIT_TASKS_EN.md` — pending-only audit backlog (English)
- `CODEBASE_AUDIT_TASKS_TH.md` — pending-only audit backlog (Thai)
- `14_AETH_LANGUAGE_BLUEPRINT.md` — implementation-oriented blueprint for AETH DSL (intent-first visual contract language), explicitly separated from current runtime reality
- `ops/` — production operations package (dashboards, alerts, runbooks, security/privacy checks)
  - `ops/websocket_scaling_1m_blueprint.md` — blueprint for scaling event-driven websocket/state-sync to 1M CCU (implementation-phased, non-claiming)
  - `ops/production_multi_region_architecture.md` — proposed AWS+Cloudflare multi-region production target with explicit separation between current-repo reality vs rollout plan
  - `ops/k8s/` — concrete Kubernetes manifests + autoscale + disruption-budget blueprint aligned to Governor-first constraints
  - `ops/k8s/helm-umbrella-chart.md` — Helm umbrella chart scope for core services + optional infra subcharts
  - `ops/messaging/nats/` and `ops/messaging/kafka/` — reference NATS JetStream and Kafka production bootstrap configs
- `schemas/` — versioned ABI JSON
- `appendices/` — glossary, state machine, roadmap

## Versioning Rules
1. เปลี่ยน schema ต้องทำแบบ version-aware และ review
2. ห้ามแก้ behavior ที่ขัดกับ Goal-Lock / Constitution
3. หาก implementation conflict กับ Canon ให้ถือ Canon เป็นหลัก
