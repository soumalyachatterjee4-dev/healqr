// Real-time Multilingual Translation Service
// Supports: 22 Indian + 9 International languages (31 total)
// All UI text translated via bt() bilingual hook (useAITranslation) using Gemini 2.0 Flash + Google Cloud Translation API v2

export type Language = 'english' | 'hindi' | 'bengali' | 'marathi' | 'tamil' | 'telugu' | 'gujarati' | 'kannada' | 'malayalam' | 'punjabi' | 'assamese' | 'odia' | 'urdu' | 'sindhi' | 'nepali' | 'konkani' | 'maithili' | 'dogri' | 'bodo' | 'santali' | 'kashmiri' | 'manipuri' | 'arabic' | 'french' | 'spanish' | 'portuguese' | 'russian' | 'chinese' | 'japanese' | 'korean' | 'german';
export type LanguageCode = 'en' | 'hi' | 'bn' | 'mr' | 'ta' | 'te' | 'gu' | 'kn' | 'ml' | 'pa' | 'as' | 'or' | 'ur' | 'sd' | 'ne' | 'kok' | 'mai' | 'doi' | 'brx' | 'sat' | 'ks' | 'mni' | 'ar' | 'fr' | 'es' | 'pt' | 'ru' | 'zh' | 'ja' | 'ko' | 'de';

// Helper to convert language codes to full names
export function getLanguageFromCode(code: LanguageCode): Language {
  const map: Record<LanguageCode, Language> = {
    'en': 'english',
    'hi': 'hindi',
    'bn': 'bengali',
    'mr': 'marathi',
    'ta': 'tamil',
    'te': 'telugu',
    'gu': 'gujarati',
    'kn': 'kannada',
    'ml': 'malayalam',
    'pa': 'punjabi',
    'as': 'assamese',
    'or': 'odia',
    'ur': 'urdu',
    'sd': 'sindhi',
    'ne': 'nepali',
    'kok': 'konkani',
    'mai': 'maithili',
    'doi': 'dogri',
    'brx': 'bodo',
    'sat': 'santali',
    'ks': 'kashmiri',
    'mni': 'manipuri',
    'ar': 'arabic',
    'fr': 'french',
    'es': 'spanish',
    'pt': 'portuguese',
    'ru': 'russian',
    'zh': 'chinese',
    'ja': 'japanese',
    'ko': 'korean',
    'de': 'german',
  };
  return map[code];
}

// In-memory cache for async AI transliterations (name/data value lookups)
const translationCache = new Map<string, string>();

// Language display names in their native scripts
export const languageDisplayNames: Record<Language, string> = {
  english: 'English',
  hindi: 'हिंदी',
  bengali: 'বাংলা',
  marathi: 'मराठी',
  tamil: 'தமிழ்',
  telugu: 'తెలుగు',
  gujarati: 'ગુજરাતી',
  kannada: 'ಕನ್ನಡ',
  malayalam: 'മലയാളം',
  punjabi: 'ਪੰਜਾਬੀ',
  assamese: 'অসমীয়া',
  odia: 'ଓଡ଼ିଆ',
  urdu: 'اردو',
  sindhi: 'سنڌي',
  nepali: 'नेपाली',
  konkani: 'कोंकणी',
  maithili: 'मैथिली',
  dogri: 'डोगरी',
  bodo: 'बड़ो',
  santali: 'ᱥᱟᱱᱛᱟᱲᱤ',
  kashmiri: 'كٲشُر',
  manipuri: 'মৈতৈলোন্',
  arabic: 'العربية',
  french: 'Français',
  spanish: 'Español',
  portuguese: 'Português',
  russian: 'Русский',
  chinese: '中文',
  japanese: '日本語',
  korean: '한국어',
  german: 'Deutsch',
};

// Language codes for flags/icons
export const languageCodes: Record<Language, string> = {
  english: 'GB',
  hindi: 'IN',
  bengali: 'BD',
  marathi: 'IN',
  tamil: 'IN',
  telugu: 'IN',
  gujarati: 'IN',
  kannada: 'IN',
  malayalam: 'IN',
  punjabi: 'IN',
  assamese: 'IN',
  odia: 'IN',
  urdu: 'PK',
  sindhi: 'PK',
  nepali: 'NP',
  konkani: 'IN',
  maithili: 'IN',
  dogri: 'IN',
  bodo: 'IN',
  santali: 'IN',
  kashmiri: 'IN',
  manipuri: 'IN',
  arabic: 'SA',
  french: 'FR',
  spanish: 'ES',
  portuguese: 'BR',
  russian: 'RU',
  chinese: 'CN',
  japanese: 'JP',
  korean: 'KR',
  german: 'DE',
};

