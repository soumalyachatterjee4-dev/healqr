import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/firebase/config';
import {
  addDoc, collection, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp,
  Timestamp, updateDoc, where,
} from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Loader2, FileText, IndianRupee, Download, CheckCircle2, Clock, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface ParamedicalBillingProps {
  paraId: string;
  paraName?: string;
}

interface Booking {
  id: string;
  patientName: string;
  patientPhone: string;
  appointmentDate: string;
  timeSlot: string;
  serviceType?: string;
  amount?: number;
  paymentStatus?: string;
  status?: string;
}

interface Receipt {
  id: string;
  bookingId: string;
  patientName: string;
  patientPhone: string;
  amount: number;
  service: string;
  receiptNumber: string;
  paymentMethod: string;
  date: string;
  createdAt?: any;
}

export default function ParamedicalBilling({ paraId, paraName }: ParamedicalBillingProps) {
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    if (!paraId) { setLoading(false); return; }
    const unsubB = onSnapshot(
      query(collection(db, 'paramedicalBookings'), where('paramedicalId', '==', paraId)),
      (snap) => {
        setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));
        setLoading(false);
      },
      (err) => { console.error(err); setLoading(false); }
    );
    const unsubR = onSnapshot(
      query(collection(db, 'paramedicalReceipts'), where('paramedicalId', '==', paraId)),
      (snap) => setReceipts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Receipt))),
      () => {}
    );
    return () => { unsubB(); unsubR(); };
  }, [paraId]);

  const pending = useMemo(() => bookings
    .filter(b => b.status === 'completed' && b.paymentStatus !== 'paid')
    .filter(b => !receipts.some(r => r.bookingId === b.id))
    .filter(b => !search || b.patientName?.toLowerCase().includes(search.toLowerCase()) || b.patientPhone?.includes(search)),
    [bookings, receipts, search]);

  const sortedReceipts = useMemo(() =>
    [...receipts].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .filter(r => !search || r.patientName?.toLowerCase().includes(search.toLowerCase()) || r.patientPhone?.includes(search) || r.receiptNumber?.includes(search)),
    [receipts, search]);

  const totalToday = receipts
    .filter(r => r.date === new Date().toISOString().slice(0, 10))
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalMonth = receipts
    .filter(r => (r.date || '').startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const generateReceipt = async (b: Booking, paymentMethod: string) => {
    if (!b.amount || b.amount <= 0) {
      toast.error('Set an amount on the booking first');
      return;
    }
    setGenerating(b.id);
    try {
      const receiptNumber = `R-${Date.now().toString().slice(-8)}`;
      const date = new Date().toISOString().slice(0, 10);

      await addDoc(collection(db, 'paramedicalReceipts'), {
        paramedicalId: paraId,
        paraName: paraName || '',
        bookingId: b.id,
        patientName: b.patientName,
        patientPhone: b.patientPhone,
        amount: Number(b.amount),
        service: b.serviceType || 'Service',
        receiptNumber,
        paymentMethod,
        date,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'paramedicalBookings', b.id), {
        paymentStatus: 'paid',
        paidAt: Timestamp.now(),
        paymentMethod,
      });

      await downloadReceiptPdf({
        receiptNumber, date,
        patientName: b.patientName,
        patientPhone: b.patientPhone,
        amount: Number(b.amount),
        service: b.serviceType || 'Service',
        paymentMethod,
        bookingId: b.id,
        paraName: paraName || 'Healthcare Professional',
      });
      toast.success('Receipt generated');
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setGenerating(null);
    }
  };

  const reDownload = async (r: Receipt) => {
    await downloadReceiptPdf({
      receiptNumber: r.receiptNumber,
      date: r.date,
      patientName: r.patientName,
      patientPhone: r.patientPhone,
      amount: r.amount,
      service: r.service,
      paymentMethod: r.paymentMethod,
      bookingId: r.bookingId,
      paraName: paraName || 'Healthcare Professional',
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Pending Bills" value={pending.length} icon={Clock} color="text-orange-400" />
        <KPI label="Receipts" value={receipts.length} icon={FileText} color="text-teal-400" />
        <KPI label="Today" value={`₹${totalToday}`} icon={IndianRupee} color="text-emerald-400" />
        <KPI label="This Month" value={`₹${totalMonth}`} icon={IndianRupee} color="text-purple-400" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800">
        <TabBtn active={tab === 'pending'} onClick={() => setTab('pending')}>Pending Bills ({pending.length})</TabBtn>
        <TabBtn active={tab === 'history'} onClick={() => setTab('history')}>Receipt History ({receipts.length})</TabBtn>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / phone / receipt #"
          className="pl-9 bg-black border-zinc-800 text-white" />
      </div>

      {tab === 'pending' && (
        <div className="space-y-2">
          {pending.length === 0 ? <Empty msg="No pending bills." /> : pending.map(b => (
            <div key={b.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium">{b.patientName}</p>
                <p className="text-gray-500 text-xs">{b.patientPhone} • {b.appointmentDate} {b.timeSlot} • {b.serviceType || 'Service'}</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 font-bold text-lg">₹{b.amount || 0}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={generating === b.id} onClick={() => generateReceipt(b, 'Cash')} className="bg-emerald-600 hover:bg-emerald-700">
                  {generating === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cash'}
                </Button>
                <Button size="sm" disabled={generating === b.id} onClick={() => generateReceipt(b, 'UPI')} className="bg-teal-600 hover:bg-teal-700">UPI</Button>
                <Button size="sm" disabled={generating === b.id} onClick={() => generateReceipt(b, 'Card')} variant="outline" className="border-zinc-700 text-white">Card</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {sortedReceipts.length === 0 ? <Empty msg="No receipts yet." /> : sortedReceipts.map(r => (
            <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium">{r.patientName} <span className="text-emerald-400 text-xs ml-2">{r.receiptNumber}</span></p>
                <p className="text-gray-500 text-xs">{r.patientPhone} • {r.date} • {r.service} • {r.paymentMethod}</p>
              </div>
              <p className="text-emerald-400 font-bold">₹{r.amount}</p>
              <Button size="sm" variant="outline" className="border-zinc-700 text-white" onClick={() => reDownload(r)}>
                <Download className="w-4 h-4 mr-1" /> PDF
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2"><Icon className={`w-4 h-4 ${color}`} /><p className="text-gray-400 text-xs">{label}</p></div>
      <p className="text-white text-2xl font-bold">{value}</p>
    </div>
  );
}

function TabBtn({ active, onClick, children }: any) {
  return (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${active ? 'text-teal-400 border-teal-500' : 'text-gray-400 border-transparent hover:text-white'}`}>
      {children}
    </button>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="text-center text-gray-500 py-12 bg-zinc-900/40 rounded-xl border border-dashed border-zinc-800">{msg}</div>;
}

async function downloadReceiptPdf(d: {
  receiptNumber: string; date: string; patientName: string; patientPhone: string;
  amount: number; service: string; paymentMethod: string; bookingId: string; paraName: string;
}) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a5' });
  const w = pdf.internal.pageSize.getWidth();

  // Header bar
  pdf.setFillColor(20, 184, 166);
  pdf.rect(0, 0, w, 8, 'F');

  pdf.setFontSize(16); pdf.setTextColor(20, 20, 20); pdf.setFont('helvetica', 'bold');
  pdf.text(d.paraName, 10, 22);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(120, 120, 120);
  pdf.text('Healthcare Professional · HealQR', 10, 27);

  // QR (verification link)
  try {
    const verifyUrl = `https://healqr.com/?receipt=${encodeURIComponent(d.receiptNumber)}&booking=${encodeURIComponent(d.bookingId)}`;
    const qr = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1 });
    pdf.addImage(qr, 'PNG', w - 30, 10, 22, 22);
  } catch {}

  pdf.setDrawColor(220); pdf.line(10, 36, w - 10, 36);
  pdf.setFontSize(11); pdf.setTextColor(20, 20, 20);
  pdf.text(`Receipt #: ${d.receiptNumber}`, 10, 44);
  pdf.text(`Date: ${d.date}`, 10, 50);

  pdf.setFontSize(10);
  let y = 60;
  pdf.text(`Patient: ${d.patientName}`, 10, y); y += 6;
  pdf.text(`Phone: ${d.patientPhone}`, 10, y); y += 6;
  pdf.text(`Service: ${d.service}`, 10, y); y += 6;
  pdf.text(`Payment: ${d.paymentMethod}`, 10, y); y += 10;

  pdf.setFontSize(13); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(16, 185, 129);
  pdf.text(`Amount Paid: ₹${d.amount}`, 10, y); y += 12;

  pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(140, 140, 140);
  pdf.text('Thank you for choosing HealQR.', 10, y);
  pdf.text('Scan QR to verify this receipt.', 10, y + 5);

  pdf.save(`Receipt-${d.receiptNumber}.pdf`);
}
