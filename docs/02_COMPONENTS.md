# 02 — Components

## AetherBus (Tachyon Upgrade)
**Responsibility**
- รับส่ง envelope + state deltas ด้วย latency ต่ำมาก
- รองรับ RDMA data plane, DPDK control plane, XDP ingress filtering

**Non-Negotiable**
- speculative output ห้ามเขียนลง canonical state โดยตรง

## Logenesis Engine
**Responsibility**
- cognitive orchestration และ policy enforcement
- สร้าง/ประมวลผล intent vectors + Akashic envelopes

**Non-Negotiable**
- ต้องบังคับใช้ Manifestation Gate และ Goal-Lock

## IPW Model
**Responsibility**
- คาดการณ์ top-k actions จากสัญญาณเจตจำนง

**Non-Negotiable**
- confidence ต้อง traceable และอธิบายได้

## Ghost Workers
**Responsibility**
- speculative execution ใน future buffers

**Non-Negotiable**
- rollback ต้อง deterministic และ cheap

## GunUI / Digisonic UI
**Responsibility**
- แสดง state ด้วยแสงอย่างซื่อสัตย์
- ทำ ghost actions เป็น soft guardrails

**Non-Negotiable**
- ห้าม visual spam และห้ามแสงขัดกับ state จริง

## Runtime GPU Simulation Module (`runtime/gpu-sim/`)
**Responsibility**
- แยก simulation execution backend ออกจาก `AetheriumKernel`
- รับ IR/LCL เดิมผ่าน adapter แล้ว map เป็น GPU uniforms
- dispatch pass chain แบบ deterministic: `Reset → Count → PrefixSum → Scatter → Integrate → Render → Swap`

**Fallback Policy**
- ถ้า `navigator.gpu` พร้อมใช้งาน: kernel ใช้ `GpuSimulationEngine`
- ถ้าไม่พร้อมใช้งาน: kernel ใช้ path เดิม CPU/WebGL ทันที (ไม่มี ABI change ต่อ LCL/IR)

**Non-Negotiable**
- contract ของ LCL/IR เดิมต้องคงรูป
- adapter layer เท่านั้นที่แปลงค่าไปยัง GPU uniforms
