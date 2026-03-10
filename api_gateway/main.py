
from __future__ import annotations

import asyncio
import ipaddress
import os
import socket
import uuid
from datetime import datetime, timezone
from enum import Enum
from math import sqrt
from statistics import mean
from time import perf_counter
from typing import Any, Literal
from urllib.parse import urlparse

import httpx
from .deterministic_replay import INCIDENT_REPLAY_PACKAGES, replay_incident_package
from fastapi import FastAPI, Header, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError

app = FastAPI(title="AGNS Cognitive DSL Gateway", version="1.1.0")


# --- Constants and Configuration ---

FIRMA_CONSTRAINTS = {
    "max_particles_by_tier": {
        1: 5_000,
        2: 10_000,
        3: 20_000,
        4: 50_000,
    }
}

PROXY_ALLOWED_HOSTS = {
    host.strip().lower()
    for host in os.getenv("AETHERIUM_PROXY_ALLOWED_HOSTS", "").split(",")
    if host.strip()
}

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("AETHERIUM_CORS_ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]

VOICE_MODEL_MAP: dict[tuple[str, str], str] = {
    ("th", "apac"): "whisper-thai-pro",
    ("en", "us"): "whisper-english-us",
    ("en", "eu"): "whisper-english-eu",
    ("ja", "apac"): "whisper-japanese-pro",
    ("es", "latam"): "whisper-spanish-latam",
}

MODEL_PROVIDER_MAP = {
    "gemini-pro": "google",
    "gemini-1.5-pro": "google",
    "gpt-4": "openai",
    "gpt-4o": "openai",
    "claude-3-opus": "anthropic",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# --- Pydantic Models ---

class IntentVector(BaseModel):
    category: str
    emotional_valence: float = Field(ge=-1.0, le=1.0)
    energy_level: float = Field(ge=0.0, le=1.0)


class SemanticField(BaseModel):
    semantic_tensors: dict[str, float] = Field(default_factory=dict)
    confidence_gradients: list[float] = Field(default_factory=list)
    polarity: float = Field(ge=-1.0, le=1.0)
    ambiguity: float = Field(ge=0.0, le=1.0)


class MorphogenesisPlan(BaseModel):
    topology_seeds: list[str] = Field(default_factory=list)
    attractors: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    temporal_operators: list[str] = Field(default_factory=list)


class CompiledLightProgram(BaseModel):
    shader_uniforms: dict[str, float | str] = Field(default_factory=dict)
    particle_targets: dict[str, float] = Field(default_factory=dict)
    force_field_descriptors: list[str] = Field(default_factory=list)
    update_cadence_hz: float = Field(gt=0.0)

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
    validator_version: str = "firma-validator-2.2"

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


# --- In-memory State and Concurrency --- 

METRICS = Metrics()
TELEMETRY_TS_DB: dict[str, list[dict[str, Any]]] = {}
STATE_SYNC_ROOMS: dict[str, StateSyncRoom] = {}

METRICS_LOCK = asyncio.Lock()
TELEMETRY_LOCK = asyncio.Lock()
ROOMS_LOCK = asyncio.Lock()
RELIABILITY_LOCK = asyncio.Lock()

DRIFT_EVENT_TOTAL = 0
DRIFT_EVENT_DETECTED = 0
CONTAINMENT_LATENCIES_MS: list[float] = []
REPLAY_REPRO_BY_PACKAGE: dict[str, bool] = {}

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
            violations.append("Crimson color #DC143C is reserved for emergency overrides")

        particle_count = visual.particle_physics.particle_count
        device_tier = visual.device_tier
        max_particles = FIRMA_CONSTRAINTS["max_particles_by_tier"].get(device_tier, 5_000)
        if particle_count > max_particles:
            violations.append(f"Particle count exceeds limit for Tier {device_tier}")

        return len(violations) == 0, violations

# --- Generative Model Invocation ---

async def invoke_generative_model(prompt: str, model: str, temperature: float) -> str:
    provider = MODEL_PROVIDER_MAP.get(model)
    if not provider:
        raise HTTPException(status_code=400, detail=f"Unsupported model: {model}")

    if provider == "google":
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not set")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            return response.json()["candidates"][0]["content"]["parts"][0]["text"]

    elif provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")
        url = "https://api.openai.com/v1/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}"}
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]

    # Placeholder for other providers like Anthropic
    raise HTTPException(status_code=501, detail=f"Provider {provider} not implemented")

