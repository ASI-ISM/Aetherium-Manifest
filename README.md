# Aetherium Manifest

Aetherium Manifest is a **light-native cognition runtime**: intent is interpreted into deterministic light/particle manifestation with a governor-first safety boundary.

---


## เอกสารแนะนำโครงสร้างระบบสำหรับผู้มาใหม่ (TH)

เพื่อการ onboarding แบบละเอียด (ภาพรวม → โครงสร้างขั้นสูง → ช่องว่างเชิงสถาปัตยกรรม → roadmap การเรียนรู้ → ลำดับความสำคัญในการพัฒนา) ดูเอกสารใหม่:

- `docs/CODEBASE_ONBOARDING_TH.md`

เอกสารนี้เน้นอธิบาย “ฐานข้อมูลเชิงโครงสร้างของโค้ด” และสถานะ data architecture ปัจจุบันอย่างเป็นระบบ โดยไม่มีการเปลี่ยนพฤติกรรม runtime

---
## First-view product boundary

- Homepage is a strict clean-entry surface with a user chat input and send button as the primary control.
- No runtime diagnostics, status banners, or system notification panels are rendered on first view.
- Chat input is sent to canonical cognitive API routes (/api/v1/cognitive/generate or legacy /api/intent) and then streamed to runtime manifestation.
- Manifestation feedback is presented as **particle text** (glyph-shaped particle formations) rather than debug panels.

## Architecture

### Runtime planes
1. **First-use surface (static frontend)**
   - `index.html`
   - `clean-first-surface.css`
   - `clean-first-surface.js`
   - `first_use_surface/*`

2. **Gateway plane (FastAPI / WS / distributed adapters)**
   - `api_gateway/` and top-level gateway helpers
   - request/validation endpoints for emit/validate

3. **Governor plane (canonical control boundary)**
   - `governor/`
   - deny-by-default runtime mutation authority

4. **Contracts + tooling plane**
   - JSON Schemas (root + `docs/schemas/`)
   - contract checker/fuzzer + drift guard (`tools/contracts/`)
   - semantic/latency benchmarks (`tools/benchmarks/`)

### Canonical control boundary
System behavior should preserve this sequence:

`validate → transition → profile_map → clamp → fallback → policy_block → capability_gate → telemetry_log`

This path is the source of truth for safe runtime mutation.

### System architecture diagram (runtime data stores)

> Reality check: the current prototype does **not** use a durable SQL/NoSQL primary database.  
> The gateway keeps critical runtime state in memory, with optional Redis/NATS clients for distributed coordination.

```mermaid
flowchart TD
    U[Frontend Runtime<br/>:4173 static host] -->|HTTPS / WS| G[FastAPI Gateway<br/>api_gateway/main.py]
    G -. placeholder .-> GOV[Runtime Governor<br/>validate→...→telemetry_log]

    subgraph MEM[In-memory data stores (process-local)]
        M1[(METRICS<br/>counters)]
        M2[(TELEMETRY_TS_DB<br/>metric -> points[])]
        M3[(EXPORT_AUDIT_TRAIL<br/>deque maxlen=1000)]
        M4[(TICKET_AUDIT_TRAIL<br/>deque maxlen=2000)]
        M5[(STATE_SYNC_ROOMS<br/>room_id -> StateSyncRoom)]
        M6[(NONCE_CACHE<br/>nonce -> bool)]
    end

    G --> M1
    G --> M2
    G --> M3
    G --> M4
    G --> M5
    G --> M6

    G -. optional .-> R[(Redis<br/>REDIS_URL)]
    G -. optional .-> N[(NATS<br/>NATS_URL)]
```

### Deep database/storage structure (truthful current state)

The gateway data layer is intentionally **ephemeral-first** for deterministic prototyping and replay-style testing. Instead of a persistent RDBMS schema, the system models several bounded in-memory stores:

