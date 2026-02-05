import { Bell } from 'lucide-react';
import { translations, getLanguageFromCode, type LanguageCode } from '../utils/translations';
import TemplateDisplay from './TemplateDisplay';

interface AppointmentReminderNotificationProps {
  language?: LanguageCode;
  patientName?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorInitials?: string;
  clinicName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  location?: string;
  serialNumber?: string;
}

export default function AppointmentReminderNotification({
  language = 'en',
  patientName = 'Rahul Kumar',
  doctorName = 'Dr. Anika Sharma',
  doctorSpecialty = 'Cardiologist',
  doctorInitials = 'AS',
  clinicName = 'Health Care Clinic',
  appointmentDate = 'Today, October 10, 2025',
  appointmentTime = '09:30 AM',
  location = '123 Medical Plaza, Downtown',
  serialNumber = '#7',
}: AppointmentReminderNotificationProps) {
  const lang = getLanguageFromCode(language);
  
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
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-gray-900 uppercase tracking-wide text-sm">
                    {translations.notifReminderTitle[lang]}
                  </h2>
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
                {translations.notifReminderMessage[lang]} {doctorName} {translations.notifReminderAt[lang]} {clinicName}.
              </p>

              {/* Appointment Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                <div>
                  <span className="text-gray-900">{translations.notifAppointmentDate[lang]}</span>{' '}
                  <span className="text-gray-600">{appointmentDate}</span>
                </div>
                <div>
                  <span className="text-gray-900">{translations.notifAppointmentTime[lang]}</span>{' '}
                  <span className="text-gray-600">{appointmentTime}</span>
                </div>
                <div>
                  <span className="text-gray-900">{translations.location[lang]}</span>{' '}
                  <span className="text-gray-600">{location}</span>
                </div>
                <div>
                  <span className="text-gray-900">{translations.notifSerialNumber[lang]}</span>{' '}
                  <span className="text-gray-600">{serialNumber}</span>
                </div>
              </div>

              {/* Remember to Bring */}
              <div className="mb-4">
                <p className="text-gray-900 text-sm mb-2">{translations.notifRememberToBring[lang]}</p>
                <div className="text-gray-600 text-sm space-y-1 ml-2">
                  <p>{translations.notifPreviousReports[lang]}</p>
                  <p>{translations.notifCurrentMedications[lang]}</p>
                  <p>{translations.notifAnyQuestions[lang]}</p>
                </div>
              </div>

              {/* Health Tip Section */}
              <TemplateDisplay placement="notif-appointment-reminder" className="mb-4" />

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