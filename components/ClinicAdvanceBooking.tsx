import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Menu, Calendar, MapPin, Clock, ArrowLeft, Phone, Users, ChevronDown, ChevronRight } from 'lucide-react';
import ClinicSidebar from './ClinicSidebar';
import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { decrypt } from '../utils/encryptionService';
import { toast } from 'sonner';

interface ClinicAdvanceBookingProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
  activeAddOns?: string[];
}

interface Doctor {
  doctorId?: string;
  uid?: string;
  name: string;
  specialties?: string[];
}

interface Booking {
  id: string;
  bookingId: string;
  patientName: string;
  whatsappNumber: string;
  age: any;
  gender: string;
  appointmentDate: string;
  chamberId: number;
  chamberName: string;
  visitType: string;
  purposeOfVisit?: string;
  consultationType: string;
  status: string;
  startTime?: string;
}

interface SessionGroup {
  date: string;
  sessions: {
    chamberId: number;
    chamberName: string;
    startTime?: string;
    endTime?: string;
    bookings: Booking[];
  }[];
}

export default function ClinicAdvanceBooking({
  onMenuChange,
  onLogout,
  isSidebarCollapsed = false,
  setIsSidebarCollapsed,
  activeAddOns = []
}: ClinicAdvanceBookingProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [linkedDoctors, setLinkedDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [rangeType, setRangeType] = useState<'3days' | '7days' | 'custom'>('7days');
  const [agenda, setAgenda] = useState<SessionGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [doctorInitialLoading, setDoctorInitialLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  // Initialize dates
  useEffect(() => {
    const today = new Date();
    const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    const end = new Date(today);
    end.setDate(today.getDate() + 6); // Next 7 days by default
    const endStr = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    setDateRange({ start: todayStr, end: endStr });
  }, []);

  // Load clinic's linked doctors
  useEffect(() => {
    const loadClinicDoctors = async () => {
      try {
        const currentAuth = auth;
        const currentDb = db;
        if (!currentAuth || !currentDb) return;
        const currentUser = currentAuth.currentUser;
        if (!currentUser) return;

        // Resolve clinic ID for branch managers and assistants
        const isLocationManager = localStorage.getItem('healqr_is_location_manager') === 'true';
        const isAssistant = localStorage.getItem('healqr_is_assistant') === 'true';
        const resolvedClinicId = isLocationManager
          ? (localStorage.getItem('healqr_parent_clinic_id') || currentUser.uid)
          : isAssistant
          ? (localStorage.getItem('healqr_assistant_doctor_id') || currentUser.uid)
          : currentUser.uid;

        const clinicRef = doc(currentDb, 'clinics', resolvedClinicId);
        const clinicSnap = await getDoc(clinicRef);

        if (clinicSnap.exists()) {
          const data = clinicSnap.data();
          const doctors = data.linkedDoctorsDetails || [];
          setLinkedDoctors(doctors);
          if (doctors.length > 0) {
            // Robust selection: check both doctorId and uid
            const firstDocId = doctors[0].doctorId || doctors[0].uid;
            if (firstDocId) setSelectedDoctorId(firstDocId);
          }
        }
      } catch (error) {
        console.error('Error loading clinic doctors:', error);
        toast.error('Failed to load linked doctors');
      } finally {
        setDoctorInitialLoading(false);
      }
    };

    loadClinicDoctors();
  }, []);

  // Set Range Quick Buttons
  const handleRangeChange = (type: '3days' | '7days' | 'custom') => {
    setRangeType(type);
    const today = new Date();
    const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    if (type === '3days') {
      const end = new Date(today);
      end.setDate(today.getDate() + 2);
      const endStr = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      setDateRange({ start: todayStr, end: endStr });
    } else if (type === '7days') {
      const end = new Date(today);
      end.setDate(today.getDate() + 6);
      const endStr = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      setDateRange({ start: todayStr, end: endStr });
    }
  };

  // Main Agenda Fetcher
  useEffect(() => {
    if (!selectedDoctorId || !dateRange.start || !dateRange.end || !db) return;

    const fetchAgenda = async () => {
      const currentDb = db;
      if (!selectedDoctorId || !dateRange.start || !dateRange.end || !currentDb) return;

      try {
        setLoading(true);
        const currentAuth = auth;
        if (!currentAuth) return;
        const currentUser = currentAuth.currentUser;
        if (!currentUser) return;

        // Resolve clinic ID for branch managers (use parent clinic ID)
        const isLocationManager = localStorage.getItem('healqr_is_location_manager') === 'true';
        const locationManagerBranchId = localStorage.getItem('healqr_location_id') || '';
        const resolvedClinicId = isLocationManager
          ? (localStorage.getItem('healqr_parent_clinic_id') || currentUser.uid)
          : currentUser.uid;

        // For branch managers, build a set of chamberIds belonging to their branch
        let branchChamberIds: Set<string> | null = null;
        if (isLocationManager && locationManagerBranchId && selectedDoctorId) {
          try {
            const doctorSnap = await getDoc(doc(currentDb, 'doctors', selectedDoctorId));
            if (doctorSnap.exists()) {
              const chambers = doctorSnap.data().chambers || [];
              branchChamberIds = new Set(
                chambers
                  .filter((c: any) => {
                    if (c.clinicId !== resolvedClinicId) return false;
                    const cLocId = c.clinicLocationId || c.locationId || '';
                    return cLocId === locationManagerBranchId;
                  })
                  .map((c: any) => String(c.id))
              );
            }
          } catch (e) { /* ignore */ }
        }

        // 1. Fetch all bookings for this clinic
        // We filter by doctorId client-side to handle potential ID property mismatches
        const bookingsRef = collection(currentDb, 'bookings');
        const q = query(
          bookingsRef,
          where('clinicId', '==', resolvedClinicId)
        );
        const snapshot = await getDocs(q);

        // 2. Map and filter in-memory
        const rawBookings: Booking[] = snapshot.docs
          .map(docSnap => {
            const data = docSnap.data();
            if (data.status === 'cancelled') return null;

            // Handle Doctor ID Mismatch (doctorId vs uid)
            const bDocId = data.doctorId || data.uid;
            if (bDocId !== selectedDoctorId) return null;

            // Branch managers: only show bookings for their branch
            if (isLocationManager && locationManagerBranchId) {
              const bLocId = data.clinicLocationId || data.locationId || '';
              if (bLocId) {
                if (bLocId !== locationManagerBranchId) return null;
              } else if (branchChamberIds && branchChamberIds.size > 0) {
                if (!branchChamberIds.has(String(data.chamberId))) return null;
              } else {
                return null;
              }
            }

            // Robust Date Extraction
            let bDate = '';
            if (data.appointmentDate) {
              if (data.appointmentDate.toDate) { // Handles Firestore Timestamp
                const dateObj = data.appointmentDate.toDate();
                // Adjust for timezone to get correct local date string
                bDate = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];
              } else { // Handles String
                bDate = data.appointmentDate;
              }
            }

            // In-memory date filtering
            if (bDate < dateRange.start || bDate > dateRange.end) return null;

            const booking: Booking = {
              id: docSnap.id,
              bookingId: data.bookingId || docSnap.id,
              patientName: decrypt(data.patientName_encrypted || data.patientName || 'N/A'),
              whatsappNumber: decrypt(data.whatsappNumber_encrypted || data.whatsappNumber || data.phone || 'N/A'),
              age: parseInt(decrypt(data.age_encrypted || data.age?.toString() || '0')),
              gender: decrypt(data.gender_encrypted || data.gender || 'N/A').toUpperCase(),
              appointmentDate: bDate,
              chamberId: data.chamberId || 0,
              chamberName: data.chamberName || data.chamber || 'Unknown Chamber',
              purposeOfVisit: decrypt(data.purposeOfVisit_encrypted || data.purposeOfVisit || ''),
              visitType: decrypt(data.purposeOfVisit_encrypted || data.purposeOfVisit || '') || data.visitType || (data.consultationType === 'video' ? 'Video Consultation' : 'In-Person'),
              consultationType: data.consultationType || 'chamber',
              status: data.status || 'confirmed',
              startTime: data.startTime || ''
            };
            return booking;
          })
          .filter((b): b is Booking => b !== null);

        // 3. Grouping logic
        const grouped: SessionGroup[] = [];
        const dateMap: Record<string, Record<number, Booking[]>> = {};

        rawBookings.forEach(booking => {
          const bDate = booking.appointmentDate;
          if (!dateMap[bDate]) {
            dateMap[bDate] = {};
          }
          if (!dateMap[bDate][booking.chamberId]) {
            dateMap[bDate][booking.chamberId] = [];
          }
          dateMap[bDate][booking.chamberId].push(booking);
        });

        // 4. Convert map to sorted Agenda array
        Object.keys(dateMap).sort().forEach(date => {
          const sessions: SessionGroup['sessions'] = [];
          Object.keys(dateMap[date]).forEach(chamberIdKey => {
            const bookingsInSession = dateMap[date][chamberIdKey as any];
            if (!bookingsInSession || bookingsInSession.length === 0) return;

            sessions.push({
              chamberId: isNaN(Number(chamberIdKey)) ? 0 : Number(chamberIdKey),
              chamberName: bookingsInSession[0].chamberName,
              startTime: bookingsInSession[0].startTime,
              bookings: bookingsInSession.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
            });
          });

          grouped.push({
            date,
            sessions: sessions.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
          });
        });

        setAgenda(grouped);

        // Auto-expand first few sessions if they exist
        const initialExpanded: Record<string, boolean> = {};
        if (grouped.length > 0) {
          grouped[0].sessions.forEach((s) => {
            initialExpanded[`${grouped[0].date}-${s.chamberId}`] = true;
          });
        }
        setExpandedSessions(initialExpanded);

      } catch (error) {
        console.error('Error fetching agenda:', error);
        toast.error('Failed to load agenda');
      } finally {
        setLoading(false);
      }
    };

    fetchAgenda();
  }, [selectedDoctorId, dateRange, db]);

  const toggleSession = (sessionId: string) => {
    setExpandedSessions(prev => ({ ...prev, [sessionId]: !prev[sessionId] }));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      <ClinicSidebar
        activeMenu="advance-booking"
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
        <div className="bg-[#0f1419] border-b border-gray-800 p-4 sticky top-0 z-40">
          <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-blue-500 hover:bg-zinc-900"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-gray-700"
                onClick={() => onMenuChange?.('dashboard')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            <div>
              <h1 className="text-xl font-semibold text-white">Agenda View</h1>
              <p className="text-xs text-gray-400">Advance Booking History</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Simplified Filters Section */}
        <Card className="bg-zinc-900 border-zinc-800 p-4 md:p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
            {/* Doctor Select */}
            <div className="space-y-2">
              <label className="text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                Select Doctor
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full bg-[#0f1419] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium"
                disabled={doctorInitialLoading}
              >
                <option value="">Choose a doctor</option>
                {linkedDoctors.map(doctor => (
                  <option key={doctor.doctorId || doctor.uid} value={doctor.doctorId || doctor.uid}>
                    {doctor.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Range Toggles */}
            <div className="space-y-3">
              <label className="text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Date Range
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: '3days', label: '3 Days' },
                  { id: '7days', label: '7 Days' },
                  { id: 'custom', label: 'Custom' }
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => handleRangeChange(btn.id as any)}
                    className={`flex-1 min-w-[70px] px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      rangeType === btn.id
                        ? 'bg-blue-500 border-blue-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {rangeType === 'custom' && (
            <div className="grid grid-cols-2 gap-4 mt-6 animate-in slide-in-from-top-4 duration-300">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold ml-1">Start Date</span>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full bg-[#0f1419] border border-gray-800 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold ml-1">End Date</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full bg-[#0f1419] border border-gray-800 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </Card>

        {/* Agenda Feed */}
        <div className="space-y-10">
          {loading ? (
            <div className="text-center py-20 flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
              <p className="text-gray-500 font-medium">Scanning for appointments...</p>
            </div>
          ) : agenda.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800 border-dashed p-20 text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-white text-xl font-bold mb-2">No Appointments Scheduled</h3>
              <p className="text-gray-500 text-sm max-w-xs mx-auto">
                No bookings found for {linkedDoctors.find(d => d.doctorId === selectedDoctorId)?.name} between {dateRange.start} and {dateRange.end}.
              </p>
            </Card>
          ) : (
            agenda.map((day) => (
              <div key={day.date} className="">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-[1px] flex-1 bg-zinc-800" />
                  <h2 className="text-blue-500 font-bold text-xs uppercase tracking-[0.2em] whitespace-nowrap bg-blue-500/5 px-4 py-1 rounded-full border border-blue-500/10">
                    {formatDate(day.date)}
                  </h2>
                  <div className="h-[1px] flex-1 bg-zinc-800" />
                </div>

                <div className="space-y-4">
                  {day.sessions.map((session) => {
                    const sessionId = `${day.date}-${session.chamberId}`;
                    const isExpanded = expandedSessions[sessionId];

                    return (
                      <Card key={session.chamberId} className="bg-zinc-900 border-zinc-800 overflow-hidden group">
                        {/* Session Header */}
                        <div
                          className="p-5 cursor-pointer flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                          onClick={() => toggleSession(sessionId)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-white font-bold">{session.chamberName}</h3>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 uppercase tracking-wider font-bold">
                                <Clock className="w-3 h-3" />
                                {session.startTime || 'TBA'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-2xl font-black text-white">{session.bookings.length}</span>
                              <span className="text-[10px] text-gray-400 block uppercase font-bold">Patients</span>
                            </div>
                            {isExpanded ? <ChevronDown className="text-blue-500" /> : <ChevronRight className="text-gray-700" />}
                          </div>
                        </div>

                        {/* Patient List (Expandable) */}
                        {isExpanded && (
                          <div className="border-t border-zinc-800 bg-black/40 p-4 space-y-3">
                             {session.bookings.map((booking, idx) => (
                                 <div key={booking.id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
                                   <div className="flex items-start gap-4">
                                     {/* Serial Number - Green Square (Match SS3) */}
                                     <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-500/20 flex-shrink-0">
                                       {idx + 1}
                                     </div>

                                     <div className="flex-1 space-y-3">
                                       {/* Patient Name - Bold White (Match SS3) */}
                                       <h4 className="text-white font-black text-lg tracking-tight uppercase">
                                         {booking.patientName}
                                       </h4>

                                       {/* Details Row - High Contrast (Match SS3) */}
                                       <div className="flex flex-wrap items-center gap-4">
                                         <div className="flex items-center gap-2">
                                           <Phone className="w-3.5 h-3.5 text-blue-500" />
                                           <span className="text-xs font-black text-white tracking-wide">{booking.whatsappNumber}</span>
                                         </div>
                                         <span className="text-xs font-black text-white tracking-wide">{booking.age || 'NA'} years</span>
                                         <Badge className="bg-[#1a2b4b] text-blue-400 border-none px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-md">
                                           {booking.gender}
                                         </Badge>
                                       </div>

                                       {/* Status Badge - Bold (Match SS2) */}
                                       <div className="flex items-center gap-2 pt-0.5">
                                          <span className="text-xs font-black text-white uppercase tracking-wider">
                                            {booking.purposeOfVisit || booking.visitType || (booking.consultationType === 'video' ? 'VIDEO-CONSULTATION' : 'NEW-PATIENT')}
                                          </span>
                                       </div>
                                     </div>
                                   </div>
                                 </div>
                             ))}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <footer className="py-20 text-center opacity-30">
        <p className="text-[10px] text-gray-500 uppercase tracking-[0.4em]">Integrated Care • HealQR</p>
      </footer>
      </div>
    </div>
  );
}

