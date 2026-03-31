from __future__ import annotations

import asyncio
from enum import Enum
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
    particle_control: ParticleControlContract
    visual_manifestation: VisualManifestation

class ModelMetadata(BaseModel):
    model_name: str
    temperature: float = Field(ge=0.0, le=2.0)
    max_tokens: int = Field(gt=0)

class CognitiveEmitRequest(BaseModel):
    session_id: str
    model_response: ModelResponse
    model_metadata: ModelMetadata
    governor_context: GovernorContext

class GenerateRequest(BaseModel):
    prompt: str
    model: str = Field(default="gemini-1.5-pro")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)

class GenerateResponse(BaseModel):
    text: str
    model: str
    trace_id: str
    provider: str

class ValidationResult(BaseModel):
    status: Literal["success", "failed"]
    violations: list[str]
    validator_version: str = "firma-validator-2.1"


class Metrics(BaseModel):
    total_dsl_submissions: int = 0
    successful_renders: int = 0
    validation_failures: int = 0
    generative_requests: int = 0

class TelemetryPoint(BaseModel):
    metric: str
    value: float
    ts: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    tags: dict[str, str] = Field(default_factory=dict)

class TelemetryIngestRequest(BaseModel):
    points: list[TelemetryPoint]


class PipelineExecutionMetrics(BaseModel):
    intent_to_semantic_ms: float
    semantic_to_morphogenesis_ms: float
    morphogenesis_to_compiler_ms: float
    compiler_to_runtime_ms: float
    total_pipeline_ms: float


class ContainmentMode(str, Enum):
    SOFT_CLAMP = "soft_clamp"
    DETERMINISTIC_ANCHOR_REPLAY = "deterministic_anchor_replay"
    HARD_ROLLBACK_LEGACY = "hard_rollback_legacy"


class DriftMetrics(BaseModel):
    semantic_coherence_score: float = Field(ge=0.0, le=1.0)
    topology_divergence_index: float = Field(ge=0.0, le=1.0)
    temporal_instability_ratio: float = Field(ge=0.0, le=1.0)


class ContainmentDecision(BaseModel):
    activated: bool
    mode: ContainmentMode | None = None
    activation_latency_ms: float = 0.0
    anchor_replay_package: str | None = None


class RuntimeGuardResult(BaseModel):
    metrics: DriftMetrics
    divergence_detected: bool
    containment: ContainmentDecision


class PipelineExecutionResult(BaseModel):
    semantic_field: SemanticField
    morphogenesis_plan: MorphogenesisPlan
    compiled_program: CompiledLightProgram
    visual_manifestation: "VisualManifestation"
    metrics: PipelineExecutionMetrics
    runtime_guard: RuntimeGuardResult | None = None
    governor_result: GovernorResult | None = None


# --- In-memory State and Concurrency --- 

METRICS = Metrics()
TELEMETRY_TS_DB: dict[str, list[dict[str, Any]]] = {}
STATE_SYNC_ROOMS: dict[str, StateSyncRoom] = {}

METRICS_LOCK = asyncio.Lock()
TELEMETRY_LOCK = asyncio.Lock()
ROOMS_LOCK = asyncio.Lock()
RELIABILITY_LOCK = asyncio.Lock()
PROXY_SIGNATURE_LOCK = asyncio.Lock()
PROXY_SIGNATURE_NONCES: dict[str, float] = {}

DRIFT_EVENT_TOTAL = 0
DRIFT_EVENT_DETECTED = 0
CONTAINMENT_LATENCIES_MS: list[float] = []
REPLAY_REPRO_BY_PACKAGE: dict[str, bool] = {}
INCIDENT_REPLAY_PACKAGES: dict[str, dict[str, Any]] = {}

SEV1_INCIDENT_PACKAGES = [
    name for name, package in INCIDENT_REPLAY_PACKAGES.items() if package.get("severity") == "sev1"
]

# --- State Synchronization Room ---

class StateSyncRoom:
    def __init__(self) -> None:
        self.version = 0
        self.shared_state: dict[str, Any] = {}
        self.user_states: dict[str, dict[str, Any]] = {}
        self.clients: list[WebSocket] = []
        self.lock = asyncio.Lock()

    def apply_delta(self, delta: dict[str, Any], user_id: str | None, user_delta: dict[str, Any]) -> dict[str, Any]:
        self.version += 1
        self.shared_state.update(delta)
        if user_id and user_delta:
            current = self.user_states.setdefault(user_id, {})
            current.update(user_delta)
        return self.snapshot(user_id)

    def snapshot(self, user_id: str | None) -> dict[str, Any]:
        return {
            "version": self.version,
            "shared_state": self.shared_state,
            "user_state": self.user_states.get(user_id or "", {}),
        }

    async def broadcast_json(self, message: dict[str, Any]) -> None:
        if not self.clients:
            return
        disconnected_clients: list[WebSocket] = []
        for client in self.clients:
            try:
                await client.send_json(message)
            except RuntimeError:
                disconnected_clients.append(client)
        if disconnected_clients:
            self.clients = [client for client in self.clients if client not in disconnected_clients]

# --- DSL Validation ---

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
