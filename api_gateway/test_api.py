
from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from .main import EXPORT_AUDIT_TRAIL, app, _proxy_request_signature


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


def test_generate_variations_returns_branch_metadata(client: TestClient) -> None:
    response = client.post(
        "/api/v1/cognitive/variations/generate",
        headers={"X-API-Key": "test-key"},
        json={
            "goal_type": "image",
            "brand_profile": {"palette_lock": True},
            "safety_profile": {"strict_mode": True, "max_branches": 6},
            "lineage": {"active_context_id": "n7"},
        },
    )
    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["goal_type"] == "image"
    assert payload["parent_id"] == "n7"
    assert 4 <= payload["count"] <= 8
    assert payload["count"] == len(payload["variations"])
    for variation in payload["variations"]:
        assert variation["parent_id"] == "n7"
        assert variation["variation_id"]
        assert variation["preset"]
        assert isinstance(variation["constraints_delta"], dict)
        assert variation["constraints_delta"].get("palette_lock") is True


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


def _valid_emit_payload() -> dict:
    return {
        "session_id": "sess-1",
        "model_response": {
            "trace_id": "trace-1",
            "reasoning_trace": "guided",
            "intent_vector": {"category": "guide", "emotional_valence": 0.2, "energy_level": 0.7},
            "particle_control": {
                "intent_state": {
                    "state": "THINKING",
                    "shape": "ring",
                    "particle_density": 0.3,
                    "velocity": 0.8,
                    "turbulence": 0.4,
                    "cohesion": 0.6,
                    "flow_direction": "centripetal",
                    "glow_intensity": 0.7,
                    "flicker": 0.1,
                    "attractor": "core",
                    "palette": {"mode": "adaptive", "primary": "#88CCFF", "secondary": "#4466FF"},
                },
                "renderer_controls": {
                    "base_shape": "ring",
                    "chromatic_mode": "adaptive",
                    "particle_count": 4800,
                    "flow_field": "centripetal",
                    "shader_uniforms": {"glow_intensity": 0.7, "flicker": 0.1, "cohesion": 0.6},
                    "runtime_profile": "adaptive",
                },
            },
            "visual_manifestation": {
                "base_shape": "ring",
                "transition_type": "pulse",
                "color_palette": {"primary": "#88CCFF", "secondary": "#4466FF"},
                "particle_physics": {
                    "turbulence": 0.4,
                    "flow_direction": "centripetal",
                    "luminance_mass": 0.7,
                    "particle_count": 4800,
                },
                "chromatic_mode": "adaptive",
                "emergency_override": False,
                "device_tier": 1,
            },
        },
        "model_metadata": {"model_name": "gpt-4o", "temperature": 0.2, "max_tokens": 256},
        "governor_context": {
            "human_override": {"force_safe_mode": False, "allow_runtime_governor_bypass": False},
            "device_capability": {
                "max_particle_count": 3000,
                "supports_motion_sensors": True,
                "motion_sensor_permission": "denied",
                "low_power_mode": True,
                "gpu_tier": 2,
            },
            "safety_profile": {"max_particle_count": 2000},
            "brand_profile": {"allowed_palette_modes": ["CALM_IDLE", "DEEP_REASONING"]},
        },
    }


