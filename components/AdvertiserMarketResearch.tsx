import { useState } from 'react';
import { Search, MapPin, Users, Activity, Building2, Info, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getLocationFromPincode, getStatesInZone, getAllZones, getAllStates } from '../utils/pincodeMapping';

interface PincodeResult {
  pincode: string;
  state: string;
  zone: string;
  doctorCount: number;
  estimatedBookings: number;
}

export default function AdvertiserMarketResearch() {
  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState<PincodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'pincode' | 'state' | 'zone'>('pincode');
  const [hasSearched, setHasSearched] = useState(false);

  // Aggregate stats
  const [aggregateStats, setAggregateStats] = useState({
    totalDoctors: 0,
    totalEstBookings: 0,
    statesFound: 0,
  });

  const handleSearch = async () => {
    if (!searchInput.trim() || !db) return;
    setLoading(true);
    setHasSearched(true);

    try {
      // Get all doctors with public pincodes
      const doctorsRef = collection(db, 'doctors');
      const snap = await getDocs(doctorsRef);

      const pincodeMap: Record<string, { count: number; bookings: number }> = {};

      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const pincode = data.clinicPincode || data.pincode || '';
        if (!pincode) return;

        if (!pincodeMap[pincode]) {
          pincodeMap[pincode] = { count: 0, bookings: 0 };
        }
        pincodeMap[pincode].count++;
        pincodeMap[pincode].bookings += (data.stats?.totalConsultations || 0);
      });

      let filtered: PincodeResult[] = [];
      const input = searchInput.trim().toLowerCase();

      if (searchType === 'pincode') {
        // Search by pincodes (comma-separated)
        const pincodes = input.split(',').map(s => s.trim()).filter(Boolean);

        for (const pin of pincodes) {
          const location = getLocationFromPincode(pin);
          const data = pincodeMap[pin] || { count: 0, bookings: 0 };
          filtered.push({
            pincode: pin,
            state: location.state,
            zone: location.zone,
            doctorCount: data.count,
            estimatedBookings: data.bookings,
          });
        }
      } else if (searchType === 'state') {
        // Filter by state
        Object.keys(pincodeMap).forEach(pin => {
          const location = getLocationFromPincode(pin);
          if (location.state.toLowerCase().includes(input)) {
            const data = pincodeMap[pin];
            filtered.push({
              pincode: pin,
              state: location.state,
              zone: location.zone,
              doctorCount: data.count,
              estimatedBookings: data.bookings,
            });
          }
        });
      } else if (searchType === 'zone') {
        // Filter by zone
        Object.keys(pincodeMap).forEach(pin => {
          const location = getLocationFromPincode(pin);
          if (location.zone.toLowerCase().includes(input)) {
            const data = pincodeMap[pin];
            filtered.push({
              pincode: pin,
              state: location.state,
              zone: location.zone,
              doctorCount: data.count,
              estimatedBookings: data.bookings,
            });
          }
        });
      }

      // Sort by doctor count desc
      filtered.sort((a, b) => b.doctorCount - a.doctorCount);

      const totalDoctors = filtered.reduce((s, r) => s + r.doctorCount, 0);
      const totalBookings = filtered.reduce((s, r) => s + r.estimatedBookings, 0);
      const statesSet = new Set(filtered.map(r => r.state));

      setResults(filtered);
      setAggregateStats({
        totalDoctors,
        totalEstBookings: totalBookings,
        statesFound: statesSet.size,
      });
    } catch (error) {
      console.error('Error searching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Search className="w-5 h-5 text-emerald-400" />
          Market Research
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Explore HealQR's doctor network reach by pincode, state, or zone.
          Data is aggregated — no individual patient information is exposed.
        </p>
      </div>

      {/* Search Controls */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex gap-2">
          {[
            { id: 'pincode', label: 'By Pincode' },
            { id: 'state', label: 'By State' },
            { id: 'zone', label: 'By Zone' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setSearchType(opt.id as any)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                searchType === opt.id
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={
                searchType === 'pincode'
                  ? 'Enter pincodes (comma-separated), e.g. 400001, 400002'
                  : searchType === 'state'
                    ? 'Enter state name, e.g. Maharashtra'
                    : 'Enter zone name, e.g. Western'
              }
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !searchInput.trim()}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
      </div>

      {/* Aggregate Stats */}
      {hasSearched && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span className="text-sm text-gray-400">Doctors in Area</span>
            </div>
            <p className="text-2xl font-bold">{aggregateStats.totalDoctors}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-gray-400">Est. Total Consultations</span>
            </div>
            <p className="text-2xl font-bold">{aggregateStats.totalEstBookings.toLocaleString()}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-gray-400">States Covered</span>
            </div>
            <p className="text-2xl font-bold">{aggregateStats.statesFound}</p>
          </div>
        </div>
      )}

      {/* Results Table */}
      {hasSearched && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-semibold">Results ({results.length} pincodes)</h3>
          </div>

          {results.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No data found for this search
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 text-left">
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500">Pincode</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500">State</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500">Zone</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 text-right">Doctors</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 text-right">Est. Consultations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {results.slice(0, 50).map((r, idx) => (
                    <tr key={`${r.pincode}-${idx}`} className="hover:bg-zinc-800/50">
                      <td className="px-4 py-3 text-sm font-mono">{r.pincode}</td>
                      <td className="px-4 py-3 text-sm">{r.state}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{r.zone}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold">{r.doctorCount}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-400">{r.estimatedBookings.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {results.length > 50 && (
                <div className="p-3 text-center text-xs text-gray-500 border-t border-zinc-800">
                  Showing first 50 of {results.length} results
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Privacy Notice */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-sm text-emerald-400">
            <strong>Privacy First:</strong> All data shown is pincode-level aggregates only.
            No doctor names, patient information, or individual identifiers are exposed to advertisers.
          </p>
        </div>
      </div>
    </div>
  );
}

