# Aetherium Manifest

Aetherium Manifest is a contract-first runtime for visualizing AI cognitive state as deterministic light/particle behavior, with a FastAPI gateway and WebSocket state sync.

## Product definition (April 11, 2026)

**Aetherium = Light-native Creative OS**

Aetherium Manifest is now positioned as a creative operating surface where users do not ask for "effects"; they "converse with light" to produce tangible design outputs:

- poster
- brand visual
- UI concept
- diagram
- ambient scene
- concept art
- motion identity
- document visual

Core embodiment remains a **full-screen light body + bottom composer**, now expanded with governed manifestation states, replayable lineage controls, and multimodal input affordances.

## What's updated (April 2026)

- `index.html` is now a fully runnable **runtime console** that works end-to-end with:
  - `POST /api/v1/cognitive/emit`
  - `POST /api/v1/cognitive/validate`
  - `POST /api/v1/cognitive/generate`
  - `POST /api/v1/telemetry/ingest`
  - `GET /api/v1/telemetry/query`
  - `GET /api/v1/reliability/temporal-morphogenesis`
  - `WS /ws/state-sync/{room_id}` (via `ws_gateway`)
  - `WS /ws/cognitive-stream` (via `ws_gateway`)
- Runtime HUD now exposes state/resonance/entropy with terminal-grade governor checkpoints.
- Composer now supports **Attach + Voice + EMIT** inside a glassmorphism shell for light-native interaction.
- Governed manifestation loop is visible in UI (`Contract Proposed -> Governor Verification -> Manifest`).
- Replayable **Design Lineage Tree** enables time-shift, branch pruning, and iterative exploration.
- Scholar side panel (`AKASHIC SEARCH`) presents mock search summaries and source-trust status.

## Architecture (current)

```text
User Input (Text / File / Voice Mock)
        │
        ▼
index.html runtime console
(intent inference + local deterministic render fallback)
        │
        ├── REST → api_gateway/main.py
        │       /api/v1/cognitive/*
        │       /api/v1/telemetry/ingest
        │       /api/v1/reliability/temporal-morphogenesis
        │
        └── WebSocket → ws_gateway/main.py
                /ws/state-sync/{room_id}
                /ws/cognitive-stream
```

## Quick start

### 1) Frontend only (local visualization)

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

### 2) API gateway

```bash
cd api_gateway
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

### 3) WS gateway

```bash
cd ws_gateway
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8090 --reload
```

> Default local ports are `8080` (API) and `8090` (WS) to avoid bind conflicts. Set **API Base** and **WS Base** in the UI panel accordingly.

### 4) One-command local stack startup (hardened)

```bash
# optional, recommended:
python3 -m venv .venv && source .venv/bin/activate

# starts API + WS (background) and frontend static host (foreground)
./start_services.sh
```

Runtime knobs (environment variables):

- `API_HOST`, `API_PORT`, `API_WORKERS`
- `WS_HOST`, `WS_PORT`, `START_WS_GATEWAY=0|1`
- `FRONTEND_HOST`, `FRONTEND_PORT`
- `LOG_DIR` (default: `./.logs`)
- `REQUIRE_REDIS_FOR_READINESS=0|1`, `REQUIRE_NATS_FOR_READINESS=0|1`

Health and readiness probes:

- API gateway: `GET /health`, `GET /readyz`
- WS gateway: `GET /health`, `GET /readyz`

## Recommended verification

```bash
cd api_gateway && pytest -q
python3 tools/contracts/contract_checker.py
python3 tools/contracts/contract_fuzz.py
python3 tools/benchmarks/runtime_semantic_benchmark.py --input tools/benchmarks/runtime_semantic_samples.sample.json
npx --yes tsx --test test_runtime_governor_psycho_safety.test.ts
npm run lint
```

## Audit backlog hygiene (EN/TH)

- Active audit backlogs are maintained in:
  - `docs/CODEBASE_AUDIT_TASKS_EN.md`
  - `docs/CODEBASE_AUDIT_TASKS_TH.md`
- Both files must keep **pending items only**. Completed recommendations should be removed to avoid mixing finished work with active tasks.

## Notes on runtime security defaults

- Protected API endpoints are fail-closed when `AETHERIUM_API_KEY` is not configured.
- Telemetry storage is intentionally in-memory (`TELEMETRY_TS_DB`) for deterministic local testing.

## Security and governance

- Treat model output as untrusted control signal.
- Governor path remains canonical mutation boundary.
- Contract/schema changes are ABI changes and must stay versioned.
- See [SECURITY.md](SECURITY.md) for disclosure policy.

## License

Licensed under the MIT License. See [LICENSE](LICENSE).
