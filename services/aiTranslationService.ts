/**
 * AI Translation Service — Powered by Gemini 2.0 Flash
 *
 * Replaces Google Translation API at ~50x lower cost.
 * Handles real-time translation for 31 languages (22 Indian + 9 international).
 * Uses intelligent caching (IndexedDB + in-memory) to minimize API calls.
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const API_KEY = 'AIzaSyAEXO21T32uegMq4U57OnSDuBdA6CC_OOc';

// ======================== LANGUAGE DEFINITIONS ========================

export const AI_SUPPORTED_LANGUAGES = {
  // Indian Languages (22)
  english: { code: 'en', nativeName: 'English', script: 'Latin' },
  hindi: { code: 'hi', nativeName: 'हिंदी', script: 'Devanagari' },
  bengali: { code: 'bn', nativeName: 'বাংলা', script: 'Bengali' },
  marathi: { code: 'mr', nativeName: 'मराठी', script: 'Devanagari' },
  tamil: { code: 'ta', nativeName: 'தமிழ்', script: 'Tamil' },
  telugu: { code: 'te', nativeName: 'తెలుగు', script: 'Telugu' },
  gujarati: { code: 'gu', nativeName: 'ગુજરાતી', script: 'Gujarati' },
  kannada: { code: 'kn', nativeName: 'ಕನ್ನಡ', script: 'Kannada' },
  malayalam: { code: 'ml', nativeName: 'മലയാളം', script: 'Malayalam' },
  punjabi: { code: 'pa', nativeName: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  assamese: { code: 'as', nativeName: 'অসমীয়া', script: 'Bengali' },
  odia: { code: 'or', nativeName: 'ଓଡ଼ିଆ', script: 'Odia' },
  urdu: { code: 'ur', nativeName: 'اردو', script: 'Arabic' },
  sindhi: { code: 'sd', nativeName: 'سنڌي', script: 'Arabic' },
  nepali: { code: 'ne', nativeName: 'नेपाली', script: 'Devanagari' },
  konkani: { code: 'kok', nativeName: 'कोंकणी', script: 'Devanagari' },
  maithili: { code: 'mai', nativeName: 'मैथिली', script: 'Devanagari' },
  dogri: { code: 'doi', nativeName: 'डोगरी', script: 'Devanagari' },
  bodo: { code: 'brx', nativeName: 'बड़ो', script: 'Devanagari' },
  santali: { code: 'sat', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', script: 'Ol Chiki' },
  kashmiri: { code: 'ks', nativeName: 'كٲشُر', script: 'Arabic' },
  manipuri: { code: 'mni', nativeName: 'মৈতৈলোন্', script: 'Bengali' },
  // International Languages (9)
  arabic: { code: 'ar', nativeName: 'العربية', script: 'Arabic' },
  french: { code: 'fr', nativeName: 'Français', script: 'Latin' },
  spanish: { code: 'es', nativeName: 'Español', script: 'Latin' },
  portuguese: { code: 'pt', nativeName: 'Português', script: 'Latin' },
  russian: { code: 'ru', nativeName: 'Русский', script: 'Cyrillic' },
  chinese: { code: 'zh', nativeName: '中文', script: 'CJK' },
  japanese: { code: 'ja', nativeName: '日本語', script: 'CJK' },
  korean: { code: 'ko', nativeName: '한국어', script: 'Hangul' },
  german: { code: 'de', nativeName: 'Deutsch', script: 'Latin' },
} as const;

export type AILanguage = keyof typeof AI_SUPPORTED_LANGUAGES;

// ======================== CACHING LAYER ========================

// In-memory cache (fast, session-scoped)
const memoryCache = new Map<string, string>();
const MAX_MEMORY_CACHE = 5000;

// IndexedDB cache (persistent across sessions)
const DB_NAME = 'healqr_translations';
const DB_VERSION = 1;
const STORE_NAME = 'translations';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onerror = () => reject(request.error);
  });
}

async function getCachedTranslation(key: string): Promise<string | null> {
  // Memory cache first (instant)
  if (memoryCache.has(key)) return memoryCache.get(key)!;

  // IndexedDB fallback (persistent)
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        const val = request.result || null;
        if (val) {
          // Promote to memory cache
          if (memoryCache.size < MAX_MEMORY_CACHE) {
            memoryCache.set(key, val);
          }
        }
        resolve(val);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function setCachedTranslation(key: string, value: string): Promise<void> {
  // Memory cache
  if (memoryCache.size >= MAX_MEMORY_CACHE) {
    // Evict oldest entries (first 1000)
    const entries = Array.from(memoryCache.keys()).slice(0, 1000);
    entries.forEach(k => memoryCache.delete(k));
  }
  memoryCache.set(key, value);

  // IndexedDB (persist)
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
  } catch {
    // Silent fail — memory cache still works
  }
}

function makeCacheKey(text: string, targetLang: AILanguage, context?: string): string {
  return `${targetLang}::${context || ''}::${text}`;
}

// ======================== GEMINI TRANSLATION ========================

interface TranslationResult {
  translated: string;
  fromCache: boolean;
}

/**
 * Translate a single text string using Gemini AI
 */
