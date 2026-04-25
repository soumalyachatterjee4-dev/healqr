import { useState, useEffect, useMemo } from 'react';
import {
  Receipt, IndianRupee, Search, Filter, Download, Check, FileText,
  History, Wallet, AlertTriangle, Calendar, Building2, Phone,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { db } from '../lib/firebase/config';
import {
  collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, orderBy, limit,
} from 'firebase/firestore';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

interface LabBillingReceiptsProps {
  labId: string;
  labName?: string;
}

interface BillingBooking {
  id: string;
  bookingId: string;
  patientName: string;
  patientPhone: string;
  bookingDate: string;
  branchName: string;
  collectionType: string;
  tests: { name: string; price: number }[];
  mrp: number;
  discountPercent: number;
  discountedPrice: number;
  advancePaid: number;
  amountDue: number;
  paymentReceived: boolean;
  isCancelled: boolean;
}

interface SavedReceipt {
  id: string;
  receiptNo: string;
  bookingId: string;
  patientName: string;
  patientPhone: string;
  total: number;
  paymentMethod: string;
  branchName: string;
  createdAt: any;
}

type StatusFilter = 'all' | 'paid' | 'partial' | 'unpaid';

export default function LabBillingReceipts({ labId, labName }: LabBillingReceiptsProps) {
  const [activeTab, setActiveTab] = useState<'bills' | 'history'>('bills');
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BillingBooking[]>([]);
  const [receipts, setReceipts] = useState<SavedReceipt[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [generating, setGenerating] = useState<string | null>(null);

  // Payment modal
  const [payModal, setPayModal] = useState<BillingBooking | null>(null);
  const [pmMethod, setPmMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [pmAmount, setPmAmount] = useState<number>(0);

  useEffect(() => {
    if (!labId) { setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, 'labBookings'), where('labId', '==', labId)));
        const rows: BillingBooking[] = snap.docs.map(d => {
          const data: any = d.data();
          const pd = data.paymentDetails || {};
          const tests = Array.isArray(data.selectedTests) ? data.selectedTests : Array.isArray(data.tests) ? data.tests : [];
          return {
            id: d.id,
            bookingId: data.bookingId || d.id,
            patientName: data.patientName || 'Unknown',
            patientPhone: data.patientPhone || '',
            bookingDate: data.bookingDate || '',
            branchName: data.branchName || '',
            collectionType: data.collectionType || 'walk-in',
            tests: tests.map((t: any) => ({
              name: String(t?.name || t?.testName || 'Test'),
              price: Number(t?.discountedPrice ?? t?.price ?? 0),
            })),
            mrp: Number(pd.mrp ?? data.totalAmount ?? 0),
            discountPercent: Number(pd.discountPercent ?? 0),
            discountedPrice: Number(pd.discountedPrice ?? data.totalAmount ?? 0),
            advancePaid: Number(pd.advancePaid ?? 0),
            amountDue: Number(pd.amountDue ?? 0),
            paymentReceived: data.paymentReceived === true || Number(pd.amountDue ?? 0) === 0,
            isCancelled: data.isCancelled === true || data.status === 'cancelled' || data.status === 'rejected',
          };
        });
        if (cancelled) return;
        setBookings(rows);
      } catch (err) {
        console.error('[LabBillingReceipts] load bookings:', err);
        toast.error('Failed to load bookings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [labId]);

  useEffect(() => {
    if (!labId) return;
    const loadReceipts = async () => {
      try {
        const snap = await getDocs(query(
          collection(db, 'lab_receipts'),
          where('labId', '==', labId),
          orderBy('createdAt', 'desc'),
          limit(200),
        ));
        setReceipts(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      } catch (err) {
        // index may not exist yet — fallback unsorted
        try {
          const snap = await getDocs(query(collection(db, 'lab_receipts'), where('labId', '==', labId)));
          const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as SavedReceipt[];
          rows.sort((a, b) => {
            const ta = a.createdAt?.seconds || 0;
            const tb = b.createdAt?.seconds || 0;
            return tb - ta;
          });
          setReceipts(rows.slice(0, 200));
        } catch (e2) {
          console.error('[LabBillingReceipts] load receipts:', e2);
        }
      }
    };
    loadReceipts();
  }, [labId, generating]);

  const branches = useMemo(() => {
    const s = new Set<string>();
    bookings.forEach(b => { if (b.branchName) s.add(b.branchName); });
    return Array.from(s).sort();
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter(b => {
      if (b.isCancelled) return false;
      if (b.bookingDate < dateFrom || b.bookingDate > dateTo) return false;
      if (branchFilter !== 'all' && b.branchName !== branchFilter) return false;
      if (statusFilter === 'paid' && !(b.paymentReceived && b.amountDue === 0)) return false;
      if (statusFilter === 'unpaid' && !(b.advancePaid === 0 && b.amountDue > 0)) return false;
      if (statusFilter === 'partial' && !(b.advancePaid > 0 && b.amountDue > 0)) return false;
      if (q) {
        const hay = `${b.patientName} ${b.patientPhone} ${b.bookingId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => (a.bookingDate < b.bookingDate ? 1 : -1));
  }, [bookings, search, statusFilter, branchFilter, dateFrom, dateTo]);

  const kpis = useMemo(() => {
    let collected = 0, due = 0, count = filtered.length;
    filtered.forEach(b => {
      collected += b.advancePaid;
      due += b.amountDue;
    });
    return { collected, due, count };
  }, [filtered]);

  const statusOf = (b: BillingBooking) => {
    if (b.paymentReceived || b.amountDue === 0) return 'paid';
    if (b.advancePaid > 0) return 'partial';
    return 'unpaid';
  };

  const openPay = (b: BillingBooking) => {
    setPayModal(b);
    setPmAmount(b.amountDue);
    setPmMethod('CASH');
  };

  const submitPayment = async () => {
    if (!payModal) return;
    const amt = Math.max(0, Math.min(pmAmount, payModal.amountDue));
    try {
      const newAdvance = payModal.advancePaid + amt;
      const newDue = Math.max(0, payModal.amountDue - amt);
      await updateDoc(doc(db, 'labBookings', payModal.id), {
        paymentReceived: newDue === 0,
        paymentDetails: {
          mrp: payModal.mrp,
          discountPercent: payModal.discountPercent,
          discountedPrice: payModal.discountedPrice,
          advancePaid: newAdvance,
          amountDue: newDue,
          lastPaymentMethod: pmMethod,
        },
      });
      setBookings(prev => prev.map(p => p.id === payModal.id ? {
        ...p,
        advancePaid: newAdvance,
        amountDue: newDue,
        paymentReceived: newDue === 0,
      } : p));
      toast.success(newDue === 0 ? 'Marked as fully paid' : `Recorded ₹${amt} ${pmMethod}`);
      setPayModal(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update payment');
    }
  };

  const generateReceipt = async (b: BillingBooking) => {
    setGenerating(b.id);
    try {
      const receiptNo = `RCP-${Date.now().toString().slice(-8)}`;
      const totalPaid = b.advancePaid;
      const pdfDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      // QR (top-right) — scan to view receipt / booking online
      const qrPayload = `${window.location.origin}/?booking=${encodeURIComponent(b.bookingId)}&receipt=${encodeURIComponent(receiptNo)}`;
      let qrDataUrl = '';
      try {
        qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 0, width: 240, color: { dark: '#000', light: '#FFF' } });
      } catch (e) {
        console.error('[LabBillingReceipts] QR generation failed:', e);
      }
      const qrSize = 28; // mm
      const qrX = pageWidth - margin - qrSize;
      const qrY = y - 2;
      if (qrDataUrl) {
        pdfDoc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
        pdfDoc.setFontSize(7);
        pdfDoc.setFont('helvetica', 'normal');
        pdfDoc.setTextColor(120, 120, 120);
        pdfDoc.text('Scan to verify', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
      }

      // Header (lab name)
      pdfDoc.setFontSize(20);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.setTextColor(40, 40, 40);
      pdfDoc.text((labName || 'Lab').toUpperCase(), margin, y);
      y += 7;
      if (b.branchName) {
        pdfDoc.setFontSize(9);
        pdfDoc.setFont('helvetica', 'normal');
        pdfDoc.setTextColor(110, 110, 110);
        pdfDoc.text(b.branchName, margin, y);
        y += 5;
      }

      // Title
      y += 4;
      pdfDoc.setFontSize(16);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.setTextColor(30, 41, 59);
      pdfDoc.text('LAB RECEIPT', pageWidth / 2, y, { align: 'center' });
      y += 6;

      pdfDoc.setFontSize(9);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.setTextColor(80, 80, 80);
      pdfDoc.text(`Receipt No: ${receiptNo}`, margin, y);
      pdfDoc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - margin, y, { align: 'right' });
      y += 6;

      pdfDoc.setDrawColor(220);
      pdfDoc.line(margin, y, pageWidth - margin, y);
      y += 6;

      // Patient block
      pdfDoc.setFontSize(10);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.setTextColor(40);
      pdfDoc.text('Patient:', margin, y);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(b.patientName, margin + 22, y);
      y += 5;
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Phone:', margin, y);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(b.patientPhone || '—', margin + 22, y);
      y += 5;
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Booking:', margin, y);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(`${b.bookingId} (${b.bookingDate})`, margin + 22, y);
      y += 8;

      // Tests table header
      pdfDoc.setFillColor(248, 250, 252);
      pdfDoc.rect(margin, y - 4, contentWidth, 8, 'F');
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.setFontSize(10);
      pdfDoc.setTextColor(40);
      pdfDoc.text('#', margin + 3, y);
      pdfDoc.text('Test', margin + 12, y);
      pdfDoc.text('Amount', pageWidth - margin - 5, y, { align: 'right' });
      y += 6;

      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.setTextColor(60, 60, 60);
      b.tests.forEach((t, i) => {
        pdfDoc.text(String(i + 1), margin + 3, y);
        const name = pdfDoc.splitTextToSize(t.name, contentWidth - 50);
        pdfDoc.text(name, margin + 12, y);
        pdfDoc.text(`\u20B9${t.price.toLocaleString('en-IN')}`, pageWidth - margin - 5, y, { align: 'right' });
        y += Math.max(5, (Array.isArray(name) ? name.length : 1) * 5);
      });

      y += 2;
      pdfDoc.setDrawColor(59, 130, 246);
      pdfDoc.line(margin, y, pageWidth - margin, y);
      y += 6;

      // Totals
      const row = (label: string, value: string, bold = false, color: number[] = [40, 40, 40]) => {
        pdfDoc.setFont('helvetica', bold ? 'bold' : 'normal');
        pdfDoc.setTextColor(color[0], color[1], color[2]);
        pdfDoc.setFontSize(bold ? 11 : 10);
        pdfDoc.text(label, margin + 3, y);
        pdfDoc.text(value, pageWidth - margin - 5, y, { align: 'right' });
        y += bold ? 7 : 6;
      };
      row('MRP', `\u20B9${b.mrp.toLocaleString('en-IN')}`);
      if (b.discountPercent > 0) {
        row(`Discount (${b.discountPercent}%)`, `- \u20B9${(b.mrp - b.discountedPrice).toLocaleString('en-IN')}`, false, [16, 185, 129]);
      }
      row('Net Payable', `\u20B9${b.discountedPrice.toLocaleString('en-IN')}`, true, [30, 41, 59]);
      row('Paid', `\u20B9${totalPaid.toLocaleString('en-IN')}`, false, [59, 130, 246]);
      row('Balance Due', `\u20B9${b.amountDue.toLocaleString('en-IN')}`, true, b.amountDue === 0 ? [16, 185, 129] : [239, 68, 68]);

      // Footer
      y += 6;
      pdfDoc.setFontSize(8);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.setTextColor(120);
      pdfDoc.text('Computer-generated receipt. No signature required.', margin, y);
      y += 4;
      pdfDoc.text(`Issued by ${labName || 'Lab'} via HealQR`, margin, y);

      // Watermark
      pdfDoc.setTextColor(245, 245, 245);
      pdfDoc.setFontSize(60);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('healQR', pageWidth / 2, 150, { align: 'center', angle: 35 });

      pdfDoc.save(`receipt_${receiptNo}.pdf`);

      // Save to Firestore
      try {
        await addDoc(collection(db, 'lab_receipts'), {
          labId,
          labName: labName || '',
          branchName: b.branchName || '',
          receiptNo,
          bookingId: b.bookingId,
          patientName: b.patientName,
          patientPhone: b.patientPhone,
          total: b.discountedPrice,
          paid: totalPaid,
          due: b.amountDue,
          paymentMethod: 'CASH',
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        console.error('[LabBillingReceipts] save receipt failed:', e);
      }

      toast.success(`Receipt ${receiptNo} downloaded`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate receipt');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-white text-2xl font-bold flex items-center gap-2">
                <Receipt className="w-6 h-6 text-blue-500" /> Billing &amp; Receipts
              </h2>
              <p className="text-gray-400 text-sm mt-1">Issue receipts, record payments &amp; track collection</p>
            </div>
            <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
              <button onClick={() => setActiveTab('bills')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${activeTab === 'bills' ? 'bg-blue-500/20 text-blue-300' : 'text-gray-400 hover:text-white'}`}>
                Bills ({bookings.filter(b => !b.isCancelled).length})
              </button>
              <button onClick={() => setActiveTab('history')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${activeTab === 'history' ? 'bg-blue-500/20 text-blue-300' : 'text-gray-400 hover:text-white'}`}>
                Receipt History ({receipts.length})
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeTab === 'bills' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Bookings in window', value: kpis.count, icon: FileText, color: 'text-blue-400' },
              { label: 'Collected', value: `₹${kpis.collected.toLocaleString()}`, icon: Wallet, color: 'text-emerald-400' },
              { label: 'Outstanding', value: `₹${kpis.due.toLocaleString()}`, icon: AlertTriangle, color: 'text-amber-400' },
            ].map((k, i) => (
              <Card key={i} className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{k.label}</span>
                    <div className={`p-2 rounded-lg bg-zinc-950 ${k.color}`}><k.icon className="w-4 h-4" /></div>
                  </div>
                  <div className="text-2xl font-bold text-white">{loading ? '…' : k.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-4 relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search patient, phone or booking ID"
                    className="pl-9 bg-zinc-950 border-zinc-800 text-white"
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-white px-2 py-2 rounded text-xs w-full" />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <span className="text-gray-500 text-xs">to</span>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-white px-2 py-2 rounded text-xs w-full" />
                </div>
                <div className="md:col-span-2">
                  <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-gray-200 text-xs">
                      <Filter className="w-3.5 h-3.5 mr-2 text-blue-500" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-gray-200">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {branches.length > 1 && (
                  <div className="md:col-span-2">
                    <Select value={branchFilter} onValueChange={setBranchFilter}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 text-gray-200 text-xs">
                        <Building2 className="w-3.5 h-3.5 mr-2 text-blue-500" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-gray-200">
                        <SelectItem value="all">All Branches</SelectItem>
                        {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-gray-500 text-sm py-10 text-center">Loading bills…</div>
              ) : filtered.length === 0 ? (
                <div className="text-gray-500 text-sm py-10 text-center">No bookings match the filters.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-zinc-800">
                        <th className="py-2 font-semibold">Date</th>
                        <th className="py-2 font-semibold">Patient</th>
                        <th className="py-2 font-semibold">Phone</th>
                        <th className="py-2 font-semibold">Branch</th>
                        <th className="py-2 font-semibold">Tests</th>
                        <th className="py-2 font-semibold text-right">MRP</th>
                        <th className="py-2 font-semibold text-right">Net</th>
                        <th className="py-2 font-semibold text-right">Paid</th>
                        <th className="py-2 font-semibold text-right">Due</th>
                        <th className="py-2 font-semibold">Status</th>
                        <th className="py-2 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(b => {
                        const status = statusOf(b);
                        return (
                          <tr key={b.id} className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/30">
                            <td className="py-3 text-gray-400">{b.bookingDate}</td>
                            <td className="py-3 text-white font-medium">{b.patientName}</td>
                            <td className="py-3 text-gray-400">{b.patientPhone}</td>
                            <td className="py-3 text-gray-400">{b.branchName || '—'}</td>
                            <td className="py-3 text-gray-300 text-xs max-w-[180px] truncate" title={b.tests.map(t => t.name).join(', ')}>
                              {b.tests.length} · {b.tests.map(t => t.name).join(', ')}
                            </td>
                            <td className="py-3 text-right text-gray-300">₹{b.mrp.toLocaleString()}</td>
                            <td className="py-3 text-right text-white font-semibold">₹{b.discountedPrice.toLocaleString()}</td>
                            <td className="py-3 text-right text-blue-300">₹{b.advancePaid.toLocaleString()}</td>
                            <td className={`py-3 text-right font-semibold ${b.amountDue === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>₹{b.amountDue.toLocaleString()}</td>
                            <td className="py-3">
                              {status === 'paid' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">PAID</span>}
                              {status === 'partial' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">PARTIAL</span>}
                              {status === 'unpaid' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300">UNPAID</span>}
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {b.amountDue > 0 && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-700 text-emerald-300 hover:bg-emerald-950"
                                    onClick={() => openPay(b)}>
                                    <Check className="w-3 h-3 mr-1" /> Record
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" className="h-7 text-xs border-blue-700 text-blue-300 hover:bg-blue-950"
                                  onClick={() => generateReceipt(b)}
                                  disabled={generating === b.id}>
                                  <Download className="w-3 h-3 mr-1" /> {generating === b.id ? 'PDF…' : 'Receipt'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'history' && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <History className="w-4 h-4 text-blue-500" /> Receipt History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {receipts.length === 0 ? (
              <div className="text-gray-500 text-sm py-10 text-center">No receipts issued yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-zinc-800">
                      <th className="py-2 font-semibold">Receipt No</th>
                      <th className="py-2 font-semibold">Date</th>
                      <th className="py-2 font-semibold">Patient</th>
                      <th className="py-2 font-semibold">Phone</th>
                      <th className="py-2 font-semibold">Booking</th>
                      <th className="py-2 font-semibold">Branch</th>
                      <th className="py-2 font-semibold">Method</th>
                      <th className="py-2 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map(r => {
                      const dt = r.createdAt?.toDate?.() || (r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000) : null);
                      return (
                        <tr key={r.id} className="border-b border-zinc-800/60 last:border-0">
                          <td className="py-3 text-blue-300 font-mono text-xs">{r.receiptNo}</td>
                          <td className="py-3 text-gray-400">{dt ? dt.toLocaleString('en-IN') : '—'}</td>
                          <td className="py-3 text-white font-medium">{r.patientName}</td>
                          <td className="py-3 text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{r.patientPhone}</td>
                          <td className="py-3 text-gray-500 text-xs">{r.bookingId}</td>
                          <td className="py-3 text-gray-400">{r.branchName || '—'}</td>
                          <td className="py-3 text-gray-300">{r.paymentMethod || 'CASH'}</td>
                          <td className="py-3 text-right text-emerald-400 font-semibold">₹{Number(r.total || 0).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPayModal(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white text-lg font-bold mb-1 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-emerald-500" /> Record Payment
            </h3>
            <p className="text-gray-400 text-xs mb-4">{payModal.patientName} · {payModal.bookingId}</p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-gray-400 uppercase tracking-wider">Amount (₹)</label>
                <Input type="number" value={pmAmount}
                  onChange={(e) => setPmAmount(Math.max(0, Number(e.target.value || 0)))}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1"
                  max={payModal.amountDue} min={0} />
                <p className="text-[11px] text-gray-500 mt-1">Outstanding: ₹{payModal.amountDue.toLocaleString()}</p>
              </div>
              <div>
                <label className="text-[11px] text-gray-400 uppercase tracking-wider">Method</label>
                <div className="flex gap-2 mt-1">
                  {(['CASH', 'UPI', 'CARD'] as const).map(m => (
                    <button key={m}
                      onClick={() => setPmMethod(m)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition ${pmMethod === m ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-800 text-gray-400 hover:border-zinc-700'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" className="border-zinc-700 text-gray-300" onClick={() => setPayModal(null)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={submitPayment}>
                Save Payment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
