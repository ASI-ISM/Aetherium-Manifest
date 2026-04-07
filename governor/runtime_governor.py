from __future__ import annotations

import copy
import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, MutableMapping, Optional, Tuple

try:
    import jsonschema  # type: ignore
except Exception:  # pragma: no cover
    jsonschema = None


STATE_PROFILES: Dict[str, Dict[str, Any]] = {
    "IDLE": {
        "intent_state": {
            "shape": "NEBULA_CLOUD",
            "particle_density": 0.18,
            "turbulence": 0.08,
            "glow_intensity": 0.22,
            "flicker": 0.00,
            "confidence": 0.55,
            "energy_level": 0.15,
            "uncertainty": 0.10,
            "emotional_valence": 0.0,
            "reasoning_style": "REFLECTIVE",
            "relational_intent": "NEUTRAL",
            "palette": {
                "mode": "CALM_IDLE",
                "primary": "#D8F0FF",
                "secondary": "#5AB8FF",
                "accent": "#FFFFFF",
            },
        },
        "renderer_controls": {
            "flow_direction": "STABLE",
            "velocity": 0.10,
            "cohesion": 0.35,
            "trail": 0.12,
            "bloom": 0.15,
            "noise": 0.05,
            "attractor": {"x": 0.50, "y": 0.50},
            "runtime_profile": "DETERMINISTIC",
            "easing": "SMOOTH",
            "shader_uniforms": {},
        },
    },
    "LISTENING": {
        "intent_state": {
            "shape": "SPHERE",
            "particle_density": 0.28,
            "turbulence": 0.12,
            "glow_intensity": 0.38,
            "flicker": 0.01,
            "confidence": 0.62,
            "energy_level": 0.30,
            "uncertainty": 0.18,
            "emotional_valence": 0.05,
            "reasoning_style": "EMPATHIC",
            "relational_intent": "GUIDING",
            "palette": {
                "mode": "ACTIVE_LISTENING",
                "primary": "#5EEBFF",
                "secondary": "#DBFDFF",
                "accent": "#9BFFF8",
            },
        },
        "renderer_controls": {
            "flow_direction": "INWARD",
            "velocity": 0.18,
            "cohesion": 0.56,
            "trail": 0.18,
            "bloom": 0.24,
            "noise": 0.08,
            "attractor": {"x": 0.50, "y": 0.55},
            "runtime_profile": "DETERMINISTIC",
            "easing": "SMOOTH",
            "shader_uniforms": {},
        },
    },
    "THINKING": {
        "intent_state": {
            "shape": "SPIRAL_VORTEX",
            "particle_density": 0.78,
            "turbulence": 0.24,
            "glow_intensity": 0.76,
            "flicker": 0.04,
            "confidence": 0.72,
            "energy_level": 0.68,
            "uncertainty": 0.22,
            "emotional_valence": 0.08,
            "reasoning_style": "ANALYTICAL",
            "relational_intent": "GUIDING",
            "palette": {
                "mode": "DEEP_REASONING",
                "primary": "#6A0DAD",
                "secondary": "#D8C7FF",
                "accent": "#55C7FF",
            },
        },
        "renderer_controls": {
            "flow_direction": "INWARD",
            "velocity": 0.42,
            "cohesion": 0.72,
            "trail": 0.34,
            "bloom": 0.32,
            "noise": 0.12,
            "attractor": {"x": 0.50, "y": 0.42},
            "runtime_profile": "DETERMINISTIC",
            "easing": "VISCOUS",
            "shader_uniforms": {"swirl_bias": 0.16},
        },
    },
    "GENERATING": {
        "intent_state": {
            "shape": "STREAM",
            "particle_density": 0.82,
            "turbulence": 0.34,
            "glow_intensity": 0.82,
            "flicker": 0.05,
            "confidence": 0.70,
            "energy_level": 0.78,
            "uncertainty": 0.18,
            "emotional_valence": 0.20,
            "reasoning_style": "CREATIVE",
            "relational_intent": "COMPANIONING",
            "palette": {
                "mode": "CO_CREATION",
                "primary": "#FF7BE5",
                "secondary": "#FFE4FA",
                "accent": "#9B7BFF",
            },
        },
        "renderer_controls": {
            "flow_direction": "OUTWARD",
            "velocity": 0.56,
            "cohesion": 0.64,
            "trail": 0.45,
            "bloom": 0.42,
            "noise": 0.18,
            "attractor": {"x": 0.52, "y": 0.45},
            "runtime_profile": "ADAPTIVE",
            "easing": "ELASTIC",
            "shader_uniforms": {"burst_bias": 0.10},
        },
    },
    "RESPONDING": {
        "intent_state": {
            "shape": "SHELL",
            "particle_density": 0.62,
            "turbulence": 0.18,
            "glow_intensity": 0.66,
            "flicker": 0.02,
            "confidence": 0.78,
            "energy_level": 0.52,
            "uncertainty": 0.12,
            "emotional_valence": 0.12,
            "reasoning_style": "PROCEDURAL",
            "relational_intent": "GUIDING",
            "palette": {
                "mode": "CO_CREATION",
                "primary": "#B087FF",
                "secondary": "#F4E9FF",
                "accent": "#55C7FF",
            },
        },
        "renderer_controls": {
            "flow_direction": "OUTWARD",
            "velocity": 0.34,
            "cohesion": 0.60,
            "trail": 0.28,
            "bloom": 0.24,
            "noise": 0.08,
            "attractor": {"x": 0.50, "y": 0.48},
            "runtime_profile": "DETERMINISTIC",
            "easing": "SMOOTH",
            "shader_uniforms": {},
        },
    },
    "WARNING": {
        "intent_state": {
            "shape": "STREAM",
            "particle_density": 0.50,
            "turbulence": 0.38,
            "glow_intensity": 0.80,
            "flicker": 0.08,
            "confidence": 0.55,
            "energy_level": 0.68,
            "uncertainty": 0.34,
            "emotional_valence": -0.10,
            "reasoning_style": "PROCEDURAL",
            "relational_intent": "ALERTING",
            "palette": {
                "mode": "WARNING_OVERLOAD",
                "primary": "#FFB347",
                "secondary": "#FFF0D1",
                "accent": "#FF7A00",
            },
        },
        "renderer_controls": {
            "flow_direction": "ORBITAL",
            "velocity": 0.40,
            "cohesion": 0.46,
            "trail": 0.26,
            "bloom": 0.36,
            "noise": 0.20,
            "attractor": {"x": 0.50, "y": 0.50},
            "runtime_profile": "ADAPTIVE",
            "easing": "LINEAR",
            "shader_uniforms": {},
        },
    },
    "ERROR": {
        "intent_state": {
            "shape": "CRACKED_SHELL",
            "particle_density": 0.44,
            "turbulence": 0.28,
            "glow_intensity": 0.90,
            "flicker": 0.00,
            "confidence": 0.40,
            "energy_level": 0.60,
            "uncertainty": 0.60,
            "emotional_valence": -0.20,
            "reasoning_style": "PROCEDURAL",
            "relational_intent": "ALERTING",
            "palette": {
                "mode": "ERROR_POLICY",
                "primary": "#DC143C",
                "secondary": "#FFD7DF",
                "accent": "#FF5C75",
            },
        },
        "renderer_controls": {
            "flow_direction": "FREE",
            "velocity": 0.26,
            "cohesion": 0.28,
            "trail": 0.20,
            "bloom": 0.30,
            "noise": 0.14,
            "attractor": {"x": 0.50, "y": 0.50},
            "runtime_profile": "DETERMINISTIC",
            "easing": "LINEAR",
            "shader_uniforms": {},
        },
    },
    "NIRODHA": {
        "intent_state": {
            "shape": "NEBULA_CLOUD",
            "particle_density": 0.08,
            "turbulence": 0.02,
            "glow_intensity": 0.08,
            "flicker": 0.00,
            "confidence": 0.80,
            "energy_level": 0.05,
            "uncertainty": 0.05,
            "emotional_valence": 0.0,
            "reasoning_style": "REFLECTIVE",
            "relational_intent": "SOOTHING",
            "palette": {
                "mode": "NIRODHA_DORMANT",
                "primary": "#001A4D",
                "secondary": "#0D274F",
                "accent": "#4C79D8",
            },
        },
        "renderer_controls": {
            "flow_direction": "STABLE",
            "velocity": 0.04,
            "cohesion": 0.24,
            "trail": 0.05,
            "bloom": 0.06,
            "noise": 0.00,
            "attractor": {"x": 0.50, "y": 0.50},
            "runtime_profile": "LOW_POWER",
            "easing": "SMOOTH",
            "shader_uniforms": {},
        },
    },
    "SENSOR_ACTIVE": {
        "intent_state": {
            "shape": "SPHERE",
            "particle_density": 0.26,
            "turbulence": 0.10,
            "glow_intensity": 0.40,
            "flicker": 0.00,
            "confidence": 0.65,
            "energy_level": 0.26,
            "uncertainty": 0.12,
            "emotional_valence": 0.0,
            "reasoning_style": "EXPLORATORY",
            "relational_intent": "GUIDING",
            "palette": {
                "mode": "ACTIVE_LISTENING",
                "primary": "#55C7FF",
                "secondary": "#E6F8FF",
                "accent": "#00FFFF",
            },
        },
        "renderer_controls": {
            "flow_direction": "INWARD",
            "velocity": 0.20,
            "cohesion": 0.48,
            "trail": 0.18,
            "bloom": 0.22,
            "noise": 0.06,
            "attractor": {"x": 0.50, "y": 0.50},
            "runtime_profile": "DETERMINISTIC",
            "easing": "SMOOTH",
            "shader_uniforms": {},
        },
    },
}

