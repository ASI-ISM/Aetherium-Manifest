# Appendix C — Roadmap

## Phase 1: Simulation
- ทดสอบ pyverbs/RDMA path ใน environment จำลอง
- validate ghost actions ใน high-latency simulation

## Phase 2: Unikernel Porting
- refactor dependencies ให้รองรับ Unikraft
- target worker boot time < 10ms

## Phase 3: Hardware Integration
- ทดสอบบนระบบที่รองรับ NVLink + RoCE v2
- ตรวจสอบ optical switching path

## Phase 4: Live Deployment
- rollout Tachyon protocol แบบ feature flag
- เปิด negative latency เฉพาะ client ที่รองรับ

## Not Yet (ควรเลี่ยงในระยะนี้)
- over-optimize GPU kernels ก่อน lock behavior
- bypass observability เพื่อไล่ตัวเลข latency อย่างเดียว
