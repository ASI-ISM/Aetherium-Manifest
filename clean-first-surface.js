import { createLanguageLayer } from './first_use_surface/language-layer.js';
import { createLightManifestation } from './first_use_surface/light-manifestation.js';
import {
  markCompositionEnd,
  markCompositionStart,
  markInputCommitted,
  shouldSubmitOnEnter,
} from './first_use_surface/input-event-policy.js';

const STORAGE_KEY = 'aetherium:first-surface-settings:v1';
const DEFAULT_INTENT_TIMEOUT_MS = 10000;

function createSessionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const elements = {
  canvas: document.getElementById('manifestation-canvas'),
  form: document.getElementById('composer'),
  input: document.getElementById('intent-input'),
  sendButton: document.getElementById('send-btn'),
  voiceButton: document.getElementById('voice-btn'),
  statusText: document.getElementById('ambient-status'),
  fallbackText: document.getElementById('readable-fallback'),
  settingsPanel: document.getElementById('settings-panel'),
  settingsToggle: document.getElementById('settings-toggle'),
  closeSettings: document.getElementById('close-settings'),
  voiceCaptureButton: document.getElementById('voice-capture'),
  connectionStatus: document.getElementById('connection-status'),
  systemStateLabel: document.getElementById('system-state-label'),
  energyBar: document.getElementById('energy-bar'),
  entropyBar: document.getElementById('entropy-bar'),
};

const defaultSettings = {
  languagePreference: 'auto',
  useLocalDetector: true,
  localModelProfile: 'tiny-rules',
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  voiceEnabled: true,
  apiBase: '/api',
  wsBase: '/ws/cognitive-stream',
  runtimeMode: 'calm',
  telemetry: true,
  lineage: false,
  scholar: false,
  governorDebug: false,
  developerTools: false,
  sessionLanguageMemory: (navigator.language || 'en').toLowerCase().startsWith('th') ? 'th' : 'en',
};

const uiText = {
  th: {
    ready: 'พร้อมฟัง',
    listening: 'กำลังฟัง',
    interpreting: 'กำลังตีความ',
    voiceUnavailable: 'ไม่รองรับระบบเสียงในเบราว์เซอร์นี้',
  },
  en: {
    ready: 'Ready',
    listening: 'Listening',
    interpreting: 'Interpreting',
    voiceUnavailable: 'Voice is not available in this browser',
  },
};

const inputRuntime = {
  isComposing: false,
  lastCompositionEndAt: -Infinity,
};

const voiceRuntime = {
  isSupported: false,
  isListening: false,
  recognition: null,
};

const connectionRuntime = {
  socket: null,
  reconnectTimer: null,
  reconnectAttempts: 0,
  shouldReconnect: true,
  url: '',
};

