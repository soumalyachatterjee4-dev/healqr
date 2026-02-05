import { Schedule } from '../../types/doctor';
/**
 * Firestore Database Service
 * 
 * Handles all database operations for HealQR platform
 */

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  QueryConstraint,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './config';
import { COLLECTIONS, Doctor, Patient, Booking, Transaction, Notification, Review } from './collections';

// ============================================
// DATABASE SERVICE
// ============================================

export class DatabaseService {
  /**
   * Link a doctor to a clinic (updates both doctor and clinic records)
   */
  static async linkDoctorToClinic(doctorId: string, clinicId: string): Promise<void> {
    try {
      // Update doctor: add clinicId to linkedClinics, set profileType if needed
      const doctorRef = doc(db, COLLECTIONS.DOCTORS, doctorId);
      const doctorSnap = await getDoc(doctorRef);
      if (!doctorSnap.exists()) throw new Error('Doctor not found');
      const doctorData = doctorSnap.data();
      const linkedClinics = Array.isArray(doctorData.linkedClinics) ? doctorData.linkedClinics : [];
      if (!linkedClinics.includes(clinicId)) linkedClinics.push(clinicId);
      let profileType = doctorData.profileType || 'solo';
      if (profileType === 'solo') profileType = 'solo+clinic';
      if (!doctorData.qrCode && profileType !== 'clinic-only') {
        // Optionally generate QR here if needed
      }
      await updateDoc(doctorRef, { linkedClinics, profileType });

      // Update clinic: add doctorId to linkedDoctors
      const clinicRef = doc(db, COLLECTIONS.CLINICS, clinicId);
      const clinicSnap = await getDoc(clinicRef);
      if (!clinicSnap.exists()) throw new Error('Clinic not found');
      const clinicData = clinicSnap.data();
      const linkedDoctors = Array.isArray(clinicData.linkedDoctors) ? clinicData.linkedDoctors : [];
      if (!linkedDoctors.includes(doctorId)) linkedDoctors.push(doctorId);
      await updateDoc(clinicRef, { linkedDoctors });
    } catch (error) {
      console.error('❌ Error linking doctor to clinic:', error);
      throw error;
    }
  }

  /**
   * Unlink a doctor from a clinic (updates both doctor and clinic records)
   */
  static async unlinkDoctorFromClinic(doctorId: string, clinicId: string): Promise<void> {
    try {
      // Update doctor: remove clinicId from linkedClinics
      const doctorRef = doc(db, COLLECTIONS.DOCTORS, doctorId);
      const doctorSnap = await getDoc(doctorRef);
      if (!doctorSnap.exists()) throw new Error('Doctor not found');
      const doctorData = doctorSnap.data();
      const linkedClinics = (doctorData.linkedClinics || []).filter((id: string) => id !== clinicId);
      let profileType = doctorData.profileType;
      if (profileType === 'solo+clinic' && linkedClinics.length === 0) profileType = 'solo';
      await updateDoc(doctorRef, { linkedClinics, profileType });

      // Update clinic: remove doctorId from linkedDoctors
      const clinicRef = doc(db, COLLECTIONS.CLINICS, clinicId);
      const clinicSnap = await getDoc(clinicRef);
      if (!clinicSnap.exists()) throw new Error('Clinic not found');
      const clinicData = clinicSnap.data();
      const linkedDoctors = (clinicData.linkedDoctors || []).filter((id: string) => id !== doctorId);
      await updateDoc(clinicRef, { linkedDoctors });
    } catch (error) {
      console.error('❌ Error unlinking doctor from clinic:', error);
      throw error;
    }
  }

