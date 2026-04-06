import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Send, X, ChevronLeft, Heart, Filter, Users, Bell, MessageSquare, MessageCircle, ImagePlus, Trash } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth, storage } from '../lib/firebase/config';
import DashboardSidebar from './DashboardSidebar';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase/config';
import { storeNotification } from '../services/patientNotificationStorage';

interface ChronicCareManagerProps {
  doctorName: string;
  email: string;
  onLogout: () => void;
  onMenuChange: (menu: string) => void;
  activeAddOns: string[];
}

interface ChronicPatient {
  id: string; // doc ID in chronicPatients subcollection
  patientName: string;
  phone: string;
  age: string;
  gender: string;
  conditions: string[];
  notes: string;
  addedAt: any;
  lastNotifiedAt?: any;
}

const CHRONIC_CONDITIONS = [
  'Diabetes (Type 1)',
  'Diabetes (Type 2)',
  'Hypertension',
  'Hypothyroidism',
  'Hyperthyroidism',
  'Asthma',
  'COPD',
  'Heart Disease',
  'Kidney Disease',
  'Liver Disease',
  'Arthritis',
  'Epilepsy',
  'Depression',
  'Anxiety',
  'Migraine',
  'Anemia',
  'Obesity',
  'PCOD/PCOS',
  'High Cholesterol',
  'Gout',
];

