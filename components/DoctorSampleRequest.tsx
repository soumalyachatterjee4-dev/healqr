import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Package, ArrowLeft, Loader2, Send, Clock, CheckCircle, XCircle, Truck, Menu, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import DashboardSidebar from './DashboardSidebar';
import { Button } from './ui/button';

interface SampleRequest {
  id: string;
  itemName: string;
  itemType: 'sample';
  quantity: number;
  notes: string;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  approvalMessage?: string;
  createdAt: any;
  updatedAt?: any;
}

interface DoctorSampleRequestProps {
  onBack: () => void;
  companyName: string;
  doctorName: string;
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void | Promise<void>;
  activeAddOns?: string[];
}

export default function DoctorSampleRequest({ onBack, companyName, doctorName, onMenuChange = () => {}, onLogout, activeAddOns = [] }: DoctorSampleRequestProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState<SampleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [companyId, setCompanyId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [itemName, setItemName] = useState('');
  const [itemType] = useState<'sample'>('sample');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    checkAccessAndLoad();
  }, [companyName]);

  const checkAccessAndLoad = async () => {
    if (!companyName) {
      setEnabled(false);
      setLoading(false);
      return;
    }

    try {
      const companiesSnap = await getDocs(
        query(collection(db, 'pharmaCompanies'), where('companyName', '==', companyName), where('status', '==', 'active'))
      );

      if (companiesSnap.empty) {
        setEnabled(false);
        setLoading(false);
        return;
      }

      const userId = localStorage.getItem('userId') || '';
      let samplesEnabled = false;
      let foundCompanyId = '';

      for (const compDoc of companiesSnap.docs) {
        const doctorSnap = await getDocs(
          query(collection(db, 'pharmaCompanies', compDoc.id, 'distributedDoctors'), where('doctorId', '==', userId))
        );
        if (!doctorSnap.empty) {
          const doctorData = doctorSnap.docs[0].data();
          if (doctorData.samplesEnabled) {
            samplesEnabled = true;
            foundCompanyId = compDoc.id;
            break;
          }
        }
      }

      if (!samplesEnabled) {
        setEnabled(false);
        setLoading(false);
        return;
      }

      setEnabled(true);
      setCompanyId(foundCompanyId);
      await loadRequests(foundCompanyId, userId);
    } catch (err) {
      console.error('Error checking sample access:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async (cId: string, doctorId: string) => {
    const snap = await getDocs(
      query(
        collection(db, 'pharmaCompanies', cId, 'sampleRequests'),
        where('doctorId', '==', doctorId),
        orderBy('createdAt', 'desc')
      )
    );
    setRequests(snap.docs.map(d => ({ id: d.id, ...d.data(), approvalMessage: d.data().approvalMessage || '' } as SampleRequest)));
  };

  const handleSubmit = async () => {
    if (!itemName.trim()) {
      toast.error('Please enter the item name');
      return;
    }

    setSubmitting(true);
    try {
      const userId = localStorage.getItem('userId') || '';
      const userEmail = localStorage.getItem('healqr_user_email') || '';

      // Fetch doctor details for the request
      let doctorCode = '';
      let specialty = '';
      let territory = '';
      try {
        const doctorDoc = await getDoc(doc(db, 'doctors', userId));
        if (doctorDoc.exists()) {
          const dd = doctorDoc.data();
          doctorCode = dd.doctorCode || '';
          specialty = dd.specialty || '';
          territory = [dd.city, dd.state].filter(Boolean).join(', ') || dd.pincode || '';
        }
      } catch {}

      await addDoc(collection(db, 'pharmaCompanies', companyId, 'sampleRequests'), {
        doctorId: userId,
        doctorName,
        doctorEmail: userEmail,
        doctorCode,
        specialty,
        territory,
        itemName: itemName.trim(),
        itemType,
        quantity,
        notes: notes.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      toast.success('Request submitted successfully');
      setShowForm(false);
      setItemName('');
      setQuantity(1);
      setNotes('');
      await loadRequests(companyId, userId);
    } catch (err) {
      console.error('Error submitting request:', err);
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'approved': return <CheckCircle className="w-4 h-4 text-blue-400" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'fulfilled': return <Truck className="w-4 h-4 text-emerald-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      approved: 'bg-blue-500/20 text-blue-400',
      rejected: 'bg-red-500/20 text-red-400',
      fulfilled: 'bg-emerald-500/20 text-emerald-400',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (enabled === false) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white">
        <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activeMenu="pharma-samples" onMenuChange={onMenuChange} onLogout={onLogout} activeAddOns={activeAddOns} />
        <div className="lg:pl-64">
          <div className="flex flex-col items-center justify-center p-6 min-h-screen">
            <div className="text-center space-y-4">
              <Package className="w-16 h-16 text-gray-600 mx-auto" />
              <h2 className="text-xl font-bold text-white">Sample Requests Not Available</h2>
              <p className="text-gray-400 max-w-md">
                {!companyName
                  ? 'You are not linked to any pharma company.'
                  : 'Your pharma company has not enabled sample request access for your account.'}
              </p>
              <button onClick={onBack} className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition">
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activeMenu="pharma-samples" onMenuChange={onMenuChange} onLogout={onLogout} activeAddOns={activeAddOns} />
      <div className="lg:pl-64">
        {/* Sticky Header */}
        <div className="border-b border-gray-800 bg-[#0a0f1a]/95 backdrop-blur sticky top-0 z-40">
          <div className="px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="lg:hidden text-white" onClick={() => setSidebarOpen(true)}>
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-2">
                    <Package className="w-6 h-6 text-emerald-500" />
                    Sample Requests
                  </h1>
                  <p className="text-sm text-gray-400">Request from {companyName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition text-sm font-medium"
              >
                {showForm ? 'Cancel' : '+ New Request'}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">

        {/* New Request Form */}
        {showForm && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 space-y-4">
            <h3 className="font-semibold text-white">New Sample Request</h3>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Item Name</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Crocin Advance 500mg"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-24 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for the distributor..."
                rows={2}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !itemName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition disabled:opacity-50 text-sm font-medium"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Request
            </button>
          </div>
        )}

        {/* Request History */}
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No sample requests yet. Click "+ New Request" to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Request History ({requests.length})</h3>
            {requests.map(req => (
              <div key={req.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white truncate">{req.itemName}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        sample
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">Qty: {req.quantity}</p>
                    {req.notes && <p className="text-sm text-gray-500 mt-1">{req.notes}</p>}
                  </div>
                  {getStatusBadge(req.status)}
                </div>
                {req.approvalMessage && (req.status === 'approved' || req.status === 'fulfilled') && (
                  <div className="mt-2 flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-emerald-300">{req.approvalMessage}</p>
                  </div>
                )}
                {req.approvalMessage && req.status === 'rejected' && (
                  <div className="mt-2 flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <MessageSquare className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-300">{req.approvalMessage}</p>
                  </div>
                )}
                {req.createdAt && (
                  <p className="text-xs text-gray-600 mt-2">
                    Requested: {req.createdAt.toDate?.()?.toLocaleDateString() || ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
