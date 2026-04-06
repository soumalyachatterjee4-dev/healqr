import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Menu, IndianRupee, Plus, Trash2, Save, X,
  Users, Calendar, Lock, ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle,
  Stethoscope, FlaskConical, UserCheck
} from 'lucide-react';
import DashboardSidebar from './DashboardSidebar';
import { db } from '../lib/firebase/config';
import {
  collection, query, where, getDocs, doc, getDoc, addDoc,
  deleteDoc, serverTimestamp, orderBy
} from 'firebase/firestore';
import { toast } from 'sonner';

interface RevenueDashboardProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void | Promise<void>;
  activeAddOns?: string[];
}

interface PatientEntry {
  bookingId: string;
  patientName: string;
  phone: string;
  type: string;
  chamberName: string;
  fee: number;
  defaultFee: number;
}

interface ManualEntry {
  id?: string;
  date: string;
  type: 'credit' | 'debit';
  category: string;
  description: string;
  amount: number;
  createdAt?: any;
}

const CREDIT_CATEGORIES = [
  'Lab Referral Commission',
  'Procedure / Surgery Fee',
  'Vaccination Fee',
  'Certificate / Report Fee',
  'Pharma Referral',
  'Other Income',
];

const DEBIT_CATEGORIES = [
  'Assistant / Staff Salary',
  'Clinic Rent',
  'Electricity / Utility',
  'Medical Supplies',
  'Equipment / Maintenance',
  'Medicine Purchase',
  'Tax / GST Payment',
  'Other Expense',
];

