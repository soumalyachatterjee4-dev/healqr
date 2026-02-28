import { CheckCircle, Download } from 'lucide-react';
import { translations, getLanguageFromCode, type LanguageCode } from '../utils/translations';
import TemplateDisplay from './TemplateDisplay';

interface ConsultationCompletedNotificationProps {
  bookingId?: string;
  language?: LanguageCode;
  patientName?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorInitials?: string;
  doctorPhoto?: string;
  clinicName?: string;
  consultationDate?: string;
  consultationTime?: string;
  rxUrl?: string; // New prop for prescription link
}

export default function ConsultationCompletedNotification({
  language = 'en',
  patientName = 'Rahul Kumar',
  doctorName = 'Dr. Anika Sharma',
  doctorSpecialty = 'Cardiologist',
  doctorInitials = 'AS',
  doctorPhoto = '',
  clinicName = 'Health Care Clinic',
  consultationDate = 'October 10, 2025',
  consultationTime = '09:30 AM',
  rxUrl,
}: ConsultationCompletedNotificationProps) {
  const lang = getLanguageFromCode(language) as any;

  return (
    <div className="flex items-center justify-center py-8">
      {/* Phone Mockup */}
      <div className="w-full max-w-sm">
        {/* Phone Frame */}
        <div className="bg-gray-900 rounded-3xl p-4 shadow-2xl border-8 border-gray-800">
          {/* Notification Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-gray-900 uppercase tracking-wide text-sm">
                    {translations.notifCompletedTitle[lang]}
                  </h2>
                </div>
              </div>

              {/* Doctor Info */}
              <div className="flex items-center gap-3 mb-4">
                {doctorPhoto ? (
                  <img
                    src={doctorPhoto}
                    alt={doctorName}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-semibold">{doctorInitials}</span>
                  </div>
                )}
                <div>
                  <h3 className="text-gray-900 font-medium">{doctorName}</h3>
                  <p className="text-gray-500 text-sm">{doctorSpecialty}</p>
                </div>
              </div>

              {/* Greeting */}
              <p className="text-gray-900 mb-4">
                {translations.notifReminderGreeting[lang]} {patientName}, 👋
              </p>

              {/* Message Body */}
              <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                {translations.notifCompletedMessage[lang]} {clinicName}. {translations.notifCompletedMessage2[lang]}
              </p>

              {/* Consultation Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                {consultationDate && (
                  <div>
                    <span className="text-gray-900">{translations.notifConsultationDate[lang]}</span>{' '}
                    <span className="text-gray-600">{consultationDate}</span>
                  </div>
                )}
                {consultationTime && (
                  <div>
                    <span className="text-gray-900">{translations.time[lang]}</span>{' '}
                    <span className="text-gray-600">{consultationTime}</span>
                  </div>
                )}
              </div>

              {/* Next Steps */}
              <div className="mb-4">
                <p className="text-gray-900 text-sm mb-2">{translations.notifNextSteps[lang]}</p>
                <div className="text-gray-600 text-sm space-y-1 ml-2">
                  <p>{translations.notifFollowPrescription[lang]}</p>
                  <p>{translations.notifScheduleTests[lang]}</p>
                  <p>{translations.notifBookFollowup[lang]}</p>
                </div>
              </div>

              {/* Thank You Message */}
              <p className="text-gray-700 text-sm mb-4 text-center">
                {translations.notifThankYouTrust[lang]}
              </p>

              {/* Health Tip Section */}
              <TemplateDisplay placement="notif-consultation-completed" className="mb-4" />

              {/* 📄 DOWNLOAD PRESCRIPTION BUTTON */}
              {rxUrl && (
                <div className="mb-6 px-2">
                  <a
                    href={rxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
                  >
                    <Download className="w-5 h-5" />
                    {translations.downloadPrescription?.[lang] || 'Download Digital Prescription'}
                  </a>
                  <p className="text-[10px] text-gray-400 text-center mt-2 italic">
                    {translations.rxSecureLink?.[lang] || 'Securely generated digital prescription'}
                  </p>
                </div>
              )}

              {/* Footer */}
              <p className="text-gray-400 text-xs text-center">
                {translations.poweredBy[lang]}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
