import { AlertTriangle, Download, RefreshCw } from 'lucide-react';
import TemplateDisplay from './TemplateDisplay';
import { useAITranslation } from '../hooks/useAITranslation';
import type { Language } from '../utils/translations';

interface RxUpdatedNotificationProps {
  language?: Language;
  patientName?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorInitials?: string;
  doctorPhoto?: string;
  clinicName?: string;
  consultationDate?: string;
  consultationTime?: string;
  rxUrl?: string;
}

export default function RxUpdatedNotification({
  language = 'english',
  patientName = 'Patient',
  doctorName = 'Doctor',
  doctorSpecialty = '',
  doctorInitials = 'DR',
  doctorPhoto = '',
  clinicName = '',
  consultationDate = '',
  consultationTime = '',
  rxUrl,
}: RxUpdatedNotificationProps) {
  const { bt } = useAITranslation(language);

  return (
    <div className="flex items-center justify-center py-8">
      {/* Phone Mockup */}
      <div className="w-full max-w-sm">
        {/* Phone Frame */}
        <div className="bg-gray-900 rounded-3xl p-4 shadow-2xl border-8 border-gray-800">
          {/* Notification Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header - Orange/Warning theme */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-gray-900 uppercase tracking-wide text-sm font-bold">
                    {bt('UPDATED PRESCRIPTION')}
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
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-semibold">{doctorInitials}</span>
                  </div>
                )}
                <div>
                  <h3 className="text-gray-900 font-medium">{doctorName}</h3>
                  {doctorSpecialty && <p className="text-gray-500 text-sm">{doctorSpecialty}</p>}
                </div>
              </div>

              {/* Greeting */}
              <p className="text-gray-900 mb-2 font-medium">
                Dear {patientName}, {bt('Important Update!')} 🔄
              </p>

              {/* Warning Banner - Ignore Previous */}
              <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-800 text-sm font-medium">
                    {bt('⚠️ Please IGNORE the previous prescription notification')}
                  </p>
                </div>
              </div>

              {/* Main Message */}
              <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                {bt('Your doctor has sent an UPDATED prescription. Please ignore the previous prescription and use this latest version.')}
              </p>

              {/* Consultation Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                {consultationDate && (
                  <div>
                    <span className="text-gray-900 font-medium">{bt('Date:')}</span>{' '}
                    <span className="text-gray-600">{consultationDate}</span>
                  </div>
                )}
                {consultationTime && (
                  <div>
                    <span className="text-gray-900 font-medium">{bt('Time:')}</span>{' '}
                    <span className="text-gray-600">{consultationTime}</span>
                  </div>
                )}
                {clinicName && (
                  <div>
                    <span className="text-gray-900 font-medium">{bt('Clinic:')}</span>{' '}
                    <span className="text-gray-600">{clinicName}</span>
                  </div>
                )}
              </div>

              {/* Download Updated RX Button */}
              {rxUrl && (
                <div className="mb-4 px-2">
                  <a
                    href={rxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all"
                  >
                    <Download className="w-5 h-5" />
                    {bt('Download Updated Prescription')}
                  </a>
                  <p className="text-[10px] text-gray-400 text-center mt-2 italic">
                    {bt('This is the latest version of your prescription')}
                  </p>
                </div>
              )}

              {/* Ad Banner / Template Image (Admin Controlled) */}
              <TemplateDisplay placement="notif-rx-updated" className="mb-4" />

              {/* Footer */}
              <p className="text-gray-400 text-xs text-center">
                {bt('HealQR.com')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
