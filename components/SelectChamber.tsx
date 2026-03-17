import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import type { Language } from '../utils/translations';



// Convert slug like "general_medicine" to "General Medicine"
function formatSpecialty(slug: string): string {
  if (!slug) return '';
  return slug
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
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
  clinicId?: string;
  manualClinicId?: string;
}

interface ChamberWithBookingCount extends Chamber {
  bookedCount: number;
}

interface SelectChamberProps {
  onBack: () => void;
  onContinue?: (chamberName: string, consultationType: 'chamber' | 'video') => void;
  onChamberSelect?: (chamberId: number, chamberName: string, startTime?: string, endTime?: string) => void; // For clinic QR flow
  selectedDate: Date;
  onLanguageChange?: () => void;
  hasVideoConsultation?: boolean; // Premium add-on
  chambers?: Chamber[]; // Chambers from Schedule Manager
  doctorName?: string;
  doctorSpecialty?: string;
  doctorPhoto?: string;
  doctorDegrees?: string[];
  useDrPrefix?: boolean;
  themeColor?: 'emerald' | 'blue';
  doctorId?: string;
  clinicId?: string; // Clinic ID for exact chamber matching
  clinicAddress?: string; // Clinic address to filter when clinic is off
  clinicPlannedOffPeriods?: Array<{
    startDate: string;
    endDate: string;
    status: string;
    clinicId?: string;
    clinicName?: string;
    clinicAddress?: string;
    doctorId?: string;
    chamberName?: string; // Specific chamber closure (if omitted, applies to all chambers in clinic)
    appliesTo?: string;
  }>; // Clinic planned off periods with metadata
  language?: Language;
}

