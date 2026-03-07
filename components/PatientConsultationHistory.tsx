import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Calendar, 
  User, 
  Stethoscope, 
  Download, 
  Upload,
  Search,
  Filter,
  X,
  FileText,
  Clock,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import DashboardPromoDisplay from './DashboardPromoDisplay';
import type { Language } from '../utils/translations';

interface Consultation {
  id: string;
  bookingId: string;
  patientName: string;
  patientPhone: string;
  patientGender?: string;
  patientAge?: number;
  doctorName: string;
  doctorSpecialty: string;
  bookingDate: string;
  bookingTime: string;
  chamberName?: string;
  chamberAddress?: string;
  status: string;
  serialNumber?: string;
  purpose?: string;
  prescriptionImages?: string[];
  createdAt: any;
}

interface PatientConsultationHistoryProps {
  patientPhone?: string;
  language?: Language;
}

export default function PatientConsultationHistory({ patientPhone, language = 'english' }: PatientConsultationHistoryProps) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [filteredConsultations, setFilteredConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);

  useEffect(() => {
    loadConsultations();
  }, [patientPhone]);

  useEffect(() => {
    applyFilters();
  }, [consultations, searchTerm, dateFilter, specialtyFilter]);

  const loadConsultations = async () => {
    setLoading(true);
    try {
      const currentPatientPhone = patientPhone || localStorage.getItem('patient_phone');
      
      if (!currentPatientPhone) {
        console.log('❌ No patient phone found');
        setLoading(false);
        return;
      }

      console.log('📱 Loading consultations for:', currentPatientPhone);

      // Load REAL booking data from Firestore
      const bookingsRef = collection(db, 'bookings');
      
      // Try with orderBy first
      let snapshot;
      try {
        const q = query(
          bookingsRef,
          where('patientPhone', '==', currentPatientPhone),
          orderBy('createdAt', 'desc')
        );
        snapshot = await getDocs(q);
        console.log('✅ Query with orderBy successful:', snapshot.size, 'bookings');
      } catch (indexError) {
        console.warn('⚠️ Index not available, querying without orderBy:', indexError);
        // Fallback: query without orderBy
        const q = query(
          bookingsRef,
          where('patientPhone', '==', currentPatientPhone)
        );
        snapshot = await getDocs(q);
        console.log('✅ Query without orderBy successful:', snapshot.size, 'bookings');
      }

      const consultationData: Consultation[] = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Determine status based on multiple fields
        let status = 'in-queue'; // default
        if (data.isCompleted || data.consultationStatus === 'completed' || data.isMarkedSeen) {
          status = 'completed';
        } else if (data.status === 'cancelled' || data.isCancelled) {
          status = 'cancelled';
        } else if (data.status) {
          status = data.status;
        }
        
        console.log('📋 Booking data:', {
          id: doc.id,
          bookingId: data.bookingId,
          patientName: data.patientName,
          doctorName: data.doctorName,
          date: data.bookingDate,
          time: data.bookingTime || data.timeSlot,
          serialNumber: data.serialNumber,
          chamber: data.chamberName,
          status: status
        });
        return {
          id: doc.id,
          bookingId: data.bookingId || doc.id,
          patientName: data.patientName || '',
          patientPhone: data.patientPhone || '',
          patientGender: data.patientGender || data.gender || '',
          patientAge: data.patientAge || data.age || 0,
          doctorName: data.doctorName || 'Unknown Doctor',
          doctorSpecialty: data.specialty || data.doctorSpecialty || 'General Medicine',
          bookingDate: data.bookingDate || data.consultationDate || data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
          bookingTime: data.bookingTime || data.timeSlot || data.time || '',
          chamberName: data.chamberName || data.clinicName || data.location || '',
          chamberAddress: data.chamberAddress || '',
          status: status,
          serialNumber: data.serialNumber || data.tokenNumber,
          purpose: data.purpose || data.visitType || '',
          prescriptionImages: data.prescriptionImages || [],
          createdAt: data.createdAt
        } as Consultation;
      });

      // Sort by createdAt manually if we didn't use orderBy
      consultationData.sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() || new Date(a.bookingDate).getTime();
        const dateB = b.createdAt?.toMillis?.() || new Date(b.bookingDate).getTime();
        return dateB - dateA;
      });

      console.log('✅ Total consultations loaded:', consultationData.length);
      setConsultations(consultationData);

      // Extract unique specialties
      const uniqueSpecialties = Array.from(new Set(
        consultationData.map(c => c.doctorSpecialty).filter(Boolean)
      ));
      setSpecialties(uniqueSpecialties);

    } catch (error) {
      console.error('Error loading consultations:', error);
      toast.error('Failed to load consultation history');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...consultations];

    // Search filter (doctor name or specialty)
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.doctorSpecialty?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(c => {
        const consultDate = new Date(c.bookingDate);
        const diffDays = Math.floor((now.getTime() - consultDate.getTime()) / (1000 * 60 * 60 * 24));

        switch (dateFilter) {
          case 'week':
            return diffDays <= 7;
          case 'month':
            return diffDays <= 30;
          case 'year':
            return diffDays <= 365;
          default:
            return true;
        }
      });
    }

    // Specialty filter
    if (specialtyFilter !== 'all') {
      filtered = filtered.filter(c => c.doctorSpecialty === specialtyFilter);
    }

    setFilteredConsultations(filtered);
  };

  const downloadPrescription = async (consultation: Consultation) => {
    if (!consultation.prescriptionImages || consultation.prescriptionImages.length === 0) {
      toast.error('No prescription available for this consultation');
      return;
    }

    try {
      // Download first prescription image
      const url = consultation.prescriptionImages[0];
      const link = document.createElement('a');
      link.href = url;
      link.download = `Prescription_${consultation.bookingId}.jpg`;
      link.target = '_blank';
      link.click();
      toast.success('Prescription download started');
    } catch (error) {
      console.error('Error downloading prescription:', error);
      toast.error('Failed to download prescription');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('all');
    setSpecialtyFilter('all');
    setShowFilters(false);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading consultation history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Tip */}
      <DashboardPromoDisplay category="health-tip" placement="patient-history" />

      {/* Search and Filters */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search by doctor name or specialty..."
                className="pl-10 pr-10 h-12 bg-zinc-800 border-zinc-700 text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="ghost"
                className="text-emerald-500 hover:bg-emerald-500/10"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
              {(searchTerm || dateFilter !== 'all' || specialtyFilter !== 'all') && (
                <Button
                  onClick={clearFilters}
                  variant="ghost"
                  className="text-gray-400 hover:text-white"
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Date Range</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full h-10 bg-zinc-800 border-zinc-700 text-white rounded-md px-3"
                  >
                    <option value="all">All Time</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="year">Last Year</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Specialty</label>
                  <select
                    value={specialtyFilter}
                    onChange={(e) => setSpecialtyFilter(e.target.value)}
                    className="w-full h-10 bg-zinc-800 border-zinc-700 text-white rounded-md px-3"
                  >
                    <option value="all">All Specialties</option>
                    {specialties.map(specialty => (
                      <option key={specialty} value={specialty}>{specialty}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-gray-400">
          Showing {filteredConsultations.length} of {consultations.length} consultations
        </p>
      </div>

      {/* Consultation List */}
      {filteredConsultations.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Consultations Found</h3>
            <p className="text-gray-400">
              {consultations.length === 0 
                ? "You haven't had any consultations yet"
                : "Try adjusting your filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredConsultations.map((consultation) => (
            <Card key={consultation.id} className="bg-zinc-900 border-zinc-800 hover:border-emerald-500/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    {/* Status Badge - Top Right */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">Consultation Details</h3>
                      <div>
                        {consultation.status === 'completed' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                            ✓ Completed
                          </span>
                        )}
                        {consultation.status === 'in-queue' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            ⏳ In Queue
                          </span>
                        )}
                        {consultation.status === 'cancelled' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            ✕ Cancelled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Patient Details Section */}
                    <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
                      <h4 className="text-sm font-semibold text-emerald-400 mb-2">Patient Details</h4>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-400">Name:</span>
                          <span className="text-white font-medium">{consultation.patientName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 ml-6">Phone:</span>
                          <span className="text-white">{consultation.patientPhone}</span>
                        </div>
                        {consultation.patientGender && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 ml-6">Gender:</span>
                            <span className="text-white capitalize">{consultation.patientGender}</span>
                          </div>
                        )}
                        {consultation.patientAge && consultation.patientAge > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 ml-6">Age:</span>
                            <span className="text-white">{consultation.patientAge}</span>
                          </div>
                        )}
                        {consultation.purpose && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 ml-6">Purpose:</span>
                            <span className="text-white">{consultation.purpose}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Appointment Details Section */}
                    <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
                      <h4 className="text-sm font-semibold text-emerald-400 mb-2">Appointment Details</h4>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-400">Doctor:</span>
                          <span className="text-white font-medium">{consultation.doctorName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 ml-6">Specialty:</span>
                          <span className="text-white">{consultation.doctorSpecialty}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-400">Date:</span>
                          <span className="text-white">{new Date(consultation.bookingDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        {consultation.bookingTime && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-400">Time:</span>
                            <span className="text-white">{consultation.bookingTime}</span>
                          </div>
                        )}
                        {consultation.chamberName && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-400">Location:</span>
                            <span className="text-white">{consultation.chamberName}</span>
                          </div>
                        )}
                        {consultation.serialNumber && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 ml-6">Serial #:</span>
                            <span className="text-white font-medium">#{consultation.serialNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Booking ID */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Booking ID:</span>
                      <code className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                        {consultation.bookingId}
                      </code>
                    </div>
                  </div>

                  {/* Action Buttons - Icons */}
                  <div className="flex md:flex-col gap-2">
                    {/* Download RX Button */}
                    {(() => {
                      const medicoLockerEnabled = localStorage.getItem('medico_locker_enabled') === 'true';
                      const hasRx = consultation.prescriptionImages && consultation.prescriptionImages.length > 0;
                      const isEnabled = medicoLockerEnabled && hasRx;

                      return (
                        <Button
                          onClick={() => isEnabled && downloadPrescription(consultation)}
                          disabled={!isEnabled}
                          className={`h-12 w-12 p-0 ${
                            isEnabled
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          }`}
                          title={
                            !medicoLockerEnabled
                              ? 'Enable Medico Locker to download prescriptions'
                              : !hasRx
                              ? 'No prescription available'
                              : 'Download prescription'
                          }
                        >
                          <Download className="h-5 w-5" />
                        </Button>
                      );
                    })()}

                    {/* Upload RX Button - Disabled for now */}
                    <Button
                      disabled={true}
                      className="h-12 w-12 p-0 bg-gray-800 text-gray-500 cursor-not-allowed"
                      title="Upload prescription (Coming soon - Patient can upload RX if doctor doesn't)"
                    >
                      <Upload className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
