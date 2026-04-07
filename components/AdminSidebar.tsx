import {
  LayoutDashboard, User, Users, Briefcase, FileText, Video, LogOut, X,
  UserCheck, ChevronDown, ChevronRight, Megaphone, Database, Building2,
  MapPinned, BarChart2, LayoutGrid, Brain, Headphones, Download, Microscope,
  QrCode, Shield, ClipboardList, Heart, Bell, Tag, TrendingUp,
  Stethoscope, Activity
} from 'lucide-react';
import { useState } from 'react';
import healqrLogo from '../assets/healqr.logo.png';

interface AdminSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  allowedPages?: string[] | null;
}

export default function AdminSidebar({ currentPage, onNavigate, onLogout, isOpen = true, onClose, allowedPages }: AdminSidebarProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    doctors: false,
    clinics: false,
    patients: false,
    pharma: false,
    advertisers: false,
    admin: true,
    qr: false,
    content: false,
    ai: false,
  });

  const toggle = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const sections = [
    {
      key: 'doctors',
      label: 'Doctors',
      color: 'text-blue-400',
      items: [
        { id: 'doctors', label: 'Doctor Management', icon: Stethoscope },
        { id: 'health-tips', label: 'Health Tips', icon: Heart },
        { id: 'send-notifications', label: 'Send Notifications', icon: Bell },
      ],
    },
    {
      key: 'clinics',
      label: 'Clinics',
      color: 'text-cyan-400',
      items: [
        { id: 'clinics', label: 'Clinic Management', icon: Building2 },
      ],
    },
    {
      key: 'patients',
      label: 'Patients',
      color: 'text-pink-400',
      items: [
        { id: 'patients', label: 'Patient Management', icon: UserCheck },
        { id: 'support-chat', label: 'Support Chat', icon: Headphones },
      ],
    },
    {
      key: 'pharma',
      label: 'Pharma (Distributor)',
      color: 'text-orange-400',
      items: [
        { id: 'pharma-management', label: 'Pharma Companies', icon: Building2 },
        { id: 'pharma-templates', label: 'Template Approvals', icon: FileText },
        { id: 'distribution-requests', label: 'Distributor Requests', icon: MapPinned },
        { id: 'pharma-extractions', label: 'Pharma Extractions', icon: Download },
        { id: 'page-distribution', label: 'Page Distribution', icon: LayoutGrid },
      ],
    },
    {
      key: 'advertisers',
      label: 'Advertisers',
      color: 'text-amber-400',
      items: [
        { id: 'advertiser-management', label: 'Advertiser Management', icon: BarChart2 },
        { id: 'discount-cards', label: 'Discount Cards', icon: Tag },
      ],
    },
    {
      key: 'admin',
      label: 'Admin Self',
      color: 'text-emerald-400',
      items: [
        { id: 'profile', label: 'Profile (Me + Partner)', icon: User },
        { id: 'daily-work-report', label: 'Daily Work Report', icon: ClipboardList },
        { id: 'personal-management', label: 'Personal Management', icon: Briefcase },
        { id: 'roles-manager', label: 'Roles & Permissions', icon: Shield },
      ],
    },
    {
      key: 'qr',
      label: 'QR Generation',
      color: 'text-violet-400',
      items: [
        { id: 'qr-generator', label: 'QR Generator', icon: QrCode },
        { id: 'qr-generation', label: 'QR Batch Generation', icon: QrCode },
        { id: 'qr-management', label: 'QR Management', icon: QrCode },
      ],
    },
    {
      key: 'content',
      label: 'Content & Tools',
      color: 'text-teal-400',
      items: [
        { id: 'templates', label: 'Template Uploader', icon: FileText },
        { id: 'videos', label: 'Video Uploader', icon: Video },
        { id: 'promo-manager', label: 'Promo Manager', icon: Megaphone },
        { id: 'data-cleanup', label: 'Data Standardization', icon: Database },
      ],
    },
    {
      key: 'ai',
      label: 'AI & Analytics',
      color: 'text-purple-400',
      items: [
        { id: 'ai-pm-dashboard', label: 'AI Project Manager', icon: Brain },
        { id: 'platform-analytics', label: 'Platform Analytics', icon: TrendingUp },
        { id: 'rx-trends', label: 'Rx Trends', icon: Activity },
        { id: 'admin-pathology-trends', label: 'Pathology Trends', icon: Microscope },
        { id: 'referrer-leaderboard', label: 'Referrer Leaderboard', icon: Users },
      ],
    },
  ];

  const handleMenuClick = (menuId: string) => {
    onNavigate(menuId);
    if (onClose) onClose();
  };

  // Filter sections based on allowedPages (null = super admin = show all)
  const filteredSections = allowedPages
    ? sections
        .map(section => ({
          ...section,
          items: section.items.filter(item => allowedPages.includes(item.id)),
        }))
        .filter(section => section.items.length > 0)
    : sections;

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed lg:fixed top-0 left-0 h-full w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Logo */}
        <div className="p-6 border-b border-zinc-900 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={healqrLogo} alt="HealQR" className="h-10 w-auto" />
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto min-h-0">
          {/* Dashboard */}
          <button onClick={() => handleMenuClick('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-3 transition-colors ${
              currentPage === 'dashboard' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:bg-zinc-900 hover:text-white'
            }`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-sm font-medium">Dashboard</span>
          </button>
          <div className="border-t border-zinc-800 mb-3" />

          {/* Entity Sections */}
          {filteredSections.map(section => (
            <div key={section.key} className="mb-2">
              <button onClick={() => toggle(section.key)}
                className="w-full flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-300 transition-colors">
                <span className={`text-[10px] uppercase tracking-wider flex-1 text-left font-bold ${section.color}`}>
                  {section.label}
                </span>
                {openSections[section.key]
                  ? <ChevronDown className="w-3.5 h-3.5" />
                  : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {openSections[section.key] && (
                <div className="mt-0.5 space-y-0.5">
                  {section.items.map(item => (
                    <button key={item.id} onClick={() => handleMenuClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        currentPage === item.id ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:bg-zinc-900 hover:text-white'
                      }`}>
                      <item.icon className="w-4 h-4" />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-zinc-900 flex-shrink-0">
          <button onClick={() => { onLogout(); if (onClose) onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-950/30 transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}