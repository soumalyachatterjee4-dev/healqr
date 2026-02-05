import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Lightbulb, Star, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { t, type Language, languageDisplayNames } from '../utils/translations';
import BookingFlowLayout from './BookingFlowLayout';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import TemplateDisplay from './TemplateDisplay';

interface Chamber {
  id: number;
  chamberName: string;
  chamberAddress: string;
  startTime: string;
  endTime: string;
  isActive?: boolean;
  maxCapacity?: number;
}

interface ChamberWithBookingCount extends Chamber {
  bookedCount: number;
}

interface SelectChamberProps {
  onBack: () => void;
  onContinue: (chamberName: string, consultationType: 'chamber' | 'video') => void;
  language: Language;
  selectedDate: Date;
  onLanguageChange?: (language: Language) => void;
  hasVideoConsultation?: boolean; // Premium add-on
  chambers?: Chamber[]; // Chambers from Schedule Manager
  doctorName?: string;
  doctorSpecialty?: string;
  doctorPhoto?: string;
  doctorDegrees?: string[];
  useDrPrefix?: boolean;
}

export default function SelectChamber({
  onBack,
  onContinue,
  language,
  selectedDate,
  onLanguageChange,
  hasVideoConsultation = true, // Default true for demo
  chambers = [], // Empty array means use hardcoded demo chambers
  doctorName = '',
  doctorSpecialty = '',
  doctorPhoto = '',
  doctorDegrees = [],
  useDrPrefix = true,
}: SelectChamberProps) {
  console.log('🏥 SelectChamber received:', { doctorName, doctorSpecialty, chambersCount: chambers.length });
  
  const [selectedChamber, setSelectedChamber] = useState<ChamberWithBookingCount | null>(null);
  const [selectedChamberName, setSelectedChamberName] = useState<string>('');
  const [consultationType, setConsultationType] = useState<'chamber' | 'video'>('chamber');
  const [chambersWithCounts, setChambersWithCounts] = useState<ChamberWithBookingCount[]>([]);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh trigger

  // Refresh counts on mount (when user navigates back to this page)
  useEffect(() => {
    console.log('🔄 SelectChamber: Component mounted, refreshing booking counts...');
    setRefreshKey(prev => prev + 1);
  }, []); // Empty dependency - runs once on mount

  // Load booking counts for each chamber
  useEffect(() => {
    const loadBookingCounts = async () => {
      try {
        setLoadingCounts(true);
        const doctorId = sessionStorage.getItem('booking_doctor_id');
        if (!doctorId || chambers.length === 0) {
          setLoadingCounts(false);
          return;
        }

        const { db } = await import('../lib/firebase/config');
        if (!db) {
          setLoadingCounts(false);
          return;
        }

        const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');
        
        // Reload doctor data to get latest blockedDates
        const doctorRef = doc(db, 'doctors', doctorId);
        const doctorSnap = await getDoc(doctorRef);
        let chambersWithBlockedDates = chambers;
        
        if (doctorSnap.exists()) {
          const doctorData = doctorSnap.data();
          // Update chambers with blockedDates from Firestore
          chambersWithBlockedDates = chambers.map(chamber => {
            const firestoreChamber = doctorData.chambers?.find((c: any) => c.id === chamber.id);
            const blockedDates = firestoreChamber?.blockedDates || [];
            console.log(`🔄 SelectChamber: Loading chamber "${chamber.chamberName}" blockedDates:`, blockedDates);
            return {
              ...chamber,
              blockedDates
            };
          });
        }
        
        // Get selected date string (YYYY-MM-DD) - Use local timezone to match booking creation
        const selectedDateStr = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        
        console.log(`📅 SelectChamber: Loading bookings for date: ${selectedDateStr} (Local timezone)`);
        
        // Query bookings for each chamber (use chambersWithBlockedDates to get latest blocked status)
        const chambersWithBookingData = await Promise.all(
          chambersWithBlockedDates.map(async (chamber) => {
            try {
              const bookingsRef = collection(db, 'bookings');
              // Query by chamberId only to avoid composite index requirement
              const q = query(
                bookingsRef,
                where('chamberId', '==', chamber.id)
              );
              
              const snapshot = await getDocs(q);
              
              // Filter in JavaScript for date and non-cancelled status
              const allDocs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              
              const bookedCount = allDocs.filter((data: any) => {
                const isMatchingDate = data.appointmentDate === selectedDateStr;
                // Count ALL bookings (including cancelled) to match Dashboard logic
                // const isNotCancelled = data.status !== 'cancelled'; 
                return isMatchingDate;
              }).length;
              
              console.log(`📊 SelectChamber: "${chamber.chamberName}" (ID: ${chamber.id}): ${bookedCount}/${chamber.maxCapacity || 0} bookings (All Status) for ${selectedDateStr}`);
              console.log(`   Total docs for chamberId ${chamber.id}:`, allDocs.length);
              console.log(`   Matching date (${selectedDateStr}):`, allDocs.filter((d: any) => d.appointmentDate === selectedDateStr).length);
              console.log(`   Sample booking:`, allDocs[0]);
              
              // Convert start time to minutes for sorting
              const [startHour, startMin] = (chamber.startTime || '00:00').split(':').map(Number);
              const startMinutes = startHour * 60 + startMin;

              return {
                ...chamber,
                bookedCount,
                startMinutes, // For sorting
                blockedDates: (chamber as any).blockedDates || [] // Explicitly preserve blockedDates
              };
            } catch (error) {
              console.error(`❌ Error loading bookings for ${chamber.chamberName}:`, error);
              const [startHour, startMin] = (chamber.startTime || '00:00').split(':').map(Number);
              const startMinutes = startHour * 60 + startMin;
              return {
                ...chamber,
                bookedCount: 0,
                startMinutes, // For sorting
                blockedDates: (chamber as any).blockedDates || [] // Explicitly preserve blockedDates
              };
            }
          })
        );
        
        // Sort chambers by start time (earliest first)
        const sortedChambers = chambersWithBookingData.sort((a, b) => (a.startMinutes || 0) - (b.startMinutes || 0));
        
        setChambersWithCounts(sortedChambers);
      } catch (error) {
        console.error('❌ Error loading booking counts:', error);
      } finally {
        setLoadingCounts(false);
      }
    };

    loadBookingCounts();
  }, [chambers, selectedDate, refreshKey]); // Add refreshKey to dependency array

  // Force refresh booking counts when component becomes visible (user returns from booking)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 SelectChamber: Page became visible, refreshing booking counts...');
        setRefreshKey(prev => prev + 1); // Trigger refresh
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const formatDate = (date: Date | string) => {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return String(date); // Return as string if invalid
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <BookingFlowLayout
      onBack={onBack}
      doctorName={doctorName}
      doctorPhoto={doctorPhoto}
      doctorSpecialty={doctorSpecialty}
      doctorDegrees={doctorDegrees}
      useDrPrefix={useDrPrefix}
    >
      <div>
        {/* Title */}
        <div className="text-center mb-2">
          <h1 className="text-white mb-2">{t('selectChamber', language)}</h1>
          <p className="text-gray-400 text-sm mb-4">{t('choosePreferredLocation', language)}</p>
          
          {/* Selected Date Badge */}
          <div className="inline-block bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <p className="text-emerald-400 text-sm">{formatDate(selectedDate)}</p>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-[#1a1f2e] rounded-3xl p-6 shadow-2xl">

          {/* Health Tip Image */}
          <TemplateDisplay placement="booking-select-chamber" className="mb-6" />

          {/* Consultation Type Toggle - TEMPORARILY HIDDEN - Video consultation feature disabled */}
          {/* {hasVideoConsultation && (
            <div className="mb-6">
              <h3 className="text-white mb-3">Consultation Type</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConsultationType('chamber')}
                  className={`border-2 rounded-xl p-4 transition-all ${
                    consultationType === 'chamber'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      consultationType === 'chamber' ? 'bg-emerald-500' : 'bg-gray-700'
                    }`}>
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <span className={`text-sm font-medium ${
                      consultationType === 'chamber' ? 'text-emerald-400' : 'text-gray-400'
                    }`}>
                      Chamber Consultation
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => setConsultationType('video')}
                  className={`border-2 rounded-xl p-4 transition-all ${
                    consultationType === 'video'
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      consultationType === 'video' ? 'bg-red-500' : 'bg-gray-700'
                    }`}>
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className={`text-sm font-medium ${
                      consultationType === 'video' ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      Video Consultation
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )} */}

          {/* Available Chambers - ONLY show if chamber consultation is selected */}
          {consultationType === 'chamber' && (
            <>
              <h3 className="text-white mb-4">{t('availableChambers', language)}</h3>

          {/* Loading state */}
          {loadingCounts && chambers.length > 0 ? (
            <div className="text-center py-8 text-gray-400">Loading booking status...</div>
          ) : (
            <>
              {/* Dynamically render all chambers with booking counts */}
              {chambersWithCounts.length > 0 ? (
                chambersWithCounts
                  .map((chamber) => {
                    // Check if chamber end time has passed on selected date
                    let isExpired = false;
                    if (chamber.endTime && selectedDate) {
                      const [endHour, endMin] = chamber.endTime.split(':').map(Number);
                      const chamberEndTime = new Date(selectedDate);
                      chamberEndTime.setHours(endHour, endMin, 0, 0);
                      isExpired = chamberEndTime < new Date();
                    }
                    
                    // Check if selected date is blocked (use local timezone)
                    let isBlockedForDate = false;
                    if (selectedDate && (chamber as any).blockedDates) {
                      const selectedDateStr = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                      isBlockedForDate = (chamber as any).blockedDates.includes(selectedDateStr);
                      console.log(`🔍 Chamber "${chamber.chamberName}" blocked check:`, {
                        selectedDateStr,
                        blockedDates: (chamber as any).blockedDates,
                        isBlockedForDate
                      });
                    }
                    
                    return { ...chamber, isExpired, isBlockedForDate };
                  })
                  .sort((a, b) => {
                    // Expired chambers go to bottom
                    if (a.isExpired && !b.isExpired) return 1;
                    if (!a.isExpired && b.isExpired) return -1;
                    
                    // Both active or both expired: sort by start time ascending
                    return (a.startMinutes || 0) - (b.startMinutes || 0);
                  })
                  .map((chamber, index) => {
                  const capacity = chamber.maxCapacity || 0;
                  const booked = chamber.bookedCount || 0;
                  const isFull = booked >= capacity;
                  const percentageFull = capacity > 0 ? (booked / capacity) * 100 : 0;
                  const isExpired = chamber.isExpired;
                  const isBlockedForDate = (chamber as any).isBlockedForDate || false;
                  
                  // Determine status color
                  let statusColor = 'text-emerald-400';
                  if (percentageFull >= 100) statusColor = 'text-red-400';
                  else if (percentageFull >= 80) statusColor = 'text-yellow-400';
                  
                  return (
                    <button
                      key={chamber.id}
                      onClick={() => {
                        if (isBlockedForDate || isFull || isExpired) return;
                        setSelectedChamber(chamber);
                        setSelectedChamberName(chamber.chamberName);
                        // Save clinicId to sessionStorage for booking creation
                        if (chamber.clinicId) {
                          sessionStorage.setItem('booking_clinic_id', chamber.clinicId);
                          console.log('✅ Selected chamber:', chamber.chamberName, '| chamberId:', chamber.id, '| clinicId:', chamber.clinicId);
                        } else {
                          sessionStorage.removeItem('booking_clinic_id');
                          console.log('✅ Selected chamber:', chamber.chamberName, '| chamberId:', chamber.id, '| (Solo chamber)');
                        }
                      }}
                      disabled={isBlockedForDate || isFull || isExpired}
                      className={`w-full text-left border-2 rounded-2xl p-5 mb-3 transition-all ${
                        isBlockedForDate || isFull || isExpired
                          ? 'border-gray-800 bg-gray-900/50 opacity-50 cursor-not-allowed'
                          : selectedChamber?.id === chamber.id
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className={`${isBlockedForDate || isFull || isExpired ? 'text-gray-600' : 'text-white'}`}>
                          {chamber.chamberName}
                        </h4>
                        {isBlockedForDate ? (
                          <span className="text-xs text-red-400">(Unavailable)</span>
                        ) : !isExpired && (
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${statusColor}`}>
                              {booked}/{capacity}
                            </span>
                            {isFull && (
                              <Badge className="bg-red-500 text-white text-xs">FULL</Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{chamber.chamberAddress}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-400">{chamber.startTime} - {chamber.endTime}</p>
                        {isExpired && (
                          <Badge className="bg-red-600 text-white text-xs">CHAMBER TIME OVER</Badge>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <>
                  {/* Fallback demo chambers if no chambers data */}
                  <button
                onClick={() => setSelectedChamber('main')}
                className={`w-full text-left border-2 rounded-2xl p-5 mb-3 transition-all ${
                  selectedChamber === 'main'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                }`}
              >
                <h4 className="text-white mb-2">{t('mainChamber', language)}</h4>
                <p className="text-sm text-gray-400 mb-1">123 Medical Plaza, Room 101</p>
                <p className="text-sm text-gray-400">06:00 - 17:00</p>
              </button>
              <button
                onClick={() => setSelectedChamber('secondary')}
                className={`w-full text-left border-2 rounded-2xl p-5 mb-3 transition-all ${
                  selectedChamber === 'secondary'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                }`}
              >
                <h4 className="text-white mb-2">{t('secondaryChamber', language)}</h4>
                <p className="text-sm text-gray-400 mb-1">456 Health Center, Suite 205</p>
                <p className="text-sm text-gray-400">10:00 - 18:00</p>
              </button>
                </>
              )}
            </>
          )}

            </>
          )}

          {/* Video Consultation Message - ONLY show if video is selected */}
          {consultationType === 'video' && (
            <div className="mb-6">
              <div className="bg-red-500/10 border-2 border-red-500/30 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-white mb-2">Video Consultation Selected</h4>
                <p className="text-gray-300 text-sm mb-4">
                  You will receive an in-app notification 30 minutes before your appointment with the video consultation link.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>No physical visit required</span>
                </div>
              </div>
            </div>
          )}

          {/* Continue Button */}
          <Button
            onClick={() => {
              if (consultationType === 'video') {
                onContinue(chambers.length > 0 ? chambers[0].chamberName : 'Video Consultation', 'video');
              } else {
                selectedChamber && onContinue(selectedChamber.chamberName, 'chamber');
              }
              console.log('📤 Sending to parent:', { chamber: selectedChamber?.chamberName, chamberId: selectedChamber?.id, consultationType });
            }}
            disabled={consultationType === 'chamber' && !selectedChamber}
            className={`w-full h-12 rounded-xl ${
              (consultationType === 'video' || selectedChamber)
                ? consultationType === 'video'
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {consultationType === 'video' ? 'Continue to Patient Details' : t('continueToPatientDetails', language)}
          </Button>
        </div>
      </div>
    </BookingFlowLayout>
  );
}