import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Menu,
  Lock,
  BrainCircuit,
  Microscope,
  Settings,
  Star,
  BarChart3,
  Calendar,
  Clock,
  TestTube,
  Home,
  ChevronRight,
  CheckCircle2,
  Circle,
  X,
  Plus,
  Trash2,
  Upload,
  User,
  FlaskConical,
  Share2,
  Video,
  Bell,
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle,
  Mail,
  Copy,
} from 'lucide-react';
import { auth, db } from '../lib/firebase/config';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import DashboardPromoDisplay from './DashboardPromoDisplay';
import LabSidebar from './LabSidebar';
import LabProfileManager from './LabProfileManager';
import LabQRManager from './LabQRManager';
import LabTestCatalog from './LabTestCatalog';
import LabScheduleManager from './LabScheduleManager';
import LabBookingsManager from './LabBookingsManager';
import LabLocationManager from './LabLocationManager';
import LabDoctorManager from './LabDoctorManager';
import ParamedicalManager from './ParamedicalManager';
import LabAnalytics from './LabAnalytics';
import LabReportUpload from './LabReportUpload';
import LabReportSearch from './LabReportSearch';
import LabRevenueDashboard from './LabRevenueDashboard';
import LabBillingReceipts from './LabBillingReceipts';
import LabInventory from './LabInventory';
import LabPatientBroadcast from './LabPatientBroadcast';
import LabReferralNetwork from './LabReferralNetwork';
import LabPatientRetention from './LabPatientRetention';
import LabQueueDisplay from './LabQueueDisplay';
import LabStaffAttendance from './LabStaffAttendance';
import LabSocialKit from './LabSocialKit';
import LabAllocationQueue from './LabAllocationQueue';
import LabMonthlyPlanner from './LabMonthlyPlanner';
import LabDataManagement from './LabDataManagement';
import VideoLibrary from './VideoLibrary';
import { Send } from 'lucide-react';
interface LabData {
  uid: string;
  name: string;
  email: string;
  address: string;
  pinCode: string;
  state: string;
  qrNumber: string;
  labCode?: string;
  labSlug?: string;
  bookingUrl?: string;
  qrCode?: string;
  logoUrl?: string;
  phone?: string;
  type: string;
}

interface LabReview {
  id: string;
  patientName: string;
  rating: number;
  comment: string;
  date: string;
  source: 'incoming' | 'selfCreated';
  publishedToMiniSite?: boolean;
}

interface TodayBooking {
  id: string;
  patientName: string;
  patientPhone?: string;
  tests: string[];
  timeSlot?: string;
  bookingType: 'walkin' | 'home';
  status: string;
  sampleCollected: boolean;
  sampleCollectedAt?: string;
  bookingDate: string;
}

