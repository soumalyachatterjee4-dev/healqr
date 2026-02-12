import {
  BarChart3,
  User,
  QrCode,
  CalendarDays,
  Calendar,
  TrendingUp,
  FileText,
  ShoppingCart,
  Eye,
  LogOut,
  X,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Lock,
  Check,
  FileText as FileTextIcon,
  ShoppingBag,
  DollarSign,
  MessageSquare,
  FileBarChart,
  Users,
  Bot,
  Video,
  Scan,
  Eye as EyeIcon,
  CalendarClock,
  AlertCircle,
  History
} from 'lucide-react';
import { useState, useEffect } from 'react';
import healqrLogo from '../assets/healqr-logo.png';

interface DashboardSidebarProps {
  activeMenu?: string;
  onMenuChange: (menu: string) => void;
  onLogout?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  activeAddOns?: string[];
  isBookingBlocked?: boolean; // When booking limit reached or subscription failed
  isAssistant?: boolean; // Hide logout for assistants
  assistantAllowedPages?: string[]; // Pages assistant can access
}

export default function DashboardSidebar({
  activeMenu = 'dashboard',
  onMenuChange,
  onLogout,
  isOpen = true,
  onClose,
  activeAddOns = [],
  isBookingBlocked = false,
  isAssistant = false,
  assistantAllowedPages = []
}: DashboardSidebarProps) {
  const [isManagementOpen, setIsManagementOpen] = useState(true);
  const [isPracticeEnhancerOpen, setIsPracticeEnhancerOpen] = useState(true);
  const [isGeneralToolsOpen, setIsGeneralToolsOpen] = useState(true);
  const [isPremiumOpen, setIsPremiumOpen] = useState(true);
  const [isTodayBlocked, setIsTodayBlocked] = useState(false);

  // Helper function to check if page is accessible to assistant
  const isPageAccessible = (pageId: string) => {
    if (!isAssistant) return true; // Doctors have full access
    // Assistants can access dashboard + their allowed pages
    const hasAccess = pageId === 'dashboard' || assistantAllowedPages.includes(pageId);
    if (isAssistant) {
      console.log(`🔍 Checking access for "${pageId}":`, hasAccess, '| Allowed pages:', assistantAllowedPages);
    }
    return hasAccess;
  };

  // Check if today is in a planned off period
  useEffect(() => {
    const checkPlannedOff = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const { db } = await import('../lib/firebase/config');
        if (!db) return;

        const { doc, getDoc } = await import('firebase/firestore');
        const doctorDoc = await getDoc(doc(db, 'doctors', userId));

        if (doctorDoc.exists()) {
          const data = doctorDoc.data();
          const plannedOffPeriods = data.plannedOffPeriods || [];

          // Get today's date in YYYY-MM-DD format
          const today = new Date();
          const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

          // Check if today falls within any active planned off period
          const isBlocked = plannedOffPeriods.some((period: any) => {
            if (period.status !== 'active') return false;

            const startDate = period.startDate?.toDate?.() || new Date(period.startDate);
            const endDate = period.endDate?.toDate?.() || new Date(period.endDate);
            const todayDate = new Date(todayStr);

            return todayDate >= new Date(startDate.toISOString().split('T')[0]) &&
                   todayDate <= new Date(endDate.toISOString().split('T')[0]);
          });

          setIsTodayBlocked(isBlocked);
        }
      } catch (error) {
        console.error('Error checking planned off:', error);
      }
    };

    checkPlannedOff();
  }, []);

  const managementTools = [
    { id: 'profile', label: 'Profile Manager', icon: User },
    { id: 'qr', label: 'QR Manager', icon: QrCode },
    { id: 'schedule', label: 'Schedule Manager', icon: CalendarDays },
  ];

  const practiceEnhancerTools = [
    { id: 'todays-schedule', label: "Today's Schedule", icon: Calendar },
    { id: 'advance-booking', label: 'Advance Booking', icon: CalendarClock },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'monthly-planner', label: 'Monthly Planner', icon: Calendar },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  const generalTools = [
    { id: 'preview', label: 'Preview Centre', icon: Eye },
    // Purchase History removed
  ];

  const premiumAddOnPages = [
    {
      id: 'assistant-access',
      label: 'Assistant Access',
      icon: Users,
      addonKey: 'assistant-access'
    },
    {
      id: 'lab-referral-tracking',
      label: 'Lab Referral Tracking',
      icon: FileBarChart,
      addonKey: 'lab-referral-tracking'
    },
    {
      id: 'personalized-templates',
      label: 'Personalized Templates',
      icon: FileTextIcon,
      addonKey: 'personalized-templates'
    },
    {
      id: 'emergency-button',
      label: 'Emergency Button',
      icon: AlertCircle,
      addonKey: 'emergency-button'
    },
    {
      id: 'ai-rx-reader',
      label: 'AI RX Reader',
      icon: Scan,
      addonKey: 'ai-rx-reader',
      disabled: true // Paid service - Coming Soon
    },
    {
      id: 'video-consultation',
      label: 'Video Consultation',
      icon: Video,
      addonKey: 'video-consultation',
      disabled: true // Paid service - Coming Soon
    }
  ];

  const handleMenuClick = (menuId: string) => {
    // Booking blocking logic removed - project is now free
    onMenuChange(menuId);
    if (onClose) {
      onClose();
    }
  };

  const handlePremiumItemClick = (item: typeof premiumAddOnPages[0]) => {
    // ============================================================================
    // 🚫 PREMIUM ADD-ON SIDEBAR NAVIGATION IS DISABLED
    // ============================================================================
    // Premium add-on service pages should NOT be clickable directly from sidebar.
    // Users can only access these features through:
    // 1. Doctor pays → page activated → green → clickable (ONLY from premium store)
    // 2. Doctor press DEMO → page activated → yellow → clickable (ONLY demo surfing)
    //
    // BUT NOT CLICKABLE DIRECTLY FROM SIDEBAR
    //
    // This function should never be called as premium items render as non-clickable divs
    // ============================================================================

    // Do nothing - premium items are not clickable from sidebar
    return;
  };

  // Check if a premium feature is accessible (paid or demo mode)
  const isPremiumFeatureAccessible = (addonKey: string): { accessible: boolean; isDemo: boolean; isPaid: boolean } => {
    // Emergency Button & Assistant Access are always FREE and accessible
    if (addonKey === 'emergency-button' || addonKey === 'assistant-access') {
      return {
        accessible: true,
        isDemo: false,
        isPaid: true // Show as green/activated
      };
    }

    // Check if paid - also check localStorage directly as fallback
    let isPaid = activeAddOns.includes(addonKey);

    // FALLBACK: If not in activeAddOns prop, check localStorage directly
    // This fixes the race condition after logout/login
    if (!isPaid) {
      try {
        const stored = localStorage.getItem('healqr_active_addons');
        if (stored) {
          const storedAddons = JSON.parse(stored);
          isPaid = storedAddons.includes(addonKey);
        }
      } catch {
        isPaid = false;
      }
    }

    // Check if in demo mode
    let isDemo = false;
    try {
      const stored = localStorage.getItem('healqr_demo_mode_addons');
      const demoAddons: string[] = stored ? JSON.parse(stored) : [];
      isDemo = demoAddons.includes(addonKey);
    } catch {
      isDemo = false;
    }

    return {
      accessible: isPaid || isDemo,
      isDemo,
      isPaid
    };
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
          {/* Dashboard */}
          <button
            onClick={() => handleMenuClick('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-3 transition-colors ${
              activeMenu === 'dashboard'
                ? 'bg-emerald-500 text-white'
                : 'text-gray-400 hover:bg-zinc-900 hover:text-white'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm">Dashboard</span>
          </button>

          {/* Divider */}
          <div className="border-t border-zinc-800 my-4" />

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
                {managementTools.filter(item => isPageAccessible(item.id)).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      activeMenu === item.id
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

          {/* PRACTICE ENHANCER TOOLS */}
          <div className="mb-3">
            <button
              onClick={() => setIsPracticeEnhancerOpen(!isPracticeEnhancerOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span className="text-xs uppercase tracking-wider flex-1 text-left">
                Practice Enhancer Tools
              </span>
              {isPracticeEnhancerOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            {isPracticeEnhancerOpen && (
              <div className="mt-1 space-y-0.5">
                {practiceEnhancerTools.filter(item => isPageAccessible(item.id)).map((item) => {
                  // Check if Today's Schedule should be blocked due to planned off
                  const isBlockedItem = item.id === 'todays-schedule' && isTodayBlocked;

                  return (
                    <button
                      key={item.id}
                      onClick={() => !isBlockedItem && handleMenuClick(item.id)}
                      disabled={isBlockedItem}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isBlockedItem
                          ? 'text-gray-600 cursor-not-allowed opacity-50'
                          : activeMenu === item.id
                          ? 'bg-emerald-500 text-white'
                          : 'text-gray-400 hover:bg-zinc-900 hover:text-white'
                      }`}
                      title={isBlockedItem ? 'Access blocked during planned off period' : undefined}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="text-sm">{item.label}</span>
                      {isBlockedItem && <Lock className="w-3 h-3 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* GENERAL TOOLS */}
          <div className="mb-3">
            <button
              onClick={() => setIsGeneralToolsOpen(!isGeneralToolsOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span className="text-xs uppercase tracking-wider flex-1 text-left">
                General Tools
              </span>
              {isGeneralToolsOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            {isGeneralToolsOpen && (
              <div className="mt-1 space-y-0.5">
                {generalTools.filter(item => isPageAccessible(item.id)).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      activeMenu === item.id
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

          {/* PREMIUM ADD-ON SERVICE */}
          <div className="border-t border-zinc-800 my-4" />
          <div className="mb-3">
            <button
              onClick={() => setIsPremiumOpen(!isPremiumOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span className="text-xs uppercase tracking-wider flex-1 text-left">
                Premium Add-On Service
              </span>
              {isPremiumOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            {isPremiumOpen && (
              <div className="mt-2 space-y-1">
                {/* ====================================================================== */}
                {/* 🎯 PREMIUM ADD-ON ITEMS - SIMPLE RULE                                 */}
                {/* ====================================================================== */}
                {/* 1. Dr PAID → GREEN ✓ + CLICKABLE (always until subscription ends)     */}
                {/* 2. Dr NOT PAID → GRAY 🔒 + NOT CLICKABLE (locked)                     */}
                {/* 3. DEMO → Temporary access via button, doesn't change sidebar         */}
                {/* ====================================================================== */}
                {premiumAddOnPages.filter(item => isPageAccessible(item.id)).map((item) => {
                  const isCurrentPage = activeMenu === item.id;
                  const { accessible, isDemo, isPaid } = isPremiumFeatureAccessible(item.addonKey);

                  // Check if item is disabled (coming soon features)
                  const isDisabled = (item as any).disabled === true;

                  // If DISABLED → render as GRAY and NOT CLICKABLE
                  if (isDisabled) {
                    return (
                      <div
                        key={item.id}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 opacity-40 pointer-events-none"
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="text-xs flex-1 text-left">{item.label}</span>
                        <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-semibold">
                          PAID
                        </span>
                      </div>
                    );
                  }

                  // If PAID → render as GREEN and CLICKABLE
                  if (isPaid) {
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleMenuClick(item.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                          isCurrentPage
                            ? 'bg-emerald-500 text-white'
                            : 'text-emerald-400 hover:bg-zinc-900 hover:text-emerald-300'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="text-xs flex-1 text-left">{item.label}</span>
                        <Check className={`w-3 h-3 ${isCurrentPage ? 'text-white' : 'text-emerald-500'}`} />
                      </button>
                    );
                  }

                  // If NOT PAID → render as GRAY and NOT CLICKABLE
                  return (
                    <div
                      key={item.id}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 opacity-60 pointer-events-none"
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="text-xs flex-1 text-left">{item.label}</span>
                      <Lock className="w-3 h-3 text-gray-600" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Logout */}
        {!isAssistant && (
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
        )}
      </aside>
    </>
  );
}
