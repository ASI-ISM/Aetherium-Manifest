import asyncio
import json
import os
import logging
from typing import Dict, List, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import nats
from nats.js.errors import NoSuchStreamError
import redis.asyncio as redis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ws-gateway")

app = FastAPI(title="Aetherium WebSocket Gateway")

# Configuration
NATS_URL = os.getenv("NATS_URL", "nats://localhost:4222")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
ROOM_HASH_MODE = os.getenv("WS_SHARD_MODE", "room-hash")

# Global state (only clients connected to this POD)
local_clients: Dict[str, List[WebSocket]] = {}
nc = None
js = None
r = None

@app.on_event("startup")
async def startup_event():
    global nc, js, r
    # Initialize NATS
    try:
        nc = await nats.connect(NATS_URL)
        js = nc.jetstream()
        logger.info(f"Connected to NATS at {NATS_URL}")

        # Subscribe to visual commands
        # In a real shard, we'd only subscribe to rooms handled by this pod,
        # but here we'll filter by subject.
        await js.subscribe("visual.commands.>", cb=nats_handler, deliver_new=True)
    except Exception as e:
        logger.error(f"NATS startup failed: {e}")

    # Initialize Redis
    try:
        r = redis.from_url(REDIS_URL, decode_responses=True)
        logger.info(f"Connected to Redis at {REDIS_URL}")
    except Exception as e:
        logger.error(f"Redis startup failed: {e}")

async def nats_handler(msg):
    # Subject: visual.commands.<region>.<room_id>
    subject = msg.subject
    parts = subject.split(".")
    if len(parts) >= 4:
        room_id = parts[3]
        if room_id in local_clients:
            data = msg.data.decode()
            await broadcast_to_room(room_id, json.loads(data))
    await msg.ack()

async def broadcast_to_room(room_id: str, message: Dict):
    if room_id in local_clients:
        disconnected = []
        for client in local_clients[room_id]:
            try:
                await client.send_json(message)
            except Exception:
                disconnected.append(client)

        for client in disconnected:
            local_clients[room_id].remove(client)
            if not local_clients[room_id]:
                del local_clients[room_id]

@app.websocket("/ws/room/{room_id}")
async def room_websocket(websocket: WebSocket, room_id: str):
    await websocket.accept()

    # Store client locally
    if room_id not in local_clients:
        local_clients[room_id] = []
    local_clients[room_id].append(websocket)

    # Register connection in Redis (for presence/sharding metadata)
    pod_name = os.getenv("HOSTNAME", "local")
    conn_id = f"{pod_name}:{id(websocket)}"
    await r.sadd(f"room:{room_id}:members", conn_id)
    await r.set(f"conn:{conn_id}", f"{pod_name}:{room_id}")

    try:
        while True:
            data = await websocket.receive_json()
            # For now, incoming WS messages could be room state updates or intents
            # In production, we'd publish these to NATS for the governor to process
            await js.publish(f"room.events.global.{room_id}", json.dumps({
                "type": "client_event",
                "room_id": room_id,
                "data": data,
                "conn_id": conn_id
            }).encode())

    except WebSocketDisconnect:
        local_clients[room_id].remove(websocket)
        if not local_clients[room_id]:
            del local_clients[room_id]
        await r.srem(f"room:{room_id}:members", conn_id)
        await r.delete(f"conn:{conn_id}")

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "active_rooms_on_pod": len(local_clients),
        "nats": "connected" if nc and nc.is_connected else "disconnected",
        "redis": "connected" if r else "disconnected"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
