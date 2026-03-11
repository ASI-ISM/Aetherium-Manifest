/**
 * Control Handler v3.1
 * Middle-brain orchestration between user request and light runtime.
 *
 * Pipeline:
 * User Request -> Intent Interpreter -> Formation Retriever -> Morphology Compiler -> Runtime Governor -> Kernel
 */

class RuntimeGovernor {
  constructor(options = {}) {
    this.defaults = {
      maxTargets: 14000,
      maxParticleEnergy: 1.4,
      maxLuminance: 1.0,
      maxTurbulence: 0.85,
      ...options,
    };
  }

  sanitize(packet = {}, runtimeControl = {}) {
    const constraints = packet.constraints || {};
    const safety = packet.safety || {};

    const limitTargets = Number.isFinite(constraints.max_targets)
      ? constraints.max_targets
      : (Number.isFinite(constraints.max_particles) ? constraints.max_particles : this.defaults.maxTargets);

    const maxTargets = clamp(limitTargets, 100, this.defaults.maxTargets);
    const maxParticleEnergy = clamp(
      Number.isFinite(safety.max_particle_energy) ? safety.max_particle_energy : this.defaults.maxParticleEnergy,
      0.2,
      this.defaults.maxParticleEnergy,
    );

    const fieldRecipe = runtimeControl.field_recipe || {};
    fieldRecipe.coherence_target = clamp(fieldRecipe.coherence_target ?? packet.motion?.coherence_target ?? 0.6, 0, 1);
    fieldRecipe.turbulence = clamp(fieldRecipe.turbulence ?? packet.field?.turbulence ?? 0.2, 0, this.defaults.maxTurbulence);
    fieldRecipe.flow_magnitude = clamp(fieldRecipe.flow_magnitude ?? 0.4, 0, 1);
    fieldRecipe.vorticity = clamp(fieldRecipe.vorticity ?? 0, -1, 1);

    const visualRecipe = runtimeControl.visual_recipe || {};
    visualRecipe.glow_strength = clamp(visualRecipe.glow_strength ?? packet.optics?.glow ?? 0.6, 0, 1);
    visualRecipe.luminance = clamp(visualRecipe.luminance ?? packet.optics?.luminance ?? 0.8, 0, this.defaults.maxLuminance);

    runtimeControl.constraints = {
      ...runtimeControl.constraints,
      max_targets: maxTargets,
      max_particle_energy: maxParticleEnergy,
    };
    runtimeControl.field_recipe = fieldRecipe;
    runtimeControl.visual_recipe = visualRecipe;

    return runtimeControl;
  }
}

class ControlHandlerV3 {
  constructor({ kernel, shapeCompiler, evaluator, intentInterpreter, formationRetriever, runtimeGovernor } = {}) {
    this.kernel = kernel;
    this.shapeCompiler = shapeCompiler;
    this.evaluator = evaluator;
    this.intentInterpreter = intentInterpreter;
    this.formationRetriever = formationRetriever;
    this.runtimeGovernor = runtimeGovernor || new RuntimeGovernor();

    this.currentControl = null;
    this.loopActive = false;
  }

  /**
   * Main entry: process user request and drive runtime through LCL packet.
   */
  async handleUserLightRequest(userText) {
    if (!this.intentInterpreter || !this.formationRetriever || !this.kernel || !this.shapeCompiler) {
      throw new Error("ControlHandlerV3 missing required dependencies");
    }

    const intentPacket = await this.intentInterpreter.parse_user_request(userText);
    const runtimeControl = this.formationRetriever.compile_morphology_to_runtime_control(intentPacket);
    const safeRuntimeControl = this.runtimeGovernor.sanitize(intentPacket, runtimeControl);

    this.applyRuntimeControl(intentPacket, safeRuntimeControl);

    if (intentPacket.reference?.evaluation_mode !== "off" && this.evaluator) {
      this.startEvaluationLoop(intentPacket);
    }

    return { intentPacket, runtimeControl: safeRuntimeControl };
  }

