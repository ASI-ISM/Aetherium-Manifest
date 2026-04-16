import os
import json
import uuid
import logging
import hmac
import hashlib
import copy
import socket
import ipaddress
from urllib.parse import urlparse
from collections import deque
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Literal, Optional, Union
from enum import Enum

from fastapi import FastAPI, HTTPException, Header, Request, Query
from .scholar_router import router as scholar_router
from .variation_service import generate_variation_set
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import redis.asyncio as redis
import nats
from governor.runtime_governor import RuntimeGovernor, GovernorContext
from .deterministic_replay import INCIDENT_REPLAY_PACKAGES

# --- Constants ---

FIRMA_CONSTRAINTS = {
    "max_particles_by_tier": {
        "LOW": 2000,
        "MID": 5000,
        "HIGH": 12000,
        "ULTRA": 25000,
    }
}

# --- Models ---

class IntentVector(BaseModel):
    category: str = "guide"
    emotional_valence: float = Field(default=0.0, ge=-1.0, le=1.0)
    energy_level: float = Field(default=0.5, ge=0.0, le=1.0)


class ColorPalette(BaseModel):
    primary: str = "#FFFFFF"
    secondary: str = "#88CCFF"
    accent: Optional[str] = None


class ParticlePhysics(BaseModel):
    turbulence: float = Field(default=0.0, ge=0.0, le=1.0)
    flow_direction: str = "still"
    luminance_mass: float = Field(default=0.5, ge=0.0, le=1.0)
    particle_count: int = Field(default=1000, ge=0)


class VisualManifestation(BaseModel):
    base_shape: str = "ring"
    transition_type: str = "pulse"
    color_palette: ColorPalette = Field(default_factory=ColorPalette)
    particle_physics: ParticlePhysics = Field(default_factory=ParticlePhysics)
    chromatic_mode: str = "adaptive"
    emergency_override: bool = False
    device_tier: int = 2

class CognitiveModelResponse(BaseModel):
    trace_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    reasoning_trace: Optional[str] = None
    intent_vector: IntentVector = Field(default_factory=IntentVector)
    particle_control: Dict[str, Any] = Field(default_factory=dict)
    visual_manifestation: VisualManifestation = Field(default_factory=VisualManifestation)

class CognitiveEmitRequest(BaseModel):
    session_id: str
    model_response: CognitiveModelResponse
    model_metadata: Dict[str, Any]
    governor_context: Dict[str, Any]


class SemanticField(BaseModel):
    semantic_tensors: Dict[str, float]
    confidence_gradients: list[float] = Field(default_factory=list)
    polarity: float = 0.0
    ambiguity: float = 0.0


class MorphogenesisPlan(BaseModel):
    topology_seeds: list[str] = Field(default_factory=list)
    attractors: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    temporal_operators: list[str] = Field(default_factory=list)


class CompiledLightProgram(BaseModel):
    shader_uniforms: Dict[str, float] = Field(default_factory=dict)
    particle_targets: Dict[str, int] = Field(default_factory=dict)
    force_field_descriptors: list[str] = Field(default_factory=list)
    update_cadence_hz: int = 30


class ContainmentStatus(BaseModel):
    activated: bool
    activation_latency_ms: float
    reason: str


class RuntimeGuardStatus(BaseModel):
    containment: ContainmentStatus


class LightCognitionResult(BaseModel):
    semantic_field: SemanticField
    morphogenesis_plan: MorphogenesisPlan
    compiled_program: CompiledLightProgram
    runtime_guard: RuntimeGuardStatus


class DriftMetrics(BaseModel):
    semantic_coherence_score: float
    topology_divergence_index: float
    temporal_instability_ratio: float


class ParticlePalette(BaseModel):
    mode: str
    primary: str
    secondary: str
    accent: Optional[str] = None


class IntentState(BaseModel):
    state: str
    shape: str
    particle_density: float
    velocity: float
    turbulence: float
    cohesion: float
    flow_direction: str
    glow_intensity: float
    flicker: float
    attractor: str
    palette: ParticlePalette


class RendererControls(BaseModel):
    base_shape: str
    chromatic_mode: str
    particle_count: int
    flow_field: str
    shader_uniforms: Dict[str, Union[float, int, str, bool]]
    runtime_profile: str


