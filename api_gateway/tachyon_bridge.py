from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
from typing import Any


def _entropy_seed(trace_id: str) -> int:
    digest = sha256(trace_id.encode("utf-8")).hexdigest()
    return int(digest[:16], 16)


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_tachyon_envelope(
    *,
    trace_id: str,
    session_id: str,
    provider: str,
    model_version: str,
    model_name: str,
    intent_vector: dict[str, Any],
    intent_state: dict[str, Any],
    governor_result: dict[str, Any] | None,
    visual_manifestation: dict[str, Any],
    ghost_flag: bool,
) -> dict[str, Any]:
    """Build a Tachyon-aligned envelope snapshot without mutating runtime contract."""
    sync_id = f"{session_id}:{trace_id}"
    return {
        "header": {
            "trace_id": trace_id,
            "sync_id": sync_id,
            "timestamp": _iso_now(),
            "message_type": "tachyon_manifest_v1",
            "ecosystem": "AETHERIUM",
            "bus_family": "AetherBus-Tachyon",
            "provider": provider,
            "model_version": model_version,
            "model_name": model_name,
        },
        "payload": {
            "intent_vector": intent_vector,
            "intent_state": intent_state,
            "visual_manifestation": visual_manifestation,
            "governor_result": governor_result,
            "entropy_seed": _entropy_seed(trace_id),
            "ghost_flag": ghost_flag,
            "payload_ptr": None,
            "rkey": None,
        },
    }
