const THAI_REGEX = /[\u0E00-\u0E7F]/;
const ENGLISH_REGEX = /[A-Za-z]/;

function detectFromBrowser() {
  const locales = navigator.languages && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language || 'en'];
  return locales.some((locale) => locale.toLowerCase().startsWith('th')) ? 'th' : 'en';
}

function detectFromCharacters(text) {
  if (!text) return 'unknown';

  const thaiChars = (text.match(/[\u0E00-\u0E7F]/g) || []).length;
  const englishChars = (text.match(/[A-Za-z]/g) || []).length;

  if (thaiChars > englishChars) return 'th';
  if (englishChars > thaiChars) return 'en';

  if (THAI_REGEX.test(text)) return 'th';
  if (ENGLISH_REGEX.test(text)) return 'en';
  return 'unknown';
}

function optionalLocalDetector(text, enabled, profile) {
  if (!enabled || profile === 'none' || !text) return 'unknown';
  const normalized = text.trim().toLowerCase();

  if (/\b(สวัสดี|หวัดดี|ขอบคุณ|ครับ|ค่ะ|ช่วย|อะไร|ทำไม|อย่างไร)\b/.test(normalized)) {
    return 'th';
  }

  if (/\b(hello|hi|hey|thanks|thank you|please|what|how|why|where|can you)\b/.test(normalized)) {
    return 'en';
  }

  return 'unknown';
}

export function createLanguageLayer(settings) {
  const state = {
    sessionLanguageMemory: settings.sessionLanguageMemory || 'en',
  };

  function resolveLanguage(inputText) {
    if (settings.languagePreference !== 'auto') {
      state.sessionLanguageMemory = settings.languagePreference;
      settings.sessionLanguageMemory = settings.languagePreference;
      return settings.languagePreference;
    }

    const browserLanguage = detectFromBrowser();
    const inputLanguage = detectFromCharacters(inputText);
    const optionalLanguage = optionalLocalDetector(inputText, settings.useLocalDetector, settings.localModelProfile);

    const resolvedLanguage = inputLanguage !== 'unknown'
      ? inputLanguage
      : optionalLanguage !== 'unknown'
        ? optionalLanguage
        : state.sessionLanguageMemory || browserLanguage;

    state.sessionLanguageMemory = resolvedLanguage;
    settings.sessionLanguageMemory = resolvedLanguage;

    return resolvedLanguage;
  }

  return {
    detectFromBrowser,
    detectFromCharacters,
    resolveLanguage,
  };
}
