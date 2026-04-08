## Summary
- Describe what changed and why.

## Scope
- Affected areas (e.g., `api_gateway`, contracts/schemas, runtime/governor, frontend, CI/CD).

## Contract / Safety Impact
- [ ] No contract/schema/ABI/API change.
- [ ] Contract/schema/ABI/API change included with compatibility plan.
- [ ] Governor/runtime policy path impact reviewed (`validate → transition → profile_map → clamp → fallback → policy_block → capability_gate → telemetry_log`).

## Ecosystem Compatibility Checklist
- [ ] Ecosystem memory note reviewed (`README.md` + `docs/ECOSYSTEM_MEMORY_TH.md`) and updated if assumptions changed.
- [ ] Compatibility validation noted (tests/checks proving runtime/schema/telemetry alignment).
- [ ] Telemetry / deterministic replay considerations reviewed.

## Validation
- [ ] `cd api_gateway && pytest -q`
- [ ] `python3 tools/contracts/contract_checker.py`
- [ ] `python3 tools/contracts/contract_fuzz.py`
- [ ] `python3 tools/benchmarks/runtime_semantic_benchmark.py --input tools/benchmarks/runtime_semantic_samples.sample.json`
- [ ] `npx --yes tsx --test test_runtime_governor_psycho_safety.test.ts`
- Additional checks run:
  - 

## Deployment / Rollback Notes
- Deployment considerations:
- Rollback plan:
