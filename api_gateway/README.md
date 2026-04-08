# AGNS Cognitive DSL API Gateway

เอกสารและโค้ดตัวอย่างสำหรับระบบรับ Cognitive DSL จากโมเดลภายนอก (OpenAI / Anthropic / Google / Custom)

## Endpoints

- `POST /api/v1/cognitive/emit`
- `POST /api/v1/cognitive/validate`
- `GET /health`
- `WS /ws/cognitive-stream`

## WebSocket scaling primitives (prototype)

ไฟล์ `api_gateway/ws_scaling.py` มีตัวช่วยสำหรับงานออกแบบ production websocket scaling:
- capacity planning สำหรับเป้าหมายระดับ 1M concurrent connections
- shard routing ตาม room hash
- backpressure queue แบบ state-first
- reconnect planning ด้วย version-aware replay

## Header Requirements

- `X-API-Key`
- `X-Model-Provider` (เฉพาะ emit)
- `X-Model-Version` (เฉพาะ emit)

### การรัน (สำหรับพัฒนาเร็ว)
สำหรับ Development Server สามารถใช้ `uvicorn` โดยตรงได้เลย แต่โหมดนี้อาจไม่ได้บังคับหรือจำลองสภาพแวดล้อมเหมือน Production ทั้งหมด

```bash
# ต้องมี API key สำหรับเรียกใช้งาน endpoint ที่ป้องกันสิทธิ์
export OPENAI_API_KEY=demo-key

uvicorn api_gateway.main:app --host 0.0.0.0 --port 8080 --reload
```

### การรัน (สำหรับ Production)
สำหรับสภาพแวดล้อมที่ใกล้เคียงกับ Production แนะนำให้ใช้สคริปต์ที่เตรียมไว้ ซึ่งจะมีการตรวจสอบและตั้งค่า Environment Variable ที่จำเป็น เช่น API Key ให้ครบถ้วน

```bash
./api_gateway/start_cognitive_api.sh
```

### ทดสอบ validate
```bash
curl -X POST http://localhost:8080/api/v1/cognitive/validate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-key" \
  -d @api_gateway/sample_emit_payload.json
```
