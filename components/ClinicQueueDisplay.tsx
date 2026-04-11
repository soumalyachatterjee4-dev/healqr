import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Monitor, Clock, Users, Stethoscope, CheckCircle2,
  Volume2, VolumeX, RefreshCw, MapPin, AlertCircle
} from 'lucide-react';

interface QueueDisplayProps {
  clinicId: string;
}

interface QueuePatient {
  id: string;
  patientName: string;
  serialNo: number;
  tokenNumber: string;
  status: 'waiting' | 'completed' | 'cancelled';
  doctorId: string;
  chamberName: string;
  chamberId: string;
  isMarkedSeen: boolean;
  isCancelled: boolean;
  inChamber: boolean;
}

interface ChamberInfo {
  id: number;
  name: string;
  address: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  isActive: boolean;
  doctorId: string;
  doctorName: string;
  specialty: string;
  patients: QueuePatient[];
  bookedCount: number;
  completedCount: number;
  waitingCount: number;
  currentToken: number;
  currentPatientName: string;
  nextToken: number;
  nextPatientName: string;
}

// Screen types for the carousel
type ScreenType =
  | { type: 'schedule-overview' }
  | { type: 'chamber-patients'; chamberIndex: number }
  | { type: 'now-serving'; chamberIndex: number }
  | { type: 'next-ready'; chamberIndex: number };

