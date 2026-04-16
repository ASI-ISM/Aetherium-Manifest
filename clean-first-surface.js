import { createLanguageLayer } from './first_use_surface/language-layer.js';
import { createLightManifestation } from './first_use_surface/light-manifestation.js';
import { routeLightResponse } from './first_use_surface/response-orchestrator.js';

const elements = {
  canvas: document.getElementById('manifestation-canvas'),
  form: document.getElementById('composer'),
  input: document.getElementById('intent-input'),
  sendButton: document.getElementById('send-btn'),
  statusText: document.getElementById('ambient-status'),
  fallbackText: document.getElementById('readable-fallback'),
  settingsPanel: document.getElementById('settings-panel'),
  settingsToggle: document.getElementById('settings-toggle'),
  closeSettings: document.getElementById('close-settings'),
  voiceButton: document.getElementById('voice-btn'),
};

const settings = {
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
  sessionLanguageMemory: 'th',
};

const sessionAudit = [];
const languageLayer = createLanguageLayer(settings);
const manifestationEngine = createLightManifestation(elements.canvas, settings.reducedMotion);

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
    ['voice-enabled-toggle', 'change', (event) => { settings.voiceEnabled = event.target.checked; }],
    ['api-base', 'input', (event) => { settings.apiBase = event.target.value.trim(); }],
    ['ws-base', 'input', (event) => { settings.wsBase = event.target.value.trim(); }],
    ['runtime-mode', 'change', (event) => { settings.runtimeMode = event.target.value; }],
    ['telemetry-toggle', 'change', (event) => { settings.telemetry = event.target.checked; }],
    ['lineage-toggle', 'change', (event) => { settings.lineage = event.target.checked; }],
    ['scholar-toggle', 'change', (event) => { settings.scholar = event.target.checked; }],
    ['governor-toggle', 'change', (event) => { settings.governorDebug = event.target.checked; }],
    ['devtools-toggle', 'change', (event) => { settings.developerTools = event.target.checked; }],
  ];

  bindingMap.forEach(([id, type, handler]) => {
    const el = byId(id);
    if (el) el.addEventListener(type, handler);
  });
  byId('export-session').addEventListener('click', exportSessionAudit);

  byId('reduced-motion-toggle').checked = settings.reducedMotion;
}

function initVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    elements.voiceButton.disabled = true;
    elements.voiceButton.title = 'Speech API unavailable';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  let listening = false;

  elements.voiceButton.addEventListener('click', () => {
    if (!settings.voiceEnabled) return;

    if (listening) {
      recognition.stop();
      return;
    }

    const language = languageLayer.resolveLanguage(elements.input.value || '');
    recognition.lang = language === 'th' ? 'th-TH' : 'en-US';
    recognition.start();
  });

  recognition.onstart = () => {
    listening = true;
    elements.voiceButton.setAttribute('aria-pressed', 'true');
    setStatus(settings.sessionLanguageMemory === 'th' ? 'กำลังฟังเสียง' : 'Listening');
  };

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim();
    if (!transcript) return;
    elements.input.value = transcript;
    elements.form.requestSubmit();
  };

  recognition.onerror = () => {
    setStatus(settings.sessionLanguageMemory === 'th' ? 'เสียงไม่พร้อม ใช้การพิมพ์แทน' : 'Voice unavailable, type instead');
  };

  recognition.onend = () => {
    listening = false;
    elements.voiceButton.setAttribute('aria-pressed', 'false');
  };
}

function onComposerSubmit(event) {
  event.preventDefault();
  const text = elements.input.value.trim();
  if (!text) return;

  applySubmissionState(true);
  setStatus(settings.sessionLanguageMemory === 'th' ? 'กำลังตีความ' : 'Interpreting');

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
  applySubmissionState(false);
}

function bindSettingsPanel() {
  elements.settingsToggle.addEventListener('click', () => {
    const willOpen = elements.settingsPanel.hidden;
    elements.settingsPanel.hidden = !willOpen;
    elements.settingsToggle.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) document.getElementById('api-base').focus();
  });

  elements.closeSettings.addEventListener('click', () => {
    elements.settingsPanel.hidden = true;
    elements.settingsToggle.setAttribute('aria-expanded', 'false');
    elements.settingsToggle.focus();
  });
}

function bootstrap() {
  bindSettings();
  bindSettingsPanel();
  initVoice();

  elements.form.addEventListener('submit', onComposerSubmit);
  window.addEventListener('resize', manifestationEngine.resize);

  manifestationEngine.resize();
  setStatus('พร้อมฟัง');
  manifestationEngine.manifestText('สวัสดี — Hello', 'greeting');
  setReadableFallback('สวัสดี — Hello');
  requestAnimationFrame(manifestationEngine.render);
}

bootstrap();
