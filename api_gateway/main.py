
from __future__ import annotations

import asyncio
import ipaddress
import httpx
import logging
import os
import re
import socket
import uuid
import hashlib
from datetime import datetime, timezone
from statistics import mean
from typing import Any, Literal
from urllib.parse import urlparse
from collections import deque
from contextlib import asynccontextmanager
from typing import Dict, Optional, Union
from enum import Enum

from fastapi import FastAPI, HTTPException, Header, Query, WebSocket, WebSocketDisconnect
from .scholar_router import router as scholar_router
from .variation_service import generate_variation_set
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import redis.asyncio as redis
import nats
from governor.runtime_governor import RuntimeGovernor, GovernorContext
from .deterministic_replay import INCIDENT_REPLAY_PACKAGES

app = FastAPI(title="AGNS Cognitive DSL Gateway", version="1.3.0")


# --- Constants and Configuration ---

FIRMA_CONSTRAINTS = {
    "max_particles_by_tier": {
        "LOW": 2000,
        "MID": 5000,
        "HIGH": 12000,
        "ULTRA": 25000,
    }
}

PROXY_ALLOWED_HOSTS = {
    host.strip().lower()
    for host in os.getenv("AETHERIUM_PROXY_ALLOWED_HOSTS", "").split(",")
    if host.strip()
}

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


# --- Pydantic Models ---

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

class GenerateRequest(BaseModel):
    prompt: str
    model: str = Field(default="gemini-1.5-pro")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)

class GenerateResponse(BaseModel):
    text: str
    model: str
    trace_id: str
    provider: str
    intent_vector: IntentVector
    visual_manifestation: VisualManifestation

class ModelResponse(BaseModel):
    trace_id: str
    reasoning_trace: str = ""
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
    validator_version: str = "firma-validator-2.2"

class Metrics(BaseModel):
    total_dsl_submissions: int = 0
    successful_renders: int = 0
    validation_failures: int = 0
    generative_requests: int = 0

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

class SemanticField(BaseModel):
    semantic_tensors: Dict[str, float] = Field(default_factory=dict)
    confidence_gradients: list[float] = Field(default_factory=list)
    polarity: float = 0.0
    ambiguity: float = 0.0

class MorphogenesisPlan(BaseModel):
    topology_seeds: list[str] = Field(default_factory=list)
    attractors: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    temporal_operators: list[str] = Field(default_factory=list)

class CompiledLightProgram(BaseModel):
    shader_uniforms: Dict[str, Union[float, int, str, bool]] = Field(default_factory=dict)
    particle_targets: Dict[str, int] = Field(default_factory=dict)
    force_field_descriptors: list[str] = Field(default_factory=list)
    update_cadence_hz: float = Field(default=30.0, gt=0.0)

class ContainmentInfo(BaseModel):
    activation_latency_ms: float = 0.0

class RuntimeGuardInfo(BaseModel):
    containment: ContainmentInfo

class DriftMetrics(BaseModel):
    semantic_coherence_score: float
    topology_divergence_index: float
    temporal_instability_ratio: float

class LightCognitionPipelineResult(BaseModel):
    trace_id: str
    semantic_field: SemanticField
    morphogenesis_plan: MorphogenesisPlan
    compiled_program: CompiledLightProgram
    runtime_guard: RuntimeGuardInfo

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


# --- In-memory State and Concurrency ---

METRICS = Metrics()
TELEMETRY_TS_DB: dict[str, list[dict[str, Any]]] = {}
STATE_SYNC_ROOMS: dict[str, 'StateSyncRoom'] = {}

METRICS_LOCK = asyncio.Lock()
TELEMETRY_LOCK = asyncio.Lock()
ROOMS_LOCK = asyncio.Lock()

# --- State Synchronization Room ---

class StateSyncRoom:
    def __init__(self) -> None:
        self.shared_state: dict[str, Any] = {}
        self.user_state: dict[str, Any] = {}
        self.clients: list[Any] = []
        self.lock = asyncio.Lock()

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

    def snapshot(self, user_id: str | None = None) -> dict[str, Any]:
        return {
            "shared_state": dict(self.shared_state),
            "user_state": dict(self.user_state),
            "actor": user_id,
        }

    async def broadcast_json(self, message: dict[str, Any]) -> None:
        survivors: list[Any] = []
        for client in self.clients:
            try:
                await client.send_json(message)
                survivors.append(client)
            except Exception:
                continue
        self.clients = survivors

