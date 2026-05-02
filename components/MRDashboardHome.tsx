import { useState, useEffect } from 'react';
import {
  Users,
  ClipboardList,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  Briefcase,
  Lock,
  BrainCircuit,
  CalendarDays,
  MapPin,
  Stethoscope,
  ChevronRight
} from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import HealthTipBanner from './HealthTipBanner';

interface MRDashboardHomeProps {
  mrId: string;
  mrData: { name: string; email: string; phone: string; company: string; division: string } | null;
  mrLinks: any[];
  onMenuChange: (menu: string) => void;
}

export default function MRDashboardHome({ mrId, mrData, mrLinks, onMenuChange }: MRDashboardHomeProps) {
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    if (!mrId || !db) return;
    const q = query(
      collection(db, 'mrBookings'),
      where('mrId', '==', mrId),
      where('status', 'in', ['confirmed', 'pending_special', 'met', 'cancelled'])
    );
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error('mrBookings listener:', err));
    return () => unsub();
  }, [mrId]);

  // Stats
  const approvedCount = mrLinks.filter(l => l.status === 'approved').length;
  const pendingCount = mrLinks.filter(l => l.status === 'pending').length;
  const totalDoctors = mrLinks.length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthPrefix = todayStr.slice(0, 7);
  const todayVisits = bookings.filter(b => b.date === todayStr || b.appointmentDate === todayStr);
  const monthVisits = bookings.filter(b =>
    (b.date || b.appointmentDate || '').startsWith(monthPrefix)
  );
  const metCount = bookings.filter(b => b.status === 'met').length;
  const upcomingCount = bookings.filter(b =>
    b.status === 'confirmed' && (b.date || b.appointmentDate || '') >= todayStr
  ).length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;

  const overviewData = [
    { name: 'Total Doctors', value: totalDoctors, fill: '#3b82f6' },
    { name: 'Approved', value: approvedCount, fill: '#10b981' },
    { name: 'Pending Requests', value: pendingCount, fill: '#f59e0b' },
    { name: 'Visits This Month', value: monthVisits.length, fill: '#8b5cf6' },
    { name: 'Cancelled', value: cancelledCount, fill: '#ef4444' },
  ];

  const upcoming = bookings
    .filter(b => b.status === 'confirmed' && (b.date || b.appointmentDate || '') >= todayStr)
    .sort((a, b) => (a.date || a.appointmentDate || '').localeCompare(b.date || b.appointmentDate || ''))
    .slice(0, 5);

  const maxValue = Math.max(...overviewData.map(d => d.value), 1);

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">

      {/* Tricolor Welcome Header */}
      <div className="space-y-3">
        {/* Saffron */}
        <div className="w-full flex items-center justify-center rounded-xl bg-orange-500 text-white font-bold py-3 text-base shadow shadow-orange-200">
          <h1 className="text-lg md:text-xl">
            Welcome, {mrData?.name || 'Medical Representative'}!
          </h1>
        </div>

        {/* White - Company / Division */}
        <div className="w-full flex items-center justify-center rounded-xl bg-white text-blue-600 font-bold py-3 text-base border border-blue-200 shadow">
          <Briefcase className="w-5 h-5 mr-2" />
          {mrData?.company || ''} {mrData?.division ? `· ${mrData.division}` : ''}
        </div>

        {/* Green - Encrypted Badge */}
        <div className="w-full flex items-center justify-center rounded-xl bg-green-600 text-white font-bold py-3 text-base shadow shadow-green-200">
          <Lock className="w-5 h-5 mr-2" />
          Data is encrypted
        </div>
      </div>

      {/* Health Tip Card (admin-controlled) */}
      <HealthTipBanner />

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <button
          onClick={() => onMenuChange('my-doctors')}
          className="bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 rounded-xl p-4 text-left transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-blue-400" />
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </div>
          <div className="text-2xl font-bold text-white">{approvedCount}</div>
          <div className="text-xs text-gray-400 mt-1">My Doctors</div>
        </button>

        <button
          onClick={() => onMenuChange('my-requests')}
          className="bg-zinc-900 border border-zinc-800 hover:border-yellow-500/50 rounded-xl p-4 text-left transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <ClipboardList className="w-5 h-5 text-yellow-400" />
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </div>
          <div className="text-2xl font-bold text-white">{pendingCount}</div>
          <div className="text-xs text-gray-400 mt-1">Pending Requests</div>
        </button>

        <button
          onClick={() => onMenuChange('todays-schedule')}
          className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl p-4 text-left transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </div>
          <div className="text-2xl font-bold text-white">{todayVisits.length}</div>
          <div className="text-xs text-gray-400 mt-1">Today's Visits</div>
        </button>

        <button
          onClick={() => onMenuChange('reports')}
          className="bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 rounded-xl p-4 text-left transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </div>
          <div className="text-2xl font-bold text-white">{monthVisits.length}</div>
          <div className="text-xs text-gray-400 mt-1">Visits This Month</div>
        </button>
      </div>

      {/* Activity Overview Bar Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-emerald-500" />
            <h2 className="text-white text-lg font-semibold">Activity Overview</h2>
          </div>
          <p className="text-sm text-gray-400 mt-1">Your doctor outreach and visit metrics this month.</p>
        </div>
        <div className="p-5">
          <div className="bg-zinc-950 rounded-xl p-5">
            <div className="space-y-5">
              {overviewData.map((item, index) => {
                const percentage = (item.value / maxValue) * 100;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-semibold text-sm">{item.name}</span>
                      <span className="text-white font-bold text-lg">{item.value}</span>
                    </div>
                    <div className="relative h-7 bg-zinc-900 rounded-lg overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full rounded-lg transition-all duration-1000 ease-out"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.fill,
                          boxShadow: `0 0 20px ${item.fill}80`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-4 mt-7 pt-5 border-t border-zinc-800">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{totalDoctors}</div>
                <div className="text-xs text-gray-400 mt-1">Total Linked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{monthVisits.length}</div>
                <div className="text-xs text-gray-400 mt-1">Month Visits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{upcomingCount}</div>
                <div className="text-xs text-gray-400 mt-1">Upcoming</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's & Upcoming Schedule */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            <h2 className="text-white text-lg font-semibold">Upcoming Schedule</h2>
          </div>
          <button
            onClick={() => onMenuChange('todays-schedule')}
            className="text-emerald-500 hover:text-emerald-400 text-sm"
          >
            View All
          </button>
        </div>
        <div className="p-5">
          {upcoming.length === 0 ? (
            <div className="py-10 text-center">
              <CalendarDays className="w-14 h-14 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400">No upcoming visits scheduled</p>
              <button
                onClick={() => onMenuChange('my-doctors')}
                className="mt-3 text-emerald-500 hover:text-emerald-400 text-sm"
              >
                Book a professional visit →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((b) => (
                <div
                  key={b.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-emerald-500/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-white text-sm font-medium">
                        Dr. {b.doctorName || 'Doctor'}
                      </h3>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      b.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' :
                      b.status === 'pending_special' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-zinc-700 text-gray-300'
                    }`}>
                      {b.status === 'pending_special' ? 'Special Pending' : b.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {b.date || b.appointmentDate || 'TBD'}
                    </span>
                    {b.chamberName && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {b.chamberName}
                      </span>
                    )}
                    {b.visitType && (
                      <span className="capitalize text-blue-400">{b.visitType.replace('_', ' ')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-4">
        <p className="text-sm text-gray-500">Powered by HealQR.com</p>
      </div>
    </div>
  );
}
