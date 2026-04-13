# Codebase Audit: ข้อเสนอแผนงานแก้ไข (Thai)

อัปเดตการตรวจสอบล่าสุด: 2026-04-13

เอกสารนี้สรุปผลการตรวจสอบโค้ดล่าสุด และเสนอ "งานแก้ไข" อย่างละ 1 งานตามหมวดที่ร้องขอ

## 1) งานแก้ไขข้อความพิมพ์ผิด (Typo Fix)

**ปัญหาที่พบ**
- ใน `api_gateway/README.md` ส่วนคำอธิบายการรัน Production ใช้คำว่า `Environment Variable` (เอกพจน์) แต่บริบทพูดถึงหลายตัวแปร
- เนื้อหาเดียวกันอ้างถึงการตั้งค่า API key หลายตัว ทำให้คำในเอกสารไม่สอดคล้องกับความหมายจริง

**งานที่เสนอ (1 งาน)**
- ปรับข้อความใน `api_gateway/README.md` จาก `Environment Variable` เป็น `Environment Variables` และตรวจทั้งไฟล์ให้ใช้รูปแบบเดียวกันสำหรับคำศัพท์เทคนิคชุดเดียวกัน

---

## 2) งานแก้ไขบั๊ก (Bug Fix)

**ปัญหาที่พบ**
- ฟังก์ชัน `_ensure_api_key` ใน `api_gateway/main.py` ตรวจว่า `X-API-Key` ตรงกับค่า expected เฉพาะกรณีที่ตั้ง `AETHERIUM_API_KEY` แล้วเท่านั้น
- หากระบบถูก deploy โดยไม่ได้ตั้ง `AETHERIUM_API_KEY` จะกลายเป็นพฤติกรรม fail-open (header ใดก็ผ่านการตรวจได้)

**งานที่เสนอ (1 งาน)**
- เปลี่ยนพฤติกรรมเป็น fail-closed: เมื่อไม่มี `AETHERIUM_API_KEY` ให้ตอบ `500` พร้อมข้อความ misconfiguration ชัดเจน และเพิ่ม startup guard เพื่อไม่ให้ service พร้อมใช้งานหาก secret สำคัญยังไม่ถูกตั้ง

---

## 3) งานแก้ไขคอมเมนต์ในโค้ด/ความคลาดเคลื่อนของเอกสาร (Comment/Docs Discrepancy)

**ปัญหาที่พบ**
- `api_gateway/README.md` ระบุ endpoint `WS /ws/cognitive-stream`
- แต่ `api_gateway/main.py` ไม่มี websocket route ดังกล่าวจริง ทำให้เอกสารไม่ตรงกับ implementation ปัจจุบัน

**งานที่เสนอ (1 งาน)**
- เลือกและทำให้สอดคล้องกันเพียงแนวทางเดียว: 
  - เพิ่ม route `/ws/cognitive-stream` ในโค้ดให้ใช้งานได้จริง **หรือ**
  - ปรับ README ให้ย้าย endpoint นี้ไปหัวข้อ roadmap/experimental และระบุ source of truth ของ route ที่รองรับจริง

---

## 4) งานปรับปรุงการทดสอบ (Test Improvement)

**ปัญหาที่พบ**
- ใน `api_gateway/test_api.py` ยังไม่มี test ที่ป้องกัน regression ของกรณี misconfiguration (`AETHERIUM_API_KEY` ไม่ถูกตั้ง) และไม่มีเคสยืนยันชัดเจนเรื่อง invalid key หลังเปิดใช้ auth

**งานที่เสนอ (1 งาน)**
- เพิ่มชุดทดสอบ auth regression สำหรับ endpoint ที่มีการป้องกัน (`/api/v1/cognitive/validate`) อย่างน้อย 2 เคส:
  1. ไม่ตั้ง `AETHERIUM_API_KEY` แล้วระบบต้อง fail-closed
  2. ตั้ง `AETHERIUM_API_KEY` แต่ส่ง `X-API-Key` ไม่ตรง ต้องได้ `403`
