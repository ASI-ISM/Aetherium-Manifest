# Aetherium Manifest — Voice Conversation + Language/Locale Voice Patch

## เป้าหมาย
- พูดกับหน้า Manifest ได้
- เลือกภาษา UI / ภาษา STT / ภาษาเสียงพูดกลับได้
- เลือกเสียงตามภาษาท้องถิ่นอัตโนมัติ
- ใช้ browser voice เมื่อมี และ fallback ไป backend voice model เมื่อ browser speech recognition ใช้ไม่ได้

## สิ่งที่ควรแก้ใน repo

### 1) `index.html`
เพิ่ม UI ตั้งค่า:
- language select
- region select
- voice select
- auto speak toggle
- browser STT / backend STT toggle

### 2) `api_gateway/main.py`
เพิ่มหรือทำให้ endpoint พวกนี้ใช้งานจริง:
- `GET /api/v1/voice/model?language=th-TH&region=apac`
- `GET /api/v1/i18n/locale/{lang}`
- `POST /api/v1/voice/preferences` (optional)
- `POST /api/v1/voice/transcribe` (fallback STT)

### 3) `locales/*.json`
เพิ่ม key สำหรับ voice + language settings

---

## Frontend state ที่แนะนำ

```js
const voiceState = {
  uiLanguage: localStorage.getItem('am.uiLanguage') || (navigator.language || 'en-US'),
  speechLanguage: localStorage.getItem('am.speechLanguage') || (navigator.language || 'en-US'),
  region: localStorage.getItem('am.region') || inferRegionFromLocale(navigator.language || 'en-US'),
  selectedVoiceURI: localStorage.getItem('am.voiceURI') || '',
  autoSpeak: localStorage.getItem('am.autoSpeak') === '1',
  sttMode: localStorage.getItem('am.sttMode') || 'browser', // browser | backend
  voices: [],
  backendVoiceModel: null,
  recognition: null,
  recognizing: false,
};
```

---

## Locale / region helper

```js
function inferRegionFromLocale(tag) {
  try {
    const locale = new Intl.Locale(tag).maximize();
    const region = (locale.region || '').toUpperCase();
    if (!region) return 'us';
    if (['TH','SG','MY','JP','KR','VN','ID','PH','AU','NZ','IN'].includes(region)) return 'apac';
    if (['MX','AR','BR','CL','CO','PE'].includes(region)) return 'latam';
    if (['GB','DE','FR','ES','IT','NL','SE','NO','FI','PL'].includes(region)) return 'eu';
    return 'us';
  } catch {
    return 'us';
  }
}
```

---

## โหลด locale จาก backend หรือไฟล์ static

```js
async function loadLocale(langTag) {
  const short = langTag.split('-')[0].toLowerCase();

  try {
    const res = await fetch(`./locales/${short}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error('locale not found');
    const dict = await res.json();
    applyLocale(dict, langTag);
    voiceState.uiLanguage = langTag;
    localStorage.setItem('am.uiLanguage', langTag);
  } catch (err) {
    console.warn('[AETHERIUM][i18n-fallback]', err);
  }
}

function applyLocale(dict, langTag) {
  document.documentElement.lang = langTag;
  document.getElementById('chat-input').placeholder = dict.chat_placeholder || 'Send a message...';
  document.getElementById('send-btn').setAttribute('aria-label', dict.send || 'Send');
  document.getElementById('voice-btn').setAttribute('aria-label', dict.voice_input || 'Voice');
  document.getElementById('settings-btn').setAttribute('aria-label', dict.settings || 'Settings');
  const status = document.getElementById('status-line');
  if (status && !voiceState.recognizing) {
    status.textContent = dict.voice_idle || 'voice: idle';
  }
}
```

---

## โหลดรายชื่อเสียงจากอุปกรณ์

```js
function getVoiceCandidatesForLanguage(langTag) {
  const langBase = langTag.split('-')[0].toLowerCase();
  return voiceState.voices.filter(v => {
    const vLang = (v.lang || '').toLowerCase();
    return vLang === langTag.toLowerCase() || vLang.startsWith(`${langBase}-`) || vLang === langBase;
  });
}

function chooseBestVoice(langTag) {
  const exact = voiceState.voices.find(v => v.voiceURI === voiceState.selectedVoiceURI);
  if (exact) return exact;

  const candidates = getVoiceCandidatesForLanguage(langTag);
  return candidates.find(v => v.default) || candidates[0] || null;
}

function refreshVoices() {
  if (!('speechSynthesis' in window)) return;
  voiceState.voices = window.speechSynthesis.getVoices();
  renderVoiceOptions();
}

