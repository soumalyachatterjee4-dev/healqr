import { useState, useEffect } from 'react';
import { Menu, Bell } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import AdminDashboard from './AdminDashboard';
import AdminProfileManager from './AdminProfileManager';
import AdminRolesManager from './AdminRolesManager';
import AdminDoctorManagement from './AdminDoctorManagement';
import AdminClinicManagement from './AdminClinicManagement';
import AdminPatientManagement from './AdminPatientManagement';
import AdminPersonalManagement from './AdminPersonalManagement';
import AdminTemplateUploader from './AdminTemplateUploader';
import AdminVideoUploader from './AdminVideoUploader';
import AdminNotificationPanel from './AdminNotificationPanel';
import AdminPromoManager from './AdminPromoManager';
import AdminDataStandardization from './AdminDataStandardization';
import AdminPharmaManagement from './AdminPharmaManagement';
import AdminPharmaTemplateApprovals from './AdminPharmaTemplateApprovals';
import AdminAdvertiserManagement from './AdminAdvertiserManagement';
import AdminDistributorManager from './AdminDistributorManager';
import AdminPageDistribution from './AdminPageDistribution';
import AdminAIPMDashboard from './AdminAIPMDashboard';
import AdminRxTrends from './AdminRxTrends';
import AdminPharmaExtractions from './AdminPharmaExtractions';
import AdminPathologyTrends from './AdminPathologyTrends';
import AdminSupportChat from './AdminSupportChat';

import AdminQRGenerator from './AdminQRGenerator';
import AdminQRGeneration from './AdminQRGeneration';
import AdminQRManagement from './AdminQRManagement';
import AdminHealthTipManager from './AdminHealthTipManager';
import AdminSendNotifications from './AdminSendNotifications';
import AdminDiscountCards from './AdminDiscountCards';
import AdminDailyWorkReport from './AdminDailyWorkReport';
import AdminPlatformAnalytics from './AdminPlatformAnalytics';
import AdminReferrerLeaderboard from './AdminReferrerLeaderboard';

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

type PageType = 'dashboard' | 'profile' | 'doctors' | 'clinics' | 'patients'
  | 'personal-management' | 'templates' | 'videos' | 'promo-manager'
  | 'data-cleanup' | 'pharma-management' | 'pharma-templates'
  | 'distribution-requests' | 'advertiser-management' | 'page-distribution'
  | 'ai-pm-dashboard' | 'support-chat' | 'rx-trends' | 'pharma-extractions'
  | 'admin-pathology-trends' | 'qr-generator'
  | 'qr-generation' | 'qr-management' | 'health-tips' | 'send-notifications'
  | 'discount-cards' | 'daily-work-report' | 'roles-manager'
  | 'platform-analytics' | 'referrer-leaderboard';

