
from __future__ import annotations

import asyncio
import ipaddress
import os
import socket
import uuid
from datetime import datetime, timezone
from statistics import mean
from typing import Any, Literal
from urllib.parse import urlparse

import httpx
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


# --- In-memory State and Concurrency --- 

METRICS = Metrics()
TELEMETRY_TS_DB: dict[str, list[dict[str, Any]]] = {}
STATE_SYNC_ROOMS: dict[str, StateSyncRoom] = {}

METRICS_LOCK = asyncio.Lock()
TELEMETRY_LOCK = asyncio.Lock()
ROOMS_LOCK = asyncio.Lock()

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
