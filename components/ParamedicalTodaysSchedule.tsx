import { useMemo, useState, useEffect } from 'react';
import {
  Calendar, CalendarDays, Clock, MapPin, Phone, Users, Plus, ArrowLeft,
  Briefcase, Video, Building2, QrCode,
} from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { Button } from './ui/button';
import { toast } from 'sonner';
import PatientDetails from './PatientDetails';
import { decrypt } from '../utils/encryptionService';

interface ScheduleSlot {
  id: string;
  day: string;
  days?: string[];
  startTime: string;
  endTime: string;
  isActive: boolean;
  maxBookings: number;
  frequency?: string;
  chamberName?: string;
  chamberAddress?: string;
  clinicCode?: string;
  mrAllowed?: boolean;
  mrMaxCount?: number;
  mrMeetingTime?: string;
}

interface VCTimeSlot {
  id: number;
  startTime: string;
  endTime: string;
  days: string[];
  isActive: boolean;
}

interface Booking {
  id: string;
  patientName: string;
  patientPhone: string;
  patientAge?: string;
  patientGender?: string;
  serviceType: string;
  appointmentDate: string;
  timeSlot: string;
  status: string;
  address?: string;
  notes?: string;
  amount?: number;
  paymentStatus?: string;
  scheduleId?: string;
  chamberName?: string;
  consultationType?: 'in-person' | 'video';
  visitType?: 'walk-in' | 'qr' | 'home-call';
  isWalkIn?: boolean;
  tokenNumber?: string | number;
  bookingId?: string;
  referredBy?: { name: string; type: string; id: string };
  allottedBy?: { name: string; type: string; id: string; branchId?: string; branchName?: string };
  createdAt?: any;
}

type Profile = any;

