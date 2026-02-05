import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Calendar, DollarSign, Package } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';

export default function AdminPlatformAnalytics() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  // Mock data for charts
  const monthlyRevenue = [
    { month: 'Jan', revenue: 125000, bookings: 450 },
    { month: 'Feb', revenue: 145000, bookings: 520 },
    { month: 'Mar', revenue: 165000, bookings: 590 },
    { month: 'Apr', revenue: 155000, bookings: 560 },
    { month: 'May', revenue: 185000, bookings: 670 },
    { month: 'Jun', revenue: 205000, bookings: 740 },
    { month: 'Jul', revenue: 225000, bookings: 810 },
    { month: 'Aug', revenue: 245000, bookings: 890 },
    { month: 'Sep', revenue: 265000, bookings: 960 },
    { month: 'Oct', revenue: 285000, bookings: 1030 },
  ];

  const subscriptionPlans = [
    { name: 'Basic', value: 45, color: '#6B7280' },
    { name: 'Standard', value: 60, color: '#10B981' },
    { name: 'Pro', value: 30, color: '#3B82F6' },
    { name: 'Enterprise', value: 12, color: '#A855F7' },
  ];

  const specialityDistribution = [
    { speciality: 'Cardiology', doctors: 25 },
    { speciality: 'Dermatology', doctors: 22 },
    { speciality: 'Pediatrics', doctors: 20 },
    { speciality: 'Orthopedics', doctors: 18 },
    { speciality: 'Neurology', doctors: 15 },
    { speciality: 'Others', doctors: 47 },
  ];

  const revenueBreakdown = {
    total: 2847650,
    companyShare: 1736959, // 61%
    doctorShare: 825819, // 29%
    gatewayFees: 284765, // 10%
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl mb-2">Platform Analytics</h1>
          <p className="text-gray-400">Comprehensive insights into platform performance</p>
          
          {/* Date Range Filter */}
          <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm text-white">Filter by Date Range</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {(startDate || endDate) && (
                <div className="pt-5">
                  <Button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 text-gray-400 hover:bg-zinc-800"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 border border-blue-700/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-500/10 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-green-500 text-sm">+8.2%</span>
            </div>
            <p className="text-sm text-gray-400 mb-1">Total Doctors</p>
            <p className="text-3xl text-blue-500">147</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-900/10 border border-emerald-700/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-emerald-500/10 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-emerald-500" />
              </div>
              <span className="text-green-500 text-sm">+12.5%</span>
            </div>
            <p className="text-sm text-gray-400 mb-1">Monthly Bookings</p>
            <p className="text-3xl text-emerald-500">1,030</p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 border border-purple-700/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-500/10 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-500" />
              </div>
              <span className="text-green-500 text-sm">+15.3%</span>
            </div>
            <p className="text-sm text-gray-400 mb-1">Monthly Revenue</p>
            <p className="text-3xl text-purple-500">₹2.85L</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-900/10 border border-yellow-700/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-yellow-500/10 p-3 rounded-lg">
                <Package className="w-6 h-6 text-yellow-500" />
              </div>
              <span className="text-green-500 text-sm">+5.7%</span>
            </div>
            <p className="text-sm text-gray-400 mb-1">Active Subscriptions</p>
            <p className="text-3xl text-yellow-500">125</p>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Trend */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Revenue & Bookings Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue (₹)" />
                <Line type="monotone" dataKey="bookings" stroke="#3b82f6" strokeWidth={2} name="Bookings" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Subscription Distribution */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-500" />
              Subscription Plan Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={subscriptionPlans}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {subscriptionPlans.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Speciality Distribution */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              Doctors by Speciality
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={specialityDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="speciality" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                />
                <Bar dataKey="doctors" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Breakdown */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Revenue Breakdown
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Company Share (61%)</span>
                  <span className="text-emerald-500">₹{revenueBreakdown.companyShare.toLocaleString()}</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-3">
                  <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '61%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Doctor Share (29%)</span>
                  <span className="text-blue-500">₹{revenueBreakdown.doctorShare.toLocaleString()}</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-3">
                  <div className="bg-blue-500 h-3 rounded-full" style={{ width: '29%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Gateway Fees (10%)</span>
                  <span className="text-purple-500">₹{revenueBreakdown.gatewayFees.toLocaleString()}</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-3">
                  <div className="bg-purple-500 h-3 rounded-full" style={{ width: '10%' }}></div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white font-medium">Total Revenue</span>
                  <span className="text-xl text-white">₹{revenueBreakdown.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg mb-6">Performance Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-800 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Average Bookings per Doctor</p>
              <p className="text-2xl text-white">26.3</p>
              <p className="text-xs text-emerald-500 mt-2">↑ 18% from last month</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Average Revenue per Booking</p>
              <p className="text-2xl text-white">₹276</p>
              <p className="text-xs text-emerald-500 mt-2">↑ 5% from last month</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Platform Growth Rate</p>
              <p className="text-2xl text-white">12.5%</p>
              <p className="text-xs text-emerald-500 mt-2">Monthly average</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
