# Aetherium Manifest

Aetherium Manifest is a contract-first runtime for visualizing AI cognitive state as deterministic light/particle behavior, with a FastAPI gateway and WebSocket state sync.

## What's updated (April 2026)

- `index.html` is now a fully runnable **runtime console** that works end-to-end with:
  - `POST /api/v1/cognitive/emit`
  - `POST /api/v1/cognitive/validate`
  - `POST /api/v1/cognitive/generate`
  - `POST /api/v1/telemetry/ingest`
  - `GET /api/v1/reliability/temporal-morphogenesis`
  - `WS /ws/state-sync/{room_id}`
- Runtime HUD now exposes state/energy/entropy/load + compatibility frame.
- File attachment and voice mock are connected to the same intent pipeline and visualization target field.

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

## Recommended verification

```bash
cd api_gateway && pytest -q
python3 tools/contracts/contract_checker.py
python3 tools/contracts/contract_fuzz.py
python3 tools/benchmarks/runtime_semantic_benchmark.py --input tools/benchmarks/runtime_semantic_samples.sample.json
npx --yes tsx --test test_runtime_governor_psycho_safety.test.ts
npm run lint
```

## Security and governance

- Treat model output as untrusted control signal.
- Governor path remains canonical mutation boundary.
- Contract/schema changes are ABI changes and must stay versioned.
- See [SECURITY.md](SECURITY.md) for disclosure policy.

## License

Licensed under the MIT License. See [LICENSE](LICENSE).
