import importlib.util
import asyncio
import socket
import unittest

from api_gateway.aetherbus_extreme import (
    AetherBusExtreme,
    AkashicEnvelope,
    StateConvergenceProcessor,
    deserialize_from_msgpack,
    serialize_to_msgpack,
    zero_copy_send,
)


class AetherBusExtremeTests(unittest.IsolatedAsyncioTestCase):
    async def test_publish_and_dispatch(self) -> None:
        bus = AetherBusExtreme(queue_maxsize=16, max_queue_backpressure=12)
        got = []

        async def handler(envelope: AkashicEnvelope) -> None:
            got.append(envelope.payload["value"])

        bus.subscribe("topic", handler)
        await bus.start()
        await bus.publish("topic", AkashicEnvelope.create("event", {"value": 7}))

        await asyncio.wait_for(bus._queue.join(), timeout=1)
        await asyncio.sleep(0.01)
        await bus.shutdown()

        self.assertEqual(got, [7])

    async def test_backpressure_rejects(self) -> None:
        bus = AetherBusExtreme(queue_maxsize=2, max_queue_backpressure=0)
        ok = bus.publish_nowait("topic", AkashicEnvelope.create("event", {"value": 1}))
        self.assertFalse(ok)


class UtilityTests(unittest.TestCase):
    @unittest.skipUnless(importlib.util.find_spec("msgspec"), "msgspec is not installed in this environment")
    def test_msgpack_roundtrip(self) -> None:
        payload = {"trace_id": "abc", "score": 0.98}
        packed = serialize_to_msgpack(payload)
        unpacked = deserialize_from_msgpack(packed)
        self.assertEqual(unpacked, payload)

    def test_zero_copy_send(self) -> None:
        left, right = socket.socketpair()
        try:
            sent = zero_copy_send(left, b"tachyon")
            recv = right.recv(64)
            self.assertEqual(sent, 7)
            self.assertEqual(recv, b"tachyon")
        finally:
            left.close()
            right.close()

    def test_state_convergence_versioning(self) -> None:
        processor = StateConvergenceProcessor()
        self.assertTrue(processor.update_state("sync", {"v": 1}, version=3))
        self.assertFalse(processor.update_state("sync", {"v": 2}, version=2))
        self.assertEqual(processor.get_state("sync"), {"v": 1})
        self.assertEqual(processor.get_version("sync"), 3)


if __name__ == "__main__":
    unittest.main()
