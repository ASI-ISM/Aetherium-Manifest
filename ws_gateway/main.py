import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import FastAPI, Header, Query, WebSocket, WebSocketDisconnect
import redis.asyncio as redis

app = FastAPI(title="Aetherium WS Gateway")
logger = logging.getLogger("ws-gateway")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
STATE_SYNC_STREAM_MAXLEN = int(os.getenv("STATE_SYNC_STREAM_MAXLEN", "1000"))
REPLAY_BATCH_LIMIT = int(os.getenv("STATE_SYNC_REPLAY_BATCH_LIMIT", "256"))
r: Optional[redis.Redis] = None

SCHEMA_VERSION = "room_event.v1"
CONFLICT_POLICY = {
    "policy_id": "state-sync-conflict.v1",
    "strategy": "optimistic_concurrency_last_write_wins",
    "description": "accept write, emit deterministic conflict event when base_stream_id is stale",
}

ROLE_ACTION_SCOPES: dict[str, set[str]] = {
    "viewer": {"presence.read"},
    "designer": {"presence.read", "presence.write", "state.visual"},
    "strategist": {"presence.read", "presence.write", "state.semantic"},
    "brand_lead": {"presence.read", "presence.write", "state.semantic", "approval.manage"},
    "operator": {"presence.read", "presence.write", "state.visual", "state.semantic", "approval.manage", "system.ops"},
}

PRESENCE_ACTIONS = {"join", "leave", "active_role", "cursor_or_focus"}
APPROVAL_ACTIONS = {"request", "approve", "reject"}
ROOM_LAST_STREAM_ID: dict[str, str] = {}


@app.on_event("startup")
async def startup() -> None:
    global r
    try:
        r = redis.from_url(REDIS_URL, decode_responses=True)
    except Exception:
        logger.exception("ws-gateway startup failed")


async def _authorize(websocket: WebSocket, api_key: Optional[str], x_api_key: Optional[str]) -> bool:
    key = api_key or x_api_key
    if not key:
        await websocket.close(code=1008)
        return False

    import hmac

    expected_key = os.getenv("AETHERIUM_API_KEY")
    if expected_key and not hmac.compare_digest(key, expected_key):
        await websocket.close(code=1008)
        return False

    return True


def _stream_key(room_id: str) -> str:
    return f"state-sync:{room_id}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _permission_denied(reason: str, room_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "error",
        "error": "permission_denied",
        "reason": reason,
        "room_id": room_id,
        "payload": payload,
        "updated_at": _now_iso(),
    }


def _has_scope(role: str, scope: str) -> bool:
    return scope in ROLE_ACTION_SCOPES.get(role, set())


def _resolve_scope(event_type: str, payload: dict[str, Any]) -> str | None:
    if event_type == "presence":
        return "presence.write"
    if event_type == "approval":
        return "approval.manage"
    if event_type == "action":
        scope = payload.get("scope")
        return scope if isinstance(scope, str) else None
    return None


def _build_room_event(room_id: str, payload: dict[str, Any]) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    event_type = payload.get("type", "action")
    actor_id = payload.get("actor_id")
    role = payload.get("role")
    action = payload.get("action")

    if not isinstance(actor_id, str) or not actor_id:
        return None, {"type": "error", "error": "invalid_actor", "detail": "actor_id is required"}
    if not isinstance(role, str) or role not in ROLE_ACTION_SCOPES:
        return None, {"type": "error", "error": "invalid_role", "detail": "role is required and must be supported"}

    scope = _resolve_scope(event_type, payload)
    if not scope:
        return None, {
            "type": "error",
            "error": "invalid_scope",
            "detail": f"scope is required for event type '{event_type}'",
        }

    if not _has_scope(role, scope):
        return None, _permission_denied(f"role '{role}' cannot perform scope '{scope}'", room_id, payload)

    if event_type == "presence" and action not in PRESENCE_ACTIONS:
        return None, {"type": "error", "error": "invalid_presence_action", "detail": "unsupported presence action"}

    if event_type == "approval":
        if action not in APPROVAL_ACTIONS:
            return None, {"type": "error", "error": "invalid_approval_action", "detail": "unsupported approval action"}
        target_event_id = payload.get("target_event_id")
        if not isinstance(target_event_id, str) or not target_event_id:
            return None, {"type": "error", "error": "invalid_target_event_id", "detail": "target_event_id is required"}

    base_stream_id = payload.get("base_stream_id")
    if base_stream_id is not None and not isinstance(base_stream_id, str):
        return None, {"type": "error", "error": "invalid_base_stream_id", "detail": "base_stream_id must be a string"}

    event = {
        "schema_version": SCHEMA_VERSION,
        "type": event_type,
        "room_id": room_id,
        "actor_id": actor_id,
        "role": role,
        "scope": scope,
        "action": action,
        "payload": payload.get("payload", {}),
        "cursor_or_focus": payload.get("cursor_or_focus"),
        "target_event_id": payload.get("target_event_id"),
        "base_stream_id": base_stream_id,
        "conflict_policy": CONFLICT_POLICY,
        "updated_at": _now_iso(),
    }
    return event, None


