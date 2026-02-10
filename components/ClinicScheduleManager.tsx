import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase/config';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar as CalendarIcon, Info, Eye, Building2, User, Clock, MapPin, Users, ChevronDown, ChevronUp, Menu } from 'lucide-react';
import ClinicSidebar from './ClinicSidebar';
import { toast } from 'sonner';

interface Doctor {
  uid: string;
  name: string;
  specialty?: string;
  email?: string;
}

interface PlannedOffPeriod {
  id: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  appliesTo: 'clinic' | 'doctor';
  doctorId?: string;
  doctorName?: string;
  clinicId?: string;
  clinicName?: string;
}

interface Chamber {
  id: string;
  days: string[];
  frequency: string;
  frequencyStartDate?: string;
  customDate?: string;
  chamberName: string;
  chamberAddress: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  clinicId?: string; // CRITICAL: Track which clinic owns this chamber
}

interface ClinicScheduleManagerProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
}

const ClinicScheduleManager: React.FC<ClinicScheduleManagerProps> = ({ onMenuChange, onLogout }) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global Off Settings
  const [globalOffScope, setGlobalOffScope] = useState<'clinic' | 'doctor'>('clinic');
  const [plannedOffEnabled, setPlannedOffEnabled] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allPeriods, setAllPeriods] = useState<PlannedOffPeriod[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [chamberSpecificClosure, setChamberSpecificClosure] = useState<'all' | 'specific'>('all'); // all = all chambers, specific = select specific chamber
  const [selectedClosureChamber, setSelectedClosureChamber] = useState<string>(''); // chamber name for specific closure

  // Maximum Advance Days (Per-Doctor)
  const [advanceDaysScope, setAdvanceDaysScope] = useState<'clinic' | 'doctor'>('doctor');
  const [maxAdvanceDays, setMaxAdvanceDays] = useState('30');

  // Schedule Maker
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [frequency, setFrequency] = useState('Daily');
  const [frequencyStartDate, setFrequencyStartDate] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [chamberName, setChamberName] = useState('');
  const [chamberAddress, setChamberAddress] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [maxCapacity, setMaxCapacity] = useState(20);

  // View Schedules
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [expandedChambers, setExpandedChambers] = useState<Set<string>>(new Set());
  const [editingChamberId, setEditingChamberId] = useState<string | null>(null);

  // Clinic Info
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');

  const [loading, setLoading] = useState(true);

  // Load doctors from clinic's linkedDoctorsDetails
  useEffect(() => {
    const loadDoctors = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error('No current user found');
        setLoading(false);
        return;
      }

      try {
        const clinicRef = doc(db, 'clinics', currentUser.uid);
        const clinicSnap = await getDoc(clinicRef);

        if (clinicSnap.exists()) {
          const data = clinicSnap.data();
          const linkedDoctors = data.linkedDoctorsDetails || [];
          setDoctors(linkedDoctors);

          // Auto-fetch clinic info
          const clinicNameValue = data.clinicName || data.name || '';
          const clinicAddressValue = data.address || '';
          setClinicName(clinicNameValue);
          setClinicAddress(clinicAddressValue);

          // Auto-populate chamber fields with clinic info
          setChamberName(clinicNameValue);
          setChamberAddress(clinicAddressValue);

          // Check if there's a pre-selected doctor from ManageDoctors
          const preSelectedDoctorId = localStorage.getItem('selectedDoctorId');

          if (preSelectedDoctorId && linkedDoctors.find((d: Doctor) => d.uid === preSelectedDoctorId)) {
            // Use the pre-selected doctor
            setSelectedDoctorId(preSelectedDoctorId);
            const selectedDoc = linkedDoctors.find((d: Doctor) => d.uid === preSelectedDoctorId);
            setSelectedDoctor(selectedDoc);

            // Clear the localStorage after using it
            localStorage.removeItem('selectedDoctorId');
            localStorage.removeItem('selectedDoctorName');

            // Show toast notification
            toast.success(`Editing schedule for Dr. ${selectedDoc?.name}`);
          } else if (linkedDoctors.length > 0 && !selectedDoctorId) {
            // Auto-select first doctor if no pre-selection
            setSelectedDoctorId(linkedDoctors[0].uid);
            setSelectedDoctor(linkedDoctors[0]);
          }
        } else {
          console.error('Clinic document not found');
          toast.error('Clinic data not found');
        }
      } catch (error) {
        console.error('Error loading doctors:', error);
        toast.error('Failed to load doctors');
      } finally {
        setLoading(false);
      }
    };

    loadDoctors();
  }, []);

  // Function to load doctor data (moved outside useEffect so it can be called from anywhere)
  const loadDoctorData = async () => {
    if (!selectedDoctorId) return;

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const doctorRef = doc(db, 'doctors', selectedDoctorId);
      const doctorSnap = await getDoc(doctorRef);

      if (doctorSnap.exists()) {
        const data = doctorSnap.data();

        // Load planned off periods
        setAllPeriods(data.plannedOffPeriods || []);

        // Load max advance days
        setMaxAdvanceDays(data.maxAdvanceBookingDays || '30');

        // CRITICAL FILTER: Load ONLY chambers belonging to THIS clinic
        const allChambers = data.chambers || [];
        const clinicChambers = allChambers.filter((chamber: Chamber) =>
          chamber.clinicId === currentUser.uid
        );

        console.log('🔒 SECURITY FILTER:', {
          totalChambers: allChambers.length,
          clinicChambers: clinicChambers.length,
          clinicId: currentUser.uid
        });

        setChambers(clinicChambers);
      }
    } catch (error) {
      console.error('Error loading doctor data:', error);
      toast.error('Failed to load schedule data');
    }
  };

  // Load data when doctor is selected
  useEffect(() => {
    if (selectedDoctorId) {
      loadDoctorData();
    }
  }, [selectedDoctorId]);

  const handleDoctorChange = (doctorId: string) => {
    setSelectedDoctorId(doctorId);
    const doctor = doctors.find(d => d.uid === doctorId);
    setSelectedDoctor(doctor || null);

    // Reset form states
    setPlannedOffEnabled(false);
    setStartDate('');
    setEndDate('');
    setSelectedDays([]);
    setFrequency('Daily');
    setChamberSpecificClosure('all');
    setSelectedClosureChamber('');
    // Reset to clinic info
    setChamberName(clinicName);
    setChamberAddress(clinicAddress);
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handlePlannedOffSave = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    if (chamberSpecificClosure === 'specific' && !selectedClosureChamber) {
      toast.error('Please select a chamber for this closure');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const newPeriod: PlannedOffPeriod = {
        id: Date.now().toString(),
        startDate,
        endDate,
        status: 'active',
        createdAt: new Date(),
        appliesTo: globalOffScope,
        ...(globalOffScope === 'doctor' && selectedDoctor && {
          doctorId: selectedDoctor.uid,
          doctorName: selectedDoctor.name,
          clinicId: currentUser.uid,
          clinicName: clinicName
        }),
        ...(globalOffScope === 'clinic' && {
          clinicId: currentUser.uid,
          clinicName: clinicName
        }),
        ...(chamberSpecificClosure === 'specific' && selectedClosureChamber && {
          chamberName: selectedClosureChamber
        })
      };

      if (globalOffScope === 'clinic') {
        // Store in clinic document FIRST (central source of truth)
        const clinicRef = doc(db, 'clinics', currentUser.uid);
        const clinicSnap = await getDoc(clinicRef);

        if (clinicSnap.exists()) {
          // Add to clinic's own planned off periods
          const existingClinicPeriods = clinicSnap.data().plannedOffPeriods || [];
          await updateDoc(clinicRef, {
            plannedOffPeriods: [...existingClinicPeriods, newPeriod]
          });
          
          console.log('✅ Stored in clinic document');

          // Also push to all linked doctors (for backward compatibility)
          const linkedDoctors = clinicSnap.data().linkedDoctorsDetails || [];
          console.log('📋 Also applying to', linkedDoctors.length, 'linked doctors');

          let successCount = 0;
          let errorCount = 0;

          for (const doctor of linkedDoctors) {
            try {
              const doctorRef = doc(db, 'doctors', doctor.uid);
              const doctorSnap = await getDoc(doctorRef);

              if (doctorSnap.exists()) {
                const existingPeriods = doctorSnap.data().plannedOffPeriods || [];
                await updateDoc(doctorRef, {
                  plannedOffPeriods: [...existingPeriods, newPeriod]
                });
                successCount++;
                console.log('✅ Applied to', doctor.name);
              } else {
                console.error('❌ Doctor document not found:', doctor.uid, doctor.name);
                errorCount++;
              }
            } catch (err) {
              console.error('❌ Error updating doctor:', doctor.name, err);
              errorCount++;
            }
          }

          console.log('📊 Results:', successCount, 'success,', errorCount, 'errors');

          toast.success(`Planned off period saved for ${clinicName}`);
          
          if (errorCount > 0) {
            toast.error(`Failed to sync to ${errorCount} doctor${errorCount > 1 ? 's' : ''}`);
          }
        }
      } else {
        // Apply to selected doctor only
        if (!selectedDoctorId) {
          toast.error('Please select a doctor');
          return;
        }

        // Store in clinic document too (clinic-scoped doctor off)
        const clinicRef = doc(db, 'clinics', currentUser.uid);
        const clinicSnap = await getDoc(clinicRef);

        if (clinicSnap.exists()) {
          const existingClinicPeriods = clinicSnap.data().plannedOffPeriods || [];
          await updateDoc(clinicRef, {
            plannedOffPeriods: [...existingClinicPeriods, newPeriod]
          });
        }

        const doctorRef = doc(db, 'doctors', selectedDoctorId);
        const doctorSnap = await getDoc(doctorRef);

        if (doctorSnap.exists()) {
          const existingPeriods = doctorSnap.data().plannedOffPeriods || [];
          await updateDoc(doctorRef, {
            plannedOffPeriods: [...existingPeriods, newPeriod]
          });
        }

        toast.success(`Planned off period applied to Dr. ${selectedDoctor?.name}`);
      }

      // Reset form
      setPlannedOffEnabled(false);
      setStartDate('');
      setEndDate('');

      // Reload data only if doctor is selected
      if (selectedDoctorId) {
        loadDoctorData();
      }

    } catch (error) {
      console.error('Error saving planned off:', error);
      toast.error('Failed to save planned off period');
    }
  };

  const handleSaveMaxAdvanceDays = async () => {
    if (!selectedDoctorId) {
      toast.error('Please select a doctor');
      return;
    }

    try {
      const doctorRef = doc(db, 'doctors', selectedDoctorId);
      await updateDoc(doctorRef, {
        maxAdvanceBookingDays: maxAdvanceDays
      });

      toast.success('Maximum advance booking days updated');
    } catch (error) {
      console.error('Error saving max advance days:', error);
      toast.error('Failed to update setting');
    }
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
    if (!selectedDoctorId) {
      toast.error('Please select a doctor');
      return;
    }

    if (frequency !== 'Custom' && selectedDays.length === 0) {
      toast.error('Please select at least one day');
      return;
    }

    if (!chamberName || !chamberAddress) {
      toast.error('Please fill in chamber name and address');
      return;
    }

    if (frequency === 'Custom' && !customDate) {
      toast.error('Please select a custom date');
      return;
    }

    if ((frequency === 'Bi-Weekly' || frequency === 'Monthly') && !frequencyStartDate) {
      toast.error('Please select a start date');
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error('Authentication error');
        return;
      }

      // CRITICAL: Check for schedule conflicts with doctor's existing chambers
      const doctorRef = doc(db, 'doctors', selectedDoctorId);
      const doctorSnap = await getDoc(doctorRef);
      
      if (!doctorSnap.exists()) {
        toast.error('Doctor not found');
        return;
      }

      const allExistingChambers = doctorSnap.data().chambers || [];
      const conflicts: any[] = [];

      // When editing, exclude the chamber being edited from conflict checks
      const chambersToCheck = editingChamberId
        ? allExistingChambers.filter((c: Chamber) => c.id !== editingChamberId)
        : allExistingChambers;

      console.log('🔍 CONFLICT DETECTION START');
      console.log('📋 New schedule:', { selectedDays, frequency, startTime, endTime, chamberName });
      console.log('📚 Existing chambers:', allExistingChambers.length);
      console.log('✏️ Editing mode:', editingChamberId ? 'YES' : 'NO');

      // Check each existing chamber for conflicts
      for (const existingChamber of chambersToCheck) {
        // Handle both old format (time: "08:00-12:00") and new format (startTime/endTime)
        let existingStartTime = existingChamber.startTime;
        let existingEndTime = existingChamber.endTime;
        
        // If old format with single 'time' field, parse it
        if (!existingStartTime && existingChamber.time) {
          const timeParts = existingChamber.time.split('-');
          existingStartTime = timeParts[0];
          existingEndTime = timeParts[1];
        }

        console.log('🔎 Checking chamber:', {
          name: existingChamber.chamberName,
          days: existingChamber.days,
          frequency: existingChamber.frequency,
          time: `${existingStartTime}-${existingEndTime}`,
          status: existingChamber.status,
          clinicId: existingChamber.clinicId
        });

        // Skip ONLY explicitly inactive chambers (undefined/missing status = active)
        if (existingChamber.status === 'inactive') {
          console.log('⏭️ Skipping inactive chamber');
          continue;
        }

        // For Custom frequency, check date conflict
        if (frequency === 'Custom' && existingChamber.frequency === 'Custom') {
          if (existingChamber.customDate === customDate) {
            // Same custom date - check time overlap
            if (timeRangesOverlap(startTime, endTime, existingStartTime, existingEndTime)) {
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
          
          // CRITICAL FIX: Handle Daily frequency conflict even with empty days arrays
          const isDailyConflict = (frequency === 'Daily' && existingChamber.frequency === 'Daily');
          const hasCommonScheduleDays = hasCommonDays(selectedDays, existingChamber.days);
          
          console.log('📅 Day conflict check:', { 
            isDailyConflict, 
            hasCommonScheduleDays,
            newFreq: frequency,
            existingFreq: existingChamber.frequency,
            newDays: selectedDays,
            existingDays: existingChamber.days
          });
          
          // Check if there are common days OR both are Daily frequency
          if (hasCommonScheduleDays || isDailyConflict) {
            console.log('✅ Found common days or Daily conflict!');
            // Check if time ranges overlap
            if (timeRangesOverlap(startTime, endTime, existingStartTime, existingEndTime)) {
              console.log('🚨 CONFLICT DETECTED!');
              const commonDays = hasCommonScheduleDays 
                ? selectedDays.filter(day => existingChamber.days.includes(day))
                : selectedDays; // For Daily conflict, use all selected days
              conflicts.push({
                chamber: existingChamber,
                reason: 'Overlapping days and time',
                days: commonDays,
                isClinicChamber: existingChamber.clinicId === currentUser.uid,
                isPersonalChamber: !existingChamber.clinicId || existingChamber.clinicId !== currentUser.uid
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

      // If conflicts found, block the save completely
      if (conflicts.length > 0) {
        console.log('⚠️ BLOCKING SAVE DUE TO CONFLICTS');
        const conflictMessages = conflicts.map(c => {
          const location = c.isPersonalChamber ? '⚠️ PERSONAL CHAMBER' : '🏥 CLINIC CHAMBER';
          const days = c.days ? c.days.join(', ') : c.date;
          // Handle both old and new time formats
          const chamberStartTime = c.chamber.startTime || (c.chamber.time ? c.chamber.time.split('-')[0] : '');
          const chamberEndTime = c.chamber.endTime || (c.chamber.time ? c.chamber.time.split('-')[1] : '');
          const time = `${chamberStartTime}-${chamberEndTime}`;
          const name = c.chamber.chamberName || 'Unknown';
          return `• ${location}: ${name} (${days}, ${time})`;
        }).join('\n');

        toast.error('Schedule Conflict Detected!', {
          description: `Dr. ${selectedDoctor?.name} already has chamber(s) at this time:\n${conflictMessages}\n\nPlease choose a different day or time.`,
          duration: 8000,
        });

        // Show detailed alert
        alert(
          `⚠️ SCHEDULE CONFLICT DETECTED!\n\n` +
          `Dr. ${selectedDoctor?.name} already has chamber(s) scheduled at this time:\n\n` +
          `${conflictMessages}\n\n` +
          `New Schedule: ${selectedDays.join(', ')} (${startTime}-${endTime})\n\n` +
          `❌ A doctor cannot be in two places at the same time!\n` +
          `This would create booking confusion and fake booking numbers.\n\n` +
          `Please choose a different day or time slot.`
        );

        return; // Block the save
      }

      // Create or update chamber
      const chamberData: Chamber = {
        id: editingChamberId || Date.now().toString(),
        days: frequency === 'Custom' ? [] : selectedDays,
        frequency,
        ...(frequency === 'Bi-Weekly' || frequency === 'Monthly' ? { frequencyStartDate } : {}),
        ...(frequency === 'Custom' ? { customDate } : {}),
        chamberName,
        chamberAddress,
        startTime,
        endTime,
        maxCapacity,
        status: editingChamberId ? (allExistingChambers.find((c: Chamber) => c.id === editingChamberId)?.status || 'active') : 'active',
        createdAt: editingChamberId ? (allExistingChambers.find((c: Chamber) => c.id === editingChamberId)?.createdAt || new Date()) : new Date(),
        clinicId: currentUser.uid // CRITICAL: Tag chamber with clinic ownership
      };

      // Add or update chamber in doctor's chambers
      const updatedChambers = editingChamberId
        ? allExistingChambers.map((c: Chamber) => c.id === editingChamberId ? chamberData : c)
        : [...allExistingChambers, chamberData];

      // Save to Firestore
      await updateDoc(doctorRef, {
        chambers: updatedChambers
      });

      toast.success(editingChamberId ? 'Schedule Updated Successfully!' : 'Schedule Created Successfully!', {
        description: editingChamberId ? `Schedule updated for Dr. ${selectedDoctor?.name}` : `Chamber added for Dr. ${selectedDoctor?.name}`,
        duration: 5000,
      });

      // Reset form
      handleReset();

      // Reload chambers
      loadDoctorData();

    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule');
    }
  };

  const toggleChamberStatus = async (chamberId: string) => {
    if (!selectedDoctorId) return;

    try {
      const doctorRef = doc(db, 'doctors', selectedDoctorId);
      const doctorSnap = await getDoc(doctorRef);

      if (doctorSnap.exists()) {
        const existingChambers = doctorSnap.data().chambers || [];
        const updatedChambers = existingChambers.map((chamber: Chamber) =>
          chamber.id === chamberId
            ? { ...chamber, status: chamber.status === 'active' ? 'inactive' : 'active' }
            : chamber
        );

        await updateDoc(doctorRef, {
          chambers: updatedChambers
        });

        toast.success('Chamber status updated');
        loadDoctorData();
      }
    } catch (error) {
      console.error('Error toggling chamber status:', error);
      toast.error('Failed to update chamber status');
    }
  };

  const toggleChamberExpansion = (chamberId: string) => {
    setExpandedChambers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chamberId)) {
        newSet.delete(chamberId);
      } else {
        newSet.add(chamberId);
      }
      return newSet;
    });
  };

  const handleEditChamber = (chamber: Chamber) => {
    setEditingChamberId(chamber.id);
    
    // Handle custom dates differently
    if (chamber.frequency === 'Custom') {
      setSelectedDays([]);
      setCustomDate(chamber.customDate || '');
    } else {
      setSelectedDays(chamber.days);
      setCustomDate('');
    }
    
    setFrequency(chamber.frequency);
    setFrequencyStartDate(chamber.frequencyStartDate || '');
    setChamberName(chamber.chamberName);
    setChamberAddress(chamber.chamberAddress);
    setStartTime(chamber.startTime);
    setEndTime(chamber.endTime);
    setMaxCapacity(chamber.maxCapacity);

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    toast.info('Editing Schedule', {
      description: `Make your changes and click SAVE SCHEDULE to update.`,
      duration: 3000,
    });
  };

  const handleDeleteChamber = async (chamberId: string) => {
    if (!selectedDoctorId) {
      toast.error('No doctor selected');
      return;
    }

    const confirmDelete = window.confirm(
      `⚠️ DELETE SCHEDULE?\n\nAre you sure you want to delete this schedule?\n\nThis action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error('Authentication error');
        return;
      }

      const doctorRef = doc(db, 'doctors', selectedDoctorId);
      const doctorSnap = await getDoc(doctorRef);
      
      if (!doctorSnap.exists()) {
        toast.error('Doctor not found');
        return;
      }

      const allChambers = doctorSnap.data().chambers || [];
      const updatedChambers = allChambers.filter((c: Chamber) => c.id !== chamberId);

      await updateDoc(doctorRef, {
        chambers: updatedChambers
      });

      // Update local state
      setChambers(updatedChambers.filter((c: Chamber) => c.clinicId === currentUser.uid));
      
      toast.success('Schedule Deleted Successfully', {
        description: 'The schedule has been removed.',
        duration: 5000,
      });
    } catch (error) {
      console.error('Error deleting chamber:', error);
      toast.error('Failed to delete schedule');
    }
  };

  const handleReset = () => {
    setSelectedDays([]);
    setFrequency('Daily');
    setFrequencyStartDate('');
    setCustomDate('');
    setChamberName('');
    setChamberAddress('');
    setStartTime('09:00');
    setEndTime('17:00');
    setMaxCapacity(20);
    setEditingChamberId(null);
  };

  const hasActivePeriods = allPeriods.some(p => p.status === 'active');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <ClinicSidebar
        activeMenu="schedule"
        onMenuChange={(menu) => {
          if (onMenuChange) {
            onMenuChange(menu);
          }
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

      <div className="lg:ml-64">
        {/* Header */}
        <div className="bg-gray-800/50 border-b border-gray-700 px-4 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors"
            >
              <Menu className="w-5 h-5 text-blue-500" />
            </button>
            <div className="flex flex-col gap-1">
              <h1 className="text-white text-2xl font-semibold">Schedule Manager</h1>
              <p className="text-gray-400 text-sm">Manage clinic schedules and availability</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 lg:px-8 py-8">
          {/* Doctor Selection */}
          {doctors.length === 0 ? (
            <Card className="bg-gray-800/50 border-gray-700 p-8 mb-8">
              <div className="text-center">
                <Building2 className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-white text-lg mb-2">No Doctors Linked</h3>
                <p className="text-gray-400 mb-4">
                  You need to link doctors to your clinic before managing schedules.
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Link Doctors
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {/* Doctor Selector Card */}
              <Card className="bg-gray-800/50 border-gray-700 p-6 mb-8">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <Label className="text-gray-300 text-sm">Select Doctor</Label>
                      <p className="text-gray-500 text-xs">Choose a doctor to manage their schedule</p>
                    </div>
                  </div>

                  <div className="flex-1 md:max-w-md">
                    <Select value={selectedDoctorId} onValueChange={handleDoctorChange}>
                      <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white">
                        <SelectValue placeholder="Select a doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor.uid} value={doctor.uid}>
                            <div className="flex items-center gap-2">
                              <span>{doctor.name}</span>
                              {doctor.specialty && (
                                <span className="text-gray-400 text-xs">({doctor.specialty})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {selectedDoctorId && (
                <>
                  {/* Section 1: Per-Doctor Settings */}
                  <div className="mb-8">
                    <div className="flex items-start justify-between mb-6">
                      <h2 className="text-white">Per-Doctor Schedule Settings</h2>
                      <p className="text-gray-400 text-sm hidden md:block">Settings for Dr. {selectedDoctor?.name || 'Selected Doctor'}</p>
                    </div>
                    <p className="text-gray-400 text-sm md:hidden mb-6">Settings for Dr. {selectedDoctor?.name || 'Selected Doctor'}</p>

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
                            ? "There are active planned off periods. View history to manage or deactivate them."
                            : plannedOffEnabled
                            ? "Configure when the QR code will be deactivated and new bookings will be disabled"
                            : "When enabled, QR codes will be temporarily deactivated and patients will not be able to book appointments. Use this during vacations or planned leaves."
                          }
                        </p>

                        <div className="space-y-4">
                          {/* Apply To Selector - Only shown when enabling planned off */}
                          {plannedOffEnabled && (
                            <div className="space-y-2">
                              <Label className="text-gray-300 text-sm">Apply To</Label>
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  onClick={() => setGlobalOffScope('clinic')}
                                  className={`
                                    py-3 px-4 rounded-lg border-2 transition-all text-sm
                                    ${globalOffScope === 'clinic'
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600'
                                    }
                                  `}
                                >
                                  <Building2 className="w-4 h-4 mx-auto mb-1" />
                                  Entire Clinic
                                </button>
                                <button
                                  onClick={() => setGlobalOffScope('doctor')}
                                  className={`
                                    py-3 px-4 rounded-lg border-2 transition-all text-sm
                                    ${globalOffScope === 'doctor'
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600'
                                    }
                                  `}
                                >
                                  <User className="w-4 h-4 mx-auto mb-1" />
                                  Selected Doctor
                                </button>
                              </div>
                              {globalOffScope === 'clinic' && (
                                <div className="flex items-start gap-2 py-2 px-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mt-2">
                                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                  <p className="text-blue-400 text-sm">
                                    This will apply to all {doctors.length} doctors in the clinic
                                  </p>
                                </div>
                              )}
                              {globalOffScope === 'doctor' && selectedDoctor && (
                                <div className="flex items-start gap-2 py-2 px-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mt-2">
                                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                  <p className="text-blue-400 text-sm">
                                    This will only apply to Dr. {selectedDoctor.name}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

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
                            <div className="py-3 px-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="text-blue-400 text-sm">QR Code Active - Accepting Bookings</span>
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
                                  <Button className="bg-blue-600 hover:bg-blue-700 text-white ml-auto">
                                    SAVE
                                  </Button>
                                )}
                              </div>
                            </>
                          )}

                          {/* Date Selection - Shows when enabled */}
                          {plannedOffEnabled && (
                            <div className="space-y-4 pt-2">
                              {/* Chamber Selection - For chamber-specific closures */}
                              <div className="bg-gray-900/30 border border-gray-700 rounded-lg p-4">
                                <h4 className="text-white text-sm mb-2">Closure Scope</h4>
                                <p className="text-gray-400 text-sm mb-4">
                                  Choose whether this closure applies to all chambers or a specific one
                                </p>

                                <div className="grid grid-cols-2 gap-3 mb-4">
                                  <button
                                    onClick={() => {
                                      setChamberSpecificClosure('all');
                                      setSelectedClosureChamber('');
                                    }}
                                    className={`
                                      py-3 px-4 rounded-lg border-2 transition-all text-sm
                                      ${chamberSpecificClosure === 'all'
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600'
                                      }
                                    `}
                                  >
                                    <Building2 className="w-4 h-4 mx-auto mb-1" />
                                    All Chambers
                                  </button>
                                  <button
                                    onClick={() => setChamberSpecificClosure('specific')}
                                    className={`
                                      py-3 px-4 rounded-lg border-2 transition-all text-sm
                                      ${chamberSpecificClosure === 'specific'
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600'
                                      }
                                    `}
                                  >
                                    <MapPin className="w-4 h-4 mx-auto mb-1" />
                                    Specific Chamber
                                  </button>
                                </div>

                                {/* Chamber Dropdown - Shows when specific is selected */}
                                {chamberSpecificClosure === 'specific' && (
                                  <div className="space-y-2">
                                    <Label htmlFor="closure-chamber" className="text-gray-300 text-sm">
                                      Select Chamber
                                    </Label>
                                    <Select value={selectedClosureChamber} onValueChange={setSelectedClosureChamber}>
                                      <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white">
                                        <SelectValue placeholder="Choose a chamber" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {chambers.map((chamber) => (
                                          <SelectItem key={chamber.id} value={chamber.chamberName}>
                                            <div className="flex items-center gap-2">
                                              <span>{chamber.chamberName}</span>
                                              {chamber.chamberAddress && (
                                                <span className="text-gray-400 text-xs">({chamber.chamberAddress})</span>
                                              )}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>

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
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
                          {/* Apply To Selector - Tabs */}
                          <div className="space-y-2">
                            <Label className="text-gray-300 text-sm">Apply To</Label>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => setAdvanceDaysScope('clinic')}
                                className={`
                                  py-3 px-4 rounded-lg border-2 transition-all text-sm
                                  ${advanceDaysScope === 'clinic'
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600'
                                  }
                                `}
                              >
                                <Building2 className="w-4 h-4 mx-auto mb-1" />
                                Entire Clinic
                              </button>
                              <button
                                onClick={() => setAdvanceDaysScope('doctor')}
                                className={`
                                  py-3 px-4 rounded-lg border-2 transition-all text-sm
                                  ${advanceDaysScope === 'doctor'
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600'
                                  }
                                `}
                              >
                                <User className="w-4 h-4 mx-auto mb-1" />
                                Selected Doctor
                              </button>
                            </div>
                            {advanceDaysScope === 'clinic' && (
                              <div className="flex items-start gap-2 py-2 px-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mt-2">
                                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                <p className="text-blue-400 text-sm">
                                  This will apply to all {doctors.length} doctors in the clinic
                                </p>
                              </div>
                            )}
                            {advanceDaysScope === 'doctor' && selectedDoctor && (
                              <div className="flex items-start gap-2 py-2 px-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mt-2">
                                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                <p className="text-blue-400 text-sm">
                                  This will only apply to Dr. {selectedDoctor.name}
                                </p>
                              </div>
                            )}
                          </div>

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
                            <Button onClick={handleSaveMaxAdvanceDays} className="bg-blue-600 hover:bg-blue-700 text-white">
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
                      <p className="text-gray-400 text-sm hidden md:block">Create new practice schedules for Dr. {selectedDoctor?.name}</p>
                    </div>
                    <p className="text-gray-400 text-sm md:hidden mb-6">Create new practice schedules for Dr. {selectedDoctor?.name}</p>

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
                                    ? 'bg-blue-600 text-white'
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
                                  ? 'This helps the system understand the bi-weekly schedule cycle. For example, if you select Tuesday and set start date as 2/11/25, the next schedule will be on the following Tuesday (2 weeks later).'
                                  : 'This helps the system understand the monthly schedule cycle. The schedule will repeat on the same day of the month from this start date.'
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
                          </div>
                        )}

                        {/* Chamber Name & Address */}
                        {frequency !== 'Custom' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="chamber-name" className="text-gray-300 text-sm">
                                Chamber Name
                              </Label>
                              <Input
                                id="chamber-name"
                                type="text"
                                value={chamberName}
                                onChange={(e) => setChamberName(e.target.value)}
                                placeholder="e.g., Main Clinic"
                                className="bg-gray-900/50 border-gray-700 text-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="chamber-address" className="text-gray-300 text-sm">
                                Chamber Address
                              </Label>
                              <Input
                                id="chamber-address"
                                type="text"
                                value={chamberAddress}
                                onChange={(e) => setChamberAddress(e.target.value)}
                                placeholder="e.g., 123 Main St"
                                className="bg-gray-900/50 border-gray-700 text-white"
                              />
                            </div>
                          </div>
                        )}

                        {/* Time Selection */}
                        {frequency !== 'Custom' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="start-time" className="text-gray-300 text-sm">
                                Start Time
                              </Label>
                              <div className="relative">
                                <Input
                                  id="start-time"
                                  type="time"
                                  value={startTime}
                                  onChange={(e) => setStartTime(e.target.value)}
                                  className="bg-gray-900/50 border-gray-700 text-white pr-10"
                                />
                                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="end-time" className="text-gray-300 text-sm">
                                End Time
                              </Label>
                              <div className="relative">
                                <Input
                                  id="end-time"
                                  type="time"
                                  value={endTime}
                                  onChange={(e) => setEndTime(e.target.value)}
                                  className="bg-gray-900/50 border-gray-700 text-white pr-10"
                                />
                                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Max Capacity */}
                        {frequency !== 'Custom' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="max-capacity" className="text-gray-300 text-sm">
                                Maximum Booking Capacity
                              </Label>
                              <span className="text-white text-sm font-medium">{maxCapacity} patients</span>
                            </div>
                            <input
                              id="max-capacity"
                              type="range"
                              min="1"
                              max="100"
                              value={maxCapacity}
                              onChange={(e) => setMaxCapacity(Number(e.target.value))}
                              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>1</span>
                              <span>50</span>
                              <span>100</span>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            onClick={handleReset}
                            variant="outline"
                            className="border-gray-700 text-gray-300 hover:bg-gray-900 hover:text-white"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            RESET
                          </Button>
                          <Button
                            onClick={handleSaveSchedule}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {editingChamberId ? 'UPDATE SCHEDULE' : 'SAVE SCHEDULE'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Section 3: View Schedules */}
                  {chambers.length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-start justify-between mb-6">
                        <h2 className="text-white">View Schedules</h2>
                        <p className="text-gray-400 text-sm hidden md:block">Manage existing schedules for Dr. {selectedDoctor?.name}</p>
                      </div>
                      <p className="text-gray-400 text-sm md:hidden mb-6">Manage existing schedules for Dr. {selectedDoctor?.name}</p>

                      <div className="space-y-4">
                        {chambers.map((chamber) => (
                          <Card key={chamber.id} className="bg-gray-800/50 border-gray-700 overflow-hidden">
                            {/* Chamber Header */}
                            <div className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                <div className={`w-10 h-10 rounded-lg ${chamber.status === 'active' ? 'bg-blue-600' : 'bg-gray-600'} flex items-center justify-center`}>
                                  <User className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-white font-medium">Dr. {selectedDoctor?.name}</h3>
                                  <p className="text-gray-400 text-sm">{selectedDoctor?.specialty || 'Medical Practitioner'}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <Switch
                                    checked={chamber.status === 'active'}
                                    onCheckedChange={() => toggleChamberStatus(chamber.id)}
                                  />
                                  <button
                                    onClick={() => toggleChamberExpansion(chamber.id)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                  >
                                    {expandedChambers.has(chamber.id) ? (
                                      <ChevronUp className="w-5 h-5" />
                                    ) : (
                                      <ChevronDown className="w-5 h-5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedChambers.has(chamber.id) && (
                              <div className="border-t border-gray-700 p-4 bg-gray-900/30">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <Label className="text-gray-400 text-xs">Clinic Location</Label>
                                    <p className="text-white text-sm">{chamber.chamberName}</p>
                                    <p className="text-gray-400 text-xs mt-1">{chamber.chamberAddress}</p>
                                  </div>
                                  <div>
                                    <Label className="text-gray-400 text-xs">Days</Label>
                                    <p className="text-white text-sm">
                                      {chamber.frequency === 'Custom'
                                        ? `Custom: ${chamber.customDate}`
                                        : chamber.days.map(d => d.substring(0, 3)).join(', ')
                                      }
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-gray-400 text-xs">Frequency</Label>
                                    <p className="text-white text-sm">{chamber.frequency}</p>
                                  </div>
                                  <div>
                                    <Label className="text-gray-400 text-xs">Time</Label>
                                    <p className="text-white text-sm">{chamber.startTime} - {chamber.endTime}</p>
                                  </div>
                                  <div>
                                    <Label className="text-gray-400 text-xs">Max Capacity</Label>
                                    <p className="text-white text-sm">{chamber.maxCapacity} patients</p>
                                  </div>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-700">
                                  <Button
                                    onClick={() => handleEditChamber(chamber)}
                                    variant="outline"
                                    size="sm"
                                    className="border-gray-700 text-gray-300 hover:bg-gray-900 hover:text-white"
                                  >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    EDIT
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteChamber(chamber.id)}
                                    variant="outline"
                                    size="sm"
                                    className="border-red-900/50 text-red-400 hover:bg-red-950 hover:text-red-300"
                                  >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    DELETE
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-gray-800 border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-white text-xl font-semibold">Planned Off History</h2>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Manage blocked periods for {selectedDoctor?.name || 'all doctors'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {allPeriods.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">No planned off periods found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allPeriods.map((period) => (
                    <div
                      key={period.id}
                      className={`p-4 rounded-lg border ${
                        period.status === 'active'
                          ? 'bg-red-500/10 border-red-500/20'
                          : period.status === 'completed'
                          ? 'bg-gray-700/30 border-gray-600'
                          : 'bg-gray-700/50 border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                period.status === 'active'
                                  ? 'bg-red-500 text-white'
                                  : period.status === 'completed'
                                  ? 'bg-gray-600 text-gray-300'
                                  : 'bg-gray-700 text-gray-400'
                              }`}
                            >
                              {period.status.toUpperCase()}
                            </span>
                            {period.appliesTo === 'clinic' ? (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white">
                                ENTIRE CLINIC
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-purple-600 text-white">
                                {period.doctorName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">From:</span>
                              <span className="text-white ml-2">{new Date(period.startDate).toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">To:</span>
                              <span className="text-white ml-2">{new Date(period.endDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <p className="text-gray-500 text-xs mt-2">
                            Created: {period.createdAt?.toDate ? period.createdAt.toDate().toLocaleDateString() : period.createdAt ? new Date(period.createdAt).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>

                        {period.status === 'active' && (
                          <Button
                            onClick={async () => {
                              if (!selectedDoctorId) return;

                              try {
                                const doctorRef = doc(db, 'doctors', selectedDoctorId);
                                const doctorSnap = await getDoc(doctorRef);

                                if (doctorSnap.exists()) {
                                  const periods = doctorSnap.data().plannedOffPeriods || [];
                                  const updatedPeriods = periods.map((p: PlannedOffPeriod) =>
                                    p.id === period.id ? { ...p, status: 'cancelled' } : p
                                  );

                                  await updateDoc(doctorRef, {
                                    plannedOffPeriods: updatedPeriods
                                  });

                                  toast.success('Period deactivated successfully');
                                  loadDoctorData();
                                }
                              } catch (error) {
                                console.error('Error deactivating period:', error);
                                toast.error('Failed to deactivate period');
                              }
                            }}
                            variant="outline"
                            className="border-red-500 text-red-400 hover:bg-red-500/10"
                          >
                            Deactivate
                          </Button>
                        )}

                        {period.status === 'cancelled' && (
                          <Button
                            onClick={async () => {
                              if (!selectedDoctorId) return;

                              try {
                                const doctorRef = doc(db, 'doctors', selectedDoctorId);
                                const doctorSnap = await getDoc(doctorRef);

                                if (doctorSnap.exists()) {
                                  const periods = doctorSnap.data().plannedOffPeriods || [];
                                  const updatedPeriods = periods.map((p: PlannedOffPeriod) =>
                                    p.id === period.id ? { ...p, status: 'active' } : p
                                  );

                                  await updateDoc(doctorRef, {
                                    plannedOffPeriods: updatedPeriods
                                  });

                                  toast.success('Period restored successfully');
                                  loadDoctorData();
                                }
                              } catch (error) {
                                console.error('Error restoring period:', error);
                                toast.error('Failed to restore period');
                              }
                            }}
                            variant="outline"
                            className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                          >
                            Restore
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-700">
              <Button
                onClick={() => setShowHistoryModal(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white w-full"
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ClinicScheduleManager;
