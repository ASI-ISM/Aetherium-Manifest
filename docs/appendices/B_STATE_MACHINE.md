# Appendix B — State Machine (Light-Centric)

## Canonical States

### Core cognition states
1. `IDLE` — แสงสงบ คงที่ ใช้เมื่อไม่มีงาน active หรือกำลังคืนค่า baseline
2. `LISTENING` — แสงรับสัญญาณ การเต้นช้าและชัดเพื่อบอกว่าระบบกำลัง ingest input
3. `GENERATING` — กำลังสร้าง candidate output / form synthesis หลัก
4. `THINKING` — reasoning loop, มี turbulence และการรวมตัวของอนุภาคเพื่อแสดงการประมวลผล
5. `CONFIRMING` — ตรวจสอบผลลัพธ์/guard/override ก่อน commit ไป renderer
6. `RESPONDING` — การแผ่รูปทรงหลัก/จังหวะตอบสนองที่พร้อมส่งออกให้ผู้ใช้เห็น
7. `WARNING` — ระบบยังทำงานได้แต่กำลัง degraded, throttled, หรือโดน policy clamp
8. `ERROR` — fault / containment / hard stop path ที่ต้องเน้นการรับรู้ความผิดพลาด
9. `STABILIZED` — หลังจากตอบสนองเสร็จแล้วกลับสู่ภาวะสมดุลที่ deterministic มากขึ้น
10. `NIRODHA` — minimal activity เพื่อประหยัดพลังงานและลด noise

### Capability / permission / sensor states
11. `SENSOR_PENDING_PERMISSION` — รอสิทธิ์ sensor หรือ motion permission ก่อนใช้ flow ที่อิงอุปกรณ์
12. `SENSOR_ACTIVE` — sensor พร้อมใช้งานและอนุญาตให้ใช้ flow แบบ motion-coupled
13. `SENSOR_UNAVAILABLE` — device ไม่มี sensor หรือ permission ถูกปฏิเสธ จึงต้อง fallback เป็น non-sensor behavior

## Transition Rules
การย้ายสถานะต้องอิง input/state จริงจาก contract ไม่ใช่ animation script ล้วน

### Required invariants
- ทุกคำสั่งจาก AI planner หรือ governor output MUST มี field `intent_state.state`
- การปรับ `density`, `velocity`, `turbulence`, `cohesion`, `flow`, `glow`, `flicker`, `palette` MUST อ้างอิง profile ของ state ปลายทางก่อนค่อย clamp ตาม capability/policy
- การ mutate พฤติกรรม renderer/runtime MUST เกิดผ่าน state transition path กลาง ไม่ใช่ heuristic กระจายหลายจุด
- ทุก transition MUST เขียน telemetry อย่างน้อย `state_entered_at`, `state_duration_ms`, `transition_reason`

### Canonical transitions
- `IDLE -> LISTENING` เมื่อ ingress ใหม่ถูกยอมรับ
- `LISTENING -> GENERATING` เมื่อเริ่มสร้าง candidate output
- `GENERATING -> THINKING` เมื่อเข้าสู่ reasoning / synthesis loop
- `THINKING -> CONFIRMING` เมื่อได้ draft ที่ต้องผ่าน governor, policy, หรือ QA gate
- `CONFIRMING -> RESPONDING` เมื่อ command ผ่าน guard และพร้อม emit
- `RESPONDING -> STABILIZED` เมื่อ emission จบและเข้าสู่ settle window
- `STABILIZED -> IDLE` เมื่อไม่มี active workload
- `* -> WARNING` เมื่อ low-power mode, policy clamp, หรือ degraded mode ถูกเปิด
- `* -> ERROR` เมื่อเกิด containment fault, hard rollback, หรือ unrecoverable failure
- `* -> SENSOR_PENDING_PERMISSION` เมื่อ flow ที่ต้องใช้ motion sensor ถูกขอแต่ permission ยังเป็น `prompt`
- `* -> SENSOR_UNAVAILABLE` เมื่อ sensor ไม่รองรับหรือ permission เป็น `denied`
- `SENSOR_PENDING_PERMISSION -> SENSOR_ACTIVE` เมื่อ permission กลายเป็น `granted`
- `SENSOR_ACTIVE -> CONFIRMING|RESPONDING` เมื่อ sensor-coupled command ผ่าน governor แล้ว
- `* -> NIRODHA` เมื่อระบบเข้าโหมดประหยัดพลังงาน/quiet mode เชิงตั้งใจ

## Transition Authority
- AI หรือ planner ระบุได้เฉพาะ `requested state`
- Runtime Governor เป็น authority กลางที่ยืนยัน `accepted state`
- Kernel / control handler ต้อง consume `accepted state` แล้วปรับพฤติกรรมตาม state profile เดียวกัน
- หาก capability หรือ policy บังคับเปลี่ยน state, `transition_reason` ต้องสะท้อนเหตุผลจริง เช่น `sensor_permission_denied`, `device_low_power_mode`, `containment:soft_clamp`
