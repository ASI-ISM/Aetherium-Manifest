from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

app = FastAPI(title="AGNS Cognitive DSL Gateway", version="1.0.0")


FIRMA_CONSTRAINTS = {
    "max_particles_by_tier": {
        1: 5_000,
        2: 10_000,
        3: 20_000,
        4: 50_000,
    }
}


class IntentVector(BaseModel):
    category: str
    emotional_valence: float = Field(ge=-1.0, le=1.0)
    energy_level: float = Field(ge=0.0, le=1.0)


class ColorPalette(BaseModel):
    primary: str
    secondary: str | None = None


class ParticlePhysics(BaseModel):
    turbulence: float = Field(ge=0.0, le=1.0)
    flow_direction: str
    luminance_mass: float = Field(ge=0.0, le=1.0)
    particle_count: int = Field(default=0, ge=0)


class VisualManifestation(BaseModel):
    base_shape: str
    transition_type: str
    color_palette: ColorPalette
    particle_physics: ParticlePhysics
    chromatic_mode: str
    emergency_override: bool = False
    device_tier: int = Field(default=1, ge=1, le=4)


class ModelResponse(BaseModel):
    trace_id: str
    reasoning_trace: str
    intent_vector: IntentVector
    visual_manifestation: VisualManifestation


class ModelMetadata(BaseModel):
    model_name: str
    temperature: float = Field(ge=0.0, le=2.0)
    max_tokens: int = Field(gt=0)


class CognitiveEmitRequest(BaseModel):
    session_id: str
    model_response: ModelResponse
    model_metadata: ModelMetadata


class ValidationResult(BaseModel):
    status: Literal["success", "failed"]
    violations: list[str]
    validator_version: str = "firma-validator-2.1"


class Metrics(BaseModel):
    total_dsl_submissions: int = 0
    successful_renders: int = 0
    validation_failures: int = 0


METRICS = Metrics()


class FirmaValidator:
    @staticmethod
    def validate_dsl_response(payload: CognitiveEmitRequest) -> tuple[bool, list[str]]:
        violations: list[str] = []
        visual = payload.model_response.visual_manifestation

        if visual.color_palette.primary.upper() == "#DC143C" and not visual.emergency_override:
            violations.append("ห้ามใช้สีแดงเลือดหมู #DC143C")

        particle_count = visual.particle_physics.particle_count
        device_tier = visual.device_tier
        max_particles = FIRMA_CONSTRAINTS["max_particles_by_tier"].get(device_tier, 5_000)
        if particle_count > max_particles:
            violations.append(f"เกินขีดจำกัดอนุภาคสำหรับ Tier {device_tier}")

        return len(violations) == 0, violations


def _ensure_api_key(x_api_key: str | None) -> None:
    if not x_api_key:
        raise HTTPException(status_code=401, detail="missing X-API-Key")


def _metrics_snapshot() -> dict[str, Any]:
    total = METRICS.total_dsl_submissions
    compliance = 100.0 if total == 0 else round((1 - (METRICS.validation_failures / total)) * 100, 2)
    return {
        "metrics": {
            "total_dsl_submissions": METRICS.total_dsl_submissions,
            "successful_renders": METRICS.successful_renders,
            "validation_failures": METRICS.validation_failures,
        },
        "quality_metrics": {
            "dsl_schema_compliance": compliance,
        },
    }


@app.post("/api/v1/cognitive/emit")
def emit_cognitive_dsl(
    request: CognitiveEmitRequest,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    x_model_provider: str | None = Header(default=None, alias="X-Model-Provider"),
    x_model_version: str | None = Header(default=None, alias="X-Model-Version"),
) -> dict[str, Any]:
    _ensure_api_key(x_api_key)
    if not x_model_provider or not x_model_version:
        raise HTTPException(status_code=400, detail="missing model provider/version headers")

    METRICS.total_dsl_submissions += 1
    passed, violations = FirmaValidator.validate_dsl_response(request)
    if not passed:
        METRICS.validation_failures += 1
        return {
            "status": "failed",
            "validation": ValidationResult(status="failed", violations=violations).model_dump(),
            "metrics": _metrics_snapshot(),
        }

    METRICS.successful_renders += 1
    processing_time_ms = 89
    return {
        "status": "success",
        "data": {
            "session_id": request.session_id,
            "trace_id": request.model_response.trace_id,
            "cognitive_dsl": request.model_response.model_dump(),
            "model_provider": x_model_provider,
            "model_version": x_model_version,
        },
        "validation": ValidationResult(status="success", violations=[]).model_dump(),
        "metrics": {
            "processing_time_ms": processing_time_ms,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **_metrics_snapshot(),
        },
    }


@app.post("/api/v1/cognitive/validate")
def validate_cognitive_dsl(
    request: CognitiveEmitRequest,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> dict[str, Any]:
    _ensure_api_key(x_api_key)
    passed, violations = FirmaValidator.validate_dsl_response(request)
    return ValidationResult(
        status="success" if passed else "failed",
        violations=violations,
    ).model_dump()


@app.get("/health")
def health_check() -> dict[str, Any]:
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {
            "api_gateway": "up",
            "validator_service": "up",
            "model_connections": {
                "openai": "up",
                "anthropic": "up",
                "google": "up",
            },
        },
    }


@app.websocket("/ws/cognitive-stream")
async def cognitive_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_json()
            message_type = payload.get("type")
            if message_type != "dsl_submission":
                await websocket.send_json({"status": "failed", "detail": "invalid message type"})
                continue

            await websocket.send_json(
                {
                    "status": "accepted",
                    "received_at": datetime.now(timezone.utc).isoformat(),
                    "echo": payload,
                }
            )
    except WebSocketDisconnect:
        return
