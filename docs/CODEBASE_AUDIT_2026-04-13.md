# Codebase audit backlog (2026-04-13)

เอกสารนี้สรุปประเด็นที่ตรวจพบจากการสำรวจโค้ด พร้อมงานที่แนะนำให้ทำต่ออย่างละ 1 งานตามหมวดที่ร้องขอ

## 1) งานแก้ไขข้อความที่พิมพ์ผิด (Typo fix)
- **ปัญหา:** หัวข้อเอกสาร `api_gateway/README.md` ใช้คำว่า `AGNS Cognitive DSL API Gateway` ซึ่งไม่ตรงกับชื่อโปรเจกต์ใน repo (`Aetherium Manifest`) และสร้างความสับสนด้าน branding
- **ไฟล์อ้างอิง:** `api_gateway/README.md` บรรทัดแรก
- **งานที่เสนอ:** เปลี่ยนหัวข้อเป็น `Aetherium Cognitive DSL API Gateway` และตรวจคำย่อ AGNS/Aetherium ให้สอดคล้องทั้งเอกสาร

## 2) งานแก้ไขบั๊ก (Bug fix)
- **ปัญหา:** ฟังก์ชัน `to_visual_manifestation` แปลง `device_tier` ด้วย `int(device_tier)` โดยตรง ทำให้ input ที่ไม่ใช่ตัวเลข (เช่น `"mid"`) โยน `ValueError` และทำให้ pipeline พังแทนที่จะ fallback
- **ไฟล์อ้างอิง:** `tools/contracts/particle_control_adapter.py`
- **งานที่เสนอ:** เพิ่ม safe-coercion (try/except + default tier = 1) แล้วค่อย clamp ช่วง `[1,4]` เพื่อทำให้ adapter ทนทานกับข้อมูลจาก upstream

## 3) งานแก้ไขคอมเมนต์/ความคลาดเคลื่อนของเอกสาร
- **ปัญหา:** `api_gateway/README.md` ระบุ endpoint `WS /ws/cognitive-stream` แต่ใน `api_gateway/main.py` ไม่มี route WebSocket ดังกล่าว
- **ไฟล์อ้างอิง:** `api_gateway/README.md`, `api_gateway/main.py`
- **งานที่เสนอ:** ตัด endpoint นี้ออกจาก README หรือย้ายเอกสารไปชี้ `ws_gateway/main.py` ให้ชัดเจนว่า WebSocket อยู่ service ไหน

## 4) งานปรับปรุงการทดสอบ (Test improvement)
- **ปัญหา:** ชุดทดสอบ `tools/contracts/test_particle_control_adapter.py` ยังไม่ครอบคลุมเคส input ผิดชนิดของ `device_tier`
- **ไฟล์อ้างอิง:** `tools/contracts/test_particle_control_adapter.py`
- **งานที่เสนอ:** เพิ่ม test case สำหรับ `device_tier="mid"`, `None`, ค่าติดลบ และค่ามากกว่าเพดาน เพื่อยืนยันพฤติกรรม fallback + clamping
