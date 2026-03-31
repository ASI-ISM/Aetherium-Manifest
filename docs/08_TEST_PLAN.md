# 08 — Test Plan

## 1) Functional
- IPW predicts top-k and triggers ghost workers
- match path: pointer swap และ perceived latency ลดลง
- mismatch path: rollback/discard/fallback ถูกต้อง
- Envelope V2 parse + validate ฟิลด์ครบ

## 2) Determinism
- shared seed + lockstep ให้ผลเท่ากันข้ามโหนด
- OR-Set merge ได้ final state เดียวกัน
- PRNG drift ถูกตรวจจับและรายงาน

## 3) Performance
- benchmark baseline TCP/Redis เทียบ Tachyon path
- RDMA RTT/jitter/throughput
- worker spawn time ตามงบ (<10ms target)

## 4) Safety
- ghost path ห้าม commit โดยไม่มี confirmation
- rollback correctness ภายใต้ mismatch หนัก
- malformed envelope / replay / invalid rkey tests

## 5) GunUI Experience
- Gate ปิดแล้วต้องไม่เกิด visual spam
- certainty ต่ำต้องสะท้อน turbulence ที่สูงขึ้นตาม contract
