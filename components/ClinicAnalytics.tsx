import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Menu, Filter, TrendingUp, Users, QrCode, UserPlus, UserX, Building2, UserMinus, Cake, User, FileText, Home, ToggleLeft } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useState, useMemo, useEffect } from 'react';
import { decrypt } from '../utils/encryptionService';
import { auth } from '../lib/firebase/config';
import ClinicSidebar from './ClinicSidebar';

interface ClinicAnalyticsProps {
  onMenuChange: (menu: string) => void;
  onLogout: () => void | Promise<void>;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  clinicId?: string;
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

export default function ClinicAnalytics({
  onMenuChange,
  onLogout,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  clinicId: propClinicId,
  activeAddOns = []
}: ClinicAnalyticsProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeFrame, setTimeFrame] = useState('last-7-days');
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string }>>([{ id: 'all', name: 'All Doctors' }]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
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

  // Handle mounting state for Recharts stability
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load analytics data based on filters
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const userId = propClinicId || auth?.currentUser?.uid || localStorage.getItem('userId');

        // Branch manager and assistant support
        const isLocationManager = localStorage.getItem('healqr_is_location_manager') === 'true';
        const isAssistant = localStorage.getItem('healqr_is_assistant') === 'true';
        const locationManagerBranchId = localStorage.getItem('healqr_location_id') || '';
        const resolvedClinicId = isLocationManager
          ? (localStorage.getItem('healqr_parent_clinic_id') || userId)
          : isAssistant
          ? (localStorage.getItem('healqr_assistant_doctor_id') || userId)
          : userId;


        if (!userId) {
          console.warn("⚠️ [ClinicAnalytics] Waiting for userId...");
          const checkAuth = setTimeout(() => {
            if (!auth?.currentUser?.uid && !propClinicId) {
              setLoading(false);
            }
          }, 3000);
          return () => clearTimeout(checkAuth);
        }

        const { db } = await import('../lib/firebase/config');
        if (!db) return;

        const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');
        const clinicRef = doc(db, 'clinics', resolvedClinicId!);
        const clinicSnap = await getDoc(clinicRef);
        let linkedDoctorIds: string[] = [];
        let allDoctorsList: Array<{ id: string; name: string }> = [{ id: 'all', name: 'All Doctors' }];

        if (clinicSnap.exists()) {
          const cData = clinicSnap.data();
          if (cData.linkedDoctorsDetails) {
            linkedDoctorIds = cData.linkedDoctorsDetails.map((d: any) => d.doctorId || d.uid).filter(Boolean);
            const docsWithNames = cData.linkedDoctorsDetails.map((d: any) => ({
              id: d.doctorId || d.uid,
              name: d.doctorName || d.name || 'Unknown Doctor'
            })).filter((d: any) => d.id);
            allDoctorsList = [{ id: 'all', name: 'All Doctors' }, ...docsWithNames];
          }
        }
        setDoctors(allDoctorsList);

        let startDate: Date;
        let endDate: Date = new Date();
        endDate.setHours(23, 59, 59, 999);

        if (timeFrame === 'current-month') {
          const now = new Date();
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
        } else if (timeFrame === 'today') {
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
        } else if (timeFrame === 'upcoming') {
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date();
          endDate.setDate(endDate.getDate() + 30);
          endDate.setHours(23, 59, 59, 999);
        } else if (timeFrame === 'custom') {
          if (!dateFrom || !dateTo) {
             setLoading(false);
             return;
          }
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

        const bookingsRef = collection(db, 'bookings');
        const bookingsSnap = await getDocs(bookingsRef);

        // Build branch chamber IDs for branch managers
        let branchChamberIds: Set<string> | null = null;
        if (isLocationManager && locationManagerBranchId) {
          try {
            const allChamberIds = new Set<string>();
            for (const docId of linkedDoctorIds) {
              const doctorSnap = await getDoc(doc(db, 'doctors', docId));
              if (doctorSnap.exists()) {
                const chambers = doctorSnap.data().chambers || [];
                chambers.forEach((c: any) => {
                  if (c.clinicId !== resolvedClinicId) return;
                  const cLocId = c.clinicLocationId || c.locationId || '';
                  if (cLocId === locationManagerBranchId) {
                    allChamberIds.add(String(c.id));
                  }
                });
              }
            }
            if (allChamberIds.size > 0) branchChamberIds = allChamberIds;
          } catch (e) { /* ignore */ }
        }

        let totalScan = 0;
        // Skip qrScans for branch managers (Firestore rules restrict to clinic owner)
        if (!isLocationManager) {
        try {
          const scansQuery = query(
            collection(db, 'qrScans'),
            where('clinicId', '==', resolvedClinicId),
            where('scannedBy', '==', 'clinic')
          );
          const scansSnap = await getDocs(scansQuery);
          const filteredScans = scansSnap.docs.filter(sDoc => {
            const sData = sDoc.data();
            let scanDate: Date | null = null;
            if (sData.createdAt?.toDate) scanDate = sData.createdAt.toDate();
            else if (sData.timestamp?.toDate) scanDate = sData.timestamp.toDate();
            else if (sData.date) scanDate = new Date(sData.date);
            if (!scanDate || isNaN(scanDate.getTime())) return true;
            return scanDate >= startDate && scanDate <= endDate;
          });
          totalScan = filteredScans.length;
        } catch (scanError) {
          console.error('Error fetching scans:', scanError);
        }
        }

        let totalBooking = 0;
        let qrBooking = 0;
        let walkInBooking = 0;
        let dropOut = 0;
        let globalToggleCancellation = 0;
        let chamberCancellation = 0;
        let patientCancellation = 0;

        const ageGroups: Record<string, number> = { '0-18': 0, '19-30': 0, '31-45': 0, '46-60': 0, '60+': 0, 'NA': 0 };
        const genderCounts: Record<string, number> = { 'Male': 0, 'Female': 0, 'Other': 0, 'NA': 0 };
        const purposeCounts: Record<string, number> = { 'New Patient': 0, 'Existing Patient': 0, 'Report Review': 0, 'Follow-up': 0, 'Routine Check-up': 0, 'Emergency': 0, 'NA': 0 };

        bookingsSnap.docs.forEach(docSnap => {
          const data = docSnap.data();
          const bDocId = data.doctorId || data.uid;
          const bClinicId = data.clinicId;
          const belongsToClinic = bClinicId === resolvedClinicId || linkedDoctorIds.includes(bDocId);
          if (!belongsToClinic) return;

          // Branch managers: only count bookings for their branch
          if (isLocationManager && locationManagerBranchId) {
            const bLocId = data.clinicLocationId || data.locationId || '';
            if (bLocId) {
              if (bLocId !== locationManagerBranchId) return;
            } else if (branchChamberIds && branchChamberIds.size > 0) {
              if (!branchChamberIds.has(String(data.chamberId))) return;
            } else {
              return;
            }
          }

          if (selectedDoctor !== 'all' && bDocId !== selectedDoctor) return;

          let bookingDate: Date | null = null;
          try {
            if (data.createdAt?.toDate) bookingDate = data.createdAt.toDate();
            else if (data.date instanceof Date) bookingDate = data.date;
            else if (data.date?.toDate) bookingDate = data.date.toDate();
            else if (data.appointmentDate) {
              const dateStr = data.appointmentDate;
              if (typeof dateStr === 'string' && dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts[0].length === 4) bookingDate = new Date(dateStr);
                else if (parts[2].length === 4) bookingDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
              }
              if (!bookingDate || isNaN(bookingDate.getTime())) bookingDate = new Date(dateStr);
            }
          } catch (e) {}

          if (!bookingDate || isNaN(bookingDate.getTime())) return;
          const bDateISO = bookingDate.toISOString().split('T')[0];
          const sDateISO = startDate.toISOString().split('T')[0];
          const eDateISO = endDate.toISOString().split('T')[0];
          if (bDateISO < sDateISO || bDateISO > eDateISO) return;

          const isCancelled = data.status === 'cancelled' || data.isCancelled === true;
          if (!isCancelled) {
            totalBooking++;
            const bookingSource = data.bookingSource;
            const isQR = bookingSource === 'clinic_qr' || bookingSource === 'doctor_qr' || (data.type === 'qr_booking' && !bookingSource);
            if (isQR) qrBooking++; else walkInBooking++;

            try {
              const decryptedAge = decrypt(data.age_encrypted || data.age?.toString() || '');
              const age = parseInt(decryptedAge);
              if (!decryptedAge || isNaN(age) || age === 0) ageGroups['NA']++;
              else if (age <= 18) ageGroups['0-18']++;
              else if (age <= 30) ageGroups['19-30']++;
              else if (age <= 45) ageGroups['31-45']++;
              else if (age <= 60) ageGroups['46-60']++;
              else ageGroups['60+']++;
            } catch (e) { ageGroups['NA']++; }

            try {
              const decryptedGender = decrypt(data.gender_encrypted || data.gender || '');
              if (!decryptedGender) genderCounts['NA']++;
              else {
                const g = decryptedGender.toLowerCase();
                if (g.startsWith('m')) genderCounts['Male']++;
                else if (g.startsWith('f')) genderCounts['Female']++;
                else if (g.startsWith('o')) genderCounts['Other']++;
                else genderCounts['NA']++;
              }
            } catch (e) { genderCounts['NA']++; }

            try {
              const decryptedPurpose = decrypt(data.purposeOfVisit_encrypted || data.purposeOfVisit || '');
              if (!decryptedPurpose) purposeCounts['NA']++;
              else {
                const p = decryptedPurpose.toLowerCase();
                if (p.includes('initial') || p.includes('new patient')) purposeCounts['New Patient']++;
                else if (p.includes('existing') || p.includes('old patient') || p.includes('already')) purposeCounts['Existing Patient']++;
                else if (p.includes('report') || p.includes('review')) purposeCounts['Report Review']++;
                else if (p.includes('follow-up') || p.includes('followup') || p.includes('f/u')) purposeCounts['Follow-up']++;
                else if (p.includes('routine') || p.includes('check') || p.includes('regular')) purposeCounts['Routine Check-up']++;
                else if (p.includes('emergency') || p.includes('urgent') || p.includes('sos')) purposeCounts['Emergency']++;
                else purposeCounts['NA']++;
              }
            } catch (e) { purposeCounts['NA']++; }
          } else {
            const cancelType = (data.cancellationType || '').toUpperCase();
            const cancelReason = data.cancellationReason || '';
            const cancelledBy = data.cancelledBy || '';
            if (cancelType === 'GLOBAL TOGGLE' || cancelType === 'GLOBAL_BLOCKED' || cancelReason.includes('global toggle') || cancelReason.includes('global_planned_off')) globalToggleCancellation++;
            else if (cancelType === 'CHAMBER TOGGLE' || cancelType === 'CHAMBER_BLOCKED' || cancelReason.includes('chamber') || cancelReason.includes('chamber_deactivated')) chamberCancellation++;
            else if (cancelType === 'PATIENT INDIVIDUAL TOGGLE' || cancelledBy === 'patient') patientCancellation++;
          }

          if (!isCancelled && (data.isMarkedSeen === false)) {
             const now = new Date();
             const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
             const apptDateStr = data.appointmentDate;
             if (apptDateStr && apptDateStr < todayStr) dropOut++;
          }
        });

        setAnalyticsData({
          totalScan, totalBooking, qrBooking, walkInBooking, dropOut,
          globalToggleCancellation, chamberCancellation, patientCancellation,
          ageData: ageGroups, genderData: genderCounts, purposeData: purposeCounts
        });
      } catch (error) { console.error('Error loading analytics:', error);
      } finally { setLoading(false); }
    };
    loadAnalytics();
  }, [timeFrame, selectedDoctor, dateFrom, dateTo, propClinicId]);

  const ageChartData = useMemo(() => Object.entries(analyticsData.ageData).map(([age, count]) => ({ age, count })), [analyticsData.ageData]);
  const genderChartData = useMemo(() => [
    { name: 'Male', value: analyticsData.genderData['Male'] || 0, color: '#10b981' },
    { name: 'Female', value: analyticsData.genderData['Female'] || 0, color: '#6366f1' },
    { name: 'Other', value: analyticsData.genderData['Other'] || 0, color: '#8b5cf6' },
    { name: 'NA', value: analyticsData.genderData['NA'] || 0, color: '#6b7280' },
  ].filter(item => item.value > 0), [analyticsData.genderData]);
  const purposeChartData = useMemo(() => Object.entries(analyticsData.purposeData).filter(([n]) => n !== 'NA').map(([purpose, count]) => ({ purpose, count })), [analyticsData.purposeData]);
  const visitTypeChartData = useMemo(() => [
    { name: 'Walk In', value: analyticsData.walkInBooking, color: '#3b82f6' },
    { name: 'QR Booking', value: analyticsData.qrBooking, color: '#10b981' },
  ], [analyticsData.walkInBooking, analyticsData.qrBooking]);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col lg:flex-row">
      <ClinicSidebar activeMenu="analytics" onMenuChange={onMenuChange} onLogout={onLogout} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activeAddOns={activeAddOns} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed?.(!isSidebarCollapsed)} />
      <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} flex flex-col min-h-screen relative`}>
        <header className="bg-[#0a0f1a] border-b border-gray-800/50 px-4 md:px-8 py-8 flex flex-col gap-6 w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon" className="lg:hidden text-blue-500 hover:bg-zinc-900" onClick={() => setSidebarOpen(true)}><Menu className="w-6 h-6" /></Button>
               <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Analytics Dashboard</h1>
                  <p className="text-gray-400 text-sm mt-1">Practice performance & Engagement</p>
               </div>
            </div>
            {!loading && (
               <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                 <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] text-blue-500 font-mono font-bold uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                      LIVE: {analyticsData.totalBooking} Bookings / {analyticsData.totalScan} Scans
                    </span>
                 </div>
                 <span className="text-[8px] text-gray-600 font-mono">Build: 2026-02-23_13:58 (Explicit Size)</span>
               </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={timeFrame} onValueChange={setTimeFrame}>
              <SelectTrigger className="w-[140px] md:w-[180px] bg-gray-900/50 border-gray-700 text-gray-300"><SelectValue placeholder="Select period" /></SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-gray-300">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="upcoming">Upcoming (30d)</SelectItem>
                <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                <SelectItem value="current-month">Current Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            {timeFrame === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-white px-2 py-1 rounded text-xs h-9" />
                <span className="text-gray-500 text-xs">to</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-white px-2 py-1 rounded text-xs h-9" />
              </div>
            )}
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-800 text-white text-xs h-9"><Filter className="w-3.5 h-3.5 mr-2 text-blue-500" /><SelectValue placeholder="All Doctors" /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-white">{doctors.map(doc => (<SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-8 py-8 space-y-12 max-w-7xl overflow-y-auto custom-scrollbar">
          <section>
            <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" />Booking Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Scans', value: analyticsData.totalScan, icon: QrCode, desc: 'Clinic QR interactions', color: 'text-blue-400' },
                { label: 'Total Bookings', value: analyticsData.totalBooking, icon: Users, desc: 'Aggregated linked patients', color: 'text-blue-400' },
                { label: 'QR Bookings', value: analyticsData.qrBooking, icon: QrCode, desc: 'Via linked doctors', color: 'text-purple-400' },
                { label: 'Walk-ins', value: analyticsData.walkInBooking, icon: UserPlus, desc: 'Manual entries', color: 'text-orange-400' },
              ].map((kpi, i) => (
                <Card key={i} className="bg-gray-800/60 border-gray-700/80 hover:border-blue-500/50 transition-all duration-300 group backdrop-blur-md shadow-2xl min-h-[140px]">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                       <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{kpi.label}</span>
                       <div className={`p-2 rounded-lg bg-gray-900 group-hover:scale-110 transition-transform ${kpi.color}`}><kpi.icon className="w-4 h-4" /></div>
                    </div>
                    <div className="text-3xl font-bold text-white tracking-tight">{loading ? '...' : (kpi.value || 0).toLocaleString()}</div>
                    <p className="text-[10px] text-gray-500 mt-2 font-medium opacity-70">{kpi.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2"><UserX className="w-5 h-5 text-red-500" />Cancellation Metrics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
               {[
                { label: 'Drop Outs', value: analyticsData.dropOut, icon: UserMinus, desc: 'No show', color: 'text-orange-500' },
                { label: 'Global Toggle', value: analyticsData.globalToggleCancellation, icon: ToggleLeft, desc: 'Global off', color: 'text-red-400' },
                { label: 'Chamber Toggle', value: analyticsData.chamberCancellation, icon: Building2, desc: 'Chamber off', color: 'text-red-500' },
                { label: 'Patient Cancelled', value: analyticsData.patientCancellation, icon: UserX, desc: 'Patient triggered', color: 'text-zinc-400' },
              ].map((kpi, i) => (
                <Card key={i} className="bg-gray-800/40 border-gray-700/50 hover:border-red-500/30 transition-all duration-300 group backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{kpi.label}</span>
                       <div className={`p-2 rounded-lg bg-gray-900/50 group-hover:scale-110 transition-transform ${kpi.color}`}><kpi.icon className="w-4 h-4" /></div>
                    </div>
                    <div className="text-2xl font-bold text-white tracking-tight">{loading ? '...' : kpi.value}</div>
                    <p className="text-[10px] text-gray-500 mt-1 font-medium">{kpi.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-gray-800/40 border-gray-700/50 overflow-hidden backdrop-blur-sm">
              <CardHeader className="border-b border-gray-700/50 pb-3"><CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-500"><Cake className="w-4 h-4" />Age Distribution</CardTitle></CardHeader>
              <CardContent className="pt-6 min-h-[350px]">
                {loading ? (<div className="h-[300px] flex items-center justify-center text-gray-600">Loading...</div>) : ageChartData.length === 0 ? (<div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">No data</div>) : !isMounted ? (<div className="h-[300px] flex items-center justify-center text-gray-600">Initializing...</div>) : (
                  <div className="h-[300px] w-full flex flex-col gap-4">
                    <div className="h-[260px] w-full flex items-center justify-center border border-white/5 bg-gray-900/20 rounded-lg overflow-x-auto">
                      <BarChart width={500} height={250} data={ageChartData} key={`age-${ageChartData.length}`}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="age" stroke="#9ca3af" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', color: '#fff' }} />
                        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 border-t border-gray-700/30 pt-4">
                       {ageChartData.map(d => (<span key={d.age}>{d.age}: <span className="text-white font-bold">{d.count}</span></span>))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-800/40 border-gray-700/50 overflow-hidden backdrop-blur-sm">
              <CardHeader className="border-b border-gray-700/50 pb-3"><CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-500"><User className="w-4 h-4" />Gender Distribution</CardTitle></CardHeader>
              <CardContent className="pt-6 min-h-[350px]">
                {loading ? (<div className="h-[300px] flex items-center justify-center text-gray-600">Loading...</div>) : genderChartData.length === 0 ? (<div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">No data</div>) : !isMounted ? (<div className="h-[300px] flex items-center justify-center text-gray-600">Initializing...</div>) : (
                  <div className="h-[300px] w-full flex flex-col gap-4">
                    <div className="h-[260px] w-full flex items-center justify-center border border-white/5 bg-gray-900/20 rounded-lg">
                      <PieChart width={300} height={250} key={`gender-${genderChartData.length}`}>
                        <Pie data={genderChartData} cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                          {genderChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="none" />))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', color: '#fff' }} />
                      </PieChart>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 text-[10px] text-gray-500 border-t border-gray-700/30 pt-4">
                       {genderChartData.map(d => (<div key={d.name} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} /><span>{d.name}: <span className="text-white font-bold">{d.value}</span></span></div>))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-800/40 border-gray-700/50 overflow-hidden backdrop-blur-sm lg:col-span-2">
              <CardHeader className="border-b border-gray-700/50 pb-3"><CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-500"><FileText className="w-4 h-4" />Purpose of Visit Distribution</CardTitle></CardHeader>
              <CardContent className="pt-6 min-h-[350px]">
                {!isMounted ? (<div className="h-[300px] flex items-center justify-center text-gray-600">Loading...</div>) : (
                   <div className="h-[300px] w-full flex flex-col gap-4">
                     <div className="h-[260px] w-full flex items-center justify-center border border-white/5 bg-gray-900/20 rounded-lg overflow-x-auto">
                       <BarChart width={600} height={250} data={purposeChartData} layout="vertical" margin={{ left: 40, right: 40 }} key={`purpose-${purposeChartData.length}`}>
                         <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                         <XAxis type="number" stroke="#9ca3af" fontSize={10} axisLine={false} tickLine={false} />
                         <YAxis type="category" dataKey="purpose" stroke="#9ca3af" width={120} fontSize={10} axisLine={false} tickLine={false} />
                         <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', color: '#fff' }} />
                         <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                       </BarChart>
                     </div>
                     <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500 border-t border-gray-700/30 pt-2">
                        {purposeChartData.map(d => (<span key={d.purpose}>{d.purpose}: <span className="text-white font-bold">{d.count}</span></span>))}
                     </div>
                   </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-800/40 border-gray-700/50 overflow-hidden backdrop-blur-sm lg:col-span-2">
              <CardHeader className="border-b border-gray-700/50 pb-3"><CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-500"><Home className="w-4 h-4" />Visit Type Breakdown</CardTitle></CardHeader>
              <CardContent className="pt-6 min-h-[350px]">
                {!isMounted ? (<div className="h-[300px] flex items-center justify-center text-gray-600">Loading...</div>) : (
                  <div className="h-[300px] w-full flex flex-col gap-4">
                    <div className="h-[260px] w-full flex items-center justify-center border border-white/5 bg-gray-900/20 rounded-lg">
                      <PieChart width={300} height={250} key={`visit-${visitTypeChartData.length}`}>
                        <Pie data={visitTypeChartData} cx="50%" cy="45%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                          {visitTypeChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="none" />))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', color: '#fff' }} />
                      </PieChart>
                    </div>
                    <div className="flex justify-center gap-6 text-[10px] text-gray-500 border-t border-gray-700/30 pt-4">
                       {visitTypeChartData.map(d => (<div key={d.name} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} /><span>{d.name}: <span className="text-white font-bold">{d.value}</span></span></div>))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

