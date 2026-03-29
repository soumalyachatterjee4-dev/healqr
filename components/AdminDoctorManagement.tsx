import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Calendar, Users, TrendingUp, Award, Download, RefreshCw, QrCode } from 'lucide-react';
import { Badge } from './ui/badge';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { COLLECTIONS } from '../lib/firebase/collections';

interface Doctor {
  id: string;
  name: string;
  doctorCode: string;
  dob: string;
  residentialPincode: string;
  email: string;
  baCode: string;
  qrStatus: 'Active' | 'Deactive';
  qrNumber: string;
  qrSource: string; // company name or 'Virtual'
  qrBookings: number;
  walkinBookings: number;
  totalBookings: number;
  totalScans: number;
  dropOuts?: number;
  cancelledCount?: number;
  isDemo?: boolean;
  createdAt: any;
}

export default function AdminDoctorManagement() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'doctor-code' | 'ba-code' | 'pincode'>('doctor-code');
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Load doctors from Firestore
  const loadDoctors = async () => {
    try {
      setLoading(true);
      
      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const doctorsRef = collection(db, COLLECTIONS.DOCTORS);
      const snapshot = await getDocs(doctorsRef);

      const doctorsData: Doctor[] = [];

      // Sort doctors by creation date (most recent first), handle missing createdAt
      const sortedDocs = snapshot.docs.sort((a, b) => {
        const aDate = a.data().createdAt?.toDate?.() || new Date(0);
        const bDate = b.data().createdAt?.toDate?.() || new Date(0);
        return bDate.getTime() - aDate.getTime();
      });

      for (const doc of sortedDocs) {
        const data = doc.data();
        
        // Get booking counts for this doctor using their Firebase Auth UID (doc.id)
        const bookingsRef = collection(db, COLLECTIONS.BOOKINGS);
        const bookingsQuery = query(bookingsRef, where('doctorId', '==', doc.id));
        const bookingsSnapshot = await getDocs(bookingsQuery);

        let qrBookings = 0;
        let walkinBookings = 0;
        let totalScans = 0;
        let dropOuts = 0;
        let cancelledCount = 0;

        bookingsSnapshot.docs.forEach((bookingDoc) => {
          const bookingData = bookingDoc.data();
          const bookingType = bookingData.type || bookingData.bookingType || 'qr';
          
          // Count QR bookings (total scans)
          if (bookingType !== 'walkin_booking') {
            totalScans++;
            
            // Count active QR bookings (not cancelled)
            if (bookingData.status !== 'cancelled' && !bookingData.isCancelled) {
              qrBookings++;
            }
          }
          
          // Count walk-in bookings
          if (bookingType === 'walkin_booking') {
            if (bookingData.status !== 'cancelled' && !bookingData.isCancelled) {
              walkinBookings++;
            }
          }
          
          // Count drop-outs (past appointments not marked as seen)
          const appointmentDate = bookingData.appointmentDate || (bookingData.date?.toDate?.() ? bookingData.date.toDate().toISOString().split('T')[0] : null);
          const today = new Date().toISOString().split('T')[0];
          
          if (appointmentDate && appointmentDate < today) {
            if (bookingData.status !== 'cancelled' && !bookingData.isCancelled && !bookingData.isMarkedSeen) {
              dropOuts++;
            }
          }
          
          // Count cancelled bookings
          if (bookingData.status === 'cancelled' || bookingData.isCancelled === true) {
            cancelledCount++;
          }
        });

        // Determine QR status - based on bookingBlocked field
        const qrStatus = data.bookingBlocked === true ? 'Deactive' : 'Active';

        // Determine QR source - company name or Virtual
        const qrType = data.qrType || '';
        const qrSource = qrType === 'virtual' ? 'Virtual' : (data.companyName || data.division || 'Pre-printed');

        const doctor: Doctor = {
          id: doc.id,
          name: data.name || 'N/A',
          doctorCode: data.doctorCode || '-',
          dob: data.dob || data.dateOfBirth || '',
          residentialPincode: data.residentialPincode || data.pincode || data.pinCode || '',
          email: data.email || '',
          baCode: data.baCode || data.businessAnalystCode || '-',
          qrStatus,
          qrNumber: data.qrNumber || '-',
          qrSource,
          qrBookings,
          walkinBookings,
          totalBookings: qrBookings + walkinBookings,
          totalScans,
          dropOuts,
          cancelledCount,
          isDemo: data.isDemo === true,
          createdAt: data.createdAt,
        };

        doctorsData.push(doctor);
      }

      setDoctors(doctorsData);
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  // Filter doctors
  const filteredDoctors = doctors.filter(doctor => {
    // Show only today's signups by default (if no date filter is set and showAll is false)
    let matchesDateRange = true;
    if (!startDate && !endDate && !showAll) {
      // Default: Show only today's signups
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const signupDate = doctor.createdAt?.toDate?.() || new Date(0);
      signupDate.setHours(0, 0, 0, 0);
      matchesDateRange = signupDate.getTime() === today.getTime();
    } else if (startDate || endDate) {
      // Use date filter if provided
      const doctorDate = new Date(doctor.dob);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (start && end) {
        matchesDateRange = doctorDate >= start && doctorDate <= end;
      } else if (start) {
        matchesDateRange = doctorDate >= start;
      } else if (end) {
        matchesDateRange = doctorDate <= end;
      }
    }
    // If showAll is true and no date filters, show all doctors (matchesDateRange stays true)

    // Search filter
    let matchesSearch = true;
    if (searchTerm) {
      if (searchType === 'doctor-code') {
        matchesSearch = doctor.doctorCode.toLowerCase().includes(searchTerm.toLowerCase());
      } else if (searchType === 'ba-code') {
        matchesSearch = doctor.baCode.toLowerCase().includes(searchTerm.toLowerCase());
      } else {
        matchesSearch = doctor.residentialPincode.includes(searchTerm);
      }
    }

    return matchesDateRange && matchesSearch;
  });

  // Calculate stats from real data
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const stats = {
    totalDoctors: doctors.length,
    newThisMonth: doctors.filter(d => {
      if (!d.createdAt) return false;
      const createdDate = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
      return createdDate >= firstDayOfMonth;
    }).length,
    activeDoctors: doctors.filter(d => d.qrStatus === 'Active').length,
    inactiveDoctors: doctors.filter(d => d.qrStatus === 'Deactive').length,
    preprinted: doctors.filter(d => d.qrSource !== 'Virtual' && d.qrNumber !== '-').length,
    virtual: doctors.filter(d => d.qrSource === 'Virtual').length,
    noQR: doctors.filter(d => d.qrNumber === '-').length,
  };

  const getQRStatusColor = (status: string) => {
    return status === 'Active' 
      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
      : 'bg-red-500/10 text-red-500 border-red-500/30';
  };

  // Export to CSV function
  const exportToCSV = () => {
    const headers = ['Name', 'Doctor Code', 'DOB', 'Residential Pincode', 'Email', 'BA Code', 'QR Status', 'QR No', 'QR Source'];
    
    const rows = filteredDoctors.map(doctor => [
      doctor.name,
      doctor.doctorCode,
      new Date(doctor.dob).toLocaleDateString('en-IN'),
      doctor.residentialPincode,
      doctor.email,
      doctor.baCode,
      doctor.qrStatus,
      doctor.qrNumber,
      doctor.qrSource,
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `doctors_${new Date().toISOString().split('T')[0]}.csv`);
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
            <h1 className="text-2xl md:text-3xl mb-2 text-white">Doctor Management</h1>
            <p className="text-sm md:text-base text-gray-400">View and manage onboarded doctors</p>
          </div>
          <Button 
            onClick={loadDoctors}
            disabled={loading}
            variant="outline"
            className="border-zinc-700 text-white hover:bg-zinc-800 w-full md:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/20 border border-blue-700/30 rounded-2xl p-4 md:p-8 mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="bg-blue-600/20 rounded-2xl p-3 md:p-4">
              <Users className="w-8 h-8 md:w-12 md:h-12 text-blue-400" />
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm md:text-base text-blue-300 mb-1">Total Onboard Doctors</p>
              <p className="text-4xl md:text-6xl text-blue-400">{stats.totalDoctors}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
            <p className="text-sm md:text-base text-blue-300">+{stats.newThisMonth} new this month</p>
          </div>

          {/* Status & QR Breakdown */}
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div className="text-center">
              <p className="text-xs md:text-sm text-blue-300">Active</p>
            </div>
            <div className="text-center">
              <p className="text-xs md:text-sm text-blue-300">Inactive</p>
            </div>
            <div className="text-center">
              <p className="text-xs md:text-sm text-blue-300">New This Month</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl md:text-4xl text-white">{stats.activeDoctors}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-4xl text-red-400">{stats.inactiveDoctors}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-4xl text-emerald-400">{stats.newThisMonth}</p>
            </div>

            <div className="text-center">
              <p className="text-xs md:text-sm text-blue-300">Pre-printed QR</p>
            </div>
            <div className="text-center">
              <p className="text-xs md:text-sm text-blue-300">Virtual QR</p>
            </div>
            <div className="text-center">
              <p className="text-xs md:text-sm text-blue-300">No QR Assigned</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl md:text-4xl text-white">{stats.preprinted}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-4xl text-white">{stats.virtual}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-4xl text-white">{stats.noQR}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6 mb-6">
          <h2 className="text-lg md:text-xl mb-4 text-white">Filters</h2>

          {/* Date Range Filter */}
          <div className="mb-6 bg-zinc-800 border border-zinc-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <h3 className="text-sm text-white">Sign Up Date Range</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="w-full min-w-0">
                <label className="block text-xs text-gray-400 mb-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setShowAll(false);
                  }}
                  placeholder="dd-mm-yyyy"
                  className="w-full min-w-0 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="w-full min-w-0">
                <label className="block text-xs text-gray-400 mb-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setShowAll(false);
                  }}
                  placeholder="dd-mm-yyyy"
                  className="w-full min-w-0 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="w-full">
                {(startDate || endDate) ? (
                  <Button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setShowAll(false);
                    }}
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

          {/* Search Options */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <h3 className="text-sm text-white">Search Options</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="w-full min-w-0">
                <label className="block text-sm text-gray-400 mb-2">Search By</label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="doctor-code">Doctor Code</option>
                  <option value="ba-code">BA Code</option>
                  <option value="pincode">Residential Pincode</option>
                </select>
              </div>
              <div className="w-full min-w-0">
                <label className="block text-sm text-gray-400 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder={`Search by ${searchType === 'ba-code' ? 'BA Code' : 'Pincode'}...`}
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
                <Users className="w-5 h-5 md:w-6 md:h-6 text-emerald-500 flex-shrink-0" />
                Doctor Records
              </h2>
              <p className="text-xs md:text-sm text-gray-400">{filteredDoctors.length} found</p>
              {!startDate && !endDate && filteredDoctors.length === 0 && (
                <span className="text-xs text-orange-400">(Showing today's signups only)</span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {filteredDoctors.length === 0 && (
                <Button
                  onClick={() => {
                    // Clear date filters and set showAll to true
                    setStartDate('');
                    setEndDate('');
                    setShowAll(true);
                  }}
                  size="sm"
                  variant="outline"
                  className="border-emerald-600 text-emerald-400 hover:bg-emerald-600 hover:text-white w-full sm:w-auto"
                >
                  View All Doctors
                </Button>
              )}
              <Button
                onClick={exportToCSV}
                disabled={filteredDoctors.length === 0}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
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
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
                <p className="text-gray-400">Loading doctors...</p>
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No doctors found</p>
              </div>
            ) : (
              filteredDoctors.map(doctor => (
                <div key={doctor.id} className="bg-zinc-800 rounded-lg p-4 space-y-3">
                  {/* Name and Plan */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="text-white font-medium flex items-center gap-1.5">
                        {doctor.name}
                        {doctor.isDemo && <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block flex-shrink-0" title="Demo Doctor" />}
                      </h3>
                      <p className="text-xs text-emerald-400 mt-1 font-mono">Dr Code: {doctor.doctorCode}</p>
                      <p className="text-xs text-gray-400">BA Code: {doctor.baCode}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs text-emerald-400 font-medium">{doctor.totalBookings} bookings</span>
                        <span className="text-xs text-gray-500">|</span>
                        <span className="text-xs text-blue-400">QR: {doctor.qrBookings}</span>
                        <span className="text-xs text-gray-500">|</span>
                        <span className="text-xs text-purple-400">Walk-in: {doctor.walkinBookings}</span>
                        <span className="text-xs text-gray-500">|</span>
                        <span className="text-xs text-cyan-400">Total Scan: {doctor.totalScans}</span>
                        <span className="text-xs text-gray-500">|</span>
                        <span className="text-xs text-orange-400">Drop Out: {doctor.dropOuts || 0}</span>
                        <span className="text-xs text-gray-500">|</span>
                        <span className="text-xs text-red-400">Cancel: {doctor.cancelledCount || 0}</span>
                      </div>
                    </div>
                    <Badge className={`${getQRStatusColor(doctor.qrStatus)} border text-xs`}>
                      {doctor.qrStatus}
                    </Badge>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">QR No</p>
                      <p className="text-white text-xs font-mono">{doctor.qrNumber}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{doctor.qrSource}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">DOB</p>
                      <p className="text-white text-xs">{new Date(doctor.dob).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Pincode</p>
                      <p className="text-white text-xs font-mono">{doctor.residentialPincode}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Email</p>
                      <p className="text-white text-xs break-all">{doctor.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Sign Up</p>
                      <p className="text-white text-xs">
                        {doctor.createdAt?.toDate?.() 
                          ? doctor.createdAt.toDate().toLocaleDateString('en-IN')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">QR Status</p>
                      <Badge className={`${getQRStatusColor(doctor.qrStatus)} border text-xs`}>
                        {doctor.qrStatus}
                      </Badge>
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
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Doctor Code</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">DOB</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Pincode</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Email</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">BA Code</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Sign Up</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">QR Status</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">QR No</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12">
                        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
                        <p className="text-gray-400">Loading doctors...</p>
                      </td>
                    </tr>
                  ) : filteredDoctors.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12">
                        <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500">No doctors found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDoctors.map(doctor => (
                      <tr key={doctor.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <p className="text-sm text-white font-medium flex items-center gap-1.5">
                              {doctor.name}
                              {doctor.isDemo && <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block flex-shrink-0" title="Demo Doctor" />}
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-emerald-400 font-medium">{doctor.totalBookings} bookings</span>
                              <span className="text-gray-500">|</span>
                              <span className="text-blue-400">QR: {doctor.qrBookings}</span>
                              <span className="text-gray-500">|</span>
                              <span className="text-purple-400">Walk-in: {doctor.walkinBookings}</span>
                              <span className="text-gray-500">|</span>
                              <span className="text-cyan-400">Total Scan: {doctor.totalScans}</span>
                              <span className="text-gray-500">|</span>
                              <span className="text-orange-400">Drop Out: {doctor.dropOuts || 0}</span>
                              <span className="text-gray-500">|</span>
                              <span className="text-red-400">Cancel: {doctor.cancelledCount || 0}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-emerald-400 font-mono whitespace-nowrap">
                          {doctor.doctorCode}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-400 whitespace-nowrap">
                          {doctor.dob ? new Date(doctor.dob).toLocaleDateString('en-IN') : '-'}
                        </td>
                        <td className="py-4 px-4 text-sm text-white font-mono whitespace-nowrap">
                          {doctor.residentialPincode || '-'}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-400 whitespace-nowrap">
                          {doctor.email}
                        </td>
                        <td className="py-4 px-4 text-sm text-emerald-400 font-mono whitespace-nowrap">
                          {doctor.baCode}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-400 whitespace-nowrap">
                          {doctor.createdAt?.toDate?.() 
                            ? doctor.createdAt.toDate().toLocaleDateString('en-IN')
                            : '-'}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <Badge className={`${getQRStatusColor(doctor.qrStatus)} border`}>
                            {doctor.qrStatus}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm text-cyan-400 font-mono">{doctor.qrNumber}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{doctor.qrSource}</p>
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

