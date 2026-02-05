import { useState, useMemo, useEffect } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Menu, ArrowLeft, Download, Calendar as CalendarIcon, FileText } from 'lucide-react';
import DashboardSidebar from './DashboardSidebar';
import { decrypt } from '../utils/encryptionService';

interface ReportProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
  activeAddOns?: string[];
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

export default function Report({ onMenuChange, onLogout, activeAddOns = [] }: ReportProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Set default dates to last 7 days
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
  const [chambers, setChambers] = useState<Array<{ id: string; name: string }>>([{ id: 'all', name: 'All Chambers' }]);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);

  const bookingTypes = [
    { id: 'all', name: 'All Types' },
    { id: 'qr', name: 'QR Booking' },
    { id: 'walkin', name: 'Walk-in' },
  ];

  const cancellationTypes = [
    { id: 'all', name: 'All Types' },
    { id: 'dropout', name: 'Drop Out (Non Seen)' },
    { id: 'global', name: 'Using Global Toggle' },
    { id: 'chamber', name: 'Using Chamber Toggle' },
    { id: 'patient', name: 'Using Patient Toggle' },
  ];

  // Load chambers from Firestore
  useEffect(() => {
    const loadChambers = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const { db } = await import('../lib/firebase/config');
        const { doc, getDoc } = await import('firebase/firestore');

        const doctorRef = doc(db, 'doctors', userId);
        const doctorSnap = await getDoc(doctorRef);

        if (doctorSnap.exists()) {
          const doctorData = doctorSnap.data();
          const chambersList = doctorData.chambers || [];
          
          const chamberOptions = [
            { id: 'all', name: 'All Chambers' },
            ...chambersList.map((chamber: any) => ({
              id: chamber.id.toString(),
              name: chamber.chamberName
            }))
          ];
          
          setChambers(chamberOptions);
        }
      } catch (error) {
        console.error('Error loading chambers:', error);
      }
    };

    loadChambers();
  }, []);

  // Load report data from Firestore
  useEffect(() => {
    const loadReportData = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const { db } = await import('../lib/firebase/config');
        const { collection, query, where, getDocs } = await import('firebase/firestore');

        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, where('doctorId', '==', userId));

        const bookingsSnap = await getDocs(q);
        const data: ReportData[] = [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        bookingsSnap.docs.forEach(doc => {
          const booking = doc.data();
          
          // Booking date (when booking was created)
          const bookingDate = booking.createdAt?.toDate() || new Date();
          const bookingDateStr = bookingDate.toISOString().split('T')[0];
          
          // Appointment date (scheduled date for visit)
          const appointmentDate = booking.date?.toDate() || bookingDate;
          const appointmentDateStr = booking.appointmentDate || appointmentDate.toISOString().split('T')[0];

          // Determine booking type
          const bookingType = booking.type === 'walkin_booking' ? 'Walk-in' : 'QR';

          // Check if appointment date has passed
          const appointmentDateObj = new Date(appointmentDateStr);
          appointmentDateObj.setHours(0, 0, 0, 0);
          const isPastAppointment = appointmentDateObj < today;

          // Determine cancellation type and status
          let cancellationType = 'None';
          let status = 'Pending';
          
          const isCancelled = booking.status === 'cancelled' || booking.isCancelled === true;
          
          if (isCancelled) {
            // Cancelled booking
            const cancelReason = booking.cancellationReason || '';
            if (cancelReason.includes('global toggle') || cancelReason.includes('Global booking disabled')) {
              cancellationType = 'Global Toggle';
            } else if (cancelReason.includes('chamber') || cancelReason.includes('Chamber deactivated')) {
              cancellationType = 'Chamber Toggle';
            } else if (cancelReason.includes('patient') || booking.cancelledBy === 'patient') {
              cancellationType = 'Patient Toggle';
            } else {
              cancellationType = 'Cancelled';
            }
            status = 'Cancelled';
          } else if (isPastAppointment) {
            // Appointment date has passed
            if (booking.eyeIconPressed === false) {
              cancellationType = 'Drop Out';
              status = 'Drop Out';
            } else {
              status = 'Seen';
            }
          } else {
            // Future appointment - still pending
            status = 'Pending';
          }

          // 🔓 Decrypt sensitive patient data (if encrypted)
          let patientName = booking.patientName || 'N/A';
          let whatsappNumber = booking.whatsappNumber || booking.phone || 'N/A';
          let age = booking.age || 0;
          
          // Try to decrypt only if encrypted version exists
          try {
            if ((booking as any).patientName_encrypted) {
              patientName = decrypt((booking as any).patientName_encrypted) || patientName;
            }
            if ((booking as any).whatsappNumber_encrypted) {
              whatsappNumber = decrypt((booking as any).whatsappNumber_encrypted) || whatsappNumber;
            }
            if ((booking as any).age_encrypted) {
              const ageDecrypted = decrypt((booking as any).age_encrypted);
              if (ageDecrypted) age = parseInt(ageDecrypted);
            }
          } catch (error) {
            // Silently fallback to plain values if decryption fails
          }
          
          data.push({
            id: doc.id,
            bookingDate: bookingDateStr,
            appointmentDate: appointmentDateStr,
            patientName,
            age,
            chamber: booking.chamber || 'N/A',
            bookingType,
            cancellationType,
            status,
            bookingId: booking.bookingId || doc.id,
            phone: whatsappNumber
          });
        });

        // Sort by appointment date descending
        data.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());

        setReportData(data);
      } catch (error) {
        console.error('Error loading report data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, []);

  // Filter data based on selections
  const filteredData = useMemo(() => {
    return reportData.filter(item => {
      // Date filter (filter by appointment date)
      const itemDate = new Date(item.appointmentDate);
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      if (itemDate < fromDate || itemDate > toDate) return false;

      // Chamber filter
      if (selectedChamber !== 'all') {
        if (item.chamber !== chambers.find(c => c.id === selectedChamber)?.name) return false;
      }

      // Booking type filter
      if (selectedBookingType !== 'all') {
        const bookingTypeMap: { [key: string]: string } = {
          'qr': 'QR',
          'walkin': 'Walk-in',
        };
        if (item.bookingType !== bookingTypeMap[selectedBookingType]) return false;
      }

      // Cancellation type filter
      if (selectedCancellationType !== 'all') {
        const cancellationMap: { [key: string]: string } = {
          'dropout': 'Drop Out',
          'global': 'Global Toggle',
          'chamber': 'Chamber Toggle',
          'patient': 'Patient Toggle',
        };
        if (item.cancellationType !== cancellationMap[selectedCancellationType]) return false;
      }

      return true;
    });
  }, [reportData, dateFrom, dateTo, selectedChamber, selectedBookingType, selectedCancellationType, chambers]);

  const handleExport = () => {
    if (filteredData.length === 0) {
      alert('No data to export');
      return;
    }

    // Create CSV content
    const headers = ['Booking Date', 'Appointment Date', 'Booking ID', 'Patient Name', 'Age', 'Phone', 'Chamber', 'Booking Type', 'Cancellation Type', 'Status'];
    const csvRows = [
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
        item.cancellationType,
        item.status
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `healqr-report-${dateFrom}-to-${dateTo}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Sidebar */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeMenu="reports"
        onMenuChange={onMenuChange}
        onLogout={onLogout}
        activeAddOns={activeAddOns}
      />

      {/* Main Content */}
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-gray-700"
              onClick={() => onMenuChange?.('dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-400" />
              <h1 className="text-white">Report</h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:ml-64">
          {/* Filters Section */}
          <div className="mb-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-green-400" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Date From */}
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Date From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Date To */}
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Date To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Chamber */}
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Chamber</label>
                    <Select value={selectedChamber} onValueChange={setSelectedChamber}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {chambers.map(chamber => (
                          <SelectItem key={chamber.id} value={chamber.id} className="text-white">
                            {chamber.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Booking Type */}
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Booking Type</label>
                    <Select value={selectedBookingType} onValueChange={setSelectedBookingType}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {bookingTypes.map(type => (
                          <SelectItem key={type.id} value={type.id} className="text-white">
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Cancellation Type */}
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Cancellation Type</label>
                    <Select value={selectedCancellationType} onValueChange={setSelectedCancellationType}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {cancellationTypes.map(type => (
                          <SelectItem key={type.id} value={type.id} className="text-white">
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Export Button */}
                  <div className="space-y-2 flex items-end">
                    <Button
                      onClick={handleExport}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Summary */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-gray-400">
              {loading ? 'Loading...' : (
                <>Showing <span className="text-white">{filteredData.length}</span> results</>
              )}
            </p>
          </div>

          {/* Report Table */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 hover:bg-gray-800/50">
                      <TableHead className="text-gray-400">Booking Date</TableHead>
                      <TableHead className="text-gray-400">Appointment Date</TableHead>
                      <TableHead className="text-gray-400">Patient Name</TableHead>
                      <TableHead className="text-gray-400">Age</TableHead>
                      <TableHead className="text-gray-400">Chamber</TableHead>
                      <TableHead className="text-gray-400">Booking Type</TableHead>
                      <TableHead className="text-gray-400">Cancellation Type</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-400 py-8">
                          Loading report data...
                        </TableCell>
                      </TableRow>
                    ) : filteredData.length > 0 ? (
                      filteredData.map(item => (
                        <TableRow key={item.id} className="border-gray-700 hover:bg-gray-800/30">
                          <TableCell className="text-white">{item.bookingDate}</TableCell>
                          <TableCell className="text-white">{item.appointmentDate}</TableCell>
                          <TableCell className="text-white">{item.patientName}</TableCell>
                          <TableCell className="text-white">{item.age}</TableCell>
                          <TableCell className="text-white">{item.chamber}</TableCell>
                          <TableCell className="text-white">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                              item.bookingType === 'QR' 
                                ? 'bg-emerald-500/20 text-emerald-400' 
                                : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {item.bookingType}
                            </span>
                          </TableCell>
                          <TableCell className="text-white">
                            {item.cancellationType === 'None' ? (
                              <span className="text-gray-500">-</span>
                            ) : (
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                                item.cancellationType === 'Drop Out'
                                  ? 'bg-orange-500/20 text-orange-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {item.cancellationType}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-white">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                              item.status === 'Seen' 
                                ? 'bg-emerald-500/20 text-emerald-400' 
                                : item.status === 'Pending'
                                ? 'bg-blue-500/20 text-blue-400'
                                : item.status === 'Drop Out'
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {item.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                          No data found for the selected filters
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
