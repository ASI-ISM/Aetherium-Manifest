# Security & Privacy Checks: Production Operations

## Objectives
- No raw sensitive trace persistence.
- Enforced TTL and access policy for reasoning traces.
- Audit logging for runtime overrides.

## Control 1: No Raw Sensitive Trace Persistence
- **Policy:** raw user-sensitive reasoning traces are never written to persistent stores.
- **Implementation checks:**
  - Storage writer rejects `trace_payload_raw` fields.
  - Only redacted `reason_trace_summary` allowed.
  - CI rule scans serializers for forbidden raw-trace keys.
- **Pass criteria:** 0 policy violations in pre-merge and nightly scans.

## Control 2: TTL and Access Policy for Reasoning Traces
- **Policy:** reasoning trace summaries are retained for maximum 7 days unless legal hold approved.
- **Implementation checks:**
  - DB TTL index present and enforced for trace summary collections/tables.
  - Access policy is deny-by-default, role-scoped (`sre_oncall`, `security_auditor`).
  - Access requests are authenticated and authorized via runtime policy service.
- **Pass criteria:**
  - 100% trace summary records have valid expiration metadata.
  - Unauthorized read attempts are blocked and logged.

## Control 3: Audit Logging for Runtime Overrides
- **Policy:** every runtime override action is auditable.
- **Implementation checks:**
  - Emit audit event for each feature-flag or override action.
  - Include actor, reason, timestamp, scope, before/after values, incident reference.
  - Immutable audit sink with 1-year retention.
- **Pass criteria:**
  - 100% override actions have audit entries.
  - Audit integrity verification succeeds in daily job.

## Review Outcome Target
- **Critical findings:** 0
- **Required status:** pass before GA promotion
