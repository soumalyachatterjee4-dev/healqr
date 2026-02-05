import { CalendarCheck } from 'lucide-react';
import { translations, getLanguageFromCode, type LanguageCode } from '../utils/translations';
import TemplateDisplay from './TemplateDisplay';

interface FollowUpNotificationProps {
  language?: LanguageCode;
  patientName?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorInitials?: string;
  doctorMessage?: string;
  followUpDays?: number;
  followUpDate?: string;
}

export default function FollowUpNotification({
  language = 'en',
  patientName = 'Rahul Kumar',
  doctorName = 'Dr. Anika Sharma',
  doctorSpecialty = 'Cardiologist',
  doctorInitials = 'AS',
  doctorMessage = 'Please come for follow-up after 7 days to check your progress and adjust medication if needed.',
  followUpDays = 7,
  followUpDate = 'December 11, 2025',
}: FollowUpNotificationProps) {
  const lang = getLanguageFromCode(language);
  
  return (
    <div className="flex items-center justify-center py-8">
      {/* Phone Mockup */}
      <div className="w-full max-w-sm">
        {/* Phone Frame */}
        <div className="bg-gray-900 rounded-3xl p-4 shadow-2xl border-8 border-gray-800">
          {/* Notification Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Content */}
            <div className="px-6 pt-6 pb-4">
              {/* Header with Icon */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <CalendarCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-gray-900 uppercase tracking-wide text-sm">
                    {translations.notifFollowUpTitle[lang]}
                  </h3>
                </div>
              </div>

              {/* Doctor Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white">{doctorInitials}</span>
                </div>
                <div>
                  <h3 className="text-gray-900">{doctorName}</h3>
                  <p className="text-gray-500 text-sm">{doctorSpecialty}</p>
                </div>
              </div>

              {/* Greeting */}
              <p className="text-gray-900 mb-4">
                {translations.notifReminderGreeting[lang]} {patientName}, 👋
              </p>

              {/* Message Body */}
              <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                {translations.notifFollowUpMessage[lang]} {doctorName}, {translations.notifFollowUpMessage2[lang]}
              </p>

              {/* Doctor's Message Box */}
              <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-3 mb-4">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-blue-600 text-sm">💌</span>
                  <p className="text-gray-700 text-sm">{translations.notifDoctorMessage[lang]}</p>
                </div>
                <p className="text-gray-600 text-sm italic pl-6">
                  "{doctorMessage}"
                </p>
              </div>

              {/* Follow-up Period */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                <div>
                  <span className="text-gray-900 font-semibold">{translations.notifFollowUpScheduledDate[lang]}</span>{' '}
                  <span className="text-blue-600 font-medium">{followUpDate}</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-gray-700 text-sm">
                    {translations.notifFollowUpAdvance[lang]}
                  </p>
                  <p className="text-gray-900 text-sm font-medium mt-1">
                    {translations.notifFollowUpBookingWindow[lang]}
                  </p>
                </div>
                <div>
                  <span className="text-gray-900">{translations.notifBooking[lang]}</span>{' '}
                  <span className="text-gray-600">{translations.notifScanQRForNext[lang]}</span>
                </div>
              </div>

              {/* Health Tip Section */}
              <TemplateDisplay placement="notif-follow-up" className="mb-4" />

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