import { AlertTriangle } from 'lucide-react';

import type { Language } from '../utils/translations';
import TemplateDisplay from './TemplateDisplay';

interface AdminAlertNotificationProps {
  language?: Language;
  doctorName?: string;
  doctorInitials?: string;
  eventType?: string;
  timestamp?: string;
  severity?: string;
}

export default function AdminAlertNotification({
  language = 'english',
  doctorName = 'Dr. Anika Sharma',
  doctorInitials = 'AS',
  eventType = 'System Alert',
  timestamp = 'October 10, 2025, 09:45 AM',
  severity = 'High',
}: AdminAlertNotificationProps) {
  
  
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
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-gray-900 uppercase tracking-wide text-sm">
                    URGENT ADMIN ALERT
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
                </div>
              </div>

              {/* Greeting */}
              <p className="text-gray-900 mb-4">
                Dear {doctorName}, 👋
              </p>

              {/* Message Body */}
              <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                Immediate attention required! A critical system event needs your review.
              </p>

              {/* Alert Details */}
              <div className="bg-orange-50 border-l-4 border-orange-500 rounded-r-lg p-4 mb-4 space-y-2">
                <h3 className="text-gray-900">Alert Details:</h3>
                <div>
                  <span className="text-gray-900">Event Type:</span>{' '}
                  <span className="text-gray-600">System Alert</span>
                </div>
                <div>
                  <span className="text-gray-900">Timestamp:</span>{' '}
                  <span className="text-gray-600">{timestamp}</span>
                </div>
                <div>
                  <span className="text-gray-900">Severity:</span>{' '}
                  <span className="text-red-600">High</span>
                </div>
              </div>

              {/* Action Required */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-gray-900 mb-2">Action Required:</p>
                <p className="text-gray-600 text-sm">Please review and respond immediately</p>
              </div>

              {/* Health Tip Section */}
              <TemplateDisplay placement="notif-admin-alert" className="mb-4" />

              {/* Footer */}
              <p className="text-gray-400 text-xs text-center">
                HealQR.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

