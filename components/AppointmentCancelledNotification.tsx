import { Calendar } from 'lucide-react';
import TemplateDisplay from './TemplateDisplay';
import { useAITranslation } from '../hooks/useAITranslation';
import type { Language } from '../utils/translations';

interface AppointmentCancelledNotificationProps {
  bookingId?: string;
  language?: Language;
  patientName?: string;
  doctorName?: string;
  specialization?: string;
  clinicName?: string;
  cancelledDate?: string;
  cancellationTime?: string;
  cancellationReason?: string;
}

export default function AppointmentCancelledNotification({
  bookingId,
  language = 'english',
  patientName = 'Rahul Kumar',
  doctorName = 'Dr. Anika Sharma',
  specialization = 'Cardiologist',
  clinicName = 'Health Care Clinic',
  cancelledDate = 'October 10, 2025',
  cancellationTime = '10:00 AM',
  cancellationReason = 'Unavoidable circumstances',
}: AppointmentCancelledNotificationProps) {

  const { bt } = useAITranslation(language);

  return (
    <div className="flex items-center justify-center py-8">
      {/* Phone Mockup with Black Border */}
      <div className="w-full max-w-sm">
        {/* Phone Frame */}
        <div className="bg-gray-900 rounded-3xl p-4 shadow-2xl border-8 border-gray-800">
          {/* Notification Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header - Green Calendar Icon */}
            <div className="bg-white px-6 pt-6 pb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-gray-900 leading-tight">{bt('APPOINTMENT CANCELLED')}</h2>
                </div>
              </div>
            </div>

      {/* Doctor Info */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white">AS</span>
          </div>
          <div>
            <h3 className="text-gray-900">{doctorName}</h3>
            <p className="text-gray-500 text-sm">{specialization}</p>
          </div>
        </div>
      </div>

      {/* Greeting */}
      <div className="px-6 pb-3">
        <p className="text-gray-700">
          {bt(`Hello ${patientName},`)} <span className="inline-block">👋</span>
        </p>
      </div>

      {/* Main Message */}
      <div className="px-6 pb-4">
        <p className="text-gray-600 text-sm leading-relaxed">
          {bt(`Due to unavoidable circumstances, your appointment at ${clinicName} scheduled for ${cancelledDate} has been cancelled.`)}
        </p>
      </div>

      {/* Details Section */}
      <div className="px-6 pb-4 bg-gray-50 mx-6 rounded-lg p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-700">{bt('Chamber:')}</span>
            <span className="text-gray-900 font-medium">{clinicName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">{bt('Cancelled Date:')}</span>
            <span className="text-gray-900 font-medium">{cancelledDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">{bt('Time:')}</span>
            <span className="text-gray-900 font-medium">{cancellationTime}</span>
          </div>
          <div className="pt-2 border-t">
            <span className="text-gray-700">{bt('Reason:')}</span>{' '}
            <span className="text-gray-900 font-medium">{cancellationReason}</span>
          </div>
          <div className="pt-2 border-t">
            <span className="text-gray-700">{bt('Rescheduling:')}</span>{' '}
            <span className="text-gray-900">{bt("Scan Dr's unique QR code for new appointment")}</span>
          </div>
        </div>
      </div>

      {/* Health Tip Section */}
      <div className="px-6 py-4">
        <TemplateDisplay placement="notif-appointment-cancelled" className="mb-0" />
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 text-center">
        <p className="text-gray-400 text-xs">HealQR.com</p>
      </div>
          </div>
        </div>
      </div>
    </div>
  );
}