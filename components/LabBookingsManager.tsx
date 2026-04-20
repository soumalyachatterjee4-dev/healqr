import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Search, RefreshCw, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Beaker, Home, Footprints, Eye, AlertCircle,
  CalendarRange, CalendarDays, IndianRupee, UserCheck, Truck, X, Check,
} from 'lucide-react';
import { db } from '../lib/firebase/config';
import {
  collection, query, where, onSnapshot, getDocs,
  doc, updateDoc, writeBatch, Timestamp,
} from 'firebase/firestore';
import { toast } from 'sonner';

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

  // Advance tab
  const [rangePreset, setRangePreset] = useState<RangePreset>('7days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Payment modal
  const [paymentModal, setPaymentModal] = useState<LabBooking | null>(null);
  const [pmDiscount, setPmDiscount] = useState(0);
  const [pmAdvance, setPmAdvance] = useState(0);
  const [pmSaving, setPmSaving] = useState(false);

  // Phlebo allocation
  const [allocatingBookingId, setAllocatingBookingId] = useState<string | null>(null);

  const todayStr = getLocalDateStr();

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
      await updateDoc(doc(db, 'labBookings', booking.id), updates);
      toast.success(newVal ? 'Sample collected' : 'Sample unchecked');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to update');
    }
  }, []);

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
            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
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

            {/* Status Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
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
              {booking.status !== 'rejected' && booking.status !== 'report-ready' && (
                <button onClick={() => updateBookingStatus(booking.id, 'rejected')}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-red-600/20 text-red-400 rounded-lg text-xs font-medium transition-colors border border-zinc-700">
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              )}
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
                  : todayWalkIn.map((b) => renderBookingCard(b)))
              : (todayHome.length === 0
                  ? <p className="text-center text-gray-500 text-sm py-10">No home collection bookings today</p>
                  : todayHome.map((b) => renderBookingCard(b)))}
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
    </div>
  );
}
