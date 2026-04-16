
from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from .main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)

@pytest.fixture
def valid_emit_payload() -> dict:
    return json.loads(Path("api_gateway/sample_emit_payload.json").read_text(encoding="utf-8"))


def test_health_check(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_emit_missing_api_key(client: TestClient, valid_emit_payload: dict) -> None:
    response = client.post("/api/v1/cognitive/emit", json=valid_emit_payload)
    assert response.status_code == 401
    assert "missing X-API-Key" in response.text


def test_emit_invalid_payload(client: TestClient) -> None:
    response = client.post(
        "/api/v1/cognitive/emit",
        json={},
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 422


def test_validate_missing_api_key(client: TestClient, valid_emit_payload: dict) -> None:
    response = client.post("/api/v1/cognitive/validate", json=valid_emit_payload)
    assert response.status_code == 401
    assert "missing X-API-Key" in response.text


def test_websocket_stream_missing_key(client: TestClient) -> None:
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/cognitive-stream"):
            pass


def test_websocket_stream_with_query_key(client: TestClient) -> None:
    with client.websocket_connect("/ws/cognitive-stream?api_key=test-key") as websocket:
        websocket.send_json({"type": "dsl_submission", "payload": "..."})
        response = websocket.receive_json()
        assert response["status"] == "accepted"


def test_websocket_stream_with_header_key(client: TestClient) -> None:
    with client.websocket_connect("/ws/cognitive-stream", headers={"X-API-Key": "test-key"}) as websocket:
        websocket.send_json({"type": "dsl_submission", "payload": "..."})
        response = websocket.receive_json()
        assert response["status"] == "accepted"