# --- Helper Functions ---

def _ensure_api_key(x_api_key: str | None) -> None:
    if not x_api_key:
        raise HTTPException(status_code=401, detail="missing X-API-Key")

def _extract_ws_api_key(websocket: WebSocket) -> str | None:
    return websocket.headers.get("x-api-key") or websocket.query_params.get("api_key")

async def _metrics_snapshot() -> dict[str, Any]:
    async with METRICS_LOCK:
        metrics_dict = METRICS.model_dump()
    total_submissions = metrics_dict["total_dsl_submissions"]
    failures = metrics_dict["validation_failures"]
    compliance = 100.0 if total_submissions == 0 else round((1 - (failures / total_submissions)) * 100, 2)
    return {
        "metrics": metrics_dict,
        "quality_metrics": {"dsl_schema_compliance": compliance},
    }


async def _room(room_id: str) -> StateSyncRoom:
    async with ROOMS_LOCK:
        return STATE_SYNC_ROOMS.setdefault(room_id, StateSyncRoom())


def _is_blocked_proxy_target(hostname: str) -> bool:
    try:
        for _, _, _, _, sockaddr in socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP):
            address = ipaddress.ip_address(sockaddr[0])
            if (
                address.is_private
                or address.is_loopback
                or address.is_link_local
                or address.is_reserved
                or address.is_unspecified
                or address.is_multicast
            ):
                return True
    except (socket.gaierror, OSError, ValueError):
        return True
    return False


def _resolve_voice_model(language: str, region: str) -> str:
    lang_key = language.split("-")[0].lower()
    region_key = region.lower()
    return VOICE_MODEL_MAP.get((lang_key, region_key), f"whisper-general-{lang_key}")


def _env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _intent_to_semantic_field(intent: IntentVector) -> SemanticField:
    confidence = max(0.0, min(1.0, 0.55 + (intent.energy_level * 0.35)))
    return SemanticField(
        semantic_tensors={
            "category_hash": float(abs(hash(intent.category)) % 10_000) / 10_000,
            "valence": intent.emotional_valence,
            "energy": intent.energy_level,
        },
        confidence_gradients=[confidence, max(0.0, confidence - 0.1)],
        polarity=intent.emotional_valence,
        ambiguity=max(0.0, 1.0 - confidence),
    )


def _semantic_to_morphogenesis(field: SemanticField, visual: VisualManifestation) -> MorphogenesisPlan:
    return MorphogenesisPlan(
        topology_seeds=[visual.base_shape, visual.transition_type],
        attractors=["coherence" if field.ambiguity < 0.4 else "exploration"],
        constraints=[f"turbulence<={visual.particle_physics.turbulence}", f"chroma={visual.chromatic_mode}"],
        temporal_operators=["phase_lock", "cadence_stabilize"],
    )


def _morphogenesis_to_compiled(plan: MorphogenesisPlan, visual: VisualManifestation) -> CompiledLightProgram:
    cadence_hz = 24.0 if "phase_lock" in plan.temporal_operators else 12.0
    return CompiledLightProgram(
        shader_uniforms={"shape": visual.base_shape, "transition": visual.transition_type},
        particle_targets={"count": float(visual.particle_physics.particle_count), "mass": visual.particle_physics.luminance_mass},
        force_field_descriptors=plan.constraints,
        update_cadence_hz=cadence_hz,
    )


def _compiled_to_runtime_visual(program: CompiledLightProgram, visual: VisualManifestation) -> VisualManifestation:
    # Backward-compatible renderer ABI: preserve existing contract shape.
    _ = program
    return visual