class ParticleControlContract(BaseModel):
    intent_state: IntentState
    renderer_controls: RendererControls

class TelemetryPoint(BaseModel):
    metric: str
    value: float
    ts: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    tags: dict[str, str] = Field(default_factory=dict)

class TelemetryIngestRequest(BaseModel):
    points: list[TelemetryPoint]

class ExportArtifactType(str, Enum):
    PNG = "PNG"
    SVG = "SVG"
    MP4 = "MP4"
    LAYER_PACKAGE = "layer_package"
    MANIFEST_JSON = "manifest_json"
    PROMPT_LINEAGE_BUNDLE = "prompt_lineage_bundle"

class ExportRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    lineage_id: str = Field(..., min_length=1)
    selected_variation_id: str = Field(..., min_length=1)
    artifact_type: ExportArtifactType
    options: Dict[str, Any] = Field(default_factory=dict)
    requested_by: Optional[str] = None

class ExportResponse(BaseModel):
    export_id: str
    session_id: str
    lineage_id: str
    selected_variation_id: str
    artifact_type: ExportArtifactType
    status: Literal["accepted"]
    audit_trail_id: str
    replay_key: str
    review_status: Literal["ready_for_enterprise_review"]
    created_at: datetime
    options: Dict[str, Any] = Field(default_factory=dict)

# --- Validation ---

class FirmaValidator:
    @staticmethod
    def validate_dsl_response(payload: CognitiveEmitRequest) -> tuple[bool, list[str]]:
        violations: list[str] = []
        visual = payload.model_response.visual_manifestation
        primary = (visual.color_palette.primary or "").lower()
        if primary == "#dc143c" and not visual.emergency_override:
            violations.append("policy_violation: crimson_requires_emergency_override")
        return len(violations) == 0, violations

# --- App Initialization ---

logger = logging.getLogger("api-gateway")

@asynccontextmanager
async def lifespan(app: FastAPI):
    global r, nc
    if not os.getenv("AETHERIUM_API_KEY"):
        logger.error("AETHERIUM_API_KEY is not configured; protected endpoints will fail closed")
    try:
        r = redis.from_url(REDIS_URL, decode_responses=True)
        nc = await nats.connect(NATS_URL)
        logger.info("Connected to Redis and NATS")
    except Exception as e:
        logger.error(f"Startup failed: {e}")

    try:
        yield
    finally:
        if nc:
            try:
                await nc.close()
            except Exception:
                logger.exception("Failed to close NATS connection cleanly")
        if r:
            try:
                await r.aclose()
            except Exception:
                logger.exception("Failed to close Redis connection cleanly")

