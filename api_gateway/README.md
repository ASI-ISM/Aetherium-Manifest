# AGNS Cognitive DSL API Gateway

## English

Sample gateway for receiving Cognitive DSL payloads from external model providers.

### Endpoints
- `POST /api/v1/cognitive/emit`
- `POST /api/v1/cognitive/validate`
- `GET /health`
- `WS /ws/cognitive-stream`

### Required Headers
- `X-API-Key`

### Run (Quick Development)
For a quick development server, you can use `uvicorn` directly. This mode is convenient, but it does not enforce every production-like preflight check.

```bash
# An API key is required for protected endpoints
export OPENAI_API_KEY=demo-key
# Optional for Google model calls:
export GEMINI_API_KEY=demo-key

uvicorn api_gateway.main:app --host 0.0.0.0 --port 8080 --reload
```

### Run (Production-like)
For an environment that more closely resembles production, use the provided shell script. It validates that at least one provider API key is set before startup, and runs via `uv run uvicorn`.

```bash
./api_gateway/start_cognitive_api.sh
```

### Validate Example
```bash
curl -X POST http://localhost:8080/api/v1/cognitive/validate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-key" \
  -d @api_gateway/sample_emit_payload.json
```

### AetherBusExtreme Utilities
Low-latency helper module: `api_gateway/aetherbus_extreme.py`
- Zero-copy send
- Immutable envelope models
- Async queue bus with backpressure
- MsgPack serialization helpers
- NATS async publisher manager
- Deterministic state convergence processor

Test command:
```bash
python -m unittest api_gateway/test_aetherbus_extreme.py
```

---

## ภาษาไทย

Gateway ตัวอย่างสำหรับรับ Cognitive DSL จากผู้ให้บริการโมเดลภายนอก

### Endpoint
- `POST /api/v1/cognitive/emit`
- `POST /api/v1/cognitive/validate`
- `GET /health`
- `WS /ws/cognitive-stream`

### Header ที่ต้องมี
- `X-API-Key`

### การรัน (สำหรับพัฒนาเร็ว)
สำหรับ Development Server สามารถใช้ `uvicorn` โดยตรงได้เลย แต่โหมดนี้อาจไม่ได้บังคับหรือจำลองสภาพแวดล้อมเหมือน Production ทั้งหมด

```bash
# ต้องมี API key สำหรับเรียกใช้งาน endpoint ที่ป้องกันสิทธิ์
export OPENAI_API_KEY=demo-key
# หากต้องเรียก Google model ให้ตั้งเพิ่ม
export GEMINI_API_KEY=demo-key

uvicorn api_gateway.main:app --host 0.0.0.0 --port 8080 --reload
```

### การรัน (สำหรับ Production)
สำหรับสภาพแวดล้อมที่ใกล้เคียงกับ Production แนะนำให้ใช้สคริปต์ที่เตรียมไว้ สคริปต์จะตรวจว่ามี provider API key อย่างน้อยหนึ่งค่า และรันผ่าน `uv run uvicorn`

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


## AetherBusExtreme Utilities

เพิ่มโมดูล `api_gateway/aetherbus_extreme.py` สำหรับงาน low-latency transport:

- Zero-copy socket send (`zero_copy_send` ผ่าน `memoryview`)
- Immutable envelope (`EnvelopeHeader`, `AkashicEnvelope.create`)
- Async queue bus พร้อม backpressure (`AetherBusExtreme`)
- MsgPack serialization (`serialize_to_msgpack`, `deserialize_from_msgpack`)
- NATS async publisher (`NATSJetStreamManager`)
- Deterministic state convergence (`StateConvergenceProcessor`)

รันทดสอบเฉพาะโมดูล:

```bash
python -m unittest api_gateway/test_aetherbus_extreme.py
```
