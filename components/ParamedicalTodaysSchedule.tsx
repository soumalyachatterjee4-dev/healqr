import { useMemo, useState, useEffect } from 'react';
import {
  Calendar, CalendarDays, Clock, MapPin, Phone, Users, Plus, ArrowLeft,
  Briefcase, CheckCircle2, XCircle, Eye, Bell, Star, FileText, Sparkles,
  Video, Building2, QrCode, RefreshCw,
} from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { Button } from './ui/button';
import { toast } from 'sonner';

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

  // Sub-page: chamber patient list
  if (selectedChamber) {
    return (
      <ChamberPatientsView
        chamber={selectedChamber}
        bookings={qrBookings.filter(b => b.scheduleId === selectedChamber.id || b.chamberName === selectedChamber.chamberName)}
        paraId={paraId}
        serviceLabel={serviceLabel}
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
   ============================================================ */
function ChamberPatientsView({
  chamber, bookings, paraId, serviceLabel, onBack,
}: {
  chamber: ScheduleSlot;
  bookings: Booking[];
  paraId: string;
  serviceLabel: string;
  onBack: () => void;
}) {
  const [updatingId, setUpdatingId] = useState('');

  const markStatus = async (bookingId: string, status: string) => {
    setUpdatingId(bookingId);
    try {
      await updateDoc(doc(db, 'paramedicalBookings', bookingId), {
        status,
        ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {}),
      });
      toast.success(`Marked as ${status}`);
    } catch (err: any) { toast.error(err.message); }
    finally { setUpdatingId(''); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-white font-semibold">Patient Details</h2>
          <p className="text-gray-400 text-xs">View and manage patient notifications for selected chamber</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-1">No patients yet</h3>
          <p className="text-gray-500 text-sm">No bookings found for {chamber.chamberName} today.</p>
        </div>
      ) : (
        bookings.map((b, idx) => (
          <div key={b.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-semibold text-sm flex-shrink-0">
                {b.tokenNumber ? String(b.tokenNumber).replace('#', '') : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="text-white font-semibold text-sm uppercase">{b.patientName}</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                    b.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                    b.status === 'confirmed' ? 'bg-teal-500/20 text-teal-400' :
                    b.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {b.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400">
                  <span><Phone className="w-3 h-3 inline mr-1" />{b.patientPhone}</span>
                  {b.bookingId && (
                    <span className="font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{b.bookingId}</span>
                  )}
                  {(b.visitType === 'qr' || !b.isWalkIn) && (
                    <span className="bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded">QR SCAN</span>
                  )}
                  {b.patientAge && <span>{b.patientAge} years</span>}
                  {b.patientGender && <span className="bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded uppercase text-[10px]">{b.patientGender}</span>}
                </div>
                <p className="text-gray-500 text-xs mt-1">{b.serviceType || serviceLabel}</p>

                {b.allottedBy?.name && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    Allotted by {b.allottedBy.type === 'doctor' ? 'Dr. ' : b.allottedBy.type === 'clinic' ? 'Clinic ' : b.allottedBy.type === 'lab' ? 'Lab ' : ''}{b.allottedBy.name}
                  </div>
                )}
              </div>
            </div>

            {/* Action icons row */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800">
              <ActionIcon icon={Sparkles} label="AI Diet" color="purple" />
              <ActionIcon icon={Eye} label="Mark Seen" color="emerald" />
              <ActionIcon icon={Bell} label="Notify" color="blue" />
              <ActionIcon icon={Calendar} label="Reschedule" color="amber" />
              <ActionIcon icon={Star} label="Review" color="yellow" />
              <ActionIcon icon={FileText} label="Notes" color="cyan" />
            </div>

            {/* Cancel button */}
            {b.status !== 'completed' && b.status !== 'cancelled' && (
              <>
                <button
                  onClick={() => markStatus(b.id, 'cancelled')}
                  className="w-full mt-3 px-4 py-2 rounded-lg bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Cancel Booking
                </button>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  <SecondaryAction icon={RefreshCw} label="" />
                  <SecondaryAction icon={FileText} label="" />
                  <SecondaryAction icon={CheckCircle2} label="" />
                  <button
                    onClick={() => markStatus(b.id, 'completed')}
                    disabled={updatingId === b.id}
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium disabled:opacity-50"
                  >
                    Complete
                  </button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function ActionIcon({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
  const colorMap: Record<string, string> = {
    purple: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
    emerald: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    blue: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
    amber: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    yellow: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
    cyan: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
  };
  return (
    <button
      title={label}
      className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-colors ${colorMap[color] || colorMap.emerald} hover:opacity-80`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function SecondaryAction({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <button
      title={label}
      className="px-3 py-2 rounded-lg bg-black/40 border border-zinc-800 text-gray-400 hover:bg-zinc-800 hover:text-white flex items-center justify-center"
    >
      <Icon className="w-4 h-4" />
    </button>
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
