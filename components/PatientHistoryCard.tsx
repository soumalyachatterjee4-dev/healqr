import React, { useRef } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Download, User, Calendar, MapPin } from 'lucide-react';
import { NotificationRecord } from '../services/notificationHistoryService';
import html2canvas from 'html2canvas';

interface PatientHistoryCardProps {
  record: NotificationRecord;
  showDownload?: boolean;
}

export const PatientHistoryCard: React.FC<PatientHistoryCardProps> = ({ record, showDownload = true }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Booking status badge
  const getBookingStatusBadge = () => {
    switch (record.bookingStatus) {
      case 'confirmed':
        return (
          <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            <span>CONFIRMED</span>
          </div>
        );
      case 'cancelled':
        return (
          <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-medium">
            <XCircle className="w-3 h-3" />
            <span>CANCELLED</span>
          </div>
        );
      case 'dropout':
        return (
          <div className="flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-1 rounded-full text-xs font-medium">
            <AlertCircle className="w-3 h-3" />
            <span>DROP OUT</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            <span>CONSULTATION COMPLETED</span>
          </div>
        );
      default:
        return null;
    }
  };

  // Notification status badge
  const getNotificationStatusBadge = () => {
    switch (record.notificationStatus) {
      case 'sent':
        return (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs">Notification Sent</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-1 text-gray-500">
            <XCircle className="w-4 h-4" />
            <span className="text-xs">System Failed to Send</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-1 text-yellow-600">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Waiting</span>
          </div>
        );
      default:
        return null;
    }
  };

  // Download card as image
  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
      });

      const link = document.createElement('a');
      link.download = `consultation-${record.patientName}-${record.consultationDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to download card:', error);
      alert('Failed to download. Please try again.');
    }
  };

  return (
    <div className="relative">
      {/* Download Button (outside card for UI, but not in screenshot) */}
      {showDownload && (
        <button
          onClick={handleDownload}
          className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
          title="Download as image"
        >
          <Download className="w-4 h-4 text-gray-600" />
        </button>
      )}

      {/* Card Content (this gets downloaded) */}
      <div
        ref={cardRef}
        className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border-2 border-gray-100 p-6"
      >
        {/* Header with Status Badge */}
        <div className="flex items-start justify-between mb-4">
          {getBookingStatusBadge()}
          
          {/* Walk-in verified badge */}
          {record.isWalkIn && record.walkInVerified && (
            <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-xs font-medium">
              <User className="w-3 h-3" />
              <span>WALK-IN VERIFIED</span>
            </div>
          )}
        </div>

        {/* Patient Name */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{record.patientName}</h3>
              <p className="text-sm text-gray-500">Patient</p>
            </div>
          </div>
        </div>

        {/* Greeting */}
        <p className="text-gray-700 mb-4">
          Hello {record.patientName}, 👋
        </p>

        {/* Message based on type */}
        {record.bookingStatus === 'completed' && (
          <p className="text-gray-700 mb-4">
            Thank you for visiting. Your consultation has been successfully completed.
          </p>
        )}
        {record.bookingStatus === 'cancelled' && record.message && (
          <p className="text-gray-700 mb-4">{record.message}</p>
        )}

        {/* Consultation Details */}
        <div className="bg-white rounded-lg p-4 mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-700">Consultation Date:</span>
            <span className="text-gray-900">{record.consultationDate}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-700">Time:</span>
            <span className="text-gray-900">{record.consultationTime || 'N/A'}</span>
          </div>

          {record.chamber && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-700">Chamber:</span>
              <span className="text-gray-900">{record.chamber}</span>
            </div>
          )}

          {record.serialNumber && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-700">Serial Number:</span>
              <span className="text-gray-900 bg-blue-50 px-2 py-0.5 rounded font-mono">
                {record.serialNumber}
              </span>
            </div>
          )}
        </div>

        {/* Doctor Name */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">Doctor:</p>
          <p className="text-lg font-semibold text-gray-900">{record.doctorName}</p>
        </div>

        {/* Next Steps (for completed consultations) */}
        {record.nextSteps && record.nextSteps.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Next Steps:</p>
            <ul className="space-y-1">
              {record.nextSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Thank you message */}
        <p className="text-gray-600 text-sm mb-4">
          Thank you for trusting us with your health!
        </p>

        {/* Notification Status */}
        <div className="border-t pt-3 mt-4">
          {getNotificationStatusBadge()}
        </div>

        {/* Powered by HealQR */}
        <div className="text-center mt-4 pt-3 border-t">
          <p className="text-xs text-gray-400">Powered by HealQR.com</p>
        </div>
      </div>
    </div>
  );
};
