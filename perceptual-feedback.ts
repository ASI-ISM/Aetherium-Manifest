interface PhotonState {
  pos: { x: number; y: number };
  vel: { x: number; y: number };
}

interface EvalMetrics {
  readability: number;
  coverage: number;
  stability: number;
}

interface FrameSample {
  width: number;
  height: number;
  rgba: Uint8Array;
}

interface PhotonSample {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface LclLike {
  morphology?: { family?: string };
}

interface KernelLike {
  state: string;
  coherenceTarget: number;
  coherence: number;
  noiseMax: number;
}

export interface PerceptualEvaluator {
  evaluate(frame: FrameSample, field: { points: Array<{ x: number; y: number }> }, photons: PhotonSample[]): Promise<EvalMetrics>;
}

let pendingEval: Promise<EvalMetrics> | null = null;

export class BioVisionRemoteEvaluator implements PerceptualEvaluator {
  private readonly apiBaseUrl: string;

  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl;
  }

  async evaluate(frame: FrameSample, field: { points: Array<{ x: number; y: number }> }, photons: PhotonSample[]): Promise<EvalMetrics> {
    const response = await fetch(`${this.apiBaseUrl.replace(/\/$/, '')}/api/perceptual/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        frame_width: frame.width,
        frame_height: frame.height,
        target_points: field.points.length,
        sample: photons.slice(0, 1024),
      }),
    });

    if (!response.ok) {
      throw new Error(`Remote evaluator failed with status ${response.status}`);
    }

    const payload = await response.json();
    return {
      readability: Number(payload.readability ?? 0),
      coverage: Number(payload.coverage ?? 0),
      stability: Number(payload.stability ?? 0),
    };
  }
}

export class EdgeAwareLocalEvaluator implements PerceptualEvaluator {
  async evaluate(frame: FrameSample, field: { points: Array<{ x: number; y: number }> }, photons: PhotonSample[]): Promise<EvalMetrics> {
    const photonState: PhotonState[] = photons.map((photon) => ({
      pos: { x: photon.x, y: photon.y },
      vel: { x: photon.vx, y: photon.vy },
    }));
    return evaluateWithEdgeModel(photonState, frame.width, frame.height, { morphology: { family: field.points.length ? 'shape' : 'void' } });
  }
}

export function feedbackAdjustments(
  metrics: EvalMetrics,
  coherence: number,
  coherenceTarget: number,
  flowMag: number,
  noiseMax: number,
): { coherence: number; flowMag: number; noiseMax: number } {
  if (metrics.readability < 0.45) {
    return {
      coherence: clamp(coherence + 0.02, 0.05, coherenceTarget + 0.12),
      flowMag: clamp(flowMag * 0.98, 0.1, 1.5),
      noiseMax: clamp(noiseMax - 0.08, 0.35, 6.5),
    };
  }

  return {
    coherence: coherence + (coherenceTarget - coherence) * 0.04,
    flowMag: clamp(flowMag + 0.01, 0.1, 1.5),
    noiseMax: clamp(noiseMax * 0.995, 0.35, 6.5),
  };
}

export function perceptualFeedbackLoop(
  photons: PhotonState[],
  W: number,
  H: number,
  lastLCL: LclLike,
  kernel: KernelLike,
  clamp: (v: number, lo: number, hi: number) => number,
  applyPatch: (patch: EvalMetrics | Record<string, unknown>) => void,
): void {
  if (!photons.length) {
    applyPatch({ readability: 0, coverage: 0, stability: 0 });
    return;
  }

  kernel.state = 'FEEDBACK';
  if (!pendingEval) {
    pendingEval = evaluateWithBioVisionNet(photons, W, H, lastLCL)
      .catch(() => evaluateWithEdgeModel(photons, W, H, lastLCL))
      .finally(() => {
        pendingEval = null;
      });
  }

  pendingEval.then((metrics) => {
    applyPatch(metrics);

    const targetCoh = kernel.coherenceTarget;
    if (metrics.readability < 0.45) {
      kernel.coherence = clamp(kernel.coherence + 0.02, 0.05, targetCoh + 0.12);
      kernel.noiseMax = clamp(kernel.noiseMax - 0.08, 0.35, 6.5);
    } else {
      kernel.coherence = kernel.coherence + (targetCoh - kernel.coherence) * 0.04;
    }

    kernel.state = metrics.readability > 0.68 && metrics.stability > 0.55 ? 'RESONATE' : 'FORMING';
  });
}

async function evaluateWithBioVisionNet(photons: PhotonState[], W: number, H: number, lastLCL: LclLike): Promise<EvalMetrics> {
  const response = await fetch('/api/perceptual/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'BioVisionNet',
      frame_width: W,
      frame_height: H,
      morphology: lastLCL?.morphology?.family,
      sample: photons.slice(0, 1024),
    }),
  });

  if (!response.ok) {
    throw new Error(`BioVisionNet endpoint failed with status ${response.status}`);
  }

  const payload = await response.json();
  return {
    readability: Number(payload.readability ?? 0),
    coverage: Number(payload.coverage ?? 0),
    stability: Number(payload.stability ?? 0),
  };
}

function evaluateWithEdgeModel(photons: PhotonState[], W: number, H: number, lastLCL: LclLike): EvalMetrics {
  const sample = Math.min(photons.length, 2000);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let speedSum = 0;

  for (let i = 0; i < sample; i++) {
    const p = photons[i];
    speedSum += Math.hypot(p.vel.x, p.vel.y);
    minX = Math.min(minX, p.pos.x);
    minY = Math.min(minY, p.pos.y);
    maxX = Math.max(maxX, p.pos.x);
    maxY = Math.max(maxY, p.pos.y);
  }

  const coverage = Math.max(0, Math.min(1, ((maxX - minX) * (maxY - minY)) / (W * H)));
  const stability = 1 / (1 + speedSum / sample);
  const targetCoverage = lastLCL?.morphology?.family === 'glyph' ? 0.12 : 0.18;
  const readability = Math.max(0, Math.min(1, 1 - Math.abs(coverage - targetCoverage) / Math.max(targetCoverage, 0.05)));

  return { readability, coverage, stability };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
