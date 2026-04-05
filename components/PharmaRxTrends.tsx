import { useState, useEffect, useMemo, useRef } from 'react';
import { FlaskConical, Download, Lock, TrendingUp, MapPin, Stethoscope, BarChart3, AlertTriangle, RefreshCw, Calendar, ChevronDown, X, Send, Unlock } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, getDocs, query, where, doc, getDoc, addDoc, updateDoc, serverTimestamp, orderBy, Timestamp } from 'firebase/firestore';
import { getZoneFromState } from '../utils/pincodeMapping';

interface PharmaRxTrendsProps {
  companyId: string;
}

interface MoleculeData {
  medicineName: string;
  dosage: string;
  frequency: string;
  doctorId: string;
  specialty: string;
  state: string;
  pincode: string;
  companyName: string;
  division: string;
  diagnosis: string;
  territory: string;
  createdAt: any;
}

interface ExtractionRecord {
  id: string;
  extractedAt: any;
  fromDate: string;
  toDate: string;
  rxCount: number;
  prescriptionCount: number;
  moleculeCount: number;
  topMolecules: { name: string; count: number }[];
  states: string[];
  pincodes: string[];
  specialties: string[];
  type: 'free' | 'approved';
}

interface UnlockRequest {
  id: string;
  companyId: string;
  companyName: string;
  fromDate: string;
  toDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'used';
  requestedAt: any;
  approvedAt: any;
}

interface MoleculeSummary {
  name: string;
  count: number;
  states: Record<string, number>;
  specialties: Record<string, number>;
  zones: Record<string, number>;
}

