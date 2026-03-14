import React, { useState } from 'react';
import { Languages, Check } from 'lucide-react';
import type { Language } from '../utils/translations';

interface PatientLanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

const PatientLanguageSelector: React.FC<PatientLanguageSelectorProps> = ({
  currentLanguage,
  onLanguageChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const languages: { code: Language; name: string; nativeName: string; flag: string }[] = [
    { code: 'english', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'hindi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
    { code: 'bengali', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
    { code: 'marathi', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
    { code: 'tamil', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
    { code: 'telugu', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
    { code: 'gujarati', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
    { code: 'kannada', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'malayalam', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
    { code: 'punjabi', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
    { code: 'assamese', name: 'Assamese', nativeName: 'অসমীয়া', flag: '🇮🇳' },
  ];

  const currentLangData = languages.find(l => l.code === currentLanguage) || languages[0];

  const handleLanguageSelect = (language: Language) => {
    onLanguageChange(language);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Language Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-orange-500/30 transition-colors text-white"
        title="Change Language"
      >
        <Languages className="w-5 h-5 text-orange-500" />
        <span className="hidden sm:inline text-sm font-medium">{currentLangData.nativeName}</span>
        <span className="text-lg">{currentLangData.flag}</span>
      </button>

      {/* Language Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
            <div className="p-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Languages className="w-4 h-4 text-orange-500" />
                Choose Your Language
              </h3>
              <p className="text-xs text-gray-400 mt-1">Select your preferred language</p>
            </div>

            <div className="p-2 space-y-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                    currentLanguage === lang.code
                      ? 'bg-orange-500/20 border border-orange-500/50'
                      : 'hover:bg-gray-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{lang.flag}</span>
                    <div className="text-left">
                      <p className="text-white font-medium text-sm">{lang.nativeName}</p>
                      <p className="text-gray-400 text-xs">{lang.name}</p>
                    </div>
                  </div>
                  {currentLanguage === lang.code && (
                    <Check className="w-5 h-5 text-orange-500" />
                  )}
                </button>
              ))}
            </div>

            {/* Visual Aid for Illiterate Users */}
            <div className="p-3 border-t border-gray-700 bg-gray-900/50">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                  <div className="w-3 h-3 rounded-full bg-orange-300"></div>
                </div>
                <span>Tap your language above</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PatientLanguageSelector;

