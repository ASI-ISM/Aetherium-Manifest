from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from .main import app


@pytest.fixture
def client() -> TestClient:
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
