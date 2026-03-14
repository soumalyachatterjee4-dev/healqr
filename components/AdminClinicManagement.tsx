import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Calendar, Building2, TrendingUp, Download, RefreshCw } from 'lucide-react';
import { Badge } from './ui/badge';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase/config';

interface Clinic {
  id: string;
  name: string;
  clinicCode: string;
  email: string;
  pinCode: string;
  qrNumber: string;
  division: string;
  createdAt: any;
}

export default function AdminClinicManagement() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [clinics, setClinics] = useState<Clinic[]>([]);

  // Load clinics from Firestore
  const loadClinics = async () => {
    try {
      setLoading(true);

      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const clinicsRef = collection(db, 'clinics');
      const snapshot = await getDocs(clinicsRef);

      const clinicsData: Clinic[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'N/A',
          clinicCode: data.clinicCode || '-',
          email: data.email || '',
          pinCode: data.pinCode || '',
          qrNumber: data.qrNumber || '-',
          division: data.division || '-',
          createdAt: data.createdAt,
        };
      });

      // Sort clinics by creation date (most recent first)
      clinicsData.sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() || new Date(0);
        const bDate = b.createdAt?.toDate?.() || new Date(0);
        return bDate.getTime() - aDate.getTime();
      });

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
      matchesSearch =
        clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clinic.clinicCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clinic.division.toLowerCase().includes(searchTerm.toLowerCase());
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
  };

  // Export to CSV function
  const exportToCSV = () => {
    const headers = ['Name', 'Clinic Code', 'Email', 'Pincode', 'QR Number', 'Division', 'Sign Up Date'];

    const rows = filteredClinics.map(clinic => [
      clinic.name,
      clinic.clinicCode,
      clinic.email,
      clinic.pinCode,
      clinic.qrNumber,
      clinic.division,
      clinic.createdAt?.toDate ? clinic.createdAt.toDate().toLocaleDateString('en-IN') : '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
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
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-black text-white">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl mb-2">Clinic Management</h1>
            <p className="text-sm md:text-base text-gray-400">View and manage onboarded clinics</p>
          </div>
          <Button
            onClick={loadClinics}
            disabled={loading}
            variant="outline"
            className="border-zinc-700 hover:bg-zinc-800"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/20 border border-blue-700/30 rounded-2xl p-4 md:p-8 mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="bg-blue-600/20 rounded-2xl p-3 md:p-4">
              <Building2 className="w-8 h-8 md:w-12 md:h-12 text-blue-400" />
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm md:text-base text-blue-300 mb-1">Total Onboard Clinics</p>
              <p className="text-4xl md:text-6xl text-blue-400">{stats.totalClinics}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
            <p className="text-sm md:text-base text-blue-300">+{stats.newThisMonth} new this month</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Range Filter */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <h3 className="text-sm">Sign Up Date Range</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setShowAll(false);
                  }}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setShowAll(false);
                  }}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Search Filter */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <h3 className="text-sm">Search Clinics</h3>
              </div>
              <Input
                placeholder="Search by name, code, or division..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl flex items-center gap-2">
                <Building2 className="w-5 h-5 md:w-6 md:h-6 text-blue-500 flex-shrink-0" />
                Clinic Records
              </h2>
              <p className="text-xs md:text-sm text-gray-400">{filteredClinics.length} found</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setShowAll(true)}
                size="sm"
                variant="outline"
                className="border-zinc-700 flex-1 sm:flex-none"
              >
                View All
              </Button>
              <Button
                onClick={exportToCSV}
                disabled={filteredClinics.length === 0}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-gray-400">
                  <th className="text-left py-3 px-4 uppercase tracking-wider font-semibold">Clinic Name</th>
                  <th className="text-left py-3 px-4 uppercase tracking-wider font-semibold">Code</th>
                  <th className="text-left py-3 px-4 uppercase tracking-wider font-semibold">Email</th>
                  <th className="text-left py-3 px-4 uppercase tracking-wider font-semibold">Pincode</th>
                  <th className="text-left py-3 px-4 uppercase tracking-wider font-semibold">QR Number</th>
                  <th className="text-left py-3 px-4 uppercase tracking-wider font-semibold">Division</th>
                  <th className="text-left py-3 px-4 uppercase tracking-wider font-semibold">Sign Up</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
                      <p className="text-gray-400">Loading clinics...</p>
                    </td>
                  </tr>
                ) : filteredClinics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-500">
                      No clinics found
                    </td>
                  </tr>
                ) : (
                  filteredClinics.map(clinic => (
                    <tr key={clinic.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="py-4 px-4 font-medium">{clinic.name}</td>
                      <td className="py-4 px-4 font-mono text-blue-400">{clinic.clinicCode}</td>
                      <td className="py-4 px-4 text-gray-400">{clinic.email}</td>
                      <td className="py-4 px-4 font-mono">{clinic.pinCode}</td>
                      <td className="py-4 px-4 font-mono text-emerald-400">{clinic.qrNumber}</td>
                      <td className="py-4 px-4">
                        <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                          {clinic.division}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-gray-400">
                        {clinic.createdAt?.toDate ? clinic.createdAt.toDate().toLocaleDateString('en-IN') : '-'}
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
  );
}