// Data value translations - for translating patient data from their language to doctor's language
export const dataValueTranslations: Record<string, Partial<Record<Language, string>>> = {
  // Gender values
  'MALE': {
    english: 'MALE',
    hindi: 'पुरुष',
    bengali: 'পুরুষ',
    marathi: 'पुरुष',
    tamil: 'ஆண்',
    telugu: 'పురుషుడు',
    gujarati: 'પુરુષ',
    kannada: 'ಪುರುಷ',
    malayalam: 'പുരുഷൻ',
    punjabi: 'ਪੁਰਸ਼',
  },
  'पुरुष': {
    english: 'MALE',
    hindi: 'पुरुष',
    bengali: 'পুরুষ',
    marathi: 'पुरुष',
    tamil: 'ஆண்',
    telugu: 'పురుషుడు',
    gujarati: 'પુરુષ',
    kannada: 'ಪುರುಷ',
    malayalam: 'പുരുഷൻ',
    punjabi: 'ਪੁਰਸ਼',
  },
  'পুরুষ': {
    english: 'MALE',
    hindi: 'पुरुष',
    bengali: 'পুরুষ',
    marathi: 'पुरुष',
    tamil: 'ஆண்',
    telugu: 'పురుషుడు',
    gujarati: 'પુરુષ',
    kannada: 'ಪುರುಷ',
    malayalam: 'പുരുഷൻ',
    punjabi: 'ਪੁਰਸ਼',
  },
  'FEMALE': {
    english: 'FEMALE',
    hindi: 'महिला',
    bengali: 'মহিলা',
    marathi: 'स्त्री',
    tamil: 'பெண்',
    telugu: 'స్త్రీ',
    gujarati: 'સ્ત્રી',
    kannada: 'ಸ್ತ್ರೀ',
    malayalam: 'സ്ത്രീ',
    punjabi: 'ਔਰਤ',
  },
  'महिला': {
    english: 'FEMALE',
    hindi: 'महिला',
    bengali: 'মহিলা',
    marathi: 'स्त्री',
    tamil: 'பெண்',
    telugu: 'స్త్రీ',
    gujarati: 'સ્ત્રી',
    kannada: 'ಸ್ತ್ರೀ',
    malayalam: 'സ്ത്രീ',
    punjabi: 'ਔਰਤ',
  },
  'মহিলা': {
    english: 'FEMALE',
    hindi: 'महिला',
    bengali: 'মহিলা',
    marathi: 'स्त्री',
    tamil: 'பெண்',
    telugu: 'స్త్రీ',
    gujarati: 'સ્ત્રી',
    kannada: 'ಸ್ತ್ರೀ',
    malayalam: 'സ്ത്രീ',
    punjabi: 'ਔਰਤ',
  },
  'OTHER': {
    english: 'OTHER',
    hindi: 'अन्य',
    bengali: 'অন্যান্য',
    marathi: 'इतर',
    tamil: 'மற்றவை',
    telugu: 'ఇతర',
    gujarati: 'અન્ય',
    kannada: 'ಇತರೆ',
    malayalam: 'മറ്റുള്ളവ',
    punjabi: 'ਹੋਰ',
  },
  'male': {
    english: 'Male',
    hindi: 'पुरुष',
    bengali: 'পুরুষ',
    marathi: 'पुरुष',
    tamil: 'ஆண்',
    telugu: 'పురుషుడు',
    gujarati: 'પુરુષ',
    kannada: 'ಪುರುಷ',
    malayalam: 'പുരുഷൻ',
    punjabi: 'ਪੁਰਸ਼',
  },
  'female': {
    english: 'Female',
    hindi: 'महिला',
    bengali: 'মহিলা',
    marathi: 'स्त्री',
    tamil: 'பெண்',
    telugu: 'స్త్రీ',
    gujarati: 'સ્ત્રી',
    kannada: 'ಸ್ತ್ರೀ',
    malayalam: 'സ്ത്രീ',
    punjabi: 'ਔਰਤ',
  },
  'other': {
    english: 'Other',
    hindi: 'अन्य',
    bengali: 'অন্যান্য',
    marathi: 'इतर',
    tamil: 'மற்றவை',
    telugu: 'ఇతర',
    gujarati: 'અન્ય',
    kannada: 'ಇತರೆ',
    malayalam: 'മറ്റുള്ളവ',
    punjabi: 'ਹੋਰ',
  },
  'अन्य': {
    english: 'OTHER',
    hindi: 'अन्य',
    bengali: 'অন্যান্য',
    marathi: 'इतर',
    tamil: 'மற்றவை',
    telugu: 'ఇతర',
    gujarati: 'અન્ય',
    kannada: 'ಇತರೆ',
    malayalam: 'മറ്റുള്ളവ',
    punjabi: 'ਹੋਰ',
  },
  'অন্যান্য': {
    english: 'OTHER',
    hindi: 'अन्य',
    bengali: 'অন্যান্য',
    marathi: 'इतर',
    tamil: 'மற்றவை',
    telugu: 'ఇతర',
    gujarati: 'અન્ય',
    kannada: 'ಇತರೆ',
    malayalam: 'മറ്റുള്ളവ',
    punjabi: 'ਹੋਰ',
  },
  // Purpose of visit values
  'Emergency': {
    english: 'Emergency',
    hindi: 'आपातकालीन',
    bengali: 'জরুরি',
    marathi: 'आपत्कालीन',
    tamil: 'அவசரநிலை',
    telugu: 'అత్యవసర',
    gujarati: 'કટોકટી',
    kannada: 'ತುರ್ತು',
    malayalam: 'അടിയന്തരാവസ്ഥ',
    punjabi: 'ਐਮਰਜੈਂਸੀ',
  },
  'आपातकालीन': {
    english: 'Emergency',
    hindi: 'आपातकालीन',
    bengali: 'জরুরি',
    marathi: 'आपत्कालीन',
    tamil: 'அவசரநிலை',
    telugu: 'అత్యవసర',
    gujarati: 'કટોકટી',
    kannada: 'ತುರ್ತು',
    malayalam: 'അടിയന്തരാവസ്ഥ',
    punjabi: 'ਐਮਰਜੈਂਸੀ',
  },
  'জরুরি': {
    english: 'Emergency',
    hindi: 'आपातकालीन',
    bengali: 'জরুরি',
    marathi: 'आपत्कालीन',
    tamil: 'அவசரநிலை',
    telugu: 'అత్యవసర',
    gujarati: 'કટોકટી',
    kannada: 'ತುರ್ತು',
    malayalam: 'അടിയന്തരാവസ്ഥ',
    punjabi: 'ਐਮਰਜੈਂਸੀ',
  },
  'Report Review (Within 5 Days of Initial Visit)': {
    english: 'Report Review (Within 5 Days of Initial Visit)',
    hindi: 'रिपोर्ट समीक्षा (प्रारंभिक यात्रा के 5 दिनों के भीतर)',
    bengali: 'রিপোর্ট পর্যালোচনা (প্রাথমিক সফরের 5 দিনের মধ্যে)',
    marathi: 'अहवाल तपासणी (५ दिवसांच्या आत)',
    tamil: 'அறிக்கை ஆய்வு (5 நாட்களுக்குள்)',
    telugu: 'రిపోర్ట్ సమీక్ష (5 రోజులలోపు)',
    gujarati: 'રિપોર્ટ સમીક્ષા (5 દિવસની અંદર)',
    kannada: 'ವರದಿ ಪರಿಶೀಲನೆ (5 ದಿನಗಳ ಒಳಗೆ)',
    malayalam: 'റിപ്പോർട്ട് പരിശോധന (5 ദിവസത്തിനുള്ളിൽ)',
    punjabi: 'ਰਿਪੋਰਟ ਸਮੀਖਿਆ (5 ਦਿਨਾਂ ਦੇ ਅੰਦਰ)',
  },
  'रिपोर्ट समीक्षा (प्रारंभिक यात्रा के 5 दिनों के भीतर)': {
    english: 'Report Review (Within 5 Days of Initial Visit)',
    hindi: 'रिपोर्ट समीक्षा (प्रारंभिक यात्रा के 5 दिनों के भीतर)',
    bengali: 'রিপোর্ট পর্যালোচনা (প্রাথমিক সফরের 5 দিনের মধ্যে)',
    marathi: 'अहवाल तपासणी (५ दिवसांच्या आत)',
    tamil: 'அறிக்கை ஆய்வு (5 நாட்களுக்குள்)',
    telugu: 'రిపోర్ట్ సమీక్ష (5 రోజులలోపు)',
    gujarati: 'રિપોર્ટ સમીક્ષા (5 દિવસની અંદર)',
    kannada: 'ವರದಿ ಪರಿಶೀಲನೆ (5 ದಿನಗಳ ಒಳಗೆ)',
    malayalam: 'റിപ്പോർട്ട് പരിശോധന (5 ദിവസത്തിനുള്ളിൽ)',
    punjabi: 'ਰਿਪੋਰਟ ਸਮੀਖਿਆ (5 ਦਿਨਾਂ ਦੇ ਅੰਦਰ)',
  },
  'রিপোর্ট পর্যালোচনা (প্রাথমিক সফরের 5 দিনের মধ্যে)': {
    english: 'Report Review (Within 5 Days of Initial Visit)',
    hindi: 'रिपोर्ट समीक्षा (प्रारंभिक यात्रा के 5 दिनों के भीतर)',
    bengali: 'রিপোর্ট পর্যালোচনা (প্রাথমিক সফরের 5 দিনের মধ্যে)',
    marathi: 'अहवाल तपासणी (५ दिवसांच्या आत)',
    tamil: 'அறிக்கை ஆய்வு (5 நாட்களுக்குள்)',
    telugu: 'రిపోర్ట్ సమీక్ష (5 రోజులలోపు)',
    gujarati: 'રિપોર્ટ સમીક્ષા (5 દિવસની અંદર)',
    kannada: 'ವರದಿ ಪರಿಶೀಲನೆ (5 ದಿನಗಳ ಒಳಗೆ)',
    malayalam: 'റിപ്പോർട്ട് പരിശോധന (5 ദിവസത്തിനുള്ളിൽ)',
    punjabi: 'ਰਿਪੋਰਟ ਸਮੀਖਿਆ (5 ਦਿਨਾਂ ਦੇ ਅੰਦਰ)',
  },
  'Follow-up Consultation (After 5 Days)': {
    english: 'Follow-up Consultation (After 5 Days)',
    hindi: 'अनुवर्ती परामर्श (5 दिनों के बाद)',
    bengali: 'ফলো-আপ পরামর্শ (5 দিন পরে)',
    marathi: 'पाठपुरावा सल्ला (५ दिवसांनंतर)',
    tamil: 'தொடர் ஆலோசனை (5 நாட்களுக்குப் பிறகு)',
    telugu: 'తదుపరి సంప్రదింపులు (5 రోజుల తర్వాత)',
    gujarati: 'ફોલો-અપ કન્સલ્ટેશન (5 દિવસ પછી)',
    kannada: 'ಮುಂದಿನ ಸಮಾಲೋಚನೆ (5 ದಿನಗಳ ನಂತರ)',
    malayalam: 'തുടർ പരിശോധന (5 ദിവസത്തിന് ശേഷം)',
    punjabi: 'ਫਾਲੋ-ਅਪ ਸਲਾਹ (5 ਦਿਨਾਂ ਬਾਅਦ)',
  },
  'अनुवर्ती परामर्श (5 दिनों के बाद)': {
    english: 'Follow-up Consultation (After 5 Days)',
    hindi: 'अनुवर्ती परामर्श (5 दिनों के बाद)',
    bengali: 'ফলো-আপ পরামর্শ (5 দিন পরে)',
    marathi: 'पाठपुरावा सल्ला (५ दिवसांनंतर)',
    tamil: 'தொடர் ஆலோசனை (5 நாட்களுக்குப் பிறகு)',
    telugu: 'తదుపరి సంప్రదింపులు (5 రోజుల తర్వాత)',
    gujarati: 'ફોલો-અપ કન્સલ્ટેશન (5 દિવસ પછી)',
    kannada: 'ಮುಂದಿನ ಸಮಾಲೋಚನೆ (5 ದಿನಗಳ ನಂತರ)',
    malayalam: 'തുടർ പരിശോധന (5 ദിവസത്തിന് ശേഷം)',
    punjabi: 'ਫਾਲੋ-ਅਪ ਸਲਾਹ (5 ਦਿਨਾਂ ਬਾਅਦ)',
  },
  'ফলো-আপ পরামর্শ (5 দিন পরে)': {
    english: 'Follow-up Consultation (After 5 Days)',
    hindi: 'अनुवर्ती परामर्श (5 दिनों के बाद)',
    bengali: 'ফলো-আপ পরামর্শ (5 দিন পরে)',
    marathi: 'पाठपुरावा सल्ला (५ दिवसांनंतर)',
    tamil: 'தொடர் ஆலோசனை (5 நாட்களுக்குப் பிறகு)',
    telugu: 'తదుపరి సంప్రదింపులు (5 రోజుల తర్వాత)',
    gujarati: 'ફોલો-અપ કન્સલ્ટેશન (5 દિવસ પછી)',
    kannada: 'ಮುಂದಿನ ಸಮಾಲೋಚನೆ (5 ದಿನಗಳ ನಂತರ)',
    malayalam: 'തുടർ പരിശോധന (5 ദിവസത്തിന് ശേഷം)',
    punjabi: 'ਫਾਲੋ-ਅਪ ਸਲਾਹ (5 ਦਿਨਾਂ ਬਾਅਦ)',
  },
  'Routine Check-up': {
    english: 'Routine Check-up',
    hindi: 'नियमित जांच',
    bengali: 'নিয়মিত পরীক্ষা',
    marathi: 'नियमित तपासणी',
    tamil: 'வழக்கமான பரிசோதனை',
    telugu: 'సాధారణ తనిఖీ',
    gujarati: 'નિયમિત તપાસ',
    kannada: 'ನಿಯಮಿತ ತಪಾಸಣೆ',
    malayalam: 'പതിവ് പരിശോധന',
    punjabi: 'ਰੁਟੀਨ ਚੈੱਕ-ਅਪ',
  },
  'नियमित जांच': {
    english: 'Routine Check-up',
    hindi: 'नियमित जांच',
    bengali: 'নিয়মিত পরীক্ষা',
    marathi: 'नियमित तपासणी',
    tamil: 'வழக்கமான பரிசோதனை',
    telugu: 'సాధారణ తనిఖీ',
    gujarati: 'નિયમિત તપાસ',
    kannada: 'ನಿಯಮಿತ ತಪಾಸಣೆ',
    malayalam: 'പതിവ് പരിശോധന',
    punjabi: 'ਰੁਟੀਨ ਚੈੱਕ-ਅਪ',
  },
  'নিয়মিত পরীক্ষা': {
    english: 'Routine Check-up',
    hindi: 'नियमित जांच',
    bengali: 'নিয়মিত পরীক্ষা',
    marathi: 'नियमित तपासणी',
    tamil: 'வழக்கமான பரிசோதனை',
    telugu: 'సాధారణ తనిఖీ',
    gujarati: 'નિયમિત તપાસ',
    kannada: 'ನಿಯಮಿತ ತಪಾಸಣೆ',
    malayalam: 'പതിവ് പരിശോധന',
    punjabi: 'ਰੁਟੀਨ ਚੈੱਕ-ਅਪ',
  },
  // Key-based values (saved in database)
  'new-patient': {
    english: 'New Patient - Initial Consultation',
    hindi: 'नया रोगी - प्रारंभिक परामर्श',
    bengali: 'নতুন রোগী - প্রাথমিক পরামর্শ',
    marathi: 'नवीन रुग्ण - प्रारंभिक सल्ला',
    tamil: 'புதிய நோயாளி - முதல் ஆலோசனை',
    telugu: 'కొత్త రోగి - ప్రాథమిక సంప్రదింపులు',
    gujarati: 'નવા દર્દી - પ્રારંભિક પરામર્શ',
    kannada: 'ಹೊಸ ರೋಗಿ - ಆರಂಭಿಕ ಸಮಾಲೋಚನೆ',
    malayalam: 'പുതിയ രോഗി - ആദ്യ പരിശോധന',
    punjabi: 'ਨਵਾਂ ਮਰੀਜ਼ - ਸ਼ੁਰੂਆਤੀ ਸਲਾਹ',
  },
  'existing-patient': {
    english: 'Existing Patient - New Treatment',
    hindi: 'मौजूदा रोगी - नया उपचार',
    bengali: 'বিদ্যমান রোগী - নতুন চিকিৎসা',
    marathi: 'जुना रुग्ण - नवीन उपचार',
    tamil: 'தற்போதுள்ள நோயாளி - புதிய சிகிச்சை',
    telugu: 'పాత రోగి - కొత్త చికిత్స',
    gujarati: 'હાલના દર્દી - નવી સારવાર',
    kannada: 'ಹಳೆಯ ರೋಗಿ - ಹೊಸ ಚಿಕಿತ್ಸೆ',
    malayalam: 'നിലവിലുള്ള രോഗി - പുതിയ ചികിത്സ',
    punjabi: 'ਮੌਜੂਦਾ ਮਰੀਜ਼ - ਨਵਾਂ ਇਲਾਜ',
  },
  'report-review': {
    english: 'Report Review (Within 5 Days)',
    hindi: 'रिपोर्ट समीक्षा (5 दिनों के भीतर)',
    bengali: 'রিপোর্ট পর্যালোচনা (5 দিনের মধ্যে)',
    marathi: 'अहवाल तपासणी (५ दिवसांच्या आत)',
    tamil: 'அறிக்கை ஆய்வு (5 நாட்களுக்குள்)',
    telugu: 'రిపోర్ట్ సమీక్ష (5 రోజులలోపు)',
    gujarati: 'રિપોર્ટ સમીક્ષા (5 દિવસની અંદર)',
    kannada: 'ವರದಿ ಪರಿಶೀಲನೆ (5 ದಿನಗಳ ಒಳಗೆ)',
    malayalam: 'റിപ്പോർട്ട് പരിശോധന (5 ദിവസത്തിനുള്ളിൽ)',
    punjabi: 'ਰਿਪੋਰਟ ਸਮੀਖਿਆ (5 ਦਿਨਾਂ ਦੇ ਅੰਦਰ)',
  },
  'follow-up': {
    english: 'Follow-up Consultation',
    hindi: 'अनुवर्ती परामर्श',
    bengali: 'ফলো-আপ পরামর্শ',
    marathi: 'पाठपुरावा सल्ला',
    tamil: 'தொடர் ஆலோசனை',
    telugu: 'తదుపరి సంప్రదింపులు',
    gujarati: 'ફોલો-અપ કન્સલ્ટેશન',
    kannada: 'ಮುಂದಿನ ಸಮಾಲೋಚನೆ',
    malayalam: 'തുടർ പരിശോധന',
    punjabi: 'ਫਾਲੋ-ਅਪ ਸਲਾਹ',
  },
  'routine-checkup': {
    english: 'Routine Check-up',
    hindi: 'नियमित जांच',
    bengali: 'নিয়মিত পরীক্ষা',
    marathi: 'नियमित तपासणी',
    tamil: 'வழக்கமான பரிசோதனை',
    telugu: 'సాధారణ తనిఖీ',
    gujarati: 'નિયમિત તપાસ',
    kannada: 'ನಿಯಮಿತ ತಪಾಸಣೆ',
    malayalam: 'പതിവ് പരിശോധന',
    punjabi: 'ਰੁਟੀਨ ਚੈੱਕ-ਅਪ',
  },
  'emergency': {
    english: 'Emergency',
    hindi: 'आपातकालीन',
    bengali: 'জরুরি',
    marathi: 'आपत्कालीन',
    tamil: 'அவசரநிலை',
    telugu: 'అత్యవసర',
    gujarati: 'કટોકટી',
    kannada: 'ತುರ್ತು',
    malayalam: 'അടിയന്തരാവസ്ഥ',
    punjabi: 'ਐਮਰਜੈਂਸੀ',
  },
};