def _run_light_cognition_pipeline(intent: IntentVector, visual: VisualManifestation, trace_id: str) -> PipelineExecutionResult:
    t0 = perf_counter()
    semantic = _intent_to_semantic_field(intent)
    t1 = perf_counter()
    morphogenesis = _semantic_to_morphogenesis(semantic, visual)
    t2 = perf_counter()
    compiled = _morphogenesis_to_compiled(morphogenesis, visual)
    t3 = perf_counter()
    runtime_visual = _compiled_to_runtime_visual(compiled, visual)
    rendered_telemetry_field = _build_rendered_field_telemetry(semantic, runtime_visual, trace_id)
    runtime_guard, guarded_visual = _run_runtime_guard(semantic, rendered_telemetry_field, compiled, runtime_visual)
    t4 = perf_counter()
    return PipelineExecutionResult(
        semantic_field=semantic,
        morphogenesis_plan=morphogenesis,
        compiled_program=compiled,
        visual_manifestation=guarded_visual,
        metrics=PipelineExecutionMetrics(
            intent_to_semantic_ms=(t1 - t0) * 1000,
            semantic_to_morphogenesis_ms=(t2 - t1) * 1000,
            morphogenesis_to_compiler_ms=(t3 - t2) * 1000,
            compiler_to_runtime_ms=(t4 - t3) * 1000,
            total_pipeline_ms=(t4 - t0) * 1000,
        ),
        runtime_guard=runtime_guard,
    )


def _run_direct_visual_fallback(visual: VisualManifestation) -> VisualManifestation:
    return visual


def _compute_drift_metrics(intent_field: SemanticField, telemetry_field: SemanticField, compiled: CompiledLightProgram) -> DriftMetrics:
    intent_tensors = intent_field.semantic_tensors
    telemetry_tensors = telemetry_field.semantic_tensors
    dimensions = sorted(set(intent_tensors) | set(telemetry_tensors))
    if dimensions:
        sq_error = sum((intent_tensors.get(k, 0.0) - telemetry_tensors.get(k, 0.0)) ** 2 for k in dimensions)
        normalized_distance = min(1.0, sqrt(sq_error / len(dimensions)))
    else:
        normalized_distance = 0.0

    confidence_drift = abs(mean(intent_field.confidence_gradients or [0.0]) - mean(telemetry_field.confidence_gradients or [0.0]))
    polarity_drift = abs(intent_field.polarity - telemetry_field.polarity)
    ambiguity_drift = abs(intent_field.ambiguity - telemetry_field.ambiguity)

    topology_delta = (
        0.4 * normalized_distance
        + 0.35 * min(1.0, confidence_drift)
        + 0.25 * min(1.0, polarity_drift)
    )

    cadence_target = 24.0
    cadence_drift = abs(compiled.update_cadence_hz - cadence_target) / cadence_target
    temporal_instability = (
        0.55 * min(1.0, cadence_drift)
        + 0.45 * min(1.0, ambiguity_drift)
    )

    coherence = max(0.0, min(1.0, 1.0 - (0.6 * normalized_distance + 0.2 * confidence_drift + 0.2 * polarity_drift)))

    return DriftMetrics(
        semantic_coherence_score=coherence,
        topology_divergence_index=max(0.0, min(1.0, topology_delta)),
        temporal_instability_ratio=max(0.0, min(1.0, temporal_instability)),
    )


def _select_containment_mode(metrics: DriftMetrics) -> ContainmentMode:
    if metrics.temporal_instability_ratio >= 0.75:
        return ContainmentMode.HARD_ROLLBACK_LEGACY
    if metrics.topology_divergence_index >= 0.45:
        return ContainmentMode.DETERMINISTIC_ANCHOR_REPLAY
    return ContainmentMode.SOFT_CLAMP


def _apply_containment(mode: ContainmentMode, visual: VisualManifestation) -> tuple[VisualManifestation, str | None]:
    if mode == ContainmentMode.SOFT_CLAMP:
        clamped = visual.model_copy(deep=True)
        clamped.particle_physics.turbulence = max(0.0, min(clamped.particle_physics.turbulence, 0.35))
        clamped.particle_physics.luminance_mass = max(0.1, min(clamped.particle_physics.luminance_mass, 0.8))
        return clamped, None
    if mode == ContainmentMode.DETERMINISTIC_ANCHOR_REPLAY:
        package_name = sorted(SEV1_INCIDENT_PACKAGES)[0] if SEV1_INCIDENT_PACKAGES else None
        return visual, package_name
    return _run_direct_visual_fallback(visual), None


