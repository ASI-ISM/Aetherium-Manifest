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

The current prototype architecture is centered on runtime state semantics and the runtime database structure, with the Governor as the single mutation authority and telemetry/state-sync stores modeled explicitly:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           AI PARTICLE CONTROL CONTRACT (Schema = ABI, versioned)                            │
│                 payload envelope: intent_state + renderer_controls + optional metadata                       │
└──────────────────────────────────────────────────┬───────────────────────────────────────────────────────────┘
                                                   │ validate + normalize
                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                     RUNTIME GOVERNOR (single mutable control boundary / canonical path)                     │
│ validate → transition → profile_map → clamp → fallback → policy_block → capability_gate → telemetry_log    │
└──────────────────────────────┬───────────────────────────────────────────────────────────────┬───────────────┘
                               │ governor-approved state envelope                              │ telemetry events
                               ▼                                                                ▼
┌────────────────────────────────────────────────────────────────────────────┐   ┌─────────────────────────────────┐
│ FRONTEND RUNTIME (Manifest/HUD/Renderer)                                  │   │ TELEMETRY INGEST + QUERY API    │
│ consumes state-first contract only                                         │   │ /api/v1/telemetry/ingest|query  │
└──────────────────────────────┬─────────────────────────────────────────────┘   └─────────────────┬───────────────┘
                               │ websocket sync / snapshots                                  writes + retention
                               ▼                                                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐   ┌─────────────────────────────────┐
│ STATE_SYNC_ROOMS (in-memory room store)                                   │   │ TELEMETRY_TS_DB (in-memory TSDB)│
│ dict[room_id, StateSyncRoom]                                               │   │ dict[str, list[point]]          │
│ StateSyncRoom = {                                                           │   │ point={metric,value,ts,tags}    │
│   version:int, shared_state:dict, user_state:dict, updated_at:datetime     │   │ partition key: metric           │
│ }                                                                           │   │ retention: keep latest 2500/metric
│ endpoint: /ws/state-sync/{room_id}                                          │   │ query window: count/mean/p95/latest
└────────────────────────────────────────────────────────────────────────────┘   └─────────────────────────────────┘
```

This diagram aligns with the target storage/control model documented under **Runtime Database Structure (Proposed)**:
- **State before feature:** runtime semantics are defined before effects.
- **Governor is the only mutate point:** state mutation is centralized.
- **Schema is ABI:** payload versioning and evolution rules protect FE/BE contract parity.
- **Telemetry is feedback, not only logs:** query results can drive HUD and render modulation.

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

### Canonical Visual States (MVP v1)

Manifest MVP locks seven canonical visual states as the center of runtime semantics:

- `IDLE`
- `LISTENING`
- `THINKING`
- `RESPONDING`
- `WARNING`
- `ERROR`
- `NIRODHA`

```ts
export type VisualState =
  | "IDLE"
  | "LISTENING"
  | "THINKING"
  | "RESPONDING"
  | "WARNING"
  | "ERROR"
  | "NIRODHA";
```

Governor and renderer rules for v1:
- `WARNING`, `ERROR`, `NIRODHA` are reserved semantics and must keep their core palette meaning.
- `LISTENING` must be triggerable from voice/sensor events.
- `THINKING -> RESPONDING` should transition smoothly (no hard-cut flicker).
- `ERROR` semantics override aesthetic renderer/plugin preferences.

Non-canonical overlays should remain separate from the core state machine (examples: `SENSOR_ACTIVE`, `LOW_POWER`, `NETWORK_DEGRADED`, `HUMAN_OVERRIDE`, `MUTED`).

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
- `WS   /ws/cognitive-stream` (served by `ws_gateway` service)

### Telemetry and State Sync
Telemetry ingest/query remains queue-first and websocket/state-sync now runs as a dedicated `ws_gateway` service (`ws_gateway/main.py`) backed by Redis Streams for room event durability.

These currently implemented interfaces enable structured interaction with cognitive signals and real-time cognitive stream inspection.

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
- `/ws/state-sync/{room_id}` (served by `ws_gateway` service)

allowing multiple users to observe and interact with shared cognitive state.


### Policy Documents
- Security policy: `SECURITY.md`
- Copyright notice: `COPYRIGHT.md`

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

### TypeScript Governor Schema Validation (Ajv)

The Manifest runtime is intentionally positioned as a visualization runtime that consumes transport-level signals (API/WebSocket). To preserve that contract boundary, place schema validation in the Governor path before state is released to the renderer.

Core helper APIs in `ajv_validator.ts`:
- `createParticleControlAjv()`
- `compileParticleControlValidator()`
- `validateParticleControlPayload()`
- `createGovernorSchemaValidator()`
- `createAjvGovernor()`
- `assertParticleControlSchemaCompiles()`

Install required packages:

```bash
npm install ajv ajv-formats
```

`ajv-formats` is required because Ajv v7+ separates format validators (for example `date-time`) from the core package.

Example:

```ts
import { createAjvGovernor } from "./ajv_validator";

