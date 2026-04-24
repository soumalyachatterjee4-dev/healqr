import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Syringe, Search, Plus, UserCheck, Trash2, Loader2, Users, Check,
  Phone, Mail, Send, Calendar, Clock, MapPin, User, ClipboardList,
} from 'lucide-react';
import { db } from '../lib/firebase/config';
import {
  collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc,
  onSnapshot, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, orderBy,
} from 'firebase/firestore';
import { toast } from 'sonner';

/* ─────────── Types ─────────── */

export type OwnerType = 'doctor' | 'clinic' | 'lab';

export type ParamedicalRole =
  | 'phlebotomist' | 'physiotherapist' | 'nurse'
  | 'wound-dresser' | 'aaya' | 'home-assistant';

const ROLE_OPTIONS: { value: ParamedicalRole; label: string }[] = [
  { value: 'phlebotomist', label: 'Phlebotomist' },
  { value: 'physiotherapist', label: 'Physiotherapist' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'wound-dresser', label: 'Wound Dresser' },
  { value: 'aaya', label: 'Aaya / Caretaker' },
  { value: 'home-assistant', label: 'Home Health Assistant' },
];

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label])
);

interface LinkedPara {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role?: string;
  linkedAt: string;
}

interface SearchResult {
  id: string;
  name: string;
  email?: string;
  phone: string;
  pincode?: string;
  role?: string;
  experience?: string;
}

interface AllotmentBooking {
  id: string;
  paramedicalId: string;
  paramedicalName?: string;
  paramedicalRole?: string;
  serviceType?: string;
  appointmentDate?: string;
  timeSlot?: string;
  status?: string;
  patientName?: string;
  patientPhone?: string;
  patientAddress?: string;
  notes?: string;
  allottedBy?: { type: string; id: string; name: string };
  createdAt?: any;
}

interface Props {
  ownerType: OwnerType;
  ownerId: string;
  ownerName: string;
  /** Restrict role list (e.g. Lab may only want phlebotomists). Default: all roles. */
  roleFilter?: ParamedicalRole[];
  /** Accent color for headings/buttons. */
  accent?: 'teal' | 'emerald' | 'purple' | 'blue';
  /** Optional branch context — when a branch manager is using this, allotments are tagged with branchId/branchName and history is scoped to this branch. */
  branchId?: string;
  branchName?: string;
  /** When true, history tab filters to this branch only. Typically set for branch managers. */
  scopeHistoryToBranch?: boolean;
}

