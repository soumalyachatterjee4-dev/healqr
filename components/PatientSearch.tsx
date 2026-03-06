import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Search, MapPin, Stethoscope, ArrowLeft, Star, ChevronRight, User, History, X, Lock, Unlock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { MEDICAL_SPECIALTIES } from '../utils/medicalSpecialties';
import DashboardPromoDisplay from './DashboardPromoDisplay';
import { useAITranslation } from '../hooks/useAITranslation';
import type { Language } from '../utils/translations';

interface Doctor {
  id: string;
  name: string;
  specialties: string[];
  degrees: string[];
  profileImage?: string;
  experience?: number;
  rating?: number;
  pinCode?: string;
  clinicName?: string;
  landmark?: string;
}

interface PatientSearchProps {
  language?: Language;
}

export default function PatientSearch({ language = 'english' }: PatientSearchProps) {
  const { dt, bt } = useAITranslation(language);
  const [areaInput, setAreaInput] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [isAreaLocked, setIsAreaLocked] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [results, setResults] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [geocodingLoading, setGeocodingLoading] = useState(false);

  // Google Geocoding API to convert area name to pincode
  const handleAreaSearch = async (): Promise<string | null> => {
    if (!areaInput || isAreaLocked) return pinCode;

    setGeocodingLoading(true);
    try {
      // Smart Logic: Strip intent-based keywords from the query before geocoding
      // e.g., "ent dr near moulali" -> "moulali"
      const intentKeywords = [
        'doctor', 'dr', 'dentist', 'near', 'specialist', 'clinic', 'hospital',
        'best', 'top', 'in', 'at', 'specialty', 'physician', 'surgeon',
        'medical', 'center', 'centre', 'lookup', 'find', 'search'
      ];

      let cleanQuery = areaInput.toLowerCase();
      intentKeywords.forEach(keyword => {
        // Use word boundary to avoid stripping partial matches (e.g., "Indira" -> "ira" if "in" is stripped)
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        cleanQuery = cleanQuery.replace(regex, '');
      });

      // Clean up multiple spaces and trim
      cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();

      console.log('🔍 Geocoding cleaned query:', cleanQuery, '(Original:', areaInput + ')');

      // Use Firebase API key - already has Geocoding API enabled
      const apiKey = 'AIzaSyB1AVXeao1bqTah8cD1bGAiAQMbZ5nw0WI';
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanQuery || areaInput)}, India&key=${apiKey}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        // Extract pincode from address components
        const addressComponents = data.results[0].address_components;
        const postalCode = addressComponents.find((component: any) =>
          component.types.includes('postal_code')
        );

        if (postalCode) {
          setPinCode(postalCode.long_name);
          setIsAreaLocked(true);
          return postalCode.long_name;
        } else {
          alert('Could not find pincode for this area. Please try a more specific location.');
          return null;
        }
      } else {
        alert('Location not found. Please try again.');
        return null;
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Error finding location. Please enter pincode manually.');
      return null;
    } finally {
      setGeocodingLoading(false);
    }
  };

  const unlockArea = () => {
    setIsAreaLocked(false);
    setAreaInput('');
    setPinCode('');
  };

  const clearDoctorName = () => {
    setDoctorName('');
  };

  const clearSpecialty = () => {
    setSpecialty('');
  };

  // Handle area input change - detect if user types a valid pincode
  const handleAreaInputChange = (value: string) => {
    setAreaInput(value);
    // If input is 6 digits (Indian pincode format), set it as pincode directly
    if (/^\d{6}$/.test(value)) {
      setPinCode(value);
    } else {
      // Clear pincode if not a valid format
      if (!isAreaLocked) {
        setPinCode('');
      }
    }
  };

  const handleSearch = async () => {
    let searchPinCode = pinCode;

    // If no pinCode but areaInput exists (and it's not a numeric pincode), try geocoding automatically
    if (!searchPinCode && areaInput && !/^\d{6}$/.test(areaInput)) {
      console.log('🔄 Triggering auto-geocoding for search...');
      const resolvedPin = await handleAreaSearch();
      if (!resolvedPin) return; // Geocoding failed or alerted
      searchPinCode = resolvedPin;
    }

    if (!searchPinCode && !specialty && !doctorName) return;

    setLoading(true);
    setSearched(true);

    try {
      const { db } = await import('../lib/firebase/config');
      if (!db) {
        setLoading(false);
        return;
      }
      const { collection, query, where, getDocs } = await import('firebase/firestore');

      const doctorsRef = collection(db, 'doctors');
      let q = query(doctorsRef);

      // Query by pinCode if provided
      if (searchPinCode) {
        q = query(doctorsRef, where('pinCode', '==', searchPinCode));
      }

      const snapshot = await getDocs(q);
      let doctors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Doctor[];

      // Filter by specialty if provided
      if (specialty) {
        doctors = doctors.filter(doc => {
          // Check for matching ID or label to handle fallback/transitional state
          return doc.specialties?.some(s =>
            s.toLowerCase() === specialty.toLowerCase() ||
            MEDICAL_SPECIALTIES.find(ms => ms.id === s)?.label.toLowerCase() === specialty.toLowerCase()
          );
        });
      }

      // Filter by doctor name if provided
      if (doctorName) {
        doctors = doctors.filter(doc =>
          doc.name?.toLowerCase().includes(doctorName.toLowerCase())
        );
      }

      setResults(doctors);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.location.href = '/'}
            className="text-gray-400 hover:text-white hover:bg-zinc-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-white">{bt('Find a Doctor')}</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Health Tip Card */}
        <div className="mb-4">
          <DashboardPromoDisplay category="health-tip" placement="patient-search" />
        </div>

        {/* View My History Button */}
        <Button
          onClick={() => window.location.href = '/?page=patient-login'}
          variant="outline"
          className="w-full mb-4 h-12 text-base border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white bg-zinc-900 border-2 flex items-center justify-center gap-2"
        >
          <History className="h-5 w-5" />
          {bt('Patient Login - View History & Status')}
        </Button>

        {/* Search Box */}
        <Card className="mb-4 bg-zinc-900 border border-zinc-800 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {/* Area/Pincode Input with Lock */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder={isAreaLocked ? pinCode : dt("Enter area or pincode")}
                  className="pl-10 pr-20 h-12 text-base bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-400"
                  value={isAreaLocked ? `${areaInput} (${pinCode})` : areaInput}
                  onChange={(e) => !isAreaLocked && handleAreaInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      // If already a valid pincode, search directly; otherwise geocode
                      if (/^\d{6}$/.test(areaInput)) {
                        handleSearch();
                      } else {
                        handleAreaSearch();
                      }
                    }
                  }}
                  disabled={isAreaLocked}
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                  {isAreaLocked ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={unlockArea}
                      className="h-8 w-8 text-yellow-500 hover:text-yellow-400 hover:bg-zinc-700"
                      title="Unlock to change area"
                    >
                      <Lock className="h-4 w-4" />
                    </Button>
                  ) : (
                    areaInput && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setAreaInput('')}
                          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-zinc-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleAreaSearch}
                          disabled={geocodingLoading}
                          className="h-8 w-8 text-orange-500 hover:text-orange-400 hover:bg-zinc-700"
                          title="Search and lock area"
                        >
                          {geocodingLoading ? (
                            <span className="animate-spin">⏳</span>
                          ) : (
                            <Unlock className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    )
                  )}
                </div>
              </div>

              {/* Doctor Name Input with Clear */}
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder={dt('Search by Doctor Name (optional)')}
                  className="pl-10 pr-10 h-12 text-base bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-400"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                />
                {doctorName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearDoctorName}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-white hover:bg-zinc-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Specialty Select with Clear */}
              <div className="relative">
                <Stethoscope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
                <Select value={specialty} onValueChange={setSpecialty}>
                  <SelectTrigger className="pl-10 pr-10 h-12 text-base w-full bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder={dt('Select Specialty (optional)')} />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {MEDICAL_SPECIALTIES.map((spec) => (
                      <SelectItem key={spec.id} value={spec.id} className="text-white hover:bg-zinc-700">
                        {spec.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {specialty && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearSpecialty}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-white hover:bg-zinc-700 z-10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <Button
              className="w-full mt-4 h-12 text-base bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? bt('Searching...') : bt('Search Doctors')}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {searched && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">
              {results.length} {dt('Doctors Found')}
            </h2>

            {results.map((doctor) => (
              <Card
                key={doctor.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-orange-500 transition-all cursor-pointer"
                onClick={() => window.location.href = `/?doctorId=${doctor.id}`}
              >
                <CardContent className="p-6 flex items-start gap-4">
                  <Avatar className="h-20 w-20 border-2 border-zinc-700">
                    <AvatarImage src={doctor.profileImage} />
                    <AvatarFallback className="bg-orange-500/10 text-orange-500 text-xl">
                      {doctor.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-white">{doctor.name}</h3>
                        <p className="text-orange-500 font-medium">
                          {doctor.specialties?.map(s => MEDICAL_SPECIALTIES.find(ms => ms.id === s)?.label || s).join(', ')}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">{doctor.degrees?.join(', ')}</p>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1 bg-zinc-800 text-white border-zinc-700">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {doctor.rating || 'New'}
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {doctor.pinCode}
                        </span>
                      </div>
                      <Button variant="ghost" className="text-orange-500 hover:text-orange-400 hover:bg-orange-500/10 p-0 h-auto font-medium">
                        {bt('Book Appointment')} <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {results.length === 0 && !loading && (
              <div className="text-center py-12 bg-zinc-900 rounded-lg border border-zinc-800">
                <div className="h-16 w-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-white">{bt('No doctors found')}</h3>
                <p className="text-gray-400 mt-1">{bt('Try adjusting your search criteria')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
