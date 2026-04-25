import { useState, useEffect, useMemo } from 'react';
import {
  Truck, Search, Check, MapPin, Clock, Phone, User, Filter, RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { db } from '../lib/firebase/config';
import {
  collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { toast } from 'sonner';

interface LabAllocationQueueProps {
  labId: string;
  labName?: string;
}

interface HomeBooking {
  id: string;
  bookingId: string;
  patientName: string;
  patientPhone: string;
  bookingDate: string;
  timeSlot: string;
  branchName: string;
  homeAddress: string;
  homePincode: string;
  homeLandmark: string;
  testsSummary: string;
  testCount: number;
  amount: number;
  allottedTo?: string;
  allottedToName?: string;
  allottedAt?: string;
  sampleCollected?: boolean;
}

interface Paramedic {
  id: string;
  name: string;
  phone: string;
  role: string;
}

export default function LabAllocationQueue({ labId }: LabAllocationQueueProps) {
  const [bookings, setBookings] = useState<HomeBooking[]>([]);
  const [paramedics, setParamedics] = useState<Paramedic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'pending' | 'allotted' | 'all'>('pending');
  const [allotModal, setAllotModal] = useState<HomeBooking | null>(null);
  const [selectedParamedic, setSelectedParamedic] = useState<string>('');

  useEffect(() => {
    if (!labId) return;
    load();
  }, [labId]);

  const load = async () => {
    setLoading(true);
    try {
      const [bSnap, pSnap] = await Promise.all([
        getDocs(query(collection(db, 'labBookings'), where('labId', '==', labId), where('collectionType', '==', 'home-collection'))),
        getDocs(query(collection(db, 'paramedicals'), where('linkedLabIds', 'array-contains', labId))),
      ]);

      const todayISO = new Date().toISOString().split('T')[0];
      const horizon = new Date(); horizon.setDate(horizon.getDate() - 7);
      const cutoffISO = horizon.toISOString().split('T')[0];

      const rows: HomeBooking[] = [];
      bSnap.docs.forEach(d => {
        const data: any = d.data();
        if (data.isCancelled || data.status === 'cancelled') return;
        const bDate: string = data.bookingDate || '';
        if (bDate < cutoffISO) return; // last 7 days + future only
        if (data.reportSent) return; // already done

        const tests = Array.isArray(data.selectedTests) ? data.selectedTests : Array.isArray(data.tests) ? data.tests : [];
        rows.push({
          id: d.id,
          bookingId: data.bookingId || d.id,
          patientName: data.patientName || 'Unknown',
          patientPhone: data.patientPhone || '',
          bookingDate: bDate,
          timeSlot: data.timeSlot || data.slotName || '',
          branchName: data.branchName || '',
          homeAddress: data.homeAddress || '',
          homePincode: data.homePincode || '',
          homeLandmark: data.homeLandmark || '',
          testsSummary: tests.map((t: any) => t?.name || t?.testName).filter(Boolean).slice(0, 4).join(', '),
          testCount: tests.length,
          amount: Number(data.paymentDetails?.discountedPrice ?? data.totalAmount ?? 0),
          allottedTo: data.allottedParamedicId,
          allottedToName: data.allottedParamedicName,
          allottedAt: data.allottedAt,
          sampleCollected: data.sampleCollected,
        });
      });
      rows.sort((a, b) => (a.bookingDate < b.bookingDate ? -1 : a.bookingDate > b.bookingDate ? 1 : a.timeSlot.localeCompare(b.timeSlot)));

      const paras: Paramedic[] = pSnap.docs.map(d => ({
        id: d.id,
        name: (d.data() as any).name || 'Unknown',
        phone: (d.data() as any).phone || '',
        role: (d.data() as any).role || 'Phlebotomist',
      }));
      paras.sort((a, b) => a.name.localeCompare(b.name));

      setBookings(rows);
      setParamedics(paras);
    } catch (err) {
      console.error('[LabAllocationQueue] load:', err);
      toast.error('Failed to load home-collection queue');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter(b => {
      if (filter === 'pending' && b.allottedTo) return false;
      if (filter === 'allotted' && !b.allottedTo) return false;
      if (q && !`${b.patientName} ${b.patientPhone} ${b.homePincode} ${b.bookingId}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [bookings, search, filter]);

  const stats = useMemo(() => {
    const pending = bookings.filter(b => !b.allottedTo).length;
    const allotted = bookings.filter(b => b.allottedTo && !b.sampleCollected).length;
    const collected = bookings.filter(b => b.sampleCollected).length;
    return { pending, allotted, collected, total: bookings.length };
  }, [bookings]);

  const openAllot = (b: HomeBooking) => {
    setAllotModal(b);
    setSelectedParamedic(b.allottedTo || '');
  };

  const submitAllot = async () => {
    if (!allotModal) return;
    if (!selectedParamedic) { toast.error('Select a paramedic'); return; }
    const para = paramedics.find(p => p.id === selectedParamedic);
    if (!para) return;
    try {
      const allottedAt = new Date().toISOString();
      await updateDoc(doc(db, 'labBookings', allotModal.id), {
        allottedParamedicId: para.id,
        allottedParamedicName: para.name,
        allottedParamedicPhone: para.phone,
        allottedAt,
      });
      try {
        await addDoc(collection(db, 'paramedicals', para.id, 'notifications'), {
          type: 'new-allotment',
          title: `New home-collection from lab`,
          message: `${allotModal.patientName} · ${allotModal.bookingDate} ${allotModal.timeSlot}${allotModal.homePincode ? ` · ${allotModal.homePincode}` : ''}`,
          bookingId: allotModal.bookingId,
          createdAt: serverTimestamp(),
          read: false,
        });
      } catch {}

      setBookings(prev => prev.map(b => b.id === allotModal.id ? { ...b, allottedTo: para.id, allottedToName: para.name, allottedAt } : b));
      toast.success(`Allotted to ${para.name}`);
      setAllotModal(null);
    } catch (err) {
      console.error(err);
      toast.error('Allotment failed');
    }
  };

  const callPatient = (phone: string) => {
    const num = phone.replace(/\D/g, '');
    window.open(`tel:${num}`);
  };
  const messagePatient = (b: HomeBooking) => {
    const text = encodeURIComponent(`Hi ${b.patientName?.split(' ')[0] || 'there'}, our paramedic is on the way for sample collection at ${b.bookingDate} ${b.timeSlot}. Address: ${b.homeAddress}.`);
    const phone = b.patientPhone.replace(/\D/g, '');
    const num = phone.length === 10 ? `91${phone}` : phone;
    window.open(`https://wa.me/${num}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-white text-2xl font-bold flex items-center gap-2">
                <Truck className="w-6 h-6 text-orange-500" /> Allocation Queue
              </h2>
              <p className="text-gray-400 text-sm mt-1">Home-collection bookings · assign to paramedics</p>
            </div>
            <Button variant="outline" className="border-zinc-700 text-gray-300" onClick={load}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Home Visits', value: stats.total, color: 'text-blue-400' },
          { label: 'Pending Allotment', value: stats.pending, color: 'text-amber-400' },
          { label: 'Allotted (in progress)', value: stats.allotted, color: 'text-violet-400' },
          { label: 'Sample Collected', value: stats.collected, color: 'text-emerald-400' },
        ].map((k, i) => (
          <Card key={i} className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{k.label}</span>
              <div className={`text-3xl font-bold mt-2 ${k.color}`}>{loading ? '…' : k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient, phone, pincode or booking"
                className="pl-9 bg-zinc-950 border-zinc-800 text-white" />
            </div>
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-[180px] bg-zinc-950 border-zinc-800 text-gray-200 text-xs">
                <Filter className="w-3.5 h-3.5 mr-2 text-orange-500" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-gray-200">
                <SelectItem value="pending">Pending Allotment</SelectItem>
                <SelectItem value="allotted">Allotted</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[11px] text-gray-500">{filtered.length} bookings</span>
          </div>

          {loading ? (
            <div className="text-gray-500 text-sm py-10 text-center">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-gray-500 text-sm py-10 text-center">No bookings match.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(b => (
                <div key={b.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                    <div className="md:col-span-5">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-orange-400" />
                        <p className="text-white font-semibold">{b.patientName}</p>
                        {b.sampleCollected && <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">COLLECTED</span>}
                        {!b.sampleCollected && b.allottedTo && <span className="text-[10px] font-bold bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">ALLOTTED</span>}
                        {!b.allottedTo && <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">PENDING</span>}
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {b.patientPhone} · {b.bookingId}
                      </p>
                      <p className="text-gray-400 text-xs mt-1.5 flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{b.homeAddress}{b.homeLandmark ? ` · ${b.homeLandmark}` : ''}{b.homePincode ? ` · ${b.homePincode}` : ''}</span>
                      </p>
                    </div>
                    <div className="md:col-span-3">
                      <p className="text-white text-sm font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        {b.bookingDate} {b.timeSlot && `· ${b.timeSlot}`}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">{b.testCount} tests · ₹{b.amount.toLocaleString()}</p>
                      <p className="text-gray-400 text-xs mt-0.5 truncate">{b.testsSummary}</p>
                    </div>
                    <div className="md:col-span-2 text-xs">
                      {b.allottedToName ? (
                        <>
                          <p className="text-violet-300 font-semibold">{b.allottedToName}</p>
                          <p className="text-gray-500 text-[10px] mt-0.5">{b.allottedAt ? new Date(b.allottedAt).toLocaleString('en-IN') : ''}</p>
                        </>
                      ) : (
                        <p className="text-gray-500 italic">Not allotted</p>
                      )}
                    </div>
                    <div className="md:col-span-2 flex flex-wrap gap-1.5 justify-end">
                      <Button size="sm" className="h-7 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={() => openAllot(b)}>
                        <Check className="w-3 h-3 mr-1" /> {b.allottedTo ? 'Reassign' : 'Allot'}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-700 text-emerald-300"
                        onClick={() => messagePatient(b)}>
                        WA
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-blue-700 text-blue-300"
                        onClick={() => callPatient(b.patientPhone)}>
                        Call
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {allotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setAllotModal(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white text-lg font-bold mb-1">Allot Paramedic</h3>
            <p className="text-gray-400 text-xs mb-4">{allotModal.patientName} · {allotModal.bookingDate} {allotModal.timeSlot}</p>
            {paramedics.length === 0 ? (
              <div className="text-gray-500 text-sm py-6 text-center">
                No paramedics linked. Add one in <span className="text-orange-300">Paramedical Manager</span>.
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {paramedics.map(p => (
                  <button key={p.id} onClick={() => setSelectedParamedic(p.id)}
                    className={`w-full p-3 rounded-lg border text-left transition ${selectedParamedic === p.id ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-800 hover:border-zinc-700'}`}>
                    <p className="text-white font-semibold">{p.name}</p>
                    <p className="text-gray-500 text-xs">{p.role} · {p.phone}</p>
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" className="border-zinc-700 text-gray-300" onClick={() => setAllotModal(null)}>Cancel</Button>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={submitAllot} disabled={!selectedParamedic}>
                Confirm Allotment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
