# Production Observability Package: Dashboards and Alerts

## Scope
This package defines dashboard panels, SLO-oriented alerts, and paging policy for the Light Cognition Layer runtime.

## Dashboard: `light-cognition-runtime-overview`

### Panel 1 — Drift Rate
- **Metric:** `lcl_drift_events_total`
- **Query (PromQL):**
  ```promql
  sum(rate(lcl_drift_events_total{severity=~"high|critical"}[5m]))
  /
  clamp_min(sum(rate(lcl_runtime_ticks_total[5m])), 1)
  ```
- **Target:** `< 0.02`
- **Alert link:** `LCLDriftRateHigh`

### Panel 2 — Compiler Failure Rate
- **Metric:** `lcl_compiler_invocations_total`, `lcl_compiler_failures_total`
- **Query (PromQL):**
  ```promql
  sum(rate(lcl_compiler_failures_total[5m]))
  /
  clamp_min(sum(rate(lcl_compiler_invocations_total[5m])), 1)
  ```
- **Target:** `< 0.01`
- **Alert link:** `LCLCompilerFailureRateHigh`

### Panel 3 — Fallback Frequency
- **Metric:** `lcl_fallback_activations_total`
- **Query (PromQL):**
  ```promql
  sum(increase(lcl_fallback_activations_total[10m]))
  ```
- **Target:** `< 5 activations / 10m`
- **Alert link:** `LCLFallbackFrequencyHigh`

### Panel 4 — Frame-Time Variance
- **Metric:** `lcl_frame_time_ms`
- **Query (PromQL):**
  ```promql
  stddev_over_time(lcl_frame_time_ms[5m])
  ```
- **Target:** `<= 2.5 ms`
- **Alert link:** `LCLFrameTimeVarianceHigh`

### Panel 5 — Policy Guard Hits
- **Metric:** `lcl_policy_guard_hits_total`
- **Query (PromQL):**
  ```promql
  sum(increase(lcl_policy_guard_hits_total{action=~"block|rewrite"}[10m]))
  ```
- **Target:** investigational if `> 0`; page if sustained and correlated with user impact.
- **Alert link:** `LCLPolicyGuardHitSpike`

## Alerts

```yaml
groups:
  - name: light-cognition-runtime
    interval: 30s
    rules:
      - alert: LCLDriftRateHigh
        expr: |
          (
            sum(rate(lcl_drift_events_total{severity=~"high|critical"}[5m]))
            /
            clamp_min(sum(rate(lcl_runtime_ticks_total[5m])), 1)
          ) > 0.02
        for: 5m
        labels:
          severity: page
          service: light-cognition-runtime
        annotations:
          summary: Drift rate exceeded threshold
          runbook: docs/ops/runbooks/drift_storm.md

      - alert: LCLCompilerFailureRateHigh
        expr: |
          (
            sum(rate(lcl_compiler_failures_total[5m]))
            /
            clamp_min(sum(rate(lcl_compiler_invocations_total[5m])), 1)
          ) > 0.01
        for: 5m
        labels:
          severity: page
          service: light-cognition-runtime
        annotations:
          summary: Compiler failure rate exceeded threshold
          runbook: docs/ops/runbooks/compiler_degradation.md

      - alert: LCLFallbackFrequencyHigh
        expr: sum(increase(lcl_fallback_activations_total[10m])) > 5
        for: 10m
        labels:
          severity: page
          service: light-cognition-runtime
        annotations:
          summary: Fallback path activated frequently
          runbook: docs/ops/runbooks/emergency_rollback.md

      - alert: LCLFrameTimeVarianceHigh
        expr: stddev_over_time(lcl_frame_time_ms[5m]) > 2.5
        for: 5m
        labels:
          severity: page
          service: light-cognition-runtime
        annotations:
          summary: Frame-time variance above stability threshold
          runbook: docs/ops/runbooks/compiler_degradation.md

      - alert: LCLPolicyGuardHitSpike
        expr: sum(increase(lcl_policy_guard_hits_total{action=~"block|rewrite"}[10m])) > 3
        for: 10m
        labels:
          severity: ticket
          service: light-cognition-runtime
        annotations:
          summary: Policy guard hits increased unexpectedly
          runbook: docs/ops/runbooks/protocol_mismatch.md
```

## On-call Routing and Detection Objective
- Paging policy: Sev-1 alerts page primary + secondary SRE immediately.
- Detection budget: alert firing + routing + acknowledgement must fit **MTTD <= 10 minutes**.
- Dashboards refresh every 30 seconds and include 1h, 6h, 24h views.