async def _append_room_event(room_id: str, event: dict[str, Any]) -> str | None:
    if not r:
        return None
    try:
        stream_id = await r.xadd(
            _stream_key(room_id),
            {"payload": json.dumps(event)},
            maxlen=STATE_SYNC_STREAM_MAXLEN,
            approximate=True,
        )
        if stream_id:
            ROOM_LAST_STREAM_ID[room_id] = stream_id
        return stream_id
    except Exception:
        logger.exception("failed to append room event")
        return None


async def _replay_events(websocket: WebSocket, room_id: str, last_event_id: str | None) -> None:
    if not r:
        return
    start = last_event_id or "0-0"
    if start == "$":
        return
    try:
        events = await r.xrange(_stream_key(room_id), min=f"({start}", max="+", count=REPLAY_BATCH_LIMIT)
    except Exception:
        logger.exception("failed to read replay events")
        return

    for stream_id, fields in events:
        payload_raw = fields.get("payload")
        if not payload_raw:
            continue
        try:
            payload = json.loads(payload_raw)
        except json.JSONDecodeError:
            logger.warning("invalid replay payload for %s %s", room_id, stream_id)
            continue
        await websocket.send_json(
            {
                "type": "replay",
                "room_id": room_id,
                "stream_id": stream_id,
                "event": payload,
            }
        )


@app.websocket("/ws/cognitive-stream")
async def cognitive_stream(
    websocket: WebSocket,
    api_key: Optional[str] = Query(None, alias="api_key"),
    x_api_key: Optional[str] = Header(None, alias="x-api-key"),
    last_event_id: Optional[str] = Query(None, alias="last_event_id"),
) -> None:
    if not await _authorize(websocket, api_key, x_api_key):
        return
    await websocket.accept()
    await _replay_events(websocket, "cognitive", last_event_id)
    try:
        while True:
            event = await websocket.receive_json()
            envelope = {"received_at": _now_iso(), "event": event}
            stream_id = await _append_room_event("cognitive", envelope)
            await websocket.send_json({"status": "accepted", "stream_id": stream_id})
    except WebSocketDisconnect:
        pass


@app.websocket("/ws/state-sync/{room_id}")
async def state_sync_stream(
    websocket: WebSocket,
    room_id: str,
    api_key: Optional[str] = Query(None, alias="api_key"),
    x_api_key: Optional[str] = Header(None, alias="x-api-key"),
    last_event_id: Optional[str] = Query(None, alias="last_event_id"),
) -> None:
    if not await _authorize(websocket, api_key, x_api_key):
        return
    await websocket.accept()
    await _replay_events(websocket, room_id, last_event_id)
    try:
        while True:
            raw_event = await websocket.receive_json()
            event, err = _build_room_event(room_id, raw_event)
            if err:
                await websocket.send_json({"status": "rejected", "room_id": room_id, "error": err})
                continue

            assert event is not None
            latest_stream_id = ROOM_LAST_STREAM_ID.get(room_id)
            base_stream_id = event.get("base_stream_id")
            conflict_stream_id = None
            if base_stream_id and latest_stream_id and base_stream_id != latest_stream_id:
                conflict_event = {
                    "schema_version": SCHEMA_VERSION,
                    "type": "conflict_resolution",
                    "room_id": room_id,
                    "conflict_policy": CONFLICT_POLICY,
                    "winning_stream_id": latest_stream_id,
                    "stale_base_stream_id": base_stream_id,
                    "incoming_actor_id": event.get("actor_id"),
                    "updated_at": _now_iso(),
                }
                conflict_stream_id = await _append_room_event(room_id, conflict_event)

            stream_id = await _append_room_event(room_id, event)
            await websocket.send_json(
                {
                    "status": "accepted",
                    "room_id": room_id,
                    "stream_id": stream_id,
                    "conflict_stream_id": conflict_stream_id,
                }
            )
    except WebSocketDisconnect:
        pass
