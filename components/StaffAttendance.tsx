import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  Users, Clock, Calendar, Plus, Edit2, Trash2, Check, X, ChevronLeft, ChevronRight,
  Download, Upload, UserPlus, LogIn, LogOut as LogOutIcon, Coffee, MapPin, FileText,
  AlertCircle, Menu, GripVertical, Copy, Send, AlertTriangle, ClipboardList,
  IndianRupee, Fingerprint, Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardSidebar from './DashboardSidebar';
import ClinicSidebar from './ClinicSidebar';

// ============ TYPES ============

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  department?: string;
  employeeId?: string;
  biometricId?: string;
  joiningDate?: string;
  salary?: number;
  salaryType?: 'monthly' | 'daily';
  dailyRate?: number;
  paidLeavesPerYear?: number;
  latePenaltyAmount?: number;
  pfEnabled?: boolean;
  esiEnabled?: boolean;
  professionalTax?: number;
  isActive: boolean;
  createdAt?: any;
}

interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  clockIn?: any;
  clockOut?: any;
  totalHours?: number;
  status: 'present' | 'absent' | 'half-day' | 'late' | 'on-leave';
  method: 'manual' | 'qr' | 'gps' | 'csv' | 'biometric';
  notes?: string;
}

interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  startDate: string;
  endDate: string;
  leaveType: 'casual' | 'medical' | 'earned' | 'half-day';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt?: any;
  reviewedAt?: any;
  reviewedBy?: string;
}

interface ShiftSlot {
  staffId: string;
  staffName: string;
}

interface RosterDay {
  date: string;
  shifts: ShiftSlot[][];
}

interface RosterConfig {
  id?: string;
  month: string; // YYYY-MM
  shiftHours: number;
  shiftLabels: string[];
  roster: Record<string, ShiftSlot[][]>; // date -> shifts
}

interface StaffAttendanceProps {
  mode: 'doctor' | 'clinic';
  onLogout?: () => void | Promise<void>;
  onMenuChange?: (menu: string) => void;
  activeAddOns?: string[];
  clinicId?: string;
  clinicName?: string;
}

const ROLES = ['Receptionist', 'Nurse', 'Assistant', 'Technician', 'Pharmacist', 'Lab Technician', 'Admin', 'Cleaner', 'Security', 'Other'];
const MAX_STAFF_PER_BRANCH = 25;

const ROLE_COLORS: Record<string, string> = {
  Receptionist: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Nurse: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  Assistant: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Technician: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Pharmacist: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Lab Technician': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Admin: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  Cleaner: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  Security: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const SHIFT_PRESETS = [
  { label: '8 Hours (International)', hours: 8 },
  { label: '12 Hours', hours: 12 },
  { label: '6 Hours', hours: 6 },
  { label: '4 Hours', hours: 4 },
];

function generateShiftLabels(hours: number): string[] {
  const shiftsPerDay = Math.floor(24 / hours);
  const labels: string[] = [];
  for (let i = 0; i < shiftsPerDay; i++) {
    const start = (i * hours) % 24;
    const end = ((i + 1) * hours) % 24;
    const fmt = (h: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hr = h % 12 || 12;
      return `${hr}${ampm}`;
    };
    labels.push(`${fmt(start)}-${fmt(end)}`);
  }
  return labels;
}

