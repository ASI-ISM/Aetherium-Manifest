# 00 — Purpose and Scope

## Purpose
โครงการนี้มีเป้าหมายเพื่อลดแรงเสียดทานเชิงเวลาในระบบเอเจนต์หลายตัว โดยยกระดับจาก reactive stack ไปสู่ predictive distributed intelligence:
- ลด latency/desync ใน multi-agent reasoning
- เปลี่ยนจาก command-response เป็น intent-manifestation
- ทำให้ผู้ใช้รับรู้ว่า latency ใกล้ศูนย์

## Product Re-definition (April 11, 2026)
Aetherium Manifest ถูกนิยามใหม่เป็น **Aetherium = Light-native Creative OS** โดยผู้ใช้ไม่ได้สั่ง "เอฟเฟกต์" แต่ "คุยกับแสง" เพื่อสร้างงาน เช่น:

- poster
- brand visual
- UI concept
- diagram
- ambient scene
- concept art
- motion identity
- document visual

พร้อมคงบุคลิกเดิมของระบบไว้: **ร่างกายของแสงเต็มจอ + composer ด้านล่าง** (standby light, touch burst, fade, tilt sensor)

## Scope

### In-Scope
- Tachyon upgrade ของ AetherBus
- Data plane / control plane architecture
- AkashicEnvelope V2
- IPW + Ghost workers + commit/rollback
- Deterministic synchronization + CRDT delta merge
- GunUI ghost actions + Manifestation Gate

### Out-of-Scope (ระยะปัจจุบัน)
- production-grade driver level implementation
- hardware procurement/certification
- biometric จริงใน early phase
- deep GPU kernel optimization

## Architectural Position
- **Tachyon = infrastructure layer**
- **GunUI/Aetherium Manifest = embodiment layer**
