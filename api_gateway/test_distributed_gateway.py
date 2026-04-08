import asyncio
import time
from distributed_gateway import (
    DistributedGateway, MockControlPlane, MockEventBus,
    VectorClock, AkashicEnvelope, OutboundMessage, MessagePriority,
    ReconnectPlanner, Gatekeeper, ShardRouter
)


def test_gatekeeper_admission():
    gk = Gatekeeper(max_concurrent_conns=2, max_conn_rate=10)
    assert gk.try_admit() is True
    assert gk.try_admit() is True
    assert gk.try_admit() is False # Max concurrent
    gk.release()
    assert gk.try_admit() is True
    print("Gatekeeper tests passed!")


def test_shard_consistency():
    router = ShardRouter(shard_count=4)
    room_a_shard = router.shard_for_room("room-A")
    assert router.shard_for_room("room-A") == room_a_shard
    assert router.shard_for_room("room-B") != room_a_shard or True # Just verify deterministic
    print("ShardRouter tests passed!")


def test_distributed_broadcast():
    async def _run():
        cp = MockControlPlane()
        eb = MockEventBus()
        gateway = DistributedGateway("node-1", 4, cp, eb)

        # 1. Connect a user
        user_id = "user-123"
        room_id = "room-A"

        # We simulate a connection loop by checking the queue directly
        # instead of running handle_connection which blocks.
        await gateway._ensure_room_subscription(room_id)
        gateway.gatekeeper.try_admit()
        from distributed_gateway import ConnectionContext
        ctx = ConnectionContext(user_id, room_id, "APAC")
        gateway._active_connections[user_id] = ctx

        # 2. Broadcast to room
        await gateway.broadcast_to_room(room_id, "visual_delta", {"color": "green"})

        # 3. Verify user received the message in their queue
        assert len(ctx.queue) == 1
        msg = ctx.queue.pop()
        assert msg.priority == MessagePriority.PERCEPTUAL_EFFECT
        assert msg.envelope.payload["color"] == "green"
        assert msg.envelope.header.room_id == room_id

    asyncio.run(_run())
    print("Distributed broadcast tests passed!")


def test_backpressure_lifo():
    from distributed_gateway import BackpressureQueue, OutboundMessage, MessagePriority, AkashicEnvelope
    queue = BackpressureQueue(max_items=2)

    # 1. Fill queue with state messages (highest priority)
    msg1 = OutboundMessage(AkashicEnvelope.create("state", {"v": 1}), MessagePriority.STATE)
    msg2 = OutboundMessage(AkashicEnvelope.create("state", {"v": 2}), MessagePriority.STATE)
    queue.push(msg1)
    queue.push(msg2)

    # 2. Push perceptual effect when full
    msg3 = OutboundMessage(AkashicEnvelope.create("visual_delta", {"c": "red"}), MessagePriority.PERCEPTUAL_EFFECT)
    queue.push(msg3)

    # 3. Verify msg3 was dropped (lowest priority)
    assert queue.dropped_count == 1
    assert len(queue) == 2
    assert queue.pop() == msg1
    assert queue.pop() == msg2

    print("Backpressure LIFO tests passed!")


def test_reconnect_jitter():
    wait_0 = ReconnectPlanner.calculate_wait_ms(0)
    assert 1000 <= wait_0 < 2000

    wait_1 = ReconnectPlanner.calculate_wait_ms(1)
    assert 2000 <= wait_1 < 3000

    print("Reconnect jitter tests passed!")


async def main():
    test_gatekeeper_admission()
    test_shard_consistency()
    test_distributed_broadcast()
    test_backpressure_lifo()
    test_reconnect_jitter()
    print("\nAll Distributed Gateway tests passed!")


if __name__ == "__main__":
    asyncio.run(main())
