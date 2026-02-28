// 📜 NOTIFICATION HISTORY SERVICE
// Stores last 10 notifications per patient for history tracking
import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { app } from '../lib/firebase/config';

const db = getFirestore(app!);

export interface NotificationRecord {
  id?: string;
  patientPhone: string;
  patientName: string;
  age?: string;
  sex?: string;
  purpose?: string;
  doctorName: string;
  clinicName?: string;
  chamber?: string;
  notificationType: 'booking_confirmed' | 'appointment_confirmed' | 'consultation_completed' | 'reminder' | 'cancelled' | 'restored' | 'follow_up' | 'review_request' | 'prescription_ready' | 'video_call_link';
  bookingStatus: 'confirmed' | 'cancelled' | 'dropout' | 'completed';
  notificationStatus: 'delivered' | 'failed' | 'not_allowed' | 'pending' | 'sent'; // 'sent' kept for backward compatibility
  deliveryStatus?: 'push_sent' | 'push_failed' | 'permission_denied' | 'no_token' | 'saved_only'; // New: detailed delivery status
  failureReason?: string; // New: reason for failure
  messageId?: string;
  timestamp: Date;
  consultationDate: string;
  consultationTime: string;
  serialNumber?: string;
  bookingId?: string;
  message?: string;
  nextSteps?: string[];
  queuePosition?: number;
  doctorId?: string;
  isWalkIn?: boolean;
  walkInVerified?: boolean;
  language?: string;

  // 🆕 120-DAY TEMPLATE STORAGE
  templateType?: 'consultation_completed' | 'review_request' | 'prescription_ready' | 'appointment_cancelled' | 'follow_up' | 'appointment_reminder';
  templateData?: {
    greeting?: string;
    mainMessage?: string;
    consultationDetails?: {
      date?: string;
      time?: string;
      chamber?: string;
    };
    nextSteps?: string[];
    actionButtons?: Array<{
      type: 'rate' | 'download' | 'book' | 'reschedule';
      label: string;
      enabled: boolean;
    }>;
    adBanner?: {
      imageUrl?: string;
      sponsorName?: string;
      clickUrl?: string;
      placement?: string;
    };
    cancellationReason?: string;
    followUpDays?: number;
  };
  doctorPhoto?: string;
  doctorSpecialty?: string;
  doctorInitials?: string;
  prescriptionUrls?: string[];
  decodedRxText?: string;
  ocrConfidence?: number;

  // 🆕 INTERACTIVE USER ACTIONS
  userActions?: {
    reviewSubmitted?: boolean;
    reviewRating?: number;
    reviewComment?: string;
    reviewedAt?: Date;
    downloadedAt?: Date;
    downloadCount?: number;
    opened?: boolean;
    openedAt?: Date;
  };

  // 🆕 120-DAY EXPIRY
  expiresAt?: Date;
  isExpired?: boolean;
  readStatus?: boolean;
  bookingSource?: string; // 🔑 Source of booking ('clinic_qr', 'doctor_qr', 'walkin')
}

export interface ConsultationHistory {
  bookingId: string;
  patientPhone: string;
  patientName: string;
  age?: string;
  sex?: string;
  purpose?: string;
  doctorName: string;
  clinicName?: string;
  chamber?: string;
  consultationDate: string;
  consultationTime: string;
  serialNumber?: string;
  currentStatus: 'confirmed' | 'cancelled' | 'dropout' | 'completed';
  timestamp: Date;
  isWalkIn?: boolean; // Whether patient is walk-in
  verificationMethod?: 'qr_scan' | 'manual_override'; // How patient was verified
  notifications: {
    reminder?: { status: 'delivered' | 'failed' | 'not_allowed' | 'pending' | 'sent'; timestamp?: Date };
    appointmentConfirmed?: { status: 'delivered' | 'failed' | 'not_allowed' | 'pending' | 'sent'; timestamp?: Date };
    consultationCompleted?: { status: 'delivered' | 'failed' | 'not_allowed' | 'pending' | 'sent'; timestamp?: Date };
    cancelled?: { status: 'delivered' | 'failed' | 'not_allowed' | 'pending' | 'sent'; timestamp?: Date };
    restored?: { status: 'delivered' | 'failed' | 'not_allowed' | 'pending' | 'sent'; timestamp?: Date };
    followUp?: { status: 'delivered' | 'failed' | 'not_allowed' | 'pending' | 'sent'; timestamp?: Date };
    reviewRequest?: { status: 'delivered' | 'failed' | 'not_allowed' | 'pending' | 'sent'; timestamp?: Date };
  };
  bookingSource?: string; // 🔑 Source of booking
}

