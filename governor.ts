import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  VISUAL_STATE_ALIASES,
  type EasingType,
  type FlowDirection,
  type IncomingVisualState,
  type PaletteMode,
  type Point2D,
  type ReasoningStyle,
  type RelationalIntent,
  type RuntimeProfile,
  type Shape,
  type VisualState,
} from "./visual_state_profiles";

export type GovernorState = IncomingVisualState;
export type DeviceTier = "HIGH" | "MID" | "LOW";
export type BlendMode = "soft" | "firm" | "hard";
export type JsonScalar = string | number | boolean;

export interface IntentPalette {
  mode: PaletteMode | string;
  primary: string;
  secondary: string;
  accent?: string;
}

export interface IntentState {
  state?: GovernorState | string;
  shape?: Shape | string;
  particle_density?: number;
  turbulence?: number;
  glow_intensity?: number;
  flicker?: number;
  confidence?: number;
  energy_level?: number;
  uncertainty?: number;
  emotional_valence?: number;
  reasoning_style?: ReasoningStyle | string;
  relational_intent?: RelationalIntent | string;
  semantic_concepts?: string[];
  palette?: IntentPalette;
  state_entered_at?: string;
  state_duration_ms?: number;
  transition_reason?: string;
}

export interface RendererControls {
  flow_direction?: FlowDirection | string;
  velocity?: number;
  cohesion?: number;
  trail?: number;
  bloom?: number;
  noise?: number;
  attractor?: Point2D;
  runtime_profile?: RuntimeProfile | string;
  easing?: EasingType | string;
  shader_uniforms?: Record<string, JsonScalar>;
}

export interface ParticleControlContract {
  contract_name?: string;
  contract_version?: string;
  emitted_at?: string;
  trace_id?: string;
  intent_state?: IntentState;
  renderer_controls?: RendererControls;
}

export interface GovernorContext {
  previous_state?: GovernorState | null;
  device_tier?: DeviceTier;
  low_power_mode?: boolean;
  low_sensory_mode?: boolean;
  no_flicker_mode?: boolean;
  monochrome_mode?: boolean;
  allow_sensor_states?: boolean;
  granted_capabilities?: string[];
  human_override?: {
    forced_state?: GovernorState;
    [key: string]: unknown;
  };
  max_particle_density?: number | null;
}

export interface TelemetryEvent {
  ts: string;
  trace_id: string;
  stage: string;
  status: string;
  [key: string]: unknown;
}

export interface GovernorDecision {
  accepted: boolean;
  manifestation_gate_open: boolean;
  blocked_by_policy: boolean;
  trace_id: string;
  effective_contract: Required<ParticleControlContract>;
  renderer_snapshot: Record<string, unknown>;
  telemetry: TelemetryEvent[];
  mutations: string[];
  policy_violations: string[];
}

export interface RuntimeGovernorOptions {
  schemaValidator?: (payload: Required<ParticleControlContract>) => string[];
  now?: () => Date;
  idFactory?: () => string;
}

type ScalarPath = readonly ["intent_state" | "renderer_controls", string];

type CompatibilityStateProfile = {
  intent_state: Required<
    Pick<
      IntentState,
      | "shape"
      | "particle_density"
      | "turbulence"
      | "glow_intensity"
      | "flicker"
      | "confidence"
      | "energy_level"
      | "uncertainty"
      | "emotional_valence"
      | "reasoning_style"
      | "relational_intent"
      | "palette"
    >
  >;
  renderer_controls: Required<
    Pick<
      RendererControls,
      | "flow_direction"
      | "velocity"
      | "cohesion"
      | "trail"
      | "bloom"
      | "noise"
      | "attractor"
      | "runtime_profile"
      | "easing"
      | "shader_uniforms"
    >
  >;
};

