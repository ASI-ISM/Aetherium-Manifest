# Aetherium Manifest

## English Documentation

### Overview
Aetherium Manifest is a light-native first-use runtime. The homepage stays intentionally calm and minimal: one manifestation field, one composer, and one Settings entry point.

### First-use Surface (Current)
- Full-screen light field/canvas as the primary reasoning and presentation surface.
- Minimal bottom composer for immediate natural-language input.
- Single Settings button for all advanced controls.
- Subtle human-readable status line plus a readable fallback text line.
- Greeting inputs (for example: `hello`, `hi`, `สวัสดี`) respond through luminous text manifestation rather than dashboard widgets.

### Settings as the Single Advanced Surface
All technical/runtime controls are intentionally moved into Settings:
- API Base / WS Base
- Runtime mode, telemetry, lineage/replay, scholar/search, governor debug, developer tools
- Reduced motion, language preference, local language detector profile, voice options
- Session audit export

### Language-aware Response Layer (First-run)
Deterministic language resolution is implemented with progressive fallback:
1. Explicit language preference in Settings
2. Browser locale (`navigator.languages` / `navigator.language`)
3. Input-text heuristics (Thai vs English character ranges)
4. Optional local detector rules (pluggable; no required network call)
5. Session language memory

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

### Recommended Next Steps (Open)
- Add persistent telemetry storage with retention/downsampling policies.
- Add enterprise outbound proxy hardening (allow/deny lists, payload/content guardrails).
- Expand deterministic response rules beyond greeting/gratitude/simple question flows.
- Add broader language coverage beyond Thai/English short-text first-run heuristics.

---

## เอกสารภาษาไทย

### ภาพรวม
Aetherium Manifest คือรันไทม์หน้าแรกแบบ light-native ที่ออกแบบให้สงบ เรียบ และเริ่มใช้งานได้ทันที โดยให้ “แสง” เป็นแกนหลักของการสื่อความหมาย

### หน้าแรก (เวอร์ชันปัจจุบัน)
- พื้นที่แสงเต็มหน้าจอเป็นแกนของการให้เหตุผลและการแสดงผล
- Composer ด้านล่างแบบมินิมอลสำหรับพิมพ์ข้อความได้ทันที
- ปุ่ม Settings เพียงจุดเดียว
- มีสถานะที่มนุษย์อ่านได้ และบรรทัดข้อความ fallback ที่อ่านชัด
- อินพุตทักทาย เช่น `hello`, `hi`, `สวัสดี` จะตอบผ่านข้อความเรืองแสง ไม่ใช้แดชบอร์ดหรือวิดเจ็ตหนัก

### Settings เป็นศูนย์รวมฟังก์ชันขั้นสูง
ฟังก์ชันเชิงเทคนิคทั้งหมดอยู่ใน Settings เท่านั้น:
- API Base / WS Base
- Runtime mode, telemetry, lineage/replay, scholar/search, governor debug, developer tools
- Reduced motion, language preference, local detector profile, voice options
- ส่งออก session audit

### ชั้นการตอบสนองเชิงภาษา (สำหรับ first-run)
ลำดับการเลือกภาษาแบบ deterministic:
1. ภาษาที่ผู้ใช้กำหนดใน Settings
2. ภาษาจากเบราว์เซอร์ (`navigator.languages` / `navigator.language`)
3. ตรวจจากตัวอักษรในข้อความอินพุต (ไทย/อังกฤษ)
4. local detector แบบเบา (เปิด/ปิดได้ และไม่บังคับเรียกเครือข่าย)
5. หน่วยความจำภาษาใน session

### API Gateway (ต้นแบบ)
โฟลเดอร์ `api_gateway/` มีตัวอย่าง Cognitive DSL gateway พร้อม endpoint สำหรับ emit/validate/health/websocket

### แนวทางต่อยอด
- ย้าย mutable runtime state ไปที่ Redis (metrics counters, telemetry cache และสมาชิกห้อง websocket) เพื่อรองรับหลาย worker ได้สม่ำเสมอ
- เพิ่มนโยบาย signed outbound proxy (HMAC request intent + allowlist ตาม tenant) เพื่อเสริมความปลอดภัย SSRF ระดับองค์กร
- เพิ่ม persisted TSDB backend (InfluxDB/TimescaleDB) พร้อมนโยบาย retention และ downsampling
- เพิ่ม allowlist/denylist, content-type guardrail และขนาด payload guardrail ใน proxy
- เพิ่ม voice A/B routing และเก็บ WER/latency แยกตามภาษาและภูมิภาค
- เพิ่มกลไก CRDT merge (Yjs/Automerge) สำหรับงาน collaborative editing ที่ซับซ้อนกว่า delta พื้นฐาน
