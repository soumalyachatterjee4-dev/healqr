import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  Bell,
  Info,
  Calendar,
  X
} from 'lucide-react';

import DashboardPromoDisplay from './DashboardPromoDisplay';
import TemplateDisplay from './TemplateDisplay';
import type { Language } from '../utils/translations';
import {
  subscribeToPatientNotifications,
  markNotificationAsRead,
  type StoredNotification
} from '../services/patientNotificationStorage';


interface PatientNotificationsProps {
  patientPhone?: string;
  language?: Language;
}

export default function PatientNotifications({ patientPhone }: PatientNotificationsProps) {
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


    // Set up real-time listener for notifications
    const unsubscribe = subscribeToPatientNotifications(
      currentPatientPhone,
      (newNotifications) => {
        setNotifications(newNotifications);
        setLoading(false);
      }
    );

    // Cleanup on unmount
    return () => {
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
            const dl = (notification as any).downloadUrls;
            const hasDownloads = dl && (dl.rxUrl || dl.dietUrl);
            const dlExpiresAt = hasDownloads ? (dl.expiresAt?.toDate ? dl.expiresAt.toDate() : dl.expiresAt ? new Date(dl.expiresAt) : null) : null;
            const dlIsExpired = dlExpiresAt ? new Date() > dlExpiresAt : false;
            const dlHoursLeft = dlExpiresAt ? Math.max(0, Math.round((dlExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60))) : 0;
            const isRichType = notification.type === 'consultation_completed' || notification.type === 'rx_updated';

            // ===== RICH TEMPLATE CARD (consultation_completed / rx_updated) =====
            if (isRichType) {
              const isUpdate = notification.type === 'rx_updated';
              const borderColor = isUpdate ? 'border-l-orange-500' : 'border-l-emerald-500';
              const headerBg = isUpdate ? 'bg-orange-500/10' : 'bg-emerald-500/10';
              const headerColor = isUpdate ? 'text-orange-400' : 'text-emerald-400';
              const headerIcon = isUpdate ? '⚠️' : '✅';
              const headerText = isUpdate ? 'UPDATED PRESCRIPTION' : 'CONSULTATION COMPLETED';

              return (
                <Card
                  key={notification.id}
                  className={`bg-zinc-900 border-zinc-800 overflow-hidden ${!notification.isRead ? `border-l-4 ${borderColor}` : ''}`}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <CardContent className="p-0">
                    {/* Rich Header */}
                    <div className={`${headerBg} px-5 py-3 flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{headerIcon}</span>
                        <span className={`text-xs font-bold uppercase tracking-wider ${headerColor}`}>{headerText}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {notification.fcmSuccess ? (
                          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">📱 Push Sent</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">💾 Saved</span>
                        )}
                        {!notification.isRead && (
                          <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">🆕 Unread</span>
                        )}
                      </div>
                    </div>

                    <div className="p-5">
                      {/* Doctor Info */}
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-700">
                        {notification.doctorPhoto ? (
                          <img src={notification.doctorPhoto} alt={notification.doctorName} className="w-11 h-11 rounded-full object-cover" />
                        ) : (
                          <div className="w-11 h-11 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {notification.doctorName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'DR'}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-semibold">{notification.doctorName}</p>
                          {notification.doctorSpecialty && <p className="text-gray-400 text-sm">{notification.doctorSpecialty}</p>}
                        </div>
                      </div>

                      {/* Greeting */}
                      <p className="text-white mb-2">
                        Hello {notification.patientName?.split(' ')[0] || 'there'}, 👋
                      </p>

                      {/* Message */}
                      <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                        {isUpdate
                          ? `Dr. ${notification.doctorName} has sent an UPDATED prescription. Please ignore the previous prescription and use this latest version.`
                          : `Thank you for visiting ${notification.chamberName || 'our clinic'}. Your consultation has been successfully completed.`
                        }
                      </p>

                      {/* Consultation Details */}
                      {(notification.appointmentDate || notification.appointmentTime || notification.chamberName) && (
                        <div className="bg-zinc-800 rounded-lg p-3 mb-4 space-y-1.5 text-sm">
                          {notification.appointmentDate && (
                            <div className="flex items-center gap-2 text-gray-300">
                              <span className="text-gray-500">📅</span>
                              <span>{notification.appointmentDate}</span>
                            </div>
                          )}
                          {notification.appointmentTime && (
                            <div className="flex items-center gap-2 text-gray-300">
                              <span className="text-gray-500">🕐</span>
                              <span>{notification.appointmentTime}</span>
                            </div>
                          )}
                          {notification.chamberName && (
                            <div className="flex items-center gap-2 text-gray-300">
                              <span className="text-gray-500">📍</span>
                              <span>{notification.chamberName}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Next Steps (consultation_completed only) */}
                      {!isUpdate && (
                        <div className="mb-4">
                          <p className="text-white text-sm font-medium mb-2">Next Steps:</p>
                          <div className="text-gray-400 text-sm space-y-1 ml-1">
                            <p>• Follow the prescribed medication</p>
                            <p>• Schedule recommended tests</p>
                            <p>• Book follow up if advised</p>
                          </div>
                        </div>
                      )}

                      {/* Warning for RX Updated */}
                      {isUpdate && (
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4">
                          <p className="text-orange-300 text-sm font-medium">⚠️ Please IGNORE the previous prescription</p>
                        </div>
                      )}

                      <p className="text-gray-500 text-sm text-center italic mb-4">Thank you for trusting us with your health!</p>

                      {/* Health Tip Banner */}
                      <TemplateDisplay placement={isUpdate ? 'notif-rx-updated' : 'notif-consultation-completed'} className="mb-4" />

                      {/* Download Buttons */}
                      {hasDownloads && (
                        <div className="space-y-2 mb-4">
                          {!dlIsExpired ? (
                            <>
                              {dl.rxUrl && (
                                <a
                                  href={dl.rxUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-3 text-sm font-semibold transition-all w-full"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Download Digital Prescription
                                </a>
                              )}
                              {dl.dietUrl && (
                                <a
                                  href={dl.dietUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-4 py-3 text-sm font-semibold transition-all w-full"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Download AI Diet Chart
                                </a>
                              )}
                              <p className="text-gray-500 text-xs text-center italic">Securely generated digital prescription</p>
                            </>
                          ) : (
                            <div className="text-center text-xs text-red-400/70 bg-red-500/10 rounded-lg px-3 py-2">
                              Download links expired (72-hour limit). Contact your doctor for a new copy.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Important Notice */}
                      {hasDownloads && !dlIsExpired && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-red-400 text-sm mt-0.5">⚠️</span>
                            <div>
                              <p className="text-red-300 text-xs font-bold uppercase">Important Notice</p>
                              <p className="text-gray-400 text-xs mt-1">
                                Above links will expire in {dlHoursLeft} hours. Please download and save the documents.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800 bg-zinc-900/50">
                      <span className="text-xs text-gray-500">
                        {notification.createdAt.toDate().toLocaleDateString()} at {notification.createdAt.toDate().toLocaleTimeString()}
                      </span>
                      {notification.bookingId && (
                        <code className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                          {notification.bookingId}
                        </code>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            }

            // ===== SIMPLE CARD (other notification types) =====
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
                          {notification.type === 'booking_confirmed' && '📅'}
                          {notification.type === 'appointment_reminder' && '⏰'}
                          {notification.type === 'review_request' && '⭐'}
                          {notification.type === 'prescription_ready' && '💊'}
                          {notification.type === 'video_call_link' && '📹'}
                          {notification.type === 'booking_cancelled' && '❌'}
                          {notification.type === 'booking_restored' && '🔄'}
                          {notification.type === 'follow_up' && '📋'}
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
                <strong>Notifications from your last 2 consultations</strong> are stored for 120 days. You can submit reviews
                and view consultation details during this period.
              </p>
              <p className="text-blue-400/80 mb-2">
                📥 <strong>Download links (Digital RX & AI Diet Chart)</strong> are active for <strong>72 hours</strong> only. Please download and save them promptly.
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