const STATE_PROFILES: Record<GovernorState, CompatibilityStateProfile> = {
  IDLE: {
    intent_state: {
      shape: "NEBULA_CLOUD",
      particle_density: 0.18,
      turbulence: 0.08,
      glow_intensity: 0.22,
      flicker: 0.0,
      confidence: 0.55,
      energy_level: 0.15,
      uncertainty: 0.1,
      emotional_valence: 0.0,
      reasoning_style: "REFLECTIVE",
      relational_intent: "NEUTRAL",
      palette: {
        mode: "CALM_IDLE",
        primary: "#D8F0FF",
        secondary: "#5AB8FF",
        accent: "#FFFFFF",
      },
    },
    renderer_controls: {
      flow_direction: "STABLE",
      velocity: 0.1,
      cohesion: 0.35,
      trail: 0.12,
      bloom: 0.15,
      noise: 0.05,
      attractor: { x: 0.5, y: 0.5 },
      runtime_profile: "DETERMINISTIC",
      easing: "SMOOTH",
      shader_uniforms: {},
    },
  },
  LISTENING: {
    intent_state: {
      shape: "SPHERE",
      particle_density: 0.28,
      turbulence: 0.12,
      glow_intensity: 0.38,
      flicker: 0.01,
      confidence: 0.62,
      energy_level: 0.3,
      uncertainty: 0.18,
      emotional_valence: 0.05,
      reasoning_style: "EMPATHIC",
      relational_intent: "GUIDING",
      palette: {
        mode: "ACTIVE_LISTENING",
        primary: "#5EEBFF",
        secondary: "#DBFDFF",
        accent: "#9BFFF8",
      },
    },
    renderer_controls: {
      flow_direction: "INWARD",
      velocity: 0.18,
      cohesion: 0.56,
      trail: 0.18,
      bloom: 0.24,
      noise: 0.08,
      attractor: { x: 0.5, y: 0.55 },
      runtime_profile: "DETERMINISTIC",
      easing: "SMOOTH",
      shader_uniforms: {},
    },
  },
  THINKING: {
    intent_state: {
      shape: "SPIRAL_VORTEX",
      particle_density: 0.78,
      turbulence: 0.24,
      glow_intensity: 0.76,
      flicker: 0.04,
      confidence: 0.72,
      energy_level: 0.68,
      uncertainty: 0.22,
      emotional_valence: 0.08,
      reasoning_style: "ANALYTICAL",
      relational_intent: "GUIDING",
      palette: {
        mode: "DEEP_REASONING",
        primary: "#6A0DAD",
        secondary: "#D8C7FF",
        accent: "#55C7FF",
      },
    },
    renderer_controls: {
      flow_direction: "INWARD",
      velocity: 0.42,
      cohesion: 0.72,
      trail: 0.34,
      bloom: 0.32,
      noise: 0.12,
      attractor: { x: 0.5, y: 0.42 },
      runtime_profile: "DETERMINISTIC",
      easing: "VISCOUS",
      shader_uniforms: { swirl_bias: 0.16 },
    },
  },
  GENERATING: {
    intent_state: {
      shape: "STREAM",
      particle_density: 0.82,
      turbulence: 0.34,
      glow_intensity: 0.82,
      flicker: 0.05,
      confidence: 0.7,
      energy_level: 0.78,
      uncertainty: 0.18,
      emotional_valence: 0.2,
      reasoning_style: "CREATIVE",
      relational_intent: "COMPANIONING",
      palette: {
        mode: "CO_CREATION",
        primary: "#FF7BE5",
        secondary: "#FFE4FA",
        accent: "#9B7BFF",
      },
    },
    renderer_controls: {
      flow_direction: "OUTWARD",
      velocity: 0.56,
      cohesion: 0.64,
      trail: 0.45,
      bloom: 0.42,
      noise: 0.18,
      attractor: { x: 0.52, y: 0.45 },
      runtime_profile: "ADAPTIVE",
      easing: "ELASTIC",
      shader_uniforms: { burst_bias: 0.1 },
    },
  },
  RESPONDING: {
    intent_state: {
      shape: "SHELL",
      particle_density: 0.62,
      turbulence: 0.18,
      glow_intensity: 0.66,
      flicker: 0.02,
      confidence: 0.78,
      energy_level: 0.52,
      uncertainty: 0.12,
      emotional_valence: 0.12,
      reasoning_style: "PROCEDURAL",
      relational_intent: "GUIDING",
      palette: {
        mode: "CO_CREATION",
        primary: "#B087FF",
        secondary: "#F4E9FF",
        accent: "#55C7FF",
      },
    },
    renderer_controls: {
      flow_direction: "OUTWARD",
      velocity: 0.34,
      cohesion: 0.6,
      trail: 0.28,
      bloom: 0.24,
      noise: 0.08,
      attractor: { x: 0.5, y: 0.48 },
      runtime_profile: "DETERMINISTIC",
      easing: "SMOOTH",
      shader_uniforms: {},
    },
  },
  WARNING: {
    intent_state: {
      shape: "STREAM",
      particle_density: 0.5,
      turbulence: 0.38,
      glow_intensity: 0.8,
      flicker: 0.08,
      confidence: 0.55,
      energy_level: 0.68,
      uncertainty: 0.34,
      emotional_valence: -0.1,
      reasoning_style: "PROCEDURAL",
      relational_intent: "ALERTING",
      palette: {
        mode: "WARNING_OVERLOAD",
        primary: "#FFB347",
        secondary: "#FFF0D1",
        accent: "#FF7A00",
      },
    },
    renderer_controls: {
      flow_direction: "ORBITAL",
      velocity: 0.4,
      cohesion: 0.46,
      trail: 0.26,
      bloom: 0.36,
      noise: 0.2,
      attractor: { x: 0.5, y: 0.5 },
      runtime_profile: "ADAPTIVE",
      easing: "LINEAR",
      shader_uniforms: {},
    },
  },
  ERROR: {
    intent_state: {
      shape: "CRACKED_SHELL",
      particle_density: 0.44,
      turbulence: 0.28,
      glow_intensity: 0.9,
      flicker: 0.0,
      confidence: 0.4,
      energy_level: 0.6,
      uncertainty: 0.6,
      emotional_valence: -0.2,
      reasoning_style: "PROCEDURAL",
      relational_intent: "ALERTING",
      palette: {
        mode: "ERROR_POLICY",
        primary: "#DC143C",
        secondary: "#FFD7DF",
        accent: "#FF5C75",
      },
    },
    renderer_controls: {
      flow_direction: "FREE",
      velocity: 0.26,
      cohesion: 0.28,
      trail: 0.2,
      bloom: 0.3,
      noise: 0.14,
      attractor: { x: 0.5, y: 0.5 },
      runtime_profile: "DETERMINISTIC",
      easing: "LINEAR",
      shader_uniforms: {},
    },
  },
  NIRODHA: {
    intent_state: {
      shape: "NEBULA_CLOUD",
      particle_density: 0.08,
      turbulence: 0.02,
      glow_intensity: 0.08,
      flicker: 0.0,
      confidence: 0.8,
      energy_level: 0.05,
      uncertainty: 0.05,
      emotional_valence: 0.0,
      reasoning_style: "REFLECTIVE",
      relational_intent: "SOOTHING",
      palette: {
        mode: "NIRODHA_DORMANT",
        primary: "#001A4D",
        secondary: "#0D274F",
        accent: "#4C79D8",
      },
    },
    renderer_controls: {
      flow_direction: "STABLE",
      velocity: 0.04,
      cohesion: 0.24,
      trail: 0.05,
      bloom: 0.06,
      noise: 0.0,
      attractor: { x: 0.5, y: 0.5 },
      runtime_profile: "LOW_POWER",
      easing: "SMOOTH",
      shader_uniforms: {},
    },
  },
  SENSOR_ACTIVE: {
    intent_state: {
      shape: "SPHERE",
      particle_density: 0.26,
      turbulence: 0.1,
      glow_intensity: 0.4,
      flicker: 0.0,
      confidence: 0.65,
      energy_level: 0.26,
      uncertainty: 0.12,
      emotional_valence: 0.0,
      reasoning_style: "EXPLORATORY",
      relational_intent: "GUIDING",
      palette: {
        mode: "ACTIVE_LISTENING",
        primary: "#55C7FF",
        secondary: "#E6F8FF",
        accent: "#00FFFF",
      },
    },
    renderer_controls: {
      flow_direction: "INWARD",
      velocity: 0.2,
      cohesion: 0.48,
      trail: 0.18,
      bloom: 0.22,
      noise: 0.06,
      attractor: { x: 0.5, y: 0.5 },
      runtime_profile: "DETERMINISTIC",
      easing: "SMOOTH",
      shader_uniforms: {},
    },
  },
};

