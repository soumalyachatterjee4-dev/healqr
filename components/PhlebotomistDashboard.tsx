import { useState, useEffect } from 'react';
import {
  Syringe, LogOut, User, Building2, Stethoscope, Microscope, MapPin, Phone, Mail,
  Calendar, CheckCircle2, Clock, ChevronRight, Home, AlertCircle, Menu, X,
} from 'lucide-react';
import { db, auth } from '../lib/firebase/config';
import {
  doc, getDoc, updateDoc, collection, query, where, onSnapshot, getDocs, Timestamp,
} from 'firebase/firestore';
import { toast } from 'sonner';
import healqrLogo from '../assets/healqr.logo.png';

interface PhlebotomistData {
  name: string;
  email: string;
  phone: string;
  pincode: string;
  state: string;
  experience: string;
  status: string;
  linkedLabs: { id: string; name: string; linkedAt: string }[];
  linkedDoctors: { id: string; name: string; linkedAt: string }[];
  linkedClinics: { id: string; name: string; linkedAt: string }[];
  createdAt: Timestamp;
}

interface AssignedCollection {
  id: string;
  bookingId: string;
  patientName: string;
  patientPhone: string;
  homeAddress: string;
  homeLandmark: string;
  homePincode: string;
  homeLocationUrl: string;
  tests: { testName: string; sampleType: string }[];
  timeSlot: string;
  bookingDate: string;
  labName: string;
  labId: string;
  sampleCollected: boolean;
  status: string;
}

function getLocalDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PhlebotomistDashboard({ onLogout }: { onLogout: () => void }) {
  const [phlebData, setPhlebData] = useState<PhlebotomistData | null>(null);
  const [phlebId, setPhlebId] = useState('');
  const [collections, setCollections] = useState<AssignedCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'profile' | 'network'>('today');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Editing profile
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPincode, setEditPincode] = useState('');
  const [editExperience, setEditExperience] = useState('');

  const todayStr = getLocalDateStr();

  /* ───── Load phlebo profile ───── */
  useEffect(() => {
    const loadProfile = async () => {
      const uid = auth.currentUser?.uid || localStorage.getItem('userId');
      if (!uid) { setLoading(false); return; }

      // Try uid-based doc first
      let docRef = doc(db, 'phlebotomists', uid);
      let snap = await getDoc(docRef);

      if (!snap.exists()) {
        // Fallback: query by email
        const email = auth.currentUser?.email || localStorage.getItem('healqr_user_email');
        if (email) {
          const q = query(collection(db, 'phlebotomists'), where('email', '==', email));
          const results = await getDocs(q);
          if (!results.empty) {
            snap = results.docs[0];
            docRef = snap.ref;
          }
        }
      }

      if (snap.exists()) {
        setPhlebId(snap.id);
        setPhlebData(snap.data() as PhlebotomistData);
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  /* ───── Load assigned collections (real-time) ───── */
  useEffect(() => {
    if (!phlebId) return;

    const q = query(
      collection(db, 'labBookings'),
      where('allocatedPhlebo.id', '==', phlebId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AssignedCollection));
      setCollections(data);
    });

    return () => unsub();
  }, [phlebId]);

  /* ───── Mark sample collected ───── */
  const markCollected = async (bookingDocId: string) => {
    try {
      await updateDoc(doc(db, 'labBookings', bookingDocId), {
        sampleCollected: true,
        sampleCollectedAt: new Date().toISOString(),
        sampleCollectedBy: phlebData?.name || 'phlebo',
        status: 'sample-collected',
      });
      toast.success('Sample marked as collected');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to update');
    }
  };

  /* ───── Save profile ───── */
  const saveProfile = async () => {
    if (!phlebId) return;
    try {
      await updateDoc(doc(db, 'phlebotomists', phlebId), {
        name: editName.trim(),
        phone: editPhone.trim(),
        pincode: editPincode.trim(),
        experience: editExperience.trim(),
      });
      setPhlebData((prev) => prev ? {
        ...prev, name: editName.trim(), phone: editPhone.trim(),
        pincode: editPincode.trim(), experience: editExperience.trim(),
      } : prev);
      setEditingProfile(false);
      toast.success('Profile updated');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to update profile');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('healqr_is_phlebo');
    localStorage.removeItem('healqr_phlebo_id');
    localStorage.removeItem('userId');
    localStorage.removeItem('healqr_user_email');
    localStorage.removeItem('healqr_authenticated');
    auth.signOut();
    onLogout();
  };

  /* ───── Computed ───── */
  const todayCollections = collections.filter((c) => c.bookingDate === todayStr);
  const pastCollections = collections.filter((c) => c.bookingDate < todayStr);
  const pendingToday = todayCollections.filter((c) => !c.sampleCollected);
  const completedToday = todayCollections.filter((c) => c.sampleCollected);

  const sidebarItems = [
    { id: 'today' as const, label: "Today's Tasks", icon: Calendar, count: todayCollections.length },
    { id: 'history' as const, label: 'History', icon: Clock, count: pastCollections.length },
    { id: 'network' as const, label: 'My Network', icon: Building2, count: (phlebData?.linkedLabs?.length || 0) + (phlebData?.linkedDoctors?.length || 0) + (phlebData?.linkedClinics?.length || 0) },
    { id: 'profile' as const, label: 'Profile', icon: User, count: 0 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!phlebData) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold">Profile Not Found</h2>
          <p className="text-gray-400">Your phlebotomist profile could not be loaded.</p>
          <button onClick={handleLogout} className="px-6 py-2 bg-teal-600 rounded-lg text-sm">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(true)} className="p-1">
          <Menu className="w-6 h-6 text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          <img src={healqrLogo} alt="HealQR" className="h-6" />
          <span className="text-sm font-medium text-teal-400">Phlebotomist</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-xs font-bold">
          {phlebData.name?.[0]?.toUpperCase() || 'P'}
        </div>
      </div>

      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#0a1a1a] border-r border-zinc-800 p-4 z-50">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 bg-[#0a1a1a] border-r border-zinc-800 p-4 z-30">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="transition-all duration-300 lg:ml-64">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
          {activeTab === 'today' && renderToday()}
          {activeTab === 'history' && renderHistory()}
          {activeTab === 'network' && renderNetwork()}
          {activeTab === 'profile' && renderProfile()}
        </div>
      </div>
    </div>
  );

  /* ═════ Sidebar ═════ */
  function SidebarContent() {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <img src={healqrLogo} alt="HealQR" className="h-7" />
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 px-2">
          <p className="text-white font-semibold text-sm truncate">{phlebData?.name}</p>
          <p className="text-teal-400 text-xs">Phlebotomist</p>
          {phlebData?.pincode && <p className="text-gray-500 text-[11px] mt-0.5">{phlebData.pincode}{phlebData.state ? ` • ${phlebData.state}` : ''}</p>}
        </div>

        <nav className="flex-1 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all ${
                  isActive ? 'bg-teal-500/15 text-teal-400' : 'text-gray-400 hover:text-white hover:bg-zinc-800'
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-teal-500/20 text-teal-400' : 'bg-zinc-800 text-gray-500'
                  }`}>{item.count}</span>
                )}
              </button>
            );
          })}
        </nav>

        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg text-[13px] transition-colors mt-auto">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    );
  }

  /* ═════ Today's Tasks ═════ */
  function renderToday() {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-teal-400" /> Today's Collections
        </h2>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase">Total</p>
            <p className="text-2xl font-bold text-white mt-1">{todayCollections.length}</p>
          </div>
          <div className="bg-amber-500/10 border border-zinc-800 rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase">Pending</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{pendingToday.length}</p>
          </div>
          <div className="bg-emerald-500/10 border border-zinc-800 rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase">Collected</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{completedToday.length}</p>
          </div>
        </div>

        {todayCollections.length === 0 ? (
          <div className="text-center py-16">
            <Syringe className="w-12 h-12 text-teal-500/20 mx-auto mb-4" />
            <p className="text-gray-500">No collections assigned for today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Pending first, then completed */}
            {[...pendingToday, ...completedToday].map((c) => (
              <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm">{c.patientName}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        c.sampleCollected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        {c.sampleCollected ? <><CheckCircle2 className="w-3 h-3" /> Collected</> : <><Clock className="w-3 h-3" /> Pending</>}
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs text-gray-500 space-y-0.5">
                      <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {c.patientPhone}</p>
                      <p className="flex items-center gap-1.5"><Home className="w-3 h-3" /> {c.homeAddress}{c.homeLandmark ? `, ${c.homeLandmark}` : ''}{c.homePincode ? ` - ${c.homePincode}` : ''}</p>
                      <p className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {c.timeSlot}</p>
                      <p className="flex items-center gap-1.5"><Microscope className="w-3 h-3" /> {c.labName}</p>
                    </div>
                    {c.tests?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {c.tests.map((t, i) => (
                          <span key={i} className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] text-gray-300">
                            {t.testName} ({t.sampleType})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {!c.sampleCollected && (
                    <button onClick={() => markCollected(c.id)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition-colors shrink-0">
                      Mark Collected
                    </button>
                  )}
                </div>
                {c.homeLocationUrl && (
                  <a href={c.homeLocationUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-teal-400 text-xs hover:underline">
                    <MapPin className="w-3 h-3" /> Open in Maps <ChevronRight className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ═════ History ═════ */
  function renderHistory() {
    const grouped = pastCollections.reduce<Record<string, AssignedCollection[]>>((acc, c) => {
      if (!acc[c.bookingDate]) acc[c.bookingDate] = [];
      acc[c.bookingDate].push(c);
      return acc;
    }, {});
    const sortedDates = Object.keys(grouped).sort().reverse();

    return (
      <div className="space-y-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-400" /> Collection History
        </h2>

        {sortedDates.length === 0 ? (
          <p className="text-center text-gray-500 py-16">No past collections</p>
        ) : sortedDates.map((date) => (
          <div key={date}>
            <h3 className="text-sm font-medium text-gray-400 mb-2">
              {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              <span className="ml-2 text-gray-600">({grouped[date].length})</span>
            </h3>
            <div className="space-y-2">
              {grouped[date].map((c) => (
                <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-white text-sm font-medium">{c.patientName}</span>
                    <span className="text-gray-500 text-xs ml-2">{c.labName}</span>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    c.sampleCollected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                  }`}>
                    {c.sampleCollected ? 'Collected' : 'Missed'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ═════ Network ═════ */
  function renderNetwork() {
    const labs = phlebData?.linkedLabs || [];
    const doctors = phlebData?.linkedDoctors || [];
    const clinics = phlebData?.linkedClinics || [];

    return (
      <div className="space-y-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-teal-400" /> My Network
        </h2>

        {/* Labs */}
        <div>
          <h3 className="text-sm font-medium text-purple-400 mb-3 flex items-center gap-2">
            <Microscope className="w-4 h-4" /> Linked Labs ({labs.length})
          </h3>
          {labs.length === 0 ? (
            <p className="text-gray-500 text-xs bg-zinc-900 rounded-lg p-4">No labs linked yet. Labs can add you from their Phlebotomist Manager.</p>
          ) : (
            <div className="space-y-2">
              {labs.map((l) => (
                <div key={l.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500/15 rounded-lg flex items-center justify-center">
                    <Microscope className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-white text-sm font-medium">{l.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Doctors */}
        <div>
          <h3 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
            <Stethoscope className="w-4 h-4" /> Linked Doctors ({doctors.length})
          </h3>
          {doctors.length === 0 ? (
            <p className="text-gray-500 text-xs bg-zinc-900 rounded-lg p-4">No doctors linked yet.</p>
          ) : (
            <div className="space-y-2">
              {doctors.map((d) => (
                <div key={d.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center">
                    <Stethoscope className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-white text-sm font-medium">{d.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clinics */}
        <div>
          <h3 className="text-sm font-medium text-emerald-400 mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Linked Clinics ({clinics.length})
          </h3>
          {clinics.length === 0 ? (
            <p className="text-gray-500 text-xs bg-zinc-900 rounded-lg p-4">No clinics linked yet.</p>
          ) : (
            <div className="space-y-2">
              {clinics.map((c) => (
                <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-white text-sm font-medium">{c.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═════ Profile ═════ */
  function renderProfile() {
    if (editingProfile) {
      return (
        <div className="space-y-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-teal-400" /> Edit Profile
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4 max-w-md">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Name</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Phone</label>
              <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Pincode</label>
              <input value={editPincode} onChange={(e) => setEditPincode(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm" maxLength={6} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Experience</label>
              <input value={editExperience} onChange={(e) => setEditExperience(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={saveProfile} className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg font-medium">Save</button>
              <button onClick={() => setEditingProfile(false)} className="px-5 py-2 bg-zinc-800 text-gray-400 text-sm rounded-lg hover:text-white">Cancel</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-teal-400" /> My Profile
          </h2>
          <button onClick={() => {
            setEditName(phlebData?.name || '');
            setEditPhone(phlebData?.phone || '');
            setEditPincode(phlebData?.pincode || '');
            setEditExperience(phlebData?.experience || '');
            setEditingProfile(true);
          }} className="px-4 py-2 bg-teal-600/15 text-teal-400 text-xs rounded-lg font-medium hover:bg-teal-600/25">
            Edit Profile
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center text-2xl font-bold">
              {phlebData?.name?.[0]?.toUpperCase() || 'P'}
            </div>
            <div>
              <p className="text-white font-bold text-lg">{phlebData?.name}</p>
              <p className="text-teal-400 text-sm">Phlebotomist</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-gray-300 text-sm">{phlebData?.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-500" />
              <span className="text-gray-300 text-sm">{phlebData?.phone || 'Not set'}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-gray-300 text-sm">{phlebData?.pincode || 'Not set'}{phlebData?.state ? ` • ${phlebData.state}` : ''}</span>
            </div>
            {phlebData?.experience && (
              <div className="flex items-center gap-3">
                <Syringe className="w-4 h-4 text-gray-500" />
                <span className="text-gray-300 text-sm">{phlebData.experience} experience</span>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Phlebo ID</p>
            <p className="text-teal-400 font-mono text-xs">{phlebId}</p>
          </div>
        </div>
      </div>
    );
  }
}
