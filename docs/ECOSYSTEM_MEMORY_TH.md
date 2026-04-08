# บันทึกความทรงจำระบบนิเวศ AETHERIUM (Ecosystem Memory)

อัปเดตล่าสุด: 2026-03-25

เอกสารนี้มีเป้าหมายเพื่อ "เก็บบริบทระยะยาว" สำหรับงานพัฒนารอบถัดไป เพื่อไม่ให้หลงลืมความสัมพันธ์ของโครงการในจักรวาล AETHERIUM

## โครงการในระบบนิเวศ (First-party Ecosystem)
1. The Book of Formation – AETHERIUM GENESIS  
   https://github.com/FGD-ATR-EP/The-Book-of-Formation-AETHERIUM-GENESIS
2. PRGX-AG  
   https://github.com/FGD-ATR-EP/PRGX-AG
3. LOGENESIS-1.5  
   https://github.com/FGD-ATR-EP/LOGENESIS-1.5
4. BioVisionVS1.1  
   https://github.com/FGD-ATR-EP/BioVisionVS1.1

## แนวทางใช้งานบริบทนี้ในงานพัฒนา
- ให้ถือว่า AetherBus-Tachyon และ Aetherium-Manifest เป็นส่วนหนึ่งของ ecosystem เดียวกันโดยค่าเริ่มต้น
- เมื่อต้องเปลี่ยน schema/ABI ให้บันทึกเหตุผล ผลกระทบ และแผน compatibility ใน repo ก่อนลงมือแก้
- การปรับปรุงที่แตะ state semantics ต้องรักษาหลัก state-first + deterministic observability
- หากมีการเพิ่ม assumption ใหม่ ให้ append ในเอกสารนี้เพื่อส่งต่อความเข้าใจให้รอบถัดไป
