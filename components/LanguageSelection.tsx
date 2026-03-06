import { Button } from './ui/button';
import { Check, ArrowRight, Sparkles, MessageSquare, Bell, FileText, Globe } from 'lucide-react';
import { useState } from 'react';
import { t, type Language, languageDisplayNames, languageCodes } from '../utils/translations';
import TemplateDisplay from './TemplateDisplay';
import BookingFlowLayout from './BookingFlowLayout';

interface LanguageSelectionProps {
  onContinue: (language: Language) => void;
  onBack?: () => void;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorPhoto?: string;
  doctorDegrees?: string[];
  useDrPrefix?: boolean;
  themeColor?: 'emerald' | 'blue';
}

export default function LanguageSelection({ onContinue, onBack, doctorName = '', doctorSpecialty = '', doctorPhoto = '', doctorDegrees = [], useDrPrefix = true, themeColor = 'emerald' }: LanguageSelectionProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('english');

  // Theme-aware color variables
  const iconGradient = themeColor === 'blue' ? 'from-blue-400 to-blue-600' : 'from-emerald-400 to-emerald-600';
  const selectedBorder = themeColor === 'blue' ? 'border-blue-500' : 'border-emerald-500';
  const selectedBg = themeColor === 'blue' ? 'bg-blue-500/10' : 'bg-emerald-500/10';
  const selectedIconBg = themeColor === 'blue' ? 'bg-blue-500/20' : 'bg-emerald-500/20';
  const selectedIconText = themeColor === 'blue' ? 'text-blue-400' : 'text-emerald-400';
  const benefitIconColor = themeColor === 'blue' ? 'text-blue-400' : 'text-emerald-400';
  const buttonGradient = themeColor === 'blue'
    ? 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
    : 'from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700';

  console.log('🔍 LanguageSelection Props:', { doctorName, doctorSpecialty, doctorPhoto, doctorDegrees });

  const coreIndianLanguages: Array<{ id: Language; code: string; name: string; subtitle: string }> = [
    {
      id: 'english' as Language,
      code: languageCodes.english,
      name: languageDisplayNames.english,
      subtitle: t('defaultLanguage', selectedLanguage),
    },
    {
      id: 'bengali' as Language,
      code: languageCodes.bengali,
      name: languageDisplayNames.bengali,
      subtitle: t('languageBengali', selectedLanguage),
    },
    {
      id: 'hindi' as Language,
      code: languageCodes.hindi,
      name: languageDisplayNames.hindi,
      subtitle: t('languageHindi', selectedLanguage),
    },
    {
      id: 'marathi' as Language,
      code: languageCodes.marathi,
      name: languageDisplayNames.marathi,
      subtitle: t('languageMarathi', selectedLanguage),
    },
    {
      id: 'tamil' as Language,
      code: languageCodes.tamil,
      name: languageDisplayNames.tamil,
      subtitle: t('languageTamil', selectedLanguage),
    },
    {
      id: 'telugu' as Language,
      code: languageCodes.telugu,
      name: languageDisplayNames.telugu,
      subtitle: t('languageTelugu', selectedLanguage),
    },
    {
      id: 'gujarati' as Language,
      code: languageCodes.gujarati,
      name: languageDisplayNames.gujarati,
      subtitle: t('languageGujarati', selectedLanguage),
    },
    {
      id: 'kannada' as Language,
      code: languageCodes.kannada,
      name: languageDisplayNames.kannada,
      subtitle: t('languageKannada', selectedLanguage),
    },
    {
      id: 'malayalam' as Language,
      code: languageCodes.malayalam,
      name: languageDisplayNames.malayalam,
      subtitle: t('languageMalayalam', selectedLanguage),
    },
    {
      id: 'punjabi' as Language,
      code: languageCodes.punjabi,
      name: languageDisplayNames.punjabi,
      subtitle: t('languagePunjabi', selectedLanguage),
    },
    {
      id: 'assamese' as Language,
      code: languageCodes.assamese,
      name: languageDisplayNames.assamese,
      subtitle: t('languageAssamese', selectedLanguage),
    },
  ];

  const moreIndianLanguages: Array<{ id: Language; code: string; name: string; subtitle: string }> = [
    { id: 'odia', code: languageCodes.odia, name: languageDisplayNames.odia, subtitle: 'Odia' },
    { id: 'urdu', code: languageCodes.urdu, name: languageDisplayNames.urdu, subtitle: 'Urdu' },
    { id: 'nepali', code: languageCodes.nepali, name: languageDisplayNames.nepali, subtitle: 'Nepali' },
    { id: 'konkani', code: languageCodes.konkani, name: languageDisplayNames.konkani, subtitle: 'Konkani' },
    { id: 'maithili', code: languageCodes.maithili, name: languageDisplayNames.maithili, subtitle: 'Maithili' },
    { id: 'dogri', code: languageCodes.dogri, name: languageDisplayNames.dogri, subtitle: 'Dogri' },
    { id: 'sindhi', code: languageCodes.sindhi, name: languageDisplayNames.sindhi, subtitle: 'Sindhi' },
    { id: 'bodo', code: languageCodes.bodo, name: languageDisplayNames.bodo, subtitle: 'Bodo' },
    { id: 'santali', code: languageCodes.santali, name: languageDisplayNames.santali, subtitle: 'Santali' },
    { id: 'kashmiri', code: languageCodes.kashmiri, name: languageDisplayNames.kashmiri, subtitle: 'Kashmiri' },
    { id: 'manipuri', code: languageCodes.manipuri, name: languageDisplayNames.manipuri, subtitle: 'Manipuri' },
  ];

  const internationalLanguages: Array<{ id: Language; code: string; name: string; subtitle: string }> = [
    { id: 'arabic', code: languageCodes.arabic, name: languageDisplayNames.arabic, subtitle: 'Arabic' },
    { id: 'french', code: languageCodes.french, name: languageDisplayNames.french, subtitle: 'French' },
    { id: 'spanish', code: languageCodes.spanish, name: languageDisplayNames.spanish, subtitle: 'Spanish' },
    { id: 'portuguese', code: languageCodes.portuguese, name: languageDisplayNames.portuguese, subtitle: 'Portuguese' },
    { id: 'russian', code: languageCodes.russian, name: languageDisplayNames.russian, subtitle: 'Russian' },
    { id: 'chinese', code: languageCodes.chinese, name: languageDisplayNames.chinese, subtitle: 'Chinese' },
    { id: 'japanese', code: languageCodes.japanese, name: languageDisplayNames.japanese, subtitle: 'Japanese' },
    { id: 'korean', code: languageCodes.korean, name: languageDisplayNames.korean, subtitle: 'Korean' },
    { id: 'german', code: languageCodes.german, name: languageDisplayNames.german, subtitle: 'German' },
  ];

  const [showMore, setShowMore] = useState(false);

  return (
    <BookingFlowLayout
      onBack={onBack}
      doctorName={doctorName}
      doctorPhoto={doctorPhoto}
      doctorDegrees={doctorDegrees}
      doctorSpecialty={doctorSpecialty}
      useDrPrefix={useDrPrefix}
      themeColor={themeColor}
    >
      <div className="bg-[#1a1f2e] rounded-3xl shadow-2xl p-6 sm:p-8">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 bg-gradient-to-br ${iconGradient} rounded-2xl flex items-center justify-center shadow-lg`}>
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-white text-center mb-3">{t('chooseLanguage', selectedLanguage)}</h1>
        <p className="text-gray-400 text-center mb-8">
          {t('languageSubtitle', selectedLanguage)}
        </p>

        {/* Language Options */}
        <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {coreIndianLanguages.map((language) => (
            <button
              key={language.id}
              onClick={() => setSelectedLanguage(language.id)}
              className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                selectedLanguage === language.id
                  ? `${selectedBorder} ${selectedBg}`
                  : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedLanguage === language.id ? `${selectedIconBg} ${selectedIconText}` : 'bg-gray-800 text-gray-400'
              }`}>
                <span className="font-semibold">{language.code}</span>
              </div>
              <div className="flex-1 text-left">
                <div className="text-white">{language.name}</div>
                <div className="text-sm text-gray-400">{language.subtitle}</div>
              </div>
            </button>
          ))}

          {/* More Languages Toggle */}
          {!showMore && (
            <button
              onClick={() => setShowMore(true)}
              className="w-full p-3 rounded-2xl border-2 border-dashed border-gray-600 hover:border-gray-500 transition-all flex items-center justify-center gap-2 text-gray-400 hover:text-gray-300"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">+20 More Languages (AI Translated)</span>
            </button>
          )}

          {showMore && (
            <>
              {/* More Indian Languages */}
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 pt-2">More Indian Languages</div>
              {moreIndianLanguages.map((language) => (
                <button
                  key={language.id}
                  onClick={() => setSelectedLanguage(language.id)}
                  className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                    selectedLanguage === language.id
                      ? `${selectedBorder} ${selectedBg}`
                      : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedLanguage === language.id ? `${selectedIconBg} ${selectedIconText}` : 'bg-gray-800 text-gray-400'
                  }`}>
                    <span className="font-semibold text-xs">{language.code}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-white">{language.name}</div>
                    <div className="text-sm text-gray-400">{language.subtitle}</div>
                  </div>
                </button>
              ))}

              {/* International Languages */}
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 pt-2">International Languages</div>
              {internationalLanguages.map((language) => (
                <button
                  key={language.id}
                  onClick={() => setSelectedLanguage(language.id)}
                  className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                    selectedLanguage === language.id
                      ? `${selectedBorder} ${selectedBg}`
                      : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedLanguage === language.id ? `${selectedIconBg} ${selectedIconText}` : 'bg-gray-800 text-gray-400'
                  }`}>
                    <span className="font-semibold text-xs">{language.code}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-white">{language.name}</div>
                    <div className="text-sm text-gray-400">{language.subtitle}</div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Language Benefits Section */}
        <div className="mb-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            {t('yourLanguageBenefits', selectedLanguage)}
          </h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <MessageSquare className={`w-4 h-4 ${benefitIconColor} mt-0.5 flex-shrink-0`} />
              <span>{t('benefitMessages', selectedLanguage)}</span>
            </li>
            <li className="flex items-start gap-2">
              <Bell className={`w-4 h-4 ${benefitIconColor} mt-0.5 flex-shrink-0`} />
              <span>{t('benefitNotifications', selectedLanguage)}</span>
            </li>
            <li className="flex items-start gap-2">
              <FileText className={`w-4 h-4 ${benefitIconColor} mt-0.5 flex-shrink-0`} />
              <span>{t('benefitConfirmations', selectedLanguage)}</span>
            </li>
          </ul>
        </div>

        {/* Health Tip Template - Above CTA */}
        <TemplateDisplay placement="booking-language" className="mb-6" />

        {/* Continue Button */}
        <Button
          onClick={() => onContinue(selectedLanguage)}
          className={`w-full h-14 bg-gradient-to-r ${buttonGradient} text-white rounded-2xl flex items-center justify-center gap-2 shadow-lg`}
        >
          <span>{t('continue', selectedLanguage)}</span>
          <ArrowRight className="w-5 h-5" />
        </Button>

      </div>
    </BookingFlowLayout>
  );
}
