import {
  Crown,
  BarChart3,
  Clock,
  IndianRupee,
  FileText,
  Package,
  Target,
  Building2,
  Users,
  Stethoscope,
  ChevronDown,
  LogOut,
  LayoutDashboard,
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
  items: MenuItem[];
}

interface MasterAccessSidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  branchCount?: number;
  assistantCount?: number;
}

export default function MasterAccessSidebar({
  activeMenu,
  onMenuChange,
  onLogout,
  isOpen = false,
  onClose,
  branchCount = 0,
  assistantCount = 0,
}: MasterAccessSidebarProps) {
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    daily: true,
    operations: true,
    insights: true,
    management: true,
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
      id: 'overview',
      title: 'OVERVIEW',
      items: [
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      ],
    },
    {
      id: 'daily',
      title: 'DAILY MONITORING',
      items: [
        { id: 'todays-overview', label: "Today's Overview", icon: Clock },
        { id: 'revenue', label: 'Revenue', icon: IndianRupee },
      ],
    },
    {
      id: 'operations',
      title: 'OPERATIONS',
      items: [
        { id: 'billing', label: 'Billing & Receipts', icon: FileText },
        { id: 'inventory', label: 'Inventory & Stock', icon: Package },
      ],
    },
    {
      id: 'insights',
      title: 'INSIGHTS',
      items: [
        { id: 'retention', label: 'Patient Retention', icon: Target },
      ],
    },
    {
      id: 'management',
      title: 'MANAGEMENT',
      items: [
        { id: 'branches', label: 'Branches', icon: Building2 },
        { id: 'assistants', label: 'Assistants', icon: Users },
        { id: 'paramedicals', label: 'Paramedicals', icon: Stethoscope },
      ],
    },
  ];

  const renderSection = (section: Section) => {
    const isExpanded = expandedSections[section.id as keyof typeof expandedSections];

    return (
      <div key={section.id} className="mb-4">
        <button
          onClick={() =>
            setExpandedSections((prev) => ({
              ...prev,
              [section.id]: !prev[section.id as keyof typeof prev],
            }))
          }
          className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-bold text-amber-500/50 uppercase tracking-[0.1em] hover:text-amber-400/70 transition-colors text-left"
        >
          <span className="whitespace-nowrap">{section.title}</span>
          <ChevronDown
            className={`w-3 h-3 text-amber-500/40 transition-transform duration-200 ${
              isExpanded ? '' : '-rotate-90'
            } shrink-0`}
          />
        </button>

        {isExpanded && (
          <div className="mt-1 space-y-0.5">
            {section.items.map((item) => {
              const badge =
                item.id === 'branches' && branchCount > 0
                  ? branchCount
                  : item.id === 'assistants' && assistantCount > 0
                  ? assistantCount
                  : null;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onMenuChange(item.id);
                    if (!isDesktop && onClose) onClose();
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 group text-left ${
                    activeMenu === item.id
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'text-slate-400 hover:bg-amber-500/10 hover:text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="text-[13px] font-normal whitespace-nowrap">
                      {item.label}
                    </span>
                  </div>
                  {badge && (
                    <span className="text-[10px] font-bold bg-amber-500 text-black px-2 py-0.5 rounded-full">
                      {badge}
                    </span>
                  )}
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
        className="fixed left-0 top-0 h-screen w-64 border-r border-amber-900/30 z-[9999] transition-transform duration-300 ease-in-out"
        style={{
          transform: isDesktop || isOpen ? 'translateX(0)' : 'translateX(-100%)',
          backgroundColor: '#0d0a00',
        }}
      >
        <div className="flex flex-col h-full" style={{ backgroundColor: '#0d0a00' }}>
          {/* Logo + Master Badge */}
          <div className="p-6 flex items-center gap-3">
            <img
              src={healqrLogo}
              alt="healQr"
              className="h-8 w-auto filter invert brightness-200"
            />
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
              <Crown className="w-3 h-3" />
              MASTER
            </span>
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
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/25'
                    : 'text-slate-400 hover:bg-amber-900/30 hover:text-amber-200'
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
            <div className="mt-8 mb-8 border-t border-amber-900/30 pt-4">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
