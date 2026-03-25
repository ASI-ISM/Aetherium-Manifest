# AGENTS.md

## Project Closure Status
- Scope completed: README documentation update aligned with current runtime telemetry database structure and AI-agent extension proposals.
- Last updated by role: Codex implementation agent.
- Date: 2026-03-25.

## Roles
- **Maintainer**: approves roadmap and architecture-level contract changes.
- **Backend Agent**: maintains `api_gateway/` API contract, runtime guards, and telemetry semantics.
- **Frontend Agent**: maintains Manifest rendering contract (`am_color_system.js`, runtime UI semantics).
- **Documentation Agent**: keeps `README.md` and `docs/` synchronized with actual implementation state.
- **QA Agent**: validates schema/runtime consistency, regression tests, and benchmark gates.

## Current Notes
- Telemetry persistence in prototype remains in-memory (`TELEMETRY_TS_DB`) and should be treated as non-durable.
- Suggested extension priorities are tracked in `README.md` under roadmap and AI-agent proposal sections.

## Architectural Truths (Grounded in Repository)
- Canonical control boundary is **Runtime Governor** only: `validate → transition → profile_map → clamp → fallback → policy_block → capability_gate → telemetry_log`.
- AI contract must preserve **state-first semantics** and keep renderer-level style controls bounded by policy.
- Contract-first is mandatory: schema changes are ABI changes and require versioning, compatibility checks, and governance review.
- Deterministic observability is a release gate: replay, benchmark, and telemetry must stay lockstep.

## Global AI Embodiment Guidance

### 1) Cross-model semantic standardization
- Keep a compact semantic core shared across providers (`intent`, `state`, uncertainty, relational intent).
- Preserve provider identity through approved style channels (e.g., shader uniforms / runtime profile), without violating semantic invariants.
- Centralize normalization/mapping through shared adapter logic to avoid frontend/backend drift.

### 2) Evolution boundaries (self-modifying behavior)
- Runtime AI must **not** directly mutate ABI/schema at run time.
- Evolution is allowed via:
  - substate expression inside existing state contracts,
  - additive renderer/runtime extensions behind feature flags,
  - governed proposal artifacts that pass CI checks before promotion.

### 3) Psychological safety and anti-manipulation
- Clamp-only safety is insufficient for long-horizon risk.
- Add a dedicated **psycho-safety gate** before policy block with:
  - temporal/frequency constraints for light pulses,
  - cumulative drift detection on cadence/flicker/luminance proxies,
  - user capability + consent modes (low sensory / no flicker / monochrome).
- Treat all model output as untrusted control signal; enforce deny-by-default control mutation.

### 4) Spatial expansion (AR/VR/Holographic path)
- Preserve `intent_state` semantics; add spatial extensions as separate contracts (anchors, depth source, occlusion policy).
- Web path: WebXR adapters (layers/hit-test/depth/dom-overlay where applicable).
- Native path: OpenXR-compatible runtime adapter.

### 5) Latency and mind-body coherence
- Optimize for **perceived latency**, not raw RTT alone.
- Use predictive execution/ghost previews with explicit commit/rollback semantics.
- Keep timeline coupling through trace IDs + shared timestamps across token, state, and frame streams.

## Quality Gates for World-Scale Rollout
- Contract checker enforcement: field evolution metadata + compatibility + runtime/schema anti-drift.
- Runtime benchmark gates: latency p95, semantic continuity, render stability, containment activation targets.
- Drift-detection acceptance criteria must be explicit and auditable before canary/GA promotion.
- Rollback drills and incident replay are required definition-of-done for risky releases.