export const ALLOWED_TRANSITIONS: Record<GovernorState, ReadonlySet<GovernorState>> = {
  IDLE: new Set<GovernorState>(["LISTENING", "THINKING", "GENERATING", "RESPONDING", "WARNING", "ERROR", "NIRODHA", "SENSOR_ACTIVE"]),
  LISTENING: new Set<GovernorState>(["IDLE", "THINKING", "RESPONDING", "WARNING", "ERROR", "NIRODHA", "SENSOR_ACTIVE"]),
  THINKING: new Set<GovernorState>(["IDLE", "GENERATING", "RESPONDING", "WARNING", "ERROR", "NIRODHA"]),
  GENERATING: new Set<GovernorState>(["IDLE", "RESPONDING", "WARNING", "ERROR", "NIRODHA"]),
  RESPONDING: new Set<GovernorState>(["IDLE", "LISTENING", "THINKING", "WARNING", "ERROR", "NIRODHA"]),
  WARNING: new Set<GovernorState>(["IDLE", "THINKING", "RESPONDING", "ERROR", "NIRODHA"]),
  ERROR: new Set<GovernorState>(["IDLE", "NIRODHA"]),
  NIRODHA: new Set<GovernorState>(["IDLE", "LISTENING", "SENSOR_ACTIVE"]),
  SENSOR_ACTIVE: new Set<GovernorState>(["IDLE", "LISTENING", "THINKING", "WARNING", "ERROR"]),
};

export const DEVICE_CAPS: Record<DeviceTier, Record<string, number>> = {
  HIGH: { particle_density: 1.0, glow_intensity: 1.0, trail: 1.0, bloom: 1.0, noise: 1.0 },
  MID: { particle_density: 0.72, glow_intensity: 0.86, trail: 0.62, bloom: 0.58, noise: 0.56 },
  LOW: { particle_density: 0.36, glow_intensity: 0.66, trail: 0.34, bloom: 0.26, noise: 0.24 },
};

export const RESERVED_PALETTES: Partial<Record<GovernorState, string>> = {
  WARNING: "WARNING_OVERLOAD",
  ERROR: "ERROR_POLICY",
  NIRODHA: "NIRODHA_DORMANT",
};

export const SCALAR_PATHS: readonly ScalarPath[] = [
  ["intent_state", "particle_density"],
  ["intent_state", "turbulence"],
  ["intent_state", "glow_intensity"],
  ["intent_state", "flicker"],
  ["intent_state", "confidence"],
  ["intent_state", "energy_level"],
  ["intent_state", "uncertainty"],
  ["renderer_controls", "velocity"],
  ["renderer_controls", "cohesion"],
  ["renderer_controls", "trail"],
  ["renderer_controls", "bloom"],
  ["renderer_controls", "noise"],
] as const;

export const SAFE_SENSOR_STATES = new Set<GovernorState>(["LISTENING", "SENSOR_ACTIVE"]);
export const MAX_SHADER_UNIFORMS = 16;
export const MAX_TELEMETRY_EVENTS = 2048;
export const PSYCHO_SAFETY_LIMITS = {
  flicker: 0.12,
  glow_intensity: 0.72,
  velocity: 0.5,
} as const;
export const WCAG_FLASHES_PER_SECOND_MAX = 3;
export const IEEE_1789_LOW_RISK_FREQUENCY_HZ = 90;
export const IEEE_1789_LOW_FREQ_FLICKER_CAP = 0.08;
export const PSYCHO_SERIES_WINDOW_SECONDS = 20 * 60;
export const PSYCHO_SERIES_MAX_POINTS = 600;
export const DRIFT_DETECTION_WINDOW_SECONDS = 5 * 60;
export const DRIFT_MIN_STEP_HZ = 0.1;
export const DRIFT_MIN_SLOPE_HZ_PER_SEC = DRIFT_MIN_STEP_HZ / DRIFT_DETECTION_WINDOW_SECONDS;

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepMerge<T extends Record<string, unknown>, U extends Record<string, unknown>>(base: T, patch: U): T & U {
  const output = base as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    const existing = output[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      output[key] = deepMerge(existing, value);
    } else {
      output[key] = deepCopy(value);
    }
  }
  return output as T & U;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(value: unknown, minimum = 0, maximum = 1, fallback = 0): number {
  const numeric = Number(value);
  const safe = Number.isFinite(numeric) ? numeric : fallback;
  return Math.max(minimum, Math.min(maximum, safe));
}

function utcNow(nowFactory?: () => Date): Date {
  return nowFactory ? nowFactory() : new Date();
}

function utcNowIso(nowFactory?: () => Date): string {
  return utcNow(nowFactory).toISOString();
}

