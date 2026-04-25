# Codebase Audit (2026-04-25)

เอกสารนี้สรุปงานปรับปรุงที่แนะนำจากการตรวจสอบฐานโค้ด โดยเสนออย่างละ 1 งานตามหมวดที่ร้องขอ

## 1) งานแก้ไขข้อความพิมพ์ผิด (Typo/Text Fix)

**งานที่เสนอ:** แก้ข้อความตัวอย่าง environment variable ใน `api_gateway/README.md` จาก `OPENAI_API_KEY` ให้เป็น `AETHERIUM_API_KEY` ในส่วนคำอธิบายการรันที่อ้างถึง endpoint ที่ใช้ `X-API-Key`.

- เหตุผล: ข้อความตัวอย่างปัจจุบันอาจทำให้ผู้ใช้สับสนว่า header auth (`X-API-Key`) ผูกกับ provider key ของโมเดล ทั้งที่โค้ดบังคับใช้ `AETHERIUM_API_KEY` สำหรับ authorization.
- หลักฐานอ้างอิง:
  - ตัวอย่าง README ใช้ OPENAI_API_KEY (api_gateway/README.md บรรทัดที่ 33)
  - โค้ดตรวจ `X-API-Key` เทียบกับ `AETHERIUM_API_KEY`【F:api_gateway/main.py†L157-L163】
- Definition of Done:
  - ตัวอย่างใน README สอดคล้องกับ behavior จริงของระบบ auth
  - เพิ่มหมายเหตุแยกบทบาท `AETHERIUM_API_KEY` vs provider keys ให้ชัดเจน

## 2) งานแก้ไขบั๊ก (Bug Fix)

**งานที่เสนอ:** แก้บั๊กใน WS gateway โดยเพิ่ม `import hmac` ใน `ws_gateway/main.py`.

- เหตุผล: ฟังก์ชัน `_authorize` เรียก `hmac.compare_digest(...)` แต่ไฟล์ไม่มีการ import `hmac` ทำให้เสี่ยง `NameError` ระหว่าง handshake.
- หลักฐานอ้างอิง:
  - `_authorize` เรียก `hmac.compare_digest`【F:ws_gateway/main.py†L28-L36】
  - ส่วน import ไม่มี `hmac`【F:ws_gateway/main.py†L1-L8】
- Definition of Done:
  - เพิ่ม import ที่ขาด
  - ยืนยันว่า websocket auth path ใช้งานได้จริง

## 3) งานแก้ไขคอมเมนต์/เอกสารคลาดเคลื่อน (Comment/Docs Discrepancy)

**งานที่เสนอ:** ทำให้เอกสารพอร์ต API gateway สอดคล้องกันทั้ง repo (เลือกให้เป็นพอร์ตเดียว แล้วแก้ทุกจุด).

- เหตุผล: เอกสารคนละไฟล์ระบุพอร์ต dev ไม่ตรงกัน (`8000` vs `8080`) ทำให้ onboarding มีโอกาสรันผิดพอร์ต.
- หลักฐานอ้างอิง:
  - AGENTS ระบุพอร์ต `8000`【F:AGENTS.md†L17-L23】
  - README ระบุพอร์ต 8080 (README.md บรรทัดที่ 69 และ api_gateway/README.md บรรทัดที่ 35, 47)
- Definition of Done:
  - กำหนด canonical dev port หนึ่งค่า
  - แก้เอกสารที่เกี่ยวข้องทั้งหมดให้ตรงกัน

## 4) งานปรับปรุงการทดสอบ (Test Improvement)

**งานที่เสนอ:** เพิ่ม regression test สำหรับ websocket authorization path เพื่อจับกรณี import/auth พังตั้งแต่ต้นทาง.

- เหตุผล: ชุดทดสอบปัจจุบันครอบคลุมการเชื่อมต่อด้วย query/header key อยู่แล้ว แต่ยังไม่ assert behavior ด้าน auth utility โดยตรง (เช่นกรณี dependency/import หาย).
- หลักฐานอ้างอิง:
  - เทส WS ปัจจุบันอยู่ที่ระดับ connection happy path/missing key【F:ws_gateway/test_ws_gateway.py†L15-L37】
  - โค้ด auth อยู่ใน `_authorize` และเป็นจุดวิกฤตของ handshake【F:ws_gateway/main.py†L28-L39】
- Definition of Done:
  - เพิ่ม unit/integration test ที่ fail ได้ชัดเจนเมื่อ auth helper ใช้งานไม่ได้
  - ครอบคลุมทั้งกรณี key ถูกต้อง, key ไม่ถูกต้อง, และไม่มี key
