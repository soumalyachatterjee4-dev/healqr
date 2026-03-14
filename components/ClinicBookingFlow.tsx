import { useState, useEffect, useMemo } from 'react';
import LanguageSelection from './LanguageSelection';
import ClinicBookingMiniWebsite from './ClinicBookingMiniWebsite';
import ClinicDoctorSearch from './ClinicDoctorSearch';
import SelectDate from './SelectDate';
import SelectChamber from './SelectChamber';
import PatientDetailsForm from './PatientDetailsForm';
import BookingConfirmation from './BookingConfirmation';
import BookingFlowLayout from './BookingFlowLayout';
import TemplateDisplay from './TemplateDisplay';
import type { Language } from '../utils/translations';



type BookingStep =
  | 'language'
  | 'clinic-website'
  | 'location'
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

interface ClinicLocation {
  id: string;
  name: string;
  address?: string;
  landmark?: string;
}

interface ClinicData {
  id: string;
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  linkedDoctorsDetails?: any[];
  locations?: ClinicLocation[];
}

export default function ClinicBookingFlow() {
  const [currentStep, setCurrentStep] = useState<BookingStep>('language');
  const [language, setLanguage] = useState<Language>('english');

  const [selectedDoctor, setSelectedDoctor] = useState<SelectedDoctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedChamberId, setSelectedChamberId] = useState<number | null>(null);
  const [selectedChamberName, setSelectedChamberName] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
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

          // Determine available locations for this clinic
          const clinicLocations = clinicData.locations && clinicData.locations.length > 0
            ? clinicData.locations
            : [{ id: '1', name: clinicData.name || 'Clinic', address: clinicData.address || '' }];

          // If only one location, auto-select it; else user must choose
          if (clinicLocations.length === 1) {
            setSelectedLocationId(clinicLocations[0].id);
            setSelectedLocationName(clinicLocations[0].name);
            sessionStorage.setItem('booking_location_id', clinicLocations[0].id);
            sessionStorage.setItem('booking_location_name', clinicLocations[0].name);
          }

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
    const clinicLocations = clinic?.locations || [];

    // If clinic has multiple locations, always show location selection
    if (clinicLocations.length > 1) {
      setCurrentStep('location');
      return;
    }

    // One location or none - proceed directly
    setCurrentStep('doctor-search');
  };

  const handleLocationSelect = (location: { id: string; name: string }) => {
    setSelectedLocationId(location.id);
    setSelectedLocationName(location.name);
    sessionStorage.setItem('booking_location_id', location.id);
    sessionStorage.setItem('booking_location_name', location.name);
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
          chambersCount: doctorWithChambers.chambers?.length || 0,
          chambers: doctorWithChambers.chambers?.map((c: any) => ({
            name: c.chamberName,
            address: c.chamberAddress
          })) || []
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

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    sessionStorage.setItem('booking_date', date.toISOString());
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
    sessionStorage.removeItem('booking_location_id');
    sessionStorage.removeItem('booking_location_name');
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSelectedChamberId(null);
    setSelectedChamberName('');
    setSelectedLocationId('');
    setSelectedLocationName('');
    setCurrentStep('clinic-website');
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'clinic-website':
        setCurrentStep('language');
        break;
      case 'location':
        setCurrentStep('clinic-website');
        break;
      case 'doctor-search': {
        const clinicLocations = clinic?.locations || [];
        // Clear saved location so user can re-select
        sessionStorage.removeItem('booking_location_id');
        sessionStorage.removeItem('booking_location_name');
        setSelectedLocationId('');
        setSelectedLocationName('');
        if (clinicLocations.length > 1) {
          setCurrentStep('location');
        } else {
          setCurrentStep('clinic-website');
        }
        break;
      }
      case 'select-date':
        setCurrentStep('doctor-search');
        setSelectedDoctor(null);
        break;
      case 'select-chamber':
        setCurrentStep('select-date');
        setSelectedDate(null);
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

    case 'location': {
      const locations = clinic?.locations && clinic.locations.length > 0
        ? clinic.locations
        : [{ id: '1', name: clinic.name || 'Clinic', address: clinic.address || '' }];

      // Count doctors per branch
      const allDoctors = clinic?.linkedDoctorsDetails || [];
      const getDoctorCountForBranch = (branchId: string) => {
        return allDoctors.filter((doc: any) => {
          if (doc.locationId) return doc.locationId === branchId;
          const chambers = doc.chambers || [];
          if (Array.isArray(chambers) && chambers.length > 0) {
            return chambers.some((ch: any) => ch.locationId === branchId);
          }
          return false;
        }).length;
      };

      // Collect unique specialties per branch
      const getSpecialtiesForBranch = (branchId: string) => {
        const specs = new Set<string>();
        allDoctors.forEach((doc: any) => {
          let belongs = false;
          if (doc.locationId) belongs = doc.locationId === branchId;
          else {
            const chambers = doc.chambers || [];
            if (Array.isArray(chambers) && chambers.length > 0) {
              belongs = chambers.some((ch: any) => ch.locationId === branchId);
            }
          }
          if (belongs && doc.specialties) {
            doc.specialties.forEach((s: string) => specs.add(s));
          }
        });
        return specs.size;
      };

      return (
        <BookingFlowLayout
          onBack={() => setCurrentStep('clinic-website')}
          doctorName={clinic.name}
          doctorPhoto={clinic.logoUrl}
          useDrPrefix={false}
          themeColor="blue"
        >
          <div className="bg-[#1a1f2e] rounded-2xl shadow-xl overflow-hidden max-w-full">
            <div className="px-4 sm:px-6 py-4 sm:py-6">
              <h1 className="text-2xl font-bold text-white mb-2">Choose Your Branch</h1>
              <p className="text-blue-200 mb-4 text-sm">Select the branch you want to visit</p>

              <div className="grid grid-cols-1 gap-3">
                {locations.map((loc) => {
                  const docCount = getDoctorCountForBranch(loc.id);
                  const specCount = getSpecialtiesForBranch(loc.id);
                  const displayAddress = (loc as any).landmark || loc.address || '';

                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleLocationSelect(loc)}
                      className="group text-left bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-blue-500/20 rounded-2xl p-5 hover:border-blue-400/50 hover:bg-gray-800/90 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-white truncate">{loc.name}</h2>
                            {loc.id === '001' && (
                              <span className="flex-shrink-0 text-[10px] font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">MAIN</span>
                            )}
                          </div>
                          {displayAddress && (
                            <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              <span className="truncate">{displayAddress}</span>
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            {docCount > 0 && (
                              <span className="text-xs text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                {docCount} Doctor{docCount !== 1 ? 's' : ''}
                              </span>
                            )}
                            {specCount > 0 && (
                              <span className="text-xs text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full">
                                {specCount} Specialt{specCount !== 1 ? 'ies' : 'y'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 group-hover:bg-blue-500/30 transition">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Health Tip / Ad Card */}
              <div className="mt-5">
                <TemplateDisplay placement="booking-location" className="rounded-xl" />
              </div>
            </div>
          </div>
        </BookingFlowLayout>
      );
    }

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

      const filteredChambers = (selectedDoctor?.chambers || []).filter((chamber: any) => {
        if (!selectedLocationId) return true;
        return (chamber as any).locationId === selectedLocationId;
      });

      return (
        <SelectChamber
          onChamberSelect={handleChamberSelect}
          onBack={handleBack}
          selectedDate={selectedDate || new Date()}
          chambers={filteredChambers}
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
          selectedDate={selectedDate || new Date()}
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
            date: selectedDate || new Date(),
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

