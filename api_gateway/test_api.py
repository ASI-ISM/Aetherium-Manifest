
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from api_gateway.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _valid_emit_payload() -> dict:
    return {
        "session_id": "session-1",
        "model_response": {
            "trace_id": "trace-1",
            "reasoning_trace": "ok",
            "intent_vector": {
                "category": "guide",
                "emotional_valence": 0.2,
                "energy_level": 0.5,
            },
            "visual_manifestation": {
                "base_shape": "ring",
                "transition_type": "smooth",
                "color_palette": {"primary": "#00FFFF"},
                "particle_physics": {
                    "turbulence": 0.2,
                    "flow_direction": "stable",
                    "luminance_mass": 0.5,
                    "particle_count": 1200,
                },
                "chromatic_mode": "balanced",
                "device_tier": 2,
            },
        },
        "model_metadata": {"model_name": "gpt-4o", "temperature": 0.7, "max_tokens": 256},
    }


def test_health_check(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_emit_missing_api_key(client: TestClient) -> None:
    response = client.post("/api/v1/cognitive/emit", json=_valid_emit_payload())
    assert response.status_code == 401
    assert "missing X-API-Key" in response.text


def test_emit_invalid_payload_returns_422(client: TestClient) -> None:
    response = client.post(
        "/api/v1/cognitive/emit",
        json={},
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 422


def test_validate_missing_api_key(client: TestClient) -> None:
    response = client.post("/api/v1/cognitive/validate", json=_valid_emit_payload())
    assert response.status_code == 401
    assert "missing X-API-Key" in response.text


def test_websocket_stream_missing_key(client: TestClient) -> None:
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/cognitive-stream"):
            # Server closes immediately when API key is missing.
            # The test client surfaces that behavior as a disconnect error.
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
