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
import ClinicProfileManager from './ClinicProfileManager';
import ClinicQRManager from './ClinicQRManager';
import ClinicScheduleManager from './ClinicScheduleManager';
import ClinicTodaysSchedule from './ClinicTodaysSchedule';
import ManageDoctors from './ManageDoctors';
import BrainDeckManager from './BrainDeckManager';
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

export default function ClinicDashboard() {
  const [clinicData, setClinicData] = useState<ClinicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [todaysChambers, setTodaysChambers] = useState<TodayChamber[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Real-time refresh trigger

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
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Fetch clinic data first as it's needed for other calculations
        const clinicRef = doc(db, 'clinics', auth.currentUser.uid);
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
  }, [refreshTrigger, auth.currentUser]);

  // 🔥 REAL-TIME LISTENER: Triggers refresh via state change
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
  }, [auth.currentUser]);

  const loadClinicAnalytics = async (data: ClinicData) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      // Get current month date range for client-side filtering
      const now = new Date();
      const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

      // 1. Fetch all doctor bookings in parallel
      const doctorBookingsPromises = (data.linkedDoctorsDetails || []).map(async (doctor) => {
        const docId = doctor?.doctorId || doctor?.uid;
        if (!docId) return null;

        try {
          const clinicBookingsQuery = query(
            collection(db, 'bookings'),
            where('doctorId', '==', docId),
            where('clinicId', '==', currentUser.uid)
          );
          return await getDocs(clinicBookingsQuery);
        } catch (err) {
          console.error(`Error fetching bookings for doctor ${docId}:`, err);
          return null;
        }
      });

      // 2. Fetch scan data in parallel
      const scansQueryPromise = (async () => {
        try {
          const scansQuery = query(
            collection(db, 'qrScans'),
            where('scannedBy', '==', 'clinic'),
            where('clinicId', '==', currentUser.uid)
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

      setAnalyticsData({
        totalScans,
        totalBookings,
        qrBookings,
        clinicQRBookings,
        doctorQRBookings,
        walkinBookings,
        dropOuts,
        cancelled,
        monthlyBookings: totalBookings
      });
    } catch (error) {
      console.error('Error processing clinic analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodaysSchedule = async (data: ClinicData) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const linkedDoctors = data.linkedDoctorsDetails;
      if (!linkedDoctors || !Array.isArray(linkedDoctors)) {
        setTodaysChambers([]);
        return;
      }

      const today = new Date();
      const todayDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];

      // 1. Fetch all doctors and their chambers in parallel
      const doctorDetailsPromises = linkedDoctors.map(async (doctor) => {
        const docId = doctor?.doctorId || doctor?.uid;
        if (!docId) return null;

        try {
          const doctorSnap = await getDoc(doc(db, 'doctors', docId));
          if (!doctorSnap.exists()) return null;

          const doctorData = doctorSnap.data();
          if (!doctorData || !doctorData.chambers) return null;

          // Filter chambers for this clinic and for TODAY
          const todayChambers = (doctorData.chambers as any[]).filter((chamber: any) => {
            if (!chamber || chamber.clinicId !== currentUser.uid) return false;
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
      doctorDetails.forEach((res) => {
        if (!res) return;
        const { doctorData, todayChambers } = res;

        todayChambers.forEach((chamber) => {
          chambers.push({
            id: chamber.id,
            doctorName: doctorData.name || 'Doctor',
            specialization: doctorData.specialties?.[0] || 'Medical Specialist',
            chamberName: chamber.chamberName,
            address: chamber.chamberAddress,
            startTime: chamber.startTime || '00:00',
            endTime: chamber.endTime || '00:00',
            booked: 0, // Inferred for now
            capacity: chamber.maxCapacity || 0,
            isExpired: false // Inferred
          });
        });
      });

      setTodaysChambers(chambers);
    } catch (error) {
      console.error('Error loading todays schedule:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout');
    }
  };

  const copyClinicCode = () => {
    if (clinicData?.clinicCode) {
      navigator.clipboard.writeText(clinicData.clinicCode);
      toast.success('Clinic code copied to clipboard!');
      setShareMenuOpen(false);
    }
  };

  // Render Profile Manager if menu is active
  if (activeMenu === 'profile') {
    return (
      <ClinicProfileManager
        onMenuChange={(menu) => setActiveMenu(menu)}
        onLogout={handleLogout}
      />
    );
  }

  // Render QR Manager if menu is active
  if (activeMenu === 'qr-manager') {
    return (
      <ClinicQRManager
        onMenuChange={(menu) => setActiveMenu(menu)}
        onLogout={handleLogout}
        profileData={{
          image: clinicData?.logoUrl || null,
          name: clinicData?.name || 'Clinic Name'
        }}
      />
    );
  }

  // Render Schedule Manager if menu is active
  if (activeMenu === 'schedule' || activeMenu === 'schedule-manager') {
    return <ClinicScheduleManager onMenuChange={(menu) => setActiveMenu(menu)} onLogout={handleLogout} />;
  }

  // Render Today's Schedule if menu is active
  if (activeMenu === 'todays-schedule') {
    return <ClinicTodaysSchedule onMenuChange={(menu) => setActiveMenu(menu)} onLogout={handleLogout} />;
  }

  // Render Manage Doctors if menu is active
  if (activeMenu === 'doctors') {
    return <ManageDoctors onNavigate={(view, doctorId) => {
      setActiveMenu(view);
      if (doctorId) {
        localStorage.setItem('selectedDoctorId', doctorId);
      }
    }} />;
  }

  // Render BrainDeck Manager if menu is active
  if (activeMenu === 'braindeck') {
    return <BrainDeckManager onBack={() => setActiveMenu('dashboard')} doctorName={clinicData?.name || 'Clinic'} />;
  }

  // Render Video Library if menu is active
  if (activeMenu === 'video-consult') {
    const videos = [
      { id: 1, title: 'How to Boost Your Energy', thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', duration: '5:30' },
      { id: 2, title: 'Digital Health Tips for Doctors', thumbnail: 'https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg', duration: '3:45' },
      { id: 3, title: 'Using HealQR for Your Practice', thumbnail: 'https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg', duration: '7:12' },
      { id: 4, title: 'Patient Engagement Strategies', thumbnail: 'https://img.youtube.com/vi/kJQP7kiw5Fk/maxresdefault.jpg', duration: '4:20' },
    ];

    return (
      <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
        <ClinicSidebar
          activeMenu={activeMenu}
          onMenuChange={(menu) => setActiveMenu(menu)}
          onLogout={handleLogout}
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
        <div className="flex-1 lg:ml-64 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Back to Dashboard */}
            <button
              onClick={() => setActiveMenu('dashboard')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              Back to Dashboard
            </button>

            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#0d9488' }}>
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Video Library</h1>
                <p className="text-sm text-gray-400">Learn how to make the most of HealQR</p>
              </div>
            </div>

            {/* Video Grid */}
            <div className="space-y-5">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="relative rounded-2xl overflow-hidden cursor-pointer group"
                >
                  <div className="aspect-video bg-zinc-800 relative">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '';
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {/* Duration badge */}
                    <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded">
                      {video.duration}
                    </div>
                    {/* Close/dismiss button */}
                    <button className="absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle unimplemented features
  const implementedMenus = [
    'dashboard', 'profile', 'qr-manager', 'schedule', 'schedule-manager',
    'todays-schedule', 'doctors', 'braindeck', 'video-consult'
  ];

  if (!implementedMenus.includes(activeMenu)) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
        <ClinicSidebar
          activeMenu={activeMenu}
          onMenuChange={(menu) => setActiveMenu(menu)}
          onLogout={handleLogout}
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
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
          setActiveMenu(menu);
          setMobileMenuOpen(false);
        }}
        onLogout={handleLogout}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
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
              onClick={() => setActiveMenu('video-consult')}
              className="relative w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
            >
              <Video className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button className="relative w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors">
              <Bell className="w-5 h-5" />
            </button>

            {/* Profile */}
            <button
              onClick={() => setActiveMenu('profile')}
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
                    Welcome Back, {clinicData?.name || 'Clinic'} !
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

                  {/* Badges block: Encrypted and BrainDeck - Same Row */}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <button className="flex items-center gap-2 text-white px-4 py-2 rounded-lg font-medium cursor-default" style={{ backgroundColor: '#2563eb' }}>
                      <LucideLock className="w-4 h-4" />
                      <span>Data is encrypted</span>
                    </button>

                    <button
                      onClick={() => setActiveMenu('braindeck')}
                      className="flex items-center gap-2 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-orange-500/20 transition-all cursor-pointer hover:opacity-90 active:scale-[0.98]"
                      style={{ backgroundColor: '#f97316' }}
                    >
                      <BrainCircuit className="w-5 h-5" />
                      <span className="font-bold tracking-wide italic">healQR BrainDeck</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-500" />
                      <span className="text-sm text-gray-400">{clinicData?.address || 'No address set'}</span>
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

              {/* Social Media Kit Card - Blue Banner */}
              <div
                className="rounded-2xl p-6 relative overflow-hidden shadow-xl"
                style={{ backgroundColor: '#2b63f1' }}
              >
                {/* Top: Free + Active badges */}
                <div className="flex gap-2 mb-3">
                  <Badge variant="outline" className="text-white border-white/40 bg-transparent text-[10px] px-2 py-0 h-5">Free</Badge>
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-none text-[10px] px-2 py-0 h-5">Active</Badge>
                </div>

                {/* Bookings Count */}
                <div className="mb-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">{analyticsData.monthlyBookings}</span>
                    <span className="text-2xl font-semibold text-white">Bookings</span>
                  </div>
                  <p className="text-[11px] text-blue-100/70 font-medium">
                    {new Date().toLocaleString('default', { month: 'short' })} 1, 2026 – {new Date().toLocaleString('default', { month: 'short' })} 31, 2026
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-white/10 my-4" />

                {/* Social Kit Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="hover:bg-white border-none text-[10px] font-bold px-2 py-0 h-5 shrink-0" style={{ backgroundColor: 'white', color: '#2b63f1' }}>
                      <Sparkles className="w-3 h-3 mr-1" style={{ fill: '#2b63f1' }} />
                      New
                    </Badge>
                    <h3 className="text-sm font-bold text-white whitespace-nowrap">Social Media Kit</h3>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-blue-100/80">Create branded posts for Instagram & WhatsApp.</p>
                    <button
                      onClick={() => setActiveMenu('social-kit')}
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
                      // Group doctors by specialty
                      const specialtyCounts: Record<string, number> = {};
                      clinicData.linkedDoctorsDetails.forEach((doctor) => {
                        const specialties = doctor.specialties || ['General Physician'];
                        specialties.forEach((spec) => {
                          specialtyCounts[spec] = (specialtyCounts[spec] || 0) + 1;
                        });
                      });

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
                      onClick={() => setActiveMenu('todays-schedule')}
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
                            onClick={() => setActiveMenu('todays-schedule')}
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
    </div>
  );
}
