import {
  LayoutDashboard, Users, BarChart3, FileText,
  LogOut, X, ChevronDown, ChevronRight, Building2,
  MessageSquare, Hospital, FlaskConical, UserCheck, BookOpen, Package, Microscope
} from 'lucide-react';
import healqrLogo from '../assets/healqr.logo.png';
import { useState } from 'react';

interface PharmaSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  companyName?: string;
}

export default function PharmaSidebar({ currentPage, onNavigate, onLogout, isOpen, onClose, companyName }: PharmaSidebarProps) {
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(true);

  const mainItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Profile', icon: Users },
    { id: 'my-doctors', label: 'My Doctors', icon: Users },
    { id: 'my-clinics', label: 'My Clinics', icon: Hospital },
  ];

  const analyticsItems = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'rx-trends', label: 'Rx Trends', icon: FlaskConical },
    { id: 'pathology-trends', label: 'Pathology Trends', icon: Microscope },
    { id: 'onboarding', label: 'Onboarding Tracker', icon: UserCheck },
  ];

  const contentItems = [
    { id: 'templates', label: 'Dashboard Templates', icon: FileText },
    { id: 'cme', label: 'CME Content', icon: BookOpen },
    { id: 'samples', label: 'Sample Requests', icon: Package },
  ];

  const handleNavigate = (page: string) => {
    onNavigate(page);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`fixed top-0 left-0 h-full w-64 bg-zinc-950 border-r border-zinc-900 z-50 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Header */}
        <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={healqrLogo} alt="HealQR" className="h-8" />
            <div>
              <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Pharma</span>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Company Name */}
        {companyName && (
          <div className="px-6 py-3 border-b border-zinc-900">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-white font-medium truncate">{companyName}</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {/* Main */}
          {mainItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentPage === item.id
                  ? 'bg-emerald-500 text-white'
                  : 'text-gray-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}

          {/* Analytics Section */}
          <div className="pt-4">
            <button
              onClick={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wider text-gray-500 hover:text-gray-400 transition-colors"
            >
              <span>Analytics & Insights</span>
              {isAnalyticsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {isAnalyticsOpen && (
              <div className="space-y-1">
                {analyticsItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === item.id
                        ? 'bg-emerald-500 text-white'
                        : 'text-gray-400 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="pt-4">
            <div className="px-3 py-2 text-xs uppercase tracking-wider text-gray-500">
              Content
            </div>
            {contentItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-zinc-900">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

