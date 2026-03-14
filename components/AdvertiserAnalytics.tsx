import { useState } from 'react';
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
import { Calendar, Download, Filter } from 'lucide-react';

// Mock Data
const IMPRESSION_DATA = [
  { name: 'Mon', views: 4000, clicks: 240 },
  { name: 'Tue', views: 3000, clicks: 139 },
  { name: 'Wed', views: 2000, clicks: 980 },
  { name: 'Thu', views: 2780, clicks: 390 },
  { name: 'Fri', views: 1890, clicks: 480 },
  { name: 'Sat', views: 2390, clicks: 380 },
  { name: 'Sun', views: 3490, clicks: 430 },
];

const DEMOGRAPHICS_DATA = [
  { name: 'General Physicians', value: 400 },
  { name: 'Cardiologists', value: 300 },
  { name: 'Pediatricians', value: 300 },
  { name: 'Dentists', value: 200 },
];

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

export default function AdvertiserAnalytics() {
  const [timeRange, setTimeRange] = useState('7d');

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
              <LineChart data={IMPRESSION_DATA}>
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
              <BarChart data={IMPRESSION_DATA}>
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
                    data={DEMOGRAPHICS_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {DEMOGRAPHICS_DATA.map((entry, index) => (
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
              {DEMOGRAPHICS_DATA.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm text-zinc-300">{entry.name}</span>
                  <span className="text-sm font-medium text-white ml-auto">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-center">
            <div className="text-zinc-400 text-sm mb-1">Avg. CTR</div>
            <div className="text-3xl font-bold text-white">2.4%</div>
            <div className="text-emerald-500 text-xs mt-2 flex items-center gap-1">
              <span className="bg-emerald-500/10 px-1.5 py-0.5 rounded">+0.4%</span> vs last week
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-center">
            <div className="text-zinc-400 text-sm mb-1">Total Reach</div>
            <div className="text-3xl font-bold text-white">12.5k</div>
            <div className="text-emerald-500 text-xs mt-2 flex items-center gap-1">
              <span className="bg-emerald-500/10 px-1.5 py-0.5 rounded">+12%</span> vs last week
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-center">
            <div className="text-zinc-400 text-sm mb-1">Cost per View</div>
            <div className="text-3xl font-bold text-white">₹0.45</div>
            <div className="text-zinc-500 text-xs mt-2">Stable</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-center">
            <div className="text-zinc-400 text-sm mb-1">Engagement Score</div>
            <div className="text-3xl font-bold text-white">8.9</div>
            <div className="text-emerald-500 text-xs mt-2 flex items-center gap-1">
              <span className="bg-emerald-500/10 px-1.5 py-0.5 rounded">High</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

