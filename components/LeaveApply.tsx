import { useState, useEffect } from 'react';
import { Calendar, Send, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner';

const LEAVE_TYPES = [
  { id: 'casual', label: 'Casual Leave', desc: 'Personal / family reasons' },
  { id: 'medical', label: 'Medical Leave', desc: 'Health / medical reasons' },
  { id: 'earned', label: 'Earned Leave', desc: 'Pre-planned / vacation' },
  { id: 'half-day', label: 'Half Day', desc: 'Morning or afternoon off' },
];

export default function LeaveApply() {
  const params = new URLSearchParams(window.location.search);
  const doctorId = params.get('doctorId') || '';
  const clinicId = params.get('clinicId') || '';
  const staffId = params.get('staffId') || '';
  const staffName = decodeURIComponent(params.get('staffName') || '');
  const ownerField = doctorId ? 'doctorId' : 'clinicId';
  const ownerId = doctorId || clinicId;

  const [ownerName, setOwnerName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveType, setLeaveType] = useState('casual');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOwner = async () => {
      try {
        const { db } = await import('../lib/firebase/config');
        const { doc, getDoc } = await import('firebase/firestore');
        const col = doctorId ? 'doctors' : 'clinics';
        const snap = await getDoc(doc(db, col, ownerId));
        if (snap.exists()) {
          const data = snap.data();
          setOwnerName(data.name || data.clinicName || data.displayName || '');
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    if (ownerId) loadOwner();
    else setLoading(false);

    // Default dates
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setStartDate(todayStr);
    setEndDate(todayStr);
  }, [ownerId, doctorId]);

  const handleSubmit = async () => {
    if (!startDate || !endDate) { toast.error('Please select dates'); return; }
    if (startDate > endDate) { toast.error('End date must be after start date'); return; }
    if (!reason.trim()) { toast.error('Please provide a reason'); return; }

    setSubmitting(true);
    try {
      const { db } = await import('../lib/firebase/config');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'leaveRequests'), {
        staffId,
        staffName,
        startDate,
        endDate,
        leaveType,
        reason: reason.trim(),
        status: 'pending',
        appliedAt: serverTimestamp(),
        [ownerField]: ownerId,
      });
      setSubmitted(true);
      toast.success('Leave request submitted!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit. Please try again.');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!staffId || !ownerId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="bg-gray-900 border-gray-800 max-w-sm w-full">
          <CardContent className="p-6 text-center">
            <p className="text-red-400 text-sm">Invalid link. Please use the leave application link shared by your employer.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="bg-gray-900 border-gray-800 max-w-sm w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Leave Request Submitted</h2>
            <p className="text-sm text-gray-400 mb-1">Your {LEAVE_TYPES.find(t => t.id === leaveType)?.label} request has been sent for approval.</p>
            <p className="text-xs text-gray-500 mt-3">{startDate}{endDate !== startDate ? ` to ${endDate}` : ''}</p>
            <p className="text-xs text-amber-400 mt-4">Your employer will review and approve/reject this request.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Leave Application</h1>
          {ownerName && <p className="text-xs text-gray-500 mt-1">{ownerName}</p>}
          <p className="text-sm text-emerald-400 mt-2 font-medium">{staffName}</p>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-5 space-y-4">
            {/* Leave Type */}
            <div>
              <label className="text-xs text-gray-400 block mb-2">Leave Type</label>
              <div className="grid grid-cols-2 gap-2">
                {LEAVE_TYPES.map(t => (
                  <button key={t.id} onClick={() => setLeaveType(t.id)}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${leaveType === t.id ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                    <p className="text-xs font-medium">{t.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">From</label>
                <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">To</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
            </div>

            {/* Days count */}
            {startDate && endDate && (
              <p className="text-xs text-gray-500 text-center">
                {(() => {
                  const d1 = new Date(startDate), d2 = new Date(endDate);
                  const days = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  return `${days} day${days > 1 ? 's' : ''}${leaveType === 'half-day' ? ' (half day)' : ''}`;
                })()}
              </p>
            )}

            {/* Reason */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Reason *</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Please describe your reason for leave..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" />
            </div>

            {/* Submit */}
            <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm py-2.5">
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Submit Leave Request</>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-gray-600 mt-4">Powered by HealQR</p>
      </div>
    </div>
  );
}
