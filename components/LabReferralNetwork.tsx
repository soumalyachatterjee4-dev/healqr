import { useState, useEffect, useMemo } from 'react';
import {
  Network, Stethoscope, TrendingUp, Trophy, Search, Calendar,
  IndianRupee, MessageCircle, Users, Award,
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { db } from '../lib/firebase/config';
import {
  collection, query, where, getDocs, doc, getDoc,
} from 'firebase/firestore';
import { toast } from 'sonner';

interface LabReferralNetworkProps {
  labId: string;
  labName?: string;
}

interface DoctorStats {
  key: string;
  name: string;
  phone?: string;
  specialty?: string;
  isLinked: boolean;
  totalReferrals: number;
  thisMonth: number;
  thisWeek: number;
  totalRevenue: number;
  lastReferralDate: string;
  recent: Array<{ patientName: string; date: string; tests: number; amount: number }>;
}

type Period = 'week' | 'month' | 'all';

export default function LabReferralNetwork({ labId, labName }: LabReferralNetworkProps) {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<DoctorStats[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!labId) { setLoading(false); return; }
    load();
  }, [labId]);

  const load = async () => {
    setLoading(true);
    try {
      const [labSnap, bookingsSnap] = await Promise.all([
        getDoc(doc(db, 'labs', labId)),
        getDocs(query(collection(db, 'labBookings'), where('labId', '==', labId))),
      ]);

      const linkedDoctors: any[] = labSnap.exists() ? (labSnap.data().linkedDoctors || []) : [];
      const linkedMap = new Map<string, any>();
      linkedDoctors.forEach(d => {
        const k = (d.name || '').toLowerCase().trim();
        if (k) linkedMap.set(k, d);
      });

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const weekStart = new Date(now);
      const dow = weekStart.getDay() || 7;
      weekStart.setDate(weekStart.getDate() - (dow - 1));
      weekStart.setHours(0, 0, 0, 0);
      const monthISO = monthStart.toISOString().split('T')[0];
      const weekISO = weekStart.toISOString().split('T')[0];

      const map = new Map<string, DoctorStats>();
      bookingsSnap.docs.forEach(d => {
        const data: any = d.data();
        const refRaw = (data.referringDoctor || '').trim();
        if (!refRaw) return;
        if (data.isCancelled || data.status === 'cancelled') return;

        const key = refRaw.toLowerCase();
        const linked = linkedMap.get(key);

        const cur: DoctorStats = map.get(key) || {
          key,
          name: linked?.name || refRaw,
          phone: linked?.phone,
          specialty: linked?.specialty || (linked?.specialties?.[0]) || '',
          isLinked: !!linked,
          totalReferrals: 0,
          thisMonth: 0,
          thisWeek: 0,
          totalRevenue: 0,
          lastReferralDate: '',
          recent: [],
        };

        const bDate: string = data.bookingDate || '';
        const amount = Number(data.paymentDetails?.discountedPrice ?? data.totalAmount ?? 0);
        const tests = Array.isArray(data.selectedTests) ? data.selectedTests.length : Array.isArray(data.tests) ? data.tests.length : 0;

        cur.totalReferrals += 1;
        cur.totalRevenue += isFinite(amount) ? amount : 0;
        if (bDate >= monthISO) cur.thisMonth += 1;
        if (bDate >= weekISO) cur.thisWeek += 1;
        if (bDate > cur.lastReferralDate) cur.lastReferralDate = bDate;
        cur.recent.push({ patientName: data.patientName || 'Unknown', date: bDate, tests, amount: isFinite(amount) ? amount : 0 });

        map.set(key, cur);
      });

      // sort recent + cap to 5 per doctor
      const arr = Array.from(map.values()).map(d => {
        d.recent.sort((a, b) => (a.date < b.date ? 1 : -1));
        d.recent = d.recent.slice(0, 5);
        return d;
      });
      arr.sort((a, b) => b.totalReferrals - a.totalReferrals);

      setStats(arr);
    } catch (err) {
      console.error('[LabReferralNetwork] load:', err);
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = stats;
    if (q) arr = arr.filter(d => d.name.toLowerCase().includes(q) || (d.specialty || '').toLowerCase().includes(q));
    arr = arr.map(d => ({ ...d }));
    arr.sort((a, b) => {
      const ka = period === 'week' ? a.thisWeek : period === 'month' ? a.thisMonth : a.totalReferrals;
      const kb = period === 'week' ? b.thisWeek : period === 'month' ? b.thisMonth : b.totalReferrals;
      return kb - ka;
    });
    return arr;
  }, [stats, search, period]);

  const totals = useMemo(() => {
    const totalDoctors = stats.length;
    const linkedCount = stats.filter(s => s.isLinked).length;
    const totalReferrals = stats.reduce((s, d) => s + d.totalReferrals, 0);
    const totalRevenue = stats.reduce((s, d) => s + d.totalRevenue, 0);
    return { totalDoctors, linkedCount, totalReferrals, totalRevenue };
  }, [stats]);

  const sendThanks = (d: DoctorStats) => {
    if (!d.phone) {
      toast.error('No phone on file. Add doctor in Manage Doctors first.');
      return;
    }
    const m = period === 'week' ? d.thisWeek : period === 'month' ? d.thisMonth : d.totalReferrals;
    const text = encodeURIComponent(
      `Dear Dr. ${d.name.replace(/^dr\.?\s*/i, '')}, thank you for ${m} referral${m === 1 ? '' : 's'} to ${labName || 'our lab'}. We truly appreciate your trust. — ${labName || 'Lab'}`
    );
    const phone = d.phone.replace(/\D/g, '');
    const num = phone.length === 10 ? `91${phone}` : phone;
    window.open(`https://wa.me/${num}?text=${text}`, '_blank');
  };

  const periodLabel = period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Time';

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-white text-2xl font-bold flex items-center gap-2">
                <Network className="w-6 h-6 text-cyan-500" /> Referral Network
              </h2>
              <p className="text-gray-400 text-sm mt-1">Doctors who refer patients to {labName || 'your lab'}</p>
            </div>
            <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
              {(['week', 'month', 'all'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${period === p ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-400 hover:text-white'}`}>
                  {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Referring Doctors', value: totals.totalDoctors, icon: Stethoscope, color: 'text-cyan-400' },
          { label: 'Linked Doctors', value: totals.linkedCount, icon: Users, color: 'text-blue-400' },
          { label: 'Total Referrals', value: totals.totalReferrals, icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Revenue from Referrals', value: `₹${totals.totalRevenue.toLocaleString()}`, icon: IndianRupee, color: 'text-amber-400' },
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

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search doctor or specialty"
                className="pl-9 bg-zinc-950 border-zinc-800 text-white" />
            </div>
            <span className="text-[11px] text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Sorted by {periodLabel.toLowerCase()}
            </span>
          </div>

          {loading ? (
            <div className="text-gray-500 text-sm py-10 text-center">Loading referral network…</div>
          ) : filtered.length === 0 ? (
            <div className="text-gray-500 text-sm py-10 text-center">
              No referring doctors yet. Patients with a "Referring Doctor" on their booking will appear here.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((d, idx) => {
                const periodCount = period === 'week' ? d.thisWeek : period === 'month' ? d.thisMonth : d.totalReferrals;
                const isOpen = expanded === d.key;
                return (
                  <div key={d.key} className="rounded-xl border border-zinc-800 bg-zinc-950">
                    <div className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {idx < 3 ? <Trophy className={`w-5 h-5 ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-gray-300' : 'text-orange-400'}`} /> : (d.name[0] || '?').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-semibold truncate flex items-center gap-2">
                            {d.name}
                            {d.isLinked && <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">LINKED</span>}
                            {!d.isLinked && <span className="text-[10px] font-bold bg-zinc-800 text-gray-400 px-2 py-0.5 rounded-full">UNLINKED</span>}
                          </p>
                          <p className="text-gray-500 text-xs truncate">
                            {d.specialty || 'Doctor'} {d.phone ? `· ${d.phone}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3 md:gap-6 text-center">
                        <Stat label={periodLabel} value={periodCount} color="text-cyan-300" />
                        <Stat label="All-time" value={d.totalReferrals} color="text-white" />
                        <Stat label="Revenue" value={`₹${d.totalRevenue.toLocaleString()}`} color="text-emerald-400" />
                        <Stat label="Last" value={d.lastReferralDate || '—'} color="text-gray-400" small />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-700 text-gray-300"
                          onClick={() => setExpanded(isOpen ? null : d.key)}>
                          {isOpen ? 'Hide' : 'Recent'}
                        </Button>
                        <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => sendThanks(d)}>
                          <MessageCircle className="w-3 h-3 mr-1" /> Thank
                        </Button>
                      </div>
                    </div>

                    {isOpen && d.recent.length > 0 && (
                      <div className="border-t border-zinc-800 px-4 py-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1">
                          <Award className="w-3 h-3" /> Recent referrals
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-[10px] text-gray-500 uppercase tracking-wider">
                                <th className="pb-2">Date</th>
                                <th className="pb-2">Patient</th>
                                <th className="pb-2 text-right">Tests</th>
                                <th className="pb-2 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {d.recent.map((r, i) => (
                                <tr key={i} className="border-t border-zinc-800/60">
                                  <td className="py-1.5 text-gray-400">{r.date}</td>
                                  <td className="py-1.5 text-white">{r.patientName}</td>
                                  <td className="py-1.5 text-right text-blue-300">{r.tests}</td>
                                  <td className="py-1.5 text-right text-emerald-400">₹{r.amount.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, color, small }: { label: string; value: any; color: string; small?: boolean }) {
  return (
    <div>
      <p className={`font-bold ${small ? 'text-[11px]' : 'text-base'} ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}
