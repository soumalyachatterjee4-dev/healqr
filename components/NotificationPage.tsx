import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Check } from 'lucide-react';

interface NotificationData {
  patientPhone: string;
  patientName: string;
  doctorName: string;
  doctorPhoto?: string;
  doctorSpecialty?: string;
  type: string;
  title: string;
  message: string;
  consultationDate?: string;
  consultationTime?: string;
  nextSteps?: string[];
  adBanner?: {
    imageUrl: string;
    clickUrl: string;
    title: string;
  };
  status: string;
}

export default function NotificationPage() {
  const { notificationId } = useParams<{ notificationId: string }>();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotification();
  }, [notificationId]);

  const loadNotification = async () => {
    try {
      if (!notificationId) return;

      const notifRef = doc(db, 'patientNotifications', notificationId);
      const notifDoc = await getDoc(notifRef);

      if (notifDoc.exists()) {
        const data = notifDoc.data() as NotificationData;
        setNotification(data);

        // Mark as read
        if (data.status === 'unread') {
          await updateDoc(notifRef, { status: 'read' });
        }
      } else {
        console.error('Notification not found');
      }
    } catch (error) {
      console.error('Error loading notification:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdClick = () => {
    if (notification?.adBanner?.clickUrl) {
      // Track ad click for analytics
      console.log('Ad clicked:', notification.adBanner.title);
      window.open(notification.adBanner.clickUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-emerald-400 text-xl">Loading...</div>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">Notification not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Rich Notification Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="text-white font-semibold text-lg">
              {notification.type === 'consultation_completed' && 'CONSULTATION COMPLETED'}
              {notification.type === 'booking_reminder' && 'APPOINTMENT REMINDER'}
              {notification.type === 'follow_up' && 'FOLLOW-UP REMINDER'}
              {notification.type === 'cancellation' && 'APPOINTMENT CANCELLED'}
              {notification.type === 'restoration' && 'APPOINTMENT RESTORED'}
              {notification.type === 'review_request' && 'REVIEW REQUEST'}
            </div>
          </div>

          {/* Doctor Info */}
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              {notification.doctorPhoto ? (
                <img
                  src={notification.doctorPhoto}
                  alt={notification.doctorName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-xl">
                  {notification.doctorName.charAt(0)}
                </div>
              )}
              <div>
                <div className="font-bold text-gray-900">{notification.doctorName}</div>
                {notification.doctorSpecialty && (
                  <div className="text-sm text-blue-600">{notification.doctorSpecialty}</div>
                )}
              </div>
            </div>

            {/* Message */}
            <div className="mb-4">
              <div className="text-gray-800 mb-2">
                Hello {notification.patientName}, 👋
              </div>
              <div className="text-gray-700 leading-relaxed">
                {notification.message}
              </div>
            </div>

            {/* Consultation Details (if available) */}
            {notification.consultationDate && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                <div>
                  <span className="font-semibold text-gray-700">Consultation Date: </span>
                  <span className="text-blue-600">{notification.consultationDate}</span>
                </div>
                {notification.consultationTime && (
                  <div>
                    <span className="font-semibold text-gray-700">Time: </span>
                    <span className="text-blue-600">{notification.consultationTime}</span>
                  </div>
                )}
              </div>
            )}

            {/* Next Steps */}
            {notification.nextSteps && notification.nextSteps.length > 0 && (
              <div className="mb-4">
                <div className="font-semibold text-gray-900 mb-2">Next Steps:</div>
                <ul className="space-y-2">
                  {notification.nextSteps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <span className="text-emerald-600 mt-1">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-gray-700 text-sm">
              Thank you for trusting us with your health!
            </div>
          </div>

          {/* Advertisement Banner (Monetization) */}
          {notification.adBanner && (
            <div
              onClick={handleAdClick}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            >
              <img
                src={notification.adBanner.imageUrl}
                alt={notification.adBanner.title}
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Footer */}
          <div className="bg-gray-50 p-4 text-center text-sm text-gray-600">
            Powered by HealQR.com
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

