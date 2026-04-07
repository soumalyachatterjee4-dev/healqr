import { useState, useEffect } from 'react';
import { Search, Send, Inbox, ToggleLeft, ToggleRight, X, ChevronLeft, Clock, CheckCircle, XCircle, User, ArrowRight, Menu, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy, onSnapshot, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase/config';
import DashboardSidebar from './DashboardSidebar';

interface DoctorReferralNetworkProps {
  doctorName: string;
  email: string;
  onLogout: () => void;
  onMenuChange: (menu: string) => void;
  activeAddOns: string[];
}

interface DoctorResult {
  id: string;
  name: string;
  specialties: string[];
  degrees: string[];
  practisingPincodes: string[];
  profileImage?: string;
  experience?: string;
}

interface Referral {
  id: string;
  fromDoctorId: string;
  fromDoctorName: string;
  fromDoctorSpecialty: string;
  toDoctorId: string;
  toDoctorName: string;
  toDoctorSpecialty: string;
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientPhone: string;
  notes: string;
  status: 'sent' | 'accepted' | 'declined' | 'completed';
  createdAt: any;
  updatedAt?: any;
}

export default function DoctorReferralNetwork({ doctorName, email, onLogout, onMenuChange, activeAddOns }: DoctorReferralNetworkProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const doctorId = auth?.currentUser?.uid || '';

  // Toggle states
  const [sendingActive, setSendingActive] = useState(true);
  const [acceptingActive, setAcceptingActive] = useState(true);
  const [loadingToggles, setLoadingToggles] = useState(true);

  // Tab
  const [activeTab, setActiveTab] = useState<'send' | 'incoming' | 'sent' | 'external'>('send');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DoctorResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Send referral form
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorResult | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [patientPhone, setPatientPhone] = useState('');
  const [referralNotes, setReferralNotes] = useState('');
  const [sendingReferral, setSendingReferral] = useState(false);

  // Referrals
  const [incomingReferrals, setIncomingReferrals] = useState<Referral[]>([]);
  const [sentReferrals, setSentReferrals] = useState<Referral[]>([]);

  // External referrals (from referrer agents)
  interface ExternalReferral {
    id: string;
    patientName: string;
    patientPhone: string;
    referrerName: string;
    referrerRole: string;
    bookingDate: string;
    bookingTime: string;
    status: string;
    createdAt: any;
  }
  const [externalReferrals, setExternalReferrals] = useState<ExternalReferral[]>([]);
  const [loadingExternal, setLoadingExternal] = useState(false);

  // Load toggle states from doctor doc
  useEffect(() => {
    if (!doctorId || !db) return;
    const loadToggles = async () => {
      try {
        const snap = await getDoc(doc(db!, 'doctors', doctorId));
        if (snap.exists()) {
          const data = snap.data();
          setSendingActive(data.referralSendingActive !== false);
          setAcceptingActive(data.referralAcceptingActive !== false);
        }
      } catch {} finally { setLoadingToggles(false); }
    };
    loadToggles();
  }, [doctorId]);

  // Real-time incoming referrals
  useEffect(() => {
    if (!doctorId || !db) return;
    const q = query(collection(db!, 'referrals'), where('toDoctorId', '==', doctorId), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setIncomingReferrals(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Referral[]);
    }, (err) => { console.error('Incoming referrals listener error:', err); });
    return unsub;
  }, [doctorId]);

  // Real-time sent referrals
  useEffect(() => {
    if (!doctorId || !db) return;
    const q = query(collection(db!, 'referrals'), where('fromDoctorId', '==', doctorId), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setSentReferrals(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Referral[]);
    }, (err) => { console.error('Sent referrals listener error:', err); });
    return unsub;
  }, [doctorId]);

  // Load external referrals (bookings with referrerId for this doctor)
  const loadExternalReferrals = async () => {
    if (!doctorId || !db) return;
    setLoadingExternal(true);
    try {
      const q = query(
        collection(db!, 'bookings'),
        where('doctorId', '==', doctorId),
        where('referrerId', '!=', null)
      );
      const snap = await getDocs(q);
      const refs = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          patientName: data.patientName || 'Patient',
          patientPhone: data.patientPhone || '',
          referrerName: data.referrerName || 'Unknown',
          referrerRole: data.referrerRole || 'Agent',
          bookingDate: data.appointmentDate || data.bookingDate || '',
          bookingTime: data.time || data.bookingTime || '',
          status: data.status || 'confirmed',
          createdAt: data.createdAt
        };
      });
      refs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setExternalReferrals(refs);
    } catch (err) {
      console.error('External referrals error:', err);
    } finally {
      setLoadingExternal(false);
    }
  };

  // Toggle accepting
  const toggleAccepting = async () => {
    if (!doctorId || !db) return;
    const newVal = !acceptingActive;
    setAcceptingActive(newVal);
    try {
      await updateDoc(doc(db!, 'doctors', doctorId), { referralAcceptingActive: newVal });
      toast.success(newVal ? 'Now accepting referrals' : 'Referral accepting turned off — you are hidden from search');
    } catch { toast.error('Failed to update'); setAcceptingActive(!newVal); }
  };

  // Toggle sending
  const toggleSending = async () => {
    if (!doctorId || !db) return;
    const newVal = !sendingActive;
    setSendingActive(newVal);
    try {
      await updateDoc(doc(db!, 'doctors', doctorId), { referralSendingActive: newVal });
      toast.success(newVal ? 'Sending referrals enabled' : 'Sending referrals disabled');
    } catch { toast.error('Failed to update'); setSendingActive(!newVal); }
  };

  // Search doctors
  const searchDoctors = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) { toast.error('Type at least 2 characters'); return; }
    setSearching(true);
    try {
      // Get all doctors, filter client-side by name (Firestore doesn't support text search)
      const snap = await getDocs(collection(db!, 'doctors'));
      const term = searchQuery.trim().toLowerCase();
      const results: DoctorResult[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (d.id === doctorId) return; // exclude self
        if (data.referralAcceptingActive === false) return; // hidden
        const name = (data.name || '').toLowerCase();
        const specs = (data.specialties || data.specialities || []).map((s: string) => s.toLowerCase());
        if (name.includes(term) || specs.some((s: string) => s.includes(term))) {
          results.push({
            id: d.id,
            name: data.name || 'Unknown',
            specialties: data.specialties || data.specialities || [],
            degrees: data.degrees || [],
            practisingPincodes: data.practisingPincodes || [],
            profileImage: data.profileImage,
            experience: data.experience,
          });
        }
      });
      setSearchResults(results);
      if (results.length === 0) toast('No doctors found matching your search');
    } catch (err) {
      console.error(err);
      toast.error('Search failed');
    } finally { setSearching(false); }
  };

  // Send referral
  const sendReferral = async () => {
    if (!selectedDoctor) return;
    if (!patientName.trim()) { toast.error('Patient name is required'); return; }
    setSendingReferral(true);
    try {
      // Get own specialty
      const myDoc = await getDoc(doc(db!, 'doctors', doctorId));
      const myData = myDoc.data() || {};
      const mySpecs = myData.specialties || myData.specialities || [];

      await addDoc(collection(db!, 'referrals'), {
        fromDoctorId: doctorId,
        fromDoctorName: doctorName || myData.name || 'Unknown',
        fromDoctorSpecialty: mySpecs[0] || 'General',
        toDoctorId: selectedDoctor.id,
        toDoctorName: selectedDoctor.name,
        toDoctorSpecialty: selectedDoctor.specialties[0] || 'General',
        patientName: patientName.trim(),
        patientAge: patientAge.trim(),
        patientGender,
        patientPhone: patientPhone.trim(),
        notes: referralNotes.trim(),
        status: 'sent',
        createdAt: serverTimestamp(),
      });
      toast.success(`Referral sent to Dr. ${selectedDoctor.name}`);
      setSelectedDoctor(null);
      setPatientName('');
      setPatientAge('');
      setPatientGender('Male');
      setPatientPhone('');
      setReferralNotes('');
      setSearchResults([]);
      setSearchQuery('');
      setActiveTab('sent');
    } catch (err) {
      console.error(err);
      toast.error('Failed to send referral');
    } finally { setSendingReferral(false); }
  };

  // Accept/Decline referral
  const updateReferralStatus = async (referralId: string, status: 'accepted' | 'declined' | 'completed') => {
    try {
      await updateDoc(doc(db!, 'referrals', referralId), { status, updatedAt: serverTimestamp() });
      toast.success(`Referral ${status}`);
    } catch { toast.error('Failed to update referral'); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      sent: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Sent' },
      accepted: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Accepted' },
      declined: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Declined' },
      completed: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Completed' }
    };
    const s = map[status] || map.sent;
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  const pendingIncoming = incomingReferrals.filter(r => r.status === 'sent').length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        doctorName={doctorName}
        onMenuChange={onMenuChange}
        onLogout={onLogout}
        activeMenu="referral-network"
        activeAddOns={activeAddOns}
      />

      <div className="transition-all duration-300 lg:ml-64">
        {/* Sticky Top Bar */}
        <div className="border-b border-zinc-800 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="px-4 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                <Menu className="w-6 h-6" />
              </button>
              <div className="hidden lg:block">
                <h1 className="text-white text-xl font-bold">Referral Network</h1>
                <p className="text-gray-400 text-sm mt-0.5">Refer patients to specialists and receive referrals from other doctors</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Title */}
        <div className="lg:hidden px-4 py-4 border-b border-zinc-800">
          <h1 className="text-white text-lg font-bold">Referral Network</h1>
          <p className="text-gray-400 text-xs mt-1">Refer patients to specialists and receive referrals from other doctors</p>
        </div>

        {/* Content */}
        <div className="px-4 lg:px-8 py-6 space-y-6">

          {/* Toggle Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-zinc-900/50 border-zinc-800 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Sending Referrals</p>
                  <p className="text-[10px] text-gray-500">Enable to search and refer patients to other doctors</p>
                </div>
                <button onClick={toggleSending} disabled={loadingToggles} className="focus:outline-none">
                  {sendingActive
                    ? <ToggleRight className="w-10 h-10 text-emerald-400" />
                    : <ToggleLeft className="w-10 h-10 text-zinc-600" />
                  }
                </button>
              </div>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Accepting Referrals</p>
                  <p className="text-[10px] text-gray-500">{acceptingActive ? 'Other doctors can find and refer patients to you' : 'You are hidden from referral search'}</p>
                </div>
                <button onClick={toggleAccepting} disabled={loadingToggles} className="focus:outline-none">
                  {acceptingActive
                    ? <ToggleRight className="w-10 h-10 text-emerald-400" />
                    : <ToggleLeft className="w-10 h-10 text-zinc-600" />
                  }
                </button>
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-zinc-900/50 rounded-xl p-1 border border-zinc-800">
            <button
              onClick={() => setActiveTab('send')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'send' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white'}`}
            >
              <Send className="w-4 h-4" /> Send Referral
            </button>
            <button
              onClick={() => setActiveTab('incoming')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'incoming' ? 'bg-amber-500/20 text-amber-400' : pendingIncoming > 0 ? 'text-amber-400 animate-pulse' : 'text-gray-400 hover:text-white'}`}
            >
              <Inbox className="w-4 h-4" /> Incoming {pendingIncoming > 0 ? `(${pendingIncoming})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'sent' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'}`}
            >
              <Clock className="w-4 h-4" /> Sent ({sentReferrals.length})
            </button>
            <button
              onClick={() => { setActiveTab('external'); loadExternalReferrals(); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'external' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'}`}
            >
              <Users className="w-4 h-4" /> External {externalReferrals.length > 0 ? `(${externalReferrals.length})` : ''}
            </button>
          </div>

          {/* SEND TAB */}
          {activeTab === 'send' && (
            <div className="space-y-4">
              {!sendingActive ? (
                <Card className="bg-zinc-900/50 border-zinc-800 p-8 text-center">
                  <ToggleLeft className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-gray-400">Sending referrals is turned off</p>
                  <p className="text-xs text-gray-600 mt-1">Enable the toggle above to search and refer patients</p>
                </Card>
              ) : selectedDoctor ? (
                /* Referral Form */
                <Card className="bg-zinc-900/50 border-zinc-800 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Refer Patient To</h3>
                    <button onClick={() => setSelectedDoctor(null)} className="p-1 hover:bg-zinc-800 rounded text-gray-400">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Selected Doctor Card */}
                  <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                      {selectedDoctor.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Dr. {selectedDoctor.name}</p>
                      <p className="text-[10px] text-gray-400">{selectedDoctor.specialties.join(', ') || 'General'} {selectedDoctor.degrees.length > 0 ? `• ${selectedDoctor.degrees.join(', ')}` : ''}</p>
                    </div>
                  </div>

                  {/* Patient Details */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-300">Patient Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-gray-500 text-[10px]">Patient Name *</Label>
                        <Input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Full Name" className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                      </div>
                      <div>
                        <Label className="text-gray-500 text-[10px]">Age</Label>
                        <Input value={patientAge} onChange={e => setPatientAge(e.target.value)} placeholder="e.g. 45" className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                      </div>
                      <div>
                        <Label className="text-gray-500 text-[10px]">Gender</Label>
                        <select value={patientGender} onChange={e => setPatientGender(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm mt-1">
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-gray-500 text-[10px]">Phone</Label>
                        <Input value={patientPhone} onChange={e => setPatientPhone(e.target.value)} placeholder="Mobile number" className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-[10px]">Referral Notes / Reason</Label>
                      <textarea
                        value={referralNotes}
                        onChange={e => setReferralNotes(e.target.value)}
                        placeholder="e.g. Chest pain on exertion, ECG normal, needs cardiology evaluation..."
                        rows={3}
                        className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm mt-1 resize-none"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={sendReferral}
                    disabled={sendingReferral || !patientName.trim()}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11"
                  >
                    {sendingReferral ? 'Sending...' : (
                      <><Send className="w-4 h-4 mr-2" /> Send Referral to Dr. {selectedDoctor.name}</>
                    )}
                  </Button>
                </Card>
              ) : (
                /* Search Doctors */
                <Card className="bg-zinc-900/50 border-zinc-800 p-6 space-y-4">
                  <h3 className="text-sm font-medium text-gray-300">Search Doctor by Name or Specialty</h3>
                  <div className="flex gap-2">
                    <Input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="e.g. Sharma, Cardiologist, ENT..."
                      className="bg-zinc-800 border-zinc-700 text-white flex-1"
                      onKeyDown={e => e.key === 'Enter' && searchDoctors()}
                    />
                    <Button onClick={searchDoctors} disabled={searching} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6">
                      {searching ? '...' : <><Search className="w-4 h-4 mr-2" /> Search</>}
                    </Button>
                  </div>

                  {/* Results */}
                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      <p className="text-xs text-gray-500">{searchResults.length} doctor(s) found</p>
                      {searchResults.map(dr => (
                        <button
                          key={dr.id}
                          onClick={() => setSelectedDoctor(dr)}
                          className="w-full flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 hover:border-emerald-500/30 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold text-sm">
                              {dr.profileImage ? (
                                <img src={dr.profileImage} alt="" className="w-10 h-10 rounded-full object-cover" />
                              ) : dr.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">Dr. {dr.name}</p>
                              <p className="text-[10px] text-gray-400">
                                {dr.specialties.join(', ') || 'General'}
                                {dr.degrees.length > 0 ? ` • ${dr.degrees.join(', ')}` : ''}
                                {dr.experience ? ` • ${dr.experience} yrs exp` : ''}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-500" />
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.length === 0 && !searching && (
                    <div className="text-center py-8">
                      <Search className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">Search for a doctor to send a referral</p>
                      <p className="text-[10px] text-gray-600 mt-1">Only doctors who have accepting enabled will appear</p>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* INCOMING TAB */}
          {activeTab === 'incoming' && (
            <div className="space-y-3">
              {!acceptingActive && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-400">
                  ⚠ Accepting is turned off — you won't receive new referrals. Turn it on to be visible.
                </div>
              )}

              {incomingReferrals.length === 0 ? (
                <Card className="bg-zinc-900/50 border-zinc-800 p-8 text-center">
                  <Inbox className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No incoming referrals yet</p>
                </Card>
              ) : (
                incomingReferrals.map(ref => (
                  <Card key={ref.id} className="bg-zinc-900/50 border-zinc-800 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white">From: Dr. {ref.fromDoctorName}</span>
                          <span className="text-[10px] text-gray-500">({ref.fromDoctorSpecialty})</span>
                          {statusBadge(ref.status)}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div><span className="text-gray-500">Patient:</span> <span className="text-white">{ref.patientName}</span></div>
                          {ref.patientAge && <div><span className="text-gray-500">Age:</span> <span className="text-white">{ref.patientAge}</span></div>}
                          <div><span className="text-gray-500">Gender:</span> <span className="text-white">{ref.patientGender}</span></div>
                          {ref.patientPhone && <div><span className="text-gray-500">Phone:</span> <span className="text-white">{ref.patientPhone}</span></div>}
                        </div>
                        {ref.notes && <p className="text-xs text-gray-400 bg-zinc-800/50 rounded p-2">{ref.notes}</p>}
                        {ref.createdAt?.toDate && (
                          <p className="text-[10px] text-gray-600">{ref.createdAt.toDate().toLocaleString('en-IN')}</p>
                        )}
                      </div>
                    </div>

                    {ref.status === 'sent' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-800">
                        <Button onClick={() => updateReferralStatus(ref.id, 'accepted')} size="sm" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-9">
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Accept
                        </Button>
                        <Button onClick={() => updateReferralStatus(ref.id, 'declined')} size="sm" variant="outline" className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-9">
                          <XCircle className="w-3.5 h-3.5 mr-1.5" /> Decline
                        </Button>
                      </div>
                    )}

                    {ref.status === 'accepted' && (
                      <div className="mt-3 pt-3 border-t border-zinc-800">
                        <Button onClick={() => updateReferralStatus(ref.id, 'completed')} size="sm" className="w-full bg-purple-500 hover:bg-purple-600 text-white h-9">
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Mark as Completed
                        </Button>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}

          {/* SENT TAB */}
          {activeTab === 'sent' && (
            <div className="space-y-3">
              {sentReferrals.length === 0 ? (
                <Card className="bg-zinc-900/50 border-zinc-800 p-8 text-center">
                  <Send className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No referrals sent yet</p>
                </Card>
              ) : (
                sentReferrals.map(ref => (
                  <Card key={ref.id} className="bg-zinc-900/50 border-zinc-800 p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">To: Dr. {ref.toDoctorName}</span>
                        <span className="text-[10px] text-gray-500">({ref.toDoctorSpecialty})</span>
                        {statusBadge(ref.status)}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div><span className="text-gray-500">Patient:</span> <span className="text-white">{ref.patientName}</span></div>
                        {ref.patientAge && <div><span className="text-gray-500">Age:</span> <span className="text-white">{ref.patientAge}</span></div>}
                        <div><span className="text-gray-500">Gender:</span> <span className="text-white">{ref.patientGender}</span></div>
                        {ref.patientPhone && <div><span className="text-gray-500">Phone:</span> <span className="text-white">{ref.patientPhone}</span></div>}
                      </div>
                      {ref.notes && <p className="text-xs text-gray-400 bg-zinc-800/50 rounded p-2">{ref.notes}</p>}
                      {ref.createdAt?.toDate && (
                        <p className="text-[10px] text-gray-600">{ref.createdAt.toDate().toLocaleString('en-IN')}</p>
                      )}
                      {ref.status === 'accepted' && (
                        <p className="text-xs text-emerald-400 mt-1">✓ Dr. {ref.toDoctorName} has accepted — patient can visit</p>
                      )}
                      {ref.status === 'completed' && (
                        <p className="text-xs text-purple-400 mt-1">✓ Consultation completed at Dr. {ref.toDoctorName}'s chamber</p>
                      )}
                      {ref.status === 'declined' && (
                        <p className="text-xs text-red-400 mt-1">✗ Dr. {ref.toDoctorName} has declined this referral</p>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* EXTERNAL REFERRALS TAB */}
          {activeTab === 'external' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Patients referred to you by pharmacists, receptionists & other agents via referral links</p>
              {loadingExternal ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : externalReferrals.length === 0 ? (
                <Card className="bg-zinc-900/50 border-zinc-800 p-8 text-center">
                  <Users className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No external referrals yet</p>
                  <p className="text-xs text-gray-600 mt-1">Share your referral link from the Dashboard share button to get started</p>
                </Card>
              ) : (
                externalReferrals.map(ref => (
                  <Card key={ref.id} className="bg-zinc-900/50 border-zinc-800 p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{ref.patientName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          ref.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                          ref.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                          ref.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                          'bg-zinc-800 text-gray-400'
                        }`}>
                          {ref.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px]">Ref: {ref.referrerName} ({ref.referrerRole})</span>
                        {ref.bookingDate && <span className="text-gray-500">{ref.bookingDate}</span>}
                        {ref.bookingTime && <span className="text-gray-500">{ref.bookingTime}</span>}
                      </div>
                      {ref.patientPhone && <p className="text-xs text-gray-500">{ref.patientPhone}</p>}
                      {ref.createdAt?.toDate && (
                        <p className="text-[10px] text-gray-600">{ref.createdAt.toDate().toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
