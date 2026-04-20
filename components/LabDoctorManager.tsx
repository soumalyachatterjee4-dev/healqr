import { useState, useEffect, useMemo } from 'react';
import {
  UserPlus, Search, Pencil, Trash2, X, Check,
  Stethoscope, Phone, Mail, MapPin, Hash, Link2,
  TrendingUp, Calendar, ChevronDown, ChevronUp,
  Loader2, Copy, Trophy, Filter, Award,
} from 'lucide-react';
import { db } from '../lib/firebase/config';
import {
  doc, getDoc, updateDoc, serverTimestamp,
  collection, query, where, getDocs,
} from 'firebase/firestore';
import { toast } from 'sonner';

/* ───────── Types ───────── */
interface LinkedDoctor {
  uid: string;
  name: string;
  phone: string;
  email?: string;
  specialty?: string;
  specialties?: string[];
  degrees?: string[];
  doctorCode?: string;
  clinic?: string;
  pinCode?: string;
  qrNumber?: string;
  status: 'active' | 'inactive';
  addedAt: string;
  notes?: string;
  source: 'system' | 'manual';
}

interface ReferralStats {
  doctorUid: string;
  totalReferrals: number;
  lastReferralDate: string | null;
  thisMonthCount: number;
}

interface SystemDoctor {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  specialty?: string;
  specialties?: string[];
  specialities?: string[];
  degrees?: string[];
  doctorCode?: string;
  pinCode?: string;
  residentialPincode?: string;
  qrNumber?: string;
  experience?: string;
  profileImage?: string;
}

