import { useState, useEffect, useMemo } from 'react';
import {
  Target, Users, UserCheck, UserX, RotateCcw, MessageCircle, Calendar, TrendingUp, Award,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { db } from '../lib/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

interface LabPatientRetentionProps {
  labId: string;
  labName?: string;
}

interface PatientStat {
  phone: string;
  name: string;
  visits: number;
  firstVisit: string;
  lastVisit: string;
  totalSpend: number;
  daysSinceLast: number;
  branchName: string;
}

type SegmentKey = 'loyal' | 'active' | 'at-risk' | 'churned' | 'new';

export default function LabPatientRetention({ labId, labName }: LabPatientRetentionProps) {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientStat[]>([]);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<'all' | SegmentKey>('all');

  useEffect(() => {
    if (!labId) { setLoading(false); return; }
    load();
  }, [labId]);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'labBookings'), where('labId', '==', labId)));
      const map = new Map<string, PatientStat>();
      snap.docs.forEach(d => {
        const data: any = d.data();
        if (data.isCancelled || data.status === 'cancelled') return;
        const phoneRaw = String(data.patientPhone || '').replace(/\D/g, '').slice(-10);
        if (!phoneRaw) return;
        const bDate: string = data.bookingDate || '';
        if (!bDate) return;
        const amount = Number(data.paymentDetails?.discountedPrice ?? data.totalAmount ?? 0);

        const cur = map.get(phoneRaw) || {
          phone: phoneRaw,
          name: data.patientName || 'Unknown',
          visits: 0,
          firstVisit: bDate,
          lastVisit: bDate,
          totalSpend: 0,
          daysSinceLast: 0,
          branchName: data.branchName || '',
        };
        cur.visits += 1;
        cur.totalSpend += isFinite(amount) ? amount : 0;
        if (bDate < cur.firstVisit) cur.firstVisit = bDate;
        if (bDate > cur.lastVisit) {
          cur.lastVisit = bDate;
          cur.name = data.patientName || cur.name;
          cur.branchName = data.branchName || cur.branchName;
        }
        map.set(phoneRaw, cur);
      });

      const today = new Date();
      const arr = Array.from(map.values()).map(p => {
        const days = Math.floor((today.getTime() - new Date(p.lastVisit).getTime()) / 86400000);
        return { ...p, daysSinceLast: isFinite(days) ? days : 999 };
      });
      arr.sort((a, b) => b.visits - a.visits || b.totalSpend - a.totalSpend);
      setPatients(arr);
    } catch (err) {
      console.error('[LabPatientRetention] load:', err);
      toast.error('Failed to load retention data');
    } finally {
      setLoading(false);
    }
  };

  const segmentOf = (p: PatientStat): SegmentKey => {
    if (p.visits === 1 && p.daysSinceLast <= 90) return 'new';
    if (p.visits >= 4 && p.daysSinceLast <= 180) return 'loyal';
    if (p.visits >= 2 && p.daysSinceLast <= 90) return 'active';
    if (p.daysSinceLast > 180) return 'churned';
    return 'at-risk';
  };

  const segmented = useMemo(() => {
    const map: Record<SegmentKey, PatientStat[]> = {
      loyal: [], active: [], 'at-risk': [], churned: [], new: [],
    };
    patients.forEach(p => map[segmentOf(p)].push(p));
    return map;
  }, [patients]);

  const totals = useMemo(() => {
    const total = patients.length;
    const repeat = patients.filter(p => p.visits >= 2).length;
    const repeatRate = total ? Math.round((repeat / total) * 100) : 0;
    const churned = segmented.churned.length;
    const churnRate = total ? Math.round((churned / total) * 100) : 0;
    const avgVisits = total ? Number((patients.reduce((s, p) => s + p.visits, 0) / total).toFixed(2)) : 0;
    const avgSpend = total ? Math.round(patients.reduce((s, p) => s + p.totalSpend, 0) / total) : 0;
    return { total, repeat, repeatRate, churned, churnRate, avgVisits, avgSpend };
  }, [patients, segmented]);

  const cohort = useMemo(() => {
    const visitBuckets = [
      { label: '1 visit', min: 1, max: 1 },
      { label: '2 visits', min: 2, max: 2 },
      { label: '3 visits', min: 3, max: 3 },
      { label: '4-5', min: 4, max: 5 },
      { label: '6-9', min: 6, max: 9 },
      { label: '10+', min: 10, max: Infinity },
    ];
    return visitBuckets.map(b => ({
      label: b.label,
      count: patients.filter(p => p.visits >= b.min && p.visits <= b.max).length,
    }));
  }, [patients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter(p => {
      if (segment !== 'all' && segmentOf(p) !== segment) return false;
      if (q && !`${p.name} ${p.phone}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [patients, search, segment]);

  const reachOut = (p: PatientStat) => {
    const text = encodeURIComponent(
      `Dear ${p.name?.split(' ')[0] || 'there'}, it's been ${p.daysSinceLast} days since your last test at ${labName || 'our lab'}. Stay on top of your health — book your next check-up with us today!`
    );
    const num = p.phone.length === 10 ? `91${p.phone}` : p.phone;
    window.open(`https://wa.me/${num}?text=${text}`, '_blank');
  };

  const segBadge = (s: SegmentKey) => {
    const map: Record<SegmentKey, string> = {
      loyal: 'bg-amber-500/20 text-amber-300',
      active: 'bg-emerald-500/20 text-emerald-300',
      'at-risk': 'bg-orange-500/20 text-orange-300',
      churned: 'bg-red-500/20 text-red-300',
      new: 'bg-blue-500/20 text-blue-300',
    };
    return map[s];
  };

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <h2 className="text-white text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-pink-500" /> Patient Retention
          </h2>
          <p className="text-gray-400 text-sm mt-1">Repeat visits, churn risk &amp; patient win-back</p>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Patients', value: totals.total, icon: Users, color: 'text-blue-400' },
          { label: 'Repeat Patients', value: totals.repeat, icon: UserCheck, color: 'text-emerald-400' },
          { label: 'Repeat Rate', value: `${totals.repeatRate}%`, icon: TrendingUp, color: 'text-violet-400' },
          { label: 'Churned (>180d)', value: totals.churned, icon: UserX, color: 'text-red-400' },
          { label: 'Avg Visits', value: totals.avgVisits, icon: Calendar, color: 'text-amber-400' },
          { label: 'Avg LTV', value: `₹${totals.avgSpend.toLocaleString()}`, icon: Award, color: 'text-pink-400' },
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

      {/* Segments + Cohort */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Patient Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {([
                { key: 'loyal', label: '🏆 Loyal', sub: '4+ visits, ≤180d', color: 'amber' },
                { key: 'active', label: '✅ Active', sub: '2+ visits, ≤90d', color: 'emerald' },
                { key: 'new', label: '🆕 New', sub: '1 visit, ≤90d', color: 'blue' },
                { key: 'at-risk', label: '⚠ At-Risk', sub: '90-180d gap', color: 'orange' },
                { key: 'churned', label: '💤 Churned', sub: '>180d gap', color: 'red' },
              ] as { key: SegmentKey; label: string; sub: string; color: string }[]).map(s => (
                <button key={s.key}
                  onClick={() => setSegment(segment === s.key ? 'all' : s.key)}
                  className={`p-3 rounded-lg border text-left transition ${segment === s.key ? `border-${s.color}-500 bg-${s.color}-500/10` : 'border-zinc-800 hover:border-zinc-700'}`}>
                  <div className="text-white text-sm font-bold">{s.label}</div>
                  <div className="text-gray-500 text-[10px] mt-0.5">{s.sub}</div>
                  <div className={`text-2xl font-bold mt-2 text-${s.color}-400`}>
                    {segmented[s.key].length}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Visit Frequency Cohort</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            {cohort.every(c => c.count === 0) ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cohort}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="label" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #27272a', color: '#fff' }} />
                  <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Patient list */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient or phone"
              className="flex-1 min-w-[200px] bg-zinc-950 border-zinc-800 text-white" />
            <Select value={segment} onValueChange={(v: any) => setSegment(v)}>
              <SelectTrigger className="w-[180px] bg-zinc-950 border-zinc-800 text-gray-200 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-gray-200">
                <SelectItem value="all">All Segments</SelectItem>
                <SelectItem value="loyal">Loyal</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="at-risk">At-Risk</SelectItem>
                <SelectItem value="churned">Churned</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[11px] text-gray-500">{filtered.length} patients</span>
          </div>

          {loading ? (
            <div className="text-gray-500 text-sm py-10 text-center">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-gray-500 text-sm py-10 text-center">No patients match.</div>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-900">
                  <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-zinc-800">
                    <th className="py-2 font-semibold">Patient</th>
                    <th className="py-2 font-semibold">Phone</th>
                    <th className="py-2 font-semibold text-right">Visits</th>
                    <th className="py-2 font-semibold text-right">Total Spend</th>
                    <th className="py-2 font-semibold">First Visit</th>
                    <th className="py-2 font-semibold">Last Visit</th>
                    <th className="py-2 font-semibold text-right">Days Since</th>
                    <th className="py-2 font-semibold">Segment</th>
                    <th className="py-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const seg = segmentOf(p);
                    return (
                      <tr key={p.phone} className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/30">
                        <td className="py-3 text-white font-medium">{p.name}</td>
                        <td className="py-3 text-gray-400">{p.phone}</td>
                        <td className="py-3 text-right text-blue-300 font-semibold">{p.visits}</td>
                        <td className="py-3 text-right text-emerald-400 font-semibold">₹{p.totalSpend.toLocaleString()}</td>
                        <td className="py-3 text-gray-400 text-xs">{p.firstVisit}</td>
                        <td className="py-3 text-gray-400 text-xs">{p.lastVisit}</td>
                        <td className="py-3 text-right text-gray-300 text-xs">{p.daysSinceLast}d</td>
                        <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${segBadge(seg)}`}>{seg.toUpperCase()}</span></td>
                        <td className="py-3 text-right">
                          <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-700 text-emerald-300 hover:bg-emerald-950"
                            onClick={() => reachOut(p)}>
                            <MessageCircle className="w-3 h-3 mr-1" /> Reach out
                          </Button>
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
    </div>
  );
}
