
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


def test_cognitive_canonical_routes_are_compatible(client: TestClient, monkeypatch: pytest.MonkeyPatch, valid_emit_payload: dict) -> None:
    async def _stub_model(**_) -> str:
        return "light-presence-ready"

    monkeypatch.setattr(main, "invoke_generative_model", _stub_model)

    generate_response = client.post(
        "/api/v1/cognitive/generate",
        json={"prompt": "manifest", "model": "gpt-4o", "temperature": 0.4},
        headers={"X-API-Key": "test-key"},
    )
    assert generate_response.status_code == 200
    assert generate_response.json()["text"] == "light-presence-ready"

    validate_response = client.post(
        "/api/v1/cognitive/validate",
        json=valid_emit_payload,
        headers={"X-API-Key": "test-key"},
    )
    assert validate_response.status_code == 200
    assert validate_response.json()["status"] == "success"


def test_cognitive_generate_supports_image_attachment(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}

    async def _stub_model(**kwargs) -> str:
        captured.update(kwargs)
        return "image-aware-response"

    monkeypatch.setattr(main, "invoke_generative_model", _stub_model)

    response = client.post(
        "/api/v1/cognitive/generate",
        json={
            "prompt": "analyze this",
            "model": "gpt-4o",
            "temperature": 0.4,
            "image": {
                "data_url": "data:image/png;base64,aGVsbG8=",
                "mime_type": "image/png",
                "filename": "sample.png",
            },
        },
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 200
    assert response.json()["text"] == "image-aware-response"
    assert captured["image"].mime_type == "image/png"


def test_ws_ticket_issue_refresh_and_stream_flow(client: TestClient) -> None:
    issue_response = client.post(
        "/api/v1/auth/session",
        json={"session_id": "compat-session-2", "role": "viewer", "scope": "cognitive:stream"},
        headers={"X-API-Key": "test-key"},
    )
    assert issue_response.status_code == 200
    issued = issue_response.json()
    assert issued["state"] == "issued"
    assert issued["ticket"]

    refresh_response = client.post(
        "/api/v1/auth/session/refresh",
        json={"ticket": issued["ticket"]},
        headers={"X-API-Key": "test-key"},
    )
    assert refresh_response.status_code == 200
    refreshed = refresh_response.json()
    assert refreshed["state"] == "issued"
    assert refreshed["ticket"] != issued["ticket"]

    with client.websocket_connect(f"/ws/cognitive-stream?ticket={refreshed['ticket']}") as websocket:
        websocket.send_json({"type": "dsl_submission", "payload": "compatibility-check"})
        response = websocket.receive_json()
        assert response["status"] == "accepted"
        assert response["echo"]["payload"] == "compatibility-check"
