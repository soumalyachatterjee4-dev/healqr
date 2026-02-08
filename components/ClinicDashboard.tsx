// MAIN CLINIC DASHBOARD - ACTIVE VERSION
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Share2, 
  Copy, 
  Bell, 
  User,
  BarChart3,
  Calendar,
  Menu,
  Clock,
  Building2,
  QrCode,
  Users,
  Stethoscope
} from 'lucide-react';
import { auth, db } from '../lib/firebase/config';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import ClinicSidebar from './ClinicSidebar';
import ClinicProfileManager from './ClinicProfileManager';
import ClinicQRManager from './ClinicQRManager';
import ClinicScheduleManager from './ClinicScheduleManager';
import ClinicTodaysSchedule from './ClinicTodaysSchedule';
import ManageDoctors from './ManageDoctors';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface ClinicData {
  id?: string;
  name: string;
  email: string;
  address: string;
  pinCode: string;
  qrNumber: string;
  clinicCode?: string;
  phone?: string;
  logoUrl?: string;
  linkedDoctorCodes?: string[];
  linkedDoctorsDetails?: Array<{
    doctorId: string;
    doctorCode: string;
    name: string;
    email: string;
    specialties?: string[];
    profileImage?: string;
  }>;
}

interface TodayChamber {
  id: string;
  chamberName: string;
  chamberNo: string;
  doctorName: string;
  doctorId: string;
  specialty: string;
  address: string;
  startTime: string;
  endTime: string;
  booked: number;
  capacity: number;
  isExpired: boolean;
}