const governor = createAjvGovernor();

const decision = governor.process(payload, {
  previous_state: "THINKING",
  device_tier: "MID",
});
```
---

## Project Structure

- `index.html`, `am_color_system.js`, `service-worker.js`, `app.webmanifest`: frontend runtime and PWA assets
- `api_gateway/`: FastAPI cognitive gateway and websocket streams
- `tools/contracts/`: schema and payload contract validation utilities
- `tools/benchmarks/`: latency and stress benchmark helpers
- `docs/`: architecture, interfaces, schemas, safety/governance, and roadmap references

### Runtime Data Structure (Current Prototype)

This section describes the runtime data paths that are implemented in this repository today:

- Telemetry ingestion route is live in `api_gateway/main.py`:
  - `POST /api/v1/telemetry/ingest`
  - Points are accepted as `TelemetryIngestRequest(points: list[TelemetryPoint])`
  - Each point shape is `{"metric": str, "value": float, "ts": datetime, "tags": dict[str, str]}`
  - Ingested points are queued to Redis list `telemetry:queue` for downstream workers
- State sync websocket routes are live in `ws_gateway/main.py`:
  - `WS /ws/state-sync/{room_id}`
  - `WS /ws/cognitive-stream`
  - Incoming room/cognitive events are appended to Redis Streams (state-sync:{room_id} or state-sync:cognitive) with MAXLEN ~ 1000

Current frontend/kernel runtime telemetry tracks `fps`, `dropped_frames`, `particle_count`, `average_velocity`, `last_ai_command`, and `policy_block_count` before forwarding or persisting samples.

The runtime governor also includes a `psycho_safety_gate` stage that now tracks cadence/flicker/luminance time-series samples, enforces a WCAG-aligned cadence ceiling (`<= 3` flashes/sec), applies IEEE 1789-inspired low-frequency flicker mitigation, and contains gradual frequency drift patterns before policy-block evaluation.

---


## Tiny Reasoning + Light-Text Prototype

A compact prototype is available at `tools/tiny_reasoning_light_model.py` for teams that want a RAM-bounded reasoning module plus deterministic light-text output.

- Trains from specialized samples (`SpecializedSample`) instead of full-scale LLM pretraining.
- Uses a compact intent scorer to keep memory footprint small (`ram_budget_mb` hint for deployment planning).
- Emits `matrix_5x7` light frames with safety profile clamps (`max_fps`, `max_brightness`, `flicker_hz_cap`) to support low-sensory/no-flicker display modes.

Quick smoke run:

```bash
python - <<'PY2'
from tools.tiny_reasoning_light_model import bootstrap_demo_model
m = bootstrap_demo_model()
print(m.respond("summarize runtime governor pipeline"))
print(m.render_light_frames("HI")[0])
PY2
```

## Validation & Tests

```bash
# API gateway tests
cd api_gateway && pytest -q

# contract checks
python3 tools/contracts/contract_checker.py
python3 tools/contracts/contract_fuzz.py

# release benchmark gates (performance + semantics)
python3 tools/benchmarks/runtime_semantic_benchmark.py --input tools/benchmarks/runtime_semantic_samples.sample.json

