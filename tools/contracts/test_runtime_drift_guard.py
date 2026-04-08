from __future__ import annotations

import json

from tools.contracts.runtime_drift_guard import evaluate_cases


def test_runtime_drift_guard_cases_match_runtime_and_schema_contracts() -> None:
    with open("docs/schemas/cognitive_emit_request_v1.json", "r", encoding="utf-8") as handle:
        schema = json.load(handle)
    with open("tools/contracts/payloads/runtime_drift_cases.json", "r", encoding="utf-8") as handle:
        cases = json.load(handle)

    results = evaluate_cases(schema=schema, cases=cases)

    assert len(results) == 4
    assert all(not result.has_structure_drift for result in results)

    policy_case = next(result for result in results if result.name == "policy_violation_crimson_without_emergency_override")
    assert policy_case.runtime_policy_accepts is False
    assert policy_case.violations
