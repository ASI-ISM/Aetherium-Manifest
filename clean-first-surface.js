import { createLanguageLayer } from './first_use_surface/language-layer.js';
import { createLightManifestation } from './first_use_surface/light-manifestation.js';
import {
  markCompositionEnd,
  markCompositionStart,
  markInputCommitted,
  shouldSubmitOnEnter,
} from './first_use_surface/input-event-policy.js';

const STORAGE_KEY = 'aetherium:first-surface-settings:v2';
const DEFAULT_INTENT_TIMEOUT_MS = 10000;

export const CONNECTION_STATES = Object.freeze({
  CONNECTED: 'CONNECTED',
  RECONNECTING: 'RECONNECTING',
  DISCONNECTED: 'DISCONNECTED',
});

const DEFAULT_ADAPTER = Object.freeze({
  apiCompatibilityPath: '/api/intent',
  websocketPath: '/ws/cognitive-stream',
});

const defaultSettings = {
  languagePreference: 'auto',
  useLocalDetector: true,
  localModelProfile: 'tiny-rules',
  reducedMotion: false,
  voiceEnabled: true,
  apiBase: '/api',
  wsBase: '/ws/cognitive-stream',
  runtimeMode: 'calm',
  telemetry: true,
  lineage: false,
  scholar: false,
  governorDebug: false,
  developerTools: false,
  sessionLanguageMemory: 'en',
};

function createSessionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function loadSettings(storage = globalThis.localStorage) {
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const language = (globalThis.navigator?.language || 'en').toLowerCase().startsWith('th') ? 'th' : 'en';

  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaultSettings, reducedMotion, sessionLanguageMemory: language };
    }
    return { ...defaultSettings, reducedMotion, sessionLanguageMemory: language, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings, reducedMotion, sessionLanguageMemory: language };
  }
}

export function resolveCompatibilityEndpoints(settings) {
  const apiBase = (settings.apiBase || '/api').replace(/\/$/, '');
  return {
    intentUrl: `${apiBase}/intent`,
    wsUrl: settings.wsBase || DEFAULT_ADAPTER.websocketPath,
  };
}

export function adaptIntentRequest(intent, sessionId) {
  return {
    prompt: intent,
    session_id: sessionId,
    model: 'gpt-4o',
    temperature: 0.4,
  };
}

export function adaptIntentResponse(payload) {
  const state = payload?.intent_vector?.category || payload?.state || 'calm';
  const visual = payload?.visual_manifestation;
  return {
    state,
    text: payload?.text || '',
    visual: {
      energy: payload?.intent_vector?.energy_level ?? 0.5,
      entropy: Math.abs(payload?.intent_vector?.emotional_valence ?? 0),
      color_palette: {
        primary: visual?.color_palette?.primary || '#7FE4FF',
        secondary: visual?.color_palette?.secondary || '#EBF9FF',
      },
      turbulence: visual?.particle_physics?.turbulence ?? 0,
      flow: visual?.particle_physics?.flow_direction === 'flow' ? 1 : 0,
      shape: visual?.base_shape === 'ring' ? 0.5 : 0.7,
    },
  };
}

