import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import {
  Crown, ArrowLeft, Building2, Users, QrCode, UserPlus, TrendingUp,
  Calendar, Filter, BarChart3, MapPin, Stethoscope, Loader2, Mail, Pencil, Check, X,
  Plus, Trash2, Eye, Edit, Copy, XCircle, CheckCircle, Hash, Shield, LogOut
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { auth, db } from '../lib/firebase/config';
import { doc, getDoc, collection, getDocs, updateDoc, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { decrypt } from '../utils/encryptionService';
import { generateClinicLocationCode } from '../utils/idGenerator';
import { toast } from 'sonner';
import DashboardPromoDisplay from './DashboardPromoDisplay';

type MasterTab = 'analytics' | 'branches' | 'assistants';

interface MasterAccessProps {
  onBack: () => void;
  clinicId?: string;
}

interface BranchLocation {
  id: string;
  name: string;
  landmark?: string;
  pinCode?: string;
  email?: string;
  clinicCode?: string;
}

interface AssistantData {
  id: string;
  assistantName: string;
  assistantEmail: string;
  isActive: boolean;
  allowedPages: string[];
  createdAt: Date;
  lastLoginAt?: Date;
  accessToken?: string;
  accessPin?: string;
  isClinic?: boolean;
  locationId?: string;
  parentClinicId?: string;
  doctorId: string;
}

const CHART_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

// Available pages for clinic assistants
const ASSISTANT_PAGES = [
  { id: 'doctors', label: 'Manage Doctors', icon: '👥' },
  { id: 'profile', label: 'Clinic Profile', icon: '🏢' },
  { id: 'qr-manager', label: 'QR Manager', icon: '📱' },
  { id: 'schedule-manager', label: 'Schedule Manager', icon: '📅' },
  { id: 'todays-schedule', label: "Today's Schedule", icon: '🗓️' },
  { id: 'advance-booking', label: 'Advance Booking', icon: '📆' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'reports', label: 'Reports', icon: '📄' },
  { id: 'social-kit', label: 'Social Kit & Offers', icon: '📣' },
  { id: 'monthly-planner', label: 'Monthly Planner', icon: '🗓️' },
  { id: 'lab-referral', label: 'Lab Referral Tracking', icon: '🔬' },
  { id: 'ai-diet', label: 'AI Diet Chart (History)', icon: '🍎' },
  { id: 'ai-rx', label: 'AI RX Reader (History)', icon: '🤖' },
  { id: 'video-consult', label: 'Video Consultation (History)', icon: '🎥' },
  { id: 'emergency', label: 'Emergency Button', icon: '🚨' },
];

export default function ClinicMasterAccess({ onBack, clinicId }: MasterAccessProps) {
  const [activeTab, setActiveTab] = useState<MasterTab>('analytics');
  const [loading, setLoading] = useState(true);
  const [clinicData, setClinicData] = useState<any>(null);
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

  // Branch Management
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchLocation | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchLandmark, setBranchLandmark] = useState('');
  const [branchPinCode, setBranchPinCode] = useState('');
  const [branchEmail, setBranchEmail] = useState('');
  const [savingBranch, setSavingBranch] = useState(false);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);

  // Assistant Management
  const [allAssistants, setAllAssistants] = useState<AssistantData[]>([]);
  const [assistantsLoading, setAssistantsLoading] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<AssistantData | null>(null);
  const [editSelectedPages, setEditSelectedPages] = useState<string[]>([]);

  const resolvedClinicId = clinicId || auth?.currentUser?.uid || '';

  useEffect(() => {
    loadData();
  }, [resolvedClinicId]);

  // Load assistants when switching to assistants tab
  useEffect(() => {
    if (activeTab === 'assistants' && resolvedClinicId) {
      loadAllAssistants();
    }
  }, [activeTab, resolvedClinicId]);

  const loadData = async () => {
    if (!resolvedClinicId) return;
    setLoading(true);
    try {
      // Load clinic doc
      const clinicRef = doc(db, 'clinics', resolvedClinicId);
      const clinicSnap = await getDoc(clinicRef);
      if (!clinicSnap.exists()) return;

      const cData = clinicSnap.data();
      setClinicData(cData);
      const locs: BranchLocation[] = cData.locations || [];
      setLocations(locs);
      setMasterEmail(cData.masterAccessEmail || '');

      // Extract doctors from linkedDoctorsDetails
      const linkedDoctors = (cData.linkedDoctorsDetails || []).map((d: any) => ({
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

  // ═══════════════════════════════════════════════
  // BRANCH MANAGEMENT
  // ═══════════════════════════════════════════════

  const saveBranchLocations = async (updatedLocations: BranchLocation[]) => {
    setSavingBranch(true);
    try {
      const clinicRef = doc(db, 'clinics', resolvedClinicId);
      const locationEmails = updatedLocations
        .filter(l => l.email)
        .map(l => l.email!.toLowerCase());
      await updateDoc(clinicRef, {
        locations: updatedLocations,
        locationEmails,
        updatedAt: serverTimestamp(),
      });
      setLocations(updatedLocations);
      toast.success('Branches updated');
    } catch (err) {
      console.error('Error saving branches:', err);
      toast.error('Failed to save branches');
    } finally {
      setSavingBranch(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!branchName.trim() || !branchLandmark.trim() || !branchPinCode.trim() || !branchEmail.trim()) {
      toast.error('All fields are required');
      return;
    }
    if (!/^\d{6}$/.test(branchPinCode)) {
      toast.error('Pincode must be 6 digits');
      return;
    }
    if (!branchEmail.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }

    const existingIds = locations.map(l => parseInt(l.id) || 0);
    const maxId = Math.max(...existingIds, 1);
    const nextId = (maxId + 1).toString().padStart(3, '0');
    const branchClinicCode = clinicData?.clinicCode
      ? generateClinicLocationCode(clinicData.clinicCode, nextId)
      : '';

    const newBranch: BranchLocation = {
      id: nextId,
      name: branchName.trim(),
      landmark: branchLandmark.trim(),
      pinCode: branchPinCode.trim(),
      email: branchEmail.trim().toLowerCase(),
      clinicCode: branchClinicCode,
    };

    await saveBranchLocations([...locations, newBranch]);
    resetBranchForm();
    toast.success(`Branch "${newBranch.name}" created`);
  };

  const handleEditBranch = async () => {
    if (!editingBranch) return;
    if (!branchName.trim() || !branchLandmark.trim()) {
      toast.error('Name and Landmark are required');
      return;
    }
    if (branchEmail && !branchEmail.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }

    const updated = locations.map(l =>
      l.id === editingBranch.id
        ? {
            ...l,
            name: branchName.trim(),
            landmark: branchLandmark.trim(),
            pinCode: branchPinCode.trim() || l.pinCode,
            email: branchEmail.trim().toLowerCase() || l.email,
          }
        : l
    );
    await saveBranchLocations(updated);
    resetBranchForm();
    toast.success('Branch updated');
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (branchId === '001') {
      toast.error('Cannot delete main branch');
      return;
    }
    const updated = locations.filter(l => l.id !== branchId);
    await saveBranchLocations(updated);
    setDeletingBranchId(null);
    toast.success('Branch deleted');
  };

  const startEditBranch = (branch: BranchLocation) => {
    setEditingBranch(branch);
    setBranchName(branch.name);
    setBranchLandmark(branch.landmark || '');
    setBranchPinCode(branch.pinCode || '');
    setBranchEmail(branch.email || '');
    setShowBranchForm(false);
  };

  const resetBranchForm = () => {
    setShowBranchForm(false);
    setEditingBranch(null);
    setBranchName('');
    setBranchLandmark('');
    setBranchPinCode('');
    setBranchEmail('');
  };

  // ═══════════════════════════════════════════════
  // ASSISTANT MANAGEMENT
  // ═══════════════════════════════════════════════

  const loadAllAssistants = async () => {
    if (!resolvedClinicId || !db) return;
    setAssistantsLoading(true);
    try {
      // Load assistants where doctorId = clinicId (main clinic assistants)
      const assistantsRef = collection(db, 'assistants');
      const mainQ = query(assistantsRef, where('doctorId', '==', resolvedClinicId));
      const mainSnap = await getDocs(mainQ);

      // Also load assistants where parentClinicId = clinicId (branch assistants)
      const branchQ = query(assistantsRef, where('parentClinicId', '==', resolvedClinicId));
      const branchSnap = await getDocs(branchQ);

      // Merge unique (some may overlap)
      const seen = new Set<string>();
      const all: AssistantData[] = [];

      const processDoc = (d: any) => {
        if (seen.has(d.id)) return;
        seen.add(d.id);
        const data = d.data();
        if (!data.isActive) return;
        all.push({
          id: d.id,
          assistantName: data.assistantName || '',
          assistantEmail: data.assistantEmail || '',
          isActive: data.isActive ?? true,
          allowedPages: data.allowedPages || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate(),
          accessToken: data.accessToken,
          accessPin: data.accessPin,
          isClinic: data.isClinic,
          locationId: data.locationId || '',
          parentClinicId: data.parentClinicId || '',
          doctorId: data.doctorId || '',
        });
      };

      mainSnap.docs.forEach(processDoc);
      branchSnap.docs.forEach(processDoc);

      setAllAssistants(all);
    } catch (err) {
      console.error('Error loading assistants:', err);
      toast.error('Failed to load assistants');
    } finally {
      setAssistantsLoading(false);
    }
  };

  const getBranchName = (assistant: AssistantData): string => {
    if (assistant.locationId) {
      const loc = locations.find(l => l.id === assistant.locationId);
      return loc ? `${loc.name} (#${loc.id})` : `Branch #${assistant.locationId}`;
    }
    // If doctorId matches clinic and no locationId, it's main branch
    if (assistant.doctorId === resolvedClinicId && !assistant.parentClinicId) {
      const mainLoc = locations.find(l => l.id === '001');
      return mainLoc ? `${mainLoc.name} (Main)` : 'Main Branch';
    }
    return 'Main Branch';
  };

  const handleDeleteAssistant = async (assistantId: string, name: string) => {
    if (!db) return;
    if (!window.confirm(`Permanently delete assistant "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'assistants', assistantId));
      toast.success('Assistant deleted');
      loadAllAssistants();
    } catch (err) {
      console.error('Error deleting assistant:', err);
      toast.error('Failed to delete');
    }
  };

  const handleDeactivateAssistant = async (assistantId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'assistants', assistantId), {
        isActive: false,
        deactivatedAt: serverTimestamp(),
      });
      toast.success('Assistant deactivated');
      loadAllAssistants();
    } catch (err) {
      console.error('Error deactivating assistant:', err);
      toast.error('Failed to deactivate');
    }
  };

  const openEditAssistant = (assistant: AssistantData) => {
    setEditingAssistant(assistant);
    setEditSelectedPages(assistant.allowedPages);
  };

  const saveEditedAssistantPages = async () => {
    if (!db || !editingAssistant) return;
    try {
      await updateDoc(doc(db, 'assistants', editingAssistant.id), {
        allowedPages: editSelectedPages,
      });
      toast.success('Permissions updated');
      setEditingAssistant(null);
      loadAllAssistants();
    } catch (err) {
      console.error('Error updating pages:', err);
      toast.error('Failed to update');
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
          Master Access
        </div>
        <button
          onClick={() => { if (window.confirm('Logout from Master Access?')) { window.location.href = '/'; } }}
          className="ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/40 transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-[53px] z-20 bg-black border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 flex" style={{ gap: '24px' }}>
          {([
            { id: 'analytics' as MasterTab, label: 'Analytics', icon: BarChart3 },
            { id: 'branches' as MasterTab, label: 'Branches', icon: Building2 },
            { id: 'assistants' as MasterTab, label: 'Assistants', icon: Users },
          ]).map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 cursor-pointer select-none font-semibold border-b-2 ${
                activeTab === tab.id
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-white border-transparent hover:text-emerald-300'
              }`}
              style={{ fontSize: '15px' }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'branches' && (
                <span className="text-xs font-bold bg-emerald-500 text-white px-2.5 py-0.5 rounded-full">{locations.length}</span>
              )}
              {tab.id === 'assistants' && allAssistants.length > 0 && (
                <span className="text-xs font-bold bg-emerald-500 text-white px-2.5 py-0.5 rounded-full">{allAssistants.length}</span>
              )}
            </div>
          ))}
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

        {/* ═══════════════ ANALYTICS TAB ═══════════════ */}
        {activeTab === 'analytics' && (
          <>
            {/* Filters Bar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Filters</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-black border-zinc-700 text-white h-10" />
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-black border-zinc-700 text-white h-10" />
              </div>
              {(selectedLocation !== 'all' || selectedSpecialty !== 'all' || selectedDoctor !== 'all' || dateFrom || dateTo) && (
                <div className="mt-3 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => { setSelectedLocation('all'); setSelectedSpecialty('all'); setSelectedDoctor('all'); setDateFrom(''); setDateTo(''); }} className="text-xs">
                    Reset Filters
                  </Button>
                </div>
              )}
            </div>

            <DashboardPromoDisplay category="health-tip" placement="master-access" />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-emerald-400" /><span className="text-xs text-zinc-400">Total Bookings</span></div><p className="text-3xl font-bold text-white">{metrics.total}</p></CardContent></Card>
              <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><QrCode className="w-4 h-4 text-emerald-400" /><span className="text-xs text-zinc-400">QR Bookings</span></div><p className="text-3xl font-bold text-emerald-400">{metrics.qr}</p></CardContent></Card>
              <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><UserPlus className="w-4 h-4 text-blue-400" /><span className="text-xs text-zinc-400">Walk-in Bookings</span></div><p className="text-3xl font-bold text-blue-400">{metrics.walkin}</p></CardContent></Card>
              <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-red-400" /><span className="text-xs text-zinc-400">Cancelled</span></div><p className="text-3xl font-bold text-red-400">{metrics.cancelled}</p></CardContent></Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-6"><h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><QrCode className="w-4 h-4 text-emerald-400" />QR Booking vs Walk-in</h3>{metrics.total > 0 ? (<ResponsiveContainer width="100%" height={220}><PieChart><Pie data={bookingTypeData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>{bookingTypeData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}</Pie><Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#fff' }} /></PieChart></ResponsiveContainer>) : (<div className="h-[220px] flex items-center justify-center text-zinc-500 text-sm">No data</div>)}</CardContent></Card>
              <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-6"><h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-amber-400" />Bookings by Location</h3>{locationChartData.length > 0 ? (<ResponsiveContainer width="100%" height={220}><BarChart data={locationChartData}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} /><YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} /><Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#fff' }} /><Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>) : (<div className="h-[220px] flex items-center justify-center text-zinc-500 text-sm">No data</div>)}</CardContent></Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-6"><h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-400" />Age Distribution</h3>{ageChartData.some(d => d.count > 0) ? (<ResponsiveContainer width="100%" height={220}><BarChart data={ageChartData}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="age" tick={{ fill: '#a1a1aa', fontSize: 11 }} /><YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} /><Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#fff' }} /><Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>) : (<div className="h-[220px] flex items-center justify-center text-zinc-500 text-sm">No data</div>)}</CardContent></Card>
              <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-6"><h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-purple-400" />Gender Distribution</h3>{genderChartData.length > 0 ? (<ResponsiveContainer width="100%" height={220}><PieChart><Pie data={genderChartData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>{genderChartData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}</Pie><Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#fff' }} /></PieChart></ResponsiveContainer>) : (<div className="h-[220px] flex items-center justify-center text-zinc-500 text-sm">No data</div>)}</CardContent></Card>
            </div>

            {/* Charts Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-6"><h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-400" />Purpose of Visit</h3>{purposeChartData.length > 0 ? (<ResponsiveContainer width="100%" height={220}><BarChart data={purposeChartData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis type="number" tick={{ fill: '#a1a1aa', fontSize: 11 }} /><YAxis type="category" dataKey="purpose" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={100} /><Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#fff' }} /><Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>) : (<div className="h-[220px] flex items-center justify-center text-zinc-500 text-sm">No data</div>)}</CardContent></Card>
              <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-6"><h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Stethoscope className="w-4 h-4 text-blue-400" />Bookings by Doctor</h3>{doctorChartData.length > 0 ? (<ResponsiveContainer width="100%" height={220}><BarChart data={doctorChartData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis type="number" tick={{ fill: '#a1a1aa', fontSize: 11 }} /><YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={100} /><Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#fff' }} /><Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>) : (<div className="h-[220px] flex items-center justify-center text-zinc-500 text-sm">No data</div>)}</CardContent></Card>
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
                        const qrCount = nonCancelled.filter((b: any) => { const src = b.bookingSource; return src === 'clinic_qr' || src === 'doctor_qr' || (b.type === 'qr_booking' && !src); }).length;
                        const walkinCount = nonCancelled.length - qrCount;
                        const share = metrics.total > 0 ? ((nonCancelled.length / metrics.total) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={loc.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                            <td className="py-2.5 pr-4"><div className="flex items-center gap-2"><MapPin className="w-3 h-3 text-amber-400" /><span className="text-white">{loc.name}</span><span className="text-xs text-amber-400 font-mono">#{loc.id}</span></div></td>
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
          </>
        )}

        {/* ═══════════════ BRANCHES TAB ═══════════════ */}
        {activeTab === 'branches' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Branch Locations</h2>
                <p className="text-sm text-zinc-400 mt-1">Manage all branches including main clinic</p>
              </div>
              <Button
                onClick={() => { resetBranchForm(); setShowBranchForm(true); }}
                className="bg-amber-600 hover:bg-amber-500"
              >
                <Plus className="w-4 h-4 mr-2" /> Create Branch
              </Button>
            </div>

            {/* Create / Edit Branch Form */}
            {(showBranchForm || editingBranch) && (
              <Card className="bg-zinc-900 border-amber-500/30">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{editingBranch ? `Edit Branch: ${editingBranch.name}` : 'New Branch'}</h3>
                    <button onClick={resetBranchForm} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Branch Name *</Label>
                      <Input value={branchName} onChange={e => setBranchName(e.target.value)} placeholder="e.g. ADITRI HEALTH ZONE" className="bg-zinc-800 border-zinc-700" />
                    </div>
                    <div className="space-y-2">
                      <Label>Landmark / Address *</Label>
                      <Input value={branchLandmark} onChange={e => setBranchLandmark(e.target.value)} placeholder="e.g. Baksara Bazar, Howrah" className="bg-zinc-800 border-zinc-700" />
                    </div>
                    <div className="space-y-2">
                      <Label>Pin Code {!editingBranch && '*'}</Label>
                      <Input value={branchPinCode} onChange={e => setBranchPinCode(e.target.value)} placeholder="6-digit pincode" maxLength={6} className="bg-zinc-800 border-zinc-700" />
                    </div>
                    <div className="space-y-2">
                      <Label>Location Manager Email {!editingBranch && '*'}</Label>
                      <Input value={branchEmail} onChange={e => setBranchEmail(e.target.value)} placeholder="manager@clinic.com" type="email" className="bg-zinc-800 border-zinc-700" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button onClick={editingBranch ? handleEditBranch : handleCreateBranch} disabled={savingBranch} className="bg-amber-600 hover:bg-amber-500">
                      {savingBranch ? 'Saving...' : editingBranch ? 'Update Branch' : 'Create Branch'}
                    </Button>
                    <Button variant="outline" onClick={resetBranchForm}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Branch List */}
            <div className="space-y-4">
              {locations.map(branch => (
                <Card key={branch.id} className={`bg-zinc-900 ${branch.id === '001' ? 'border-emerald-500/40' : 'border-zinc-800'}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-4 h-4 text-amber-400" />
                          <h3 className="font-bold text-lg">{branch.name}</h3>
                          {branch.id === '001' ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Main</Badge>
                          ) : (
                            <span className="text-xs text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded">#{branch.id}</span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                          {branch.landmark && (
                            <div>
                              <span className="text-zinc-500 text-xs">Location</span>
                              <p className="text-zinc-300 flex items-center gap-1"><MapPin className="w-3 h-3 text-emerald-400" />{branch.landmark}</p>
                            </div>
                          )}
                          {branch.email && (
                            <div>
                              <span className="text-zinc-500 text-xs">Manager Email</span>
                              <p className="text-zinc-300 flex items-center gap-1"><Mail className="w-3 h-3 text-blue-400" />{branch.email}</p>
                            </div>
                          )}
                          {branch.pinCode && (
                            <div>
                              <span className="text-zinc-500 text-xs">Pin Code</span>
                              <p className="text-zinc-300">{branch.pinCode}</p>
                            </div>
                          )}
                          {branch.clinicCode && (
                            <div>
                              <span className="text-zinc-500 text-xs">Clinic Code</span>
                              <p className="text-zinc-300 flex items-center gap-1 font-mono text-xs">
                                <Hash className="w-3 h-3 text-amber-400" />{branch.clinicCode}
                                <button onClick={() => { navigator.clipboard.writeText(branch.clinicCode || ''); toast.success('Code copied'); }} className="text-zinc-500 hover:text-amber-400"><Copy className="w-3 h-3" /></button>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => startEditBranch(branch)} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {branch.id !== '001' && (
                          <>
                            {deletingBranchId === branch.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleDeleteBranch(branch.id)} className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs" disabled={savingBranch}>Confirm</button>
                                <button onClick={() => setDeletingBranchId(null)} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400"><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <button onClick={() => setDeletingBranchId(branch.id)} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {locations.length === 0 && (
                <div className="text-center py-12 text-zinc-500">No branches found</div>
              )}
            </div>
          </>
        )}

        {/* ═══════════════ ASSISTANTS TAB ═══════════════ */}
        {activeTab === 'assistants' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">All Assistants</h2>
                <p className="text-sm text-zinc-400 mt-1">Manage assistants across all branches</p>
              </div>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                {allAssistants.length} Active
              </Badge>
            </div>

            {assistantsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              </div>
            ) : allAssistants.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400">No active assistants found across any branch</p>
                  <p className="text-xs text-zinc-600 mt-1">Assistants can be created from each branch's dashboard</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {allAssistants.map(assistant => (
                  <Card key={assistant.id} className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg">{assistant.assistantName}</h3>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Active</Badge>
                          </div>
                          <p className="text-sm text-zinc-400 mb-3">{assistant.assistantEmail}</p>

                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full">
                              <Building2 className="w-3 h-3" />
                              {getBranchName(assistant)}
                            </span>
                            <span className="flex items-center gap-1 text-zinc-400">
                              <Eye className="w-3 h-3 text-blue-400" />
                              {assistant.allowedPages.length} pages
                            </span>
                            {assistant.lastLoginAt && (
                              <span className="text-zinc-500">
                                Last login: {assistant.lastLoginAt.toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {/* Show access token and PIN */}
                          {assistant.accessToken && (
                            <div className="mt-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 flex flex-wrap items-center gap-4">
                              <div className="flex-1 min-w-[200px]">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Login Link</p>
                                <p className="text-xs text-zinc-400 truncate">{`${window.location.origin}/assistant-login?token=${assistant.accessToken}`}</p>
                              </div>
                              <button
                                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/assistant-login?token=${assistant.accessToken}`); toast.success('Link copied'); }}
                                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" /> Copy Link
                              </button>
                              {assistant.accessPin && (
                                <>
                                  <div>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">PIN</p>
                                    <p className="text-sm font-mono font-bold text-emerald-400 tracking-widest">{assistant.accessPin}</p>
                                  </div>
                                  <button
                                    onClick={() => { navigator.clipboard.writeText(assistant.accessPin!); toast.success('PIN copied'); }}
                                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                                  >
                                    <Copy className="w-3 h-3" /> Copy PIN
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => openEditAssistant(assistant)} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 transition-colors" title="Edit Permissions">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeactivateAssistant(assistant.id)} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-orange-400 transition-colors" title="Deactivate">
                            <XCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteAssistant(assistant.id, assistant.assistantName)} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

      </div>

      {/* ═══════════ EDIT ASSISTANT PERMISSIONS MODAL ═══════════ */}
      {editingAssistant && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <h2 className="text-xl font-bold">Edit Permissions</h2>
                <button onClick={() => setEditingAssistant(null)} className="p-2 hover:bg-zinc-800 rounded-full"><X className="w-5 h-5 text-zinc-400" /></button>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Updating access for <strong className="text-white">{editingAssistant.assistantName}</strong></p>
                <p className="text-xs text-amber-400 mt-1">{getBranchName(editingAssistant)}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ASSISTANT_PAGES.map(page => (
                  <div
                    key={page.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      editSelectedPages.includes(page.id)
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                    }`}
                    onClick={() => {
                      setEditSelectedPages(prev =>
                        prev.includes(page.id) ? prev.filter(p => p !== page.id) : [...prev, page.id]
                      );
                    }}
                  >
                    <Checkbox checked={editSelectedPages.includes(page.id)} onCheckedChange={() => {}} className="pointer-events-none" />
                    <span className="text-xl">{page.icon}</span>
                    <span className="text-sm font-medium">{page.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 pt-4 border-t border-zinc-800">
                <Button onClick={() => setEditingAssistant(null)} variant="outline" className="flex-1">Cancel</Button>
                <Button onClick={saveEditedAssistantPages} className="flex-1 bg-amber-600 hover:bg-amber-500">Update Permissions</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
