import { Video, Clock, Calendar, User } from 'lucide-react';
import { Button } from './ui/button';
import TemplateDisplay from './TemplateDisplay';
import { useAITranslation } from '../hooks/useAITranslation';
import type { Language } from '../utils/translations';

interface VideoConsultationLinkNotificationProps {
  language?: Language;
  patientName?: string;
  doctorName?: string;
  appointmentTime?: string;
  appointmentDate?: string;
  consultationLink?: string;
  isPreview?: boolean;
}

export default function VideoConsultationLinkNotification({
  language = 'english',
  patientName = 'Rajesh Kumar',
  doctorName = 'Dr. Priya Sharma',
  appointmentTime = '10:30 AM',
  appointmentDate = 'November 14, 2025',
  consultationLink = 'https://healqr.com/vc/abc123xyz',
  isPreview = false,
}: VideoConsultationLinkNotificationProps) {
  const { bt } = useAITranslation(language);

  const handleJoinConsultation = () => {
    if (!isPreview && consultationLink) {
      window.open(consultationLink, '_blank');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-gradient-to-br from-red-500/20 via-pink-500/20 to-purple-500/20 border-2 border-red-500/40 backdrop-blur-lg rounded-3xl shadow-2xl p-6">
      {/* Header Icon */}
      <div className="flex justify-center mb-4">
        <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
          <Video className="w-10 h-10 text-white" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-center text-white mb-2">
        {bt('Video Consultation Starting Soon!')} 🎥
      </h2>
      <p className="text-center text-gray-200 text-sm mb-6">
        {bt('Your video consultation is scheduled in 30 minutes')}
      </p>

      {/* Appointment Details Card */}
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 mb-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <p className="text-gray-300 text-xs">{bt('Patient')}</p>
            <p className="text-white font-medium">{patientName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <p className="text-gray-300 text-xs">{bt('Doctor')}</p>
            <p className="text-white font-medium">{doctorName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
            <Calendar className="w-5 h-5 text-purple-300" />
          </div>
          <div>
            <p className="text-gray-300 text-xs">{bt('Date')}</p>
            <p className="text-white font-medium">{appointmentDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-300" />
          </div>
          <div>
            <p className="text-gray-300 text-xs">{bt('Time')}</p>
            <p className="text-white font-medium">{appointmentTime}</p>
          </div>
        </div>
      </div>

      {/* Important Instructions */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-5">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-yellow-300 text-sm font-medium mb-1">{bt('Before You Join:')}</p>
            <ul className="text-yellow-200 text-xs space-y-1">
              <li>{bt('• Ensure stable internet connection')}</li>
              <li>{bt('• Allow camera & microphone access')}</li>
              <li>{bt('• Keep your medical reports ready')}</li>
              <li>{bt('• Join 2-3 minutes early')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Health Tip Section */}
      <TemplateDisplay placement="notif-video-link" className="mb-4" />

      {/* Join Button */}
      <Button
        onClick={handleJoinConsultation}
        className="w-full h-14 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg shadow-red-500/30 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
      >
        <Video className="w-5 h-5 mr-2" />
        <span className="text-lg">{bt('Join Video Consultation')}</span>
      </Button>

      {/* Preview Mode Indicator */}
      {isPreview && (
        <div className="mt-4 text-center">
          <span className="inline-block bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs px-3 py-1 rounded-full">
            📱 Template Preview
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="mt-5 pt-4 border-t border-white/10 text-center">
        <p className="text-gray-300 text-xs">
          Powered by <span className="text-emerald-400 font-semibold">HealQR</span>
        </p>
      </div>
    </div>
  );
}