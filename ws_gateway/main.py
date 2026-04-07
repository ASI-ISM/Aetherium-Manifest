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
    return True


async def _append_room_event(room_id: str, event: dict[str, Any]) -> None:
    if not r:
        return
    try:
        await r.xadd(f"state-sync:{room_id}", {"payload": json.dumps(event)}, maxlen=1000, approximate=True)
    except Exception:
        logger.exception("failed to append room event")


@app.websocket("/ws/cognitive-stream")
async def cognitive_stream(
    websocket: WebSocket,
    api_key: Optional[str] = Query(None, alias="api_key"),
    x_api_key: Optional[str] = Header(None, alias="x-api-key"),
) -> None:
    if not await _authorize(websocket, api_key, x_api_key):
        return
    await websocket.accept()
    try:
        while True:
            event = await websocket.receive_json()
            await _append_room_event("cognitive", {"received_at": datetime.now(timezone.utc).isoformat(), "event": event})
            await websocket.send_json({"status": "accepted"})
    except WebSocketDisconnect:
        pass


@app.websocket("/ws/state-sync/{room_id}")
async def state_sync_stream(
    websocket: WebSocket,
    room_id: str,
    api_key: Optional[str] = Query(None, alias="api_key"),
    x_api_key: Optional[str] = Header(None, alias="x-api-key"),
) -> None:
    if not await _authorize(websocket, api_key, x_api_key):
        return
    await websocket.accept()
    try:
        while True:
            delta = await websocket.receive_json()
            event = {
                "type": "state_delta",
                "room_id": room_id,
                "delta": delta,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            await _append_room_event(room_id, event)
            await websocket.send_json({"status": "accepted", "room_id": room_id})
    except WebSocketDisconnect:
        pass