const ACCENT_CLASSES: Record<string, { text: string; bg: string; bgHover: string; ring: string; soft: string; icon: string }> = {
  teal:    { text: 'text-teal-400',    bg: 'bg-teal-600',    bgHover: 'hover:bg-teal-700',    ring: 'ring-teal-500',    soft: 'bg-teal-500/15',    icon: 'text-teal-400' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-600', bgHover: 'hover:bg-emerald-700', ring: 'ring-emerald-500', soft: 'bg-emerald-500/15', icon: 'text-emerald-400' },
  purple:  { text: 'text-purple-400',  bg: 'bg-purple-600',  bgHover: 'hover:bg-purple-700',  ring: 'ring-purple-500',  soft: 'bg-purple-500/15',  icon: 'text-purple-400' },
  blue:    { text: 'text-blue-400',    bg: 'bg-blue-600',    bgHover: 'hover:bg-blue-700',    ring: 'ring-blue-500',    soft: 'bg-blue-500/15',     icon: 'text-blue-400' },
};

/* ─────────── Component ─────────── */

export default function ParamedicalManager({
  ownerType, ownerId, ownerName, roleFilter, accent = 'teal',
  branchId, branchName, scopeHistoryToBranch = false,
}: Props) {
  const A = ACCENT_CLASSES[accent];
  const roles = roleFilter && roleFilter.length > 0 ? roleFilter : ROLE_OPTIONS.map((r) => r.value);

  const [tab, setTab] = useState<'linked' | 'allot' | 'history'>('linked');
  const [loading, setLoading] = useState(true);
  const [linkedParas, setLinkedParas] = useState<LinkedPara[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Manual add
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPincode, setAddPincode] = useState('');
  const [addRole, setAddRole] = useState<ParamedicalRole>(roles[0] as ParamedicalRole);
  const [addSaving, setAddSaving] = useState(false);

  // Allotment form
  const [allotParaId, setAllotParaId] = useState('');
  const [allotService, setAllotService] = useState('');
  const [allotDate, setAllotDate] = useState('');
  const [allotSlot, setAllotSlot] = useState('');
  const [allotPatientName, setAllotPatientName] = useState('');
  const [allotPatientPhone, setAllotPatientPhone] = useState('');
  const [allotPatientAddress, setAllotPatientAddress] = useState('');
  const [allotNotes, setAllotNotes] = useState('');
  const [allotSaving, setAllotSaving] = useState(false);

  // History
  const [history, setHistory] = useState<AllotmentBooking[]>([]);

  /* ─────────── Firestore paths based on ownerType ─────────── */
  const ownerCollection = ownerType === 'doctor' ? 'doctors' : ownerType === 'clinic' ? 'clinics' : 'labs';
  const linkedField =
    ownerType === 'lab' ? 'linkedParamedicals' : 'linkedParamedicals';

  /* ─────────── Load linked list ─────────── */
  useEffect(() => {
    if (!ownerId) { setLoading(false); return; }
    const unsub = onSnapshot(doc(db, ownerCollection, ownerId), (snap) => {
      const data = snap.data() || {};
      const arr: LinkedPara[] = data[linkedField] || [];
      // Lab legacy fallback: also read linkedPhlebotomists if linkedParamedicals is empty
      if (ownerType === 'lab' && arr.length === 0 && Array.isArray(data.linkedPhlebotomists)) {
        setLinkedParas(
          (data.linkedPhlebotomists as any[]).map((p) => ({
            id: p.id, name: p.name, phone: p.phone, email: p.email,
            role: 'phlebotomist', linkedAt: p.linkedAt || '',
          }))
        );
      } else {
        setLinkedParas(arr);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [ownerId, ownerCollection, linkedField, ownerType]);

  /* ─────────── Load my allotment history ─────────── */
  useEffect(() => {
    if (!ownerId) return;
    if (tab !== 'history') return;
    // Query without orderBy to avoid requiring composite index for every owner.
    // Branch scoping is applied client-side to avoid extra indexes.
    const q = query(
      collection(db, 'paramedicalBookings'),
      where('allottedBy.id', '==', ownerId)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        let list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AllotmentBooking));
        if (scopeHistoryToBranch && branchId) {
          list = list.filter((b: any) => b.allottedBy?.branchId === branchId);
        }
        list.sort((a, b) => {
          const aT = a.createdAt?.seconds || 0;
          const bT = b.createdAt?.seconds || 0;
          return bT - aT;
        });
        setHistory(list);
      },
      (err) => {
        console.error('Allotment history error:', err);
      }
    );
    return () => unsub();
  }, [ownerId, tab, scopeHistoryToBranch, branchId]);

  /* ─────────── Search paramedicals ─────────── */
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const qRaw = searchQuery.trim();
      const qLower = qRaw.toLowerCase();
      const paraRef = collection(db, 'paramedicals');
      const resultMap = new Map<string, SearchResult>();

      // Exact phone / email matches (respect role filter)
      const searchPromises: Promise<any>[] = [];
      for (const role of roles) {
        searchPromises.push(getDocs(query(paraRef, where('phone', '==', qRaw), where('role', '==', role))));
        searchPromises.push(getDocs(query(paraRef, where('email', '==', qLower), where('role', '==', role))));
      }
      const snaps = await Promise.all(searchPromises);
      snaps.forEach((snap: any) => {
        snap.docs.forEach((d: any) => {
          if (!resultMap.has(d.id)) resultMap.set(d.id, { id: d.id, ...d.data() } as SearchResult);
        });
      });

      // Fallback: partial match scanning allowed roles (small datasets only)
      if (resultMap.size === 0) {
        for (const role of roles) {
          const allSnap = await getDocs(query(paraRef, where('role', '==', role)));
          allSnap.docs.forEach((d) => {
            const data: any = d.data();
            if (
              data.name?.toLowerCase().includes(qLower) ||
              data.phone?.includes(qRaw) ||
              data.email?.toLowerCase().includes(qLower)
            ) {
              if (!resultMap.has(d.id)) resultMap.set(d.id, { id: d.id, ...data } as SearchResult);
            }
          });
        }
      }

      const linkedIds = new Set(linkedParas.map((p) => p.id));
      const results = Array.from(resultMap.values()).filter((r) => !linkedIds.has(r.id));
      setSearchResults(results);
      if (results.length === 0) toast.info('No matching paramedicals found');
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  }, [searchQuery, linkedParas, roles]);

  /* ─────────── Link a searched paramedical ─────────── */
  const linkPara = useCallback(async (p: SearchResult) => {
    try {
      const linkEntry: LinkedPara = {
        id: p.id, name: p.name, phone: p.phone, email: p.email || '',
        role: p.role || '', linkedAt: new Date().toISOString(),
      };

      // Add to owner's linkedParamedicals
      await updateDoc(doc(db, ownerCollection, ownerId), {
        [linkedField]: arrayUnion(linkEntry),
      });

      // For lab, also maintain legacy linkedPhlebotomists array + subcollection so existing booking allocation UI still works.
      if (ownerType === 'lab' && (p.role === 'phlebotomist' || !p.role)) {
        try {
          await updateDoc(doc(db, 'labs', ownerId), {
            linkedPhlebotomists: arrayUnion({
              id: p.id, name: p.name, phone: p.phone, email: p.email || '',
              linkedAt: new Date().toISOString(),
            }),
          });
          await addDoc(collection(db, 'labs', ownerId, 'phlebotomists'), {
            phlebotomistId: p.id, name: p.name, phone: p.phone, email: p.email || '',
            status: 'active', linkedAt: serverTimestamp(),
          });
        } catch (_) { /* best effort */ }
      }

      // Mirror on paramedical side
      const mirrorField =
        ownerType === 'doctor' ? 'linkedDoctors' :
        ownerType === 'clinic' ? 'linkedClinics' : 'linkedLabs';
      try {
        await updateDoc(doc(db, 'paramedicals', p.id), {
          [mirrorField]: arrayUnion({ id: ownerId, name: ownerName, linkedAt: new Date().toISOString() }),
        });
      } catch (_) { /* best effort */ }

      toast.success(`Linked ${p.name}`);
      setSearchResults((prev) => prev.filter((r) => r.id !== p.id));
    } catch (err) {
      console.error('Link error:', err);
      toast.error('Failed to link');
    }
  }, [ownerCollection, ownerId, ownerName, ownerType, linkedField]);

  /* ─────────── Unlink ─────────── */
  const unlinkPara = useCallback(async (p: LinkedPara) => {
    try {
      await updateDoc(doc(db, ownerCollection, ownerId), {
        [linkedField]: arrayRemove(p),
      });

      if (ownerType === 'lab') {
        try {
          const labDoc = await getDoc(doc(db, 'labs', ownerId));
          const legacy = (labDoc.data()?.linkedPhlebotomists || []).filter((x: any) => x.id !== p.id);
          await updateDoc(doc(db, 'labs', ownerId), { linkedPhlebotomists: legacy });
          const subQ = query(collection(db, 'labs', ownerId, 'phlebotomists'), where('phlebotomistId', '==', p.id));
          const subSnap = await getDocs(subQ);
          for (const d of subSnap.docs) await deleteDoc(d.ref);
        } catch (_) { /* best effort */ }
      }

      // Mirror remove
      const mirrorField =
        ownerType === 'doctor' ? 'linkedDoctors' :
        ownerType === 'clinic' ? 'linkedClinics' : 'linkedLabs';
      try {
        const paraDoc = await getDoc(doc(db, 'paramedicals', p.id));
        if (paraDoc.exists()) {
          const arr = (paraDoc.data()[mirrorField] || []).filter((x: any) => x.id !== ownerId);
          await updateDoc(doc(db, 'paramedicals', p.id), { [mirrorField]: arr });
        }
      } catch (_) { /* best effort */ }

      toast.success(`Removed ${p.name}`);
    } catch (err) {
      console.error('Unlink error:', err);
      toast.error('Failed to remove');
    }
  }, [ownerCollection, ownerId, ownerType, linkedField]);

  /* ─────────── Manual add ─────────── */
  const handleManualAdd = async () => {
    if (!addName.trim() || !addPhone.trim()) {
      toast.error('Name and Phone are required');
      return;
    }
    setAddSaving(true);
    try {
      const dup = await getDocs(query(collection(db, 'paramedicals'),
        where('phone', '==', addPhone.trim()), where('role', '==', addRole)));
      if (!dup.empty) {
        toast.error('This phone is already registered. Use Search to find and link them.');
        setAddSaving(false);
        return;
      }

      const newDoc = await addDoc(collection(db, 'paramedicals'), {
        name: addName.trim(),
        phone: addPhone.trim(),
        email: addEmail.trim().toLowerCase(),
        pincode: addPincode.trim(),
        role: addRole,
        experience: '',
        status: 'active',
        linkedLabs: ownerType === 'lab' ? [{ id: ownerId, name: ownerName, linkedAt: new Date().toISOString() }] : [],
        linkedDoctors: ownerType === 'doctor' ? [{ id: ownerId, name: ownerName, linkedAt: new Date().toISOString() }] : [],
        linkedClinics: ownerType === 'clinic' ? [{ id: ownerId, name: ownerName, linkedAt: new Date().toISOString() }] : [],
        createdAt: serverTimestamp(),
        createdBy: ownerId,
        createdByType: ownerType,
      });

      const linkEntry: LinkedPara = {
        id: newDoc.id, name: addName.trim(), phone: addPhone.trim(),
        email: addEmail.trim().toLowerCase(), role: addRole,
        linkedAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, ownerCollection, ownerId), {
        [linkedField]: arrayUnion(linkEntry),
      });

      if (ownerType === 'lab' && addRole === 'phlebotomist') {
        try {
          await updateDoc(doc(db, 'labs', ownerId), {
            linkedPhlebotomists: arrayUnion({
              id: newDoc.id, name: addName.trim(), phone: addPhone.trim(),
              email: addEmail.trim().toLowerCase(), linkedAt: new Date().toISOString(),
            }),
          });
          await addDoc(collection(db, 'labs', ownerId, 'phlebotomists'), {
            phlebotomistId: newDoc.id, name: addName.trim(),
            phone: addPhone.trim(), email: addEmail.trim().toLowerCase(),
            status: 'active', linkedAt: serverTimestamp(),
          });
        } catch (_) { /* best effort */ }
      }

      toast.success(`Added ${addName.trim()}`);
      setAddName(''); setAddPhone(''); setAddEmail(''); setAddPincode('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Add error:', err);
      toast.error('Failed to add');
    } finally {
      setAddSaving(false);
    }
  };

  /* ─────────── Create allotment (booking) ─────────── */
  const handleAllot = async () => {
    if (!allotParaId) { toast.error('Select a paramedical'); return; }
    if (!allotPatientName.trim() || !allotPatientPhone.trim()) {
      toast.error('Patient name and phone are required'); return;
    }
    if (!allotService.trim()) { toast.error('Service / task is required'); return; }
    if (!allotDate) { toast.error('Appointment date is required'); return; }

    setAllotSaving(true);
    try {
      const paraRef = linkedParas.find((p) => p.id === allotParaId);
      if (!paraRef) throw new Error('Paramedical not in your linked list');

      const allottedByPayload: any = {
        type: ownerType, id: ownerId, name: ownerName,
      };
      if (branchId) allottedByPayload.branchId = branchId;
      if (branchName) allottedByPayload.branchName = branchName;

      const bookingData = {
        paramedicalId: paraRef.id,
        paramedicalName: paraRef.name,
        paramedicalRole: paraRef.role || '',
        serviceType: allotService.trim(),
        appointmentDate: allotDate,
        timeSlot: allotSlot.trim(),
        status: 'confirmed',
        patientName: allotPatientName.trim(),
        patientPhone: allotPatientPhone.trim(),
        patientAddress: allotPatientAddress.trim(),
        notes: allotNotes.trim(),
        allottedBy: allottedByPayload,
        source: 'allotment',
        createdAt: serverTimestamp(),
      };

      const bookingRef = await addDoc(collection(db, 'paramedicalBookings'), bookingData);

      // Notify paramedical
      try {
        const fromLabel = branchName ? `${ownerName} (${branchName})` : ownerName;
        await addDoc(collection(db, 'paramedicals', paraRef.id, 'notifications'), {
          type: 'new-allotment',
          title: `New allotment from ${fromLabel}`,
          message: `${allotService.trim()} — ${allotPatientName.trim()} on ${allotDate}${allotSlot ? ` (${allotSlot})` : ''}`,
          bookingId: bookingRef.id,
          allottedBy: allottedByPayload,
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch (_) { /* best effort */ }

      toast.success(`Allotted to ${paraRef.name}`);
      setAllotParaId(''); setAllotService(''); setAllotDate(''); setAllotSlot('');
      setAllotPatientName(''); setAllotPatientPhone(''); setAllotPatientAddress(''); setAllotNotes('');
    } catch (err) {
      console.error('Allot error:', err);
      toast.error('Failed to create allotment');
    } finally {
      setAllotSaving(false);
    }
  };

  /* ─────────── Linked list filtered by role (for allot dropdown) ─────────── */
  const allowedLinked = useMemo(
    () => linkedParas.filter((p) => !p.role || (roles as string[]).includes(p.role)),
    [linkedParas, roles]
  );

  /* ─────────── Render ─────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className={`w-10 h-10 ${A.text} animate-spin`} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Syringe className={`w-5 h-5 ${A.icon}`} /> Paramedical Manager
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {linkedParas.length} linked paramedical{linkedParas.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 w-fit">
        {([
          { id: 'linked', label: 'My Paramedicals', icon: Users },
          { id: 'allot',  label: 'Allot to Patient', icon: Send },
          { id: 'history', label: 'Allotment History', icon: ClipboardList },
        ] as const).map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                active ? `${A.bg} text-white` : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ─────────── TAB: Linked ─────────── */}
      {tab === 'linked' && (
        <>
          <div className="flex gap-2">
            <button onClick={() => { setShowSearch(!showSearch); setShowAddForm(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                showSearch ? `${A.bg} text-white` : 'bg-zinc-800 text-gray-300 hover:text-white'
              }`}>
              <Search className="w-3.5 h-3.5" /> Search & Link
            </button>
            <button onClick={() => { setShowAddForm(!showAddForm); setShowSearch(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                showAddForm ? `${A.bg} text-white` : 'bg-zinc-800 text-gray-300 hover:text-white'
              }`}>
              <Plus className="w-3.5 h-3.5" /> Add Manually
            </button>
          </div>

          {showSearch && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
              <p className="text-xs text-gray-400">Search registered paramedicals by phone, email, or name</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder-gray-500"
                    placeholder="Phone, email or name..." />
                </div>
                <button onClick={handleSearch} disabled={searching}
                  className={`px-5 py-2.5 ${A.bg} ${A.bgHover} text-white text-sm rounded-lg font-medium disabled:opacity-50`}>
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((r) => (
                    <div key={r.id} className="bg-zinc-800 rounded-lg px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">
                          {r.name}
                          {r.role && <span className="ml-2 text-[10px] uppercase tracking-wider text-gray-400">{ROLE_LABEL[r.role] || r.role}</span>}
                        </p>
                        <p className="text-gray-500 text-xs">{r.phone} • {r.email || 'No email'} {r.pincode ? `• ${r.pincode}` : ''}</p>
                      </div>
                      <button onClick={() => linkPara(r)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 ${A.bg} ${A.bgHover} text-white text-xs rounded-lg font-medium`}>
                        <UserCheck className="w-3.5 h-3.5" /> Link
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showAddForm && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
              <p className="text-xs text-gray-400">Add a new paramedical. They can claim the profile later by signing up with the same phone.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Role *</label>
                  <select value={addRole} onChange={(e) => setAddRole(e.target.value as ParamedicalRole)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white">
                    {ROLE_OPTIONS.filter((o) => (roles as string[]).includes(o.value)).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Name *</label>
                  <input value={addName} onChange={(e) => setAddName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white" placeholder="Full name" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Phone *</label>
                  <input value={addPhone} onChange={(e) => setAddPhone(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white" placeholder="+91 9876543210" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Email</label>
                  <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Service Pincode</label>
                  <input value={addPincode} onChange={(e) => setAddPincode(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white" placeholder="700001" maxLength={6} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleManualAdd} disabled={addSaving}
                  className={`px-5 py-2 ${A.bg} ${A.bgHover} text-white text-sm rounded-lg font-medium disabled:opacity-50`}>
                  {addSaving ? 'Adding...' : 'Add Paramedical'}
                </button>
                <button onClick={() => setShowAddForm(false)}
                  className="px-5 py-2 bg-zinc-800 text-gray-400 text-sm rounded-lg hover:text-white">Cancel</button>
              </div>
            </div>
          )}

          {linkedParas.length === 0 ? (
            <div className="text-center py-16">
              <Users className={`w-12 h-12 ${A.icon} opacity-20 mx-auto mb-4`} />
              <p className="text-gray-500 text-sm">No paramedicals linked yet</p>
              <p className="text-gray-600 text-xs mt-1">Use Search & Link or Add Manually to get started</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {linkedParas.map((p) => (
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 ${A.soft} rounded-lg flex items-center justify-center shrink-0`}>
                      <Syringe className={`w-5 h-5 ${A.icon}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm truncate">
                        {p.name}
                        {p.role && <span className="ml-2 text-[10px] uppercase tracking-wider text-gray-400">{ROLE_LABEL[p.role] || p.role}</span>}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        {p.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {p.phone}</span>}
                        {p.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {p.email}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => unlinkPara(p)}
                    className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─────────── TAB: Allot to Patient ─────────── */}
      {tab === 'allot' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <p className="text-xs text-gray-400">Assign a home-collection / home-service to a patient. The allotment appears instantly in the paramedical's dashboard as a booking.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase block mb-1">Paramedical *</label>
              <select value={allotParaId} onChange={(e) => setAllotParaId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white">
                <option value="">-- Select from linked --</option>
                {allowedLinked.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.role ? ` — ${ROLE_LABEL[p.role] || p.role}` : ''}
                  </option>
                ))}
              </select>
              {allowedLinked.length === 0 && (
                <p className="text-[11px] text-amber-400 mt-1">No paramedicals linked yet. Go to "My Paramedicals" tab first.</p>
              )}
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase block mb-1">Service / Task *</label>
              <input value={allotService} onChange={(e) => setAllotService(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white"
                placeholder="e.g. Blood sample collection, Wound dressing" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" /> Date *</label>
              <input type="date" value={allotDate} onChange={(e) => setAllotDate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase flex items-center gap-1 mb-1"><Clock className="w-3 h-3" /> Time Slot</label>
              <input value={allotSlot} onChange={(e) => setAllotSlot(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white" placeholder="e.g. 9:00 AM – 10:00 AM" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase flex items-center gap-1 mb-1"><User className="w-3 h-3" /> Patient Name *</label>
              <input value={allotPatientName} onChange={(e) => setAllotPatientName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white" placeholder="Full name" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase flex items-center gap-1 mb-1"><Phone className="w-3 h-3" /> Patient Phone *</label>
              <input value={allotPatientPhone} onChange={(e) => setAllotPatientPhone(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white" placeholder="+91 9876543210" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] text-gray-500 uppercase flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" /> Patient Address</label>
              <input value={allotPatientAddress} onChange={(e) => setAllotPatientAddress(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white" placeholder="House no, area, pincode" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] text-gray-500 uppercase block mb-1">Notes</label>
              <textarea value={allotNotes} onChange={(e) => setAllotNotes(e.target.value)} rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white resize-none"
                placeholder="Special instructions..." />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleAllot} disabled={allotSaving || allowedLinked.length === 0}
              className={`flex items-center gap-2 px-5 py-2.5 ${A.bg} ${A.bgHover} text-white text-sm rounded-lg font-medium disabled:opacity-50`}>
              {allotSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {allotSaving ? 'Allotting...' : 'Allot & Notify'}
            </button>
          </div>
        </div>
      )}

      {/* ─────────── TAB: History ─────────── */}
      {tab === 'history' && (
        <div className="space-y-2.5">
          {history.length === 0 ? (
            <div className="text-center py-16">
              <ClipboardList className={`w-12 h-12 ${A.icon} opacity-20 mx-auto mb-4`} />
              <p className="text-gray-500 text-sm">No allotments yet</p>
              <p className="text-gray-600 text-xs mt-1">Assign a paramedical from the "Allot to Patient" tab.</p>
            </div>
          ) : (
            history.map((b) => (
              <div key={b.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-medium text-sm">{b.serviceType || 'Service'}</p>
                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${A.soft} ${A.text}`}>
                        {b.status || 'confirmed'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {b.paramedicalName}{b.paramedicalRole ? ` (${ROLE_LABEL[b.paramedicalRole] || b.paramedicalRole})` : ''}
                    </p>
                    {(b.allottedBy as any)?.branchName && (
                      <p className="text-[10px] uppercase tracking-wider text-purple-300/80 mt-1">
                        Branch: {(b.allottedBy as any).branchName}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-2 flex-wrap">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {b.patientName}</span>
                      {b.patientPhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {b.patientPhone}</span>}
                      {b.appointmentDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {b.appointmentDate}</span>}
                      {b.timeSlot && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {b.timeSlot}</span>}
                    </div>
                    {b.patientAddress && (
                      <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {b.patientAddress}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