function createTraceId(idFactory?: () => string): string {
  if (idFactory) return idFactory();
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 14)}`;
}

function normalizeGovernorState(value?: string | null): GovernorState {
  const upper = String(value ?? "IDLE").toUpperCase() as GovernorState;
  return STATE_PROFILES[upper] ? upper : "IDLE";
}

function toCanonicalVisualState(state?: string | null): VisualState {
  const upper = String(state ?? "IDLE").toUpperCase() as IncomingVisualState;
  return VISUAL_STATE_ALIASES[upper] ?? "IDLE";
}

function defaultContext(input?: GovernorContext): Required<GovernorContext> {
  return {
    previous_state: input?.previous_state ?? null,
    device_tier: (input?.device_tier ?? "HIGH") as DeviceTier,
    low_power_mode: input?.low_power_mode ?? false,
    low_sensory_mode: input?.low_sensory_mode ?? false,
    no_flicker_mode: input?.no_flicker_mode ?? false,
    monochrome_mode: input?.monochrome_mode ?? false,
    allow_sensor_states: input?.allow_sensor_states ?? false,
    granted_capabilities: deepCopy(input?.granted_capabilities ?? []),
    human_override: deepCopy(input?.human_override ?? {}),
    max_particle_density: input?.max_particle_density ?? null,
  };
}

export class RuntimeGovernor {
  private readonly schemaValidator?: RuntimeGovernorOptions["schemaValidator"];
  private readonly nowFactory?: RuntimeGovernorOptions["now"];
  private readonly idFactory?: RuntimeGovernorOptions["idFactory"];

  public lastAcceptedContract: Required<ParticleControlContract> | null = null;
  public telemetryEvents: TelemetryEvent[] = [];
  public psychoSafetySeries: Array<{ ts: number; cadence_hz: number; flicker_proxy: number; luminance_proxy: number }> = [];

  constructor(options: RuntimeGovernorOptions = {}) {
    this.schemaValidator = options.schemaValidator ?? loadRuntimeAbiSchemaValidator();
    this.nowFactory = options.now;
    this.idFactory = options.idFactory;
  }

  process(payload: ParticleControlContract, context?: GovernorContext): GovernorDecision {
    const ctx = defaultContext(context);
    let work = deepCopy(payload ?? {});
    const telemetry: TelemetryEvent[] = [];
    const mutations: string[] = [];
    const policyViolations: string[] = [];

    const traceId = String(work.trace_id ?? createTraceId(this.idFactory));
    work.trace_id = traceId;

    const log = (stage: string, status: string, extra: Record<string, unknown> = {}): void => {
      telemetry.push({
        ts: utcNowIso(this.nowFactory),
        trace_id: traceId,
        stage,
        status,
        ...extra,
      });
    };

    try {
      work = this.validateEnvelope(work);
      log("validate", "ok");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const safe = this.safeContract(`envelope_validation_failed:${detail}`, traceId);
      log("validate", "blocked", { detail });
      return this.finalizeDecision({
        accepted: false,
        manifestation_gate_open: false,
        blocked_by_policy: true,
        effective_contract: safe,
        telemetry,
        mutations,
        policy_violations: [detail],
      });
    }

    const normalizedWork = work as Required<ParticleControlContract>;

    const transitionNote = this.applyTransitionRules(normalizedWork, ctx);
    if (transitionNote) {
      mutations.push(transitionNote);
      log("transition", "mutated", { detail: transitionNote });
    } else {
      log("transition", "ok");
    }

    const profileNotes = this.applyProfileMap(normalizedWork);
    if (profileNotes.length) {
      mutations.push(...profileNotes);
      log("profile_map", "mutated", { count: profileNotes.length });
    } else {
      log("profile_map", "ok");
    }

    const clampNotes = this.applyClamps(normalizedWork, ctx);
    if (clampNotes.length) {
      mutations.push(...clampNotes);
      log("clamp", "mutated", { count: clampNotes.length });
    } else {
      log("clamp", "ok");
    }

    const fallbackNotes = this.applyFallbacks(normalizedWork);
    if (fallbackNotes.length) {
      mutations.push(...fallbackNotes);
      log("fallback", "mutated", { count: fallbackNotes.length });
    } else {
      log("fallback", "ok");
    }

    const psychoNotes = this.applyPsychoSafetyGate(normalizedWork, ctx);
    if (psychoNotes.length) {
      mutations.push(...psychoNotes);
      log("psycho_safety_gate", "mutated", { count: psychoNotes.length });
    } else {
      log("psycho_safety_gate", "ok");
    }

    const schemaErrors = this.validateAgainstSchema(normalizedWork);
    if (schemaErrors.length) {
      mutations.push("schema_validation_failed_after_normalization; replaced_with_safe_error_contract");
      work = this.safeContract("schema_validation_failed", traceId);
      policyViolations.push(...schemaErrors);
      log("validate_schema", "failed", { errors: schemaErrors });
    } else {
      log("validate_schema", "ok");
    }

    const { blocked, notes: policyNotes } = this.applyPolicyRules(work as Required<ParticleControlContract>, ctx);
    if (policyNotes.length) {
      policyViolations.push(...policyNotes);
      log("policy_block", blocked ? "blocked" : "mutated", { count: policyNotes.length });
    } else {
      log("policy_block", "ok");
    }

    const capabilityNotes = this.applyCapabilityGates(work as Required<ParticleControlContract>, ctx);
    if (capabilityNotes.length) {
      mutations.push(...capabilityNotes);
      log("capability_gate", "mutated", { count: capabilityNotes.length });
    } else {
      log("capability_gate", "ok");
    }

    const accepted = !blocked;
    let manifestationGateOpen = accepted;
    if (blocked) {
      const safe = this.safeContract("policy_blocked", traceId);
      safe.intent_state.transition_reason = policyViolations.join("; ").slice(0, 256) || "policy_blocked";
      work = safe;
      manifestationGateOpen = false;
    }

    log("telemetry_log", accepted ? "accepted" : "blocked", {
      accepted,
      manifestation_gate_open: manifestationGateOpen,
      state: work.intent_state?.state,
    });

    const decision = this.finalizeDecision({
      accepted,
      manifestation_gate_open: manifestationGateOpen,
      blocked_by_policy: blocked,
      effective_contract: work as Required<ParticleControlContract>,
      telemetry,
      mutations,
      policy_violations: policyViolations,
    });

    if (decision.accepted) {
      this.lastAcceptedContract = deepCopy(decision.effective_contract);
    }
    this.storeTelemetry(decision.telemetry);
    return decision;
  }

  validateEnvelope(payload: ParticleControlContract): Required<ParticleControlContract> {
    if (!isPlainObject(payload)) {
      throw new Error("payload must be an object");
    }

    payload.contract_name ??= "AI Particle Control Contract V1";
    payload.contract_version ??= "1.0.0";
    payload.emitted_at ??= utcNowIso(this.nowFactory);
    payload.intent_state ??= {};
    payload.renderer_controls ??= {};

    if (!isPlainObject(payload.intent_state)) {
      throw new Error("intent_state must be an object");
    }
    if (!isPlainObject(payload.renderer_controls)) {
      throw new Error("renderer_controls must be an object");
    }

    return payload as Required<ParticleControlContract>;
  }

  applyTransitionRules(payload: Required<ParticleControlContract>, ctx: Required<GovernorContext>): string | null {
    const intent = payload.intent_state;
    const nextState = normalizeGovernorState(String(intent.state ?? ctx.previous_state ?? "IDLE"));
    const previousState = normalizeGovernorState(String(ctx.previous_state ?? this.lastState() ?? "IDLE"));

    if (nextState === previousState) {
      intent.state = nextState;
      return null;
    }

    const rawState = String(intent.state ?? nextState).toUpperCase();
    const allowed = ALLOWED_TRANSITIONS[previousState] ?? new Set<GovernorState>();

    if (!(rawState in STATE_PROFILES)) {
      intent.state = previousState;
      intent.transition_reason = `invalid_state_fallback_from_${rawState}`;
      return `invalid state '${rawState}' -> '${previousState}'`;
    }

    if (allowed.size && !allowed.has(nextState)) {
      intent.state = previousState;
      intent.transition_reason = `invalid_transition_${previousState}_to_${nextState}`;
      return `invalid transition '${previousState}' -> '${nextState}', kept previous state`;
    }

    intent.state = nextState;
    return null;
  }

  applyProfileMap(payload: Required<ParticleControlContract>): string[] {
    const notes: string[] = [];
    const state = normalizeGovernorState(String(payload.intent_state.state ?? "IDLE"));
    const profile = deepCopy(STATE_PROFILES[state]);

    for (const section of ["intent_state", "renderer_controls"] as const) {
      const target = payload[section] as Record<string, unknown>;
      const defaults = profile[section] as Record<string, unknown>;
      for (const [key, value] of Object.entries(defaults)) {
        if (!(key in target) || target[key] == null) {
          target[key] = deepCopy(value);
          notes.push(`${section}.${key} <- profile[${state}]`);
        }
      }
    }

    return notes;
  }

  applyClamps(payload: Required<ParticleControlContract>, ctx: Required<GovernorContext>): string[] {
    const notes: string[] = [];
    const deviceTier = (ctx.device_tier ?? "HIGH").toUpperCase() as DeviceTier;
    const caps = DEVICE_CAPS[deviceTier] ?? DEVICE_CAPS.HIGH;

    for (const [section, key] of SCALAR_PATHS) {
      const container = payload[section] as Record<string, unknown>;
      const original = container[key];
      let clamped = clamp(original, 0, 1, Number(container[key] ?? 0) || 0);
      if (key in caps) clamped = Math.min(clamped, caps[key]);
      if (key === "flicker") clamped = Math.min(clamped, 0.2);
      if (container[key] !== clamped) notes.push(`${section}.${key}: ${JSON.stringify(original)} -> ${clamped}`);
      container[key] = clamped;
    }

    if (ctx.max_particle_density != null) {
      const original = Number(payload.intent_state.particle_density ?? 0);
      const limited = Math.min(original, clamp(ctx.max_particle_density));
      if (original !== limited) {
        notes.push(`intent_state.particle_density capped by context: ${original} -> ${limited}`);
      }
      payload.intent_state.particle_density = limited;
    }

    const attractor = (payload.renderer_controls.attractor ??= { x: 0.5, y: 0.5 });
    for (const axis of ["x", "y"] as const) {
      const original = attractor[axis];
      const bounded = clamp(attractor[axis], 0, 1, 0.5);
      if (original !== bounded) notes.push(`renderer_controls.attractor.${axis}: ${JSON.stringify(original)} -> ${bounded}`);
      attractor[axis] = bounded;
    }

    const originalValence = payload.intent_state.emotional_valence ?? 0;
    const clampedValence = clamp(originalValence, -1, 1, 0);
    if (originalValence !== clampedValence) {
      notes.push(`intent_state.emotional_valence: ${JSON.stringify(originalValence)} -> ${clampedValence}`);
    }
    payload.intent_state.emotional_valence = clampedValence;

    return notes;
  }

  applyFallbacks(payload: Required<ParticleControlContract>): string[] {
    const notes: string[] = [];

    payload.contract_name ??= "AI Particle Control Contract V1";
    payload.contract_version ??= "1.0.0";
    payload.emitted_at ??= utcNowIso(this.nowFactory);
    payload.trace_id ??= createTraceId(this.idFactory);

    const intent = payload.intent_state;
    intent.state ??= "IDLE";
    intent.state_entered_at ??= payload.emitted_at;
    intent.state_duration_ms ??= 0;
    intent.transition_reason ??= "governor_fallback";
    intent.semantic_concepts ??= [];

    const renderer = payload.renderer_controls;
    renderer.runtime_profile ??= "DETERMINISTIC";
    renderer.shader_uniforms ??= {};
    renderer.easing ??= "SMOOTH";
    renderer.flow_direction ??= "STABLE";

    if (!Array.isArray(intent.semantic_concepts)) {
      intent.semantic_concepts = [];
      notes.push("intent_state.semantic_concepts reset to []");
    }

    if (!isPlainObject(renderer.shader_uniforms)) {
      renderer.shader_uniforms = {};
      notes.push("renderer_controls.shader_uniforms reset to {}");
    }

    const originalDuration = intent.state_duration_ms ?? 0;
    const numericDuration = Number(originalDuration);
    const normalizedDuration = Math.max(0, Math.min(86_400_000, Number.isFinite(numericDuration) ? Math.trunc(numericDuration) : 0));
    if (originalDuration !== normalizedDuration) {
      notes.push(`intent_state.state_duration_ms: ${JSON.stringify(originalDuration)} -> ${normalizedDuration}`);
    }
    intent.state_duration_ms = normalizedDuration;

    return notes;
  }

  applyPsychoSafetyGate(payload: Required<ParticleControlContract>, ctx: Required<GovernorContext>): string[] {
    void ctx;
    const notes: string[] = [];
    const intent = payload.intent_state;
    const renderer = payload.renderer_controls;

    if ((intent.flicker ?? 0) > PSYCHO_SAFETY_LIMITS.flicker) {
      const original = Number(intent.flicker ?? 0);
      intent.flicker = PSYCHO_SAFETY_LIMITS.flicker;
      notes.push(`psycho_safety_gate intent_state.flicker: ${original} -> ${intent.flicker}`);
    }

    if ((intent.glow_intensity ?? 0) > PSYCHO_SAFETY_LIMITS.glow_intensity) {
      const original = Number(intent.glow_intensity ?? 0);
      intent.glow_intensity = PSYCHO_SAFETY_LIMITS.glow_intensity;
      notes.push(`psycho_safety_gate intent_state.glow_intensity: ${original} -> ${intent.glow_intensity}`);
    }

    if ((renderer.velocity ?? 0) > PSYCHO_SAFETY_LIMITS.velocity) {
      const original = Number(renderer.velocity ?? 0);
      renderer.velocity = PSYCHO_SAFETY_LIMITS.velocity;
      notes.push(`psycho_safety_gate renderer_controls.velocity: ${original} -> ${renderer.velocity}`);
    }

    let cadenceHz = this.extractCadenceHz(payload);
    const originalCadenceHz = cadenceHz;
    if (cadenceHz > WCAG_FLASHES_PER_SECOND_MAX) {
      notes.push(
        `psycho_safety_gate cadence_hz: ${cadenceHz} -> ${WCAG_FLASHES_PER_SECOND_MAX} (WCAG <=3 flashes/sec)`,
      );
      cadenceHz = WCAG_FLASHES_PER_SECOND_MAX;
    }

    if (
      originalCadenceHz > WCAG_FLASHES_PER_SECOND_MAX &&
      originalCadenceHz < IEEE_1789_LOW_RISK_FREQUENCY_HZ &&
      (intent.flicker ?? 0) > IEEE_1789_LOW_FREQ_FLICKER_CAP
    ) {
      const original = Number(intent.flicker ?? 0);
      intent.flicker = IEEE_1789_LOW_FREQ_FLICKER_CAP;
      notes.push(
        `psycho_safety_gate intent_state.flicker: ${original} -> ${intent.flicker} (IEEE 1789 low-frequency mitigation)`,
      );
    }

    const sample = this.recordPsychoSafetySample(payload, cadenceHz);
    if (this.detectGradualDrift(sample.ts)) {
      const originalVelocity = Number(renderer.velocity ?? 0);
      renderer.velocity = Math.min(originalVelocity, 0.18);
      if (originalVelocity !== renderer.velocity) {
        notes.push(
          `psycho_safety_gate renderer_controls.velocity: ${originalVelocity} -> ${renderer.velocity} (gradual drift containment)`,
        );
      }

      const originalLuminance = Number(intent.glow_intensity ?? 0);
      intent.glow_intensity = Math.min(originalLuminance, 0.35);
      if (originalLuminance !== intent.glow_intensity) {
        notes.push(
          `psycho_safety_gate intent_state.glow_intensity: ${originalLuminance} -> ${intent.glow_intensity} (gradual drift containment)`,
        );
      }

      notes.push("psycho_safety_gate gradual frequency drift detected and contained");
    }

    renderer.shader_uniforms ??= {};
    renderer.shader_uniforms.cadence_hz = cadenceHz;

    return notes;
  }

  private extractCadenceHz(payload: Required<ParticleControlContract>): number {
    const shaderCadence = payload.renderer_controls.shader_uniforms?.cadence_hz;
    if (typeof shaderCadence === "number" && Number.isFinite(shaderCadence)) {
      return Math.max(0, shaderCadence);
    }

    const flicker = Number(payload.intent_state.flicker ?? 0);
    return Math.max(0, flicker * 25);
  }

  private recordPsychoSafetySample(
    payload: Required<ParticleControlContract>,
    cadenceHz: number,
  ): { ts: number; cadence_hz: number; flicker_proxy: number; luminance_proxy: number } {
    const ts = this.payloadTsSeconds(payload);
    const sample = {
      ts,
      cadence_hz: Math.max(0, cadenceHz),
      flicker_proxy: Math.max(0, Number(payload.intent_state.flicker ?? 0)),
      luminance_proxy: Math.max(0, Number(payload.intent_state.glow_intensity ?? 0)),
    };
    this.psychoSafetySeries.push(sample);
    if (this.psychoSafetySeries.length > PSYCHO_SERIES_MAX_POINTS) {
      this.psychoSafetySeries = this.psychoSafetySeries.slice(-PSYCHO_SERIES_MAX_POINTS);
    }
    const cutoff = ts - PSYCHO_SERIES_WINDOW_SECONDS;
    this.psychoSafetySeries = this.psychoSafetySeries.filter((point) => point.ts >= cutoff);
    return sample;
  }

  private detectGradualDrift(nowTs: number): boolean {
    const windowStart = nowTs - DRIFT_DETECTION_WINDOW_SECONDS;
    const window = this.psychoSafetySeries.filter((point) => point.ts >= windowStart);
    if (window.length < 3) return false;

    const start = window[0];
    const end = window[window.length - 1];
    const elapsed = end.ts - start.ts;
    if (elapsed <= 0) return false;

    const delta = end.cadence_hz - start.cadence_hz;
    const slope = delta / elapsed;
    const monotonic = window.slice(1).every((point, index) => point.cadence_hz >= window[index].cadence_hz);
    return monotonic && delta >= DRIFT_MIN_STEP_HZ && slope >= DRIFT_MIN_SLOPE_HZ_PER_SEC;
  }

  private payloadTsSeconds(payload: Required<ParticleControlContract>): number {
    const raw = payload.emitted_at;
    if (typeof raw === "string") {
      const parsed = Date.parse(raw);
      if (!Number.isNaN(parsed)) {
        return parsed / 1000;
      }
    }
    return utcNow(this.nowFactory).getTime() / 1000;
  }

  validateAgainstSchema(payload: Required<ParticleControlContract>): string[] {
    return this.schemaValidator ? this.schemaValidator(payload) : [];
  }

  applyPolicyRules(payload: Required<ParticleControlContract>, ctx: Required<GovernorContext>): { blocked: boolean; notes: string[] } {
    const violations: string[] = [];
    const intent = payload.intent_state;
    const renderer = payload.renderer_controls;
    const state = normalizeGovernorState(String(intent.state ?? "IDLE"));
    intent.state = state;

    const palette = (intent.palette ??= { mode: "CUSTOM", primary: "#FFFFFF", secondary: "#BDBDBD", accent: "#7D7D7D" });
    const reservedPalette = RESERVED_PALETTES[state];
    if (reservedPalette && palette.mode !== reservedPalette) {
      palette.mode = reservedPalette;
      violations.push(`reserved palette enforced for state ${state}`);
    }

    if (state === "ERROR" && intent.shape !== "CRACKED_SHELL") {
      intent.shape = "CRACKED_SHELL";
      violations.push("ERROR state forced to CRACKED_SHELL");
    }

    if (state === "NIRODHA") {
      if ((intent.glow_intensity ?? 0) > 0.2) {
        intent.glow_intensity = 0.2;
        violations.push("NIRODHA glow_intensity capped to 0.20");
      }
      if ((renderer.velocity ?? 0) > 0.1) {
        renderer.velocity = 0.1;
        violations.push("NIRODHA velocity capped to 0.10");
      }
    }

    if (state === "WARNING" && intent.palette?.mode === "CUSTOM") {
      intent.palette.mode = "WARNING_OVERLOAD";
      violations.push("WARNING state cannot use CUSTOM palette");
    }

    const shaderUniforms = (renderer.shader_uniforms ??= {});
    const keys = Object.keys(shaderUniforms);
    if (keys.length > MAX_SHADER_UNIFORMS) {
      for (const extra of keys.slice(MAX_SHADER_UNIFORMS)) {
        delete shaderUniforms[extra];
      }
      violations.push(`shader_uniforms truncated to ${MAX_SHADER_UNIFORMS} keys`);
    }

    if (state === "SENSOR_ACTIVE" && !ctx.allow_sensor_states) {
      violations.push("sensor-active state requires allow_sensor_states=True");
      return { blocked: true, notes: violations };
    }

    // Scholar safety gates
    const scholar = (intent as { scholar?: { cited_sources?: string[]; unverified_source_detected?: boolean; summary?: string } }).scholar;
    if (scholar) {
      if (state === "ERROR" || state === "WARNING") {
        delete (intent as { scholar?: unknown }).scholar;
        violations.push("Priority conflict: Scholar intent suppressed during system alert");
        return { blocked: false, notes: violations };
      }
      let unverified = false;
      const trustedDomains = ["wikipedia.org", "github.com", "aetherium.dev", "nasa.gov", "arxiv.org", "nature.com", "sciencedirect.com", "scholar.google.com", "npmjs.com", "developer.mozilla.org", "stackoverflow.com", "reuters.com"];
      if (scholar.cited_sources) {
        unverified = scholar.cited_sources.some((url: string) => !trustedDomains.some(domain => url.includes(domain)));
      }
      scholar.unverified_source_detected = unverified;
      if (unverified) violations.push("unverified sources detected; amber signal active");
      if (scholar.summary && scholar.summary.length > 5000) {
        scholar.summary = scholar.summary.slice(0, 4900) + "... [System: Recursive Summarization Required]";
        violations.push("scholar summary truncated to 5000 chars");
      }
      if (scholar.summary && (scholar.summary.toLowerCase().includes("warning") || scholar.summary.toLowerCase().includes("danger"))) {
        if ((intent.flicker ?? 0) > 0.05) {
          intent.flicker = 0.05;
          violations.push("psycho-safety: flicker capped for sensitive content");
        }
      }
    }

    if ((intent.flicker ?? 0) > 0.2) {
      intent.flicker = 0.2;
      violations.push("flicker capped to hard safety envelope");
    }

    return { blocked: false, notes: violations };
  }

  applyCapabilityGates(payload: Required<ParticleControlContract>, ctx: Required<GovernorContext>): string[] {
    const notes: string[] = [];
    const intent = payload.intent_state;
    const renderer = payload.renderer_controls;

    const forcedState = ctx.human_override?.forced_state;
    if (forcedState && STATE_PROFILES[forcedState] && forcedState !== intent.state) {
      intent.state = forcedState;
      notes.push(`human_override.forced_state applied: ${forcedState}`);
      notes.push(...this.applyProfileMap(payload));
    }

    if (ctx.low_power_mode) {
      for (const [key, cap] of [["particle_density", 0.22], ["glow_intensity", 0.2]] as const) {
        const original = Number(intent[key] ?? 0);
        intent[key] = Math.min(original, cap);
        if (original !== intent[key]) notes.push(`low_power_mode capped intent_state.${key}: ${original} -> ${intent[key]}`);
      }
      for (const [key, cap] of [["trail", 0.1], ["bloom", 0.08], ["noise", 0.05], ["velocity", 0.12]] as const) {
        const original = Number(renderer[key] ?? 0);
        renderer[key] = Math.min(original, cap);
        if (original !== renderer[key]) notes.push(`low_power_mode capped renderer_controls.${key}: ${original} -> ${renderer[key]}`);
      }
      renderer.runtime_profile = "LOW_POWER";
      notes.push("runtime_profile -> LOW_POWER");
    }

    if (ctx.low_sensory_mode) {
      for (const [key, cap] of [["flicker", 0.0], ["turbulence", 0.12], ["glow_intensity", 0.35]] as const) {
        const original = Number(intent[key] ?? 0);
        intent[key] = Math.min(original, cap);
        if (original !== intent[key]) notes.push(`low_sensory_mode capped intent_state.${key}: ${original} -> ${intent[key]}`);
      }
      for (const [key, cap] of [["noise", 0.08], ["velocity", 0.18], ["bloom", 0.18]] as const) {
        const original = Number(renderer[key] ?? 0);
        renderer[key] = Math.min(original, cap);
        if (original !== renderer[key]) notes.push(`low_sensory_mode capped renderer_controls.${key}: ${original} -> ${renderer[key]}`);
      }
    }

    if (ctx.no_flicker_mode) {
      if ((intent.flicker ?? 0) !== 0) {
        notes.push(`no_flicker_mode forced flicker ${intent.flicker} -> 0.0`);
      }
      intent.flicker = 0;
    }

    if (ctx.monochrome_mode) {
      const palette = (intent.palette ??= { mode: "CUSTOM", primary: "#FFFFFF", secondary: "#BDBDBD", accent: "#7D7D7D" });
      const original = deepCopy(palette);
      palette.primary = "#FFFFFF";
      palette.secondary = "#BDBDBD";
      palette.accent = "#7D7D7D";
      notes.push(`monochrome_mode rewrote palette from ${JSON.stringify(original)} to ${JSON.stringify(palette)}`);
    }

    if (
      intent.state === "SENSOR_ACTIVE" &&
      !ctx.granted_capabilities.some((cap) => ["microphone", "camera", "motion"].includes(cap))
    ) {
      intent.state = "IDLE";
      notes.push("capability gate downgraded SENSOR_ACTIVE -> IDLE due to missing granted_capabilities");
      notes.push(...this.applyProfileMap(payload));
    }

    return notes;
  }

  safeContract(reason: string, traceId?: string): Required<ParticleControlContract> {
    const base: Required<ParticleControlContract> = {
      contract_name: "AI Particle Control Contract V1",
      contract_version: "1.0.0",
      emitted_at: utcNowIso(this.nowFactory),
      trace_id: traceId ?? createTraceId(this.idFactory),
      intent_state: {
        state: "ERROR",
        state_entered_at: utcNowIso(this.nowFactory),
        state_duration_ms: 0,
        transition_reason: reason.slice(0, 256),
        semantic_concepts: [],
      },
      renderer_controls: {},
    };

    deepMerge(base.intent_state as Record<string, unknown>, deepCopy(STATE_PROFILES.ERROR.intent_state) as Record<string, unknown>);
    deepMerge(base.renderer_controls as Record<string, unknown>, deepCopy(STATE_PROFILES.ERROR.renderer_controls) as Record<string, unknown>);
    return base;
  }

  lastState(): GovernorState | null {
    return (this.lastAcceptedContract?.intent_state?.state as GovernorState | undefined) ?? null;
  }

  rendererSnapshot(contract: Required<ParticleControlContract>): Record<string, unknown> {
    const intent = contract.intent_state ?? {};
    const renderer = contract.renderer_controls ?? {};
    return {
      trace_id: contract.trace_id,
      state: intent.state,
      canonical_visual_state: toCanonicalVisualState(intent.state ?? "IDLE"),
      shape: intent.shape,
      palette: intent.palette,
      particle_density: intent.particle_density,
      turbulence: intent.turbulence,
      glow_intensity: intent.glow_intensity,
      flicker: intent.flicker,
      flow_direction: renderer.flow_direction,
      velocity: renderer.velocity,
      cohesion: renderer.cohesion,
      trail: renderer.trail,
      bloom: renderer.bloom,
      noise: renderer.noise,
      attractor: renderer.attractor,
      runtime_profile: renderer.runtime_profile,
      easing: renderer.easing,
      shader_uniforms: renderer.shader_uniforms,
    };
  }

  storeTelemetry(events: TelemetryEvent[]): void {
    this.telemetryEvents.push(...deepCopy(events));
    if (this.telemetryEvents.length > MAX_TELEMETRY_EVENTS) {
      this.telemetryEvents = this.telemetryEvents.slice(-MAX_TELEMETRY_EVENTS);
    }
  }

  finalizeDecision(input: {
    accepted: boolean;
    manifestation_gate_open: boolean;
    blocked_by_policy: boolean;
    effective_contract: Required<ParticleControlContract>;
    telemetry: TelemetryEvent[];
    mutations: string[];
    policy_violations: string[];
  }): GovernorDecision {
    return {
      accepted: input.accepted,
      manifestation_gate_open: input.manifestation_gate_open,
      blocked_by_policy: input.blocked_by_policy,
      trace_id: String(input.effective_contract.trace_id),
      effective_contract: input.effective_contract,
      renderer_snapshot: this.rendererSnapshot(input.effective_contract),
      telemetry: input.telemetry,
      mutations: input.mutations,
      policy_violations: input.policy_violations,
    };
  }
}



type JsonSchema = {
  type?: string;
  required?: string[];
  properties?: Record<string, JsonSchema>;
};

let CACHED_RUNTIME_ABI_VALIDATOR: RuntimeGovernorOptions["schemaValidator"] | null | undefined;

function loadRuntimeAbiSchemaValidator(): RuntimeGovernorOptions["schemaValidator"] | undefined {
  if (CACHED_RUNTIME_ABI_VALIDATOR !== undefined) return CACHED_RUNTIME_ABI_VALIDATOR ?? undefined;
  try {
    const schemaCandidates = process.env.PARTICLE_CONTROL_SCHEMA_PATH
      ? [process.env.PARTICLE_CONTROL_SCHEMA_PATH]
      : [resolve(process.cwd(), "particle-control.schema.json"), resolve(process.cwd(), "governor", "particle-control.schema.json")];
    const schemaPath = schemaCandidates.find((candidate) => existsSync(candidate));
    if (!schemaPath) {
      CACHED_RUNTIME_ABI_VALIDATOR = null;
      return undefined;
    }
    const raw = readFileSync(schemaPath, "utf-8");
    const schema = JSON.parse(raw) as JsonSchema;
    CACHED_RUNTIME_ABI_VALIDATOR = makeNaiveRuntimeAbiValidator(schema);
    return CACHED_RUNTIME_ABI_VALIDATOR;
  } catch {
    CACHED_RUNTIME_ABI_VALIDATOR = null;
    return undefined;
  }
}

function makeNaiveRuntimeAbiValidator(schema: JsonSchema): RuntimeGovernorOptions["schemaValidator"] {
  return (payload) => {
    const errors: string[] = [];
    const rootRequired = schema.required ?? [];
    for (const key of rootRequired) {
      if ((payload as Record<string, unknown>)[key] == null) {
        errors.push(`${key}: missing required field`);
      }
    }

    for (const section of ["intent_state", "renderer_controls"] as const) {
      const sectionSchema = schema.properties?.[section];
      const sectionRequired = sectionSchema?.required ?? [];
      const sectionValue = (payload[section] as unknown as Record<string, unknown>) ?? {};
      for (const key of sectionRequired) {
        if (sectionValue[key] == null) {
          errors.push(`${section}.${key}: missing required field`);
        }
      }
    }
    return errors;
  };
}

export function createGovernor(options?: RuntimeGovernorOptions): RuntimeGovernor {
  return new RuntimeGovernor(options);
}

export function getCanonicalVisualStateFromContract(contract: ParticleControlContract): VisualState {
  return toCanonicalVisualState(contract.intent_state?.state ?? "IDLE");
}

export function makeSchemaValidator(
  validator: (payload: Required<ParticleControlContract>) => { valid: boolean; errors?: Array<{ instancePath?: string; message?: string }> },
): RuntimeGovernorOptions["schemaValidator"] {
  return (payload) => {
    const result = validator(payload);
    if (result.valid) return [];
    return (result.errors ?? []).map((error) => {
      const dotted = String(error.instancePath ?? "")
        .replace(/^\//, "")
        .replace(/\//g, ".");
      return dotted ? `${dotted}: ${error.message ?? "schema validation failed"}` : error.message ?? "schema validation failed";
    });
  };
}
