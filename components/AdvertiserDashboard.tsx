import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Megaphone, 
  BarChart3, 
  Wallet, 
  LogOut, 
  Bell,
  Menu,
  Eye,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { AuthService } from '../lib/firebase/auth.service';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase/config';
import healQRAdsLogo from '../assets/healQRADS_LOGO.svg';
import AdvertiserCampaigns from './AdvertiserCampaigns';
import AdvertiserAnalytics from './AdvertiserAnalytics';
import AdvertiserWallet from './AdvertiserWallet';

interface AdvertiserDashboardProps {
  onLogout: () => void;
}

export default function AdvertiserDashboard({ onLogout }: AdvertiserDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      const user = auth.currentUser;
      if (!user) {
        // Demo Mode Mock Data
        setActiveCampaigns([
          { id: '1', name: 'Summer Health Awareness', views: 1921, totalViews: 2500, status: 'active' },
          { id: '2', name: 'Dental Checkup Promo', views: 598, totalViews: 10000, status: 'active' }
        ]);
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'advertiser_campaigns'),
          where('advertiserId', '==', user.uid),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const campaigns = snapshot.docs.map(doc => ({
          id: doc.id,
          name: `Campaign #${doc.id.slice(-4).toUpperCase()}`,
          views: doc.data().stats?.impressions || 0,
          totalViews: doc.data().viewBundle || 1000,
          status: doc.data().status
        }));
        setActiveCampaigns(campaigns);
      } catch (error) {
        console.error("Error fetching campaigns:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  const handleLogout = async () => {
    await AuthService.signOutUser();
    onLogout();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="p-6 md:p-8 space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl">
                    <Megaphone className="w-6 h-6 text-emerald-500" />
                  </div>
                  <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">+12%</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{activeCampaigns.length}</div>
                <div className="text-sm text-zinc-400">Active Campaigns</div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl">
                    <Eye className="w-6 h-6 text-blue-500" />
                  </div>
                  <span className="text-xs font-medium text-blue-500 bg-blue-500/10 px-2 py-1 rounded-full">+5%</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {activeCampaigns.reduce((acc, curr) => acc + curr.views, 0).toLocaleString()}
                </div>
                <div className="text-sm text-zinc-400">Total Impressions</div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl">
                    <Wallet className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-1">₹0.00</div>
                <div className="text-sm text-zinc-400">Wallet Balance</div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Active Campaigns List */}
              <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white">Active Campaigns</h2>
                  <button onClick={() => setActiveTab('campaign')} className="text-sm text-emerald-500 hover:text-emerald-400 font-medium">View All</button>
                </div>
                
                <div className="space-y-6">
                  {activeCampaigns.map((campaign) => (
                    <div key={campaign.id} className="group">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <h3 className="font-medium text-white group-hover:text-emerald-400 transition-colors">{campaign.name}</h3>
                          <p className="text-xs text-zinc-500 mt-1">
                            {((campaign.views / campaign.totalViews) * 100).toFixed(1)}% Completed
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-white">{campaign.views.toLocaleString()}</span>
                          <span className="text-xs text-zinc-500"> / {campaign.totalViews.toLocaleString()} views</span>
                        </div>
                      </div>
                      
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${(campaign.views / campaign.totalViews) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  {activeCampaigns.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Megaphone className="w-6 h-6 text-zinc-600" />
                      </div>
                      <p className="text-zinc-500">No active campaigns running</p>
                      <button 
                        onClick={() => setActiveTab('campaign')}
                        className="mt-4 text-sm text-emerald-500 hover:text-emerald-400 font-medium"
                      >
                        Create your first campaign
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Promo Box */}
              <div className="w-full lg:w-80 shrink-0">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 h-full min-h-[250px] flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                  
                  <div>
                    <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white mb-4 backdrop-blur-sm">
                      Premium
                    </span>
                    <h3 className="text-2xl font-bold text-white mb-2 leading-tight">
                      Boost your reach with Premium Slots
                    </h3>
                    <p className="text-indigo-100 text-sm">
                      Get 3x more visibility by featuring your ads in our premium network.
                    </p>
                  </div>

                  <button className="w-full bg-white text-indigo-600 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 mt-6">
                    Contact Sales <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="text-center text-zinc-800 text-xs py-4">v1.2</div>
          </div>
        );
      case 'campaign':
        return <AdvertiserCampaigns />;
      case 'analytics':
        return <AdvertiserAnalytics />;
      case 'wallet':
        return <AdvertiserWallet />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <img src={healQRAdsLogo} alt="HealQR Ads" className="h-14 w-auto" />
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-zinc-400 hover:text-white">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 bg-zinc-950 border-r border-zinc-900 transform transition-all duration-300 ease-in-out flex flex-col h-screen
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
        <div className={`p-6 flex items-center border-b border-zinc-900 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && <img src={healQRAdsLogo} alt="HealQR Ads" className="h-14 w-auto" />}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'campaign', label: 'Campaigns', icon: Megaphone },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'wallet', label: 'Wallet', icon: Wallet },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                activeTab === item.id 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-gray-400 hover:bg-zinc-900 hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="text-sm">{item.label}</span>}
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-900">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-950/30 rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`
        flex-1 flex flex-col min-w-0 bg-black relative min-h-screen transition-all duration-300 ease-in-out
        ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
      `}>
        {/* Header */}
        <header className="h-20 border-b border-zinc-800 flex items-center justify-between px-6 md:px-8 bg-black/50 backdrop-blur-sm sticky top-0 z-40">
          <h1 className="text-xl font-semibold capitalize text-white">
            {activeTab}
          </h1>
          <div className="flex items-center gap-4">
            <button className="p-2 text-zinc-400 hover:text-white transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-black"></span>
            </button>
            <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-sm font-bold text-white ring-2 ring-black">
              A
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {renderContent()}
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
