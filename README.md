# Aetherium Manifest

## English Documentation

### Overview
Aetherium Manifest is the frontend expression layer of the Aetherium ecosystem. It visualizes AI intent, confidence, and runtime state through light, motion, and abstract form.

### Architecture
- **AETHERIUM-GENESIS (Backend):** reasoning core, intent generation, telemetry interpretation.
- **Aetherium Manifest (Frontend):** visual embodiment and interaction runtime.
- **Transport:** API/WebSocket contract over AetherBus.

### Current Runtime Capabilities
- Real-time particle/shape rendering mapped from intent vectors.
- Voice interaction pipeline (VAD mock + STT mock + intent mapping).
- Adaptive quality tier and frame-rate management.
- Accessibility-focused controls with visual microphone feedback.
- Window manager for all HUD panels:
  - close (✕) per panel
  - reopen from Settings > Panels
  - drag-to-move and resize
- Settings with 5 tabs: `Display`, `Panels`, `Links`, `Language`, `Voice`.
- External URL analysis entry point in Settings (`Analyze URL`).
- Event-driven command bus + telemetry counters + delta-state patch helper.
- Upgraded to an installable web application (PWA) with manifest, service worker, and core assets.

### API Gateway (Prototype)
The `api_gateway/` folder includes a sample Cognitive DSL gateway:
- `POST /api/v1/cognitive/emit`
- `POST /api/v1/cognitive/validate`
- `GET /health`
- `WS /ws/cognitive-stream`

### AetherBusExtreme Utilities
`api_gateway/aetherbus_extreme.py` includes:
- Zero-copy socket send (`memoryview`) + async-safe send helper (`loop.sock_sendall`)
- Immutable envelope models
- Async queue bus with backpressure
- MsgPack helpers
- NATS async manager
- State convergence processor

### Run Locally
```bash
python3 -m http.server 4173
# open http://localhost:4173
```

### CI/CD Note
- GitHub/Azure automation that was not in active use has been removed from this repository.
- Deployment and quality checks should be run manually or from an external CI system outside this repo.
- If branch protection requires status checks, update required checks in GitHub repository settings to match your active process.
- See [remove-unused-platform-automation.md](docs/repo-maintenance/remove-unused-platform-automation.md) for more details.

### Recommended Next Steps
- Move mutable runtime state to Redis (metrics counters, telemetry cache, and websocket room membership) for multi-worker consistency.
- Add signed outbound proxy policy (HMAC request intent + per-tenant allowlist) to harden enterprise SSRF controls.
- Build a contract-fuzz pipeline: property-based payload generators + mutation corpus for schema regression stress tests.
- Add persisted TSDB backend (InfluxDB/TimescaleDB) with retention and downsampling policies.
- Add proxy allowlist/denylist + content-type and size guardrails for stronger SSRF safety.
- Add locale QA checks (missing-key scanner + pseudolocale) in CI.
- Add voice A/B routing and collect WER/latency metrics by language-region cohort.
- Add CRDT merge (Yjs/Automerge) for conflict-free collaborative editing beyond simple delta updates.

---

## เอกสารภาษาไทย

### ภาพรวม
Aetherium Manifest คือเลเยอร์แสดงผลฝั่ง Frontend ของระบบ Aetherium โดยแปลงเจตนาและสถานะของ AI ให้เป็นภาพเคลื่อนไหวเชิงนามธรรม

### โครงสร้างระบบ
- **AETHERIUM-GENESIS (Backend):** คิด วิเคราะห์ และสร้าง intent
- **Aetherium Manifest (Frontend):** แสดงผลและโต้ตอบผู้ใช้
- **การเชื่อมต่อ:** ผ่าน API/WebSocket บน AetherBus

### ความสามารถปัจจุบัน
- ระบบแสดงผลแบบเรียลไทม์ด้วยอนุภาคและรูปทรงตาม intent
- Voice pipeline (VAD/STT แบบ mock) + intent mapping
- ปรับคุณภาพกราฟิกตามเครื่องและจัดการเฟรมเรต
- ปุ่มควบคุมที่เป็นมิตรต่อการเข้าถึง (Accessibility)
- HUD ทุกหน้าต่างมีปุ่มปิด เปิดคืนได้จาก Settings และลาก/ย่อ-ขยายได้
- Settings แบ่ง 5 แท็บ: `Display`, `Panels`, `Links`, `Language`, `Voice`
- มีช่องวิเคราะห์ลิงก์ URL ภายนอก
- มีโครง telemetry + event bus + delta-state สำหรับต่อยอด
- ยกระดับเป็น installable web application (PWA) พร้อม manifest, service worker และ asset แกนหลัก

### API Gateway (ต้นแบบ)
โฟลเดอร์ `api_gateway/` มีตัวอย่าง Cognitive DSL gateway พร้อม endpoint สำหรับ emit/validate/health/websocket

### แนวทางต่อยอด
- ย้าย mutable runtime state ไปที่ Redis (metrics counters, telemetry cache และสมาชิกห้อง websocket) เพื่อรองรับหลาย worker ได้สม่ำเสมอ
- เพิ่มนโยบาย signed outbound proxy (HMAC request intent + allowlist ตาม tenant) เพื่อเสริมความปลอดภัย SSRF ระดับองค์กร
- สร้าง contract-fuzz pipeline ด้วยตัวสร้าง payload เชิง property-based และ mutation corpus สำหรับ stress test schema regression
- เพิ่ม persisted TSDB backend (InfluxDB/TimescaleDB) พร้อมนโยบาย retention และ downsampling
- เพิ่ม allowlist/denylist, content-type guardrail และขนาด payload guardrail ใน proxy
- เพิ่ม locale QA checks ใน CI (missing-key scanner + pseudolocale)
- เพิ่ม voice A/B routing และเก็บ WER/latency แยกตามภาษาและภูมิภาค
- เพิ่มกลไก CRDT merge (Yjs/Automerge) สำหรับงาน collaborative editing ที่ซับซ้อนกว่า delta พื้นฐาน


## Extension Ideas
- Move mutable runtime state to Redis (metrics counters, telemetry cache, and websocket room membership) for multi-worker consistency.
- Add signed outbound proxy policy (HMAC request intent + per-tenant allowlist) to harden enterprise SSRF controls.
- Build a contract-fuzz pipeline: property-based payload generators + mutation corpus for schema regression stress tests.
- Add persisted TSDB backend (InfluxDB/TimescaleDB) with retention and downsampling policies.
- Add proxy allowlist/denylist + content-type and size guardrails for stronger SSRF safety.
- Add locale QA checks (missing-key scanner + pseudolocale) in CI.
- Add voice A/B routing and collect WER/latency metrics by language-region cohort.
- Add CRDT merge (Yjs/Automerge) for conflict-free collaborative editing beyond simple delta updates.
