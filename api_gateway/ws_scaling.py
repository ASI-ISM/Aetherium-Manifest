from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
import hashlib
import math
from typing import Any


class MessagePriority(str, Enum):
    """Priority ordering for outbound WebSocket events."""

    STATE = "state"
    TELEMETRY = "telemetry"
    PERCEPTUAL_EFFECT = "perceptual_effect"


@dataclass(slots=True)
class CapacityPlan:
    target_connections: int
    connections_per_node: int = 50_000
    redundancy_factor: float = 1.5
    memory_per_connection_kb: float = 3.0

    @property
    def baseline_nodes(self) -> int:
        return max(1, -(-self.target_connections // self.connections_per_node))

    @property
    def recommended_nodes(self) -> int:
        return max(1, math.ceil(self.baseline_nodes * self.redundancy_factor))

    @property
    def total_memory_gb(self) -> float:
        total_kb = self.target_connections * self.memory_per_connection_kb
        return round(total_kb / (1024 * 1024), 2)


@dataclass(slots=True)
class ConnectionEnvelope:
    conn_id: str
    user_id: str
    room_id: str
    region: str
    last_heartbeat_ms: int
    subscribed_topics: set[str] = field(default_factory=set)


@dataclass(slots=True)
class OutboundMessage:
    payload: dict[str, Any]
    priority: MessagePriority


class BackpressureQueue:
    """Bounded queue with state-first eviction policy.

    If capacity is exceeded, lower-priority perceptual effects are dropped first,
    then telemetry, while state messages are preserved as long as possible.
    """

    def __init__(self, max_items: int = 128) -> None:
        self.max_items = max_items
        self._items: list[OutboundMessage] = []
        self.dropped = 0

    def __len__(self) -> int:
        return len(self._items)

    def push(self, message: OutboundMessage) -> None:
        self._items.append(message)
        self._trim_if_needed()

    def pop(self) -> OutboundMessage | None:
        if not self._items:
            return None
        return self._items.pop(0)

    def _trim_if_needed(self) -> None:
        while len(self._items) > self.max_items:
            drop_index = self._first_index_of(MessagePriority.PERCEPTUAL_EFFECT)
            if drop_index is None:
                drop_index = self._first_index_of(MessagePriority.TELEMETRY)
            if drop_index is None:
                drop_index = 0
            self._items.pop(drop_index)
            self.dropped += 1

    def _first_index_of(self, priority: MessagePriority) -> int | None:
        for idx, item in enumerate(self._items):
            if item.priority == priority:
                return idx
        return None


@dataclass(slots=True)
class ShardRouter:
    shard_count: int

    def shard_for_room(self, room_id: str) -> int:
        if self.shard_count <= 0:
            raise ValueError("shard_count must be positive")
        digest = hashlib.sha256(room_id.encode("utf-8")).digest()
        room_hash = int.from_bytes(digest[:8], byteorder="big", signed=False)
        return room_hash % self.shard_count


@dataclass(slots=True)
class ReconnectPlan:
    shard_id: int
    should_resume: bool
    replay_from_version: int | None


def plan_reconnect(
    room_id: str,
    last_known_version: int | None,
    latest_version: int,
    shard_count: int,
) -> ReconnectPlan:
    """Map reconnect requests back to shard and replay strategy."""

    shard_id = ShardRouter(shard_count=shard_count).shard_for_room(room_id)
    if last_known_version is None or last_known_version >= latest_version:
        return ReconnectPlan(shard_id=shard_id, should_resume=False, replay_from_version=None)

    return ReconnectPlan(
        shard_id=shard_id,
        should_resume=True,
        replay_from_version=last_known_version,
    )
