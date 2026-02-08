import { useState, useEffect } from 'react';
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
  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const [loadingClinic, setLoadingClinic] = useState(true);

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

        // Load clinic data from Firestore
        const { db } = await import('../lib/firebase/config');
        if (!db) return;

        const { doc, getDoc } = await import('firebase/firestore');
        const clinicRef = doc(db, 'clinics', clinicId);
        const clinicSnap = await getDoc(clinicRef);

        if (clinicSnap.exists()) {
          const clinicData = { id: clinicSnap.id, ...clinicSnap.data() } as ClinicData;
          setClinic(clinicData);
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

  const handleDoctorSelect = (doctor: SelectedDoctor) => {
    setSelectedDoctor(doctor);
    // Store doctor info in session
    sessionStorage.setItem('booking_doctor_id', doctor.uid);
    sessionStorage.setItem('booking_doctor_name', doctor.name);
    if (doctor.doctorCode) {
      sessionStorage.setItem('booking_doctor_code', doctor.doctorCode);
    }
    if (doctor.qrNumber) {
      sessionStorage.setItem('booking_doctor_qr', doctor.qrNumber);
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

  const handleBookingComplete = (generatedBookingId: string) => {
    setBookingId(generatedBookingId);
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
      return (
        <SelectDate
          onDateSelect={handleDateSelect}
          onBack={handleBack}
          doctorName={selectedDoctor?.name || ''}
          doctorDegrees={selectedDoctor?.degrees}
          doctorSpecialty={selectedDoctor?.specialties?.[0]}
          doctorPhoto={selectedDoctor?.profilePhoto}
          language={language}
          themeColor="blue"
        />
      );

    case 'select-chamber':
      return (
        <SelectChamber
          onChamberSelect={handleChamberSelect}
          onBack={handleBack}
          selectedDate={selectedDate}
          doctorName={selectedDoctor?.name || ''}
          doctorDegrees={selectedDoctor?.degrees}
          doctorSpecialty={selectedDoctor?.specialties?.[0]}
          doctorPhoto={selectedDoctor?.profilePhoto}
          language={language}
          themeColor="blue"
        />
      );

    case 'patient-form':
      return (
        <PatientDetailsForm
          onSubmit={handleBookingComplete}
          onBack={handleBack}
          selectedDate={selectedDate}
          selectedChamberId={selectedChamberId!}
          selectedChamberName={selectedChamberName}
          doctorName={selectedDoctor?.name || ''}
          doctorDegrees={selectedDoctor?.degrees}
          doctorSpecialty={selectedDoctor?.specialties?.[0]}
          doctorPhoto={selectedDoctor?.profilePhoto}
          language={language}
          themeColor="blue"
          isClinicBooking={true}
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
        />
      );

    default:
      return null;
  }
}
