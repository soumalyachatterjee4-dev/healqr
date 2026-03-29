import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Calendar, Building2, TrendingUp, Download, RefreshCw, Users } from 'lucide-react';
import { Badge } from './ui/badge';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { COLLECTIONS } from '../lib/firebase/collections';

interface Clinic {
  id: string;
  name: string;
  clinicCode: string;
  email: string;
  address: string;
  pinCode: string;
  state: string;
  qrNumber: string;
  qrType: string;
  qrSource: string;
  linkedDoctors: number;
  isDemo?: boolean;
  createdAt: any;
  isActive: boolean;
}

export default function AdminClinicManagement() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'clinic-code' | 'pincode' | 'name'>('clinic-code');
  const [loading, setLoading] = useState(true);
  const [clinics, setClinics] = useState<Clinic[]>([]);

  const loadClinics = async () => {
    try {
      setLoading(true);

      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const clinicsRef = collection(db, COLLECTIONS.CLINICS);
      const snapshot = await getDocs(clinicsRef);

      const clinicsData: Clinic[] = [];

      const sortedDocs = snapshot.docs.sort((a, b) => {
        const aDate = a.data().createdAt?.toDate?.() || new Date(0);
        const bDate = b.data().createdAt?.toDate?.() || new Date(0);
        return bDate.getTime() - aDate.getTime();
      });

      for (const doc of sortedDocs) {
        const data = doc.data();
        const qrType = data.qrType || '';
        const qrSource = qrType === 'virtual' ? 'Virtual' : (data.companyName || data.division || 'Pre-printed');
        const linkedDoctors = data.linkedDoctorsDetails?.length || data.linkedDoctorCodes?.length || 0;

        clinicsData.push({
          id: doc.id,
          name: data.clinicName || data.name || 'N/A',
          clinicCode: data.clinicCode || '-',
          email: data.email || '',
          address: data.address || '',
          pinCode: data.pinCode || '',
          state: data.state || '',
          qrNumber: data.qrNumber || '-',
          qrType,
          qrSource,
          linkedDoctors,
          isDemo: data.isDemo === true,
          createdAt: data.createdAt,
          isActive: !data.bookingBlocked,
        });
      }

      setClinics(clinicsData);
    } catch (error) {
      console.error('Error loading clinics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinics();
  }, []);

  // Filter clinics
  const filteredClinics = clinics.filter(clinic => {
    // Show only today's signups by default (if no date filter is set and showAll is false)
    let matchesDateRange = true;
    if (!startDate && !endDate && !showAll) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const signupDate = clinic.createdAt?.toDate?.() || new Date(0);
      signupDate.setHours(0, 0, 0, 0);
      matchesDateRange = signupDate.getTime() === today.getTime();
    } else if (startDate || endDate) {
      const clinicDate = clinic.createdAt?.toDate?.() || new Date(0);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && end) {
        matchesDateRange = clinicDate >= start && clinicDate <= end;
      } else if (start) {
        matchesDateRange = clinicDate >= start;
      } else if (end) {
        matchesDateRange = clinicDate <= end;
      }
    }

    // Search filter
    let matchesSearch = true;
    if (searchTerm) {
      if (searchType === 'clinic-code') {
        matchesSearch = clinic.clinicCode.toLowerCase().includes(searchTerm.toLowerCase());
      } else if (searchType === 'pincode') {
        matchesSearch = clinic.pinCode.includes(searchTerm);
      } else {
        matchesSearch = clinic.name.toLowerCase().includes(searchTerm.toLowerCase());
      }
    }

    return matchesDateRange && matchesSearch;
  });

  // Calculate stats
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats = {
    totalClinics: clinics.length,
    newThisMonth: clinics.filter(c => {
      if (!c.createdAt) return false;
      const createdDate = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
      return createdDate >= firstDayOfMonth;
    }).length,
    activeClinics: clinics.filter(c => c.isActive).length,
    inactiveClinics: clinics.filter(c => !c.isActive).length,
    totalLinkedDoctors: clinics.reduce((sum, c) => sum + c.linkedDoctors, 0),
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
      : 'bg-red-500/10 text-red-500 border-red-500/30';
  };

  // Export to CSV function
  const exportToCSV = () => {
    const headers = ['Name', 'Clinic Code', 'Email', 'Address', 'Pincode', 'State', 'QR No', 'QR Source', 'Linked Doctors', 'Status', 'Sign Up'];
    const rows = filteredClinics.map(clinic => [
      clinic.name,
      clinic.clinicCode,
      clinic.email,
      clinic.address,
      clinic.pinCode,
      clinic.state,
      clinic.qrNumber,
      clinic.qrSource,
      clinic.linkedDoctors,
      clinic.isActive ? 'Active' : 'Inactive',
      clinic.createdAt?.toDate?.() ? clinic.createdAt.toDate().toLocaleDateString('en-IN') : '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clinics_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-black">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl mb-2 text-white">Clinic Management</h1>
            <p className="text-sm md:text-base text-gray-400">View and manage onboarded clinics</p>
          </div>
          <Button
            onClick={loadClinics}
            disabled={loading}
            variant="outline"
            className="border-zinc-700 text-white hover:bg-zinc-800 w-full md:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-r from-teal-900/20 to-teal-800/20 border-2 border-zinc-500 rounded-2xl p-4 md:p-8 mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="bg-teal-600/20 rounded-2xl p-3 md:p-4">
              <Building2 className="w-8 h-8 md:w-12 md:h-12 text-teal-400" />
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm md:text-base text-teal-300 mb-1">Total Onboard Clinics</p>
              <p className="text-4xl md:text-6xl text-teal-400">{stats.totalClinics}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-teal-400" />
            <p className="text-sm md:text-base text-teal-300">+{stats.newThisMonth} new this month</p>
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div className="text-center">
              <p className="text-xs md:text-sm text-teal-300">Active</p>
              <p className="text-2xl md:text-4xl text-white">{stats.activeClinics}</p>
            </div>
            <div className="text-center">
              <p className="text-xs md:text-sm text-teal-300">Inactive</p>
              <p className="text-2xl md:text-4xl text-red-400">{stats.inactiveClinics}</p>
            </div>
            <div className="text-center">
              <p className="text-xs md:text-sm text-teal-300">Linked Doctors</p>
              <p className="text-2xl md:text-4xl text-emerald-400">{stats.totalLinkedDoctors}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6 mb-6">
          <h2 className="text-lg md:text-xl mb-4 text-white">Filters</h2>

          <div className="mb-6 bg-zinc-800 border border-zinc-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-teal-500 flex-shrink-0" />
              <h3 className="text-sm text-white">Sign Up Date Range</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="w-full min-w-0">
                <label className="block text-xs text-gray-400 mb-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setShowAll(false); }}
                  placeholder="dd-mm-yyyy"
                  className="w-full min-w-0 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="w-full min-w-0">
                <label className="block text-xs text-gray-400 mb-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setShowAll(false); }}
                  placeholder="dd-mm-yyyy"
                  className="w-full min-w-0 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="w-full">
                {(startDate || endDate) ? (
                  <Button
                    onClick={() => { setStartDate(''); setEndDate(''); setShowAll(false); }}
                    variant="outline"
                    size="sm"
                    className="w-full border-zinc-700 text-gray-400 hover:bg-zinc-800"
                  >
                    Clear Date Filter
                  </Button>
                ) : (
                  <div className="w-full flex items-center justify-center text-xs text-gray-500 py-2 border border-dashed border-zinc-700 rounded-lg">
                    Select date range
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-5 h-5 text-teal-500 flex-shrink-0" />
              <h3 className="text-sm text-white">Search Options</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="w-full min-w-0">
                <label className="block text-sm text-gray-400 mb-2">Search By</label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="clinic-code">Clinic Code</option>
                  <option value="name">Clinic Name</option>
                  <option value="pincode">Pincode</option>
                </select>
              </div>
              <div className="w-full min-w-0">
                <label className="block text-sm text-gray-400 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder={`Search by ${searchType === 'clinic-code' ? 'Clinic Code' : searchType === 'name' ? 'Name' : 'Pincode'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-zinc-900 border-zinc-700 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg md:text-xl flex items-center gap-2 text-white">
                <Building2 className="w-5 h-5 md:w-6 md:h-6 text-teal-500 flex-shrink-0" />
                Clinic Records
              </h2>
              <p className="text-xs md:text-sm text-gray-400">{filteredClinics.length} found</p>
              {!startDate && !endDate && filteredClinics.length === 0 && (
                <span className="text-xs text-orange-400">(Showing today&apos;s signups only)</span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {filteredClinics.length === 0 && (
                <Button
                  onClick={() => { setStartDate(''); setEndDate(''); setShowAll(true); }}
                  size="sm"
                  variant="outline"
                  className="border-teal-600 text-teal-400 hover:bg-teal-600 hover:text-white w-full sm:w-auto"
                >
                  View All Clinics
                </Button>
              )}
              <Button
                onClick={exportToCSV}
                disabled={filteredClinics.length === 0}
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-3">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-3" />
                <p className="text-gray-400">Loading clinics...</p>
              </div>
            ) : filteredClinics.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No clinics found</p>
              </div>
            ) : (
              filteredClinics.map(clinic => (
                <div key={clinic.id} className="bg-zinc-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="text-white font-medium flex items-center gap-1.5">
                        {clinic.name}
                        {clinic.isDemo && <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block flex-shrink-0" title="Demo Clinic" />}
                      </h3>
                      <p className="text-xs text-teal-400 mt-1 font-mono">Code: {clinic.clinicCode}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Users className="w-3 h-3 text-blue-400" />
                        <span className="text-xs text-blue-400">{clinic.linkedDoctors} linked doctors</span>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(clinic.isActive)} border text-xs`}>
                      {clinic.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">QR No</p>
                      <p className="text-white text-xs font-mono">{clinic.qrNumber}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{clinic.qrSource}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Pincode</p>
                      <p className="text-white text-xs font-mono">{clinic.pinCode}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Email</p>
                      <p className="text-white text-xs break-all">{clinic.email}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Address</p>
                      <p className="text-white text-xs break-all">{clinic.address}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Sign Up</p>
                      <p className="text-white text-xs">
                        {clinic.createdAt?.toDate?.()
                          ? clinic.createdAt.toDate().toLocaleDateString('en-IN')
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto -mx-6">
            <div className="px-6">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Name</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Clinic Code</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Pincode</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Email</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Linked Doctors</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Sign Up</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Status</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">QR No</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12">
                        <RefreshCw className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-3" />
                        <p className="text-gray-400">Loading clinics...</p>
                      </td>
                    </tr>
                  ) : filteredClinics.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12">
                        <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500">No clinics found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredClinics.map(clinic => (
                      <tr key={clinic.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <p className="text-sm text-white font-medium flex items-center gap-1.5">
                              {clinic.name}
                              {clinic.isDemo && <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block flex-shrink-0" title="Demo Clinic" />}
                            </p>
                            <p className="text-xs text-gray-500">{clinic.address}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-teal-400 font-mono whitespace-nowrap">
                          {clinic.clinicCode}
                        </td>
                        <td className="py-4 px-4 text-sm text-white font-mono whitespace-nowrap">
                          {clinic.pinCode || '-'}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-400 whitespace-nowrap">
                          {clinic.email}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-sm text-blue-400">{clinic.linkedDoctors}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-400 whitespace-nowrap">
                          {clinic.createdAt?.toDate?.()
                            ? clinic.createdAt.toDate().toLocaleDateString('en-IN')
                            : '-'}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <Badge className={`${getStatusColor(clinic.isActive)} border`}>
                            {clinic.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm text-cyan-400 font-mono">{clinic.qrNumber}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{clinic.qrSource}</p>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