def test_emit_returns_governor_result(client: TestClient) -> None:
    response = client.post(
        "/api/v1/cognitive/emit",
        json=_valid_emit_payload(),
        headers={"X-API-Key": "test-key", "X-Model-Provider": "openai", "X-Model-Version": "2026-03"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["governor_result"]["accepted_command"]["renderer_controls"]["particle_count"] == 2000
    assert payload["governor_result"]["fallback_reason"] in {"governor_fallback", "safety_profile:max_particle_count", "brand_profile:palette_mode"}
    assert "renderer_controls.particle_count" in payload["governor_result"]["rejected_fields"]
    assert payload["visual_manifestation"]["particle_physics"]["flow_direction"] == "still"
    assert payload["governor_result"]["accepted_command"]["intent_state"]["state"] in {"THINKING", "IDLE", "WARNING"}
    assert payload["governor_result"]["telemetry_logging"]["state_entered_at"]
    assert payload["governor_result"]["telemetry_logging"]["state_duration_ms"] >= 0
    assert payload["governor_result"]["telemetry_logging"]["transition_reason"]
    assert "policy_violations" in payload["governor_result"]


def test_emit_applies_brand_profile_palette_constraint(client: TestClient) -> None:
    payload = _valid_emit_payload()
    payload["model_response"]["particle_control"]["intent_state"]["palette"]["mode"] = "CUSTOM"
    payload["governor_context"]["brand_profile"] = {"allowed_palette_modes": ["CALM_IDLE"]}

    response = client.post(
        "/api/v1/cognitive/emit",
        json=payload,
        headers={"X-API-Key": "test-key", "X-Model-Provider": "openai", "X-Model-Version": "2026-03"},
    )

    assert response.status_code == 200
    result = response.json()["governor_result"]
    assert result["accepted_command"]["intent_state"]["palette"]["mode"] == "CALM_IDLE"
    assert "intent_state.palette.mode" in result["rejected_fields"]
    assert "brand_profile:palette_mode" in result["policy_violations"]


def test_emit_applies_safety_profile_particle_constraint(client: TestClient) -> None:
    payload = _valid_emit_payload()
    payload["governor_context"]["safety_profile"] = {"max_particle_count": 1234}

    response = client.post(
        "/api/v1/cognitive/emit",
        json=payload,
        headers={"X-API-Key": "test-key", "X-Model-Provider": "openai", "X-Model-Version": "2026-03"},
    )

    assert response.status_code == 200
    result = response.json()["governor_result"]
    assert result["accepted_command"]["renderer_controls"]["particle_count"] == 1234
    assert "renderer_controls.particle_count" in result["rejected_fields"]
    assert "safety_profile:max_particle_count" in result["policy_violations"]


def test_emit_rejects_missing_governor_context(client: TestClient) -> None:
    payload = _valid_emit_payload()
    payload.pop("governor_context")

    response = client.post(
        "/api/v1/cognitive/emit",
        json=payload,
        headers={"X-API-Key": "test-key", "X-Model-Provider": "openai", "X-Model-Version": "2026-03"},
    )

    assert response.status_code == 422

def test_emit_rejects_invalid_api_key(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AETHERIUM_API_KEY", "correct-key")
    response = client.post(
        "/api/v1/cognitive/emit",
        json=_valid_emit_payload(),
        headers={
            "X-API-Key": "wrong-key",
            "X-Model-Provider": "openai",
            "X-Model-Version": "2026-03"
        },
    )
    assert response.status_code == 403
    assert "invalid X-API-Key" in response.text

def test_emit_accepts_valid_api_key(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AETHERIUM_API_KEY", "correct-key")
    response = client.post(
        "/api/v1/cognitive/emit",
        json=_valid_emit_payload(),
        headers={
            "X-API-Key": "correct-key",
            "X-Model-Provider": "openai",
            "X-Model-Version": "2026-03"
        },
    )
    assert response.status_code == 200


def test_export_request_supports_all_artifact_types(client: TestClient) -> None:
    EXPORT_AUDIT_TRAIL.clear()
    artifact_types = ["PNG", "SVG", "MP4", "layer_package", "manifest_json", "prompt_lineage_bundle"]
    for artifact_type in artifact_types:
        response = client.post(
            "/api/v1/export/request",
            headers={"X-API-Key": "test-key"},
            json={
                "session_id": "sess-export-1",
                "lineage_id": "lin-1",
                "selected_variation_id": "var-1",
                "artifact_type": artifact_type,
                "options": {"quality": "high"},
                "requested_by": "qa-user",
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["artifact_type"] == artifact_type
        assert payload["session_id"] == "sess-export-1"
        assert payload["lineage_id"] == "lin-1"
        assert payload["selected_variation_id"] == "var-1"
        assert payload["review_status"] == "ready_for_enterprise_review"
        assert payload["replay_key"].startswith("sess-export-1:lin-1:var-1:")


def test_export_request_requires_replay_identifiers(client: TestClient) -> None:
    response = client.post(
        "/api/v1/export/request",
        headers={"X-API-Key": "test-key"},
        json={
            "session_id": "sess-export-2",
            "lineage_id": "lin-2",
            "artifact_type": "PNG",
        },
    )
    assert response.status_code == 422


def test_export_history_supports_replay_filters(client: TestClient) -> None:
    EXPORT_AUDIT_TRAIL.clear()
    seed_payload = {
        "session_id": "sess-export-3",
        "lineage_id": "lin-3",
        "selected_variation_id": "var-3",
        "artifact_type": "manifest_json",
    }
    client.post("/api/v1/export/request", headers={"X-API-Key": "test-key"}, json=seed_payload)
    client.post(
        "/api/v1/export/request",
        headers={"X-API-Key": "test-key"},
        json={**seed_payload, "selected_variation_id": "var-4", "artifact_type": "layer_package"},
    )

    response = client.get(
        "/api/v1/export/history",
        headers={"X-API-Key": "test-key"},
        params={
            "session_id": "sess-export-3",
            "lineage_id": "lin-3",
            "selected_variation_id": "var-3",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] == 1
    assert payload["history"][0]["selected_variation_id"] == "var-3"
    assert payload["history"][0]["artifact_type"] == "manifest_json"
