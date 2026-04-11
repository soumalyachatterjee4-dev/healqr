import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Users, TrendingUp, TrendingDown, UserCheck, UserX,
  Calendar, Activity, Target, Brain, RefreshCw, ChevronRight,
  Home, Sparkles, Loader2, Building2, Stethoscope, Menu
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import ClinicSidebar from './ClinicSidebar';

interface ClinicRetentionAnalyticsProps {
  clinicId: string;
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void | Promise<void>;
  activeAddOns?: string[];
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
}

interface BookingRecord {
  doctorId: string;
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
  chamberName: string;
  clinicLocationId: string;
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
  crossDoctorPatients: number;
}

interface BreakdownItem {
  label: string;
  total: number;
  complied: number;
  rate: number;
}

interface DoctorRetention {
  doctorId: string;
  doctorName: string;
  specialty: string;
  totalPatients: number;
  returningPatients: number;
  retentionRate: number;
  followUpCompliance: number;
}

const CHART_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function ClinicRetentionAnalytics({
  clinicId,
  onMenuChange = () => {},
  onLogout,
  activeAddOns = [],
  isSidebarCollapsed: propCollapsed,
  setIsSidebarCollapsed: propSetCollapsed,
}: ClinicRetentionAnalyticsProps) {
  const [timeRange, setTimeRange] = useState('90');
  const [loading, setLoading] = useState(true);
  const [allBookings, setAllBookings] = useState<BookingRecord[]>([]);
  const [doctorMap, setDoctorMap] = useState<Map<string, { name: string; specialty: string }>>(new Map());
  const [locationMap, setLocationMap] = useState<Map<string, string>>(new Map());
  const [aiInsights, setAiInsights] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const isSidebarCollapsed = propCollapsed ?? localCollapsed;
  const setIsSidebarCollapsed = propSetCollapsed ?? setLocalCollapsed;

  // Load bookings + doctor info
  useEffect(() => {
    const loadData = async () => {
      if (!clinicId) return;
      try {
        setLoading(true);
        const { db } = await import('../lib/firebase/config');
        const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');

        // Load clinic doc for doctor names + locations
        const clinicDoc = await getDoc(doc(db, 'clinics', clinicId));
        const clinicData = clinicDoc.exists() ? clinicDoc.data() : null;
        const dMap = new Map<string, { name: string; specialty: string }>();
        const lMap = new Map<string, string>();

        if (clinicData) {
          (clinicData.linkedDoctorsDetails || []).forEach((d: any) => {
            const id = d.doctorId || d.uid;
            if (id) {
              dMap.set(id, {
                name: d.name || d.doctorName || 'Unknown Doctor',
                specialty: (d.specialties || [d.specialty]).filter(Boolean).join(', ') || 'General'
              });
            }
          });
          (clinicData.locations || []).forEach((loc: any) => {
            lMap.set(loc.id, loc.name || `Branch ${loc.id}`);
          });
        }
        setDoctorMap(dMap);
        setLocationMap(lMap);

        // Load all bookings for this clinic
        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, where('clinicId', '==', clinicId));
        const snap = await getDocs(q);

        const bookings: BookingRecord[] = [];
        snap.docs.forEach(d => {
          const data = d.data();

          let bookingDate: Date | null = null;
          if (data.appointmentDate) {
            bookingDate = new Date(data.appointmentDate);
          } else if (data.createdAt?.toDate) {
            bookingDate = data.createdAt.toDate();
          } else if (data.date?.toDate) {
            bookingDate = data.date.toDate();
          }
          if (!bookingDate || isNaN(bookingDate.getTime())) return;

          let followUpDate: Date | undefined;
          if (data.followUpDate?.toDate) {
            followUpDate = data.followUpDate.toDate();
          } else if (data.followUpDate && typeof data.followUpDate === 'string') {
            followUpDate = new Date(data.followUpDate);
          }

          bookings.push({
            doctorId: data.doctorId || '',
            patientPhone: data.patientPhone || data.patientId || '',
            patientName: data.patientName || 'Unknown',
            age: data.age || data.patientAge || 0,
            gender: data.gender || data.patientGender || '',
            purposeOfVisit: data.purposeOfVisit || '',
            bookingDate,
            followUpDate,
            status: data.status || '',
            isCancelled: data.isCancelled === true || data.status === 'cancelled',
            consultationCompleted: data.consultationCompleted === true || data.eyeIconPressed === true,
            chamberName: data.chamberName || data.chamber || '',
            clinicLocationId: data.clinicLocationId || '001',
          });
        });

        bookings.sort((a, b) => a.bookingDate.getTime() - b.bookingDate.getTime());
        setAllBookings(bookings);
      } catch (error) {
        console.error('Failed to load clinic bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [clinicId]);

  // Filter by time range
  const filteredBookings = useMemo(() => {
    if (timeRange === 'all') return allBookings.filter(b => !b.isCancelled);
    const days = parseInt(timeRange);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);
    return allBookings.filter(b => !b.isCancelled && b.bookingDate >= cutoff);
  }, [allBookings, timeRange]);

  const allValidBookings = useMemo(() => allBookings.filter(b => !b.isCancelled), [allBookings]);

  // Core retention metrics
  const metrics: RetentionMetrics = useMemo(() => {
    if (filteredBookings.length === 0) {
      return {
        totalUniquePatients: 0, returningPatients: 0, retentionRate: 0,
        followUpScheduled: 0, followUpComplied: 0, followUpComplianceRate: 0,
        avgVisitsPerPatient: 0, newPatientsThisPeriod: 0, crossDoctorPatients: 0
      };
    }

    // All-time patient visit map
    const allPatientVisits = new Map<string, Date[]>();
    allValidBookings.forEach(b => {
      const visits = allPatientVisits.get(b.patientPhone) || [];
      visits.push(b.bookingDate);
      allPatientVisits.set(b.patientPhone, visits);
    });

    const periodPatients = new Set<string>();
    filteredBookings.forEach(b => periodPatients.add(b.patientPhone));
    const totalUniquePatients = periodPatients.size;

    let returningPatients = 0;
    periodPatients.forEach(phone => {
      const allVisits = allPatientVisits.get(phone) || [];
      if (allVisits.length > 1) returningPatients++;
    });

    // Cross-doctor: patients who saw 2+ different doctors at this clinic
    let crossDoctorPatients = 0;
    const patientDoctors = new Map<string, Set<string>>();
    allValidBookings.forEach(b => {
      const docs = patientDoctors.get(b.patientPhone) || new Set();
      if (b.doctorId) docs.add(b.doctorId);
      patientDoctors.set(b.patientPhone, docs);
    });
    periodPatients.forEach(phone => {
      const docs = patientDoctors.get(phone) || new Set();
      if (docs.size > 1) crossDoctorPatients++;
    });

    // Follow-up compliance
    let followUpScheduled = 0, followUpComplied = 0;
    filteredBookings.forEach(b => {
      if (b.followUpDate) {
        followUpScheduled++;
        const followUpTime = b.followUpDate.getTime();
        const complied = allValidBookings.some(
          ob => ob.patientPhone === b.patientPhone &&
            ob.bookingDate > b.bookingDate &&
            Math.abs(ob.bookingDate.getTime() - followUpTime) <= 7 * 86400000
        );
        if (complied) followUpComplied++;
      }
    });

    // New patients
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
      newPatientsThisPeriod,
      crossDoctorPatients
    };
  }, [filteredBookings, allValidBookings, timeRange]);

  // Doctor-wise retention breakdown
  const doctorRetention: DoctorRetention[] = useMemo(() => {
    const allPatientVisits = new Map<string, Date[]>();
    allValidBookings.forEach(b => {
      const visits = allPatientVisits.get(b.patientPhone) || [];
      visits.push(b.bookingDate);
      allPatientVisits.set(b.patientPhone, visits);
    });

    const byDoctor = new Map<string, BookingRecord[]>();
    filteredBookings.forEach(b => {
      if (!b.doctorId) return;
      const list = byDoctor.get(b.doctorId) || [];
      list.push(b);
      byDoctor.set(b.doctorId, list);
    });

    return Array.from(byDoctor.entries()).map(([docId, bookings]) => {
      const info = doctorMap.get(docId) || { name: 'Unknown Doctor', specialty: 'General' };
      const patients = new Set<string>();
      bookings.forEach(b => patients.add(b.patientPhone));

      let returning = 0;
      patients.forEach(phone => {
        const allVisits = allPatientVisits.get(phone) || [];
        if (allVisits.length > 1) returning++;
      });

      let fuScheduled = 0, fuComplied = 0;
      bookings.forEach(b => {
        if (b.followUpDate) {
          fuScheduled++;
          const followUpTime = b.followUpDate.getTime();
          const complied = allValidBookings.some(
            ob => ob.patientPhone === b.patientPhone &&
              ob.bookingDate > b.bookingDate &&
              Math.abs(ob.bookingDate.getTime() - followUpTime) <= 7 * 86400000
          );
          if (complied) fuComplied++;
        }
      });

      return {
        doctorId: docId,
        doctorName: info.name,
        specialty: info.specialty,
        totalPatients: patients.size,
        returningPatients: returning,
        retentionRate: patients.size > 0 ? Math.round((returning / patients.size) * 100) : 0,
        followUpCompliance: fuScheduled > 0 ? Math.round((fuComplied / fuScheduled) * 100) : 0
      };
    }).sort((a, b) => b.totalPatients - a.totalPatients);
  }, [filteredBookings, allValidBookings, doctorMap]);

  // Branch-wise retention (if multi-location)
  const branchRetention = useMemo(() => {
    if (locationMap.size <= 1) return [];

    const allPatientVisits = new Map<string, Date[]>();
    allValidBookings.forEach(b => {
      const visits = allPatientVisits.get(b.patientPhone) || [];
      visits.push(b.bookingDate);
      allPatientVisits.set(b.patientPhone, visits);
    });

    const byBranch = new Map<string, BookingRecord[]>();
    filteredBookings.forEach(b => {
      const locId = b.clinicLocationId || '001';
      const list = byBranch.get(locId) || [];
      list.push(b);
      byBranch.set(locId, list);
    });

    return Array.from(byBranch.entries()).map(([locId, bookings]) => {
      const patients = new Set<string>();
      bookings.forEach(b => patients.add(b.patientPhone));

      let returning = 0;
      patients.forEach(phone => {
        const allVisits = allPatientVisits.get(phone) || [];
        if (allVisits.length > 1) returning++;
      });

      return {
        branchId: locId,
        branchName: locationMap.get(locId) || (locId === '001' ? 'Main Branch' : `Branch ${locId}`),
        totalPatients: patients.size,
        returningPatients: returning,
        retentionRate: patients.size > 0 ? Math.round((returning / patients.size) * 100) : 0,
        totalBookings: bookings.length
      };
    }).sort((a, b) => b.totalPatients - a.totalPatients);
  }, [filteredBookings, allValidBookings, locationMap]);

  // Drop-off analysis
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
    const months: { label: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      months.push({ label: start.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), start, end });
    }

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

      return {
        month: m.label,
        rate: monthPatients.size > 0 ? Math.round((returning / monthPatients.size) * 100) : 0,
        patients: monthPatients.size,
        returning
      };
    });
  }, [allValidBookings]);

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

      const followUpTime = b.followUpDate.getTime();
      const complied = allValidBookings.some(
        ob => ob.patientPhone === b.patientPhone &&
          ob.bookingDate > b.bookingDate &&
          Math.abs(ob.bookingDate.getTime() - followUpTime) <= 7 * 86400000
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

  // AI Insights
  const generateAIInsights = async () => {
    try {
      setAiLoading(true);
      const prompt = `You are an expert AI practice consultant for an Indian multi-doctor clinic. Analyze these clinic-level patient retention metrics and provide a structured improvement plan.

Data:
- Time Period: Last ${timeRange === 'all' ? 'all time' : timeRange + ' days'}
- Total Unique Patients: ${metrics.totalUniquePatients}
- Returning Patients: ${metrics.returningPatients} (${metrics.retentionRate}%)
- New Patients: ${metrics.newPatientsThisPeriod}
- Cross-Doctor Patients (saw 2+ doctors): ${metrics.crossDoctorPatients}
- Avg Visits Per Patient: ${metrics.avgVisitsPerPatient}
- Follow-up Scheduled: ${metrics.followUpScheduled}
- Follow-up Complied: ${metrics.followUpComplied} (${metrics.followUpComplianceRate}%)

Doctor-wise Retention: ${doctorRetention.map(d => `${d.doctorName} (${d.specialty}): ${d.retentionRate}% retention, ${d.totalPatients} patients, ${d.followUpCompliance}% follow-up compliance`).join('; ')}

${branchRetention.length > 0 ? `Branch-wise: ${branchRetention.map(b => `${b.branchName}: ${b.retentionRate}% retention, ${b.totalPatients} patients`).join('; ')}` : ''}

Patient Distribution: ${dropOffData.map(d => `${d.label}: ${d.count} (${d.pct}%)`).join(', ')}

Monthly Retention Trend (last 6 months): ${monthlyTrend.map(m => `${m.month}: ${m.rate}%`).join(', ')}

Follow-up by Purpose: ${purposeBreakdown.map(p => `${p.label}: ${p.rate}% (${p.complied}/${p.total})`).join(', ')}

Respond in this exact format:

📊 **CLINIC HEALTH SCORE: [X/10]**
[One line summary]

✅ **WHAT'S WORKING WELL**
• [Strength 1 with specific data]
• [Strength 2 with specific data]

⚠️ **AREAS NEEDING IMPROVEMENT**
• [Weakness 1 — compare across doctors if relevant]
• [Weakness 2 — compare across branches if relevant]

👨‍⚕️ **DOCTOR-WISE INSIGHTS**
• [Comment on highest/lowest retaining doctors with specific suggestions]

🎯 **ACTION PLAN**

**Immediate (This Week):**
1. [Action] — [Impact]
2. [Action] — [Impact]

**Short-term (Next 30 Days):**
1. [Action] — [Impact]

**Long-term (Next 90 Days):**
1. [Action] — [Impact]

📈 **TARGET:** [Measurable clinic-level goal]

Rules: Be specific to THIS clinic's data. Use Indian healthcare context. Reference actual numbers. Compare doctors where relevant.`;

      const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
      const API_KEY = 'AIzaSyDW2QP3LsJLivp__s7a03mpGdyWHZnXa0w';

      const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
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

  const timeRangeLabel = timeRange === '30' ? 'Last 30 Days' : timeRange === '90' ? 'Last 90 Days' : timeRange === '180' ? 'Last 180 Days' : 'All Time';

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
        <ClinicSidebar activeMenu="patient-retention" onMenuChange={onMenuChange} onLogout={onLogout || (() => {})} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activeAddOns={activeAddOns} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} flex items-center justify-center`}>
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <span className="ml-3 text-gray-400">Loading clinic retention data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      <ClinicSidebar activeMenu="patient-retention" onMenuChange={onMenuChange} onLogout={onLogout || (() => {})} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activeAddOns={activeAddOns} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} flex flex-col min-h-screen relative`}>
        {/* Mobile Header */}
        <header className="bg-black/80 backdrop-blur-md border-b border-white/5 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-50 lg:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-blue-500 hover:bg-zinc-900" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </Button>
            <span className="text-sm font-medium text-white">Patient Retention</span>
          </div>
        </header>
        <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-white">
            <Target className="w-6 h-6 text-emerald-400" />
            Patient Retention Analytics
          </h1>
          <p className="text-sm text-gray-400 mt-1">Clinic-wide retention, cross-doctor loyalty & follow-up compliance</p>
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

      {/* Summary Cards — 5 cards (extra: cross-doctor) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
            <p className="text-xs text-amber-400 mt-1">{metrics.followUpComplied}/{metrics.followUpScheduled}</p>
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
            <p className="text-xs text-purple-400 mt-1">{filteredBookings.length} total</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800 col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-pink-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{metrics.crossDoctorPatients}</p>
            <p className="text-xs text-gray-400">Cross-Doctor Patients</p>
            <p className="text-xs text-pink-400 mt-1">Saw 2+ doctors here</p>
          </CardContent>
        </Card>
      </div>

      {/* Doctor-wise Retention Comparison */}
      {doctorRetention.length > 0 && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-indigo-400" />
              Doctor-wise Retention Comparison
            </CardTitle>
            <p className="text-xs text-gray-400">Compare patient retention across doctors in your clinic</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-3 text-gray-400 font-medium">Doctor</th>
                    <th className="text-center py-2 px-3 text-gray-400 font-medium">Patients</th>
                    <th className="text-center py-2 px-3 text-gray-400 font-medium">Retention</th>
                    <th className="text-center py-2 px-3 text-gray-400 font-medium">Follow-up</th>
                    <th className="text-left py-2 px-3 text-gray-400 font-medium">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {doctorRetention.map((doc, i) => {
                    const avgRate = metrics.retentionRate;
                    const diff = doc.retentionRate - avgRate;
                    return (
                      <tr key={doc.doctorId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-2.5 px-3">
                          <p className="text-white font-medium text-sm">{doc.doctorName}</p>
                          <p className="text-xs text-gray-500">{doc.specialty}</p>
                        </td>
                        <td className="py-2.5 px-3 text-center text-white">{doc.totalPatients}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`font-bold ${doc.retentionRate >= 60 ? 'text-emerald-400' : doc.retentionRate >= 35 ? 'text-amber-400' : 'text-red-400'}`}>
                            {doc.retentionRate}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`font-medium ${doc.followUpCompliance >= 60 ? 'text-emerald-400' : doc.followUpCompliance >= 35 ? 'text-amber-400' : 'text-red-400'}`}>
                            {doc.followUpCompliance}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {diff > 5 ? (
                            <span className="text-xs text-emerald-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +{diff}% above avg</span>
                          ) : diff < -5 ? (
                            <span className="text-xs text-red-400 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> {diff}% below avg</span>
                          ) : (
                            <span className="text-xs text-gray-400">At clinic avg</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Branch Retention (only if multi-location) */}
      {branchRetention.length > 0 && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-400" />
              Branch-wise Retention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {branchRetention.map((branch, i) => (
                <div key={branch.branchId} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                  <p className="text-sm text-white font-medium mb-1">{branch.branchName}</p>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-2xl font-bold" style={{ color: branch.retentionRate >= 50 ? '#10b981' : branch.retentionRate >= 30 ? '#f59e0b' : '#ef4444' }}>
                      {branch.retentionRate}%
                    </span>
                    <span className="text-xs text-gray-400">{branch.totalPatients} patients</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${branch.retentionRate}%`,
                        backgroundColor: branch.retentionRate >= 50 ? '#10b981' : branch.retentionRate >= 30 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{branch.returningPatients} returning / {branch.totalBookings} bookings</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row: Drop-off + Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drop-off */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-400" />
              Patient Visit Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dropOffData.some(d => d.count > 0) ? (
              <div className="space-y-3">
                {dropOffData.map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{item.label}</span>
                      <span className="text-white font-medium">{item.count} ({item.pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3">
                      <div className="h-3 rounded-full transition-all duration-500" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <p className="text-xs text-gray-400">
                    {dropOffData[0].pct > 50 ? (
                      <span className="text-red-400">⚠ {dropOffData[0].pct}% patients visit only once. SMS/WhatsApp follow-up reminders can help retain more.</span>
                    ) : dropOffData[3].pct > 30 ? (
                      <span className="text-emerald-400">✅ Great! {dropOffData[3].pct}% of patients are loyal (4+ visits).</span>
                    ) : (
                      <span className="text-amber-400">📊 Patient loyalty is building. Focus on converting 2-visit patients into regulars.</span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm py-8 text-center">No booking data for this period</p>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              6-Month Retention Trend
            </CardTitle>
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
                    formatter={(value: number) => [`${value}%`, 'Retention Rate']}
                  />
                  <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
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

      {/* Doctor Retention Bar Chart */}
      {doctorRetention.length > 1 && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-blue-400" />
              Doctor Retention Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, doctorRetention.length * 45)}>
              <BarChart data={doctorRetention} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="doctorName" tick={{ fill: '#9ca3af', fontSize: 11 }} width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value: number, name: string) => [`${value}%`, name === 'retentionRate' ? 'Retention' : 'Follow-up']}
                />
                <Legend />
                <Bar dataKey="retentionRate" name="Retention %" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16} />
                <Bar dataKey="followUpCompliance" name="Follow-up %" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Purpose Breakdown */}
      {purposeBreakdown.length > 0 && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              Follow-up Compliance by Purpose
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {purposeBreakdown.map((item, i) => (
                <div key={i} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                  <p className="text-sm text-gray-300 mb-2 truncate" title={item.label}>{item.label}</p>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-bold" style={{ color: item.rate >= 70 ? '#10b981' : item.rate >= 40 ? '#f59e0b' : '#ef4444' }}>
                      {item.rate}%
                    </span>
                    <span className="text-xs text-gray-400">{item.complied}/{item.total}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                    <div className="h-1.5 rounded-full" style={{
                      width: `${item.rate}%`,
                      backgroundColor: item.rate >= 70 ? '#10b981' : item.rate >= 40 ? '#f59e0b' : '#ef4444'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      <Card className="bg-gray-900/50 border-gray-800 border-emerald-500/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              AI Clinic Insights
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
          <p className="text-xs text-gray-400">AI-powered analysis of clinic retention patterns & doctor comparison</p>
        </CardHeader>
        <CardContent>
          {aiInsights ? (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-emerald-500/20 text-sm text-gray-200 whitespace-pre-line leading-relaxed">
              {aiInsights}
            </div>
          ) : (
            <div className="text-center py-6">
              <Brain className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {metrics.totalUniquePatients === 0
                  ? 'Not enough data. Start getting bookings to see AI analysis.'
                  : 'Click "Generate Insights" for AI-powered clinic retention recommendations.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 pb-4">
        <p>📊 {timeRangeLabel} • {filteredBookings.length} bookings from {metrics.totalUniquePatients} patients • {doctorRetention.length} doctors</p>
        <p className="mt-1">Clinic-level analytics. Individual doctor reports are available in each doctor's own dashboard.</p>
      </div>
    </div>
      </div>
    </div>
  );
}