def _run_runtime_guard(
    intent_field: SemanticField,
    rendered_telemetry_field: SemanticField,
    compiled: CompiledLightProgram,
    visual: VisualManifestation,
) -> tuple[RuntimeGuardResult, VisualManifestation]:
    t0 = perf_counter()
    metrics = _compute_drift_metrics(intent_field, rendered_telemetry_field, compiled)
    divergence_detected = (
        metrics.semantic_coherence_score < 0.86
        or metrics.topology_divergence_index > 0.25
        or metrics.temporal_instability_ratio > 0.2
    )

    if not divergence_detected:
        latency_ms = (perf_counter() - t0) * 1000
        return (
            RuntimeGuardResult(
                metrics=metrics,
                divergence_detected=False,
                containment=ContainmentDecision(activated=False, activation_latency_ms=latency_ms),
            ),
            visual,
        )

    mode = _select_containment_mode(metrics)
    contained_visual, anchor_package = _apply_containment(mode, visual)
    latency_ms = (perf_counter() - t0) * 1000
    return (
        RuntimeGuardResult(
            metrics=metrics,
            divergence_detected=True,
            containment=ContainmentDecision(
                activated=True,
                mode=mode,
                activation_latency_ms=latency_ms,
                anchor_replay_package=anchor_package,
            ),
        ),
        contained_visual,
    )


def _build_rendered_field_telemetry(semantic: SemanticField, visual: VisualManifestation, trace_id: str) -> SemanticField:
    jitter_source = (abs(hash(trace_id)) % 31) / 1000.0
    energy = semantic.semantic_tensors.get("energy", 0.0)
    telemetry_energy = max(0.0, min(1.0, energy - (visual.particle_physics.turbulence * 0.02) + jitter_source))
    return SemanticField(
        semantic_tensors={**semantic.semantic_tensors, "energy": telemetry_energy},
        confidence_gradients=[max(0.0, min(1.0, c - 0.015 + jitter_source)) for c in semantic.confidence_gradients],
        polarity=max(-1.0, min(1.0, semantic.polarity + (jitter_source - 0.01))),
        ambiguity=max(0.0, min(1.0, semantic.ambiguity + visual.particle_physics.turbulence * 0.03)),
    )


async def _record_reliability_observation(runtime_guard: RuntimeGuardResult) -> None:
    global DRIFT_EVENT_TOTAL, DRIFT_EVENT_DETECTED
    async with RELIABILITY_LOCK:
        DRIFT_EVENT_TOTAL += 1
        detected = runtime_guard.divergence_detected
        if detected:
            DRIFT_EVENT_DETECTED += 1
        if runtime_guard.containment.activated:
            CONTAINMENT_LATENCIES_MS.append(runtime_guard.containment.activation_latency_ms)
            CONTAINMENT_LATENCIES_MS[:] = CONTAINMENT_LATENCIES_MS[-10_000:]


def _run_seeded_incident_replay_packages() -> dict[str, bool]:
    results: dict[str, bool] = {}
    for package_name in SEV1_INCIDENT_PACKAGES:
        run = replay_incident_package(package_name, node_count=3)
        results[package_name] = bool(run["lockstep"])
    return results


# --- API Endpoints ---