// Transliteration mappings - Convert Bengali/Hindi script to English (Latin) phonetically
const bengaliToLatin: Record<string, string> = {
  'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
  'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'ny',
  'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
  'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
  'প': 'p', 'ফ': 'ph', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
  'য': 'y', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
  'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't',
  'ং': 'ng', 'ঃ': 'h', 'ঁ': 'n',
  'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
  '্': '' // Halant (vowel killer)
};

const hindiToLatin: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  '्': '', // Halant (vowel killer)
  'ं': 'n', 'ः': 'h', 'ँ': 'n'
};

// Helper function to detect if text contains Bengali/Hindi script
function containsIndicScript(text: string): boolean {
  // Bengali range: \u0980-\u09FF
  // Hindi (Devanagari) range: \u0900-\u097F
  return /[\u0980-\u09FF\u0900-\u097F]/.test(text);
}

// Reverse mapping: Latin to Hindi (for English names → Hindi script)
const latinToHindi: Record<string, string> = {
  'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ee': 'ई', 'u': 'उ', 'oo': 'ऊ', 'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ',
  'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ', 'ng': 'ङ',
  'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ', 'ny': 'ञ',
  't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न',
  'p': 'प', 'ph': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
  'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व', 'sh': 'श', 's': 'स', 'h': 'ह',
  // Conjuncts
  'nt': 'ंत', 'nd': 'ंद', 'st': 'स्त', 'tt': 'त्त', 'dd': 'द्द', 'mm': 'म्म', 'nn': 'न्न',
  'pr': 'प्र', 'tr': 'त्र', 'dr': 'द्र', 'br': 'ब्र', 'kr': 'क्र', 'gr': 'ग्र',
  'ks': 'क्ष', 'gy': 'ज्ञ', 'shh': 'ष'
};

