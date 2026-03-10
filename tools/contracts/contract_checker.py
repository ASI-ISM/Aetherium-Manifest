#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Literal

from jsonschema import Draft202012Validator

REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_DIR = REPO_ROOT / "docs" / "schemas"
PAYLOAD_DIR = Path(__file__).resolve().parent / "payloads"

CHECKS = {
    "akashic_envelope_v2": {
        "schema": SCHEMA_DIR / "akashic_envelope_v2.json",
        "payload": PAYLOAD_DIR / "akashic_envelope_v2.payload.json",
    },
    "embodiment_v1": {
        "schema": SCHEMA_DIR / "embodiment_v1.json",
        "payload": PAYLOAD_DIR / "embodiment_v1.payload.json",
    },
    "ipw_v1": {
        "schema": SCHEMA_DIR / "ipw_v1.json",
        "payload": PAYLOAD_DIR / "ipw_v1.payload.json",
    },
    "light_cognition_pipeline_v1": {
        "schema": SCHEMA_DIR / "light_cognition_pipeline_v1.json",
        "payload": PAYLOAD_DIR / "light_cognition_pipeline_v1.payload.json",
    },
}

DEFAULT_CADENCE_BY_PHASE = {
    "nirodha": {"bpm": 22.0, "phase": 0.0, "jitter": 0.02},
    "awakened": {"bpm": 72.0, "phase": 0.0, "jitter": 0.05},
    "processing": {"bpm": 110.0, "phase": 0.0, "jitter": 0.08},
}

Mode = Literal["strict", "legacy"]


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _legacy_embodiment_audits(payload: dict[str, Any], audits: list[str]) -> None:
    visual = payload.get("visual_manifestation", {})
    if "cadence" in visual:
        return

    phase = str(payload.get("temporal_state", {}).get("phase", "awakened")).strip().lower()
    cadence = DEFAULT_CADENCE_BY_PHASE.get(phase, DEFAULT_CADENCE_BY_PHASE["awakened"])
    audits.append(f"embodiment_v1: cadence is absent; recommended deterministic default for phase={phase!r}: {cadence}")


def _check_ipw_probability_policy(payload: dict[str, Any], audits: list[str]) -> list[str]:
    errors: list[str] = []
    policy = payload.get("probability_policy", {})
    if not policy.get("requires_normalization", False):
        return errors

    epsilon = float(policy.get("epsilon", 0.0001))
    predictions = payload.get("predictions", [])

    probabilities: list[float] = []
    for idx, row in enumerate(predictions):
        value = row.get("p")
        if value is None or isinstance(value, bool):
            errors.append(f"<root>.predictions[{idx}].p: missing or invalid numeric probability")
            continue
        numeric = float(value)
        if numeric < 0:
            errors.append(f"<root>.predictions[{idx}].p: negative probability is not allowed")
            continue
        probabilities.append(numeric)

    if errors:
        return errors

    total = sum(probabilities)
    if total == 0:
        return ["<root>.predictions: probability sum is 0, cannot normalize"]

    if abs(total - 1.0) <= epsilon:
        return errors

    errors.append(
        f"<root>.predictions: probability sum {total:.8f} violates normalization policy with epsilon={epsilon}"
    )
    audits.append(
        (
            "ipw_validation.audit.normalized=false "
            f"ipw_validation.audit.observed_sum={total:.8f} "
            f"ipw_validation.audit.epsilon={epsilon}"
        )
    )
    return errors


def _apply_contract_policy(contract_name: str, payload: dict[str, Any], audits: list[str], mode: Mode) -> list[str]:
    if contract_name == "embodiment_v1" and mode == "legacy":
        _legacy_embodiment_audits(payload, audits)
    if contract_name == "ipw_v1":
        return _check_ipw_probability_policy(payload, audits)
    return []


def run_contract_checks(mode: Mode = "strict") -> int:
    failures = 0
    for contract_name, pair in CHECKS.items():
        schema = _load_json(pair["schema"])
        payload = _load_json(pair["payload"])
        audits: list[str] = []

        errors = _apply_contract_policy(contract_name, payload, audits, mode=mode)
        validator = Draft202012Validator(schema)
        errors.extend(f"{'.'.join(str(p) for p in err.path) or '<root>'}: {err.message}" for err in validator.iter_errors(payload))

        if errors:
            failures += 1
            print(f"[FAIL] {contract_name}")
            for error in errors:
                print(f"  - {error}")
        else:
            print(f"[PASS] {contract_name}")

        for audit in audits:
            print(f"  [AUDIT] {audit}")

    return failures


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate canonical contracts against real payload fixtures")
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument("--strict", action="store_true", help="Strict mode for CI/PR gate (default)")
    mode_group.add_argument("--legacy", action="store_true", help="Legacy compatibility mode with cadence injection")
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    selected_mode: Mode = "legacy" if args.legacy else "strict"
    raise SystemExit(1 if run_contract_checks(mode=selected_mode) else 0)
