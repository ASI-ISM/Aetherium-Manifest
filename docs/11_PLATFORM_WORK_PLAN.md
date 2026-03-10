# Platform Work Plan: System-wide Consistency, Bug Fixing, and Documentation Consolidation

## Context
- **Initiative:** Aetherium Manifest Platform Integrity Program
- **Scope:** `api_gateway`, frontend runtime/docs, contracts/testing, operational documentation
- **Drivers:** reliability, security, maintainability, documentation correctness, developer experience
- **Current state:** major test suites pass, but there are still consistency/security gaps (e.g., unauthenticated state-sync WebSocket and permissive proxy behavior) and duplicated roadmap content across bilingual README sections
- **Target state:** high-priority security and consistency defects are fixed, docs are deduplicated with a single canonical roadmap source, and work is organized into measurable platform execution tracks
- **Constraints:** keep backward compatibility for current API consumers, low-risk incremental changes, maintain green CI (`pytest`)
- **Dependencies:** API gateway maintainers, frontend/documentation owners, CI pipeline maintainers

---

## 1) Workstreams

### A. Architecture
- Define one canonical planning source for roadmap and platform direction.
- Keep bilingual documentation as presentation layers, not duplicate planning systems.
- Preserve existing runtime/API boundaries while applying targeted hardening.

### B. Protocol
- Enforce authentication consistency across REST and WebSocket paths.
- Define proxy URL safety guardrails as explicit protocol behavior (no credentials, no redirect traversal).

### C. Reliability
- Add regression coverage for newly fixed gateway hardening cases.
- Keep existing quality and contract tests green.

### D. Benchmark
- Continue existing latency/stress benchmark gates from current toolchain.
- Validate no regressions introduced by security hardening in normal flows.

### E. Ops
- Clarify operational docs so contributors know where roadmap truth lives.
- Keep API behavior clear for incident and troubleshooting playbooks.

### F. Migration
- Migrate duplicated README roadmap content to a single canonical section.
- Update Thai section to reference canonical roadmap source instead of re-listing duplicated items.

---

## 2) Backlog (Epic → Story → Task + measurable acceptance)

### Epic 1: Security and Protocol Integrity

#### Story 1.1: Protect collaborative state WebSocket
- **Task 1.1.1:** Require API key validation in `/ws/state-sync/{room_id}` using header/query extraction.
- **Acceptance:** unauthenticated connection attempts are closed with policy violation (1008) and do not join room state.

#### Story 1.2: Harden proxy endpoint against credential/redirect abuse
- **Task 1.2.1:** Reject proxy URLs containing embedded credentials.
- **Task 1.2.2:** Disable redirect following and reject redirect responses.
- **Acceptance:**
  - URL with username/password returns HTTP 400.
  - Redirect response path is rejected with HTTP 403.
  - Existing valid direct fetch behavior remains unchanged.

### Epic 2: Test and Quality Guardrail Expansion

#### Story 2.1: Add regression tests for hardening changes
- **Task 2.1.1:** Add API test for state-sync WebSocket requiring API key.
- **Task 2.1.2:** Add API test for proxy credential rejection.
- **Acceptance:** all tests pass and explicitly cover both failure modes.

### Epic 3: Documentation Unification and Deduplication

#### Story 3.1: Remove duplicated roadmap content
- **Task 3.1.1:** Remove redundant legacy extension section from README.
- **Task 3.1.2:** Replace duplicated Thai roadmap bullets with canonical reference pointer.
- **Acceptance:** roadmap/extension planning appears once; Thai section no longer duplicates strategic items.

---

## 3) Options, Tradeoffs, and Recommendation

### Option A (Chosen): Targeted hardening + regression tests + README deduplication
- **Pros:** minimal disruption, immediate risk reduction, fast delivery, clear auditability.
- **Cons:** incremental approach; does not redesign entire auth/transport stack.

### Option B: Full auth middleware refactor for all WS/HTTP paths
- **Pros:** strong long-term standardization and reduced drift risk.
- **Cons:** larger migration risk, broader testing matrix, longer delivery timeline.

### Option C: Introduce centralized outbound request policy service
- **Pros:** reusable policy across services with richer enforcement.
- **Cons:** adds infra dependency and deployment complexity not justified for current scope.

**Recommendation:** choose **Option A** now for immediate high-priority risk reduction while preserving delivery velocity and compatibility.

---

## 4) Risks, Failure Modes, and Mitigation Plan

- **Risk:** Existing clients using unauthenticated state-sync break unexpectedly.
  - **Failure mode:** WebSocket connection closes at handshake.
  - **Mitigation:** document API key requirement clearly and provide migration note in gateway docs.

- **Risk:** Proxy consumers relying on redirect traversal fail.
  - **Failure mode:** previously indirect URLs no longer resolve.
  - **Mitigation:** require callers to supply final allowed URL directly; log rejected redirects for diagnostics.

- **Risk:** Documentation drift reappears after future edits.
  - **Failure mode:** duplicated roadmap bullets return in bilingual sections.
  - **Mitigation:** enforce “single canonical roadmap section” contribution rule in documentation review checklist.

---

## 5) Rollout / Rollback Plan (Owner + Timeline)

### Owners
- **Gateway hardening:** API Gateway owner
- **Tests and CI checks:** Quality owner
- **README consolidation:** Documentation owner

### Timeline
- **Day 0:** implement hardening changes and tests.
- **Day 0:** run full local test suite and verify no regressions.
- **Day 1:** merge and monitor usage issues from gateway clients.

### Rollback
- Revert WebSocket auth enforcement commit if compatibility incident occurs.
- Revert proxy redirect/credential constraints only if critical business flow depends on them (temporary emergency rollback).
- Keep tests aligned with whichever behavior is active after rollback.

---

## 6) Production Definition of Done

- **Tests**
  - Unit/API regression tests pass (`pytest -q`).
  - New tests cover state-sync auth and proxy credential rejection paths.

- **SLO gates**
  - No increase in gateway error rates for authenticated standard paths.

- **Benchmarking gates**
  - Existing benchmark scripts remain runnable and unchanged in intent.

- **Observability**
  - Rejected proxy and unauthorized WS attempts remain diagnosable via HTTP/WS error details.

- **Runbooks**
  - Docs specify canonical roadmap source and API key requirement for state-sync WS.

- **Security checks**
  - SSRF posture improved by disallowing URL credentials and redirect traversal.
  - State synchronization channel now enforces authentication parity with other protected endpoints.

---

## Redundant Information Removed for Single Source of Truth

- Removed duplicated roadmap list under Thai README section.
- Removed `Extension Ideas (Legacy)` section that repeated roadmap concepts.
- Kept one canonical strategic list in `Research & Engineering Roadmap`.
