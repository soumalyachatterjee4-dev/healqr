import { useState, useEffect } from 'react';
import { db } from '../lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

import LanguageSelection from './LanguageSelection';
import SelectDate from './SelectDate';
import SelectChamber from './SelectChamber';
import PatientDetailsForm, { PatientFormData } from './PatientDetailsForm';
import BookingConfirmation from './BookingConfirmation';

import type { Language } from '../utils/translations';

const SERVICE_LABELS: Record<string, string> = {
  'phlebotomist': 'Sample Collection',
  'physiotherapist': 'Physiotherapy',
  'nurse': 'Nursing Care',
  'wound-dresser': 'Wound Dressing',
  'aaya': 'Patient Care',
  'home-assistant': 'Home Care Visit',
};

type Step =
  | 'language'
  | 'select-date'
  | 'select-chamber'
  | 'patient-details'
  | 'confirmation';

interface ParamedicalBookingFlowProps {
  onBack: () => void;
}

// Helper: get day list from a schedule (supports both new days[] and legacy day)
const getScheduleDays = (s: any): string[] =>
  s.days && Array.isArray(s.days) && s.days.length ? s.days : (s.day ? [s.day] : []);

export default function ParamedicalBookingFlow({ onBack }: ParamedicalBookingFlowProps) {
  const paraId = sessionStorage.getItem('booking_paramedical_id') || '';

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<Step>('language');
  const [language, setLanguage] = useState<Language>('english');

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedChamber, setSelectedChamber] = useState<string>('');
  const [selectedChamberId, setSelectedChamberId] = useState<number | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [consultationType, setConsultationType] = useState<'chamber' | 'video'>('chamber');

  const [patientFormData, setPatientFormData] = useState<PatientFormData | null>(null);

  // Load paramedical profile
  useEffect(() => {
    const load = async () => {
      if (!paraId || !db) { setLoading(false); return; }
      try {
        let snap = await getDoc(doc(db, 'paramedicals', paraId));
        if (!snap.exists()) {
          // Legacy fallback
          snap = await getDoc(doc(db, 'phlebotomists', paraId));
        }
        if (snap.exists()) {
          setProfile({ uid: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error('Failed to load paramedical profile:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [paraId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-300 mb-4">Healthcare professional not found.</p>
          <button onClick={onBack} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg">Go Back</button>
        </div>
      </div>
    );
  }

  // Common provider props for shared components
  const providerName: string = profile?.name || profile?.fullName || 'Healthcare Professional';
  const providerSpecialty: string = SERVICE_LABELS[profile?.role] || profile?.role || 'Healthcare Service';
  const providerPhoto: string = profile?.profileImage || profile?.photoUrl || '';
  const providerDegrees: string[] = profile?.degrees || [];
  // Paramedicals do not use the "Dr." prefix
  const useDrPrefix = false;

  // Active schedules act as the "chambers" array for SelectChamber / SelectDate
  const allSchedules: any[] = (profile?.schedules || []).filter((s: any) => s.isActive !== false);

  // Active dates pool feeds SelectDate
  const schedulesForDates = allSchedules.map((s: any) => ({
    days: getScheduleDays(s),
    frequency: s.frequency || 'Daily',
  }));

  const handleLanguageContinue = (lang: Language) => {
    setLanguage(lang);
    setStep('select-date');
  };

  const handleDateContinue = (date: Date) => {
    setSelectedDate(date);
    setStep('select-chamber');
  };

  // Filter chambers by selected date (day name) so SelectChamber only shows
  // schedules that run on that day, just like the doctor flow.
  const filteredChambersForDate = (() => {
    if (!selectedDate) return allSchedules;
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = selectedDate.toISOString().split('T')[0];
    return allSchedules.filter((s: any) => {
      if (s.frequency === 'Daily') return true;
      if (s.frequency === 'Custom') return s.customDate === dateStr;
      const days = getScheduleDays(s);
      return days.includes(dayName);
    });
  })();

  const handleChamberContinue = (
    chamberName: string,
    type: 'chamber' | 'video',
    chamberId?: number,
  ) => {
    setSelectedChamber(chamberName);
    setSelectedChamberId(chamberId);
    setConsultationType(type);

    // Build a friendly time-range label for the picked schedule (if any)
    if (chamberId !== undefined) {
      const s = allSchedules.find((x: any) => x.id === chamberId);
      if (s?.startTime && s?.endTime) {
        setSelectedTime(`${s.startTime} - ${s.endTime}`);
      }
    }
    setStep('patient-details');
  };

  const handlePatientSubmit = (data: PatientFormData) => {
    setPatientFormData(data);
    setStep('confirmation');
  };

  // ===== RENDER STATE MACHINE =====

  if (step === 'language') {
    return (
      <LanguageSelection
        onBack={onBack}
        onContinue={handleLanguageContinue}
        doctorName={providerName}
        doctorSpecialty={providerSpecialty}
        doctorPhoto={providerPhoto}
        doctorDegrees={providerDegrees}
        useDrPrefix={useDrPrefix}
      />
    );
  }

  if (step === 'select-date') {
    return (
      <SelectDate
        language={language}
        onBack={() => setStep('language')}
        onContinue={handleDateContinue}
        maxAdvanceDays={Number(profile?.maxAdvanceBookingDays) || 15}
        plannedOffPeriods={profile?.plannedOffPeriods || []}
        chambers={allSchedules as any}
        schedules={schedulesForDates}
        globalBookingEnabled={profile?.globalBookingEnabled !== false}
        doctorName={providerName}
        doctorSpecialty={providerSpecialty}
        doctorPhoto={providerPhoto}
        useDrPrefix={useDrPrefix}
        doctorId={paraId}
      />
    );
  }

  if (step === 'select-chamber' && selectedDate) {
    return (
      <SelectChamber
        language={language}
        selectedDate={selectedDate}
        onBack={() => setStep('select-date')}
        onContinue={handleChamberContinue}
        hasVideoConsultation={false /* paramedicals: chamber visits only for now */}
        chambers={filteredChambersForDate as any}
        doctorName={providerName}
        doctorSpecialty={providerSpecialty}
        doctorPhoto={providerPhoto}
        doctorDegrees={providerDegrees}
        useDrPrefix={useDrPrefix}
        doctorId={paraId}
        // Multi-provider props ➜ paramedical mode
        providerCollection="paramedicals"
        bookingsCollection="paramedicalBookings"
        providerIdField="paramedicalId"
        schedulesField="schedules"
      />
    );
  }

  if (step === 'patient-details' && selectedDate) {
    return (
      <PatientDetailsForm
        language={language}
        onBack={() => setStep('select-chamber')}
        onSubmit={handlePatientSubmit}
        consultationType={consultationType}
        doctorId={paraId}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        selectedChamber={selectedChamber}
        selectedChamberId={selectedChamberId}
        bookingType="qr_booking"
        doctorName={providerName}
        doctorSpecialty={providerSpecialty}
        doctorPhoto={providerPhoto}
        doctorDegrees={providerDegrees}
        useDrPrefix={useDrPrefix}
        // Multi-provider props ➜ paramedical mode
        providerCollection="paramedicals"
        bookingsCollection="paramedicalBookings"
        providerIdField="paramedicalId"
        schedulesField="schedules"
      />
    );
  }

  if (step === 'confirmation' && patientFormData && selectedDate) {
    return (
      <BookingConfirmation
        language={language}
        patientData={{
          patientName: patientFormData.patientName,
          whatsappNumber: patientFormData.whatsappNumber,
          age: patientFormData.age,
          gender: patientFormData.gender,
          purposeOfVisit: patientFormData.purposeOfVisit,
        }}
        appointmentData={{
          serialNo: patientFormData.serialNo?.toString() || '999',
          bookingId: patientFormData.bookingId || 'HQR-PARA',
          doctorName: providerName,
          date: selectedDate,
          time: selectedTime || 'TBD',
          location: selectedChamber || 'Visit Location',
          consultationType: consultationType === 'video' ? 'video' : 'chamber',
        }}
        doctorName={providerName}
        doctorSpecialty={providerSpecialty}
        doctorPhoto={providerPhoto}
        doctorDegrees={providerDegrees}
        useDrPrefix={useDrPrefix}
        onBackToHome={() => {
          setStep('language');
          setSelectedDate(null);
          setSelectedChamber('');
          setSelectedChamberId(undefined);
          setSelectedTime('');
          setPatientFormData(null);
          onBack();
        }}
      />
    );
  }

  return null;
}
