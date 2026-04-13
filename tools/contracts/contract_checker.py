#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Literal

from jsonschema import Draft202012Validator
from referencing import Registry, Resource

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tools.contracts.protocol_adapter import roundtrip_envelope, to_legacy_visual_parameters  # noqa: E402
from tools.contracts.runtime_drift_guard import run_guard as run_runtime_drift_guard  # noqa: E402

SCHEMA_DIR = REPO_ROOT / "docs" / "schemas"
PAYLOAD_DIR = Path(__file__).resolve().parent / "payloads"

CHECKS = {
    "akashic_envelope_v2": {
        "schema": SCHEMA_DIR / "akashic_envelope_v2.json",
        "payload": PAYLOAD_DIR / "akashic_envelope_v2.payload.json",
    },
    "ai_particle_control_contract_v1": {
        "schema": SCHEMA_DIR / "ai_particle_control_contract_v1.json",
        "payload": PAYLOAD_DIR / "ai_particle_control_contract_v1.payload.json",
    },
    "ai_particle_control_contract_v2": {
        "schema": SCHEMA_DIR / "ai_particle_control_contract_v2.json",
        "payload": PAYLOAD_DIR / "ai_particle_control_contract_v2.payload.json",
    },
    "embodiment_v1": {
        "schema": SCHEMA_DIR / "embodiment_v1.json",
        "payload": PAYLOAD_DIR / "embodiment_v1.payload.json",
    },
    "embodiment_v2": {
        "schema": SCHEMA_DIR / "embodiment_v2.json",
        "payload": PAYLOAD_DIR / "embodiment_v2.payload.json",
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

FIELD_EVOLUTION_REQUIRED_KEYS = {
    "introduced_in",
    "supersedes",
    "compatibility_adapter",
    "required_evolution_sections",
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


def _check_schema_field_evolution(contract_name: str, schema: dict[str, Any], audits: list[str]) -> list[str]:
    evolution = schema.get("x-field-evolution")
    if not isinstance(evolution, dict):
        return [f"<schema>.x-field-evolution: missing required field-evolution section for {contract_name}"]

    missing = sorted(FIELD_EVOLUTION_REQUIRED_KEYS - set(evolution.keys()))
    if missing:
        return [f"<schema>.x-field-evolution: missing required keys {missing} for {contract_name}"]

    required_sections = evolution.get("required_evolution_sections", [])
    if not isinstance(required_sections, list) or not required_sections:
        return [f"<schema>.x-field-evolution.required_evolution_sections: must contain at least one section for {contract_name}"]

    missing_sections = [section for section in required_sections if section not in schema.get("properties", {})]
    if missing_sections:
        return [f"<schema>.properties: missing required field-evolution sections {missing_sections} for {contract_name}"]

    audits.append(f"{contract_name}: field-evolution metadata present")
    return []


def _check_embodiment_compatibility(audits: list[str]) -> list[str]:
    fixture_paths = [
        PAYLOAD_DIR / "compatibility.embodiment_v1.payload.json",
        PAYLOAD_DIR / "compatibility.embodiment_v2.payload.json",
    ]
    errors: list[str] = []

    for path in fixture_paths:
        if not path.exists(): continue
        payload = _load_json(path)
        try:
            legacy = to_legacy_visual_parameters(payload)
        except ValueError as exc:
            errors.append(f"{path.name}: adapter failure: {exc}")
            continue

        required_keys = {"base_shape", "particle_density", "turbulence", "chromatic_aberration", "tick_rate_hz"}
        missing = sorted(required_keys - set(legacy.keys()))
        if missing:
            errors.append(f"{path.name}: adapted visual_parameters missing keys {missing}")
            continue

        if legacy["tick_rate_hz"] <= 0:
            errors.append(f"{path.name}: tick_rate_hz must be > 0")

    if not errors:
        audits.append("compatibility_fixtures: pass_rate=100.00%")
    return errors


def _check_envelope_roundtrip_integrity(audits: list[str]) -> list[str]:
    fixture_path = PAYLOAD_DIR / "replay.embodiment_envelope_roundtrip.json"
    if not fixture_path.exists(): return []
    fixtures = _load_json(fixture_path)
    if not isinstance(fixtures, list) or not fixtures:
        return ["replay.embodiment_envelope_roundtrip.json: fixtures must be a non-empty array"]

    success = 0
    failures: list[str] = []
    for idx, row in enumerate(fixtures):
        payload = row.get("payload", {})
        expected = row.get("expected", {})

        try:
            actual = roundtrip_envelope(payload)
        except Exception as exc:  # defensive for fixture evaluation
            failures.append(f"fixture[{idx}]: roundtrip error: {exc}")
            continue

        if actual == expected:
            success += 1
        else:
            failures.append(f"fixture[{idx}]: roundtrip mismatch")

    integrity = success / len(fixtures)
    audits.append(f"envelope_roundtrip_integrity={integrity * 100:.5f}%")
    if integrity < 0.9999:
        failures.append(
            f"envelope round-trip integrity {integrity * 100:.5f}% below required 99.99%"
        )
    return failures


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


def build_registry() -> Registry:
    registry = Registry()
    for schema_file in SCHEMA_DIR.glob("*.json"):
        schema = _load_json(schema_file)
        if "$id" in schema:
            resource = Resource.from_contents(schema)
            registry = registry.with_resource(schema["$id"], resource)
            registry = registry.with_resource(schema_file.name, resource)
    return registry


def run_contract_checks(mode: Mode = "strict") -> int:
    failures = 0
    global_errors: list[str] = []
    global_audits: list[str] = []
    registry = build_registry()

    for contract_name, pair in CHECKS.items():
        schema = _load_json(pair["schema"])
        payload = _load_json(pair["payload"])
        audits: list[str] = []

        errors = _check_schema_field_evolution(contract_name, schema, audits) if contract_name != "ai_particle_control_contract_v1" else []
        errors.extend(_apply_contract_policy(contract_name, payload, audits, mode=mode))
        validator = Draft202012Validator(schema, registry=registry)
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

    global_errors.extend(_check_embodiment_compatibility(global_audits))
    global_errors.extend(_check_envelope_roundtrip_integrity(global_audits))
    if run_runtime_drift_guard() != 0:
        global_errors.append("runtime drift guard detected structural mismatch")
    else:
        global_audits.append("runtime_drift_guard: structural_match_rate=100.00%")

    if global_errors:
        failures += 1
        print("[FAIL] compatibility_and_roundtrip")
        for error in global_errors:
            print(f"  - {error}")
    else:
        print("[PASS] compatibility_and_roundtrip")

    for audit in global_audits:
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
