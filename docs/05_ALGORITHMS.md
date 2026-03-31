# 05 — Algorithms

## 1) Negative Latency (Run-Ahead)
1. intercept input ที่ ingress
2. IPW สร้าง top-k predictions
3. spawn ghost workers ตาม k
4. เขียนผลล่วงหน้าลง future buffers
5. เมื่อ input จริงมาถึง:
   - match: pointer swap
   - mismatch: rollback/discard แล้ว execute normal path

## 2) Intent Probability Waves (IPW)
- โมเดลคาดการณ์แบบ distribution ไม่ใช่คำตอบเดียว
- wave collapse เมื่อ confidence เกิน threshold

## 3) Deterministic State Synchronization
- shared seed สำหรับ PRNG
- lockstep ticks ให้ผลเหมือนกันข้ามโหนดเมื่อ input เหมือนกัน

## 4) CRDT Merge (OR-Set)
- merge concurrent updates แบบ deterministic
- broadcast เฉพาะ delta เพื่อลดภาระเครือข่าย

## Contract Note
Algorithm ในเอกสารนี้คือ **behavior contract** ไม่ใช่ optional optimization
