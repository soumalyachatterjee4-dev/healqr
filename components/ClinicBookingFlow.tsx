import { useState, useEffect } from 'react';
import { Search, Stethoscope, User, ArrowRight, Building2, MapPin, Phone, Star, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import BookingFlowLayout from './BookingFlowLayout';
import LanguageSelection from './LanguageSelection';
import BookingMiniWebsite from './BookingMiniWebsite';
import SelectDate from './SelectDate';
import SelectChamber from './SelectChamber';
import PatientDetailsForm from './PatientDetailsForm';
import BookingConfirmation from './BookingConfirmation';
import TemplateDisplay from './TemplateDisplay';
import { t, type Language } from '../utils/translations';

type FlowStep = 
  | 'language' 
  | 'clinic-home' 
  | 'search-specialty' 
  | 'search-name' 
  | 'doctor-profile' 
  | 'select-date' 
  | 'select-chamber' 
  | 'patient-details' 
  | 'confirmation';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  specialties?: string[];
  degrees?: string[];
  profileImage?: string;
  linkedToClinic?: boolean;
  clinicId?: string;
  // For linked doctors - full profile data
  bio?: string;
  experience?: string;
  phone?: string;
  email?: string;
  chambers?: any[];
  // For display
  miniWebsiteReviews?: any[];
}

interface Clinic {
  id: string;
  name: string;
  address: string;
  phone?: string;
  logoUrl?: string;
  linkedDoctorsDetails?: Doctor[];
}

interface ClinicBookingFlowProps {
  clinicQRCode?: string; // The QR code that was scanned (optional)
  clinicId?: string; // Or the clinic ID directly from URL
}

