import { createLanguageLayer } from './first_use_surface/language-layer.js';
import { createLightManifestation } from './first_use_surface/light-manifestation.js';
import { routeLightResponse } from './first_use_surface/response-orchestrator.js';
import {
  markCompositionEnd,
  markCompositionStart,
  markInputCommitted,
  shouldSubmitOnEnter,
} from './first_use_surface/input-event-policy.js';

const STORAGE_KEY = 'aetherium:first-surface-settings:v1';

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

function submitIntent(intent) {
  const text = intent.trim();
  if (!text) return;

  applySubmissionState(true);
  setStatus(localizedUI('interpreting'));

  const language = languageLayer.resolveLanguage(text);
  const response = routeLightResponse(text, language);

  manifestationEngine.manifestText(response.text, response.mood);
  setReadableFallback(response.text);
  setStatus(response.status);

  pushSessionEvent({
    input: text,
    language,
    response,
  });

  elements.input.value = '';
  persistSettings();
  applySubmissionState(false);
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
    ['ws-base', 'change', (event) => { settings.wsBase = event.target.value.trim(); }],
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
  byId('telemetry-toggle').checked = settings.telemetry;
  byId('lineage-toggle').checked = settings.lineage;
  byId('scholar-toggle').checked = settings.scholar;
  byId('governor-toggle').checked = settings.governorDebug;
  byId('devtools-toggle').checked = settings.developerTools;
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
  manifestationEngine.manifestText(bootLanguage === 'th' ? 'สวัสดี' : 'Hello', 'greeting');
  setReadableFallback(bootLanguage === 'th' ? 'สวัสดี' : 'Hello');
  requestAnimationFrame(manifestationEngine.render);
}

bootstrap();
