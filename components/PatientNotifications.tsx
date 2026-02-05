import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { 
  Bell, 
  Info,
  Calendar,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardPromoDisplay from './DashboardPromoDisplay';
import type { Language } from '../utils/translations';
import { 
  getPatientNotifications, 
  subscribeToPatientNotifications, 
  markNotificationAsRead,
  type StoredNotification 
} from '../services/patientNotificationStorage';
import StoredConsultationCompletedCard from './StoredConsultationCompletedCard';
import StoredReviewRequestCard from './StoredReviewRequestCard';

interface PatientNotificationsProps {
  patientPhone?: string;
  language?: Language;
}

export default function PatientNotifications({ patientPhone, language = 'english' }: PatientNotificationsProps) {
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [searchDate, setSearchDate] = useState<string>('');
  const [uniqueDates, setUniqueDates] = useState<string[]>([]);

  useEffect(() => {
    const currentPatientPhone = patientPhone || localStorage.getItem('patient_phone');
    
    if (!currentPatientPhone) {
      setLoading(false);
      return;
    }

    console.log('📡 Setting up real-time notification listener for:', currentPatientPhone);

    // Set up real-time listener for notifications
    const unsubscribe = subscribeToPatientNotifications(
      currentPatientPhone,
      (newNotifications) => {
        console.log('🔔 Received notification update:', newNotifications.length);
        setNotifications(newNotifications);
        setLoading(false);
      }
    );

    // Cleanup on unmount
    return () => {
      console.log('🔌 Unsubscribing from notification listener');
      unsubscribe();
    };
  }, [patientPhone]);

  // Extract unique consultation dates for filter dropdown
  useEffect(() => {
    if (notifications.length > 0) {
      const dates = [...new Set(
        notifications
          .map(n => n.appointmentDate)
          .filter(Boolean)
      )];
      setUniqueDates(dates.sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime()) as string[]);
    }
  }, [notifications]);

  const handleMarkAsRead = async (notificationId?: string) => {
    if (!notificationId) return;
    
    try {
      await markNotificationAsRead(notificationId);
      console.log('✅ Notification marked as read:', notificationId);
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  };

  // Apply filters
  let filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  // Apply date search
  if (searchDate) {
    filteredNotifications = filteredNotifications.filter(n => n.appointmentDate === searchDate);
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Tip */}
      <DashboardPromoDisplay category="health-tip" placement="patient-notifications" />

      {/* Filter Tabs */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <Button
                onClick={() => setFilter('all')}
                variant={filter === 'all' ? 'default' : 'ghost'}
                className={filter === 'all' 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'text-gray-400 hover:text-white'
                }
              >
                All
                <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">
                  {notifications.length}
                </span>
              </Button>
              <Button
                onClick={() => setFilter('unread')}
                variant={filter === 'unread' ? 'default' : 'ghost'}
                className={filter === 'unread' 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'text-gray-400 hover:text-white'
                }
              >
                Unread
                {unreadCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white rounded-full text-xs">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </div>

            <p className="text-sm text-gray-400">
              From last 2 consultations
            </p>
          </div>

          {/* Date Search Filter */}
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="flex-1 bg-zinc-800 text-white border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Consultation Dates</option>
              {uniqueDates.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
            {searchDate && (
              <Button
                onClick={() => setSearchDate('')}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 text-center">
            <Bell className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Notifications</h3>
            <p className="text-gray-400">
              {searchDate 
                ? `No notifications found for ${searchDate}`
                : filter === 'unread' 
                  ? "You're all caught up!"
                  : "No notifications from your consultations"}
            </p>
            {searchDate && (
              <Button
                onClick={() => setSearchDate('')}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700"
              >
                Clear Date Filter
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => {
            // Simple card for all notification types
            return (
              <Card 
                key={notification.id} 
                className={`bg-zinc-900 border-zinc-800 ${!notification.isRead ? 'border-l-4 border-l-emerald-500' : ''}`}
                onClick={() => handleMarkAsRead(notification.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                          {notification.type === 'consultation_completed' && '✅'}
                          {notification.type === 'booking_confirmed' && '📅'}
                          {notification.type === 'appointment_reminder' && '⏰'}
                          {notification.type === 'review_request' && '⭐'}
                          {notification.type === 'prescription_ready' && '💊'}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {notification.doctorName}
                            {notification.doctorSpecialty && ` • ${notification.doctorSpecialty}`}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-gray-300 mb-3">{notification.message}</p>

                      {/* Appointment Details */}
                      {(notification.appointmentDate || notification.appointmentTime || notification.chamberName) && (
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-3">
                          {notification.appointmentDate && (
                            <span>📅 {new Date(notification.appointmentDate).toLocaleDateString()}</span>
                          )}
                          {notification.appointmentTime && (
                            <span>🕐 {notification.appointmentTime}</span>
                          )}
                          {notification.chamberName && (
                            <span>📍 {notification.chamberName}</span>
                          )}
                          {notification.serialNumber && (
                            <span>#{notification.serialNumber}</span>
                          )}
                        </div>
                      )}

                      {/* FCM Status Badge */}
                      <div className="flex items-center gap-2 mt-3">
                        {notification.fcmSuccess ? (
                          <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded">
                            📱 Push Sent
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded">
                            💾 Saved (Push {notification.fcmError ? 'Failed' : 'N/A'})
                          </span>
                        )}
                        {!notification.isRead && (
                          <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded">
                            🆕 Unread
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        {notification.createdAt.toDate().toLocaleDateString()} at {notification.createdAt.toDate().toLocaleTimeString()}
                      </span>
                    </div>
                    {notification.bookingId && (
                      <code className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                        {notification.bookingId}
                      </code>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-400">
              <p className="font-medium mb-1">📦 Notification Retention Policy</p>
              <p className="text-blue-400/80 mb-2">
                <strong>Notifications from your last 2 consultations</strong> are stored for 120 days. You can submit reviews, 
                view consultation details, and download prescriptions during this period.
              </p>
              <p className="text-blue-400/80 mb-2">
                💡 <strong>Even if you didn't allow notifications,</strong> all important updates are saved here for you to check anytime!
              </p>
              <p className="text-blue-400/80 text-xs">
                📋 Note: Your consultation history (booking records) is kept forever, but notification templates are auto-deleted after 120 days.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
