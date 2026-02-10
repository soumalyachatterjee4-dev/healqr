import { useState, useEffect, useMemo } from 'react';
import LanguageSelection from './LanguageSelection';
import ClinicBookingMiniWebsite from './ClinicBookingMiniWebsite';
import ClinicDoctorSearch from './ClinicDoctorSearch';
import SelectDate from './SelectDate';
import SelectChamber from './SelectChamber';
import PatientDetailsForm from './PatientDetailsForm';
import BookingConfirmation from './BookingConfirmation';
import { type Language } from '../utils/translations';

type BookingStep = 
  | 'language' 
  | 'clinic-website' 
  | 'doctor-search' 
  | 'select-date' 
  | 'select-chamber' 
  | 'patient-form' 
  | 'confirmation';

interface SelectedDoctor {
  uid: string;
  name: string;
  email: string;
  specialties: string[];
  degrees?: string[];
  experience?: string;
  profilePhoto?: string;
  doctorCode?: string;
  qrNumber?: string;
  chambers?: any[]; // Doctor's chambers
}

interface ClinicData {
  id: string;
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  linkedDoctorsDetails?: any[];
}

export default function ClinicBookingFlow() {
  const [currentStep, setCurrentStep] = useState<BookingStep>('language');
  const [language, setLanguage] = useState<Language>('english');
  const [selectedDoctor, setSelectedDoctor] = useState<SelectedDoctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedChamberId, setSelectedChamberId] = useState<number | null>(null);
  const [selectedChamberName, setSelectedChamberName] = useState<string>('');
  const [bookingId, setBookingId] = useState<string>('');
  const [confirmationData, setConfirmationData] = useState<any>(null); // Store full booking data for confirmation
  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const [loadingClinic, setLoadingClinic] = useState(true);
  const [clinicSchedule, setClinicSchedule] = useState<any>(null);
  const [doctorSchedule, setDoctorSchedule] = useState<any>(null);

  // Load clinic data from URL parameter
  useEffect(() => {
    const loadClinicData = async () => {
      try {
        // Get clinic ID from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const clinicId = urlParams.get('clinicId');
        
        if (!clinicId) {
          console.error('No clinic ID found in URL');
          setLoadingClinic(false);
          return;
        }

        // Store in session storage
        sessionStorage.setItem('booking_clinic_id', clinicId);
        sessionStorage.setItem('booking_source', 'clinic_qr'); // Mark as clinic QR booking

        // Track QR scan immediately (separate from booking)
        const scanSessionId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('scan_session_id', scanSessionId);
        
        // Load clinic data from Firestore
        const { db } = await import('../lib/firebase/config');
        if (!db) return;

        const { collection, addDoc, serverTimestamp, doc, getDoc } = await import('firebase/firestore');
        
        // Track scan
        try {
          await addDoc(collection(db, 'qrScans'), {
            scannedBy: 'clinic',
            clinicId: clinicId,
            timestamp: serverTimestamp(),
            scanSessionId: scanSessionId,
            completed: false // Will be updated when booking is confirmed
          });
          console.log('📊 Clinic QR scan tracked');
        } catch (error) {
          console.error('Error tracking scan:', error);
        }

        const clinicRef = doc(db, 'clinics', clinicId);
        const clinicSnap = await getDoc(clinicRef);

        if (clinicSnap.exists()) {
          const clinicData = { id: clinicSnap.id, ...clinicSnap.data() } as ClinicData;
          setClinic(clinicData);

          const clinicPlannedOffPeriods = (clinicData as any).plannedOffPeriods || [];
          const plannedOffPeriodsWithMetadata = clinicPlannedOffPeriods.map((p: any) => ({
            ...p,
            clinicId: clinicId,
            clinicName: clinicData.name,
            clinicAddress: clinicData.address
          }));
          
          // Load clinic schedule settings
          const clinicScheduleRef = doc(db, 'clinicSchedules', clinicId);
          const clinicScheduleSnap = await getDoc(clinicScheduleRef);
          if (clinicScheduleSnap.exists()) {
            const scheduleData = clinicScheduleSnap.data();

            setClinicSchedule({
              maxAdvanceDays: scheduleData.maxAdvanceDays || 30,
              plannedOffPeriods: plannedOffPeriodsWithMetadata,
              globalBookingEnabled: scheduleData.globalBookingEnabled ?? true
            });
            console.log('📅 Clinic Schedule Settings:', {
              ...scheduleData,
              plannedOffPeriods: plannedOffPeriodsWithMetadata
            });
          } else {
            // Default clinic schedule if not found
            setClinicSchedule({
              maxAdvanceDays: 30,
              plannedOffPeriods: plannedOffPeriodsWithMetadata,
              globalBookingEnabled: true
            });
          }
        } else {
          console.error('Clinic not found');
        }
      } catch (error) {
        console.error('Error loading clinic:', error);
      } finally {
        setLoadingClinic(false);
      }
    };

    loadClinicData();

    // Load language from session if returning user
    const savedLanguage = sessionStorage.getItem('booking_language');
    if (savedLanguage) {
      setLanguage(savedLanguage as Language);
      setCurrentStep('clinic-website');
    }
  }, []);

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    sessionStorage.setItem('booking_language', lang);
    setCurrentStep('clinic-website');
  };

  const handleBookNow = () => {
    setCurrentStep('doctor-search');
  };

  const handleDoctorSelect = async (doctor: SelectedDoctor) => {
    console.log('🔵 handleDoctorSelect CALLED with doctor:', {
      name: doctor.name,
      uid: doctor.uid,
      doctorCode: doctor.doctorCode,
      fullDoctorObject: doctor
    });
    
    // Load doctor's schedule settings AND chambers
    console.log('🔍 Loading doctor data for UID:', doctor.uid);
    try {
      const { db } = await import('../lib/firebase/config');
      if (!db) {
        console.warn('⚠️ Firebase DB not available, using defaults');
        setSelectedDoctor(doctor);
        setDoctorSchedule({
          maxAdvanceDays: 30,
          plannedOffPeriods: [],
          globalBookingEnabled: true
        });
        setCurrentStep('select-date');
        return;
      }
      
      const { doc, getDoc } = await import('firebase/firestore');
      
      // Load doctor's profile (includes chambers)
      const doctorProfileRef = doc(db, 'doctors', doctor.uid);
      const doctorProfileSnap = await getDoc(doctorProfileRef);
      
      let doctorWithChambers = { ...doctor };
      
      if (doctorProfileSnap.exists()) {
        const profileData = doctorProfileSnap.data();
        doctorWithChambers.chambers = profileData.chambers || [];
        console.log('✅ Doctor profile LOADED:', {
          doctorUid: doctor.uid,
          chambersCount: doctorWithChambers.chambers.length,
          chambers: doctorWithChambers.chambers.map((c: any) => ({
            name: c.chamberName,
            address: c.chamberAddress
          }))
        });
      } else {
        console.warn('⚠️ Doctor profile not found for:', doctor.uid);
        doctorWithChambers.chambers = [];
      }
      
      setSelectedDoctor(doctorWithChambers);
      
      // Store doctor info in session
      sessionStorage.setItem('booking_doctor_id', doctor.uid);
      sessionStorage.setItem('booking_doctor_name', doctor.name);
      if (doctor.doctorCode) {
        sessionStorage.setItem('booking_doctor_code', doctor.doctorCode);
      }
      if (doctor.qrNumber) {
        sessionStorage.setItem('booking_doctor_qr', doctor.qrNumber);
      }
      
      // Load doctor's schedule
      const doctorScheduleRef = doc(db, 'schedules', doctor.uid);
      console.log('📄 Firestore path:', `schedules/${doctor.uid}`);
      const doctorScheduleSnap = await getDoc(doctorScheduleRef);
      console.log('📊 Schedule document exists?', doctorScheduleSnap.exists());
      
      if (doctorScheduleSnap.exists()) {
        const scheduleData = doctorScheduleSnap.data();
        const doctorPlannedOff = scheduleData.plannedOffPeriods || [];
        console.log('✅ Doctor Schedule LOADED from schedules collection:', {
          doctorUid: doctor.uid,
          maxAdvanceDays: scheduleData.maxAdvanceDays,
          totalPlannedOffPeriods: doctorPlannedOff.length,
          activePeriods: doctorPlannedOff.filter((p: any) => p.status === 'active').length,
          periods: doctorPlannedOff.map((p: any) => ({
            startDate: p.startDate,
            endDate: p.endDate,
            status: p.status
          }))
        });
        setDoctorSchedule({
          maxAdvanceDays: scheduleData.maxAdvanceDays || 30,
          plannedOffPeriods: doctorPlannedOff,
          globalBookingEnabled: scheduleData.globalBookingEnabled ?? true
        });
      } else {
        console.warn('⚠️ NO schedule document found in schedules collection for doctor:', doctor.uid);
        console.log('📋 FALLBACK: Trying to load from doctors collection (legacy location)...');
        
        // FALLBACK: Read from doctors collection if schedules doesn't exist
        if (doctorProfileSnap.exists()) {
          const profileData = doctorProfileSnap.data();
          const legacyPlannedOff = profileData.plannedOffPeriods || [];
          const legacyMaxDays = profileData.maxAdvanceBookingDays || 30;
          
          console.log('✅ Doctor Schedule LOADED from doctors collection (LEGACY):', {
            doctorUid: doctor.uid,
            maxAdvanceDays: legacyMaxDays,
            totalPlannedOffPeriods: legacyPlannedOff.length,
            activePeriods: legacyPlannedOff.filter((p: any) => p.status === 'active').length,
            periods: legacyPlannedOff.map((p: any) => ({
              startDate: p.startDate,
              endDate: p.endDate,
              status: p.status
            }))
          });
          
          setDoctorSchedule({
            maxAdvanceDays: legacyMaxDays,
            plannedOffPeriods: legacyPlannedOff,
            globalBookingEnabled: true
          });
        } else {
          console.log('🔴 No schedule data found in either collection, using defaults');
          // Default doctor schedule if not found
          setDoctorSchedule({
            maxAdvanceDays: 30,
            plannedOffPeriods: [],
            globalBookingEnabled: true
          });
        }
      }
    } catch (error) {
      console.error('❌ Error loading doctor schedule:', error);
      // Use defaults on error
      setDoctorSchedule({
        maxAdvanceDays: 30,
        plannedOffPeriods: [],
        globalBookingEnabled: true
      });
    }
    
    setCurrentStep('select-date');
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    sessionStorage.setItem('booking_date', date);
    setCurrentStep('select-chamber');
  };

  const handleChamberSelect = (chamberId: number, chamberName: string) => {
    setSelectedChamberId(chamberId);
    setSelectedChamberName(chamberName);
    sessionStorage.setItem('booking_chamber_id', chamberId.toString());
    sessionStorage.setItem('booking_chamber_name', chamberName);
    setCurrentStep('patient-form');
  };

  const handleBookingComplete = (data: any) => {
    console.log('✅ Booking completed with data:', data);
    
    // Handle both string (legacy) and object formats
    let bId = '';
    
    if (typeof data === 'string') {
      bId = data;
    } else if (data && data.bookingId) {
      bId = data.bookingId;
      setConfirmationData(data);
    }
    
    setBookingId(bId);
    setCurrentStep('confirmation');
  };

  const handleBackToHome = () => {
    // Clear session and restart
    sessionStorage.removeItem('booking_doctor_id');
    sessionStorage.removeItem('booking_doctor_name');
    sessionStorage.removeItem('booking_doctor_code');
    sessionStorage.removeItem('booking_doctor_qr');
    sessionStorage.removeItem('booking_date');
    sessionStorage.removeItem('booking_chamber_id');
    sessionStorage.removeItem('booking_chamber_name');
    setSelectedDoctor(null);
    setSelectedDate('');
    setSelectedChamberId(null);
    setSelectedChamberName('');
    setCurrentStep('clinic-website');
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'clinic-website':
        setCurrentStep('language');
        break;
      case 'doctor-search':
        setCurrentStep('clinic-website');
        break;
      case 'select-date':
        setCurrentStep('doctor-search');
        setSelectedDoctor(null);
        break;
      case 'select-chamber':
        setCurrentStep('select-date');
        setSelectedDate('');
        break;
      case 'patient-form':
        setCurrentStep('select-chamber');
        setSelectedChamberId(null);
        setSelectedChamberName('');
        break;
      default:
        break;
    }
  };

  // Loading state
  if (loadingClinic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-blue-200">Loading clinic...</p>
        </div>
      </div>
    );
  }

  // Clinic not found
  if (!clinic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 border border-blue-500/20 rounded-2xl p-8 max-w-md text-center backdrop-blur-sm">
          <div className="text-6xl mb-4">🏥</div>
          <h2 className="text-2xl font-bold text-white mb-2">Clinic Not Found</h2>
          <p className="text-blue-200">Please scan a valid clinic QR code to continue.</p>
        </div>
      </div>
    );
  }

  // Render current step
  switch (currentStep) {
    case 'language':
      return (
        <LanguageSelection 
          onContinue={handleLanguageSelect}
          doctorName={clinic.name}
          doctorPhoto={clinic.logoUrl}
          useDrPrefix={false}
          themeColor="blue"
        />
      );

    case 'clinic-website':
      return (
        <ClinicBookingMiniWebsite
          onBookNow={handleBookNow}
          onBack={() => setCurrentStep('language')}
          language={language}
        />
      );

    case 'doctor-search':
      return (
        <ClinicDoctorSearch
          onSelectDoctor={handleDoctorSelect}
          onBack={handleBack}
          language={language}
        />
      );

    case 'select-date':
      // Merge clinic and doctor schedules - use most restrictive settings
      const mergedMaxAdvanceDays = Math.min(
        clinicSchedule?.maxAdvanceDays || 30,
        doctorSchedule?.maxAdvanceDays || 30
      );
      
      // Combine planned off periods from both clinic and doctor
      const mergedPlannedOffPeriods = [
        ...(clinicSchedule?.plannedOffPeriods || []).map((p: any) => ({ ...p, source: 'clinic' })),
        ...(doctorSchedule?.plannedOffPeriods || []).map((p: any) => ({ ...p, source: 'doctor' }))
      ];

      const mergedClinicPlannedOffPeriods = [
        ...(clinicSchedule?.plannedOffPeriods || []),
        ...(doctorSchedule?.plannedOffPeriods || []).filter((p: any) => p.clinicId)
      ];
      
      console.log('📅 Merged Schedule Settings:', {
        clinicMaxDays: clinicSchedule?.maxAdvanceDays,
        doctorMaxDays: doctorSchedule?.maxAdvanceDays,
        mergedMaxAdvanceDays,
        clinicOffPeriods: clinicSchedule?.plannedOffPeriods?.length || 0,
        doctorOffPeriods: doctorSchedule?.plannedOffPeriods?.length || 0,
        totalOffPeriods: mergedPlannedOffPeriods.length
      });
      
      return (
        <SelectDate
          onContinue={handleDateSelect}
          onBack={handleBack}
          doctorName={selectedDoctor?.name || ''}
          doctorSpecialty={selectedDoctor?.specialties?.[0]}
          doctorPhoto={selectedDoctor?.profilePhoto}
          language={language}
          themeColor="blue"
          maxAdvanceDays={mergedMaxAdvanceDays}
          plannedOffPeriods={mergedPlannedOffPeriods}
          clinicPlannedOffPeriods={mergedClinicPlannedOffPeriods}
          globalBookingEnabled={(clinicSchedule?.globalBookingEnabled ?? true) && (doctorSchedule?.globalBookingEnabled ?? true)}
          clinicId={clinic?.id}
          doctorId={selectedDoctor?.uid}
          chambers={selectedDoctor?.chambers || []}
        />
      );

    case 'select-chamber':
      const mergedClinicPlannedOffForChambers = [
        ...(clinicSchedule?.plannedOffPeriods || []),
        ...(doctorSchedule?.plannedOffPeriods || []).filter((p: any) => p.clinicId)
      ];
      return (
        <SelectChamber
          onChamberSelect={handleChamberSelect}
          onBack={handleBack}
          selectedDate={selectedDate}
          chambers={selectedDoctor?.chambers || []}
          doctorName={selectedDoctor?.name || ''}
          doctorDegrees={selectedDoctor?.degrees}
          doctorSpecialty={selectedDoctor?.specialties?.[0]}
          doctorPhoto={selectedDoctor?.profilePhoto}
          doctorId={selectedDoctor?.uid}
          language={language}
          themeColor="blue"
          clinicId={clinic?.id}
          clinicAddress={clinic?.address}
          clinicPlannedOffPeriods={mergedClinicPlannedOffForChambers}
        />
      );

    case 'patient-form':
      return (
        <PatientDetailsForm
          onSubmit={handleBookingComplete}
          onBack={handleBack}
          selectedDate={selectedDate}
          // Pass required IDs
          doctorId={selectedDoctor?.uid} 
          selectedChamber={selectedChamberName}
          // Pass display data
          doctorName={selectedDoctor?.name || ''}
          doctorDegrees={selectedDoctor?.degrees}
          doctorSpecialty={selectedDoctor?.specialties?.[0]}
          doctorPhoto={selectedDoctor?.profilePhoto}
          language={language}
          themeColor="blue"
          isClinicBooking={true}
          // Pass chamberId separately if needed by form (though interface only shows selectedChamber string)
          // selectedChamberId is used internally by flow but maybe not needed by form unless extended
        />
      );

    case 'confirmation':
      return (
        <BookingConfirmation
          bookingId={bookingId}
          onBackToHome={handleBackToHome}
          doctorName={selectedDoctor?.name || ''}
          language={language}
          themeColor="blue"
          // Pass required data structure
          patientData={{
            patientName: confirmationData?.patientName || '',
            whatsappNumber: confirmationData?.whatsappNumber || '',
            age: confirmationData?.age,
            gender: confirmationData?.gender,
            purposeOfVisit: confirmationData?.purposeOfVisit
          }}
          appointmentData={{
            serialNo: confirmationData?.serialNo?.toString() || confirmationData?.tokenNumber?.toString() || '---',
            bookingId: bookingId,
            doctorName: selectedDoctor?.name || 'Doctor',
            date: selectedDate ? new Date(selectedDate) : new Date(),
            time: confirmationData?.selectedTime || '10:00 AM - 02:00 PM', // Fallback or need to capture time
            location: selectedChamberName || clinic?.address || 'Clinic',
            consultationType: 'chamber'
          }}
        />
      );

    default:
      return null;
  }
}
