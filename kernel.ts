import {
  interpretWithBackendLLM,
  normalizeLCL,
} from './light-control-language.ts';
import type { LightControlLanguage, ParticleControlContract } from './light-control-language.ts';
import {
  loadFormationBundle,
  mergeRetrievedFormation,
  retrieveFormation,
} from './formation-retriever.ts';
import {
  compileGlyphFieldFromAlphaMask,
  compileShapeField,
} from './shape-compiler.ts';
import type { CompiledField, Viewport } from './shape-compiler.ts';
import {
  BioVisionRemoteEvaluator,
  EdgeAwareLocalEvaluator,
  feedbackAdjustments,
} from './perceptual-feedback.ts';
import type { PerceptualEvaluator } from './perceptual-feedback.ts';

export interface KernelConfig {
  apiBaseUrl: string;
  formationBaseUrl: string;
  canvas: HTMLCanvasElement;
  maxPhotons?: number;
  maxTargets?: number;
  evaluatorMode?: 'remote' | 'local';
}

interface Photon {
  pos: [number, number];
  vel: [number, number];
  color: [number, number, number];
  targetIndex: number;
  retargetCooldown: number;
}

interface PhotonMotionState {
  attractorForce: number;
  flow: [number, number];
  turbulence: number;
  damping: number;
  glowBlend: number;
  flicker: number;
}

interface PhotonDriftState {
  damping: number;
  glowFade: number;
}

interface RendererState {
  glowIntensity: number;
  flicker: number;
}

const STATE_PROFILES: Record<string, Partial<ParticleControlContract>> = {
  IDLE: { velocity: 0.08, turbulence: 0.04, cohesion: 0.92, flow_direction: 'still', glow_intensity: 0.28, flicker: 0.01, attractor: 'core' },
  LISTENING: { velocity: 0.16, turbulence: 0.08, cohesion: 0.84, flow_direction: 'clockwise', glow_intensity: 0.38, flicker: 0.03, attractor: 'orbit' },
  GENERATING: { velocity: 0.58, turbulence: 0.34, cohesion: 0.56, flow_direction: 'clockwise', glow_intensity: 0.66, flicker: 0.10, attractor: 'axis' },
  THINKING: { velocity: 0.46, turbulence: 0.24, cohesion: 0.68, flow_direction: 'counterclockwise', glow_intensity: 0.58, flicker: 0.06, attractor: 'core' },
  CONFIRMING: { velocity: 0.22, turbulence: 0.10, cohesion: 0.82, flow_direction: 'inward', glow_intensity: 0.54, flicker: 0.03, attractor: 'core' },
  RESPONDING: { velocity: 0.52, turbulence: 0.18, cohesion: 0.72, flow_direction: 'outward', glow_intensity: 0.72, flicker: 0.07, attractor: 'halo' },
  WARNING: { velocity: 0.20, turbulence: 0.12, cohesion: 0.88, flow_direction: 'still', glow_intensity: 0.70, flicker: 0.02, attractor: 'core' },
  ERROR: { velocity: 0.12, turbulence: 0.06, cohesion: 0.94, flow_direction: 'still', glow_intensity: 0.82, flicker: 0.00, attractor: 'core' },
  STABILIZED: { velocity: 0.14, turbulence: 0.05, cohesion: 0.90, flow_direction: 'still', glow_intensity: 0.40, flicker: 0.01, attractor: 'core' },
  NIRODHA: { velocity: 0.02, turbulence: 0.01, cohesion: 0.98, flow_direction: 'still', glow_intensity: 0.12, flicker: 0.00, attractor: 'none' },
  SENSOR_PENDING_PERMISSION: { velocity: 0.10, turbulence: 0.03, cohesion: 0.90, flow_direction: 'still', glow_intensity: 0.34, flicker: 0.02, attractor: 'core' },
  SENSOR_ACTIVE: { velocity: 0.42, turbulence: 0.20, cohesion: 0.70, flow_direction: 'centripetal', glow_intensity: 0.60, flicker: 0.05, attractor: 'axis' },
  SENSOR_UNAVAILABLE: { velocity: 0.08, turbulence: 0.02, cohesion: 0.93, flow_direction: 'still', glow_intensity: 0.30, flicker: 0.01, attractor: 'core' },
};

