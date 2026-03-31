# AGNS Cognitive DSL API Gateway

เอกสารและโค้ดตัวอย่างสำหรับระบบรับ Cognitive DSL จากโมเดลภายนอก (OpenAI / Anthropic / Google / Custom)

## Endpoints

- `POST /api/v1/cognitive/emit`
- `POST /api/v1/cognitive/validate`
- `GET /health`
- `WS /ws/cognitive-stream`

## Header Requirements

- `X-API-Key`
- `X-Model-Provider` (เฉพาะ emit)
- `X-Model-Version` (เฉพาะ emit)

## ตัวอย่างรัน

```bash
uvicorn api_gateway.main:app --host 0.0.0.0 --port 8080 --reload
```

## ตัวอย่างทดสอบ

```bash
curl -X POST http://localhost:8080/api/v1/cognitive/validate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-key" \
  -d @api_gateway/sample_emit_payload.json
```
