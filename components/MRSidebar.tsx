import {
  Users,
  User,
  Calendar,
  CalendarClock,
  Star,
  Activity,
  FileText,
  LogOut,
  X,
  ChevronDown,
  ChevronRight,
  Menu,
  ClipboardList,
  LayoutDashboard
} from 'lucide-react';
import { useState } from 'react';
import healqrLogo from '../assets/healqr.logo.png';

interface MRSidebarProps {
  activeMenu?: string;
  onMenuChange: (menu: string) => void;
  onLogout?: () => void | Promise<void>;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function MRSidebar({
  activeMenu = 'my-doctors',
  onMenuChange,
  onLogout,
  isOpen = true,
  onClose,
  isCollapsed = false,
  onToggleCollapse
}: MRSidebarProps) {
  const [isMainToolsOpen, setIsMainToolsOpen] = useState(true);
  const [isBookingToolsOpen, setIsBookingToolsOpen] = useState(true);

  const mainTools = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-doctors', label: 'My Doctors', icon: Users },
    { id: 'my-requests', label: 'My Requests', icon: ClipboardList },
    { id: 'profile', label: 'Profile Management', icon: User },
    { id: 'reports', label: 'Visit Reports', icon: FileText },
  ];

  const bookingTools = [
    { id: 'todays-schedule', label: "Today's Schedule", icon: Calendar },
    { id: 'advance-booking', label: 'Advance Booking', icon: CalendarClock },
    { id: 'special-booking', label: 'Special Booking', icon: Star },
    { id: 'live-queue', label: 'Live Queue', icon: Activity },
  ];

  const handleMenuClick = (menuId: string) => {
    onMenuChange(menuId);
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
        fixed lg:fixed top-0 left-0 h-full bg-zinc-950 border-r border-zinc-900 flex flex-col z-50
        transform transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-64'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo & Close Button */}
        <div className="p-6 border-b border-zinc-900 flex-shrink-0 flex items-center justify-between">
          <img src={healqrLogo} alt="HealQR" className="h-10 w-auto" />
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden text-gray-400 hover:text-white transition-colors hover:bg-zinc-800 rounded p-1"
              aria-label="Close sidebar"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto min-h-0">

          {/* MAIN TOOLS */}
          <div className="mb-3">
            <button
              onClick={() => setIsMainToolsOpen(!isMainToolsOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span className="text-xs uppercase tracking-wider flex-1 text-left">
                Main Tools
              </span>
              {isMainToolsOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            {isMainToolsOpen && (
              <div className="mt-1 space-y-0.5">
                {mainTools.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      activeMenu === item.id
                        ? 'bg-blue-600 text-white'
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

          <div className="border-t border-zinc-800 my-4" />

          {/* BOOKING & SCHEDULE TOOLS */}
          <div className="mb-3">
            <button
              onClick={() => setIsBookingToolsOpen(!isBookingToolsOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span className="text-xs uppercase tracking-wider flex-1 text-left">
                Booking & Schedule
              </span>
              {isBookingToolsOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            {isBookingToolsOpen && (
              <div className="mt-1 space-y-0.5">
                {bookingTools.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      activeMenu === item.id
                        ? 'bg-blue-600 text-white'
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
              if (onLogout) onLogout();
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
