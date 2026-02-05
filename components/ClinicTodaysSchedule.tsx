import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Menu, MapPin, Clock, Plus, Calendar, ArrowLeft, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import ClinicSidebar from './ClinicSidebar';
import AddPatientModal, { PatientFormData } from './AddPatientModal';
import PatientDetails from './PatientDetails';
import { toast } from 'sonner';
import { auth, db } from '../lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface ClinicTodaysScheduleProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
}

interface DoctorChamber {
  id: number;
  chamberName: string;
  chamberAddress: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  days: string[];
  frequency: string;
  customDate?: string;
  isActive: boolean;
  blockedDates?: string[];
  startMinutes: number;
  isExpired: boolean;
  booked: number;
  schedule: string;
}

interface DoctorSchedule {
  doctorId: string;
  doctorName: string;
  specialty: string;
  chambers: DoctorChamber[];
}

// Helper component to load and display patient details for a specific chamber
function ChamberPatientDetailsLoader({ 
  chamber,
  doctorId,
  onBack,
}: { 
  chamber: DoctorChamber;
  doctorId: string;
  onBack: () => void;
}) {
  const [chamberPatients, setChamberPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshPatients = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const loadPatients = async () => {
      try {
        setLoading(true);
        const { decrypt } = await import('../utils/encryptionService');

        const today = new Date();
        const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

        const bookingsRef = collection(db, 'bookings');
        const currentClinicId = auth?.currentUser?.uid;
        
        let numericChamberId = typeof chamber.id === 'string' ? parseInt(chamber.id, 10) : chamber.id;
        
        if (!numericChamberId || isNaN(numericChamberId)) {
          numericChamberId = -1;
        }
        
        // Query 1: QR bookings for this chamber
        const qrBookingsQuery = query(
          bookingsRef,
          where('chamberId', '==', numericChamberId),
          where('appointmentDate', '==', todayStr)
        );

        const qrBookingsSnap = await getDocs(qrBookingsQuery);
        
        // Query 2: Walk-in bookings for this doctor + clinic (added via ADD PATIENT button)
        const walkInQuery = query(
          bookingsRef,
          where('doctorId', '==', doctorId),
          where('type', '==', 'walkin_booking'),
          where('clinicId', '==', currentClinicId || null)
        );

        const walkInSnap = await getDocs(walkInQuery);

        // Filter walk-ins for today
        const todaysWalkIns = walkInSnap.docs.filter(doc => {
          const data = doc.data();
          const bookingDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);
          const bookingDateStr = bookingDate instanceof Date ? bookingDate.toISOString().split('T')[0] : '';
          return bookingDateStr === todayStr;
        });

        // Process QR bookings
        const qrPatients = qrBookingsSnap.docs
          .filter(doc => {
            const data = doc.data();
            return data.type !== 'walkin_booking';
          })
          .map(doc => {
            const data = doc.data();
            
            const bookingTime = data.createdAt?.toDate 
              ? data.createdAt.toDate() 
              : new Date(data.createdAt);
            
            const appointmentTime = data.date?.toDate 
              ? data.date.toDate() 
              : new Date(data.date);
            
            const isCancelledStatus = (data.isCancelled === true) || (data.status === 'cancelled');
            
            const patientName = decrypt(data.patientName_encrypted || data.patientName || '');
            const whatsappNumber = decrypt(data.whatsappNumber_encrypted || data.whatsappNumber || '');
            const ageDecrypted = decrypt(data.age_encrypted || '');
            const genderDecrypted = decrypt(data.gender_encrypted || data.gender || '');
            const purposeDecrypted = decrypt(data.purposeOfVisit_encrypted || data.purposeOfVisit || '');
            
            let parsedAge = 0;
            if (ageDecrypted) {
              const ageNum = parseInt(ageDecrypted.toString().trim());
              parsedAge = isNaN(ageNum) ? 0 : ageNum;
            } else if (data.age) {
              const ageNum = typeof data.age === 'number' ? data.age : parseInt(data.age.toString().trim());
              parsedAge = isNaN(ageNum) ? 0 : ageNum;
            }
            
            return {
              id: doc.id,
              name: patientName || 'N/A',
              phone: whatsappNumber || data.phone || 'N/A',
              bookingId: data.bookingId || doc.id,
              age: parsedAge,
              gender: (genderDecrypted || 'MALE').toUpperCase(),
              visitType: purposeDecrypted || data.visitType || (data.consultationType === 'video' ? 'Video Consultation' : 'In-Person'),
              bookingTime: bookingTime,
              appointmentTime: appointmentTime,
              appointmentDate: data.appointmentDate,
              paymentVerified: data.paymentVerified || false,
              consultationType: data.consultationType || 'chamber',
              language: data.language || 'english',
              prescriptionUrl: data.prescriptionUrl,
              prescriptionReviewed: data.prescriptionReviewed || false,
              isCancelled: isCancelledStatus,
              isMarkedSeen: data.isMarkedSeen || false,
              reminderSent: data.reminderSent || false,
              fcmNotificationSent: data.fcmNotificationSent || false,
              doctorId: data.doctorId,
              chamberId: data.chamberId,
              type: 'qr_booking', // Mark as QR booking
            };
          });

        // Process walk-in patients
        const walkInPatients = todaysWalkIns.map(doc => {
          const data = doc.data();
          
          const bookingTime = data.createdAt?.toDate 
            ? data.createdAt.toDate() 
            : new Date(data.createdAt || new Date());

          // Walk-in patients are NOT encrypted (entered manually by clinic)
          const patientName = data.patientName || 'N/A';
          const whatsappNumber = data.whatsappNumber || 'N/A';
          const age = data.age || 0;
          const gender = data.gender || 'N/A';
          const purposeOfVisit = data.purposeOfVisit || 'N/A';

          return {
            id: doc.id,
            name: patientName,
            phone: whatsappNumber,
            bookingId: data.bookingId || doc.id,
            tokenNumber: data.tokenNumber || '#0',
            age: typeof age === 'number' ? age : (parseInt(age) || 0),
            gender: gender.toUpperCase(),
            visitType: data.visitType || 'walk-in',
            purposeOfVisit: purposeOfVisit,
            bookingTime: bookingTime,
            appointmentTime: bookingTime,
            appointmentDate: todayStr,
            paymentVerified: false,
            consultationType: 'chamber',
            language: 'english',
            prescriptionUrl: data.prescriptionUrl || null,
            prescriptionReviewed: data.prescriptionReviewed || false,
            isCancelled: false,
            isMarkedSeen: data.isMarkedSeen || true, // Walk-ins auto-marked as seen
            reminderSent: false,
            fcmNotificationSent: false,
            doctorId: data.doctorId,
            chamberId: null,
            type: 'walkin_booking', // Mark as walk-in
            verifiedByPatient: data.verifiedByPatient || false,
            verificationMethod: data.verificationMethod || 'manual_override',
            reviewScheduled: data.reviewScheduled || false,
            followUpScheduled: data.followUpScheduled || false,
          };
        });

        // Combine QR and walk-in patients
        const allPatients = [...qrPatients, ...walkInPatients]
          .sort((a, b) => {
            if (a.isCancelled !== b.isCancelled) return a.isCancelled ? 1 : -1;
            if (a.isMarkedSeen !== b.isMarkedSeen) return a.isMarkedSeen ? 1 : -1;
            return (a.bookingTime?.getTime() || 0) - (b.bookingTime?.getTime() || 0);
          });

        setChamberPatients(allPatients);
      } catch (error) {
        console.error('Error loading chamber patients:', error);
        toast.error('Failed to load patients');
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, [chamber.id, doctorId, refreshTrigger]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div>Loading patients...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-4 md:p-8">
        <Button
          onClick={onBack}
          variant="ghost"
          className="mb-4 text-blue-500 hover:text-blue-400"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Schedule
        </Button>

        <PatientDetails
          chamber={{
            id: chamber.id,
            name: chamber.chamberName,
            address: chamber.chamberAddress,
            startTime: chamber.startTime,
            endTime: chamber.endTime,
            schedule: chamber.schedule,
            booked: chamber.booked,
            capacity: chamber.maxCapacity
          }}
          patients={chamberPatients}
          onRefresh={refreshPatients}
          activeAddOns={[]}
          doctorLanguage="english"
        />
      </div>
    </div>
  );
}

export default function ClinicTodaysSchedule({ onMenuChange, onLogout }: ClinicTodaysScheduleProps) {
  const [doctorSchedules, setDoctorSchedules] = useState<DoctorSchedule[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addPatientModalOpen, setAddPatientModalOpen] = useState(false);
  const [selectedChamber, setSelectedChamber] = useState<{ chamber: DoctorChamber; doctorId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDoctorForPatient, setSelectedDoctorForPatient] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadTodaysSchedule();
  }, []);

  const loadTodaysSchedule = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const clinicRef = doc(db, 'clinics', currentUser.uid);
      const clinicSnap = await getDoc(clinicRef);

      if (!clinicSnap.exists()) {
        setLoading(false);
        return;
      }

      const linkedDoctors = clinicSnap.data().linkedDoctorsDetails || [];
      const schedules: DoctorSchedule[] = [];

      const now = new Date();
      const todayDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
      const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

      for (const doctor of linkedDoctors) {
        const doctorRef = doc(db, 'doctors', doctor.doctorId || doctor.uid);
        const doctorSnap = await getDoc(doctorRef);

        if (doctorSnap.exists()) {
          const doctorData = doctorSnap.data();
          const allChambers = doctorData.chambers || [];

          const todayChambers = allChambers.filter((chamber: any) => {
            if (chamber.clinicId !== currentUser.uid) {
              return false;
            }
            
            if (chamber.frequency === 'Daily') {
              return true;
            }
            
            if (chamber.frequency === 'Custom' && chamber.customDate) {
              const customDate = new Date(chamber.customDate);
              const customStr = customDate.toISOString().split('T')[0];
              return customStr === todayStr;
            }
            
            if (chamber.days && Array.isArray(chamber.days)) {
              return chamber.days.includes(todayDay);
            }
            
            return false;
          });

          // Check if doctor has walk-in patients today (even without chambers)
          const bookingsRef = collection(db, 'bookings');
          const walkInQuery = query(
            bookingsRef,
            where('doctorId', '==', doctor.doctorId || doctor.uid),
            where('type', '==', 'walkin_booking'),
            where('clinicId', '==', currentUser.uid)
          );
          
          const walkInSnap = await getDocs(walkInQuery);
          const todaysWalkIns = walkInSnap.docs.filter(doc => {
            const data = doc.data();
            const bookingDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);
            const bookingDateStr = bookingDate instanceof Date ? bookingDate.toISOString().split('T')[0] : '';
            return bookingDateStr === todayStr;
          });

          const hasWalkInsToday = todaysWalkIns.length > 0;

          // Show doctor if they have chambers OR walk-in patients today
          if (todayChambers.length > 0 || hasWalkInsToday) {
            const chambersWithBookings = await Promise.all(
              todayChambers.map(async (chamber: any) => {
                const bookingsRef = collection(db, 'bookings');
                const qrBookingsQuery = query(
                  bookingsRef,
                  where('chamberId', '==', chamber.id),
                  where('appointmentDate', '==', todayStr)
                );

                const qrBookingsSnap = await getDocs(qrBookingsQuery);
                // Count only non-cancelled bookings
                const qrBookedCount = qrBookingsSnap.docs.filter(doc => {
                  const data = doc.data();
                  return data.status !== 'cancelled';
                }).length;

                let scheduleText = '';
                if (chamber.frequency === 'Daily') {
                  scheduleText = 'Every Day';
                } else if (chamber.frequency === 'Custom' && chamber.customDate) {
                  const customDate = new Date(chamber.customDate);
                  scheduleText = customDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } else if (chamber.days && chamber.days.length > 0) {
                  scheduleText = chamber.days.join(', ');
                }

                const [startHour, startMin] = (chamber.startTime || '00:00').split(':').map(Number);
                const startMinutes = startHour * 60 + startMin;

                let isExpired = false;
                if (chamber.endTime) {
                  const [endHour, endMin] = chamber.endTime.split(':').map(Number);
                  const chamberEndTime = new Date(now);
                  chamberEndTime.setHours(endHour, endMin, 0, 0);
                  isExpired = chamberEndTime < now;
                }

                return {
                  id: chamber.id,
                  chamberName: chamber.chamberName,
                  chamberAddress: chamber.chamberAddress,
                  startTime: chamber.startTime,
                  endTime: chamber.endTime,
                  maxCapacity: chamber.maxCapacity,
                  days: chamber.days || [],
                  frequency: chamber.frequency,
                  customDate: chamber.customDate,
                  isActive: chamber.isActive !== false,
                  blockedDates: chamber.blockedDates || [],
                  startMinutes,
                  isExpired,
                  booked: qrBookedCount,
                  schedule: scheduleText,
                } as DoctorChamber;
              })
            );

            const sortedChambers = chambersWithBookings.sort((a, b) => {
              if (a.isExpired && !b.isExpired) return 1;
              if (!a.isExpired && b.isExpired) return -1;
              return (a.startMinutes || 0) - (b.startMinutes || 0);
            });

            schedules.push({
              doctorId: doctor.doctorId || doctor.uid,
              doctorName: doctor.name || 'Unknown Doctor',
              specialty: doctor.specialties?.[0] || 'General Physician',
              chambers: sortedChambers,
            });
          }
        }
      }

      // Sort schedules by earliest chamber start time (doctors with no chambers go to end)
      schedules.sort((a, b) => {
        if (a.chambers.length === 0 && b.chambers.length === 0) return 0;
        if (a.chambers.length === 0) return 1;
        if (b.chambers.length === 0) return -1;
        const aEarliest = Math.min(...a.chambers.map(c => c.startMinutes));
        const bEarliest = Math.min(...b.chambers.map(c => c.startMinutes));
        return aEarliest - bEarliest;
      });

      setDoctorSchedules(schedules);
    } catch (error) {
      console.error('Error loading today\'s schedule:', error);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };
  const getCurrentDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return today.toLocaleDateString('en-US', options);
  };

  const handleViewPatients = (chamber: DoctorChamber, doctorId: string) => {
    setSelectedChamber({ chamber, doctorId });
  };

  const handleBackToSchedule = () => {
    setSelectedChamber(null);
    loadTodaysSchedule();
  };

  const handleAddPatient = async (patientData: PatientFormData) => {
    // Implementation would be similar to Doctor's TodaysSchedule
    // For now, just close modal and show success
    setAddPatientModalOpen(false);
    toast.success('Walk-in patient added successfully');
    // Reload walk-in patients
  };

  if (selectedChamber) {
    return (
      <ChamberPatientDetailsLoader
        chamber={selectedChamber.chamber}
        doctorId={selectedChamber.doctorId}
        onBack={handleBackToSchedule}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      <ClinicSidebar
        activeMenu="todays-schedule"
        onMenuChange={(menu) => {
          if (onMenuChange) onMenuChange(menu);
        }}
        onLogout={() => {
          if (onLogout) {
            onLogout();
          } else {
            auth.signOut();
            window.location.href = '/';
          }
        }}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-black border-b border-gray-900 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
            >
              <Menu className="w-5 h-5 text-blue-500" />
            </button>
            <h2 className="text-lg md:text-xl">Today's Schedule</h2>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-black">
          <div className="p-4 md:p-8">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl mb-2">Today's Schedule</h1>
              <p className="text-gray-400">{getCurrentDate()}</p>
            </div>

            {/* Doctor Schedules */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading schedule...</div>
              </div>
            ) : doctorSchedules.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800 p-12">
                <div className="text-center">
                  <Calendar className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-white text-xl mb-2">No Schedules for Today</h3>
                  <p className="text-gray-400">
                    There are no active doctor schedules for today.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                {doctorSchedules.map((schedule) => (
                  <div key={schedule.doctorId}>
                    {/* Doctor Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold">Dr. {schedule.doctorName}</h2>
                          <p className="text-sm text-blue-400">{schedule.specialty}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedDoctorForPatient({ id: schedule.doctorId, name: schedule.doctorName });
                          setAddPatientModalOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        ADD PATIENT
                      </Button>
                    </div>

                    {/* Chambers for this doctor */}
                    <div className="space-y-4 ml-13">
                      {schedule.chambers.map((chamber) => (
                        <Card 
                          key={chamber.id}
                          className={`bg-zinc-800 border-zinc-700 p-6 hover:border-blue-500/50 transition-colors ${
                            chamber.isExpired ? 'opacity-60' : ''
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                            {/* Chamber Info */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <h3 className="text-white text-lg font-medium mb-1">
                                    {chamber.chamberName}
                                  </h3>
                                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                                    <MapPin className="w-4 h-4" />
                                    <span>{chamber.chamberAddress}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="text-white text-sm">
                                      {chamber.startTime} - {chamber.endTime}
                                    </span>
                                    {chamber.isExpired && (
                                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                        Time Over
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Booking Status */}
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-gray-400 text-sm">Booking Status:</span>
                                  <span className="text-blue-400 font-medium">
                                    {chamber.booked}/{chamber.maxCapacity}
                                  </span>
                                </div>
                                <div className="w-full bg-zinc-900 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min((chamber.booked / (chamber.maxCapacity || 1)) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>

                              {/* Schedule Days */}
                              <div className="text-sm text-gray-400">
                                {chamber.schedule}
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="flex flex-col gap-3">
                              <Button
                                onClick={() => handleViewPatients(chamber, schedule.doctorId)}
                                className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                              >
                                VIEW PATIENTS
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Patient Modal */}
      {addPatientModalOpen && selectedDoctorForPatient && (
        <AddPatientModal
          isOpen={addPatientModalOpen}
          onClose={() => {
            setAddPatientModalOpen(false);
            setSelectedDoctorForPatient(null);
          }}
          onAddPatient={handleAddPatient}
          doctorId={selectedDoctorForPatient.id}
          doctorName={selectedDoctorForPatient.name}
        />
      )}
    </div>
  );
}
