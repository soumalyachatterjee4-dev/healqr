import { useState, useEffect } from 'react';
import { Menu, Bell } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import AdminDashboard from './AdminDashboard';
import AdminProfileManager from './AdminProfileManager';
import AdminRolesManager from './AdminRolesManager';
import AdminRevenueManager from './AdminRevenueManager';
import AdminDoctorManagement from './AdminDoctorManagement';
import AdminPatientManagement from './AdminPatientManagement';
import AdminPersonalManagement from './AdminPersonalManagement';
import AdminTemplateUploader from './AdminTemplateUploader';
import AdminVideoUploader from './AdminVideoUploader';
import AdminDiscountCards from './AdminDiscountCards';
import AdminNotificationPanel from './AdminNotificationPanel';
import AdminPromoManager from './AdminPromoManager';
import AdminDataStandardization from './AdminDataStandardization';
import AdminPharmaManagement from './AdminPharmaManagement';
import AdminPharmaTemplateApprovals from './AdminPharmaTemplateApprovals';
import AdminAdvertiserManagement from './AdminAdvertiserManagement';
import AdminDistributorManager from './AdminDistributorManager';
import AdminPageDistribution from './AdminPageDistribution';
import AdminAIPMDashboard from './AdminAIPMDashboard';

interface DoctorTestimonial {
  id: number;
  doctor: string;
  patient: string;
  rating: number;
  comment: string;
  date: string;
  specialty?: string;
}

interface SupportRequest {
  id: number;
  doctorName: string;
  doctorCode: string;
  message: string;
  rating: number;
  date: string;
  uploaded: boolean;
}

interface AdminPanelProps {
  adminEmail: string;
  onLogout: () => void;
  onStartDemo?: () => void;
  uploadedTestimonials?: DoctorTestimonial[];
  onUploadTestimonial?: (request: { id: number; doctorName: string; doctorCode: string; message: string; rating: number; date: string }) => void;
  supportRequests?: SupportRequest[];
  onNavigateToQRGenerator?: () => void;
  onNavigateToQRGeneration?: () => void;
  onNavigateToQRManagement?: () => void;
}

export default function AdminPanel({ adminEmail, onLogout, onStartDemo, uploadedTestimonials = [], onUploadTestimonial, supportRequests = [], onNavigateToQRGenerator, onNavigateToQRGeneration, onNavigateToQRManagement }: AdminPanelProps) {
  const [currentPage, setCurrentPage] = useState<
    'dashboard' | 'profile' | 'revenue' | 'doctors' | 'patients' | 'personal-management' | 'templates' | 'videos' | 'discount-cards' | 'promo-manager' | 'data-cleanup' | 'pharma-management' | 'pharma-templates' | 'distribution-requests' | 'advertiser-management' | 'page-distribution' | 'ai-pm-dashboard'
  >('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const pageTitles = {
    dashboard: 'Dashboard',
    profile: 'Profile Manager',
    revenue: 'Revenue Manager',
    doctors: 'Doctor Management',
    patients: 'Patient Management',
    'personal-management': 'Personal Management',
    templates: 'Template Uploader',
    videos: 'Video Uploader',
    'discount-cards': 'Discount Cards',
    'promo-manager': 'Promo Manager',
    'data-cleanup': 'Data Standardization',
    'pharma-management': 'Pharma Companies',
    'pharma-templates': 'Pharma Approvals',
    'distribution-requests': 'Distributor Requests',
    'advertiser-management': 'Advertiser Management',
    'page-distribution': 'Page Distribution',
    'ai-pm-dashboard': 'AI PM Dashboard',
  };

  // Load unread notification count
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const { db } = await import('../lib/firebase/config');
        const { collection, getDocs } = await import('firebase/firestore');

        const supportRequestsRef = collection(db, 'supportRequests');
        const snapshot = await getDocs(supportRequestsRef);

        // Filter unread in memory (no index needed)
        const unreadDocs = snapshot.docs.filter(doc => doc.data().status === 'unread');

        setUnreadCount(unreadDocs.length);
        console.log('✅ Unread notifications:', unreadDocs.length);
      } catch (error) {
        console.error('❌ Error loading unread count:', error);
      }
    };

    loadUnreadCount();

    // Refresh every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <AdminSidebar
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page as any)}
        onLogout={onLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-black border-b border-zinc-900 flex items-center gap-4 px-4 z-30">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 hover:bg-zinc-900 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6 text-emerald-500" />
        </button>
        <h1 className="text-lg flex-1">{pageTitles[currentPage]}</h1>

        {/* Notification Bell */}
        <button
          onClick={() => setIsNotificationPanelOpen(true)}
          className="relative p-2 hover:bg-zinc-900 rounded-lg transition-colors"
        >
          <Bell className="w-6 h-6 text-emerald-500" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Desktop Header with Bell Icon */}
      <div className="hidden lg:block fixed top-0 right-0 left-64 h-16 bg-black border-b border-zinc-900 flex items-center justify-end px-6 z-30">
        <button
          onClick={() => setIsNotificationPanelOpen(true)}
          className="relative p-2 hover:bg-zinc-900 rounded-lg transition-colors"
        >
          <Bell className="w-6 h-6 text-emerald-500" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification Panel */}
      <AdminNotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        onNotificationRead={() => {
          // Reload unread count
          setUnreadCount(prev => Math.max(0, prev - 1));
        }}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 pt-16 lg:pt-16">
        {currentPage === 'dashboard' && (
          <AdminDashboard
            adminEmail={adminEmail}
            onStartDemo={onStartDemo}
            uploadedTestimonials={uploadedTestimonials}
            onUploadTestimonial={onUploadTestimonial}
            supportRequests={supportRequests}
            onNavigateToQRGenerator={onNavigateToQRGenerator}
            onNavigateToQRGeneration={onNavigateToQRGeneration}
            onNavigateToQRManagement={onNavigateToQRManagement}
          />
        )}
        {currentPage === 'profile' && <AdminProfileManager />}
        {currentPage === 'revenue' && <AdminRevenueManager />}
        {currentPage === 'doctors' && <AdminDoctorManagement />}
        {currentPage === 'patients' && <AdminPatientManagement />}
        {currentPage === 'personal-management' && <AdminPersonalManagement />}
        {currentPage === 'templates' && <AdminTemplateUploader />}
        {currentPage === 'videos' && <AdminVideoUploader />}
        {currentPage === 'discount-cards' && <AdminDiscountCards />}
        {currentPage === 'promo-manager' && <AdminPromoManager />}
        {currentPage === 'data-cleanup' && <AdminDataStandardization />}
        {currentPage === 'pharma-management' && <AdminPharmaManagement />}
        {currentPage === 'pharma-templates' && <AdminPharmaTemplateApprovals />}
        {currentPage === 'distribution-requests' && <AdminDistributorManager />}
        {currentPage === 'advertiser-management' && <AdminAdvertiserManagement />}
        {currentPage === 'page-distribution' && <AdminPageDistribution />}
        {currentPage === 'ai-pm-dashboard' && <AdminAIPMDashboard adminEmail={adminEmail} />}
      </div>
    </div>
  );
}
