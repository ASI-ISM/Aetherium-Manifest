# AGENTS.md

## Project Overview

Aetherium Manifest is a real-time AI cognition visualization runtime that maps validated intent/state signals into perceptual light/particle rendering. The repository combines a static frontend runtime with a FastAPI gateway, contract-first schemas, runtime governor safety stages, and telemetry/benchmark tooling.

Key technologies:
- Frontend runtime: HTML/CSS/JavaScript + shader assets
- API gateway: Python + FastAPI + Uvicorn
- Contracts/testing: JSON Schema, Python validation tools, TypeScript psycho-safety parity tests
- Tooling: pytest, benchmark scripts, contract checker/fuzzer

## Setup Commands

- Install gateway dependencies: `cd api_gateway && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
- Start frontend dev server: `python3 -m http.server 4173`
- Start API gateway (dev): `cd api_gateway && source .venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
- Build for production: No dedicated frontend bundling step in-repo (static assets served directly). For backend packaging, standard Python deployment flows apply.

## Development Workflow

- Run frontend and gateway in separate terminals (frontend on `:4173`, gateway on `:8000`).
- Use Uvicorn `--reload` for backend hot-reload during development.
- Keep schema/contract changes synchronized with runtime governor behavior before renderer consumption.
- Environment setup:
  - Python 3.x with virtualenv for `api_gateway/`
  - Optional Node tooling for TypeScript parity test (`npx --yes tsx --test ...`)

## Testing Instructions

- Run all core checks:
  - `cd api_gateway && pytest -q`
  - `python3 tools/contracts/contract_checker.py`
  - `python3 tools/contracts/contract_fuzz.py`
  - `python3 tools/benchmarks/runtime_semantic_benchmark.py --input tools/benchmarks/runtime_semantic_samples.sample.json`
  - `npx --yes tsx --test test_runtime_governor_psycho_safety.test.ts`
- Run unit/integration tests:
  - API tests are in the pytest suite under `api_gateway/`
  - TypeScript psycho-safety parity test validates governor behavioral parity path
- Coverage: no dedicated coverage command currently documented in-repo.
- Important pattern: prefer `tsx` for the TS test; `node --test` currently fails due to ESM extensionless import resolution in `governor.ts`.

## Code Style

- Preserve contract-first semantics: schema changes are ABI changes and must remain versioned/compatible.
- Keep runtime mutation authority in governor path only (`validate → transition → profile_map → clamp → fallback → policy_block → capability_gate → telemetry_log`).
- Treat model output as untrusted control signal; enforce deny-by-default style controls via runtime policy.
- Use existing repository conventions and keep README/docs synchronized with implementation updates.
- Lint/format: no single canonical lint/format command is currently enforced project-wide in documentation.

## Build and Deployment

- Frontend is static and can be served by any static host or simple HTTP server.
- API deploys as a FastAPI/Uvicorn service (or equivalent ASGI deployment stack).
- Runtime output/data is currently in-memory for prototype telemetry (`TELEMETRY_TS_DB`), non-durable by default.
- Environment-specific hardening for production should include persistent telemetry storage, key rotation strategy, and governance/compatibility gates.

## Pull Request Guidelines

- Title format: `[component] Brief description`
- Required checks (recommended minimum):
  - `cd api_gateway && pytest -q`
  - `python3 tools/contracts/contract_checker.py`
- Include scope, contract/safety impact, and any schema/runtime compatibility considerations in PR description.
- For ABI-affecting changes, include explicit versioning and migration/compat notes.

## Additional Notes

- Prototype telemetry persistence is intentionally non-durable and intended for deterministic runtime testing.
- Architectural truths to preserve:
  - Governor is canonical control boundary.
  - State-first AI contract semantics are mandatory.
  - Deterministic observability (replay/benchmark/telemetry lockstep) is a release gate.
- Suggested extension priorities remain tracked in `README.md` roadmap and AI-agent proposal sections.
