import { createParticleTextRenderer } from './first_use_surface/particle_text_renderer.js';
import { createSettingsStore } from './first_use_surface/settings-store.js';

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
      flowDirection: particlePhysics.flow_direction === 'inward' ? 'inward' : (particlePhysics.flow_direction === 'still' ? 'still' : 'outward'),
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

  const settingsButton = doc.getElementById('settings-icon-btn');
  const settingsStore = createSettingsStore(globalThis.localStorage);
  let settingsState = settingsStore.load();
  let settingsPanel = null;

  const runtime = createParticleTextRenderer(canvas);
  runtime.setMorphDuration(settingsState.runtimeMode === 'vivid' ? 0.8 : (settingsState.runtimeMode === 'calm' ? 1.8 : 1.2));
  const runtimeState = {
    sessionId: `session-${Date.now().toString(36)}`,
    endpoints: { apiBase: settingsState.apiBase, wsBase: settingsState.wsBase },
    lastTransport: 'idle',
    lastSystemText: '',
  };

  const updateSettings = (patch) => {
    settingsState = settingsStore.merge(patch);
    runtimeState.endpoints = {
      apiBase: settingsState.apiBase,
      wsBase: settingsState.wsBase,
    };
  };

  const mountSettingsPanel = () => {
    if (settingsPanel) return settingsPanel;

    const panel = doc.createElement('section');
    panel.id = 'settings-panel';
    panel.className = 'settings-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Settings');
    panel.hidden = true;

    panel.innerHTML = `
      <h2>Settings</h2>
      <div class="settings-grid">
        <label>Language
          <select id="settings-language">
            <option value="auto">Auto</option>
            <option value="th">ไทย</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
            <option value="es">Español</option>
          </select>
        </label>
        <label>Particle mode
          <select id="settings-runtime-mode">
            <option value="calm">Calm</option>
            <option value="balanced">Balanced</option>
            <option value="vivid">Vivid</option>
          </select>
        </label>
        <label>Performance
          <select id="settings-reduced-motion">
            <option value="false">Normal</option>
            <option value="true">Reduced motion</option>
          </select>
        </label>
        <label>API base
          <input id="settings-api-base" type="text" />
        </label>
        <label>WS path
          <input id="settings-ws-base" type="text" />
        </label>
      </div>
    `;

    doc.body.append(panel);

    const language = panel.querySelector('#settings-language');
    const runtimeMode = panel.querySelector('#settings-runtime-mode');
    const reducedMotion = panel.querySelector('#settings-reduced-motion');
    const apiBase = panel.querySelector('#settings-api-base');
    const wsBase = panel.querySelector('#settings-ws-base');

    const syncPanelInputs = () => {
      language.value = settingsState.language;
      runtimeMode.value = settingsState.runtimeMode;
      reducedMotion.value = String(settingsState.reducedMotion);
      apiBase.value = settingsState.apiBase;
      wsBase.value = settingsState.wsBase;
    };

    syncPanelInputs();

    language.addEventListener('change', () => updateSettings({ language: language.value }));
    runtimeMode.addEventListener('change', () => {
      updateSettings({ runtimeMode: runtimeMode.value });
      runtime.setMorphDuration(runtimeMode.value === 'vivid' ? 0.8 : (runtimeMode.value === 'calm' ? 1.8 : 1.2));
    });
    reducedMotion.addEventListener('change', () => updateSettings({ reducedMotion: reducedMotion.value === 'true' }));
    apiBase.addEventListener('change', () => updateSettings({ apiBase: apiBase.value || DEFAULT_COGNITIVE_API_BASE }));
    wsBase.addEventListener('change', () => updateSettings({ wsBase: wsBase.value || '/ws/cognitive-stream' }));

    settingsPanel = panel;
    return settingsPanel;
  };

  settingsButton?.addEventListener('click', () => {
    const panel = mountSettingsPanel();
    const willOpen = panel.hidden;
    panel.hidden = !willOpen;
    settingsButton.setAttribute('aria-expanded', String(willOpen));
  });

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

    runtime.setEnergy(systemReply.visual?.energy ?? 0.35);
    runtime.setFlowDirection(systemReply.visual?.flowDirection ?? 'outward');
    runtime.renderText(systemReply.text, systemReply.state);
  });

  globalThis.addEventListener('beforeunload', () => runtime.destroy(), { once: true });
}

if (typeof globalThis.document !== 'undefined') {
  bootstrap();
}
