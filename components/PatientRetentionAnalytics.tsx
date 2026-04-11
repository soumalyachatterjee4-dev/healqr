import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Menu, Users, TrendingUp, TrendingDown, UserCheck, UserX,
  Calendar, Activity, Target, Brain, RefreshCw, ChevronRight,
  Home, Sparkles, Loader2
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import DashboardSidebar from './DashboardSidebar';

interface PatientRetentionAnalyticsProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void | Promise<void>;
  activeAddOns?: string[];
}

interface BookingRecord {
  patientPhone: string;
  patientName: string;
  age: number;
  gender: string;
  purposeOfVisit: string;
  bookingDate: Date;
  followUpDate?: Date;
  status: string;
  isCancelled: boolean;
  consultationCompleted: boolean;
}

interface RetentionMetrics {
  totalUniquePatients: number;
  returningPatients: number;
  retentionRate: number;
  followUpScheduled: number;
  followUpComplied: number;
  followUpComplianceRate: number;
  avgVisitsPerPatient: number;
  newPatientsThisPeriod: number;
}

interface BreakdownItem {
  label: string;
  total: number;
  complied: number;
  rate: number;
}

export default function PatientRetentionAnalytics({
  onMenuChange = () => {},
  onLogout,
  activeAddOns = []
}: PatientRetentionAnalyticsProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeRange, setTimeRange] = useState('90');
  const [loading, setLoading] = useState(true);
  const [allBookings, setAllBookings] = useState<BookingRecord[]>([]);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  // Load ALL bookings once
  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const { db } = await import('../lib/firebase/config');
        const { collection, query, where, getDocs } = await import('firebase/firestore');

        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, where('doctorId', '==', userId));
        const snap = await getDocs(q);

        const bookings: BookingRecord[] = [];
        snap.docs.forEach(doc => {
          const d = doc.data();

          let bookingDate: Date | null = null;
          if (d.appointmentDate) {
            bookingDate = new Date(d.appointmentDate);
          } else if (d.createdAt?.toDate) {
            bookingDate = d.createdAt.toDate();
          } else if (d.date?.toDate) {
            bookingDate = d.date.toDate();
          }
          if (!bookingDate || isNaN(bookingDate.getTime())) return;

          let followUpDate: Date | undefined;
          if (d.followUpDate?.toDate) {
            followUpDate = d.followUpDate.toDate();
          } else if (d.followUpDate && typeof d.followUpDate === 'string') {
            followUpDate = new Date(d.followUpDate);
          }

          bookings.push({
            patientPhone: d.patientPhone || d.patientId || '',
            patientName: d.patientName || 'Unknown',
            age: d.age || d.patientAge || 0,
            gender: d.gender || d.patientGender || '',
            purposeOfVisit: d.purposeOfVisit || '',
            bookingDate,
            followUpDate,
            status: d.status || '',
            isCancelled: d.isCancelled === true || d.status === 'cancelled',
            consultationCompleted: d.consultationCompleted === true || d.eyeIconPressed === true
          });
        });

        // Sort by date
        bookings.sort((a, b) => a.bookingDate.getTime() - b.bookingDate.getTime());
        setAllBookings(bookings);
      } catch (error) {
        console.error('Failed to load bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, []);

  // Filter bookings by time range
  const filteredBookings = useMemo(() => {
    if (timeRange === 'all') return allBookings.filter(b => !b.isCancelled);

    const days = parseInt(timeRange);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);

    return allBookings.filter(b => !b.isCancelled && b.bookingDate >= cutoff);
  }, [allBookings, timeRange]);

  // All non-cancelled bookings (for historical patient lookup)
  const allValidBookings = useMemo(() => allBookings.filter(b => !b.isCancelled), [allBookings]);

  // Core retention metrics
  const metrics: RetentionMetrics = useMemo(() => {
    if (filteredBookings.length === 0) {
      return {
        totalUniquePatients: 0, returningPatients: 0, retentionRate: 0,
        followUpScheduled: 0, followUpComplied: 0, followUpComplianceRate: 0,
        avgVisitsPerPatient: 0, newPatientsThisPeriod: 0
      };
    }

    // Group ALL bookings by patient (for return detection across time)
    const allPatientVisits = new Map<string, Date[]>();
    allValidBookings.forEach(b => {
      const visits = allPatientVisits.get(b.patientPhone) || [];
      visits.push(b.bookingDate);
      allPatientVisits.set(b.patientPhone, visits);
    });

    // Unique patients in this period
    const periodPatients = new Set<string>();
    filteredBookings.forEach(b => periodPatients.add(b.patientPhone));
    const totalUniquePatients = periodPatients.size;

    // Returning patients = patients in this period who visited more than once (ALL TIME)
    let returningPatients = 0;
    periodPatients.forEach(phone => {
      const allVisits = allPatientVisits.get(phone) || [];
      if (allVisits.length > 1) returningPatients++;
    });

    // Follow-up compliance
    let followUpScheduled = 0;
    let followUpComplied = 0;
    filteredBookings.forEach(b => {
      if (b.followUpDate) {
        followUpScheduled++;
        const patientAllBookings = allValidBookings.filter(
          ob => ob.patientPhone === b.patientPhone && ob.bookingDate > b.bookingDate
        );
        // Did patient come back within ±7 days of follow-up date?
        const followUpTime = b.followUpDate.getTime();
        const complied = patientAllBookings.some(ob => {
          const diff = Math.abs(ob.bookingDate.getTime() - followUpTime);
          return diff <= 7 * 24 * 60 * 60 * 1000; // 7 days window
        });
        if (complied) followUpComplied++;
      }
    });

    // New patients = first-ever visit in this period
    let newPatientsThisPeriod = 0;
    periodPatients.forEach(phone => {
      const allVisits = (allPatientVisits.get(phone) || []).sort((a, b) => a.getTime() - b.getTime());
      if (allVisits.length > 0) {
        const firstVisit = allVisits[0];
        const cutoff = timeRange === 'all' ? new Date(0) : (() => {
          const d = new Date();
          d.setDate(d.getDate() - parseInt(timeRange));
          return d;
        })();
        if (firstVisit >= cutoff) newPatientsThisPeriod++;
      }
    });

    return {
      totalUniquePatients,
      returningPatients,
      retentionRate: totalUniquePatients > 0 ? Math.round((returningPatients / totalUniquePatients) * 100) : 0,
      followUpScheduled,
      followUpComplied,
      followUpComplianceRate: followUpScheduled > 0 ? Math.round((followUpComplied / followUpScheduled) * 100) : 0,
      avgVisitsPerPatient: totalUniquePatients > 0 ? parseFloat((filteredBookings.length / totalUniquePatients).toFixed(1)) : 0,
      newPatientsThisPeriod
    };
  }, [filteredBookings, allValidBookings, timeRange]);

  // Follow-up compliance by age group
  const ageBreakdown: BreakdownItem[] = useMemo(() => {
    const groups: Record<string, { total: number; complied: number }> = {
      '0-18': { total: 0, complied: 0 },
      '19-30': { total: 0, complied: 0 },
      '31-45': { total: 0, complied: 0 },
      '46-60': { total: 0, complied: 0 },
      '60+': { total: 0, complied: 0 },
      'NA': { total: 0, complied: 0 }
    };

    filteredBookings.forEach(b => {
      if (!b.followUpDate) return;
      const age = b.age;
      let group = 'NA';
      if (age > 0) {
        if (age <= 18) group = '0-18';
        else if (age <= 30) group = '19-30';
        else if (age <= 45) group = '31-45';
        else if (age <= 60) group = '46-60';
        else group = '60+';
      }

      groups[group].total++;

      // Check follow-up compliance
      const followUpTime = b.followUpDate!.getTime();
      const complied = allValidBookings.some(
        ob => ob.patientPhone === b.patientPhone &&
          ob.bookingDate > b.bookingDate &&
          Math.abs(ob.bookingDate.getTime() - followUpTime) <= 7 * 24 * 60 * 60 * 1000
      );
      if (complied) groups[group].complied++;
    });

    return Object.entries(groups)
      .filter(([_, v]) => v.total > 0)
      .map(([label, v]) => ({
        label,
        total: v.total,
        complied: v.complied,
        rate: Math.round((v.complied / v.total) * 100)
      }));
  }, [filteredBookings, allValidBookings]);

  // Follow-up compliance by gender
  const genderBreakdown: BreakdownItem[] = useMemo(() => {
    const groups: Record<string, { total: number; complied: number }> = {
      'Male': { total: 0, complied: 0 },
      'Female': { total: 0, complied: 0 },
      'Other': { total: 0, complied: 0 },
      'NA': { total: 0, complied: 0 }
    };

    filteredBookings.forEach(b => {
      if (!b.followUpDate) return;
      let gender = 'NA';
      if (b.gender) {
        gender = b.gender.charAt(0).toUpperCase() + b.gender.slice(1).toLowerCase();
        if (!groups[gender]) gender = 'Other';
      }

      groups[gender].total++;

      const followUpTime = b.followUpDate!.getTime();
      const complied = allValidBookings.some(
        ob => ob.patientPhone === b.patientPhone &&
          ob.bookingDate > b.bookingDate &&
          Math.abs(ob.bookingDate.getTime() - followUpTime) <= 7 * 24 * 60 * 60 * 1000
      );
      if (complied) groups[gender].complied++;
    });

    return Object.entries(groups)
      .filter(([_, v]) => v.total > 0)
      .map(([label, v]) => ({
        label,
        total: v.total,
        complied: v.complied,
        rate: Math.round((v.complied / v.total) * 100)
      }));
  }, [filteredBookings, allValidBookings]);

  // Follow-up compliance by purpose
  const purposeBreakdown: BreakdownItem[] = useMemo(() => {
    const labelMap: Record<string, string> = {
      'New Patient - Initial Consultation': 'New Patient',
      'Existing Patient - New Treatment (First Visit)': 'Existing Patient',
      'Report Review (Within 5 Days of Initial Visit)': 'Report Review',
      'Follow-up Consultation (After 5 Days)': 'Follow-up',
      'Routine Check-up': 'Routine Check-up',
      'Emergency Consultation': 'Emergency',
    };

    const groups: Record<string, { total: number; complied: number }> = {};

    filteredBookings.forEach(b => {
      if (!b.followUpDate) return;
      const purpose = labelMap[b.purposeOfVisit] || b.purposeOfVisit || 'NA';

      if (!groups[purpose]) groups[purpose] = { total: 0, complied: 0 };
      groups[purpose].total++;

      const followUpTime = b.followUpDate!.getTime();
      const complied = allValidBookings.some(
        ob => ob.patientPhone === b.patientPhone &&
          ob.bookingDate > b.bookingDate &&
          Math.abs(ob.bookingDate.getTime() - followUpTime) <= 7 * 24 * 60 * 60 * 1000
      );
      if (complied) groups[purpose].complied++;
    });

    return Object.entries(groups)
      .filter(([_, v]) => v.total > 0)
      .map(([label, v]) => ({
        label,
        total: v.total,
        complied: v.complied,
        rate: Math.round((v.complied / v.total) * 100)
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [filteredBookings, allValidBookings]);

  // Drop-off analysis — how many visits before patients stop coming
  const dropOffData = useMemo(() => {
    const patientVisitCounts = new Map<string, number>();
    filteredBookings.forEach(b => {
      patientVisitCounts.set(b.patientPhone, (patientVisitCounts.get(b.patientPhone) || 0) + 1);
    });

    let oneVisit = 0, twoVisits = 0, threeVisits = 0, fourPlus = 0;
    patientVisitCounts.forEach(count => {
      if (count === 1) oneVisit++;
      else if (count === 2) twoVisits++;
      else if (count === 3) threeVisits++;
      else fourPlus++;
    });

    const total = patientVisitCounts.size || 1;
    return [
      { label: 'Single Visit', count: oneVisit, pct: Math.round((oneVisit / total) * 100), color: '#ef4444' },
      { label: '2 Visits', count: twoVisits, pct: Math.round((twoVisits / total) * 100), color: '#f59e0b' },
      { label: '3 Visits', count: threeVisits, pct: Math.round((threeVisits / total) * 100), color: '#3b82f6' },
      { label: '4+ Visits (Loyal)', count: fourPlus, pct: Math.round((fourPlus / total) * 100), color: '#10b981' },
    ];
  }, [filteredBookings]);

  // Monthly retention trend
  const monthlyTrend = useMemo(() => {
    // Get last 6 months
    const months: { label: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const label = start.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      months.push({ label, start, end });
    }

    // All patient visit map (full history)
    const allPatientVisits = new Map<string, Date[]>();
    allValidBookings.forEach(b => {
      const visits = allPatientVisits.get(b.patientPhone) || [];
      visits.push(b.bookingDate);
      allPatientVisits.set(b.patientPhone, visits);
    });

    return months.map(m => {
      const monthBookings = allValidBookings.filter(b => b.bookingDate >= m.start && b.bookingDate <= m.end);
      const monthPatients = new Set<string>();
      monthBookings.forEach(b => monthPatients.add(b.patientPhone));

      let returning = 0;
      monthPatients.forEach(phone => {
        const allVisits = allPatientVisits.get(phone) || [];
        if (allVisits.length > 1) returning++;
      });

      const total = monthPatients.size;
      return {
        month: m.label,
        rate: total > 0 ? Math.round((returning / total) * 100) : 0,
        patients: total,
        returning
      };
    });
  }, [allValidBookings]);

  // AI Insights generation
  const generateAIInsights = async () => {
    try {
      setAiLoading(true);
      const prompt = `You are an expert AI practice consultant for an Indian doctor. Analyze these patient retention metrics, identify strengths and weaknesses, and provide a structured improvement plan.

Data:
- Time Period: Last ${timeRange === 'all' ? 'all time' : timeRange + ' days'}
- Total Unique Patients: ${metrics.totalUniquePatients}
- Returning Patients: ${metrics.returningPatients} (${metrics.retentionRate}%)
- New Patients: ${metrics.newPatientsThisPeriod}
- Avg Visits Per Patient: ${metrics.avgVisitsPerPatient}
- Follow-up Scheduled: ${metrics.followUpScheduled}
- Follow-up Complied: ${metrics.followUpComplied} (${metrics.followUpComplianceRate}%)

Follow-up Compliance by Age: ${ageBreakdown.map(a => `${a.label}: ${a.rate}% (${a.complied}/${a.total})`).join(', ')}
Follow-up Compliance by Gender: ${genderBreakdown.map(g => `${g.label}: ${g.rate}% (${g.complied}/${g.total})`).join(', ')}
Follow-up Compliance by Purpose: ${purposeBreakdown.map(p => `${p.label}: ${p.rate}% (${p.complied}/${p.total})`).join(', ')}

Patient Distribution: ${dropOffData.map(d => `${d.label}: ${d.count} (${d.pct}%)`).join(', ')}

Monthly Retention Trend (last 6 months): ${monthlyTrend.map(m => `${m.month}: ${m.rate}%`).join(', ')}

Respond in this exact format:

📊 **PRACTICE HEALTH SCORE: [X/10]**
[One line summary of overall practice health]

✅ **WHAT'S WORKING WELL**
• [Strength 1 with specific data point]
• [Strength 2 with specific data point]

⚠️ **AREAS NEEDING IMPROVEMENT**
• [Weakness 1 with specific data point]
• [Weakness 2 with specific data point]

🎯 **ACTION PLAN TO IMPROVE RETENTION**

**Immediate (This Week):**
1. [Specific action] — [Expected impact]
2. [Specific action] — [Expected impact]

**Short-term (Next 30 Days):**
1. [Specific action] — [Expected impact]
2. [Specific action] — [Expected impact]

**Long-term (Next 90 Days):**
1. [Specific action] — [Expected impact]

📈 **TARGET:** [Specific measurable goal, e.g., "Aim to reach X% retention in 60 days by doing Y"]

Rules: Be specific to THIS doctor's data. Use Indian healthcare context. Keep each point to 1-2 lines. Don't be generic — reference the actual numbers provided.`;

      const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
      const API_KEY = 'AIzaSyDW2QP3LsJLivp__s7a03mpGdyWHZnXa0w';

      const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      });

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate insights at this time.';
      setAiInsights(text);
      setAiGenerated(true);
    } catch (error) {
      console.error('AI Insights failed:', error);
      setAiInsights('Unable to generate insights. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const CHART_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];
  const timeRangeLabel = timeRange === '30' ? 'Last 30 Days' : timeRange === '90' ? 'Last 90 Days' : timeRange === '180' ? 'Last 180 Days' : 'All Time';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto mb-3" />
          <p className="text-gray-400">Loading retention data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Sidebar */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeMenu="retention-analytics"
        onMenuChange={onMenuChange}
        onLogout={onLogout}
        activeAddOns={activeAddOns}
      />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <div className="border-b border-gray-800 bg-[#0a0f1a]/95 backdrop-blur sticky top-0 z-40">
          <div className="px-4 lg:px-8 py-4">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-gray-400 hover:text-white"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Home className="w-4 h-4 cursor-pointer hover:text-white" onClick={() => onMenuChange('dashboard')} />
                <ChevronRight className="w-3 h-3" />
                <span className="text-emerald-400">Patient Retention</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
                  <Target className="w-6 h-6 text-emerald-400" />
                  Patient Retention Analytics
                </h1>
                <p className="text-sm text-gray-400 mt-1">Track follow-up compliance and patient loyalty</p>
              </div>
              <Select value={timeRange} onValueChange={(v) => { setTimeRange(v); setAiGenerated(false); }}>
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="30" className="text-white hover:bg-gray-700">Last 30 Days</SelectItem>
                  <SelectItem value="90" className="text-white hover:bg-gray-700">Last 90 Days</SelectItem>
                  <SelectItem value="180" className="text-white hover:bg-gray-700">Last 180 Days</SelectItem>
                  <SelectItem value="all" className="text-white hover:bg-gray-700">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 lg:px-8 py-6 space-y-6">

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{metrics.totalUniquePatients}</p>
                <p className="text-xs text-gray-400">Unique Patients</p>
                <p className="text-xs text-blue-400 mt-1">{metrics.newPatientsThisPeriod} new in period</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{metrics.retentionRate}%</p>
                <p className="text-xs text-gray-400">Retention Rate</p>
                <p className="text-xs text-emerald-400 mt-1">{metrics.returningPatients} returning</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-amber-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{metrics.followUpComplianceRate}%</p>
                <p className="text-xs text-gray-400">Follow-up Compliance</p>
                <p className="text-xs text-amber-400 mt-1">{metrics.followUpComplied}/{metrics.followUpScheduled} complied</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-purple-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{metrics.avgVisitsPerPatient}</p>
                <p className="text-xs text-gray-400">Avg Visits/Patient</p>
                <p className="text-xs text-purple-400 mt-1">{filteredBookings.length} total bookings</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1: Drop-off + Monthly Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Drop-off Analysis */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <UserX className="w-4 h-4 text-red-400" />
                  Patient Visit Distribution
                </CardTitle>
                <p className="text-xs text-gray-400">How many times patients visit</p>
              </CardHeader>
              <CardContent>
                {dropOffData.some(d => d.count > 0) ? (
                  <div className="space-y-3">
                    {dropOffData.map((item, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">{item.label}</span>
                          <span className="text-white font-medium">{item.count} patients ({item.pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-3">
                          <div
                            className="h-3 rounded-full transition-all duration-500"
                            style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-400">
                        {dropOffData[0].pct > 50 ? (
                          <span className="text-red-400">⚠ {dropOffData[0].pct}% patients visit only once. Consider follow-up reminders to improve retention.</span>
                        ) : dropOffData[3].pct > 30 ? (
                          <span className="text-emerald-400">✅ Great! {dropOffData[3].pct}% of your patients are loyal (4+ visits).</span>
                        ) : (
                          <span className="text-amber-400">📊 Your patient loyalty is building. Focus on converting 2-visit patients into regulars.</span>
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm py-8 text-center">No booking data for this period</p>
                )}
              </CardContent>
            </Card>

            {/* Monthly Retention Trend */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  6-Month Retention Trend
                </CardTitle>
                <p className="text-xs text-gray-400">Monthly retention rate trend</p>
              </CardHeader>
              <CardContent>
                {monthlyTrend.some(m => m.patients > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value: number, name: string) => [`${value}%`, 'Retention Rate']}
                      />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ fill: '#10b981', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-sm py-8 text-center">Not enough data for trend</p>
                )}
                {monthlyTrend.length >= 2 && monthlyTrend[monthlyTrend.length - 1].patients > 0 && (
                  <div className="mt-2 text-center">
                    {(() => {
                      const latest = monthlyTrend[monthlyTrend.length - 1].rate;
                      const prev = monthlyTrend[monthlyTrend.length - 2].rate;
                      const diff = latest - prev;
                      if (diff > 0) return <span className="text-xs text-emerald-400 flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" /> ↑ {diff}% vs last month</span>;
                      if (diff < 0) return <span className="text-xs text-red-400 flex items-center justify-center gap-1"><TrendingDown className="w-3 h-3" /> ↓ {Math.abs(diff)}% vs last month</span>;
                      return <span className="text-xs text-gray-400">Stable vs last month</span>;
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2: Age + Gender Compliance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Age Breakdown */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  Follow-up Compliance by Age
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ageBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={ageBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="label" tick={{ fill: '#9ca3af', fontSize: 12 }} width={50} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value: number, name: string, props: any) => [
                          `${value}% (${props.payload.complied}/${props.payload.total})`,
                          'Compliance'
                        ]}
                      />
                      <Bar dataKey="rate" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                        {ageBreakdown.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-sm py-8 text-center">No follow-up data available</p>
                )}
              </CardContent>
            </Card>

            {/* Gender Breakdown */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Follow-up Compliance by Gender
                </CardTitle>
              </CardHeader>
              <CardContent>
                {genderBreakdown.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie
                          data={genderBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="rate"
                          nameKey="label"
                        >
                          {genderBreakdown.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          formatter={(value: number, name: string, props: any) => [
                            `${value}% (${props.payload.complied}/${props.payload.total})`,
                            props.payload.label
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3 flex-1">
                      {genderBreakdown.map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="text-sm text-gray-300">{item.label}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium text-white">{item.rate}%</span>
                            <span className="text-xs text-gray-400 ml-1">({item.complied}/{item.total})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm py-8 text-center">No follow-up data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Purpose Breakdown */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                Follow-up Compliance by Purpose of Visit
              </CardTitle>
            </CardHeader>
            <CardContent>
              {purposeBreakdown.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {purposeBreakdown.map((item, i) => (
                    <div key={i} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                      <p className="text-sm text-gray-300 mb-2 truncate" title={item.label}>{item.label}</p>
                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold" style={{ color: item.rate >= 70 ? '#10b981' : item.rate >= 40 ? '#f59e0b' : '#ef4444' }}>
                          {item.rate}%
                        </span>
                        <span className="text-xs text-gray-400">{item.complied}/{item.total} complied</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${item.rate}%`,
                            backgroundColor: item.rate >= 70 ? '#10b981' : item.rate >= 40 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm py-8 text-center">No follow-up data by purpose available</p>
              )}
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card className="bg-gray-900/50 border-gray-800 border-emerald-500/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  AI Practice Insights
                </CardTitle>
                <Button
                  onClick={generateAIInsights}
                  disabled={aiLoading || metrics.totalUniquePatients === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1 h-auto"
                >
                  {aiLoading ? (
                    <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Analyzing...</>
                  ) : aiGenerated ? (
                    <><RefreshCw className="w-3 h-3 mr-1" /> Regenerate</>
                  ) : (
                    <><Brain className="w-3 h-3 mr-1" /> Generate Insights</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-400">AI-powered analysis of your practice patterns</p>
            </CardHeader>
            <CardContent>
              {aiInsights ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-emerald-500/20 text-sm text-gray-200 whitespace-pre-line leading-relaxed">
                    {aiInsights}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Brain className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    {metrics.totalUniquePatients === 0
                      ? 'Not enough data to generate insights. Start getting bookings to see AI analysis.'
                      : 'Click "Generate Insights" to get AI-powered recommendations for improving patient retention.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Quality Note */}
          <div className="text-center text-xs text-gray-500 pb-4">
            <p>📊 {timeRangeLabel} • {filteredBookings.length} bookings from {metrics.totalUniquePatients} patients analyzed</p>
            <p className="mt-1">Retention analytics improve as more patient data (age, gender, purpose) is collected during bookings.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
