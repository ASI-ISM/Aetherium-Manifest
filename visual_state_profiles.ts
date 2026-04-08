export const CANONICAL_VISUAL_STATES = [
  "IDLE",
  "LISTENING",
  "THINKING",
  "RESPONDING",
  "WARNING",
  "ERROR",
  "NIRODHA",
] as const;

export type VisualState = (typeof CANONICAL_VISUAL_STATES)[number];
export type IncomingVisualState = VisualState | "GENERATING" | "SENSOR_ACTIVE";

export const SHAPES = [
  "NEBULA_CLOUD",
  "SPHERE",
  "SPIRAL_VORTEX",
  "CRACKED_SHELL",
  "CUBE",
  "STREAM",
  "SHELL",
  "FRACTURE",
] as const;
export type Shape = (typeof SHAPES)[number];

export const FLOW_DIRECTIONS = [
  "INWARD",
  "OUTWARD",
  "UPWARD",
  "DOWNWARD",
  "ORBITAL",
  "STABLE",
  "FREE",
] as const;
export type FlowDirection = (typeof FLOW_DIRECTIONS)[number];

export const RUNTIME_PROFILES = [
  "DETERMINISTIC",
  "ADAPTIVE",
  "LOW_POWER",
  "CINEMATIC",
] as const;
export type RuntimeProfile = (typeof RUNTIME_PROFILES)[number];

export const EASING_TYPES = ["LINEAR", "SMOOTH", "VISCOUS", "ELASTIC"] as const;
export type EasingType = (typeof EASING_TYPES)[number];

export const REASONING_STYLES = [
  "ANALYTICAL",
  "CREATIVE",
  "EMPATHIC",
  "EXPLORATORY",
  "PROCEDURAL",
  "REFLECTIVE",
] as const;
export type ReasoningStyle = (typeof REASONING_STYLES)[number];

export const RELATIONAL_INTENTS = [
  "NEUTRAL",
  "GUIDING",
  "COMPANIONING",
  "ALERTING",
  "SOOTHING",
  "CHALLENGING",
] as const;
export type RelationalIntent = (typeof RELATIONAL_INTENTS)[number];

export const PALETTE_MODES = [
  "CALM_IDLE",
  "ACTIVE_LISTENING",
  "DEEP_REASONING",
  "CO_CREATION",
  "WARNING_OVERLOAD",
  "ERROR_POLICY",
  "NIRODHA_DORMANT",
  "CUSTOM",
] as const;
export type PaletteMode = (typeof PALETTE_MODES)[number];

export type NormalizedScalar = number;

