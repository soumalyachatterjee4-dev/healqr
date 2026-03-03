import { useState, useEffect } from 'react';
import { Search, MapPin, Users, Calendar, ChevronDown, ChevronUp, Download, Filter } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { getLocationFromPincode } from '../utils/pincodeMapping';

interface PharmaMyDoctorsProps {
  companyId: string;
}

interface DoctorRecord {
  doctorId: string;
  doctorName: string;
  specialty: string;
  pincode: string;
  state: string;
  zone: string;
  todayBookings: number;
  totalBookings: number;
  qrDistributedDate: string;
  isActive: boolean;
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
      const doctorsRef = collection(db, 'pharmaCompanies', companyId, 'distributedDoctors');
      const snap = await getDocs(doctorsRef);

      const allDoctors: DoctorRecord[] = [];
      const stateSet = new Set<string>();
      const zoneSet = new Set<string>();

      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const pincode = data.pincode || '';
        const location = getLocationFromPincode(pincode);

        stateSet.add(location.state);
        zoneSet.add(location.zone);

        allDoctors.push({
          doctorId: docSnap.id,
          doctorName: data.doctorName || 'Unknown',
          specialty: data.specialty || 'General',
          pincode,
          state: location.state,
          zone: location.zone,
          todayBookings: data.todayBookingCount || 0,
          totalBookings: data.totalBookingCount || 0,
          qrDistributedDate: data.distributedAt?.toDate?.()?.toLocaleDateString?.() || data.distributedAt || '-',
          isActive: data.isActive !== false,
        });
      });

      setDoctors(allDoctors);
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
        case 'bookings': cmp = a.totalBookings - b.totalBookings; break;
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
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-300 text-right" onClick={() => toggleSort('bookings')}>
                  Total Bookings <SortIcon field="bookings" />
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
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
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
                      <span className="text-sm font-mono font-bold">{doc.totalBookings}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-mono font-bold ${doc.todayBookings > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {doc.todayBookings}
                      </span>
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
                    <p className="text-lg font-bold">{doc.totalBookings}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${doc.todayBookings > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {doc.todayBookings}
                    </p>
                    <p className="text-xs text-gray-500">Today</p>
                  </div>
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
    </div>
  );
}