# --- DSL Validation ---

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

# --- Generative Model Invocation ---

async def invoke_generative_model(prompt: str, model: str, temperature: float) -> str:
    provider = MODEL_PROVIDER_MAP.get(model)
    if not provider:
        raise HTTPException(status_code=400, detail=f"Unsupported model: {model}")

    if provider == "google":
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Google API key (GEMINI_API_KEY or GOOGLE_API_KEY) is not set")
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

    raise HTTPException(status_code=501, detail=f"Provider {provider} not implemented")

# --- Helper Functions ---

def _infer_intent_from_text(text: str) -> tuple[IntentVector, VisualManifestation]:
    """วิเคราะห์ข้อความที่สร้างขึ้น เพื่อแปลงเป็น Intent Vector และ Visual Parameters"""
    length = len(text)
    
    # 1. คำนวณ Energy Level (0.0 - 1.0) จากความยาวและเครื่องหมายอัศเจรีย์
    exclamations = len(re.findall(r'!', text))
    energy = min(1.0, 0.3 + (exclamations * 0.15) + (length / 1000.0))
    
    # 2. คำนวณ Emotional Valence (-1.0 ถึง 1.0) โดยจำลองจากการตรวจจับคีย์เวิร์ด
    positive_words = ["ดี", "เยี่ยม", "ยินดี", "ความสุข", "สำเร็จ", "good", "great", "happy"]
    negative_words = ["แย่", "เสียใจ", "ผิดพลาด", "ปัญหา", "ขออภัย", "bad", "error", "sorry"]
    
    pos_count = sum(1 for w in positive_words if w in text.lower())
    neg_count = sum(1 for w in negative_words if w in text.lower())
    
    valence = 0.0
    if pos_count > neg_count:
        valence = min(1.0, (pos_count - neg_count) * 0.25)
    elif neg_count > pos_count:
        valence = max(-1.0, (neg_count - pos_count) * -0.25)
        
    # 3. กำหนด Category
    category = "narrative"
    if "?" in text:
        category = "inquiry"
    elif "!" in text:
        category = "exclamation"

    # 4. แปลง Intent เป็นพารามิเตอร์ทางสายตา (Visual Manifestation)
    primary_color = "#00FFFF"  # สีหลัก: Cyan (ปกติ/เป็นกลาง)
    if valence > 0.4:
        primary_color = "#00FF00"  # สีเขียว (พลังงานบวก)
    elif valence < -0.4:
        primary_color = "#FF4500"  # สีส้มแดง (เชิงลบ/เตือนภัย)
    
    if energy > 0.8:
        primary_color = "#FFD700"  # สีทอง (พลังงานสูงมาก)
        
    # พลศาสตร์ของอนุภาคแสงอิงตามค่าพลังงาน
    turbulence = min(1.0, energy * 0.8)
    particle_count = min(10000, int(2000 + (energy * 8000)))  # จำนวนจุดแสงตามพลังงาน
    
    intent = IntentVector(
        category=category,
        emotional_valence=valence,
        energy_level=energy
    )
    
    visual = VisualManifestation(
        base_shape="fluid_typography", # บอก WebGL ว่าให้เรียงเป็นตัวอักษรแบบของไหล
        transition_type="emerge",
        color_palette=ColorPalette(primary=primary_color, secondary="#FFFFFF"),
        particle_physics=ParticlePhysics(
            turbulence=turbulence,
            flow_direction="dynamic_outward",
            luminance_mass=energy,
            particle_count=particle_count
        ),
        chromatic_mode="reactive",
        device_tier=2 # ตั้งค่าเริ่มต้นให้รันบน Device ระดับกลาง
    )
    
    return intent, visual

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
            if address.is_private or address.is_loopback or address.is_link_local:
                return True
    except socket.gaierror:
        return True
    return False