export default function ClinicDashboard() {
  const [clinicData, setClinicData] = useState<ClinicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [todaysChambers, setTodaysChambers] = useState<TodayChamber[]>([]);
  
  // Analytics State
  const [analyticsData, setAnalyticsData] = useState({
    totalScans: 0,
    totalBookings: 0,
    qrBookings: 0,
    walkinBookings: 0,
    dropOuts: 0,
    cancelled: 0,
    monthlyBookings: 0
  });

  useEffect(() => {
    loadClinicData();
    loadTodaysSchedule();
  }, []);

  const loadClinicData = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      const clinicRef = doc(db, 'clinics', currentUser.uid);
      const clinicSnap = await getDoc(clinicRef);

      if (clinicSnap.exists()) {
        const rawData = clinicSnap.data();
        if (!rawData) {
          console.error('Clinic data is null or undefined');
          setLoading(false);
          return;
        }

        const data = { id: clinicSnap.id, ...rawData } as ClinicData;
        setClinicData(data);

        // Calculate analytics from linked doctors with comprehensive safety checks
        let totalScans = 0;
        let totalBookings = 0;
        let qrBookings = 0;
        let walkinBookings = 0;
        let dropOuts = 0;
        let cancelled = 0;
        let monthlyBookings = 0;

        // Get current month date range for client-side filtering
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        if (data.linkedDoctorsDetails && Array.isArray(data.linkedDoctorsDetails)) {
          for (const doctor of data.linkedDoctorsDetails) {
            // Safety check for doctor object and get doctor ID
            const docId = doctor?.doctorId || doctor?.uid;
            if (!doctor || !docId) {
              console.warn('Invalid doctor object (missing doctorId/uid):', doctor);
              continue;
            }

            try {
              // 🔥 CLINIC ANALYTICS: Only count bookings that came through THIS CLINIC
              // Query bookings where doctorId matches AND clinicId matches this clinic
              const clinicBookingsQuery = query(
                collection(db, 'bookings'),
                where('doctorId', '==', docId),
                where('clinicId', '==', currentUser.uid) // 🎯 ONLY this clinic's bookings
              );
              const clinicBookingsSnap = await getDocs(clinicBookingsQuery);
              
              // Calculate metrics from CLINIC bookings only
              clinicBookingsSnap.forEach((docSnap) => {
                const bookingData = docSnap.data();
                
                // Monthly bookings count
                if (bookingData.date) {
                  const bookingDate = new Date(bookingData.date);
                  if (bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear) {
                    monthlyBookings++;
                  }
                }
                
                // QR bookings (type: 'qr_booking' and came through clinic QR)
                if (bookingData.type === 'qr_booking') {
                  totalScans++;
                  if (bookingData.status !== 'cancelled' && !bookingData.isCancelled) {
                    qrBookings++;
                  }
                }
                
                // Walk-in bookings (added at clinic)
                if (bookingData.type === 'walkin_booking') {
                  if (bookingData.status !== 'cancelled' && !bookingData.isCancelled) {
                    walkinBookings++;
                  }
                }
                
                // Cancelled count
                if (bookingData.status === 'cancelled' || bookingData.isCancelled === true) {
                  cancelled++;
                }
              });

            } catch (doctorError) {
              console.error(`Error loading doctor ${docId}:`, doctorError);
              // Continue with other doctors
            }
          }
        }
        
        totalBookings = qrBookings + walkinBookings;

        setAnalyticsData({
          totalScans,
          totalBookings,
          qrBookings,
          walkinBookings,
          dropOuts,
          cancelled,
          monthlyBookings
        });
      }
    } catch (error) {
      console.error('Error loading clinic data:', error);
      toast.error('Failed to load clinic data');
    } finally {
      setLoading(false);
    }
  };

  const loadTodaysSchedule = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const clinicRef = doc(db, 'clinics', currentUser.uid);
      const clinicSnap = await getDoc(clinicRef);

      if (clinicSnap.exists()) {
        const clinicData = clinicSnap.data();
        if (!clinicData) {
          console.error('Clinic data is null or undefined');
          return;
        }

        const linkedDoctors = clinicData.linkedDoctorsDetails;
        if (!linkedDoctors || !Array.isArray(linkedDoctors)) {
          console.warn('No linked doctors found or invalid format');
          setTodaysChambers([]);
          return;
        }

        const chambers: TodayChamber[] = [];
        const today = new Date();
        const todayDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
        const currentTime = `${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}`;

        for (const doctor of linkedDoctors) {
          // Safety check for doctor object and get doctor ID
          const docId = doctor?.doctorId || doctor?.uid;
          if (!doctor || !docId) {
            console.warn('Invalid doctor object (missing doctorId/uid):', doctor);
            continue;
          }

          try {
            const doctorRef = doc(db, 'doctors', docId);
            const doctorSnap = await getDoc(doctorRef);

            if (doctorSnap.exists()) {
              const doctorData = doctorSnap.data();
              if (!doctorData) {
                console.warn(`Doctor data is null for ${docId}`);
                continue;
              }

              const allChambers = doctorData.chambers;
              if (!allChambers || !Array.isArray(allChambers)) {
                // Silent - doctors may not have chambers configured yet
                continue;
              }

              const todayChambers = allChambers.filter((chamber: any) => {
                // Comprehensive safety checks
                if (!chamber || typeof chamber !== 'object') return false;
                if (chamber.clinicId !== currentUser.uid) return false;
                
                if (chamber.frequency === 'Custom') {
                  return chamber.customDate === today.toISOString().split('T')[0];
                } else {
                  // Triple safety check for days array
                  return chamber.days && 
                         Array.isArray(chamber.days) && 
                         chamber.days.length > 0 && 
                         chamber.days.includes(todayDay);
                }
              });

              for (const chamber of todayChambers) {
                // Validate chamber has required fields
                if (!chamber.id || !chamber.chamberName) {
                  console.warn('Chamber missing required fields:', chamber);
                  continue;
                }

                try {
                  const bookingsQuery = query(
                    collection(db, 'bookings'),
                    where('doctorId', '==', docId),
                    where('chamberId', '==', chamber.id),
                    where('date', '==', today.toISOString().split('T')[0]),
                    where('status', 'in', ['pending', 'confirmed'])
                  );
                  
                  const bookingsSnap = await getDocs(bookingsQuery);
                  const bookingCount = bookingsSnap.size;

                  chambers.push({
                    id: chamber.id || '',
                    chamberName: chamber.chamberName || 'Unknown Chamber',
                    chamberNo: chamber.id ? String(chamber.id).slice(-4) : '0000',
                    doctorName: doctor.name || 'Unknown Doctor',
                    doctorId: docId,
                    specialty: doctorData.specialty || 'General',
                    address: chamber.chamberAddress || '',
                    startTime: chamber.startTime || '09:00',
                    endTime: chamber.endTime || '17:00',
                    booked: bookingCount,
                    capacity: Number(chamber.maxCapacity) || 0,
                    isExpired: chamber.endTime ? currentTime > chamber.endTime : false
                  });
                } catch (bookingError) {
                  console.error(`Error loading bookings for chamber ${chamber.id}:`, bookingError);
                  // Continue with other chambers
                }
              }
            }
          } catch (doctorError) {
            console.error(`Error loading doctor ${docId}:`, doctorError);
            // Continue with other doctors
          }
        }

        setTodaysChambers(chambers);
      }
    } catch (error) {
      console.error('Error loading today\'s schedule:', error);
      toast.error('Failed to load today\'s schedule');
      setTodaysChambers([]);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout');
    }
  };

  const copyClinicCode = () => {
    if (clinicData?.clinicCode) {
      navigator.clipboard.writeText(clinicData.clinicCode);
      toast.success('Clinic code copied to clipboard!');
      setShareMenuOpen(false);
    }
  };

  // Render Profile Manager if menu is active
  if (activeMenu === 'profile') {
    return (
      <ClinicProfileManager 
        onMenuChange={(menu) => setActiveMenu(menu)}
        onLogout={handleLogout}
      />
    );
  }

  // Render QR Manager if menu is active
  if (activeMenu === 'qr-manager') {
    return (
      <ClinicQRManager 
        onMenuChange={(menu) => setActiveMenu(menu)}
        onLogout={handleLogout}
        profileData={{
          image: clinicData?.logoUrl || null,
          name: clinicData?.name || 'Clinic Name'
        }}
      />
    );
  }

  // Render Schedule Manager if menu is active
  if (activeMenu === 'schedule' || activeMenu === 'schedule-manager') {
    return <ClinicScheduleManager onMenuChange={(menu) => setActiveMenu(menu)} onLogout={handleLogout} />;
  }

  // Render Today's Schedule if menu is active
  if (activeMenu === 'todays-schedule') {
    return <ClinicTodaysSchedule onMenuChange={(menu) => setActiveMenu(menu)} onLogout={handleLogout} />;
  }

  // Render Manage Doctors if menu is active
  if (activeMenu === 'doctors') {
    return <ManageDoctors onNavigate={(view, doctorId) => {
      setActiveMenu(view);
      if (doctorId) {
        localStorage.setItem('selectedDoctorId', doctorId);
      }
    }} />;
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Sidebar */}
      <ClinicSidebar 
        activeMenu={activeMenu}
        onMenuChange={(menu) => {
          setActiveMenu(menu);
        }}
        onLogout={handleLogout}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Container */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top Header - Fixed */}
        <header className="bg-black border-b border-gray-900 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
            >
              <Menu className="w-5 h-5 text-blue-500" />
            </button>
            <h2 className="text-lg md:text-xl">Dashboard</h2>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            {/* Share Button */}
            <Popover open={shareMenuOpen} onOpenChange={setShareMenuOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors">
                  <Share2 className="w-4 h-4 text-blue-500" />
                  <span className="text-sm hidden md:inline">Share</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 bg-zinc-900 border-zinc-700 text-white">
                <button
                  onClick={copyClinicCode}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors text-left"
                >
                  <Copy className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Copy Clinic Code</span>
                </button>
              </PopoverContent>
            </Popover>

            {/* Notifications */}
            <button className="relative w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors">
              <Bell className="w-5 h-5" />
            </button>

            {/* Profile */}
            <button
              onClick={() => setActiveMenu('profile')}
              className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content - Scrollable */}
        <main className="flex-1 overflow-y-auto bg-black">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-400">Loading...</div>
            </div>
          ) : (
            <div className="px-4 md:px-8 py-8 space-y-8">
              {/* Welcome Card */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    Welcome Back, {clinicData?.name || 'Clinic'} !
                  </h1>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-500" />
                      <span className="text-sm text-gray-400">{clinicData?.address || 'No address set'}</span>
                    </div>
                    {clinicData?.phone && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-400">{clinicData.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Analytics Cards - Blue Banner */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-900 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-blue-100 text-sm">Total Doctors</p>
                    <p className="text-3xl font-bold text-white">
                      {clinicData?.linkedDoctorsDetails?.length || 0}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-blue-100 text-sm">Monthly Bookings</p>
                    <p className="text-3xl font-bold text-white">{analyticsData.monthlyBookings}</p>
                  </div>
                </div>
              </div>

              {/* Doctors by Specialty - Compact */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-white">Doctors by Specialty</h3>
                </div>
                
                {clinicData?.linkedDoctorsDetails && clinicData.linkedDoctorsDetails.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      // Group doctors by specialty
                      const specialtyCounts: Record<string, number> = {};
                      clinicData.linkedDoctorsDetails.forEach((doctor) => {
                        const specialties = doctor.specialties || ['General Physician'];
                        specialties.forEach((spec) => {
                          specialtyCounts[spec] = (specialtyCounts[spec] || 0) + 1;
                        });
                      });
                      
                      return Object.entries(specialtyCounts).map(([specialty, count]) => (
                        <div 
                          key={specialty}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm transition-colors"
                        >
                          <span className="text-gray-300">{specialty}</span>
                          <span className="px-2 py-0.5 bg-blue-600 rounded-full text-xs font-semibold text-white">{count}</span>
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No doctors added yet</p>
                )}
              </div>

              {/* Practice Overview Chart - Matching Doctor Dashboard SS2 */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    <CardTitle className="text-white text-xl">Practice Overview (Current Plan Period)</CardTitle>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    Track your practice performance metrics and patient engagement analytics.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="bg-black rounded-xl p-6">
                    {/* Custom Bar Chart */}
                    <div className="space-y-6">
                      {[
                        { name: 'Total Scans', value: analyticsData.totalScans, fill: '#3b82f6' },
                        { name: 'Total Bookings', value: analyticsData.totalBookings, fill: '#10b981' },
                        { name: 'QR Bookings', value: analyticsData.qrBookings, fill: '#8b5cf6' },
                        { name: 'Walk-in Bookings', value: analyticsData.walkinBookings, fill: '#f59e0b' },
                        { name: 'Cancelled', value: analyticsData.cancelled, fill: '#6b7280' },
                      ].map((item, index) => {
                        const maxValue = Math.max(
                          analyticsData.totalScans,
                          analyticsData.totalBookings,
                          analyticsData.qrBookings,
                          analyticsData.walkinBookings,
                          analyticsData.cancelled,
                          1
                        );
                        const percentage = (item.value / maxValue) * 100;
                        
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-white font-semibold text-sm">{item.name}</span>
                              <span className="text-white font-bold text-lg">{item.value}</span>
                            </div>
                            <div className="relative h-8 bg-zinc-900 rounded-lg overflow-hidden">
                              <div 
                                className="absolute top-0 left-0 h-full rounded-lg transition-all duration-1000 ease-out"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: item.fill,
                                  boxShadow: `0 0 20px ${item.fill}80`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-zinc-800">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">{analyticsData.totalScans}</div>
                        <div className="text-xs text-gray-400 mt-1">Total Scans</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{analyticsData.totalBookings}</div>
                        <div className="text-xs text-gray-400 mt-1">Total Bookings</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">{analyticsData.cancelled}</div>
                        <div className="text-xs text-gray-400 mt-1">Cancelled</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              

              
              {/* Today's Schedule - Doctor Names Prominently Displayed */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-500" />
                      <CardTitle className="text-white">Today's Schedule</CardTitle>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-blue-500 hover:text-blue-400"
                      onClick={() => setActiveMenu('todays-schedule')}
                    >
                      View All
                    </Button>
                  </div>
                  <p className="text-sm text-gray-400">
                    An overview of all scheduled chambers for today.
                  </p>
                </CardHeader>
                <CardContent>
                  {todaysChambers.length === 0 ? (
                    <div className="py-12 text-center">
                      <Calendar className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-400">No chambers scheduled for today</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {todaysChambers.slice(0, 3).map((chamber) => (
                        <div 
                          key={chamber.id}
                          className={`bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-blue-500/50 transition-colors ${chamber.isExpired ? 'opacity-60' : ''}`}
                        >
                          {/* Doctor Name & Badge - PROMINENTLY DISPLAYED */}
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-white text-lg font-semibold">Dr. {chamber.doctorName}</h3>
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 capitalize shrink-0">
                              Today
                            </Badge>
                          </div>

                          {/* Chamber Name & Specialty */}
                          <div className="mb-3">
                            <p className="text-sm text-gray-400">{chamber.chamberName}</p>
                            <p className="text-xs text-blue-400">{chamber.specialty}</p>
                          </div>

                          {/* Chamber Address */}
                          <div className="flex items-start gap-2 mb-3">
                            <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <p className="text-sm text-gray-400">{chamber.address}</p>
                          </div>

                          {/* Schedule Time */}
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                            <p className="text-sm text-gray-300">
                              {chamber.startTime} to {chamber.endTime}
                            </p>
                            {chamber.isExpired && (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                Time Over
                              </Badge>
                            )}
                          </div>

                          {/* Booking Progress */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-400">Booked</span>
                                <span className="text-gray-300">{chamber.booked}/{chamber.capacity}</span>
                              </div>
                              <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full transition-all"
                                  style={{ width: `${Math.min((chamber.booked / (chamber.capacity || 1)) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {todaysChambers.length > 3 && (
                        <div className="text-center pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-500 border-blue-500/30 hover:bg-blue-500/10"
                            onClick={() => setActiveMenu('todays-schedule')}
                          >
                            View All {todaysChambers.length} Chambers
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pb-8 text-center">
            <p className="text-sm text-gray-500">Powered by HealQR.com</p>
          </div>
        </main>
      </div>
    </div>
  );
}
