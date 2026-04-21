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
const CONNECTION_STATES = Object.freeze({
  CONNECTED: 'CONNECTED',
  RECONNECTING: 'RECONNECTING',
  DISCONNECTED: 'DISCONNECTED',
});

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

function localizedUI(key) {
  return uiText[activeLanguage()][key];
}

function setStatus(statusText) {
  elements.statusText.textContent = statusText;
}

function setConnectionStatus(state) {
  if (!elements.connectionStatus) return;
  const normalizedState = CONNECTION_STATES[state] ?? CONNECTION_STATES.DISCONNECTED;
  elements.connectionStatus.textContent = normalizedState;
  elements.connectionStatus.dataset.connectionState = normalizedState.toLowerCase();
}

function setReadableFallback(text) {
  elements.fallbackText.textContent = text;
}

function applySubmissionState(isBusy) {
  elements.input.disabled = isBusy;
  elements.sendButton.disabled = isBusy;
}

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

function parseWsPayload(rawMessage) {
  if (typeof rawMessage !== 'string') return null;
  try {
    return JSON.parse(rawMessage);
  } catch {
    console.warn('Dropped non-JSON WS message', { rawMessage });
    return null;
  }
}

function clampToVisualRange(value) {
  return Math.max(0, Math.min(1.5, value));
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizePaletteValue(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(normalized) ? normalized : fallback;
}

function validateIncomingStateSchema(payload) {
  if (!isRecord(payload)) {
    return { ok: false, reason: 'payload must be an object' };
  }

  const { state, visual } = payload;
  if (typeof state !== 'string' || !state.trim()) {
    return { ok: false, reason: 'payload.state must be a non-empty string' };
  }

  if (!isRecord(visual)) {
    return { ok: false, reason: 'payload.visual must be an object' };
  }

  if (typeof visual.energy !== 'number' || !Number.isFinite(visual.energy)) {
    return { ok: false, reason: 'payload.visual.energy must be a finite number' };
  }

  if (typeof visual.entropy !== 'number' || !Number.isFinite(visual.entropy)) {
    return { ok: false, reason: 'payload.visual.entropy must be a finite number' };
  }

  if (!isRecord(visual.color_palette)) {
    return { ok: false, reason: 'payload.visual.color_palette must be an object' };
  }

  if (typeof visual.color_palette.primary !== 'string') {
    return { ok: false, reason: 'payload.visual.color_palette.primary must be a string' };
  }

  if (typeof visual.color_palette.secondary !== 'string') {
    return { ok: false, reason: 'payload.visual.color_palette.secondary must be a string' };
  }

  return {
    ok: true,
    value: {
      state: state.trim(),
      visual: {
        energy: clampToVisualRange(visual.energy),
        entropy: clampToVisualRange(visual.entropy),
        color_palette: {
          primary: sanitizePaletteValue(visual.color_palette.primary, '#7FE4FF'),
          secondary: sanitizePaletteValue(visual.color_palette.secondary, '#EBF9FF'),
        },
      },
    },
  };
}

function applyVisualParameters(visual) {
  const palette = {
    primary: sanitizePaletteValue(visual.color_palette?.primary, '#7FE4FF'),
    secondary: sanitizePaletteValue(visual.color_palette?.secondary, '#EBF9FF'),
  };

  sysState.visual = {
    energy: clampToVisualRange(visual.energy),
    entropy: clampToVisualRange(visual.entropy),
    color_palette: palette,
  };

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
  if (!validation.ok) {
    console.warn('Non-fatal stream validation failure', {
      reason: validation.reason,
      payload,
    });
    return;
  }

  sysState.state = validation.value.state;
  applyVisualParameters(validation.value.visual);

  const fallbackText = payload?.text
    ?? payload?.message
    ?? payload?.intent_state?.state
    ?? validation.value.state
    ?? '';

  if (fallbackText) {
    manifestationEngine.manifestText(String(fallbackText), 'stream');
    setReadableFallback(String(fallbackText));
  }

  pushSessionEvent({
    session_id: sessionId,
    transport: 'ws_state',
    payload,
  });
}

function scheduleReconnect() {
  clearReconnectTimer();
  if (!connectionRuntime.shouldReconnect || !connectionRuntime.url) {
    setConnectionStatus('DISCONNECTED');
    return;
  }

  connectionRuntime.reconnectAttempts += 1;
  const delayMs = nextReconnectDelayMs(connectionRuntime.reconnectAttempts);
  setConnectionStatus('RECONNECTING');
  setStatus(`Reconnecting in ${Math.round(delayMs / 1000)}s`);

  connectionRuntime.reconnectTimer = window.setTimeout(() => {
    connectWS(connectionRuntime.url);
  }, delayMs);
}

function connectWS(url) {
  const resolvedUrl = resolveWsUrl(url);
  connectionRuntime.url = resolvedUrl;
  if (!resolvedUrl) {
    connectionRuntime.shouldReconnect = false;
    setConnectionStatus('DISCONNECTED');
    setStatus('WS url is empty');
    return;
  }

  clearReconnectTimer();

  if (connectionRuntime.socket) {
    connectionRuntime.shouldReconnect = false;
    connectionRuntime.socket.close();
    connectionRuntime.socket = null;
  }

  connectionRuntime.shouldReconnect = true;
  setConnectionStatus('RECONNECTING');

  const socket = new WebSocket(resolvedUrl);
  connectionRuntime.socket = socket;

  socket.onopen = () => {
    connectionRuntime.reconnectAttempts = 0;
    setConnectionStatus('CONNECTED');
    setStatus('WS connected');
  };

  socket.onmessage = (event) => {
    const payload = parseWsPayload(event.data);
    if (payload !== null) {
      handleIncomingState(payload);
    }
  };

  socket.onclose = () => {
    if (connectionRuntime.socket === socket) {
      connectionRuntime.socket = null;
    }
    if (!connectionRuntime.shouldReconnect) {
      setConnectionStatus('DISCONNECTED');
      return;
    }
    scheduleReconnect();
  };

  socket.onerror = () => {
    setConnectionStatus('RECONNECTING');
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  };
}

function exportSessionAudit() {
  const payload = {
    exportedAt: new Date().toISOString(),
    settings,
    trail: sessionAudit,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `aetherium_session_audit_${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function emitIntent(intent) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), DEFAULT_INTENT_TIMEOUT_MS);

  try {
    const apiBase = settings.apiBase.replace(/\/$/, '');
    const response = await fetch(`${apiBase}/intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent,
        session_id: sessionId,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Timeout after ${DEFAULT_INTENT_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function submitIntent(intent) {
  const text = intent.trim();
  if (!text) return;

  applySubmissionState(true);
  setStatus('Intent sent');

  try {
    await emitIntent(text);
    console.info('Intent sent', { session_id: sessionId });
    setStatus('Awaiting stream update');
    setReadableFallback('Awaiting stream update');
    console.info('Awaiting stream update', { session_id: sessionId });

    pushSessionEvent({
      session_id: sessionId,
      intent: text,
      transport: 'intent_posted',
    });

    elements.input.value = '';
    persistSettings();
  } catch (error) {
    const transportError = `Transport error: ${error.message}`;
    console.error(transportError);
    setStatus(transportError);
    setReadableFallback(transportError);
    pushSessionEvent({
      session_id: sessionId,
      intent: text,
      transport: 'intent_failed',
      error: error.message,
    });
  } finally {
    applySubmissionState(false);
  }
}

function bindInputEvents() {
  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitIntent(elements.input.value);
  });

  elements.input.addEventListener('compositionstart', () => {
    markCompositionStart(inputRuntime);
  });

  elements.input.addEventListener('compositionend', (event) => {
    markCompositionEnd(inputRuntime, event.timeStamp);
  });


  elements.input.addEventListener('beforeinput', (event) => {
    if (event.inputType === 'insertCompositionText' || event.inputType === 'deleteCompositionText') {
      markCompositionStart(inputRuntime);
    }
  });

  elements.input.addEventListener('input', (event) => {
    if (event.isComposing) {
      markCompositionStart(inputRuntime);
      return;
    }

    if (event.inputType !== 'insertCompositionText' && event.inputType !== 'deleteCompositionText') {
      markInputCommitted(inputRuntime);
    }
  });

  elements.input.addEventListener('keydown', (event) => {
    if (!shouldSubmitOnEnter(event, inputRuntime)) return;

    event.preventDefault();
    elements.form.requestSubmit();
  });
}

function bindSettings() {
  const byId = (id) => document.getElementById(id);

  const bindingMap = [
    ['language-preference', 'change', (event) => { settings.languagePreference = event.target.value; }],
    ['local-detector-toggle', 'change', (event) => { settings.useLocalDetector = event.target.checked; }],
    ['local-model-profile', 'change', (event) => { settings.localModelProfile = event.target.value; }],
    ['reduced-motion-toggle', 'change', (event) => {
      settings.reducedMotion = event.target.checked;
      manifestationEngine.setReducedMotion(settings.reducedMotion);
    }],
    ['voice-enabled-toggle', 'change', (event) => {
      settings.voiceEnabled = event.target.checked;
      const isDisabled = !settings.voiceEnabled || !voiceRuntime.isSupported;
      elements.voiceButton.disabled = isDisabled;
      elements.voiceCaptureButton.disabled = isDisabled;
      if (isDisabled) {
        elements.voiceButton.setAttribute('aria-pressed', 'false');
      }
    }],
    ['api-base', 'change', (event) => { settings.apiBase = event.target.value.trim(); }],
    ['ws-base', 'change', (event) => {
      settings.wsBase = event.target.value.trim();
      const cfgWs = byId('cfg-ws');
      if (cfgWs && !cfgWs.value.trim()) {
        cfgWs.value = settings.wsBase;
      }
    }],
    ['cfg-ws', 'change', (event) => { settings.wsBase = event.target.value.trim(); }],
    ['runtime-mode', 'change', (event) => { settings.runtimeMode = event.target.value; }],
    ['telemetry-toggle', 'change', (event) => { settings.telemetry = event.target.checked; }],
    ['lineage-toggle', 'change', (event) => { settings.lineage = event.target.checked; }],
    ['scholar-toggle', 'change', (event) => { settings.scholar = event.target.checked; }],
    ['governor-toggle', 'change', (event) => { settings.governorDebug = event.target.checked; }],
    ['devtools-toggle', 'change', (event) => { settings.developerTools = event.target.checked; }],
  ];

  bindingMap.forEach(([id, type, handler]) => {
    const el = byId(id);
    if (!el) return;

    el.addEventListener(type, (event) => {
      handler(event);
      persistSettings();
    });
  });

  byId('export-session').addEventListener('click', exportSessionAudit);

  byId('language-preference').value = settings.languagePreference;
  byId('local-detector-toggle').checked = settings.useLocalDetector;
  byId('local-model-profile').value = settings.localModelProfile;
  byId('reduced-motion-toggle').checked = settings.reducedMotion;
  byId('voice-enabled-toggle').checked = settings.voiceEnabled;
  byId('api-base').value = settings.apiBase;
  byId('ws-base').value = settings.wsBase;
  byId('runtime-mode').value = settings.runtimeMode;
  if (byId('cfg-ws')) {
    byId('cfg-ws').value = settings.wsBase;
  }
  byId('telemetry-toggle').checked = settings.telemetry;
  byId('lineage-toggle').checked = settings.lineage;
  byId('scholar-toggle').checked = settings.scholar;
  byId('governor-toggle').checked = settings.governorDebug;
  byId('devtools-toggle').checked = settings.developerTools;
  if (byId('btn-connect')) {
    byId('btn-connect').addEventListener('click', () => {
      const manualUrl = byId('cfg-ws')?.value?.trim() ?? settings.wsBase;
      settings.wsBase = manualUrl || settings.wsBase;
      persistSettings();
      connectWS(manualUrl);
    });
  }
}

function setVoiceUiState(isListening) {
  voiceRuntime.isListening = isListening;
  elements.voiceButton.setAttribute('aria-pressed', isListening ? 'true' : 'false');
  elements.voiceCaptureButton.textContent = isListening ? 'Stop voice capture' : 'Start voice capture';
  setStatus(isListening ? localizedUI('listening') : localizedUI('ready'));
}

function initVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  voiceRuntime.isSupported = Boolean(SpeechRecognition);

  const disabledByPolicy = !settings.voiceEnabled;
  elements.voiceButton.disabled = disabledByPolicy || !voiceRuntime.isSupported;
  elements.voiceCaptureButton.disabled = disabledByPolicy || !voiceRuntime.isSupported;

  if (!voiceRuntime.isSupported) {
    elements.voiceCaptureButton.textContent = 'Voice unavailable';
    elements.voiceCaptureButton.title = 'Speech API unavailable';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  voiceRuntime.recognition = recognition;

  const toggleListening = () => {
    if (!settings.voiceEnabled || !voiceRuntime.recognition) return;

    if (voiceRuntime.isListening) {
      voiceRuntime.recognition.stop();
      return;
    }

    const language = languageLayer.resolveLanguage(elements.input.value || '');
    voiceRuntime.recognition.lang = language === 'th' ? 'th-TH' : 'en-US';
    voiceRuntime.recognition.start();
  };

  elements.voiceCaptureButton.addEventListener('click', toggleListening);
  elements.voiceButton.addEventListener('click', toggleListening);

  recognition.onstart = () => {
    setVoiceUiState(true);
  };

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim();
    if (!transcript) return;
    elements.input.value = transcript;
    submitIntent(transcript);
  };

  recognition.onerror = () => {
    setStatus(localizedUI('voiceUnavailable'));
  };

  recognition.onend = () => {
    setVoiceUiState(false);
  };
}

function openSettingsPanel() {
  elements.settingsPanel.hidden = false;
  elements.settingsToggle.setAttribute('aria-expanded', 'true');
  document.getElementById('intent-input').focus();
}

function closeSettingsPanel() {
  elements.settingsPanel.hidden = true;
  elements.settingsToggle.setAttribute('aria-expanded', 'false');
  elements.settingsToggle.focus();
}

function bindSettingsPanel() {
  elements.settingsToggle.addEventListener('click', () => {
    if (elements.settingsPanel.hidden) {
      openSettingsPanel();
      return;
    }
    closeSettingsPanel();
  });

  elements.closeSettings.addEventListener('click', closeSettingsPanel);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.settingsPanel.hidden) {
      closeSettingsPanel();
    }
  });

  document.addEventListener('click', (event) => {
    if (elements.settingsPanel.hidden) return;
    const target = event.target;
    const clickedInsidePanel = elements.settingsPanel.contains(target);
    const clickedToggle = elements.settingsToggle.contains(target);
    if (!clickedInsidePanel && !clickedToggle) {
      closeSettingsPanel();
    }
  });
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
  connectWS(settings.wsBase);
}

bootstrap();
