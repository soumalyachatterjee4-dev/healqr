import { db } from '../lib/firebase/config';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';

const COLLECTION_NAME = 'doctors';
const SUB_COLLECTION_NAME = 'notifications';

export interface DoctorNotification {
  id?: string;
  type: 'system' | 'news' | 'health-tip' | 'patient-update' | 'birthday-card';
  category?: 'alert' | 'update' | 'info';
  title: string;
  message: string;
  timestamp: any;
  read: boolean;
  actionUrl?: string;
  metadata?: {
    clinicId?: string;
    chamberId?: string | number;
    patientId?: string;
    bookingId?: string;
    clinicName?: string;
    chamberAddress?: string;
    clinicPhone?: string;
    startTime?: string;
    endTime?: string;
  };
}

/**
 * Add a new notification for a doctor
 */
export const addDoctorNotification = async (
  doctorId: string,
  notification: Omit<DoctorNotification, 'id' | 'timestamp' | 'read'>
) => {
  try {
    const notificationsRef = collection(db!, COLLECTION_NAME, doctorId, SUB_COLLECTION_NAME);

    await addDoc(notificationsRef, {
      ...notification,
      timestamp: Timestamp.now(),
      read: false
    });
    return true;
  } catch (error) {
    console.error('Error adding doctor notification:', error);
    return false;
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationRead = async (doctorId: string, notificationId: string) => {
  try {
    const notificationRef = doc(db!, COLLECTION_NAME, doctorId, SUB_COLLECTION_NAME, notificationId);
    await updateDoc(notificationRef, {
      read: true
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

/**
 * Mark all notifications as read for a doctor
 */
export const markAllNotificationsRead = async (doctorId: string, notificationIds: string[]) => {
  try {
    const batch = writeBatch(db!);

    notificationIds.forEach(id => {
      const notificationRef = doc(db!, COLLECTION_NAME, doctorId, SUB_COLLECTION_NAME, id);
      batch.update(notificationRef, { read: true });
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};

/**
 * Delete a notification
 */
export const deleteDoctorNotification = async (doctorId: string, notificationId: string) => {
  try {
    const notificationRef = doc(db!, COLLECTION_NAME, doctorId, SUB_COLLECTION_NAME, notificationId);
    await deleteDoc(notificationRef);
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
};

/**
 * Subscribe to real-time notifications for a doctor
 */
export const subscribeToDoctorNotifications = (
  doctorId: string,
  callback: (notifications: DoctorNotification[]) => void,
  maxResults = 50
) => {
  if (!db) return () => {};

  const notificationsRef = collection(db!, COLLECTION_NAME, doctorId, SUB_COLLECTION_NAME);
  const q = query(
    notificationsRef,
    orderBy('timestamp', 'desc'),
    limit(maxResults)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure timestamp is always valid (handle serverTimestamp latency)
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date()
      } as DoctorNotification;
    });
    callback(notifications);
  }, (error) => {
    console.error('Error subscribing to doctor notifications:', error);
  });
};
