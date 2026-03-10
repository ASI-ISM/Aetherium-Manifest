# Aetherium Manifest

## Quick Navigation
- [Vision](#vision)
- [System Architecture](#system-architecture)
- [System Layers](#system-layers)
- [Aetherium Research Architecture Diagrams](#aetherium-research-architecture-diagrams)
- [Core Capabilities](#core-capabilities)
- [Developer Quick Start](#developer-quick-start)
- [API Reference (Prototype)](#api-reference-prototype)
- [Security, Internationalization, and Collaboration](#security-internationalization-and-collaboration)
- [Research & Engineering Roadmap](#research--engineering-roadmap)
- [AM-UI Color System](#am-ui-color-system)
- [Project Structure](#project-structure)
- [Validation & Tests](#validation--tests)
- [Contributing](#contributing)
- [License](#license)
- [เอกสารภาษาไทย (Thai Documentation)](#เอกสารภาษาไทย-thai-documentation)

---

## Vision

**Aetherium Manifest** is the perceptual interface of the Aetherium ecosystem — a real-time visualization and interaction layer that expresses AI cognition through light, motion, and abstract forms.

Rather than exposing raw machine signals, Manifest translates AI intention, confidence, and system state into dynamic visual structures that humans can perceive and interact with.

Modern AI systems are powerful but often opaque. Manifest explores a different paradigm:

> **AI systems should be observable.**

Manifest is designed to surface:
- intention vectors
- reasoning activity
- system telemetry
- voice interaction signals

as visual phenomena that enable humans to:
- perceive AI behavior
- interpret system state
- interact with cognition in real time

Manifest is the visual language of Aetherium intelligence.

---

## System Architecture

The Aetherium ecosystem is composed of three major layers:

```text
┌─────────────────────────────────────┐
│           AETHERIUM MANIFEST        │
│     Visual Cognition Interface      │
└─────────────────────────────────────┘
                  ▲
                  │
           AetherBus Transport
          (API + WebSocket Events)
                  │
                  ▼
┌─────────────────────────────────────┐
│          AETHERIUM GENESIS          │
│        Cognitive Intelligence       │
└─────────────────────────────────────┘
```

### System Layers

#### AETHERIUM-GENESIS (Backend)
The cognitive core responsible for:
- reasoning
- intention generation
- remote signal interpretation
- decision synthesis

Genesis generates cognitive signals consumed by Manifest.

#### Aetherium Manifest (Frontend)
The visualization and interaction runtime responsible for:
- real-time visual rendering
- voice interaction pipeline
- telemetry visualization
- user control surfaces

Manifest converts cognitive signals into observable structures.

#### Transport Layer (AetherBus)
Communication between components occurs through an event-driven transport layer built on:
- REST APIs
- WebSockets
- message envelopes
- async event queues

---

## Aetherium Research Architecture Diagrams

Below are six research-lab-level reference diagrams for architecture planning, whitepapers, and technical reviews.

### 1) Full Aetherium Ecosystem Architecture (Genesis + Manifest + Bus + Agents)

```text
                 ┌──────────────────────────┐
                 │        Human Users       │
                 │   Voice / UI / Sensors   │
                 └─────────────┬────────────┘
                               │
                               ▼
                ┌───────────────────────────────┐
                │        AETHERIUM MANIFEST     │
                │  Visual Cognition Interface   │
                │                               │
                │  Visualization Engine         │
                │  Voice Interaction            │
                │  HUD Panels                   │
                │  Telemetry Display            │
                └───────────────┬───────────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │      AetherBus       │
                     │  Event / Signal Mesh │
                     └───────────┬──────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌────────────────┐     ┌──────────────────┐     ┌────────────────┐
│ Aetherium      │     │   Agent Systems  │     │ External AI    │
│ GENESIS        │     │                  │     │ Models / APIs  │
│ Cognitive Core │     │ Tools / Workers  │     │ LLM Providers  │
└───────┬────────┘     └────────┬─────────┘     └────────┬───────┘
        │                       │                        │
        ▼                       ▼                        ▼
  Reasoning Engine       Task Agents               Knowledge
  Intent Generation      Automation                Retrieval
  Cognitive State        Data Collection           External Tools
```

### 2) AI Cognition Visualization Pipeline (LLM Reasoning → Visual Form)

```text
External Data / Prompts
│
▼
Large Language Model
Reasoning Layer
│
▼
Cognitive State Model
│
▼
Intention Vector
│
▼
Signal Translation
│
▼
AM-UI Color Semantics
(Intention/LifeState → Thermodynamic Palette)
│
▼
Visualization Mapping

┌───────────────┬───────────────┬───────────────┐
▼               ▼               ▼
Particles     Light Fields   Abstract Geometry
│               │               │
└───────────────┴───────────────┘
▼
Real-Time Rendering
▼
Human Perception
```

AM-UI Color System acts as a deterministic sublayer between **Signal Translation** and **Visualization Mapping**:

`Intention Vector / LifeState → Color Semantics → Palette Mapping → Shader Uniforms → Particle/Field Rendering`

It turns color into a machine-readable cognition contract rather than ad-hoc styling.

### 3) Aetherium Intelligence Stack (AI Platform Stack View)

```text
┌───────────────────────────────────────────┐
│           Human Interaction Layer         │
│   Voice / UI / Visualization / Control    │
└─────────────────────────┬─────────────────┘
                          ▼
┌───────────────────────────────────────────┐
│        Manifest Perception Interface      │
│   Cognitive Visualization + HUD System    │
└─────────────────────────┬─────────────────┘
                          ▼
┌───────────────────────────────────────────┐
│        Cognitive Event Transport          │
│            AetherBus Messaging            │
└─────────────────────────┬─────────────────┘
                          ▼
┌───────────────────────────────────────────┐
│        Aetherium Genesis Intelligence     │
│      Reasoning / Intention Generation     │
└─────────────────────────┬─────────────────┘
                          ▼
┌───────────────────────────────────────────┐
│           Model Orchestration Layer       │
│      LLMs / Agents / Tools / Retrieval    │
└─────────────────────────┬─────────────────┘
                          ▼
┌───────────────────────────────────────────┐
│            Foundation Models              │
│        Language / Vision / Speech         │
└───────────────────────────────────────────┘
```

### 4) Aetherium Cognitive Architecture (AGI Brain Diagram)

```text
                      ┌──────────────────────────────┐
                      │  Multimodal Perception Layer │
                      │  Text / Voice / Sensor Input │
                      └──────────────┬───────────────┘
                                     ▼
                      ┌──────────────────────────────┐
                      │   World Model & Memory Mesh  │
                      │ Episodic / Semantic / Context │
                      └──────────────┬───────────────┘
                                     ▼
┌──────────────────────┐   ┌──────────────────────────┐   ┌───────────────────────┐
│ Goal & Intent Engine │◄──┤  Meta-Cognition Monitor  ├──►│ Safety & Alignment Hub │
│ Priority Formation   │   │ Confidence / Uncertainty │   │ Policy / Constraints   │
└──────────┬───────────┘   └────────────┬─────────────┘   └──────────┬────────────┘
           ▼                            ▼                            ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                 Reasoning Core (Symbolic + Neural Hybrid)                │
│  Planning / Causal Inference / Tool Reasoning / Reflection Loop          │
└────────────────────────────────────┬───────────────────────────────────────┘
                                     ▼
                      ┌──────────────────────────────┐
                      │ Action & Expression Layer    │
                      │ Agents / APIs / Visualization│
                      └──────────────────────────────┘
```

### 5) Aetherium Agent System Architecture

```text
┌────────────────────────────────────────────────────────────────────┐
│                    Agent Orchestrator (Supervisor)                │
│        Task Routing / Budgeting / Dependency Graph Control        │
└──────────────────────────────┬─────────────────────────────────────┘
                               ▼
        ┌──────────────────────┼─────────────────────────┬──────────────────────┐
        ▼                      ▼                         ▼                      ▼
┌───────────────┐      ┌───────────────┐        ┌───────────────┐      ┌───────────────┐
│ Research Agent│      │ Builder Agent │        │ Runtime Agent │      │ Audit Agent   │
│ Retrieval     │      │ Code / Config │        │ Deploy / Ops  │      │ Safety / Logs │
└───────┬───────┘      └───────┬───────┘        └───────┬───────┘      └───────┬───────┘
        │                      │                        │                      │
        └──────────────┬───────┴──────────────┬─────────┴──────────────┬───────┘
                       ▼                      ▼                        ▼
               ┌────────────────────────────────────────────────────────────┐
               │ Shared Tooling Plane                                      │
               │ Vector DB / RAG / Sandboxed Tools / Test Harness / Cache │
               └────────────────────────────────────────────────────────────┘
```

### 6) Aetherium Distributed Infrastructure (Cloud / Edge / GPU / Streaming)

```text
                    ┌──────────────────────────────────────┐
                    │        Global Control Plane          │
                    │ Auth / Routing / Policy / Telemetry  │
                    └───────────────┬──────────────────────┘
                                    ▼
      ┌─────────────────────────────┼─────────────────────────────┐
      ▼                             ▼                             ▼
┌───────────────┐           ┌───────────────┐             ┌────────────────┐
│ Edge Runtime  │           │ Cloud Region A│             │ Cloud Region B │
│ Low Latency   │           │ API + Agents  │             │ API + Agents   │
└───────┬───────┘           └───────┬───────┘             └───────┬────────┘
        ▼                           ▼                             ▼
┌───────────────┐           ┌───────────────┐             ┌────────────────┐
│ Local Stream  │           │ GPU Inference │             │ GPU Inference  │
│ WebRTC / WS   │           │ Cluster       │             │ Cluster        │
└───────┬───────┘           └───────┬───────┘             └───────┬────────┘
        └──────────────┬────────────┴──────────────┬──────────────┘
                       ▼                           ▼
             ┌──────────────────┐        ┌──────────────────────────┐
             │ Event Streaming  │        │ Data Layer               │
             │ NATS / Kafka Bus │        │ Object Store + TSDB      │
             └──────────────────┘        └──────────────────────────┘
```

## Core Capabilities

### Cognitive Visualization
Real-time rendering of particle systems and abstract shapes mapped from AI intention vectors.

### Cognitive Color Thermodynamics
Maps intention vectors, reasoning mode, and system load to dynamic color fields using an Aetherium-specific palette (**AM-UI Color System**). Colors are not aesthetic-only; they encode cognitive and thermodynamic state.

Manifest reads:
- `intent.intent_category`
- `intent.energy_level`
- `intent.emotional_valence`
- `LifeState.mode` (e.g., `NEBULA`, `REASONING`, `DECAY`, `NIRODHA`)

Then applies deterministic AM-UI mapping for:
- background field color
- cognition halo color
- particle tint
- HUD accent

See `docs/10_AMUI_COLOR_SYSTEM.md` for palette tables, state mapping, and shader binding contracts.

### Voice Interaction Pipeline
Simulated voice interface including:
- Voice Activity Detection (VAD)
- Speech-to-Text simulation (STT)
- intent mapping pipeline

### Adaptive Rendering
Dynamic adjustment of:
- frame rate
- rendering complexity
- graphical fidelity

based on runtime performance.

### Accessibility-First Controls
Includes accessible UI primitives such as:
- microphone visualization
- simplified interaction panels
- keyboard and pointer compatibility

### Interactive HUD Panels
Every panel supports:
- close button per panel
- reopen via **Settings → Panels**
- drag-to-move
- resize interaction

### Settings System
Modular configuration with five tabs:
- `Display`
- `Panels`
- `Links`
- `Language`
- `Voice`

Includes external URL analysis entrypoint in Settings (`Analyze URL`).

### Progressive Web Application
Manifest is deployable as a PWA with:
- installable web app behavior
- service worker
- offline-ready assets
- cached runtime resources

---

## API Reference (Prototype)

The repository includes an experimental Cognitive DSL gateway in `api_gateway/`.

### Cognitive Gateway Endpoints
- `POST /api/v1/cognitive/emit`
- `POST /api/v1/cognitive/validate`
- `GET  /health`
- `WS   /ws/cognitive-stream`

### Telemetry Endpoints
- `POST /api/v1/telemetry/ingest`
- `GET  /api/v1/telemetry/query`

### State Sync Endpoint
- `WS /ws/state-sync/{room_id}`

These interfaces enable structured interaction with cognitive signals, telemetry ingestion/query, and collaborative state synchronization.

### AetherBusExtreme
`api_gateway/aetherbus_extreme.py` provides high-performance transport primitives:
- zero-copy socket transmission (`memoryview` + `loop.sock_sendall`)
- immutable message envelopes
- async event queue with backpressure control
- MsgPack serialization helpers
- async NATS integration for distributed deployments
- state convergence processor

---

## Security, Internationalization, and Collaboration

### Security Improvements
#### Async Proxy with SSRF Protection
External fetches are routed through:
- `/api/v1/proxy/fetch`

with safeguards including:
- host allowlists
- private IP blocking
- loopback protection
- RFC reserved network filtering

#### Concurrency Safety
Mutable runtime state is protected using `asyncio.Lock` for:
- telemetry stores
- metrics counters
- state synchronization rooms

#### Schema Contract Validation
Payloads are validated using `jsonschema` with non-mutating validation flow.

### Internationalization (i18n)
Language packs are dynamically loaded from:
- `locales/*.json`

Supports runtime language switching.

### Multi-User State Synchronization
Collaborative sessions are available via:
- `/ws/state-sync/{room_id}`

allowing multiple users to observe and interact with shared cognitive state.

---

## Developer Quick Start

### Run Locally (Frontend)
```bash
python3 -m http.server 4173
# open http://localhost:4173
```

### Run Frontend + API Gateway
```bash
# terminal 1
python3 -m http.server 4173

# terminal 2
cd api_gateway
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- Frontend: `http://localhost:4173`
- Gateway: `http://localhost:8000` (OpenAPI docs at `/docs`)

---

## Project Structure

- `index.html`, `am_color_system.js`, `service-worker.js`, `app.webmanifest`: frontend runtime and PWA assets
- `api_gateway/`: FastAPI cognitive gateway and websocket streams
- `tools/contracts/`: schema and payload contract validation utilities
- `tools/benchmarks/`: latency and stress benchmark helpers
- `docs/`: architecture, interfaces, schemas, safety/governance, and roadmap references

---

## Validation & Tests

```bash
# API gateway tests
cd api_gateway && pytest -q

# contract checks
python3 tools/contracts/contract_checker.py
```

---

## Research & Engineering Roadmap

Future directions:

- **Distributed Runtime State**  
  Move mutable runtime state to Redis for multi-worker consistency.

- **Persistent Telemetry Database**  
  Integrate TSDB backends (InfluxDB, TimescaleDB) with retention + downsampling.

- **Signed Proxy Requests**  
  Add HMAC-signed outbound proxy intent + per-tenant allowlists.

- **Contract Fuzz Testing**  
  Build property-based payload generators + schema mutation corpus + regression suites.

- **Voice Model Experimentation**  
  A/B routing and quality tracking by language-region (WER, latency, accuracy).

- **CRDT Collaboration**  
  Add Yjs/Automerge support for conflict-free collaborative state editing.

- **Plugin Renderer API**  
  Enable custom visual modules without modifying core runtime. Plugin renderers SHOULD respect AM-UI contracts for state-to-color mapping and reserved palette slots (`ERROR`, `WARNING`, `NIRODHA`). They MAY add extension palettes, but MUST preserve core semantics (e.g., failure remains in the Plasma Red spectrum).

- **Session Replay**  
  Timeline scrub + event bookmarks for debugging intent/telemetry behavior.

---

## AM-UI Color System

AM-UI Color System is the color-thermodynamic subsystem for Manifest and the color contract between Genesis and Manifest.

- **Contract role:** AI state → color field → light visualization.
- **Pipeline anchor:** inserted between signal translation and visualization mapping.
- **Runtime source of truth:** `am_color_system.js` in frontend runtime.
- **Canonical reference:** `docs/10_AMUI_COLOR_SYSTEM.md`.

For payload experiments, schema extensions can provide optional hints (e.g., `visual_manifestation.color_semantics.color_mode` and `palette_key`) while frontend remains the source of truth for palette semantics.

---

## Contributing

Contributions are welcome.

Please open an issue first to discuss:
- feature proposals
- architecture improvements
- experimental visualization models

before submitting large pull requests.

## License

This project is released under the MIT License.

---

## เอกสารภาษาไทย (Thai Documentation)

### ภาพรวม
Aetherium Manifest คือเลเยอร์แสดงผลฝั่ง Frontend ของระบบ Aetherium โดยแปลงเจตนา (intent), ความมั่นใจ และสถานะ runtime ของ AI ให้เป็นภาพเคลื่อนไหวเชิงนามธรรมที่ผู้ใช้รับรู้และโต้ตอบได้

### โครงสร้างระบบ
- **AETHERIUM-GENESIS (Backend):** คิด วิเคราะห์ และสร้าง cognitive/intent signals
- **Aetherium Manifest (Frontend):** แสดงผลแบบเรียลไทม์และจัดการ interaction
- **การเชื่อมต่อ:** ผ่าน API/WebSocket บน AetherBus

### ความสามารถปัจจุบัน
- ระบบแสดงผลเรียลไทม์ด้วยอนุภาคและรูปทรงตาม intent vectors
- Voice pipeline (VAD/STT แบบ mock) + intent mapping
- ปรับคุณภาพกราฟิกและเฟรมเรตตามประสิทธิภาพเครื่อง
- Controls ที่เป็นมิตรต่อการเข้าถึง (Accessibility)
- HUD ทุกหน้าต่างมีปุ่มปิด, เปิดคืนจาก Settings > Panels, ลากย้าย และย่อ/ขยายได้
- Settings 5 แท็บ: `Display`, `Panels`, `Links`, `Language`, `Voice`
- Display tab supports scenario presets (`Presentation`, `Meditation`, `Debug`, `Low-power`) to apply multi-setting profiles
- มีช่องวิเคราะห์ URL ภายนอก
- มีโครง telemetry + event bus + delta-state helper
- รองรับ PWA (installable + service worker + asset caching)

### API Gateway (ต้นแบบ)
โฟลเดอร์ `api_gateway/` มี Cognitive DSL gateway พร้อม endpoint สำหรับ emit/validate/health/websocket/telemetry/state-sync

### วิธีรัน Frontend + API Gateway
```bash
# เทอร์มินัล 1
python3 -m http.server 4173

# เทอร์มินัล 2
cd api_gateway
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Frontend: `http://localhost:4173`  
Gateway: `http://localhost:8000` (เอกสาร API ที่ `/docs`)

### โครงสร้างโปรเจกต์โดยย่อ
- `index.html`, `service-worker.js`, `app.webmanifest`: ส่วน frontend และ PWA
- `api_gateway/`: บริการ FastAPI + websocket สำหรับ cognitive stream
- `tools/contracts/`: เครื่องมือตรวจสอบ schema/payload
- `tools/contracts/locale_qa.py`: ตรวจสอบ locale ครบ key และ pseudolocale (`en-XA`) สำหรับ CI
- `tools/benchmarks/`: สคริปต์ benchmark สำหรับ latency/stress
- `docs/`: เอกสารสถาปัตยกรรม อินเทอร์เฟซ ความปลอดภัย และ roadmap

### แนวทางต่อยอด
รายละเอียดแผนระยะถัดไปถูกรวมไว้เพียงจุดเดียวในส่วน **Research & Engineering Roadmap** ด้านภาษาอังกฤษ เพื่อลดข้อมูลซ้ำซ้อนและให้มีแหล่งอ้างอิงเดียวของระบบ.

---
