import { RotateCcw } from 'lucide-react';
import TemplateDisplay from './TemplateDisplay';
import type { Language } from '../utils/translations';
interface AppointmentRestoredNotificationProps {
  bookingId?: string;
  // Doctor Info
  doctorName?: string;
  doctorSpecialty?: string;
  doctorInitials?: string;

  // Patient Info
  patientName?: string;

  // Appointment Details
  clinicName?: string;
  restoredDate?: string;
  chamberName?: string;
  scheduleTime?: string;
  location?: string;
  bookingSerialNo?: string;
  uniqueBookingId?: string;

  // Multilingual
  language?: Language;

  // Health Tip
  healthTip?: string;
}

export default function AppointmentRestoredNotification({
  bookingId,
  doctorName = 'Dr. Unknown',
  doctorSpecialty = 'General',
  doctorInitials = 'DU',
  patientName = 'Patient',
  clinicName = 'Clinic',
  restoredDate = 'Unknown Date',
  chamberName = 'Unknown Chamber',
  scheduleTime = 'Unknown Time',
  location = 'Unknown Location',
  bookingSerialNo = '#0',
  uniqueBookingId = 'HQL-000000',
  language = 'english',
  healthTip = "Regular health checkups help detect problems before they start.",
}: AppointmentRestoredNotificationProps) {

  return (
    <div className="flex items-center justify-center py-8">
      {/* Phone Mockup with Black Border */}
      <div className="w-full max-w-sm">
        {/* Phone Frame */}
        <div className="bg-gray-900 rounded-3xl p-4 shadow-2xl border-8 border-gray-800">
          {/* Notification Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header with Icon and Title */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-gray-900">APPOINTMENT RESTORED</h1>
                </div>
              </div>

              {/* Doctor Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white">{doctorInitials}</span>
                </div>
                <div>
                  <p className="text-gray-900">{doctorName}</p>
                  <p className="text-gray-500 text-sm">{doctorSpecialty}</p>
                </div>
              </div>

              {/* Greeting */}
              <p className="text-gray-700 mb-4">{`Hello ${patientName}, 👋`}</p>

              {/* Message */}
              <p className="text-gray-700 mb-6 leading-relaxed">
                {`We are pleased to inform you that your appointment at ${clinicName} for ${restoredDate} has been restored. Your appointment with Dr. ${doctorName} is confirmed.`}
              </p>

              {/* Appointment Details Box */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2 mx-6">
            <div className="flex justify-between">
              <span className="text-gray-600">Chamber:</span>
              <span className="text-gray-900">{chamberName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="text-gray-900">{restoredDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Schedule Time:</span>
              <span className="text-gray-900">{scheduleTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Location:</span>
              <span className="text-gray-900">{location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Booking Serial No:</span>
              <span className="text-gray-900">{bookingSerialNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Unique Booking ID:</span>
              <span className="text-gray-900">{uniqueBookingId}</span>
            </div>
              </div>

              {/* Arrival Message */}
              <p className="text-gray-700 mb-6 px-6">
                Please arrive 15 minutes before your scheduled time.
              </p>

              {/* Health Tip Section */}
              <div className="px-6 py-4">
                <TemplateDisplay placement="notif-appointment-restored" className="mb-0" />
              </div>

          {/* Footer */}
          <div className="text-center mt-6 pt-4 border-t border-gray-200">
            <p className="text-gray-400 text-sm">HealQR.com</p>
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

