import json
import asyncio
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

class RedisState:
    def __init__(self, redis_client):
        self.r = redis_client
        self.metrics_key = "aetherium:metrics"
        self.telemetry_prefix = "aetherium:telemetry:"
        self.audit_export_key = "aetherium:audit:export"
        self.audit_ticket_key = "aetherium:audit:ticket"
        self.nonce_prefix = "aetherium:nonce:"
        self.room_prefix = "aetherium:room:"

    async def incr_metric(self, field: str):
        if self.r:
            await self.r.hincrby(self.metrics_key, field, 1)

    async def get_metrics(self) -> Dict[str, int]:
        if not self.r:
            return {"total_dsl_submissions": 0, "successful_renders": 0, "validation_failures": 0, "generative_requests": 0}
        raw = await self.r.hgetall(self.metrics_key)
        return {k: int(v) for k, v in raw.items()}

    async def ingest_telemetry(self, metric: str, point: Dict[str, Any]):
        if self.r:
            key = f"{self.telemetry_prefix}{metric}"
            await self.r.lpush(key, json.dumps(point))
            await self.r.ltrim(key, 0, 2499)

    async def query_telemetry(self, metric: str, window_seconds: int) -> List[Dict[str, Any]]:
        if not self.r:
            return []
        key = f"{self.telemetry_prefix}{metric}"
        raw_points = await self.r.lrange(key, 0, -1)
        now_ts = datetime.now(timezone.utc).timestamp()
        points = []
        for p in raw_points:
            data = json.loads(p)
            if now_ts - datetime.fromisoformat(data["ts"]).timestamp() <= window_seconds:
                points.append(data)
        return points

    async def add_audit_export(self, record: Dict[str, Any]):
        if self.r:
            await self.r.lpush(self.audit_export_key, json.dumps(record))
            await self.r.ltrim(self.audit_export_key, 0, 999)

    async def get_audit_export(self) -> List[Dict[str, Any]]:
        if not self.r:
            return []
        raw = await self.r.lrange(self.audit_export_key, 0, -1)
        return [json.loads(p) for p in raw]

    async def add_audit_ticket(self, event: Dict[str, Any]):
        if self.r:
            await self.r.lpush(self.audit_ticket_key, json.dumps(event))
            await self.r.ltrim(self.audit_ticket_key, 0, 1999)

    async def get_audit_ticket(self) -> List[Dict[str, Any]]:
        if not self.r:
            return []
        raw = await self.r.lrange(self.audit_ticket_key, 0, -1)
        return [json.loads(p) for p in raw]

    async def check_and_set_nonce(self, jti: str, ttl: int) -> bool:
        if not self.r:
            return True
        key = f"{self.nonce_prefix}{jti}"
        return await self.r.set(key, "1", ex=ttl, nx=True)

    async def get_room_state(self, room_id: str) -> Dict[str, Any]:
        if not self.r:
            return {"shared_state": {}, "user_state": {}}
        key = f"{self.room_prefix}{room_id}"
        data = await self.r.get(key)
        if data:
            return json.loads(data)
        return {"shared_state": {}, "user_state": {}}

    async def save_room_state(self, room_id: str, state: Dict[str, Any]):
        if self.r:
            key = f"{self.room_prefix}{room_id}"
            await self.r.set(key, json.dumps(state), ex=3600) # 1 hour TTL for room state
