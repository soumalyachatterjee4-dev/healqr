import { useState, useEffect } from 'react';
import { Search, MapPin, Hospital, ChevronDown, ChevronUp, BookOpen, Package } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, getDocs, getDoc, doc, query, where, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getLocationFromPincode } from '../utils/pincodeMapping';

interface PharmaMyClinicsProps {
  companyId: string;
}

interface ClinicRecord {
  clinicId: string;
  clinicName: string;
  pincode: string;
  state: string;
  zone: string;
  monthlyBookings: number;
  todayBookings: number;
  monthlyScans: number;
  qrDistributedDate: string;
  isActive: boolean;
  cmeEnabled: boolean;
  samplesEnabled: boolean;
  doctorCount: number;
}

export default function PharmaMyClinics({ companyId }: PharmaMyClinicsProps) {
  const [clinics, setClinics] = useState<ClinicRecord[]>([]);
  const [filteredClinics, setFilteredClinics] = useState<ClinicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedZone, setSelectedZone] = useState('all');
  const [sortField, setSortField] = useState<'name' | 'bookings' | 'date'>('bookings');
  const [sortAsc, setSortAsc] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [zones, setZones] = useState<string[]>([]);

  useEffect(() => {
    loadClinics();
  }, [companyId]);

  useEffect(() => {
    filterAndSort();
  }, [clinics, searchQuery, selectedState, selectedZone, sortField, sortAsc]);

  const loadClinics = async () => {
    if (!companyId || !db) return;
    setLoading(true);

    try {
      // 1. Load from distributedClinics subcollection
      const distributedRef = collection(db, 'pharmaCompanies', companyId, 'distributedClinics');
      const snap = await getDocs(distributedRef);

      const clinicInfoMap = new Map<string, {
        clinicName: string;
        pincode: string;
        qrDistributedDate: string;
        isActive: boolean;
        cmeEnabled: boolean;
        samplesEnabled: boolean;
      }>();

      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const clinicId = data.clinicId || docSnap.id;
        clinicInfoMap.set(clinicId, {
          clinicName: data.clinicName || 'Unknown',
          pincode: data.pincode || '',
          qrDistributedDate: data.distributedAt?.toDate?.()?.toLocaleDateString?.() || data.distributedAt || '-',
          isActive: data.isActive !== false,
          cmeEnabled: data.cmeEnabled === true,
          samplesEnabled: data.samplesEnabled === true,
        });
      });

      // 2. Also query clinics collection by companyName (fallback)
      const companyDoc = await getDoc(doc(db, 'pharmaCompanies', companyId));
      if (companyDoc.exists()) {
        const companyName = companyDoc.data().companyName;
        if (companyName) {
          // Fetch all clinics and match by trimmed, case-insensitive company name
          const allClinicsSnap = await getDocs(collection(db, 'clinics'));
          const lcName = companyName.toLowerCase().trim();
          const matchedClinicDocs = allClinicsSnap.docs.filter(d => {
            const cn = d.data().companyName;
            return cn && cn.toLowerCase().trim() === lcName;
          });

          for (const cDoc of matchedClinicDocs) {
            if (clinicInfoMap.has(cDoc.id)) continue;
            const cData = cDoc.data();
            clinicInfoMap.set(cDoc.id, {
              clinicName: cData.name || 'Unknown',
              pincode: cData.pinCode || '',
              qrDistributedDate: cData.createdAt?.toDate?.()?.toLocaleDateString?.() || '-',
              isActive: true,
            });
            // Auto-sync missing clinic to subcollection
            try {
              await addDoc(distributedRef, {
                clinicId: cDoc.id,
                clinicName: cData.name || '',
                email: cData.email || '',
                pincode: cData.pinCode || '',
                division: cData.division || '',
                qrNumber: cData.qrNumber || '',
                isActive: true,
                distributedAt: cData.createdAt || serverTimestamp(),
              });
            } catch (syncErr) {
              console.error('Auto-sync clinic error:', syncErr);
            }
          }
        }
      }

      const allClinicIds = Array.from(clinicInfoMap.keys());
      if (allClinicIds.length === 0) {
        setClinics([]);
        setLoading(false);
        return;
      }

      // Query bookings for these clinics
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const allBookings: any[] = [];
      for (let i = 0; i < allClinicIds.length; i += 30) {
        const batch = allClinicIds.slice(i, i + 30);
        const bSnap = await getDocs(query(collection(db, 'bookings'), where('clinicId', 'in', batch)));
        bSnap.forEach(d => allBookings.push(d.data()));
      }

      // Query clinic QR scans
      const allScans: any[] = [];
      try {
        for (let i = 0; i < allClinicIds.length; i += 30) {
          const batch = allClinicIds.slice(i, i + 30);
          const sSnap = await getDocs(query(collection(db, 'clinic_qr_scans'), where('clinicId', 'in', batch)));
          sSnap.forEach(d => allScans.push(d.data()));
        }
      } catch (scanErr) {
        console.warn('[MyClinics] clinic_qr_scans query failed:', scanErr);
      }

      // Group bookings by clinic
      const bookingsByClinic = new Map<string, any[]>();
      allBookings.forEach(b => {
        const cid = b.clinicId;
        if (!cid) return;
        if (!bookingsByClinic.has(cid)) bookingsByClinic.set(cid, []);
        bookingsByClinic.get(cid)!.push(b);
      });

      // Monthly scans per clinic
      const scansByClinic = new Map<string, number>();
      allScans.forEach(s => {
        const scannedAt = s.scannedAt?.toDate?.();
        if (scannedAt && scannedAt >= monthStart) {
          scansByClinic.set(s.clinicId, (scansByClinic.get(s.clinicId) || 0) + 1);
        }
      });

      const stateSet = new Set<string>();
      const zoneSet = new Set<string>();
      const allClinicRecords: ClinicRecord[] = [];

      for (const [clinicId, info] of clinicInfoMap) {
        const location = getLocationFromPincode(info.pincode);
        stateSet.add(location.state);
        zoneSet.add(location.zone);

        const clinicBookings = bookingsByClinic.get(clinicId) || [];
        const monthBookings = clinicBookings.filter(b => {
          if (b.status === 'cancelled') return false;
          const createdAt = b.createdAt?.toDate?.();
          return createdAt && createdAt >= monthStart;
        });
        const todayBookings = monthBookings.filter(b => (b.appointmentDate || b.bookingDate) === todayStr);

        // Count unique doctors linked to this clinic
        const doctorIds = new Set(clinicBookings.map(b => b.doctorId).filter(Boolean));

        allClinicRecords.push({
          clinicId,
          clinicName: info.clinicName,
          pincode: info.pincode,
          state: location.state,
          zone: location.zone,
          monthlyBookings: monthBookings.length,
          todayBookings: todayBookings.length,
          monthlyScans: scansByClinic.get(clinicId) || 0,
          qrDistributedDate: info.qrDistributedDate,
          isActive: info.isActive,
          cmeEnabled: info.cmeEnabled,
          samplesEnabled: info.samplesEnabled,
          doctorCount: doctorIds.size,
        });
      }

      setClinics(allClinicRecords);
      setStates(Array.from(stateSet).sort());
      setZones(Array.from(zoneSet).sort());
    } catch (error) {
      console.error('Error loading clinics:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSort = () => {
    let result = [...clinics];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.clinicName.toLowerCase().includes(q) ||
        c.pincode.includes(q) ||
        c.state.toLowerCase().includes(q)
      );
    }

    if (selectedState !== 'all') {
      result = result.filter(c => c.state === selectedState);
    }
    if (selectedZone !== 'all') {
      result = result.filter(c => c.zone === selectedZone);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.clinicName.localeCompare(b.clinicName); break;
        case 'bookings': cmp = a.monthlyBookings - b.monthlyBookings; break;
        case 'date': cmp = a.qrDistributedDate.localeCompare(b.qrDistributedDate); break;
      }
      return sortAsc ? cmp : -cmp;
    });

    setFilteredClinics(result);
  };

  const toggleSort = (field: 'name' | 'bookings' | 'date') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const toggleAccess = async (clinicId: string, field: 'cmeEnabled' | 'samplesEnabled') => {
    try {
      const distRef = collection(db, 'pharmaCompanies', companyId, 'distributedClinics');
      const snap = await getDocs(query(distRef, where('clinicId', '==', clinicId)));
      if (!snap.empty) {
        const currentVal = snap.docs[0].data()[field] === true;
        await updateDoc(snap.docs[0].ref, { [field]: !currentVal });
        setClinics(prev => prev.map(c =>
          c.clinicId === clinicId ? { ...c, [field]: !currentVal } : c
        ));
      }
    } catch (err) {
      console.error('Toggle access error:', err);
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
            <Hospital className="w-5 h-5 text-emerald-400" />
            My Clinics
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {clinics.length} clinics distributed • {filteredClinics.length} shown
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, pincode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Zones</option>
            {zones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
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

      {/* Clinic Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-300" onClick={() => toggleSort('name')}>
                  Clinic <SortIcon field="name" />
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500">Location</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 text-right">Doctors</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 text-right">Scans</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-300 text-right" onClick={() => toggleSort('bookings')}>
                  Monthly Bookings <SortIcon field="bookings" />
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 text-right">Today</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-300" onClick={() => toggleSort('date')}>
                  Distributed <SortIcon field="date" />
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 text-center">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredClinics.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery || selectedState !== 'all' || selectedZone !== 'all'
                      ? 'No clinics match the current filters'
                      : 'No distributed clinics yet'}
                  </td>
                </tr>
              ) : (
                filteredClinics.map(c => (
                  <tr key={c.clinicId} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{c.clinicName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{c.state}</p>
                      <p className="text-xs text-gray-500">{c.pincode} • {c.zone}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono font-bold text-purple-400">{c.doctorCount}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono font-bold text-blue-400">{c.monthlyScans}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono font-bold">{c.monthlyBookings}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-mono font-bold ${c.todayBookings > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {c.todayBookings}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{c.qrDistributedDate}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        c.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-center">
                        <button
                          onClick={() => toggleAccess(c.clinicId, 'cmeEnabled')}
                          title={c.cmeEnabled ? 'CME Enabled — click to disable' : 'CME Disabled — click to enable'}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition ${
                            c.cmeEnabled
                              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                              : 'bg-zinc-800 text-gray-500 hover:bg-zinc-700'
                          }`}
                        >
                          <BookOpen className="w-3 h-3" />
                          CME
                        </button>
                        <button
                          onClick={() => toggleAccess(c.clinicId, 'samplesEnabled')}
                          title={c.samplesEnabled ? 'Samples Enabled — click to disable' : 'Samples Disabled — click to enable'}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition ${
                            c.samplesEnabled
                              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                              : 'bg-zinc-800 text-gray-500 hover:bg-zinc-700'
                          }`}
                        >
                          <Package className="w-3 h-3" />
                          Samples
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-zinc-800">
          {filteredClinics.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {searchQuery || selectedState !== 'all' || selectedZone !== 'all'
                ? 'No clinics match the current filters'
                : 'No distributed clinics yet'}
            </div>
          ) : (
            filteredClinics.map(c => (
              <div key={c.clinicId} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{c.clinicName}</p>
                    <p className="text-xs text-gray-500">{c.doctorCount} doctors linked</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    c.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {c.state} • {c.pincode}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-400">{c.monthlyScans}</p>
                    <p className="text-xs text-gray-500">Scans</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{c.monthlyBookings}</p>
                    <p className="text-xs text-gray-500">Monthly</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${c.todayBookings > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {c.todayBookings}
                    </p>
                    <p className="text-xs text-gray-500">Today</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs text-gray-500">Distributed: {c.qrDistributedDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800">
                  <span className="text-xs text-gray-500">Access:</span>
                  <button
                    onClick={() => toggleAccess(c.clinicId, 'cmeEnabled')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition ${
                      c.cmeEnabled
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-800 text-gray-500'
                    }`}
                  >
                    <BookOpen className="w-3 h-3" /> CME
                  </button>
                  <button
                    onClick={() => toggleAccess(c.clinicId, 'samplesEnabled')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition ${
                      c.samplesEnabled
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-800 text-gray-500'
                    }`}
                  >
                    <Package className="w-3 h-3" /> Samples
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <p className="text-sm text-blue-400">
          <strong>Note:</strong> Only clinic names and booking counts are visible. Patient data is never accessible to pharma companies.
        </p>
      </div>
    </div>
  );
}

