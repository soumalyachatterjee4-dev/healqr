import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Menu, MapPin, Clock, Plus, Calendar, ArrowLeft, User, Power } from 'lucide-react';
import { useState, useEffect } from 'react';
import ClinicSidebar from './ClinicSidebar';
import AddPatientModal, { PatientFormData } from './AddPatientModal';
import PatientDetails from './PatientDetails';
import ChamberBlockingModal from './ChamberBlockingModal';
import ChamberRestorationModal from './ChamberRestorationModal';
import { toast } from 'sonner';
import { auth, db } from '../lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc } from 'firebase/firestore';

interface ClinicTodaysScheduleProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
}

interface DoctorChamber {
  id: number;
  chamberName: string;
  chamberAddress: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  days: string[];
  frequency: string;
  customDate?: string;
  isActive: boolean;
  blockedDates?: string[];
  startMinutes: number;
  isExpired: boolean;
  booked: number;
  schedule: string;
  doctorId?: string;
}

interface DoctorSchedule {
  doctorId: string;
  doctorName: string;
  specialty: string;
  chambers: DoctorChamber[];
}

// Helper component to load and display patient details for a specific chamber
function ChamberPatientDetailsLoader({
  chamber,
  doctorId,
  onBack,
}: {
  chamber: DoctorChamber;
  doctorId: string;
  onBack: () => void;
}) {
  const [chamberPatients, setChamberPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshPatients = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const loadPatients = async () => {
      try {
        setLoading(true);
        const { decrypt } = await import('../utils/encryptionService');

        const today = new Date();
        const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

        const bookingsRef = collection(db, 'bookings');
        const currentClinicId = auth?.currentUser?.uid;

        // 🔒 Check if this doctor has restricted their QR data from this clinic
        // Read from DOCTOR's profile (not clinic doc - doctor has no write permission there)
        let isDoctorQrRestricted = false;
        if (currentClinicId && doctorId) {
          try {
            const { doc: firestoreDoc, getDoc: firestoreGetDoc } = await import('firebase/firestore');
            const doctorDoc = await firestoreGetDoc(firestoreDoc(db, 'doctors', doctorId));
            if (doctorDoc.exists()) {
              const doctorData = doctorDoc.data();
              const selfRestrictedClinics: string[] = doctorData.selfRestrictedClinics || [];
              const manualClinics: any[] = doctorData.manualClinics || [];

              // Check if any of the doctor's self-restricted manual clinics match this clinic
              // We need to find the clinic document that matches the currentClinicId
              // and check if the manual clinic with the matching clinicCode is restricted
              const { collection: firestoreCollection, getDocs: firestoreGetDocs, query: firestoreQuery, where: firestoreWhere } = await import('firebase/firestore');
              const clinicDoc = await firestoreGetDoc(firestoreDoc(db, 'clinics', currentClinicId));
              if (clinicDoc.exists()) {
                const clinicCode = clinicDoc.data().clinicCode;
                if (clinicCode) {
                  // Find the manual clinic entry that has this clinicCode
                  const matchingManualClinic = manualClinics.find((mc: any) => mc.clinicCode === clinicCode);
                  if (matchingManualClinic && selfRestrictedClinics.includes(matchingManualClinic.id)) {
                    isDoctorQrRestricted = true;
                    console.log('🔒 Doctor self-restricted QR data from clinic:', {
                      doctorId,
                      clinicId: currentClinicId,
                      clinicCode,
                      manualClinicId: matchingManualClinic.id
                    });
                  }
                }
              }
            }
          } catch (err) {
            console.error('Error checking doctor QR restriction:', err);
          }
        }

        let numericChamberId = typeof chamber.id === 'string' ? parseInt(chamber.id, 10) : chamber.id;

        if (!numericChamberId || isNaN(numericChamberId)) {
          numericChamberId = -1;
        }

        // Query 1: QR bookings for this chamber
        const qrBookingsQuery = query(
          bookingsRef,
          where('chamberId', '==', numericChamberId),
          where('appointmentDate', '==', todayStr)
        );

        const qrBookingsSnap = await getDocs(qrBookingsQuery);

        // Query 1B: Fallback query for non-linked doctors - search by doctorId + chamberId + date
        // This handles cases where clinic QR bookings might have different chamberId mapping
        let fallbackQrBookings: any[] = [];
        if (qrBookingsSnap.empty) {
          const fallbackQuery = query(
            bookingsRef,
            where('doctorId', '==', doctorId),
            where('appointmentDate', '==', todayStr)
          );
          const fallbackSnap = await getDocs(fallbackQuery);
          fallbackQrBookings = fallbackSnap.docs.filter(doc => {
            const data = doc.data();
            return data.type !== 'walkin_booking';
          });
        }

        // Query 2: Walk-in bookings for this doctor + clinic (added via ADD PATIENT button)
        const walkInQuery = query(
          bookingsRef,
          where('doctorId', '==', doctorId),
          where('type', '==', 'walkin_booking'),
          where('clinicId', '==', currentClinicId || null)
        );

        const walkInSnap = await getDocs(walkInQuery);

        // Filter walk-ins for today
        const todaysWalkIns = walkInSnap.docs.filter(doc => {
          const data = doc.data();
          const bookingDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);
          const bookingDateStr = bookingDate instanceof Date ? bookingDate.toISOString().split('T')[0] : '';
          return bookingDateStr === todayStr;
        });

        // Process QR bookings (use fallback if primary query returned no results)
        const qrBookingDocs = (qrBookingsSnap.empty && fallbackQrBookings.length > 0
          ? fallbackQrBookings
          : qrBookingsSnap.docs
              .filter(doc => {
                const data = doc.data();
                return data.type !== 'walkin_booking';
              })
        ).filter(doc => {
          const data = doc.data();
          const dataChamberId = typeof data.chamberId === 'string' ? parseInt(data.chamberId, 10) : data.chamberId;
          if (dataChamberId !== undefined && dataChamberId !== null && !isNaN(dataChamberId)) {
            return dataChamberId === numericChamberId;
          }
          const chamberName = (data.chamberName || data.chamber || '').toString().toLowerCase();
          const targetName = (chamber.chamberName || '').toString().toLowerCase();
          return chamberName !== '' && targetName !== '' && chamberName === targetName;
        });

        const buildAppointmentDateTime = (dateValue: any, timeValue: any, fallback: Date) => {
          if (dateValue && timeValue && timeValue !== 'immediate') {
            const dateStr = typeof dateValue === 'string'
              ? dateValue
              : (dateValue.toDate ? dateValue.toDate().toISOString().split('T')[0] : '');
            const timeStr = String(timeValue);
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
              if (match) {
                let hour = parseInt(match[1], 10);
                const minute = parseInt(match[2], 10);
                const ampm = (match[3] || '').toLowerCase();
                if (ampm === 'pm' && hour < 12) hour += 12;
                if (ampm === 'am' && hour === 12) hour = 0;
                date.setHours(hour, minute, 0, 0);
                return date;
              }
            }
          }

          if (dateValue?.toDate) return dateValue.toDate();
          if (dateValue) {
            const parsed = new Date(dateValue);
            if (!isNaN(parsed.getTime())) return parsed;
          }
          return fallback;
        };

        const qrPatients = qrBookingDocs
          .map(doc => {
            const data = doc.data();

            const bookingTime = data.createdAt?.toDate
              ? data.createdAt.toDate()
              : new Date(data.createdAt);

            const appointmentFallback = data.date?.toDate ? data.date.toDate() : bookingTime;
            const appointmentTime = buildAppointmentDateTime(data.appointmentDate, data.time, appointmentFallback);

            const isCancelledStatus = (data.isCancelled === true) || (data.status === 'cancelled');

            const patientName = decrypt(data.patientName_encrypted || data.patientName || '');
            const whatsappNumber = decrypt(data.whatsappNumber_encrypted || data.whatsappNumber || '');
            const ageDecrypted = decrypt(data.age_encrypted || '');
            const genderDecrypted = decrypt(data.gender_encrypted || data.gender || '');
            const purposeDecrypted = decrypt(data.purposeOfVisit_encrypted || data.purposeOfVisit || '');

            let parsedAge = 0;
            if (ageDecrypted) {
              const ageNum = parseInt(ageDecrypted.toString().trim());
              parsedAge = isNaN(ageNum) ? 0 : ageNum;
            } else if (data.age) {
              const ageNum = typeof data.age === 'number' ? data.age : parseInt(data.age.toString().trim());
              parsedAge = isNaN(ageNum) ? 0 : ageNum;
            }

            // 🔒 Doctor QR restriction: mask data if doctor has restricted AND this is a doctor_qr booking
            const bookingSource = data.bookingSource;
            const shouldMask = isDoctorQrRestricted && (bookingSource === 'doctor_qr' || (!bookingSource && !data.clinicId));

            const maskName = (name: string) => {
              if (!name || name === 'N/A') return name;
              const parts = name.trim().split(' ');
              return parts.map(part =>
                part.length > 0 ? part[0] + '*'.repeat(part.length > 1 ? part.length - 1 : 3) : part
              ).join(' ');
            };

            return {
              id: doc.id,
              name: shouldMask ? maskName(patientName || 'N/A') : (patientName || 'N/A'),
              phone: shouldMask ? ('*'.repeat(6) + (whatsappNumber || '').slice(-4)) : (whatsappNumber || data.phone || 'N/A'),
              bookingId: data.bookingId || doc.id,
              age: shouldMask ? 0 : parsedAge,
              gender: shouldMask ? '**' : (genderDecrypted || 'MALE').toUpperCase(),
              visitType: shouldMask ? '*********' : (purposeDecrypted || data.visitType || (data.consultationType === 'video' ? 'Video Consultation' : 'In-Person')),
              bookingTime: bookingTime,
              appointmentTime: appointmentTime,
              appointmentDate: data.appointmentDate,
              paymentVerified: data.paymentVerified || false,
              consultationType: data.consultationType || 'chamber',
              language: data.language || 'english',
              prescriptionUrl: data.prescriptionUrl,
              prescriptionReviewed: data.prescriptionReviewed || false,
              isCancelled: isCancelledStatus,
              isMarkedSeen: data.isMarkedSeen || false,
              reminderSent: data.reminderSent || false,
              fcmNotificationSent: data.fcmNotificationSent || false,
              doctorId: data.doctorId,
              chamberId: data.chamberId,
              serialNo: data.serialNo || 0, // 🔄 SYNCHRONIZE: Use serialNo from Firestore
              tokenNumber: data.tokenNumber || `#${data.serialNo || 0}`, // 🔄 SYNCHRONIZE
              type: 'qr_booking', // Mark as QR booking
              isDataRestricted: shouldMask || false,
              bookingSource: bookingSource || 'clinic_qr',
              clinicId: data.clinicId || '',
              digitalRxUrl: data.digitalRxUrl || '',
              dietChartUrl: data.dietChartUrl || '',
              // Video consultation Firestore fields
              vcPatientJoined: data.vcPatientJoined || false,
              vcCompleted: data.vcCompleted || false,
              vcLinkSentAt: data.vcLinkSentAt || null,
            };
          });

        // Process walk-in patients (filter to this chamber when possible)
        const walkInPatients = todaysWalkIns
          .filter(doc => {
            const data = doc.data();
            const dataChamberId = typeof data.chamberId === 'string' ? parseInt(data.chamberId, 10) : data.chamberId;
            if (dataChamberId !== undefined && dataChamberId !== null && !isNaN(dataChamberId)) {
              return dataChamberId === numericChamberId;
            }
            const chamberName = (data.chamberName || data.chamber || '').toString().toLowerCase();
            const targetName = (chamber.chamberName || '').toString().toLowerCase();
            return chamberName !== '' && targetName !== '' && chamberName === targetName;
          })
          .map(doc => {
            const data = doc.data();

          const bookingTime = data.createdAt?.toDate
            ? data.createdAt.toDate()
            : new Date(data.createdAt || new Date());

          const appointmentFallback = data.date?.toDate ? data.date.toDate() : bookingTime;
          const appointmentTime = buildAppointmentDateTime(data.appointmentDate, data.time, appointmentFallback);

          // Walk-in patients are NOT encrypted (entered manually by clinic)
          const patientName = data.patientName || 'N/A';
          const whatsappNumber = data.whatsappNumber || 'N/A';
          const age = data.age || 0;
          const gender = data.gender || 'N/A';
          const purposeOfVisit = data.purposeOfVisit || 'N/A';

            return {
            id: doc.id,
            name: patientName,
            phone: whatsappNumber,
            bookingId: data.bookingId || doc.id,
            tokenNumber: data.tokenNumber || '#0',
            serialNo: data.serialNo || 0, // 🔄 SYNCHRONIZE: Walk-ins also have serialNo
            age: typeof age === 'number' ? age : (parseInt(age) || 0),
            gender: gender.toUpperCase(),
            visitType: data.visitType || 'walk-in',
            purposeOfVisit: purposeOfVisit,
            bookingTime: bookingTime,
            appointmentTime: appointmentTime,
            appointmentDate: todayStr,
            paymentVerified: false,
            consultationType: 'chamber',
            language: 'english',
            prescriptionUrl: data.prescriptionUrl || null,
            prescriptionReviewed: data.prescriptionReviewed || false,
            isCancelled: false,
            // manual_override → always "seen" (no Eye flow needed)
            // QR-verified → only "seen" if consultation was actually completed via Eye flow
            isMarkedSeen: (data.verificationMethod || 'manual_override') === 'manual_override'
              ? true
              : !!(data.consultationStatus === 'completed' || data.digitalRxUrl),
            reminderSent: false,
            fcmNotificationSent: false,
            doctorId: data.doctorId,
            chamberId: data.chamberId ?? numericChamberId,
            type: 'walkin_booking', // Mark as walk-in
            verifiedByPatient: data.verifiedByPatient || false,
            verificationMethod: data.verificationMethod || 'manual_override',
            reviewScheduled: data.reviewScheduled || false,
            followUpScheduled: data.followUpScheduled || false,
            digitalRxUrl: data.digitalRxUrl || '',
            dietChartUrl: data.dietChartUrl || '',
            isWalkIn: true,
            };
          });

        // Combine QR and walk-in patients
        const allPatients = [...qrPatients, ...walkInPatients]
          .sort((a, b) => {
            // 1. Non-cancelled first
            if (a.isCancelled !== b.isCancelled) return a.isCancelled ? 1 : -1;
            // 2. Not seen first (active patients)
            if (a.isMarkedSeen !== b.isMarkedSeen) return a.isMarkedSeen ? 1 : -1;
            // 3. Sort by stored serial number (assigned at booking time)
            return (a.serialNo || 0) - (b.serialNo || 0);
          });

        setChamberPatients(allPatients);
      } catch (error) {
        console.error('Error loading chamber patients:', error);
        toast.error('Failed to load patients');
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, [chamber.id, doctorId, refreshTrigger]);

  // 🔥 REAL-TIME LISTENER: Triggers refresh via state
  useEffect(() => {
    const bookingsRef = collection(db, 'bookings');

    let numericChamberId = typeof chamber.id === 'string' ? parseInt(chamber.id, 10) : chamber.id;
    if (!numericChamberId || isNaN(numericChamberId)) {
      numericChamberId = -1;
    }

    let timeoutId: NodeJS.Timeout | null = null;

    const qrBookingsQuery = query(
      bookingsRef,
      where('chamberId', '==', numericChamberId)
    );

    const unsubscribe = onSnapshot(qrBookingsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified' || change.type === 'removed') {
          console.log('🔄 Chamber booking changed, triggering refresh...');
          // Debounce to prevent rapid reloads
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            setRefreshTrigger(prev => prev + 1); // Trigger loadPatients
          }, 800);
        }
      });
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [chamber.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div>Loading patients...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-4 md:p-8">
        <Button
          onClick={onBack}
          variant="ghost"
          className="mb-4 text-blue-500 hover:text-blue-400"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Schedule
        </Button>

        <PatientDetails
          chamberName={chamber.chamberName}
          chamberAddress={chamber.chamberAddress}
          scheduleTime={`${chamber.startTime} - ${chamber.endTime}`}
          scheduleDate={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          currentPatients={chamberPatients.filter(p => !p.isCancelled).length}
          totalPatients={chamberPatients.length}
          patients={chamberPatients}
          onBack={onBack}
          onRefresh={refreshPatients}
          activeAddOns={[]}
          doctorLanguage="english"
          doctorId={doctorId}
        />
      </div>
    </div>
  );
}

