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
  Plus, Trash2, Eye, Edit, Copy, XCircle, CheckCircle, Hash, Shield, LogOut, Menu,
  IndianRupee, Clock, FileText, Package, Target, ChevronLeft, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { auth, db } from '../lib/firebase/config';
import { doc, getDoc, collection, getDocs, updateDoc, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { decrypt } from '../utils/encryptionService';
import { generateClinicLocationCode } from '../utils/idGenerator';
import { toast } from 'sonner';
import DashboardPromoDisplay from './DashboardPromoDisplay';
import MasterAccessSidebar from './MasterAccessSidebar';

type MasterMenu = 'dashboard' | 'analytics' | 'todays-overview' | 'revenue' | 'billing' | 'inventory' | 'retention' | 'branches' | 'assistants';

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
  const [activeMenu, setActiveMenu] = useState<MasterMenu>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Revenue
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueDate, setRevenueDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  });
  const [revenueViewMode, setRevenueViewMode] = useState<'daily' | 'monthly'>('daily');
  const [revenueDailyData, setRevenueDailyData] = useState<{
    branchName: string; branchId: string; patientCredit: number; manualCredit: number; debit: number; patients: number;
  }[]>([]);
  const [revenueMonthlyData, setRevenueMonthlyData] = useState<{
    date: string; credit: number; debit: number; patients: number;
  }[]>([]);

  // Today's Overview
  const [todayLoading, setTodayLoading] = useState(false);
  const [todayData, setTodayData] = useState<{
    branchName: string; branchId: string; total: number; seen: number; pending: number; cancelled: number; qr: number; walkin: number;
  }[]>([]);

  // Billing
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingReceipts, setBillingReceipts] = useState<{
    id: string; receiptNo: string; patientName: string; phone: string; totalAmount: number; paymentMethod: string; date: string; createdAt: any;
  }[]>([]);

  // Inventory
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<{
    id: string; name: string; category: string; quantity: number; unit: string; minStock: number; expiryDate: string;
  }[]>([]);

  // Retention
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [retentionData, setRetentionData] = useState<{
    branchName: string; branchId: string; totalPatients: number; returningPatients: number; retentionRate: number;
  }[]>([]);

  const resolvedClinicId = clinicId || auth?.currentUser?.uid || '';

  useEffect(() => {
    loadData();
  }, [resolvedClinicId]);

  // Load assistants when switching to assistants tab
  useEffect(() => {
    if (activeMenu === 'assistants' && resolvedClinicId) {
      loadAllAssistants();
    }
  }, [activeMenu, resolvedClinicId]);

  // Load revenue when switching to revenue tab or date changes
  useEffect(() => {
    if (activeMenu === 'revenue' && resolvedClinicId) {
      if (revenueViewMode === 'daily') loadRevenueDailyData();
      else loadRevenueMonthlyData();
    }
  }, [activeMenu, resolvedClinicId, revenueDate, revenueViewMode]);

  // Load today's overview when switching to that tab
  useEffect(() => {
    if (activeMenu === 'todays-overview' && resolvedClinicId) {
      loadTodayOverview();
    }
  }, [activeMenu, resolvedClinicId]);

  // Load billing receipts
  useEffect(() => {
    if (activeMenu === 'billing' && resolvedClinicId) {
      loadBillingReceipts();
    }
  }, [activeMenu, resolvedClinicId]);

  // Load inventory
  useEffect(() => {
    if (activeMenu === 'inventory' && resolvedClinicId) {
      loadInventoryItems();
    }
  }, [activeMenu, resolvedClinicId]);

  // Load retention
  useEffect(() => {
    if (activeMenu === 'retention' && resolvedClinicId) {
      loadRetentionData();
    }
  }, [activeMenu, resolvedClinicId]);

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

  // ═══════════════════════════════════════════════
  // REVENUE DATA LOADING
  // ═══════════════════════════════════════════════

  const loadRevenueDailyData = async () => {
    if (!resolvedClinicId || !db) return;
    setRevenueLoading(true);
    try {
      // Load bookings for selected date across all clinic doctors
      const bookingsRef = collection(db, 'bookings');
      const bq = query(bookingsRef, where('clinicId', '==', resolvedClinicId), where('appointmentDate', '==', revenueDate));
      let bSnap;
      try { bSnap = await getDocs(bq); } catch { bSnap = { docs: [] }; }

      // Load manual entries
      const entriesRef = collection(db, 'clinics', resolvedClinicId, 'revenueEntries');
      const eq = query(entriesRef, where('date', '==', revenueDate));
      let eSnap;
      try { eSnap = await getDocs(eq); } catch { eSnap = { docs: [] }; }

      // Aggregate by branch
      const branchMap = new Map<string, { patientCredit: number; manualCredit: number; debit: number; patients: number }>();
      locations.forEach(loc => branchMap.set(loc.id, { patientCredit: 0, manualCredit: 0, debit: 0, patients: 0 }));

      (bSnap.docs || []).forEach((d: any) => {
        const data = d.data();
        if (data.status === 'cancelled' || data.isCancelled) return;
        const isSeen = data.isMarkedSeen || data.consultationCompleted || data.eyeIconPressed || data.status === 'completed';
        if (!isSeen) return;
        const locId = data.clinicLocationId || data.locationId || '001';
        if (!branchMap.has(locId)) branchMap.set(locId, { patientCredit: 0, manualCredit: 0, debit: 0, patients: 0 });
        const b = branchMap.get(locId)!;
        b.patientCredit += data.consultationFee || 0;
        b.patients++;
      });

      (eSnap.docs || []).forEach((d: any) => {
        const data = d.data();
        const locId = data.locationId || '001';
        if (!branchMap.has(locId)) branchMap.set(locId, { patientCredit: 0, manualCredit: 0, debit: 0, patients: 0 });
        const b = branchMap.get(locId)!;
        if (data.type === 'credit') b.manualCredit += data.amount || 0;
        else b.debit += data.amount || 0;
      });

      const result = Array.from(branchMap.entries()).map(([branchId, d]) => ({
        branchId,
        branchName: locations.find(l => l.id === branchId)?.name || `Branch #${branchId}`,
        ...d,
      }));
      setRevenueDailyData(result);
    } catch (err) {
      console.error('Revenue daily load error:', err);
    } finally {
      setRevenueLoading(false);
    }
  };

  const loadRevenueMonthlyData = async () => {
    if (!resolvedClinicId || !db) return;
    setRevenueLoading(true);
    try {
      const d = new Date(revenueDate);
      const year = d.getFullYear();
      const month = d.getMonth();
      const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDayDate = new Date(year, month + 1, 0);
      const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

      const bookingsRef = collection(db, 'bookings');
      let bDocs: any[] = [];
      try {
        const bq = query(bookingsRef, where('clinicId', '==', resolvedClinicId), where('appointmentDate', '>=', firstDay), where('appointmentDate', '<=', lastDay));
        const snap = await getDocs(bq);
        bDocs = snap.docs;
      } catch {
        const fallbackQ = query(bookingsRef, where('clinicId', '==', resolvedClinicId));
        const allSnap = await getDocs(fallbackQ);
        bDocs = allSnap.docs.filter(d => { const ad = d.data().appointmentDate; return ad >= firstDay && ad <= lastDay; });
      }

      const dayMap = new Map<string, { credit: number; debit: number; patients: number }>();

      bDocs.forEach(d => {
        const data = d.data();
        if (data.status === 'cancelled' || data.isCancelled) return;
        const isSeen = data.isMarkedSeen || data.consultationCompleted || data.eyeIconPressed || data.status === 'completed';
        if (!isSeen) return;
        const date = data.appointmentDate;
        if (!dayMap.has(date)) dayMap.set(date, { credit: 0, debit: 0, patients: 0 });
        const day = dayMap.get(date)!;
        day.credit += data.consultationFee || 0;
        day.patients++;
      });

      const entriesRef = collection(db, 'clinics', resolvedClinicId, 'revenueEntries');
      const eSnap = await getDocs(entriesRef);
      eSnap.docs.forEach(d => {
        const data = d.data();
        if (data.date < firstDay || data.date > lastDay) return;
        if (!dayMap.has(data.date)) dayMap.set(data.date, { credit: 0, debit: 0, patients: 0 });
        const day = dayMap.get(data.date)!;
        if (data.type === 'credit') day.credit += data.amount || 0;
        else day.debit += data.amount || 0;
      });

      const sorted = Array.from(dayMap.entries()).map(([date, d]) => ({ date, ...d })).sort((a, b) => a.date.localeCompare(b.date));
      setRevenueMonthlyData(sorted);
    } catch (err) {
      console.error('Revenue monthly load error:', err);
    } finally {
      setRevenueLoading(false);
    }
  };

  // ═══════════════════════════════════════════════
  // TODAY'S OVERVIEW LOADING
  // ═══════════════════════════════════════════════

  const loadTodayOverview = async () => {
    if (!resolvedClinicId || !db) return;
    setTodayLoading(true);
    try {
      const today = new Date();
      const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

      const bookingsRef = collection(db, 'bookings');
      const bq = query(bookingsRef, where('clinicId', '==', resolvedClinicId), where('appointmentDate', '==', todayStr));
      let bSnap;
      try { bSnap = await getDocs(bq); } catch { bSnap = { docs: [] }; }

      const branchMap = new Map<string, { total: number; seen: number; pending: number; cancelled: number; qr: number; walkin: number }>();
      locations.forEach(loc => branchMap.set(loc.id, { total: 0, seen: 0, pending: 0, cancelled: 0, qr: 0, walkin: 0 }));

      (bSnap.docs || []).forEach((d: any) => {
        const data = d.data();
        const locId = data.clinicLocationId || data.locationId || '001';
        if (!branchMap.has(locId)) branchMap.set(locId, { total: 0, seen: 0, pending: 0, cancelled: 0, qr: 0, walkin: 0 });
        const b = branchMap.get(locId)!;
        b.total++;

        const isCancelled = data.status === 'cancelled' || data.isCancelled === true;
        if (isCancelled) { b.cancelled++; return; }

        const isSeen = data.isMarkedSeen || data.consultationCompleted || data.eyeIconPressed || data.status === 'completed';
        if (isSeen) b.seen++; else b.pending++;

        const src = data.bookingSource;
        const isQR = src === 'clinic_qr' || src === 'doctor_qr' || (data.type === 'qr_booking' && !src);
        if (isQR) b.qr++; else b.walkin++;
      });

      const result = Array.from(branchMap.entries()).map(([branchId, d]) => ({
        branchId,
        branchName: locations.find(l => l.id === branchId)?.name || `Branch #${branchId}`,
        ...d,
      }));
      setTodayData(result);
    } catch (err) {
      console.error('Today overview load error:', err);
    } finally {
      setTodayLoading(false);
    }
  };

  // ═══════════════════════════════════════════════
  // BILLING RECEIPTS LOADING
  // ═══════════════════════════════════════════════

  const loadBillingReceipts = async () => {
    if (!resolvedClinicId || !db) return;
    setBillingLoading(true);
    try {
      const receiptsRef = collection(db, 'clinics', resolvedClinicId, 'receipts');
      const snap = await getDocs(receiptsRef);
      const receipts = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          receiptNo: data.receiptNo || '',
          patientName: data.patientName || '',
          phone: data.phone || data.patientPhone || '',
          totalAmount: data.totalAmount || 0,
          paymentMethod: data.paymentMethod || 'CASH',
          date: data.date || '',
          createdAt: data.createdAt,
        };
      });
      receipts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setBillingReceipts(receipts);
    } catch (err) {
      console.error('Billing load error:', err);
    } finally {
      setBillingLoading(false);
    }
  };

  // ═══════════════════════════════════════════════
  // INVENTORY LOADING
  // ═══════════════════════════════════════════════

  const loadInventoryItems = async () => {
    if (!resolvedClinicId || !db) return;
    setInventoryLoading(true);
    try {
      const itemsRef = collection(db, 'clinics', resolvedClinicId, 'inventory');
      const snap = await getDocs(itemsRef);
      const items = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || '',
          category: data.category || '',
          quantity: data.quantity || 0,
          unit: data.unit || 'pcs',
          minStock: data.minStock || 0,
          expiryDate: data.expiryDate || '',
        };
      });
      items.sort((a, b) => a.name.localeCompare(b.name));
      setInventoryItems(items);
    } catch (err) {
      console.error('Inventory load error:', err);
    } finally {
      setInventoryLoading(false);
    }
  };

  // ═══════════════════════════════════════════════
  // RETENTION DATA LOADING
  // ═══════════════════════════════════════════════

  const loadRetentionData = async () => {
    if (!resolvedClinicId || !db) return;
    setRetentionLoading(true);
    try {
      // Load all bookings for this clinic (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const cutoff = sixMonthsAgo.toISOString().split('T')[0];

      const bookingsRef = collection(db, 'bookings');
      let bDocs: any[] = [];
      try {
        const bq = query(bookingsRef, where('clinicId', '==', resolvedClinicId), where('appointmentDate', '>=', cutoff));
        const snap = await getDocs(bq);
        bDocs = snap.docs;
      } catch {
        const fallbackQ = query(bookingsRef, where('clinicId', '==', resolvedClinicId));
        const allSnap = await getDocs(fallbackQ);
        bDocs = allSnap.docs.filter(d => (d.data().appointmentDate || '') >= cutoff);
      }

      // Track unique patients per branch and repeat visits
      const branchPatients = new Map<string, Map<string, number>>();
      locations.forEach(loc => branchPatients.set(loc.id, new Map()));

      bDocs.forEach(d => {
        const data = d.data();
        if (data.status === 'cancelled' || data.isCancelled) return;
        const locId = data.clinicLocationId || data.locationId || '001';
        if (!branchPatients.has(locId)) branchPatients.set(locId, new Map());
        const patientKey = data.patientPhone || data.phone || data.patientName || d.id;
        const map = branchPatients.get(locId)!;
        map.set(patientKey, (map.get(patientKey) || 0) + 1);
      });

      const result = Array.from(branchPatients.entries()).map(([branchId, patientMap]) => {
        const totalPatients = patientMap.size;
        const returningPatients = Array.from(patientMap.values()).filter(v => v > 1).length;
        const retentionRate = totalPatients > 0 ? Math.round((returningPatients / totalPatients) * 100) : 0;
        return {
          branchId,
          branchName: locations.find(l => l.id === branchId)?.name || `Branch #${branchId}`,
          totalPatients,
          returningPatients,
          retentionRate,
        };
      });
      setRetentionData(result);
    } catch (err) {
      console.error('Retention load error:', err);
    } finally {
      setRetentionLoading(false);
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
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Sidebar */}
      <MasterAccessSidebar
        activeMenu={activeMenu}
        onMenuChange={(m) => setActiveMenu(m as MasterMenu)}
        onLogout={() => { if (window.confirm('Logout from Master Access?')) { window.location.href = '/'; } }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        branchCount={locations.length}
        assistantCount={allAssistants.length}
      />

      {/* Main Content */}
      <div className="transition-all duration-300 lg:ml-64">
        {/* Top Header */}
        <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur border-b border-amber-900/30 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-zinc-800 text-zinc-400">
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={onBack} className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="ml-auto flex items-center gap-2 text-lg font-bold text-amber-400">
            <Crown className="w-5 h-5" />
            Master Access
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-6">
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

          {/* ═══════════════ DASHBOARD ═══════════════ */}
          {activeMenu === 'dashboard' && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Welcome to Master Dashboard</h1>
                <p className="text-sm text-zinc-400 mt-1">Overview of your clinic network — {clinicData?.clinicName || 'Clinic'}</p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-zinc-900 border-zinc-800 hover:border-amber-500/30 transition-colors cursor-pointer" onClick={() => setActiveMenu('analytics')}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs text-zinc-400">Total Bookings</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{bookings.filter((b: any) => b.status !== 'cancelled' && !b.isCancelled).length}</p>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 hover:border-amber-500/30 transition-colors cursor-pointer" onClick={() => setActiveMenu('branches')}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-zinc-400">Branches</span>
                    </div>
                    <p className="text-3xl font-bold text-amber-400">{locations.length}</p>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 hover:border-amber-500/30 transition-colors cursor-pointer" onClick={() => setActiveMenu('assistants')}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-zinc-400">Assistants</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-400">{allAssistants.length}</p>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 hover:border-amber-500/30 transition-colors cursor-pointer" onClick={() => setActiveMenu('analytics')}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Stethoscope className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-zinc-400">Doctors</span>
                    </div>
                    <p className="text-3xl font-bold text-purple-400">{doctors.length}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Nav Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { id: 'todays-overview', label: "Today's Overview", desc: 'Patient load across branches today', icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                  { id: 'revenue', label: 'Revenue', desc: 'Cross-branch revenue tracking', icon: IndianRupee, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { id: 'billing', label: 'Billing & Receipts', desc: 'View billing history across branches', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { id: 'inventory', label: 'Inventory & Stock', desc: 'Stock levels across all branches', icon: Package, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                  { id: 'retention', label: 'Patient Retention', desc: 'Cross-branch retention trends', icon: Target, color: 'text-pink-400', bg: 'bg-pink-500/10' },
                  { id: 'analytics', label: 'Full Analytics', desc: 'Charts, demographics & trends', icon: BarChart3, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                ].map(item => (
                  <Card
                    key={item.id}
                    className="bg-zinc-900 border-zinc-800 hover:border-amber-500/30 transition-all cursor-pointer group"
                    onClick={() => setActiveMenu(item.id as MasterMenu)}
                  >
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${item.bg}`}>
                        <item.icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-amber-400 transition-colors">{item.label}</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <DashboardPromoDisplay category="health-tip" placement="master-access" />
            </>
          )}

          {/* ═══════════════ ANALYTICS ═══════════════ */}
          {activeMenu === 'analytics' && (
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

          {/* ═══════════════ TODAY'S OVERVIEW ═══════════════ */}
          {activeMenu === 'todays-overview' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2"><Clock className="w-5 h-5 text-cyan-400" />Today's Overview</h1>
                  <p className="text-sm text-zinc-500 mt-0.5">Patient load across all branches — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <button onClick={() => loadTodayOverview()} className="px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white">Refresh</button>
              </div>

              {todayLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-amber-400 animate-spin" /></div>
              ) : (
                <>
                  {/* Aggregated Totals */}
                  {(() => {
                    const totals = todayData.reduce((acc, b) => {
                      acc.total += b.total; acc.seen += b.seen; acc.pending += b.pending; acc.cancelled += b.cancelled; acc.qr += b.qr; acc.walkin += b.walkin;
                      return acc;
                    }, { total: 0, seen: 0, pending: 0, cancelled: 0, qr: 0, walkin: 0 });
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Total Bookings</span><p className="text-2xl font-bold text-white mt-1">{totals.total}</p></CardContent></Card>
                        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Seen / Done</span><p className="text-2xl font-bold text-emerald-400 mt-1">{totals.seen}</p></CardContent></Card>
                        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Pending</span><p className="text-2xl font-bold text-amber-400 mt-1">{totals.pending}</p></CardContent></Card>
                        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Cancelled</span><p className="text-2xl font-bold text-red-400 mt-1">{totals.cancelled}</p></CardContent></Card>
                        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">QR Bookings</span><p className="text-2xl font-bold text-cyan-400 mt-1">{totals.qr}</p></CardContent></Card>
                        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Walk-ins</span><p className="text-2xl font-bold text-blue-400 mt-1">{totals.walkin}</p></CardContent></Card>
                      </div>
                    );
                  })()}

                  {/* Branch Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {todayData.map(b => {
                      const progress = b.total > 0 ? Math.round((b.seen / (b.total - b.cancelled)) * 100) : 0;
                      return (
                        <Card key={b.branchId} className="bg-zinc-900 border-zinc-800">
                          <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold flex items-center gap-2"><Building2 className="w-4 h-4 text-amber-400" />{b.branchName}</h3>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${progress === 100 ? 'bg-emerald-500/20 text-emerald-400' : progress > 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-700 text-zinc-400'}`}>
                                {isNaN(progress) ? 0 : progress}% done
                              </span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full bg-zinc-800 rounded-full h-2 mb-4">
                              <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${isNaN(progress) ? 0 : progress}%` }} />
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center">
                              <div><p className="text-lg font-bold text-emerald-400">{b.seen}</p><p className="text-[10px] text-zinc-500">Seen</p></div>
                              <div><p className="text-lg font-bold text-amber-400">{b.pending}</p><p className="text-[10px] text-zinc-500">Pending</p></div>
                              <div><p className="text-lg font-bold text-red-400">{b.cancelled}</p><p className="text-[10px] text-zinc-500">Cancelled</p></div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                              <span>QR: <strong className="text-cyan-400">{b.qr}</strong></span>
                              <span>Walk-in: <strong className="text-blue-400">{b.walkin}</strong></span>
                              <span>Total: <strong className="text-white">{b.total}</strong></span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {todayData.length === 0 && (
                      <div className="col-span-2 text-center py-12 text-zinc-500">No bookings today across any branch</div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* ═══════════════ REVENUE ═══════════════ */}
          {activeMenu === 'revenue' && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2"><IndianRupee className="w-5 h-5 text-emerald-400" />Revenue Overview</h1>
                  <p className="text-sm text-zinc-500 mt-0.5">Cross-branch revenue comparison</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
                    <button onClick={() => setRevenueViewMode('daily')} className={`px-3 py-1.5 text-xs font-medium ${revenueViewMode === 'daily' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'}`}>Daily</button>
                    <button onClick={() => setRevenueViewMode('monthly')} className={`px-3 py-1.5 text-xs font-medium ${revenueViewMode === 'monthly' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'}`}>Monthly</button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { const d = new Date(revenueDate); d.setDate(d.getDate() - (revenueViewMode === 'monthly' ? 30 : 1)); setRevenueDate(d.toISOString().split('T')[0]); }} className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700"><ChevronLeft className="w-4 h-4" /></button>
                    <Input type="date" value={revenueDate} onChange={e => setRevenueDate(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white h-9 w-[160px] text-sm" />
                    <button onClick={() => { const d = new Date(revenueDate); d.setDate(d.getDate() + (revenueViewMode === 'monthly' ? 30 : 1)); setRevenueDate(d.toISOString().split('T')[0]); }} className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              {revenueLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-amber-400 animate-spin" /></div>
              ) : revenueViewMode === 'daily' ? (
                <>
                  {/* Daily Totals */}
                  {(() => {
                    const totalPatientCredit = revenueDailyData.reduce((s, b) => s + b.patientCredit, 0);
                    const totalManualCredit = revenueDailyData.reduce((s, b) => s + b.manualCredit, 0);
                    const totalDebit = revenueDailyData.reduce((s, b) => s + b.debit, 0);
                    const totalPatients = revenueDailyData.reduce((s, b) => s + b.patients, 0);
                    const totalCredit = totalPatientCredit + totalManualCredit;
                    const net = totalCredit - totalDebit;
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Patients Seen</span><p className="text-2xl font-bold text-white mt-1">{totalPatients}</p></CardContent></Card>
                        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Consultation Fees</span><p className="text-2xl font-bold text-emerald-400 mt-1">₹{totalPatientCredit.toLocaleString()}</p></CardContent></Card>
                        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Other Income</span><p className="text-2xl font-bold text-blue-400 mt-1">₹{totalManualCredit.toLocaleString()}</p></CardContent></Card>
                        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Expenses</span><p className="text-2xl font-bold text-red-400 mt-1">₹{totalDebit.toLocaleString()}</p></CardContent></Card>
                        <Card className={`border ${net >= 0 ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-red-950/30 border-red-500/30'}`}><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Net Balance</span><p className={`text-2xl font-bold mt-1 ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>₹{net.toLocaleString()}</p></CardContent></Card>
                      </div>
                    );
                  })()}

                  {/* Branch Breakdown Table */}
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-5">
                      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-amber-400" />Branch Revenue — {new Date(revenueDate + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-zinc-800 text-left">
                              <th className="py-2 pr-4 text-zinc-400 font-medium">Branch</th>
                              <th className="py-2 pr-4 text-zinc-400 font-medium text-right">Patients</th>
                              <th className="py-2 pr-4 text-zinc-400 font-medium text-right">Fees (₹)</th>
                              <th className="py-2 pr-4 text-zinc-400 font-medium text-right">Other (₹)</th>
                              <th className="py-2 pr-4 text-zinc-400 font-medium text-right">Expenses (₹)</th>
                              <th className="py-2 text-zinc-400 font-medium text-right">Net (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {revenueDailyData.map(b => {
                              const net = b.patientCredit + b.manualCredit - b.debit;
                              return (
                                <tr key={b.branchId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                  <td className="py-2.5 pr-4"><div className="flex items-center gap-2"><MapPin className="w-3 h-3 text-amber-400" /><span className="text-white">{b.branchName}</span></div></td>
                                  <td className="py-2.5 pr-4 text-right text-white">{b.patients}</td>
                                  <td className="py-2.5 pr-4 text-right text-emerald-400">₹{b.patientCredit.toLocaleString()}</td>
                                  <td className="py-2.5 pr-4 text-right text-blue-400">₹{b.manualCredit.toLocaleString()}</td>
                                  <td className="py-2.5 pr-4 text-right text-red-400">₹{b.debit.toLocaleString()}</td>
                                  <td className={`py-2.5 text-right font-medium ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>₹{net.toLocaleString()}</td>
                                </tr>
                              );
                            })}
                            {revenueDailyData.length === 0 && (
                              <tr><td colSpan={6} className="py-8 text-center text-zinc-500 text-sm">No revenue data for this date</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  {/* Monthly Totals */}
                  {(() => {
                    const totalCredit = revenueMonthlyData.reduce((s, d) => s + d.credit, 0);
                    const totalDebit = revenueMonthlyData.reduce((s, d) => s + d.debit, 0);
                    const totalPatients = revenueMonthlyData.reduce((s, d) => s + d.patients, 0);
                    const net = totalCredit - totalDebit;
                    const monthName = new Date(revenueDate + 'T12:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                    return (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Patients Seen</span><p className="text-2xl font-bold text-white mt-1">{totalPatients}</p></CardContent></Card>
                          <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Total Income</span><p className="text-2xl font-bold text-emerald-400 mt-1">₹{totalCredit.toLocaleString()}</p></CardContent></Card>
                          <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Total Expenses</span><p className="text-2xl font-bold text-red-400 mt-1">₹{totalDebit.toLocaleString()}</p></CardContent></Card>
                          <Card className={`border ${net >= 0 ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-red-950/30 border-red-500/30'}`}><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Net Balance</span><p className={`text-2xl font-bold mt-1 ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>₹{net.toLocaleString()}</p></CardContent></Card>
                        </div>

                        <Card className="bg-zinc-900 border-zinc-800">
                          <CardContent className="p-5">
                            <h3 className="text-sm font-bold text-white mb-4">{monthName} — Day-wise Breakdown</h3>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-zinc-800 text-left">
                                    <th className="py-2 pr-4 text-zinc-400 font-medium">Date</th>
                                    <th className="py-2 pr-4 text-zinc-400 font-medium text-right">Patients</th>
                                    <th className="py-2 pr-4 text-zinc-400 font-medium text-right">Income (₹)</th>
                                    <th className="py-2 pr-4 text-zinc-400 font-medium text-right">Expenses (₹)</th>
                                    <th className="py-2 text-zinc-400 font-medium text-right">Net (₹)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {revenueMonthlyData.map(d => {
                                    const dayNet = d.credit - d.debit;
                                    return (
                                      <tr key={d.date} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                        <td className="py-2.5 pr-4 text-white">{new Date(d.date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                                        <td className="py-2.5 pr-4 text-right text-white">{d.patients}</td>
                                        <td className="py-2.5 pr-4 text-right text-emerald-400">₹{d.credit.toLocaleString()}</td>
                                        <td className="py-2.5 pr-4 text-right text-red-400">₹{d.debit.toLocaleString()}</td>
                                        <td className={`py-2.5 text-right font-medium ${dayNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>₹{dayNet.toLocaleString()}</td>
                                      </tr>
                                    );
                                  })}
                                  {revenueMonthlyData.length === 0 && (
                                    <tr><td colSpan={5} className="py-8 text-center text-zinc-500 text-sm">No data for this month</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    );
                  })()}
                </>
              )}
            </>
          )}

          {/* ═══════════════ BILLING & RECEIPTS ═══════════════ */}
          {activeMenu === 'billing' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5 text-blue-400" />Billing & Receipts</h1>
                  <p className="text-sm text-zinc-500 mt-0.5">All receipts generated across the clinic</p>
                </div>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{billingReceipts.length} Receipts</Badge>
              </div>

              {billingLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-amber-400 animate-spin" /></div>
              ) : (
                <>
                  {/* Summary */}
                  {(() => {
                    const totalAmount = billingReceipts.reduce((s, r) => s + r.totalAmount, 0);
                    const cashCount = billingReceipts.filter(r => r.paymentMethod === 'CASH').length;
                    const upiCount = billingReceipts.filter(r => r.paymentMethod === 'UPI').length;
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Total Receipts</span><p className="text-2xl font-bold text-white mt-1">{billingReceipts.length}</p></CardContent></Card>
                        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Total Billed</span><p className="text-2xl font-bold text-emerald-400 mt-1">₹{totalAmount.toLocaleString()}</p></CardContent></Card>
                        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Cash</span><p className="text-2xl font-bold text-amber-400 mt-1">{cashCount}</p></CardContent></Card>
                        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">UPI</span><p className="text-2xl font-bold text-blue-400 mt-1">{upiCount}</p></CardContent></Card>
                      </div>
                    );
                  })()}

                  {/* Receipts Table */}
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-5">
                      <h3 className="text-sm font-bold text-white mb-4">Recent Receipts</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-zinc-800 text-left">
                              <th className="py-2 pr-4 text-zinc-400 font-medium">Receipt #</th>
                              <th className="py-2 pr-4 text-zinc-400 font-medium">Patient</th>
                              <th className="py-2 pr-4 text-zinc-400 font-medium">Date</th>
                              <th className="py-2 pr-4 text-zinc-400 font-medium">Payment</th>
                              <th className="py-2 text-zinc-400 font-medium text-right">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {billingReceipts.slice(0, 50).map(r => (
                              <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                <td className="py-2.5 pr-4 text-amber-400 font-mono text-xs">{r.receiptNo}</td>
                                <td className="py-2.5 pr-4 text-white">{r.patientName}</td>
                                <td className="py-2.5 pr-4 text-zinc-400">{r.date ? new Date(r.date + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}</td>
                                <td className="py-2.5 pr-4"><span className={`text-xs px-2 py-0.5 rounded-full ${r.paymentMethod === 'CASH' ? 'bg-amber-500/20 text-amber-400' : r.paymentMethod === 'UPI' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-700 text-zinc-400'}`}>{r.paymentMethod}</span></td>
                                <td className="py-2.5 text-right text-emerald-400 font-medium">₹{r.totalAmount.toLocaleString()}</td>
                              </tr>
                            ))}
                            {billingReceipts.length === 0 && (
                              <tr><td colSpan={5} className="py-8 text-center text-zinc-500 text-sm">No receipts found</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}

          {/* ═══════════════ INVENTORY & STOCK ═══════════════ */}
          {activeMenu === 'inventory' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2"><Package className="w-5 h-5 text-orange-400" />Inventory & Stock</h1>
                  <p className="text-sm text-zinc-500 mt-0.5">Stock levels across the clinic</p>
                </div>
              </div>

              {inventoryLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-amber-400 animate-spin" /></div>
              ) : (
                <>
                  {/* Summary Stats */}
                  {(() => {
                    const totalItems = inventoryItems.length;
                    const lowStock = inventoryItems.filter(i => i.quantity > 0 && i.quantity <= i.minStock).length;
                    const outOfStock = inventoryItems.filter(i => i.quantity === 0).length;
                    const today = new Date().toISOString().split('T')[0];
                    const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);
                    const expiringSoon = inventoryItems.filter(i => i.expiryDate && i.expiryDate >= today && i.expiryDate <= thirtyDays.toISOString().split('T')[0]).length;
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Total Items</span><p className="text-2xl font-bold text-white mt-1">{totalItems}</p></CardContent></Card>
                        <Card className={`border ${lowStock > 0 ? 'bg-amber-950/30 border-amber-500/30' : 'bg-zinc-900 border-zinc-800'}`}><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Low Stock</span><p className="text-2xl font-bold text-amber-400 mt-1">{lowStock}</p></CardContent></Card>
                        <Card className={`border ${outOfStock > 0 ? 'bg-red-950/30 border-red-500/30' : 'bg-zinc-900 border-zinc-800'}`}><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Out of Stock</span><p className="text-2xl font-bold text-red-400 mt-1">{outOfStock}</p></CardContent></Card>
                        <Card className={`border ${expiringSoon > 0 ? 'bg-orange-950/30 border-orange-500/30' : 'bg-zinc-900 border-zinc-800'}`}><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Expiring (30d)</span><p className="text-2xl font-bold text-orange-400 mt-1">{expiringSoon}</p></CardContent></Card>
                      </div>
                    );
                  })()}

                  {/* Inventory Table */}
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-5">
                      <h3 className="text-sm font-bold text-white mb-4">All Items</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-zinc-800 text-left">
                              <th className="py-2 pr-4 text-zinc-400 font-medium">Item</th>
                              <th className="py-2 pr-4 text-zinc-400 font-medium">Category</th>
                              <th className="py-2 pr-4 text-zinc-400 font-medium text-right">Qty</th>
                              <th className="py-2 pr-4 text-zinc-400 font-medium">Unit</th>
                              <th className="py-2 pr-4 text-zinc-400 font-medium">Expiry</th>
                              <th className="py-2 text-zinc-400 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inventoryItems.map(item => {
                              const isLow = item.quantity > 0 && item.quantity <= item.minStock;
                              const isOut = item.quantity === 0;
                              const today = new Date().toISOString().split('T')[0];
                              const isExpired = item.expiryDate && item.expiryDate < today;
                              return (
                                <tr key={item.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                  <td className="py-2.5 pr-4 text-white font-medium">{item.name}</td>
                                  <td className="py-2.5 pr-4 text-zinc-400 text-xs">{item.category}</td>
                                  <td className={`py-2.5 pr-4 text-right font-medium ${isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-white'}`}>{item.quantity}</td>
                                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">{item.unit}</td>
                                  <td className={`py-2.5 pr-4 text-xs ${isExpired ? 'text-red-400' : 'text-zinc-500'}`}>{item.expiryDate ? new Date(item.expiryDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}</td>
                                  <td className="py-2.5">
                                    {isOut ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Out</span>
                                    : isLow ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Low</span>
                                    : isExpired ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Expired</span>
                                    : <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">OK</span>}
                                  </td>
                                </tr>
                              );
                            })}
                            {inventoryItems.length === 0 && (
                              <tr><td colSpan={6} className="py-8 text-center text-zinc-500 text-sm">No inventory items found</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}

          {/* ═══════════════ PATIENT RETENTION ═══════════════ */}
          {activeMenu === 'retention' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2"><Target className="w-5 h-5 text-pink-400" />Patient Retention</h1>
                  <p className="text-sm text-zinc-500 mt-0.5">Cross-branch retention analysis — last 6 months</p>
                </div>
                <button onClick={() => loadRetentionData()} className="px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white">Refresh</button>
              </div>

              {retentionLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-amber-400 animate-spin" /></div>
              ) : (
                <>
                  {/* Overall Stats */}
                  {(() => {
                    const totalPatients = retentionData.reduce((s, b) => s + b.totalPatients, 0);
                    const totalReturning = retentionData.reduce((s, b) => s + b.returningPatients, 0);
                    const overallRate = totalPatients > 0 ? Math.round((totalReturning / totalPatients) * 100) : 0;
                    const bestBranch = retentionData.length > 0 ? retentionData.reduce((best, b) => b.retentionRate > best.retentionRate ? b : best, retentionData[0]) : null;
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Unique Patients</span><p className="text-2xl font-bold text-white mt-1">{totalPatients}</p></CardContent></Card>
                        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Returning Patients</span><p className="text-2xl font-bold text-emerald-400 mt-1">{totalReturning}</p></CardContent></Card>
                        <Card className={`border ${overallRate >= 30 ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-amber-950/30 border-amber-500/30'}`}><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Overall Retention</span><p className={`text-2xl font-bold mt-1 ${overallRate >= 30 ? 'text-emerald-400' : 'text-amber-400'}`}>{overallRate}%</p></CardContent></Card>
                        <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-4"><span className="text-[10px] text-zinc-500 uppercase">Best Branch</span><p className="text-lg font-bold text-pink-400 mt-1">{bestBranch?.branchName || '-'}</p><p className="text-xs text-zinc-500">{bestBranch ? `${bestBranch.retentionRate}% retention` : ''}</p></CardContent></Card>
                      </div>
                    );
                  })()}

                  {/* Branch Retention Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {retentionData.map(b => (
                      <Card key={b.branchId} className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold flex items-center gap-2"><Building2 className="w-4 h-4 text-amber-400" />{b.branchName}</h3>
                            <span className={`text-sm font-bold ${b.retentionRate >= 30 ? 'text-emerald-400' : b.retentionRate >= 15 ? 'text-amber-400' : 'text-red-400'}`}>
                              {b.retentionRate}%
                            </span>
                          </div>
                          {/* Retention bar */}
                          <div className="w-full bg-zinc-800 rounded-full h-3 mb-3">
                            <div className={`h-3 rounded-full transition-all ${b.retentionRate >= 30 ? 'bg-emerald-500' : b.retentionRate >= 15 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${b.retentionRate}%` }} />
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div><p className="text-lg font-bold text-white">{b.totalPatients}</p><p className="text-[10px] text-zinc-500">Unique</p></div>
                            <div><p className="text-lg font-bold text-emerald-400">{b.returningPatients}</p><p className="text-[10px] text-zinc-500">Returning</p></div>
                            <div><p className="text-lg font-bold text-zinc-500">{b.totalPatients - b.returningPatients}</p><p className="text-[10px] text-zinc-500">One-time</p></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {retentionData.length === 0 && (
                      <div className="col-span-2 text-center py-12 text-zinc-500">No patient data found for retention analysis</div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* ═══════════════ BRANCHES ═══════════════ */}
          {activeMenu === 'branches' && (
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

          {/* ═══════════════ ASSISTANTS ═══════════════ */}
          {activeMenu === 'assistants' && (
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
      </div>{/* end lg:ml-64 */}
    </div>
  );
}
