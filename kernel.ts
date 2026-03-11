import { generateLightControlLanguage } from './light-control-language';
import { FormationRetriever, mergeFormationWithLCL } from './formation-retriever';
import { compileShapeField, compileGlyphField, compileSceneField } from './shape-compiler';
import { perceptualFeedbackLoop } from './perceptual-feedback';
import { RendererWebGL } from './renderer-webgl';

const display = document.getElementById('display-layer') as HTMLCanvasElement;
const ctx = display.getContext('2d', { alpha: false });
let webglRenderer: RendererWebGL | null = null;
const memCanvas = document.getElementById('memory-layer') as HTMLCanvasElement;
const memCtx = memCanvas.getContext('2d', { willReadFrequently: true });

let W = 0, H = 0, CX = 0, CY = 0;
const NUM_PHOTONS = 7000;
let photons: Photon[] = [];
let targetField: { x: number, y: number, color: number[] }[] = [];
let lastLCL: any = null;
let renderTime = 0;
let frameCounter = 0;
let pipelineRevision = 0;

const LCL_SCHEMA = {
      version: '3.0',
      intent: 'create_light_form | create_glyph | create_scene',
      morphology: {
        family: 'sphere | spiral_vortex | flower_shell | wave_ribbon | fracture_ring | glyph | radiance_scene',
        symmetry: 'number',
        density: '0..1',
        scale: '0..1',
        edge_softness: '0..1'
      },
      motion: {
        archetype: 'emergence | stabilization | dissolution | reasoning | fracture | bloom',
        flow_mode: 'radial | upward_spiral | orbit | ribbon | fracture_out | calm_drift',
        coherence_target: '0..1',
        turbulence: '0..1',
        rhythm_hz: '0..2',
        attack_ms: 'number',
        settle_ms: 'number'
      },
      optics: {
        palette: ['#hex', '#hex'],
        luminance_boost: '0..3',
        glow_alpha: '0..1',
        trail_alpha: '0..1',
        color_mode: 'monochrome | palette | source_radiance'
      },
      content: {
        text: 'optional string for glyph mode',
        scene_recipe: 'optional scene recipe object'
      },
      constraints: {
        max_targets: 'integer',
        max_photons: 'integer',
        max_energy: '0..3'
      }
    };

export const Kernel = {
      state: 'IDLE',
      renderMode: 'void',
      archetype: 'none',
      coherence: 0.1,
      coherenceTarget: 0.1,
      force: 0.0,
      flowMag: 1.0,
      noiseMax: 5.0,
      damp: 0.92,
      glowAlpha: 0.6,
      trailAlpha: 0.18,
      luminanceBoost: 1.0,
      turbulence: 0.4,
      rhythmHz: 0.1,
      readability: 0,
      coverage: 0,
      stability: 0,
      lastCentroid: null
    };

function resize() {
      const oldW = W || window.innerWidth;
      const oldH = H || window.innerHeight;
      W = display.width = window.innerWidth;
      H = display.height = window.innerHeight;
      memCanvas.width = W;
      memCanvas.height = H;
      CX = W * 0.5;
      CY = H * 0.5;

      if (photons.length > 0) {
        const sx = W / oldW;
        const sy = H / oldH;
        photons.forEach(p => {
          p.pos.x *= sx; p.pos.y *= sy;
          p.vel.x *= sx; p.vel.y *= sy;
        });
        if (lastLCL) {
          applyLCL(lastLCL, false);
        }
      }
    }

window.addEventListener('resize', resize);

function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

