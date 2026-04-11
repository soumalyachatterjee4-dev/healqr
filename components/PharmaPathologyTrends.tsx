import { useState, useEffect, useMemo } from 'react';
import { Microscope, Download, Lock, TrendingUp, MapPin, Stethoscope, BarChart3, AlertTriangle, RefreshCw, Calendar, X, Send, Unlock, Clock } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, getDocs, query, where, doc, getDoc, addDoc, updateDoc, serverTimestamp, orderBy, Timestamp } from 'firebase/firestore';
import { checkDateRangeStatus, getOpenWindows, getNextWindow } from '../utils/downloadWindow';

interface PharmaPathologyTrendsProps {
  companyId: string;
}

interface PathologyData {
  testName: string;
  testKey: string;
  testValue: string;
  testUnit: string;
  specialty: string;
  state: string;
  pincode: string;
  diagnosis: string;
  territory: string;
  source: string;
  createdAt: any;
}

interface ExtractionRecord {
  id: string;
  extractedAt: any;
  fromDate: string;
  toDate: string;
  recordCount: number;
  uniqueTests: number;
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
}

interface CompanyInfo {
  companyName: string;
  pathologyAccessGranted?: boolean;
  pathologyAccessUntil?: Date | null;
  pathologyLastLockedDate?: Date | null;
  territoryStates: string[];
}

