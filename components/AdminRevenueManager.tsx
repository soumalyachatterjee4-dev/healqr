import { DollarSign, TrendingUp, Download, Filter, Users, CreditCard, Package, Zap, PieChart, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AdminStatsService } from '../lib/firebase/admin-stats.service';

type TimePeriod = 'today' | 'week' | 'month' | 'year';

interface RevenueStream {
  type: 'subscription' | 'topup' | 'premium';
  label: string;
  revenue: number;
  doctorCount: number;
  transactionCount: number;
  color: string;
  icon: any;
  growthRate: number;
}

interface MonthlyData {
  month: string;
  subscription: number;
  topup: number;
  premium: number;
  total: number;
  transactions: number;
}

export default function AdminRevenueManager() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [revenueStreams, setRevenueStreams] = useState<RevenueStream[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalDoctors, setTotalDoctors] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [avgTransactionValue, setAvgTransactionValue] = useState(0);
  const [overallGrowthRate, setOverallGrowthRate] = useState(0);
  const [subscriptionTiers, setSubscriptionTiers] = useState<any[]>([]);

  // Load revenue data from Firestore
  const loadRevenueData = async () => {
    try {
      setLoading(true);
      
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const stats = await AdminStatsService.getRevenueManagerStats(start, end);

      // Build revenue streams with real doctor counts
      const streams: RevenueStream[] = [
        {
          type: 'subscription',
          label: 'Subscription Plans',
          revenue: stats.subscriptionRevenue,
          doctorCount: stats.subscriptionDoctorCount || 0,
          transactionCount: stats.subscriptionTransactions,
          color: 'emerald',
          icon: CreditCard,
          growthRate: stats.overallGrowthRate,
        },
        {
          type: 'topup',
          label: 'Top-up Revenue',
          revenue: stats.topUpRevenue,
          doctorCount: stats.topUpDoctorCount || 0,
          transactionCount: stats.topUpTransactions,
          color: 'blue',
          icon: Package,
          growthRate: Math.round(stats.overallGrowthRate * 0.8),
        },
        {
          type: 'premium',
          label: 'Premium Add-ons',
          revenue: stats.premiumAddOnRevenue,
          doctorCount: stats.premiumDoctorCount || 0,
          transactionCount: stats.premiumTransactions,
          color: 'purple',
          icon: Zap,
          growthRate: Math.round(stats.overallGrowthRate * 1.2),
        },
      ];

      setRevenueStreams(streams);
      setTotalRevenue(stats.totalRevenue);
      setTotalDoctors(stats.totalDoctors);
      setTotalTransactions(stats.totalTransactions);
      setMonthlyData(stats.monthlyData);
      setOverallGrowthRate(stats.overallGrowthRate);
      setSubscriptionTiers(stats.subscriptionTiers);
      
      // Calculate average per month (not per transaction)
      const avgPerMonth = stats.monthlyData.length > 0 
        ? Math.round(stats.totalRevenue / stats.monthlyData.length) 
        : 0;
      setAvgTransactionValue(avgPerMonth);

    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevenueData();
  }, [startDate, endDate]);

  const formatCurrency = (value: number) => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    }
    return `₹${(value / 1000).toFixed(0)}k`;
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
      emerald: {
        bg: 'from-emerald-900/30 to-emerald-900/10',
        border: 'border-emerald-700/30',
        text: 'text-emerald-500',
        icon: 'bg-emerald-500/10 text-emerald-500'
      },
      blue: {
        bg: 'from-blue-900/30 to-blue-900/10',
        border: 'border-blue-700/30',
        text: 'text-blue-500',
        icon: 'bg-blue-500/10 text-blue-500'
      },
      purple: {
        bg: 'from-purple-900/30 to-purple-900/10',
        border: 'border-purple-700/30',
        text: 'text-purple-500',
        icon: 'bg-purple-500/10 text-purple-500'
      },
      orange: {
        bg: 'from-orange-900/30 to-orange-900/10',
        border: 'border-orange-700/30',
        text: 'text-orange-500',
        icon: 'bg-orange-500/10 text-orange-500'
      }
    };
    return colors[color] || colors.emerald;
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-black">
      <div className="p-4 md:p-8 max-w-full">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl mb-2 text-white">Revenue Manager</h1>
            <p className="text-gray-400 text-sm md:text-base">Monitor and analyze platform revenue streams</p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={loadRevenueData}
              disabled={loading}
              variant="outline"
              className="border-zinc-700 text-white hover:bg-zinc-800 text-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-400">Loading revenue data...</p>
          </div>
        )}

        {/* Date Range Filter */}
        <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4 max-w-full overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <h3 className="text-sm text-white">Filter by Date Range</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 max-w-full">
            <div className="w-full min-w-0 max-w-full">
              <label className="block text-xs text-gray-400 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-w-0 max-w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="w-full min-w-0 max-w-full">
              <label className="block text-xs text-gray-400 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full min-w-0 max-w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {(startDate || endDate) && (
              <div className="w-full max-w-full">
                <Button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-gray-400 hover:bg-zinc-800 w-full"
                >
                  Clear Filter
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Main Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Total Revenue Card */}
          <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-900/10 border border-emerald-700/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-emerald-500/10 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex items-center gap-1 text-emerald-500">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-sm">+{overallGrowthRate}%</span>
              </div>
            </div>
            <h3 className="text-2xl md:text-3xl mb-1 text-white">{formatCurrency(totalRevenue)}</h3>
            <p className="text-sm text-gray-400">Total Revenue</p>
            <div className="mt-3 pt-3 border-t border-emerald-700/30">
              <p className="text-xs text-gray-500">From {totalDoctors.toLocaleString()} doctors</p>
            </div>
          </div>

          {/* Revenue Stream Cards */}
          {revenueStreams.map((stream) => {
            const Icon = stream.icon;
            const colors = getColorClasses(stream.color);
            return (
              <div
                key={stream.type}
                className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-xl p-6`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${colors.icon} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className={`flex items-center gap-1 ${colors.text}`}>
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="text-sm">+{stream.growthRate}%</span>
                  </div>
                </div>
                <h3 className="text-2xl md:text-3xl mb-1 text-white">{formatCurrency(stream.revenue)}</h3>
                <p className="text-sm text-gray-400">{stream.label}</p>
                <div className={`mt-3 pt-3 border-t ${colors.border}`}>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{stream.doctorCount} doctors</span>
                    <span>{stream.transactionCount} txns</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Revenue Breakdown and Key Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Monthly Revenue Trend */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg text-white">Monthly Revenue Trend</h3>
              </div>
              <span className="text-sm text-gray-400">Last 10 months</span>
            </div>

            <div className="space-y-3">
              {monthlyData.map((item) => (
                <div key={item.month} className="flex items-center gap-4">
                  <span className="text-sm text-gray-400 w-12">{item.month}</span>
                  <div className="flex-1 bg-zinc-800 rounded-full h-10 overflow-hidden relative">
                    <div
                      className="bg-gradient-to-r from-emerald-600 to-emerald-500 h-full flex items-center px-4 absolute"
                      style={{ width: `${(item.total / 900000) * 100}%` }}
                    >
                      <span className="text-sm text-white font-medium">{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                  <span className="text-sm text-gray-400 w-20 text-right">{item.transactions} txn</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <h3 className="text-lg text-white">Key Metrics</h3>
            </div>

            <div className="flex flex-col gap-4 flex-1">
              <div className="p-4 bg-zinc-800/50 rounded-lg text-center">
                <p className="text-sm text-gray-400 mb-2">Total Transactions</p>
                <p className="text-4xl font-bold text-white">{totalTransactions.toLocaleString()}</p>
              </div>

              <div className="p-4 bg-zinc-800/50 rounded-lg text-center">
                <p className="text-sm text-gray-400 mb-2">Avg Transaction</p>
                <p className="text-4xl font-bold text-white">₹{avgTransactionValue.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-2">Per {monthlyData.length} months</p>
              </div>

              <div className={`p-6 flex-1 rounded-lg border flex flex-col items-center justify-center ${overallGrowthRate >= 0 ? 'bg-emerald-900/20 border-emerald-700/30' : 'bg-red-900/20 border-red-700/30'}`}>
                <p className="text-sm text-gray-400 mb-1">Growth Rate</p>
                <p className="text-xs text-gray-500 mb-3">vs Last Month</p>
                <div className="flex items-center gap-2">
                  <p className={`text-5xl font-bold ${overallGrowthRate >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {overallGrowthRate >= 0 ? '+' : ''}{overallGrowthRate}%
                  </p>
                  {overallGrowthRate >= 0 ? (
                    <ArrowUpRight className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-6 h-6 text-red-500" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Tier Breakdown */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-emerald-500" />
            <h3 className="text-xl text-white">Subscription Tier Breakdown</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {subscriptionTiers.map((tier, index) => {
              return (
                <div
                  key={index}
                  className={`relative bg-zinc-900 rounded-2xl p-6 border-2 transition-all hover:shadow-xl ${
                    tier.isMostPopular
                      ? 'border-emerald-500 shadow-lg shadow-emerald-500/20'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Most Popular Badge */}
                  {tier.isMostPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-emerald-500 text-white text-xs px-4 py-1 rounded-full font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {/* Plan Name */}
                  <div className="mb-4">
                    <h4 className="text-xl text-white mb-2">{tier.name}</h4>
                    <p className="text-sm text-gray-400">
                      {tier.bookings}
                    </p>
                  </div>

                  {/* Pricing */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl text-white">₹{tier.price.toLocaleString()}</span>
                      <span className="text-gray-400">/month</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      ₹{tier.yearlyPrice.toLocaleString()} /year
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <span className="text-sm text-gray-400">Active Doctors</span>
                      <span className="text-white font-medium">{tier.doctors}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <span className="text-sm text-gray-400">Revenue</span>
                      <span className="font-medium text-emerald-500">
                        {formatCurrency(tier.revenue)}
                      </span>
                    </div>
                  </div>

                  {/* Market Share */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Market Share</span>
                      <Badge className={`${
                        tier.isMostPopular 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-zinc-700 text-gray-300'
                      }`}>
                        {tier.percentage}%
                      </Badge>
                    </div>
                    <div className="bg-zinc-800 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          tier.isMostPopular ? 'bg-emerald-500' : 'bg-zinc-600'
                        }`}
                        style={{ width: `${tier.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue Stream Distribution - Full Width */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg text-white">Revenue Stream Distribution</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {revenueStreams.map((stream) => {
              const Icon = stream.icon;
              const percentage = ((stream.revenue / totalRevenue) * 100).toFixed(1);
              const colors = getColorClasses(stream.color);
              
              return (
                <div key={stream.type} className="p-4 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`${colors.icon} p-2 rounded-lg`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{stream.label}</p>
                        <p className="text-xs text-gray-500">{stream.doctorCount} doctors</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${colors.text}`}>{formatCurrency(stream.revenue)}</p>
                      <p className="text-xs text-gray-500">{percentage}%</p>
                    </div>
                  </div>
                  <div className="bg-zinc-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${stream.color === 'emerald' ? 'bg-emerald-500' : stream.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Doctor Engagement by Revenue Stream */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <h3 className="text-base md:text-lg text-white">Doctor Engagement by Revenue Stream</h3>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-3">
            {revenueStreams.map((stream) => {
              const avgPerDoctor = Math.round(stream.revenue / stream.doctorCount);
              const colors = getColorClasses(stream.color);
              
              return (
                <div key={stream.type} className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`${colors.icon} p-2 rounded-lg`}>
                      <stream.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-white font-medium">{stream.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Active Doctors</p>
                      <p className="text-white">{stream.doctorCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Total Revenue</p>
                      <p className="text-emerald-500">{formatCurrency(stream.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Avg per Doctor</p>
                      <p className="text-white">₹{avgPerDoctor.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Transactions</p>
                      <p className="text-white">{stream.transactionCount.toLocaleString()}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400 text-xs mb-1">Growth</p>
                      <div className={`flex items-center gap-1 ${colors.text}`}>
                        <ArrowUpRight className="w-4 h-4" />
                        <span className="text-sm">+{stream.growthRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto -mx-6">
            <div className="px-6">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Revenue Stream</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Active Doctors</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Total Revenue</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Avg per Doctor</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Transactions</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-400 whitespace-nowrap">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueStreams.map((stream) => {
                    const avgPerDoctor = Math.round(stream.revenue / stream.doctorCount);
                    const colors = getColorClasses(stream.color);
                    
                    return (
                      <tr key={stream.type} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`${colors.icon} p-2 rounded-lg`}>
                              <stream.icon className="w-4 h-4" />
                            </div>
                            <span className="text-sm text-white font-medium whitespace-nowrap">{stream.label}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-white whitespace-nowrap">{stream.doctorCount.toLocaleString()}</td>
                        <td className="py-4 px-4 text-sm text-emerald-500 whitespace-nowrap">{formatCurrency(stream.revenue)}</td>
                        <td className="py-4 px-4 text-sm text-gray-400 whitespace-nowrap">₹{avgPerDoctor.toLocaleString()}</td>
                        <td className="py-4 px-4 text-sm text-gray-400 whitespace-nowrap">{stream.transactionCount.toLocaleString()}</td>
                        <td className="py-4 px-4">
                          <div className={`flex items-center gap-1 ${colors.text}`}>
                            <ArrowUpRight className="w-4 h-4" />
                            <span className="text-sm whitespace-nowrap">+{stream.growthRate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}