// Reverse mapping: Latin to Bengali (for English names → Bengali script)
const latinToBengali: Record<string, string> = {
  'a': 'অ', 'aa': 'আ', 'i': 'ই', 'ee': 'ঈ', 'u': 'উ', 'oo': 'ঊ', 'e': 'এ', 'ai': 'ঐ', 'o': 'ও', 'au': 'ঔ',
  'k': 'ক', 'kh': 'খ', 'g': 'গ', 'gh': 'ঘ', 'ng': 'ং',
  'ch': 'চ', 'chh': 'ছ', 'j': 'জ', 'jh': 'ঝ', 'ny': 'ঞ',
  't': 'ত', 'th': 'থ', 'd': 'দ', 'dh': 'ধ', 'n': 'ন',
  'p': 'প', 'ph': 'ফ', 'b': 'ব', 'bh': 'ভ', 'm': 'ম',
  'y': 'য', 'r': 'র', 'l': 'ল', 'v': 'ভ', 'w': 'ও', 'sh': 'শ', 's': 'স', 'h': 'হ',
  // Conjuncts
  'nt': 'ন্ত', 'nd': 'ন্দ', 'st': 'স্ত', 'tt': 'ত্ত', 'dd': 'দ্দ', 'mm': 'ম্ম', 'nn': 'ন্ন',
  'pr': 'প্র', 'tr': 'ত্র', 'dr': 'দ্র', 'br': 'ব্র', 'kr': 'ক্র', 'gr': 'গ্র',
  'nk': 'ঙ্ক', 'nj': 'ঞ্জ', 'shh': 'ষ', 'll': 'ল্ল'
};

