import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  Menu,
  Lock,
  BrainCircuit,
  Microscope,
  BarChart3,
  Settings,
  LogOut,
  Home,
  User,
  QrCode,
  FileText,
  TestTubes,
  Users,
  ClipboardList,
  Calendar,
} from 'lucide-react';
import { auth, db } from '../lib/firebase/config';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import LabProfileManager from './LabProfileManager';
import LabQRManager from './LabQRManager';
import LabTestCatalog from './LabTestCatalog';
import LabScheduleManager from './LabScheduleManager';

interface LabData {
  uid: string;
  name: string;
  email: string;
  address: string;
  pinCode: string;
  state: string;
  qrNumber: string;
  labCode?: string;
  labSlug?: string;
  bookingUrl?: string;
  qrCode?: string;
  logoUrl?: string;
  phone?: string;
  type: string;
}

export default function LabDashboard({ onLogout }: { onLogout?: () => void | Promise<void> }) {
  const [labData, setLabData] = useState<LabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const resolvedLabId = auth?.currentUser?.uid || localStorage.getItem('userId') || '';

  useEffect(() => {
    const fetchLabData = async () => {
      if (!resolvedLabId) {
        setLoading(false);
        return;
      }

      try {
        const labRef = doc(db, 'labs', resolvedLabId);
        const labSnap = await getDoc(labRef);

        if (labSnap.exists()) {
          setLabData({ uid: labSnap.id, ...labSnap.data() } as LabData);
        }
      } catch (error) {
        console.error('Error fetching lab data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLabData();
  }, [resolvedLabId]);

  const refetchLabData = async () => {
    try {
      const labRef = doc(db, 'labs', resolvedLabId);
      const labSnap = await getDoc(labRef);
      if (labSnap.exists()) {
        setLabData({ uid: labSnap.id, ...labSnap.data() } as LabData);
      }
    } catch (error) {
      console.error('Error refetching lab data:', error);
    }
  };

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
      return;
    }
    try {
      localStorage.removeItem('healqr_authenticated');
      localStorage.removeItem('healqr_user_email');
      localStorage.removeItem('healqr_user_name');
      localStorage.removeItem('healqr_is_lab');
      localStorage.removeItem('healqr_lab_code');
      localStorage.removeItem('userId');
      localStorage.removeItem('healqr_qr_code');
      localStorage.removeItem('healqr_qr_id');
      localStorage.removeItem('healqr_booking_url');
      localStorage.removeItem('healqr_sidebar_collapsed');
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout');
    }
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'profile', label: 'Profile Manager', icon: User },
    { id: 'qr-manager', label: 'QR Manager', icon: QrCode },
    { id: 'test-catalog', label: 'Test Catalog', icon: TestTubes },
    { id: 'schedule', label: 'Collection Schedule', icon: Calendar },
    { id: 'bookings', label: 'Bookings', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Loading lab dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 border-r border-zinc-800 transform transition-transform duration-200 lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Microscope className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-lg font-bold">Lab Dashboard</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveMenu(item.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors ${
                  activeMenu === item.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-zinc-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-black border-b border-zinc-900 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
            >
              <Menu className="w-5 h-5 text-purple-500" />
            </button>
            <h2 className="text-lg md:text-xl font-medium">
              {sidebarItems.find(i => i.id === activeMenu)?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {(labData?.name || 'L')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="px-4 md:px-8 py-8 space-y-8">

            {/* Profile Manager */}
            {activeMenu === 'profile' && (
              <LabProfileManager labData={labData} onProfileUpdate={refetchLabData} />
            )}

            {/* QR Manager */}
            {activeMenu === 'qr-manager' && (
              <LabQRManager labData={labData} />
            )}

            {/* Test Catalog */}
            {activeMenu === 'test-catalog' && (
              <LabTestCatalog labId={resolvedLabId} />
            )}

            {/* Collection Schedule */}
            {activeMenu === 'schedule' && (
              <LabScheduleManager labId={resolvedLabId} labData={labData} />
            )}

            {/* Dashboard Home */}
            {activeMenu === 'dashboard' && (<>
            {/* 🇮🇳 Indian Tricolor Header: Saffron → White → Green */}
            <div className="space-y-3">
              {/* Saffron: Name */}
              <div className="w-full">
                <div className="w-full flex items-center justify-center rounded-xl bg-orange-500 text-white font-bold py-3 text-base shadow shadow-orange-200">
                  <h1 className="text-lg md:text-xl">
                    Welcome, {labData?.name || 'Lab'}!
                  </h1>
                </div>
              </div>

              {/* White: BrainDeck */}
              <div className="w-full">
                <button
                  className="w-full flex items-center justify-center rounded-xl bg-white text-blue-600 font-bold py-3 text-base border border-blue-200 shadow"
                  style={{ letterSpacing: '0.02em' }}
                >
                  <BrainCircuit className="w-5 h-5 mr-2" />
                  healQR BrainDeck
                </button>
              </div>

              {/* Green: Encrypted Badge */}
              <div className="w-full">
                <div className="w-full flex items-center justify-center rounded-xl bg-green-600 text-white font-bold py-3 text-base shadow shadow-green-200">
                  <Lock className="w-5 h-5 mr-2" />
                  Data is encrypted
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex text-amber-400">
                  {'★★★★'.split('').map((star, i) => <span key={i} className="text-lg">{star}</span>)}
                  <span className="text-lg text-gray-600">★</span>
                </div>
                <span className="text-white text-sm ml-1">0.0/5</span>
                <span className="text-purple-500 text-sm hover:underline cursor-pointer">0 reviews</span>
              </div>
            </div>

            {/* Purple Stats Card */}
            <div
              className="rounded-2xl p-6 relative overflow-hidden shadow-xl"
              style={{ background: 'linear-gradient(to bottom right, rgb(147, 51, 234), rgb(126, 34, 206))' }}
            >
              <div className="flex gap-2 mb-3">
                <Badge variant="outline" className="text-white border-white/40 bg-transparent text-[10px] px-2 py-0 h-5">Free</Badge>
                <Badge className="bg-purple-800 text-white border-none text-[10px] px-2 py-0 h-5">Active</Badge>
              </div>
              <div className="mb-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">0</span>
                  <span className="text-2xl font-semibold text-white">Test Bookings</span>
                </div>
                <p className="text-[11px] text-purple-100 opacity-80 font-medium">
                  {new Date().toLocaleString('default', { month: 'short' })} 1, {new Date().getFullYear()} – {new Date().toLocaleString('default', { month: 'short' })} {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}, {new Date().getFullYear()}
                </p>
              </div>
            </div>

            {/* Lab Info Card */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Microscope className="w-5 h-5 text-purple-500" />
                  <CardTitle className="text-white text-xl">Lab Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Lab Name</p>
                      <p className="text-white font-medium">{labData?.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                      <p className="text-white font-medium">{labData?.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Lab Code</p>
                      <p className="text-purple-400 font-mono font-medium">{labData?.labCode || '—'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Address</p>
                      <p className="text-white font-medium">{labData?.address || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Pincode / State</p>
                      <p className="text-white font-medium">{labData?.pinCode || '—'} / {labData?.state || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">QR Number</p>
                      <p className="text-purple-400 font-mono font-medium">{labData?.qrNumber || '—'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Coming Soon Features */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-500 animate-pulse" />
                  <CardTitle className="text-white text-xl">Features Coming Soon</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: '🔬', label: 'Test Catalog Management' },
                    { icon: '📋', label: 'Sample Collection Tracking' },
                    { icon: '📊', label: 'Report Upload & Delivery' },
                    { icon: '🏥', label: 'Doctor Referral Network' },
                    { icon: '🎫', label: 'Discount Coupons' },
                    { icon: '📈', label: 'Revenue & Analytics' },
                    { icon: '👥', label: 'Staff Management' },
                    { icon: '🔔', label: 'Patient Notifications' },
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 bg-black rounded-lg px-4 py-3 border border-zinc-800">
                      <span className="text-xl">{feature.icon}</span>
                      <span className="text-sm text-gray-300">{feature.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            </>)}

            {/* Other menu items — Coming Soon */}
            {activeMenu !== 'dashboard' && activeMenu !== 'profile' && activeMenu !== 'qr-manager' && activeMenu !== 'test-catalog' && activeMenu !== 'schedule' && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Settings className="w-12 h-12 text-purple-500/30 mb-4" />
                  <h3 className="text-white text-lg font-semibold mb-2">
                    {sidebarItems.find(i => i.id === activeMenu)?.label || 'Feature'}
                  </h3>
                  <p className="text-gray-500 text-sm">Coming soon...</p>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
