// HealQR PWA - Optimized with Lazy Loading
import { useState, useEffect, Suspense, lazy } from "react";
import { auth, db } from "./lib/firebase/config";
import { AuthService } from "./lib/firebase/auth.service";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { toast, Toaster } from "sonner";

// Critical Imports (Keep these static for fast initial paint)
import LandingPage from "./components/LandingPage";
import PrototypeModeBanner from "./components/PrototypeModeBanner";
import { onForegroundMessage, ensureFCMInitialized } from "./services/fcm.service";
import { getActivityTracker } from "./utils/activityTracker";
import { getSessionPersistence } from "./utils/sessionPersistence";
import type { Language } from "./utils/translations";
import type { PatientFormData } from "./components/PatientDetailsForm";

// Lazy Load Heavy Components
const SignUp = lazy(() => import("./components/SignUp"));
const QRCodeSuccess = lazy(() => import("./components/QRCodeSuccess"));
const Login = lazy(() => import("./components/Login"));
const DoctorDashboard = lazy(() => import("./components/DoctorDashboard"));
const ProfileManager = lazy(() => import("./components/ProfileManager"));
const QRManager = lazy(() => import("./components/QRManager"));
const ScheduleManager = lazy(() => import("./components/ScheduleManager"));
const TodaysSchedule = lazy(() => import("./components/TodaysSchedule"));
const AdvanceBooking = lazy(() => import("./components/AdvanceBooking"));
const PatientDetails = lazy(() => import("./components/PatientDetails"));
const PreviewCenter = lazy(() => import("./components/PreviewCenter"));
const Analytics = lazy(() => import("./components/Analytics"));
const Report = lazy(() => import("./components/Report"));
const LanguageSelection = lazy(() => import("./components/LanguageSelection"));
const BookingMiniWebsite = lazy(() => import("./components/BookingMiniWebsite"));
const SelectDate = lazy(() => import("./components/SelectDate"));
const SelectChamber = lazy(() => import("./components/SelectChamber"));
const PatientDetailsForm = lazy(() => import("./components/PatientDetailsForm"));
const BookingConfirmation = lazy(() => import("./components/BookingConfirmation"));
const PatientReviewSubmission = lazy(() => import("./components/PatientReviewSubmission"));
const ReminderNotificationsDemo = lazy(() => import("./components/ReminderNotificationsDemo"));
const TemplateUploader = lazy(() => import("./components/TemplateUploader"));
const VideoLibrary = lazy(() => import("./components/VideoLibrary"));
const PrivacyPolicy = lazy(() => import("./components/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./components/TermsOfService"));
const RefundPolicy = lazy(() => import("./components/RefundPolicy"));
const AdminLogin = lazy(() => import("./components/AdminLogin"));
const AdminPanel = lazy(() => import("./components/AdminPanel"));
const AdminQRGenerator = lazy(() => import("./components/AdminQRGenerator"));
const AdminQRGeneration = lazy(() => import("./components/AdminQRGeneration"));
const AdminQRManagement = lazy(() => import("./components/AdminQRManagement"));
const AssistantAccessManager = lazy(() => import("./components/AssistantAccessManager"));
const LabReferralTrackingManager = lazy(() => import("./components/LabReferralTrackingManager"));
const PersonalizedTemplatesManager = lazy(() => import("./components/PersonalizedTemplatesManager"));
const EmergencyButtonManager = lazy(() => import("./components/EmergencyButtonManager"));
const PatientNewRXViewer = lazy(() => import("./components/PatientNewRXViewer").then(module => ({ default: module.PatientNewRXViewer })));
const ConsultationCompletedNotification = lazy(() => import("./components/ConsultationCompletedNotification"));
const FollowUpNotification = lazy(() => import("./components/FollowUpNotification"));
const ReviewRequestNotification = lazy(() => import("./components/ReviewRequestNotification"));
const AppointmentReminderNotification = lazy(() => import("./components/AppointmentReminderNotification"));
const AppointmentCancelledNotification = lazy(() => import("./components/AppointmentCancelledNotification"));
const AppointmentRestoredNotification = lazy(() => import("./components/AppointmentRestoredNotification"));
const AdminAlertNotification = lazy(() => import("./components/AdminAlertNotification"));
const TestingUtilities = lazy(() => import("./components/TestingUtilities"));
const CreatePlaceholderReview = lazy(() => import("./components/CreatePlaceholderReview"));
const LocalStorageDebugger = lazy(() => import("./components/LocalStorageDebugger"));
const AdminTestingPage = lazy(() => import("./components/AdminTestingPage"));
const VerifyEmail = lazy(() => import("./components/VerifyEmail"));
const VerifyLogin = lazy(() => import("./components/VerifyLogin"));
const AssistantLogin = lazy(() => import("./components/AssistantLogin"));
const AdminVerifyLogin = lazy(() => import("./components/AdminVerifyLogin"));
const VerifyWalkin = lazy(() => import("./components/VerifyWalkin"));
const AdvertiserSignUp = lazy(() => import("./components/AdvertiserSignUp"));
const AdvertiserLogin = lazy(() => import("./components/AdvertiserLogin"));
const AdvertiserDashboard = lazy(() => import("./components/AdvertiserDashboard"));
const AdvertiserGateway = lazy(() => import("./components/AdvertiserGateway"));
const UpgradePage = lazy(() => import("./components/UpgradePage"));
const ClinicProfile = lazy(() => import("./components/ClinicProfile"));
const PatientSearch = lazy(() => import("./components/PatientSearch"));
const ClinicSignUp = lazy(() => import("./components/ClinicSignUp"));
const ClinicLogin = lazy(() => import("./components/ClinicLogin"));
const ClinicDashboard = lazy(() => import("./components/ClinicDashboard"));
const PatientLogin = lazy(() => import("./components/PatientLogin"));
const PatientDashboardNew = lazy(() => import("./components/PatientDashboardNew"));

// Loading Component
const PageLoader = () => (
  <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500 mx-auto mb-4"></div>
      <p className="text-white text-lg">Loading...</p>
    </div>
  </div>
);

// Generate unique booking ID (HQL-XXXXXX format)
const generateBookingId = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const uniqueId = (timestamp.slice(-3) + random).slice(0, 6);
  return `HQL-${uniqueId}`;
};