  applyRuntimeControl(intentPacket, runtimeControl) {
    const renderMode = runtimeControl.render_mode || "shape_field";
    const maxTargets = runtimeControl.constraints?.max_targets || 12000;

    this.kernel.targetType = intentPacket.morphology?.family || renderMode;
    this.kernel.targetField = this.compileTargetField(renderMode, intentPacket, maxTargets);

    const fieldRecipe = runtimeControl.field_recipe || {};
    this.kernel.coherence = fieldRecipe.coherence_target;
    this.kernel.turbulence = fieldRecipe.turbulence;
    this.kernel.flowMag = fieldRecipe.flow_magnitude;
    this.kernel.vorticity = fieldRecipe.vorticity;

    const timing = runtimeControl.timing_envelope || {};
    this.kernel.attackMs = timing.attack_ms ?? 900;
    this.kernel.holdMs = timing.hold_ms ?? 1800;
    this.kernel.releaseMs = timing.release_ms ?? 1200;

    const visual = runtimeControl.visual_recipe || {};
    this.kernel.primaryColor = visual.primary_color || "#FFFFFF";
    this.kernel.secondaryColor = visual.secondary_color || "#888888";
    this.kernel.glowStrength = visual.glow_strength ?? 0.6;
    this.kernel.luminance = visual.luminance ?? 0.8;

    this.applyMotionBias(intentPacket.motion_bias || runtimeControl.motion_bias || {});

    if (typeof this.kernel.transitionTo === "function") {
      this.kernel.transitionTo("MANIFEST", {
        intent: intentPacket.intent,
        morphology: intentPacket.morphology,
        motion: intentPacket.motion,
        optics: intentPacket.optics,
      });
    }

    this.currentControl = intentPacket;
  }

  compileTargetField(renderMode, control, maxTargets) {
    switch (renderMode) {
      case "shape_field":
      case "particle_sdf_proxy":
        return this.shapeCompiler.compileShapeField(control, maxTargets);
      case "scene_field":
      case "radiance_proxy":
      case "particle_volumetric":
        return this.shapeCompiler.compileSceneField(control, maxTargets);
      case "motion_field":
      case "particle_shatter":
        return this.shapeCompiler.compileMotionField(control, maxTargets);
      default:
        return this.shapeCompiler.compileShapeField(control, maxTargets);
    }
  }

  applyMotionBias(motionBias) {
    if (!motionBias || !this.kernel) return;

    this.kernel.rhythmHz = clamp(motionBias.rhythm_hz ?? this.kernel.rhythmHz ?? 0.2, 0.05, 4);
    this.kernel.attackBias = clamp(motionBias.attack ?? this.kernel.attackBias ?? 0.5, 0, 1);
    this.kernel.settlingBias = clamp(motionBias.settling ?? this.kernel.settlingBias ?? 0.5, 0, 1);
    this.kernel.driftBias = clamp(motionBias.drift ?? this.kernel.driftBias ?? 0.1, 0, 1);
    this.kernel.collapseTendency = clamp(motionBias.collapse_tendency ?? this.kernel.collapseTendency ?? 0.05, 0, 1);
  }

  startEvaluationLoop(intentPacket) {
    if (this.loopActive) return;

    const evaluationInterval = 30;
    let frameCounter = 0;
    this.loopActive = true;

    const evalLoop = () => {
      if (!this.kernel?.isManifesting) {
        this.loopActive = false;
        return;
      }

      frameCounter += 1;
      if (frameCounter % evaluationInterval === 0 && typeof this.kernel.captureFramebuffer === "function") {
        const framebuffer = this.kernel.captureFramebuffer();
        const metrics = this.evaluator.evaluate_light_manifestation(
          framebuffer,
          intentPacket.intent?.user_request || "",
          intentPacket,
        );
        const adjustments = this.evaluator.suggest_runtime_adjustments(metrics);
        this.applyAdjustments(adjustments);
      }

      requestAnimationFrame(evalLoop);
    };

    requestAnimationFrame(evalLoop);
  }

  applyAdjustments(adjustments = {}) {
    if (adjustments.coherence !== undefined) {
      this.kernel.coherence = clamp(this.kernel.coherence + adjustments.coherence, 0, 1);
    }
    if (adjustments.glow_strength !== undefined) {
      this.kernel.glowStrength = clamp(this.kernel.glowStrength + adjustments.glow_strength, 0, 1);
    }
    if (adjustments.luminance !== undefined) {
      this.kernel.luminance = clamp(this.kernel.luminance + adjustments.luminance, 0, 1);
    }
    if (adjustments.turbulence !== undefined) {
      this.kernel.turbulence = clamp(this.kernel.turbulence + adjustments.turbulence, 0, 0.85);
    }
    if (adjustments.flow_magnitude !== undefined) {
      this.kernel.flowMag = clamp(this.kernel.flowMag + adjustments.flow_magnitude, 0, 1);
    }
    if (adjustments.noise_level !== undefined) {
      this.kernel.noiseLevel = clamp((this.kernel.noiseLevel || 0) + adjustments.noise_level, 0, 1);
    }
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { ControlHandlerV3, RuntimeGovernor };
}
