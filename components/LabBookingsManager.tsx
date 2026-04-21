import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ClipboardList, Search, RefreshCw, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Beaker, Home, Footprints, Eye, AlertCircle,
  CalendarRange, CalendarDays, IndianRupee, UserCheck, Truck, X, Check,
  Bell, Star, RotateCcw, History, Upload, Lock, Heart, Mail, Calendar, FileText, AlertTriangle,
} from 'lucide-react';
import { Switch } from './ui/switch';
import { db, storage } from '../lib/firebase/config';
import {
  collection, query, where, onSnapshot, getDocs,
  doc, updateDoc, writeBatch, Timestamp, getDoc, addDoc, deleteDoc, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import FollowUpModal from './FollowUpModal';
import CancellationModal from './CancellationModal';
import RestorationModal from './RestorationModal';
import {
  scheduleBookingReminder,
  scheduleReviewRequest,
  sendFollowUp,
  sendAppointmentCancelled,
  sendAppointmentRestored,
  sendBatchCancellation,
  sendBatchRestoration,
} from '../services/notificationService';

/* ───────── Types ───────── */
interface LabBooking {
  id: string;
  bookingId: string;
  labId: string;
  labName: string;
  branchName: string;
  branchAddress: string;
  language: string;
  tests: {
    testId: string;
    testName: string;
    testCode: string;
    category: string;
    sampleType: string;
    price: number;
    discountedPrice: number;
    turnaroundTime: number;
    turnaroundUnit: string;
    preparation: string;
    isHomeCollection: boolean;
    homeCollectionCharge: number;
  }[];
  totalAmount: number;
  homeCollectionCharges: number;
  collectionType: 'walk-in' | 'home-collection';
  bookingDate: string;
  slotId: string | null;
  slotName: string;
  timeSlot: string;
  patientName: string;
  patientPhone: string;
  patientAge: string;
  patientGender: string;
  referringDoctor: string;
  lastFoodTime: string;
  rxImageUrl: string;
  serialNo?: number;
  status: string;
  bookingSource: string;
  homeAddress?: string;
  homeLandmark?: string;
  homePincode?: string;
  homeLocationUrl?: string;
  tokenNumber?: number;
  fcmToken?: string;
  createdAt: Timestamp;
  // New fields
  sampleCollected?: boolean;
  sampleCollectedAt?: string;
  sampleCollectedBy?: string;
  paymentReceived?: boolean;
  paymentDetails?: {
    mrp: number;
    discountPercent: number;
    discountedPrice: number;
    advancePaid: number;
    amountDue: number;
    paidAt: string;
  };
  allocatedPhlebo?: {
    id: string;
    name: string;
    phone?: string;
    allocatedAt: string;
  };
  isCancelled?: boolean;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationType?: string;
  restoredAt?: string;
  reminderScheduled?: boolean;
  reminderSent?: boolean;
  followUpScheduled?: boolean;
  followUpScheduledDate?: string;
  reviewScheduled?: boolean;
  reviewScheduledAt?: string;
  reportSent?: boolean;
  reportSentAt?: string;
  reportPdfUrl?: string;
  reportFileName?: string;
  reportSource?: 'uploaded-pdf' | 'template-builder';
  reportUploadedAt?: string;
}

interface Phlebotomist {
  id: string;
  name: string;
  phone?: string;
  status?: string;
}

type StatusFilter = 'all' | 'confirmed' | 'pending-phlebotomist' | 'sample-collected' | 'processing' | 'report-ready' | 'rejected';
type TabType = 'today' | 'advance';
type TodaySubTab = 'walk-in' | 'home-collection';
type RangePreset = '3days' | '7days' | 'custom';
type ReportChannelType = 'healqr-push' | 'whatsapp' | 'sms';
type ReportValueRow = {
  id: string;
  testName: string;
  value: string;
  unit: string;
};
type LabReportTemplate = {
  id: string;
  name: string;
  rows: Array<{ testName: string; unit: string }>;
  createdAt?: Timestamp;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  'confirmed': { label: 'Confirmed', color: 'text-blue-400', bg: 'bg-blue-500/15', icon: CheckCircle2 },
  'pending-phlebotomist': { label: 'Pending Phlebo', color: 'text-amber-400', bg: 'bg-amber-500/15', icon: Clock },
  'sample-collected': { label: 'Sample Collected', color: 'text-emerald-400', bg: 'bg-emerald-500/15', icon: Beaker },
  'processing': { label: 'Processing', color: 'text-purple-400', bg: 'bg-purple-500/15', icon: RefreshCw },
  'report-ready': { label: 'Report Ready', color: 'text-green-400', bg: 'bg-green-500/15', icon: CheckCircle2 },
  'rejected': { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/15', icon: XCircle },
};

function getLocalDateStr(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return getLocalDateStr(d);
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/* ───────── Component ───────── */
export default function LabBookingsManager({ labId }: { labId: string }) {
  const [allBookings, setAllBookings] = useState<LabBooking[]>([]);
  const [phlebotomists, setPhlebotomists] = useState<Phlebotomist[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [todaySubTab, setTodaySubTab] = useState<TodaySubTab>('walk-in');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);

  // Advance tab
  const [rangePreset, setRangePreset] = useState<RangePreset>('7days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Payment modal
  const [paymentModal, setPaymentModal] = useState<LabBooking | null>(null);
  const [pmDiscount, setPmDiscount] = useState(0);
  const [pmAdvance, setPmAdvance] = useState(0);
  const [pmSaving, setPmSaving] = useState(false);
  const [reportActionBooking, setReportActionBooking] = useState<LabBooking | null>(null);
  const [reportChannelIntegrated, setReportChannelIntegrated] = useState(false);
  const [reportChannelType, setReportChannelType] = useState<ReportChannelType | null>(null);
  const [channelSaving, setChannelSaving] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [reportUploadBusy, setReportUploadBusy] = useState(false);
  const [reportBuilderOpen, setReportBuilderOpen] = useState(false);
  const [reportRows, setReportRows] = useState<ReportValueRow[]>([]);
  const [reportBuilderBusy, setReportBuilderBusy] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showLoadTemplateModal, setShowLoadTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<LabReportTemplate[]>([]);
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
  const [deliveryWarningOpen, setDeliveryWarningOpen] = useState(false);
  const [labData, setLabData] = useState<any>(null);
  const reportUploadInputRef = useRef<HTMLInputElement | null>(null);

  // Cancel / Restore confirmation state (patient / slot / global)
  const [confirmAction, setConfirmAction] = useState<
    | null
    | {
        mode: 'cancel' | 'restore';
        scope: 'patient' | 'slot' | 'global';
        booking?: LabBooking;
        bookings?: LabBooking[];
        scopeLabel?: string;
      }
  >(null);

  // Phlebo allocation
  const [allocatingBookingId, setAllocatingBookingId] = useState<string | null>(null);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [selectedBookingForFollowUp, setSelectedBookingForFollowUp] = useState<LabBooking | null>(null);
  const reminderSchedulingRef = useRef<Set<string>>(new Set());

  const todayStr = getLocalDateStr();

  const inferUnitForTest = useCallback((testName: string): string => {
    const key = (testName || '').toLowerCase();
    if (key.includes('fbs') || key.includes('pp') || key.includes('sugar') || key.includes('glucose')) return 'mg/dL';
    if (key.includes('tsh')) return 'uIU/mL';
    if (key.includes('t3')) return 'ng/dL';
    if (key.includes('t4')) return 'ug/dL';
    if (key.includes('hba1c')) return '%';
    if (key.includes('hb') || key.includes('hemoglobin')) return 'g/dL';
    if (key.includes('creatinine')) return 'mg/dL';
    return '';
  }, []);

  const buildRowsFromBooking = useCallback((booking: LabBooking): ReportValueRow[] => {
    const base = (booking.tests || [])
      .map((t, i) => ({
        id: `test-${i + 1}`,
        testName: t.testName,
        value: '',
        unit: inferUnitForTest(t.testName),
      }))
      .filter((r) => !!r.testName);

    if (base.length > 0) return base;
    return [{ id: 'test-1', testName: '', value: '', unit: '' }];
  }, [inferUnitForTest]);

  const parseStartTimeFromSlot = useCallback((booking: LabBooking): string | null => {
    const raw = booking.timeSlot || booking.slotName;
    if (!raw) return null;
    const part = raw.split('-')[0]?.trim();
    if (!part) return null;
    const m = part.match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }, []);

  const getAppointmentDateTime = useCallback((booking: LabBooking): Date | null => {
    if (!booking.bookingDate) return null;
    const start = parseStartTimeFromSlot(booking);
    if (!start) return null;
    const [h, m] = start.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const dt = new Date(`${booking.bookingDate}T00:00:00`);
    dt.setHours(h, m, 0, 0);
    return dt;
  }, [parseStartTimeFromSlot]);

  /* ───── Migration ───── */
  useEffect(() => {
    if (!labId) return;
    const migKey = `healqr_lab_date_migrated_v2_${labId}`;
    if (localStorage.getItem(migKey)) return;

    (async () => {
      try {
        const q = query(collection(db, 'labBookings'), where('labId', '==', labId));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        let count = 0;
        const fixDate = new Date('2026-04-20T00:00:00');

        snap.docs.forEach((d) => {
          const data = d.data();
          const created = data.createdAt?.toDate?.();
          if (!created || !data.bookingDate) return;
          if (created < fixDate) {
            batch.update(d.ref, { bookingDate: addDays(data.bookingDate, 1) });
            count++;
          }
        });

        if (count > 0) {
          await batch.commit();
          toast.success(`Fixed ${count} booking dates`);
        }
        localStorage.setItem(migKey, 'true');
      } catch (err) {
        console.error('[LabBookings] Migration error:', err);
      }
    })();
  }, [labId]);

  /* ───── Realtime bookings ───── */
  useEffect(() => {
    if (!labId) { setLoading(false); return; }

    const q = query(collection(db, 'labBookings'), where('labId', '==', labId));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as LabBooking))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
      setAllBookings(data);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching bookings:', err);
      toast.error('Failed to load bookings');
      setLoading(false);
    });

    return () => unsub();
  }, [labId]);

  /* ───── Load phlebotomists ───── */
  useEffect(() => {
    if (!labId) return;
    const phlebCol = collection(db, 'labs', labId, 'phlebotomists');
    const unsub = onSnapshot(phlebCol, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Phlebotomist))
        .filter((p) => p.status !== 'inactive');
      setPhlebotomists(list);
    });
    return () => unsub();
  }, [labId]);

  useEffect(() => {
    if (!labId) return;

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'labs', labId));
        const data = snap.data() || {};
        setLabData(data);
        setReportChannelIntegrated(!!data.reportNotificationChannelIntegrated);
        setReportChannelType((data.reportNotificationChannelType as ReportChannelType) || null);
      } catch (err) {
        console.error('Failed to load report channel config:', err);
      }
    })();
  }, [labId]);

  useEffect(() => {
    if (!labId) return;

    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'labs', labId, 'labReportTemplates'), orderBy('createdAt', 'desc')));
        setSavedTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LabReportTemplate)));
      } catch (err) {
        console.error('Failed to load lab report templates:', err);
      }
    })();
  }, [labId]);

  useEffect(() => {
    if (!labId || allBookings.length === 0) return;

    const schedulePending = async () => {
      for (const booking of allBookings) {
        if (booking.reminderScheduled || booking.isCancelled || booking.status === 'rejected') continue;
        if (reminderSchedulingRef.current.has(booking.id)) continue;

        const appointmentDateTime = getAppointmentDateTime(booking);
        if (!appointmentDateTime) continue;

        const bookingCreatedAt = booking.createdAt?.toDate?.() || new Date();
        const diffHours = (appointmentDateTime.getTime() - bookingCreatedAt.getTime()) / (1000 * 60 * 60);
        if (diffHours < 6) continue;

        reminderSchedulingRef.current.add(booking.id);
        try {
          await scheduleBookingReminder({
            patientPhone: booking.patientPhone,
            patientName: booking.patientName,
            doctorId: booking.labId,
            doctorName: booking.labName || 'Lab',
            bookingId: booking.bookingId,
            appointmentDate: booking.bookingDate,
            appointmentTime: appointmentDateTime.toISOString(),
            appointmentTimeStr: parseStartTimeFromSlot(booking) || booking.timeSlot || booking.slotName,
            location: booking.branchName || booking.labName || 'Lab',
            clinicName: booking.branchName || booking.labName || 'Lab',
            chamber: booking.branchName || booking.labName || 'Lab',
            serialNumber: String(booking.serialNo || booking.tokenNumber || ''),
            language: booking.language || 'english',
            bookingCreatedAt: bookingCreatedAt.toISOString(),
            body: `Reminder: Your lab appointment with ${booking.labName || 'the lab'} is in 1 hour.`,
          });

          await updateDoc(doc(db, 'labBookings', booking.id), {
            reminderScheduled: true,
            reminderScheduledAt: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Failed to schedule reminder for booking:', booking.id, err);
        } finally {
          reminderSchedulingRef.current.delete(booking.id);
        }
      }
    };

    schedulePending();
  }, [allBookings, labId, getAppointmentDateTime, parseStartTimeFromSlot]);

  /* ───── Computed bookings ───── */
  const getAdvanceRange = (): { start: string; end: string } => {
    const tomorrow = addDays(todayStr, 1);
    if (rangePreset === '3days') return { start: tomorrow, end: addDays(todayStr, 3) };
    if (rangePreset === '7days') return { start: tomorrow, end: addDays(todayStr, 7) };
    return { start: customStart || tomorrow, end: customEnd || addDays(todayStr, 30) };
  };

  const todayBookings = allBookings.filter((b) => b.bookingDate === todayStr);
  const advanceRange = getAdvanceRange();
  const advanceBookings = allBookings.filter(
    (b) => b.bookingDate >= advanceRange.start && b.bookingDate <= advanceRange.end
  );

  const tabBookings = activeTab === 'today' ? todayBookings : advanceBookings;

  // Apply filters
  const filtered = tabBookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return b.patientName?.toLowerCase().includes(q) || b.patientPhone?.includes(q) || b.bookingId?.toLowerCase().includes(q);
    }
    return true;
  });

  // Split today by type
  const todayWalkIn = filtered.filter((b) => b.collectionType === 'walk-in');
  const todayHome = filtered.filter((b) => b.collectionType === 'home-collection');

  // Group advance by date, then by type within date
  const groupedByDate = activeTab === 'advance'
    ? filtered.reduce<Record<string, LabBooking[]>>((acc, b) => {
        if (!acc[b.bookingDate]) acc[b.bookingDate] = [];
        acc[b.bookingDate].push(b);
        return acc;
      }, {})
    : null;
  const sortedDates = groupedByDate ? Object.keys(groupedByDate).sort() : [];

  /* ───── Stats ───── */
  const stats = {
    total: tabBookings.length,
    walkIn: tabBookings.filter((b) => b.collectionType === 'walk-in').length,
    homeCollection: tabBookings.filter((b) => b.collectionType === 'home-collection').length,
    pendingPhlebo: tabBookings.filter((b) => b.collectionType === 'home-collection' && !b.allocatedPhlebo).length,
  };

  /* ───── Actions ───── */
  const updateBookingStatus = useCallback(async (bookingDocId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'labBookings', bookingDocId), { status: newStatus });
      toast.success(`Status → ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    }
  }, []);

  const toggleSampleCollected = useCallback(async (booking: LabBooking) => {
    const newVal = !booking.sampleCollected;
    try {
      const updates: any = {
        sampleCollected: newVal,
        sampleCollectedAt: newVal ? new Date().toISOString() : null,
        sampleCollectedBy: newVal ? 'lab-assistant' : null,
      };
      if (newVal) updates.status = 'sample-collected';
      if (newVal) {
        updates.reviewScheduled = true;
        updates.reviewScheduledAt = new Date().toISOString();
      }
      await updateDoc(doc(db, 'labBookings', booking.id), updates);

      if (newVal) {
        try {
          await scheduleReviewRequest({
            patientPhone: booking.patientPhone,
            patientName: booking.patientName,
            doctorName: booking.labName || 'Lab',
            doctorId: booking.labId,
            bookingId: booking.bookingId,
            consultationDate: booking.bookingDate,
            chamber: booking.branchName || booking.labName || 'Lab',
            clinicName: booking.branchName || booking.labName || 'Lab',
            purpose: 'Lab sample collection',
            language: booking.language || 'english',
          }, new Date());
        } catch (reviewErr) {
          console.error('Review scheduling failed:', reviewErr);
        }
      }

      toast.success(newVal ? 'Sample collected' : 'Sample unchecked');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to update');
    }
  }, []);

  const openFollowUpModal = useCallback((booking: LabBooking) => {
    if (!booking.sampleCollected || booking.isCancelled) {
      toast.info('Follow-up becomes available after sample collection is marked done');
      return;
    }
    setSelectedBookingForFollowUp(booking);
    setFollowUpModalOpen(true);
  }, []);

  const saveFollowUp = useCallback(async (days: number, message: string) => {
    if (!selectedBookingForFollowUp) return;

    const booking = selectedBookingForFollowUp;
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + days);

    try {
      await updateDoc(doc(db, 'labBookings', booking.id), {
        followUpScheduled: true,
        followUpScheduledDate: followUpDate.toISOString(),
        followUpMessage: message,
        followUpScheduledAt: new Date().toISOString(),
      });

      await sendFollowUp({
        patientPhone: booking.patientPhone,
        patientName: booking.patientName,
        doctorId: booking.labId,
        doctorName: booking.labName || 'Lab',
        doctorSpecialty: 'Diagnostic Lab',
        chamber: booking.branchName || booking.labName || 'Lab',
        clinicName: booking.branchName || booking.labName || 'Lab',
        bookingId: booking.bookingId,
        followUpDate: followUpDate.toISOString(),
        followUpDays: days,
        customMessage: message,
        purpose: 'Lab follow-up',
        language: booking.language || 'english',
      });

      toast.success('Follow-up scheduled and patient will be notified 72 hours before');
    } catch (err) {
      console.error('Failed to save follow-up:', err);
      toast.error('Failed to schedule follow-up');
    } finally {
      setFollowUpModalOpen(false);
      setSelectedBookingForFollowUp(null);
    }
  }, [selectedBookingForFollowUp]);

  const cancelSingleBooking = useCallback(async (booking: LabBooking) => {
    if (booking.sampleCollected) {
      toast.info('Cannot cancel after sample is collected');
      return;
    }

    try {
      await updateDoc(doc(db, 'labBookings', booking.id), {
        isCancelled: true,
        status: 'rejected',
        cancellationType: 'LAB_PATIENT_TOGGLE',
        cancelledBy: 'lab',
        cancelledAt: new Date().toISOString(),
      });

      await sendAppointmentCancelled({
        patientPhone: booking.patientPhone,
        patientName: booking.patientName,
        doctorId: booking.labId,
        doctorName: booking.labName || 'Lab',
        clinicName: booking.branchName || booking.labName || 'Lab',
        chamber: booking.branchName || booking.labName || 'Lab',
        bookingId: booking.bookingId,
        appointmentDate: booking.bookingDate,
        appointmentTime: parseStartTimeFromSlot(booking) || booking.timeSlot || booking.slotName,
        message: 'Your lab booking has been cancelled by the lab. Please rebook from HealQR.',
        scope: 'patient',
        language: booking.language || 'english',
      });

      toast.success('Booking cancelled and patient notified');
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      toast.error('Failed to cancel booking');
    }
  }, [parseStartTimeFromSlot]);

  const restoreSingleBooking = useCallback(async (booking: LabBooking) => {
    try {
      await updateDoc(doc(db, 'labBookings', booking.id), {
        isCancelled: false,
        status: 'confirmed',
        restoredAt: new Date().toISOString(),
      });

      await sendAppointmentRestored({
        patientPhone: booking.patientPhone,
        patientName: booking.patientName,
        doctorId: booking.labId,
        doctorName: booking.labName || 'Lab',
        clinicName: booking.branchName || booking.labName || 'Lab',
        chamber: booking.branchName || booking.labName || 'Lab',
        bookingId: booking.bookingId,
        appointmentDate: booking.bookingDate,
        appointmentTime: parseStartTimeFromSlot(booking) || booking.timeSlot || booking.slotName,
        tokenNumber: `#${booking.serialNo || booking.tokenNumber || 1}`,
        message: 'Your lab booking has been restored and confirmed again.',
        scope: 'patient',
        language: booking.language || 'english',
      });

      toast.success('Booking restored and patient notified');
    } catch (err) {
      console.error('Failed to restore booking:', err);
      toast.error('Failed to restore booking');
    }
  }, [parseStartTimeFromSlot]);

  const allocatePhlebo = useCallback(async (bookingId: string, phlebo: Phlebotomist) => {
    try {
      await updateDoc(doc(db, 'labBookings', bookingId), {
        allocatedPhlebo: {
          id: phlebo.id,
          name: phlebo.name,
          phone: phlebo.phone || '',
          allocatedAt: new Date().toISOString(),
        },
        status: 'confirmed',
      });
      toast.success(`Allocated to ${phlebo.name}`);
      setAllocatingBookingId(null);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to allocate');
    }
  }, []);

  const deallocatePhlebo = useCallback(async (bookingId: string) => {
    try {
      await updateDoc(doc(db, 'labBookings', bookingId), {
        allocatedPhlebo: null,
        status: 'pending-phlebotomist',
      });
      toast.success('Phlebotomist removed');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to update');
    }
  }, []);

  const toggleSlotBookings = useCallback(async (bookings: LabBooking[], cancelMode: boolean, scopeLabel: string) => {
    const candidates = bookings.filter((b) => cancelMode ? !b.sampleCollected : !!b.isCancelled);
    if (candidates.length === 0) {
      toast.info(cancelMode ? 'No cancellable bookings in this slot' : 'No cancelled bookings to restore');
      return;
    }

    try {
      const batch = writeBatch(db);
      candidates.forEach((b) => {
        batch.update(doc(db, 'labBookings', b.id), cancelMode ? {
          isCancelled: true,
          status: 'rejected',
          cancellationType: 'LAB_SLOT_TOGGLE',
          cancelledBy: 'lab',
          cancelledAt: new Date().toISOString(),
        } : {
          isCancelled: false,
          status: 'confirmed',
          restoredAt: new Date().toISOString(),
        });
      });
      await batch.commit();

      const patients = candidates.map((b) => ({
        patientPhone: b.patientPhone,
        patientName: b.patientName,
        language: b.language || 'english',
        tokenNumber: `#${b.serialNo || b.tokenNumber || 1}`,
      }));
      const bookingDetails = {
        appointmentDate: candidates[0]?.bookingDate || todayStr,
        appointmentTime: parseStartTimeFromSlot(candidates[0]) || candidates[0]?.timeSlot || candidates[0]?.slotName || '',
      };
      const doctorInfo = { doctorName: candidates[0]?.labName || 'Lab' };

      if (cancelMode) {
        await sendBatchCancellation(patients, doctorInfo, scopeLabel, 'chamber', bookingDetails);
      } else {
        await sendBatchRestoration(patients, doctorInfo, scopeLabel, 'chamber', bookingDetails);
      }

      toast.success(cancelMode ? `Slot cancelled (${candidates.length}) and patients notified` : `Slot restored (${candidates.length}) and patients notified`);
    } catch (err) {
      console.error('Slot toggle failed:', err);
      toast.error('Slot toggle failed');
    }
  }, [todayStr, parseStartTimeFromSlot]);

  /* ───── Payment Modal Logic ───── */
  const openPaymentModal = (booking: LabBooking) => {
    setPaymentModal(booking);
    const existing = booking.paymentDetails;
    if (existing) {
      setPmDiscount(existing.discountPercent || 0);
      setPmAdvance(existing.advancePaid || 0);
    } else {
      setPmDiscount(0);
      setPmAdvance(0);
    }
  };

  const getPaymentCalc = (booking: LabBooking) => {
    const mrp = booking.totalAmount + (booking.homeCollectionCharges || 0);
    const discAmt = Math.round(mrp * (pmDiscount / 100));
    const discountedPrice = mrp - discAmt;
    const amountDue = Math.max(0, discountedPrice - pmAdvance);
    return { mrp, discountedPrice, amountDue };
  };

  const savePayment = async () => {
    if (!paymentModal) return;
    setPmSaving(true);
    const { mrp, discountedPrice, amountDue } = getPaymentCalc(paymentModal);
    try {
      await updateDoc(doc(db, 'labBookings', paymentModal.id), {
        paymentReceived: amountDue === 0,
        paymentDetails: {
          mrp,
          discountPercent: pmDiscount,
          discountedPrice,
          advancePaid: pmAdvance,
          amountDue,
          paidAt: new Date().toISOString(),
        },
      });
      toast.success(amountDue === 0 ? 'Full payment recorded' : `Partial payment — ₹${amountDue} due`);
      setPaymentModal(null);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to save payment');
    } finally {
      setPmSaving(false);
    }
  };

  const sendReportNotification = useCallback(async (booking: LabBooking) => {
    if (!booking.reportPdfUrl) {
      toast.info('Upload report PDF or create report from builder before sending');
      return;
    }
    if (booking.status !== 'report-ready') {
      toast.info('Mark report ready before sending notification');
      return;
    }

    setSendingReport(true);
    try {
      await sendFollowUp({
        patientPhone: booking.patientPhone,
        patientName: booking.patientName,
        doctorId: booking.labId,
        doctorName: booking.labName || 'Lab',
        chamber: booking.branchName || booking.labName || 'Lab',
        clinicName: booking.branchName || booking.labName || 'Lab',
        bookingId: booking.bookingId,
        followUpDate: new Date().toISOString(),
        followUpDays: 0,
        customMessage: `Your lab report is ready. Please open HealQR Notifications > Reports to view and download.`,
        purpose: 'Lab report ready',
        language: booking.language || 'english',
      });

      await updateDoc(doc(db, 'labBookings', booking.id), {
        reportSent: true,
        reportSentAt: new Date().toISOString(),
        paymentStatusAtDelivery: booking.paymentReceived ? 'received' : 'pending',
      });
      toast.success('Report ready notification sent to patient');
      setReportPreviewOpen(false);
      setDeliveryWarningOpen(false);
      setReportActionBooking(null);
    } catch (err) {
      console.error('Failed to send report notification:', err);
      toast.error('Failed to send report notification');
    } finally {
      setSendingReport(false);
    }
  }, []);

  const uploadReportPdfToBooking = useCallback(async (
    booking: LabBooking,
    fileBlob: Blob,
    fileName: string,
    source: 'uploaded-pdf' | 'template-builder',
  ) => {
    if (!labId || !storage) {
      toast.error('Unable to upload report: Lab session unavailable');
      return;
    }

    setReportUploadBusy(true);
    try {
      const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `labs/${labId}/reports/${booking.id}/${Date.now()}_${safeFileName}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, fileBlob, { contentType: 'application/pdf' });
      const downloadUrl = await getDownloadURL(storageRef);

      const payload = {
        reportPdfUrl: downloadUrl,
        reportFileName: safeFileName,
        reportSource: source,
        reportUploadedAt: new Date().toISOString(),
        reportSent: false,
      };

      await updateDoc(doc(db, 'labBookings', booking.id), payload);
      setReportActionBooking((prev) => prev && prev.id === booking.id ? { ...prev, ...payload } : prev);
      toast.success(source === 'uploaded-pdf' ? 'Report PDF uploaded' : 'Report created and attached');
    } catch (err) {
      console.error('Report upload failed:', err);
      toast.error('Failed to attach report PDF');
    } finally {
      setReportUploadBusy(false);
    }
  }, [labId]);

  const handleReportFilePicked = useCallback(async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    evt.target.value = '';
    if (!file || !reportActionBooking) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF report files are allowed');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Report file must be under 8MB');
      return;
    }

    await uploadReportPdfToBooking(reportActionBooking, file, file.name || `report_${reportActionBooking.bookingId}.pdf`, 'uploaded-pdf');
  }, [reportActionBooking, uploadReportPdfToBooking]);

  const createTemplateReportPdf = useCallback(async () => {
    if (!reportActionBooking) return;
    const rowsWithValues = reportRows.filter((r) => r.testName.trim() && r.value.trim());
    if (rowsWithValues.length === 0) {
      toast.info('Please enter at least one test value');
      return;
    }

    setReportBuilderBusy(true);
    try {
      const { jsPDF } = await import('jspdf');
      const QRCode = (await import('qrcode')).default;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 14;

      // ─── HEADER: Lab info (left) + QR (top-right) ───
      let y = 18;
      const labName = (labData?.name || reportActionBooking.labName || 'HealQR Lab').toUpperCase();
      const labAddress = labData?.address || labData?.fullAddress || '';
      const labPhone = labData?.phone || labData?.contactNumber || '';
      const labReg = labData?.registrationNumber || labData?.regNo || '';

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(30, 41, 59);
      pdf.text(labName, margin, y);
      y += 7;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(100);
      if (labAddress) {
        const addrLines = pdf.splitTextToSize(labAddress, pageWidth / 2 - margin);
        pdf.text(addrLines, margin, y);
        y += addrLines.length * 4 + 1;
      }
      if (labPhone) { pdf.text(`Tel: ${labPhone}`, margin, y); y += 4; }
      if (labReg) { pdf.text(`REG NO: ${labReg}`, margin, y); y += 4; }

      // QR top-right
      const qrSize = 32;
      const qrX = pageWidth - margin - qrSize;
      const qrY = 18;
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(40);
      pdf.text('FOR NEXT BOOKING SCAN HERE', qrX + qrSize / 2, qrY - 3, { align: 'center' });
      try {
        const qrUrl = `https://teamhealqr.web.app/?page=lab-mini-website&labId=${labId}`;
        const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 200 });
        pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      } catch (qrErr) {
        console.warn('QR generation failed:', qrErr);
      }

      const headerEndY = Math.max(y + 3, qrY + qrSize + 4);
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.5);
      pdf.line(margin, headerEndY, pageWidth - margin, headerEndY);

      // ─── PATIENT INFO ROW ───
      y = headerEndY + 7;
      pdf.setFontSize(10);
      pdf.setTextColor(60);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Patient:', margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(reportActionBooking.patientName || ''), margin + 18, y);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Age/Sex:', margin + 90, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${reportActionBooking.patientAge || '-'}/${reportActionBooking.patientGender || '-'}`, margin + 108, y);

      y += 6;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Booking ID:', margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(reportActionBooking.bookingId || ''), margin + 24, y);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Date:', margin + 90, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${reportActionBooking.bookingDate || ''}  ${reportActionBooking.timeSlot || reportActionBooking.slotName || ''}`, margin + 102, y);
      y += 7;

      pdf.setDrawColor(220);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 6;

      // ─── RESULTS TABLE ───
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Patient Lab Results', margin, y);
      y += 4;

      const tableWidth = pageWidth - margin * 2;
      pdf.setDrawColor(80, 80, 80);
      pdf.setFillColor(240, 240, 245);
      pdf.rect(margin, y, tableWidth, 8, 'FD');
      pdf.setFontSize(9);
      pdf.setTextColor(40);
      pdf.text('Test', margin + 2, y + 5.5);
      pdf.text('Value', margin + tableWidth * 0.55, y + 5.5);
      pdf.text('Unit', margin + tableWidth * 0.8, y + 5.5);
      y += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(60);
      rowsWithValues.forEach((row) => {
        if (y > 265) {
          pdf.addPage();
          y = 20;
        }
        pdf.rect(margin, y, tableWidth, 8);
        pdf.text(String(row.testName), margin + 2, y + 5.5);
        pdf.text(String(row.value), margin + tableWidth * 0.55, y + 5.5);
        pdf.text(String(row.unit || '-'), margin + tableWidth * 0.8, y + 5.5);
        y += 8;
      });

      y += 8;
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8);
      pdf.setTextColor(120);
      pdf.text('Please correlate clinically before final treatment decision.', margin, y);

      // Footer
      const footerY = pdf.internal.pageSize.getHeight() - 10;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(150);
      pdf.text('Generated via HealQR', pageWidth / 2, footerY, { align: 'center' });

      const blob = pdf.output('blob');
      const fileName = `Report_${reportActionBooking.bookingId}.pdf`;
      await uploadReportPdfToBooking(reportActionBooking, blob, fileName, 'template-builder');
      setReportBuilderOpen(false);
    } catch (err) {
      console.error('Template report generation failed:', err);
      toast.error('Failed to create template report');
    } finally {
      setReportBuilderBusy(false);
    }
  }, [reportActionBooking, reportRows, uploadReportPdfToBooking]);

  const saveAsTemplate = useCallback(async () => {
    if (!labId) return;
    if (!templateName.trim()) {
      toast.info('Please enter a template name');
      return;
    }

    const templateRows = reportRows
      .filter((r) => r.testName.trim())
      .map((r) => ({ testName: r.testName.trim(), unit: r.unit.trim() }));

    if (templateRows.length === 0) {
      toast.info('Add at least one test in builder before saving template');
      return;
    }

    setTemplateSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'labs', labId, 'labReportTemplates'), {
        name: templateName.trim(),
        rows: templateRows,
        createdAt: serverTimestamp(),
      });

      const created: LabReportTemplate = {
        id: docRef.id,
        name: templateName.trim(),
        rows: templateRows,
      };
      setSavedTemplates((prev) => [created, ...prev]);
      setShowSaveTemplateModal(false);
      setTemplateName('');
      toast.success(`Template "${created.name}" saved`);
    } catch (err) {
      console.error('Failed to save report template:', err);
      toast.error('Failed to save template');
    } finally {
      setTemplateSaving(false);
    }
  }, [labId, templateName, reportRows]);

  const loadTemplate = useCallback((template: LabReportTemplate) => {
    const mapped = (template.rows || []).map((r, i) => ({
      id: `tpl-${i + 1}`,
      testName: r.testName,
      value: '',
      unit: r.unit || inferUnitForTest(r.testName),
    }));
    setReportRows(mapped.length > 0 ? mapped : [{ id: 'test-1', testName: '', value: '', unit: '' }]);
    setShowLoadTemplateModal(false);
    setReportBuilderOpen(true);
    toast.success(`Template "${template.name}" loaded`);
  }, [inferUnitForTest]);

  const deleteTemplate = useCallback(async (templateId: string) => {
    if (!labId) return;
    try {
      await deleteDoc(doc(db, 'labs', labId, 'labReportTemplates', templateId));
      setSavedTemplates((prev) => prev.filter((t) => t.id !== templateId));
      toast.success('Template deleted');
    } catch (err) {
      console.error('Failed to delete template:', err);
      toast.error('Failed to delete template');
    }
  }, [labId]);

  const updateRow = useCallback((id: string, field: keyof ReportValueRow, value: string) => {
    setReportRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  }, []);

  const addCustomRow = useCallback(() => {
    setReportRows((prev) => [...prev, { id: `test-${Date.now()}`, testName: '', value: '', unit: '' }]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setReportRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length > 0 ? next : [{ id: 'test-1', testName: '', value: '', unit: '' }];
    });
  }, []);

  const integrateReportChannel = useCallback(async (channel: ReportChannelType) => {
    if (!labId) return;

    setChannelSaving(true);
    try {
      await updateDoc(doc(db, 'labs', labId), {
        reportNotificationChannelIntegrated: true,
        reportNotificationChannelType: channel,
        reportNotificationChannelUpdatedAt: new Date().toISOString(),
      });
      setReportChannelIntegrated(true);
      setReportChannelType(channel);
      toast.success(`Channel integrated: ${channel.toUpperCase()}`);
    } catch (err) {
      console.error('Failed to integrate report channel:', err);
      toast.error('Failed to integrate channel');
    } finally {
      setChannelSaving(false);
    }
  }, [labId]);

  const renderMicroActions = (booking: LabBooking) => {
    const reminderEligible = (() => {
      const appointmentDateTime = getAppointmentDateTime(booking);
      if (!appointmentDateTime) return false;
      const createdAt = booking.createdAt?.toDate?.() || new Date();
      return ((appointmentDateTime.getTime() - createdAt.getTime()) / (1000 * 60 * 60)) >= 6;
    })();

    const canFollowUp = !!booking.sampleCollected && !booking.isCancelled;
    const canCancel = !booking.sampleCollected && !booking.isCancelled;

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          <div
            className={`relative h-10 rounded-lg flex items-center justify-center border ${
              reminderEligible
                ? (booking.reminderSent ? 'bg-blue-500/30 border-blue-500/50' : 'bg-blue-500/10 border-blue-500/30')
                : 'bg-zinc-800 border-zinc-700 opacity-50'
            }`}
            title={reminderEligible ? 'Reminder scheduled 1 hour before' : 'Not eligible (booking within 6 hours)'}
          >
            <Bell className="w-4 h-4 text-blue-400" />
            {(booking.reminderScheduled || booking.reminderSent) && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-zinc-900">
                <Check className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>

          <button
            onClick={() => openFollowUpModal(booking)}
            disabled={!canFollowUp || !!booking.followUpScheduled}
            className={`relative h-10 rounded-lg flex items-center justify-center border transition-colors ${
              !canFollowUp
                ? 'bg-zinc-800 border-zinc-700 opacity-50 cursor-not-allowed'
                : booking.followUpScheduled
                ? 'bg-purple-500/30 border-purple-500/50'
                : 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20'
            }`}
            title="Schedule follow-up"
          >
            <Calendar className="w-4 h-4 text-purple-400" />
          </button>

          <div
            className={`relative h-10 rounded-lg flex items-center justify-center border ${
              booking.reviewScheduled ? 'bg-yellow-500/30 border-yellow-500/50' : 'bg-yellow-500/10 border-yellow-500/30 opacity-50'
            }`}
            title={booking.reviewScheduled ? 'Review request scheduled (24h after done)' : 'Activates after sample done'}
          >
            <Star className="w-4 h-4 text-yellow-400" />
          </div>

          {!booking.isCancelled ? (
            <button
              onClick={() => setConfirmAction({ mode: 'cancel', scope: 'patient', booking })}
              disabled={!canCancel}
              className={`col-span-1 sm:col-span-2 h-10 rounded-lg flex items-center justify-center gap-2 border transition-colors ${
                canCancel ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20' : 'bg-zinc-800 border-zinc-700 opacity-50 cursor-not-allowed'
              }`}
              title="Cancel booking"
            >
              <X className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-400 hidden sm:inline">Cancel</span>
            </button>
          ) : (
            <button
              onClick={() => setConfirmAction({ mode: 'restore', scope: 'patient', booking })}
              className="col-span-1 sm:col-span-2 h-10 rounded-lg flex items-center justify-center gap-2 border bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
              title="Restore booking"
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-cyan-400 hidden sm:inline">Restore</span>
            </button>
          )}

          <button
            onClick={() => {
              setReportActionBooking(booking);
              setReportBuilderOpen(false);
              setReportRows(buildRowsFromBooking(booking));
              setReportPreviewOpen(false);
              setDeliveryWarningOpen(false);
              setShowLoadTemplateModal(false);
              setShowSaveTemplateModal(false);
              setTemplateName('');
            }}
            disabled={booking.status !== 'report-ready' || !!booking.isCancelled}
            className={`h-10 rounded-lg flex items-center justify-center border transition-colors ${
              booking.status === 'report-ready' && !booking.isCancelled
                ? 'bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20'
                : 'bg-zinc-800 border-zinc-700 opacity-50 cursor-not-allowed'
            }`}
            title={booking.status === 'report-ready' ? 'Report ready: send notification' : 'Available when report is ready'}
          >
            <div className="relative">
              <Mail className="w-4 h-4 text-indigo-400" />
              {booking.reportSent && (
                <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-zinc-900" />
              )}
            </div>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => toast.info('History viewer opens here')} className="h-10 bg-zinc-800/60 border border-zinc-700 rounded-lg flex items-center justify-center hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors" title="History">
            <History className="w-4 h-4 text-emerald-400" />
          </button>
          <button onClick={() => toast.info('Upload flow remains reserved for Medico Locker integration')} className="h-10 bg-zinc-800/60 border border-zinc-700 rounded-lg flex items-center justify-center hover:bg-blue-500/10 hover:border-blue-500/30 transition-colors" title="Upload">
            <Upload className="w-4 h-4 text-blue-400" />
          </button>
          <button onClick={() => toast.info('Locker access integration remains unchanged')} className="h-10 bg-zinc-800/60 border border-zinc-700 rounded-lg flex items-center justify-center hover:bg-amber-500/10 hover:border-amber-500/30 transition-colors" title="Locker">
            <Lock className="w-4 h-4 text-amber-400" />
          </button>
          <button onClick={() => toast.success(`${booking.patientName} flagged for chronic care segment`)} className="h-10 bg-zinc-800/60 border border-zinc-700 rounded-lg flex items-center justify-center hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors" title="Chronic Care">
            <Heart className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </div>
    );
  };

  /* ───── Render helpers ───── */

  const renderCheckboxes = (booking: LabBooking) => {
    const isHome = booking.collectionType === 'home-collection';

    return (
      <div className="flex items-center gap-4 mt-2">
        {/* Sample Collected Checkbox */}
        <label className={`flex items-center gap-2 text-xs cursor-pointer select-none ${
          isHome && !booking.allocatedPhlebo ? 'opacity-40 pointer-events-none' : ''
        }`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isHome) return; // Read-only for home — phlebo updates this
              toggleSampleCollected(booking);
            }}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
              booking.sampleCollected
                ? 'bg-emerald-600 border-emerald-600'
                : 'border-zinc-600 hover:border-emerald-500'
            } ${isHome ? 'cursor-default' : 'cursor-pointer'}`}
          >
            {booking.sampleCollected && <Check className="w-3.5 h-3.5 text-white" />}
          </button>
          <span className={`${booking.sampleCollected ? 'text-emerald-400' : 'text-gray-400'}`}>
            Sample{isHome ? ' (Phlebo)' : ' Collected'}
          </span>
        </label>

        {/* Payment Received Checkbox */}
        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openPaymentModal(booking);
            }}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
              booking.paymentReceived
                ? 'bg-blue-600 border-blue-600'
                : 'border-zinc-600 hover:border-blue-500'
            } cursor-pointer`}
          >
            {booking.paymentReceived && <Check className="w-3.5 h-3.5 text-white" />}
          </button>
          <span className={`${booking.paymentReceived ? 'text-blue-400' : 'text-gray-400'}`}>
            Payment{booking.paymentDetails ? ` (₹${booking.paymentDetails.amountDue} due)` : ''}
          </span>
        </label>
      </div>
    );
  };

  const renderPhleboBadge = (booking: LabBooking) => {
    if (booking.collectionType !== 'home-collection') return null;

    if (booking.allocatedPhlebo) {
      return (
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/15 text-teal-400 text-[11px] font-medium">
            <Truck className="w-3 h-3" />
            {booking.allocatedPhlebo.name}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAllocatingBookingId(booking.id);
            }}
            className="text-[10px] text-purple-400 hover:text-purple-300 underline"
          >
            Re-allocate
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deallocatePhlebo(booking.id);
            }}
            className="text-[10px] text-red-400 hover:text-red-300 underline"
          >
            Remove
          </button>
        </div>
      );
    }

    return (
      <div className="mt-2">
        {allocatingBookingId === booking.id ? (
          <div className="flex items-center gap-2 flex-wrap">
            {phlebotomists.length === 0 ? (
              <span className="text-[11px] text-amber-400">No phlebotomists added yet. Add from Phlebotomist Manager.</span>
            ) : (
              phlebotomists.map((p) => (
                <button
                  key={p.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    allocatePhlebo(booking.id, p);
                  }}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-[11px] rounded-md font-medium transition-colors"
                >
                  {p.name}
                </button>
              ))
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAllocatingBookingId(null);
              }}
              className="px-2 py-1 text-zinc-400 hover:text-white text-[11px]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAllocatingBookingId(booking.id);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 text-amber-400 rounded-lg text-[11px] font-medium hover:bg-amber-500/25 transition-colors"
          >
            <UserCheck className="w-3 h-3" /> Allocate Phlebo
          </button>
        )}
      </div>
    );
  };

  /* ───── Booking Card ───── */
  const renderBookingCard = (booking: LabBooking, showDate = false) => {
    const statusCfg = STATUS_CONFIG[booking.status] || {
      label: booking.status, color: 'text-gray-400', bg: 'bg-zinc-800', icon: AlertCircle,
    };
    const StatusIcon = statusCfg.icon;
    const isExpanded = expandedBooking === booking.id;
    const isHome = booking.collectionType === 'home-collection';

    return (
      <div key={booking.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {/* Summary */}
        <div className="px-4 py-3">
          <button
            onClick={() => setExpandedBooking(isExpanded ? null : booking.id)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 bg-purple-500/15 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-purple-400 font-bold text-sm">{booking.serialNo || '#'}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium text-sm truncate">{booking.patientName}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                    <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                  </span>
                  {isHome ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400">
                      <Home className="w-3 h-3" /> Home
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 text-blue-400">
                      <Footprints className="w-3 h-3" /> Walk-in
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                  <span>{booking.patientPhone}</span>
                  <span>•</span>
                  <span>{booking.tests?.length || 0} test{(booking.tests?.length || 0) !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>₹{booking.totalAmount + (booking.homeCollectionCharges || 0)}</span>
                  <span>•</span>
                  <span>{booking.timeSlot || booking.slotName}</span>
                  {showDate && <><span>•</span><span>{booking.bookingDate}</span></>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-purple-400 font-medium">View Patient</span>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </div>
          </button>

          {/* Checkboxes + Phlebo badge — always visible */}
          {renderCheckboxes(booking)}
          {renderPhleboBadge(booking)}
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="border-t border-zinc-800 px-4 py-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Booking ID</p>
                <p className="text-purple-400 font-mono text-xs mt-0.5">{booking.bookingId}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Age / Gender</p>
                <p className="text-white text-sm mt-0.5">{booking.patientAge} / {booking.patientGender}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Branch</p>
                <p className="text-white text-sm mt-0.5">{booking.branchName}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Booking Date</p>
                <p className="text-white text-sm mt-0.5">{booking.bookingDate}</p>
              </div>
              {booking.referringDoctor && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Referring Doctor</p>
                  <p className="text-white text-sm mt-0.5">{booking.referringDoctor}</p>
                </div>
              )}
              {booking.lastFoodTime && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Last Food Time</p>
                  <p className="text-white text-sm mt-0.5">{booking.lastFoodTime}</p>
                </div>
              )}
              {isHome && booking.homeAddress && (
                <div className="col-span-2">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Home Address</p>
                  <p className="text-white text-sm mt-0.5">
                    {booking.homeAddress}
                    {booking.homeLandmark && `, ${booking.homeLandmark}`}
                    {booking.homePincode && ` - ${booking.homePincode}`}
                  </p>
                </div>
              )}
              {/* Payment Summary */}
              {booking.paymentDetails && (
                <div className="col-span-2 sm:col-span-4 bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Payment Details</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <span className="text-gray-400">MRP: <span className="text-white font-medium">₹{booking.paymentDetails.mrp}</span></span>
                    {booking.paymentDetails.discountPercent > 0 && (
                      <span className="text-gray-400">Discount: <span className="text-emerald-400">{booking.paymentDetails.discountPercent}%</span></span>
                    )}
                    <span className="text-gray-400">After Discount: <span className="text-white font-medium">₹{booking.paymentDetails.discountedPrice}</span></span>
                    <span className="text-gray-400">Advance: <span className="text-blue-400">₹{booking.paymentDetails.advancePaid}</span></span>
                    <span className={`font-bold ${booking.paymentDetails.amountDue === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      Due: ₹{booking.paymentDetails.amountDue}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Tests Table */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Tests Ordered</p>
              <div className="bg-zinc-800/50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-[10px] uppercase">
                      <th className="text-left px-3 py-2">Test</th>
                      <th className="text-left px-3 py-2 hidden sm:table-cell">Category</th>
                      <th className="text-left px-3 py-2 hidden sm:table-cell">Sample</th>
                      <th className="text-left px-3 py-2 hidden md:table-cell">TAT</th>
                      <th className="text-right px-3 py-2">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booking.tests?.map((test, i) => (
                      <tr key={i} className="border-t border-zinc-700/50">
                        <td className="px-3 py-2 text-white">{test.testName}</td>
                        <td className="px-3 py-2 text-gray-400 hidden sm:table-cell">{test.category}</td>
                        <td className="px-3 py-2 text-gray-400 hidden sm:table-cell">{test.sampleType}</td>
                        <td className="px-3 py-2 text-gray-400 hidden md:table-cell">{test.turnaroundTime} {test.turnaroundUnit}</td>
                        <td className="px-3 py-2 text-right text-white">₹{test.discountedPrice || test.price}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-zinc-700">
                      <td colSpan={4} className="px-3 py-2 text-right text-gray-400 font-medium">
                        {booking.homeCollectionCharges > 0 && (
                          <span className="mr-4 text-xs">Home: ₹{booking.homeCollectionCharges}</span>
                        )}
                        Total:
                      </td>
                      <td className="px-3 py-2 text-right text-purple-400 font-bold">
                        ₹{booking.totalAmount + (booking.homeCollectionCharges || 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Rx Image */}
            {booking.rxImageUrl && (
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Prescription Upload</p>
                <a href={booking.rxImageUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/15 text-purple-400 rounded-lg text-xs hover:bg-purple-500/25 transition-colors">
                  <Eye className="w-3.5 h-3.5" /> View Prescription
                </a>
              </div>
            )}

            {/* Micro Actions + Status Actions */}
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              {renderMicroActions(booking)}

              <div className="flex flex-wrap gap-2">
              {booking.status === 'sample-collected' && (
                <button onClick={() => updateBookingStatus(booking.id, 'processing')}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Mark Processing
                </button>
              )}
              {booking.status === 'processing' && (
                <button onClick={() => updateBookingStatus(booking.id, 'report-ready')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Report Ready
                </button>
              )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ───── Section renderer for Today's tab ───── */
  const renderTodaySection = (title: string, icon: any, bookings: LabBooking[], color: string) => {
    const Icon = icon;
    if (bookings.length === 0) return null;

    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <h3 className="text-white font-semibold text-sm">{title}</h3>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${color} bg-zinc-800`}>
            {bookings.length}
          </span>
        </div>
        <div className="space-y-2.5">
          {bookings.map((b) => renderBookingCard(b))}
        </div>
      </div>
    );
  };

  const renderSlotGroups = (bookings: LabBooking[]) => {
    const bySlot = bookings.reduce<Record<string, LabBooking[]>>((acc, b) => {
      const key = b.timeSlot || b.slotName || 'Unassigned Slot';
      if (!acc[key]) acc[key] = [];
      acc[key].push(b);
      return acc;
    }, {});

    const slotKeys = Object.keys(bySlot).sort();
    return (
      <div className="space-y-4">
        {slotKeys.map((slotKey) => {
          const list = bySlot[slotKey];
          const hasActive = list.some((b) => !b.isCancelled && b.status !== 'rejected');
          const hasCancelled = list.some((b) => b.isCancelled || b.status === 'rejected');
          const walkInCount = list.filter(b => b.collectionType === 'walk-in' && !b.isCancelled && b.status !== 'rejected').length;
          const homeCount = list.filter(b => b.collectionType === 'home-collection' && !b.isCancelled && b.status !== 'rejected').length;

          return (
            <div key={slotKey} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 space-y-4">
              {/* Slot Header: Time + ON/OFF Toggle */}
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <h3 className="text-white font-medium text-lg">{slotKey}</h3>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-sm font-medium ${hasActive ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {hasActive ? 'ON' : 'OFF'}
                  </span>
                  <Switch
                    checked={hasActive}
                    onCheckedChange={() => {
                      if (hasActive) setConfirmAction({ mode: 'cancel', scope: 'slot', bookings: list, scopeLabel: slotKey });
                      else if (hasCancelled) setConfirmAction({ mode: 'restore', scope: 'slot', bookings: list, scopeLabel: slotKey });
                    }}
                    disabled={!hasActive && !hasCancelled}
                  />
                </div>
              </div>

              {/* Booking Type Info: Walk-in + Home Collection */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Footprints className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-400">Walk-in: <span className="text-white font-medium">{walkInCount}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-emerald-400" />
                  <span className="text-gray-400">Home: <span className="text-white font-medium">{homeCount}</span></span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-gray-400 text-xs">{list.length} total patients</span>
                </div>
              </div>

              {/* View Patients Button */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-700">
                <button
                  onClick={() => setExpandedSlot(expandedSlot === slotKey ? null : slotKey)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {expandedSlot === slotKey ? 'Hide Patients' : 'View Patients'}
                </button>
              </div>

              {/* Patient Cards - Show when expanded */}
              {expandedSlot === slotKey && (
                <div className="space-y-2.5 pt-2 border-t border-gray-700">
                  {list.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-6">No patients in this slot</p>
                  ) : (
                    list.map((b) => renderBookingCard(b))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  /* ───── Main Render ───── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-zinc-900 rounded-xl p-1 w-full sm:w-fit">
        <button
          onClick={() => { setActiveTab('today'); setExpandedBooking(null); }}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'today'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <CalendarDays className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Today's Bookings</span>
          {todayBookings.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'today' ? 'bg-white/20' : 'bg-purple-500/20 text-purple-400'
            }`}>{todayBookings.length}</span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('advance'); setExpandedBooking(null); }}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'advance'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <CalendarRange className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Advance Bookings</span>
          {advanceBookings.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'advance' ? 'bg-white/20' : 'bg-purple-500/20 text-purple-400'
            }`}>{advanceBookings.length}</span>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-zinc-800 border border-zinc-800 rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wider leading-tight">Total</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-white">{stats.total}</p>
        </div>
        <div className="bg-blue-500/10 border border-zinc-800 rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wider leading-tight">Walk-in</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-blue-400">{stats.walkIn}</p>
        </div>
        <div className="bg-emerald-500/10 border border-zinc-800 rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wider leading-tight">Home</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-emerald-400">{stats.homeCollection}</p>
        </div>
        <div className="bg-amber-500/10 border border-zinc-800 rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wider leading-tight">No Phlebo</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-amber-400">{stats.pendingPhlebo}</p>
        </div>
      </div>

      {/* Advance: Range Controls */}
      {activeTab === 'advance' && (
        <div className="flex flex-wrap items-center gap-3">
          {(['3days', '7days', 'custom'] as RangePreset[]).map((preset) => (
            <button key={preset} onClick={() => setRangePreset(preset)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                rangePreset === preset ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-gray-400 hover:text-white'
              }`}>
              {preset === '3days' ? 'Next 3 Days' : preset === '7days' ? 'Next 7 Days' : 'Custom Range'}
            </button>
          ))}
          {rangePreset === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white" />
              <span className="text-gray-500 text-sm">to</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white" />
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white">
          <option value="all">All Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending-phlebotomist">Pending Phlebo</option>
          <option value="sample-collected">Sample Collected</option>
          <option value="processing">Processing</option>
          <option value="report-ready">Report Ready</option>
          <option value="rejected">Rejected</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Search name, phone, booking ID..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-3 py-1.5 text-sm text-white placeholder-gray-500" />
        </div>
      </div>

      {/* Bookings Display */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 text-purple-500/30 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">
            {activeTab === 'today' ? 'No bookings for today' : 'No advance bookings in this range'}
          </p>
        </div>
      ) : activeTab === 'today' ? (
        /* Today: Sub-tabs for Walk-in / Home Collection */
        <div className="space-y-4">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            <button
              onClick={() => { setTodaySubTab('walk-in'); setExpandedBooking(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                todaySubTab === 'walk-in'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Walk-in</span>
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                todaySubTab === 'walk-in' ? 'bg-white/20' : 'bg-blue-500/20 text-blue-400'
              }`}>{todayWalkIn.length}</span>
            </button>
            <button
              onClick={() => { setTodaySubTab('home-collection'); setExpandedBooking(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                todaySubTab === 'home-collection'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home Collection</span>
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                todaySubTab === 'home-collection' ? 'bg-white/20' : 'bg-emerald-500/20 text-emerald-400'
              }`}>{todayHome.length}</span>
            </button>
          </div>
          <div className="space-y-2.5">
            {todaySubTab === 'walk-in'
              ? (todayWalkIn.length === 0
                  ? <p className="text-center text-gray-500 text-sm py-10">No walk-in bookings today</p>
                  : renderSlotGroups(todayWalkIn))
              : (todayHome.length === 0
                  ? <p className="text-center text-gray-500 text-sm py-10">No home collection bookings today</p>
                  : renderSlotGroups(todayHome))}
          </div>
        </div>
      ) : (
        /* Advance: Grouped by date, each card gets phlebo allocation for home type */
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const dayBookings = groupedByDate![date];
            const dayWalkIn = dayBookings.filter((b) => b.collectionType === 'walk-in');
            const dayHome = dayBookings.filter((b) => b.collectionType === 'home-collection');

            return (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <CalendarDays className="w-4 h-4 text-purple-400" />
                  <h3 className="text-white font-medium text-sm">{formatDateLabel(date)}</h3>
                  <span className="text-xs text-gray-500">({dayBookings.length})</span>
                </div>
                <div className="space-y-6 ml-7">
                  {dayWalkIn.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Footprints className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-blue-400 text-xs font-medium">Walk-in ({dayWalkIn.length})</span>
                      </div>
                      <div className="space-y-2.5">{dayWalkIn.map((b) => renderBookingCard(b, true))}</div>
                    </div>
                  )}
                  {dayHome.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Home className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 text-xs font-medium">Home Collection ({dayHome.length})</span>
                      </div>
                      <div className="space-y-2.5">{dayHome.map((b) => renderBookingCard(b, true))}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FollowUpModal
        isOpen={followUpModalOpen}
        onClose={() => {
          setFollowUpModalOpen(false);
          setSelectedBookingForFollowUp(null);
        }}
        patientName={selectedBookingForFollowUp?.patientName || ''}
        onSave={saveFollowUp}
      />

      {reportActionBooking && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-auto bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl max-h-[calc(100vh-1rem)] sm:max-h-[90vh] flex flex-col overscroll-contain">
            <div className="px-5 py-4 border-b border-zinc-800 flex-shrink-0">
              <h3 className="text-white text-lg font-semibold leading-tight break-words">Report Notification Flow</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed break-all">
                {reportActionBooking.patientName} • {reportActionBooking.bookingId}
              </p>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
              <input
                ref={reportUploadInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleReportFilePicked}
              />

              <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-300">Report status</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    reportActionBooking.status === 'report-ready' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700 text-zinc-300'
                  }`}>
                    {reportActionBooking.status === 'report-ready' ? 'REPORT READY' : reportActionBooking.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-300">Report document</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    reportActionBooking.reportPdfUrl ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                  }`}>
                    {reportActionBooking.reportPdfUrl ? 'READY TO SEND' : 'UPLOAD OR CREATE REQUIRED'}
                  </span>
                </div>

                {reportActionBooking.reportPdfUrl && (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-900/70 border border-zinc-700 p-2.5">
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-400">Attached report</p>
                      <p className="text-sm text-white truncate">{reportActionBooking.reportFileName || 'Lab Report PDF'}</p>
                    </div>
                    <a
                      href={reportActionBooking.reportPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-3 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium hover:bg-blue-500/25 inline-flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" /> View PDF
                    </a>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => reportUploadInputRef.current?.click()}
                    disabled={reportUploadBusy}
                    className="h-10 rounded-lg text-sm font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" /> {reportUploadBusy ? 'Uploading...' : 'Upload Existing PDF'}
                  </button>
                  <button
                    onClick={() => setReportBuilderOpen((prev) => !prev)}
                    className="h-10 rounded-lg text-sm font-medium bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 inline-flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" /> {reportBuilderOpen ? 'Close Report Builder' : 'Open Simple Report Builder'}
                  </button>
                </div>

                {reportBuilderOpen && (
                  <div className="rounded-lg bg-zinc-900/70 border border-zinc-700 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-zinc-400">Simple builder: patient details auto-filled, enter only test value and unit.</p>
                      <button
                        onClick={() => setShowLoadTemplateModal(true)}
                        className="h-8 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs hover:bg-zinc-700"
                      >
                        Templates ({savedTemplates.length})
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs rounded-lg border border-zinc-700 bg-zinc-800/60 p-2.5">
                      <div><span className="text-zinc-500">Patient</span><p className="text-white font-medium truncate">{reportActionBooking.patientName}</p></div>
                      <div><span className="text-zinc-500">Age/Gender</span><p className="text-white font-medium">{reportActionBooking.patientAge} / {reportActionBooking.patientGender}</p></div>
                      <div><span className="text-zinc-500">Date</span><p className="text-white font-medium">{reportActionBooking.bookingDate}</p></div>
                      <div><span className="text-zinc-500">Booking ID</span><p className="text-white font-medium truncate">{reportActionBooking.bookingId}</p></div>
                    </div>

                    <div className="space-y-2 pr-1">
                      {reportRows.map((row) => (
                        <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                          <input
                            value={row.testName}
                            onChange={(e) => updateRow(row.id, 'testName', e.target.value)}
                            placeholder="Test name (FBS / T3 / TSH)"
                            className="col-span-12 sm:col-span-5 h-9 bg-zinc-800 border border-zinc-700 rounded-lg px-2 text-sm text-white"
                          />
                          <input
                            value={row.value}
                            onChange={(e) => updateRow(row.id, 'value', e.target.value)}
                            placeholder="Value"
                            className="col-span-6 sm:col-span-3 h-9 bg-zinc-800 border border-zinc-700 rounded-lg px-2 text-sm text-white"
                          />
                          <input
                            value={row.unit}
                            onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                            placeholder="Unit"
                            className="col-span-5 sm:col-span-3 h-9 bg-zinc-800 border border-zinc-700 rounded-lg px-2 text-sm text-white"
                          />
                          <button
                            onClick={() => removeRow(row.id)}
                            className="col-span-1 h-9 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs hover:bg-red-500/20 flex items-center justify-center"
                            title="Remove row"
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        onClick={addCustomRow}
                        className="h-9 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs hover:bg-zinc-700"
                      >
                        + Add Test Row
                      </button>
                      <button
                        onClick={() => setShowSaveTemplateModal(true)}
                        className="h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs hover:bg-indigo-500/25"
                      >
                        Save This As Template
                      </button>
                      <button
                        onClick={createTemplateReportPdf}
                        disabled={reportBuilderBusy}
                        className="h-9 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium disabled:opacity-60"
                      >
                        {reportBuilderBusy ? 'Creating...' : 'Generate PDF & Attach'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-300">Notification Channel</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    reportChannelIntegrated ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'
                  }`}>
                    {reportChannelIntegrated ? `INTEGRATED (${(reportChannelType || 'healqr-push').toUpperCase()})` : 'NOT INTEGRATED'}
                  </span>
                </div>

                {!reportChannelIntegrated && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <button
                      onClick={() => integrateReportChannel('healqr-push')}
                      disabled={channelSaving}
                      className="h-9 rounded-lg text-xs font-medium bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 disabled:opacity-60"
                    >
                      Integrate Push
                    </button>
                    <button
                      onClick={() => integrateReportChannel('whatsapp')}
                      disabled={channelSaving}
                      className="h-9 rounded-lg text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-60"
                    >
                      Integrate WhatsApp (Self-Cost)
                    </button>
                    <button
                      onClick={() => integrateReportChannel('sms')}
                      disabled={channelSaving}
                      className="h-9 rounded-lg text-xs font-medium bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-60"
                    >
                      Integrate SMS
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-zinc-500">
                  HealQR currently sends push notification. WhatsApp/SMS integration cost and sending infra remain lab-managed.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => setReportPreviewOpen(true)}
                  disabled={!reportActionBooking.reportPdfUrl}
                  className="min-w-[150px] h-10 px-4 rounded-lg bg-blue-500/15 border border-blue-500/30 hover:bg-blue-500/25 text-blue-300 text-sm font-medium disabled:opacity-50"
                >
                  Preview Report
                </button>
                <button
                  onClick={() => setDeliveryWarningOpen(true)}
                  disabled={reportActionBooking.status !== 'report-ready' || sendingReport || !reportActionBooking.reportPdfUrl}
                  className="flex-1 min-w-[180px] h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-60"
                >
                  {sendingReport ? 'Sending...' : 'Create & Send Notification'}
                </button>
                <button
                  onClick={() => {
                    setReportActionBooking(null);
                    setReportBuilderOpen(false);
                    setReportPreviewOpen(false);
                    setDeliveryWarningOpen(false);
                    setShowLoadTemplateModal(false);
                    setShowSaveTemplateModal(false);
                  }}
                  className="h-10 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Report flow sub-modals (rendered as siblings to avoid backdrop-filter containing-block issue) ══════ */}
      {reportActionBooking && showSaveTemplateModal && (
        <div className="fixed inset-0 z-[82] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-3">
            <h4 className="text-white text-base font-semibold">Save Report Template</h4>
            <p className="text-xs text-zinc-400">Save this common test combination for future patients (example: FBS/PP, T3/T4/TSH).</p>
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name"
              className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-sm text-white"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowSaveTemplateModal(false); setTemplateName(''); }}
                className="h-9 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveAsTemplate}
                disabled={templateSaving || !templateName.trim()}
                className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-60"
              >
                {templateSaving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportActionBooking && showLoadTemplateModal && (
        <div className="fixed inset-0 z-[83] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-3 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-white text-base font-semibold">Load Template</h4>
              <button
                onClick={() => setShowLoadTemplateModal(false)}
                className="h-8 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-amber-400">⚠ Please review all fields carefully before generating — template data may not suit every patient.</p>

            <div className="space-y-2">
              {savedTemplates.map((t) => (
                <div key={t.id} className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/70 p-3">
                  <button
                    onClick={() => loadTemplate(t)}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-zinc-400">{(t.rows || []).length} tests</p>
                  </button>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    className="h-8 px-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs hover:bg-red-500/20"
                    title="Delete template"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {savedTemplates.length === 0 && (
                <p className="text-center text-zinc-500 text-sm py-8">No templates saved yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {reportActionBooking && reportPreviewOpen && reportActionBooking.reportPdfUrl && (
        <div className="fixed inset-0 z-[90] bg-black/90 flex items-center justify-center p-2 sm:p-4">
          <div className="w-full max-w-6xl h-[calc(100vh-1rem)] sm:h-[94vh] bg-zinc-950 border border-zinc-700 rounded-2xl overflow-hidden flex flex-col">
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-zinc-800 flex items-center justify-between gap-2 flex-shrink-0">
              <h4 className="text-sm font-semibold text-white truncate">Report Preview</h4>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={reportActionBooking.reportPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center"
                >
                  Open in New Tab
                </a>
                <button
                  onClick={() => setReportPreviewOpen(false)}
                  className="h-8 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
                >
                  Close
                </button>
              </div>
            </div>
            <iframe
              src={`${reportActionBooking.reportPdfUrl}#view=FitH&toolbar=1&navpanes=0`}
              title="Report Preview"
              className="w-full flex-1 bg-zinc-900 border-0"
            />
          </div>
        </div>
      )}

      {reportActionBooking && deliveryWarningOpen && (
        <div className="fixed inset-0 z-[85] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-4">
            <h4 className="text-white text-base font-semibold">Check Before Delivery</h4>
            <p className="text-sm text-zinc-300">
              Please verify this report before sending to patient. Delivery will trigger patient notification immediately.
            </p>
            <div className="space-y-2 text-xs text-zinc-400 bg-zinc-800/60 border border-zinc-700 rounded-lg p-3">
              <p>1. Patient details are correct (name, age, gender, booking ID).</p>
              <p>2. Report PDF is final and validated by your lab team.</p>
              <p>3. Test interpretation/impression is reviewed for delivery.</p>
            </div>
            {reportActionBooking.paymentReceived ? (
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                <Check className="w-4 h-4" /> Payment marked as received.
              </div>
            ) : (
              <div className="text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 space-y-2">
                <p>⚠ Payment is NOT marked as received for this booking.</p>
                <p className="text-amber-200/80 font-normal">If this is a corporate / TPA / credit case, you can proceed. Otherwise tick the box below to mark payment as received.</p>
                <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={async () => {
                      try {
                        await updateDoc(doc(db, 'labBookings', reportActionBooking.id), {
                          paymentReceived: true,
                          paymentReceivedAt: new Date().toISOString(),
                        });
                        setReportActionBooking({ ...reportActionBooking, paymentReceived: true });
                        toast.success('Payment marked as received');
                      } catch (err) {
                        console.error('Failed to mark payment:', err);
                        toast.error('Failed to mark payment');
                      }
                    }}
                    className="w-4 h-4 rounded accent-emerald-500"
                  />
                  <span className="text-emerald-300 font-medium">Mark payment as received now</span>
                </label>
              </div>
            )}
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => setDeliveryWarningOpen(false)}
                className="h-9 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm"
              >
                Recheck
              </button>
              <button
                onClick={async () => {
                  setDeliveryWarningOpen(false);
                  await sendReportNotification(reportActionBooking);
                }}
                disabled={sendingReport}
                className={`h-9 px-4 rounded-lg text-white text-sm disabled:opacity-60 ${
                  reportActionBooking.paymentReceived
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {sendingReport
                  ? 'Sending...'
                  : reportActionBooking.paymentReceived
                    ? 'Confirm & Send'
                    : 'Send Anyway (Unpaid)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ PAYMENT MODAL ══════ */}
      {paymentModal && (() => {
        const calc = getPaymentCalc(paymentModal);
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-purple-400" /> Payment
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{paymentModal.patientName} • {paymentModal.bookingId}</p>
                </div>
                <button onClick={() => setPaymentModal(null)} className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* MRP — read only */}
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Total MRP (incl. charges)</label>
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white font-bold">
                    ₹{calc.mrp}
                  </div>
                </div>

                {/* Discount */}
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Discount %</label>
                  <input
                    type="number" min={0} max={100}
                    value={pmDiscount}
                    onChange={(e) => setPmDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm"
                  />
                </div>

                {/* Discounted Price — auto */}
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">After Discount</label>
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-emerald-400 font-bold">
                    ₹{calc.discountedPrice}
                  </div>
                </div>

                {/* Advance Paid */}
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Advance Paid / Full Payment</label>
                  <input
                    type="number" min={0}
                    value={pmAdvance}
                    onChange={(e) => setPmAdvance(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm"
                  />
                </div>

                {/* Amount Due — auto */}
                <div className={`rounded-lg p-4 ${calc.amountDue === 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Amount Due</span>
                    <span className={`text-2xl font-bold ${calc.amountDue === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ₹{calc.amountDue}
                    </span>
                  </div>
                  {calc.amountDue === 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-5 h-5 rounded bg-emerald-600 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-emerald-400 text-xs font-medium">Full payment — will auto-tick</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={savePayment}
                    disabled={pmSaving}
                    className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {pmSaving ? 'Saving...' : 'Save Payment'}
                  </button>
                  <button
                    onClick={() => setPaymentModal(null)}
                    className="px-4 py-2.5 bg-zinc-800 text-zinc-400 text-sm rounded-lg hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Cancel Confirmation Modal — patient / slot / global */}
      <CancellationModal
        isOpen={!!confirmAction && confirmAction.mode === 'cancel'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return;
          const a = confirmAction;
          setConfirmAction(null);
          if (a.scope === 'patient' && a.booking) {
            cancelSingleBooking(a.booking);
          } else if (a.scope === 'slot' && a.bookings) {
            toggleSlotBookings(a.bookings, true, a.scopeLabel || 'Slot');
          } else if (a.scope === 'global' && a.bookings) {
            toggleSlotBookings(a.bookings, true, a.scopeLabel || 'Today');
          }
        }}
      />

      {/* Restore Confirmation Modal — patient / slot / global */}
      <RestorationModal
        isOpen={!!confirmAction && confirmAction.mode === 'restore'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return;
          const a = confirmAction;
          setConfirmAction(null);
          if (a.scope === 'patient' && a.booking) {
            restoreSingleBooking(a.booking);
          } else if (a.scope === 'slot' && a.bookings) {
            toggleSlotBookings(a.bookings, false, a.scopeLabel || 'Slot');
          } else if (a.scope === 'global' && a.bookings) {
            toggleSlotBookings(a.bookings, false, a.scopeLabel || 'Today');
          }
        }}
        patientName={confirmAction?.booking?.patientName}
      />
    </div>
  );
}
