# Codebase Audit: ข้อเสนอแผนงานแก้ไข (Thai)

อัปเดตการตรวจสอบล่าสุด: 2026-04-11

เอกสารนี้สรุปผลการตรวจสอบโค้ด และเสนอ "งานแก้ไข" อย่างละ 1 งานตามหมวดที่ร้องขอ

## 1) งานแก้ไขข้อความพิมพ์ผิด (Typo Fix)

**ปัญหาที่พบ**
- ใน `api_gateway/README.md` มีข้อความไทยสะกดไม่สม่ำเสมอ: `Environment Variable` ถูกใช้ในบริบทพหูพจน์
- ข้อความแนะนำระบุว่า "ตรวจสอบและตั้งค่า Environment Variable ที่จำเป็น" แต่พูดถึงหลายตัวแปร (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`)

**งานที่เสนอ**
- ปรับข้อความเป็น `Environment Variables` เพื่อให้ไวยากรณ์และความหมายถูกต้อง
- เก็บรวบรวมคำที่สะกด/รูปแบบไม่สม่ำเสมอใน README (เช่น Environment Variables, API Key/API-Key) แล้วปรับให้เป็นรูปแบบเดียวกันทั้งไฟล์

---

## 2) งานแก้ไขบั๊ก (Bug Fix)

**ปัญหาที่พบ**
- ฟังก์ชัน `_ensure_api_key` ใน `api_gateway/main.py` จะตรวจความถูกต้องของ `X-API-Key` ก็ต่อเมื่อมีการตั้ง `AETHERIUM_API_KEY` เท่านั้น
- ถ้า deploy แล้วลืมตั้ง `AETHERIUM_API_KEY` ระบบจะยอมรับ header ใดก็ได้ทันที (เช่น `X-API-Key: anything`)
- พฤติกรรมนี้เป็นช่องโหว่เชิง config ที่ทำให้ endpoint ที่ควรป้องกันสิทธิ์ถูกเรียกได้โดยไม่ได้ยืนยันตัวตนจริง

**งานที่เสนอ**
- เปลี่ยนเป็น fail-closed: ถ้าไม่มี AETHERIUM_API_KEY ให้ตอบ 500 พร้อมข้อความแจ้งเตือนการตั้งค่าไม่สมบูรณ์
- เพิ่ม startup check ให้ปฏิเสธการเปิด service เมื่อ key บังคับยังไม่ถูกตั้ง
- ระบุ runbook ชัดเจนใน README ว่า `AETHERIUM_API_KEY` เป็น required secret ในทุก environment ที่เปิดใช้งาน auth

---

## 3) งานแก้ไขคอมเมนต์ในโค้ด/ความคลาดเคลื่อนของเอกสาร (Comment/Docs Discrepancy)

**ปัญหาที่พบ**
- เอกสาร `api_gateway/README.md` ระบุ endpoint `WS /ws/cognitive-stream`
- แต่ในโค้ด API gateway ปัจจุบัน (ไฟล์ `api_gateway/main.py`) ไม่มีการประกาศ websocket route ดังกล่าว
- ทำให้เอกสารสัญญาว่ามี endpoint ที่ผู้ใช้เรียกจริงไม่ได้

**งานที่เสนอ**
- เลือกหนึ่งแนวทางแล้วทำให้ตรงกัน:
  1. เพิ่ม websocket route `/ws/cognitive-stream` ให้ทำงานจริงใน `api_gateway/main.py`, หรือ
  2. ปรับ README ให้สะท้อนสถานะปัจจุบัน (เช่นย้ายเป็น roadmap/experimental)
- เพิ่มส่วน "Source of truth" ใน README ว่า route ที่รองรับจริงให้ดูจากไฟล์ใด

---

## 4) งานปรับปรุงการทดสอบ (Test Improvement)

**ปัญหาที่พบ**
- ใน `api_gateway/test_api.py` ยังไม่มีเทสต์ที่ยืนยันพฤติกรรม "ต้องปิดบริการเมื่อ `AETHERIUM_API_KEY` ไม่ถูกตั้ง"
- จึงยังไม่มี guard test ป้องกัน regression หากมีการแก้ `_ensure_api_key` ในอนาคต

**งานที่เสนอ**
- เพิ่มเทสต์สำหรับ endpoint ที่ require auth (เช่น `POST /api/v1/cognitive/validate`) โดยเคลียร์ env `AETHERIUM_API_KEY` แล้ว assert ว่าระบบ fail-closed ตามดีไซน์ใหม่
- เพิ่มอีกเคสว่าเมื่อ `AETHERIUM_API_KEY` ถูกตั้งและ `X-API-Key` ไม่ตรงกัน ต้องได้ `403`
- แยก fixture สำหรับ config security เพื่อให้เทสต์ auth อ่านง่ายและบำรุงรักษาง่ายขึ้น
