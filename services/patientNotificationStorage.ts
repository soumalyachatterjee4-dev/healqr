// 🔔 PATIENT NOTIFICATION STORAGE SERVICE
// Stores ALL notifications in Firestore for 120 days
// Independent of FCM success/failure - Always stores notification

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  Timestamp,
  deleteDoc,
  updateDoc,
  doc as firestoreDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
const NOTIFICATIONS_COLLECTION = 'patient_notifications';
const RETENTION_DAYS = 120;

export interface StoredNotification {
  id?: string;

  // Patient Info
  patientPhone: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;

  // Notification Metadata
  type: 'consultation_completed' | 'booking_confirmed' | 'appointment_reminder' | 'booking_cancelled' | 'booking_restored' | 'follow_up' | 'review_request' | 'prescription_ready' | 'video_call_link' | 'rx_updated' | 'chronic_care';
  title: string;
  message: string;

  // Booking Details
  bookingId: string;
  doctorId?: string;
  doctorName: string;
  doctorSpecialty?: string;
  doctorPhoto?: string;
  chamberName?: string;
  chamberAddress?: string;

  // Appointment Details
  appointmentDate?: string;
  appointmentTime?: string;
  serialNumber?: string;
  purpose?: string;

  // Timestamps
  createdAt: Timestamp;
  expiresAt: Timestamp;

  // Status
  isRead: boolean;
  readAt?: Timestamp;

  // FCM Delivery Status
  fcmAttempted: boolean;
  fcmSuccess: boolean;
  fcmError?: string;
  fcmToken?: string;

  // Additional Data
  metadata?: Record<string, any>;

  // 🆕 Download URLs (active for 72 hours)
  downloadUrls?: {
    rxUrl?: string;
    dietUrl?: string;
    createdAt: Timestamp;
    expiresAt: Timestamp; // 72 hours from creation
  };
}

/**
 * Recursively remove undefined values from objects
 */
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Timestamp) return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefined);

  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = removeUndefined(value);
    }
  }
  return cleaned;
};

/**
 * Store notification in Firestore
 * Called ALWAYS, regardless of FCM success/failure
 */
export const storeNotification = async (
  notification: Omit<StoredNotification, 'id' | 'createdAt' | 'expiresAt' | 'isRead'>
): Promise<string> => {
  try {
    // Normalize phone number (last 10 digits)
    const normalizedPhone = notification.patientPhone.replace(/\D/g, '').slice(-10);

    const now = Timestamp.now();
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000)
    );

    // Remove undefined fields recursively to avoid Firestore errors
    const cleanNotification = removeUndefined(notification);

    const notificationData: Omit<StoredNotification, 'id'> = {
      ...cleanNotification,
      patientPhone: normalizedPhone,
      createdAt: now,
      expiresAt: expiresAt,
      isRead: false,
    } as Omit<StoredNotification, 'id'>;


    const docRef = await addDoc(
      collection(db!, NOTIFICATIONS_COLLECTION),
      notificationData
    );


    // Auto-cleanup expired notifications for this patient
    await cleanupExpiredNotifications(normalizedPhone);

    return docRef.id;
  } catch (error) {
    console.error('❌ Error storing notification:', error);
    throw error;
  }
};

/**
 * Get notifications for a patient
 * Returns last 120 days OR last 2 consultations (whichever is more)
 */
