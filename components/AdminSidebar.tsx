import {
  LayoutDashboard,
  User,
  Users,
  Briefcase,
  FileText,
  Video,
  LogOut,
  X,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Megaphone,
  Heart,
  Database,
  Building2,
  MapPinned,
  BarChart2,
  LayoutGrid,
  Brain,
  Headphones
} from 'lucide-react';
import { useState } from 'react';
import healqrLogo from '../assets/healqr.logo.png';

interface AdminSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({
  currentPage,
  onNavigate,
  onLogout,
  isOpen = true,
  onClose
}: AdminSidebarProps) {
  const [isManagementOpen, setIsManagementOpen] = useState(true);
  const [isContentOpen, setIsContentOpen] = useState(true);
  const [isPartnersOpen, setIsPartnersOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);

  const aiTools = [
    { id: 'ai-pm-dashboard', label: 'AI PM Dashboard', icon: Brain },
  ];

  const managementTools = [
    { id: 'profile', label: 'Profile Manager', icon: User },
    { id: 'doctors', label: 'Doctor Management', icon: Users },
    { id: 'clinics', label: 'Clinic Management', icon: Building2 },
    { id: 'patients', label: 'Patient Management', icon: UserCheck },
    { id: 'personal-management', label: 'Personal Management', icon: Briefcase },
    { id: 'support-chat', label: 'Support Chat', icon: Headphones },
  ];

  const contentTools = [
    { id: 'templates', label: 'Template Uploader', icon: FileText },
    { id: 'videos', label: 'Video Uploader', icon: Video },
    { id: 'promo-manager', label: 'Promo Manager', icon: Megaphone },
    { id: 'data-cleanup', label: 'Data Standardization', icon: Database },
  ];

  const partnerTools = [
    { id: 'pharma-management', label: 'Pharma Companies', icon: Building2 },
    { id: 'pharma-templates', label: 'Pharma Templates', icon: FileText },
    { id: 'distribution-requests', label: 'Distributor Requests', icon: MapPinned },
    { id: 'advertiser-management', label: 'Advertisers', icon: BarChart2 },
    { id: 'page-distribution', label: 'Page Distribution', icon: LayoutGrid },
  ];

  const handleMenuClick = (menuId: string) => {
    onNavigate(menuId);
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:fixed top-0 left-0 h-full w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo & Close Button */}
        <div className="p-6 border-b border-zinc-900 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={healqrLogo} alt="HealQR" className="h-10 w-auto" />
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto min-h-0">
          {/* Dashboard */}
          <button
            onClick={() => handleMenuClick('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-3 transition-colors ${
              currentPage === 'dashboard'
                ? 'bg-emerald-500 text-white'
                : 'text-gray-400 hover:bg-zinc-900 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-sm">Dashboard</span>
          </button>

          {/* Divider */}
          <div className="border-t border-zinc-800 mb-4" />

          {/* MANAGEMENT TOOLS */}
          <div className="mb-3">
            <button
              onClick={() => setIsManagementOpen(!isManagementOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span className="text-xs uppercase tracking-wider flex-1 text-left">
                Management Tools
              </span>
              {isManagementOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            {isManagementOpen && (
              <div className="mt-1 space-y-0.5">
                {managementTools.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      currentPage === item.id
                        ? 'bg-emerald-500 text-white'
                        : 'text-gray-400 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CONTENT MANAGEMENT */}
          <div className="mb-3">
            <button
              onClick={() => setIsContentOpen(!isContentOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span className="text-xs uppercase tracking-wider flex-1 text-left">
                Content Management
              </span>
              {isContentOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            {isContentOpen && (
              <div className="mt-1 space-y-0.5">
                {contentTools.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      currentPage === item.id
                        ? 'bg-emerald-500 text-white'
                        : 'text-gray-400 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PARTNERS & DISTRIBUTION */}
          <div className="mb-3">
            <button
              onClick={() => setIsPartnersOpen(!isPartnersOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span className="text-xs uppercase tracking-wider flex-1 text-left">
                Partners & Distribution
              </span>
              {isPartnersOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            {isPartnersOpen && (
              <div className="mt-1 space-y-0.5">
                {partnerTools.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      currentPage === item.id
                        ? 'bg-emerald-500 text-white'
                        : 'text-gray-400 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* AI & ANALYTICS */}
          <div className="mb-3">
            <button
              onClick={() => setIsAIOpen(!isAIOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span className="text-xs uppercase tracking-wider flex-1 text-left">
                AI & Analytics
              </span>
              {isAIOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            {isAIOpen && (
              <div className="mt-1 space-y-0.5">
                {aiTools.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      currentPage === item.id
                        ? 'bg-emerald-500 text-white'
                        : 'text-gray-400 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-zinc-900 flex-shrink-0">
          <button
            onClick={() => {
              onLogout();
              if (onClose) onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

