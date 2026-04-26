import { useEffect, useState } from 'react';
import { db } from '../lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { toast } from 'sonner';
import { Database, Download, Loader2, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface ParamedicalDataManagementProps {
  paraId: string;
  paraName?: string;
}

const downloadCsv = (filename: string, rows: any[]) => {
  if (!rows.length) {
    toast.error('No data to export');
    return;
  }
  const headers = Array.from(rows.reduce<Set<string>>((set, r) => {
    Object.keys(r).forEach(k => set.add(k));
    return set;
  }, new Set()));
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export default function ParamedicalDataManagement({ paraId, paraName }: ParamedicalDataManagementProps) {
  const [counts, setCounts] = useState({ bookings: 0, receipts: 0, inventory: 0, allocations: 0 });
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!paraId) return;
    (async () => {
      try {
        const [b, r, i, a] = await Promise.all([
          getDocs(query(collection(db, 'paramedicalBookings'), where('paramedicalId', '==', paraId))),
          getDocs(query(collection(db, 'paramedicalReceipts'), where('paramedicalId', '==', paraId))).catch(() => ({ docs: [] } as any)),
          getDocs(collection(db, `paramedicals/${paraId}/inventory`)).catch(() => ({ docs: [] } as any)),
          getDocs(query(collection(db, 'labBookings'), where('allottedParamedicId', '==', paraId))).catch(() => ({ docs: [] } as any)),
        ]);
        setCounts({ bookings: b.docs.length, receipts: r.docs.length, inventory: i.docs.length, allocations: a.docs.length });
      } finally {
        setLoading(false);
      }
    })();
  }, [paraId]);

  const exportBookings = async () => {
    setBusy('bookings');
    try {
      const snap = await getDocs(query(collection(db, 'paramedicalBookings'), where('paramedicalId', '==', paraId)));
      const rows = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        .filter(b => (!from || b.appointmentDate >= from) && (!to || b.appointmentDate <= to))
        .map(b => ({
          bookingId: b.id,
          appointmentDate: b.appointmentDate,
          timeSlot: b.timeSlot,
          patientName: b.patientName,
          patientPhone: b.patientPhone,
          serviceType: b.serviceType,
          amount: b.amount,
          status: b.status,
          paymentStatus: b.paymentStatus,
          address: b.address,
        }));
      downloadCsv(`bookings-${from}-to-${to}.csv`, rows);
    } catch (e: any) { toast.error(e?.message); }
    finally { setBusy(null); }
  };

  const exportPatients = async () => {
    setBusy('patients');
    try {
      const snap = await getDocs(query(collection(db, 'paramedicalBookings'), where('paramedicalId', '==', paraId)));
      const map = new Map<string, any>();
      snap.docs.forEach(d => {
        const b: any = d.data();
        const phone = (b.patientPhone || '').replace(/\D/g, '').slice(-10);
        if (!phone) return;
        if (!map.has(phone)) {
          map.set(phone, {
            phone, name: b.patientName || '', age: b.patientAge || '', gender: b.patientGender || '',
            firstVisit: b.appointmentDate || '', lastVisit: b.appointmentDate || '', visits: 0, totalSpend: 0,
          });
        }
        const r = map.get(phone);
        r.visits += 1;
        r.totalSpend += Number(b.amount || 0);
        if (b.appointmentDate < r.firstVisit) r.firstVisit = b.appointmentDate;
        if (b.appointmentDate > r.lastVisit) r.lastVisit = b.appointmentDate;
        if (b.patientName) r.name = b.patientName;
      });
      downloadCsv(`patients-${today}.csv`, Array.from(map.values()));
    } catch (e: any) { toast.error(e?.message); }
    finally { setBusy(null); }
  };

  const exportReceipts = async () => {
    setBusy('receipts');
    try {
      const snap = await getDocs(query(collection(db, 'paramedicalReceipts'), where('paramedicalId', '==', paraId)));
      const rows = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        .filter(r => (!from || r.date >= from) && (!to || r.date <= to))
        .map(r => ({
          receiptNumber: r.receiptNumber, date: r.date, patientName: r.patientName,
          patientPhone: r.patientPhone, service: r.service, paymentMethod: r.paymentMethod, amount: r.amount,
        }));
      downloadCsv(`receipts-${from}-to-${to}.csv`, rows);
    } catch (e: any) { toast.error(e?.message); }
    finally { setBusy(null); }
  };

  const exportInventory = async () => {
    setBusy('inventory');
    try {
      const snap = await getDocs(collection(db, `paramedicals/${paraId}/inventory`));
      const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      downloadCsv(`inventory-${today}.csv`, rows);
    } catch (e: any) { toast.error(e?.message); }
    finally { setBusy(null); }
  };

  const exportAllocations = async () => {
    setBusy('allocations');
    try {
      const snap = await getDocs(query(collection(db, 'labBookings'), where('allottedParamedicId', '==', paraId)));
      const rows = snap.docs.map(d => {
        const b: any = d.data();
        return {
          id: d.id, bookingId: b.bookingId,
          patientName: b.patientName, patientPhone: b.patientPhone,
          address: b.homeAddress || b.address, pincode: b.homePincode,
          scheduledFor: b.scheduledFor || b.appointmentDate,
          slot: b.preferredSlot || b.timeSlot,
          amount: b.paymentDetails?.discountedPrice ?? b.totalAmount,
          labId: b.labId,
          allottedAt: b.allottedAt,
          collected: !!b.sampleCollected,
          collectedAt: b.collectedAt,
        };
      });
      downloadCsv(`lab-allocations-${today}.csv`, rows);
    } catch (e: any) { toast.error(e?.message); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600/20 to-emerald-600/20 border border-blue-500/30 rounded-xl p-5 flex items-center gap-4">
        <Database className="w-10 h-10 text-blue-400" />
        <div>
          <h3 className="text-white font-semibold">Data Management</h3>
          <p className="text-gray-400 text-sm">Export your records for accounting, GST or backup. {paraName && <span>· {paraName}</span>}</p>
        </div>
      </div>

      {/* Date range */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <p className="text-gray-400 text-xs mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" /> DATE RANGE (applies to bookings & receipts)</p>
        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <label className="text-gray-500 text-xs block mb-1">From</label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="bg-black border-zinc-800 text-white" />
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">To</label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="bg-black border-zinc-800 text-white" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ExportRow label="Bookings" count={counts.bookings} onExport={exportBookings} loading={busy === 'bookings'} />
          <ExportRow label="Patients (deduped)" count={counts.bookings ? '—' : 0} onExport={exportPatients} loading={busy === 'patients'} />
          <ExportRow label="Receipts" count={counts.receipts} onExport={exportReceipts} loading={busy === 'receipts'} />
          <ExportRow label="Inventory" count={counts.inventory} onExport={exportInventory} loading={busy === 'inventory'} />
          <ExportRow label="Lab Allocations" count={counts.allocations} onExport={exportAllocations} loading={busy === 'allocations'} />
        </div>
      )}
    </div>
  );
}

function ExportRow({ label, count, onExport, loading }: { label: string; count: number | string; onExport: () => void; loading: boolean }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-white font-medium">{label}</p>
        <p className="text-gray-500 text-xs">{count} record{count === 1 ? '' : 's'}</p>
      </div>
      <Button size="sm" disabled={loading} onClick={onExport} className="bg-blue-600 hover:bg-blue-700">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4 mr-1" /> CSV</>}
      </Button>
    </div>
  );
}
