import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Crown, ArrowLeft, Building2, Users, QrCode, UserPlus, TrendingUp,
  Calendar, Filter, BarChart3, MapPin, Stethoscope, Loader2, Mail, Pencil, Check, X
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { auth, db } from '../lib/firebase/config';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { decrypt } from '../utils/encryptionService';
import DashboardPromoDisplay from './DashboardPromoDisplay';

interface MasterAccessProps {
  onBack: () => void;
  clinicId?: string;
}

interface BranchLocation {
  id: string;
  name: string;
  landmark?: string;
  clinicCode?: string;
}

const CHART_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function ClinicMasterAccess({ onBack, clinicId }: MasterAccessProps) {
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<BranchLocation[]>([]);
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string; specialty?: string; locationId?: string }>>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  // Filters
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Master Access Email
  const [masterEmail, setMasterEmail] = useState('');
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const resolvedClinicId = clinicId || auth?.currentUser?.uid || '';

  useEffect(() => {
    loadData();
  }, [resolvedClinicId]);

  const loadData = async () => {
    if (!resolvedClinicId) return;
    setLoading(true);
    try {
      // Load clinic doc
      const clinicRef = doc(db, 'clinics', resolvedClinicId);
      const clinicSnap = await getDoc(clinicRef);
      if (!clinicSnap.exists()) return;

      const clinicData = clinicSnap.data();
      const locs: BranchLocation[] = clinicData.locations || [];
      setLocations(locs);
      setMasterEmail(clinicData.masterAccessEmail || '');

      // Extract doctors from linkedDoctorsDetails
      const linkedDoctors = (clinicData.linkedDoctorsDetails || []).map((d: any) => ({
        id: d.doctorId || d.uid,
        name: d.doctorName || d.name || 'Unknown',
        specialty: (d.specialties || d.specialty || [])[0] || '',
        locationId: d.locationId || '',
      })).filter((d: any) => d.id);
      setDoctors(linkedDoctors);

      // Extract unique specialties
      const specs = [...new Set(linkedDoctors.map((d: any) => d.specialty).filter(Boolean))] as string[];
      setSpecialties(specs);

      // Load ALL bookings for this clinic
      const bookingsRef = collection(db, 'bookings');
      const bookingsSnap = await getDocs(bookingsRef);
      const linkedDoctorIds = linkedDoctors.map((d: any) => d.id);

      const clinicBookings = bookingsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((b: any) => {
          const bDocId = b.doctorId || b.uid;
          return b.clinicId === resolvedClinicId || linkedDoctorIds.includes(bDocId);
        });
      setBookings(clinicBookings);
    } catch (err) {
      console.error('Error loading master access data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredBookings = useMemo(() => {
    return bookings.filter((b: any) => {
      // Location filter
      if (selectedLocation !== 'all') {
        const bLocationId = b.clinicLocationId || b.locationId || '';
        if (bLocationId !== selectedLocation) return false;
      }

      // Doctor filter
      if (selectedDoctor !== 'all') {
        const bDocId = b.doctorId || b.uid;
        if (bDocId !== selectedDoctor) return false;
      }

      // Specialty filter
      if (selectedSpecialty !== 'all') {
        const bDocId = b.doctorId || b.uid;
        const docInfo = doctors.find(d => d.id === bDocId);
        if (!docInfo || docInfo.specialty !== selectedSpecialty) return false;
      }

      // Date filter
      let bookingDate: string | null = null;
      try {
        if (b.appointmentDate) {
          bookingDate = b.appointmentDate;
        } else if (b.createdAt?.toDate) {
          bookingDate = b.createdAt.toDate().toISOString().split('T')[0];
        }
      } catch { /* skip */ }

      if (dateFrom && bookingDate && bookingDate < dateFrom) return false;
      if (dateTo && bookingDate && bookingDate > dateTo) return false;

      return true;
    });
  }, [bookings, selectedLocation, selectedDoctor, selectedSpecialty, dateFrom, dateTo, doctors]);

  // Compute metrics
  const metrics = useMemo(() => {
    let total = 0, qr = 0, walkin = 0, cancelled = 0;
    const ageGroups: Record<string, number> = { '0-18': 0, '19-30': 0, '31-45': 0, '46-60': 0, '60+': 0, 'NA': 0 };
    const genderCounts: Record<string, number> = { Male: 0, Female: 0, Other: 0, NA: 0 };
    const purposeCounts: Record<string, number> = {};
    const locationCounts: Record<string, number> = {};
    const doctorCounts: Record<string, number> = {};

    filteredBookings.forEach((b: any) => {
      const isCancelled = b.status === 'cancelled' || b.isCancelled === true;
      if (isCancelled) { cancelled++; return; }

      total++;

      // QR vs Walk-in
      const src = b.bookingSource;
      const isQR = src === 'clinic_qr' || src === 'doctor_qr' || (b.type === 'qr_booking' && !src);
      if (isQR) qr++; else walkin++;

      // Age
      try {
        const rawAge = decrypt(b.age_encrypted || b.age?.toString() || '');
        const age = parseInt(rawAge);
        if (!rawAge || isNaN(age) || age === 0) ageGroups['NA']++;
        else if (age <= 18) ageGroups['0-18']++;
        else if (age <= 30) ageGroups['19-30']++;
        else if (age <= 45) ageGroups['31-45']++;
        else if (age <= 60) ageGroups['46-60']++;
        else ageGroups['60+']++;
      } catch { ageGroups['NA']++; }

      // Gender
      try {
        const rawGender = decrypt(b.gender_encrypted || b.gender || '');
        if (!rawGender) genderCounts['NA']++;
        else {
          const g = rawGender.toLowerCase();
          if (g.startsWith('m')) genderCounts['Male']++;
          else if (g.startsWith('f')) genderCounts['Female']++;
          else if (g.startsWith('o')) genderCounts['Other']++;
          else genderCounts['NA']++;
        }
      } catch { genderCounts['NA']++; }

      // Purpose
      try {
        const rawPurpose = decrypt(b.purposeOfVisit_encrypted || b.purposeOfVisit || '');
        const p = rawPurpose || 'NA';
        purposeCounts[p] = (purposeCounts[p] || 0) + 1;
      } catch { purposeCounts['NA'] = (purposeCounts['NA'] || 0) + 1; }

      // Location breakdown
      const locId = b.clinicLocationId || b.locationId || 'Unknown';
      const locName = locations.find(l => l.id === locId)?.name || locId;
      locationCounts[locName] = (locationCounts[locName] || 0) + 1;

      // Doctor breakdown
      const docId = b.doctorId || b.uid || '';
      const docName = doctors.find(d => d.id === docId)?.name || 'Unknown';
      doctorCounts[docName] = (doctorCounts[docName] || 0) + 1;
    });

    return {
      total, qr, walkin, cancelled,
      ageGroups, genderCounts, purposeCounts,
      locationCounts, doctorCounts
    };
  }, [filteredBookings, locations, doctors]);

  // Chart data
  const bookingTypeData = useMemo(() => [
    { name: 'QR Booking', value: metrics.qr, color: '#10b981' },
    { name: 'Walk-in', value: metrics.walkin, color: '#3b82f6' },
  ], [metrics]);

  const ageChartData = useMemo(() =>
    Object.entries(metrics.ageGroups).filter(([k]) => k !== 'NA').map(([age, count]) => ({ age, count })),
  [metrics]);

  const genderChartData = useMemo(() => [
    { name: 'Male', value: metrics.genderCounts['Male'] || 0, color: '#10b981' },
    { name: 'Female', value: metrics.genderCounts['Female'] || 0, color: '#8b5cf6' },
    { name: 'Other', value: metrics.genderCounts['Other'] || 0, color: '#f59e0b' },
  ].filter(i => i.value > 0), [metrics]);

  const purposeChartData = useMemo(() =>
    Object.entries(metrics.purposeCounts).filter(([k]) => k !== 'NA').map(([purpose, count]) => ({ purpose, count })).sort((a, b) => b.count - a.count).slice(0, 8),
  [metrics]);

  const locationChartData = useMemo(() =>
    Object.entries(metrics.locationCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
  [metrics]);

  const doctorChartData = useMemo(() =>
    Object.entries(metrics.doctorCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
  [metrics]);

  // Filtered doctor list based on specialty/location
  const filteredDoctorOptions = useMemo(() => {
    let opts = doctors;
    if (selectedSpecialty !== 'all') opts = opts.filter(d => d.specialty === selectedSpecialty);
    if (selectedLocation !== 'all') opts = opts.filter(d => d.locationId === selectedLocation);
    return opts;
  }, [doctors, selectedSpecialty, selectedLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="ml-auto flex items-center gap-2 text-lg font-bold text-amber-400">
          <Crown className="w-5 h-5" />
          Master Access — Cross-Branch Analytics
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">

        {/* Master Access Email */}
        <div className="bg-zinc-900/50 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <Mail className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="text-xs text-zinc-400">Owner Email:</span>
          {editingEmail ? (
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white flex-1 outline-none focus:border-amber-500"
                placeholder="owner@email.com"
                autoFocus
                onKeyDown={async e => {
                  if (e.key === 'Enter' && emailInput.includes('@')) {
                    setSavingEmail(true);
                    const clinicRef = doc(db, 'clinics', resolvedClinicId);
                    await updateDoc(clinicRef, { masterAccessEmail: emailInput.trim().toLowerCase() });
                    setMasterEmail(emailInput.trim().toLowerCase());
                    setEditingEmail(false);
                    setSavingEmail(false);
                  }
                  if (e.key === 'Escape') setEditingEmail(false);
                }}
              />
              <button
                disabled={!emailInput.includes('@') || savingEmail}
                onClick={async () => {
                  setSavingEmail(true);
                  const clinicRef = doc(db, 'clinics', resolvedClinicId);
                  await updateDoc(clinicRef, { masterAccessEmail: emailInput.trim().toLowerCase() });
                  setMasterEmail(emailInput.trim().toLowerCase());
                  setEditingEmail(false);
                  setSavingEmail(false);
                }}
                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditingEmail(false)} className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <span className="text-sm text-amber-300 font-medium">{masterEmail || 'Not set'}</span>
              <button
                onClick={() => { setEmailInput(masterEmail); setEditingEmail(true); }}
                className="text-xs text-zinc-400 hover:text-amber-400 flex items-center gap-1 ml-auto"
              >
                <Pencil className="w-3 h-3" />
                {masterEmail ? 'Change' : 'Set Email'}
              </button>
            </>
          )}
        </div>

        {/* Filters Bar */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Filters</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Location */}
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="bg-black border-zinc-700 text-white h-10">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Specialty */}
            <Select value={selectedSpecialty} onValueChange={v => { setSelectedSpecialty(v); setSelectedDoctor('all'); }}>
              <SelectTrigger className="bg-black border-zinc-700 text-white h-10">
                <SelectValue placeholder="Specialty" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                <SelectItem value="all">All Specialties</SelectItem>
                {specialties.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Doctor */}
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger className="bg-black border-zinc-700 text-white h-10">
                <SelectValue placeholder="Doctor" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                <SelectItem value="all">All Doctors</SelectItem>
                {filteredDoctorOptions.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date From */}
            <Input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-black border-zinc-700 text-white h-10"
              placeholder="From"
            />

            {/* Date To */}
            <Input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-black border-zinc-700 text-white h-10"
              placeholder="To"
            />
          </div>

          {/* Quick reset */}
          {(selectedLocation !== 'all' || selectedSpecialty !== 'all' || selectedDoctor !== 'all' || dateFrom || dateTo) && (
            <div className="mt-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedLocation('all');
                  setSelectedSpecialty('all');
                  setSelectedDoctor('all');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-xs"
              >
                Reset Filters
              </Button>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-zinc-400">Total Bookings</span>
              </div>
              <p className="text-3xl font-bold text-white">{metrics.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-zinc-400">QR Bookings</span>
              </div>
              <p className="text-3xl font-bold text-emerald-400">{metrics.qr}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-zinc-400">Walk-in Bookings</span>
              </div>
              <p className="text-3xl font-bold text-blue-400">{metrics.walkin}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-red-400" />
                <span className="text-xs text-zinc-400">Cancelled</span>
              </div>
              <p className="text-3xl font-bold text-red-400">{metrics.cancelled}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1: Booking Type + Location Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* QR vs Walk-in Pie */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                QR Booking vs Walk-in
              </h3>
              {metrics.total > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={bookingTypeData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {bookingTypeData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-zinc-500 text-sm">No data</div>
              )}
            </CardContent>
          </Card>

          {/* Location Breakdown Bar */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                Bookings by Location
              </h3>
              {locationChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={locationChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#fff' }} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-zinc-500 text-sm">No data</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2: Age + Gender */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Age Distribution */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Age Distribution
              </h3>
              {ageChartData.some(d => d.count > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ageChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="age" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#fff' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-zinc-500 text-sm">No data</div>
              )}
            </CardContent>
          </Card>

          {/* Gender Pie */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Gender Distribution
              </h3>
              {genderChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={genderChartData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {genderChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-zinc-500 text-sm">No data</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 3: Purpose + Doctor Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Purpose of Visit */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Purpose of Visit
              </h3>
              {purposeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={purposeChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis type="number" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                    <YAxis type="category" dataKey="purpose" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#fff' }} />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-zinc-500 text-sm">No data</div>
              )}
            </CardContent>
          </Card>

          {/* Doctor-wise Bookings */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-blue-400" />
                Bookings by Doctor
              </h3>
              {doctorChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={doctorChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis type="number" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#fff' }} />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-zinc-500 text-sm">No data</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary Table */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-white mb-4">Branch Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left">
                    <th className="py-2 pr-4 text-white font-medium">Branch</th>
                    <th className="py-2 pr-4 text-white font-medium text-right">Bookings</th>
                    <th className="py-2 pr-4 text-white font-medium text-right">QR</th>
                    <th className="py-2 pr-4 text-white font-medium text-right">Walk-in</th>
                    <th className="py-2 text-white font-medium text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map(loc => {
                    const locBookings = filteredBookings.filter((b: any) => (b.clinicLocationId || b.locationId || '') === loc.id);
                    const nonCancelled = locBookings.filter((b: any) => b.status !== 'cancelled' && !b.isCancelled);
                    const qrCount = nonCancelled.filter((b: any) => {
                      const src = b.bookingSource;
                      return src === 'clinic_qr' || src === 'doctor_qr' || (b.type === 'qr_booking' && !src);
                    }).length;
                    const walkinCount = nonCancelled.length - qrCount;
                    const share = metrics.total > 0 ? ((nonCancelled.length / metrics.total) * 100).toFixed(1) : '0.0';

                    return (
                      <tr key={loc.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-amber-400" />
                            <span className="text-white">{loc.name}</span>
                            <span className="text-xs text-amber-400 font-mono">#{loc.id}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-right text-white font-medium">{nonCancelled.length}</td>
                        <td className="py-2.5 pr-4 text-right text-emerald-400">{qrCount}</td>
                        <td className="py-2.5 pr-4 text-right text-blue-400">{walkinCount}</td>
                        <td className="py-2.5 text-right text-white">{share}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Health Tip / Ad Card */}
        <DashboardPromoDisplay category="health-tip" placement="master-access" className="mt-4" />

      </div>
    </div>
  );
}
