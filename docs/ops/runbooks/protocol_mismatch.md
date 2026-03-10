# Runbook: Protocol Mismatch

## Trigger
- `LCLPolicyGuardHitSpike` with envelope validation errors.
- Increased contract checker failures or downstream parse errors.

## MTTD / MTTR Targets
- **MTTD:** <= 10 minutes
- **MTTR:** <= 30 minutes

## Immediate Actions
1. Confirm mismatch signature (schema version, missing block, incompatible enum).
2. Identify blast radius by client version and region.
3. Freeze deploys touching envelope contracts.

## Diagnosis
1. Validate producer/consumer contract matrix.
2. Compare payload samples against `docs/schemas/*` contract version.
3. Check compatibility adapter behavior for legacy `visual_parameters` fallback.

## Containment
1. Force compatibility adapter mode for affected consumers.
2. Reject invalid payloads with explicit remediation code.
3. Roll back producer contract version if mismatch is systemic.

## Recovery and Exit
- Contract checker pass rate back to 100% in CI and production shadow checks.
- Parse errors return to baseline.
- Policy guard hits stop increasing for 30 minutes.

## Evidence to Capture
- Invalid payload exemplars (redacted), version skew summary, and rollback commit IDs.