// Common Indian Surnames/Words Dictionary
const commonNames: Record<string, { hindi: string, bengali: string }> = {
  'chatterjee': { hindi: 'चटर्जी', bengali: 'চ্যাটার্জী' },
  'banerjee': { hindi: 'बनर्जी', bengali: 'ব্যানার্জী' },
  'mukherjee': { hindi: 'मुखर्जी', bengali: 'মুখার্জী' },
  'ganguly': { hindi: 'गांगुली', bengali: 'গাঙ্গুলী' },
  'das': { hindi: 'दास', bengali: 'দাস' },
  'dutta': { hindi: 'दत्ता', bengali: 'দত্ত' },
  'roy': { hindi: 'रॉय', bengali: 'রায়' },
  'sen': { hindi: 'सेन', bengali: 'সেন' },
  'bose': { hindi: 'बोस', bengali: 'বসু' },
  'ghosh': { hindi: 'घोष', bengali: 'ঘোষ' },
  'mitra': { hindi: 'मित्रा', bengali: 'মিত্র' },
  'sarkar': { hindi: 'सरकार', bengali: 'সরকার' },
  'chakraborty': { hindi: 'चक्रवर्ती', bengali: 'চক্রবর্তী' },
  'bhattacharya': { hindi: 'भट्टाचार्य', bengali: 'ভট্টাচার্য' },
  'gupta': { hindi: 'गुप्ता', bengali: 'গুপ্ত' },
  'sharma': { hindi: 'शर्मा', bengali: 'শর্মা' },
  'singh': { hindi: 'सिंह', bengali: 'সিংহ' },
  'kumar': { hindi: 'कुमार', bengali: 'কুমার' },
  'chowdhury': { hindi: 'चौधरी', bengali: 'চৌধুরী' },
  'mondal': { hindi: 'मंडल', bengali: 'মন্ডল' },
  'paul': { hindi: 'पॉल', bengali: 'পাল' },
  'pal': { hindi: 'पाल', bengali: 'পাল' },
  'sil': { hindi: 'सील', bengali: 'শীল' },
  'seal': { hindi: 'सील', bengali: 'শীল' },
  'majumdar': { hindi: 'मजूमदार', bengali: 'মজুমদার' }
};