1. **Telemetry time-series store (`TELEMETRY_TS_DB`)**
   - Type: `Dict[str, List[Dict[str, Any]]]`
   - Logical key: `metric` (for example, latency/coherence series names)
   - Value shape (from `TelemetryPoint`):  
     `metric: str`, `value: float`, `ts: datetime(UTC)`, `tags: Dict[str, str]`
   - Retention policy: each metric series is truncated to the latest **2500 points** during ingest.
   - Query model (`/api/v1/telemetry/query`):
     - windowed filter by `window_seconds`
     - computes `count`, `mean`, `p95`, and `latest`
   - Operational implication: restarts clear all telemetry history unless externalized.

2. **Metrics aggregate store (`METRICS`)**
   - Type: Pydantic model with counters:
     - `total_dsl_submissions`
     - `successful_renders`
     - `validation_failures`
     - `generative_requests`
   - Concurrency control: protected with `METRICS_LOCK` (`asyncio.Lock`).
   - Role: lightweight OLTP-style counters for health/compliance snapshots, not event history.

3. **Export audit ledger (`EXPORT_AUDIT_TRAIL`)**
   - Type: `deque[Dict[str, Any]]` with `maxlen=1000`.
   - Function: bounded append-only audit trail for export operations (currently unpopulated in prototype); queryable by session_id, lineage_id, and selected_variation_id.
   - Characteristic: fixed memory ceiling; oldest records are evicted automatically.

4. **Session ticket audit ledger (`TICKET_AUDIT_TRAIL`)**
   - Type: `deque[Dict[str, Any]]` with `maxlen=2000`.
   - Function: tracks ticket issuance/refresh events (`ticket_id`, `session_id`, role/scope metadata, timestamp).
   - Security note: ticket signatures are HMAC-based, and scope is constrained to approved websocket scopes.

5. **Realtime state rooms (`STATE_SYNC_ROOMS`)**
   - Type: `dict[str, StateSyncRoom]`
   - `StateSyncRoom` internal structure:
     - `shared_state: dict[str, Any]`
     - `user_state: dict[str, Any]`
     - `clients: list[Any]`
     - `lock: asyncio.Lock`
   - Role: collaborative state synchronization for websocket clients.

6. **Nonce cache (`NONCE_CACHE`)**
   - Type: `Dict[str, bool]`
   - Role: placeholder for temporary replay/nonce tracking in-process.

### External data systems (not authoritative primary DB)

- **Redis client** (`redis.asyncio`) and **NATS client** are initialized in application lifespan and are configurable via `REDIS_URL` and `NATS_URL`.
- In current code, the authoritative runtime state discussed above still lives in memory inside the gateway process.
- This means horizontal scaling and durability depend on moving these stores to persistent/shared backends in production architecture.

### Production-grade evolution path (recommended)

If you need durable, queryable, multi-node consistency, the practical migration is:
- TSDB or relational table for telemetry points (partitioned by `metric`, `ts`).
- Durable audit/event table for export and ticket logs.
- Shared session/state backend (Redis or durable event stream) for state rooms/nonce checks.
- Schema/version governance tied to contract-first release gates.

---

## Contracts

Core contracts/schemas in this repo include:
- `particle-control.schema.json`
- `lcl_schema.json`
- `governor/particle-control.schema.json`
- `governor/scholar_contract_v1.json`
- `docs/schemas/*.json` (versioned copies/documentation views)

### Contract policy
- Treat schema changes as **ABI changes**.
- Maintain compatibility/versioning discipline.
- Keep runtime governor behavior synchronized with contract evolution.

---

## Runtime flow

### Intent-to-light flow (first-use surface)
1. User enters the clean first-view surface and provides chat input.
2. Interaction activation lazily starts runtime connectivity (/ws/cognitive-stream via session ticket) and runtime settings.
3. Browser posts chat payload through canonical cognitive routes (/api/v1/cognitive/generate primary or /api/intent legacy); manifestation state is validated via /api/v1/cognitive/validate.
4. Language layer resolves language deterministically:
   - explicit setting → browser locale → char heuristics → optional local detector → session memory
5. Cognitive response orchestrator maps intent class (greeting/question/etc.) to deterministic response text + mood.
6. Particle text pipeline converts response text into glyph masks and then into particle formations rendered in the light scene.
7. Session audit trail appends event metadata (optional export from Settings).

Auth note: if canonical emit responds `401/403`, the surface marks Security/Connectivity state as **Session ticket required** and does not downgrade to legacy `/api/intent` browser fallback.