export default function SelectChamber({
  onBack,
  onContinue,
  onChamberSelect,
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
  themeColor = 'emerald',
  doctorId,
  clinicId,
  clinicAddress,
  clinicPlannedOffPeriods = [],
}: SelectChamberProps) {

  const accentColor = themeColor === 'blue' ? 'blue' : 'emerald';
  console.log('🏥 SelectChamber received:', {
    doctorName,
    doctorSpecialty,
    chamberscount: chambers.length,
    chambersDetails: chambers.map(c => ({
      name: c.chamberName,
      address: c.chamberAddress,
      hasClinicId: !!(c as any).clinicId
    })),
    clinicId,
    clinicAddress,
    doctorId: doctorId || 'NOT_SET',
    selectedDate: selectedDate instanceof Date ? selectedDate.toDateString() : selectedDate,
    clinicPlannedOffPeriodsCount: clinicPlannedOffPeriods.length,
    clinicPlannedOffPeriods: clinicPlannedOffPeriods
  });

  // Check if selected date falls in clinic planned off period
  // Updated to check specific chamber's clinic
  const isClinicOffForChamber = (chamber: any) => {
    const chamberClinicId = chamber.clinicId;
    const chamberAddr = (chamber.chamberAddress || '').toLowerCase().trim();
    const isHomeChamber = chamber.chamberName?.toLowerCase().includes('home');

    console.log('🔍 isClinicOffForChamber CHECK:', {
      chamberName: chamber.chamberName,
      chamberClinicId: chamberClinicId || 'NONE',
      chamberAddress: chamberAddr || 'NONE',
      isHomeChamber,
      selectedDate: selectedDate instanceof Date ? selectedDate.toDateString() : selectedDate,
      clinicPlannedOffPeriodsCount: clinicPlannedOffPeriods.length
    });

    if (!clinicPlannedOffPeriods || clinicPlannedOffPeriods.length === 0) {
      console.log('⚠️ No clinic planned off periods provided');
      return false;
    }

    // Home chambers are never blocked
    if (isHomeChamber) {
      console.log('🏠 Home chamber - never blocked');
      return false;
    }

    const date = new Date(selectedDate);
    date.setHours(0, 0, 0, 0);

    const activePlannedOffPeriods = clinicPlannedOffPeriods.filter((p: any) => p.status === 'active');
    console.log('📋 Active clinic planned off periods (all):', activePlannedOffPeriods.length);

    for (const period of activePlannedOffPeriods) {
      if (period.doctorId && doctorId && period.doctorId !== doctorId) {
        console.log('⏭️ Skipping period for other doctor:', {
          periodDoctorId: period.doctorId,
          currentDoctorId: doctorId
        });
        continue;
      }

      let isMatch = false;

      // Method 1: Match by clinicId (most reliable)
      if (chamberClinicId && period.clinicId) {
        isMatch = chamberClinicId === period.clinicId;
        console.log(`🆔 ClinicId Match: ${isMatch}`, {
          chamberClinicId,
          periodClinicId: period.clinicId
        });
      }
      // Method 2: Match by address (fallback for legacy chambers without clinicId)
      else if (!chamberClinicId && chamberAddr && period.clinicAddress) {
        const periodAddr = period.clinicAddress.toLowerCase().trim();

        // Flexible address matching: check if either contains the other
        const addressMatch = chamberAddr.includes(periodAddr) || periodAddr.includes(chamberAddr);

        // Also try matching by clinic name if available
        let nameMatch = false;
        if (period.clinicName) {
          const periodName = period.clinicName.toLowerCase().trim();
          nameMatch = chamberAddr.includes(periodName);
        }

        isMatch = addressMatch || nameMatch;
        console.log(`📍 Address/Name Match: ${isMatch}`, {
          chamberAddr,
          periodAddr,
          periodName: period.clinicName || 'NONE',
          addressMatch,
          nameMatch
        });
      }

      if (!isMatch) {
        continue; // This period doesn't apply to this chamber
      }

      // If period specifies a specific chamber, only apply if it matches
      if (period.chamberName) {
        const periodChamberName = (period.chamberName || '').toLowerCase().trim();
        const currentChamberName = (chamber.chamberName || '').toLowerCase().trim();

        if (periodChamberName !== currentChamberName) {
          console.log('🔹 Skipping period for different chamber:', {
            currentChamber: currentChamberName,
            periodChamber: periodChamberName
          });
          continue; // This period targets a different chamber
        }
        console.log('✅ Period targets this specific chamber:', currentChamberName);
      }

      // Period matches this chamber's clinic - check if date falls in range
      let startDate: Date;
      let endDate: Date;

      if (typeof period.startDate === 'string') {
        const [year, month, dayVal] = period.startDate.split('-').map(Number);
        startDate = new Date(year, month - 1, dayVal);
      } else if ((period.startDate as any)?.toDate) {
        startDate = (period.startDate as any).toDate();
      } else {
        startDate = new Date(period.startDate as any);
      }

      if (typeof period.endDate === 'string') {
        const [year, month, dayVal] = period.endDate.split('-').map(Number);
        endDate = new Date(year, month - 1, dayVal);
      } else if ((period.endDate as any)?.toDate) {
        endDate = (period.endDate as any).toDate();
      } else {
        endDate = new Date(period.endDate as any);
      }

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      console.log('🔄 Comparing dates:', {
        checkDate: date.toDateString(),
        periodStart: startDate.toDateString(),
        periodEnd: endDate.toDateString(),
        isInRange: date >= startDate && date <= endDate
      });

      if (date >= startDate && date <= endDate) {
        console.log('❌❌❌ CHAMBER BLOCKED - Clinic is OFF on selected date:', {
          chamberName: chamber.chamberName,
          clinicId: chamberClinicId || 'LEGACY',
          selectedDate: date.toDateString(),
          clinicOffPeriod: { start: startDate.toDateString(), end: endDate.toDateString() },
          matchMethod: chamberClinicId ? 'clinicId' : 'address/name'
        });
        return true;
      }
    }

    console.log('✅ Chamber available - Clinic is OPEN on selected date');
    return false;
  };

  const [selectedChamber, setSelectedChamber] = useState<ChamberWithBookingCount | null>(null);
  const [, setSelectedChamberName] = useState<string>('');
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
        let sortedChambers = chambersWithBookingData.sort((a, b) => (a.startMinutes || 0) - (b.startMinutes || 0));

        console.log('🔵 CHAMBER FILTERING START:', {
          totalChambers: sortedChambers.length,
          hasClinicId: !!clinicId,
          clinicId: clinicId,
          hasClinicAddress: !!clinicAddress,
          clinicAddress: clinicAddress,
          clinicPlannedOffPeriodsCount: clinicPlannedOffPeriods.length
        });

        // 🔒 CLINIC QR FILTER: If patient scanned a clinic QR (clinicId exists),
        // ONLY show chambers belonging to THAT specific clinic
        const bookingSource = sessionStorage.getItem('booking_source');
        if (clinicId && bookingSource === 'clinic_qr') {
          const beforeFilter = sortedChambers.length;
          console.log('🏥 CLINIC QR MODE: Filtering to show ONLY clinic chambers with ID:', clinicId);

          sortedChambers = sortedChambers.filter(chamber => {
            const chamberClinicId = (chamber as any).clinicId;
            const belongsToClinic = chamberClinicId === clinicId;

            console.log(`🔍 Chamber "${chamber.chamberName}":`, {
              chamberClinicId: chamberClinicId || 'NONE',
              targetClinicId: clinicId,
              match: belongsToClinic,
              action: belongsToClinic ? '✅ KEEP' : '❌ REMOVE'
            });

            return belongsToClinic; // Keep ONLY chambers matching clinic ID
          });

          console.log(`✅ Clinic chamber filter complete: ${beforeFilter} → ${sortedChambers.length} chambers (kept only clinic chambers)`);
        }

        // Filter out chambers if their specific clinic is off on selected date
        const beforeClinicOffFilter = sortedChambers.length;
        console.log('🔍 Checking each chamber for clinic planned off periods...');

        sortedChambers = sortedChambers.filter(chamber => {
          const isOff = isClinicOffForChamber(chamber);

          if (isOff) {
            console.log(`🚫 REMOVING chamber: "${chamber.chamberName}" - Clinic is OFF on ${selectedDate.toDateString()}`);
          } else {
            console.log(`✅ KEEPING chamber: "${chamber.chamberName}" - Clinic is OPEN`);
          }

          return !isOff; // Keep chambers whose clinic is NOT off
        });

        console.log(`✅ Clinic off filter complete: ${beforeClinicOffFilter} → ${sortedChambers.length} chambers (removed ${beforeClinicOffFilter - sortedChambers.length} due to clinic planned off)`);

        // Filter out disabled chambers (isActive === false)
        const beforeIsActiveFilter = sortedChambers.length;
        console.log('🔍 Checking each chamber for active status...');

        sortedChambers = sortedChambers.filter(chamber => {
          const isActive = chamber.isActive !== false; // Default to true if not specified

          if (!isActive) {
            console.log(`🚫 REMOVING chamber: "${chamber.chamberName}" - Chamber is DISABLED (isActive=false)`);
          } else {
            console.log(`✅ KEEPING chamber: "${chamber.chamberName}" - Chamber is ENABLED`);
          }

          return isActive;
        });

        console.log(`✅ Active status filter complete: ${beforeIsActiveFilter} → ${sortedChambers.length} chambers (removed ${beforeIsActiveFilter - sortedChambers.length} due to disabled status)`);

        setChambersWithCounts(sortedChambers);
      } catch (error) {
        console.error('❌ Error loading booking counts:', error);
      } finally {
        setLoadingCounts(false);
      }
    };

    loadBookingCounts();
  }, [chambers, selectedDate, refreshKey]); // Add refreshKey to dependency array

  // 🔥 REAL-TIME LISTENER: Separate useEffect to avoid infinite loop
  useEffect(() => {
    const doctorId = sessionStorage.getItem('booking_doctor_id');
    if (!doctorId) return;

    let timeoutId: NodeJS.Timeout | null = null;

    const setupListener = async () => {
      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { collection, query, where, onSnapshot } = await import('firebase/firestore');

      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('doctorId', '==', doctorId)
      );

      const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified' || change.type === 'removed') {
            console.log('🔄 Booking changed, refreshing chamber counts...');
            // Debounce: wait 500ms before refreshing to avoid rapid updates
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              setRefreshKey(prev => prev + 1);
            }, 500);
          }
        });
      });

      return unsubscribe;
    };

    let unsub: (() => void) | undefined;
    setupListener().then(unsubscribe => {
      unsub = unsubscribe;
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (unsub) unsub();
    };
  }, []); // Empty dependency - listener stays active

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
      doctorSpecialty={formatSpecialty(doctorSpecialty || '')}
      doctorDegrees={doctorDegrees}
      useDrPrefix={useDrPrefix}
      themeColor={themeColor}
    >
      <div>
        {/* Title */}
        <div className="text-center mb-2">
          <h1 className="text-white mb-2">Select Chamber</h1>
          <p className="text-gray-400 text-sm mb-4">Choose your preferred location</p>

          {/* Selected Date Badge */}
          <div className={`inline-block bg-${accentColor}-500/20 border border-${accentColor}-500/30 backdrop-blur-sm rounded-full px-4 py-2 mb-6`}>
            <p className={`text-${accentColor}-400 text-sm`}>{formatDate(selectedDate)}</p>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-[#1a1f2e] rounded-3xl p-6 shadow-2xl">

          {/* Health Tip Image */}
          <TemplateDisplay placement="booking-select-chamber" className="mb-6" />

          {/* Mode of Consultation Toggle */}
          {hasVideoConsultation && (
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3">Mode of Consultation</h3>
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
                      In-Chamber
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => setConsultationType('video')}
                  className={`border-2 rounded-xl p-4 transition-all ${
                    consultationType === 'video'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      consultationType === 'video' ? 'bg-blue-500' : 'bg-gray-700'
                    }`}>
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className={`text-sm font-medium ${
                      consultationType === 'video' ? 'text-blue-400' : 'text-gray-400'
                    }`}>
                      Video Consultation
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Available Chambers - ONLY show if chamber consultation is selected */}
          {consultationType === 'chamber' && (
            <>
              <h3 className="text-white mb-4">Available Chambers</h3>

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
                    }

                    // NEW: 1-hour booking cutoff for manual clinics
                    let isCutoff = false;
                    const manualClinicId = chamber.manualClinicId;
                    if (manualClinicId && selectedDate) {
                      const today = new Date();
                      const isToday = selectedDate.toDateString() === today.toDateString();
                      if (isToday) {
                        const [startHour, startMin] = (chamber.startTime || '00:00').split(':').map(Number);
                        const chamberStartTime = new Date(today);
                        chamberStartTime.setHours(startHour, startMin, 0, 0);

                        const now = new Date();
                        const diffInMs = chamberStartTime.getTime() - now.getTime();
                        const oneHourInMs = 60 * 60 * 1000;

                        if (diffInMs <= oneHourInMs) {
                          isCutoff = true;
                        }
                      }
                    }

                    return { ...chamber, isExpired, isBlockedForDate, isCutoff };
                  })
                  .sort((a, b) => {
                    // Expired chambers go to bottom
                    if (a.isExpired && !b.isExpired) return 1;
                    if (!a.isExpired && b.isExpired) return -1;

                    // Both active or both expired: sort by start time ascending
                    return ((a as any).startMinutes || 0) - ((b as any).startMinutes || 0);
                  })
                  .map((chamber, index) => {
                    const capacity = chamber.maxCapacity || 0;
                    const booked = chamber.bookedCount || 0;
                    const isFull = booked >= capacity;
                    const percentageFull = capacity > 0 ? (booked / capacity) * 100 : 0;
                    const isExpired = (chamber as any).isExpired;
                    const isCutoff = (chamber as any).isCutoff || false;
                    const isBlockedForDate = (chamber as any).isBlockedForDate || false;

                    const isDisabled = isBlockedForDate || isFull || isExpired || isCutoff;

                    // Determine status color
                    let statusColor = `text-${accentColor}-400`;
                    if (percentageFull >= 100) statusColor = 'text-red-400';
                    else if (percentageFull >= 80) statusColor = 'text-yellow-400';

                    return (
                      <button
                        key={chamber.id}
                        onClick={() => {
                          if (isDisabled) return;
                          setSelectedChamber(chamber as any);
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
                        disabled={isDisabled}
                        className={`w-full text-left border-2 rounded-2xl p-5 mb-3 transition-all ${
                          isDisabled
                            ? 'border-gray-800 bg-gray-900/50 opacity-50 cursor-not-allowed'
                            : selectedChamber?.id === chamber.id
                            ? `border-${accentColor}-500 bg-${accentColor}-500/10`
                            : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className={`${isDisabled ? 'text-gray-600' : 'text-white'}`}>
                            {chamber.chamberName}
                          </h4>
                          {isBlockedForDate ? (
                            <span className="text-xs text-red-400">(Unavailable)</span>
                          ) : (isFull && !isExpired && !isCutoff) ? (
                            <Badge className="bg-red-500 text-white text-xs">FULL</Badge>
                          ) : (!isExpired && !isCutoff) && (
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${statusColor}`}>
                                {booked}/{capacity}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mb-1">{chamber.chamberAddress}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-400">{chamber.startTime} - {chamber.endTime}</p>
                          {isExpired && (
                            <Badge className="bg-red-600 text-white text-xs">CHAMBER TIME OVER</Badge>
                          )}
                          {isCutoff && !isExpired && (
                            <Badge className="bg-orange-600 text-white text-xs">BOOKINGS CLOSED</Badge>
                          )}
                        </div>
                      </button>
                    );
                  })
              ) : (
                <>
                  <button
                onClick={() => setSelectedChamber('main' as any)}
                className={`w-full text-left border-2 rounded-2xl p-5 mb-3 transition-all ${
                  (selectedChamber as any) === 'main'
                  ? `border-${accentColor}-500 bg-${accentColor}-500/10`
                  : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                }`}
              >
                <h4 className="text-white mb-2">Main Chamber</h4>
                <p className="text-sm text-gray-400 mb-1">123 Medical Plaza, Room 101</p>
                <p className="text-sm text-gray-400">06:00 - 17:00</p>
              </button>
              <button
                onClick={() => setSelectedChamber('secondary' as any)}
                className={`w-full text-left border-2 rounded-2xl p-5 mb-3 transition-all ${
                  (selectedChamber as any) === 'secondary'
                  ? `border-${accentColor}-500 bg-${accentColor}-500/10`
                  : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                }`}
              >
                <h4 className="text-white mb-2">Secondary Chamber</h4>
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
                onContinue?.(chambers.length > 0 ? chambers[0].chamberName : 'Video Consultation', 'video');
              } else if (selectedChamber) {
                // Call onChamberSelect if provided (clinic QR flow), otherwise onContinue (doctor QR flow)
                if (onChamberSelect) {
                  onChamberSelect(selectedChamber.id, selectedChamber.chamberName, selectedChamber.startTime, selectedChamber.endTime);
                } else {
                  onContinue?.(selectedChamber.chamberName, 'chamber');
                }
              }
              console.log('📤 Sending to parent:', { chamber: selectedChamber?.chamberName, chamberId: selectedChamber?.id, consultationType });
            }}
            disabled={consultationType === 'chamber' && !selectedChamber}
            className={`w-full h-12 rounded-xl ${
              (consultationType === 'video' || selectedChamber)
                ? consultationType === 'video'
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : `bg-${accentColor}-500 hover:bg-${accentColor}-600 text-white`
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {consultationType === 'video' ? 'Continue to Patient Details' : 'Continue to Patient Details'}
          </Button>
        </div>
      </div>
    </BookingFlowLayout>
  );
}