export default function ClinicBookingFlow({ clinicQRCode, clinicId }: ClinicBookingFlowProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>('language');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('english');
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedChamber, setSelectedChamber] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [healthTips, setHealthTips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load clinic data on mount
  useEffect(() => {
    loadClinicData();
  }, [clinicQRCode, clinicId]);

  const loadClinicData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Loading clinic data...');
      console.log('Clinic ID:', clinicId);
      console.log('QR Code:', clinicQRCode);
      
      const { db } = await import('../lib/firebase/config');
      if (!db) {
        console.error('❌ Firebase DB not initialized');
        setError('Database not initialized');
        return;
      }

      const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');

      let clinicIdToLoad = clinicId;

      // If we have a QR code, find the clinic by QR code
      if (clinicQRCode && !clinicId) {
        const qrCodesRef = collection(db, 'qrCodes');
        const qrQuery = query(qrCodesRef, where('qrNumber', '==', clinicQRCode));
        const qrSnapshot = await getDocs(qrQuery);

        if (qrSnapshot.empty) {
          console.error('Clinic not found with QR code:', clinicQRCode);
          setLoading(false);
          return;
        }

        const qrData = qrSnapshot.docs[0].data();
        clinicIdToLoad = qrData.linkedEmail || qrData.email;
      }

      if (!clinicIdToLoad) {
        console.error('No clinic ID provided');
        setLoading(false);
        return;
      }

      // Load clinic details
      console.log('📍 Loading clinic document:', clinicIdToLoad);
      const clinicRef = doc(db, 'clinics', clinicIdToLoad);
      const clinicSnap = await getDoc(clinicRef);

      if (!clinicSnap.exists()) {
        console.error('❌ Clinic not found:', clinicIdToLoad);
        setError('Clinic not found');
        setLoading(false);
        return;
      }

      if (clinicSnap.exists()) {
        const clinicData = { id: clinicSnap.id, ...clinicSnap.data() } as Clinic;
        setClinic(clinicData);

        // Extract doctors and specialties
        if (clinicData.linkedDoctorsDetails && clinicData.linkedDoctorsDetails.length > 0) {
          const doctorsList: Doctor[] = [];
          const specialtiesSet = new Set<string>();

          // Load full doctor data for each linked doctor
          for (const linkedDoc of clinicData.linkedDoctorsDetails) {
            // Use uid field which is the actual doctor ID
            const doctorIdFromLinked = linkedDoc.uid || linkedDoc.doctorId;
            if (!doctorIdFromLinked) continue;
            
            const doctorRef = doc(db, 'doctors', doctorIdFromLinked);
            const doctorSnap = await getDoc(doctorRef);

            if (doctorSnap.exists()) {
              const fullDoctorData = doctorSnap.data();
              const doctor: Doctor = {
                id: doctorIdFromLinked,
                name: linkedDoc.name || fullDoctorData.name,
                specialty: linkedDoc.specialties?.[0] || fullDoctorData.specialties?.[0] || 'General Physician',
                specialties: linkedDoc.specialties || fullDoctorData.specialties || [],
                degrees: fullDoctorData.degrees || linkedDoc.degrees || [],
                profileImage: fullDoctorData.profileImage || linkedDoc.profileImage,
                linkedToClinic: true,
                clinicId: clinicData.id,
                // Full profile data
                bio: fullDoctorData.bio,
                experience: fullDoctorData.experience,
                phone: fullDoctorData.phone,
                email: fullDoctorData.email,
                chambers: fullDoctorData.chambers,
                miniWebsiteReviews: fullDoctorData.miniWebsiteReviews,
              };

              doctorsList.push(doctor);

              // Add specialties
              (linkedDoc.specialties || []).forEach((spec: string) => specialtiesSet.add(spec));
            }
          }

          setDoctors(doctorsList);
          setSpecialties(Array.from(specialtiesSet).sort());
          console.log('✅ Loaded doctors:', doctorsList.length);
          console.log('✅ Loaded specialties:', Array.from(specialtiesSet));
        } else {
          console.log('⚠️ No linkedDoctorsDetails found in clinic data');
        }

        // Load health tips from admin panel
        loadHealthTips();
      }
    } catch (error) {
      console.error('❌ Error loading clinic data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load clinic data');
    } finally {
      setLoading(false);
    }
  };

  const loadHealthTips = async () => {
    try {
      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { collection, query, where, getDocs } = await import('firebase/firestore');
      
      const templatesRef = collection(db, 'templates');
      const healthTipQuery = query(
        templatesRef,
        where('category', '==', 'health-tip'),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(healthTipQuery);
      const tips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHealthTips(tips);
    } catch (error) {
      console.error('Error loading health tips:', error);
    }
  };

  const handleLanguageSelect = (language: Language) => {
    setSelectedLanguage(language);
    setCurrentStep('clinic-home');
  };

  const handleSpecialtySelect = (specialty: string) => {
    setSelectedSpecialty(specialty);
    setCurrentStep('search-specialty');
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    
    // Store doctor ID and clinic context in session for booking flow
    sessionStorage.setItem('booking_doctor_id', doctor.id);
    sessionStorage.setItem('booking_clinic_id', clinic?.id || '');
    sessionStorage.setItem('booking_clinic_name', clinic?.name || '');
    sessionStorage.setItem('booking_clinic_qr', clinic?.qrNumber || clinicQRCode || '');
    
    console.log('✅ ClinicBookingFlow: Doctor selected:', doctor.name, '| ID:', doctor.id, '| Chambers:', doctor.chambers?.length);
    console.log('📦 SessionStorage set: booking_doctor_id =', doctor.id, '| clinic_id =', clinic?.id, '| clinic_name =', clinic?.name);
    
    if (doctor.linkedToClinic) {
      setCurrentStep('doctor-profile');
    } else {
      // For non-linked doctors, go directly to chamber selection
      setCurrentStep('select-chamber');
    }
  };

  const handleBookNow = () => {
    setCurrentStep('select-date');
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setCurrentStep('select-chamber');
  };

  const handleChamberSelect = (chamberName: string, consultationType: 'chamber' | 'video') => {
    console.log('🎯 handleChamberSelect received:', { chamberName, consultationType });
    console.log('🔍 Available doctor chambers:', selectedDoctor?.chambers?.map(c => ({ name: c.chamberName, address: c.chamberAddress })));
    
    // Find the full chamber object from the doctor's chambers (with trim to handle spaces)
    const chamber = selectedDoctor?.chambers?.find(c => 
      c.chamberName?.trim() === chamberName?.trim()
    );
    
    console.log('✅ Found chamber:', chamber);
    
    // Store the chamber with consultation type
    const selectedChamberObj = { 
      chamberName: chamberName?.trim() || chamberName, 
      consultationType,
      chamberAddress: chamber?.chamberAddress,
      id: chamber?.id
    };
    
    console.log('📦 Setting selectedChamber:', selectedChamberObj);
    setSelectedChamber(selectedChamberObj);
    setCurrentStep('patient-details');
  };

  const handlePatientDetailsSubmit = () => {
    setCurrentStep('confirmation');
  };

  const handleBack = () => {
    const stepFlow: FlowStep[] = [
      'language',
      'clinic-home',
      'search-specialty',
      'doctor-profile',
      'select-date',
      'select-chamber',
      'patient-details',
      'confirmation'
    ];
    const currentIndex = stepFlow.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepFlow[currentIndex - 1]);
    }
  };

  const filteredDoctorsBySpecialty = doctors.filter(doc =>
    selectedSpecialty ? doc.specialties?.includes(selectedSpecialty) : true
  );

  const filteredDoctorsByName = doctors.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render different steps
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-white text-lg">Loading clinic...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-xl font-bold mb-2">Error Loading Clinic</div>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              loadClinicData();
            }}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">Clinic not found</div>
          <p className="text-gray-400">Please scan a valid clinic QR code</p>
        </div>
      </div>
    );
  }

  // Step 1: Language Selection
  if (currentStep === 'language') {
    return (
      <LanguageSelection
        onContinue={handleLanguageSelect}
        doctorName={clinic.name}
        doctorPhoto={clinic.logoUrl}
        useDrPrefix={false}
      />
    );
  }

  // Step 2: Clinic Home - Search Options
  if (currentStep === 'clinic-home') {
    return (
      <BookingFlowLayout
        showHeader={false}
        onBack={handleBack}
      >
        <div className="bg-[#1a1f2e] rounded-3xl shadow-2xl p-6 sm:p-8">
          {/* Clinic Header */}
          <div className="text-center mb-8">
            {clinic.logoUrl ? (
              <img
                src={clinic.logoUrl}
                alt={clinic.name}
                className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-blue-500/30"
              />
            ) : (
              <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Building2 className="w-12 h-12 text-white" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-white mb-2">{clinic.name}</h1>
            {clinic.address && (
              <p className="text-gray-400 flex items-center justify-center gap-2">
                <MapPin className="w-4 h-4" />
                {clinic.address}
              </p>
            )}
            {clinic.phone && (
              <p className="text-gray-400 flex items-center justify-center gap-2 mt-1">
                <Phone className="w-4 h-4" />
                {clinic.phone}
              </p>
            )}
          </div>

          {/* Health Tip */}
          {healthTips.length > 0 && (
            <div className="mb-6">
              <TemplateDisplay templates={healthTips} />
            </div>
          )}

          {/* Search Options */}
          <div className="space-y-4 mb-6">
            <h2 className="text-white text-lg font-semibold text-center mb-4">
              {t('findDoctor', selectedLanguage)}
            </h2>

            {/* Search by Specialty */}
            <button
              onClick={() => setCurrentStep('search-specialty')}
              className="w-full p-4 rounded-2xl border-2 border-gray-700 bg-[#0f1419] hover:border-blue-500 hover:bg-blue-500/10 transition-all flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-white font-semibold">Search by Specialty</div>
                <div className="text-sm text-gray-400">{specialties.length} specialties available</div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
            </button>

            {/* Search by Name */}
            <button
              onClick={() => setCurrentStep('search-name')}
              className="w-full p-4 rounded-2xl border-2 border-gray-700 bg-[#0f1419] hover:border-blue-500 hover:bg-blue-500/10 transition-all flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-white font-semibold">Search by Name</div>
                <div className="text-sm text-gray-400">{doctors.length} doctors available</div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{doctors.length}</div>
              <div className="text-sm text-gray-400">Doctors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{specialties.length}</div>
              <div className="text-sm text-gray-400">Specialties</div>
            </div>
          </div>
        </div>
      </BookingFlowLayout>
    );
  }

  // Step 3: Search by Specialty
  if (currentStep === 'search-specialty') {
    return (
      <BookingFlowLayout
        showHeader={false}
        onBack={handleBack}
      >
        <div className="bg-[#1a1f2e] rounded-3xl shadow-2xl p-6 sm:p-8">
          <h1 className="text-white text-2xl font-bold mb-6 text-center">Select Specialty</h1>

          {/* Health Tip */}
          {healthTips.length > 0 && (
            <div className="mb-6">
              <TemplateDisplay templates={healthTips} />
            </div>
          )}

          {/* Specialty List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
            {specialties.map((specialty) => {
              const doctorCount = doctors.filter(d => d.specialties?.includes(specialty)).length;
              return (
                <button
                  key={specialty}
                  onClick={() => handleSpecialtySelect(specialty)}
                  className="w-full p-4 rounded-2xl border-2 border-gray-700 bg-[#0f1419] hover:border-blue-500 hover:bg-blue-500/10 transition-all flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-white font-semibold">{specialty}</div>
                    <div className="text-sm text-gray-400">{doctorCount} doctor{doctorCount !== 1 ? 's' : ''}</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                </button>
              );
            })}
          </div>

          {/* Show doctors if specialty selected */}
          {selectedSpecialty && filteredDoctorsBySpecialty.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h2 className="text-white font-semibold mb-4">Available Doctors</h2>
              <div className="space-y-3">
                {filteredDoctorsBySpecialty.map((doctor) => (
                  <DoctorCard
                    key={doctor.id}
                    doctor={doctor}
                    onClick={() => handleDoctorSelect(doctor)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </BookingFlowLayout>
    );
  }

  // Step 4: Search by Name
  if (currentStep === 'search-name') {
    return (
      <BookingFlowLayout
        showHeader={false}
        onBack={handleBack}
      >
        <div className="bg-[#1a1f2e] rounded-3xl shadow-2xl p-6 sm:p-8">
          <h1 className="text-white text-2xl font-bold mb-6 text-center">Search Doctor</h1>

          {/* Health Tip */}
          {healthTips.length > 0 && (
            <div className="mb-6">
              <TemplateDisplay templates={healthTips} />
            </div>
          )}

          {/* Search Input */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by doctor name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 bg-[#0f1419] border-gray-700 text-white rounded-xl"
              />
            </div>
          </div>

          {/* Doctor List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
            {searchQuery.length > 0 ? (
              filteredDoctorsByName.length > 0 ? (
                filteredDoctorsByName.map((doctor) => (
                  <DoctorCard
                    key={doctor.id}
                    doctor={doctor}
                    onClick={() => handleDoctorSelect(doctor)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No doctors found matching "{searchQuery}"
                </div>
              )
            ) : (
              doctors.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  onClick={() => handleDoctorSelect(doctor)}
                />
              ))
            )}
          </div>
        </div>
      </BookingFlowLayout>
    );
  }

  // Step 5: Doctor Profile (for linked doctors)
  if (currentStep === 'doctor-profile' && selectedDoctor) {
    return (
      <BookingMiniWebsite
        onBookNow={handleBookNow}
        onBack={handleBack}
        language={selectedLanguage}
      />
    );
  }

  // Step 6: Select Date
  if (currentStep === 'select-date' && selectedDoctor) {
    return (
      <SelectDate
        onContinue={handleDateSelect}
        onBack={handleBack}
        language={selectedLanguage}
        doctorName={selectedDoctor.name}
        doctorSpecialty={selectedDoctor.specialty}
        doctorPhoto={selectedDoctor.profileImage}
        useDrPrefix={true}
      />
    );
  }

  // Step 7: Select Chamber
  if (currentStep === 'select-chamber' && selectedDoctor) {
    // Filter chambers to only show those at this clinic (if clinic exists)
    let chambersList = selectedDoctor.chambers || [];
    
    // Only filter if we have a clinic (clinic-based booking)
    if (clinic && clinic.id) {
      // 🔥 FIXED: Use clinicId for accurate filtering instead of address/name matching
      const clinicChambers = chambersList.filter(chamber => 
        chamber.clinicId === clinic.id && chamber.status !== 'inactive'
      );
      
      // Use filtered chambers if we found any
      if (clinicChambers.length > 0) {
        chambersList = clinicChambers;
      } else {
        console.warn('⚠️ No chambers found for clinic:', clinic.name, 'Doctor:', selectedDoctor.name);
        // Show message that doctor has no chambers at this clinic
        chambersList = [];
      }
    }
    // For solo doctor booking (no clinic), show all active chambers
    else {
      chambersList = chambersList.filter(chamber => chamber.status !== 'inactive');
    }

    console.log('🏥 SelectChamber: Showing', chambersList.length, 'chambers for doctor', selectedDoctor.name, 'at clinic', clinic?.name);

    return (
      <SelectChamber
        onContinue={handleChamberSelect}
        onBack={handleBack}
        language={selectedLanguage}
        selectedDate={selectedDate}
        doctorName={selectedDoctor.name}
        doctorSpecialty={selectedDoctor.specialty}
        doctorPhoto={selectedDoctor.profileImage}
        doctorDegrees={selectedDoctor.degrees}
        useDrPrefix={true}
        chambers={chambersList}
      />
    );
  }

  // Step 8: Patient Details
  if (currentStep === 'patient-details' && selectedDoctor && selectedChamber) {
    console.log('📝 Rendering PatientDetailsForm with:', {
      selectedChamber,
      chamberName: selectedChamber.chamberName,
      doctorId: selectedDoctor.id
    });
    
    return (
      <PatientDetailsForm
        onContinue={handlePatientDetailsSubmit}
        onBack={handleBack}
        language={selectedLanguage}
        selectedDate={selectedDate}
        selectedChamber={selectedChamber.chamberName}
        doctorName={selectedDoctor.name}
        doctorSpecialty={selectedDoctor.specialty}
        doctorPhoto={selectedDoctor.profileImage}
        doctorDegrees={selectedDoctor.degrees}
        useDrPrefix={true}
        doctorId={selectedDoctor.id}
        consultationType={selectedChamber.consultationType || 'chamber'}
      />
    );
  }

  // Step 9: Confirmation
  if (currentStep === 'confirmation') {
    return (
      <BookingConfirmation
        language={selectedLanguage}
      />
    );
  }

  return null;
}

// Doctor Card Component
function DoctorCard({ doctor, onClick }: { doctor: Doctor; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-2xl border-2 border-gray-700 bg-[#0f1419] hover:border-blue-500 hover:bg-blue-500/10 transition-all flex items-center gap-4 group"
    >
      {doctor.profileImage ? (
        <img
          src={doctor.profileImage}
          alt={doctor.name}
          className="w-14 h-14 rounded-full object-cover border-2 border-blue-500/30"
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
          {doctor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
        </div>
      )}
      <div className="flex-1 text-left">
        <div className="text-white font-semibold">Dr. {doctor.name}</div>
        {doctor.degrees && doctor.degrees.length > 0 && (
          <div className="text-xs text-gray-400">{doctor.degrees.join(', ')}</div>
        )}
        <div className="text-sm text-blue-400">{doctor.specialty}</div>
        {doctor.linkedToClinic && (
          <div className="text-xs text-blue-400 mt-1">✓ Linked Doctor</div>
        )}
      </div>
      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
    </button>
  );
}