ALLOWED_TRANSITIONS = {
    "IDLE": {"LISTENING", "THINKING", "GENERATING", "RESPONDING", "WARNING", "ERROR", "NIRODHA", "SENSOR_ACTIVE"},
    "LISTENING": {"IDLE", "THINKING", "RESPONDING", "WARNING", "ERROR", "NIRODHA", "SENSOR_ACTIVE"},
    "THINKING": {"IDLE", "GENERATING", "RESPONDING", "WARNING", "ERROR", "NIRODHA"},
    "GENERATING": {"IDLE", "RESPONDING", "WARNING", "ERROR", "NIRODHA"},
    "RESPONDING": {"IDLE", "LISTENING", "THINKING", "WARNING", "ERROR", "NIRODHA"},
    "WARNING": {"IDLE", "THINKING", "RESPONDING", "ERROR", "NIRODHA"},
    "ERROR": {"IDLE", "NIRODHA"},
    "NIRODHA": {"IDLE", "LISTENING", "SENSOR_ACTIVE"},
    "SENSOR_ACTIVE": {"IDLE", "LISTENING", "THINKING", "WARNING", "ERROR"},
}

DEVICE_CAPS = {
    "HIGH": {"particle_density": 1.0, "glow_intensity": 1.0, "trail": 1.0, "bloom": 1.0, "noise": 1.0},
    "MID": {"particle_density": 0.72, "glow_intensity": 0.86, "trail": 0.62, "bloom": 0.58, "noise": 0.56},
    "LOW": {"particle_density": 0.36, "glow_intensity": 0.66, "trail": 0.34, "bloom": 0.26, "noise": 0.24},
}

