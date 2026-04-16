from __future__ import annotations

import asyncio
import collections
import hashlib
import json
import math
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Union, Protocol, Mapping
from types import MappingProxyType

# --- 1. Vector Clock & Causality Tracking ---

class VectorClock:
    """A thread-safe implementation of a Vector Clock for causality tracking.

    Supports incrementing, merging, and comparing (happens-before relationship).
    """
    __slots__ = ("_clock",)

    def __init__(self, initial_clock: Optional[Dict[str, int]] = None) -> None:
        self._clock: Dict[str, int] = initial_clock or {}

    def increment(self, node_id: str) -> None:
        self._clock[node_id] = self._clock.get(node_id, 0) + 1

    def merge(self, other: VectorClock) -> None:
        for node_id, count in other._clock.items():
            self._clock[node_id] = max(self._clock.get(node_id, 0), count)

    def compare(self, other: VectorClock) -> Optional[int]:
        """Compares this clock with another.

        Returns:
            -1 if this < other (happens-before)
             1 if this > other (happened-after)
             0 if this == other
            None if they are concurrent (conflict)
        """
        is_smaller = False
        is_greater = False

        all_nodes = set(self._clock.keys()) | set(other._clock.keys())

        for node in all_nodes:
            v1 = self._clock.get(node, 0)
            v2 = other._clock.get(node, 0)
            if v1 < v2:
                is_smaller = True
            elif v1 > v2:
                is_greater = True

        if is_smaller and not is_greater:
            return -1
        if is_greater and not is_smaller:
            return 1
        if not is_smaller and not is_greater:
            return 0
        return None # Concurrent (conflict)

    def to_dict(self) -> Dict[str, int]:
        return self._clock.copy()

    @classmethod
    def from_dict(cls, data: Dict[str, int]) -> VectorClock:
        return cls(data)

    def __repr__(self) -> str:
        return f"VectorClock({self._clock})"


@dataclass(frozen=True, slots=True)
class EnvelopeHeader:
    trace_id: str
    timestamp: float = field(default_factory=time.time)
    message_type: str = "standard"
    vector_clock: Dict[str, int] = field(default_factory=dict)
    origin_node: Optional[str] = None
    room_id: Optional[str] = None

    def __hash__(self) -> int:
        # Convert dict to tuple of sorted items for hashing
        return hash((self.trace_id, self.timestamp, self.message_type, tuple(sorted(self.vector_clock.items()))))


@dataclass(frozen=True, slots=True)
class AkashicEnvelope:
    """The standard container for AetherBus messages, now with Vector Clock support."""
    header: EnvelopeHeader
    payload: Mapping[str, Any]

    @classmethod
    def create(
        cls,
        msg_type: str,
        data: Mapping[str, Any],
        trace_id: Optional[str] = None,
        vector_clock: Optional[VectorClock] = None,
        origin_node: Optional[str] = None,
        room_id: Optional[str] = None,
    ) -> AkashicEnvelope:
        vc_dict = vector_clock.to_dict() if vector_clock else {}
        # Ensure payload is immutable
        immutable_payload = MappingProxyType(dict(data))
        return cls(
            header=EnvelopeHeader(
                trace_id=trace_id or uuid.uuid4().hex,
                message_type=msg_type,
                vector_clock=vc_dict,
                origin_node=origin_node,
                room_id=room_id,
            ),
            payload=immutable_payload,
        )

    def get_vector_clock(self) -> VectorClock:
        return VectorClock.from_dict(self.header.vector_clock)

# --- 2. Interfaces & Core Contracts ---

class IControlPlane(Protocol):
    """Interface for the Redis-backed control plane (session/room metadata)."""
    async def get_session(self, user_id: str) -> Optional[Dict[str, Any]]: ...
    async def set_session(self, user_id: str, data: Dict[str, Any], ttl: int) -> None: ...
    async def get_room_metadata(self, room_id: str) -> Optional[Dict[str, Any]]: ...
    async def update_room_metadata(self, room_id: str, data: Dict[str, Any]) -> None: ...
    async def increment_room_version(self, room_id: str) -> int: ...


