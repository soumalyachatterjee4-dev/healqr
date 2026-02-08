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

export default function ClinicBookingFlow() {
  const [currentStep, setCurrentStep] = useState<BookingStep>('language');
  const [language, setLanguage] = useState<Language>('english');
  const [selectedDoctor, setSelectedDoctor] = useState<SelectedDoctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedChamberId, setSelectedChamberId] = useState<number | null>(null);
  const [selectedChamberName, setSelectedChamberName] = useState<string>('');
  const [bookingId, setBookingId] = useState<string>('');

  // Load language from session if returning user
  useEffect(() => {
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

  // Render current step
  switch (currentStep) {
    case 'language':
      return (
        <LanguageSelection 
          onLanguageSelect={handleLanguageSelect}
          selectedLanguage={language}
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
