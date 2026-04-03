import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Menu, Calendar as CalendarIcon, Filter, TrendingUp, Users, QrCode, UserPlus, UserX, XCircle, ToggleLeft, Building2, UserMinus, Cake, User, FileText, Home } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState, useMemo, useEffect } from 'react';
import DashboardSidebar from './DashboardSidebar';

interface AnalyticsProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void | Promise<void>;
  activeAddOns?: string[];
}

interface AnalyticsData {
  totalScan: number;
  totalBooking: number;
  qrBooking: number;
  walkInBooking: number;
  dropOut: number;
  globalToggleCancellation: number;
  chamberCancellation: number;
  patientCancellation: number;
  ageData: Record<string, number>;
  genderData: Record<string, number>;
  purposeData: Record<string, number>;
}

export default function Analytics({ onMenuChange = () => {}, onLogout, activeAddOns = [] }: AnalyticsProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeFrame, setTimeFrame] = useState('last-7-days');
  const [selectedChamber, setSelectedChamber] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [chambers, setChambers] = useState<Array<{ id: string; name: string }>>([{ id: 'all', name: 'All Chambers' }]);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalScan: 0,
    totalBooking: 0,
    qrBooking: 0,
    walkInBooking: 0,
    dropOut: 0,
    globalToggleCancellation: 0,
    chamberCancellation: 0,
    patientCancellation: 0,
    ageData: {},
    genderData: {},
    purposeData: {}
  });

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
        // Error loading chambers
      }
    };

    loadChambers();
  }, []);

  // Load analytics data based on filters
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const { db } = await import('../lib/firebase/config');
        const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');

        // Get doctor data for plan dates
        const doctorRef = doc(db, 'doctors', userId);
        const doctorSnap = await getDoc(doctorRef);

        if (!doctorSnap.exists()) return;

        const doctorData = doctorSnap.data();

        // Calculate date range based on timeFrame
        let startDate: Date;
        let endDate: Date = new Date();

        if (timeFrame === 'current-month') {
          const now = new Date();
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
        } else if (timeFrame === 'custom') {
          if (!dateFrom || !dateTo) return;
          startDate = new Date(dateFrom);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
        } else {
          const days = timeFrame === 'last-7-days' ? 7 : timeFrame === 'last-30-days' ? 30 : 90;
          startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          startDate.setHours(0, 0, 0, 0);
        }

        // Query bookings
        const bookingsRef = collection(db, 'bookings');
        let q = query(bookingsRef, where('doctorId', '==', userId));

        const bookingsSnap = await getDocs(q);

        let totalScan = 0;
        let totalBooking = 0;
        let qrBooking = 0;
        let walkInBooking = 0;
        let dropOut = 0;
        let globalToggleCancellation = 0;
        let chamberCancellation = 0;
        let patientCancellation = 0;

        const ageGroups: Record<string, number> = {
          '0-18': 0,
          '19-30': 0,
          '31-45': 0,
          '46-60': 0,
          '60+': 0,
          'NA': 0
        };

        const genderCounts: Record<string, number> = {
          'Male': 0,
          'Female': 0,
          'Other': 0,
          'NA': 0
        };

        const purposeCounts: Record<string, number> = {
          'New Patient - Initial Consultation': 0,
          'Existing Patient - New Treatment (First Visit)': 0,
          'Report Review (Within 5 Days of Initial Visit)': 0,
          'Follow-up Consultation (After 5 Days)': 0,
          'Routine Check-up': 0,
          'Emergency Consultation': 0,
          'NA': 0
        };

        bookingsSnap.docs.forEach(doc => {
          const data = doc.data();

          // Handle different date field formats
          let bookingDate: Date | null = null;
          if (data.createdAt?.toDate) {
            bookingDate = data.createdAt.toDate();
          } else if (data.date instanceof Date) {
            bookingDate = data.date;
          } else if (data.date?.toDate) {
            bookingDate = data.date.toDate();
          } else if (data.appointmentDate) {
            // For advance bookings, use appointmentDate string
            bookingDate = new Date(data.appointmentDate);
          }

          if (!bookingDate || isNaN(bookingDate.getTime())) return; // Skip if no valid date

          // Filter by date range
          if (bookingDate < startDate || bookingDate > endDate) return;

          // Filter by chamber
          if (selectedChamber !== 'all' && data.chamberId?.toString() !== selectedChamber) return;

          const isQRBooking = data.type !== 'walkin_booking';
          const isCancelled = data.status === 'cancelled' || data.isCancelled === true;

          // Count total scans (all QR bookings including cancelled)
          if (isQRBooking) {
            totalScan++;
          }

          // Count total bookings (non-cancelled)
          if (!isCancelled) {
            totalBooking++;

            if (isQRBooking) {
              qrBooking++;
            } else {
              walkInBooking++;
            }

            // Demographics (only for non-cancelled)
            const age = data.age;
            if (!age || age === 0) {
              ageGroups['NA']++;
            } else if (age <= 18) {
              ageGroups['0-18']++;
            } else if (age <= 30) {
              ageGroups['19-30']++;
            } else if (age <= 45) {
              ageGroups['31-45']++;
            } else if (age <= 60) {
              ageGroups['46-60']++;
            } else {
              ageGroups['60+']++;
            }

            const gender = data.gender;
            if (!gender || gender === '') {
              genderCounts['NA']++;
            } else {
              const genderKey = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
              genderCounts[genderKey] = (genderCounts[genderKey] || 0) + 1;
            }

            // Purpose of Visit - from both QR (purposeOfVisit) and Walk-in (purposeOfVisit)
            const purpose = data.purposeOfVisit;
            if (!purpose || purpose === '') {
              purposeCounts['NA']++;
            } else {
              purposeCounts[purpose] = (purposeCounts[purpose] || 0) + 1;
            }
          }

          // Count cancellations by type
          if (isCancelled) {
            const cancelType = (data.cancellationType || '').toUpperCase();
            const cancelReason = data.cancellationReason || '';

            if (cancelType === 'GLOBAL TOGGLE' || cancelType === 'GLOBAL_BLOCKED' || cancelReason.includes('global toggle') || cancelReason.includes('global_planned_off') || cancelReason.includes('Global booking disabled')) {
              globalToggleCancellation++;
            } else if (cancelType === 'CHAMBER TOGGLE' || cancelType === 'CHAMBER_BLOCKED' || cancelReason.includes('chamber') || cancelReason.includes('chamber_deactivated')) {
              chamberCancellation++;
            } else if (cancelType === 'PATIENT INDIVIDUAL TOGGLE' || cancelReason.includes('patient') || data.cancelledBy === 'patient') {
              patientCancellation++;
            }
          }

          // Count drop-outs (eye icon not pressed)
          if (!isCancelled && data.eyeIconPressed === false) {
            dropOut++;
          }
        });

        setAnalyticsData({
          totalScan,
          totalBooking,
          qrBooking,
          walkInBooking,
          dropOut,
          globalToggleCancellation,
          chamberCancellation,
          patientCancellation,
          ageData: ageGroups,
          genderData: genderCounts,
          purposeData: purposeCounts
        });

      } catch (error) {
        // Error loading analytics
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [timeFrame, selectedChamber, dateFrom, dateTo]);

  // Transform analytics data for charts
  const ageData = useMemo(() => {
    return Object.entries(analyticsData.ageData).map(([age, count]) => ({
      age,
      count
    }));
  }, [analyticsData.ageData]);

  const genderData = useMemo(() => {
    return [
      { name: 'Male', value: analyticsData.genderData['Male'] || 0, color: '#10b981' },
      { name: 'Female', value: analyticsData.genderData['Female'] || 0, color: '#6366f1' },
      { name: 'Other', value: analyticsData.genderData['Other'] || 0, color: '#8b5cf6' },
      { name: 'NA', value: analyticsData.genderData['NA'] || 0, color: '#6b7280' },
    ].filter(item => item.value > 0);
  }, [analyticsData.genderData]);

  const purposeData = useMemo(() => {
    const labelMap: Record<string, string> = {
      'New Patient - Initial Consultation': 'New Patient',
      'Existing Patient - New Treatment (First Visit)': 'Existing Patient',
      'Report Review (Within 5 Days of Initial Visit)': 'Report Review',
      'Follow-up Consultation (After 5 Days)': 'Follow-up',
      'Routine Check-up': 'Routine Check-up',
      'Emergency Consultation': 'Emergency',
      'NA': 'NA'
    };

    return Object.entries(analyticsData.purposeData).map(([purpose, count]) => ({
      purpose: labelMap[purpose] || purpose,
      count
    }));
  }, [analyticsData.purposeData]);

  const visitTypeData = useMemo(() => [
    { name: 'Walk In', value: analyticsData.walkInBooking, color: '#3b82f6' },
    { name: 'QR Booking', value: analyticsData.qrBooking, color: '#10b981' },
  ], [analyticsData.walkInBooking, analyticsData.qrBooking]);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Sidebar */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeMenu="analytics"
        onMenuChange={onMenuChange}
        onLogout={onLogout}
        activeAddOns={activeAddOns}
      />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <div className="border-b border-gray-800 bg-[#0a0f1a]/95 backdrop-blur sticky top-0 z-40">
          <div className="px-4 lg:px-8 py-4">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-gray-400 hover:text-white"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </Button>
              <div>
                <h1 className="text-white">Analytics</h1>
                <p className="text-gray-400 text-sm mt-1">Track your booking performance and insights</p>
              </div>
            </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Time Frame */}
            <Select value={timeFrame} onValueChange={setTimeFrame}>
              <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Time Frame" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem value="current-month">Current Month</SelectItem>
                <SelectItem value="custom">Custom Date Range</SelectItem>
                <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                <SelectItem value="last-90-days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Date Range */}
            {timeFrame === 'custom' && (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-md text-sm"
                    placeholder="From"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-md text-sm"
                    placeholder="To"
                  />
                </div>
              </>
            )}

            {/* Chamber Filter */}
            <Select value={selectedChamber} onValueChange={setSelectedChamber}>
              <SelectTrigger className="w-[200px] bg-gray-800 border-gray-700 text-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by Chamber" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                {chambers.map(chamber => (
                  <SelectItem key={chamber.id} value={chamber.id}>
                    {chamber.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
        {/* KPI Cards - Booking Metrics */}
        <div className="mb-8">
          <h2 className="text-white mb-4">Booking Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Scan */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Total Scan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl text-white">{loading ? '...' : analyticsData.totalScan.toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">QR Code scans</p>
              </CardContent>
            </Card>

            {/* Total Booking */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Total Booking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl text-white">{loading ? '...' : analyticsData.totalBooking.toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">Confirmed appointments</p>
              </CardContent>
            </Card>

            {/* QR Booking */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  QR Booking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl text-white">{loading ? '...' : analyticsData.qrBooking.toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">Via QR code scan</p>
              </CardContent>
            </Card>

            {/* Walk In Booking */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  Walk In Booking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl text-white">{loading ? '...' : analyticsData.walkInBooking.toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">Added by doctor</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Cancellation Metrics */}
        <div className="mb-8">
          <h2 className="text-white mb-4">Cancellation Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Drop Out */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                  <UserX className="w-4 h-4 text-orange-400" />
                  Drop Out
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl text-white">{loading ? '...' : analyticsData.dropOut}</div>
                <p className="text-xs text-gray-500 mt-1">Eye icon not pressed</p>
              </CardContent>
            </Card>

            {/* Global Toggle Cancellation */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                  <ToggleLeft className="w-4 h-4 text-red-400" />
                  Using Global Toggle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl text-white">{loading ? '...' : analyticsData.globalToggleCancellation}</div>
                <p className="text-xs text-gray-500 mt-1">Global deactivation</p>
              </CardContent>
            </Card>

            {/* Chamber Cancellation */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-red-400" />
                  Using Chamber Toggle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl text-white">{loading ? '...' : analyticsData.chamberCancellation}</div>
                <p className="text-xs text-gray-500 mt-1">Chamber deactivated</p>
              </CardContent>
            </Card>

            {/* Patient Cancellation */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                  <UserMinus className="w-4 h-4 text-red-400" />
                  Using Patient Toggle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl text-white">{loading ? '...' : analyticsData.patientCancellation}</div>
                <p className="text-xs text-gray-500 mt-1">Patient cancelled</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Demographics */}
        <div className="mb-8">
          <h2 className="text-white mb-4">Patient Demographics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Age Distribution */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Cake className="w-5 h-5 text-emerald-400" />
                  Age Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="age" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gender Distribution */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-400" />
                  Gender Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Visit Details */}
        <div className="mb-8">
          <h2 className="text-white mb-4">Visit Details</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purpose Breakdown */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  Purpose of Visit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={purposeData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9ca3af" />
                    <YAxis
                      type="category"
                      dataKey="purpose"
                      stroke="#9ca3af"
                      width={140}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Home Call vs Chamber Walk In */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Home className="w-5 h-5 text-emerald-400" />
                  Visit Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={visitTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {visitTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

