import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Menu, Calendar, MapPin, Clock, ArrowLeft, User, Phone, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import DashboardSidebar from './DashboardSidebar';
import { decrypt } from '../utils/encryptionService';

interface AdvanceBookingProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
  activeAddOns?: string[];
}

interface Chamber {
  id: number;
  chamberName: string;
  chamberAddress: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  isActive?: boolean;
}

interface Booking {
  id: string;
  bookingId: string;
  patientName: string;
  whatsappNumber: string;
  age: number;
  gender: string;
  appointmentDate: string;
  chamber: string;
  chamberId: number;
  visitType?: string;
  consultationType?: string;
  status: string;
}

export default function AdvanceBooking({ onMenuChange, onLogout, activeAddOns = [] }: AdvanceBookingProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedChamberId, setSelectedChamberId] = useState<number | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState<number>(7);
  const [chamberBookingCounts, setChamberBookingCounts] = useState<Record<number, { booked: number; capacity: number }>>({});
  const [clinicSchedules, setClinicSchedules] = useState<Record<string, any>>({});
  const [clinicData, setClinicData] = useState<Record<string, any>>({});

  // Helper function to check if a clinic is off on a given date
  const isClinicOffForChamber = (chamberAddress: string, checkDate: string): boolean => {
    if (!checkDate) {
      console.log('⚠️ isClinicOffForChamber: No checkDate provided');
      return false;
    }

    console.log('🔍 Checking if chamber is off:', {
      chamberAddress,
      checkDate,
      clinicSchedulesCount: Object.keys(clinicSchedules).length,
      clinicDataCount: Object.keys(clinicData).length
    });

    // Find if this chamber belongs to any clinic by matching addresses
    for (const [clinicId, schedule] of Object.entries(clinicSchedules)) {
      const clinic = clinicData[clinicId];
      if (!clinic) {
        console.log('⚠️ No clinic data found for clinic ID:', clinicId);
        continue;
      }
      
      const clinicAddress = clinic.address || '';
      
      // Check if chamber address matches clinic address
      const chamberLower = chamberAddress.toLowerCase();
      const clinicLower = clinicAddress.toLowerCase();
      const isMatch = chamberLower.includes(clinicLower) || clinicLower.includes(chamberLower);
      
      console.log('🏥 Checking clinic:', {
        clinicId,
        clinicName: clinic.clinicName,
        clinicAddress,
        chamberAddress,
        addressMatch: isMatch
      });
      
      if (isMatch) {
        const plannedOffPeriods = schedule?.plannedOffPeriods || [];
        console.log('📋 Planned off periods for matched clinic:', plannedOffPeriods);
        
        // Check if date falls within any planned off period
        // CRITICAL: Only apply clinic planned off for THIS specific clinic
        for (const period of plannedOffPeriods) {
          // Check status field (not isActive)
          if (period.status !== 'active') {
            console.log('⏭️ Skipping inactive period:', period);
            continue;
          }
          
          // CRITICAL: Handle clinic planned off filtering
          if (period.appliesTo === 'clinic') {
            // If period has clinicId, only block if it matches this clinic
            if (period.clinicId && period.clinicId !== clinicId) {
              console.log('⏭️ Skipping clinic planned off from different clinic:', {
                periodClinicId: period.clinicId,
                currentClinicId: clinicId
              });
              continue;
            }
            // If period has NO clinicId (legacy), apply to this clinic anyway
            // (These are old periods created before clinicId tracking was added)
            console.log('✅ Applying clinic planned off (legacy or matching):', {
              periodClinicId: period.clinicId || 'LEGACY',
              currentClinicId: clinicId,
              hasClinicId: !!period.clinicId
            });
          }
          
          const start = new Date(period.startDate);
          const end = new Date(period.endDate);
          const check = new Date(checkDate);
          
          console.log('📅 Comparing dates:', {
            checkDate: check.toDateString(),
            periodStart: start.toDateString(),
            periodEnd: end.toDateString(),
            isInRange: check >= start && check <= end,
            appliesTo: period.appliesTo
          });
          
          if (check >= start && check <= end) {
            console.log('🚫🚫🚫 Chamber IS OFF (clinic off):', {
              chamberAddress,
              clinicId,
              clinicName: clinic.clinicName,
              period: `${period.startDate} to ${period.endDate}`,
              reason: period.reason,
              appliesTo: period.appliesTo
            });
            return true;
          }
        }
      }
    }
    
    console.log('✅ Chamber is AVAILABLE (clinic open)');
    return false;
  };

  // Load doctor's chambers and max advance days
  useEffect(() => {
    const loadDoctorData = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const { db } = await import('../lib/firebase/config');
        const { doc, getDoc } = await import('firebase/firestore');

        const doctorRef = doc(db, 'doctors', userId);
        const doctorSnap = await getDoc(doctorRef);

        if (doctorSnap.exists()) {
          const doctorData = doctorSnap.data();
          setChambers(doctorData.chambers || []);
          const advanceDays = doctorData.maxAdvanceBookingDays || 30;
          console.log('📅 AdvanceBooking: Loading max advance days:', {
            fromFirestore: doctorData.maxAdvanceBookingDays,
            using: advanceDays
          });
          setMaxAdvanceDays(advanceDays);
          
          // Load clinic schedules for linked clinics
          const linkedClinics = doctorData.linkedClinics || [];
          console.log('🏥 Doctor QR Flow: Loading clinic schedules for', linkedClinics.length, 'linked clinics');
          
          const schedules: Record<string, any> = {};
          const clinics: Record<string, any> = {};
          
          for (const clinicLink of linkedClinics) {
            const clinicId = clinicLink.clinicId || clinicLink.id;
            if (!clinicId) continue;

            try {
              // Load clinic data
              const clinicRef = doc(db, 'clinics', clinicId);
              const clinicSnap = await getDoc(clinicRef);
              
              if (clinicSnap.exists()) {
                clinics[clinicId] = clinicSnap.data();
                console.log('✅ Loaded clinic data for', clinicId, clinics[clinicId].clinicName);
              }
              
              // Load clinic schedule
              const clinicScheduleRef = doc(db, 'clinicSchedules', clinicId);
              const clinicScheduleSnap = await getDoc(clinicScheduleRef);
              
              if (clinicScheduleSnap.exists()) {
                const scheduleData = clinicScheduleSnap.data();
                schedules[clinicId] = scheduleData;
                console.log('✅ Loaded clinic schedule for', clinicId, scheduleData);
              } else {
                console.log('⚠️ No schedule found for clinic', clinicId);
              }
            } catch (err) {
              console.error('❌ Error loading clinic data/schedule for', clinicId, err);
            }
          }
          
          setClinicSchedules(schedules);
          setClinicData(clinics);
          
          // Set today as default selected date
          const today = new Date();
          const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
          setSelectedDate(todayStr);
        }
      } catch (error) {
        // Error loading doctor data
      }
    };

    loadDoctorData();
  }, []);

  // Load booking counts when date changes
  useEffect(() => {
    if (!selectedDate || chambers.length === 0) return;

    const loadBookingCounts = async () => {
      try {
        const userId = localStorage.getItem('userId');
        const userEmail = localStorage.getItem('userEmail');
        if (!userId) return;

        console.log('🔢 Loading booking counts:', {
          userId,
          userEmail,
          selectedDate,
          chambersCount: chambers.length
        });

        const { db } = await import('../lib/firebase/config');
        const { collection, query, where, getDocs } = await import('firebase/firestore');

        const counts: Record<number, { booked: number; capacity: number }> = {};

        for (const chamber of chambers) {
          const bookingsRef = collection(db, 'bookings');
          
          // Query by doctorId (Firebase UID)
          const qWithDoctor = query(
            bookingsRef,
            where('doctorId', '==', userId),
            where('chamberId', '==', chamber.id),
            where('appointmentDate', '==', selectedDate)
          );
          const snapshot = await getDocs(qWithDoctor);
          
          // Count non-cancelled bookings
          const bookedCount = snapshot.docs.filter(doc => 
            doc.data().status !== 'cancelled'
          ).length;

          counts[chamber.id] = {
            booked: bookedCount,
            capacity: chamber.maxCapacity || 0
          };
        }

        setChamberBookingCounts(counts);
      } catch (error) {
        // Error loading booking counts
      }
    };

    loadBookingCounts();
  }, [selectedDate, chambers]);

  // Load bookings when chamber is selected
  useEffect(() => {
    console.log('🎬 loadBookings useEffect triggered:', { selectedDate, selectedChamberId });
    
    if (!selectedDate || selectedChamberId === null) {
      console.log('⏹️ Early return:', { hasDate: !!selectedDate, hasChamber: selectedChamberId !== null });
      setBookings([]);
      return;
    }

    const loadBookings = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem('userId');
        if (!userId) {
          console.log('❌ No userId found');
          return;
        }

        console.log('🔍 Loading bookings:', { userId, chamberId: selectedChamberId, date: selectedDate });

        const { db } = await import('../lib/firebase/config');
        const { collection, query, where, getDocs } = await import('firebase/firestore');

        // 🔒 PATIENT DATA ACCESS CONTROL: Build list of clinic IDs from restricted clinics
        let restrictedClinicIds: string[] = [];
        try {
          const clinicsRef = collection(db, 'clinics');
          const allClinicsSnap = await getDocs(clinicsRef);
          
          allClinicsSnap.forEach((clinicDoc) => {
            const clinicData = clinicDoc.data();
            const linkedDoctors = clinicData.linkedDoctorsDetails || [];
            
            // Check if current doctor is linked to this clinic with restricted access
            const isRestricted = linkedDoctors.some((d: any) => 
              d.doctorId === userId && d.restrictPatientDataAccess === true
            );
            
            if (isRestricted) {
              restrictedClinicIds.push(clinicDoc.id);
            }
          });

          if (restrictedClinicIds.length > 0) {
            console.log('🔒 Restricted clinics for advance booking:', restrictedClinicIds);
          }
        } catch (error) {
          console.error('Error checking clinic access restrictions:', error);
        }

        const bookingsRef = collection(db, 'bookings');
        
        // TEMPORARILY force fallback to debug
        let snapshot;
        console.log('🔧 Using fallback query to debug');
        const qFallback = query(
          bookingsRef,
          where('chamberId', '==', selectedChamberId),
          where('appointmentDate', '==', selectedDate)
        );
        snapshot = await getDocs(qFallback);
        console.log(`📋 Fallback query returned ${snapshot.docs.length} documents`);
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`  - Doc ${doc.id}: doctorId="${data.doctorId}", appointmentDate="${data.appointmentDate}", status="${data.status}"`);
        });

        const bookingsList: Booking[] = [];
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          
          console.log(`📄 Doc ${doc.id}:`, { doctorId: data.doctorId, status: data.status });
          
          // Filter by doctorId (in case we used fallback query) and exclude cancelled
          if (data.doctorId === userId && data.status !== 'cancelled') {
            // 🔒 PATIENT DATA ACCESS CONTROL: Check if booking is from restricted clinic
            const bookingClinicId = data.clinicId;
            if (bookingClinicId && restrictedClinicIds.includes(bookingClinicId)) {
              console.log('🔒 Filtered out booking from restricted clinic:', { 
                bookingId: doc.id, 
                clinicId: bookingClinicId 
              });
              return; // Skip this booking
            }

            // Store both encrypted and plain fields - decryption happens during display
            const bookingData: any = {
              id: doc.id,
              bookingId: data.bookingId || doc.id,
              patientName: data.patientName || 'N/A',
              whatsappNumber: data.whatsappNumber || data.phone || 'N/A',
              age: data.age || 0,
              gender: (data.gender || 'MALE').toUpperCase(),
              appointmentDate: data.appointmentDate,
              chamber: data.chamber || 'N/A',
              chamberId: data.chamberId,
              visitType: data.purposeOfVisit || data.visitType || (data.consultationType === 'video' ? 'Video Consultation' : 'In-Person'),
              consultationType: data.consultationType || 'chamber',
              status: data.status || 'confirmed'
            };
            
            // Preserve encrypted fields for decryption
            if (data.patientName_encrypted) bookingData.patientName_encrypted = data.patientName_encrypted;
            if (data.whatsappNumber_encrypted) bookingData.whatsappNumber_encrypted = data.whatsappNumber_encrypted;
            if (data.age_encrypted) bookingData.age_encrypted = data.age_encrypted;
            if (data.gender_encrypted) bookingData.gender_encrypted = data.gender_encrypted;
            
            bookingsList.push(bookingData);
          }
        });
        console.log(`🎯 Final bookings: ${bookingsList.length} total`);
        setBookings(bookingsList);
      } catch (error) {
        console.error('❌ Error loading bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [selectedDate, selectedChamberId]);

  // Get min and max dates for calendar
  const getDateLimits = () => {
    const today = new Date();
    const minDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + maxAdvanceDays);
    const maxDateStr = new Date(maxDate.getTime() - maxDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    return { minDate, maxDate: maxDateStr };
  };

  const { minDate, maxDate } = getDateLimits();

  const selectedChamber = chambers.find(c => c.id === selectedChamberId);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Sidebar */}
      <DashboardSidebar
        activeMenu="advance-booking"
        onMenuChange={onMenuChange || (() => {})}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeAddOns={activeAddOns}
      />

      {/* Main Content */}
      <div className="lg:ml-64">{/* Always add margin on desktop to account for fixed sidebar */}
        {/* Header */}
        <div className="bg-[#0f1419] border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-400 hover:text-white"
              >
                <Menu className="h-6 w-6" />
              </Button>
              <h1 className="text-xl font-semibold text-white">Advance Booking</h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-w-7xl mx-auto">
          {/* Filters Section */}
          <Card className="bg-gray-800/50 border-gray-700 p-6 mb-6">
            <h2 className="text-white text-lg font-semibold mb-4">Filters</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Filter */}
              <div className="space-y-2">
                <label className="text-gray-300 text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedChamberId(null); // Reset chamber selection
                  }}
                  min={minDate}
                  max={maxDate}
                  className="w-full bg-[#0f1419] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-xs text-gray-400">
                  Maximum {maxAdvanceDays} days in advance
                </p>
              </div>

              {/* Chamber Filter */}
              <div className="space-y-2">
                <label className="text-gray-300 text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Select Chamber
                </label>
                <select
                  value={selectedChamberId || ''}
                  onChange={(e) => {
                    const chamberIdValue = e.target.value ? Number(e.target.value) : null;
                    console.log('🏥 Chamber selected:', { raw: e.target.value, parsed: chamberIdValue });
                    setSelectedChamberId(chamberIdValue);
                  }}
                  className="w-full bg-[#0f1419] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  disabled={!selectedDate}
                >
                  <option value="">Choose a chamber</option>
                  {chambers.filter(c => c.isActive !== false).map(chamber => {
                    const count = chamberBookingCounts[chamber.id];
                    const statusText = count ? `${count.booked}/${count.capacity}` : '0/0';
                    const isClinicOff = isClinicOffForChamber(chamber.chamberAddress, selectedDate);
                    const displayText = isClinicOff 
                      ? `${chamber.chamberName} - Clinic Closed`
                      : `${chamber.chamberName} (${statusText})`;
                    
                    return (
                      <option 
                        key={chamber.id} 
                        value={chamber.id}
                        disabled={isClinicOff}
                        style={isClinicOff ? { color: '#888', fontStyle: 'italic' } : {}}
                      >
                        {displayText}
                      </option>
                    );
                  })}
                </select>
                {!selectedDate && (
                  <p className="text-xs text-yellow-400">
                    Please select a date first
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Selected Chamber Info */}
          {selectedChamber && (
            <Card className="bg-gray-800/50 border-gray-700 p-6 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-white text-lg font-semibold mb-3">{selectedChamber.chamberName}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-300">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{selectedChamber.chamberAddress}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{selectedChamber.startTime} - {selectedChamber.endTime}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-emerald-400">
                    {chamberBookingCounts[selectedChamber.id]?.booked || 0}/{chamberBookingCounts[selectedChamber.id]?.capacity || 0}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">Bookings</p>
                </div>
              </div>
            </Card>
          )}

          {/* Patients List */}
          {selectedChamberId && (
            <Card className="bg-gray-800/50 border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-lg font-semibold">Patient Details</h3>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  {bookings.length} Patient{bookings.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              {loading ? (
                <div className="text-center py-12 text-gray-400">
                  Loading bookings...
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-12">
                  <Eye className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No bookings found for this date and chamber</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((booking, index) => (
                    <div
                      key={booking.id}
                      className="bg-[#0f1419] border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          {/* Patient Name & Booking ID */}
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="text-white font-medium">{decrypt((booking as any).patientName_encrypted || booking.patientName)}</h4>
                              <p className="text-xs text-gray-400">ID: {booking.bookingId}</p>
                            </div>
                          </div>

                          {/* Patient Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 ml-11">
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-300">{decrypt((booking as any).whatsappNumber_encrypted || booking.whatsappNumber)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-300">
                                {(() => {
                                  const ageDecrypted = decrypt((booking as any).age_encrypted || '');
                                  const ageValue = ageDecrypted || booking.age?.toString() || '0';
                                  const parsedAge = parseInt(ageValue);
                                  const displayAge = isNaN(parsedAge) || parsedAge === 0 ? 'Age N/A' : `${parsedAge} years`;
                                  return displayAge;
                                })()} • {decrypt((booking as any).gender_encrypted || booking.gender)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Eye className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-300">{booking.visitType}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Badge className={`${
                                booking.consultationType === 'video' 
                                  ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              }`}>
                                {booking.consultationType === 'video' ? 'Video' : 'Chamber'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 capitalize">
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Empty State */}
          {!selectedChamberId && selectedDate && (
            <Card className="bg-gray-800/50 border-gray-700 p-12">
              <div className="text-center">
                <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-white text-lg font-semibold mb-2">Select a Chamber</h3>
                <p className="text-gray-400">Choose a chamber from the filter above to view bookings</p>
              </div>
            </Card>
          )}

          {!selectedDate && (
            <Card className="bg-gray-800/50 border-gray-700 p-12">
              <div className="text-center">
                <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-white text-lg font-semibold mb-2">Get Started</h3>
                <p className="text-gray-400">Select a date and chamber to view advance bookings</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
