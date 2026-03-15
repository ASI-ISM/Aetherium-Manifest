# AGENTS.md

## Project Closure Status
- Scope completed: README documentation update aligned with current runtime telemetry database structure and AI-agent extension proposals.
- Last updated by role: Codex implementation agent.
- Date: 2026-03-15.

## Roles
- **Maintainer**: approves roadmap and architecture-level contract changes.
- **Backend Agent**: maintains `api_gateway/` API contract, runtime guards, and telemetry semantics.
- **Frontend Agent**: maintains Manifest rendering contract (`am_color_system.js`, runtime UI semantics).
- **Documentation Agent**: keeps `README.md` and `docs/` synchronized with actual implementation state.
- **QA Agent**: validates schema/runtime consistency, regression tests, and benchmark gates.

## Current Notes
- Telemetry persistence in prototype remains in-memory (`TELEMETRY_TS_DB`) and should be treated as non-durable.
- Suggested extension priorities are tracked in `README.md` under roadmap and AI-agent proposal sections.