export default function ChronicCareManager({ doctorName, email, onLogout, onMenuChange, activeAddOns }: ChronicCareManagerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const doctorId = auth?.currentUser?.uid || '';

  // Data
  const [patients, setPatients] = useState<ChronicPatient[]>([]);
  const [loading, setLoading] = useState(true);

  // Add patient modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addAge, setAddAge] = useState('');
  const [addGender, setAddGender] = useState('Male');
  const [addConditions, setAddConditions] = useState<string[]>([]);
  const [addNotes, setAddNotes] = useState('');
  const [addCustomCondition, setAddCustomCondition] = useState('');
  const [saving, setSaving] = useState(false);

  // Search from bookings
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingResults, setBookingResults] = useState<Array<{ name: string; phone: string; age: string; gender: string }>>([]);
  const [searchingBookings, setSearchingBookings] = useState(false);

  // Filter
  const [filterCondition, setFilterCondition] = useState('');

  // Bulk message
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTitle, setBulkTitle] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Camp image upload
  const [campImageFile, setCampImageFile] = useState<File | null>(null);
  const [campImagePreview, setCampImagePreview] = useState<string>('');
  const [campImageUploading, setCampImageUploading] = useState(false);

  // Platform health tip (auto-loaded)
  const [platformHealthTip, setPlatformHealthTip] = useState<{ imageUrl: string; name: string } | null>(null);

  // Load a random published health tip for platform card
  useEffect(() => {
    if (!db) return;
    const loadHealthTip = async () => {
      try {
        const { doc: firestoreDoc, getDoc: firestoreGetDoc } = await import('firebase/firestore');
        const adminRef = firestoreDoc(db!, 'adminProfiles', 'super_admin');
        const snap = await firestoreGetDoc(adminRef);
        if (snap.exists()) {
          const templates = snap.data().globalTemplates || [];
          const published = templates.filter((t: any) => t.category === 'health-tip' && t.isPublished && t.imageUrl);
          if (published.length > 0) {
            const picked = published[0]; // Use first published health tip consistently
            setPlatformHealthTip({ imageUrl: picked.imageUrl, name: picked.name || 'Health Tip' });
          }
        }
      } catch {}
    };
    loadHealthTip();
  }, []);

  const handleCampImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setCampImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCampImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadCampImage = async (): Promise<string> => {
    if (!campImageFile || !storage) return '';
    setCampImageUploading(true);
    try {
      const storageRef = ref(storage, `chronic-care/${doctorId}/camp-${Date.now()}.jpg`);
      await uploadBytes(storageRef, campImageFile);
      return await getDownloadURL(storageRef);
    } finally { setCampImageUploading(false); }
  };

  // Load chronic patients
  useEffect(() => {
    if (!doctorId || !db) return;
    const q = query(collection(db!, 'doctors', doctorId, 'chronicPatients'), orderBy('addedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ChronicPatient[]);
      setLoading(false);
    }, (err) => { console.error('Chronic patients load error:', err); setLoading(false); });
    return unsub;
  }, [doctorId]);

  // Search past bookings to auto-fill patient details
  const searchBookings = async () => {
    if (!bookingSearch.trim() || bookingSearch.trim().length < 2) return;
    setSearchingBookings(true);
    try {
      // Search bookings for this doctor
      const q = query(collection(db!, 'bookings'), where('doctorId', '==', doctorId));
      const snap = await getDocs(q);
      const term = bookingSearch.trim().toLowerCase();
      const seen = new Set<string>();
      const results: typeof bookingResults = [];

      snap.forEach(d => {
        const data = d.data();
        const name = (data.patientName || '').toLowerCase();
        const phone = data.whatsappNumber || '';
        if (!name.includes(term) && !phone.includes(term)) return;
        const key = `${name}-${phone}`;
        if (seen.has(key)) return;
        seen.add(key);
        results.push({
          name: data.patientName || 'Unknown',
          phone: phone,
          age: data.age || '',
          gender: data.gender || 'Male',
        });
      });
      setBookingResults(results.slice(0, 10));
      if (results.length === 0) toast('No matching patients found in your bookings');
    } catch (err) {
      console.error(err);
      toast.error('Search failed');
    } finally { setSearchingBookings(false); }
  };

  const selectBookingPatient = (p: typeof bookingResults[0]) => {
    setAddName(p.name);
    setAddPhone(p.phone);
    setAddAge(p.age);
    setAddGender(p.gender);
    setBookingResults([]);
    setBookingSearch('');
  };

  const toggleCondition = (c: string) => {
    setAddConditions(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const addCustom = () => {
    if (!addCustomCondition.trim()) return;
    if (!addConditions.includes(addCustomCondition.trim())) {
      setAddConditions(prev => [...prev, addCustomCondition.trim()]);
    }
    setAddCustomCondition('');
  };

  // Save chronic patient
  const savePatient = async () => {
    if (!addName.trim()) { toast.error('Patient name is required'); return; }
    if (!addPhone.trim()) { toast.error('Phone number is required'); return; }
    if (addConditions.length === 0) { toast.error('Select at least one condition'); return; }

    // Check duplicate by phone
    const existing = patients.find(p => p.phone === addPhone.trim());
    if (existing) { toast.error(`${existing.patientName} is already in your chronic care list`); return; }

    setSaving(true);
    try {
      await addDoc(collection(db!, 'doctors', doctorId, 'chronicPatients'), {
        patientName: addName.trim(),
        phone: addPhone.trim(),
        age: addAge.trim(),
        gender: addGender,
        conditions: addConditions,
        notes: addNotes.trim(),
        addedAt: serverTimestamp(),
      });
      toast.success(`${addName.trim()} added to Chronic Care`);
      resetAddForm();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save');
    } finally { setSaving(false); }
  };

  const resetAddForm = () => {
    setShowAddModal(false);
    setAddName(''); setAddPhone(''); setAddAge(''); setAddGender('Male');
    setAddConditions([]); setAddNotes(''); setAddCustomCondition('');
    setBookingSearch(''); setBookingResults([]);
  };

  const removePatient = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db!, 'doctors', doctorId, 'chronicPatients', id));
      toast.success(`${name} removed from Chronic Care`);
    } catch { toast.error('Failed to remove'); }
  };

  // Bulk send notification (FCM + Firestore)
  const sendBulkNotification = async () => {
    if (!bulkTitle.trim() || !bulkMessage.trim()) { toast.error('Title and message are required'); return; }
    const targets = patients.filter(p => selectedForBulk.has(p.id));
    if (targets.length === 0) { toast.error('No patients selected'); return; }

    setBulkSending(true);

    // Upload camp image first (if any)
    let campImageUrl = '';
    if (campImageFile) {
      try {
        campImageUrl = await uploadCampImage();
      } catch { toast.error('Camp image upload failed'); }
    }

    const functions = getFunctions(app!);
    const sendFCM = httpsCallable(functions, 'sendFCMNotification');
    let sent = 0;
    let failed = 0;

    for (const p of targets) {
      try {
        const phone10 = p.phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
        if (phone10.length !== 10) { failed++; continue; }
        const personalizedBody = bulkMessage.trim().replace('{name}', p.patientName);

        // 1. Send FCM push (with image if available)
        let fcmSuccess = false;
        let fcmError: string | undefined;
        try {
          const result: any = await sendFCM({
            userId: `patient_${phone10}`,
            title: bulkTitle.trim(),
            body: personalizedBody,
            data: { type: 'chronic-care', doctorId, doctorName, ...(campImageUrl ? { imageUrl: campImageUrl } : {}) }
          });
          fcmSuccess = result?.data?.success !== false;
          if (!fcmSuccess) fcmError = result?.data?.error;
        } catch (e: any) { fcmError = e?.message || 'FCM failed'; }

        // 2. Store in Firestore with image cards metadata
        try {
          await storeNotification({
            patientPhone: phone10,
            patientName: p.patientName,
            type: 'chronic_care',
            title: bulkTitle.trim(),
            message: personalizedBody,
            bookingId: '',
            doctorId,
            doctorName,
            fcmAttempted: true,
            fcmSuccess,
            fcmError,
            metadata: {
              ...(campImageUrl ? { campImageUrl, campImageLabel: bulkTitle.trim() || 'Camp / Checkup' } : {}),
              ...(platformHealthTip ? { platformImageUrl: platformHealthTip.imageUrl, platformImageLabel: platformHealthTip.name } : {}),
            },
          });
        } catch {}

        sent++;
      } catch { failed++; }
    }

    // Update lastNotifiedAt for sent patients
    for (const p of targets) {
      try {
        await updateDoc(doc(db!, 'doctors', doctorId, 'chronicPatients', p.id), { lastNotifiedAt: serverTimestamp() });
      } catch {}
    }

    toast.success(`Sent to ${sent} patients${failed > 0 ? `, ${failed} failed` : ''}`);
    setShowBulkModal(false);
    setBulkTitle(''); setBulkMessage('');
    setCampImageFile(null); setCampImagePreview('');
    setSelectedForBulk(new Set()); setSelectAll(false);
    setBulkSending(false);
  };

  // Send via WhatsApp (opens wa.me for each patient sequentially)
  const sendViaWhatsApp = () => {
    if (!bulkMessage.trim()) { toast.error('Message is required'); return; }
    const targets = patients.filter(p => selectedForBulk.has(p.id));
    if (targets.length === 0) { toast.error('No patients selected'); return; }

    // Open WhatsApp for each patient with 500ms delay to prevent browser blocking
    let delay = 0;
    for (const p of targets) {
      const phone10 = p.phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
      if (phone10.length !== 10) continue;
      const personalizedMsg = bulkMessage.trim().replace('{name}', p.patientName);
      const fullMsg = bulkTitle.trim() ? `*${bulkTitle.trim()}*\n\n${personalizedMsg}` : personalizedMsg;
      const waUrl = `https://wa.me/91${phone10}?text=${encodeURIComponent(fullMsg)}`;
      setTimeout(() => window.open(waUrl, '_blank', 'noreferrer'), delay);
      delay += 500;
    }

    // Update lastNotifiedAt
    for (const p of targets) {
      updateDoc(doc(db!, 'doctors', doctorId, 'chronicPatients', p.id), { lastNotifiedAt: serverTimestamp() }).catch(() => {});
    }

    toast.success(`Opening WhatsApp for ${targets.length} patient${targets.length > 1 ? 's' : ''}`);
    setShowBulkModal(false);
    setBulkTitle(''); setBulkMessage('');
    setSelectedForBulk(new Set()); setSelectAll(false);
  };

  // Toggle select all (filtered)
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedForBulk(new Set());
      setSelectAll(false);
    } else {
      setSelectedForBulk(new Set(filteredPatients.map(p => p.id)));
      setSelectAll(true);
    }
  };

  const filteredPatients = filterCondition
    ? patients.filter(p => p.conditions.includes(filterCondition))
    : patients;

  // Get unique conditions from all patients
  const allConditions = [...new Set(patients.flatMap(p => p.conditions))].sort();

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        doctorName={doctorName}
        onMenuChange={onMenuChange}
        onLogout={onLogout}
        activeMenu="chronic-care"
        activeAddOns={activeAddOns}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-800">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-zinc-800 rounded-lg text-gray-400">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-white">Chronic Care</h1>
          <div className="w-9" />
        </div>

        <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Heart className="w-6 h-6 text-rose-400" /> Chronic Care Databank
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {patients.length} patient{patients.length !== 1 ? 's' : ''} in your chronic care registry
              </p>
            </div>
            <div className="flex gap-2">
              {selectedForBulk.size > 0 && (
                <Button onClick={() => setShowBulkModal(true)} className="bg-purple-500 hover:bg-purple-600 text-white h-9 px-4">
                  <Bell className="w-4 h-4 mr-2" /> Notify ({selectedForBulk.size})
                </Button>
              )}
              <Button onClick={() => setShowAddModal(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 px-4">
                <Plus className="w-4 h-4 mr-2" /> Add Patient
              </Button>
            </div>
          </div>

          {/* Filter + Select All Bar */}
          {patients.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filterCondition}
                  onChange={e => setFilterCondition(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="">All Conditions</option>
                  {allConditions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={toggleSelectAll}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${selectAll ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'border-zinc-700 text-gray-500 hover:text-white'}`}
              >
                {selectAll ? `Deselect All` : `Select All (${filteredPatients.length})`}
              </button>
              <span className="text-[10px] text-gray-600">Showing {filteredPatients.length} of {patients.length}</span>
            </div>
          )}

          {/* Patient List */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filteredPatients.length === 0 ? (
            <Card className="bg-zinc-900/50 border-zinc-800 p-8 text-center">
              <Heart className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">{filterCondition ? 'No patients with this condition' : 'No chronic patients added yet'}</p>
              <p className="text-[10px] text-gray-600 mt-1">Add patients from your bookings or manually to start building your chronic care registry</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredPatients.map(p => (
                <Card
                  key={p.id}
                  className={`bg-zinc-900/50 border-zinc-800 p-4 transition-colors ${selectedForBulk.has(p.id) ? 'border-purple-500/50 bg-purple-500/5' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => {
                        const next = new Set(selectedForBulk);
                        if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                        setSelectedForBulk(next);
                        setSelectAll(next.size === filteredPatients.length);
                      }}
                      className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedForBulk.has(p.id) ? 'bg-purple-500 border-purple-500' : 'border-zinc-600 hover:border-purple-400'}`}
                    >
                      {selectedForBulk.has(p.id) && <span className="text-white text-xs">✓</span>}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{p.patientName}</span>
                        {p.age && <span className="text-[10px] text-gray-500">{p.age}Y</span>}
                        <span className="text-[10px] text-gray-500">{p.gender}</span>
                        <span className="text-[10px] text-gray-600">• {p.phone}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.conditions.map(c => (
                          <span key={c} className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[10px] font-medium">{c}</span>
                        ))}
                      </div>
                      {p.notes && <p className="text-[10px] text-gray-500 mt-1">{p.notes}</p>}
                      {p.lastNotifiedAt?.toDate && (
                        <p className="text-[10px] text-gray-600 mt-1">Last notified: {p.lastNotifiedAt.toDate().toLocaleDateString('en-IN')}</p>
                      )}
                    </div>

                    <button
                      onClick={() => removePatient(p.id, p.patientName)}
                      className="p-1.5 hover:bg-red-500/20 rounded text-gray-600 hover:text-red-400 flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ADD PATIENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-zinc-600 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Add Chronic Patient</h3>
              <button onClick={resetAddForm} className="p-1 hover:bg-zinc-700 rounded text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search from bookings */}
            <div className="mb-4">
              <Label className="text-gray-500 text-[10px] uppercase">Search from your past bookings</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={bookingSearch}
                  onChange={e => setBookingSearch(e.target.value)}
                  placeholder="Patient name or phone..."
                  className="bg-zinc-800 border-zinc-700 text-white flex-1"
                  onKeyDown={e => e.key === 'Enter' && searchBookings()}
                />
                <Button onClick={searchBookings} disabled={searchingBookings} size="sm" className="bg-zinc-700 hover:bg-zinc-600 text-white px-3">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              {bookingResults.length > 0 && (
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {bookingResults.map((r, i) => (
                    <button key={i} onClick={() => selectBookingPatient(r)} className="w-full text-left p-2 bg-zinc-800/50 rounded text-xs text-white hover:bg-zinc-700 transition-colors">
                      {r.name} • {r.phone} {r.age ? `• ${r.age}Y` : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manual entry */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-500 text-[10px]">Name *</Label>
                  <Input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Full name" className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-gray-500 text-[10px]">Phone *</Label>
                  <Input value={addPhone} onChange={e => setAddPhone(e.target.value)} placeholder="10-digit mobile" className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-gray-500 text-[10px]">Age</Label>
                  <Input value={addAge} onChange={e => setAddAge(e.target.value)} placeholder="e.g. 55" className="bg-zinc-800 border-zinc-700 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-gray-500 text-[10px]">Gender</Label>
                  <select value={addGender} onChange={e => setAddGender(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm mt-1">
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              {/* Conditions */}
              <div>
                <Label className="text-gray-500 text-[10px] uppercase">Chronic Conditions * (select one or more)</Label>
                <div className="flex flex-wrap gap-1.5 mt-2 max-h-40 overflow-y-auto">
                  {CHRONIC_CONDITIONS.map(c => (
                    <button
                      key={c}
                      onClick={() => toggleCondition(c)}
                      className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${addConditions.includes(c) ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' : 'border-zinc-700 text-gray-500 hover:text-white hover:border-zinc-500'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={addCustomCondition}
                    onChange={e => setAddCustomCondition(e.target.value)}
                    placeholder="Custom condition..."
                    className="bg-zinc-800 border-zinc-700 text-white text-xs flex-1"
                    onKeyDown={e => e.key === 'Enter' && addCustom()}
                  />
                  <Button onClick={addCustom} size="sm" variant="outline" className="border-zinc-700 text-gray-400 px-3 h-8">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                {addConditions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {addConditions.map(c => (
                      <span key={c} className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] flex items-center gap-1">
                        {c}
                        <button onClick={() => toggleCondition(c)} className="hover:text-white">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-gray-500 text-[10px]">Notes (optional)</Label>
                <textarea
                  value={addNotes}
                  onChange={e => setAddNotes(e.target.value)}
                  placeholder="Any specific notes about this patient's condition..."
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm mt-1 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button onClick={resetAddForm} variant="ghost" className="flex-1 text-gray-400">Cancel</Button>
              <Button onClick={savePatient} disabled={saving} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold">
                {saving ? 'Saving...' : <><Heart className="w-4 h-4 mr-2" /> Add to Chronic Care</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* BULK NOTIFICATION MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-zinc-600 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Send Notification</h3>
                <p className="text-xs text-gray-400">To {selectedForBulk.size} chronic care patient{selectedForBulk.size !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="p-1 hover:bg-zinc-700 rounded text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-gray-500 text-[10px]">Notification Title</Label>
                <Input
                  value={bulkTitle}
                  onChange={e => setBulkTitle(e.target.value)}
                  placeholder="e.g. Free Diabetes Camp, Monthly Checkup Reminder"
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-500 text-[10px]">Message (use {'{name}'} for patient name)</Label>
                <textarea
                  value={bulkMessage}
                  onChange={e => setBulkMessage(e.target.value)}
                  placeholder="Dear {name}, we are organizing a free diabetes screening camp on..."
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm mt-1 resize-none"
                />
              </div>

              {/* IMAGE CARDS SECTION */}
              <div className="border border-zinc-700 rounded-lg p-3 space-y-3">
                <p className="text-[10px] text-gray-500 uppercase font-medium">Image Cards (shown in patient dashboard)</p>

                {/* Card 1: Doctor's Camp Poster */}
                <div>
                  <Label className="text-gray-400 text-[10px] flex items-center gap-1">
                    <span className="text-rose-400">●</span> Your Camp Poster / Template
                  </Label>
                  {campImagePreview ? (
                    <div className="relative mt-1">
                      <img src={campImagePreview} alt="Camp" className="w-full h-28 object-cover rounded-lg border border-zinc-700" />
                      <button
                        onClick={() => { setCampImageFile(null); setCampImagePreview(''); }}
                        className="absolute top-1 right-1 p-1 bg-black/70 rounded-full hover:bg-red-500/50"
                      >
                        <Trash className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="mt-1 flex items-center justify-center gap-2 h-16 bg-zinc-800/50 border border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-rose-500/50 hover:bg-rose-500/5 transition-colors">
                      <ImagePlus className="w-4 h-4 text-gray-500" />
                      <span className="text-xs text-gray-500">Upload camp poster (optional, max 5MB)</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleCampImageSelect} />
                    </label>
                  )}
                </div>

                {/* Card 2: Platform Health Tip */}
                <div>
                  <Label className="text-gray-400 text-[10px] flex items-center gap-1">
                    <span className="text-emerald-400">●</span> HealQR Health Tip (auto-attached)
                  </Label>
                  {platformHealthTip ? (
                    <div className="mt-1 relative">
                      <img src={platformHealthTip.imageUrl} alt="Health Tip" className="w-full h-28 object-cover rounded-lg border border-zinc-700" />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 rounded-b-lg">
                        <p className="text-[10px] text-emerald-400 font-medium">{platformHealthTip.name}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 h-16 bg-zinc-800/50 border border-dashed border-zinc-700 rounded-lg flex items-center justify-center">
                      <span className="text-[10px] text-gray-600">No health tips published yet</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-gray-600 mt-3">Push = app notification + image cards in patient dashboard. WhatsApp = opens your WhatsApp for each patient.</p>

            <div className="flex flex-col gap-2 mt-3">
              <Button
                onClick={sendBulkNotification}
                disabled={bulkSending || !bulkTitle.trim() || !bulkMessage.trim()}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold"
              >
                {bulkSending ? (campImageUploading ? 'Uploading image...' : 'Sending...') : <><Send className="w-4 h-4 mr-2" /> Push Notify {selectedForBulk.size} Patients</>}
              </Button>
              <Button
                onClick={sendViaWhatsApp}
                disabled={bulkSending || !bulkMessage.trim()}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp {selectedForBulk.size} Patients
              </Button>
              <Button onClick={() => setShowBulkModal(false)} variant="ghost" className="w-full text-gray-400">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
