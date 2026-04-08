#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator
from pydantic import ValidationError

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from api_gateway.main import CognitiveEmitRequest, FirmaValidator  # noqa: E402

SCHEMA_PATH = REPO_ROOT / "docs" / "schemas" / "cognitive_emit_request_v1.json"
DEFAULT_CASES_PATH = Path(__file__).resolve().parent / "payloads" / "runtime_drift_cases.json"


@dataclass
class DriftCaseResult:
    name: str
    schema_accepts: bool
    runtime_structure_accepts: bool
    runtime_policy_accepts: bool
    violations: list[str]

    @property
    def has_structure_drift(self) -> bool:
        return self.schema_accepts != self.runtime_structure_accepts


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def evaluate_cases(
    schema: dict[str, Any],
    cases: list[dict[str, Any]],
) -> list[DriftCaseResult]:
    validator = Draft202012Validator(schema)
    results: list[DriftCaseResult] = []

    for row in cases:
        name = str(row.get("name", "unnamed_case"))
        payload = row.get("payload", {})
        schema_errors = list(validator.iter_errors(payload))
        schema_accepts = not schema_errors

        try:
            parsed = CognitiveEmitRequest.model_validate(payload)
            runtime_structure_accepts = True
            runtime_policy_accepts, violations = FirmaValidator.validate_dsl_response(parsed)
        except ValidationError:
            runtime_structure_accepts = False
            runtime_policy_accepts = False
            violations = []

        results.append(
            DriftCaseResult(
                name=name,
                schema_accepts=schema_accepts,
                runtime_structure_accepts=runtime_structure_accepts,
                runtime_policy_accepts=runtime_policy_accepts,
                violations=violations,
            )
        )

    return results


def run_guard(cases_path: Path = DEFAULT_CASES_PATH) -> int:
    schema = _load_json(SCHEMA_PATH)
    cases = _load_json(cases_path)
    if not isinstance(cases, list) or not cases:
        print(f"[FAIL] invalid cases file: {cases_path}")
        return 1

    results = evaluate_cases(schema, cases)
    drift_failures = [result for result in results if result.has_structure_drift]

    for result in results:
        state = "DRIFT" if result.has_structure_drift else "OK"
        print(
            f"[{state}] {result.name} "
            f"schema_accepts={result.schema_accepts} "
            f"runtime_structure_accepts={result.runtime_structure_accepts} "
            f"runtime_policy_accepts={result.runtime_policy_accepts}"
        )
        if result.violations:
            print(f"  [POLICY] violations={result.violations}")

    structural_match = (len(results) - len(drift_failures)) / len(results)
    print(f"[AUDIT] structural_match_rate={structural_match * 100:.2f}%")

    if drift_failures:
        print("[FAIL] schema-vs-runtime drift detected")
        return 1

    print("[PASS] schema-vs-runtime drift guard")
    return 0


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Detect structural drift between canonical schema and runtime validators")
    parser.add_argument(
        "--cases",
        type=Path,
        default=DEFAULT_CASES_PATH,
        help="Path to JSON file with drift-guard test cases",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    raise SystemExit(run_guard(cases_path=args.cases))