/**
 * Save notification to history (auto-delete oldest if > 10 records)
 */
export const saveNotificationHistory = async (record: Omit<NotificationRecord, 'id'>): Promise<void> => {
  try {
    console.log('💾 saveNotificationHistory called with:', {
      patientPhone: record.patientPhone,
      patientName: record.patientName,
      doctorId: record.doctorId,
      doctorName: record.doctorName,
      notificationType: record.notificationType,
      bookingStatus: record.bookingStatus
    });

    // Normalize phone number
    const phone10 = record.patientPhone.replace(/\D/g, '').slice(-10);
    console.log('📞 Normalized phone:', phone10);

    // Remove ALL undefined fields to prevent Firestore errors (generically)
    const cleanRecord = { ...record } as any;
    Object.keys(cleanRecord).forEach(key => {
      if (cleanRecord[key] === undefined) {
        delete cleanRecord[key];
      }
    });

    const docToSave = {
      ...cleanRecord,
      patientPhone: phone10,
      timestamp: Timestamp.fromDate(record.timestamp),
      createdAt: Timestamp.now()
    };

    console.log('📝 Document to save:', docToSave);

    // Save new notification
    const docRef = await addDoc(collection(db, 'notificationHistory'), docToSave);
    console.log('✅ Notification history saved successfully!', {
      docId: docRef.id,
      phone: phone10,
      doctorId: record.doctorId
    });

    // Delete old records (keep last 10)
    await cleanupOldNotifications(phone10);
  } catch (error) {
    console.error('❌ Failed to save notification history:', error);
    const err = error as Error;
    console.error('Error details:', {
      name: err.name || 'Unknown',
      message: err.message || String(error),
      stack: err.stack || 'No stack trace'
    });
    // Non-critical error - don't throw
  }
};

/**
 * Delete notifications older than 120 days (instead of keeping last 10)
 */
const cleanupOldNotifications = async (patientPhone: string): Promise<void> => {
  try {
    const RETENTION_DAYS = 120;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    const q = query(
      collection(db, 'notificationHistory'),
      where('patientPhone', '==', patientPhone),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    const docs = snapshot.docs;

    // Delete notifications older than 120 days
    const toDelete = docs.filter(doc => {
      const timestamp = doc.data().timestamp?.toDate() || new Date(0);
      return timestamp < cutoffDate;
    });

    if (toDelete.length > 0) {
      for (const docToDelete of toDelete) {
        await deleteDoc(doc(db, 'notificationHistory', docToDelete.id));
      }
      console.log(`🗑️ Deleted ${toDelete.length} notifications older than ${RETENTION_DAYS} days for ${patientPhone}`);
    }
  } catch (error) {
    console.error('❌ Failed to cleanup old notifications:', error);
  }
};

/**
 * Get notification history for a patient (last 10)
 */
export const getPatientNotificationHistory = async (patientPhone: string): Promise<NotificationRecord[]> => {
  try {
    const phone10 = patientPhone.replace(/\D/g, '').slice(-10);

    const q = query(
      collection(db, 'notificationHistory'),
      where('patientPhone', '==', phone10),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate() || new Date(),
      } as NotificationRecord;
    });
  } catch (error) {
    console.error('❌ Failed to fetch notification history:', error);
    return [];
  }
};

/**
 * Get notification history for a doctor (all their patients)
 */
