import { useState, useEffect } from 'react';
import { Menu, Bell, Share2, Video, User } from 'lucide-react';
import PharmaSidebar from './PharmaSidebar';
import PharmaDashboard from './PharmaDashboard';
import PharmaMyDoctors from './PharmaMyDoctors';
import PharmaMyClinics from './PharmaMyClinics';
import PharmaAnalytics from './PharmaAnalytics';
import PharmaDashboardTemplates from './PharmaDashboardTemplates';
import PharmaProfileManager from './PharmaProfileManager';
import VideoLibrary from './VideoLibrary';
import PharmaRxTrends from './PharmaRxTrends';
import PharmaPathologyTrends from './PharmaPathologyTrends';
import PharmaOnboardingTracker from './PharmaOnboardingTracker';
import PharmaCMEManager from './PharmaCMEManager';
import PharmaSampleRequests from './PharmaSampleRequests';
import UnifiedChatWidget from './UnifiedChatWidget';
import { db } from '../lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

interface PharmaPortalProps {
  onLogout: () => void;
}

export default function PharmaPortal({ onLogout }: PharmaPortalProps) {
  const [currentPage, setCurrentPage] = useState<
    'profile' | 'dashboard' | 'my-doctors' | 'my-clinics' | 'analytics' | 'templates' | 'video-library' | 'rx-trends' | 'pathology-trends' | 'onboarding' | 'cme' | 'samples'
  >('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const companyId = localStorage.getItem('healqr_pharma_company_id') || '';
  const companyName = localStorage.getItem('healqr_pharma_company_name') || '';
  const companyEmail = localStorage.getItem('healqr_pharma_email') || '';
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);

  const pageTitles: Record<string, string> = {    profile: 'Profile',    dashboard: 'Dashboard',
    'my-doctors': 'My Doctors',
    'my-clinics': 'My Clinics',
    analytics: 'Analytics',
    templates: 'Dashboard Templates',
    'video-library': 'Video Library',
    'rx-trends': 'Rx Trends',
    'pathology-trends': 'Pathology Trends',
    'onboarding': 'Onboarding Tracker',
    'cme': 'CME Content',
    'samples': 'Sample Requests',
  };

  // Redirect if not authenticated
  useEffect(() => {
    const isAuth = localStorage.getItem('healqr_pharma_authenticated');
    if (isAuth !== 'true') {
      window.location.href = '/?page=pharma-login';
    }
  }, []);

  // Fetch company logo for navbar profile icon
  useEffect(() => {
    if (!companyId || !db) return;
    const fetchLogo = async () => {
      try {
        const docRef = doc(db, 'pharmaCompanies', companyId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.logoUrl) {
            setCompanyLogoUrl(data.logoUrl);
          }
        }
      } catch (err) {
        console.error('Failed to fetch company logo:', err);
      }
    };
    fetchLogo();
  }, [companyId]);

  const handleLogout = () => {
    localStorage.removeItem('healqr_pharma_authenticated');
    localStorage.removeItem('healqr_pharma_company_id');
    localStorage.removeItem('healqr_pharma_company_name');
    localStorage.removeItem('healqr_pharma_email');
    onLogout();
  };

  const handleShare = async () => {
    const shareData = {
      title: 'healQR Distributors',
      text: `Check out ${companyName} on HealQR Distributors Portal`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      // User cancelled share
    }
  };

  // Navbar icon button component
  const NavIconBtn = ({ icon: Icon, label, onClick, badge, active, imageUrl }: {
    icon: any; label: string; onClick: () => void; badge?: number; active?: boolean; imageUrl?: string | null;
  }) => (
    <button
      onClick={onClick}
      title={label}
      className={`relative p-2.5 rounded-xl border transition-all duration-200 ${
        active
          ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
          : 'bg-zinc-900 border-zinc-800 text-gray-400 hover:bg-zinc-800 hover:text-white hover:border-zinc-700'
      }`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={label} className="w-5 h-5 rounded-full object-cover" />
      ) : (
        <Icon className="w-5 h-5" />
      )}
      {badge && badge > 0 ? (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <PharmaSidebar
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page as any)}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        companyName={companyName}
      />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-black border-b border-zinc-900 flex items-center gap-3 px-4 z-30">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 hover:bg-zinc-900 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6 text-blue-400" />
        </button>
        <h1 className="text-lg flex-1 font-semibold">{pageTitles[currentPage]}</h1>
        <div className="flex items-center gap-2">
          <NavIconBtn icon={Share2} label="Share" onClick={handleShare} />
          <NavIconBtn icon={Video} label="Video Library" onClick={() => setCurrentPage('video-library')} active={currentPage === 'video-library'} />
          <NavIconBtn icon={Bell} label="Notifications" onClick={() => setShowNotifications(!showNotifications)} active={showNotifications} />
          <NavIconBtn icon={User} label="Profile" onClick={() => setShowProfileMenu(!showProfileMenu)} active={showProfileMenu} imageUrl={companyLogoUrl} />
        </div>
      </div>

      {/* Desktop Header - using inline style to guarantee visibility on large screens */}
      <div
        className="fixed top-0 right-0 h-16 bg-black border-b border-zinc-900 items-center justify-between px-6"
        style={{ display: 'none', left: '16rem', zIndex: 40 }}
        ref={(el) => {
          if (el) {
            // Force display flex on lg screens using matchMedia
            const mq = window.matchMedia('(min-width: 1024px)');
            const update = () => { el.style.display = mq.matches ? 'flex' : 'none'; };
            update();
            mq.addEventListener('change', update);
          }
        }}
      >
        <h1 className="text-lg font-semibold">{pageTitles[currentPage]}</h1>
        <div className="flex items-center gap-3">
          <NavIconBtn icon={Share2} label="Share" onClick={handleShare} />
          <NavIconBtn icon={Video} label="Video Library" onClick={() => setCurrentPage('video-library')} active={currentPage === 'video-library'} />
          <NavIconBtn icon={Bell} label="Notifications" onClick={() => setShowNotifications(!showNotifications)} active={showNotifications} />
          <NavIconBtn icon={User} label="Profile" onClick={() => setShowProfileMenu(!showProfileMenu)} active={showProfileMenu} imageUrl={companyLogoUrl} />
        </div>
      </div>

      {/* Notification dropdown */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
          <div className="fixed top-16 right-20 lg:right-24 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Notifications</h3>
            </div>
            <div className="p-6 text-center text-gray-500 text-sm">
              <p>Check the chat button below for support messages and AI assistance.</p>
            </div>
          </div>
        </>
      )}

      {/* Profile dropdown */}
      {showProfileMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
          <div className="fixed top-16 right-4 lg:right-6 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center overflow-hidden">
                  {companyLogoUrl ? (
                    <img src={companyLogoUrl} alt={companyName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{companyName}</p>
                  <p className="text-xs text-gray-400 truncate">{companyEmail}</p>
                </div>
              </div>
            </div>
            <div className="p-2">
              <button onClick={() => { setShowProfileMenu(false); setCurrentPage('profile'); }} className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-zinc-800 rounded-lg transition-colors">Profile</button>
              <button onClick={() => { setShowProfileMenu(false); setCurrentPage('dashboard'); }} className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-zinc-800 rounded-lg transition-colors">Dashboard</button>
              <button onClick={() => { setShowProfileMenu(false); setCurrentPage('templates'); }} className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-zinc-800 rounded-lg transition-colors">Dashboard Templates</button>
              <div className="border-t border-zinc-800 my-1" />
              <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-red-950/30 rounded-lg transition-colors">Logout</button>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 pt-16">
        {currentPage === 'profile' && (
          <PharmaProfileManager companyId={companyId} />
        )}
        {currentPage === 'dashboard' && (
          <PharmaDashboard companyId={companyId} companyName={companyName} />
        )}
        {currentPage === 'my-doctors' && (
          <PharmaMyDoctors companyId={companyId} />
        )}
        {currentPage === 'my-clinics' && (
          <PharmaMyClinics companyId={companyId} />
        )}
        {currentPage === 'analytics' && (
          <PharmaAnalytics companyId={companyId} />
        )}
        {currentPage === 'templates' && (
          <PharmaDashboardTemplates companyId={companyId} />
        )}
        {currentPage === 'video-library' && (
          <VideoLibrary onBack={() => setCurrentPage('dashboard')} source="dashboard" />
        )}
        {currentPage === 'rx-trends' && (
          <PharmaRxTrends companyId={companyId} />
        )}
        {currentPage === 'pathology-trends' && (
          <PharmaPathologyTrends companyId={companyId} />
        )}
        {currentPage === 'onboarding' && (
          <PharmaOnboardingTracker companyId={companyId} />
        )}
        {currentPage === 'cme' && (
          <PharmaCMEManager companyId={companyId} />
        )}
        {currentPage === 'samples' && (
          <PharmaSampleRequests companyId={companyId} />
        )}
      </div>

      {/* Unified AI + Support Chat */}
      <UnifiedChatWidget entityType="pharma" entityId={companyId} entityName={companyName} userRole="visitor" collectionName="pharmaCompanies" />
    </div>
  );
}

