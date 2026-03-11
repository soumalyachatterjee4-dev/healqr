import React, { useState } from 'react';
import { Search, MapPin, User, Stethoscope, ChevronDown, Star, ChevronRight, Loader } from 'lucide-react';
import type { Language } from '../utils/translations';
import { MEDICAL_SPECIALTIES } from '../utils/medicalSpecialties';
import DashboardPromoDisplay from './DashboardPromoDisplay';
import { db } from '../lib/firebase/config';

interface PatientSearchPageProps {
  language?: Language;
  isDashboard?: boolean;
}

interface Doctor {
  id: string;
  name: string;
  specialties?: string[];
  specialities?: string[];
  degrees: string[];
  profileImage?: string;
  experience?: number;
  rating?: number;
  pinCode?: string;
  clinicName?: string;
}

const PatientSearchPage: React.FC<PatientSearchPageProps> = ({ isDashboard = false }) => {
  const [searchArea, setSearchArea] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [results, setResults] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Auto-detect if user types a 6-digit pincode
  const handleAreaInputChange = (value: string) => {
    setSearchArea(value);
    if (/^\d{6}$/.test(value)) {
      setPinCode(value);
    } else {
      setPinCode('');
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);

    try {
      if (!db) return;
      const { collection, query, where, getDocs } = await import('firebase/firestore');

      const doctorsRef = collection(db, 'doctors');
      let q = query(doctorsRef);

      // Query by pinCode if provided
      if (pinCode) {
        q = query(doctorsRef, where('pinCode', '==', pinCode));
      }

      const snapshot = await getDocs(q);
      let doctors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Doctor[];

      // Filter by specialty if provided
      if (specialty) {
        doctors = doctors.filter(doc => {
          const doctorSpecs = doc.specialties || doc.specialities || [];
          return doctorSpecs.some(s => s.toLowerCase().includes(specialty.toLowerCase()));
        });
      }

      // Filter by doctor name if provided
      if (doctorName) {
        // Strip common prefixes like "dr", "dr.", "doctor" before matching
        const cleanedName = doctorName
          .toLowerCase()
          .replace(/^(dr\.?\s+|doctor\s+)/i, '')
          .trim();
        doctors = doctors.filter(doc =>
          doc.name?.toLowerCase().includes(cleanedName)
        );
      }

      setResults(doctors);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-8 mb-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Find a Doctor</h1>
        <p className="text-orange-100">Search for doctors near you by location, name, or specialty</p>
      </div>

      {/* Patient Login CTA */}
      <div className="bg-gray-800 border border-orange-500/30 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Already have an appointment?</h3>
              <p className="text-gray-400 text-sm">Login to view your history & track status</p>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/?page=patient-login'}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Patient Login - View History & Status
          </button>
        </div>
      </div>

      {/* Health Tips Card */}
      <div className="mb-8">
        <DashboardPromoDisplay category="health-tip" placement={isDashboard ? "patient-search-dashboard" : "patient-search"} />
      </div>

      {/* Search Form */}
      <div className="bg-gray-800 rounded-xl p-8 border border-orange-500/20">
        <div className="space-y-6">
          {/* Area Search */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Enter area (e.g., 'ent dr near moulali') or pincode
            </label>
            <input
              type="text"
              value={searchArea}
              onChange={(e) => handleAreaInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter location or pincode (e.g., 700008)"
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
            />
            {pinCode && (
              <p className="text-xs text-orange-400 mt-1">✓ Pincode detected: {pinCode}</p>
            )}
          </div>

          {/* Doctor Name Search */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Search by Doctor Name (optional)
            </label>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter doctor's name"
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Specialty Dropdown */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              <Stethoscope className="w-4 h-4 inline mr-2" />
              Select Specialty (optional)
            </label>
            <div className="relative">
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 pr-10 appearance-none focus:outline-none focus:border-orange-500 transition-colors cursor-pointer"
              >
                <option value="">All Specialties</option>
                {MEDICAL_SPECIALTIES.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Search Doctors
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search Results */}
      {searched && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            {loading ? 'Searching...' : `${results.length} Doctor${results.length !== 1 ? 's' : ''} Found`}
          </h2>

          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map((doctor) => (
                <div
                  key={doctor.id}
                  onClick={() => window.location.href = `/?doctorId=${doctor.id}`}
                  className="bg-gray-800 border border-orange-500/20 hover:border-orange-500 rounded-xl p-6 cursor-pointer transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      {doctor.profileImage ? (
                        <img src={doctor.profileImage} alt={doctor.name} className="w-20 h-20 rounded-full object-cover" />
                      ) : (
                        <span className="text-orange-500 text-2xl font-bold">
                          {doctor.name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-xl font-bold text-white">{doctor.name}</h3>
                          <p className="text-orange-500 font-medium">{(doctor.specialties || doctor.specialities)?.join(', ')}</p>
                          <p className="text-sm text-gray-400 mt-1">{doctor.degrees?.join(', ')}</p>
                        </div>
                        {doctor.rating && (
                          <div className="flex items-center gap-1 bg-gray-700 px-3 py-1 rounded-full">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-white font-medium">{doctor.rating}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-1 text-gray-400 text-sm">
                          <MapPin className="h-4 w-4" />
                          <span>{doctor.pinCode || 'Location not specified'}</span>
                        </div>
                        <button className="text-orange-500 hover:text-orange-400 font-medium flex items-center gap-1">
                          Book Appointment
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !loading && (
            <div className="bg-gray-800 border border-orange-500/20 rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No doctors found</h3>
              <p className="text-gray-400">Try adjusting your search criteria or entering a different pincode</p>
            </div>
          )}
        </div>
      )}

      {/* How It Works */}
      <div className="mt-8 bg-gray-800 rounded-xl p-8 border border-orange-500/20">
        <h3 className="text-xl font-bold text-white mb-6">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-orange-500 font-bold text-xl">1</span>
            </div>
            <h4 className="text-white font-semibold mb-2">Search</h4>
            <p className="text-gray-400 text-sm">Find doctors by location, name, or specialty</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-orange-500 font-bold text-xl">2</span>
            </div>
            <h4 className="text-white font-semibold mb-2">Book</h4>
            <p className="text-gray-400 text-sm">Choose a doctor and book your appointment</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-orange-500 font-bold text-xl">3</span>
            </div>
            <h4 className="text-white font-semibold mb-2">Visit</h4>
            <p className="text-gray-400 text-sm">Visit the clinic and get treated</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientSearchPage;
