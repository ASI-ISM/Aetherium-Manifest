import { createParticleTextRenderer } from './first_use_surface/particle_text_renderer.js';

const DEFAULT_COGNITIVE_API_BASE = '/api/v1/cognitive';

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
      flow: (particlePhysics.flow_direction && particlePhysics.flow_direction !== 'still') ? 1 : 0,
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
  return payload;
}

function bootstrap(doc = globalThis.document) {
  const canvas = doc.getElementById('manifestation-canvas');
  const composer = doc.getElementById('composer');
  const input = doc.getElementById('intent-input');

  if (!canvas || !composer || !input) return;

  const runtime = createParticleTextRenderer(canvas);
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

    let systemReply = { text: '', state: 'neutral' };
    try {
      systemReply = await requestCognitiveResponse(text, runtimeState);
    } catch (_error) {
      const fallbackText = deterministicLocalResponder(text, runtimeState);
      runtimeState.lastSystemText = fallbackText;
      systemReply = { text: fallbackText, state: 'focused' };
    }

    runtime.renderText(systemReply.text, systemReply.state);
  });

  globalThis.addEventListener('beforeunload', () => runtime.destroy(), { once: true });
}

if (typeof globalThis.document !== 'undefined') {
  bootstrap();
}