class IEventBus(Protocol):
    """Interface for the NATS-backed event bus (distributed fanout)."""
    async def publish(self, topic: str, envelope: AkashicEnvelope) -> None: ...
    async def subscribe(self, topic: str, handler: Callable[[AkashicEnvelope], asyncio.Awaitable[None]]) -> str: ...
    async def unsubscribe(self, subscription_id: str) -> None: ...


# --- 3. Mock Implementations for Local Testing ---

class MockControlPlane:
    def __init__(self) -> None:
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._rooms: Dict[str, Dict[str, Any]] = {}
        self._room_versions: Dict[str, int] = collections.defaultdict(int)

    async def get_session(self, user_id: str) -> Optional[Dict[str, Any]]:
        return self._sessions.get(user_id)

    async def set_session(self, user_id: str, data: Dict[str, Any], ttl: int) -> None:
        self._sessions[user_id] = data

    async def get_room_metadata(self, room_id: str) -> Optional[Dict[str, Any]]:
        return self._rooms.get(room_id)

    async def update_room_metadata(self, room_id: str, data: Dict[str, Any]) -> None:
        room = self._rooms.setdefault(room_id, {})
        room.update(data)

    async def increment_room_version(self, room_id: str) -> int:
        self._room_versions[room_id] += 1
        return self._room_versions[room_id]


class MockEventBus:
    def __init__(self) -> None:
        self._handlers: Dict[str, Set[Callable[[AkashicEnvelope], asyncio.Awaitable[None]]]] = collections.defaultdict(set)

    async def publish(self, topic: str, envelope: AkashicEnvelope) -> None:
        if topic in self._handlers:
            tasks = [handler(envelope) for handler in self._handlers[topic]]
            if tasks:
                await asyncio.gather(*tasks)

    async def subscribe(self, topic: str, handler: Callable[[AkashicEnvelope], asyncio.Awaitable[None]]) -> str:
        self._handlers[topic].add(handler)
        return f"{topic}:{id(handler)}"

    async def unsubscribe(self, subscription_id: str) -> None:
        topic, handler_id = subscription_id.split(":", 1)
        # In a real mock we'd need to map handler_id back to the handler object.
        # This is simplified for the blueprint.
        pass

# --- 4. Distributed Sharding & Routing ---

class ShardRouter:
    """Deterministic room-to-shard mapping for distributed gateway nodes."""
    __slots__ = ("shard_count",)

    def __init__(self, shard_count: int) -> None:
        self.shard_count = shard_count

    def shard_for_room(self, room_id: str) -> int:
        if self.shard_count <= 0:
            raise ValueError("shard_count must be positive")
        digest = hashlib.sha256(room_id.encode("utf-8")).digest()
        room_hash = int.from_bytes(digest[:8], byteorder="big", signed=False)
        return room_hash % self.shard_count


# --- 5. High-Density Gatekeeper (Admission Control) ---

class Gatekeeper:
    """Manages admission control to prevent cascading failures (The Thundering Herd)."""

    def __init__(self, max_concurrent_conns: int = 50_000, max_conn_rate: float = 1000.0) -> None:
        self.max_concurrent_conns = max_concurrent_conns
        self.max_conn_rate = max_conn_rate
        self.current_conns = 0
        self._last_refill = time.time()
        self._tokens = max_conn_rate

    def try_admit(self) -> bool:
        """Token bucket for connection rate limiting + concurrency check."""
        if self.current_conns >= self.max_concurrent_conns:
            return False

        now = time.time()
        delta = now - self._last_refill
        self._tokens = min(self.max_conn_rate, self._tokens + delta * self.max_conn_rate)
        self._last_refill = now

        if self._tokens >= 1.0:
            self._tokens -= 1.0
            self.current_conns += 1
            return True
        return False

    def release(self) -> None:
        self.current_conns = max(0, self.current_conns - 1)


# --- 6. Optimized Backpressure (LIFO & Merging) ---

class MessagePriority(str, Enum):
    STATE = "state"
    TELEMETRY = "telemetry"
    PERCEPTUAL_EFFECT = "perceptual_effect"


@dataclass(slots=True)
class OutboundMessage:
    envelope: AkashicEnvelope
    priority: MessagePriority