// Matra mappings (Vowel signs) for Hindi
const hindiMatras: Record<string, string> = {
  'a': '', // Inherent vowel
  'aa': 'ा',
  'i': 'ि',
  'ee': 'ी',
  'u': 'ु',
  'oo': 'ू',
  'e': 'े',
  'ai': 'ै',
  'o': 'ो',
  'au': 'ौ',
  'r': 'ृ'
};

// Matra mappings (Vowel signs) for Bengali
const bengaliMatras: Record<string, string> = {
  'a': '', // Inherent vowel
  'aa': 'া',
  'i': 'ি',
  'ee': 'ী',
  'u': 'ু',
  'oo': 'ূ',
  'e': 'ে',
  'ai': 'ৈ',
  'o': 'ো',
  'au': 'ৌ',
  'r': 'ৃ'
};

// Helper function to transliterate Bengali/Hindi text to English (Latin script)
export function transliterateToLatin(text: string): string {
  if (!text || !containsIndicScript(text)) {
    return text; // Already in Latin script or empty
  }

  // Check for common names first (reverse lookup)
  const indicToLatin: Record<string, string> = {};
  Object.entries(commonNames).forEach(([english, indic]) => {
    indicToLatin[indic.hindi] = english;
    indicToLatin[indic.bengali] = english;
  });

  const words = text.split(' ');
  if (words.length > 1) {
    return words.map(word => {
      // Check exact match in dictionary
      if (indicToLatin[word]) {
        // Capitalize first letter
        return indicToLatin[word].charAt(0).toUpperCase() + indicToLatin[word].slice(1);
      }
      return transliterateToLatin(word);
    }).join(' ');
  }

  // Single word check
  if (indicToLatin[text]) {
    return indicToLatin[text].charAt(0).toUpperCase() + indicToLatin[text].slice(1);
  }

  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Try Bengali first
    if (bengaliToLatin[char]) {
      result += bengaliToLatin[char];
    }
    // Try Hindi/Devanagari
    else if (hindiToLatin[char]) {
      result += hindiToLatin[char];
    }
    // Keep spaces and other characters as-is
    else {
      result += char;
    }
  }

  // Clean up double consonants (e.g., "dtt" → "tta" for Dutta)
  result = result.replace(/([dtbkgp])\1+/gi, (match, _char) => {
    // Common double consonant corrections
    if (match.toLowerCase() === 'tt') return 'tta';
    if (match.toLowerCase() === 'dd') return 'dda';
    if (match.toLowerCase() === 'kk') return 'kka';
    if (match.toLowerCase() === 'pp') return 'ppa';
    return match; // Keep as-is for others
  });

  // Capitalize first letter of each word
  return result
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper function to transliterate English (Latin) to Hindi/Bengali script
export function transliterateFromLatin(text: string, targetScript: 'hindi' | 'bengali'): string {
  if (!text || containsIndicScript(text)) {
    return text; // Already in Indic script or empty
  }

  // Check for common names first (case-insensitive)
  const lowerText = text.toLowerCase();
  const words = lowerText.split(' ');

  // If it's a multi-word string, process each word
  if (words.length > 1) {
    return text.split(' ').map(word => transliterateFromLatin(word, targetScript)).join(' ');
  }

  // Single word check in dictionary
  if (commonNames[lowerText]) {
    return commonNames[lowerText][targetScript];
  }

  const mapping = targetScript === 'hindi' ? latinToHindi : latinToBengali;
  const matraMapping = targetScript === 'hindi' ? hindiMatras : bengaliMatras;

  let result = '';
  let isPreviousConsonant = false;

  let i = 0;
  while (i < lowerText.length) {
    let matched = false;
    let charToAdd = '';
    let isVowel = false;

    // Try 3-letter combinations first (e.g., 'chh')
    if (i + 2 < lowerText.length) {
      const three = lowerText.substring(i, i + 3);
      if (mapping[three]) {
        charToAdd = mapping[three];
        matched = true;
        i += 3;
        isVowel = /^[aeiou]/.test(three);
      }
    }

    // Try 2-letter combinations (e.g., 'ch', 'sh', 'aa', 'nt')
    if (!matched && i + 1 < lowerText.length) {
      const two = lowerText.substring(i, i + 2);

      // Special handling for vowels after consonants (Matras)
      if (isPreviousConsonant && matraMapping[two]) {
        charToAdd = matraMapping[two];
        matched = true;
        isVowel = true;
        i += 2;
      } else if (mapping[two]) {
        charToAdd = mapping[two];
        matched = true;
        isVowel = /^[aeiou]/.test(two);
        i += 2;
      }
    }

    // Single letter
    if (!matched) {
      const char = lowerText[i];

      // Special handling for vowels after consonants (Matras)
      if (isPreviousConsonant && matraMapping[char] !== undefined) {
        charToAdd = matraMapping[char];
        isVowel = true;
      } else if (mapping[char]) {
        charToAdd = mapping[char];
        isVowel = /^[aeiou]/.test(char);
      } else if (char === ' ') {
        charToAdd = ' ';
        isVowel = false; // Space resets consonant state
      } else {
        charToAdd = char; // Keep unknown characters as-is
        isVowel = false;
      }
      i++;
    }

    result += charToAdd;

    // Update state
    if (charToAdd === ' ') {
      isPreviousConsonant = false;
    } else if (isVowel) {
      // After a vowel/matra, the next char is a new start (not following a consonant directly for matra purposes)
      isPreviousConsonant = false;
    } else {
      // It's a consonant (or conjunct ending in consonant)
      isPreviousConsonant = true;
    }
  }

  return result;
}