// ==================== Multi-Select Dropdown ====================
function MultiSelectDropdown({ label, options, selected, onChange }: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white hover:bg-zinc-800 min-w-[180px] w-full"
      >
        <span className="flex-1 text-left truncate">
          {selected.length === 0 ? label : `${selected.length} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && options.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl">
          <div className="flex gap-3 p-2 border-b border-zinc-800 sticky top-0 bg-zinc-900">
            <button onClick={() => onChange([...options])} className="text-xs text-emerald-400 hover:underline">Select All</button>
            <button onClick={() => onChange([])} className="text-xs text-red-400 hover:underline">Clear</button>
          </div>
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="rounded border-zinc-600 accent-purple-500"
              />
              <span className="text-gray-300 truncate">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== CSV Generation ====================
function groupIntoPrescriptions(data: MoleculeData[]): MoleculeData[][] {
  const sorted = [...data].sort((a, b) => {
    const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
    const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
    return aTime - bTime;
  });

  const groups: MoleculeData[][] = [];
  let currentGroup: MoleculeData[] = [];

  for (const record of sorted) {
    if (currentGroup.length === 0) {
      currentGroup.push(record);
      continue;
    }
    const lastRecord = currentGroup[currentGroup.length - 1];
    const timeDiff = Math.abs(
      (record.createdAt?.toDate?.()?.getTime() || 0) -
      (lastRecord.createdAt?.toDate?.()?.getTime() || 0)
    );
    if (record.doctorId === lastRecord.doctorId && timeDiff < 5000) {
      currentGroup.push(record);
    } else {
      groups.push(currentGroup);
      currentGroup = [record];
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);
  return groups;
}

function generateCSV(prescriptions: MoleculeData[][]): string {
  if (prescriptions.length === 0) return '';
  const maxProducts = Math.max(...prescriptions.map(p => p.length));
  const productHeaders = Array.from({ length: maxProducts }, (_, i) => `Product ${i + 1}`);
  const headers = ['Date', 'Territory', 'Pincode', 'Specialty', 'Diagnosis', ...productHeaders];

  const rows = prescriptions.map(group => {
    const first = group[0];
    const date = first.createdAt?.toDate?.()?.toISOString().split('T')[0] || '';
    const products = group.map(r => r.medicineName);
    while (products.length < maxProducts) products.push('');
    return [date, first.state || '', first.pincode || '', first.specialty || '', first.diagnosis || '', ...products]
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// ==================== Main Component ====================
export default function PharmaRxTrends({ companyId }: PharmaRxTrendsProps) {
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [moleculeData, setMoleculeData] = useState<MoleculeData[]>([]);
  const [extractions, setExtractions] = useState<ExtractionRecord[]>([]);
  const [unlockRequests, setUnlockRequests] = useState<UnlockRequest[]>([]);
  const [companyInfo, setCompanyInfo] = useState<{ companyName: string; lastLockedDate: Date | null; territoryStates: string[]; territorySpecialties: Record<string, string[]>; specialties: string[]; rxAccessGranted?: boolean; rxAccessUntil?: Date | null } | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'extract' | 'history'>('overview');
  const [distributedPincodes, setDistributedPincodes] = useState<string[]>([]);
  const [distributedSpecialties, setDistributedSpecialties] = useState<string[]>([]);
  const [accessRequested, setAccessRequested] = useState(false);

  // Extraction form state
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedPincodes, setSelectedPincodes] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'free-suggest' | 'locked' | 'partial'>('free-suggest');

  useEffect(() => { loadData(); }, [companyId]);

  const loadData = async () => {
    if (!companyId || !db) return;
    setLoading(true);
    try {
      const companyDoc = await getDoc(doc(db, 'pharmaCompanies', companyId));
      if (companyDoc.exists()) {
        const d = companyDoc.data();
        const lld = d.lastLockedDate?.toDate?.() || null;
        setCompanyInfo({
          companyName: d.companyName || '',
          lastLockedDate: lld,
          territoryStates: d.territoryStates || [],
          territorySpecialties: d.territorySpecialties || {},
          specialties: d.specialties || [],
          rxAccessGranted: d.rxAccessGranted === true,
          rxAccessUntil: d.rxAccessUntil?.toDate?.() || null,
        });
      }

      // Load distributed doctors for pincodes & specialties
      const distDocs = await getDocs(collection(db, 'pharmaCompanies', companyId, 'distributedDoctors'));
      const pins = new Set<string>();
      const specs = new Set<string>();
      distDocs.docs.forEach(d => {
        const data = d.data();
        if (data.pincode) pins.add(data.pincode);
        if (data.pinCode) pins.add(data.pinCode);
        if (data.specialty) specs.add(data.specialty);
      });
      setDistributedPincodes([...pins].sort());
      setDistributedSpecialties([...specs].sort());

      const q = query(collection(db, 'rxMoleculeData'), where('companyName', '==', companyDoc.data()?.companyName || ''));
      const snap = await getDocs(q);
      setMoleculeData(snap.docs.map(d => d.data() as MoleculeData));

      const extSnap = await getDocs(query(
        collection(db, 'pharmaCompanies', companyId, 'rxExtractions'),
        orderBy('extractedAt', 'desc')
      ));
      setExtractions(extSnap.docs.map(d => ({ id: d.id, ...d.data() } as ExtractionRecord)));

      // Load unlock requests
      const reqSnap = await getDocs(query(
        collection(db, 'extractionRequests'),
        where('companyId', '==', companyId),
        orderBy('requestedAt', 'desc')
      ));
      setUnlockRequests(reqSnap.docs.map(d => ({ id: d.id, ...d.data() } as UnlockRequest)));

      // Check if rx access was already requested
      try {
        const rxAccSnap = await getDocs(query(
          collection(db, 'rxAccessRequests'),
          where('companyId', '==', companyId),
          orderBy('requestedAt', 'desc')
        ));
        const pending = rxAccSnap.docs.find(d => d.data().status === 'pending' && d.data().type === 'page-access');
        if (pending) setAccessRequested(true);
      } catch (rxAccErr) {
        console.error('Error loading rx access requests:', rxAccErr);
      }
    } catch (err) {
      console.error('Error loading Rx trends:', err);
    } finally {
      setLoading(false);
    }
  };

  // Request page access
  const handleRequestAccess = async () => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'rxAccessRequests'), {
        companyId,
        companyName: companyInfo?.companyName || '',
        type: 'page-access',
        status: 'pending',
        requestedAt: serverTimestamp(),
      });
      setAccessRequested(true);
      alert('Access request sent! Admin will review your request.');
    } catch (err) {
      console.error('Request failed:', err);
    }
  };

  // ---- Computed values ----
  const lastLockedDate = companyInfo?.lastLockedDate || null;
  const nextFreeDate = lastLockedDate
    ? new Date(lastLockedDate.getTime() + 24 * 60 * 60 * 1000)
    : null; // null = never extracted, all free
  const nextFreeDateStr = nextFreeDate ? nextFreeDate.toISOString().split('T')[0] : '';

  // Available options — all independent, skip any = all
  const allStates = useMemo(() => (companyInfo?.territoryStates || []).sort(), [companyInfo]);
  const availablePincodes = useMemo(() => {
    const pins = new Set<string>();
    // From rx data
    moleculeData.forEach(m => { if (m.pincode) pins.add(m.pincode); });
    // From distributed doctors
    distributedPincodes.forEach(p => pins.add(p));
    return [...pins].sort();
  }, [moleculeData, distributedPincodes]);
  const allSpecialties = useMemo(() => {
    const specs = new Set<string>();
    // From territorySpecialties map
    Object.values(companyInfo?.territorySpecialties || {}).forEach(arr => arr.forEach(s => specs.add(s)));
    // Fallback to top-level specialties array
    (companyInfo?.specialties || []).forEach(s => specs.add(s));
    // From distributed doctors
    distributedSpecialties.forEach(s => specs.add(s));
    return [...specs].sort();
  }, [companyInfo, distributedSpecialties]);

  // Reverse lookup: pincode → state (for auto-fixing territory on pincode selection)
  const pincodeToState = useMemo(() => {
    const map: Record<string, string> = {};
    moleculeData.forEach(m => { if (m.pincode && m.state) map[m.pincode] = m.state; });
    return map;
  }, [moleculeData]);

  const handlePincodeChange = (pincodes: string[]) => {
    setSelectedPincodes(pincodes);
    // Auto-fix territory based on selected pincodes
    if (pincodes.length > 0) {
      const statesFromPincodes = [...new Set(pincodes.map(p => pincodeToState[p]).filter(Boolean))];
      setSelectedStates(statesFromPincodes);
    }
  };

  // Filtered data based on extraction form
  const filteredData = useMemo(() => {
    if (!fromDate || !toDate) return [];
    const from = new Date(fromDate + 'T00:00:00');
    const to = new Date(toDate + 'T23:59:59');
    return moleculeData.filter(m => {
      const d = m.createdAt?.toDate?.();
      if (!d || d < from || d > to) return false;
      if (selectedStates.length > 0 && !selectedStates.includes(m.state)) return false;
      if (selectedPincodes.length > 0 && !selectedPincodes.includes(m.pincode)) return false;
      if (selectedSpecialties.length > 0 && !selectedSpecialties.includes(m.specialty)) return false;
      return true;
    });
  }, [moleculeData, fromDate, toDate, selectedStates, selectedPincodes, selectedSpecialties]);

  const prescriptionGroups = useMemo(() => groupIntoPrescriptions(filteredData), [filteredData]);

  // Overview tab molecule summaries (all-time, no date filter)
  const moleculeSummaries = useMemo(() => {
    const map: Record<string, MoleculeSummary> = {};
    moleculeData.forEach(m => {
      const name = (m.medicineName || '').toUpperCase().trim();
      if (!name) return;
      if (!map[name]) map[name] = { name, count: 0, states: {}, specialties: {}, zones: {} };
      map[name].count++;
      if (m.state) map[name].states[m.state] = (map[name].states[m.state] || 0) + 1;
      if (m.specialty) map[name].specialties[m.specialty] = (map[name].specialties[m.specialty] || 0) + 1;
      const zone = getZoneFromState(m.state);
      if (zone) map[name].zones[zone] = (map[name].zones[zone] || 0) + 1;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [moleculeData]);

  const totalRxCount = useMemo(() => {
    const rxSet = new Set<string>();
    moleculeData.forEach(m => {
      const dateStr = m.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || 'unknown';
      rxSet.add(`${m.doctorId}_${dateStr}`);
    });
    return rxSet.size;
  }, [moleculeData]);

  // ---- Period status check ----
  function checkPeriodStatus(from: string, to: string): 'free' | 'locked' | 'partial' {
    if (!nextFreeDate) return 'free'; // Never extracted
    const fromD = new Date(from);
    const toD = new Date(to);
    if (fromD >= nextFreeDate) return 'free';
    if (toD < nextFreeDate) return 'locked';
    return 'partial';
  }

  // Check for approved unlock request covering the date range
  function getApprovedRequest(from: string, to: string): UnlockRequest | null {
    return unlockRequests.find(r =>
      r.status === 'approved' && r.fromDate <= from && r.toDate >= to
    ) || null;
  }

  // ---- Extraction handler ----
  const handleExtractClick = () => {
    if (!fromDate || !toDate || !db) return;
    const status = checkPeriodStatus(fromDate, toDate);
    const approved = getApprovedRequest(fromDate, toDate);

    if (status === 'free') {
      // Check if they could include more free data by extending fromDate to nextFreeDate
      if (nextFreeDate && new Date(fromDate) > nextFreeDate) {
        setModalType('free-suggest');
        setShowModal(true);
      } else {
        doExtract('free');
      }
    } else if (approved) {
      doExtract('approved', approved.id);
    } else if (status === 'locked') {
      setModalType('locked');
      setShowModal(true);
    } else {
      setModalType('partial');
      setShowModal(true);
    }
  };

  const doExtract = async (type: 'free' | 'approved', requestId?: string) => {
    if (extracting || !db) return;
    setExtracting(true);
    setShowModal(false);
    try {
      const csv = generateCSV(prescriptionGroups);
      const uniqueMeds = new Set(filteredData.map(m => (m.medicineName || '').toUpperCase().trim())).size;
      const top = [...new Map(filteredData.map(m => [(m.medicineName || '').toUpperCase().trim(), 0])).entries()]
        .map(([name]) => {
          const count = filteredData.filter(m => (m.medicineName || '').toUpperCase().trim() === name).length;
          return { name, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      // Save extraction record
      await addDoc(collection(db, 'pharmaCompanies', companyId, 'rxExtractions'), {
        extractedAt: serverTimestamp(),
        fromDate,
        toDate,
        rxCount: filteredData.length,
        prescriptionCount: prescriptionGroups.length,
        moleculeCount: uniqueMeds,
        topMolecules: top,
        states: selectedStates,
        pincodes: selectedPincodes,
        specialties: selectedSpecialties,
        type,
        requestId: requestId || null,
        companyName: companyInfo?.companyName || '',
      });

      // Update lastLockedDate if this extraction extends it
      if (type === 'free') {
        const newLockedDate = new Date(toDate + 'T23:59:59');
        if (!lastLockedDate || newLockedDate > lastLockedDate) {
          await updateDoc(doc(db, 'pharmaCompanies', companyId), {
            lastLockedDate: Timestamp.fromDate(newLockedDate),
          });
        }
      }

      // Mark request as used
      if (requestId) {
        await updateDoc(doc(db, 'extractionRequests', requestId), { status: 'used', usedAt: serverTimestamp() });
      }

      // Download CSV
      if (csv) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rx-trends-${fromDate}-to-${toDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      await loadData();
    } catch (err) {
      console.error('Extraction failed:', err);
    } finally {
      setExtracting(false);
    }
  };

  const doExtractFreeOnly = async () => {
    if (!nextFreeDateStr) return;
    setFromDate(nextFreeDateStr);
    // Slight delay to let state update
    setTimeout(() => doExtract('free'), 100);
  };

  // ---- Request unlock ----
  const handleRequestUnlock = async () => {
    if (!db || !fromDate || !toDate) return;
    try {
      await addDoc(collection(db, 'extractionRequests'), {
        companyId,
        companyName: companyInfo?.companyName || '',
        fromDate,
        toDate,
        states: selectedStates,
        pincodes: selectedPincodes,
        specialties: selectedSpecialties,
        status: 'pending',
        requestedAt: serverTimestamp(),
      });
      setShowModal(false);
      await loadData();
      alert('Unlock request sent! Admin will review and approve.');
    } catch (err) {
      console.error('Request failed:', err);
    }
  };

  const maxCount = moleculeSummaries.length > 0 ? moleculeSummaries[0].count : 1;
  const pendingRequests = unlockRequests.filter(r => r.status === 'pending');
  const approvedRequests = unlockRequests.filter(r => r.status === 'approved');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  // ====== ACCESS GATE ======
  if (!companyInfo?.rxAccessGranted) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Rx Trends — Premium Access</h2>
            <p className="text-sm text-gray-400">
              Access to Rx prescription trends requires admin approval.
              This data includes anonymized product prescribing patterns, specialties, and territory distribution.
            </p>
          </div>
          {accessRequested ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <p className="text-amber-400 font-medium text-sm">Access request pending — admin will review your request.</p>
            </div>
          ) : (
            <button
              onClick={handleRequestAccess}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
            >
              <Send className="w-4 h-4" />
              Request Access
            </button>
          )}
        </div>
      </div>
    );
  }

  // Check if access has expired
  if (companyInfo?.rxAccessUntil && companyInfo.rxAccessUntil < new Date()) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Rx Trends — Access Expired</h2>
            <p className="text-sm text-gray-400">
              Your access expired on {companyInfo.rxAccessUntil.toLocaleDateString('en-IN')}. Please request renewal.
            </p>
          </div>
          {accessRequested ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <p className="text-amber-400 font-medium text-sm">Renewal request pending — admin will review.</p>
            </div>
          ) : (
            <button
              onClick={handleRequestAccess}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
            >
              <Send className="w-4 h-4" />
              Request Renewal
            </button>
          )}
        </div>
      </div>
    );
  }

  // ==================== RENDER ====================
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Access validity banner */}
      {companyInfo?.rxAccessUntil && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-400" />
          <p className="text-sm text-purple-400">Access valid until: <strong>{companyInfo.rxAccessUntil.toLocaleDateString('en-IN')}</strong></p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-purple-400" />
            Rx Trends
          </h2>
          <p className="text-sm text-gray-400 mt-1">Aggregated product data from AI RX decodes in your territory</p>
        </div>
        <div className="flex gap-2">
          {['overview', 'extract', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setViewMode(tab as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                viewMode === tab ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
              }`}
            >
              {tab === 'extract' ? 'Extract Report' : tab === 'history' ? 'History' : 'Overview'}
            </button>
          ))}
        </div>
      </div>

      {/* Free Period Banner */}
      <div className={`rounded-xl p-4 border flex items-center gap-3 ${
        nextFreeDate ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-purple-500/10 border-purple-500/30'
      }`}>
        <Calendar className={`w-5 h-5 ${nextFreeDate ? 'text-emerald-400' : 'text-purple-400'}`} />
        <div>
          {nextFreeDate ? (
            <>
              <p className="text-sm font-medium text-emerald-400">
                Next free extraction available from: {nextFreeDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Data locked up to: {lastLockedDate?.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-purple-400">
              All data available for free extraction — no previous downloads
            </p>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">Total Rx Records</p>
          <p className="text-3xl font-bold text-purple-400">{moleculeData.length.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">Unique Products</p>
          <p className="text-3xl font-bold text-blue-400">{moleculeSummaries.length}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">AI RX Prescriptions</p>
          <p className="text-3xl font-bold text-emerald-400">{totalRxCount}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">Extractions Done</p>
          <p className="text-3xl font-bold text-amber-400">{extractions.length}</p>
        </div>
      </div>

      {/* ====== OVERVIEW TAB ====== */}
      {viewMode === 'overview' && (
        <>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                Product Rankings
              </h3>
              <p className="text-xs text-gray-500 mt-1">Top prescribed products across your territory (all time)</p>
            </div>
            <div className="divide-y divide-zinc-800">
              {moleculeSummaries.length === 0 ? (
                <div className="p-8 text-center">
                  <AlertTriangle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No product data available yet</p>
                  <p className="text-xs text-gray-600 mt-1">Data will appear as doctors use the AI RX Reader</p>
                </div>
              ) : (
                moleculeSummaries.slice(0, 30).map((mol, idx) => {
                  const topState = Object.entries(mol.states).sort(([, a], [, b]) => b - a)[0];
                  const topSpec = Object.entries(mol.specialties).sort(([, a], [, b]) => b - a)[0];
                  return (
                    <div key={mol.name} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx < 3 ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-gray-500'
                          }`}>{idx + 1}</span>
                          <div>
                            <p className="text-sm font-medium">{mol.name}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                              {topState && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{topState[0]} ({topState[1]})</span>}
                              {topSpec && <span className="flex items-center gap-1"><Stethoscope className="w-3 h-3" />{topSpec[0]} ({topSpec[1]})</span>}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-bold font-mono text-purple-400">{mol.count}</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full" style={{ width: `${(mol.count / maxCount) * 100}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Zone Distribution */}
          {moleculeSummaries.length > 0 && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800">
              <div className="p-4 border-b border-zinc-800">
                <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-amber-400" /> Zone-wise Top Products</h3>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(() => {
                  const zoneMap: Record<string, Record<string, number>> = {};
                  moleculeData.forEach(m => {
                    const zone = getZoneFromState(m.state);
                    if (!zoneMap[zone]) zoneMap[zone] = {};
                    const name = (m.medicineName || '').toUpperCase().trim();
                    if (name) zoneMap[zone][name] = (zoneMap[zone][name] || 0) + 1;
                  });
                  return Object.entries(zoneMap)
                    .sort(([, a], [, b]) => Object.values(b).reduce((s, v) => s + v, 0) - Object.values(a).reduce((s, v) => s + v, 0))
                    .map(([zone, mols]) => {
                      const top3 = Object.entries(mols).sort(([, a], [, b]) => b - a).slice(0, 3);
                      return (
                        <div key={zone} className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                          <p className="text-sm font-semibold text-amber-400 mb-2">{zone}</p>
                          <div className="space-y-1.5">
                            {top3.map(([name, count], i) => (
                              <div key={name} className="flex items-center justify-between text-xs">
                                <span className="text-gray-300 truncate flex-1">{i + 1}. {name}</span>
                                <span className="text-gray-500 font-mono ml-2">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                })()}
              </div>
            </div>
          )}
        </>
      )}

      {/* ====== EXTRACT REPORT TAB ====== */}
      {viewMode === 'extract' && (
        <div className="space-y-6">
          {/* Approved requests banner */}
          {approvedRequests.length > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <p className="text-sm text-emerald-400 font-medium flex items-center gap-2">
                <Unlock className="w-4 h-4" />
                You have {approvedRequests.length} approved unlock request(s). Select the matching date range to use it.
              </p>
            </div>
          )}

          {/* Pending requests */}
          {pendingRequests.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <p className="text-sm text-amber-400">
                Pending unlock request(s): {pendingRequests.map(r => `${r.fromDate} to ${r.toDate}`).join(', ')}
              </p>
            </div>
          )}

          {/* Extraction Form */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 space-y-5">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-purple-400" />
              Configure Extraction
            </h3>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                />
              </div>
            </div>

            {/* Territory & Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Territory (States)</label>
                <MultiSelectDropdown label="All States" options={allStates} selected={selectedStates} onChange={setSelectedStates} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Pin Codes</label>
                <MultiSelectDropdown
                  label="All Pincodes"
                  options={availablePincodes}
                  selected={selectedPincodes}
                  onChange={handlePincodeChange}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Specialties</label>
                <MultiSelectDropdown label="All Specialties" options={allSpecialties} selected={selectedSpecialties} onChange={setSelectedSpecialties} />
              </div>
            </div>

            {/* Preview */}
            {fromDate && toDate && (
              <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">AI RX Prescriptions</p>
                    <p className="text-white font-bold text-lg">{prescriptionGroups.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Total Medicine Records</p>
                    <p className="text-white font-bold text-lg">{filteredData.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Unique Products</p>
                    <p className="text-white font-bold text-lg">{new Set(filteredData.map(m => (m.medicineName || '').toUpperCase().trim())).size}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Period Status</p>
                    {(() => {
                      const status = checkPeriodStatus(fromDate, toDate);
                      const approved = getApprovedRequest(fromDate, toDate);
                      if (status === 'free') return <p className="text-emerald-400 font-bold">FREE</p>;
                      if (approved) return <p className="text-emerald-400 font-bold">APPROVED</p>;
                      if (status === 'locked') return <p className="text-red-400 font-bold">LOCKED</p>;
                      return <p className="text-amber-400 font-bold">PARTIAL</p>;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Extract Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleExtractClick}
                disabled={!fromDate || !toDate || filteredData.length === 0 || extracting}
                className={`px-6 py-3 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                  fromDate && toDate && filteredData.length > 0
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-zinc-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                {extracting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {extracting ? 'Extracting...' : 'Extract & Download CSV'}
              </button>
              {fromDate && toDate && filteredData.length === 0 && (
                <p className="text-xs text-gray-500">No data found for selected filters</p>
              )}
            </div>
          </div>

          {/* CSV Format Info */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <p className="text-xs text-gray-500">
              <strong className="text-gray-400">CSV Format:</strong> Date | Territory | Pincode | Specialty | Diagnosis | Product 1 | Product 2 | ... Product N
              <br />Each row represents one prescription event. Products are listed as written by the doctor.
            </p>
          </div>
        </div>
      )}

      {/* ====== HISTORY TAB ====== */}
      {viewMode === 'history' && (
        <div className="space-y-4">
          {/* Extraction History */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="font-semibold flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                Extraction History
              </h3>
            </div>
            {extractions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No extractions yet</p>
                <p className="text-xs mt-1">Go to &quot;Extract Report&quot; tab to download your first report</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {extractions.map(ext => (
                  <div key={ext.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {ext.fromDate || '?'} → {ext.toDate || '?'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {ext.prescriptionCount || ext.rxCount} prescriptions • {ext.moleculeCount} products •
                          <span className={ext.type === 'free' ? ' text-emerald-400' : ' text-amber-400'}> {ext.type?.toUpperCase() || 'FREE'}</span>
                        </p>
                        {ext.states?.length > 0 && (
                          <p className="text-xs text-gray-600 mt-0.5">States: {ext.states.join(', ')}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-600">
                        {ext.extractedAt?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) || ''}
                      </span>
                    </div>
                    {ext.topMolecules?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {ext.topMolecules.slice(0, 5).map(m => (
                          <span key={m.name} className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-lg">
                            {m.name} ({m.count})
                          </span>
                        ))}
                        {ext.topMolecules.length > 5 && (
                          <span className="px-2 py-1 bg-zinc-800 text-gray-500 text-xs rounded-lg">
                            +{ext.topMolecules.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unlock Requests */}
          {unlockRequests.length > 0 && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800">
              <div className="p-4 border-b border-zinc-800">
                <h3 className="font-semibold flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-400" />
                  Unlock Requests
                </h3>
              </div>
              <div className="divide-y divide-zinc-800">
                {unlockRequests.map(req => (
                  <div key={req.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">{req.fromDate} → {req.toDate}</p>
                      <p className="text-xs text-gray-500">
                        Requested: {req.requestedAt?.toDate?.()?.toLocaleDateString('en-IN') || '?'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      req.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                      req.status === 'used' ? 'bg-gray-500/20 text-gray-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {req.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Privacy Notice */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
        <p className="text-sm text-purple-400">
          <strong>Aggregate Data Only:</strong> Product trends are aggregated from prescription data. No individual patient or prescription data is shared.
        </p>
      </div>

      {/* ====== MODAL ====== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {modalType === 'free-suggest' ? 'Maximize Free Period' :
                 modalType === 'locked' ? 'Period Locked' : 'Partial Free Period'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {modalType === 'free-suggest' && (
              <>
                <p className="text-sm text-gray-300">
                  Your free period starts from <strong className="text-emerald-400">{nextFreeDate?.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>.
                  You selected from <strong>{fromDate}</strong>. You can include more free data by starting from {nextFreeDateStr}.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => doExtract('free')} className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                    Keep My Dates ({fromDate})
                  </button>
                  <button onClick={() => { setFromDate(nextFreeDateStr); doExtract('free'); }} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                    Use Full Free Period ({nextFreeDateStr})
                  </button>
                </div>
              </>
            )}

            {modalType === 'locked' && (
              <>
                <p className="text-sm text-gray-300">
                  Dates <strong className="text-red-400">{fromDate}</strong> to <strong className="text-red-400">{toDate}</strong> are within the already-extracted period
                  (locked up to {lastLockedDate?.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}).
                </p>
                <p className="text-sm text-gray-400">
                  To access this data, request an unlock from admin. Unlock requests will be reviewed and approved.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-zinc-800 text-gray-300 rounded-lg text-sm font-medium hover:bg-zinc-700">
                    Cancel
                  </button>
                  <button onClick={handleRequestUnlock} className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    Request Unlock
                  </button>
                </div>
              </>
            )}

            {modalType === 'partial' && (
              <>
                <p className="text-sm text-gray-300">
                  Dates <strong className="text-red-400">{fromDate}</strong> to <strong className="text-red-400">{new Date((nextFreeDate?.getTime() || 0) - 86400000).toISOString().split('T')[0]}</strong> are locked.
                  <br />Free period: <strong className="text-emerald-400">{nextFreeDateStr}</strong> to <strong className="text-emerald-400">{toDate}</strong>.
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => { setFromDate(nextFreeDateStr); doExtract('free'); }} className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                    Download Free Period Only ({nextFreeDateStr} → {toDate})
                  </button>
                  <button onClick={handleRequestUnlock} className="w-full px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    Request Unlock for Full Range ({fromDate} → {toDate})
                  </button>
                  <button onClick={() => setShowModal(false)} className="w-full px-4 py-2.5 bg-zinc-800 text-gray-400 rounded-lg text-sm hover:bg-zinc-700">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