function initVoices() {
  if (!('speechSynthesis' in window)) return;
  refreshVoices();
  if ('onvoiceschanged' in window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }
}
```

---

## พูดตอบกลับด้วยเสียงตามภาษา

```js
function speakAssistant(text, langTag = voiceState.speechLanguage) {
  if (!voiceState.autoSpeak || !('speechSynthesis' in window) || !text) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langTag;

  const voice = chooseBestVoice(langTag);
  if (voice) utterance.voice = voice;

  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
}
```

---

## Browser Speech Recognition พร้อม fallback

```js
function supportsBrowserSTT() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function createRecognition(langTag) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const recognition = new SR();
  recognition.lang = langTag;
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    voiceState.recognizing = true;
    voiceBtn.classList.add('recording');
    statusLine.textContent = 'voice: listening';
  };

  recognition.onresult = (event) => {
    let finalText = '';
    let interimText = '';

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const transcript = event.results[i][0]?.transcript || '';
      if (event.results[i].isFinal) finalText += transcript;
      else interimText += transcript;
    }

    chatInput.value = (finalText || interimText).trim();
    autoGrowTextarea();

    if (finalText.trim()) {
      submitMessage(finalText.trim(), { source: 'voice', lang: langTag });
    }
  };

  recognition.onerror = async (event) => {
    console.warn('[AETHERIUM][stt-error]', event.error);
    if (voiceState.sttMode === 'backend') {
      await startBackendRecordingAndTranscribe(langTag);
    }
  };

  recognition.onend = () => {
    voiceState.recognizing = false;
    voiceBtn.classList.remove('recording');
    statusLine.textContent = 'voice: idle';
  };

  return recognition;
}

