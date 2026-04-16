# Aetherium Manifest — One-Page Summary

## What it is
- Aetherium Manifest is a real-time visualization interface that maps AI intent, confidence, and runtime state into light/particle motion so cognition is observable to humans.

## Who it’s for
- Primary persona: AI platform developers/operators who need interpretable runtime behavior, safety-governed state transitions, and deterministic telemetry feedback.

## What it does
- Renders AI cognition as dynamic particles/light in a static web frontend runtime.
- Enforces contract-first payload semantics via versioned schemas (schema = ABI).
- Applies governor-controlled safety stages before renderer/runtime state is accepted.
- Exposes FastAPI endpoints for cognitive emit, cognitive validate, health, telemetry ingest/query, and cognitive websocket streaming.
- Tracks in-memory runtime telemetry for query windows (count/mean/p95/latest).
- Includes contract validation/fuzzing and benchmark tooling for replay/drift/latency checks.

## How it works (repo-evidence architecture)
- Producer/model emits cognitive payload envelope -> gateway validates/normalizes input.
- Runtime governor pipeline: validate -> transition -> profile_map -> clamp -> fallback -> policy_block -> capability_gate -> telemetry_log.
- Governor-approved state feeds frontend renderer/HUD; telemetry points are written to `TELEMETRY_TS_DB` (in-memory); room/shared state is tracked in `STATE_SYNC_ROOMS`.
- Not found in repo: a live `/ws/state-sync/{room_id}` route implementation in `api_gateway/main.py` (state-sync is documented architecturally, but websocket route is not present there).

## How to run (minimal)
1. Create backend venv + install deps:
   - `cd api_gateway && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
2. Start frontend:
   - `python3 -m http.server 4173`
3. Start gateway (new terminal):
   - `cd api_gateway && source .venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
4. Open frontend at `http://localhost:4173` and API at `http://localhost:8000/docs`.
