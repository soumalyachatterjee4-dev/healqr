import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase/config';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { Calendar, Clock, Loader2, AlertCircle, CheckCircle2, ArrowLeft, Briefcase, Phone, Building2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import SelectChamber from './SelectChamber';

interface ProfessionalVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  mrId: string;
  mrData: any;
  doctorLink: any; // The mrDoctorLink document
}

export function ProfessionalVisitModal({ isOpen, onClose, mrId, mrData, doctorLink }: ProfessionalVisitModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'loading' | 'date' | 'chamber' | 'confirm' | 'success'>('loading');
  const [isSpecial, setIsSpecial] = useState(false);
  const [lastVisit, setLastVisit] = useState<any>(null);
  const [chambers, setChambers] = useState<any[]>([]);
  const [advanceBookingDays, setAdvanceBookingDays] = useState(30);

  // Doctor info for SelectChamber
  const [doctorData, setDoctorData] = useState<any>(null);

  // Selections
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedChamberName, setSelectedChamberName] = useState('');
  const [selectedChamberId, setSelectedChamberId] = useState<number | null>(null);
  const [selectedChamberData, setSelectedChamberData] = useState<any>(null);

  // MR slot booking
  const [chamberBookings, setChamberBookings] = useState<any[]>([]);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [specialReason, setSpecialReason] = useState('');

  // Frequency logic
  const getDaysLimit = (frequency: string) => {
    switch (frequency?.toLowerCase()) {
      case 'weekly': return 7;
      case 'bi-weekly': return 14;
      case 'monthly': return 30;
      case 'quarterly': return 90;
      default: return 0;
    }
  };

  const loadDoctorData = async () => {
    if (!db || !mrId || !doctorLink?.doctorId) return;
    setLoading(true);
    try {
      const drDoc = await getDoc(doc(db, 'doctors', doctorLink.doctorId));
      if (drDoc.exists()) {
        const data = drDoc.data();
        setDoctorData(data);
        // Filter chambers: only MR-allowed ones
        const allowedChambers = (data.chambers || []).filter((c: any) => c.mrAllowed === true);
        setChambers(allowedChambers);
        setAdvanceBookingDays(data.advanceBookingDays || data.maxAdvanceBookingDays || 30);
      }

      // Check last visit
      const q = query(
        collection(db, 'mrBookings'),
        where('mrId', '==', mrId),
        where('doctorId', '==', doctorLink.doctorId),
        where('status', 'in', ['confirmed', 'met', 'pending_special'])
      );
      const snap = await getDocs(q);
      let latestVisitDate: Date | null = null;
      let latestVisitData = null;

      snap.forEach(doc => {
        const d = doc.data();
        const visitDate = new Date(d.appointmentDate);
        if (!latestVisitDate || visitDate > latestVisitDate) {
          latestVisitDate = visitDate;
          latestVisitData = d;
        }
      });

      if (latestVisitDate && latestVisitData) {
        setLastVisit({ ...latestVisitData, dateObj: latestVisitDate });
      }

      setStep('date');
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStep('loading');
      setSelectedDate(null);
      setSelectedChamberName('');
      setSelectedChamberId(null);
      setSelectedChamberData(null);
      setSelectedSlotIndex(null);
      setIsSpecial(false);
      setSpecialReason('');
      setChamberBookings([]);
      // Set the doctor ID in sessionStorage so SelectChamber can load booking counts
      if (doctorLink?.doctorId) {
        sessionStorage.setItem('booking_doctor_id', doctorLink.doctorId);
        // Clear clinic-specific filters so SelectChamber doesn't filter by clinic
        sessionStorage.removeItem('booking_source');
        sessionStorage.removeItem('booking_clinic_id');
      }
      loadDoctorData();
    }
  }, [isOpen, doctorLink]);

  // Load MR slot bookings when chamber + date selected
  useEffect(() => {
    if (selectedChamberData && selectedDate) {
      fetchChamberBookings();
    }
  }, [selectedChamberData, selectedDate]);

  const fetchChamberBookings = async () => {
    if (!db || !selectedChamberData || !selectedDate) return;
    try {
      const dateStr = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const q = query(
        collection(db, 'mrBookings'),
        where('chamberId', '==', selectedChamberData.id),
        where('appointmentDate', '==', dateStr),
        where('status', 'in', ['confirmed', 'pending_special', 'met'])
      );
      const snap = await getDocs(q);
      setChamberBookings(snap.docs.map(d => d.data()));
    } catch (err) {
      console.error('Failed to fetch MR bookings', err);
    }
  };

  if (!isOpen) return null;

  const daysLimit = getDaysLimit(doctorLink?.frequency);
  const canBookNormally = () => {
    if (!selectedDate || !lastVisit || daysLimit === 0) return true;
    const diffTime = Math.abs(selectedDate.getTime() - lastVisit.dateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= daysLimit;
  };

  const handleDateConfirm = () => {
    if (!selectedDate) return;
    // Check frequency lockout
    if (!canBookNormally() && !isSpecial) return;
    setStep('chamber');
  };

  const handleChamberSelected = (chamberName: string, _consultationType: 'chamber' | 'video', chamberId?: number) => {
    setSelectedChamberName(chamberName);
    setSelectedChamberId(chamberId ?? null);
    // Find the actual chamber data for slot booking
    const chamber = chambers.find(c => c.id === chamberId);
    setSelectedChamberData(chamber || null);
    setSelectedSlotIndex(null);
    setStep('confirm');
  };

  const handleBook = async () => {
    if (!selectedDate || !selectedChamberData || selectedSlotIndex === null) return;
    setLoading(true);
    try {
      const dateStr = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const finalIsSpecial = isSpecial || !canBookNormally();
      const visitData = {
        mrId,
        mrName: mrData.name,
        mrPhone: mrData.phone,
        mrCompany: mrData.company,
        mrDivision: mrData.division,
        doctorId: doctorLink.doctorId,
        doctorName: doctorLink.doctorName,
        chamberId: typeof selectedChamberData.id === 'string' ? parseInt(selectedChamberData.id, 10) : selectedChamberData.id,
        chamberName: selectedChamberData.chamberName || selectedChamberData.name || 'General Chamber',
        chamberAddress: selectedChamberData.chamberAddress || '',
        appointmentDate: dateStr,
        slotIndex: selectedSlotIndex,
        isSpecial: finalIsSpecial,
        specialReason: finalIsSpecial ? specialReason : '',
        status: finalIsSpecial ? 'pending_special' : 'confirmed',
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'mrBookings'), visitData);
      setStep('success');
    } catch (err) {
      console.error(err);
      toast.error('Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const isLocked = selectedDate && !canBookNormally() && !isSpecial;

  // ─── STEP: Loading ────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0f1a] flex items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
          <p className="text-gray-400">Loading doctor data...</p>
        </div>
      </div>
    );
  }

  // ─── STEP: Success ────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0f1a] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-semibold text-white mb-3">Booking Submitted!</h3>
          <p className="text-gray-400 text-sm mb-2">
            Your professional visit has been scheduled.
          </p>
          {isSpecial && (
            <p className="text-yellow-400 text-sm mb-4">
              This is a special appointment and requires doctor approval.
            </p>
          )}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Doctor</span>
              <span className="text-white">Dr. {doctorLink?.doctorName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Chamber</span>
              <span className="text-white">{selectedChamberName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Date</span>
              <span className="text-white">{selectedDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Slot</span>
              <span className="text-white">#{(selectedSlotIndex ?? 0) + 1}</span>
            </div>
            {isSpecial && specialReason && (
              <div className="pt-2 border-t border-zinc-800 mt-2">
                <span className="text-xs text-gray-400 block mb-1">Reason for Special Request</span>
                <p className="text-sm text-yellow-400/90 italic leading-relaxed">"{specialReason}"</p>
              </div>
            )}
          </div>
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 w-full h-12 rounded-xl text-base">Done</Button>
        </div>
      </div>
    );
  }

  // ─── STEP: Date Selection ─────────────────────────────
  if (step === 'date') {
    const dateValue = selectedDate
      ? new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]
      : '';

    return (
      <div className="fixed inset-0 z-50 bg-[#0a0f1a] flex flex-col min-h-screen">
        {/* Header */}
        <div className="bg-[#1a1f2e] border-b border-gray-800 sticky top-0 z-50 shadow-lg">
          <div className="max-w-md mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="text-white hover:bg-white/10 rounded-full p-2 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-base truncate">Professional Visit</h3>
                <p className="text-xs text-blue-400 truncate">Dr. {doctorLink?.doctorName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-start justify-center min-h-full p-4 py-6">
            <div className="w-full max-w-md">

              <div className="text-center mb-6">
                <h1 className="text-white text-xl font-semibold mb-2">Select Visit Date</h1>
                <p className="text-gray-400 text-sm">Choose a date for your professional visit</p>
              </div>

              <div className="bg-[#1a1f2e] rounded-3xl p-6 shadow-2xl space-y-6">
                {/* Frequency Info */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex gap-3 text-sm">
                  <Clock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-400">Visit Frequency: {doctorLink?.frequency || 'Any'}</p>
                    {lastVisit && (
                      <p className="text-blue-300 mt-1">Last visit: {lastVisit.appointmentDate}</p>
                    )}
                  </div>
                </div>

                {/* Date Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={dateValue}
                    min={new Date().toISOString().split('T')[0]}
                    max={new Date(Date.now() + advanceBookingDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    onChange={e => {
                      if (e.target.value) {
                        const [y, m, d] = e.target.value.split('-').map(Number);
                        setSelectedDate(new Date(y, m - 1, d));
                      } else {
                        setSelectedDate(null);
                      }
                    }}
                    className="w-full bg-[#0f1419] border-2 border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 [color-scheme:dark] text-base"
                  />
                </div>

                {/* Lockout Warning & Special Toggle */}
                {selectedDate && !canBookNormally() && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <div className="flex gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
                      <div>
                        <p className="text-sm text-yellow-400 font-medium">Frequency limit reached</p>
                        <p className="text-xs text-yellow-500/80 mt-1">
                          You cannot book a normal visit before the {daysLimit}-day interval passes.
                        </p>
                        <label className="flex items-start gap-2 mt-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSpecial}
                            onChange={e => setIsSpecial(e.target.checked)}
                            className="mt-1 accent-yellow-400"
                          />
                          <span className="text-sm text-gray-300">
                            Request a <strong>Special Professional Appointment</strong> (e.g. Higher Management visit). Subject to doctor approval.
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Continue Button */}
                <Button
                  onClick={handleDateConfirm}
                  disabled={!selectedDate || !!isLocked}
                  className={`w-full h-12 rounded-xl text-base ${
                    selectedDate && !isLocked
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Continue to Select Chamber
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="py-3 text-center text-xs text-gray-500 border-t border-gray-800">
          Powered by HealQR.com
        </div>
      </div>
    );
  }

  // ─── STEP: Chamber Selection (reuse existing SelectChamber) ─────
  if (step === 'chamber' && selectedDate) {
    // Filter MR-allowed chambers for the selected day (same logic as patient flow)
    const selectedDayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const selectedDateStr = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    const filteredChambers = chambers.filter((chamber: any) => {
      if (chamber.frequency === 'Daily') return true;
      if (chamber.frequency === 'Custom') return chamber.customDate === selectedDateStr;
      if (chamber.days && Array.isArray(chamber.days)) return chamber.days.includes(selectedDayName);
      return false;
    });

    return (
      <SelectChamber
        selectedDate={selectedDate}
        onContinue={handleChamberSelected}
        onBack={() => setStep('date')}
        hasVideoConsultation={false}
        chambers={filteredChambers}
        doctorName={doctorData?.name || doctorLink?.doctorName || ''}
        doctorPhoto={doctorData?.profileImage || ''}
        doctorDegrees={doctorData?.degrees || []}
        useDrPrefix={doctorData?.useDrPrefix !== false}
        themeColor="blue"
        doctorId={doctorLink?.doctorId}
        mrMode={true}
      />
    );
  }

  // ─── STEP: Confirm (MR Details + Slot Selection) ──────
  if (step === 'confirm') {
    const mrMaxCount = parseInt(selectedChamberData?.mrMaxCount) || 1;

    return (
      <div className="fixed inset-0 z-50 bg-[#0a0f1a] flex flex-col min-h-screen">
        {/* Header */}
        <div className="bg-[#1a1f2e] border-b border-gray-800 sticky top-0 z-50 shadow-lg">
          <div className="max-w-md mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setStep('chamber'); setSelectedSlotIndex(null); }}
                className="text-white hover:bg-white/10 rounded-full p-2 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-base truncate">Confirm Booking</h3>
                <p className="text-xs text-blue-400 truncate">Dr. {doctorLink?.doctorName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-start justify-center min-h-full p-4 py-6">
            <div className="w-full max-w-md space-y-4">

              {/* Visit Summary */}
              <div className="bg-[#1a1f2e] rounded-2xl p-5 shadow-2xl space-y-3">
                <h3 className="text-white font-semibold text-base mb-3">Visit Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Date</span>
                    <span className="text-white font-medium">
                      {selectedDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Chamber</span>
                    <span className="text-white font-medium">{selectedChamberName}</span>
                  </div>
                  {selectedChamberData?.chamberAddress && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Location</span>
                      <span className="text-white font-medium text-right max-w-[60%]">{selectedChamberData.chamberAddress}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Timing</span>
                    <span className="text-white font-medium">
                      {selectedChamberData?.startTime || ''} - {selectedChamberData?.endTime || ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* MR Details (auto-fetched) */}
              <div className="bg-[#1a1f2e] rounded-2xl p-5 shadow-2xl">
                <h3 className="text-white font-semibold text-base mb-3">MR Details</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{mrData?.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {mrData?.company} · {mrData?.division}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {mrData?.phone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slot Selection */}
              <div className="bg-[#1a1f2e] rounded-2xl p-5 shadow-2xl">
                <h3 className="text-white font-semibold text-base mb-1">Select Available Slot</h3>
                <p className="text-xs text-gray-400 mb-4">Pick an available MR slot for this chamber</p>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: mrMaxCount }).map((_, i) => {
                    const isBooked = chamberBookings.some(b => b.slotIndex === i);
                    return (
                      <button
                        key={i}
                        disabled={isBooked}
                        onClick={() => setSelectedSlotIndex(i)}
                        className={`aspect-square rounded-xl flex items-center justify-center font-semibold text-sm transition-all ${
                          isBooked
                            ? 'bg-red-500/10 text-red-400/50 cursor-not-allowed border border-red-500/20'
                            : selectedSlotIndex === i
                            ? 'bg-blue-600 text-white border-2 border-blue-400 shadow-lg shadow-blue-500/20'
                            : 'bg-[#0f1419] text-gray-300 border-2 border-gray-700 hover:border-blue-500/50'
                        }`}
                      >
                        {isBooked ? '✕' : i + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#0f1419] border border-gray-700 inline-block"></span> Available</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-600 inline-block"></span> Selected</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/10 border border-red-500/20 inline-block"></span> Booked</span>
                </div>
              </div>

              {/* Special Appointment Info & Reason Input */}
              {isSpecial && (
                <div className="space-y-3">
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
                    <p className="text-sm text-yellow-400">
                      This is a <strong>Special Appointment</strong>. It will require doctor approval before confirmation.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      Reason for Special Request
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded uppercase">Required</span>
                    </label>
                    <textarea 
                      value={specialReason}
                      onChange={(e) => setSpecialReason(e.target.value)}
                      placeholder="e.g. Higher Management Visit, Emergency Meeting, Quarterly Review..."
                      className="w-full bg-[#0f1419] border-2 border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm min-h-[80px] resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                className={`w-full h-12 rounded-xl text-base font-medium ${
                  selectedSlotIndex !== null && (!isSpecial || specialReason.trim())
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
                disabled={loading || selectedSlotIndex === null || (isSpecial && !specialReason.trim())}
                onClick={handleBook}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Professional Visit'}
              </Button>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="py-3 text-center text-xs text-gray-500 border-t border-gray-800">
          Powered by HealQR.com
        </div>
      </div>
    );
  }

  return null;
}