// Smart transliteration: Convert name to doctor's preferred script
export function transliterateName(name: string, targetLanguage: Language): string {
  if (!name) return name;

  const hasIndicScript = containsIndicScript(name);

  // If doctor wants English and name is in Indic script → convert to Latin
  if (targetLanguage === 'english' && hasIndicScript) {
    return transliterateToLatin(name);
  }

  // If doctor wants Hindi and name is in Latin script → convert to Hindi
  if (targetLanguage === 'hindi' && !hasIndicScript) {
    return transliterateFromLatin(name, 'hindi');
  }

  // If doctor wants Bengali and name is in Latin script → convert to Bengali
  if (targetLanguage === 'bengali' && !hasIndicScript) {
    return transliterateFromLatin(name, 'bengali');
  }

  // For other non-English languages with Latin script input → try AI transliteration
  if (targetLanguage !== 'english' && !hasIndicScript) {
    const cached = translationCache.get(`name_translit::${targetLanguage}::${name}`);
    if (cached) return cached;
    // Trigger async transliteration in background (will show on refresh)
    transliterateNameAsync(name, targetLanguage);
  }

  // Otherwise return as-is (same script as target)
  return name;
}

// Async name transliteration for non-core languages (caches result for next render)
async function transliterateNameAsync(name: string, targetLanguage: Language): Promise<void> {
  try {
    const { aiTranslate } = await import('../services/aiTranslationService');
    const result = await aiTranslate(name, targetLanguage as any, 'ui');
    translationCache.set(`name_translit::${targetLanguage}::${name}`, result.translated);
  } catch { /* silent */ }
}

