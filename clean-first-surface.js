import { createLanguageLayer } from './first_use_surface/language-layer.js';
import { createLightManifestation } from './first_use_surface/light-manifestation.js';
import {
  markCompositionEnd,
  markCompositionStart,
  markInputCommitted,
  shouldSubmitOnEnter,
} from './first_use_surface/input-event-policy.js';
import { createSettingsStore } from './first_use_surface/settings-store.js';
import { createSettingsWorkspace } from './first_use_surface/settings-workspace.js';

const DEFAULT_INTENT_TIMEOUT_MS = 10000;

export const CONNECTION_STATES = Object.freeze({
  CONNECTED: 'CONNECTED',
  RECONNECTING: 'RECONNECTING',
  DISCONNECTED: 'DISCONNECTED',
});

export function createDefaultHomeShellState(activePane = 'interaction', reducedMotion = false) {
  return {
    settingsOpen: false,
    activePane,
    runtimeHydrated: false,
    gatewayConnected: false,
    voiceReady: false,
    manifestationReady: false,
    reducedMotion,
  };
}

export function resolveCompatibilityEndpoints(preferences) {
  const apiBase = (preferences.apiBase || '/api/v1/cognitive').replace(/\/$/, '');
  return {
    emitUrl: `${apiBase}/generate`,
    validateUrl: `${apiBase}/validate`,
    legacyIntentUrl: '/api/intent',
    wsUrl: preferences.wsBase || '/ws/cognitive-stream',
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

function adaptGenerateRequest(intent) {
  return {
    prompt: intent,
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

function createSessionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function createApp(documentRef = globalThis.document, deps = {}) {
  const documentAvailable = Boolean(documentRef?.getElementById);
  if (!documentAvailable) {
    return {
      bootstrap: () => {},
      openSettingsWorkspace: () => {},
      closeSettingsWorkspace: () => {},
      startRuntime: async () => {},
      getRuntimeSnapshot: () => ({ started: false }),
      getHomeState: () => createDefaultHomeShellState(),
    };
  }

  const storage = deps.storage ?? globalThis.localStorage;
  const store = createSettingsStore(storage);
  let preferences = store.load();

  const sessionId = createSessionId();
  const sessionAudit = [];
  const inputRuntime = { isComposing: false, lastCompositionEndAt: -Infinity };

  const elements = {
    canvas: documentRef.getElementById('manifestation-canvas'),
    form: documentRef.getElementById('composer'),
    input: documentRef.getElementById('intent-input'),
    sendButton: documentRef.getElementById('send-btn'),
    voiceButton: documentRef.getElementById('voice-btn'),
    statusText: documentRef.getElementById('ambient-status'),
    fallbackText: documentRef.getElementById('readable-fallback'),
    connectionStatus: documentRef.getElementById('connection-status'),
    apiBase: documentRef.getElementById('api-base'),
    wsBase: documentRef.getElementById('ws-base'),
    languagePreference: documentRef.getElementById('language-preference'),
    fontScale: documentRef.getElementById('font-scale'),
    runtimeMode: documentRef.getElementById('runtime-mode'),
    reducedMotionToggle: documentRef.getElementById('reduced-motion-toggle'),
    voiceEnabledToggle: documentRef.getElementById('voice-enabled-toggle'),
    telemetryToggle: documentRef.getElementById('telemetry-toggle'),
    governorToggle: documentRef.getElementById('governor-toggle'),
    manifestationToggle: documentRef.getElementById('manifestation-toggle'),
    developerToolsToggle: documentRef.getElementById('developer-tools-toggle'),
    environmentTarget: documentRef.getElementById('environment-target'),
    closeSettings: documentRef.getElementById('close-settings'),
    connectButton: documentRef.getElementById('btn-connect'),
    exportButton: documentRef.getElementById('export-session'),
    clearSessionButton: documentRef.getElementById('clear-session'),
    voiceCaptureButton: documentRef.getElementById('voice-capture'),
    dangerResetButton: documentRef.getElementById('danger-reset'),
    diagnostics: documentRef.getElementById('dev-diagnostics'),
  };

  const languageLayerFactory = deps.languageLayerFactory ?? createLanguageLayer;
  const manifestationFactory = deps.manifestationFactory ?? createLightManifestation;

  let languageLayer = null;
  let manifestationEngine = null;

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

  const homeState = createDefaultHomeShellState(preferences.activePane, preferences.reducedMotion);

  const pushSessionEvent = (event) => {
    sessionAudit.push({ ...event, at: new Date().toISOString() });
  };

  const setStatus = (text = '') => {
    if (elements.statusText) elements.statusText.textContent = text;
  };

  const setFallback = (text = '') => {
    if (elements.fallbackText) elements.fallbackText.textContent = text;
  };

  const setConnection = (state) => {
    if (!elements.connectionStatus) return;
    elements.connectionStatus.textContent = CONNECTION_STATES[state] ?? CONNECTION_STATES.DISCONNECTED;
  };

  const writeDiagnostics = () => {
    if (!elements.diagnostics) return;
    const payload = {
      pane: homeState.activePane,
      runtimeHydrated: homeState.runtimeHydrated,
      gatewayConnected: homeState.gatewayConnected,
      voiceReady: homeState.voiceReady,
      manifestationReady: homeState.manifestationReady,
      reducedMotion: homeState.reducedMotion,
    };
    elements.diagnostics.textContent = JSON.stringify(payload, null, 2);
  };

  const persistPreferences = (patch) => {
    preferences = store.merge({ ...preferences, ...patch });
    homeState.activePane = preferences.activePane;
    homeState.reducedMotion = Boolean(preferences.reducedMotion);
    writeDiagnostics();
  };

  const hydrateControls = () => {
    if (elements.apiBase) elements.apiBase.value = preferences.apiBase;
    if (elements.wsBase) elements.wsBase.value = preferences.wsBase;
    if (elements.languagePreference) elements.languagePreference.value = preferences.language;
    if (elements.fontScale) elements.fontScale.value = preferences.fontScale;
    if (elements.runtimeMode) elements.runtimeMode.value = preferences.runtimeMode;
    if (elements.reducedMotionToggle) elements.reducedMotionToggle.checked = preferences.reducedMotion;
    if (elements.voiceEnabledToggle) elements.voiceEnabledToggle.checked = preferences.voiceEnabled;
    if (elements.telemetryToggle) elements.telemetryToggle.checked = preferences.telemetryVisible;
    if (elements.governorToggle) elements.governorToggle.checked = preferences.governorVisible;
    if (elements.manifestationToggle) elements.manifestationToggle.checked = preferences.manifestationEnabled;
    if (elements.developerToolsToggle) elements.developerToolsToggle.checked = preferences.developerEnabled;
    if (elements.environmentTarget) elements.environmentTarget.value = preferences.environmentTarget;
  };

  const ensureManifestation = () => {
    if (manifestationEngine) return manifestationEngine;
    manifestationEngine = manifestationFactory(elements.canvas, preferences.reducedMotion);
    homeState.manifestationReady = true;
    return manifestationEngine;
  };

  const ensureLanguageLayer = () => {
    if (languageLayer) return languageLayer;
    languageLayer = languageLayerFactory(preferences);
    return languageLayer;
  };

  const applySubmissionState = (busy) => {
    if (elements.input) elements.input.disabled = busy;
    if (elements.sendButton) elements.sendButton.disabled = busy;
  };

  const handleIncomingState = (payload) => {
    const adapted = adaptIntentResponse(payload);
    if (adapted.text) {
      ensureManifestation().manifestText(String(adapted.text), 'stream');
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
      homeState.gatewayConnected = true;
      setConnection('CONNECTED');
      setStatus('Connected');
      writeDiagnostics();
    };

    socket.onclose = () => {
      runtime.wsConnected = false;
      homeState.gatewayConnected = false;
      runtime.socket = null;
      setConnection('DISCONNECTED');
      writeDiagnostics();
    };

    socket.onerror = () => {
      runtime.wsConnected = false;
      homeState.gatewayConnected = false;
      setConnection('DISCONNECTED');
      writeDiagnostics();
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

    const SpeechRecognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
    runtime.voiceSupported = Boolean(SpeechRecognition);
    runtime.voiceInitialized = true;

    if (!preferences.voiceEnabled || !runtime.voiceSupported) {
      elements.voiceButton?.setAttribute('disabled', 'true');
      elements.voiceCaptureButton?.setAttribute('disabled', 'true');
      homeState.voiceReady = false;
      writeDiagnostics();
      return;
    }

    runtime.recognition = new SpeechRecognition();
    homeState.voiceReady = true;

    const toggleListening = () => {
      if (!runtime.started || !runtime.recognition || !preferences.voiceEnabled) return;
      if (runtime.voiceListening) {
        runtime.recognition.stop();
      } else {
        runtime.recognition.lang = preferences.language === 'th' ? 'th-TH' : 'en-US';
        runtime.recognition.start();
      }
    };

    runtime.recognition.onstart = () => {
      runtime.voiceListening = true;
      setStatus('Listening');
    };

    runtime.recognition.onend = () => {
      runtime.voiceListening = false;
      setStatus('Ready');
    };

    runtime.recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) return;
      if (elements.input) elements.input.value = transcript;
      submitIntent(transcript);
    };

    elements.voiceButton?.addEventListener('click', toggleListening);
    elements.voiceCaptureButton?.addEventListener('click', toggleListening);
    writeDiagnostics();
  };

  const startRuntime = async () => {
    if (runtime.started) return;

    runtime.started = true;
    homeState.runtimeHydrated = true;
    documentRef.documentElement.classList.add('runtime-active');

    ensureManifestation();
    ensureLanguageLayer();

    setStatus('Runtime initialized');
    connectWS(preferences.wsBase);

    initVoice();

    if (!runtime.animationStarted) {
      manifestationEngine.resize();
      const raf = deps.raf ?? globalThis.requestAnimationFrame;
      raf?.(manifestationEngine.render);
      runtime.animationStarted = true;
    }

    writeDiagnostics();
  };

  const emitIntent = async (intent) => {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), DEFAULT_INTENT_TIMEOUT_MS);

    try {
      const endpoints = resolveCompatibilityEndpoints(preferences);
      const fetchImpl = deps.fetchImpl ?? fetch;
      let response = await fetchImpl(endpoints.emitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adaptGenerateRequest(intent)),
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403 || response.status === 422 || response.status === 404) {
        response = await fetchImpl(endpoints.legacyIntentUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adaptIntentRequest(intent, sessionId)),
          signal: controller.signal,
        });
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = await response.json();
      const adapted = adaptIntentResponse(payload);
      ensureManifestation().manifestText(adapted.text || intent, 'request');
      setFallback(adapted.text || intent);
      return adapted;
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  };

  const ensureInteractionRuntime = async () => {
    await startRuntime();
  };

  const submitIntent = async (intent) => {
    const text = intent.trim();
    if (!text) return;

    applySubmissionState(true);
    try {
      await ensureInteractionRuntime();
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

  const onPaneActivated = async (pane) => {
    persistPreferences({ activePane: pane });
    if (pane === 'interaction') {
      await ensureInteractionRuntime();
    }
  };

  const workspace = createSettingsWorkspace(documentRef, {
    windowRef: deps.windowRef ?? globalThis,
    getLastPane: () => preferences.activePane,
    onPaneActivated,
    onOpened: () => {
      homeState.settingsOpen = true;
      hydrateControls();
      writeDiagnostics();
    },
    onClosed: () => {
      homeState.settingsOpen = false;
      writeDiagnostics();
    },
  });

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

  const bindControlEvents = () => {
    elements.apiBase?.addEventListener('change', (event) => persistPreferences({ apiBase: event.target.value.trim() || '/api/v1/cognitive' }));
    elements.wsBase?.addEventListener('change', (event) => persistPreferences({ wsBase: event.target.value.trim() || '/ws/cognitive-stream' }));
    elements.languagePreference?.addEventListener('change', (event) => persistPreferences({ language: event.target.value }));
    elements.fontScale?.addEventListener('change', (event) => persistPreferences({ fontScale: event.target.value }));
    elements.runtimeMode?.addEventListener('change', (event) => persistPreferences({ runtimeMode: event.target.value }));
    elements.environmentTarget?.addEventListener('change', (event) => persistPreferences({ environmentTarget: event.target.value }));

    elements.reducedMotionToggle?.addEventListener('change', (event) => {
      const reducedMotion = event.target.checked;
      persistPreferences({ reducedMotion });
      if (manifestationEngine?.setReducedMotion) manifestationEngine.setReducedMotion(reducedMotion);
    });

    elements.voiceEnabledToggle?.addEventListener('change', (event) => {
      persistPreferences({ voiceEnabled: event.target.checked });
      if (runtime.voiceInitialized) {
        runtime.voiceInitialized = false;
        initVoice();
      }
    });

    elements.telemetryToggle?.addEventListener('change', (event) => persistPreferences({ telemetryVisible: event.target.checked }));
    elements.governorToggle?.addEventListener('change', (event) => persistPreferences({ governorVisible: event.target.checked }));
    elements.manifestationToggle?.addEventListener('change', (event) => persistPreferences({ manifestationEnabled: event.target.checked }));
    elements.developerToolsToggle?.addEventListener('change', (event) => persistPreferences({ developerEnabled: event.target.checked }));

    elements.connectButton?.addEventListener('click', async () => {
      await ensureInteractionRuntime();
      connectWS(preferences.wsBase);
    });

    elements.exportButton?.addEventListener('click', () => {
      const payload = { exportedAt: new Date().toISOString(), sessionId, preferences, trail: sessionAudit };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = documentRef.createElement('a');
      link.href = url;
      link.download = `aetherium_session_audit_${Date.now()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    });

    elements.clearSessionButton?.addEventListener('click', () => {
      sessionAudit.length = 0;
      setFallback('');
      setStatus('Session cleared');
    });

    elements.dangerResetButton?.addEventListener('click', () => {
      const confirmed = globalThis.confirm?.('Confirm dangerous reset?') ?? false;
      if (!confirmed) return;
      pushSessionEvent({ session_id: sessionId, transport: 'dangerous_reset_confirmed' });
      setStatus('Runtime reset queued');
    });
  };

  const bootstrap = () => {
    workspace.bind();
    bindInputEvents();
    bindControlEvents();

    setStatus('');
    setFallback('');
    setConnection('DISCONNECTED');
    hydrateControls();
    writeDiagnostics();

    if (typeof globalThis.addEventListener === 'function') {
      globalThis.addEventListener('resize', () => manifestationEngine?.resize?.());
    }
  };

  return {
    bootstrap,
    openSettingsWorkspace: (pane) => workspace.open(pane),
    closeSettingsWorkspace: () => workspace.close(),
    startRuntime,
    getRuntimeSnapshot: () => ({ ...runtime }),
    getHomeState: () => ({ ...homeState }),
    getWorkspaceLayoutMode: workspace.getLayoutMode,
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const app = createApp(document);
  app.bootstrap();
}
