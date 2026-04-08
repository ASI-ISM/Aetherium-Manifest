from __future__ import annotations

import asyncio
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Any, Awaitable, Callable, Mapping

import importlib


@dataclass(frozen=True, slots=True)
class EnvelopeHeader:
    trace_id: str
    timestamp: float = field(default_factory=time.time)
    message_type: str = "standard"

    def __hash__(self) -> int:
        return hash((self.trace_id, self.timestamp, self.message_type))


@dataclass(frozen=True, slots=True)
class AkashicEnvelope:
    header: EnvelopeHeader
    payload: Mapping[str, Any]

    @classmethod
    def create(
        cls,
        msg_type: str,
        data: Mapping[str, Any],
        trace_id: str | None = None,
    ) -> "AkashicEnvelope":
        immutable_payload = MappingProxyType(dict(data))
        return cls(
            header=EnvelopeHeader(
                trace_id=trace_id or uuid.uuid4().hex,
                message_type=msg_type,
            ),
            payload=immutable_payload,
        )


def zero_copy_send(sock: Any, data: bytes | bytearray | memoryview) -> int:
    mv = memoryview(data)
    total_sent = 0
    while total_sent < len(mv):
        sent = sock.send(mv[total_sent:])
        if sent == 0:
            raise ConnectionError("socket connection broken")
        total_sent += sent
    return total_sent


def _load_msgspec() -> Any:
    if not hasattr(_load_msgspec, "_module"):
        _load_msgspec._module = importlib.import_module("msgspec")
    return _load_msgspec._module


def serialize_to_msgpack(data: Any) -> bytes:
    msgspec = _load_msgspec()
    return msgspec.msgpack.encode(data)


def deserialize_from_msgpack(data: bytes | bytearray | memoryview, type_hint: type[Any] | None = None) -> Any:
    msgspec = _load_msgspec()
    if type_hint is None:
        return msgspec.msgpack.decode(data)
    return msgspec.msgpack.decode(data, type=type_hint)


class AetherBusExtreme:
    __slots__ = (
        "_subscribers",
        "_background_tasks",
        "_queue",
        "_is_running",
        "_worker_task",
        "_max_queue_backpressure",
        "_dispatch_semaphore",
    )

    def __init__(
        self,
        queue_maxsize: int = 100_000,
        max_queue_backpressure: int = 80_000,
        max_concurrent_handlers: int = 2048,
    ) -> None:
        self._subscribers: dict[str, set[Callable[[AkashicEnvelope], Awaitable[None]]]] = defaultdict(set)
        self._background_tasks: set[asyncio.Task[None]] = set()
        self._queue: asyncio.Queue[tuple[str, AkashicEnvelope]] = asyncio.Queue(maxsize=queue_maxsize)
        self._is_running = False
        self._worker_task: asyncio.Task[None] | None = None
        self._max_queue_backpressure = max_queue_backpressure
        self._dispatch_semaphore = asyncio.Semaphore(max_concurrent_handlers)

    async def start(self) -> None:
        if self._is_running:
            return
        self._is_running = True
        self._worker_task = asyncio.create_task(self._process_queue(), name="AetherBusWorker")

    async def _process_queue(self) -> None:
        while self._is_running:
            try:
                topic, envelope = await self._queue.get()
                await self._dispatch(topic, envelope)
                self._queue.task_done()
            except asyncio.CancelledError:
                break

    def subscribe(self, topic: str, handler: Callable[[AkashicEnvelope], Awaitable[None]]) -> None:
        self._subscribers[topic].add(handler)

    async def handle_backpressure(self) -> None:
        if self._queue.qsize() >= self._max_queue_backpressure:
            raise RuntimeError("Too many requests")

    def publish_nowait(self, topic: str, envelope: AkashicEnvelope) -> bool:
        if self._queue.qsize() >= self._max_queue_backpressure:
            return False
        try:
            self._queue.put_nowait((topic, envelope))
            return True
        except asyncio.QueueFull:
            return False

    async def publish(self, topic: str, envelope: AkashicEnvelope) -> None:
        await self.handle_backpressure()
        await self._queue.put((topic, envelope))

    async def _dispatch(self, topic: str, envelope: AkashicEnvelope) -> None:
        handlers = self._subscribers.get(topic, set())
        if not handlers:
            return

        for handler in handlers:
            task = asyncio.create_task(self._safe_execute(handler, envelope), name=f"handler:{topic}")
            self._background_tasks.add(task)
            task.add_done_callback(self._background_tasks.discard)

    async def _safe_execute(
        self,
        handler: Callable[[AkashicEnvelope], Awaitable[None]],
        envelope: AkashicEnvelope,
    ) -> None:
        async with self._dispatch_semaphore:
            await handler(envelope)

    async def shutdown(self) -> None:
        self._is_running = False
        if self._worker_task:
            self._worker_task.cancel()
            await asyncio.gather(self._worker_task, return_exceptions=True)

        if self._background_tasks:
            for task in self._background_tasks:
                task.cancel()
            await asyncio.gather(*self._background_tasks, return_exceptions=True)


class NATSJetStreamManager:
    def __init__(self, servers: list[str]) -> None:
        self.nc: Any | None = None
        self.servers = servers

    async def connect(self) -> None:
        nats_module = importlib.import_module("nats.aio.client")
        self.nc = nats_module.Client()
        await self.nc.connect(servers=self.servers)

    async def publish_async(self, subject: str, payload: bytes) -> None:
        if self.nc is None:
            raise RuntimeError("NATS client is not connected")
        await self.nc.publish(subject, payload)

    async def close(self) -> None:
        if self.nc is not None:
            await self.nc.close()


class StateConvergenceProcessor:
    def __init__(self) -> None:
        self._state: dict[str, Any] = {}
        self._versions: dict[str, int] = {}

    def update_state(self, key: str, value: Any, version: int | None = None) -> bool:
        current_version = self._versions.get(key, -1)
        candidate_version = current_version + 1 if version is None else version
        if candidate_version <= current_version:
            return False

        self._state[key] = value
        self._versions[key] = candidate_version
        return True

    def get_state(self, key: str) -> Any:
        return self._state.get(key)

    def get_version(self, key: str) -> int | None:
        return self._versions.get(key)
