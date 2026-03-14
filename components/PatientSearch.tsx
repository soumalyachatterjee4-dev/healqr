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
  practisingPincodes?: string[];
  chambers?: {
    main?: { pincode?: string; address?: string };
    secondary?: { pincode?: string; address?: string };
  };
}

interface PatientSearchProps {
  language?: Language;
}

export default function PatientSearch({ language = 'english' }: PatientSearchProps) {

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
      // Step 1: Use Gemini AI to resolve location → pincode (best for Indian localities)
      console.log('🤖 Asking Gemini AI to resolve pincode for:', areaInput);
      try {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const { app } = await import('../lib/firebase/config');
        const functions = getFunctions(app!);
        const resolvePin = httpsCallable(functions, 'resolveLocationPincode');
        const result = await resolvePin({ query: areaInput });
        const data = result.data as { pincode: string | null; source: string };

        if (data.pincode && /^\d{6}$/.test(data.pincode)) {
          console.log('✅ Gemini resolved pincode:', data.pincode);
          setPinCode(data.pincode);
          setIsAreaLocked(true);
          return data.pincode;
        }
        console.log('⚠️ Gemini could not resolve pincode, trying geocoding fallback...');
      } catch (geminiErr) {
        console.log('⚠️ Gemini resolver failed, trying geocoding fallback...', geminiErr);
      }

      // Step 2: Fallback — Google Geocoding API
      const intentKeywords = [
        'doctor', 'dr', 'dentist', 'near', 'specialist', 'clinic', 'hospital',
        'best', 'top', 'in', 'at', 'specialty', 'physician', 'surgeon',
        'medical', 'center', 'centre', 'lookup', 'find', 'search'
      ];

      let cleanQuery = areaInput.toLowerCase();
      intentKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        cleanQuery = cleanQuery.replace(regex, '');
      });
      cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();

      const apiKey = 'AIzaSyB1AVXeao1bqTah8cD1bGAiAQMbZ5nw0WI';
      const queryText = cleanQuery || areaInput;

      for (const suffix of [', India', ', West Bengal, India']) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(queryText + suffix)}&key=${apiKey}`
        );
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const addressComponents = data.results[0].address_components;
          const postalCode = addressComponents.find((component: any) =>
            component.types.includes('postal_code')
          );

          if (postalCode) {
            setPinCode(postalCode.long_name);
            setIsAreaLocked(true);
            return postalCode.long_name;
          }
        }
      }

      // Step 3: Fallback — Nominatim (free, no API key)
      console.log('🔄 Google geocoding failed, trying Nominatim fallback...');
      const nomResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryText)}, India&format=json&addressdetails=1&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const nomData = await nomResponse.json();

      if (nomData.length > 0 && nomData[0].address?.postcode) {
        const postcode = nomData[0].address.postcode;
        setPinCode(postcode);
        setIsAreaLocked(true);
        return postcode;
      }

      console.log('⚠️ All resolvers failed for:', queryText, '— falling back to text search');
      return null;
    } catch (error) {
      console.error('Location resolve error:', error);
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
    let areaTextFallback = ''; // Used when geocoding fails
    let detectedSpecialty = specialty; // May be auto-detected from natural language input

    // Smart specialty extraction from area input (e.g. "GENERAL PHYSICIAN NEAR BAKSARA")
    if (!detectedSpecialty && areaInput) {
      const inputLower = areaInput.toLowerCase();
      for (const spec of MEDICAL_SPECIALTIES) {
        // Check searchTerms first (e.g. 'general physician', 'heart', 'bone')
        const matched = spec.searchTerms.some(term => inputLower.includes(term));
        // Also check the label (e.g. 'cardiology', 'orthopedics')
        if (matched || inputLower.includes(spec.label.toLowerCase().split(' ')[0].replace('(', ''))) {
          detectedSpecialty = spec.id;
          console.log('🎯 Auto-detected specialty from input:', spec.label);
          break;
        }
      }
    }

    // If no pinCode but areaInput exists (and it's not a numeric pincode), try geocoding automatically
    if (!searchPinCode && areaInput && !/^\d{6}$/.test(areaInput)) {
      console.log('🔄 Triggering auto-geocoding for search...');
      const resolvedPin = await handleAreaSearch();
      if (resolvedPin) {
        searchPinCode = resolvedPin;
      } else {
        // Geocoding failed — use cleaned area text for text-based matching
        const intentKeywords = [
          'doctor', 'dr', 'dentist', 'near', 'specialist', 'clinic', 'hospital',
          'best', 'top', 'in', 'at', 'specialty', 'physician', 'surgeon',
          'medical', 'center', 'centre', 'lookup', 'find', 'search', 'cardiologist',
          'orthopedic', 'dermatologist', 'ent', 'gynecologist', 'pediatrician',
          'neurologist', 'ophthalmologist', 'psychiatrist', 'urologist',
          'general', 'cardiology', 'neurology', 'gynecology', 'urology',
        ];
        areaTextFallback = areaInput.toLowerCase();
        intentKeywords.forEach(kw => {
          areaTextFallback = areaTextFallback.replace(new RegExp(`\\b${kw}\\b`, 'gi'), '');
        });
        areaTextFallback = areaTextFallback.replace(/\s+/g, ' ').trim();
      }
    }

    if (!searchPinCode && !areaTextFallback && !detectedSpecialty && !doctorName) return;

    setLoading(true);
    setSearched(true);

    try {
      const { db } = await import('../lib/firebase/config');
      if (!db) {
        setLoading(false);
        return;
      }
      const { collection, query, getDocs } = await import('firebase/firestore');

      const doctorsRef = collection(db, 'doctors');

      // Fetch all doctors, then filter by pincode match
      // This allows matching against residential pinCode, practisingPincodes, and chamber pincodes
      const snapshot = await getDocs(query(doctorsRef));
      let doctors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Doctor[];

      // Filter by pinCode — match residential, practising, or chamber pincodes
      if (searchPinCode) {
        doctors = doctors.filter(doc => {
          if (doc.pinCode === searchPinCode) return true;
          if (doc.practisingPincodes?.includes(searchPinCode)) return true;
          if (doc.chambers?.main?.pincode === searchPinCode) return true;
          if (doc.chambers?.secondary?.pincode === searchPinCode) return true;
          return false;
        });
      } else if (areaTextFallback) {
        // Geocoding failed — text-match against addresses, landmarks, names, clinic names
        const searchText = areaTextFallback.toLowerCase();
        doctors = doctors.filter(doc => {
          const fields = [
            doc.landmark,
            doc.clinicName,
            doc.name,
            doc.chambers?.main?.address,
            doc.chambers?.secondary?.address,
          ].filter(Boolean).join(' ').toLowerCase();
          return fields.includes(searchText);
        });
      }

      // Filter by specialty (manually selected OR auto-detected from input)
      if (detectedSpecialty) {
        doctors = doctors.filter(doc => {
          return doc.specialties?.some(s =>
            s.toLowerCase() === detectedSpecialty.toLowerCase() ||
            MEDICAL_SPECIALTIES.find(ms => ms.id === s)?.label.toLowerCase() === detectedSpecialty.toLowerCase()
          );
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
          <h1 className="text-lg font-semibold text-white">Find a Doctor</h1>
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
          Patient Login - View History & Status
        </Button>

        {/* Search Box */}
        <Card className="mb-4 bg-zinc-900 border border-zinc-800 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {/* Area/Pincode Input with Lock */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder={isAreaLocked ? pinCode : 'Enter area or pincode'}
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
                  placeholder="Search by Doctor Name (optional)"
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
                    <SelectValue placeholder="Select Specialty (optional)" />
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
              {loading ? 'Searching...' : 'Search Doctors'}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {searched && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">
              {results.length} Doctors Found
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
                        Book Appointment <ChevronRight className="h-4 w-4 ml-1" />
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
                <h3 className="text-lg font-medium text-white">No doctors found</h3>
                <p className="text-gray-400 mt-1">Try adjusting your search criteria</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

