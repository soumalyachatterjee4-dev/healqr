import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { MapPin, Clock, Phone, Star, ChevronRight, Search } from 'lucide-react';
import { Input } from './ui/input';
import { t, type Language } from '../utils/translations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { MEDICAL_SPECIALTIES } from '../utils/specialties';

interface Doctor {
  id: string;
  name: string;
  specialities: string[];
  degrees: string[];
  profileImage?: string;
  experience?: number;
  rating?: number;
  availability?: string;
}

interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  image?: string;
  rating?: number;
  timings?: string;
  doctors: string[]; // Array of doctor IDs
}

interface ClinicProfileProps {
  clinicId: string;
  onDoctorSelect: (doctorId: string) => void;
  language: Language;
}

export default function ClinicProfile({ clinicId, onDoctorSelect, language }: ClinicProfileProps) {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');

  useEffect(() => {
    const fetchClinicData = async () => {
      try {
        setLoading(true);
        const { db } = await import('../lib/firebase/config');
        const { doc, getDoc, collection, query, where, getDocs, documentId } = await import('firebase/firestore');

        // 1. Fetch Clinic Details
        const clinicRef = doc(db, 'clinics', clinicId);
        const clinicSnap = await getDoc(clinicRef);

        if (clinicSnap.exists()) {
          const clinicData = clinicSnap.data() as Clinic;
          setClinic({ ...clinicData, id: clinicSnap.id });

          // 2. Fetch Doctors associated with this clinic
          const doctorsRef = collection(db, 'doctors');
          const q = query(doctorsRef, where('clinicId', '==', clinicId));
          const doctorsSnap = await getDocs(q);
          const doctorsList = doctorsSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
          })) as Doctor[];
          setDoctors(doctorsList);
        } else {
          console.error('Clinic not found');
        }
      } catch (error) {
        console.error('Error fetching clinic data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (clinicId) {
      fetchClinicData();
    }
  }, [clinicId]);
  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialities.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSpecialty = selectedSpecialty === 'all' || 
      doc.specialities.some(s => s === selectedSpecialty);

    return matchesSearch && matchesSpecialty;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading clinic details...</p>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h2 className="text-xl font-bold text-red-500">Clinic Not Found</h2>
        <p className="text-muted-foreground">Please scan a valid QR code.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Clinic Header */}
      <div className="bg-white shadow-sm pb-6">
        <div className="relative h-32 bg-gradient-to-r from-blue-600 to-blue-400">
          <div className="absolute -bottom-10 left-6">
            <Avatar className="h-24 w-24 border-4 border-white shadow-md">
              <AvatarImage src={clinic.image} />
              <AvatarFallback className="text-2xl bg-blue-100 text-blue-600">
                {clinic.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        
        <div className="mt-12 px-6">
          <h1 className="text-2xl font-bold text-gray-900">{clinic.name}</h1>
          <div className="flex items-center text-gray-600 mt-1 text-sm">
            <MapPin className="h-4 w-4 mr-1" />
            {clinic.address}
          </div>
          <div className="flex items-center text-gray-600 mt-1 text-sm">
            <Clock className="h-4 w-4 mr-1" />
            {clinic.timings || '9:00 AM - 9:00 PM'}
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="px-4 mt-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search doctor by name..." 
            className="pl-10 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
            <SelectTrigger className="bg-white w-full">
                <SelectValue placeholder="Filter by Specialty" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {MEDICAL_SPECIALTIES.map(spec => (
                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>

      {/* Doctors List */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-semibold mb-4">Available Doctors ({filteredDoctors.length})</h2>
        <div className="space-y-3">
          {filteredDoctors.map((doctor) => (
            <Card key={doctor.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => onDoctorSelect(doctor.id)}>
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-gray-100">
                  <AvatarImage src={doctor.profileImage} />
                  <AvatarFallback className="bg-blue-50 text-blue-600">
                    {doctor.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{doctor.name}</h3>
                  <p className="text-sm text-blue-600 font-medium truncate">
                    {doctor.specialities.join(', ')}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-1">
                    {doctor.degrees.join(', ')}
                  </p>
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 mr-1" />
                    <span>{doctor.rating || 'New'}</span>
                    <span className="mx-2">•</span>
                    <span>{doctor.experience ? `${doctor.experience}+ Years` : 'Experienced'}</span>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-gray-400" />
              </CardContent>
            </Card>
          ))}
          
          {filteredDoctors.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              No doctors found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