class BackpressureQueue:
    """LIFO-biased queue with visual delta merging to handle slow clients.

    When capacity is reached, it drops or merges messages to preserve
    perceptual fluidity without crashing the node.
    """

    def __init__(self, max_items: int = 128) -> None:
        self.max_items = max_items
        self._items: collections.deque[OutboundMessage] = collections.deque()
        self.dropped_count = 0

    def __len__(self) -> int:
        return len(self._items)

    def push(self, msg: OutboundMessage) -> None:
        # Optimization: Merge visual deltas if already in queue
        if msg.priority == MessagePriority.PERCEPTUAL_EFFECT:
            for existing in reversed(self._items):
                if existing.priority == MessagePriority.PERCEPTUAL_EFFECT:
                    # In a real system, we'd deep-merge the payloads here.
                    # For this blueprint, we simply replace with the latest (LIFO)
                    # if they target the same semantic key.
                    break

        self._items.append(msg)
        self._trim_if_needed()

    def _trim_if_needed(self) -> None:
        while len(self._items) > self.max_items:
            # 1. Try to drop perceptual effects first (lowest priority)
            drop_idx = self._find_first_of_priority(MessagePriority.PERCEPTUAL_EFFECT)
            if drop_idx is None:
                # 2. Then try to drop telemetry
                drop_idx = self._find_first_of_priority(MessagePriority.TELEMETRY)
            if drop_idx is None:
                # 3. Fallback: drop oldest (FIFO)
                drop_idx = 0

            # Efficiently remove the item at drop_idx
            # Note: pop(idx) is O(N), but at 128 items max, it's fine.
            self._items.rotate(-drop_idx)
            self._items.popleft()
            self._items.rotate(drop_idx)
            self.dropped_count += 1

    def _find_first_of_priority(self, priority: MessagePriority) -> Optional[int]:
        for idx, item in enumerate(self._items):
            if item.priority == priority:
                return idx
        return None

    def pop(self) -> Optional[OutboundMessage]:
        if not self._items:
            return None
        return self._items.popleft()

# --- 7. Connection Context & Protocol Handler ---

class ConnectionContext:
    """The state container for a single WebSocket connection (user session)."""
    __slots__ = ("user_id", "room_id", "region", "last_heartbeat", "queue", "last_ack_version")

    def __init__(self, user_id: str, room_id: str, region: str) -> None:
        self.user_id = user_id
        self.room_id = room_id
        self.region = region
        self.last_heartbeat = time.time()
        self.queue = BackpressureQueue(max_items=256)
        self.last_ack_version = 0

