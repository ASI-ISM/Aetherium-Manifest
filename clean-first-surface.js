function createParticleRuntime(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { pulse: () => {}, destroy: () => {} };

  const particles = [];
  let rafId = 0;

  const resize = () => {
    canvas.width = globalThis.innerWidth;
    canvas.height = globalThis.innerHeight;
  };

  const spawn = (energy = 0.6) => {
    const count = Math.max(18, Math.floor(energy * 40));
    const centerX = canvas.width * 0.5;
    const centerY = canvas.height * 0.64;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.35 + Math.random() * (1.6 * energy);
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (0.4 + Math.random() * 1.2),
        alpha: 0.7 + Math.random() * 0.3,
        size: 1 + Math.random() * 2.8,
        life: 40 + Math.random() * 55,
      });
    }
  };

  const render = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.006;
      p.life -= 1;
      p.alpha = Math.max(0, p.life / 90);

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.fillStyle = `rgba(127, 228, 255, ${p.alpha})`;
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    rafId = globalThis.requestAnimationFrame(render);
  };

  resize();
  globalThis.addEventListener('resize', resize);
  render();
  spawn(0.3);

  return {
    pulse(text = '') {
      const normalized = String(text).trim();
      const energy = Math.min(1, Math.max(0.35, normalized.length / 64));
      spawn(energy);
      globalThis.setTimeout(() => spawn(Math.max(0.25, energy * 0.55)), 170);
    },
    destroy() {
      globalThis.cancelAnimationFrame(rafId);
      globalThis.removeEventListener('resize', resize);
    },
  };
}

function bootstrap(doc = globalThis.document) {
  const canvas = doc.getElementById('manifestation-canvas');
  const composer = doc.getElementById('composer');
  const input = doc.getElementById('intent-input');

  if (!canvas || !composer || !input) return;

  const runtime = createParticleRuntime(canvas);

  composer.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value;
    if (!text.trim()) return;
    runtime.pulse(text);
    input.value = '';
  });

  globalThis.addEventListener('beforeunload', () => runtime.destroy(), { once: true });
}

bootstrap();
