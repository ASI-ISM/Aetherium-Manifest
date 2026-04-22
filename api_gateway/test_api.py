
from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from . import main
from .main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)

@pytest.fixture
def valid_emit_payload() -> dict:
    payload_path = Path(__file__).with_name("sample_emit_payload.json")
    return json.loads(payload_path.read_text(encoding="utf-8"))


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


def _issue_ticket(client: TestClient, role: str = "viewer", scope: str = "cognitive:stream") -> str:
    response = client.post(
        "/api/v1/auth/session",
        json={"session_id": "s1", "role": role, "scope": scope},
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 200
    return response.json()["ticket"]


def test_websocket_stream_with_valid_ticket(client: TestClient) -> None:
    ticket = _issue_ticket(client)
    with client.websocket_connect(f"/ws/cognitive-stream?ticket={ticket}") as websocket:
        websocket.send_json({"type": "dsl_submission", "payload": "..."})
        response = websocket.receive_json()
        assert response["status"] == "accepted"


def test_websocket_stream_rejects_invalid_ticket(client: TestClient) -> None:
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/cognitive-stream?ticket=bad-ticket"):
            pass


def test_websocket_stream_rejects_expired_ticket(client: TestClient) -> None:
    expired_ticket = main._sign_ticket(
        {
            "tid": "expired1",
            "sid": "s1",
            "role": "viewer",
            "scope": "cognitive:stream",
            "iat": 1,
            "exp": 1,
        }
    )
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"/ws/cognitive-stream?ticket={expired_ticket}"):
            pass


def test_websocket_stream_privileged_action_requires_operator_role(client: TestClient) -> None:
    viewer_ticket = _issue_ticket(client, role="viewer", scope="cognitive:stream")
    with client.websocket_connect(f"/ws/cognitive-stream?ticket={viewer_ticket}") as websocket:
        websocket.send_json({"type": "dsl_submission", "payload": "...", "requires_operator": True, "action": "danger_reset"})
        response = websocket.receive_json()
        assert response["status"] == "error"
        assert "Insufficient role" in response["detail"]

    operator_ticket = _issue_ticket(client, role="operator", scope="cognitive:stream:privileged")
    with client.websocket_connect(f"/ws/cognitive-stream?ticket={operator_ticket}") as websocket:
        websocket.send_json({"type": "dsl_submission", "payload": "...", "requires_operator": True, "action": "danger_reset"})
        response = websocket.receive_json()
        assert response["status"] == "accepted"


def test_compatibility_intent_adapter(client: TestClient) -> None:
    response = client.post(
        "/api/intent",
        json={
            "prompt": "please focus and breathe",
            "session_id": "compat-session-1",
            "model": "gpt-4o",
            "temperature": 0.4,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["text"] == "please focus and breathe"
    assert "intent_vector" in payload
    assert "visual_manifestation" in payload
