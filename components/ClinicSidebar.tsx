import {
  LayoutDashboard,
  Users,
  Building2,
  QrCode,
  Calendar,
  Clock,
  CalendarRange,
  BarChart3,
  Bell,
  Share2,
  CalendarPlus,
  Stethoscope,
  Bot,
  TestTubes,
  FileEdit,
  AlertOctagon,
  Apple,
  ScanText,
  Video,
  ChevronDown,
  Check,
  LogOut,
  BookOpen,
  Package,
  Database,
  Target,
  Monitor,
  IndianRupee,
  FileText,
  Megaphone,
  Network
} from 'lucide-react';
import healqrLogo from '../assets/healqr.logo.png';
import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  isAddon?: boolean;
}

interface Section {
  id: string;
  title: string;
  items: MenuItem[];
}

interface ClinicSidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
  onLogout: () => void | Promise<void>;
  isOpen?: boolean;
  onClose?: () => void;
  isAssistant?: boolean;
  assistantAllowedPages?: string[];
  activeAddOns?: string[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isLocationManager?: boolean;
}

export default function ClinicSidebar({
  activeMenu,
  onMenuChange,
  onLogout,
  isOpen = false,
  onClose,
  isAssistant = false,
  assistantAllowedPages = [],
  activeAddOns = [],
  isCollapsed = false,
  onToggleCollapse,
  isLocationManager: isLocationManagerProp = false
}: ClinicSidebarProps) {
  // Always check localStorage as fallback — many components don't pass this prop
  const isLocationManager = isLocationManagerProp || localStorage.getItem('healqr_is_location_manager') === 'true';

  const [expandedSections, setExpandedSections] = useState({
    management: true,
    'practice-enhancer': true,
    general: true,
    'free-addon': true,
    'freemium-addon': true,
  });

  // Track viewport width for responsive sidebar
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Branch managers get a restricted set of pages
  const branchAllowedPages = [
    'dashboard', 'doctors', 'qr-manager', 'schedule-manager', 'todays-schedule',
    'advance-booking', 'analytics', 'reports', 'revenue-dashboard', 'billing-receipt', 'inventory-manager', 'patient-broadcast', 'patient-retention', 'queue-display', 'staff-attendance', 'social-kit', 'paramedical-manager', 'monthly-planner', 'data-management',
    'assistant', 'lab-referral', 'ai-diet', 'ai-rx', 'video-consult',
    'pharma-cme', 'pharma-samples'
  ];

  const sections: Section[] = [
    {
      id: 'management',
      title: 'MANAGEMENT TOOLS',
      items: [
        // Hide Location Manager for branch manager users
        ...((!isLocationManager) ? [{ id: 'location-manager', label: 'Location Manager', icon: Building2 }] : []),
        { id: 'doctors', label: 'Manage Doctors', icon: Users },
        { id: 'profile', label: 'Clinic Profile', icon: Building2 },
        { id: 'qr-manager', label: 'QR Manager', icon: QrCode },
        { id: 'schedule-manager', label: 'Schedule Manager', icon: Calendar },
      ]
    },
    {
      id: 'practice-enhancer',
      title: 'PRACTICE ENHANCER TOOLS',
      items: [
        { id: 'todays-schedule', label: "Today's Schedule", icon: Clock },
        { id: 'advance-booking', label: 'Advance Booking', icon: CalendarRange },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'reports', label: 'Reports', icon: Bell },
        { id: 'revenue-dashboard', label: 'Revenue', icon: IndianRupee },
        { id: 'billing-receipt', label: 'Billing & Receipts', icon: FileText },
        { id: 'inventory-manager', label: 'Inventory', icon: Package },
        { id: 'patient-broadcast', label: 'Patient Broadcast', icon: Megaphone },
        { id: 'referral-network', label: 'Referral Network', icon: Network },
        { id: 'patient-retention', label: 'Patient Retention', icon: Target },
        { id: 'queue-display', label: 'Queue Display', icon: Monitor },
        { id: 'staff-attendance', label: 'Staff Attendance', icon: Users },
        { id: 'social-kit', label: 'Social Kit & Offers', icon: Share2 },
        { id: 'paramedical-manager', label: 'Paramedical Manager', icon: Stethoscope },
      ]
    },
    {
      id: 'general',
      title: 'GENERAL TOOLS',
      items: [
        { id: 'monthly-planner', label: 'Monthly Planner', icon: CalendarPlus },
        { id: 'data-management', label: 'Data Management', icon: Database },
      ]
    },
    {
      id: 'free-addon',
      title: 'FREE ADD-ON SERVICE',
      items: [
        { id: 'assistant', label: 'Assistant Access', icon: Bot, isAddon: true },
        { id: 'lab-referral', label: 'Lab Referral Tracking', icon: TestTubes, isAddon: true },
        { id: 'templates', label: 'Personalized Templates', icon: FileEdit, isAddon: true },
        { id: 'emergency', label: 'Emergency Button', icon: AlertOctagon, isAddon: true },
      ]
    },
    {
      id: 'freemium-addon',
      title: 'FREEMIUM ADD-ON SERVICE',
      items: [
        { id: 'ai-diet', label: 'AI Diet Chart', icon: Apple, isAddon: true },
        { id: 'ai-rx', label: 'AI RX Reader', icon: ScanText, isAddon: true },
        { id: 'video-consult', label: 'Video Consultation', icon: Video, isAddon: true },
      ]
    },
    {
      id: 'pharma-services',
      title: 'PHARMA SERVICES',
      items: [
        { id: 'pharma-cme', label: 'CME Content', icon: BookOpen },
        { id: 'pharma-samples', label: 'Sample Requests', icon: Package },
      ]
    }
  ];

  // Helper function to check if page is accessible
  const isPageAccessible = (pageId: string) => {
    // Branch managers get a restricted set of pages
    if (isLocationManager && !branchAllowedPages.includes(pageId)) return false;
    // Assistants only see pages granted by their clinic
    if (isAssistant && pageId !== 'dashboard' && !assistantAllowedPages.includes(pageId)) return false;
    return true;
  };

  const renderSection = (section: typeof sections[0]) => {
    const isExpanded = expandedSections[section.id as keyof typeof expandedSections];

    return (
      <div key={section.id} className="mb-4">
        <button
          onClick={() => setExpandedSections(prev => ({ ...prev, [section.id]: !prev[section.id as keyof typeof prev] }))}
          className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-bold text-blue-400/50 uppercase tracking-[0.1em] hover:text-blue-300/70 transition-colors text-left"
        >
          <span className="whitespace-nowrap">{section.title}</span>
          <ChevronDown className={`w-3 h-3 text-blue-500/40 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'} shrink-0`} />
        </button>

        {isExpanded && (
          <div className="mt-1 space-y-0.5">
            {section.items.map((item) => {
              const accessible = isPageAccessible(item.id);
              return (
              <button
                key={item.id}
                onClick={() => {
                  if (!accessible) return; // Block locked items
                  onMenuChange(item.id);
                  if (!isDesktop && onClose) {
                    onClose();
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 group text-left ${
                  !accessible
                    ? 'text-slate-600 cursor-not-allowed opacity-50'
                    : activeMenu === item.id
                    ? 'bg-blue-500/15 text-blue-400'
                    : item.isAddon
                      ? 'text-blue-300 hover:bg-blue-500/10'
                      : 'text-slate-400 hover:bg-blue-500/10 hover:text-blue-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="text-[13px] font-normal whitespace-nowrap">{item.label}</span>
                </div>
                {!accessible ? (
                  <Lock className="w-3 h-3 text-slate-600 shrink-0" />
                ) : item.isAddon ? (
                  <Check className="w-3 h-3 text-blue-400 opacity-80 shrink-0" />
                ) : null}
              </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && !isDesktop && (
        <div
          className="fixed inset-0 bg-black/50 z-[9998] animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className="fixed left-0 top-0 h-screen w-64 border-r border-blue-900/30 z-[9999] transition-transform duration-300 ease-in-out"
        style={{
          transform: isDesktop || isOpen ? 'translateX(0)' : 'translateX(-100%)',
          backgroundColor: '#0a0f1e'
        }}
      >
        <div className="flex flex-col h-full" style={{ backgroundColor: '#0a0f1e' }}>
          {/* Logo */}
          <div className="p-6">
            <img src={healqrLogo} alt="healQr" className="h-8 w-auto filter invert brightness-200" />
          </div>

          <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
            {/* Dashboard Button */}
            <div className="mb-6">
              <button
                key="dashboard-top"
                onClick={() => {
                  onMenuChange('dashboard');
                  if (window.innerWidth < 1024 && onClose) onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  activeMenu === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-slate-400 hover:bg-blue-900/30 hover:text-blue-200'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-[15px] font-semibold">Dashboard</span>
              </button>
            </div>

            <div className="space-y-2">
              {sections.map(section => renderSection(section))}
            </div>

            {/* Logout Button - hidden for assistants */}
            {!isAssistant && (
            <div className="mt-8 mb-8 border-t border-blue-900/30 pt-4">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

