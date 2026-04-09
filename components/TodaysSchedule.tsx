import { Button } from './ui/button';
import { Card } from './ui/card';
import { Switch } from './ui/switch';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import {
  Plus,
  Calendar,
  Clock,
  Menu,
  ArrowLeft,
  MapPin,
  Video,
  RefreshCw
} from 'lucide-react';
import { addDoctorNotification } from '../services/doctorNotificationService';
import { useState, useEffect } from 'react';
import DashboardSidebar from './DashboardSidebar';
import AddPatientModal, { PatientFormData } from './AddPatientModal';
import WalkInPatientsPage from './WalkInPatientsPage';
import DeactivateChamberModal from './DeactivateChamberModal';
import ReactivateChamberModal from './ReactivateChamberModal';
import { Patient } from './ViewPatientsModal';
import PatientDetails from './PatientDetails';
import { toast } from 'sonner';
import { sendPatientListViaWhatsApp } from '../services/whatsappService';

interface TodaysScheduleProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
  onViewPatients?: () => void;
  activeAddOns?: string[];
  doctorLanguage?: 'english' | 'hindi' | 'bengali';
}

// Helper component to load and display patient details
function PatientDetailsLoader({
  chamber,
  onBack,
  onMenuChange,
  activeAddOns,
  doctorLanguage = 'english'
}: {
  chamber: { id: number; name: string; address: string; startTime: string; endTime: string; schedule: string; booked: number; capacity: number };
  onBack: () => void;
  onMenuChange?: (menu: string) => void;
  activeAddOns: string[];
  doctorLanguage?: 'english' | 'hindi' | 'bengali';
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
        const { db } = await import('../lib/firebase/config');
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { decrypt } = await import('../utils/encryptionService');

        // Get current doctor ID
        const userId = localStorage.getItem('userId');
        if (!userId) {
          setLoading(false);
          return;
        }

        // 🔒 PATIENT DATA ACCESS CONTROL: Build list of restricted clinic IDs
        let restrictedClinicIds: string[] = [];
        try {
          const clinicsRef = collection(db!, 'clinics');
          const allClinicsSnap = await getDocs(clinicsRef);

          allClinicsSnap.forEach((clinicDoc) => {
            const clinicData = clinicDoc.data();
            const linkedDoctors = clinicData.linkedDoctorsDetails || [];


            // Check if current doctor is linked to this clinic with restricted access
            const isRestricted = linkedDoctors.some((d: any) => {
              const matches = (d.doctorId === userId || d.uid === userId) && d.restrictPatientDataAccess === true;
              if (d.doctorId === userId || d.uid === userId) {
              }
              return matches;
            });

            if (isRestricted) {
              restrictedClinicIds.push(clinicDoc.id);
            }
          });

          if (restrictedClinicIds.length > 0) {
          } else {
          }
        } catch (error) {
          console.error('Error checking clinic access restrictions:', error);
          // Continue loading patients even if access check fails
        }

        // NOTE: Doctor self-restriction toggle only affects CLINIC view, not doctor's own view
        // So we do NOT check selfRestrictedClinics here - that's handled in ClinicTodaysSchedule

        // Get today's date in YYYY-MM-DD format (matching the format used when saving bookings)
        // Get today's date in YYYY-MM-DD format (using local timezone, not UTC)
        const today = new Date();
        const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

        // Query bookings for this chamber (QR bookings only)
        const bookingsRef = collection(db!, 'bookings');

        // FIX ISSUE #1: Ensure chamberId is numeric for the query (stored as number in Firestore)
        // Chamber IDs are stored as numbers (timestamps) in Firestore, not strings
        let numericChamberId = typeof chamber.id === 'string' ? parseInt(chamber.id, 10) : chamber.id;

        // Safety check: If chamberId is invalid (NaN, null, undefined), default to -1
        if (!numericChamberId || isNaN(numericChamberId)) {
          numericChamberId = -1;
        }

        // Special handling for VC Patients (chamberId = -999)
        const isVcView = numericChamberId === -999;

        // Query by BOTH chamberId AND appointmentDate (efficient with composite index)
        // IMPORTANT: This query gets QR bookings only (excludes walk-ins)
        const qrBookingsQuery = isVcView
          ? query(
              bookingsRef,
              where('doctorId', '==', userId),
              where('appointmentDate', '==', todayStr),
              where('consultationType', '==', 'video')
            )
          : query(
              bookingsRef,
              where('chamberId', '==', numericChamberId),
              where('appointmentDate', '==', todayStr)
            );

        const qrBookingsSnap = await getDocs(qrBookingsQuery);

        let qrBookingDocs = qrBookingsSnap.docs.filter(doc => {
          const data = doc.data();
          // Exclude walk-in bookings - they shouldn't be in chamber view
          return data.type !== 'walkin_booking';
        });

        // 🔍 FALLBACK QUERY for clinic bookings with mismatched chamber IDs
        if (qrBookingDocs.length === 0 && userId) {
          const fallbackQuery = query(
            bookingsRef,
            where('doctorId', '==', userId),
            where('appointmentDate', '==', todayStr)
          );
          const fallbackSnap = await getDocs(fallbackQuery);
          const fallbackQrBookings = fallbackSnap.docs.filter(doc => {
            const data = doc.data();
            return data.type !== 'walkin_booking';
          });

          qrBookingDocs = fallbackQrBookings.filter(doc => {
            const data = doc.data();
            const dataChamberId = typeof data.chamberId === 'string' ? parseInt(data.chamberId, 10) : data.chamberId;
            if (dataChamberId !== undefined && dataChamberId !== null && !isNaN(dataChamberId)) {
              return dataChamberId === numericChamberId;
            }
            const chamberName = (data.chamberName || data.chamber || '').toString().toLowerCase();
            const targetName = (chamber.name || '').toString().toLowerCase();
            return chamberName !== '' && targetName !== '' && chamberName === targetName;
          });
        }

        // Transform firestore documents to patient data
        const patients = qrBookingDocs
          .map(doc => {
            const data = doc.data();

            // Parse dates - handle both Firestore Timestamp and plain strings/numbers
            const bookingTime = data.createdAt?.toDate
              ? data.createdAt.toDate()
              : new Date(data.createdAt);

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

            const appointmentFallback = data.date?.toDate ? data.date.toDate() : bookingTime;
            const appointmentTime = buildAppointmentDateTime(data.appointmentDate, data.time, appointmentFallback);

            // Determine if patient is cancelled - ONLY if explicitly marked as cancelled
            // Default to NOT cancelled (false) unless explicitly set
            const isCancelledStatus = (data.isCancelled === true) || (data.status === 'cancelled');

            // 🔓 Decrypt sensitive patient data
            const patientName = decrypt(data.patientName_encrypted || data.patientName || '');
            const whatsappNumber = decrypt(data.whatsappNumber_encrypted || data.whatsappNumber || '');
            const ageDecrypted = decrypt(data.age_encrypted || '');
            const genderDecrypted = decrypt(data.gender_encrypted || data.gender || '');
            const purposeDecrypted = decrypt(data.purposeOfVisit_encrypted || data.purposeOfVisit || '');

            // Parse age with proper validation
            let parsedAge = 0;
            if (ageDecrypted) {
              const ageNum = parseInt(ageDecrypted.toString().trim());
              parsedAge = isNaN(ageNum) ? 0 : ageNum;
            } else if (data.age) {
              const ageNum = typeof data.age === 'number' ? data.age : parseInt(data.age.toString().trim());
              parsedAge = isNaN(ageNum) ? 0 : ageNum;
            }


            // 🔒 Check if this patient's data should be restricted
            const bookingClinicId = data.clinicId;
            const bookingSource = data.bookingSource; // 'clinic_qr' or 'doctor_qr'

            // RULE: Doctor QR bookings are NEVER hidden from the doctor
            // Only CLINIC QR bookings can be restricted (by clinic-end toggle)
            const isDataRestricted =
              bookingSource !== 'doctor_qr' && // Doctor's own QR bookings → ALWAYS visible
              bookingClinicId &&
              restrictedClinicIds.includes(bookingClinicId) &&
              (bookingSource === 'clinic_qr' || !bookingSource);

            if (bookingClinicId && restrictedClinicIds.length > 0) {
            }

            // 🔓 Always pass REAL data — masking is handled at DISPLAY level only
            // (PatientDetails.tsx masks based on isDataRestricted flag)
            // This ensures Digital RX, Diet Chart PDFs, and notifications use real patient info
            return {
              id: doc.id,
              name: patientName || 'N/A',
              phone: whatsappNumber || data.phone || 'N/A',
              bookingId: data.bookingId || doc.id,
              age: parsedAge,
              gender: (genderDecrypted || 'MALE').toUpperCase(),
              visitType: purposeDecrypted || data.visitType || (data.consultationType === 'video' ? 'Video Consultation' : 'In-Person'),
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
              reminderSent: data.reminderSent || data.reminderScheduled || false,
              followUpScheduled: data.followUpScheduled || false,
              reviewScheduled: data.reviewScheduled || false,
              tokenNumber: data.tokenNumber || `#${data.serialNo || 0}`,
              serialNo: data.serialNo || 0,
              chamber: data.chamber || 'Chamber',
              isWalkIn: data.isWalkIn !== undefined ? data.isWalkIn : false,
              isDataRestricted: isDataRestricted || false,
              bookingSource: bookingSource || 'doctor_qr',
              clinicId: bookingClinicId || '',
              digitalRxUrl: data.digitalRxUrl || '',
              dietChartUrl: data.dietChartUrl || '',
              // Video consultation Firestore fields
              vcPatientJoined: data.vcPatientJoined || false,
              vcCompleted: data.vcCompleted || false,
              vcLinkSentAt: data.vcLinkSentAt || null,
              referrerName: data.referrerName || null,
              referrerRole: data.referrerRole || null,
            };
          })
          // Filter out invalid patients (already filtered by date in query)
          .filter(patient => patient.name !== 'N/A' && patient.phone !== 'N/A')
          // 🔒 PATIENT DATA ACCESS CONTROL: Restricted patients already have masked data from .map() above
          // They are still SHOWN in the list but with masked name/phone/age/gender/visitType
          // ✅ SORT BY STORED SERIAL NUMBER (booking order)
          .sort((a, b) => {
            // Cancelled last
            if (a.isCancelled !== b.isCancelled) return a.isCancelled ? 1 : -1;
            // Seen last
            if (a.isMarkedSeen !== b.isMarkedSeen) return a.isMarkedSeen ? 1 : -1;
            // Sort by stored serial number (assigned at booking time)
            return (a.serialNo || 0) - (b.serialNo || 0);
          });

        setChamberPatients(patients);
      } catch (error) {
        console.error('❌ Error loading chamber patients:', error);
        toast.error('Failed to load patient details');
        setChamberPatients([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, [chamber.id, chamber.name, refreshTrigger]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-gray-700/30 rounded-full flex items-center justify-center animate-pulse mb-4">
            <Calendar className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-400">Loading patient details...</p>
        </div>
      </div>
    );
  }

  const isAssistantSession = localStorage.getItem('healqr_is_assistant') === 'true';

  return (
    <PatientDetails
      chamberName={chamber.name}
      chamberAddress={chamber.address}
      scheduleTime={`${chamber.startTime} - ${chamber.endTime}`}
      scheduleDate={chamber.schedule}
      currentPatients={chamber.booked}
      totalPatients={chamber.capacity}
      patients={chamberPatients}
      onBack={onBack}
      onMenuChange={onMenuChange}
      onRefresh={refreshPatients}
      prepaymentActive={activeAddOns.includes('prepayment-collection')}
      activeAddOns={activeAddOns}
      doctorLanguage={doctorLanguage}
      readOnly={isAssistantSession}
    />
  );
}

export default function TodaysSchedule({ onMenuChange, onLogout, activeAddOns = [], doctorLanguage = 'english' }: TodaysScheduleProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addPatientModalOpen, setAddPatientModalOpen] = useState(false);
  const [showPatientsPage, setShowPatientsPage] = useState(false);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [selectedChamberForDetails, setSelectedChamberForDetails] = useState<typeof chambers[0] | null>(null);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [reactivateModalOpen, setReactivateModalOpen] = useState(false);
  const [selectedChamber, setSelectedChamber] = useState<typeof chambers[0] | null>(null);

  // Walk-in patients - Loaded from Firestore
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctorName, setDoctorName] = useState<string>('');

  // VC Patients state
  const [vcPatients, setVcPatients] = useState<Array<{
    id: string;
    patientName: string;
    whatsappNumber: string;
    age?: string;
    gender?: string;
    purposeOfVisit?: string;
    bookingId: string;
    serialNo: number;
    time: string; // VC slot time e.g. "05:00 - 06:00"
    isCancelled?: boolean;
    isMarkedSeen?: boolean;
  }>>([]);
  const [vcTimeSlots, setVcTimeSlots] = useState<Array<{id: number; startTime: string; endTime: string; days: string[]; isActive: boolean}>>([]);
  const [showVcPatientDetails, setShowVcPatientDetails] = useState(false);
  const [selectedVcSlot, setSelectedVcSlot] = useState<{startTime: string; endTime: string} | null>(null);

  // Chamber schedules - Loaded from Firestore
  const [chambers, setChambers] = useState<Array<{
    id: number;
    name: string;
    address: string;
    startTime: string;
    endTime: string;
    schedule: string;
    booked: number;
    capacity: number;
    isActive: boolean;
    manualClinicId?: string;
    clinicPhone?: string;
    clinicCode?: string;
    blockedDates: string[];
    isExpired: boolean;
    startMinutes: number;
    rescheduledStartTime?: string;
    rescheduledEndTime?: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  // Reschedule state
  const [rescheduleChamberId, setRescheduleChamberId] = useState<number | null>(null);
  const [rescheduleStart, setRescheduleStart] = useState('');
  const [rescheduleEnd, setRescheduleEnd] = useState('');
  const [showRescheduleConfirm, setShowRescheduleConfirm] = useState(false);
  const [savingReschedule, setSavingReschedule] = useState(false);

  // Date change detection for auto-refresh at midnight
  const [currentDate, setCurrentDate] = useState(new Date().toDateString());

  // Load chambers from Firestore and filter for next 24 hours
  useEffect(() => {
    const loadTodaysSchedule = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          setLoading(false);
          return;
        }

        const { db } = await import('../lib/firebase/config');
        const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');

        // Load doctor's chambers from Firestore
        const doctorRef = doc(db!, 'doctors', userId);
        const doctorSnap = await getDoc(doctorRef);

        if (!doctorSnap.exists()) {
          setLoading(false);
          return;
        }

        const doctorData = doctorSnap.data();
        setDoctorName(doctorData.fullName || doctorData.name || 'Doctor');
        const allChambers = doctorData.chambers || [];

        // Get current date and next 24 hours
        const now = new Date();
        const currentDayName = now.toLocaleDateString('en-US', { weekday: 'long' });
        const todayStr = now.toISOString().split('T')[0];

        // Filter chambers for today (show all, isExpired will be marked for display)
        const todaysChambers = allChambers.filter((chamber: any) => {
          // Don't filter by end-time here - we'll show all chambers with CHAMBER TIME OVER badge if expired
          // Check if chamber is active today based on frequency
          if (chamber.frequency === 'Daily') {
            return true; // Daily chambers are always active
          }

          if (chamber.frequency === 'Custom' && chamber.customDate) {
            const customDate = new Date(chamber.customDate);
            const customStr = customDate.toISOString().split('T')[0];
            const isToday = customStr === todayStr;
            return isToday;
          }

          // For Weekly, Bi-Weekly, Monthly - ONLY check if TODAY is in the days array
          // (Not tomorrow - we show chambers that are active TODAY, not tomorrow)
          if (chamber.days && Array.isArray(chamber.days)) {
            const isScheduledToday = chamber.days.includes(currentDayName);
            return isScheduledToday;
          }

          return false;
        });

        // 🔍 Pre-fetch fallback bookings for all chambers (to avoid multiple queries)
        let fallbackBookings: any[] | null = null;
        try {
          const fallbackQuery = query(
            collection(db!, 'bookings'),
            where('doctorId', '==', userId),
            where('appointmentDate', '==', todayStr)
          );
          const fallbackSnap = await getDocs(fallbackQuery);
          fallbackBookings = fallbackSnap.docs.filter(doc => {
            const data = doc.data();
            return data.type !== 'walkin_booking';
          });
        } catch (e) {
          console.error('Error fetching fallback bookings:', e);
        }

        // Get booking counts for each chamber (QR bookings only)
        const chambersWithBookings = await Promise.all(
          todaysChambers.map(async (chamber: any) => {
            // Query QR bookings for this chamber today
            // Use local timezone date format (consistent with booking creation)
            const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
            const bookingsRef = collection(db!, 'bookings');

            let numericChamberId = typeof chamber.id === 'string' ? parseInt(chamber.id, 10) : chamber.id;
            if (!numericChamberId || isNaN(numericChamberId)) {
              numericChamberId = -1;
            }

            // Query 1: QR bookings (have chamberId + appointmentDate)
            // Simplified to avoid composite index - filter status in code
            const qrBookingsQuery = query(
              bookingsRef,
              where('chamberId', '==', numericChamberId),
              where('appointmentDate', '==', todayStr)
            );

            const qrBookingsSnap = await getDocs(qrBookingsQuery);

            // Count ALL bookings (including cancelled) - cancelled slots are still booked slots
            // Only count QR bookings that have appointmentDate for today
            let qrBookedCount = qrBookingsSnap.size;

            if (qrBookedCount === 0 && fallbackBookings && fallbackBookings.length > 0) {
              const matchingDocs = fallbackBookings.filter(doc => {
                const data = doc.data();
                const dataChamberId = typeof data.chamberId === 'string' ? parseInt(data.chamberId, 10) : data.chamberId;
                if (dataChamberId !== undefined && dataChamberId !== null && !isNaN(dataChamberId)) {
                  return dataChamberId === numericChamberId;
                }
                const chamberNameStr = (data.chamberName || data.chamber || '').toString().toLowerCase();
                const targetNameStr = (chamber.name || '').toString().toLowerCase();
                return chamberNameStr !== '' && targetNameStr !== '' && chamberNameStr === targetNameStr;
              });
              qrBookedCount = matchingDocs.length;
            }

            // Only count QR bookings for chamber booking status
            // Walk-in patients are shown separately in "Walk-In Patients" section

            // Determine schedule display text
            let scheduleText = '';
            if (chamber.frequency === 'Daily') {
              scheduleText = 'Every Day';
            } else if (chamber.frequency === 'Custom' && chamber.customDate) {
              const customDate = new Date(chamber.customDate);
              scheduleText = customDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else if (chamber.days && chamber.days.length > 0) {
              scheduleText = chamber.days.join(', ');
            }

            // Convert start time to minutes for sorting
            const [startHour, startMin] = (chamber.startTime || '00:00').split(':').map(Number);
            const startMinutes = startHour * 60 + startMin;

            // Check if chamber is expired
            let isExpired = false;
            if (chamber.endTime) {
              const [endHour, endMin] = chamber.endTime.split(':').map(Number);
              const chamberEndTime = new Date(now);
              chamberEndTime.setHours(endHour, endMin, 0, 0);
              isExpired = chamberEndTime < now;
            }

            return {
              id: chamber.id,
              name: chamber.chamberName,
              address: chamber.chamberAddress,
              startTime: chamber.startTime,
              endTime: chamber.endTime,
              schedule: scheduleText,
              booked: qrBookedCount, // Only QR bookings (Walk-ins shown separately)
              capacity: chamber.maxCapacity,
              isActive: chamber.isActive !== false, // Default to true if not set
              blockedDates: chamber.blockedDates || [], // Preserve blocked dates array
              manualClinicId: chamber.manualClinicId, // Needed for Alternative Connect
              clinicPhone: chamber.clinicPhone, // Needed for WhatsApp
              clinicCode: chamber.clinicCode, // Needed to distinguish Linked vs Alternative
              startMinutes, // For sorting
              isExpired, // For sorting expired to bottom
              // Reschedule: check if todayReschedule matches today's date
              rescheduledStartTime: chamber.todayReschedule?.date === todayStr ? chamber.todayReschedule.startTime : undefined,
              rescheduledEndTime: chamber.todayReschedule?.date === todayStr ? chamber.todayReschedule.endTime : undefined,
            } as any;
          })
        );

        // Sort chambers: by effective start time (rescheduled time takes priority)
        const sortedChambers = chambersWithBookings.sort((a, b) => {
          // Expired chambers go to bottom
          if (a.isExpired && !b.isExpired) return 1;
          if (!a.isExpired && b.isExpired) return -1;
          // Use rescheduled time if available for sorting
          const aTime = a.rescheduledStartTime || a.startTime;
          const bTime = b.rescheduledStartTime || b.startTime;
          const [aH, aM] = (aTime || '00:00').split(':').map(Number);
          const [bH, bM] = (bTime || '00:00').split(':').map(Number);
          return (aH * 60 + aM) - (bH * 60 + bM);
        });

        // 🚫 FILTER OUT CLINIC CHAMBERS IF CLINIC IS OFF TODAY
        const filteredChambers = [];

        for (const chamber of sortedChambers) {
          const originalChamber = allChambers.find((c: any) => c.id === chamber.id);
          const clinicId = originalChamber?.clinicId;

          if (clinicId) {

            // Load clinic schedule to check if clinic is off today
            try {
              const scheduleDoc = await getDoc(doc(db!, 'clinicSchedules', clinicId));
              if (scheduleDoc.exists()) {
                const scheduleData = scheduleDoc.data();
                const plannedOffPeriods = scheduleData.plannedOffPeriods || [];

                // Check if today falls within any active planned off period
                let isClinicOff = false;
                for (const period of plannedOffPeriods) {
                  if (period.status === 'active') {
                    const periodStart = new Date(period.startDate);
                    const periodEnd = new Date(period.endDate);
                    const today = new Date(todayStr);

                    if (today >= periodStart && today <= periodEnd) {
                      isClinicOff = true;
                      break;
                    }
                  }
                }

                if (!isClinicOff) {
                  filteredChambers.push(chamber);
                }
              } else {
                // No clinic schedule found, include chamber
                filteredChambers.push(chamber);
              }
            } catch (error) {
              console.error(`❌ Error checking clinic schedule for ${clinicId}:`, error);
              // On error, include chamber
              filteredChambers.push(chamber);
            }
          } else {
            // No clinicId (home chamber), always include
            filteredChambers.push(chamber);
          }
        }

        setChambers(filteredChambers);

        // Load VC time slots
        if (doctorData.vcTimeSlots && Array.isArray(doctorData.vcTimeSlots)) {
          const currentDayName = now.toLocaleDateString('en-US', { weekday: 'long' });
          const todaysVcSlots = doctorData.vcTimeSlots.filter((s: any) => s.isActive && s.days.includes(currentDayName));
          setVcTimeSlots(todaysVcSlots);

          // Load VC bookings for today
          if (todaysVcSlots.length > 0) {
            const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
            const vcBookingsQuery = query(
              collection(db!, 'bookings'),
              where('doctorId', '==', userId),
              where('appointmentDate', '==', todayStr),
              where('consultationType', '==', 'video')
            );
            try {
              const vcSnap = await getDocs(vcBookingsQuery);
              const vcPats = vcSnap.docs.map(doc => {
                const data = doc.data();
                let pName = data.patientName || 'N/A';
                let pPhone = data.whatsappNumber || 'N/A';
                try {
                  if (pName && pName !== 'N/A') pName = decrypt(pName);
                } catch { /* already plain */ }
                try {
                  if (pPhone && pPhone !== 'N/A') pPhone = decrypt(pPhone);
                } catch { /* already plain */ }
                return {
                  id: doc.id,
                  patientName: pName,
                  whatsappNumber: pPhone,
                  age: data.age,
                  gender: data.gender,
                  purposeOfVisit: data.purposeOfVisit,
                  bookingId: data.bookingId || doc.id,
                  serialNo: data.serialNo || 0,
                  time: data.time || data.selectedTime || '',
                  isCancelled: data.isCancelled || false,
                  isMarkedSeen: data.isMarkedSeen || false,
                };
              }).sort((a, b) => a.serialNo - b.serialNo);
              setVcPatients(vcPats);
            } catch (e) {
              console.error('Error loading VC bookings:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error loading today\'s schedule:', error);
        toast.error('Failed to load today\'s schedule');
      } finally {
        setLoading(false);
      }
    };


    loadTodaysSchedule();
  }, [currentDate]); // Re-run when date changes

  // 🔔 AUTO-TRIGGER: Send List Notification for Non-Linked Clinics
  useEffect(() => {
    const checkExpiredClinics = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId || chambers.length === 0) return;

      const todayStr = new Date().toISOString().split('T')[0];

      // Filter for:
      // 1. Non-Linked Clinics (have manualClinicId)
      // 2. Schedule Expired (isExpired === true)
      // 3. Not Notified Yet Today

      for (const chamber of chambers) {
        if (chamber.manualClinicId && chamber.isExpired) {
          const notificationKeys = [
            `healqr_notified_${chamber.manualClinicId}_${todayStr}`,
            `healqr_notified_${chamber.id}_${todayStr}` // Also check chamber ID based key just in case
          ];

          const alreadyNotified = notificationKeys.some(key => localStorage.getItem(key));

          if (!alreadyNotified) {

            // Send Notification to Database
            await addDoctorNotification(userId, {
              type: 'system',
              category: 'alert',
              title: 'Schedule Ended',
              message: `Your schedule at ${chamber.name} has ended. Please send the patient list via WhatsApp.`,
              actionUrl: '', // Could deep link to schedule if needed
              metadata: {
                clinicId: chamber.manualClinicId,
                chamberId: chamber.id
              }
            });

            // Mark as notified in local storage (set both keys for safety)
            notificationKeys.forEach(key => localStorage.setItem(key, 'true'));

            // Optional: Show toast for immediate feedback
            toast('Schedule Ended', {
              description: `Time to send patient list to ${chamber.name}`,
              action: {
                label: 'Send',
                onClick: () => {
                   // User can click button on card
                }
              }
            });
          } else {
          }
        }
      }
    };

    // Run check when chambers load/update
    checkExpiredClinics();

    // Set interval to check every minute (in case page stays open)
    const interval = setInterval(checkExpiredClinics, 60000);
    return () => clearInterval(interval);

  }, [chambers]); // Dependency on chambers ensures we react to data load

  // Load walk-in patients from Firestore
  useEffect(() => {
    const loadWalkInPatients = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          return;
        }

        const { db } = await import('../lib/firebase/config');
        const { collection, query, where, getDocs } = await import('firebase/firestore');

        // Get today's date string (YYYY-MM-DD)
        const todayStr = new Date().toISOString().split('T')[0];

        // Query walk-in bookings for today - simpler query without composite index
        const bookingsRef = collection(db!, 'bookings');
        const walkInQuery = query(
          bookingsRef,
          where('doctorId', '==', userId),
          where('type', '==', 'walkin_booking')
        );

        const snapshot = await getDocs(walkInQuery);

        // Filter for today's bookings in code (avoids composite index)
        const walkInPatients = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              patientName: data.patientName || 'N/A',
              whatsappNumber: data.whatsappNumber || 'N/A',
              age: data.age || null,
              gender: data.gender || null,
              purposeOfVisit: data.purposeOfVisit || null,
              bookingId: data.bookingId || doc.id,
              tokenNumber: data.tokenNumber || '#0',
              visitType: data.visitType || 'walk-in',
              verifiedByPatient: data.verifiedByPatient || false, // Include verification status
              verificationMethod: data.verificationMethod, // Include verification method (can be undefined)
              isWalkIn: data.isWalkIn !== undefined ? data.isWalkIn : true, // Walk-ins default to true
              timestamp: data.date?.toDate ? data.date.toDate() : new Date(data.date),
              dateStr: data.date?.toDate
                ? data.date.toDate().toISOString().split('T')[0]
                : new Date(data.date).toISOString().split('T')[0],
            };
          })
          .filter(patient => patient.dateStr === todayStr) // Filter for today only
          .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)); // Sort by date desc

        setPatients(walkInPatients);
      } catch (error) {
        console.error('❌ Error loading walk-in patients:', error);
        toast.error('Failed to load walk-in patients');
      } finally {
        // loading state handled via local state if needed
      }
    };

    loadWalkInPatients();
  }, [addPatientModalOpen, currentDate]); // Reload when modal closes (new patient added) OR date changes

  // Auto-refresh at midnight - check every minute for date change
  useEffect(() => {
    const interval = setInterval(() => {
      const newDate = new Date().toDateString();
      if (newDate !== currentDate) {
        setCurrentDate(newDate);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [currentDate]);

  // Get current date
  const getCurrentDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return today.toLocaleDateString('en-US', options);
  };

  const handleToggleChamber = async (id: number) => {
    const chamber = chambers.find(c => c.id === id);
    if (!chamber) return;

    // Check if chamber is blocked for today
    const today = new Date();
    const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const isBlockedToday = (chamber as any).blockedDates?.includes(todayStr) || false;
    const isActiveToday = !isBlockedToday;

    // If chamber is currently active for today (turning OFF), check for seen patients first
    if (isActiveToday) {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const { db } = await import('../lib/firebase/config');
        const { collection, query, where, getDocs } = await import('firebase/firestore');

        // Get today's bookings for this chamber
        const todayStr = new Date().toISOString().split('T')[0];

        const bookingsRef = collection(db!, 'bookings');
        const numericChamberId = typeof chamber.id === 'string' ? parseInt(chamber.id, 10) : chamber.id;

        // Query ALL bookings for this chamber (including cancelled ones for accurate count)
        const chamberBookingsQuery = query(
          bookingsRef,
          where('chamberId', '==', numericChamberId),
          where('appointmentDate', '==', todayStr)
        );

        const allBookingsSnap = await getDocs(chamberBookingsQuery);

        // Filter only non-cancelled bookings for validation
        const bookingsSnap = {
          docs: allBookingsSnap.docs.filter(doc => !doc.data().isCancelled)
        };


        // Separate seen and non-seen patients with detailed logging
        const seenPatients = bookingsSnap.docs.filter(doc => {
          const isMarkedSeen = doc.data().isMarkedSeen === true;
          return isMarkedSeen;
        });

        const nonSeenPatients = bookingsSnap.docs.filter(doc => {
          const isMarkedSeen = doc.data().isMarkedSeen;
          return isMarkedSeen !== true; // Not seen (false, undefined, or null)
        });

        // Log each patient's status
        bookingsSnap.docs.forEach(doc => {
          const data = doc.data();
        });


        // Block toggle only if MIXED state (both seen and non-seen exist)
        if (seenPatients.length > 0 && nonSeenPatients.length > 0) {
          toast.error('Cannot Suspend Chamber', {
            description: `${seenPatients.length} SEEN + ${nonSeenPatients.length} NON-SEEN patients. Cancel non-seen individually or mark all as seen first.`,
            duration: 7000,
          });
          return;
        }

        // Allow if all patients are seen (no cancellations needed) or all non-seen (will cancel all)

        // All patients are non-seen, proceed with deactivation
        setSelectedChamber(chamber);
        setDeactivateModalOpen(true);
      } catch (error) {
        console.error('Error checking chamber patients:', error);
        toast.error('Failed to check patient status');
        return;
      }
    } else {
      // If chamber is OFF (turning ON), show reactivation confirmation modal
      setSelectedChamber(chamber);
      setReactivateModalOpen(true);
    }
  };

  const handleConfirmDeactivation = async () => {
    if (!selectedChamber) return;

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const { db } = await import('../lib/firebase/config');
      const { doc, getDoc, updateDoc, collection, query, where, getDocs } = await import('firebase/firestore');

      // Get today's date (used throughout this function)
      const today = new Date();
      const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

      // Update chamber to add today's date to blockedDates array
      const doctorRef = doc(db!, 'doctors', userId);
      const doctorSnap = await getDoc(doctorRef);

      if (doctorSnap.exists()) {
        const doctorData = doctorSnap.data();

        const updatedChambers = doctorData.chambers.map((c: any) => {
          if (c.id === selectedChamber.id) {
            const blockedDates = c.blockedDates || [];
            // Add today if not already blocked
            if (!blockedDates.includes(todayStr)) {
              blockedDates.push(todayStr);
            }
            return { ...c, blockedDates };
          }
          return c;
        });

        await updateDoc(doctorRef, { chambers: updatedChambers });
      }

      // Update local state
      setChambers(chambers.map(chamber => {
        if (chamber.id === selectedChamber.id) {
          const blockedDates = (chamber as any).blockedDates || [];
          if (!blockedDates.includes(todayStr)) {
            blockedDates.push(todayStr);
          }
          return { ...chamber, blockedDates } as any;
        }
        return chamber;
      }));

      // Get all booked patients for this chamber (today's bookings)
      const bookingsRef = collection(db!, 'bookings');
      const numericChamberId = typeof selectedChamber.id === 'string' ? parseInt(selectedChamber.id, 10) : selectedChamber.id;

      const chamberBookingsQuery = query(
        bookingsRef,
        where('chamberId', '==', numericChamberId),
        where('appointmentDate', '==', todayStr),
        where('isCancelled', '==', false)
      );

      const bookingsSnap = await getDocs(chamberBookingsQuery);

      // Check if all patients are already seen
      const allSeen = bookingsSnap.docs.every(doc => doc.data().isMarkedSeen === true);

      // Send cancellation notification to each NON-SEEN patient only
      let bookingsCancelled = 0;
      const patientsToNotify: Array<{
        phone: string;
        name: string;
        tokenNumber?: string;
        bookingId?: string;
        appointmentTime?: string;
      }> = [];

      for (const bookingDoc of bookingsSnap.docs) {
        const booking = bookingDoc.data();

        // Skip cancellation if patient is already seen (just blocking chamber for new bookings)
        if (booking.isMarkedSeen === true) {
          continue;
        }

        try {
          // Update booking with cancellation type (only for non-seen patients)
          await updateDoc(doc(db!, 'bookings', bookingDoc.id), {
            isCancelled: true,
            status: 'cancelled',
            cancellationType: 'CHAMBER TOGGLE',
            cancelledBy: 'doctor',
            cancellationReason: 'chamber_deactivated'
          });

          // Collect patient info for batch notification with booking details
          if (booking.whatsappNumber || booking.phone) {
            patientsToNotify.push({
              phone: booking.whatsappNumber || booking.phone,
              name: booking.patientName || 'Patient',
              tokenNumber: booking.tokenNumber || `#${booking.serialNo || 0}`,
              bookingId: booking.bookingId || bookingDoc.id,
              appointmentTime: booking.appointmentTime || selectedChamber.startTime,
              language: booking.language || 'english',
            });
          }
          bookingsCancelled++;
        } catch (error) {
          console.error(`❌ Failed to cancel booking for ${booking.patientName}:`, error);
        }
      }

      // ============================================
      // 🔔 SEND BATCH CANCELLATION NOTIFICATIONS (only if there are non-seen patients)
      // ============================================
      if (patientsToNotify.length > 0) {
        try {
          const { sendBatchCancellation } = await import('../services/notificationService');
          const doctorId = localStorage.getItem('userId') || '';
          const doctorName = localStorage.getItem('healqr_user_name') || 'Doctor';
          const doctorPhoto = localStorage.getItem('healqr_profile_photo') || '';
          const doctorSpecialty = localStorage.getItem('healqr_specialty') || '';

          await sendBatchCancellation(
            patientsToNotify,
            { doctorId, doctorName, doctorPhoto, doctorSpecialty },
            selectedChamber.name,
            'chamber',
            {
              appointmentDate: todayStr,
              appointmentTime: selectedChamber.startTime,
              language: 'english'
            }
          );
        } catch (notifError) {
          console.error('❌ Failed to send batch cancellation notifications:', notifError);
        }
      }

      // Success message based on scenario
      const successMessage = allSeen
        ? `${selectedChamber.name} blocked for new bookings. All patients already seen.`
        : `${selectedChamber.name} has been deactivated. ${bookingsCancelled} booking(s) cancelled and notified.`;

      toast.success('Chamber Deactivated', {
        description: successMessage,
        duration: 5000,
      });

      setSelectedChamber(null);
    } catch (error) {
      console.error('Error deactivating chamber:', error);
      toast.error('Failed to deactivate chamber');
    }
  };

  const handleConfirmReactivation = async () => {
    if (!selectedChamber) return;

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const { db } = await import('../lib/firebase/config');
      const { doc, getDoc, updateDoc, collection, query, where, getDocs } = await import('firebase/firestore');

      // Get today's date (used throughout this function)
      const today = new Date();
      const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

      // Update chamber to remove today's date from blockedDates array
      const doctorRef = doc(db!, 'doctors', userId);
      const doctorSnap = await getDoc(doctorRef);

      if (doctorSnap.exists()) {
        const doctorData = doctorSnap.data();

        const updatedChambers = doctorData.chambers.map((c: any) => {
          if (c.id === selectedChamber.id) {
            const blockedDates = (c.blockedDates || []).filter((date: string) => date !== todayStr);
            return { ...c, blockedDates };
          }
          return c;
        });

        await updateDoc(doctorRef, { chambers: updatedChambers });
      }

      // Update local state
      setChambers(chambers.map(chamber => {
        if (chamber.id === selectedChamber.id) {
          const blockedDates = ((chamber as any).blockedDates || []).filter((date: string) => date !== todayStr);
          return { ...chamber, blockedDates } as any;
        }
        return chamber;
      }));

      // Get all previously booked patients for this chamber (today's bookings, including cancelled ones)
      const bookingsRef = collection(db!, 'bookings');
      const numericChamberId = typeof selectedChamber.id === 'string' ? parseInt(selectedChamber.id, 10) : selectedChamber.id;

      const chamberBookingsQuery = query(
        bookingsRef,
        where('chamberId', '==', numericChamberId),
        where('appointmentDate', '==', todayStr)
      );

      const bookingsSnap = await getDocs(chamberBookingsQuery);

      // Send restoration notification to each patient
      let affectedBookings = 0;
      const patientsToNotify: Array<{
        phone: string;
        name: string;
        tokenNumber?: string;
        bookingId?: string;
        appointmentTime?: string;
      }> = [];

      for (const bookingDoc of bookingsSnap.docs) {
        const booking = bookingDoc.data();
        affectedBookings++;

        // Only restore if it was cancelled due to chamber toggle
        if (booking.isCancelled && booking.cancellationType === 'CHAMBER TOGGLE') {
          await updateDoc(doc(db!, 'bookings', bookingDoc.id), {
            isCancelled: false,
            status: 'confirmed',
            cancellationType: null,
            restoredAt: new Date(),
          });

          if (booking.whatsappNumber || booking.phone) {
            patientsToNotify.push({
              phone: booking.whatsappNumber || booking.phone,
              name: booking.patientName || 'Patient',
              tokenNumber: booking.tokenNumber || `#${booking.serialNo || 0}`,
              bookingId: booking.bookingId || bookingDoc.id,
              appointmentTime: booking.appointmentTime || selectedChamber.startTime,
              language: booking.language || 'english',
            });
          }
        }
      }

      // ============================================
      // 🔔 SEND BATCH RESTORATION NOTIFICATIONS
      // ============================================
      if (patientsToNotify.length > 0) {
        try {
          const { sendBatchRestoration } = await import('../services/notificationService');
          const doctorId = localStorage.getItem('userId') || '';
          const doctorName = localStorage.getItem('healqr_user_name') || 'Doctor';
          const doctorPhoto = localStorage.getItem('healqr_profile_photo') || '';
          const doctorSpecialty = localStorage.getItem('healqr_specialty') || '';

          await sendBatchRestoration(
            patientsToNotify,
            { doctorId, doctorName, doctorPhoto, doctorSpecialty },
            selectedChamber.name,
            'chamber',
            {
              appointmentDate: todayStr,
              appointmentTime: selectedChamber.startTime,
              language: 'english'
            }
          );
        } catch (notifError) {
          console.error('❌ Failed to send batch restoration notifications:', notifError);
        }
      }

      toast.success('Chamber Reactivated', {
        description: `${selectedChamber.name} is now active. ${patientsToNotify.length} booking(s) restored and notified.`,
        duration: 5000,
      });

      setSelectedChamber(null);
    } catch (error) {
      console.error('Error reactivating chamber:', error);
      toast.error('Failed to reactivate chamber');
    }
  };

  const handleViewPatients = (chamber: typeof chambers[0]) => {
    setSelectedChamberForDetails(chamber);
    setShowPatientDetails(true);
  };

  // Reschedule chamber for today
  const handleOpenReschedule = (chamber: typeof chambers[0]) => {
    setRescheduleChamberId(chamber.id);
    setRescheduleStart(chamber.rescheduledStartTime || chamber.startTime);
    setRescheduleEnd(chamber.rescheduledEndTime || chamber.endTime);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleChamberId || !rescheduleStart || !rescheduleEnd) return;
    if (rescheduleStart >= rescheduleEnd) {
      toast.error('Start time must be before end time');
      return;
    }

    setSavingReschedule(true);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const { db } = await import('../lib/firebase/config');
      const { doc, getDoc, updateDoc } = await import('firebase/firestore');

      const now = new Date();
      const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

      const doctorRef = doc(db!, 'doctors', userId);
      const doctorSnap = await getDoc(doctorRef);
      if (!doctorSnap.exists()) return;

      const doctorData = doctorSnap.data();
      const updatedChambers = doctorData.chambers.map((c: any) => {
        if (c.id === rescheduleChamberId) {
          return {
            ...c,
            todayReschedule: {
              date: todayStr,
              startTime: rescheduleStart,
              endTime: rescheduleEnd,
              originalStartTime: c.startTime,
              originalEndTime: c.endTime,
            },
          };
        }
        return c;
      });

      await updateDoc(doctorRef, { chambers: updatedChambers });

      // Update local state
      setChambers(prev => {
        const updated = prev.map(ch => {
          if (ch.id === rescheduleChamberId) {
            return { ...ch, rescheduledStartTime: rescheduleStart, rescheduledEndTime: rescheduleEnd };
          }
          return ch;
        });
        // Re-sort by effective time
        return updated.sort((a, b) => {
          if (a.isExpired && !b.isExpired) return 1;
          if (!a.isExpired && b.isExpired) return -1;
          const aTime = a.rescheduledStartTime || a.startTime;
          const bTime = b.rescheduledStartTime || b.startTime;
          const [aH, aM] = (aTime || '00:00').split(':').map(Number);
          const [bH, bM] = (bTime || '00:00').split(':').map(Number);
          return (aH * 60 + aM) - (bH * 60 + bM);
        });
      });

      // Send reschedule notification to all booked patients for this chamber today
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const bookingsRef = collection(db!, 'bookings');
        const chamberBookingsQuery = query(
          bookingsRef,
          where('chamberId', '==', rescheduleChamberId),
          where('appointmentDate', '==', todayStr)
        );
        const bookingsSnap = await getDocs(chamberBookingsQuery);

        const chamber = chambers.find(c => c.id === rescheduleChamberId);
        const chamberName = chamber?.name || 'Chamber';
        const docSpecialty = localStorage.getItem('healqr_specialty') || '';

        // Add doctor notification for record
        await addDoctorNotification(userId, {
          type: 'chamber_rescheduled',
          title: `${chamberName} Rescheduled`,
          message: `Time changed from ${chamber?.startTime}-${chamber?.endTime} to ${rescheduleStart}-${rescheduleEnd} for today`,
          priority: 'high',
        });

        // Notify each booked patient with proper template notification
        const { sendChamberRescheduled } = await import('../services/notificationService');
        for (const bookingDoc of bookingsSnap.docs) {
          const booking = bookingDoc.data();
          try {
            if (!booking.patientPhone) continue;
            await sendChamberRescheduled({
              patientPhone: booking.patientPhone,
              patientName: booking.patientName || 'Patient',
              doctorId: userId,
              doctorName: doctorName || 'Doctor',
              doctorSpecialty: docSpecialty,
              chamberName,
              appointmentDate: todayStr,
              originalTime: `${chamber?.startTime} - ${chamber?.endTime}`,
              newTime: `${rescheduleStart} - ${rescheduleEnd}`,
              bookingId: bookingDoc.id,
            });
          } catch (fcmErr) {
            console.warn('Notification send failed for patient:', fcmErr);
          }
        }
      } catch (err) {
        console.error('Notification error:', err);
      }

      setShowRescheduleConfirm(false);
      setRescheduleChamberId(null);
      toast.success(`Chamber rescheduled to ${rescheduleStart} - ${rescheduleEnd} for today`);
    } catch (err) {
      console.error('Reschedule error:', err);
      toast.error('Failed to reschedule chamber');
    } finally {
      setSavingReschedule(false);
    }
  };

  const handleAddPatient = () => {
    setAddPatientModalOpen(true);
  };

  const handlePatientAdded = (patientData: PatientFormData) => {
    const newPatient: Patient = {
      id: Date.now().toString(),
      ...patientData,
      verifiedByPatient: true, // Explicitly set as verified since modal only closes on verification
      timestamp: new Date(),
    };
    setPatients([...patients, newPatient]);
    setAddPatientModalOpen(false);
  };

  const handleSendPatientList = async (chamber: any) => {
    // Determine the doctor name to use
    // If we're inside the main TodaysSchedule component, doctorName should be available from localStorage or state
    const name = localStorage.getItem('doctorName') || 'Dr.';

    await sendPatientListViaWhatsApp({
      id: chamber.id,
      name: chamber.name,
      clinicPhone: chamber.clinicPhone,
      startTime: chamber.startTime,
      endTime: chamber.endTime
    }, name);
  };

  const handleViewWalkInPatients = () => {
    setShowPatientsPage(true);
  };

  // Calculate counts
  const homeCallCount = patients.filter(p => p.visitType === 'home-call').length;
  const chamberWalkInCount = patients.filter(p => p.visitType === 'walk-in').length;

  // Show patients page if requested
  if (showPatientsPage) {
    return (
      <WalkInPatientsPage
        patients={patients}
        onBack={() => setShowPatientsPage(false)}
        onMenuChange={onMenuChange}
      />
    );
  }

  // Show patient details for selected chamber
  if (showPatientDetails && selectedChamberForDetails) {
    return (
      <PatientDetailsLoader
        chamber={selectedChamberForDetails}
        onBack={() => {
          setShowPatientDetails(false);
          setSelectedChamberForDetails(null);
        }}
        onMenuChange={onMenuChange}
        activeAddOns={activeAddOns}
        doctorLanguage={doctorLanguage}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Sidebar */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeMenu="today"
        onMenuChange={onMenuChange || (() => {})}
        onLogout={onLogout}
        activeAddOns={activeAddOns}
      />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <div className="border-b border-gray-800 bg-[#0a0f1a]/95 backdrop-blur sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-gray-400 hover:text-white"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </Button>

              {/* Back Button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                onClick={() => onMenuChange?.('dashboard')}
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>

              <div>
                <h1 className="text-white">Today's Schedule</h1>
                <p className="text-gray-400 text-sm mt-1">Manage your active chambers for today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto space-y-4">
          {/* Walk-In Patients Section - Moved to Top */}
          <Card className="bg-gray-800/50 border-gray-700 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white">Walk-In Patients</h3>
                <Button
                  onClick={handleAddPatient}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Patient
                </Button>
              </div>

              {/* Current Date */}
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>{getCurrentDate()}</span>
              </div>

              {/* Statistics */}
              <div className="flex items-center gap-6">
                <div className="text-sm">
                  <span className="text-gray-400">Home Call: </span>
                  <span className="text-white">{homeCallCount}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-400">Chamber Walk In: </span>
                  <span className="text-white">{chamberWalkInCount}</span>
                </div>
              </div>

              {/* View Patients Button */}
              <div className="pt-2">
                <Button
                  onClick={handleViewWalkInPatients}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  VIEW PATIENTS
                </Button>
              </div>
            </div>
          </Card>

          {/* VC Patients Card */}
          {vcTimeSlots.length > 0 && (
            <Card className="bg-gray-800/50 border-gray-700 p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Video className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-white">VC Patients</h3>
                      <p className="text-gray-400 text-xs mt-0.5">{getCurrentDate()}</p>
                    </div>
                  </div>
                  <span className="text-blue-400 font-semibold text-lg">{vcPatients.filter(p => !p.isCancelled).length}</span>
                </div>

                {/* VC Slots with patients grouped by time */}
                {vcTimeSlots.map((slot) => {
                  const formatTime = (t: string) => {
                    const [h, m] = t.split(':').map(Number);
                    const period = h >= 12 ? 'PM' : 'AM';
                    const displayH = h % 12 || 12;
                    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
                  };
                  const slotTimeStr = `${slot.startTime} - ${slot.endTime}`;
                  const slotPatients = vcPatients.filter(p => p.time === slotTimeStr || p.time?.includes(slot.startTime));
                  const activePatients = slotPatients.filter(p => !p.isCancelled);

                  return (
                    <div key={slot.id} className="bg-gray-700/30 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-400" />
                          <span className="text-white text-sm font-medium">{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
                        </div>
                        <span className={`text-sm font-semibold ${activePatients.length > 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                          {activePatients.length} patient{activePatients.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* View VC Patients Button */}
                <div className="pt-2">
                  <Button
                    onClick={() => {
                      // Reuse the chamber patient details view with VC data
                      setSelectedChamberForDetails({
                        id: -999, // Special ID for VC
                        name: 'Video Consultation',
                        address: 'Online',
                        startTime: vcTimeSlots[0]?.startTime || '00:00',
                        endTime: vcTimeSlots[vcTimeSlots.length - 1]?.endTime || '23:59',
                        schedule: 'Video Consultation',
                        booked: vcPatients.filter(p => !p.isCancelled).length,
                        capacity: 99,
                        isActive: true,
                        blockedDates: [],
                        isExpired: false,
                        startMinutes: 0,
                      } as any);
                      setShowPatientDetails(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    VIEW PATIENTS
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Chamber Schedule Cards */}
          {loading ? (
            <Card className="bg-gray-800/50 border-gray-700 p-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gray-700/30 rounded-full flex items-center justify-center animate-pulse">
                  <Calendar className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-gray-400">Loading today's schedule...</p>
              </div>
            </Card>
          ) : chambers.length === 0 ? (
            <Card className="bg-gray-800/50 border-gray-700 p-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gray-700/30 rounded-full flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-white mb-2">No Chambers Scheduled for Next 24 Hours</h3>
                  <p className="text-gray-400 text-sm">
                    Set up your chamber schedules in Schedule Manager to start accepting appointments
                  </p>
                </div>
                <Button
                  onClick={() => onMenuChange?.('schedule')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white mt-4"
                >
                  Go to Schedule Manager
                </Button>
              </div>
            </Card>
          ) : (
            // Chambers are already sorted: active by time ascending, then expired at bottom
            chambers.map((chamber) => {
              // Check if today is in blockedDates array
              const today = new Date();
              const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
              const isBlockedToday = (chamber as any).blockedDates?.includes(todayStr) || false;
              const isActiveToday = !isBlockedToday;

              return (
              <Card key={chamber.id} className="bg-gray-800/50 border-gray-700 p-6">
                <div className="space-y-4">
                  {/* Header with Name and Toggle */}
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <h3 className="text-white">{chamber.name}</h3>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-sm ${isActiveToday ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {isActiveToday ? 'ON' : 'OFF'}
                      </span>
                      <Switch
                        checked={isActiveToday}
                        onCheckedChange={() => handleToggleChamber(chamber.id)}
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-gray-400 text-sm mb-3">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{chamber.address}</span>
                  </div>

                  {/* Chamber Time Display */}
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    {chamber.rescheduledStartTime ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="line-through text-red-400">{chamber.startTime} - {chamber.endTime}</span>
                        <span className="text-emerald-400 font-semibold">{chamber.rescheduledStartTime} - {chamber.rescheduledEndTime}</span>
                        <Badge className="bg-amber-500/20 text-amber-400 text-[10px] border-amber-500/30">RESCHEDULED</Badge>
                      </div>
                    ) : (
                      <span>{chamber.startTime} - {chamber.endTime}</span>
                    )}
                    {chamber.isExpired && (
                      <Badge className="bg-red-600 text-white text-xs ml-2">CHAMBER TIME OVER</Badge>
                    )}
                  </div>

                  {/* Reschedule Toggle */}
                  {isActiveToday && !chamber.isExpired && (
                    <div className="mb-2">
                      {rescheduleChamberId === chamber.id ? (
                        <div className="bg-zinc-900/80 border border-zinc-700 rounded-lg p-3 space-y-3">
                          <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
                            <RefreshCw className="w-3.5 h-3.5" />
                            Reschedule for today only
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-1">New Start</label>
                              <input
                                type="time"
                                value={rescheduleStart}
                                onChange={e => setRescheduleStart(e.target.value)}
                                className="w-full h-9 px-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:border-emerald-500 outline-none [color-scheme:dark]"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-1">New End</label>
                              <input
                                type="time"
                                value={rescheduleEnd}
                                onChange={e => setRescheduleEnd(e.target.value)}
                                className="w-full h-9 px-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:border-emerald-500 outline-none [color-scheme:dark]"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => setShowRescheduleConfirm(true)}
                              disabled={!rescheduleStart || !rescheduleEnd || rescheduleStart >= rescheduleEnd}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 flex-1"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRescheduleChamberId(null)}
                              className="border-zinc-700 text-gray-400 text-xs h-8"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenReschedule(chamber)}
                          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          {chamber.rescheduledStartTime ? 'Change Reschedule' : 'Reschedule for today'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Booking Status */}
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Booking Status:</span>
                        <span className={`font-semibold text-lg ${
                          chamber.booked >= chamber.capacity
                            ? 'text-red-400'
                            : chamber.booked >= chamber.capacity * 0.8
                            ? 'text-yellow-400'
                            : 'text-emerald-400'
                        }`}>
                          {chamber.booked}/{chamber.capacity}
                        </span>
                        {chamber.booked >= chamber.capacity && (
                          <Badge className="bg-red-500/20 text-red-400 text-xs">FULL</Badge>
                        )}
                      </div>
                    </div>
                    <Progress
                      value={(chamber.booked / chamber.capacity) * 100}
                      className="h-2 bg-gray-700"
                    />
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center justify-between pt-2 gap-2">
                    <span className="text-emerald-400 text-sm">{chamber.schedule}</span>
                    <div className="flex gap-2">
                      {/* NEW: Send List via WhatsApp for Non-Linked Clinics */}
                      {chamber.manualClinicId && !chamber.clinicCode && chamber.clinicPhone && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendPatientList(chamber)}
                          disabled={!isActiveToday || chamber.booked === 0}
                          className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-10 px-3"
                          title="Send Patient List to Clinic via WhatsApp"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.412.001 12.049a11.82 11.82 0 001.611 6.008L0 24l6.102-1.6a11.777 11.777 0 005.941 1.6h.005c6.634 0 12.043-5.412 12.046-12.049a11.795 11.795 0 00-3.486-8.504z"/></svg>
                        </Button>
                      )}
                      <Button
                        onClick={() => handleViewPatients(chamber)}
                        disabled={!isActiveToday}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-700 h-10"
                      >
                        VIEW PATIENTS
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
          )}
        </div>
      </div>

      {/* Add Patient Modal */}
      <AddPatientModal
        isOpen={addPatientModalOpen}
        onClose={() => setAddPatientModalOpen(false)}
        onAddPatient={handlePatientAdded}
        doctorId={localStorage.getItem('userId') || undefined}
        doctorName={doctorName}
      />

      {/* Deactivate Chamber Modal */}
      <DeactivateChamberModal
        isOpen={deactivateModalOpen}
        onClose={() => {
          setDeactivateModalOpen(false);
          setSelectedChamber(null);
        }}
        chamber={selectedChamber}
        onConfirm={handleConfirmDeactivation}
      />

      {/* Reactivate Chamber Modal */}
      <ReactivateChamberModal
        isOpen={reactivateModalOpen}
        onClose={() => {
          setReactivateModalOpen(false);
          setSelectedChamber(null);
        }}
        chamber={selectedChamber}
        onConfirm={handleConfirmReactivation}
      />

      {/* Reschedule Confirmation Modal */}
      {showRescheduleConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <RefreshCw className="w-5 h-5" />
              <h3 className="text-lg font-bold">Confirm Reschedule</h3>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-gray-400">
                Chamber: <span className="text-white font-medium">{chambers.find(c => c.id === rescheduleChamberId)?.name}</span>
              </p>
              <p className="text-gray-400">
                Original: <span className="text-red-400 line-through">{chambers.find(c => c.id === rescheduleChamberId)?.startTime} - {chambers.find(c => c.id === rescheduleChamberId)?.endTime}</span>
              </p>
              <p className="text-gray-400">
                New Time: <span className="text-emerald-400 font-semibold">{rescheduleStart} - {rescheduleEnd}</span>
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-amber-400 text-xs">
                ⚠️ This applies to today only. All booked patients will be notified about the time change.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleConfirmReschedule}
                disabled={savingReschedule}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {savingReschedule ? '⏳ Saving...' : 'Confirm'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRescheduleConfirm(false)}
                disabled={savingReschedule}
                className="flex-1 border-zinc-700 text-gray-400"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

