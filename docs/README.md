# AETHERBUS TACHYON + AETHERIUM-GENESIS Canonical Docs

เอกสารชุดนี้เป็น **Canonical Source of Truth** สำหรับสถาปัตยกรรม Aetherium Manifest ในแกน
- AETHERBUS TACHYON (infrastructure)
- AETHERIUM-GENESIS / GunUI (embodiment + cognition)

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
- `ops/` — production operations package (dashboards, alerts, runbooks, security/privacy checks)
- `schemas/` — versioned ABI JSON
- `appendices/` — glossary, state machine, roadmap

## Versioning Rules
1. เปลี่ยน schema ต้องทำแบบ version-aware และ review
2. ห้ามแก้ behavior ที่ขัดกับ Goal-Lock / Constitution
3. หาก implementation conflict กับ Canon ให้ถือ Canon เป็นหลัก