@app.post("/api/v1/cognitive/generate")
async def generate_text(
    request: GenerateRequest,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> GenerateResponse:
    _ensure_api_key(x_api_key)
    async with METRICS_LOCK:
        METRICS.generative_requests += 1
    try:
        generated_text = await invoke_generative_model(
            prompt=request.prompt,
            model=request.model,
            temperature=request.temperature
        )
        return GenerateResponse(
            text=generated_text,
            model=request.model,
            trace_id=str(uuid.uuid4()),
            provider=MODEL_PROVIDER_MAP.get(request.model, "unknown")
        )
    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Model provider error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")

@app.post("/api/v1/cognitive/emit")
async def emit_cognitive_dsl(
    request: dict[str, Any] | None,
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    x_model_provider: str | None = Header(None, alias="X-Model-Provider"),
    x_model_version: str | None = Header(None, alias="X-Model-Version"),
) -> dict[str, Any]:
    _ensure_api_key(x_api_key)
    if not x_model_provider or not x_model_version:
        raise HTTPException(status_code=400, detail="missing model provider/version")

    try:
        parsed = CognitiveEmitRequest.model_validate(request or {})
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors())

    async with METRICS_LOCK:
        METRICS.total_dsl_submissions += 1
    passed, violations = FirmaValidator.validate_dsl_response(parsed)
    if not passed:
        async with METRICS_LOCK:
            METRICS.validation_failures += 1
        raise HTTPException(422, detail=ValidationResult(status="failed", violations=violations).model_dump())

    async with METRICS_LOCK:
        METRICS.successful_renders += 1

    light_cognition_layer_enabled = _env_flag("light_cognition_layer_enabled", default=True)
    morphogenesis_runtime_enabled = _env_flag("morphogenesis_runtime_enabled", default=True)

    if light_cognition_layer_enabled and morphogenesis_runtime_enabled:
        pipeline_result = _run_light_cognition_pipeline(
            intent=parsed.model_response.intent_vector,
            visual=parsed.model_response.visual_manifestation,
            trace_id=parsed.model_response.trace_id,
        )
        if pipeline_result.runtime_guard:
            await _record_reliability_observation(pipeline_result.runtime_guard)
        replay_status = _run_seeded_incident_replay_packages()
        async with RELIABILITY_LOCK:
            REPLAY_REPRO_BY_PACKAGE.update(replay_status)
        _ = pipeline_result.visual_manifestation
    else:
        _run_direct_visual_fallback(parsed.model_response.visual_manifestation)

    return {"status": "success", "trace_id": parsed.model_response.trace_id}

@app.post("/api/v1/cognitive/validate")
async def validate_cognitive_dsl(
    request: dict[str, Any] | None,
    x_api_key: str | None = Header(None, alias="X-API-Key"),
) -> ValidationResult:
    _ensure_api_key(x_api_key)
    try:
        parsed = CognitiveEmitRequest.model_validate(request or {})
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors())
    passed, violations = FirmaValidator.validate_dsl_response(parsed)
    return ValidationResult(status="success" if passed else "failed", violations=violations)

@app.get("/health")
def health_check() -> dict[str, Any]:
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {
            "api_gateway": "up",
            "validator_service": "up",
            "model_connections": {
                "google_gemini": "healthy",
                "openai_gpt": "healthy",
                "anthropic_claude": "standby",
            },
        },
    }

@app.get("/api/v1/proxy/fetch")
async def proxy_fetch_url(url: str, x_api_key: str | None = Header(None, alias="X-API-Key")) -> dict[str, Any]:
    _ensure_api_key(x_api_key)
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise HTTPException(status_code=400, detail="Invalid URL structure")
    if parsed.username or parsed.password:
        raise HTTPException(status_code=400, detail="URL credentials are not allowed")
    if PROXY_ALLOWED_HOSTS and parsed.hostname.lower() not in PROXY_ALLOWED_HOSTS:
        raise HTTPException(status_code=403, detail="URL host is not allowlisted")
    if _is_blocked_proxy_target(parsed.hostname):
        raise HTTPException(status_code=403, detail="URL host resolves to a blocked IP range")
    try:
        async with httpx.AsyncClient(
            timeout=6.0,
            follow_redirects=False,
            headers={"User-Agent": "AetheriumProxy/1.0"},
        ) as client:
            response = await client.get(url)
            if response.is_redirect:
                raise HTTPException(status_code=403, detail="Redirect responses are not allowed")
            response.raise_for_status()
            text = response.text[:120_000]
        return {"content_length": len(text), "snippet": " ".join(text.split())[:1200]}
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Proxy fetch failed: {exc}")

@app.post("/api/v1/telemetry/ingest")
async def ingest_telemetry(req: TelemetryIngestRequest, x_api_key: str | None = Header(None, alias="X-API-Key")) -> dict[str, int]:
    _ensure_api_key(x_api_key)
    async with TELEMETRY_LOCK:
        for point in req.points:
            series = TELEMETRY_TS_DB.setdefault(point.metric, [])
            series.append(point.model_dump())
            series[:] = series[-2500:]
        return {"ingested": len(req.points), "series_count": len(TELEMETRY_TS_DB)}