def _semantic_from_intent(intent: IntentVector) -> SemanticField:
    category_hash = int(hashlib.sha1(intent.category.encode("utf-8")).hexdigest()[:6], 16) / 0xFFFFFF
    return SemanticField(
        semantic_tensors={
            "category_hash": round(category_hash, 6),
            "valence": intent.emotional_valence,
            "energy": intent.energy_level,
        },
        confidence_gradients=[max(0.0, 1 - abs(intent.emotional_valence)), max(0.0, 1 - abs(0.5 - intent.energy_level))],
        polarity=float(intent.emotional_valence),
        ambiguity=max(0.0, min(1.0, 1.0 - abs(intent.emotional_valence))),
    )

def _semantic_to_morphogenesis(semantic: SemanticField, visual: VisualManifestation) -> MorphogenesisPlan:
    energy = semantic.semantic_tensors.get("energy", 0.5)
    return MorphogenesisPlan(
        topology_seeds=[visual.base_shape],
        attractors=["coherence"] if semantic.ambiguity < 0.5 else ["stability"],
        constraints=["governor_safe_bounds"],
        temporal_operators=["phase_lock"] if energy > 0.4 else ["gentle_settle"],
    )

def _morphogenesis_to_compiled(plan: MorphogenesisPlan, visual: VisualManifestation) -> CompiledLightProgram:
    cadence = max(12.0, min(60.0, 16 + (visual.particle_physics.luminance_mass * 22)))
    return CompiledLightProgram(
        shader_uniforms={
            "turbulence": visual.particle_physics.turbulence,
            "luminance_mass": visual.particle_physics.luminance_mass,
            "chromatic_mode": visual.chromatic_mode,
        },
        particle_targets={"count": visual.particle_physics.particle_count},
        force_field_descriptors=plan.temporal_operators or ["phase_lock"],
        update_cadence_hz=cadence,
    )

def _compute_drift_metrics(
    baseline: SemanticField,
    telemetry: SemanticField,
    compiled: CompiledLightProgram,
) -> DriftMetrics:
    base_valence = baseline.semantic_tensors.get("valence", baseline.polarity)
    base_energy = baseline.semantic_tensors.get("energy", 0.5)
    tele_valence = telemetry.semantic_tensors.get("valence", telemetry.polarity)
    tele_energy = telemetry.semantic_tensors.get("energy", 0.5)

    valence_delta = abs(base_valence - tele_valence)
    energy_delta = abs(base_energy - tele_energy)
    ambiguity_delta = abs(baseline.ambiguity - telemetry.ambiguity)

    semantic_coherence = max(0.0, 1.0 - (0.6 * valence_delta + 0.3 * energy_delta + 0.2 * ambiguity_delta))
    topology_divergence = min(1.0, (0.55 * valence_delta) + (0.25 * energy_delta) + (0.4 * ambiguity_delta))
    cadence_factor = min(1.0, compiled.update_cadence_hz / 120.0)
    temporal_instability = min(1.0, (1.0 - semantic_coherence) * (0.35 + cadence_factor * 0.15))

    return DriftMetrics(
        semantic_coherence_score=semantic_coherence,
        topology_divergence_index=topology_divergence,
        temporal_instability_ratio=temporal_instability,
    )

def _run_direct_visual_fallback(visual: VisualManifestation) -> VisualManifestation:
    return visual.model_copy(deep=True)

