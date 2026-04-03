import { useState, useEffect } from 'react';
import { Users, Calendar, MapPin, TrendingUp, Building2, RefreshCw, Shield, Lock, FileText, Brain } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, getDocs, doc, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { getLocationFromPincode } from '../utils/pincodeMapping';

interface PharmaDashboardProps {
  companyId: string;
  companyName: string;
}

interface DoctorSummary {
  doctorId: string;
  doctorName: string;
  specialty: string;
  pincode: string;
  state: string;
  zone: string;
  todayBookings: number;
  totalBookings: number;
}

interface CompanyStats {
  totalDoctors: number;
  totalClinics: number;
  monthlyBookings: number;
  digitalRxCount: number;
  aiRxReaderCount: number;
  zoneBreakdown: Record<string, number>;
  stateBreakdown: Record<string, number>;
}

export default function PharmaDashboard({ companyId, companyName }: PharmaDashboardProps) {
  const [stats, setStats] = useState<CompanyStats>({
    totalDoctors: 0,
    totalClinics: 0,
    monthlyBookings: 0,
    digitalRxCount: 0,
    aiRxReaderCount: 0,
    zoneBreakdown: {},
    stateBreakdown: {},
  });
  const [recentDoctors, setRecentDoctors] = useState<DoctorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [territoryStates, setTerritoryStates] = useState<string[]>([]);
  const [territoryType, setTerritoryType] = useState<string>('');
  const [registeredState, setRegisteredState] = useState<string>('');
  const [companySpecialties, setCompanySpecialties] = useState<string[]>([]);
  const [territorySpecialtiesMap, setTerritorySpecialtiesMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadDashboardData();
    loadCompanyProfile();
  }, [companyId]);

  const loadCompanyProfile = async () => {
    if (!companyId || !db) return;
    try {
      const companyDoc = await getDoc(doc(db, 'pharmaCompanies', companyId));
      if (companyDoc.exists()) {
        const data = companyDoc.data();
        setTerritoryStates(data.territoryStates || []);
        setTerritoryType(data.territoryType || '');
        setRegisteredState(data.registeredOfficeState || '');
        setCompanySpecialties(data.specialties || []);
        // Load territory-specialty map
        const tsMap = data.territorySpecialties || {};
        setTerritorySpecialtiesMap(tsMap);
      }
    } catch (err) {
      console.error('Error loading company profile:', err);
    }
  };

  const loadDashboardData = async () => {
    if (!companyId || !db) return;
    setLoading(true);

    try {
      // Get distributed doctors for this company
      const doctorsRef = collection(db, 'pharmaCompanies', companyId, 'distributedDoctors');
      const doctorsSnap = await getDocs(doctorsRef);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const doctors: DoctorSummary[] = [];
      const zoneBreakdown: Record<string, number> = {};
      const stateBreakdown: Record<string, number> = {};
      const doctorIdSet = new Set<string>();

      for (const docSnap of doctorsSnap.docs) {
        const data = docSnap.data();
        const doctorId = data.doctorId || docSnap.id;
        if (doctorIdSet.has(doctorId)) continue;
        doctorIdSet.add(doctorId);
        const pincode = data.pincode || '';
        const location = getLocationFromPincode(pincode);
        const state = location.state;
        const zone = location.zone;

        zoneBreakdown[zone] = (zoneBreakdown[zone] || 0) + 1;
        stateBreakdown[state] = (stateBreakdown[state] || 0) + 1;

        doctors.push({
          doctorId,
          doctorName: data.doctorName || 'Unknown Doctor',
          specialty: data.specialty || 'General',
          pincode,
          state,
          zone,
          todayBookings: data.todayBookingCount || 0,
          totalBookings: data.totalBookingCount || 0,
        });
      }

      // Also query doctors collection by companyName (same fallback as My Doctors)
      const companyDoc = await getDoc(doc(db, 'pharmaCompanies', companyId));
      const cName = companyDoc.exists() ? companyDoc.data().companyName : '';
      if (cName) {
        const allDocsSnap = await getDocs(collection(db, 'doctors'));
        const lcName = cName.toLowerCase().trim();
        for (const dDoc of allDocsSnap.docs) {
          const cn = dDoc.data().companyName;
          if (!cn || cn.toLowerCase().trim() !== lcName) continue;
          if (doctorIdSet.has(dDoc.id)) continue;
          doctorIdSet.add(dDoc.id);
          const dData = dDoc.data();
          const pincode = dData.pinCode || '';
          const location = getLocationFromPincode(pincode);
          zoneBreakdown[location.zone] = (zoneBreakdown[location.zone] || 0) + 1;
          stateBreakdown[location.state] = (stateBreakdown[location.state] || 0) + 1;
          doctors.push({
            doctorId: dDoc.id,
            doctorName: dData.name || 'Unknown Doctor',
            specialty: Array.isArray(dData.specialties) ? dData.specialties.join(', ') : (dData.specialty || 'General'),
            pincode,
            state: location.state,
            zone: location.zone,
            todayBookings: 0,
            totalBookings: 0,
          });
        }
      }

      // Get distributed clinics
      const clinicsRef = collection(db, 'pharmaCompanies', companyId, 'distributedClinics');
      const clinicsSnap = await getDocs(clinicsRef);
      const clinicIdSet = new Set<string>();
      clinicsSnap.docs.forEach(d => {
        const cid = d.data().clinicId || d.id;
        clinicIdSet.add(cid);
      });

      // Also query clinics by companyName fallback
      if (cName) {
        const allClinicsSnap = await getDocs(collection(db, 'clinics'));
        const lcName = cName.toLowerCase().trim();
        for (const cDoc of allClinicsSnap.docs) {
          const cn = cDoc.data().companyName;
          if (!cn || cn.toLowerCase().trim() !== lcName) continue;
          if (clinicIdSet.has(cDoc.id)) continue;
          clinicIdSet.add(cDoc.id);
        }
      }

      const allDoctorIds = Array.from(doctorIdSet);
      const allClinicIds = Array.from(clinicIdSet);
      const totalDoctors = allDoctorIds.length;
      const totalClinics = allClinicIds.length;

      // Set base stats immediately so cards show even if booking queries fail
      setStats({
        totalDoctors,
        totalClinics,
        monthlyBookings: 0,
        digitalRxCount: 0,
        aiRxReaderCount: 0,
        zoneBreakdown,
        stateBreakdown,
      });
      setRecentDoctors(doctors.slice(0, 5));
      setLastRefresh(new Date());

      // Query bookings for all doctors (batched by 30) — may fail due to permissions
      let monthlyBookings = 0;
      let digitalRxCount = 0;
      let aiRxReaderCount = 0;

      try {
        for (let i = 0; i < allDoctorIds.length; i += 30) {
          const batch = allDoctorIds.slice(i, i + 30);
          const bSnap = await getDocs(query(collection(db, 'bookings'), where('doctorId', 'in', batch)));
          bSnap.forEach(d => {
            const data = d.data();
            if (data.status === 'cancelled') return;
            const createdAt = data.createdAt?.toDate?.();
            if (createdAt && createdAt >= monthStart) {
              monthlyBookings++;
              if (data.digitalRxUrl || data.rxPdfUrl) digitalRxCount++;
            }
          });
        }

        // Query bookings for clinics too
        for (let i = 0; i < allClinicIds.length; i += 30) {
          const batch = allClinicIds.slice(i, i + 30);
          const bSnap = await getDocs(query(collection(db, 'bookings'), where('clinicId', 'in', batch)));
          bSnap.forEach(d => {
            const data = d.data();
            if (data.status === 'cancelled') return;
            const createdAt = data.createdAt?.toDate?.();
            if (createdAt && createdAt >= monthStart) {
              if (data.doctorId && doctorIdSet.has(data.doctorId)) return;
              monthlyBookings++;
              if (data.digitalRxUrl || data.rxPdfUrl) digitalRxCount++;
            }
          });
        }
      } catch (bookingErr) {
        console.warn('📊 Bookings query failed (permissions):', bookingErr);
      }

      // Query AI RX Reader usage from notifications collection
      try {
        for (let i = 0; i < allDoctorIds.length; i += 30) {
          const batch = allDoctorIds.slice(i, i + 30);
          const nSnap = await getDocs(query(
            collection(db, 'notifications'),
            where('type', '==', 'ai_rx_prescription'),
            where('doctorId', 'in', batch)
          ));
          nSnap.forEach(d => {
            const createdAt = d.data().createdAt?.toDate?.();
            if (createdAt && createdAt >= monthStart) aiRxReaderCount++;
          });
        }
      } catch (notifErr) {
        console.warn('📊 Notifications query failed (permissions):', notifErr);
      }

      // Update stats with booking/RX data if queries succeeded
      setStats(prev => ({
        ...prev,
        monthlyBookings,
        digitalRxCount,
        aiRxReaderCount,
      }));

      // Sort doctors by today's bookings for the leaderboard
      doctors.sort((a, b) => b.todayBookings - a.todayBookings || b.totalBookings - a.totalBookings);

    } catch (error) {
      console.error('Error loading pharma dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, subtext }: {
    icon: any; label: string; value: string | number; subtext?: string;
  }) => (
    <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-blue-400 text-xs font-medium">{label}</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{value}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className="bg-blue-50 p-2.5 rounded-lg">
          <Icon className="w-5 h-5 text-blue-500" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-400" />
            {companyName || 'Pharma Portal'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Full-width Encrypted Badge - Orange */}
      <div className="w-full flex items-center justify-center rounded-xl bg-orange-500 text-white font-bold py-3 text-base shadow shadow-orange-200">
        <Lock className="w-5 h-5 mr-2" />
        Data is encrypted
      </div>

      {/* Stat Cards - White + Blue */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Total Distributed"
          value={stats.totalDoctors + stats.totalClinics}
          subtext={`${stats.totalDoctors} dr${stats.totalDoctors !== 1 ? 's' : ''} + ${stats.totalClinics} clinic${stats.totalClinics !== 1 ? 's' : ''}`}
        />
        <StatCard
          icon={Calendar}
          label="Monthly Bookings"
          value={stats.monthlyBookings}
          subtext={`Across ${stats.totalDoctors} dr${stats.totalDoctors !== 1 ? 's' : ''} + ${stats.totalClinics} clinic${stats.totalClinics !== 1 ? 's' : ''}`}
        />
        <StatCard
          icon={MapPin}
          label="Territories"
          value={(() => {
            const tsKeys = Object.keys(territorySpecialtiesMap);
            return tsKeys.length > 0 ? tsKeys.length : territoryStates.length;
          })()}
          subtext={`${(() => {
            const tsKeys = Object.keys(territorySpecialtiesMap);
            if (tsKeys.length > 0) {
              const uniqueSpecs = new Set(Object.values(territorySpecialtiesMap).flat());
              return uniqueSpecs.size;
            }
            return companySpecialties.length;
          })()} specialties covered`}
        />
        <StatCard
          icon={FileText}
          label="Digital Rx"
          value={stats.digitalRxCount}
          subtext={`${stats.aiRxReaderCount} AI Rx Reader used`}
        />
      </div>

      {/* Territory Card - Green (like Patient Health Card) */}
      {territoryStates.length > 0 && (
        <div
          className="rounded-xl p-6 sm:p-8 text-white"
          style={{ background: 'linear-gradient(to bottom right, rgb(16, 185, 129), rgb(5, 150, 105))' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-6 h-6" />
                <h3 className="text-2xl font-bold">Your Territory</h3>
                <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full border border-white/30 ml-2">
                  Locked
                </span>
              </div>
              <p className="text-emerald-50 italic mb-4">&ldquo;Pan India distributorship — Your growth, our mission&rdquo;</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                {registeredState && (
                  <div>
                    <p className="text-emerald-100 text-sm">Registered Office State</p>
                    <p className="font-semibold text-lg">{registeredState}</p>
                  </div>
                )}
                <div>
                  <p className="text-emerald-100 text-sm">Coverage</p>
                  <p className="font-semibold text-lg">
                    {territoryType === 'all_india' ? '🇮🇳 All India' : `${territoryStates.length} States`}
                  </p>
                </div>
                <div>
                  <p className="text-emerald-100 text-sm">Specialties Covered</p>
                  <p className="font-semibold text-lg">
                    {companySpecialties.length}
                  </p>
                </div>
              </div>

              {/* Territory States Pills */}
              {territoryType !== 'all_india' && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {territoryStates.map(state => (
                    <span key={state} className="text-xs bg-white/15 text-emerald-50 px-2.5 py-1 rounded-full border border-white/20">
                      {state}
                    </span>
                  ))}
                </div>
              )}
              {territoryType === 'all_india' && (
                <p className="mt-3 text-sm text-emerald-100">
                  Pan India Coverage — {territoryStates.length} states &amp; union territories
                </p>
              )}
            </div>
            <div className="hidden lg:block ml-6">
              <div className="w-28 h-28 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <MapPin className="w-14 h-14 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Doctors */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Top Doctors Today
            </h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {recentDoctors.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No doctor data yet
              </div>
            ) : (
              recentDoctors.map((doc, idx) => (
                <div key={doc.doctorId} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                      idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-zinc-800 text-gray-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{doc.doctorName}</p>
                      <p className="text-xs text-gray-500">{doc.specialty} • {doc.state}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">{doc.todayBookings}</p>
                    <p className="text-xs text-gray-500">today</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Zone Distribution */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-400" />
              Zone Distribution
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {Object.keys(stats.zoneBreakdown).length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No zone data yet
              </div>
            ) : (
              Object.entries(stats.zoneBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([zone, count]) => {
                  const percentage = stats.totalDoctors > 0 ? (count / stats.totalDoctors) * 100 : 0;
                  return (
                    <div key={zone}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{zone}</span>
                        <span className="text-gray-400">{count} doctors ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <p className="text-sm text-blue-400">
          <strong>Data Privacy:</strong> You can only see doctor names and booking counts.
          Patient information is never shared with distributor companies.
        </p>
      </div>
    </div>
  );
}