async function toggleVoiceInput() {
  const langTag = voiceState.speechLanguage;

  if (voiceState.recognizing && voiceState.recognition) {
    voiceState.recognition.stop();
    return;
  }

  if (voiceState.sttMode === 'browser' && supportsBrowserSTT()) {
    voiceState.recognition = createRecognition(langTag);
    voiceState.recognition?.start();
    return;
  }

  await startBackendRecordingAndTranscribe(langTag);
}
```

---

## Backend fallback STT (MediaRecorder -> FastAPI)

```js
async function startBackendRecordingAndTranscribe(langTag) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const chunks = [];
  const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

  voiceState.recognizing = true;
  voiceBtn.classList.add('recording');
  statusLine.textContent = 'voice: recording';

  mediaRecorder.ondataavailable = (e) => {
    if (e.data?.size) chunks.push(e.data);
  };

  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const form = new FormData();
    form.append('audio', blob, 'voice.webm');
    form.append('language', langTag);
    form.append('region', voiceState.region);

    const res = await fetch(`${API_BASE}/api/v1/voice/transcribe`, {
      method: 'POST',
      headers: { 'X-API-Key': API_KEY },
      body: form,
    });

    const json = await res.json();
    const text = (json.text || '').trim();
    if (text) {
      chatInput.value = text;
      autoGrowTextarea();
      submitMessage(text, { source: 'voice-backend', lang: langTag });
    }

    stream.getTracks().forEach(t => t.stop());
    voiceState.recognizing = false;
    voiceBtn.classList.remove('recording');
    statusLine.textContent = 'voice: idle';
  };

  setTimeout(() => mediaRecorder.stop(), 6000);
  mediaRecorder.start();
}
```

---

## ดึง voice model จาก backend ให้สัมพันธ์กับภาษา/ภูมิภาค

```js
async function refreshBackendVoiceModel() {
  const url = new URL(`${API_BASE}/api/v1/voice/model`);
  url.searchParams.set('language', voiceState.speechLanguage);
  url.searchParams.set('region', voiceState.region);

  const res = await fetch(url, {
    headers: { 'X-API-Key': API_KEY },
  });

  if (!res.ok) return;
  const json = await res.json();
  voiceState.backendVoiceModel = json.model;

  const label = document.getElementById('voice-model-label');
  if (label) label.textContent = json.model;
}
```

---

## แก้ `submitMessage()` ให้พูดคำตอบกลับ

```js
async function submitMessage(text, meta = {}) {
  const response = await fetch(`${API_BASE}/api/v1/cognitive/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      prompt: text,
      model: 'gpt-4o',
      temperature: 0.6,
      language: voiceState.speechLanguage,
      region: voiceState.region,
      source: meta.source || 'text',
    }),
  });

  const json = await response.json();
  const answer = json.text || '';

  renderAssistantText(answer);
  speakAssistant(answer, voiceState.speechLanguage);
}
```

---

## FastAPI — เพิ่ม endpoint สำหรับ locale

```py
from pathlib import Path
from fastapi import Query
from fastapi.responses import JSONResponse

LOCALES_DIR = Path(__file__).resolve().parent.parent / 'locales'

@app.get('/api/v1/i18n/locale/{lang}')
async def get_locale(lang: str, x_api_key: str | None = Header(None, alias='X-API-Key')):
    _ensure_api_key(x_api_key)
    short = lang.split('-')[0].lower()
    target = LOCALES_DIR / f'{short}.json'
    if not target.exists():
        raise HTTPException(status_code=404, detail='locale not found')
    return JSONResponse(content=json.loads(target.read_text(encoding='utf-8')))
```

---

## FastAPI — ทำ endpoint voice model ให้ใช้จริง

```py
@app.get('/api/v1/voice/model')
async def get_voice_model(
    language: str = Query('en-US'),
    region: str = Query('us'),
    x_api_key: str | None = Header(None, alias='X-API-Key'),
):
    _ensure_api_key(x_api_key)
    model = _resolve_voice_model(language, region)
    return {
        'language': language,
        'region': region,
        'model': model,
        'provider': 'speech-router',
    }
```

---

## FastAPI — fallback transcription endpoint

```py
from fastapi import File, Form, UploadFile

@app.post('/api/v1/voice/transcribe')
async def transcribe_voice(
    audio: UploadFile = File(...),
    language: str = Form('en-US'),
    region: str = Form('us'),
    x_api_key: str | None = Header(None, alias='X-API-Key'),
):
    _ensure_api_key(x_api_key)

    audio_bytes = await audio.read()
    model = _resolve_voice_model(language, region)

    # TODO: replace with real provider call
    # transcript = await invoke_stt_provider(audio_bytes, mime_type=audio.content_type, model=model, language=language)
    transcript = ''

    return {
        'text': transcript,
        'language': language,
        'region': region,
        'model': model,
        'bytes': len(audio_bytes),
    }
```

---

## Locale keys ที่ควรเติม

### `locales/en.json`
```json
{
  "chat_placeholder": "Send a message to the light...",
  "send": "Send",
  "settings": "Settings",
  "voice_input": "Voice input",
  "voice_idle": "voice: idle",
  "voice_listening": "voice: listening",
  "voice_recording": "voice: recording",
  "language": "Language",
  "region": "Region",
  "voice": "Voice",
  "auto_speak": "Speak replies aloud",
  "stt_mode": "Speech recognition mode"
}
```

### `locales/th.json`
```json
{
  "chat_placeholder": "ส่งข้อความถึงแสง...",
  "send": "ส่ง",
  "settings": "ตั้งค่า",
  "voice_input": "ป้อนเสียง",
  "voice_idle": "เสียง: ว่าง",
  "voice_listening": "เสียง: กำลังฟัง",
  "voice_recording": "เสียง: กำลังบันทึก",
  "language": "ภาษา",
  "region": "ภูมิภาค",
  "voice": "เสียงพูด",
  "auto_speak": "อ่านคำตอบออกเสียง",
  "stt_mode": "โหมดรู้จำเสียง"
}
```

---

## พฤติกรรมที่แนะนำ

1. หน้าเว็บเปิดมา -> อ่าน `navigator.languages` -> เลือก `uiLanguage` และ `speechLanguage`
2. ใช้ `Intl.Locale(...).maximize()` หา region ถ้าไม่มี region ชัดเจน
3. ดึง locale JSON ตามภาษา
4. ดึงรายการ voices จากอุปกรณ์
5. ดึง backend voice model จาก `/api/v1/voice/model`
6. กดปุ่มไมค์:
   - ถ้า browser STT ใช้ได้ -> ใช้ `SpeechRecognition`
   - ถ้าใช้ไม่ได้ -> อัดเสียง + ส่ง `/api/v1/voice/transcribe`
7. ได้ transcript แล้ว -> ส่ง `/api/v1/cognitive/generate`
8. ได้คำตอบแล้ว -> render + `speechSynthesis.speak()`

---

## ข้อควรระวัง
- `SpeechRecognition` รองรับไม่เท่ากันทุกเบราว์เซอร์ จึงต้องมี fallback
- `speechSynthesis.getVoices()` อาจได้รายการช้ากว่าตอนโหลดหน้า ต้องรอ `voiceschanged`
- browser voice คือเสียงในเครื่องผู้ใช้ ไม่เหมือนกันทุกอุปกรณ์
- ควรเก็บค่าที่ผู้ใช้เลือกไว้ใน `localStorage`
- ถ้าต้องการเสียงคุณภาพคงที่ทุกเครื่อง ควรเพิ่ม server-side TTS ภายหลัง