  /**
   * Add a clinic schedule for a doctor (with conflict check)
   */
  static async addClinicSchedule(doctorId: string, clinicId: string, schedule: Schedule): Promise<void> {
    const hasConflict = await this.checkScheduleConflict(doctorId, schedule, clinicId);
    if (hasConflict) throw new Error('There is another schedule at this time.');
    // Add schedule to doctor
    const doctorRef = doc(db, COLLECTIONS.DOCTORS, doctorId);
    const doctorSnap = await getDoc(doctorRef);
    if (!doctorSnap.exists()) throw new Error('Doctor not found');
    const doctorData = doctorSnap.data();
    let clinicSchedules = Array.isArray(doctorData.clinicSchedules) ? doctorData.clinicSchedules : [];
    let found = false;
    clinicSchedules = clinicSchedules.map((entry: any) => {
      if (entry.clinicId === clinicId) {
        found = true;
        return { ...entry, schedules: [...entry.schedules, schedule] };
      }
      return entry;
    });
    if (!found) clinicSchedules.push({ clinicId, schedules: [schedule] });
    await updateDoc(doctorRef, { clinicSchedules });
    // Add schedule to clinic
    const clinicRef = doc(db, COLLECTIONS.CLINICS, clinicId);
    const clinicSnap = await getDoc(clinicRef);
    if (!clinicSnap.exists()) throw new Error('Clinic not found');
    const clinicData = clinicSnap.data();
    let clinicSchedulesArr = Array.isArray(clinicData.clinicSchedules) ? clinicData.clinicSchedules : [];
    let foundDoc = false;
    clinicSchedulesArr = clinicSchedulesArr.map((entry: any) => {
      if (entry.doctorId === doctorId) {
        foundDoc = true;
        return { ...entry, schedules: [...entry.schedules, schedule] };
      }
      return entry;
    });
    if (!foundDoc) clinicSchedulesArr.push({ doctorId, schedules: [schedule] });
    await updateDoc(clinicRef, { clinicSchedules: clinicSchedulesArr });
  }

  /**
   * Add a solo schedule for a doctor (with conflict check)
   */
  static async addSoloSchedule(doctorId: string, schedule: Schedule): Promise<void> {
    const hasConflict = await this.checkScheduleConflict(doctorId, schedule);
    if (hasConflict) throw new Error('There is another schedule at this time.');
    const doctorRef = doc(db, COLLECTIONS.DOCTORS, doctorId);
    const doctorSnap = await getDoc(doctorRef);
    if (!doctorSnap.exists()) throw new Error('Doctor not found');
    const doctorData = doctorSnap.data();
    let soloSchedule = Array.isArray(doctorData.soloSchedule) ? doctorData.soloSchedule : [];
    soloSchedule.push(schedule);
    await updateDoc(doctorRef, { soloSchedule });
  }

  /**
   * Check for schedule conflicts (solo and all clinics)
   */
  static async checkScheduleConflict(doctorId: string, newSchedule: Schedule, clinicId?: string): Promise<boolean> {
    const doctor = await this.getDoctor(doctorId);
    if (!doctor) throw new Error('Doctor not found');
    // Check solo schedules
    const soloSchedules = Array.isArray(doctor.soloSchedule) ? doctor.soloSchedule : [];
    for (const sched of soloSchedules) {
      if (this.schedulesOverlap(sched, newSchedule)) return true;
    }
    // Check all clinic schedules
    const clinicSchedules = Array.isArray(doctor.clinicSchedules) ? doctor.clinicSchedules : [];
    for (const entry of clinicSchedules) {
      if (clinicId && entry.clinicId === clinicId) continue; // skip current clinic if editing
      for (const sched of entry.schedules) {
        if (this.schedulesOverlap(sched, newSchedule)) return true;
      }
    }
    return false;
  }

  /**
   * Utility: Check if two schedules overlap
   */
  private static schedulesOverlap(a: Schedule, b: Schedule): boolean {
    if (a.day !== b.day) return false;
    // Compare time ranges (assume 'HH:mm' format)
    const [aStart, aEnd] = [a.startTime, a.endTime];
    const [bStart, bEnd] = [b.startTime, b.endTime];
    return (aStart < bEnd && bStart < aEnd);
  }
  // ==========================================
  // DOCTOR OPERATIONS
  // ==========================================

  /**
   * Get doctor by ID
   */
  static async getDoctor(doctorId: string): Promise<Doctor | null> {
    try {
      const docRef = doc(db, COLLECTIONS.DOCTORS, doctorId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Doctor;
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching doctor:', error);
      throw error;
    }
  }

  /**
   * Update doctor profile
   */
  static async updateDoctor(doctorId: string, data: Partial<Doctor>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.DOCTORS, doctorId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('❌ Error updating doctor:', error);
      throw error;
    }
  }