export class ParticleControlSurface {
  private readonly viewport: Viewport;
  private readonly time: number;
  private readonly control: ParticleControlContract;
  private readonly rhythm: number;
  private readonly coherence: number;
  readonly renderer: RendererState;
  readonly drift: PhotonDriftState;

  constructor(control: ParticleControlContract, viewport: Viewport, time: number, coherence: number) {
    const profile = STATE_PROFILES[String(control.state ?? 'IDLE').toUpperCase()] ?? STATE_PROFILES.IDLE;
    this.control = {
      ...profile,
      ...control,
    };
    this.viewport = viewport;
    this.time = time;
    this.coherence = clamp(coherence, 0, 1);
    this.rhythm = (this.control.rhythm_hz ?? 0.1) * Math.PI * 2;
    this.renderer = {
      glowIntensity: clamp(this.control.glow_intensity, 0, 1),
      flicker: clamp(this.control.flicker, 0, 1),
    };
    this.drift = {
      damping: 0.86 + (this.coherence * 0.08),
      glowFade: 0.94 + (this.renderer.glowIntensity * 0.04),
    };
  }

  static fromLCL(lcl: LightControlLanguage, viewport: Viewport, time: number, coherence: number): ParticleControlSurface {
    return new ParticleControlSurface(lcl.particle_control, viewport, time, coherence);
  }

  nextPhotonState(photon: Photon, target: CompiledField['points'][number]): PhotonMotionState {
    const dx = target.x - photon.pos[0];
    const dy = target.y - photon.pos[1];
    const dist = Math.hypot(dx, dy) || 1;
    const cohesion = clamp(this.control.cohesion, 0, 1);
    const velocity = clamp(this.control.velocity, 0, 1);
    const attractorForce = Math.min(dist * (0.03 + cohesion * 0.05), 1 + velocity * 6) * (0.25 + velocity * 0.75);

    return {
      attractorForce,
      flow: this.sampleFlowField(photon.pos[0], photon.pos[1]),
      turbulence: (1 - this.coherence) * (0.2 + this.control.turbulence * 5),
      damping: 0.84 + cohesion * 0.12,
      glowBlend: 0.04 + this.renderer.glowIntensity * 0.18,
      flicker: (Math.random() - 0.5) * this.renderer.flicker * 0.08,
    };
  }

  private sampleFlowField(x: number, y: number): [number, number] {
    const { width, height } = this.viewport;
    const cx = width * 0.5;
    const cy = height * 0.5;
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const velocity = 0.15 + this.control.velocity * 1.1;
    const turbulence = this.control.turbulence;
    const waveX = Math.sin(y * 0.006 + this.time * this.rhythm);
    const waveY = Math.cos(x * 0.005 - this.time * (this.rhythm * 0.8 + 0.2));
    const attractorSign = this.control.attractor === 'edge' ? -1 : 1;

    switch (this.control.flow_direction) {
      case 'clockwise':
      case 'orbit':
        return [(-dy / len) * velocity, (dx / len) * velocity];
      case 'counterclockwise':
        return [(dy / len) * velocity, (-dx / len) * velocity];
      case 'inward':
      case 'centripetal':
        return [(-dx / len) * velocity * attractorSign, (-dy / len) * velocity * attractorSign];
      case 'outward':
      case 'centrifugal':
        return [(dx / len) * velocity * attractorSign, (dy / len) * velocity * attractorSign];
      case 'upward':
        return [waveX * velocity * 0.25, -velocity + waveY * turbulence * 0.35];
      case 'ribbon':
        return [waveX * velocity, waveY * velocity * 0.35];
      case 'still':
        return [0, 0];
      default:
        return [waveX * velocity * (0.4 + turbulence * 0.3), waveY * velocity * (0.35 + turbulence * 0.25)];
    }
  }
}

export class AetheriumKernel {
  private readonly gl: WebGL2RenderingContext;
  private readonly config: Required<KernelConfig>;
  private readonly evaluator: PerceptualEvaluator;

  private formationBundlePromise: ReturnType<typeof loadFormationBundle>;
  private lcl: LightControlLanguage | null = null;
  private compiledField: CompiledField | null = null;
  private photons: Photon[] = [];
  private animationHandle = 0;
  private pipelineRevision = 0;
  private time = 0;
  private frameCounter = 0;

  private coherence = 0.1;
  private coherenceTarget = 0.1;
  private controlSurface: ParticleControlSurface | null = null;