export default function StaffAttendance({
  mode,
  onLogout = () => {},
  onMenuChange = () => {},
  activeAddOns = [],
  clinicId: propClinicId,
  clinicName: propClinicName,
}: StaffAttendanceProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'roster' | 'planner' | 'monthly' | 'payroll' | 'import-export'>('today');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [monthlyRecords, setMonthlyRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Staff modal
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: '', phone: '', role: 'Assistant', department: '', employeeId: '', salary: '',
    biometricId: '', salaryType: 'monthly' as 'monthly' | 'daily', dailyRate: '',
    paidLeavesPerYear: '12', latePenaltyAmount: '', pfEnabled: false, esiEnabled: false, professionalTax: '',
  });

  // Monthly view
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');

  // Roster planner
  const [rosterMonth, setRosterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [shiftHours, setShiftHours] = useState(8);
  const [shiftLabels, setShiftLabels] = useState<string[]>(generateShiftLabels(8));
  const [customShiftLabels, setCustomShiftLabels] = useState<string[]>([]);
  const [rosterData, setRosterData] = useState<Record<string, ShiftSlot[][]>>({});
  const [rosterSaving, setRosterSaving] = useState(false);
  const [dragStaff, setDragStaff] = useState<StaffMember | null>(null);
  const [showShiftConfig, setShowShiftConfig] = useState(false);
  const [rosterDocId, setRosterDocId] = useState<string | null>(null);

  // Leave
  const [showLeaveDetail, setShowLeaveDetail] = useState<LeaveRequest | null>(null);
  const [leaveFilter, setLeaveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // CSV
  const [csvData, setCsvData] = useState<any[]>([]);
  const [showCsvPreview, setShowCsvPreview] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Payroll
  const [payrollMonth, setPayrollMonth] = useState(new Date());
  const [payrollRecords, setPayrollRecords] = useState<AttendanceRecord[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);

  // Biometric import
  const [biometricData, setBiometricData] = useState<any[]>([]);
  const [showBiometricPreview, setShowBiometricPreview] = useState(false);
  const [biometricImporting, setBiometricImporting] = useState(false);

  const ownerId = mode === 'doctor'
    ? (localStorage.getItem('userId') || '')
    : (propClinicId || localStorage.getItem('healqr_clinic_id') || localStorage.getItem('healqr_parent_clinic_id') || '');
  const ownerField = mode === 'doctor' ? 'doctorId' : 'clinicId';

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  // ============ DATA LOADING ============

  const loadStaff = useCallback(async () => {
    try {
      const { db } = await import('../lib/firebase/config');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'staffMembers'), where(ownerField, '==', ownerId));
      const snap = await getDocs(q);
      const members: StaffMember[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember));
      members.sort((a, b) => a.name.localeCompare(b.name));
      setStaff(members);
    } catch (err) {
      console.error('Error loading staff:', err);
    }
  }, [ownerId, ownerField]);

  const loadTodayAttendance = useCallback(async () => {
    try {
      const { db } = await import('../lib/firebase/config');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'staffAttendance'), where(ownerField, '==', ownerId), where('date', '==', todayStr));
      const snap = await getDocs(q);
      setTodayRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    } catch (err) {
      console.error('Error loading attendance:', err);
    }
  }, [ownerId, ownerField, todayStr]);

  const loadMonthlyAttendance = useCallback(async () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const now = new Date();
    // Report extraction rule: after 7th, only current month data available
    if (now.getDate() > 7 && (year !== now.getFullYear() || month !== now.getMonth())) {
      setMonthlyRecords([]);
      return;
    }
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;
    try {
      const { db } = await import('../lib/firebase/config');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'staffAttendance'), where(ownerField, '==', ownerId), where('date', '>=', startDate), where('date', '<=', endDate));
      const snap = await getDocs(q);
      setMonthlyRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    } catch (err) {
      console.error('Error loading monthly:', err);
    }
  }, [ownerId, ownerField, selectedMonth]);

  const loadLeaveRequests = useCallback(async () => {
    try {
      const { db } = await import('../lib/firebase/config');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'leaveRequests'), where(ownerField, '==', ownerId));
      const snap = await getDocs(q);
      const reqs: LeaveRequest[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest));
      reqs.sort((a, b) => (b.appliedAt?.seconds || 0) - (a.appliedAt?.seconds || 0));
      setLeaveRequests(reqs);
    } catch (err) {
      console.error('Error loading leaves:', err);
    }
  }, [ownerId, ownerField]);

  const loadRoster = useCallback(async (monthStr: string) => {
    try {
      const { db } = await import('../lib/firebase/config');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'staffRosters'), where(ownerField, '==', ownerId), where('month', '==', monthStr));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data() as RosterConfig;
        setRosterDocId(snap.docs[0].id);
        setRosterData(data.roster || {});
        setShiftHours(data.shiftHours || 8);
        setShiftLabels(data.shiftLabels || generateShiftLabels(data.shiftHours || 8));
      } else {
        setRosterDocId(null);
        setRosterData({});
      }
    } catch (err) {
      console.error('Error loading roster:', err);
    }
  }, [ownerId, ownerField]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadStaff(), loadTodayAttendance(), loadLeaveRequests()]);
      setLoading(false);
    };
    if (ownerId) init();
  }, [ownerId, loadStaff, loadTodayAttendance, loadLeaveRequests]);

  useEffect(() => { if (activeTab === 'monthly') loadMonthlyAttendance(); }, [activeTab, loadMonthlyAttendance]);
  useEffect(() => { if (activeTab === 'planner') loadRoster(rosterMonth); }, [activeTab, rosterMonth, loadRoster]);

  // ============ STAFF CRUD ============

  const handleSaveStaff = async () => {
    if (!staffForm.name.trim()) { toast.error('Name is required'); return; }
    if (!editingStaff && activeStaff.length >= MAX_STAFF_PER_BRANCH) {
      toast.error(`Staff limit reached (${MAX_STAFF_PER_BRANCH} per branch). This module is designed for small clinics.`);
      return;
    }
    try {
      const { db } = await import('../lib/firebase/config');
      const { collection, addDoc, doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      if (editingStaff) {
        await updateDoc(doc(db, 'staffMembers', editingStaff.id), {
          name: staffForm.name.trim(), phone: staffForm.phone.trim(), role: staffForm.role,
          department: staffForm.department.trim(), employeeId: staffForm.employeeId.trim(),
          biometricId: staffForm.biometricId.trim() || null,
          salary: staffForm.salary ? Number(staffForm.salary) : null,
          salaryType: staffForm.salaryType,
          dailyRate: staffForm.dailyRate ? Number(staffForm.dailyRate) : null,
          paidLeavesPerYear: staffForm.paidLeavesPerYear ? Number(staffForm.paidLeavesPerYear) : 12,
          latePenaltyAmount: staffForm.latePenaltyAmount ? Number(staffForm.latePenaltyAmount) : 0,
          pfEnabled: staffForm.pfEnabled, esiEnabled: staffForm.esiEnabled,
          professionalTax: staffForm.professionalTax ? Number(staffForm.professionalTax) : 0,
        });
        toast.success('Staff updated');
      } else {
        await addDoc(collection(db, 'staffMembers'), {
          name: staffForm.name.trim(), phone: staffForm.phone.trim(), role: staffForm.role,
          department: staffForm.department.trim(), employeeId: staffForm.employeeId.trim(),
          biometricId: staffForm.biometricId.trim() || null,
          salary: staffForm.salary ? Number(staffForm.salary) : null,
          salaryType: staffForm.salaryType,
          dailyRate: staffForm.dailyRate ? Number(staffForm.dailyRate) : null,
          paidLeavesPerYear: staffForm.paidLeavesPerYear ? Number(staffForm.paidLeavesPerYear) : 12,
          latePenaltyAmount: staffForm.latePenaltyAmount ? Number(staffForm.latePenaltyAmount) : 0,
          pfEnabled: staffForm.pfEnabled, esiEnabled: staffForm.esiEnabled,
          professionalTax: staffForm.professionalTax ? Number(staffForm.professionalTax) : 0,
          isActive: true, [ownerField]: ownerId, createdAt: serverTimestamp(),
        });
        toast.success('Staff added');
      }
      setShowAddStaff(false);
      setEditingStaff(null);
      setStaffForm({
        name: '', phone: '', role: 'Assistant', department: '', employeeId: '', salary: '',
        biometricId: '', salaryType: 'monthly', dailyRate: '', paidLeavesPerYear: '12',
        latePenaltyAmount: '', pfEnabled: false, esiEnabled: false, professionalTax: '',
      });
      await loadStaff();
    } catch (err) {
      console.error('Save staff error:', err);
      toast.error('Failed to save');
    }
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      const { db } = await import('../lib/firebase/config');
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'staffMembers', id), { isActive: false });
      toast.success('Staff deactivated');
      setDeleteConfirm(null);
      await loadStaff();
    } catch (err) {
      toast.error('Failed to deactivate');
    }
  };

  // ============ ATTENDANCE ACTIONS ============

  const handleClockIn = async (s: StaffMember) => {
    try {
      const { db } = await import('../lib/firebase/config');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'staffAttendance'), {
        staffId: s.id, staffName: s.name, date: todayStr,
        clockIn: serverTimestamp(), status: 'present', method: 'manual', [ownerField]: ownerId,
      });
      toast.success(`${s.name} clocked in`);
      await loadTodayAttendance();
    } catch (err) { toast.error('Clock in failed'); }
  };

  const handleClockOut = async (record: AttendanceRecord) => {
    try {
      const { db } = await import('../lib/firebase/config');
      const { doc, updateDoc, serverTimestamp, Timestamp } = await import('firebase/firestore');
      const now = Timestamp.now();
      const clockInTime = record.clockIn?.toDate?.() || (record.clockIn?.seconds ? new Date(record.clockIn.seconds * 1000) : new Date());
      const hours = Math.round(((now.toDate().getTime() - clockInTime.getTime()) / (1000 * 60 * 60)) * 100) / 100;
      await updateDoc(doc(db, 'staffAttendance', record.id), {
        clockOut: serverTimestamp(), totalHours: hours, status: hours < 4 ? 'half-day' : 'present',
      });
      toast.success(`${record.staffName} clocked out (${hours.toFixed(1)}h)`);
      await loadTodayAttendance();
    } catch (err) { toast.error('Clock out failed'); }
  };

  const handleMarkAbsent = async (s: StaffMember) => {
    try {
      const { db } = await import('../lib/firebase/config');
      const { collection, addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'staffAttendance'), {
        staffId: s.id, staffName: s.name, date: todayStr, status: 'absent', method: 'manual', [ownerField]: ownerId,
      });
      toast.success(`${s.name} marked absent`);
      await loadTodayAttendance();
    } catch (err) { toast.error('Failed'); }
  };

  const handleMarkLeave = async (s: StaffMember) => {
    try {
      const { db } = await import('../lib/firebase/config');
      const { collection, addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'staffAttendance'), {
        staffId: s.id, staffName: s.name, date: todayStr, status: 'on-leave', method: 'manual', [ownerField]: ownerId,
      });
      toast.success(`${s.name} marked on leave`);
      await loadTodayAttendance();
    } catch (err) { toast.error('Failed'); }
  };

  // ============ LEAVE MANAGEMENT ============

  const handleLeaveAction = async (leave: LeaveRequest, action: 'approved' | 'rejected') => {
    try {
      const { db } = await import('../lib/firebase/config');
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'leaveRequests', leave.id), {
        status: action, reviewedAt: serverTimestamp(), reviewedBy: ownerId,
      });
      toast.success(`Leave ${action}`);
      setShowLeaveDetail(null);
      await loadLeaveRequests();
    } catch (err) { toast.error('Failed'); }
  };

  const getLeaveApplyLink = () => {
    const base = window.location.origin;
    return `${base}?page=leave-apply&${ownerField}=${ownerId}`;
  };

  const copyLeaveLink = (s: StaffMember) => {
    const link = `${getLeaveApplyLink()}&staffId=${s.id}&staffName=${encodeURIComponent(s.name)}`;
    navigator.clipboard.writeText(link).then(() => toast.success('Leave link copied!')).catch(() => toast.error('Copy failed'));
  };

  const shareLeaveLink = (s: StaffMember) => {
    const link = `${getLeaveApplyLink()}&staffId=${s.id}&staffName=${encodeURIComponent(s.name)}`;
    const msg = `Hi ${s.name}, apply for leave using this link:\n${link}`;
    const waUrl = s.phone
      ? `https://wa.me/91${s.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  const getStaffLeaves = (staffId: string) => leaveRequests.filter(l => l.staffId === staffId);
  const getStaffPendingLeaves = (staffId: string) => leaveRequests.filter(l => l.staffId === staffId && l.status === 'pending').length;
  const getStaffApprovedLeaves = (staffId: string) => leaveRequests.filter(l => l.staffId === staffId && l.status === 'approved').length;

  const isStaffOnLeave = (staffId: string, dateStr: string): LeaveRequest | null => {
    return leaveRequests.find(l =>
      l.staffId === staffId && l.status === 'approved' && l.startDate <= dateStr && l.endDate >= dateStr
    ) || null;
  };

  const hasStaffLeaveRequest = (staffId: string, dateStr: string): LeaveRequest | null => {
    return leaveRequests.find(l =>
      l.staffId === staffId && l.startDate <= dateStr && l.endDate >= dateStr
    ) || null;
  };

  // ============ ROSTER PLANNER ============

  const handleShiftHoursChange = (hours: number) => {
    setShiftHours(hours);
    const labels = generateShiftLabels(hours);
    setShiftLabels(labels);
    setCustomShiftLabels([]);
    // Reset roster data for new shift structure
    setRosterData({});
  };

  const handleDragStart = (s: StaffMember) => {
    setDragStaff(s);
  };

  const handleDrop = (dateStr: string, shiftIdx: number) => {
    if (!dragStaff) return;

    // Check if staff is on approved leave
    const leave = isStaffOnLeave(dragStaff.id, dateStr);
    if (leave) {
      toast.error(`${dragStaff.name} is on approved ${leave.leaveType} leave on ${dateStr}`, { duration: 4000 });
      setDragStaff(null);
      return;
    }

    // Check pending leave
    const pendingLeave = hasStaffLeaveRequest(dragStaff.id, dateStr);
    if (pendingLeave && pendingLeave.status === 'pending') {
      toast.warning(`${dragStaff.name} has a pending leave request for ${dateStr}. Assigning anyway.`, { duration: 4000 });
    }

    setRosterData(prev => {
      const updated = { ...prev };
      const shiftsPerDay = Math.floor(24 / shiftHours);
      if (!updated[dateStr]) {
        updated[dateStr] = Array.from({ length: shiftsPerDay }, () => []);
      }
      // Don't add if already in this shift
      if (updated[dateStr][shiftIdx]?.some(slot => slot.staffId === dragStaff.id)) {
        return prev;
      }
      updated[dateStr] = updated[dateStr].map((shift, i) =>
        i === shiftIdx ? [...shift, { staffId: dragStaff.id, staffName: dragStaff.name }] : shift
      );
      return updated;
    });
    setDragStaff(null);
  };

  const handleRemoveFromShift = (dateStr: string, shiftIdx: number, staffId: string) => {
    setRosterData(prev => {
      const updated = { ...prev };
      if (updated[dateStr]?.[shiftIdx]) {
        updated[dateStr][shiftIdx] = updated[dateStr][shiftIdx].filter(s => s.staffId !== staffId);
      }
      return updated;
    });
  };

  const handleSaveRoster = async () => {
    setRosterSaving(true);
    try {
      const { db } = await import('../lib/firebase/config');
      const { collection, addDoc, doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const data = {
        month: rosterMonth, shiftHours, shiftLabels: customShiftLabels.length > 0 ? customShiftLabels : shiftLabels,
        roster: rosterData, [ownerField]: ownerId, updatedAt: serverTimestamp(),
      };
      if (rosterDocId) {
        await updateDoc(doc(db, 'staffRosters', rosterDocId), data);
      } else {
        const ref = await addDoc(collection(db, 'staffRosters'), { ...data, createdAt: serverTimestamp() });
        setRosterDocId(ref.id);
      }
      toast.success('Roster saved');
    } catch (err) {
      toast.error('Failed to save roster');
    }
    setRosterSaving(false);
  };

  // ============ CSV ============

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV must have header + data rows'); return; }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIdx = headers.findIndex(h => h.includes('name'));
      const dateIdx = headers.findIndex(h => h.includes('date'));
      const inIdx = headers.findIndex(h => h.includes('in') || h.includes('clock'));
      const outIdx = headers.findIndex(h => h.includes('out'));
      const statusIdx = headers.findIndex(h => h.includes('status'));
      if (nameIdx < 0 || dateIdx < 0) { toast.error('CSV must have "Name" and "Date" columns'); return; }
      const parsed = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim());
        return { name: cols[nameIdx] || '', date: cols[dateIdx] || '', clockIn: inIdx >= 0 ? cols[inIdx] : '', clockOut: outIdx >= 0 ? cols[outIdx] : '', status: statusIdx >= 0 ? cols[statusIdx]?.toLowerCase() : 'present' };
      }).filter(r => r.name && r.date);
      setCsvData(parsed);
      setShowCsvPreview(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCsvImportConfirm = async () => {
    try {
      const { db } = await import('../lib/firebase/config');
      const { collection, addDoc } = await import('firebase/firestore');
      let imported = 0;
      for (const row of csvData) {
        const matchedStaff = staff.find(s => s.name.toLowerCase() === row.name.toLowerCase());
        await addDoc(collection(db, 'staffAttendance'), {
          staffId: matchedStaff?.id || '', staffName: row.name, date: row.date,
          clockIn: row.clockIn || null, clockOut: row.clockOut || null,
          status: row.status || 'present', method: 'csv', [ownerField]: ownerId,
        });
        imported++;
      }
      toast.success(`Imported ${imported} records`);
      setShowCsvPreview(false); setCsvData([]);
      await loadTodayAttendance();
      if (activeTab === 'monthly') await loadMonthlyAttendance();
    } catch (err) { toast.error('Import failed'); }
  };

  // ============ EXPORT ============

  const handleExport = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const now = new Date();
    if (now.getDate() > 7 && (year !== now.getFullYear() || month !== now.getMonth())) {
      toast.error('Report extraction available only 1st-7th for previous month');
      return;
    }
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = selectedMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const filterStaff = selectedStaffId === 'all' ? staff.filter(s => s.isActive) : staff.filter(s => s.id === selectedStaffId);
    let csv = `Staff Attendance Report - ${monthName}\n`;
    csv += `Name,Role,Employee ID,${Array.from({ length: daysInMonth }, (_, i) => i + 1).join(',')},Present,Absent,Half-Day,Leave,Total Hours\n`;
    filterStaff.forEach(s => {
      const days = Array.from({ length: daysInMonth }, (_, i) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
        const record = monthlyRecords.find(r => r.staffId === s.id && r.date === dateStr);
        if (!record) return '-';
        if (record.status === 'present') return 'P'; if (record.status === 'absent') return 'A';
        if (record.status === 'half-day') return 'H'; if (record.status === 'on-leave') return 'L';
        if (record.status === 'late') return 'Lt'; return '-';
      });
      const pC = days.filter(d => d === 'P').length, aC = days.filter(d => d === 'A').length;
      const hC = days.filter(d => d === 'H').length, lC = days.filter(d => d === 'L').length;
      const tH = monthlyRecords.filter(r => r.staffId === s.id && r.totalHours).reduce((sum, r) => sum + (r.totalHours || 0), 0);
      csv += `${s.name},${s.role},${s.employeeId || '-'},${days.join(',')},${pC},${aC},${hC},${lC},${tH.toFixed(1)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `attendance-${year}-${String(month + 1).padStart(2, '0')}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Exported successfully');
  };

  const handleDownloadTemplate = () => {
    const csv = 'Name,Date,Clock In,Clock Out,Status\nJohn Doe,2026-04-12,09:00,17:30,present\nJane Smith,2026-04-12,09:15,17:00,present\nRam Kumar,2026-04-12,,,absent\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'attendance-template.csv'; a.click(); URL.revokeObjectURL(url);
  };

  // ============ PAYROLL ============

  const loadPayrollData = useCallback(async () => {
    const year = payrollMonth.getFullYear();
    const month = payrollMonth.getMonth();
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;
    setPayrollLoading(true);
    try {
      const { db } = await import('../lib/firebase/config');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'staffAttendance'), where(ownerField, '==', ownerId), where('date', '>=', startDate), where('date', '<=', endDate));
      const snap = await getDocs(q);
      setPayrollRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    } catch (err) { console.error('Payroll load error:', err); }
    setPayrollLoading(false);
  }, [ownerId, ownerField, payrollMonth]);

  useEffect(() => { if (activeTab === 'payroll') loadPayrollData(); }, [activeTab, loadPayrollData]);

  const getWorkingDays = (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let wd = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month, d).getDay() !== 0) wd++;
    }
    return wd;
  };

  const calcPayroll = (s: StaffMember) => {
    const year = payrollMonth.getFullYear();
    const month = payrollMonth.getMonth();
    const workingDays = getWorkingDays(year, month);
    const recs = payrollRecords.filter(r => r.staffId === s.id);
    const presentDays = recs.filter(r => r.status === 'present').length;
    const halfDays = recs.filter(r => r.status === 'half-day').length;
    const lateDays = recs.filter(r => r.status === 'late').length;
    const leaveDays = recs.filter(r => r.status === 'on-leave').length;
    const absentDays = recs.filter(r => r.status === 'absent').length;
    const totalHours = recs.reduce((sum, r) => sum + (r.totalHours || 0), 0);

    // Paid leaves: approved leave requests for this month (limited by annual quota)
    const paidLeaveQuota = (s.paidLeavesPerYear ?? 12) / 12; // per month
    const paidLeaveUsed = Math.min(leaveDays, Math.ceil(paidLeaveQuota));
    const unpaidLeaves = leaveDays - paidLeaveUsed;

    const effectivePresent = presentDays + lateDays + (halfDays * 0.5) + paidLeaveUsed;
    const unpaidAbsences = absentDays + unpaidLeaves;

    let gross = 0, perDay = 0;
    if (s.salaryType === 'daily') {
      perDay = s.dailyRate || 0;
      gross = perDay * effectivePresent;
    } else {
      const monthlySal = s.salary || 0;
      perDay = workingDays > 0 ? monthlySal / workingDays : 0;
      gross = monthlySal;
    }

    const absentDeduction = s.salaryType === 'monthly' ? (unpaidAbsences * perDay) : 0;
    const halfDayDeduction = s.salaryType === 'monthly' ? (halfDays * 0.5 * perDay) : 0;
    const latePenalty = (s.latePenaltyAmount || 0) * lateDays;
    const pfDeduction = s.pfEnabled ? Math.round(gross * 0.12) : 0;
    const esiDeduction = s.esiEnabled ? Math.round(gross * 0.0075) : 0;
    const ptDeduction = s.professionalTax || 0;

    const totalDeductions = absentDeduction + halfDayDeduction + latePenalty + pfDeduction + esiDeduction + ptDeduction;
    const netPay = Math.max(0, Math.round(gross - totalDeductions));

    return {
      workingDays, presentDays, halfDays, lateDays, leaveDays, absentDays, totalHours,
      paidLeaveUsed, unpaidLeaves, effectivePresent, gross: Math.round(gross), perDay: Math.round(perDay),
      absentDeduction: Math.round(absentDeduction), halfDayDeduction: Math.round(halfDayDeduction),
      latePenalty, pfDeduction, esiDeduction, ptDeduction, totalDeductions: Math.round(totalDeductions), netPay,
    };
  };

  const handlePayrollExport = () => {
    const year = payrollMonth.getFullYear();
    const month = payrollMonth.getMonth();
    const monthName = payrollMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const payStaff = activeStaff.filter(s => s.salary || s.dailyRate);
    let csv = `Payroll Report - ${monthName}\n`;
    csv += 'Name,Role,Salary Type,Monthly/Daily Rate,Working Days,Present,Half-Day,Late,Leave(Paid),Leave(Unpaid),Absent,Gross,Absent Ded,Half-Day Ded,Late Penalty,PF,ESI,Prof Tax,Total Ded,Net Pay\n';
    payStaff.forEach(s => {
      const p = calcPayroll(s);
      const rate = s.salaryType === 'daily' ? s.dailyRate : s.salary;
      csv += `${s.name},${s.role},${s.salaryType || 'monthly'},${rate || 0},${p.workingDays},${p.presentDays},${p.halfDays},${p.lateDays},${p.paidLeaveUsed},${p.unpaidLeaves},${p.absentDays},${p.gross},${p.absentDeduction},${p.halfDayDeduction},${p.latePenalty},${p.pfDeduction},${p.esiDeduction},${p.ptDeduction},${p.totalDeductions},${p.netPay}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `payroll-${year}-${String(month + 1).padStart(2, '0')}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Payroll exported');
  };

  // ============ BIOMETRIC IMPORT ============

  const handleBiometricUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV must have header + data rows'); return; }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      // Auto-detect columns
      const idIdx = headers.findIndex(h => h.includes('emp') || h.includes('biometric') || h.includes('id') || h.includes('code'));
      const nameIdx = headers.findIndex(h => h.includes('name'));
      const dateIdx = headers.findIndex(h => h.includes('date'));
      const inIdx = headers.findIndex(h => h.includes('in') && !h.includes('min'));
      const outIdx = headers.findIndex(h => h.includes('out'));
      const punchIdx = headers.findIndex(h => h.includes('punch') || h.includes('time') || h.includes('timestamp'));

      if (dateIdx < 0) { toast.error('CSV must have a "Date" column'); return; }
      if (idIdx < 0 && nameIdx < 0) { toast.error('CSV must have "Employee ID/Name" column'); return; }

      const parsed = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim());
        const bioId = idIdx >= 0 ? cols[idIdx] : '';
        const name = nameIdx >= 0 ? cols[nameIdx] : '';
        const date = cols[dateIdx] || '';
        const clockIn = inIdx >= 0 ? cols[inIdx] : (punchIdx >= 0 ? cols[punchIdx] : '');
        const clockOut = outIdx >= 0 ? cols[outIdx] : '';

        // Match to staff
        let matched: StaffMember | undefined;
        if (bioId) matched = activeStaff.find(s => s.biometricId === bioId || s.employeeId === bioId);
        if (!matched && name) matched = activeStaff.find(s => s.name.toLowerCase() === name.toLowerCase());

        return { bioId, name: matched?.name || name, date, clockIn, clockOut, staffId: matched?.id || '', matched: !!matched };
      }).filter(r => r.date);

      setBiometricData(parsed);
      setShowBiometricPreview(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBiometricImportConfirm = async () => {
    const matched = biometricData.filter(r => r.matched);
    if (matched.length === 0) { toast.error('No records matched to staff'); return; }
    setBiometricImporting(true);
    try {
      const { db } = await import('../lib/firebase/config');
      const { collection, addDoc } = await import('firebase/firestore');
      let imported = 0;
      for (const row of matched) {
        await addDoc(collection(db, 'staffAttendance'), {
          staffId: row.staffId, staffName: row.name, date: row.date,
          clockIn: row.clockIn || null, clockOut: row.clockOut || null,
          status: 'present', method: 'biometric', [ownerField]: ownerId,
        });
        imported++;
      }
      toast.success(`Imported ${imported} biometric records`);
      setShowBiometricPreview(false); setBiometricData([]);
      await loadTodayAttendance();
      if (activeTab === 'monthly') await loadMonthlyAttendance();
    } catch (err) { toast.error('Biometric import failed'); }
    setBiometricImporting(false);
  };

  // ============ HELPERS ============

  const getStaffTodayRecord = (staffId: string) => todayRecords.find(r => r.staffId === staffId);
  const formatTimestamp = (ts: any) => {
    if (!ts) return '--:--';
    const date = ts.toDate?.() || (ts.seconds ? new Date(ts.seconds * 1000) : null);
    if (!date) return ts;
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };
  const todayPresent = todayRecords.filter(r => r.status === 'present' || r.status === 'half-day' || r.status === 'late').length;
  const todayAbsent = todayRecords.filter(r => r.status === 'absent').length;
  const todayLeave = todayRecords.filter(r => r.status === 'on-leave').length;
  const activeStaff = staff.filter(s => s.isActive);

  // ============ TABS ============

  const tabs = [
    { id: 'today' as const, label: 'Today', icon: Clock },
    { id: 'roster' as const, label: 'Staff Roster', icon: Users },
    { id: 'planner' as const, label: 'Shift Planner', icon: ClipboardList },
    { id: 'monthly' as const, label: 'Monthly Report', icon: Calendar },
    { id: 'payroll' as const, label: 'Payroll', icon: Wallet },
    { id: 'import-export' as const, label: 'Import/Export', icon: FileText },
  ];

  // ============ TODAY TAB ============

  const renderToday = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <Card className="bg-gray-900/50 border-gray-800"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-white">{activeStaff.length}</p><p className="text-[10px] text-gray-500 uppercase">Total Staff</p></CardContent></Card>
        <Card className="bg-emerald-500/10 border-emerald-500/30"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-emerald-400">{todayPresent}</p><p className="text-[10px] text-emerald-500 uppercase">Present</p></CardContent></Card>
        <Card className="bg-red-500/10 border-red-500/30"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-red-400">{todayAbsent}</p><p className="text-[10px] text-red-500 uppercase">Absent</p></CardContent></Card>
        <Card className="bg-amber-500/10 border-amber-500/30"><CardContent className="p-3 text-center"><p className="text-xl font-bold text-amber-400">{todayLeave}</p><p className="text-[10px] text-amber-500 uppercase">On Leave</p></CardContent></Card>
      </div>

      {/* Pending Leave Requests Banner */}
      {leaveRequests.filter(l => l.status === 'pending').length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">{leaveRequests.filter(l => l.status === 'pending').length} pending leave request(s)</p>
          </div>
          <Button size="sm" onClick={() => setActiveTab('roster')} className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7">View</Button>
        </div>
      )}

      {activeStaff.length === 0 ? (
        <Card className="bg-gray-900/50 border-gray-800"><CardContent className="p-6 text-center">
          <Users className="w-10 h-10 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No staff added yet</p>
          <Button onClick={() => { setActiveTab('roster'); setShowAddStaff(true); }} className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"><UserPlus className="w-3.5 h-3.5 mr-1" /> Add Staff</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {activeStaff.map(s => {
            const record = getStaffTodayRecord(s.id);
            const isClockedIn = record && record.clockIn && !record.clockOut && record.status !== 'absent' && record.status !== 'on-leave';
            const isClockedOut = record && record.clockOut;
            const isAbsent = record && record.status === 'absent';
            const isOnLeave = record && record.status === 'on-leave';

            return (
              <Card key={s.id} className={`border ${isClockedIn ? 'bg-emerald-500/5 border-emerald-500/30' : isClockedOut ? 'bg-gray-800/50 border-gray-700' : isAbsent ? 'bg-red-500/5 border-red-500/20' : isOnLeave ? 'bg-amber-500/5 border-amber-500/20' : 'bg-gray-900/50 border-gray-800'}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isClockedIn ? 'bg-emerald-500 text-white' : isClockedOut ? 'bg-gray-600 text-gray-300' : isAbsent ? 'bg-red-500/30 text-red-400' : isOnLeave ? 'bg-amber-500/30 text-amber-400' : 'bg-gray-700 text-gray-400'}`}>
                        {s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-xs truncate">{s.name}</p>
                        <span className={`text-[10px] px-1 py-0.5 rounded border ${ROLE_COLORS[s.role] || ROLE_COLORS['Other']}`}>{s.role}</span>
                      </div>
                    </div>
                    {/* Time - hidden on small screens */}
                    {record && (
                      <div className="text-right shrink-0 hidden sm:block">
                        {record.clockIn && <p className="text-[10px] text-gray-400"><span className="text-emerald-400">In:</span> {formatTimestamp(record.clockIn)}</p>}
                        {record.clockOut && <p className="text-[10px] text-gray-400"><span className="text-red-400">Out:</span> {formatTimestamp(record.clockOut)}</p>}
                        {record.totalHours != null && <p className="text-[10px] text-gray-500">{record.totalHours.toFixed(1)}h</p>}
                      </div>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      {isClockedIn && <Button size="sm" onClick={() => handleClockOut(record!)} className="bg-red-600 hover:bg-red-700 text-white text-[10px] h-7 px-2"><LogOutIcon className="w-3 h-3 mr-0.5" />Out</Button>}
                      {isClockedOut && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30">DONE</span>}
                      {isAbsent && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">ABSENT</span>}
                      {isOnLeave && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">LEAVE</span>}
                      {!record && (
                        <>
                          <Button size="sm" onClick={() => handleClockIn(s)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-7 px-2"><LogIn className="w-3 h-3 mr-0.5" />In</Button>
                          <Button size="sm" variant="outline" onClick={() => handleMarkAbsent(s)} className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-[10px] h-7 px-1.5"><X className="w-3 h-3" /></Button>
                          <Button size="sm" variant="outline" onClick={() => handleMarkLeave(s)} className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-[10px] h-7 px-1.5"><Coffee className="w-3 h-3" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  // ============ ROSTER TAB ============

  const renderRoster = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-gray-400">{activeStaff.length}/{MAX_STAFF_PER_BRANCH} staff</p>
        <Button onClick={() => { setEditingStaff(null); setStaffForm({ name: '', phone: '', role: 'Assistant', department: '', employeeId: '', salary: '', biometricId: '', salaryType: 'monthly', dailyRate: '', paidLeavesPerYear: '12', latePenaltyAmount: '', pfEnabled: false, esiEnabled: false, professionalTax: '' }); setShowAddStaff(true); }}
          disabled={activeStaff.length >= MAX_STAFF_PER_BRANCH}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs disabled:opacity-50"><UserPlus className="w-3.5 h-3.5 mr-1" />Add Staff</Button>
      </div>

      {/* Scope note */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-gray-400">Designed for small clinics (up to {MAX_STAFF_PER_BRANCH} staff per branch). For enterprise setups with existing HRMS/biometric systems, this module serves as a lightweight attendance tracker — not a replacement for your existing payroll software.</p>
      </div>
      {staff.length === 0 ? (
        <Card className="bg-gray-900/50 border-gray-800"><CardContent className="p-6 text-center">
          <Users className="w-10 h-10 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No staff members added</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {staff.map(s => {
            const pendingL = getStaffPendingLeaves(s.id);
            const approvedL = getStaffApprovedLeaves(s.id);
            const staffLeaves = getStaffLeaves(s.id);
            return (
              <Card key={s.id} className={`border ${s.isActive ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-900/30 border-gray-800/50 opacity-60'}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                        {s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-xs truncate">{s.name}</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`text-[10px] px-1 py-0.5 rounded border ${ROLE_COLORS[s.role] || ROLE_COLORS['Other']}`}>{s.role}</span>
                          {s.department && <span className="text-[10px] text-gray-500">{s.department}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => copyLeaveLink(s)} className="text-blue-400 hover:text-blue-300 h-7 w-7 p-0" title="Copy leave link">
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => shareLeaveLink(s)} className="text-green-400 hover:text-green-300 h-7 w-7 p-0" title="Share via WhatsApp">
                        <Send className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingStaff(s); setStaffForm({ name: s.name, phone: s.phone, role: s.role, department: s.department || '', employeeId: s.employeeId || '', salary: s.salary?.toString() || '', biometricId: s.biometricId || '', salaryType: s.salaryType || 'monthly', dailyRate: s.dailyRate?.toString() || '', paidLeavesPerYear: (s.paidLeavesPerYear ?? 12).toString(), latePenaltyAmount: s.latePenaltyAmount?.toString() || '', pfEnabled: s.pfEnabled || false, esiEnabled: s.esiEnabled || false, professionalTax: s.professionalTax?.toString() || '' }); setShowAddStaff(true); }} className="text-gray-400 hover:text-white h-7 w-7 p-0">
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      {deleteConfirm === s.id ? (
                        <div className="flex items-center gap-0.5">
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteStaff(s.id)} className="text-red-400 h-7 w-7 p-0"><Check className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)} className="text-gray-400 h-7 w-7 p-0"><X className="w-3 h-3" /></Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(s.id)} className="text-gray-500 hover:text-red-400 h-7 w-7 p-0"><Trash2 className="w-3 h-3" /></Button>
                      )}
                    </div>
                  </div>
                  {/* Info row */}
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-gray-500 flex-wrap">
                    {s.phone && <span>📱{s.phone}</span>}
                    {s.employeeId && <span>#{s.employeeId}</span>}
                    {s.biometricId && <span className="text-purple-400/70">🔑{s.biometricId}</span>}
                    {s.salary != null && <span>₹{s.salary.toLocaleString('en-IN')}/mo</span>}
                    {s.dailyRate != null && s.salaryType === 'daily' && <span>₹{s.dailyRate}/day</span>}
                    {!s.isActive && <span className="text-red-400 font-medium">Deactivated</span>}
                  </div>
                  {/* Leave Badges */}
                  {(pendingL > 0 || approvedL > 0 || staffLeaves.filter(l => l.status === 'rejected').length > 0) && (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {pendingL > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">{pendingL} Pending</span>}
                      {approvedL > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{approvedL} Approved</span>}
                      {staffLeaves.filter(l => l.status === 'rejected').length > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">{staffLeaves.filter(l => l.status === 'rejected').length} Rejected</span>}
                    </div>
                  )}
                  {/* Leave list for this staff */}
                  {staffLeaves.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {staffLeaves.slice(0, 3).map(l => (
                        <div key={l.id} onClick={() => setShowLeaveDetail(l)} className="flex items-center justify-between bg-gray-800/40 rounded px-2 py-1 cursor-pointer hover:bg-gray-800/70 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${l.status === 'pending' ? 'bg-amber-400' : l.status === 'approved' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            <span className="text-[10px] text-gray-300">{l.startDate}{l.endDate !== l.startDate ? ` → ${l.endDate}` : ''}</span>
                            <span className="text-[10px] text-gray-500 capitalize">{l.leaveType}</span>
                          </div>
                          <span className={`text-[9px] font-bold uppercase ${l.status === 'pending' ? 'text-amber-400' : l.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}>{l.status}</span>
                        </div>
                      ))}
                      {staffLeaves.length > 3 && <p className="text-[10px] text-gray-500 pl-2">+{staffLeaves.length - 3} more</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  // ============ SHIFT PLANNER TAB ============

  const renderPlanner = () => {
    const [y, m] = rosterMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const shiftsPerDay = Math.floor(24 / shiftHours);
    const labels = customShiftLabels.length > 0 ? customShiftLabels : shiftLabels;

    return (
      <div className="space-y-3">
        {/* Config Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <input type="month" value={rosterMonth} onChange={e => setRosterMonth(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5" />
            <Button size="sm" variant="outline" onClick={() => setShowShiftConfig(!showShiftConfig)} className="border-gray-700 text-gray-300 text-xs h-8">
              ⚙ Shifts: {shiftHours}h
            </Button>
          </div>
          <Button size="sm" onClick={handleSaveRoster} disabled={rosterSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8">
            {rosterSaving ? '...' : '💾 Save Roster'}
          </Button>
        </div>

        {/* Shift Configuration Panel */}
        {showShiftConfig && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-3 space-y-3">
              <p className="text-xs text-gray-400 font-medium">Shift Duration</p>
              <div className="flex flex-wrap gap-2">
                {SHIFT_PRESETS.map(p => (
                  <button key={p.hours} onClick={() => handleShiftHoursChange(p.hours)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${shiftHours === p.hours ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 font-medium mt-2">Custom Shift Labels (optional)</p>
              <div className="flex flex-wrap gap-2">
                {labels.map((l, i) => (
                  <input key={i} value={customShiftLabels[i] ?? l}
                    onChange={e => {
                      const updated = [...(customShiftLabels.length > 0 ? customShiftLabels : shiftLabels)];
                      updated[i] = e.target.value;
                      setCustomShiftLabels(updated);
                    }}
                    className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 w-28" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Staff Pool - Draggable */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-3">
            <p className="text-[10px] text-gray-500 uppercase mb-2">↓ Drag staff to assign shifts</p>
            <div className="flex flex-wrap gap-1.5">
              {activeStaff.map(s => (
                <div key={s.id} draggable onDragStart={() => handleDragStart(s)}
                  className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 cursor-grab active:cursor-grabbing hover:border-emerald-500/50 transition-colors select-none">
                  <GripVertical className="w-3 h-3 text-gray-600" />
                  <span className="text-xs text-white font-medium">{s.name}</span>
                  <span className={`text-[9px] px-1 rounded ${ROLE_COLORS[s.role] || ROLE_COLORS['Other']}`}>{s.role}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <div className="overflow-x-auto -mx-3 px-3">
          <div className="min-w-[600px]">
            {/* Header */}
            <div className="grid gap-px bg-gray-800 rounded-t-lg overflow-hidden" style={{ gridTemplateColumns: `80px repeat(${shiftsPerDay}, 1fr)` }}>
              <div className="bg-gray-900 p-2 text-[10px] text-gray-500 font-medium">Date</div>
              {labels.map((l, i) => (
                <div key={i} className="bg-gray-900 p-2 text-[10px] text-center text-gray-400 font-medium">{l}</div>
              ))}
            </div>

            {/* Days */}
            <div className="space-y-px">
              {Array.from({ length: daysInMonth }, (_, dayIdx) => {
                const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dayIdx + 1).padStart(2, '0')}`;
                const dayOfWeek = new Date(y, m - 1, dayIdx + 1).getDay();
                const isSunday = dayOfWeek === 0;
                const dayShifts = rosterData[dateStr] || Array.from({ length: shiftsPerDay }, () => []);
                const dayName = new Date(y, m - 1, dayIdx + 1).toLocaleDateString('en-IN', { weekday: 'short' });

                return (
                  <div key={dayIdx} className="grid gap-px" style={{ gridTemplateColumns: `80px repeat(${shiftsPerDay}, 1fr)` }}>
                    <div className={`bg-gray-900/80 p-2 flex items-center gap-1 ${isSunday ? 'text-red-400/60' : 'text-gray-300'}`}>
                      <span className="text-xs font-bold">{dayIdx + 1}</span>
                      <span className="text-[10px] text-gray-500">{dayName}</span>
                    </div>
                    {Array.from({ length: shiftsPerDay }, (_, shiftIdx) => {
                      const slotStaff = dayShifts[shiftIdx] || [];
                      return (
                        <div key={shiftIdx}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => handleDrop(dateStr, shiftIdx)}
                          className="bg-gray-900/50 p-1.5 min-h-[40px] border border-transparent hover:border-emerald-500/30 transition-colors rounded">
                          {slotStaff.map(slot => {
                            const leave = isStaffOnLeave(slot.staffId, dateStr);
                            const pendingLeave = hasStaffLeaveRequest(slot.staffId, dateStr);
                            return (
                              <div key={slot.staffId} className={`flex items-center justify-between gap-1 px-1.5 py-0.5 rounded text-[10px] mb-0.5 ${leave ? 'bg-red-500/20 text-red-400 border border-red-500/30' : pendingLeave?.status === 'pending' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' : 'bg-emerald-500/15 text-emerald-400'}`}>
                                <span className="truncate">{slot.staffName}{leave ? ' 🚫' : pendingLeave?.status === 'pending' ? ' ⚠' : ''}</span>
                                <button onClick={() => handleRemoveFromShift(dateStr, shiftIdx, slot.staffId)} className="text-gray-500 hover:text-red-400 shrink-0"><X className="w-2.5 h-2.5" /></button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============ MONTHLY TAB ============

  const renderMonthly = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = selectedMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const filterStaff = selectedStaffId === 'all' ? activeStaff : activeStaff.filter(s => s.id === selectedStaffId);

    const now = new Date();
    const isRestricted = now.getDate() > 7 && (year !== now.getFullYear() || month !== now.getMonth());

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelectedMonth(new Date(year, month - 1, 1))} className="text-gray-400 hover:text-white h-7 w-7 p-0"><ChevronLeft className="w-4 h-4" /></Button>
            <h3 className="text-sm font-semibold text-white min-w-[140px] text-center">{monthName}</h3>
            <Button size="sm" variant="ghost" onClick={() => setSelectedMonth(new Date(year, month + 1, 1))} className="text-gray-400 hover:text-white h-7 w-7 p-0"><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1">
            <option value="all">All Staff</option>
            {activeStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {isRestricted ? (
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm text-amber-300 font-medium">Report Not Available</p>
              <p className="text-xs text-gray-400 mt-1">Previous month report can only be accessed from 1st to 7th of current month. Please export reports within that window.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="block sm:hidden space-y-2">
              {filterStaff.map(s => {
                const staffRecs = monthlyRecords.filter(r => r.staffId === s.id);
                let pC = 0, aC = 0, lC = 0, hC = 0, ltC = 0;
                staffRecs.forEach(r => {
                  if (r.status === 'present') pC++;
                  else if (r.status === 'absent') aC++;
                  else if (r.status === 'half-day') { hC++; pC += 0.5; }
                  else if (r.status === 'on-leave') lC++;
                  else if (r.status === 'late') { ltC++; pC++; }
                });
                return (
                  <Card key={s.id} className="bg-gray-900/50 border-gray-800">
                    <CardContent className="p-3">
                      <p className="text-white text-sm font-semibold mb-2 truncate">{s.name}</p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-emerald-500/10 rounded-lg py-1.5">
                          <p className="text-emerald-400 text-lg font-bold">{pC}</p>
                          <p className="text-emerald-400/70 text-[10px]">Present</p>
                        </div>
                        <div className="bg-red-500/10 rounded-lg py-1.5">
                          <p className="text-red-400 text-lg font-bold">{aC}</p>
                          <p className="text-red-400/70 text-[10px]">Absent</p>
                        </div>
                        <div className="bg-amber-500/10 rounded-lg py-1.5">
                          <p className="text-amber-400 text-lg font-bold">{lC}</p>
                          <p className="text-amber-400/70 text-[10px]">Leave</p>
                        </div>
                        <div className="bg-blue-500/10 rounded-lg py-1.5">
                          <p className="text-blue-400 text-lg font-bold">{hC}</p>
                          <p className="text-blue-400/70 text-[10px]">Half-day</p>
                        </div>
                      </div>
                      {ltC > 0 && <p className="text-orange-400 text-[10px] mt-1.5 text-right">{ltC} late arrival{ltC > 1 ? 's' : ''}</p>}
                      <div className="mt-2 flex flex-wrap gap-0.5">
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                          const rec = staffRecs.find(r => r.date === dateStr);
                          let bg = 'bg-gray-800';
                          if (rec) {
                            if (rec.status === 'present') bg = 'bg-emerald-500';
                            else if (rec.status === 'absent') bg = 'bg-red-500';
                            else if (rec.status === 'half-day') bg = 'bg-blue-500';
                            else if (rec.status === 'on-leave') bg = 'bg-amber-500';
                            else if (rec.status === 'late') bg = 'bg-orange-500';
                          }
                          return <div key={i} className={`w-2 h-2 rounded-sm ${bg}`} title={`${i + 1}: ${rec?.status || 'no data'}`} />;
                        })}
                      </div>
                      <div className="flex gap-3 mt-1.5 text-[9px] text-gray-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />P</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" />A</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" />L</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" />H</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-500 inline-block" />Lt</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filterStaff.length === 0 && <Card className="bg-gray-900/50 border-gray-800"><CardContent className="p-4 text-center"><p className="text-gray-500 text-xs">No staff to show</p></CardContent></Card>}
            </div>

            {/* Desktop table view */}
            <div className="hidden sm:block overflow-x-auto -mx-3 px-3">
              <table className="w-full text-[10px] min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-1.5 px-2 text-gray-400 font-medium sticky left-0 bg-black z-10 min-w-[80px]">Staff</th>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const dc = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                      const dw = new Date(year, month, i + 1).getDay();
                      return <th key={i} className={`text-center py-1.5 px-0.5 min-w-[22px] font-medium ${dc === todayStr ? 'text-emerald-400' : dw === 0 ? 'text-red-400/60' : 'text-gray-500'}`}>{i + 1}</th>;
                    })}
                    <th className="text-center py-1.5 px-1 text-emerald-400">P</th>
                    <th className="text-center py-1.5 px-1 text-red-400">A</th>
                    <th className="text-center py-1.5 px-1 text-amber-400">L</th>
                  </tr>
                </thead>
                <tbody>
                  {filterStaff.map(s => {
                    const staffRecs = monthlyRecords.filter(r => r.staffId === s.id);
                    let pC = 0, aC = 0, lC = 0;
                    return (
                      <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-1.5 px-2 sticky left-0 bg-black z-10"><p className="text-white text-[10px] font-medium truncate max-w-[80px]">{s.name}</p></td>
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                          const rec = staffRecs.find(r => r.date === dateStr);
                          let display = '-', cellClass = 'text-gray-700';
                          if (rec) {
                            if (rec.status === 'present') { display = 'P'; cellClass = 'text-emerald-400 bg-emerald-500/10'; pC++; }
                            else if (rec.status === 'absent') { display = 'A'; cellClass = 'text-red-400 bg-red-500/10'; aC++; }
                            else if (rec.status === 'half-day') { display = 'H'; cellClass = 'text-blue-400 bg-blue-500/10'; pC += 0.5; }
                            else if (rec.status === 'on-leave') { display = 'L'; cellClass = 'text-amber-400 bg-amber-500/10'; lC++; }
                            else if (rec.status === 'late') { display = 'Lt'; cellClass = 'text-orange-400 bg-orange-500/10'; pC++; }
                          }
                          return <td key={i} className={`text-center py-1.5 px-0.5 font-medium rounded ${cellClass}`}>{display}</td>;
                        })}
                        <td className="text-center py-1.5 px-1 font-bold text-emerald-400">{pC}</td>
                        <td className="text-center py-1.5 px-1 font-bold text-red-400">{aC}</td>
                        <td className="text-center py-1.5 px-1 font-bold text-amber-400">{lC}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filterStaff.length === 0 && <div className="hidden sm:block"><Card className="bg-gray-900/50 border-gray-800"><CardContent className="p-4 text-center"><p className="text-gray-500 text-xs">No staff to show</p></CardContent></Card></div>}
          </>
        )}
      </div>
    );
  };

  // ============ PAYROLL TAB ============

  const renderPayroll = () => {
    const year = payrollMonth.getFullYear();
    const month = payrollMonth.getMonth();
    const monthName = payrollMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const payStaff = activeStaff.filter(s => s.salary || s.dailyRate);
    const noSalaryStaff = activeStaff.filter(s => !s.salary && !s.dailyRate);

    const totalNetPay = payStaff.reduce((sum, s) => sum + calcPayroll(s).netPay, 0);
    const totalGross = payStaff.reduce((sum, s) => sum + calcPayroll(s).gross, 0);
    const totalDeductions = payStaff.reduce((sum, s) => sum + calcPayroll(s).totalDeductions, 0);

    return (
      <div className="space-y-3">
        {/* Month nav + Export */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPayrollMonth(new Date(year, month - 1, 1))} className="text-gray-400 hover:text-white h-7 w-7 p-0"><ChevronLeft className="w-4 h-4" /></Button>
            <h3 className="text-sm font-semibold text-white min-w-[140px] text-center">{monthName}</h3>
            <Button size="sm" variant="ghost" onClick={() => setPayrollMonth(new Date(year, month + 1, 1))} className="text-gray-400 hover:text-white h-7 w-7 p-0"><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <Button size="sm" onClick={handlePayrollExport} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
            <Download className="w-3 h-3 mr-1" /> Export Payroll
          </Button>
        </div>

        {payrollLoading ? (
          <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="bg-emerald-500/10 border-emerald-500/30"><CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-emerald-400">₹{totalGross.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-emerald-500 uppercase">Total Gross</p>
              </CardContent></Card>
              <Card className="bg-red-500/10 border-red-500/30"><CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-red-400">₹{totalDeductions.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-red-500 uppercase">Total Ded.</p>
              </CardContent></Card>
              <Card className="bg-blue-500/10 border-blue-500/30"><CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-blue-400">₹{totalNetPay.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-blue-500 uppercase">Net Payable</p>
              </CardContent></Card>
            </div>

            {/* No salary configured notice */}
            {noSalaryStaff.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-amber-300 font-medium">{noSalaryStaff.length} staff without salary configured</p>
                  <p className="text-[10px] text-gray-400">{noSalaryStaff.map(s => s.name).join(', ')} — edit in Staff Roster</p>
                </div>
              </div>
            )}

            {/* Payroll per staff */}
            {payStaff.length === 0 ? (
              <Card className="bg-gray-900/50 border-gray-800"><CardContent className="p-6 text-center">
                <IndianRupee className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No salary configured</p>
                <p className="text-xs text-gray-500 mt-1">Edit staff in roster to add salary package</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {payStaff.map(s => {
                  const p = calcPayroll(s);
                  return (
                    <Card key={s.id} className="bg-gray-900/50 border-gray-800">
                      <CardContent className="p-3">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-300 shrink-0">
                              {s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-semibold text-xs truncate">{s.name}</p>
                              <span className={`text-[10px] px-1 py-0.5 rounded border ${ROLE_COLORS[s.role] || ROLE_COLORS['Other']}`}>{s.role}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-emerald-400">₹{p.netPay.toLocaleString('en-IN')}</p>
                            <p className="text-[10px] text-gray-500">Net Pay</p>
                          </div>
                        </div>

                        {/* Attendance Summary */}
                        <div className="grid grid-cols-5 gap-1 mb-2">
                          <div className="bg-gray-800/60 rounded px-1.5 py-1 text-center">
                            <p className="text-xs font-bold text-emerald-400">{p.presentDays}</p>
                            <p className="text-[9px] text-gray-500">Present</p>
                          </div>
                          <div className="bg-gray-800/60 rounded px-1.5 py-1 text-center">
                            <p className="text-xs font-bold text-blue-400">{p.halfDays}</p>
                            <p className="text-[9px] text-gray-500">Half</p>
                          </div>
                          <div className="bg-gray-800/60 rounded px-1.5 py-1 text-center">
                            <p className="text-xs font-bold text-orange-400">{p.lateDays}</p>
                            <p className="text-[9px] text-gray-500">Late</p>
                          </div>
                          <div className="bg-gray-800/60 rounded px-1.5 py-1 text-center">
                            <p className="text-xs font-bold text-amber-400">{p.leaveDays}</p>
                            <p className="text-[9px] text-gray-500">Leave</p>
                          </div>
                          <div className="bg-gray-800/60 rounded px-1.5 py-1 text-center">
                            <p className="text-xs font-bold text-red-400">{p.absentDays}</p>
                            <p className="text-[9px] text-gray-500">Absent</p>
                          </div>
                        </div>

                        {/* Salary Breakdown */}
                        <div className="bg-gray-800/40 rounded-lg p-2 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-gray-400">{s.salaryType === 'daily' ? `Daily Rate × ${p.effectivePresent} days` : 'Monthly Gross'}</span>
                            <span className="text-white font-medium">₹{p.gross.toLocaleString('en-IN')}</span>
                          </div>
                          {p.absentDeduction > 0 && <div className="flex justify-between"><span className="text-gray-400">Absent deduction ({p.absentDays + p.unpaidLeaves}d × ₹{p.perDay})</span><span className="text-red-400">−₹{p.absentDeduction.toLocaleString('en-IN')}</span></div>}
                          {p.halfDayDeduction > 0 && <div className="flex justify-between"><span className="text-gray-400">Half-day deduction ({p.halfDays}d)</span><span className="text-red-400">−₹{p.halfDayDeduction.toLocaleString('en-IN')}</span></div>}
                          {p.latePenalty > 0 && <div className="flex justify-between"><span className="text-gray-400">Late penalty ({p.lateDays} × ₹{s.latePenaltyAmount})</span><span className="text-red-400">−₹{p.latePenalty.toLocaleString('en-IN')}</span></div>}
                          {p.pfDeduction > 0 && <div className="flex justify-between"><span className="text-gray-400">PF (12%)</span><span className="text-red-400">−₹{p.pfDeduction.toLocaleString('en-IN')}</span></div>}
                          {p.esiDeduction > 0 && <div className="flex justify-between"><span className="text-gray-400">ESI (0.75%)</span><span className="text-red-400">−₹{p.esiDeduction.toLocaleString('en-IN')}</span></div>}
                          {p.ptDeduction > 0 && <div className="flex justify-between"><span className="text-gray-400">Professional Tax</span><span className="text-red-400">−₹{p.ptDeduction.toLocaleString('en-IN')}</span></div>}
                          <div className="border-t border-gray-700 pt-1 flex justify-between font-bold">
                            <span className="text-gray-300">Net Payable</span>
                            <span className="text-emerald-400">₹{p.netPay.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                        {p.paidLeaveUsed > 0 && <p className="text-[10px] text-amber-400/70 mt-1">📋 {p.paidLeaveUsed} paid leave(s) used of {Math.ceil((s.paidLeavesPerYear ?? 12) / 12)}/mo quota</p>}
                        {p.totalHours > 0 && <p className="text-[10px] text-gray-500 mt-0.5">⏱ {p.totalHours.toFixed(1)} total hours logged</p>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ============ IMPORT/EXPORT TAB ============

  const renderImportExport = () => {
    const now = new Date();
    const canExtractPrev = now.getDate() <= 7;

    return (
      <div className="space-y-4">
        {/* Extraction Rule Notice */}
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-blue-300 font-medium">Report Extraction Rule</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Previous month reports available 1st–7th only. Current month always available. Export within the window to keep records locally.</p>
            </div>
          </CardContent>
        </Card>

        {/* CSV Import */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-sm text-white flex items-center gap-2"><Upload className="w-4 h-4 text-blue-400" />Import Attendance</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <label className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg cursor-pointer inline-flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />Upload CSV
                <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
              </label>
              <Button onClick={handleDownloadTemplate} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 text-xs h-8">
                <Download className="w-3.5 h-3.5 mr-1" />Template
              </Button>
            </div>
            <div className="bg-gray-800/50 rounded p-2 border border-gray-700/50">
              <code className="text-[10px] text-cyan-400">Name, Date, Clock In, Clock Out, Status</code>
              <p className="text-[10px] text-gray-500 mt-0.5">Status: present, absent, half-day, on-leave, late</p>
            </div>
          </CardContent>
        </Card>

        {/* Export */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-sm text-white flex items-center gap-2"><Download className="w-4 h-4 text-emerald-400" />Export Attendance</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <select value={`${selectedMonth.getFullYear()}-${selectedMonth.getMonth()}`}
                onChange={e => { const [yy, mm] = e.target.value.split('-').map(Number); setSelectedMonth(new Date(yy, mm, 1)); }}
                className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5">
                {Array.from({ length: 12 }, (_, i) => {
                  const d = new Date(); d.setMonth(d.getMonth() - i);
                  const disabled = i > 0 && !canExtractPrev;
                  return <option key={i} value={`${d.getFullYear()}-${d.getMonth()}`} disabled={disabled && i === 1}>{d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}{i === 1 && !canExtractPrev ? ' (locked)' : ''}</option>;
                })}
              </select>
              <Button onClick={() => { loadMonthlyAttendance().then(() => handleExport()); }} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8">
                <Download className="w-3.5 h-3.5 mr-1" />Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Biometric Import */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-sm text-white flex items-center gap-2"><Fingerprint className="w-4 h-4 text-purple-400" />Biometric Import</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            <p className="text-[10px] text-gray-400">Upload attendance CSV exported from your biometric device (ZKTeco, eSSL, Suprema, etc.)</p>
            <div className="flex flex-wrap gap-2">
              <label className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded-lg cursor-pointer inline-flex items-center gap-1">
                <Fingerprint className="w-3.5 h-3.5" />Upload Biometric CSV
                <input type="file" accept=".csv" onChange={handleBiometricUpload} className="hidden" />
              </label>
            </div>
            <div className="bg-gray-800/50 rounded p-2 border border-gray-700/50">
              <p className="text-[10px] text-cyan-400 font-medium mb-0.5">Auto-detects columns:</p>
              <code className="text-[10px] text-gray-400">Employee ID/Code, Name, Date, In Time, Out Time</code>
              <p className="text-[10px] text-gray-500 mt-1">💡 Match staff via Biometric ID (set in Staff Roster → Edit) or by name</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ============ MODALS ============

  const renderStaffModal = () => {
    if (!showAddStaff) return null;
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddStaff(false)}>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <h3 className="text-base font-bold text-white mb-3">{editingStaff ? 'Edit Staff' : 'Add Staff Member'}</h3>
          <div className="space-y-2.5">
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5">Name *</label>
              <input value={staffForm.name} onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="Staff name" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5">Phone</label>
              <input value={staffForm.phone} onChange={e => setStaffForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="Phone number" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5">Role</label>
              <select value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5">Department</label>
                <input value={staffForm.department} onChange={e => setStaffForm(f => ({ ...f, department: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="OPD, Lab" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5">Employee ID</label>
                <input value={staffForm.employeeId} onChange={e => setStaffForm(f => ({ ...f, employeeId: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="EMP001" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5">Biometric Device ID</label>
              <input value={staffForm.biometricId} onChange={e => setStaffForm(f => ({ ...f, biometricId: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="Device ID for biometric matching" />
            </div>

            {/* Salary Package Section */}
            <div className="border-t border-gray-700 pt-2.5 mt-1">
              <p className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Salary Package</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button onClick={() => setStaffForm(f => ({ ...f, salaryType: 'monthly' }))}
                  className={`text-xs py-1.5 rounded-lg border transition-all ${staffForm.salaryType === 'monthly' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                  Monthly Fixed
                </button>
                <button onClick={() => setStaffForm(f => ({ ...f, salaryType: 'daily' }))}
                  className={`text-xs py-1.5 rounded-lg border transition-all ${staffForm.salaryType === 'daily' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                  Per-Day Rate
                </button>
              </div>
              {staffForm.salaryType === 'monthly' ? (
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">Monthly Salary (₹)</label>
                  <input type="number" value={staffForm.salary} onChange={e => setStaffForm(f => ({ ...f, salary: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="e.g. 15000" />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">Daily Rate (₹)</label>
                  <input type="number" value={staffForm.dailyRate} onChange={e => setStaffForm(f => ({ ...f, dailyRate: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="e.g. 600" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">Paid Leaves/Year</label>
                  <input type="number" value={staffForm.paidLeavesPerYear} onChange={e => setStaffForm(f => ({ ...f, paidLeavesPerYear: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="12" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">Late Penalty (₹)</label>
                  <input type="number" value={staffForm.latePenaltyAmount} onChange={e => setStaffForm(f => ({ ...f, latePenaltyAmount: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="0 = no penalty" />
                </div>
              </div>
            </div>

            {/* Deductions Section */}
            <div className="border-t border-gray-700 pt-2.5 mt-1">
              <p className="text-xs font-semibold text-amber-400 mb-2">Deductions</p>
              <div className="space-y-2">
                <label className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-300">PF (12% of salary)</span>
                  <input type="checkbox" checked={staffForm.pfEnabled} onChange={e => setStaffForm(f => ({ ...f, pfEnabled: e.target.checked }))}
                    className="w-4 h-4 rounded accent-emerald-500" />
                </label>
                <label className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-300">ESI (0.75% of salary)</span>
                  <input type="checkbox" checked={staffForm.esiEnabled} onChange={e => setStaffForm(f => ({ ...f, esiEnabled: e.target.checked }))}
                    className="w-4 h-4 rounded accent-emerald-500" />
                </label>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">Professional Tax (₹/mo)</label>
                  <input type="number" value={staffForm.professionalTax} onChange={e => setStaffForm(f => ({ ...f, professionalTax: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="e.g. 200" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => setShowAddStaff(false)} variant="outline" className="flex-1 border-gray-700 text-gray-300 text-sm">Cancel</Button>
            <Button onClick={handleSaveStaff} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm">{editingStaff ? 'Update' : 'Add'}</Button>
          </div>
        </div>
      </div>
    );
  };

  const renderCsvPreview = () => {
    if (!showCsvPreview) return null;
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCsvPreview(false)}>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 w-full max-w-lg max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
          <h3 className="text-base font-bold text-white mb-1">Import Preview</h3>
          <p className="text-[10px] text-gray-400 mb-3">{csvData.length} records</p>
          <table className="w-full text-[10px]">
            <thead><tr className="border-b border-gray-700">
              <th className="text-left py-1 px-1 text-gray-400">Name</th><th className="text-left py-1 px-1 text-gray-400">Date</th><th className="text-left py-1 px-1 text-gray-400">Status</th>
            </tr></thead>
            <tbody>{csvData.slice(0, 15).map((r, i) => (
              <tr key={i} className="border-b border-gray-800/50"><td className="py-1 px-1 text-white">{r.name}</td><td className="py-1 px-1 text-gray-400">{r.date}</td><td className="py-1 px-1 text-gray-300">{r.status}</td></tr>
            ))}</tbody>
          </table>
          <div className="flex gap-2 mt-3">
            <Button onClick={() => setShowCsvPreview(false)} variant="outline" className="flex-1 border-gray-700 text-gray-300 text-xs">Cancel</Button>
            <Button onClick={handleCsvImportConfirm} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs">Import {csvData.length}</Button>
          </div>
        </div>
      </div>
    );
  };

  const renderLeaveDetail = () => {
    if (!showLeaveDetail) return null;
    const l = showLeaveDetail;
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLeaveDetail(null)}>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
          <h3 className="text-base font-bold text-white mb-3">Leave Request</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-xs text-gray-500">Staff</span><span className="text-xs text-white">{l.staffName}</span></div>
            <div className="flex justify-between"><span className="text-xs text-gray-500">Type</span><span className="text-xs text-white capitalize">{l.leaveType}</span></div>
            <div className="flex justify-between"><span className="text-xs text-gray-500">From</span><span className="text-xs text-white">{l.startDate}</span></div>
            <div className="flex justify-between"><span className="text-xs text-gray-500">To</span><span className="text-xs text-white">{l.endDate}</span></div>
            <div><span className="text-xs text-gray-500">Reason</span><p className="text-xs text-white mt-0.5 bg-gray-800 rounded p-2">{l.reason || 'No reason given'}</p></div>
            <div className="flex justify-between"><span className="text-xs text-gray-500">Status</span>
              <span className={`text-xs font-bold uppercase ${l.status === 'pending' ? 'text-amber-400' : l.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}>{l.status}</span>
            </div>
          </div>
          {l.status === 'pending' && (
            <div className="flex gap-2 mt-4">
              <Button onClick={() => handleLeaveAction(l, 'rejected')} variant="outline" className="flex-1 border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs">Reject</Button>
              <Button onClick={() => handleLeaveAction(l, 'approved')} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">Approve</Button>
            </div>
          )}
          <Button onClick={() => setShowLeaveDetail(null)} variant="ghost" className="w-full mt-2 text-gray-400 text-xs">Close</Button>
        </div>
      </div>
    );
  };

  const renderBiometricPreview = () => {
    if (!showBiometricPreview) return null;
    const matched = biometricData.filter(r => r.matched);
    const unmatched = biometricData.filter(r => !r.matched);
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowBiometricPreview(false)}>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 w-full max-w-lg max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2"><Fingerprint className="w-4 h-4 text-purple-400" /> Biometric Import Preview</h3>
          <div className="flex gap-3 mb-3 text-[10px]">
            <span className="text-emerald-400">{matched.length} matched</span>
            <span className="text-red-400">{unmatched.length} unmatched</span>
            <span className="text-gray-500">{biometricData.length} total</span>
          </div>
          {unmatched.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 mb-3">
              <p className="text-[10px] text-amber-300 font-medium mb-1">⚠ Unmatched records (will be skipped):</p>
              <div className="max-h-20 overflow-y-auto">
                {unmatched.slice(0, 10).map((r, i) => (
                  <p key={i} className="text-[10px] text-gray-400">{r.bioId || r.name} — {r.date}</p>
                ))}
                {unmatched.length > 10 && <p className="text-[10px] text-gray-500">+{unmatched.length - 10} more</p>}
              </div>
              <p className="text-[10px] text-gray-500 mt-1">💡 Set Biometric ID in Staff Roster → Edit to fix matching</p>
            </div>
          )}
          <table className="w-full text-[10px]">
            <thead><tr className="border-b border-gray-700">
              <th className="text-left py-1 px-1 text-gray-400">Staff</th>
              <th className="text-left py-1 px-1 text-gray-400">Date</th>
              <th className="text-left py-1 px-1 text-gray-400">In</th>
              <th className="text-left py-1 px-1 text-gray-400">Out</th>
              <th className="text-left py-1 px-1 text-gray-400">Match</th>
            </tr></thead>
            <tbody>{biometricData.slice(0, 20).map((r, i) => (
              <tr key={i} className="border-b border-gray-800/50">
                <td className="py-1 px-1 text-white">{r.name || r.bioId}</td>
                <td className="py-1 px-1 text-gray-400">{r.date}</td>
                <td className="py-1 px-1 text-gray-300">{r.clockIn || '-'}</td>
                <td className="py-1 px-1 text-gray-300">{r.clockOut || '-'}</td>
                <td className="py-1 px-1">{r.matched ? <span className="text-emerald-400">✓</span> : <span className="text-red-400">✗</span>}</td>
              </tr>
            ))}</tbody>
          </table>
          {biometricData.length > 20 && <p className="text-[10px] text-gray-500 mt-1">Showing 20 of {biometricData.length}</p>}
          <div className="flex gap-2 mt-3">
            <Button onClick={() => { setShowBiometricPreview(false); setBiometricData([]); }} variant="outline" className="flex-1 border-gray-700 text-gray-300 text-xs">Cancel</Button>
            <Button onClick={handleBiometricImportConfirm} disabled={matched.length === 0 || biometricImporting}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs">
              {biometricImporting ? 'Importing...' : `Import ${matched.length} Records`}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ============ MAIN RENDER ============

  const renderContent = () => {
    if (loading) return <div className="flex items-center justify-center py-16"><div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
    switch (activeTab) {
      case 'today': return renderToday();
      case 'roster': return renderRoster();
      case 'planner': return renderPlanner();
      case 'monthly': return renderMonthly();
      case 'payroll': return renderPayroll();
      case 'import-export': return renderImportExport();
    }
  };

  const sidebar = mode === 'doctor' ? (
    <DashboardSidebar activeMenu="staff-attendance" onMenuChange={onMenuChange} onLogout={onLogout} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activeAddOns={activeAddOns} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
  ) : (
    <ClinicSidebar activeMenu="staff-attendance" onMenuChange={onMenuChange} onLogout={onLogout} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activeAddOns={activeAddOns} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
      {sidebar}
      <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} flex flex-col min-h-screen relative`} style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
        <header className="bg-black/80 backdrop-blur-md border-b border-white/5 px-3 py-3 flex items-center gap-3 sticky top-0 z-50 lg:hidden">
          <Button variant="ghost" size="icon" className="text-blue-500 hover:bg-zinc-900 shrink-0" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></Button>
          <span className="text-xs font-medium text-white truncate">Staff Attendance</span>
        </header>

        <div className="p-3 sm:p-4 md:p-6 space-y-4" style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
          <div>
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-white">
              <Users className="w-5 h-5 text-emerald-400" />Staff Attendance
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>

          <div className="flex gap-1 bg-gray-900/50 rounded-xl p-1 border border-gray-800 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>
                <t.icon className="w-3.5 h-3.5" />{t.label}
              </button>
            ))}
          </div>

          {renderContent()}
        </div>
      </div>

      {renderStaffModal()}
      {renderCsvPreview()}
      {renderLeaveDetail()}
      {renderBiometricPreview()}
    </div>
  );
}