/* ───────── Component ───────── */
export default function LabDoctorManager({ labId }: { labId: string }) {
  const [doctors, setDoctors] = useState<LinkedDoctor[]>([]);
  const [referralStats, setReferralStats] = useState<Record<string, ReferralStats>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add doctor modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<'link' | 'manual'>('link');

  // Link flow: step 1 = search, step 2 = link
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SystemDoctor[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [linkCode, setLinkCode] = useState('');
  const [linking, setLinking] = useState(false);

  // Manual form
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', specialty: '',
    doctorCode: '', clinic: '', pinCode: '', notes: '',
  });

  // Edit
  const [editingDoctor, setEditingDoctor] = useState<LinkedDoctor | null>(null);

  // Filters on main page
  const [showFilters, setShowFilters] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterDegree, setFilterDegree] = useState('');
  const [filterPincode, setFilterPincode] = useState('');

  // UI
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!labId) { setLoading(false); return; }
    loadDoctors();
  }, [labId]);

  /* ───────── Data loading ───────── */
  const loadDoctors = async () => {
    try {
      const labRef = doc(db, 'labs', labId);
      const snap = await getDoc(labRef);
      if (snap.exists()) {
        const data = snap.data();
        const linked: LinkedDoctor[] = data.linkedDoctors || [];
        setDoctors(linked);
        await loadReferralStats(linked);
      }
    } catch (err) {
      console.error('Error loading doctors:', err);
      toast.error('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  const loadReferralStats = async (doctorList: LinkedDoctor[]) => {
    if (doctorList.length === 0) return;
    try {
      const q = query(collection(db, 'labBookings'), where('labId', '==', labId));
      const snap = await getDocs(q);

      const now = new Date();
      const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const statsMap: Record<string, ReferralStats> = {};

      snap.docs.forEach((d) => {
        const data = d.data();
        const refDoc = data.referringDoctor?.trim()?.toLowerCase();
        if (!refDoc) return;

        const matchedDoctor = doctorList.find(
          (doc) => doc.name.toLowerCase().trim() === refDoc
        );
        if (!matchedDoctor) return;

        if (!statsMap[matchedDoctor.uid]) {
          statsMap[matchedDoctor.uid] = {
            doctorUid: matchedDoctor.uid,
            totalReferrals: 0,
            lastReferralDate: null,
            thisMonthCount: 0,
          };
        }

        const s = statsMap[matchedDoctor.uid];
        s.totalReferrals++;
        const bookDate = data.bookingDate || '';
        if (bookDate > (s.lastReferralDate || '')) s.lastReferralDate = bookDate;
        if (bookDate.startsWith(thisMonthStr)) s.thisMonthCount++;
      });

      setReferralStats(statsMap);
    } catch (err) {
      console.error('Error loading referral stats:', err);
    }
  };

  const saveDoctors = async (updatedDoctors: LinkedDoctor[]) => {
    setSaving(true);
    try {
      const labRef = doc(db, 'labs', labId);
      await updateDoc(labRef, {
        linkedDoctors: updatedDoctors,
        updatedAt: serverTimestamp(),
      });
      setDoctors(updatedDoctors);
      await loadReferralStats(updatedDoctors);
      toast.success('Doctors updated');
    } catch (err) {
      console.error('Error saving doctors:', err);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  /* ───────── Search system doctors ───────── */
  const handleSearchSystem = async () => {
    const term = searchTerm.trim();
    if (!term) { toast.error('Enter a name, code, or specialty'); return; }

    setSearchLoading(true);
    setSearchResults([]);
    setHasSearched(true);
    try {
      // Try exact doctorCode match first
      const codeUpper = term.toUpperCase();
      const codeQ = query(collection(db, 'doctors'), where('doctorCode', '==', codeUpper));
      const codeSnap = await getDocs(codeQ);

      if (!codeSnap.empty) {
        setSearchResults(codeSnap.docs.map(d => ({ id: d.id, ...d.data() } as SystemDoctor)));
        setSearchLoading(false);
        return;
      }

      // Fallback: full scan with client-side filter by name/specialty/pincode
      const allQ = query(collection(db, 'doctors'));
      const allSnap = await getDocs(allQ);
      const termLower = term.toLowerCase();

      const results = allSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as SystemDoctor))
        .filter(d => {
          const nameMatch = d.name?.toLowerCase().includes(termLower);
          const specMatch = (d.specialties || d.specialities || []).some(
            (s: string) => s.toLowerCase().includes(termLower)
          );
          const pinMatch = (d.pinCode || d.residentialPincode || '').includes(term);
          const codeMatch = d.doctorCode?.toLowerCase().includes(termLower);
          return nameMatch || specMatch || pinMatch || codeMatch;
        })
        .slice(0, 20);

      setSearchResults(results);
      if (results.length === 0) toast.info('No doctors found');
    } catch (err) {
      console.error('Error searching:', err);
      toast.error('Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Code copied!');
  };

  /* ───────── Link doctor by code ───────── */
  const handleLinkByCode = async () => {
    const code = linkCode.trim().toUpperCase();
    if (!code) { toast.error('Paste a doctor code first'); return; }

    if (doctors.some(d => d.doctorCode === code)) {
      toast.error('This doctor is already linked');
      return;
    }

    setLinking(true);
    try {
      const q = query(collection(db, 'doctors'), where('doctorCode', '==', code));
      const snap = await getDocs(q);

      if (snap.empty) {
        toast.error('No doctor found with this code');
        setLinking(false);
        return;
      }

      const docData = snap.docs[0];
      const d = docData.data();

      const newDoctor: LinkedDoctor = {
        uid: docData.id,
        name: d.name || '',
        phone: d.phone || '',
        email: d.email || undefined,
        specialty: d.specialty || (d.specialties?.[0]) || (d.specialities?.[0]) || undefined,
        specialties: d.specialties || d.specialities || (d.specialty ? [d.specialty] : undefined),
        degrees: d.degrees || undefined,
        doctorCode: d.doctorCode || undefined,
        pinCode: d.pinCode || d.residentialPincode || undefined,
        qrNumber: d.qrNumber || undefined,
        status: 'active',
        addedAt: new Date().toISOString(),
        source: 'system',
      };

      if (doctors.some(dd => dd.uid === newDoctor.uid)) {
        toast.error('This doctor is already linked');
        setLinking(false);
        return;
      }

      await saveDoctors([...doctors, newDoctor]);
      setLinkCode('');
      setShowAddModal(false);
      resetAddForm();
    } catch (err) {
      console.error('Error linking:', err);
      toast.error('Failed to link doctor');
    } finally {
      setLinking(false);
    }
  };

  /* ───────── Manual add / edit ───────── */
  const handleSaveManual = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    if (doctors.some(d => d.phone === formData.phone.trim() && d.uid !== editingDoctor?.uid)) {
      toast.error('Doctor with this phone already exists');
      return;
    }

    const newDoctor: LinkedDoctor = {
      uid: editingDoctor?.uid || `dr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      specialty: formData.specialty.trim() || undefined,
      doctorCode: formData.doctorCode.trim() || undefined,
      clinic: formData.clinic.trim() || undefined,
      pinCode: formData.pinCode.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      status: 'active',
      addedAt: editingDoctor?.addedAt || new Date().toISOString(),
      source: editingDoctor?.source || 'manual',
    };

    let updated: LinkedDoctor[];
    if (editingDoctor) {
      updated = doctors.map(d => d.uid === editingDoctor.uid ? newDoctor : d);
    } else {
      updated = [...doctors, newDoctor];
    }

    await saveDoctors(updated);
    setShowAddModal(false);
    resetAddForm();
  };

  const handleDelete = async (uid: string) => {
    await saveDoctors(doctors.filter(d => d.uid !== uid));
    setDeletingId(null);
  };

  const startEdit = (doctor: LinkedDoctor) => {
    setEditingDoctor(doctor);
    setAddMode('manual');
    setFormData({
      name: doctor.name,
      phone: doctor.phone,
      email: doctor.email || '',
      specialty: doctor.specialty || '',
      doctorCode: doctor.doctorCode || '',
      clinic: doctor.clinic || '',
      pinCode: doctor.pinCode || '',
      notes: doctor.notes || '',
    });
    setShowAddModal(true);
  };

  const resetAddForm = () => {
    setEditingDoctor(null);
    setAddMode('link');
    setSearchTerm('');
    setSearchResults([]);
    setHasSearched(false);
    setLinkCode('');
    setFormData({ name: '', phone: '', email: '', specialty: '', doctorCode: '', clinic: '', pinCode: '', notes: '' });
  };

  /* ───────── Computed data ───────── */

  // Top 5 referrers this month
  const top5Referrers = useMemo(() => {
    return doctors
      .map(d => ({ ...d, monthRefs: referralStats[d.uid]?.thisMonthCount || 0, totalRefs: referralStats[d.uid]?.totalReferrals || 0 }))
      .filter(d => d.monthRefs > 0 || d.totalRefs > 0)
      .sort((a, b) => b.monthRefs - a.monthRefs || b.totalRefs - a.totalRefs)
      .slice(0, 5);
  }, [doctors, referralStats]);

  // Filtered doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter(d => {
      if (filterName && !d.name.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterSpecialty) {
        const specs = (d.specialties || (d.specialty ? [d.specialty] : [])).map(s => s.toLowerCase());
        if (!specs.some(s => s.includes(filterSpecialty.toLowerCase()))) return false;
      }
      if (filterDegree) {
        const degs = (d.degrees || []).map(dg => dg.toLowerCase());
        if (!degs.some(dg => dg.includes(filterDegree.toLowerCase()))) return false;
      }
      if (filterPincode && !(d.pinCode || '').includes(filterPincode)) return false;
      return true;
    });
  }, [doctors, filterName, filterSpecialty, filterDegree, filterPincode]);

  const hasActiveFilters = filterName || filterSpecialty || filterDegree || filterPincode;

  /* ───────── Render ───────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wider leading-tight">Total</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-white">{doctors.length}</p>
        </div>
        <div className="bg-emerald-500/10 border border-zinc-800 rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wider leading-tight">Active</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-emerald-400">{doctors.filter(d => d.status === 'active').length}</p>
        </div>
        <div className="bg-purple-500/10 border border-zinc-800 rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wider leading-tight">Referring</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-purple-400">
            {Object.values(referralStats).filter(s => s.thisMonthCount > 0).length}
          </p>
        </div>
        <div className="bg-blue-500/10 border border-zinc-800 rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wider leading-tight">Referrals</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-blue-400">
            {Object.values(referralStats).reduce((sum, s) => sum + s.totalReferrals, 0)}
          </p>
        </div>
      </div>

      {/* ══════ ADD DOCTOR MODAL ══════ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-6 sm:pt-16 px-3 sm:px-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl max-h-[88vh] overflow-y-auto mb-6">
            {/* Modal Header */}
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
              <h3 className="text-white font-semibold text-sm">
                {editingDoctor ? `Edit: Dr. ${editingDoctor.name}` : 'Add Doctor'}
              </h3>
              <button onClick={() => { setShowAddModal(false); resetAddForm(); }} className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Mode Tabs */}
              {!editingDoctor && (
                <div className="flex gap-1 bg-zinc-800 rounded-lg p-1 w-full sm:w-fit">
                  <button
                    onClick={() => setAddMode('link')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all ${
                      addMode === 'link' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5" /> Link Existing Doctor
                  </button>
                  <button
                    onClick={() => setAddMode('manual')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all ${
                      addMode === 'manual' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Add Manually
                  </button>
                </div>
              )}

              {/* ── LINK MODE ── */}
              {addMode === 'link' && !editingDoctor && (
                <div className="space-y-4">
                  {/* Step 1: Search */}
                  <div>
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">Step 1 — Search Doctor</p>
                    <div className="flex gap-2">
                      <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Name, code, specialty, pincode..."
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchSystem()}
                      />
                      <button
                        onClick={handleSearchSystem}
                        disabled={searchLoading}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
                      >
                        {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Search
                      </button>
                    </div>
                  </div>

                  {/* Search Results */}
                  {hasSearched && (
                    <div className="space-y-2">
                      {searchResults.length === 0 ? (
                        <p className="text-zinc-500 text-sm text-center py-4">No doctors found. Try a different search.</p>
                      ) : (
                        <>
                          <p className="text-[11px] text-zinc-500 uppercase tracking-wider">
                            Found {searchResults.length} doctor{searchResults.length !== 1 ? 's' : ''}
                          </p>
                          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                            {searchResults.map((dr) => {
                              const specs = dr.specialties || dr.specialities || [];
                              const degs = dr.degrees || [];
                              const pin = dr.pinCode || dr.residentialPincode || '';
                              const code = dr.doctorCode || '';
                              const alreadyLinked = doctors.some(d => d.uid === dr.id || d.doctorCode === code);

                              return (
                                <div key={dr.id} className={`bg-zinc-800 border rounded-lg p-3 space-y-2 ${alreadyLinked ? 'border-emerald-500/30' : 'border-zinc-700'}`}>
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-white font-semibold text-sm">Dr. {dr.name}</span>
                                        {alreadyLinked && (
                                          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">Already Linked</span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-400">
                                        {specs.length > 0 && (
                                          <span className="flex items-center gap-1">
                                            <Stethoscope className="w-3 h-3 text-purple-400" />
                                            {specs.join(', ')}
                                          </span>
                                        )}
                                        {degs.length > 0 && (
                                          <span className="flex items-center gap-1">
                                            <Award className="w-3 h-3 text-blue-400" />
                                            {degs.join(', ')}
                                          </span>
                                        )}
                                        {pin && (
                                          <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-orange-400" />
                                            {pin}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {/* Doctor Code + Copy & Use */}
                                  {code && (
                                    <div className="flex items-center gap-2 bg-zinc-900 rounded-md px-2.5 py-1.5">
                                      <Hash className="w-3 h-3 text-purple-400 shrink-0" />
                                      <span className="text-purple-400 font-mono text-[11px] flex-1 truncate">{code}</span>
                                      <button
                                        onClick={() => {
                                          copyToClipboard(code);
                                          setLinkCode(code);
                                        }}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[10px] rounded font-medium transition-colors shrink-0"
                                      >
                                        <Copy className="w-3 h-3" /> Copy & Use
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Step 2: Link */}
                  <div className="border-t border-zinc-800 pt-3">
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">Step 2 — Paste Code & Link</p>
                    <div className="flex gap-2">
                      <input
                        value={linkCode}
                        onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                        placeholder="HQR-XXXXXX-XXXX-DR"
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 font-mono"
                        onKeyDown={(e) => e.key === 'Enter' && handleLinkByCode()}
                      />
                      <button
                        onClick={handleLinkByCode}
                        disabled={linking || !linkCode.trim()}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
                      >
                        {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                        Link
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── MANUAL MODE / EDIT ── */}
              {(addMode === 'manual' || editingDoctor) && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Doctor Name *</label>
                      <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Dr. Name" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Phone *</label>
                      <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91XXXXXXXXXX" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Email</label>
                      <input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="doctor@email.com" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Specialty</label>
                      <input value={formData.specialty} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                        placeholder="e.g. General Medicine" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Clinic / Hospital</label>
                      <input value={formData.clinic} onChange={(e) => setFormData({ ...formData, clinic: e.target.value })}
                        placeholder="Clinic name" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Pincode</label>
                      <input value={formData.pinCode} onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                        placeholder="6-digit" maxLength={6} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-zinc-500 mb-1 block">Notes</label>
                      <input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Optional notes..." className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleSaveManual} disabled={saving}
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50">
                      {saving ? 'Saving...' : editingDoctor ? 'Save Changes' : 'Add Doctor'}
                    </button>
                    <button onClick={() => { setShowAddModal(false); resetAddForm(); }}
                      className="px-5 py-2.5 bg-zinc-800 text-zinc-400 text-sm rounded-lg hover:text-white transition-colors">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════ TOP 5 REFERRERS ══════ */}
      {top5Referrers.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-400" /> Top Referring Doctors This Month
          </h3>
          <div className="space-y-2.5">
            {top5Referrers.map((dr, idx) => (
              <div key={dr.uid} className="flex items-center gap-3 bg-zinc-800/50 rounded-lg px-4 py-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                  idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                  idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                  'bg-zinc-700 text-zinc-400'
                }`}>
                  #{idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">Dr. {dr.name}</p>
                  <p className="text-xs text-gray-500">{dr.specialty || 'No specialty'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-purple-400 font-bold text-lg">{dr.monthRefs}</p>
                  <p className="text-[10px] text-gray-500">this month</p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-blue-400 font-semibold text-sm">{dr.totalRefs}</p>
                  <p className="text-[10px] text-gray-500">total</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════ ALL DOCTORS LIST ══════ */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-white font-semibold text-sm">
            All Doctors ({doctors.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { resetAddForm(); setShowAddModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg font-medium transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add Doctor
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" /> Filters {hasActiveFilters ? '•' : ''}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Name</label>
                <input value={filterName} onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Doctor name..." className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Specialty</label>
                <input value={filterSpecialty} onChange={(e) => setFilterSpecialty(e.target.value)}
                  placeholder="e.g. Cardiology..." className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Degree</label>
                <input value={filterDegree} onChange={(e) => setFilterDegree(e.target.value)}
                  placeholder="e.g. MBBS, MD..." className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Pincode</label>
                <input value={filterPincode} onChange={(e) => setFilterPincode(e.target.value)}
                  placeholder="6-digit..." maxLength={6} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500" />
              </div>
            </div>
            {hasActiveFilters && (
              <button onClick={() => { setFilterName(''); setFilterSpecialty(''); setFilterDegree(''); setFilterPincode(''); }}
                className="mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors">Clear all filters</button>
            )}
          </div>
        )}

        {/* Doctor Cards */}
        {filteredDoctors.length === 0 ? (
          <div className="text-center py-16">
            <Stethoscope className="w-12 h-12 text-purple-500/30 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">
              {doctors.length === 0 ? 'No doctors added yet. Click "Add Doctor" to get started.' : 'No doctors match the current filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredDoctors.map((doctor) => {
              const stats = referralStats[doctor.uid];
              const monthRefs = stats?.thisMonthCount || 0;
              const isExpanded = expandedDoctor === doctor.uid;

              return (
                <div key={doctor.uid} className={`bg-zinc-900 border rounded-xl overflow-hidden ${doctor.status === 'inactive' ? 'border-zinc-800 opacity-60' : 'border-zinc-800'}`}>
                  {/* Summary Row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => setExpandedDoctor(isExpanded ? null : doctor.uid)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        doctor.status === 'active' ? 'bg-purple-500/15' : 'bg-red-500/15'
                      }`}>
                        <span className={`font-bold text-sm ${doctor.status === 'active' ? 'text-purple-400' : 'text-red-400'}`}>
                          {doctor.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium text-sm">Dr. {doctor.name}</span>
                          {doctor.source === 'system' && (
                            <span className="text-[10px] text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded-full">HealQR</span>
                          )}
                          {doctor.status === 'inactive' && (
                            <span className="text-[10px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full">Inactive</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                          {doctor.specialty && <span>{doctor.specialty}</span>}
                          {doctor.specialty && doctor.pinCode && <span>•</span>}
                          {doctor.pinCode && <span>{doctor.pinCode}</span>}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
                    </button>

                    {/* Month Refs + Edit + Delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-center px-2">
                        <p className={`text-lg font-bold ${monthRefs > 0 ? 'text-purple-400' : 'text-zinc-600'}`}>{monthRefs}</p>
                        <p className="text-[9px] text-gray-500 leading-tight">refs/mo</p>
                      </div>
                      <button onClick={() => startEdit(doctor)}
                        className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {deletingId === doctor.uid ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(doctor.uid)}
                            className="w-8 h-8 bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center text-white transition-colors">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeletingId(null)}
                            className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeletingId(doctor.uid)}
                          className="w-8 h-8 bg-zinc-800 hover:bg-red-600/20 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800 px-4 py-4 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Phone</p>
                          <p className="text-white mt-0.5 flex items-center gap-1"><Phone className="w-3 h-3 text-blue-400" /> {doctor.phone}</p>
                        </div>
                        {doctor.email && (
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Email</p>
                            <p className="text-white mt-0.5 flex items-center gap-1"><Mail className="w-3 h-3 text-blue-400" /> <span className="truncate">{doctor.email}</span></p>
                          </div>
                        )}
                        {doctor.doctorCode && (
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Doctor Code</p>
                            <p className="text-purple-400 font-mono text-xs mt-0.5 flex items-center gap-1"><Hash className="w-3 h-3" /> {doctor.doctorCode}</p>
                          </div>
                        )}
                        {doctor.clinic && (
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Clinic</p>
                            <p className="text-white mt-0.5">{doctor.clinic}</p>
                          </div>
                        )}
                        {doctor.pinCode && (
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Pincode</p>
                            <p className="text-white mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3 text-purple-400" /> {doctor.pinCode}</p>
                          </div>
                        )}
                        {doctor.degrees && doctor.degrees.length > 0 && (
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Degrees</p>
                            <p className="text-white mt-0.5">{doctor.degrees.join(', ')}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Added On</p>
                          <p className="text-white mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-500" />
                            {new Date(doctor.addedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      {/* Referral Stats */}
                      {stats && (
                        <div className="bg-zinc-800/50 rounded-lg p-4">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Referral Statistics
                          </p>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-2xl font-bold text-purple-400">{stats.totalReferrals}</p>
                              <p className="text-xs text-gray-500">Total Referrals</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-blue-400">{stats.thisMonthCount}</p>
                              <p className="text-xs text-gray-500">This Month</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white mt-1">
                                {stats.lastReferralDate
                                  ? new Date(stats.lastReferralDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                  : '—'}
                              </p>
                              <p className="text-xs text-gray-500">Last Referral</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {doctor.notes && (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                          <p className="text-white text-sm">{doctor.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
