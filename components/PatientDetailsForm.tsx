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
import { t, type Language, normalizeIndicNumerals, normalizePatientName } from '../utils/translations';
import { PatientRxUploadModal } from './PatientRxUploadModal';
import TemplateDisplay from './TemplateDisplay';
import { db } from '../lib/firebase/config';
import { doc, getDoc, addDoc, collection, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { requestNotificationPermission } from '../services/fcm.service';

interface PatientDetailsFormProps {
  onBack: () => void;
  onSubmit: (data: PatientFormData) => void;
  language: Language;
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
  bookingType?: 'qr_booking' | 'walkin_booking';
  doctorDegrees?: string[];
  isTestMode?: boolean; // Skip database operations in test mode
  useDrPrefix?: boolean;
}

export interface PatientFormData {
  patientName: string;
  whatsappNumber: string;
  age: string;
  gender: string;
  purposeOfVisit: string;
  consent1: boolean;
  consent2: boolean;
  paymentStatus?: 'not_required' | 'paid' | 'pay_later' | 'pending';
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
  bookingType = 'qr_booking',
  doctorDegrees = [],
  isTestMode = false, // Demo mode - skip database operations
  useDrPrefix = true
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
  const [rxUploadOpen, setRxUploadOpen] = useState(false);
  const [uploadedRx, setUploadedRx] = useState(false);
  const [uploadedRxUrl, setUploadedRxUrl] = useState<string>('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============================================
  // 🔓 BOOKING BLOCKING DISABLED FOR NOW
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

  const handleSubmit = async () => {
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

    setIsSubmitting(true);

    // ============================================
    // 🎯 TEST MODE - DEMO ONLY, NO DATABASE SAVE
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
        paymentStatus: formData.paymentStatus
      });
      
      setIsSubmitting(false);
      return;
    }

    // ============================================
    // 🎯 CALCULATE REAL SERIAL NUMBER FIRST
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
      const { generateBookingId } = await import('../utils/idGenerator');
      const bookingId = await generateBookingId(doctorCode, selectedDate || new Date());


      // Query existing bookings for same doctor, date, chamber, and time
      const { query: firestoreQuery, where, getDocs } = await import('firebase/firestore');
      const bookingsRef = collection(db, 'bookings');
      
      // Format date for comparison (YYYY-MM-DD) - using local timezone
      const appointmentDate = selectedDate 
        ? new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]
        : new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
      
      const q = firestoreQuery(
        bookingsRef,
        where('doctorId', '==', doctorId),
        where('appointmentDate', '==', appointmentDate),
        where('chamber', '==', selectedChamber || 'walk-in'),
        where('time', '==', selectedTime || 'immediate')
      );
      
      const querySnapshot = await getDocs(q);
      const existingBookings = querySnapshot.docs;
      
      // Generate serial token number (THIS IS THE REAL NUMBER)
      const tokenNumber = `#${existingBookings.length + 1}`;
      const serialNo = existingBookings.length + 1;
      
      // Store appointmentDate in outer scope for consistent use in save operation
      const appointmentDateToSave = appointmentDate;
      
      // ============================================
      // 💾 SAVE TO DATABASE IMMEDIATELY (PREVENT RACE CONDITION)
      // Must save BEFORE showing confirmation to ensure correct serial numbers
      // ============================================
      
      // Get chamberId from the selected chamber name (reuse existing doctorDoc)
      let chamberId = -1; // Default to -1 instead of null for better querying
      
      if (doctorDoc.exists()) {
        const doctorData = doctorDoc.data();
        
        // Check if selected date falls in a planned off period
        if (doctorData.plannedOffPeriods && Array.isArray(doctorData.plannedOffPeriods) && selectedDate) {
          const activePlannedOffPeriods = doctorData.plannedOffPeriods.filter((p: any) => p.status === 'active');
          
          // Create local date at midnight to avoid timezone issues
          const bookingDate = new Date(selectedDate);
          bookingDate.setHours(0, 0, 0, 0);
          
          console.log('🔍 PatientDetailsForm: Checking planned off periods', {
            bookingDate: bookingDate.toDateString(),
            activePeriods: activePlannedOffPeriods.length
          });
          
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
            
            console.log('  📅 Comparing with period:', {
              startDate: startDate.toDateString(),
              endDate: endDate.toDateString(),
              isInRange: bookingDate >= startDate && bookingDate <= endDate
            });
            
            if (bookingDate >= startDate && bookingDate <= endDate) {

              toast.error('This date is unavailable due to planned off period. Please select another date.');
              setIsSubmitting(false);
              return;
            }
          }
          

        }
        
        if (doctorData.chambers && Array.isArray(doctorData.chambers)) {
          // Try exact match first
          let foundChamber = doctorData.chambers.find((c: any) => c.chamberName === selectedChamber);
          
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
            // Check if chamber is active
            if (foundChamber.isActive === false) {
              toast.error('This chamber is currently unavailable for bookings. Please try again later.');
              setIsSubmitting(false);
              return;
            }
            
            chamberId = foundChamber.id;
          } else {
            console.error('❌ Chamber not found! Selected:', selectedChamber, '| Available:', doctorData.chambers.map((c: any) => c.chamberName));
            console.error('⚠️ Using chamberId = -1 (this booking will not appear in chamber views)');
          }
        }
      }

      // 🔐 Encrypt sensitive patient data before saving
      const { encrypt } = await import('../utils/encryptionService');
      
      // 🎯 NORMALIZE DATA: Convert Indic numerals and names to English before encryption
      const normalizedName = normalizePatientName(formData.patientName);
      const normalizedAge = normalizeIndicNumerals(formData.age?.toString() || '');
      // Save booking to Firestore with encrypted sensitive fields
      try {
        await addDoc(collection(db, 'bookings'), {
          bookingId,
          doctorCode, // Store doctor code for queries
          tokenNumber,
          serialNo, // Store numeric serial for sorting
          
          // 🔐 ENCRYPTED SENSITIVE FIELDS (with normalized data)
          patientName_encrypted: encrypt(normalizedName),
          whatsappNumber_encrypted: encrypt(`+91${formData.whatsappNumber}`),
          age_encrypted: encrypt(normalizedAge),
          gender_encrypted: encrypt(formData.gender || ''),
          purposeOfVisit_encrypted: encrypt(formData.purposeOfVisit || ''),
          
          // Plain searchable fields
          patientPhone: `+91${formData.whatsappNumber}`, // 🔍 SEARCHABLE phone for history queries
          patientName: normalizedName, // 🔍 SEARCHABLE name for queries
          doctorId,
          doctorName,
          doctorSpecialty: doctorSpecialty || 'General Medicine', // For history display
          bookingDate: appointmentDateToSave, // For history display (YYYY-MM-DD)
          bookingTime: selectedTime || '', // For history display (HH:MM AM/PM)
          chamberName: selectedChamber || '',
          chamberAddress: '', // Add if available
          date: selectedDate || new Date(),
          appointmentDate: appointmentDateToSave, // YYYY-MM-DD format for querying (SAME as query)
          time: selectedTime || null,
          chamber: selectedChamber || null,
          chamberId, // Numeric ID for querying
          clinicId: sessionStorage.getItem('booking_clinic_id') || null,
          clinicName: sessionStorage.getItem('booking_clinic_name') || selectedChamber || 'Clinic',
          clinicQRCode: sessionStorage.getItem('booking_clinic_qr') || null,
          type: bookingType, // 'qr_booking' or 'walkin_booking'
          status: 'confirmed',
          paymentStatus: formData.paymentStatus,
          utrNumber: formData.utrNumber || null,
          prescriptionUrl: formData.prescriptionUrl || null,
          consultationType: consultationType,
          language: language || 'en', // Use the language prop, not formData.language
          verificationMethod: 'qr_scan', // QR bookings are always qr_scan
          verifiedByPatient: true, // QR bookings are pre-verified by scanning
          isWalkIn: false, // QR bookings are NOT walk-ins
          createdAt: serverTimestamp()
        });

        // Save to notification history for patient history feature
        const { saveNotificationHistory } = await import('../services/notificationHistoryService');
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
      } catch (saveError) {
        console.error('❌ Failed to save booking to Firestore:', saveError);
        throw saveError; // Re-throw to be caught by outer try-catch
      }

      // ✅ INCREMENT DOCTOR'S BOOKING COUNT (CRITICAL)

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
      // 🔔 FCM TOKEN REGISTRATION (BEFORE NAVIGATION)
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

            toast.success('🔔 Notifications enabled! You will receive appointment updates.', {
              duration: 4000
            });
          } else {
            console.warn('⚠️ FCM token not obtained, but booking continues');
            toast.warning('⚠️ Notifications may not work. Enable browser notifications in settings.', {
              duration: 5000
            });
          }
        } catch (error) {
          console.error('❌ [FCM] Token registration failed:', error);
          toast.error('⚠️ Could not enable notifications. You can enable them later in settings.', {
            duration: 5000
          });
          // Don't block booking flow if FCM fails
        }
      } else {

      }
      
      // ============================================
      // 🔔 BOOKING REMINDER SCHEDULING (1h before, only if booked ≥6h prior)
      // ============================================
      let reminderScheduled = false;
      try {
        if (selectedDate && selectedTime) {
          const { scheduleBookingReminder } = await import('../services/notificationService');

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
          const { query: firestoreQuery, where, getDocs } = await import('firebase/firestore');
          const q = firestoreQuery(
            bookingsRef,
            where('bookingId', '==', bookingId)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const bookingDoc = snapshot.docs[0];
            await updateDoc(bookingDoc.ref, {
              reminderScheduled: true,
              reminderScheduledAt: serverTimestamp()
            });
          }
        } catch (updateError) {
          // Failed to update booking with reminder flag
        }
      }
      
      // ============================================
      // ✅ NOW SHOW CONFIRMATION AND NAVIGATE
      // FCM registration completed above
      // ============================================
      toast.success('Booking confirmed successfully!');
      
      onSubmit({
        ...formData,
        bookingId,
        tokenNumber,
        serialNo
      } as any);
      
      // Reset submitting state
      setIsSubmitting(false);
      
    } catch (error: any) {
      console.error('❌ Error saving booking:', error);
      toast.error('Booking failed. Please try again.');
      setIsSubmitting(false);
    }
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
        <p className="text-emerald-400 text-sm mb-6">{t('pleaseFillPatientDetails', language)}</p>

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

        {/* Main Form Card */}
        <div className="bg-[#1a1f2e] rounded-xl p-6 mb-6">
          {/* Required Information */}
          <div className="mb-6">
            <h3 className="text-white mb-4">{t('requiredInformation', language)}</h3>

            {/* Patient Name */}
            <div className="mb-4">
              <Label htmlFor="patientName" className="text-gray-300 mb-2 block">
                {t('patientName', language)} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="patientName"
                type="text"
                placeholder={t('enterPatientFullName', language)}
                value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                className="bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500"
                required
              />
              {formData.patientName && formData.patientName !== normalizePatientName(formData.patientName) && (
                <p className="text-xs text-emerald-400 mt-1">
                  ✓ Will be stored as: {normalizePatientName(formData.patientName)}
                </p>
              )}
            </div>

            {/* WhatsApp Number */}
            <div className="mb-0">
              <Label htmlFor="whatsappNumber" className="text-gray-300 mb-2 block">
                {t('whatsappNumber', language)} <span className="text-red-500">*</span>
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
            <h3 className="text-white mb-4">{t('optionalInformation', language)}</h3>

            {/* Age */}
            <div className="mb-4">
              <Label htmlFor="age" className="text-gray-300 mb-2 block">
                {t('age', language)}
              </Label>
              <Input
                id="age"
                type="text"
                placeholder={t('enterAge', language)}
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
                  ✓ Converted to: {normalizeIndicNumerals(formData.age)}
                </p>
              )}
            </div>

            {/* Gender */}
            <div className="mb-4">
              <Label htmlFor="gender" className="text-gray-300 mb-2 block">
                {t('gender', language)}
              </Label>
              <Select value={formData.gender} onValueChange={(value: string) => setFormData({ ...formData, gender: value })}>
                <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white focus:border-emerald-500 focus:ring-emerald-500">
                  <SelectValue placeholder={t('selectGender', language)} />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-gray-700">
                  <SelectItem value="male" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                    {t('male', language)}
                  </SelectItem>
                  <SelectItem value="female" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                    {t('female', language)}
                  </SelectItem>
                  <SelectItem value="other" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                    {t('other', language)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Purpose of Visit */}
            <div className="mb-0">
              <Label htmlFor="purposeOfVisit" className="text-gray-300 mb-2 block">
                {t('purposeOfVisit', language)}
              </Label>
              <Select value={formData.purposeOfVisit} onValueChange={(value: string) => setFormData({ ...formData, purposeOfVisit: value })}>
                <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white focus:border-emerald-500 focus:ring-emerald-500">
                  <SelectValue placeholder={t('selectPurposeOfVisit', language)} />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-gray-700">
                  <SelectItem value="new-patient" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                    {t('newPatientInitialConsultation', language)}
                  </SelectItem>
                  <SelectItem value="existing-patient" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                    {t('existingPatientNewTreatment', language)}
                  </SelectItem>
                  <SelectItem value="report-review" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                    {t('reportReview', language)}
                  </SelectItem>
                  <SelectItem value="follow-up" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                    {t('followUpConsultation', language)}
                  </SelectItem>
                  <SelectItem value="routine-checkup" className="text-white hover:bg-gray-700 focus:bg-gray-700">
                    {t('routineCheckup', language)}
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
                  {t('havePreviousPrescription', language)}
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  {t('uploadPrescriptionHelp', language)}
                </p>
                {uploadedRx ? (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {t('prescriptionUploadedSuccess', language)} 
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
                    {t('uploadPreviousPrescription', language)}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Consent & Terms Card */}
        <div className="bg-[#1a1f2e] rounded-xl p-6 mb-6">
          <h3 className="text-white mb-4">{t('consentAndTerms', language)}</h3>

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
            <h3 className="text-white mb-4">💰 Consultation Fee</h3>
            
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
              <span className="text-gray-400">Consultation Charge:</span>
              <span className="text-2xl text-emerald-500">₹{consultationFee}</span>
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
                  Pay Now ₹{consultationFee}
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
                  <span className="text-emerald-400">Payment Submitted Successfully! ✓</span>
                </div>
                <p className="text-sm text-gray-400 ml-9">
                  UTR: {formData.utrNumber}
                </p>
                <p className="text-xs text-yellow-400 ml-9 mt-2">
                  ⏳ Payment verification pending. Doctor will confirm before consultation.
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
                      Please pay ₹{consultationFee} at the clinic before consultation
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
            {t('back', language)}
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
              {isSubmitting ? 'Submitting...' : t('submit', language)}
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
