#!/usr/bin/env python3
"""CI lint checks for ecosystem compatibility checklist requirements."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

REQUIRED_LEDGER_REPOS = [
    "https://github.com/FGD-ATR-EP/The-Book-of-Formation-AETHERIUM-GENESIS",
    "https://github.com/FGD-ATR-EP/PRGX-AG",
    "https://github.com/FGD-ATR-EP/LOGENESIS-1.5",
    "https://github.com/FGD-ATR-EP/BioVisionVS1.1",
]

PR_REQUIRED_TOKENS = [
    "ecosystem memory",
    "contract impact",
    "compatibility",
]


def _load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def check_ecosystem_memory_docs(repo_root: Path) -> list[str]:
    errors: list[str] = []
    readme = repo_root / "README.md"
    memory_doc = repo_root / "docs" / "ECOSYSTEM_MEMORY_TH.md"

    if not readme.exists():
        return ["README.md is missing; cannot validate ecosystem memory ledger."]
    if not memory_doc.exists():
        return ["docs/ECOSYSTEM_MEMORY_TH.md is missing; cannot validate ecosystem memory rules."]

    readme_text = _load_text(readme)
    memory_text = _load_text(memory_doc)

    if "AETHERIUM Ecosystem Memory Ledger" not in readme_text:
        errors.append("README.md must contain the 'AETHERIUM Ecosystem Memory Ledger' section.")

    for repo in REQUIRED_LEDGER_REPOS:
        if repo not in readme_text:
            errors.append(f"README.md is missing ecosystem repository link: {repo}")
        if repo not in memory_text:
            errors.append(f"docs/ECOSYSTEM_MEMORY_TH.md is missing ecosystem repository link: {repo}")

    if "schema/ABI" not in memory_text:
        errors.append("docs/ECOSYSTEM_MEMORY_TH.md must mention schema/ABI impact handling.")

    return errors


def _extract_pr_body(event_payload: dict[str, Any]) -> str:
    pull_request = event_payload.get("pull_request", {})
    body = pull_request.get("body")
    return body if isinstance(body, str) else ""


def check_pull_request_body(event_path: Path | None) -> list[str]:
    if event_path is None or not event_path.exists():
        return [
            "GITHUB_EVENT_PATH is not available; cannot validate PR checklist body fields."
        ]

    payload = json.loads(event_path.read_text(encoding="utf-8"))
    body = _extract_pr_body(payload).lower()

    errors: list[str] = []
    for token in PR_REQUIRED_TOKENS:
        if token not in body:
            errors.append(
                "PR body must include Ecosystem Compatibility Checklist evidence for "
                f"'{token}'."
            )

    if "- [x]" not in body and "- [ ]" not in body:
        errors.append("PR body should include markdown checklist items (- [ ] / - [x]).")

    # Encourage explicit impact note format when schema or contract changes are present.
    if re.search(r"\b(schema|abi|contract)\b", body) and "impact" not in body:
        errors.append("Schema/ABI/contract mention found, but explicit impact note was not found.")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate ecosystem compatibility checklist requirements in CI."
    )
    parser.add_argument(
        "--check-pr-body",
        action="store_true",
        help="Validate PR body checklist fields using GITHUB_EVENT_PATH payload.",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]

    errors = check_ecosystem_memory_docs(repo_root)

    if args.check_pr_body:
        event_path_env = os.environ.get("GITHUB_EVENT_PATH")
        event_path = Path(event_path_env) if event_path_env else None
        errors.extend(check_pull_request_body(event_path))

    if errors:
        print("❌ Ecosystem compatibility checklist checks failed:")
        for err in errors:
            print(f" - {err}")
        return 1

    print("✅ Ecosystem compatibility checklist checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