export const getPatientNotifications = async (
  patientPhone: string
): Promise<StoredNotification[]> => {
  try {
    const normalizedPhone = patientPhone.replace(/\D/g, '').slice(-10);


    // Simplified query to avoid composite index requirement
    const notificationsQuery = query(
      collection(db!, NOTIFICATIONS_COLLECTION),
      where('patientPhone', '==', normalizedPhone),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(notificationsQuery);

    // Filter out expired notifications in memory
    const now = Timestamp.now();
    const notifications: StoredNotification[] = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<StoredNotification, 'id'>
      }))
      .filter(n => n.expiresAt.toMillis() > now.toMillis());


    // Ensure at least last 2 consultations are included (if they exist)
    const consultationNotifs = notifications.filter(n => n.type === 'consultation_completed');

    if (consultationNotifs.length < 2) {
      // Fetch older consultation notifications (even if expired)
      const olderQuery = query(
        collection(db!, NOTIFICATIONS_COLLECTION),
        where('patientPhone', '==', normalizedPhone),
        where('type', '==', 'consultation_completed'),
        orderBy('createdAt', 'desc'),
        limit(2)
      );

      const olderSnapshot = await getDocs(olderQuery);
      const olderNotifs = olderSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<StoredNotification, 'id'>
      }));

      // Merge and deduplicate
      const allNotifs = [...notifications];
      olderNotifs.forEach(old => {
        if (!allNotifs.find(n => n.id === old.id)) {
          allNotifs.push(old);
        }
      });

      return allNotifs.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    }

    return notifications;
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    return [];
  }
};

/**
 * Real-time listener for patient notifications
 */
export const subscribeToPatientNotifications = (
  patientPhone: string,
  callback: (notifications: StoredNotification[]) => void
): (() => void) => {
  const normalizedPhone = patientPhone.replace(/\D/g, '').slice(-10);


  // Simple query with only where clause (no orderBy to avoid composite index)
  const notificationsQuery = query(
    collection(db!, NOTIFICATIONS_COLLECTION),
    where('patientPhone', '==', normalizedPhone)
  );

  const unsubscribe = onSnapshot(
    notificationsQuery,
    (snapshot) => {
      // Filter expired and sort in memory
      const now = Timestamp.now();
      const notifications: StoredNotification[] = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data() as Omit<StoredNotification, 'id'>
        }))
        .filter(n => n.expiresAt.toMillis() > now.toMillis())
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

      callback(notifications);
    },
    (error) => {
      console.error('❌ Real-time listener error:', error);
      callback([]);
    }
  );

  return unsubscribe;
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notificationRef = firestoreDoc(db!, NOTIFICATIONS_COLLECTION, notificationId);

    await updateDoc(notificationRef, {
      isRead: true,
      readAt: Timestamp.now(),
    });

  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
  }
};

/**
 * Cleanup expired notifications for a patient
 */
const cleanupExpiredNotifications = async (patientPhone: string): Promise<void> => {
  try {
    const normalizedPhone = patientPhone.replace(/\D/g, '').slice(-10);

    // Simple query with only where clause (filter expiry in memory to avoid composite index)
    const allQuery = query(
      collection(db!, NOTIFICATIONS_COLLECTION),
      where('patientPhone', '==', normalizedPhone)
    );

    const snapshot = await getDocs(allQuery);

    // Filter expired in memory
    const now = Timestamp.now();
    const expiredDocs = snapshot.docs.filter(doc =>
      doc.data().expiresAt.toMillis() < now.toMillis()
    );

    // Don't delete last 2 consultation notifications
    const consultationNotifs = expiredDocs
      .filter(doc => doc.data().type === 'consultation_completed')
      .sort((a, b) => b.data().createdAt.toMillis() - a.data().createdAt.toMillis());

    const lastTwoConsultationIds = consultationNotifs.slice(0, 2).map(d => d.id);

    const deletePromises = expiredDocs
      .filter(doc => !lastTwoConsultationIds.includes(doc.id))
      .map(doc => deleteDoc(doc.ref));

    await Promise.all(deletePromises);

    if (deletePromises.length > 0) {
    }
  } catch (error) {
    console.error('❌ Error cleaning up notifications:', error);
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (patientPhone: string): Promise<number> => {
  try {
    const normalizedPhone = patientPhone.replace(/\D/g, '').slice(-10);

    const unreadQuery = query(
      collection(db!, NOTIFICATIONS_COLLECTION),
      where('patientPhone', '==', normalizedPhone),
      where('isRead', '==', false),
      where('expiresAt', '>', Timestamp.now())
    );

    const snapshot = await getDocs(unreadQuery);
    return snapshot.size;
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    return 0;
  }
};
