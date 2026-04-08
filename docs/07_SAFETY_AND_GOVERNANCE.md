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
