# Codebase Audit (2026-04-29)

## เป้าหมายบริบท
- แนวทาง UX จากผู้ใช้: "หน้าใช้งานหลักเป็นแสงล้วน"
- เอกสารนี้สรุปงานที่ควรทำอย่างน้อย 4 งาน (อย่างละ 1):
  1) แก้ข้อความพิมพ์ผิด
  2) แก้บั๊ก
  3) แก้คอมเมนต์/ความคลาดเคลื่อนเอกสาร
  4) ปรับปรุงการทดสอบ

## 1) งานแก้ข้อความพิมพ์ผิด (Typo Fix)
**ปัญหา:** ใน `README.md` มีคำว่า `cace` ในหัวข้อที่ควรเป็น `cache` (build/runtime cache)

**ข้อเสนอแก้ไข:**
- แก้สะกด `cace` -> `cache` ใน README
- ตรวจซ้ำคำสะกดในเอกสารที่ user-facing ทั้งหมดใน `docs/` ด้วย spell-check stage (เช่น cspell/codespell)

**ผลลัพธ์ที่คาดหวัง:**
- ลดความกำกวมของเอกสารสำหรับผู้เริ่มต้นติดตั้งระบบ

## 2) งานแก้บั๊ก (Bug Fix)
**ปัญหา:** เอกสารระบุว่า node --test ใช้ไม่ได้เพราะ extensionless import ใน governor.ts และ ajv_validator.ts ซึ่งเป็นจุดเสี่ยงให้เกิด ESM resolution failure ในบาง runtime/tooling

**ข้อเสนอแก้ไข:**
- เปลี่ยน import ใน ajv_validator.ts และ governor.ts ให้ระบุส่วนขยายไฟล์ให้ชัดเจน (เช่น .ts หรือ .js)
- เพิ่ม smoke test ที่รันด้วย Node ESM mode เพื่อจับ regression นี้โดยตรง

**ผลลัพธ์ที่คาดหวัง:**
- ลดปัญหา test/runtime portability ระหว่าง tsx, node --test และเครื่องมือ CI อื่น

## 3) งานแก้คอมเมนต์/ความคลาดเคลื่อนเอกสาร (Comment/Docs Alignment)
**ปัญหา:** ลำดับ pipeline ที่ประกาศใน AGENTS.md ยังไม่สะท้อน stage `psycho_safety_gate` ซึ่งมีใช้งานจริงแล้วใน governor runtime

**ข้อเสนอแก้ไข:**
- อัปเดตเอกสาร architecture/pipeline ใน AGENTS.md และ README ให้มี stage ปัจจุบันครบถ้วน
- เพิ่มหมายเหตุ compatibility ว่าเป็น security/safety stage ที่ต้องไม่ถูกข้าม

**ผลลัพธ์ที่คาดหวัง:**
- ลดความเสี่ยงที่ contributor ทำงานตามเอกสารเก่าแล้วเกิด behavior drift

## 4) งานปรับปรุงการทดสอบ (Test Improvement)
**ปัญหา:** มี test parity สำหรับ psycho-safety ในฝั่ง TypeScript แล้ว แต่ยังขาด test เชิง UI behavior สำหรับแนวคิด “light-only landing” (เช่น state ของ panel ต่าง ๆ บน first render)

**ข้อเสนอแก้ไข:**
- เพิ่ม unit/integration test ที่ assert ว่า first-use surface เริ่มด้วย visual-only mode ตาม policy
- ตรวจร่วมกับ settings persistence ว่าเมื่อผู้ใช้เปิด panel แล้ว state ถูกจำและ restore ถูกต้อง

**ผลลัพธ์ที่คาดหวัง:**
- ป้องกัน regression ฝั่ง UX หน้าแรกและรองรับแนวทาง product ที่ชัดเจน
