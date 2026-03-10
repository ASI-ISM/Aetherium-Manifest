#!/usr/bin/env python3
"""Locale QA checks: missing key scan + pseudolocale validation."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys


def load_locale(path: Path) -> dict[str, str]:
    with path.open('r', encoding='utf-8') as fh:
        data = json.load(fh)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return {str(k): str(v) for k, v in data.items()}


def main() -> int:
    parser = argparse.ArgumentParser(description='Locale QA checks')
    parser.add_argument('--locales-dir', default='locales', help='Locales directory path')
    parser.add_argument('--base-locale', default='en', help='Base locale without .json')
    parser.add_argument('--pseudolocale', default='en-XA', help='Pseudolocale without .json')
    args = parser.parse_args()

    locales_dir = Path(args.locales_dir)
    if not locales_dir.exists():
        print(f"ERROR: locales directory not found: {locales_dir}")
        return 1

    locale_files = sorted(locales_dir.glob('*.json'))
    if not locale_files:
        print('ERROR: no locale files found')
        return 1

    locale_map = {path.stem: load_locale(path) for path in locale_files}

    if args.base_locale not in locale_map:
        print(f"ERROR: base locale '{args.base_locale}' is missing")
        return 1

    base_keys = set(locale_map[args.base_locale].keys())
    failed = False

    for locale, payload in locale_map.items():
        keys = set(payload.keys())
        missing = sorted(base_keys - keys)
        extra = sorted(keys - base_keys)
        if missing:
            failed = True
            print(f"ERROR: locale '{locale}' missing keys: {', '.join(missing)}")
        if extra:
            failed = True
            print(f"ERROR: locale '{locale}' has extra keys: {', '.join(extra)}")

    if args.pseudolocale not in locale_map:
        failed = True
        print(f"ERROR: pseudolocale '{args.pseudolocale}' is missing")
    else:
        pseudo = locale_map[args.pseudolocale]
        base = locale_map[args.base_locale]
        unchanged = sorted([k for k in base_keys if pseudo.get(k) == base.get(k)])
        if unchanged:
            failed = True
            print(
                "ERROR: pseudolocale has unchanged strings for keys: "
                + ', '.join(unchanged)
            )

    if failed:
        return 1

    print(
        f"Locale QA passed for {len(locale_map)} locales "
        f"(base={args.base_locale}, pseudolocale={args.pseudolocale})."
    )
    return 0


if __name__ == '__main__':
    sys.exit(main())
