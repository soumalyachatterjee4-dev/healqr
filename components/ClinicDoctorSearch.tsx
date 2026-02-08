import { Search, Stethoscope, GraduationCap, Briefcase, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { type Language } from '../utils/translations';

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
      
      const { doc, getDoc } = await import('firebase/firestore');

      const clinicRef = doc(db, 'clinics', bookingClinicId);
      const clinicSnap = await getDoc(clinicRef);

      if (clinicSnap.exists()) {
        const clinicData = clinicSnap.data();
        const linkedDoctors = clinicData.linkedDoctorsDetails || [];
        
        // Filter only active doctors
        const activeDoctors = linkedDoctors.filter(
          (d: Doctor) => d.status === 'active' || d.status === 'verified'
        );

        setDoctors(activeDoctors);
        setFilteredDoctors(activeDoctors);

        // Extract unique specialties
        const specialtiesSet = new Set<string>();
        activeDoctors.forEach((doctor: Doctor) => {
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
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 p-4">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-8 pt-8">
          {onBack && (
            <button
              onClick={onBack}
              className="text-white hover:bg-white/10 rounded-full p-2 transition-colors mb-6 inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Find Your Doctor</h1>
          <p className="text-blue-200">Choose how you'd like to search</p>
        </div>

        {/* Search Mode Options */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          <button
            onClick={() => setSearchMode('specialty')}
            className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-3xl p-8 hover:bg-slate-800/70 hover:border-blue-400/50 transition-all transform hover:scale-105 text-left group"
          >
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
              <Stethoscope className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">By Specialty</h2>
            <p className="text-blue-200">Browse doctors by their medical specialty</p>
            <div className="mt-4 text-blue-400 text-sm font-medium">
              {availableSpecialties.length} specialties available →
            </div>
          </button>

          <button
            onClick={handleSearchByName}
            className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-3xl p-8 hover:bg-slate-800/70 hover:border-blue-400/50 transition-all transform hover:scale-105 text-left group"
          >
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
              <Search className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">By Name</h2>
            <p className="text-blue-200">Search for a doctor by their name</p>
            <div className="mt-4 text-blue-400 text-sm font-medium">
              {doctors.length} doctors available →
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 p-4 pb-20">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={resetSearch}
            className="text-white hover:bg-white/10 rounded-full p-2 transition-colors mb-4 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Change Search</span>
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {searchMode === 'specialty' ? 'Search by Specialty' : 'Search by Name'}
          </h1>
        </div>

        {/* Specialty Selection */}
        {searchMode === 'specialty' && !selectedSpecialty && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {availableSpecialties.map((specialty) => (
              <button
                key={specialty}
                onClick={() => handleSpecialtySelect(specialty)}
                className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 hover:bg-slate-800/70 hover:border-blue-400/50 transition-all transform hover:scale-105 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-lg truncate">{specialty}</h3>
                    <p className="text-blue-300 text-sm">
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
                className="w-full pl-12 pr-4 py-4 bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl text-white placeholder-blue-300 focus:outline-none focus:border-blue-400/50"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Selected Specialty Badge */}
        {selectedSpecialty && (
          <div className="mb-6 flex items-center gap-2">
            <span className="text-blue-200">Showing:</span>
            <span className="px-4 py-2 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-200 font-medium">
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
            <p className="text-blue-300 mb-6">Try adjusting your search criteria</p>
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
                className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 hover:bg-slate-800/70 hover:border-blue-400/50 transition-all cursor-pointer"
                onClick={() => onSelectDoctor(doctor)}
              >
                <div className="flex gap-4">
                  {/* Doctor Photo */}
                  {doctor.profilePhoto ? (
                    <img
                      src={doctor.profilePhoto}
                      alt={doctor.name}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500/30"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                      {doctor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                  )}

                  {/* Doctor Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-white mb-1">Dr. {doctor.name}</h3>
                    
                    {/* Degrees */}
                    {doctor.degrees && doctor.degrees.length > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <GraduationCap className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <span className="text-sm text-blue-200">{doctor.degrees.join(', ')}</span>
                      </div>
                    )}

                    {/* Specialties */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {doctor.specialties?.map((specialty, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-xs text-blue-200 font-medium"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>

                    {/* Experience */}
                    {doctor.experience && (
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <span className="text-sm text-blue-200">{doctor.experience} experience</span>
                      </div>
                    )}

                    {/* Bio */}
                    {doctor.bio && (
                      <p className="text-sm text-blue-100 line-clamp-2 mt-2">
                        {doctor.bio}
                      </p>
                    )}

                    {/* Select Button */}
                    <div className="mt-4">
                      <Button className="bg-blue-600 hover:bg-blue-500 text-white">
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
  );
}