export const getDoctorNotificationHistory = async (doctorId: string): Promise<NotificationRecord[]> => {
  try {
    const q = query(
      collection(db, 'notificationHistory'),
      where('doctorId', '==', doctorId),
      orderBy('timestamp', 'desc'),
      limit(100) // Last 100 notifications for doctor
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate() || new Date(),
      } as NotificationRecord;
    });
  } catch (error) {
    console.error('❌ Failed to fetch doctor notification history:', error);
    return [];
  }
};

/**
 * Search patient consultation history (grouped by bookingId)
 */
export const searchPatientConsultationHistory = async (patientPhone: string, doctorId?: string): Promise<ConsultationHistory[]> => {
  try {
    const phone10 = patientPhone.replace(/\D/g, '').slice(-10);

    console.log('🔍 searchPatientConsultationHistory called with:', {
      originalPhone: patientPhone,
      normalized: phone10,
      doctorId: doctorId,
      hasDoctorId: !!doctorId
    });

    let q;
    if (doctorId) {
      q = query(
        collection(db, 'notificationHistory'),
        where('patientPhone', '==', phone10),
        where('doctorId', '==', doctorId),
        orderBy('timestamp', 'desc')
      );
    } else {
      q = query(
        collection(db, 'notificationHistory'),
        where('patientPhone', '==', phone10),
        orderBy('timestamp', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate() || new Date(),
      } as NotificationRecord;
    });

    console.log('📊 Raw records fetched:', records.length);

    // Group by bookingId with improved deduplication
    const consultationMap = new Map<string, ConsultationHistory>();

    /**
     * 🛡️ ROBUST & TIMEZONE-SAFE DATE NORMALIZATION
     * Converts "Thursday, 12 February 2026", "12/02/2026", "2026-02-12" -> "2026-02-12"
     * Uses local components to avoid UTC shifts.
     */
    const parseToISODate = (dateStr: string | undefined): string => {
      if (!dateStr) return '';

      try {
        let d = new Date(dateStr);

        if (isNaN(d.getTime())) {
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
          } else {
            const cleaned = dateStr.replace(/^[A-Za-z]+,\s*/, '').trim();
            d = new Date(cleaned);
          }
        }

        if (!isNaN(d.getTime())) {
          // 🛡️ FIX: Use local components to avoid UTC day-shifts
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      } catch (e) {
        console.warn('⚠️ Date normalization failed for:', dateStr);
      }
      return dateStr.toLowerCase().trim();
    };

    // Helper to normalize time format for comparison (e.g., "07:24 pm" -> "07:24 PM")
    const normalizeTime = (time: string | undefined): string => {
      if (!time) return '';
      return time.toLowerCase().trim().replace(/\s+/g, ' ');
    };

    records.forEach((record, index) => {
      try {
        const normalizedDate = parseToISODate(record.consultationDate);
        const bookingId = record.bookingId?.trim();

        // 🛡️ ULTRA-ROBUST KEY GENERATION
        // We need a stable key for this consultation day
        let groupKey = '';

        // Case A: We have a bookingId, check if it already exists as a key or inside an entry
        if (bookingId) {
          if (consultationMap.has(bookingId)) {
            groupKey = bookingId;
          } else {
            // Check if any existing entry (keyed by date) has this bookingId
            for (const [key, existing] of consultationMap.entries()) {
              if (existing.bookingId === bookingId) {
                groupKey = key;
                break;
              }
            }
          }
        }

        // Case B: No bookingId match found, try matching by Date
        if (!groupKey && normalizedDate) {
          if (consultationMap.has(normalizedDate)) {
            groupKey = normalizedDate;
          } else {
            // Check if any existing entry (keyed by bookingId) has this date
            for (const [key, existing] of consultationMap.entries()) {
              if (parseToISODate(existing.consultationDate) === normalizedDate) {
                groupKey = key;
                break;
              }
            }
          }
        }

        // Case C: Final Fallback - Create new key
        if (!groupKey) {
          groupKey = bookingId || normalizedDate || `unknown_${index}_${Date.now()}`;
        }

        // 🏗️ ENSURE CONSULTATION OBJECT EXISTS
        if (!consultationMap.has(groupKey)) {
          consultationMap.set(groupKey, {
            bookingId: record.bookingId || groupKey,
            patientPhone: record.patientPhone || phone10,
            patientName: record.patientName || 'Unknown Patient',
            age: record.age,
            sex: record.sex,
            purpose: record.purpose,
            doctorName: record.doctorName || 'Doctor',
            clinicName: record.clinicName,
            chamber: record.chamber,
            consultationDate: record.consultationDate || normalizedDate,
            consultationTime: record.consultationTime,
            serialNumber: record.serialNumber,
            currentStatus: record.bookingStatus || 'confirmed',
            timestamp: record.timestamp || new Date(),
            isWalkIn: record.isWalkIn,
            bookingSource: record.bookingSource, // 🔑 Map booking source
            verificationMethod: record.isWalkIn
              ? (record.walkInVerified ? 'qr_scan' : 'manual_override')
              : 'qr_scan',
            notifications: {}
          });
        }

        const consultation = consultationMap.get(groupKey);

        // 🚨 FINAL SAFETY CHECK
        if (!consultation) {
          console.warn('⚠️ Skipping record due to failed map retrieval:', { groupKey, bookingId, normalizedDate });
          return;
        }

        // Update patient details if available (prioritize non-generic values)
        const isGenericPurpose = (p: string | undefined) => {
          if (!p) return true;
          const lower = String(p).toLowerCase().trim();
          return ['in-person', 'in person', 'video', 'video consultation', 'consultation', 'visit', 'checkup', 'check-up', 'new-patient'].includes(lower);
        };

        const hasValue = (val: any) => val !== undefined && val !== null && String(val).trim() !== '';

        // Merging logic
        if (!hasValue(consultation.age) && hasValue(record.age)) consultation.age = record.age;
        if (!hasValue(consultation.sex) && hasValue(record.sex)) consultation.sex = record.sex;

        if (!hasValue(consultation.purpose) && hasValue(record.purpose)) {
          consultation.purpose = record.purpose;
        } else if (isGenericPurpose(consultation.purpose) && hasValue(record.purpose) && !isGenericPurpose(record.purpose)) {
          consultation.purpose = record.purpose;
        }

        if (!hasValue(consultation.chamber) && hasValue(record.chamber)) consultation.chamber = record.chamber;
        if (!hasValue(consultation.clinicName) && hasValue(record.clinicName)) consultation.clinicName = record.clinicName;
        if (!hasValue(consultation.serialNumber) && hasValue(record.serialNumber)) consultation.serialNumber = record.serialNumber;

        // Aggregate notification statuses
        const notifStatus = { status: record.notificationStatus, timestamp: record.timestamp };
        switch (record.notificationType) {
          case 'reminder': consultation.notifications.reminder = notifStatus; break;
          case 'appointment_confirmed':
          case 'booking_confirmed': consultation.notifications.appointmentConfirmed = notifStatus; break;
          case 'consultation_completed': consultation.notifications.consultationCompleted = notifStatus; break;
          case 'cancelled': consultation.notifications.cancelled = notifStatus; break;
          case 'restored': consultation.notifications.restored = notifStatus; break;
          case 'follow_up': consultation.notifications.followUp = notifStatus; break;
          case 'review_request': consultation.notifications.reviewRequest = notifStatus; break;
        }
      } catch (innerError) {
        console.error('⚠️ Skipping problematic record:', record.id, innerError);
      }
    });

    // HISTORY RULE: Show consultations from YESTERDAY and before, NOT TODAY
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to midnight

    // Helper function to normalize date for comparison
    const isSameDate = (dateStr: string | undefined): boolean => {
      if (!dateStr) return false;

      // Try parsing various date formats
      // Format 1: "2026-01-26" (YYYY-MM-DD)
      // Format 2: "26/01/2026" (DD/MM/YYYY)
      // Format 3: "26-01-2026" (DD-MM-YYYY)
      // Format 4: "Monday, 26 January 2026" (Day, DD Month YYYY)
      // Format 5: "26 January 2026" (DD Month YYYY)

      let consultDate: Date | null = null;

      if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
        // YYYY-MM-DD format
        consultDate = new Date(dateStr);
      } else if (dateStr.includes('/')) {
        // DD/MM/YYYY format
        const parts = dateStr.split('/');
        consultDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else if (dateStr.includes('-')) {
        // DD-MM-YYYY format
        const parts = dateStr.split('-');
        consultDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        // Try parsing natural language dates like "Monday, 26 January 2026" or "26 January 2026"
        // Remove day name if present (e.g., "Monday, ")
        const cleanedDate = dateStr.replace(/^[A-Za-z]+,\s*/, '');
        consultDate = new Date(cleanedDate);
      }

      if (!consultDate || isNaN(consultDate.getTime())) return false;

      consultDate.setHours(0, 0, 0, 0);
      return consultDate.getTime() === today.getTime();
    };

    const filteredConsultations = Array.from(consultationMap.values()).filter(consultation => {
      const consultationDateStr = consultation.consultationDate;

      // If no date, exclude it
      if (!consultationDateStr) {
        console.log('⚠️ Consultation has no date, excluding:', consultation.patientName);
        return false;
      }

      const isTodayDate = isSameDate(consultationDateStr);

      // Debug logging for TODAY's check
      if (isTodayDate) {
        console.log('🚫 EXCLUDING TODAY\'S appointment:', {
          patient: consultation.patientName,
          consultationDate: consultationDateStr,
          today: today.toISOString().split('T')[0]
        });
      }

      // EXCLUDE all today's appointments - they become history from tomorrow
      // INCLUDE all past appointments (yesterday and before)
      return !isTodayDate;
    })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    console.log('✅ Total consultations:', consultationMap.size, '| History (past only):', filteredConsultations.length);
    return filteredConsultations;

  } catch (error) {
    const err = error as Error;
    console.error('❌ Failed to search patient consultation history:', err?.message || 'Unknown error');
    return [];
  }
};

