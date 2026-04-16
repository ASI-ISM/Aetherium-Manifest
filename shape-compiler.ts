export interface TargetPoint {
  x: number;
  y: number;
  color: number[];
}

export interface Viewport {
  width: number;
  height: number;
}

export interface CompiledField {
  points: TargetPoint[];
}

type LclLike = Record<string, unknown>;

export function compileGlyphFieldFromAlphaMask(
  alphaMask: Uint8Array,
  viewport: Viewport,
  colorHex: string,
): CompiledField {
  const points: TargetPoint[] = [];
  const step = Math.max(1, Math.floor(viewport.width / 160));
  const color = hexToLinear(colorHex);

  for (let y = 0; y < viewport.height; y += step) {
    for (let x = 0; x < viewport.width; x += step) {
      const idx = y * viewport.width + x;
      if (alphaMask[idx] > 120) {
        points.push({ x, y, color });
      }
    }
  }

  return { points };
}

export function compileShapeField(lcl: LclLike, viewport: Viewport): CompiledField;

export function compileGlyphField(
  lcl: LclLike,
  memCtx: CanvasRenderingContext2D,
  W: number,
  H: number,
  CX: number,
  CY: number,
  hexToLinear: (hex: string) => number[],
  setTargetField: (pts: TargetPoint[]) => void,
): void {
  memCtx.clearRect(0, 0, W, H);
  const text = lcl.content?.text || 'AETHERIUM';
  const fontSize = Math.min((W / Math.max(text.length, 4)) * 1.3, 160);
  memCtx.font = `800 ${fontSize}px JetBrains Mono`;
  memCtx.textAlign = 'center';
  memCtx.textBaseline = 'middle';
  memCtx.fillStyle = '#FFFFFF';
  memCtx.fillText(text, CX, CY);

  const color = hexToLinear(lcl.optics?.palette?.[0] ?? '#FFFFFF');
  const img = memCtx.getImageData(0, 0, W, H).data;
  const step = Math.max(1, Math.floor(W / 160));
  const pts: TargetPoint[] = [];

  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const idx = (y * W + x) * 4;
      if (img[idx + 3] > 120) {
        pts.push({ x, y, color });
      }
    }
  }

  setTargetField(pts.slice(0, lcl.constraints?.max_targets ?? pts.length));
}

export function compileSceneField(
  lcl: LclLike,
  memCtx: CanvasRenderingContext2D,
  W: number,
  H: number,
  CX: number,
  CY: number,
  srgbToLinear: (c: number) => number,
  setTargetField: (pts: TargetPoint[]) => void,
): void {
  memCtx.clearRect(0, 0, W, H);
  const grad = memCtx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#080c1a');
  grad.addColorStop(0.5, '#9d174d');
  grad.addColorStop(1, '#f59e0b');
  memCtx.fillStyle = grad;
  memCtx.fillRect(0, 0, W, H);

  memCtx.beginPath();
  memCtx.arc(CX, CY + 40, Math.min(W, H) * 0.12, 0, Math.PI * 2);
  memCtx.fillStyle = '#fef08a';
  memCtx.fill();

  const img = memCtx.getImageData(0, 0, W, H).data;
  const pts: TargetPoint[] = [];
  const step = Math.max(1, Math.floor(W / 170));
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const idx = (y * W + x) * 4;
      if (Math.random() < 0.4) {
        pts.push({
          x,
          y,
          color: [srgbToLinear(img[idx]), srgbToLinear(img[idx + 1]), srgbToLinear(img[idx + 2])],
        });
      }
    }
  }

  setTargetField(pts.slice(0, lcl.constraints?.max_targets ?? pts.length));
}

export function compileShapeField(
  lcl: LclLike,
  WOrViewport: number | Viewport,
  H?: number,
  CX?: number,
  CY?: number,
  hexToLinearFn: (hex: string) => number[] = hexToLinear,
  lerpFn: (a: number, b: number, t: number) => number = lerp,
  clampFn: (v: number, lo: number, hi: number) => number = clamp,
  setTargetField?: (pts: TargetPoint[]) => void,
): void | CompiledField {
  const pts: TargetPoint[] = [];
  const viewport = typeof WOrViewport === 'number'
    ? { width: WOrViewport, height: H ?? WOrViewport }
    : WOrViewport;
  const W = viewport.width;
  const HResolved = viewport.height;
  const CXResolved = CX ?? W / 2;
  const CYResolved = CY ?? HResolved / 2;
  const family = lcl.morphology.family;
  const density = clampFn(lcl.morphology.density, 0.1, 1.0);
  const count = Math.floor((lcl.constraints.max_targets || 12000) * density);
  const scale = Math.min(W, HResolved) * clampFn(lcl.morphology.scale, 0.12, 0.55);
  const palette = (lcl.optics.palette || ['#FFFFFF']).map(hexToLinearFn);

  for (let i = 0; i < count; i++) {
    const t = i / Math.max(count, 1);
    let x = CXResolved;
    let y = CYResolved;

    if (family === 'sphere') {
      const r = scale * Math.sqrt(Math.random());
      const ang = Math.random() * Math.PI * 2;
      x = CXResolved + Math.cos(ang) * r;
      y = CYResolved + Math.sin(ang) * r;
    } else if (family === 'spiral_vortex') {
      const theta = t * Math.PI * 18;
      const r = 8 + t * scale;
      x = CXResolved + Math.cos(theta) * r;
      y = CYResolved + Math.sin(theta) * r * 0.55 - t * scale * 0.28;
    }

    const c0 = palette[i % palette.length];
    const c1 = palette[(i + 1) % palette.length];
    const mix = (Math.sin(t * Math.PI * 2) + 1) * 0.5;
    pts.push({
      x,
      y,
      color: [lerpFn(c0[0], c1[0], mix), lerpFn(c0[1], c1[1], mix), lerpFn(c0[2], c1[2], mix)],
    });
  }

  if (setTargetField) {
    setTargetField(pts);
    return;
  }

  return { points: pts };
}

function hexToLinear(hex: string): number[] {
  const normalized = hex.replace('#', '');
  const values = [0, 2, 4].map((offset) => parseInt(normalized.substring(offset, offset + 2), 16) / 255);
  return values.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
