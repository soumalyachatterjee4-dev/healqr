import { useState, useEffect } from 'react';
import { Search, MapPin, Users, ChevronDown, ChevronUp, X, BarChart3 } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, getDocs, getDoc, doc, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { getLocationFromPincode } from '../utils/pincodeMapping';

interface PharmaMyDoctorsProps {
  companyId: string;
}

interface ChamberBreakdown {
  chamberName: string;
  qrBookings: number;
  walkinBookings: number;
}

interface MonthlyTrend {
  month: string;
  label: string;
  scans: number;
  bookings: number;
}

interface DoctorRecord {
  doctorId: string;
  doctorName: string;
  specialty: string;
  pincode: string;
  state: string;
  zone: string;
  monthlyBookings: number;
  todayBookings: number;
  monthlyScans: number;
  qrDistributedDate: string;
  isActive: boolean;
  chamberBreakdown: ChamberBreakdown[];
  todayChamberBreakdown: ChamberBreakdown[];
}

export default function PharmaMyDoctors({ companyId }: PharmaMyDoctorsProps) {
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<DoctorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedZone, setSelectedZone] = useState('all');
  const [sortField, setSortField] = useState<'name' | 'bookings' | 'date'>('bookings');
  const [sortAsc, setSortAsc] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [breakdownDoctor, setBreakdownDoctor] = useState<DoctorRecord | null>(null);
  const [breakdownType, setBreakdownType] = useState<'monthly' | 'today'>('monthly');
  const [showTrend, setShowTrend] = useState(false);
  const [trendData, setTrendData] = useState<MonthlyTrend[]>([]);

  useEffect(() => {
    loadDoctors();
  }, [companyId]);

  useEffect(() => {
    filterAndSort();
  }, [doctors, searchQuery, selectedState, selectedZone, sortField, sortAsc]);

  const loadDoctors = async () => {
    if (!companyId || !db) return;
    setLoading(true);

    try {
      const distributedRef = collection(db, 'pharmaCompanies', companyId, 'distributedDoctors');
      const snap = await getDocs(distributedRef);

      const doctorInfoMap = new Map<string, {
        doctorName: string;
        specialty: string;
        pincode: string;
        qrDistributedDate: string;
        isActive: boolean;
      }>();

      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const doctorId = data.doctorId || docSnap.id;
        doctorInfoMap.set(doctorId, {
          doctorName: data.doctorName || 'Unknown',
          specialty: data.specialty || 'General',
          pincode: data.pincode || '',
          qrDistributedDate: data.distributedAt?.toDate?.()?.toLocaleDateString?.() || data.distributedAt || '-',
          isActive: data.isActive !== false,
        });
      });

      const companyDoc = await getDoc(doc(db, 'pharmaCompanies', companyId));
      if (companyDoc.exists()) {
        const companyName = companyDoc.data().companyName;
        if (companyName) {
          // Fetch all doctors and match by trimmed, case-insensitive company name
          const allDocsSnap = await getDocs(collection(db, 'doctors'));
          const lcName = companyName.toLowerCase().trim();
          const matchedDoctorDocs = allDocsSnap.docs.filter(d => {
            const cn = d.data().companyName;
            return cn && cn.toLowerCase().trim() === lcName;
          });

          for (const dDoc of matchedDoctorDocs) {
            if (doctorInfoMap.has(dDoc.id)) continue;
            const dData = dDoc.data();
            doctorInfoMap.set(dDoc.id, {
              doctorName: dData.name || 'Unknown',
              specialty: Array.isArray(dData.specialties) ? dData.specialties.join(', ') : (dData.specialty || 'General'),
              pincode: dData.pinCode || '',
              qrDistributedDate: dData.createdAt?.toDate?.()?.toLocaleDateString?.() || '-',
              isActive: dData.status === 'active',
            });
            try {
              await addDoc(distributedRef, {
                doctorId: dDoc.id,
                doctorName: dData.name || '',
                email: dData.email || '',
                specialty: Array.isArray(dData.specialties) ? dData.specialties.join(', ') : (dData.specialty || ''),
                pincode: dData.pinCode || '',
                division: dData.division || '',
                qrNumber: dData.qrNumber || '',
                isActive: dData.status === 'active',
                distributedAt: dData.createdAt || serverTimestamp(),
              });
            } catch (syncErr) {
              console.error('Auto-sync error:', syncErr);
            }
          }
        }
      }

      const allDoctorIds = Array.from(doctorInfoMap.keys());
      if (allDoctorIds.length === 0) {
        setDoctors([]);
        setLoading(false);
        return;
      }

      // Query actual bookings for all doctors
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const allBookings: any[] = [];
      for (let i = 0; i < allDoctorIds.length; i += 30) {
        const batch = allDoctorIds.slice(i, i + 30);
        const bSnap = await getDocs(query(collection(db, 'bookings'), where('doctorId', 'in', batch)));
        bSnap.forEach(d => allBookings.push(d.data()));
      }

      // Query QR scans for all doctors
      const allScans: any[] = [];
      for (let i = 0; i < allDoctorIds.length; i += 30) {
        const batch = allDoctorIds.slice(i, i + 30);
        const sSnap = await getDocs(query(collection(db, 'qr_scans'), where('doctorId', 'in', batch)));
        sSnap.forEach(d => allScans.push(d.data()));
      }

      // Group bookings by doctor
      const bookingsByDoctor = new Map<string, any[]>();
      allBookings.forEach(b => {
        const did = b.doctorId;
        if (!bookingsByDoctor.has(did)) bookingsByDoctor.set(did, []);
        bookingsByDoctor.get(did)!.push(b);
      });

      // Monthly scans per doctor
      const scansByDoctor = new Map<string, number>();
      allScans.forEach(s => {
        const scannedAt = s.scannedAt?.toDate?.();
        if (scannedAt && scannedAt >= monthStart) {
          scansByDoctor.set(s.doctorId, (scansByDoctor.get(s.doctorId) || 0) + 1);
        }
      });

      // Process each doctor
      const stateSet = new Set<string>();
      const zoneSet = new Set<string>();
      const allDoctorRecords: DoctorRecord[] = [];

      for (const [doctorId, info] of doctorInfoMap) {
        const location = getLocationFromPincode(info.pincode);
        stateSet.add(location.state);
        zoneSet.add(location.zone);

        const doctorBookings = bookingsByDoctor.get(doctorId) || [];
        const monthBookings = doctorBookings.filter(b => {
          if (b.status === 'cancelled') return false;
          const createdAt = b.createdAt?.toDate?.();
          return createdAt && createdAt >= monthStart;
        });
        const todayBookings = monthBookings.filter(b => (b.appointmentDate || b.bookingDate) === todayStr);

        const chamberMap = new Map<string, ChamberBreakdown>();
        monthBookings.forEach(b => {
          const ch = b.chamberName || b.chamber || 'Walk-in';
          if (!chamberMap.has(ch)) chamberMap.set(ch, { chamberName: ch, qrBookings: 0, walkinBookings: 0 });
          if (b.type === 'walkin_booking') chamberMap.get(ch)!.walkinBookings++;
          else chamberMap.get(ch)!.qrBookings++;
        });

        const todayChamberMap = new Map<string, ChamberBreakdown>();
        todayBookings.forEach(b => {
          const ch = b.chamberName || b.chamber || 'Walk-in';
          if (!todayChamberMap.has(ch)) todayChamberMap.set(ch, { chamberName: ch, qrBookings: 0, walkinBookings: 0 });
          if (b.type === 'walkin_booking') todayChamberMap.get(ch)!.walkinBookings++;
          else todayChamberMap.get(ch)!.qrBookings++;
        });

        allDoctorRecords.push({
          doctorId,
          doctorName: info.doctorName,
          specialty: info.specialty,
          pincode: info.pincode,
          state: location.state,
          zone: location.zone,
          monthlyBookings: monthBookings.length,
          todayBookings: todayBookings.length,
          monthlyScans: scansByDoctor.get(doctorId) || 0,
          qrDistributedDate: info.qrDistributedDate,
          isActive: info.isActive,
          chamberBreakdown: Array.from(chamberMap.values()),
          todayChamberBreakdown: Array.from(todayChamberMap.values()),
        });
      }

      // Build trend data
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const scanTrend = new Map<string, number>();
      allScans.forEach(s => {
        const at = s.scannedAt?.toDate?.();
        if (!at) return;
        const key = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}`;
        scanTrend.set(key, (scanTrend.get(key) || 0) + 1);
      });
      const bookingTrend = new Map<string, number>();
      allBookings.forEach(b => {
        if (b.status === 'cancelled') return;
        const at = b.createdAt?.toDate?.();
        if (!at) return;
        const key = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}`;
        bookingTrend.set(key, (bookingTrend.get(key) || 0) + 1);
      });
      const allKeys = new Set([...scanTrend.keys(), ...bookingTrend.keys()]);
      setTrendData(
        Array.from(allKeys).sort().map(key => {
          const [y, m] = key.split('-');
          return {
            month: key,
            label: `${monthNames[parseInt(m) - 1]} ${y}`,
            scans: scanTrend.get(key) || 0,
            bookings: bookingTrend.get(key) || 0,
          };
        })
      );

      setDoctors(allDoctorRecords);
      setStates(Array.from(stateSet).sort());
      setZones(Array.from(zoneSet).sort());
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSort = () => {
    let result = [...doctors];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.doctorName.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        d.pincode.includes(q) ||
        d.state.toLowerCase().includes(q)
      );
    }

    // Filter by state
    if (selectedState !== 'all') {
      result = result.filter(d => d.state === selectedState);
    }
    // Filter by zone
    if (selectedZone !== 'all') {
      result = result.filter(d => d.zone === selectedZone);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.doctorName.localeCompare(b.doctorName); break;
        case 'bookings': cmp = a.monthlyBookings - b.monthlyBookings; break;
        case 'date': cmp = a.qrDistributedDate.localeCompare(b.qrDistributedDate); break;
      }
      return sortAsc ? cmp : -cmp;
    });

    setFilteredDoctors(result);
  };

  const toggleSort = (field: 'name' | 'bookings' | 'date') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            My Doctors
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {doctors.length} doctors distributed • {filteredDoctors.length} shown
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, specialty, pincode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Zone Filter */}
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Zones</option>
            {zones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>

          {/* State Filter */}
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All States</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Doctor Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-300" onClick={() => toggleSort('name')}>
                  Doctor <SortIcon field="name" />
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500">Specialty</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500">Location</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 text-right">Scans</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-300 text-right" onClick={() => toggleSort('bookings')}>
                  Monthly Bookings <SortIcon field="bookings" />
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 text-right">Today</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-300" onClick={() => toggleSort('date')}>
                  Distributed <SortIcon field="date" />
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery || selectedState !== 'all' || selectedZone !== 'all'
                      ? 'No doctors match the current filters'
                      : 'No distributed doctors yet'}
                  </td>
                </tr>
              ) : (
                filteredDoctors.map(doc => (
                  <tr key={doc.doctorId} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{doc.doctorName}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{doc.specialty}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{doc.state}</p>
                      <p className="text-xs text-gray-500">{doc.pincode} • {doc.zone}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono font-bold text-blue-400">{doc.monthlyScans}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setBreakdownDoctor(doc); setBreakdownType('monthly'); }} className="text-sm font-mono font-bold hover:text-blue-400 underline decoration-dotted cursor-pointer">
                        {doc.monthlyBookings}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setBreakdownDoctor(doc); setBreakdownType('today'); }} className={`text-sm font-mono font-bold underline decoration-dotted cursor-pointer hover:text-blue-400 ${doc.todayBookings > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {doc.todayBookings}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{doc.qrDistributedDate}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        doc.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {doc.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-zinc-800">
          {filteredDoctors.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {searchQuery || selectedState !== 'all' || selectedZone !== 'all'
                ? 'No doctors match the current filters'
                : 'No distributed doctors yet'}
            </div>
          ) : (
            filteredDoctors.map(doc => (
              <div key={doc.doctorId} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{doc.doctorName}</p>
                    <p className="text-xs text-gray-500">{doc.specialty}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    doc.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {doc.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {doc.state} • {doc.pincode}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-400">{doc.monthlyScans}</p>
                    <p className="text-xs text-gray-500">Scans</p>
                  </div>
                  <button className="text-center" onClick={() => { setBreakdownDoctor(doc); setBreakdownType('monthly'); }}>
                    <p className="text-lg font-bold underline decoration-dotted">{doc.monthlyBookings}</p>
                    <p className="text-xs text-gray-500">Monthly</p>
                  </button>
                  <button className="text-center" onClick={() => { setBreakdownDoctor(doc); setBreakdownType('today'); }}>
                    <p className={`text-lg font-bold underline decoration-dotted ${doc.todayBookings > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {doc.todayBookings}
                    </p>
                    <p className="text-xs text-gray-500">Today</p>
                  </button>
                  <div className="ml-auto text-right">
                    <p className="text-xs text-gray-500">Distributed: {doc.qrDistributedDate}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <p className="text-sm text-blue-400">
          <strong>Note:</strong> Only doctor names and booking counts are visible. Patient data is never accessible to pharma companies.
        </p>
      </div>

      {/* Scan vs Booking Trend Report */}
      {trendData.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Company Scan vs Booking — Monthly Trend
            </h3>
            <button onClick={() => setShowTrend(!showTrend)} className="text-xs text-blue-400 hover:text-blue-300">
              {showTrend ? 'Hide' : 'Show'}
            </button>
          </div>
          {showTrend && (
            <div className="space-y-2">
              {/* Bar chart header */}
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Scans</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Bookings</span>
              </div>
              {trendData.map(t => {
                const maxVal = Math.max(...trendData.map(d => Math.max(d.scans, d.bookings)), 1);
                return (
                  <div key={t.month} className="space-y-1">
                    <p className="text-xs text-gray-400">{t.label}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-5 bg-zinc-800 rounded overflow-hidden relative">
                        <div className="absolute inset-y-0 left-0 bg-blue-500/60 rounded" style={{ width: `${(t.scans / maxVal) * 100}%` }} />
                        <span className="absolute inset-y-0 left-2 flex items-center text-xs text-white font-mono">{t.scans}</span>
                      </div>
                      <div className="flex-1 h-5 bg-zinc-800 rounded overflow-hidden relative">
                        <div className="absolute inset-y-0 left-0 bg-emerald-500/60 rounded" style={{ width: `${(t.bookings / maxVal) * 100}%` }} />
                        <span className="absolute inset-y-0 left-2 flex items-center text-xs text-white font-mono">{t.bookings}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Chamber Breakdown Modal */}
      {breakdownDoctor && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setBreakdownDoctor(null)}>
          <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                {breakdownDoctor.doctorName} — {breakdownType === 'today' ? "Today's" : 'Monthly'} Breakdown
              </h3>
              <button onClick={() => setBreakdownDoctor(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {(() => {
              const data = breakdownType === 'today' ? breakdownDoctor.todayChamberBreakdown : breakdownDoctor.chamberBreakdown;
              if (data.length === 0) {
                return <p className="text-gray-500 text-sm text-center py-4">No bookings for this period</p>;
              }
              return (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700 text-left">
                      <th className="pb-2 text-xs text-gray-500 uppercase">Chamber</th>
                      <th className="pb-2 text-xs text-gray-500 uppercase text-right">QR Scan</th>
                      <th className="pb-2 text-xs text-gray-500 uppercase text-right">Walk-in</th>
                      <th className="pb-2 text-xs text-gray-500 uppercase text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {data.map(ch => (
                      <tr key={ch.chamberName}>
                        <td className="py-2">{ch.chamberName}</td>
                        <td className="py-2 text-right text-blue-400 font-mono">{ch.qrBookings}</td>
                        <td className="py-2 text-right text-amber-400 font-mono">{ch.walkinBookings}</td>
                        <td className="py-2 text-right font-bold font-mono">{ch.qrBookings + ch.walkinBookings}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-zinc-600 font-bold">
                      <td className="py-2">Total</td>
                      <td className="py-2 text-right text-blue-400 font-mono">{data.reduce((s, c) => s + c.qrBookings, 0)}</td>
                      <td className="py-2 text-right text-amber-400 font-mono">{data.reduce((s, c) => s + c.walkinBookings, 0)}</td>
                      <td className="py-2 text-right font-mono">{data.reduce((s, c) => s + c.qrBookings + c.walkinBookings, 0)}</td>
                    </tr>
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
