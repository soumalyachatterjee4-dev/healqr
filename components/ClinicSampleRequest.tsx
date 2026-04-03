import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Package, ArrowLeft, Loader2, Send, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import { toast } from 'sonner';

interface SampleRequest {
  id: string;
  itemName: string;
  itemType: 'sample' | 'literature';
  quantity: number;
  notes: string;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  createdAt: any;
  updatedAt?: any;
}

interface ClinicSampleRequestProps {
  onBack: () => void;
  companyName: string;
  clinicName: string;
}

export default function ClinicSampleRequest({ onBack, companyName, clinicName }: ClinicSampleRequestProps) {
  const [requests, setRequests] = useState<SampleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [companyId, setCompanyId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState<'sample' | 'literature'>('sample');
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

      const clinicId = localStorage.getItem('userId') || '';
      let samplesEnabled = false;
      let foundCompanyId = '';

      for (const compDoc of companiesSnap.docs) {
        const clinicSnap = await getDocs(
          query(collection(db, 'pharmaCompanies', compDoc.id, 'distributedClinics'), where('clinicId', '==', clinicId))
        );
        if (!clinicSnap.empty) {
          const data = clinicSnap.docs[0].data();
          if (data.samplesEnabled) {
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
      await loadRequests(foundCompanyId, clinicId);
    } catch (err) {
      console.error('Error checking sample access:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async (cId: string, clinicId: string) => {
    const snap = await getDocs(
      query(
        collection(db, 'pharmaCompanies', cId, 'sampleRequests'),
        where('doctorId', '==', clinicId),
        orderBy('createdAt', 'desc')
      )
    );
    setRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SampleRequest)));
  };

  const handleSubmit = async () => {
    if (!itemName.trim()) {
      toast.error('Please enter the item name');
      return;
    }

    setSubmitting(true);
    try {
      const clinicId = localStorage.getItem('userId') || '';
      const clinicEmail = localStorage.getItem('healqr_user_email') || '';

      await addDoc(collection(db, 'pharmaCompanies', companyId, 'sampleRequests'), {
        doctorId: clinicId,
        doctorName: clinicName,
        doctorEmail: clinicEmail,
        itemName: itemName.trim(),
        itemType,
        quantity,
        notes: notes.trim(),
        status: 'pending',
        isClinic: true,
        createdAt: serverTimestamp(),
      });

      toast.success('Request submitted successfully');
      setShowForm(false);
      setItemName('');
      setItemType('sample');
      setQuantity(1);
      setNotes('');
      await loadRequests(companyId, clinicId);
    } catch (err) {
      console.error('Error submitting request:', err);
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const icons: Record<string, JSX.Element> = {
      pending: <Clock className="w-4 h-4 text-yellow-400" />,
      approved: <CheckCircle className="w-4 h-4 text-blue-400" />,
      rejected: <XCircle className="w-4 h-4 text-red-400" />,
      fulfilled: <Truck className="w-4 h-4 text-emerald-400" />,
    };
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      approved: 'bg-blue-500/20 text-blue-400',
      rejected: 'bg-red-500/20 text-red-400',
      fulfilled: 'bg-emerald-500/20 text-emerald-400',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>
        {icons[status] || <Clock className="w-4 h-4 text-gray-400" />}
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
      <div className="min-h-screen bg-[#0a0f1a] flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Package className="w-16 h-16 text-gray-600 mx-auto" />
          <h2 className="text-xl font-bold text-white">Sample Requests Not Available</h2>
          <p className="text-gray-400 max-w-md">
            {!companyName
              ? 'Your clinic is not linked to any pharma company.'
              : 'The pharma company has not enabled sample request access for your clinic.'}
          </p>
          <button onClick={onBack} className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
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

        {/* New Request Form */}
        {showForm && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 space-y-4">
            <h3 className="font-semibold text-white">New Sample / Literature Request</h3>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Item Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setItemType('sample')}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    itemType === 'sample' ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-gray-400'
                  }`}
                >
                  Sample
                </button>
                <button
                  onClick={() => setItemType('literature')}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    itemType === 'literature' ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-gray-400'
                  }`}
                >
                  Literature
                </button>
              </div>
            </div>

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
                        req.itemType === 'sample' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {req.itemType}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">Qty: {req.quantity}</p>
                    {req.notes && <p className="text-sm text-gray-500 mt-1">{req.notes}</p>}
                  </div>
                  {getStatusBadge(req.status)}
                </div>
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
  );
}
