const THAI_CHAR_REGEX = /[\u0E00-\u0E7F]/;
const ENGLISH_CHAR_REGEX = /[A-Za-z]/;

const THAI_HINTS = ['สวัสดี', 'หวัดดี', 'ขอบคุณ', 'ครับ', 'ค่ะ', 'ช่วย', 'อะไร', 'ทำไม', 'อย่างไร', 'ได้ไหม'];
const EN_HINTS = ['hello', 'hi', 'hey', 'thanks', 'thank you', 'please', 'what', 'how', 'why', 'where', 'can you'];

function detectFromBrowser() {
  const locales = navigator.languages && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language || 'en-US'];

  const primary = locales[0]?.toLowerCase() || 'en-us';
  return primary.startsWith('th') ? 'th' : 'en';
}

function detectFromCharacters(text) {
  if (!text) return { language: 'unknown', confidence: 0 };

  const thaiChars = (text.match(/[\u0E00-\u0E7F]/g) || []).length;
  const englishChars = (text.match(/[A-Za-z]/g) || []).length;
  const signal = thaiChars + englishChars;

  if (thaiChars === 0 && englishChars === 0) {
    return { language: 'unknown', confidence: 0 };
  }

  if (thaiChars > englishChars) {
    return { language: 'th', confidence: thaiChars / (thaiChars + englishChars) };
  }

  if (englishChars > thaiChars) {
    return { language: 'en', confidence: englishChars / (thaiChars + englishChars) };
  }

  if (THAI_CHAR_REGEX.test(text)) return { language: 'th', confidence: 0.55 };
  if (ENGLISH_CHAR_REGEX.test(text)) return { language: 'en', confidence: 0.55 };
  return { language: 'unknown', confidence: 0 };
}

function optionalLocalDetector(text, enabled, profile) {
  if (!enabled || profile === 'none' || !text) return { language: 'unknown', confidence: 0 };

  const normalized = text.trim().toLowerCase();
  const thaiMatch = THAI_HINTS.some((token) => normalized.includes(token));
  if (thaiMatch) return { language: 'th', confidence: 0.9 };

  const englishMatch = EN_HINTS.some((token) => normalized.includes(token));
  if (englishMatch) return { language: 'en', confidence: 0.9 };

  return { language: 'unknown', confidence: 0 };
}

export function createLanguageLayer(settings) {
  const state = {
    sessionLanguageMemory: settings.sessionLanguageMemory || detectFromBrowser(),
  };

  function resolveLanguage(inputText) {
    // a) explicit user language preference from settings
    if (settings.languagePreference !== 'auto') {
      state.sessionLanguageMemory = settings.languagePreference;
      settings.sessionLanguageMemory = settings.languagePreference;
      return settings.languagePreference;
    }

    // b) browser locale fallback (base signal)
    const browserLanguage = detectFromBrowser();

    // c) inspect current input text through two lightweight layers
    const charResult = detectFromCharacters(inputText);
    const localResult = optionalLocalDetector(inputText, settings.useLocalDetector, settings.localModelProfile);

    // d) deterministic choice: optional detector > char heuristics > session memory > browser locale
    const resolvedLanguage = localResult.language !== 'unknown'
      ? localResult.language
      : charResult.language !== 'unknown' && charResult.confidence >= 0.55
        ? charResult.language
        : state.sessionLanguageMemory || browserLanguage;

    // e) store lightweight session language memory
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
