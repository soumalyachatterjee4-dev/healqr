// MAIN CLINIC DASHBOARD - ACTIVE VERSION
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  Share2,
  Copy,
  Bell,
  User,
  BarChart3,
  Calendar,
  Menu,
  Clock,
  Building2,
  QrCode,
  Users,
  Stethoscope,
  Lock as LucideLock,
  BrainCircuit,
  Settings,
  Instagram,
  Facebook,
  ArrowRight,
  Sparkles,
  Video
} from 'lucide-react';
import { auth, db } from '../lib/firebase/config';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import ClinicSidebar from './ClinicSidebar';
import LocationManagerCreator from './LocationManagerCreator';
import ClinicProfileManager from './ClinicProfileManager';
import ClinicQRManager from './ClinicQRManager';
import ClinicScheduleManager from './ClinicScheduleManager';
import ClinicTodaysSchedule from './ClinicTodaysSchedule';
import ManageDoctors from './ManageDoctors';
import BrainDeckManager from './BrainDeckManager';
import DashboardPromoDisplay from './DashboardPromoDisplay';
import ClinicAdvanceBooking from './ClinicAdvanceBooking';
import ClinicAnalytics from './ClinicAnalytics';
import ClinicReports from './ClinicReports';
import ClinicSocialMediaKit from './ClinicSocialMediaKit';
import ClinicMonthlyPlanner from './ClinicMonthlyPlanner';
import ClinicPreviewCenter from './ClinicPreviewCenter';
import ClinicAssistantAccessManager from './ClinicAssistantAccessManager';
import ClinicLabReferralManager from './ClinicLabReferralManager';
import ClinicPersonalizedTemplatesManager from './ClinicPersonalizedTemplatesManager';
import ClinicEmergencyButtonManager from './ClinicEmergencyButtonManager';
import ClinicAIDietChartManager from './ClinicAIDietChartManager';
import ClinicAIRXReaderManager from './ClinicAIRXReaderManager';
import ClinicVideoConsultationManager from './ClinicVideoConsultationManager';
import VideoLibrary from './VideoLibrary';
import ClinicCMEViewer from './ClinicCMEViewer';
import ClinicSampleRequest from './ClinicSampleRequest';
import UnifiedChatWidget from './UnifiedChatWidget';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface ClinicData {
  id?: string;
  name: string;
  email: string;
  address: string;
  pinCode: string;
  qrNumber: string;
  clinicCode?: string;
  phone?: string;
  logoUrl?: string;
  companyName?: string;
  linkedDoctorCodes?: string[];
  linkedDoctorsDetails?: Array<{
    doctorId: string;
    doctorCode: string;
    name: string;
    email: string;
    specialties?: string[];
    profileImage?: string;
  }>;
}

interface TodayChamber {
  id: string;
  chamberName: string;
  chamberNo: string;
  doctorName: string;
  doctorId: string;
  specialty: string;
  address: string;
  startTime: string;
  endTime: string;
  booked: number;
  capacity: number;
  isExpired: boolean;
}

