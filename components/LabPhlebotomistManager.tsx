import { useState, useEffect, useCallback } from 'react';
import {
  Syringe, Search, Plus, UserCheck, X, Phone, Mail, MapPin, Trash2, Edit2,
  Loader2, Users, AlertCircle, Check,
} from 'lucide-react';
import { db } from '../lib/firebase/config';
import {
  collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc,
  onSnapshot, deleteDoc, arrayUnion, arrayRemove, serverTimestamp,
} from 'firebase/firestore';
import { toast } from 'sonner';

interface Phlebotomist {
  id: string;
  name: string;
  email: string;
  phone: string;
  pincode: string;
  state: string;
  experience: string;
  status: string;
}

interface LinkedPhlebo {
  id: string;
  name: string;
  phone: string;
  email: string;
  linkedAt: string;
}

/* Search result from top-level phlebotomists collection */
interface SearchResult {
  id: string;
  name: string;
  email: string;
  phone: string;
  pincode: string;
  state: string;
  experience: string;
}

export default function LabPhlebotomistManager({ labId }: { labId: string }) {
  const [linkedPhlebos, setLinkedPhlebos] = useState<LinkedPhlebo[]>([]);
  const [localPhlebos, setLocalPhlebos] = useState<Phlebotomist[]>([]);
  const [loading, setLoading] = useState(true);
  const [labName, setLabName] = useState('');

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
  const [addSaving, setAddSaving] = useState(false);

  /* ───── Load lab data ───── */
  useEffect(() => {
    if (!labId) return;
    (async () => {
      const labDoc = await getDoc(doc(db, 'labs', labId));
      if (labDoc.exists()) {
        const d = labDoc.data();
        setLabName(d.name || d.labName || '');
      }
    })();
  }, [labId]);

  /* ───── Load local phlebotomists (subcollection — legacy support) ───── */
  useEffect(() => {
    if (!labId) return;
    const unsub = onSnapshot(collection(db, 'labs', labId, 'phlebotomists'), (snap) => {
      setLocalPhlebos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Phlebotomist)));
    });
    return () => unsub();
  }, [labId]);

  /* ───── Load linked phlebotomists from lab doc ───── */
  useEffect(() => {
    if (!labId) { setLoading(false); return; }
    const unsub = onSnapshot(doc(db, 'labs', labId), (snap) => {
      const data = snap.data();
      setLinkedPhlebos(data?.linkedPhlebotomists || []);
      setLoading(false);
    });
    return () => unsub();
  }, [labId]);

  /* ───── Search phlebotomists from top-level collection (paramedicals with role=phlebotomist) ───── */
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const q = searchQuery.trim().toLowerCase();
      // Search in paramedicals collection (new), fall back to phlebotomists (legacy)
      const paraRef = collection(db, 'paramedicals');
      const phlebRef = collection(db, 'phlebotomists');

      // Search by phone in paramedicals
      const byPhonePara = await getDocs(query(paraRef, where('phone', '==', q), where('role', '==', 'phlebotomist')));
      // Search by email in paramedicals
      const byEmailPara = await getDocs(query(paraRef, where('email', '==', q), where('role', '==', 'phlebotomist')));
      // Legacy: search by phone in phlebotomists
      const byPhoneOld = await getDocs(query(phlebRef, where('phone', '==', q)));
      // Legacy: search by email in phlebotomists
      const byEmailOld = await getDocs(query(phlebRef, where('email', '==', q)));

      const resultMap = new Map<string, SearchResult>();
      [...byPhonePara.docs, ...byEmailPara.docs, ...byPhoneOld.docs, ...byEmailOld.docs].forEach((d) => {
        if (!resultMap.has(d.id)) {
          resultMap.set(d.id, { id: d.id, ...d.data() } as SearchResult);
        }
      });

      // Also try partial name match
      if (resultMap.size === 0) {
        const allPara = await getDocs(query(paraRef, where('role', '==', 'phlebotomist')));
        allPara.docs.forEach((d) => {
          const data = d.data();
          if (data.name?.toLowerCase().includes(q) || data.phone?.includes(q)) {
            if (!resultMap.has(d.id)) {
              resultMap.set(d.id, { id: d.id, ...data } as SearchResult);
            }
          }
        });
        // Legacy fallback
        const allOld = await getDocs(phlebRef);
        allOld.docs.forEach((d) => {
          const data = d.data();
          if (data.name?.toLowerCase().includes(q) || data.phone?.includes(q)) {
            if (!resultMap.has(d.id)) {
              resultMap.set(d.id, { id: d.id, ...data } as SearchResult);
            }
          }
        });
      }

      // Filter out already linked
      const linkedIds = new Set(linkedPhlebos.map((p) => p.id));
      const results = Array.from(resultMap.values()).filter((r) => !linkedIds.has(r.id));

      setSearchResults(results);
      if (results.length === 0) toast.info('No matching phlebotomists found');
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  }, [searchQuery, linkedPhlebos]);

  /* ───── Link a searched phlebotomist ───── */
  const linkPhlebo = useCallback(async (phlebo: SearchResult) => {
    try {
      const linkEntry: LinkedPhlebo = {
        id: phlebo.id,
        name: phlebo.name,
        phone: phlebo.phone,
        email: phlebo.email,
        linkedAt: new Date().toISOString(),
      };

      // Add to lab's linkedPhlebotomists array
      await updateDoc(doc(db, 'labs', labId), {
        linkedPhlebotomists: arrayUnion(linkEntry),
      });

      // Also add to phlebo's linkedLabs array (bidirectional) — try paramedicals first, fallback to phlebotomists
      try {
        await updateDoc(doc(db, 'paramedicals', phlebo.id), {
          linkedLabs: arrayUnion({ id: labId, name: labName, linkedAt: new Date().toISOString() }),
        });
      } catch (_) {
        await updateDoc(doc(db, 'phlebotomists', phlebo.id), {
          linkedLabs: arrayUnion({ id: labId, name: labName, linkedAt: new Date().toISOString() }),
        });
      }

      // Also add to labs/{labId}/phlebotomists subcollection (for booking allocation dropdown)
      await addDoc(collection(db, 'labs', labId, 'phlebotomists'), {
        phlebotomistId: phlebo.id,
        name: phlebo.name,
        phone: phlebo.phone,
        email: phlebo.email,
        status: 'active',
        linkedAt: serverTimestamp(),
      });

      toast.success(`Linked ${phlebo.name}`);
      setSearchResults((prev) => prev.filter((r) => r.id !== phlebo.id));
    } catch (err) {
      console.error('Link error:', err);
      toast.error('Failed to link');
    }
  }, [labId, labName]);

  /* ───── Unlink ───── */
  const unlinkPhlebo = useCallback(async (phlebo: LinkedPhlebo) => {
    try {
      // Remove from lab's array
      await updateDoc(doc(db, 'labs', labId), {
        linkedPhlebotomists: arrayRemove(phlebo),
      });

      // Remove from subcollection
      const subQ = query(
        collection(db, 'labs', labId, 'phlebotomists'),
        where('phlebotomistId', '==', phlebo.id)
      );
      const subSnap = await getDocs(subQ);
      for (const d of subSnap.docs) {
        await deleteDoc(d.ref);
      }

      // Remove lab from phlebo's linkedLabs (best effort — try paramedicals first)
      try {
        const paraDocSnap = await getDoc(doc(db, 'paramedicals', phlebo.id));
        if (paraDocSnap.exists()) {
          const labs = (paraDocSnap.data().linkedLabs || []).filter((l: any) => l.id !== labId);
          await updateDoc(doc(db, 'paramedicals', phlebo.id), { linkedLabs: labs });
        } else {
          const phlebDoc = await getDoc(doc(db, 'phlebotomists', phlebo.id));
          if (phlebDoc.exists()) {
            const labs = (phlebDoc.data().linkedLabs || []).filter((l: any) => l.id !== labId);
            await updateDoc(doc(db, 'phlebotomists', phlebo.id), { linkedLabs: labs });
          }
        }
      } catch (_) { /* best effort */ }

      toast.success(`Removed ${phlebo.name}`);
    } catch (err) {
      console.error('Unlink error:', err);
      toast.error('Failed to remove');
    }
  }, [labId]);

  /* ───── Manual add (creates in top-level + links) ───── */
  const handleManualAdd = async () => {
    if (!addName.trim() || !addPhone.trim()) {
      toast.error('Name and Phone are required');
      return;
    }
    setAddSaving(true);
    try {
      // Check if phone already exists in paramedicals or phlebotomists
      const existingPara = await getDocs(query(collection(db, 'paramedicals'), where('phone', '==', addPhone.trim()), where('role', '==', 'phlebotomist')));
      const existingOld = await getDocs(query(collection(db, 'phlebotomists'), where('phone', '==', addPhone.trim())));
      if (!existingPara.empty || !existingOld.empty) {
        toast.error('This phone is already registered. Use Search to find and link them.');
        setAddSaving(false);
        return;
      }

      // Create in paramedicals collection (new unified collection)
      const newDoc = await addDoc(collection(db, 'paramedicals'), {
        name: addName.trim(),
        phone: addPhone.trim(),
        email: addEmail.trim().toLowerCase(),
        pincode: addPincode.trim(),
        role: 'phlebotomist',
        experience: '',
        status: 'active',
        linkedLabs: [{ id: labId, name: labName, linkedAt: new Date().toISOString() }],
        linkedDoctors: [],
        linkedClinics: [],
        createdAt: serverTimestamp(),
        createdBy: labId,
        createdByType: 'lab',
      });

      // Link to lab
      const linkEntry: LinkedPhlebo = {
        id: newDoc.id,
        name: addName.trim(),
        phone: addPhone.trim(),
        email: addEmail.trim().toLowerCase(),
        linkedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'labs', labId), {
        linkedPhlebotomists: arrayUnion(linkEntry),
      });

      // Subcollection
      await addDoc(collection(db, 'labs', labId, 'phlebotomists'), {
        phlebotomistId: newDoc.id,
        name: addName.trim(),
        phone: addPhone.trim(),
        email: addEmail.trim().toLowerCase(),
        status: 'active',
        linkedAt: serverTimestamp(),
      });

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

  /* ───── Render ───── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Syringe className="w-5 h-5 text-teal-400" /> Phlebotomist Manager
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{linkedPhlebos.length} linked phlebotomists</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowSearch(!showSearch); setShowAddForm(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              showSearch ? 'bg-teal-600 text-white' : 'bg-zinc-800 text-gray-300 hover:text-white'
            }`}>
            <Search className="w-3.5 h-3.5" /> Search & Link
          </button>
          <button onClick={() => { setShowAddForm(!showAddForm); setShowSearch(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              showAddForm ? 'bg-teal-600 text-white' : 'bg-zinc-800 text-gray-300 hover:text-white'
            }`}>
            <Plus className="w-3.5 h-3.5" /> Add Manually
          </button>
        </div>
      </div>

      {/* Search Panel */}
      {showSearch && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
          <p className="text-xs text-gray-400">Search registered phlebotomists by phone, email, or name</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder-gray-500"
                placeholder="Phone, email or name..." />
            </div>
            <button onClick={handleSearch} disabled={searching}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg font-medium disabled:opacity-50">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((r) => (
                <div key={r.id} className="bg-zinc-800 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">{r.name}</p>
                    <p className="text-gray-500 text-xs">{r.phone} • {r.email || 'No email'} • {r.pincode || 'No pincode'}</p>
                  </div>
                  <button onClick={() => linkPhlebo(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded-lg font-medium">
                    <UserCheck className="w-3.5 h-3.5" /> Link
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Add Form */}
      {showAddForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
          <p className="text-xs text-gray-400">Add a new phlebotomist (not yet on HealQR). They can later claim this profile by signing up with same phone.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg font-medium disabled:opacity-50">
              {addSaving ? 'Adding...' : 'Add Phlebotomist'}
            </button>
            <button onClick={() => setShowAddForm(false)}
              className="px-5 py-2 bg-zinc-800 text-gray-400 text-sm rounded-lg hover:text-white">Cancel</button>
          </div>
        </div>
      )}

      {/* Linked Phlebotomists List */}
      {linkedPhlebos.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-teal-500/20 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">No phlebotomists linked yet</p>
          <p className="text-gray-600 text-xs mt-1">Use Search & Link or Add Manually to get started</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {linkedPhlebos.map((p) => (
            <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 bg-teal-500/15 rounded-lg flex items-center justify-center shrink-0">
                  <Syringe className="w-5 h-5 text-teal-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm truncate">{p.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    {p.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {p.phone}</span>}
                    {p.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {p.email}</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => unlinkPhlebo(p)}
                className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
