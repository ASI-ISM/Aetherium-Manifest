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
    wsUrl: preferences.wsBase || '/ws/cognitive-stream',
    authSessionUrl: '/api/v1/auth/session',
    authSessionRefreshUrl: '/api/v1/auth/session/refresh',
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Unable to read attached image'));
    reader.readAsDataURL(file);
  });
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
  let sessionRole = 'viewer';
  const sessionAudit = [];
  const inputRuntime = { isComposing: false, lastCompositionEndAt: -Infinity };
  const imageRuntime = { file: null, dataUrl: '' };

  const elements = {
    canvas: documentRef.getElementById('manifestation-canvas'),
    form: documentRef.getElementById('composer'),
    input: documentRef.getElementById('intent-input'),
    imageInput: documentRef.getElementById('intent-image-input'),
    attachImageButton: documentRef.getElementById('attach-image-btn'),
    clearImageButton: documentRef.getElementById('clear-image-btn'),
    imageAttachmentStatus: documentRef.getElementById('image-attachment-status'),
    sendButton: documentRef.getElementById('send-btn'),
    voiceButton: documentRef.getElementById('voice-btn'),
    statusText: documentRef.getElementById('ambient-status'),
    fallbackText: documentRef.getElementById('readable-fallback'),
    connectionStatus: documentRef.getElementById('connection-status'),
    tokenState: documentRef.getElementById('token-state'),
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
    dangerResetConfirmButton: documentRef.getElementById('danger-reset-confirm'),
    reconnectConfirmButton: documentRef.getElementById('btn-connect-confirm'),
    sessionRole: documentRef.getElementById('session-role'),
    roleGuardState: documentRef.getElementById('role-guard-state'),
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
  const sessionTicket = {
    value: '',
    expiresAtMs: 0,
    state: 'renew required',
  };

  const homeState = createDefaultHomeShellState(preferences.activePane, preferences.reducedMotion);

  const pushSessionEvent = (event) => {
    sessionAudit.push({
      event_type: event.event_type || 'session_event',
      actor: event.actor || sessionRole,
      session_id: event.session_id || sessionId,
      control: event.control || event.transport || 'session',
      old_value: event.old_value ?? null,
      new_value: event.new_value ?? null,
      timestamp: event.timestamp || new Date().toISOString(),
      metadata: event.metadata || {},
    });
  };

  const auditRuntimeChange = (control, before, after, metadata = {}) => {
    pushSessionEvent({
      event_type: 'runtime_change',
      control,
      old_value: before,
      new_value: after,
      metadata,
    });
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

  const setSessionTicketState = (text = 'Session ticket: renew required') => {
    if (!elements.tokenState) return;
    elements.tokenState.textContent = text;
  };

  const isSessionTicketValid = () => {
    return Boolean(sessionTicket.value) && sessionTicket.expiresAtMs > Date.now();
  };

  const syncTicketPaneState = () => {
    if (!sessionTicket.value) {
      setSessionTicketState('Session ticket: renew required');
      return;
    }
    if (!isSessionTicketValid()) {
      sessionTicket.state = 'renew required';
      setSessionTicketState('Session ticket: renew required');
      return;
    }
    const secondsLeft = Math.max(0, Math.floor((sessionTicket.expiresAtMs - Date.now()) / 1000));
    sessionTicket.state = 'issued';
    setSessionTicketState(`Session ticket: issued (${secondsLeft}s left)`);
  };

  const issueSessionTicket = async ({ refresh = false } = {}) => {
    const endpoints = resolveCompatibilityEndpoints(preferences);
    const fetchImpl = deps.fetchImpl ?? fetch;
    const url = refresh ? endpoints.authSessionRefreshUrl : endpoints.authSessionUrl;
    const body = refresh
      ? { ticket: sessionTicket.value }
      : { session_id: sessionId, role: sessionRole, scope: sessionRole === 'operator' ? 'cognitive:stream:privileged' : 'cognitive:stream' };

    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(deps.apiKey ? { 'X-API-Key': deps.apiKey } : {}) },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      sessionTicket.value = '';
      sessionTicket.expiresAtMs = 0;
      sessionTicket.state = 'renew required';
      syncTicketPaneState();
      throw new Error(`ticket bootstrap failed (${response.status})`);
    }

    const payload = await response.json();
    sessionTicket.value = payload.ticket || '';
    sessionTicket.expiresAtMs = payload.expires_at ? Date.parse(payload.expires_at) : 0;
    sessionTicket.state = payload.state || 'issued';
    syncTicketPaneState();
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
      role: sessionRole,
    };
    elements.diagnostics.textContent = JSON.stringify(payload, null, 2);
  };

  const persistPreferences = (patch) => {
    preferences = store.merge({ ...preferences, ...patch });
    homeState.activePane = preferences.activePane;
    homeState.reducedMotion = Boolean(preferences.reducedMotion);
    writeDiagnostics();
  };

  const setRoleGuardState = (text) => {
    if (elements.roleGuardState) elements.roleGuardState.textContent = text;
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
    if (elements.attachImageButton) elements.attachImageButton.disabled = busy;
    if (elements.clearImageButton) elements.clearImageButton.disabled = busy;
  };

  const setImageAttachmentStatus = (text = '') => {
    if (elements.imageAttachmentStatus) elements.imageAttachmentStatus.textContent = text;
  };

  const clearImageAttachment = () => {
    imageRuntime.file = null;
    imageRuntime.dataUrl = '';
    if (elements.imageInput) elements.imageInput.value = '';
    if (elements.clearImageButton) elements.clearImageButton.hidden = true;
    setImageAttachmentStatus('');
  };

  const setImageAttachment = async (file) => {
    if (!file) {
      clearImageAttachment();
      return;
    }
    if (!file.type.startsWith('image/')) {
      clearImageAttachment();
      throw new Error('Unsupported attachment. Please choose an image file.');
    }
    imageRuntime.file = file;
    imageRuntime.dataUrl = await readFileAsDataUrl(file);
    if (elements.clearImageButton) elements.clearImageButton.hidden = false;
    setImageAttachmentStatus(`Attached image: ${file.name}`);
  };

  const handleIncomingState = (payload) => {
    const adapted = adaptIntentResponse(payload);
    if (adapted.text) {
      ensureManifestation().manifestText(String(adapted.text), 'stream');
      setFallback(String(adapted.text));
    }
    pushSessionEvent({ session_id: sessionId, transport: 'ws_state', payload: adapted });
  };

  const connectWS = async (url) => {
    if (!runtime.started) return;

    const target = resolveWsUrl(url);
    if (!target) return;
    if (!isSessionTicketValid()) {
      await issueSessionTicket({ refresh: Boolean(sessionTicket.value) });
    }

    if (runtime.socket) {
      runtime.socket.close();
      runtime.socket = null;
    }

    setConnection('RECONNECTING');
    const socketFactory = deps.socketFactory ?? ((wsUrl) => new WebSocket(wsUrl));
    const wsTarget = new URL(target);
    wsTarget.searchParams.set('ticket', sessionTicket.value);
    const socket = socketFactory(wsTarget.toString(), ['aetherium-ticket-v1']);
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
      syncTicketPaneState();
      writeDiagnostics();
    };

    socket.onerror = () => {
      runtime.wsConnected = false;
      homeState.gatewayConnected = false;
      setConnection('DISCONNECTED');
      syncTicketPaneState();
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
    await connectWS(preferences.wsBase);

    initVoice();

    if (!runtime.animationStarted) {
      manifestationEngine.resize();
      const raf = deps.raf ?? globalThis.requestAnimationFrame;
      raf?.(manifestationEngine.render);
      runtime.animationStarted = true;
    }

    writeDiagnostics();
  };

  const emitIntent = async (intent, imagePayload = null) => {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), DEFAULT_INTENT_TIMEOUT_MS);

    try {
      const endpoints = resolveCompatibilityEndpoints(preferences);
      const fetchImpl = deps.fetchImpl ?? fetch;
      const response = await fetchImpl(endpoints.emitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...adaptGenerateRequest(intent),
          image: imagePayload,
        }),
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) {
        sessionTicket.value = '';
        sessionTicket.expiresAtMs = 0;
        sessionTicket.state = 'renew required';
        syncTicketPaneState();
        setConnection('DISCONNECTED');
        throw new Error('Session ticket required');
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      syncTicketPaneState();
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
    const imagePayload = imageRuntime.dataUrl
      ? {
          data_url: imageRuntime.dataUrl,
          mime_type: imageRuntime.file?.type || 'image/*',
          filename: imageRuntime.file?.name || 'upload',
        }
      : null;
    if (!text && !imagePayload) return;

    applySubmissionState(true);
    try {
      await ensureInteractionRuntime();
      await emitIntent(text, imagePayload);
      pushSessionEvent({
        session_id: sessionId,
        intent: text,
        transport: 'intent_posted',
        metadata: { image_attached: Boolean(imagePayload), image_name: imagePayload?.filename || null },
      });
      if (elements.input) elements.input.value = '';
      clearImageAttachment();
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
    getRole: () => sessionRole,
    onRoleGuardApplied: (role) => {
      setRoleGuardState(role === 'operator' ? 'Operator role active: critical controls unlocked.' : 'Viewer role active: critical controls locked.');
    },
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

    elements.attachImageButton?.addEventListener('click', () => {
      elements.imageInput?.click();
    });

    elements.imageInput?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      try {
        await setImageAttachment(file || null);
      } catch (error) {
        setStatus(error.message || 'Attachment failed');
      }
    });

    elements.clearImageButton?.addEventListener('click', () => {
      clearImageAttachment();
    });
  };

  const bindControlEvents = () => {
    elements.apiBase?.addEventListener('change', (event) => persistPreferences({ apiBase: event.target.value.trim() || '/api/v1/cognitive' }));
    elements.wsBase?.addEventListener('change', (event) => persistPreferences({ wsBase: event.target.value.trim() || '/ws/cognitive-stream' }));
    elements.languagePreference?.addEventListener('change', (event) => persistPreferences({ language: event.target.value }));
    elements.fontScale?.addEventListener('change', (event) => persistPreferences({ fontScale: event.target.value }));
    elements.runtimeMode?.addEventListener('change', (event) => {
      const nextValue = event.target.value;
      auditRuntimeChange('runtimeMode', preferences.runtimeMode, nextValue);
      persistPreferences({ runtimeMode: nextValue });
    });
    elements.environmentTarget?.addEventListener('change', (event) => {
      const nextValue = event.target.value;
      auditRuntimeChange('environmentTarget', preferences.environmentTarget, nextValue);
      persistPreferences({ environmentTarget: nextValue });
    });

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

    elements.telemetryToggle?.addEventListener('change', (event) => {
      const nextValue = event.target.checked;
      auditRuntimeChange('telemetryToggle', preferences.telemetryVisible, nextValue);
      persistPreferences({ telemetryVisible: nextValue });
    });
    elements.governorToggle?.addEventListener('change', (event) => {
      const nextValue = event.target.checked;
      auditRuntimeChange('governorToggle', preferences.governorVisible, nextValue);
      persistPreferences({ governorVisible: nextValue });
    });
    elements.manifestationToggle?.addEventListener('change', (event) => {
      const nextValue = event.target.checked;
      auditRuntimeChange('manifestationToggle', preferences.manifestationEnabled, nextValue);
      persistPreferences({ manifestationEnabled: nextValue });
    });
    elements.developerToolsToggle?.addEventListener('change', (event) => persistPreferences({ developerEnabled: event.target.checked }));

    let reconnectArmed = false;
    let dangerResetArmed = false;

    elements.connectButton?.addEventListener('click', () => {
      reconnectArmed = true;
      if (elements.reconnectConfirmButton) elements.reconnectConfirmButton.disabled = false;
      setStatus('Reconnect armed. Confirm to continue.');
    });

    elements.reconnectConfirmButton?.addEventListener('click', async () => {
      if (!reconnectArmed) return;
      reconnectArmed = false;
      elements.reconnectConfirmButton.disabled = true;
      auditRuntimeChange('reconnectAction', 'armed', 'confirmed');
      await ensureInteractionRuntime();
      await connectWS(preferences.wsBase);
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
      dangerResetArmed = true;
      if (elements.dangerResetConfirmButton) elements.dangerResetConfirmButton.disabled = false;
      setStatus('Dangerous reset armed. Confirm to continue.');
    });

    elements.dangerResetConfirmButton?.addEventListener('click', () => {
      if (!dangerResetArmed) return;
      dangerResetArmed = false;
      elements.dangerResetConfirmButton.disabled = true;
      auditRuntimeChange('dangerousReset', 'armed', 'confirmed');
      setStatus('Runtime reset queued');
    });

    elements.sessionRole?.addEventListener('change', (event) => {
      const previousRole = sessionRole;
      sessionRole = event.target.value === 'operator' ? 'operator' : 'viewer';
      workspace.applyRoleGuards(sessionRole);
      if (sessionRole !== 'operator') {
        reconnectArmed = false;
        dangerResetArmed = false;
        if (elements.reconnectConfirmButton) elements.reconnectConfirmButton.disabled = true;
        if (elements.dangerResetConfirmButton) elements.dangerResetConfirmButton.disabled = true;
      }
      pushSessionEvent({
        event_type: 'role_change',
        control: 'sessionRole',
        old_value: previousRole,
        new_value: sessionRole,
      });
    });
  };

  const bootstrap = () => {
    workspace.bind();
    bindInputEvents();
    bindControlEvents();

    setStatus('');
    setFallback('');
    setConnection('DISCONNECTED');
    syncTicketPaneState();
    hydrateControls();
    workspace.applyRoleGuards(sessionRole);
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
    getSessionAudit: () => sessionAudit.map((entry) => ({ ...entry })),
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const app = createApp(document);
  app.bootstrap();
}
