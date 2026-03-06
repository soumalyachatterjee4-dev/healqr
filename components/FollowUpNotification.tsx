import { CalendarCheck } from 'lucide-react';
import TemplateDisplay from './TemplateDisplay';
import { useAITranslation } from '../hooks/useAITranslation';
import type { Language } from '../utils/translations';

interface FollowUpNotificationProps {
  language?: Language;
  patientName?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorInitials?: string;
  doctorMessage?: string;
  followUpDays?: number;
  followUpDate?: string;
}

export default function FollowUpNotification({
  language = 'english',
  patientName = 'Rahul Kumar',
  doctorName = 'Dr. Anika Sharma',
  doctorSpecialty = 'Cardiologist',
  doctorInitials = 'AS',
  doctorMessage = 'Please come for follow-up after 7 days to check your progress and adjust medication if needed.',
  followUpDays = 7,
  followUpDate = 'December 11, 2025',
}: FollowUpNotificationProps) {
  const { bt } = useAITranslation(language);

  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-full max-w-sm">
        <div className="bg-gray-900 rounded-3xl p-4 shadow-2xl border-8 border-gray-800">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <CalendarCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-gray-900 uppercase tracking-wide text-sm">
                    {bt('FOLLOW-UP APPOINTMENT')}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white">{doctorInitials}</span>
                </div>
                <div>
                  <h3 className="text-gray-900">{doctorName}</h3>
                  <p className="text-gray-500 text-sm">{doctorSpecialty}</p>
                </div>
              </div>
              <p className="text-gray-900 mb-4">
                {bt(`Hello ${patientName}, 👋`)}
              </p>
              <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                {bt(`As discussed during your consultation with ${doctorName}, please schedule your follow-up appointment.`)}
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-3 mb-4">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-blue-600 text-sm">💌</span>
                  <p className="text-gray-700 text-sm">{bt("Doctor's Message:")}</p>
                </div>
                <p className="text-gray-600 text-sm italic pl-6">
                  "{doctorMessage}"
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                <div>
                  <span className="text-gray-900 font-semibold">{bt('Scheduled Follow-up Date:')}</span>{' '}
                  <span className="text-blue-600 font-medium">{followUpDate}</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-gray-700 text-sm">
                    {bt('⏰ This is an advance reminder (sent 3 days before your scheduled date)')}
                  </p>
                  <p className="text-gray-900 text-sm font-medium mt-1">
                    {bt('📅 Please book your appointment within ±2 days of the scheduled date')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-900">{bt('Booking:')}</span>{' '}
                  <span className="text-gray-600">{bt("Scan Dr's unique QR code for next appointment")}</span>
                </div>
              </div>
              <TemplateDisplay placement="notif-follow-up" className="mb-4" />
              <p className="text-gray-400 text-xs text-center">HealQR.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}