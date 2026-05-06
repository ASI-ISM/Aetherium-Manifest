# 1. Base Image: ใช้ Python 3.11-slim ที่มีขนาดเล็ก
FROM python:3.11-slim

# 2. ตั้งค่า Working Directory ภายใน Container
WORKDIR /app

# 3. คัดลอกเฉพาะไฟล์ requirements.txt และติดตั้ง Dependencies ก่อน
# เพื่อใช้ประโยชน์จาก Docker Cache Layer ทำให้ build ครั้งถัดไปเร็วขึ้นหากไม่มีการเปลี่ยนแปลง
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. คัดลอกโค้ดทั้งหมดของ api_gateway ไปยัง Working Directory
COPY . .

# 5. เปิด Port 8000 ของ Container
EXPOSE 8000

# 6. กำหนดคำสั่งสำหรับรันแอปพลิเคชันเมื่อ Container เริ่มทำงาน
# - ใช้ main:app เพราะ Working Directory ของเราคือ /app ซึ่งมีไฟล์ main.py อยู่
# - ใช้ --workers 4 เพื่อรองรับการประมวลผลแบบขนาน (Concurrency) ตามที่ระบุในไฟล์ .sh
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
