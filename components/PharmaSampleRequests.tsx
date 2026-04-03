import { useState, useEffect, useMemo } from 'react';
import { Package, Power, Search, Clock, CheckCircle, XCircle, AlertCircle, Filter } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, getDocs, doc, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore';

interface PharmaSampleRequestsProps {
  companyId: string;
}

interface SampleRequest {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  itemName: string;
  itemType: 'sample' | 'literature';
  quantity: number;
  notes: string;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
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

  useEffect(() => {
    loadData();
  }, [companyId]);

  useEffect(() => {
    if (!companyId || !db) return;
    const unsub = onSnapshot(
      query(collection(db, 'pharmaCompanies', companyId, 'sampleRequests'), orderBy('createdAt', 'desc')),
      snap => {
        setRequests(snap.docs.map(d => ({
          id: d.id,
          doctorId: d.data().doctorId || '',
          doctorName: d.data().doctorName || 'Unknown',
          specialty: d.data().specialty || '',
          itemName: d.data().itemName || '',
          itemType: d.data().itemType || 'sample',
          quantity: d.data().quantity || 1,
          notes: d.data().notes || '',
          status: d.data().status || 'pending',
          createdAt: d.data().createdAt,
          updatedAt: d.data().updatedAt,
        })));
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

  const updateRequestStatus = async (id: string, status: SampleRequest['status']) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'pharmaCompanies', companyId, 'sampleRequests', id), { status, updatedAt: new Date() });
    } catch (err) {
      console.error('Error updating request:', err);
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
      list = list.filter(r => r.doctorName.toLowerCase().includes(q) || r.itemName.toLowerCase().includes(q));
    }
    return list;
  }, [requests, statusFilter, search]);

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
            Sample & Literature Requests
          </h2>
          <p className="text-sm text-gray-400 mt-1">Manage sample/literature requests from your distributed doctors</p>
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
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by doctor or item..."
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

          {/* Request List */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="divide-y divide-zinc-800 max-h-[600px] overflow-y-auto">
              {filteredRequests.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Package className="w-8 h-8 mx-auto mb-3 text-gray-600" />
                  <p>No requests yet</p>
                  <p className="text-xs mt-1">Requests will appear when doctors submit sample/literature requests</p>
                </div>
              ) : (
                filteredRequests.map(req => {
                  const sc = statusConfig[req.status];
                  const StatusIcon = sc.icon;
                  return (
                    <div key={req.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs uppercase font-medium ${
                              req.itemType === 'sample' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'
                            }`}>
                              {req.itemType}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${sc.bg} ${sc.color}`}>
                              {sc.label}
                            </span>
                          </div>
                          <p className="text-sm font-medium">{req.itemName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {req.doctorName} • {req.specialty} • Qty: {req.quantity}
                          </p>
                          {req.notes && <p className="text-xs text-gray-600 mt-1 italic">"{req.notes}"</p>}
                          <p className="text-xs text-gray-600 mt-1">
                            {req.createdAt?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) || ''}
                          </p>
                        </div>
                        {req.status === 'pending' && (
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => updateRequestStatus(req.id, 'approved')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updateRequestStatus(req.id, 'rejected')}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-gray-400 text-xs rounded-lg transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {req.status === 'approved' && (
                          <button
                            onClick={() => updateRequestStatus(req.id, 'fulfilled')}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors shrink-0"
                          >
                            Mark Fulfilled
                          </button>
                        )}
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
    </div>
  );
}
