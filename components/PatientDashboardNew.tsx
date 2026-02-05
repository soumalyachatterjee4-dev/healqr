import React, { useState, useEffect } from 'react';
import { Lock, BarChart3, History, Bell, FolderHeart, Search, LogOut, Calendar, Stethoscope, Activity, TrendingUp, Heart } from 'lucide-react';
import { getFirestore, collection, query, where, getDocs, onSnapshot, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import healqrLogo from '../assets/healqr-logo.png';

// Import sub-components
import PatientConsultationHistory from './PatientConsultationHistory';
import PatientLiveStatus from './PatientLiveStatus';
import PatientNotifications from './PatientNotifications';
import PatientMedicoLocker from './PatientMedicoLocker';
import PatientSearch from './PatientSearchPage';
import PatientHealthCardProfile from './PatientHealthCardProfile';
import DashboardPromoDisplay from './DashboardPromoDisplay';

const PatientDashboardNew = () => {
  const [patientData, setPatientData] = useState<any>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalConsultations: 0,
    upcomingAppointments: 0,
    unreadNotifications: 0,
    prescriptions: 0
  });
  const [specialtyStats, setSpecialtyStats] = useState<any[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [healthCardData, setHealthCardData] = useState<any>(null);

  useEffect(() => {
    // Check if in demo mode
    const isDemoMode = localStorage.getItem('patient_demo_mode') === 'true';
    setDemoMode(isDemoMode);

    if (isDemoMode) {

      loadDemoData();
    } else {
      loadPatientData();
    }
  }, []);

  // Reload health card data when returning to dashboard view
  useEffect(() => {
    if (currentView === 'dashboard') {
      const isDemoMode = localStorage.getItem('patient_demo_mode') === 'true';
      if (isDemoMode) {
        // Reload from localStorage
        const savedDemoHealthCard = localStorage.getItem('demo_health_card');
        if (savedDemoHealthCard) {
          setHealthCardData(JSON.parse(savedDemoHealthCard));
        }
      } else {
        // Reload from Firestore for real users
        const patientPhone = localStorage.getItem('patient_phone');
        if (patientPhone) {
          loadHealthCardData(patientPhone);
        }
      }
    }
  }, [currentView]);

  const loadDemoData = () => {
    // Demo mode disabled - redirect to real login
    localStorage.removeItem('patient_demo_mode');
    window.location.href = '/?page=patient-login';
  };

  const loadPatientData = async () => {
    try {
      const patientPhone = localStorage.getItem('patient_phone');
      if (!patientPhone) {
        window.location.href = '/?page=patient-login';
        return;
      }

      const db = getFirestore();
      
      // Load patient data from last booking
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef, where('patientPhone', '==', patientPhone), limit(1));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const latestBooking = snapshot.docs[0].data();
        setPatientData({
          name: latestBooking.patientName,
          phone: latestBooking.patientPhone,
          age: latestBooking.patientAge,
          gender: latestBooking.patientGender,
          email: latestBooking.patientEmail || ''
        });

        // Calculate stats
        calculateStats(patientPhone);
      }

      // Load health card data
      loadHealthCardData(patientPhone);

      setLoading(false);
    } catch (error) {
      console.error('Error loading patient data:', error);
      setLoading(false);
    }
  };

  const loadHealthCardData = async (patientPhone: string) => {
    try {
      const db = getFirestore();
      const healthCardRef = doc(db, 'patientHealthCards', patientPhone);
      const healthCardSnap = await getDoc(healthCardRef);
      
      if (healthCardSnap.exists()) {
        setHealthCardData(healthCardSnap.data());
      }
    } catch (error) {
      console.error('Error loading health card data:', error);
    }
  };

  const calculateStats = async (phone: string) => {
    const db = getFirestore();
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('patientPhone', '==', phone));
    const snapshot = await getDocs(q);

    const specialtyCount: { [key: string]: number } = {};
    let upcoming = 0;
    let totalRx = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const specialty = data.specialty || 'General Medicine';
      specialtyCount[specialty] = (specialtyCount[specialty] || 0) + 1;

      if (data.status === 'confirmed' || data.status === 'in-queue') {
        upcoming++;
      }
      if (data.prescriptionImages && data.prescriptionImages.length > 0) {
        totalRx++;
      }
    });

    const colors = ['#FF9800', '#FF6B6B', '#FFB347', '#FFA500', '#FF8C00'];
    const specialtyData = Object.entries(specialtyCount).map(([specialty, visits], index) => ({
      specialty,
      visits,
      color: colors[index % colors.length]
    }));

    setStats({
      totalConsultations: snapshot.size,
      upcomingAppointments: upcoming,
      unreadNotifications: 0,
      prescriptions: totalRx
    });

    setSpecialtyStats(specialtyData);
  };

  const handleLogout = () => {
    localStorage.removeItem('patient_phone');
    localStorage.removeItem('patient_session_expiry');
    localStorage.removeItem('patient_demo_mode');
    window.location.href = '/?page=patient-login';
  };

  const renderDashboardContent = () => {
    return (
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-6 border border-orange-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Consultations</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.totalConsultations}</p>
              </div>
              <div className="bg-orange-500/20 p-3 rounded-lg">
                <Stethoscope className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-orange-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Upcoming</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.upcomingAppointments}</p>
              </div>
              <div className="bg-orange-500/20 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-orange-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Notifications</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.unreadNotifications}</p>
              </div>
              <div className="bg-orange-500/20 p-3 rounded-lg">
                <Bell className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-orange-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Prescriptions</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.prescriptions}</p>
              </div>
              <div className="bg-orange-500/20 p-3 rounded-lg">
                <Activity className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Health Tip Card */}
        <DashboardPromoDisplay 
          category="health-tip" 
          placement="patient-dashboard"
          className="shadow-lg"
        />

        {/* Health Card - Now Clickable */}
        <div 
          onClick={() => setCurrentView('health-card')}
          className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-8 text-white cursor-pointer hover:shadow-2xl hover:shadow-orange-500/50 transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-6 h-6" />
                <h3 className="text-2xl font-bold">Health Card</h3>
              </div>
              {healthCardData?.mission && (
                <p className="text-orange-50 italic mb-4">&ldquo;{healthCardData.mission}&rdquo;</p>
              )}
              {!healthCardData?.mission && (
                <p className="text-orange-100 mb-4">Your complete health profile at a glance</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <div>
                  <p className="text-orange-100 text-sm">Name</p>
                  <p className="font-semibold text-lg">{healthCardData?.name || patientData?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-orange-100 text-sm">Age / Gender</p>
                  <p className="font-semibold text-lg">{healthCardData?.age || patientData?.age || 'N/A'} / {healthCardData?.gender || patientData?.gender || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-orange-100 text-sm">Blood Group</p>
                  <p className="font-semibold text-lg">{healthCardData?.bloodGroup || patientData?.bloodGroup || 'Not Set'}</p>
                </div>
              </div>
              <div className="mt-4 text-sm text-orange-100 flex items-center gap-2">
                <span>Click to view & edit full profile</span>
                <span>→</span>
              </div>
            </div>
            <div className="hidden lg:block ml-6">
              <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Activity className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Specialty-wise Visits Chart */}
        <div className="bg-gray-800 rounded-lg p-6 border border-orange-500/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Specialty-wise Consultations
            </h3>
          </div>
          
          {specialtyStats.length > 0 ? (
            <div className="space-y-4">
              {specialtyStats.map((item, index) => {
                const maxVisits = Math.max(...specialtyStats.map(s => s.visits));
                const percentage = (item.visits / maxVisits) * 100;
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">{item.specialty}</span>
                      <span className="text-white font-semibold">{item.visits} visits</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No consultation data available</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800 rounded-lg p-6 border border-orange-500/20">
          <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <div>
                <p className="text-white font-medium">Consultation Completed</p>
                <p className="text-gray-400 text-sm">Dr. Rajesh Kumar - General Medicine</p>
                <p className="text-gray-500 text-xs mt-1">2 days ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <div>
                <p className="text-white font-medium">Prescription Received</p>
                <p className="text-gray-400 text-sm">New prescription added to your locker</p>
                <p className="text-gray-500 text-xs mt-1">3 days ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboardContent();
      case 'health-card':
        return <PatientHealthCardProfile />;
      case 'history':
        return <PatientConsultationHistory language={'english'} />;
      case 'live-tracker':
        return <PatientLiveStatus language={'english'} />;
      case 'notifications':
        return <PatientNotifications patientPhone={patientData?.phone} language={'english'} />;
      case 'medico-locker':
        return <PatientMedicoLocker language={'english'} />;
      case 'search':
        return <PatientSearch language={'english'} isDashboard={true} />;
      default:
        return renderDashboardContent();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black overflow-hidden relative">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed top-0 bottom-0 left-0 z-50 w-64 h-screen bg-gray-900 border-r border-gray-800 transition-transform duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <img src={healqrLogo} alt="healQr" className="h-12 mb-2" />
          <p className="text-gray-400 text-sm">Patient Portal</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => {
              setCurrentView('dashboard');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'dashboard'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Dashboard</span>
          </button>

          <div className="pt-4 pb-2">
            <p className="text-gray-500 text-xs font-semibold uppercase px-4">Health Records</p>
          </div>

          <button
            onClick={() => {
              setCurrentView('health-card');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'health-card'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Heart className="w-5 h-5" />
            <span>Health Card</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('history');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'history'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <History className="w-5 h-5" />
            <span>History</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('live-tracker');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'live-tracker'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span>Live Tracker</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('notifications');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'notifications'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
            {stats.unreadNotifications > 0 && (
              <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                {stats.unreadNotifications}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setCurrentView('medico-locker');
              setSidebarOpen(false);
            }}
            disabled
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 cursor-not-allowed opacity-50"
          >
            <FolderHeart className="w-5 h-5" />
            <span>Medico Locker</span>
            <span className="ml-auto text-xs bg-gray-700 px-2 py-1 rounded">Soon</span>
          </button>

          <div className="pt-4 pb-2">
            <p className="text-gray-500 text-xs font-semibold uppercase px-4">General</p>
          </div>

          <button
            onClick={() => {
              setCurrentView('search');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'search'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Search className="w-5 h-5" />
            <span>Find a Doctor</span>
          </button>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex flex-col h-screen overflow-hidden lg:ml-64 transition-all duration-300">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 px-4 lg:px-8 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-white">
                  Welcome Back, {patientData?.name?.split(' ')[0] || 'Patient'}!
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {currentView === 'dashboard' && 'Your health dashboard overview'}
                  {currentView === 'history' && 'Consultation History'}
                  {currentView === 'live-tracker' && 'Live Queue Status'}
                  {currentView === 'notifications' && 'Your Notifications'}
                  {currentView === 'medico-locker' && 'Medical Records Locker'}
                  {currentView === 'search' && 'Find a Doctor Near You'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="hidden lg:flex items-center gap-2 bg-orange-500/20 text-orange-500 px-4 py-2 rounded-lg border border-orange-500/30">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">Data is encrypted</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default PatientDashboardNew;