// Generate serial number with leading zeros
const generateSerialNo = (): string => {
  const timestamp = Date.now();
  const serialNumber = (timestamp % 10000).toString().padStart(4, '0');
  return serialNumber;
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<
    | "landing"
    | "signup"
    | "qr-success"
    | "verify-email"
    | "verify-login"
    | "assistant-login"
    | "admin-verify"
    | "login"
    | "dashboard"
    | "profile-manager"
    | "qr-manager"
    | "schedule-manager"
    | "todays-schedule"
    | "advance-booking"
    | "patient-details"
    | "preview-center"
    | "emergency-button"
    | "analytics"
    | "reports"
    | "template-uploader"
    | "reminder-notifications"
    | "booking-language"
    | "booking-mini-website"
    | "booking-select-date"
    | "booking-select-chamber"
    | "booking-patient-details"
    | "booking-confirmation"
    | "patient-review-submission"
    | "video-library"
    | "privacy-policy"
    | "terms-of-service"
    | "refund-policy"
    | "admin-login"
    | "admin-panel"
    | "admin-qr-generator"
    | "admin-qr-generation"
    | "admin-qr-management"
    | "admin-testing"
    | "premium-addons"
    | "assistant-access"
    | "lab-referral-tracking"
    | "personalized-templates"
    | "testing-utilities"
    | "consultation-completed"
    | "follow-up"
    | "review-request"
    | "appointment-reminder"
    | "appointment-cancelled"
    | "appointment-restored"
    | "admin-alert"
    | "verify-walkin"
    | "advertiser-signup"
    | "advertiser-login"
    | "advertiser-dashboard"
    | "upgrade"
    | "clinic-profile"
    | "patient-search"
    | "clinic-signup"
    | "clinic-login"
    | "clinic-dashboard"
    | "patient-login"
    | "patient-dashboard"
    | "patient-history"
  >("landing");
  const [notifData, setNotifData] = useState<{
    bookingId?: string; // For smart data fetching from Firestore
    patientName: string;
    doctorName: string;
    date: string;
    time: string;
    message?: string;
    specialization?: string;
    doctorInitials?: string;
    location?: string;
    serialNo?: string;
    uniqueId?: string;
    reason?: string;
    language?: string;
  } | null>(null);

  const [chatToken, setChatToken] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userDob, setUserDob] = useState("");
  const [userPinCode, setUserPinCode] = useState("");
  const [userQrNumber, setUserQrNumber] = useState("");
  const [userDoctorCode, setUserDoctorCode] = useState("");
  const [userCompanyName, setUserCompanyName] = useState("");
  const [userProfilePhoto, setUserProfilePhoto] = useState("");
  const [userProfileData, setUserProfileData] = useState<{
    profileImage: string;
    name: string;
    degrees: string[];
    specialities: string[];
  }>({
    profileImage: "",
    name: "",
    degrees: [],
    specialities: []
  });
  const [useDrPrefix, setUseDrPrefix] = useState(true);
  const [adminEmail, setAdminEmail] = useState("");
  const [videoLibrarySource, setVideoLibrarySource] = useState<
    "landing" | "dashboard"
  >("landing");
  const [isAuthInitialized, setIsAuthInitialized] =
    useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] =
    useState(true);
  const [isBookingMode, setIsBookingMode] = useState(false);
  const [isTestBookingMode, setIsTestBookingMode] = useState(false);

  const [patientNewRxViewerOpen, setPatientNewRxViewerOpen] =
    useState(false);
  const [patientNewRxData, setPatientNewRxData] = useState<{
    name: string;
    language: "english" | "hindi" | "bengali";
    userId?: string;
    newRxFiles: Array<{
      id: string;
      fileName: string;
      fileUrl: string;
      uploadDate: string;
      viewed: boolean;
      aiAnalysis: {
        medicines: Array<{
          name: string;
          dosage: string;
          frequency: string;
          duration: string;
        }>;
        translation: string;
        confidence: number;
      };
    }>;
  } | null>(null);

  const [activeAddOns, setActiveAddOns] = useState<string[]>([]);

  // Subscription data state
  const [subscriptionData, setSubscriptionData] = useState<{
    bookingsCount: number;
    bookingsLimit: number;
    daysRemaining: number;
    trialEndDate: Date | null;
    trialStartDate: Date | null;
  }>({ bookingsCount: 0, bookingsLimit: 100, daysRemaining: 10, trialEndDate: null, trialStartDate: null });

  // Doctor stats state (cumulative, never decreases)
  const [doctorStats, setDoctorStats] = useState<{
    averageRating: number;
    totalReviews: number;
  }>({ averageRating: 0, totalReviews: 0 });

  // Real-time listener for doctor profile and subscription data
  useEffect(() => {
    let unsubscribe: () => void;

    const setupRealtimeListener = async () => {
      if (currentPage === 'dashboard' && auth?.currentUser && db) {
        try {
          const { doc, onSnapshot } = await import('firebase/firestore');
          unsubscribe = onSnapshot(doc(db, 'doctors', auth.currentUser.uid), (docSnapshot) => {
            if (docSnapshot.exists()) {
              const data = docSnapshot.data();
              // Reload profile photo
              if (data.profileImage) {
                setUserProfilePhoto(data.profileImage);
              }

              // Reload doctor's preferred language
              if (data.preferredLanguage) {
                setDoctorPreferredLanguage(data.preferredLanguage);
              }

              // Reload full profile data
              setUserProfileData({
                profileImage: data.profileImage || "",
                name: data.name || userName || "Doctor Name",
                degrees: data.degrees || [],
                specialities: data.specialities || []
              });

              // Load Dr. prefix preference
              if (data.useDrPrefix !== undefined) {
                setUseDrPrefix(data.useDrPrefix);
              }

              // Reload subscription data with corrected trial calculation
              const createdAt = data.createdAt?.toDate() || new Date();
              const correctTrialEnd = new Date(createdAt);
              correctTrialEnd.setFullYear(correctTrialEnd.getFullYear() + 100); // FREE FOREVER: 100 years

              const currentDate = new Date();
              const daysLeft = Math.max(0, Math.ceil((correctTrialEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));

              setSubscriptionData({
                bookingsCount: data.bookingsCount || 0,
                bookingsLimit: 1000000, // FREE FOREVER: 1 Million bookings
                daysRemaining: daysLeft,
                trialEndDate: correctTrialEnd,
                trialStartDate: createdAt
              });
            }
          }, (error) => {
            console.error('❌ Error in real-time listener:', error);
          });
        } catch (error) {
          console.error('❌ Error setting up real-time listener:', error);
        }
      }
    };

    setupRealtimeListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentPage, auth?.currentUser]);

  const [bookingLanguage, setBookingLanguage] =
    useState<Language>("english");
  const [doctorPreferredLanguage, setDoctorPreferredLanguage] =
    useState<Language>("english");
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    null,
  );
  const [selectedSlot, setSelectedSlot] = useState<
    string | null
  >(null);
  const [selectedChamber, setSelectedChamber] = useState<
    string | null
  >(null);
  const [consultationType, setConsultationType] = useState<
    'chamber' | 'video' | null
  >(null);
  const [patientFormData, setPatientFormData] =
    useState<PatientFormData | null>(null);
  const [bookingConfirmed, setBookingConfirmed] =
    useState(false);
  const [uploadedReviews, setUploadedReviews] = useState<any[]>(
    [],
  );
  const [incomingReviews, setIncomingReviews] = useState<any[]>(
    [],
  );
  const [selfCreatedReviews, setSelfCreatedReviews] = useState<any[]>(
    [],
  );
  const [supportRequests, setSupportRequests] = useState<any[]>(
    [],
  );
  const [adminTestimonials, setAdminTestimonials] = useState<
    any[]
  >([]);
  const [showCreatePlaceholderModal, setShowCreatePlaceholderModal] = useState(false);
  const [showLocalStorageDebugger, setShowLocalStorageDebugger] = useState(false);

  // Chamber Schedule Data - Shared between TodaysSchedule and Dashboard
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
  }>>([]);

  // Doctor Schedule Settings (for booking flow)
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(15);
  const [globalBookingEnabled, setGlobalBookingEnabled] = useState(true);
  const [plannedOffPeriods, setPlannedOffPeriods] = useState<Array<{
    startDate: string;
    endDate: string;
    status: string;
  }>>([]);
  const [doctorSchedules, setDoctorSchedules] = useState<Array<{
    days: string[];
    frequency: string;
  }>>([]);
  const [bookingDoctorName, setBookingDoctorName] = useState('');
  const [bookingDoctorSpecialty, setBookingDoctorSpecialty] = useState('');
  const [bookingDoctorPhoto, setBookingDoctorPhoto] = useState('');
  const [bookingDoctorDegrees, setBookingDoctorDegrees] = useState<string[]>([]);
  const [bookingDoctorUseDrPrefix, setBookingDoctorUseDrPrefix] = useState(true);
  const [doctorChambers, setDoctorChambers] = useState<Array<{
    id: number;
    chamberName: string;
    chamberAddress: string;
    isActive?: boolean;
  }>>([]);

  // Check for email verification link on mount - RUNS FIRST
  useEffect(() => {
    const handleUrlParams = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const oobCode = urlParams.get('oobCode');
    const doctorId = urlParams.get('doctorId');
    const clinicId = urlParams.get('clinicId');
    const pageParam = urlParams.get('page');
    const pathname = window.location.pathname;
    const hash = window.location.hash;
    const fullUrl = window.location.href;

    // Handle verify visit deep link
    if (pathname.startsWith('/verify-visit/')) {
      const bookingId = pathname.split('/verify-visit/')[1];
      if (bookingId) {
        setNotifData({
          bookingId,
          patientName: '',
          doctorName: '',
          date: '',
          time: ''
        });
        setCurrentPage('verify-walkin');
        return;
      }
    }

    // Handle Patient RX deep link (AI RX Notification Click)
    if (pathname.startsWith('/patient/rx/')) {
      const notificationId = pathname.split('/patient/rx/')[1];
      if (notificationId && db) {
        try {
          const notifDoc = await getDoc(doc(db, 'notifications', notificationId));
          if (notifDoc.exists()) {
            const data = notifDoc.data();
            // Transform to NewRXFile format
            const newRxFile = {
              id: notifDoc.id,
              fileName: `Prescription_${data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()}`,
              fileUrl: Array.isArray(data.prescriptionImages) ? data.prescriptionImages[0] : (data.prescriptionImages || ''),
              uploadDate: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
              viewed: data.read || false,
              doctorName: data.doctorName || 'Doctor',
              consultationDate: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString(),
              aiAnalysis: {
                medicines: [],
                diagnosis: '',
                instructions: data.decodedText || '',
                confidence: data.ocrConfidence || 0,
                translation: ''
              }
            };

            setPatientNewRxData({
              name: data.patientName || 'Patient',
              language: data.language || 'english',
              userId: data.userId || data.patientId,
              newRxFiles: [newRxFile]
            });
            setPatientNewRxViewerOpen(true);
            // Stay on landing or dashboard behind the modal
            if (!currentPage || currentPage === 'landing') {
               // Do nothing, let it be landing
            }
            return;
          }
        } catch (e) {
          console.error("Error fetching RX", e);
        }
      }
    }

    // Handle Clinic QR Scan (ONLY if no doctor selected yet)
    if (clinicId && !doctorId) {
      sessionStorage.setItem('booking_clinic_id', clinicId);
      setCurrentPage('clinic-profile');
      return;
    }

    // Handle Page Params for New Routes
    if (pageParam === 'patient-search') {
      setCurrentPage('patient-search');
      return;
    } else if (pageParam === 'clinic-signup') {
      setCurrentPage('clinic-signup');
      return;
    } else if (pageParam === 'clinic-login') {
      setCurrentPage('clinic-login');
      return;
    } else if (pageParam === 'clinic-dashboard') {
      setCurrentPage('clinic-dashboard');
      return;
    } else if (pageParam === 'patient-login') {
      setCurrentPage('patient-login');
      return;
    } else if (pageParam === 'patient-dashboard') {
      setCurrentPage('patient-dashboard');
      return;
    } else if (pageParam === 'patient-history') {
      setCurrentPage('patient-history');
      return;
      // But user asked for it. I'll map it to 'login' for now but we need a distinct one.
      // Actually, let's just use 'login' page but maybe pass a prop?
      // Or better, let's create a placeholder for now since I didn't create PatientLogin yet.
      // Wait, I can just use the existing Login component and maybe add a type?
      // No, let's stick to the plan. I'll add the route but maybe redirect to landing if not ready.
      // Actually, I'll just leave it for now as I haven't created PatientLogin.
      // I'll create a simple PatientLogin placeholder if needed.
      // For now, let's just handle the ones I created.
    }

    // Handle deep linking for review page
    if (pageParam === 'review') {
      setCurrentPage('patient-review-submission');
    } else if (pageParam === 'consultation-completed') {
      const bookingId = urlParams.get('bookingId') || '';
      const patientName = urlParams.get('patientName') || '';
      const doctorName = urlParams.get('doctorName') || '';
      const doctorSpecialty = urlParams.get('doctorSpecialty') || '';
      const doctorInitials = urlParams.get('doctorInitials') || '';
      const doctorPhoto = urlParams.get('doctorPhoto') || '';
      const clinicName = urlParams.get('clinicName') || '';
      const consultationDate = urlParams.get('consultationDate') || '';
      const consultationTime = urlParams.get('consultationTime') || '';
      const language = urlParams.get('language') || 'en';

      setNotifData({
        bookingId,
        patientName,
        doctorName,
        specialization: doctorSpecialty,
        doctorInitials,
        message: clinicName, // clinicName stored in message field
        date: consultationDate,
        time: consultationTime
      });

      if (language === 'bengali' || language === 'bn') setBookingLanguage('bengali');
      else if (language === 'hindi' || language === 'hi') setBookingLanguage('hindi');
      else setBookingLanguage('english');

      setCurrentPage('consultation-completed');
    } else if (pageParam === 'follow-up') {
      const patientName = urlParams.get('patientName') || '';
      const doctorName = urlParams.get('doctorName') || '';
      const date = urlParams.get('date') || '';
      const message = urlParams.get('message') || '';

      setNotifData({
        patientName,
        doctorName,
        date,
        time: '', // Not needed for follow-up
        message
      });
      setCurrentPage('follow-up');
    } else if (pageParam === 'review-request') {
      const patientName = urlParams.get('patientName') || '';
      const doctorName = urlParams.get('doctorName') || '';
      const date = urlParams.get('date') || '';
      const doctorId = urlParams.get('doctorId');

      if (doctorId) {
        sessionStorage.setItem('booking_doctor_id', doctorId);
      }

      setNotifData({
        patientName,
        doctorName,
        date,
        time: ''
      });
      setCurrentPage('review-request');
    } else if (pageParam === 'reminder' || pageParam === 'appointment-reminder') {
      const patientName = urlParams.get('patientName') || '';
      const doctorName = urlParams.get('doctorName') || '';
      const date = urlParams.get('date') || '';
      const time = urlParams.get('time') || '';
      const location = urlParams.get('location') || '';
      const serialNumber = urlParams.get('serialNumber') || '';
      const clinicName = urlParams.get('clinicName') || '';

      setNotifData({
        patientName,
        doctorName,
        date,
        time,
        message: location, // Storing location in message field
        serialNumber,
        clinicName
      });
      setCurrentPage('appointment-reminder');
    }
    // Cancellation routing
    else if (pageParam === 'appointment-cancelled' || pageParam === 'cancellation') {
      const bookingId = urlParams.get('bookingId') || '';
      const patientName = urlParams.get('patientName') || '';
      const doctorName = urlParams.get('doctorName') || '';
      const date = urlParams.get('date') || '';
      const time = urlParams.get('time') || '';
      const chamber = urlParams.get('chamber') || '';
      const language = urlParams.get('language') || 'english';

      setNotifData({
        bookingId,
        patientName,
        doctorName,
        date,
        time,
        message: chamber,
        language
      });
      setCurrentPage('appointment-cancelled');
    }
    // Restoration routing
    else if (pageParam === 'restoration' || pageParam === 'appointment-restored') {
      const bookingId = urlParams.get('bookingId') || '';
      const patientName = urlParams.get('patientName') || '';
      const doctorName = urlParams.get('doctorName') || '';
      const date = urlParams.get('date') || '';
      const time = urlParams.get('time') || '';
      const chamber = urlParams.get('chamber') || '';
      const serialNo = urlParams.get('serialNo') || '';
      const uniqueId = urlParams.get('uniqueId') || '';
      const language = urlParams.get('language') || 'english';

      setNotifData({
        bookingId,
        patientName,
        doctorName,
        date,
        time,
        message: chamber,
        serialNumber: serialNo,
        clinicName: uniqueId,
        language
      });
      setCurrentPage('appointment-restored');
    }
    else if (pageParam === 'admin-alert') {
      const doctorName = urlParams.get('doctorName') || '';
      const eventType = urlParams.get('eventType') || 'System Alert';
      const severity = urlParams.get('severity') || 'High';

      setNotifData({
        patientName: '', // Not used for admin alerts
        doctorName,
        date: eventType, // Storing eventType in date field
        time: severity, // Storing severity in time field
        message: '' // Not used
      });
      setCurrentPage('admin-alert');
    }

    // Check if patient is scanning QR code (has doctorId parameter)
    // BUT: If there's a page parameter (notification deep link), prioritize that over booking flow
    if (doctorId && !pageParam) {
      setIsBookingMode(true); // Set flag to prevent dashboard redirect

      // If doctorId is "SCAN", look up doctor by QR number
      if (doctorId === 'SCAN') {
        const qrNumber = urlParams.get('qrNumber');
        if (qrNumber && db) {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const doctorsRef = collection(db, 'doctors');
          const q = query(doctorsRef, where('qrNumber', '==', qrNumber.toUpperCase()));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const actualDoctorId = querySnapshot.docs[0].id;
            sessionStorage.setItem('booking_doctor_id', actualDoctorId);

            // Load doctor data
            const data = querySnapshot.docs[0].data();
            setBookingDoctorName(data.name || '');
            setBookingDoctorSpecialty(data.specialities?.[0] || '');
            setBookingDoctorPhoto(data.profileImage || '');
            setBookingDoctorDegrees(data.degrees || []);
            setBookingDoctorUseDrPrefix(data.useDrPrefix !== false);

            // Load chambers
            if (data.chambers && data.chambers.length > 0) {
              setDoctorChambers(data.chambers);
            }

            // Load schedule settings
            setMaxAdvanceDays(data.maxAdvanceBookingDays || 30);
            setGlobalBookingEnabled(data.globalBookingEnabled !== false);

            // Load blocked days
            if (data.plannedOffPeriods && Array.isArray(data.plannedOffPeriods)) {
              const periods = data.plannedOffPeriods.map((p: any) => ({
                startDate: p.startDate,
                endDate: p.endDate,
                status: p.status || 'active'
              }));
              setPlannedOffPeriods(periods);
            }

            // Load schedules
            if (data.schedules && Array.isArray(data.schedules)) {
              setDoctorSchedules(data.schedules);
            }
          } else {
            console.error('No doctor found with QR number:', qrNumber);
          }
        }
      } else {
        // Regular doctorId provided
        sessionStorage.setItem('booking_doctor_id', doctorId);

        // Load doctor data immediately
        if (db) {
          getDoc(doc(db, 'doctors', doctorId)).then(doctorDoc => {
          if (doctorDoc.exists()) {
            const data = doctorDoc.data();
            setBookingDoctorName(data.name || '');
            setBookingDoctorSpecialty(data.specialities?.[0] || '');
            setBookingDoctorPhoto(data.profileImage || '');
            setBookingDoctorDegrees(data.degrees || []);
            setBookingDoctorUseDrPrefix(data.useDrPrefix !== false);

            // Load chambers
            if (data.chambers && data.chambers.length > 0) {
              setDoctorChambers(data.chambers);
            }

            // Load schedule settings
            setMaxAdvanceDays(data.maxAdvanceBookingDays || 30);
            setGlobalBookingEnabled(data.globalBookingEnabled !== false);

            // Load blocked days (plannedOffPeriods)
            if (data.plannedOffPeriods && Array.isArray(data.plannedOffPeriods)) {
              const periods = data.plannedOffPeriods.map((p: any) => ({
                startDate: p.startDate,
                endDate: p.endDate,
                status: p.status || 'active'
              }));
              setPlannedOffPeriods(periods);
            }

            // Load schedules
            if (data.schedules && Array.isArray(data.schedules)) {
              setDoctorSchedules(data.schedules);
            }
          }
        }).catch(error => {
          console.error('❌ Error loading doctor data:', error);
        });
        }
      }

      // Only go to booking language if NOT a deep link
      if (pageParam !== 'review') {
        setCurrentPage('booking-language');
      }
      return;
    }

    // Detect Firebase email link OR specific verification paths
    if (pathname.includes('/admin-verify')) {
      setCurrentPage('admin-verify');
    } else if (pathname.includes('/assistant-login')) {
      setCurrentPage('assistant-login');
    } else if (pathname.includes('/verify-login')) {
      setCurrentPage('verify-login');
    } else if (pathname.includes('/verify-visit/')) {
      // Extract booking ID from path
      const pathParts = pathname.split('/verify-visit/');
      if (pathParts.length > 1) {
        const bookingId = pathParts[1];
        setNotifData({
          bookingId,
          patientName: '', // Will be loaded by component
          doctorName: '',
          date: '',
          time: ''
        });
        setCurrentPage('verify-walkin');
      }
    } else if ((mode === 'signIn' && oobCode) || pathname.includes('/verify-email') || hash.includes('#verify')) {
      setCurrentPage('verify-email');
    }
    };

    handleUrlParams();
  }, []);

  // Firebase Authentication State Listener - CRITICAL for preventing auto-logout on refresh
  useEffect(() => {
    // Check if auth is available (not in DEMO MODE)
    if (!auth) {
      // Silent DEMO MODE - auth will be initialized when Firebase credentials are added
      setIsAuthInitialized(true);
      return () => {}; // Return empty cleanup function
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      // CRITICAL: Check if we're on verification pages, booking flow, or notification templates - don't redirect!
      const urlParams = new URLSearchParams(window.location.search);
      const isVerificationLink = urlParams.get('mode') === 'signIn' && urlParams.get('oobCode');
      const hasBookingDoctorId = urlParams.get('doctorId') || sessionStorage.getItem('booking_doctor_id');
      const pageParam = urlParams.get('page');
      const isNotificationPage = pageParam && (
        pageParam === 'consultation-completed' ||
        pageParam === 'follow-up' ||
        pageParam === 'review-request' ||
        pageParam === 'appointment-reminder' ||
        pageParam === 'appointment-cancelled' ||
        pageParam === 'cancellation' ||
        pageParam === 'appointment-restored' ||
        pageParam === 'restoration' ||
        pageParam === 'admin-alert'
      );

      const isVerifyVisit = window.location.pathname.includes('/verify-visit/');
      const isClinicPage = currentPage === 'clinic-login' || currentPage === 'clinic-signup' || pageParam === 'clinic-login' || pageParam === 'clinic-signup';
      const isAdvertiserPage = currentPage === 'advertiser-login' || currentPage === 'advertiser-signup' || pageParam === 'advertiser-login' || pageParam === 'advertiser-signup';

      if (isVerificationLink || isBookingMode || hasBookingDoctorId || isNotificationPage || isVerifyVisit || isClinicPage || isAdvertiserPage || currentPage === 'verify-email' || currentPage === 'verify-login' || currentPage === 'assistant-login' || currentPage === 'admin-verify' || currentPage === 'verify-walkin' || currentPage.startsWith('booking-')) {
        setIsAuthInitialized(true);
        return;
      }

      if (user) {
        // Check localStorage first for quick routing (set by VerifyLogin)
        const isClinicFromStorage = localStorage.getItem('healqr_is_clinic') === 'true';
        
        if (isClinicFromStorage) {
          console.log('✅ Clinic user detected from localStorage - routing to clinic dashboard');
          setCurrentPage('clinic-dashboard');
          setIsAuthInitialized(true);
          return;
        }
        
        // Check if user is a clinic in Firestore (fallback if localStorage not set)
        if (db) {
          try {
            const clinicDoc = await getDoc(doc(db, 'clinics', user.uid));
            if (clinicDoc.exists()) {
              console.log('✅ Clinic user detected from Firestore - routing to clinic dashboard');
              localStorage.setItem('healqr_is_clinic', 'true'); // Cache for next time
              setCurrentPage('clinic-dashboard');
              setIsAuthInitialized(true);
              return; // CRITICAL: Stop here, don't load doctor profile
            }
          } catch (e) {
            console.error("Error checking clinic status", e);
          }
        }

        // Check if user is an advertiser
        if (db) {
          try {
            const advertiserDoc = await getDoc(doc(db, 'advertisers', user.uid));
            if (advertiserDoc.exists()) {
              setCurrentPage('advertiser-dashboard');
              setIsAuthInitialized(true);
              return;
            }
          } catch (e) {
            console.error("Error checking advertiser status", e);
          }
        }

        // User is signed in - restore session
        const storedEmail = localStorage.getItem('healqr_user_email');
        const storedName = localStorage.getItem('healqr_user_name');

        setUserEmail(storedEmail || user.email || '');
        setUserName(storedName || user.displayName || user.email?.split('@')[0] || '');

        // Check if already marked as assistant in localStorage (set by VerifyLogin)
        const isAssistant = localStorage.getItem('healqr_is_assistant') === 'true';

        if (isAssistant) {
          // Check if assistant is still active - CRITICAL for deactivation
          const assistantDoctorId = localStorage.getItem('healqr_assistant_doctor_id');
          const assistantEmail = storedEmail || user.email;

          if (db && assistantEmail && assistantDoctorId) {
            try {
              const assistantsRef = collection(db, 'assistants');
              const assistantQuery = query(assistantsRef, where('assistantEmail', '==', assistantEmail), where('doctorId', '==', assistantDoctorId));
              const assistantSnap = await getDocs(assistantQuery);

              if (assistantSnap.empty || !assistantSnap.docs[0].data().isActive) {
                // Assistant not found or deactivated - LOGOUT immediately
                toast.error('Access Deactivated', {
                  description: 'Your assistant access has been deactivated by the doctor',
                  duration: 5000
                });

                // Clear all session data
                localStorage.clear();

                // Redirect to landing
                setCurrentPage('landing');
                setIsAuthInitialized(true);
                return;
              }

              // Assistant is active - update lastLoginAt AND sync allowedPages
              const assistantDocRef = doc(db, 'assistants', assistantSnap.docs[0].id);
              const assistantData = assistantSnap.docs[0].data();

              // MIGRATION: Convert old page IDs to new format
              const PAGE_ID_MIGRATION: Record<string, string> = {
                'profile-manager': 'profile',
                'qr-manager': 'qr',
                'schedule-manager': 'schedule',
                'preview-center': 'preview',
                'personalized-template': 'personalized-templates',
              };

              const migratePageIds = (pages: string[]): string[] => {
                return pages.map(pageId => PAGE_ID_MIGRATION[pageId] || pageId);
              };

              // SYNC PERMISSIONS: Update localStorage with latest allowedPages from database (with migration)
              const rawAllowedPages = assistantData.allowedPages || [];
              const migratedPages = migratePageIds(rawAllowedPages);
              localStorage.setItem('healqr_assistant_pages', JSON.stringify(migratedPages));

              // Update database with migrated IDs if they changed
              if (JSON.stringify(rawAllowedPages) !== JSON.stringify(migratedPages)) {
                await updateDoc(assistantDocRef, {
                  allowedPages: migratedPages,
                  lastLoginAt: serverTimestamp()
                });
              } else {
                await updateDoc(assistantDocRef, {
                  lastLoginAt: serverTimestamp()
                });
              }
            } catch (error) {
              console.error('Error checking assistant status:', error);
            }
          }
        } else {
          // Not marked as assistant, clear any stale data
          localStorage.removeItem('healqr_is_assistant');
          localStorage.removeItem('healqr_assistant_pages');
          localStorage.removeItem('healqr_assistant_doctor_id');
        }

        // ✅ CHECK FOR MAJOR BLOCKING (Payment Failure, Trial Expired, Booking Limit)
        if (db) {
          try {
            // For assistants, load the doctor's profile
            const isAssistant = localStorage.getItem('healqr_is_assistant') === 'true';
            const doctorIdToLoad = isAssistant
              ? localStorage.getItem('healqr_assistant_doctor_id') || user.uid
              : user.uid;

            const doctorDoc = await getDoc(doc(db, 'doctors', doctorIdToLoad));
            if (doctorDoc.exists()) {
              const data = doctorDoc.data();

              // Load essential profile data to localStorage and state - ALWAYS sync from Firestore
              if (data.name) {
                localStorage.setItem('healqr_user_name', data.name);
                setUserName(data.name); // ✅ Update state to fix dashboard display
              }
              if (data.qrCode) {
                localStorage.setItem('healqr_qr_code', data.qrCode);
              }
              if (data.qrId) {
                localStorage.setItem('healqr_qr_id', data.qrId);
              }
              if (data.bookingUrl) {
                localStorage.setItem('healqr_booking_url', data.bookingUrl);
              }

              // Load registration data (DOB, PIN Code, QR Number, Doctor Code)
              if (data.dob) {
                setUserDob(data.dob);
              }
              if (data.pinCode) {
                setUserPinCode(data.pinCode);
              }
              if (data.qrNumber) {
                setUserQrNumber(data.qrNumber);
              }
              if (data.doctorCode) {
                setUserDoctorCode(data.doctorCode);
              }
              if (data.companyName) {
                setUserCompanyName(data.companyName);
              }

              // Load profile photo
              if (data.profileImage) {
                setUserProfilePhoto(data.profileImage);
              }

              // Load doctor's preferred language
              if (data.preferredLanguage) {
                setDoctorPreferredLanguage(data.preferredLanguage);
              }

              // Load full profile data for QR Manager
              setUserProfileData({
                profileImage: data.profileImage || "",
                name: data.name || userName || "Doctor Name",
                degrees: data.degrees || [],
                specialities: data.specialities || []
              });

              // Load reviews from Firestore
              if (data.miniWebsiteReviews && Array.isArray(data.miniWebsiteReviews)) {
                setUploadedReviews(data.miniWebsiteReviews);
              }
              if (data.placeholderReviews && Array.isArray(data.placeholderReviews)) {
                setSelfCreatedReviews(data.placeholderReviews);
              }

              // ✅ LOAD PATIENT-SUBMITTED REVIEWS FROM REVIEWS COLLECTION (NEW!)
              try {
                const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
                const reviewsRef = collection(db, 'reviews');
                const q = query(
                  reviewsRef,
                  where('doctorId', '==', user.uid),
                  where('published', '==', false), // Only unpublished reviews (not yet uploaded to mini website)
                  orderBy('createdAt', 'desc')
                );
                const reviewsSnapshot = await getDocs(q);

                const loadedReviews = reviewsSnapshot.docs.slice(0, 5).map(doc => ({
                  id: Date.now() + Math.random(), // Unique ID
                  patientName: doc.data().patientName,
                  rating: doc.data().rating,
                  comment: doc.data().comment,
                  date: doc.data().date,
                  verified: doc.data().verified || true,
                  firestoreId: doc.id, // Store Firestore document ID for later updates
                }));

                setIncomingReviews(loadedReviews);
              } catch (reviewError) {
                console.error('❌ Error loading patient reviews:', reviewError);
              }

              // Load doctor stats (cumulative, never decreases)
              if (data.stats) {
                setDoctorStats({
                  averageRating: data.stats.averageRating || 0,
                  totalReviews: data.stats.totalReviews || 0
                });
              }

              // Load subscription data with corrected trial calculation
              const createdAt = data.createdAt?.toDate() || new Date();

              const correctTrialEnd = new Date(createdAt);
              correctTrialEnd.setFullYear(correctTrialEnd.getFullYear() + 100); // FREE FOREVER: 100 years

              const currentDate = new Date();

              const daysLeft = Math.max(0, Math.ceil((correctTrialEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));

              setSubscriptionData({
                bookingsCount: data.bookingsCount || 0,
                bookingsLimit: 1000000, // FREE FOREVER: 1 Million bookings
                daysRemaining: daysLeft,
                trialEndDate: correctTrialEnd,
                trialStartDate: createdAt
              });

              // If bookingBlocked, check if it's ONLY booking_limit that should redirect
              // Trial expiry should show warning but NOT block access
              if (data.bookingBlocked && false) { // FREE FOREVER: Ignore blocking flags
                // ONLY redirect to upgrade for booking_limit or payment_failed
                // Trial expiry should NOT redirect - just show warning
                if (data.blockReason === 'payment_failed') {
                  toast.error('Payment Failed', {
                    description: 'Complete payment to access the dashboard.',
                    duration: 5000,
                  });
                  setCurrentPage('upgrade');
                  setIsAuthInitialized(true);
                  return;
                } else if (data.blockReason === 'booking_limit') {
                  toast.error('Booking Limit Reached', {
                    description: 'You have used all 100 free bookings. Upgrade to continue accepting appointments.',
                    duration: 5000,
                  });
                  setCurrentPage('upgrade');
                  setIsAuthInitialized(true);
                  return;
                } else if (data.blockReason === 'trial_expired') {
                  // Trial expired - show warning but DO NOT redirect
                  // User can still access dashboard with red warning banner
                  toast.warning('Free Trial Expired', {
                    description: 'Your trial has ended. Upgrade to continue accepting new bookings.',
                    duration: 5000,
                  });
                  // Continue without returning - let user access dashboard
                }
              }
            }
          } catch (error) {
            console.error('Error checking blocking status:', error);
          }
        }

        // ✅ All Firestore data loaded - mark auth as initialized
        setIsAuthInitialized(true);

        // Check if this is after email verification (QR code generated)
        const hasQRCode = localStorage.getItem('healqr_qr_code');
        const isAuthenticated = localStorage.getItem('healqr_authenticated');

        if (hasQRCode && isAuthenticated) {
          // User has QR code - always redirect to dashboard
          // Authenticated users should stay on dashboard unless they explicitly logout
          // BUT: Don't redirect if we're on a notification page (check URL again)
          const currentUrlParams = new URLSearchParams(window.location.search);
          const currentPageParam = currentUrlParams.get('page');
          const isOnNotificationPage = currentPageParam && (
            currentPageParam === 'consultation-completed' ||
            currentPageParam === 'follow-up' ||
            currentPageParam === 'review-request' ||
            currentPageParam === 'appointment-reminder' ||
            currentPageParam === 'appointment-cancelled' ||
            currentPageParam === 'cancellation' ||
            currentPageParam === 'appointment-restored' ||
            currentPageParam === 'restoration' ||
            currentPageParam === 'admin-alert'
          );

          if (isOnNotificationPage) {
            // Don't redirect - notification routing will handle it
          } else if (currentPage === 'login' || currentPage === 'signup' || currentPage === 'landing') {
            // Always redirect login/signup/landing pages to dashboard when authenticated
            setCurrentPage('dashboard');
          }
        }
      } else {
        // Firebase auth is null, but check localStorage for persistent session

        // Check for admin session first
        const isAdminAuthenticated = localStorage.getItem('healqr_admin_authenticated');
        const storedAdminEmail = localStorage.getItem('healqr_admin_email');

        if (isAdminAuthenticated === 'true' && storedAdminEmail && db) {
          // Verify admin is actually authorized in Firestore before allowing access
          try {
            const adminsCollectionRef = doc(db, 'admins', storedAdminEmail.toLowerCase());
            const adminDocSnapshot = await getDoc(adminsCollectionRef);

            let isAuthorized = false;

            if (adminDocSnapshot.exists() && adminDocSnapshot.data()?.isAuthorized === true) {
              isAuthorized = true;
            } else {
              // Check legacy adminProfiles collection as fallback
              const adminProfileRef = doc(db, 'adminProfiles', 'super_admin');
              const adminProfileDoc = await getDoc(adminProfileRef);

              if (adminProfileDoc.exists()) {
                const adminData = adminProfileDoc.data();
                isAuthorized = adminData?.email?.toLowerCase() === storedAdminEmail.toLowerCase();
              }
            }

            if (isAuthorized) {
              // Admin is authorized - maintain login state
              setAdminEmail(storedAdminEmail);

              // If admin is on landing or trying to access admin panel, keep them on admin panel
              if (currentPage === 'landing' || currentPage === 'admin-login' || currentPage === 'admin-panel') {
                setCurrentPage('admin-panel');
              }
              setIsAuthInitialized(true);
              return;
            } else {
              // Admin is not authorized - clear localStorage and redirect to landing
              console.warn('⚠️ Unauthorized admin session detected, clearing...');
              localStorage.removeItem('healqr_admin_authenticated');
              localStorage.removeItem('healqr_admin_email');
              localStorage.removeItem('healqr_admin_email_for_signin');
              setAdminEmail('');
              if (currentPage === 'admin-panel' || currentPage === 'admin-login') {
                setCurrentPage('landing');
              }
            }
          } catch (error) {
            console.error('❌ Error verifying admin session:', error);
            // On error, clear admin session to be safe
            localStorage.removeItem('healqr_admin_authenticated');
            localStorage.removeItem('healqr_admin_email');
            setAdminEmail('');
          }
        }

        // Check for doctor session
        const hasQRCode = localStorage.getItem('healqr_qr_code');
        const isAuthenticated = localStorage.getItem('healqr_authenticated');
        const storedEmail = localStorage.getItem('healqr_user_email');
        const userId = localStorage.getItem('userId');

        // CRITICAL: Check userId OR other auth flags to maintain session
        // This prevents auto-logout for new users after refresh
        if ((userId || hasQRCode) && isAuthenticated && storedEmail) {
          // User has valid localStorage session - maintain login state
          setUserEmail(storedEmail);
          setUserName(localStorage.getItem('healqr_user_name') || '');

          // Keep user on current page if protected, otherwise restore dashboard
          const protectedPages = [
            'dashboard',
            'profile-manager',
            'qr-manager',
            'schedule-manager',
            'todays-schedule',
            'patient-details',
            'preview-center',
            'analytics',
            'reports',
            'upgrade',
            'purchase-history',
            'template-uploader',
            'reminder-notifications',
          ];

          if (currentPage === 'login' || currentPage === 'signup' || currentPage === 'landing') {
            // Always redirect login/signup/landing pages to dashboard when authenticated
            setCurrentPage('dashboard');
          } else if (protectedPages.includes(currentPage)) {
            // Stay on current page
          }
        } else {
          // No valid session - redirect to landing only if on protected page
          const protectedPages = [
            'dashboard',
            'profile-manager',
            'qr-manager',
            'schedule-manager',
            'todays-schedule',
            'patient-details',
            'preview-center',
            'analytics',
            'reports',
            'upgrade',
            'purchase-history',
            'template-uploader',
            'reminder-notifications',
          ];

          if (protectedPages.includes(currentPage)) {
            setCurrentPage('landing');
          }
        }

        // ✅ No user authenticated - mark auth as initialized
        setIsAuthInitialized(true);
      }

      // ✅ Removed duplicate setIsAuthInitialized - now called after data loads
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔔 Native push registration (Capacitor wrapper) - safe no-op on web
  useEffect(() => {
    const registerNative = async () => {
      try {
        if (!auth) return;
        const { isNativeApp, registerNativePush } = await import('./capacitor-push');
        if (!isNativeApp()) return;
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        await registerNativePush(userId, 'doctor');
      } catch (err) {
        // Native push registration optional
      }
    };

    registerNative();
  }, []);

  // 🔔 FCM Foreground Message Listener - Displays notifications when app is open
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupFCM = async () => {
      try {
        // Ensure FCM is initialized before listening
        const messaging = await ensureFCMInitialized();

        if (messaging) {
          unsubscribe = onForegroundMessage((payload) => {

            const title = payload.notification?.title || 'HealQR Notification';
            const body = payload.notification?.body || '';

            // Show browser toast notification
            toast.info(title, {
              description: body,
              duration: 8000,
              action: payload.data?.url ? {
                label: 'View',
                onClick: () => window.open(payload.data.url, '_blank')
              } : undefined
            });

            // Show native notification using service worker (mobile-compatible)
            if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification(title, {
                  body,
                  icon: payload.notification?.icon || '/icon-192.png',
                  badge: '/icon-192.png',
                  tag: payload.data?.tag || 'healqr-foreground',
                  requireInteraction: false,
                  data: payload.data || {},
                  // vibrate: [200, 100, 200] // Removed to fix TS error
                });
              }).catch(() => {
                // Failed to show notification
              });
            }
          });
        }
      } catch (error) {
        console.error('❌ Failed to setup FCM listener:', error);
      }
    };

    setupFCM();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Load active add-ons from localStorage on mount
  useEffect(() => {
    // 🎯 TEAMHEALQR: All features FREE by default (Pan-India Model)
    // 5 Premium features unlocked for all doctors
    const freeAddOns = [
      'lab-referral-tracking',
      'personalized-templates',
      'doctor-patient-chat',
      'video-consultation',
      'ai-rx-reader'
    ];

    setActiveAddOns(freeAddOns);
    localStorage.setItem('healqr_active_addons', JSON.stringify(freeAddOns));
  }, []);

  // Keyboard shortcut listener for debugger (Ctrl + Shift + D)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowLocalStorageDebugger(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // ============================================
  // ACTIVITY TRACKER & SESSION PERSISTENCE
  // ============================================

  useEffect(() => {
    // Initialize activity tracker
    const activityTracker = getActivityTracker({
      inactivityTimeout: 30 * 60 * 1000, // 30 minutes
      heartbeatInterval: 60 * 1000, // 1 minute
      storageKey: 'healqr_activity_tracker',
    });

    activityTracker.init();

    // Initialize session persistence
    const sessionPersistence = getSessionPersistence({
      storageKey: 'healqr_session_data',
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      warningThreshold: 5 * 60 * 1000, // 5 minutes before expiry
    });

    sessionPersistence.init();

    // Update session when user logs in
    if (userEmail) {
      sessionPersistence.createSession({
        userId: userEmail,
        userEmail: userEmail,
        userName: userName,
        currentPage: currentPage,
        loginTime: Date.now(),
        lastSeen: Date.now(),
        isAuthenticated: true,
      });
    }

    // Cleanup on unmount
    return () => {
      activityTracker.destroy();
      sessionPersistence.destroy();
    };
  }, [userEmail, userName, currentPage]);

  // Update session when page changes
  useEffect(() => {
    if (userEmail) {
      const sessionPersistence = getSessionPersistence();
      sessionPersistence.updateSession({
        currentPage: currentPage,
        lastSeen: Date.now(),
      });
    }
  }, [currentPage, userEmail]);

  // ============================================
  // SERVICE WORKER MESSAGE HANDLER (for notification clicks)
  // ============================================
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'NOTIFICATION_CLICKED') {
          const { url, data } = event.data;
          // Extract notificationId from URL (e.g., /patient/rx/abc123)
          if (url.includes('/patient/rx/')) {
            const notificationId = url.split('/patient/rx/')[1];
            // Navigate to AI RX viewer page
            window.location.href = `/rx-viewer.html?notificationId=${notificationId}`;
          } else if (url.startsWith('http')) {
            // Full URL provided - extract just the query params and path
            try {
              const urlObj = new URL(url);
              const targetPath = urlObj.pathname + urlObj.search + urlObj.hash;
              window.location.href = targetPath;
            } catch (e) {
              console.error('Error parsing URL:', e);
              window.location.href = url;
            }
          } else {
            // Relative path/URL
            window.location.href = url;
          }
        }
      });
    }
  }, []);

  // ============================================
  // END ACTIVITY TRACKER & SESSION PERSISTENCE
  // ============================================

  const handleAddOnToggle = (addOnId: string) => {
    setActiveAddOns((prev) => {
      const newAddOns = prev.includes(addOnId)
        ? prev.filter((id) => id !== addOnId)
        : [...prev, addOnId];
      localStorage.setItem(
        "healqr_active_addons",
        JSON.stringify(newAddOns),
      );
      return newAddOns;
    });
  };

  const handleLanguageSelect = (language: Language) => {
    setBookingLanguage(language);
    setCurrentPage("booking-mini-website");
  };

  const handleDateSelection = (date: Date) => {
    setSelectedDate(date);
    // Use first chamber's start time as default slot
    const defaultTime = doctorChambers.length > 0 ? doctorChambers[0].startTime : "10:00";
    setSelectedSlot(defaultTime);
    setCurrentPage("booking-select-chamber");
  };

  const handleChamberSelection = (chamber: string, consultationType: 'chamber' | 'video') => {
    setSelectedChamber(chamber);
    setConsultationType(consultationType);
    setCurrentPage("booking-patient-details");
  };

  const handlePatientDetailsSubmit = (
    data: PatientFormData,
  ) => {
    setPatientFormData(data);
    setCurrentPage("booking-confirmation");
  };

  const handleBookingConfirmation = () => {
    setBookingConfirmed(true);
  };

  const handleReviewUpload = async (review: any) => {
    // Limit to 2 reviews on mini website
    if (uploadedReviews.length >= 2) {
      toast.error('Maximum 2 reviews allowed on Mini Website', {
        description: 'Please remove an existing review first',
        duration: 3000,
      });
      return;
    }
    setUploadedReviews((prev) => [...prev, review]);
    // Remove from incoming reviews OR self-created reviews after upload
    setIncomingReviews((prev) => prev.filter(r => r.id !== review.id));
    setSelfCreatedReviews((prev) => prev.filter(r => r.id !== review.id));

    // Save to Firestore for cross-device access
    try {
      const { doc, updateDoc, arrayUnion } = await import('firebase/firestore');
      const user = auth.currentUser;
      if (user) {
        // ✅ MARK REVIEW AS PUBLISHED IN REVIEWS COLLECTION (NEW!)
        if (review.firestoreId) {
          try {
            const reviewRef = doc(db, 'reviews', review.firestoreId);
            await updateDoc(reviewRef, {
              published: true,
              publishedAt: new Date(),
            });
          } catch (publishError) {
            console.error('❌ Error marking review as published:', publishError);
          }
        }

        const doctorRef = doc(db, 'doctors', user.uid);
        await updateDoc(doctorRef, {
          miniWebsiteReviews: arrayUnion(review)
        });
      }
    } catch (error) {
      console.error('❌ Error uploading review to Firestore:', error);
    }
  };

  const handlePlaceholderReviewSubmit = async (reviewData: any) => {
    const reviewWithId = {
      ...reviewData,
      id: Date.now(),
    };
    // Add to self-created reviews
    setSelfCreatedReviews((prev) => [...prev, reviewWithId]);

    // Update cumulative stats in Firestore (never decreases)
    try {
      const { doc, updateDoc, arrayUnion, getDoc } = await import('firebase/firestore');
      const user = auth.currentUser;
      if (user) {
        const doctorRef = doc(db, 'doctors', user.uid);

        // Update stats
        const docSnap = await getDoc(doctorRef);
        if (docSnap.exists()) {
          const currentStats = docSnap.data().stats || { averageRating: 0, totalReviews: 0 };
          const currentTotal = currentStats.totalReviews || 0;
          const currentAvg = currentStats.averageRating || 0;

          // Calculate new cumulative average
          const newTotal = currentTotal + 1;
          const newAvg = ((currentAvg * currentTotal) + reviewData.rating) / newTotal;

          const updatedStats = {
            averageRating: parseFloat(newAvg.toFixed(1)),
            totalReviews: newTotal
          };

          await updateDoc(doctorRef, {
            placeholderReviews: arrayUnion(reviewWithId),
            stats: updatedStats
          });

          // Update local state immediately
          setDoctorStats(updatedStats);
        }
      }
    } catch (error) {
      console.error('❌ Error saving placeholder review to Firestore:', error);
    }

    toast.success('✅ Placeholder Review Created!', {
      description: 'You can now upload it to your Mini Website',
      duration: 3000,
    });
  };

  const handleReviewDelete = async (reviewId: number, source: 'incoming' | 'selfCreated' | 'uploaded') => {
    if (source === 'uploaded') {
      // Remove from uploaded reviews (published on mini website)
      const reviewToDelete = uploadedReviews.find(r => r.id === reviewId);
      setUploadedReviews((prev) => prev.filter(r => r.id !== reviewId));

      // Remove from Firestore miniWebsiteReviews
      try {
        const { doc, updateDoc, arrayRemove } = await import('firebase/firestore');
        const user = auth.currentUser;
        if (user && reviewToDelete) {
          const doctorRef = doc(db, 'doctors', user.uid);
          await updateDoc(doctorRef, {
            miniWebsiteReviews: arrayRemove(reviewToDelete)
          });
        }
      } catch (error) {
        console.error('❌ Error removing review from Firestore:', error);
      }
    } else if (source === 'incoming') {
      // Remove from incoming patient reviews
      setIncomingReviews((prev) => prev.filter(r => r.id !== reviewId));
    } else if (source === 'selfCreated') {
      // Remove from self-created reviews
      const reviewToDelete = selfCreatedReviews.find(r => r.id === reviewId);
      setSelfCreatedReviews((prev) => prev.filter(r => r.id !== reviewId));

      // Remove from Firestore placeholderReviews
      try {
        const { doc, updateDoc, arrayRemove } = await import('firebase/firestore');
        const user = auth.currentUser;
        if (user && reviewToDelete) {
          const doctorRef = doc(db, 'doctors', user.uid);
          await updateDoc(doctorRef, {
            placeholderReviews: arrayRemove(reviewToDelete)
          });
        }
      } catch (error) {
        console.error('❌ Error removing self-created review from Firestore:', error);
      }
    }
  };

  const handleReviewSubmit = async (reviewData: any) => {
    const reviewWithId = {
      ...reviewData,
      id: Date.now(),
    };
    setIncomingReviews((prev) => [...prev, reviewWithId]);

    // Update cumulative stats in Firestore (never decreases)
    try {
      const { doc, updateDoc, getDoc, collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      // Determine target doctor ID (logged in doctor OR doctor from QR/Link)
      const targetDoctorId = auth.currentUser?.uid || sessionStorage.getItem('booking_doctor_id');

      if (targetDoctorId) {
        // ✅ SAVE REVIEW TO REVIEWS COLLECTION (NEW!)
        try {
          await addDoc(collection(db, 'reviews'), {
            doctorId: targetDoctorId,
            patientName: reviewData.patientName,
            rating: reviewData.rating,
            comment: reviewData.comment,
            date: reviewData.date,
            verified: true,
            published: false, // Not published to mini website yet (doctor needs to upload)
            createdAt: serverTimestamp(),
          });
        } catch (reviewError) {
          console.error('❌ Error saving review to Firestore:', reviewError);
        }

        const doctorRef = doc(db, 'doctors', targetDoctorId);
        const docSnap = await getDoc(doctorRef);

        if (docSnap.exists()) {
          const currentStats = docSnap.data().stats || { averageRating: 0, totalReviews: 0 };
          const currentTotal = currentStats.totalReviews || 0;
          const currentAvg = currentStats.averageRating || 0;

          // Calculate new cumulative average
          const newTotal = currentTotal + 1;
          const newAvg = ((currentAvg * currentTotal) + reviewData.rating) / newTotal;

          const updatedStats = {
            averageRating: parseFloat(newAvg.toFixed(1)),
            totalReviews: newTotal
          };

          await updateDoc(doctorRef, { stats: updatedStats });

          // Update local state immediately
          setDoctorStats(updatedStats);
        }
      }
    } catch (error) {
      console.error('❌ Error updating stats:', error);
    }

    toast.success('✅ Review Submitted Successfully!', {
      description: `Thank you ${reviewData.patientName} for your feedback!`,
      duration: 3000,
    });

    // Redirect based on user type
    if (auth.currentUser) {
      setCurrentPage("dashboard");
    } else {
      setCurrentPage("landing");
    }
  };

  const handleTestReviewSubmission = () => {
    setCurrentPage("patient-review-submission");
  };

  const handleSupportRequest = (request: any) => {
    setSupportRequests((prev) => [...prev, request]);
  };

  const handleAdminTestimonialUpload = (testimonial: any) => {
    setAdminTestimonials((prev) => [...prev, testimonial]);
  };

  const handlePatientChatOpen = (token: string) => {
    setChatToken(token);
    setCurrentPage("patient-chat");
  };

  const resetBookingFlow = () => {
    setBookingLanguage("english");
    setSelectedDate(null);
    setSelectedSlot(null);
    setSelectedChamber(null);
    setPatientFormData(null);
    setBookingConfirmed(false);
  };

  const menuChangeHandler = (menu: string) => {
    // 🔒 ASSISTANT ACCESS CONTROL: Check if assistant is trying to access unauthorized page
    const isAssistant = localStorage.getItem('healqr_is_assistant') === 'true';
    if (isAssistant) {
      const assistantPagesStr = localStorage.getItem('healqr_assistant_pages');
      const allowedPages: string[] = assistantPagesStr ? JSON.parse(assistantPagesStr) : [];

      // Dashboard is always allowed, check others
      if (menu !== 'dashboard' && !allowedPages.includes(menu)) {
        toast.error('Access Denied', {
          description: 'You do not have permission to access this page',
          duration: 3000
        });
        return; // Block navigation
      }
    }

    // ✅ FIX: Check BOTH booking limit AND date expiry for blocking
    const usagePercentage = (subscriptionData.bookingsCount / subscriptionData.bookingsLimit) * 100;
    const isBookingLimitReached = usagePercentage >= 100;

    // Check if trial/subscription has expired (date comparison)
    const now = new Date();
    const isDateExpired = subscriptionData.trialEndDate ? subscriptionData.trialEndDate <= now : false;

    // Block if EITHER condition is true
    // FREE FOREVER: Never block access
    const isBlocked = false; // isBookingLimitReached || isDateExpired;

    // If blocked, only allow dashboard and upgrade pages
    if (isBlocked && menu !== "dashboard" && menu !== "upgrade") {
      setCurrentPage("upgrade");
      return;
    }

    if (menu === "dashboard") setCurrentPage("dashboard");
    else if (menu === "profile")
      setCurrentPage("profile-manager");
    else if (menu === "qr") setCurrentPage("qr-manager");
    else if (menu === "schedule")
      setCurrentPage("schedule-manager");
    else if (menu === "todays-schedule")
      setCurrentPage("todays-schedule");
    else if (menu === "advance-booking")
      setCurrentPage("advance-booking");
    else if (menu === "preview")
      setCurrentPage("preview-center");
    else if (menu === "emergency-button")
      setCurrentPage("emergency-button");
    else if (menu === "analytics") setCurrentPage("analytics");
    else if (menu === "reports") setCurrentPage("reports");
    else if (menu === "upgrade") setCurrentPage("upgrade");
    else if (menu === "purchase-history")
      setCurrentPage("purchase-history");
    else if (menu === "template-uploader")
      setCurrentPage("template-uploader");
    else if (menu === "reminder-notifications")
      setCurrentPage("reminder-notifications");
    else if (menu === "video-library") {
      setVideoLibrarySource("dashboard");
      setCurrentPage("video-library");
    }
    else if (menu === "assistant-access")
      setCurrentPage("assistant-access");
    else if (menu === "lab-referral-tracking")
      setCurrentPage("lab-referral-tracking");
    else if (menu === "personalized-templates")
      setCurrentPage("personalized-templates");
    else if (menu === "doctor-patient-chat")
      setCurrentPage("doctor-patient-chat");
    else if (menu === "video-consultation")
      setCurrentPage("video-consultation");
    else if (menu === "ai-rx-reader")
      setCurrentPage("ai-rx-reader");
  };

  // Proper logout handler with Firebase signOut
  const handleLogout = async () => {
    try {
      // 🧹 Clear demo mode and test data on logout
      localStorage.removeItem('healqr_demo_mode_addons');

      // 🔒 Clear active addons (user needs to re-authenticate to restore purchases)
      // Note: Purchases will be restored from Firestore on next login
      localStorage.removeItem('healqr_active_addons');

      // 🧹 Clear session data
      localStorage.removeItem('healqr_authenticated');
      localStorage.removeItem('healqr_qr_code');
      localStorage.removeItem('healqr_user_email');
      localStorage.removeItem('healqr_user_name');

      setActiveAddOns([]);

      await AuthService.signOutUser();
      toast.success('Logged out successfully');
      setCurrentPage('landing');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Logout failed', {
        description: error.message
      });
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('healqr_admin_authenticated');
    localStorage.removeItem('healqr_admin_email');
    localStorage.removeItem('healqr_admin_email_for_signin');
    setAdminEmail('');
    setCurrentPage('landing');
    toast.success('Admin logged out');
  };

  // Show loading screen while checking auth state
  if (!isAuthInitialized) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      {/* Prototype Mode Banner */}
      <PrototypeModeBanner />

      {currentPage === "landing" && (
        <LandingPage
          onGetStarted={() => setCurrentPage("signup")}
          onLogin={() => setCurrentPage("login")}
          onVideoLibrary={() => {
            setVideoLibrarySource("landing");
            setCurrentPage("video-library");
          }}
          onPrivacyPolicy={() =>
            setCurrentPage("privacy-policy")
          }
          onTermsOfService={() =>
            setCurrentPage("terms-of-service")
          }
          onRefundPolicy={() => setCurrentPage("refund-policy")}
          onAdminLogin={() => setCurrentPage("admin-login")}
          onTestTemplateUploader={() => setCurrentPage("admin-testing")}
          uploadedTestimonials={adminTestimonials}
          onAdvertiserSignUp={() => setCurrentPage("advertiser-signup")}
          onAdvertiserLogin={() => setCurrentPage("advertiser-login")}
          onAdvertiserGateway={() => setCurrentPage("advertiser-gateway")}
        />
      )}

      {currentPage === "signup" && (
        <SignUp
          onNext={(data) => {
            setUserEmail(data.email);
            setUserName(data.name);
            setUserDob(data.dob);
            setUserPinCode(data.pinCode);
            setUserQrNumber(data.qrNumber);
            setCurrentPage("dashboard");
          }}
          onBack={() => setCurrentPage("landing")}
          onLogin={() => setCurrentPage("login")}
          isDemoMode={false}
        />
      )}

      {currentPage === "verify-email" && (
        <VerifyEmail
          onSuccess={() => {
            // Load all user data from localStorage for QR success page
            const storedEmail = localStorage.getItem('healqr_user_email');
            const storedName = localStorage.getItem('healqr_user_name');
            const storedUserId = localStorage.getItem('userId');
            
            if (storedEmail) setUserEmail(storedEmail);
            if (storedName) setUserName(storedName);
            
            console.log('✅ Verification complete, redirecting to QR success page');
            console.log('User:', storedName, storedEmail, storedUserId);
            
            setCurrentPage("qr-success");
          }}
          onError={() => setCurrentPage("landing")}
        />
      )}

      {currentPage === "verify-login" && (
        <VerifyLogin
          onSuccess={() => {
            const storedEmail = localStorage.getItem('healqr_user_email');
            const storedName = localStorage.getItem('healqr_user_name');
            const isClinic = localStorage.getItem('healqr_is_clinic') === 'true';
            const isAssistant = localStorage.getItem('healqr_is_assistant') === 'true';
            
            if (storedEmail) setUserEmail(storedEmail);
            if (storedName) setUserName(storedName);
            
            // Route based on user type
            if (isClinic) {
              setCurrentPage("clinic-dashboard");
            } else if (isAssistant) {
              setCurrentPage("dashboard"); // Assistants use doctor dashboard
            } else {
              setCurrentPage("dashboard"); // Doctors
            }
          }}
          onError={() => setCurrentPage("landing")}
        />
      )}

      {currentPage === "assistant-login" && <AssistantLogin />}

      {currentPage === "admin-verify" && (
        <AdminVerifyLogin
          onSuccess={(email) => {
            setAdminEmail(email);
            setCurrentPage("admin-panel");
          }}
          onError={() => setCurrentPage("landing")}
        />
      )}

      {currentPage === "qr-success" && (
        <QRCodeSuccess
          name={userName}
          email={userEmail}
          onProceedToLogin={() => {
            setCurrentPage("login");
          }}
        />
      )}

      {currentPage === "login" && (
        <Login
          onNext={(email: string) => {
            setUserEmail(email);
            // userName already set from SignUp - don't overwrite it!
            setCurrentPage("dashboard");
          }}
          onSignUp={() => setCurrentPage("signup")}
          onClose={() => setCurrentPage("landing")}
          isDemoMode={false}
        />
      )}

      {currentPage === "dashboard" && (
        <DoctorDashboard
          doctorName={userName}
          email={userEmail}
          onLogout={handleLogout}
          onMenuChange={menuChangeHandler}
          incomingReviews={incomingReviews}
          selfCreatedReviews={selfCreatedReviews}
          uploadedReviews={uploadedReviews}
          onUploadReview={handleReviewUpload}
          onDeleteReview={handleReviewDelete}
          onTestReviewSubmission={handleTestReviewSubmission}
          onSupportRequest={handleSupportRequest}
          onCreatePlaceholderReview={() => setShowCreatePlaceholderModal(true)}
          chambers={chambers}
          activeAddOns={activeAddOns}
          subscriptionData={subscriptionData}
          profilePhoto={userProfilePhoto}
          doctorStats={doctorStats}
          useDrPrefix={useDrPrefix}
        />
      )}

      {currentPage === "profile-manager" && (
        <ProfileManager
          email={userEmail}
          dob={userDob}
          qrNumber={userQrNumber}
          doctorCode={userDoctorCode}
          companyName={userCompanyName}
          residentialPinCode={userPinCode}
          profileData={{
            image: userProfileData.profileImage || userProfilePhoto || null,
            name: userProfileData.name || userName,
            degrees: userProfileData.degrees,
            specialities: userProfileData.specialities,
            language: doctorPreferredLanguage as any
          }}
          onProfileUpdate={(profileData) => {
            if (profileData.image) {
              setUserProfilePhoto(profileData.image);
            }
            if (profileData.name) {
              setUserName(profileData.name);
            }
            // Update full profile data state
            setUserProfileData({
              profileImage: profileData.image || "",
              name: profileData.name || userName,
              degrees: profileData.degrees || [],
              specialities: profileData.specialities || []
            });
          }}
          onLogout={() => {
            setCurrentPage("landing");
          }}
          onMenuChange={menuChangeHandler}
          activeAddOns={activeAddOns}
        />
      )}

      {currentPage === "qr-manager" && (
        <QRManager
          profileData={{
            image: userProfileData.profileImage,
            name: userProfileData.name || userName,
            degrees: userProfileData.degrees,
            specialities: userProfileData.specialities
          }}
          onLogout={handleLogout}
          onMenuChange={menuChangeHandler}
          onTestBooking={() => {
            setIsTestBookingMode(true);
            // Set booking doctor data from current user's profile
            setBookingDoctorName(userName);
            setBookingDoctorSpecialty(userProfileData.specialities?.[0] || '');
            setBookingDoctorPhoto(userProfileData.profileImage || '');
            setBookingDoctorDegrees(userProfileData.degrees || []);
            // Set sessionStorage for booking flow to work properly
            if (auth?.currentUser?.uid) {
              sessionStorage.setItem('booking_doctor_id', auth.currentUser.uid);
            }
            setCurrentPage("booking-language");
          }}
          activeAddOns={activeAddOns}
        />
      )}

      {currentPage === "schedule-manager" && (
        <ScheduleManager
          doctorName={userName}
          email={userEmail}
          onLogout={handleLogout}
          onMenuChange={menuChangeHandler}
          activeAddOns={activeAddOns}
        />
      )}

      {currentPage === "todays-schedule" && (
        <TodaysSchedule
          onLogout={handleLogout}
          onMenuChange={menuChangeHandler}
          activeAddOns={activeAddOns}
          doctorLanguage={doctorPreferredLanguage}
        />
      )}

      {currentPage === "advance-booking" && (
        <AdvanceBooking
          onLogout={handleLogout}
          onMenuChange={menuChangeHandler}
          activeAddOns={activeAddOns}
        />
      )}

      {currentPage === "patient-details" && (
        <PatientDetails
          doctorName={userName}
          email={userEmail}
          onLogout={handleLogout}
          onMenuChange={menuChangeHandler}
          onBack={() => setCurrentPage("todays-schedule")}
          patientId="sample-patient"
          activeAddOns={activeAddOns}
        />
      )}

      {currentPage === "preview-center" && (
        <PreviewCenter
          onLogout={handleLogout}
          onMenuChange={menuChangeHandler}
          uploadedReviews={uploadedReviews}
          activeAddOns={activeAddOns}
        />
      )}

      {currentPage === "emergency-button" && (
        <EmergencyButtonManager
          onBack={() => setCurrentPage("dashboard")}
        />
      )}

      {currentPage === "analytics" && (
        <Analytics
          doctorName={userName}
          email={userEmail}
          onLogout={handleLogout}
          onMenuChange={menuChangeHandler}
          activeAddOns={activeAddOns}
        />
      )}

      {currentPage === "reports" && (
        <Report
          doctorName={userName}
          email={userEmail}
          onLogout={handleLogout}
          onMenuChange={menuChangeHandler}
          activeAddOns={activeAddOns}
        />
      )}

      {currentPage === "template-uploader" && (
        <TemplateUploader
          doctorName={userName}
          email={userEmail}
          onLogout={handleLogout}
          onMenuChange={menuChangeHandler}
          activeAddOns={activeAddOns}
        />
      )}

      {currentPage === "reminder-notifications" && (
        <ReminderNotificationsDemo
          doctorName={userName}
          email={userEmail}
          onLogout={handleLogout}
          onMenuChange={menuChangeHandler}
          activeAddOns={activeAddOns}
        />
      )}

      {currentPage === "booking-language" && (
        <LanguageSelection
          onContinue={handleLanguageSelect}
          onBack={() => {
            // Clear booking session data
            sessionStorage.removeItem('booking_doctor_id');
            if (isTestBookingMode) {
              setIsTestBookingMode(false);
              setCurrentPage("qr-manager");
            } else {
              setCurrentPage("landing");
            }
          }}
          doctorName={bookingDoctorName}
          doctorSpecialty={bookingDoctorSpecialty}
          doctorPhoto={bookingDoctorPhoto}
          doctorDegrees={bookingDoctorDegrees}
          useDrPrefix={bookingDoctorUseDrPrefix}
        />
      )}

      {currentPage === "booking-mini-website" && (
        <BookingMiniWebsite
          language={bookingLanguage}
          onBookNow={() =>
            setCurrentPage("booking-select-date")
          }
          onBack={() => setCurrentPage("booking-language")}
          uploadedReviews={uploadedReviews}
        />
      )}

      {currentPage === "booking-select-date" && (
        <SelectDate
          language={bookingLanguage}
          onContinue={handleDateSelection}
          onBack={() => setCurrentPage("booking-mini-website")}
          maxAdvanceDays={maxAdvanceDays}
          plannedOffPeriods={plannedOffPeriods}
          schedules={doctorSchedules}
          globalBookingEnabled={globalBookingEnabled}
          doctorName={bookingDoctorName}
          doctorSpecialty={bookingDoctorSpecialty}
          doctorPhoto={bookingDoctorPhoto}
          useDrPrefix={bookingDoctorUseDrPrefix}
        />
      )}

      {currentPage === "booking-select-chamber" && (() => {
        // Filter chambers based on selected date - only show chambers scheduled for that day
        const filteredChambers = doctorChambers.filter((chamber: any) => {
          const selectedDayName = selectedDate?.toLocaleDateString('en-US', { weekday: 'long' });
          const selectedDateStr = selectedDate?.toISOString().split('T')[0];

          // Don't filter by end-time here - SelectChamber will show CHAMBER TIME OVER badge if expired

          // Daily chambers always show
          if (chamber.frequency === 'Daily') {
            return true;
          }

          // Custom frequency - only show if customDate matches selected date
          if (chamber.frequency === 'Custom') {
            return chamber.customDate === selectedDateStr;
          }

          // Weekly/Bi-Weekly/Monthly - check if selected day is in chamber's days array
          if (chamber.days && Array.isArray(chamber.days)) {
            return chamber.days.includes(selectedDayName);
          }

          return false;
        });

        return (
          <SelectChamber
            language={bookingLanguage}
            selectedDate={selectedDate!}
            onContinue={handleChamberSelection}
            onBack={() => setCurrentPage("booking-select-date")}
            hasVideoConsultation={activeAddOns.includes('video-consultation')}
            chambers={filteredChambers}
            doctorName={bookingDoctorName}
            doctorSpecialty={bookingDoctorSpecialty}
            doctorPhoto={bookingDoctorPhoto}
            doctorDegrees={bookingDoctorDegrees}
            useDrPrefix={bookingDoctorUseDrPrefix}
          />
        );
      })()}

      {currentPage === "booking-patient-details" && (
        <PatientDetailsForm
          language={bookingLanguage}
          selectedDate={selectedDate!}
          selectedTime={selectedSlot!}
          selectedChamber={selectedChamber!}
          onSubmit={handlePatientDetailsSubmit}
          onBack={() =>
            setCurrentPage("booking-select-chamber")
          }
          consultationType={consultationType || 'chamber'}
          doctorId={sessionStorage.getItem('booking_doctor_id') || ''}
          doctorName={bookingDoctorName}
          doctorSpecialty={bookingDoctorSpecialty}
          doctorPhoto={bookingDoctorPhoto}
          doctorDegrees={bookingDoctorDegrees}
          useDrPrefix={bookingDoctorUseDrPrefix}
          bookingType="qr_booking"
          isTestMode={isTestBookingMode}
        />
      )}

      {currentPage === "booking-confirmation" && patientFormData && (
        <BookingConfirmation
          language={bookingLanguage}
          patientData={{
            patientName: patientFormData.patientName,
            whatsappNumber: patientFormData.whatsappNumber,
            age: patientFormData.age,
            gender: patientFormData.gender,
            purposeOfVisit: patientFormData.purposeOfVisit,
          }}
          appointmentData={{
            serialNo: patientFormData.serialNo?.toString() || '999',
            bookingId: patientFormData.bookingId || 'DEMO-000000',
            doctorName: bookingDoctorName || userName,
            date: selectedDate || new Date(),
            time: (() => {
              // Find selected chamber to get time range
              if (selectedChamber && doctorChambers.length > 0) {
                const chamber = doctorChambers.find(c => c.chamberName === selectedChamber);
                if (chamber && chamber.startTime && chamber.endTime) {
                  return `${chamber.startTime} - ${chamber.endTime}`;
                }
              }
              return selectedSlot || '10:00 AM - 02:00 PM';
            })(),
            location: selectedChamber || 'Demo Chamber',
            consultationType: consultationType === 'video' ? 'video' : 'chamber',
          }}
          doctorName={bookingDoctorName || userName}
          doctorSpecialty={bookingDoctorSpecialty || userProfileData.specialities?.[0] || ''}
          doctorPhoto={bookingDoctorPhoto || userProfileData.profileImage || ''}
          doctorDegrees={bookingDoctorDegrees || userProfileData.degrees || []}
          useDrPrefix={bookingDoctorUseDrPrefix}
          isTestMode={isTestBookingMode}
          onBackToHome={() => {
            if (isTestBookingMode) {
              // In test mode, go back to QR Manager
              setIsTestBookingMode(false);
              setCurrentPage("qr-manager");
            } else {
              // In real booking, go back to language selection
              setCurrentPage("booking-language");
            }
            // Reset all booking states
            setSelectedDate(null);
            setSelectedSlot(null);
            setSelectedChamber(null);
            setPatientFormData(null);
            setConsultationType(null);
          }}
        />
      )}

      {currentPage === "patient-review-submission" && (
        <PatientReviewSubmission
          language={bookingLanguage}
          onSubmit={handleReviewSubmit}
          onClose={() => setCurrentPage("booking-confirmation")}
        />
      )}

      {currentPage === "consultation-completed" && (
        <ConsultationCompletedNotification
          bookingId={notifData?.bookingId}
          language={bookingLanguage === 'hindi' ? 'hi' : bookingLanguage === 'bengali' ? 'bn' : 'en'}
          patientName={notifData?.patientName}
          doctorName={notifData?.doctorName}
          doctorSpecialty={notifData?.specialization}
          doctorInitials={notifData?.doctorInitials}
          doctorPhoto={userProfilePhoto}
          clinicName={notifData?.message}
          consultationDate={notifData?.date}
          consultationTime={notifData?.time}
        />
      )}

      {currentPage === "follow-up" && (
        <FollowUpNotification
          language={bookingLanguage === 'hindi' ? 'hi' : bookingLanguage === 'bengali' ? 'bn' : 'en'}
          patientName={notifData?.patientName}
          doctorName={notifData?.doctorName}
          doctorMessage={notifData?.message}
          followUpDate={notifData?.date}
        />
      )}

      {currentPage === "review-request" && (
        <ReviewRequestNotification
          language={bookingLanguage === 'hindi' ? 'hi' : bookingLanguage === 'bengali' ? 'bn' : 'en'}
          patientName={notifData?.patientName}
          doctorName={notifData?.doctorName}
          consultationDate={notifData?.date}
          onSubmitReview={handleReviewSubmit}
          onIgnore={() => setCurrentPage("landing")}
        />
      )}

      {currentPage === "appointment-reminder" && (
        <AppointmentReminderNotification
          language={bookingLanguage === 'hindi' ? 'hi' : bookingLanguage === 'bengali' ? 'bn' : 'en'}
          patientName={notifData?.patientName}
          doctorName={notifData?.doctorName}
          appointmentDate={notifData?.date}
          appointmentTime={notifData?.time}
          location={notifData?.message} // Using message field for location
          serialNumber={notifData?.serialNumber}
          clinicName={notifData?.clinicName}
        />
      )}

      {currentPage === "appointment-cancelled" && (
        <AppointmentCancelledNotification
          language={notifData?.language === 'hindi' ? 'hi' : notifData?.language === 'bengali' ? 'bn' : 'en'}
          bookingId={notifData?.bookingId}
          patientName={notifData?.patientName || 'Patient'}
          doctorName={notifData?.doctorName || 'Doctor'}
          clinicName={notifData?.message || 'Clinic'}
          cancelledDate={notifData?.date || ''}
          cancellationTime={notifData?.time || ''}
          cancellationReason="Your appointment has been cancelled"
        />
      )}

      {currentPage === "appointment-restored" && (
        <AppointmentRestoredNotification
          language={notifData?.language === 'hindi' ? 'hi' : notifData?.language === 'bengali' ? 'bn' : 'en'}
          doctorName={notifData?.doctorName || 'Doctor'}
          doctorSpecialty=""
          doctorInitials=""
          patientName={notifData?.patientName || 'Patient'}
          clinicName={notifData?.message || 'Clinic'}
          restoredDate={notifData?.date || ''}
          chamberName={notifData?.message || 'Chamber'}
          scheduleTime={notifData?.time || ''}
          location=""
          bookingSerialNo={notifData?.serialNumber || '#1'}
          uniqueBookingId={notifData?.clinicName || notifData?.bookingId || 'V7-001'}
          healthTip="Your appointment has been successfully restored."
        />
      )}

      {currentPage === "admin-alert" && (
        <AdminAlertNotification
          language={bookingLanguage === 'hindi' ? 'hi' : bookingLanguage === 'bengali' ? 'bn' : 'en'}
          doctorName={notifData?.doctorName}
          eventType={notifData?.date || 'System Alert'}
          severity={notifData?.time || 'High'}
        />
      )}

      {currentPage === "verify-walkin" && notifData?.bookingId && (
        <VerifyWalkin
          bookingId={notifData.bookingId}
        />
      )}

      {currentPage === "video-library" && (
        <VideoLibrary
          onBack={() => {
            if (videoLibrarySource === "dashboard") {
              setCurrentPage("dashboard");
            } else {
              setCurrentPage("landing");
            }
          }}
          source={videoLibrarySource}
        />
      )}

      {currentPage === "privacy-policy" && (
        <PrivacyPolicy
          onBack={() => setCurrentPage("landing")}
        />
      )}

      {currentPage === "terms-of-service" && (
        <TermsOfService
          onBack={() => setCurrentPage("landing")}
        />
      )}

      {currentPage === "refund-policy" && (
        <RefundPolicy
          onBack={() => setCurrentPage("landing")}
        />
      )}

      {currentPage === "admin-login" && (
        <AdminLogin
          onSuccess={(email: string) => {
            setAdminEmail(email);
            setCurrentPage("admin-panel");
          }}
          onBack={() => setCurrentPage("landing")}
        />
      )}

      {currentPage === "admin-panel" && (
        <AdminPanel
          adminEmail={adminEmail}
          onLogout={handleAdminLogout}
          supportRequests={supportRequests}
          onUploadTestimonial={handleAdminTestimonialUpload}
          onNavigateToQRGenerator={() => setCurrentPage("admin-qr-management")}
          onNavigateToQRGeneration={() => setCurrentPage("admin-qr-generation")}
          onNavigateToQRManagement={() => setCurrentPage("admin-qr-management")}
        />
      )}

      {currentPage === "admin-qr-generator" && (
        <AdminQRGenerator />
      )}

      {currentPage === "admin-qr-generation" && (
        <AdminQRGeneration onBack={() => setCurrentPage("admin-panel")} />
      )}

      {currentPage === "admin-qr-management" && (
        <AdminQRManagement onBack={() => setCurrentPage("admin-panel")} />
      )}

      {currentPage === "admin-testing" && (
        <AdminTestingPage
          onBack={() => setCurrentPage("landing")}
        />
      )}

      {currentPage === "assistant-access" && (
        <AssistantAccessManager
          doctorName={userName}
          email={userEmail}
          onLogout={handleLogout}
          onMenuChange={menuChangeHandler}
          activeAddOns={activeAddOns}
        />
      )}

      {currentPage === "lab-referral-tracking" && (
        <LabReferralTrackingManager
          doctorName={userName}
          email={userEmail}
          onLogout={handleLogout}
          onMenuChange={menuChangeHandler}
          activeAddOns={activeAddOns}
        />
      )}

      {currentPage === "personalized-templates" && (
        <PersonalizedTemplatesManager
          onLogout={handleLogout}
          onMenuChange={menuChangeHandler}
          activeAddOns={activeAddOns}
        />
      )}

      {currentPage === "doctor-patient-chat" && (
        <DoctorPatientChatManager
          doctorName={userName}
          email={userEmail}
          onLogout={handleLogout}
          onMenuChange={menuChangeHandler}
          activeAddOns={activeAddOns}
        />
      )}

      {currentPage === "patient-chat" && (
        <PatientChatInterface
          chatToken={chatToken}
        />
      )}

      {currentPage === "video-consultation" && (
        <VideoConsultationManager
          onLogout={handleLogout}
          onMenuChange={menuChangeHandler}
          activeAddOns={activeAddOns}
        />
      )}

      {currentPage === "ai-rx-reader" && (
        <AIRXReaderManager
          doctorName={userName}
          email={userEmail}
          onLogout={handleLogout}
          onMenuChange={menuChangeHandler}
          activeAddOns={activeAddOns}
        />
      )}

      {currentPage === "testing-utilities" && (
        <TestingUtilities
          onClose={() => setCurrentPage("landing")}
        />
      )}

      {currentPage === "clinic-profile" && (
        <Suspense fallback={<PageLoader />}>
          <ClinicProfile
            clinicId={sessionStorage.getItem('booking_clinic_id') || ''}
            onDoctorSelect={(doctorId) => {
              const clinicId = sessionStorage.getItem('booking_clinic_id');
              window.location.href = `/?doctorId=${doctorId}&clinicId=${clinicId}`;
            }}
            language={bookingLanguage}
          />
        </Suspense>
      )}

      {currentPage === "patient-search" && (
        <Suspense fallback={<PageLoader />}>
          <PatientSearch />
        </Suspense>
      )}

      {currentPage === "clinic-signup" && (
        <Suspense fallback={<PageLoader />}>
          <ClinicSignUp
            onBack={() => setCurrentPage("landing")}
            onLogin={() => setCurrentPage("clinic-login")}
          />
        </Suspense>
      )}

      {currentPage === "clinic-login" && (
        <Suspense fallback={<PageLoader />}>
          <ClinicLogin
            onBack={() => setCurrentPage("landing")}
            onSignUp={() => setCurrentPage("clinic-signup")}
            onSuccess={() => setCurrentPage("clinic-dashboard")}
          />
        </Suspense>
      )}

      {currentPage === "clinic-dashboard" && (
        <Suspense fallback={<PageLoader />}>
          <ClinicDashboard />
        </Suspense>
      )}

      {currentPage === "patient-login" && (
        <Suspense fallback={<PageLoader />}>
          <PatientLogin
            onBack={() => setCurrentPage("landing")}
            onSuccess={() => setCurrentPage("patient-dashboard")}
          />
        </Suspense>
      )}

      {currentPage === "patient-dashboard" && (
        <Suspense fallback={<PageLoader />}>
          <PatientDashboardNew />
        </Suspense>
      )}

      {currentPage === "patient-history" && (
        <Suspense fallback={<PageLoader />}>
          <PatientDashboardNew />
        </Suspense>
      )}

      {currentPage === "advertiser-signup" && (
        <AdvertiserSignUp
          onBack={() => setCurrentPage("advertiser-gateway")}
          onLogin={() => setCurrentPage("advertiser-login")}
          onSuccess={() => setCurrentPage("advertiser-dashboard")}
        />
      )}

      {currentPage === "advertiser-login" && (
        <AdvertiserLogin
          onBack={() => setCurrentPage("advertiser-gateway")}
          onSignUp={() => setCurrentPage("advertiser-signup")}
          onSuccess={() => setCurrentPage("advertiser-dashboard")}
        />
      )}

      {currentPage === "advertiser-gateway" && (
        <AdvertiserGateway
          onBack={() => setCurrentPage("landing")}
          onSignUp={() => setCurrentPage("advertiser-signup")}
          onLogin={() => setCurrentPage("advertiser-login")}
        />
      )}

      {currentPage === "advertiser-dashboard" && (
        <AdvertiserDashboard
          onLogout={() => setCurrentPage("landing")}
        />
      )}

      {currentPage === "upgrade" && (
        <UpgradePage
          onLogout={handleLogout}
          reason={subscriptionData.daysRemaining <= 0 ? 'trial_expired' : 'limit_reached'}
        />
      )}

      <PatientNewRXViewer
        isOpen={patientNewRxViewerOpen}
        onClose={() => {
          setPatientNewRxViewerOpen(false);
          setPatientNewRxData(null);
        }}
        patientName={patientNewRxData?.name || "Patient"}
        userId={patientNewRxData?.userId}
        patientLanguage={
          patientNewRxData?.language || "english"
        }
        newRXFiles={(patientNewRxData?.newRxFiles || []).map((file: any) => ({
          ...file,
          doctorName: file.doctorName || "Unknown Doctor",
          consultationDate: file.consultationDate || new Date().toISOString()
        }))}
      />

      {/* Create Placeholder Review Modal */}
      {showCreatePlaceholderModal && (
        <CreatePlaceholderReview
          onClose={() => setShowCreatePlaceholderModal(false)}
          onSubmit={handlePlaceholderReviewSubmit}
        />
      )}

      {/* Local Storage Debugger Modal */}
      {showLocalStorageDebugger && (
        <LocalStorageDebugger
          onClose={() => setShowLocalStorageDebugger(false)}
        />
      )}

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
          },
        }}
      />
    </Suspense>
  );
}
