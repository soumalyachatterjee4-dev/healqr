import { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db, storage } from '../lib/firebase/config';
import { signOut } from 'firebase/auth';
import {
  doc, getDoc, updateDoc, collection, query, where, getDocs, onSnapshot,
  addDoc, serverTimestamp, orderBy, limit, Timestamp, deleteDoc
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';
import QRCodeLib from 'qrcode';
import healqrLogo from '../assets/healqr.logo.png';
import {
  Menu, X, User, QrCode, Calendar, CalendarDays, CalendarPlus, FileText,
  BarChart3, Share2, IndianRupee, Users, Settings, LogOut, ChevronDown,
  ChevronUp, Clock, MapPin, Phone, Mail, Edit3, Save, Loader2, Check,
  Plus, Trash2, Copy, Download, Star, Building2, Stethoscope, ArrowLeft,
  History, Activity, Megaphone, Lock, Shield, BrainCircuit, Upload,
  Bell, Video, Facebook, Twitter, Linkedin, MessageCircle, Send, CheckCircle2, Circle, FlaskConical, ChevronRight, LayoutDashboard, Network,
  Package, Database, Receipt, Target, Sparkles, Camera
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import type { ParamedicalRole } from './ParamedicalSignUp';
import DashboardPromoDisplay from './DashboardPromoDisplay';
import VideoLibrary from './VideoLibrary';
import ParamedicalPatientRetention from './ParamedicalPatientRetention';
import ParamedicalBilling from './ParamedicalBilling';
import ParamedicalInventory from './ParamedicalInventory';
import ParamedicalBroadcast from './ParamedicalBroadcast';
import ParamedicalAllocationQueue from './ParamedicalAllocationQueue';
import ParamedicalMonthlyPlanner from './ParamedicalMonthlyPlanner';
import ParamedicalDataManagement from './ParamedicalDataManagement';
import ParamedicalEmergencyButton from './ParamedicalEmergencyButton';
import ParamedicalPersonalizedTemplates from './ParamedicalPersonalizedTemplates';

// ===== ROLE CONFIG =====
const ROLE_LABELS: Record<string, string> = {
  'phlebotomist': 'Phlebotomist',
  'physiotherapist': 'Physiotherapist',
  'nurse': 'Nurse',
  'wound-dresser': 'Wound Dresser',
  'aaya': 'Aaya / Caretaker',
  'home-assistant': 'Home Health Assistant',
  'nutritionist': 'Nutritionist',
  'radiologist': 'Radiologist',
  'dentist': 'Dentist',
  'pharmacist': 'Pharmacist',
  'other': 'Professional'
};

const renderStars = (rating: number, sizeClass = "w-4 h-4") => {
  return [...Array(5)].map((_, i) => (
    <Star
      key={i}
      className={`${sizeClass} ${i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'}`}
    />
  ));
};

const SERVICE_LABELS: Record<string, string> = {
  'phlebotomist': 'Sample Collection',
  'physiotherapist': 'Therapy Session',
  'nurse': 'Nursing Visit',
  'wound-dresser': 'Wound Dressing',
  'aaya': 'Patient Care',
  'home-assistant': 'Home Care Visit',
};

// ===== INTERFACES =====
interface ParamedicalProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: ParamedicalRole;
  pincode?: string;
  state?: string;
  experience?: string;
  qrNumber?: string;
  profileSlug?: string;
  ivrCode?: string;
  bookingUrl?: string;
  bio?: string;
  serviceAreas?: string[];
  certifications?: string[];
  services?: ServiceItem[];
  profilePhoto?: string;
  linkedLabs?: string[];
  linkedDoctors?: string[];
  linkedClinics?: string[];
  schedules?: ScheduleSlot[];
  verified?: boolean;
  createdAt?: any;
}

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  duration: string;
  description?: string;
}

interface ScheduleSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  maxBookings: number;
}

interface ParaReview {
  id: string;
  patientName: string;
  rating: number;
  comment: string;
  date: string;
  source: 'incoming' | 'selfCreated';
  publishedToMiniSite?: boolean;
}

interface Booking {
  id: string;
  patientName: string;
  patientPhone: string;
  patientAge?: string;
  patientGender?: string;
  serviceType: string;
  appointmentDate: string;
  timeSlot: string;
  status: string;
  address?: string;
  notes?: string;
  amount?: number;
  paymentStatus?: string;
  createdAt?: any;
  referredBy?: { name: string; type: string; id: string };
  allottedBy?: { name: string; type: string; id: string; branchId?: string; branchName?: string };
  source?: string;
}

interface ReferralEntry {
  id: string;
  name: string;
  type: 'doctor' | 'clinic' | 'lab';
  email?: string;
  phone?: string;
  referralCount: number;
  lastReferralDate?: string;
}

// ===== SIDEBAR MENU =====
const SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'main' },

  // Management
  { id: 'profile', label: 'Profile', icon: User, section: 'management' },
  { id: 'qr-manager', label: 'QR Manager', icon: QrCode, section: 'management' },
  { id: 'reviews', label: 'Manage Reviews', icon: Star, section: 'management' },
  { id: 'schedule', label: 'Schedule Maker', icon: Calendar, section: 'management' },

  // Practice tools
  { id: 'todays-schedule', label: "Today's Schedule", icon: CalendarDays, section: 'practice' },
  { id: 'advance-booking', label: 'Advance Bookings', icon: CalendarPlus, section: 'practice' },
  { id: 'history', label: 'History', icon: History, section: 'practice' },
  { id: 'reports', label: 'Reports', icon: FileText, section: 'practice' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, section: 'practice' },
  { id: 'patient-retention', label: 'Patient Retention', icon: Target, section: 'practice' },
  { id: 'revenue', label: 'Revenue Dashboard', icon: IndianRupee, section: 'practice' },
  { id: 'billing', label: 'Billing & Receipts', icon: Receipt, section: 'practice' },
  { id: 'inventory', label: 'Inventory', icon: Package, section: 'practice' },
  { id: 'patient-broadcast', label: 'Patient Broadcast', icon: Megaphone, section: 'practice' },
  { id: 'allocation-queue', label: 'Lab Allocation Queue', icon: FlaskConical, section: 'practice' },

  // General
  { id: 'monthly-planner', label: 'Monthly Planner', icon: Calendar, section: 'general' },
  { id: 'data-management', label: 'Data Management', icon: Database, section: 'general' },

  // Network & growth
  { id: 'referral-manager', label: 'Referral Manager', icon: Network, section: 'network' },
  { id: 'social-kit', label: 'Social Kit', icon: Share2, section: 'network' },
  { id: 'personalized-templates', label: 'Personalized Templates', icon: Sparkles, section: 'network' },

  // Safety
  { id: 'emergency-sos', label: 'Emergency / SOS', icon: Shield, section: 'safety' },
];

const SECTION_LABELS: Record<string, string> = {
  management: 'MANAGEMENT TOOLS',
  practice: 'PRACTICE ENHANCER TOOLS',
  general: 'GENERAL TOOLS',
  network: 'NETWORK & GROWTH',
  safety: 'SAFETY',
};

const SECTION_COLORS: Record<string, string> = {
  management: 'blue',
  practice: 'purple',
  general: 'emerald',
  network: 'emerald',
  safety: 'red',
};

