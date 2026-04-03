import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { 
  History, 
  Bell, 
  Clock, 
  LogOut, 
  User,
  Calendar,
  FileText,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import DashboardPromoDisplay from './DashboardPromoDisplay';
import PatientConsultationHistory from './PatientConsultationHistory';
import PatientNotifications from './PatientNotifications';
import PatientLiveStatus from './PatientLiveStatus';
import { useTranslatedConfirm } from './TranslatedConfirmModal';

interface PatientDashboardProps {
  initialView?: 'dashboard' | 'history' | 'notifications' | 'live-status';
  onLogout: () => void;
}

export default function PatientDashboard({ initialView = 'dashboard', onLogout }: PatientDashboardProps) {
  const [activeView, setActiveView] = useState(initialView);
  const [patientPhone, setPatientPhone] = useState('');
  const [patientName, setPatientName] = useState('');
  const [consultationCount, setConsultationCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { showConfirm, ConfirmModalComponent } = useTranslatedConfirm();

  useEffect(() => {
    // Check authentication
    const savedPhone = localStorage.getItem('patient_phone');
    const sessionExpiry = localStorage.getItem('patient_session_expiry');
    
    if (!savedPhone || !sessionExpiry) {
      toast.error('Please login first');
      onLogout();
      return;
    }

    const expiryTime = parseInt(sessionExpiry);
    if (Date.now() >= expiryTime) {
      toast.error('Session expired. Please login again');
      onLogout();
      return;
    }

    setPatientPhone(savedPhone);
    loadPatientData(savedPhone);
  }, [onLogout]);

  const loadPatientData = async (phone: string) => {
    setLoading(true);
    try {
      // Check if demo mode
      const isDemoMode = localStorage.getItem('patient_demo_mode') === 'true';

      if (isDemoMode) {
        // DEMO DATA

        setPatientName('Demo Patient');
        setConsultationCount(12);
        setNotificationCount(8);
        setActiveBookingId('demo-booking-001');
        setLoading(false);
        return;
      }

      // REAL DATA
      const bookingsRef = collection(db, 'bookings');
      const bookingsQuery = query(
        bookingsRef,
        where('patientPhone', '==', phone),
        orderBy('createdAt', 'desc')
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      

      setConsultationCount(bookingsSnapshot.size);

      // Get patient name from first booking
      if (!bookingsSnapshot.empty) {
        const firstBooking = bookingsSnapshot.docs[0].data();
        setPatientName(firstBooking.patientName || 'Patient');
      }

      // Get notification count from last 2 consultations
      const last2Consultations = bookingsSnapshot.docs.slice(0, 2).map(doc => doc.id);
      if (last2Consultations.length > 0) {
        const notificationsRef = collection(db, 'notifications');
        const notifQuery = query(
          notificationsRef,
          where('bookingId', 'in', last2Consultations)
        );
        const notifSnapshot = await getDocs(notifQuery);
        setNotificationCount(notifSnapshot.size);
      }

      // Check for active booking (today's consultation)
      const today = new Date().toISOString().split('T')[0];
      const activeBooking = bookingsSnapshot.docs.find(doc => {
        const data = doc.data();
        return data.bookingDate?.startsWith(today) && 
               (data.status === 'confirmed' || data.status === 'in-queue');
      });

      if (activeBooking) {
        setActiveBookingId(activeBooking.id);
      }

    } catch (error) {
      console.error('Error loading patient data:', error);
      toast.error('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const ok = await showConfirm('Are you sure you want to logout?', 'Logout');
    if (ok) {
      onLogout();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <ConfirmModalComponent />
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50 overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-3 py-4 sm:px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">Patient Portal</h1>
              <p className="text-xs sm:text-sm text-gray-400 truncate">Welcome, {patientName}</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-red-400 hover:bg-red-400/10 flex-shrink-0 px-2 sm:px-4"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1.5 sm:gap-2 mt-4 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
            <Button
              onClick={() => setActiveView('dashboard')}
              variant={activeView === 'dashboard' ? 'default' : 'ghost'}
              className={`flex-shrink-0 text-xs sm:text-sm ${
                activeView === 'dashboard' 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'text-gray-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Activity className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Dashboard
            </Button>
            <Button
              onClick={() => setActiveView('history')}
              variant={activeView === 'history' ? 'default' : 'ghost'}
              className={`flex-shrink-0 text-xs sm:text-sm ${
                activeView === 'history' 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'text-gray-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <History className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              History
              <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">
                {consultationCount}
              </span>
            </Button>
            <Button
              onClick={() => setActiveView('notifications')}
              variant={activeView === 'notifications' ? 'default' : 'ghost'}
              className={`flex-shrink-0 text-xs sm:text-sm ${
                activeView === 'notifications' 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'text-gray-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Notif</span>
              {notificationCount > 0 && (
                <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 bg-red-500 text-white rounded-full text-xs">
                  {notificationCount}
                </span>
              )}
            </Button>
            {activeBookingId && (
              <Button
                onClick={() => setActiveView('live-status')}
                variant={activeView === 'live-status' ? 'default' : 'ghost'}
                className={`flex-shrink-0 text-xs sm:text-sm ${
                  activeView === 'live-status' 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'text-gray-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Live Status</span>
                <span className="sm:hidden">Live</span>
                <span className="ml-1 sm:ml-2 px-1 sm:px-1.5 py-0.5 bg-green-500 rounded-full animate-pulse"></span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-4 sm:space-y-6">\n        {/* Health Tip Card */}\n        <DashboardPromoDisplay category="health-tip" placement="patient-dashboard" />

        {/* Dashboard Overview */}
        {activeView === 'dashboard' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-emerald-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <History className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-bold text-white">{consultationCount}</p>
                      <p className="text-xs sm:text-sm text-gray-400 truncate">Total Consultations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-bold text-white">{notificationCount}</p>
                      <p className="text-xs sm:text-sm text-gray-400 truncate">Recent Notifications</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-purple-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-bold text-white">{activeBookingId ? 'Active' : 'None'}</p>
                      <p className="text-xs sm:text-sm text-gray-400 truncate">Today's Visit</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <Button
                    onClick={() => setActiveView('history')}
                    className="h-auto py-3 sm:py-4 px-3 sm:px-4 justify-start bg-zinc-800 hover:bg-zinc-700 text-white"
                  >
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-emerald-500 flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">View Consultation History</p>
                      <p className="text-xs text-gray-400 truncate">See all past visits & prescriptions</p>
                    </div>
                  </Button>

                  <Button
                    onClick={() => setActiveView('notifications')}
                    className="h-auto py-3 sm:py-4 px-3 sm:px-4 justify-start bg-zinc-800 hover:bg-zinc-700 text-white"
                  >
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-blue-500 flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">Check Notifications</p>
                      <p className="text-xs text-gray-400 truncate">Updates from last 2 consultations</p>
                    </div>
                  </Button>

                  {activeBookingId && (
                    <Button
                      onClick={() => setActiveView('live-status')}
                      className="h-auto py-3 sm:py-4 px-3 sm:px-4 justify-start bg-zinc-800 hover:bg-zinc-700 text-white md:col-span-2"
                    >
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-purple-500 flex-shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">Track Live Queue Status</p>
                        <p className="text-xs text-gray-400 truncate">See your position in real-time</p>
                      </div>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Patient Info */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Account Information</h2>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-zinc-800 rounded-lg">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-400">Name</p>
                      <p className="text-sm sm:text-base text-white font-medium truncate">{patientName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-zinc-800 rounded-lg">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-400">Phone Number</p>
                      <p className="text-sm sm:text-base text-white font-medium truncate">{patientPhone}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Consultation History View */}
        {activeView === 'history' && (
          <PatientConsultationHistory patientPhone={patientPhone} />
        )}

        {/* Notifications View */}
        {activeView === 'notifications' && (
          <PatientNotifications patientPhone={patientPhone} />
        )}

        {/* Live Status View */}
        {activeView === 'live-status' && activeBookingId && (
          <PatientLiveStatus bookingId={activeBookingId} />
        )}
      </div>
    </div>
  );
}