  constructor(config: KernelConfig) {
    this.config = {
      ...config,
      maxPhotons: config.maxPhotons ?? 7000,
      maxTargets: config.maxTargets ?? 14000,
      evaluatorMode: config.evaluatorMode ?? 'remote',
    };

    const gl = config.canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!gl) throw new Error('WebGL2 is required for AetheriumKernel');
    this.gl = gl;

    this.evaluator = this.config.evaluatorMode === 'remote'
      ? new BioVisionRemoteEvaluator(this.config.apiBaseUrl)
      : new EdgeAwareLocalEvaluator();

    this.formationBundlePromise = loadFormationBundle(this.config.formationBaseUrl);
    this.initParticles();
    this.initRenderer();
  }

  async handleUserLightRequest(userText: string): Promise<void> {
    const rev = ++this.pipelineRevision;
    const viewport = this.viewport;

    try {
      const raw = await interpretWithBackendLLM(
        this.config.apiBaseUrl,
        {
          userText,
          viewport,
          limits: {
            maxTargets: this.config.maxTargets,
            maxPhotons: this.config.maxPhotons,
            maxEnergy: 1.8,
          },
        },
      );
      if (rev !== this.pipelineRevision) return;

      const bundle = await this.formationBundlePromise;
      if (rev !== this.pipelineRevision) return;

      const retrieved = retrieveFormation(bundle, raw);
      const enriched = normalizeLCL(mergeRetrievedFormation(raw, retrieved));

      this.applyLCL(enriched);
    } catch (error) {
      console.error('Error handling user light request:', error);
    }
  }

  resetToVoid(): void {
    this.pipelineRevision++;
    this.lcl = null;
    this.compiledField = null;
    this.controlSurface = null;
    this.initParticles();
    console.log('Kernel reset to void.');
  }

  getLCLSchema(): LightControlLanguage | null {
    return this.lcl;
  }

  start(): void {
    cancelAnimationFrame(this.animationHandle);
    const tick = async () => {
      this.renderFrame();
      if (this.frameCounter % 24 === 0) await this.runPerceptualFeedback();
      this.animationHandle = requestAnimationFrame(tick);
    };
    this.animationHandle = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.animationHandle);
  }

  resize(width: number, height: number): void {
    this.config.canvas.width = width;
    this.config.canvas.height = height;
    this.gl.viewport(0, 0, width, height);

    if (this.lcl) {
      this.applyLCL(this.lcl);
    }
  }

  private get viewport(): Viewport {
    return {
      width: this.config.canvas.width || this.config.canvas.clientWidth || window.innerWidth,
      height: this.config.canvas.height || this.config.canvas.clientHeight || window.innerHeight,
    };
  }

  private initParticles(): void {
    const { width, height } = this.viewport;
    this.photons = Array.from({ length: this.config.maxPhotons }, () => ({
      pos: [Math.random() * width, Math.random() * height],
      vel: [0, 0],
      color: [0.08, 0.09, 0.12],
      targetIndex: 0,
      retargetCooldown: Math.random() * 60,
    }));
  }

  private initRenderer(): void {
    const gl = this.gl;
    gl.clearColor(0.01, 0.01, 0.015, 1.0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
  }

  private applyLCL(lcl: LightControlLanguage): void {
    this.lcl = lcl;
    this.coherence = lcl.particle_control.cohesion;
    this.coherenceTarget = lcl.motion.coherence_target;
    this.controlSurface = ParticleControlSurface.fromLCL(lcl, this.viewport, this.time, this.coherence);

    if (lcl.intent === 'create_glyph') {
      const alphaMask = this.renderGlyphToAlphaMask(lcl.content.text ?? 'AETHERIUM');
      this.compiledField = compileGlyphFieldFromAlphaMask(
        alphaMask,
        this.viewport,
        lcl.optics.palette[0] ?? '#FFFFFF',
      );
    } else {
      this.compiledField = compileShapeField(lcl, this.viewport);
    }
  }

  private renderGlyphToAlphaMask(text: string): Uint8Array {
    const { width, height } = this.viewport;
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) throw new Error('Failed to create glyph mask canvas');

    ctx.clearRect(0, 0, width, height);
    const fontSize = Math.min(width / Math.max(text.length, 4) * 1.3, 160);
    ctx.font = `800 ${fontSize}px JetBrains Mono`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, width * 0.5, height * 0.5);

    const rgba = ctx.getImageData(0, 0, width, height).data;
    const alpha = new Uint8Array(width * height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
    return alpha;
  }

  private updatePhotons(): void {
    const controlSurface = this.controlSurface;
    if (!controlSurface || !this.compiledField || this.compiledField.points.length === 0) {
      for (const photon of this.photons) {
        photon.vel[0] *= controlSurface?.drift.damping ?? 0.95;
        photon.vel[1] *= controlSurface?.drift.damping ?? 0.95;
        photon.pos[0] += photon.vel[0];
        photon.pos[1] += photon.vel[1];
        photon.color[0] *= controlSurface?.drift.glowFade ?? 0.97;
        photon.color[1] *= controlSurface?.drift.glowFade ?? 0.97;
        photon.color[2] *= controlSurface?.drift.glowFade ?? 0.97;
      }
      return;
    }

    const points = this.compiledField.points;

    for (let i = 0; i < this.photons.length; i++) {
      const photon = this.photons[i];

      if (photon.retargetCooldown <= 0) {
        const base = (i * 17 + Math.floor(this.time * 8)) % points.length;
        const jitter = Math.floor((Math.random() - 0.5) * 12);
        photon.targetIndex = clamp(base + jitter, 0, points.length - 1);
        photon.retargetCooldown = 15 + Math.random() * 35;
      } else {
        photon.retargetCooldown -= 1;
      }

      const target = points[photon.targetIndex] ?? points[i % points.length];
      if (!target) continue;

      const dx = target.x - photon.pos[0];
      const dy = target.y - photon.pos[1];
      const dist = Math.hypot(dx, dy) || 1;
      const state = controlSurface.nextPhotonState(photon, target);

      photon.vel[0] = (photon.vel[0] + (dx / dist) * state.attractorForce + state.flow[0] + (Math.random() - 0.5) * state.turbulence) * state.damping;
      photon.vel[1] = (photon.vel[1] + (dy / dist) * state.attractorForce + state.flow[1] + (Math.random() - 0.5) * state.turbulence) * state.damping;
      photon.pos[0] += photon.vel[0];
      photon.pos[1] += photon.vel[1];

      photon.color[0] += (target.color[0] - photon.color[0]) * state.glowBlend + state.flicker;
      photon.color[1] += (target.color[1] - photon.color[1]) * state.glowBlend + state.flicker;
      photon.color[2] += (target.color[2] - photon.color[2]) * state.glowBlend + state.flicker;
    }
  }

  private renderFrame(): void {
    this.time += 0.016;
    if (this.lcl) {
      this.controlSurface = ParticleControlSurface.fromLCL(this.lcl, this.viewport, this.time, this.coherence);
    }
    this.frameCounter += 1;
    this.updatePhotons();

    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Production renderer boundary: upload the photon buffer to Canvas/WebGL/etc.
    // Motion and behavior rules remain in ParticleControlSurface, so the renderer can swap independently.
  }

  private async runPerceptualFeedback(): Promise<void> {
    if (!this.compiledField || !this.lcl) return;

    const { width, height } = this.viewport;
    const pixels = new Uint8Array(width * height * 4);
    this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);

    const photonSample = this.photons.slice(0, Math.min(this.photons.length, 2000)).map((p) => ({
      x: p.pos[0],
      y: p.pos[1],
      vx: p.vel[0],
      vy: p.vel[1],
    }));

    try {
      const metrics = await this.evaluator.evaluate(
        { width, height, rgba: pixels },
        this.compiledField,
        photonSample,
      );

      const next = feedbackAdjustments(
        metrics,
        this.coherence,
        this.lcl.motion.coherence_target,
        this.lcl.particle_control.velocity,
        0.2 + this.lcl.particle_control.turbulence * 5,
      );

      this.coherence = next.coherence;
      const nextVelocity = clamp(next.flowMag / 1.1, 0, 1);
      const nextTurbulence = clamp((next.noiseMax - 0.2) / 5, 0, 1);
      this.lcl = {
        ...this.lcl,
        particle_control: {
          ...this.lcl.particle_control,
          velocity: nextVelocity,
          turbulence: nextTurbulence,
          cohesion: next.coherence,
        },
      };
      this.controlSurface = ParticleControlSurface.fromLCL(this.lcl, this.viewport, this.time, this.coherence);
    } catch (error) {
      console.warn('Perceptual feedback failed:', error);
    }
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
