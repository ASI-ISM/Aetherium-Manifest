interface PhotonState {
  pos: { x: number; y: number };
  vel: { x: number; y: number };
}

interface EvalMetrics {
  readability: number;
  coverage: number;
  stability: number;
}

let pendingEval: Promise<EvalMetrics> | null = null;

export function perceptualFeedbackLoop(
  photons: PhotonState[],
  W: number,
  H: number,
  lastLCL: any,
  kernel: any,
  clamp: (v: number, lo: number, hi: number) => number,
  applyPatch: (patch: Record<string, unknown>) => void,
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

async function evaluateWithBioVisionNet(photons: PhotonState[], W: number, H: number, lastLCL: any): Promise<EvalMetrics> {
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

function evaluateWithEdgeModel(photons: PhotonState[], W: number, H: number, lastLCL: any): EvalMetrics {
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
