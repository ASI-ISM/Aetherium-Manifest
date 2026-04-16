#!/usr/bin/env python3
"""Generate a production-ready one-shot change report scaffold."""

from __future__ import annotations

import argparse


def build_report(goal: str, repo_areas: str) -> str:
    """Build a markdown report scaffold for one-shot production changes."""
    return f"""# ONE_SHOT_PROD Report

## Goal
{goal}

## Repo Areas
{repo_areas}

## Code Changes Summary
- Describe concrete file-level changes and expected behavior impact.

## Test Commands
- [ ] Add and run targeted automated tests for changed paths.
- [ ] Run regression checks for adjacent systems.

## Instrumentation
- [ ] List metrics/logs/traces added or updated.
- [ ] Include alerting or dashboard implications.

## Rollback Notes
- [ ] Define rollback trigger signals.
- [ ] Provide explicit rollback commands and safe-state validation steps.

## PR Description
### Scope
- Summarize change boundaries and non-goals.

### Safety / Contract Impact
- Note schema, governor, compatibility, and security implications.

### Validation Evidence
- Link test output, benchmark deltas, and telemetry evidence.
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a one-shot production report template."
    )
    parser.add_argument("--goal", required=True, help="Fix or feature goal statement.")
    parser.add_argument(
        "--repo-areas",
        required=True,
        help="Comma-separated repo paths or components impacted by the change.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    print(build_report(args.goal, args.repo_areas))


if __name__ == "__main__":
    main()
