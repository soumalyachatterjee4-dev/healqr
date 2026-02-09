import { useState, useEffect } from 'react';
import { Clock, Activity, AlertCircle } from 'lucide-react';
import { translations } from '../utils/translations';
import DashboardPromoDisplay from './DashboardPromoDisplay';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { Card, CardContent } from './ui/card';

interface PatientLiveStatusProps {
  bookingId?: string;
  language?: string;
}

interface QueueData {
  yourPosition: number;
  totalInQueue: number;
  lastConsulted: number;
  arrivalTime: string;
  estimatedWaitMinutes: number;
  timeSlot: string;
  serialNo: number;
  pendingSlots?: number[];
  cancelledSlots?: number[];
  appointmentDate?: string;
  doctorName?: string;
  chamberName?: string;
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  bookingId?: string;
  cancelledStatus?: string;
  cancelReason?: string;
  cancelledBy?: string;
  cancelledAt?: any;
  consultationStatus?: string;
  isCompleted?: boolean;
  isCancelled?: boolean;
}

export default function PatientLiveStatus({ bookingId, language = 'english' }: PatientLiveStatusProps) {
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculatedArrivalTime, setCalculatedArrivalTime] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Auto-refresh at midnight to clear old data
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        console.log('🕛 Midnight refresh - clearing old appointment data');
        setQueueData(null);
        setError('No appointments scheduled for today');
        loadLiveQueueData();
      }
    };

    // Check every minute for midnight
    const midnightInterval = setInterval(checkMidnight, 60000);

    return () => clearInterval(midnightInterval);
  }, []);

  useEffect(() => {
    loadLiveQueueData();
    
    // Set up real-time listener for live updates
    const patientPhone = localStorage.getItem('patient_phone');
    if (!patientPhone) return;

    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('patientPhone', '==', patientPhone)
    );

    // Real-time sync with doctor's updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          console.log('🔄 Booking updated in real-time');
          loadLiveQueueData(); // Reload when booking changes
        }
      });
    });

    return () => unsubscribe();
  }, [bookingId]);

  const loadLiveQueueData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const patientPhone = localStorage.getItem('patient_phone');
      if (!patientPhone) {
        setError('Please login to view live status');
        setLoading(false);
        return;
      }

      console.log('📱 Loading live queue for:', patientPhone);

      // Get today's date in LOCAL timezone (not UTC!)
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`; // YYYY-MM-DD in local timezone
      
      console.log('📅 Looking for appointments on:', todayStr);
      
      // Try both phone formats: with and without +91
      const phoneVariations = [
        patientPhone,
        patientPhone.startsWith('+91') ? patientPhone.substring(3) : `+91${patientPhone}`,
        patientPhone.startsWith('91') && !patientPhone.startsWith('+') ? patientPhone.substring(2) : patientPhone
      ];
      
      console.log('🔍 Searching with phone variations:', phoneVariations);
      
      // Query for bookings - try all phone variations (WITHOUT orderBy to avoid index requirement)
      const bookingsRef = collection(db, 'bookings');
      let allDocs: any[] = [];
      
      for (const phoneVar of phoneVariations) {
        try {
          const q = query(
            bookingsRef,
            where('patientPhone', '==', phoneVar)
          );
          const snapshot = await getDocs(q);
          console.log(`📞 Phone ${phoneVar}: Found ${snapshot.docs.length} bookings`);
          allDocs.push(...snapshot.docs);
        } catch (err) {
          console.error(`Error querying phone ${phoneVar}:`, err);
        }
      }

      // Remove duplicates and sort by createdAt in memory
      const uniqueDocs = Array.from(new Map(allDocs.map(doc => [doc.id, doc])).values())
        .sort((a, b) => {
          const aTime = a.data().createdAt?.toDate?.() || new Date(0);
          const bTime = b.data().createdAt?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        });
      
      console.log(`📊 Total unique bookings found: ${uniqueDocs.length}`);
      
      if (allDocs.length === 0) {
        console.log('❌ No bookings found for any phone variation');
        console.log('   Phone variations tried:', phoneVariations);
        setError('No appointments scheduled for today');
        setLoading(false);
        return;
      }

      console.log(`✅ Found ${uniqueDocs.length} unique booking(s)`);

      // Find TODAY's appointment ONLY (not past, not future)
      let todaysBooking = null;
      
      uniqueDocs.forEach(doc => {
        const data = doc.data();
        
        console.log('🔍 Raw booking data:', {
          id: doc.id,
          allFields: Object.keys(data),
          bookingDate: data.bookingDate,
          consultationDate: data.consultationDate,
          appointmentDate: data.appointmentDate,
          date: data.date,
          createdAt: data.createdAt,
          status: data.status,
          type: data.type
        });
        
        // Get appointment date - check multiple possible fields
        let appointmentDateStr = '';
        
        // Priority order: bookingDate > consultationDate > appointmentDate > date > createdAt
        if (data.bookingDate) {
          appointmentDateStr = data.bookingDate;
          console.log('✓ Using bookingDate:', appointmentDateStr);
        } else if (data.consultationDate) {
          appointmentDateStr = data.consultationDate;
          console.log('✓ Using consultationDate:', appointmentDateStr);
        } else if (data.appointmentDate) {
          appointmentDateStr = data.appointmentDate;
          console.log('✓ Using appointmentDate:', appointmentDateStr);
        } else if (data.date) {
          // Handle Firestore Timestamp or string
          const dateField = data.date?.toDate ? data.date.toDate() : new Date(data.date);
          appointmentDateStr = dateField.toISOString().split('T')[0];
          console.log('✓ Using date field:', appointmentDateStr);
        } else if (data.createdAt?.toDate) {
          appointmentDateStr = data.createdAt.toDate().toISOString().split('T')[0];
          console.log('✓ Using createdAt:', appointmentDateStr);
        } else {
          console.log('❌ No date field found!');
        }
        
        console.log('📅 Checking booking:', {
          id: doc.id,
          appointmentDate: appointmentDateStr,
          todayStr,
          type: data.type,
          status: data.status,
          isCancelled: data.status === 'cancelled'
        });

        // Check if this is TODAY's booking (exact match only)
        const isToday = appointmentDateStr === todayStr;
        
        // Check if cancelled
        const isCancelled = data.status === 'cancelled' || data.isCancelled === true;
        
        // Check consultation status
        const consultationStatus = data.consultationStatus || 'pending';
        const isCompleted = consultationStatus === 'completed' || data.isCompleted === true;
        
        console.log('📋 Booking details:', {
          id: doc.id,
          date: appointmentDateStr,
          isToday,
          isCancelled,
          consultationStatus,
          isCompleted,
          serialNumber: data.serialNumber
        });
        
        // Include cancelled bookings - they should show CANCELLED badge until midnight
        if (isToday && !todaysBooking) {
          todaysBooking = { id: doc.id, ...data, isCompleted, consultationStatus, isCancelled };
          console.log('✅ Found TODAY\'s booking!', doc.id, isCancelled ? '(CANCELLED)' : '(ACTIVE)');
        }
      });

      if (!todaysBooking) {
        console.log('⚠️ No active appointment found for today');
        setError('No appointments scheduled for today');
        setLoading(false);
        return;
      }

      console.log('✅ Final booking selected:', {
        id: todaysBooking.id,
        date: todaysBooking.bookingDate || todaysBooking.consultationDate,
        status: todaysBooking.bookingStatus,
        serialNo: todaysBooking.serialNumber,
        tokenNo: todaysBooking.tokenNumber,
        serialNumber: todaysBooking.serialNumber,
        slot: todaysBooking.slot,
        allFields: Object.keys(todaysBooking),
        patientName: todaysBooking.patientName,
        doctor: todaysBooking.doctorName
      });

      // Extract queue data from booking - with fallbacks for different field names
      // Check all possible serial number field names
      const serialNumberRaw = todaysBooking.serialNumber || 
                              todaysBooking.tokenNumber || 
                              todaysBooking.serialNo || 
                              todaysBooking.slotNumber ||
                              todaysBooking.queueNumber ||
                              todaysBooking.position ||
                              '';
      
      console.log('🔍 Serial number raw value:', serialNumberRaw, 'Type:', typeof serialNumberRaw);
      
      const serialNumber = parseInt(String(serialNumberRaw).replace(/\D/g, '') || '0');
      
      // Get actual chamber capacity from booking data (no fallback to 25!)
      const chamberCapacity = parseInt(
        todaysBooking.chamberCapacity || 
        todaysBooking.totalSlots || 
        todaysBooking.capacity || 
        todaysBooking.maxPatients ||
        '20' // Default to 20 if no capacity found
      );
      
      const timeSlot = todaysBooking.timeSlot || todaysBooking.consultationTime || todaysBooking.slot || todaysBooking.time || '16:00 - 20:00';
      
      console.log('📊 Extracted data:', { 
        serialNumberRaw,
        serialNumber, 
        chamberCapacity, 
        timeSlot,
        isValid: !isNaN(serialNumber) && serialNumber > 0,
        capacitySource: todaysBooking.chamberCapacity ? 'chamberCapacity' : 
                        todaysBooking.totalSlots ? 'totalSlots' : 
                        todaysBooking.capacity ? 'capacity' : 'default'
      });
      
      // Validate serial number
      if (isNaN(serialNumber) || serialNumber <= 0) {
        console.error('❌ Invalid serial number:', serialNumber);
        setError('Unable to determine your queue position');
        setLoading(false);
        return;
      }
      
      // Calculate estimated wait time
      const calculateWaitTime = () => {
        try {
          const parts = timeSlot.toLowerCase().split('-');
          if (parts.length === 2) {
            const startStr = parts[0].trim();
            const endStr = parts[1].trim();
            
            let startHour: number, startMin: number = 0;
            let endHour: number, endMin: number = 0;
            
            // Handle 24-hour format (e.g., "16:00")
            if (startStr.includes(':')) {
              [startHour, startMin] = startStr.split(':').map(Number);
              [endHour, endMin] = endStr.split(':').map(Number);
            } else {
              // Handle 12-hour format
              const isPM = endStr.includes('pm');
              startHour = parseInt(startStr);
              endHour = parseInt(endStr.replace(/[ap]m/g, '').trim());
              
              if (isPM && startHour < 12) startHour += 12;
              if (isPM && endHour < 12) endHour += 12;
            }
            
            const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
            const timePerPatient = totalMinutes / chamberCapacity;
            const estimatedWait = Math.round((serialNumber - 1) * timePerPatient);
            
            return estimatedWait > 0 ? estimatedWait : 0;
          }
        } catch (error) {
          console.error('Error calculating wait time:', error);
        }
        return 0;
      };
      
      // Check cancellation status - use isCancelled flag or status field
      const isCancelled = todaysBooking.isCancelled || todaysBooking.status === 'cancelled';
      const cancelledStatus = isCancelled ? 'cancelled' : 'active';
      
      console.log('✅ Setting queue data with serial:', serialNumber);
      
      const isCompleted = todaysBooking.isCompleted || false;
      const consultationStatus = todaysBooking.consultationStatus || (isCompleted ? 'completed' : 'in-queue');
      
      // Fetch ALL today's bookings for this chamber to show queue status
      const doctorId = todaysBooking.doctorId || todaysBooking.userId;
      const chamberName = todaysBooking.chamberName || todaysBooking.clinicName || todaysBooking.location;
      let completedSlots: number[] = [];
      let cancelledSlots: number[] = [];
      let lastConsultedNumber = 0;
      
      if (doctorId && chamberName) {
        try {
          const chamberBookingsQuery = query(
            bookingsRef,
            where('doctorId', '==', doctorId),
            where('chamberName', '==', chamberName)
          );
          const chamberSnapshot = await getDocs(chamberBookingsQuery);
          
          chamberSnapshot.forEach(doc => {
            const booking = doc.data();
            const bookingDateStr = booking.bookingDate || booking.consultationDate || '';
            
            // Only process today's bookings
            if (bookingDateStr === todayStr) {
              const bookingSerial = parseInt(String(booking.serialNumber || booking.tokenNumber || '0').replace(/\D/g, ''));
              
              if (bookingSerial > 0) {
                // Check if completed
                if (booking.isCompleted || booking.consultationStatus === 'completed' || booking.isMarkedSeen) {
                  completedSlots.push(bookingSerial);
                  if (bookingSerial > lastConsultedNumber) {
                    lastConsultedNumber = bookingSerial;
                  }
                }
                
                // Check if cancelled
                if (booking.status === 'cancelled' || booking.isCancelled) {
                  cancelledSlots.push(bookingSerial);
                }
              }
            }
          });
          
          console.log('📊 Chamber queue status:', {
            completedSlots,
            cancelledSlots,
            lastConsulted: lastConsultedNumber
          });
        } catch (err) {
          console.error('Error fetching chamber queue:', err);
        }
      }
      
      setQueueData({
        yourPosition: serialNumber,
        totalInQueue: chamberCapacity,
        lastConsulted: lastConsultedNumber,
        arrivalTime: '',
        estimatedWaitMinutes: isCompleted ? 0 : calculateWaitTime(),
        timeSlot: timeSlot,
        serialNo: serialNumber,
        pendingSlots: [],
        cancelledSlots: cancelledSlots,
        appointmentDate: todaysBooking.bookingDate || todaysBooking.consultationDate,
        doctorName: todaysBooking.doctorName || 'Dr. ' + (todaysBooking.doctor || 'Unknown'),
        chamberName: todaysBooking.chamberName || todaysBooking.clinicName || todaysBooking.location || 'Chamber',
        patientName: todaysBooking.patientName || todaysBooking.name || 'Patient',
        patientAge: todaysBooking.patientAge || todaysBooking.age || '',
        patientGender: todaysBooking.patientGender || todaysBooking.gender || '',
        bookingId: todaysBooking.id,
        cancelledStatus: cancelledStatus,
        cancelReason: todaysBooking.cancelReason,
        cancelledBy: todaysBooking.cancelledBy,
        cancelledAt: todaysBooking.cancelledAt,
        consultationStatus: consultationStatus,
        isCompleted: isCompleted,
        isCancelled: todaysBooking.isCancelled || false
      });

      setLoading(false);
    } catch (err: any) {
      console.error('❌ Error loading live queue:', err);
      if (err?.code === 'failed-precondition' || err?.message?.includes('index')) {
        setError('Setting up database... Please wait 2-3 minutes and refresh the page.');
      } else {
        setError('Failed to load queue status. Please try again.');
      }
      setLoading(false);
    }
  };

  // Helper function to format date
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Calculate arrival time based on booking confirmation logic
  useEffect(() => {
    if (!queueData) return;
    
    const calculateArrivalTime = () => {
      try {
        const serialNo = queueData.serialNo;
        const totalInQueue = queueData.totalInQueue;
        const timeSlot = queueData.timeSlot;
        
        if (!timeSlot || !serialNo) return;

        // Parse time slot (e.g., "20:30 - 23:59")
        const parts = timeSlot.toLowerCase().split('-');
        if (parts.length !== 2) return;
        
        const startStr = parts[0].trim();
        const endStr = parts[1].trim();
        
        let startHour: number, startMin: number = 0;
        let endHour: number, endMin: number = 0;
        
        // Check for AM/PM format FIRST (handles both "10:00 AM" and "10 AM")
        if (startStr.toLowerCase().includes('am') || startStr.toLowerCase().includes('pm') || 
            endStr.toLowerCase().includes('am') || endStr.toLowerCase().includes('pm')) {
          // 12-hour format (e.g., "10:00 AM - 02:00 PM" or "10 AM - 2 PM")
          const startParts = startStr.toLowerCase().replace(/\s+/g, ' ').split(' ');
          const endParts = endStr.toLowerCase().replace(/\s+/g, ' ').split(' ');
          
          // Parse start time
          const startTimePart = startParts[0];
          const startPeriod = startParts[1] || endParts[1]; // Use end period if start doesn't have one
          if (startTimePart.includes(':')) {
            const [h, m] = startTimePart.split(':').map(s => parseInt(s));
            startHour = h;
            startMin = m || 0;
          } else {
            startHour = parseInt(startTimePart);
          }
          if (startPeriod === 'pm' && startHour < 12) startHour += 12;
          if (startPeriod === 'am' && startHour === 12) startHour = 0;
          
          // Parse end time
          const endTimePart = endParts[0];
          const endPeriod = endParts[1];
          if (endTimePart.includes(':')) {
            const [h, m] = endTimePart.split(':').map(s => parseInt(s));
            endHour = h;
            endMin = m || 0;
          } else {
            endHour = parseInt(endTimePart);
          }
          if (endPeriod === 'pm' && endHour < 12) endHour += 12;
          if (endPeriod === 'am' && endHour === 12) endHour = 0;
        } else if (startStr.includes(':')) {
          // 24-hour format (e.g., "20:30 - 23:59")
          [startHour, startMin] = startStr.split(':').map(Number);
          [endHour, endMin] = endStr.split(':').map(Number);
        } else {
          // Simple hour format without colons or AM/PM (fallback)
          startHour = parseInt(startStr);
          endHour = parseInt(endStr);
        }
        
        const startTime = new Date();
        startTime.setHours(startHour, startMin, 0, 0);
        
        const endTime = new Date();
        endTime.setHours(endHour, endMin, 0, 0);
        
        // Calculate total duration in minutes
        const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
        
        // Time per patient
        const timePerPatient = totalMinutes / totalInQueue;
        
        // Patient's slot time
        const patientSlotMinutes = (serialNo - 1) * timePerPatient;
        
        // Recommended arrival (15 minutes before slot)
        const slotTime = new Date(startTime.getTime() + patientSlotMinutes * 60 * 1000);
        const arrival = new Date(slotTime.getTime() - 15 * 60 * 1000);
        
        // Check if arrival time has already passed
        const now = new Date();
        if (arrival.getTime() < now.getTime()) {
          setCalculatedArrivalTime('IMMEDIATELY');
          return;
        }
        
        // Format time
        const hours = arrival.getHours();
        const minutes = arrival.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        
        setCalculatedArrivalTime(`${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`);
      } catch (error) {
        console.error('Error calculating arrival time:', error);
      }
    };

    calculateArrivalTime();
  }, [queueData, currentTime]);

  const getSlotStatus = (slotNumber: number) => {
    if (!queueData) return 'empty';
    
    // You - this is your position
    if (slotNumber === queueData.yourPosition) {
      console.log('🎯 Your slot:', slotNumber);
      return 'you';
    }
    
    // Doctor cancelled this slot
    if (queueData.cancelledSlots?.includes(slotNumber)) return 'cancelled';
    
    // Already consulted
    if (slotNumber <= queueData.lastConsulted) return 'completed';
    
    // Pending: booked but haven't arrived yet, and their turn is before you
    if (slotNumber < queueData.yourPosition && queueData.pendingSlots?.includes(slotNumber)) {
      return 'pending';
    }
    
    // Waiting: everyone else in queue
    if (slotNumber <= queueData.totalInQueue) return 'waiting';
    
    return 'empty';
  };

  const getSlotClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-transparent border-2 border-green-500 text-green-500';
      case 'you':
        return 'bg-green-500 border-2 border-green-400 text-white shadow-lg shadow-green-500/50 scale-105';
      case 'pending':
        return 'bg-transparent border-2 border-orange-500 text-orange-500';
      case 'cancelled':
        return 'bg-transparent border-2 border-red-500 text-red-500 line-through';
      case 'waiting':
        return 'bg-transparent border-2 border-gray-600 text-gray-400';
      default:
        return 'bg-transparent border-2 border-gray-700 text-gray-600';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Health Tips Card */}
      <DashboardPromoDisplay category="health-tip" placement="patient-live-status" />

      {/* Loading State */}
      {loading && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-400 text-lg">Loading live queue status...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-16 w-16 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Live Appointment Today</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <p className="text-gray-500 text-sm">
              Live tracking will automatically appear when you have an appointment scheduled for today.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cancellation Badge */}
      {!loading && queueData && queueData.cancelledStatus === 'cancelled' && (
        <Card className="bg-red-500/10 border-red-500">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-red-400 font-bold text-lg mb-2">Appointment Cancelled</h3>
                <p className="text-red-300 mb-2">
                  This appointment has been cancelled{queueData.cancelledBy && ` by ${queueData.cancelledBy}`}.
                </p>
                {queueData.cancelReason && (
                  <p className="text-red-200 text-sm">
                    <strong>Reason:</strong> {queueData.cancelReason}
                  </p>
                )}
                {queueData.cancelledAt && (
                  <p className="text-red-200 text-sm mt-1">
                    <strong>Cancelled at:</strong> {new Date(queueData.cancelledAt.seconds * 1000).toLocaleString()}
                  </p>
                )}
                <p className="text-red-200 text-sm mt-3">
                  Live tracking is not available for cancelled appointments.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue Display - Only show if active appointment */}
      {!loading && !error && queueData && queueData.cancelledStatus !== 'cancelled' && (
        <>
          {/* Patient & Appointment Info Header */}
          <Card className="bg-gradient-to-r from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Patient Details */}
                <div>
                  <h3 className="text-green-400 font-semibold mb-3 text-sm uppercase tracking-wide">Patient Details</h3>
                  <div className="space-y-2">
                    <p className="text-white font-bold text-xl">{queueData.patientName}</p>
                    <div className="flex gap-4 text-gray-300">
                      {queueData.patientAge && <span>Age: {queueData.patientAge}</span>}
                      {queueData.patientGender && <span className="capitalize">{queueData.patientGender}</span>}
                    </div>
                  </div>
                </div>
                
                {/* Appointment Details */}
                <div>
                  <h3 className="text-blue-400 font-semibold mb-3 text-sm uppercase tracking-wide">Appointment Details</h3>
                  <div className="space-y-2">
                    <p className="text-white font-semibold">Dr. {queueData.doctorName}</p>
                    <p className="text-gray-300 text-sm">{queueData.chamberName}</p>
                    <p className="text-gray-300 text-sm">Time: {queueData.timeSlot}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Row - Queue Position and Arrival Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue Position Card */}
        <div className="bg-gradient-to-br from-green-900/30 to-green-800/30 border-2 border-green-500/50 rounded-xl p-8 text-center">
          <div className="flex items-center justify-center gap-2 text-green-400 mb-3">
            <Activity className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wide">Your Position</span>
          </div>
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="text-7xl md:text-8xl font-bold text-green-400">#{queueData.yourPosition}</div>
          </div>
          <div className="text-gray-300 text-xl mb-4">of {queueData.totalInQueue} patients in queue</div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-center gap-2">
              {queueData.isCompleted ? (
                <>
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-lg font-semibold">Consultation Completed</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-blue-400">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-lg font-semibold">In Queue</span>
                  </div>
                  {queueData.estimatedWaitMinutes > 0 && (
                    <span className="text-gray-400 text-sm ml-2">
                      • Est. wait: ~{queueData.estimatedWaitMinutes} min
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Arrival Time Card */}
        <div className={`${
          queueData.isCancelled
            ? 'bg-gradient-to-r from-red-600 to-red-700'
            : queueData.isCompleted 
            ? 'bg-gradient-to-r from-green-600 to-green-700' 
            : calculatedArrivalTime === 'IMMEDIATELY' 
              ? 'bg-gradient-to-r from-red-600 to-red-700' 
              : 'bg-gradient-to-r from-orange-600 to-orange-700'
        } rounded-xl p-8 flex items-center justify-center`}>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-4 rounded-full">
              <Clock className="w-10 h-10 text-white" />
            </div>
            <div>
              {queueData.isCancelled ? (
                <>
                  <div className="text-red-100 text-sm font-medium">
                    Appointment Status
                  </div>
                  <div className="text-4xl font-bold text-white">CANCELLED</div>
                  <div className="text-red-100 text-sm mt-1">
                    Please contact the clinic to reschedule
                  </div>
                </>
              ) : queueData.isCompleted ? (
                <>
                  <div className="text-green-100 text-sm font-medium">
                    Consultation Status
                  </div>
                  <div className="text-4xl font-bold text-white">Completed</div>
                  <div className="text-green-100 text-sm mt-1">
                    Thank you for visiting!
                  </div>
                </>
              ) : (
                <>
                  <div className={`${calculatedArrivalTime === 'IMMEDIATELY' ? 'text-red-100' : 'text-orange-200'} text-sm font-medium`}>
                    {calculatedArrivalTime === 'IMMEDIATELY' ? 'Please come' : 'You must reach by'}
                  </div>
                  <div className="text-4xl font-bold text-white">{calculatedArrivalTime || queueData.arrivalTime}</div>
                  <div className={`${calculatedArrivalTime === 'IMMEDIATELY' ? 'text-red-100' : 'text-orange-100'} text-sm mt-1`}>
                    {calculatedArrivalTime === 'IMMEDIATELY' ? 'Your appointment time has arrived' : 'Arrive 15 minutes before your slot'}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Queue Visualization */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-white font-bold text-lg mb-4 text-center">Queue Status Board</h3>
        <div className="grid grid-cols-5 gap-3 mb-6">
          {Array.from({ length: queueData.totalInQueue }, (_, i) => i + 1).map((slotNumber) => {
            const status = getSlotStatus(slotNumber);
            const isYourSlot = slotNumber === queueData.yourPosition;
            return (
              <div
                key={slotNumber}
                className={`aspect-square rounded-lg flex items-center justify-center text-lg md:text-xl font-bold transition-all duration-300 ${getSlotClass(status)} ${isYourSlot ? 'animate-pulse' : ''}`}
                title={isYourSlot ? 'Your Position' : `Slot ${slotNumber}`}
              >
                {slotNumber}
              </div>
            );
          })}
        </div>

        {/* Legend and Wait Time Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs md:text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded border-2 border-green-500"></div>
              <span className="text-gray-300">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-green-500 border-2 border-green-400"></div>
              <span className="text-gray-300 font-bold">You</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded border-2 border-gray-600"></div>
              <span className="text-gray-300">Waiting</span>
            </div>
          </div>

          {/* Estimated Wait Time */}
          <div className="flex items-center justify-center lg:justify-end gap-3">
            <Clock className="w-6 h-6 text-blue-400" />
            <div>
              <div className="text-blue-400 text-sm font-medium">
                {calculatedArrivalTime === 'IMMEDIATELY' ? 'Current Time' : 'Estimated Wait Time'}
              </div>
              <div className={`text-2xl font-bold ${calculatedArrivalTime === 'IMMEDIATELY' ? 'text-red-400' : 'text-white'}`}>
                {calculatedArrivalTime === 'IMMEDIATELY' ? currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : `${queueData.estimatedWaitMinutes} minutes`}
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
