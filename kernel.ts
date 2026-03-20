import {
  interpretWithBackendLLM,
  normalizeLCL,
} from './light-control-language.ts';
import type { LightControlLanguage } from './light-control-language.ts';
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
  private force = 0.0;
  private flowMag = 0.8;
  private noiseMax = 5.0;
  private damp = 0.92;

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
      console.error("Error handling user light request:", error);
      // Optionally, update the UI to show an error state.
    }
  }

  resetToVoid(): void {
    this.pipelineRevision++; // Invalidate any pending operations
    this.lcl = null;
    this.compiledField = null;
    this.initParticles(); // Reset photons to a default state
    // The render loop will naturally fade to the void state.
    console.log("Kernel reset to void.");
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
    // Production: Create buffers, programs, glow pass framebuffer, and ping-pong accumulation.
  }

  private applyLCL(lcl: LightControlLanguage): void {
    this.lcl = lcl;
    this.coherence = lcl.runtime_bias?.coherenceStart ?? 0.12;
    this.coherenceTarget = lcl.motion.coherence_target;
    this.force = 0.15 * (lcl.runtime_bias?.forceBias ?? 1.0);
    this.flowMag = 0.7 * (lcl.runtime_bias?.flowBias ?? 1.0);
    this.noiseMax = 5.0 * (lcl.runtime_bias?.noiseBias ?? 0.6);

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
    if (!this.compiledField || this.compiledField.points.length === 0) {
        // If there's no field, let particles drift and fade.
        for (const photon of this.photons) {
            photon.vel[0] *= 0.95;
            photon.vel[1] *= 0.95;
            photon.pos[0] += photon.vel[0];
            photon.pos[1] += photon.vel[1];
            photon.color[0] *= 0.97;
            photon.color[1] *= 0.97;
            photon.color[2] *= 0.97;
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
      const pull = Math.min(dist * 0.05, 5) * this.force;

      const flow = this.sampleFlowField(photon.pos[0], photon.pos[1]);
      const noiseGain = (1 - this.coherence) * this.noiseMax;

      photon.vel[0] = (photon.vel[0] + (dx / dist) * pull + flow[0] + (Math.random() - 0.5) * noiseGain) * this.damp;
      photon.vel[1] = (photon.vel[1] + (dy / dist) * pull + flow[1] + (Math.random() - 0.5) * noiseGain) * this.damp;
      photon.pos[0] += photon.vel[0];
      photon.pos[1] += photon.vel[1];

      photon.color[0] += (target.color[0] - photon.color[0]) * 0.1;
      photon.color[1] += (target.color[1] - photon.color[1]) * 0.1;
      photon.color[2] += (target.color[2] - photon.color[2]) * 0.1;
    }
  }

  private sampleFlowField(x: number, y: number): [number, number] {
    const mode = this.lcl?.motion.flow_mode ?? 'calm_drift';
    const { width, height } = this.viewport;
    const cx = width * 0.5;
    const cy = height * 0.5;
    const localRhythm = (this.lcl?.motion.rhythm_hz ?? 0.1) * 6.28318;

    if (mode === 'upward_spiral') {
      const angle = Math.sin(x * 0.0025 + this.time * localRhythm) + Math.cos(y * 0.003 - this.time * 0.4);
      return [Math.cos(angle) * this.flowMag * 0.7, -this.flowMag * 0.65 + Math.sin(angle) * this.flowMag * 0.3];
    }

    if (mode === 'orbit') {
      const dx = x - cx;
      const dy = y - cy;
      const len = Math.hypot(dx, dy) || 1;
      return [(-dy / len) * this.flowMag, (dx / len) * this.flowMag];
    }

    if (mode === 'radial') {
      const dx = x - cx;
      const dy = y - cy;
      const len = Math.hypot(dx, dy) || 1;
      return [(dx / len) * this.flowMag * 0.6, (dy / len) * this.flowMag * 0.6];
    }

    if (mode === 'ribbon') {
      return [Math.sin(y * 0.01 + this.time * localRhythm) * this.flowMag, Math.cos(x * 0.004 - this.time * localRhythm) * this.flowMag * 0.35];
    }

    return [Math.sin(y * 0.006 + this.time * localRhythm) * this.flowMag * 0.55, Math.cos(x * 0.005 - this.time * localRhythm) * this.flowMag * 0.45];
  }

  private renderFrame(): void {
    this.time += 0.016;
    this.frameCounter += 1;
    this.updatePhotons();

    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Production: Upload photon positions/colors to GPU buffers and draw points.
    // Production: Render glow pass to FBO, then composite to screen.
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
          this.flowMag,
          this.noiseMax,
        );

        this.coherence = next.coherence;
        this.flowMag = next.flowMag;
        this.noiseMax = next.noiseMax;
    } catch (error) {
        console.warn("Perceptual feedback failed:", error);
    }
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
