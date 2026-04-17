function createParticleField(count) {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.4 + 0.5,
    vx: (Math.random() - 0.5) * 0.00045,
    vy: (Math.random() - 0.5) * 0.00045,
  }));
}

function moodPalette(mood) {
  switch (mood) {
    case 'warm':
      return { glow: '255, 210, 138', core: '255, 244, 220' };
    case 'answer':
      return { glow: '146, 222, 255', core: '236, 248, 255' };
    case 'ambiguity':
      return { glow: '184, 165, 255', core: '241, 237, 255' };
    case 'greeting':
    default:
      return { glow: '127, 228, 255', core: '235, 249, 255' };
  }
}

function clampAlpha(alpha) {
  return Math.max(0, Math.min(1, alpha));
}

function wrapLines(context, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [text];

  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${currentLine} ${words[i]}`;
    if (context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }

  lines.push(currentLine);
  return lines.slice(0, 3);
}

export function createLightManifestation(canvas, reducedMotion) {
  const context = canvas.getContext('2d');
  const particles = createParticleField(320);
  const manifestation = {
    text: '',
    mood: 'greeting',
    startedAt: performance.now(),
    glyphPoints: [],
  };

  const options = {
    reducedMotion,
  };

  function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function updateGlyphMap(text) {
    if (!text) {
      manifestation.glyphPoints = [];
      return;
    }

    const width = Math.max(420, Math.floor(window.innerWidth * 0.7));
    const height = 160;
    const offscreen = updateGlyphMap.canvas || (updateGlyphMap.canvas = document.createElement('canvas'));
    const offscreenContext = updateGlyphMap.ctx || (updateGlyphMap.ctx = offscreen.getContext('2d', { willReadFrequently: true }));
    offscreen.width = width;
    offscreen.height = height;

    offscreenContext.clearRect(0, 0, width, height);
    offscreenContext.textAlign = 'center';
    offscreenContext.textBaseline = 'middle';
    offscreenContext.fillStyle = '#ffffff';
    offscreenContext.font = `700 ${Math.max(24, Math.min(54, width * 0.075))}px Inter, Sarabun, sans-serif`;
    offscreenContext.fillText(text, width * 0.5, height * 0.54);

    const imageData = offscreenContext.getImageData(0, 0, width, height).data;
    const points = [];
    const step = options.reducedMotion ? 8 : 6;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const pixelIndex = (y * width + x) * 4 + 3;
        if (imageData[pixelIndex] > 100) {
          points.push({
            x: x / width,
            y: y / height,
          });
        }
      }
    }

    manifestation.glyphPoints = points;
  }

  function manifestText(text, mood) {
    manifestation.text = text;
    manifestation.mood = mood;
    manifestation.startedAt = performance.now();
    updateGlyphMap(text);
  }

  function setReducedMotion(value) {
    options.reducedMotion = value;
    if (manifestation.text) updateGlyphMap(manifestation.text);
  }

  function render(ts) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    context.clearRect(0, 0, width, height);
    context.fillStyle = 'rgba(5, 8, 14, 0.25)';
    context.fillRect(0, 0, width, height);

    const wave = options.reducedMotion ? 0 : Math.sin(ts * 0.00035) * 0.25;
    particles.forEach((particle, index) => {
      if (!options.reducedMotion) {
        particle.x += particle.vx + wave * 0.00012;
        particle.y += particle.vy;
        if (particle.x < 0 || particle.x > 1) particle.vx *= -1;
        if (particle.y < 0 || particle.y > 1) particle.vy *= -1;
      }

      const x = particle.x * width;
      const y = particle.y * height;
      const alpha = options.reducedMotion
        ? 0.18
        : 0.24 + Math.sin(ts * 0.001 + index * 0.16) * 0.08;

      context.fillStyle = `rgba(127,228,255,${clampAlpha(alpha)})`;
      context.beginPath();
      context.arc(x, y, particle.r, 0, Math.PI * 2);
      context.fill();
    });

    if (manifestation.text) {
      const elapsed = Math.max(0, ts - manifestation.startedAt);
      const alpha = options.reducedMotion ? 1 : clampAlpha(elapsed / 520);
      const palette = moodPalette(manifestation.mood);
      const centerY = height * 0.43;
      const fontSize = Math.max(26, Math.min(58, width * 0.047));

      if (!options.reducedMotion && manifestation.glyphPoints.length > 0) {
        const glyphWidth = Math.max(420, Math.floor(width * 0.7));
        const glyphHeight = 160;
        const originX = (width - glyphWidth) * 0.5;
        const originY = centerY - glyphHeight * 0.5;

        context.fillStyle = `rgba(${palette.glow},${clampAlpha(alpha * 0.85)})`;
        manifestation.glyphPoints.forEach((point, index) => {
          if (index % 2 !== 0) return;
          const shimmer = Math.sin(ts * 0.007 + index * 0.11) * 0.7;
          const radius = 1 + Math.max(0, shimmer);
          context.beginPath();
          context.arc(originX + point.x * glyphWidth, originY + point.y * glyphHeight, radius, 0, Math.PI * 2);
          context.fill();
        });
      }

      context.save();
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `700 ${fontSize}px Inter, Sarabun, sans-serif`;
      context.shadowColor = `rgba(${palette.glow},0.9)`;
      context.shadowBlur = options.reducedMotion ? 0 : 22;
      context.fillStyle = `rgba(${palette.core},${alpha})`;
      const wrapped = wrapLines(context, manifestation.text, width * 0.72);
      const lineHeight = fontSize * 1.15;
      const top = centerY - ((wrapped.length - 1) * lineHeight) / 2;
      wrapped.forEach((line, index) => {
        context.fillText(line, width * 0.5, top + lineHeight * index);
      });
      context.restore();
    }

    requestAnimationFrame(render);
  }

  return {
    manifestText,
    resize,
    render,
    setReducedMotion,
  };
}
