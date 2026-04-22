
from __future__ import annotations

import json
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from pydantic import ValidationError

os.environ.setdefault("AETHERIUM_API_KEY", "test-key")

from . import main
from .main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)

@pytest.fixture
def valid_emit_payload() -> dict:
    payload_path = Path(__file__).with_name("sample_emit_payload.json")
    return json.loads(payload_path.read_text(encoding="utf-8"))


@pytest.fixture
def api_key_header(monkeypatch: pytest.MonkeyPatch) -> dict[str, str]:
    key = os.getenv("AETHERIUM_API_KEY", "test-key")
    monkeypatch.setenv("AETHERIUM_API_KEY", key)
    main.EXPECTED_API_KEYS = main._load_expected_api_keys()
    return {"X-API-Key": key}


def test_health_check(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_emit_missing_api_key(client: TestClient, valid_emit_payload: dict) -> None:
    response = client.post("/api/v1/cognitive/emit", json=valid_emit_payload)
    assert response.status_code == 401
    assert "missing X-API-Key" in response.text


def test_emit_invalid_payload(client: TestClient, api_key_header: dict[str, str]) -> None:
    response = client.post(
        "/api/v1/cognitive/emit",
        json={},
        headers=api_key_header,
    )
    assert response.status_code == 422






def test_particle_control_contract_accepts_object_attractor() -> None:
    payload = {
        "intent_state": {
            "state": "RESPONDING",
            "shape": "helix",
            "particle_density": 0.6,
            "velocity": 0.3,
            "turbulence": 0.2,
            "cohesion": 0.8,
            "flow_direction": "outward",
            "glow_intensity": 0.7,
            "flicker": 0.1,
            "attractor": {"x": 0.5, "y": 0.4},
            "palette": {"mode": "adaptive", "primary": "#4169E1", "secondary": "#B0C4DE"},
        },
        "renderer_controls": {
            "base_shape": "helix",
            "chromatic_mode": "adaptive",
            "particle_count": 8000,
            "flow_field": "outward",
            "shader_uniforms": {"glow_intensity": 0.7},
            "runtime_profile": "cinematic",
        },
    }

    contract = main.ParticleControlContract.model_validate(payload)

    assert contract.intent_state.attractor.x == 0.5
    assert contract.intent_state.attractor.y == 0.4


def test_particle_control_contract_rejects_out_of_range_attractor() -> None:
    payload = {
        "intent_state": {
            "state": "RESPONDING",
            "shape": "helix",
            "particle_density": 0.6,
            "velocity": 0.3,
            "turbulence": 0.2,
            "cohesion": 0.8,
            "flow_direction": "outward",
            "glow_intensity": 0.7,
            "flicker": 0.1,
            "attractor": {"x": 1.2, "y": 0.4},
            "palette": {"mode": "adaptive", "primary": "#4169E1", "secondary": "#B0C4DE"},
        },
        "renderer_controls": {
            "base_shape": "helix",
            "chromatic_mode": "adaptive",
            "particle_count": 8000,
            "flow_field": "outward",
            "shader_uniforms": {"glow_intensity": 0.7},
            "runtime_profile": "cinematic",
        },
    }

    with pytest.raises(ValidationError):
        main.ParticleControlContract.model_validate(payload)
def test_emit_invalid_api_key_rejected(client: TestClient, valid_emit_payload: dict, api_key_header: dict[str, str]) -> None:
    invalid_headers = {"X-API-Key": f"{api_key_header['X-API-Key']}-invalid"}
    response = client.post("/api/v1/cognitive/emit", json=valid_emit_payload, headers=invalid_headers)
    assert response.status_code == 403
    assert "invalid X-API-Key" in response.text


def test_validate_missing_api_key(client: TestClient, valid_emit_payload: dict) -> None:
    response = client.post("/api/v1/cognitive/validate", json=valid_emit_payload)
    assert response.status_code == 401
    assert "missing X-API-Key" in response.text


def test_websocket_stream_missing_key(client: TestClient) -> None:
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/cognitive-stream"):
            pass


def _issue_ticket(client: TestClient, api_key_header: dict[str, str], role: str = "viewer", scope: str = "cognitive:stream") -> str:
    response = client.post(
        "/api/v1/auth/session",
        json={"session_id": "s1", "role": role, "scope": scope},
        headers=api_key_header,
    )
    assert response.status_code == 200
    return response.json()["ticket"]


def test_websocket_stream_with_valid_ticket(client: TestClient, api_key_header: dict[str, str]) -> None:
    ticket = _issue_ticket(client, api_key_header)
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


def test_websocket_stream_privileged_action_requires_operator_role(client: TestClient, api_key_header: dict[str, str]) -> None:
    viewer_ticket = _issue_ticket(client, api_key_header, role="viewer", scope="cognitive:stream")
    with client.websocket_connect(f"/ws/cognitive-stream?ticket={viewer_ticket}") as websocket:
        websocket.send_json({"type": "dsl_submission", "payload": "...", "requires_operator": True, "action": "danger_reset"})
        response = websocket.receive_json()
        assert response["status"] == "error"
        assert "Insufficient role" in response["detail"]

    operator_ticket = _issue_ticket(client, api_key_header, role="operator", scope="cognitive:stream:privileged")
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


def test_cognitive_canonical_routes_are_compatible(client: TestClient, monkeypatch: pytest.MonkeyPatch, valid_emit_payload: dict, api_key_header: dict[str, str]) -> None:
    async def _stub_model(**_) -> str:
        return "light-presence-ready"

    monkeypatch.setattr(main, "invoke_generative_model", _stub_model)

    generate_response = client.post(
        "/api/v1/cognitive/generate",
        json={"prompt": "manifest", "model": "gpt-4o", "temperature": 0.4},
        headers=api_key_header,
    )
    assert generate_response.status_code == 200
    assert generate_response.json()["text"] == "light-presence-ready"

    validate_response = client.post(
        "/api/v1/cognitive/validate",
        json=valid_emit_payload,
        headers=api_key_header,
    )
    assert validate_response.status_code == 200
    assert validate_response.json()["status"] == "success"


def test_ws_ticket_issue_refresh_and_stream_flow(client: TestClient, api_key_header: dict[str, str]) -> None:
    issue_response = client.post(
        "/api/v1/auth/session",
        json={"session_id": "compat-session-2", "role": "viewer", "scope": "cognitive:stream"},
        headers=api_key_header,
    )
    assert issue_response.status_code == 200
    issued = issue_response.json()
    assert issued["state"] == "issued"
    assert issued["ticket"]

    refresh_response = client.post(
        "/api/v1/auth/session/refresh",
        json={"ticket": issued["ticket"]},
        headers=api_key_header,
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
