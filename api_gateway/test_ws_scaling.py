from __future__ import annotations

from .ws_scaling import (
    BackpressureQueue,
    CapacityPlan,
    MessagePriority,
    OutboundMessage,
    ShardRouter,
    plan_reconnect,
)


def test_capacity_plan_for_1m_connections() -> None:
    plan = CapacityPlan(target_connections=1_000_000)

    assert plan.baseline_nodes == 20
    assert plan.recommended_nodes == 30
    assert plan.total_memory_gb == 2.86


def test_shard_router_is_stable_for_same_room() -> None:
    router = ShardRouter(shard_count=64)

    first = router.shard_for_room("room-alpha")
    second = router.shard_for_room("room-alpha")

    assert first == second
    assert 0 <= first < 64


def test_backpressure_drops_perceptual_effects_before_state() -> None:
    queue = BackpressureQueue(max_items=2)

    queue.push(OutboundMessage(payload={"type": "state"}, priority=MessagePriority.STATE))
    queue.push(
        OutboundMessage(
            payload={"type": "perceptual_effect"},
            priority=MessagePriority.PERCEPTUAL_EFFECT,
        )
    )
    queue.push(OutboundMessage(payload={"type": "state"}, priority=MessagePriority.STATE))

    types = [item.payload["type"] for item in [queue.pop(), queue.pop()] if item]
    assert types == ["state", "state"]
    assert queue.dropped == 1


def test_reconnect_plan_requests_replay_when_versions_lag() -> None:
    reconnect = plan_reconnect(
        room_id="room-1",
        last_known_version=10,
        latest_version=14,
        shard_count=32,
    )

    assert reconnect.should_resume is True
    assert reconnect.replay_from_version == 10
    assert 0 <= reconnect.shard_id < 32


def test_reconnect_plan_no_replay_when_versions_match() -> None:
    reconnect = plan_reconnect(
        room_id="room-1",
        last_known_version=14,
        latest_version=14,
        shard_count=32,
    )

    assert reconnect.should_resume is False
    assert reconnect.replay_from_version is None
