import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Menu, Info, Plus, Minus, Calendar, Pencil, Trash2, Clock, MapPin, Users, CalendarIcon, Check, Eye, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import DashboardSidebar from './DashboardSidebar';
import { toast } from 'sonner';
import { db, auth } from '../lib/firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { decrypt } from '../utils/encryptionService';

interface ScheduleManagerProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
  activeAddOns?: string[];
}

export default function ScheduleManager({ onMenuChange, onLogout, activeAddOns = [] }: ScheduleManagerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [doctorId, setDoctorId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Load data from Firestore on mount
  useEffect(() => {
    const loadFromFirestore = async (uid: string) => {
      console.log('🔍 ScheduleManager: Loading data for user:', uid);
      
      if (!db) {
        console.error('❌ ScheduleManager: Firestore db not initialized');
        setLoading(false);
        return;
      }

      setDoctorId(uid);

      try {
        const doctorDoc = await getDoc(doc(db, 'doctors', uid));
        if (doctorDoc.exists()) {
          const data = doctorDoc.data();
          
          // Load global settings
          setMaxAdvanceDays(data.maxAdvanceBookingDays?.toString() || '15');
          
          // Load planned off periods
          if (data.plannedOffPeriods && Array.isArray(data.plannedOffPeriods)) {
            const periods = data.plannedOffPeriods.map((p: any) => ({
              ...p,
              startDate: p.startDate?.toDate ? p.startDate.toDate().toISOString().split('T')[0] : p.startDate,
              endDate: p.endDate?.toDate ? p.endDate.toDate().toISOString().split('T')[0] : p.endDate,
            }));
            setAllPeriods(periods);
          }
          
          // Load chambers
          if (data.chambers && Array.isArray(data.chambers)) {
            setDemoSchedules(data.chambers);
          }
        }
      } catch (error) {
        console.error('Error loading schedule data:', error);
        toast.error('Failed to load schedule data');
      } finally {
        setLoading(false);
      }
    };

    // Use onAuthStateChanged to ensure we get the user even if there's a delay
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadFromFirestore(user.uid);
      } else {
        console.log('❌ ScheduleManager: No authenticated user found via listener');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);
  
  // State for Planned Off
  const [plannedOffEnabled, setPlannedOffEnabled] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<number | null>(null);
  
  // All planned off periods (active, completed, deactivated)
  const [allPeriods, setAllPeriods] = useState<Array<{
    id: number;
    startDate: string;
    endDate: string;
    createdDate: string;
    createdTime: string;
    status: 'active' | 'completed' | 'deactivated';
    deactivatedDate: string | null;
  }>>([]);
  
  // Check if there are any active periods
  const hasActivePeriods = allPeriods.some(p => p.status === 'active');
  
  // State for Maximum Advance Booking Days
  const [maxAdvanceDays, setMaxAdvanceDays] = useState('15');

  // State for Schedule Maker (Section 2)
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [frequency, setFrequency] = useState('Daily');
  const [frequencyStartDate, setFrequencyStartDate] = useState(''); // For Bi-Weekly and Monthly
  const [customDate, setCustomDate] = useState(''); // For Custom frequency
  const [chamberName, setChamberName] = useState('');
  const [chamberAddress, setChamberAddress] = useState('');
  const [clinicCode, setClinicCode] = useState(''); // NEW: Optional clinic code to link chamber
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxCapacity, setMaxCapacity] = useState(1);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);

  // State for saved schedules
  const [demoSchedules, setDemoSchedules] = useState<Array<{
    id: number;
    days: string[];
    frequency: string;
    frequencyStartDate?: string;
    customDate?: string;
    chamberName: string;
    chamberAddress: string;
    clinicCode?: string;
    clinicId?: string;
    startTime: string;
    endTime: string;
    maxCapacity: number;
    isActive?: boolean;
    createdAt?: number;
  }>>([]);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleReset = () => {
    setSelectedDays([]);
    setFrequency('Daily');
    setFrequencyStartDate('');
    setCustomDate('');
    setChamberName('');
    setChamberAddress('');
    setClinicCode('');
    setStartTime('');
    setEndTime('');
    setMaxCapacity(1);
    setEditingScheduleId(null);
  };

  const handleEditSchedule = (schedule: typeof demoSchedules[0]) => {
    setEditingScheduleId(schedule.id);
    
    // Handle custom dates differently
    if (schedule.frequency === 'Custom') {
      setSelectedDays([]);
      setCustomDate(schedule.customDate || '');
    } else {
      setSelectedDays(schedule.days);
      setCustomDate('');
    }
    
    setFrequency(schedule.frequency);
    setFrequencyStartDate(schedule.frequencyStartDate || '');
    setChamberName(schedule.chamberName);
    setChamberAddress(schedule.chamberAddress);
    setClinicCode(schedule.clinicCode || '');
    setStartTime(schedule.startTime);
    setEndTime(schedule.endTime);
    setMaxCapacity(schedule.maxCapacity);

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    toast.info('Editing Schedule', {
      description: 'Make your changes and click SAVE SCHEDULE to update.',
      duration: 3000,
    });
  };

  const handleDeleteSchedule = async (id: number) => {
    const updatedSchedules = demoSchedules.filter(s => s.id !== id);
    setDemoSchedules(updatedSchedules);
    
    // Save to Firestore
    if (doctorId && db) {
      try {
        await updateDoc(doc(db, 'doctors', doctorId), {
          chambers: updatedSchedules,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error deleting schedule:', error);
        toast.error('Failed to delete from database');
        return;
      }
    }
    
    toast.success('Schedule Deleted Successfully', {
      description: 'The schedule has been removed from your list.',
      duration: 5000,
    });
  };

  // Helper function to check if two time ranges overlap
  const timeRangesOverlap = (start1: string, end1: string, start2: string, end2: string) => {
    try {
      const [h1, m1] = start1.split(':').map(Number);
      const [h2, m2] = end1.split(':').map(Number);
      const [h3, m3] = start2.split(':').map(Number);
      const [h4, m4] = end2.split(':').map(Number);

      const minutes1Start = h1 * 60 + m1;
      const minutes1End = h2 * 60 + m2;
      const minutes2Start = h3 * 60 + m3;
      const minutes2End = h4 * 60 + m4;

      const overlaps = minutes1Start < minutes2End && minutes2Start < minutes1End;
      console.log('⏰ Time overlap check:', { start1, end1, start2, end2, overlaps });
      return overlaps;
    } catch (error) {
      console.error('Error checking time overlap:', error);
      return false;
    }
  };

  // Helper function to check if two day arrays have common days
  const hasCommonDays = (days1: string[], days2: string[]) => {
    if (!Array.isArray(days1) || !Array.isArray(days2)) {
      console.log('🚫 Invalid days arrays:', { days1, days2 });
      return false;
    }
    if (days1.length === 0 || days2.length === 0) {
      console.log('🚫 Empty days arrays:', { days1, days2 });
      return false;
    }
    const hasCommon = days1.some(day => days2.includes(day));
    console.log('📅 Day overlap check:', { days1, days2, hasCommon });
    return hasCommon;
  };

  const handleSaveSchedule = async () => {
    // Validate required fields
    if (frequency === 'Custom') {
      if (!customDate) {
        toast.error('Please select a date for custom schedule');
        return;
      }
    } else {
      if (selectedDays.length === 0) {
        toast.error('Please select at least one day');
        return;
      }
      if ((frequency === 'Bi-Weekly' || frequency === 'Monthly') && !frequencyStartDate) {
        toast.error('Please select a start date for ' + frequency.toLowerCase() + ' schedule');
        return;
      }
    }

    if (!chamberName || !chamberAddress) {
      toast.error('Please fill in chamber name and address');
      return;
    }

    if (!startTime || !endTime) {
      toast.error('Please select start and end time');
      return;
    }

    // Look up clinic by code if provided
    let resolvedClinicId: string | undefined = undefined;
    if (clinicCode && clinicCode.trim()) {
      try {
        const clinicsRef = collection(db, 'clinics');
        const clinicQuery = query(clinicsRef, where('clinicCode', '==', clinicCode.trim()));
        const clinicSnap = await getDocs(clinicQuery);
        
        if (!clinicSnap.empty) {
          resolvedClinicId = clinicSnap.docs[0].id;
          console.log('✅ Found clinic:', { code: clinicCode, id: resolvedClinicId });
        } else {
          toast.error('Clinic code not found. Please check and try again.');
          return;
        }
      } catch (error) {
        console.error('Error looking up clinic:', error);
        toast.error('Failed to validate clinic code');
        return;
      }
    }

    // CRITICAL: Check for schedule conflicts with existing chambers
    const conflictsToCheck = editingScheduleId 
      ? demoSchedules.filter(s => s.id !== editingScheduleId && s.isActive !== false)
      : demoSchedules.filter(s => s.isActive !== false);
    
    const conflicts: any[] = [];

    console.log('🔍 CONFLICT DETECTION START');
    console.log('📋 New schedule:', { selectedDays, frequency, startTime, endTime, chamberName, customDate });
    console.log('📚 Existing chambers to check:', conflictsToCheck.length);

    // Check each existing chamber for conflicts
    for (const existingChamber of conflictsToCheck) {
      console.log('🔎 Checking chamber:', {
        name: existingChamber.chamberName,
        days: existingChamber.days,
        frequency: existingChamber.frequency,
        time: `${existingChamber.startTime}-${existingChamber.endTime}`,
        isActive: existingChamber.isActive
      });

      // For Custom frequency, check date conflict
      if (frequency === 'Custom' && existingChamber.frequency === 'Custom') {
        if (existingChamber.customDate === customDate) {
          // Same custom date - check time overlap
          if (timeRangesOverlap(startTime, endTime, existingChamber.startTime, existingChamber.endTime)) {
            conflicts.push({
              chamber: existingChamber,
              reason: 'Same date and overlapping time',
              date: customDate
            });
          }
        }
      }
      // For regular frequency, check day and time conflicts
      else if (frequency !== 'Custom' && existingChamber.frequency !== 'Custom') {
        console.log('🔄 Checking regular frequency conflict');
        // Check if there are common days
        const newDays = frequency === 'Custom' ? [`Custom: ${customDate}`] : selectedDays;
        if (hasCommonDays(newDays, existingChamber.days)) {
          console.log('✅ Found common days!');
          // Check if time ranges overlap
          if (timeRangesOverlap(startTime, endTime, existingChamber.startTime, existingChamber.endTime)) {
            console.log('🚨 CONFLICT DETECTED!');
            const commonDays = newDays.filter(day => existingChamber.days.includes(day));
            conflicts.push({
              chamber: existingChamber,
              reason: 'Overlapping days and time',
              days: commonDays
            });
          } else {
            console.log('⏰ No time overlap');
          }
        } else {
          console.log('📅 No common days');
        }
      }
    }

    console.log('🎯 Total conflicts found:', conflicts.length);

    // If conflicts found, show error and prevent saving
    if (conflicts.length > 0) {
      console.log('⚠️ BLOCKING SAVE DUE TO CONFLICTS');
      const conflictMessages = conflicts.map(c => {
        const days = c.days ? c.days.join(', ') : c.date;
        const time = `${c.chamber.startTime}-${c.chamber.endTime}`;
        const name = c.chamber.chamberName || 'Unknown';
        return `• ${name} (${days}, ${time})`;
      }).join('\n');

      toast.error('Schedule Conflict Detected!', {
        description: `You already have chamber(s) scheduled at this time:\n${conflictMessages}\n\nPlease choose a different day or time.`,
        duration: 8000,
      });

      // Show detailed alert
      alert(
        `⚠️ SCHEDULE CONFLICT DETECTED!\n\n` +
        `You already have chamber(s) scheduled at this time:\n\n` +
        `${conflictMessages}\n\n` +
        `New Schedule: ${frequency === 'Custom' ? customDate : selectedDays.join(', ')} (${startTime}-${endTime})\n\n` +
        `❌ A doctor cannot be in two places at the same time!\n` +
        `Please choose a different day or time slot.`
      );
      
      return;
    }

    console.log('✅ No conflicts detected, proceeding to save...');

    // Create schedule object (remove undefined values for Firestore)
    const newSchedule: any = {
      id: editingScheduleId || Date.now(),
      days: frequency === 'Custom' ? [`Custom: ${customDate}`] : selectedDays,
      frequency,
      chamberName,
      chamberAddress,
      startTime,
      endTime,
      maxCapacity,
      isActive: editingScheduleId ? demoSchedules.find(s => s.id === editingScheduleId)?.isActive ?? true : true,
      createdAt: editingScheduleId ? demoSchedules.find(s => s.id === editingScheduleId)?.createdAt : Date.now(),
    };
    
    // Only add optional fields if they have values (Firestore doesn't accept undefined)
    if (frequencyStartDate) {
      newSchedule.frequencyStartDate = frequencyStartDate;
    }
    if (customDate) {
      newSchedule.customDate = customDate;
    }
    if (clinicCode && clinicCode.trim()) {
      newSchedule.clinicCode = clinicCode.trim();
    }
    if (resolvedClinicId) {
      newSchedule.clinicId = resolvedClinicId;
    }

    // Add or update schedule
    let updatedSchedules;
    if (editingScheduleId) {
      updatedSchedules = demoSchedules.map(s => {
        if (s.id === editingScheduleId) {
          return newSchedule;
        }
        // Clean existing schedules to remove undefined values
        const cleanSchedule: any = {
          id: s.id,
          days: s.days,
          frequency: s.frequency,
          chamberName: s.chamberName,
          chamberAddress: s.chamberAddress,
          startTime: s.startTime,
          endTime: s.endTime,
          maxCapacity: s.maxCapacity,
          isActive: s.isActive ?? true,
          createdAt: s.createdAt,
        };
        if (s.frequencyStartDate) cleanSchedule.frequencyStartDate = s.frequencyStartDate;
        if (s.customDate) cleanSchedule.customDate = s.customDate;
        if (s.clinicCode) cleanSchedule.clinicCode = s.clinicCode;
        if (s.clinicId) cleanSchedule.clinicId = s.clinicId;
        return cleanSchedule;
      });
      setDemoSchedules(updatedSchedules);
      
      // Save to Firestore
      if (doctorId && db) {
        try {
          console.log('💾 Updating schedule in Firestore:', { doctorId, chambers: updatedSchedules });
          await updateDoc(doc(db, 'doctors', doctorId), {
            chambers: updatedSchedules,
            updatedAt: serverTimestamp()
          });
          console.log('✅ Schedule updated successfully in Firestore');
        } catch (error) {
          console.error('❌ Error updating schedule:', error);
          toast.error('Failed to save to database');
          return;
        }
      } else {
        console.error('❌ Cannot update: doctorId or db is missing', { doctorId: !!doctorId, db: !!db });
        toast.error('Authentication error - Please refresh and try again');
        return;
      }
      
      toast.success('Schedule Updated Successfully', {
        description: `Your ${frequency.toLowerCase()} schedule has been updated.`,
        duration: 5000,
      });
      setEditingScheduleId(null);
    } else {
      // Clean all existing schedules before adding new one
      const cleanedExisting = demoSchedules.map(s => {
        const cleanSchedule: any = {
          id: s.id,
          days: s.days,
          frequency: s.frequency,
          chamberName: s.chamberName,
          chamberAddress: s.chamberAddress,
          startTime: s.startTime,
          endTime: s.endTime,
          maxCapacity: s.maxCapacity,
          isActive: s.isActive ?? true,
          createdAt: s.createdAt,
        };
        if (s.frequencyStartDate) cleanSchedule.frequencyStartDate = s.frequencyStartDate;
        if (s.customDate) cleanSchedule.customDate = s.customDate;
        if (s.clinicCode) cleanSchedule.clinicCode = s.clinicCode;
        if (s.clinicId) cleanSchedule.clinicId = s.clinicId;
        return cleanSchedule;
      });
      
      updatedSchedules = [...cleanedExisting, newSchedule];
      setDemoSchedules(updatedSchedules);
      
      // Save to Firestore
      if (doctorId && db) {
        try {
          console.log('💾 Saving schedule to Firestore:', { doctorId, chambers: updatedSchedules });
          await updateDoc(doc(db, 'doctors', doctorId), {
            chambers: updatedSchedules,
            updatedAt: serverTimestamp()
          });
          console.log('✅ Schedule saved successfully to Firestore');
        } catch (error) {
          console.error('❌ Error saving schedule:', error);
          toast.error('Failed to save to database');
          return;
        }
      } else {
        console.error('❌ Cannot save: doctorId or db is missing', { doctorId: !!doctorId, db: !!db });
        toast.error('Authentication error - Please refresh and try again');
        return;
      }
      
      toast.success('Schedule Saved Successfully', {
        description: `Your ${frequency.toLowerCase()} schedule has been created and is now active.`,
        duration: 5000,
      });
    }

    // Reset form
    handleReset();
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Calculate duration in days
  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handlePlannedOffSave = () => {
    if (plannedOffEnabled) {
      // Validate dates before showing confirmation
      if (!startDate || !endDate) {
        toast.error('Please select both start and end dates');
        return;
      }

      // Check if start date is today or in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedStart = new Date(startDate);
      selectedStart.setHours(0, 0, 0, 0);

      if (selectedStart <= today) {
        toast.error('Cannot Select Current Day', {
          description: 'Planned Off can only start from tomorrow onwards. Current day bookings must be cancelled individually.',
          duration: 6000,
        });
        return;
      }

      // Check if end date is before start date
      const selectedEnd = new Date(endDate);
      if (selectedEnd < selectedStart) {
        toast.error('End date must be after start date');
        return;
      }

      setShowConfirmModal(true);
    } else {
      // Save without confirmation when turning off
    }
  };

  const handleConfirmPlannedOff = async () => {
    if (!doctorId || !db) {
      toast.error('Authentication error');
      return;
    }

    try {
      const now = new Date();
      const createdDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const createdTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      
      // Add new active period to the list
      const newPeriod = {
        id: Date.now(),
        startDate: startDate,
        endDate: endDate,
        createdDate: createdDate,
        createdTime: createdTime,
        status: 'active' as const,
        deactivatedDate: null,
      };
      
      const updatedPeriods = [newPeriod, ...allPeriods];
      setAllPeriods(updatedPeriods);

      // Save to Firestore - both collections
      await updateDoc(doc(db, 'doctors', doctorId), {
        plannedOffPeriods: updatedPeriods,
        globalBookingEnabled: false,
        updatedAt: serverTimestamp()
      });
      
      // Also save to schedules collection for clinic QR flow
      await setDoc(doc(db, 'schedules', doctorId), {
        plannedOffPeriods: updatedPeriods,
        globalBookingEnabled: false,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // ============================================
      // 📤 SEND CANCELLATION TO ALL AFFECTED PATIENTS
      // ============================================
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const bookingsRef = collection(db, 'bookings');
      
      // Generate all dates in the blocked range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const blockedDates: string[] = [];
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        blockedDates.push(dateStr);
      }
      
      console.log(`📤 Global Planned Off: Blocking dates:`, blockedDates);

      // Query all bookings in the blocked date range
      let totalAffectedBookings = 0;
      
      for (const dateStr of blockedDates) {
        const dateBookingsQuery = query(
          bookingsRef,
          where('doctorId', '==', doctorId),
          where('appointmentDate', '==', dateStr),
          where('isCancelled', '==', false)
        );

        const bookingsSnap = await getDocs(dateBookingsQuery);
        console.log(`📊 Found ${bookingsSnap.size} active bookings for ${dateStr}`);

        // Collect patients for batch notification
        const patientsToNotify: Array<{ phone: string; name: string }> = [];

        // Send cancellation notification to each patient
        for (const bookingDoc of bookingsSnap.docs) {
          const booking = bookingDoc.data();
          try {
            // Update booking with cancellation type
            await updateDoc(doc(db, 'bookings', bookingDoc.id), {
              isCancelled: true,
              status: 'cancelled',
              cancellationType: 'GLOBAL TOGGLE',
              cancelledBy: 'doctor',
              cancellationReason: 'global_planned_off'
            });

            // Collect patient info for batch notification
            // 🔓 Decrypt patient data for notification
            const patientName = decrypt((booking as any).patientName_encrypted || booking.patientName || 'Patient');
            const whatsappNumber = decrypt((booking as any).whatsappNumber_encrypted || booking.whatsappNumber || '');
            
            if (whatsappNumber || booking.phone) {
              patientsToNotify.push({
                phone: whatsappNumber || booking.phone,
                name: patientName,
              });
            }

            console.log('✅ Booking cancelled for', {
              bookingId: bookingDoc.id,
              patient: patientName,
              appointmentDate: dateStr
            });
            totalAffectedBookings++;
          } catch (error) {
            console.error(`❌ Failed to cancel booking for ${booking.patientName}:`, error);
          }
        }

        // ============================================
        // 🔔 SEND BATCH CANCELLATION NOTIFICATIONS
        // ============================================
        if (patientsToNotify.length > 0) {
          try {
            const { sendBatchCancellation } = await import('../services/notificationService');
            const doctorId = localStorage.getItem('userId') || '';
            const doctorName = localStorage.getItem('healqr_user_name') || 'Doctor';
            const doctorPhoto = localStorage.getItem('healqr_profile_photo') || '';
            const doctorSpecialty = localStorage.getItem('healqr_specialty') || '';
            
            const result = await sendBatchCancellation(
              patientsToNotify,
              { doctorId, doctorName, doctorPhoto, doctorSpecialty },
              'All Chambers',
              'global'
            );
            console.log(`✅ Global cancellation notifications for ${dateStr}: ${result.sent} sent, ${result.failed} failed`);
          } catch (notifError) {
            console.warn('⚠️ Batch cancellation notification error:', notifError);
          }
        }
      }
      
      setShowConfirmModal(false);
      
      // Return toggle to OFF/normal stage and reset dates for next entry
      setPlannedOffEnabled(false);
      setStartDate('');
      setEndDate('');
      
      // Show success toast
      toast.success('Global Off Period Saved', {
        description: `Bookings blocked from ${formatDate(startDate)} to ${formatDate(endDate)}. ${totalAffectedBookings} booking(s) marked as cancelled. Patient notifications are temporarily disabled.`,
        duration: 6000,
      });
    } catch (error) {
      console.error('Error saving planned off:', error);
      toast.error('Failed to save planned off period');
    }
  };

  const handleDeletePlannedOff = async () => {
    if (periodToDelete === null || !doctorId || !db) return;
    
    try {
      const now = new Date();
      const deactivationDate = now.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
      
      // Find the period being deactivated
      const periodToDeactivate = allPeriods.find(p => p.id === periodToDelete);
      if (!periodToDeactivate) return;
      
      // Update the period status to deactivated
      const updatedPeriods = allPeriods.map(period => 
        period.id === periodToDelete 
          ? { ...period, status: 'deactivated' as const, deactivatedDate: deactivationDate }
          : period
      );
      
      setAllPeriods(updatedPeriods);

      // Check if there are any remaining active periods
      const hasActivePeriodsLeft = updatedPeriods.some(p => p.status === 'active');

      // Save to Firestore - both collections
      await updateDoc(doc(db, 'doctors', doctorId), {
        plannedOffPeriods: updatedPeriods,
        globalBookingEnabled: hasActivePeriodsLeft ? false : true,
        updatedAt: serverTimestamp()
      });
      
      // Also save to schedules collection for clinic QR flow
      await setDoc(doc(db, 'schedules', doctorId), {
        plannedOffPeriods: updatedPeriods,
        globalBookingEnabled: hasActivePeriodsLeft ? false : true,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // ============================================
      // 📤 SEND RESTORATION TO ALL AFFECTED PATIENTS
      // ============================================
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const bookingsRef = collection(db, 'bookings');
      
      // Generate all dates in the deactivated range
      const start = new Date(periodToDeactivate.startDate);
      const end = new Date(periodToDeactivate.endDate);
      const restoredDates: string[] = [];
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        restoredDates.push(dateStr);
      }
      
      console.log(`📤 Global Planned Off Deactivated: Restoring dates:`, restoredDates);

      // Query all bookings in the restored date range
      let totalRestorationNotices = 0;

      for (const dateStr of restoredDates) {
        const dateBookingsQuery = query(
          bookingsRef,
          where('doctorId', '==', doctorId),
          where('appointmentDate', '==', dateStr)
        );

        const bookingsSnap = await getDocs(dateBookingsQuery);
        console.log(`📊 Found ${bookingsSnap.size} bookings for ${dateStr} to restore`);

        // Collect patients for batch restoration notification
        const patientsToNotify: Array<{ phone: string; name: string }> = [];

        bookingsSnap.docs.forEach(bookingDoc => {
          const booking = bookingDoc.data();
          
          // Collect patient info for batch notification
          // 🔓 Decrypt patient data for notification
          const patientName = decrypt((booking as any).patientName_encrypted || booking.patientName || 'Patient');
          const whatsappNumber = decrypt((booking as any).whatsappNumber_encrypted || booking.whatsappNumber || '');
          
          if (whatsappNumber || booking.phone) {
            patientsToNotify.push({
              phone: whatsappNumber || booking.phone,
              name: patientName,
            });
          }

          console.log('✅ Booking will be restored for', {
            bookingId: bookingDoc.id,
            patient: patientName,
            appointmentDate: dateStr
          });
          totalRestorationNotices++;
        });

        // ============================================
        // 🔔 SEND BATCH RESTORATION NOTIFICATIONS
        // ============================================
        if (patientsToNotify.length > 0) {
          try {
            const { sendBatchRestoration } = await import('../services/notificationService');
            const doctorId = localStorage.getItem('userId') || '';
            const doctorName = localStorage.getItem('healqr_user_name') || 'Doctor';
            const doctorPhoto = localStorage.getItem('healqr_profile_photo') || '';
            const doctorSpecialty = localStorage.getItem('healqr_specialty') || '';
            
            const result = await sendBatchRestoration(
              patientsToNotify,
              { doctorId, doctorName, doctorPhoto, doctorSpecialty },
              'All Chambers',
              'global'
            );
            console.log(`✅ Global restoration notifications for ${dateStr}: ${result.sent} sent, ${result.failed} failed`);
          } catch (notifError) {
            console.warn('⚠️ Batch restoration notification error:', notifError);
          }
        }
      }
      
      setShowDeleteModal(false);
      setPeriodToDelete(null);
      
      // Show success toast
      toast.success('Planned Off Period Deactivated', {
        description: `${totalRestorationNotices} booking(s) restored and patients notified. All chambers are now active.`,
        duration: 6000,
      });
    } catch (error) {
      console.error('Error deactivating planned off:', error);
      toast.error('Failed to deactivate planned off period');
    }
  };

  const handleSaveMaxAdvanceDays = async () => {
    console.log('💾 Attempting to save max advance days:', { doctorId, db: !!db, maxAdvanceDays });
    
    if (!doctorId || !db) {
      console.error('❌ Cannot save max advance days: doctorId or db missing', { doctorId, db: !!db });
      toast.error('Authentication error - Please refresh the page and try again');
      return;
    }

    const days = parseInt(maxAdvanceDays);
    if (isNaN(days) || days < 1 || days > 365) {
      toast.error('Please enter a valid number between 1 and 365');
      return;
    }

    try {
      console.log('💾 Saving max advance days to Firestore:', { doctorId, days });
      await updateDoc(doc(db, 'doctors', doctorId), {
        maxAdvanceBookingDays: days,
        updatedAt: serverTimestamp()
      });
      
      // Also save to schedules collection for clinic QR flow
      await setDoc(doc(db, 'schedules', doctorId), {
        maxAdvanceDays: days,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      console.log('✅ Max advance days saved successfully to both collections');
      toast.success('Settings Saved Successfully', {
        description: `Patients can now book appointments up to ${days} days in advance.`,
        duration: 5000,
      });
    } catch (error) {
      console.error('❌ Error saving max advance days:', error);
      toast.error('Failed to save settings');
    }
  };

  const handleToggleChamber = async (id: number) => {
    if (!doctorId || !db) {
      toast.error('Authentication error');
      return;
    }

    const chamber = demoSchedules.find(s => s.id === id);
    if (!chamber) return;

    // If chamber is currently active (turning OFF), check for seen patients first
    if (chamber.isActive !== false) {
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');

        // Get today's bookings for this chamber
        const today = new Date();
        const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        
        const bookingsRef = collection(db, 'bookings');
        const numericChamberId = typeof chamber.id === 'string' ? parseInt(chamber.id, 10) : chamber.id;
        
        // Query ALL bookings for this chamber (including cancelled ones for accurate count)
        const chamberBookingsQuery = query(
          bookingsRef,
          where('chamberId', '==', numericChamberId),
          where('appointmentDate', '==', todayStr)
        );

        const allBookingsSnap = await getDocs(chamberBookingsQuery);
        
        // Filter only non-cancelled bookings for validation
        const bookingsSnap = {
          docs: allBookingsSnap.docs.filter(doc => !doc.data().isCancelled)
        };
        
        console.log('🔍 [ScheduleManager] Chamber Toggle Validation:', {
          chamberId: numericChamberId,
          chamberName: chamber.chamberName,
          totalBookings: bookingsSnap.docs.length,
          todayStr,
        });
        
        // Separate seen and non-seen patients with detailed logging
        const seenPatients = bookingsSnap.docs.filter(doc => {
          const isMarkedSeen = doc.data().isMarkedSeen === true;
          return isMarkedSeen;
        });
        
        const nonSeenPatients = bookingsSnap.docs.filter(doc => {
          const isMarkedSeen = doc.data().isMarkedSeen;
          return isMarkedSeen !== true; // Not seen (false, undefined, or null)
        });
        
        // Log each patient's status
        bookingsSnap.docs.forEach(doc => {
          const data = doc.data();
          console.log('👤 Patient:', {
            name: data.patientName,
            bookingId: data.bookingId,
            isMarkedSeen: data.isMarkedSeen,
            isCancelled: data.isCancelled,
          });
        });
        
        console.log('📊 Patient Status:', {
          seenCount: seenPatients.length,
          nonSeenCount: nonSeenPatients.length,
        });
        
        // Block toggle only if MIXED state (both seen and non-seen exist)
        if (seenPatients.length > 0 && nonSeenPatients.length > 0) {
          console.log('❌ BLOCKING: Mixed state detected');
          toast.error('Cannot Suspend Chamber', {
            description: `${seenPatients.length} SEEN + ${nonSeenPatients.length} NON-SEEN patients. Cancel non-seen individually or mark all as seen first.`,
            duration: 7000,
          });
          return;
        }
        
        console.log('✅ ALLOWING: All patients same state');
        // Allow if all patients are seen (no cancellations needed) or all non-seen (will cancel all)
      } catch (error) {
        console.error('Error checking chamber patients:', error);
        toast.error('Failed to check patient status');
        return;
      }
    }

    // All patients are non-seen or chamber is being reactivated, proceed with toggle
    const updatedSchedules = demoSchedules.map(s => 
      s.id === id ? { ...s, isActive: s.isActive === false ? true : false } : s
    );
    
    setDemoSchedules(updatedSchedules);
    
    try {
      await updateDoc(doc(db, 'doctors', doctorId), {
        chambers: updatedSchedules,
        updatedAt: serverTimestamp()
      });
      
      const updatedChamber = updatedSchedules.find(s => s.id === id);
      const isActive = updatedChamber?.isActive !== false;
      
      toast.success(
        isActive ? 'Chamber Activated' : 'Chamber Deactivated',
        {
          description: isActive 
            ? `${updatedChamber?.chamberName} is now accepting bookings.`
            : `${updatedChamber?.chamberName} bookings are now disabled.`,
          duration: 5000,
        }
      );
    } catch (error) {
      console.error('Error toggling chamber:', error);
      toast.error('Failed to update chamber status');
      // Revert state on error
      setDemoSchedules(demoSchedules);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Sidebar */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeMenu="schedule"
        onMenuChange={onMenuChange || (() => {})}
        onLogout={onLogout}
        activeAddOns={activeAddOns}
      />

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <div className="border-b border-gray-800 bg-[#0a0f1a]/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="px-4 lg:px-8 py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden lg:block">
              <h1 className="text-white">Schedule Manager</h1>
              <p className="text-gray-400 text-sm mt-1">Manage your practice schedules and availability</p>
            </div>
          </div>
        </div>

        {/* Mobile Page Title */}
        <div className="lg:hidden px-4 py-6 border-b border-gray-800">
          <h1 className="text-white">Schedule Manager</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your practice schedules and availability</p>
        </div>

        {/* Content */}
        <div className="px-4 lg:px-8 py-8">
          {/* Section 1: Global Settings */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-white">Global Settings</h2>
              <p className="text-gray-400 text-sm hidden md:block">Configure general availability and booking settings</p>
            </div>
            <p className="text-gray-400 text-sm md:hidden mb-6">Configure general availability and booking settings</p>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT CARD - Planned Off */}
              <Card className="bg-gray-800/50 border-gray-700 p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white">Planned Off</h3>
                  {plannedOffEnabled && (
                    <Switch
                      id="planned-off-header"
                      checked={plannedOffEnabled}
                      onCheckedChange={setPlannedOffEnabled}
                    />
                  )}
                </div>
                <p className="text-gray-400 text-sm mb-6">
                  {hasActivePeriods
                    ? "You have active planned off periods. View history to manage or deactivate them."
                    : plannedOffEnabled 
                    ? "When enabled, your QR code will be deactivated and new bookings will be disabled"
                    : "When enabled, your QR code will be temporarily deactivated and patients will not be able to book appointments. Use this during vacations or planned leaves."
                  }
                </p>

                <div className="space-y-4">
                  {/* Status Indicator */}
                  {hasActivePeriods ? (
                    <div className="py-3 px-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-red-400 text-sm">Bookings Blocked - {allPeriods.filter(p => p.status === 'active').length} Active Period{allPeriods.filter(p => p.status === 'active').length > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  ) : plannedOffEnabled ? (
                    <div className="py-3 px-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-red-400 text-sm">QR Code Inactive - Select Dates</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-3 px-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-emerald-400 text-sm">QR Code Active - Accepting Bookings</span>
                      </div>
                    </div>
                  )}

                  {!plannedOffEnabled && (
                    <>
                      {/* Toggle Switch */}
                      <div className="flex items-center justify-between py-3 px-4 bg-gray-900/50 rounded-lg">
                        <Label htmlFor="planned-off" className="text-gray-300 text-sm cursor-pointer">
                          Enable Planned Off
                        </Label>
                        <Switch
                          id="planned-off"
                          checked={plannedOffEnabled}
                          onCheckedChange={setPlannedOffEnabled}
                        />
                      </div>

                      {/* Buttons Row */}
                      <div className="flex items-center justify-between pt-2">
                        {/* View History Button - Shows when there are any periods */}
                        {allPeriods.length > 0 && (
                          <Button 
                            onClick={() => setShowHistoryModal(true)}
                            variant="outline"
                            className="border-gray-700 text-gray-300 hover:bg-gray-900 hover:text-white"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            VIEW HISTORY
                          </Button>
                        )}
                        
                        {/* Save Button - Always available when toggle is off */}
                        {!hasActivePeriods && (
                          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white ml-auto">
                            SAVE
                          </Button>
                        )}
                      </div>
                    </>
                  )}

                  {/* Date Selection - Shows when enabled */}
                  {plannedOffEnabled && (
                    <div className="space-y-4 pt-2">
                      <div className="bg-gray-900/30 border border-gray-700 rounded-lg p-4">
                        <h4 className="text-white text-sm mb-2">Select Off Period</h4>
                        <p className="text-gray-400 text-sm mb-4">
                          Choose the date range when bookings should be blocked
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Start Date */}
                          <div className="space-y-2">
                            <Label htmlFor="start-date" className="text-gray-300 text-sm">
                              Start Date
                            </Label>
                            <div className="relative">
                              <Input
                                id="start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                className="bg-gray-900/50 border-gray-700 text-white pr-10"
                              />
                              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                          </div>

                          {/* End Date */}
                          <div className="space-y-2">
                            <Label htmlFor="end-date" className="text-gray-300 text-sm">
                              End Date
                            </Label>
                            <div className="relative">
                              <Input
                                id="end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate || new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                className="bg-gray-900/50 border-gray-700 text-white pr-10"
                              />
                              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Save Button */}
                      <div className="flex justify-end pt-2">
                        <Button 
                          onClick={handlePlannedOffSave}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          SAVE
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* RIGHT CARD - Maximum Advance Booking Days */}
              <Card className="bg-gray-800/50 border-gray-700 p-6">
                <h3 className="text-white mb-2">Maximum Advance Booking Days</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Set how far in advance patients can book appointments. For example, if set to 30 days, patients can only book appointments up to 30 days from today.
                </p>

                <div className="space-y-4">
                  {/* Input Field */}
                  <div className="space-y-2">
                    <Label htmlFor="max-days" className="text-gray-300 text-sm">
                      Maximum Days
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="max-days"
                        type="number"
                        value={maxAdvanceDays}
                        onChange={(e) => setMaxAdvanceDays(e.target.value)}
                        className="bg-gray-900/50 border-gray-700 text-white flex-1"
                        min="1"
                        max="365"
                      />
                      <span className="text-gray-400 text-sm min-w-[40px]">days</span>
                    </div>
                  </div>

                  {/* Info Message */}
                  <div className="flex items-start gap-2 py-3 px-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-400 text-sm">
                      Patients will see available slots only within the next {maxAdvanceDays} days in their booking calendar.
                    </p>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveMaxAdvanceDays} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      SAVE
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Section 2: Schedule Maker */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-white">Schedule Maker</h2>
              <p className="text-gray-400 text-sm hidden md:block">Create new practice schedules</p>
            </div>
            <p className="text-gray-400 text-sm md:hidden mb-6">Create new practice schedules</p>

            <Card className="bg-gray-800/50 border-gray-700 p-6">
              <div className="space-y-6">
                {/* Select Days */}
                <div className="space-y-3">
                  <Label className="text-gray-300 text-sm">Select Days</Label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {days.map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`
                          py-3 px-2 rounded-lg text-sm transition-all
                          ${selectedDays.includes(day)
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-900/50 text-gray-400 hover:bg-gray-900 hover:text-gray-300'
                          }
                        `}
                      >
                        {day.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frequency */}
                <div className="space-y-2">
                  <Label htmlFor="frequency" className="text-gray-300 text-sm">
                    Frequency
                  </Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger id="frequency" className="bg-gray-900/50 border-gray-700 text-white">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Daily">Daily</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date for Bi-Weekly and Monthly */}
                {(frequency === 'Bi-Weekly' || frequency === 'Monthly') && (
                  <div className="space-y-2">
                    <Label htmlFor="frequency-start-date" className="text-gray-300 text-sm">
                      Start Date
                    </Label>
                    <div className="relative">
                      <Input
                        id="frequency-start-date"
                        type="date"
                        value={frequencyStartDate}
                        onChange={(e) => setFrequencyStartDate(e.target.value)}
                        className="bg-gray-900/50 border-gray-700 text-white pr-10"
                      />
                      <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="flex items-start gap-2 py-2 px-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-blue-400 text-sm">
                        {frequency === 'Bi-Weekly' 
                          ? 'This helps the system understand your bi-weekly schedule cycle. For example, if you select Tuesday and set start date as 2/11/25, the next schedule will be on the following Tuesday (2 weeks later).'
                          : 'This helps the system understand your monthly schedule cycle. The schedule will repeat on the same day of the month from this start date.'
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Custom Date for Camp Purpose */}
                {frequency === 'Custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="custom-date" className="text-gray-300 text-sm">
                      Select Date
                    </Label>
                    <div className="relative">
                      <Input
                        id="custom-date"
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="bg-gray-900/50 border-gray-700 text-white pr-10"
                      />
                      <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="flex items-start gap-2 py-2 px-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-blue-400 text-sm">
                        Custom frequency is designed for one-time events like medical camps or special consultation days.
                      </p>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button 
                        onClick={handleSaveSchedule}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        SAVE
                      </Button>
                    </div>
                  </div>
                )}

                {/* Chamber Name & Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 w-full">
                    <Label htmlFor="chamber-name" className="text-gray-300 text-sm">
                      Chamber Name
                    </Label>
                    <Input
                      id="chamber-name"
                      value={chamberName}
                      onChange={(e) => setChamberName(e.target.value)}
                      className="bg-gray-900/50 border-gray-700 text-white w-full"
                      placeholder="Enter chamber name"
                    />
                  </div>
                  <div className="space-y-2 w-full">
                    <Label htmlFor="chamber-address" className="text-gray-300 text-sm">
                      Chamber Address
                    </Label>
                    <Input
                      id="chamber-address"
                      value={chamberAddress}
                      onChange={(e) => setChamberAddress(e.target.value)}
                      className="bg-gray-900/50 border-gray-700 text-white w-full"
                      placeholder="Enter chamber address"
                    />
                  </div>
                </div>

                {/* Clinic Code (Optional) */}
                <div className="space-y-2 w-full">
                  <Label htmlFor="clinic-code" className="text-gray-300 text-sm flex items-center gap-2">
                    Clinic Code <span className="text-gray-500 text-xs">(Optional)</span>
                  </Label>
                  <Input
                    id="clinic-code"
                    value={clinicCode}
                    onChange={(e) => setClinicCode(e.target.value)}
                    className="bg-gray-900/50 border-gray-700 text-white w-full"
                    placeholder="Enter clinic code to link this chamber"
                  />
                  <p className="text-xs text-gray-500">
                    If this chamber is for a specific clinic, enter their clinic code here
                  </p>
                </div>

                {/* Start Time & End Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 w-full">
                    <Label htmlFor="start-time" className="text-gray-300 text-sm">
                      Start Time
                    </Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-gray-900/50 border-gray-700 text-white w-full"
                      placeholder="--:--"
                    />
                  </div>
                  <div className="space-y-2 w-full">
                    <Label htmlFor="end-time" className="text-gray-300 text-sm">
                      End Time
                    </Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-gray-900/50 border-gray-700 text-white w-full"
                      placeholder="--:--"
                    />
                  </div>
                </div>

                {/* Maximum Booking Capacity */}
                <div className="space-y-2">
                  <Label htmlFor="max-capacity" className="text-gray-300 text-sm">
                    Maximum Booking Capacity
                  </Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMaxCapacity(Math.max(1, maxCapacity - 1))}
                      className="w-10 h-10 flex items-center justify-center bg-gray-900/50 border border-gray-700 rounded-lg hover:bg-gray-900 transition-colors"
                    >
                      <Minus className="w-4 h-4 text-gray-400" />
                    </button>
                    <Input
                      id="max-capacity"
                      type="number"
                      min="1"
                      max="500"
                      value={maxCapacity}
                      onChange={(e) => setMaxCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 py-2 px-4 bg-gray-900/50 border border-gray-700 text-white text-center"
                    />
                    <span className="text-gray-400 text-sm whitespace-nowrap">patient/s</span>
                    <button
                      type="button"
                      onClick={() => setMaxCapacity(maxCapacity + 1)}
                      className="w-10 h-10 flex items-center justify-center bg-gray-900/50 border border-gray-700 rounded-lg hover:bg-gray-900 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <div className="flex items-start gap-2 py-3 px-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mt-2">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-400 text-sm">
                      Maximum number of patients that can book for this schedule
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4">
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="border-gray-700 text-gray-300 hover:bg-gray-900 hover:text-white"
                  >
                    RESET
                  </Button>
                  <Button 
                    onClick={handleSaveSchedule}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {editingScheduleId ? 'UPDATE SCHEDULE' : 'SAVE SCHEDULE'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Section 3: View Schedules */}
          <div>
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-white">View Schedules</h2>
              <p className="text-gray-400 text-sm hidden md:block">Manage your existing schedules</p>
            </div>
            <p className="text-gray-400 text-sm md:hidden mb-6">Manage your existing schedules</p>

            {demoSchedules.length === 0 ? (
              /* Empty State */
              <Card className="bg-gray-800/50 border-gray-700 p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 mb-4 flex items-center justify-center">
                    <Calendar className="w-16 h-16 text-gray-600" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-white mb-2">No Schedules Created</h3>
                  <p className="text-gray-400 text-sm">
                    Create your first schedule using the form above
                  </p>
                </div>
              </Card>
            ) : (
              /* Schedule Cards */
              <div className="space-y-4">
                {demoSchedules.map((schedule) => (
                  <Card key={schedule.id} className="bg-gray-800/50 border-gray-700 p-6">
                    <div className="space-y-4">
                      {/* Header with Days Pills and Toggle */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-wrap gap-2 flex-1">
                          {schedule.days.map((day) => (
                            <span
                              key={day}
                              className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-sm"
                            >
                              {day}
                            </span>
                          ))}
                          <span className="px-3 py-1 bg-gray-700/50 border border-gray-600 rounded-full text-gray-400 text-sm">
                            {schedule.frequency}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-sm ${schedule.isActive !== false ? 'text-emerald-400' : 'text-gray-500'}`}>
                            {schedule.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                          <Switch
                            checked={schedule.isActive !== false}
                            onCheckedChange={() => handleToggleChamber(schedule.id)}
                          />
                        </div>
                      </div>

                      {/* Chamber Info */}
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-white text-sm">{schedule.chamberName}</p>
                            <p className="text-gray-400 text-sm">{schedule.chamberAddress}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-white text-sm">
                              {schedule.startTime} - {schedule.endTime}
                            </p>
                            <p className="text-gray-400 text-sm">Working Hours</p>
                          </div>
                        </div>
                      </div>

                      {/* Capacity & Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-gray-400" />
                          <span className="text-white text-sm">{schedule.maxCapacity}</span>
                          <span className="text-gray-400 text-sm">patients/day</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleEditSchedule(schedule)}
                            variant="outline"
                            size="sm"
                            className="border-gray-700 text-gray-300 hover:bg-gray-900 hover:text-white"
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            EDIT
                          </Button>
                          <Button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-900/50 text-red-400 hover:bg-red-950 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            DELETE
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-center pb-6 border-b border-gray-800">
              Professional Acknowledgment Required
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirm your planned off period and review the impact on patient bookings
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            {/* Check Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
            </div>

            {/* Confirmation Message */}
            <div className="text-center space-y-3">
              <h3 className="text-white">Confirm Planned Off Period</h3>
              <p className="text-gray-300 text-sm">
                You are about to block bookings from{' '}
                <span className="text-emerald-400">{formatDate(startDate)}</span> to{' '}
                <span className="text-emerald-400">{formatDate(endDate)}</span>.
              </p>
            </div>

            {/* Information Points */}
            <div className="space-y-3">
              <p className="text-gray-300 text-sm">For this period:</p>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-gray-500 mt-1">•</span>
                  <span>Your QR code will be deactivated</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-500 mt-1">•</span>
                  <span>New bookings will be disabled</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-500 mt-1">•</span>
                  <span>Cancellation messages will be sent to affected patients</span>
                </li>
              </ul>
            </div>

            {/* Note */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
              <p className="text-emerald-400 text-sm">
                <span className="text-emerald-300">Note:</span> Other activities will remain the same (like viewing reports, slot editing, etc.)
              </p>
            </div>

            {/* Warning */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
              <p className="text-emerald-400 text-sm">
                This action affects patient care and should be used responsibly.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button
              onClick={() => setShowConfirmModal(false)}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white min-w-[120px]"
            >
              CANCEL
            </Button>
            <Button
              onClick={handleConfirmPlannedOff}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[180px]"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              CONFIRM & SAVE
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              Planned Off History
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              View all your scheduled and past planned off periods (Last 5 entries)
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {/* History List - Show last 5 items */}
            <div className="space-y-3">
              {allPeriods.slice(0, 5).map((period) => (
                <Card key={period.id} className={`bg-gray-800/50 ${
                  period.status === 'active' ? 'border-emerald-500/30' : 
                  period.status === 'deactivated' ? 'border-red-500/20' : 
                  'border-gray-700'
                } p-4`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white mb-1">{formatDate(period.startDate)} - {formatDate(period.endDate)}</h4>
                      <p className="text-gray-400 text-sm">Created on {period.createdDate}, {period.createdTime}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 ${
                        period.status === 'active' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
                        period.status === 'deactivated' ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
                        'bg-gray-700/50 border border-gray-600 text-gray-400'
                      } rounded-full text-sm`}>
                        {period.status === 'active' ? 'Active' : 
                         period.status === 'deactivated' ? 'Deactivated' : 
                         'Completed'}
                      </span>
                      {period.status === 'active' && (
                        <button
                          onClick={() => {
                            setPeriodToDelete(period.id);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-white text-sm mb-2">Duration: {calculateDuration(period.startDate, period.endDate)} days</p>
                  {period.deactivatedDate && (
                    <p className="text-red-400 text-sm">
                      Deactivated on {period.deactivatedDate}
                    </p>
                  )}
                </Card>
              ))}

              {allPeriods.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No planned off periods yet
                </div>
              )}
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t border-gray-800">
            <Button
              onClick={() => setShowHistoryModal(false)}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              CLOSE
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal - Step 2 */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-white">Scheduled Time Off</DialogTitle>
            <DialogDescription className="text-gray-300">
              You have the following period blocked for all bookings. You can edit or delete it.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Yellow Warning Box */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="text-yellow-500">A Note on Patient Communication</h4>
                  <p className="text-gray-300 text-sm">
                    When a time-off period is edited or deleted, the system will automatically send restoration notifications to patients who have already received a cancellation message. This ensures seamless communication and professional courtesy without manual intervention.
                  </p>
                </div>
              </div>
            </div>

            {/* Date Range Display */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-white">
                  {periodToDelete !== null 
                    ? `${formatDate(allPeriods.find(p => p.id === periodToDelete)?.startDate || '')} - ${formatDate(allPeriods.find(p => p.id === periodToDelete)?.endDate || '')}`
                    : 'No period selected'
                  }
                </span>
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <Button
              onClick={() => setShowDeleteModal(false)}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white min-w-[100px]"
            >
              CLOSE
            </Button>
            <Button
              onClick={handleDeletePlannedOff}
              className="bg-red-600 hover:bg-red-700 text-white min-w-[120px]"
            >
              GO AHEAD
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
