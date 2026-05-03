import { ArrowLeft, Calendar, MapPin, Clock, Bell, Eye, Star, Apple, Phone, X, Check, RotateCcw, CheckCircle2, Video, Send, UserCircle, Sparkles, History, Upload, Lock, QrCode, FileText, Stethoscope, Loader2, MessageCircle, Heart, Users, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import FollowUpModal from './FollowUpModal';
import CancellationModal from './CancellationModal';
import RestorationModal from './RestorationModal';
import DoctorRxUploadModal from './DoctorRxUploadModal';
import PatientHistoryModal from './PatientHistoryModal';
import { DoctorAIRXUploadModal } from './DoctorAIRXUploadModal';
import DigitalRXMaker from './DigitalRXMaker';
import InlineDietChartModal from './InlineDietChartModal';
// import { PatientOldRXViewer } from './PatientOldRXViewer';
import { toast } from 'sonner';
import { doc, updateDoc, getDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase/config';
import { translateDataValue, transliterateName, type Language } from '../utils/translations';
import { sendAppointmentRestored, sendAppointmentCancelled, sendVideoCallLink } from '../services/notificationService';

interface Patient {
  id: string;
  name: string;
  phone: string;
  bookingId: string;
  age: number;
  gender: 'MALE' | 'FEMALE';
  visitType: string;
  // Button states
  isMarkedSeen?: boolean;
  reminderSent?: boolean;
  followUpScheduled?: boolean;
  reviewScheduled?: boolean;
  isCancelled?: boolean;
  // Payment status (for pre-payment collection feature)
  paymentVerified?: boolean; // true if patient has paid and doctor verified on pre-payment page
  // Timing for reminder logic
  bookingTime: Date; // When patient booked the appointment
  appointmentTime: Date; // Scheduled appointment time
  // Video consultation
  consultationType?: 'video' | 'in-person'; // Type of consultation
  // Old RX uploaded by patient
  prescriptionUrl?: string | string[]; // Patient's old RX URL(s) - Can be single or multiple files
  prescriptionReviewed?: boolean; // Whether doctor has reviewed the old RX
  language?: Language; // Patient's preferred language
  isWalkIn?: boolean;
  verificationMethod?: 'qr_scan' | 'manual_override';
  serialNumber?: string | number;
  tokenNumber?: string;
  chamber?: string;
  isDataRestricted?: boolean; // Per-patient: true if this patient's data should be masked
  bookingSource?: 'clinic_qr' | 'doctor_qr' | 'walkin'; // How the patient booked
  clinicId?: string; // Which clinic facilitated the booking (if any)
  digitalRxUrl?: string; // URL of generated Digital RX (if any)
  dietChartUrl?: string; // URL of generated AI Diet Chart (if any)
  vcLinkSentAt?: any;
  vcPatientJoined?: boolean;
  vcCompleted?: boolean;
  consultationStatus?: 'pending' | 'completed';
  referrerName?: string;
  referrerRole?: string;
}

interface PatientDetailsProps {
  chamberName: string;
  chamberAddress: string;
  scheduleTime: string;
  scheduleDate: string;
  currentPatients: number;
  totalPatients: number;
  patients: Patient[];
  onBack: () => void;
  onMenuChange?: (menu: string) => void;
  onRefresh?: () => void; // Callback to refresh patient list after cancel/restore
  prepaymentActive?: boolean; // Whether doctor has pre-payment collection feature activated
  activeAddOns?: string[]; // Active premium add-ons purchased by doctor
  doctorLanguage?: Language; // Doctor's preferred language for AI translation
  doctorId?: string; // Doctor ID for loading correct doctor info (for non-linked doctors)
  readOnly?: boolean; // When true, hides all interactive buttons (clinic owner/manager/assistant view)
  bookingsCollection?: string; // Firestore collection to read/write bookings (doctor='bookings', paramedical='paramedicalBookings')
  providerCollection?: string; // Firestore collection for the provider (doctor='doctors', paramedical='paramedicals'). Used for chronic-care sub-collection.
  onOpenSidebar?: () => void; // Callback to open the surrounding dashboard sidebar (mobile hamburger)
}

interface PatientButtonStates {
  [key: string]: {
    isMarkedSeen: boolean;
    reminderSent: boolean;
    followUpScheduled: boolean;
    reviewScheduled: boolean;
    isCancelled: boolean;
    reminderEligible: boolean; // Is reminder eligible (6+ hours gap)
    videoLinkSent: boolean; // For video consultation - track if link sent (system controlled)
    patientWaiting: boolean; // For video consultation - track if patient is waiting on the other side
    vcCompleted: boolean; // For video consultation - track if VC session is completed (doctor ended call)
    vcLinkSentViaFCM: boolean; // Track if FCM VC link was actually sent (not just local state)
    prescriptionUploaded: boolean; // Track if doctor has uploaded today's prescription
    digitalRxUsed: boolean; // Track if Digital RX was generated for this patient
    dietChartUsed: boolean; // Track if AI Diet Chart was generated for this patient
  };
}

export default function PatientDetails({
  chamberName,
  chamberAddress,
  scheduleTime,
  scheduleDate,
  currentPatients,
  totalPatients,
  patients,
  onBack,
  onMenuChange,
  onRefresh,
  prepaymentActive = false,
  doctorLanguage = 'english',
  activeAddOns = [],
  doctorId,
  readOnly = false,
  bookingsCollection = 'bookings',
  providerCollection = 'doctors',
  onOpenSidebar,
}: PatientDetailsProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [aiUploadModalOpen, setAiUploadModalOpen] = useState(false);
  const [uploadTargetPatient, setUploadTargetPatient] = useState<Patient | null>(null);
  const [isReviewRestricted, setIsReviewRestricted] = useState(false);

  // Check for Clinic Review Restrictions on Mount (centralized reviews only)
  useEffect(() => {
    const checkClinicRestrictions = async () => {
      try {
        const userId = localStorage.getItem('userId') || localStorage.getItem('healqr_temp_doctor_id');
        if (!userId) return;

        const doctorRef = doc(db!, 'doctors', userId);
        const doctorSnap = await getDoc(doctorRef);

        if (doctorSnap.exists()) {
          const doctorData = doctorSnap.data();
          const clinicId = doctorData.clinicId;

          if (clinicId) {
            const clinicRef = doc(db!, 'clinics', clinicId);
            const clinicSnap = await getDoc(clinicRef);

            if (clinicSnap.exists()) {
              const clinicData = clinicSnap.data();
              if (clinicData.centralizedReviews) {
                setIsReviewRestricted(true);
              }
            }
          }
        }
        // NOTE: Patient data masking is now handled PER-PATIENT via patient.isDataRestricted
        // which is set by TodaysSchedule.tsx / ClinicTodaysSchedule.tsx based on bookingSource
      } catch (error) {
        console.error('Error checking clinic restrictions:', error);
      }
    };

    checkClinicRestrictions();
  }, []);

  const [patientStates, setPatientStates] = useState<PatientButtonStates>(() => {
    const initialStates: PatientButtonStates = {};
    const now = new Date();

    patients.forEach(patient => {
      // Calculate if reminder is eligible (booking done 6+ hours before appointment)
      const timeDifference = patient.appointmentTime.getTime() - patient.bookingTime.getTime();
      const hoursDifference = timeDifference / (1000 * 60 * 60);
      const isReminderEligible = hoursDifference >= 6;

      // Check if video link should already be sent (for video consultations within 30 min)
      let videoLinkSent = false;
      if (patient.consultationType === 'video') {
        const timeUntilAppointment = patient.appointmentTime.getTime() - now.getTime();
        const minutesUntilAppointment = timeUntilAppointment / (1000 * 60);
        if (minutesUntilAppointment <= 30 && minutesUntilAppointment > 0) {
          videoLinkSent = true;
        }
      }

      // For QR-verified walk-ins, only treat as "seen" if consultation was actually completed
      const isQrVerifiedWalkin = patient.isWalkIn && patient.verificationMethod !== 'manual_override';
      const effectiveMarkedSeen = isQrVerifiedWalkin
        ? !!(patient.digitalRxUrl || (patient as any).consultationStatus === 'completed')
        : (patient.isMarkedSeen || false);

      initialStates[patient.id] = {
        isMarkedSeen: effectiveMarkedSeen,
        reminderSent: patient.reminderSent || false,
        followUpScheduled: patient.followUpScheduled || false,
        reviewScheduled: patient.reviewScheduled || false,
        isCancelled: patient.isCancelled || false,
        reminderEligible: isReminderEligible,
        videoLinkSent: videoLinkSent || !!(patient as any).vcLinkSentAt, // Set if within window OR previously sent
        patientWaiting: !!(patient as any).vcPatientJoined, // Loaded from Firestore
        vcCompleted: !!(patient as any).vcCompleted, // Loaded from Firestore
        vcLinkSentViaFCM: !!(patient as any).vcLinkSentAt, // Track if FCM was actually sent
        prescriptionUploaded: false, // Initially no prescription uploaded
        digitalRxUsed: !!patient.digitalRxUrl, // True if Digital RX was already generated
        dietChartUsed: !!patient.dietChartUrl, // True if AI Diet Chart was already generated
      };
    });
    return initialStates;
  });

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [restorationModalOpen, setRestorationModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Referrer info modal
  const [showReferrerInfoModal, setShowReferrerInfoModal] = useState(false);
  const [selectedReferrerInfo, setSelectedReferrerInfo] = useState<{ name: string; role: string; referrerId: string; organization?: string; phone?: string; currentMonthReferrals?: number } | null>(null);
  const [referrerDetailsLoading, setReferrerDetailsLoading] = useState(false);

  // Assistant "Consultation Complete?" confirmation modal state
  const [assistantSeenModalOpen, setAssistantSeenModalOpen] = useState(false);
  const [assistantSeenPatient, setAssistantSeenPatient] = useState<Patient | null>(null);

  // ============================================
  // 🔄 MULTI-STEP CONSULTATION COMPLETION FLOW STATE
  // Eye → "Create RX?" → RX Maker → "Add Diet Chart?" → Diet Chart → Send Notification
  // ============================================
  const [rxConfirmModalOpen, setRxConfirmModalOpen] = useState(false);
  const [rxMakerOpen, setRxMakerOpen] = useState(false);
  const [rxPausedState, setRxPausedState] = useState<{ items: any[]; remarks: string; diagnosis: string; vitals?: Record<string,string>; pathology?: Record<string,string>; suggestedTests?: string[] } | null>(null);
  const [dietConfirmModalOpen, setDietConfirmModalOpen] = useState(false);
  const [dietChartModalOpen, setDietChartModalOpen] = useState(false);
  const [selectedPatientForFlow, setSelectedPatientForFlow] = useState<Patient | null>(null);
  const [generatedRxUrl, setGeneratedRxUrl] = useState<string | null>(null);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [isRegenMode, setIsRegenMode] = useState(false); // Track if RX Regen mode (vs initial Eye flow)
  const [lastRxData, setLastRxData] = useState<{ items: any[], remarks: string, diagnosis: string, vitals: Record<string,string>, pathology: Record<string,string>, suggestedTests: string[] } | null>(null); // Last generated RX data for regen
  const [regenSuccessModalOpen, setRegenSuccessModalOpen] = useState(false); // Show success modal after RX regen
  const [regenRxUrl, setRegenRxUrl] = useState<string | null>(null); // Store regen RX URL for WhatsApp

  // Chronic Care state
  const [chronicModalOpen, setChronicModalOpen] = useState(false);
  const [chronicPatient, setChronicPatient] = useState<Patient | null>(null);
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  const [chronicNotes, setChronicNotes] = useState('');
  const [chronicCustom, setChronicCustom] = useState('');
  const [chronicSaving, setChronicSaving] = useState(false);
  const [chronicAdded, setChronicAdded] = useState<Set<string>>(new Set()); // Track phones already in chronic registry

  const CHRONIC_CONDITIONS_LIST = [
    'Diabetes (Type 1)', 'Diabetes (Type 2)', 'Hypertension', 'Hypothyroidism',
    'Hyperthyroidism', 'Asthma', 'COPD', 'Heart Disease', 'Kidney Disease',
    'Liver Disease', 'Arthritis', 'Epilepsy', 'Depression', 'Anxiety',
    'Migraine', 'Anemia', 'Obesity', 'PCOD/PCOS', 'High Cholesterol', 'Gout',
  ];

  // Check which patients already exist in chronic care registry
  useEffect(() => {
    if (!doctorId && !auth?.currentUser?.uid) return;
    const dId = doctorId || auth?.currentUser?.uid || '';
    if (!dId || !db) return;
    const checkChronic = async () => {
      try {
        const snap = await getDocs(collection(db!, providerCollection, dId, 'chronicPatients'));
        const phones = new Set<string>();
        snap.forEach(d => { const ph = d.data().phone; if (ph) phones.add(ph); });
        setChronicAdded(phones);
      } catch {}
    };
    checkChronic();
  }, [doctorId]);

  const handleAddToChronic = async () => {
    if (!chronicPatient || chronicConditions.length === 0) {
      toast.error('Select at least one condition');
      return;
    }
    const dId = doctorId || auth?.currentUser?.uid || '';
    if (!dId || !db) return;
    setChronicSaving(true);
    try {
      await addDoc(collection(db!, providerCollection, dId, 'chronicPatients'), {
        patientName: chronicPatient.name,
        phone: chronicPatient.phone,
        age: String(chronicPatient.age || ''),
        gender: chronicPatient.gender === 'MALE' ? 'Male' : chronicPatient.gender === 'FEMALE' ? 'Female' : 'Other',
        conditions: chronicConditions,
        notes: chronicNotes.trim(),
        addedAt: serverTimestamp(),
      });
      toast.success(`${chronicPatient.name} added to Chronic Care`);
      setChronicAdded(prev => new Set(prev).add(chronicPatient.phone));
      setChronicModalOpen(false);
      setChronicPatient(null);
      setChronicConditions([]);
      setChronicNotes('');
      setChronicCustom('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add to Chronic Care');
    } finally { setChronicSaving(false); }
  };

  // Get current doctor info from Firebase auth (expanded for DigitalRXMaker)
  const [doctorInfo, setDoctorInfo] = useState<{
    id: string;
    name: string;
    degree: string;
    degrees?: string[];
    specialty: string;
    specialties?: string[];
    specialities?: string[];
    qrNumber?: string;
    clinicName?: string;
    doctorId: string;
    address?: string;
    timing?: string;
    registrationNumber?: string;
    showRegistrationOnRX?: boolean;
    useDrPrefix?: boolean;
    // Context-aware PDF fields
    pdfContext?: 'clinic' | 'doctor'; // clinic = clinic chamber, doctor = personal chamber
    clinicInfo?: {
      name: string;
      address: string;
      qrNumber: string;
      phone?: string;
      clinicId: string;
      registrationNumber?: string;
      showRegistrationOnRx?: boolean;
      footerLine1?: string;
      footerLine2?: string;
      watermarkLogo?: string;
    };
    allDoctors?: Array<{
      name: string;
      specialty: string;
      timing: string;
      registrationNumber?: string;
    }>;
    allChambers?: Array<{
      name: string;
      address: string;
      timing: string;
    }>;
    footerLine1?: string;
    footerLine2?: string;
    watermarkLogo?: string;
  }>({
    id: '',
    name: '',
    degree: '',
    specialty: '',
    specialties: [],
    doctorId: '',
  });

  useEffect(() => {
    const loadDoctorInfo = async () => {
      try {
        let docId = doctorId;

        // If doctorId not provided, try to get current user
        if (!docId) {
          const user = auth!.currentUser;
          if (!user) return;
          docId = user.uid;
        }

        const doctorDoc = await getDoc(doc(db!, 'doctors', docId));
        if (!doctorDoc.exists()) return;
        const d = doctorDoc.data();

        // Determine PDF context: Is this patient coming from a clinic or doctor's own chamber?
        // Check the first patient's booking source; if any patient has clinicId, it's a clinic chamber
        const firstClinicPatient = patients.find(p => p.clinicId && p.bookingSource === 'clinic_qr');
        const chamberClinicId = firstClinicPatient?.clinicId || d.clinicId;

        // Check if the current chamber belongs to a clinic
        const currentChamber = d.chambers?.find((c: any) => c.chamberName === chamberName);
        const chamberOwnerClinicId = currentChamber?.clinicId || chamberClinicId;
        const isClinicChamber = !!chamberOwnerClinicId;

        let clinicInfo: any = null;
        let allDoctors: any[] = [];

        if (isClinicChamber && chamberOwnerClinicId) {
          try {
            // Load clinic data for header/footer/QR
            const clinicDoc = await getDoc(doc(db!, 'clinics', chamberOwnerClinicId));
            if (clinicDoc.exists()) {
              const cd = clinicDoc.data();
              clinicInfo = {
                name: cd.name || cd.clinicName || '',
                address: cd.address || '',
                qrNumber: cd.qrNumber || '',
                phone: cd.phone || '',
                clinicId: chamberOwnerClinicId,
                registrationNumber: cd.registrationNumber || '',
                showRegistrationOnRx: cd.showRegistrationOnRx !== undefined ? cd.showRegistrationOnRx : true,
                footerLine1: cd.footerLine1 || '',
                footerLine2: cd.footerLine2 || '',
                watermarkLogo: cd.watermarkLogo || '',
                mainClinicName: '', // Will be set below if this is a branch
              };

              // Check if this chamber belongs to a branch — if so, use branch name/address as header
              const chamberLocId = currentChamber?.clinicLocationId || '';
              const clinicLocations = cd.locations || [];
              const mainBranchId = clinicLocations.length > 0 ? clinicLocations[0].id : '001';

              if (chamberLocId && chamberLocId !== '001' && chamberLocId !== mainBranchId && clinicLocations.length > 1) {
                // This is a branch chamber — find branch info
                const branchLoc = clinicLocations.find((l: any) => l.id === chamberLocId);
                if (branchLoc) {
                  clinicInfo.mainClinicName = cd.name || cd.clinicName || ''; // Store main clinic name
                  clinicInfo.name = branchLoc.name || clinicInfo.name; // Use branch name as header
                  clinicInfo.address = branchLoc.landmark || branchLoc.address || clinicInfo.address;
                }
              }

              // Load all linked doctors for footer
              const linkedDoctors = cd.linkedDoctorsDetails || [];
              for (const ld of linkedDoctors) {
                // Include all doctors (active, pending, etc.) for the footer
                  // Find this doctor's chamber timing at this clinic
                  let docTiming = '';
                  let docRegNumber = '';
                  try {
                    const ldDoc = await getDoc(doc(db!, 'doctors', ld.uid || ld.doctorId));
                    if (ldDoc.exists()) {
                      const ldData = ldDoc.data();
                      const ldChamber = ldData.chambers?.find((c: any) =>
                        c.clinicId === chamberOwnerClinicId
                      );
                      docTiming = ldChamber ? `${ldChamber.startTime} - ${ldChamber.endTime}` : '';
                      docRegNumber = ldData.registrationNumber || '';
                    }
                  } catch { /* skip */ }
                  allDoctors.push({
                    name: ld.name || '',
                    specialty: ld.specialties?.[0] || ld.specialty || '',
                    timing: docTiming,
                    registrationNumber: docRegNumber,
                  });
              }
            }
          } catch (e) {
            console.error('Failed to load clinic info:', e);
          }
        }

        // For doctor's own chambers: gather all chambers for footer
        let allChambers: any[] = [];
        if (!isClinicChamber && d.chambers) {
          allChambers = d.chambers.map((c: any) => ({
            name: c.chamberName || '',
            address: c.chamberAddress || '',
            timing: `${c.startTime} - ${c.endTime}`,
          }));
        }

        // Registration number: use clinic-override if set, else use doctor's own
        const regNumber = d.registrationNumber || '';
        const showRegOnRX = d.showRegistrationOnRX !== false;

        setDoctorInfo({
          id: docId,
          name: d.name || 'Doctor',
          degree: d.degree || d.degrees?.[0] || '',
          degrees: d.degrees || (d.degree ? [d.degree] : []),
          specialty: d.specialty || d.specialties?.[0] || d.specialities?.[0] || '',
          specialties: d.specialties || d.specialities || (d.specialty ? [d.specialty] : []),
          specialities: d.specialties || d.specialities || (d.specialty ? [d.specialty] : []),
          qrNumber: d.qrNumber || '',
          clinicName: isClinicChamber ? (clinicInfo?.name || chamberName || '') : (chamberName || d.clinicName || ''),
          doctorId: docId,
          address: isClinicChamber ? (clinicInfo?.address || chamberAddress || '') : (chamberAddress || d.address || ''),
          timing: scheduleTime || d.timing || '',
          registrationNumber: regNumber,
          showRegistrationOnRX: showRegOnRX,
          useDrPrefix: d.useDrPrefix !== false,
          pdfContext: isClinicChamber ? 'clinic' : 'doctor',
          clinicInfo: clinicInfo || undefined,
          allDoctors: allDoctors.length > 0 ? allDoctors : undefined,
          allChambers: allChambers.length > 0 ? allChambers : undefined,
          footerLine1: d.footerLine1 || '',
          footerLine2: d.footerLine2 || '',
          watermarkLogo: d.watermarkLogo || '',
        });
      } catch (error) {
        console.error('Failed to load doctor info:', error);
      }
    };
    loadDoctorInfo();
  }, [doctorId, chamberName, chamberAddress, scheduleTime, patients]);

  // Auto-check for unmarked patients: Send admin alert after chamber end time
  useEffect(() => {
    const checkUnmarkedPatients = async () => {
      const now = new Date();

      // Parse chamber end time (e.g., "17:00" from "15:00 - 17:00")
      const endTimeStr = scheduleTime.split(' - ')[1]; // Get "17:00"
      if (!endTimeStr) return;

      const [endHour, endMin] = endTimeStr.split(':').map(Number);
      const chamberEndTime = new Date();
      chamberEndTime.setHours(endHour, endMin, 0, 0);

      // Calculate time since chamber ended (in minutes)
      const timeSinceChamberEnd = (now.getTime() - chamberEndTime.getTime()) / (1000 * 60);

      // Skip if chamber hasn't ended yet
      if (timeSinceChamberEnd < 0) return;

      // Collect unmarked patients for alert
      const unmarkedPatients: Array<{ name: string; phone: string; appointmentTime: string; patientId: string }> = [];

      patients.forEach(async (patient) => {
        const state = patientStates[patient.id];

        // Skip if already marked seen or cancelled
        if (state.isMarkedSeen || state.isCancelled) return;

        // RULE 1: After 1 hour of chamber end time → Alert Doctor (Admin notification)
        if (timeSinceChamberEnd >= 60 && timeSinceChamberEnd < 1440) { // Between 1 hour and 24 hours
          unmarkedPatients.push({
            name: patient.name,
            phone: patient.phone,
            appointmentTime: patient.appointmentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            patientId: patient.id
          });
        }

        // RULE 2: After 23:59 (end of day) → Treat as "drop-out"
        const endOfDay = new Date(chamberEndTime);
        endOfDay.setHours(23, 59, 59, 999);

        if (now > endOfDay) {
          // Mark as dropout in Firestore
          try {
            const { db } = await import('../lib/firebase/config');
            const { doc, updateDoc } = await import('firebase/firestore');

            if (!db) return;

            await updateDoc(doc(db, bookingsCollection, patient.id), {
              status: 'dropout',
              dropoutReason: 'not_seen_by_midnight',
              dropoutMarkedAt: new Date(),
              isCancelled: true,
              cancellationType: 'DROP OUT'
            });
          } catch (error) {
            console.error('Failed to mark dropout:', error);
          }
        }
      });

      // Send admin alert if there are unmarked patients (only once per chamber session)
      if (unmarkedPatients.length > 0 && timeSinceChamberEnd >= 60 && timeSinceChamberEnd < 65) {
        try {
          const { sendAdminAlert } = await import('../services/notificationService');
          const doctorId = localStorage.getItem('userId') || localStorage.getItem('healqr_temp_doctor_id') || '';
          const doctorName = localStorage.getItem('healqr_user_name') || localStorage.getItem('healqr_temp_doctor_name') || 'Doctor';

          await sendAdminAlert({
            doctorId,
            doctorName,
            eventType: 'System Alert',
            severity: 'High',
            unmarkedPatients: unmarkedPatients.map(p => ({
              name: p.name,
              phone: p.phone,
              appointmentTime: p.appointmentTime
            })),
            chamberName,
            chamberEndTime: endTimeStr
          });
        } catch (error) {
          console.error('Failed to send admin alert:', error);
        }
      }
    };

    // Check every 5 minutes for unmarked patients
    const interval = setInterval(checkUnmarkedPatients, 5 * 60000);

    // Check immediately on mount
    checkUnmarkedPatients();

    return () => clearInterval(interval);
  }, [patients, patientStates, scheduleTime, chamberName]);



  // handleMarkedSeen replaced by multi-step flow: Eye → RX modal → Diet Chart → finalizeConsultation()

  // Auto-send video consultation link 30 minutes before appointment via FCM
  useEffect(() => {
    const checkAndSendVideoLinks = async () => {
      const now = new Date();

      for (const patient of patients) {
        const state = patientStates[patient.id];

        // Only for video consultation patients
        if (patient.consultationType !== 'video') continue;

        // Skip if link already sent via FCM or appointment cancelled
        if (state.vcLinkSentViaFCM || state.isCancelled) continue;

        // Calculate time until appointment
        const timeUntilAppointment = patient.appointmentTime.getTime() - now.getTime();
        const minutesUntilAppointment = timeUntilAppointment / (1000 * 60);

        // Auto-send link if within 30 minute window (and appointment hasn't passed)
        if (minutesUntilAppointment <= 30 && minutesUntilAppointment > -30) {
          // Mark as sent locally immediately to prevent duplicate sends
          setPatientStates(prev => ({
            ...prev,
            [patient.id]: {
              ...prev[patient.id],
              videoLinkSent: true,
              vcLinkSentViaFCM: true,
            }
          }));

          // Send VC link via FCM notification to patient
          try {
            const doctorName = localStorage.getItem('healqr_user_name') || localStorage.getItem('healqr_temp_doctor_name') || 'Doctor';
            const doctorId = localStorage.getItem('userId') || localStorage.getItem('healqr_temp_doctor_id') || '';


            await sendVideoCallLink({
              patientPhone: patient.phone,
              patientName: patient.name,
              doctorName: doctorName,
              bookingId: patient.bookingId,
              doctorId: doctorId,
              language: patient.language || 'english',
              appointmentDate: patient.appointmentTime.toLocaleDateString(),
              appointmentTime: patient.appointmentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            });

            // Update Firestore booking to track that link was sent
            try {
              const { db: fireDb } = await import('../lib/firebase/config');
              const { doc: docRef, updateDoc: updateBooking } = await import('firebase/firestore');
              if (fireDb) {
                await updateBooking(docRef(fireDb, bookingsCollection, patient.id), {
                  vcLinkSentAt: new Date(),
                  vcLinkSentBy: 'system_auto',
                });
              }
            } catch (e) {
              console.error('Failed to update booking with VC link status:', e);
            }

            toast.success(`📹 Video link sent to ${patient.name}`, { duration: 3000 });
          } catch (err) {
            console.error(`❌ Failed to send VC link to ${patient.name}:`, err);
            toast.error(`Failed to send video link to ${patient.name}`);
          }
        }
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkAndSendVideoLinks, 30000);

    // Check immediately on mount
    checkAndSendVideoLinks();

    return () => clearInterval(interval);
  }, [patients, patientStates]);

  // Real-time Firestore listener: Watch for patient joining VC room
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    const setupListeners = async () => {
      const { db: fireDb } = await import('../lib/firebase/config');
      const { doc: docRef, onSnapshot } = await import('firebase/firestore');
      if (!fireDb) return;

      patients.forEach(patient => {
        // Only for video consultation patients
        if (patient.consultationType !== 'video') return;

        const bookingRef = docRef(fireDb, bookingsCollection, patient.id);
        const unsub = onSnapshot(bookingRef, (snapshot) => {
          if (!snapshot.exists()) return;
          const data = snapshot.data();

          setPatientStates(prev => {
            const current = prev[patient.id];
            if (!current) return prev;

            const newState = { ...current };
            let changed = false;

            // Update patientWaiting when patient clicks the VC link
            if (data.vcPatientJoined && !current.patientWaiting) {
              newState.patientWaiting = true;
              changed = true;
            }

            // Update vcCompleted when doctor ends the call
            if (data.vcCompleted && !current.vcCompleted) {
              newState.vcCompleted = true;
              changed = true;
            }

            // Update videoLinkSent from Firestore
            if (data.vcLinkSentAt && !current.videoLinkSent) {
              newState.videoLinkSent = true;
              newState.vcLinkSentViaFCM = true;
              changed = true;
            }

            if (!changed) return prev;
            return { ...prev, [patient.id]: newState };
          });
        });

        unsubscribers.push(unsub);
      });
    };

    setupListeners();

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [patients]);

  // 30-minute timeout check: Notify if neither party joined after 30 mins
  useEffect(() => {
    const checkVCTimeouts = () => {
      const now = new Date();

      patients.forEach(patient => {
        const state = patientStates[patient.id];

        // Only for video consultation patients with link already sent
        if (patient.consultationType !== 'video') return;
        if (!state.videoLinkSent || state.vcCompleted || state.isCancelled) return;

        // Check if 30 minutes have passed since appointment time
        const timeSinceAppointment = (now.getTime() - patient.appointmentTime.getTime()) / (1000 * 60);

        if (timeSinceAppointment >= 30 && timeSinceAppointment < 35) {
          // Show timeout toast only once (within 5-min window)
          if (!state.patientWaiting) {
            toast.warning(`⏰ ${patient.name}'s video consultation time has expired (30 min). Patient did not join.`, {
              id: `vc-timeout-${patient.id}`,
              duration: 10000,
            });
          }
        }
      });
    };

    const interval = setInterval(checkVCTimeouts, 60000); // Check every minute
    checkVCTimeouts();

    return () => clearInterval(interval);
  }, [patients, patientStates]);

  const handleStartVideoConsultation = async (patient: Patient) => {
    try {
      // Update Firestore to indicate doctor joined the VC
      const { db: fireDb } = await import('../lib/firebase/config');
      const { doc: docRef, updateDoc: updateBooking } = await import('firebase/firestore');
      if (fireDb) {
        await updateBooking(docRef(fireDb, bookingsCollection, patient.id), {
          vcDoctorJoined: true,
          vcDoctorJoinedAt: new Date(),
        });
      }

      toast.info(`Starting video consultation with ${patient.name}...`);

      // Open video call page in a new window using query params matching the App routing
      const doctorName = localStorage.getItem('healqr_user_name') || 'Doctor';
      const vcParams = new URLSearchParams({
        page: 'video-call',
        bookingId: patient.bookingId || '',
        patientName: patient.name || '',
        doctorName: doctorName,
      });
      const vcWindow = window.open(`/?${vcParams.toString()}`, '_blank', 'width=1024,height=768');

      // Poll to detect when VC window is closed → mark VC as completed
      if (vcWindow) {
        const pollInterval = setInterval(async () => {
          if (vcWindow.closed) {
            clearInterval(pollInterval);

            // Mark VC as completed in Firestore
            try {
              if (fireDb) {
                await updateBooking(docRef(fireDb, bookingsCollection, patient.id), {
                  vcCompleted: true,
                  vcCompletedAt: new Date(),
                  vcDuration: null, // Will be calculated from join/end times
                });
              }
            } catch (e) {
              console.error('Failed to mark VC completed:', e);
            }

            // Update local state
            setPatientStates(prev => ({
              ...prev,
              [patient.id]: {
                ...prev[patient.id],
                vcCompleted: true,
              }
            }));

            toast.success(`✅ Video consultation with ${patient.name} completed. Tap the Eye button to proceed.`, {
              duration: 8000,
            });
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to start video consultation:', err);
      toast.error('Failed to start video consultation');
    }
  };

  const handleFollowUp = (patientId: string) => {
    const state = patientStates[patientId];
    if (!state.isMarkedSeen || state.isCancelled) return;

    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      setSelectedPatient(patient);
      setFollowUpModalOpen(true);
    }
  };

  const handleSaveFollowUp = async (days: number, message: string) => {
    if (selectedPatient && db) {
      try {
        // Get doctor info from localStorage
        const doctorName = localStorage.getItem('healqr_user_name') || localStorage.getItem('healqr_temp_doctor_name') || localStorage.getItem('doctorName') || 'Doctor';
        const doctorId = localStorage.getItem('userId') || localStorage.getItem('healqr_temp_doctor_id') || '';
        const doctorSpecialty = localStorage.getItem('healqr_specialty') || '';
        const doctorPhoto = localStorage.getItem('healqr_profile_photo') || '';

        // Calculate follow-up date (when patient should come)
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + days);

        // Calculate notification date (3 days before follow-up date)
        const notificationDate = new Date(followUpDate);
        notificationDate.setDate(notificationDate.getDate() - 3);

        // Update Firestore with follow-up schedule (use patient.id which is the Firestore doc ID)
        const bookingRef = doc(db, bookingsCollection, selectedPatient.id);
        await updateDoc(bookingRef, {
          followUpScheduled: true,
          followUpScheduledDate: followUpDate,
          doctorFollowUpMessage: message,
          followUpScheduledAt: new Date()
        });

        // Store scheduled follow-up in Firestore (for Cloud Scheduler to process)
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');

        await addDoc(collection(db, 'scheduledFollowUps'), {
          patientPhone: selectedPatient.phone,
          patientName: selectedPatient.name,
          doctorId: doctorId,
          doctorName: doctorName,
          doctorPhoto: doctorPhoto || null,
          doctorSpecialty: doctorSpecialty || null,
          followUpDate: followUpDate.toISOString().split('T')[0],
          notificationDate: notificationDate.toISOString().split('T')[0],
          scheduledDays: days,
          doctorMessage: message,
          status: 'pending', // pending, sent, failed
          createdAt: serverTimestamp(),
        });

        // ============================================
        // 🔔 SEND FOLLOW-UP NOTIFICATION IMMEDIATELY
        // Per roadmap: Follow-up commitment is PERMANENT
        // Notification will be delivered even if subscription expires
        // ============================================
        try {
          const { sendFollowUp } = await import('../services/notificationService');

          await sendFollowUp({
            patientPhone: selectedPatient.phone,
            patientName: selectedPatient.name,
            age: selectedPatient.age,
            sex: selectedPatient.gender,
            purpose: selectedPatient.visitType,
            chamber: chamberName,
            clinicName: chamberName,
            doctorId: doctorId,
            doctorName: doctorName,
            doctorPhoto: doctorPhoto || undefined,
            doctorSpecialty: doctorSpecialty || undefined,
            followUpDate: followUpDate.toISOString(),
            followUpDays: days,
            followUpReason: message || `Your follow-up visit is scheduled for ${days} days from today`,
            bookingId: selectedPatient.id, // Always use Firestore doc ID for consistency
            customMessage: message,
            language: selectedPatient.language || 'english', // Pass patient's chosen language
          });
        } catch (notifError) {
          // Follow-up notification error (non-blocking)
        }

        // Update local state to show green checkmark
        setPatientStates((prev: any) => ({
          ...prev,
          [selectedPatient.id]: {
            ...prev[selectedPatient.id],
            followUpScheduled: true,
          }
        }));

        // Success toast
        const notifyDateStr = notificationDate.toLocaleDateString();
        const followUpDateStr = followUpDate.toLocaleDateString();
        toast.success(`✅ Follow-up scheduled for ${followUpDateStr}`, {
          description: `Patient will receive notification on ${notifyDateStr} (3 days before) advising them to book within ±2 days.`
        });
      } catch (error) {
        console.error('❌ Error scheduling follow-up:', error);
        toast.error('Failed to schedule follow-up', {
          description: 'Please try again or contact support.'
        });
      }
    }
  };



  const handleNormalUploadPrescription = (patient: Patient) => {
    setSelectedPatient(patient);
    setUploadModalOpen(true);
  };

  const handleUploadSuccess = () => {
    if (selectedPatient) {
      setPatientStates(prev => ({
        ...prev,
        [selectedPatient.id]: {
          ...prev[selectedPatient.id],
          prescriptionUploaded: true,
        }
      }));
      toast.success(`Prescription uploaded for ${selectedPatient.name}`, {
        description: 'Patient notified with download link',
      });
    }
    setUploadModalOpen(false);
    setSelectedPatient(null);
  };

  const handleCreateDietChart = (patient: Patient) => {
    try {
      // Pre-fill data for AI Diet Chart
      const prefilledData = {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        phone: patient.phone
      };

      localStorage.setItem('prefilled_diet_patient', JSON.stringify(prefilledData));

      // Redirect to AI Diet Chart tab
      if (onMenuChange) {
        onMenuChange('ai-diet-chart');
      } else {
        // Fallback for standalone usage if any
        window.location.hash = '#ai-diet-chart';
      }

      toast.success(`Redirecting to AI Diet Chart for ${patient.name}`);
    } catch (error) {
      console.error('Error initiating diet chart:', error);
      toast.error('Failed to initiate diet chart');
    }
  };

  // ============================================
  // 🔄 MULTI-STEP CONSULTATION COMPLETION FLOW
  // ============================================

  // Step 1: User clicked Eye → "Create Digital RX?" modal shown
  // "Yes, Create RX" → Opens DigitalRXMaker
  const handleStartRxFlow = () => {
    setRxConfirmModalOpen(false);
    setRxMakerOpen(true);
  };

  // "No, Just Mark as Seen" → Skip RX, go straight to mark seen + send notification
  const handleSkipRxAndMarkSeen = async () => {
    setRxConfirmModalOpen(false);
    if (selectedPatientForFlow) {
      await finalizeConsultation(selectedPatientForFlow.id, null, null);
    }
  };

  // ============================================
  // ✅ ASSISTANT MARK/UNMARK SEEN (Checkbox flow)
  // ============================================
  const handleAssistantConfirmSeen = async () => {
    setAssistantSeenModalOpen(false);
    if (!assistantSeenPatient) return;
    await finalizeConsultation(assistantSeenPatient.id, null, null);
    setAssistantSeenPatient(null);
  };

  // Step 2: RX Maker callbacks
  const handleRxPause = (savedState: { items: any[]; remarks: string; diagnosis: string; vitals: Record<string,string>; pathology: Record<string,string>; suggestedTests: string[] }) => {
    setRxPausedState(savedState);
    setRxMakerOpen(false);
    toast.info('Prescription paused - You can resume anytime', {
      description: 'Click the eye button again to resume',
    });
  };

  const handleRxGenerated = (downloadURL: string, rxData?: { items: any[], remarks: string, diagnosis: string, vitals: Record<string,string>, pathology: Record<string,string>, suggestedTests: string[] }) => {
    // Save RX data for potential regen later
    if (rxData) setLastRxData(rxData);

    if (isRegenMode) {
      // Regen mode — update Firestore directly, no diet chart flow
      handleRxRegenerated(downloadURL, rxData);
      return;
    }
    setGeneratedRxUrl(downloadURL);
    setRxMakerOpen(false);
    // After RX generated → Ask "Add AI Diet Chart?"
    setDietConfirmModalOpen(true);
  };

  const handleRxClose = () => {
    setRxMakerOpen(false);
    setIsRegenMode(false);
    // If user closes RX maker without generating, show diet confirm anyway? No, just cancel.
    // They can press the eye button again.
  };

  // ============================================
  // 📋 RX REGEN FLOW (after initial Digital RX)
  // ============================================
  const handleRxRegenStart = async (patient: Patient) => {
    setSelectedPatientForFlow(patient);
    setIsRegenMode(true);

    // Try to load last RX data from Firestore for this patient
    try {
      const { doc: docRef, getDoc: firestoreGetDoc } = await import('firebase/firestore');
      const { db: fireDb } = await import('../lib/firebase/config');
      const bookingDoc = await firestoreGetDoc(docRef(fireDb!, bookingsCollection, patient.id));
      if (bookingDoc.exists()) {
        const data = bookingDoc.data();
        if (data.rxLastData) {
          setRxPausedState(data.rxLastData);
          toast.info('Loaded previous prescription data for editing');
        } else if (lastRxData) {
          setRxPausedState(lastRxData);
          toast.info('Loaded last prescription data for editing');
        } else {
          setRxPausedState(null);
        }
      }
    } catch (e) {
      console.error('Failed to load last RX data:', e);
      // Fallback to local state if available
      if (lastRxData) {
        setRxPausedState(lastRxData);
      } else {
        setRxPausedState(null);
      }
    }

    setRxMakerOpen(true);
  };

  const handleRxRegenerated = async (downloadURL: string, rxData?: any) => {
    setRxMakerOpen(false);
    setIsRegenMode(false);
    if (!selectedPatientForFlow) return;

    try {
      toast.loading('Updating Digital RX...', { id: 'rx-regen' });
      const { doc: docRef, updateDoc: updateBooking } = await import('firebase/firestore');
      const { db: fireDb } = await import('../lib/firebase/config');
      const bookingRef = docRef(fireDb!, bookingsCollection, selectedPatientForFlow.id);
      await updateBooking(bookingRef, {
        digitalRxUrl: downloadURL,
        ...(rxData ? { rxLastData: rxData } : {}),
      });

      // Update local state
      setPatientStates((prev: any) => ({
        ...prev,
        [selectedPatientForFlow!.id]: {
          ...prev[selectedPatientForFlow!.id],
          digitalRxUsed: true,
        }
      }));

      // Send UPDATED RX notification (distinct from original consultation completed)
      // Skip notification for manual_override walk-ins (no patient FCM token / unverified)
      const isManualOverrideWalkin = selectedPatientForFlow.isWalkIn && selectedPatientForFlow.verificationMethod === 'manual_override';
      if (!isManualOverrideWalkin) {
        try {
          const { sendRxUpdatedNotification } = await import('../services/notificationService');
          const doctorName = localStorage.getItem('healqr_user_name') || localStorage.getItem('doctorName') || 'Doctor';
          await sendRxUpdatedNotification({
            patientPhone: selectedPatientForFlow.phone,
            patientName: selectedPatientForFlow.name,
            age: selectedPatientForFlow.age,
            sex: selectedPatientForFlow.gender,
            purpose: selectedPatientForFlow.visitType,
            doctorId: doctorInfo.id,
            doctorName: doctorName,
            clinicName: selectedPatientForFlow.chamber || 'Chamber',
            bookingId: selectedPatientForFlow.bookingId,
            consultationDate: new Date().toISOString().split('T')[0],
            consultationTime: new Date().toTimeString().split(' ')[0].slice(0, 5),
            chamber: selectedPatientForFlow.chamber || 'Chamber',
            language: selectedPatientForFlow.language || 'english',
            rxUrl: downloadURL,
          });
        } catch (notifErr) {
          console.error('RX regen notification error:', notifErr);
        }
      }

      toast.success(
        isManualOverrideWalkin
          ? 'Digital RX created — ready for printing!'
          : 'Digital RX regenerated & sent to patient!',
        { id: 'rx-regen' }
      );

      // Show regen success modal with WhatsApp option (for non-walkin patients)
      if (!isManualOverrideWalkin) {
        setRegenRxUrl(downloadURL);
        setRegenSuccessModalOpen(true);
      }
    } catch (err) {
      console.error('RX regen update error:', err);
      toast.error('Failed to update RX', { id: 'rx-regen' });
    }
  };

  // Step 3: Diet Chart confirm modal callbacks
  const handleStartDietFlow = () => {
    setDietConfirmModalOpen(false);
    setDietChartModalOpen(true);
  };

  const handleSkipDietAndSend = async (shareViaWhatsapp: boolean = false) => {
    setDietConfirmModalOpen(false);
    if (selectedPatientForFlow) {
      await finalizeConsultation(selectedPatientForFlow.id, generatedRxUrl, null, shareViaWhatsapp);
    }
  };

  // Step 4: Diet Chart generated callback
  const handleDietGenerated = async (dietUrl: string, shareViaWhatsapp: boolean = false) => {
    setDietChartModalOpen(false);
    if (selectedPatientForFlow) {
      await finalizeConsultation(selectedPatientForFlow.id, generatedRxUrl, dietUrl, shareViaWhatsapp);
    }
  };

  // ============================================
  // 🏁 FINALIZE: Mark as seen + Send notification with RX & Diet URLs
  // ============================================
  const finalizeConsultation = async (patientId: string, rxUrl: string | null, dietUrl: string | null, shareViaWhatsapp: boolean = false) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    // Open WhatsApp window IMMEDIATELY (in user-gesture context) to avoid popup blocker
    let whatsappWindow: Window | null = null;
    if (shareViaWhatsapp) {
      whatsappWindow = window.open('about:blank', '_blank');
    }

    setIsSendingNotification(true);

    try {
      toast.loading('Completing consultation...', { id: 'mark-seen' });

      const isAssistant = localStorage.getItem('healqr_is_assistant') === 'true';
      const isTempDoctor = localStorage.getItem('healqr_is_temp_doctor') === 'true';
      const userId = localStorage.getItem('userId') || localStorage.getItem('healqr_temp_doctor_id');
      const doctorName = localStorage.getItem('healqr_user_name') || localStorage.getItem('healqr_temp_doctor_name') || localStorage.getItem('doctorName') || 'Doctor';
      const markedBy = isAssistant ? localStorage.getItem('healqr_user_email') : (isTempDoctor ? `temp_${userId}` : userId);

      if (!userId) throw new Error('User ID not found');

      // ============================================
      // 🔍 CHECK FCM TOKEN
      // ============================================
      const { doc: firestoreDoc, getDoc: firestoreGetDoc } = await import('firebase/firestore');
      const { db: fireDb } = await import('../lib/firebase/config');

      const digits = (patient.phone || '').replace(/\D/g, '');
      const trimmed = digits.replace(/^91/, '');
      const phone10 = trimmed.slice(-10);

      let fcmUserId = `patient_${phone10}`;
      let tokenDoc = await firestoreGetDoc(firestoreDoc(fireDb!, 'fcmTokens', fcmUserId));

      if (!tokenDoc.exists()) {
        const fallbackId = `patient_+91${phone10}`;
        const fallbackDoc = await firestoreGetDoc(firestoreDoc(fireDb!, 'fcmTokens', fallbackId));
        if (fallbackDoc.exists()) {
          fcmUserId = fallbackId;
          tokenDoc = fallbackDoc;
        }
      }

      if (!tokenDoc.exists()) {
        const legacyDoc = await firestoreGetDoc(firestoreDoc(fireDb!, 'patientFCMTokens', phone10));
        if (legacyDoc.exists()) {
          const legacyData = legacyDoc.data();
          if (legacyData?.token) {
            await import('firebase/firestore').then(({ setDoc, doc }) => {
              setDoc(doc(fireDb!, 'fcmTokens', `patient_${phone10}`), {
                userId: `patient_${phone10}`,
                token: legacyData.token,
                userType: 'patient',
                migratedFrom: 'patientFCMTokens',
                updatedAt: new Date()
              }, { merge: true });
            });
            fcmUserId = `patient_${phone10}`;
            tokenDoc = await firestoreGetDoc(firestoreDoc(fireDb!, 'fcmTokens', fcmUserId));
          }
        }
      }

      if (!tokenDoc.exists()) {
        toast.error('⚠️ Patient has not enabled notifications.', {
          id: 'mark-seen',
          duration: 5000,
          description: 'They need to enable notifications when booking to receive updates.'
        });
      } else {
        const tokenData = tokenDoc.data();
        const updatedAt = tokenData?.updatedAt?.toDate();
        if (updatedAt) {
          const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceUpdate > 60) {
            toast.warning('⚠️ Patient notification may fail - their token is outdated.', {
              id: 'mark-seen',
              duration: 5000,
            });
          }
        }
      }

      // ============================================
      // 📝 UPDATE FIRESTORE BOOKING
      // ============================================
      const { doc: docRef, updateDoc: updateBooking } = await import('firebase/firestore');
      const seenTimestamp = new Date();
      const bookingRef = docRef(fireDb!, bookingsCollection, patient.id);

      await updateBooking(bookingRef, {
        isMarkedSeen: true,
        markedSeenAt: seenTimestamp,
        markedSeenBy: markedBy,
        markedByRole: isAssistant ? 'assistant' : 'doctor',
        reviewScheduled: true,
        reviewScheduledAt: seenTimestamp,
        consultationStatus: 'completed',
        isCompleted: true,
        referrerSeen: true,
        inChamber: false,
        ...(rxUrl ? { digitalRxUrl: rxUrl } : {}),
        ...(dietUrl ? { dietChartUrl: dietUrl } : {}),
        ...(rxUrl && lastRxData ? { rxLastData: lastRxData } : {}),
      });

      // ============================================
      // 📋 UPDATE REFERRER HISTORY (if referred patient)
      // ============================================
      try {
        const { getDoc: getBookingDoc } = await import('firebase/firestore');
        const bookingSnap = await getBookingDoc(bookingRef);
        const bookingData = bookingSnap.data();
        if (bookingData?.referrerId) {
          const { collection: colRef, query: qRef, where: whereRef, getDocs: getDocsRef, updateDoc: updateRefDoc } = await import('firebase/firestore');
          // Find the referral history record and update status to 'seen'
          const historyRef = colRef(fireDb!, 'referrers', bookingData.referrerId, 'referralHistory');
          const histQ = qRef(historyRef, whereRef('bookingId', '==', patient.id));
          const histSnap = await getDocsRef(histQ);
          if (!histSnap.empty) {
            const histDoc = histSnap.docs[0];
            await updateRefDoc(docRef(fireDb!, 'referrers', bookingData.referrerId, 'referralHistory', histDoc.id), {
              status: 'seen',
              seenAt: seenTimestamp,
            });
          } else {
            // Try matching by structured bookingId field
            const histQ2 = qRef(historyRef, whereRef('bookingId', '==', patient.bookingId));
            const histSnap2 = await getDocsRef(histQ2);
            if (!histSnap2.empty) {
              await updateRefDoc(docRef(fireDb!, 'referrers', bookingData.referrerId, 'referralHistory', histSnap2.docs[0].id), {
                status: 'seen',
                seenAt: seenTimestamp,
              });
            }
          }
        }
      } catch (refTrackErr) {
        console.error('Error updating referrer history:', refTrackErr);
      }

      // Update local state
      setPatientStates((prev: any) => ({
        ...prev,
        [patientId]: {
          ...prev[patientId],
          isMarkedSeen: true,
          reviewScheduled: true,
          digitalRxUsed: !!rxUrl || prev[patientId]?.digitalRxUsed,
          dietChartUsed: !!dietUrl || prev[patientId]?.dietChartUsed,
        }
      }));

      // ============================================
      // 🔔 SEND NOTIFICATION WITH RX & DIET URLs
      // ============================================
      try {
        const { sendConsultationCompleted, scheduleReviewRequest } = await import('../services/notificationService');

        const now = new Date();
        const result = await sendConsultationCompleted({
          patientPhone: patient.phone,
          patientName: patient.name,
          age: patient.age,
          sex: patient.gender,
          purpose: patient.visitType,
          doctorId: doctorInfo.id,
          doctorName: doctorName,
          clinicName: patient.chamber,
          bookingId: patient.bookingId,
          consultationDate: new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0],
          consultationTime: now.toTimeString().split(' ')[0].slice(0, 5),
          chamber: patient.chamber || 'Chamber',
          language: patient.language || 'english',
          ...(rxUrl ? { rxUrl } : {}),
          ...(dietUrl ? { dietUrl } : {}),
        });

        if (result?.success) {
          const extras = [];
          if (rxUrl) extras.push('Digital RX');
          if (dietUrl) extras.push('Diet Chart');
          const extraText = extras.length > 0 ? ` with ${extras.join(' + ')}` : '';
          toast.success(`Patient notified via App${extraText}`);
        }

        if (!isReviewRestricted) {
          await scheduleReviewRequest(
            {
              patientPhone: patient.phone,
              patientName: patient.name,
              doctorName: doctorName,
              doctorId: userId,
              bookingId: patient.id,
              consultationDate: new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              language: patient.language || 'english',
            },
            seenTimestamp
          );
        }
      } catch (notifError) {
        toast.error('Failed to notify patient');
      }

      const extras = [];
      if (rxUrl) extras.push('RX');
      if (dietUrl) extras.push('Diet Chart');
      const descText = extras.length > 0 ? `Sent with ${extras.join(' + ')} download link` : 'Consultation completed notification sent';

      toast.success('Patient marked as seen', {
        id: 'mark-seen',
        description: descText,
      });
      if (shareViaWhatsapp && whatsappWindow) {
        const textParts = [];
        textParts.push(`📋 *Consultation Documents*`);
        textParts.push(`Patient: ${patient.name}`);
        textParts.push(`Dr. ${doctorName}`);
        if (patient.chamber) textParts.push(`Clinic: ${patient.chamber}`);
        textParts.push('');
        if (rxUrl) textParts.push(`🏥 *Digital Prescription:*\n${rxUrl}`);
        if (dietUrl) textParts.push(`🍏 *AI Diet Chart:*\n${dietUrl}`);

        const text = textParts.join('\n');
        const phoneNumber = patient.phone ? patient.phone.replace(/\D/g, '') : '';
        const url = phoneNumber
          ? `https://wa.me/${phoneNumber.startsWith('91') ? phoneNumber : '91' + phoneNumber}?text=${encodeURIComponent(text)}`
          : `https://wa.me/?text=${encodeURIComponent(text)}`;
        whatsappWindow.location.href = url;
      } else if (shareViaWhatsapp && !whatsappWindow) {
        // Fallback if popup was blocked — show toast with WhatsApp link
        const textParts = [];
        textParts.push(`📋 *Consultation Documents*`);
        textParts.push(`Patient: ${patient.name}`);
        textParts.push(`Dr. ${doctorName}`);
        if (patient.chamber) textParts.push(`Clinic: ${patient.chamber}`);
        textParts.push('');
        if (rxUrl) textParts.push(`🏥 *Digital Prescription:*\n${rxUrl}`);
        if (dietUrl) textParts.push(`🍏 *AI Diet Chart:*\n${dietUrl}`);

        const text = textParts.join('\n');
        const phoneNumber = patient.phone ? patient.phone.replace(/\\D/g, '') : '';
        const waUrl = phoneNumber
          ? `https://wa.me/${phoneNumber.startsWith('91') ? phoneNumber : '91' + phoneNumber}?text=${encodeURIComponent(text)}`
          : `https://wa.me/?text=${encodeURIComponent(text)}`;
        toast.info('Tap to open WhatsApp', {
          duration: 15000,
          action: {
            label: '📱 Open WhatsApp',
            onClick: () => window.open(waUrl, '_blank'),
          },
        });
      }

    } catch (error) {
      console.error('❌ Error finalizing consultation:', error);
      toast.error('Failed to mark patient as seen', {
        id: 'mark-seen',
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsSendingNotification(false);
      setSelectedPatientForFlow(null);
      setGeneratedRxUrl(null);
      setRxPausedState(null);
    }
  };



  const handleCancelConfirm = async () => {
    if (!selectedPatientId) {
      console.error('❌ No patient selected for cancellation');
      return;
    }

    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) {
      console.error('❌ Patient not found:', selectedPatientId);
      toast.error('Patient not found');
      return;
    }

    try {
      // Update local state
      setPatientStates(prev => ({
        ...prev,
        [selectedPatientId]: {
          ...prev[selectedPatientId],
          isCancelled: true,
        }
      }));

      // Update Firebase
      const { db } = await import('../lib/firebase/config');
      const { doc, updateDoc } = await import('firebase/firestore');

      if (!db) {
        throw new Error('Firebase not initialized');
      }

      // Use patient.id which is the Firestore document ID
      await updateDoc(doc(db!, bookingsCollection, patient.id), {
        isCancelled: true,
        status: 'cancelled',
        cancellationType: 'PATIENT INDIVIDUAL TOGGLE',
        cancelledBy: 'doctor'
      });

      // Update referrer history if referred patient
      try {
        const { getDoc: gDoc, collection: cRef, query: qRef, where: wRef, getDocs: gDocs } = await import('firebase/firestore');
        const bookSnap = await gDoc(doc(db!, bookingsCollection, patient.id));
        const bData = bookSnap.data();
        if (bData?.referrerId) {
          const histRef = cRef(db!, 'referrers', bData.referrerId, 'referralHistory');
          const histQ = qRef(histRef, wRef('bookingId', '==', patient.id));
          const histSnap = await gDocs(histQ);
          if (!histSnap.empty) {
            await updateDoc(doc(db!, 'referrers', bData.referrerId, 'referralHistory', histSnap.docs[0].id), {
              status: 'cancelled',
              cancelledAt: new Date(),
            });
          } else {
            // Try structured bookingId
            const histQ2 = qRef(histRef, wRef('bookingId', '==', patient.bookingId));
            const histSnap2 = await gDocs(histQ2);
            if (!histSnap2.empty) {
              await updateDoc(doc(db!, 'referrers', bData.referrerId, 'referralHistory', histSnap2.docs[0].id), {
                status: 'cancelled',
                cancelledAt: new Date(),
              });
            }
          }
        }
      } catch (refErr) { console.error('Error updating referrer history on cancel:', refErr); }

      // ============================================
      // 🔔 SEND CANCELLATION NOTIFICATION
      // ============================================
      try {
        const doctorName = localStorage.getItem('healqr_user_name') || 'Doctor';

        // Format appointment date - Use today's date as scheduleDate is schedule text like "Every Day" not a date
        const appointmentDate = new Date();

        // Format appointment time
        const formattedTime = patient.appointmentTime ? patient.appointmentTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : scheduleTime.split(' - ')[0] || '10:00 AM'; // Get start time from schedule

        const cancelledDate = new Date(appointmentDate.getTime() - appointmentDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]; // YYYY-MM-DD

        await sendAppointmentCancelled({
          patientPhone: patient.phone,
          patientName: patient.name,
          age: patient.age,
          sex: patient.gender,
          purpose: patient.visitType,
          doctorId: doctorInfo.id,
          doctorName,
          clinicName: (patient as any).chamber || 'Chamber',
          chamberAddress: '',
          bookingId: patient.bookingId, // Use structured booking ID from database
          appointmentDate: cancelledDate,
          appointmentTime: formattedTime,
          chamber: (patient as any).chamber || 'Chamber',
          tokenNumber: (patient as any).serialNumber || (patient as any).tokenNumber || '#1',
          message: 'Your appointment has been cancelled by the doctor. Please contact the clinic for rescheduling.',
          language: (patient as any).language || 'english',
        });


      } catch (notifError) {
        console.error('❌ Failed to send cancellation notification:', notifError);
        toast.error('Booking cancelled but notification failed to send');
      }

      toast.success(`Appointment cancelled for ${patient.name}`, {
        description: 'Patient has been notified - Slot is now available',
      });

      // Refresh patient list
      if (onRefresh) {
        onRefresh();
      }

      // Close modal
      setCancelModalOpen(false);
      setSelectedPatientId(null);
    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  const handleRestoreConfirm = async () => {
    if (!selectedPatientId) {
      console.error('❌ No patient selected for restoration');
      return;
    }

    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) {
      console.error('❌ Patient not found:', selectedPatientId);
      toast.error('Patient not found');
      return;
    }

    try {
      // Update local state
      setPatientStates(prev => ({
        ...prev,
        [selectedPatientId]: {
          ...prev[selectedPatientId],
          isCancelled: false,
        }
      }));

      // Update Firebase
      const { db } = await import('../lib/firebase/config');
      const { doc, updateDoc } = await import('firebase/firestore');

      if (!db) {
        throw new Error('Firebase not initialized');
      }

      // Use patient.id which is the Firestore document ID
      await updateDoc(doc(db!, bookingsCollection, patient.id), {
        isCancelled: false,
        status: 'confirmed',
        restoredAt: new Date(),
      });

      // Update referrer history if referred patient
      try {
        const { getDoc: gDoc, collection: cRef, query: qRef, where: wRef, getDocs: gDocs } = await import('firebase/firestore');
        const bookSnap = await gDoc(doc(db!, bookingsCollection, patient.id));
        const bData = bookSnap.data();
        if (bData?.referrerId) {
          const histRef = cRef(db!, 'referrers', bData.referrerId, 'referralHistory');
          const histQ = qRef(histRef, wRef('bookingId', '==', patient.id));
          const histSnap = await gDocs(histQ);
          if (!histSnap.empty) {
            await updateDoc(doc(db!, 'referrers', bData.referrerId, 'referralHistory', histSnap.docs[0].id), {
              status: 'booked',
              cancelledAt: null,
              seenAt: null,
            });
          } else {
            // Try structured bookingId
            const histQ2 = qRef(histRef, wRef('bookingId', '==', patient.bookingId));
            const histSnap2 = await gDocs(histQ2);
            if (!histSnap2.empty) {
              await updateDoc(doc(db!, 'referrers', bData.referrerId, 'referralHistory', histSnap2.docs[0].id), {
                status: 'booked',
                cancelledAt: null,
                seenAt: null,
              });
            }
          }
        }
      } catch (refErr) { console.error('Error updating referrer history on restore:', refErr); }

      // ============================================
      // 🔔 SEND RESTORATION NOTIFICATION
      // ============================================
      try {
        const doctorName = localStorage.getItem('healqr_user_name') || 'Doctor';

        // Format appointment date - Use today's date as scheduleDate is schedule text like "Every Day" not a date
        const appointmentDate = new Date();

        // Format appointment time
        const formattedTime = patient.appointmentTime ? patient.appointmentTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : scheduleTime.split(' - ')[0] || '10:00 AM'; // Get start time from schedule

        // Get doctor initials

        // 🎯 USE THE ORIGINAL TOKEN NUMBER FROM DATABASE
        // Don't recalculate - the token number was assigned at booking time and should remain the same
        // Fallback chain: tokenNumber -> serialNo -> list position (instead of hardcoded #1)
        const patientIndex = patients.findIndex(p => p.id === patient.id);
        const originalTokenNumber = (patient as any).tokenNumber || `#${(patient as any).serialNo || patientIndex + 1}`;
        const restoredDate = new Date(appointmentDate.getTime() - appointmentDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]; // YYYY-MM-DD

        // Use the ORIGINAL token number assigned at booking time
        await sendAppointmentRestored({
          patientPhone: patient.phone,
          patientName: patient.name,
          age: patient.age,
          sex: patient.gender,
          purpose: patient.visitType,
          doctorId: doctorInfo.id,
          doctorName,
          clinicName: (patient as any).chamber || 'Chamber',
          chamberAddress: '',
          bookingId: patient.bookingId, // Use structured booking ID from database
          appointmentDate: restoredDate,
          appointmentTime: formattedTime,
          chamber: (patient as any).chamber || 'Chamber',
          tokenNumber: originalTokenNumber,
          message: 'Your appointment has been restored and confirmed. You can track it live.',
          language: (patient as any).language || 'english',
        });


      } catch (notifError) {
        console.error('❌ Failed to send restoration notification:', notifError);
        toast.error('Booking restored but notification failed to send');
      }

      toast.success(`Appointment restored for ${patient.name}`, {
        description: 'All buttons are now active - Patient has been notified',
      });

      // Refresh patient list
      if (onRefresh) {
        onRefresh();
      }

      // Close modal
      setRestorationModalOpen(false);
      setSelectedPatientId(null);
    } catch (error) {
      console.error('❌ Error restoring booking:', error);
      toast.error('Failed to restore booking');
    }
  };

  const openCancelModal = (patientId: string) => {
    setSelectedPatientId(patientId);
    setCancelModalOpen(true);
  };

  const openRestorationModal = (patientId: string) => {
    setSelectedPatientId(patientId);
    setRestorationModalOpen(true);
  };

  const getGenderColor = (gender: string) => {
    return gender === 'MALE' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400';
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onOpenSidebar && (
              <button
                onClick={onOpenSidebar}
                className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                title="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-white text-xl font-bold">Patient Details</h1>
              <p className="text-gray-400 text-sm mt-0.5">
                View and manage patient notifications for selected chamber
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chamber Info & Progress */}
      {false && (
      <div className="bg-[#0f1419] px-4 pt-6 pb-6 mx-4 mt-4 rounded-xl border border-gray-800">
        {/* Chamber Details */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-white mb-1">{chamberName}</h2>
            <p className="text-gray-400 text-sm">{scheduleDate}</p>
          </div>
        </div>

        {/* Address */}
        {chamberAddress && (
          <div className="flex items-start gap-2 text-gray-400 text-sm mb-3 ml-[52px]">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{chamberAddress}</span>
          </div>
        )}

        {/* Schedule Time */}
        {scheduleTime && (
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-4 ml-[52px]">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{scheduleTime}</span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${(currentPatients / totalPatients) * 100}%` }}
          />
        </div>

        {/* Booking Status Text */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-emerald-400 text-sm">{currentPatients} / {totalPatients}</span>
          <span className="text-gray-500 text-xs">Booking Status</span>
        </div>
      </div>
      )}

      {/* Patient List */}
      <div className="p-4 space-y-3">
        {patients
          .sort((a, b) => {
            const aState = patientStates[a.id];
            const bState = patientStates[b.id];

            // Priority 1: Yet to seen patients first
            if (!aState?.isMarkedSeen && bState?.isMarkedSeen) return -1;
            if (aState?.isMarkedSeen && !bState?.isMarkedSeen) return 1;

            // Priority 2: Within same group, maintain original order (by serial number)
            return 0;
          })
          .map((patient, index) => (
          <div
            key={patient.id}
            className="bg-[#0f1419] rounded-xl p-4 border border-gray-800"
          >
            {/* Patient Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Serial Number */}
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white">{(patient as any).serialNo || (patient as any).tokenNumber?.replace('#', '') || index + 1}</span>
                </div>

                {/* Patient Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white">
                      {(() => {
                        if (patient.isDataRestricted) {
                          // Mask name: Show first letter + asterisks
                          const name = patient.name || 'Patient';
                          const words = name.split(' ');
                          return words.map(word =>
                            word.charAt(0) + '*'.repeat(Math.max(3, word.length - 1))
                          ).join(' ');
                        }
                        const transliterated = transliterateName(patient.name, doctorLanguage);
                        return transliterated;
                      })()}
                    </h3>
                    {/* Payment Verified Badge - Only shown if doctor has prepayment feature AND patient paid */}
                    {prepaymentActive && patient.paymentVerified && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        Paid
                      </span>
                    )}
                    {patient.referrerName && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const rid = (patient as any).referrerId || '';
                          // Read org/phone from booking data first (always available)
                          const bookingOrg = (patient as any).referrerOrganization || '';
                          const bookingPhone = (patient as any).referrerPhone || '';
                          setSelectedReferrerInfo({
                            name: patient.referrerName || '',
                            role: patient.referrerRole || 'Agent',
                            referrerId: rid,
                            organization: bookingOrg || undefined,
                            phone: bookingPhone || undefined,
                          });
                          setShowReferrerInfoModal(true);
                          // Auto-load full details
                          {
                            setReferrerDetailsLoading(true);
                            try {
                              const { doc: dRef, getDoc: gDoc, collection: cRef, getDocs: gDocs } = await import('firebase/firestore');
                              const { db: fDb } = await import('../lib/firebase/config');
                              if (fDb) {
                                let org = bookingOrg, phone = bookingPhone;
                                let monthCount = 0;
                                let foundReferrerId = rid;

                                // Try direct doc lookup if rid exists
                                if (rid) {
                                  const refSnap = await gDoc(dRef(fDb, 'referrers', rid));
                                  if (refSnap.exists()) {
                                    const d = refSnap.data();
                                    org = d.organization || org;
                                    phone = d.phone || phone;
                                    foundReferrerId = rid;
                                  }
                                }

                                // If still no org/phone, scan collection by name
                                if (!org && !phone) {
                                  const allRefsSnap = await gDocs(cRef(fDb, 'referrers'));
                                  const searchName = (patient.referrerName || '').toLowerCase().trim();
                                  for (const refDoc of allRefsSnap.docs) {
                                    const d = refDoc.data();
                                    if ((d.name || '').toLowerCase().trim() === searchName) {
                                      org = d.organization || '';
                                      phone = d.phone || '';
                                      foundReferrerId = refDoc.id;
                                      break;
                                    }
                                  }
                                }

                                // Count current month referrals
                                if (foundReferrerId) {
                                  const now = new Date();
                                  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                                  const histRef = cRef(fDb, 'referrers', foundReferrerId, 'referralHistory');
                                  const histSnap = await gDocs(histRef);
                                  histSnap.forEach(hd => {
                                    const ca = hd.data().createdAt;
                                    if (ca?.toDate && ca.toDate() >= monthStart) monthCount++;
                                  });
                                }

                                setSelectedReferrerInfo(prev => prev ? { ...prev, organization: org, phone, currentMonthReferrals: monthCount } : prev);
                              }
                            } catch (fetchErr) {
                              console.error('Error fetching referrer details:', fetchErr);
                            }
                            setReferrerDetailsLoading(false);
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs hover:bg-purple-500/30 transition-colors cursor-pointer"
                        title="Tap to see referrer details"
                      >
                        <Users className="w-3 h-3" />
                        Ref: {patient.referrerName}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Phone */}
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <Phone className="w-3 h-3" />
                      <span>
                        {patient.isDataRestricted
                          ? `******${patient.phone.slice(-4)}`
                          : patient.phone
                        }
                      </span>

                      {/* Enable Notifications Button */}
                      <button
                        onClick={() =>
                          toast.info('Ask patient to enable notifications on their device (after booking).', {
                            id: 'fcm-register',
                          })
                        }
                        className="ml-1 p-1 hover:bg-gray-700 rounded transition-colors"
                        title="Patient must enable notifications on their device"
                      >
                        <Bell className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>

                    {/* Booking ID */}
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                      {patient.isDataRestricted
                        ? '*********'
                        : patient.bookingId
                      }
                    </span>

                    {/* Booking Channel Badge - QR SCAN or WALK IN - Prominent Button Style */}
                    {patient.isWalkIn !== undefined && (
                      <span className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 ${
                        patient.isWalkIn
                          ? 'bg-orange-500/20 text-orange-400 border-2 border-orange-500/50'
                          : 'bg-purple-600/30 text-purple-200 border-2 border-purple-500/60'
                      }`}>
                        {patient.isWalkIn ? (
                          <>
                            🚶 <span>WALK IN</span>
                          </>
                        ) : (
                          <>
                            <QrCode className="w-3.5 h-3.5" />
                            <span>QR SCAN</span>
                          </>
                        )}
                      </span>
                    )}

                    {/* Age */}
                    <span className="text-gray-400 text-sm">
                      {patient.isDataRestricted
                        ? '** Years'
                        : (patient.age > 0 ? `${patient.age} years` : 'Age N/A')
                      }
                    </span>

                    {/* Gender */}
                    <span className={`px-2 py-0.5 rounded text-xs ${getGenderColor(patient.gender)}`}>
                      {patient.isDataRestricted ? '**' : translateDataValue(patient.gender, doctorLanguage)}
                    </span>
                  </div>

                  {/* Visit Type */}
                  <p className="text-gray-500 text-sm mt-1">
                    {patient.isDataRestricted ? '*********' : translateDataValue(patient.visitType, doctorLanguage)}
                  </p>
                </div>
              </div>
            </div>

            {/* Read-only notice for clinic staff + Assistant Seen Checkbox */}
            {readOnly && (
              <div className="mt-3 pt-3 border-t border-gray-800">
                {(() => {
                  const state = patientStates[patient.id];
                  const isSeen = state?.isMarkedSeen;
                  const isCancelled = state?.isCancelled;

                  const isInChamber = (patient as any).inChamber === true;

                  return (
                    <div className="space-y-2">
                      {/* Send to Chamber Checkbox */}
                      {!isSeen && !isCancelled && (
                        <label
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                            isInChamber
                              ? 'bg-blue-500/15 border border-blue-500/30'
                              : 'bg-gray-800/50 border border-gray-700 hover:border-blue-500/40'
                          }`}
                          onClick={async (e) => {
                            e.preventDefault();
                            try {
                              const bookingRef = doc(db, bookingsCollection, patient.id);
                              await updateDoc(bookingRef, {
                                inChamber: !isInChamber,
                                ...((!isInChamber) ? { inChamberAt: serverTimestamp() } : { inChamberAt: null }),
                              });
                              toast.success(isInChamber ? 'Removed from chamber' : 'Sent to chamber');
                            } catch (err) {
                              console.error('Failed to update inChamber:', err);
                              toast.error('Failed to update');
                            }
                          }}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                            isInChamber ? 'bg-blue-500 border-blue-500' : 'border-gray-500 bg-transparent'
                          }`}>
                            {isInChamber && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1">
                            <span className={`text-sm font-medium ${isInChamber ? 'text-blue-400' : 'text-gray-300'}`}>
                              {isInChamber ? 'In Chamber' : 'Send to Chamber'}
                            </span>
                          </div>
                          {isInChamber && <Stethoscope className="w-5 h-5 text-blue-400 flex-shrink-0" />}
                        </label>
                      )}

                      {/* Assistant Checkbox */}
                      <label
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                          isCancelled
                            ? 'bg-gray-800/30 border border-gray-700/50 cursor-not-allowed opacity-50'
                            : isSeen
                              ? 'bg-emerald-500/10 border border-emerald-500/30 cursor-default'
                              : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600 cursor-pointer'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          if (isSeen || isCancelled) return;
                          setAssistantSeenPatient(patient);
                          setAssistantSeenModalOpen(true);
                        }}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                          isCancelled
                            ? 'border-gray-600 bg-transparent'
                            : isSeen
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-gray-500 bg-transparent'
                        }`}>
                          {isSeen && !isCancelled && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <span className={`text-sm font-medium ${
                            isCancelled
                              ? 'text-gray-500'
                              : isSeen ? 'text-emerald-400' : 'text-gray-300'
                          }`}>
                            {isCancelled ? 'Booking Cancelled' : isSeen ? 'Consultation Complete' : 'Mark Consultation Complete'}
                          </span>
                        </div>
                        {isSeen && !isCancelled && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                      </label>

                      {/* View only banner */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <Lock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                        <span className="text-yellow-400 text-xs">View only — Medical actions require doctor login via Temporary Access</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Action Buttons - Horizontal Row (Hidden for clinic owner/manager/assistant - readOnly mode) */}
            {!readOnly && (
            <>
            <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-800">
              {(() => {
                const state = patientStates[patient.id];
                const isDisabled = state.isCancelled;

                return (
                  <>

                    {/* Video Consultation Icon - Only shown for video consultation patients AND if video-consultation addon is active */}
                    {patient.consultationType === 'video' && activeAddOns.includes('video-consultation') && (
                      <>
                        {/* Send Video Link Indicator - System Controlled (Non-clickable) */}
                        <div
                          className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                            isDisabled
                              ? 'bg-gray-800 border border-gray-700 opacity-50'
                              : state.videoLinkSent
                              ? 'bg-yellow-500/30 border border-yellow-500/50'
                              : 'bg-yellow-500/10 border border-yellow-500/30'
                          }`}
                          title={state.videoLinkSent ? "Link Sent (System)" : "Link will be sent 30 min before"}
                        >
                          <Send className={`w-4 h-4 ${state.videoLinkSent ? 'text-yellow-300' : 'text-yellow-400 opacity-50'}`} />
                          {state.videoLinkSent && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0f1419]">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Video Consultation Start Button */}
                        <button
                          onClick={() => handleStartVideoConsultation(patient)}
                          disabled={isDisabled || state.vcCompleted}
                          className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                            isDisabled || state.vcCompleted
                              ? state.vcCompleted
                                ? 'bg-emerald-500/30 border border-emerald-500/50'
                                : 'bg-gray-800 border border-gray-700 opacity-50 cursor-not-allowed'
                              : state.patientWaiting
                              ? 'bg-red-500/30 hover:bg-red-500/40 border-2 border-red-500 animate-pulse shadow-lg shadow-red-500/30'
                              : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30'
                          }`}
                          title={
                            state.vcCompleted ? "Video consultation completed ✓"
                            : state.patientWaiting ? "🔴 Patient is waiting! Click to start consultation"
                            : "Start Video Consultation"
                          }
                        >
                          <Video className={`w-4 h-4 ${state.vcCompleted ? 'text-emerald-300' : 'text-red-400'}`} />
                          {/* Patient Waiting Indicator - Pulsing User Icon */}
                          {state.patientWaiting && !state.vcCompleted && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0f1419] animate-bounce">
                              <UserCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                          {state.vcCompleted && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0f1419]">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </button>

                        {/* Normal Upload RX Button - Purple with Sparkle - For video consultation patients (Active after VC completed) */}
                        <button
                          onClick={() => handleNormalUploadPrescription(patient)}
                          disabled={isDisabled || state.prescriptionUploaded || !state.vcCompleted}
                          className={`relative w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-colors ${
                            isDisabled || !state.vcCompleted
                              ? 'bg-gray-800 border border-gray-700 opacity-50 cursor-not-allowed'
                              : state.prescriptionUploaded
                              ? 'bg-emerald-500/30 border border-emerald-500/50'
                              : 'bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 shadow-lg shadow-purple-500/20'
                          }`}
                          title={!state.vcCompleted ? "Complete video consultation first" : state.prescriptionUploaded ? "Prescription Uploaded" : "Upload RX (Normal)"}
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${state.prescriptionUploaded ? 'text-emerald-300' : 'text-purple-300'} mb-0.5`} />
                          {/* Upward Arrow */}
                          <svg
                            className={`w-2.5 h-2.5 ${state.prescriptionUploaded ? 'text-emerald-300' : 'text-purple-300'}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                          </svg>
                          {state.prescriptionUploaded && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0f1419]">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      </>
                    )}

                    {/* AI Upload Button - TEMPORARILY HIDDEN - Will be shown when feature is functional
                    {activeAddOns.includes('ai-rx-reader') && (
                      <button
                        onClick={() => handleAIUploadPrescription(patient)}
                        disabled={isDisabled || !state.isMarkedSeen}
                        className={`relative w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-all overflow-visible ${
                          isDisabled || !state.isMarkedSeen
                            ? 'bg-gray-800 border border-gray-700 opacity-50 cursor-not-allowed'
                            : 'bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border border-purple-500/50 shadow-lg shadow-purple-500/30'
                        }`}
                        title={!state.isMarkedSeen ? "Mark patient as seen first" : "AI Upload RX with Analysis"}
                      >
                        <div className="flex items-center gap-0.5 mb-0.5">
                          <span className="text-[8px] font-bold text-white leading-none tracking-tight">AI</span>
                          <Sparkles className="w-2 h-2 text-yellow-300" />
                        </div>
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                        </svg>
                      </button>
                    )}
                    */}

                    {/* AI RX Reader - Purple Sparkle Button (Disabled if Digital RX was used OR VC not completed for video patients) */}
                    <button
                      onClick={() => {
                        setUploadTargetPatient(patient);
                        setAiUploadModalOpen(true);
                      }}
                      disabled={isDisabled || state.digitalRxUsed || (patient.consultationType === 'video' && !state.vcCompleted)}
                      className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                        isDisabled || state.digitalRxUsed || (patient.consultationType === 'video' && !state.vcCompleted)
                          ? 'bg-gray-800 border border-gray-700 opacity-50 cursor-not-allowed'
                          : 'bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border border-purple-500/50 shadow-lg shadow-purple-500/30'
                      }`}
                      title={
                        (patient.consultationType === 'video' && !state.vcCompleted)
                          ? "Complete video consultation first"
                          : state.digitalRxUsed
                          ? "Digital RX already created - No need to decode"
                          : "AI RX Reader"
                      }
                    >
                      <Sparkles className="w-4 h-4 text-white" />
                    </button>

                    {/* Mark as Seen - Opens Multi-Step Consultation Flow (For VC patients: only active after VC completed) */}
                    <button
                      onClick={() => {
                        setSelectedPatientForFlow(patient);
                        setGeneratedRxUrl(null);
                        setRxConfirmModalOpen(true);
                      }}
                      disabled={isDisabled || state.isMarkedSeen || (patient.consultationType === 'video' && !state.vcCompleted)}
                      className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        isDisabled || (patient.consultationType === 'video' && !state.vcCompleted)
                          ? 'bg-gray-800 border border-gray-700 opacity-50 cursor-not-allowed'
                          : state.isMarkedSeen
                          ? 'bg-green-500/30 border border-green-500/50'
                          : 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/30'
                      }`}
                      title={
                        (patient.consultationType === 'video' && !state.vcCompleted)
                          ? "Complete video consultation first"
                          : state.isMarkedSeen
                          ? "Marked as Seen"
                          : "Mark as Seen → Digital RX Flow"
                      }
                    >
                      <Eye className={`w-4 h-4 ${state.isMarkedSeen ? 'text-green-300' : 'text-green-400'}`} />
                      {state.isMarkedSeen && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0f1419]">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>

                    {/* Reminder (System Controlled - Read-only) */}
                    <div
                      className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        isDisabled || !state.reminderEligible
                          ? 'bg-gray-800 border border-gray-700 opacity-50'
                          : state.reminderSent
                          ? 'bg-blue-500/30 border border-blue-500/50'
                          : 'bg-blue-500/10 border border-blue-500/30'
                      }`}
                      title={
                        !state.reminderEligible
                          ? "Not eligible (booking within 6 hours)"
                          : state.reminderSent
                          ? "Reminder sent by system 1 hour before"
                          : "Will be sent 1 hour before appointment"
                      }
                    >
                      <Bell className={`w-4 h-4 ${state.reminderSent ? 'text-blue-300' : 'text-blue-400 opacity-50'}`} />
                      {state.reminderSent && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0f1419]">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Follow-up — disabled for manual_override walk-ins (no patient contact for notification) */}
                    <button
                      onClick={() => handleFollowUp(patient.id)}
                      disabled={isDisabled || !state.isMarkedSeen || state.followUpScheduled || (patient.isWalkIn && patient.verificationMethod === 'manual_override')}
                      className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        isDisabled || !state.isMarkedSeen || (patient.isWalkIn && patient.verificationMethod === 'manual_override')
                          ? 'bg-gray-800 border border-gray-700 opacity-50 cursor-not-allowed'
                          : state.followUpScheduled
                          ? 'bg-purple-500/30 border border-purple-500/50'
                          : 'bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30'
                      }`}
                      title={
                        (patient.isWalkIn && patient.verificationMethod === 'manual_override')
                          ? "Not available for unverified walk-in patients"
                          : !state.isMarkedSeen
                          ? "Mark as seen first"
                          : state.followUpScheduled
                          ? "Follow-up Scheduled"
                          : "Schedule Follow-up"
                      }
                    >
                      <Calendar className={`w-4 h-4 ${state.followUpScheduled ? 'text-purple-300' : 'text-purple-400'}`} />
                      {state.followUpScheduled && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0f1419]">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>

                    {/* Review (System Controlled - Activated when marked seen) */}
                    <div
                      className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        isDisabled
                          ? 'bg-gray-800 border border-gray-700 opacity-50'
                          : state.reviewScheduled
                          ? 'bg-yellow-500/30 border border-yellow-500/50'
                          : 'bg-yellow-500/10 border border-yellow-500/30 opacity-50'
                      }`}
                      title={
                        state.reviewScheduled
                          ? "Review request will be sent (24h after consultation)"
                          : "Will activate when marked seen"
                      }
                    >
                      <Star className={`w-4 h-4 ${state.reviewScheduled ? 'text-yellow-300' : 'text-yellow-400 opacity-50'}`} />
                      {state.reviewScheduled && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0f1419]">
                          <Clock className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Digital RX Regen - Blue FileText (Active after first RX via Eye, OR always for walk-in patients who are already marked seen) */}
                    <button
                      onClick={() => handleRxRegenStart(patient)}
                      disabled={isDisabled || !state.isMarkedSeen || (!state.digitalRxUsed && !patient.isWalkIn)}
                      className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        isDisabled || !state.isMarkedSeen || (!state.digitalRxUsed && !patient.isWalkIn)
                          ? 'bg-gray-800 border border-gray-700 opacity-50 cursor-not-allowed'
                          : 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50'
                      }`}
                      title={
                        !state.isMarkedSeen
                          ? "Mark as seen first"
                          : patient.isWalkIn
                          ? (state.digitalRxUsed ? "Regenerate Digital RX" : "Create Digital RX")
                          : !state.digitalRxUsed
                          ? "Generate Digital RX first via Eye button"
                          : "Regenerate Digital RX"
                      }
                    >
                      <FileText className={`w-4 h-4 ${!state.isMarkedSeen || (!state.digitalRxUsed && !patient.isWalkIn) ? 'text-gray-500' : 'text-blue-400'}`} />
                    </button>

                    {/* AI Diet Chart - Active after Mark as Seen (re-generable until 23:59) */}
                    <button
                      onClick={() => handleCreateDietChart(patient)}
                      disabled={isDisabled || !state.isMarkedSeen}
                      className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        isDisabled || !state.isMarkedSeen
                          ? 'bg-gray-800 border border-gray-700 opacity-50 cursor-not-allowed'
                          : 'bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50'
                      }`}
                      title={!state.isMarkedSeen ? "Mark as seen first" : "Create AI Diet Chart"}
                    >
                      <Apple className={`w-4 h-4 ${!state.isMarkedSeen ? 'text-gray-500' : 'text-orange-500'}`} />
                    </button>

                    {/* Cancel or Restore - Spans full width */}
                    {!state.isCancelled ? (
                      <button
                        onClick={() => openCancelModal(patient.id)}
                        disabled={state.isMarkedSeen}
                        className={`basis-full w-full h-10 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                          state.isMarkedSeen
                            ? 'bg-gray-800 border border-gray-700 opacity-50 cursor-not-allowed'
                            : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30'
                        }`}
                        title={state.isMarkedSeen ? "Cannot cancel - Patient already seen" : "Cancel Booking"}
                      >
                        <X className={`w-4 h-4 ${state.isMarkedSeen ? 'text-gray-500' : 'text-red-400'}`} />
                        <span className={`text-sm ${state.isMarkedSeen ? 'text-gray-500' : 'text-red-400'}`}>Cancel Booking</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => openRestorationModal(patient.id)}
                        className="basis-full w-full h-10 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        title="Restore Booking"
                      >
                        <RotateCcw className="w-4 h-4 text-cyan-400" />
                        <span className="text-cyan-400 text-sm">Restore Booking</span>
                      </button>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Bottom Action Tabs - HISTORY, UPLOAD, LOCKER, CHRONIC (Icons Only) */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-700/50">
              <button
                onClick={() => {
                  setSelectedPatient(patient);
                  setHistoryModalOpen(true);
                }}
                className="h-12 bg-gray-800/50 hover:bg-emerald-500/10 border border-gray-700 hover:border-emerald-500/30 rounded-lg flex items-center justify-center transition-colors group"
                title="View patient consultation history with you"
              >
                <History className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300" />
              </button>

              <button
                onClick={() => {
                  setUploadTargetPatient(patient);
                  setUploadModalOpen(true);
                }}
                className="h-12 bg-gray-800/50 hover:bg-blue-500/10 border border-gray-700 hover:border-blue-500/30 rounded-lg flex items-center justify-center transition-colors group"
                title="Upload Prescription to Medico Locker"
              >
                <Upload className="w-5 h-5 text-gray-400 group-hover:text-gray-300" />
              </button>

              <button
                onClick={() => {
                  toast.info('Requesting Locker Access...', {
                    description: `Sending access request to ${patient.name}. They will receive an OTP to authorize.`,
                  });
                }}
                className="h-12 bg-gray-800/50 hover:bg-amber-500/10 border border-gray-700 hover:border-amber-500/30 rounded-lg flex items-center justify-center transition-colors group"
                title="Request Full Medical Locker Access"
              >
                <Lock className="w-5 h-5 text-gray-400 group-hover:text-amber-400" />
              </button>

              {/* Add to Chronic Care */}
              {activeAddOns.includes('chronic-care') && (
                <button
                  onClick={() => {
                    if (chronicAdded.has(patient.phone)) {
                      toast.info(`${patient.name} is already in your Chronic Care registry`);
                      return;
                    }
                    setChronicPatient(patient);
                    setChronicConditions([]);
                    setChronicNotes('');
                    setChronicCustom('');
                    setChronicModalOpen(true);
                  }}
                  className={`h-12 rounded-lg flex items-center justify-center transition-colors group ${
                    chronicAdded.has(patient.phone)
                      ? 'bg-rose-500/20 border border-rose-500/40'
                      : 'bg-gray-800/50 hover:bg-rose-500/10 border border-gray-700 hover:border-rose-500/30'
                  }`}
                  title={chronicAdded.has(patient.phone) ? "Already in Chronic Care" : "Add to Chronic Care Databank"}
                >
                  <Heart className={`w-5 h-5 ${chronicAdded.has(patient.phone) ? 'text-rose-400 fill-rose-400' : 'text-gray-400 group-hover:text-rose-400'}`} />
                </button>
              )}
            </div>
            </>
            )}
          </div>
        ))}
      </div>

      {/* Modals */}
      <div>
        <FollowUpModal
          isOpen={followUpModalOpen}
          onClose={() => setFollowUpModalOpen(false)}
          onSave={handleSaveFollowUp}
          patientName={selectedPatient?.name || ''}
        />

        <DoctorRxUploadModal
          isOpen={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false);
            setSelectedPatient(null);
            setUploadTargetPatient(null);
          }}
          patientName={uploadTargetPatient?.name || selectedPatient?.name || ''}
          patientPhone={uploadTargetPatient?.phone || selectedPatient?.phone}
          bookingId={uploadTargetPatient?.bookingId || selectedPatient?.bookingId}
          onUploadSuccess={handleUploadSuccess}
        />

        <CancellationModal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          onConfirm={() => {
            handleCancelConfirm();
            setCancelModalOpen(false);
          }}
        />

        <RestorationModal
          isOpen={restorationModalOpen}
          onClose={() => setRestorationModalOpen(false)}
          onConfirm={() => {
            handleRestoreConfirm();
            setRestorationModalOpen(false);
          }}
        />

        <PatientHistoryModal
          isOpen={historyModalOpen}
          onClose={() => {
            setHistoryModalOpen(false);
            setSelectedPatient(null);
          }}
          patientPhone={selectedPatient?.phone || ''}
          patientName={selectedPatient?.name || ''}
          doctorId={doctorInfo.id}
          doctorName={doctorInfo.name}
        />


        {/* Chronic Care Condition Picker Modal */}
        {chronicModalOpen && chronicPatient && (
          <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4">
            <div className="bg-[#0f172a] border border-zinc-600 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-400" /> Add to Chronic Care
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">{chronicPatient.name} • {chronicPatient.phone}</p>
                </div>
                <button onClick={() => { setChronicModalOpen(false); setChronicPatient(null); }} className="p-1 hover:bg-zinc-700 rounded text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-[10px] text-gray-500 uppercase mb-2">Select chronic conditions *</p>
              <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto">
                {CHRONIC_CONDITIONS_LIST.map(c => (
                  <button
                    key={c}
                    onClick={() => setChronicConditions(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                    className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                      chronicConditions.includes(c)
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                        : 'border-zinc-700 text-gray-500 hover:text-white hover:border-zinc-500'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Custom condition */}
              <div className="flex gap-2 mt-3">
                <input
                  value={chronicCustom}
                  onChange={e => setChronicCustom(e.target.value)}
                  placeholder="Custom condition..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-1.5 text-xs"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && chronicCustom.trim()) {
                      if (!chronicConditions.includes(chronicCustom.trim())) setChronicConditions(prev => [...prev, chronicCustom.trim()]);
                      setChronicCustom('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (chronicCustom.trim() && !chronicConditions.includes(chronicCustom.trim())) {
                      setChronicConditions(prev => [...prev, chronicCustom.trim()]);
                    }
                    setChronicCustom('');
                  }}
                  className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md text-xs"
                >+</button>
              </div>

              {chronicConditions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {chronicConditions.map(c => (
                    <span key={c} className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] flex items-center gap-1">
                      {c}
                      <button onClick={() => setChronicConditions(prev => prev.filter(x => x !== c))} className="hover:text-white">×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Notes */}
              <textarea
                value={chronicNotes}
                onChange={e => setChronicNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm mt-3 resize-none"
              />

              <div className="flex gap-3 mt-4">
                <button onClick={() => { setChronicModalOpen(false); setChronicPatient(null); }} className="flex-1 py-2 text-gray-400 hover:text-white rounded-lg transition-colors text-sm">
                  Cancel
                </button>
                <button
                  onClick={handleAddToChronic}
                  disabled={chronicSaving || chronicConditions.length === 0}
                  className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-zinc-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {chronicSaving ? 'Saving...' : <><Heart className="w-4 h-4" /> Add to Chronic Care</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI RX Reader Modal */}
        <DoctorAIRXUploadModal
          isOpen={aiUploadModalOpen}
          onClose={() => {
            setAiUploadModalOpen(false);
            setUploadTargetPatient(null);
          }}
          patientName={uploadTargetPatient?.name || ''}
          patientId={uploadTargetPatient?.id.toString() || ''}
          patientPhone={uploadTargetPatient?.phone || ''}
          patientLanguage={uploadTargetPatient?.language || 'english'}
          onUploadSuccess={() => {
            if (uploadTargetPatient) {
              setPatientStates(prev => ({
                ...prev,
                [uploadTargetPatient.id]: {
                  ...prev[uploadTargetPatient.id],
                  prescriptionUploaded: true,
                }
              }));
            }
          }}
        />

        {/* ============================================ */}
        {/* ✅ ASSISTANT "CONSULTATION COMPLETE?" MODAL */}
        {/* ============================================ */}
        {assistantSeenModalOpen && assistantSeenPatient && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#0f172a] border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/20">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Consultation Complete?</h3>
                    <p className="text-xs text-gray-400">{assistantSeenPatient.name}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-300">
                  Has the patient completed their consultation with the doctor?
                </p>
                <p className="text-xs text-gray-500">
                  This will mark the patient as seen and notify them.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setAssistantSeenModalOpen(false); setAssistantSeenPatient(null); }}
                    className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                  >
                    No
                  </button>
                  <button
                    onClick={handleAssistantConfirmSeen}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors bg-emerald-600 hover:bg-emerald-500"
                  >
                    Yes, Complete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* 🔄 MULTI-STEP CONSULTATION COMPLETION MODALS */}
        {/* ============================================ */}

        {/* Step 1: "Create Digital RX?" Confirmation Modal */}
        {rxConfirmModalOpen && selectedPatientForFlow && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0f172a] border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/20 rounded-xl">
                    <FileText className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Create Digital RX?</h3>
                    <p className="text-xs text-gray-400">For {selectedPatientForFlow.name}</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/50 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Patient</span>
                    <span className="text-white font-medium">{selectedPatientForFlow.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Age/Gender</span>
                    <span className="text-white">{selectedPatientForFlow.age}Y / {selectedPatientForFlow.gender}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Visit</span>
                    <span className="text-white">{selectedPatientForFlow.visitType}</span>
                  </div>
                </div>

                {rxPausedState && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3">
                    <Stethoscope className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-300">Draft Available</p>
                      <p className="text-xs text-amber-400/70">{rxPausedState.items.length} medicine(s), {Object.keys(rxPausedState.vitals || {}).length} vital(s), {Object.keys(rxPausedState.pathology || {}).length} lab(s), {(rxPausedState.suggestedTests || []).length} test(s) saved - Will resume from where you left</p>
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-400 leading-relaxed">
                  Would you like to create a Digital Prescription for this patient?
                  The RX will be generated as a professional PDF and sent to the patient via notification.
                </p>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-zinc-800 space-y-3">
                <button
                  onClick={handleStartRxFlow}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <FileText className="w-5 h-5" />
                  {rxPausedState ? 'Resume Digital RX' : 'Yes, Create Digital RX'}
                </button>
                <button
                  onClick={handleSkipRxAndMarkSeen}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-gray-300 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-zinc-700"
                >
                  <Eye className="w-4 h-4" />
                  No, Just Mark as Seen
                </button>
                <button
                  onClick={() => {
                    setRxConfirmModalOpen(false);
                    setSelectedPatientForFlow(null);
                  }}
                  className="w-full py-2 text-gray-500 text-sm hover:text-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: DigitalRXMaker Modal */}
        {rxMakerOpen && selectedPatientForFlow && (
          <DigitalRXMaker
            patient={{
              id: selectedPatientForFlow.id,
              name: selectedPatientForFlow.name,
              age: selectedPatientForFlow.age,
              gender: selectedPatientForFlow.gender,
              phone: selectedPatientForFlow.phone,
              bookingId: selectedPatientForFlow.bookingId,
              appointmentTime: selectedPatientForFlow.appointmentTime,
              bookingTime: selectedPatientForFlow.bookingTime,
              language: selectedPatientForFlow.language,
              purpose: selectedPatientForFlow.visitType,
              srlNo: selectedPatientForFlow.serialNumber || selectedPatientForFlow.tokenNumber,
            }}
            doctorInfo={doctorInfo}
            onClose={handleRxClose}
            onPause={handleRxPause}
            onGenerated={handleRxGenerated}
            initialState={rxPausedState || undefined}
          />
        )}

        {/* Step 3: "Add AI Diet Chart?" Confirmation Modal */}
        {dietConfirmModalOpen && selectedPatientForFlow && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0f172a] border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-500/20 rounded-xl">
                    <Apple className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Add AI Diet Chart?</h3>
                    <p className="text-xs text-gray-400">RX Generated Successfully ✅</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-300">Digital RX Ready</p>
                    <p className="text-xs text-emerald-400/70">PDF prescription has been generated and stored</p>
                  </div>
                </div>

                <p className="text-sm text-gray-400 leading-relaxed">
                  Would you like to create an AI-powered Diet Chart for <span className="text-white font-medium">{selectedPatientForFlow.name}</span>?
                  A personalized 7-day nutrition plan will be generated and sent along with the prescription.
                </p>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-zinc-800 space-y-3">
                <button
                  onClick={handleStartDietFlow}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20"
                >
                  <Apple className="w-5 h-5" />
                  Yes, Add AI Diet Chart
                </button>
                <button
                  onClick={() => handleSkipDietAndSend(true)}
                  disabled={isSendingNotification}
                  className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#25D366]/20 disabled:opacity-50"
                >
                  {isSendingNotification ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                  No, Send RX Only via WhatsApp
                </button>
                <button
                  onClick={() => handleSkipDietAndSend(false)}
                  disabled={isSendingNotification}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-gray-300 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-zinc-700 disabled:opacity-50"
                >
                  {isSendingNotification ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  No, Send RX Only via App Notification
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RX Regen Success Modal — WhatsApp 2nd option */}
        {regenSuccessModalOpen && selectedPatientForFlow && regenRxUrl && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0f172a] border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/20 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">RX Updated Successfully!</h3>
                    <p className="text-xs text-gray-400">Notification sent to {selectedPatientForFlow.name}</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
                  <FileText className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-300">Updated Digital RX</p>
                    <p className="text-xs text-emerald-400/70">PDF has been regenerated and stored</p>
                  </div>
                </div>

                <p className="text-sm text-gray-400 leading-relaxed">
                  The updated prescription has been sent via app notification. You can also send it via WhatsApp as a backup.
                </p>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-zinc-800 space-y-3">
                <button
                  onClick={() => {
                    const textParts = [];
                    textParts.push(`📋 *Updated Digital Prescription*`);
                    textParts.push(`Patient: ${selectedPatientForFlow!.name}`);
                    const drName = localStorage.getItem('healqr_user_name') || localStorage.getItem('doctorName') || 'Doctor';
                    textParts.push(`Dr. ${drName}`);
                    if (selectedPatientForFlow!.chamber) textParts.push(`Clinic: ${selectedPatientForFlow!.chamber}`);
                    textParts.push('');
                    textParts.push(`🏥 *Download Prescription:*\n${regenRxUrl}`);
                    const text = textParts.join('\n');
                    const phoneNumber = selectedPatientForFlow!.phone ? selectedPatientForFlow!.phone.replace(/\D/g, '') : '';
                    const url = phoneNumber
                      ? `https://wa.me/${phoneNumber.startsWith('91') ? phoneNumber : '91' + phoneNumber}?text=${encodeURIComponent(text)}`
                      : `https://wa.me/?text=${encodeURIComponent(text)}`;
                    window.open(url, '_blank');
                    setRegenSuccessModalOpen(false);
                    setRegenRxUrl(null);
                    setSelectedPatientForFlow(null);
                  }}
                  className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#25D366]/20"
                >
                  <MessageCircle className="w-5 h-5" />
                  Also Send via WhatsApp
                </button>
                <button
                  onClick={() => {
                    setRegenSuccessModalOpen(false);
                    setRegenRxUrl(null);
                    setSelectedPatientForFlow(null);
                  }}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-gray-300 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-zinc-700"
                >
                  <Check className="w-4 h-4" />
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Inline AI Diet Chart Modal */}
        {dietChartModalOpen && selectedPatientForFlow && (
          <InlineDietChartModal
            patient={selectedPatientForFlow}
            doctorInfo={doctorInfo}
            onClose={() => {
              setDietChartModalOpen(false);
              // If closing without generating, send RX only
              if (selectedPatientForFlow) {
                finalizeConsultation(selectedPatientForFlow.id, generatedRxUrl, null);
              }
            }}
            onGenerated={handleDietGenerated}
          />
        )}

        {/* <PatientOldRXViewer
          isOpen={oldRxViewerOpen}
          onClose={() => {
            setOldRxViewerOpen(false);
            setSelectedPatientForRxView(null);
          }}
          patientName={selectedPatientForRxView?.name || ''}
          patientId={selectedPatientForRxView?.id.toString() || ''}
          hasAIRxReader={activeAddOns.includes('ai-rx-reader')}
          doctorLanguage={doctorLanguage}
          oldRXFiles={
            Array.isArray(selectedPatientForRxView?.prescriptionUrl)
              ? selectedPatientForRxView.prescriptionUrl
              : selectedPatientForRxView?.prescriptionUrl
                ? [selectedPatientForRxView.prescriptionUrl]
                : []
          }
        /> */}

        {/* Referrer Info Modal */}
        {showReferrerInfoModal && selectedReferrerInfo && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setShowReferrerInfoModal(false)}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-lg">Referrer Details</h3>
                <button onClick={() => setShowReferrerInfoModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{selectedReferrerInfo.name}</p>
                  <p className="text-purple-400 text-xs">{selectedReferrerInfo.role}</p>
                </div>
              </div>

              {referrerDetailsLoading ? (
                <p className="text-center text-gray-500 text-xs py-2">Loading details...</p>
              ) : (
                <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Organization</span>
                    <span className="text-white">{selectedReferrerInfo.organization || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Mobile No</span>
                    <span className="text-white">{selectedReferrerInfo.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">This Month Referrals</span>
                    <span className="text-emerald-400 font-bold">[{selectedReferrerInfo.currentMonthReferrals ?? 0}]</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowReferrerInfoModal(false)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2.5 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

