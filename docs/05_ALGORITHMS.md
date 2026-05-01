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

## 5) GPU Pass Graph (Particle Runtime)
Pass graph สำหรับ backend ใหม่ (`runtime/gpu-sim/`):
1. **Reset** — clear transient counters/buffers ของ frame
2. **Count** — นับ occupancy/target bins จาก IR ปัจจุบัน
3. **PrefixSum** — scan counts เพื่อสร้าง deterministic offsets
4. **Scatter** — กระจาย photon/target data ลงตำแหน่งที่ scan กำหนด
5. **Integrate** — อัปเดต velocity/position/color ด้วย uniform controls
6. **Render** — เขียนผลลัพธ์ frame buffers สำหรับ draw stage
7. **Swap** — สลับ read/write buffers สำหรับ frame ถัดไป

### Fallback & Compatibility
- Backend selection อยู่ใน `AetheriumKernel`:
  - WebGPU available (`navigator.gpu`): ใช้ GPU pass graph
  - otherwise: fallback เป็น CPU/WebGL path เดิม
- LCL/IR contract ไม่เปลี่ยน; ใช้ adapter map เป็น uniforms (`coherence`, `velocity`, `turbulence`, `glowIntensity`, `flicker`, `targetCount`, `deltaTime`).
- fallback ต้อง behavior-compatible ในระดับ contract และไม่เปลี่ยน API ภายนอก.
