# Runbook: Emergency Rollback

## Trigger
- Any Sev-1 safety, reliability, or privacy incident requiring immediate stabilization.
- Repeated fallback activations (`LCLFallbackFrequencyHigh`) with user-impact correlation.

## MTTD / MTTR Targets
- **MTTD:** <= 10 minutes
- **MTTR:** <= 30 minutes

## Rollback Authority
- Incident Commander (SRE primary) with Release Manager approval.

## Execution Steps
1. Activate incident mode and freeze all promotions.
2. Disable flags in order:
   - `cognitive_runtime_enabled=false`
   - `light_compiler_enabled=false`
   - `morphogenesis_enabled=false`
   - `semantic_field_enabled=false`
3. Route traffic to last known good release artifact.
4. Verify legacy `visual_parameters` path healthy.
5. Announce rollback completion and customer-impact status.

## Validation
- Error rate returns to pre-incident baseline.
- P95 pipeline latency meets tier target.
- No active Sev-1 alert remains firing for 10 minutes.

## Post-Rollback
- Preserve incident artifacts and logs for forensic review.
- Start controlled forward-fix plan with expanded canary guardrails.