export default function ClinicDashboard({ onLogout }: { onLogout?: () => void | Promise<void> }) {
  const [clinicData, setClinicData] = useState<ClinicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState(() => {
    return 'dashboard';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [todaysChambers, setTodaysChambers] = useState<TodayChamber[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Real-time refresh trigger

  // Assistant and Location Manager detection
  const isAssistant = localStorage.getItem('healqr_is_assistant') === 'true';
  const isLocationManager = localStorage.getItem('healqr_is_location_manager') === 'true';
  const locationManagerBranchId = localStorage.getItem('healqr_location_id') || '';
  const assistantAllowedPages: string[] = isAssistant
    ? (() => { try { return JSON.parse(localStorage.getItem('healqr_assistant_pages') || '["dashboard"]'); } catch { return ['dashboard']; } })()
    : [];

  // Resolve the clinic ID: branch managers (including branch assistants) use parent clinic ID
  const resolvedClinicId = isLocationManager
    ? localStorage.getItem('healqr_parent_clinic_id') || auth?.currentUser?.uid || ''
    : isAssistant
    ? localStorage.getItem('healqr_assistant_doctor_id') || auth?.currentUser?.uid || ''
    : auth?.currentUser?.uid || '';

  // Compute display name: branch name for location managers, clinic name for owners
  const getDisplayClinicName = () => {
    if (isLocationManager && locationManagerBranchId && clinicData) {
      const branchLoc = (clinicData as any).locations?.find((l: any) => l.id === locationManagerBranchId);
      if (branchLoc?.name) return branchLoc.name;
    }
    return clinicData?.name || 'Clinic';
  };
  const displayClinicName = clinicData ? getDisplayClinicName() : 'Clinic';

  // Branch managers restricted pages
  const branchAllowedPages = [
    'dashboard', 'doctors', 'qr-manager', 'schedule-manager', 'todays-schedule',
    'advance-booking', 'analytics', 'reports', 'social-kit', 'monthly-planner',
    'assistant', 'lab-referral', 'ai-diet', 'ai-rx', 'video-consult'
  ];

  // Guarded menu change: enforce page access restrictions
  const handleMenuChange = (menu: string) => {
    if (isLocationManager && !branchAllowedPages.includes(menu)) return;
    if (isAssistant && menu !== 'dashboard' && !assistantAllowedPages.includes(menu)) return;
    setActiveMenu(menu);
  };

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState({
    totalScans: 0,
    totalBookings: 0,
    qrBookings: 0,
    clinicQRBookings: 0,
    doctorQRBookings: 0,
    walkinBookings: 0,
    dropOuts: 0,
    cancelled: 0,
    monthlyBookings: 0
  });

  // Load data whenever refreshTrigger changes or user changes
  useEffect(() => {
    const fetchData = async () => {
      if (!resolvedClinicId) {
        setLoading(false);
        return;
      }

      try {
        // For assistants, load the parent clinic's data
        const clinicRef = doc(db, 'clinics', resolvedClinicId);
        const clinicSnap = await getDoc(clinicRef);

        if (clinicSnap.exists()) {
          const rawData = clinicSnap.data();
          const data = { id: clinicSnap.id, ...rawData } as ClinicData;
          setClinicData(data);

          // Now fetch analytics and schedule in parallel using the fetched data
          await Promise.all([
            loadClinicAnalytics(data),
            loadTodaysSchedule(data)
          ]);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing dashboard:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshTrigger, resolvedClinicId]);

  // 🔥 REAL-TIME LISTENER: Triggers refresh via state change
  useEffect(() => {
    if (!resolvedClinicId) return;

    let timeoutId: NodeJS.Timeout | null = null;

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('clinicId', '==', resolvedClinicId)
    );

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified' || change.type === 'removed') {
          // Debounce: wait 800ms to avoid rapid updates
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            setRefreshTrigger(prev => prev + 1); // Trigger data reload
          }, 800);
        }
      });
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [resolvedClinicId]);

  const loadClinicAnalytics = async (data: ClinicData) => {
    if (!resolvedClinicId) return;

    try {
      // Get current month date range for client-side filtering
      const now = new Date();
      const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const currentMonthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;

      // 1. Fetch all doctor bookings in parallel
      const doctorBookingsPromises = (data.linkedDoctorsDetails || []).map(async (doctor) => {
        const docId = doctor?.doctorId || (doctor as any)?.uid;
        if (!docId) return null;

        try {
          const clinicBookingsQuery = query(
            collection(db, 'bookings'),
            where('doctorId', '==', docId),
            where('clinicId', '==', resolvedClinicId)
          );
          return await getDocs(clinicBookingsQuery);
        } catch (err) {
          console.error(`Error fetching bookings for doctor ${docId}:`, err);
          return null;
        }
      });

      // 2. Fetch scan data in parallel (skip for branch managers — Firestore rules restrict to clinic owner)
      const scansQueryPromise = (async () => {
        if (isLocationManager) return null;
        try {
          const scansQuery = query(
            collection(db, 'qrScans'),
            where('scannedBy', '==', 'clinic'),
            where('clinicId', '==', resolvedClinicId)
          );
          return await getDocs(scansQuery);
        } catch (err) {
          console.error('Error fetching scan data:', err);
          return null;
        }
      })();

      const [bookingsSnapshots, scansSnap] = await Promise.all([
        Promise.all(doctorBookingsPromises),
        scansQueryPromise
      ]);

      // For branch managers, build a set of chamberIds belonging to their branch
      let branchChamberIds: Set<string> | null = null;
      if (isLocationManager && locationManagerBranchId) {
        try {
          const allChamberIds = new Set<string>();
          for (const doctor of (data.linkedDoctorsDetails || [])) {
            const docId = doctor?.doctorId || (doctor as any)?.uid;
            if (!docId) continue;
            const doctorSnap = await getDoc(doc(db, 'doctors', docId));
            if (doctorSnap.exists()) {
              const chambers = doctorSnap.data().chambers || [];
              chambers.forEach((c: any) => {
                if (c.clinicId !== resolvedClinicId) return;
                const cLocId = c.clinicLocationId || c.locationId || '';
                if (cLocId === locationManagerBranchId) {
                  allChamberIds.add(String(c.id));
                }
              });
            }
          }
          if (allChamberIds.size > 0) branchChamberIds = allChamberIds;
        } catch (e) { /* ignore */ }
      }

      // 3. Process the results
      let qrBookings = 0;
      let clinicQRBookings = 0;
      let doctorQRBookings = 0;
      let walkinBookings = 0;
      let dropOuts = 0;
      let cancelled = 0;

      bookingsSnapshots.forEach((snap) => {
        if (!snap) return;
        snap.forEach((docSnap) => {
          const bookingData = docSnap.data();

          // Branch managers: only count bookings for their branch
          if (isLocationManager && locationManagerBranchId) {
            const bLocId = bookingData.clinicLocationId || bookingData.locationId || '';
            if (bLocId) {
              if (bLocId !== locationManagerBranchId) return;
            } else if (branchChamberIds && branchChamberIds.size > 0) {
              if (!branchChamberIds.has(String(bookingData.chamberId))) return;
            } else {
              return;
            }
          }

          const isCancelled = bookingData.status === 'cancelled' || bookingData.isCancelled === true;

          if (bookingData.appointmentDate && bookingData.appointmentDate < todayStr) {
            if (!isCancelled && !bookingData.isMarkedSeen) {
              dropOuts++;
            }
          }

          if (!isCancelled) {
            if (bookingData.bookingSource === 'clinic_qr') {
              clinicQRBookings++;
              qrBookings++;
            } else if (bookingData.bookingSource === 'doctor_qr' || (bookingData.type === 'qr_booking' && !bookingData.bookingSource)) {
              doctorQRBookings++;
              qrBookings++;
            } else if (bookingData.type === 'walkin_booking') {
              walkinBookings++;
            }
          } else {
            cancelled++;
          }
        });
      });

      const totalScans = scansSnap?.size || 0;
      const totalBookings = qrBookings + walkinBookings;

      // Count monthly bookings (current month only)
      let monthlyQR = 0;
      let monthlyWalkin = 0;
      bookingsSnapshots.forEach((snap) => {
        if (!snap) return;
        snap.forEach((docSnap) => {
          const bData = docSnap.data();

          // Branch filter (same as above)
          if (isLocationManager && locationManagerBranchId) {
            const bLocId = bData.clinicLocationId || bData.locationId || '';
            if (bLocId) {
              if (bLocId !== locationManagerBranchId) return;
            } else if (branchChamberIds && branchChamberIds.size > 0) {
              if (!branchChamberIds.has(String(bData.chamberId))) return;
            } else {
              return;
            }
          }

          const apptDate = bData.appointmentDate || '';
          if (apptDate < currentMonthStart || apptDate > currentMonthEnd) return;

          const isCancelled = bData.status === 'cancelled' || bData.isCancelled === true;
          if (isCancelled) return;

          if (bData.bookingSource === 'clinic_qr' || bData.bookingSource === 'doctor_qr' || (bData.type === 'qr_booking' && !bData.bookingSource)) {
            monthlyQR++;
          } else if (bData.type === 'walkin_booking') {
            monthlyWalkin++;
          }
        });
      });

      setAnalyticsData({
        totalScans,
        totalBookings,
        qrBookings,
        clinicQRBookings,
        doctorQRBookings,
        walkinBookings,
        dropOuts,
        cancelled,
        monthlyBookings: monthlyQR + monthlyWalkin
      });
    } catch (error) {
      console.error('Error processing clinic analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodaysSchedule = async (data: ClinicData) => {
    if (!resolvedClinicId) return;

    try {
      const linkedDoctors = data.linkedDoctorsDetails;
      if (!linkedDoctors || !Array.isArray(linkedDoctors)) {
        setTodaysChambers([]);
        return;
      }

      const today = new Date();
      const todayDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];

      // Determine main branch ID from clinic locations
      const clinicLocations = data.locations || [];
      const mainBranchId = clinicLocations.length > 0 ? clinicLocations[0].id : '001';

      // 1. Fetch all doctors and their chambers in parallel
      const doctorDetailsPromises = linkedDoctors.map(async (doctor) => {
        const docId = doctor?.doctorId || (doctor as any)?.uid;
        if (!docId) return null;

        try {
          const doctorSnap = await getDoc(doc(db, 'doctors', docId));
          if (!doctorSnap.exists()) return null;

          const doctorData = doctorSnap.data();
          if (!doctorData || !doctorData.chambers) return null;

          // Filter chambers for this clinic and for TODAY
          const todayChambers = (doctorData.chambers as any[]).filter((chamber: any) => {
            if (!chamber || chamber.clinicId !== resolvedClinicId) return false;
            // Branch managers: only show chambers for their branch
            if (isLocationManager && locationManagerBranchId) {
              const chamberLocId = chamber.clinicLocationId || chamber.locationId || '';
              // Exclude chambers without locationId — they belong to main branch
              if (!chamberLocId || chamberLocId !== locationManagerBranchId) return false;
            } else {
              // Main clinic: only show chambers belonging to main branch
              const chamberLocId = chamber.clinicLocationId || chamber.locationId || '';
              if (chamberLocId && chamberLocId !== '001' && chamberLocId !== mainBranchId) return false;
            }
            if (chamber.frequency === 'Custom') {
              return chamber.customDate === today.toISOString().split('T')[0];
            }
            return chamber.days && Array.isArray(chamber.days) && chamber.days.includes(todayDay);
          });

          return { doctorData, todayChambers };
        } catch (err) {
          console.error(`Error fetching schedule for doctor ${docId}:`, err);
          return null;
        }
      });

      const doctorDetails = await Promise.all(doctorDetailsPromises);

      // 2. Format and flatten chambers
      const chambers: TodayChamber[] = [];
      const now = new Date();
      doctorDetails.forEach((res) => {
        if (!res) return;
        const { doctorData, todayChambers } = res;

        todayChambers.forEach((chamber) => {
          // Calculate isExpired based on endTime
          let isExpired = false;
          if (chamber.endTime) {
            const [endHour, endMin] = chamber.endTime.split(':').map(Number);
            const chamberEndTime = new Date(now);
            chamberEndTime.setHours(endHour, endMin, 0, 0);
            isExpired = chamberEndTime < now;
          }

          chambers.push({
            id: chamber.id,
            doctorName: doctorData.name || 'Doctor',
            specialty: doctorData.specialties?.[0] || 'Medical Specialist',
            chamberName: chamber.chamberName,
            chamberNo: chamber.chamberNo || '1',
            doctorId: doctorData.doctorId,
            address: chamber.chamberAddress,
            startTime: chamber.startTime || '00:00',
            endTime: chamber.endTime || '00:00',
            booked: 0, // Inferred for now
            capacity: chamber.maxCapacity || 0,
            isExpired
          });
        });
      });

      // Sort: active chambers first, expired to bottom, then by start time
      chambers.sort((a, b) => {
        if (a.isExpired && !b.isExpired) return 1;
        if (!a.isExpired && b.isExpired) return -1;
        const aStart = a.startTime.split(':').map(Number);
        const bStart = b.startTime.split(':').map(Number);
        return (aStart[0] * 60 + (aStart[1] || 0)) - (bStart[0] * 60 + (bStart[1] || 0));
      });

      setTodaysChambers(chambers);
    } catch (error) {
      console.error('Error loading todays schedule:', error);
    }
  };

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
      return;
    }
    try {
      // Clear all clinic/session localStorage to prevent stale redirects
      localStorage.removeItem('healqr_authenticated');
      localStorage.removeItem('healqr_qr_code');
      localStorage.removeItem('healqr_user_email');
      localStorage.removeItem('healqr_user_name');
      localStorage.removeItem('healqr_is_clinic');
      localStorage.removeItem('healqr_is_assistant');
      localStorage.removeItem('healqr_assistant_pages');
      localStorage.removeItem('healqr_assistant_doctor_id');
      localStorage.removeItem('healqr_is_location_manager');
      localStorage.removeItem('healqr_location_id');
      localStorage.removeItem('healqr_parent_clinic_id');
      localStorage.removeItem('userId');
      localStorage.removeItem('healqr_profile_photo');
      localStorage.removeItem('healqr_doctor_stats');
      localStorage.removeItem('healqr_qr_id');
      localStorage.removeItem('healqr_booking_url');
      localStorage.removeItem('healqr_sidebar_collapsed');
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout');
    }
  };

  const copyClinicCode = () => {
    // Branch managers: copy their branch clinic code
    let code = clinicData?.clinicCode || '';
    if (isLocationManager && locationManagerBranchId && clinicData?.locations) {
      const branchLoc = clinicData.locations.find((l: any) => l.id === locationManagerBranchId);
      if (branchLoc?.clinicCode) code = branchLoc.clinicCode;
    } else if (clinicData?.locations) {
      // Main owner: use 001 location code (with 001 segment)
      const mainLoc = clinicData.locations.find((l: any) => l.id === '001');
      if (mainLoc?.clinicCode) code = mainLoc.clinicCode;
    }
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success('Clinic code copied to clipboard!');
      setShareMenuOpen(false);
    }
  };

  // Render Location Manager if menu is active
  if (activeMenu === 'location-manager') {
    // Only show to non-location-manager users (clinic owners)
    if (isLocationManager) {
      setActiveMenu('dashboard');
      return null;
    }
    return (
      <LocationManagerCreator
        onMenuChange={handleMenuChange}
        onLogout={handleLogout}
      />
    );
  }

  // Render Profile Manager if menu is active
  if (activeMenu === 'profile') {
    return (
      <ClinicProfileManager
        onMenuChange={handleMenuChange}
        onLogout={handleLogout}
      />
    );
  }

  // Render QR Manager if menu is active
  if (activeMenu === 'qr-manager') {
    return (
      <ClinicQRManager
        onMenuChange={handleMenuChange}
        onLogout={handleLogout}
        profileData={{
          image: clinicData?.logoUrl || null,
          name: displayClinicName
        }}
      />
    );
  }

  // Render Schedule Manager if menu is active
  if (activeMenu === 'schedule' || activeMenu === 'schedule-manager') {
    return <ClinicScheduleManager onMenuChange={handleMenuChange} onLogout={handleLogout} />;
  }

  // Render Today's Schedule if menu is active
  if (activeMenu === 'todays-schedule') {
    return <ClinicTodaysSchedule onMenuChange={handleMenuChange} onLogout={handleLogout} />;
  }

  // Render Manage Doctors if menu is active
  if (activeMenu === 'doctors') {
    return <ManageDoctors
      clinicId={resolvedClinicId}
      onNavigate={(view, doctorId) => {
        handleMenuChange(view);
        if (doctorId) {
          localStorage.setItem('selectedDoctorId', doctorId);
        }
      }}
    />;
  }

  // Render Advance Booking if menu is active
  if (activeMenu === 'advance-booking') {
    return <ClinicAdvanceBooking onMenuChange={handleMenuChange} onLogout={handleLogout} />;
  }

  // Render Analytics if menu is active
  if (activeMenu === 'analytics') {
    return (
      <ClinicAnalytics
        onMenuChange={handleMenuChange}
        onLogout={handleLogout}
        isSidebarCollapsed={false}
        setIsSidebarCollapsed={() => {}}
      />
    );
  }

  // Render Reports if menu is active
  if (activeMenu === 'reports') {
    return (
      <ClinicReports
        onMenuChange={handleMenuChange}
        onLogout={handleLogout}
        clinicId={resolvedClinicId}
      />
    );
  }

  // Render Social Kit & Offers if menu is active
  if (activeMenu === 'social-kit') {
    return (
      <ClinicSocialMediaKit
        clinicName={displayClinicName}
        clinicAddress={clinicData?.address || ''}
        clinicPhone={clinicData?.phone || ''}
        qrUrl={`https://healqr.com?clinicId=${resolvedClinicId}`}
        clinicLogo={clinicData?.logoUrl || null}
        onMenuChange={handleMenuChange}
        onLogout={handleLogout}
      />
    );
  }

  // Render Monthly Planner if menu is active
  if (activeMenu === 'monthly-planner') {
    return (
      <ClinicMonthlyPlanner
        onMenuChange={handleMenuChange}
        onLogout={handleLogout}
      />
    );
  }

  // Render Preview Centre if menu is active
  if (activeMenu === 'preview') {
    return (
      <ClinicPreviewCenter
        onMenuChange={handleMenuChange}
        onLogout={handleLogout}
        clinicData={clinicData}
      />
    );
  }

  // Render Assistant Access if menu is active
  if (activeMenu === 'assistant') {
    // For branch managers, use the branch's email (stored in location data)
    let assistantManagerEmail = clinicData?.email || auth.currentUser?.email || '';
    if (isLocationManager && locationManagerBranchId && clinicData) {
      const branchLoc = (clinicData as any).locations?.find((l: any) => l.id === locationManagerBranchId);
      if (branchLoc?.email) assistantManagerEmail = branchLoc.email;
    }
    return (
      <ClinicAssistantAccessManager
        clinicName={displayClinicName}
        email={assistantManagerEmail}
        onMenuChange={handleMenuChange}
        onLogout={handleLogout}
        activeAddOns={[]}
        managerAllowedPages={isLocationManager ? branchAllowedPages : undefined}
      />
    );
  }

  // Render Lab Referral Tracking if menu is active
  if (activeMenu === 'lab-referral') {
    return (
      <ClinicLabReferralManager
        clinicName={displayClinicName}
        clinicId={resolvedClinicId}
        onMenuChange={handleMenuChange}
        onLogout={handleLogout}
      />
    );
  }

  // Render Personalized Templates if menu is active
  if (activeMenu === 'templates') {
    return (
      <ClinicPersonalizedTemplatesManager
        clinicId={resolvedClinicId}
        onMenuChange={handleMenuChange}
        onLogout={handleLogout}
      />
    );
  }

  // Render Emergency Button if menu is active
  if (activeMenu === 'emergency') {
    return (
      <ClinicEmergencyButtonManager
        clinicId={resolvedClinicId}
        onMenuChange={handleMenuChange}
        onLogout={handleLogout}
      />
    );
  }

  // Render AI Diet Chart if menu is active
  if (activeMenu === 'ai-diet') {
    return (
      <ClinicAIDietChartManager
        clinicId={resolvedClinicId}
        clinicName={displayClinicName}
        onMenuChange={handleMenuChange}
        onLogout={handleLogout}
        activeAddOns={[]}
        historyOnly={true}
      />
    );
  }

  // Render AI RX Reader if menu is active
  if (activeMenu === 'ai-rx') {
    return (
      <ClinicAIRXReaderManager
        clinicName={displayClinicName}
        clinicId={resolvedClinicId}
        onMenuChange={handleMenuChange}
        onLogout={handleLogout}
        historyOnly={true}
      />
    );
  }

  // Render BrainDeck Manager if menu is active
  if (activeMenu === 'braindeck') {
    return <BrainDeckManager onBack={() => setActiveMenu('dashboard')} doctorName={displayClinicName} />;
  }

  // Render Video Consultation History if menu is active
  if (activeMenu === 'video-consult') {
    return (
      <ClinicVideoConsultationManager
        clinicId={resolvedClinicId}
        clinicName={displayClinicName}
        onMenuChange={handleMenuChange}
        onLogout={handleLogout}
        activeAddOns={[]}
        isAssistant={isAssistant}
        assistantAllowedPages={assistantAllowedPages}
      />
    );
  }

  // Render Video Library if menu is active (from navbar icon)
  if (activeMenu === 'video-library') {
    return (
      <VideoLibrary
        onBack={() => setActiveMenu('dashboard')}
        source="dashboard"
      />
    );
  }

  // Render CME Content viewer
  if (activeMenu === 'pharma-cme') {
    return (
      <ClinicCMEViewer
        onBack={() => setActiveMenu('dashboard')}
        companyName={clinicData?.companyName || ''}
        clinicName={displayClinicName}
      />
    );
  }

  // Render Sample Requests
  if (activeMenu === 'pharma-samples') {
    return (
      <ClinicSampleRequest
        onBack={() => setActiveMenu('dashboard')}
        companyName={clinicData?.companyName || ''}
        clinicName={displayClinicName}
      />
    );
  }

  // Handle unimplemented features
  const implementedMenus = [
    'dashboard', 'profile', 'qr-manager', 'schedule', 'schedule-manager',
    'todays-schedule', 'doctors', 'braindeck', 'video-consult', 'advance-booking', 'analytics', 'reports', 'social-kit', 'monthly-planner', 'preview', 'assistant',
    'lab-referral', 'templates', 'emergency', 'ai-diet', 'ai-rx', 'pharma-cme', 'pharma-samples'
  ];

  if (!implementedMenus.includes(activeMenu)) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
        <ClinicSidebar
          activeMenu={activeMenu}
          onMenuChange={handleMenuChange}
          onLogout={handleLogout}
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          isAssistant={isAssistant}
          assistantAllowedPages={assistantAllowedPages}
          isLocationManager={isLocationManager}
        />
        <div className="flex-1 lg:ml-64 flex flex-col items-center justify-center p-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
              <Settings className="w-8 h-8 text-blue-500 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold">Feature Coming Soon</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              We're working hard to bring this feature to your clinic dashboard. Stay tuned for updates!
            </p>
            <Button
              onClick={() => setActiveMenu('dashboard')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const menuTitles: Record<string, string> = {
    'dashboard': 'Dashboard',
    'doctors': 'Manage Doctors',
    'profile': 'Clinic Profile',
    'qr-manager': 'QR Manager',
    'schedule-manager': 'Schedule Manager',
    'todays-schedule': "Today's Schedule",
    'advance-booking': 'Advance Booking',
    'analytics': 'Analytics',
    'reports': 'Reports',
    'social-kit': 'Social Kit & Offers',
    'monthly-planner': 'Monthly Planner',
    'preview': 'Preview Centre',
    'assistant': 'Assistant Access',
    'lab-referral': 'Lab Referral Tracking',
    'templates': 'Personalized Templates',
    'emergency': 'Emergency Button',
    'ai-diet': 'AI Diet Chart',
    'ai-rx': 'AI RX Reader',
    'video-consult': 'Video Consultation'
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Sidebar */}
      <ClinicSidebar
        activeMenu={activeMenu}
        onMenuChange={(menu) => {
          handleMenuChange(menu);
          setMobileMenuOpen(false);
        }}
        onLogout={handleLogout}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isAssistant={isAssistant}
        assistantAllowedPages={assistantAllowedPages}
        isLocationManager={isLocationManager}
      />

      {/* Main Content Container */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top Header - Fixed */}
        <header className="bg-black border-b border-zinc-900 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
            >
              <Menu className="w-5 h-5 text-blue-500" />
            </button>
            <h2 className="text-lg md:text-xl font-medium">{menuTitles[activeMenu] || 'Dashboard'}</h2>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Share Button */}
            <Popover open={shareMenuOpen} onOpenChange={setShareMenuOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors">
                  <Share2 className="w-4 h-4 text-blue-500" />
                  <span className="text-sm hidden md:inline">Share</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 bg-zinc-900 border-zinc-700 text-white">
                <button
                  onClick={copyClinicCode}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors text-left"
                >
                  <Copy className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Copy Clinic Code</span>
                </button>
              </PopoverContent>
            </Popover>

            {/* Video Library */}
            <button
              onClick={() => handleMenuChange('video-library')}
              className="relative w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
              title="Video Library"
            >
              <Video className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button className="relative w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors">
              <Bell className="w-5 h-5" />
            </button>

            {/* Profile */}
            <button
              onClick={() => handleMenuChange('profile')}
              className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content - Scrollable */}
        <main className="flex-1 overflow-y-auto bg-black">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-400">Loading...</div>
            </div>
          ) : (
            <div className="px-4 md:px-8 py-8 space-y-8">
              {/* Welcome Card */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    Welcome Back, {displayClinicName} !
                  </h1>

                  {/* Rating Placeholder */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex text-amber-400">
                      {'★★★★'.split('').map((star, i) => <span key={i} className="text-lg">{star}</span>)}
                      <span className="text-lg text-gray-600">★</span>
                    </div>
                    <span className="text-white text-sm ml-1">4.5/5</span>
                    <span className="text-blue-500 text-sm hover:underline cursor-pointer">2 reviews</span>
                  </div>


                  {/* Full-width Encrypted Badge */}
                  <div className="w-full mb-3">
                    <div className="w-full flex items-center justify-center rounded-xl bg-orange-500 text-white font-bold py-3 text-base shadow shadow-orange-200">
                      <LucideLock className="w-5 h-5 mr-2" />
                      Data is encrypted
                    </div>
                  </div>

                  {/* Full-width BrainDeck Button */}
                  <div className="w-full mb-3">
                    <button
                      onClick={() => handleMenuChange('braindeck')}
                      className="w-full flex items-center justify-center rounded-xl bg-white text-blue-600 font-bold py-3 text-base border border-blue-200 shadow"
                      style={{ letterSpacing: '0.02em' }}
                    >
                      <BrainCircuit className="w-5 h-5 mr-2" />
                      healQR BrainDeck
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-500" />
                      <span className="text-sm text-gray-400">{isLocationManager
                        ? (() => {
                            const loc = clinicData?.locations?.find((l: any) => l.id === locationManagerBranchId);
                            return loc?.landmark || clinicData?.address || 'No address set';
                          })()
                        : clinicData?.address || 'No address set'
                      }</span>
                    </div>
                    {clinicData?.phone && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-400">{clinicData.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Social Media Kit Card - Green Banner */}
              <div
                className="rounded-2xl p-6 relative overflow-hidden shadow-xl"
                style={{ background: 'linear-gradient(to bottom right, rgb(16, 185, 129), rgb(5, 150, 105))' }}
              >
                {/* Top: Free + Active badges */}
                <div className="flex gap-2 mb-3">
                  <Badge variant="outline" className="text-white border-white/40 bg-transparent text-[10px] px-2 py-0 h-5">Free</Badge>
                  <Badge className="bg-green-700 text-white border-none text-[10px] px-2 py-0 h-5">Active</Badge>
                </div>

                {/* Bookings Count */}
                <div className="mb-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">{analyticsData.monthlyBookings}</span>
                    <span className="text-2xl font-semibold text-white">Bookings</span>
                  </div>
                  <p className="text-[11px] text-emerald-100 opacity-80 font-medium">
                    {new Date().toLocaleString('default', { month: 'short' })} 1, {new Date().getFullYear()} – {new Date().toLocaleString('default', { month: 'short' })} {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}, {new Date().getFullYear()}
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-white/10 my-4" />

                {/* Social Kit Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="hover:bg-white border-none text-[10px] font-bold px-2 py-0 h-5 shrink-0" style={{ backgroundColor: 'white', color: '#059669' }}>
                      <Sparkles className="w-3 h-3 mr-1" style={{ fill: '#059669' }} />
                      New
                    </Badge>
                    <h3 className="text-sm font-bold text-white whitespace-nowrap">Social Media Kit</h3>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-emerald-100/80">Create branded posts for Instagram & WhatsApp.</p>
                    <button
                      onClick={() => handleMenuChange('social-kit')}
                      className="hover:bg-slate-50 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-all shadow-lg shrink-0"
                      style={{ backgroundColor: 'white', color: '#059669' }}
                    >
                      Try Now
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Social Icons + One-click share */}
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex -space-x-1">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                      <Instagram className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                      <Facebook className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                      <Share2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                  <span className="text-[11px] text-blue-100/90 font-medium">One-click share</span>
                </div>
              </div>

              {/* Doctors by Specialty - Compact */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-white">Doctors by Specialty</h3>
                </div>

                {clinicData?.linkedDoctorsDetails && clinicData.linkedDoctorsDetails.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      // Deduplicate doctors by UID
                      const allDoctors = clinicData.linkedDoctorsDetails || [];
                      const uniqueMap = new Map();
                      allDoctors.forEach((d) => { if (d.uid && !uniqueMap.has(d.uid)) uniqueMap.set(d.uid, d); });
                      const uniqueDoctors = Array.from(uniqueMap.values());
                      // Group doctors by specialty — filter by branch for location managers
                      const doctorsToShow = isLocationManager && locationManagerBranchId
                        ? uniqueDoctors.filter((doctor) => {
                            const docBranch = (doctor as any).locationId || '001';
                            return docBranch === locationManagerBranchId;
                          })
                        : uniqueDoctors;
                      const specialtyCounts: Record<string, number> = {};
                      doctorsToShow.forEach((doctor) => {
                        const specialties = doctor.specialties || ['General Physician'];
                        specialties.forEach((spec) => {
                          specialtyCounts[spec] = (specialtyCounts[spec] || 0) + 1;
                        });
                      });

                      if (doctorsToShow.length === 0) {
                        return [<p key="empty" className="text-gray-400 text-sm">No doctors assigned to this branch yet</p>];
                      }

                      return Object.entries(specialtyCounts).map(([specialty, count]) => (
                        <div
                          key={specialty}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm transition-colors"
                        >
                          <span className="text-gray-300">{specialty}</span>
                          <span className="px-2 py-0.5 bg-blue-600 rounded-full text-xs font-semibold text-white">{count}</span>
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No doctors added yet</p>
                )}
              </div>

              {/* Practice Overview Chart - Matching Doctor Dashboard SS2 */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    <CardTitle className="text-white text-xl">Practice Overview (Current Plan Period)</CardTitle>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    Track your practice performance metrics and patient engagement analytics.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="bg-black rounded-xl p-6">
                    {/* Custom Bar Chart */}
                    <div className="space-y-6">
                      {[
                        { name: 'Total Scans', value: analyticsData.totalScans, fill: '#3b82f6' },
                        { name: 'Total Bookings', value: analyticsData.totalBookings, fill: '#10b981' },
                        { name: 'Clinic QR Bookings', value: analyticsData.clinicQRBookings, fill: '#8b5cf6' },
                        { name: 'Doctor QR Bookings', value: analyticsData.doctorQRBookings, fill: '#ec4899' },
                        { name: 'Walk-in Bookings', value: analyticsData.walkinBookings, fill: '#f59e0b' },
                        { name: 'Drop Outs (No Show)', value: analyticsData.dropOuts, fill: '#ef4444' },
                        { name: 'Cancelled', value: analyticsData.cancelled, fill: '#6b7280' },
                      ].map((item, index) => {
                        const maxValue = Math.max(
                          analyticsData.totalScans,
                          analyticsData.totalBookings,
                          analyticsData.clinicQRBookings,
                          analyticsData.doctorQRBookings,
                          analyticsData.walkinBookings,
                          analyticsData.dropOuts,
                          analyticsData.cancelled,
                          1
                        );
                        const percentage = (item.value / maxValue) * 100;

                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-white font-semibold text-sm">{item.name}</span>
                              <span className="text-white font-bold text-lg">{item.value}</span>
                            </div>
                            <div className="relative h-8 bg-zinc-900 rounded-lg overflow-hidden">
                              <div
                                className="absolute top-0 left-0 h-full rounded-lg transition-all duration-1000 ease-out"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: item.fill,
                                  boxShadow: `0 0 20px ${item.fill}80`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-zinc-800">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">{analyticsData.totalScans}</div>
                        <div className="text-xs text-gray-400 mt-1">Total Scans</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{analyticsData.totalBookings}</div>
                        <div className="text-xs text-gray-400 mt-1">Total Bookings</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">{analyticsData.cancelled}</div>
                        <div className="text-xs text-gray-400 mt-1">Cancelled</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>



              {/* Promotional Banners - Admin global + Pharma targeted */}
              <DashboardPromoDisplay doctorId={resolvedClinicId} />

              {/* Today's Schedule - Doctor Names Prominently Displayed */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-500" />
                      <CardTitle className="text-white">Today's Schedule</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-500 hover:text-blue-400"
                      onClick={() => handleMenuChange('todays-schedule')}
                    >
                      View All
                    </Button>
                  </div>
                  <p className="text-sm text-gray-400">
                    An overview of all scheduled chambers for today.
                  </p>
                </CardHeader>
                <CardContent>
                  {todaysChambers.length === 0 ? (
                    <div className="py-12 text-center">
                      <Calendar className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-400">No chambers scheduled for today</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {todaysChambers.slice(0, 3).map((chamber) => (
                        <div
                          key={chamber.id}
                          className={`bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-blue-500/50 transition-colors ${chamber.isExpired ? 'opacity-60' : ''}`}
                        >
                          {/* Doctor Name & Badge - PROMINENTLY DISPLAYED */}
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-white text-lg font-semibold">Dr. {chamber.doctorName}</h3>
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 capitalize shrink-0">
                              Today
                            </Badge>
                          </div>

                          {/* Chamber Name & Specialty */}
                          <div className="mb-3">
                            <p className="text-sm text-gray-400">{chamber.chamberName}</p>
                            <p className="text-xs text-blue-400">{chamber.specialty}</p>
                          </div>

                          {/* Chamber Address */}
                          <div className="flex items-start gap-2 mb-3">
                            <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <p className="text-sm text-gray-400">{chamber.address}</p>
                          </div>

                          {/* Schedule Time */}
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                            <p className="text-sm text-gray-300">
                              {chamber.startTime} to {chamber.endTime}
                            </p>
                            {chamber.isExpired && (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                Time Over
                              </Badge>
                            )}
                          </div>

                          {/* Booking Progress */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-400">Booked</span>
                                <span className="text-gray-300">{chamber.booked}/{chamber.capacity}</span>
                              </div>
                              <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all"
                                  style={{ width: `${Math.min((chamber.booked / (chamber.capacity || 1)) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {todaysChambers.length > 3 && (
                        <div className="text-center pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-500 border-blue-500/30 hover:bg-blue-500/10"
                            onClick={() => handleMenuChange('todays-schedule')}
                          >
                            View All {todaysChambers.length} Chambers
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pb-8 text-center">
            <p className="text-sm text-gray-500">Powered by HealQR.com</p>
          </div>
        </main>
      </div>

      {/* Unified AI + Support Chat */}
      <UnifiedChatWidget
        entityType="clinic"
        entityId={resolvedClinicId}
        entityName={displayClinicName}
        userRole="clinic"
        collectionName="clinics"
      />
    </div>
  );
}

