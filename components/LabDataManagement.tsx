import { useState, useEffect } from 'react';
import {
  Database, Download, FileSpreadsheet, Users, FlaskConical, Receipt, ClipboardList,
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { db } from '../lib/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

interface LabDataManagementProps {
  labId: string;
  labName?: string;
}

interface Counts {
  bookings: number;
  patients: number;
  receipts: number;
  inventory: number;
  homeCollections: number;
  reportsSent: number;
}

type Range = 'all' | 'last-30' | 'last-90' | 'this-year';

export default function LabDataManagement({ labId, labName }: LabDataManagementProps) {
  const [counts, setCounts] = useState<Counts>({ bookings: 0, patients: 0, receipts: 0, inventory: 0, homeCollections: 0, reportsSent: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [range, setRange] = useState<Range>('all');

  useEffect(() => {
    if (!labId) return;
    loadCounts();
  }, [labId]);

  const loadCounts = async () => {
    setLoading(true);
    try {
      const [bSnap, recSnap, invSnap] = await Promise.all([
        getDocs(query(collection(db, 'labBookings'), where('labId', '==', labId))),
        getDocs(query(collection(db, 'lab_receipts'), where('labId', '==', labId))).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, `labs/${labId}/inventory`)).catch(() => ({ docs: [] } as any)),
      ]);
      const phones = new Set<string>();
      let home = 0, sent = 0;
      bSnap.docs.forEach(d => {
        const data: any = d.data();
        const p = String(data.patientPhone || '').replace(/\D/g, '').slice(-10);
        if (p) phones.add(p);
        if (data.collectionType === 'home-collection') home++;
        if (data.reportSent) sent++;
      });
      setCounts({
        bookings: bSnap.docs.length,
        patients: phones.size,
        receipts: recSnap.docs.length,
        inventory: invSnap.docs.length,
        homeCollections: home,
        reportsSent: sent,
      });
    } catch (err) {
      console.error('[LabDataManagement] loadCounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const dateBounds = (): { startISO: string; endISO: string } | null => {
    if (range === 'all') return null;
    const end = new Date();
    let start = new Date();
    if (range === 'last-30') start.setDate(end.getDate() - 30);
    else if (range === 'last-90') start.setDate(end.getDate() - 90);
    else if (range === 'this-year') start = new Date(end.getFullYear(), 0, 1);
    return { startISO: start.toISOString().split('T')[0], endISO: end.toISOString().split('T')[0] };
  };

  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const escape = (v: any) => {
      const s = String(v ?? '');
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const csv = [headers.join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportBookings = async () => {
    setExporting('bookings');
    try {
      const snap = await getDocs(query(collection(db, 'labBookings'), where('labId', '==', labId)));
      const bounds = dateBounds();
      const rows: (string | number)[][] = [];
      snap.docs.forEach(d => {
        const data: any = d.data();
        const bDate = data.bookingDate || '';
        if (bounds && (bDate < bounds.startISO || bDate > bounds.endISO)) return;
        const tests = (Array.isArray(data.selectedTests) ? data.selectedTests : data.tests || []) as any[];
        const pd = data.paymentDetails || {};
        rows.push([
          data.bookingId || d.id,
          bDate,
          data.timeSlot || data.slotName || '',
          data.patientName || '',
          data.patientPhone || '',
          data.patientAge || '',
          data.patientGender || '',
          data.branchName || '',
          data.collectionType || '',
          data.referringDoctor || '',
          tests.map(t => t?.name || t?.testName).filter(Boolean).join('; '),
          tests.length,
          Number(pd.mrp ?? data.totalAmount ?? 0),
          Number(pd.discountedPrice ?? data.totalAmount ?? 0),
          Number(pd.advancePaid ?? 0),
          Number(pd.amountDue ?? 0),
          data.paymentReceived ? 'Yes' : 'No',
          data.sampleCollected ? 'Yes' : 'No',
          data.reportSent ? 'Yes' : 'No',
          data.isCancelled || data.status === 'cancelled' ? 'Cancelled' : (data.status || 'active'),
        ]);
      });
      downloadCSV(`lab_bookings_${Date.now()}.csv`, [
        'Booking ID', 'Date', 'Slot', 'Patient', 'Phone', 'Age', 'Gender', 'Branch',
        'Collection', 'Referring Doctor', 'Tests', 'Test Count', 'MRP', 'Net', 'Advance', 'Due', 'Paid', 'Sample Collected', 'Report Sent', 'Status',
      ], rows);
      toast.success(`Exported ${rows.length} bookings`);
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    } finally {
      setExporting(null);
    }
  };

  const exportPatients = async () => {
    setExporting('patients');
    try {
      const snap = await getDocs(query(collection(db, 'labBookings'), where('labId', '==', labId)));
      const bounds = dateBounds();
      const map = new Map<string, any>();
      snap.docs.forEach(d => {
        const data: any = d.data();
        if (data.isCancelled || data.status === 'cancelled') return;
        const bDate = data.bookingDate || '';
        if (bounds && (bDate < bounds.startISO || bDate > bounds.endISO)) return;
        const phone = String(data.patientPhone || '').replace(/\D/g, '').slice(-10);
        if (!phone) return;
        const cur = map.get(phone) || { name: data.patientName, phone, age: data.patientAge, gender: data.patientGender, visits: 0, totalSpend: 0, firstVisit: bDate, lastVisit: bDate, branch: data.branchName };
        cur.visits++;
        cur.totalSpend += Number(data.paymentDetails?.discountedPrice ?? data.totalAmount ?? 0);
        if (bDate < cur.firstVisit) cur.firstVisit = bDate;
        if (bDate > cur.lastVisit) {
          cur.lastVisit = bDate;
          cur.name = data.patientName || cur.name;
          cur.branch = data.branchName || cur.branch;
        }
        map.set(phone, cur);
      });
      const rows = Array.from(map.values()).map(p => [
        p.name || '', p.phone, p.age || '', p.gender || '', p.branch || '',
        p.visits, Math.round(p.totalSpend), p.firstVisit, p.lastVisit,
      ]);
      downloadCSV(`lab_patients_${Date.now()}.csv`, [
        'Name', 'Phone', 'Age', 'Gender', 'Last Branch', 'Visits', 'Total Spend', 'First Visit', 'Last Visit',
      ], rows);
      toast.success(`Exported ${rows.length} patients`);
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    } finally {
      setExporting(null);
    }
  };

  const exportReceipts = async () => {
    setExporting('receipts');
    try {
      const snap = await getDocs(query(collection(db, 'lab_receipts'), where('labId', '==', labId)));
      const rows: (string | number)[][] = snap.docs.map(d => {
        const r: any = d.data();
        const dt = r.createdAt?.toDate?.() || (r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000) : null);
        return [
          r.receiptNo || '', dt ? dt.toISOString() : '', r.patientName || '', r.patientPhone || '',
          r.bookingId || '', r.branchName || '', r.paymentMethod || '', Number(r.total || 0), Number(r.paid || 0), Number(r.due || 0),
        ];
      });
      downloadCSV(`lab_receipts_${Date.now()}.csv`, [
        'Receipt No', 'When', 'Patient', 'Phone', 'Booking', 'Branch', 'Method', 'Total', 'Paid', 'Due',
      ], rows);
      toast.success(`Exported ${rows.length} receipts`);
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    } finally {
      setExporting(null);
    }
  };

  const exportInventory = async () => {
    setExporting('inventory');
    try {
      const snap = await getDocs(collection(db, `labs/${labId}/inventory`));
      const rows: (string | number)[][] = snap.docs.map(d => {
        const i: any = d.data();
        return [
          i.name || '', i.category || '', Number(i.quantity || 0), i.unit || '', Number(i.minStock || 0),
          Number(i.costPerUnit || 0), i.supplier || '', i.expiryDate || '', i.lastRestocked || '',
        ];
      });
      downloadCSV(`lab_inventory_${Date.now()}.csv`, [
        'Item', 'Category', 'Qty', 'Unit', 'Min Stock', 'Cost/Unit', 'Supplier', 'Expiry', 'Last Restocked',
      ], rows);
      toast.success(`Exported ${rows.length} items`);
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    } finally {
      setExporting(null);
    }
  };

  const exportHomeCollections = async () => {
    setExporting('home');
    try {
      const snap = await getDocs(query(
        collection(db, 'labBookings'),
        where('labId', '==', labId),
        where('collectionType', '==', 'home-collection'),
      ));
      const bounds = dateBounds();
      const rows: (string | number)[][] = [];
      snap.docs.forEach(d => {
        const data: any = d.data();
        const bDate = data.bookingDate || '';
        if (bounds && (bDate < bounds.startISO || bDate > bounds.endISO)) return;
        rows.push([
          data.bookingId || d.id, bDate, data.timeSlot || '',
          data.patientName || '', data.patientPhone || '',
          data.homeAddress || '', data.homeLandmark || '', data.homePincode || '',
          data.allottedParamedicName || '', data.allottedAt || '',
          data.sampleCollected ? 'Yes' : 'No', data.reportSent ? 'Yes' : 'No',
        ]);
      });
      downloadCSV(`lab_home_collections_${Date.now()}.csv`, [
        'Booking', 'Date', 'Slot', 'Patient', 'Phone', 'Address', 'Landmark', 'Pincode',
        'Allotted To', 'Allotted At', 'Sample Collected', 'Report Sent',
      ], rows);
      toast.success(`Exported ${rows.length} home visits`);
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    } finally {
      setExporting(null);
    }
  };

  const cards = [
    { id: 'bookings', label: 'Bookings', count: counts.bookings, icon: ClipboardList, color: 'text-blue-400', action: exportBookings, hint: 'All test bookings with payment & status' },
    { id: 'patients', label: 'Unique Patients', count: counts.patients, icon: Users, color: 'text-emerald-400', action: exportPatients, hint: 'Deduplicated patients with visit & spend stats' },
    { id: 'receipts', label: 'Receipts', count: counts.receipts, icon: Receipt, color: 'text-violet-400', action: exportReceipts, hint: 'Generated billing receipts' },
    { id: 'inventory', label: 'Inventory Items', count: counts.inventory, icon: FlaskConical, color: 'text-amber-400', action: exportInventory, hint: 'Reagents, kits, consumables' },
    { id: 'home', label: 'Home Collections', count: counts.homeCollections, icon: Database, color: 'text-orange-400', action: exportHomeCollections, hint: 'Home-collection bookings with allotment info' },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-white text-2xl font-bold flex items-center gap-2">
                <Database className="w-6 h-6 text-slate-400" /> Data Management
              </h2>
              <p className="text-gray-400 text-sm mt-1">Export your lab data as CSV for spreadsheets / accounting</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500">Range:</span>
              <Select value={range} onValueChange={(v: any) => setRange(v)}>
                <SelectTrigger className="w-[170px] bg-zinc-950 border-zinc-800 text-gray-200 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-gray-200">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="last-30">Last 30 Days</SelectItem>
                  <SelectItem value="last-90">Last 90 Days</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(c => (
          <Card key={c.id} className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg bg-zinc-950 ${c.color}`}>
                  <c.icon className="w-5 h-5" />
                </div>
                <span className="text-3xl font-bold text-white">{loading ? '…' : c.count}</span>
              </div>
              <div>
                <p className="text-white font-bold">{c.label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{c.hint}</p>
              </div>
              <Button onClick={c.action} disabled={exporting === c.id}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white">
                <Download className="w-4 h-4 mr-1" />
                {exporting === c.id ? 'Exporting…' : 'Export CSV'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <div className="text-xs text-gray-400 space-y-1">
              <p><strong className="text-white">{labName || 'Lab'}</strong> — total <strong className="text-white">{counts.bookings}</strong> bookings, <strong className="text-white">{counts.reportsSent}</strong> reports delivered.</p>
              <p>CSVs are encoded UTF-8 with comma delimiter. Open with Excel, Google Sheets, or any spreadsheet tool.</p>
              <p className="text-amber-400/80">⚠ Range filter applies to bookings, patients &amp; home-collections. Receipts &amp; inventory always export full set.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