### Gateway/governor integration flow (full stack)
1. Emit payload is validated against contract.
2. Governor applies transition/profile mapping and constraints.
3. Capability + policy gates enforce deny-by-default behavior.
4. Runtime output and telemetry are published to consumers.

### Particle text pipeline (sub-architecture)
`input → intent → response → glyph mask → particle formation`

1. **Input**
   - Chat text (and optional image attachment on generate route) is normalized and validated at cognitive endpoint ingress.
2. **Intent**
   - Governor-adjacent cognitive mapping classifies intent/state and chooses safe response posture.
3. **Response**
   - Deterministic response text is produced for manifestation payloads.
4. **Glyph mask**
   - Response text is transformed into glyph mask geometry/texture primitives for displayable letterforms.
5. **Particle formation**
   - Runtime maps glyph masks into particle positions/motion envelopes to render readable particle text in-scene.

### Runtime control stages
`validate → transition → profile_map → clamp → fallback → policy_block → capability_gate → telemetry_log`

- `validate`: schema + semantic checks
- `transition`: state machine handoff
- `profile_map`: safe perceptual mapping profile
- `clamp`: hard caps for energy/particle/control limits
- `fallback`: deterministic safe degradation path
- `policy_block`: deny-by-default policy enforcement
- `capability_gate`: runtime/environment capability checks
- `telemetry_log`: deterministic observability trail

### Known limits (current prototype)
- **Latency:** end-to-end chat-to-particle latency depends on network RTT, endpoint processing, and browser render cadence; no hard real-time SLA is guaranteed in current prototype.
- **Max character budget:** long responses may be truncated or visually compacted by glyph/particle layout constraints; keep manifestation-targeted responses concise for readability.
- **Language fallback:** language resolution is deterministic but heuristic-backed; unsupported/ambiguous scripts can fall back to session/default language behavior.

---

## Grammar (LCL summary)

The Light Control Language (LCL) shape is defined in `light-control-language.ts` and `lcl_schema.json`.

### High-level grammar-like view
```txt
LCL := {
  version,
  intent,
  morphology,
  motion,
  optics,
  content,
  constraints,
  source_text,
  retrieved_formation?,
  particle_control
}

intent := create_light_form | create_glyph | create_scene
optics.color_mode := monochrome | palette | source_radiance
```

### Key semantic groups
- **morphology**: form family/symmetry/density/scale/edge softness
- **motion**: archetype/flow/coherence/turbulence/rhythm/attack/settle
- **optics**: palette/luminance/glow/trail/color mode
- **constraints**: max targets/photons/energy hard limits
- **particle_control**: low-level runtime-safe control envelope


### Formal grammar references
- AETH grammar (EBNF): `docs/aeth/spec/grammar.ebnf`
- AETH semantics/versioning: `docs/aeth/spec/semantics.md`, `docs/aeth/spec/versioning.md`
- LCL JSON schema: `lcl_schema.json`

---

## API key setup

Protected gateway endpoints require `X-API-Key` and validate it against environment configuration in the API process:

- `AETHERIUM_API_KEY` for a single key deployment.
- `AETHERIUM_API_KEY_ALLOWLIST` for comma-separated multi-key allowlist support (for staged rotation/migration).

When both are present, the effective allowlist is the union of both values. If neither is configured, the gateway rejects protected endpoint requests (fail closed).

## Local development & checks

### Recommended minimum before PR
```bash
cd api_gateway && pytest -q
python3 tools/contracts/contract_checker.py
```

### Extended verification set
```bash
cd api_gateway && pytest -q
python3 tools/contracts/contract_checker.py
python3 tools/contracts/contract_fuzz.py
python3 tools/benchmarks/runtime_semantic_benchmark.py --input tools/benchmarks/runtime_semantic_samples.sample.json
npx --yes tsx --test test_runtime_governor_psycho_safety.test.ts
```

---

## Notes
- Frontend remains static-host friendly; no mandatory bundle step in-repo.
- Prototype telemetry persistence is intentionally non-durable by default.
- Production hardening should include persistent telemetry storage, key rotation, and compatibility gates.
