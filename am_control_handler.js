class RuntimeGovernor {
  constructor({ maxTargets = 14000, maxParticleEnergy = 1.4 } = {}) {
    this.maxTargets = maxTargets;
    this.maxParticleEnergy = maxParticleEnergy;
  }

  sanitize(control = {}, runtime = {}) {
    return {
      ...runtime,
      constraints: {
        max_targets: Math.min(control.constraints?.max_targets ?? this.maxTargets, this.maxTargets),
        max_particle_energy: Math.min(control.safety?.max_particle_energy ?? this.maxParticleEnergy, this.maxParticleEnergy),
      },
      field_recipe: {
        ...runtime.field_recipe,
        coherence_target: clamp(runtime.field_recipe?.coherence_target ?? 0.5, 0, 1),
        turbulence: clamp(runtime.field_recipe?.turbulence ?? 0.2, 0, 0.85),
        flow_magnitude: clamp(runtime.field_recipe?.flow_magnitude ?? 0.4, 0, 1),
      },
      visual_recipe: {
        ...runtime.visual_recipe,
        luminance: clamp(runtime.visual_recipe?.luminance ?? 0.8, 0, 1),
      },
    };
  }
}

class ControlHandlerV3 {
  constructor({ kernel, shapeCompiler, intentInterpreter, formationRetriever }) {
    this.kernel = kernel;
    this.shapeCompiler = shapeCompiler;
    this.intentInterpreter = intentInterpreter;
    this.formationRetriever = formationRetriever;
  }

  compileTargetField(renderMode, control, maxTargets) {
    switch (renderMode) {
      case 'shape_field':
        return this.shapeCompiler.compileShapeField(control, maxTargets);
      case 'scene_field':
        return this.shapeCompiler.compileSceneField(control, maxTargets);
      case 'motion_field':
      default:
        return this.shapeCompiler.compileMotionField(control, Math.max(200, maxTargets ?? 200));
    }
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

module.exports = { ControlHandlerV3, RuntimeGovernor };
