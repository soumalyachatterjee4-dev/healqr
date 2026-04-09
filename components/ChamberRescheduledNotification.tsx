import { Clock } from 'lucide-react';
import TemplateDisplay from './TemplateDisplay';
import type { Language } from '../utils/translations';

interface ChamberRescheduledNotificationProps {
  language?: Language;
  patientName?: string;
  doctorName?: string;
  specialization?: string;
  chamberName?: string;
  date?: string;
  originalTime?: string;
  newTime?: string;
}

export default function ChamberRescheduledNotification({
  language = 'english',
  patientName = 'Patient',
  doctorName = 'Doctor',
  specialization = 'General Physician',
  chamberName = 'Chamber',
  date = '',
  originalTime = '',
  newTime = '',
}: ChamberRescheduledNotificationProps) {
  // Get doctor initials
  const initials = doctorName
    .replace(/^Dr\.?\s*/i, '')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center justify-center py-8">
      {/* Phone Mockup with Black Border */}
      <div className="w-full max-w-sm">
        {/* Phone Frame */}
        <div className="bg-gray-900 rounded-3xl p-4 shadow-2xl border-8 border-gray-800">
          {/* Notification Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header - Orange Clock Icon */}
            <div className="bg-white px-6 pt-6 pb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-gray-900 leading-tight">SCHEDULE{'\n'}CHANGED</h2>
                </div>
              </div>
            </div>

            {/* Doctor Info */}
            <div className="px-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-medium">{initials}</span>
                </div>
                <div>
                  <h3 className="text-gray-900 font-medium">{doctorName}</h3>
                  <p className="text-gray-500 text-sm">{specialization}</p>
                </div>
              </div>
            </div>

            {/* Greeting */}
            <div className="px-6 pb-3">
              <p className="text-gray-700">
                {`Hello ${patientName},`} <span className="inline-block">👋</span>
              </p>
            </div>

            {/* Main Message */}
            <div className="px-6 pb-4">
              <p className="text-gray-600 text-sm leading-relaxed">
                {`Your appointment at ${chamberName} scheduled for ${date} has been rescheduled to a new time.`}
              </p>
            </div>

            {/* Details Section */}
            <div className="mx-6 mb-4 bg-gray-50 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Chamber:</span>
                  <span className="text-gray-900 font-medium">{chamberName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Date:</span>
                  <span className="text-gray-900 font-medium">{date}</span>
                </div>
                <div className="pt-2 border-t">
                  <span className="text-gray-700">Original Time:</span>{' '}
                  <span className="text-red-500 font-medium line-through">{originalTime}</span>
                </div>
                <div className="pt-2 border-t">
                  <span className="text-gray-700">New Time:</span>{' '}
                  <span className="text-emerald-600 font-bold">{newTime}</span>
                </div>
                <div className="pt-2 border-t">
                  <span className="text-gray-700">Note:</span>{' '}
                  <span className="text-gray-900">Your serial number remains the same. Please arrive at the new time.</span>
                </div>
              </div>
            </div>

            {/* Health Tip Section */}
            <div className="px-6 py-4">
              <TemplateDisplay placement="notif-chamber-rescheduled" className="mb-0" />
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 text-center">
              <p className="text-emerald-500 text-xs">Powered by HealQR.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