  /**
   * Activate premium add-on for doctor
   */
  static async activateAddon(
    doctorId: string,
    addonId: string,
    expiryDate: Date
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.DOCTORS, doctorId);
      await updateDoc(docRef, {
        activeAddons: arrayUnion(addonId),
        [`addonExpiry.${addonId}`]: Timestamp.fromDate(expiryDate),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('❌ Error activating add-on:', error);
      throw error;
    }
  }

  /**
   * Update subscription plan
   */
  static async updateSubscription(
    doctorId: string,
    subscriptionData: Partial<Doctor['subscription']>
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.DOCTORS, doctorId);
      const updates: any = { updatedAt: serverTimestamp() };
      
      Object.entries(subscriptionData).forEach(([key, value]) => {
        updates[`subscription.${key}`] = value;
      });
      
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('❌ Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Increment booking count
   */
  static async incrementBookingCount(doctorId: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.DOCTORS, doctorId);
      await updateDoc(docRef, {
        'subscription.bookingsUsed': increment(1),
        'stats.totalBookings': increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('❌ Error incrementing booking count:', error);
      throw error;
    }
  }

  /**
   * Add to top-up vault
   */
  static async addToVault(doctorId: string, bookings: number): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.DOCTORS, doctorId);
      await updateDoc(docRef, {
        'subscription.topUpVault': increment(bookings),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('❌ Error adding to vault:', error);
      throw error;
    }
  }

  // ==========================================
  // PATIENT OPERATIONS
  // ==========================================

  /**
   * Create or update patient
   */
  static async upsertPatient(patientData: Partial<Patient>): Promise<string> {
    try {
      const patientId = patientData.id || doc(collection(db, COLLECTIONS.PATIENTS)).id;
      const docRef = doc(db, COLLECTIONS.PATIENTS, patientId);
      
      await setDoc(docRef, {
        ...patientData,
        id: patientId,
        updatedAt: serverTimestamp(),
        createdAt: patientData.createdAt || serverTimestamp(),
      }, { merge: true });
      
      return patientId;
    } catch (error) {
      console.error('❌ Error upserting patient:', error);
      throw error;
    }
  }

