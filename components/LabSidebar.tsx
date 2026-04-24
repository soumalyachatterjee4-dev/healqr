import {
  LayoutDashboard,
  User,
  QrCode,
  TestTubes,
  Calendar,
  ClipboardList,
  FileText,
  BarChart3,
  ChevronDown,
  LogOut,
  IndianRupee,
  Package,
  Megaphone,
  Network,
  Target,
  Monitor,
  Share2,
  CalendarPlus,
  Database,
  Syringe,
  Upload,
  Search,
  Truck,
  UserCheck,
  Building2,
  Stethoscope,
} from 'lucide-react';
import healqrLogo from '../assets/healqr.logo.png';
import { useState, useEffect } from 'react';

interface MenuItem {
  id: string;
  label: string;
  icon: any;
}

interface Section {
  id: string;
  title: string;
  color: string;
  items: MenuItem[];
}

interface LabSidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
  onLogout: () => void | Promise<void>;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function LabSidebar({
  activeMenu,
  onMenuChange,
  onLogout,
  isOpen = false,
  onClose,
}: LabSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    management: true,
    'practice-enhancer': true,
    'home-collection': true,
    general: true,
  });

  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sections: Section[] = [
    {
      id: 'management',
      title: 'MANAGEMENT TOOLS',
      color: 'blue',
      items: [
        { id: 'location-manager', label: 'Location Manager', icon: Building2 },
        { id: 'manage-doctors', label: 'Manage Doctors', icon: Stethoscope },
        { id: 'profile', label: 'Lab Profile', icon: User },
        { id: 'qr-manager', label: 'QR Manager', icon: QrCode },
        { id: 'test-catalog', label: 'Test Catalog', icon: TestTubes },
        { id: 'schedule', label: 'Schedule Manager', icon: Calendar },
      ],
    },
    {
      id: 'practice-enhancer',
      title: 'PRACTICE ENHANCER TOOLS',
      color: 'purple',
      items: [
        { id: 'bookings', label: 'Bookings Manager', icon: ClipboardList },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'report-upload', label: 'Report Upload', icon: Upload },
        { id: 'report-search', label: 'Report Search', icon: Search },
        { id: 'revenue', label: 'Revenue Dashboard', icon: IndianRupee },
        { id: 'billing', label: 'Billing & Receipts', icon: FileText },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'patient-broadcast', label: 'Patient Broadcast', icon: Megaphone },
        { id: 'referral-network', label: 'Referral Network', icon: Network },
        { id: 'patient-retention', label: 'Patient Retention', icon: Target },
        { id: 'queue-display', label: 'Queue Display', icon: Monitor },
        { id: 'staff', label: 'Staff Attendance', icon: UserCheck },
        { id: 'social-kit', label: 'Social Kit & Offers', icon: Share2 },
      ],
    },
    {
      id: 'home-collection',
      title: 'PARAMEDICAL SERVICES',
      color: 'emerald',
      items: [
        { id: 'phlebotomist-manager', label: 'Paramedical Manager', icon: Syringe },
        { id: 'allocation-queue', label: 'Allocation Queue', icon: Truck },
      ],
    },
    {
      id: 'general',
      title: 'GENERAL TOOLS',
      color: 'slate',
      items: [
        { id: 'monthly-planner', label: 'Monthly Planner', icon: CalendarPlus },
        { id: 'data-management', label: 'Data Management', icon: Database },
      ],
    },
  ];

  // Color maps for section headers and active items
  const sectionHeaderColor: Record<string, string> = {
    purple: 'text-purple-400/50',
    emerald: 'text-emerald-400/50',
    blue: 'text-blue-400/50',
    slate: 'text-slate-400/50',
  };

  const sectionChevronColor: Record<string, string> = {
    purple: 'text-purple-500/40',
    emerald: 'text-emerald-500/40',
    blue: 'text-blue-500/40',
    slate: 'text-slate-500/40',
  };

  const sectionActiveClass: Record<string, string> = {
    purple: 'bg-purple-500/15 text-purple-400',
    emerald: 'bg-emerald-500/15 text-emerald-400',
    blue: 'bg-blue-500/15 text-blue-400',
    slate: 'bg-slate-500/15 text-slate-400',
  };

  const renderSection = (section: Section) => {
    const isExpanded = expandedSections[section.id] ?? true;

    return (
      <div key={section.id} className="mb-4">
        <button
          onClick={() =>
            setExpandedSections((prev) => ({
              ...prev,
              [section.id]: !prev[section.id],
            }))
          }
          className={`w-full flex items-center justify-between px-4 py-2 text-[10px] font-bold uppercase tracking-[0.1em] hover:opacity-80 transition-colors text-left ${sectionHeaderColor[section.color]}`}
        >
          <span className="whitespace-nowrap">{section.title}</span>
          <ChevronDown
            className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'} shrink-0 ${sectionChevronColor[section.color]}`}
          />
        </button>

        {isExpanded && (
          <div className="mt-1 space-y-0.5">
            {section.items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onMenuChange(item.id);
                  if (!isDesktop && onClose) onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group text-left ${
                  activeMenu === item.id
                    ? sectionActiveClass[section.color]
                    : 'text-slate-400 hover:bg-purple-500/10 hover:text-purple-200'
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="text-[13px] font-normal whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            ))}
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
        className="fixed left-0 top-0 h-screen w-64 border-r border-purple-900/30 z-[9999] transition-transform duration-300 ease-in-out"
        style={{
          transform: isDesktop || isOpen ? 'translateX(0)' : 'translateX(-100%)',
          backgroundColor: '#0d0a1a',
        }}
      >
        <div className="flex flex-col h-full" style={{ backgroundColor: '#0d0a1a' }}>
          {/* Logo */}
          <div className="p-6">
            <img
              src={healqrLogo}
              alt="healQr"
              className="h-8 w-auto filter invert brightness-200"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
            {/* Dashboard Button */}
            <div className="mb-6">
              <button
                onClick={() => {
                  onMenuChange('dashboard');
                  if (!isDesktop && onClose) onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  activeMenu === 'dashboard'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                    : 'text-slate-400 hover:bg-purple-900/30 hover:text-purple-200'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-[15px] font-semibold">Dashboard</span>
              </button>
            </div>

            <div className="space-y-2">
              {sections.map((section) => renderSection(section))}
            </div>

            {/* Logout */}
            <div className="mt-8 mb-8 border-t border-purple-900/30 pt-4">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-[13px]">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
