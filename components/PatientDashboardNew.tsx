import React, { useState, useEffect } from 'react';
import { Lock, BarChart3, History, Bell, FolderHeart, Search, LogOut, Calendar, Stethoscope, Activity, TrendingUp, Heart } from 'lucide-react';
import { getFirestore, collection, query, where, getDocs, onSnapshot, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import healqrLogo from '../assets/healqr-logo.png';

// Import sub-components
import PatientConsultationHistory from './PatientConsultationHistory';
import PatientLiveStatus from './PatientLiveStatus';
import PatientNotifications from './PatientNotifications';
import PatientMedicoLocker from './PatientMedicoLocker';
import PatientSearch from './PatientSearchPage';
import PatientHealthCardProfile from './PatientHealthCardProfile';
import DashboardPromoDisplay from './DashboardPromoDisplay';

// PWA Install Instructions Banner
const PWAInstallBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const [showAndroidSteps, setShowAndroidSteps] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    // Detect if already installed as PWA
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);
    // Check if already dismissed
    if (localStorage.getItem('pwa_install_dismissed') === 'true') {
      setDismissed(true);
    }
  }, []);

  if (dismissed || isStandalone) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/30 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold">Install HealQR App</p>
            <p className="text-gray-400 text-xs">Add to home screen for quick access</p>
          </div>
        </div>
        <button
          onClick={() => {
            setDismissed(true);
            localStorage.setItem('pwa_install_dismissed', 'true');
          }}
          className="text-gray-500 hover:text-gray-300 p-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Android Instructions */}
      {!isIOS && (
        <div>
          <button
            onClick={() => setShowAndroidSteps(!showAndroidSteps)}
            className="w-full flex items-center justify-between bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-3 text-green-300 hover:bg-green-500/30 transition-all"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 2.273l1.564 1.58-2.426 2.449c1.455 1.269 2.339 3.125 2.339 5.198h-14c0-2.073.884-3.929 2.339-5.198L4.913 3.853l1.564-1.58 2.571 2.596A7.003 7.003 0 0112 4c1.07 0 2.087.24 2.952.669l2.571-2.396zM7 9.5a1.5 1.5 0 103.001.001A1.5 1.5 0 007 9.5zm7 0a1.5 1.5 0 103.001.001A1.5 1.5 0 0014 9.5zM5 13h14v8c0 .55-.45 1-1 1h-1v2.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V22h-4v2.5c0 .83-.67 1.5-1.5 1.5S7 25.33 7 24.5V22H6c-.55 0-1-.45-1-1v-8z"/></svg>
              <span className="font-medium text-sm">Android — Install Steps</span>
            </div>
            <svg className={`w-4 h-4 transition-transform ${showAndroidSteps ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showAndroidSteps && (
            <div className="mt-3 bg-gray-800/60 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <p className="text-gray-300">Tap the <strong className="text-white">⋮ three dots</strong> menu (top-right corner of Chrome)</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <p className="text-gray-300">Select <strong className="text-white">"Add to Home screen"</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <p className="text-gray-300">Tap <strong className="text-white">"Install"</strong> — the HealQR app icon will appear on your home screen</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* iOS Instructions */}
      {isIOS && (
        <div>
          <button
            onClick={() => setShowIOSSteps(!showIOSSteps)}
            className="w-full flex items-center justify-between bg-blue-500/20 border border-blue-500/30 rounded-lg px-4 py-3 text-blue-300 hover:bg-blue-500/30 transition-all"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              <span className="font-medium text-sm">iPhone / iPad — Install Steps</span>
            </div>
            <svg className={`w-4 h-4 transition-transform ${showIOSSteps ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showIOSSteps && (
            <div className="mt-3 bg-gray-800/60 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <p className="text-gray-300">Open this page in <strong className="text-white">Safari</strong> (not Chrome)</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <p className="text-gray-300">Tap the <strong className="text-white">Share button</strong> (square with arrow at bottom)</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <p className="text-gray-300">Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                <p className="text-gray-300">Tap <strong className="text-white">"Add"</strong> — the HealQR icon will appear on your home screen</p>
              </div>
              <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-300 text-xs">⚠️ <strong>Important:</strong> Must use Safari on iOS. Chrome does not support "Add to Home Screen" on iPhone.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show both if on desktop */}
      {!isIOS && typeof window !== 'undefined' && !/Android/i.test(navigator.userAgent) && (
        <div className="mt-3">
          <button
            onClick={() => setShowIOSSteps(!showIOSSteps)}
            className="w-full flex items-center justify-between bg-blue-500/20 border border-blue-500/30 rounded-lg px-4 py-3 text-blue-300 hover:bg-blue-500/30 transition-all"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              <span className="font-medium text-sm">iPhone / iPad — Install Steps</span>
            </div>
            <svg className={`w-4 h-4 transition-transform ${showIOSSteps ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showIOSSteps && (
            <div className="mt-3 bg-gray-800/60 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <p className="text-gray-300">Open this page in <strong className="text-white">Safari</strong> (not Chrome)</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <p className="text-gray-300">Tap the <strong className="text-white">Share button</strong> (square with arrow at bottom)</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <p className="text-gray-300">Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                <p className="text-gray-300">Tap <strong className="text-white">"Add"</strong> — the HealQR icon will appear on your home screen</p>
              </div>
              <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-300 text-xs">⚠️ <strong>Important:</strong> Must use Safari on iOS. Chrome does not support "Add to Home Screen" on iPhone.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PatientDashboardNew = ({ onLanguageDetected }: { onLanguageDetected?: (lang: string) => void }) => {
  const [patientData, setPatientData] = useState<any>(null);
  const [patientLanguage, setPatientLanguage] = useState<string>(localStorage.getItem('patient_language') || 'english');
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalConsultations: 0,
    upcomingAppointments: 0,
    unreadNotifications: 0,
    prescriptions: 0
  });
  const [specialtyStats, setSpecialtyStats] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [healthCardData, setHealthCardData] = useState<any>(null);

  useEffect(() => {
    // Check if in demo mode
    const isDemoMode = localStorage.getItem('patient_demo_mode') === 'true';
    setDemoMode(isDemoMode);

    if (isDemoMode) {

      loadDemoData();
    } else {
      loadPatientData();
    }
  }, []);

  // Reload health card data when returning to dashboard view
  useEffect(() => {
    if (currentView === 'dashboard') {
      const isDemoMode = localStorage.getItem('patient_demo_mode') === 'true';
      if (isDemoMode) {
        // Reload from localStorage
        const savedDemoHealthCard = localStorage.getItem('demo_health_card');
        if (savedDemoHealthCard) {
          setHealthCardData(JSON.parse(savedDemoHealthCard));
        }
      } else {
        // Reload from Firestore for real users
        const patientPhone = localStorage.getItem('patient_phone');
        if (patientPhone) {
          loadHealthCardData(patientPhone);
        }
      }
    }
  }, [currentView]);

  const loadDemoData = () => {
    // Demo mode disabled - redirect to real login
    localStorage.removeItem('patient_demo_mode');
    window.location.href = '/?page=patient-login';
  };

  const loadPatientData = async () => {
    try {
      const patientPhone = localStorage.getItem('patient_phone');
      if (!patientPhone) {
        window.location.href = '/?page=patient-login';
        return;
      }

      const db = getFirestore();

      // Load patient data from last booking
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef, where('patientPhone', '==', patientPhone), limit(1));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const latestBooking = snapshot.docs[0].data();
        setPatientData({
          name: latestBooking.patientName,
          phone: latestBooking.patientPhone,
          age: latestBooking.patientAge,
          gender: latestBooking.patientGender,
          email: latestBooking.patientEmail || ''
        });

        // Detect and store patient's language preference from booking
        const lang = latestBooking.language || 'english';
        if (lang && lang !== 'en' && lang !== 'english') {
          setPatientLanguage(lang);
          localStorage.setItem('patient_language', lang);
          onLanguageDetected?.(lang);
        }

        // Calculate stats
        calculateStats(patientPhone);
      }

      // Load health card data
      loadHealthCardData(patientPhone);

      setLoading(false);
    } catch (error) {
      console.error('Error loading patient data:', error);
      setLoading(false);
    }
  };

  const loadHealthCardData = async (patientPhone: string) => {
    try {
      const db = getFirestore();
      const healthCardRef = doc(db, 'patientHealthCards', patientPhone);
      const healthCardSnap = await getDoc(healthCardRef);

      if (healthCardSnap.exists()) {
        setHealthCardData(healthCardSnap.data());
      }
    } catch (error) {
      console.error('Error loading health card data:', error);
    }
  };

  const calculateStats = async (phone: string) => {
    const db = getFirestore();
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('patientPhone', '==', phone));
    const snapshot = await getDocs(q);

    const specialtyCount: { [key: string]: number } = {};
    let upcoming = 0;
    let totalRx = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const specialty = data.specialty || 'General Medicine';
      specialtyCount[specialty] = (specialtyCount[specialty] || 0) + 1;

      // Upcoming: only future/today bookings with active status
      if (data.status === 'confirmed' || data.status === 'in-queue') {
        const bookingDateStr = data.bookingDate || data.consultationDate;
        if (bookingDateStr) {
          const bookingDate = new Date(bookingDateStr);
          bookingDate.setHours(0, 0, 0, 0);
          if (bookingDate >= today) {
            upcoming++;
          }
        } else {
          // No date field — count as upcoming if status is active
          upcoming++;
        }
      }

      // Prescriptions: count prescriptionImages, prescriptionUrl, or digitalRxUrl
      if (
        (data.prescriptionImages && data.prescriptionImages.length > 0) ||
        data.prescriptionUrl ||
        data.digitalRxUrl ||
        data.rxPdfUrl
      ) {
        totalRx++;
      }
    });

    // Fetch unread notifications count
    let unreadCount = 0;
    try {
      const phone10 = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
      const notifRef = collection(db, 'patient_notifications');
      const notifQuery = query(notifRef, where('patientPhone', '==', phone10), where('read', '==', false));
      const notifSnap = await getDocs(notifQuery);
      unreadCount = notifSnap.size;
    } catch (e) {
      // Also try without read filter (in case read field doesn't exist)
      try {
        const phone10 = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
        const notifRef = collection(db, 'patient_notifications');
        const notifQuery = query(notifRef, where('patientPhone', '==', phone10));
        const notifSnap = await getDocs(notifQuery);
        unreadCount = notifSnap.size;
      } catch (e2) {
        console.error('Error fetching notifications count:', e2);
      }
    }

    const colors = ['#FF9800', '#FF6B6B', '#FFB347', '#FFA500', '#FF8C00'];
    const specialtyData = Object.entries(specialtyCount).map(([specialty, visits], index) => ({
      specialty,
      visits,
      color: colors[index % colors.length]
    }));

    setStats({
      totalConsultations: snapshot.size,
      upcomingAppointments: upcoming,
      unreadNotifications: unreadCount,
      prescriptions: totalRx
    });

    setSpecialtyStats(specialtyData);

    // Build recent activity from real bookings
    const activities: any[] = [];
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const bookingDate = data.bookingDate || data.consultationDate || (data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null);
      const timestamp = bookingDate ? new Date(bookingDate).getTime() : 0;
      const doctor = data.doctorName || 'Doctor';
      const spec = data.specialty || 'General Medicine';

      // Consultation status activity
      if (data.isCompleted || data.consultationStatus === 'completed' || data.isMarkedSeen) {
        activities.push({
          type: 'consultation_completed',
          title: 'Consultation Completed',
          description: `${doctor} - ${spec}`,
          timestamp,
          date: bookingDate
        });
      } else if (data.status === 'confirmed' || data.status === 'in-queue') {
        activities.push({
          type: 'booking_confirmed',
          title: data.status === 'in-queue' ? 'In Queue' : 'Booking Confirmed',
          description: `${doctor} - ${spec}`,
          timestamp,
          date: bookingDate
        });
      } else {
        activities.push({
          type: 'visited',
          title: 'Visit Recorded',
          description: `${doctor} - ${spec}`,
          timestamp,
          date: bookingDate
        });
      }

      // Prescription activity
      if (data.prescriptionImages && data.prescriptionImages.length > 0) {
        activities.push({
          type: 'prescription',
          title: 'Prescription Received',
          description: `Digital RX from ${doctor}`,
          timestamp: timestamp + 1, // slightly after consultation
          date: bookingDate
        });
      }
    });

    // Sort by most recent first, limit to 10
    activities.sort((a, b) => b.timestamp - a.timestamp);
    setRecentActivity(activities.slice(0, 10));
  };

  // Helper to format relative time
  const getTimeAgo = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('patient_phone');
    localStorage.removeItem('patient_session_expiry');
    localStorage.removeItem('patient_demo_mode');
    window.location.href = '/?page=patient-login';
  };

  const renderDashboardContent = () => {
    return (
      <div className="space-y-6">
        {/* Full-width Encrypted Badge - Orange */}
        <div className="w-full flex items-center justify-center rounded-xl bg-orange-500 text-white font-bold py-3 text-base shadow shadow-orange-200">
          <Lock className="w-5 h-5 mr-2" />
          Data is encrypted
        </div>

        {/* Stats Overview - White + Blue */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-xs font-medium">Total Consultations</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.totalConsultations}</p>
              </div>
              <div className="bg-blue-50 p-2.5 rounded-lg">
                <Stethoscope className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-xs font-medium">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.upcomingAppointments}</p>
              </div>
              <div className="bg-blue-50 p-2.5 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-xs font-medium">Notifications</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.unreadNotifications}</p>
              </div>
              <div className="bg-blue-50 p-2.5 rounded-lg">
                <Bell className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-xs font-medium">Prescriptions</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.prescriptions}</p>
              </div>
              <div className="bg-blue-50 p-2.5 rounded-lg">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Health Card - Now Clickable - Green */}
        <div
          onClick={() => setCurrentView('health-card')}
          className="rounded-xl p-8 text-white cursor-pointer hover:shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300"
          style={{ background: 'linear-gradient(to bottom right, rgb(16, 185, 129), rgb(5, 150, 105))' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-6 h-6" />
                <h3 className="text-2xl font-bold">Health Card</h3>
              </div>
              {healthCardData?.mission && (
                <p className="text-emerald-50 italic mb-4">&ldquo;{healthCardData.mission}&rdquo;</p>
              )}
              {!healthCardData?.mission && (
                <p className="text-emerald-100 mb-4">Your complete health profile at a glance</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <div>
                  <p className="text-emerald-100 text-sm">Name</p>
                  <p className="font-semibold text-lg">{healthCardData?.name || patientData?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-emerald-100 text-sm">Age / Gender</p>
                  <p className="font-semibold text-lg">{healthCardData?.age || patientData?.age || 'N/A'} / {healthCardData?.gender || patientData?.gender || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-emerald-100 text-sm">Blood Group</p>
                  <p className="font-semibold text-lg">{healthCardData?.bloodGroup || patientData?.bloodGroup || 'Not Set'}</p>
                </div>
              </div>
              <div className="mt-4 text-sm text-emerald-100 flex items-center gap-2">
                <span>Click to view & edit full profile</span>
                <span>→</span>
              </div>
            </div>
            <div className="hidden lg:block ml-6">
              <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Activity className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Health Tip Card */}
        <DashboardPromoDisplay
          category="health-tip"
          placement="patient-dashboard"
          className="shadow-lg"
        />

        {/* PWA Install Instructions */}
        <PWAInstallBanner />

        {/* Specialty-wise Visits Chart */}
        <div className="bg-gray-800 rounded-lg p-6 border border-orange-500/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Specialty-wise Consultations
            </h3>
          </div>

          {specialtyStats.length > 0 ? (
            <div className="space-y-4">
              {specialtyStats.map((item, index) => {
                const maxVisits = Math.max(...specialtyStats.map(s => s.visits));
                const percentage = (item.visits / maxVisits) * 100;

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">{item.specialty}</span>
                      <span className="text-white font-semibold">{item.visits} visits</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No consultation data available</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800 rounded-lg p-6 border border-orange-500/20">
          <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => {
                const timeAgo = activity.date ? getTimeAgo(activity.date) : '';
                const dotColor = activity.type === 'consultation_completed' ? 'bg-green-500'
                  : activity.type === 'prescription' ? 'bg-blue-500'
                  : activity.type === 'booking_confirmed' ? 'bg-yellow-500'
                  : 'bg-orange-500';
                return (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg">
                    <div className={`w-2 h-2 ${dotColor} rounded-full mt-2`}></div>
                    <div>
                      <p className="text-white font-medium">{activity.title}</p>
                      <p className="text-gray-400 text-sm">{activity.description}</p>
                      {timeAgo && <p className="text-gray-500 text-xs mt-1">{timeAgo}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-6">
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity yet</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboardContent();
      case 'health-card':
        return <PatientHealthCardProfile />;
      case 'history':
        return <PatientConsultationHistory language={patientLanguage} />;
      case 'live-tracker':
        return <PatientLiveStatus language={patientLanguage} />;
      case 'notifications':
        return <PatientNotifications patientPhone={patientData?.phone} language={patientLanguage} />;
      case 'medico-locker':
        return <PatientMedicoLocker language={patientLanguage} />;
      case 'search':
        return <PatientSearch language={patientLanguage} isDashboard={true} />;
      default:
        return renderDashboardContent();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black overflow-hidden relative">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed top-0 bottom-0 left-0 z-50 w-64 h-screen bg-gray-900 border-r border-gray-800 transition-transform duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <img src={healqrLogo} alt="healQr" className="h-12 mb-2" />
          <p className="text-gray-400 text-sm">Patient Portal</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => {
              setCurrentView('dashboard');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'dashboard'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Dashboard</span>
          </button>

          <div className="pt-4 pb-2">
            <p className="text-gray-500 text-xs font-semibold uppercase px-4">Health Records</p>
          </div>

          <button
            onClick={() => {
              setCurrentView('health-card');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'health-card'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Heart className="w-5 h-5" />
            <span>Health Card</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('history');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'history'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <History className="w-5 h-5" />
            <span>History</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('live-tracker');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'live-tracker'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span>Live Tracker</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('notifications');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'notifications'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
            {stats.unreadNotifications > 0 && (
              <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                {stats.unreadNotifications}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setCurrentView('medico-locker');
              setSidebarOpen(false);
            }}
            disabled
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 cursor-not-allowed opacity-50"
          >
            <FolderHeart className="w-5 h-5" />
            <span>Medico Locker</span>
            <span className="ml-auto text-xs bg-gray-700 px-2 py-1 rounded">Soon</span>
          </button>

          <div className="pt-4 pb-2">
            <p className="text-gray-500 text-xs font-semibold uppercase px-4">General</p>
          </div>

          <button
            onClick={() => {
              setCurrentView('search');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'search'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Search className="w-5 h-5" />
            <span>Find a Doctor</span>
          </button>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex flex-col h-screen overflow-hidden lg:ml-64 transition-all duration-300">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 px-4 lg:px-8 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-white">
                  Welcome Back, {patientData?.name?.split(' ')[0] || 'Patient'}!
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {currentView === 'dashboard' && 'Your health dashboard overview'}
                  {currentView === 'history' && 'Consultation History'}
                  {currentView === 'live-tracker' && 'Live Queue Status'}
                  {currentView === 'notifications' && 'Your Notifications'}
                  {currentView === 'medico-locker' && 'Medical Records Locker'}
                  {currentView === 'search' && 'Find a Doctor Near You'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Encrypted badge moved to dashboard content area */}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default PatientDashboardNew;
