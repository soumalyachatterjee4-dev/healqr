import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, MapPin, Users, Activity, Zap, AlertTriangle, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getLocationFromPincode } from '../utils/pincodeMapping';

interface PharmaAnalyticsProps {
  companyId: string;
}

interface DoctorRecord {
  id: string;
  doctorName: string;
  specialty: string;
  pincode: string;
  state: string;
  zone: string;
  totalBookingCount: number;
  isActive: boolean;
}

type EngagementLevel = 'daily-active' | 'weekly-active' | 'monthly-active' | 'dormant' | 'never-used';

export default function PharmaAnalytics({ companyId }: PharmaAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [bookingsByDoctor, setBookingsByDoctor] = useState<Record<string, { total: number; inRange: number; dates: string[] }>>({});
  const [specialtyBreakdown, setSpecialtyBreakdown] = useState<Record<string, number>>({});

  useEffect(() => {
    loadAnalytics();
  }, [companyId]);

  useEffect(() => {
    if (doctors.length > 0) loadBookingsForRange();
  }, [timeRange, doctors]);

  const loadAnalytics = async () => {
    if (!companyId || !db) return;
    setLoading(true);
    try {
      const doctorsRef = collection(db, 'pharmaCompanies', companyId, 'distributedDoctors');
      const snap = await getDocs(doctorsRef);
      const specMap: Record<string, number> = {};
      const drList: DoctorRecord[] = [];

      snap.docs.forEach(d => {
        const data = d.data();
        const pincode = data.pincode || '';
        const location = getLocationFromPincode(pincode);
        const specialty = data.specialty || 'General';
        specMap[specialty] = (specMap[specialty] || 0) + 1;

        drList.push({
          id: d.id,
          doctorName: data.doctorName || 'Unknown',
          specialty,
          pincode,
          state: location.state,
          zone: location.zone,
          totalBookingCount: data.totalBookingCount || 0,
          isActive: data.isActive !== false,
        });
      });

      setDoctors(drList);
      setSpecialtyBreakdown(specMap);
      await loadBookingsForRangeWithDoctors(drList);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBookingsForRange = () => loadBookingsForRangeWithDoctors(doctors);

  const loadBookingsForRangeWithDoctors = async (drList: DoctorRecord[]) => {
    if (!db || drList.length === 0) return;
    const now = new Date();
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const rangeStart = new Date(now.getTime() - daysBack * 86400000);
    const doctorIds = drList.map(d => d.id);

    try {
      const bookingMap: Record<string, { total: number; inRange: number; dates: string[] }> = {};
      for (let i = 0; i < doctorIds.length; i += 30) {
        const batch = doctorIds.slice(i, i + 30);
        const q = query(collection(db, 'bookings'), where('doctorId', 'in', batch));
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
          const data = d.data();
          const docId = data.doctorId;
          if (!bookingMap[docId]) bookingMap[docId] = { total: 0, inRange: 0, dates: [] };
          bookingMap[docId].total++;
          const bookingDate = data.appointmentDate || data.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || '';
          if (bookingDate) {
            bookingMap[docId].dates.push(bookingDate);
            const bd = new Date(bookingDate);
            if (bd >= rangeStart) bookingMap[docId].inRange++;
          }
        });
      }
      setBookingsByDoctor(bookingMap);
    } catch (err) {
      console.error('Error loading bookings for range:', err);
    }
  };

  const getEngagement = (dr: DoctorRecord): EngagementLevel => {
    const bookingData = bookingsByDoctor[dr.id];
    if (!bookingData || bookingData.total === 0) return 'never-used';
    const now = new Date();
    const dates = bookingData.dates.map(d => new Date(d)).sort((a, b) => b.getTime() - a.getTime());
    if (dates.length === 0) return 'never-used';
    const daysSince = Math.floor((now.getTime() - dates[0].getTime()) / 86400000);
    if (daysSince <= 1) return 'daily-active';
    if (daysSince <= 7) return 'weekly-active';
    if (daysSince <= 30) return 'monthly-active';
    return 'dormant';
  };

  const engagementConfig: Record<EngagementLevel, { label: string; color: string; icon: any; bg: string }> = {
    'daily-active': { label: 'Daily Active', color: 'text-emerald-400', icon: Zap, bg: 'bg-emerald-500/10' },
    'weekly-active': { label: 'Weekly Active', color: 'text-blue-400', icon: Activity, bg: 'bg-blue-500/10' },
    'monthly-active': { label: 'Monthly Active', color: 'text-amber-400', icon: Clock, bg: 'bg-amber-500/10' },
    'dormant': { label: 'Dormant', color: 'text-red-400', icon: AlertTriangle, bg: 'bg-red-500/10' },
    'never-used': { label: 'Never Used', color: 'text-gray-500', icon: AlertTriangle, bg: 'bg-zinc-800' },
  };

  const metrics = useMemo(() => {
    const totalDoctors = doctors.length;
    let totalInRange = 0;
    let totalAllTime = 0;
    doctors.forEach(dr => {
      const bd = bookingsByDoctor[dr.id];
      totalInRange += bd?.inRange || 0;
      totalAllTime += bd?.total || 0;
    });
    return { totalDoctors, totalBookingsInRange: totalInRange, totalBookingsAllTime: totalAllTime,
      avgPerDoctor: totalDoctors > 0 ? Math.round(totalInRange / totalDoctors) : 0 };
  }, [doctors, bookingsByDoctor]);

  const engagementCounts = useMemo(() => {
    const counts: Record<EngagementLevel, number> = {
      'daily-active': 0, 'weekly-active': 0, 'monthly-active': 0, 'dormant': 0, 'never-used': 0,
    };
    doctors.forEach(dr => { counts[getEngagement(dr)]++; });
    return counts;
  }, [doctors, bookingsByDoctor]);

  const zoneAnalytics = useMemo(() => {
    const zoneMap: Record<string, { doctors: number; bookings: number }> = {};
    doctors.forEach(dr => {
      if (!zoneMap[dr.zone]) zoneMap[dr.zone] = { doctors: 0, bookings: 0 };
      zoneMap[dr.zone].doctors++;
      zoneMap[dr.zone].bookings += bookingsByDoctor[dr.id]?.inRange || 0;
    });
    return Object.entries(zoneMap)
      .map(([zone, { doctors: d, bookings: b }]) => ({
        zone, doctors: d, bookings: b,
        avgBookingsPerDoctor: d > 0 ? Math.round(b / d) : 0,
      }))
      .sort((a, b) => b.bookings - a.bookings);
  }, [doctors, bookingsByDoctor]);

  const zoneBenchmarks = useMemo(() => {
    if (zoneAnalytics.length < 2) return [];
    const platformAvg = metrics.totalDoctors > 0 ? metrics.totalBookingsInRange / metrics.totalDoctors : 0;
    return zoneAnalytics.map(z => ({
      ...z,
      platformAvg: Math.round(platformAvg),
      diff: z.avgBookingsPerDoctor - Math.round(platformAvg),
      diffPct: platformAvg > 0 ? Math.round(((z.avgBookingsPerDoctor - platformAvg) / platformAvg) * 100) : 0,
    }));
  }, [zoneAnalytics, metrics]);

  const stateHeatmap = useMemo(() => {
    const stateMap: Record<string, { doctors: number; bookings: number }> = {};
    doctors.forEach(dr => {
      const state = dr.state || 'Unknown';
      if (!stateMap[state]) stateMap[state] = { doctors: 0, bookings: 0 };
      stateMap[state].doctors++;
      stateMap[state].bookings += bookingsByDoctor[dr.id]?.inRange || 0;
    });
    return Object.entries(stateMap)
      .map(([state, data]) => ({ state, ...data, avg: data.doctors > 0 ? Math.round(data.bookings / data.doctors) : 0 }))
      .sort((a, b) => b.bookings - a.bookings);
  }, [doctors, bookingsByDoctor]);

  const topDoctors = useMemo(() => {
    return doctors
      .map(dr => ({ ...dr, rangeBookings: bookingsByDoctor[dr.id]?.inRange || 0 }))
      .sort((a, b) => b.rangeBookings - a.rangeBookings)
      .slice(0, 10);
  }, [doctors, bookingsByDoctor]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const maxZoneBookings = Math.max(...zoneAnalytics.map(z => z.bookings), 1);
  const maxStateBookings = Math.max(...stateHeatmap.map(s => s.bookings), 1);
  const rangeLabel = timeRange === '7d' ? 'Last 7 Days' : timeRange === '30d' ? 'Last 30 Days' : 'Last 90 Days';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Analytics & Insights
          </h2>
          <p className="text-sm text-gray-400 mt-1">Performance overview across your distributed doctors</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">Bookings ({rangeLabel})</p>
          <p className="text-3xl font-bold text-emerald-400">{metrics.totalBookingsInRange.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">All time: {metrics.totalBookingsAllTime.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">Total Doctors</p>
          <p className="text-3xl font-bold text-blue-400">{metrics.totalDoctors}</p>
          <p className="text-xs text-gray-500 mt-1">Distributed by your company</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">Avg / Doctor</p>
          <p className="text-3xl font-bold text-amber-400">{metrics.avgPerDoctor}</p>
          <p className="text-xs text-gray-500 mt-1">{rangeLabel}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">Active Rate</p>
          <p className="text-3xl font-bold text-purple-400">
            {metrics.totalDoctors > 0
              ? Math.round(((engagementCounts['daily-active'] + engagementCounts['weekly-active']) / metrics.totalDoctors) * 100)
              : 0}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Daily + Weekly active</p>
        </div>
      </div>

      {/* Doctor Engagement Scores */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Doctor Engagement Scores
          </h3>
          <p className="text-xs text-gray-500 mt-1">Based on booking activity recency</p>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(Object.keys(engagementConfig) as EngagementLevel[]).map(level => {
            const config = engagementConfig[level];
            const Icon = config.icon;
            return (
              <div key={level} className={`${config.bg} rounded-xl p-4 text-center`}>
                <Icon className={`w-5 h-5 ${config.color} mx-auto mb-2`} />
                <p className="text-2xl font-bold text-white">{engagementCounts[level]}</p>
                <p className={`text-xs mt-1 ${config.color}`}>{config.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Zone-to-Zone Benchmarking */}
      {zoneBenchmarks.length >= 2 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              Zone-to-Zone Benchmarking
            </h3>
            <p className="text-xs text-gray-500 mt-1">Compare zones against your company average ({rangeLabel})</p>
          </div>
          <div className="p-4 space-y-3">
            {zoneBenchmarks.map(z => (
              <div key={z.zone} className="flex items-center gap-4">
                <span className="font-medium w-24 shrink-0 text-sm">{z.zone}</span>
                <div className="flex-1 h-8 bg-zinc-800 rounded-lg overflow-hidden">
                  <div
                    className={`h-full rounded-lg ${z.diff >= 0 ? 'bg-emerald-600' : 'bg-red-600/60'}`}
                    style={{ width: `${Math.min((z.avgBookingsPerDoctor / Math.max(...zoneBenchmarks.map(b => b.avgBookingsPerDoctor), 1)) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex items-center gap-1 w-28 shrink-0 justify-end">
                  <span className="text-sm font-mono font-bold">{z.avgBookingsPerDoctor}</span>
                  <span className="text-xs text-gray-500">avg</span>
                  {z.diff >= 0 ? (
                    <span className="text-emerald-400 text-xs flex items-center"><ArrowUpRight className="w-3 h-3" />+{z.diffPct}%</span>
                  ) : (
                    <span className="text-red-400 text-xs flex items-center"><ArrowDownRight className="w-3 h-3" />{z.diffPct}%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Territory Heatmap (State-level) */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400" />
            Territory Heatmap — {rangeLabel}
          </h3>
          <p className="text-xs text-gray-500 mt-1">Booking density by state</p>
        </div>
        <div className="p-4">
          {stateHeatmap.length === 0 ? (
            <p className="text-center text-gray-500 py-6">No data available</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stateHeatmap.map(s => {
                const intensity = s.bookings / maxStateBookings;
                const hue = intensity > 0.7 ? 'bg-emerald-600/30 border-emerald-500/40' :
                            intensity > 0.3 ? 'bg-amber-600/20 border-amber-500/30' :
                            s.bookings > 0 ? 'bg-blue-600/15 border-blue-500/25' : 'bg-zinc-800 border-zinc-700';
                return (
                  <div key={s.state} className={`rounded-lg p-3 border ${hue}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{s.state}</span>
                      <span className="text-emerald-400 font-bold text-sm">{s.bookings}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>{s.doctors} doctors</span>
                      <span>avg {s.avg}/dr</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Zone Performance Bars */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-400" />
            Zone Performance — {rangeLabel}
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
                    style={{ width: `${(zone.bookings / maxZoneBookings) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Top Doctors + Specialty */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Top 10 Doctors — {rangeLabel}
            </h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {topDoctors.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No data</div>
            ) : (
              topDoctors.map((doc, idx) => {
                const engagement = getEngagement(doc);
                const eConfig = engagementConfig[engagement];
                return (
                  <div key={`${doc.doctorName}-${idx}`} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx < 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-800 text-gray-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{doc.doctorName}</p>
                        <p className="text-xs text-gray-500">{doc.specialty} • {doc.state}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${eConfig.bg} ${eConfig.color}`}>{eConfig.label}</span>
                      <span className="text-sm font-bold font-mono text-emerald-400">{doc.rangeBookings}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

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
                  const pct = metrics.totalDoctors > 0 ? (count / metrics.totalDoctors) * 100 : 0;
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

