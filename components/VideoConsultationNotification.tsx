import { Video, Calendar, Clock, ExternalLink, AlertCircle, CheckCircle, User } from 'lucide-react';
import TemplateDisplay from './TemplateDisplay';
import { useAITranslation } from '../hooks/useAITranslation';
import type { Language } from '../utils/translations';

interface VideoConsultationNotificationProps {
  doctorName?: string;
  doctorSpecialization?: string;
  patientName?: string;
  consultationDate?: string;
  consultationTime?: string;
  meetingLink?: string;
  bookingId?: string;
  language?: Language;
}
export default function VideoConsultationNotification({
  doctorName = 'Dr. Ankita Sharma',
  doctorSpecialization = 'Cardiologist',
  patientName = 'Rahul Kumar',
  consultationDate = 'November 15, 2025',
  consultationTime = '10:00 AM',
  meetingLink = 'https://meet.healqr.com/abc-xyz-123',
  bookingId = 'V7-001',
  language = 'english'
}: VideoConsultationNotificationProps) {
  const { bt } = useAITranslation(language);

  return (
    <div className="min-h-screen bg-[#1a1f2e] text-white p-4 sm:p-6 flex items-center justify-center">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                  <Video className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-white font-semibold">{bt('VIDEO CONSULTATION READY')}</h2>
                  <p className="text-white/80 text-xs">Online Video Call</p>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Greeting */}
            <div className="text-gray-800">
              <p className="text-base">
                {bt('Hello')} <span className="font-semibold text-red-600">{patientName}</span>, 👋
              </p>
            </div>

            {/* Message */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-gray-700 text-sm leading-relaxed">
                {bt('Your video consultation with')} <span className="font-semibold text-red-600">{doctorName}</span> {bt('is scheduled.')}
              </p>
            </div>

            {/* Doctor Info */}
            <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-semibold">
                  {doctorName.split(' ')[1]?.charAt(0) || 'A'}S
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-gray-900 font-semibold">{doctorName}</h3>
                <p className="text-gray-600 text-sm">{doctorSpecialization}</p>
                <div className="flex items-center gap-1 mt-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="text-green-600 text-xs">Verified</span>
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  {bt('Date:')}
                </span>
                <span className="text-gray-900 font-semibold">{consultationDate}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  {bt('Time:')}
                </span>
                <span className="text-gray-900 font-semibold">{consultationTime}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  {bt('Booking ID:')}
                </span>
                <span className="text-gray-900 font-semibold font-mono">{bookingId}</span>
              </div>
            </div>

            {/* Before Joining Checklist */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <h4 className="text-purple-900 font-semibold text-sm mb-3">{bt('Before Joining:')}</h4>
              <div className="space-y-2 text-sm text-purple-800">
                <p>{bt('• Check camera and microphone')}</p>
                <p>{bt('• Ensure stable internet')}</p>
                <p>{bt('• Find a quiet space')}</p>
              </div>
            </div>

            {/* Join Button */}
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <button className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-4 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2">
                <Video className="w-5 h-5" />
                {bt('Join Video Consultation')}
                <ExternalLink className="w-4 h-4" />
              </button>
            </a>

            {/* Important Note */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-orange-900">
                  <span className="font-semibold">{bt('Note:')}</span> {bt('Please join 5 minutes before the scheduled time. The link will be active 10 minutes before your appointment.')}
                </div>
              </div>
            </div>

            {/* Meeting Link Display */}
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Meeting Link:</p>
              <p className="text-xs text-blue-600 font-mono break-all">{meetingLink}</p>
            </div>

            {/* Health Tip Section */}
            <TemplateDisplay placement="notif-video-consultation" className="mb-0" />
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
            <p className="text-gray-400 text-xs text-center">HealQR.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