RESERVED_PALETTES = {
    "WARNING": "WARNING_OVERLOAD",
    "ERROR": "ERROR_POLICY",
    "NIRODHA": "NIRODHA_DORMANT",
}

SCALAR_PATHS = [
    ("intent_state", "particle_density"),
    ("intent_state", "turbulence"),
    ("intent_state", "glow_intensity"),
    ("intent_state", "flicker"),
    ("intent_state", "confidence"),
    ("intent_state", "energy_level"),
    ("intent_state", "uncertainty"),
    ("renderer_controls", "velocity"),
    ("renderer_controls", "cohesion"),
    ("renderer_controls", "trail"),
    ("renderer_controls", "bloom"),
    ("renderer_controls", "noise"),
]

SAFE_SENSOR_STATES = {"LISTENING", "SENSOR_ACTIVE"}
MAX_SHADER_UNIFORMS = 16
MAX_TELEMETRY_EVENTS = 2048
PSYCHO_SAFETY_LIMITS = {
    "flicker": 0.12,
    "glow_intensity": 0.72,
    "velocity": 0.50,
}
WCAG_FLASHES_PER_SECOND_MAX = 3.0
IEEE_1789_LOW_RISK_FREQUENCY_HZ = 90.0
IEEE_1789_LOW_FREQ_FLICKER_CAP = 0.08
PSYCHO_SERIES_WINDOW_SECONDS = 20 * 60
PSYCHO_SERIES_MAX_POINTS = 600
DRIFT_DETECTION_WINDOW_SECONDS = 5 * 60
DRIFT_MIN_STEP_HZ = 0.1
DRIFT_MIN_SLOPE_HZ_PER_SEC = DRIFT_MIN_STEP_HZ / DRIFT_DETECTION_WINDOW_SECONDS


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_now_iso() -> str:
    return _utc_now().replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _deep_merge(base: MutableMapping[str, Any], patch: MutableMapping[str, Any]) -> MutableMapping[str, Any]:
    for key, value in patch.items():
        if isinstance(value, MutableMapping) and isinstance(base.get(key), MutableMapping):
            _deep_merge(base[key], value)  # type: ignore[index]
        else:
            base[key] = copy.deepcopy(value)
    return base


def _clamp(value: Any, minimum: float = 0.0, maximum: float = 1.0, default: float = 0.0) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        numeric = default
    return max(minimum, min(maximum, numeric))


@dataclass
class GovernorContext:
    previous_state: Optional[str] = None
    device_tier: str = "HIGH"  # HIGH | MID | LOW
    low_power_mode: bool = False
    low_sensory_mode: bool = False
    no_flicker_mode: bool = False
    monochrome_mode: bool = False
    allow_sensor_states: bool = False
    granted_capabilities: List[str] = field(default_factory=list)
    human_override: Dict[str, Any] = field(default_factory=dict)
    max_particle_density: Optional[float] = None


@dataclass
class GovernorDecision:
    accepted: bool
    manifestation_gate_open: bool
    blocked_by_policy: bool
    trace_id: str
    effective_contract: Dict[str, Any]
    renderer_snapshot: Dict[str, Any]
    telemetry: List[Dict[str, Any]]
    mutations: List[str]
    policy_violations: List[str]


