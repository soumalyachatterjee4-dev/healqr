import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Home, Building2, Check, Loader2, AlertTriangle } from 'lucide-react';
import { db, auth } from '../lib/firebase/config';
import { doc, getDoc, addDoc, collection, updateDoc, increment, serverTimestamp, onSnapshot } from 'firebase/firestore';
import QRCode from "react-qr-code";
import { saveNotificationHistory } from '../services/notificationHistoryService';
import { generateBookingId } from '../utils/idGenerator';

export interface PatientFormData {
  patientName: string;
  whatsappNumber: string;
  age: string;
  gender: string;
  purposeOfVisit: string;
  visitType: 'home-call' | 'walk-in';
}

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPatient?: (patient: PatientFormData) => void;
  doctorId?: string;
  doctorName?: string; // Doctor's name for display
}

export default function AddPatientModal({ isOpen, onClose, onAddPatient, doctorId, doctorName }: AddPatientModalProps) {
  const [formData, setFormData] = useState({
    patientName: '',
    whatsappNumber: '',
    age: '',
    gender: '',
    purposeOfVisit: '',
    visitType: 'walk-in', // 'home-call' or 'walk-in'
    consent1: true,
    consent2: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadedDoctorName, setLoadedDoctorName] = useState('');
  const [showManualConfirmation, setShowManualConfirmation] = useState(false);

  // QR Verification State
  const [showQrStep, setShowQrStep] = useState(false);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  // Real-time listener for verification status
  useEffect(() => {
    if (!showQrStep || !currentBookingId) return;

    const unsubscribe = onSnapshot(doc(db!, 'bookings', currentBookingId), async (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        if (data.verifiedByPatient) {
          setIsVerified(true);

          // 🔔 SCHEDULE CONFIRMATION NOTIFICATION (30 mins delay)
          try {
             const { scheduleConsultationConfirmation } = await import('../services/notificationService');
             await scheduleConsultationConfirmation({
                patientPhone: formData.whatsappNumber.startsWith('+91')
                  ? formData.whatsappNumber
                  : `+91${formData.whatsappNumber.replace(/^\+91\s*/, '')}`,
                patientName: formData.patientName,
                doctorName: doctorName || loadedDoctorName,
                bookingId: currentBookingId,
                consultationDate: new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }),
                consultationTime: new Date().toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }),
                language: 'english',
                // Additional fields for history - ensure proper string conversion
                age: formData.age !== undefined && formData.age !== '' ? String(formData.age) : undefined,
                sex: formData.gender || undefined,
                purpose: formData.purposeOfVisit || undefined,
                doctorId: doctorId || auth!.currentUser?.uid, // Fallback to current user if prop missing
                clinicName: 'Walk-In Clinic' // Fallback
             });
             console.log('✅ Confirmation scheduled for 30 mins after verification');
          } catch (err) {
             console.warn('Failed to schedule confirmation:', err);
          }

          // Auto close after 2 seconds
          setTimeout(() => {
            if (onAddPatient) {
               onAddPatient(formData as PatientFormData);
            }
            // Reset and close
            setFormData({
                patientName: '',
                whatsappNumber: '',
                age: '',
                gender: '',
                purposeOfVisit: '',
                visitType: 'walk-in',
                consent1: true,
                consent2: true,
            });
            setShowQrStep(false);
            setCurrentBookingId(null);
            setIsVerified(false);
            onClose();
          }, 2000);
        }
      }
    });

    return () => unsubscribe();
  }, [showQrStep, currentBookingId, onClose, onAddPatient, formData, doctorName]);

  // Load doctor data
  useEffect(() => {
    const loadDoctorData = async () => {
      const currentDoctorId = doctorId || auth!.currentUser?.uid;
      if (!currentDoctorId) return;

      try {
        const doctorDoc = await getDoc(doc(db!, 'doctors', currentDoctorId));
        if (doctorDoc.exists()) {
          const data = doctorDoc.data();
          setLoadedDoctorName(data.name || 'Doctor');
        }
      } catch (error) {
        console.error('Error loading doctor data:', error);
      }
    };

    if (isOpen) {
      loadDoctorData();
    }
  }, [doctorId, isOpen]);

  const processSubmission = async (skipQr: boolean) => {
    // Validation
    if (!formData.patientName || !formData.whatsappNumber) {
      toast.error('Required Fields Missing', {
        description: 'Please fill in all required fields.',
        duration: 3000,
      });
      return;
    }

    if (!formData.consent1 || !formData.consent2) {
      toast.error('Consent Required', {
        description: 'Please accept all terms and conditions.',
        duration: 3000,
      });
      return;
    }


    setIsSubmitting(true);

    try {
      // Get clinic ID and doctor ID
      const user = auth!.currentUser;
      const clinicId = user?.uid; // Current logged-in clinic
      const currentDoctorId = doctorId || user?.uid;

      if (!currentDoctorId) {
        toast.error('Authentication Error', {
          description: 'Please log in again.',
          duration: 3000,
        });
        setIsSubmitting(false);
        return;
      }

      // Fetch doctor's doctorCode for proper booking ID generation
      const doctorDoc = await getDoc(doc(db!, 'doctors', currentDoctorId));
      if (!doctorDoc.exists()) {
        toast.error('Doctor not found', {
          description: 'Please contact support.',
          duration: 3000,
        });
        setIsSubmitting(false);
        return;
      }

      const doctorData = doctorDoc.data();
      const doctorCodeFromDb = doctorData.doctorCode;

      if (!doctorCodeFromDb) {
        toast.error('Doctor code missing', {
          description: 'Please contact support to set up your doctor code.',
          duration: 3000,
        });
        setIsSubmitting(false);
        return;
      }

      // Generate booking ID using standardized format: HQR-711110-0001-DR-260126-0001-P
      const bookingId = await generateBookingId(doctorCodeFromDb, new Date());

      // Generate serial token number based on today's walk-in bookings
      if (!db) {
        toast.error('Database connection error', {
          description: 'Please try again.',
          duration: 3000,
        });
        setIsSubmitting(false);
        return;
      }

      const { query: firestoreQuery, where, getDocs } = await import('firebase/firestore');
      const bookingsRef = collection(db, 'bookings');

      // Get today's date string (YYYY-MM-DD)
      const todayStr = new Date().toISOString().split('T')[0];

      // Query ALL bookings for this doctor (same as QR booking side)
      const q = firestoreQuery(
        bookingsRef,
        where('doctorId', '==', currentDoctorId)
      );

      const querySnapshot = await getDocs(q);

      // Filter for today's bookings only (QR + walk-in combined)
      const todaysBookings = querySnapshot.docs.filter(doc => {
        const bookingData = doc.data();
        const bookingDate = bookingData.date?.toDate ? bookingData.date.toDate() : bookingData.date;
        const bookingDateStr = bookingDate instanceof Date ? bookingDate.toISOString().split('T')[0] : '';
        return bookingDateStr === todayStr;
      });

      // Generate serial token number (same logic as QR booking side)
      const tokenNumber = `#${todaysBookings.length + 1}`;
      const serialNo = todaysBookings.length + 1;

      const submissionTimestamp = new Date();

      // Save booking to Firestore
      const bookingDocRef = await addDoc(collection(db!, 'bookings'), {
        bookingId,
        tokenNumber,
        serialNo, // Store numeric serial for consistent sorting with QR bookings
        patientName: formData.patientName,
        whatsappNumber: formData.whatsappNumber.startsWith('+91')
          ? formData.whatsappNumber
          : `+91${formData.whatsappNumber.replace(/^\+91\s*/, '')}`,
        age: formData.age || null,
        gender: formData.gender || null,
        purposeOfVisit: formData.purposeOfVisit || null,
        visitType: formData.visitType,
        doctorId: currentDoctorId,
        doctorName: doctorName || loadedDoctorName,
        clinicId: clinicId || null, // Clinic ID to differentiate clinic walk-ins from doctor's personal walk-ins
        date: new Date(),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        type: 'walkin_booking', // Walk-in booking type (no chamber or appointment date needed)
        status: 'confirmed',
        createdAt: serverTimestamp(),
        isMarkedSeen: true, // Walk-in patient is immediately considered "seen"
        markedSeenAt: submissionTimestamp,
        markedSeenBy: currentDoctorId,
        reviewScheduled: true, // Auto-activate review request
        reviewScheduledAt: submissionTimestamp,
        // Manual verification fields
        verifiedByPatient: skipQr, // If skipping QR, mark as verified (manually)
        verificationMethod: skipQr ? 'manual_override' : 'qr_scan',
        isWalkIn: true, // Walk-in patients are always walk-ins
      });

      // Get the Firestore document ID for QR code
      const firestoreDocId = bookingDocRef.id;

      // ============================================
      // 🔔 SCHEDULE REVIEW REQUEST NOTIFICATION
      // Sent 24 hours after patient submission (same as QR patients)
      // ============================================
      try {
        // Check for Clinic Restrictions
        let isReviewRestricted = false;
        if (currentDoctorId) {
          const doctorSnap = await getDoc(doc(db, 'doctors', currentDoctorId));
          if (doctorSnap.exists()) {
            const clinicId = doctorSnap.data().clinicId;
            if (clinicId) {
              const clinicSnap = await getDoc(doc(db, 'clinics', clinicId));
              if (clinicSnap.exists() && clinicSnap.data().centralizedReviews) {
                isReviewRestricted = true;
              }
            }
          }
        }

        if (!isReviewRestricted) {
          const { scheduleReviewRequest } = await import('../services/notificationService');

          await scheduleReviewRequest(
            {
              patientPhone: formData.whatsappNumber.startsWith('+91')
                ? formData.whatsappNumber
                : `+91${formData.whatsappNumber.replace(/^\+91\s*/, '')}`,
              patientName: formData.patientName,
              doctorName: doctorName,
              doctorId: currentDoctorId,
              bookingId: bookingId, // Use the generated bookingId variable (HQL-...)
              consultationDate: new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              language: 'english', // Walk-in patients default to English (can be enhanced later)
            },
            submissionTimestamp
          );
          console.log('✅ Review request scheduled for 24h after walk-in submission');
        } else {
          console.log('🚫 Review request suppressed by Clinic settings');
        }
      } catch (notifError) {
        console.warn('⚠️ Review notification scheduling error (non-blocking):', notifError);
        // Don't show error to user - notification is optional
      }

      // ✅ INCREMENT DOCTOR'S BOOKING COUNT (CRITICAL)
      await updateDoc(doc(db, 'doctors', currentDoctorId), {
        bookingsCount: increment(1)
      });

      // Check if limit reached and auto-block
      const updatedDoctorDoc = await getDoc(doc(db, 'doctors', currentDoctorId));
      if (updatedDoctorDoc.exists()) {
        const data = updatedDoctorDoc.data();

        // Check booking limit
        if (data.bookingsCount >= data.bookingsLimit) {
          await updateDoc(doc(db, 'doctors', currentDoctorId), {
            bookingBlocked: true,
            blockReason: 'booking_limit'
          });

          toast.warning('Booking Limit Reached!', {
            description: 'You have reached your booking limit. Please upgrade your subscription.',
            duration: 5000,
          });
        }

        // Check trial expiry
        if (data.subscriptionStatus === 'trial' && data.trialEndDate) {
          const today = new Date();
          const trialEnd = data.trialEndDate.toDate();
          if (today > trialEnd) {
            await updateDoc(doc(db, 'doctors', currentDoctorId), {
              bookingBlocked: true,
              blockReason: 'trial_expired',
              subscriptionStatus: 'expired'
            });
          }
        }
      }

      if (skipQr) {
        // Manual verification flow

        // Log history for manual walk-in (since no notification is sent)
        try {
          const normalizedPhone = formData.whatsappNumber.replace(/\D/g, '').slice(-10);
          console.log('🔔 Attempting to log manual walk-in history:', {
            normalizedPhone,
            patientName: formData.patientName,
            doctorId: currentDoctorId,
            doctorName: doctorName || loadedDoctorName,
            bookingId: bookingId // Use the generated bookingId variable (HQL-...)
          });

          const now = new Date();
          await saveNotificationHistory({
            patientPhone: normalizedPhone,
            patientName: formData.patientName,
            age: formData.age !== undefined && formData.age !== '' ? String(formData.age) : undefined,
            sex: formData.gender || undefined,
            purpose: formData.purposeOfVisit || undefined,
            doctorName: doctorName || loadedDoctorName || 'Doctor',
            clinicName: 'Walk-In Clinic',
            notificationType: 'booking_confirmed',
            bookingStatus: 'confirmed',
            notificationStatus: 'sent',
            timestamp: now,
            consultationDate: new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0], // YYYY-MM-DD format
            consultationTime: now.toTimeString().split(' ')[0].slice(0, 5), // HH:mm format
            bookingId: bookingId, // Use the generated bookingId variable (HQL-...)
            doctorId: currentDoctorId,
            message: 'Manual Walk-In Entry',
            isWalkIn: true,
            walkInVerified: true,
          });
          console.log('✅ Manual walk-in history logged successfully!');
        } catch (histError) {
          console.error('❌ Failed to log manual walk-in history:', histError);
          // Show detailed error for debugging
          if (histError instanceof Error) {
            console.error('Error details:', {
              name: histError.name,
              message: histError.message,
              stack: histError.stack
            });
          }
        }

        if (onAddPatient) {
           onAddPatient(formData as PatientFormData);
        }
        toast.success('Patient Added Manually', {
          description: 'Patient has been added without QR verification.',
          duration: 3000,
        });
        handleCancel(); // Reset and close
      } else {
        // QR verification flow
        setCurrentBookingId(firestoreDocId); // Use Firestore document ID for QR code lookup
        setShowQrStep(true);
        setIsSubmitting(false);

        toast.success('Patient Added - Verification Required', {
          description: `Please ask ${formData.patientName} to scan the QR code.`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error adding walk-in patient:', error);
      toast.error('Failed to Add Patient', {
        description: 'Please try again.',
        duration: 3000,
      });
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processSubmission(false);
  };

  const handleCancel = () => {
    setFormData({
      patientName: '',
      whatsappNumber: '',
      age: '',
      gender: '',
      purposeOfVisit: '',
      visitType: 'walk-in',
      consent1: true,
      consent2: true,
    });
    setShowQrStep(false);
    setCurrentBookingId(null);
    setIsVerified(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="bg-[#1a1f2e] border-gray-800 text-white max-w-lg max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-emerald-500 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-emerald-600 scrollbar-thin scrollbar-thumb-emerald-500 scrollbar-track-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white text-center">
            {showQrStep ? 'Verify Patient Visit' : 'Patient Information'}
          </DialogTitle>
          <DialogDescription className="text-emerald-400 text-center text-sm">
            {showQrStep
              ? 'Ask the patient to scan this QR code to verify their visit'
              : 'Please fill in the patient details below'}
          </DialogDescription>
        </DialogHeader>


        {showQrStep ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-6 animate-in fade-in zoom-in duration-300">
            {isVerified ? (
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                  <Check className="w-12 h-12 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-emerald-400">Verified!</h3>
                <p className="text-gray-400 text-center mt-2">
                  Patient has successfully verified their visit details.
                </p>
                <p className="text-xs text-gray-500 mt-4">Closing automatically...</p>
              </div>
            ) : (
              <>
                <div className="bg-white p-4 rounded-xl">
                  <QRCode
                    value={`${window.location.origin}/verify-visit/${currentBookingId}`}
                    size={200}
                    level="H"
                  />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-400">
                    Scanning this QR code will open the verification page on the patient's device.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                    <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />
                    <span className="text-yellow-500">Waiting for patient to scan & confirm...</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="mt-4 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  Cancel Verification
                </Button>
              </>
            )}
          </div>
        ) : showManualConfirmation ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-6 animate-in fade-in zoom-in duration-300">
             <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mb-2">
               <AlertTriangle className="w-10 h-10 text-yellow-500" />
             </div>
             <div className="text-center space-y-2 max-w-xs">
               <h3 className="text-xl font-bold text-white">Skip Verification?</h3>
               <p className="text-gray-400 text-sm">
                 Patient will not get any notification as a medium for communication at your side.
               </p>
             </div>
             <div className="flex gap-3 w-full max-w-xs">
               <Button
                 variant="outline"
                 onClick={() => setShowManualConfirmation(false)}
                 className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
               >
                 Cancel
               </Button>
               <Button
                 onClick={() => processSubmission(true)}
                 disabled={isSubmitting}
                 className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
               >
                 {isSubmitting ? 'Saving...' : 'Save Anyway'}
               </Button>
             </div>
           </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Required Information */}
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-red-500">*</span>
              <span className="text-white">Required Information</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patientName" className="text-white text-sm">
                  Patient Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="patientName"
                  type="text"
                  placeholder="Enter patient's full name"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  className="bg-black border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsappNumber" className="text-white text-sm">
                  WhatsApp Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="whatsappNumber"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  className="bg-black border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Optional Information */}
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
            <div className="text-white mb-4">Optional Information</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age" className="text-white text-sm">Age</Label>
                <Input
                  id="age"
                  type="text"
                  placeholder="Enter age"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="bg-black border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender" className="text-white text-sm">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger className="bg-black border-gray-700 text-white">
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purposeOfVisit" className="text-white text-sm">Purpose of Visit</Label>
              <Select
                value={formData.purposeOfVisit}
                onValueChange={(value) => setFormData({ ...formData, purposeOfVisit: value })}
              >
                <SelectTrigger className="bg-black border-emerald-500 text-white">
                  <SelectValue placeholder="Select purpose of visit" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 text-white">
                  <SelectItem value="new-patient">New Patient - Initial Consultation</SelectItem>
                  <SelectItem value="existing-patient">Existing Patient - New Treatment (First Visit)</SelectItem>
                  <SelectItem value="report-review">Report Review (Within 5 Days of Initial Visit)</SelectItem>
                  <SelectItem value="follow-up">Follow-up Consultation (After 5 Days)</SelectItem>
                  <SelectItem value="routine-checkup">Routine Check-up</SelectItem>
                  <SelectItem value="emergency">Emergency Consultation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Visit Type */}
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
            <div className="text-white mb-4">Visit Type</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Home Call */}
              <div
                onClick={() => setFormData({ ...formData, visitType: 'home-call' })}
                className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                  formData.visitType === 'home-call'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-gray-700 bg-gray-800/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      formData.visitType === 'home-call'
                        ? 'border-emerald-500'
                        : 'border-gray-600'
                    }`}>
                      {formData.visitType === 'home-call' && (
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Home className="w-4 h-4 text-gray-400" />
                      <span className="text-white text-sm">Home Call</span>
                    </div>
                    <p className="text-gray-400 text-xs">Doctor will visit patient's location</p>
                  </div>
                </div>
              </div>

              {/* Walk-In Chamber */}
              <div
                onClick={() => setFormData({ ...formData, visitType: 'walk-in' })}
                className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                  formData.visitType === 'walk-in'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-gray-700 bg-gray-800/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      formData.visitType === 'walk-in'
                        ? 'border-emerald-500'
                        : 'border-gray-600'
                    }`}>
                      {formData.visitType === 'walk-in' && (
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-white text-sm">Walk-In Chamber Patient</span>
                    </div>
                    <p className="text-gray-400 text-xs">Patient will visit the chamber</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Consent & Terms */}
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
            <div className="text-white mb-2">Consent & Terms</div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="consent1"
                checked={formData.consent1}
                onCheckedChange={(checked) => setFormData({ ...formData, consent1: checked as boolean })}
                className="border-emerald-500 data-[state=checked]:bg-emerald-500 mt-0.5 flex-shrink-0"
              />
              <label htmlFor="consent1" className="text-sm text-gray-300 cursor-pointer leading-relaxed">
                I accept notifications from <span className="text-emerald-400 whitespace-nowrap">www.healqr.com</span> during this treatment procedure
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="consent2"
                checked={formData.consent2}
                onCheckedChange={(checked) => setFormData({ ...formData, consent2: checked as boolean })}
                className="border-emerald-500 data-[state=checked]:bg-emerald-500 mt-0.5 flex-shrink-0"
              />
              <label htmlFor="consent2" className="text-sm text-gray-300 cursor-pointer leading-relaxed">
                I understand that <span className="text-emerald-400 whitespace-nowrap">www.healqr.com</span> is only a digital booking platform and does not have any role in medical treatment and advice
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setShowManualConfirmation(true)}
              className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors"
            >
              Save without verification?
            </button>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className={isSubmitting
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
              >
                {isSubmitting ? 'Submitting...' : '+ Submit & Verify'}
              </Button>
            </div>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