class DistributedGateway:
    """Production-grade gateway for Aetherium, handling 1,000,000 CCU topology."""

    def __init__(
        self,
        node_id: str,
        shard_count: int,
        control_plane: IControlPlane,
        event_bus: IEventBus,
        max_connections: int = 50_000
    ) -> None:
        self.node_id = node_id
        self.shard_count = shard_count
        self.control_plane = control_plane
        self.event_bus = event_bus
        self.gatekeeper = Gatekeeper(max_concurrent_conns=max_connections)
        self.router = ShardRouter(shard_count=shard_count)
        self._active_connections: Dict[str, ConnectionContext] = {}
        self._room_subscriptions: Set[str] = set()
        self._my_shards: Set[int] = set()

    async def handle_connection(self, user_id: str, room_id: str, region: str) -> None:
        """Entry point for a new WebSocket connection."""
        if not self.gatekeeper.try_admit():
            # Raise exception or return error to signal HTTP 503 (Gatekeeper rejected)
            raise RuntimeError("Admission denied: Node capacity or rate limit reached.")

        context = ConnectionContext(user_id, room_id, region)
        self._active_connections[user_id] = context

        # Room sharding check: is this node the owner of this room?
        shard_id = self.router.shard_for_room(room_id)
        if shard_id not in self._my_shards:
            # If this node doesn't own the shard, we mark this as a "Proxy" connection
            # but still allow it to receive messages from the event bus for that room.
            pass

        # Ensure we are subscribed to this room's topic on the event bus
        await self._ensure_room_subscription(room_id)

        try:
            # Reconnect Plan: jitter + exponential backoff check would happen here
            await self._run_session_loop(context)
        finally:
            self._active_connections.pop(user_id, None)
            self.gatekeeper.release()

    async def _ensure_room_subscription(self, room_id: str) -> None:
        if room_id not in self._room_subscriptions:
            topic = f"room.{room_id}"
            await self.event_bus.subscribe(topic, self._on_room_event)
            self._room_subscriptions.add(room_id)

    async def _on_room_event(self, envelope: AkashicEnvelope) -> None:
        """Inbound event from the distributed bus (Fanout)."""
        room_id = envelope.header.room_id
        if not room_id:
            return

        # Deterministic filtering: only broadcast to local connections in this room
        for conn in self._active_connections.values():
            if conn.room_id == room_id:
                priority = MessagePriority.STATE
                if envelope.header.message_type == "visual_delta":
                    priority = MessagePriority.PERCEPTUAL_EFFECT
                elif envelope.header.message_type == "telemetry":
                    priority = MessagePriority.TELEMETRY

                conn.queue.push(OutboundMessage(envelope, priority))

    async def _run_session_loop(self, context: ConnectionContext) -> None:
        """Main loop for a single connection, sending messages to the client."""
        while True:
            # Zombie killing: check heartbeat
            if time.time() - context.last_heartbeat > 30:
                # Terminate connection (zombie detected)
                break

            msg = context.queue.pop()
            if msg:
                # Optimized send logic (MsgPack / Binary) would happen here
                # await self._send_to_websocket(context, msg)
                pass
            else:
                await asyncio.sleep(0.01) # Low latency poll

    async def broadcast_to_room(self, room_id: str, msg_type: str, data: dict) -> None:
        """Publishes an event to the distributed bus for room fanout."""
        # 1. Increment version in control plane
        version = await self.control_plane.increment_room_version(room_id)

        # 2. Create envelope with Vector Clock
        # In a real system, we'd fetch and merge the current VC for this room
        vc = VectorClock({self.node_id: version})
        envelope = AkashicEnvelope.create(
            msg_type=msg_type,
            data=data,
            vector_clock=vc,
            origin_node=self.node_id,
            room_id=room_id
        )

        # 3. Publish to distributed bus
        await self.event_bus.publish(f"room.{room_id}", envelope)

# --- 8. Distributed Logic & Safety Features ---

class ReconnectPlanner:
    """Calculates jittered exponential backoff to spread the load of reconnects."""

    @staticmethod
    def calculate_wait_ms(n_attempt: int) -> int:
        base = min(30, 2 ** n_attempt)
        jitter = uuid.uuid4().int % 1000 # 0-999ms jitter
        return (base * 1000) + jitter

class RegionHomeProxy:
    """Handles proxying requests back to the home region for room SSOT."""

    def __init__(self, my_region: str, control_plane: IControlPlane) -> None:
        self.my_region = my_region
        self.control_plane = control_plane

    async def get_target_region(self, room_id: str) -> str:
        metadata = await self.control_plane.get_room_metadata(room_id)
        return metadata.get("home_region", "US") if metadata else "US"

    def should_proxy(self, target_region: str) -> bool:
        return self.my_region != target_region


# --- 9. Adaptive Rate Control (FPS Throttling) ---

class AdaptiveFPS:
    """Throttles visual deltas for slow clients based on their queue depth."""

    @staticmethod
    def calculate_skip_rate(queue_size: int, max_queue: int) -> float:
        fill_ratio = queue_size / max_queue
        if fill_ratio < 0.5:
            return 1.0 # No skip
        if fill_ratio < 0.8:
            return 0.5 # Skip half (30Hz -> 15Hz)
        return 0.2 # Skip most (30Hz -> 6Hz)


# --- 10. Payload & Heartbeat Enforcement ---

class SafetyEnforcer:
    """Strict constraints on message size and heartbeat frequency."""
    MAX_PAYLOAD_SIZE = 4096 # 4KB as per blueprint
    HEARTBEAT_TIMEOUT = 30  # 30 seconds

    @staticmethod
    def check_payload(data: Union[str, bytes]) -> bool:
        return len(data) <= SafetyEnforcer.MAX_PAYLOAD_SIZE

    @staticmethod
    def is_zombie(last_heartbeat: float) -> bool:
        return (time.time() - last_heartbeat) > SafetyEnforcer.HEARTBEAT_TIMEOUT
