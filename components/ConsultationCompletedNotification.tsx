import { CheckCircle, Download } from 'lucide-react';
import TemplateDisplay from './TemplateDisplay';

import type { Language } from '../utils/translations';

interface ConsultationCompletedNotificationProps {
  bookingId?: string;
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
  dietUrl?: string;
}

export default function ConsultationCompletedNotification({
  language = 'english',
  patientName = 'Rahul Kumar',
  doctorName = 'Dr. Anika Sharma',
  doctorSpecialty = 'Cardiologist',
  doctorInitials = 'AS',
  doctorPhoto = '',
  clinicName = 'Health Care Clinic',
  consultationDate = 'October 10, 2025',
  consultationTime = '09:30 AM',
  rxUrl,
  dietUrl,
}: ConsultationCompletedNotificationProps) {
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
                    CONSULTATION COMPLETED
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
                {`Hello ${patientName}, 👋`}
              </p>

              {/* Message Body */}
              <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                {`Thank you for visiting ${clinicName}. Your consultation has been successfully completed.`}
              </p>

              {/* Consultation Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                {consultationDate && (
                  <div>
                    <span className="text-gray-900">Consultation Date:</span>{' '}
                    <span className="text-gray-600">{consultationDate}</span>
                  </div>
                )}
                {consultationTime && (
                  <div>
                    <span className="text-gray-900">Time:</span>{' '}
                    <span className="text-gray-600">{consultationTime}</span>
                  </div>
                )}
              </div>

              {/* Next Steps */}
              <div className="mb-4">
                <p className="text-gray-900 text-sm mb-2">Next Steps:</p>
                <div className="text-gray-600 text-sm space-y-1 ml-2">
                  <p>• Follow the prescribed medication</p>
                  <p>• Schedule recommended tests</p>
                  <p>• Book follow-up if advised</p>
                </div>
              </div>

              {/* Thank You Message */}
              <p className="text-gray-700 text-sm mb-4 text-center">
                Thank you for trusting us with your health!
              </p>

              {/* Health Tip Section */}
              <TemplateDisplay placement="notif-consultation-completed" className="mb-4" />

              {/* 📄 DOWNLOAD PRESCRIPTION BUTTON */}
              {rxUrl && (
                <div className="mb-3 px-2">
                  <a
                    href={rxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
                  >
                    <Download className="w-5 h-5" />
                    Download Digital Prescription
                  </a>
                </div>
              )}

              {/* 🥗 DOWNLOAD AI DIET CHART BUTTON */}
              {dietUrl && (
                <div className="mb-3 px-2">
                  <a
                    href={dietUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all"
                  >
                    <Download className="w-5 h-5" />
                    Download AI Diet Chart
                  </a>
                </div>
              )}

              {/* Secure link note */}
              {(rxUrl || dietUrl) && (
                <p className="text-[10px] text-gray-400 text-center mb-4 italic">
                  Securely generated digital prescription
                </p>
              )}

              {/* ⚠️ 72-HOUR EXPIRY WARNING */}
              {(rxUrl || dietUrl) && (
                <div className="mx-2 mb-5 border border-blue-200 bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-blue-800 font-bold text-sm mb-1">⚠️ IMPORTANT NOTICE</p>
                  <p className="text-blue-700 text-xs leading-relaxed">
                    Above links will expire in 72 hours. Please download and save the documents.
                  </p>
                </div>
              )}

              {/* Footer */}
              <p className="text-gray-400 text-xs text-center">HealQR.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