class RuntimeGovernor:
    """
    Canonical middleware between AI-issued contract payloads and the renderer.

    Pipeline:
        validate -> transition -> profile_map -> clamp -> fallback
        -> psycho_safety_gate -> validate_schema -> policy_block
        -> capability_gate -> telemetry_log

    Notes:
    - This V1 accepts partial payloads and normalizes them into a full contract.
    - It can validate the resulting payload against JSON Schema when jsonschema is available.
    - It is designed so both backend and frontend can mirror the same semantics.
    """

    def __init__(self, schema_path: Optional[str | Path] = None) -> None:
        self.schema_path = Path(schema_path) if schema_path else None
        self.schema: Optional[Dict[str, Any]] = None
        self.last_accepted_contract: Optional[Dict[str, Any]] = None
        self.telemetry_events: List[Dict[str, Any]] = []
        self.psycho_safety_series: List[Dict[str, float]] = []
        if self.schema_path and self.schema_path.exists():
            self.schema = json.loads(self.schema_path.read_text(encoding="utf-8"))

    def process(self, payload: Dict[str, Any], context: Optional[GovernorContext] = None) -> GovernorDecision:
        ctx = context or GovernorContext()
        work = copy.deepcopy(payload or {})
        telemetry: List[Dict[str, Any]] = []
        mutations: List[str] = []
        policy_violations: List[str] = []

        trace_id = str(work.get("trace_id") or uuid.uuid4().hex)
        work["trace_id"] = trace_id

        def log(stage: str, status: str, **extra: Any) -> None:
            event = {
                "ts": _utc_now_iso(),
                "trace_id": trace_id,
                "stage": stage,
                "status": status,
            }
            event.update(extra)
            telemetry.append(event)

        # 1) validate (light envelope validation; full schema validation later)
        try:
            work = self._validate_envelope(work)
            log("validate", "ok")
        except ValueError as exc:
            safe = self._safe_contract(reason=f"envelope_validation_failed:{exc}", trace_id=trace_id)
            log("validate", "blocked", detail=str(exc))
            return self._finalize_decision(
                accepted=False,
                manifestation_gate_open=False,
                blocked_by_policy=True,
                effective_contract=safe,
                telemetry=telemetry,
                mutations=mutations,
                policy_violations=[str(exc)],
            )

        # 2) transition
        transition_note = self._apply_transition_rules(work, ctx)
        if transition_note:
            mutations.append(transition_note)
            log("transition", "mutated", detail=transition_note)
        else:
            log("transition", "ok")

        # 3) profile_map
        mapped_note = self._apply_profile_map(work)
        if mapped_note:
            mutations.extend(mapped_note)
            log("profile_map", "mutated", count=len(mapped_note))
        else:
            log("profile_map", "ok")

        # 4) clamp
        clamp_note = self._apply_clamps(work, ctx)
        if clamp_note:
            mutations.extend(clamp_note)
            log("clamp", "mutated", count=len(clamp_note))
        else:
            log("clamp", "ok")

        # 5) fallback
        fallback_note = self._apply_fallbacks(work)
        if fallback_note:
            mutations.extend(fallback_note)
            log("fallback", "mutated", count=len(fallback_note))
        else:
            log("fallback", "ok")

        # 5.5) psycho_safety_gate
        psycho_note = self._apply_psycho_safety_gate(work, ctx)
        if psycho_note:
            mutations.extend(psycho_note)
            log("psycho_safety_gate", "mutated", count=len(psycho_note))
        else:
            log("psycho_safety_gate", "ok")

        # Full schema validation after normalization
        schema_errors = self._validate_against_schema(work)
        if schema_errors:
            mutations.append("schema_validation_failed_after_normalization; replaced_with_safe_error_contract")
            work = self._safe_contract(reason="schema_validation_failed", trace_id=trace_id)
            policy_violations.extend(schema_errors)
            log("validate_schema", "failed", errors=schema_errors)
        else:
            log("validate_schema", "ok")

        # 6) policy_block
        blocked, policy_note = self._apply_policy_rules(work, ctx)
        if policy_note:
            policy_violations.extend(policy_note)
            log("policy_block", "blocked" if blocked else "mutated", count=len(policy_note))
        else:
            log("policy_block", "ok")

        # 7) capability_gate
        capability_note = self._apply_capability_gates(work, ctx)
        if capability_note:
            mutations.extend(capability_note)
            log("capability_gate", "mutated", count=len(capability_note))
        else:
            log("capability_gate", "ok")

        # 8) telemetry_log
        accepted = not blocked
        manifestation_gate_open = accepted
        if blocked:
            safe = self._safe_contract(reason="policy_blocked", trace_id=trace_id)
            safe["intent_state"]["transition_reason"] = "; ".join(policy_violations)[:256] or "policy_blocked"
            work = safe
            manifestation_gate_open = False

        log(
            "telemetry_log",
            "accepted" if accepted else "blocked",
            accepted=accepted,
            manifestation_gate_open=manifestation_gate_open,
            state=work.get("intent_state", {}).get("state"),
        )

        decision = self._finalize_decision(
            accepted=accepted,
            manifestation_gate_open=manifestation_gate_open,
            blocked_by_policy=blocked,
            effective_contract=work,
            telemetry=telemetry,
            mutations=mutations,
            policy_violations=policy_violations,
        )

        if decision.accepted:
            self.last_accepted_contract = copy.deepcopy(decision.effective_contract)
        self._store_telemetry(decision.telemetry)
        return decision

    def _validate_envelope(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(payload, dict):
            raise ValueError("payload must be an object")
        payload.setdefault("contract_name", "AI Particle Control Contract V1")
        payload.setdefault("contract_version", "1.0.0")
        payload.setdefault("emitted_at", _utc_now_iso())
        payload.setdefault("intent_state", {})
        payload.setdefault("renderer_controls", {})

        if not isinstance(payload["intent_state"], dict):
            raise ValueError("intent_state must be an object")
        if not isinstance(payload["renderer_controls"], dict):
            raise ValueError("renderer_controls must be an object")
        return payload

    def _apply_transition_rules(self, payload: Dict[str, Any], ctx: GovernorContext) -> Optional[str]:
        intent = payload["intent_state"]
        next_state = str(intent.get("state") or ctx.previous_state or "IDLE")
        previous_state = ctx.previous_state or self._last_state() or "IDLE"
        if next_state == previous_state:
            intent["state"] = next_state
            return None
        allowed = ALLOWED_TRANSITIONS.get(previous_state, set())
        if next_state not in STATE_PROFILES:
            intent["state"] = previous_state
            intent["transition_reason"] = f"invalid_state_fallback_from_{next_state}"
            return f"invalid state '{next_state}' -> '{previous_state}'"
        if allowed and next_state not in allowed:
            intent["state"] = previous_state
            intent["transition_reason"] = f"invalid_transition_{previous_state}_to_{next_state}"
            return f"invalid transition '{previous_state}' -> '{next_state}', kept previous state"
        intent["state"] = next_state
        return None

    def _apply_profile_map(self, payload: Dict[str, Any]) -> List[str]:
        notes: List[str] = []
        state = payload["intent_state"].get("state") or "IDLE"
        profile = copy.deepcopy(STATE_PROFILES.get(state, STATE_PROFILES["IDLE"]))
        for section in ("intent_state", "renderer_controls"):
            target = payload[section]
            defaults = profile[section]
            for key, value in defaults.items():
                if key not in target or target[key] is None:
                    target[key] = value
                    notes.append(f"{section}.{key} <- profile[{state}]")
        return notes

    def _apply_clamps(self, payload: Dict[str, Any], ctx: GovernorContext) -> List[str]:
        notes: List[str] = []
        device_tier = str(ctx.device_tier or "HIGH").upper()
        caps = DEVICE_CAPS.get(device_tier, DEVICE_CAPS["HIGH"])

        for section, key in SCALAR_PATHS:
            container = payload[section]
            original = container.get(key)
            clamped = _clamp(original, 0.0, 1.0, container.get(key, 0.0) or 0.0)
            if section == "intent_state" and key in caps:
                clamped = min(clamped, caps[key])
            elif section == "renderer_controls" and key in caps:
                clamped = min(clamped, caps[key])
            if key == "flicker":
                clamped = min(clamped, 0.20)
            if container.get(key) != clamped:
                notes.append(f"{section}.{key}: {original!r} -> {clamped}")
            container[key] = clamped

        if ctx.max_particle_density is not None:
            original = payload["intent_state"]["particle_density"]
            clamped = min(payload["intent_state"]["particle_density"], _clamp(ctx.max_particle_density))
            if original != clamped:
                notes.append(f"intent_state.particle_density capped by context: {original} -> {clamped}")
            payload["intent_state"]["particle_density"] = clamped

        attractor = payload["renderer_controls"].setdefault("attractor", {"x": 0.5, "y": 0.5})
        for axis in ("x", "y"):
            original = attractor.get(axis)
            attractor[axis] = _clamp(attractor.get(axis), 0.0, 1.0, 0.5)
            if original != attractor[axis]:
                notes.append(f"renderer_controls.attractor.{axis}: {original!r} -> {attractor[axis]}")

        ev = payload["intent_state"].get("emotional_valence", 0.0)
        clamped_ev = _clamp(ev, -1.0, 1.0, 0.0)
        if ev != clamped_ev:
            notes.append(f"intent_state.emotional_valence: {ev!r} -> {clamped_ev}")
        payload["intent_state"]["emotional_valence"] = clamped_ev

        return notes

    def _apply_fallbacks(self, payload: Dict[str, Any]) -> List[str]:
        notes: List[str] = []
        payload.setdefault("contract_name", "AI Particle Control Contract V1")
        payload.setdefault("contract_version", "1.0.0")
        payload.setdefault("emitted_at", _utc_now_iso())
        payload.setdefault("trace_id", uuid.uuid4().hex)

        intent = payload["intent_state"]
        intent.setdefault("state", "IDLE")
        intent.setdefault("state_entered_at", payload.get("emitted_at", _utc_now_iso()))
        intent.setdefault("state_duration_ms", 0)
        intent.setdefault("transition_reason", "governor_fallback")
        intent.setdefault("semantic_concepts", [])

        renderer = payload["renderer_controls"]
        renderer.setdefault("runtime_profile", "DETERMINISTIC")
        renderer.setdefault("shader_uniforms", {})
        renderer.setdefault("easing", "SMOOTH")
        renderer.setdefault("flow_direction", "STABLE")

        if not isinstance(intent.get("semantic_concepts"), list):
            intent["semantic_concepts"] = []
            notes.append("intent_state.semantic_concepts reset to []")

        if not isinstance(renderer.get("shader_uniforms"), dict):
            renderer["shader_uniforms"] = {}
            notes.append("renderer_controls.shader_uniforms reset to {}")

        # normalize duration
        original_duration = intent.get("state_duration_ms", 0)
        try:
            normalized_duration = int(original_duration)
        except (TypeError, ValueError):
            normalized_duration = 0
        normalized_duration = max(0, min(86_400_000, normalized_duration))
        if original_duration != normalized_duration:
            notes.append(f"intent_state.state_duration_ms: {original_duration!r} -> {normalized_duration}")
        intent["state_duration_ms"] = normalized_duration

        return notes

    def _apply_psycho_safety_gate(self, payload: Dict[str, Any], ctx: GovernorContext) -> List[str]:
        _ = ctx
        notes: List[str] = []
        intent = payload["intent_state"]
        renderer = payload["renderer_controls"]

        if intent.get("flicker", 0.0) > PSYCHO_SAFETY_LIMITS["flicker"]:
            original = intent.get("flicker", 0.0)
            intent["flicker"] = PSYCHO_SAFETY_LIMITS["flicker"]
            notes.append(f"psycho_safety_gate intent_state.flicker: {original} -> {intent['flicker']}")

        if intent.get("glow_intensity", 0.0) > PSYCHO_SAFETY_LIMITS["glow_intensity"]:
            original = intent.get("glow_intensity", 0.0)
            intent["glow_intensity"] = PSYCHO_SAFETY_LIMITS["glow_intensity"]
            notes.append(f"psycho_safety_gate intent_state.glow_intensity: {original} -> {intent['glow_intensity']}")

        if renderer.get("velocity", 0.0) > PSYCHO_SAFETY_LIMITS["velocity"]:
            original = renderer.get("velocity", 0.0)
            renderer["velocity"] = PSYCHO_SAFETY_LIMITS["velocity"]
            notes.append(f"psycho_safety_gate renderer_controls.velocity: {original} -> {renderer['velocity']}")

        cadence_hz = self._extract_cadence_hz(payload)
        original_cadence_hz = cadence_hz
        if cadence_hz > WCAG_FLASHES_PER_SECOND_MAX:
            notes.append(
                f"psycho_safety_gate cadence_hz: {cadence_hz} -> {WCAG_FLASHES_PER_SECOND_MAX} (WCAG <=3 flashes/sec)"
            )
            cadence_hz = WCAG_FLASHES_PER_SECOND_MAX

        if WCAG_FLASHES_PER_SECOND_MAX < original_cadence_hz < IEEE_1789_LOW_RISK_FREQUENCY_HZ and intent.get("flicker", 0.0) > IEEE_1789_LOW_FREQ_FLICKER_CAP:
            original = intent.get("flicker", 0.0)
            intent["flicker"] = IEEE_1789_LOW_FREQ_FLICKER_CAP
            notes.append(
                "psycho_safety_gate intent_state.flicker: "
                f"{original} -> {intent['flicker']} (IEEE 1789 low-frequency mitigation)"
            )

        sample = self._record_psycho_safety_sample(payload, cadence_hz)
        if self._detect_gradual_drift(sample["ts"]):
            original_velocity = renderer.get("velocity", 0.0)
            renderer["velocity"] = min(float(renderer.get("velocity", 0.0) or 0.0), 0.18)
            if original_velocity != renderer["velocity"]:
                notes.append(
                    "psycho_safety_gate renderer_controls.velocity: "
                    f"{original_velocity} -> {renderer['velocity']} (gradual drift containment)"
                )

            original_luminance = intent.get("glow_intensity", 0.0)
            intent["glow_intensity"] = min(float(intent.get("glow_intensity", 0.0) or 0.0), 0.35)
            if original_luminance != intent["glow_intensity"]:
                notes.append(
                    "psycho_safety_gate intent_state.glow_intensity: "
                    f"{original_luminance} -> {intent['glow_intensity']} (gradual drift containment)"
                )

            notes.append("psycho_safety_gate gradual frequency drift detected and contained")

        renderer.setdefault("shader_uniforms", {})
        if isinstance(renderer["shader_uniforms"], dict):
            renderer["shader_uniforms"]["cadence_hz"] = cadence_hz

        return notes

    def _extract_cadence_hz(self, payload: Dict[str, Any]) -> float:
        intent = payload.get("intent_state", {})
        renderer = payload.get("renderer_controls", {})
        uniforms = renderer.get("shader_uniforms", {})
        if isinstance(uniforms, dict) and isinstance(uniforms.get("cadence_hz"), (int, float)):
            return max(0.0, float(uniforms["cadence_hz"]))
        flicker = float(intent.get("flicker", 0.0) or 0.0)
        return max(0.0, flicker * 25.0)

    def _record_psycho_safety_sample(self, payload: Dict[str, Any], cadence_hz: float) -> Dict[str, float]:
        intent = payload.get("intent_state", {})
        ts = self._payload_ts_seconds(payload)
        sample = {
            "ts": ts,
            "cadence_hz": max(0.0, cadence_hz),
            "flicker_proxy": max(0.0, float(intent.get("flicker", 0.0) or 0.0)),
            "luminance_proxy": max(0.0, float(intent.get("glow_intensity", 0.0) or 0.0)),
        }
        self.psycho_safety_series.append(sample)
        if len(self.psycho_safety_series) > PSYCHO_SERIES_MAX_POINTS:
            self.psycho_safety_series = self.psycho_safety_series[-PSYCHO_SERIES_MAX_POINTS:]
        cutoff = ts - PSYCHO_SERIES_WINDOW_SECONDS
        self.psycho_safety_series = [point for point in self.psycho_safety_series if point["ts"] >= cutoff]
        return sample

    def _detect_gradual_drift(self, now_ts: float) -> bool:
        window_start = now_ts - DRIFT_DETECTION_WINDOW_SECONDS
        window = [point for point in self.psycho_safety_series if point["ts"] >= window_start]
        if len(window) < 3:
            return False
        start = window[0]
        end = window[-1]
        elapsed = end["ts"] - start["ts"]
        if elapsed <= 0:
            return False
        delta = end["cadence_hz"] - start["cadence_hz"]
        slope = delta / elapsed
        monotonic = all(curr["cadence_hz"] >= prev["cadence_hz"] for prev, curr in zip(window, window[1:]))
        return monotonic and delta >= DRIFT_MIN_STEP_HZ and slope >= DRIFT_MIN_SLOPE_HZ_PER_SEC

    def _payload_ts_seconds(self, payload: Dict[str, Any]) -> float:
        emitted_at = payload.get("emitted_at")
        if isinstance(emitted_at, str):
            try:
                return datetime.fromisoformat(emitted_at.replace("Z", "+00:00")).timestamp()
            except ValueError:
                pass
        return _utc_now().timestamp()

    def _validate_against_schema(self, payload: Dict[str, Any]) -> List[str]:
        errors: List[str] = []
        if self.schema is None:
            return errors
        if jsonschema is None:
            return errors
        validator = jsonschema.Draft202012Validator(self.schema)
        for error in validator.iter_errors(payload):
            dotted = ".".join(str(x) for x in error.absolute_path)
            if dotted:
                errors.append(f"{dotted}: {error.message}")
            else:
                errors.append(error.message)
        return errors

    def _apply_policy_rules(self, payload: Dict[str, Any], ctx: GovernorContext) -> Tuple[bool, List[str]]:
        violations: List[str] = []
        intent = payload["intent_state"]
        renderer = payload["renderer_controls"]
        state = intent["state"]
        palette = intent.get("palette", {})

        reserved_palette = RESERVED_PALETTES.get(state)
        if reserved_palette and palette.get("mode") != reserved_palette:
            palette["mode"] = reserved_palette
            violations.append(f"reserved palette enforced for state {state}")

        if state == "ERROR" and intent.get("shape") != "CRACKED_SHELL":
            intent["shape"] = "CRACKED_SHELL"
            violations.append("ERROR state forced to CRACKED_SHELL")
        if state == "NIRODHA":
            if intent.get("glow_intensity", 0.0) > 0.20:
                intent["glow_intensity"] = 0.20
                violations.append("NIRODHA glow_intensity capped to 0.20")
            if renderer.get("velocity", 0.0) > 0.10:
                renderer["velocity"] = 0.10
                violations.append("NIRODHA velocity capped to 0.10")
        if state == "WARNING" and intent.get("palette", {}).get("mode") == "CUSTOM":
            intent["palette"]["mode"] = "WARNING_OVERLOAD"
            violations.append("WARNING state cannot use CUSTOM palette")

        shader_uniforms = renderer.setdefault("shader_uniforms", {})
        if len(shader_uniforms) > MAX_SHADER_UNIFORMS:
            for extra_key in list(shader_uniforms.keys())[MAX_SHADER_UNIFORMS:]:
                shader_uniforms.pop(extra_key, None)
            violations.append(f"shader_uniforms truncated to {MAX_SHADER_UNIFORMS} keys")

        # Reject sensor states when not allowed.
        if state in SAFE_SENSOR_STATES and state == "SENSOR_ACTIVE" and not ctx.allow_sensor_states:
            violations.append("sensor-active state requires allow_sensor_states=True")
            return True, violations

        # Motion/flicker hard safety envelope.
        if intent.get("flicker", 0.0) > 0.20:
            intent["flicker"] = 0.20
            violations.append("flicker capped to hard safety envelope")

        return False, violations

    def _apply_capability_gates(self, payload: Dict[str, Any], ctx: GovernorContext) -> List[str]:
        notes: List[str] = []
        intent = payload["intent_state"]
        renderer = payload["renderer_controls"]

        forced_state = ctx.human_override.get("forced_state")
        if forced_state and forced_state in STATE_PROFILES and forced_state != intent["state"]:
            intent["state"] = forced_state
            notes.append(f"human_override.forced_state applied: {forced_state}")
            notes.extend(self._apply_profile_map(payload))

        if ctx.low_power_mode:
            for key, cap in (("particle_density", 0.22), ("glow_intensity", 0.20)):
                original = intent[key]
                intent[key] = min(intent[key], cap)
                if original != intent[key]:
                    notes.append(f"low_power_mode capped intent_state.{key}: {original} -> {intent[key]}")
            for key, cap in (("trail", 0.10), ("bloom", 0.08), ("noise", 0.05), ("velocity", 0.12)):
                original = renderer[key]
                renderer[key] = min(renderer[key], cap)
                if original != renderer[key]:
                    notes.append(f"low_power_mode capped renderer_controls.{key}: {original} -> {renderer[key]}")
            renderer["runtime_profile"] = "LOW_POWER"
            notes.append("runtime_profile -> LOW_POWER")

        if ctx.low_sensory_mode:
            for key, cap in (("flicker", 0.0), ("turbulence", 0.12), ("glow_intensity", 0.35)):
                original = intent[key]
                intent[key] = min(intent[key], cap)
                if original != intent[key]:
                    notes.append(f"low_sensory_mode capped intent_state.{key}: {original} -> {intent[key]}")
            for key, cap in (("noise", 0.08), ("velocity", 0.18), ("bloom", 0.18)):
                original = renderer[key]
                renderer[key] = min(renderer[key], cap)
                if original != renderer[key]:
                    notes.append(f"low_sensory_mode capped renderer_controls.{key}: {original} -> {renderer[key]}")

        if ctx.no_flicker_mode:
            if intent.get("flicker", 0.0) != 0.0:
                notes.append(f"no_flicker_mode forced flicker {intent['flicker']} -> 0.0")
            intent["flicker"] = 0.0

        if ctx.monochrome_mode:
            palette = intent.setdefault("palette", {})
            original = copy.deepcopy(palette)
            palette["primary"] = "#FFFFFF"
            palette["secondary"] = "#BDBDBD"
            palette["accent"] = "#7D7D7D"
            notes.append(f"monochrome_mode rewrote palette from {original} to {palette}")

        if intent["state"] == "SENSOR_ACTIVE" and not set(ctx.granted_capabilities).intersection({"microphone", "camera", "motion"}):
            intent["state"] = "IDLE"
            notes.append("capability gate downgraded SENSOR_ACTIVE -> IDLE due to missing granted_capabilities")
            notes.extend(self._apply_profile_map(payload))

        return notes

    def _safe_contract(self, reason: str, trace_id: Optional[str] = None) -> Dict[str, Any]:
        base = {
            "contract_name": "AI Particle Control Contract V1",
            "contract_version": "1.0.0",
            "emitted_at": _utc_now_iso(),
            "trace_id": trace_id or uuid.uuid4().hex,
            "intent_state": {
                "state": "ERROR",
                "state_entered_at": _utc_now_iso(),
                "state_duration_ms": 0,
                "transition_reason": reason[:256],
                "semantic_concepts": [],
            },
            "renderer_controls": {},
        }
        _deep_merge(base["intent_state"], copy.deepcopy(STATE_PROFILES["ERROR"]["intent_state"]))
        _deep_merge(base["renderer_controls"], copy.deepcopy(STATE_PROFILES["ERROR"]["renderer_controls"]))
        return base

    def _last_state(self) -> Optional[str]:
        if self.last_accepted_contract:
            return self.last_accepted_contract.get("intent_state", {}).get("state")
        return None

    def _renderer_snapshot(self, contract: Dict[str, Any]) -> Dict[str, Any]:
        intent = contract.get("intent_state", {})
        renderer = contract.get("renderer_controls", {})
        return {
            "trace_id": contract.get("trace_id"),
            "state": intent.get("state"),
            "shape": intent.get("shape"),
            "palette": intent.get("palette"),
            "particle_density": intent.get("particle_density"),
            "turbulence": intent.get("turbulence"),
            "glow_intensity": intent.get("glow_intensity"),
            "flicker": intent.get("flicker"),
            "flow_direction": renderer.get("flow_direction"),
            "velocity": renderer.get("velocity"),
            "cohesion": renderer.get("cohesion"),
            "trail": renderer.get("trail"),
            "bloom": renderer.get("bloom"),
            "noise": renderer.get("noise"),
            "attractor": renderer.get("attractor"),
            "runtime_profile": renderer.get("runtime_profile"),
            "easing": renderer.get("easing"),
            "shader_uniforms": renderer.get("shader_uniforms"),
        }

    def _store_telemetry(self, events: List[Dict[str, Any]]) -> None:
        self.telemetry_events.extend(copy.deepcopy(events))
        if len(self.telemetry_events) > MAX_TELEMETRY_EVENTS:
            self.telemetry_events = self.telemetry_events[-MAX_TELEMETRY_EVENTS:]

    def _finalize_decision(
        self,
        *,
        accepted: bool,
        manifestation_gate_open: bool,
        blocked_by_policy: bool,
        effective_contract: Dict[str, Any],
        telemetry: List[Dict[str, Any]],
        mutations: List[str],
        policy_violations: List[str],
    ) -> GovernorDecision:
        renderer_snapshot = self._renderer_snapshot(effective_contract)
        return GovernorDecision(
            accepted=accepted,
            manifestation_gate_open=manifestation_gate_open,
            blocked_by_policy=blocked_by_policy,
            trace_id=str(effective_contract.get("trace_id")),
            effective_contract=effective_contract,
            renderer_snapshot=renderer_snapshot,
            telemetry=telemetry,
            mutations=mutations,
            policy_violations=policy_violations,
        )


if __name__ == "__main__":
    schema_path = Path(__file__).with_name("particle-control.schema.json")
    governor = RuntimeGovernor(schema_path=schema_path if schema_path.exists() else None)

    example_payload = {
        "contract_name": "AI Particle Control Contract V1",
        "contract_version": "1.0.0",
        "intent_state": {
            "state": "THINKING",
            "shape": "SPIRAL_VORTEX",
            "particle_density": 0.91,
            "turbulence": 0.25,
            "glow_intensity": 0.80,
            "flicker": 0.05,
            "palette": {
                "mode": "DEEP_REASONING",
                "primary": "#6A0DAD",
                "secondary": "#D8C7FF",
                "accent": "#55C7FF",
            },
            "state_entered_at": _utc_now_iso(),
            "state_duration_ms": 1250,
            "transition_reason": "manual_demo",
        },
        "renderer_controls": {
            "runtime_profile": "DETERMINISTIC",
            "shader_uniforms": {"swirl_bias": 0.18},
        },
    }

    decision = governor.process(
        example_payload,
        GovernorContext(device_tier="MID", no_flicker_mode=False, low_power_mode=False),
    )
    print(json.dumps({
        "accepted": decision.accepted,
        "manifestation_gate_open": decision.manifestation_gate_open,
        "renderer_snapshot": decision.renderer_snapshot,
        "mutations": decision.mutations,
        "policy_violations": decision.policy_violations,
    }, indent=2, ensure_ascii=False))
