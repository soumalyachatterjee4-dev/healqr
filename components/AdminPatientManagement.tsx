import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Calendar, Users, Download, RefreshCw } from 'lucide-react';
import { Badge } from './ui/badge';
import { collection, query, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { COLLECTIONS } from '../lib/firebase/collections';

interface PatientRecord {
  id: string;
  date: string;
  bookingId: string;
  doctorEmail: string;
  bookingType: 'QR SCAN' | 'WALK IN';
  status: 'SEEN' | 'CANCELLED';
  cancellationType?: 'GLOBAL TOGGLE' | 'CHAMBER TOGGLE' | 'PATIENT INDIVIDUAL TOGGLE' | 'DROP OUT';
  createdAt: any;
}

export default function AdminPatientManagement() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'booking-id' | 'doctor-email'>('booking-id');
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // Load patient records from Firestore
  const loadPatientRecords = async () => {
    try {
      setLoading(true);
      
      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const bookingsRef = collection(db, COLLECTIONS.BOOKINGS);
      const q = query(bookingsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const recordsData: PatientRecord[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Get doctor email
        let doctorEmail = data.doctorEmail || '';
        if (!doctorEmail && data.doctorId) {
          // Try to fetch doctor email from doctors collection
          const doctorsRef = collection(db, COLLECTIONS.DOCTORS);
          const doctorsSnapshot = await getDocs(doctorsRef);
          const doctorDoc = doctorsSnapshot.docs.find(d => d.id === data.doctorId);
          if (doctorDoc) {
            doctorEmail = doctorDoc.data().email || '';
          }
        }

        // Determine booking type
        let bookingType: 'QR SCAN' | 'WALK IN' = 'QR SCAN';
        const type = (data.type || data.bookingType || data.visitType || 'qr').toLowerCase();
        if (type.includes('walkin') || type.includes('walk-in') || type.includes('walk_in') || type === 'home-call') {
          bookingType = 'WALK IN';
        }

        // Determine status
        let status: 'SEEN' | 'CANCELLED' = 'SEEN';
        const bookingStatus = (data.status || '').toLowerCase();
        if (bookingStatus === 'cancelled' || bookingStatus === 'canceled' || data.isCancelled === true) {
          status = 'CANCELLED';
        }

        // Determine cancellation type
        let cancellationType: 'GLOBAL TOGGLE' | 'CHAMBER TOGGLE' | 'PATIENT INDIVIDUAL TOGGLE' | 'DROP OUT' | undefined;
        if (status === 'CANCELLED') {
          const cancelReason = (data.cancellationReason || data.cancelReason || data.cancellationType || data.cancelledBy || '').toLowerCase();
          const cancelBy = (data.cancelledBy || '').toLowerCase();
          
          if (cancelReason.includes('global') || cancelBy.includes('global')) {
            cancellationType = 'GLOBAL TOGGLE';
          } else if (cancelReason.includes('chamber') || cancelBy.includes('chamber')) {
            cancellationType = 'CHAMBER TOGGLE';
          } else if (cancelReason.includes('patient') || cancelReason.includes('individual') || cancelBy === 'patient') {
            cancellationType = 'PATIENT INDIVIDUAL TOGGLE';
          } else if (cancelReason.includes('drop') || cancelReason.includes('dropout') || cancelReason.includes('no_show') || cancelReason.includes('no-show')) {
            cancellationType = 'DROP OUT';
          } else if (cancelBy === 'doctor') {
            // If cancelled by doctor without specific reason, assume chamber toggle
            cancellationType = 'CHAMBER TOGGLE';
          }
        }

        // Get booking date
        let bookingDate = new Date();
        if (data.bookingDate) {
          bookingDate = data.bookingDate.toDate ? data.bookingDate.toDate() : new Date(data.bookingDate);
        } else if (data.createdAt) {
          bookingDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        }

        const record: PatientRecord = {
          id: doc.id,
          date: bookingDate.toISOString(),
          bookingId: data.bookingId || doc.id.substring(0, 12).toUpperCase(),
          doctorEmail,
          bookingType,
          status,
          cancellationType,
          createdAt: data.createdAt,
        };

        recordsData.push(record);
      }

      setRecords(recordsData);
    } catch (error) {
      console.error('Error loading patient records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientRecords();
  }, []);

  // Filter records
  const filteredRecords = records.filter(record => {
    // Date range filter
    let matchesDateRange = true;
    if (startDate || endDate) {
      const recordDate = new Date(record.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (start && end) {
        matchesDateRange = recordDate >= start && recordDate <= end;
      } else if (start) {
        matchesDateRange = recordDate >= start;
      } else if (end) {
        matchesDateRange = recordDate <= end;
      }
    }

    // Search filter
    let matchesSearch = true;
    if (searchTerm) {
      if (searchType === 'booking-id') {
        matchesSearch = record.bookingId.toLowerCase().includes(searchTerm.toLowerCase());
      } else {
        matchesSearch = record.doctorEmail.toLowerCase().includes(searchTerm.toLowerCase());
      }
    }

    return matchesDateRange && matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, searchTerm, searchType]);

  const getStatusColor = (status: string) => {
    return status === 'SEEN' 
      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
      : 'bg-red-500/10 text-red-500 border-red-500/30';
  };

  const getCancellationTypeColor = (type?: string) => {
    switch (type) {
      case 'GLOBAL TOGGLE': return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'CHAMBER TOGGLE': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      case 'PATIENT INDIVIDUAL TOGGLE': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'DROP OUT': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
    }
  };

  // Export to CSV function
  const exportToCSV = () => {
    // CSV headers
    const headers = ['Date', 'Booking ID', 'Doctor Email', 'Booking Type', 'Status', 'Cancellation Type'];
    
    // CSV rows
    const rows = filteredRecords.map(record => [
      new Date(record.date).toLocaleDateString('en-IN'),
      record.bookingId,
      record.doctorEmail,
      record.bookingType,
      record.status,
      record.cancellationType || '-'
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `patient_records_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-black">
      <div className="p-4 md:p-8 max-w-full">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl mb-2 text-white">Patient Management</h1>
            <p className="text-sm md:text-base text-gray-400">View and filter patient bookings</p>
          </div>
          <Button 
            onClick={loadPatientRecords}
            disabled={loading}
            variant="outline"
            className="border-zinc-700 text-white hover:bg-zinc-800 w-full md:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6 mb-6">
          <h2 className="text-lg md:text-xl mb-4 text-white">Filters</h2>

          {/* Date Range Filter */}
          <div className="mb-6 bg-zinc-800 border border-zinc-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <h3 className="text-sm text-white">Date Range</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="w-full min-w-0">
                <label className="block text-xs text-gray-400 mb-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full min-w-0 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="w-full min-w-0">
                <label className="block text-xs text-gray-400 mb-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full min-w-0 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="w-full">
                {(startDate || endDate) ? (
                  <Button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
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
                  <option value="booking-id">Patient Booking ID</option>
                  <option value="doctor-email">Doctor Email ID</option>
                </select>
              </div>
              <div className="w-full min-w-0">
                <label className="block text-sm text-gray-400 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder={`Search by ${searchType === 'booking-id' ? 'Booking ID' : 'Doctor Email'}...`}
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
                Patient Records
              </h2>
              <p className="text-xs md:text-sm text-gray-400">{filteredRecords.length} found</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={() => {
                  // Focus on Booking ID search
                  setSearchType('booking-id');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                size="sm"
                variant="outline"
                className="border-emerald-600 text-emerald-500 hover:bg-emerald-600/10 flex-1 sm:flex-initial"
              >
                <Search className="w-4 h-4 mr-2" />
                VIEW DETAILS
              </Button>
              <Button
                onClick={exportToCSV}
                disabled={filteredRecords.length === 0}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-initial"
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
                <p className="text-gray-400">Loading patient records...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No records found</p>
              </div>
            ) : (
              currentRecords.map(record => (
                <div key={record.id} className="bg-zinc-800 rounded-lg p-4 space-y-3">
                  {/* Top Section - Booking ID and Date */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Booking ID</p>
                      <p className="text-white font-mono text-sm">{record.bookingId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Date</p>
                      <p className="text-white text-sm">{new Date(record.date).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>

                  {/* Doctor Email */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Doctor Email</p>
                    <p className="text-white text-xs break-all">{record.doctorEmail}</p>
                  </div>

                  {/* Badges Section */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Booking Type</p>
                      <Badge className={record.bookingType === 'QR SCAN' 
                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/30 border text-xs' 
                        : 'bg-purple-500/10 text-purple-500 border-purple-500/30 border text-xs'}>
                        {record.bookingType}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      <Badge className={`${getStatusColor(record.status)} border text-xs`}>
                        {record.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Cancellation Type (if exists) */}
                  {record.cancellationType && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Cancellation Type</p>
                      <Badge className={`${getCancellationTypeColor(record.cancellationType)} border text-xs`}>
                        {record.cancellationType}
                      </Badge>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto -mx-6">
            <div className="px-6">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Date</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Booking ID</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Doctor Email</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Booking Type</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Status</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Cancellation</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
                        <p className="text-gray-400">Loading patient records...</p>
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500">No records found</p>
                      </td>
                    </tr>
                  ) : (
                    currentRecords.map(record => (
                      <tr key={record.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                        <td className="py-4 px-4 text-sm text-white whitespace-nowrap">
                          {new Date(record.date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-4 px-4 text-sm text-white font-mono whitespace-nowrap">
                          {record.bookingId}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-400 whitespace-nowrap">
                          {record.doctorEmail}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <Badge className={record.bookingType === 'QR SCAN' 
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/30 border' 
                            : 'bg-purple-500/10 text-purple-500 border-purple-500/30 border'}>
                            {record.bookingType}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <Badge className={`${getStatusColor(record.status)} border`}>
                            {record.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          {record.cancellationType ? (
                            <Badge className={`${getCancellationTypeColor(record.cancellationType)} border text-xs`}>
                              {record.cancellationType}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {!loading && filteredRecords.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-zinc-800">
              <div className="text-sm text-gray-400">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredRecords.length)} of {filteredRecords.length} records
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-gray-400 hover:bg-zinc-800 disabled:opacity-50"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first page, last page, current page, and pages around current
                      return page === 1 || 
                             page === totalPages || 
                             Math.abs(page - currentPage) <= 1;
                    })
                    .map((page, index, array) => {
                      // Add ellipsis if there's a gap
                      const prevPage = array[index - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;
                      
                      return (
                        <div key={page} className="flex items-center">
                          {showEllipsis && (
                            <span className="px-2 text-gray-600">...</span>
                          )}
                          <Button
                            onClick={() => setCurrentPage(page)}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            className={currentPage === page 
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white min-w-[36px]" 
                              : "border-zinc-700 text-gray-400 hover:bg-zinc-800 min-w-[36px]"}
                          >
                            {page}
                          </Button>
                        </div>
                      );
                    })}
                </div>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-gray-400 hover:bg-zinc-800 disabled:opacity-50"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}