import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/firebase/config';
import {
  collection, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where,
} from 'firebase/firestore';
import { toast } from 'sonner';
import {
  MapPin, Phone, User, Loader2, CheckCircle2, Clock, FlaskConical, MessageCircle, Navigation,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface ParamedicalAllocationQueueProps {
  paraId: string;
}

interface HomeBooking {
  id: string;
  bookingId: string;
  patientName: string;
  patientPhone: string;
  patientAddress: string;
  homePincode: string;
  preferredSlot: string;
  scheduledFor?: string;
  testsSummary: string;
  testCount: number;
  amount: number;
  labId: string;
  labName?: string;
  allottedAt?: string;
  sampleCollected?: boolean;
  collectedAt?: string;
}

export default function ParamedicalAllocationQueue({ paraId }: ParamedicalAllocationQueueProps) {
  const [bookings, setBookings] = useState<HomeBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'pending' | 'collected' | 'all'>('pending');
  const [labMap, setLabMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!paraId) { setLoading(false); return; }
    const unsub = onSnapshot(
      query(collection(db, 'labBookings'), where('allottedParamedicId', '==', paraId)),
      (snap) => {
        const list: HomeBooking[] = [];
        snap.forEach(d => {
          const data: any = d.data();
          const tests = data.tests || data.bookedTests || [];
          list.push({
            id: d.id,
            bookingId: data.bookingId || d.id,
            patientName: data.patientName || 'Patient',
            patientPhone: data.patientPhone || '',
            patientAddress: data.homeAddress || data.address || '',
            homePincode: data.homePincode || data.pincode || '',
            preferredSlot: data.preferredSlot || data.timeSlot || '',
            scheduledFor: data.scheduledFor || data.appointmentDate || '',
            testsSummary: tests.map((t: any) => t?.name || t?.testName).filter(Boolean).slice(0, 4).join(', '),
            testCount: tests.length,
            amount: Number(data.paymentDetails?.discountedPrice ?? data.totalAmount ?? 0),
            labId: data.labId || '',
            allottedAt: data.allottedAt,
            sampleCollected: data.sampleCollected,
            collectedAt: data.collectedAt,
          });
        });
        list.sort((a, b) => (a.scheduledFor || '').localeCompare(b.scheduledFor || ''));
        setBookings(list);
        setLoading(false);
      },
      (err) => { console.error(err); setLoading(false); }
    );
    return () => unsub();
  }, [paraId]);

  // Resolve lab names lazily
  useEffect(() => {
    const ids = Array.from(new Set(bookings.map(b => b.labId).filter(Boolean)));
    const missing = ids.filter(id => !labMap[id]);
    if (!missing.length) return;
    (async () => {
      const updates: Record<string, string> = {};
      for (const id of missing) {
        try {
          const snap = await getDocs(query(collection(db, 'labs'), where('__name__', '==', id)));
          if (!snap.empty) updates[id] = (snap.docs[0].data() as any).labName || (snap.docs[0].data() as any).name || id;
        } catch {}
      }
      if (Object.keys(updates).length) setLabMap(prev => ({ ...prev, ...updates }));
    })();
  }, [bookings, labMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter(b => {
      if (filter === 'pending' && b.sampleCollected) return false;
      if (filter === 'collected' && !b.sampleCollected) return false;
      if (q && !`${b.patientName} ${b.patientPhone} ${b.homePincode} ${b.bookingId}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [bookings, search, filter]);

  const stats = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter(b => !b.sampleCollected).length,
    collected: bookings.filter(b => b.sampleCollected).length,
  }), [bookings]);

  const markCollected = async (b: HomeBooking) => {
    if (!confirm(`Mark sample as collected for ${b.patientName}?`)) return;
    try {
      await updateDoc(doc(db, 'labBookings', b.id), {
        sampleCollected: true,
        collectedAt: new Date().toISOString(),
        collectedBy: paraId,
      });
      toast.success('Marked as collected');
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    }
  };

  const openMap = (b: HomeBooking) => {
    const q = encodeURIComponent(`${b.patientAddress}, ${b.homePincode}`);
    window.open(`https://maps.google.com/?q=${q}`, '_blank');
  };
  const callPatient = (b: HomeBooking) => window.open(`tel:${b.patientPhone}`);
  const messagePatient = (b: HomeBooking) =>
    window.open(`https://wa.me/91${b.patientPhone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent('Hi, I am from HealQR. Reaching out for your home sample collection visit.')}`, '_blank');

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading allocations…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/30 rounded-xl p-5 flex items-center gap-4">
        <FlaskConical className="w-10 h-10 text-orange-400" />
        <div>
          <h3 className="text-white font-semibold">Lab Allocation Queue</h3>
          <p className="text-gray-400 text-sm">Home-collection jobs assigned to you by labs.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KPI label="Total Allotted" value={stats.total} color="text-blue-400" />
        <KPI label="Pending Pickup" value={stats.pending} color="text-amber-400" />
        <KPI label="Collected" value={stats.collected} color="text-emerald-400" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {(['pending', 'collected', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-md text-xs font-medium ${filter === f ? 'bg-orange-600 text-white' : 'text-gray-400'}`}>
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / phone / pincode"
          className="bg-black border-zinc-800 text-white max-w-md" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-12 bg-zinc-900/40 rounded-xl border border-dashed border-zinc-800">
          No allocations in this view.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => (
            <div key={b.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <User className="w-4 h-4 text-orange-400" />
                    <p className="text-white font-semibold">{b.patientName}</p>
                    {b.sampleCollected ? (
                      <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">COLLECTED</span>
                    ) : (
                      <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">PENDING</span>
                    )}
                    {b.labId && labMap[b.labId] && (
                      <span className="text-[10px] bg-zinc-800 text-gray-300 px-2 py-0.5 rounded-full">{labMap[b.labId]}</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-1 flex items-center gap-1"><Phone className="w-3 h-3" /> {b.patientPhone} · {b.bookingId}</p>
                  <p className="text-gray-400 text-xs mt-1 flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" /> {b.patientAddress} {b.homePincode && `(${b.homePincode})`}</p>
                  <p className="text-gray-400 text-xs mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {b.scheduledFor} {b.preferredSlot}</p>
                  <p className="text-gray-400 text-xs mt-1">Tests: {b.testsSummary || `${b.testCount} test${b.testCount === 1 ? '' : 's'}`}</p>
                </div>
                <p className="text-emerald-400 font-bold">₹{b.amount}</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800/50">
                <Button size="sm" variant="outline" className="border-zinc-700 text-white" onClick={() => callPatient(b)}>
                  <Phone className="w-3.5 h-3.5 mr-1" /> Call
                </Button>
                <Button size="sm" variant="outline" className="border-emerald-700 text-emerald-300" onClick={() => messagePatient(b)}>
                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                </Button>
                <Button size="sm" variant="outline" className="border-blue-700 text-blue-300" onClick={() => openMap(b)}>
                  <Navigation className="w-3.5 h-3.5 mr-1" /> Directions
                </Button>
                {!b.sampleCollected && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 ml-auto" onClick={() => markCollected(b)}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Collected
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, color }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-gray-400 text-xs">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
