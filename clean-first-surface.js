const canvas = document.getElementById('manifestation-canvas');
const context = canvas.getContext('2d');
const input = document.getElementById('intent-input');
const form = document.getElementById('composer');
const statusText = document.getElementById('ambient-status');
const fallbackText = document.getElementById('readable-fallback');
const settingsPanel = document.getElementById('settings-panel');
const settingsToggle = document.getElementById('settings-toggle');
const closeSettings = document.getElementById('close-settings');
const voiceBtn = document.getElementById('voice-btn');

const settings = {
  languagePreference: 'auto',
  useLocalDetector: true,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  voiceEnabled: true,
  apiBase: '/api',
  wsBase: '/ws/cognitive-stream',
  runtimeMode: 'calm',
  telemetry: true,
  sessionLanguageMemory: 'th',
};

const sessionAudit = [];
const particles = Array.from({ length: 280 }, () => ({
  x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + 0.5, vx: (Math.random() - 0.5) * 0.0006, vy: (Math.random() - 0.5) * 0.0006,
}));

const manifestation = {
  text: '',
  at: 0,
  mood: 'calm',
};

function resize() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function detectFromInput(text) {
  if (!text) return 'unknown';
  const thaiChars = (text.match(/[\u0E00-\u0E7F]/g) || []).length;
  const latinChars = (text.match(/[A-Za-z]/g) || []).length;
  if (thaiChars > latinChars) return 'th';
  if (latinChars > 0) return 'en';
  return 'unknown';
}

function detectFromBrowser() {
  const locale = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  return locale.toLowerCase().startsWith('th') ? 'th' : 'en';
}

function optionalLocalDetector(text) {
  if (!settings.useLocalDetector || !text) return 'unknown';
  const normalized = text.toLowerCase();
  if (/[\u0E00-\u0E7F]/.test(normalized) || /ครับ|ค่ะ|สวัสดี|ขอบคุณ/.test(normalized)) return 'th';
  if (/\b(hello|hi|thanks|please|what|how)\b/.test(normalized)) return 'en';
  return 'unknown';
}

function chooseLanguage(text) {
  if (settings.languagePreference !== 'auto') return settings.languagePreference;
  const browserLang = detectFromBrowser();
  const inputLang = detectFromInput(text);
  const localModelLang = optionalLocalDetector(text);
  const resolved = inputLang !== 'unknown'
    ? inputLang
    : localModelLang !== 'unknown'
      ? localModelLang
      : settings.sessionLanguageMemory || browserLang;
  settings.sessionLanguageMemory = resolved;
  return resolved;
}

function routeResponse(text, language) {
  const normalized = text.trim().toLowerCase();
  const isGreeting = /^(hello|hi|hey|สวัสดี|หวัดดี)/i.test(normalized);
  const isGratitude = /(thank|ขอบคุณ)/i.test(normalized);
  const isQuestion = normalized.includes('?') || /^(what|how|why|when|where|อะไร|ทำไม|อย่างไร)/i.test(normalized);

  if (isGreeting) {
    return {
      mood: 'greeting',
      status: language === 'th' ? 'กำลังก่อรูปคำทักทาย' : 'Manifesting a greeting',
      text: language === 'th' ? 'สวัสดี ยินดีที่ได้พบคุณ' : 'Hello, glad you are here.',
    };
  }

  if (isGratitude) {
    return {
      mood: 'warm',
      status: language === 'th' ? 'ตอบรับด้วยความอบอุ่น' : 'Acknowledging warmly',
      text: language === 'th' ? 'ด้วยความยินดี ฉันอยู่ตรงนี้เพื่อคุณ' : 'You are welcome. I am here with you.',
    };
  }

  if (isQuestion) {
    return {
      mood: 'answer',
      status: language === 'th' ? 'กำลังตีความคำถาม' : 'Interpreting your question',
      text: language === 'th'
        ? 'ฉันรับคำถามแล้ว และกำลังก่อรูปคำตอบให้ชัดที่สุด'
        : 'I hear your question and will shape a concise answer.',
    };
  }

  return {
    mood: 'ambiguity',
    status: language === 'th' ? 'กำลังตีความอย่างนุ่มนวล' : 'Interpreting softly',
    text: language === 'th'
      ? 'ฉันรับสัญญาณของคุณแล้ว ลองขยายเพิ่มอีกเล็กน้อยได้เสมอ'
      : 'I received your signal. You can add a little more detail anytime.',
  };
}

function manifestText(text, mood) {
  manifestation.text = text;
  manifestation.at = performance.now();
  manifestation.mood = mood;
  fallbackText.textContent = text;
}

function setStatus(text) {
  statusText.textContent = text;
}

