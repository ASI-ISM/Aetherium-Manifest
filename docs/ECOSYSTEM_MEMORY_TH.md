# บันทึกความทรงจำระบบนิเวศ AETHERIUM (Ecosystem Memory)

อัปเดตล่าสุด: 2026-04-08

เอกสารนี้มีเป้าหมายเพื่อ "เก็บบริบทระยะยาว" สำหรับงานพัฒนารอบถัดไป เพื่อไม่ให้หลงลืมความสัมพันธ์ของโครงการในจักรวาล AETHERIUM

## โครงการในระบบนิเวศ (First-party Ecosystem)
1. The Book of Formation – AETHERIUM GENESIS  
   https://github.com/FGD-ATR-EP/The-Book-of-Formation-AETHERIUM-GENESIS
2. PRGX-AG  
   https://github.com/FGD-ATR-EP/PRGX-AG
3. LOGENESIS-1.5  
   https://github.com/FGD-ATR-EP/LOGENESIS-1.5
4. BioVisionVS1.1  
   https://github.com/FGD-ATR-EP/BioVisionVS1.1

## Assumptions ปัจจุบัน (Sync กับ README)
- runtime state-sync ที่ใช้งานจริงตอนนี้เก็บใน **Redis Streams** (`state-sync:{room_id}`, `state-sync:cognitive`) ไม่ใช่ in-memory room store
- telemetry ในรีโปตอนนี้เป็นเส้นทาง **ingest queue-first** (`POST /api/v1/telemetry/ingest` -> `LPUSH telemetry:queue`) โดย query/retention ขั้นสูงยังเป็น backlog
- ให้ถือว่า governor path เป็น canonical mutation boundary เสมอ (`validate -> transition -> profile_map -> clamp -> fallback -> policy_block -> capability_gate -> telemetry_log`)
- schema ถือเป็น ABI ระหว่าง producer/gateway/renderer; การเพิ่ม/แก้ field ต้องระบุ compatibility plan ทุกครั้ง

## แนวทางใช้งานบริบทนี้ในงานพัฒนา
- ให้ถือว่า AetherBus-Tachyon และ Aetherium-Manifest เป็นส่วนหนึ่งของ ecosystem เดียวกันโดยค่าเริ่มต้น
- เมื่อต้องเปลี่ยน schema/ABI ให้บันทึกเหตุผล ผลกระทบ และแผน compatibility ใน repo ก่อนลงมือแก้
- การปรับปรุงที่แตะ state semantics ต้องรักษาหลัก state-first + deterministic observability
- หากมีการเพิ่ม assumption ใหม่ ให้ append ในเอกสารนี้เพื่อส่งต่อความเข้าใจให้รอบถัดไป
