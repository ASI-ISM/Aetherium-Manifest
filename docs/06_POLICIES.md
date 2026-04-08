# 06 — Policies

## UX / Product Policies
- Light is Language: ทุก visual output ต้องมี semantic meaning
- State before Feature: เพิ่มฟีเจอร์ได้แต่ห้ามข้าม state discipline
- No click-centric dependency สำหรับ core experience

## Manifestation Gate Rules
- CHAT low-energy: ปกติไม่ manifest
- CHAT high emotional/turbulence: อนุญาต manifest
- COMMAND/REQUEST/ERROR: ต้อง manifest ได้เสมอ

## Predictive Execution Rules
- ห้าม side-effect กับระบบภายนอกก่อน collapse
- ghost workers เขียนเฉพาะ future buffer
- rollback path ต้อง deterministic, observable, low-cost

## Networking/Runtime Policy
- kernel bypass ต้องมาพร้อม observability
- ใช้ eBPF/XDP เป็นชั้นกรองก่อน full bypass เมื่อเหมาะสม
