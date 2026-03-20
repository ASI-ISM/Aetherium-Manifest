class RuntimeGovernor {
  constructor({ maxTargets = 14000, maxParticleEnergy = 1.4 } = {}) {
    this.maxTargets = maxTargets;
    this.maxParticleEnergy = maxParticleEnergy;
  }

  govern(control = {}, runtime = {}, context = {}) {
    const acceptedCommand = {
      intent_state: {
        ...control.intent_state,
        turbulence: clamp(control.intent_state?.turbulence ?? runtime.field_recipe?.turbulence ?? 0.2, 0, 0.85),
        velocity: clamp(control.intent_state?.velocity ?? runtime.field_recipe?.flow_magnitude ?? 0.4, 0, 1),
        glow_intensity: clamp(control.intent_state?.glow_intensity ?? runtime.visual_recipe?.luminance ?? 0.8, 0, 1),
        flow_direction: control.intent_state?.flow_direction ?? 'still',
      },
      renderer_controls: {
        ...control.renderer_controls,
        particle_count: Math.min(control.renderer_controls?.particle_count ?? runtime.constraints?.max_targets ?? this.maxTargets, this.maxTargets),
        runtime_profile: control.renderer_controls?.runtime_profile ?? 'adaptive',
        flow_field: control.renderer_controls?.flow_field ?? control.intent_state?.flow_direction ?? 'still',
      },
    };

    const rejectedFields = [];
    let fallbackReason = null;
    let policyBlockCount = 0;

    if (context.device_capability?.low_power_mode) {
      acceptedCommand.renderer_controls.particle_count = Math.min(acceptedCommand.renderer_controls.particle_count, 2000);
      acceptedCommand.renderer_controls.runtime_profile = 'low_power';
      rejectedFields.push('renderer_controls.particle_count', 'renderer_controls.runtime_profile');
      fallbackReason = 'device_low_power_mode';
    }

    if ((acceptedCommand.intent_state.flow_direction === 'centripetal' || acceptedCommand.intent_state.flow_direction === 'centrifugal') &&
      context.device_capability?.motion_sensor_permission && context.device_capability.motion_sensor_permission !== 'granted') {
      acceptedCommand.intent_state.flow_direction = 'still';
      acceptedCommand.renderer_controls.flow_field = 'still';
      rejectedFields.push('intent_state.flow_direction', 'renderer_controls.flow_field');
      fallbackReason = fallbackReason ?? 'sensor_permission_denied';
    }

    if (acceptedCommand.intent_state.palette?.primary?.toUpperCase?.() === '#DC143C' && !runtime.emergency_override) {
      acceptedCommand.intent_state.palette.primary = '#FF8800';
      policyBlockCount += 1;
      rejectedFields.push('intent_state.palette.primary');
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
        coherence_target: clamp(runtime.field_recipe?.coherence_target ?? 0.5, 0, 1),
        turbulence: acceptedCommand.intent_state.turbulence,
        flow_magnitude: acceptedCommand.intent_state.velocity,
      },
      visual_recipe: {
        ...runtime.visual_recipe,
        luminance: acceptedCommand.intent_state.glow_intensity,
      },
    };

    return {
      accepted_command: acceptedCommand,
      rejected_fields: rejectedFields,
      fallback_reason: fallbackReason,
      policy_block_count: policyBlockCount,
      last_accepted_command: context.last_accepted_command ?? null,
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

module.exports = { ControlHandlerV3, RuntimeGovernor };
