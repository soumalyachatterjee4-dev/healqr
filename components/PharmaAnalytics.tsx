import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Calendar, MapPin, Users, ArrowUpRight } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { getLocationFromPincode, getAllZones } from '../utils/pincodeMapping';

interface PharmaAnalyticsProps {
  companyId: string;
}

interface DailyBooking {
  date: string;
  count: number;
}

interface ZoneAnalytics {
  zone: string;
  doctors: number;
  bookings: number;
  avgBookingsPerDoctor: number;
}

interface TopDoctor {
  name: string;
  specialty: string;
  state: string;
  totalBookings: number;
}

export default function PharmaAnalytics({ companyId }: PharmaAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [zoneAnalytics, setZoneAnalytics] = useState<ZoneAnalytics[]>([]);
  const [topDoctors, setTopDoctors] = useState<TopDoctor[]>([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalDoctors, setTotalDoctors] = useState(0);
  const [avgPerDoctor, setAvgPerDoctor] = useState(0);
  const [specialtyBreakdown, setSpecialtyBreakdown] = useState<Record<string, number>>({});

  useEffect(() => {
    loadAnalytics();
  }, [companyId, timeRange]);

  const loadAnalytics = async () => {
    if (!companyId || !db) return;
    setLoading(true);

    try {
      const doctorsRef = collection(db, 'pharmaCompanies', companyId, 'distributedDoctors');
      const snap = await getDocs(doctorsRef);

      const zoneMap: Record<string, { doctors: number; bookings: number }> = {};
      const specMap: Record<string, number> = {};
      const doctors: TopDoctor[] = [];
      let total = 0;

      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const pincode = data.pincode || '';
        const location = getLocationFromPincode(pincode);
        const zone = location.zone;
        const bookings = data.totalBookingCount || 0;
        const specialty = data.specialty || 'General';

        // Zone aggregation
        if (!zoneMap[zone]) zoneMap[zone] = { doctors: 0, bookings: 0 };
        zoneMap[zone].doctors++;
        zoneMap[zone].bookings += bookings;

        // Specialty aggregation
        specMap[specialty] = (specMap[specialty] || 0) + 1;

        total += bookings;

        doctors.push({
          name: data.doctorName || 'Unknown',
          specialty,
          state: location.state,
          totalBookings: bookings,
        });
      });

      // Zone analytics
      const zoneArr: ZoneAnalytics[] = Object.entries(zoneMap)
        .map(([zone, { doctors: d, bookings: b }]) => ({
          zone,
          doctors: d,
          bookings: b,
          avgBookingsPerDoctor: d > 0 ? Math.round(b / d) : 0,
        }))
        .sort((a, b) => b.bookings - a.bookings);

      // Top doctors
      doctors.sort((a, b) => b.totalBookings - a.totalBookings);

      setZoneAnalytics(zoneArr);
      setTopDoctors(doctors.slice(0, 10));
      setTotalBookings(total);
      setTotalDoctors(snap.size);
      setAvgPerDoctor(snap.size > 0 ? Math.round(total / snap.size) : 0);
      setSpecialtyBreakdown(specMap);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const maxBookings = Math.max(...zoneAnalytics.map(z => z.bookings), 1);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Analytics
          </h2>
          <p className="text-sm text-gray-400 mt-1">Performance overview across your distributed doctors</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">Total Bookings</p>
          <p className="text-3xl font-bold text-emerald-400">{totalBookings.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">All time</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">Total Doctors</p>
          <p className="text-3xl font-bold text-blue-400">{totalDoctors}</p>
          <p className="text-xs text-gray-500 mt-1">Distributed by your company</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">Avg. Bookings / Doctor</p>
          <p className="text-3xl font-bold text-amber-400">{avgPerDoctor}</p>
          <p className="text-xs text-gray-500 mt-1">Average across all doctors</p>
        </div>
      </div>

      {/* Zone Performance - Horizontal Bars */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-400" />
            Zone Performance
          </h3>
        </div>
        <div className="p-4 space-y-4">
          {zoneAnalytics.length === 0 ? (
            <p className="text-center text-gray-500 py-6">No data available</p>
          ) : (
            zoneAnalytics.map(zone => (
              <div key={zone.zone}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <div>
                    <span className="font-medium">{zone.zone}</span>
                    <span className="text-gray-500 ml-2">({zone.doctors} doctors)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-400">{zone.bookings}</span>
                    <span className="text-gray-500 text-xs ml-1">bookings</span>
                    <span className="text-gray-500 text-xs ml-2">(avg {zone.avgBookingsPerDoctor}/doctor)</span>
                  </div>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
                    style={{ width: `${(zone.bookings / maxBookings) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Two columns: Top Doctors + Specialty */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Doctors */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Top 10 Doctors by Bookings
            </h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {topDoctors.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No data</div>
            ) : (
              topDoctors.map((doc, idx) => (
                <div key={`${doc.name}-${idx}`} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx < 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-800 text-gray-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-gray-500">{doc.specialty} • {doc.state}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold font-mono text-emerald-400">{doc.totalBookings}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Specialty Breakdown */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Specialty Distribution
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {Object.keys(specialtyBreakdown).length === 0 ? (
              <p className="text-center text-gray-500 py-6">No data</p>
            ) : (
              Object.entries(specialtyBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([specialty, count]) => {
                  const pct = totalDoctors > 0 ? (count / totalDoctors) * 100 : 0;
                  return (
                    <div key={specialty} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        <span className="text-sm truncate">{specialty}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-gray-400">{count}</span>
                        <span className="text-xs text-gray-500 w-12 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <p className="text-sm text-blue-400">
          <strong>Data Privacy:</strong> Analytics are based on booking counts only. No patient information is included.
        </p>
      </div>
    </div>
  );
}

