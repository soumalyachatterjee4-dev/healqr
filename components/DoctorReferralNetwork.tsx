import { useState, useEffect } from 'react';
import { Search, Send, Inbox, X, Clock, CheckCircle, XCircle, User, ArrowRight, Menu, Users, CalendarDays, Eye, Share2, UserPlus } from 'lucide-react';
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

interface ExternalReferral {
  id: string;
  patientName: string;
  patientPhone: string;
  referrerId: string;
  referrerName: string;
  referrerRole: string;
  referrerOrganization: string;
  referrerPhone: string;
  bookingDate: string;
  bookingTime: string;
  status: string;
  isMarkedSeen: boolean;
  referrerSeen: boolean;
  createdAt: any;
  markedSeenAt?: any;
}

export default function DoctorReferralNetwork({ doctorName, email, onLogout, onMenuChange, activeAddOns }: DoctorReferralNetworkProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const doctorId = auth?.currentUser?.uid || '';

  // Tab: 'sent' | 'received' | 'referrers'
  const [activeTab, setActiveTab] = useState<'sent' | 'received' | 'referrers'>('sent');

  // Date filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Doctor search for sending referrals
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DoctorResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorResult | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [patientPhone, setPatientPhone] = useState('');
  const [referralNotes, setReferralNotes] = useState('');
  const [sendingReferral, setSendingReferral] = useState(false);
  const [showSendForm, setShowSendForm] = useState(true);

  // Referrals data
  const [sentReferrals, setSentReferrals] = useState<Referral[]>([]);
  const [receivedReferrals, setReceivedReferrals] = useState<Referral[]>([]);
  const [externalReferrals, setExternalReferrals] = useState<ExternalReferral[]>([]);
  const [loadingExternal, setLoadingExternal] = useState(false);

  // Referrer details modal
  const [showReferrerModal, setShowReferrerModal] = useState(false);
  const [selectedReferrer, setSelectedReferrer] = useState<ExternalReferral | null>(null);

  // Real-time sent referrals
  useEffect(() => {
    if (!doctorId || !db) return;
    const q = query(collection(db!, 'referrals'), where('fromDoctorId', '==', doctorId), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setSentReferrals(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Referral[]);
    }, (err) => { console.error('Sent referrals error:', err); });
    return unsub;
  }, [doctorId]);

  // Real-time received referrals
  useEffect(() => {
    if (!doctorId || !db) return;
    const q = query(collection(db!, 'referrals'), where('toDoctorId', '==', doctorId), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setReceivedReferrals(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Referral[]);
    }, (err) => { console.error('Received referrals error:', err); });
    return unsub;
  }, [doctorId]);

  // Load external referrals (patients referred via referrer agents)
  const loadExternalReferrals = async () => {
    if (!doctorId || !db) return;
    setLoadingExternal(true);
    try {
      // Get bookings with referrerId that have been marked seen
      const q = query(
        collection(db!, 'bookings'),
        where('doctorId', '==', doctorId),
        where('referrerId', '!=', null)
      );
      const snap = await getDocs(q);
      const refs: ExternalReferral[] = [];

      for (const d of snap.docs) {
        const data = d.data();
        // Fetch referrer details
        let referrerOrg = '';
        let referrerPhone = '';
        if (data.referrerId) {
          try {
            const refDoc = await getDoc(doc(db!, 'referrers', data.referrerId));
            if (refDoc.exists()) {
              referrerOrg = refDoc.data().organization || '';
              referrerPhone = refDoc.data().phone || '';
            }
          } catch {}
        }

        refs.push({
          id: d.id,
          patientName: data.patientName || 'Patient',
          patientPhone: data.patientPhone || '',
          referrerId: data.referrerId || '',
          referrerName: data.referrerName || 'Unknown',
          referrerRole: data.referrerRole || 'Agent',
          referrerOrganization: referrerOrg,
          referrerPhone,
          bookingDate: data.appointmentDate || data.bookingDate || '',
          bookingTime: data.time || data.bookingTime || '',
          status: data.status || 'confirmed',
          isMarkedSeen: data.isMarkedSeen || false,
          referrerSeen: data.referrerSeen || false,
          createdAt: data.createdAt,
          markedSeenAt: data.markedSeenAt,
        });
      }

      refs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setExternalReferrals(refs);
    } catch (err) {
      console.error('External referrals error:', err);
    } finally {
      setLoadingExternal(false);
    }
  };

  // Trigger external referrals load when tab is selected
  useEffect(() => {
    if (activeTab === 'referrers') loadExternalReferrals();
  }, [activeTab]);

  // Date filter helper
  const filterByDate = <T extends { createdAt: any }>(items: T[]): T[] => {
    if (!dateFrom && !dateTo) return items;
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
    return items.filter(item => {
      const d = item.createdAt?.toDate?.();
      if (!d) return true;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  };

  // Search doctors
  const searchDoctors = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) { toast.error('Type at least 2 characters'); return; }
    if (!db) return;
    setSearching(true);
    try {
      const snap = await getDocs(collection(db!, 'doctors'));
      const term = searchQuery.trim().toLowerCase();
      const results: DoctorResult[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (d.id === doctorId) return;
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
      if (results.length === 0) toast('No doctors found');
    } catch (err) {
      console.error(err);
      toast.error('Search failed');
    } finally { setSearching(false); }
  };

  // Send referral
  const sendReferral = async () => {
    if (!selectedDoctor) return;
    if (!patientName.trim()) { toast.error('Patient name is required'); return; }
    if (!db) return;
    setSendingReferral(true);
    try {
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
    } catch (err) {
      console.error(err);
      toast.error('Failed to send referral');
    } finally { setSendingReferral(false); }
  };

  // Update referral status
  const updateReferralStatus = async (referralId: string, status: 'accepted' | 'declined' | 'completed') => {
    if (!db) return;
    try {
      await updateDoc(doc(db!, 'referrals', referralId), { status, updatedAt: serverTimestamp() });
      toast.success(`Referral ${status}`);
    } catch { toast.error('Failed to update'); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      sent: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Sent' },
      accepted: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Accepted' },
      declined: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Declined' },
      completed: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Completed' },
      confirmed: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Booked' },
    };
    const s = map[status] || map.sent;
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  const getRegistrationQRUrl = () => `${window.location.origin}/?page=referrer-register`;

  const pendingReceived = receivedReferrals.filter(r => r.status === 'sent').length;
  const filteredSent = filterByDate(sentReferrals);
  const filteredReceived = filterByDate(receivedReferrals);
  const filteredExternal = filterByDate(externalReferrals);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
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
              <div>
                <h1 className="text-white text-xl font-bold">Referral Network</h1>
                <p className="text-gray-400 text-sm mt-0.5">Send, receive referrals & track referrer agents</p>
              </div>
            </div>
            {/* Referrer Registration link */}
            <Button
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(getRegistrationQRUrl());
                toast.success('Referrer registration link copied!');
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
            >
              <UserPlus className="w-3 h-3 mr-1" /> Invite Referrer
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 lg:px-8 py-6 space-y-6">

          {/* 3 Tabs */}
          <div className="flex gap-1 bg-zinc-900/50 rounded-xl p-1 border border-zinc-800">
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'sent' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'}`}
            >
              <Send className="w-4 h-4" /> <span className="hidden sm:inline">Sent</span> ({sentReferrals.length})
            </button>
            <button
              onClick={() => setActiveTab('received')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'received' ? 'bg-amber-500/20 text-amber-400' : pendingReceived > 0 ? 'text-amber-400 animate-pulse' : 'text-gray-400 hover:text-white'}`}
            >
              <Inbox className="w-4 h-4" /> <span className="hidden sm:inline">Received</span> {pendingReceived > 0 ? `(${pendingReceived})` : `(${receivedReferrals.length})`}
            </button>
            <button
              onClick={() => setActiveTab('referrers')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'referrers' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'}`}
            >
              <Users className="w-4 h-4" /> <span className="hidden sm:inline">Via Referrers</span> ({externalReferrals.length})
            </button>
          </div>

          {/* Date Filter — shared across all tabs */}
          <Card className="bg-zinc-900/50 border-zinc-800 p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white text-xs h-9 flex-1"
                />
                <span className="text-gray-500 text-xs">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white text-xs h-9 flex-1"
                />
              </div>
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-gray-500 text-xs hover:text-white">
                  Clear
                </button>
              )}
            </div>
          </Card>

          {/* ==================== TAB 1: SENT ==================== */}
          {activeTab === 'sent' && (
            <div className="space-y-4">
              {/* Send new referral toggle */}
              <Button
                onClick={() => setShowSendForm(!showSendForm)}
                variant="outline"
                className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-sm"
              >
                <Send className="w-4 h-4 mr-2" /> {showSendForm ? 'Hide Send Form' : 'Send New Referral'}
              </Button>

              {showSendForm && (
                selectedDoctor ? (
                  /* Referral Form */
                  <Card className="bg-zinc-900/50 border-zinc-800 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">Refer Patient To</h3>
                      <button onClick={() => setSelectedDoctor(null)} className="p-1 hover:bg-zinc-800 rounded text-gray-400">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                        {selectedDoctor.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Dr. {selectedDoctor.name}</p>
                        <p className="text-[10px] text-gray-400">{selectedDoctor.specialties.join(', ') || 'General'}</p>
                      </div>
                    </div>

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
                        <Label className="text-gray-500 text-[10px]">Referral Notes</Label>
                        <textarea
                          value={referralNotes}
                          onChange={e => setReferralNotes(e.target.value)}
                          placeholder="Reason for referral..."
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
                      {sendingReferral ? 'Sending...' : <><Send className="w-4 h-4 mr-2" /> Send Referral</>}
                    </Button>
                  </Card>
                ) : (
                  /* Search Doctors */
                  <Card className="bg-zinc-900/50 border-zinc-800 p-6 space-y-4">
                    <h3 className="text-sm font-medium text-gray-300">Search Doctor</h3>
                    <div className="flex gap-2">
                      <Input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="e.g. Sharma, Cardiologist..."
                        className="bg-zinc-800 border-zinc-700 text-white flex-1"
                        onKeyDown={e => e.key === 'Enter' && searchDoctors()}
                      />
                      <Button onClick={searchDoctors} disabled={searching} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6">
                        {searching ? '...' : <><Search className="w-4 h-4 mr-2" /> Search</>}
                      </Button>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
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
                                <p className="text-[10px] text-gray-400">{dr.specialties.join(', ') || 'General'}</p>
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-500" />
                          </button>
                        ))}
                      </div>
                    )}
                  </Card>
                )
              )}

              {/* Sent History */}
              <div className="space-y-3">
                <p className="text-xs text-gray-500">{filteredSent.length} sent referral{filteredSent.length !== 1 ? 's' : ''}</p>
                {filteredSent.length === 0 ? (
                  <Card className="bg-zinc-900/50 border-zinc-800 p-8 text-center">
                    <Send className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No sent referrals</p>
                  </Card>
                ) : (
                  filteredSent.map(ref => (
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
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 2: RECEIVED ==================== */}
          {activeTab === 'received' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">{filteredReceived.length} received referral{filteredReceived.length !== 1 ? 's' : ''}</p>
              {filteredReceived.length === 0 ? (
                <Card className="bg-zinc-900/50 border-zinc-800 p-8 text-center">
                  <Inbox className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No incoming referrals</p>
                </Card>
              ) : (
                filteredReceived.map(ref => (
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
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Mark Completed
                        </Button>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}

          {/* ==================== TAB 3: VIA REFERRERS ==================== */}
          {activeTab === 'referrers' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Patients referred to you by external referrers (pharmacists, agents, etc.)
                {filteredExternal.length > 0 ? ` — ${filteredExternal.length} record${filteredExternal.length !== 1 ? 's' : ''}` : ''}
              </p>

              {loadingExternal ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : filteredExternal.length === 0 ? (
                <Card className="bg-zinc-900/50 border-zinc-800 p-8 text-center">
                  <Users className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No referred patients yet</p>
                  <p className="text-xs text-gray-600 mt-1">Invite referrers to start receiving patient referrals</p>
                </Card>
              ) : (
                filteredExternal.map(ref => (
                  <Card key={ref.id} className="bg-zinc-900/50 border-zinc-800 p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{ref.patientName}</span>
                        <div className="flex items-center gap-2">
                          {ref.isMarkedSeen && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium flex items-center gap-1">
                              <Eye className="w-3 h-3" /> Seen
                            </span>
                          )}
                          {statusBadge(ref.status)}
                        </div>
                      </div>

                      {/* Referrer badge — tap for full details */}
                      <button
                        onClick={() => { setSelectedReferrer(ref); setShowReferrerModal(true); }}
                        className="flex items-center gap-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors w-full text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <Users className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-purple-300 font-medium truncate">Ref: {ref.referrerName} ({ref.referrerRole})</p>
                          {ref.referrerOrganization && <p className="text-[10px] text-purple-400/60 truncate">{ref.referrerOrganization}</p>}
                        </div>
                        <ArrowRight className="w-3 h-3 text-purple-400/50 flex-shrink-0" />
                      </button>

                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {ref.bookingDate && <span>{ref.bookingDate}</span>}
                        {ref.bookingTime && <span>{ref.bookingTime}</span>}
                        {ref.patientPhone && <span>{ref.patientPhone}</span>}
                      </div>

                      {ref.markedSeenAt?.toDate && (
                        <p className="text-[10px] text-emerald-400/70">✓ Consultation done on {ref.markedSeenAt.toDate().toLocaleDateString('en-IN')}</p>
                      )}
                      {ref.createdAt?.toDate && (
                        <p className="text-[10px] text-gray-600">Booked: {ref.createdAt.toDate().toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Referrer Details Modal */}
      {showReferrerModal && selectedReferrer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowReferrerModal(false)}>
          <Card className="bg-zinc-900 border-zinc-700 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold">Referrer Details</h3>
                <button onClick={() => setShowReferrerModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{selectedReferrer.referrerName}</p>
                    <p className="text-purple-400 text-xs">{selectedReferrer.referrerRole}</p>
                  </div>
                </div>

                <div className="space-y-2 bg-zinc-800/50 rounded-lg p-3">
                  {selectedReferrer.referrerOrganization && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Organization</span>
                      <span className="text-white">{selectedReferrer.referrerOrganization}</span>
                    </div>
                  )}
                  {selectedReferrer.referrerPhone && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Phone</span>
                      <span className="text-white">{selectedReferrer.referrerPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Patient</span>
                    <span className="text-white">{selectedReferrer.patientName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Booking Date</span>
                    <span className="text-white">{selectedReferrer.bookingDate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Status</span>
                    <span className="text-white">{selectedReferrer.isMarkedSeen ? 'Consultation Done' : selectedReferrer.status}</span>
                  </div>
                </div>
              </div>

              <Button onClick={() => setShowReferrerModal(false)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