// Helper function to translate patient data values from patient's language to doctor's language
export function translateDataValue(value: string, targetLanguage: Language): string {
  // If the value exists in our translation map, translate it
  if (dataValueTranslations[value as keyof typeof dataValueTranslations]) {
    const translated = (dataValueTranslations[value as keyof typeof dataValueTranslations] as any)[targetLanguage];
    if (translated) return translated;

    // For languages without a hardcoded entry, check AI cache or fall back to English
    if (targetLanguage !== 'english') {
      const cached = translationCache.get(`data::${targetLanguage}::${value}`);
      if (cached) return cached;
      // Get English value and trigger async translation
      const englishValue = (dataValueTranslations[value as keyof typeof dataValueTranslations] as any)['english'] || value;
      translateDataValueAsync(englishValue, value, targetLanguage);
      return englishValue; // Return English as temporary fallback
    }

    return value;
  }
  // Otherwise return the original value (patient name, etc.)
  return value;
}

// Async data value translation for non-core languages
async function translateDataValueAsync(englishValue: string, originalValue: string, targetLanguage: Language): Promise<void> {
  try {
    const { aiTranslate } = await import('../services/aiTranslationService');
    const result = await aiTranslate(englishValue, targetLanguage as any, 'medical');
    translationCache.set(`data::${targetLanguage}::${originalValue}`, result.translated);
  } catch { /* silent */ }
}

// Normalize Indic numerals to English digits (for age input)
export function normalizeIndicNumerals(text: string): string {
  if (!text) return text;

  // Bengali numerals (০-৯) to English (0-9)
  const bengaliToEnglish: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };

  // Hindi/Devanagari numerals (०-९) to English (0-9)
  const hindiToEnglish: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };

  let result = text;

  // Replace Bengali numerals
  Object.keys(bengaliToEnglish).forEach(bengaliDigit => {
    result = result.replace(new RegExp(bengaliDigit, 'g'), bengaliToEnglish[bengaliDigit]);
  });

  // Replace Hindi numerals
  Object.keys(hindiToEnglish).forEach(hindiDigit => {
    result = result.replace(new RegExp(hindiDigit, 'g'), hindiToEnglish[hindiDigit]);
  });

  return result;
}

// Normalize patient name: Always store in English (Latin script)
// If name is in Bengali/Hindi, transliterate to English before storing
export function normalizePatientName(name: string): string {
  if (!name) return name;

  // DISABLE FORCED TRANSLITERATION
  // We want to preserve the original script entered by the patient.
  // The doctor's view will handle transliteration if needed.
  return name;
}