export default function PharmaPathologyTrends({ companyId }: PharmaPathologyTrendsProps) {
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [pathologyData, setPathologyData] = useState<PathologyData[]>([]);
  const [extractions, setExtractions] = useState<ExtractionRecord[]>([]);
  const [unlockRequests, setUnlockRequests] = useState<UnlockRequest[]>([]);
  const [viewMode, setViewMode] = useState<'overview' | 'extract' | 'history'>('overview');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedPincodes, setSelectedPincodes] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'locked' | 'partial'>('locked');
  const [accessRequested, setAccessRequested] = useState(false);
  const [distributedPincodes, setDistributedPincodes] = useState<string[]>([]);
  const [distributedSpecialties, setDistributedSpecialties] = useState<string[]>([]);

  useEffect(() => { loadData(); }, [companyId]);

  const loadData = async () => {
    if (!db || !companyId) return;
    setLoading(true);
    try {
      const companyDoc = await getDoc(doc(db, 'pharmaCompanies', companyId));
      if (companyDoc.exists()) {
        const d = companyDoc.data();
        const lld = d.pathologyLastLockedDate?.toDate?.() || null;
        setCompanyInfo({
          companyName: d.companyName || '',
          pathologyAccessGranted: d.pathologyAccessGranted === true,
          pathologyAccessUntil: d.pathologyAccessUntil?.toDate?.() || null,
          pathologyLastLockedDate: lld,
          territoryStates: d.territoryStates || [],
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

      // Load pathology data (all — not company-specific since pathology is cross-company)
      const snap = await getDocs(collection(db, 'pathologyMoleculeData'));
      setPathologyData(snap.docs.map(d => d.data() as PathologyData));

      // Load extractions
      const extSnap = await getDocs(query(
        collection(db, 'pharmaCompanies', companyId, 'pathologyExtractions'),
        orderBy('extractedAt', 'desc')
      ));
      setExtractions(extSnap.docs.map(d => ({ id: d.id, ...d.data() } as ExtractionRecord)));

      // Load unlock requests
      const reqSnap = await getDocs(query(
        collection(db, 'pathologyAccessRequests'),
        where('companyId', '==', companyId),
        orderBy('requestedAt', 'desc')
      ));
      setUnlockRequests(reqSnap.docs.map(d => ({ id: d.id, ...d.data() } as UnlockRequest)));

      // Check if access was already requested
      const pending = reqSnap.docs.find(d => d.data().status === 'pending' && d.data().type === 'page-access');
      if (pending) setAccessRequested(true);
    } catch (err) {
      console.error('Error loading pathology trends:', err);
    } finally {
      setLoading(false);
    }
  };

  // ---- Computed values ----
  const lastLockedDate = companyInfo?.pathologyLastLockedDate || null;
  const nextFreeDate = lastLockedDate ? new Date(lastLockedDate.getTime() + 24 * 60 * 60 * 1000) : null;
  const nextFreeDateStr = nextFreeDate ? nextFreeDate.toISOString().split('T')[0] : '';

  const allStates = useMemo(() => (companyInfo?.territoryStates || []).sort(), [companyInfo]);
  const allSpecialties = useMemo(() => {
    const specs = new Set<string>();
    pathologyData.forEach(p => { if (p.specialty) specs.add(p.specialty); });
    distributedSpecialties.forEach(s => specs.add(s));
    return [...specs].sort();
  }, [pathologyData, distributedSpecialties]);
  const allPincodes = useMemo(() => {
    const pins = new Set<string>();
    pathologyData.forEach(p => { if (p.pincode) pins.add(p.pincode); });
    distributedPincodes.forEach(p => pins.add(p));
    return [...pins].sort();
  }, [pathologyData, distributedPincodes]);

  // Apply filters
  const filteredData = useMemo(() => {
    let data = pathologyData;
    if (selectedStates.length > 0) data = data.filter(d => selectedStates.includes(d.state));
    if (selectedPincodes.length > 0) data = data.filter(d => selectedPincodes.includes(d.pincode));
    if (selectedSpecialties.length > 0) data = data.filter(d => selectedSpecialties.includes(d.specialty));
    if (fromDate && toDate) {
      const from = new Date(fromDate + 'T00:00:00');
      const to = new Date(toDate + 'T23:59:59');
      data = data.filter(d => {
        const dt = d.createdAt?.toDate?.();
        return dt && dt >= from && dt <= to;
      });
    }
    return data;
  }, [pathologyData, selectedStates, selectedPincodes, selectedSpecialties, fromDate, toDate]);

  // Test summaries
  const testSummaries = useMemo(() => {
    const map: Record<string, { count: number; states: Record<string, number>; specialties: Record<string, number>; diagnoses: Record<string, number> }> = {};
    filteredData.forEach(p => {
      const name = p.testName.toUpperCase().trim();
      if (!name) return;
      if (!map[name]) map[name] = { count: 0, states: {}, specialties: {}, diagnoses: {} };
      map[name].count++;
      if (p.state) map[name].states[p.state] = (map[name].states[p.state] || 0) + 1;
      if (p.specialty) map[name].specialties[p.specialty] = (map[name].specialties[p.specialty] || 0) + 1;
      if (p.diagnosis) map[name].diagnoses[p.diagnosis] = (map[name].diagnoses[p.diagnosis] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([name, d]) => ({ name, ...d }));
  }, [filteredData]);

  // Period check (monthly window)
  function checkPeriodStatus(from: string, to: string): 'free' | 'locked' | 'partial' {
    const status = checkDateRangeStatus(from, to);
    if (status === 'free') return 'free';
    if (status === 'current-month') return 'locked';
    const approved = getApprovedRequest(from, to);
    if (approved) return 'free';
    return 'locked';
  }

  // Check for approved date-range unlock
  function getApprovedRequest(from: string, to: string): UnlockRequest | null {
    return unlockRequests.find(r =>
      r.status === 'approved' && (r as any).type === 'date-unlock' && (r as any).fromDate <= from && (r as any).toDate >= to
    ) || null;
  }

  // Extract & download CSV
  const handleExtractClick = () => {
    if (!fromDate || !toDate || !db) return;
    const status = checkPeriodStatus(fromDate, toDate);
    const approved = getApprovedRequest(fromDate, toDate);
    if (status === 'free') {
      doExtract(approved ? 'approved' : 'free', approved?.id);
    } else {
      setModalType('locked');
      setShowModal(true);
    }
  };

  const doExtract = async (type: 'free' | 'approved', requestId?: string) => {
    if (extracting || !db) return;
    setExtracting(true);
    setShowModal(false);
    try {
      // Generate CSV (anonymous)
      const headers = ['Date', 'Territory', 'State', 'Pincode', 'Specialty', 'Diagnosis', 'Test Name', 'Test Value', 'Unit'];
      const rows = filteredData.map(r => {
        const date = r.createdAt?.toDate?.() ? r.createdAt.toDate().toISOString().split('T')[0] : '';
        return [date, r.territory, r.state, r.pincode, r.specialty, r.diagnosis, r.testName, r.testValue, r.testUnit]
          .map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',');
      });
      const csv = [headers.join(','), ...rows].join('\n');

      // Save extraction record
      await addDoc(collection(db, 'pharmaCompanies', companyId, 'pathologyExtractions'), {
        extractedAt: serverTimestamp(),
        fromDate, toDate,
        recordCount: filteredData.length,
        uniqueTests: testSummaries.length,
        states: selectedStates,
        specialties: selectedSpecialties,
        type,
        requestId: requestId || null,
        companyName: companyInfo?.companyName || '',
      });

      // Update lastLockedDate for free extractions
      if (type === 'free') {
        const newLockedDate = new Date(toDate + 'T23:59:59');
        if (!lastLockedDate || newLockedDate > lastLockedDate) {
          await updateDoc(doc(db, 'pharmaCompanies', companyId), {
            pathologyLastLockedDate: Timestamp.fromDate(newLockedDate),
          });
        }
      }
      if (requestId) {
        await updateDoc(doc(db, 'pathologyAccessRequests', requestId), { status: 'used', usedAt: serverTimestamp() });
      }

      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pathology-trends-${fromDate}-to-${toDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      await loadData();
    } catch (err) {
      console.error('Extraction failed:', err);
    } finally {
      setExtracting(false);
    }
  };

  const handleRequestDateUnlock = async () => {
    if (!db || !fromDate || !toDate) return;
    try {
      await addDoc(collection(db, 'pathologyAccessRequests'), {
        companyId,
        companyName: companyInfo?.companyName || '',
        type: 'date-unlock',
        fromDate, toDate,
        states: selectedStates,
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

  // Request page access
  const handleRequestAccess = async () => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'pathologyAccessRequests'), {
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

  const maxCount = testSummaries.length > 0 ? testSummaries[0].count : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  // ====== ACCESS GATE ======
  if (!companyInfo?.pathologyAccessGranted) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-teal-500/10 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-teal-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Pathology Trends — Premium Access</h2>
            <p className="text-sm text-gray-400">
              Access to pathology/diagnostic test trends requires admin approval.
              This data includes anonymized lab test ordering patterns, specialties, and territory distribution.
            </p>
          </div>
          {accessRequested ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <p className="text-amber-400 font-medium text-sm">Access request pending — admin will review your request.</p>
            </div>
          ) : (
            <button
              onClick={handleRequestAccess}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
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
  if (companyInfo?.pathologyAccessUntil && companyInfo.pathologyAccessUntil < new Date()) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Pathology Trends — Access Expired</h2>
            <p className="text-sm text-gray-400">
              Your access expired on {companyInfo.pathologyAccessUntil.toLocaleDateString('en-IN')}. Please request renewal.
            </p>
          </div>
          {accessRequested ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <p className="text-amber-400 font-medium text-sm">Renewal request pending — admin will review.</p>
            </div>
          ) : (
            <button
              onClick={handleRequestAccess}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
            >
              <Send className="w-4 h-4" />
              Request Renewal
            </button>
          )}
        </div>
      </div>
    );
  }

  // ====== MAIN PAGE ======
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Access validity banner */}
      {companyInfo?.pathologyAccessUntil && (
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-400" />
          <p className="text-sm text-teal-400">Access valid until: <strong>{companyInfo.pathologyAccessUntil.toLocaleDateString('en-IN')}</strong></p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Microscope className="w-5 h-5 text-teal-400" />
            Pathology Trends
          </h2>
          <p className="text-sm text-gray-400 mt-1">Anonymized diagnostic test ordering patterns in your territory</p>
        </div>
        <div className="flex gap-2">
          {['overview', 'extract', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setViewMode(tab as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                viewMode === tab ? 'bg-teal-600 text-white' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
              }`}
            >
              {tab === 'extract' ? 'Extract Report' : tab === 'history' ? 'History' : 'Overview'}
            </button>
          ))}
        </div>
      </div>

      {/* Free Period Banner */}
      {(() => {
        const openWindows = getOpenWindows();
        const nextWin = getNextWindow();
        if (openWindows.length > 0) {
          return (
            <div className="rounded-xl p-4 border flex items-center gap-3 bg-emerald-500/10 border-emerald-500/30">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-400">Free extraction window open!</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {openWindows.map(w => `${w.monthLabel} data (${w.daysLeft}d left)`).join(', ')} — download before window expires
                </p>
              </div>
            </div>
          );
        }
        return (
          <div className="rounded-xl p-4 border flex items-center gap-3 bg-amber-500/10 border-amber-500/30">
            <Clock className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-400">No free extraction window open</p>
              {nextWin && <p className="text-xs text-gray-500 mt-0.5">{nextWin.monthLabel} data available from {nextWin.opensOn.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
            </div>
          </div>
        );
      })()}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">Total Records</p>
          <p className="text-3xl font-bold text-teal-400">{pathologyData.length.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">Unique Tests</p>
          <p className="text-3xl font-bold text-blue-400">{testSummaries.length}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">Specialties</p>
          <p className="text-3xl font-bold text-purple-400">{allSpecialties.length}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">Extractions Done</p>
          <p className="text-3xl font-bold text-amber-400">{extractions.length}</p>
        </div>
      </div>

      {/* ====== OVERVIEW TAB ====== */}
      {viewMode === 'overview' && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-400" />
              Test Rankings
            </h3>
            <p className="text-xs text-gray-500 mt-1">Most ordered diagnostic tests across your territory</p>
          </div>
          <div className="divide-y divide-zinc-800">
            {testSummaries.length === 0 ? (
              <div className="p-8 text-center">
                <AlertTriangle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No pathology data available yet</p>
                <p className="text-xs text-gray-600 mt-1">Data will appear as doctors create digital prescriptions with lab values</p>
              </div>
            ) : (
              testSummaries.slice(0, 30).map((test, idx) => {
                const topState = Object.entries(test.states).sort(([, a], [, b]) => b - a)[0];
                const topSpec = Object.entries(test.specialties).sort(([, a], [, b]) => b - a)[0];
                const topDx = Object.entries(test.diagnoses).sort(([, a], [, b]) => b - a)[0];
                return (
                  <div key={test.name} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx < 3 ? 'bg-teal-500/20 text-teal-400' : 'bg-zinc-800 text-gray-500'
                        }`}>{idx + 1}</span>
                        <div>
                          <p className="text-sm font-medium">{test.name}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            {topState && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{topState[0]} ({topState[1]})</span>}
                            {topSpec && <span className="flex items-center gap-1"><Stethoscope className="w-3 h-3" />{topSpec[0]} ({topSpec[1]})</span>}
                            {topDx && <span className="text-amber-400/70">Dx: {topDx[0]}</span>}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-bold font-mono text-teal-400">{test.count}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full" style={{ width: `${(test.count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ====== EXTRACT REPORT TAB ====== */}
      {viewMode === 'extract' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
            <h3 className="font-semibold text-white">Select Date Range & Filters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">From Date</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To Date</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            {/* Territory, Pincode & Specialty Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Territory (State)</label>
                <select value={selectedStates[0] || ''} onChange={e => setSelectedStates(e.target.value ? [e.target.value] : [])}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="">All States</option>
                  {allStates.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Pincode</label>
                <select value={selectedPincodes[0] || ''} onChange={e => setSelectedPincodes(e.target.value ? [e.target.value] : [])}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="">All Pincodes</option>
                  {allPincodes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Specialty</label>
                <select value={selectedSpecialties[0] || ''} onChange={e => setSelectedSpecialties(e.target.value ? [e.target.value] : [])}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="">All Specialties</option>
                  {allSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Period Status */}
            {fromDate && toDate && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Records in Range</p>
                  <p className="text-xl font-bold text-teal-400">{filteredData.length}</p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Unique Tests</p>
                  <p className="text-xl font-bold text-blue-400">{testSummaries.length}</p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Period Status</p>
                  <p className={`text-xl font-bold ${checkPeriodStatus(fromDate, toDate) === 'free' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {checkPeriodStatus(fromDate, toDate).toUpperCase()}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleExtractClick}
              disabled={!fromDate || !toDate || filteredData.length === 0 || extracting}
              className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-sm font-bold transition-colors"
            >
              <Download className="w-4 h-4" />
              {extracting ? 'Extracting...' : `Download CSV (${filteredData.length} records)`}
            </button>
          </div>
        </div>
      )}

      {/* ====== HISTORY TAB ====== */}
      {viewMode === 'history' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-400" /> Extraction History
          </h3>
          {extractions.length === 0 ? (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center">
              <p className="text-gray-400">No extractions yet</p>
            </div>
          ) : (
            extractions.map(ext => (
              <div key={ext.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{ext.fromDate} → {ext.toDate}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {ext.recordCount} records • {ext.uniqueTests} tests • {ext.type === 'approved' ? '🔓 Unlocked' : '🆓 Free'}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {ext.extractedAt?.toDate?.()?.toLocaleDateString('en-IN') || ''}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ====== DATE UNLOCK MODAL ====== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {modalType === 'locked' ? 'Period Locked' : 'Partial Free Period'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {modalType === 'locked' && (
              <>
                <p className="text-sm text-gray-300">
                  Dates <strong className="text-red-400">{fromDate}</strong> to <strong className="text-red-400">{toDate}</strong> are locked
                  (up to {lastLockedDate?.toLocaleDateString('en-IN')}).
                </p>
                <p className="text-sm text-gray-400">Request an unlock from admin to re-access this data.</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-zinc-800 text-gray-300 rounded-lg text-sm hover:bg-zinc-700">Cancel</button>
                  <button onClick={handleRequestDateUnlock} className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" /> Request Unlock
                  </button>
                </div>
              </>
            )}
            {modalType === 'partial' && (
              <>
                <p className="text-sm text-gray-300">
                  Part of the date range is locked. Free period starts from <strong className="text-emerald-400">{nextFreeDateStr}</strong>.
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => { setFromDate(nextFreeDateStr); doExtract('free'); }} className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                    Download Free Period Only ({nextFreeDateStr} → {toDate})
                  </button>
                  <button onClick={handleRequestDateUnlock} className="w-full px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" /> Request Full Range Unlock
                  </button>
                  <button onClick={() => setShowModal(false)} className="w-full px-4 py-2.5 bg-zinc-800 text-gray-400 rounded-lg text-sm hover:bg-zinc-700">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