def _run_light_cognition_pipeline(
    intent: IntentVector,
    particle_control: ParticleControlContract,
    visual: VisualManifestation,
    governor_context: GovernorContext,
    trace_id: str,
) -> LightCognitionPipelineResult:
    semantic_field = _semantic_from_intent(intent)
    morphogenesis_plan = _semantic_to_morphogenesis(semantic_field, visual)
    compiled_program = _morphogenesis_to_compiled(morphogenesis_plan, visual)
    containment_latency_ms = max(
        8.0,
        min(
            74.0,
            14.0 + (visual.particle_physics.turbulence * 28.0) + (intent.energy_level * 18.0),
        ),
    )
    runtime_guard = RuntimeGuardInfo(containment=ContainmentInfo(activation_latency_ms=containment_latency_ms))
    return LightCognitionPipelineResult(
        trace_id=trace_id,
        semantic_field=semantic_field,
        morphogenesis_plan=morphogenesis_plan,
        compiled_program=compiled_program,
        runtime_guard=runtime_guard,
    )

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
        # 1. เรียกใช้งาน LLM ตามปกติเพื่อสร้างข้อความ
        generated_text = await invoke_generative_model(
            prompt=request.prompt,
            model=request.model,
            temperature=request.temperature
        )
        
        # 2. ประมวลผล "สมการแห่งเจตจำนง" จากข้อความที่ได้
        intent_vec, visual_manifest = _infer_intent_from_text(generated_text)
        
        # 3. ส่งข้อมูลทั้งหมดกลับให้หน้าบ้านนำไปร้อยเรียงแสง
        return GenerateResponse(
            text=generated_text,
            model=request.model,
            trace_id=str(uuid.uuid4()),
            provider=MODEL_PROVIDER_MAP.get(request.model, "unknown"),
            intent_vector=intent_vec,               # <--- ส่งเวกเตอร์เจตจำนง
            visual_manifestation=visual_manifest    # <--- ส่งสเปคของแสง
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Model provider error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")

@app.post("/api/v1/cognitive/emit")
async def emit_cognitive_dsl(
    request: CognitiveEmitRequest, 
    x_api_key: str | None = Header(None, alias="X-API-Key")
) -> dict[str, Any]:
    _ensure_api_key(x_api_key)
    provider = request.model_metadata.model_name

    async with METRICS_LOCK:
        METRICS.total_dsl_submissions += 1
    passed, violations = FirmaValidator.validate_dsl_response(request)
    if not passed:
        async with METRICS_LOCK:
            METRICS.validation_failures += 1
        raise HTTPException(422, detail=ValidationResult(status="failed", violations=violations).model_dump())

    async with METRICS_LOCK:
        METRICS.successful_renders += 1
    return {"status": "success", "trace_id": request.model_response.trace_id}

@app.post("/api/v1/cognitive/validate")
async def validate_cognitive_dsl(
    request: CognitiveEmitRequest,
    x_api_key: str | None = Header(None, alias="X-API-Key"),
) -> ValidationResult:
    _ensure_api_key(x_api_key)
    passed, violations = FirmaValidator.validate_dsl_response(request)
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
    if PROXY_ALLOWED_HOSTS and parsed.hostname.lower() not in PROXY_ALLOWED_HOSTS:
        raise HTTPException(status_code=403, detail="URL host is not allowlisted")
    if _is_blocked_proxy_target(parsed.hostname):
        raise HTTPException(status_code=403, detail="URL host resolves to a blocked IP range")
    try:
        async with httpx.AsyncClient(timeout=6.0, headers={"User-Agent": "AetheriumProxy/1.0"}) as client:
            response = await client.get(url)
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
            series.append(point.model_dump(mode="json"))
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
        rows = [p for p in TELEMETRY_TS_DB.get(metric, []) if now_ts - datetime.fromisoformat(p["ts"]).timestamp() <= window_seconds]
    values = [p["value"] for p in rows]
    p95 = sorted(values)[int(len(values) * 0.95)] if values else None
    return {
        "count": len(values),
        "mean": mean(values) if values else None,
        "p95": p95,
        "latest": rows[-1] if rows else None,
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

def _resolve_voice_model(language: str, region: str) -> str:
    lang_key = language.split("-", maxsplit=1)[0].lower()
    region_key = region.lower()
    return VOICE_MODEL_MAP.get((lang_key, region_key), f"whisper-general-{lang_key}")


@app.get("/api/v1/voice/model")
def resolve_voice_model(language: str = "en-US", region: str = "us") -> dict[str, str]:
    model = _resolve_voice_model(language, region)
    return {"language": language, "region": region, "model": model}

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
            await websocket.send_json({"status": "accepted", "echo": payload})
    except WebSocketDisconnect:
        pass

@app.websocket("/ws/state-sync/{room_id}")
async def state_sync(websocket: WebSocket, room_id: str, user_id: str | None = Query(None)) -> None:
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
                await asyncio.gather(*[client.send_json(message) for client in room.clients])
    except WebSocketDisconnect:
        async with room.lock:
            if websocket in room.clients:
                room.clients.remove(websocket)
