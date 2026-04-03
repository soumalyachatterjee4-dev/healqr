import { useState, useEffect, useMemo, useRef } from 'react';
import { Package, Power, Search, Clock, CheckCircle, XCircle, AlertCircle, Filter, Download, MessageSquare, CheckSquare, Square, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, getDocs, doc, updateDoc, getDoc, query, orderBy, onSnapshot, writeBatch } from 'firebase/firestore';

interface PharmaSampleRequestsProps {
  companyId: string;
}

interface SampleRequest {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorCode: string;
  doctorEmail: string;
  specialty: string;
  territory: string;
  itemName: string;
  itemType: 'sample';
  quantity: number;
  notes: string;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  approvalMessage: string;
  createdAt: any;
  updatedAt: any;
}

interface DoctorActivation {
  doctorId: string;
  doctorName: string;
  specialty: string;
  samplesEnabled: boolean;
}

export default function PharmaSampleRequests({ companyId }: PharmaSampleRequestsProps) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<SampleRequest[]>([]);
  const [activations, setActivations] = useState<DoctorActivation[]>([]);
  const [activeTab, setActiveTab] = useState<'requests' | 'doctors'>('requests');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);
  const [bulkMessage, setBulkMessage] = useState('Thank you! Please wait, you will get your samples soon.');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [companyId]);

  useEffect(() => {
    if (!companyId || !db) return;
    const unsub = onSnapshot(
      query(collection(db, 'pharmaCompanies', companyId, 'sampleRequests'), orderBy('createdAt', 'desc')),
      async (snap) => {
        const rawRequests = snap.docs.map(d => ({
          id: d.id,
          doctorId: d.data().doctorId || '',
          doctorName: d.data().doctorName || 'Unknown',
          doctorCode: d.data().doctorCode || '',
          doctorEmail: d.data().doctorEmail || '',
          specialty: d.data().specialty || '',
          territory: d.data().territory || '',
          itemName: d.data().itemName || '',
          itemType: d.data().itemType || 'sample',
          quantity: d.data().quantity || 1,
          notes: d.data().notes || '',
          status: d.data().status || 'pending',
          approvalMessage: d.data().approvalMessage || '',
          createdAt: d.data().createdAt,
          updatedAt: d.data().updatedAt,
        }));

        // Enrich requests missing doctor details by looking up the doctors collection
        const doctorIdsToLookup = [...new Set(rawRequests.filter(r => !r.doctorCode && r.doctorId).map(r => r.doctorId))];
        const doctorCache = new Map<string, { doctorCode: string; specialty: string; territory: string }>();
        await Promise.all(doctorIdsToLookup.map(async (dId) => {
          try {
            const dDoc = await getDoc(doc(db!, 'doctors', dId));
            if (dDoc.exists()) {
              const dd = dDoc.data();
              doctorCache.set(dId, {
                doctorCode: dd.doctorCode || '',
                specialty: dd.specialty || '',
                territory: [dd.city, dd.state].filter(Boolean).join(', ') || dd.pincode || '',
              });
            }
          } catch {}
        }));

        const enriched = rawRequests.map(r => {
          if (!r.doctorCode && doctorCache.has(r.doctorId)) {
            const info = doctorCache.get(r.doctorId)!;
            return { ...r, doctorCode: info.doctorCode, specialty: r.specialty || info.specialty, territory: r.territory || info.territory };
          }
          return r;
        });

        setRequests(enriched);
      }
    );
    return () => unsub();
  }, [companyId]);

  const loadData = async () => {
    if (!companyId || !db) return;
    setLoading(true);
    try {
      const doctorSnap = await getDocs(collection(db, 'pharmaCompanies', companyId, 'distributedDoctors'));
      setActivations(doctorSnap.docs.map(d => ({
        doctorId: d.id,
        doctorName: d.data().doctorName || 'Unknown',
        specialty: d.data().specialty || 'General',
        samplesEnabled: d.data().samplesEnabled === true,
      })));
    } catch (err) {
      console.error('Error loading sample data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (id: string, status: SampleRequest['status'], message?: string) => {
    if (!db) return;
    try {
      const updateData: any = { status, updatedAt: new Date() };
      if (message !== undefined) updateData.approvalMessage = message;
      await updateDoc(doc(db, 'pharmaCompanies', companyId, 'sampleRequests', id), updateData);
    } catch (err) {
      console.error('Error updating request:', err);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0 || !db) return;
    setBulkProcessing(true);
    try {
      const batch = writeBatch(db);
      const status = bulkAction === 'approve' ? 'approved' : 'rejected';
      const msg = bulkAction === 'approve' ? bulkMessage : (bulkMessage || '');
      selectedIds.forEach(id => {
        const ref = doc(db!, 'pharmaCompanies', companyId, 'sampleRequests', id);
        batch.update(ref, { status, updatedAt: new Date(), approvalMessage: msg });
      });
      await batch.commit();
      setSelectedIds(new Set());
      setShowMessageModal(false);
      setBulkAction(null);
    } catch (err) {
      console.error('Error in bulk action:', err);
    } finally {
      setBulkProcessing(false);
    }
  };

  const toggleDoctorSamples = async (doctorId: string, current: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'pharmaCompanies', companyId, 'distributedDoctors', doctorId), { samplesEnabled: !current });
      setActivations(prev => prev.map(d => d.doctorId === doctorId ? { ...d, samplesEnabled: !current } : d));
    } catch (err) {
      console.error('Error toggling doctor samples:', err);
    }
  };

  const enableAllDoctors = async () => {
    if (!db) return;
    try {
      await Promise.all(
        activations.filter(d => !d.samplesEnabled).map(d =>
          updateDoc(doc(db!, 'pharmaCompanies', companyId, 'distributedDoctors', d.doctorId), { samplesEnabled: true })
        )
      );
      setActivations(prev => prev.map(d => ({ ...d, samplesEnabled: true })));
    } catch (err) {
      console.error('Error enabling all:', err);
    }
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    pending: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Clock },
    approved: { label: 'Approved', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/10', icon: XCircle },
    fulfilled: { label: 'Fulfilled', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle },
  };

  const filteredRequests = useMemo(() => {
    let list = requests;
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.doctorName.toLowerCase().includes(q) || r.itemName.toLowerCase().includes(q) || r.doctorCode.toLowerCase().includes(q));
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      list = list.filter(r => r.createdAt?.toDate?.() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter(r => r.createdAt?.toDate?.() <= to);
    }
    return list;
  }, [requests, statusFilter, search, dateFrom, dateTo]);

  const filteredDoctors = search.trim()
    ? activations.filter(d => d.doctorName.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase()))
    : activations;

  const counts = useMemo(() => {
    return { pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      fulfilled: requests.filter(r => r.status === 'fulfilled').length,
      total: requests.length };
  }, [requests]);

  const enabledCount = activations.filter(d => d.samplesEnabled).length;

  // Select all visible pending requests
  const pendingInView = filteredRequests.filter(r => r.status === 'pending');
  const allPendingSelected = pendingInView.length > 0 && pendingInView.every(r => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingInView.map(r => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Download CSV
  const downloadCSV = () => {
    const rows = filteredRequests.map(r => ({
      'Doctor Name': r.doctorName,
      'Doctor Code': r.doctorCode,
      'Specialty': r.specialty,
      'Territory': r.territory,
      'Item Name': r.itemName,
      'Quantity': r.quantity,
      'Status': r.status,
      'Notes': r.notes,
      'Date': r.createdAt?.toDate?.()?.toLocaleDateString('en-IN') || '',
    }));
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String((r as any)[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fromStr = dateFrom || 'all';
    const toStr = dateTo || 'today';
    a.download = `sample-requests_${fromStr}_to_${toStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-400" />
            Sample Requests
          </h2>
          <p className="text-sm text-gray-400 mt-1">Manage sample requests from your distributed doctors</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'requests' ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
            }`}
          >
            Requests ({counts.pending} pending)
          </button>
          <button
            onClick={() => setActiveTab('doctors')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'doctors' ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
            }`}
          >
            Doctors ({enabledCount}/{activations.length})
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
          <p className="text-2xl font-bold text-orange-400">{counts.total}</p>
          <p className="text-xs text-gray-500 mt-1">Total Requests</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
          <p className="text-2xl font-bold text-amber-400">{counts.pending}</p>
          <p className="text-xs text-gray-500 mt-1">Pending</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
          <p className="text-2xl font-bold text-emerald-400">{counts.fulfilled}</p>
          <p className="text-xs text-gray-500 mt-1">Fulfilled</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
          <p className="text-2xl font-bold text-blue-400">{enabledCount}</p>
          <p className="text-xs text-gray-500 mt-1">Doctors Enabled</p>
        </div>
      </div>

      {activeTab === 'requests' ? (
        <>
          {/* Filter bar */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by doctor, item, or code..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="fulfilled">Fulfilled</option>
              </select>
            </div>
            {/* Date filter + Download */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">From:</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">To:</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white"
                />
              </div>
              <button
                onClick={downloadCSV}
                disabled={filteredRequests.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV ({filteredRequests.length})
              </button>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="text-xs text-gray-500 hover:text-white transition"
                >
                  Clear dates
                </button>
              )}
            </div>
          </div>

          {/* Bulk actions bar */}
          {pendingInView.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition"
              >
                {allPendingSelected ? <CheckSquare className="w-4 h-4 text-orange-400" /> : <Square className="w-4 h-4" />}
                {allPendingSelected ? 'Deselect All' : `Select All Pending (${pendingInView.length})`}
              </button>
              {selectedIds.size > 0 && (
                <>
                  <span className="text-xs text-gray-500">|</span>
                  <span className="text-xs text-orange-400 font-medium">{selectedIds.size} selected</span>
                  <button
                    onClick={() => { setBulkAction('approve'); setBulkMessage('Thank you! Please wait, you will get your samples soon.'); setShowMessageModal(true); }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors"
                  >
                    Approve Selected
                  </button>
                  <button
                    onClick={() => { setBulkAction('reject'); setBulkMessage(''); setShowMessageModal(true); }}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-gray-400 text-xs rounded-lg transition-colors"
                  >
                    Reject Selected
                  </button>
                </>
              )}
            </div>
          )}

          {/* Request List */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="divide-y divide-zinc-800 max-h-[600px] overflow-y-auto">
              {filteredRequests.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Package className="w-8 h-8 mx-auto mb-3 text-gray-600" />
                  <p>No requests yet</p>
                  <p className="text-xs mt-1">Requests will appear when doctors submit sample requests</p>
                </div>
              ) : (
                filteredRequests.map(req => {
                  const sc = statusConfig[req.status];
                  const StatusIcon = sc.icon;
                  const isSelected = selectedIds.has(req.id);
                  return (
                    <div key={req.id} className={`p-4 ${isSelected ? 'bg-orange-500/5' : ''}`}>
                      <div className="flex items-start gap-3">
                        {/* Checkbox for pending items */}
                        {req.status === 'pending' && (
                          <button onClick={() => toggleSelect(req.id)} className="mt-1 flex-shrink-0">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-orange-400" /> : <Square className="w-4 h-4 text-gray-600" />}
                          </button>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-xs uppercase font-medium bg-orange-500/10 text-orange-400">
                              sample
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${sc.bg} ${sc.color}`}>
                              {sc.label}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-white">{req.itemName}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            <p className="text-xs text-gray-400">{req.doctorName}</p>
                            {req.doctorCode && <p className="text-xs text-cyan-400 font-mono">#{req.doctorCode}</p>}
                            {req.specialty && <p className="text-xs text-purple-400">{req.specialty}</p>}
                            {req.territory && <p className="text-xs text-amber-400/70">{req.territory}</p>}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Qty: {req.quantity}</p>
                          {req.notes && <p className="text-xs text-gray-600 mt-1 italic">"{req.notes}"</p>}
                          {req.approvalMessage && (req.status === 'approved' || req.status === 'fulfilled') && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <MessageSquare className="w-3 h-3 text-emerald-400" />
                              <span className="text-xs text-emerald-400">{req.approvalMessage}</span>
                            </div>
                          )}
                          <p className="text-xs text-gray-600 mt-1">
                            {req.createdAt?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) || ''}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          {req.status === 'pending' && (
                            <>
                              <button
                                onClick={() => { setBulkAction('approve'); setSelectedIds(new Set([req.id])); setBulkMessage('Thank you! Please wait, you will get your samples soon.'); setShowMessageModal(true); }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => { setBulkAction('reject'); setSelectedIds(new Set([req.id])); setBulkMessage(''); setShowMessageModal(true); }}
                                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-gray-400 text-xs rounded-lg transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {req.status === 'approved' && (
                            <button
                              onClick={() => updateRequestStatus(req.id, 'fulfilled')}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
                            >
                              Mark Fulfilled
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Doctor activation list */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search doctors..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={enableAllDoctors}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Power className="w-4 h-4" />
              Enable All
            </button>
          </div>

          <div className="bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="divide-y divide-zinc-800 max-h-[600px] overflow-y-auto">
              {filteredDoctors.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No doctors found</div>
              ) : (
                filteredDoctors.map(d => (
                  <div key={d.doctorId} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{d.doctorName}</p>
                      <p className="text-xs text-gray-500">{d.specialty}</p>
                    </div>
                    <button
                      onClick={() => toggleDoctorSamples(d.doctorId, d.samplesEnabled)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        d.samplesEnabled
                          ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                          : 'bg-zinc-800 text-gray-500 hover:bg-zinc-700'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {d.samplesEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-md">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="font-semibold text-white">
                {bulkAction === 'approve' ? 'Approve' : 'Reject'} {selectedIds.size} Request{selectedIds.size > 1 ? 's' : ''}
              </h3>
              <p className="text-xs text-gray-400 mt-1">Add a message for the doctor(s)</p>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                value={bulkMessage}
                onChange={e => setBulkMessage(e.target.value)}
                rows={3}
                placeholder={bulkAction === 'approve' ? 'e.g. Thank you! Please wait, you will get your samples soon.' : 'Reason for rejection (optional)'}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
              {bulkAction === 'approve' && (
                <div className="flex flex-wrap gap-2">
                  {['Thank you! Please wait, you will get your samples soon.', 'Approved! Dispatch in 3-5 working days.', 'Approved. Our team will coordinate delivery.'].map(msg => (
                    <button
                      key={msg}
                      onClick={() => setBulkMessage(msg)}
                      className={`px-2 py-1 rounded text-xs transition ${bulkMessage === msg ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'}`}
                    >
                      {msg.substring(0, 40)}...
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => { setShowMessageModal(false); setBulkAction(null); }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAction}
                disabled={bulkProcessing}
                className={`px-4 py-2 text-white text-sm rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 ${
                  bulkAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {bulkProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                {bulkAction === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