export default function RevenueDashboard({ onMenuChange = () => {}, onLogout, activeAddOns = [] }: RevenueDashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  });

  const [patientEntries, setPatientEntries] = useState<PatientEntry[]>([]);
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [showAddEntry, setShowAddEntry] = useState<'credit' | 'debit' | null>(null);
  const [newEntry, setNewEntry] = useState<ManualEntry>({
    date: '', type: 'credit', category: '', description: '', amount: 0
  });

  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [monthlyData, setMonthlyData] = useState<{ date: string; credit: number; debit: number; patients: number }[]>([]);
  const [chamberFees, setChamberFees] = useState<Record<string, number>>({});

  // Load chamber config
  useEffect(() => {
    const loadChambers = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId || !db) return;
      try {
        const doctorRef = doc(db, 'doctors', userId);
        const snap = await getDoc(doctorRef);
        if (snap.exists()) {
          const data = snap.data();
          const chambers = data.chambers || [];
          const fees: Record<string, number> = {};
          chambers.forEach((c: any) => {
            fees[c.id?.toString() || ''] = c.consultationFee || 0;
            fees[c.chamberName || ''] = c.consultationFee || 0;
          });
          setChamberFees(fees);
        }
      } catch {}
    };
    loadChambers();
  }, []);

  useEffect(() => {
    if (viewMode === 'daily') {
      loadDailyData();
    } else {
      loadMonthlyData();
    }
  }, [selectedDate, viewMode, chamberFees]);

  const loadDailyData = async () => {
    setLoading(true);
    const userId = localStorage.getItem('userId');
    if (!userId || !db) { setLoading(false); return; }

    try {
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef,
        where('doctorId', '==', userId),
        where('appointmentDate', '==', selectedDate)
      );
      const snap = await getDocs(q);

      const patients: PatientEntry[] = [];
      snap.docs.forEach(d => {
        const data = d.data();
        const isCancelled = data.status === 'cancelled' || data.isCancelled === true;
        if (isCancelled) return;
        const isSeen = data.isMarkedSeen === true || data.consultationCompleted === true || data.eyeIconPressed === true || data.status === 'completed';
        if (!isSeen) return;

        const chamberId = data.chamberId?.toString() || data.clinicLocationId?.toString() || '';
        const chamberName = data.chamberName || data.clinicName || 'Chamber';
        const defaultFee = data.consultationFee || chamberFees[chamberId] || chamberFees[chamberName] || 0;

        patients.push({
          bookingId: d.id,
          patientName: data.patientName || 'Unknown',
          phone: data.patientPhone || data.phone || '',
          type: (data.type === 'walkin_booking' || data.bookingType === 'walk-in') ? 'Walk-in' : 'QR',
          chamberName,
          fee: defaultFee,
          defaultFee,
        });
      });

      setPatientEntries(patients);

      const entriesRef = collection(db, 'doctors', userId, 'revenueEntries');
      const eq = query(entriesRef, where('date', '==', selectedDate), orderBy('createdAt', 'desc'));
      const eSnap = await getDocs(eq);
      const entries: ManualEntry[] = eSnap.docs.map(d => ({
        id: d.id,
        ...d.data() as Omit<ManualEntry, 'id'>
      }));
      setManualEntries(entries);

    } catch (err) {
      console.error('Load error:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyData = async () => {
    setLoading(true);
    const userId = localStorage.getItem('userId');
    if (!userId || !db) { setLoading(false); return; }

    try {
      const d = new Date(selectedDate);
      const year = d.getFullYear();
      const month = d.getMonth();
      const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDayDate = new Date(year, month + 1, 0);
      const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

      const bookingsRef = collection(db, 'bookings');
      const bq = query(bookingsRef,
        where('doctorId', '==', userId),
        where('appointmentDate', '>=', firstDay),
        where('appointmentDate', '<=', lastDay)
      );
      const bSnap = await getDocs(bq);

      const dayMap = new Map<string, { credit: number; debit: number; patients: number }>();

      bSnap.docs.forEach(d => {
        const data = d.data();
        const isCancelled = data.status === 'cancelled' || data.isCancelled === true;
        if (isCancelled) return;
        const isSeen = data.isMarkedSeen === true || data.consultationCompleted === true || data.eyeIconPressed === true || data.status === 'completed';
        if (!isSeen) return;

        const date = data.appointmentDate;
        if (!dayMap.has(date)) dayMap.set(date, { credit: 0, debit: 0, patients: 0 });
        const day = dayMap.get(date)!;
        const chamberId = data.chamberId?.toString() || data.clinicLocationId?.toString() || '';
        const chamberName = data.chamberName || data.clinicName || '';
        day.credit += data.consultationFee || chamberFees[chamberId] || chamberFees[chamberName] || 0;
        day.patients++;
      });

      const entriesRef = collection(db, 'doctors', userId, 'revenueEntries');
      const eq = query(entriesRef,
        where('date', '>=', firstDay),
        where('date', '<=', lastDay)
      );
      const eSnap = await getDocs(eq);

      eSnap.docs.forEach(d => {
        const data = d.data() as ManualEntry;
        if (!dayMap.has(data.date)) dayMap.set(data.date, { credit: 0, debit: 0, patients: 0 });
        const day = dayMap.get(data.date)!;
        if (data.type === 'credit') day.credit += data.amount;
        else day.debit += data.amount;
      });

      const sorted = Array.from(dayMap.entries())
        .map(([date, d]) => ({ date, ...d }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setMonthlyData(sorted);
    } catch (err) {
      console.error('Monthly load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEntry = async () => {
    if (!newEntry.category) { toast.error('Select a category'); return; }
    if (!newEntry.amount || newEntry.amount <= 0) { toast.error('Enter a valid amount'); return; }

    const userId = localStorage.getItem('userId');
    if (!userId || !db) return;

    try {
      const entriesRef = collection(db, 'doctors', userId, 'revenueEntries');
      await addDoc(entriesRef, {
        date: selectedDate,
        type: showAddEntry,
        category: newEntry.category,
        description: newEntry.description.trim(),
        amount: newEntry.amount,
        createdAt: serverTimestamp(),
      });
      toast.success(`${showAddEntry === 'credit' ? 'Credit' : 'Debit'} entry saved`);
      setShowAddEntry(null);
      setNewEntry({ date: '', type: 'credit', category: '', description: '', amount: 0 });
      loadDailyData();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save entry');
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    const userId = localStorage.getItem('userId');
    if (!userId || !db) return;
    try {
      await deleteDoc(doc(db, 'doctors', userId, 'revenueEntries', entryId));
      toast.success('Entry deleted');
      loadDailyData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const changeDate = (offset: number) => {
    const d = new Date(selectedDate);
    if (viewMode === 'monthly') {
      d.setMonth(d.getMonth() + offset);
    } else {
      d.setDate(d.getDate() + offset);
    }
    setSelectedDate(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  };

  const summary = useMemo(() => {
    if (viewMode === 'monthly') {
      const totalCredit = monthlyData.reduce((s, d) => s + d.credit, 0);
      const totalDebit = monthlyData.reduce((s, d) => s + d.debit, 0);
      const totalPatients = monthlyData.reduce((s, d) => s + d.patients, 0);
      return { totalCredit, totalDebit, balance: totalCredit - totalDebit, totalPatients };
    }

    const consultationIncome = patientEntries.reduce((s, p) => s + p.fee, 0);
    const otherCredit = manualEntries.filter(e => e.type === 'credit').reduce((s, e) => s + e.amount, 0);
    const totalCredit = consultationIncome + otherCredit;
    const totalDebit = manualEntries.filter(e => e.type === 'debit').reduce((s, e) => s + e.amount, 0);

    return { totalCredit, totalDebit, balance: totalCredit - totalDebit, totalPatients: patientEntries.length };
  }, [patientEntries, manualEntries, monthlyData, viewMode]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatMonth = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <DashboardSidebar
        activeMenu="revenue-dashboard"
        onMenuChange={onMenuChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={onLogout || (() => {})}
        activeAddOns={activeAddOns}
      />

      <main className="lg:pl-64 p-4 md:p-6 pt-16 lg:pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button className="p-2 bg-zinc-800 rounded-lg lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5 text-gray-300" />
            </button>
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <IndianRupee className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Revenue & Expenses</h1>
              <p className="text-gray-500 text-xs flex items-center gap-1"><Lock className="w-3 h-3" /> Private — Only visible to you</p>
            </div>
          </div>

          <div className="flex bg-zinc-800 rounded-lg p-0.5">
            <button
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${viewMode === 'daily' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}
              onClick={() => setViewMode('daily')}
            >Daily</button>
            <button
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${viewMode === 'monthly' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}
              onClick={() => setViewMode('monthly')}
            >Monthly</button>
          </div>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => changeDate(-1)} className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-white font-medium">
              {viewMode === 'daily' ? formatDate(selectedDate) : formatMonth(selectedDate)}
            </span>
          </div>
          <button onClick={() => changeDate(1)} className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700">
            <ChevronRight className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm ml-auto"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-[10px] uppercase tracking-wider">Total Credit</span>
                <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-emerald-400">₹{summary.totalCredit.toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-[10px] uppercase tracking-wider">Total Debit</span>
                <ArrowDownCircle className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-xl font-bold text-red-400">₹{summary.totalDebit.toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-[10px] uppercase tracking-wider">Net Balance</span>
                <IndianRupee className="w-4 h-4 text-amber-400" />
              </div>
              <p className={`text-xl font-bold ${summary.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {summary.balance < 0 ? '-' : ''}₹{Math.abs(summary.balance).toLocaleString('en-IN')}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-[10px] uppercase tracking-wider">Patients Seen</span>
                <UserCheck className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-xl font-bold text-blue-400">{summary.totalPatients}</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400" />
          </div>
        ) : viewMode === 'monthly' ? (
          /* ====== MONTHLY VIEW ====== */
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base">
                {formatMonth(selectedDate)} — Day-wise Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left p-3 text-gray-400 font-medium">Date</th>
                      <th className="text-right p-3 text-gray-400 font-medium">Patients</th>
                      <th className="text-right p-3 text-emerald-400/70 font-medium">Credit (₹)</th>
                      <th className="text-right p-3 text-red-400/70 font-medium">Debit (₹)</th>
                      <th className="text-right p-3 text-gray-400 font-medium">Net (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-gray-500">No entries this month</td></tr>
                    ) : monthlyData.map((day, i) => (
                      <tr
                        key={day.date}
                        className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer ${i % 2 === 0 ? '' : 'bg-zinc-950'}`}
                        onClick={() => { setSelectedDate(day.date); setViewMode('daily'); }}
                      >
                        <td className="p-3 text-white">{formatShortDate(day.date)}</td>
                        <td className="p-3 text-right text-gray-300">{day.patients}</td>
                        <td className="p-3 text-right text-emerald-400">₹{day.credit.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right text-red-400">{day.debit > 0 ? `₹${day.debit.toLocaleString('en-IN')}` : '—'}</td>
                        <td className={`p-3 text-right font-medium ${day.credit - day.debit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ₹{(day.credit - day.debit).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {monthlyData.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-zinc-600 bg-zinc-800/50">
                        <td className="p-3 text-white font-bold">Total</td>
                        <td className="p-3 text-right text-white font-bold">{summary.totalPatients}</td>
                        <td className="p-3 text-right text-emerald-400 font-bold">₹{summary.totalCredit.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right text-red-400 font-bold">₹{summary.totalDebit.toLocaleString('en-IN')}</td>
                        <td className={`p-3 text-right font-bold ${summary.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ₹{summary.balance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* ====== DAILY VIEW ====== */
          <>
            {/* CREDIT SECTION */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
                  Credit (Income)
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-600 text-emerald-400 hover:bg-emerald-600/20 h-8 text-xs"
                  onClick={() => { setShowAddEntry('credit'); setNewEntry({ date: selectedDate, type: 'credit', category: '', description: '', amount: 0 }); }}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Income
                </Button>
              </div>

              {/* Auto-fetched patient table */}
              {patientEntries.length > 0 && (
                <Card className="bg-zinc-900 border-zinc-800 mb-3">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" /> Consultation Fees — {patientEntries.length} patients seen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800">
                            <th className="text-left p-3 text-gray-500 font-medium text-xs">#</th>
                            <th className="text-left p-3 text-gray-500 font-medium text-xs">Patient</th>
                            <th className="text-left p-3 text-gray-500 font-medium text-xs">Type</th>
                            <th className="text-left p-3 text-gray-500 font-medium text-xs">Chamber</th>
                            <th className="text-right p-3 text-gray-500 font-medium text-xs">Fee (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patientEntries.map((p, i) => (
                            <tr key={p.bookingId} className={`border-b border-zinc-800/30 ${i % 2 === 0 ? '' : 'bg-zinc-950'}`}>
                              <td className="p-3 text-gray-500 text-xs">{i + 1}</td>
                              <td className="p-3">
                                <p className="text-white text-sm">{p.patientName}</p>
                                <p className="text-gray-500 text-[10px]">{p.phone}</p>
                              </td>
                              <td className="p-3">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.type === 'QR' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {p.type}
                                </span>
                              </td>
                              <td className="p-3 text-gray-300 text-xs">{p.chamberName}</td>
                              <td className="p-3 text-right">
                                <span className="text-emerald-400 font-medium">₹{p.fee.toLocaleString('en-IN')}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-zinc-700 bg-zinc-800/30">
                            <td colSpan={4} className="p-3 text-white font-medium text-xs">Total Consultation Income</td>
                            <td className="p-3 text-right text-emerald-400 font-bold">
                              ₹{patientEntries.reduce((s, p) => s + p.fee, 0).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {patientEntries.length === 0 && (
                <Card className="bg-zinc-900 border-zinc-800 mb-3">
                  <CardContent className="py-8 text-center text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No patients seen on {formatDate(selectedDate)}</p>
                  </CardContent>
                </Card>
              )}

              {/* Manual credit entries */}
              {manualEntries.filter(e => e.type === 'credit').map(entry => (
                <div key={entry.id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg p-3 mb-2">
                  <FlaskConical className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">{entry.category}</p>
                    {entry.description && <p className="text-gray-500 text-xs truncate">{entry.description}</p>}
                  </div>
                  <span className="text-emerald-400 font-medium">+₹{entry.amount.toLocaleString('en-IN')}</span>
                  <button onClick={() => entry.id && handleDeleteEntry(entry.id)} className="p-1 hover:bg-red-500/20 rounded">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              ))}

              {/* Add credit form */}
              {showAddEntry === 'credit' && (
                <Card className="bg-emerald-950/30 border-emerald-800/50 mt-3">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-medium text-sm">New Credit Entry</span>
                    </div>
                    <Select value={newEntry.category} onValueChange={v => setNewEntry(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {CREDIT_CATEGORIES.map(c => (
                          <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Description (optional)"
                      value={newEntry.description}
                      onChange={e => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-zinc-900 border-zinc-700 text-white"
                    />
                    <Input
                      type="number"
                      placeholder="Amount (₹)"
                      value={newEntry.amount || ''}
                      onChange={e => setNewEntry(prev => ({ ...prev, amount: Number(e.target.value) }))}
                      className="bg-zinc-900 border-zinc-700 text-white"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setShowAddEntry(null)} className="text-gray-400 h-8">
                        <X className="w-3 h-3 mr-1" /> Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveEntry} className="bg-emerald-600 hover:bg-emerald-700 h-8">
                        <Save className="w-3 h-3 mr-1" /> Save
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* DEBIT SECTION */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <ArrowDownCircle className="w-5 h-5 text-red-400" />
                  Debit (Expenses)
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-600 text-red-400 hover:bg-red-600/20 h-8 text-xs"
                  onClick={() => { setShowAddEntry('debit'); setNewEntry({ date: selectedDate, type: 'debit', category: '', description: '', amount: 0 }); }}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Expense
                </Button>
              </div>

              {manualEntries.filter(e => e.type === 'debit').length === 0 && showAddEntry !== 'debit' && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="py-6 text-center text-gray-500">
                    <p className="text-sm">No expenses recorded for this day</p>
                  </CardContent>
                </Card>
              )}

              {manualEntries.filter(e => e.type === 'debit').map(entry => (
                <div key={entry.id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg p-3 mb-2">
                  <ArrowDownCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">{entry.category}</p>
                    {entry.description && <p className="text-gray-500 text-xs truncate">{entry.description}</p>}
                  </div>
                  <span className="text-red-400 font-medium">-₹{entry.amount.toLocaleString('en-IN')}</span>
                  <button onClick={() => entry.id && handleDeleteEntry(entry.id)} className="p-1 hover:bg-red-500/20 rounded">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              ))}

              {/* Add debit form */}
              {showAddEntry === 'debit' && (
                <Card className="bg-red-950/30 border-red-800/50 mt-3">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowDownCircle className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 font-medium text-sm">New Debit Entry</span>
                    </div>
                    <Select value={newEntry.category} onValueChange={v => setNewEntry(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {DEBIT_CATEGORIES.map(c => (
                          <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Description (e.g., Assistant name, bill ref)"
                      value={newEntry.description}
                      onChange={e => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-zinc-900 border-zinc-700 text-white"
                    />
                    <Input
                      type="number"
                      placeholder="Amount (₹)"
                      value={newEntry.amount || ''}
                      onChange={e => setNewEntry(prev => ({ ...prev, amount: Number(e.target.value) }))}
                      className="bg-zinc-900 border-zinc-700 text-white"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setShowAddEntry(null)} className="text-gray-400 h-8">
                        <X className="w-3 h-3 mr-1" /> Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveEntry} className="bg-red-600 hover:bg-red-700 h-8">
                        <Save className="w-3 h-3 mr-1" /> Save
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* NET BALANCE CARD */}
            <Card className={`border-2 ${summary.balance >= 0 ? 'bg-emerald-950/20 border-emerald-800/50' : 'bg-red-950/20 border-red-800/50'}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Net Balance — {formatDate(selectedDate)}</p>
                    <p className={`text-3xl font-bold ${summary.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {summary.balance < 0 ? '- ' : ''}₹{Math.abs(summary.balance).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-emerald-400 text-sm">Credit: ₹{summary.totalCredit.toLocaleString('en-IN')}</p>
                    <p className="text-red-400 text-sm">Debit: ₹{summary.totalDebit.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
