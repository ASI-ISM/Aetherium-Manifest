# Platform Work Plan: README Suggestion Execution

## Context
- **Initiative:** Manifest Runtime Hardening + UX Presets
- **Scope:** Frontend settings module, i18n quality gates, CI quality checks
- **Drivers:** reliability, security hygiene, devex, predictable operations
- **Current state:** runtime has configurable settings and multilingual bundles, but lacked preset profiles and locale QA automation
- **Target state:** preset-driven runtime profiles and CI-enforced locale consistency including pseudolocale validation
- **Constraints:** preserve existing APIs/UI behavior, low implementation risk, no infra migration in this step
- **Dependencies:** frontend maintainers, API gateway test pipeline, GitHub Actions

## 1) Workstreams

### A. Architecture
- Define preset domain model for display/quality/voice/mini-box toggles
- Add deterministic preset application flow in runtime state update path

### B. Protocol
- Emit command-bus event `display:preset` on preset activation
- Sync state patch with preset metadata for collaborative state channels

### C. Reliability
- Add locale QA scanner for missing and extra key drift
- Enforce pseudolocale (`en-XA`) existence and divergence from base locale

### D. Benchmark
- Add CI gate for locale QA alongside contract checker
- Keep existing runtime benchmark gates unchanged

### E. Ops
- Add pseudolocale bundle to service-worker cache list
- Document operational checklist for translation additions

### F. Migration
- Migrate README roadmap by removing now-implemented proposals
- Keep backlog focused on remaining future directions

## 2) Backlog (Epic → Story → Task with measurable acceptance)

## Epic 1: Scenario Presets Runtime
### Story 1.1: Add preset selector
- Task: Add `Scenario Preset` dropdown in Display settings tab
- **Acceptance:** UI renders 5 options (`custom`, `presentation`, `meditation`, `debug`, `low-power`)

### Story 1.2: Implement preset behavior
- Task: Add preset map and apply handler
- **Acceptance:** selecting preset updates display page, quality tier/FPS, voice mode, and mini-box visibility in one user action

### Story 1.3: Integrate telemetry/sync
- Task: emit command event and state sync patch on preset apply
- **Acceptance:** applying a preset emits `display:preset` and sends sync patch payload with `scenarioPreset`

## Epic 2: Locale QA CI Gate
### Story 2.1: Missing key scanner
- Task: build `tools/contracts/locale_qa.py`
- **Acceptance:** script exits non-zero for missing/extra translation keys vs base locale

### Story 2.2: Pseudolocale coverage
- Task: add `locales/en-XA.json` and validate transformed text
- **Acceptance:** QA script exits non-zero if pseudolocale missing or has unchanged base strings

### Story 2.3: CI integration
- Task: add locale QA step in workflow
- **Acceptance:** PR workflow executes locale QA before runtime-quality job completion

## 3) Options and Tradeoffs

1. **Option A (chosen): static in-app preset map + CI script gate**
   - Pros: simple, deterministic, low runtime overhead, easy maintainability
   - Cons: presets require code deploy to change

2. **Option B: server-provided preset policy via API**
   - Pros: dynamic tuning without frontend redeploy
   - Cons: adds API dependency, failure modes on fetch, higher complexity

3. **Option C: user-authored JSON preset packs**
   - Pros: high flexibility for power users
   - Cons: validation and security surface increase, weaker guardrails

**Chosen rationale:** Option A fits current scope and constraints while removing two README gaps with minimal operational risk.

## 4) Risks, Failure Modes, Mitigation
- **Risk:** Preset overrides user expectation unexpectedly.
  - Mitigation: keep `custom` mode and apply only on explicit selection.
- **Risk:** Locale QA blocks PRs due to translation drift.
  - Mitigation: clear error messages listing exact missing/extra keys.
- **Risk:** Pseudolocale not cached offline.
  - Mitigation: include in service worker core assets.

## 5) Rollout/Rollback (Owner + Timeline)
- **Owner:** Frontend platform maintainer
- **Rollout timeline:**
  - Day 0: merge code + docs + CI gate
  - Day 1: verify workflow pass and manual UI smoke test
- **Rollback plan:**
  - Revert preset dropdown + handler section in `index.html`
  - Remove locale QA workflow step and pseudolocale file
  - Re-run workflow to confirm baseline restored

## 6) Production Definition of Done
- **Tests:**
  - locale QA script passes on all committed locale files
  - existing contract checker passes
- **SLO gates:** no regression to existing runtime-quality checks
- **Benchmark gates:** existing latency/stress benchmarks remain green
- **Observability:** preset application emits command event for telemetry stream
- **Runbooks:** translation addition checklist: add key in `en` + all locales + `en-XA`
- **Security checks:** no new remote code paths; preset logic is local deterministic mapping