export default function ParamedicalDashboard({ onLogout }: { onLogout: () => void }) {
  const [profile, setProfile] = useState<ParamedicalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);

  const renderStars = (rating: number, size: string = "w-4 h-4") => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`${size} ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-600'}`}
      />
    ));
  };
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsActiveTab, setReviewsActiveTab] = useState<'incoming' | 'selfCreated' | 'published'>('incoming');
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [addingReview, setAddingReview] = useState(false);

  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [monthStats, setMonthStats] = useState({
    total: 0,
    completed: 0,
    cancelled: 0,
    upcoming: 0,
    revenue: 0
  });

  const paraId = auth?.currentUser?.uid || localStorage.getItem('userId') || localStorage.getItem('healqr_phlebo_id') || '';

  // Load profile
  useEffect(() => {
    const load = async () => {
      if (!paraId) { setLoading(false); return; }
      try {
        const snap = await getDoc(doc(db, 'paramedicals', paraId));
        if (snap.exists()) {
          setProfile({ uid: snap.id, ...snap.data() } as ParamedicalProfile);
        } else {
          // Fallback: check old phlebotomists collection
          const oldSnap = await getDoc(doc(db, 'phlebotomists', paraId));
          if (oldSnap.exists()) {
            setProfile({ uid: oldSnap.id, ...oldSnap.data() } as ParamedicalProfile);
          }
        }
      } catch (err) { console.error('Profile load error:', err); }
      finally { setLoading(false); }
    };
    load();
  }, [paraId]);

  // Fetch reviews
  useEffect(() => {
    if (!paraId) return;
    const reviewsRef = collection(db, 'paramedicals', paraId, 'reviews');
    const unsubscribe = onSnapshot(query(reviewsRef, orderBy('date', 'desc')), (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error('Reviews error:', err));
    return () => unsubscribe();
  }, [paraId]);

  // Fetch bookings
  useEffect(() => {
    if (!paraId) return;
    const q = query(collection(db, 'paramedicalBookings'), where('paramedicalId', '==', paraId), orderBy('appointmentDate', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));
    }, (err) => {
      console.error('Bookings listener error:', err);
      // Fallback: try without orderBy (index may not exist yet)
      const q2 = query(collection(db, 'paramedicalBookings'), where('paramedicalId', '==', paraId));
      onSnapshot(q2, (snap2) => {
        const sorted = snap2.docs
          .map(d => ({ id: d.id, ...d.data() } as Booking))
          .sort((a, b) => (b.appointmentDate || '').localeCompare(a.appointmentDate || ''));
        setBookings(sorted);
      });
    });
    return unsub;
  }, [paraId]);

  // Month stats calculation
  useEffect(() => {
    if (!bookings.length) return;
    const now = new Date();
    const monthPrefix = now.toISOString().slice(0, 7);
    const monthBookings = bookings.filter(b => b.appointmentDate?.startsWith(monthPrefix));

    setMonthStats({
      total: monthBookings.length,
      completed: monthBookings.filter(b => b.status === 'completed').length,
      cancelled: monthBookings.filter(b => b.status === 'cancelled' || b.status === 'rejected').length,
      upcoming: monthBookings.filter(b => b.status === 'confirmed').length,
      revenue: monthBookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.amount || 0), 0)
    });
  }, [bookings]);

  // Unread notifications listener
  useEffect(() => {
    if (!paraId) return;
    try {
      const nRef = collection(db, 'paramedicals', paraId, 'notifications');
      const unsub = onSnapshot(nRef, (snap) => {
        setUnreadNotificationCount(snap.docs.filter(d => !d.data()?.read).length);
      }, () => {});
      return () => unsub();
    } catch { }
  }, [paraId]);

  // Computed review stats
  const incomingReviews = reviews.filter(r => r.source === 'incoming');
  const selfCreatedReviews = reviews.filter(r => r.source === 'selfCreated');
  const publishedReviews = reviews.filter(r => r.publishedToMiniSite);
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('healqr_paramedical_id');
      localStorage.removeItem('healqr_is_phlebo');
      localStorage.removeItem('healqr_phlebo_id');
      localStorage.removeItem('userId');
      localStorage.removeItem('healqr_user_email');
      localStorage.removeItem('healqr_authenticated');
      localStorage.removeItem('healqr_user_name');
      onLogout();
    } catch (err) { console.error('Logout error:', err); }
  };

  const handleAddSelfReview = async () => {
    if (!newReviewName.trim() || !newReviewComment.trim()) { toast.error('Fill in all fields'); return; }
    setAddingReview(true);
    try {
      await addDoc(collection(db, 'paramedicals', paraId, 'reviews'), {
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

  const handleTogglePublish = async (review: ParaReview) => {
    if (!review.publishedToMiniSite && publishedReviews.length >= 2) {
      toast.error('Max 2 reviews can be published to Mini Website'); return;
    }
    try {
      await updateDoc(doc(db, 'paramedicals', paraId, 'reviews', review.id), { publishedToMiniSite: !review.publishedToMiniSite });
      toast.success(review.publishedToMiniSite ? 'Unpublished' : 'Published to Mini Website!');
    } catch (err) { toast.error('Failed'); }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteDoc(doc(db, 'paramedicals', paraId, 'reviews', reviewId));
      toast.success('Review deleted');
    } catch (err) { toast.error('Failed to delete'); }
  };

  const handleShare = (platform: string) => {
    const bookingUrl = `https://healqr.com/para/${profile?.profileSlug || paraId}`;
    const shareText = `Book ${roleName} services from ${profile?.name || 'Professional'} on HealQR: ${bookingUrl}`;
    let url = '';

    switch (platform) {
      case 'facebook': url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(bookingUrl)}`; break;
      case 'twitter': url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`; break;
      case 'linkedin': url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(bookingUrl)}`; break;
      case 'whatsapp': url = `https://wa.me/?text=${encodeURIComponent(shareText)}`; break;
      case 'email': url = `mailto:?subject=${encodeURIComponent('Medical Services Booking')}&body=${encodeURIComponent(shareText)}`; break;
      case 'copy':
        navigator.clipboard.writeText(bookingUrl);
        toast.success('Link copied to clipboard');
        setShareMenuOpen(false);
        return;
      default: return;
    }
    window.open(url, '_blank');
    setShareMenuOpen(false);
  };

  const handleToggleStatus = async (bookingId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'confirmed' : 'completed';
    try {
      await updateDoc(doc(db, 'paramedicalBookings', bookingId), {
        status: newStatus,
        ...(newStatus === 'completed' ? { completedAt: new Date().toISOString() } : { completedAt: null })
      });
      toast.success(`Marked as ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const todaysBookings = bookings.filter(b => b.appointmentDate === today);
  const futureBookings = bookings.filter(b => b.appointmentDate > today).sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate));
  const pastBookings = bookings.filter(b => b.appointmentDate < today);
  const roleName = profile?.role ? ROLE_LABELS[profile.role] || profile.role : 'Professional';
  const serviceLabel = profile?.role ? SERVICE_LABELS[profile.role] || 'Service' : 'Service';

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  // ===== SIDEBAR =====
  const Sidebar = () => {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
      management: true,
      practice: true,
      general: true,
      network: true,
      safety: true,
    });

    const sections = ['management', 'practice', 'general', 'network', 'safety'];

    // Color maps for section headers and active items
    const sectionHeaderColor: Record<string, string> = {
      purple: 'text-purple-400/50',
      emerald: 'text-emerald-400/50',
      blue: 'text-blue-400/50',
      red: 'text-red-400/50',
    };

    const sectionChevronColor: Record<string, string> = {
      purple: 'text-purple-500/40',
      emerald: 'text-emerald-500/40',
      blue: 'text-blue-500/40',
      red: 'text-red-500/40',
    };

    const sectionActiveClass: Record<string, string> = {
      purple: 'bg-purple-500/15 text-purple-400',
      emerald: 'bg-emerald-500/15 text-emerald-400',
      blue: 'bg-blue-500/15 text-blue-400',
      red: 'bg-red-500/15 text-red-400',
    };

    return (
      <div className="h-full flex flex-col transition-all duration-300" style={{ backgroundColor: '#0d0a1a' }}>
        {/* Logo */}
        <div className="p-6">
          <img
            src={healqrLogo}
            alt="healQr"
            className="h-8 w-auto filter invert brightness-200"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
          {/* Dashboard Button */}
          <div className="mb-6">
            <button
              onClick={() => {
                setActiveMenu('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                activeMenu === 'dashboard'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                  : 'text-slate-400 hover:bg-purple-900/30 hover:text-purple-200'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[15px] font-semibold">Dashboard</span>
            </button>
          </div>

          <div className="space-y-2">
            {sections.map((sectionId) => {
              const label = SECTION_LABELS[sectionId];
              const color = SECTION_COLORS[sectionId];
              const items = SIDEBAR_ITEMS.filter(i => i.section === sectionId);
              const isExpanded = expandedSections[sectionId] ?? true;

              if (!items.length) return null;

              return (
                <div key={sectionId} className="mb-4">
                  <button
                    onClick={() =>
                      setExpandedSections((prev) => ({
                        ...prev,
                        [sectionId]: !prev[sectionId],
                      }))
                    }
                    className={`w-full flex items-center justify-between px-4 py-2 text-[10px] font-bold uppercase tracking-[0.1em] hover:opacity-80 transition-colors text-left ${sectionHeaderColor[color]}`}
                  >
                    <span className="whitespace-nowrap">{label}</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'} shrink-0 ${sectionChevronColor[color]}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="mt-1 space-y-0.5">
                      {items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeMenu === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (item.id === 'reviews') {
                                setReviewsOpen(true);
                                setMobileMenuOpen(false);
                                return;
                              }
                              setActiveMenu(item.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group text-left ${
                              isActive
                                ? sectionActiveClass[color]
                                : 'text-slate-400 hover:bg-purple-500/10 hover:text-purple-200'
                            }`}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="text-[13px] font-normal whitespace-nowrap">
                              {item.label}
                            </span>
                            {item.id === 'todays-schedule' && todaysBookings.length > 0 && (
                              <span className="ml-auto bg-purple-500/20 text-purple-400 text-[10px] px-1.5 py-0.5 rounded-full">{todaysBookings.length}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Logout */}
          <div className="mt-8 mb-8 border-t border-purple-900/30 pt-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-[13px]">Logout</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ===== DASHBOARD HOME =====
  const DashboardHome = () => {
    const monthBookings = bookings.filter(b => b.appointmentDate?.startsWith(today.slice(0, 7))).length;
    const completedCount = bookings.filter(b => b.status === 'completed').length;
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const averageRating = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;

    return (
    <div className="space-y-3">
      {/* ===== INDIAN FLAG WELCOME SECTION ===== */}
      {/* Orange Welcome Banner */}
      <div className="w-full">
        <div className="w-full flex items-center justify-center rounded-xl bg-orange-500 text-white font-bold py-3 text-base shadow shadow-orange-200">
          <h1 className="text-lg md:text-xl">Welcome Back, {profile?.name || 'Professional'}!</h1>
        </div>
      </div>

      {/* White healQR BrainDeck Banner */}
      <div className="w-full">
        <div className="w-full flex items-center justify-center rounded-xl bg-white text-blue-600 font-bold py-3 text-base border border-blue-200 shadow" style={{ letterSpacing: '0.02em' }}>
          <BrainCircuit className="w-5 h-5 mr-2" />
          healQR BrainDeck
        </div>
      </div>

      {/* Green Data Encrypted Banner */}
      <div className="w-full mb-1">
        <div className="w-full flex items-center justify-center rounded-xl bg-green-600 text-white font-bold py-3 text-base shadow shadow-green-200">
          <Lock className="w-5 h-5 mr-2" />
          Data is encrypted
        </div>
      </div>

      {/* Purple Stats Card — matching LabDashboard aesthetics */}
      <div style={{ background: 'linear-gradient(to bottom right, rgb(147, 51, 234), rgb(126, 34, 206))' }} className="text-white rounded-xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 relative z-10">
          {/* Left Side — Booking Stats */}
          <div className="md:w-[40%] flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/20 pb-4 md:pb-0 md:pr-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Free</span>
              <span className="bg-purple-900 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Active</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold mb-1">{monthBookings} Bookings</div>
            <div className="text-xs text-purple-100 opacity-80">{firstOfMonth} – {lastOfMonth}</div>
          </div>

          {/* Right Side — Social Media Kit + Quick Stats */}
          <div className="md:w-[60%] flex flex-col gap-4">
            {/* Social Media Kit Promo */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-medium backdrop-blur-sm flex items-center gap-1 w-fit shrink-0">✨ New</span>
                  <h3 className="text-sm sm:text-lg font-bold text-white whitespace-nowrap">Social Media Kit</h3>
                </div>
                <p className="text-purple-50 text-xs mb-2 leading-relaxed opacity-90">Create branded posts for Instagram & WhatsApp.</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-white/10"><Share2 className="w-3 h-3 text-purple-200" /></div>
                    <div className="p-1.5 rounded-md bg-white/10"><Share2 className="w-3 h-3 text-blue-200" /></div>
                    <div className="p-1.5 rounded-md bg-white/10"><Share2 className="w-3 h-3 text-emerald-200" /></div>
                  </div>
                  <span className="text-[10px] text-purple-100/70">One-click share</span>
                </div>
              </div>
              <button onClick={() => setActiveMenu('social-kit')} className="bg-white text-purple-600 hover:bg-purple-50 font-bold px-4 py-2 rounded-lg text-sm shadow-lg whitespace-nowrap w-fit shrink-0">
                Try Now →
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-purple-200 text-xs mb-1">Today</p>
              <p className="text-xl font-bold">{todaysBookings.length}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-purple-200 text-xs mb-1">Upcoming</p>
              <p className="text-xl font-bold">{futureBookings.length}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-purple-200 text-xs mb-1">Completed</p>
              <p className="text-xl font-bold">{completedCount}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-purple-200 text-xs mb-1">Total</p>
              <p className="text-xl font-bold">{bookings.length}</p>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Health Tip Card */}
      <DashboardPromoDisplay category="health-tip" placement="landing-patient-modal" />

      {/* Today's schedule preview */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-teal-500" /> Today's {serviceLabel}s</h3>
        {todaysBookings.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">No bookings for today</p>
        ) : (
          <div className="space-y-3">
            {todaysBookings.slice(0, 5).map(b => (
              <div key={b.id} className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-4 py-3">
                <div>
                  <p className="text-white text-sm font-medium">{b.patientName}</p>
                  <p className="text-gray-400 text-xs">{b.timeSlot} • {b.serviceType || serviceLabel}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${b.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : b.status === 'confirmed' ? 'bg-teal-500/20 text-teal-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {b.status}
                </span>
              </div>
            ))}
            {todaysBookings.length > 5 && <p className="text-gray-500 text-xs text-center">+{todaysBookings.length - 5} more</p>}
          </div>
        )}
      </div>

      {/* ★ Review Collection Widget */}
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
        {reviews.length === 0 ? (
          <p className="text-xs text-gray-500">No reviews yet. Collect feedback from your patients.</p>
        ) : (
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

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'QR Manager', icon: QrCode, menu: 'qr-manager', color: 'text-purple-400' },
          { label: 'Schedule', icon: Calendar, menu: 'schedule', color: 'text-blue-400' },
          { label: 'Revenue', icon: IndianRupee, menu: 'revenue', color: 'text-emerald-400' },
          { label: 'Referrals', icon: Users, menu: 'referral-manager', color: 'text-orange-400' },
        ].map(q => (
          <button key={q.menu} onClick={() => setActiveMenu(q.menu)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left hover:border-zinc-700 transition-colors">
            <q.icon className={`w-6 h-6 ${q.color} mb-2`} />
            <p className="text-white text-sm font-medium">{q.label}</p>
          </button>
        ))}
      </div>
    </div>
    );
  };

  // ===== PROFILE PAGE =====
  const ProfilePage = () => {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
      name: profile?.name || '',
      phone: profile?.phone || '',
      pincode: profile?.pincode || '',
      bio: profile?.bio || '',
      experience: profile?.experience || '',
    });
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
      if (!paraId) return;
      setSaving(true);
      try {
        await updateDoc(doc(db, 'paramedicals', paraId), {
          name: form.name.trim(),
          phone: form.phone.trim(),
          pincode: form.pincode.trim(),
          bio: form.bio.trim(),
          experience: form.experience.trim(),
        });
        setProfile(prev => prev ? { ...prev, ...form } : prev);
        setEditing(false);
        toast.success('Profile updated');
      } catch (err: any) { toast.error('Update failed', { description: err.message }); }
      finally { setSaving(false); }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !paraId) return;
      if (!file.type.startsWith('image/')) { toast.error('Please choose an image'); return; }
      if (file.size > 4 * 1024 * 1024) { toast.error('Image must be under 4 MB'); return; }
      if (!auth?.currentUser || auth.currentUser.uid !== paraId) { toast.error('Session expired — please re-login'); return; }
      setUploadingPhoto(true);
      try {
        const path = `paramedical-photos/${paraId}/avatar_${Date.now()}_${file.name}`;
        const sref = storageRef(storage, path);
        await uploadBytes(sref, file);
        const url = await getDownloadURL(sref);
        await updateDoc(doc(db, 'paramedicals', paraId), { profilePhoto: url, updatedAt: new Date().toISOString() });
        setProfile(prev => prev ? { ...prev, profilePhoto: url } : prev);
        toast.success('Profile photo updated');
      } catch (err: any) {
        console.error(err);
        toast.error(err?.code === 'storage/unauthorized' ? 'Permission denied — re-login' : (err?.message || 'Upload failed'));
      } finally {
        setUploadingPhoto(false);
        if (photoInputRef.current) photoInputRef.current.value = '';
      }
    };

    const handleRemovePhoto = async () => {
      if (!paraId || !profile?.profilePhoto) return;
      if (!confirm('Remove your profile photo?')) return;
      try {
        await updateDoc(doc(db, 'paramedicals', paraId), { profilePhoto: '', updatedAt: new Date().toISOString() });
        setProfile(prev => prev ? { ...prev, profilePhoto: '' } : prev);
        toast.success('Photo removed');
      } catch (err: any) { toast.error(err?.message || 'Failed'); }
    };

    const initials = (profile?.name || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    return (
      <div className="space-y-6">
        {/* Photo + identity card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="relative">
              {profile?.profilePhoto ? (
                <img src={profile.profilePhoto} alt={profile.name} className="w-24 h-24 rounded-full object-cover border-2 border-teal-500/40" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center text-white text-2xl font-bold border-2 border-teal-500/40">
                  {initials}
                </div>
              )}
              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={() => photoInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center shadow-lg"
                title="Change photo"
              >
                {uploadingPhoto ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-white font-bold text-xl">{profile?.name || 'Your Name'}</h3>
              <p className="text-teal-400 text-sm">{roleName}</p>
              <p className="text-gray-500 text-xs mt-1">Photo & bio appear on your public mini-website at <span className="text-teal-400">healqr.com/para/{profile?.profileSlug || paraId.slice(0, 8)}</span></p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="border-zinc-700 text-white" disabled={uploadingPhoto} onClick={() => photoInputRef.current?.click()}>
                  <Camera className="w-3.5 h-3.5 mr-1.5" /> {profile?.profilePhoto ? 'Change Photo' : 'Add Photo'}
                </Button>
                {profile?.profilePhoto && (
                  <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10" onClick={handleRemovePhoto}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold text-lg">Profile Details</h3>
            {!editing ? (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="border-zinc-700 text-white">
                <Edit3 className="w-4 h-4 mr-2" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="border-zinc-700 text-white">Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Save</>}
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Name</label>
              {editing ? <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-black border-zinc-800 text-white" />
                : <p className="text-white">{profile?.name}</p>}
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Role</label>
              <p className="text-teal-400 font-medium">{roleName}</p>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Email</label>
              <p className="text-white">{profile?.email}</p>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Phone</label>
              {editing ? <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="bg-black border-zinc-800 text-white" />
                : <p className="text-white">{profile?.phone || '—'}</p>}
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Service Area Pincode</label>
              {editing ? <Input value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} className="bg-black border-zinc-800 text-white" maxLength={6} />
                : <p className="text-white">{profile?.pincode || '—'}</p>}
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Experience</label>
              {editing ? <Input value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} className="bg-black border-zinc-800 text-white" />
                : <p className="text-white">{profile?.experience || '—'}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="text-gray-400 text-xs mb-1 block">Bio / About</label>
              {editing ? <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                className="w-full bg-black border border-zinc-800 text-white rounded-lg p-3 min-h-[80px] focus:border-teal-500 focus:outline-none" placeholder="Tell patients about your services..." />
                : <p className="text-white text-sm">{profile?.bio || 'No bio added yet.'}</p>}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">QR & Booking URL</h3>
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-lg">
              <QRCode value={`https://healqr.com/para/${profile?.profileSlug || paraId}`} size={80} />
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">QR Number</p>
              <p className="text-white font-mono text-lg">{profile?.qrNumber || '—'}</p>
              <p className="text-gray-500 text-xs mt-1">healqr.com/para/{profile?.profileSlug || paraId}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===== QR MANAGER =====
  const QRManagerPage = () => {
    const [slugInput, setSlugInput] = useState(profile?.profileSlug || '');
    const [savingSlug, setSavingSlug] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);
    const posterCanvasRef = useRef<HTMLCanvasElement>(null);
    const [posterDataUrl, setPosterDataUrl] = useState<string>('');
    const bookingUrl = `https://healqr.com/para/${profile?.profileSlug || paraId}`;
    const ivrCode = profile?.ivrCode || '';

    const handleSaveSlug = async () => {
      if (!slugInput.trim() || !paraId) return;
      const slug = slugInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      setSavingSlug(true);
      try {
        // Check uniqueness
        const existing = await getDocs(query(collection(db, 'paramedicals'), where('profileSlug', '==', slug)));
        if (!existing.empty && existing.docs[0].id !== paraId) {
          toast.error('This slug is already taken');
          setSavingSlug(false);
          return;
        }
        await updateDoc(doc(db, 'paramedicals', paraId), { profileSlug: slug });
        setProfile(prev => prev ? { ...prev, profileSlug: slug } : prev);
        toast.success('Profile URL updated!');
      } catch (err: any) { toast.error(err.message); }
      finally { setSavingSlug(false); }
    };

    // Generate styled poster: QR with HealQR logo + IVR pill + name
    useEffect(() => {
      const generate = async () => {
        const canvas = posterCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = 600, H = 850;
        canvas.width = W; canvas.height = H;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        // Top accent bar (teal gradient — matches paramedical brand)
        const topGrad = ctx.createLinearGradient(0, 0, W, 0);
        topGrad.addColorStop(0, '#14b8a6');
        topGrad.addColorStop(1, '#10b981');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, W, 8);

        // QR (H-level error correction so logo overlay is safe)
        const qrDataUrl = await QRCodeLib.toDataURL(bookingUrl, {
          width: 400,
          margin: 2,
          errorCorrectionLevel: 'H',
          color: { dark: '#000000', light: '#ffffff' },
        });
        const qrImg = new Image();
        qrImg.src = qrDataUrl;
        await new Promise<void>((resolve) => { qrImg.onload = () => resolve(); });

        const qrSize = 380;
        const qrX = (W - qrSize) / 2;
        const qrY = 50;
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        // Center HealQR logo overlay
        try {
          const logo = new Image();
          logo.crossOrigin = 'anonymous';
          logo.src = healqrLogo;
          await new Promise<void>((resolve, reject) => {
            logo.onload = () => resolve();
            logo.onerror = () => reject();
          });
          const logoSize = qrSize * 0.22;
          const logoX = qrX + (qrSize - logoSize) / 2;
          const logoY = qrY + (qrSize - logoSize) / 2;
          const circleRadius = logoSize / 2 + 8;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(qrX + qrSize / 2, qrY + qrSize / 2, circleRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(qrX + qrSize / 2, qrY + qrSize / 2, circleRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        } catch (e) {
          console.warn('[Paramedical QR] Logo overlay skipped:', e);
        }

        // IVR pill below QR
        if (ivrCode) {
          const pillY = qrY + qrSize + 18;
          const codeText = `\u{1F4DE} IVR Code: ${ivrCode}`;
          ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
          const textW = ctx.measureText(codeText).width;
          const pillW = textW + 40;
          const pillH = 38;
          const pillX = (W - pillW) / 2;
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, 19);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(codeText, W / 2, pillY + pillH / 2);
        }

        // Name (clear gap below pill — pill bottom ≈ qrY+qrSize+56)
        const nameY = ivrCode ? qrY + qrSize + 110 : qrY + qrSize + 40;
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 30px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText((profile?.name || 'Healthcare Professional').toUpperCase(), W / 2, nameY);

        // Role
        ctx.fillStyle = '#6b7280';
        ctx.font = '18px system-ui, sans-serif';
        ctx.fillText(roleName, W / 2, nameY + 30);

        // QR Number
        if (profile?.qrNumber) {
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 20px system-ui, sans-serif';
          ctx.fillText(`QR: ${profile.qrNumber}`, W / 2, nameY + 60);
        }

        // Divider
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(W * 0.2, nameY + 85);
        ctx.lineTo(W * 0.8, nameY + 85);
        ctx.stroke();

        // IVR call-out for non-smartphone users
        if (ivrCode) {
          ctx.fillStyle = '#6b7280';
          ctx.font = '14px system-ui, sans-serif';
          ctx.fillText('No smartphone? Call 1800-XXX-XXXX', W / 2, nameY + 110);
          ctx.fillText(`and enter code: ${ivrCode}`, W / 2, nameY + 130);
        }

        // HealQR brand
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 24px system-ui, sans-serif';
        ctx.fillText('HEALQR.COM', W / 2, H - 30);

        setPosterDataUrl(canvas.toDataURL('image/png'));
      };
      generate();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookingUrl, ivrCode, profile?.name, profile?.qrNumber]);

    const downloadPoster = () => {
      if (!posterDataUrl) return;
      const a = document.createElement('a');
      a.href = posterDataUrl;
      a.download = `HealQR-${profile?.qrNumber || profile?.name || 'paramedical'}.png`;
      a.click();
    };

    const copyUrl = () => {
      navigator.clipboard.writeText(bookingUrl);
      toast.success('URL copied!');
    };

    return (
      <div className="space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-6">Your QR Code</h3>
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div ref={canvasRef} className="bg-white p-3 rounded-2xl">
              {posterDataUrl ? (
                <img src={posterDataUrl} alt="HealQR poster" className="w-[260px] h-auto rounded-lg" />
              ) : (
                <div className="w-[260px] aspect-[600/850] flex items-center justify-center text-gray-400 text-xs">
                  Generating…
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div>
                <p className="text-gray-400 text-xs mb-1">QR Number</p>
                <p className="text-white font-mono text-2xl font-bold">{profile?.qrNumber || 'Not assigned'}</p>
              </div>
              {ivrCode && (
                <div>
                  <p className="text-gray-400 text-xs mb-1">IVR Code (for non-smartphone users)</p>
                  <p className="text-emerald-400 font-mono text-xl font-bold tracking-wider">{ivrCode}</p>
                </div>
              )}
              <div>
                <p className="text-gray-400 text-xs mb-1">Booking URL</p>
                <div className="flex items-center gap-2">
                  <code className="text-teal-400 text-sm bg-black px-3 py-1.5 rounded-lg border border-zinc-800 flex-1 truncate">{bookingUrl}</code>
                  <Button size="sm" variant="outline" onClick={copyUrl} className="border-zinc-700"><Copy className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={downloadPoster} disabled={!posterDataUrl} className="bg-teal-600 hover:bg-teal-700">
                  <Download className="w-4 h-4 mr-2" /> Download QR Poster
                </Button>
              </div>
            </div>
          </div>
          <canvas ref={posterCanvasRef} style={{ display: 'none' }} />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Custom Profile URL</h3>
          <div className="flex gap-2">
            <div className="flex items-center bg-black border border-zinc-800 rounded-lg px-3">
              <span className="text-gray-500 text-sm">healqr.com/para/</span>
            </div>
            <Input value={slugInput} onChange={e => setSlugInput(e.target.value)}
              className="bg-black border-zinc-800 text-white flex-1" placeholder="your-name" />
            <Button onClick={handleSaveSlug} disabled={savingSlug} className="bg-teal-600 hover:bg-teal-700">
              {savingSlug ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
          <p className="text-gray-500 text-xs mt-2">Lowercase letters, numbers, and hyphens only.</p>
        </div>
      </div>
    );
  };

  // ===== SCHEDULE MAKER =====
  const ScheduleMaker = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const [schedules, setSchedules] = useState<ScheduleSlot[]>(profile?.schedules || []);
    const [saving, setSaving] = useState(false);

    const addSlot = () => {
      setSchedules([...schedules, {
        id: Date.now().toString(),
        day: 'Monday',
        startTime: '09:00',
        endTime: '17:00',
        isActive: true,
        maxBookings: 10,
      }]);
    };

    const updateSlot = (id: string, field: string, value: any) => {
      setSchedules(schedules.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const removeSlot = (id: string) => {
      setSchedules(schedules.filter(s => s.id !== id));
    };

    const handleSave = async () => {
      setSaving(true);
      try {
        await updateDoc(doc(db, 'paramedicals', paraId), { schedules });
        setProfile(prev => prev ? { ...prev, schedules } : prev);
        toast.success('Schedule saved!');
      } catch (err: any) { toast.error(err.message); }
      finally { setSaving(false); }
    };

    return (
      <div className="space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold">Weekly Schedule</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={addSlot} className="border-zinc-700 text-white">
                <Plus className="w-4 h-4 mr-1" /> Add Slot
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Save</>}
              </Button>
            </div>
          </div>

          {schedules.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">No schedule set. Add time slots for patients to book.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map(slot => (
                <div key={slot.id} className={`bg-zinc-800/50 border rounded-lg p-4 ${slot.isActive ? 'border-zinc-700' : 'border-zinc-800 opacity-60'}`}>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
                    <select value={slot.day} onChange={e => updateSlot(slot.id, 'day', e.target.value)}
                      className="bg-black border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm" style={{ colorScheme: 'dark' }}>
                      {days.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <Input type="time" value={slot.startTime} onChange={e => updateSlot(slot.id, 'startTime', e.target.value)}
                      className="bg-black border-zinc-700 text-white text-sm" />
                    <Input type="time" value={slot.endTime} onChange={e => updateSlot(slot.id, 'endTime', e.target.value)}
                      className="bg-black border-zinc-700 text-white text-sm" />
                    <Input type="number" value={slot.maxBookings} onChange={e => updateSlot(slot.id, 'maxBookings', parseInt(e.target.value) || 1)}
                      className="bg-black border-zinc-700 text-white text-sm" min={1} max={50} placeholder="Max bookings" />
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => updateSlot(slot.id, 'isActive', !slot.isActive)}
                        className={`px-3 py-1 rounded text-xs font-medium ${slot.isActive ? 'bg-teal-500/20 text-teal-400' : 'bg-zinc-700 text-gray-400'}`}>
                        {slot.isActive ? 'Active' : 'Off'}
                      </button>
                      <button onClick={() => removeSlot(slot.id)} className="text-red-400 hover:text-red-300 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===== TODAY'S SCHEDULE =====
  const TodaysSchedule = () => {
    const [updatingId, setUpdatingId] = useState('');

    const markStatus = async (bookingId: string, status: string) => {
      setUpdatingId(bookingId);
      try {
        await updateDoc(doc(db, 'paramedicalBookings', bookingId), {
          status,
          ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {}),
        });
        toast.success(`Marked as ${status}`);
      } catch (err: any) { toast.error(err.message); }
      finally { setUpdatingId(''); }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">Today — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
          <span className="text-teal-400 text-sm font-medium">{todaysBookings.length} booking{todaysBookings.length !== 1 ? 's' : ''}</span>
        </div>
        {todaysBookings.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
            <CalendarDays className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No bookings for today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaysBookings.map(b => (
              <div key={b.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-semibold">{b.patientName}</p>
                    <p className="text-gray-400 text-sm"><Phone className="w-3 h-3 inline mr-1" />{b.patientPhone}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${b.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : b.status === 'confirmed' ? 'bg-teal-500/20 text-teal-400' : b.status === 'cancelled' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {b.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <p className="text-gray-400"><Clock className="w-3 h-3 inline mr-1" />{b.timeSlot}</p>
                  <p className="text-gray-400">{b.serviceType || serviceLabel}</p>
                  {b.address && <p className="text-gray-400 col-span-2"><MapPin className="w-3 h-3 inline mr-1" />{b.address}</p>}
                </div>
                {b.allottedBy?.name && (
                  <div className="mb-3 inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    Allotted by {b.allottedBy.type === 'doctor' ? 'Dr. ' : b.allottedBy.type === 'clinic' ? 'Clinic ' : b.allottedBy.type === 'lab' ? 'Lab ' : ''}{b.allottedBy.name}
                    {b.allottedBy.branchName && b.allottedBy.branchName !== b.allottedBy.name && (
                      <span className="opacity-80">— {b.allottedBy.branchName}</span>
                    )}
                  </div>
                )}
                {b.status !== 'completed' && b.status !== 'cancelled' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => markStatus(b.id, 'completed')} disabled={updatingId === b.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-sm">
                      {updatingId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" /> Complete</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => markStatus(b.id, 'cancelled')}
                      className="border-red-800 text-red-400 hover:bg-red-500/10 text-sm">Cancel</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ===== ADVANCE BOOKINGS =====
  const AdvanceBookings = () => (
    <div className="space-y-4">
      <h3 className="text-white font-semibold">Upcoming Bookings</h3>
      {futureBookings.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <CalendarPlus className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">No upcoming bookings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {futureBookings.map(b => (
            <div key={b.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{b.patientName}</p>
                  <p className="text-gray-400 text-sm">{new Date(b.appointmentDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} • {b.timeSlot}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-teal-500/20 text-teal-400">{b.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ===== HISTORY =====
  const HistoryPage = () => (
    <div className="space-y-4">
      <h3 className="text-white font-semibold">Past Bookings</h3>
      {pastBookings.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">No past bookings yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pastBookings.slice(0, 50).map(b => (
            <div key={b.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{b.patientName}</p>
                  <p className="text-gray-400 text-xs">{new Date(b.appointmentDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} • {b.serviceType || serviceLabel}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${b.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{b.status}</span>
                  {b.amount && <p className="text-gray-400 text-xs mt-1">₹{b.amount}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ===== REVENUE DASHBOARD =====
  const RevenueDashboard = () => {
    const completedBookings = bookings.filter(b => b.status === 'completed');
    const thisMonth = completedBookings.filter(b => b.appointmentDate?.startsWith(today.slice(0, 7)));
    const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const monthRevenue = thisMonth.reduce((sum, b) => sum + (b.amount || 0), 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-gray-400 text-xs mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-emerald-400">₹{totalRevenue.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-gray-400 text-xs mb-1">This Month</p>
            <p className="text-2xl font-bold text-teal-400">₹{monthRevenue.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-gray-400 text-xs mb-1">Completed Services</p>
            <p className="text-2xl font-bold text-white">{completedBookings.length}</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Recent Payments</h3>
          {completedBookings.slice(0, 20).length === 0 ? (
            <p className="text-gray-500 text-center py-8">No completed services yet</p>
          ) : (
            <div className="space-y-2">
              {completedBookings.slice(0, 20).map(b => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <div>
                    <p className="text-white text-sm">{b.patientName}</p>
                    <p className="text-gray-500 text-xs">{b.appointmentDate}</p>
                  </div>
                  <span className="text-emerald-400 font-medium">₹{b.amount || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===== REFERRAL MANAGER =====
  const ReferralManager = () => {
    const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
    const [loadingRefs, setLoadingRefs] = useState(true);

    useEffect(() => {
      const load = async () => {
        try {
          // Load linked entities
          const refs: ReferralEntry[] = [];

          // Doctors who linked this paramedical
          if (profile?.linkedDoctors?.length) {
            for (const drId of profile.linkedDoctors) {
              const drSnap = await getDoc(doc(db, 'doctors', drId));
              if (drSnap.exists()) {
                const data = drSnap.data();
                const refBookings = bookings.filter(b => b.referredBy?.id === drId);
                refs.push({
                  id: drId, name: data.name || 'Doctor', type: 'doctor',
                  email: data.email, phone: data.phone,
                  referralCount: refBookings.length,
                  lastReferralDate: refBookings[0]?.appointmentDate,
                });
              }
            }
          }

          // Labs
          if (profile?.linkedLabs?.length) {
            for (const labId of profile.linkedLabs) {
              const labSnap = await getDoc(doc(db, 'labs', labId));
              if (labSnap.exists()) {
                const data = labSnap.data();
                const refBookings = bookings.filter(b => b.referredBy?.id === labId);
                refs.push({
                  id: labId, name: data.name || data.labName || 'Lab', type: 'lab',
                  email: data.email, phone: data.phone,
                  referralCount: refBookings.length,
                  lastReferralDate: refBookings[0]?.appointmentDate,
                });
              }
            }
          }

          // Clinics
          if (profile?.linkedClinics?.length) {
            for (const cId of profile.linkedClinics) {
              const cSnap = await getDoc(doc(db, 'clinics', cId));
              if (cSnap.exists()) {
                const data = cSnap.data();
                const refBookings = bookings.filter(b => b.referredBy?.id === cId);
                refs.push({
                  id: cId, name: data.name || 'Clinic', type: 'clinic',
                  email: data.email, phone: data.phone,
                  referralCount: refBookings.length,
                  lastReferralDate: refBookings[0]?.appointmentDate,
                });
              }
            }
          }

          setReferrals(refs);
        } catch (err) { console.error(err); }
        finally { setLoadingRefs(false); }
      };
      load();
    }, [profile, bookings]);

    return (
      <div className="space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-orange-400" /> My Referring Network</h3>
          <p className="text-gray-400 text-sm mb-6">Doctors, clinics, and labs that refer patients to you.</p>

          {loadingRefs ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-teal-500 animate-spin" /></div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">No referral connections yet.</p>
              <p className="text-gray-600 text-sm mt-1">Doctors, clinics, and labs can link you from their dashboard.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map(ref => (
                <div key={ref.id} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ref.type === 'doctor' ? 'bg-blue-500/20' : ref.type === 'clinic' ? 'bg-purple-500/20' : 'bg-emerald-500/20'}`}>
                        {ref.type === 'doctor' ? <Stethoscope className="w-5 h-5 text-blue-400" /> :
                          ref.type === 'clinic' ? <Building2 className="w-5 h-5 text-purple-400" /> :
                            <Building2 className="w-5 h-5 text-emerald-400" />}
                      </div>
                      <div>
                        <p className="text-white font-medium">{ref.name}</p>
                        <p className="text-gray-400 text-xs capitalize">{ref.type}{ref.phone ? ` • ${ref.phone}` : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-teal-400 font-semibold">{ref.referralCount}</p>
                      <p className="text-gray-500 text-xs">referrals</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===== ANALYTICS =====
  const AnalyticsPage = () => {
    const completedBookings = bookings.filter(b => b.status === 'completed');
    const monthBookings = bookings.filter(b => b.appointmentDate?.startsWith(today.slice(0, 7)));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Total Bookings</p>
            <p className="text-2xl font-bold text-white">{bookings.length}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Completed</p>
            <p className="text-2xl font-bold text-emerald-400">{completedBookings.length}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">This Month</p>
            <p className="text-2xl font-bold text-teal-400">{monthBookings.length}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Completion Rate</p>
            <p className="text-2xl font-bold text-blue-400">
              {bookings.length ? Math.round((completedBookings.length / bookings.length) * 100) : 0}%
            </p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Service Breakdown</h3>
          <p className="text-gray-500 text-sm">Detailed analytics with charts will be available as your booking volume grows.</p>
        </div>
      </div>
    );
  };

  // ===== REPORTS =====
  const ReportsPage = () => (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-purple-400" /> Reports</h3>
        <p className="text-gray-400 text-sm mb-6">Generate service reports for your records.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <p className="text-white font-medium mb-1">Monthly Summary</p>
            <p className="text-gray-500 text-sm">Total bookings: {bookings.filter(b => b.appointmentDate?.startsWith(today.slice(0, 7))).length}</p>
            <p className="text-gray-500 text-sm">Completed: {bookings.filter(b => b.appointmentDate?.startsWith(today.slice(0, 7)) && b.status === 'completed').length}</p>
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <p className="text-white font-medium mb-1">Overall</p>
            <p className="text-gray-500 text-sm">Total served: {bookings.filter(b => b.status === 'completed').length}</p>
            <p className="text-gray-500 text-sm">Active since: {profile?.createdAt ? new Date(profile.createdAt?.toDate?.() || profile.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ===== SOCIAL KIT =====
  const SocialKit = () => {
    const bookingUrl = `https://healqr.com/para/${profile?.profileSlug || paraId}`;
    const shareText = `Book ${roleName} services from ${profile?.name || 'me'} on HealQR: ${bookingUrl}`;

    const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    const copyLink = () => { navigator.clipboard.writeText(bookingUrl); toast.success('Link copied!'); };

    return (
      <div className="space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Share2 className="w-5 h-5 text-purple-400" /> Social Sharing Kit</h3>
          <div className="space-y-3">
            <Button onClick={shareWhatsApp} className="w-full bg-green-600 hover:bg-green-700 justify-start">
              <Megaphone className="w-4 h-4 mr-2" /> Share on WhatsApp
            </Button>
            <Button onClick={copyLink} variant="outline" className="w-full border-zinc-700 text-white justify-start">
              <Copy className="w-4 h-4 mr-2" /> Copy Booking Link
            </Button>
          </div>
          <div className="mt-6 bg-black border border-zinc-800 rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-2">Your booking URL</p>
            <code className="text-teal-400 text-sm break-all">{bookingUrl}</code>
          </div>
        </div>
      </div>
    );
  };

  // ===== RENDER PAGE =====
  const renderPage = () => {
    switch (activeMenu) {
      case 'dashboard': return <DashboardHome />;
      case 'profile': return <ProfilePage />;
      case 'qr-manager': return <QRManagerPage />;
      case 'schedule': return <ScheduleMaker />;
      case 'todays-schedule': return <TodaysSchedule />;
      case 'advance-booking': return <AdvanceBookings />;
      case 'history': return <HistoryPage />;
      case 'reports': return <ReportsPage />;
      case 'analytics': return <AnalyticsPage />;
      case 'revenue': return <RevenueDashboard />;
      case 'patient-retention': return <ParamedicalPatientRetention paraId={paraId} paraName={profile?.name} />;
      case 'billing': return <ParamedicalBilling paraId={paraId} paraName={profile?.name} />;
      case 'inventory': return <ParamedicalInventory paraId={paraId} />;
      case 'patient-broadcast': return <ParamedicalBroadcast paraId={paraId} paraName={profile?.name} />;
      case 'allocation-queue': return <ParamedicalAllocationQueue paraId={paraId} />;
      case 'monthly-planner': return <ParamedicalMonthlyPlanner paraId={paraId} />;
      case 'data-management': return <ParamedicalDataManagement paraId={paraId} paraName={profile?.name} />;
      case 'emergency-sos': return <ParamedicalEmergencyButton paraId={paraId} paraName={profile?.name} />;
      case 'personalized-templates': return <ParamedicalPersonalizedTemplates paraId={paraId} />;
      case 'referral-manager': return <ReferralManager />;
      case 'social-kit': return <SocialKit />;
      case 'video-library':
        return (
          <VideoLibrary
            onBack={() => setActiveMenu('dashboard')}
            source="dashboard"
          />
        );
      default: return <DashboardHome />;
    }
  };

  const pageTitle = SIDEBAR_ITEMS.find(i => i.id === activeMenu)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Sidebar Component */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 h-screen transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar />
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden animate-in fade-in duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="transition-all duration-300 lg:ml-64 flex flex-col min-h-screen">
        {/* Unified Header */}
        <header className="bg-zinc-950 border-b border-zinc-900 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
            >
              <Menu className="w-5 h-5 text-purple-500" />
            </button>
            <h2 className="text-lg md:text-xl font-medium">
              {pageTitle}
            </h2>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Share Popover */}
            <Popover open={shareMenuOpen} onOpenChange={setShareMenuOpen}>
              <PopoverTrigger asChild>
                <button className="w-9 h-9 md:w-10 md:h-10 bg-[#1a162e] hover:bg-[#252145] rounded-xl flex items-center justify-center transition-all duration-300 border border-purple-900/30 group">
                  <Share2 className="w-4 h-4 md:w-5 md:h-5 text-purple-400 group-hover:text-purple-300" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4 bg-zinc-900 border-zinc-800" align="end">
                <div className="space-y-3">
                  <div className="mb-1">
                    <h3 className="text-white mb-1">Share Your Profile</h3>
                    <p className="text-gray-400 text-xs truncate">https://healqr.com/para/{profile?.profileSlug || paraId}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleShare('facebook')} className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors"><Facebook className="w-4 h-4" /><span className="text-sm">Facebook</span></button>
                    <button onClick={() => handleShare('twitter')} className="flex items-center gap-2 px-3 py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 rounded-lg transition-colors"><Twitter className="w-4 h-4" /><span className="text-sm">Twitter</span></button>
                    <button onClick={() => handleShare('linkedin')} className="flex items-center gap-2 px-3 py-2 bg-blue-700/20 hover:bg-blue-700/30 text-blue-400 rounded-lg transition-colors"><Linkedin className="w-4 h-4" /><span className="text-sm">LinkedIn</span></button>
                    <button onClick={() => handleShare('whatsapp')} className="flex items-center gap-2 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors"><MessageCircle className="w-4 h-4" /><span className="text-sm">WhatsApp</span></button>
                    <button onClick={() => handleShare('email')} className="flex items-center gap-2 px-3 py-2 bg-gray-700/20 hover:bg-gray-700/30 text-gray-400 rounded-lg transition-colors"><Mail className="w-4 h-4" /><span className="text-sm">Email</span></button>
                    <button onClick={() => handleShare('copy')} className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors"><Copy className="w-4 h-4" /><span className="text-sm">Copy Link</span></button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Video Tutorials */}
            <button
              onClick={() => setActiveMenu('video-library')}
              className="w-9 h-9 md:w-10 md:h-10 bg-[#1a162e] hover:bg-[#252145] rounded-xl flex items-center justify-center transition-all duration-300 border border-purple-900/30 group"
              title="Video Tutorials"
            >
              <Video className="w-4 h-4 md:w-5 md:h-5 text-purple-400 group-hover:text-purple-300" />
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
              className="w-9 h-9 md:w-10 md:h-10 bg-[#1a162e] hover:bg-[#252145] rounded-xl flex items-center justify-center transition-all duration-300 border border-purple-900/30 group relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4 md:w-5 md:h-5 text-purple-400 group-hover:text-purple-300" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full text-[10px] text-white flex items-center justify-center border-2 border-zinc-950">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Profile Avatar */}
            <button
              onClick={() => setActiveMenu('profile')}
              className="w-9 h-9 md:w-10 md:h-10 bg-purple-500 rounded-full flex items-center justify-center overflow-hidden border-2 border-zinc-900"
              title="Profile"
            >
              {profile?.profilePhoto ? (
                <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-sm">{(profile?.name || 'P')[0].toUpperCase()}</span>
              )}
            </button>
          </div>
        </header>

        {/* Page Content Area */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {renderPage()}
        </main>

        {/* Reviews Side Panel */}
        {reviewsOpen && (
          <div className="fixed inset-0 z-[100] flex">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReviewsOpen(false)} />
            <div className="relative ml-auto w-full max-w-md bg-zinc-950 border-l border-zinc-800 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
                <div>
                  <h2 className="text-white font-semibold text-lg">Paramedical Reviews</h2>
                  <p className="text-xs text-gray-400">{reviews.length} total · {publishedReviews.length}/2 published</p>
                </div>
                <button onClick={() => setReviewsOpen(false)} className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-zinc-800 px-5">
                {(['incoming', 'selfCreated', 'published'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setReviewsActiveTab(tab)}
                    className={`py-3 px-3 text-sm font-medium border-b-2 transition-all ${
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

              <div className="flex-1 p-5 space-y-4 overflow-y-auto custom-scrollbar">
                {reviewsActiveTab === 'selfCreated' && (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3 mb-6">
                    <h3 className="text-white text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-purple-400" /> Add Self-Created Review</h3>
                    <div className="space-y-3">
                      <Input
                        placeholder="Patient Name"
                        value={newReviewName}
                        onChange={(e) => setNewReviewName(e.target.value)}
                        className="bg-zinc-950 border-zinc-800 text-white h-9"
                      />
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-xs text-gray-400">Rating:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button key={num} onClick={() => setNewReviewRating(num)}>
                              <Star className={`w-4 h-4 ${num <= newReviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        placeholder="Patient's feedback..."
                        value={newReviewComment}
                        onChange={(e) => setNewReviewComment(e.target.value)}
                        className="w-full h-20 bg-zinc-950 border border-zinc-800 rounded-md p-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <Button
                        onClick={handleAddSelfReview}
                        disabled={addingReview}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white h-9"
                      >
                        {addingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Review'}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {(reviewsActiveTab === 'published' ? publishedReviews :
                    reviewsActiveTab === 'selfCreated' ? selfCreatedReviews :
                    incomingReviews).map((r) => (
                    <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 transition-colors hover:border-purple-900/20 group">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {renderStars(r.rating, 'w-3.5 h-3.5')}
                          </div>
                          <p className="text-white font-medium text-sm">{r.patientName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTogglePublish(r)}
                            title={r.publishedToMiniSite ? 'Unpublish' : 'Publish to Mini Website'}
                            className={`p-1.5 rounded-lg transition-colors ${r.publishedToMiniSite ? 'bg-green-900 text-green-400' : 'bg-zinc-800 text-gray-400 hover:text-green-400'}`}
                          >
                            <Upload className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteReview(r.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed italic">"{r.comment}"</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">{r.date}</span>
                        {r.publishedToMiniSite && (
                          <span className="text-[10px] bg-green-900 text-green-400 px-2 py-0.5 rounded-full">Live on Mini Website</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {(reviewsActiveTab === 'incoming' ? incomingReviews :
                    reviewsActiveTab === 'selfCreated' ? selfCreatedReviews :
                    publishedReviews).length === 0 && (
                    <div className="text-center py-10">
                      <Star className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No reviews found in this category.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
