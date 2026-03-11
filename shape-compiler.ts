export interface TargetPoint {
  x: number;
  y: number;
  color: number[];
}

export function compileGlyphField(
  lcl: any,
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
  lcl: any,
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
  lcl: any,
  W: number,
  H: number,
  CX: number,
  CY: number,
  hexToLinear: (hex: string) => number[],
  lerp: (a: number, b: number, t: number) => number,
  clamp: (v: number, lo: number, hi: number) => number,
  setTargetField: (pts: TargetPoint[]) => void,
): void {
  const pts: TargetPoint[] = [];
  const family = lcl.morphology.family;
  const density = clamp(lcl.morphology.density, 0.1, 1.0);
  const count = Math.floor((lcl.constraints.max_targets || 12000) * density);
  const scale = Math.min(W, H) * clamp(lcl.morphology.scale, 0.12, 0.55);
  const palette = (lcl.optics.palette || ['#FFFFFF']).map(hexToLinear);

  for (let i = 0; i < count; i++) {
    const t = i / Math.max(count, 1);
    let x = CX;
    let y = CY;

    if (family === 'sphere') {
      const r = scale * Math.sqrt(Math.random());
      const ang = Math.random() * Math.PI * 2;
      x = CX + Math.cos(ang) * r;
      y = CY + Math.sin(ang) * r;
    } else if (family === 'spiral_vortex') {
      const theta = t * Math.PI * 18;
      const r = 8 + t * scale;
      x = CX + Math.cos(theta) * r;
      y = CY + Math.sin(theta) * r * 0.55 - t * scale * 0.28;
    }

    const c0 = palette[i % palette.length];
    const c1 = palette[(i + 1) % palette.length];
    const mix = (Math.sin(t * Math.PI * 2) + 1) * 0.5;
    pts.push({
      x,
      y,
      color: [lerp(c0[0], c1[0], mix), lerp(c0[1], c1[1], mix), lerp(c0[2], c1[2], mix)],
    });
  }

  setTargetField(pts);
}
