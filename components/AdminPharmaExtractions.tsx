import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { Download, Check, X, Building2, Calendar, RefreshCw, Send, Unlock, Search, Microscope, Lock, ShieldOff, FlaskConical } from 'lucide-react';

interface ExtractionRecord {
  id: string;
  companyId: string;
  companyName: string;
  extractedAt: any;
  fromDate: string;
  toDate: string;
  rxCount: number;
  prescriptionCount: number;
  moleculeCount: number;
  type: string;
  states: string[];
  topMolecules: { name: string; count: number }[];
}

interface UnlockRequest {
  id: string;
  companyId: string;
  companyName: string;
  fromDate: string;
  toDate: string;
  states: string[];
  specialties: string[];
  status: 'pending' | 'approved' | 'rejected' | 'used';
  requestedAt: any;
  approvedAt: any;
}

interface PathologyAccessRequest {
  id: string;
  companyId: string;
  companyName: string;
  type: 'page-access' | 'date-unlock';
  fromDate?: string;
  toDate?: string;
  status: 'pending' | 'approved' | 'rejected' | 'used';
  requestedAt: any;
}

interface RxAccessRequest {
  id: string;
  companyId: string;
  companyName: string;
  type: 'page-access' | 'date-unlock';
  fromDate?: string;
  toDate?: string;
  status: 'pending' | 'approved' | 'rejected' | 'used';
  requestedAt: any;
}