interface Props {
  paraId: string;
  profile: Profile | null;
  bookings: Booking[];
  serviceLabel: string;
  onAddWalkIn?: () => void;
  onOpenSchedule?: () => void;
  setProfile: (updater: (p: any) => any) => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const todayStr = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const todayDay = () => DAY_NAMES[new Date().getDay()];

export default function ParamedicalTodaysSchedule({
  paraId, profile, bookings, serviceLabel, onAddWalkIn, onOpenSchedule, setProfile,
}: Props) {
  const today = todayStr();
  const dayName = todayDay();

  // Filter schedules active today (multi-day or single-day)
  const todaysSchedules = useMemo(() => {
    const all: ScheduleSlot[] = profile?.schedules || [];
    return all.filter((s: ScheduleSlot) => {
      const dList = s.days && s.days.length ? s.days : (s.day ? [s.day] : []);
      return dList.includes(dayName);
    });
  }, [profile?.schedules, dayName]);

  // Today's bookings, split by source
  const todayBookings = bookings.filter(b => b.appointmentDate === today);
  const walkInBookings = todayBookings.filter(b => b.isWalkIn || b.visitType === 'walk-in');
  const qrBookings = todayBookings.filter(b => !b.isWalkIn && b.visitType !== 'walk-in');
  const homeCallCount = todayBookings.filter(b => b.visitType === 'home-call').length;

  // Local UI state
  const [selectedChamber, setSelectedChamber] = useState<ScheduleSlot | null>(null);
  const [mrPanelChamber, setMrPanelChamber] = useState<ScheduleSlot | null>(null);

  // Sub-page: chamber patient list — uses the SAME PatientDetails UI as the doctor side
  if (selectedChamber) {
    const bookedCount = qrBookings.filter(b =>
      b.scheduleId === selectedChamber.id || b.chamberName === selectedChamber.chamberName,
    ).length;
    return (
      <ParamedicalPatientDetailsLoader
        chamber={selectedChamber}
        paraId={paraId}
        bookedCount={bookedCount}
        onBack={() => setSelectedChamber(null)}
      />
    );
  }

  // Sub-page: MR visits panel
  if (mrPanelChamber) {
    return (
      <MRVisitsPanel
        chamber={mrPanelChamber}
        paraId={paraId}
        onBack={() => setMrPanelChamber(null)}
      />
    );
  }

  // Toggle a schedule active/inactive
  const toggleScheduleActive = async (id: string, next: boolean) => {
    const updated = (profile?.schedules || []).map((s: ScheduleSlot) => s.id === id ? { ...s, isActive: next } : s);
    setProfile(prev => prev ? { ...prev, schedules: updated } : prev);
    try {
      await updateDoc(doc(db, 'paramedicals', paraId), { schedules: updated });
      toast.success(next ? 'Chamber activated' : 'Chamber deactivated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  };

  return (
    <div className="space-y-4">
      {/* ===== Walk-In Patients overview ===== */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-white font-semibold">Walk-In Patients</h3>
            <p className="text-gray-400 text-xs mt-0.5">Quick on-the-spot bookings</p>
          </div>
          <Button onClick={onAddWalkIn} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4 mr-1" /> ADD PATIENT
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-black/40 border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <CalendarDays className="w-3.5 h-3.5" /> Today
            </div>
            <p className="text-white font-medium">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          </div>
          <div className="bg-black/40 border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Phone className="w-3.5 h-3.5" /> Home Calls
            </div>
            <p className="text-white font-medium">{homeCallCount}</p>
          </div>
          <div className="bg-black/40 border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Building2 className="w-3.5 h-3.5" /> Chamber Walk-Ins
            </div>
            <p className="text-white font-medium">{walkInBookings.length}</p>
          </div>
        </div>

        <Button
          onClick={() => setSelectedChamber({ id: 'walkins', day: dayName, startTime: '', endTime: '', isActive: true, maxBookings: 0, chamberName: 'Walk-In Patients', chamberAddress: '' })}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          disabled={walkInBookings.length === 0}
        >
          VIEW PATIENTS
        </Button>
      </div>

      {/* ===== VC slots (if any active today) ===== */}
      {(profile?.vcTimeSlots || []).filter((s: VCTimeSlot) => s.isActive && s.days.includes(dayName)).length > 0 && (
        <div className="bg-zinc-900 border border-blue-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                <Video className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Video Consultations</h3>
                <p className="text-gray-400 text-xs">
                  {(profile?.vcTimeSlots || []).filter((s: VCTimeSlot) => s.isActive && s.days.includes(dayName))
                    .map((s: VCTimeSlot) => `${s.startTime}–${s.endTime}`).join(' · ')}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setSelectedChamber({ id: 'vc', day: dayName, startTime: '', endTime: '', isActive: true, maxBookings: 0, chamberName: 'Video Consultations', chamberAddress: 'Online' })}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              VIEW PATIENTS
            </Button>
          </div>
        </div>
      )}

      {/* ===== Active schedule cards ===== */}
      {todaysSchedules.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-1">No Active Chambers Today</h3>
          <p className="text-gray-500 text-sm mb-4">You haven't scheduled any sessions for {dayName}.</p>
          {onOpenSchedule && (
            <Button onClick={onOpenSchedule} variant="outline" className="border-zinc-700 text-white">
              Open Schedule Maker
            </Button>
          )}
        </div>
      ) : (
        todaysSchedules.map((schedule: ScheduleSlot) => {
          const chamberBookings = qrBookings.filter(b =>
            b.scheduleId === schedule.id || b.chamberName === schedule.chamberName
          );
          const booked = chamberBookings.length;
          const capacity = schedule.maxBookings || 0;
          const pct = capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;

          return (
            <div key={schedule.id} className={`bg-zinc-900 border rounded-xl p-5 ${schedule.isActive ? 'border-zinc-800' : 'border-zinc-800 opacity-60'}`}>
              {/* Header: name + active toggle */}
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-bold uppercase text-sm tracking-tight truncate">
                    {schedule.chamberName || 'Chamber'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-1">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{schedule.chamberAddress || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{schedule.startTime} – {schedule.endTime}</span>
                  </div>
                  {schedule.clinicCode && (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs mt-1">
                      <QrCode className="w-3.5 h-3.5" />
                      <span className="font-mono">{schedule.clinicCode}</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => toggleScheduleActive(schedule.id, !schedule.isActive)}
                  className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${schedule.isActive ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                  title={schedule.isActive ? 'Deactivate today' : 'Activate'}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${schedule.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Frequency / Mode badge row */}
              {schedule.frequency && (
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-gray-300 text-[11px]">
                    {schedule.frequency}
                  </span>
                  {schedule.mrAllowed && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> MR Allowed
                    </span>
                  )}
                </div>
              )}

              {/* Booking progress */}
              <div className="bg-black/40 border border-zinc-800 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-400">Booking Status</span>
                  <span className="text-emerald-400 font-medium">{booked}/{capacity || '∞'}</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="border-zinc-700 text-gray-300 hover:bg-zinc-800 flex-1 sm:flex-none"
                  disabled={booked > 0}
                  title={booked > 0 ? 'Disabled — bookings exist' : 'Mark this day as empty / off'}
                  onClick={() => toggleScheduleActive(schedule.id, false)}
                >
                  Empty Day
                </Button>

                {schedule.mrAllowed && (
                  <Button
                    onClick={() => setMrPanelChamber(schedule)}
                    disabled={!schedule.isActive}
                    style={{ backgroundColor: schedule.isActive ? '#d97706' : '#374151', color: schedule.isActive ? '#ffffff' : '#9ca3af' }}
                    className="font-semibold disabled:cursor-not-allowed border-0"
                  >
                    <Briefcase className="w-4 h-4 mr-1" /> VIEW MR
                  </Button>
                )}

                <Button
                  onClick={() => setSelectedChamber(schedule)}
                  disabled={!schedule.isActive}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:bg-zinc-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  VIEW PATIENTS
                </Button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ============================================================
   Sub-view: Per-chamber Patient List
   Re-uses the doctor `PatientDetails` UI so paramedicals get
   the exact same, fully-featured patient management screen
   (cancel + restore, notifications, reschedule, etc.).
   ============================================================ */
function ParamedicalPatientDetailsLoader({
  chamber, paraId, bookedCount, onBack,
}: {
  chamber: ScheduleSlot;
  paraId: string;
  bookedCount: number;
  onBack: () => void;
}) {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshPatients = () => setRefreshTrigger(t => t + 1);

  useEffect(() => {
    const load = async () => {
      if (!db || !paraId) { setLoading(false); return; }
      try {
        setLoading(true);
        const today = new Date();
        const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
          .toISOString().split('T')[0];

        const bookingsRef = collection(db, 'paramedicalBookings');

        // Primary query: by paramedicalId + scheduleId + today
        const primaryQ = query(
          bookingsRef,
          where('paramedicalId', '==', paraId),
          where('scheduleId', '==', chamber.id),
          where('appointmentDate', '==', todayStr),
        );
        let snap = await getDocs(primaryQ);
        let docs = snap.docs.filter(d => d.data().type !== 'walkin_booking');

        // Fallback: chamber name match (for bookings saved before scheduleId was added)
        if (docs.length === 0) {
          const fallbackQ = query(
            bookingsRef,
            where('paramedicalId', '==', paraId),
            where('appointmentDate', '==', todayStr),
          );
          const fallbackSnap = await getDocs(fallbackQ);
          docs = fallbackSnap.docs.filter(d => {
            const data = d.data();
            if (data.type === 'walkin_booking') return false;
            if (data.scheduleId && String(data.scheduleId) === String(chamber.id)) return true;
            const cn = (data.chamberName || data.chamber || '').toString().toLowerCase();
            const target = (chamber.chamberName || '').toString().toLowerCase();
            return cn !== '' && target !== '' && cn === target;
          });
        }

        const mapped = docs.map(d => {
          const data: any = d.data();
          const bookingTime = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());

          const buildAppointmentDateTime = (dateValue: any, timeValue: any, fallback: Date) => {
            if (dateValue && timeValue && timeValue !== 'immediate') {
              const dateStr = typeof dateValue === 'string'
                ? dateValue
                : (dateValue.toDate ? dateValue.toDate().toISOString().split('T')[0] : '');
              const timeStr = String(timeValue);
              const date = new Date(dateStr);
              if (!isNaN(date.getTime())) {
                const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
                if (match) {
                  let hour = parseInt(match[1], 10);
                  const minute = parseInt(match[2], 10);
                  const ampm = (match[3] || '').toLowerCase();
                  if (ampm === 'pm' && hour < 12) hour += 12;
                  if (ampm === 'am' && hour === 12) hour = 0;
                  date.setHours(hour, minute, 0, 0);
                  return date;
                }
              }
            }
            if (dateValue?.toDate) return dateValue.toDate();
            if (dateValue) {
              const parsed = new Date(dateValue);
              if (!isNaN(parsed.getTime())) return parsed;
            }
            return fallback;
          };

          const appointmentFallback = data.date?.toDate ? data.date.toDate() : bookingTime;
          const appointmentTime = buildAppointmentDateTime(data.appointmentDate, data.time, appointmentFallback);

          const isCancelledStatus = (data.isCancelled === true) || (data.status === 'cancelled');

          const patientName = decrypt(data.patientName_encrypted || data.patientName || '');
          const whatsappNumber = decrypt(data.whatsappNumber_encrypted || data.whatsappNumber || data.patientPhone || '');
          const ageDecrypted = decrypt(data.age_encrypted || '');
          const genderDecrypted = decrypt(data.gender_encrypted || data.gender || '');
          const purposeDecrypted = decrypt(data.purposeOfVisit_encrypted || data.purposeOfVisit || '');

          let parsedAge = 0;
          if (ageDecrypted) {
            const n = parseInt(String(ageDecrypted).trim());
            parsedAge = isNaN(n) ? 0 : n;
          } else if (data.age) {
            const n = typeof data.age === 'number' ? data.age : parseInt(String(data.age).trim());
            parsedAge = isNaN(n) ? 0 : n;
          }

          return {
            id: d.id,
            name: patientName || data.patientName || 'N/A',
            phone: whatsappNumber || data.patientPhone || data.phone || 'N/A',
            bookingId: data.bookingId || d.id,
            age: parsedAge,
            gender: (genderDecrypted || 'MALE').toUpperCase(),
            visitType: purposeDecrypted || data.visitType || (data.consultationType === 'video' ? 'Video Consultation' : 'In-Person'),
            bookingTime,
            appointmentTime,
            appointmentDate: data.appointmentDate,
            paymentVerified: data.paymentVerified || false,
            consultationType: data.consultationType || 'chamber',
            language: data.language || 'english',
            prescriptionUrl: data.prescriptionUrl,
            prescriptionReviewed: data.prescriptionReviewed || false,
            isCancelled: isCancelledStatus,
            isMarkedSeen: data.isMarkedSeen || false,
            reminderSent: data.reminderSent || data.reminderScheduled || false,
            followUpScheduled: data.followUpScheduled || false,
            reviewScheduled: data.reviewScheduled || false,
            tokenNumber: data.tokenNumber || `#${data.serialNo || 0}`,
            serialNo: data.serialNo || 0,
            chamber: data.chamber || chamber.chamberName || 'Chamber',
            isWalkIn: data.isWalkIn !== undefined ? data.isWalkIn : false,
            isDataRestricted: false,
            bookingSource: data.bookingSource || 'paramedical_qr',
            clinicId: data.clinicId || '',
            digitalRxUrl: data.digitalRxUrl || '',
            dietChartUrl: data.dietChartUrl || '',
            vcPatientJoined: data.vcPatientJoined || false,
            vcCompleted: data.vcCompleted || false,
            vcLinkSentAt: data.vcLinkSentAt || null,
            referrerName: data.referrerName || null,
            referrerRole: data.referrerRole || null,
          };
        })
        .filter(p => p.name !== 'N/A' && p.phone !== 'N/A')
        .sort((a, b) => {
          if (a.isCancelled !== b.isCancelled) return a.isCancelled ? 1 : -1;
          if (a.isMarkedSeen !== b.isMarkedSeen) return a.isMarkedSeen ? 1 : -1;
          return (a.serialNo || 0) - (b.serialNo || 0);
        });

        setPatients(mapped);
      } catch (err) {
        console.error('Error loading paramedical chamber patients:', err);
        toast.error('Failed to load patient details');
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [chamber.id, chamber.chamberName, paraId, refreshTrigger]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-gray-700/30 rounded-full flex items-center justify-center animate-pulse mb-4">
            <Calendar className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-400">Loading patient details...</p>
        </div>
      </div>
    );
  }

  return (
    <PatientDetails
      chamberName={chamber.chamberName || 'Chamber'}
      chamberAddress={chamber.chamberAddress || ''}
      scheduleTime={`${chamber.startTime || ''} - ${chamber.endTime || ''}`}
      scheduleDate={chamber.frequency || todayDay()}
      currentPatients={bookedCount}
      totalPatients={chamber.maxBookings || 0}
      patients={patients}
      onBack={onBack}
      onRefresh={refreshPatients}
      prepaymentActive={false}
      activeAddOns={['chronic-care']}
      doctorLanguage="english"
      doctorId={paraId}
      readOnly={false}
      bookingsCollection="paramedicalBookings"
      providerCollection="paramedicals"
    />
  );
}

/* ============================================================
   Sub-view: MR Visits Panel
   ============================================================ */
function MRVisitsPanel({
  chamber, paraId, onBack,
}: {
  chamber: ScheduleSlot;
  paraId: string;
  onBack: () => void;
}) {
  const [mrVisits, setMrVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paraId) return;
    // Listen for MR-paramedical links if/when the schema supports it.
    // For now, query mrDoctorLinks where targetType === 'paramedical' && targetId === paraId.
    const q = query(
      collection(db, 'mrDoctorLinks'),
      where('targetType', '==', 'paramedical'),
      where('targetId', '==', paraId),
    );
    const unsub = onSnapshot(q, snap => {
      setMrVisits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [paraId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-white font-semibold">MR Visits</h2>
          <p className="text-gray-400 text-xs">Medical Representative visits for {chamber.chamberName}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center text-gray-500">
          Loading MR visits...
        </div>
      ) : mrVisits.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Briefcase className="w-12 h-12 text-amber-500/40 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-1">No MR Visits Today</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            {chamber.mrAllowed
              ? `Up to ${chamber.mrMaxCount || 1} Medical Representative${(chamber.mrMaxCount || 1) > 1 ? 's' : ''} can request a visit `
              : 'MR visits are not enabled for this chamber. '}
            {chamber.mrAllowed && (
              <>· Meeting time: <span className="text-amber-400">{chamber.mrMeetingTime === 'before' ? 'Before patients' : chamber.mrMeetingTime === 'after' ? 'After patients' : 'Between patients'}</span></>
            )}
          </p>
        </div>
      ) : (
        mrVisits.map(visit => (
          <div key={visit.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-semibold">{visit.mrName}</h4>
                <p className="text-amber-400 text-xs">{visit.companyName || 'Pharma Company'}</p>
                <p className="text-gray-400 text-xs mt-1">
                  <Phone className="w-3 h-3 inline mr-1" />{visit.mrPhone}
                </p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                visit.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                visit.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {visit.status || 'pending'}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