function hexToLinear(hex: string): number[] {
      const x = hex.replace('#', '');
      const full = x.length === 3 ? x.split('').map(c => c + c).join('') : x;
      const r = parseInt(full.slice(0, 2), 16);
      const g = parseInt(full.slice(2, 4), 16);
      const b = parseInt(full.slice(4, 6), 16);
      return [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
    }

function srgbToLinear(c: number): number {
      const v = c / 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }

function toneMapACES(x: number): number {
      return (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
    }

function linearToSrgb(c: number): number {
      const mapped = toneMapACES(Math.max(0, c));
      const v = mapped <= 0.0031308 ? 12.92 * mapped : 1.055 * Math.pow(mapped, 1 / 2.4) - 0.055;
      return clamp(Math.floor(v * 255), 0, 255);
    }

class Photon {
      id: number;
      pos: { x: number; y: number; };
      vel: { x: number; y: number; };
      color: number[];
      targetIndex: number;
      retargetCooldown: number;

      constructor(id: number) {
        this.id = id;
        this.pos = { x: Math.random() * W, y: Math.random() * H };
        this.vel = { x: 0, y: 0 };
        this.color = [0.08, 0.09, 0.12];
        this.targetIndex = 0;
        this.retargetCooldown = Math.random() * 80;
      }

      update(time: number) {
        let fx = 0, fy = 0;
        let targetColor = [0.08, 0.09, 0.12];

        if (targetField.length > 0 && Kernel.force > 0) {
          if (this.retargetCooldown <= 0) {
            const base = (this.id * 17 + Math.floor(time * 8)) % targetField.length;
            const jitter = Math.floor((Math.random() - 0.5) * 12);
            this.targetIndex = clamp(base + jitter, 0, targetField.length - 1);
            this.retargetCooldown = 15 + Math.random() * 35;
          } else {
            this.retargetCooldown--;
          }

          const target = targetField[this.targetIndex];
          targetColor = target.color;

          const dx = target.x - this.pos.x;
          const dy = target.y - this.pos.y;
          const dist = Math.hypot(dx, dy) || 1;
          const pull = Math.min(dist * 0.05, 5) * Kernel.force;

          fx += (dx / dist) * pull;
          fy += (dy / dist) * pull;
        } else {
          const dx = CX - this.pos.x;
          const dy = CY - this.pos.y;
          fx += dx * 0.0001;
          fy += dy * 0.0001;
        }

        const flow = sampleFlowField(this.pos.x, this.pos.y, time);
        fx += flow.x;
        fy += flow.y;

        const noiseGain = (1 - Kernel.coherence) * Kernel.noiseMax;
        fx += (Math.random() - 0.5) * noiseGain;
        fy += (Math.random() - 0.5) * noiseGain;

        this.vel.x = (this.vel.x + fx) * Kernel.damp;
        this.vel.y = (this.vel.y + fy) * Kernel.damp;
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;

        if (targetField.length === 0) {
          if (this.pos.x < 0) this.pos.x = W;
          if (this.pos.x > W) this.pos.x = 0;
          if (this.pos.y < 0) this.pos.y = H;
          if (this.pos.y > H) this.pos.y = 0;
        }

        this.color[0] += (targetColor[0] - this.color[0]) * 0.1;
        this.color[1] += (targetColor[1] - this.color[1]) * 0.1;
        this.color[2] += (targetColor[2] - this.color[2]) * 0.1;
      }

      draw() {
        const r = linearToSrgb(this.color[0] * Kernel.luminanceBoost);
        const g = linearToSrgb(this.color[1] * Kernel.luminanceBoost);
        const b = linearToSrgb(this.color[2] * Kernel.luminanceBoost);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Kernel.glowAlpha})`;
        ctx.fillRect(this.pos.x, this.pos.y, 2, 2);
      }
    }

function sampleFlowField(x: number, y: number, t: number): { x: number, y: number } {
      const mode = lastLCL?.motion?.flow_mode || 'calm_drift';
      const localRhythm = Kernel.rhythmHz * 6.28318;

      if (mode === 'upward_spiral') {
        const angle = Math.sin(x * 0.0025 + t * localRhythm) + Math.cos(y * 0.003 - t * 0.4);
        return {
          x: Math.cos(angle) * Kernel.flowMag * 0.7,
          y: -Kernel.flowMag * 0.65 + Math.sin(angle) * Kernel.flowMag * 0.3
        };
      }

      if (mode === 'orbit') {
        const dx = x - CX;
        const dy = y - CY;
        const len = Math.hypot(dx, dy) || 1;
        return {
          x: (-dy / len) * Kernel.flowMag,
          y: (dx / len) * Kernel.flowMag
        };
      }

      if (mode === 'radial') {
        const dx = x - CX;
        const dy = y - CY;
        const len = Math.hypot(dx, dy) || 1;
        return {
          x: (dx / len) * Kernel.flowMag * 0.6,
          y: (dy / len) * Kernel.flowMag * 0.6
        };
      }

      if (mode === 'ribbon') {
        return {
          x: Math.sin(y * 0.01 + t * localRhythm) * Kernel.flowMag,
          y: Math.cos(x * 0.004 - t * localRhythm) * Kernel.flowMag * 0.35
        };
      }

      if (mode === 'fracture_out') {
        const dx = x - CX;
        const dy = y - CY;
        const len = Math.hypot(dx, dy) || 1;
        return {
          x: (dx / len) * Kernel.flowMag + (Math.random() - 0.5) * 0.2,
          y: (dy / len) * Kernel.flowMag + (Math.random() - 0.5) * 0.2
        };
      }

      return {
        x: Math.sin(y * 0.006 + t * localRhythm) * Kernel.flowMag * 0.55,
        y: Math.cos(x * 0.005 - t * localRhythm) * Kernel.flowMag * 0.45
      };
    }

function updateFSMUI() {
      document.querySelectorAll('.fsm-node').forEach(node => node.classList.remove('active'));
      const active = document.getElementById(`fsm-${Kernel.state}`);
      if (active) active.classList.add('active');

      document.getElementById('val-state').textContent = Kernel.state;
      document.getElementById('val-render').textContent = Kernel.renderMode;
      document.getElementById('val-arch').textContent = Kernel.archetype;
      document.getElementById('val-targets').textContent = targetField.length.toString();
      document.getElementById('val-coh').textContent = Kernel.coherence.toFixed(2);
      document.getElementById('val-flow').textContent = Kernel.flowMag.toFixed(2);
      document.getElementById('val-read').textContent = Kernel.readability.toFixed(2);
      document.getElementById('val-cover').textContent = Kernel.coverage.toFixed(2);
      document.getElementById('val-stab').textContent = Kernel.stability.toFixed(2);
    }

function setSchemaView(data: any) {
      document.getElementById('schema-view').textContent = typeof data === 'string'
        ? data
        : JSON.stringify(data, null, 2);
    }

function showSchema() {
      setSchemaView(LCL_SCHEMA);
    }

function resetToVoid() {
      pipelineRevision++;
      Kernel.state = 'IDLE';
      Kernel.renderMode = 'void';
      Kernel.archetype = 'none';
      Kernel.force = 0;
      Kernel.coherence = 0.1;
      Kernel.coherenceTarget = 0.1;
      Kernel.flowMag = 1.0;
      Kernel.noiseMax = 5.0;
      Kernel.glowAlpha = 0.55;
      Kernel.trailAlpha = 0.16;
      targetField = [];
      lastLCL = null;
      updateFSMUI();
    }

function quickPreset(type: string) {
      if (type === 'sphere') {
        (document.getElementById('txt-request') as HTMLTextAreaElement).value = 'สร้างทรงกลมสีฟ้าขาว สงบ สมดุล ค่อยๆ หายใจ';
      } else if (type === 'flower') {
        (document.getElementById('txt-request') as HTMLTextAreaElement).value = 'สร้างดอกไม้แสงสีชมพูทอง ค่อยๆ บานออกอย่างอ่อนโยน';
      } else if (type === 'vortex') {
        (document.getElementById('txt-request') as HTMLTextAreaElement).value = 'สร้างเกลียวแสงสีทองอมม่วง ลอยขึ้นเหมือนความคิดกำลังรวมศูนย์';
      } else if (type === 'fracture') {
        (document.getElementById('txt-request') as HTMLTextAreaElement).value = 'สร้างวงแหวนแสงสีแดงเข้มที่ค่อยๆ แตกร้าวและปลดปล่อยเศษแสงออกมา';
      }
      runUserRequest();
    }

async function runUserRequest() {
      const text = (document.getElementById('txt-request') as HTMLTextAreaElement).value.trim();
      if (!text) return;
      await handleUserLightRequest(text);
    }

async function handleUserLightRequest(userText: string) {
      const rev = ++pipelineRevision;

      Kernel.state = 'PARSE';
      updateFSMUI();

      const lcl = await generateLightControlLanguage(userText);
      if (rev !== pipelineRevision) return;
      setSchemaView(lcl);

      Kernel.state = 'RETRIEVE';
      updateFSMUI();

      const retrieved = await FormationRetriever(lcl);
      if (rev !== pipelineRevision) return;

      const enriched = mergeFormationWithLCL(lcl, retrieved);
      setSchemaView(enriched);
      applyLCL(enriched, true);
    }

function applyLCL(lcl: any, advanceState = true) {
      lastLCL = lcl;
      Kernel.archetype = lcl.motion.archetype;
      Kernel.renderMode = lcl.morphology.family;
      Kernel.glowAlpha = lcl.optics.glow_alpha;
      Kernel.trailAlpha = lcl.optics.trail_alpha;
      Kernel.luminanceBoost = clamp(lcl.optics.luminance_boost, 0.3, lcl.constraints.max_energy);
      Kernel.coherence = lcl.runtime_bias?.coherenceStart ?? 0.1;
      Kernel.coherenceTarget = lcl.motion.coherence_target;
      Kernel.force = 0.15;
      Kernel.flowMag = clamp((lcl.runtime_bias?.flowBias ?? 0.8), 0.15, 1.2);
      Kernel.noiseMax = clamp(5.0 * (lcl.motion.turbulence + 0.25) * (lcl.runtime_bias?.noiseBias ?? 1), 0.4, 6.5);
      Kernel.rhythmHz = lcl.motion.rhythm_hz;

      if (advanceState) {
        Kernel.state = 'COMPILE';
        updateFSMUI();
      }

      if (lcl.intent === 'create_glyph' || lcl.morphology.family === 'glyph') {
        compileGlyphField(lcl, memCtx, W, H, CX, CY, hexToLinear, (pts: any) => { targetField = pts; });
      } else if (lcl.intent === 'create_scene' || lcl.morphology.family === 'radiance_scene') {
        compileSceneField(lcl, memCtx, W, H, CX, CY, srgbToLinear, (pts: any) => { targetField = pts; });
      } else {
        compileShapeField(lcl, W, H, CX, CY, hexToLinear, lerp, clamp, (pts: any) => { targetField = pts; });
      }

      Kernel.state = 'FORMING';
      updateFSMUI();
    }

function render() {
      renderTime += 0.016;
      frameCounter++;

      for (const p of photons) {
        p.update(renderTime);
      }

      if (webglRenderer) {
        webglRenderer.render(photons, W, H, Kernel.glowAlpha);
      } else {
        const trail = clamp(Kernel.trailAlpha + Kernel.coherence * 0.18, 0.08, 0.46);
        ctx.fillStyle = `rgba(1, 1, 2, ${trail})`;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';
        for (const p of photons) {
          p.draw();
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      if (frameCounter % 20 === 0) {
        perceptualFeedbackLoop(photons, W, H, lastLCL, Kernel, clamp, (k: any) => { Object.assign(Kernel, k); });
        updateFSMUI();
      }

      requestAnimationFrame(render);
    }

function bootstrap() {
      resize();
      photons = Array.from({ length: NUM_PHOTONS }, (_, i) => new Photon(i));
      showSchema();
      try {
        webglRenderer = new RendererWebGL(display);
      } catch (error) {
        console.warn('WebGL renderer unavailable; falling back to Canvas2D', error);
      }
      updateFSMUI();
      render();
    }

bootstrap();

(window as any).runUserRequest = runUserRequest;
(window as any).resetToVoid = resetToVoid;
(window as any).quickPreset = quickPreset;
(window as any).showSchema = showSchema;
