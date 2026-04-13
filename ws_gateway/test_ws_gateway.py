from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from . import main
from .main import app


class InMemoryRedis:
    def __init__(self) -> None:
        self.streams: dict[str, list[tuple[str, dict[str, str]]]] = {}
        self.counter = 0

    async def xadd(self, stream: str, fields: dict[str, str], maxlen: int | None = None, approximate: bool = True) -> str:
        self.counter += 1
        stream_id = f"1-{self.counter}"
        self.streams.setdefault(stream, []).append((stream_id, fields))
        if maxlen and len(self.streams[stream]) > maxlen:
            self.streams[stream] = self.streams[stream][-maxlen:]
        return stream_id

    async def xrange(self, stream: str, min: str, max: str, count: int) -> list[tuple[str, dict[str, str]]]:
        events = self.streams.get(stream, [])
        start_exclusive = "0-0"
        if min.startswith("("):
            start_exclusive = min[1:]
        filtered = [item for item in events if item[0] > start_exclusive]
        return filtered[:count]


@pytest.fixture
def client() -> TestClient:
    main.r = InMemoryRedis()  # type: ignore[assignment]
    main.ROOM_LAST_STREAM_ID.clear()
    return TestClient(app)


def test_websocket_stream_missing_key(client: TestClient) -> None:
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect('/ws/cognitive-stream'):
            pass


def test_websocket_stream_with_query_key(client: TestClient) -> None:
    with client.websocket_connect('/ws/cognitive-stream?api_key=test-key') as websocket:
        websocket.send_json({'type': 'dsl_submission', 'payload': '...'})
        response = websocket.receive_json()
        assert response['status'] == 'accepted'


def test_state_sync_websocket_requires_api_key(client: TestClient) -> None:
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect('/ws/state-sync/demo-room'):
            pass


def test_state_sync_presence_event_and_role_scope_permissions(client: TestClient) -> None:
    with client.websocket_connect('/ws/state-sync/room-a?api_key=test-key') as websocket:
        websocket.send_json(
            {
                'type': 'presence',
                'action': 'join',
                'actor_id': 'u-designer',
                'role': 'designer',
                'payload': {'device': 'desktop'},
            }
        )
        accepted = websocket.receive_json()
        assert accepted['status'] == 'accepted'

        websocket.send_json(
            {
                'type': 'approval',
                'action': 'approve',
                'actor_id': 'u-designer',
                'role': 'designer',
                'target_event_id': accepted['stream_id'],
            }
        )
        rejected = websocket.receive_json()
        assert rejected['status'] == 'rejected'
        assert rejected['error']['error'] == 'permission_denied'


def test_state_sync_approval_event_for_brand_lead_and_operator(client: TestClient) -> None:
    with client.websocket_connect('/ws/state-sync/room-b?api_key=test-key') as websocket:
        websocket.send_json(
            {
                'type': 'approval',
                'action': 'approve',
                'actor_id': 'u-brand',
                'role': 'brand_lead',
                'target_event_id': '1-1',
                'payload': {'comment': 'on-brand'},
            }
        )
        brand_resp = websocket.receive_json()
        assert brand_resp['status'] == 'accepted'

        websocket.send_json(
            {
                'type': 'approval',
                'action': 'reject',
                'actor_id': 'u-ops',
                'role': 'operator',
                'target_event_id': '1-1',
                'payload': {'comment': 'policy block'},
            }
        )
        op_resp = websocket.receive_json()
        assert op_resp['status'] == 'accepted'


def test_replay_consistency_and_conflict_resolution_for_concurrent_edits(client: TestClient) -> None:
    with client.websocket_connect('/ws/state-sync/room-c?api_key=test-key') as websocket:
        websocket.send_json(
            {
                'type': 'action',
                'action': 'edit_layer',
                'scope': 'state.visual',
                'actor_id': 'u1',
                'role': 'designer',
                'payload': {'layer': 'hero', 'value': '#fff'},
            }
        )
        first = websocket.receive_json()
        assert first['status'] == 'accepted'

        websocket.send_json(
            {
                'type': 'action',
                'action': 'edit_layer',
                'scope': 'state.visual',
                'actor_id': 'u2',
                'role': 'designer',
                'base_stream_id': '1-0',
                'payload': {'layer': 'hero', 'value': '#000'},
            }
        )
        second = websocket.receive_json()
        assert second['status'] == 'accepted'
        assert second['conflict_stream_id'] is not None

    with client.websocket_connect('/ws/state-sync/room-c?api_key=test-key&last_event_id=0-0') as replay_socket:
        replay_events = [replay_socket.receive_json() for _ in range(3)]

    assert [event['event']['type'] for event in replay_events] == ['action', 'conflict_resolution', 'action']
    assert replay_events[1]['event']['conflict_policy']['strategy'] == 'optimistic_concurrency_last_write_wins'
    assert replay_events[2]['event']['base_stream_id'] == '1-0'

    redis_stream = main.r.streams['state-sync:room-c']  # type: ignore[union-attr]
    persisted_types = [json.loads(entry[1]['payload'])['type'] for entry in redis_stream]
    assert persisted_types == ['action', 'conflict_resolution', 'action']