function render(ts) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  context.clearRect(0, 0, w, h);

  context.fillStyle = 'rgba(4,5,10,0.24)';
  context.fillRect(0, 0, w, h);

  const wave = settings.reducedMotion ? 0 : Math.sin(ts * 0.00045) * 0.12;
  for (const p of particles) {
    if (!settings.reducedMotion) {
      p.x += p.vx + wave * 0.00015;
      p.y += p.vy;
      if (p.x < 0 || p.x > 1) p.vx *= -1;
      if (p.y < 0 || p.y > 1) p.vy *= -1;
    }
    const x = p.x * w;
    const y = p.y * h;
    const glow = settings.reducedMotion ? 0.18 : 0.3 + Math.sin((x + ts * 0.1) * 0.01) * 0.1;
    context.fillStyle = `rgba(127,228,255,${glow})`;
    context.beginPath();
    context.arc(x, y, p.r, 0, Math.PI * 2);
    context.fill();
  }

  if (manifestation.text) {
    const elapsed = Math.max(0, ts - manifestation.at);
    const alpha = settings.reducedMotion ? 1 : Math.min(1, elapsed / 540);
    const blur = manifestation.mood === 'warm' ? 22 : manifestation.mood === 'answer' ? 16 : 14;
    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `600 ${Math.max(24, Math.min(56, w * 0.045))}px Sarabun, Inter, sans-serif`;
    context.shadowColor = 'rgba(127,228,255,0.9)';
    context.shadowBlur = settings.reducedMotion ? 0 : blur;
    context.fillStyle = `rgba(235,249,255,${alpha})`;
    context.fillText(manifestation.text, w * 0.5, h * 0.46);
    context.restore();
  }

  requestAnimationFrame(render);
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

function applySettingsBindings() {
  document.getElementById('language-preference').addEventListener('change', (event) => {
    settings.languagePreference = event.target.value;
  });
  document.getElementById('local-detector-toggle').addEventListener('change', (event) => {
    settings.useLocalDetector = event.target.checked;
  });
  document.getElementById('reduced-motion-toggle').addEventListener('change', (event) => {
    settings.reducedMotion = event.target.checked;
  });
  document.getElementById('voice-enabled-toggle').addEventListener('change', (event) => {
    settings.voiceEnabled = event.target.checked;
  });
  document.getElementById('api-base').addEventListener('input', (event) => { settings.apiBase = event.target.value.trim(); });
  document.getElementById('ws-base').addEventListener('input', (event) => { settings.wsBase = event.target.value.trim(); });
  document.getElementById('runtime-mode').addEventListener('change', (event) => { settings.runtimeMode = event.target.value; });
  document.getElementById('telemetry-toggle').addEventListener('change', (event) => { settings.telemetry = event.target.checked; });
  document.getElementById('export-session').addEventListener('click', exportSessionAudit);
}

function initVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceBtn.disabled = true;
    voiceBtn.title = 'Speech API unavailable';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  let listening = false;
  voiceBtn.addEventListener('click', () => {
    if (!settings.voiceEnabled) return;
    if (listening) {
      recognition.stop();
      return;
    }
    recognition.lang = chooseLanguage(input.value || '') === 'th' ? 'th-TH' : 'en-US';
    recognition.start();
  });

  recognition.onstart = () => {
    listening = true;
    voiceBtn.setAttribute('aria-pressed', 'true');
    setStatus(settings.sessionLanguageMemory === 'th' ? 'กำลังฟังเสียง' : 'Listening');
  };

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim();
    if (transcript) {
      input.value = transcript;
      form.requestSubmit();
    }
  };

  recognition.onerror = () => {
    setStatus(settings.sessionLanguageMemory === 'th' ? 'เสียงไม่พร้อม ใช้การพิมพ์แทน' : 'Voice unavailable, type instead');
  };

  recognition.onend = () => {
    listening = false;
    voiceBtn.setAttribute('aria-pressed', 'false');
  };
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const language = chooseLanguage(text);
  const response = routeResponse(text, language);
  setStatus(response.status);
  manifestText(response.text, response.mood);

  sessionAudit.push({ at: new Date().toISOString(), input: text, language, response });
  input.value = '';
});

settingsToggle.addEventListener('click', () => {
  const open = settingsPanel.hidden;
  settingsPanel.hidden = !open;
  settingsToggle.setAttribute('aria-expanded', String(open));
  if (open) document.getElementById('api-base').focus();
});

closeSettings.addEventListener('click', () => {
  settingsPanel.hidden = true;
  settingsToggle.setAttribute('aria-expanded', 'false');
  settingsToggle.focus();
});

window.addEventListener('resize', resize);

applySettingsBindings();
initVoice();
resize();
setStatus('พร้อมฟัง');
manifestText('สวัสดี — Hello', 'greeting');
requestAnimationFrame(render);
