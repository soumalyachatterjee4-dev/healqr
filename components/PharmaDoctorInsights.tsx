import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  Users, Search, Building2, QrCode, UserPlus,
  Download, Calendar, Loader2, ChevronDown, ChevronUp, Lock, Clock
} from 'lucide-react';
import { checkDateRangeStatus, getOpenWindows, getNextWindow } from '../utils/downloadWindow';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PharmaDoctorInsightsProps {
  companyId: string;
}

interface DoctorInsight {
  doctorId: string;
  doctorName: string;
  specialty: string;
  chambers: ChamberInsight[];
  totalBookings: number;
  qrBookings: number;
  walkinBookings: number;
}

interface ChamberInsight {
  chamberName: string;
  totalPatients: number;
  qrBookings: number;
  walkinBookings: number;
}

interface BookingRaw {
  doctorId: string;
  patientPhone?: string;
  patientId?: string;
  age?: number;
  patientAge?: number;
  gender?: string;
  patientGender?: string;
  purposeOfVisit?: string;
  chamberName?: string;
  chamber?: string;
  type?: string;
  status?: string;
  isCancelled?: boolean;
  appointmentDate?: string;
  createdAt?: any;
  date?: any;
}

interface DemographicData {
  ageGroups: Record<string, { male: number; female: number; other: number; total: number; purposes: Record<string, number> }>;
  genderSplit: { male: number; female: number; other: number; na: number };
  purposeSplit: Record<string, number>;
  totalWithData: number;
}

