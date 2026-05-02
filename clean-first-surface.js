const DEFAULT_COGNITIVE_API_BASE = '/api/v1/cognitive';

function createParticleRuntime(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { pulse: () => {}, renderText: () => {}, destroy: () => {} };

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
    renderText(text = '') {
      this.pulse(text);
    },
    destroy() {
      globalThis.cancelAnimationFrame(rafId);
      globalThis.removeEventListener('resize', resize);
    },
  };
}

export function resolveCompatibilityEndpoints({ apiBase = DEFAULT_COGNITIVE_API_BASE, wsBase = '/ws/cognitive-stream' } = {}) {
  const normalizedApiBase = String(apiBase).replace(/\/+$/, '');
  return {
    emitUrl: `${normalizedApiBase}/generate`,
    validateUrl: `${normalizedApiBase}/validate`,
    wsUrl: wsBase,
  };
}

export function adaptIntentRequest(prompt, sessionId) {
  return {
    prompt: String(prompt ?? ''),
    session_id: String(sessionId ?? ''),
  };
}

export function adaptIntentResponse(payload = {}) {
  const intent = payload.intent_vector ?? {};
  const visual = payload.visual_manifestation ?? {};
  const particlePhysics = visual.particle_physics ?? {};

  return {
    text: String(payload.text ?? ''),
    state: String(intent.category ?? 'neutral'),
    visual: {
      energy: Number(intent.energy_level ?? 0.35),
      valence: Number(intent.emotional_valence ?? 0),
      color_palette: visual.color_palette ?? {},
      flow: particlePhysics.flow_direction ? 1 : 0,
    },
  };
}

export function createDefaultHomeShellState(activePane = 'interaction', reducedMotion = false) {
  return {
    settingsOpen: false,
    runtimeHydrated: false,
    gatewayConnected: false,
    voiceReady: false,
    manifestationReady: false,
    activePane,
    reducedMotion,
  };
}

function deterministicLocalResponder(text, runtimeState) {
  const normalized = String(text).trim().replace(/\s+/g, ' ').toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) % 1000003;
  }
  const flavor = ['steady', 'clear', 'aligned', 'focused'][hash % 4];
  runtimeState.lastTransport = 'local-fallback';
  return `Local ${flavor} response #${hash % 997}`;
}

async function requestCognitiveResponse(text, runtimeState, fetchImpl = globalThis.fetch) {
  const endpoints = resolveCompatibilityEndpoints(runtimeState.endpoints);
  const body = adaptIntentRequest(text, runtimeState.sessionId);

  const response = await fetchImpl(endpoints.emitUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`cognitive emit failed (${response.status})`);
  }

  const payload = adaptIntentResponse(await response.json());
  runtimeState.lastTransport = 'network';
  runtimeState.lastSystemText = payload.text;
  return payload.text;
}

function bootstrap(doc = globalThis.document) {
  const canvas = doc.getElementById('manifestation-canvas');
  const composer = doc.getElementById('composer');
  const input = doc.getElementById('intent-input');

  if (!canvas || !composer || !input) return;

  const runtime = createParticleRuntime(canvas);
  const runtimeState = {
    sessionId: `session-${Date.now().toString(36)}`,
    endpoints: { apiBase: DEFAULT_COGNITIVE_API_BASE, wsBase: '/ws/cognitive-stream' },
    lastTransport: 'idle',
    lastSystemText: '',
  };

  composer.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value;
    if (!text.trim()) return;

    input.value = '';

    let systemText = '';
    try {
      systemText = await requestCognitiveResponse(text, runtimeState);
    } catch (_error) {
      systemText = deterministicLocalResponder(text, runtimeState);
      runtimeState.lastSystemText = systemText;
    }

    runtime.renderText(systemText);
  });

  globalThis.addEventListener('beforeunload', () => runtime.destroy(), { once: true });
}

if (typeof globalThis.document !== 'undefined') {
  bootstrap();
}