@app.get("/api/v1/telemetry/query")
async def query_telemetry(
    metric: str,
    window_seconds: int = Query(3600, ge=1, le=86400),
    x_api_key: str | None = Header(None, alias="X-API-Key"),
) -> dict[str, Any]:
    _ensure_api_key(x_api_key)
    now_ts = datetime.now(timezone.utc).timestamp()
    async with TELEMETRY_LOCK:
        rows = [p for p in TELEMETRY_TS_DB.get(metric, []) if now_ts - p["ts"].timestamp() <= window_seconds]
    values = [p["value"] for p in rows]
    p95 = sorted(values)[int(len(values) * 0.95)] if values else None
    return {
        "count": len(values),
        "mean": mean(values) if values else None,
        "p95": p95,
        "latest": rows[-1] if rows else None,
    }

@app.get("/api/v1/voice/model")
def resolve_voice_model(language: str = "en-US", region: str = "us") -> dict[str, str]:
    model = _resolve_voice_model(language, region)
    return {"language": language, "region": region, "model": model}


@app.get("/api/v1/reliability/temporal-morphogenesis")
async def reliability_temporal_morphogenesis(x_api_key: str | None = Header(None, alias="X-API-Key")) -> dict[str, Any]:
    _ensure_api_key(x_api_key)
    async with RELIABILITY_LOCK:
        recall = (DRIFT_EVENT_DETECTED / DRIFT_EVENT_TOTAL) if DRIFT_EVENT_TOTAL else 1.0
        latencies = sorted(CONTAINMENT_LATENCIES_MS)
        p95 = latencies[int(0.95 * (len(latencies) - 1))] if latencies else 0.0
        sev1_total = len(SEV1_INCIDENT_PACKAGES)
        sev1_repro = sum(1 for name in SEV1_INCIDENT_PACKAGES if REPLAY_REPRO_BY_PACKAGE.get(name))
        replay_repro_rate = (sev1_repro / sev1_total) if sev1_total else 1.0
        return {
            "drift_detector_recall": recall,
            "containment_activation_p95_ms": p95,
            "sev1_replay_reproducibility": replay_repro_rate,
            "drift_metrics": {
                "semantic_coherence_score": "tracked_per_window",
                "topology_divergence_index": "tracked_per_window",
                "temporal_instability_ratio": "tracked_per_window",
            },
            "acceptance_targets": {
                "drift_detector_recall_gte": 0.98,
                "containment_activation_p95_ms_lte": 75.0,
                "sev1_replay_reproducibility_eq": 1.0,
            },
            "acceptance_status": {
                "drift_detector": recall >= 0.98,
                "containment_latency": p95 <= 75.0,
                "replay_reproducibility": replay_repro_rate == 1.0,
            },
        }

# --- WebSocket Endpoints ---

@app.websocket("/ws/cognitive-stream")
async def cognitive_stream(websocket: WebSocket) -> None:
    api_key = _extract_ws_api_key(websocket)
    if not api_key:
        await websocket.close(code=1008, reason="Missing API Key")
        return
    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_json()
            if payload.get("type") != "dsl_submission":
                await websocket.send_json({"status": "error", "detail": "Invalid message type"})
                continue
            # Simulate processing and acknowledging the DSL
            await websocket.send_json({"status": "accepted", "echo": payload})
    except WebSocketDisconnect:
        pass

@app.websocket("/ws/state-sync/{room_id}")
async def state_sync(websocket: WebSocket, room_id: str, user_id: str | None = Query(None)) -> None:
    api_key = _extract_ws_api_key(websocket)
    if not api_key:
        await websocket.close(code=1008, reason="Missing API Key")
        return
    room = await _room(room_id)
    await websocket.accept()
    async with room.lock:
        room.clients.append(websocket)
    try:
        await websocket.send_json({"type": "state_snapshot", **room.snapshot(user_id)})
        while True:
            payload = await websocket.receive_json()
            if payload.get("type") != "patch_state":
                continue
            async with room.lock:
                snapshot = room.apply_delta(payload.get("delta", {}), user_id, payload.get("user_delta", {}))
                message = {"type": "state_updated", **snapshot}
                await room.broadcast_json(message)
    except WebSocketDisconnect:
        async with room.lock:
            if websocket in room.clients:
                room.clients.remove(websocket)