function resolveWsUrl(inputUrl = '') {
  const source = inputUrl.trim();
  if (!source) return '';
  if (/^wss?:\/\//i.test(source)) return source;
  if (/^https?:\/\//i.test(source)) return source.replace(/^http/i, 'ws');

  const base = new URL(globalThis.location?.href || 'http://localhost');
  const wsProtocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${base.host}${source.startsWith('/') ? source : `/${source}`}`;
}

export function createApp(documentRef = globalThis.document, deps = {}) {
  const documentAvailable = Boolean(documentRef?.getElementById);
  if (!documentAvailable) {
    return {
      bootstrap: () => {},
      openSettingsPanel: () => {},
      closeSettingsPanel: () => {},
      startRuntime: async () => {},
      getRuntimeSnapshot: () => ({ started: false }),
    };
  }

  const storage = deps.storage ?? globalThis.localStorage;
  const settings = loadSettings(storage);
  const sessionId = createSessionId();
  const sessionAudit = [];

  const elements = {
    canvas: documentRef.getElementById('manifestation-canvas'),
    form: documentRef.getElementById('composer'),
    input: documentRef.getElementById('intent-input'),
    sendButton: documentRef.getElementById('send-btn'),
    voiceButton: documentRef.getElementById('voice-btn'),
    statusText: documentRef.getElementById('ambient-status'),
    fallbackText: documentRef.getElementById('readable-fallback'),
    settingsPanel: documentRef.getElementById('settings-panel'),
    settingsToggle: documentRef.getElementById('settings-toggle'),
    closeSettings: documentRef.getElementById('close-settings'),
    voiceCaptureButton: documentRef.getElementById('voice-capture'),
    connectionStatus: documentRef.getElementById('connection-status'),
    runtimeInitButton: documentRef.getElementById('init-runtime'),
  };

  const languageLayerFactory = deps.languageLayerFactory ?? createLanguageLayer;
  const manifestationFactory = deps.manifestationFactory ?? createLightManifestation;
  const languageLayer = languageLayerFactory(settings);
  const manifestationEngine = manifestationFactory(elements.canvas, settings.reducedMotion);

  const runtime = {
    started: false,
    animationStarted: false,
    wsConnected: false,
    socket: null,
    voiceInitialized: false,
    voiceListening: false,
    voiceSupported: false,
    recognition: null,
  };

  const inputRuntime = { isComposing: false, lastCompositionEndAt: -Infinity };

  const persistSettings = () => {
    storage?.setItem(STORAGE_KEY, JSON.stringify(settings));
  };

  const setStatus = (text) => {
    if (elements.statusText) elements.statusText.textContent = text;
  };

  const setFallback = (text) => {
    if (elements.fallbackText) elements.fallbackText.textContent = text;
  };

  const setConnection = (state) => {
    if (!elements.connectionStatus) return;
    elements.connectionStatus.textContent = CONNECTION_STATES[state] ?? CONNECTION_STATES.DISCONNECTED;
  };

  const applySubmissionState = (busy) => {
    if (elements.input) elements.input.disabled = busy;
    if (elements.sendButton) elements.sendButton.disabled = busy;
  };

  const pushSessionEvent = (event) => {
    sessionAudit.push({ ...event, at: new Date().toISOString() });
  };

  const handleIncomingState = (payload) => {
    const adapted = adaptIntentResponse(payload);
    if (adapted.text) {
      manifestationEngine.manifestText(String(adapted.text), 'stream');
      setFallback(String(adapted.text));
    }
    pushSessionEvent({ session_id: sessionId, transport: 'ws_state', payload: adapted });
  };

  const connectWS = (url) => {
    if (!runtime.started) return;
    const target = resolveWsUrl(url);
    if (!target) return;

    if (runtime.socket) {
      runtime.socket.close();
      runtime.socket = null;
    }

    setConnection('RECONNECTING');
    const socketFactory = deps.socketFactory ?? ((wsUrl) => new WebSocket(wsUrl));
    const socket = socketFactory(target);
    runtime.socket = socket;

    socket.onopen = () => {
      runtime.wsConnected = true;
      setConnection('CONNECTED');
      setStatus('WS connected');
    };

    socket.onclose = () => {
      runtime.wsConnected = false;
      runtime.socket = null;
      setConnection('DISCONNECTED');
    };

    socket.onerror = () => {
      setConnection('DISCONNECTED');
    };

    socket.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      try {
        handleIncomingState(JSON.parse(event.data));
      } catch {
        // best-effort stream parser
      }
    };
  };

  const initVoice = () => {
    if (runtime.voiceInitialized) return;
    runtime.voiceInitialized = true;

    const SpeechRecognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
    runtime.voiceSupported = Boolean(SpeechRecognition);

    const isDisabled = !settings.voiceEnabled || !runtime.voiceSupported;
    if (elements.voiceButton) elements.voiceButton.disabled = isDisabled;
    if (elements.voiceCaptureButton) elements.voiceCaptureButton.disabled = isDisabled;

    if (!runtime.voiceSupported) {
      if (elements.voiceCaptureButton) {
        elements.voiceCaptureButton.textContent = 'Voice unavailable';
      }
      return;
    }

    const recognition = new SpeechRecognition();
    runtime.recognition = recognition;

    const toggleListening = () => {
      if (!runtime.started || !settings.voiceEnabled || !runtime.recognition) return;
      if (runtime.voiceListening) {
        runtime.recognition.stop();
      } else {
        runtime.recognition.lang = settings.sessionLanguageMemory === 'th' ? 'th-TH' : 'en-US';
        runtime.recognition.start();
      }
    };

    recognition.onstart = () => {
      runtime.voiceListening = true;
      setStatus('Listening');
    };

    recognition.onend = () => {
      runtime.voiceListening = false;
      setStatus('Ready');
    };

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) return;
      if (elements.input) elements.input.value = transcript;
      submitIntent(transcript);
    };

    elements.voiceButton?.addEventListener('click', toggleListening);
    elements.voiceCaptureButton?.addEventListener('click', toggleListening);
  };

  const emitIntent = async (intent) => {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), DEFAULT_INTENT_TIMEOUT_MS);

    try {
      const endpoints = resolveCompatibilityEndpoints(settings);
      const fetchImpl = deps.fetchImpl ?? fetch;
      const response = await fetchImpl(endpoints.intentUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adaptIntentRequest(intent, sessionId)),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const adapted = adaptIntentResponse(payload);
      manifestationEngine.manifestText(adapted.text || intent, 'request');
      setFallback(adapted.text || intent);
      return adapted;
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  };

  const submitIntent = async (intent) => {
    const text = intent.trim();
    if (!text) return;
    applySubmissionState(true);

    try {
      await startRuntime();
      await emitIntent(text);
      pushSessionEvent({ session_id: sessionId, intent: text, transport: 'intent_posted' });
      if (elements.input) elements.input.value = '';
    } catch (error) {
      const message = `Transport error: ${error.message}`;
      setStatus(message);
      setFallback(message);
      pushSessionEvent({ session_id: sessionId, intent: text, transport: 'intent_failed', error: error.message });
    } finally {
      applySubmissionState(false);
    }
  };

  const bindInputEvents = () => {
    elements.form?.addEventListener('submit', (event) => {
      event.preventDefault();
      submitIntent(elements.input?.value || '');
    });

    elements.input?.addEventListener('compositionstart', () => markCompositionStart(inputRuntime));
    elements.input?.addEventListener('compositionend', (event) => markCompositionEnd(inputRuntime, event.timeStamp));

    elements.input?.addEventListener('input', (event) => {
      if (event.isComposing) {
        markCompositionStart(inputRuntime);
      } else {
        markInputCommitted(inputRuntime);
      }
    });

    elements.input?.addEventListener('keydown', (event) => {
      if (!shouldSubmitOnEnter(event, inputRuntime)) return;
      event.preventDefault();
      elements.form?.requestSubmit();
    });
  };

  const openSettingsPanel = () => {
    if (!elements.settingsPanel) return;
    elements.settingsPanel.hidden = false;
    elements.settingsToggle?.setAttribute('aria-expanded', 'true');
    (elements.runtimeInitButton || elements.input || elements.closeSettings)?.focus();
  };

  const closeSettingsPanel = () => {
    if (!elements.settingsPanel) return;
    elements.settingsPanel.hidden = true;
    elements.settingsToggle?.setAttribute('aria-expanded', 'false');
    elements.settingsToggle?.focus();
  };

  const bindSettingsPanel = () => {
    elements.settingsToggle?.addEventListener('click', () => {
      if (elements.settingsPanel?.hidden) {
        openSettingsPanel();
      } else {
        closeSettingsPanel();
      }
    });

    elements.closeSettings?.addEventListener('click', closeSettingsPanel);
    documentRef.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !elements.settingsPanel?.hidden) closeSettingsPanel();
    });
  };

  const bindSettings = () => {
    const byId = (id) => documentRef.getElementById(id);

    byId('api-base')?.addEventListener('change', (event) => {
      settings.apiBase = event.target.value.trim() || '/api';
      persistSettings();
    });
    byId('ws-base')?.addEventListener('change', (event) => {
      settings.wsBase = event.target.value.trim() || DEFAULT_ADAPTER.websocketPath;
      persistSettings();
    });
    byId('voice-enabled-toggle')?.addEventListener('change', (event) => {
      settings.voiceEnabled = event.target.checked;
      persistSettings();
    });

    byId('btn-connect')?.addEventListener('click', async () => {
      await startRuntime();
      connectWS(settings.wsBase);
    });

    byId('export-session')?.addEventListener('click', () => {
      const payload = { exportedAt: new Date().toISOString(), settings, trail: sessionAudit };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = documentRef.createElement('a');
      link.href = url;
      link.download = `aetherium_session_audit_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });

    elements.runtimeInitButton?.addEventListener('click', () => {
      startRuntime();
    });
  };

  const startRuntime = async () => {
    if (runtime.started) return;
    runtime.started = true;
    documentRef.documentElement.classList.add('runtime-active');
    setStatus('Runtime initialized');

    initVoice();
    connectWS(settings.wsBase);

    if (!runtime.animationStarted) {
      manifestationEngine.resize();
      const raf = deps.raf ?? globalThis.requestAnimationFrame;
      raf?.(manifestationEngine.render);
      runtime.animationStarted = true;
    }
  };

  const bootstrap = () => {
    bindInputEvents();
    bindSettings();
    bindSettingsPanel();

    setStatus('Surface ready');
    setConnection('DISCONNECTED');
    setFallback('');
    persistSettings();

    if (typeof globalThis.addEventListener === 'function') {
      globalThis.addEventListener('resize', manifestationEngine.resize);
    }

    const bootLanguage = languageLayer.resolveLanguage('');
    settings.sessionLanguageMemory = bootLanguage;
  };

  return {
    bootstrap,
    openSettingsPanel,
    closeSettingsPanel,
    startRuntime,
    getRuntimeSnapshot: () => ({ ...runtime }),
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const app = createApp(document);
  app.bootstrap();
}
