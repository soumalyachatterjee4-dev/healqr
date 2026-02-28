import { useState, useMemo, useEffect } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Menu, ArrowLeft, Download, FileText, Filter, Search, MapPin } from 'lucide-react';
import DashboardSidebar from './DashboardSidebar';
import { db } from '../lib/firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { decrypt } from '../utils/encryptionService';
import { toast } from 'sonner';

interface DoctorReportsProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
  activeAddOns?: string[];
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
}

interface ReportData {
  id: string;
  bookingDate: string;
  appointmentDate: string;
  patientName: string;
  age: number;
  chamber: string;
  bookingType: string;
  cancellationType: string;
  status: string;
  bookingId: string;
  phone: string;
}

export default function DoctorReports({
  onMenuChange,
  onLogout,
  activeAddOns = [],
  isSidebarCollapsed = false,
  setIsSidebarCollapsed
}: DoctorReportsProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [chambers, setChambers] = useState<Array<{ id: string; name: string }>>([{ id: 'all', name: 'All Chambers' }]);

  // Filter States
  const getDefaultDates = () => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    return {
      from: lastWeek.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    };
  };

  const defaultDates = getDefaultDates();
  const [dateFrom, setDateFrom] = useState(defaultDates.from);
  const [dateTo, setDateTo] = useState(defaultDates.to);
  const [selectedChamber, setSelectedChamber] = useState('all');
  const [selectedBookingType, setSelectedBookingType] = useState('all');
  const [selectedCancellationType, setSelectedCancellationType] = useState('all');

  const bookingTypes = [
    { id: 'all', name: 'All Types' },
    { id: 'qr', name: 'QR Booking' },
    { id: 'walkin', name: 'Walk-in' },
  ];

  const cancellationTypes = [
    { id: 'all', name: 'All Types' },
    { id: 'dropout', name: 'Drop Out (Non Seen)' },
    { id: 'global', name: 'Global Toggle' },
    { id: 'chamber', name: 'Chamber Toggle' },
    { id: 'patient', name: 'Patient Toggle' },
  ];

  // Load Chambers
  useEffect(() => {
    const loadChambersList = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId || !db) return;

        const doctorRef = doc(db, 'doctors', userId);
        const doctorSnap = await getDoc(doctorRef);

        if (doctorSnap.exists()) {
          const doctorData = doctorSnap.data();
          const chambersList = doctorData.chambers || [];

          setChambers([
            { id: 'all', name: 'All Chambers' },
            ...chambersList.map((chamber: any) => ({
              id: chamber.id.toString(),
              name: chamber.chamberName
            }))
          ]);
        }
      } catch (error) {
        console.error('Error loading chambers:', error);
      }
    };
    loadChambersList();
  }, []);

  // Load Report Data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem('userId');
        if (!userId || !db) return;

        // 🔒 PATIENT DATA ACCESS CONTROL: Map clinic IDs to their restriction status
        let clinicRestrictions: Record<string, boolean> = {};
        try {
          const clinicsRef = collection(db, 'clinics');
          const allClinicsSnap = await getDocs(clinicsRef);
          allClinicsSnap.forEach((clinicDoc) => {
            const clinicData = clinicDoc.data();
            const linkedDoctors = clinicData.linkedDoctorsDetails || [];
            const isRestricted = linkedDoctors.some((d: any) =>
              (d.doctorId === userId || d.uid === userId) && d.restrictPatientDataAccess === true
            );
            clinicRestrictions[clinicDoc.id] = isRestricted;
          });
        } catch (error) {
          console.error('Error checking clinic access restrictions:', error);
        }

        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, where('doctorId', '==', userId));
        const snapshot = await getDocs(q);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const data: ReportData[] = snapshot.docs.map(docSnap => {
          const booking = docSnap.data();

          // 🔒 PATIENT DATA ACCESS CONTROL: Masking check
          const bookingClinicId = booking.clinicId;
          const isClinicRestricted = bookingClinicId ? clinicRestrictions[bookingClinicId] === true : false;
          const isMasked = isClinicRestricted && booking.bookingSource !== 'doctor_qr';

          // Dates
          const createdAt = booking.createdAt?.toDate() || new Date();
          const bookingDateStr = createdAt.toISOString().split('T')[0];
          const appointmentDateStr = booking.appointmentDate || bookingDateStr;

          // Decryption
          let patientName = booking.patientName || 'N/A';
          let phone = booking.phone || booking.whatsappNumber || 'N/A';
          let age = booking.age || 0;

          try {
            if (booking.patientName_encrypted) patientName = decrypt(booking.patientName_encrypted) || patientName;
            if (booking.whatsappNumber_encrypted) phone = decrypt(booking.whatsappNumber_encrypted) || phone;
            else if (booking.phone_encrypted) phone = decrypt(booking.phone_encrypted) || phone;
            if (booking.age_encrypted) {
              const decryptedAge = decrypt(booking.age_encrypted);
              if (decryptedAge) age = parseInt(decryptedAge);
            }
          } catch (e) {
            // Decryption fallback exists
          }

          // 🔑 Apply dynamic masking
          if (isMasked) {
            const maskName = (name: string) => {
              const parts = name.trim().split(/\s+/);
              return parts.map(part => part.length <= 1 ? part : part[0] + '*'.repeat(Math.min(part.length - 1, 4))).join(' ');
            };
            const maskPhone = (num: string) => {
              const digits = num.replace(/\D/g, '');
              return digits.length < 4 ? '******' : '******' + digits.slice(-4);
            };
            patientName = maskName(patientName);
            phone = maskPhone(phone);
            age = 0;
          }

          // Status & Cancellation
          let status = 'Pending';
          let cancellationType = 'None';
          const isCancelled = booking.status === 'cancelled' || booking.isCancelled === true;
          const appointmentDateObj = new Date(appointmentDateStr);
          appointmentDateObj.setHours(0, 0, 0, 0);
          const isPast = appointmentDateObj < today;

          if (isCancelled) {
            status = 'Cancelled';
            const reason = (booking.cancellationReason || '').toLowerCase();
            if (reason.includes('global')) cancellationType = 'Global Toggle';
            else if (reason.includes('chamber')) cancellationType = 'Chamber Toggle';
            else if (reason.includes('patient') || booking.cancelledBy === 'patient') cancellationType = 'Patient Toggle';
            else cancellationType = 'Cancelled';
          } else if (isPast) {
            status = booking.isMarkedSeen || booking.eyeIconPressed ? 'Seen' : 'Drop Out';
            if (status === 'Drop Out') cancellationType = 'Drop Out';
          }

          return {
            id: docSnap.id,
            bookingDate: bookingDateStr,
            appointmentDate: appointmentDateStr,
            patientName,
            age,
            chamber: booking.chamber || 'N/A',
            bookingType: booking.type === 'walkin_booking' ? 'Walk-in' : 'QR',
            cancellationType,
            status,
            bookingId: booking.bookingId || docSnap.id,
            phone
          };
        });

        // Sort by appointment date DESC
        data.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
        setReportData(data);
      } catch (error) {
        console.error('Error loading report data:', error);
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Filtered Results
  const filteredData = useMemo(() => {
    return reportData.filter(item => {
      // Date Filter
      if (item.appointmentDate < dateFrom || item.appointmentDate > dateTo) return false;
      // Chamber Filter
      if (selectedChamber !== 'all') {
        const chamberName = chambers.find(c => c.id === selectedChamber)?.name;
        if (item.chamber !== chamberName) return false;
      }
      // Booking Type Filter
      if (selectedBookingType !== 'all') {
        const type = selectedBookingType === 'qr' ? 'QR' : 'Walk-in';
        if (item.bookingType !== type) return false;
      }
      // Cancellation Filter
      if (selectedCancellationType !== 'all') {
        const map: any = { 'dropout': 'Drop Out', 'global': 'Global Toggle', 'chamber': 'Chamber Toggle', 'patient': 'Patient Toggle' };
        if (item.cancellationType !== map[selectedCancellationType]) return false;
      }
      return true;
    });
  }, [reportData, dateFrom, dateTo, selectedChamber, selectedBookingType, selectedCancellationType, chambers]);

  const handleExport = () => {
    if (filteredData.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = ['Booking Date', 'Appointment Date', 'Booking ID', 'Patient Name', 'Age', 'Phone', 'Chamber', 'Type', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => [
        item.bookingDate,
        item.appointmentDate,
        item.bookingId,
        `"${item.patientName}"`,
        item.age,
        item.phone,
        `"${item.chamber}"`,
        item.bookingType,
        item.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `doctor_report_${dateFrom}_to_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      <DashboardSidebar
        activeMenu="reports"
        onMenuChange={onMenuChange || (() => {})}
        onLogout={onLogout || (() => {})}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeAddOns={activeAddOns}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed?.(!isSidebarCollapsed)}
      />

      <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} flex flex-col min-h-screen relative`}>
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md border-b border-white/5 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-emerald-500 hover:bg-zinc-900"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-white/5"
            onClick={() => onMenuChange?.('dashboard')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Doctor Reports</h1>
              <p className="text-xs text-gray-500 font-mono">SS2 Analytics Hub</p>
            </div>
          </div>
        </div>
        <Button
          onClick={handleExport}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </header>

      <main className="flex-1 p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Filters Card */}
        <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-sm">
          <CardHeader className="border-b border-white/5">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-emerald-500" />
            <CardTitle className="text-lg text-white">Filter Records</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Date From */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>

              {/* Chamber Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filter by Chamber</label>
                <Select value={selectedChamber} onValueChange={setSelectedChamber}>
                  <SelectTrigger className="bg-black/50 border-white/10 rounded-lg h-10 text-sm text-white">
                    <SelectValue placeholder="All Chambers" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {chambers.map(chamber => (
                      <SelectItem key={chamber.id} value={chamber.id}>{chamber.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Booking Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Booking Type</label>
                <Select value={selectedBookingType} onValueChange={setSelectedBookingType}>
                  <SelectTrigger className="bg-black/50 border-white/10 rounded-lg h-10 text-sm text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {bookingTypes.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cancellation Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cancellation/Drop-out</label>
                <Select value={selectedCancellationType} onValueChange={setSelectedCancellationType}>
                  <SelectTrigger className="bg-black/50 border-white/10 rounded-lg h-10 text-sm text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {cancellationTypes.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Info */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            {loading ? 'Fetching records...' : (
              <>Found <span className="text-white font-bold">{filteredData.length}</span> matching records</>
            )}
          </p>
        </div>

        {/* Table Card */}
        <Card className="bg-zinc-900/20 border-white/5 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader className="bg-zinc-900/50 sticky top-0 z-10">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-gray-400 text-xs font-bold uppercase py-4">Appt. Date</TableHead>
                    <TableHead className="text-gray-400 text-xs font-bold uppercase py-4">Patient Details</TableHead>
                    <TableHead className="text-gray-400 text-xs font-bold uppercase py-4">Chamber</TableHead>
                    <TableHead className="text-gray-400 text-xs font-bold uppercase py-4">Type</TableHead>
                    <TableHead className="text-gray-400 text-xs font-bold uppercase py-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-gray-500 text-sm">Loading records...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length > 0 ? (
                    filteredData.map((record) => (
                      <TableRow key={record.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="text-white font-semibold">{record.appointmentDate}</span>
                            <span className="text-[10px] text-gray-500">Booked: {record.bookingDate}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="text-emerald-400 font-bold">{record.patientName}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-400">{record.age > 0 ? `${record.age} Yrs` : 'N/A'}</span>
                              <span className="text-xs text-gray-600">•</span>
                              <span className="text-xs text-gray-400">{record.phone}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-gray-500" />
                            <span className="text-sm text-gray-400">{record.chamber}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                            record.bookingType === 'QR'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          }`}>
                            {record.bookingType}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded w-fit ${
                              record.status === 'Seen' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              record.status === 'Cancelled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              record.status === 'Drop Out' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                              'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {record.status}
                            </span>
                            {record.cancellationType !== 'None' && (
                              <span className="text-[9px] text-gray-500 italic ml-1">
                                Via {record.cancellationType}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20">
                        <Search className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                        <p className="text-gray-500">No records match your filters</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-600 text-xs border-t border-white/5">
        Powered by healQR.com Technology System
      </footer>
      </div>
    </div>
  );
}
