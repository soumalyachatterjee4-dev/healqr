import { useState, useEffect } from 'react';
import { Trophy, Users, ArrowUpDown } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';

interface Referrer {
  id: string;
  name: string;
  phone: string;
  role: string;
  totalReferrals: number;
  registeredViaName: string;
  createdAt: any;
}

export default function AdminReferrerLeaderboard() {
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'referrals' | 'recent'>('referrals');

  useEffect(() => { loadReferrers(); }, [sortBy]);

  const loadReferrers = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const field = sortBy === 'referrals' ? 'totalReferrals' : 'createdAt';
      const q = query(collection(db, 'referrers'), orderBy(field, 'desc'), limit(50));
      const snap = await getDocs(q);
      setReferrers(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Referrer[]);
    } catch (err) {
      console.error('Error loading referrers:', err);
      // Fallback: load all and sort client-side
      try {
        const snap = await getDocs(collection(db, 'referrers'));
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Referrer[];
        all.sort((a, b) => sortBy === 'referrals'
          ? (b.totalReferrals || 0) - (a.totalReferrals || 0)
          : (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
        );
        setReferrers(all.slice(0, 50));
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const totalRefs = referrers.reduce((sum, r) => sum + (r.totalReferrals || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <Users className="w-5 h-5 text-emerald-400 mb-2" />
          <p className="text-2xl font-bold text-white">{referrers.length}</p>
          <p className="text-gray-500 text-xs">Total Referrers</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <Trophy className="w-5 h-5 text-amber-400 mb-2" />
          <p className="text-2xl font-bold text-white">{totalRefs}</p>
          <p className="text-gray-500 text-xs">Total Referrals</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <ArrowUpDown className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-white">{referrers.length > 0 ? (totalRefs / referrers.length).toFixed(1) : '0'}</p>
          <p className="text-gray-500 text-xs">Avg per Referrer</p>
        </div>
      </div>

      {/* Sort Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSortBy('referrals')}
          className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${sortBy === 'referrals' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-gray-400'}`}
        >
          Top Referrers
        </button>
        <button
          onClick={() => setSortBy('recent')}
          className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${sortBy === 'recent' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-gray-400'}`}
        >
          Most Recent
        </button>
      </div>

      {/* Leaderboard Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : referrers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No referrers yet</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-gray-400 text-xs">
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Phone</th>
                <th className="text-left p-3">Invited By</th>
                <th className="text-right p-3">Referrals</th>
              </tr>
            </thead>
            <tbody>
              {referrers.map((r, i) => (
                <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="p-3 text-gray-500 text-sm">{i + 1}</td>
                  <td className="p-3 text-white text-sm font-medium">{r.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-zinc-800 text-gray-300 rounded text-[10px]">{r.role}</span>
                  </td>
                  <td className="p-3 text-gray-400 text-sm">{r.phone}</td>
                  <td className="p-3 text-gray-500 text-xs">{r.registeredViaName || '—'}</td>
                  <td className="p-3 text-right">
                    <span className={`font-bold text-sm ${
                      i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-emerald-400'
                    }`}>
                      {r.totalReferrals || 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
