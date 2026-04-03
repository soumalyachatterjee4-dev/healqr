import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Menu, Info, Plus, Minus, Calendar, Pencil, Trash2, Clock, MapPin, Users, CalendarIcon, Check, Eye, AlertTriangle, Phone, Building2, QrCode } from 'lucide-react';
import { useState, useEffect } from 'react';
import DashboardSidebar from './DashboardSidebar';
import { toast } from 'sonner';
import { db, auth } from '../lib/firebase/config';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { decrypt } from '../utils/encryptionService';

interface ScheduleManagerProps {
  doctorName?: string;
  email?: string;
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
  activeAddOns?: string[];
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
}

export default function ScheduleManager({
  doctorName,
  email,
  onMenuChange,
  onLogout,
  activeAddOns = [],
  isSidebarCollapsed = false,
  setIsSidebarCollapsed
}: ScheduleManagerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [doctorId, setDoctorId] = useState<string>('');
  const [, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'schedules' | 'clinics' | 'vcTime'>('clinics');

  // VC Time Slots state
  const [vcTimeSlots, setVcTimeSlots] = useState<Array<{id: number; startTime: string; endTime: string; days: string[]; isActive: boolean}>>([]);
  const [vcSlotStartTime, setVcSlotStartTime] = useState('');
  const [vcSlotEndTime, setVcSlotEndTime] = useState('');
  const [vcSlotDays, setVcSlotDays] = useState<string[]>([]);
  const [editingVcSlotId, setEditingVcSlotId] = useState<number | null>(null);
  const [savingVcSlots, setSavingVcSlots] = useState(false);

  const hasVideoConsultation = activeAddOns.includes('video-consultation');

  // Function to auto-populate manualClinics from linkedClinics
  const updateManualClinicsFromLinked = async (doctorId: string, linkedClinics: any[], currentManualClinics: any[]) => {
    const existingClinicCodes = new Set(currentManualClinics.map((c: any) => c.clinicCode).filter(Boolean));
    const existingClinicIds = new Set(currentManualClinics.map((c: any) => c.id).filter(Boolean));

    const newClinicsToAdd: typeof currentManualClinics = [];
    for (const linked of linkedClinics) {
      // Skip if already in manualClinics (by exact clinicCode match)
      if (linked.clinicCode && existingClinicCodes.has(linked.clinicCode)) {
        continue;
      }
      // Skip if same clinicId AND no branch code (plain manual entry)
      if (!linked.clinicCode && existingClinicIds.has(linked.clinicId)) {
        continue;
      }

      // Fetch clinic details from Firestore
      try {
        const clinicDoc = await getDoc(doc(db!, 'clinics', linked.clinicId));
        if (clinicDoc.exists()) {
          const clinicData = clinicDoc.data();
          // Resolve branch-specific code from locations if available
          let resolvedCode = linked.clinicCode || clinicData.clinicCode || '';
          const locs = clinicData.locations || [];
          // If stored code is old format without branch segment, find matching location
          if (resolvedCode && !resolvedCode.match(/^HQR-\d{6}-\d{4}-\d{3}-CLN$/)) {
            const mainLoc = locs.find((l: any) => l.id === '001');
            if (mainLoc?.clinicCode) resolvedCode = mainLoc.clinicCode;
          }

          // Resolve branch name/address from locations if this is a branch code
          let resolvedName = clinicData.name || linked.clinicName || 'Clinic';
          let resolvedAddress = clinicData.address || '';
          const matchedLoc = locs.find((l: any) => l.clinicCode === resolvedCode);
          if (matchedLoc) {
            resolvedName = matchedLoc.name || resolvedName;
            resolvedAddress = matchedLoc.landmark || resolvedAddress;
          }

          // Double-check dedup after resolving code (in case code was upgraded)
          if (existingClinicCodes.has(resolvedCode)) continue;

          newClinicsToAdd.push({
            id: linked.clinicId,
            name: resolvedName,
            address: resolvedAddress,
            phone: clinicData.phone || '',
            clinicCode: resolvedCode,
            createdAt: Date.now(),
          });
        }
      } catch (e) {
        console.error('Failed to fetch linked clinic details:', e);
      }
    }

    if (newClinicsToAdd.length > 0) {
      const merged = [...currentManualClinics, ...newClinicsToAdd];
      setManualClinics(merged);
      // Persist merged clinics back to doctor's manualClinics
      try {
        await updateDoc(doc(db!, 'doctors', doctorId), { manualClinics: merged });
      } catch (e) {
        console.error('Failed to persist auto-linked clinics:', e);
      }
    }
  };

  // Load data from Firestore on mount
  useEffect(() => {
    const loadFromFirestore = async (uid: string) => {

      if (!db) {
        console.error('❌ ScheduleManager: Firestore db not initialized');
        setLoading(false);
        return;
      }

      setDoctorId(uid);

      try {
        const doctorDoc = await getDoc(doc(db!, 'doctors', uid));
        if (doctorDoc.exists()) {
          const data = doctorDoc.data();

          // Load global settings
          setMaxAdvanceDays(data.maxAdvanceBookingDays?.toString() || '15');

          // Load planned off periods
          if (data.plannedOffPeriods && Array.isArray(data.plannedOffPeriods)) {
            const periods = data.plannedOffPeriods.map((p: any) => ({
              ...p,
              startDate: (p.startDate as any)?.toDate ? (p.startDate as any).toDate().toISOString().split('T')[0] : p.startDate,
              endDate: (p.endDate as any)?.toDate ? (p.endDate as any).toDate().toISOString().split('T')[0] : p.endDate,
            }));
            setAllPeriods(periods);
          }

          // Load chambers
          if (data.chambers && Array.isArray(data.chambers)) {
            setDemoSchedules(data.chambers);
          }

          // Load Manual Clinics
          if (data.manualClinics && Array.isArray(data.manualClinics)) {
            setManualClinics(data.manualClinics);
          }

          // Load VC Time Slots
          if (data.vcTimeSlots && Array.isArray(data.vcTimeSlots)) {
            setVcTimeSlots(data.vcTimeSlots);
          }

          // Auto-populate My Clinics from linkedClinics (added by clinic side)
          if (data.linkedClinics && Array.isArray(data.linkedClinics)) {
            await updateManualClinicsFromLinked(uid, data.linkedClinics, data.manualClinics || []);
          }

          // Load Self-Restricted Clinics (doctor-side toggle)
          if (data.selfRestrictedClinics && Array.isArray(data.selfRestrictedClinics)) {
            setSelfRestrictedClinics(data.selfRestrictedClinics);
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
    const unsubscribe = onAuthStateChanged(auth!, (user) => {
      if (user) {
        loadFromFirestore(user.uid);

        // Set up real-time listener for doctor's document to handle linkedClinics updates
        const doctorDocRef = doc(db!, 'doctors', user.uid);
        const unsubscribeDoc = onSnapshot(doctorDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const currentLinkedClinics = data.linkedClinics || [];
            const currentManualClinics = data.manualClinics || [];

            // Check if linkedClinics has new entries not in manualClinics
            const existingClinicCodes = new Set(currentManualClinics.map((c: any) => c.clinicCode).filter(Boolean));
            const hasNewLinks = currentLinkedClinics.some((linked: any) =>
              linked.clinicCode && !existingClinicCodes.has(linked.clinicCode)
            );

            if (hasNewLinks) {
              await updateManualClinicsFromLinked(user.uid, currentLinkedClinics, currentManualClinics);
            }
          }
        });

        return unsubscribeDoc;
      } else {
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

  // State for Manual Clinics
  const [manualClinics, setManualClinics] = useState<Array<{
    id: string;
    name: string;
    address: string;
    phone: string;
    clinicCode?: string;
    createdAt: number;
  }>>([]);
  const [editingClinicId, setEditingClinicId] = useState<string | null>(null);
  const [clinicFormName, setClinicFormName] = useState('');
  const [clinicFormAddress, setClinicFormAddress] = useState('');
  const [clinicFormPhone, setClinicFormPhone] = useState('');
  const [clinicFormCode, setClinicFormCode] = useState('');
  const [showClinicDeleteModal, setShowClinicDeleteModal] = useState(false);
  const [clinicToDelete, setClinicToDelete] = useState<string | null>(null);

  // State for Doctor Self-Restriction Toggle (hide clinic QR patients)
  const [selfRestrictedClinics, setSelfRestrictedClinics] = useState<string[]>([]);

  // State for Schedule Maker (Section 2)
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [frequency, setFrequency] = useState('Daily');
  const [frequencyStartDate, setFrequencyStartDate] = useState(''); // For Bi-Weekly and Monthly
  const [customDate, setCustomDate] = useState(''); // For Custom frequency
  const [chamberName, setChamberName] = useState('');
  const [chamberAddress, setChamberAddress] = useState('');
  const [clinicCode, setClinicCode] = useState(''); // NEW: Optional clinic code to link chamber
  const [selectedManualClinicId, setSelectedManualClinicId] = useState<string>(''); // For selecting manual clinic
  const [clinicData, setClinicData] = useState<any>(null); // NEW: Store fetched clinic data
  const [loadingClinic, setLoadingClinic] = useState(false); // NEW: Loading state for clinic fetch
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
    clinicName?: string;
    manualClinicId?: string;
    clinicPhone?: string;
    startTime: string;
    endTime: string;
    maxCapacity: number;
    isActive?: boolean;
    createdAt?: number;
    inactivePeriods?: Array<{
      startDate: string;
      endDate: string;
      createdAt: string;
    }>;
  }>>([]);

  // Track inactive date ranges for chambers being scheduled
  const [chamberInactiveDates, setChamberInactiveDates] = useState<{
    [chamberId: number]: {
      startDate: string;
      endDate: string;
    }
  }>({});

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  // NEW: Handle Manual Clinic Operations
  const handleSaveManualClinic = async () => {
    if (!clinicFormName || !clinicFormAddress) {
      toast.error('Please fill in clinic name and address');
      return;
    }

    if (!doctorId || !db) {
      toast.error('Authentication error');
      return;
    }

    try {
      let resolvedClinicName = '';
      let resolvedClinicAddress = '';
      let matchedClinicId = '';
      let matchedClinicCode = '';

      // If clinic code is provided, verify it first
      if (clinicFormCode.trim()) {
        const clinicsRef = collection(db, 'clinics');
        const enteredCode = clinicFormCode.trim();

        const normalizeCode = (code: string) => (code || '').toUpperCase().replace(/-CLN$/, '');
        const normalizedEntered = normalizeCode(enteredCode);

        // Try exact match first (main clinic or branch code stored at root)
        let clinicSnap = await getDocs(query(clinicsRef, where('clinicCode', '==', enteredCode)));

        // If not found, attempt more tolerant lookups (handles old/new format mismatch)
        if (clinicSnap.empty) {
          const branchMatch = enteredCode.match(/^(HQR-\d{6}-\d{4})-(\d{3})-CLN$/);
          if (branchMatch) {
            const basePrefix = branchMatch[1];
            // Common clinic codes to try: new format (with 001) and old format (without branch segment)
            const codesToTry = [`${basePrefix}-001-CLN`, `${basePrefix}-CLN`];

            for (const code of codesToTry) {
              const snap = await getDocs(query(clinicsRef, where('clinicCode', '==', code)));
              if (!snap.empty) {
                clinicSnap = snap;
                break;
              }
            }

            // If still not found, fall back to prefix-based lookup to handle any small formatting mismatch
            if (clinicSnap.empty) {
              const prefixQuery = query(
                clinicsRef,
                where('clinicCode', '>=', `${basePrefix}-`),
                where('clinicCode', '<=', `${basePrefix}-\uf8ff`)
              );
              const prefixSnap = await getDocs(prefixQuery);
              if (!prefixSnap.empty) {
                clinicSnap = prefixSnap;
              }
            }

            // If we found a clinic doc, allow main branch even when locations[] doesn't include it
            if (!clinicSnap.empty) {
              const cData = clinicSnap.docs[0].data();
              const clinicMainCode = (cData.clinicCode || '').toString();
              const normalizedClinicMain = normalizeCode(clinicMainCode);

              const seemsLikeMainOrMainBranch =
                normalizedEntered === normalizedClinicMain ||
                normalizedEntered.startsWith(`${normalizedClinicMain}-`);

              if (!seemsLikeMainOrMainBranch) {
                const locs = cData.locations || [];
                const branchExists = locs.some((l: any) => normalizeCode(l.clinicCode) === normalizedEntered);
                if (!branchExists) {
                  toast.warn('Branch code not found in clinic locations; linking to the main clinic record instead.');
                }
              }
            }
          }
        }

        if (clinicSnap.empty) {
          toast.error('Clinic code not found. Please check the code or leave it empty for manual entry.');
          return;
        }

        matchedClinicId = clinicSnap.docs[0].id;
        const clinicData = clinicSnap.docs[0].data();
        // Store the code the doctor entered (branch-specific)
        matchedClinicCode = enteredCode;

        // Resolve name/address from the matching branch location if applicable
        const clinicLocs = clinicData.locations || [];
        const matchedBranch = clinicLocs.find((l: any) => normalizeCode(l.clinicCode) === normalizedEntered);
        if (matchedBranch) {
          resolvedClinicName = matchedBranch.name || clinicData.name || clinicFormName;
          resolvedClinicAddress = matchedBranch.landmark || clinicData.address || clinicFormAddress;
        } else {
          resolvedClinicName = clinicData.name || clinicFormName;
          resolvedClinicAddress = clinicData.address || clinicFormAddress;
        }

        toast.info(`Linked to system clinic: ${resolvedClinicName}`);
      }

      let updatedClinics;

      if (editingClinicId) {
        // Update existing clinic
        updatedClinics = manualClinics.map(clinic =>
          clinic.id === editingClinicId
            ? {
                ...clinic,
                name: resolvedClinicName || clinicFormName,
                address: resolvedClinicAddress || clinicFormAddress,
                phone: clinicFormPhone,
                clinicCode: clinicFormCode
              }
            : clinic
        );
        toast.success('Clinic Updated Successfully');
      } else {
        // Add new clinic — use clinic doc ID if matched, otherwise generate
        const newClinicId = matchedClinicId || Date.now().toString();
        const targetClinicCode = matchedClinicCode || clinicFormCode;

        // Check for duplicates: allow same clinicId only if clinic code differs (branch-specific)
        const isDuplicate = manualClinics.some(c => {
          if (c.id !== newClinicId) return false;
          if (!targetClinicCode) return true; // Manual entry without code: only one per clinic id
          return c.clinicCode === targetClinicCode;
        });
        if (isDuplicate) {
          toast.error('This clinic is already in your list');
          return;
        }

        const newClinic = {
          id: newClinicId,
          name: resolvedClinicName || clinicFormName,
          address: resolvedClinicAddress || clinicFormAddress,
          phone: clinicFormPhone,
          clinicCode: targetClinicCode,
          createdAt: Date.now()
        };
        updatedClinics = [...manualClinics, newClinic];
        toast.success('Clinic Added Successfully');
      }

      setManualClinics(updatedClinics);

      // Save to Firestore
      await updateDoc(doc(db, 'doctors', doctorId), {
        manualClinics: updatedClinics,
        updatedAt: serverTimestamp()
      });

      // Bidirectional link: update clinic's linkedDoctorsDetails & doctor's linkedClinics
      if (matchedClinicId && !editingClinicId) {
        try {
          // Fetch doctor's own profile to get required fields
          const doctorDoc = await getDoc(doc(db, 'doctors', doctorId));
          const doctorData = doctorDoc.exists() ? doctorDoc.data() : null;

          if (doctorData) {
            // 1. Add doctor to clinic's linkedDoctorsDetails
            const clinicRef = doc(db, 'clinics', matchedClinicId);
            const clinicSnap = await getDoc(clinicRef);
            const existingLinkedDoctors = clinicSnap.exists()
              ? (clinicSnap.data().linkedDoctorsDetails || [])
              : [];

            // Determine branch ID from the matched clinic code
            const clinicLocations = clinicSnap.exists() ? (clinicSnap.data().locations || []) : [];
            const mainBranchId = clinicLocations.length > 0 ? clinicLocations[0].id : '001';

            // Extract branch ID from the entered code (e.g., '002' from HQR-700008-0001-002-CLN)
            let resolvedBranchId = mainBranchId;
            if (matchedClinicCode) {
              const branchSegment = matchedClinicCode.match(/^HQR-\d{6}-\d{4}-(\d{3})-CLN$/);
              if (branchSegment) {
                resolvedBranchId = branchSegment[1];
              }
            }

            // Check if already linked to THIS specific branch (allow same doctor on multiple branches)
            const alreadyLinkedToBranch = existingLinkedDoctors.some(
              (d: any) => d.uid === doctorId && (d.locationId || mainBranchId) === resolvedBranchId
            );

            if (!alreadyLinkedToBranch) {
              const newLinkedDoctor = {
                uid: doctorId,
                email: doctorData.email || '',
                name: doctorData.name || '',
                dateOfBirth: doctorData.dateOfBirth || '',
                specialties: doctorData.specialties || (doctorData.specialty ? [doctorData.specialty] : []),
                pinCode: doctorData.pinCode || '',
                locationId: resolvedBranchId,
                doctorCode: doctorData.doctorCode || '',
                qrNumber: doctorData.qrNumber || '',
                status: doctorData.status || 'active'
              };

              if (clinicSnap.exists()) {
                await updateDoc(clinicRef, {
                  linkedDoctorsDetails: [...existingLinkedDoctors, newLinkedDoctor]
                });
              } else {
                await setDoc(clinicRef, {
                  linkedDoctorsDetails: [newLinkedDoctor]
                }, { merge: true });
              }
            }

            // 2. Add clinic to doctor's linkedClinics
            const existingLinkedClinics = doctorData.linkedClinics || [];
            const alreadyInLinkedClinics = existingLinkedClinics.some((c: any) => c.clinicId === matchedClinicId);
            if (!alreadyInLinkedClinics) {
              await updateDoc(doc(db, 'doctors', doctorId), {
                linkedClinics: [...existingLinkedClinics, {
                  clinicId: matchedClinicId,
                  clinicName: resolvedClinicName,
                  clinicCode: matchedClinicCode
                }]
              });
            }
          }
        } catch (linkError) {
          console.error('Error creating bidirectional link:', linkError);
          // Non-fatal: clinic was still saved to doctor's manualClinics
        }
      }

      handleResetClinicForm();
    } catch (error) {
      console.error('Error saving manual clinic:', error);
      toast.error('Failed to save clinic');
    }
  };

  // NEW: Manual Link/Verify Clinic Code in Manage Clinics
  const handleVerifyClinicFormCode = async () => {
    if (!clinicFormCode.trim()) {
      toast.error('Please enter a clinic code first');
      return;
    }

    try {
      setLoadingClinic(true);
      const clinicsRef = collection(db!, 'clinics');
      const enteredCode = clinicFormCode.trim().toUpperCase();


      let clinicSnap: any = null;

      // Strategy 1: Try exact match on main clinicCode field
      let result = await getDocs(query(clinicsRef, where('clinicCode', '==', enteredCode)));
      if (!result.empty) {
        clinicSnap = result;
      }

      // Strategy 2: Search all clinics for the code in locations[]
      if (!clinicSnap) {
        const allClinics = await getDocs(clinicsRef);

        for (const clinicDoc of allClinics.docs) {
          const clinicData = clinicDoc.data();
          const mainCode = (clinicData.clinicCode || '').toUpperCase().trim();

          // Exact match on main code
          if (mainCode === enteredCode) {
            clinicSnap = { docs: [clinicDoc], empty: false, size: 1 };
            break;
          }

          // Search in locations[] array
          const locations = clinicData.locations || [];
          for (const loc of locations) {
            const locCode = (loc.clinicCode || '').toUpperCase().trim();
            if (locCode === enteredCode) {
              clinicSnap = { docs: [clinicDoc], empty: false, size: 1 };
              break;
            }
          }

          if (clinicSnap) break;
        }
      }

      // Strategy 3: If new format code (with -001, -002 etc), search by base prefix
      if (!clinicSnap) {
        const newFormatMatch = enteredCode.match(/^(HQR-\d{6}-\d{4})-(\d{3})-CLN$/);
        if (newFormatMatch) {
          const basePrefix = newFormatMatch[1];
          const branchNum = newFormatMatch[2];

          const allClinics = await getDocs(clinicsRef);
          for (const clinicDoc of allClinics.docs) {
            const clinicData = clinicDoc.data();
            const locations = clinicData.locations || [];

            // Look for any code with same base prefix
            for (const loc of locations) {
              const locCode = (loc.clinicCode || '').toUpperCase().trim();
              if (locCode.startsWith(basePrefix)) {
                clinicSnap = { docs: [clinicDoc], empty: false, size: 1 };
                break;
              }
            }

            if (clinicSnap) break;
          }
        }
      }

      // Strategy 4: Old format fallback (HQR-xxxxxx-xxxx-CLN)
      if (!clinicSnap) {
        const oldFormatMatch = enteredCode.match(/^(HQR-\d{6}-\d{4})-CLN$/);
        if (oldFormatMatch) {
          const basePrefix = oldFormatMatch[1];

          const codesToTry = [`${basePrefix}-001-CLN`, `${basePrefix}-CLN`, enteredCode];
          for (const code of codesToTry) {
            const snap = await getDocs(query(clinicsRef, where('clinicCode', '==', code)));
            if (!snap.empty) {
              clinicSnap = snap;
              break;
            }
          }

          // Final fallback: prefix-based lookup
          if (!clinicSnap) {
            const prefixQuery = query(
              clinicsRef,
              where('clinicCode', '>=', `${basePrefix}-`),
              where('clinicCode', '<=', `${basePrefix}-\uf8ff`)
            );
            const prefixSnap = await getDocs(prefixQuery);
            if (!prefixSnap.empty) {
              clinicSnap = prefixSnap;
            }
          }
        }
      }

      if (!clinicSnap || clinicSnap.empty) {
        console.error('❌ Clinic code not found:', enteredCode);
        toast.error('Clinic code not found. Please check and try again.');
        return;
      }

      const clinicData = clinicSnap.docs[0].data();

      // Resolve branch-specific name/address if this is a branch code (case-insensitive comparison)
      const clinicLocs = clinicData.locations || [];
      const matchedBranch = clinicLocs.find((l: any) => (l.clinicCode || '').toUpperCase().trim() === enteredCode);
      if (matchedBranch) {
        setClinicFormName(matchedBranch.name || clinicData.name || '');
        setClinicFormAddress(matchedBranch.landmark || clinicData.address || '');
      } else {
        setClinicFormName(clinicData.name || '');
        setClinicFormAddress(clinicData.address || '');
      }

      toast.success('Clinic Linked Successfully!', {
        description: `Connected to ${clinicData.name}. Click ADD CLINIC to save.`,
        duration: 4000
      });
    } catch (error) {
      console.error('Error verifying clinic code:', error);
      toast.error('Failed to verify clinic code');
    } finally {
      setLoadingClinic(false);
    }
  };

  const handleDeleteManualClinic = async () => {
    if (!clinicToDelete || !doctorId || !db) return;

    try {
      // Find the clinic being deleted to check if it has a system link
      const deletedClinic = manualClinics.find(c => c.id === clinicToDelete);

      const updatedClinics = manualClinics.filter(c => c.id !== clinicToDelete);
      setManualClinics(updatedClinics);

      await updateDoc(doc(db, 'doctors', doctorId), {
        manualClinics: updatedClinics,
        updatedAt: serverTimestamp()
      });

      // Bidirectional unlink: remove doctor from clinic's linkedDoctorsDetails & from doctor's linkedClinics
      if (deletedClinic?.clinicCode) {
        try {
          // Find the clinic doc by code or by ID
          let clinicDocId = deletedClinic.id;

          // Remove doctor from clinic's linkedDoctorsDetails
          const clinicRef = doc(db, 'clinics', clinicDocId);
          const clinicSnap = await getDoc(clinicRef);
          if (clinicSnap.exists()) {
            const existingLinkedDoctors = clinicSnap.data().linkedDoctorsDetails || [];
            const clinicLocs = clinicSnap.data().locations || [];
            const mainBranch = clinicLocs.length > 0 ? clinicLocs[0].id : '001';

            // Extract branch from the deleted clinic's code
            const codeMatch = deletedClinic.clinicCode.match(/^HQR-\d{6}-\d{4}-(\d{3})-CLN$/);
            const deletedBranchId = codeMatch ? codeMatch[1] : mainBranch;

            // Only remove doctor entry matching this specific branch
            const updatedDoctors = existingLinkedDoctors.filter((d: any) => {
              if (d.uid !== doctorId) return true;
              const docBranch = d.locationId || mainBranch;
              return docBranch !== deletedBranchId;
            });
            if (updatedDoctors.length !== existingLinkedDoctors.length) {
              await updateDoc(clinicRef, { linkedDoctorsDetails: updatedDoctors });
            }
          }

          // Remove clinic from doctor's linkedClinics
          const doctorDoc = await getDoc(doc(db, 'doctors', doctorId));
          if (doctorDoc.exists()) {
            const existingLinkedClinics = doctorDoc.data().linkedClinics || [];
            const updatedLinkedClinics = existingLinkedClinics.filter((c: any) => c.clinicId !== clinicDocId);
            if (updatedLinkedClinics.length !== existingLinkedClinics.length) {
              await updateDoc(doc(db, 'doctors', doctorId), { linkedClinics: updatedLinkedClinics });
            }
          }
        } catch (unlinkError) {
          console.error('Error removing bidirectional link:', unlinkError);
        }
      }

      toast.success('Clinic Deleted Successfully');
      setShowClinicDeleteModal(false);
      setClinicToDelete(null);
    } catch (error) {
      console.error('Error deleting manual clinic:', error);
      toast.error('Failed to delete clinic');
    }
  };

  // Handle doctor-side self-restriction toggle for clinic patients
  const handleToggleSelfRestriction = async (clinicCode: string) => {
    if (!doctorId || !db || !clinicCode) return;

    try {
      const isCurrentlyRestricted = selfRestrictedClinics.includes(clinicCode);
      const updatedList = isCurrentlyRestricted
        ? selfRestrictedClinics.filter(code => code !== clinicCode)
        : [...selfRestrictedClinics, clinicCode];

      setSelfRestrictedClinics(updatedList);

      // Save to doctor's own profile (clinic-side reads this directly)
      await updateDoc(doc(db, 'doctors', doctorId), {
        selfRestrictedClinics: updatedList,
        updatedAt: serverTimestamp()
      });

      toast.success(
        isCurrentlyRestricted
          ? 'Clinic can now see your QR patients'
          : 'Your QR patients are now hidden from clinic'
      );
    } catch (error) {
      console.error('Error toggling self-restriction:', error);
      toast.error('Failed to update preference');
      // Revert on error
      setSelfRestrictedClinics(selfRestrictedClinics);
    }
  };

  const handleEditManualClinic = (clinic: typeof manualClinics[0]) => {
    setEditingClinicId(clinic.id);
    setClinicFormName(clinic.name);
    setClinicFormAddress(clinic.address);
    setClinicFormPhone(clinic.phone || '');
    setClinicFormCode(clinic.clinicCode || '');
  };

  const handleResetClinicForm = () => {
    setEditingClinicId(null);
    setClinicFormName('');
    setClinicFormAddress('');
    setClinicFormPhone('');
    setClinicFormCode('');
  };

  // NEW: Auto-populate schedule form when manual clinic is selected
  useEffect(() => {
    if (selectedManualClinicId) {
      const clinic = manualClinics.find(c => `${c.id}::${c.clinicCode || ''}` === selectedManualClinicId || c.id === selectedManualClinicId);
      if (clinic) {
        setChamberName(clinic.name);
        setChamberAddress(clinic.address);
        setClinicCode(clinic.clinicCode || '');
        // We will save the phone number when saving the schedule
      }
    } else if (!editingScheduleId && !clinicCode) {
      // Only clear if not editing and not using clinic code
      // And only if we just deselected (this logic might need refinement based on UX)
    }
  }, [selectedManualClinicId]);

  const handleReset = () => {
    setSelectedDays([]);
    setFrequency('Daily');
    setFrequencyStartDate('');
    setCustomDate('');
    setChamberName('');
    setChamberAddress('');
    setClinicCode('');
    setSelectedManualClinicId(''); // Reset manual clinic selection
    setClinicData(null); // Reset clinic data
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
    // Reconstruct composite key for branch-aware selection
    if (schedule.manualClinicId) {
      const matchingClinic = manualClinics.find(c => c.id === schedule.manualClinicId && c.clinicCode === schedule.clinicCode);
      setSelectedManualClinicId(matchingClinic ? `${matchingClinic.id}::${matchingClinic.clinicCode || ''}` : schedule.manualClinicId);
    } else {
      setSelectedManualClinicId('');
    }

    // If editing a chamber with clinic, fetch clinic data
    if (schedule.clinicId) {
      fetchClinicDataById(schedule.clinicId);
    }
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

  // NEW: Fetch clinic data by ID (for editing existing chambers)
  const fetchClinicDataById = async (clinicId: string) => {
    try {
      setLoadingClinic(true);
      const clinicRef = doc(db, 'clinics', clinicId);
      const clinicSnap = await getDoc(clinicRef);

      if (clinicSnap.exists()) {
        const data = clinicSnap.data();
        setClinicData({ id: clinicSnap.id, ...data });
        // Only set clinicCode if not already set (preserve branch-specific code)
        if (!clinicCode) {
          setClinicCode(data.clinicCode || '');
        }
        toast.success('Clinic data loaded', {
          description: data.name,
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Error fetching clinic:', error);
    } finally {
      setLoadingClinic(false);
    }
  };

  // NEW: Fetch and auto-populate clinic data when clinic code is entered
  const fetchClinicByCode = async (code: string) => {
    if (!code.trim()) {
      setClinicData(null);
      return;
    }

    try {
      setLoadingClinic(true);
      const clinicsRef = collection(db, 'clinics');
      const clinicQuery = query(clinicsRef, where('clinicCode', '==', code.trim()));
      const clinicSnap = await getDocs(clinicQuery);

      if (!clinicSnap.empty) {
        const clinicDoc = clinicSnap.docs[0];
        const data = clinicDoc.data();
        setClinicData({ id: clinicDoc.id, ...data });

        // Auto-populate chamber name and address from clinic
        setChamberName(data.name || '');
        setChamberAddress(data.address || '');

        toast.success('Clinic found!', {
          description: `Chamber will be linked to ${data.name}`,
          duration: 3000,
        });
      } else {
        setClinicData(null);
        toast.error('Clinic not found', {
          description: 'Please check the clinic code and try again',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error fetching clinic:', error);
      setClinicData(null);
      toast.error('Failed to fetch clinic data');
    } finally {
      setLoadingClinic(false);
    }
  };

  // NEW: Effect to fetch clinic when clinic code changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (clinicCode && clinicCode.length >= 5) {
        fetchClinicByCode(clinicCode);
      } else if (clinicCode.length === 0) {
        setClinicData(null);
      }
    }, 1500); // Debounce for 1.5 seconds - wait for user to finish typing

    return () => clearTimeout(debounceTimer);
  }, [clinicCode]);

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
      return overlaps;
    } catch (error) {
      console.error('Error checking time overlap:', error);
      return false;
    }
  };

  // Helper function to check if two day arrays have common days
  const hasCommonDays = (days1: string[], days2: string[]) => {
    if (!Array.isArray(days1) || !Array.isArray(days2)) {
      return false;
    }
    if (days1.length === 0 || days2.length === 0) {
      return false;
    }
    const hasCommon = days1.some(day => days2.includes(day));
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
    let resolvedClinicName: string | undefined = undefined;

    // Manual Clinic Resolution
    let resolvedManualClinicId: string | undefined = undefined;
    let resolvedClinicPhone: string | undefined = undefined;

    if (selectedManualClinicId) {
      const manualClinic = manualClinics.find(c => `${c.id}::${c.clinicCode || ''}` === selectedManualClinicId || c.id === selectedManualClinicId);
      if (manualClinic) {
        resolvedManualClinicId = manualClinic.id;
        resolvedClinicPhone = manualClinic.phone;
      }
    }

    if (clinicData) {
      // Clinic data already fetched and validated
      resolvedClinicId = clinicData.id;
      resolvedClinicName = clinicData.name;
    } else if (clinicCode && clinicCode.trim()) {
      // Fallback: Look up clinic if code is provided but data not fetched
      try {
        const clinicsRef = collection(db, 'clinics');
        const clinicQuery = query(clinicsRef, where('clinicCode', '==', clinicCode.trim()));
        const clinicSnap = await getDocs(clinicQuery);

        if (!clinicSnap.empty) {
          resolvedClinicId = clinicSnap.docs[0].id;
          resolvedClinicName = clinicSnap.docs[0].data().name;
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


    // Check each existing chamber for conflicts
    for (const existingChamber of conflictsToCheck) {

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
        // Check if there are common days
        const newDays = frequency === 'Custom' ? [`Custom: ${customDate}`] : selectedDays;
        if (hasCommonDays(newDays, existingChamber.days)) {
          // Check if time ranges overlap
          if (timeRangesOverlap(startTime, endTime, existingChamber.startTime, existingChamber.endTime)) {
            const commonDays = newDays.filter(day => existingChamber.days.includes(day));
            conflicts.push({
              chamber: existingChamber,
              reason: 'Overlapping days and time',
              days: commonDays
            });
          } else {
          }
        } else {
        }
      }
    }


    // Also check against VC time slots
    const activeVcSlots = vcTimeSlots.filter(s => s.isActive);
    const newDaysForVc = frequency === 'Daily'
      ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      : (frequency === 'Custom' ? [] : selectedDays);
    for (const vcSlot of activeVcSlots) {
      if (newDaysForVc.length > 0 && hasCommonDays(newDaysForVc, vcSlot.days) && timeRangesOverlap(startTime, endTime, vcSlot.startTime, vcSlot.endTime)) {
        const commonDays = newDaysForVc.filter(d => vcSlot.days.includes(d));
        conflicts.push({
          chamber: { chamberName: 'VC Slot', startTime: vcSlot.startTime, endTime: vcSlot.endTime, days: vcSlot.days },
          reason: 'Overlaps with Video Consultation slot',
          days: commonDays
        });
      }
    }

    // If conflicts found, show error and prevent saving
    if (conflicts.length > 0) {
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
    if (resolvedClinicName) {
      newSchedule.clinicName = resolvedClinicName;
    }

    // NEW: Save Manual Clinic Data
    if (resolvedManualClinicId) {
      newSchedule.manualClinicId = resolvedManualClinicId;
    }
    if (resolvedClinicPhone) {
      newSchedule.clinicPhone = resolvedClinicPhone;
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
        if (s.clinicName) cleanSchedule.clinicName = s.clinicName;
        if (s.manualClinicId) cleanSchedule.manualClinicId = s.manualClinicId;
        if (s.clinicPhone) cleanSchedule.clinicPhone = s.clinicPhone;
        return cleanSchedule;
      });
      setDemoSchedules(updatedSchedules);

      // Save to Firestore
      if (doctorId && db) {
        try {
          await updateDoc(doc(db, 'doctors', doctorId), {
            chambers: updatedSchedules,
            updatedAt: serverTimestamp()
          });
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
        if (s.clinicName) cleanSchedule.clinicName = s.clinicName;
        if (s.manualClinicId) cleanSchedule.manualClinicId = s.manualClinicId;
        if (s.clinicPhone) cleanSchedule.clinicPhone = s.clinicPhone;
        return cleanSchedule;
      });

      updatedSchedules = [...cleanedExisting, newSchedule];
      setDemoSchedules(updatedSchedules);

      // Save to Firestore
      if (doctorId && db) {
        try {
          await updateDoc(doc(db, 'doctors', doctorId), {
            chambers: updatedSchedules,
            updatedAt: serverTimestamp()
          });
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
      // Fetch doctor's name from Firestore
      const doctorDoc = await getDoc(doc(db, 'doctors', doctorId));
      const doctorName = doctorDoc.exists() ? doctorDoc.data().name : 'Unknown Doctor';

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
        appliesTo: 'doctor' as const,
        doctorId: doctorId,
        doctorName: doctorName,
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
                language: booking.language || 'english',
              });
            }

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


      // Query all bookings in the restored date range
      let totalRestorationNotices = 0;

      for (const dateStr of restoredDates) {
        const dateBookingsQuery = query(
          bookingsRef,
          where('doctorId', '==', doctorId),
          where('appointmentDate', '==', dateStr)
        );

        const bookingsSnap = await getDocs(dateBookingsQuery);

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
              language: booking.language || 'english',
            });
          }

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
      await updateDoc(doc(db, 'doctors', doctorId), {
        maxAdvanceBookingDays: days,
        updatedAt: serverTimestamp()
      });

      // Also save to schedules collection for clinic QR flow
      await setDoc(doc(db, 'schedules', doctorId), {
        maxAdvanceDays: days,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success('Settings Saved Successfully', {
        description: `Patients can now book appointments up to ${days} days in advance.`,
        duration: 5000,
      });
    } catch (error) {
      console.error('❌ Error saving max advance days:', error);
      toast.error('Failed to save settings');
    }
  };

  const handleToggleChamber = async (id: number, clinicLocationId?: string) => {
    if (!doctorId || !db) {
      toast.error('Authentication error');
      return;
    }

    const chamberKey = String(id);
    const chamber = demoSchedules.find(s => String(s.id) === chamberKey && (clinicLocationId ? String(s.clinicLocationId) === String(clinicLocationId) : true));
    if (!chamber) return;

    const isCurrentlyActive = chamber.isActive !== false;
    const newStatus = isCurrentlyActive ? false : true;

    // If turning chamber off, validate today's bookings (don't allow mixed seen/non-seen state)
    if (isCurrentlyActive) {
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');

        const today = new Date();
        const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

        const bookingsRef = collection(db, 'bookings');
        const numericChamberId = typeof chamber.id === 'string' ? parseInt(chamber.id, 10) : chamber.id;

        const chamberBookingsQuery = query(
          bookingsRef,
          where('chamberId', '==', numericChamberId),
          where('appointmentDate', '==', todayStr)
        );

        const allBookingsSnap = await getDocs(chamberBookingsQuery);
        const bookingsSnap = { docs: allBookingsSnap.docs.filter(doc => !doc.data().isCancelled) };

        const seenPatients = bookingsSnap.docs.filter(doc => doc.data().isMarkedSeen === true);
        const nonSeenPatients = bookingsSnap.docs.filter(doc => doc.data().isMarkedSeen !== true);

        if (seenPatients.length > 0 && nonSeenPatients.length > 0) {
          toast.error('Cannot Suspend Chamber', {
            description: `${seenPatients.length} SEEN + ${nonSeenPatients.length} NON-SEEN patients. Cancel non-seen individually or mark all as seen first.`,
            duration: 7000,
          });
          return;
        }
      } catch (error) {
        console.error('Error checking chamber patients:', error);
        toast.error('Failed to check patient status');
        return;
      }
    }

    const chamberLocationKey = clinicLocationId ? String(clinicLocationId) : String(chamber.clinicLocationId || '001');
    const updatedSchedules = demoSchedules.map((s) => {
      const idMatches = String(s.id) === chamberKey;
      const locationMatches = String(s.clinicLocationId || '001') === chamberLocationKey;
      return idMatches && locationMatches ? { ...s, isActive: newStatus } : s;
    });

    if (newStatus) {
      const newDates = { ...chamberInactiveDates };
      delete newDates[chamberKey];
      setChamberInactiveDates(newDates);
    } else {
      setChamberInactiveDates({
        ...chamberInactiveDates,
        [chamberKey]: { startDate: '', endDate: '' }
      });
    }

    setDemoSchedules(updatedSchedules);

    try {
      await updateDoc(doc(db, 'doctors', doctorId), {
        chambers: updatedSchedules,
        updatedAt: serverTimestamp()
      });

      toast.success(newStatus ? 'Chamber Activated' : 'Chamber Deactivated', {
        description: newStatus
          ? `${chamber.chamberName} is now accepting bookings.`
          : `${chamber.chamberName} is now turned off. Please set the inactive date range.`,
      });
    } catch (error) {
      console.error('Error toggling chamber status:', error);
      toast.error('Failed to update chamber status');
      setDemoSchedules(demoSchedules);
    }
  };

  const handleSaveChamberInactivePeriod = async (chamberId: number) => {
    if (!doctorId || !db) {
      toast.error('Authentication error');
      return;
    }

    const dates = chamberInactiveDates[chamberId];
    if (!dates || !dates.startDate || !dates.endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    if (new Date(dates.startDate) > new Date(dates.endDate)) {
      toast.error('Start date cannot be after end date');
      return;
    }

    const chamber = demoSchedules.find(s => s.id === chamberId);
    if (!chamber) return;

    const newPeriod = {
      startDate: dates.startDate,
      endDate: dates.endDate,
      createdAt: new Date().toISOString(),
    };

    const updatedSchedules = demoSchedules.map(s => {
      if (s.id === chamberId) {
        const existingPeriods = s.inactivePeriods || [];
        return {
          ...s,
          inactivePeriods: [...existingPeriods, newPeriod],
        };
      }
      return s;
    });

    setDemoSchedules(updatedSchedules);

    // Clear the date picker state
    const newDates = { ...chamberInactiveDates };
    delete newDates[chamberId];
    setChamberInactiveDates(newDates);

    try {
      await updateDoc(doc(db, 'doctors', doctorId), {
        chambers: updatedSchedules,
        updatedAt: serverTimestamp()
      });

      toast.success('Chamber Closure Scheduled', {
        description: `${chamber.chamberName} will be unavailable from ${dates.startDate} to ${dates.endDate}.`,
        duration: 5000,
      });
    } catch (error) {
      console.error('Error saving inactive period:', error);
      toast.error('Failed to save schedule');
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
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed?.(!isSidebarCollapsed)}
      />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
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
          {/* Tab Switcher */}
          <div className="flex space-x-6 mb-8 border-b border-gray-800">
            <button
              onClick={() => setCurrentTab('clinics')}
              className={`pb-3 px-2 text-sm font-medium transition-colors relative ${
                currentTab === 'clinics' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              My Clinics
              {currentTab === 'clinics' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setCurrentTab('schedules')}
              className={`pb-3 px-2 text-sm font-medium transition-colors relative ${
                currentTab === 'schedules' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Schedule Manager
              {currentTab === 'schedules' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full" />
              )}
            </button>
            {hasVideoConsultation && (
              <button
                onClick={() => setCurrentTab('vcTime')}
                className={`pb-3 px-2 text-sm font-medium transition-colors relative ${
                  currentTab === 'vcTime' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                VC Time
                {currentTab === 'vcTime' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full" />
                )}
              </button>
            )}
          </div>

          {currentTab === 'schedules' && (
            <>
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

                {/* Manual Clinic Selection */}
                <div className="space-y-2">
                  <Label htmlFor="manual-clinic" className="text-gray-300 text-sm">
                    Select Clinic
                  </Label>
                  <Select
                    value={selectedManualClinicId || 'none'}
                    onValueChange={(value) => {
                      setSelectedManualClinicId(value === 'none' ? '' : value);
                      if (value && value !== 'none') setClinicCode('');
                    }}
                  >
                    <SelectTrigger id="manual-clinic" className="bg-gray-900/50 border-gray-700 text-white">
                      <SelectValue placeholder="Select a clinic (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Enter manually)</SelectItem>
                      {manualClinics.map((clinic, idx) => (
                        <SelectItem key={`${clinic.id}::${clinic.clinicCode || idx}`} value={`${clinic.id}::${clinic.clinicCode || idx}`}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span>{clinic.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              clinic.clinicCode
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            }`}>
                              {clinic.clinicCode ? 'Linked' : 'Alternative Connect'}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Clinic Status Feedback Box */}
                  {selectedManualClinicId && (
                    <div className={`p-3 rounded-lg border text-xs space-y-2 ${
                      manualClinics.find(c => `${c.id}::${c.clinicCode || ''}` === selectedManualClinicId || c.id === selectedManualClinicId)?.clinicCode
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-amber-500/5 border-amber-500/20'
                    }`}>
                      <div className="flex items-center gap-2">
                        {manualClinics.find(c => `${c.id}::${c.clinicCode || ''}` === selectedManualClinicId || c.id === selectedManualClinicId)?.clinicCode ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-400 font-medium">System Linked</span>
                          </>
                        ) : (
                          <>
                            <Info className="w-3 h-3 text-amber-500" />
                            <span className="text-amber-400 font-medium">Alternative Connect</span>
                          </>
                        )}
                      </div>
                      <p className="text-gray-400 leading-relaxed">
                        {manualClinics.find(c => `${c.id}::${c.clinicCode || ''}` === selectedManualClinicId || c.id === selectedManualClinicId)?.clinicCode
                          ? "Dual booking enabled via Doctor & Clinic QR codes. Patient lists synced automatically."
                          : "Non-linked clinic. System will block Dr. QR during chamber time and send patient lists via SMS/WhatsApp 1 hour prior."}
                      </p>
                    </div>
                  )}

                  <p className="text-gray-500 text-xs px-1">
                    Select from your added clinics to auto-fill details and manage booking behavior.
                  </p>
                </div>

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
                      disabled={!!clinicData || !!selectedManualClinicId}
                      title={clinicData || selectedManualClinicId ? "Auto-filled from clinic data" : "Enter chamber name"}
                    />
                    {(clinicData || selectedManualClinicId) && (
                      <p className="text-xs text-emerald-500">✓ Auto-filled from clinic</p>
                    )}
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
                      disabled={!!clinicData || !!selectedManualClinicId}
                      title={clinicData || selectedManualClinicId ? "Auto-filled from clinic data" : "Enter chamber address"}
                    />
                    {(clinicData || selectedManualClinicId) && (
                      <p className="text-xs text-emerald-500">✓ Auto-filled from clinic</p>
                    )}
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
                    disabled={loadingClinic}
                  />
                  {loadingClinic && (
                    <p className="text-xs text-gray-400">🔍 Looking up clinic...</p>
                  )}
                  {clinicData && (
                    <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-3">
                      <p className="text-sm text-emerald-400 font-medium">✓ Linked to: {clinicData.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{clinicData.address}</p>
                      <p className="text-xs text-emerald-500/70 mt-1">Chamber name and address auto-filled from clinic</p>
                    </div>
                  )}
                  {!clinicData && !loadingClinic && (
                    <p className="text-xs text-gray-500">
                      Enter clinic code (5+ characters). Auto-search starts after you stop typing.
                    </p>
                  )}
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
                  <Card key={`${schedule.id}-${schedule.clinicLocationId || 'default'}`} className="bg-gray-800/50 border-gray-700 p-6">
                    <div className="space-y-4">
                      {/* Header with Days Pills and Toggle */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex flex-wrap gap-2 flex-1">
                          {schedule.days.map((day) => (
                            <span
                              key={day}
                              className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-xs sm:text-sm"
                            >
                              {day}
                            </span>
                          ))}
                          <span className="px-3 py-1 bg-gray-700/50 border border-gray-600 rounded-full text-gray-400 text-xs sm:text-sm">
                            {schedule.frequency}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 self-end sm:self-auto">
                          <span className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${schedule.isActive !== false ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {schedule.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                          <Switch
                            checked={schedule.isActive !== false}
                            onCheckedChange={() => handleToggleChamber(schedule.id, schedule.clinicLocationId || '001')}
                            className="bg-zinc-700"
                          />
                        </div>
                      </div>

                      {/* Chamber Info */}
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-white text-sm font-bold uppercase tracking-tight">{schedule.chamberName}</p>
                            <p className="text-zinc-300 text-sm font-medium">{schedule.chamberAddress}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-white text-sm font-bold">
                              {schedule.startTime} - {schedule.endTime}
                            </p>
                            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Working Hours</p>
                          </div>
                        </div>
                      </div>

                      {/* Date Range Picker - Shows when chamber is inactive */}
                      {schedule.isActive === false && chamberInactiveDates[schedule.id] && (
                        <div className="pt-4 border-t border-gray-700">
                          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-4">
                            <div>
                              <Label className="text-gray-300 text-sm mb-2 block">
                                Select Inactive Period
                              </Label>
                              <p className="text-gray-500 text-xs mb-3">
                                Choose the date range when this chamber should be unavailable
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-gray-400 text-xs mb-1.5 block">Start Date</Label>
                                <Input
                                  type="date"
                                  value={chamberInactiveDates[schedule.id]?.startDate || ''}
                                  onChange={(e) => setChamberInactiveDates({
                                    ...chamberInactiveDates,
                                    [schedule.id]: {
                                      ...chamberInactiveDates[schedule.id],
                                      startDate: e.target.value
                                    }
                                  })}
                                  className="bg-gray-800 border-gray-700 text-white"
                                  min={new Date().toISOString().split('T')[0]}
                                />
                              </div>
                              <div>
                                <Label className="text-gray-400 text-xs mb-1.5 block">End Date</Label>
                                <Input
                                  type="date"
                                  value={chamberInactiveDates[schedule.id]?.endDate || ''}
                                  onChange={(e) => setChamberInactiveDates({
                                    ...chamberInactiveDates,
                                    [schedule.id]: {
                                      ...chamberInactiveDates[schedule.id],
                                      endDate: e.target.value
                                    }
                                  })}
                                  className="bg-gray-800 border-gray-700 text-white"
                                  min={chamberInactiveDates[schedule.id]?.startDate || new Date().toISOString().split('T')[0]}
                                />
                              </div>
                            </div>

                            <Button
                              onClick={() => handleSaveChamberInactivePeriod(schedule.id)}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                              size="sm"
                            >
                              <CalendarIcon className="w-4 h-4 mr-2" />
                              Save Inactive Period
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Show Active Inactive Periods */}
                      {schedule.inactivePeriods && schedule.inactivePeriods.length > 0 && (
                        <div className="pt-4 border-t border-gray-700">
                          <p className="text-gray-400 text-xs mb-2">Scheduled Closures:</p>
                          <div className="space-y-2">
                            {schedule.inactivePeriods.map((period, idx) => (
                              <div key={idx} className="bg-red-900/20 border border-red-900/30 rounded px-3 py-2 flex items-center justify-between">
                                <span className="text-red-400 text-xs">
                                  {period.startDate} to {period.endDate}
                                </span>
                                <Button
                                  onClick={() => {
                                    const updatedSchedules = demoSchedules.map(s => {
                                      if (s.id === schedule.id) {
                                        const nextPeriods = s.inactivePeriods?.filter((_, i) => i !== idx) || [];
                                        return {
                                          ...s,
                                          inactivePeriods: nextPeriods,
                                          isActive: nextPeriods.length === 0 ? true : s.isActive
                                        };
                                      }
                                      return s;
                                    });
                                    setDemoSchedules(updatedSchedules);
                                    updateDoc(doc(db!, 'doctors', doctorId), {
                                      chambers: updatedSchedules,
                                      updatedAt: serverTimestamp()
                                    });
                                    toast.success('Inactive period removed');
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Capacity & Actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-700">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                          <span className="text-white text-sm font-bold">{schedule.maxCapacity}</span>
                          <span className="text-gray-400 text-xs sm:text-sm lowercase">patients/day</span>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Button
                            onClick={() => handleEditSchedule(schedule)}
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-none border-gray-700 text-gray-300 hover:bg-gray-900 hover:text-white h-9 px-3"
                          >
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            EDIT
                          </Button>
                          <Button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-none border-red-900/50 text-red-400 hover:bg-red-950 hover:text-red-300 h-9 px-3"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
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
            </>
          )}

      {currentTab === 'clinics' && (
        <div className="space-y-8">
          {/* Section 1: Add/Edit Clinic */}
          <div>
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-white">Manage Clinics</h2>
              <p className="text-gray-400 text-sm hidden md:block">Add and manage your external clinics</p>
            </div>
            <p className="text-gray-400 text-sm md:hidden mb-6">Add and manage your external clinics</p>

            <Card className="bg-gray-800/50 border-gray-700 p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Clinic Name</Label>
                    <Input
                      value={clinicFormName}
                      onChange={(e) => setClinicFormName(e.target.value)}
                      placeholder="e.g. City Health Center"
                      className="bg-gray-900/50 border-gray-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Clinic Phone</Label>
                    <Input
                      value={clinicFormPhone}
                      onChange={(e) => setClinicFormPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="bg-gray-900/50 border-gray-700 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Clinic Code <span className="text-gray-500 text-xs">(Optional)</span></Label>
                    <div className="flex gap-2">
                      <Input
                        value={clinicFormCode}
                        onChange={(e) => setClinicFormCode(e.target.value.toUpperCase())}
                        placeholder="HQR-XXXXXX-XXXX-CLN"
                        className="bg-gray-900/50 border-gray-700 text-white font-mono flex-1"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={handleVerifyClinicFormCode}
                        disabled={loadingClinic || !clinicFormCode.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4"
                      >
                        {loadingClinic ? '...' : 'LINK'}
                      </Button>
                    </div>
                    <p className="text-[10px] text-gray-500 italic">
                      Linking a code enables dual bookings via Doctor & Clinic QR codes.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Address</Label>
                    <Input
                      value={clinicFormAddress}
                      onChange={(e) => setClinicFormAddress(e.target.value)}
                      placeholder="Full address of the clinic"
                      className="bg-gray-900/50 border-gray-700 text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2 gap-3">
                   {editingClinicId && (
                    <Button
                      onClick={handleResetClinicForm}
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-900 hover:text-white"
                    >
                      CANCEL
                    </Button>
                   )}
                  <Button
                    onClick={handleSaveManualClinic}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {editingClinicId ? 'UPDATE CLINIC' : 'ADD CLINIC'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Section 2: Your Clinics List */}
          <div>
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-white">Your Clinics</h2>
            </div>

            {manualClinics.length === 0 ? (
               <Card className="bg-gray-800/50 border-gray-700 p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 mb-4 flex items-center justify-center bg-gray-900/50 rounded-full">
                    <Building2 className="w-8 h-8 text-gray-600" />
                  </div>
                  <h3 className="text-white mb-2">No Clinics Added</h3>
                  <p className="text-gray-400 text-sm">
                    Add your practicing clinics to start scheduling chambers there
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {manualClinics.map((clinic) => (
                  <Card key={clinic.id} className="bg-gray-800/50 border-gray-700 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium text-lg">{clinic.name}</h4>
                          <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                            <MapPin className="w-4 h-4" />
                            <span>{clinic.address}</span>
                          </div>
                          {clinic.phone && (
                            <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                              <Phone className="w-4 h-4" />
                              <span>{clinic.phone}</span>
                            </div>
                          )}
                          {clinic.clinicCode && (
                            <div className="flex items-center gap-2 text-emerald-400 text-sm mt-1">
                              <QrCode className="w-4 h-4" />
                              <span className="font-mono text-xs">Linked: {clinic.clinicCode}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => handleEditManualClinic(clinic)}
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white hover:bg-gray-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            setClinicToDelete(clinic.id);
                            setShowClinicDeleteModal(true);
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Doctor Self-Restriction Toggle - Only for linked clinics */}
                    {clinic.clinicCode && (
                      <div className="mt-4 pt-4 border-t border-gray-700/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Eye className={`w-4 h-4 ${selfRestrictedClinics.includes(clinic.clinicCode!) ? 'text-red-400' : 'text-emerald-400'}`} />
                            <span className="text-xs text-gray-300">Hide my QR data from clinic</span>
                          </div>
                          <Switch
                            checked={selfRestrictedClinics.includes(clinic.clinicCode!)}
                            onCheckedChange={() => handleToggleSelfRestriction(clinic.clinicCode!)}
                            className={selfRestrictedClinics.includes(clinic.clinicCode!)
                              ? 'data-[state=checked]:bg-red-500'
                              : 'data-[state=checked]:bg-emerald-500'}
                          />
                        </div>
                        <p className={`text-[10px] mt-1 ml-6 ${selfRestrictedClinics.includes(clinic.clinicCode!) ? 'text-red-400' : 'text-gray-500'}`}>
                          {selfRestrictedClinics.includes(clinic.clinicCode!)
                            ? '🔒 Clinic cannot see your QR booking patients'
                            : '✅ Clinic can see your QR booking patients'}
                        </p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {currentTab === 'vcTime' && (
        <div className="space-y-8">
          <div>
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-white">Video Consultation Schedule</h2>
              <p className="text-gray-400 text-sm hidden md:block">Define your available time slots for video consultations</p>
            </div>
            <p className="text-gray-400 text-sm md:hidden mb-6">Define your available time slots for video consultations</p>

            {/* Add/Edit VC Slot Form */}
            <Card className="bg-gray-800/50 border-gray-700 p-6 mb-6">
              <h3 className="text-white mb-4">{editingVcSlotId !== null ? 'Edit VC Slot' : 'Add VC Time Slot'}</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-gray-300 text-sm mb-2 block">Start Time</Label>
                  <Input
                    type="time"
                    value={vcSlotStartTime}
                    onChange={(e) => setVcSlotStartTime(e.target.value)}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm mb-2 block">End Time</Label>
                  <Input
                    type="time"
                    value={vcSlotEndTime}
                    onChange={(e) => setVcSlotEndTime(e.target.value)}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
              </div>

              {/* Days Selection */}
              <div className="mb-4">
                <Label className="text-gray-300 text-sm mb-2 block">Available Days</Label>
                <div className="flex flex-wrap gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <button
                      key={day}
                      onClick={() => {
                        setVcSlotDays(prev =>
                          prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        vcSlotDays.includes(day)
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                      setVcSlotDays(vcSlotDays.length === 7 ? [] : allDays);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-emerald-400 hover:bg-gray-600"
                  >
                    {vcSlotDays.length === 7 ? 'Clear All' : 'All Days'}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={async () => {
                    if (!vcSlotStartTime || !vcSlotEndTime) {
                      toast.error('Please set both start and end time');
                      return;
                    }
                    if (vcSlotDays.length === 0) {
                      toast.error('Please select at least one day');
                      return;
                    }
                    if (vcSlotStartTime >= vcSlotEndTime) {
                      toast.error('End time must be after start time');
                      return;
                    }

                    // Check overlap with existing VC slots (skip self when editing)
                    const otherVcSlots = vcTimeSlots.filter(s => s.id !== editingVcSlotId && s.isActive);
                    for (const existing of otherVcSlots) {
                      if (hasCommonDays(vcSlotDays, existing.days) && timeRangesOverlap(vcSlotStartTime, vcSlotEndTime, existing.startTime, existing.endTime)) {
                        const commonDays = vcSlotDays.filter(d => existing.days.includes(d)).map(d => d.slice(0, 3)).join(', ');
                        toast.error('VC Slot Conflict!', {
                          description: `Overlaps with existing VC slot ${existing.startTime}-${existing.endTime} on ${commonDays}`,
                          duration: 6000,
                        });
                        return;
                      }
                    }

                    // Check overlap with chamber schedules
                    const activeChambers = demoSchedules.filter(s => s.isActive !== false);
                    for (const chamber of activeChambers) {
                      const chamberDays = chamber.frequency === 'Daily'
                        ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                        : (chamber.days || []);
                      if (chamber.startTime && chamber.endTime && hasCommonDays(vcSlotDays, chamberDays) && timeRangesOverlap(vcSlotStartTime, vcSlotEndTime, chamber.startTime, chamber.endTime)) {
                        const commonDays = vcSlotDays.filter(d => chamberDays.includes(d)).map(d => d.slice(0, 3)).join(', ');
                        toast.error('Schedule Conflict!', {
                          description: `Overlaps with chamber "${chamber.chamberName}" (${chamber.startTime}-${chamber.endTime}) on ${commonDays}. A doctor cannot be in chamber and VC at the same time!`,
                          duration: 8000,
                        });
                        return;
                      }
                    }

                    let updatedSlots;
                    if (editingVcSlotId !== null) {
                      updatedSlots = vcTimeSlots.map(s =>
                        s.id === editingVcSlotId
                          ? { ...s, startTime: vcSlotStartTime, endTime: vcSlotEndTime, days: vcSlotDays }
                          : s
                      );
                    } else {
                      const newId = vcTimeSlots.length > 0 ? Math.max(...vcTimeSlots.map(s => s.id)) + 1 : 1;
                      updatedSlots = [...vcTimeSlots, {
                        id: newId,
                        startTime: vcSlotStartTime,
                        endTime: vcSlotEndTime,
                        days: vcSlotDays,
                        isActive: true
                      }];
                    }

                    setSavingVcSlots(true);
                    try {
                      await updateDoc(doc(db!, 'doctors', doctorId), { vcTimeSlots: updatedSlots, updatedAt: serverTimestamp() });
                      setVcTimeSlots(updatedSlots);
                      setVcSlotStartTime('');
                      setVcSlotEndTime('');
                      setVcSlotDays([]);
                      setEditingVcSlotId(null);
                      toast.success(editingVcSlotId !== null ? 'VC slot updated' : 'VC slot added');
                    } catch (error) {
                      console.error('Error saving VC slots:', error);
                      toast.error('Failed to save VC slot');
                    } finally {
                      setSavingVcSlots(false);
                    }
                  }}
                  disabled={savingVcSlots}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {savingVcSlots ? 'Saving...' : editingVcSlotId !== null ? 'Update Slot' : 'Add Slot'}
                </Button>
                {editingVcSlotId !== null && (
                  <Button
                    onClick={() => {
                      setEditingVcSlotId(null);
                      setVcSlotStartTime('');
                      setVcSlotEndTime('');
                      setVcSlotDays([]);
                    }}
                    variant="ghost"
                    className="text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </Card>

            {/* Saved VC Slots List */}
            {vcTimeSlots.length === 0 ? (
              <Card className="bg-gray-800/50 border-gray-700 p-8 text-center">
                <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No VC time slots added yet</p>
                <p className="text-gray-500 text-sm mt-1">Add your available video consultation hours above</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {vcTimeSlots.map((slot) => (
                  <Card key={slot.id} className={`bg-gray-800/50 border-gray-700 p-4 ${!slot.isActive ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Clock className="w-4 h-4 text-blue-400" />
                          <span className="text-white font-medium">
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <Switch
                            checked={slot.isActive}
                            onCheckedChange={async (checked) => {
                              const updatedSlots = vcTimeSlots.map(s =>
                                s.id === slot.id ? { ...s, isActive: checked } : s
                              );
                              try {
                                await updateDoc(doc(db!, 'doctors', doctorId), { vcTimeSlots: updatedSlots, updatedAt: serverTimestamp() });
                                setVcTimeSlots(updatedSlots);
                                toast.success(checked ? 'Slot enabled' : 'Slot disabled');
                              } catch {
                                toast.error('Failed to update slot');
                              }
                            }}
                            className="data-[state=checked]:bg-emerald-500"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5 ml-7">
                          {slot.days.map((day) => (
                            <span key={day} className="px-2 py-0.5 rounded-md bg-gray-700 text-gray-300 text-xs">
                              {day.slice(0, 3)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 ml-3">
                        <Button
                          onClick={() => {
                            setEditingVcSlotId(slot.id);
                            setVcSlotStartTime(slot.startTime);
                            setVcSlotEndTime(slot.endTime);
                            setVcSlotDays(slot.days);
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white hover:bg-gray-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={async () => {
                            const updatedSlots = vcTimeSlots.filter(s => s.id !== slot.id);
                            try {
                              await updateDoc(doc(db!, 'doctors', doctorId), { vcTimeSlots: updatedSlots, updatedAt: serverTimestamp() });
                              setVcTimeSlots(updatedSlots);
                              toast.success('VC slot deleted');
                            } catch {
                              toast.error('Failed to delete slot');
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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

      {/* Delete Clinic Confirmation Modal */}
      <Dialog open={showClinicDeleteModal} onOpenChange={setShowClinicDeleteModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Clinic</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete this clinic? This will not affect existing schedules, but you won't be able to select it for new ones.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <Button
              onClick={() => {
                setShowClinicDeleteModal(false);
                setClinicToDelete(null);
              }}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              CANCEL
            </Button>
            <Button
              onClick={handleDeleteManualClinic}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              DELETE
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