export interface PaletteProfile {
  mode: PaletteMode;
  primary: string;
  secondary: string;
  accent?: string;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface IntentStateProfile {
  state: VisualState;
  shape: Shape;
  particle_density: NormalizedScalar;
  turbulence: NormalizedScalar;
  glow_intensity: NormalizedScalar;
  flicker: NormalizedScalar;
  confidence?: NormalizedScalar;
  energy_level?: NormalizedScalar;
  uncertainty?: NormalizedScalar;
  emotional_valence?: number;
  reasoning_style?: ReasoningStyle;
  relational_intent?: RelationalIntent;
  palette: PaletteProfile;
}

export interface RendererControlsProfile {
  flow_direction: FlowDirection;
  velocity?: NormalizedScalar;
  cohesion?: NormalizedScalar;
  trail?: NormalizedScalar;
  bloom?: NormalizedScalar;
  noise?: NormalizedScalar;
  attractor?: Point2D;
  runtime_profile: RuntimeProfile;
  easing?: EasingType;
  shader_uniforms: Record<string, string | number | boolean>;
}

export interface VisualTransitionProfile {
  enter_ms: number;
  settle_ms: number;
  blend_mode: "soft" | "firm" | "hard";
}

export interface VisualStateProfile {
  key: VisualState;
  label: string;
  description: string;
  reserved_semantic: boolean;
  intent_state: IntentStateProfile;
  renderer_controls: RendererControlsProfile;
  transition: VisualTransitionProfile;
}

export interface ParticleControlPatch {
  intent_state: IntentStateProfile & {
    state_entered_at: string;
    state_duration_ms: number;
    transition_reason: string;
  };
  renderer_controls: RendererControlsProfile;
}

/**
 * Canonical 7-state adapter layer.
 * These aliases let the UI stay on 7 states while older/backend emitters can still send 9-state variants.
 */
export const VISUAL_STATE_ALIASES: Record<IncomingVisualState, VisualState> = {
  IDLE: "IDLE",
  LISTENING: "LISTENING",
  THINKING: "THINKING",
  RESPONDING: "RESPONDING",
  WARNING: "WARNING",
  ERROR: "ERROR",
  NIRODHA: "NIRODHA",
  GENERATING: "RESPONDING",
  SENSOR_ACTIVE: "LISTENING",
};

/**
 * Reserved semantic states that must not be recolored or semantically redefined by plugins.
 */
export const RESERVED_VISUAL_STATES: Record<VisualState, boolean> = {
  IDLE: false,
  LISTENING: false,
  THINKING: false,
  RESPONDING: false,
  WARNING: true,
  ERROR: true,
  NIRODHA: true,
};

/**
 * Top-level profile map shared by renderer, HUD, and Governor-side adapters.
 */
export const VISUAL_STATE_PROFILES: Record<VisualState, VisualStateProfile> = {
  IDLE: {
    key: "IDLE",
    label: "Idle",
    description: "Baseline resting field. Quiet, breathable, and ready to wake without visual stress.",
    reserved_semantic: false,
    intent_state: {
      state: "IDLE",
      shape: "NEBULA_CLOUD",
      particle_density: 0.22,
      turbulence: 0.08,
      glow_intensity: 0.2,
      flicker: 0,
      confidence: 0.6,
      energy_level: 0.16,
      uncertainty: 0.08,
      emotional_valence: 0,
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
      cohesion: 0.32,
      trail: 0.12,
      bloom: 0.14,
      noise: 0.05,
      attractor: { x: 0.5, y: 0.5 },
      runtime_profile: "DETERMINISTIC",
      easing: "SMOOTH",
      shader_uniforms: {
        pulse_enabled: true,
        pulse_rate: 0.12,
      },
    },
    transition: {
      enter_ms: 480,
      settle_ms: 900,
      blend_mode: "soft",
    },
  },
  LISTENING: {
    key: "LISTENING",
    label: "Listening",
    description: "Audio or sensor intake state. The field narrows attention inward and becomes responsive.",
    reserved_semantic: false,
    intent_state: {
      state: "LISTENING",
      shape: "SPHERE",
      particle_density: 0.34,
      turbulence: 0.12,
      glow_intensity: 0.42,
      flicker: 0.02,
      confidence: 0.64,
      energy_level: 0.32,
      uncertainty: 0.16,
      emotional_valence: 0.04,
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
      shader_uniforms: {
        audio_reactive: true,
        ring_gain: 0.35,
      },
    },
    transition: {
      enter_ms: 220,
      settle_ms: 420,
      blend_mode: "soft",
    },
  },
  THINKING: {
    key: "THINKING",
    label: "Thinking",
    description: "Reasoning concentration state. Density gathers inward and motion becomes coherent.",
    reserved_semantic: false,
    intent_state: {
      state: "THINKING",
      shape: "SPIRAL_VORTEX",
      particle_density: 0.62,
      turbulence: 0.24,
      glow_intensity: 0.58,
      flicker: 0.03,
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
      shader_uniforms: {
        swirl_bias: 0.16,
        reasoning_focus: 0.8,
      },
    },
    transition: {
      enter_ms: 360,
      settle_ms: 720,
      blend_mode: "firm",
    },
  },
  RESPONDING: {
    key: "RESPONDING",
    label: "Responding",
    description: "Answer manifestation state. Energy moves outward and becomes legible to the user.",
    reserved_semantic: false,
    intent_state: {
      state: "RESPONDING",
      shape: "STREAM",
      particle_density: 0.68,
      turbulence: 0.18,
      glow_intensity: 0.7,
      flicker: 0.04,
      confidence: 0.8,
      energy_level: 0.58,
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
      shader_uniforms: {
        emission_bias: 0.22,
        token_sync_hint: true,
      },
    },
    transition: {
      enter_ms: 260,
      settle_ms: 500,
      blend_mode: "firm",
    },
  },
  WARNING: {
    key: "WARNING",
    label: "Warning",
    description: "Elevated caution state. Readable tension without becoming an overwhelming attack surface.",
    reserved_semantic: true,
    intent_state: {
      state: "WARNING",
      shape: "SHELL",
      particle_density: 0.56,
      turbulence: 0.46,
      glow_intensity: 0.72,
      flicker: 0.1,
      confidence: 0.52,
      energy_level: 0.68,
      uncertainty: 0.34,
      emotional_valence: -0.08,
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
      shader_uniforms: {
        tension_ring: true,
      },
    },
    transition: {
      enter_ms: 180,
      settle_ms: 320,
      blend_mode: "hard",
    },
  },
  ERROR: {
    key: "ERROR",
    label: "Error",
    description: "Fault, refusal, or policy-block state. Semantics must remain unambiguous.",
    reserved_semantic: true,
    intent_state: {
      state: "ERROR",
      shape: "FRACTURE",
      particle_density: 0.4,
      turbulence: 0.72,
      glow_intensity: 0.8,
      flicker: 0.18,
      confidence: 0.36,
      energy_level: 0.62,
      uncertainty: 0.64,
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
      shader_uniforms: {
        fracture_bias: 0.42,
      },
    },
    transition: {
      enter_ms: 120,
      settle_ms: 260,
      blend_mode: "hard",
    },
  },
  NIRODHA: {
    key: "NIRODHA",
    label: "Nirodha",
    description: "Dormant or deeply quiet state. Beyond idle: intentionally diminished activity.",
    reserved_semantic: true,
    intent_state: {
      state: "NIRODHA",
      shape: "SPHERE",
      particle_density: 0.1,
      turbulence: 0.02,
      glow_intensity: 0.08,
      flicker: 0,
      confidence: 0.82,
      energy_level: 0.05,
      uncertainty: 0.04,
      emotional_valence: 0,
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
      noise: 0,
      attractor: { x: 0.5, y: 0.5 },
      runtime_profile: "LOW_POWER",
      easing: "SMOOTH",
      shader_uniforms: {
        pulse_enabled: false,
      },
    },
    transition: {
      enter_ms: 640,
      settle_ms: 1200,
      blend_mode: "soft",
    },
  },
};

/**
 * Canonical transition table for the 7-state renderer/runtime.
 * This intentionally stays smaller than the backend governor's wider compatibility graph.
 */
export const VISUAL_STATE_TRANSITIONS: Record<VisualState, readonly VisualState[]> = {
  IDLE: ["LISTENING", "THINKING", "RESPONDING", "WARNING", "ERROR", "NIRODHA"],
  LISTENING: ["IDLE", "THINKING", "RESPONDING", "WARNING", "ERROR", "NIRODHA"],
  THINKING: ["IDLE", "RESPONDING", "WARNING", "ERROR", "NIRODHA"],
  RESPONDING: ["IDLE", "LISTENING", "THINKING", "WARNING", "ERROR", "NIRODHA"],
  WARNING: ["IDLE", "THINKING", "RESPONDING", "ERROR", "NIRODHA"],
  ERROR: ["IDLE", "NIRODHA"],
  NIRODHA: ["IDLE", "LISTENING"],
};

export const DEFAULT_VISUAL_STATE: VisualState = "IDLE";

export const DEFAULT_TRANSITION_FALLBACK: Record<VisualState, VisualState> = {
  IDLE: "IDLE",
  LISTENING: "IDLE",
  THINKING: "IDLE",
  RESPONDING: "IDLE",
  WARNING: "IDLE",
  ERROR: "NIRODHA",
  NIRODHA: "IDLE",
};

export interface ResolvedTransition {
  previous: VisualState | null;
  requested: VisualState;
  effective: VisualState;
  accepted: boolean;
  reason: string;
}

export function isVisualState(value: string): value is VisualState {
  return (CANONICAL_VISUAL_STATES as readonly string[]).indexOf(value) !== -1;
}

export function normalizeVisualState(value?: string | null): VisualState {
  if (!value) return DEFAULT_VISUAL_STATE;
  const upper = value.toUpperCase() as IncomingVisualState;
  return VISUAL_STATE_ALIASES[upper] ?? DEFAULT_VISUAL_STATE;
}

export function getVisualStateProfile(state: string | null | undefined): VisualStateProfile {
  return VISUAL_STATE_PROFILES[normalizeVisualState(state)];
}

export function canTransition(
  previous: string | null | undefined,
  next: string | null | undefined,
): boolean {
  const from = normalizeVisualState(previous);
  const to = normalizeVisualState(next);
  if (from === to) return true;
  return VISUAL_STATE_TRANSITIONS[from].indexOf(to) !== -1;
}

/**
 * Resolve a requested state transition against the canonical 7-state graph.
 * Safety states keep their meaning, while incompatible transitions fall back predictably.
 */
export function resolveVisualTransition(
  previous: string | null | undefined,
  requested: string | null | undefined,
): ResolvedTransition {
  const prev = previous ? normalizeVisualState(previous) : null;
  const req = normalizeVisualState(requested);

  if (!prev) {
    return {
      previous: null,
      requested: req,
      effective: req,
      accepted: true,
      reason: "initial_state",
    };
  }

  if (prev === req) {
    return {
      previous: prev,
      requested: req,
      effective: req,
      accepted: true,
      reason: "same_state",
    };
  }

  if (VISUAL_STATE_TRANSITIONS[prev].indexOf(req) !== -1) {
    return {
      previous: prev,
      requested: req,
      effective: req,
      accepted: true,
      reason: "transition_allowed",
    };
  }

  const fallback = DEFAULT_TRANSITION_FALLBACK[prev];
  return {
    previous: prev,
    requested: req,
    effective: fallback,
    accepted: false,
    reason: `transition_blocked:${prev}->${req};fallback:${fallback}`,
  };
}

export function toIsoNow(date = new Date()): string {
  return date.toISOString();
}

/**
 * Build a Governor-friendly patch object from a canonical visual state.
 * This stays schema-aligned with particle-control.schema.json.
 */
export function buildVisualStatePatch(
  state: string | null | undefined,
  options?: {
    enteredAt?: string;
    durationMs?: number;
    transitionReason?: string;
    intentOverrides?: Partial<IntentStateProfile>;
    rendererOverrides?: Partial<RendererControlsProfile>;
  },
): ParticleControlPatch {
  const normalized = normalizeVisualState(state);
  const profile = VISUAL_STATE_PROFILES[normalized];

  return {
    intent_state: {
      ...profile.intent_state,
      ...options?.intentOverrides,
      state: normalized,
      state_entered_at: options?.enteredAt ?? toIsoNow(),
      state_duration_ms: options?.durationMs ?? 0,
      transition_reason: options?.transitionReason ?? "profile_map",
    },
    renderer_controls: {
      ...profile.renderer_controls,
      ...options?.rendererOverrides,
      shader_uniforms: {
        ...profile.renderer_controls.shader_uniforms,
        ...(options?.rendererOverrides?.shader_uniforms ?? {}),
      },
    },
  };
}

/**
 * Optional utility for HUDs or policy panels.
 */
export function isReservedVisualState(state: string | null | undefined): boolean {
  return RESERVED_VISUAL_STATES[normalizeVisualState(state)] === true;
}
