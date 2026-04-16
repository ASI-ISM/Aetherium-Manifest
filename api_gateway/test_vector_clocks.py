from distributed_gateway import VectorClock, AkashicEnvelope

def test_vector_clock_logic():
    vc1 = VectorClock({"A": 1})
    vc2 = VectorClock({"A": 1})
    assert vc1.compare(vc2) == 0

    vc2.increment("A")
    assert vc1.compare(vc2) == -1
    assert vc2.compare(vc1) == 1

    vc1.increment("B")
    # vc1: {"A": 1, "B": 1}, vc2: {"A": 2} -> Concurrent
    assert vc1.compare(vc2) is None

    vc1.merge(vc2)
    # vc1: {"A": 2, "B": 1}
    assert vc1.compare(vc2) == 1

    print("VectorClock tests passed!")

def test_envelope_creation():
    vc = VectorClock({"node-1": 5})
    payload = {"color": "blue"}
    envelope = AkashicEnvelope.create(
        msg_type="visual_delta",
        data=payload,
        vector_clock=vc,
        origin_node="node-1",
        room_id="room-42"
    )

    assert envelope.header.message_type == "visual_delta"
    assert envelope.header.vector_clock["node-1"] == 5
    assert envelope.payload["color"] == "blue"
    assert envelope.header.room_id == "room-42"

    print("AkashicEnvelope tests passed!")

if __name__ == "__main__":
    test_vector_clock_logic()
    test_envelope_creation()