export default function AdminPharmaExtractions() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<UnlockRequest[]>([]);
  const [extractions, setExtractions] = useState<ExtractionRecord[]>([]);
  const [pathologyRequests, setPathologyRequests] = useState<PathologyAccessRequest[]>([]);
  const [rxAccessRequests, setRxAccessRequests] = useState<RxAccessRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'requests' | 'history' | 'pathology' | 'rx-access'>('requests');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [grantModal, setGrantModal] = useState<{ type: 'rx' | 'pathology'; req: any } | null>(null);
  const [grantUntil, setGrantUntil] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    if (!db) return;
    setLoading(true);
    // Load each independently so one failure doesn't block others
    try {
      const reqSnap = await getDocs(query(
        collection(db, 'extractionRequests'),
        orderBy('requestedAt', 'desc')
      ));
      setRequests(reqSnap.docs.map(d => ({ id: d.id, ...d.data() } as UnlockRequest)));
    } catch (err) {
      console.error('Error loading unlock requests:', err);
    }

    try {
      // Load all pharma companies, then load each company's rxExtractions
      const companiesSnap = await getDocs(collection(db, 'pharmaCompanies'));
      const allExtractions: ExtractionRecord[] = [];
      for (const compDoc of companiesSnap.docs) {
        try {
          const extSnap = await getDocs(query(
            collection(db, 'pharmaCompanies', compDoc.id, 'rxExtractions'),
            orderBy('extractedAt', 'desc')
          ));
          extSnap.docs.forEach(d => {
            allExtractions.push({ id: d.id, companyId: compDoc.id, ...d.data() } as ExtractionRecord);
          });
        } catch (innerErr) {
          console.error(`Error loading rxExtractions for ${compDoc.id}:`, innerErr);
        }
      }
      allExtractions.sort((a, b) => {
        const aT = a.extractedAt?.toDate?.()?.getTime() || 0;
        const bT = b.extractedAt?.toDate?.()?.getTime() || 0;
        return bT - aT;
      });
      setExtractions(allExtractions);
    } catch (err) {
      console.error('Error loading extraction history:', err);
    }

    try {
      const pathReqSnap = await getDocs(query(
        collection(db, 'pathologyAccessRequests'),
        orderBy('requestedAt', 'desc')
      ));
      setPathologyRequests(pathReqSnap.docs.map(d => ({ id: d.id, ...d.data() } as PathologyAccessRequest)));
    } catch (err) {
      console.error('Error loading pathology requests:', err);
    }

    try {
      const rxAccSnap = await getDocs(query(
        collection(db, 'rxAccessRequests'),
        orderBy('requestedAt', 'desc')
      ));
      setRxAccessRequests(rxAccSnap.docs.map(d => ({ id: d.id, ...d.data() } as RxAccessRequest)));
    } catch (err) {
      console.error('Error loading rx access requests:', err);
    }

    setLoading(false);
  };

  const handleApprove = async (requestId: string) => {
    if (!db) return;
    setActionLoading(requestId);
    try {
      await updateDoc(doc(db, 'extractionRequests', requestId), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: 'admin',
      });
      await loadData();
    } catch (err) {
      console.error('Error approving request:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!db) return;
    setActionLoading(requestId);
    try {
      await updateDoc(doc(db, 'extractionRequests', requestId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
      });
      await loadData();
    } catch (err) {
      console.error('Error rejecting request:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Pathology access handlers
  const handlePathologyApprove = async (req: PathologyAccessRequest) => {
    if (!db) return;
    if (req.type === 'page-access') {
      // Show grant modal with date picker
      setGrantUntil('');
      setGrantModal({ type: 'pathology', req });
      return;
    }
    // Date-unlock: approve directly
    setActionLoading(req.id);
    try {
      await updateDoc(doc(db, 'pathologyAccessRequests', req.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: 'admin',
      });
      await loadData();
    } catch (err) {
      console.error('Error approving pathology request:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleGrantConfirm = async () => {
    if (!db || !grantModal) return;
    const { type, req } = grantModal;
    setActionLoading(req.id);
    try {
      const collectionName = type === 'pathology' ? 'pathologyAccessRequests' : 'rxAccessRequests';
      await updateDoc(doc(db, collectionName, req.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: 'admin',
        accessUntil: grantUntil || null,
      });
      if (req.companyId) {
        const updateFields: any = {};
        if (type === 'pathology') {
          updateFields.pathologyAccessGranted = true;
          if (grantUntil) updateFields.pathologyAccessUntil = Timestamp.fromDate(new Date(grantUntil + 'T23:59:59'));
        } else {
          updateFields.rxAccessGranted = true;
          if (grantUntil) updateFields.rxAccessUntil = Timestamp.fromDate(new Date(grantUntil + 'T23:59:59'));
        }
        await updateDoc(doc(db, 'pharmaCompanies', req.companyId), updateFields);
      }
      setGrantModal(null);
      await loadData();
    } catch (err) {
      console.error('Error granting access:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlockAccess = async (type: 'rx' | 'pathology', companyId: string, requestId: string) => {
    if (!db || !confirm(`Block ${type === 'rx' ? 'Rx Trends' : 'Pathology'} access for this company?`)) return;
    setActionLoading(requestId);
    try {
      const collectionName = type === 'pathology' ? 'pathologyAccessRequests' : 'rxAccessRequests';
      await updateDoc(doc(db, collectionName, requestId), {
        status: 'rejected',
        blockedAt: serverTimestamp(),
        blockedBy: 'admin',
      });
      const updateFields: any = {};
      if (type === 'pathology') {
        updateFields.pathologyAccessGranted = false;
      } else {
        updateFields.rxAccessGranted = false;
      }
      await updateDoc(doc(db, 'pharmaCompanies', companyId), updateFields);
      await loadData();
    } catch (err) {
      console.error('Error blocking access:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Rx access handlers
  const handleRxAccessApprove = async (req: RxAccessRequest) => {
    if (!db) return;
    if (req.type === 'page-access') {
      setGrantUntil('');
      setGrantModal({ type: 'rx', req });
      return;
    }
    setActionLoading(req.id);
    try {
      await updateDoc(doc(db, 'rxAccessRequests', req.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: 'admin',
      });
      await loadData();
    } catch (err) {
      console.error('Error approving rx access request:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRxAccessReject = async (requestId: string) => {
    if (!db) return;
    setActionLoading(requestId);
    try {
      await updateDoc(doc(db, 'rxAccessRequests', requestId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
      });
      await loadData();
    } catch (err) {
      console.error('Error rejecting rx access request:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePathologyReject = async (requestId: string) => {
    if (!db) return;
    setActionLoading(requestId);
    try {
      await updateDoc(doc(db, 'pathologyAccessRequests', requestId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
      });
      await loadData();
    } catch (err) {
      console.error('Error rejecting pathology request:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const pendingPathology = pathologyRequests.filter(r => r.status === 'pending');
  const pendingRxAccess = rxAccessRequests.filter(r => r.status === 'pending');
  const allRequests = requests;

  const filteredExtractions = extractions.filter(e =>
    !searchQuery || (e.companyName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRequests = allRequests.filter(r =>
    !searchQuery || (r.companyName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black min-h-screen">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-black min-h-screen p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Download className="w-6 h-6 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Pharma Extraction Management</h1>
              <p className="text-sm text-gray-500">Unlock requests & extraction history across all pharma companies</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(pendingRequests.length + pendingPathology.length + pendingRxAccess.length) > 0 && (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-sm rounded-full font-medium">
                {pendingRequests.length + pendingPathology.length + pendingRxAccess.length} pending
              </span>
            )}
            <button onClick={loadData} className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Search + Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by company name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white"
            />
          </div>
          <div className="flex bg-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setFilterTab('requests')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${filterTab === 'requests' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Unlock Requests ({allRequests.length})
            </button>
            <button
              onClick={() => setFilterTab('history')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${filterTab === 'history' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Extraction History ({extractions.length})
            </button>
            <button
              onClick={() => setFilterTab('pathology')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${filterTab === 'pathology' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Pathology Access ({pathologyRequests.length})
            </button>
            <button
              onClick={() => setFilterTab('rx-access')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${filterTab === 'rx-access' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Rx Access ({rxAccessRequests.length})
            </button>
          </div>
        </div>

        {/* ====== REQUESTS TAB ====== */}
        {filterTab === 'requests' && (
          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <Send className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No unlock requests yet</p>
              </div>
            ) : (
              filteredRequests.map(req => (
                <div key={req.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-purple-400" />
                        <span className="text-white font-medium">{req.companyName || req.companyId}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          req.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                          req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                          req.status === 'used' ? 'bg-gray-500/20 text-gray-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {req.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {req.fromDate} → {req.toDate}
                        </span>
                        {req.states?.length > 0 && (
                          <span className="text-gray-500">States: {req.states.join(', ')}</span>
                        )}
                        <span className="text-gray-600">
                          Requested: {req.requestedAt?.toDate?.()?.toLocaleDateString('en-IN') || '?'}
                        </span>
                      </div>
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={actionLoading === req.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          {actionLoading === req.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={actionLoading === req.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}

                    {req.status === 'approved' && (
                      <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                        <Unlock className="w-4 h-4" /> Unlocked
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ====== HISTORY TAB ====== */}
        {filterTab === 'history' && (
          <div className="space-y-3">
            {filteredExtractions.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <Download className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No extractions recorded yet</p>
              </div>
            ) : (
              filteredExtractions.map(ext => (
                <div key={ext.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-purple-400" />
                        <span className="text-white font-medium">{ext.companyName || ext.companyId}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          ext.type === 'free' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {(ext.type || 'free').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {ext.fromDate || '?'} → {ext.toDate || '?'}
                        </span>
                        <span className="text-gray-500">
                          {ext.prescriptionCount || ext.rxCount} prescriptions • {ext.moleculeCount} molecules
                        </span>
                        <span className="text-gray-600">
                          {ext.extractedAt?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) || '?'}
                        </span>
                      </div>
                      {ext.states?.length > 0 && (
                        <p className="text-xs text-gray-600 mt-1">States: {ext.states.join(', ')}</p>
                      )}
                    </div>
                    {ext.topMolecules?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {ext.topMolecules.slice(0, 3).map(m => (
                          <span key={m.name} className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded">
                            {m.name} ({m.count})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ====== PATHOLOGY ACCESS TAB ====== */}
        {filterTab === 'pathology' && (
          <div className="space-y-3">
            {pathologyRequests.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <Microscope className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No pathology access requests yet</p>
                <p className="text-xs text-gray-600 mt-1">Pharma companies can request pathology data access from their portal</p>
              </div>
            ) : (
              pathologyRequests
                .filter(r => !searchQuery || (r.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()))
                .map(req => (
                  <div key={req.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Microscope className="w-4 h-4 text-teal-400" />
                          <span className="text-white font-medium">{req.companyName || req.companyId}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            req.type === 'page-access' ? 'bg-teal-500/20 text-teal-400' : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {req.type === 'page-access' ? 'PAGE ACCESS' : 'DATE UNLOCK'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            req.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                            req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                            req.status === 'used' ? 'bg-gray-500/20 text-gray-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {req.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                          {req.fromDate && req.toDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {req.fromDate} → {req.toDate}
                            </span>
                          )}
                          <span className="text-gray-600">
                            Requested: {req.requestedAt?.toDate?.()?.toLocaleDateString('en-IN') || '?'}
                          </span>
                        </div>
                      </div>

                      {req.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePathologyApprove(req)}
                            disabled={actionLoading === req.id}
                            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            {actionLoading === req.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {req.type === 'page-access' ? 'Grant Access' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handlePathologyReject(req.id)}
                            disabled={actionLoading === req.id}
                            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            <X className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      )}

                      {req.status === 'approved' && (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 text-sm text-teal-400">
                            {req.type === 'page-access' ? <><Unlock className="w-4 h-4" /> Access Granted</> : <><Unlock className="w-4 h-4" /> Unlocked</>}
                          </span>
                          {req.type === 'page-access' && (
                            <button
                              onClick={() => handleBlockAccess('pathology', req.companyId, req.id)}
                              disabled={actionLoading === req.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-xs font-medium transition-colors"
                            >
                              <ShieldOff className="w-3.5 h-3.5" /> Block Access
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
        {/* ====== RX ACCESS TAB ====== */}
        {filterTab === 'rx-access' && (
          <div className="space-y-3">
            {rxAccessRequests.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <FlaskConical className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No Rx access requests yet</p>
                <p className="text-xs text-gray-600 mt-1">Pharma companies can request Rx Trends access from their portal</p>
              </div>
            ) : (
              rxAccessRequests
                .filter(r => !searchQuery || (r.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()))
                .map(req => (
                  <div key={req.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FlaskConical className="w-4 h-4 text-purple-400" />
                          <span className="text-white font-medium">{req.companyName || req.companyId}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            req.type === 'page-access' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {req.type === 'page-access' ? 'PAGE ACCESS' : 'DATE UNLOCK'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            req.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                            req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                            req.status === 'used' ? 'bg-gray-500/20 text-gray-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {req.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                          {req.fromDate && req.toDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {req.fromDate} → {req.toDate}
                            </span>
                          )}
                          <span className="text-gray-600">
                            Requested: {req.requestedAt?.toDate?.()?.toLocaleDateString('en-IN') || '?'}
                          </span>
                        </div>
                      </div>

                      {req.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRxAccessApprove(req)}
                            disabled={actionLoading === req.id}
                            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            {actionLoading === req.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {req.type === 'page-access' ? 'Grant Access' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleRxAccessReject(req.id)}
                            disabled={actionLoading === req.id}
                            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            <X className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      )}

                      {req.status === 'approved' && (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 text-sm text-purple-400">
                            {req.type === 'page-access' ? <><Unlock className="w-4 h-4" /> Access Granted</> : <><Unlock className="w-4 h-4" /> Unlocked</>}
                          </span>
                          {req.type === 'page-access' && (
                            <button
                              onClick={() => handleBlockAccess('rx', req.companyId, req.id)}
                              disabled={actionLoading === req.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-xs font-medium transition-colors"
                            >
                              <ShieldOff className="w-3.5 h-3.5" /> Block Access
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* ====== GRANT ACCESS MODAL ====== */}
        {grantModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-700 max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">
                  Grant {grantModal.type === 'rx' ? 'Rx Trends' : 'Pathology'} Access
                </h3>
                <button onClick={() => setGrantModal(null)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-400">
                Granting access to <strong className="text-white">{grantModal.req.companyName || grantModal.req.companyId}</strong>
              </p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Access Valid Until (optional)</label>
                <input
                  type="date"
                  value={grantUntil}
                  onChange={e => setGrantUntil(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-600 mt-1">Leave empty for unlimited access. The pharma company will see this date.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setGrantModal(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrantConfirm}
                  disabled={actionLoading === grantModal.req.id}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2"
                >
                  {actionLoading === grantModal.req.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Grant Access
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
