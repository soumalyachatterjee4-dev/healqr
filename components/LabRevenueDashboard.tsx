import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import {
  IndianRupee, TrendingUp, Wallet, AlertTriangle, RotateCcw,
  Calendar, Filter, TestTubes, Users, PhoneCall, Building2,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ResponsiveContainer,
} from 'recharts';
import { useState, useMemo, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { toast } from 'sonner';

interface LabRevenueDashboardProps {
  labId: string;
  labName?: string;
}

interface RevenueStats {
  gross: number;
  net: number;
  discountTotal: number;
  advanceCollected: number;
  duesOutstanding: number;
  refunds: number;
  refundCount: number;
  paidBookings: number;
  duesBookings: number;
}

interface TrendPoint { label: string; revenue: number; net: number; }
interface CategoryRow { name: string; revenue: number; count: number; color: string; }
interface TopTest { name: string; count: number; revenue: number; }
interface TopPatient { phone: string; name: string; bookings: number; revenue: number; }
interface DueRow {
  id: string;
  bookingId: string;
  patientName: string;
  patientPhone: string;
  bookingDate: string;
  branchName: string;
  amountDue: number;
  total: number;
}
interface RefundRow {
  id: string;
  bookingId: string;
  patientName: string;
  patientPhone: string;
  bookingDate: string;
  branchName: string;
  amount: number;
  reason: string;
}

const CHART_COLORS = ['#10b981', '#8b5cf6', '#3b82f6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#a78bfa'];

export default function LabRevenueDashboard({ labId, labName }: LabRevenueDashboardProps) {
  const [timeFrame, setTimeFrame] = useState('last-30-days');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'home-collection' | 'walk-in'>('all');
  const [trendGranularity, setTrendGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const [branches, setBranches] = useState<string[]>([]);
  const [stats, setStats] = useState<RevenueStats>({
    gross: 0, net: 0, discountTotal: 0, advanceCollected: 0,
    duesOutstanding: 0, refunds: 0, refundCount: 0, paidBookings: 0, duesBookings: 0,
  });
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [byCategory, setByCategory] = useState<CategoryRow[]>([]);
  const [byCollection, setByCollection] = useState<CategoryRow[]>([]);
  const [topTests, setTopTests] = useState<TopTest[]>([]);
  const [topPatients, setTopPatients] = useState<TopPatient[]>([]);
  const [dueRows, setDueRows] = useState<DueRow[]>([]);
  const [refundRows, setRefundRows] = useState<RefundRow[]>([]);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!labId) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      try {
        // Resolve date window
        let start = new Date();
        let end = new Date();
        end.setHours(23, 59, 59, 999);

        if (timeFrame === 'today') {
          start.setHours(0, 0, 0, 0);
        } else if (timeFrame === 'current-month') {
          start = new Date(end.getFullYear(), end.getMonth(), 1);
          start.setHours(0, 0, 0, 0);
        } else if (timeFrame === 'custom') {
          if (!dateFrom || !dateTo) { setLoading(false); return; }
          start = new Date(dateFrom); start.setHours(0, 0, 0, 0);
          end = new Date(dateTo); end.setHours(23, 59, 59, 999);
        } else {
          const days = timeFrame === 'last-7-days' ? 7 : timeFrame === 'last-30-days' ? 30 : timeFrame === 'last-90-days' ? 90 : 365;
          start = new Date();
          start.setDate(start.getDate() - days + 1);
          start.setHours(0, 0, 0, 0);
        }

        const startISO = start.toISOString().split('T')[0];
        const endISO = end.toISOString().split('T')[0];

        const bookingSnap = await getDocs(query(collection(db, 'labBookings'), where('labId', '==', labId)));

        // Discover branches
        const branchSet = new Set<string>();
        bookingSnap.docs.forEach(d => {
          const b = (d.data() as any).branchName;
          if (b) branchSet.add(b);
        });
        setBranches(Array.from(branchSet).sort());

        // Aggregations
        const s: RevenueStats = {
          gross: 0, net: 0, discountTotal: 0, advanceCollected: 0,
          duesOutstanding: 0, refunds: 0, refundCount: 0, paidBookings: 0, duesBookings: 0,
        };

        const trendMap = new Map<string, { revenue: number; net: number }>();
        const catMap = new Map<string, { revenue: number; count: number }>();
        const colMap = new Map<string, { revenue: number; count: number }>();
        const testMap = new Map<string, { count: number; revenue: number }>();
        const patientMap = new Map<string, { name: string; bookings: number; revenue: number }>();
        const dues: DueRow[] = [];
        const refunds: RefundRow[] = [];

        bookingSnap.docs.forEach(d => {
          const data: any = d.data();
          const bDate: string = data.bookingDate || '';
          if (!bDate || bDate < startISO || bDate > endISO) return;

          if (branchFilter !== 'all' && (data.branchName || '') !== branchFilter) return;

          const cType = data.collectionType === 'home-collection' ? 'home-collection' : 'walk-in';
          if (collectionFilter !== 'all' && cType !== collectionFilter) return;

          const isCancelled = data.isCancelled === true || data.status === 'cancelled' || data.status === 'rejected';
          const pd = data.paymentDetails || {};
          const mrp = Number(pd.mrp ?? data.totalAmount ?? 0);
          const discounted = Number(pd.discountedPrice ?? data.totalAmount ?? 0);
          const advance = Number(pd.advancePaid ?? 0);
          const due = Number(pd.amountDue ?? 0);
          const discount = Math.max(0, mrp - discounted);

          if (isCancelled) {
            // Treat advance paid on cancelled bookings as refundable / refund
            if (advance > 0) {
              s.refunds += advance;
              s.refundCount++;
              refunds.push({
                id: d.id,
                bookingId: data.bookingId || d.id,
                patientName: data.patientName || 'Unknown',
                patientPhone: data.patientPhone || '',
                bookingDate: bDate,
                branchName: data.branchName || '',
                amount: advance,
                reason: data.cancellationReason || data.cancelledReason || 'Cancelled',
              });
            }
            return;
          }

          // Non-cancelled
          s.gross += isFinite(mrp) ? mrp : 0;
          s.net += isFinite(discounted) ? discounted : 0;
          s.discountTotal += isFinite(discount) ? discount : 0;
          s.advanceCollected += isFinite(advance) ? advance : 0;
          s.duesOutstanding += isFinite(due) ? due : 0;
          if (data.paymentReceived || due === 0) s.paidBookings++;
          if (due > 0) {
            s.duesBookings++;
            dues.push({
              id: d.id,
              bookingId: data.bookingId || d.id,
              patientName: data.patientName || 'Unknown',
              patientPhone: data.patientPhone || '',
              bookingDate: bDate,
              branchName: data.branchName || '',
              amountDue: due,
              total: discounted,
            });
          }

          // Trend bucket
          const bucketKey = bucketFor(bDate, trendGranularity);
          const trendCur = trendMap.get(bucketKey) || { revenue: 0, net: 0 };
          trendCur.revenue += isFinite(mrp) ? mrp : 0;
          trendCur.net += isFinite(discounted) ? discounted : 0;
          trendMap.set(bucketKey, trendCur);

          // Collection type
          const colCur = colMap.get(cType) || { revenue: 0, count: 0 };
          colCur.revenue += isFinite(discounted) ? discounted : 0;
          colCur.count++;
          colMap.set(cType, colCur);

          // Tests + categories
          const tests = Array.isArray(data.selectedTests) ? data.selectedTests : Array.isArray(data.tests) ? data.tests : [];
          tests.forEach((t: any) => {
            const cat = String(t?.category || 'Uncategorized');
            const tName = String(t?.name || t?.testName || 'Unknown Test');
            const tRev = Number(t?.discountedPrice ?? t?.price ?? 0);
            const safeRev = isFinite(tRev) ? tRev : 0;

            const catCur = catMap.get(cat) || { revenue: 0, count: 0 };
            catCur.revenue += safeRev;
            catCur.count++;
            catMap.set(cat, catCur);

            const tCur = testMap.get(tName) || { count: 0, revenue: 0 };
            tCur.count++;
            tCur.revenue += safeRev;
            testMap.set(tName, tCur);
          });

          // Top patients (by phone)
          const phone = String(data.patientPhone || '').replace(/\D/g, '').slice(-10);
          if (phone) {
            const pCur = patientMap.get(phone) || { name: data.patientName || 'Unknown', bookings: 0, revenue: 0 };
            pCur.bookings++;
            pCur.revenue += isFinite(discounted) ? discounted : 0;
            patientMap.set(phone, pCur);
          }
        });

        // Trend series — fill gaps for granularity
        const series: TrendPoint[] = buildTrendSeries(start, end, trendGranularity, trendMap);

        // Category rows (top 8 by revenue)
        const catArr: CategoryRow[] = Array.from(catMap.entries())
          .map(([name, v], i) => ({ name, revenue: Math.round(v.revenue), count: v.count, color: CHART_COLORS[i % CHART_COLORS.length] }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 8);

        // Collection rows
        const colArr: CategoryRow[] = Array.from(colMap.entries()).map(([name, v], i) => ({
          name: name === 'home-collection' ? 'Home Collection' : 'Walk-in',
          revenue: Math.round(v.revenue),
          count: v.count,
          color: i === 0 ? '#10b981' : '#3b82f6',
        }));

        const topTestsArr: TopTest[] = Array.from(testMap.entries())
          .map(([name, v]) => ({ name, count: v.count, revenue: Math.round(v.revenue) }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        const topPatientsArr: TopPatient[] = Array.from(patientMap.entries())
          .map(([phone, v]) => ({ phone, name: v.name, bookings: v.bookings, revenue: Math.round(v.revenue) }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        dues.sort((a, b) => b.amountDue - a.amountDue);
        refunds.sort((a, b) => (a.bookingDate < b.bookingDate ? 1 : -1));

        setStats(s);
        setTrend(series);
        setByCategory(catArr);
        setByCollection(colArr);
        setTopTests(topTestsArr);
        setTopPatients(topPatientsArr);
        setDueRows(dues);
        setRefundRows(refunds);
      } catch (err) {
        console.error('[LabRevenueDashboard] load error:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [labId, timeFrame, dateFrom, dateTo, branchFilter, collectionFilter, trendGranularity]);

  const followUpDue = (row: DueRow) => {
    if (!row.patientPhone) {
      toast.error('No phone number on file');
      return;
    }
    const msg = encodeURIComponent(
      `Hello ${row.patientName?.split(' ')[0] || 'there'}, this is a friendly reminder from ${labName || 'our lab'}: an outstanding balance of ₹${row.amountDue} is pending for booking ${row.bookingId} (${row.bookingDate}). Please clear at your earliest convenience.`
    );
    const phone = row.patientPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${msg}`, '_blank');
  };

  const collectionPie = useMemo(() => byCollection.filter(c => c.revenue > 0), [byCollection]);

  return (
    <div className="space-y-8">
      {/* Header / filters */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-white text-2xl font-bold tracking-tight flex items-center gap-2">
                <IndianRupee className="w-6 h-6 text-emerald-500" />
                Revenue Dashboard
              </h2>
              <p className="text-gray-400 text-sm mt-1">Gross, Net, Advance, Dues &amp; Refund insights</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={timeFrame} onValueChange={setTimeFrame}>
                <SelectTrigger className="w-[170px] bg-zinc-950 border-zinc-800 text-gray-200 text-xs h-9">
                  <Calendar className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-gray-200">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                  <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                  <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                  <SelectItem value="last-365-days">Last 365 Days</SelectItem>
                  <SelectItem value="current-month">Current Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              {timeFrame === 'custom' && (
                <div className="flex items-center gap-2">
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-white px-2 py-1 rounded text-xs h-9" />
                  <span className="text-gray-500 text-xs">to</span>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-white px-2 py-1 rounded text-xs h-9" />
                </div>
              )}
              {branches.length > 1 && (
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="w-[180px] bg-zinc-950 border-zinc-800 text-gray-200 text-xs h-9">
                    <Building2 className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-gray-200">
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Select value={collectionFilter} onValueChange={(v: any) => setCollectionFilter(v)}>
                <SelectTrigger className="w-[180px] bg-zinc-950 border-zinc-800 text-gray-200 text-xs h-9">
                  <Filter className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-gray-200">
                  <SelectItem value="all">All Collections</SelectItem>
                  <SelectItem value="home-collection">Home Collection</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI grid */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Gross Revenue', value: `₹${stats.gross.toLocaleString()}`, hint: 'Before discounts', icon: IndianRupee, color: 'text-emerald-400' },
            { label: 'Net Revenue', value: `₹${stats.net.toLocaleString()}`, hint: `Discounts ₹${stats.discountTotal.toLocaleString()}`, icon: TrendingUp, color: 'text-green-400' },
            { label: 'Advance Collected', value: `₹${stats.advanceCollected.toLocaleString()}`, hint: `${stats.paidBookings} fully paid`, icon: Wallet, color: 'text-blue-400' },
            { label: 'Dues Outstanding', value: `₹${stats.duesOutstanding.toLocaleString()}`, hint: `${stats.duesBookings} pending`, icon: AlertTriangle, color: 'text-amber-400' },
            { label: 'Refunds', value: `₹${stats.refunds.toLocaleString()}`, hint: `${stats.refundCount} cancelled w/ advance`, icon: RotateCcw, color: 'text-red-400' },
          ].map((k, i) => (
            <Card key={i} className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{k.label}</span>
                  <div className={`p-2 rounded-lg bg-zinc-950 ${k.color}`}><k.icon className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-bold text-white">{loading ? '…' : k.value}</div>
                <div className="text-[11px] text-gray-500 mt-1">{k.hint}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Trend chart */}
      <section>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Revenue Trend
            </CardTitle>
            <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
              {(['day', 'week', 'month'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setTrendGranularity(g)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition ${trendGranularity === g ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-400 hover:text-white'}`}
                >
                  {g === 'day' ? 'Daily' : g === 'week' ? 'Weekly' : 'Monthly'}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="h-[320px]">
            {!isMounted ? null : trend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="label" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #27272a', color: '#fff' }} />
                  <Line type="monotone" dataKey="revenue" name="Gross" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="net" name="Net" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Category bar + Collection pie */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <TestTubes className="w-4 h-4 text-blue-500" /> Revenue by Test Category
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {!isMounted ? null : byCategory.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" stroke="#9ca3af" fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={10} width={110} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #27272a', color: '#fff' }} formatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {byCategory.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-500" /> Revenue by Collection Type
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {!isMounted ? null : collectionPie.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">No data</div>
            ) : (
              <div className="flex flex-col h-full">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie data={collectionPie} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3}>
                      {collectionPie.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #27272a', color: '#fff' }} formatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 text-[11px] text-gray-400 justify-center pt-2 border-t border-zinc-800">
                  {collectionPie.map(c => (
                    <span key={c.name} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}: <span className="text-white font-bold">₹{c.revenue.toLocaleString()}</span> <span className="text-gray-500">({c.count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Top revenue tests + Top paying patients */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <TestTubes className="w-4 h-4 text-purple-500" /> Top Revenue-Generating Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topTests.length === 0 ? (
              <div className="text-gray-500 text-sm py-6 text-center">No tests in this period</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-zinc-800">
                      <th className="py-2 font-semibold">#</th>
                      <th className="py-2 font-semibold">Test</th>
                      <th className="py-2 font-semibold text-right">Orders</th>
                      <th className="py-2 font-semibold text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTests.map((t, i) => (
                      <tr key={t.name} className="border-b border-zinc-800/60 last:border-0">
                        <td className="py-3 text-gray-500">{i + 1}</td>
                        <td className="py-3 text-white font-medium">{t.name}</td>
                        <td className="py-3 text-right text-purple-300 font-semibold">{t.count}</td>
                        <td className="py-3 text-right text-emerald-400 font-semibold">₹{t.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" /> Top Paying Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPatients.length === 0 ? (
              <div className="text-gray-500 text-sm py-6 text-center">No patients in this period</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-zinc-800">
                      <th className="py-2 font-semibold">#</th>
                      <th className="py-2 font-semibold">Patient</th>
                      <th className="py-2 font-semibold">Phone</th>
                      <th className="py-2 font-semibold text-right">Visits</th>
                      <th className="py-2 font-semibold text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPatients.map((p, i) => (
                      <tr key={p.phone} className="border-b border-zinc-800/60 last:border-0">
                        <td className="py-3 text-gray-500">{i + 1}</td>
                        <td className="py-3 text-white font-medium">{p.name}</td>
                        <td className="py-3 text-gray-400">{p.phone}</td>
                        <td className="py-3 text-right text-blue-300 font-semibold">{p.bookings}</td>
                        <td className="py-3 text-right text-emerald-400 font-semibold">₹{p.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Outstanding dues + Refund log */}
      <section className="grid grid-cols-1 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Outstanding Dues
            </CardTitle>
            <span className="text-[11px] text-gray-400">
              {dueRows.length} bookings · ₹{stats.duesOutstanding.toLocaleString()} pending
            </span>
          </CardHeader>
          <CardContent>
            {dueRows.length === 0 ? (
              <div className="text-gray-500 text-sm py-6 text-center">All clear — no dues</div>
            ) : (
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-zinc-900">
                    <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-zinc-800">
                      <th className="py-2 font-semibold">Date</th>
                      <th className="py-2 font-semibold">Patient</th>
                      <th className="py-2 font-semibold">Phone</th>
                      <th className="py-2 font-semibold">Branch</th>
                      <th className="py-2 font-semibold">Booking</th>
                      <th className="py-2 font-semibold text-right">Total</th>
                      <th className="py-2 font-semibold text-right">Due</th>
                      <th className="py-2 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dueRows.map(r => (
                      <tr key={r.id} className="border-b border-zinc-800/60 last:border-0">
                        <td className="py-3 text-gray-400">{r.bookingDate}</td>
                        <td className="py-3 text-white font-medium">{r.patientName}</td>
                        <td className="py-3 text-gray-400">{r.patientPhone}</td>
                        <td className="py-3 text-gray-400">{r.branchName}</td>
                        <td className="py-3 text-gray-500 text-xs">{r.bookingId}</td>
                        <td className="py-3 text-right text-gray-300">₹{r.total.toLocaleString()}</td>
                        <td className="py-3 text-right text-amber-400 font-semibold">₹{r.amountDue.toLocaleString()}</td>
                        <td className="py-3 text-right">
                          <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-700 text-emerald-300 hover:bg-emerald-950"
                            onClick={() => followUpDue(r)}>
                            Follow up
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-red-500" /> Refund Log
            </CardTitle>
            <span className="text-[11px] text-gray-400">
              {refundRows.length} refundable · ₹{stats.refunds.toLocaleString()}
            </span>
          </CardHeader>
          <CardContent>
            {refundRows.length === 0 ? (
              <div className="text-gray-500 text-sm py-6 text-center">No refund-eligible cancellations</div>
            ) : (
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-zinc-900">
                    <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-zinc-800">
                      <th className="py-2 font-semibold">Date</th>
                      <th className="py-2 font-semibold">Patient</th>
                      <th className="py-2 font-semibold">Phone</th>
                      <th className="py-2 font-semibold">Branch</th>
                      <th className="py-2 font-semibold">Booking</th>
                      <th className="py-2 font-semibold">Reason</th>
                      <th className="py-2 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundRows.map(r => (
                      <tr key={r.id} className="border-b border-zinc-800/60 last:border-0">
                        <td className="py-3 text-gray-400">{r.bookingDate}</td>
                        <td className="py-3 text-white font-medium">{r.patientName}</td>
                        <td className="py-3 text-gray-400">{r.patientPhone}</td>
                        <td className="py-3 text-gray-400">{r.branchName}</td>
                        <td className="py-3 text-gray-500 text-xs">{r.bookingId}</td>
                        <td className="py-3 text-gray-400 text-xs">{r.reason}</td>
                        <td className="py-3 text-right text-red-400 font-semibold">₹{r.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ─────────────────────── helpers ───────────────────────

function bucketFor(isoDate: string, granularity: 'day' | 'week' | 'month'): string {
  if (granularity === 'day') return isoDate;
  const d = new Date(isoDate);
  if (granularity === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  // week — ISO-ish week start (Mon)
  const day = d.getDay() || 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  return monday.toISOString().split('T')[0];
}

function buildTrendSeries(
  start: Date,
  end: Date,
  granularity: 'day' | 'week' | 'month',
  trendMap: Map<string, { revenue: number; net: number }>
): TrendPoint[] {
  const out: TrendPoint[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  if (granularity === 'day') {
    while (cursor <= end) {
      const iso = cursor.toISOString().split('T')[0];
      const v = trendMap.get(iso) || { revenue: 0, net: 0 };
      out.push({ label: iso.slice(5), revenue: Math.round(v.revenue), net: Math.round(v.net) });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (granularity === 'week') {
    // align to Monday
    const day = cursor.getDay() || 7;
    cursor.setDate(cursor.getDate() - (day - 1));
    while (cursor <= end) {
      const iso = cursor.toISOString().split('T')[0];
      const v = trendMap.get(iso) || { revenue: 0, net: 0 };
      out.push({ label: `W ${iso.slice(5)}`, revenue: Math.round(v.revenue), net: Math.round(v.net) });
      cursor.setDate(cursor.getDate() + 7);
    }
  } else {
    cursor.setDate(1);
    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const v = trendMap.get(key) || { revenue: 0, net: 0 };
      out.push({ label: key, revenue: Math.round(v.revenue), net: Math.round(v.net) });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return out;
}
