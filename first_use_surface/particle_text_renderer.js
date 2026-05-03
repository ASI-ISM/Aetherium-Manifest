const DEFAULT_OPTIONS = {
  fontFamily: "'Inter', 'Noto Sans Thai', system-ui, sans-serif",
  sampleStep: 4,
  maxParticles: 3200,
  ease: 0.09,
  damping: 0.84,
  jitter: 0.35,
  alphaThreshold: 64,
  flowDirection: 'outward',
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function wrapLines(ctx, message, maxWidth) {
  const rawLines = String(message ?? '').split(/\n+/);
  const wrapped = [];

  for (const rawLine of rawLines) {
    const words = rawLine.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      wrapped.push('');
      continue;
    }

    let line = words[0];
    for (let i = 1; i < words.length; i += 1) {
      const candidate = `${line} ${words[i]}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
      } else {
        wrapped.push(line);
        line = words[i];
      }
    }
    wrapped.push(line);
  }

  return wrapped;
}

export function createParticleTextRenderer(canvas, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const ctx = canvas.getContext('2d');
  const Offscreen = globalThis.OffscreenCanvas;
  const maskCanvas = Offscreen ? new OffscreenCanvas(1, 1) : globalThis.document.createElement('canvas');
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });

  if (!ctx || !maskCtx) {
    return { renderText: () => {}, destroy: () => {} };
  }

  const particles = [];
  let targets = [];
  let rafId = 0;
  let palette = { r: 127, g: 228, b: 255 };
  let flowDirection = config.flowDirection;

  const resize = () => {
    canvas.width = globalThis.innerWidth;
    canvas.height = globalThis.innerHeight;
  };

  const moodPalette = (mood = 'neutral') => {
    const key = String(mood).toLowerCase();
    if (key.includes('calm') || key.includes('focused')) return { r: 127, g: 228, b: 255 };
    if (key.includes('warm') || key.includes('joy')) return { r: 255, g: 198, b: 132 };
    if (key.includes('alert') || key.includes('active')) return { r: 255, g: 150, b: 165 };
    return { r: 180, g: 208, b: 255 };
  };

  const pointCloudFromMask = (message) => {
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    const fontSize = clamp(Math.round(canvas.width * 0.058), 20, 72);
    const lineHeight = Math.round(fontSize * 1.25);
    const maxTextWidth = canvas.width * 0.78;
    maskCtx.font = `700 ${fontSize}px ${config.fontFamily}`;
    maskCtx.textAlign = 'center';
    maskCtx.textBaseline = 'middle';
    maskCtx.fillStyle = '#ffffff';

    const lines = wrapLines(maskCtx, String(message || '...'), maxTextWidth).slice(0, 8);
    const blockHeight = Math.max(lineHeight, lines.length * lineHeight);
    let y = canvas.height * 0.5 - blockHeight * 0.5 + lineHeight * 0.5;

    for (const line of lines) {
      maskCtx.fillText(line, canvas.width * 0.5, y);
      y += lineHeight;
    }

    const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
    const points = [];
    const stride = Math.max(2, config.sampleStep);

    for (let py = 0; py < maskCanvas.height; py += stride) {
      for (let px = 0; px < maskCanvas.width; px += stride) {
        const alpha = imageData[(py * maskCanvas.width + px) * 4 + 3];
        if (alpha >= config.alphaThreshold && Math.random() > 0.22) {
          points.push({ x: px, y: py });
        }
      }
    }

    if (points.length > config.maxParticles) {
      const reduced = [];
      const skip = points.length / config.maxParticles;
      for (let i = 0; i < config.maxParticles; i += 1) {
        reduced.push(points[Math.floor(i * skip)]);
      }
      return reduced;
    }

    return points;
  };

  const syncParticles = () => {
    while (particles.length < targets.length) {
      const idx = particles.length;
      particles.push({
        x: canvas.width * 0.5 + (Math.random() - 0.5) * 40,
        y: canvas.height * 0.65 + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        tx: targets[idx].x,
        ty: targets[idx].y,
        alpha: 0,
        life: Math.random() * 120,
      });
    }

    for (let i = 0; i < particles.length; i += 1) {
      const target = targets[i];
      if (target) {
        particles[i].tx = target.x;
        particles[i].ty = target.y;
      }
    }
  };

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      const active = i < targets.length;

      if (active) {
        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        const radialDx = p.x - canvas.width * 0.5;
        const radialDy = p.y - canvas.height * 0.5;
        const radialScale = config.ease * 0.18;
        p.vx += dx * config.ease;
        p.vy += dy * config.ease;
        if (flowDirection === 'outward') {
          p.vx += radialDx * radialScale;
          p.vy += radialDy * radialScale;
        } else if (flowDirection === 'inward') {
          p.vx -= radialDx * radialScale;
          p.vy -= radialDy * radialScale;
        }
        p.alpha = Math.min(0.95, p.alpha + 0.05);
      } else {
        p.vy += 0.02;
        p.alpha = Math.max(0, p.alpha - 0.03);
      }

      p.vx *= config.damping;
      p.vy *= config.damping;
      p.x += p.vx + (Math.random() - 0.5) * config.jitter;
      p.y += p.vy + (Math.random() - 0.5) * config.jitter;

      if (!active && p.alpha <= 0.02) {
        particles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.fillStyle = `rgba(${palette.r}, ${palette.g}, ${palette.b}, ${p.alpha})`;
      ctx.arc(p.x, p.y, 1.25, 0, Math.PI * 2);
      ctx.fill();
    }

    rafId = globalThis.requestAnimationFrame(animate);
  };

  resize();
  animate();
  globalThis.addEventListener('resize', resize);

  return {
    renderText(message = '', mood = 'neutral') {
      palette = moodPalette(mood);
      targets = pointCloudFromMask(message);
    },
    setFlowDirection(direction = 'outward') {
      const normalized = String(direction).toLowerCase();
      flowDirection = normalized === 'inward' ? 'inward' : 'outward';
    },
    destroy() {
      globalThis.cancelAnimationFrame(rafId);
      globalThis.removeEventListener('resize', resize);
    },
  };
}