export default function AdminPanel({
  adminEmail, onLogout, onStartDemo, uploadedTestimonials = [],
  onUploadTestimonial, supportRequests = [],
  onNavigateToQRGenerator, onNavigateToQRGeneration, onNavigateToQRManagement
}: AdminPanelProps) {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [allowedPages, setAllowedPages] = useState<string[] | null>(null);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // Load admin permissions
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const { db } = await import('../lib/firebase/config');
        const { doc, getDoc } = await import('firebase/firestore');

        // Check if super admin
        const superDoc = await getDoc(doc(db, 'adminProfiles', 'super_admin'));
        if (superDoc.exists() && superDoc.data().email === adminEmail) {
          setAllowedPages(null); // null = full access
          setPermissionsLoaded(true);
          return;
        }

        // Load partner admin permissions
        const adminDoc = await getDoc(doc(db, 'admins', adminEmail));
        if (adminDoc.exists()) {
          const data = adminDoc.data();
          setAllowedPages(data.allowedPages || []);
        } else {
          setAllowedPages([]);
        }
      } catch (err) {
        console.error('Error loading admin permissions:', err);
        setAllowedPages([]);
      } finally {
        setPermissionsLoaded(true);
      }
    };
    loadPermissions();
  }, [adminEmail]);

  const handleNavigate = (page: string) => {
    // Block navigation to unauthorized pages (non-super admin)
    if (allowedPages !== null && page !== 'dashboard' && !allowedPages.includes(page)) {
      return;
    }
    setCurrentPage(page as PageType);
  };

  const pageTitles: Record<PageType, string> = {
    dashboard: 'Dashboard',
    // Doctors
    doctors: 'Doctor Management',
    'health-tips': 'Health Tips',
    'send-notifications': 'Send Notifications',
    // Clinics
    clinics: 'Clinic Management',
    // Patients
    patients: 'Patient Management',
    'support-chat': 'Support Chat',
    // Pharma
    'pharma-management': 'Pharma Companies',
    'pharma-templates': 'Pharma Template Approvals',
    'distribution-requests': 'Distributor Requests',
    'pharma-extractions': 'Pharma Extractions',
    'page-distribution': 'Page Distribution',
    // Advertisers
    'advertiser-management': 'Advertiser Management',
    'discount-cards': 'Discount Cards',
    // Admin Self
    profile: 'Profile (Me + Partner)',
    'daily-work-report': 'Daily Work Report',
    'personal-management': 'Personal Management',
    'roles-manager': 'Roles & Permissions',
    // QR
    'qr-generator': 'QR Generator',
    'qr-generation': 'QR Batch Generation',
    'qr-management': 'QR Management',
    // Content
    templates: 'Template Uploader',
    videos: 'Video Uploader',
    'promo-manager': 'Promo Manager',
    'data-cleanup': 'Data Standardization',
    // AI
    'ai-pm-dashboard': 'AI Project Manager',
    'platform-analytics': 'Platform Analytics',
    'rx-trends': 'Rx Trends',
    'admin-pathology-trends': 'Pathology Trends',
    'referrer-leaderboard': 'Referrer Leaderboard',
  };

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const { db } = await import('../lib/firebase/config');
        const { collection, getDocs } = await import('firebase/firestore');
        const snapshot = await getDocs(collection(db, 'supportRequests'));
        const unreadDocs = snapshot.docs.filter(doc => doc.data().status === 'unread');
        setUnreadCount(unreadDocs.length);
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-black text-white">
      <AdminSidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        allowedPages={allowedPages}
      />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-black border-b border-zinc-900 flex items-center gap-4 px-4 z-30">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-zinc-900 rounded-lg transition-colors">
          <Menu className="w-6 h-6 text-emerald-500" />
        </button>
        <h1 className="text-lg flex-1">{pageTitles[currentPage]}</h1>
        <button onClick={() => setIsNotificationPanelOpen(true)} className="relative p-2 hover:bg-zinc-900 rounded-lg transition-colors">
          <Bell className="w-6 h-6 text-emerald-500" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block fixed top-0 right-0 left-64 h-16 bg-black border-b border-zinc-900 flex items-center justify-end px-6 z-30">
        <button onClick={() => setIsNotificationPanelOpen(true)} className="relative p-2 hover:bg-zinc-900 rounded-lg transition-colors">
          <Bell className="w-6 h-6 text-emerald-500" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      <AdminNotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        onNotificationRead={() => setUnreadCount(prev => Math.max(0, prev - 1))}
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
        {/* Doctors */}
        {currentPage === 'doctors' && <AdminDoctorManagement />}
        {currentPage === 'health-tips' && <AdminHealthTipManager />}
        {currentPage === 'send-notifications' && <AdminSendNotifications />}
        {/* Clinics */}
        {currentPage === 'clinics' && <AdminClinicManagement />}
        {/* Patients */}
        {currentPage === 'patients' && <AdminPatientManagement />}
        {currentPage === 'support-chat' && <AdminSupportChat />}
        {/* Pharma */}
        {currentPage === 'pharma-management' && <AdminPharmaManagement />}
        {currentPage === 'pharma-templates' && <AdminPharmaTemplateApprovals />}
        {currentPage === 'distribution-requests' && <AdminDistributorManager />}
        {currentPage === 'pharma-extractions' && <AdminPharmaExtractions />}
        {currentPage === 'page-distribution' && <AdminPageDistribution />}
        {/* Advertisers */}
        {currentPage === 'advertiser-management' && <AdminAdvertiserManagement />}
        {currentPage === 'discount-cards' && <AdminDiscountCards />}
        {/* Admin Self */}
        {currentPage === 'profile' && <AdminProfileManager />}
        {currentPage === 'daily-work-report' && <AdminDailyWorkReport />}
        {currentPage === 'personal-management' && <AdminPersonalManagement />}
        {currentPage === 'roles-manager' && <AdminRolesManager />}
        {/* QR */}
        {currentPage === 'qr-generator' && <AdminQRGenerator />}
        {currentPage === 'qr-generation' && <AdminQRGeneration />}
        {currentPage === 'qr-management' && <AdminQRManagement />}
        {/* Content */}
        {currentPage === 'templates' && <AdminTemplateUploader />}
        {currentPage === 'videos' && <AdminVideoUploader />}
        {currentPage === 'promo-manager' && <AdminPromoManager />}
        {currentPage === 'data-cleanup' && <AdminDataStandardization />}
        {/* AI & Analytics */}
        {currentPage === 'ai-pm-dashboard' && <AdminAIPMDashboard adminEmail={adminEmail} />}
        {currentPage === 'platform-analytics' && <AdminPlatformAnalytics />}
        {currentPage === 'rx-trends' && <AdminRxTrends adminEmail={adminEmail} />}
        {currentPage === 'admin-pathology-trends' && <AdminPathologyTrends />}
        {currentPage === 'referrer-leaderboard' && <AdminReferrerLeaderboard />}
      </div>
    </div>
  );
}