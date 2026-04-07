#!/usr/bin/env python3
"""Verify Helm HPA defaults remain aligned with docs/ops/k8s/30-hpa.yaml baseline."""

from __future__ import annotations

import sys
from pathlib import Path
import yaml

DOC_HPA_PATH = Path("docs/ops/k8s/30-hpa.yaml")
VALUES_PATH = Path("charts/aetherium-manifest/values.yaml")

DOC_TO_SERVICE = {
    "api-gateway-hpa": "apiGateway",
    "governor-hpa": "governor",
    "ws-gateway-hpa": "wsGateway",
}


def _load_yaml(path: Path):
    with path.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def _load_yaml_docs(path: Path):
    with path.open("r", encoding="utf-8") as fh:
        return list(yaml.safe_load_all(fh))


def main() -> int:
    values = _load_yaml(VALUES_PATH)
    docs = _load_yaml_docs(DOC_HPA_PATH)

    expected = {}
    for doc in docs:
        if not doc or doc.get("kind") != "HorizontalPodAutoscaler":
            continue
        name = doc["metadata"]["name"]
        service = DOC_TO_SERVICE.get(name)
        if not service:
            continue
        expected[service] = {
            "minReplicas": doc["spec"]["minReplicas"],
            "maxReplicas": doc["spec"]["maxReplicas"],
            "behavior": doc["spec"].get("behavior", {}),
            "metrics": doc["spec"].get("metrics", []),
        }

    failures = []
    for service, exp in expected.items():
        actual = values.get(service, {}).get("autoscaling", {})
        if not actual:
            failures.append(f"Missing autoscaling config for service '{service}' in {VALUES_PATH}")
            continue
        for field in ("minReplicas", "maxReplicas", "behavior", "metrics"):
            if actual.get(field) != exp[field]:
                failures.append(
                    f"Mismatch for {service}.autoscaling.{field}: expected {exp[field]!r}, got {actual.get(field)!r}"
                )

    if failures:
        print("HPA defaults regression check: FAILED")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("HPA defaults regression check: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
