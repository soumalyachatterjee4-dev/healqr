import { useState, useEffect } from 'react';
import { db } from '../lib/firebase/config';
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import {
  Briefcase, Phone, Building2, CheckCircle2, XCircle, Clock,
  Copy, Link2, Share2, Menu, ChevronLeft, Calendar, AlertCircle, Loader2, FileDown
} from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import DashboardSidebar from './DashboardSidebar';

interface MRRequest {
  id: string;
  mrId: string;
  mrName: string;
  mrPhone: string;
  mrCompany: string;
  mrDivision: string;
  doctorId: string;
  status: 'pending' | 'approved' | 'rejected';
  frequency?: string;
  createdAt?: any;
}

interface MRManagementProps {
  doctorId: string;
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
  activeAddOns?: string[];
}

export default function MRManagement({ doctorId, onMenuChange, onLogout, activeAddOns = [] }: MRManagementProps) {
  const [requests, setRequests] = useState<MRRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mainTab, setMainTab] = useState<'mr-approvals' | 'special-meets' | 'reports'>('mr-approvals');
  const [specialMeets, setSpecialMeets] = useState<any[]>([]);
  const [meetsFilter, setMeetsFilter] = useState<'all' | 'pending_special' | 'confirmed' | 'rejected'>('pending_special');

  // Reports State
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  const mrSignupUrl = `${window.location.origin}/?page=mr-signup`;

  useEffect(() => {
    if (!doctorId || !db) return;
    const q = query(
      collection(db, 'mrDoctorLinks'),
      where('doctorId', '==', doctorId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items: MRRequest[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as MRRequest));
      // Sort client-side by createdAt descending
      items.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
        const tb = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
        return tb - ta;
      });
      setRequests(items);
    }, (err) => {
      console.error('mrDoctorLinks listener error:', err);
    });
    return () => unsub();
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId || !db) return;
    const q = query(
      collection(db, 'mrBookings'),
      where('doctorId', '==', doctorId),
      where('isSpecial', '==', true)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      items.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
        const tb = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
        return tb - ta;
      });
      setSpecialMeets(items);
    });
    return () => unsub();
  }, [doctorId]);

  const handleApprove = async (req: MRRequest) => {
    if (!db) return;
    setProcessingId(req.id);
    try {
      await updateDoc(doc(db, 'mrDoctorLinks', req.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        frequency: req.frequency || 'weekly',
      });
      toast.success(`Approved ${req.mrName}`);
    } catch {
      toast.error('Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: MRRequest) => {
    if (!db) return;
    setProcessingId(req.id);
    try {
      await updateDoc(doc(db, 'mrDoctorLinks', req.id), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
      });
      toast.success('Request rejected');
    } catch {
      toast.error('Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveSpecial = async (meetId: string) => {
    if (!db) return;
    setProcessingId(meetId);
    try {
      await updateDoc(doc(db, 'mrBookings', meetId), {
        status: 'confirmed',
        approvedAt: serverTimestamp(),
      });
      toast.success('Special meet approved');
    } catch {
      toast.error('Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSpecial = async (meetId: string) => {
    if (!db) return;
    setProcessingId(meetId);
    try {
      await updateDoc(doc(db, 'mrBookings', meetId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
      });
      toast.success('Special meet rejected');
    } catch {
      toast.error('Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  const setFrequency = async (reqId: string, frequency: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'mrDoctorLinks', reqId), { frequency });
      toast.success('Frequency updated');
    } catch {
      toast.error('Failed to update');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(mrSignupUrl);
    toast.success('MR registration link copied!');
  };

  const shareViaWhatsApp = () => {
    const text = `Register as a Medical Representative on HealQR to connect with doctors:\n${mrSignupUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const fetchReports = async () => {
    if (!db || !doctorId || !reportStartDate || !reportEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    setReportLoading(true);
    try {
      const q = query(
        collection(db, 'mrBookings'),
        where('doctorId', '==', doctorId)
      );
      const snap = await getDocs(q);
      let data = snap.docs.map(doc => doc.data());
      
      // Filter dates client-side to avoid Firestore composite index requirement
      data = data.filter(visit => {
        return visit.appointmentDate >= reportStartDate && visit.appointmentDate <= reportEndDate;
      });

      // Sort by date descending
      data.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
      setReportData(data);
      if (data.length === 0) toast.info('No visits found in this date range');
    } catch (error) {
      console.error(error);
      toast.error('Failed to load reports');
    } finally {
      setReportLoading(false);
    }
  };

  const downloadCSV = () => {
    if (reportData.length === 0) return;
    const headers = ['Date', 'MR Name', 'Company', 'Division', 'Type', 'Status'];
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => [
        row.appointmentDate,
        `"${row.mrName}"`,
        `"${row.mrCompany || 'N/A'}"`,
        `"${row.mrDivision || 'N/A'}"`,
        row.isSpecial ? 'Special Appointment' : 'Regular Visit',
        row.status
      ].join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mr_visit_report_${reportStartDate}_to_${reportEndDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;

  const filteredMeets = specialMeets.filter(m => meetsFilter === 'all' || m.status === meetsFilter);
  const pendingMeetsCount = specialMeets.filter(m => m.status === 'pending_special').length;

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Sidebar */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeMenu="mr-management"
        onMenuChange={onMenuChange || (() => {})}
        onLogout={onLogout}
        activeAddOns={activeAddOns}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="bg-[#0a0f1a] border-b border-zinc-800 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
            >
              <Menu className="w-5 h-5 text-emerald-500" />
            </button>
            <h2 className="text-lg md:text-xl font-medium flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-400" /> MR Management
            </h2>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Main Tabs */}
            <div className="flex border-b border-zinc-800">
              <button
                onClick={() => setMainTab('mr-approvals')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  mainTab === 'mr-approvals' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                MR Approvals {pendingCount > 0 && <span className="ml-2 bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full text-xs">{pendingCount}</span>}
              </button>
              <button
                onClick={() => setMainTab('special-meets')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  mainTab === 'special-meets' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Special Appointments {pendingMeetsCount > 0 && <span className="ml-2 bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full text-xs">{pendingMeetsCount}</span>}
              </button>
              <button
                onClick={() => setMainTab('reports')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  mainTab === 'reports' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Visit Reports
              </button>
            </div>

            {mainTab === 'mr-approvals' ? (
              <>
                {/* Shareable Registration Link Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-sm">MR Registration Link</h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Share this link with Medical Representatives so they can register and send you connection requests.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-300 truncate">
                  {mrSignupUrl}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={copyLink} className="bg-emerald-600 hover:bg-emerald-700 text-xs">
                    <Copy className="w-3 h-3 mr-1" /> Copy
                  </Button>
                  <Button size="sm" onClick={shareViaWhatsApp} className="bg-green-600 hover:bg-green-700 text-xs">
                    <Share2 className="w-3 h-3 mr-1" /> WhatsApp
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">{pendingCount}</div>
                <div className="text-xs text-gray-500 mt-1">Pending</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">{approvedCount}</div>
                <div className="text-xs text-gray-500 mt-1">Approved</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{requests.length}</div>
                <div className="text-xs text-gray-500 mt-1">Total</div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
                    filter === f ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-gray-400'
                  }`}
                >
                  {f} {f !== 'all' && `(${requests.filter(r => r.status === f).length})`}
                </button>
              ))}
            </div>

            {/* Request List */}
            <div className="space-y-3">
              {filtered.length === 0 && (
                <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-xl">
                  <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 mb-1">No MR requests found</p>
                  <p className="text-xs text-gray-500">Share the registration link above with MRs to get started.</p>
                </div>
              )}

              {filtered.map((req) => (
                <div key={req.id} className={`bg-zinc-900 border rounded-xl p-4 ${
                  req.status === 'pending' ? 'border-yellow-500/30' : req.status === 'approved' ? 'border-emerald-500/30' : 'border-red-500/30'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{req.mrName}</h3>
                        <p className="text-xs text-gray-400 flex items-center gap-1"><Building2 className="w-3 h-3" /> {req.mrCompany} &middot; {req.mrDivision}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {req.mrPhone}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                      req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                      req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {req.status === 'pending' ? <Clock className="w-3 h-3" /> :
                       req.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> :
                       <XCircle className="w-3 h-3" />}
                      {req.status}
                    </span>
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={() => handleApprove(req)} disabled={processingId === req.id} className="bg-emerald-600 hover:bg-emerald-700 text-xs">
                        {processingId === req.id ? 'Processing...' : 'Approve'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(req)} disabled={processingId === req.id} className="border-red-600 text-red-400 hover:bg-red-600/10 text-xs">
                        Reject
                      </Button>
                    </div>
                  )}

                  {req.status === 'approved' && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-gray-400">Visit frequency:</span>
                      <select
                        value={req.frequency || 'weekly'}
                        onChange={(e) => setFrequency(req.id, e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
            </>
            ) : mainTab === 'special-meets' ? (
              <>
                {/* Special Meets Section */}
                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                  {(['all', 'pending_special', 'confirmed', 'rejected'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setMeetsFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
                        meetsFilter === f ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-gray-400'
                      }`}
                    >
                      {f.replace('_special', '')} {f !== 'all' && `(${specialMeets.filter(m => m.status === f).length})`}
                    </button>
                  ))}
                </div>

                {/* Request List */}
                <div className="space-y-3">
                  {filteredMeets.length === 0 && (
                    <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 mb-1">No special appointments found</p>
                    </div>
                  )}

                  {filteredMeets.map((meet) => (
                    <div key={meet.id} className={`bg-zinc-900 border rounded-xl p-4 ${
                      meet.status === 'pending_special' ? 'border-yellow-500/30' : meet.status === 'confirmed' ? 'border-emerald-500/30' : 'border-red-500/30'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                            <Clock className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-sm">{meet.mrName}</h3>
                            <p className="text-xs text-gray-400 flex items-center gap-1"><Building2 className="w-3 h-3" /> {meet.mrCompany}</p>
                            <p className="text-xs text-blue-400 flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" /> {meet.appointmentDate} at {meet.chamberName}</p>
                            
                            {/* Monthly Special Request Count */}
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
                                {specialMeets.filter(m => 
                                  m.mrId === meet.mrId && 
                                  m.appointmentDate.startsWith(new Date().toISOString().slice(0, 7))
                                ).length} Special requests this month
                              </span>
                            </div>

                            {meet.specialReason && (
                              <div className="mt-2 bg-zinc-950/50 border border-zinc-800 rounded-lg p-2">
                                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Reason for Request</p>
                                <p className="text-xs text-yellow-400/90 italic">"{meet.specialReason}"</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                          meet.status === 'pending_special' ? 'bg-yellow-500/10 text-yellow-400' :
                          meet.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {meet.status === 'pending_special' ? <Clock className="w-3 h-3" /> :
                           meet.status === 'confirmed' ? <CheckCircle2 className="w-3 h-3" /> :
                           <XCircle className="w-3 h-3" />}
                          {meet.status.replace('_special', '')}
                        </span>
                      </div>

                      {meet.status === 'pending_special' && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" onClick={() => handleApproveSpecial(meet.id)} disabled={processingId === meet.id} className="bg-emerald-600 hover:bg-emerald-700 text-xs">
                            {processingId === meet.id ? 'Processing...' : 'Approve'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleRejectSpecial(meet.id)} disabled={processingId === meet.id} className="border-red-600 text-red-400 hover:bg-red-600/10 text-xs">
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
                  <p className="text-sm text-blue-400 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Please Note
                  </p>
                  <p className="text-xs text-blue-300/80 mt-1">
                    System clears data automatically to prevent overloading. Download your visit history of the last month between the 1st and 10th of every month. Otherwise, the system will overwrite the data after 40 days.
                  </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                      <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">End Date</label>
                      <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]" />
                    </div>
                  </div>
                  <Button onClick={fetchReports} disabled={reportLoading || !reportStartDate || !reportEndDate} className="w-full bg-blue-600 hover:bg-blue-700 text-sm">
                    {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Report'}
                  </Button>
                </div>

                {reportData.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm">Report Results ({reportData.length})</h3>
                      <Button onClick={downloadCSV} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-2">
                        <FileDown className="w-3 h-3" /> Download CSV
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {reportData.map((visit, i) => (
                        <div key={i} className="bg-zinc-800/50 rounded-lg p-3 flex justify-between items-center text-sm">
                          <div>
                            <p className="font-medium">{visit.mrName}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3" /> {visit.mrCompany} &middot; {visit.mrDivision}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" /> {visit.appointmentDate} at {visit.chamberName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${visit.isSpecial ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                              {visit.isSpecial ? 'Special' : 'Regular'}
                            </span>
                            <p className={`text-[10px] font-bold uppercase ${visit.status === 'met' || visit.isMet ? 'text-emerald-500' : 'text-zinc-500'}`}>
                              {visit.status === 'met' || visit.isMet ? 'Visit Made' : 'Pending'}
                            </p>
                            <p className="text-[10px] text-gray-500 capitalize">{visit.status.replace('_special', '')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
