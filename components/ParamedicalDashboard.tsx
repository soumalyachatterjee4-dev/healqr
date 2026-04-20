import { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db } from '../lib/firebase/config';
import { signOut } from 'firebase/auth';
import {
  doc, getDoc, updateDoc, collection, query, where, getDocs, onSnapshot,
  addDoc, serverTimestamp, orderBy, limit, Timestamp, deleteDoc
} from 'firebase/firestore';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';
import healqrLogo from '../assets/healqr.logo.png';
import {
  Menu, X, User, QrCode, Calendar, CalendarDays, CalendarPlus, FileText,
  BarChart3, Share2, IndianRupee, Users, Settings, LogOut, ChevronDown,
  ChevronUp, Clock, MapPin, Phone, Mail, Edit3, Save, Loader2, Check,
  Plus, Trash2, Copy, Download, Star, Building2, Stethoscope, ArrowLeft,
  History, Activity, Megaphone, Lock, Shield
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import type { ParamedicalRole } from './ParamedicalSignUp';
import DashboardPromoDisplay from './DashboardPromoDisplay';

// ===== ROLE CONFIG =====
const ROLE_LABELS: Record<string, string> = {
  'phlebotomist': 'Phlebotomist',
  'physiotherapist': 'Physiotherapist',
  'nurse': 'Nurse',
  'wound-dresser': 'Wound Dresser',
  'aaya': 'Aaya / Caretaker',
  'home-assistant': 'Home Health Assistant',
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
  { id: 'dashboard', label: 'Dashboard', icon: Activity, section: 'main' },
  { id: 'profile', label: 'Profile', icon: User, section: 'management' },
  { id: 'qr-manager', label: 'QR Manager', icon: QrCode, section: 'management' },
  { id: 'schedule', label: 'Schedule Maker', icon: Calendar, section: 'management' },
  { id: 'todays-schedule', label: "Today's Schedule", icon: CalendarDays, section: 'practice' },
  { id: 'advance-booking', label: 'Advance Bookings', icon: CalendarPlus, section: 'practice' },
  { id: 'history', label: 'History', icon: History, section: 'practice' },
  { id: 'reports', label: 'Reports', icon: FileText, section: 'practice' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, section: 'practice' },
  { id: 'revenue', label: 'Revenue Dashboard', icon: IndianRupee, section: 'practice' },
  { id: 'referral-manager', label: 'Referral Manager', icon: Users, section: 'network' },
  { id: 'social-kit', label: 'Social Kit', icon: Share2, section: 'network' },
];

const SECTION_LABELS: Record<string, string> = {
  main: '',
  management: 'Management',
  practice: 'Practice Tools',
  network: 'Network & Growth',
};

export default function ParamedicalDashboard({ onLogout }: { onLogout: () => void }) {
  const [profile, setProfile] = useState<ParamedicalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);

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

  // Real-time bookings
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('healqr_is_paramedical');
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
    const sections = ['main', 'management', 'practice', 'network'];
    return (
      <div className="h-full flex flex-col bg-[#0a1a1a] border-r border-zinc-800">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <img src={healqrLogo} alt="HealQR" className="h-8 w-auto" />
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{profile?.name || 'Professional'}</p>
              <p className="text-teal-400 text-xs truncate">{roleName}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 space-y-1">
          {sections.map(section => {
            const items = SIDEBAR_ITEMS.filter(i => i.section === section);
            if (!items.length) return null;
            return (
              <div key={section}>
                {SECTION_LABELS[section] && (
                  <p className="px-4 pt-4 pb-1 text-[10px] uppercase tracking-widest text-gray-500 font-medium">{SECTION_LABELS[section]}</p>
                )}
                {items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeMenu === item.id;
                  return (
                    <button key={item.id}
                      onClick={() => { setActiveMenu(item.id); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors ${isActive ? 'bg-teal-500/10 text-teal-400 border-r-2 border-teal-500' : 'text-gray-400 hover:text-white hover:bg-zinc-800/50'}`}>
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {item.id === 'todays-schedule' && todaysBookings.length > 0 && (
                        <span className="ml-auto bg-teal-500/20 text-teal-400 text-[10px] px-1.5 py-0.5 rounded-full">{todaysBookings.length}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="p-3 border-t border-zinc-800">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
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
          <Shield className="w-5 h-5 mr-2" />
          healQR Healthcare Professional
        </div>
      </div>

      {/* Green Data Encrypted Banner */}
      <div className="w-full mb-1">
        <div className="w-full flex items-center justify-center rounded-xl bg-green-600 text-white font-bold py-3 text-base shadow shadow-green-200">
          <Lock className="w-5 h-5 mr-2" />
          Data is encrypted
        </div>
      </div>

      {/* Health Tip Card */}
      <DashboardPromoDisplay category="health-tip" placement="landing-patient-modal" />

      {/* Pink/Rose Stats Card — unique to Paramedical */}
      <div style={{ background: 'linear-gradient(to bottom right, rgb(236, 72, 153), rgb(159, 18, 57))' }} className="text-white rounded-xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 relative z-10">
          {/* Left Side — Booking Stats */}
          <div className="md:w-[40%] flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/20 pb-4 md:pb-0 md:pr-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Free</span>
              <span className="bg-pink-900 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Active</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold mb-1">{monthBookings} Bookings</div>
            <div className="text-xs text-pink-100 opacity-80">{firstOfMonth} – {lastOfMonth}</div>
          </div>

          {/* Right Side — Quick Stats */}
          <div className="md:w-[60%] grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-pink-200 text-xs mb-1">Today</p>
              <p className="text-xl font-bold">{todaysBookings.length}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-pink-200 text-xs mb-1">Upcoming</p>
              <p className="text-xl font-bold">{futureBookings.length}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-pink-200 text-xs mb-1">Completed</p>
              <p className="text-xl font-bold">{completedCount}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-pink-200 text-xs mb-1">Total</p>
              <p className="text-xl font-bold">{bookings.length}</p>
            </div>
          </div>
        </div>
      </div>

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

    return (
      <div className="space-y-6">
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
    const bookingUrl = `https://healqr.com/para/${profile?.profileSlug || paraId}`;

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

    const copyUrl = () => {
      navigator.clipboard.writeText(bookingUrl);
      toast.success('URL copied!');
    };

    const downloadQR = () => {
      const canvas = canvasRef.current?.querySelector('canvas');
      if (!canvas) return;
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `HealQR-${profile?.qrNumber || 'QR'}.png`;
      a.click();
    };

    return (
      <div className="space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-6">Your QR Code</h3>
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div ref={canvasRef} className="bg-white p-4 rounded-2xl">
              <QRCode value={bookingUrl} size={200} level="H" />
            </div>
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div>
                <p className="text-gray-400 text-xs mb-1">QR Number</p>
                <p className="text-white font-mono text-2xl font-bold">{profile?.qrNumber || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Booking URL</p>
                <div className="flex items-center gap-2">
                  <code className="text-teal-400 text-sm bg-black px-3 py-1.5 rounded-lg border border-zinc-800 flex-1 truncate">{bookingUrl}</code>
                  <Button size="sm" variant="outline" onClick={copyUrl} className="border-zinc-700"><Copy className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={downloadQR} className="bg-teal-600 hover:bg-teal-700"><Download className="w-4 h-4 mr-2" /> Download QR</Button>
              </div>
            </div>
          </div>
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
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Share2 className="w-5 h-5 text-pink-400" /> Social Sharing Kit</h3>
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
      case 'referral-manager': return <ReferralManager />;
      case 'social-kit': return <SocialKit />;
      default: return <DashboardHome />;
    }
  };

  const pageTitle = SIDEBAR_ITEMS.find(i => i.id === activeMenu)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0a1a1a] border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white p-1">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <span className="text-white font-semibold text-sm">{pageTitle}</span>
        <img src={healqrLogo} alt="HealQR" className="h-6 w-auto" />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 z-50">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 z-40">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-6 max-w-6xl">
          <div className="hidden lg:block mb-6">
            <h1 className="text-2xl font-bold text-white">{pageTitle}</h1>
            <p className="text-gray-500 text-sm">{roleName} Dashboard</p>
          </div>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
