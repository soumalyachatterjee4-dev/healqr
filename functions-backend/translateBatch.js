const { onCall, HttpsError } = require('firebase-functions/v2/https');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

const SUPPORTED_LANGUAGES = [
  'english','hindi','bengali','marathi','tamil','telugu','gujarati','kannada',
  'malayalam','punjabi','assamese','odia','urdu','sindhi','nepali','konkani',
  'maithili','dogri','bodo','santali','kashmiri','manipuri','arabic','french',
  'spanish','portuguese','russian','chinese','japanese','korean','german'
];

const LANGUAGE_INFO = {
  hindi: { nativeName: 'हिंदी', script: 'Devanagari' },
  bengali: { nativeName: 'বাংলা', script: 'Bengali' },
  marathi: { nativeName: 'मराठी', script: 'Devanagari' },
  tamil: { nativeName: 'தமிழ்', script: 'Tamil' },
  telugu: { nativeName: 'తెలుగు', script: 'Telugu' },
  gujarati: { nativeName: 'ગુજરાતી', script: 'Gujarati' },
  kannada: { nativeName: 'ಕನ್ನಡ', script: 'Kannada' },
  malayalam: { nativeName: 'മലയാളം', script: 'Malayalam' },
  punjabi: { nativeName: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  assamese: { nativeName: 'অসমীয়া', script: 'Bengali' },
  odia: { nativeName: 'ଓଡ଼ିଆ', script: 'Odia' },
  urdu: { nativeName: 'اردو', script: 'Arabic' },
  sindhi: { nativeName: 'سنڌي', script: 'Arabic' },
  nepali: { nativeName: 'नेपाली', script: 'Devanagari' },
  konkani: { nativeName: 'कोंकणी', script: 'Devanagari' },
  maithili: { nativeName: 'मैथिली', script: 'Devanagari' },
  dogri: { nativeName: 'डोगरी', script: 'Devanagari' },
  bodo: { nativeName: 'बड़ो', script: 'Devanagari' },
  santali: { nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', script: 'Ol Chiki' },
  kashmiri: { nativeName: 'كٲشُر', script: 'Arabic' },
  manipuri: { nativeName: 'মৈতৈলোন্', script: 'Bengali' },
  arabic: { nativeName: 'العربية', script: 'Arabic' },
  french: { nativeName: 'Français', script: 'Latin' },
  spanish: { nativeName: 'Español', script: 'Latin' },
  portuguese: { nativeName: 'Português', script: 'Latin' },
  russian: { nativeName: 'Русский', script: 'Cyrillic' },
  chinese: { nativeName: '中文', script: 'CJK' },
  japanese: { nativeName: '日本語', script: 'CJK' },
  korean: { nativeName: '한국어', script: 'Hangul' },
  german: { nativeName: 'Deutsch', script: 'Latin' },
};

/**
 * Batch translate texts via Gemini AI (server-side proxy)
 * Keeps API key secure on the server, never exposed to client
 *
 * Input:
 * - texts: string[] (required, max 50)
 * - targetLanguage: string (required)
 * - context: 'ui' | 'medical' | 'chat' | 'notification' (optional, default 'ui')
 *
 * Returns: { translations: string[] }
 */
exports.translateBatch = onCall({ maxInstances: 10, minInstances: 1 }, async (request) => {
  const { texts, targetLanguage, context = 'ui' } = request.data;

  // Validate inputs
  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    throw new HttpsError('invalid-argument', 'texts must be a non-empty array');
  }
  if (texts.length > 100) {
    throw new HttpsError('invalid-argument', 'Maximum 100 texts per batch');
  }
  if (!targetLanguage || !SUPPORTED_LANGUAGES.includes(targetLanguage)) {
    throw new HttpsError('invalid-argument', 'Invalid target language');
  }
  if (targetLanguage === 'english') {
    return { translations: texts };
  }

  const langInfo = LANGUAGE_INFO[targetLanguage];
  if (!langInfo) {
    throw new HttpsError('invalid-argument', 'Language info not found');
  }

  // Build prompt
  const numberedTexts = texts.map((t, i) => `${i + 1}. "${t}"`).join('\n');

  const contextInstructions = {
    ui: 'These are UI labels and button texts for a healthcare booking platform.',
    medical: 'These are medical terms and healthcare-related texts.',
    chat: 'These are chat messages between patient and doctor.',
    notification: 'These are push notification messages for appointment updates.',
    transliterate: 'TRANSLITERATE ONLY — do NOT translate meaning. Convert each English word into the target script phonetically so pronunciation stays identical. Example for Bengali: "Signoflam" → "সিগনোফ্লাম", "Cardiologist" → "কার্ডিওলজিস্ট", "After Food" → "আফটার ফুড".',
  }[context] || '';

  const transliterateRules = context === 'transliterate' ? `
- TRANSLITERATE only — write the same English word phonetically in ${langInfo.script} script
- Do NOT translate meaning — preserve the original English pronunciation
- Keep numbers in Arabic numerals (0-9)
- Keep symbols like mg, ml, %, / as-is` : `
- Keep medical terms, drug names, doctor names, and proper nouns in English
- Keep numbers in standard Arabic numerals (0-9)
- Maintain the same tone and formality level`;

  const prompt = `${context === 'transliterate' ? 'Transliterate' : 'Translate'} the following English texts to ${langInfo.nativeName} (${targetLanguage}). ${contextInstructions}

RULES:
- Return ONLY a JSON array of ${context === 'transliterate' ? 'transliterated' : 'translated'} strings in the same order
- Use ${langInfo.script} script${transliterateRules}

Texts to translate:
${numberedTexts}

Return format: ["translated1", "translated2", ...]`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8000,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', response.status, errorData);
      throw new HttpsError('internal', `Translation API error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '[]';

    // Parse JSON array from Gemini response
    const cleanJson = rawText.replace(/```json|```/g, '').trim();
    const translations = JSON.parse(cleanJson);

    if (!Array.isArray(translations) || translations.length !== texts.length) {
      console.error('Translation count mismatch:', translations.length, 'vs', texts.length);
      throw new HttpsError('internal', 'Translation response malformed');
    }

    return { translations };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('Translation failed:', error);
    throw new HttpsError('internal', 'Translation service unavailable');
  }
});