const CHART_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function PharmaDoctorInsights({ companyId }: PharmaDoctorInsightsProps) {
  const [activeTab, setActiveTab] = useState<'chambers' | 'demographics'>('chambers');
  const [loading, setLoading] = useState(true);
  const [doctorIds, setDoctorIds] = useState<string[]>([]);
  const [doctorMap, setDoctorMap] = useState<Map<string, { name: string; specialty: string }>>(new Map());
  const [allBookings, setAllBookings] = useState<BookingRaw[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);

  // Set default date range (current month)
  useEffect(() => {
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
    setDateFrom(firstDay);
    setDateTo(lastDay);
  }, []);

  // Load doctor IDs from distributed doctors
  useEffect(() => {
    const loadDoctors = async () => {
      if (!companyId) return;
      try {
        const { collection, getDocs, getDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase/config');

        // Get distributed doctors
        const distRef = collection(db, 'pharmaCompanies', companyId, 'distributedDoctors');
        const distSnap = await getDocs(distRef);
        const ids: string[] = [];
        const map = new Map<string, { name: string; specialty: string }>();

        distSnap.docs.forEach(d => {
          const data = d.data();
          const did = data.doctorId || d.id;
          ids.push(did);
          map.set(did, {
            name: data.doctorName || data.name || 'Unknown Doctor',
            specialty: data.specialty || 'General'
          });
        });

        // Fallback: if no distributed doctors, try matching by company name
        if (ids.length === 0) {
          const companyDoc = await getDoc(doc(db, 'pharmaCompanies', companyId));
          if (companyDoc.exists()) {
            const cName = (companyDoc.data().name || '').toLowerCase().trim();
            if (cName) {
              const allDoctors = await getDocs(collection(db, 'doctors'));
              allDoctors.docs.forEach(d => {
                const data = d.data();
                if ((data.companyName || '').toLowerCase().trim() === cName) {
                  ids.push(d.id);
                  map.set(d.id, {
                    name: data.name || data.doctorName || 'Unknown Doctor',
                    specialty: data.specialty || 'General'
                  });
                }
              });
            }
          }
        }

        setDoctorIds(ids);
        setDoctorMap(map);
      } catch (error) {
        console.error('Failed to load doctors:', error);
      }
    };

    loadDoctors();
  }, [companyId]);

  // Load bookings for all doctors
  useEffect(() => {
    const loadBookings = async () => {
      if (doctorIds.length === 0) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase/config');

        const bookings: BookingRaw[] = [];

        // Batch query (max 30 per query)
        for (let i = 0; i < doctorIds.length; i += 30) {
          const batch = doctorIds.slice(i, i + 30);
          const q = query(collection(db, 'bookings'), where('doctorId', 'in', batch));
          const snap = await getDocs(q);
          snap.docs.forEach(d => {
            const data = d.data();
            bookings.push({
              doctorId: data.doctorId,
              patientPhone: data.patientPhone || data.patientId,
              age: data.age || data.patientAge,
              gender: data.gender || data.patientGender,
              purposeOfVisit: data.purposeOfVisit,
              chamberName: data.chamberName || data.chamber,
              type: data.type,
              status: data.status,
              isCancelled: data.isCancelled === true || data.status === 'cancelled',
              appointmentDate: data.appointmentDate,
              createdAt: data.createdAt,
              date: data.date,
            });
          });
        }

        setAllBookings(bookings);
      } catch (error) {
        console.error('Failed to load bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [doctorIds]);

  // Filter bookings by date range
  const filteredBookings = useMemo(() => {
    return allBookings.filter(b => {
      if (b.isCancelled) return false;

      let bookingDate: string | null = null;
      if (b.appointmentDate) {
        bookingDate = b.appointmentDate;
      } else if (b.createdAt?.toDate) {
        const d = b.createdAt.toDate();
        bookingDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }

      if (!bookingDate) return false;
      if (dateFrom && bookingDate < dateFrom) return false;
      if (dateTo && bookingDate > dateTo) return false;
      return true;
    });
  }, [allBookings, dateFrom, dateTo]);

  // === TAB 1: Chamber-wise Doctor Insights ===
  const doctorInsights: DoctorInsight[] = useMemo(() => {
    const map = new Map<string, DoctorInsight>();

    filteredBookings.forEach(b => {
      if (!map.has(b.doctorId)) {
        const info = doctorMap.get(b.doctorId) || { name: 'Unknown', specialty: 'General' };
        map.set(b.doctorId, {
          doctorId: b.doctorId,
          doctorName: info.name,
          specialty: info.specialty,
          chambers: [],
          totalBookings: 0,
          qrBookings: 0,
          walkinBookings: 0
        });
      }

      const doc = map.get(b.doctorId)!;
      doc.totalBookings++;
      const isWalkin = b.type === 'walkin_booking';
      if (isWalkin) doc.walkinBookings++;
      else doc.qrBookings++;

      const chamberName = b.chamberName || (isWalkin ? 'Walk-in' : 'Default Chamber');
      let chamber = doc.chambers.find(c => c.chamberName === chamberName);
      if (!chamber) {
        chamber = { chamberName, totalPatients: 0, qrBookings: 0, walkinBookings: 0 };
        doc.chambers.push(chamber);
      }
      chamber.totalPatients++;
      if (isWalkin) chamber.walkinBookings++;
      else chamber.qrBookings++;
    });

    return Array.from(map.values()).sort((a, b) => b.totalBookings - a.totalBookings);
  }, [filteredBookings, doctorMap]);

  // Filter by search
  const filteredDoctors = useMemo(() => {
    if (!searchQuery.trim()) return doctorInsights;
    const q = searchQuery.toLowerCase();
    return doctorInsights.filter(d =>
      d.doctorName.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q)
    );
  }, [doctorInsights, searchQuery]);

  // === TAB 3: Demographics Cross-Tab ===
  const demographicData: DemographicData = useMemo(() => {
    const ageGroups: Record<string, { male: number; female: number; other: number; total: number; purposes: Record<string, number> }> = {
      '0-18': { male: 0, female: 0, other: 0, total: 0, purposes: {} },
      '19-30': { male: 0, female: 0, other: 0, total: 0, purposes: {} },
      '31-45': { male: 0, female: 0, other: 0, total: 0, purposes: {} },
      '46-60': { male: 0, female: 0, other: 0, total: 0, purposes: {} },
      '60+': { male: 0, female: 0, other: 0, total: 0, purposes: {} },
      'NA': { male: 0, female: 0, other: 0, total: 0, purposes: {} },
    };

    const genderSplit = { male: 0, female: 0, other: 0, na: 0 };
    const purposeSplit: Record<string, number> = {};
    let totalWithData = 0;

    const labelMap: Record<string, string> = {
      'New Patient - Initial Consultation': 'New Patient',
      'Existing Patient - New Treatment (First Visit)': 'Existing Patient',
      'Report Review (Within 5 Days of Initial Visit)': 'Report Review',
      'Follow-up Consultation (After 5 Days)': 'Follow-up',
      'Routine Check-up': 'Routine Check-up',
      'Emergency Consultation': 'Emergency',
    };

    filteredBookings.forEach(b => {
      totalWithData++;

      // Age group
      const age = b.age || 0;
      let ageGroup = 'NA';
      if (age > 0) {
        if (age <= 18) ageGroup = '0-18';
        else if (age <= 30) ageGroup = '19-30';
        else if (age <= 45) ageGroup = '31-45';
        else if (age <= 60) ageGroup = '46-60';
        else ageGroup = '60+';
      }

      // Gender
      const gender = (b.gender || '').toLowerCase();
      if (gender === 'male') {
        ageGroups[ageGroup].male++;
        genderSplit.male++;
      } else if (gender === 'female') {
        ageGroups[ageGroup].female++;
        genderSplit.female++;
      } else if (gender && gender !== '') {
        ageGroups[ageGroup].other++;
        genderSplit.other++;
      } else {
        genderSplit.na++;
      }
      ageGroups[ageGroup].total++;

      // Purpose
      const purpose = labelMap[b.purposeOfVisit || ''] || b.purposeOfVisit || 'NA';
      purposeSplit[purpose] = (purposeSplit[purpose] || 0) + 1;
      ageGroups[ageGroup].purposes[purpose] = (ageGroups[ageGroup].purposes[purpose] || 0) + 1;
    });

    return { ageGroups, genderSplit, purposeSplit, totalWithData };
  }, [filteredBookings]);

  // Top purpose per age group
  const getTopPurpose = (purposes: Record<string, number>): string => {
    if (Object.keys(purposes).length === 0) return '-';
    return Object.entries(purposes).sort(([, a], [, b]) => b - a)[0][0];
  };

  // === CSV Downloads for Tab 1 & Tab 2 ===
  const downloadChamberCSV = () => {
    const rows: string[][] = [];
    rows.push(['Doctor Name', 'Specialty', 'Chamber', 'Total Patients', 'QR Bookings', 'Walk-in Bookings', 'QR %']);

    filteredDoctors.forEach(doc => {
      doc.chambers.forEach(ch => {
        rows.push([
          doc.doctorName,
          doc.specialty,
          ch.chamberName,
          String(ch.totalPatients),
          String(ch.qrBookings),
          String(ch.walkinBookings),
          ch.totalPatients > 0 ? `${Math.round((ch.qrBookings / ch.totalPatients) * 100)}%` : '0%'
        ]);
      });
    });

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chamber-insights-${dateFrom}-to-${dateTo}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadDemographicsCSV = () => {
    const rows: string[][] = [];

    // Section 1: Age × Gender Cross-Tab
    rows.push(['=== Age × Gender Cross-Tab ===']);
    rows.push(['Age Group', 'Male', 'Female', 'Other', 'Total', 'Top Purpose']);
    Object.entries(demographicData.ageGroups)
      .filter(([_, v]) => v.total > 0)
      .forEach(([label, v]) => {
        rows.push([label, String(v.male), String(v.female), String(v.other), String(v.total), getTopPurpose(v.purposes)]);
      });
    rows.push(['Total', String(demographicData.genderSplit.male), String(demographicData.genderSplit.female), String(demographicData.genderSplit.other), String(demographicData.totalWithData), Object.entries(demographicData.purposeSplit).sort(([, a], [, b]) => b - a)[0]?.[0] || '-']);

    rows.push([]);

    // Section 2: Gender Distribution
    rows.push(['=== Gender Distribution ===']);
    rows.push(['Gender', 'Count', 'Percentage']);
    const gTotal = demographicData.totalWithData;
    rows.push(['Male', String(demographicData.genderSplit.male), `${gTotal ? Math.round((demographicData.genderSplit.male / gTotal) * 100) : 0}%`]);
    rows.push(['Female', String(demographicData.genderSplit.female), `${gTotal ? Math.round((demographicData.genderSplit.female / gTotal) * 100) : 0}%`]);
    rows.push(['Other', String(demographicData.genderSplit.other), `${gTotal ? Math.round((demographicData.genderSplit.other / gTotal) * 100) : 0}%`]);

    rows.push([]);

    // Section 3: Purpose of Visit
    rows.push(['=== Purpose of Visit ===']);
    rows.push(['Purpose', 'Count', 'Percentage']);
    Object.entries(demographicData.purposeSplit)
      .sort(([, a], [, b]) => b - a)
      .forEach(([label, count]) => {
        rows.push([label, String(count), `${gTotal ? Math.round((count / gTotal) * 100) : 0}%`]);
      });

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `patient-demographics-${dateFrom}-to-${dateTo}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Chart data
  const genderChartData = useMemo(() => [
    { name: 'Male', value: demographicData.genderSplit.male, color: '#3b82f6' },
    { name: 'Female', value: demographicData.genderSplit.female, color: '#ec4899' },
    { name: 'Other', value: demographicData.genderSplit.other, color: '#8b5cf6' },
  ].filter(d => d.value > 0), [demographicData]);

  const ageChartData = useMemo(() =>
    Object.entries(demographicData.ageGroups)
      .filter(([_, v]) => v.total > 0)
      .map(([label, v]) => ({ label, total: v.total, male: v.male, female: v.female })),
    [demographicData]
  );

  const purposeChartData = useMemo(() =>
    Object.entries(demographicData.purposeSplit)
      .filter(([_, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([label, count]) => ({ label, count })),
    [demographicData]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="ml-3 text-gray-400">Loading doctor insights...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" />
          Doctor Insights
        </h2>
        <p className="text-sm text-gray-400 mt-1">Anonymized patient volume and demographics across your doctor network</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-0">
        {[
          { id: 'chambers' as const, label: 'Chamber Insights', icon: Building2 },
          { id: 'demographics' as const, label: 'Patient Demographics', icon: Users },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Download Window Banner */}
      {(() => {
        const openWindows = getOpenWindows();
        const nextWin = getNextWindow();
        if (openWindows.length > 0) {
          return (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-3">
              <Download className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-400">Free download window open!</p>
                <p className="text-xs text-gray-400">
                  {openWindows.map(w => `${w.monthLabel} (${w.daysLeft}d left)`).join(', ')} — select the date range and download CSV
                </p>
              </div>
            </div>
          );
        }
        return (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-400">No free download window open</p>
              {nextWin && <p className="text-xs text-gray-400">{nextWin.monthLabel} data available from {nextWin.opensOn.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
            </div>
          </div>
        );
      })()}

      {/* Date Filter */}
      <div className="flex flex-wrap items-center gap-3 bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-sm"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-sm"
          />
          <span className="text-xs text-gray-500 ml-auto">{filteredBookings.length} bookings found</span>
          {(() => {
            const status = dateFrom && dateTo ? checkDateRangeStatus(dateFrom, dateTo) : null;
            const canDownload = status === 'free';
            const hasData = activeTab === 'chambers' ? filteredDoctors.length > 0 : demographicData.totalWithData > 0;
            if (!hasData || !dateFrom || !dateTo) return null;
            if (!canDownload) {
              return (
                <span className="text-xs text-red-400 flex items-center gap-1 px-3 py-1.5 bg-red-500/10 rounded-lg ml-2">
                  <Lock className="w-3 h-3" />
                  {status === 'current-month' ? 'Current month data not ready' : 'Locked — Contact admin'}
                </span>
              );
            }
            return (
              <Button
                onClick={activeTab === 'chambers' ? downloadChamberCSV : downloadDemographicsCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 py-1.5 ml-2"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Download CSV
              </Button>
            );
          })()}
      </div>

      {/* ============ TAB 1: Chamber Insights ============ */}
      {activeTab === 'chambers' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by doctor name or specialty..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder:text-gray-500"
            />
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-white">{filteredDoctors.length}</p>
                <p className="text-xs text-gray-400">Doctors</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">{filteredBookings.length}</p>
                <p className="text-xs text-gray-400">Total Patients</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">{filteredBookings.filter(b => b.type !== 'walkin_booking').length}</p>
                <p className="text-xs text-gray-400">QR Bookings</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">{filteredBookings.filter(b => b.type === 'walkin_booking').length}</p>
                <p className="text-xs text-gray-400">Walk-in</p>
              </CardContent>
            </Card>
          </div>

          {/* Doctor Cards */}
          {filteredDoctors.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No doctor data found for this period</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDoctors.map(doc => (
                <Card key={doc.doctorId} className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-all">
                  <CardContent className="p-4">
                    {/* Doctor Header */}
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedDoctor(expandedDoctor === doc.doctorId ? null : doc.doctorId)}
                    >
                      <div>
                        <h3 className="text-white font-medium">{doc.doctorName}</h3>
                        <p className="text-xs text-gray-400">{doc.specialty}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">{doc.totalBookings}</p>
                          <p className="text-xs text-gray-400">patients</p>
                        </div>
                        <div className="flex gap-2">
                          <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400 flex items-center gap-1">
                            <QrCode className="w-3 h-3" /> {doc.qrBookings}
                          </span>
                          <span className="px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-400 flex items-center gap-1">
                            <UserPlus className="w-3 h-3" /> {doc.walkinBookings}
                          </span>
                        </div>
                        {expandedDoctor === doc.doctorId ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Chamber Breakdown (expanded) */}
                    {expandedDoctor === doc.doctorId && (
                      <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-2">
                        {doc.chambers.map((ch, i) => (
                          <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-300">{ch.chamberName}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-white">{ch.totalPatients} patients</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">QR: {ch.qrBookings}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">Walk-in: {ch.walkinBookings}</span>
                              {ch.totalPatients > 0 && (
                                <span className="text-xs text-gray-500">
                                  ({Math.round((ch.qrBookings / ch.totalPatients) * 100)}% QR)
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Privacy footer */}
          <p className="text-xs text-gray-500 text-center">
            🔒 Only patient counts shown. No patient names, phone numbers, or personal data is shared.
          </p>
        </div>
      )}

      {/* ============ TAB 2: Patient Demographics ============ */}
      {activeTab === 'demographics' && (
        <div className="space-y-6">
          {demographicData.totalWithData === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No demographic data available for this period</p>
            </div>
          ) : (
            <>
              {/* Age × Gender Cross-Tab Table */}
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white">Age × Gender Cross-Tab</CardTitle>
                  <p className="text-xs text-gray-400">{demographicData.totalWithData} patients analyzed</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">Age Group</th>
                          <th className="text-center py-2 px-3 text-blue-400 font-medium">Male</th>
                          <th className="text-center py-2 px-3 text-pink-400 font-medium">Female</th>
                          <th className="text-center py-2 px-3 text-purple-400 font-medium">Other</th>
                          <th className="text-center py-2 px-3 text-white font-medium">Total</th>
                          <th className="text-left py-2 px-3 text-amber-400 font-medium">Top Purpose</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(demographicData.ageGroups)
                          .filter(([_, v]) => v.total > 0)
                          .map(([label, v]) => (
                            <tr key={label} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                              <td className="py-2.5 px-3 text-gray-300 font-medium">{label}</td>
                              <td className="py-2.5 px-3 text-center text-blue-300">{v.male}</td>
                              <td className="py-2.5 px-3 text-center text-pink-300">{v.female}</td>
                              <td className="py-2.5 px-3 text-center text-purple-300">{v.other}</td>
                              <td className="py-2.5 px-3 text-center text-white font-bold">{v.total}</td>
                              <td className="py-2.5 px-3 text-amber-300 text-xs">{getTopPurpose(v.purposes)}</td>
                            </tr>
                          ))}
                        {/* Totals row */}
                        <tr className="bg-gray-800/30 font-bold">
                          <td className="py-2.5 px-3 text-white">Total</td>
                          <td className="py-2.5 px-3 text-center text-blue-400">{demographicData.genderSplit.male}</td>
                          <td className="py-2.5 px-3 text-center text-pink-400">{demographicData.genderSplit.female}</td>
                          <td className="py-2.5 px-3 text-center text-purple-400">{demographicData.genderSplit.other}</td>
                          <td className="py-2.5 px-3 text-center text-emerald-400">{demographicData.totalWithData}</td>
                          <td className="py-2.5 px-3 text-amber-400 text-xs">
                            {Object.entries(demographicData.purposeSplit).sort(([, a], [, b]) => b - a)[0]?.[0] || '-'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gender Pie */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-white">Gender Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="50%" height={180}>
                        <PieChart>
                          <Pie data={genderChartData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={3} dataKey="value" nameKey="name">
                            {genderChartData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 flex-1">
                        {genderChartData.map((item, i) => {
                          const pct = Math.round((item.value / demographicData.totalWithData) * 100);
                          return (
                            <div key={i} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-sm text-gray-300">{item.name}</span>
                              </div>
                              <span className="text-sm text-white font-medium">{item.value} ({pct}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Age Bar Chart */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-white">Age Distribution by Gender</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={ageChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="male" name="Male" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="female" name="Female" fill="#ec4899" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Purpose Breakdown */}
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white">Purpose of Visit Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {purposeChartData.map((item, i) => {
                      const pct = Math.round((item.count / demographicData.totalWithData) * 100);
                      return (
                        <div key={i} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                          <p className="text-xs text-gray-400 truncate mb-1" title={item.label}>{item.label}</p>
                          <p className="text-xl font-bold text-white">{item.count}</p>
                          <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1.5">
                            <div
                              className="h-1.5 rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{pct}%</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Privacy footer */}
              <p className="text-xs text-gray-500 text-center">
                🔒 All data is anonymized. No patient names, phone numbers, or identifiable information is shared.
              </p>
            </>
          )}
        </div>
      )}

    </div>
  );
}
