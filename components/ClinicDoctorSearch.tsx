import { Search, Stethoscope, GraduationCap, Briefcase, ArrowLeft, Lightbulb } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { type Language } from '../utils/translations';
import BookingFlowLayout from './BookingFlowLayout';
import TemplateDisplay from './TemplateDisplay';

interface Doctor {
  uid: string;
  name: string;
  email: string;
  specialties: string[];
  degrees?: string[];
  experience?: string;
  bio?: string;
  profilePhoto?: string;
  status: string;
}

interface ClinicDoctorSearchProps {
  onSelectDoctor: (doctor: Doctor) => void;
  onBack?: () => void;
  language?: Language;
}

export default function ClinicDoctorSearch({ 
  onSelectDoctor,
  onBack,
}: ClinicDoctorSearchProps) {
  const [searchMode, setSearchMode] = useState<'specialty' | 'name' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [clinicProfile, setClinicProfile] = useState<any>(null);

  useEffect(() => {
    loadClinicDoctors();
  }, []);

  useEffect(() => {
    filterDoctors();
  }, [searchQuery, searchMode, selectedSpecialty, doctors]);

  const loadClinicDoctors = async () => {
    try {
      const bookingClinicId = sessionStorage.getItem('booking_clinic_id');
      if (!bookingClinicId) return;

      const { db } = await import('../lib/firebase/config');
      if (!db) return;
      
      const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');

      // Load clinic profile
      const clinicRef = doc(db, 'clinics', bookingClinicId);
      const clinicSnap = await getDoc(clinicRef);

      if (clinicSnap.exists()) {
        const clinicData = clinicSnap.data();
        setClinicProfile({ id: clinicSnap.id, ...clinicData });
        
        // Get ALL doctors associated with this clinic (both onboarded and non-onboarded)
        const allDoctorsData: Doctor[] = [];
        
        // Method 1: Get linkedDoctorsDetails (onboarded doctors with full details)
        const linkedDoctors = clinicData.linkedDoctorsDetails || [];
        allDoctorsData.push(...linkedDoctors);
        
        // Method 2: Get non-onboarded doctors from the doctors collection
        // Check if clinic has a doctors array with email/UIDs
        if (clinicData.doctors && clinicData.doctors.length > 0) {
          // These are non-onboarded doctors (just basic info)
          const nonOnboardedDoctors = clinicData.doctors || [];
          
          // Add non-onboarded doctors that aren't already in linkedDoctorsDetails
          const linkedEmails = new Set(linkedDoctors.map((d: Doctor) => d.email));
          
          nonOnboardedDoctors.forEach((doctor: any) => {
            if (!linkedEmails.has(doctor.email)) {
              allDoctorsData.push({
                uid: doctor.uid || doctor.email,
                name: doctor.name || 'Doctor',
                email: doctor.email,
                specialties: doctor.specialties || [],
                degrees: doctor.degrees || [],
                experience: doctor.experience || '',
                bio: doctor.bio || '',
                profilePhoto: doctor.profilePhoto || '',
                status: doctor.status || 'non-onboarded'
              });
            }
          });
        }

        setDoctors(allDoctorsData);
        setFilteredDoctors(allDoctorsData);

        // Extract unique specialties from all doctors
        const specialtiesSet = new Set<string>();
        allDoctorsData.forEach((doctor: Doctor) => {
          doctor.specialties?.forEach((spec: string) => specialtiesSet.add(spec));
        });
        setAvailableSpecialties(Array.from(specialtiesSet).sort());
      }
    } catch (error) {
      console.error('Error loading clinic doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDoctors = () => {
    let filtered = [...doctors];

    if (searchMode === 'specialty' && selectedSpecialty) {
      filtered = filtered.filter(doctor =>
        doctor.specialties?.some(spec => 
          spec.toLowerCase().includes(selectedSpecialty.toLowerCase())
        )
      );
    } else if (searchMode === 'name' && searchQuery) {
      filtered = filtered.filter(doctor =>
        doctor.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredDoctors(filtered);
  };

  const handleSpecialtySelect = (specialty: string) => {
    setSelectedSpecialty(specialty);
    setSearchMode('specialty');
  };

  const handleSearchByName = () => {
    setSearchMode('name');
    setSelectedSpecialty(null);
  };

  const resetSearch = () => {
    setSearchMode(null);
    setSearchQuery('');
    setSelectedSpecialty(null);
    setFilteredDoctors(doctors);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-blue-200">Loading doctors...</p>
        </div>
      </div>
    );
  }

  // Initial search mode selection
  if (!searchMode) {
    return (
      <BookingFlowLayout
        onBack={onBack}
        doctorName={clinicProfile?.name}
        doctorPhoto={clinicProfile?.logoUrl}
        useDrPrefix={false}
        themeColor="blue"
      >
        <div className="bg-[#1a1f2e] rounded-2xl shadow-xl overflow-hidden max-w-full">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 sm:py-6 bg-gradient-to-br from-gray-700 to-gray-800">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Find Your Doctor</h1>
            <p className="text-blue-200">Choose how you'd like to search</p>
          </div>

          {/* Search Mode Options */}
          <div className="px-4 sm:px-6 py-6 grid md:grid-cols-2 gap-4">
            <button
              onClick={() => setSearchMode('specialty')}
              className="bg-gradient-to-br from-gray-700 to-gray-800 border border-blue-500/30 rounded-2xl p-6 hover:bg-gradient-to-br hover:from-gray-600 hover:to-gray-700 hover:border-blue-400/50 transition-all transform hover:scale-105 text-left group"
            >
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                <Stethoscope className="w-7 h-7 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">By Specialty</h2>
              <p className="text-gray-300 text-sm">Browse doctors by their medical specialty</p>
              <div className="mt-4 text-blue-400 text-sm font-medium">
                {availableSpecialties.length} specialties available →
              </div>
            </button>

            <button
              onClick={handleSearchByName}
              className="bg-gradient-to-br from-gray-700 to-gray-800 border border-blue-500/30 rounded-2xl p-6 hover:bg-gradient-to-br hover:from-gray-600 hover:to-gray-700 hover:border-blue-400/50 transition-all transform hover:scale-105 text-left group"
            >
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                <Search className="w-7 h-7 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">By Name</h2>
              <p className="text-gray-300 text-sm">Search for a doctor by their name</p>
              <div className="mt-4 text-blue-400 text-sm font-medium">
                {doctors.length} doctors available →
              </div>
            </button>
          </div>

          {/* Today's Health Tip */}
          <div className="px-4 sm:px-6 pb-6">
            <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-2xl p-4 sm:p-5 overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-blue-400" />
                <h3 className="text-white text-base sm:text-lg">Today's Health Tip</h3>
              </div>
              <TemplateDisplay
                placement="booking-mini-website"
                className="rounded-xl max-w-full"
              />
            </div>
          </div>
        </div>
      </BookingFlowLayout>
    );
  }

  return (
    <BookingFlowLayout
      onBack={resetSearch}
      doctorName={clinicProfile?.name}
      doctorPhoto={clinicProfile?.logoUrl}
      useDrPrefix={false}
      themeColor="blue"
    >
      <div className="bg-[#1a1f2e] rounded-2xl shadow-xl overflow-hidden max-w-full">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-6 bg-gradient-to-br from-gray-700 to-gray-800">
          <h1 className="text-xl md:text-2xl font-bold text-white mb-2">
            {searchMode === 'specialty' ? 'Search by Specialty' : 'Search by Name'}
          </h1>
          <p className="text-blue-200 text-sm">Find the right doctor for you</p>
        </div>

        <div className="px-4 sm:px-6 py-6">
          {/* Specialty Selection */}
          {searchMode === 'specialty' && !selectedSpecialty && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {availableSpecialties.map((specialty) => (
                <button
                  key={specialty}
                  onClick={() => handleSpecialtySelect(specialty)}
                  className="bg-gradient-to-br from-gray-700 to-gray-800 border border-blue-500/30 rounded-xl p-4 hover:bg-gradient-to-br hover:from-gray-600 hover:to-gray-700 hover:border-blue-400/50 transition-all transform hover:scale-105 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-base truncate">{specialty}</h3>
                      <p className="text-blue-300 text-xs">
                        {doctors.filter(d => d.specialties?.includes(specialty)).length} doctors
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Search by Name Input */}
          {searchMode === 'name' && (
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter doctor's name..."
                  className="w-full pl-12 pr-4 py-3 bg-gradient-to-br from-gray-700 to-gray-800 border border-blue-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Selected Specialty Badge */}
          {selectedSpecialty && (
            <div className="mb-6 flex items-center gap-2">
              <span className="text-gray-300 text-sm">Showing:</span>
              <span className="px-3 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-200 text-sm font-medium">
                {selectedSpecialty}
              </span>
              <button
                onClick={() => setSelectedSpecialty(null)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Clear
              </button>
            </div>
          )}

          {/* Doctors List */}
          {filteredDoctors.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👨‍⚕️</div>
              <h3 className="text-xl font-semibold text-white mb-2">No doctors found</h3>
              <p className="text-gray-300 mb-6">Try adjusting your search criteria</p>
              <button
                onClick={resetSearch}
                className="text-blue-400 hover:text-blue-300"
              >
                Reset search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredDoctors.map((doctor) => (
                <div
                  key={doctor.uid}
                  className="bg-gradient-to-br from-gray-700 to-gray-800 border border-blue-500/30 rounded-xl p-4 hover:bg-gradient-to-br hover:from-gray-600 hover:to-gray-700 hover:border-blue-400/50 transition-all cursor-pointer"
                  onClick={() => onSelectDoctor(doctor)}
                >
                  <div className="flex gap-4">
                    {/* Doctor Photo */}
                    {doctor.profilePhoto ? (
                      <img
                        src={doctor.profilePhoto}
                        alt={doctor.name}
                        className="w-16 h-16 rounded-xl object-cover border-2 border-blue-500/30 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {doctor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                    )}

                    {/* Doctor Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white mb-1">Dr. {doctor.name}</h3>
                      
                      {/* Degrees */}
                      {doctor.degrees && doctor.degrees.length > 0 && (
                        <div className="flex items-center gap-2 mb-2">
                          <GraduationCap className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{doctor.degrees.join(', ')}</span>
                        </div>
                      )}

                      {/* Specialties */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {doctor.specialties?.map((specialty, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-xs text-blue-200 font-medium"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>

                      {/* Experience */}
                      {doctor.experience && (
                        <div className="flex items-center gap-2 mb-2">
                          <Briefcase className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{doctor.experience}</span>
                        </div>
                      )}

                      {/* Bio */}
                      {doctor.bio && (
                        <p className="text-sm text-gray-300 line-clamp-2 mt-2">
                          {doctor.bio}
                        </p>
                      )}

                      {/* Select Button */}
                      <div className="mt-3">
                        <Button className="bg-blue-600 hover:bg-blue-500 text-white h-9 text-sm">
                          Select Doctor
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BookingFlowLayout>
  );
}