const DOCTOR_COLORS = [
  { accent: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
  { accent: '#6366f1', bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)' },
  { accent: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  { accent: '#ec4899', bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.3)' },
  { accent: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
  { accent: '#14b8a6', bg: 'rgba(20,184,166,0.15)', border: 'rgba(20,184,166,0.3)' },
];

const SCREEN_DURATION = 10000; // 10 seconds per screen

export default function ClinicQueueDisplay({ clinicId }: QueueDisplayProps) {
  const [chambers, setChambers] = useState<ChamberInfo[]>([]);
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const [screens, setScreens] = useState<ScreenType[]>([{ type: 'schedule-overview' }]);
  const [fadeClass, setFadeClass] = useState('opacity-100');
  const [announcement, setAnnouncement] = useState('');
  const [chamberPage, setChamberPage] = useState(0);
  const CHAMBERS_PER_PAGE = 6;
  const prevTokensRef = useRef<Map<string, number>>(new Map());
  const screenTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screensRef = useRef<ScreenType[]>([{ type: 'schedule-overview' }]);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sound
  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const notes = [523, 659, 784]; // C5, E5, G5 — major chord
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.5);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.5);
      });
    } catch { /* ignore */ }
  }, [soundEnabled]);

  // Build screen sequence from chambers
  const buildScreenSequence = useCallback((chamberList: ChamberInfo[]): ScreenType[] => {
    const seq: ScreenType[] = [{ type: 'schedule-overview' }];
    chamberList.forEach((ch, idx) => {
      if (ch.patients.length === 0) return;
      seq.push({ type: 'chamber-patients', chamberIndex: idx });
      if (ch.isActive && ch.currentToken > 0) {
        seq.push({ type: 'now-serving', chamberIndex: idx });
        if (ch.nextToken > 0) {
          seq.push({ type: 'next-ready', chamberIndex: idx });
        }
      }
    });
    return seq.length > 0 ? seq : [{ type: 'schedule-overview' }];
  }, []);

  // Real-time data
  useEffect(() => {
    if (!clinicId) return;
    let unsubBookings: (() => void) | null = null;
    let chamberRefreshId: ReturnType<typeof setInterval> | null = null;

    // Mutable refs for chamber data that can be refreshed
    const scheduledChambersRef: { chamber: any; doctorId: string; doctorName: string; specialty: string }[] = [];
    const doctorDetailsRef = new Map<string, { name: string; specialty: string; chambers: any[] }>();

    const setup = async () => {
      try {
        const { db } = await import('../lib/firebase/config');
        const { collection, query, where, onSnapshot, doc, getDoc } = await import('firebase/firestore');

        // Load clinic info
        const clinicDoc = await getDoc(doc(db, 'clinics', clinicId));
        const clinicData = clinicDoc.exists() ? clinicDoc.data() : null;
        setClinicName(clinicData?.clinicName || clinicData?.name || 'Clinic');
        setClinicAddress(clinicData?.address || '');

        // Load linked doctor details + their chambers
        const linkedDoctors = clinicData?.linkedDoctors || [];
        const linkedDoctorsDetails = clinicData?.linkedDoctorsDetails || [];

        const allDocIds = new Set<string>();
        for (const detail of linkedDoctorsDetails) {
          const docId = detail.doctorId || detail.uid;
          if (docId) allDocIds.add(docId);
        }
        for (const docId of linkedDoctors) allDocIds.add(docId);

        // Fetch each doctor's chamber data
        for (const docId of allDocIds) {
          try {
            const doctorDoc = await getDoc(doc(db, 'doctors', docId));
            const doctorData = doctorDoc.exists() ? doctorDoc.data() : null;
            const detail = linkedDoctorsDetails.find((d: any) => (d.doctorId || d.uid) === docId);
            doctorDetailsRef.set(docId, {
              name: detail?.name || detail?.doctorName || doctorData?.name || doctorData?.doctorName || 'Doctor',
              specialty: (detail?.specialties || [detail?.specialty] || doctorData?.specialties || [doctorData?.specialty]).filter(Boolean).join(', ') || 'General',
              chambers: doctorData?.chambers || []
            });
          } catch {
            const detail = linkedDoctorsDetails.find((d: any) => (d.doctorId || d.uid) === docId);
            doctorDetailsRef.set(docId, {
              name: detail?.name || detail?.doctorName || 'Doctor',
              specialty: 'General',
              chambers: []
            });
          }
        }

        // Today info
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const todayDay = today.toLocaleDateString('en-US', { weekday: 'long' });

        const rebuildScheduledChambers = () => {
          scheduledChambersRef.length = 0;
          doctorDetailsRef.forEach((info, docId) => {
            (info.chambers || []).forEach((ch: any) => {
              if (ch.clinicId !== clinicId && ch.clinicCode !== clinicId) return;
              let scheduledToday = false;
              if (ch.frequency === 'Daily') scheduledToday = true;
              else if (ch.frequency === 'Custom' && ch.customDate === todayStr) scheduledToday = true;
              else if (ch.days && ch.days.includes(todayDay)) scheduledToday = true;
              else if (ch.days) scheduledToday = ch.days.some((d: string) => d.includes(todayStr));
              if (scheduledToday && ch.blockedDates && ch.blockedDates.includes(todayStr)) scheduledToday = false;
              if (scheduledToday) {
                scheduledChambersRef.push({ chamber: ch, doctorId: docId, doctorName: info.name, specialty: info.specialty });
              }
            });
          });
          scheduledChambersRef.sort((a, b) => (a.chamber.startTime || '').localeCompare(b.chamber.startTime || ''));
        };

        rebuildScheduledChambers();

        // Listen to today's bookings
        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, where('clinicId', '==', clinicId), where('appointmentDate', '==', todayStr));

        unsubBookings = onSnapshot(q, (snap) => {
          const allBookings: QueuePatient[] = [];
          snap.docs.forEach(d => {
            const data = d.data();
            const isCancelled = data.isCancelled === true || data.status === 'cancelled';
            const isMarkedSeen = data.isMarkedSeen === true || data.eyeIconPressed === true || data.consultationCompleted === true;
            allBookings.push({
              id: d.id,
              patientName: data.patientName || 'Patient',
              serialNo: data.serialNo || 0,
              tokenNumber: data.tokenNumber || `#${data.serialNo || 0}`,
              status: isCancelled ? 'cancelled' : isMarkedSeen ? 'completed' : 'waiting',
              doctorId: data.doctorId || '',
              chamberName: data.chamberName || data.chamber || '',
              chamberId: data.chamberId?.toString() || '',
              isMarkedSeen,
              isCancelled,
              inChamber: data.inChamber === true,
            });
          });

          const chamberList: ChamberInfo[] = scheduledChambersRef.map((sc, idx) => {
            const chId = sc.chamber.id?.toString() || '';
            const chamberPatients = allBookings.filter(b =>
              b.doctorId === sc.doctorId && (
                (chId && b.chamberId === chId) ||
                (!chId && b.chamberName === sc.chamber.chamberName)
              )
            ).sort((a, b) => (a.serialNo || 0) - (b.serialNo || 0));

            const completed = chamberPatients.filter(p => p.status === 'completed').length;
            const waiting = chamberPatients.filter(p => p.status === 'waiting');
            // Use inChamber flag to determine current patient (receptionist sends patient in)
            const inChamberPatient = waiting.find(p => p.inChamber);
            const currentPatient = inChamberPatient || waiting[0];
            const nextPatient = currentPatient ? waiting.find(p => p.id !== currentPatient.id) : waiting[0];

            let startTime = sc.chamber.startTime || '';
            let endTime = sc.chamber.endTime || '';
            if (sc.chamber.todayReschedule?.date === todayStr) {
              startTime = sc.chamber.todayReschedule.startTime || startTime;
              endTime = sc.chamber.todayReschedule.endTime || endTime;
            }

            return {
              id: sc.chamber.id || idx,
              name: sc.chamber.chamberName || clinicData?.clinicName || 'Chamber',
              address: sc.chamber.chamberAddress || clinicData?.address || '',
              startTime,
              endTime,
              maxCapacity: sc.chamber.maxCapacity || 20,
              isActive: sc.chamber.isActive !== false,
              doctorId: sc.doctorId,
              doctorName: sc.doctorName,
              specialty: sc.specialty,
              patients: chamberPatients,
              bookedCount: chamberPatients.filter(p => p.status !== 'cancelled').length,
              completedCount: completed,
              waitingCount: waiting.length,
              currentToken: currentPatient?.serialNo || 0,
              currentPatientName: currentPatient?.patientName || '',
              nextToken: nextPatient?.serialNo || 0,
              nextPatientName: nextPatient?.patientName || '',
            };
          });

          // Detect token changes
          chamberList.forEach(ch => {
            const key = `${ch.doctorId}_${ch.id}`;
            const prev = prevTokensRef.current.get(key);
            if (prev !== undefined && prev !== ch.currentToken && ch.currentToken > 0) {
              playChime();
              setAnnouncement(`Token #${ch.currentToken} — ${ch.doctorName}`);
              setTimeout(() => setAnnouncement(''), 8000);
            }
            prevTokensRef.current.set(key, ch.currentToken);
          });

          setChambers(chamberList);
          const newScreens = buildScreenSequence(chamberList);
          screensRef.current = newScreens;
          setScreens(newScreens);
          setLoading(false);
        });

        // Refresh chamber ON/OFF status periodically
        chamberRefreshId = setInterval(async () => {
          for (const docId of allDocIds) {
            try {
              const doctorDoc = await getDoc(doc(db, 'doctors', docId));
              const d = doctorDoc.exists() ? doctorDoc.data() : null;
              const info = doctorDetailsRef.get(docId);
              if (d && info) info.chambers = d.chambers || [];
            } catch { /* skip */ }
          }
          rebuildScheduledChambers();
        }, 120000);
      } catch (error) {
        console.error('Queue display error:', error);
        setLoading(false);
      }
    };

    setup();
    return () => {
      if (unsubBookings) unsubBookings();
      if (chamberRefreshId) clearInterval(chamberRefreshId);
    };
  }, [clinicId, playChime, buildScreenSequence]);

  // Auto-rotate screens — use ref for stable access to latest screens array
  useEffect(() => {
    if (screens.length <= 1) return;
    if (screenTimerRef.current) clearInterval(screenTimerRef.current);
    screenTimerRef.current = setInterval(() => {
      setFadeClass('opacity-0');
      setTimeout(() => {
        const len = screensRef.current.length;
        if (len <= 1) return;
        setCurrentScreenIndex(prev => (prev + 1) % len);
        setFadeClass('opacity-100');
      }, 500);
    }, SCREEN_DURATION);
    return () => { if (screenTimerRef.current) clearInterval(screenTimerRef.current); };
  }, [screens.length]);

  // Keep index in bounds
  useEffect(() => {
    if (currentScreenIndex >= screens.length) setCurrentScreenIndex(0);
  }, [screens, currentScreenIndex]);

  const formatTime = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const formatSlot = (start: string, end: string) => {
    if (!start) return '';
    const to12 = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
    };
    return `${to12(start)} — ${to12(end)}`;
  };

  const isTimeOver = (endTime: string) => {
    if (!endTime) return false;
    const [h, m] = endTime.split(':').map(Number);
    const now = new Date();
    return now.getHours() > h || (now.getHours() === h && now.getMinutes() > m);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-14 h-14 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-2xl text-gray-400">Loading Queue Display...</p>
        </div>
      </div>
    );
  }

  const screen = screens[currentScreenIndex] || { type: 'schedule-overview' };
  const totalWaiting = chambers.reduce((s, c) => s + c.waitingCount, 0);
  const totalCompleted = chambers.reduce((s, c) => s + c.completedCount, 0);
  const totalBooked = chambers.reduce((s, c) => s + c.bookedCount, 0);

  // ============ SCREEN RENDERERS ============

  const renderScheduleOverview = () => (
    <div className="flex-1 flex flex-col p-6 lg:p-10">
      <div className="mb-8">
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-1">Today's Schedule</h2>
        <p className="text-base text-gray-400">{formatDate(currentTime)}</p>
      </div>

      {chambers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Clock className="w-20 h-20 text-gray-700 mx-auto mb-4" />
            <p className="text-2xl text-gray-500">No chambers scheduled today</p>
          </div>
        </div>
      ) : (() => {
        const totalPages = Math.ceil(chambers.length / CHAMBERS_PER_PAGE);
        const pageStart = chamberPage * CHAMBERS_PER_PAGE;
        const pageChambers = chambers.slice(pageStart, pageStart + CHAMBERS_PER_PAGE);
        return (
        <>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 flex-1">
          {pageChambers.map((ch, pi) => {
            const i = pageStart + pi;
            const color = DOCTOR_COLORS[i % DOCTOR_COLORS.length];
            const expired = isTimeOver(ch.endTime);
            return (
              <div key={`${ch.doctorId}-${ch.id}`} className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: color.bg, border: `1px solid ${color.border}` }}>
                <div className="px-6 py-5">
                  {/* Doctor row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: color.accent }}>
                        {ch.doctorName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{ch.doctorName}</h3>
                        <p className="text-sm" style={{ color: color.accent }}>{ch.specialty}</p>
                      </div>
                    </div>
                    {!ch.isActive ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">OFF</span>
                    ) : expired ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30">Time Over</span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ACTIVE</span>
                    )}
                  </div>

                  {/* Chamber info */}
                  <div className="space-y-1.5 text-sm text-gray-300 mb-4">
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-500" /><span>{ch.name}</span></div>
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-500" /><span className="font-mono">{formatSlot(ch.startTime, ch.endTime)}</span></div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="text-center"><p className="text-2xl font-bold text-white">{ch.bookedCount}</p><p className="text-[10px] uppercase text-gray-500">Booked</p></div>
                      <div className="text-center"><p className="text-2xl font-bold text-emerald-400">{ch.completedCount}</p><p className="text-[10px] uppercase text-gray-500">Seen</p></div>
                      <div className="text-center"><p className="text-2xl font-bold text-amber-400">{ch.waitingCount}</p><p className="text-[10px] uppercase text-gray-500">Waiting</p></div>
                    </div>
                    {ch.currentToken > 0 && (
                      <div className="text-right"><p className="text-xs text-gray-500">Now Serving</p><p className="text-3xl font-black" style={{ color: color.accent }}>#{ch.currentToken}</p></div>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="mt-3">
                    <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${ch.maxCapacity > 0 ? Math.min(100, (ch.bookedCount / ch.maxCapacity) * 100) : 0}%`, backgroundColor: color.accent }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">{ch.bookedCount}/{ch.maxCapacity}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            {Array.from({ length: totalPages }, (_, pg) => (
              <button key={pg} onClick={() => setChamberPage(pg)}
                className={`w-8 h-8 rounded-full text-sm font-bold transition-all ${
                  pg === chamberPage ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}>{pg + 1}</button>
            ))}
          </div>
        )}
        </>
        );
      })()}
    </div>
  );

  const renderChamberPatients = (chamberIndex: number) => {
    const ch = chambers[chamberIndex];
    if (!ch) return renderScheduleOverview();
    const color = DOCTOR_COLORS[chamberIndex % DOCTOR_COLORS.length];

    return (
      <div className="flex-1 flex flex-col p-6 lg:p-10">
        {/* Doctor header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: color.accent }}>
              <Stethoscope className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white">{ch.doctorName}</h2>
              <p className="text-base" style={{ color: color.accent }}>{ch.specialty} • {ch.name}</p>
              <p className="text-sm text-gray-500 font-mono">{formatSlot(ch.startTime, ch.endTime)}</p>
            </div>
          </div>
          {ch.currentToken > 0 && (
            <div className="px-5 py-3 rounded-2xl" style={{ backgroundColor: color.bg, border: `2px solid ${color.border}` }}>
              <p className="text-xs text-gray-400 text-center">Now Serving</p>
              <p className="text-5xl font-black text-center" style={{ color: color.accent }}>#{ch.currentToken}</p>
            </div>
          )}
        </div>

        {/* Patient List */}
        {ch.patients.length === 0 ? (
          <div className="flex-1 flex items-center justify-center"><p className="text-xl text-gray-500">No patients booked yet</p></div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="grid gap-2 lg:gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {ch.patients.map(p => (
                <div key={p.id}
                  className={`rounded-xl px-4 py-3 flex items-center gap-4 transition-all ${
                    p.status === 'completed' ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : p.status === 'cancelled' ? 'bg-red-500/10 border border-red-500/20 opacity-50'
                    : p.inChamber ? 'border-2 animate-pulse' : p.serialNo === ch.currentToken ? 'border-2' : 'bg-white/5 border border-white/10'
                  }`}
                  style={(p.inChamber || p.serialNo === ch.currentToken) && p.status === 'waiting' ? { borderColor: color.accent, backgroundColor: `${color.accent}22` } : {}}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    p.status === 'completed' ? 'bg-emerald-500 text-white'
                    : p.status === 'cancelled' ? 'bg-red-500/30 text-red-400 line-through' : 'bg-gray-700 text-gray-300'
                  }`} style={(p.inChamber || p.serialNo === ch.currentToken) && p.status === 'waiting' ? { backgroundColor: color.accent, color: '#fff' } : {}}>
                    {p.serialNo}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold text-sm truncate ${p.status === 'cancelled' ? 'line-through text-gray-500' : 'text-white'}`}>{p.patientName}</p>
                    <p className="text-xs text-gray-500">
                      {p.status === 'completed' ? '✅ Done' : p.status === 'cancelled' ? '✕ Cancelled' : p.inChamber ? '🔔 In Chamber' : p.serialNo === ch.currentToken ? '⏳ Next' : 'Waiting'}
                    </p>
                  </div>
                  {p.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderNowServing = (chamberIndex: number) => {
    const ch = chambers[chamberIndex];
    if (!ch || ch.currentToken <= 0) return renderScheduleOverview();
    const color = DOCTOR_COLORS[chamberIndex % DOCTOR_COLORS.length];

    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-lg lg:text-xl text-gray-400 uppercase tracking-[0.3em] mb-6">Now Serving</p>
          <div className="w-52 h-52 lg:w-72 lg:h-72 rounded-full flex items-center justify-center mx-auto mb-8 aspect-square animate-pulse"
            style={{ backgroundColor: `${color.accent}22`, border: `4px solid ${color.accent}` }}>
            <span className="font-black" style={{ fontSize: '8rem', color: color.accent }}>{ch.currentToken}</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2">{ch.currentPatientName}</h2>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: color.accent }}>
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-xl text-white font-semibold">{ch.doctorName}</p>
              <p className="text-sm" style={{ color: color.accent }}>{ch.name} • {ch.specialty}</p>
            </div>
          </div>
          <div className="mt-8 flex items-center justify-center gap-8 text-gray-400">
            <div className="text-center"><p className="text-3xl font-bold text-emerald-400">{ch.completedCount}</p><p className="text-xs uppercase tracking-wider">Seen</p></div>
            <div className="w-px h-10 bg-gray-700" />
            <div className="text-center"><p className="text-3xl font-bold text-amber-400">{ch.waitingCount}</p><p className="text-xs uppercase tracking-wider">Waiting</p></div>
          </div>
        </div>
      </div>
    );
  };

  const renderNextReady = (chamberIndex: number) => {
    const ch = chambers[chamberIndex];
    if (!ch || ch.nextToken <= 0) return renderScheduleOverview();

    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500/20 border border-amber-500/30 mb-8">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span className="text-lg font-semibold text-amber-300 uppercase tracking-widest">Please Be Ready</span>
          </div>
          <p className="text-xl text-gray-400 mb-6">Next Patient</p>
          <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-full flex items-center justify-center mx-auto mb-6 aspect-square"
            style={{ backgroundColor: 'rgba(245,158,11,0.15)', border: '3px solid rgba(245,158,11,0.4)' }}>
            <span className="font-black text-amber-400" style={{ fontSize: '6rem' }}>{ch.nextToken}</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2">{ch.nextPatientName}</h2>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Stethoscope className="w-5 h-5 text-gray-400" />
            <p className="text-lg text-gray-300">{ch.doctorName} • {ch.name}</p>
          </div>
          <p className="mt-8 text-gray-500 text-base">Please proceed to the consultation area</p>
        </div>
      </div>
    );
  };

  const renderCurrentScreen = () => {
    switch (screen.type) {
      case 'schedule-overview': return renderScheduleOverview();
      case 'chamber-patients': return renderChamberPatients(screen.chamberIndex);
      case 'now-serving': return renderNowServing(screen.chamberIndex);
      case 'next-ready': return renderNextReady(screen.chamberIndex);
      default: return renderScheduleOverview();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white flex flex-col overflow-hidden select-none">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-[#0d1425] to-[#0a0e1a] border-b border-gray-800/50 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">{clinicName}</h1>
            {clinicAddress && <p className="text-xs text-gray-500 truncate max-w-xs">{clinicAddress}</p>}
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden md:flex items-center gap-6">
            <div className="text-center px-2"><p className="text-xl font-bold text-amber-400">{totalWaiting}</p><p className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Waiting</p></div>
            <div className="text-center px-2"><p className="text-xl font-bold text-emerald-400">{totalCompleted}</p><p className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Seen</p></div>
            <div className="text-center px-2"><p className="text-xl font-bold text-blue-400">{totalBooked}</p><p className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Booked</p></div>
          </div>
          <div className="w-px h-8 bg-gray-700/50 hidden md:block" />
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-lg hover:bg-gray-800/50 transition-colors">
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-gray-600" />}
          </button>
          {screens.length > 1 && (
            <div className="flex items-center gap-1">
              {screens.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentScreenIndex ? 'bg-emerald-400 w-4' : 'bg-gray-700 w-1.5'}`} />
              ))}
            </div>
          )}
          <p className="text-2xl lg:text-3xl font-mono font-bold text-white tracking-wider">{formatTime(currentTime)}</p>
        </div>
      </div>

      {/* Announcement */}
      {announcement && (
        <div className="bg-emerald-500/15 border-b border-emerald-500/20 px-6 py-2.5 shrink-0">
          <p className="text-center text-lg font-semibold text-emerald-300 animate-pulse">🔔 Now Calling — {announcement}</p>
        </div>
      )}

      {/* Main Screen */}
      <div className={`flex-1 flex flex-col transition-opacity duration-300 ${fadeClass}`}>
        {renderCurrentScreen()}
      </div>

      {/* Bottom Bar */}
      <div className="bg-[#0d1425] border-t border-gray-800/50 px-6 py-2 flex items-center justify-between shrink-0">
        <p className="text-xs text-gray-600">Powered by <span className="text-emerald-500 font-medium">HealQR</span></p>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-xs text-gray-600">Live • Auto-refreshing</p>
        </div>
      </div>
    </div>
  );
}
