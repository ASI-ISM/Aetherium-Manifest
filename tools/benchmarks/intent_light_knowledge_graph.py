#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Any


def build_graph(records: list[dict[str, Any]], min_k_anon: int = 3) -> dict[str, Any]:
    edge_stats: dict[tuple[str, str], dict[str, float]] = defaultdict(lambda: {"count": 0, "confidence_sum": 0.0})

    for row in records:
        intent = row["intent"]
        light_pattern = row["light_pattern"]
        edge = edge_stats[(intent, light_pattern)]
        edge["count"] += 1
        edge["confidence_sum"] += row.get("operator_confidence", 0.0)

    edges = []
    for (intent, light_pattern), stats in edge_stats.items():
        if stats["count"] < min_k_anon:
            continue
        avg_confidence = stats["confidence_sum"] / stats["count"] if stats["count"] else 0.0
        edges.append(
            {
                "source": intent,
                "target": light_pattern,
                "count": int(stats["count"]),
                "avg_confidence": round(avg_confidence, 3),
                "calibration_weight": round(stats["count"] * avg_confidence, 3),
            }
        )

    return {
        "privacy": {
            "anonymized": True,
            "k_anonymity_threshold": min_k_anon,
        },
        "nodes": sorted(
            {edge["source"] for edge in edges} | {edge["target"] for edge in edges}
        ),
        "edges": sorted(edges, key=lambda item: (-item["calibration_weight"], item["source"])),
    }


def _main() -> int:
    parser = argparse.ArgumentParser(description="Intent-to-light knowledge graph builder")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--k-anon", type=int, default=3)
    args = parser.parse_args()

    with args.input.open("r", encoding="utf-8") as handle:
        records = [json.loads(line) for line in handle if line.strip()]

    graph = build_graph(records=records, min_k_anon=args.k_anon)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as handle:
        json.dump(graph, handle, indent=2)

    print(f"wrote graph to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
