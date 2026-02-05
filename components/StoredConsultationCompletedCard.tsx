import { CheckCircle, CheckCheck, AlertTriangle, BellOff, Clock } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import TemplateDisplay from './TemplateDisplay';
import type { NotificationRecord } from '../services/notificationHistoryService';

interface StoredConsultationCompletedCardProps {
  notification: NotificationRecord;
  onMarkRead?: (id: string) => void;
}

export default function StoredConsultationCompletedCard({
  notification,
  onMarkRead
}: StoredConsultationCompletedCardProps) {
  const {
    id,
    patientName,
    doctorName,
    doctorSpecialty,
    doctorInitials,
    doctorPhoto,
    clinicName,
    consultationDate,
    consultationTime,
    templateData,
    readStatus,
    timestamp,
    expiresAt
  } = notification;

  // Calculate days until expiry
  const daysUntilExpiry = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30;

  const handleCardClick = () => {
    if (!readStatus && id && onMarkRead) {
      onMarkRead(id);
    }
  };

  return (
    <Card 
      className={`overflow-hidden cursor-pointer transition-all hover:shadow-md ${!readStatus ? 'bg-emerald-50/30 border-emerald-200' : 'bg-white'}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">
                  Consultation Completed
                </h3>
                {/* Delivery Status Badge */}
                {notification.deliveryStatus === 'permission_denied' || notification.deliveryStatus === 'no_token' || notification.deliveryStatus === 'saved_only' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium" title="Push notification not sent - you didn't allow notifications">
                    <BellOff className="w-3 h-3" />
                    Saved Only
                  </span>
                ) : notification.deliveryStatus === 'push_failed' || notification.notificationStatus === 'failed' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium" title="Push notification failed to send">
                    <AlertTriangle className="w-3 h-3" />
                    Failed
                  </span>
                ) : notification.deliveryStatus === 'push_sent' || notification.notificationStatus === 'delivered' || notification.notificationStatus === 'sent' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium" title="Push notification sent successfully">
                    <CheckCheck className="w-3 h-3" />
                    Sent
                  </span>
                ) : notification.notificationStatus === 'pending' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium" title="Push notification pending">
                    <Clock className="w-3 h-3" />
                    Pending
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(timestamp).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
          {!readStatus && (
            <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></div>
          )}
        </div>

        {/* Doctor Info */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b">
          {doctorPhoto ? (
            <img 
              src={doctorPhoto} 
              alt={doctorName}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold">
                {doctorInitials || doctorName?.split(' ').map(n => n[0]).join('') || 'DR'}
              </span>
            </div>
          )}
          <div>
            <h4 className="text-gray-900 font-medium">{doctorName}</h4>
            {doctorSpecialty && (
              <p className="text-gray-500 text-sm">{doctorSpecialty}</p>
            )}
          </div>
        </div>

        {/* Greeting */}
        <p className="text-gray-900 mb-3">
          {templateData?.greeting || `Hello ${patientName}, 👋`}
        </p>

        {/* Message */}
        <p className="text-gray-700 text-sm mb-4 leading-relaxed">
          {templateData?.mainMessage || `Thank you for visiting ${clinicName || 'our clinic'}. Your consultation has been successfully completed.`}
        </p>

        {/* Consultation Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
          <div>
            <span className="text-gray-900 font-medium">Consultation Date: </span>
            <span className="text-gray-600">{consultationDate}</span>
          </div>
          <div>
            <span className="text-gray-900 font-medium">Time: </span>
            <span className="text-gray-600">{consultationTime}</span>
          </div>
        </div>

        {/* Next Steps */}
        {templateData?.nextSteps && templateData.nextSteps.length > 0 && (
          <div className="mb-4">
            <p className="text-gray-900 text-sm font-medium mb-2">Next Steps:</p>
            <div className="text-gray-600 text-sm space-y-1 ml-2">
              {templateData.nextSteps.map((step, idx) => (
                <p key={idx}>• {step}</p>
              ))}
            </div>
          </div>
        )}

        {/* Thank You Message */}
        <p className="text-gray-700 text-sm mb-4 text-center italic">
          Thank you for trusting us with your health!
        </p>

        {/* Ad Banner */}
        {templateData?.adBanner && (
          <TemplateDisplay 
            placement={templateData.adBanner.placement || "notif-consultation-completed"} 
            className="mb-4" 
          />
        )}

        {/* Expiry Warning */}
        {isExpiringSoon && daysUntilExpiry && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <p className="text-orange-700 text-xs font-medium">
              ⏰ Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
