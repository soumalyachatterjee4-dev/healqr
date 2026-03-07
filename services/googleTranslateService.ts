/**
 * Google Cloud Translation API v2 Service
 *
 * Used as reliable fallback for Gemini AI translation.
 * Handles: notification text, PDF content translation, Gemini failure fallback.
 * 99.9% SLA, consistent results, 100-200ms response time.
 */

const TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';
const API_KEY = 'AIzaSyB1AVXeao1bqTah8cD1bGAiAQMbZ5nw0WI';

// Language name → Google Translate ISO code mapping
const LANGUAGE_CODES: Record<string, string> = {
  english: 'en', hindi: 'hi', bengali: 'bn', marathi: 'mr',
  tamil: 'ta', telugu: 'te', gujarati: 'gu', kannada: 'kn',
  malayalam: 'ml', punjabi: 'pa', assamese: 'as', odia: 'or',
  urdu: 'ur', sindhi: 'sd', nepali: 'ne', konkani: 'gom',
  maithili: 'mai', dogri: 'doi', bodo: 'brx', santali: 'sat',
  kashmiri: 'ks', manipuri: 'mni-Mtei',
  arabic: 'ar', french: 'fr', spanish: 'es', portuguese: 'pt',
  russian: 'ru', chinese: 'zh', japanese: 'ja', korean: 'ko',
  german: 'de',
};

// In-memory cache for translated strings
const translateCache = new Map<string, string>();

/**
 * Translate a single text string via Google Translate API
 */
export async function googleTranslate(
  text: string,
  targetLanguage: string
): Promise<string> {
  if (!text || targetLanguage === 'english') return text;

  const langCode = LANGUAGE_CODES[targetLanguage];
  if (!langCode) return text;

  const cacheKey = `gt::${langCode}::${text}`;
  const cached = translateCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${TRANSLATE_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: langCode,
        format: 'text',
      }),
    });

    if (!response.ok) {
      console.warn('Google Translate API error:', response.status);
      return text;
    }

    const data = await response.json();
    const translated = data?.data?.translations?.[0]?.translatedText || text;
    // Decode HTML entities that Google Translate sometimes returns
    const decoded = decodeHTMLEntities(translated);
    translateCache.set(cacheKey, decoded);
    return decoded;
  } catch (error) {
    console.warn('Google Translate failed:', error);
    return text;
  }
}

/**
 * Batch translate multiple texts in a single API call
 */
export async function googleTranslateBatch(
  texts: string[],
  targetLanguage: string
): Promise<string[]> {
  if (!texts.length || targetLanguage === 'english') return texts;

  const langCode = LANGUAGE_CODES[targetLanguage];
  if (!langCode) return texts;

  // Check cache first, find uncached
  const results: string[] = new Array(texts.length);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  texts.forEach((text, i) => {
    const cacheKey = `gt::${langCode}::${text}`;
    const cached = translateCache.get(cacheKey);
    if (cached) {
      results[i] = cached;
    } else {
      uncachedIndices.push(i);
      uncachedTexts.push(text);
    }
  });

  if (uncachedTexts.length === 0) return results;

  try {
    const response = await fetch(`${TRANSLATE_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: uncachedTexts,
        source: 'en',
        target: langCode,
        format: 'text',
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.status}`);
    }

    const data = await response.json();
    const translations = data?.data?.translations || [];

    uncachedIndices.forEach((idx, j) => {
      const translated = translations[j]?.translatedText || uncachedTexts[j];
      const decoded = decodeHTMLEntities(translated);
      results[idx] = decoded;
      translateCache.set(`gt::${langCode}::${uncachedTexts[j]}`, decoded);
    });

    return results;
  } catch (error) {
    console.warn('Google Translate batch failed:', error);
    uncachedIndices.forEach((idx, j) => { results[idx] = uncachedTexts[j]; });
    return results;
  }
}

/**
 * Translate notification text — uses Google Translate for reliability
 */
export async function translateNotification(
  title: string,
  body: string,
  targetLanguage: string
): Promise<{ title: string; body: string }> {
  if (targetLanguage === 'english') return { title, body };

  const [translatedTitle, translatedBody] = await googleTranslateBatch(
    [title, body],
    targetLanguage
  );

  return { title: translatedTitle, body: translatedBody };
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

export function getGoogleLangCode(language: string): string | undefined {
  return LANGUAGE_CODES[language];
}
