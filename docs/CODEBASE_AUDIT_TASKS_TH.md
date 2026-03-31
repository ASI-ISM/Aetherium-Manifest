# Codebase Audit: ข้อเสนอแผนงานแก้ไข (Thai)

เอกสารนี้สรุปผลการตรวจสอบโค้ดล่าสุด และเสนอ "งานแก้ไข" อย่างละ 1 งานตามหมวดที่ร้องขอ

## 1) งานแก้ไขข้อความพิมพ์ผิด (Typo Fix)

**ปัญหาที่พบ**
- ใน `api_gateway/README.md` มีประโยคภาษาอังกฤษพิมพ์ตกคำ:
  - `For an environment that closer resembles production, ...`
- วลี `that closer` ควรเป็น `that is closer`

**งานที่เสนอ**
- แก้เป็น:
  - `For an environment that is closer to production, use the provided shell script.`
- ตรวจทานทั้งไฟล์ README ภาษาอังกฤษ/ไทยแบบรอบเดียวเพื่อเก็บ typo ใกล้เคียงกัน

---

## 2) งานแก้ไขบั๊ก (Bug Fix)

**ปัญหาที่พบ**
- Runtime ใน `api_gateway/main.py` อ่าน Google key จาก `GEMINI_API_KEY`
- แต่สคริปต์รัน `api_gateway/start_cognitive_api.sh` ตรวจ `GOOGLE_API_KEY`
- ผลคือสคริปต์อาจผ่านเงื่อนไขได้ แต่ API เรียกใช้งานจริงล้มเหลวด้วย error `GEMINI_API_KEY is not set`

**งานที่เสนอ**
- ทำให้ชื่อ env สอดคล้องกันทั้งระบบ โดยเลือกใช้ `GEMINI_API_KEY` เป็นค่าหลัก
- เพิ่ม fallback ชั่วคราว (`GOOGLE_API_KEY` -> `GEMINI_API_KEY`) พร้อมข้อความ deprecation

---

## 3) งานแก้ไขคอมเมนต์/ความคลาดเคลื่อนของเอกสาร (Comment/Docs Discrepancy)

**ปัญหาที่พบ**
- ใน `api_gateway/test_api.py` มีคอมเมนต์ว่า TestClient ตั้ง header ให้ websocket ไม่ได้:
  - `TestClient doesn't directly support setting headers for websockets.`
- แต่ FastAPI/Starlette `websocket_connect` รองรับการส่ง header ได้ และเทสต์ `test_websocket_stream_with_header_key` ถูกปล่อยเป็น `pass`

**งานที่เสนอ**
- อัปเดตคอมเมนต์ให้ตรงพฤติกรรม framework ปัจจุบัน
- แทนที่ `pass` ด้วยเทสต์จริงที่ส่ง `X-API-Key` ผ่าน header และ assert ว่า websocket รับข้อความได้

---

## 4) งานปรับปรุงการทดสอบ (Test Improvement)

**ปัญหาที่พบ**
- ปัจจุบันมีเทสต์กรณี unsupported model (`unknown-model`) แต่ยังไม่มีเทสต์กรณี provider ถูกต้องแต่ key ขาด
- เส้นทางนี้สำคัญเพราะผูกกับ config production โดยตรง

**งานที่เสนอ**
- เพิ่มเทสต์สำหรับ `POST /api/v1/cognitive/generate` เมื่อใช้โมเดล Google (`gemini-pro`) แล้วไม่มี `GEMINI_API_KEY`
- Assert สถานะ `500` และข้อความ `GEMINI_API_KEY is not set`
- เสริมอีกเคสหนึ่งสำหรับ OpenAI ที่ไม่มี `OPENAI_API_KEY` เพื่อให้ครอบคลุมทั้งสอง provider หลัก
