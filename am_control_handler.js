const STATE_PROFILES = {
  IDLE: {
    density: 0.10,
    velocity: 0.08,
    turbulence: 0.04,
    cohesion: 0.92,
    flow: 'still',
    glow: 0.28,
    flicker: 0.01,
    palette: { mode: 'adaptive', primary: '#8EEEFF', secondary: '#DFFAFF', accent: '#FFFFFF' },
  },
  LISTENING: {
    density: 0.18,
    velocity: 0.16,
    turbulence: 0.08,
    cohesion: 0.84,
    flow: 'orbit',
    glow: 0.38,
    flicker: 0.03,
    palette: { mode: 'adaptive', primary: '#00E5FF', secondary: '#7AE8FF', accent: '#DFFAFF' },
  },
  GENERATING: {
    density: 0.42,
    velocity: 0.58,
    turbulence: 0.34,
    cohesion: 0.56,
    flow: 'clockwise',
    glow: 0.66,
    flicker: 0.10,
    palette: { mode: 'spectral', primary: '#7C3AED', secondary: '#FFD166', accent: '#FFF3B0' },
  },
  THINKING: {
    density: 0.36,
    velocity: 0.46,
    turbulence: 0.24,
    cohesion: 0.68,
    flow: 'counterclockwise',
    glow: 0.58,
    flicker: 0.06,
    palette: { mode: 'adaptive', primary: '#00F5FF', secondary: '#7C3AED', accent: '#DFFAFF' },
  },
  CONFIRMING: {
    density: 0.28,
    velocity: 0.22,
    turbulence: 0.10,
    cohesion: 0.82,
    flow: 'inward',
    glow: 0.54,
    flicker: 0.03,
    palette: { mode: 'dual_tone', primary: '#36C6FF', secondary: '#FFFFFF', accent: '#B8F2FF' },
  },
  RESPONDING: {
    density: 0.44,
    velocity: 0.52,
    turbulence: 0.18,
    cohesion: 0.72,
    flow: 'outward',
    glow: 0.72,
    flicker: 0.07,
    palette: { mode: 'spectral', primary: '#FFD166', secondary: '#FF8C42', accent: '#FFF3B0' },
  },
  WARNING: {
    density: 0.24,
    velocity: 0.20,
    turbulence: 0.12,
    cohesion: 0.88,
    flow: 'still',
    glow: 0.70,
    flicker: 0.02,
    palette: { mode: 'thermal', primary: '#FFB347', secondary: '#FF8800', accent: '#FFF0C2' },
  },
  ERROR: {
    density: 0.16,
    velocity: 0.12,
    turbulence: 0.06,
    cohesion: 0.94,
    flow: 'still',
    glow: 0.82,
    flicker: 0.00,
    palette: { mode: 'thermal', primary: '#FF6B6B', secondary: '#A52A2A', accent: '#FFD6D6' },
  },
  STABILIZED: {
    density: 0.22,
    velocity: 0.14,
    turbulence: 0.05,
    cohesion: 0.90,
    flow: 'still',
    glow: 0.40,
    flicker: 0.01,
    palette: { mode: 'adaptive', primary: '#4CC9FF', secondary: '#DFFAFF', accent: '#FFFFFF' },
  },
  NIRODHA: {
    density: 0.05,
    velocity: 0.02,
    turbulence: 0.01,
    cohesion: 0.98,
    flow: 'still',
    glow: 0.12,
    flicker: 0.00,
    palette: { mode: 'monochrome', primary: '#0B1026', secondary: '#402A6E', accent: '#0B1026' },
  },
  SENSOR_PENDING_PERMISSION: {
    density: 0.14,
    velocity: 0.10,
    turbulence: 0.03,
    cohesion: 0.90,
    flow: 'still',
    glow: 0.34,
    flicker: 0.02,
    palette: { mode: 'adaptive', primary: '#7AE8FF', secondary: '#B8F2FF', accent: '#FFFFFF' },
  },
  SENSOR_ACTIVE: {
    density: 0.30,
    velocity: 0.42,
    turbulence: 0.20,
    cohesion: 0.70,
    flow: 'centripetal',
    glow: 0.60,
    flicker: 0.05,
    palette: { mode: 'spectral', primary: '#00E5FF', secondary: '#36C6FF', accent: '#DFFAFF' },
  },
  SENSOR_UNAVAILABLE: {
    density: 0.12,
    velocity: 0.08,
    turbulence: 0.02,
    cohesion: 0.93,
    flow: 'still',
    glow: 0.30,
    flicker: 0.01,
    palette: { mode: 'dual_tone', primary: '#94A3B8', secondary: '#CBD5E1', accent: '#E2E8F0' },
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeState(state) {
  return String(state ?? 'IDLE').trim().replace(/[\s-]+/g, '_').toUpperCase();
}

function resolveStateProfile(state) {
  return STATE_PROFILES[normalizeState(state)] ?? STATE_PROFILES.IDLE;
}

function inferCapabilityState(state, context = {}) {
  const normalized = normalizeState(state);
  const capability = context.device_capability ?? {};
  if (normalized.startsWith('SENSOR_')) return normalized;
  if (!capability.supports_motion_sensors) return 'SENSOR_UNAVAILABLE';
  if (capability.motion_sensor_permission === 'denied') return 'SENSOR_UNAVAILABLE';
  if (capability.motion_sensor_permission === 'prompt') return 'SENSOR_PENDING_PERMISSION';
  return normalized;
}

function evaluateStateTransition(control = {}, context = {}) {
  const requestedState = inferCapabilityState(control.intent_state?.state, context);
  const lastState = normalizeState(context.last_accepted_command?.intent_state?.state ?? 'IDLE');
  const transitionReason = control.transition_reason
    ?? control.intent_state?.transition_reason
    ?? (requestedState === lastState ? 'state_unchanged' : `state_transition:${lastState}->${requestedState}`);
  const stateEnteredAt = control.state_entered_at
    ?? control.intent_state?.state_entered_at
    ?? new Date().toISOString();
  const previousEnteredAt = context.last_accepted_command?.intent_state?.state_entered_at;
  const priorTs = Date.parse(previousEnteredAt ?? stateEnteredAt);
  const nextTs = Date.parse(stateEnteredAt);
  const stateDurationMs = Number.isFinite(priorTs) && Number.isFinite(nextTs)
    ? Math.max(0, nextTs - priorTs)
    : 0;

  return { requestedState, lastState, transitionReason, stateEnteredAt, stateDurationMs };
}

class RuntimeGovernor {
  constructor({ maxTargets = 14000, maxParticleEnergy = 1.4 } = {}) {
    this.maxTargets = maxTargets;
    this.maxParticleEnergy = maxParticleEnergy;
  }

  govern(control = {}, runtime = {}, context = {}) {
    const transition = evaluateStateTransition(control, context);
    const profile = resolveStateProfile(transition.requestedState);
    const acceptedCommand = {
      intent_state: {
        ...control.intent_state,
        state: transition.requestedState,
        particle_density: clamp(control.intent_state?.particle_density ?? profile.density, 0, 1),
        turbulence: clamp(control.intent_state?.turbulence ?? runtime.field_recipe?.turbulence ?? profile.turbulence, 0, 0.85),
        velocity: clamp(control.intent_state?.velocity ?? runtime.field_recipe?.flow_magnitude ?? profile.velocity, 0, 1),
        cohesion: clamp(control.intent_state?.cohesion ?? runtime.field_recipe?.coherence_target ?? profile.cohesion, 0, 1),
        glow_intensity: clamp(control.intent_state?.glow_intensity ?? runtime.visual_recipe?.luminance ?? profile.glow, 0, 1),
        flicker: clamp(control.intent_state?.flicker ?? profile.flicker, 0, 1),
        flow_direction: control.intent_state?.flow_direction ?? profile.flow,
        palette: {
          ...profile.palette,
          ...(control.intent_state?.palette ?? {}),
        },
        state_entered_at: transition.stateEnteredAt,
        state_duration_ms: transition.stateDurationMs,
        transition_reason: transition.transitionReason,
      },
      renderer_controls: {
        ...control.renderer_controls,
        particle_count: Math.min(control.renderer_controls?.particle_count ?? runtime.constraints?.max_targets ?? this.maxTargets, this.maxTargets),
        runtime_profile: control.renderer_controls?.runtime_profile ?? 'adaptive',
        flow_field: control.renderer_controls?.flow_field ?? control.intent_state?.flow_direction ?? profile.flow,
      },
    };

    const rejectedFields = [];
    let fallbackReason = null;
    let policyBlockCount = 0;

    if (context.device_capability?.low_power_mode) {
      acceptedCommand.renderer_controls.particle_count = Math.min(acceptedCommand.renderer_controls.particle_count, 2000);
      acceptedCommand.renderer_controls.runtime_profile = 'low_power';
      acceptedCommand.intent_state.state = 'WARNING';
      rejectedFields.push('renderer_controls.particle_count', 'renderer_controls.runtime_profile', 'intent_state.state');
      fallbackReason = 'device_low_power_mode';
    }

    if ((acceptedCommand.intent_state.flow_direction === 'centripetal' || acceptedCommand.intent_state.flow_direction === 'centrifugal') &&
      context.device_capability?.motion_sensor_permission && context.device_capability.motion_sensor_permission !== 'granted') {
      acceptedCommand.intent_state.state = inferCapabilityState('SENSOR_PENDING_PERMISSION', context);
      acceptedCommand.intent_state.flow_direction = 'still';
      acceptedCommand.renderer_controls.flow_field = 'still';
      rejectedFields.push('intent_state.state', 'intent_state.flow_direction', 'renderer_controls.flow_field');
      fallbackReason = fallbackReason ?? 'sensor_permission_denied';
    }

    if (acceptedCommand.intent_state.palette?.primary?.toUpperCase?.() === '#DC143C' && !runtime.emergency_override) {
      acceptedCommand.intent_state.state = 'WARNING';
      acceptedCommand.intent_state.palette.primary = '#FF8800';
      policyBlockCount += 1;
      rejectedFields.push('intent_state.state', 'intent_state.palette.primary');
      fallbackReason = fallbackReason ?? 'reserved_emergency_palette';
    }

    const sanitizedRuntime = {
      ...runtime,
      constraints: {
        max_targets: acceptedCommand.renderer_controls.particle_count,
        max_particle_energy: Math.min(control.safety?.max_particle_energy ?? this.maxParticleEnergy, this.maxParticleEnergy),
      },
      field_recipe: {
        ...runtime.field_recipe,
        state: acceptedCommand.intent_state.state,
        coherence_target: acceptedCommand.intent_state.cohesion,
        turbulence: acceptedCommand.intent_state.turbulence,
        flow_magnitude: acceptedCommand.intent_state.velocity,
      },
      visual_recipe: {
        ...runtime.visual_recipe,
        luminance: acceptedCommand.intent_state.glow_intensity,
        palette: acceptedCommand.intent_state.palette,
      },
      telemetry: {
        ...(runtime.telemetry ?? {}),
        state: acceptedCommand.intent_state.state,
        state_entered_at: acceptedCommand.intent_state.state_entered_at,
        state_duration_ms: acceptedCommand.intent_state.state_duration_ms,
        transition_reason: acceptedCommand.intent_state.transition_reason,
      },
    };

    return {
      accepted_command: acceptedCommand,
      rejected_fields: rejectedFields,
      fallback_reason: fallbackReason,
      policy_block_count: policyBlockCount,
      last_accepted_command: context.last_accepted_command ?? null,
      telemetry_logging: sanitizedRuntime.telemetry,
      runtime: sanitizedRuntime,
    };
  }

  sanitize(control = {}, runtime = {}, context = {}) {
    return this.govern(control, runtime, context).runtime;
  }
}

class ControlHandlerV3 {
  constructor({ kernel, shapeCompiler, intentInterpreter, formationRetriever, runtimeGovernor = new RuntimeGovernor() }) {
    this.kernel = kernel;
    this.shapeCompiler = shapeCompiler;
    this.intentInterpreter = intentInterpreter;
    this.formationRetriever = formationRetriever;
    this.runtimeGovernor = runtimeGovernor;
  }

  compileTargetField(renderMode, control, maxTargets, context = {}) {
    const governorResult = this.runtimeGovernor.govern(control, { constraints: { max_targets: maxTargets } }, context);
    const governedControl = {
      ...control,
      renderer_controls: governorResult.accepted_command.renderer_controls,
      intent_state: governorResult.accepted_command.intent_state,
    };
    switch (renderMode) {
      case 'shape_field':
        return this.shapeCompiler.compileShapeField(governedControl, governorResult.accepted_command.renderer_controls.particle_count);
      case 'scene_field':
        return this.shapeCompiler.compileSceneField(governedControl, governorResult.accepted_command.renderer_controls.particle_count);
      case 'motion_field':
      default:
        return this.shapeCompiler.compileMotionField(governedControl, Math.max(200, governorResult.accepted_command.renderer_controls.particle_count ?? 200));
    }
  }
}

module.exports = { ControlHandlerV3, RuntimeGovernor, STATE_PROFILES, evaluateStateTransition, resolveStateProfile };