export default function ClinicTodaysSchedule({ onMenuChange, onLogout }: ClinicTodaysScheduleProps) {
  const [doctorSchedules, setDoctorSchedules] = useState<DoctorSchedule[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addPatientModalOpen, setAddPatientModalOpen] = useState(false);
  const [selectedChamber, setSelectedChamber] = useState<{ chamber: DoctorChamber; doctorId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDoctorForPatient, setSelectedDoctorForPatient] = useState<{ id: string; name: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [chambersTogglingState, setChambersTogglingState] = useState<{ [key: string]: boolean }>({});
  const [blockingModalOpen, setBlockingModalOpen] = useState(false);
  const [restorationModalOpen, setRestorationModalOpen] = useState(false);
  const [pendingBlockingData, setPendingBlockingData] = useState<{
    doctorId: string;
    chamberId: number;
    chamberName: string;
    currentStatus: boolean;
    pendingPatients: any[];
  } | null>(null);
  const [pendingRestorationData, setPendingRestorationData] = useState<{
    doctorId: string;
    chamberId: number;
    chamberName: string;
    currentStatus: boolean;
    restoredPatients: any[];
  } | null>(null);
  const [isProcessingBlockConfirm, setIsProcessingBlockConfirm] = useState(false);
  const [isProcessingRestoreConfirm, setIsProcessingRestoreConfirm] = useState(false);

  useEffect(() => {
    loadTodaysSchedule();
  }, [refreshTrigger]);

  // 🔥 REAL-TIME LISTENER: Triggers refresh via state
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    let timeoutId: NodeJS.Timeout | null = null;

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('clinicId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified' || change.type === 'removed') {
          console.log('🔄 Clinic booking changed, triggering refresh...');
          // Debounce to prevent rapid reloads
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            setRefreshTrigger(prev => prev + 1);
          }, 800);
        }
      });
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const getCurrentDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return today.toLocaleDateString('en-US', options);
  };

  const handleChamberToggle = async (doctorId: string, chamberId: number, currentStatus: boolean) => {
    try {
      // If trying to TURN OFF the chamber, check for pending bookings
      if (currentStatus === true) { // Currently ON, trying to turn OFF
        setChambersTogglingState(prev => ({ ...prev, [`${doctorId}-${chamberId}`]: true }));

        // Check for pending (non-intervened) bookings for this chamber
        const today = new Date();
        const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

        const bookingsRef = collection(db, 'bookings');
        const pendingBookingsQuery = query(
          bookingsRef,
          where('chamberId', '==', chamberId),
          where('doctorId', '==', doctorId),
          where('appointmentDate', '==', todayStr)
        );

        const bookingsSnap = await getDocs(pendingBookingsQuery);

        // Check if there are any non-intervened, non-cancelled bookings
        const pendingBookings = bookingsSnap.docs.filter(doc => {
          const data = doc.data();
          const isMarkedSeen = data.isMarkedSeen || false;
          const isCancelled = data.isCancelled === true || data.status === 'cancelled';

          // Pending if NOT marked seen AND NOT cancelled
          return !isMarkedSeen && !isCancelled;
        });

        if (pendingBookings.length > 0) {
          // Show modal with pending patients instead of just blocking
          const pendingPatientsList = pendingBookings.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.patientName || 'Unknown Patient',
              phone: data.whatsappNumber || data.phone || 'N/A',
              appointmentTime: data.appointmentTime || 'N/A',
              language: data.language || 'english',
            };
          });

          // Find chamber name
          const doctorRef = doc(db, 'doctors', doctorId);
          const doctorSnap = await getDoc(doctorRef);
          const chamberName = 'Chamber';
          if (doctorSnap.exists()) {
            const chambers = doctorSnap.data().chambers || [];
            const chamber = chambers.find((ch: any) => ch.id === chamberId);
            if (chamber) {
              // Chamber name logic
            }
          }

          setPendingBlockingData({
            doctorId,
            chamberId,
            chamberName,
            currentStatus,
            pendingPatients: pendingPatientsList,
          });
          setBlockingModalOpen(true);
          setChambersTogglingState(prev => ({ ...prev, [`${doctorId}-${chamberId}`]: false }));
          return;
        }
      }

      // If trying to TURN ON the chamber, check for cancelled bookings
      if (currentStatus === false) { // Currently OFF, trying to turn ON
        setChambersTogglingState(prev => ({ ...prev, [`${doctorId}-${chamberId}`]: true }));

        // Check for cancelled bookings for this chamber
        const today = new Date();
        const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

        const bookingsRef = collection(db, 'bookings');
        const cancelledBookingsQuery = query(
          bookingsRef,
          where('chamberId', '==', chamberId),
          where('doctorId', '==', doctorId),
          where('appointmentDate', '==', todayStr),
          where('isCancelled', '==', true)
        );

        const bookingsSnap = await getDocs(cancelledBookingsQuery);

        if (bookingsSnap.docs.length > 0) {
          // Show restoration modal with cancelled patients
          const restoredPatientsList = bookingsSnap.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.patientName || 'Unknown Patient',
              phone: data.whatsappNumber || data.phone || 'N/A',
              appointmentTime: data.appointmentTime || 'N/A',
              language: data.language || 'english',
            };
          });

          // Find chamber name
          const doctorRef = doc(db, 'doctors', doctorId);
          const doctorSnap = await getDoc(doctorRef);
          const chamberName = 'Chamber';
          if (doctorSnap.exists()) {
            const chambers = doctorSnap.data().chambers || [];
            const chamber = chambers.find((ch: any) => ch.id === chamberId);
            if (chamber) {
              // Chamber name logic
            }
          }

          setPendingRestorationData({
            doctorId,
            chamberId,
            chamberName,
            currentStatus,
            restoredPatients: restoredPatientsList,
          });
          setRestorationModalOpen(true);
          setChambersTogglingState(prev => ({ ...prev, [`${doctorId}-${chamberId}`]: false }));
          return;
        }
      }

      setChambersTogglingState(prev => ({ ...prev, [`${doctorId}-${chamberId}`]: true }));

      const chamberRef = doc(db, 'doctors', doctorId);
      const doctorSnap = await getDoc(chamberRef);

      if (doctorSnap.exists()) {
        const chambers = doctorSnap.data().chambers || [];
        const updatedChambers = chambers.map((ch: any) => {
          if (ch.id === chamberId) {
            return { ...ch, isActive: !currentStatus };
          }
          return ch;
        });

        await updateDoc(chamberRef, { chambers: updatedChambers });

        // Refresh schedules
        setRefreshTrigger(prev => prev + 1);
        toast.success(currentStatus ? 'Chamber disabled' : 'Chamber enabled');
      }
    } catch (error) {
      console.error('Error toggling chamber:', error);
      toast.error('Failed to toggle chamber');
    } finally {
      setChambersTogglingState(prev => ({ ...prev, [`${doctorId}-${chamberId}`]: false }));
    }
  };

  const handleRestoreChamberConfirm = async () => {
    if (!pendingRestorationData) return;

    const {
      doctorId,
      chamberId,
      currentStatus,
      restoredPatients,
    } = pendingRestorationData;

    setIsProcessingRestoreConfirm(true);

    try {
      const { sendAppointmentRestored } = await import('../services/notificationService');
      const doctorRef = doc(db, 'doctors', doctorId);
      const doctorSnap = await getDoc(doctorRef);

      if (!doctorSnap.exists()) {
        toast.error('Doctor not found');
        setIsProcessingRestoreConfirm(false);
        return;
      }

      const doctorData = doctorSnap.data();
      const doctorName = doctorData.name || 'Doctor';
      const doctorSpecialty = doctorData.specialty || '';
      const doctorPhoto = doctorData.profilePhoto || '';

      // Restore all cancelled bookings and send notifications
      for (const patient of restoredPatients) {
        try {
          // Update booking status
          await updateDoc(doc(db, 'bookings', patient.id), {
            isCancelled: false,
            status: 'pending',
            cancellationType: null,
            cancelledBy: null,
          });

          // Send restoration notification
          const today = new Date();
          const appointmentDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

          await sendAppointmentRestored({
            patientPhone: patient.phone,
            patientName: patient.name,
            age: 'N/A',
            sex: 'N/A',
            purpose: 'Appointment',
            doctorId,
            doctorName,
            doctorSpecialty,
            doctorPhoto,
            clinicName: 'Chamber',
            chamberAddress: '',
            bookingId: patient.id,
            appointmentDate,
            appointmentTime: patient.appointmentTime,
            chamber: 'Chamber',
            tokenNumber: 'N/A',
            message: 'Your appointment has been restored and is now active. The doctor is ready to see you.',
            language: patient.language || 'english',
          }).catch((err: any) => {
            console.warn(`⚠️ Failed to send restoration notification to ${patient.name}:`, err);
          });
        } catch (error) {
          console.error(`❌ Error restoring booking for ${patient.name}:`, error);
        }
      }

      // Now enable the chamber
      const chambers = doctorData.chambers || [];
      const updatedChambers = chambers.map((ch: any) => {
        if (ch.id === chamberId) {
          return { ...ch, isActive: !currentStatus };
        }
        return ch;
      });

      await updateDoc(doctorRef, { chambers: updatedChambers });

      // Refresh
      setRefreshTrigger(prev => prev + 1);
      toast.success(`Chamber restored and ${restoredPatients.length} patient(s) notified of restoration`);
    } catch (error) {
      console.error('❌ Error restoring chamber:', error);
      toast.error('Failed to restore chamber');
    } finally {
      setIsProcessingRestoreConfirm(false);
      setRestorationModalOpen(false);
      setPendingRestorationData(null);
    }
  };

  const handleBlockChamberConfirm = async () => {
    if (!pendingBlockingData) return;

    const {
      doctorId,
      chamberId,
      currentStatus,
      pendingPatients,
    } = pendingBlockingData;

    setIsProcessingBlockConfirm(true);

    try {
      const { sendAppointmentCancelled } = await import('../services/notificationService');
      const doctorRef = doc(db, 'doctors', doctorId);
      const doctorSnap = await getDoc(doctorRef);

      if (!doctorSnap.exists()) {
        toast.error('Doctor not found');
        setIsProcessingBlockConfirm(false);
        return;
      }

      const doctorData = doctorSnap.data();
      const doctorName = doctorData.name || 'Doctor';
      const doctorSpecialty = doctorData.specialty || '';
      const doctorPhoto = doctorData.profilePhoto || '';

      // Cancel all pending bookings and send notifications
      for (const patient of pendingPatients) {
        try {
          // Update booking status
          await updateDoc(doc(db, 'bookings', patient.id), {
            isCancelled: true,
            status: 'cancelled',
            cancellationType: 'CHAMBER_BLOCKED',
            cancelledBy: 'clinic_system',
          });

          // Send cancellation notification
          const today = new Date();
          const appointmentDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

          await sendAppointmentCancelled({
            patientPhone: patient.phone,
            patientName: patient.name,
            age: 'N/A',
            sex: 'N/A',
            purpose: 'Appointment',
            doctorId,
            doctorName,
            doctorSpecialty,
            doctorPhoto,
            clinicName: 'Chamber',
            chamberAddress: '',
            bookingId: patient.id,
            appointmentDate,
            appointmentTime: patient.appointmentTime,
            chamber: 'Chamber',
            tokenNumber: 'N/A',
            message: 'Your appointment has been cancelled. The doctor has blocked this time slot. Please contact the clinic for rescheduling.',
            language: patient.language || 'english',
          }).catch((err: any) => {
            console.warn(`⚠️ Failed to send notification to ${patient.name}:`, err);
          });
        } catch (error) {
          console.error(`❌ Error cancelling booking for ${patient.name}:`, error);
        }
      }

      // Now block the chamber
      const chambers = doctorData.chambers || [];
      const updatedChambers = chambers.map((ch: any) => {
        if (ch.id === chamberId) {
          return { ...ch, isActive: !currentStatus };
        }
        return ch;
      });

      await updateDoc(doctorRef, { chambers: updatedChambers });

      // Refresh
      setRefreshTrigger(prev => prev + 1);
      toast.success(`Chamber blocked and ${pendingPatients.length} patient(s) notified of cancellation`);
    } catch (error) {
      console.error('❌ Error blocking chamber:', error);
      toast.error('Failed to block chamber');
    } finally {
      setIsProcessingBlockConfirm(false);
      setBlockingModalOpen(false);
      setPendingBlockingData(null);
    }
  };

  const loadTodaysSchedule = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // Branch manager support: resolve to parent clinic ID
    const isLocationManager = localStorage.getItem('healqr_is_location_manager') === 'true';
    const locationManagerBranchId = localStorage.getItem('healqr_location_id') || '';
    const resolvedClinicId = isLocationManager
      ? (localStorage.getItem('healqr_parent_clinic_id') || currentUser.uid)
      : currentUser.uid;

    try {
      setLoading(true);
      const clinicRef = doc(db, 'clinics', resolvedClinicId);
      const clinicSnap = await getDoc(clinicRef);

      if (!clinicSnap.exists()) {
        setLoading(false);
        return;
      }

      const clinicData = clinicSnap.data();
      const allLinkedDoctors = clinicData.linkedDoctorsDetails || [];
      const mainBranchId = (clinicData.locations && clinicData.locations.length > 0) ? clinicData.locations[0].id : '001';

      // Deduplicate doctors by UID (keep unique doctors only)
      const uniqueDoctorsMap = new Map<string, any>();
      allLinkedDoctors.forEach((d: any) => {
        const uid = d.doctorId || d.uid;
        if (uid && !uniqueDoctorsMap.has(uid)) uniqueDoctorsMap.set(uid, d);
      });
      const linkedDoctors = Array.from(uniqueDoctorsMap.values());
      // Note: Doctor-level locationId filtering is NOT needed here
      // Chamber-level clinicLocationId filtering handles branch segregation below
      const schedules: DoctorSchedule[] = [];

      const now = new Date();
      const todayDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
      const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

      for (const doctor of linkedDoctors) {
        const doctorRef = doc(db, 'doctors', doctor.doctorId || doctor.uid);
        const doctorSnap = await getDoc(doctorRef);

        if (doctorSnap.exists()) {
          const doctorData = doctorSnap.data();
          const allChambers = doctorData.chambers || [];

          const todayChambers = allChambers.filter((chamber: any) => {
            if (chamber.clinicId !== resolvedClinicId) {
              return false;
            }

            // Branch filtering: branch managers see only their branch chambers
            if (isLocationManager && locationManagerBranchId) {
              const chamberLocId = chamber.clinicLocationId || chamber.locationId || '';
              if (!chamberLocId || chamberLocId !== locationManagerBranchId) return false;
            } else {
              // Main clinic: only show chambers without clinicLocationId or with '001' (main branch)
              const chamberLocId = chamber.clinicLocationId || chamber.locationId || '';
              if (chamberLocId && chamberLocId !== '001' && chamberLocId !== mainBranchId) return false;
            }

            if (chamber.frequency === 'Daily') {
              return true;
            }

            if (chamber.frequency === 'Custom' && chamber.customDate) {
              const customDate = new Date(chamber.customDate);
              const customStr = customDate.toISOString().split('T')[0];
              return customStr === todayStr;
            }

            if (chamber.days && Array.isArray(chamber.days)) {
              return chamber.days.includes(todayDay);
            }

            return false;
          });

          // Check if doctor has walk-in patients today (even without chambers)
          const bookingsRef = collection(db, 'bookings');
          const walkInQuery = query(
            bookingsRef,
            where('doctorId', '==', doctor.doctorId || doctor.uid),
            where('type', '==', 'walkin_booking'),
            where('clinicId', '==', resolvedClinicId)
          );

          const walkInSnap = await getDocs(walkInQuery);
          const todaysWalkIns = walkInSnap.docs.filter(doc => {
            const data = doc.data();
            const bookingDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);
            const bookingDateStr = bookingDate instanceof Date ? bookingDate.toISOString().split('T')[0] : '';
            return bookingDateStr === todayStr;
          });

          const hasWalkInsToday = todaysWalkIns.length > 0;

          // Show doctor if they have chambers OR walk-in patients today
          if (todayChambers.length > 0 || hasWalkInsToday) {
            const chambersWithBookings = await Promise.all(
              todayChambers.map(async (chamber: any) => {
                const bookingsRef = collection(db, 'bookings');
                const qrBookingsQuery = query(
                  bookingsRef,
                  where('chamberId', '==', chamber.id),
                  where('appointmentDate', '==', todayStr)
                );

                const qrBookingsSnap = await getDocs(qrBookingsQuery);
                // Count only non-cancelled bookings
                const qrBookedCount = qrBookingsSnap.docs.filter(doc => {
                  const data = doc.data();
                  return data.isCancelled !== true && data.status !== 'cancelled';
                }).length;

                let scheduleText = '';
                if (chamber.frequency === 'Daily') {
                  scheduleText = 'Every Day';
                } else if (chamber.frequency === 'Custom' && chamber.customDate) {
                  const customDate = new Date(chamber.customDate);
                  scheduleText = customDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } else if (chamber.days && chamber.days.length > 0) {
                  scheduleText = chamber.days.join(', ');
                }

                const [startHour, startMin] = (chamber.startTime || '00:00').split(':').map(Number);
                const startMinutes = startHour * 60 + startMin;

                let isExpired = false;
                if (chamber.endTime) {
                  const [endHour, endMin] = chamber.endTime.split(':').map(Number);
                  const chamberEndTime = new Date(now);
                  chamberEndTime.setHours(endHour, endMin, 0, 0);
                  isExpired = chamberEndTime < now;
                }

                return {
                  id: chamber.id,
                  chamberName: chamber.chamberName,
                  chamberAddress: chamber.chamberAddress,
                  startTime: chamber.startTime,
                  endTime: chamber.endTime,
                  maxCapacity: chamber.maxCapacity,
                  days: chamber.days || [],
                  frequency: chamber.frequency,
                  customDate: chamber.customDate,
                  isActive: chamber.isActive !== false,
                  blockedDates: chamber.blockedDates || [],
                  startMinutes,
                  isExpired,
                  booked: qrBookedCount,
                  schedule: scheduleText,
                } as DoctorChamber;
              })
            );

            const sortedChambers = chambersWithBookings.sort((a, b) => {
              if (a.isExpired && !b.isExpired) return 1;
              if (!a.isExpired && b.isExpired) return -1;
              return (a.startMinutes || 0) - (b.startMinutes || 0);
            });

            schedules.push({
              doctorId: doctor.doctorId || doctor.uid,
              doctorName: doctor.name || 'Unknown Doctor',
              specialty: doctor.specialties?.[0] || 'General Physician',
              chambers: sortedChambers,
            });
          }
        }
      }

      // ✅ SIMPLE SORT: Match doctor dashboard - just alphabetical by doctor name
      // Chambers within each doctor are already sorted by time (active first, then expired)
      schedules.sort((a, b) => a.doctorName.localeCompare(b.doctorName));

      setDoctorSchedules(schedules);
    } catch (error) {
      console.error('Error loading today\'s schedule:', error);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPatients = (chamber: DoctorChamber, doctorId: string) => {
    setSelectedChamber({ chamber, doctorId });
  };

  const handleBackToSchedule = () => {
    setSelectedChamber(null);
    loadTodaysSchedule();
  };

  const handleAddPatient = async (patientData: PatientFormData) => {
    // Implementation would be similar to Doctor's TodaysSchedule
    // For now, just close modal and show success
    setAddPatientModalOpen(false);
    toast.success('Walk-in patient added successfully');
    // Reload walk-in patients
  };

  if (selectedChamber) {
    return (
      <ChamberPatientDetailsLoader
        chamber={selectedChamber.chamber}
        doctorId={selectedChamber.doctorId}
        onBack={handleBackToSchedule}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      <ClinicSidebar
        activeMenu="todays-schedule"
        onMenuChange={(menu) => {
          if (onMenuChange) onMenuChange(menu);
        }}
        onLogout={() => {
          if (onLogout) {
            onLogout();
          } else {
            auth.signOut();
            window.location.href = '/';
          }
        }}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-black border-b border-gray-900 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
            >
              <Menu className="w-5 h-5 text-blue-500" />
            </button>
            <h2 className="text-lg md:text-xl">Today's Schedule</h2>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-black">
          <div className="p-4 md:p-8">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl mb-2">Today's Schedule</h1>
              <p className="text-gray-400">{getCurrentDate()}</p>
            </div>

            {/* Doctor Schedules */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading schedule...</div>
              </div>
            ) : doctorSchedules.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800 p-12">
                <div className="text-center">
                  <Calendar className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-white text-xl mb-2">No Schedules for Today</h3>
                  <p className="text-gray-400">
                    There are no active doctor schedules for today.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                {doctorSchedules.map((schedule) => (
                  <div key={schedule.doctorId}>
                    {/* Doctor Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold">Dr. {schedule.doctorName}</h2>
                          <p className="text-sm text-blue-400">{schedule.specialty}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedDoctorForPatient({ id: schedule.doctorId, name: schedule.doctorName });
                          setAddPatientModalOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        ADD PATIENT
                      </Button>
                    </div>

                    {/* Chambers for this doctor */}
                    <div className="space-y-4 ml-13">
                      {schedule.chambers.map((chamber) => (
                        <Card
                          key={chamber.id}
                          className={`bg-zinc-800 border-zinc-700 p-6 hover:border-blue-500/50 transition-colors ${
                            chamber.isExpired ? 'opacity-60' : ''
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                            {/* Chamber Info */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-white text-lg font-medium">
                                      {chamber.chamberName}
                                    </h3>
                                    <button
                                      onClick={() => handleChamberToggle(schedule.doctorId, chamber.id, chamber.isActive)}
                                      disabled={chambersTogglingState[`${schedule.doctorId}-${chamber.id}`]}
                                      className={`p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${
                                        chamber.isActive
                                          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/50'
                                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50'
                                      } disabled:opacity-50`}
                                    >
                                      <Power className="w-4 h-4" />
                                      {chamber.isActive ? 'ON' : 'OFF'}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                                    <MapPin className="w-4 h-4" />
                                    <span>{chamber.chamberAddress}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="text-white text-sm">
                                      {chamber.startTime} - {chamber.endTime}
                                    </span>
                                    {chamber.isExpired && (
                                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                        Time Over
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Booking Status */}
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-gray-400 text-sm">Booking Status:</span>
                                  <span className="text-blue-400 font-medium">
                                    {chamber.booked}/{chamber.maxCapacity}
                                  </span>
                                </div>
                                <div className="w-full bg-zinc-900 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min((chamber.booked / (chamber.maxCapacity || 1)) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>

                              {/* Schedule Days */}
                              <div className="text-sm text-gray-400">
                                {chamber.schedule}
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="flex flex-col gap-3">
                              <Button
                                onClick={() => handleViewPatients(chamber, schedule.doctorId)}
                                disabled={!chamber.isActive}
                                className={`text-white whitespace-nowrap ${
                                  chamber.isActive
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                                }`}
                              >
                                {chamber.isActive ? 'VIEW PATIENTS' : 'CHAMBER DISABLED'}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Patient Modal */}
      {addPatientModalOpen && selectedDoctorForPatient && (
        <AddPatientModal
          isOpen={addPatientModalOpen}
          onClose={() => {
            setAddPatientModalOpen(false);
            setSelectedDoctorForPatient(null);
          }}
          onAddPatient={handleAddPatient}
          doctorId={selectedDoctorForPatient.id}
          doctorName={selectedDoctorForPatient.name}
        />
      )}

      {/* Chamber Blocking Modal */}
      {blockingModalOpen && pendingBlockingData && (
        <ChamberBlockingModal
          isOpen={blockingModalOpen}
          onClose={() => {
            setBlockingModalOpen(false);
            setPendingBlockingData(null);
          }}
          onConfirm={handleBlockChamberConfirm}
          pendingPatients={pendingBlockingData.pendingPatients}
          chamberName={pendingBlockingData.chamberName}
          isLoading={isProcessingBlockConfirm}
        />
      )}

      {/* Chamber Restoration Modal */}
      {restorationModalOpen && pendingRestorationData && (
        <ChamberRestorationModal
          isOpen={restorationModalOpen}
          onClose={() => {
            setRestorationModalOpen(false);
            setPendingRestorationData(null);
          }}
          onConfirm={handleRestoreChamberConfirm}
          restoredPatients={pendingRestorationData.restoredPatients}
          chamberName={pendingRestorationData.chamberName}
          isLoading={isProcessingRestoreConfirm}
        />
      )}
    </div>
  );
}