# TypeScript psycho-safety parity test (run via tsx)
npx --yes tsx --test test_runtime_governor_psycho_safety.test.ts
```

> Verification note: `node --test test_runtime_governor_psycho_safety.test.ts` currently fails in this repo because Node ESM resolution does not resolve extensionless imports in `governor.ts`. Use the `tsx` command above for this test without changing runtime implementation.

---

## Research & Engineering Roadmap

Future directions:

- **Distributed Runtime State**  
  Move mutable runtime state to Redis for multi-worker consistency.

- **Persistent Telemetry Database**  
  Integrate TSDB backends (InfluxDB, TimescaleDB) with retention + downsampling.

- **Proxy Key Rotation and Tenant Scope**  
  Add key identifiers (`kid`) with dual-key rotation windows and optional tenant-scoped signing secrets.

- **Contract Drift Telemetry Export**  
  Export drift-guard structural match and policy-violation rates into telemetry for dashboarding and alerting.

- **Voice Model Experimentation**  
  A/B routing and quality tracking by language-region (WER, latency, accuracy).

- **CRDT Collaboration**  
  Add Yjs/Automerge support for conflict-free collaborative state editing.

- **Plugin Renderer API**  
  Enable custom visual modules without modifying core runtime. Plugin renderers SHOULD respect AM-UI contracts for state-to-color mapping and reserved palette slots (`ERROR`, `WARNING`, `NIRODHA`). They MAY add extension palettes, but MUST preserve core semantics (e.g., failure remains in the Plasma Red spectrum).

- **Session Replay**  
  Timeline scrub + event bookmarks for debugging intent/telemetry behavior.

- **Telemetry Tiered Retention**  
  Add hot/warm/cold retention tiers so short-window diagnostics remain fast while long-window summaries stay queryable.

- **Operator Query Presets**  
  Package reusable telemetry query profiles for safety-watch, motion-stability, and performance triage workflows.

- **Runtime Anomaly Detection**  
  Detect outlier combinations such as `fps` collapse + `policy_block_count` spikes and publish operator-facing alerts.

- **Psycho-Safety Gate Hardening**  
  Add dedicated psycho-safety metrics (flicker cadence, luminance drift budget, consent mode flags) and enforce deny-by-default mutation for high-risk render transitions.

- **State-Sync Persistence Adapter**  
  Introduce optional snapshot persistence for `STATE_SYNC_ROOMS` (Redis/Postgres adapter) while preserving websocket contract and room version semantics.

- **Governance Audit Trail Ledger**  
  Record schema/version approvals, compatibility decisions, and rollout exceptions with trace IDs for incident replay and compliance review.

- **Edge Runtime Degradation Profiles**  
  Add deterministic low-power profiles that couple renderer quality, telemetry sampling rate, and policy thresholds for constrained devices.

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

## Cognitive DSL API Gateway (New)

มีการเพิ่มโครงสร้าง API Gateway ตัวอย่างในโฟลเดอร์ `api_gateway/` เพื่อรองรับการรับ Cognitive DSL จากโมเดลภายนอกตาม success metrics:

- `POST /api/v1/cognitive/emit`
- `POST /api/v1/cognitive/validate`
- `GET /health`
- `WS /ws/cognitive-stream`

พร้อมตัวอย่าง payload, startup script และ middleware validation ตามกฎ Firma.


## Prototype: Manifestation Deck (Implemented)

### โครงสร้างระบบ
- **AETHERIUM-GENESIS (Backend):** คิด วิเคราะห์ และสร้าง cognitive/intent signals
- **Aetherium Manifest (Frontend):** แสดงผลแบบเรียลไทม์และจัดการ interaction
- **การเชื่อมต่อ:** ผ่าน API/WebSocket บน AetherBus

- **Input Deck (Glassmorphism):** bottom control deck with attachment, voice toggle, and send actions.
- **Intent Processing:** keyword-triggered manifest mode for Thai landscape intents (`ทะเล`, `น้ำตก`, `ภูเขา`) plus `sea`.
- **Light-Based Response:** holographic center projection + particle behavior transitions instead of chat bubbles.
- **File Intake:** PDF/image attachment buffer with inline chip preview.
- **Freeze Light System:** floating controls for Freeze/Save/Erase/Light Pen, voice-trigger keywords (`แช่แข็ง`, `freeze`, `บันทึก`, `ลบ`, `วาด`), frozen-point editing, and export UI for PNG plus printable PDF fallback.

### API Gateway (ต้นแบบ)
โฟลเดอร์ `api_gateway/` มี Cognitive DSL gateway พร้อม endpoint สำหรับ emit/validate/health และ websocket cognitive-stream

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

### โครงสร้างข้อมูล Runtime (ต้นแบบปัจจุบัน)

ส่วนนี้สรุปโครงสร้างข้อมูล runtime ที่มีใช้งานจริงในรีโป:

- ฝั่ง telemetry (`api_gateway/main.py`)
  - มี endpoint `POST /api/v1/telemetry/ingest`
  - รับข้อมูลผ่าน `TelemetryIngestRequest(points)` โดยแต่ละจุดมี `metric`, `value`, `ts`, `tags`
  - เมื่อ ingest แล้วจะถูกส่งเข้าคิว Redis list ชื่อ `telemetry:queue`
- ฝั่ง state sync (`ws_gateway/main.py`)
  - มี websocket `WS /ws/state-sync/{room_id}` และ `WS /ws/cognitive-stream`
  - event ที่รับเข้าจะถูกเขียนลง Redis Streams (state-sync:{room_id} หรือ state-sync:cognitive) พร้อมนโยบาย MAXLEN ~ 1000

สำหรับ production ควรเสริม persistence/retention/query layer เพิ่มเติม โดยไม่ทำลายสัญญา API และสัญญา websocket เดิม.

### แนวทางต่อยอด (ภาษาไทย)

- **เสริม Psycho-Safety Gate เชิงรุก**  
  เพิ่มตัวชี้วัด cadence/flicker/luminance drift พร้อม consent mode (`low-sensory`, `no-flicker`, `monochrome`) และบังคับ deny-by-default สำหรับการเปลี่ยนค่าสี/แสงที่มีความเสี่ยง

- **เพิ่มตัวเลือก Persistent Store ให้ State Sync**  
  รองรับ adapter แบบ Redis/Postgres สำหรับ snapshot ของห้อง (`STATE_SYNC_ROOMS`) โดยยังคง contract ของ websocket และ room version เดิม

- **สร้าง Governance Audit Trail แบบตรวจสอบย้อนหลังได้**  
  บันทึกการอนุมัติ schema/version, ผล compatibility check, และ rollout exception ผูกกับ trace ID เพื่อช่วย incident replay และ compliance review

- **Edge Degradation Profiles สำหรับอุปกรณ์ทรัพยากรจำกัด**  
  ผูกการลดคุณภาพ renderer, อัตรา sampling telemetry, และ policy thresholds เข้าด้วยกันแบบ deterministic เพื่อคงเสถียรภาพการรับรู้

- **Spatial Extension Contract สำหรับ AR/VR**  
  เพิ่มสัญญาเสริมด้าน anchor/depth/occlusion แยกจาก `intent_state` หลัก เพื่อรองรับ WebXR/OpenXR โดยไม่กระทบ ABI ปัจจุบัน

---

## AETHERIUM Ecosystem Memory Ledger

To preserve build context across implementation rounds, this repository records first-party ecosystem dependencies and partner projects as a persistent memory note.

Canonical ecosystem repositories (provided by maintainer context):

1. The Book of Formation – AETHERIUM GENESIS: https://github.com/FGD-ATR-EP/The-Book-of-Formation-AETHERIUM-GENESIS
2. PRGX-AG: https://github.com/FGD-ATR-EP/PRGX-AG
3. LOGENESIS-1.5: https://github.com/FGD-ATR-EP/LOGENESIS-1.5
4. BioVisionVS1.1: https://github.com/FGD-ATR-EP/BioVisionVS1.1

Working agreement for future changes:
- Treat these repositories as part of the AETHERIUM native ecosystem context.
- Prefer contract-compatible evolution paths that keep Manifest and AetherBus-Tachyon semantically aligned.
- Record architecture assumptions in-repo before implementing ABI-impacting changes.
