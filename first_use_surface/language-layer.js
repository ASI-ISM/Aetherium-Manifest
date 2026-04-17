const THAI_CHAR_REGEX = /[\u0E00-\u0E7F]/;
const ENGLISH_CHAR_REGEX = /[A-Za-z]/;
const THAI_HINT_REGEX = /(สวัสดี|หวัดดี|ขอบคุณ|ครับ|ค่ะ|ช่วย|อะไร|ทำไม|อย่างไร|ได้ไหม)/;
const ENGLISH_HINT_REGEX = /\b(hello|hi|hey|thanks|thank you|please|what|how|why|where|can you|could you)\b/;

function detectFromBrowser() {
  const locales = navigator.languages && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language || 'en'];

  return locales.some((locale) => locale.toLowerCase().startsWith('th')) ? 'th' : 'en';
}

function detectFromCharacters(text) {
  if (!text) return { language: 'unknown', confidence: 0 };

  const thaiChars = (text.match(/[\u0E00-\u0E7F]/g) || []).length;
  const englishChars = (text.match(/[A-Za-z]/g) || []).length;
  const totalLetters = thaiChars + englishChars;

  if (totalLetters === 0) return { language: 'unknown', confidence: 0 };
  if (thaiChars > englishChars) return { language: 'th', confidence: thaiChars / totalLetters };
  if (englishChars > thaiChars) return { language: 'en', confidence: englishChars / totalLetters };

  if (THAI_CHAR_REGEX.test(text)) return { language: 'th', confidence: 0.5 };
  if (ENGLISH_CHAR_REGEX.test(text)) return { language: 'en', confidence: 0.5 };

  return { language: 'unknown', confidence: 0 };
}

function optionalLocalDetector(text, enabled, profile) {
  if (!enabled || profile === 'none' || !text) return { language: 'unknown', confidence: 0 };
  const normalized = text.trim().toLowerCase();

  if (THAI_HINT_REGEX.test(normalized)) {
    return { language: 'th', confidence: 0.82 };
  }

  if (ENGLISH_HINT_REGEX.test(normalized)) {
    return { language: 'en', confidence: 0.82 };
  }

  return { language: 'unknown', confidence: 0 };
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
    const characterSignal = detectFromCharacters(inputText);
    const localSignal = optionalLocalDetector(inputText, settings.useLocalDetector, settings.localModelProfile);

    const strongestInputSignal = localSignal.confidence >= characterSignal.confidence ? localSignal : characterSignal;
    const resolvedLanguage = strongestInputSignal.language !== 'unknown'
      ? strongestInputSignal.language
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
