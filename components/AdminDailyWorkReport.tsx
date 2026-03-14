import { ClipboardList, Calendar, Users, DollarSign, TrendingUp, Activity, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';

export default function AdminDailyWorkReport() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Mock data - will be fetched from Firebase
  const dailyStats = {
    date: selectedDate,
    totalBookings: 89,
    completedBookings: 67,
    cancelledBookings: 12,
    pendingBookings: 10,
    newDoctorRegistrations: 5,
    activeDoctors: 132,
    totalRevenue: 125400,
    companyShare: 76494, // 61%
    doctorShare: 36366, // 29%
    newPatients: 45,
    returningPatients: 44,
  };

  const doctorActivity = [
    { id: 1, name: 'Dr. Rajesh Kumar', bookings: 12, revenue: 18000, status: 'Active', lastSeen: '10 mins ago' },
    { id: 2, name: 'Dr. Priya Sharma', bookings: 10, revenue: 15000, status: 'Active', lastSeen: '25 mins ago' },
    { id: 3, name: 'Dr. Amit Patel', bookings: 9, revenue: 13500, status: 'Active', lastSeen: '1 hour ago' },
    { id: 4, name: 'Dr. Sneha Reddy', bookings: 8, revenue: 12000, status: 'Active', lastSeen: '2 hours ago' },
    { id: 5, name: 'Dr. Vikram Singh', bookings: 7, revenue: 10500, status: 'Idle', lastSeen: '5 hours ago' },
  ];

  const systemEvents = [
    { id: 1, event: 'System backup completed', time: '06:00 AM', type: 'success' },
    { id: 2, event: '5 new doctors registered', time: '09:30 AM', type: 'info' },
    { id: 3, event: 'Peak booking hours started', time: '10:00 AM', type: 'info' },
    { id: 4, event: 'Payment gateway hiccup resolved', time: '11:45 AM', type: 'warning' },
    { id: 5, event: 'Database optimization completed', time: '02:30 PM', type: 'success' },
    { id: 6, event: 'Notification batch sent (500+ users)', time: '04:00 PM', type: 'info' },
  ];

  const hourlyBreakdown = [
    { hour: '6 AM', bookings: 2 },
    { hour: '7 AM', bookings: 4 },
    { hour: '8 AM', bookings: 8 },
    { hour: '9 AM', bookings: 12 },
    { hour: '10 AM', bookings: 15 },
    { hour: '11 AM', bookings: 10 },
    { hour: '12 PM', bookings: 8 },
    { hour: '1 PM', bookings: 6 },
    { hour: '2 PM', bookings: 9 },
    { hour: '3 PM', bookings: 7 },
    { hour: '4 PM', bookings: 5 },
    { hour: '5 PM', bookings: 3 },
  ];

  const maxBookings = Math.max(...hourlyBreakdown.map(h => h.bookings));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl mb-2">Daily Work Report</h1>
            <p className="text-gray-400">Track daily platform activities and performance</p>
          </div>

          <div className="flex gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm"
            />
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-900/10 border border-emerald-700/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-emerald-500/10 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-emerald-500" />
              </div>
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="text-2xl mb-1">{dailyStats.totalBookings}</h3>
            <p className="text-sm text-gray-400">Total Bookings</p>
            <p className="text-xs text-emerald-500 mt-2">{dailyStats.completedBookings} completed</p>
          </div>

          <div className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 border border-blue-700/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-500/10 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-2xl mb-1">{dailyStats.activeDoctors}</h3>
            <p className="text-sm text-gray-400">Active Doctors</p>
            <p className="text-xs text-blue-500 mt-2">+{dailyStats.newDoctorRegistrations} new today</p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 border border-purple-700/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-500/10 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-500" />
              </div>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <h3 className="text-2xl mb-1">₹{(dailyStats.totalRevenue / 1000).toFixed(0)}k</h3>
            <p className="text-sm text-gray-400">Revenue Today</p>
            <p className="text-xs text-purple-500 mt-2">₹{(dailyStats.companyShare / 1000).toFixed(0)}k company</p>
          </div>

          <div className="bg-gradient-to-br from-orange-900/30 to-orange-900/10 border border-orange-700/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-orange-500/10 p-3 rounded-lg">
                <Users className="w-6 h-6 text-orange-500" />
              </div>
              <TrendingUp className="w-5 h-5 text-orange-500" />
            </div>
            <h3 className="text-2xl mb-1">{dailyStats.newPatients}</h3>
            <p className="text-sm text-gray-400">New Patients</p>
            <p className="text-xs text-orange-500 mt-2">{dailyStats.returningPatients} returning</p>
          </div>
        </div>

        {/* Booking Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <ClipboardList className="w-5 h-5 text-emerald-500" />
              <h3 className="text-lg">Booking Status</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-emerald-900/20 border border-emerald-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm text-white">Completed</span>
                </div>
                <span className="text-xl text-emerald-500">{dailyStats.completedBookings}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-900/20 border border-red-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-white">Cancelled</span>
                </div>
                <span className="text-xl text-red-500">{dailyStats.cancelledBookings}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm text-white">Pending</span>
                </div>
                <span className="text-xl text-yellow-500">{dailyStats.pendingBookings}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-emerald-500" />
              <h3 className="text-lg">Hourly Booking Distribution</h3>
            </div>

            <div className="space-y-2">
              {hourlyBreakdown.map((item) => (
                <div key={item.hour} className="flex items-center gap-4">
                  <span className="text-sm text-gray-400 w-16">{item.hour}</span>
                  <div className="flex-1 bg-zinc-800 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-600 to-emerald-500 h-full flex items-center px-3"
                      style={{ width: `${(item.bookings / maxBookings) * 100}%` }}
                    >
                      {item.bookings > 0 && (
                        <span className="text-xs text-white">{item.bookings}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Doctor Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-emerald-500" />
              <h3 className="text-lg">Top Active Doctors</h3>
            </div>

            <div className="space-y-3">
              {doctorActivity.map((doctor) => (
                <div key={doctor.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-white mb-1">{doctor.name}</p>
                    <p className="text-xs text-gray-400">{doctor.lastSeen}</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-sm text-emerald-500">{doctor.bookings} bookings</p>
                    <p className="text-xs text-gray-400">₹{doctor.revenue}</p>
                  </div>
                  <div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        doctor.status === 'Active'
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : 'bg-gray-500/20 text-gray-500'
                      }`}
                    >
                      {doctor.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-emerald-500" />
              <h3 className="text-lg">System Events</h3>
            </div>

            <div className="space-y-3">
              {systemEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <div
                    className={`p-2 rounded-lg ${
                      event.type === 'success'
                        ? 'bg-emerald-500/10'
                        : event.type === 'warning'
                        ? 'bg-yellow-500/10'
                        : 'bg-blue-500/10'
                    }`}
                  >
                    {event.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    {event.type === 'warning' && <Clock className="w-4 h-4 text-yellow-500" />}
                    {event.type === 'info' && <Activity className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">{event.event}</p>
                    <p className="text-xs text-gray-500 mt-1">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