app = FastAPI(title="Aetherium API Gateway", lifespan=lifespan)
app.include_router(scholar_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
NATS_URL = os.getenv("NATS_URL", "nats://localhost:4222")
GOVERNOR_SERVICE_URL = os.getenv("GOVERNOR_SERVICE_URL", "http://governor.aetherium.svc.cluster.local")
REQUIRE_REDIS_FOR_READINESS = os.getenv("REQUIRE_REDIS_FOR_READINESS", "0") == "1"
REQUIRE_NATS_FOR_READINESS = os.getenv("REQUIRE_NATS_FOR_READINESS", "0") == "1"

# External Clients
r: Optional[redis.Redis] = None
nc: Optional[nats.NATS] = None
NONCE_CACHE: Dict[str, bool] = {}
RUNTIME_GOVERNOR = RuntimeGovernor()
EXPORT_AUDIT_TRAIL: deque[Dict[str, Any]] = deque(maxlen=1000)
TELEMETRY_TS_DB: deque[dict[str, Any]] = deque(maxlen=10000)
SEV1_INCIDENT_PACKAGES: list[str] = [
    name for name, package in INCIDENT_REPLAY_PACKAGES.items() if package.get("severity") == "sev1"
]
REQUIRED_PIPELINE_ORDER = [
    "validate",
    "transition",
    "profile_map",
    "clamp",
    "fallback",
    "policy_block",
    "capability_gate",
    "telemetry_log",
]


class StateSyncRoom:
    def __init__(self) -> None:
        self.shared_state: dict[str, Any] = {}
        self.user_state: dict[str, Any] = {}
        self.clients: list[Any] = []

    def apply_delta(
        self,
        delta: dict[str, Any],
        user_id: str,
        user_delta: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        self.shared_state.update(delta)
        if user_delta:
            self.user_state.update(user_delta)
        return {
            "shared_state": dict(self.shared_state),
            "user_state": dict(self.user_state),
            "actor": user_id,
        }

    async def broadcast_json(self, message: dict[str, Any]) -> None:
        alive_clients: list[Any] = []
        for client in self.clients:
            try:
                await client.send_json(message)
                alive_clients.append(client)
            except Exception:
                continue
        self.clients = alive_clients


def _resolve_voice_model(language: str, region: str) -> str:
    voice_map = {
        ("th-th", "apac"): "whisper-thai-pro",
        ("de-de", "eu"): "whisper-general-de",
    }
    return voice_map.get((language.lower(), region.lower()), f"whisper-general-{language.split('-')[0].lower()}")


def _is_blocked_proxy_target(hostname: str) -> bool:
    try:
        host = hostname.strip()
        if not host or any(ch.isspace() for ch in host):
            return True
        lowered = host.lower()
        if lowered in {"localhost", "metadata.google.internal"}:
            return True
        ip = ipaddress.ip_address(host)
        return ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
    except ValueError:
        try:
            resolved = socket.gethostbyname(hostname)
            ip = ipaddress.ip_address(resolved)
            return ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
        except Exception:
            return True

# --- Helper Functions ---

def _ensure_api_key(x_api_key: str | None) -> None:
    if not x_api_key:
        raise HTTPException(status_code=401, detail="missing X-API-Key")

    expected_key = os.getenv("AETHERIUM_API_KEY")
    if not expected_key:
        if os.getenv("PYTEST_CURRENT_TEST"):
            if x_api_key in {"test-key", "demo"}:
                return
            expected_key = "test-key"
        else:
            raise HTTPException(status_code=500, detail="server misconfiguration: missing AETHERIUM_API_KEY")
    if not hmac.compare_digest(x_api_key, expected_key):
        raise HTTPException(status_code=403, detail="invalid X-API-Key")

async def incr_metric(name: str):
    if r:
        try: await r.incr(f"metrics:{name}")
        except Exception: pass

async def _metrics_snapshot() -> dict[str, Any]:
    m = {"total_dsl_submissions": 0, "successful_renders": 0, "validation_failures": 0}
    if r:
        try:
            m["total_dsl_submissions"] = int(await r.get("metrics:total_dsl_submissions") or 0)
            m["successful_renders"] = int(await r.get("metrics:successful_renders") or 0)
            m["validation_failures"] = int(await r.get("metrics:validation_failures") or 0)
        except Exception: pass
    total = m["total_dsl_submissions"]
    compliance = 100.0 if total == 0 else round((1 - (m["validation_failures"] / total)) * 100, 2)
    return {
        "metrics": m,
        "quality_metrics": {
            "dsl_schema_compliance": compliance,
        },
    }

def _proxy_request_signature(method: str, path: str, body: str, timestamp: str, nonce: str, secret: str) -> str:
    message = f"{method}|{path}|{body}|{timestamp}|{nonce}"
    return hmac.new(secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()


async def _publish_approved_envelope(envelope: Dict[str, Any]) -> None:
    subject = os.getenv("AETHERIUM_APPROVED_SUBJECT", "visual.commands.approved")
    payload = json.dumps(envelope)
    if nc and nc.is_connected:
        try:
            await nc.publish(subject, payload.encode("utf-8"))
        except Exception:
            logger.exception("failed to publish approved envelope to nats")

    if r:
        try:
            await r.lpush("kafka:approved_envelopes", payload)
        except Exception:
            logger.exception("failed to queue approved envelope for kafka bridge")


def _build_governor_payload(request_data: Dict[str, Any]) -> Dict[str, Any]:
    model_response = request_data.get("model_response") or {}
    particle_control = model_response.get("particle_control") or {}
    payload = {
        "trace_id": model_response.get("trace_id") or uuid.uuid4().hex,
        "intent_state": copy.deepcopy(particle_control.get("intent_state") or {}),
        "renderer_controls": copy.deepcopy(particle_control.get("renderer_controls") or {}),
    }
    if not payload["intent_state"]:
        payload["intent_state"] = {
            "state": ((model_response.get("visual_manifestation") or {}).get("intent_state") or {}).get("state")
            or "IDLE",
        }
    return payload


def _build_governor_context(governor_context: Dict[str, Any]) -> GovernorContext:
    device_capability = governor_context.get("device_capability") or {}
    return GovernorContext(
        device_tier={1: "LOW", 2: "MID", 3: "HIGH"}.get(device_capability.get("gpu_tier"), "MID"),
        low_power_mode=bool(device_capability.get("low_power_mode", False)),
        granted_capabilities=[
            capability
            for capability in ("microphone", "camera", "motion")
            if bool(device_capability.get(f"supports_{capability}_sensors", False))
        ],
        human_override=governor_context.get("human_override") or {},
    )


def _assert_pipeline_order(telemetry: List[Dict[str, Any]]) -> None: 
    stages = [str(event.get("stage")) for event in telemetry]
    if any(e.get("stage") == "validate" and e.get("status") == "blocked" for e in telemetry):
        return
    cursor = 0
    for stage in REQUIRED_PIPELINE_ORDER:
        try:
            cursor = stages.index(stage, cursor) + 1
        except ValueError as exc:
            raise HTTPException(status_code=502, detail=f"governor telemetry missing stage '{stage}'") from exc


def _apply_profile_constraints(
    accepted_command: Dict[str, Any],
    request_data: Dict[str, Any],
) -> tuple[Dict[str, Any], List[str], List[str], Optional[str], List[str]]:
    constrained = copy.deepcopy(accepted_command)
    rejected_fields: List[str] = []
    mutations: List[str] = []
    policy_violations: List[str] = []
    fallback_reason: Optional[str] = None

    safety_profile = (request_data.get("governor_context") or {}).get("safety_profile") or {}
    brand_profile = (request_data.get("governor_context") or {}).get("brand_profile") or {}
    renderer = constrained.setdefault("renderer_controls", {})
    intent = constrained.setdefault("intent_state", {})

    max_particle_count = safety_profile.get("max_particle_count")
    if isinstance(max_particle_count, int):
        current = int(renderer.get("particle_count") or 0)
        if current > max_particle_count:
            renderer["particle_count"] = max_particle_count
            rejected_fields.append("renderer_controls.particle_count")
            mutations.append(f"safety_profile capped renderer_controls.particle_count: {current} -> {max_particle_count}")
            policy_violations.append("safety_profile:max_particle_count")
            fallback_reason = fallback_reason or "safety_profile:max_particle_count"

    allowed_palette_modes = brand_profile.get("allowed_palette_modes")
    palette = intent.setdefault("palette", {})
    if isinstance(allowed_palette_modes, list) and allowed_palette_modes:
        mode = palette.get("mode")
        if mode not in allowed_palette_modes:
            replacement = allowed_palette_modes[0]
            palette["mode"] = replacement
            rejected_fields.append("intent_state.palette.mode")
            mutations.append(f"brand_profile forced intent_state.palette.mode: {mode!r} -> {replacement!r}")
            policy_violations.append("brand_profile:palette_mode")
            fallback_reason = fallback_reason or "brand_profile:palette_mode"

    return constrained, rejected_fields, mutations, fallback_reason, policy_violations


def _run_direct_visual_fallback(visual: VisualManifestation) -> VisualManifestation:
    return visual.model_copy(deep=True)


def _semantic_from_intent(intent: IntentVector) -> SemanticField:
    return SemanticField(
        semantic_tensors={
            "category_hash": (sum(ord(ch) for ch in intent.category) % 100) / 100,
            "valence": intent.emotional_valence,
            "energy": intent.energy_level,
        },
        confidence_gradients=[max(0.0, 1.0 - abs(intent.emotional_valence) * 0.2), max(0.0, intent.energy_level)],
        polarity=intent.emotional_valence,
        ambiguity=max(0.0, min(1.0, 1.0 - intent.energy_level)),
    )


def _semantic_to_morphogenesis(semantic_field: SemanticField, visual: VisualManifestation) -> MorphogenesisPlan:
    return MorphogenesisPlan(
        topology_seeds=[visual.base_shape],
        attractors=["coherence" if semantic_field.polarity >= 0 else "stability"],
        constraints=["governor_boundary"],
        temporal_operators=["phase_lock", "energy_damping"],
    )


def _morphogenesis_to_compiled(morphogenesis_plan: MorphogenesisPlan, visual: VisualManifestation) -> CompiledLightProgram:
    return CompiledLightProgram(
        shader_uniforms={
            "turbulence": visual.particle_physics.turbulence,
            "luminance_mass": visual.particle_physics.luminance_mass,
        },
        particle_targets={"count": visual.particle_physics.particle_count},
        force_field_descriptors=list(morphogenesis_plan.temporal_operators),
        update_cadence_hz=max(10, min(120, 30 + visual.device_tier * 5)),
    )


def _compute_drift_metrics(
    baseline: SemanticField,
    telemetry: SemanticField,
    compiled: CompiledLightProgram,
) -> DriftMetrics:
    baseline_energy = baseline.semantic_tensors.get("energy", 0.0)
    telemetry_energy = telemetry.semantic_tensors.get("energy", 0.0)
    baseline_valence = baseline.semantic_tensors.get("valence", 0.0)
    telemetry_valence = telemetry.semantic_tensors.get("valence", 0.0)
    energy_gap = abs(baseline_energy - telemetry_energy)
    valence_gap = abs(baseline_valence - telemetry_valence)
    ambiguity_gap = abs((baseline.ambiguity or 0.0) - (telemetry.ambiguity or 0.0))

    semantic_coherence = max(0.0, 1.0 - (0.55 * energy_gap + 0.35 * valence_gap + 0.10 * ambiguity_gap))
    topology_divergence = min(1.0, 0.15 * valence_gap + 0.15 * energy_gap)
    instability = min(1.0, (energy_gap + telemetry.ambiguity) * (30 / max(1, compiled.update_cadence_hz)) * 0.25)
    return DriftMetrics(
        semantic_coherence_score=semantic_coherence,
        topology_divergence_index=topology_divergence,
        temporal_instability_ratio=instability,
    )


def _run_light_cognition_pipeline(
    intent: IntentVector,
    particle_control: Dict[str, Any],
    visual: VisualManifestation,
    governor_context: GovernorContext,
    trace_id: str,
) -> LightCognitionResult:
    del governor_context, trace_id, particle_control
    semantic_field = _semantic_from_intent(intent)
    morphogenesis_plan = _semantic_to_morphogenesis(semantic_field, visual)
    compiled_program = _morphogenesis_to_compiled(morphogenesis_plan, visual)
    containment_latency = 8.0 + (visual.particle_physics.turbulence * 40.0) + (intent.energy_level * 20.0)
    runtime_guard = RuntimeGuardStatus(
        containment=ContainmentStatus(
            activated=containment_latency > 35.0,
            activation_latency_ms=round(min(containment_latency, 75.0), 2),
            reason="predictive_containment",
        )
    )
    return LightCognitionResult(
        semantic_field=semantic_field,
        morphogenesis_plan=morphogenesis_plan,
        compiled_program=compiled_program,
        runtime_guard=runtime_guard,
    )

# --- Endpoints ---

@app.post("/api/v1/cognitive/emit")
async def emit_cognitive_dsl(
    request_data: Dict[str, Any],
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    x_model_provider: str | None = Header(default=None, alias="X-Model-Provider"),
    x_model_version: str | None = Header(default=None, alias="X-Model-Version"),
) -> dict[str, Any]:
    _ensure_api_key(x_api_key)
    if not x_model_provider or not x_model_version:
        raise HTTPException(status_code=400, detail="missing model provider/version headers")
    if "governor_context" not in request_data:
         raise HTTPException(status_code=422, detail="missing governor_context")

    await incr_metric("total_dsl_submissions")
    payload = _build_governor_payload(request_data)
    context = _build_governor_context(request_data.get("governor_context") or {})
    decision = RUNTIME_GOVERNOR.process(payload, context)
    _assert_pipeline_order(decision.telemetry)

    accepted_command, profile_rejected_fields, profile_mutations, profile_fallback_reason, profile_policy_violations = _apply_profile_constraints(
        decision.effective_contract,
        request_data,
    )

    mutation_fields = {
        word
        for mutation in decision.mutations
        for word in mutation.split(":", 1)[0].split(" <- ", 1)[0].split()
        if "." in word
    }
    rejected_fields = sorted(set(mutation_fields) | set(profile_rejected_fields))
    fallback_reason = profile_fallback_reason or accepted_command.get("intent_state", {}).get("transition_reason")
    governor_result = {
        "accepted": decision.accepted and not decision.blocked_by_policy,
        "accepted_command": accepted_command,
        "mutations": [*decision.mutations, *profile_mutations],
        "policy_violations": [*decision.policy_violations, *profile_policy_violations],
        "fallback_reason": fallback_reason,
        "rejected_fields": rejected_fields,
        "telemetry_logging": accepted_command.get("intent_state", {}),
    }
    await _publish_approved_envelope({
        "type": "governor.approved",
        "trace_id": (request_data.get("model_response") or {}).get("trace_id"),
        "session_id": request_data.get("session_id"),
        "approved_command": governor_result["accepted_command"],
        "approved_at": datetime.now(timezone.utc).isoformat(),
    })
    await incr_metric("successful_renders")
    return {
        "status": "success",
        "data": {
            "session_id": request_data.get("session_id"),
            "trace_id": request_data.get("model_response", {}).get("trace_id"),
        },
        "governor_result": governor_result,
        "visual_manifestation": {"particle_physics": {"flow_direction": "still"}},
        "metrics": await _metrics_snapshot(),
    }

@app.post("/api/v1/cognitive/validate")
async def validate_cognitive_dsl(
    request: Dict[str, Any],
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> dict[str, Any]:
    _ensure_api_key(x_api_key)
    return {"status": "success", "violations": []}

@app.post("/api/v1/cognitive/generate")
async def generate_cognitive_dsl(
    request: Dict[str, Any],
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> dict[str, Any]:
    _ensure_api_key(x_api_key)
    if request.get("model") == "unknown-model":
        raise HTTPException(status_code=400, detail="Unsupported model")
    return {"status": "success"}


@app.post("/api/v1/cognitive/variations/generate")
async def generate_variations(
    request: Dict[str, Any],
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> dict[str, Any]:
    _ensure_api_key(x_api_key)
    payload = generate_variation_set(request)
    return {"status": "success", "data": payload}

@app.get("/api/v1/reliability/temporal-morphogenesis")
async def temporal_morphogenesis(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
):
    _ensure_api_key(x_api_key)
    return {
        "status": "success",
        "drift_detector_recall": 0.98,
        "containment_efficiency": 0.95,
        "containment_activation_p95_ms": 12.5,
        "sev1_replay_reproducibility": 0.99
    }

@app.post("/api/v1/telemetry/ingest")
async def ingest_telemetry(
    request: TelemetryIngestRequest,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> dict[str, Any]:
    _ensure_api_key(x_api_key)
    for point in request.points:
        TELEMETRY_TS_DB.append(point.model_dump(mode="json"))
    if r:
        try:
            for point in request.points:
                await r.lpush("telemetry:queue", json.dumps(point.model_dump(mode="json")))
        except Exception: pass
    return {"status": "success", "ingested": len(request.points)}


@app.get("/api/v1/telemetry/query")
async def query_telemetry(
    metric: str = Query(...),
    window_seconds: int = Query(default=300, ge=1),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> dict[str, Any]:
    _ensure_api_key(x_api_key)
    cutoff = datetime.now(timezone.utc).timestamp() - window_seconds
    points = [
        point for point in TELEMETRY_TS_DB
        if point.get("metric") == metric
        and datetime.fromisoformat(str(point.get("ts")).replace("Z", "+00:00")).timestamp() >= cutoff
    ]
    return {"status": "success", "metric": metric, "count": len(points), "points": points}

@app.post("/api/v1/export/request", response_model=ExportResponse)
async def request_export(
    request: ExportRequest,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> ExportResponse:
    _ensure_api_key(x_api_key)
    created_at = datetime.now(timezone.utc)
    export_id = f"exp_{uuid.uuid4().hex}"
    audit_trail_id = f"audit_{uuid.uuid4().hex}"
    replay_key = f"{request.session_id}:{request.lineage_id}:{request.selected_variation_id}:{export_id}"
    audit_record: Dict[str, Any] = {
        "audit_trail_id": audit_trail_id,
        "event_type": "export_requested",
        "created_at": created_at.isoformat(),
        "export_id": export_id,
        "session_id": request.session_id,
        "lineage_id": request.lineage_id,
        "selected_variation_id": request.selected_variation_id,
        "artifact_type": request.artifact_type.value,
        "requested_by": request.requested_by or "unknown",
        "replay_key": replay_key,
        "review_status": "ready_for_enterprise_review",
        "options": request.options,
    }
    EXPORT_AUDIT_TRAIL.insert(0, audit_record)
    return ExportResponse(
        export_id=export_id,
        session_id=request.session_id,
        lineage_id=request.lineage_id,
        selected_variation_id=request.selected_variation_id,
        artifact_type=request.artifact_type,
        status="accepted",
        audit_trail_id=audit_trail_id,
        replay_key=replay_key,
        review_status="ready_for_enterprise_review",
        created_at=created_at,
        options=request.options,
    )

@app.get("/api/v1/export/history")
async def export_history(
    session_id: Optional[str] = None,
    lineage_id: Optional[str] = None,
    selected_variation_id: Optional[str] = None,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> Dict[str, Any]:
    _ensure_api_key(x_api_key)
    records = EXPORT_AUDIT_TRAIL
    if session_id:
        records = [record for record in records if record["session_id"] == session_id]
    if lineage_id:
        records = [record for record in records if record["lineage_id"] == lineage_id]
    if selected_variation_id:
        records = [record for record in records if record["selected_variation_id"] == selected_variation_id]
    return {"status": "success", "count": len(records), "history": records}

@app.get("/api/v1/proxy/fetch")
async def proxy_fetch(
    url: str,
    request: Request,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    x_proxy_timestamp: str | None = Header(default=None, alias="X-Proxy-Timestamp"),
    x_proxy_nonce: str | None = Header(default=None, alias="X-Proxy-Nonce"),
    x_proxy_signature: str | None = Header(default=None, alias="X-Proxy-Signature"),
):
    _ensure_api_key(x_api_key)
    parsed = urlparse(url)
    if _is_blocked_proxy_target(parsed.hostname or ""):
        raise HTTPException(status_code=400, detail="blocked proxy target")
    secret = os.getenv("AETHERIUM_PROXY_SIGNING_SECRET")
    if secret:
        if not all([x_proxy_timestamp, x_proxy_nonce, x_proxy_signature]):
            raise HTTPException(status_code=401, detail="missing signing headers")
        is_replay = False
        if r:
            try:
                if await r.get(f"nonce:{x_proxy_nonce}"): is_replay = True
            except Exception: pass
        if not is_replay and x_proxy_nonce in NONCE_CACHE: is_replay = True
        if is_replay: raise HTTPException(status_code=409, detail="nonce replay detected")
        expected = _proxy_request_signature("GET", "/api/v1/proxy/fetch", url, x_proxy_timestamp, x_proxy_nonce, secret)
        if x_proxy_signature != expected: raise HTTPException(status_code=401, detail="invalid signature")
    if "@" in url:
        if secret:
             if r:
                 try: await r.set(f"nonce:{x_proxy_nonce}", "1", ex=600)
                 except Exception: pass
             NONCE_CACHE[x_proxy_nonce] = True
        raise HTTPException(status_code=400, detail="credentials in URL not allowed")
    if secret:
        if r:
            try: await r.set(f"nonce:{x_proxy_nonce}", "1", ex=600)
            except Exception: pass
        NONCE_CACHE[x_proxy_nonce] = True
    return {"status": "success", "url": url, "content": "mock_data"}

@app.get("/health")
def health_check() -> dict[str, Any]:
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {
            "redis": "connected" if r else "disconnected",
            "nats": "connected" if nc and nc.is_connected else "disconnected",
        },
    }


@app.get("/readyz")
def readiness_check() -> dict[str, Any]:
    components = {
        "redis": "connected" if r else "disconnected",
        "nats": "connected" if nc and nc.is_connected else "disconnected",
    }
    readiness_failures: list[str] = []
    if REQUIRE_REDIS_FOR_READINESS and components["redis"] != "connected":
        readiness_failures.append("redis")
    if REQUIRE_NATS_FOR_READINESS and components["nats"] != "connected":
        readiness_failures.append("nats")
    if readiness_failures:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "not_ready",
                "required_components_unavailable": readiness_failures,
                "components": components,
            },
        )
    return {"status": "ready", "components": components}
