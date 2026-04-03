import { useState, useEffect, useMemo } from 'react';
import { UserCheck, Clock, Activity, AlertTriangle, Search, Filter, CheckCircle, XCircle } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { getLocationFromPincode } from '../utils/pincodeMapping';

interface PharmaOnboardingTrackerProps {
  companyId: string;
}

interface DoctorOnboarding {
  id: string;
  doctorName: string;
  specialty: string;
  pincode: string;
  state: string;
  zone: string;
  qrDistributedDate?: Date;
  firstBookingDate?: Date;
  lastBookingDate?: Date;
  totalBookings: number;
  daysSinceQR: number;
  daysSinceLastActivity: number | null;
  status: 'active' | 'first-booked' | 'qr-only' | 'dormant';
}

export default function PharmaOnboardingTracker({ companyId }: PharmaOnboardingTrackerProps) {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<DoctorOnboarding[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'daysSinceQR' | 'daysDormant' | 'bookings'>('daysSinceQR');

  useEffect(() => {
    loadDoctors();
  }, [companyId]);

  const loadDoctors = async () => {
    if (!companyId || !db) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'pharmaCompanies', companyId, 'distributedDoctors'));
      const now = new Date();
      const list: DoctorOnboarding[] = snap.docs.map(d => {
        const data = d.data();
        const pincode = data.pincode || '';
        const location = getLocationFromPincode(pincode);
        const qrDate = data.qrDistributedDate?.toDate?.() || data.createdAt?.toDate?.() || null;
        const firstBooking = data.firstBookingDate?.toDate?.() || null;
        const lastBooking = data.lastBookingDate?.toDate?.() || null;
        const totalBookings = data.totalBookingCount || 0;
        const daysSinceQR = qrDate ? Math.floor((now.getTime() - qrDate.getTime()) / 86400000) : 0;
        const daysSinceLastActivity = lastBooking ? Math.floor((now.getTime() - lastBooking.getTime()) / 86400000) : null;

        let status: DoctorOnboarding['status'] = 'qr-only';
        if (totalBookings > 0 && daysSinceLastActivity !== null) {
          if (daysSinceLastActivity <= 30) status = 'active';
          else status = 'dormant';
        } else if (firstBooking) {
          status = 'first-booked';
        }

        return {
          id: d.id,
          doctorName: data.doctorName || 'Unknown',
          specialty: data.specialty || 'General',
          pincode,
          state: location.state,
          zone: location.zone,
          qrDistributedDate: qrDate || undefined,
          firstBookingDate: firstBooking || undefined,
          lastBookingDate: lastBooking || undefined,
          totalBookings,
          daysSinceQR,
          daysSinceLastActivity,
          status,
        };
      });
      setDoctors(list);
    } catch (err) {
      console.error('Error loading onboarding data:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    'active': { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle },
    'first-booked': { label: 'First Booked', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Activity },
    'qr-only': { label: 'QR Only', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Clock },
    'dormant': { label: 'Dormant', color: 'text-red-400', bg: 'bg-red-500/10', icon: XCircle },
  };

  const filtered = useMemo(() => {
    let list = doctors;
    if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d => d.doctorName.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q) || d.state.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') return a.doctorName.localeCompare(b.doctorName);
      if (sortBy === 'daysSinceQR') return b.daysSinceQR - a.daysSinceQR;
      if (sortBy === 'daysDormant') return (b.daysSinceLastActivity ?? 9999) - (a.daysSinceLastActivity ?? 9999);
      return b.totalBookings - a.totalBookings;
    });
    return list;
  }, [doctors, statusFilter, search, sortBy]);

  const counts = useMemo(() => {
    const c = { active: 0, 'first-booked': 0, 'qr-only': 0, dormant: 0, total: doctors.length };
    doctors.forEach(d => { c[d.status]++; });
    return c;
  }, [doctors]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-blue-400" />
          Doctor Onboarding Tracker
        </h2>
        <p className="text-sm text-gray-400 mt-1">Track QR activation, first booking, and engagement lifecycle</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
          <p className="text-2xl font-bold text-white">{counts.total}</p>
          <p className="text-xs text-gray-500 mt-1">Total</p>
        </div>
        {Object.entries(statusConfig).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
              className={`rounded-xl p-4 border text-center transition-colors ${
                statusFilter === key ? `${config.bg} border-current ${config.color}` : 'bg-zinc-900 border-zinc-800'
              }`}
            >
              <Icon className={`w-4 h-4 mx-auto mb-1 ${config.color}`} />
              <p className="text-2xl font-bold text-white">{counts[key as keyof typeof counts]}</p>
              <p className={`text-xs mt-1 ${config.color}`}>{config.label}</p>
            </button>
          );
        })}
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search doctor, specialty, state..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white"
        >
          <option value="daysSinceQR">Sort: QR Age (oldest first)</option>
          <option value="daysDormant">Sort: Most Dormant</option>
          <option value="bookings">Sort: Most Bookings</option>
          <option value="name">Sort: Name A-Z</option>
        </select>
      </div>

      {/* Doctor List */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-semibold text-sm">
            {filtered.length} doctor{filtered.length !== 1 ? 's' : ''}
            {statusFilter !== 'all' && <span className="text-gray-500 font-normal"> — filtered by {statusConfig[statusFilter]?.label}</span>}
          </h3>
        </div>
        <div className="divide-y divide-zinc-800 max-h-[600px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No doctors match your filters</div>
          ) : (
            filtered.map(dr => {
              const sc = statusConfig[dr.status];
              const Icon = sc.icon;
              return (
                <div key={dr.id} className="px-4 py-3 flex items-center gap-4 hover:bg-zinc-800/50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${sc.bg}`}>
                    <Icon className={`w-4 h-4 ${sc.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{dr.doctorName}</p>
                    <p className="text-xs text-gray-500">{dr.specialty} • {dr.state} • {dr.zone}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400 shrink-0">
                    <div className="text-center w-16">
                      <p className="font-mono font-bold text-white">{dr.daysSinceQR}d</p>
                      <p className="text-gray-600">QR age</p>
                    </div>
                    <div className="text-center w-16">
                      <p className="font-mono font-bold text-white">{dr.totalBookings}</p>
                      <p className="text-gray-600">bookings</p>
                    </div>
                    <div className="text-center w-16">
                      <p className={`font-mono font-bold ${
                        dr.daysSinceLastActivity === null ? 'text-gray-600' :
                        dr.daysSinceLastActivity <= 7 ? 'text-emerald-400' :
                        dr.daysSinceLastActivity <= 30 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {dr.daysSinceLastActivity !== null ? `${dr.daysSinceLastActivity}d` : '—'}
                      </p>
                      <p className="text-gray-600">last active</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${sc.bg} ${sc.color}`}>
                    {sc.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Tips */}
      {counts['qr-only'] > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <p className="text-sm text-amber-400">
            <strong>{counts['qr-only']} doctor{counts['qr-only'] !== 1 ? 's have' : ' has'} QR distributed but no bookings yet.</strong> Follow up with your field team to ensure QR activation and first patient booking.
          </p>
        </div>
      )}
    </div>
  );
}
