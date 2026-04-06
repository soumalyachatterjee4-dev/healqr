import { ClipboardList, Calendar, Users, TrendingUp, Activity, CheckCircle, XCircle, Clock, Download, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { db } from '../lib/firebase/config';
import { collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';

interface DailyStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  activeDoctors: number;
  newDoctors: number;
  newPatients: number;
}

interface DoctorBookingCount {
  name: string;
  bookings: number;
}

export default function AdminDailyWorkReport() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DailyStats>({
    totalBookings: 0, completedBookings: 0, cancelledBookings: 0,
    pendingBookings: 0, activeDoctors: 0, newDoctors: 0, newPatients: 0,
  });
  const [topDoctors, setTopDoctors] = useState<DoctorBookingCount[]>([]);

  const loadDayData = async (date: string) => {
    setLoading(true);
    try {
      const dayStart = new Date(date + 'T00:00:00');
      const dayEnd = new Date(date + 'T23:59:59');
      const tsStart = Timestamp.fromDate(dayStart);
      const tsEnd = Timestamp.fromDate(dayEnd);

      // Bookings for selected day
      const bookingsSnap = await getDocs(
        query(collection(db, 'bookings'),
          where('createdAt', '>=', tsStart),
          where('createdAt', '<=', tsEnd))
      );

      let completed = 0, cancelled = 0, pending = 0;
      const doctorMap: Record<string, { name: string; count: number }> = {};

      bookingsSnap.docs.forEach(d => {
        const data = d.data();
        const status = (data.status || '').toLowerCase();
        if (status === 'completed' || status === 'confirmed') completed++;
        else if (status === 'cancelled') cancelled++;
        else pending++;

        const docId = data.doctorId || 'unknown';
        const docName = data.doctorName || 'Unknown Doctor';
        if (!doctorMap[docId]) doctorMap[docId] = { name: docName, count: 0 };
        doctorMap[docId].count++;
      });

      // New doctors registered on this date
      let newDocs = 0;
      try {
        const docSnap = await getDocs(
          query(collection(db, 'doctors'),
            where('createdAt', '>=', tsStart),
            where('createdAt', '<=', tsEnd))
        );
        newDocs = docSnap.size;
      } catch { /* index may not exist */ }

      // New patients registered on this date
      let newPats = 0;
      try {
        const patSnap = await getDocs(
          query(collection(db, 'patients'),
            where('createdAt', '>=', tsStart),
            where('createdAt', '<=', tsEnd))
        );
        newPats = patSnap.size;
      } catch { /* index may not exist */ }

      // Total active doctors (all time)
      let totalActiveDoctors = 0;
      try {
        const allDocsSnap = await getDocs(collection(db, 'doctors'));
        totalActiveDoctors = allDocsSnap.size;
      } catch { /* */ }

      setStats({
        totalBookings: bookingsSnap.size,
        completedBookings: completed,
        cancelledBookings: cancelled,
        pendingBookings: pending,
        activeDoctors: totalActiveDoctors,
        newDoctors: newDocs,
        newPatients: newPats,
      });

      // Sort doctors by booking count
      const sorted = Object.values(doctorMap).sort((a, b) => b.count - a.count).slice(0, 10);
      setTopDoctors(sorted);
    } catch (err) {
      console.error('Failed to load daily report:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadDayData(selectedDate); }, [selectedDate]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl mb-2">Daily Work Report</h1>
            <p className="text-gray-400">Real-time platform activities for selected date</p>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm"
            />
            <Button onClick={() => loadDayData(selectedDate)} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-900/10 border border-emerald-700/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-emerald-500/10 p-3 rounded-lg">
                    <Calendar className="w-6 h-6 text-emerald-500" />
                  </div>
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <h3 className="text-2xl mb-1">{stats.totalBookings}</h3>
                <p className="text-sm text-gray-400">Total Bookings</p>
                <p className="text-xs text-emerald-500 mt-2">{stats.completedBookings} completed</p>
              </div>

              <div className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 border border-blue-700/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-500/10 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-blue-500" />
                  </div>
                  <Activity className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-2xl mb-1">{stats.activeDoctors}</h3>
                <p className="text-sm text-gray-400">Total Doctors</p>
                <p className="text-xs text-blue-500 mt-2">+{stats.newDoctors} registered this day</p>
              </div>

              <div className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 border border-purple-700/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-purple-500/10 p-3 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
                <h3 className="text-2xl mb-1">{stats.newPatients}</h3>
                <p className="text-sm text-gray-400">New Patients</p>
                <p className="text-xs text-purple-500 mt-2">Registered this day</p>
              </div>

              <div className="bg-gradient-to-br from-orange-900/30 to-orange-900/10 border border-orange-700/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-orange-500/10 p-3 rounded-lg">
                    <ClipboardList className="w-6 h-6 text-orange-500" />
                  </div>
                </div>
                <h3 className="text-2xl mb-1">{stats.cancelledBookings}</h3>
                <p className="text-sm text-gray-400">Cancelled</p>
                <p className="text-xs text-orange-500 mt-2">{stats.pendingBookings} pending</p>
              </div>
            </div>

            {/* Booking Status + Top Doctors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <ClipboardList className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-lg">Booking Status</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-emerald-900/20 border border-emerald-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm text-white">Completed / Confirmed</span>
                    </div>
                    <span className="text-xl text-emerald-500">{stats.completedBookings}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-red-900/20 border border-red-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="text-sm text-white">Cancelled</span>
                    </div>
                    <span className="text-xl text-red-500">{stats.cancelledBookings}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm text-white">Pending</span>
                    </div>
                    <span className="text-xl text-yellow-500">{stats.pendingBookings}</span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Users className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-lg">Top Doctors by Bookings</h3>
                </div>
                {topDoctors.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No bookings found for this date</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topDoctors.map((doctor, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-400 font-mono text-xs w-6">#{idx + 1}</span>
                          <span className="text-sm text-white">{doctor.name}</span>
                        </div>
                        <span className="text-sm text-emerald-500 font-medium">{doctor.bookings} bookings</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

