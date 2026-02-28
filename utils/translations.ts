// Real-time Multilingual Translation Service
// Supports: English, Hindi (हिंदी), Bengali (বাংলা), Marathi (मराठी), Tamil (தமிழ்), Telugu (తెలుగు), Gujarati (ગુજરાતી), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Punjabi (ਪੰਜਾਬੀ), Assamese (অসমীয়া)

export type Language = 'english' | 'hindi' | 'bengali' | 'marathi' | 'tamil' | 'telugu' | 'gujarati' | 'kannada' | 'malayalam' | 'punjabi' | 'assamese';
export type LanguageCode = 'en' | 'hi' | 'bn' | 'mr' | 'ta' | 'te' | 'gu' | 'kn' | 'ml' | 'pa' | 'as';

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
  };
  return map[code];
}

export const translations = {
  // Language Selection Page
  chooseLanguage: {
    english: 'Choose Your Language',
    hindi: 'अपनी भाषा चुनें',
    bengali: 'আপনার ভাষা নির্বাচন করুন',
    marathi: 'तुमची भाषा निवडा',
    tamil: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
    telugu: 'మీ భాషను ఎంచుకోండి',
    gujarati: 'તમારી ભાષા પસંદ કરો',
    kannada: 'ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆರಿಸಿ',
    malayalam: 'നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക',
    punjabi: 'ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ',
    assamese: 'আপোনাৰ ভাষা বাছনি কৰক',
  },
  languageSubtitle: {
    english: 'Select your preferred language for the best experience',
    hindi: 'सर्वोत्तम अनुभव के लिए अपनी पसंदीदा भाषा चुनें',
    bengali: 'সেরা অভিজ্ঞতার জন্য আপনার পছন্দের ভাষা নির্বাচন করুন',
    marathi: 'सर्वोत्तम अनुभवासाठी तुमची पसंतीची भाषा निवडा',
    tamil: 'சிறந்த அனுபவத்திற்கு உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்',
    telugu: 'ఉత్తమ అనుభవం కోసం మీ ప్రాధాన్య భాషను ఎంచుకోండి',
    gujarati: 'શ્રેષ્ઠ અનુભવ માટે તમારી પસંદગીની ભાષા પસંદ કરો',
    kannada: 'ಉತ್ತಮ ಅನುಭವಕ್ಕಾಗಿ ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    malayalam: 'മികച്ച അനുഭവത്തിനായി നിങ്ങളുടെ ഇഷ്ട ഭാഷ തിരഞ്ഞെടുക്കുക',
    punjabi: 'ਵਧੀਆ ਅਨੁਭਵ ਲਈ ਆਪਣੀ ਪਸੰਦੀਦਾ ਭਾਸ਼ਾ ਚੁਣੋ',
    assamese: 'সৰ্বোত্তম অভিজ্ঞতাৰ বাবে আপোনাৰ পছন্দৰ ভাষা বাছনি কৰক',
  },
  defaultLanguage: {
    english: 'Default language',
    hindi: 'डिफ़ॉल्ट भाषा',
    bengali: 'ডিফল্ট ভাষা',
    marathi: 'डीफॉल्ट भाषा',
    tamil: 'இயல்புநிலை மொழி',
    telugu: 'డిఫాల్ట్ భాష',
    gujarati: 'ડિફૉલ્ટ ભાષા',
    kannada: 'ಡೀಫಾಲ್ಟ್ ಭಾಷೆ',
    malayalam: 'ഡിഫോൾട്ട് ഭാഷ',
    punjabi: 'ਡਿਫਾਲਟ ਭਾਸ਼ਾ',
    assamese: 'ডিফল্ট ভাষা',
  },
  continue: {
    english: 'Continue',
    hindi: 'जारी रखें',
    bengali: 'চালিয়ে যান',
    marathi: 'पुढे जा',
    tamil: 'தொடரவும்',
    telugu: 'కొనసాగించండి',
    gujarati: 'ચાલુ રાખો',
    kannada: 'ಮುಂದುವರಿಸಿ',
    malayalam: 'തുടരുക',
    punjabi: 'ਜਾਰੀ ਰੱਖੋ',
    assamese: 'অব্যাহত ৰাখক',
  },
  yourLanguageBenefits: {
    english: 'Your Language Benefits',
    hindi: 'आपकी भाषा के लाभ',
    bengali: 'আপনার ভাষার সুবিধা',
    marathi: 'तुमच्या भाषेचे फायदे',
    tamil: 'உங்கள் மொழி நன்மைகள்',
    telugu: 'మీ భాషా ప్రయోజనాలు',
    gujarati: 'તમારી ભાષાના લાભો',
    kannada: 'ನಿಮ್ಮ ಭಾಷೆಯ ಪ್ರಯೋಜನಗಳು',
    malayalam: 'നിങ്ങളുടെ ഭാഷാ ആനുകൂല്യങ്ങൾ',
    punjabi: 'ਤੁਹਾਡੀ ਭਾਸ਼ਾ ਦੇ ਲਾਭ',
    assamese: 'আপোনাৰ ভাষাৰ সুবিধা',
  },
  benefitMessages: {
    english: 'All messages translated to your language',
    hindi: 'सभी संदेश आपकी भाषा में अनुवादित',
    bengali: 'সমস্ত বার্তা আপনার ভাষায় অনুবাদ করা হয়েছে',
    marathi: 'सर्व संदेश तुमच्या भाषेत अनुवादित',
    tamil: 'அனைத்து செய்திகளும் உங்கள் மொழியில் மொழிபெயர்க்கப்பட்டுள்ளன',
    telugu: 'అన్ని సందేశాలు మీ భాషలోకి అనువదించబడ్డాయి',
    gujarati: 'બધા સંદેશાઓ તમારી ભાષામાં અનુવાદિત',
    kannada: 'ಎಲ್ಲಾ ಸಂದೇಶಗಳನ್ನು ನಿಮ್ಮ ಭಾಷೆಗೆ ಅನುವಾದಿಸಲಾಗಿದೆ',
    malayalam: 'എല്ലാ സന്ദേശങ്ങളും നിങ്ങളുടെ ഭാഷയിലേക്ക് വിവർത്തനം ചെയ്തു',
    punjabi: 'ਸਾਰੇ ਸੁਨੇਹੇ ਤੁਹਾਡੀ ਭਾਸ਼ਾ ਵਿੱਚ ਅਨੁਵਾਦ ਕੀਤੇ ਗਏ',
    assamese: 'সকলো বাৰ্তা আপোনাৰ ভাষালৈ অনুবাদ কৰা হৈছে',
  },
  benefitNotifications: {
    english: 'Notifications and reminders in your language',
    hindi: 'आपकी भाषा में सूचनाएं और अनुस्मारक',
    bengali: 'আপনার ভাষায় বিজ্ঞপ্তি এবং অনুস্মারক',
    marathi: 'तुमच्या भाषेत सूचना आणि स्मरणपत्रे',
    tamil: 'உங்கள் மொழியில் அறிவிப்புகள் மற்றும் நினைவூட்டல்கள்',
    telugu: 'మీ భాషలో నోటిఫికేషన్‌లు మరియు రిమైండర్‌లు',
    gujarati: 'તમારી ભાષામાં સૂચનાઓ અને રીમાઇન્ડર્સ',
    kannada: 'ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಅಧಿಸೂಚನೆಗಳು ಮತ್ತು ಜ್ಞಾಪನೆಗಳು',
    malayalam: 'നിങ്ങളുടെ ഭാഷയിലുള്ള അറിയിപ്പുകളും ഓർമ്മപ്പെടുത്തലുകളും',
    punjabi: 'ਤੁਹਾਡੀ ਭਾਸ਼ਾ ਵਿੱਚ ਸੂਚਨਾਵਾਂ ਅਤੇ ਰੀਮਾਈਂਡਰ',
    assamese: 'আপোনাৰ ভাষাত জাননী আৰু সোঁৱৰণী',
  },
  benefitConfirmations: {
    english: 'Booking confirmations translated automatically',
    hindi: 'बुकिंग पुष्टिकरण स्वचालित रूप से अनुवादित',
    bengali: 'বুকিং নিশ্চিতকরণ স্বয়ংক্রিয়ভাবে অনুবাদ করা হয়েছে',
    marathi: 'बुकिंग पुष्टीकरण स्वयंचलितपणे अनुवादित',
    tamil: 'முன்பதிவு உறுதிப்படுத்தல்கள் தானாகவே மொழிபெயர்க்கப்படும்',
    telugu: 'బుకింగ్ నిర్ధారణలు స్వయంచాలకంగా అనువదించబడతాయి',
    gujarati: 'બુકિંગ કન્ફર્મેશન આપમેળે અનુવાદિત થાય છે',
    kannada: 'ಬುಕಿಂಗ್ ದೃಢೀಕರಣಗಳು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಅನುವಾದಗೊಳ್ಳುತ್ತವೆ',
    malayalam: 'ബുക്കിംഗ് സ്ഥിരീകരണങ്ങൾ സ്വയമേവ വിവർത്തനം ചെയ്യപ്പെടുന്നു',
    punjabi: 'ਬੁਕਿੰਗ ਪੁਸ਼ਟੀਕਰਣ ਆਪਣੇ ਆਪ ਅਨੁਵਾਦ ਕੀਤੇ ਗਏ',
    assamese: 'বুকিং নিশ্চিতকৰণ স্বয়ংক্ৰিয়ভাৱে অনুবাদ কৰা হৈছে',
  },
  todayHealthTip: {
    english: "Today's Health Tip",
    hindi: 'आज का स्वास्थ्य टिप',
    bengali: 'আজকের স্বাস্থ্য টিপস',
    assamese: 'আজিৰ স্বাস্থ্য পৰামৰ্শ',
  },
  healthTipContent: {
    english: 'Regular hand washing for 20 seconds can prevent 80% of common infections.',
    hindi: '20 सेकंड के लिए नियमित रूप से हाथ धोने से 80% सामान्य संक्रमण को रोका जा सकता है।',
    bengali: '20 সেকেন্ডের জন্য নিয়মিত হাত ধোয়া 80% সাধারণ সংক্রমণ প্রতিরোধ করতে পারে।',
    assamese: '20 ছেকেণ্ডৰ বাবে নিয়মীয়াকৈ হাত ধোৱাই 80% সাধাৰণ সংক্ৰমণ প্ৰতিৰোধ কৰিব পাৰে।',
  },
  poweredBy: {
    english: 'Powered by HealQR.com',
    hindi: 'HealQR.com द्वारा संचालित',
    bengali: 'HealQR.com দ্বারা চালিত',
    assamese: 'HealQR.com দ্বাৰা পৰিচালিত',
  },
  downloadPrescription: {
    english: 'Download Digital Prescription',
    hindi: 'डिजिटल पर्चा डाउनलोड करें',
    bengali: 'ডিজিটাল প্রেসক্রিপশন ডাউনলোড করুন',
    assamese: 'ডিজিটেল প্ৰেছক্ৰিপচন ডাউনলোড কৰক',
  },
  downloadDietChart: {
    english: 'Download AI Diet Chart',
    hindi: 'एआई डाइट चार्ट डाउनलोड करें',
    bengali: 'এআই ডায়েট চার্ট ডাউনলোড করুন',
    assamese: 'এআই ডায়েট চাৰ্ট ডাউনলোড কৰক',
  },
  rxSecureLink: {
    english: 'Securely generated digital prescription',
    hindi: 'सुरक्षित रूप से जनरेट किया गया डिजिटल पर्चा',
    bengali: 'সুরক্ষিতভাবে তৈরি ডিজিটাল প্রেসক্রিপশন',
    assamese: 'সুৰক্ষিতভাৱে তৈয়াৰী ডিজিটেল প্ৰেছক্ৰিপচন',
  },

  // Mini Website / Doctor Profile
  doctorProfile: {
    english: 'Doctor Profile',
    hindi: 'डॉक्टर प्रोफ़ाइल',
    bengali: 'ডাক্তার প্রোফাইল',
    assamese: 'ডাক্তৰৰ প্ৰোফাইল',
  },
  bookAppointmentNow: {
    english: 'Book Appointment Now',
    hindi: 'अभी अपॉइंटमेंट बुक करें',
    bengali: 'এখনই অ্যাপয়েন্টমেন্ট বুক করুন',
    assamese: 'এতিয়াই এপইণ্টমেণ্ট বুক কৰক',
  },
  knowYourDoctor: {
    english: 'Know Your Doctor',
    hindi: 'अपने डॉक्टर को जानें',
    bengali: 'আপনার ডাক্তারকে জানুন',
    assamese: 'আপোনাৰ ডাক্তৰক জানক',
  },
  reviews: {
    english: 'reviews',
    hindi: 'समीक्षाएं',
    bengali: 'পর্যালোচনা',
    assamese: 'পৰ্যালোচনা',
  },
  patientReviews: {
    english: 'Patient Reviews',
    hindi: 'रोगी समीक्षाएं',
    bengali: 'রোগীর পর্যালোচনা',
    assamese: 'ৰোগীৰ পৰ্যালোচনা',
  },
  verifiedPatient: {
    english: 'Verified Patient',
    hindi: 'सत्यापित रोगी',
    bengali: 'যাচাইকৃত রোগী',
    assamese: 'যাচাই কৰা ৰোগী',
  },
  bookYourAppointment: {
    english: 'Book your appointment through',
    hindi: 'अपना अपॉइंटमेंट बुक करें',
    bengali: 'আপনার অ্যাপয়েন্টমেন্ট বুক করুন',
    assamese: 'আপোনাৰ এপইণ্টমেণ্ট বুক কৰক',
  },
  healthTipExercise: {
    english: 'Aim for at least 30 minutes of moderate-intensity exercise five days of the week to keep your heart healthy.',
    hindi: 'अपने दिल को स्वस्थ रखने के लिए सप्ताह में पांच दिन कम से कम 30 मिनट की मध्यम-तीव्रता वाली व्यायाम का लक्ष्य रखें।',
    bengali: 'আপনার হৃদয় সুস্থ রাখতে সপ্তাহে পাঁচ দিন অন্তত 30 মিনিটের মাঝারি-তীব্রতার ব্যায়ামের লক্ষ্য রাখুন।',
    assamese: 'আপোনাৰ হৃদয় সুস্থ ৰাখিবলৈ সপ্তাহত পাঁচ দিন অন্তত 30 মিনিটৰ মধ্যম-তীব্ৰতাৰ ব্যায়ামৰ লক্ষ্য ৰাখক।',
  },

  // Clinic Booking Doctor Search
  findYourDoctor: {
    english: 'Find Your Doctor', hindi: 'अपना डॉक्टर खोजें', bengali: 'আপনার ডাক্তার খুঁজুন', marathi: 'तुमचा डॉक्टर शोधा', tamil: 'உங்கள் மருத்துவரைத் தேடுங்கள்', telugu: 'మీ వైద్యుడిని కనుగొనండి', gujarati: 'તમારા ડૉક્ટરને શોધો', kannada: 'ನಿಮ್ಮ ವೈದ್ಯರನ್ನು ಹುಡುಕಿ', malayalam: 'നിങ്ങളുടെ ഡോക്ടറെ കണ്ടെത്തുക', punjabi: 'ਆਪਣੇ ਡਾਕਟਰ ਨੂੰ ਲੱਭੋ', assamese: 'আপোনাৰ ডাক্তৰ বিচাৰক',
  },
  chooseHowSearch: {
    english: "Choose how you'd like to search", hindi: 'चुनें कि आप कैसे खोजना चाहते हैं', bengali: 'আপনি কীভাবে অনুসন্ধান করতে চান তা চয়ন করুন', marathi: 'तुम्हाला कसे शोधायचे आहे ते निवडा', tamil: 'நீங்கள் எவ்வாறு தேட விரும்புகிறீர்கள் என்பதைத் தேர்வுசெய்க', telugu: 'మీరు ఎలా శోధించాలనుకుంటున్నారో ఎంచుకోండి', gujarati: 'તમે કેવી રીતે શોધવા માંગો છો તે પસંદ કરો', kannada: 'ನೀವು ಹೇಗೆ ಹುಡುಕಬೇಕು ಎಂಬುದನ್ನು ಆಯ್ಕೆಮಾಡಿ', malayalam: 'നിങ്ങൾ എങ്ങനെ തിരയാൻ ആഗ്രഹിക്കുന്നുവെന്ന് തിരഞ്ഞെടുക്കുക', punjabi: 'ਚੁਣੋ ਕਿ ਤੁਸੀਂ ਕਿਵੇਂ ਖੋਜ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ', assamese: 'আপুনি কেনেকৈ বিচাৰিব বিচাৰে বাছক',
  },
  bySpecialty: {
    english: 'By Specialty', hindi: 'विशेषज्ञता द्वारा', bengali: 'বিশেষজ্ঞতা দ্বারা', marathi: 'विशेषज्ञतेनुसार', tamil: 'சிறப்பு மூலம்', telugu: 'స్పెషాలిటీ ద్వారా', gujarati: 'વિશેષતા દ્વારા', kannada: 'ವಿಶೇಷತೆಯ ಮೂಲಕ', malayalam: 'സ്പെഷ്യാലിറ്റി പ്രകാരം', punjabi: 'ਵਿਸ਼ੇਸ਼ਤਾ ਦੁਆਰਾ', assamese: 'বিশেষজ্ঞতাৰ দ্বাৰা',
  },
  browseSpecialty: {
    english: 'Browse doctors by their medical specialty', hindi: 'डॉक्टरों को उनकी चिकित्सा विशेषज्ञता द्वारा ब्राउज़ करें', bengali: 'ডাক্তারদের তাদের চিকিৎসা বিশেষজ্ঞতা দ্বারা ব্রাউজ করুন', marathi: 'डॉक्टरांना त्यांच्या वैद्यकीय विशेषज्ञतेनुसार ब्राउझ करा', tamil: 'வைத்தியர்களின் குறிக்கோள் மூலம் அவர்களை பாருங்கள்', telugu: 'వారి వైద్య ప్రత్యేకత ద్వారా వైద్యులను బ్రౌజ్ చేయండి', gujarati: 'તેમની તબીબી વિશેષતા દ્વારા ડોકટરો બ્રાઉઝ કરો', kannada: 'ಅವರ ವೈದ್ಯಕೀಯ ವಿಶೇಷತೆಯ ಮೂಲಕ ವೈದ್ಯರನ್ನು ಬ್ರೌಸ್ ಮಾಡಿ', malayalam: 'അവരുടെ മെഡിക്കൽ സ്പെഷ്യാലിറ്റി ഉപയോഗിച്ച് ഡോക്ടർമാരെ ബ്രൗസ് ചെയ്യുക', punjabi: 'ਉਹਨਾਂ ਦੀ ਮੈਡੀਕਲ ਵਿਸ਼ੇਸ਼ਤਾ ਦੁਆਰਾ ਡਾਕਟਰਾਂ ਨੂੰ ਬ੍ਰਾਊਜ਼ ਕਰੋ', assamese: 'ডাক্তৰসকলক তেওঁলোকৰ চিকিৎসা বিশেষজ্ঞতাৰ দ্বাৰা ব্ৰাউজ কৰক',
  },
  specialtiesAvailable: {
    english: 'specialties available →', hindi: 'विशेषज्ञताएं उपलब्ध →', bengali: 'বিশেষজ্ঞতা উপলব্ধ →', marathi: 'विशेषज्ञता उपलब्ध →', tamil: 'சிறப்புகள் கிடைக்கின்றன →', telugu: 'స్పెషాలిటీలు అందుబాటులో ఉన్నాయి →', gujarati: 'વિશેષતાઓ ઉપલબ્ધ છે →', kannada: 'ವಿಶೇಷತೆಗಳು ಲಭ್ಯವಿದೆ →', malayalam: 'സ്പെഷ്യാലിറ്റികൾ ലഭ്യമാണ് →', punjabi: 'ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਉਪਲਬਧ ਹਨ →', assamese: 'বিশেষজ্ঞতা উপলব্ধ →',
  },
  byName: {
    english: 'By Name', hindi: 'नाम द्वारा', bengali: 'নাম দ্বারা', marathi: 'नावाद्वारे', tamil: 'பெயரால்', telugu: 'పేరు ద్వారా', gujarati: 'નામ દ્વારા', kannada: 'ಹೆಸರಿನ ಮೂಲಕ', malayalam: 'പേരിൽ', punjabi: 'ਨਾਮ ਦੁਆਰਾ', assamese: 'নামৰ দ্বাৰা',
  },
  searchByNameDesc: {
    english: 'Search for a doctor by their name', hindi: 'नाम से डॉक्टर खोजें', bengali: 'নাম অনুসারে ডাক্তার খুঁজুন', marathi: 'नावाने डॉक्टर शोधा', tamil: 'ஒரு மருத்துவரை பெயரால் தேடுங்கள்', telugu: 'పేరు ద్వారా వైద్యుడిని శోధించండి', gujarati: 'નામ દ્વારા ડૉક્ટર શોધો', kannada: 'ಹೆಸರಿನಿಂದ ವೈದ್ಯರನ್ನು ಹುಡುಕಿ', malayalam: 'പേര് ഉപയോഗിച്ച് ഡോക്ടറെ തിരയുക', punjabi: 'ਨਾਮ ਦੁਆਰਾ ਡਾਕਟਰ ਦੀ ਖੋਜ ਕਰੋ', assamese: 'নামৰ দ্বাৰা ডাক্তৰ বিচাৰক',
  },
  doctorsAvailableTxt: {
    english: 'doctors available →', hindi: 'डॉक्टर उपलब्ध →', bengali: 'ডাক্তার উপলব্ধ →', marathi: 'डॉक्टर उपलब्ध →', tamil: 'மருத்துவர்கள் உள்ளனர் →', telugu: 'వైద్యులు అందుబాటులో ఉన్నారు →', gujarati: 'ડોકટરો ઉપલબ્ધ છે →', kannada: 'ವೈದ್ಯರು ಲಭ್ಯವಿದ್ದಾರೆ →', malayalam: 'ഡോക്ടർമാർ ലഭ്യമാണ് →', punjabi: 'ਡਾਕਟਰ ਉਪਲਬਧ ਹਨ →', assamese: 'ডাক্তৰ উপলব্ধ →',
  },
  searchBySpecialty: {
    english: 'Search by Specialty', hindi: 'विशेषज्ञता द्वारा खोजें', bengali: 'বিশেষজ্ঞতা দ্বারা অনুসন্ধান করুন', marathi: 'विशेषज्ञतेनुसार शोधा', tamil: 'சிறப்பு மூலம் தேடுங்கள்', telugu: 'స్పెషాలిటీ ద్వారా శోధించండి', gujarati: 'વિશેષતા દ્વારા શોધો', kannada: 'ವಿಶೇಷತೆಯ ಮೂಲಕ ಹುಡುಕಿ', malayalam: 'സ്പെഷ്യാലിറ്റി പ്രകാരം തിരയുക', punjabi: 'ਵਿਸ਼ੇਸ਼ਤਾ ਦੁਆਰਾ ਖੋਜ ਕਰੋ', assamese: 'विशेषজ্ঞতাৰ দ্বাৰা বিচাৰক',
  },
  searchByNameTitle: {
    english: 'Search by Name', hindi: 'नाम से खोजें', bengali: 'নাম দ্বারা অনুসন্ধান করুন', marathi: 'नावाद्वारे शोधा', tamil: 'பெயரால் தேடுங்கள்', telugu: 'పేరు ద్వారా శోధించండి', gujarati: 'નામ દ્વારા શોધો', kannada: 'ಹೆಸರಿನ ಮೂಲಕ ಹುಡುಕಿ', malayalam: 'പേരിൽ തിരയുക', punjabi: 'ਨਾਮ ਦੁਆਰਾ ਖੋਜ ਕਰੋ', assamese: 'নামৰ দ্বাৰা বিচাৰক',
  },
  findRightDoctor: {
    english: 'Find the right doctor for you', hindi: 'अपने लिए सही डॉक्टर खोजें', bengali: 'আপনার জন্য সঠিক ডাক্তার খুঁজুন', marathi: 'तुमच्यासाठी योग्य डॉक्टर शोधा', tamil: 'உங்களுக்கு சரியான மருத்துவரைக் கண்டறியவும்', telugu: 'మీకు సరైన వైద్యుడిని కనుగొనండి', gujarati: 'તમારા માટે યોગ્ય ડૉક્ટર શોધો', kannada: 'ನಿಮಗಾಗಿ ಸರಿಯಾದ ವೈದ್ಯರನ್ನು ಹುಡುಕಿ', malayalam: 'നിങ്ങൾക്ക് അനുയോജ്യമായ ഡോക്ടറെ കണ്ടെത്തുക', punjabi: 'ਤੁਹਾਡੇ ਲਈ ਸਹੀ ڈਾਕਟਰ ਲੱਭੋ', assamese: 'আপোনাৰ বাবে সঠিক ডাক্তৰ বিচাৰক',
  },
  noDoctorsFound: {
    english: 'No doctors found', hindi: 'कोई डॉक्टर नहीं मिला', bengali: 'কোনো ডাক্তার পাওয়া যায়নি', marathi: 'कोणतेही डॉक्टर आढळले नाहीत', tamil: 'எந்த மருத்துவரும் காணப்படவில்லை', telugu: 'వైద్యులు ఎవరూ కనుగొనబడలేదు', gujarati: 'કોઈ ડોકટરો મળ્યા નથી', kannada: 'ಯಾವುದೇ ವೈದ್ಯರು ಕಂಡುಬಂದಿಲ್ಲ', malayalam: 'ഡോക്ടർമാരെയൊന്നും കണ്ടെത്തിയില്ല', punjabi: 'ਕੋਈ ਡਾਕਟਰ ਨਹੀਂ ਮਿਲਿਆ', assamese: 'কোনো ডাক্তৰ পোৱা নগ’ল',
  },
  tryAdjusting: {
    english: 'Try adjusting your search criteria', hindi: 'अपने खोज मानदंड को समायोजित करने का प्रयास करें', bengali: 'আপনার অনুসন্ধানের মানদণ্ড সামঞ্জস্য করার চেষ্টা করুন', marathi: 'तुमचे शोध निकष समायोजित करण्याचा प्रयत्न करा', tamil: 'உங்கள் தேடல் அளவுகோல்களை சரிசெய்ய முயற்சிக்கவும்', telugu: 'మీ శోధన ప్రమాణాలను సర్దుబాటు చేయడానికి ప్రయత్నించండి', gujarati: 'તમારા શોધ માપદંડને સમાયોજિત કરવાનો પ્રયાસ કરો', kannada: 'ನಿಮ್ಮ ಹುಡುಕಾಟ ಮಾನದಂಡಗಳನ್ನು ಹೊಂದಿಸಲು ಪ್ರಯತ್ನಿಸಿ', malayalam: 'നിങ്ങളുടെ തിരയൽ മാനദണ്ഡം ക്രമീകരിക്കാൻ ശ്രമിക്കുക', punjabi: 'ਆਪਣੇ ਖੋਜ ਮਾਪਦੰਡ ਨੂੰ ਅਨੁਕੂਲ ਕਰਨ ਦੀ ਕੋਸ਼ਿਸ਼ ਕਰੋ', assamese: 'আপোনাৰ অনুসন্ধান নিৰ্ণায়ক সালসলনি কৰিবলৈ চেষ্টা কৰক',
  },
  resetSearchText: {
    english: 'Reset search', hindi: 'खोज रीसेट करें', bengali: 'অনুসন্ধান রিসেট করুন', marathi: 'शोध रीसेट करा', tamil: 'தேடலை மீட்டமைக்கவும்', telugu: 'శోధనను రీసెట్ చేయండి', gujarati: 'શોધ રીસેટ કરો', kannada: 'ಹುಡುಕಾಟವನ್ನು ಮರುಹೊಂದಿಸಿ', malayalam: 'തിരയൽ പുനഃസജ്ജമാക്കുക', punjabi: 'ਖੋਜ ਰੀਸੈਟ ਕਰੋ', assamese: 'অনুসন্ধান ৰিছেট কৰক',
  },
  enterDoctorName: {
    english: "Enter doctor's name...", hindi: 'डॉक्टर का नाम दर्ज करें...', bengali: 'ডাক্তারের নাম লিখুন...', marathi: 'डॉक्टरांचे नाव प्रविष्ट करा...', tamil: 'மருத்துவரின் பெயரை உள்ளிடவும்...', telugu: 'వైద్యుడి పేరు నమోదు చేయండి...', gujarati: 'ડૉક્ટરનું નામ દાખલ કરો...', kannada: 'ವೈದ್ಯರ ಹೆಸರನ್ನು ನಮೂದಿಸಿ...', malayalam: 'ഡോക്ടറുടെ പേര് നൽകുക...', punjabi: 'ਡਾਕਟਰ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ...', assamese: 'ডাক্তৰৰ নাম প্ৰবিষ্ট কৰক...',
  },
  showing: {
    english: 'Showing:', hindi: 'दिखा रहा है:', bengali: 'দেখাচ্ছে:', marathi: 'दर्शवित आहे:', tamil: 'காட்டுகிறது:', telugu: 'చూపిస్తోంది:', gujarati: 'બતાવી રહ્યું છે:', kannada: 'ತೋರಿಸಲಾಗುತ್ತಿದೆ:', malayalam: 'കാണിക്കുന്നു:', punjabi: 'ਦਿਖਾ ਰਿਹਾ ਹੈ:', assamese: 'দেখুওৱা হৈছে:',
  },
  clearFilter: {
    english: 'Clear', hindi: 'साफ़ करें', bengali: 'মুছে ফেলুন', marathi: 'रद्द करा', tamil: 'அழிக்கவும்', telugu: 'క్లియర్ చేయండి', gujarati: 'સાફ કરો', kannada: 'ಅಳಿಸಿ', malayalam: 'മായ്ക്കുക', punjabi: 'ਸਾਫ਼ ਕਰੋ', assamese: 'মচি পেলাওক',
  },
  selectDoctor: {
    english: 'Select Doctor', hindi: 'डॉक्टर चुनें', bengali: 'ডাক্তar নির্বাচন করুন', marathi: 'डॉक्टर निवडा', tamil: 'மருத்துவரைத் தேர்ந்தெடுக்கவும்', telugu: 'వైద్యుడిని ఎంచుకోండి', gujarati: 'ડૉક્ટર પસંદ કરો', kannada: 'ವೈದ್ಯರನ್ನು ಆಯ್ಕೆಮಾಡಿ', malayalam: 'ഡോക്ടറെ തിരഞ്ഞെടുക്കുക', punjabi: 'ਡਾਕਟਰ ਦੀ ਚੋਣ ਕਰੋ', assamese: 'ডাক্তৰ বাছক',
  },

  // Profile Manager - Language Selection
  preferredLanguage: {
    english: 'Preferred Language',
    hindi: 'पसंदीदा भाषा',
    bengali: 'পছন্দের ভাষা',
    assamese: 'পছন্দৰ ভাষা',
  },
  languageDescription: {
    english: 'Select your preferred language for dashboard and patient data',
    hindi: 'डैशबोर्ड और रोगी डेटा के लिए अपनी पसंदीदा भाषा चुनें',
    bengali: 'ড্যাশবোর্ড এবং রোগীর ডেটার জন্য আপনার পছন্দের ভাষা নির্বাচন করুন',
    assamese: 'ডেছবৰ্ড আৰু ৰোগীৰ ডেটাৰ বাবে আপোনাৰ পছন্দৰ ভাষা বাছনি কৰক',
  },

  // Language Names
  languageEnglish: {
    english: 'English',
    hindi: 'अंग्रेज़ी',
    bengali: 'ইংরেজি',
    assamese: 'ইংৰাজী',
  },
  languageHindi: {
    english: 'Hindi',
    hindi: 'हिंदी',
    bengali: 'হিন্দি',
    assamese: 'হিন্দী',
  },
  languageBengali: {
    english: 'Bengali',
    hindi: 'बंगाली',
    bengali: 'বাংলা',
    assamese: 'বাংলা',
  },
  languageMarathi: {
    english: 'Marathi',
    hindi: 'मराठी',
    bengali: 'মারাঠি',
    assamese: 'মাৰাঠী',
  },
  languageTamil: {
    english: 'Tamil',
    hindi: 'तमिल',
    bengali: 'তামিল',
    assamese: 'তামিল',
  },
  languageTelugu: {
    english: 'Telugu',
    hindi: 'तेलुगु',
    bengali: 'তেলেগু',
    assamese: 'তেলেগু',
  },
  languageGujarati: {
    english: 'Gujarati',
    hindi: 'गुजराती',
    bengali: 'গুজরাটি',
    assamese: 'গুজৰাটী',
  },
  languageKannada: {
    english: 'Kannada',
    hindi: 'कन्नड़',
    bengali: 'কন্নড়',
    assamese: 'কন্নড়',
  },
  languageMalayalam: {
    english: 'Malayalam',
    hindi: 'मलयालम',
    bengali: 'মালয়ালম',
    assamese: 'মালায়ালম',
  },
  languagePunjabi: {
    english: 'Punjabi',
    hindi: 'पंजाबी',
    bengali: 'পাঞ্জাবি',
    assamese: 'পাঞ্জাবী',
  },

  // Common
  save: {
    english: 'Save',
    hindi: 'सहेजें',
    bengali: 'সংরক্ষণ করুন',
    assamese: 'সংৰক্ষণ কৰক',
  },
  cancel: {
    english: 'Cancel',
    hindi: 'रद्द करें',
    bengali: 'বাতিল করুন',
    assamese: 'বাতিল কৰক',
  },
  submit: {
    english: 'Submit',
    hindi: 'जमा करें',
    bengali: 'জমা দিন',
    assamese: 'জমা দিয়ক',
  },
  back: {
    english: 'Back',
    hindi: 'वापस',
    bengali: 'পিছনে',
    assamese: 'পিছলৈ',
  },
  next: {
    english: 'Next',
    hindi: 'आगे',
    bengali: 'পরবর্তী',
    assamese: 'পৰৱৰ্তী',
  },

  // Select Date Page
  chooseDate: {
    english: 'Choose Date',
    hindi: 'तारीख चुनें',
    bengali: 'তারিখ নির্বাচন করুন',
    assamese: 'তাৰিখ বাছনি কৰক',
  },
  selectDate: {
    english: 'Select Date',
    hindi: 'तारीख चुनें',
    bengali: 'তারিখ নির্বাচন করুন',
    assamese: 'তাৰিখ নিৰ্বাচন কৰক',
  },
  continueToChamberSelection: {
    english: 'Continue to Chamber Selection',
    hindi: 'चेम्बर चयन के लिए जारी रखें',
    bengali: 'চেম্বার নির্বাচনে চালিয়ে যান',
    assamese: 'চেম্বাৰ নিৰ্বাচনলৈ অব্যাহত ৰাখক',
  },
  healthTipWater: {
    english: 'Stay hydrated! Drink at least 8 glasses of water daily to keep your body functioning optimally and maintain good cardiovascular health.',
    hindi: 'हाइड्रेटेड रहें! अपने शरीर को इष्टतम रूप से काम करने और अच्छे हृदय स्वास्थ्य को बनाए रखने के लिए प्रतिदिन कम से कम 8 गिलास पानी पिएं।',
    bengali: 'হাইড্রেটেড থাকুন! আপনার শরীরকে সর্বোত্তমভাবে কাজ করতে এবং ভাল কার্ডিওভাসকুলার স্বাস্থ্য বজায় রাখতে দৈনিক কমপক্ষে 8 গ্লাস জল পান করুন।',
    assamese: 'হাইড্ৰেটেড থাকক! আপোনাৰ শৰীৰক সৰ্বোত্তমভাৱে কাম কৰিবলৈ আৰু ভাল কাৰ্ডিওভাস্কুলাৰ স্বাস্থ্য বজাই ৰাখিবলৈ প্ৰতিদিনে অন্তত 8 গ্লাচ পানী খাওক।',
  },

  // Select Chamber Page
  selectChamber: {
    english: 'Select Chamber',
    hindi: 'चेम्बर चुनें',
    bengali: 'চেম্বার নির্বাচন করুন',
  },
  choosePreferredLocation: {
    english: 'Choose your preferred consultation location',
    hindi: 'अपना पसंदीदा परामर्श स्थान चुनें',
    bengali: 'আপনার পছন্দের পরামর্শের স্থান নির্বাচন করুন',
  },
  availableChambers: {
    english: 'Available Chambers',
    hindi: 'उपलब्ध चेम्बर',
    bengali: 'উপলব্ধ চেম্বার',
  },
  mainChamber: {
    english: 'Main Chamber',
    hindi: 'मुख्य चेम्बर',
    bengali: 'প্রধান চেম্বার',
  },
  secondaryChamber: {
    english: 'Secondary Chamber',
    hindi: 'द्वितीयक चेम्बर',
    bengali: 'গৌণ চেম্বার',
  },
  continueToPatientDetails: {
    english: 'Continue to Patient Details',
    hindi: 'रोगी विवरण के लिए जारी रखें',
    bengali: 'রোগীর বিবরণে চালিয়ে যান',
  },
  yearsExperience: {
    english: 'years experience',
    hindi: 'वर्षों का अनुभव',
    bengali: 'বছরের অভিজ্ঞতা',
  },
  healthTipMedicalHistory: {
    english: 'Remember to bring your medical history and current medications list for a comprehensive consultation.',
    hindi: 'व्यापक परामर्श के लिए अपना मेडिकल इतिहास और वर्तमान दवाओं की सूची लाना याद रखें।',
    bengali: 'একটি ব্যাপক পরামর্শের জন্য আপনার চিকিৎসা ইতিহাস এবং বর্তমান ওষুধের তালিকা আনতে ভুলবেন না।',
  },

  // Days of Week
  sun: {
    english: 'Sun',
    hindi: 'रवि',
    bengali: 'রবি',
  },
  mon: {
    english: 'Mon',
    hindi: 'सोम',
    bengali: 'সোম',
  },
  tue: {
    english: 'Tue',
    hindi: 'मंगल',
    bengali: 'মঙ্গল',
  },
  wed: {
    english: 'Wed',
    hindi: 'बुध',
    bengali: 'বুধ',
  },
  thu: {
    english: 'Thu',
    hindi: 'गुरु',
    bengali: 'বৃহঃ',
  },
  fri: {
    english: 'Fri',
    hindi: 'शुक्र',
    bengali: 'শুক্র',
  },
  sat: {
    english: 'Sat',
    hindi: 'शनि',
    bengali: 'শনি',
  },

  // Patient Details Form
  patientInformation: {
    english: 'Patient Information',
    hindi: 'रोगी की जानकारी',
    bengali: 'রোগীর তথ্য',
  },
  pleaseFillPatientDetails: {
    english: 'Please fill in the patient details below',
    hindi: 'कृपया नीचे रोगी का विवरण भरें',
    bengali: 'অনুগ্রহ করে নীচে রোগীর বিবরণ পূরণ করুন',
  },
  requiredInformation: {
    english: 'Required Information',
    hindi: 'आवश्यक जानकारी',
    bengali: 'প্রয়োজনীয় তথ্য',
  },
  patientName: {
    english: 'Patient Name',
    hindi: 'रोगी का नाम',
    bengali: 'রোগীর নাম',
  },
  enterPatientFullName: {
    english: 'Enter patient full name',
    hindi: 'रोगी का पूरा नाम दर्ज करें',
    bengali: 'রোগীর সম্পূর্ণ নাম লিখুন',
  },
  whatsappNumber: {
    english: 'WhatsApp Number',
    hindi: 'व्हाट्सएप नंबर',
    bengali: 'হোয়াটসঅ্যাপ নম্বর',
  },
  optionalInformation: {
    english: 'Optional Information',
    hindi: 'वैकल्पिक जानकारी',
    bengali: 'ঐচ্ছিক তথ্য',
  },
  age: {
    english: 'Age',
    hindi: 'आयु',
    bengali: 'বয়স',
  },
  enterAge: {
    english: 'Enter age',
    hindi: 'आयु दर्ज करें',
    bengali: 'বয়স লিখুন',
  },
  enterPurposeOfVisit: {
    english: 'Enter purpose of visit',
    hindi: 'यात्रा का उद्देश्य दर्ज करें',
    bengali: 'সফরের উদ্দেশ্য লিখুন',
  },
  gender: {
    english: 'Gender',
    hindi: 'लिंग',
    bengali: 'লিঙ্গ',
  },
  selectGender: {
    english: 'Select Gender',
    hindi: 'लिंग चुनें',
    bengali: 'লিঙ্গ নির্বাচন করুন',
  },
  male: {
    english: 'Male',
    hindi: 'पुरुष',
    bengali: 'পুরুষ',
  },
  female: {
    english: 'Female',
    hindi: 'महिला',
    bengali: 'মহিলা',
  },
  other: {
    english: 'Other',
    hindi: 'अन्य',
    bengali: 'অন্যান্য',
  },
  purposeOfVisit: {
    english: 'Purpose of Visit',
    hindi: 'यात्रा का उद्देश्य',
    bengali: 'সফরের উদ্দেশ্য',
  },
  selectPurposeOfVisit: {
    english: 'Select purpose of visit',
    hindi: 'यात्रा का उद्देश्य चुनें',
    bengali: 'সফরের উদ্দেশ্য নির্বাচন করুন',
  },
  newPatientInitialConsultation: {
    english: 'New Patient - Initial Consultation',
    hindi: 'नया रोगी - प्रारंभिक परामर्श',
    bengali: 'নতুন রোগী - প্রাথমিক পরামর্শ',
  },
  existingPatientNewTreatment: {
    english: 'Existing Patient - New Treatment (First Visit)',
    hindi: 'मौजूदा रोगी - नया उपचार (प्रथम यात्रा)',
    bengali: 'বিদ্যমান রোগী - নতুন চিকিৎসা (প্রথম ভিজিট)',
  },
  reportReview: {
    english: 'Report Review (Within 5 Days of Initial Visit)',
    hindi: 'रिपोर्ट समीक्षा (प्रारंभिक यात्रा के 5 दिनों के भीतर)',
    bengali: 'রিপোর্ট পর্যালোচনা (প্রাথমিক সফরের 5 দিনের মধ্যে)',
  },
  followUpConsultation: {
    english: 'Follow-up Consultation (After 5 Days)',
    hindi: 'अनुवर्ती परामर्श (5 दिनों के बाद)',
    bengali: 'ফলো-আপ পরামর্শ (5 দিন পরে)',
  },
  routineCheckup: {
    english: 'Routine Check-up',
    hindi: 'नियमित जांच',
    bengali: 'নিয়মিত পরীক্ষা',
  },
  consentAndTerms: {
    english: 'Consent & Terms',
    hindi: 'सहमति और शर्तें',
    bengali: 'সম্মতি এবং শর্তাবলী',
  },
  acceptNotifications: {
    english: 'I accept notifications from',
    hindi: 'मैं सूचनाएं स्वीकार करता/करती हूं',
    bengali: 'আমি বিজ্ঞপ্তি গ্রহণ করি',
  },
  acceptNotificationsFull: {
    english: 'I accept notifications from www.healqr.com during this treatment procedure',
    hindi: 'मैं www.healqr.com से इस उपचार प्रक्रिया के दौरान सूचनाएं स्वीकार करता/करती हूं',
    bengali: 'আমি www.healqr.com থেকে এই চিকিৎসা পদ্ধতির সময় বিজ্ঞপ্তি গ্রহণ করি',
  },
  duringTreatment: {
    english: 'during this treatment procedure',
    hindi: 'इस उपचार प्रक्रिया के दौरान',
    bengali: 'এই চিকিৎসা পদ্ধতির সময়',
  },
  understandDigitalBooking: {
    english: 'I understand that',
    hindi: 'मैं समझता/समझती हूं कि',
    bengali: 'আমি বুঝতে পারছি যে',
  },
  understandPlatformRole: {
    english: 'I understand that www.healqr.com is only a digital booking platform and does not have any role in medical treatment and advice',
    hindi: 'मैं समझता/समझती हूं कि www.healqr.com केवल एक डिजिटल बुकिंग प्लेटफॉर्म है और इसका चिकित्सा उपचार और सलाह में कोई भूमिका नहीं है',
    bengali: 'আমি বুঝতে পারছি যে www.healqr.com শুধুমাত্র একটি ডিজিটাল বুকিং প্ল্যাটফর্ম এবং চিকিৎসা চিকিৎসা এবং পরামর্শে কোন ভূমিকা নেই',
  },
  isOnlyDigitalPlatform: {
    english: 'is only a digital booking platform and does not have any role in medical treatment and advice',
    hindi: 'केवल एक डिजिटल बुकिंग प्लेटफॉर्म है और इसका चिकित्सा उपचार और सलाह में कोई भूमिका नहीं है',
    bengali: 'শুধুমাত্র একটি ডিজিটাল বুকিং প্ল্যাটফর্ম এবং চিকিৎসা চিকিৎসা এবং পরামর্শে কোন ভূমিকা নেই',
  },

  // Booking Confirmation
  bookingConfirmed: {
    english: 'Booking Confirmed!',
    hindi: 'बुकिंग की पुष्टि हो गई!',
    bengali: 'বুকিং নিশ্চিত হয়েছে!',
  },
  confirmationMessage: {
    english: 'Your appointment has been successfully booked. You will receive a confirmation message on WhatsApp shortly.',
    hindi: 'आपकी अपॉइंटमेंट सफलतापूर्वक बुक हो गई है। आपको जल्द ही व्हाट्सएप पर एक पुष्टिकरण संदेश प्राप्त होगा।',
    bengali: 'আপনার অ্যাপয়েন্টমেন্ট সফলভাবে বুক করা হয়েছে। আপনি শীঘ্রই হোয়াটসঅ্যাপে একটি নিশ্চিতকরণ বার্তা পাবেন।',
  },
  appointmentDetails: {
    english: 'Appointment Details',
    hindi: 'अपॉइंटमेंट विवरण',
    bengali: 'অ্যাপয়েন্টমেন্ট বিবরণ',
  },
  serialNo: {
    english: 'Serial No:',
    hindi: 'क्रम संख्या:',
    bengali: 'সিরিয়াল নং:',
  },
  doctor: {
    english: 'Doctor:',
    hindi: 'डॉक्टर:',
    bengali: 'ডাক্তার:',
  },
  date: {
    english: 'Date:',
    hindi: 'तारीख:',
    bengali: 'তারিখ:',
  },
  time: {
    english: 'Time:',
    hindi: 'समय:',
    bengali: 'সময়:',
  },
  location: {
    english: 'Location:',
    hindi: 'स्थान:',
    bengali: 'স্থান:',
  },
  downloadSummary: {
    english: 'Download Summary',
    hindi: 'सारांश डाउनलोड करें',
    bengali: 'সারাংশ ডাউনলোড করুন',
  },
  backToHome: {
    english: 'Back to Home',
    hindi: 'होम पर वापस जाएं',
    bengali: 'হোমে ফিরে যান',
  },
  patientDetails: {
    english: 'Patient Details',
    hindi: 'रोगी का विवरण',
    bengali: 'রোগীর বিবরণ',
  },
  name: {
    english: 'Name',
    hindi: 'नाम',
    bengali: 'নাম',
  },
  havePreviousPrescription: {
    english: 'Have a previous prescription?',
    hindi: 'पिछला प्रिस्क्रिप्शन है?',
    bengali: 'আগের প্রেসক্রিপশন আছে?',
  },
  uploadPrescriptionHelp: {
    english: 'Upload it to help your doctor provide better care and avoid drug interactions. (Optional)',
    hindi: 'अपने डॉक्टर को बेहतर देखभाल प्रदान करने और दवा संघर्ष से बचने में मदद करने के लिए इसे अपलोड करें। (वैकल्पिक)',
    bengali: 'আপনার ডাক্তারকে ভাল যত্ন প্রদান করতে এবং ওষুধের সংঘাত এড়াতে সাহায্য করতে এটি আপলোড করুন। (ঐচ্ছিক)',
  },
  prescriptionUploadedSuccess: {
    english: 'Prescription uploaded successfully',
    hindi: 'प्रिस्क्रिप्शन सफलतापूर्वक अपलोड किया गया',
    bengali: 'প্রেসক্রিপশন সফলভাবে আপলোড করা হয়েছে',
  },
  uploadPreviousPrescription: {
    english: 'Upload Previous Prescription',
    hindi: 'पिछला प्रिस्क्रिप्शन अपलोड करें',
    bengali: 'আগের প্রেসক্রিপশন আপলোড করুন',
  },

  // ========================================
  // NOTIFICATION TEMPLATES - Full Multilingual Support
  // ========================================

  // 1. Appointment Reminder Notification
  notifReminderTitle: {
    english: 'APPOINTMENT REMINDER',
    hindi: 'अपॉइंटमेंट रिमाइंडर',
    bengali: 'অ্যাপয়েন্টমেন্ট রিমাইন্ডার',
  },
  notifReminderGreeting: {
    english: 'Hello',
    hindi: 'नमस्ते',
    bengali: 'হ্যালো',
  },
  notifReminderMessage: {
    english: 'This is a gentle reminder about your upcoming appointment with',
    hindi: 'यह आपकी आगामी अपॉइंटमेंट की एक सौम्य अनुस्मारक है',
    bengali: 'এটি আপনার আসন্ন অ্যাপয়েন্টমেন্টের একটি মৃদু অনুস্মারক',
  },
  notifReminderAt: {
    english: 'at',
    hindi: 'पर',
    bengali: 'এ',
  },
  notifAppointmentDate: {
    english: 'Appointment Date:',
    hindi: 'अपॉइंटमेंट की तारीख:',
    bengali: 'অ্যাপয়েন্টমেন্টের তারিখ:',
  },
  notifAppointmentTime: {
    english: 'Appointment Time:',
    hindi: 'अपॉइंटमेंट का समय:',
    bengali: 'অ্যাপয়েন্টমেন্টের সময়:',
  },
  notifSerialNumber: {
    english: 'Serial Number:',
    hindi: 'क्रम संख्या:',
    bengali: 'সিরিয়াল নম্বর:',
  },
  notifRememberToBring: {
    english: 'Remember to bring:',
    hindi: 'लाना याद रखें:',
    bengali: 'মনে রাখবেন আনতে:',
  },
  notifPreviousReports: {
    english: '• Previous medical reports',
    hindi: '• पिछली चिकित्सा रिपोर्ट',
    bengali: '• পূর্ববর্তী চিকিৎসা রিপোর্ট',
  },
  notifCurrentMedications: {
    english: '• Current medications list',
    hindi: '• वर्तमान दवाओं की सूची',
    bengali: '• বর্তমান ওষুধের তালিকা',
  },
  notifAnyQuestions: {
    english: '• Any questions or concerns',
    hindi: '• कोई प्रश्न या चिंताएं',
    bengali: '• কোনো প্রশ্ন বা উদ্বেগ',
  },

  // 2. Consultation Completed Notification
  notifCompletedTitle: {
    english: 'CONSULTATION COMPLETED',
    hindi: 'परामर्श पूर्ण',
    bengali: 'পরামর্শ সম্পন্ন',
  },
  notifCompletedMessage: {
    english: 'Thank you for visiting',
    hindi: 'आने के लिए धन्यवाद',
    bengali: 'দেখার জন্য ধন্যবাদ',
  },
  notifCompletedMessage2: {
    english: 'Your consultation has been successfully completed.',
    hindi: 'आपका परामर्श सफलतापूर्वक पूर्ण हो गया है।',
    bengali: 'আপনার পরামর্শ সফলভাবে সম্পন্ন হয়েছে।',
  },
  notifConsultationDate: {
    english: 'Consultation Date:',
    hindi: 'परामर्श की तारीख:',
    bengali: 'পরামর্শের তারিখ:',
  },
  notifNextSteps: {
    english: 'Next Steps:',
    hindi: 'अगले कदम:',
    bengali: 'পরবর্তী পদক্ষেপ:',
  },
  notifFollowPrescription: {
    english: '• Follow the prescribed medication',
    hindi: '• निर्धारित दवा का पालन करें',
    bengali: '• নির্ধারিত ওষুধ অনুসরণ করুন',
  },
  notifScheduleTests: {
    english: '• Schedule recommended tests',
    hindi: '• अनुशंसित परीक्षण निर्धारित करें',
    bengali: '• প্রস্তাবিত পরীক্ষা নির্ধারণ করুন',
  },
  notifBookFollowup: {
    english: '• Book follow-up if advised',
    hindi: '• यदि सलाह दी गई हो तो अनुवर्ती बुक करें',
    bengali: '• পরামর্শ দেওয়া হলে ফলো-আপ বুক করুন',
  },
  notifThankYouTrust: {
    english: 'Thank you for trusting us with your health!',
    hindi: 'अपने स्वास्थ्य के लिए हम पर विश्वास करने के लिए धन्यवाद!',
    bengali: 'আপনার স্বাস্থ্যের জন্য আমাদের বিশ্বাস করার জন্য ধন্যবাদ!',
  },

  // 3. Admin Alert Notification
  notifAdminAlertTitle: {
    english: 'URGENT ADMIN ALERT',
    hindi: 'तत्काल व्यवस्थापक चेतावनी',
    bengali: 'জরুরি অ্যাডমিন সতর্কতা',
  },
  notifAdminDear: {
    english: 'Dear',
    hindi: 'प्रिय',
    bengali: 'প্রিয়',
  },
  notifAdminAttentionRequired: {
    english: 'Immediate attention required! A critical system event needs your review.',
    hindi: 'तत्काल ध्यान देने की आवश्यकता! एक महत्वपूर्ण सिस्टम इवेंट की समीक्षा की आवश्यकता है।',
    bengali: 'তাৎক্ষণিক মনোযোগ প্রয়োজন! একটি গুরুত্বপূর্ণ সিস্টেম ইভেন্ট আপনার পর্যালোচনা প্রয়োজন।',
  },
  notifAlertDetails: {
    english: 'Alert Details:',
    hindi: 'चेतावनी विवरण:',
    bengali: 'সতর্কতার বিবরণ:',
  },
  notifEventType: {
    english: 'Event Type:',
    hindi: 'इवेंट प्रकार:',
    bengali: 'ইভেন্টের ধরন:',
  },
  notifSystemAlert: {
    english: 'System Alert',
    hindi: 'सिस्टम चेतावनी',
    bengali: 'সিস্টেম সতর্কতা',
  },
  notifTimestamp: {
    english: 'Timestamp:',
    hindi: 'समय चिह्न:',
    bengali: 'টাইমস্ট্যাম্প:',
  },
  notifSeverity: {
    english: 'Severity:',
    hindi: 'गंभीरता:',
    bengali: 'তীব্রতা:',
  },
  notifHigh: {
    english: 'High',
    hindi: 'उच्च',
    bengali: 'উচ্চ',
  },
  notifActionRequired: {
    english: 'Action Required:',
    hindi: 'आवश्यक कार्रवाई:',
    bengali: 'প্রয়োজনীয় পদক্ষেপ:',
  },
  notifReviewAndRespond: {
    english: 'Please review and respond immediately',
    hindi: 'कृपया तुरंत समीक्षा करें और जवाब दें',
    bengali: 'অনুগ্রহ করে পর্যালোচনা করুন এবং অবিলম্বে সাড়া দিন',
  },

  // 4. Appointment Slot Released Notification
  notifSlotReleasedTitle: {
    english: 'APPOINTMENT SLOT RELEASED',
    hindi: 'अपॉइंटमेंट स्लॉट जारी',
    bengali: 'অ্যাপয়েন্টমেন্ট স্লট প্রকাশিত',
  },
  notifSlotReleasedMessage: {
    english: 'Your appointment slot with',
    hindi: 'के साथ आपका अपॉइंटमेंट स्लॉट',
    bengali: 'এর সাথে আপনার অ্যাপয়েন্টমেন্ট স্লট',
  },
  notifSlotReleasedMessage2: {
    english: 'at',
    hindi: 'पर',
    bengali: 'এ',
  },
  notifSlotReleasedMessage3: {
    english: 'has been automatically released due to no-show.',
    hindi: 'उपस्थित न होने के कारण स्वचालित रूप से जारी कर दिया गया है।',
    bengali: 'উপস্থিত না হওয়ার কারণে স্वয়ংক্রিয়ভাবে প্রকাশিত হয়েছে।',
  },
  notifMissedAppointment: {
    english: 'Missed Appointment:',
    hindi: 'छूटी हुई अपॉइंटमेंट:',
    bengali: 'মিস করা অ্যাপয়েন্টমেন্ট:',
  },
  notifRebookInstructions: {
    english: 'To rebook:',
    hindi: 'पुनः बुक करने के लिए:',
    bengali: 'পুনরায় বুক করতে:',
  },
  notifScanQRCode: {
    english: 'Scan the doctor\'s unique QR code',
    hindi: 'डॉक्टर का अनोखा QR कोड स्कैन करें',
    bengali: 'ডাক্তারের অনন্য QR কোড স্ক্যান করুন',
  },
  notifSelectNewDate: {
    english: 'Select a new date and time',
    hindi: 'नई तारीख और समय चुनें',
    bengali: 'নতুন তারিখ এবং সময় নির্বাচন করুন',
  },
  notifWeApologize: {
    english: 'We understand emergencies happen. Please reschedule at your earliest convenience.',
    hindi: 'हम समझते हैं कि आपातकालीन स्थितियां उत्पन्न होती हैं। कृपया अपनी सुविधानुसार पुनर्निर्धारित करें।',
    bengali: 'আমরা বুঝি জরুরি পরিস্থিতি ঘটে। অনুগ্রহ করে আপনার সুবিধামত পুনঃনির্ধারণ করুন।',
  },

  // 5. Review Request Notification
  notifReviewTitle: {
    english: 'SHARE YOUR EXPERIENCE',
    hindi: 'अपना अनुभव साझा करें',
    bengali: 'আপনার অভিজ্ঞতা শেয়ার করুন',
  },
  notifReviewMessage: {
    english: 'We hope you had a great experience with',
    hindi: 'हम आशा करते हैं कि आपका अनुभव अच्छा रहा',
    bengali: 'আমরা আশা করি আপনার অভিজ্ঞতা ভাল ছিল',
  },
  notifReviewMessage2: {
    english: 'Your feedback helps us serve you better!',
    hindi: 'आपकी प्रतिक्रिया हमें आपको बेहतर सेवा देने में मदद करती है!',
    bengali: 'আপনার মতামত আমাদের আপনাকে আরও ভাল সেবা দিতে সাহায্য করে!',
  },
  notifReviewDate: {
    english: 'Consultation Date:',
    hindi: 'परामर्श की तारीख:',
    bengali: 'পরামর্শের তারিখ:',
  },
  notifRateExperience: {
    english: 'Rate Your Experience:',
    hindi: 'अपने अनुभव को रेट करें:',
    bengali: 'আপনার অভিজ্ঞতা রেট করুন:',
  },
  notifTapToRate: {
    english: 'Tap here to rate and review',
    hindi: 'रेट करने और समीक्षा करने के लिए यहां टैप करें',
    bengali: 'রেট এবং পর্যালোচনা করতে এখানে ট্যাপ করুন',
  },
  notifReviewTakesMinute: {
    english: 'It only takes a minute and means a lot to us!',
    hindi: 'इसमें केवल एक मिनट लगता है और हमारे लिए बहुत मायने रखता है!',
    bengali: 'এটি মাত্র একটি মিনিট সময় নেয় এবং আমাদের কাছে অনেক মানে!',
  },

  // 6. Follow-up Notification
  notifFollowUpTitle: {
    english: 'FOLLOW-UP APPOINTMENT',
    hindi: 'अनुवर्ती अपॉइंटमेंट',
    bengali: 'ফলো-আপ অ্যাপয়েন্টমেন্ট',
  },
  notifFollowUpMessage: {
    english: 'As discussed during your consultation with',
    hindi: 'के साथ आपके परामर्श के दौरान चर्चा के अनुसार',
    bengali: 'এর সাথে আপনার পরামর্শের সময় আলোচনা অনুযায়ী',
  },
  notifFollowUpMessage2: {
    english: 'please schedule your follow-up appointment.',
    hindi: 'कृपया अपनी अनुवर्ती अपॉइंटमेंट निर्धारित करें।',
    bengali: 'অনুগ্রহ করে আপনার ফলো-আপ অ্যাপয়েন্টমেন্ট নির্ধারণ করুন।',
  },
  notifDoctorMessage: {
    english: 'Doctor\'s Message:',
    hindi: 'डॉक्टर का संदेश:',
    bengali: 'ডাক্তারের বার্তা:',
  },
  notifFollowUpPeriod: {
    english: 'Follow-up Period:',
    hindi: 'अनुवर्ती अवधि:',
    bengali: 'ফলো-আপ সময়কাল:',
  },
  notifAfterDays: {
    english: 'After',
    hindi: 'के बाद',
    bengali: 'পরে',
  },
  notifDays: {
    english: 'days',
    hindi: 'दिन',
    bengali: 'দিন',
  },
  notifBooking: {
    english: 'Booking:',
    hindi: 'बुकिंग:',
    bengali: 'বুকিং:',
  },
  notifScanQRForNext: {
    english: 'Scan Dr\'s unique QR code for next appointment',
    hindi: 'अगली अपॉइंटमेंट के लिए डॉ का अनोखा QR कोड स्कैन करें',
    bengali: 'পরবর্তী অ্যাপয়েন্টমেন্টের জন্য ডাঃ এর অনন্য QR কোড স্ক্যান করুন',
  },
  notifFollowUpScheduledDate: {
    english: 'Scheduled Follow-up Date:',
    hindi: 'निर्धारित अनुवर्ती तिथि:',
    bengali: 'নির্ধারিত ফলো-আপ তারিখ:',
  },
  notifFollowUpAdvance: {
    english: '⏰ This is an advance reminder (sent 3 days before your scheduled date)',
    hindi: '⏰ यह एक अग्रिम अनुस्मारक है (आपकी निर्धारित तिथि से 3 दिन पहले भेजा गया)',
    bengali: '⏰ এটি একটি অগ্রিম অনুস্মারক (আপনার নির্ধারিত তারিখের 3 দিন আগে পাঠানো হয়েছে)',
  },
  notifFollowUpBookingWindow: {
    english: '📅 Please book your appointment within ±2 days of the scheduled date',
    hindi: '📅 कृपया निर्धारित तिथि के ±2 दिनों के भीतर अपनी अपॉइंटमेंट बुक करें',
    bengali: '📅 অনুগ্রহ করে নির্ধারিত তারিখের ±2 দিনের মধ্যে আপনার অ্যাপয়েন্টমেন্ট বুক করুন',
  },

  // 7. Cancellation Notification (Already exists but adding missing keys)
  notifCancellationTitle: {
    english: 'APPOINTMENT CANCELLED',
    hindi: 'अपॉइंटमेंट रद्द',
    bengali: 'অ্যাপয়েন্টমেন্ট বাতিল',
  },
  notifCancelledDate: {
    english: 'Cancelled Date:',
    hindi: 'रद्द तिथि:',
    bengali: 'বাতিল তারিখ:',
  },
  notifReason: {
    english: 'Reason:',
    hindi: 'कारण:',
    bengali: 'কারণ:',
  },
  notifRescheduling: {
    english: 'Rescheduling:',
    hindi: 'पुनर्निर्धारण:',
    bengali: 'পুনঃনির্ধারণ:',
  },

  // 8. Restoration Notification (Already exists but adding missing keys)
  notifRestorationTitle: {
    english: 'APPOINTMENT RESTORED',
    hindi: 'अपॉइंटमेंट बहाल',
    bengali: 'অ্যাপয়েন্টমেন্ট পুনরুদ্ধার',
  },
  notifGoodNews: {
    english: 'Good News',
    hindi: 'अच्छी खबर',
    bengali: 'সুসংবাদ',
  },
  notifRestoredMessage: {
    english: 'Your cancelled appointment has been restored!',
    hindi: 'आपकी रद्द की गई अपॉइंटमेंट बहाल कर दी गई है!',
    bengali: 'আপনার বাতিল করা অ্যাপয়েন্টমেন্ট পুনরুদ্ধার করা হয়েছে!',
  },
  notifRestoredDate: {
    english: 'Restored Date:',
    hindi: 'बहाल तिथि:',
    bengali: 'পুনরুদ্ধার তারিখ:',
  },
  notifUpdatedDetails: {
    english: 'Updated Appointment Details:',
    hindi: 'अद्यतन अपॉइंटमेंट विवरण:',
    bengali: 'আপডেট করা অ্যাপয়েন্টমেন্ট বিবরণ:',
  },
  notifChamber: {
    english: 'Chamber:',
    hindi: 'चेम्बर:',
    bengali: 'চেম্বার:',
  },
  notifSchedule: {
    english: 'Schedule:',
    hindi: 'कार्यक्रम:',
    bengali: 'সময়সূচী:',
  },
};

// Translation helper function
export function t(key: keyof typeof translations, language: Language): string {
  const translationsForKey = translations[key] as Record<string, string>;
  return translationsForKey?.[language] || translationsForKey?.['english'] || key;
}

// Language display names in their native scripts
export const languageDisplayNames = {
  english: 'English',
  hindi: 'हिंदी',
  bengali: 'বাংলা',
  marathi: 'मराठी',
  tamil: 'தமிழ்',
  telugu: 'తెలుగు',
  gujarati: 'ગુજરાતી',
  kannada: 'ಕನ್ನಡ',
  malayalam: 'മലയാളം',
  punjabi: 'ਪੰਜਾਬੀ',
  assamese: 'অসমীয়া',
};

// Language codes for flags/icons
export const languageCodes = {
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

  // Otherwise return as-is (same script as target)
  return name;
}

// Helper function to translate patient data values from patient's language to doctor's language
export function translateDataValue(value: string, targetLanguage: Language): string {
  // If the value exists in our translation map, translate it
  if (dataValueTranslations[value as keyof typeof dataValueTranslations]) {
    return (dataValueTranslations[value as keyof typeof dataValueTranslations] as any)[targetLanguage] || value;
  }
  // Otherwise return the original value (patient name, etc.)
  return value;
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
