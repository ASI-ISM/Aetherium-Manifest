#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
import json
import random
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tools.contracts.contract_checker import CHECKS  # noqa: E402

DEFAULT_SEED = 424242
DEFAULT_MUTATIONS_PER_CONTRACT = 24
DEFAULT_MIN_FAILURE_RATE = 0.8


@dataclass(frozen=True)
class RegressionCase:
    contract: str
    description: str
    payload: dict[str, Any]
    expected_error_fragment: str


@dataclass(frozen=True)
class FuzzResult:
    contract: str
    attempted: int
    rejected: int



def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)



def _iter_leaf_paths(value: Any, path: tuple[Any, ...] = ()) -> list[tuple[Any, ...]]:
    paths: list[tuple[Any, ...]] = []
    if isinstance(value, dict):
        if not value:
            paths.append(path)
        for key, nested in value.items():
            paths.extend(_iter_leaf_paths(nested, path + (key,)))
        return paths

    if isinstance(value, list):
        if not value:
            paths.append(path)
        for idx, nested in enumerate(value):
            paths.extend(_iter_leaf_paths(nested, path + (idx,)))
        return paths

    paths.append(path)
    return paths



def _get_parent_and_key(document: dict[str, Any], path: tuple[Any, ...]) -> tuple[Any, Any]:
    if not path:
        raise ValueError("Cannot mutate root payload directly")

    parent: Any = document
    for segment in path[:-1]:
        parent = parent[segment]
    return parent, path[-1]



def _mutate_at_path(payload: dict[str, Any], path: tuple[Any, ...], rng: random.Random) -> dict[str, Any]:
    mutated = copy.deepcopy(payload)
    parent, key = _get_parent_and_key(mutated, path)
    current = parent[key]

    if isinstance(current, bool):
        parent[key] = "invalid_bool"
    elif isinstance(current, (int, float)):
        parent[key] = "invalid_numeric"
    elif isinstance(current, str):
        parent[key] = rng.randint(1000, 9999)
    elif current is None:
        parent[key] = "unexpected_non_null"
    elif isinstance(current, list):
        if current:
            parent[key] = current[:-1]
        else:
            parent[key] = ["invalid_item"]
    elif isinstance(current, dict):
        parent[key] = []
    else:
        parent[key] = None

    return mutated



def _drop_required_field(payload: dict[str, Any], required_fields: list[str], rng: random.Random) -> dict[str, Any]:
    candidates = [field for field in required_fields if field in payload]
    if not candidates:
        return copy.deepcopy(payload)

    mutated = copy.deepcopy(payload)
    del mutated[rng.choice(candidates)]
    return mutated



def _generate_mutations(
    payload: dict[str, Any],
    schema: dict[str, Any],
    rng: random.Random,
    count: int,
) -> list[dict[str, Any]]:
    if count <= 0:
        return []

    mutations: list[dict[str, Any]] = []
    leaves = [leaf for leaf in _iter_leaf_paths(payload) if leaf]
    required_fields = [str(field) for field in schema.get("required", []) if isinstance(field, str)]

    while len(mutations) < count:
        strategy = rng.choice(["type_flip", "drop_required"])
        if strategy == "drop_required":
            candidate = _drop_required_field(payload, required_fields, rng)
        else:
            if not leaves:
                candidate = copy.deepcopy(payload)
            else:
                candidate = _mutate_at_path(payload, rng.choice(leaves), rng)

        if candidate != payload:
            mutations.append(candidate)

    return mutations



def _run_regression_corpus(corpus_path: Path) -> list[str]:
    rows = _load_json(corpus_path)
    if not isinstance(rows, list):
        return [f"Regression corpus must be a JSON array: {corpus_path}"]

    failures: list[str] = []
    for idx, row in enumerate(rows):
        try:
            case = RegressionCase(
                contract=row["contract"],
                description=row["description"],
                payload=row["payload"],
                expected_error_fragment=row["expected_error_fragment"],
            )
        except KeyError as exc:
            failures.append(f"regression[{idx}]: missing key {exc}")
            continue

        if case.contract not in CHECKS:
            failures.append(f"regression[{idx}]: unknown contract {case.contract!r}")
            continue

        schema = _load_json(CHECKS[case.contract]["schema"])
        validator = Draft202012Validator(schema)
        errors = list(validator.iter_errors(case.payload))
        if not errors:
            failures.append(f"regression[{idx}] {case.description}: expected schema rejection but payload passed")
            continue

        messages = [err.message for err in errors]
        if not any(case.expected_error_fragment in message for message in messages):
            failures.append(
                f"regression[{idx}] {case.description}: expected fragment {case.expected_error_fragment!r}, got {messages}"
            )

    return failures



def run_fuzz(
    mutations_per_contract: int = DEFAULT_MUTATIONS_PER_CONTRACT,
    min_failure_rate: float = DEFAULT_MIN_FAILURE_RATE,
    seed: int = DEFAULT_SEED,
    regression_corpus: Path | None = None,
) -> int:
    rng = random.Random(seed)
    failures: list[str] = []
    summary: list[FuzzResult] = []

    for contract_name, pair in CHECKS.items():
        schema = _load_json(pair["schema"])
        payload = _load_json(pair["payload"])

        if not isinstance(payload, dict):
            failures.append(f"{contract_name}: payload fixture must be an object")
            continue

        validator = Draft202012Validator(schema)
        mutations = _generate_mutations(payload, schema, rng, mutations_per_contract)

        rejected = 0
        for mutated in mutations:
            if list(validator.iter_errors(mutated)):
                rejected += 1

        attempted = len(mutations)
        observed_failure_rate = (rejected / attempted) if attempted else 0.0
        summary.append(FuzzResult(contract=contract_name, attempted=attempted, rejected=rejected))

        if observed_failure_rate < min_failure_rate:
            failures.append(
                f"{contract_name}: mutation rejection rate {observed_failure_rate:.2%} below threshold {min_failure_rate:.2%}"
            )

    if regression_corpus:
        failures.extend(_run_regression_corpus(regression_corpus))

    for row in summary:
        rate = (row.rejected / row.attempted) if row.attempted else 0.0
        print(
            f"[FUZZ] {row.contract}: rejected={row.rejected}/{row.attempted} "
            f"rejection_rate={rate:.2%}"
        )

    if failures:
        print("[FAIL] contract_fuzz")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print("[PASS] contract_fuzz")
    return 0



def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run mutation-based schema fuzz checks for canonical contract fixtures")
    parser.add_argument("--mutations-per-contract", type=int, default=DEFAULT_MUTATIONS_PER_CONTRACT)
    parser.add_argument("--min-failure-rate", type=float, default=DEFAULT_MIN_FAILURE_RATE)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument(
        "--regression-corpus",
        type=Path,
        default=Path(__file__).resolve().parent / "payloads" / "fuzz_regressions.json",
        help="JSON array of known-invalid payload regressions",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    raise SystemExit(
        run_fuzz(
            mutations_per_contract=args.mutations_per_contract,
            min_failure_rate=args.min_failure_rate,
            seed=args.seed,
            regression_corpus=args.regression_corpus,
        )
    )
