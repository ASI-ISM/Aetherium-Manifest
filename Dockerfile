# ใช้ Nginx image ขนาดเล็กสำหรับ Production
FROM nginx:1.29.8-alpine

# กำหนด Working Directory
WORKDIR /usr/share/nginx/html

# คัดลอกไฟล์ static assets ที่จำเป็น
COPY ./index.html .
COPY ./app.webmanifest .
COPY ./service-worker.js .
COPY ./locales ./locales/
COPY ./docs ./docs/

# เปิด Port 80 (default ของ Nginx)
EXPOSE 80

# หมายเหตุ: Nginx image มี CMD เริ่มต้นในการ start server อยู่แล้ว
