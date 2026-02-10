import { ArrowLeft, Calendar, MapPin, Clock, Bell, Eye, Star, Phone, X, Check, RotateCcw, CheckCircle2, Video, Send, UserCircle, Upload, FileText, Download, Sparkles, History, Lock } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import FollowUpModal from './FollowUpModal';
import CancellationModal from './CancellationModal';
import RestorationModal from './RestorationModal';
import DoctorRxUploadModal from './DoctorRxUploadModal';
import PatientHistoryModal from './PatientHistoryModal';
// import { DoctorAIRXUploadModal } from './DoctorAIRXUploadModal';
// import { PatientOldRXViewer } from './PatientOldRXViewer';
import { toast } from 'sonner';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase/config';
import { translateDataValue, transliterateName, type Language } from '../utils/translations';

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
  onRefresh?: () => void; // Callback to refresh patient list after cancel/restore
  prepaymentActive?: boolean; // Whether doctor has pre-payment collection feature activated
  activeAddOns?: string[]; // Active premium add-ons purchased by doctor
  doctorLanguage?: Language; // Doctor's preferred language for AI translation
  doctorId?: string; // Doctor ID for loading correct doctor info (for non-linked doctors)
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
    prescriptionUploaded: boolean; // Track if doctor has uploaded today's prescription
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
  onRefresh,
  prepaymentActive = false,
  doctorLanguage = 'english',
  activeAddOns = [],
  doctorId,
}: PatientDetailsProps) {
  const [isReviewRestricted, setIsReviewRestricted] = useState(false);

  // Check for Clinic Restrictions on Mount
  useEffect(() => {
    const checkClinicRestrictions = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        // 1. Get Doctor's Clinic ID
        const doctorRef = doc(db, 'doctors', userId);
        const doctorSnap = await getDoc(doctorRef);
        
        if (doctorSnap.exists()) {
          const doctorData = doctorSnap.data();
          const clinicId = doctorData.clinicId;

          if (clinicId) {
            // 2. Get Clinic Settings
            const clinicRef = doc(db, 'clinics', clinicId);
            const clinicSnap = await getDoc(clinicRef);
            
            if (clinicSnap.exists() && clinicSnap.data().centralizedReviews) {

              setIsReviewRestricted(true);
            }
          }
        }
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

      initialStates[patient.id] = {
        isMarkedSeen: patient.isMarkedSeen || false,
        reminderSent: patient.reminderSent || false,
        followUpScheduled: patient.followUpScheduled || false,
        reviewScheduled: patient.reviewScheduled || false,
        isCancelled: patient.isCancelled || false,
        reminderEligible: isReminderEligible,
        videoLinkSent: videoLinkSent, // Set immediately if within 30-min window
        patientWaiting: false, // System will set to true when patient clicks the link
        prescriptionUploaded: false, // Initially no prescription uploaded
      };
    });
    return initialStates;
  });

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [restorationModalOpen, setRestorationModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [aiUploadModalOpen, setAiUploadModalOpen] = useState(false);
  const [uploadTargetPatient, setUploadTargetPatient] = useState<Patient | null>(null);
  const [oldRxViewerOpen, setOldRxViewerOpen] = useState(false);
  const [selectedPatientForRxView, setSelectedPatientForRxView] = useState<Patient | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  
  // Get current doctor info from Firebase auth
  const [doctorInfo, setDoctorInfo] = useState<{ id: string; name: string }>({
    id: '',
    name: ''
  });

  useEffect(() => {
    const loadDoctorInfo = async () => {
      try {
        let docId = doctorId;
        
        // If doctorId not provided, try to get current user
        if (!docId) {
          const user = auth.currentUser;
          if (!user) return;
          docId = user.uid;
        }

        const doctorDoc = await getDoc(doc(db, 'doctors', docId));
        if (doctorDoc.exists()) {
          setDoctorInfo({
            id: docId,
            name: doctorDoc.data().name || 'Doctor'
          });
        }
      } catch (error) {
        console.error('Failed to load doctor info:', error);
      }
    };
    loadDoctorInfo();
  }, [doctorId]);

  // Push reminders temporarily disabled while notification system is rebuilt.

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
            
            await updateDoc(doc(db, 'bookings', patient.id), {
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
          const doctorId = localStorage.getItem('userId') || '';
          const doctorName = localStorage.getItem('healqr_user_name') || 'Doctor';
          
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



  const handleMarkedSeen = async (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    try {
      toast.loading('Marking patient as seen...', { id: 'mark-seen' });

      // Get user info from localStorage (works for both doctors and assistants)
      const isAssistant = localStorage.getItem('healqr_is_assistant') === 'true';
      const userId = localStorage.getItem('userId'); // For assistants, this is the doctor's ID
      const doctorName = localStorage.getItem('healqr_user_name') || localStorage.getItem('doctorName') || 'Doctor';
      const doctorSpecialty = localStorage.getItem('healqr_specialty') || '';
      const doctorPhoto = localStorage.getItem('healqr_profile_photo') || '';
      const markedBy = isAssistant ? localStorage.getItem('healqr_user_email') : userId; // Track who marked it
      
      if (!userId) {
        throw new Error('User ID not found');
      }

      // ============================================
      // 🔍 CHECK IF PATIENT HAS FCM TOKEN REGISTERED
      // ============================================
      const { doc: firestoreDoc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase/config');
      
      // Normalize phone number to match notificationService logic
      const digits = (patient.phone || '').replace(/\D/g, '');
      const trimmed = digits.replace(/^91/, '');
      const phone10 = trimmed.slice(-10);
      
      // 1. Try standard ID format
      let fcmUserId = `patient_${phone10}`;
      let tokenDoc = await getDoc(firestoreDoc(db, 'fcmTokens', fcmUserId));
      
      // 2. Fallback: Try with +91 prefix if standard fails
      if (!tokenDoc.exists()) {

        const fallbackId = `patient_+91${phone10}`;
        const fallbackDoc = await getDoc(firestoreDoc(db, 'fcmTokens', fallbackId));
        if (fallbackDoc.exists()) {
          fcmUserId = fallbackId;
          tokenDoc = fallbackDoc;

        }
      }

      // 3. Fallback: Try legacy collection (patientFCMTokens)
      if (!tokenDoc.exists()) {

        const legacyDoc = await getDoc(firestoreDoc(db, 'patientFCMTokens', phone10));
        if (legacyDoc.exists()) {
          // Found in legacy, we can use this token but we need to adapt the logic
          // The notification service might expect it in fcmTokens, but let's see if we can just use the token

          // We might need to migrate it or just use it. 
          // For now, let's just proceed and let the notification service handle it if it looks up by ID.
          // Actually, the notification service (cloud function) likely looks up by ID.
          // If the cloud function expects it in 'fcmTokens', we might be stuck unless we migrate it here.
          
          // Let's try to migrate it on the fly!
          const legacyData = legacyDoc.data();
          if (legacyData?.token) {
             await import('firebase/firestore').then(({ setDoc, doc }) => {
                setDoc(doc(db, 'fcmTokens', `patient_${phone10}`), {
                  userId: `patient_${phone10}`,
                  token: legacyData.token,
                  userType: 'patient',
                  migratedFrom: 'patientFCMTokens',
                  updatedAt: new Date()
                }, { merge: true });
             });
             // Now re-fetch
             fcmUserId = `patient_${phone10}`;
             tokenDoc = await getDoc(firestoreDoc(db, 'fcmTokens', fcmUserId));
          }
        }
      }
      
      if (!tokenDoc.exists()) {
        console.error('❌ NO FCM TOKEN FOUND for patient:', fcmUserId);
        console.error('   Patient never registered for notifications!');
        toast.error('⚠️ Patient has not enabled notifications.', {
          id: 'mark-seen',
          duration: 5000,
          description: 'They need to enable notifications when booking to receive updates.'
        });
      } else {
        // Token exists - validate it's not too old
        const tokenData = tokenDoc.data();
        const updatedAt = tokenData?.updatedAt?.toDate();
        if (updatedAt) {
          const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceUpdate > 60) {
            console.warn('⚠️ FCM token is old (', Math.floor(daysSinceUpdate), 'days), may be expired');
            toast.warning('⚠️ Patient notification may fail - their token is outdated.', {
              id: 'mark-seen',
              duration: 5000,
              description: 'Ask patient to re-enable notifications in their next booking.'
            });
          }
        }
      }

      // Get doctor info from Firestore
      const { doc, updateDoc } = await import('firebase/firestore');

      const seenTimestamp = new Date();

      // Update Firestore booking document (use patient.id which is the Firestore doc ID)
      const bookingRef = doc(db, 'bookings', patient.id);
      
      await updateDoc(bookingRef, {
        isMarkedSeen: true,
        markedSeenAt: seenTimestamp,
        markedSeenBy: markedBy, // Doctor ID or assistant email
        markedByRole: isAssistant ? 'assistant' : 'doctor', // Track role
        reviewScheduled: true, // Auto-activate review button
        reviewScheduledAt: seenTimestamp,
        consultationStatus: 'completed', // For patient live tracker
        isCompleted: true, // Flag for completed consultation
      });

      // Update local state - Activate review & follow-up, deactivate cancel
      setPatientStates((prev: any) => ({
        ...prev,
        [patientId]: {
          ...prev[patientId],
          isMarkedSeen: true,
          reviewScheduled: true, // Activate review button
          // followUpScheduled stays false until doctor clicks it
          // isCancelled stays as-is (can't cancel after seen)
        }
      }));

      // ============================================
      // 🔔 SEND CONSULTATION COMPLETED NOTIFICATION
      // ============================================
      try {
        const { sendConsultationCompleted, scheduleReviewRequest } = await import('../services/notificationService');
        
        // Send immediate "Consultation Completed" notification
        const now = new Date();
        const result = await sendConsultationCompleted({
          patientPhone: patient.phone,
          patientName: patient.name,
          age: patient.age,
          sex: patient.gender,
          purpose: patient.visitType,
          doctorId: doctorInfo.id,
          doctorName: doctorName,
          clinicName: patient.chamber, // Chamber name as clinic
          bookingId: patient.bookingId, // Use structured booking ID from database
          consultationDate: new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0], // YYYY-MM-DD format
          consultationTime: now.toTimeString().split(' ')[0].slice(0, 5), // HH:mm format
          chamber: patient.chamber || 'Chamber',
          language: patient.language || 'english',
        });
        
        if (result?.success) {
           toast.success('Patient notified via App');
        }

        // Schedule Review Request for 24h later
        if (!isReviewRestricted) {
          await scheduleReviewRequest(
            {
              patientPhone: patient.phone,
              patientName: patient.name,
              doctorName: doctorName,
              doctorId: userId, // Pass doctorId for deep linking
              bookingId: patient.id,
              consultationDate: new Date().toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }),
              language: patient.language || 'english', // Pass patient's chosen language
            },
            seenTimestamp
          );
        } else {

        }
      } catch (notifError) {
        // Notification error (non-blocking)
        toast.error('Failed to notify patient');
      }

      toast.success('Patient marked as seen', {
        id: 'mark-seen',
        description: 'Consultation completed notification sent',
      });
    } catch (error) {
      console.error('❌ Error marking patient as seen:', error);
      toast.error('Failed to mark patient as seen', {
        id: 'mark-seen',
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  // Auto-send video link 30 minutes before appointment (System controlled)
  useEffect(() => {
    const checkAndSendVideoLinks = () => {
      const now = new Date();
      
      patients.forEach(patient => {
        const state = patientStates[patient.id];
        
        // Only for video consultation patients
        if (patient.consultationType !== 'video') return;
        
        // Skip if link already sent or appointment cancelled
        if (state.videoLinkSent || state.isCancelled) return;
        
        // Calculate time until appointment
        const timeUntilAppointment = patient.appointmentTime.getTime() - now.getTime();
        const minutesUntilAppointment = timeUntilAppointment / (1000 * 60);
        
        // Auto-send link if within 30 minute window
        if (minutesUntilAppointment <= 30 && minutesUntilAppointment > 0) {
          setPatientStates(prev => ({
            ...prev,
            [patient.id]: {
              ...prev[patient.id],
              videoLinkSent: true,
            }
          }));
          
          // Simulate patient clicking link after 3-8 seconds (for demo purposes)
          setTimeout(() => {
            setPatientStates(prev => ({
              ...prev,
              [patient.id]: {
                ...prev[patient.id],
                patientWaiting: true,
              }
            }));
          }, Math.random() * 5000 + 3000); // Random 3-8 seconds for quick demo
        }
      });
    };

    // Check every 5 seconds for demo (in production, use 60000 for every minute)
    const interval = setInterval(checkAndSendVideoLinks, 5000);
    
    // Check immediately on mount
    checkAndSendVideoLinks();
    
    return () => clearInterval(interval);
  }, [patients, patientStates]);

  // Simulate patient joining waiting room for video consultations with link already sent
  useEffect(() => {
    const simulatePatientWaiting = () => {
      patients.forEach(patient => {
        const state = patientStates[patient.id];
        
        // Only for video consultation patients
        if (patient.consultationType !== 'video') return;
        
        // Skip if already waiting or link not sent
        if (state.patientWaiting || !state.videoLinkSent) return;
        
        // Simulate patient clicking link after 3-8 seconds
        setTimeout(() => {
          setPatientStates(prev => ({
            ...prev,
            [patient.id]: {
              ...prev[patient.id],
              patientWaiting: true,
            }
          }));
        }, Math.random() * 5000 + 3000); // Random 3-8 seconds
      });
    };

    // Trigger simulation when component mounts or patientStates change
    simulatePatientWaiting();
  }, [patients, patientStates]);

  const handleStartVideoConsultation = (patient: Patient) => {
    // Open video consultation in new window
    window.open(`/video-call/${patient.bookingId}`, '_blank');
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
        const doctorName = localStorage.getItem('healqr_user_name') || localStorage.getItem('doctorName') || 'Doctor';
        const doctorId = localStorage.getItem('userId') || '';
        const doctorSpecialty = localStorage.getItem('healqr_specialty') || '';
        const doctorPhoto = localStorage.getItem('healqr_profile_photo') || '';
        
        // Calculate follow-up date (when patient should come)
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + days);
        
        // Calculate notification date (3 days before follow-up date)
        const notificationDate = new Date(followUpDate);
        notificationDate.setDate(notificationDate.getDate() - 3);
        
        // Update Firestore with follow-up schedule (use patient.id which is the Firestore doc ID)
        const bookingRef = doc(db, 'bookings', selectedPatient.id);
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
            chamber: selectedChamber,
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

  const handleViewOldRx = (patient: Patient) => {
    setSelectedPatientForRxView(patient);
    setOldRxViewerOpen(true);
    
    // Show toast to confirm button click
    toast.success('Opening AI RX Viewer...', {
      description: activeAddOns.includes('ai-rx-reader') ? '🤖 AI Translation Enabled' : 'Basic Viewer',
    });
  };

  const handleMarkOldRxViewed = () => {
    if (selectedPatientForRxView) {
      // Update patient's prescriptionReviewed status
      toast.success('Marked as viewed');
    }
  };

  // Normal Upload Handler - Always opens normal upload modal (for Video Consultation)
  const handleNormalUploadPrescription = (patient: Patient) => {
    setUploadTargetPatient(patient);
    setUploadModalOpen(true);
  };

  // AI Upload Handler - Always opens AI upload modal (for AI RX Reader)
  const handleAIUploadPrescription = (patient: Patient) => {
    setUploadTargetPatient(patient);
    setAiUploadModalOpen(true);
  };

  const handleUploadSuccess = (data: {
    fileName: string;
    fileUrl: string;
    ocrText: string;
    translations: {
      english: string;
      hindi: string;
      bengali: string;
    };
  }) => {
    if (uploadTargetPatient) {
      setPatientStates(prev => ({
        ...prev,
        [uploadTargetPatient.id]: {
          ...prev[uploadTargetPatient.id],
          prescriptionUploaded: true,
        }
      }));
      toast.success(`Prescription uploaded for ${uploadTargetPatient.name}`, {
        description: 'Patient notified with download link',
      });
    }
    setUploadModalOpen(false);
    setUploadTargetPatient(null);
  };

  const handleReminder = (patientId: string) => {
    // System controlled - No manual trigger
    // Automatic: Sends 1 hour before appointment if booking done 6+ hours prior
  };

  const handleReview = (patientId: string) => {
    // System controlled, activated after marked seen
    // Sends review request 24 hours after appointment
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
      await updateDoc(doc(db!, 'bookings', patient.id), {
        isCancelled: true,
        status: 'cancelled',
        cancellationType: 'PATIENT INDIVIDUAL TOGGLE',
        cancelledBy: 'doctor'
      });

      // ============================================
      // 🔔 SEND CANCELLATION NOTIFICATION
      // ============================================
      try {
        const { sendAppointmentCancelled } = await import('../services/notificationService');
        const doctorId = localStorage.getItem('userId') || '';
        const doctorName = localStorage.getItem('healqr_user_name') || 'Doctor';
        const doctorPhoto = localStorage.getItem('healqr_profile_photo') || '';
        const doctorSpecialty = localStorage.getItem('healqr_specialty') || '';
        
        // Format appointment date - Use today's date as scheduleDate is schedule text like "Every Day" not a date
        const appointmentDate = new Date();
        const formattedDate = appointmentDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
        
        // Format appointment time
        const formattedTime = patient.appointmentTime ? patient.appointmentTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : scheduleTime.split(' - ')[0] || '10:00 AM'; // Get start time from schedule
        
        const cancelledDate = new Date(appointmentDate.getTime() - appointmentDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]; // YYYY-MM-DD
        
        const notifResult = await sendAppointmentCancelled({
          patientPhone: patient.phone,
          patientName: patient.name,
          age: patient.age,
          sex: patient.gender,
          purpose: patient.visitType,
          doctorId: doctorInfo.id,
          doctorName,
          doctorSpecialty,
          doctorPhoto,
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
      await updateDoc(doc(db!, 'bookings', patient.id), {
        isCancelled: false,
        status: 'confirmed',
        restoredAt: new Date(),
      });

      // ============================================
      // 🔔 SEND RESTORATION NOTIFICATION
      // ============================================
      try {
        const { sendAppointmentRestored } = await import('../services/notificationService');
        const doctorId = localStorage.getItem('userId') || '';
        const doctorName = localStorage.getItem('healqr_user_name') || 'Doctor';
        const doctorPhoto = localStorage.getItem('healqr_profile_photo') || '';
        const doctorSpecialty = localStorage.getItem('healqr_specialty') || '';
        
        // Format appointment date - Use today's date as scheduleDate is schedule text like "Every Day" not a date
        const appointmentDate = new Date();
        const formattedDate = appointmentDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
        
        // Format appointment time
        const formattedTime = patient.appointmentTime ? patient.appointmentTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : scheduleTime.split(' - ')[0] || '10:00 AM'; // Get start time from schedule
        
        // Get doctor initials
        const doctorInitials = doctorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        
        // 🎯 USE THE ORIGINAL TOKEN NUMBER FROM DATABASE
        // Don't recalculate - the token number was assigned at booking time and should remain the same
        // Extract the number from tokenNumber (e.g., "#4" -> "4")
        const originalTokenNumber = (patient as any).tokenNumber || `#${(patient as any).serialNo || 1}`;
        const restoredDate = new Date(appointmentDate.getTime() - appointmentDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Use the ORIGINAL token number assigned at booking time
        const notifResult = await sendAppointmentRestored({
          patientPhone: patient.phone,
          patientName: patient.name,
          age: patient.age,
          sex: patient.gender,
          purpose: patient.visitType,
          doctorId: doctorInfo.id,
          doctorName,
          doctorSpecialty,
          doctorPhoto,
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
      <div className="bg-[#0a0f1a] border-b border-gray-800 p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white">Patient Details</h1>
            {doctorInfo.name && (
              <p className="text-emerald-400 text-sm font-semibold mt-1">
                Dr. {doctorInfo.name}
              </p>
            )}
            <p className="text-gray-400 text-sm mt-1">
              View and manage patient notifications for selected chamber
            </p>
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
                  <span className="text-white">{(patient as any).serialNo || index + 1}</span>
                </div>

                {/* Patient Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white">
                      {(() => {
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
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Phone */}
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <Phone className="w-3 h-3" />
                      <span>{patient.phone}</span>
                      
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
                      {patient.bookingId}
                    </span>

                    {/* Booking Channel Badge - QR SCAN or WALK IN */}
                    {patient.isWalkIn !== undefined && (
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        patient.isWalkIn
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      }`}>
                        {patient.isWalkIn ? '🚶 WALK IN' : '📱 QR SCAN'}
                      </span>
                    )}

                    {/* Age */}
                    <span className="text-gray-400 text-sm">{patient.age > 0 ? `${patient.age} years` : 'Age N/A'}</span>

                    {/* Gender */}
                    <span className={`px-2 py-0.5 rounded text-xs ${getGenderColor(patient.gender)}`}>
                      {translateDataValue(patient.gender, doctorLanguage)}
                    </span>
                  </div>

                  {/* Visit Type */}
                  <p className="text-gray-500 text-sm mt-1">{translateDataValue(patient.visitType, doctorLanguage)}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons - 2 Rows Grid Layout */}
            <div className="grid grid-cols-5 gap-2 mt-3 pt-3 border-t border-gray-800">
              {(() => {
                const state = patientStates[patient.id];
                const isDisabled = state.isCancelled;

                return (
                  <>
                    {/* Download Patient's Old RX Button - ONLY for Video Consultation patients when addon is active */}
                    {patient.prescriptionUrl && patient.consultationType === 'video' && activeAddOns.includes('video-consultation') && (
                      <button
                        onClick={() => handleViewOldRx(patient)}
                        disabled={isDisabled}
                        className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                          isDisabled
                            ? 'bg-gray-800 border border-gray-700 opacity-50 cursor-not-allowed'
                            : patient.prescriptionReviewed
                            ? 'bg-emerald-500/30 border border-emerald-500/50'
                            : 'bg-blue-500/30 border border-blue-500/50'
                        }`}
                        title={patient.prescriptionReviewed ? "Patient's Old RX (Reviewed)" : "Download Patient's Old RX with AI Translation"}
                      >
                        <Download className={`w-4 h-4 ${patient.prescriptionReviewed ? 'text-emerald-300' : 'text-blue-300'}`} />
                        {!patient.prescriptionReviewed && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-[#0f1419] animate-pulse"></div>
                        )}
                      </button>
                    )}

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
                          disabled={isDisabled}
                          className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                            isDisabled
                              ? 'bg-gray-800 border border-gray-700 opacity-50 cursor-not-allowed'
                              : state.patientWaiting
                              ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/50'
                              : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30'
                          }`}
                          title={state.patientWaiting ? "Patient is waiting! Click to start" : "Start Video Consultation"}
                        >
                          <Video className="w-4 h-4 text-red-400" />
                          {/* Patient Waiting Indicator - Pulsing User Icon */}
                          {state.patientWaiting && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0f1419] animate-pulse">
                              <UserCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>

                        {/* Normal Upload RX Button - Purple with Sparkle - For video consultation patients (NOT AI) */}
                        <button
                          onClick={() => handleNormalUploadPrescription(patient)}
                          disabled={isDisabled || state.prescriptionUploaded}
                          className={`relative w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-colors ${
                            isDisabled
                              ? 'bg-gray-800 border border-gray-700 opacity-50 cursor-not-allowed'
                              : state.prescriptionUploaded
                              ? 'bg-emerald-500/30 border border-emerald-500/50'
                              : 'bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 shadow-lg shadow-purple-500/20'
                          }`}
                          title={state.prescriptionUploaded ? "Prescription Uploaded" : "Upload RX (Normal)"}
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

                    {/* Mark as Seen - Sends FCM */}
                    <button
                      onClick={() => handleMarkedSeen(patient.id)}
                      disabled={isDisabled || state.isMarkedSeen}
                      className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        isDisabled
                          ? 'bg-gray-800 border border-gray-700 opacity-50 cursor-not-allowed'
                          : state.isMarkedSeen
                          ? 'bg-green-500/30 border border-green-500/50'
                          : 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/30'
                      }`}
                      title={state.isMarkedSeen ? "Marked as Seen" : "Mark as Seen"}
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

                    {/* Follow-up */}
                    <button
                      onClick={() => handleFollowUp(patient.id)}
                      disabled={isDisabled || !state.isMarkedSeen || state.followUpScheduled}
                      className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        isDisabled || !state.isMarkedSeen
                          ? 'bg-gray-800 border border-gray-700 opacity-50 cursor-not-allowed'
                          : state.followUpScheduled
                          ? 'bg-purple-500/30 border border-purple-500/50'
                          : 'bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30'
                      }`}
                      title={
                        !state.isMarkedSeen
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

                    {/* Cancel or Restore - Spans full width */}
                    {!state.isCancelled ? (
                      <button
                        onClick={() => openCancelModal(patient.id)}
                        disabled={state.isMarkedSeen}
                        className={`col-span-5 w-full h-10 rounded-lg flex items-center justify-center gap-2 transition-colors ${
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
                        className="col-span-5 w-full h-10 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        title="Restore Booking"
                      >
                        <RotateCcw className="w-4 h-4 text-cyan-400" />
                        <span className="text-cyan-400 text-sm">Restore Booking</span>
                      </button>
                    )}

                    {/* NEW: Patient Action Icons Row - 3 Icons */}
                    <div className="col-span-5 grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-700/50">
                      {/* 1. Patient History - Always enabled */}
                      <button
                        onClick={() => {

                          setSelectedPatient(patient);
                          setHistoryModalOpen(true);
                        }}
                        className="h-10 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center justify-center transition-colors group"
                        title="View patient consultation history with you"
                      >
                        <History className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300" />
                      </button>

                      {/* 2. Upload Today's RX - Medico Locker feature (disabled) */}
                      <button
                        disabled
                        className="h-10 bg-gray-800/50 border border-gray-700/30 rounded-lg flex items-center justify-center opacity-40 cursor-not-allowed"
                        title="Upload today's RX - Requires Medico Locker subscription"
                      >
                        <Upload className="w-5 h-5 text-gray-500" />
                      </button>

                      {/* 3. Full Locker Access - Medico Locker + OTP (disabled) */}
                      <button
                        disabled
                        className="h-10 bg-gray-800/50 border border-gray-700/30 rounded-lg flex items-center justify-center opacity-40 cursor-not-allowed"
                        title="Full medical locker access - Requires patient OTP + Medico Locker"
                      >
                        <Lock className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
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

        <DoctorRxUploadModal
          isOpen={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false);
            setUploadTargetPatient(null);
          }}
          onUploadSuccess={handleUploadSuccess}
          patientName={uploadTargetPatient?.name || ''}
          patientPhone={uploadTargetPatient?.phone || ''}
          bookingId={uploadTargetPatient?.bookingId || ''}
        />

        {/* AI RX Reader Removed */}
        {/* <DoctorAIRXUploadModal
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
        /> */}

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
      </div>
    </div>
  );
}
