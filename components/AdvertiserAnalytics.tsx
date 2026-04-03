import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Calendar, Download, Filter, Loader2 } from 'lucide-react';
import { db, auth } from '../lib/firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

interface AdvertiserAnalyticsProps {
  advertiserId?: string;
}

export default function AdvertiserAnalytics({ advertiserId }: AdvertiserAnalyticsProps) {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalImpressions: 0,
    totalClicks: 0,
    totalSpend: 0,
    totalReach: 0,
    avgCTR: '0.0',
    costPerView: '0.00',
  });
  const [impressionData, setImpressionData] = useState<{name: string; views: number; clicks: number}[]>([]);
  const [specialtyData, setSpecialtyData] = useState<{name: string; value: number}[]>([]);

  useEffect(() => {
    if (!db) return;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const resolvedId = advertiserId || auth.currentUser?.uid || localStorage.getItem('healqr_advertiser_id');
        const constraints = resolvedId
          ? [where('advertiserId', '==', resolvedId)]
          : [];

        const q = query(
          collection(db, 'advertiser_campaigns'),
          ...constraints,
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const allCampaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCampaigns(allCampaigns);

        let totalImpressions = 0;
        let totalClicks = 0;
        let totalSpend = 0;
        let totalReach = 0;
        const specialtyCounts: Record<string, number> = {};

        allCampaigns.forEach((c: any) => {
          const impressions = c.stats?.impressions || 0;
          const clicks = c.stats?.clicks || 0;
          totalImpressions += impressions;
          totalClicks += clicks;
          totalSpend += c.totalAmount || 0;
          totalReach += c.viewBundle || 0;

          // Build specialty demographics from campaign targeting
          const specs: string[] = c.specialities || [];
          specs.forEach((s: string) => {
            specialtyCounts[s] = (specialtyCounts[s] || 0) + impressions;
          });
        });

        const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';
        const costPerView = totalImpressions > 0 ? (totalSpend / totalImpressions).toFixed(2) : '0.00';

        setMetrics({ totalImpressions, totalClicks, totalSpend, totalReach, avgCTR, costPerView });

        // Build specialty chart data
        const specData = Object.entries(specialtyCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, value]) => ({ name, value }));
        setSpecialtyData(specData.length > 0 ? specData : [{ name: 'No targeting data', value: 1 }]);

        // Build per-campaign impression chart data
        const chartData = allCampaigns.slice(0, 10).map((c: any, i: number) => ({
          name: `#${(c.id as string).slice(-4).toUpperCase()}`,
          views: c.stats?.impressions || 0,
          clicks: c.stats?.clicks || 0,
        }));
        setImpressionData(chartData.length > 0 ? chartData : [{ name: 'No data', views: 0, clicks: 0 }]);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [advertiserId, timeRange]);

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {['24h', '7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                timeRange === range 
                  ? 'bg-emerald-600 text-white' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
        
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors text-sm">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors text-sm">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Impressions Chart */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-6">Impression Trends</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={impressionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Clicks vs Views */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-6">Engagement Metrics</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={impressionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#27272a' }}
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="views" fill="#3f3f46" radius={[4, 4, 0, 0]} />
                <Bar dataKey="clicks" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Demographics */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-6">Doctor Demographics</h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <div className="h-[250px] w-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={specialtyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {specialtyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {specialtyData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm text-zinc-300">{entry.name}</span>
                  <span className="text-sm font-medium text-white ml-auto">{formatNumber(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-center">
            <div className="text-zinc-400 text-sm mb-1">Avg. CTR</div>
            <div className="text-3xl font-bold text-white">{metrics.avgCTR}%</div>
            <div className="text-zinc-500 text-xs mt-2">{formatNumber(metrics.totalClicks)} clicks / {formatNumber(metrics.totalImpressions)} views</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-center">
            <div className="text-zinc-400 text-sm mb-1">Total Reach</div>
            <div className="text-3xl font-bold text-white">{formatNumber(metrics.totalReach)}</div>
            <div className="text-zinc-500 text-xs mt-2">Purchased view bundle</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-center">
            <div className="text-zinc-400 text-sm mb-1">Cost per View</div>
            <div className="text-3xl font-bold text-white">₹{metrics.costPerView}</div>
            <div className="text-zinc-500 text-xs mt-2">Total spend: ₹{formatNumber(metrics.totalSpend)}</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-center">
            <div className="text-zinc-400 text-sm mb-1">Active Campaigns</div>
            <div className="text-3xl font-bold text-white">{campaigns.length}</div>
            <div className="text-zinc-500 text-xs mt-2">{campaigns.filter((c: any) => c.status === 'active').length} currently running</div>
          </div>
        </div>

      </div>
    </div>
  );
}

