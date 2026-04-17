function localized(language, thText, enText) {
  return language === 'th' ? thText : enText;
}

function detectInputLanguage(inputText) {
  const thaiChars = (inputText.match(/[\u0E00-\u0E7F]/g) || []).length;
  const englishChars = (inputText.match(/[A-Za-z]/g) || []).length;
  if (thaiChars > englishChars) return 'th';
  if (englishChars > thaiChars) return 'en';
  return 'unknown';
}

export function routeLightResponse(inputText, language) {
  const normalized = inputText.trim().toLowerCase();
  const inputLanguage = detectInputLanguage(normalized);

  if (inputLanguage !== 'unknown' && inputLanguage !== language) {
    return {
      mood: 'warm',
      status: localized(language, 'กำลังปรับภาษาให้ตรงกับคุณ', 'Adapting language to your preference'),
      text: localized(
        language,
        'ฉันจะตอบเป็นภาษาไทยให้ชัดเจนขึ้น หากต้องการเปลี่ยนภาษา ปรับได้ใน Settings',
        'I will respond in English for clarity. You can change language anytime in Settings.',
      ),
    };
  }

  const isGreeting = /^(hello|hi|hey|สวัสดี|หวัดดี|ดีจ้า|โย่ว)/i.test(normalized);
  const isGratitude = /(thank|ขอบคุณ|thx|ขอบใจ)/i.test(normalized);
  const isQuestion = normalized.includes('?')
    || /^(what|how|why|when|where|who|can|could|should|do|does|is|are|อะไร|ทำไม|อย่างไร|เมื่อไร|ที่ไหน|ใคร)/i.test(normalized);

  if (isGreeting) {
    return {
      mood: 'greeting',
      status: localized(language, 'กำลังก่อรูปคำทักทาย', 'Manifesting a greeting'),
      text: localized(language, 'สวัสดี ยินดีที่ได้พบคุณ', 'Hello. It is good to meet you.'),
    };
  }

  if (isGratitude) {
    return {
      mood: 'warm',
      status: localized(language, 'ตอบรับด้วยความอบอุ่น', 'Responding with warmth'),
      text: localized(language, 'ด้วยความยินดี ฉันอยู่ตรงนี้เพื่อช่วยคุณ', 'You are welcome. I am here to help.'),
    };
  }

  if (isQuestion) {
    return {
      mood: 'answer',
      status: localized(language, 'กำลังตีความคำถาม', 'Interpreting your question'),
      text: localized(
        language,
        'ฉันรับคำถามแล้ว ลองเพิ่มบริบทอีกเล็กน้อยเพื่อคำตอบที่แม่นขึ้น',
        'I received your question. Add a bit more context for a sharper answer.',
      ),
    };
  }

  return {
    mood: 'ambiguity',
    status: localized(language, 'กำลังตีความอย่างนุ่มนวล', 'Interpreting softly'),
    text: localized(
      language,
      'ฉันรับสัญญาณของคุณแล้ว คุณสามารถขยายความได้อีกนิด',
      'I received your signal. You can expand it a little for clarity.',
    ),
  };
}
