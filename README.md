# Aetherium Manifest

## English Documentation

### Overview
Aetherium Manifest is the first-use frontend runtime of the Aetherium ecosystem. The home view is intentionally minimal: a full-screen light field, a bottom composer, and one Settings entry point.

### First-Use Surface Principles
- Light is the primary reasoning and presentation medium.
- The first view avoids dashboard, console, and panel-heavy UI.
- Users can type immediately and receive readable text manifested through light.
- Advanced controls are consolidated into **Settings**.

### Current Runtime Capabilities
- Clean first-use surface with:
  - full-screen manifestation canvas
  - minimal composer
  - single Settings toggle
  - subtle human-readable status text
- Luminous text manifestation with particle support and smooth transitions.
- Deterministic response orchestration for:
  - greeting
  - gratitude
  - simple question
  - low-confidence / ambiguity fallback
  - polite language adaptation
- Progressive language layer:
  - explicit language preference from Settings
  - browser-locale signal
  - short-text character heuristics
  - optional lightweight local detector
  - session language memory
- Voice input as progressive enhancement with graceful fallback if Speech API is unavailable.
- Accessibility baseline:
  - keyboard focus visibility
  - icon button `aria-label`
  - `prefers-reduced-motion` support
  - readable text fallback outside animation
- Installable web app baseline (PWA manifest + service worker + core assets).

### Settings (Single Source of Truth)
Settings contains advanced controls only:
- API Base / WS Base
- Runtime mode
- Telemetry
- Lineage / replay tools
- Scholar / search layer
- Governor / debug info
- Reduced motion
- Language preference
- Voice input options
- Local language detector profile
- Developer tools
- Session audit export

### API Gateway (Prototype)
The `api_gateway/` folder includes a sample Cognitive DSL gateway:
- `POST /api/v1/cognitive/emit`
- `POST /api/v1/cognitive/validate`
- `GET /health`
- `WS /ws/cognitive-stream`

### Run Locally
```bash
npm run lint
cd api_gateway && pytest -q
python3 tools/contracts/contract_checker.py
python3 tools/contracts/contract_fuzz.py
python3 tools/benchmarks/runtime_semantic_benchmark.py --input tools/benchmarks/runtime_semantic_samples.sample.json
npx --yes tsx --test test_runtime_governor_psycho_safety.test.ts
```

### CI/CD Note
- GitHub/Azure automation that was not in active use has been removed from this repository.
- Deployment and quality checks should be run manually or from an external CI system outside this repo.
- If branch protection requires status checks, update required checks in GitHub repository settings to match your active process.
- See [remove-unused-platform-automation.md](docs/repo-maintenance/remove-unused-platform-automation.md) for more details.

### Recommended Next Steps
- Move mutable runtime state to Redis (metrics counters, telemetry cache, and websocket room membership) for multi-worker consistency.
- Add signed outbound proxy policy (HMAC request intent + per-tenant allowlist) to harden enterprise SSRF controls.
- Add persisted TSDB backend (InfluxDB/TimescaleDB) with retention and downsampling policies.
- Add proxy allowlist/denylist + content-type and size guardrails for stronger SSRF safety.
- Add voice A/B routing and collect WER/latency metrics by language-region cohort.
- Add CRDT merge (Yjs/Automerge) for conflict-free collaborative editing beyond simple delta updates.

---

## เอกสารภาษาไทย

### ภาพรวม
Aetherium Manifest คือ runtime ฝั่ง frontend สำหรับประสบการณ์แรกใช้งานของระบบ Aetherium โดยหน้าแรกถูกออกแบบให้เรียบและสงบ: มีเพียงพื้นที่แสงเต็มจอ ช่องพิมพ์ด้านล่าง และปุ่ม Settings จุดเดียว

### หลักการของหน้าแรก
- แสงคือสื่อหลักของการให้เหตุผลและการแสดงข้อมูล
- หลีกเลี่ยงหน้าแบบ dashboard/console ที่ซับซ้อน
- ผู้ใช้พิมพ์ได้ทันที และเห็นคำตอบแบบข้อความที่ก่อรูปจากแสง
- ฟังก์ชันขั้นสูงทั้งหมดอยู่ใน **Settings**

### ความสามารถปัจจุบัน
- หน้าแรกแบบ clean first-use surface:
  - manifestation canvas เต็มจอ
  - composer แบบมินิมอล
  - ปุ่ม Settings เพียงจุดเดียว
  - สถานะสั้นที่มนุษย์อ่านเข้าใจง่าย
- ระบบแสดงข้อความเรืองแสงพร้อมอนุภาคสนับสนุนและ transition ที่นุ่ม
- กฎตอบสนองแบบกำหนดผลได้แน่นอนสำหรับ:
  - คำทักทาย
  - คำขอบคุณ
  - คำถามทั่วไปแบบสั้น
  - กรณีไม่แน่ชัด (ambiguity fallback)
  - การปรับภาษาอย่างสุภาพ
- language layer แบบ progressive:
  - ภาษาที่ผู้ใช้เลือกใน Settings
  - browser locale
  - heuristic จากตัวอักษรของข้อความสั้น
  - local detector แบบ lightweight (เลือกเปิด/ปิดได้)
  - หน่วยความจำภาษาใน session
- Voice input เป็น progressive enhancement และ fallback ได้เมื่อเบราว์เซอร์ไม่รองรับ Speech API
- รองรับการเข้าถึงพื้นฐาน:
  - โฟกัสด้วยคีย์บอร์ดเห็นชัด
  - ปุ่มไอคอนมี `aria-label`
  - รองรับ `prefers-reduced-motion`
  - มีข้อความ fallback ให้อ่านได้แม้ไม่พึ่ง animation
- รองรับ installable web app (PWA) พร้อม manifest, service worker และ asset หลัก

### API Gateway (ต้นแบบ)
โฟลเดอร์ `api_gateway/` มีตัวอย่าง Cognitive DSL gateway พร้อม endpoint สำหรับ emit/validate/health/websocket

### แนวทางต่อยอด
- ย้าย mutable runtime state ไปที่ Redis (metrics counters, telemetry cache และสมาชิกห้อง websocket) เพื่อรองรับหลาย worker ได้สม่ำเสมอ
- เพิ่มนโยบาย signed outbound proxy (HMAC request intent + allowlist ตาม tenant) เพื่อเสริมความปลอดภัย SSRF ระดับองค์กร
- เพิ่ม persisted TSDB backend (InfluxDB/TimescaleDB) พร้อมนโยบาย retention และ downsampling
- เพิ่ม allowlist/denylist, content-type guardrail และขนาด payload guardrail ใน proxy
- เพิ่ม voice A/B routing และเก็บ WER/latency แยกตามภาษาและภูมิภาค
- เพิ่มกลไก CRDT merge (Yjs/Automerge) สำหรับงาน collaborative editing ที่ซับซ้อนกว่า delta พื้นฐาน
