
from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from .main import app, _proxy_request_signature


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health_check(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_emit_missing_api_key(client: TestClient) -> None:
    response = client.post("/api/v1/cognitive/emit", json={})
    assert response.status_code == 401
    assert "missing X-API-Key" in response.text


def test_emit_missing_model_headers(client: TestClient) -> None:
    response = client.post(
        "/api/v1/cognitive/emit",
        json={},
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 400
    assert "missing model provider/version" in response.text


def test_validate_missing_api_key(client: TestClient) -> None:
    response = client.post("/api/v1/cognitive/validate", json={})
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
    with client.websocket_connect("/ws/cognitive-stream", headers={"x-api-key": "test-key"}) as websocket:
        websocket.send_json({"type": "dsl_submission", "payload": "..."})
        response = websocket.receive_json()
        assert response["status"] == "accepted"


def test_proxy_fetch_supports_cors_preflight(client: TestClient) -> None:
    response = client.options(
        "/api/v1/proxy/fetch",
        headers={
            "Origin": "https://example.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "*"


def test_generate_rejects_unsupported_model_with_400(client: TestClient) -> None:
    response = client.post(
        "/api/v1/cognitive/generate",
        headers={"X-API-Key": "test-key"},
        json={"prompt": "hello", "model": "unknown-model", "temperature": 0.2},
    )
    assert response.status_code == 400
    assert "Unsupported model" in response.text


def test_state_sync_websocket_requires_api_key(client: TestClient) -> None:
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/state-sync/demo-room"):
            pass


def test_proxy_fetch_rejects_urls_with_credentials(client: TestClient) -> None:
    response = client.get(
        "/api/v1/proxy/fetch",
        params={"url": "https://user:pass@example.com/path"},
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 400
    assert "credentials" in response.text.lower()


def test_proxy_fetch_requires_signing_headers_when_secret_configured(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AETHERIUM_PROXY_SIGNING_SECRET", "prod-secret")
    response = client.get(
        "/api/v1/proxy/fetch",
        params={"url": "https://example.com"},
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 401
    assert "signing headers" in response.text.lower()


def test_proxy_fetch_rejects_nonce_replay_when_signature_is_reused(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AETHERIUM_PROXY_SIGNING_SECRET", "prod-secret")
    timestamp = str(int(datetime.now(timezone.utc).timestamp()))
    nonce = "nonce-123"
    url = "https://user:pass@example.com/path"
    signature = _proxy_request_signature(
        "GET",
        "/api/v1/proxy/fetch",
        url,
        timestamp,
        nonce,
        "prod-secret",
    )
    headers = {
        "X-API-Key": "test-key",
        "X-Proxy-Timestamp": timestamp,
        "X-Proxy-Nonce": nonce,
        "X-Proxy-Signature": signature,
    }

    first_response = client.get("/api/v1/proxy/fetch", params={"url": url}, headers=headers)
    assert first_response.status_code == 400

    replay_response = client.get("/api/v1/proxy/fetch", params={"url": url}, headers=headers)
    assert replay_response.status_code == 409
    assert "nonce replay" in replay_response.text.lower()


def test_reliability_temporal_morphogenesis_endpoint(client: TestClient) -> None:
    response = client.get(
        "/api/v1/reliability/temporal-morphogenesis",
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert "drift_detector_recall" in payload
    assert "containment_activation_p95_ms" in payload
    assert "sev1_replay_reproducibility" in payload
