import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import BookingFlowLayout from './BookingFlowLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ArrowLeft, CreditCard, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';


import { PatientRxUploadModal } from './PatientRxUploadModal';
import TemplateDisplay from './TemplateDisplay';
import { db } from '../lib/firebase/config';
import { doc, getDoc, addDoc, collection, updateDoc, increment, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import { requestNotificationPermission } from '../services/fcm.service';
import { generateBookingId } from '../utils/idGenerator';
import type { Language } from '../utils/translations';
import { normalizePatientName, normalizeIndicNumerals } from '../utils/translations';
import { encrypt } from '../utils/encryptionService';
import { saveNotificationHistory } from '../services/notificationHistoryService';
import { scheduleBookingReminder } from '../services/notificationService';

interface PatientDetailsFormProps {
  onBack: () => void;
  onSubmit: (data: PatientFormData) => void;
  // Payment related props
  requiresPrepayment?: boolean;
  consultationFee?: number;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorPhoto?: string;
  doctorQRCode?: string;
  doctorUPI?: string;
  consultationType?: 'video' | 'chamber'; // Add consultation type
  // Booking details
  doctorId?: string;
  selectedDate?: Date;
  selectedTime?: string;
  selectedChamber?: string;
  selectedChamberId?: number;
  bookingType?: 'qr_booking' | 'walkin_booking';
  doctorDegrees?: string[];
  isTestMode?: boolean; // Skip database operations in test mode
  useDrPrefix?: boolean;
  themeColor?: 'emerald' | 'blue';
  isClinicBooking?: boolean;
  language?: Language;
}

export interface PatientFormData {
  patientName: string;
  whatsappNumber: string;
  age: string;
  gender: string;
  purposeOfVisit: string;
  consent1: boolean;
  consent2: boolean;
  paymentStatus?: 'not_required' | 'paid' | 'pay_later' | 'pending' | 'completed';
  utrNumber?: string;
  prescriptionUrl?: string | string[]; // Support multiple files
  bookingId?: string;
  tokenNumber?: string;
  serialNo?: number;
}

export default function PatientDetailsForm({
  onBack,
  onSubmit,
  language,
  requiresPrepayment = false,
  consultationFee = 500,
  doctorName = 'Dr. Name',
  doctorSpecialty = '',
  doctorPhoto = '',
  doctorQRCode,
  doctorUPI,
  consultationType = 'chamber', // Default to chamber
  doctorId,
  selectedDate,
  selectedTime,
  selectedChamber,
  selectedChamberId,
  bookingType = 'qr_booking',
  doctorDegrees = [],
  isTestMode = false, // Demo mode - skip database operations
  useDrPrefix = true,
  themeColor = 'emerald',
  isClinicBooking = false
}: PatientDetailsFormProps) {
  const [formData, setFormData] = useState<PatientFormData>({
    patientName: '',
    whatsappNumber: '',
    age: '',
    gender: '',
    purposeOfVisit: '',
    consent1: true,
    consent2: true,
    paymentStatus: requiresPrepayment ? 'pending' : 'not_required',
    utrNumber: ''
  });

  const [showSubmit, setShowSubmit] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [rxUploadOpen, setRxUploadOpen] = useState(false);
  const [uploadedRx, setUploadedRx] = useState(false);
  const [uploadedRxUrl, setUploadedRxUrl] = useState<string>('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============================================
  // ?? BOOKING BLOCKING DISABLED FOR NOW
  // Will be re-implemented with correct logic
  // ============================================
  useEffect(() => {
    // Blocking logic removed - bookings are always allowed
    setIsBlocked(false);
    setBlockMessage('');
  }, [doctorId]);

  const isFormValid = () => {
    return (
      formData.patientName.trim() !== '' &&
      formData.whatsappNumber.trim() !== '' &&
      formData.consent1 === true &&
      !isBlocked
    );
  };

  const handleSubmit = async (e?: React.FormEvent | null, paymentStatusOverride?: 'pending' | 'completed') => {
    if (!isFormValid() || isSubmitting) return;

    if (isBlocked) {
      toast.error(blockMessage);
      return;
    }

    if (!doctorId) {
      toast.error('Doctor information missing');
      return;
    }

    const bookingCreatedAt = new Date();
    // Use override if provided, otherwise preserve form state
    const finalPaymentStatus = paymentStatusOverride || formData.paymentStatus;

    setIsSubmitting(true);

    // ============================================
    // ?? TEST MODE - DEMO ONLY, NO DATABASE SAVE
    // ============================================
    if (isTestMode) {
      const demoBookingId = `DEMO-${Date.now().toString().slice(-6)}`;
      const demoTokenNumber = `#DEMO`;

      toast.success('Demo booking preview!');

      // Show confirmation page with demo data
      onSubmit({
        ...formData,
        bookingId: demoBookingId,
        tokenNumber: demoTokenNumber,
        serialNo: 999,
        location: sessionStorage.getItem('booking_location_name') || '',
        paymentStatus: finalPaymentStatus
      });

      setIsSubmitting(false);
      return;
    }

    // ============================================
    // ?? CALCULATE REAL SERIAL NUMBER FIRST
    // Wait for this before showing confirmation
    // ============================================
    try {
      // Generate serial token number based on existing bookings for this chamber slot
      if (!db) {
        toast.error('Database connection error');
        setIsSubmitting(false);
        return;
      }

      // Get doctor's code from Firestore
      const doctorDoc = await getDoc(doc(db, 'doctors', doctorId));
      if (!doctorDoc.exists()) {
        toast.error('Doctor not found');
        setIsSubmitting(false);
        return;
      }

      const doctorData = doctorDoc.data();
      const doctorCode = doctorData.doctorCode;

      if (!doctorCode) {
        toast.error('Doctor code not found. Please contact support.');
        setIsSubmitting(false);
        return;
      }

      // Generate unique booking ID using doctor code
      // Generate unique booking ID using doctor code
      const bookingId = await generateBookingId(doctorCode, selectedDate || new Date());

      // ============================================
      // ?? STEP 1: GET CHAMBER ID FIRST
      // Must resolve chamber before querying bookings
      // ============================================
      let chamberId = -1; // Default to -1 instead of null for better querying

      if (doctorDoc.exists()) {
        const doctorData = doctorDoc.data();

        if (doctorData.chambers && Array.isArray(doctorData.chambers)) {
          let foundChamber: any = null;

          // ?? PRIORITY: Use selectedChamberId if provided (exact match by ID)
          if (selectedChamberId !== undefined && selectedChamberId !== null) {
            foundChamber = doctorData.chambers.find((c: any) => c.id === selectedChamberId);
          }

          // Fallback: Try exact name match
          if (!foundChamber) {
            foundChamber = doctorData.chambers.find((c: any) => c.chamberName === selectedChamber);
          }

          // If no exact match, try case-insensitive match
          if (!foundChamber) {
            foundChamber = doctorData.chambers.find((c: any) =>
              c.chamberName?.toLowerCase() === selectedChamber?.toLowerCase()
            );
          }

          // If still no match, try partial match (both ways)
          if (!foundChamber && selectedChamber) {
            foundChamber = doctorData.chambers.find((c: any) =>
              c.chamberName?.includes(selectedChamber) || selectedChamber?.includes(c.chamberName)
            );
          }

          // Last resort: normalize and compare (remove special chars, spaces)
          if (!foundChamber && selectedChamber) {
            const normalizedSelected = selectedChamber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            foundChamber = doctorData.chambers.find((c: any) => {
              const normalizedChamber = c.chamberName?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
              return normalizedChamber === normalizedSelected;
            });
          }

          if (foundChamber) {
            chamberId = foundChamber.id;
          } else {
            console.error('? Chamber not found! Selected:', selectedChamber, '| Available:', doctorData.chambers.map((c: any) => c.chamberName));
            console.error('?? Using chamberId = -1 (this booking will not appear in chamber views)');
          }
        }
      }

      // ============================================
      // ?? STEP 2: QUERY CHAMBER-SPECIFIC BOOKINGS
      // Filter by BOTH doctorId AND chamberId for unified serial numbers
      // ============================================
      // ============================================
      const bookingsRef = collection(db, 'bookings');

      // Format date for appointment saving (YYYY-MM-DD) - using local timezone
      const appointmentDateToSave = selectedDate
        ? new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]
        : new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

      // Get TARGET DATE STRING for filtering (same as saved appointmentDate)
      const todayStr = appointmentDateToSave;

      // ?? CRITICAL FIX: Query by BOTH doctorId AND chamberId
      // This ensures unified serial numbers per chamber across all booking sources
      // (Doctor QR, Clinic QR, Walk-in all share the same sequence for the same chamber)
      // Prepare chamber IDs to query (handle both string and number types for safety)
      const chamberIdsToQuery: (string | number)[] = [chamberId, String(chamberId)];
      if (!isNaN(Number(chamberId))) chamberIdsToQuery.push(Number(chamberId));
      const uniqueChamberIds = [...new Set(chamberIdsToQuery)];

      const q = query(
        bookingsRef,
        where('doctorId', '==', doctorId),
        where('chamberId', 'in', uniqueChamberIds)
      );


      const querySnapshot = await getDocs(q);

      // ?? FILTER FOR TODAY ONLY
      const todaysBookings = querySnapshot.docs.filter(doc => {
        const bookingData = doc.data();

        // 1?? Plan A: Check explicit string match (Most robust)
        // This matches exactly how we save it (appointmentDateToSave)
        if (bookingData.appointmentDate === todayStr) return true;
        if (bookingData.bookingDate === todayStr) return true;

        // 2?? Plan B: Fallback to Timestamp calculation (Legacy compatibility)
        const bookingDate = bookingData.date?.toDate ? bookingData.date.toDate() : bookingData.date;
        const bookingDateStr = bookingDate instanceof Date ? bookingDate.toISOString().split('T')[0] : '';
        return bookingDateStr === todayStr;
      });

      // ?? Generate CHAMBER-SPECIFIC serial number
      // All bookings for this chamber today (Dr QR + Clinic QR + Walk-in) share one sequence
      const tokenNumber = `#${todaysBookings.length + 1}`;
      const serialNo = todaysBookings.length + 1;



      // ============================================
      // ?? SAVE TO DATABASE IMMEDIATELY (PREVENT RACE CONDITION)
      // Must save BEFORE showing confirmation to ensure correct serial numbers
      // ============================================

      // ? Validate planned off periods and chamber active status
      if (doctorDoc.exists()) {
        const doctorData = doctorDoc.data();

        // Check if selected date falls in a planned off period
        if (doctorData.plannedOffPeriods && Array.isArray(doctorData.plannedOffPeriods) && selectedDate) {
          const activePlannedOffPeriods = doctorData.plannedOffPeriods.filter((p: any) => p.status === 'active');

          // Create local date at midnight to avoid timezone issues
          const bookingDate = new Date(selectedDate);
          bookingDate.setHours(0, 0, 0, 0);


          for (const period of activePlannedOffPeriods) {
            // Parse dates as local timezone
            let startDate: Date;
            let endDate: Date;

            if (period.startDate?.toDate) {
              startDate = period.startDate.toDate();
            } else if (typeof period.startDate === 'string') {
              const [year, month, day] = period.startDate.split('-').map(Number);
              startDate = new Date(year, month - 1, day);
            } else {
              startDate = new Date(period.startDate);
            }

            if (period.endDate?.toDate) {
              endDate = period.endDate.toDate();
            } else if (typeof period.endDate === 'string') {
              const [year, month, day] = period.endDate.split('-').map(Number);
              endDate = new Date(year, month - 1, day);
            } else {
              endDate = new Date(period.endDate);
            }

            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);


            if (bookingDate >= startDate && bookingDate <= endDate) {
              toast.error('This date is unavailable due to planned off period. Please select another date.');
              setIsSubmitting(false);
              return;
            }
          }
        }

        // Check if chamber is active (already resolved chamberId above)
        if (doctorData.chambers && Array.isArray(doctorData.chambers) && chamberId !== -1) {
          const foundChamber = doctorData.chambers.find((c: any) => c.id === chamberId);
          if (foundChamber && foundChamber.isActive === false) {
            toast.error('This chamber is currently unavailable for bookings. Please try again later.');
            setIsSubmitting(false);
            return;
          }
        }
      }

      // ?? Encrypt sensitive patient data before saving

      // ?? NORMALIZE DATA: Convert Indic numerals and names to English before encryption
      const normalizedName = normalizePatientName(formData.patientName);
      const normalizedAge = normalizeIndicNumerals(formData.age?.toString() || '');
      // Save booking to Firestore with encrypted sensitive fields
      try {
        await addDoc(collection(db, 'bookings'), {
          bookingId,
          doctorCode, // Store doctor code for queries
          tokenNumber,
          serialNo, // Store numeric serial for sorting

          // ?? ENCRYPTED SENSITIVE FIELDS (with normalized data)
          patientName_encrypted: encrypt(normalizedName),
          whatsappNumber_encrypted: encrypt(`+91${formData.whatsappNumber}`),
          age_encrypted: encrypt(normalizedAge),
          gender_encrypted: encrypt(formData.gender || ''),
          purposeOfVisit_encrypted: encrypt(formData.purposeOfVisit || ''),

          // Plain searchable fields
          patientPhone: `+91${formData.whatsappNumber}`, // ?? SEARCHABLE phone for history queries
          patientName: normalizedName, // ?? SEARCHABLE name for queries
          doctorId,
          doctorName,
          doctorSpecialty: doctorSpecialty || 'General Medicine', // For history display
          bookingDate: appointmentDateToSave, // For history display (YYYY-MM-DD)
          bookingTime: selectedTime || '', // For history display (HH:MM AM/PM)
          chamberName: selectedChamber || '',
          chamberAddress: '', // Add if available
          date: selectedDate || new Date(),
          appointmentDate: appointmentDateToSave, // YYYY-MM-DD format for querying (SAME as query)
          time: selectedTime || 'immediate', // MUST MATCH QUERY DEFAULT
          chamber: selectedChamber || 'walk-in', // MUST MATCH QUERY DEFAULT
          chamberId, // Numeric ID for querying
          clinicId: sessionStorage.getItem('booking_clinic_id') || null,
          clinicLocationId: sessionStorage.getItem('booking_location_id') || null,
          clinicName: sessionStorage.getItem('booking_clinic_name') || selectedChamber || 'Clinic',
          clinicLocationName: sessionStorage.getItem('booking_location_name') || null,
          clinicQRCode: sessionStorage.getItem('booking_clinic_qr') || null,
          bookingSource: sessionStorage.getItem('booking_source') || 'doctor_qr', // 'clinic_qr' or 'doctor_qr' or 'walkin'
          type: bookingType, // 'qr_booking' or 'walkin_booking'
          status: 'confirmed',
          paymentStatus: finalPaymentStatus,
          utrNumber: formData.utrNumber || null,
          prescriptionUrl: formData.prescriptionUrl || null,
          consultationType: consultationType,
          language: language || 'en', // Use the language prop, not formData.language
          verificationMethod: 'qr_scan', // QR bookings are always qr_scan
          verifiedByPatient: true, // QR bookings are pre-verified by scanning
          isWalkIn: false, // QR bookings are NOT walk-ins
          // Referrer tracking
          referrerId: sessionStorage.getItem('booking_referrer_id') || null,
          referrerName: sessionStorage.getItem('booking_referrer_name') || null,
          referrerRole: sessionStorage.getItem('booking_referrer_role') || null,
          createdAt: serverTimestamp()
        });

        // Update QR scan record to mark as completed
        const scanSessionId = sessionStorage.getItem('scan_session_id');
        if (scanSessionId) {
          try {
            const scansRef = collection(db, 'qrScans');
            const scanQuery = query(scansRef, where('scanSessionId', '==', scanSessionId));
            const scanSnapshot = await getDocs(scanQuery);

            if (!scanSnapshot.empty) {
              const scanDoc = scanSnapshot.docs[0];
              await updateDoc(doc(db, 'qrScans', scanDoc.id), {
                completed: true,
                bookingId: bookingId,
                completedAt: serverTimestamp()
              });
            }
          } catch (error) {
            console.error('Error updating scan record:', error);
          }
        }

        // Track referral if booking came via referrer link
        const bookingReferrerId = sessionStorage.getItem('booking_referrer_id');
        if (bookingReferrerId) {
          try {
            const { increment } = await import('firebase/firestore');
            // Add to referrer's history
            await addDoc(collection(db, 'referrers', bookingReferrerId, 'referralHistory'), {
              patientName: normalizedName,
              patientPhone: `+91${formData.whatsappNumber}`,
              doctorId,
              doctorName,
              doctorSpecialty: doctorSpecialty || '',
              bookingId,
              status: 'booked',
              createdAt: serverTimestamp()
            });
            // Increment referrer's total count
            await updateDoc(doc(db, 'referrers', bookingReferrerId), {
              totalReferrals: increment(1)
            });
            sessionStorage.removeItem('booking_referrer_id');
          } catch (refErr) {
            console.error('Error tracking referral:', refErr);
          }
        }

        // Save to notification history for patient history feature (non-blocking)
        try {
          await saveNotificationHistory({
            patientPhone: formData.whatsappNumber,
            patientName: normalizedName,
            doctorName: doctorName,
            clinicName: sessionStorage.getItem('booking_clinic_name') || selectedChamber || 'Clinic',
            chamber: selectedChamber || '',
            notificationType: 'booking_confirmed',
            bookingStatus: 'confirmed',
            notificationStatus: 'sent',
            timestamp: new Date(),
            consultationDate: appointmentDateToSave,
            consultationTime: selectedTime || '',
            serialNumber: String(tokenNumber),
            bookingId: bookingId,
            doctorId: doctorId,
            isWalkIn: bookingType === 'walkin_booking',
            walkInVerified: bookingType === 'qr_booking' // QR bookings are verified, walk-in are not yet
          });
        } catch (historyError) {
          console.error('? Failed to save notification history (non-blocking):', historyError);
        }
      } catch (saveError) {
        console.error('? Failed to save booking to Firestore:', saveError);
        throw saveError; // Re-throw to be caught by outer try-catch
      }

      // ? INCREMENT DOCTOR'S BOOKING COUNT (CRITICAL)

      await updateDoc(doc(db, 'doctors', doctorId), {
        bookingsCount: increment(1)
      });

      // Check if limit reached and auto-block
      const updatedDoctorDoc = await getDoc(doc(db, 'doctors', doctorId));
      if (updatedDoctorDoc.exists()) {
        const data = updatedDoctorDoc.data();

        // Check booking limit
        if (data.bookingsCount >= data.bookingsLimit) {
          await updateDoc(doc(db, 'doctors', doctorId), {
            bookingBlocked: true,
            blockReason: 'booking_limit'
          });
        }

        // Check trial expiry
        if (data.subscriptionStatus === 'trial' && data.trialEndDate) {
          const today = new Date();
          const trialEnd = data.trialEndDate.toDate();
          if (today > trialEnd) {
            await updateDoc(doc(db, 'doctors', doctorId), {
              bookingBlocked: true,
              blockReason: 'trial_expired',
              subscriptionStatus: 'expired'
            });
          }
        }
      }

      // ============================================
      // ?? FCM TOKEN REGISTRATION (BEFORE NAVIGATION)
      // CRITICAL: Must complete BEFORE onSubmit() navigates away
      // ============================================
      if (formData.consent1) {
        try {
          // Normalize phone number to match notificationService logic (strip non-digits, remove 91, take last 10)
          const rawPhone = formData.whatsappNumber || '';
          const digits = rawPhone.replace(/\D/g, '');
          const trimmed = digits.replace(/^91/, '');
          const phone10 = trimmed.slice(-10);
          const userId = `patient_${phone10}`;



          const token = await requestNotificationPermission(userId, 'patient');
          if (token) {

            toast.success('Notifications enabled! You will receive appointment updates.', {
              duration: 4000
            });
          } else {
            console.warn('?? FCM token not obtained, but booking continues');
            toast.warning('Notifications may not work. Enable browser notifications in settings.', {
              duration: 5000
            });
          }
        } catch (error) {
          console.error('? [FCM] Token registration failed:', error);
          toast.error('Could not enable notifications. You can enable them later in settings.', {
            duration: 5000
          });
          // Don't block booking flow if FCM fails
        }
      } else {

      }

      // ============================================
      // ?? BOOKING REMINDER SCHEDULING (1h before, only if booked =6h prior)
      // ============================================
      let reminderScheduled = false;
      try {
        if (selectedDate && selectedTime) {

          // Build appointment datetime in local time using selectedDate + selectedTime (e.g., "02:30 PM")
          const appointmentDateTime = new Date(selectedDate);
          const timeParts = selectedTime.split(' ');
          const hm = timeParts[0]?.split(':') || [];
          let hour = parseInt(hm[0] || '0', 10);
          const minute = parseInt(hm[1] || '0', 10);
          const ampm = (timeParts[1] || '').toLowerCase();
          if (ampm === 'pm' && hour < 12) hour += 12;
          if (ampm === 'am' && hour === 12) hour = 0;
          appointmentDateTime.setHours(hour, minute, 0, 0);

          const result = await scheduleBookingReminder({
            patientPhone: formData.whatsappNumber,
            patientName: formData.patientName,
            doctorName: doctorName || 'Doctor',
            appointmentDate: appointmentDateToSave,
            appointmentTimeStr: selectedTime,
            location: selectedChamber || '',
            appointmentTime: appointmentDateTime.toISOString(),
            bookingCreatedAt: bookingCreatedAt.toISOString(),
          });

          if (result && !result.skipped) {
            reminderScheduled = true;
          }
        }
      } catch (reminderError) {
        // Failed to schedule booking reminder (non-blocking)
      }

      // Update the booking document with reminder status
      if (reminderScheduled) {
        try {
          const bookingsRef = collection(db, 'bookings');
          const q = query(
            bookingsRef,
            where('bookingId', '==', bookingId)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const bookingDoc = snapshot.docs[0];
            await updateDoc(bookingDoc.ref, {
              reminderScheduled: true,
              reminderSent: true,
              reminderScheduledAt: serverTimestamp()
            });
          }
        } catch (updateError) {
          // Failed to update booking with reminder flag
        }
      }

      // ============================================
      // ? NOW SHOW CONFIRMATION AND NAVIGATE
      // FCM registration completed above
      // ============================================
      toast.success('Booking confirmed successfully!');

      // Show confirmation page
      onSubmit({
        ...formData,
        bookingId,
        tokenNumber,
        serialNo,
        location: sessionStorage.getItem('booking_location_name') || '',
        paymentStatus: finalPaymentStatus
      } as any);

      setSubmitted(true);
      setShowConfetti(true);
    } catch (error) {
      console.error('Error adding document: ', error);
      toast.error('Failed to book appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayLater = (e: React.MouseEvent) => {
    e.preventDefault();
    handleSubmit(null, 'pending');
  };

  const handlePayNow = (e: React.MouseEvent) => {
    e.preventDefault();
    handleSubmit(null, 'completed');
  };

  return (
    <BookingFlowLayout
      onBack={onBack}
      doctorName={doctorName}
      doctorPhoto={doctorPhoto}
      doctorSpecialty={doctorSpecialty}
      doctorDegrees={doctorDegrees}
      useDrPrefix={useDrPrefix}
    >
      <div className="pb-24">
        {/* Subtitle */}
        <p className="text-emerald-400 text-sm mb-6">Please fill in the patient details</p>

        {/* Blocked Alert */}
        {isBlocked && (
          <div className="bg-red-500/10 border border-red-500 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="bg-red-500 rounded-full p-1 flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <div>
                <h4 className="text-red-400 font-semibold mb-1">Booking Unavailable</h4>
                <p className="text-sm text-gray-300">{blockMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Form Card � NOT translated (data stored as English for doctor) */}
        <div className="bg-[#1a1f2e] rounded-xl p-6 mb-6" data-no-translate>
          {/* Required Information */}
          <div className="mb-6">
            <h3 className="text-white mb-4">Required Information</h3>

            {/* Patient Name */}
            <div className="mb-4" data-no-translate>
              <Label htmlFor="patientName" className="text-gray-300 mb-2 block">
                Patient Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="patientName"
                type="text"
                placeholder="Enter patient full name"
                value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                className="bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500"
                required
              />
              {formData.patientName && formData.patientName !== normalizePatientName(formData.patientName) && (
                <p className="text-xs text-emerald-400 mt-1">
                  ? Will be stored as: {normalizePatientName(formData.patientName)}
                </p>
              )}
            </div>

            {/* WhatsApp Number */}
            <div className="mb-0">
              <Label htmlFor="whatsappNumber" className="text-gray-300 mb-2 block">
                WhatsApp Number <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value="+91"
                  disabled
                  className="w-20 bg-[#0f1419] border-gray-700 text-white"
                />
                <Input
                  id="whatsappNumber"
                  type="tel"
                  placeholder="9876543210"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  className="flex-1 bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Optional Information */}
          <div>
            <h3 className="text-white mb-4">Optional Information</h3>

            {/* Age */}
            <div className="mb-4">
              <Label htmlFor="age" className="text-gray-300 mb-2 block">
                Age
              </Label>
              <Input
                id="age"
                type="text"
                placeholder="Enter age"
                value={formData.age}
                onChange={(e) => {
                  // Normalize Indic numerals to English digits in real-time
                  const normalizedValue = normalizeIndicNumerals(e.target.value);
                  setFormData({ ...formData, age: normalizedValue });
                }}
                className="bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500"
              />
              {formData.age && formData.age !== normalizeIndicNumerals(formData.age) && (
                <p className="text-xs text-emerald-400 mt-1">
                  ? Converted to: {normalizeIndicNumerals(formData.age)}
                </p>
              )}
            </div>

            {/* Gender */}
            <div className="mb-4">
              <Label htmlFor="gender" className="text-gray-300 mb-2 block">
                Gender
              </Label>
              <Select value={formData.gender} onValueChange={(value: string) => setFormData({ ...formData, gender: value })}>
                <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white focus:border-emerald-500 focus:ring-emerald-500">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-gray-700">
                  <SelectItem value="male" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                    Male
                  </SelectItem>
                  <SelectItem value="female" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                    Female
                  </SelectItem>
                  <SelectItem value="other" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                    Other
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Purpose of Visit */}
            <div className="mb-0">
              <Label htmlFor="purposeOfVisit" className="text-gray-300 mb-2 block">
                Purpose of Visit
              </Label>
              <Select value={formData.purposeOfVisit} onValueChange={(value: string) => setFormData({ ...formData, purposeOfVisit: value })}>
                <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white focus:border-emerald-500 focus:ring-emerald-500">
                  <SelectValue placeholder="Select purpose of visit" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-gray-700">
                  <SelectItem value="new-patient" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                    New Patient - Initial Consultation
                  </SelectItem>
                  <SelectItem value="existing-patient" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                    Existing Patient - New Treatment
                  </SelectItem>
                  <SelectItem value="report-review" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                    Report Review
                  </SelectItem>
                  <SelectItem value="follow-up" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                    Follow-Up Consultation
                  </SelectItem>
                  <SelectItem value="routine-checkup" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                    Routine Checkup
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Upload Previous Prescription (Optional) - ONLY for Video Consultation */}
        {consultationType === 'video' && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-white mb-2">
                  Have a previous prescription?
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Upload your previous prescription to help the doctor
                </p>
                {uploadedRx ? (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Prescription uploaded successfully!
                      {Array.isArray(formData.prescriptionUrl) && formData.prescriptionUrl.length > 1 && (
                        <span className="ml-2">({formData.prescriptionUrl.length} files)</span>
                      )}
                    </span>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRxUploadOpen(true)}
                    className="border-blue-500 text-blue-400 hover:bg-blue-500/10 hover:text-blue-400"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Upload Previous Prescription
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Consent & Terms Card */}
        <div className="bg-[#1a1f2e] rounded-xl p-6 mb-6">
          <h3 className="text-white mb-4">Consent & Terms</h3>

          {/* Consent Checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="consent1"
              checked={formData.consent1}
              onCheckedChange={(checked: boolean | string | null) => {
                // Convert to boolean - handle 'indeterminate' state
                const isChecked = checked === true;
                setFormData({ ...formData, consent1: isChecked, consent2: isChecked });
              }}
              className="mt-1 flex-shrink-0 border-gray-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            />
            <div className="flex-1">
              <label htmlFor="consent1" className="text-gray-300 text-sm leading-6 cursor-pointer block">
                I accept receiving push notifications from <span className="text-emerald-400">www.healqr.com</span> and understand that it is only a digital booking platform without any medical treatment role.
              </label>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        {requiresPrepayment && (
          <div className="bg-[#1a1f2e] rounded-xl p-6 mb-6">
            <h3 className="text-white mb-4">Consultation Fee ??</h3>

            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
              <span className="text-gray-400">Consultation Charge:</span>
              <span className="text-2xl text-emerald-500">?{consultationFee}</span>
            </div>

            {formData.paymentStatus === 'pending' && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handlePayLater}
                  variant="outline"
                  className="h-12 bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white rounded-lg"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Pay at Clinic
                </Button>
                <Button
                  onClick={handlePayNow}
                  className="h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay Now ?{consultationFee}
                </Button>
              </div>
            )}

            {formData.paymentStatus === 'paid' && (
              <div className="bg-emerald-900/30 border border-emerald-500 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-emerald-500 rounded-full p-1">
                    <svg className="w-4 h-4 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="text-emerald-400">Payment Submitted Successfully! ?</span>
                </div>
                <p className="text-sm text-gray-400 ml-9">
                  UTR: {formData.utrNumber}
                </p>
                <p className="text-xs text-yellow-400 ml-9 mt-2">
                  ? Payment verification pending. Doctor will confirm before consultation.
                </p>
              </div>
            )}

            {formData.paymentStatus === 'pay_later' && (
              <div className="bg-yellow-900/30 border border-yellow-500 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-yellow-400">Pay at Clinic</p>
                    <p className="text-sm text-gray-400">
                      Please pay ?{consultationFee} at the clinic before consultation
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Health Tip Image */}
        <TemplateDisplay placement="booking-patient-details" className="mb-6" />

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={onBack}
            variant="outline"
            className="flex-1 h-12 bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white rounded-lg"
          >
            Back
          </Button>
          {showSubmit && (
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid() || isSubmitting || isBlocked}
              className={`flex-1 h-12 rounded-lg ${
                isFormValid() && !isBlocked && !isSubmitting
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          )}
        </div>
      </div>

      {/* RX Upload Modal - Only for Video Consultation */}
      <PatientRxUploadModal
        isOpen={rxUploadOpen}
        onClose={() => setRxUploadOpen(false)}
        onUploadSuccess={(fileUrls) => {
          setUploadedRx(true);
          setUploadedRxUrl(fileUrls[0] || ''); // Store first file for preview
          setFormData({ ...formData, prescriptionUrl: fileUrls }); // Store all files
        }}
        language={language}
        consultationType={consultationType}
      />
    </BookingFlowLayout>
  );
}

