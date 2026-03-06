import { aiTranslate, aiTranslateBatch, aiDetectLanguage, AI_SUPPORTED_LANGUAGES, type AILanguage } from './aiTranslationService';

// Language codes mapping — now powered by Gemini AI PM (31 languages)
export const SUPPORTED_LANGUAGES = {
  english: 'en',
  hindi: 'hi',
  bengali: 'bn',
  marathi: 'mr',
  tamil: 'ta',
  telugu: 'te',
  gujarati: 'gu',
  kannada: 'kn',
  malayalam: 'ml',
  punjabi: 'pa',
  assamese: 'as',
  odia: 'or',
  urdu: 'ur',
  sindhi: 'sd',
  nepali: 'ne',
  konkani: 'kok',
  maithili: 'mai',
  dogri: 'doi',
  bodo: 'brx',
  santali: 'sat',
  kashmiri: 'ks',
  manipuri: 'mni',
  arabic: 'ar',
  french: 'fr',
  spanish: 'es',
  portuguese: 'pt',
  russian: 'ru',
  chinese: 'zh',
  japanese: 'ja',
  korean: 'ko',
  german: 'de',
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// Translation cache to avoid duplicate API calls
const translationCache = new Map<string, string>();

// Local dictionary for offline/free translation
const LOCAL_TRANSLATIONS: Record<string, Partial<Record<SupportedLanguage, string>>> = {
  "Hello! How are you feeling today?": {
    hindi: "नमस्ते! आज आप कैसा महसूस कर रहे हैं?",
    bengali: "হ্যালো! আজ আপনি কেমন বোধ করছেন?",
    tamil: "வணக்கம்! இன்று நீங்கள் எப்படி உணர்கிறீர்கள்?",
    telugu: "హలో! ఈ రోజు మీరు ఎలా ఉన్నారు?",
    marathi: "नमस्कार! आज तुम्हाला कसे वाटते आहे?",
    gujarati: "નમસ્તે! આજે તમે કેવું અનુભવો છો?",
    kannada: "ಹಲೋ! ಇಂದು ನೀವು ಹೇಗಿದ್ದೀರಿ?",
    malayalam: "ഹലോ! ഇന്ന് നിങ്ങൾക്ക് എങ്ങനെയുണ്ട്?",
    punjabi: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਅੱਜ ਤੁਸੀਂ ਕਿਵੇਂ ਮਹਿਸੂਸ ਕਰ ਰਹੇ ਹੋ?",
    urdu: "ہیلو! آج آپ کیسا محسوس کر رہے ہیں؟"
  },
  "Much better doctor, thank you": {
    hindi: "काफी बेहतर डॉक्टर, धन्यवाद",
    bengali: "অনেক ভালো ডাক্তার, ধন্যবাদ",
    tamil: "மிகவும் சிறந்தது டாக்டர், நன்றி",
    telugu: "చాలా బాగుంది డాక్టర్, ధన్యవాదాలు",
    marathi: "खूप बरे वाटत आहे डॉक्टर, धन्यवाद",
    gujarati: "ઘણું સારું ડૉક્ટર, આભાર",
    kannada: "ತುಂಬಾ ಉತ್ತಮ ವೈದ್ಯರೇ, ಧನ್ಯವಾದಗಳು",
    malayalam: "വളരെ മെച്ചം ഡോക്ടർ, നന്ദി",
    punjabi: "ਬਹੁਤ ਵਧੀਆ ਡਾਕਟਰ, ਧੰਨਵਾਦ",
    urdu: "بہت بہتر ڈاکٹر، شکریہ"
  },
  "Thank you for the update. Continue your medication as prescribed.": {
    hindi: "अपडेट के लिए धन्यवाद। निर्धारित अनुसार अपनी दवा जारी रखें।",
    bengali: "আপডেটের জন্য ধন্যবাদ। নির্দেশিত হিসাবে আপনার ওষুধ চালিয়ে যান।",
    tamil: "புதுப்பிப்புக்கு நன்றி. பரிந்துரைக்கப்பட்டபடி உங்கள் மருந்தைத் தொடரவும்.",
    telugu: "నవీకరణకు ధన్యవాదాలు. సూచించిన విధంగా మీ మందులను కొనసాగించండి.",
    marathi: "अपडेटसाठी धन्यवाद. सांगितल्याप्रमाणे औषध चालू ठेवा.",
    gujarati: "અપડેટ માટે આભાર. સૂચવ્યા મુજબ તમારી દવા ચાલુ રાખો.",
    kannada: "ನವೀಕರಣಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ಸೂಚಿಸಿದಂತೆ ನಿಮ್ಮ ಔಷಧಿಯನ್ನು ಮುಂದುವರಿಸಿ.",
    malayalam: "അപ്‌ഡേറ്റിന് നന്ദി. നിർദ്ദേശിച്ച പ്രകാരം മരുന്ന് തുടരുക.",
    punjabi: "ਅਪਡੇਟ ਲਈ ਧੰਨਵਾਦ। ਨਿਰਧਾਰਤ ਅਨੁਸਾਰ ਆਪਣੀ ਦਵਾਈ ਜਾਰੀ ਰੱਖੋ।",
    urdu: "اپ ڈیٹ کے لیے شکریہ۔ اپنی دوا تجویز کردہ طریقے سے جاری رکھیں۔"
  }
};

function findLocalTranslation(text: string, targetLanguage: SupportedLanguage): string | null {
  if (LOCAL_TRANSLATIONS[text] && LOCAL_TRANSLATIONS[text][targetLanguage]) {
    return LOCAL_TRANSLATIONS[text][targetLanguage]!;
  }
  const lowerText = text.toLowerCase();
  const key = Object.keys(LOCAL_TRANSLATIONS).find(k => k.toLowerCase() === lowerText);
  if (key && LOCAL_TRANSLATIONS[key][targetLanguage]) {
    return LOCAL_TRANSLATIONS[key][targetLanguage]!;
  }
  return null;
}

/**
 * Translate text using Gemini AI PM (with local dictionary fallback)
 */
export async function translate(
  text: string,
  targetLanguage: SupportedLanguage,
  sourceLanguage?: SupportedLanguage
): Promise<string> {
  if (!text) return text;
  if (targetLanguage === 'english') return text;

  // Check legacy cache first
  const cacheKey = `${text}_${sourceLanguage || 'auto'}_${targetLanguage}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // Try local dictionary first (free, instant)
  const localTranslation = findLocalTranslation(text, targetLanguage);
  if (localTranslation) {
    translationCache.set(cacheKey, localTranslation);
    return localTranslation;
  }

  // Use Gemini AI Translation
  if (targetLanguage in AI_SUPPORTED_LANGUAGES) {
    const result = await aiTranslate(text, targetLanguage as AILanguage, 'chat');
    if (result.translated !== text) {
      translationCache.set(cacheKey, result.translated);
      return result.translated;
    }
  }

  return text;
}

/**
 * Translate multiple texts at once (uses Gemini batch for efficiency)
 */
export async function translateBatch(
  texts: string[],
  targetLanguage: SupportedLanguage,
  sourceLanguage?: SupportedLanguage
): Promise<string[]> {
  if (!texts || texts.length === 0) return texts;
  if (targetLanguage === 'english') return texts;

  // Use AI batch translation for efficiency
  if (targetLanguage in AI_SUPPORTED_LANGUAGES) {
    const results = await aiTranslateBatch(texts, targetLanguage as AILanguage, 'chat');
    return results.map(r => r.translated);
  }

  // Fallback to sequential local translation
  return Promise.all(texts.map(text => translate(text, targetLanguage, sourceLanguage)));
}

/**
 * Detect the language of text using Gemini AI
 */
export async function detectLanguage(text: string): Promise<{
  language: string;
  confidence: number;
  isReliable: boolean;
} | null> {
  if (!text) return null;

  const result = await aiDetectLanguage(text);
  return {
    language: SUPPORTED_LANGUAGES[result.language as SupportedLanguage] || 'en',
    confidence: result.confidence,
    isReliable: result.confidence > 0.7
  };
}

/**
 * Clear translation cache
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}

/**
 * Get cache size
 */
export function getTranslationCacheSize(): number {
  return translationCache.size;
}