/**
 * Search patient history by phone number (for doctor dashboard)
 */
export const searchPatientHistory = async (patientPhone: string, doctorId?: string): Promise<NotificationRecord[]> => {
  try {
    const phone10 = patientPhone.replace(/\D/g, '').slice(-10);

    console.log('🔍 searchPatientHistory called with:', {
      originalPhone: patientPhone,
      normalized: phone10,
      doctorId: doctorId,
      hasDoctorId: !!doctorId
    });

    let q;
    if (doctorId) {
      // Doctor-specific search
      console.log('📊 Building doctor-specific query:', {
        collection: 'notificationHistory',
        where1: `patientPhone == ${phone10}`,
        where2: `doctorId == ${doctorId}`,
        orderBy: 'timestamp desc',
        limit: 50
      });

      q = query(
        collection(db, 'notificationHistory'),
        where('patientPhone', '==', phone10),
        where('doctorId', '==', doctorId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
    } else {
      // Patient-side: all doctors
      console.log('📊 Building patient-side query:', {
        collection: 'notificationHistory',
        where: `patientPhone == ${phone10}`,
        orderBy: 'timestamp desc',
        limit: 50
      });

      q = query(
        collection(db, 'notificationHistory'),
        where('patientPhone', '==', phone10),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
    }

    console.log('⏳ Executing Firestore query...');
    const snapshot = await getDocs(q);
    console.log('✅ Query completed:', {
      docsFound: snapshot.docs.length,
      empty: snapshot.empty
    });

    if (snapshot.docs.length > 0) {
      console.log('📄 First record sample:', snapshot.docs[0].data());
    }

    const results = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate() || new Date(),
      } as NotificationRecord;
    });

    console.log('✅ Returning results:', results.length);
    return results;
  } catch (error) {
    console.error('❌ Failed to search patient history:', error);
    const err = error as Error;
    console.error('Error details:', {
      name: err.name || 'Unknown',
      message: err.message || String(error),
      stack: err.stack || 'No stack trace'
    });
    return [];
  }
};
