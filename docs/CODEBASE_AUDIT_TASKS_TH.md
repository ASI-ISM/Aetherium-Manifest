# Codebase Audit: ข้อเสนอแผนงานแก้ไข (Thai)

อัปเดตการตรวจสอบล่าสุด: 2026-04-13

เอกสารนี้สรุปผลการตรวจสอบโค้ดล่าสุด และเสนอ "งานแก้ไข" จำนวน 4 งานตามหมวดที่ร้องขอ (พิมพ์ผิด, บั๊ก, คอมเมนต์/เอกสารคลาดเคลื่อน, การทดสอบ)

## 1) งานแก้ไขข้อความพิมพ์ผิด (Typo Fix)

**ปัญหาที่พบ**
- ใน `api_gateway/README.md` หัวข้อการรัน Production ใช้คำว่า `Environment Variable` (เอกพจน์)
- ข้อความบรรทัดเดียวกันอธิบายถึงการตั้งค่า API key หลายตัวแปร จึงควรใช้พหูพจน์เพื่อให้ภาษาตรงความหมาย

**งานที่เสนอ**
- แก้คำเป็น `Environment Variables` และไล่ตรวจคำศัพท์เทคนิคชุดเดียวกันให้ใช้รูปแบบมาตรฐานเดียวกันทั้งไฟล์

**เกณฑ์ยอมรับ (Acceptance Criteria)**
- ไม่มีคำ `Environment Variable` เหลือในบริบทที่กล่าวถึงหลายตัวแปร
- README ใช้ถ้อยคำสอดคล้องกันทั้งเอกสาร

---

## 2) งานแก้ไขบั๊ก (Bug Fix)

**ปัญหาที่พบ**
- ฟังก์ชัน `_ensure_api_key` ใน `api_gateway/main.py` ตรวจ `X-API-Key` เทียบค่า expected เฉพาะกรณีที่มีการตั้ง `AETHERIUM_API_KEY`
- หาก deploy โดยไม่ได้ตั้ง `AETHERIUM_API_KEY` จะเกิดพฤติกรรม fail-open โดยคำขอที่ส่ง key ใดก็ผ่านขั้นตอน compare ได้

**งานที่เสนอ**
- เปลี่ยนเป็น fail-closed:
  1. ถ้าไม่มี `AETHERIUM_API_KEY` ให้ตอบ `500` พร้อมข้อความ misconfiguration ที่ชัดเจน
  2. เพิ่ม startup guard เพื่อ log/raise เมื่อ secret สำคัญยังไม่ถูกตั้งใน environment production

**เกณฑ์ยอมรับ (Acceptance Criteria)**
- เมื่อไม่ตั้ง `AETHERIUM_API_KEY` endpoint ที่ป้องกันต้องไม่ยอมรับคำขอ
- มี log ข้อผิดพลาดด้าน configuration ชัดเจนตั้งแต่ startup

---

## 3) งานแก้ไขคอมเมนต์/ความคลาดเคลื่อนเอกสาร (Comment/Docs Discrepancy)

**ปัญหาที่พบ**
- `api_gateway/README.md` ระบุ `WS /ws/cognitive-stream`
- แต่ใน `api_gateway/main.py` ไม่มี websocket route ดังกล่าว

**งานที่เสนอ**
- ทำ source of truth ให้สอดคล้องกันโดยเลือกหนึ่งแนวทาง:
  - เพิ่ม route `/ws/cognitive-stream` ให้ใช้งานได้จริงในโค้ด, หรือ
  - ปรับ README ให้ย้าย endpoint นี้ไปส่วน roadmap/experimental พร้อมระบุว่า route ปัจจุบันที่รองรับจริงคืออะไร

**เกณฑ์ยอมรับ (Acceptance Criteria)**
- endpoint ที่ระบุใน README ตรงกับ route ที่เปิดใช้งานจริง 100%
- reviewer อ่าน README แล้วสามารถเรียก endpoint ได้จริงตามเอกสาร

---

## 4) งานปรับปรุงการทดสอบ (Test Improvement)

**ปัญหาที่พบ**
- `api_gateway/test_api.py` ยังไม่มี regression test ที่ lock พฤติกรรมกรณี `AETHERIUM_API_KEY` ไม่ถูกตั้ง
- ยังไม่มีเคสที่ยืนยันว่า key ไม่ตรงต้องได้ `403` เมื่อเปิดใช้งาน auth

**งานที่เสนอ**
- เพิ่ม auth regression tests สำหรับ endpoint ที่ป้องกัน (เช่น `/api/v1/cognitive/validate`) อย่างน้อย 2 เคส:
  1. ไม่ตั้ง `AETHERIUM_API_KEY` แล้วระบบต้อง fail-closed
  2. ตั้ง `AETHERIUM_API_KEY` แต่ส่ง `X-API-Key` ไม่ตรง ต้องได้ `403`

**เกณฑ์ยอมรับ (Acceptance Criteria)**
- ชุดทดสอบใหม่ล้มเหลวทันทีหากเกิดพฤติกรรม fail-open
- ครอบคลุมทั้ง misconfiguration และ invalid credential
