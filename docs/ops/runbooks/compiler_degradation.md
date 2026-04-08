# Runbook: Compiler Degradation

## Trigger
- `LCLCompilerFailureRateHigh` or sustained `LCLFrameTimeVarianceHigh`.

## MTTD / MTTR Targets
- **MTTD:** <= 10 minutes
- **MTTR:** <= 30 minutes

## Immediate Actions (0-10 min)
1. Acknowledge page and open incident timeline.
2. Verify compiler failure rate and latency heatmap by shard/version.
3. Check for dependency or config rollout within previous 60 minutes.

## Diagnosis (10-20 min)
1. Compare failures by error class: schema validation, optimization pass, runtime emission.
2. Run canary replay corpus against current and previous compiler artifact.
3. Validate GPU/CPU resource saturation and queue depth.

## Containment
1. Route traffic to previous stable compiler artifact.
2. Increase cache hit policy for compiled light programs.
3. If frame-time variance remains > 2.5 ms, disable advanced optimizer stage.

## Recovery and Exit
- Compiler failure rate < 1% over 15 minutes.
- Frame-time variance <= 2.5 ms over 15 minutes.
- Canary replay pass rate restored to baseline.

## Follow-up
- File defect with failure class histogram and failing fixtures.
- Add regression test for the dominant error class.
