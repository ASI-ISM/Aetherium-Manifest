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


async def _append_room_event(room_id: str, event: dict[str, Any]) -> str | None:
    if not r:
        return None
    try:
        return await r.xadd(
            _stream_key(room_id),
            {"payload": json.dumps(event)},
            maxlen=STATE_SYNC_STREAM_MAXLEN,
            approximate=True,
        )
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
            envelope = {"received_at": datetime.now(timezone.utc).isoformat(), "event": event}
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
            delta = await websocket.receive_json()
            event = {
                "type": "state_delta",
                "room_id": room_id,
                "delta": delta,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            stream_id = await _append_room_event(room_id, event)
            await websocket.send_json({"status": "accepted", "room_id": room_id, "stream_id": stream_id})
    except WebSocketDisconnect:
        pass