export async function aiTranslate(
  text: string,
  targetLanguage: AILanguage,
  context: 'ui' | 'medical' | 'chat' | 'notification' = 'ui'
): Promise<TranslationResult> {
  if (!text || !text.trim()) return { translated: text, fromCache: false };
  if (targetLanguage === 'english') return { translated: text, fromCache: false };

  // Check cache
  const cacheKey = makeCacheKey(text, targetLanguage, context);
  const cached = await getCachedTranslation(cacheKey);
  if (cached) return { translated: cached, fromCache: true };

  // Call Gemini
  const langInfo = AI_SUPPORTED_LANGUAGES[targetLanguage];
  const contextInstructions = getContextInstructions(context);

  const prompt = `Translate the following English text to ${langInfo.nativeName} (${targetLanguage}). ${contextInstructions}

RULES:
- Return ONLY the translated text, nothing else
- Use ${langInfo.script} script
- Keep medical terms, drug names, doctor names, and proper nouns in English
- Keep numbers in standard Arabic numerals (0-9)
- Maintain the same tone and formality level
- If the text contains HTML tags, preserve them exactly

Text: "${text}"`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
        }
      })
    });

    if (!response.ok) {
      console.warn(`AI Translation API error: ${response.status}`);
      return { translated: text, fromCache: false };
    }

    const data = await response.json();
    const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!translated) return { translated: text, fromCache: false };

    // Clean up: remove quotes Gemini sometimes adds
    const cleaned = translated.replace(/^["']|["']$/g, '');

    // Cache it
    await setCachedTranslation(cacheKey, cleaned);

    return { translated: cleaned, fromCache: false };
  } catch (error) {
    console.warn('AI Translation failed, returning original:', error);
    return { translated: text, fromCache: false };
  }
}

/**
 * Batch translate multiple texts in a single API call (cheaper + faster)
 */
export async function aiTranslateBatch(
  texts: string[],
  targetLanguage: AILanguage,
  context: 'ui' | 'medical' | 'chat' | 'notification' = 'ui'
): Promise<TranslationResult[]> {
  if (!texts || texts.length === 0) return [];
  if (targetLanguage === 'english') {
    return texts.map(t => ({ translated: t, fromCache: false }));
  }

  // Check which texts are already cached
  const results: (TranslationResult | null)[] = new Array(texts.length).fill(null);
  const uncachedTexts: { index: number; text: string }[] = [];

  for (let i = 0; i < texts.length; i++) {
    if (!texts[i] || !texts[i].trim()) {
      results[i] = { translated: texts[i], fromCache: false };
      continue;
    }
    const cacheKey = makeCacheKey(texts[i], targetLanguage, context);
    const cached = await getCachedTranslation(cacheKey);
    if (cached) {
      results[i] = { translated: cached, fromCache: true };
    } else {
      uncachedTexts.push({ index: i, text: texts[i] });
    }
  }

  // If everything was cached, return immediately
  if (uncachedTexts.length === 0) {
    return results as TranslationResult[];
  }

  // Batch translate uncached texts via Gemini
  const langInfo = AI_SUPPORTED_LANGUAGES[targetLanguage];
  const contextInstructions = getContextInstructions(context);

  // Build numbered list for Gemini
  const numberedTexts = uncachedTexts.map((item, idx) => `${idx + 1}. "${item.text}"`).join('\n');

  const prompt = `Translate the following English texts to ${langInfo.nativeName} (${targetLanguage}). ${contextInstructions}

RULES:
- Return ONLY a JSON array of translated strings in the same order
- Use ${langInfo.script} script
- Keep medical terms, drug names, doctor names, and proper nouns in English
- Keep numbers in standard Arabic numerals (0-9)
- Maintain the same tone and formality level

Texts to translate:
${numberedTexts}

Return format: ["translated1", "translated2", ...]`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000,
        }
      })
    });

    if (!response.ok) {
      // Fill remaining with originals
      uncachedTexts.forEach(item => {
        results[item.index] = { translated: item.text, fromCache: false };
      });
      return results as TranslationResult[];
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '[]';

    // Parse JSON array from Gemini
    const cleanJson = rawText.replace(/```json|```/g, '').trim();
    const translatedArray: string[] = JSON.parse(cleanJson);

    // Map results back and cache them
    for (let i = 0; i < uncachedTexts.length; i++) {
      const translated = translatedArray[i] || uncachedTexts[i].text;
      const cacheKey = makeCacheKey(uncachedTexts[i].text, targetLanguage, context);
      await setCachedTranslation(cacheKey, translated);
      results[uncachedTexts[i].index] = { translated, fromCache: false };
    }
  } catch (error) {
    console.warn('AI Batch Translation failed:', error);
    uncachedTexts.forEach(item => {
      results[item.index] = { translated: item.text, fromCache: false };
    });
  }

  return results as TranslationResult[];
}

