import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  X,
  Building2,
  QrCode,
  CalendarDays,
  BarChart3,
  FileText,
  Eye,
  Calendar,
  Bot,
  TestTubes,
  FileEdit,
  AlertOctagon
} from 'lucide-react';
import healqrLogo from '../assets/healqr-logo.png';
import { useState } from 'react';

interface ClinicSidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ClinicSidebar({ 
  activeMenu, 
  onMenuChange, 
  onLogout, 
  isOpen = true, 
  onClose
}: ClinicSidebarProps) {
  const [managementOpen, setManagementOpen] = useState(true);
  const [clinicToolsOpen, setClinicToolsOpen] = useState(true);
  const [generalToolsOpen, setGeneralToolsOpen] = useState(true);
  const [premiumOpen, setPremiumOpen] = useState(true);

  const managementTools = [
    { id: 'doctors', label: 'Manage Doctors', icon: Users },
    { id: 'profile', label: 'Clinic Profile', icon: Building2 },
    { id: 'qr-manager', label: 'QR Manager', icon: QrCode },
    { id: 'schedule-manager', label: 'Schedule Manager', icon: Calendar }
  ];

  const clinicTools = [
    { id: 'todays-schedule', label: "Today's Schedule", icon: CalendarDays },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  const generalTools = [
    { id: 'preview', label: 'Preview Centre', icon: Eye },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const premiumTools = [
    { id: 'assistant', label: 'Assistant Access', icon: Bot },
    { id: 'lab-referral', label: 'Lab Referral Tracking', icon: TestTubes },
    { id: 'templates', label: 'Personalized Templates', icon: FileEdit },
    { id: 'emergency', label: 'Emergency Button', icon: AlertOctagon }
  ];

  const renderSection = (title: string, items: any[], isOpen: boolean, setIsOpen: (v: boolean) => void) => (
    <div className="mb-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors"
      >
        {title}
      </button>
      {isOpen && (
        <div className="mt-1 space-y-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onMenuChange(item.id);
                if (window.innerWidth < 1024 && onClose) {
                  onClose();
                }
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-2
                ${activeMenu === item.id 
                  ? 'bg-blue-500/10 text-blue-500 border-blue-500' 
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-zinc-800'
                }
              `}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

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
      <div className={`
        fixed top-0 left-0 bottom-0 w-64 bg-zinc-900 border-r border-zinc-800 z-50
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-800 flex-shrink-0">
          <img src={healqrLogo} alt="HealQR" className="h-6" />
          <button 
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          <button
            onClick={() => onMenuChange('dashboard')}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-6
              ${activeMenu === 'dashboard' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                : 'text-gray-400 hover:text-white hover:bg-zinc-800'
              }
            `}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>

          {renderSection('Management Tools', managementTools, managementOpen, setManagementOpen)}
          {renderSection('Clinic Tools', clinicTools, clinicToolsOpen, setClinicToolsOpen)}
          {renderSection('General Tools', generalTools, generalToolsOpen, setGeneralToolsOpen)}
          {renderSection('Premium Add-on Service', premiumTools, premiumOpen, setPremiumOpen)}
          
          <div className="mt-8 border-t border-zinc-800 pt-4">
             <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
