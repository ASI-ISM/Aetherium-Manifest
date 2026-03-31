# Runbook: Drift Storm

## Trigger
- `LCLDriftRateHigh` fired for 5 minutes.
- Symptoms: semantic incoherence, unstable topology evolution, repeated containment actions.

## MTTD / MTTR Targets
- **MTTD:** <= 10 minutes
- **MTTR:** <= 30 minutes

## Immediate Actions (0-10 min)
1. Acknowledge alert and declare incident channel.
2. Confirm drift query in dashboard (last 30 minutes).
3. Check correlated error budget burn and fallback frequency.

## Diagnosis (10-20 min)
1. Inspect `semantic_field -> morphogenesis_plan` handoff latency and drift score distribution.
2. Validate recent deployments, model-version changes, and feature-flag changes.
3. Sample 20 sessions for `reason_trace_summary` anomalies.

## Containment (<= 20 min)
1. Enable `soft_clamp` containment mode.
2. If drift remains above threshold after 5 minutes, switch to deterministic anchor replay.
3. If still unstable, disable `morphogenesis_enabled` flag to force safe fallback.

## Recovery and Exit
- Drift rate < 0.02 for 15 consecutive minutes.
- No new critical user-impact reports for 15 minutes.
- Record root cause and corrective actions within 24 hours.

## Evidence to Capture
- Alert timeline, flag changes, top affected shards, and before/after metric snapshots.
