import { useState, useEffect } from 'react';
import { db } from '../lib/firebase/config';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import healqrLogo from '../assets/healqr.logo.png';
import {
  Loader2, ArrowLeft, Calendar, Clock, User, Phone, MapPin,
  CheckCircle2, ChevronRight, FileText, Stethoscope
} from 'lucide-react';
import { toast } from 'sonner';

const SERVICE_LABELS: Record<string, string> = {
  'phlebotomist': 'Sample Collection',
  'physiotherapist': 'Therapy Session',
  'nurse': 'Nursing Visit',
  'wound-dresser': 'Wound Dressing',
  'aaya': 'Patient Care',
  'home-assistant': 'Home Care Visit',
};

type BookingStep = 'chamber' | 'schedule' | 'details' | 'confirmation';

interface ParamedicalBookingFlowProps {
  onBack: () => void;
}

// Helper: get day list from a schedule (supports both new days[] and legacy day)
const getScheduleDays = (s: any): string[] =>
  s.days && Array.isArray(s.days) && s.days.length ? s.days : (s.day ? [s.day] : []);

export default function ParamedicalBookingFlow({ onBack }: ParamedicalBookingFlowProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<BookingStep>('chamber');
  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);

  // Chamber state
  const [selectedChamber, setSelectedChamber] = useState<any>(null);

  // Schedule state
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);

  // Patient details
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pincode, setPincode] = useState('');
  const [notes, setNotes] = useState('');

  const paraId = sessionStorage.getItem('booking_paramedical_id') || '';

  useEffect(() => {
    const load = async () => {
      if (!paraId) { setLoading(false); return; }
      try {
        const snap = await getDoc(doc(db, 'paramedicals', paraId));
        if (snap.exists()) {
          setProfile({ uid: snap.id, ...snap.data() });
        } else {
          const oldSnap = await getDoc(doc(db, 'phlebotomists', paraId));
          if (oldSnap.exists()) setProfile({ uid: oldSnap.id, ...oldSnap.data() });
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [paraId]);

  // Auto-skip chamber step if only one chamber exists
  useEffect(() => {
    if (!profile || loading) return;
    if (step !== 'chamber' || selectedChamber) return;
    const active = (profile.schedules || []).filter((s: any) => s.isActive);
    if (active.length === 1) {
      setSelectedChamber(active[0]);
      setStep('schedule');
    }
  }, [profile, loading, step, selectedChamber]);

  // When date is selected, find matching time slots for the selected chamber
  useEffect(() => {
    if (!profile?.schedules?.length || !selectedDate || !selectedChamber) return;
    const dateObj = new Date(selectedDate);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    // Only show slots belonging to the chosen chamber that are active on this day
    const matchingSlots = profile.schedules.filter((s: any) => {
      if (!s.isActive) return false;
      const chamberMatch = s.id === selectedChamber.id;
      if (!chamberMatch) return false;
      return getScheduleDays(s).includes(dayName);
    });
    setAvailableSlots(matchingSlots);
    setSelectedSlot('');
  }, [selectedDate, profile, selectedChamber]);

  // Group schedules by chamber (unique chamberName + chamberAddress)
  const getChambers = () => {
    if (!profile?.schedules?.length) return [];
    const activeSchedules = profile.schedules.filter((s: any) => s.isActive);
    // De-duplicate by schedule id — each schedule entry is its own "chamber"
    return activeSchedules;
  };

  const getAvailableDates = () => {
    if (!profile?.schedules?.length || !selectedChamber) return [];
    const days = getScheduleDays(selectedChamber);
    const activeDaysSet = new Set(days);
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      if (activeDaysSet.has(dayName)) {
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    return dates;
  };

  const handleSubmit = async () => {
    if (!patientName.trim() || !patientPhone.trim()) {
      toast.error('Please fill patient name and phone');
      return;
    }
    if (patientPhone.replace(/\D/g, '').length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setSubmitting(true);
    try {
      const serviceLabel = SERVICE_LABELS[profile?.role] || 'Service';
      const bookingSource = sessionStorage.getItem('booking_source') || 'direct';
      const scanSessionId = sessionStorage.getItem('scan_session_id') || '';

      // Generate serial number
      const todayStr = selectedDate;
      const existingQ = query(
        collection(db, 'paramedicalBookings'),
        where('paramedicalId', '==', paraId),
        where('appointmentDate', '==', todayStr)
      );
      const existingSnap = await getDocs(existingQ);
      const serialNo = existingSnap.size + 1;

      // Generate HQR-style booking ID
      const datePart = selectedDate.replace(/-/g, '').slice(2);
      const bookingId = `HQR-${datePart}-${String(serialNo).padStart(4, '0')}-P`;

      const bookingData: any = {
        paramedicalId: paraId,
        paramedicalName: profile?.name || '',
        paramedicalRole: profile?.role || '',
        serviceType: serviceLabel,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim().startsWith('+91') ? patientPhone.trim() : `+91${patientPhone.trim().replace(/^0+/, '')}`,
        patientAge: patientAge.trim(),
        patientGender,
        appointmentDate: selectedDate,
        timeSlot: selectedSlot,
        address: address.trim(),
        landmark: landmark.trim(),
        pincode: pincode.trim(),
        notes: notes.trim(),
        status: 'confirmed',
        serialNo,
        tokenNumber: `#${serialNo}`,
        bookingId,
        bookingSource,
        scanSessionId,
        visitType: 'qr',
        isWalkIn: false,
        createdAt: serverTimestamp(),
      };

      // Attach chamber details so Today's Schedule can associate the booking
      if (selectedChamber) {
        bookingData.scheduleId = selectedChamber.id;
        if (selectedChamber.chamberName) bookingData.chamberName = selectedChamber.chamberName;
        if (selectedChamber.chamberAddress) bookingData.chamberAddress = selectedChamber.chamberAddress;
        if (selectedChamber.clinicCode) bookingData.clinicCode = selectedChamber.clinicCode;
      }

      const docRef = await addDoc(collection(db, 'paramedicalBookings'), bookingData);
      setConfirmationData({ ...bookingData, id: docRef.id, serialNo });
      setBookingConfirmed(true);
      toast.success('Booking confirmed!');
    } catch (err: any) {
      console.error('Booking error:', err);
      toast.error('Booking failed', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  const serviceLabel = SERVICE_LABELS[profile?.role] || 'Service';
  const availableDates = getAvailableDates();
  const chambers = getChambers();

  // ===== CONFIRMATION SCREEN =====
  if (bookingConfirmed && confirmationData) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="h-20 w-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold">Booking Confirmed!</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Service</span>
              <span className="text-white text-sm">{confirmationData.serviceType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Professional</span>
              <span className="text-white text-sm">{confirmationData.paramedicalName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Date</span>
              <span className="text-white text-sm">{new Date(confirmationData.appointmentDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Time</span>
              <span className="text-white text-sm">{confirmationData.timeSlot}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Token #</span>
              <span className="text-teal-400 font-bold text-lg">{confirmationData.serialNo}</span>
            </div>
            {confirmationData.bookingId && (
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Booking ID</span>
                <span className="text-blue-400 font-mono text-xs">{confirmationData.bookingId}</span>
              </div>
            )}
            {confirmationData.chamberName && (
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Chamber</span>
                <span className="text-white text-sm text-right">{confirmationData.chamberName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Patient</span>
              <span className="text-white text-sm">{confirmationData.patientName}</span>
            </div>
          </div>
          <p className="text-gray-500 text-sm">The professional will contact you to confirm the visit.</p>
          <Button variant="outline" onClick={onBack} className="w-full border-zinc-700 text-white">Done</Button>
        </div>
      </div>
    );
  }

  // ===== STEP: CHAMBER =====
  if (step === 'chamber') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
          <span className="text-white font-semibold text-sm">Select Chamber</span>
        </div>

        <div className="max-w-lg mx-auto p-4 space-y-6">
          {/* Professional info */}
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <p className="text-white font-medium">{profile?.name}</p>
              <p className="text-gray-400 text-sm">{serviceLabel}</p>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-500" /> Choose a Chamber
            </h3>
            {chambers.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                <p className="text-gray-500">No active chambers. This professional hasn't set up any schedules yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chambers.map((c: any) => {
                  const dList = getScheduleDays(c);
                  const isSelected = selectedChamber?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedChamber(c); setStep('schedule'); }}
                      className={`w-full text-left p-4 rounded-xl border transition-colors ${
                        isSelected ? 'bg-teal-500/10 border-teal-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <p className="text-white font-semibold uppercase text-sm">{c.chamberName || 'Chamber'}</p>
                      {c.chamberAddress && <p className="text-gray-400 text-xs mt-1">{c.chamberAddress}</p>}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {dList.map((d: string) => (
                          <span key={d} className="px-2 py-0.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-400 text-[10px] font-medium">
                            {d.slice(0, 3)}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                        <Clock className="w-3 h-3" />
                        <span>{c.startTime} – {c.endTime}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===== STEP: SCHEDULE =====
  if (step === 'schedule') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => { if (chambers.length > 1) { setStep('chamber'); setSelectedChamber(null); } else { onBack(); } }} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-semibold text-sm">Select Date & Time</span>
        </div>

        <div className="max-w-lg mx-auto p-4 space-y-6">
          {/* Professional info */}
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <p className="text-white font-medium">{profile?.name}</p>
              <p className="text-gray-400 text-sm">{serviceLabel}</p>
            </div>
          </div>

          {/* Date selection */}
          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-teal-500" /> Choose a Date</h3>
            {availableDates.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                <p className="text-gray-500">No available dates. This professional hasn't set up their schedule yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableDates.map(date => {
                  const d = new Date(date);
                  const isSelected = selectedDate === date;
                  return (
                    <button key={date} onClick={() => setSelectedDate(date)}
                      className={`p-3 rounded-xl border text-center transition-colors ${isSelected ? 'bg-teal-500/20 border-teal-500 text-teal-400' : 'bg-zinc-900 border-zinc-800 text-gray-300 hover:border-zinc-600'}`}>
                      <p className="text-xs text-gray-400">{d.toLocaleDateString('en-IN', { weekday: 'short' })}</p>
                      <p className="text-lg font-bold">{d.getDate()}</p>
                      <p className="text-xs">{d.toLocaleDateString('en-IN', { month: 'short' })}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-teal-500" /> Choose a Time Slot</h3>
              {availableSlots.length === 0 ? (
                <p className="text-gray-500 text-sm">No time slots available for this day.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableSlots.map((slot: any, i: number) => {
                    const label = `${slot.startTime} - ${slot.endTime}`;
                    const isSelected = selectedSlot === label;
                    return (
                      <button key={i} onClick={() => setSelectedSlot(label)}
                        className={`p-3 rounded-xl border text-sm transition-colors ${isSelected ? 'bg-teal-500/20 border-teal-500 text-teal-400' : 'bg-zinc-900 border-zinc-800 text-gray-300 hover:border-zinc-600'}`}>
                        <Clock className="w-4 h-4 inline mr-1" />{label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {selectedDate && selectedSlot && (
            <Button onClick={() => setStep('details')} className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-lg">
              Continue <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ===== STEP: PATIENT DETAILS =====
  if (step === 'details') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setStep('schedule')} className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
          <span className="text-white font-semibold text-sm">Patient Details</span>
        </div>

        <div className="max-w-lg mx-auto p-4 space-y-4">
          {/* Summary */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs">Booking for</p>
              <p className="text-white font-medium">{new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs">Time</p>
              <p className="text-teal-400 font-medium">{selectedSlot}</p>
            </div>
          </div>

          {/* Patient info */}
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Patient Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input value={patientName} onChange={e => setPatientName(e.target.value)}
                  className="pl-10 bg-black border-zinc-800 text-white h-12" placeholder="Full name" />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input value={patientPhone} onChange={e => setPatientPhone(e.target.value)}
                  className="pl-10 bg-black border-zinc-800 text-white h-12" placeholder="9876543210" type="tel" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Age</label>
                <Input value={patientAge} onChange={e => setPatientAge(e.target.value)}
                  className="bg-black border-zinc-800 text-white h-12" placeholder="Age" type="number" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Gender</label>
                <select value={patientGender} onChange={e => setPatientGender(e.target.value)}
                  className="w-full h-12 bg-black border border-zinc-800 text-white rounded-lg px-3" style={{ colorScheme: 'dark' }}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <h4 className="text-white text-sm font-medium mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-teal-500" /> Visit Address</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Full Address</label>
                  <textarea value={address} onChange={e => setAddress(e.target.value)}
                    className="w-full bg-black border border-zinc-800 text-white rounded-lg p-3 min-h-[60px]" placeholder="House/Flat, Street, Area" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Landmark</label>
                    <Input value={landmark} onChange={e => setLandmark(e.target.value)}
                      className="bg-black border-zinc-800 text-white h-10" placeholder="Near..." />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Pincode</label>
                    <Input value={pincode} onChange={e => setPincode(e.target.value)}
                      className="bg-black border-zinc-800 text-white h-10" placeholder="700001" maxLength={6} />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Notes / Special Instructions</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full bg-black border border-zinc-800 text-white rounded-lg p-3 min-h-[60px]" placeholder="Any specific requirements..." />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={submitting}
            className="w-full h-14 bg-teal-600 hover:bg-teal-700 text-lg font-semibold mt-4">
            {submitting ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Confirming...</> : <>Confirm Booking <CheckCircle2 className="w-5 h-5 ml-2" /></>}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