const sysState = {
  state: '',
  visual: {
    energy: 0,
    entropy: 0,
    energyLevel: 0,
    entropyLevel: 0,
    turbulence: 0,
    flow: 0,
    shape: 0,
    color: null,
    color_palette: {
      primary: '#7FE4FF',
      secondary: '#EBF9FF',
    },
  },
  targetVisual: {
    energyLevel: 0,
    entropyLevel: 0,
    turbulence: 0,
    flow: 0,
    shape: 0,
    color_palette: {
      primary: '#7FE4FF',
      secondary: '#EBF9FF',
    },
  },
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

function persistSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

const settings = loadSettings();
const sessionId = createSessionId();
const sessionAudit = [];
const languageLayer = createLanguageLayer(settings);
const manifestationEngine = createLightManifestation(elements.canvas, settings.reducedMotion);

function activeLanguage() {
  return settings.sessionLanguageMemory === 'en' ? 'en' : 'th';
}

const DEFAULT_COGNITIVE_API_BASE = '/api/v1/cognitive';

function pushSessionEvent(payload) {
  sessionAudit.push({
    ...payload,
    at: new Date().toISOString(),
  });
}

function resolveWsUrl(inputUrl = '') {
  const source = inputUrl.trim() || settings.wsBase;
  if (!source) return '';

  if (/^wss?:\/\//i.test(source)) return source;
  if (/^https?:\/\//i.test(source)) {
    return source.replace(/^http/i, 'ws');
  }

  const base = new URL(window.location.href);
  const wsProtocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${base.host}${source.startsWith('/') ? source : `/${source}`}`;
}

function nextReconnectDelayMs(attempt) {
  return Math.min(8000, 2000 * (2 ** Math.max(0, attempt - 1)));
}

function clearReconnectTimer() {
  if (connectionRuntime.reconnectTimer === null) return;
  window.clearTimeout(connectionRuntime.reconnectTimer);
  connectionRuntime.reconnectTimer = null;
}

function clamp(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, numeric));
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
    ok: true,
    value: {
      state: state.trim(),
      visual: {
        energy: clamp(visual.energy, 0, 1.5),
        entropy: clamp(visual.entropy, 0, 1.5),
        turbulence: visual.turbulence != null ? clamp(visual.turbulence, 0, 1.5) : undefined,
        flow: visual.flow != null ? clamp(visual.flow, 0, 1.5) : undefined,
        shape: visual.shape != null ? clamp(visual.shape, 0, 1.5) : undefined,
        color_palette: {
          primary: sanitizePaletteValue(visual.color_palette.primary, '#7FE4FF'),
          secondary: sanitizePaletteValue(visual.color_palette.secondary, '#EBF9FF'),
        },
      },
    },
  };
}

function setSystemState(mode) {
  const normalized = typeof mode === 'string' ? mode.trim() : '';
  if (!normalized) return;
  sysState.state = normalized;
  if (elements.systemStateLabel) {
    elements.systemStateLabel.textContent = normalized;
  }
}

function updateVisualUI() {
  const energyPercent = clamp(sysState.visual.energyLevel / 1.5, 0, 1) * 100;
  const entropyPercent = clamp(sysState.visual.entropyLevel / 1.5, 0, 1) * 100;

  if (elements.energyBar) {
    elements.energyBar.style.width = `${energyPercent}%`;
  }

  if (elements.entropyBar) {
    elements.entropyBar.style.width = `${entropyPercent}%`;
  }

  document.documentElement.style.setProperty('--runtime-primary-color', sysState.visual.color_palette.primary);
  document.documentElement.style.setProperty('--runtime-secondary-color', sysState.visual.color_palette.secondary);
}

function animate() {
  const lerpFactor = settings.reducedMotion ? 0.25 : 0.08;

  sysState.visual.energyLevel += (sysState.targetVisual.energyLevel - sysState.visual.energyLevel) * lerpFactor;
  sysState.visual.entropyLevel += (sysState.targetVisual.entropyLevel - sysState.visual.entropyLevel) * lerpFactor;
  sysState.visual.turbulence += (sysState.targetVisual.turbulence - sysState.visual.turbulence) * lerpFactor;
  sysState.visual.flow += (sysState.targetVisual.flow - sysState.visual.flow) * lerpFactor;
  sysState.visual.shape += (sysState.targetVisual.shape - sysState.visual.shape) * lerpFactor;

  sysState.visual.energy = sysState.visual.energyLevel;
  sysState.visual.entropy = sysState.visual.entropyLevel;

  updateVisualUI();
  requestAnimationFrame(animate);
}

function applyVisualParameters(visual) {
  const palette = {
    primary: sanitizePaletteValue(visual.color_palette?.primary, '#7FE4FF'),
    secondary: sanitizePaletteValue(visual.color_palette?.secondary, '#EBF9FF'),
  };

  sysState.targetVisual.energyLevel = clamp(visual.energy, 0, 1.5);
  sysState.targetVisual.entropyLevel = clamp(visual.entropy, 0, 1.5);
  sysState.targetVisual.turbulence = clamp(visual.turbulence ?? sysState.targetVisual.turbulence, 0, 1.5);
  sysState.targetVisual.flow = clamp(visual.flow ?? sysState.targetVisual.flow, 0, 1.5);
  sysState.targetVisual.shape = clamp(visual.shape ?? sysState.targetVisual.shape, 0, 1.5);
  sysState.targetVisual.color_palette = palette;

  sysState.visual.color_palette = palette;

  if (globalThis.THREE?.Color) {
    // เตรียมสีที่ sanitize แล้วสำหรับ stage geometry/material ที่ใช้ THREE.
    sysState.visual.color = {
      primary: new globalThis.THREE.Color(palette.primary),
      secondary: new globalThis.THREE.Color(palette.secondary),
    };
  }
}

function handleIncomingState(payload) {
  const validation = validateIncomingStateSchema(payload);
  if (validation.ok) {
    setSystemState(validation.value.state);
    applyVisualParameters(validation.value.visual);
  } else {
    console.warn('Non-fatal stream validation failure', {
      reason: validation.reason,
      payload,
    });
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

function bootstrap() {
  bindInputEvents();
  bindSettings();
  bindSettingsPanel();
  initVoice();

  window.addEventListener('resize', manifestationEngine.resize);

  manifestationEngine.resize();
  const bootLanguage = languageLayer.resolveLanguage('');
  settings.sessionLanguageMemory = bootLanguage;
  setStatus(localizedUI('ready'));
  setConnectionStatus('DISCONNECTED');
  manifestationEngine.manifestText(bootLanguage === 'th' ? 'สวัสดี' : 'Hello', 'greeting');
  setReadableFallback(bootLanguage === 'th' ? 'สวัสดี' : 'Hello');
  requestAnimationFrame(manifestationEngine.render);
  requestAnimationFrame(animate);
  connectWS(settings.wsBase);
}