export default function LabDashboard({ onLogout }: { onLogout?: () => void | Promise<void> }) {
  const [labData, setLabData] = useState<LabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingCount, setBookingCount] = useState(0);

  // Reviews state
  const [reviews, setReviews] = useState<LabReview[]>([]);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewsActiveTab, setReviewsActiveTab] = useState<'incoming' | 'selfCreated' | 'published'>('incoming');
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [addingReview, setAddingReview] = useState(false);

  // Today's bookings state
  const [todayBookings, setTodayBookings] = useState<TodayBooking[]>([]);
  const [todayLoading, setTodayLoading] = useState(true);
  const todayScheduleRef = useRef<HTMLDivElement>(null);

  // Month stats for chart
  const [monthStats, setMonthStats] = useState({ qrScans: 0, total: 0, qrBookings: 0, walkinBookings: 0, homeCollection: 0, walkinCollection: 0, dropout: 0, cancelled: 0 });

  // Top-bar state (share popover, notifications)
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const resolvedLabId = auth?.currentUser?.uid || localStorage.getItem('userId') || '';

  useEffect(() => {
    const fetchLabData = async () => {
      if (!resolvedLabId) {
        setLoading(false);
        return;
      }

      try {
        const labRef = doc(db, 'labs', resolvedLabId);
        const labSnap = await getDoc(labRef);

        if (labSnap.exists()) {
          setLabData({ uid: labSnap.id, ...labSnap.data() } as LabData);
        }

        // Fetch this month's booking count (single-field query, filter client-side)
        const now = new Date();
        const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const bq = query(
          collection(db, 'labBookings'),
          where('labId', '==', resolvedLabId)
        );
        const bSnap = await getDocs(bq);
        const monthCount = bSnap.docs.filter(d => {
          const bd = d.data().bookingDate || '';
          return bd.startsWith(monthPrefix);
        }).length;
        setBookingCount(monthCount);
      } catch (error) {
        console.error('Error fetching lab data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLabData();
  }, [resolvedLabId]);

  // Fetch reviews
  useEffect(() => {
    if (!resolvedLabId) return;
    const reviewsRef = collection(db, 'labs', resolvedLabId, 'reviews');
    const unsubscribe = onSnapshot(query(reviewsRef, orderBy('date', 'desc')), (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as LabReview)));
    }, (err) => console.error('Reviews error:', err));
    return () => unsubscribe();
  }, [resolvedLabId]);

  // Fetch today's bookings (real-time)
  useEffect(() => {
    if (!resolvedLabId) { setTodayLoading(false); return; }
    const today = new Date().toISOString().split('T')[0];
    const bq = query(
      collection(db, 'labBookings'),
      where('labId', '==', resolvedLabId),
      where('bookingDate', '==', today)
    );
    const unsubscribe = onSnapshot(bq, (snap) => {
      const all = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          patientName: data.patientName || 'Unknown Patient',
          patientPhone: data.patientPhone || '',
          tests: Array.isArray(data.selectedTests) ? data.selectedTests.map((t: any) => t.name || t) : [],
          timeSlot: data.selectedSlot?.time || data.timeSlot || '',
          bookingType: (data.collectionType === 'home-collection' || data.bookingType === 'home' || data.bookingType === 'home-collection') ? 'home' : 'walkin',
          status: data.status || 'booked',
          sampleCollected: !!data.sampleCollected,
          sampleCollectedAt: data.sampleCollectedAt || '',
          bookingDate: data.bookingDate || today,
        } as TodayBooking;
      });
      // Sort: pending first, collected at bottom
      all.sort((a, b) => {
        if (a.sampleCollected === b.sampleCollected) return 0;
        return a.sampleCollected ? 1 : -1;
      });
      setTodayBookings(all);
      setTodayLoading(false);
    }, (err) => { console.error('Today bookings error:', err); setTodayLoading(false); });
    return () => unsubscribe();
  }, [resolvedLabId]);

  // Fetch month stats for chart
  useEffect(() => {
    if (!resolvedLabId) return;
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const todayStr = now.toISOString().split('T')[0];

    // Fetch bookings + QR scans in parallel
    Promise.all([
      getDocs(query(collection(db, 'labBookings'), where('labId', '==', resolvedLabId))),
      getDocs(query(collection(db, 'lab_qr_scans'), where('labId', '==', resolvedLabId))),
    ]).then(([bookingSnap, scanSnap]) => {
      // Filter bookings to this month
      const monthDocs = bookingSnap.docs.filter(d => (d.data().bookingDate || '').startsWith(monthPrefix));

      // Count QR scans this month
      const monthScans = scanSnap.docs.filter(d => {
        const scannedAt = d.data().scannedAt?.toDate?.();
        if (!scannedAt) return false;
        const scanStr = scannedAt.toISOString().substring(0, 7);
        return scanStr === monthPrefix;
      }).length;

      const stats = { qrScans: monthScans, total: monthDocs.length, qrBookings: 0, walkinBookings: 0, homeCollection: 0, walkinCollection: 0, dropout: 0, cancelled: 0 };
      monthDocs.forEach(d => {
        const data = d.data();
        // Booking source: 'lab_url' or 'lab_qr' = via QR scan/mini-website; anything else = direct walk-in
        const isQRBooking = (data.bookingSource === 'lab_url' || data.bookingSource === 'lab_qr');
        if (isQRBooking) stats.qrBookings++; else stats.walkinBookings++;
        // Collection type
        if (data.collectionType === 'home-collection') stats.homeCollection++;
        else stats.walkinCollection++;
        // Cancelled / rejected
        if (data.status === 'cancelled' || data.status === 'rejected') {
          stats.cancelled++;
        } else if (!data.sampleCollected && (data.bookingDate || '') < todayStr) {
          // Past booking, not collected, not cancelled = drop out
          stats.dropout++;
        }
      });
      setMonthStats(stats);
    }).catch(console.error);
  }, [resolvedLabId]);

  // Computed review stats
  const incomingReviews = reviews.filter(r => r.source === 'incoming');
  const selfCreatedReviews = reviews.filter(r => r.source === 'selfCreated');
  const publishedReviews = reviews.filter(r => r.publishedToMiniSite);
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const handleToggleSampleCollected = async (bookingId: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'labBookings', bookingId), {
        sampleCollected: !current,
        sampleCollectedAt: !current ? new Date().toISOString() : null,
      });
      if (!current) {
        // Auto-scroll the container to bottom so collected items (which go to bottom) are visible
        setTimeout(() => {
          todayScheduleRef.current?.scrollTo({ top: todayScheduleRef.current.scrollHeight, behavior: 'smooth' });
        }, 300);
      }
    } catch (err) {
      toast.error('Failed to update sample status');
    }
  };

  const handleAddSelfReview = async () => {
    if (!newReviewName.trim() || !newReviewComment.trim()) { toast.error('Fill in all fields'); return; }
    setAddingReview(true);
    try {
      await addDoc(collection(db, 'labs', resolvedLabId, 'reviews'), {
        patientName: newReviewName.trim(),
        rating: newReviewRating,
        comment: newReviewComment.trim(),
        date: new Date().toISOString().split('T')[0],
        source: 'selfCreated',
        publishedToMiniSite: false,
        createdAt: serverTimestamp(),
      });
      setNewReviewName('');
      setNewReviewComment('');
      setNewReviewRating(5);
      toast.success('Review added');
    } catch (err) { toast.error('Failed to add review'); } finally { setAddingReview(false); }
  };

  const handleTogglePublish = async (review: LabReview) => {
    if (!review.publishedToMiniSite && publishedReviews.length >= 2) {
      toast.error('Max 2 reviews can be published to Mini Website'); return;
    }
    try {
      await updateDoc(doc(db, 'labs', resolvedLabId, 'reviews', review.id), { publishedToMiniSite: !review.publishedToMiniSite });
      toast.success(review.publishedToMiniSite ? 'Unpublished' : 'Published to Mini Website!');
    } catch (err) { toast.error('Failed'); }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteDoc(doc(db, 'labs', resolvedLabId, 'reviews', reviewId));
      toast.success('Review deleted');
    } catch (err) { toast.error('Failed to delete'); }
  };

  const renderStars = (rating: number, size = 'w-4 h-4') =>
    [...Array(5)].map((_, i) => (
      <Star key={i} className={`${size} ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
    ));

  const refetchLabData = async () => {
    try {
      const labRef = doc(db, 'labs', resolvedLabId);
      const labSnap = await getDoc(labRef);
      if (labSnap.exists()) {
        setLabData({ uid: labSnap.id, ...labSnap.data() } as LabData);
      }
    } catch (error) {
      console.error('Error refetching lab data:', error);
    }
  };

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
      return;
    }
    try {
      localStorage.removeItem('healqr_authenticated');
      localStorage.removeItem('healqr_user_email');
      localStorage.removeItem('healqr_user_name');
      localStorage.removeItem('healqr_is_lab');
      localStorage.removeItem('healqr_lab_code');
      localStorage.removeItem('userId');
      localStorage.removeItem('healqr_qr_code');
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

  // Lab's public mini-site URL (share target)
  const labWebsiteUrl = labData?.bookingUrl
    || (labData?.labSlug ? `${window.location.origin}/${labData.labSlug}` : `${window.location.origin}/`);

  const handleShare = (platform: string) => {
    const shareText = `Book lab tests at ${labData?.name || 'our lab'} — quick, easy & secure via HealQR`;
    const encodedUrl = encodeURIComponent(labWebsiteUrl);
    const encodedText = encodeURIComponent(shareText);
    let url = '';
    switch (platform) {
      case 'facebook': url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`; break;
      case 'twitter': url = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`; break;
      case 'linkedin': url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`; break;
      case 'whatsapp': url = `https://wa.me/?text=${encodedText}%20${encodedUrl}`; break;
      case 'email': url = `mailto:?subject=${encodedText}&body=${labWebsiteUrl}`; break;
      case 'copy':
        navigator.clipboard.writeText(labWebsiteUrl);
        toast.success('Link copied to clipboard');
        setShareMenuOpen(false);
        return;
      case 'referral-link': {
        setShareMenuOpen(false);
        (async () => {
          try {
            const userId = resolvedLabId;
            const name = labData?.name || 'Lab';
            if (!userId) { toast.error('Please log in first'); return; }
            const existing = await getDocs(query(collection(db, 'referralLinks'), where('createdBy', '==', userId)));
            let code: string;
            if (!existing.empty) {
              code = existing.docs[0].data().code;
            } else {
              code = Math.random().toString(36).substring(2, 8).toUpperCase();
              await addDoc(collection(db, 'referralLinks'), {
                code,
                createdBy: userId,
                createdByName: name,
                createdByRole: 'lab',
                createdAt: serverTimestamp(),
              });
            }
            const link = `${window.location.origin}/?ref=${code}`;
            try {
              await navigator.clipboard.writeText(link);
              toast.success('Referral link copied!', { description: link, duration: 5000 });
            } catch {
              toast('Your referral link:', { description: link, duration: 8000 });
            }
          } catch (err) {
            console.error('Referral link error:', err);
            toast.error('Failed to generate link');
          }
        })();
        return;
      }
      default: return;
    }
    window.open(url, '_blank');
    setShareMenuOpen(false);
  };

  const handleVideoTutorialClick = () => {
    setActiveMenu('video-library');
  };

  // Notifications: subscribe to labs/{labId}/notifications (unread count for the bell badge)
  useEffect(() => {
    if (!resolvedLabId) return;
    try {
      const nRef = collection(db, 'labs', resolvedLabId, 'notifications');
      const unsub = onSnapshot(nRef, (snap) => {
        setUnreadNotificationCount(snap.docs.filter(d => !d.data()?.read).length);
      }, () => { /* silent — collection may not exist yet */ });
      return () => unsub();
    } catch { /* noop */ }
  }, [resolvedLabId]);

  // Page title map for header
  const pageTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    'location-manager': 'Location Manager',
    'manage-doctors': 'Manage Doctors',
    bookings: 'Bookings Manager',
    'queue-display': 'Queue Display',
    'phlebotomist-manager': 'Paramedical Manager',
    'allocation-queue': 'Allocation Queue',
    'test-catalog': 'Test Catalog',
    schedule: 'Schedule Manager',
    'report-upload': 'Report Upload',
    'report-search': 'Report Search',
    analytics: 'Analytics',
    revenue: 'Revenue Dashboard',
    billing: 'Billing & Receipts',
    inventory: 'Inventory',
    staff: 'Staff Attendance',
    'patient-broadcast': 'Patient Broadcast',
    'referral-network': 'Referral Network',
    'patient-retention': 'Patient Retention',
    'social-kit': 'Social Kit & Offers',
    profile: 'Profile Manager',
    'qr-manager': 'QR Manager',
    'monthly-planner': 'Monthly Planner',
    'data-management': 'Data Management',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Loading lab dashboard...</p>
        </div>
      </div>
    );
  }

  // Video Library takeover — returns to dashboard on back
  if (activeMenu === 'video-library') {
    return (
      <VideoLibrary
        onBack={() => setActiveMenu('dashboard')}
        source="dashboard"
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Sidebar Component */}
      <LabSidebar
        activeMenu={activeMenu}
        onMenuChange={(menu) => { setActiveMenu(menu); setMobileMenuOpen(false); }}
        onLogout={handleLogout}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div className="transition-all duration-300 lg:ml-64">
        {/* Header */}
        <header className="bg-zinc-950 border-b border-zinc-900 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
            >
              <Menu className="w-5 h-5 text-purple-500" />
            </button>
            <h2 className="text-lg md:text-xl font-medium">
              {pageTitles[activeMenu] || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {/* Share */}
            <Popover open={shareMenuOpen} onOpenChange={setShareMenuOpen}>
              <PopoverTrigger asChild>
                <button className="w-9 h-9 md:w-10 md:h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors">
                  <Share2 className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4 bg-zinc-900 border-zinc-800" align="end">
                <div className="space-y-3">
                  <div className="mb-1">
                    <h3 className="text-white mb-1">Share Your Lab</h3>
                    <p className="text-gray-400 text-xs truncate">{labWebsiteUrl}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleShare('facebook')} className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors"><Facebook className="w-4 h-4" /><span className="text-sm">Facebook</span></button>
                    <button onClick={() => handleShare('twitter')} className="flex items-center gap-2 px-3 py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 rounded-lg transition-colors"><Twitter className="w-4 h-4" /><span className="text-sm">Twitter</span></button>
                    <button onClick={() => handleShare('linkedin')} className="flex items-center gap-2 px-3 py-2 bg-blue-700/20 hover:bg-blue-700/30 text-blue-400 rounded-lg transition-colors"><Linkedin className="w-4 h-4" /><span className="text-sm">LinkedIn</span></button>
                    <button onClick={() => handleShare('whatsapp')} className="flex items-center gap-2 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors"><MessageCircle className="w-4 h-4" /><span className="text-sm">WhatsApp</span></button>
                    <button onClick={() => handleShare('email')} className="flex items-center gap-2 px-3 py-2 bg-gray-700/20 hover:bg-gray-700/30 text-gray-400 rounded-lg transition-colors"><Mail className="w-4 h-4" /><span className="text-sm">Email</span></button>
                    <button onClick={() => handleShare('copy')} className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors"><Copy className="w-4 h-4" /><span className="text-sm">Copy Link</span></button>
                  </div>
                  <div className="pt-3 border-t border-zinc-800">
                    <button
                      onClick={() => handleShare('referral-link')}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all mb-3"
                      style={{ background: 'linear-gradient(135deg, #92400e 0%, #c2410c 50%, #be123c 100%)', border: '1px solid #f59e0b55' }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.3)' }}>
                        <Send className="w-4 h-4 text-amber-200" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-bold text-amber-100">Generate Referral Link</span>
                        <p className="text-[10px] text-amber-300/80">Share with pharmacists, receptionists & agents</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 bg-zinc-950 rounded px-3 py-2">
                      <span className="text-gray-400 text-sm flex-1 truncate">{labWebsiteUrl}</span>
                      <button onClick={() => handleShare('copy')} className="text-purple-400 hover:text-purple-300"><Copy className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Video Tutorials */}
            <button
              onClick={handleVideoTutorialClick}
              className="w-9 h-9 md:w-10 md:h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
              title="Video Tutorials"
            >
              <Video className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            </button>

            {/* Notifications */}
            <button
              onClick={() => {
                if (unreadNotificationCount === 0) {
                  toast.info('No new notifications');
                } else {
                  toast.info(`${unreadNotificationCount} unread notification${unreadNotificationCount > 1 ? 's' : ''}`);
                }
              }}
              className="w-9 h-9 md:w-10 md:h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full text-[10px] text-white flex items-center justify-center border-2 border-zinc-950">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Profile */}
            <button
              onClick={() => setActiveMenu('profile')}
              className="w-9 h-9 md:w-10 md:h-10 bg-purple-500 rounded-full flex items-center justify-center overflow-hidden"
              title="Profile"
            >
              {labData?.logoUrl ? (
                <img src={labData.logoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-sm">{(labData?.name || 'L')[0].toUpperCase()}</span>
              )}
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="px-4 md:px-8 py-8 space-y-8">

            {/* Location Manager */}
            {activeMenu === 'location-manager' && (
              <LabLocationManager />
            )}

            {/* Manage Doctors */}
            {activeMenu === 'manage-doctors' && (
              <LabDoctorManager labId={resolvedLabId} />
            )}

            {/* Profile Manager */}
            {activeMenu === 'profile' && (
              <LabProfileManager labData={labData} onProfileUpdate={refetchLabData} />
            )}

            {/* QR Manager */}
            {activeMenu === 'qr-manager' && (
              <LabQRManager labData={labData} />
            )}

            {/* Test Catalog */}
            {activeMenu === 'test-catalog' && (
              <LabTestCatalog labId={resolvedLabId} />
            )}

            {/* Collection Schedule */}
            {activeMenu === 'schedule' && (
              <LabScheduleManager labId={resolvedLabId} labData={labData} />
            )}

            {/* Bookings Manager */}
            {activeMenu === 'bookings' && (
              <LabBookingsManager labId={resolvedLabId} />
            )}

            {/* Analytics */}
            {activeMenu === 'analytics' && resolvedLabId && (
              <LabAnalytics labId={resolvedLabId} />
            )}

            {/* Report Upload */}
            {activeMenu === 'report-upload' && resolvedLabId && (
              <LabReportUpload labId={resolvedLabId} labName={labData?.name} />
            )}

            {/* Report Search */}
            {activeMenu === 'report-search' && resolvedLabId && (
              <LabReportSearch labId={resolvedLabId} labName={labData?.name} />
            )}

            {/* Revenue Dashboard */}
            {activeMenu === 'revenue' && resolvedLabId && (
              <LabRevenueDashboard labId={resolvedLabId} labName={labData?.name} />
            )}

            {/* Billing & Receipts */}
            {activeMenu === 'billing' && resolvedLabId && (
              <LabBillingReceipts labId={resolvedLabId} labName={labData?.name} />
            )}

            {/* Inventory */}
            {activeMenu === 'inventory' && resolvedLabId && (
              <LabInventory labId={resolvedLabId} labName={labData?.name} />
            )}

            {/* Patient Broadcast */}
            {activeMenu === 'patient-broadcast' && resolvedLabId && (
              <LabPatientBroadcast labId={resolvedLabId} labName={labData?.name} />
            )}

            {/* Referral Network */}
            {activeMenu === 'referral-network' && resolvedLabId && (
              <LabReferralNetwork labId={resolvedLabId} labName={labData?.name} />
            )}

            {/* Patient Retention */}
            {activeMenu === 'patient-retention' && resolvedLabId && (
              <LabPatientRetention labId={resolvedLabId} labName={labData?.name} />
            )}

            {/* Queue Display */}
            {activeMenu === 'queue-display' && resolvedLabId && (
              <LabQueueDisplay labId={resolvedLabId} labName={labData?.name} />
            )}

            {/* Staff Attendance */}
            {activeMenu === 'staff' && resolvedLabId && (
              <LabStaffAttendance labId={resolvedLabId} labName={labData?.name} />
            )}

            {/* Social Kit & Offers */}
            {activeMenu === 'social-kit' && resolvedLabId && (
              <LabSocialKit labId={resolvedLabId} labName={labData?.name} />
            )}

            {/* Allocation Queue */}
            {activeMenu === 'allocation-queue' && resolvedLabId && (
              <LabAllocationQueue labId={resolvedLabId} labName={labData?.name} />
            )}

            {/* Monthly Planner */}
            {activeMenu === 'monthly-planner' && resolvedLabId && (
              <LabMonthlyPlanner labId={resolvedLabId} labName={labData?.name} />
            )}

            {/* Data Management */}
            {activeMenu === 'data-management' && resolvedLabId && (
              <LabDataManagement labId={resolvedLabId} labName={labData?.name} />
            )}

            {/* Dashboard Home */}
            {activeMenu === 'dashboard' && (<>
            {/* ðŸ‡®ðŸ‡³ Indian Tricolor Header: Saffron â†’ White â†’ Green */}
            <div className="space-y-3">
              {/* Saffron: Name */}
              <div className="w-full">
                <div className="w-full flex items-center justify-center rounded-xl bg-orange-500 text-white font-bold py-3 text-base shadow shadow-orange-200">
                  <h1 className="text-lg md:text-xl">
                    Welcome, {labData?.name || 'Lab'}!
                  </h1>
                </div>
              </div>

              {/* White: BrainDeck */}
              <div className="w-full">
                <button
                  className="w-full flex items-center justify-center rounded-xl bg-white text-blue-600 font-bold py-3 text-base border border-blue-200 shadow"
                  style={{ letterSpacing: '0.02em' }}
                >
                  <BrainCircuit className="w-5 h-5 mr-2" />
                  healQR BrainDeck
                </button>
              </div>

              {/* Green: Encrypted Badge */}
              <div className="w-full">
                <div className="w-full flex items-center justify-center rounded-xl bg-green-600 text-white font-bold py-3 text-base shadow shadow-green-200">
                  <Lock className="w-5 h-5 mr-2" />
                  Data is encrypted
                </div>
              </div>
            </div>

            {/* Purple Stats Card */}
            <div
              className="rounded-2xl p-6 relative overflow-hidden shadow-xl mt-6"
              style={{ background: 'linear-gradient(to bottom right, rgb(147, 51, 234), rgb(126, 34, 206))' }}
            >
              <div className="flex gap-2 mb-3">
                <Badge variant="outline" className="text-white border-white/40 bg-transparent text-[10px] px-2 py-0 h-5">Free</Badge>
                <Badge className="bg-purple-800 text-white border-none text-[10px] px-2 py-0 h-5">Active</Badge>
              </div>
              <div className="mb-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">{monthStats.total}</span>
                  <span className="text-2xl font-semibold text-white">Test Bookings</span>
                </div>
                <p className="text-[11px] text-purple-100 opacity-80 font-medium">
                  {new Date().toLocaleString('default', { month: 'short' })} 1, {new Date().getFullYear()} â€“ {new Date().toLocaleString('default', { month: 'short' })} {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}, {new Date().getFullYear()}
                </p>
              </div>
            </div>

            {/* â­ Review Collection Widget */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {renderStars(averageRating, 'w-5 h-5')}
                  </div>
                  <span className="text-white font-semibold text-base">{averageRating.toFixed(1)}/5</span>
                  <button
                    onClick={() => setReviewsOpen(true)}
                    className="text-purple-400 text-sm hover:text-purple-300 hover:underline transition-colors"
                  >
                    {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                  </button>
                </div>
                <Button
                  size="sm"
                  onClick={() => setReviewsOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3"
                >
                  Manage Reviews
                </Button>
              </div>
              {reviews.length === 0 && (
                <p className="text-xs text-gray-500">No reviews yet. Collect feedback from your patients.</p>
              )}
              {reviews.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {reviews.slice(0, 3).map(r => (
                    <div key={r.id} className="bg-zinc-800 rounded-lg px-3 py-2 max-w-xs">
                      <div className="flex items-center gap-1 mb-1">
                        {renderStars(r.rating, 'w-3 h-3')}
                        <span className="text-xs text-gray-400 ml-1">{r.patientName}</span>
                      </div>
                      <p className="text-xs text-gray-300 line-clamp-1">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ðŸ“Š Practice Overview Chart */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  <CardTitle className="text-white text-xl">Lab Overview (This Month)</CardTitle>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Track your lab performance metrics and booking analytics.
                </p>
              </CardHeader>
              <CardContent>
                <div className="bg-black rounded-xl p-6">
                  <div className="space-y-6">
                    {[
                      { name: 'Total QR Scans', value: monthStats.qrScans, fill: '#a78bfa' },
                      { name: 'Total Bookings', value: monthStats.total, fill: '#8b5cf6' },
                      { name: 'QR Bookings', value: monthStats.qrBookings, fill: '#3b82f6' },
                      { name: 'Walk-in Bookings (Direct)', value: monthStats.walkinBookings, fill: '#06b6d4' },
                      { name: 'Home Collection', value: monthStats.homeCollection, fill: '#10b981' },
                      { name: 'Walk-in Collection', value: monthStats.walkinCollection, fill: '#22d3ee' },
                      { name: 'Drop Out (No Show)', value: monthStats.dropout, fill: '#f59e0b' },
                      { name: 'Cancelled / Rejected', value: monthStats.cancelled, fill: '#ef4444' },
                    ].map((item, index) => {
                      const maxValue = Math.max(monthStats.qrScans, monthStats.total, 1);
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
                              style={{ width: `${percentage}%`, backgroundColor: item.fill, boxShadow: `0 0 20px ${item.fill}80` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-4 gap-4 mt-8 pt-6 border-t border-zinc-800">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-violet-400">{monthStats.qrScans}</div>
                      <div className="text-xs text-gray-400 mt-1">QR Scans</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{monthStats.total}</div>
                      <div className="text-xs text-gray-400 mt-1">Total Bookings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">{monthStats.dropout}</div>
                      <div className="text-xs text-gray-400 mt-1">Drop Outs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">{monthStats.cancelled}</div>
                      <div className="text-xs text-gray-400 mt-1">Cancelled</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ðŸ“£ Pharma Promo Card */}
            <DashboardPromoDisplay doctorId={resolvedLabId} />

            {/* ðŸ“… Today's Schedule */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-500" />
                    <CardTitle className="text-white">Today's Schedule</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    onClick={() => setActiveMenu('bookings')}
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-400">
                  Today's lab bookings. Check sample collected to move to bottom.
                </p>
              </CardHeader>
              <CardContent>
                {todayLoading ? (
                  <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>
                ) : todayBookings.length === 0 ? (
                  <div className="py-12 text-center">
                    <FlaskConical className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-400">No bookings for today</p>
                  </div>
                ) : (
                  <div ref={todayScheduleRef} className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                    {todayBookings.slice(0, 5).map((booking) => (
                      <div
                        key={booking.id}
                        className={`bg-zinc-800 border rounded-lg p-4 transition-all ${
                          booking.sampleCollected
                            ? 'border-green-700/50 opacity-70'
                            : 'border-zinc-700 hover:border-purple-500/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="text-white font-medium text-sm">{booking.patientName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`text-[10px] px-2 py-0 h-5 ${
                                booking.bookingType === 'home'
                                  ? 'bg-emerald-900 text-emerald-300 border-emerald-700'
                                  : 'bg-blue-900 text-blue-300 border-blue-700'
                              }`}
                            >
                              {booking.bookingType === 'home' ? 'ðŸ  Home' : 'ðŸš¶ Walk-in'}
                            </Badge>
                            <Badge
                              className={`text-[10px] px-2 py-0 h-5 ${
                                booking.sampleCollected
                                  ? 'bg-green-900 text-green-300 border-green-700'
                                  : 'bg-yellow-900 text-yellow-300 border-yellow-700'
                              }`}
                            >
                              {booking.sampleCollected ? 'Collected' : 'Pending'}
                            </Badge>
                          </div>
                        </div>

                        {booking.tests.length > 0 && (
                          <div className="flex items-start gap-2 mb-2">
                            <TestTube className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-gray-300">{booking.tests.slice(0, 3).join(', ')}{booking.tests.length > 3 ? ` +${booking.tests.length - 3} more` : ''}</p>
                          </div>
                        )}

                        {booking.timeSlot && (
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <p className="text-xs text-gray-400">{booking.timeSlot}</p>
                          </div>
                        )}

                        {/* Sample Collected Toggle */}
                        <div className="flex items-center gap-2 pt-2 border-t border-zinc-700">
                          <button
                            onClick={() => handleToggleSampleCollected(booking.id, booking.sampleCollected)}
                            className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
                          >
                            {booking.sampleCollected
                              ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                              : <Circle className="w-5 h-5 text-gray-500" />
                            }
                            <span className={booking.sampleCollected ? 'text-green-400 text-xs' : 'text-gray-400 text-xs'}>
                              {booking.sampleCollected ? 'Sample Collected' : 'Mark as Collected'}
                            </span>
                          </button>
                          {booking.sampleCollectedAt && (
                            <span className="text-[10px] text-gray-500 ml-auto">
                              {new Date(booking.sampleCollectedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {todayBookings.length > 5 && (
                      <button
                        onClick={() => setActiveMenu('bookings')}
                        className="w-full text-center text-purple-400 text-sm py-2 hover:text-purple-300 transition-colors"
                      >
                        +{todayBookings.length - 5} more bookings â†’ View All
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            </>)}

            {/* Reviews Side Panel */}
            {reviewsOpen && (
              <div className="fixed inset-0 z-50 flex">
                <div className="absolute inset-0 bg-black/60" onClick={() => setReviewsOpen(false)} />
                <div className="relative ml-auto w-full max-w-md bg-zinc-950 border-l border-zinc-800 flex flex-col h-full overflow-y-auto">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
                    <div>
                      <h2 className="text-white font-semibold text-lg">Lab Reviews</h2>
                      <p className="text-xs text-gray-400">{reviews.length} total Â· {publishedReviews.length}/2 published</p>
                    </div>
                    <button onClick={() => setReviewsOpen(false)} className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-zinc-800 px-5">
                    {(['incoming', 'selfCreated', 'published'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setReviewsActiveTab(tab)}
                        className={`py-3 px-3 text-sm font-medium border-b-2 transition-colors ${
                          reviewsActiveTab === tab
                            ? 'border-purple-500 text-purple-400'
                            : 'border-transparent text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        {tab === 'incoming' ? `Incoming (${incomingReviews.length})`
                          : tab === 'selfCreated' ? `Self-Created (${selfCreatedReviews.length})`
                          : `Published (${publishedReviews.length}/2)`}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 p-5 space-y-4">
                    {reviewsActiveTab === 'selfCreated' && (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                        <h3 className="text-white text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-purple-400" /> Add Review</h3>
                        <input
                          value={newReviewName}
                          onChange={e => setNewReviewName(e.target.value)}
                          placeholder="Patient name"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 outline-none focus:border-purple-500"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-xs">Rating:</span>
                          {[1,2,3,4,5].map(n => (
                            <button key={n} onClick={() => setNewReviewRating(n)}>
                              <Star className={`w-5 h-5 ${n <= newReviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={newReviewComment}
                          onChange={e => setNewReviewComment(e.target.value)}
                          placeholder="Review comment..."
                          rows={3}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 outline-none focus:border-purple-500 resize-none"
                        />
                        <Button onClick={handleAddSelfReview} disabled={addingReview} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm">
                          {addingReview ? 'Adding...' : 'Add Review'}
                        </Button>
                      </div>
                    )}

                    {(reviewsActiveTab === 'incoming' ? incomingReviews
                      : reviewsActiveTab === 'selfCreated' ? selfCreatedReviews
                      : publishedReviews
                    ).map(review => (
                      <div key={review.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-white text-sm font-medium">{review.patientName}</p>
                            <div className="flex items-center gap-1 mt-0.5">{renderStars(review.rating, 'w-3.5 h-3.5')}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTogglePublish(review)}
                              title={review.publishedToMiniSite ? 'Unpublish' : 'Publish to Mini Website'}
                              className={`p-1.5 rounded-lg transition-colors ${review.publishedToMiniSite ? 'bg-green-900 text-green-400' : 'bg-zinc-800 text-gray-400 hover:text-green-400'}`}
                            >
                              <Upload className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteReview(review.id)}
                              className="p-1.5 bg-zinc-800 hover:bg-red-900 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{review.comment}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-gray-500">{review.date}</span>
                          {review.publishedToMiniSite && (
                            <span className="text-[10px] bg-green-900 text-green-400 px-2 py-0.5 rounded-full">Live on Mini Website</span>
                          )}
                        </div>
                      </div>
                    ))}

                    {(reviewsActiveTab === 'incoming' ? incomingReviews
                      : reviewsActiveTab === 'selfCreated' ? selfCreatedReviews
                      : publishedReviews
                    ).length === 0 && reviewsActiveTab !== 'selfCreated' && (
                      <div className="text-center py-10 text-gray-500 text-sm">No reviews here yet</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Other menu items â€” Coming Soon */}
            {activeMenu !== 'dashboard' && activeMenu !== 'profile' && activeMenu !== 'qr-manager' && activeMenu !== 'test-catalog' && activeMenu !== 'schedule' && activeMenu !== 'bookings' && activeMenu !== 'location-manager' && activeMenu !== 'manage-doctors' && activeMenu !== 'phlebotomist-manager' && activeMenu !== 'analytics' && activeMenu !== 'report-upload' && activeMenu !== 'report-search' && activeMenu !== 'revenue' && activeMenu !== 'billing' && activeMenu !== 'inventory' && activeMenu !== 'patient-broadcast' && activeMenu !== 'referral-network' && activeMenu !== 'patient-retention' && activeMenu !== 'queue-display' && activeMenu !== 'staff' && activeMenu !== 'social-kit' && activeMenu !== 'allocation-queue' && activeMenu !== 'monthly-planner' && activeMenu !== 'data-management' && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Settings className="w-12 h-12 text-purple-500/30 mb-4" />
                  <h3 className="text-white text-lg font-semibold mb-2">
                    {pageTitles[activeMenu] || 'Feature'}
                  </h3>
                  <p className="text-gray-500 text-sm">Coming soon...</p>
                </CardContent>
              </Card>
            )}

            {activeMenu === 'phlebotomist-manager' && resolvedLabId && (
              <ParamedicalManager
                ownerType="lab"
                ownerId={resolvedLabId}
                ownerName={labData?.name || 'Lab'}
                accent="teal"
              />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