  /**
   * Get patient by phone number
   */
  static async getPatientByPhone(phoneNumber: string): Promise<Patient | null> {
    try {
      const q = query(
        collection(db, COLLECTIONS.PATIENTS),
        where('phoneNumber', '==', phoneNumber),
        limit(1)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Patient;
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching patient:', error);
      throw error;
    }
  }

  // ==========================================
  // BOOKING OPERATIONS
  // ==========================================

  /**
   * Create a new booking
   */
  static async createBooking(bookingData: Partial<Booking>): Promise<string> {
    try {
      const bookingId = doc(collection(db, COLLECTIONS.BOOKINGS)).id;
      const bookingNumber = this.generateBookingNumber();
      
      const docRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
      await setDoc(docRef, {
        ...bookingData,
        id: bookingId,
        bookingNumber,
        status: 'confirmed',
        consultationCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Increment doctor's booking count
      if (bookingData.doctorId) {
        await this.incrementBookingCount(bookingData.doctorId);
      }
      
      return bookingId;
    } catch (error) {
      console.error('❌ Error creating booking:', error);
      throw error;
    }
  }

  /**
   * Get bookings for a doctor
   */
  static async getDoctorBookings(
    doctorId: string,
    status?: string,
    limitCount: number = 50
  ): Promise<Booking[]> {
    try {
      const constraints: QueryConstraint[] = [
        where('doctorId', '==', doctorId),
        orderBy('bookingDate', 'desc'),
        limit(limitCount),
      ];
      
      if (status) {
        constraints.push(where('status', '==', status));
      }
      
      const q = query(collection(db, COLLECTIONS.BOOKINGS), ...constraints);
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    } catch (error) {
      console.error('❌ Error fetching doctor bookings:', error);
      throw error;
    }
  }

  /**
   * Update booking status
   */
  static async updateBookingStatus(
    bookingId: string,
    status: Booking['status'],
    additionalData?: Partial<Booking>
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
      await updateDoc(docRef, {
        status,
        ...additionalData,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('❌ Error updating booking status:', error);
      throw error;
    }
  }

  /**
   * Generate unique booking number
   */
  private static generateBookingNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BK${timestamp.slice(-8)}${random}`;
  }

  // ==========================================
  // TRANSACTION OPERATIONS
  // ==========================================

  /**
   * Create a transaction record
   */
  static async createTransaction(transactionData: Partial<Transaction>): Promise<string> {
    try {
      const transactionId = doc(collection(db, COLLECTIONS.TRANSACTIONS)).id;
      const docRef = doc(db, COLLECTIONS.TRANSACTIONS, transactionId);
      
      await setDoc(docRef, {
        ...transactionData,
        id: transactionId,
        currency: 'INR',
        status: transactionData.status || 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return transactionId;
    } catch (error) {
      console.error('❌ Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Update transaction status
   */
  static async updateTransactionStatus(
    transactionId: string,
    status: Transaction['status'],
    paymentData?: Partial<Transaction>
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.TRANSACTIONS, transactionId);
      await updateDoc(docRef, {
        status,
        ...paymentData,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('❌ Error updating transaction:', error);
      throw error;
    }
  }

  /**
   * Get transactions for a doctor
   */
  static async getDoctorTransactions(
    doctorId: string,
    limitCount: number = 50
  ): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.TRANSACTIONS),
        where('doctorId', '==', doctorId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
      throw error;
    }
  }

  // ==========================================
  // NOTIFICATION OPERATIONS
  // ==========================================

  /**
   * Create a notification
   */
  static async createNotification(notificationData: Partial<Notification>): Promise<string> {
    try {
      const notificationId = doc(collection(db, COLLECTIONS.NOTIFICATIONS)).id;
      const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
      
      await setDoc(docRef, {
        ...notificationData,
        id: notificationId,
        read: false,
        createdAt: serverTimestamp(),
      });
      
      return notificationId;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationRead(notificationId: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
      await updateDoc(docRef, {
        read: true,
        readAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }

  // ==========================================
  // REVIEW OPERATIONS
  // ==========================================

  /**
   * Create a review
   */
  static async createReview(reviewData: Partial<Review>): Promise<string> {
    try {
      const reviewId = doc(collection(db, COLLECTIONS.REVIEWS)).id;
      const docRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
      
      await setDoc(docRef, {
        ...reviewData,
        id: reviewId,
        verified: true,
        published: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Update doctor's average rating
      if (reviewData.doctorId) {
        await this.updateDoctorRating(reviewData.doctorId);
      }
      
      return reviewId;
    } catch (error) {
      console.error('❌ Error creating review:', error);
      throw error;
    }
  }

  /**
   * Update doctor's average rating
   */
  private static async updateDoctorRating(doctorId: string): Promise<void> {
    try {
      // Get all reviews for doctor
      const q = query(
        collection(db, COLLECTIONS.REVIEWS),
        where('doctorId', '==', doctorId),
        where('published', '==', true)
      );
      
      const snapshot = await getDocs(q);
      const reviews = snapshot.docs.map(doc => doc.data() as Review);
      
      if (reviews.length === 0) return;
      
      // Calculate average rating
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;
      
      // Update doctor document
      const docRef = doc(db, COLLECTIONS.DOCTORS, doctorId);
      await updateDoc(docRef, {
        'stats.averageRating': Math.round(averageRating * 10) / 10,
        'stats.totalReviews': reviews.length,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('❌ Error updating doctor rating:', error);
    }
  }

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================

  /**
   * Check if doctor has available bookings
   */
  static async hasAvailableBookings(doctorId: string): Promise<boolean> {
    try {
      const doctor = await this.getDoctor(doctorId);
      if (!doctor) return false;
      
      const { subscription } = doctor;
      const totalAvailable = subscription.bookingsLimit + subscription.topUpVault;
      
      return subscription.bookingsUsed < totalAvailable;
    } catch (error) {
      console.error('❌ Error checking available bookings:', error);
      return false;
    }
  }

  /**
   * Get remaining bookings for doctor
   */
  static async getRemainingBookings(doctorId: string): Promise<number> {
    try {
      const doctor = await this.getDoctor(doctorId);
      if (!doctor) return 0;
      
      const { subscription } = doctor;
      const totalAvailable = subscription.bookingsLimit + subscription.topUpVault;
      const remaining = totalAvailable - subscription.bookingsUsed;
      
      return Math.max(0, remaining);
    } catch (error) {
      console.error('❌ Error getting remaining bookings:', error);
      return 0;
    }
  }
}
