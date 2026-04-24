import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  TrendingUp, QrCode, Users, UserPlus, Home, Store, UserMinus, XCircle,
  IndianRupee, TestTubes, FileCheck, Clock, Filter, Calendar, Activity,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ResponsiveContainer,
} from 'recharts';
import { useState, useMemo, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase/config';

interface LabAnalyticsProps {
  labId: string;
}

interface Stats {
  totalScans: number;
  totalBookings: number;
  qrBookings: number;
  walkinBookings: number;
  homeCollection: number;
  walkinCollection: number;
  sampleCollected: number;
  reportSent: number;
  dropOut: number;
  cancelled: number;
  revenue: number;
  advanceCollected: number;
  amountDue: number;
  avgOrderValue: number;
}

interface DailyPoint { date: string; bookings: number; revenue: number; }
interface CategoryPoint { name: string; value: number; color: string; }
interface TopTest { name: string; count: number; revenue: number; }

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#a78bfa'];

export default function LabAnalytics({ labId }: LabAnalyticsProps) {
  const [timeFrame, setTimeFrame] = useState('last-30-days');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'home-collection' | 'walk-in'>('all');
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const [stats, setStats] = useState<Stats>({
    totalScans: 0, totalBookings: 0, qrBookings: 0, walkinBookings: 0,
    homeCollection: 0, walkinCollection: 0, sampleCollected: 0, reportSent: 0,
    dropOut: 0, cancelled: 0, revenue: 0, advanceCollected: 0, amountDue: 0, avgOrderValue: 0,
  });
  const [dailySeries, setDailySeries] = useState<DailyPoint[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryPoint[]>([]);
  const [statusData, setStatusData] = useState<CategoryPoint[]>([]);
  const [topTests, setTopTests] = useState<TopTest[]>([]);

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
          const days = timeFrame === 'last-7-days' ? 7 : timeFrame === 'last-30-days' ? 30 : 90;
          start = new Date();
          start.setDate(start.getDate() - days + 1);
          start.setHours(0, 0, 0, 0);
        }

        const startISO = start.toISOString().split('T')[0];
        const endISO = end.toISOString().split('T')[0];

        // Parallel fetch bookings + QR scans
        const [bookingSnap, scanSnap] = await Promise.all([
          getDocs(query(collection(db, 'labBookings'), where('labId', '==', labId))),
          getDocs(query(collection(db, 'lab_qr_scans'), where('labId', '==', labId))),
        ]);

        // ── QR scans in window ──
        const scansInWindow = scanSnap.docs.filter(d => {
          const ts = d.data().scannedAt?.toDate?.();
          if (!ts) return false;
          return ts >= start && ts <= end;
        }).length;

        // ── Walk through bookings ──
        const s: Stats = {
          totalScans: scansInWindow,
          totalBookings: 0, qrBookings: 0, walkinBookings: 0,
          homeCollection: 0, walkinCollection: 0,
          sampleCollected: 0, reportSent: 0,
          dropOut: 0, cancelled: 0,
          revenue: 0, advanceCollected: 0, amountDue: 0, avgOrderValue: 0,
        };

        const dailyMap = new Map<string, { bookings: number; revenue: number }>();
        const catMap = new Map<string, number>();
        const testMap = new Map<string, { count: number; revenue: number }>();
        const statusMap = new Map<string, number>();

        const todayISO = new Date().toISOString().split('T')[0];

        bookingSnap.docs.forEach((d) => {
          const data: any = d.data();
          const bDate: string = data.bookingDate || '';
          if (!bDate || bDate < startISO || bDate > endISO) return;

          // collection filter
          const cType = data.collectionType === 'home-collection' ? 'home-collection' : 'walk-in';
          if (collectionFilter !== 'all' && cType !== collectionFilter) return;

          const isCancelled = data.isCancelled === true || data.status === 'cancelled' || data.status === 'rejected';
          s.totalBookings++;

          if (cType === 'home-collection') s.homeCollection++; else s.walkinCollection++;

          const isQR = data.bookingSource === 'lab_url' || data.bookingSource === 'lab_qr';
          if (isQR) s.qrBookings++; else s.walkinBookings++;

          if (isCancelled) {
            s.cancelled++;
          } else {
            // Revenue only for non-cancelled
            const amount = Number(data.paymentDetails?.discountedPrice ?? data.totalAmount ?? 0);
            s.revenue += isFinite(amount) ? amount : 0;
            s.advanceCollected += Number(data.paymentDetails?.advancePaid ?? 0);
            s.amountDue += Number(data.paymentDetails?.amountDue ?? 0);
          }

          if (data.sampleCollected) s.sampleCollected++;
          if (data.reportSent) s.reportSent++;
          if (!isCancelled && !data.sampleCollected && bDate < todayISO) s.dropOut++;

          // Daily series
          const prev = dailyMap.get(bDate) || { bookings: 0, revenue: 0 };
          prev.bookings++;
          if (!isCancelled) {
            const amt = Number(data.paymentDetails?.discountedPrice ?? data.totalAmount ?? 0);
            prev.revenue += isFinite(amt) ? amt : 0;
          }
          dailyMap.set(bDate, prev);

          // Category + top tests
          const tests = Array.isArray(data.selectedTests) ? data.selectedTests : Array.isArray(data.tests) ? data.tests : [];
          tests.forEach((t: any) => {
            const cat = String(t?.category || 'Uncategorized');
            catMap.set(cat, (catMap.get(cat) || 0) + 1);
            const tName = String(t?.name || t?.testName || 'Unknown Test');
            const tRev = Number(t?.discountedPrice ?? t?.price ?? 0);
            const cur = testMap.get(tName) || { count: 0, revenue: 0 };
            cur.count++;
            cur.revenue += isFinite(tRev) ? tRev : 0;
            testMap.set(tName, cur);
          });

          // Status buckets
          let bucket: string;
          if (isCancelled) bucket = 'Cancelled';
          else if (data.reportSent) bucket = 'Report Sent';
          else if (data.sampleCollected) bucket = 'Sample Collected';
          else bucket = 'Booked';
          statusMap.set(bucket, (statusMap.get(bucket) || 0) + 1);
        });

        s.avgOrderValue = s.totalBookings > 0 ? Math.round(s.revenue / Math.max(1, s.totalBookings - s.cancelled)) : 0;

        // Build daily series (fill gaps)
        const series: DailyPoint[] = [];
        const cursor = new Date(start);
        while (cursor <= end) {
          const iso = cursor.toISOString().split('T')[0];
          const v = dailyMap.get(iso) || { bookings: 0, revenue: 0 };
          series.push({ date: iso.slice(5), bookings: v.bookings, revenue: Math.round(v.revenue) });
          cursor.setDate(cursor.getDate() + 1);
        }

        // Category pie
        const catArr: CategoryPoint[] = Array.from(catMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }));

        // Top tests
        const topArr: TopTest[] = Array.from(testMap.entries())
          .map(([name, v]) => ({ name, count: v.count, revenue: Math.round(v.revenue) }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Status pie
        const statusArr: CategoryPoint[] = [
          { name: 'Booked', color: '#3b82f6' },
          { name: 'Sample Collected', color: '#f59e0b' },
          { name: 'Report Sent', color: '#10b981' },
          { name: 'Cancelled', color: '#ef4444' },
        ].map(x => ({ ...x, value: statusMap.get(x.name) || 0 })).filter(x => x.value > 0);

        setStats(s);
        setDailySeries(series);
        setCategoryData(catArr);
        setTopTests(topArr);
        setStatusData(statusArr);
      } catch (err) {
        console.error('[LabAnalytics] load error:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [labId, timeFrame, dateFrom, dateTo, collectionFilter]);

  const conversionRate = useMemo(() => {
    if (stats.totalScans === 0) return 0;
    return Math.round((stats.qrBookings / stats.totalScans) * 100);
  }, [stats.qrBookings, stats.totalScans]);

  return (
    <div className="space-y-8">
      {/* Header / filters */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-white text-2xl font-bold tracking-tight flex items-center gap-2">
                <Activity className="w-6 h-6 text-purple-500" />
                Lab Analytics
              </h2>
              <p className="text-gray-400 text-sm mt-1">Bookings, revenue and operational insights</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={timeFrame} onValueChange={setTimeFrame}>
                <SelectTrigger className="w-[170px] bg-zinc-950 border-zinc-800 text-gray-200 text-xs h-9">
                  <Calendar className="w-3.5 h-3.5 mr-2 text-purple-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-gray-200">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                  <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                  <SelectItem value="last-90-days">Last 90 Days</SelectItem>
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
              <Select value={collectionFilter} onValueChange={(v: any) => setCollectionFilter(v)}>
                <SelectTrigger className="w-[180px] bg-zinc-950 border-zinc-800 text-gray-200 text-xs h-9">
                  <Filter className="w-3.5 h-3.5 mr-2 text-purple-500" />
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

      {/* KPI grid — Overview */}
      <section>
        <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-500" /> Booking Overview
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'QR Scans', value: stats.totalScans, icon: QrCode, color: 'text-violet-400' },
            { label: 'Total Bookings', value: stats.totalBookings, icon: Users, color: 'text-purple-400' },
            { label: 'QR → Booking %', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Avg Order Value', value: `₹${stats.avgOrderValue.toLocaleString()}`, icon: IndianRupee, color: 'text-amber-400' },
          ].map((k, i) => (
            <Card key={i} className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{k.label}</span>
                  <div className={`p-2 rounded-lg bg-zinc-950 ${k.color}`}><k.icon className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-bold text-white">{loading ? '…' : k.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* KPI grid — Channel & Collection */}
      <section>
        <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
          <QrCode className="w-5 h-5 text-purple-500" /> Channel & Collection Mix
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'QR / Mini-site', value: stats.qrBookings, icon: QrCode, color: 'text-blue-400' },
            { label: 'Walk-in (Direct)', value: stats.walkinBookings, icon: UserPlus, color: 'text-cyan-400' },
            { label: 'Home Collection', value: stats.homeCollection, icon: Home, color: 'text-emerald-400' },
            { label: 'In-Lab Collection', value: stats.walkinCollection, icon: Store, color: 'text-teal-400' },
          ].map((k, i) => (
            <Card key={i} className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{k.label}</span>
                  <div className={`p-2 rounded-lg bg-zinc-950 ${k.color}`}><k.icon className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-bold text-white">{loading ? '…' : k.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* KPI grid — Operations */}
      <section>
        <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-purple-500" /> Operations
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Samples Collected', value: stats.sampleCollected, icon: TestTubes, color: 'text-emerald-400' },
            { label: 'Reports Sent', value: stats.reportSent, icon: FileCheck, color: 'text-green-400' },
            { label: 'Drop Outs', value: stats.dropOut, icon: UserMinus, color: 'text-orange-400' },
            { label: 'Cancelled', value: stats.cancelled, icon: XCircle, color: 'text-red-400' },
          ].map((k, i) => (
            <Card key={i} className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{k.label}</span>
                  <div className={`p-2 rounded-lg bg-zinc-950 ${k.color}`}><k.icon className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-bold text-white">{loading ? '…' : k.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Revenue strip */}
      <section>
        <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
          <IndianRupee className="w-5 h-5 text-purple-500" /> Revenue
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Gross Revenue', value: `₹${stats.revenue.toLocaleString()}`, color: 'text-emerald-400' },
            { label: 'Advance Collected', value: `₹${stats.advanceCollected.toLocaleString()}`, color: 'text-blue-400' },
            { label: 'Amount Due', value: `₹${stats.amountDue.toLocaleString()}`, color: 'text-amber-400' },
          ].map((k, i) => (
            <Card key={i} className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{k.label}</span>
                <div className={`text-3xl font-bold mt-2 ${k.color}`}>{loading ? '…' : k.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily bookings trend */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              Daily Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {!isMounted ? null : dailySeries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #27272a', color: '#fff' }} />
                  <Bar dataKey="bookings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue trend */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-500" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {!isMounted ? null : dailySeries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #27272a', color: '#fff' }} />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Test category pie */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <TestTubes className="w-4 h-4 text-blue-500" />
              Tests by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {!isMounted ? null : categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">No data</div>
            ) : (
              <div className="flex flex-col h-full">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3}>
                      {categoryData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #27272a', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 text-[10px] text-gray-400 justify-center pt-2 border-t border-zinc-800">
                  {categoryData.map(c => (
                    <span key={c.name} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}: <span className="text-white font-bold">{c.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status distribution pie */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Booking Status
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {!isMounted ? null : statusData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">No data</div>
            ) : (
              <div className="flex flex-col h-full">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3}>
                      {statusData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #27272a', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 text-[10px] text-gray-400 justify-center pt-2 border-t border-zinc-800">
                  {statusData.map(c => (
                    <span key={c.name} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}: <span className="text-white font-bold">{c.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Top Tests table */}
      <section>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <TestTubes className="w-4 h-4 text-purple-500" />
              Top 5 Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topTests.length === 0 ? (
              <div className="text-gray-500 text-sm py-6 text-center">No tests ordered in this period</div>
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
      </section>
    </div>
  );
}
