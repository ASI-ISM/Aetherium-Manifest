# 07 — Safety and Governance

## Governance Hierarchy
1. Goal-Lock / Constitution
2. Canonical docs
3. Implementation details

หากขัดกัน ให้ยึดระดับบนเสมอ

## Predictive Safety
- ghost action ไม่ใช่ commit
- canonical commit ต้องหลัง user-confirmed collapse
- mismatch ต้อง rollback ได้ทันทีและตรวจสอบย้อนหลังได้

## Determinism Safety
- sync drift detection เป็น mandatory
- หากพบ drift ให้ degrade ไป safe mode path

## Security
- จัดการ RDMA `rkey` ตาม least privilege
- secure channel สำหรับ seed distribution
- ลด attack surface ด้วย minimal runtime footprint

## Privacy
- intent vectors/embeddings เป็น sensitive metadata
- ต้องรองรับ data minimization และ designed forgetting

## Governor Boundary for GPU Simulation

เพื่อคงหลักการว่า Governor เป็น canonical control boundary การจำลองฝั่ง GPU ต้องผ่าน policy checks ก่อน allocate/dispatch เสมอ:

- ตรวจ `numParticles`, `gridCols*gridRows`, และ `estimated VRAM bytes` เทียบกับ budget policy.
- หากเกิน budget ให้ reject frame (deny-by-default) หรือ clamp ตาม policy ที่กำหนด.
- integrate path ต้องจำกัด `dt <= 0.0166667`, ใช้ damping (`vel *= damping`), และ clamp magnitude ด้วย `vmax`.
- ต้องมี NaN/Inf guard; หาก state ผิดปกติให้ reset particle/state ทันที.

Telemetry runtime counters ที่ต้องบันทึก:

- `rejected_frames_by_budget`
- `nan_resets`
- `clamped_particles`