/**
 * Detect the language of a text using Gemini
 */
export async function aiDetectLanguage(text: string): Promise<{
  language: AILanguage;
  confidence: number;
  script: string;
}> {
  if (!text || !text.trim()) {
    return { language: 'english', confidence: 0, script: 'Latin' };
  }

  // Quick heuristic checks for common scripts (avoid API call)
  if (/^[\x20-\x7E\s]+$/.test(text)) {
    return { language: 'english', confidence: 0.9, script: 'Latin' };
  }
  if (/[\u0900-\u097F]/.test(text)) {
    return { language: 'hindi', confidence: 0.7, script: 'Devanagari' };
  }
  if (/[\u0980-\u09FF]/.test(text)) {
    return { language: 'bengali', confidence: 0.7, script: 'Bengali' };
  }
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return { language: 'tamil', confidence: 0.8, script: 'Tamil' };
  }
  if (/[\u0C00-\u0C7F]/.test(text)) {
    return { language: 'telugu', confidence: 0.8, script: 'Telugu' };
  }
  if (/[\u0A80-\u0AFF]/.test(text)) {
    return { language: 'gujarati', confidence: 0.8, script: 'Gujarati' };
  }
  if (/[\u0C80-\u0CFF]/.test(text)) {
    return { language: 'kannada', confidence: 0.8, script: 'Kannada' };
  }
  if (/[\u0D00-\u0D7F]/.test(text)) {
    return { language: 'malayalam', confidence: 0.8, script: 'Malayalam' };
  }
  if (/[\u0A00-\u0A7F]/.test(text)) {
    return { language: 'punjabi', confidence: 0.8, script: 'Gurmukhi' };
  }
  if (/[\u0600-\u06FF]/.test(text)) {
    return { language: 'urdu', confidence: 0.6, script: 'Arabic' };
  }

  // Fallback: use Gemini for uncertain scripts
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Detect the language of this text and return ONLY a JSON object: {"language": "english|hindi|bengali|...", "confidence": 0.0-1.0, "script": "Latin|Devanagari|..."}

Text: "${text.substring(0, 200)}"` }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 100 }
      })
    });

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);
    return {
      language: result.language as AILanguage || 'english',
      confidence: result.confidence || 0.5,
      script: result.script || 'Latin'
    };
  } catch {
    return { language: 'english', confidence: 0.3, script: 'Latin' };
  }
}

// ======================== MEDICAL CONTEXT TRANSLATION ========================

/**
 * Translate medical/healthcare content with special handling for terminology
 */
export async function aiTranslateMedical(
  text: string,
  targetLanguage: AILanguage
): Promise<string> {
  const result = await aiTranslate(text, targetLanguage, 'medical');
  return result.translated;
}

/**
 * Translate chat messages bidirectionally
 * (doctor → patient language, patient → doctor language)
 */
export async function aiTranslateChat(
  message: string,
  targetLanguage: AILanguage
): Promise<string> {
  const result = await aiTranslate(message, targetLanguage, 'chat');
  return result.translated;
}

// ======================== HELPERS ========================

function getContextInstructions(context: string): string {
  switch (context) {
    case 'medical':
      return 'This is medical/healthcare content. Keep all drug names, disease names, medical procedures, and medical abbreviations (BP, ECG, OPD, etc.) in English. Translate descriptive medical text naturally.';
    case 'chat':
      return 'This is a doctor-patient chat message. Translate conversationally and naturally. Keep medicine names and dosages in English.';
    case 'notification':
      return 'This is a notification/alert message. Keep it concise and clear. Keep doctor names, medicine names, and appointment times in English.';
    case 'ui':
    default:
      return 'This is a UI label/button text for a healthcare app. Keep it short, clear, and natural.';
  }
}

/**
 * Get cache statistics
 */
export function getAICacheStats(): { memorySize: number; dbName: string } {
  return {
    memorySize: memoryCache.size,
    dbName: DB_NAME,
  };
}

/**
 * Clear all translation caches
 */
export async function clearAITranslationCache(): Promise<void> {
  memoryCache.clear();
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch {
    // Silent
  }
}
