# CODEX / PLATFORM_ONE_SHOT

> Use this template for one-shot planning and execution alignment.

## Goal
`{เป้าหมาย}`

## Scope
`{ระบบ/ส่วนที่กระทบ}`

---

## 1) Assumptions
- Business objective and acceptance criteria are confirmed by product owner.
- Impacted systems are identifiable and dependency owners are available.
- Non-functional requirements (latency, reliability, security, cost) are defined.
- Rollout window and rollback policy are approved by operations.
- Required data/privacy approvals are in place before production use.

---

## 2) Work plan (owners + timeline)

### Epic breakdown
- **Epic E1: Discovery & Design** (Owner: Product + Tech Lead, ETA: Week 1)
- **Epic E2: Implementation & Integration** (Owner: Engineering, ETA: Week 2–3)
- **Epic E3: Validation & Readiness** (Owner: QA + SRE, ETA: Week 4)
- **Epic E4: Rollout & Stabilization** (Owner: SRE + On-call Eng, ETA: Week 5)

### Story/Task decomposition
- **Story S1: Requirements lock**
  - Task T1.1: Finalize in-scope components and contract boundaries
  - Task T1.2: Define SLIs/SLOs and benchmark targets
- **Story S2: Architecture changes**
  - Task T2.1: Update interface/schema/contracts
  - Task T2.2: Add migration/backward-compat controls
- **Story S3: Build and hardening**
  - Task T3.1: Implement feature flags and failure handling
  - Task T3.2: Add tests, load checks, and operational alerts
- **Story S4: Launch readiness**
  - Task T4.1: Dry-run in staging with synthetic + replay traffic
  - Task T4.2: Publish runbook and rollback checklist

---

## 3) Recommendation (2–3 options + tradeoffs)

### Option A: Incremental extension (Recommended)
- **Approach:** Add minimal backward-compatible changes behind feature flags.
- **Pros:** Lowest risk, fast delivery, easiest rollback.
- **Cons:** May preserve some legacy constraints; medium technical debt.

### Option B: Parallel path + shadow validation
- **Approach:** Build new path in parallel, mirror traffic, compare outputs.
- **Pros:** Strong confidence via side-by-side metrics; safer cutover.
- **Cons:** Higher infra cost and engineering effort.

### Option C: Full replacement
- **Approach:** Replace existing path with redesigned architecture.
- **Pros:** Maximum simplification long-term, clean architecture.
- **Cons:** Highest delivery and operational risk; slower time-to-value.

**Decision heuristic:**
- Choose **A** when deadline and risk control are top priority.
- Choose **B** when correctness/compatibility risk is high.
- Choose **C** only when legacy constraints block business-critical outcomes.

---

## 4) Structural changes
- Define/extend contracts first (schema/interface/versioning).
- Insert compatibility layer for old/new request and response semantics.
- Add feature flag + kill switch at service entry point.
- Implement idempotent data handling and deterministic retry behavior.
- Add explicit timeout, circuit breaker, and fallback response policy.
- Ensure docs are updated: architecture, API contract, migration notes.

---

## 5) Generate/Cleanup scripts

### Generate steps (example)
1. Generate temporary fixtures/snapshots for validation.
2. Create synthetic test data and benchmark payload sets.
3. Export before/after metric baselines.

### Cleanup steps (must run)
1. Delete temp fixtures and synthetic datasets not needed post-validation.
2. Remove one-off migration helper scripts from deploy artifact.
3. Rotate or revoke temporary credentials/tokens used in test.
4. Archive benchmark outputs to approved storage and clean local workspace.

### Script skeletons
```bash
# generate_temp_artifacts.sh
set -euo pipefail
mkdir -p .tmp/fixtures .tmp/bench
# generate fixtures/data here

echo "generated at $(date -u)" > .tmp/bench/manifest.txt
```

```bash
# cleanup_temp_artifacts.sh
set -euo pipefail
rm -rf .tmp/fixtures .tmp/bench
find . -type f -name "*.tmp" -delete
```

---

## 6) Tests/Benchmarks + gates

### Functional gates
- Unit + integration pass rate = 100% on changed components.
- Contract compatibility checks pass for current and previous supported version.
- End-to-end scenario tests pass for core user journeys.

### Reliability gates
- Error budget burn rate within SLO policy in staging soak.
- No P0/P1 regression in failure injection drills.
- Recovery time objective verified in failover simulation.

### Benchmark gates
- p50/p95/p99 latency targets met under expected load profile.
- Throughput target met with acceptable CPU/memory saturation.
- Cost per request remains within budget envelope.

### Ops readiness gates
- Alerts tuned (low-noise, actionable) and on-call handoff complete.
- Runbook validated by engineer not involved in implementation.
- Rollback rehearsal completed successfully.

---

## 7) Observability/Runbook

### Observability requirements
- Structured logs with request ID, component, outcome, and error code.
- Metrics: request rate, latency (p50/p95/p99), errors, saturation.
- Traces: cross-service spans with dependency timing and retries.
- Dashboards: release health, SLO view, dependency health, rollback signals.

### Runbook essentials
- Service ownership and escalation contacts.
- Known failure modes + symptom-to-action mapping.
- Step-by-step mitigation commands and expected outcomes.
- Clear “stop rollout” criteria and communication protocol.

---

## 8) Rollout/Rollback

### Rollout strategy
1. Deploy dark/disabled by default.
2. Enable for internal traffic.
3. Canary 1–5% production traffic.
4. Ramp by cohorts (25% → 50% → 100%) after gate checks.
5. Declare GA only after stable observation window.

### Rollback strategy
1. Trigger kill switch / disable flag immediately.
2. Re-route to last known good version.
3. Verify service health and data consistency.
4. Announce incident status and ETA updates.
5. Perform post-incident review with corrective actions.

### Exit criteria
- All launch gates green for defined stability window.
- No unresolved critical issues.
- On-call confirms operational confidence.
