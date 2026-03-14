import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase/config';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { DatabaseService } from '../lib/firebase/db.service';
import { Card, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  UserPlus,
  Link as LinkIcon,
  Mail,
  Phone,
  MapPin,
  Stethoscope,
  User,
  Building2,
  Clock,
  Send,
  Copy,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  UserMinus,
  Calendar,
  Users,
  Edit,
  Info,
  Menu,
  Check,
  AlertTriangle,
  Key,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import ClinicSidebar from './ClinicSidebar';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

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
  clinicId?: string; // CRITICAL: Track which clinic owns this chamber
}

interface LinkedDoctor {
  uid: string;
  email: string;
  name: string;
  specialty?: string;
  specialties?: string[];
  dateOfBirth?: string;
  phone?: string;
  pinCode?: string;
  doctorCode?: string;
  qrNumber?: string;
  status?: 'pending_invitation' | 'active' | 'inactive';
  invitedBy?: {
    clinicId: string;
    clinicName: string;
    timestamp: any;
  };
  invitationSentAt?: any;
  invitationExpiresAt?: any;
  chambers?: Chamber[]; // Schedules for this doctor
  maxAdvanceBookingDays?: number;
  toggleOffPeriod?: {
    startDate: string;
    endDate: string;
    reason: string;
    setBy: string;
    setAt: any;
  };
  restrictPatientDataAccess?: boolean; // NEW: Clinic controls if doctor can see patient details
  registrationNumber?: string; // Doctor's medical registration number
  showRegistrationOnRX?: boolean; // Whether to show reg number on digital prescriptions
  footerLine1?: string; // Custom footer line 1 for RX/Diet Chart PDFs
  footerLine2?: string; // Custom footer line 2 for RX/Diet Chart PDFs
}

const SPECIALTIES = [
  'General Physician',
  'Cardiologist',
  'Dermatologist',
  'Pediatrician',
  'Orthopedic',
  'Gynecologist',
  'Neurologist',
  'Psychiatrist',
  'ENT Specialist',
  'Ophthalmologist',
  'Dentist',
  'Urologist',
  'Gastroenterologist',
  'Endocrinologist',
  'Pulmonologist',
  'Nephrologist',
  'Oncologist',
  'Rheumatologist',
  'Anesthesiologist',
  'Radiologist',
  'Pathologist',
  'Other'
];

interface ManageDoctorsProps {
  onNavigate?: (view: string, doctorId?: string) => void;
  clinicId?: string;
}

const ManageDoctors: React.FC<ManageDoctorsProps> = ({ onNavigate, clinicId: propClinicId }) => {
  const [linkedDoctors, setLinkedDoctors] = useState<LinkedDoctor[]>([]);
  const [expandedDoctors, setExpandedDoctors] = useState<Set<string>>(new Set());
  const [allDoctors, setAllDoctors] = useState<any[]>([]); // For searching existing doctors
  // const [doctorCode, setDoctorCode] = useState(''); // Removed duplicate declaration
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [clinicData, setClinicData] = useState<any>(null);
  const effectiveClinicId = propClinicId || auth.currentUser?.uid;
  const NO_LOCATION_ID = '__no_locations__';

  const [clinicLocations, setClinicLocations] = useState<Array<{ id: string; name: string; address?: string }>>([]);
  const [defaultLocationId, setDefaultLocationId] = useState<string>(NO_LOCATION_ID);
  const [selectedDoctorLocationId, setSelectedDoctorLocationId] = useState<string>(NO_LOCATION_ID);

  // Calculate default dates for toggle off (tomorrow and 7 days ahead)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 8);

  // Toggle Off States (inline UI with confirmation modals)
  const [selectedDoctorForToggle, setSelectedDoctorForToggle] = useState<{ id: string; name: string; } | null>(null);
  const [toggleOffStartDate, setToggleOffStartDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [toggleOffEndDate, setToggleOffEndDate] = useState(nextWeek.toISOString().split('T')[0]);
  const [toggleOffReason, setToggleOffReason] = useState<'vacation' | 'medical' | 'other'>('vacation');
  const [showConfirmOffModal, setShowConfirmOffModal] = useState(false);
  const [showConfirmRestoreModal, setShowConfirmRestoreModal] = useState(false);
  const [doctorToRestore, setDoctorToRestore] = useState<{ id: string; name: string; period: any } | null>(null);

  // Add New Doctor Form
  const [newDoctor, setNewDoctor] = useState({
    email: '',
    name: '',
    dateOfBirth: '',
    pinCode: ''
  });
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [availableQR, setAvailableQR] = useState<string>('');

  // Link Existing Doctor
  const [doctorCode, setDoctorCode] = useState('');
  const [searchedDoctor, setSearchedDoctor] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Temp Doctor Access states
  const [tempAccessLoading, setTempAccessLoading] = useState<string | null>(null); // doctorId currently generating
  const [tempAccessData, setTempAccessData] = useState<{ [doctorId: string]: { link: string; pin: string; expiry: string } }>({});
  const [copiedTempField, setCopiedTempField] = useState<string>('');

  useEffect(() => {
    if (effectiveClinicId) {
      loadClinicData();
      loadAllDoctors();
    }
  }, [effectiveClinicId, auth?.currentUser]);

  // Generate Temporary Doctor Access (link + PIN)
  const handleGenerateTempAccess = async (doctor: LinkedDoctor) => {
    const clinicId = effectiveClinicId;
    if (!clinicId) return;
    setTempAccessLoading(doctor.uid);

    try {
      const accessToken = `tmp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const accessPin = Math.floor(100000 + Math.random() * 900000).toString();
      const today = new Date().toISOString().split('T')[0];

      // Get clinic name
      const clinicDoc = await getDoc(doc(db, 'clinics', clinicId));
      const clinicName = clinicDoc.exists() ? (clinicDoc.data().clinicName || clinicDoc.data().name || '') : '';

      // Deactivate any existing active tokens for this doctor
      const existingRef = collection(db, 'clinics', clinicId, 'tempDoctorAccess');
      const existingQ = query(existingRef, where('doctorId', '==', doctor.uid), where('isActive', '==', true));
      const existingSnap = await getDocs(existingQ);
      for (const existingDoc of existingSnap.docs) {
        await updateDoc(existingDoc.ref, { isActive: false });
      }

      // Create new temp access doc
      await addDoc(collection(db, 'clinics', clinicId, 'tempDoctorAccess'), {
        doctorId: doctor.uid,
        doctorName: doctor.name,
        clinicId,
        clinicName,
        accessToken,
        accessPin,
        isActive: true,
        expiryDate: today, // Valid for today only
        chambers: (doctor.chambers || []).filter(ch => ch.clinicId === clinicId || !ch.clinicId),
        createdAt: serverTimestamp(),
        loginCount: 0
      });

      const link = `${window.location.origin}/temp-doctor-login?token=${accessToken}&clinic=${clinicId}`;
      setTempAccessData(prev => ({
        ...prev,
        [doctor.uid]: { link, pin: accessPin, expiry: today }
      }));

      toast.success(`Temp access generated for Dr. ${doctor.name}`);
    } catch (err) {
      console.error('Error generating temp access:', err);
      toast.error('Failed to generate temporary access');
    } finally {
      setTempAccessLoading(null);
    }
  };

  const copyTempField = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTempField(fieldId);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedTempField(''), 2000);
  };

  // Load all doctors for search/add
  const loadAllDoctors = async () => {
    const clinicId = effectiveClinicId;
    if (!clinicId) return;
    try {
      const doctorsRef = collection(db, 'doctors');
      const snapshot = await getDocs(doctorsRef);
      setAllDoctors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error loading all doctors:', error);
    }
  };

  // Add/link an existing doctor to this clinic
  const handleLinkDoctor = async (doctorId: string) => {
    if (!auth || !db) {
      toast.error('Firebase not initialized');
      return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      await DatabaseService.linkDoctorToClinic(doctorId, effectiveClinicId!);
      toast.success('Doctor linked to clinic');
      loadClinicData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to link doctor');
    }
  };

  // UI for searching and linking existing doctors
  const renderDoctorSearch = () => (
    <div className="bg-[#181C24] p-4 rounded-lg mb-4">
      <h3 className="text-lg font-semibold mb-2 text-white">Link Existing Doctor</h3>
      <Input
        placeholder="Search by email or doctor code"
        value={doctorCode}
        onChange={e => setDoctorCode(e.target.value)}
        className="mb-2 bg-[#23272F] text-white"
      />
      <div className="max-h-40 overflow-y-auto">
        {allDoctors.filter(doc =>
          (doc.email && doc.email.includes(doctorCode)) ||
          (doc.doctorCode && doc.doctorCode.includes(doctorCode))
        ).map(doc => (
          <div key={doc.id} className="flex items-center justify-between p-2 border-b border-[#23272F]">
            <div>
              <span className="text-white font-medium">{doc.name}</span>
              <span className="ml-2 text-xs text-gray-400">{doc.email}</span>
              <span className="ml-2 text-xs text-gray-400">{doc.doctorCode}</span>
              <span className="ml-2 text-xs text-gray-400">{doc.profileType || 'solo'}</span>
            </div>
            <Button size="sm" onClick={() => handleLinkDoctor(doc.id)} className="bg-blue-600 hover:bg-blue-700 text-white">Link</Button>
          </div>
        ))}
      </div>
    </div>
  );

  // UI for linked doctors
  const renderLinkedDoctors = () => (
    <div className="bg-[#181C24] p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-2 text-white">Linked Doctors</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {linkedDoctors.map(doc => (
          <Card key={doc.uid} className="bg-[#23272F] text-white">
            <CardHeader>
              <CardTitle>{doc.name}</CardTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge>{doc.specialty || 'N/A'}</Badge>
                <Badge variant="outline">{doc.profileType || 'solo'}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-2 text-sm text-gray-300">Email: {doc.email}</div>
              <div className="mb-2 text-sm text-gray-300">Doctor Code: {doc.doctorCode}</div>
              {doc.locationId && (
                <div className="mb-2 text-sm text-gray-300">Location: {clinicLocations.find(loc => loc.id === doc.locationId)?.name || doc.locationId}</div>
              )}
              <div className="mb-2 text-sm text-gray-300">Type: {doc.profileType || 'solo'}</div>
              <div className="mb-2 text-sm text-gray-300">Chambers: {doc.chambers?.length || 0}</div>
              {doc.profileType === 'clinic-only' && (
                <Button size="sm" onClick={() => handleEnableSolo(doc.uid)} className="bg-green-600 hover:bg-green-700 text-white mt-2">Enable Solo Practice</Button>
              )}
              <Button size="sm" onClick={() => handleUnlinkDoctor(doc.uid)} className="bg-red-600 hover:bg-red-700 text-white mt-2">Unlink</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const loadClinicData = async () => {
    const clinicId = effectiveClinicId;
    if (!clinicId) {
      console.log('No clinic ID available for loading clinic data');
      setLoading(false);
      return;
    }
    try {
      if (!auth || !db) {
        setLoading(false);
        return;
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const clinicRef = doc(db, 'clinics', clinicId);
      const clinicSnap = await getDoc(clinicRef);

      if (clinicSnap.exists()) {
        const data = clinicSnap.data();
        setClinicData(data);
        const rawLocations = data.locations || [];
        const clinicLocations = rawLocations.filter((loc: any) => loc?.id && loc?.name); // Remove any malformed entries
        setClinicLocations(clinicLocations);
        const resolvedDefaultLocationId = clinicLocations.length > 0 ? (data.defaultLocationId || clinicLocations[0].id) : NO_LOCATION_ID;
        setDefaultLocationId(resolvedDefaultLocationId);
        setSelectedDoctorLocationId(resolvedDefaultLocationId);

        // Load doctor data including chambers
        const doctorsData = data.linkedDoctorsDetails || [];

        // Branch managers: filter to only doctors assigned to their branch
        const branchId = localStorage.getItem('healqr_location_id') || '';
        const isBranchManager = localStorage.getItem('healqr_is_location_manager') === 'true';
        const filteredDoctorsData = isBranchManager && branchId
          ? doctorsData.filter((doctor: LinkedDoctor) => {
              if ((doctor as any).locationId) return (doctor as any).locationId === branchId;
              const chambers = (doctor as any).chambers || [];
              if (Array.isArray(chambers) && chambers.length > 0) {
                return chambers.some((ch: any) => (ch.clinicLocationId || ch.locationId) === branchId);
              }
              return false;
            })
          : doctorsData;

        const doctorsWithChambers = await Promise.all(
          filteredDoctorsData.map(async (doctor: LinkedDoctor) => {
            try {
              const doctorRef = doc(db, 'doctors', doctor.uid);
              const doctorSnap = await getDoc(doctorRef);

              if (doctorSnap.exists()) {
                const doctorData = doctorSnap.data();

                // CRITICAL FILTER: Show ONLY chambers belonging to THIS clinic
                const allChambers = doctorData.chambers || [];
                const clinicChambers = allChambers.filter((chamber: Chamber) =>
                  chamber.clinicId === clinicId
                );

                console.log(`🔒 SECURITY FILTER for Dr. ${doctor.name}:`, {
                  totalChambers: allChambers.length,
                  clinicChambers: clinicChambers.length,
                  clinicId: clinicId
                });

                return {
                  ...doctor,
                  chambers: clinicChambers, // ONLY clinic's chambers
                  maxAdvanceBookingDays: doctorData.maxAdvanceBookingDays || 30,
                  registrationNumber: doctorData.registrationNumber || '',
                  showRegistrationOnRX: doctorData.showRegistrationOnRX !== false,
                  footerLine1: doctorData.footerLine1 || '',
                  footerLine2: doctorData.footerLine2 || '',
                };
              }
              return doctor;
            } catch (err) {
              console.error(`Error loading chambers for doctor ${doctor.uid}:`, err);
              return doctor;
            }
          })
        );

        setLinkedDoctors(doctorsWithChambers);
      }

      // Fetch available QR from pool
      try {
        const qrPoolRef = collection(db, 'qrPool');
        const availableQuery = query(qrPoolRef, where('status', '==', 'available'));
        const qrSnap = await getDocs(availableQuery);

        if (!qrSnap.empty) {
          const firstAvailable = qrSnap.docs[0].data();
          setAvailableQR(firstAvailable.qrNumber || generateQRNumber());
        } else {
          setAvailableQR(generateQRNumber());
        }
      } catch (qrError) {
        console.error('QR pool error:', qrError);
        setAvailableQR(generateQRNumber());
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading clinic data:', error);
      setLoading(false);
    }
  };

  const generateDoctorCode = async (pinCode: string) => {
    if (!db) return `HQR-${pinCode}-0001-DR`;

    try {
      // Count existing doctors with this pincode (across all specialties)
      const doctorsRef = collection(db, 'doctors');
      const pincodeQuery = query(doctorsRef, where('pinCode', '==', pinCode));
      const pincodeSnap = await getDocs(pincodeQuery);

      const count = pincodeSnap.size + 1; // Next sequential number
      const sequential = count.toString().padStart(4, '0');

      return `HQR-${pinCode}-${sequential}-DR`;
    } catch (error) {
      console.error('Error generating doctor code:', error);
      return `HQR-${pinCode}-0001-DR`;
    }
  };

  const generateQRNumber = () => {
    // Generate HQR format: HQR0001, HQR1234, etc.
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `HQR${random}`;
  };

  const handleAddNewDoctor = async () => {
    const locationIdToUse = selectedDoctorLocationId && selectedDoctorLocationId !== NO_LOCATION_ID ? selectedDoctorLocationId : (defaultLocationId !== NO_LOCATION_ID ? defaultLocationId : '');
    if (!newDoctor.email || !newDoctor.name || selectedSpecialties.length === 0 || !newDoctor.pinCode || !newDoctor.dateOfBirth || !locationIdToUse) {
      toast.error('Please fill all required fields including clinic location');
      return;
    }

    if (!auth || !db) {
      toast.error('Firebase not initialized');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      // Check if doctor with this email already exists
      const doctorsRef = collection(db, 'doctors');
      const emailQuery = query(doctorsRef, where('email', '==', newDoctor.email));
      const emailSnap = await getDocs(emailQuery);

      if (!emailSnap.empty) {
        // Doctor exists - check if already linked to this clinic
        const existingDoctor = emailSnap.docs[0];
        const existingDoctorData = existingDoctor.data();
        const existingDoctorId = existingDoctor.id;

        // Check if already linked to this clinic
        const isAlreadyLinked = linkedDoctors.some(d => d.uid === existingDoctorId);
        if (isAlreadyLinked) {
          toast.error('This doctor is already linked to your clinic');
          return;
        }

        // Doctor exists but not linked - link them to this clinic
        console.log('🔗 Doctor found, linking to clinic...');

        // Update doctor's linkedClinics array
        const doctorRef = doc(db, 'doctors', existingDoctorId);
        const currentLinkedClinics = existingDoctorData.linkedClinics || [];
        await updateDoc(doctorRef, {
          linkedClinics: [...currentLinkedClinics, {
            clinicId: effectiveClinicId,
            clinicName: clinicData?.name || 'Clinic',
            clinicCode: clinicData?.clinicCode || ''
          }]
        });

        // Add to clinic's linkedDoctorsDetails
        const clinicRef = doc(db, 'clinics', effectiveClinicId);
        const existingDoctors = linkedDoctors || [];
        const newLinkedDoctor = {
          uid: existingDoctorId,
          email: existingDoctorData.email,
          name: existingDoctorData.name,
          dateOfBirth: existingDoctorData.dateOfBirth,
          specialties: existingDoctorData.specialties,
          pinCode: existingDoctorData.pinCode,
          doctorCode: existingDoctorData.doctorCode,
          qrNumber: existingDoctorData.qrNumber,
          status: existingDoctorData.status || 'active'
        };

        await updateDoc(clinicRef, {
          linkedDoctorsDetails: [...existingDoctors, newLinkedDoctor]
        });

        // Update local state immediately
        setLinkedDoctors([...existingDoctors, newLinkedDoctor]);

        toast.success(`✅ Doctor ${existingDoctorData.name} linked to your clinic!`);
        setShowAddModal(false);
        setNewDoctor({ email: '', name: '', pinCode: '', dateOfBirth: '' });
        setSelectedSpecialties([]);
        return;
      }

      // Doctor doesn't exist - create new doctor profile
      console.log('👤 Creating new doctor profile...');

      // Generate unique IDs
      const doctorId = `doc_${Date.now()}`;
      const doctorCode = await generateDoctorCode(newDoctor.pinCode);
      const qrNumber = availableQR; // Use pre-assigned QR from pool for clinic to use immediately

      // Create doctor document
      // IMPORTANT: Clinic can book appointments immediately using this QR code
      // Doctor MUST verify email to access dashboard and independent practice
      const newDoctorData = {
        uid: doctorId,
        email: newDoctor.email,
        name: newDoctor.name,
        dateOfBirth: newDoctor.dateOfBirth,
        specialties: selectedSpecialties, // Array of specialties
        pinCode: newDoctor.pinCode,
        locationId: locationIdToUse,
        doctorCode, // Generated immediately: HQR-{PINCODE}-{COUNT}-DR
        qrNumber, // Clinic uses this QR immediately for appointments
        status: 'pending_invitation', // Clinic can still book appointments
        emailVerified: false, // MUST verify to access dashboard
        canBookAppointments: true, // Clinic can book even before activation
        dashboardAccessEnabled: false, // Enabled ONLY after email verification
        profileLocked: false, // Will be true after activation (freezes email, DOB, pinCode)
        invitedBy: {
          clinicId: effectiveClinicId,
          clinicName: clinicData?.name || 'Clinic',
          timestamp: new Date()
        },
        linkedClinics: [{
          clinicId: effectiveClinicId,
          clinicName: clinicData?.name || 'Clinic',
          clinicCode: clinicData?.clinicCode || ''
        }],
        invitationSentAt: new Date(),
        invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date(),
        role: 'doctor',
        // Fields that will be frozen after activation:
        lockedFields: ['email', 'dateOfBirth', 'pinCode']
      };

      // Save to Firestore
      await setDoc(doc(db, 'doctors', doctorId), newDoctorData);

      // Update QR status to 'assigned' in qrPool
      try {
        const qrPoolRef = collection(db, 'qrPool');
        const qrQuery = query(qrPoolRef, where('qrNumber', '==', qrNumber));
        const qrSnap = await getDocs(qrQuery);
        if (!qrSnap.empty) {
          await updateDoc(doc(db, 'qrPool', qrSnap.docs[0].id), {
            status: 'assigned',
            assignedTo: doctorId,
            assignedBy: effectiveClinicId,
            assignedAt: new Date()
          });
        }
      } catch (error) {
        console.log('QR pool update skipped:', error);
      }

      // Update clinic's linkedDoctorsDetails
      const clinicRef = doc(db, 'clinics', effectiveClinicId);
      const existingDoctors = linkedDoctors || [];
      const newLinkedDoctor = {
        uid: doctorId,
        email: newDoctor.email,
        name: newDoctor.name,
        dateOfBirth: newDoctor.dateOfBirth,
        specialties: selectedSpecialties,
        pinCode: newDoctor.pinCode,
        locationId: locationIdToUse,
        doctorCode,
        qrNumber,
        status: 'pending_invitation'
      };

      await updateDoc(clinicRef, {
        linkedDoctorsDetails: [...existingDoctors, newLinkedDoctor]
      });

      // Update local state immediately
      setLinkedDoctors([...existingDoctors, newLinkedDoctor]);

      // Prepare invitation email data
      const invitationData = {
        doctorEmail: newDoctor.email,
        doctorName: newDoctor.name,
        doctorCode: doctorCode, // HQR-{PINCODE}-{COUNT}-DR
        qrNumber: qrNumber, // HQR#### format
        clinicName: clinicData?.name || 'Clinic',
        invitationLink: `https://www.healqr.com/doctor/activate?code=${doctorCode}`,
        expiresIn: '7 days'
      };

      // Email will be sent when doctor activates account via /doctor/activate page
      console.log('📧 Doctor activation link:', `${window.location.origin}/doctor/activate?code=${doctorCode}&email=${encodeURIComponent(newDoctor.email)}`);
      console.log('✅ Clinic can start booking appointments immediately using QR:', qrNumber);
      console.log('� QR Code assigned and tracked in qrPool collection for admin panel');
      console.log('🔒 Doctor MUST verify email to access dashboard');
      console.log('🎯 After activation, email/DOB/pinCode will be frozen');
      console.log('🖨️ Admin can send printed QR to doctor from admin panel using QR number:', qrNumber);

      toast.success(`✅ Doctor added! Code: ${doctorCode}. You can book appointments immediately.`);
      toast.info('Click the copy icon to share activation link with doctor.');

      // Reset form
      setShowAddModal(false);
      setNewDoctor({ email: '', name: '', pinCode: '', dateOfBirth: '' });
      setSelectedSpecialties([]);
      setSelectedDoctorLocationId(defaultLocationId);

    } catch (error) {
      console.error('Error adding doctor:', error);
      toast.error('Error adding doctor. Please try again.');
    }
  };

  const handleLinkExistingDoctor = async () => {
    if (!searchedDoctor) {
      console.error('No searched doctor found');
      toast.error('No doctor selected');
      return;
    }

    if (!auth || !db) {
      console.error('Firebase not initialized');
      toast.error('System error: Firebase not initialized');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('No current user');
      toast.error('Please login again');
      return;
    }

    try {
      console.log('🔗 Starting link process for doctor:', searchedDoctor.uid);

      // Check if already linked
      const isAlreadyLinked = linkedDoctors.some(d => d.uid === searchedDoctor.uid);
      if (isAlreadyLinked) {
        toast.error('This doctor is already linked to your clinic');
        return;
      }

      const newLinkedDoctor = {
        uid: searchedDoctor.uid,
        email: searchedDoctor.email || '',
        name: searchedDoctor.name || '',
        dateOfBirth: searchedDoctor.dateOfBirth || '',
        specialties: searchedDoctor.specialties || (searchedDoctor.specialty ? [searchedDoctor.specialty] : []),
        pinCode: searchedDoctor.pinCode || '',
        locationId: selectedDoctorLocationId || defaultLocationId,
        doctorCode: searchedDoctor.doctorCode || '',
        qrNumber: searchedDoctor.qrNumber || '',
        status: searchedDoctor.status || 'active'
      };

      console.log('📝 New linked doctor data:', newLinkedDoctor);

      // Update clinic's linkedDoctorsDetails
      const clinicRef = doc(db, 'clinics', effectiveClinicId!);
      const clinicSnap = await getDoc(clinicRef);

      let currentLinkedDoctors: LinkedDoctor[] = [];

      if (clinicSnap.exists()) {
        console.log('✅ Clinic document exists');
        const clinicDataFromDb = clinicSnap.data();
        currentLinkedDoctors = clinicDataFromDb.linkedDoctorsDetails || [];

        await updateDoc(clinicRef, {
          linkedDoctorsDetails: [...currentLinkedDoctors, newLinkedDoctor]
        });
        console.log('✅ Updated clinic linkedDoctorsDetails');
      } else {
        console.log('⚠️ Clinic document does not exist, creating it');
        await setDoc(clinicRef, {
          linkedDoctorsDetails: [newLinkedDoctor],
          createdAt: new Date()
        }, { merge: true });
        console.log('✅ Created clinic document with linked doctor');
      }

      // Update doctor's linkedClinics
      const doctorRef = doc(db, 'doctors', searchedDoctor.uid);
      const doctorSnap = await getDoc(doctorRef);

      if (doctorSnap.exists()) {
        console.log('✅ Doctor document exists');
        const existingClinics = doctorSnap.data().linkedClinics || [];

        // Check if clinic is already in doctor's linkedClinics
        const alreadyLinkedToClinic = existingClinics.some((c: any) => c.clinicId === currentUser.uid);

        if (!alreadyLinkedToClinic) {
          await updateDoc(doctorRef, {
            linkedClinics: [...existingClinics, {
              clinicId: effectiveClinicId,
              clinicName: clinicData?.name || 'Clinic',
              clinicCode: clinicData?.clinicCode || ''
            }],
            locationId: selectedDoctorLocationId || defaultLocationId
          });
          console.log('✅ Updated doctor linkedClinics and locationId');
        } else {
          console.log('ℹ️ Clinic already in doctor linkedClinics');
          // Ensure doctor has a locationId set for this clinic (optional override)
          await updateDoc(doctorRef, {
            locationId: selectedDoctorLocationId || defaultLocationId
          });
          console.log('✅ Updated doctor locationId for existing link');
        }
      } else {
        console.error('❌ Doctor document does not exist!');
        toast.error('Doctor profile not found');
        return;
      }

      console.log('🎉 Link process completed successfully');
      toast.success(`Dr. ${searchedDoctor.name} linked successfully!`);

      setDoctorCode('');
      setSearchedDoctor(null);
      setShowLinkModal(false);
      loadClinicData();

    } catch (error: any) {
      console.error('❌ Error linking doctor:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      toast.error(`Failed to link doctor: ${error.message || 'Unknown error'}`);
    }
  };

  const handleUnlinkDoctor = async (doctorId: string, doctorName: string) => {
    if (!confirm(`Are you sure you want to unlink Dr. ${doctorName}?`)) return;

    if (!auth || !db) {
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      // Remove from clinic's linkedDoctorsDetails
      const clinicRef = doc(db, 'clinics', effectiveClinicId!);
      const clinicSnap = await getDoc(clinicRef);

      if (clinicSnap.exists()) {
        const updatedDoctors = linkedDoctors.filter(d => d.uid !== doctorId);
        await updateDoc(clinicRef, {
          linkedDoctorsDetails: updatedDoctors
        });
      }

      // Remove clinic from doctor's linkedClinics
      const doctorRef = doc(db, 'doctors', doctorId);
      const doctorSnap = await getDoc(doctorRef);

      if (doctorSnap.exists()) {
        const existingClinics = doctorSnap.data().linkedClinics || [];
        const updatedClinics = existingClinics.filter((c: any) => c.clinicId !== effectiveClinicId);
        await updateDoc(doctorRef, {
          linkedClinics: updatedClinics
        });
      }

      toast.success(`Dr. ${doctorName} unlinked successfully`);
      loadClinicData();

    } catch (error) {
      console.error('Error unlinking doctor:', error);
      toast.error('Failed to unlink doctor');
    }
  };

  const handleResendInvitation = async (doctor: LinkedDoctor) => {
    try {
      // Prepare activation link
      const activationLink = `${window.location.origin}/doctor/activate?code=${doctor.doctorCode}&email=${encodeURIComponent(doctor.email)}`;
      console.log('📧 Doctor activation link:', activationLink);

      // Copy link to clipboard
      await navigator.clipboard.writeText(activationLink);

      toast.success('Activation link copied!', {
        description: 'Share this link with the doctor via WhatsApp/SMS/Email'
      });

    } catch (error: any) {
      console.error('Error copying link:', error);
      toast.error('Failed to copy link: ' + error.message);
    }
  };

  const handleSendViaWhatsApp = (doctor: LinkedDoctor) => {
    try {
      // Prepare activation link
      const activationLink = `${window.location.origin}/doctor/activate?code=${doctor.doctorCode}&email=${encodeURIComponent(doctor.email)}`;

      // Prepare WhatsApp message
      const message = `Hello Dr. ${doctor.name},\n\n` +
        `You have been invited to join HealQR platform by ${clinicData?.name || 'our clinic'}.\n\n` +
        `Your Doctor Code: ${doctor.doctorCode}\n` +
        `Your QR Number: ${doctor.qrNumber}\n\n` +
        `Please activate your account by clicking the link below:\n` +
        `${activationLink}\n\n` +
        `After activation, you will be able to:\n` +
        `✅ Access your personal dashboard\n` +
        `✅ Manage your schedules\n` +
        `✅ View patient bookings\n` +
        `✅ Get your own QR code for independent practice\n\n` +
        `Best regards,\n` +
        `${clinicData?.name || 'Clinic Team'}`;

      // Open WhatsApp with pre-filled message
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      toast.success('WhatsApp opened with invitation message');

    } catch (error: any) {
      console.error('Error opening WhatsApp:', error);
      toast.error('Failed to open WhatsApp: ' + error.message);
    }
  };

  const getStatusBadge = (status?: string, doctor?: LinkedDoctor) => {
    if (status === 'active') {
      return (
        <Badge className="bg-blue-600 text-white">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    } else if (status === 'pending_invitation') {
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-orange-600 text-white">
            <Clock className="w-3 h-3 mr-1" />
            Pending Activation
          </Badge>
          {doctor && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleResendInvitation(doctor);
                }}
                className="p-1.5 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
                title="Copy Activation Link"
              >
                <Copy className="w-3.5 h-3.5 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendViaWhatsApp(doctor);
                }}
                className="p-1.5 rounded-full bg-green-600 hover:bg-green-700 transition-colors"
                title="Send via WhatsApp"
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </>
          )}
        </div>
      );
    } else {
      return (
        <Badge className="bg-gray-600 text-white">
          <XCircle className="w-3 h-3 mr-1" />
          Inactive
        </Badge>
      );
    }
  };

  const isInvitationExpired = (expiresAt: any) => {
    if (!expiresAt) return false;
    const expiryDate = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    return expiryDate < new Date();
  };

  const handleToggleDoctorStatus = async (doctorId: string, doctorName: string, currentStatus: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // If turning OFF, show inline date selection UI
      if (currentStatus === 'active') {
        setSelectedDoctorForToggle({ id: doctorId, name: doctorName });
        // Reset to default dates
        const tom = new Date();
        tom.setDate(tom.getDate() + 1);
        const week = new Date();
        week.setDate(week.getDate() + 8);
        setToggleOffStartDate(tom.toISOString().split('T')[0]);
        setToggleOffEndDate(week.toISOString().split('T')[0]);
        return;
      }

      // If turning ON (reactivating), don't do it immediately - show confirmation modal
      // This case is handled by the "Reactivate Chamber" button, not the toggle
    } catch (error) {
      console.error('Error toggling doctor status:', error);
      toast.error('Failed to update doctor status');
    }
  };

  const handleTurnOffChamber = () => {
    if (!selectedDoctorForToggle) return;

    // Validate dates before showing confirmation
    if (!toggleOffStartDate || !toggleOffEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    // Check if start date is today or in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedStart = new Date(toggleOffStartDate);
    selectedStart.setHours(0, 0, 0, 0);

    if (selectedStart <= today) {
      toast.error('Cannot Select Current Day', {
        description: 'Doctor can only be turned off from tomorrow onwards. Cancel today\'s appointments individually.',
        duration: 6000,
      });
      return;
    }

    // Check if end date is before start date
    const selectedEnd = new Date(toggleOffEndDate);
    if (selectedEnd < selectedStart) {
      toast.error('End date must be after start date');
      return;
    }

    // Show confirmation modal
    setShowConfirmOffModal(true);
  };

  const handleConfirmToggleOff = async () => {
    if (!selectedDoctorForToggle) return;

    try {
      const user = auth.currentUser;
      if (!user) return;

      const newStatus = 'inactive';

      // Update in clinic's linkedDoctorsDetails
      if (effectiveClinicId) {
        const clinicRef = doc(db, 'clinics', effectiveClinicId);
        const clinicSnap = await getDoc(clinicRef);

        if (clinicSnap.exists()) {
          const data = clinicSnap.data();
          const updatedDoctors = (data.linkedDoctorsDetails || []).map((d: any) =>
            (d.doctorId === selectedDoctorForToggle.id || d.uid === selectedDoctorForToggle.id) ? {
              ...d,
              status: newStatus,
              toggleOffPeriod: {
                startDate: toggleOffStartDate,
                endDate: toggleOffEndDate,
                reason: toggleOffReason,
                setBy: auth.currentUser?.uid || effectiveClinicId,
                setAt: new Date().toISOString()
              }
            } : d
          );

          await updateDoc(clinicRef, {
            linkedDoctorsDetails: updatedDoctors
          });

        // Update local state
        setLinkedDoctors(prev => prev.map(d =>
          d.uid === selectedDoctorForToggle.id ? {
            ...d,
            status: newStatus as 'active' | 'inactive',
            toggleOffPeriod: {
              startDate: toggleOffStartDate,
              endDate: toggleOffEndDate,
              reason: toggleOffReason
            }
          } : d
        ));

        // Cancel affected bookings
        await cancelAffectedBookings(selectedDoctorForToggle.id, toggleOffStartDate, toggleOffEndDate);

        toast.success(`Dr. ${selectedDoctorForToggle.name} turned OFF`, {
          description: `Chambers blocked from ${new Date(toggleOffStartDate).toLocaleDateString()} to ${new Date(toggleOffEndDate).toLocaleDateString()}`,
          duration: 5000
        });

        // Close modal and reset
        setShowConfirmOffModal(false);
        setSelectedDoctorForToggle(null);
      }
    }
  } catch (error) {
      console.error('Error turning off doctor:', error);
      toast.error('Failed to turn off doctor');
    }
  };

  const handleRequestReactivation = (doctorId: string, doctorName: string, toggleOffPeriod: any) => {
    setDoctorToRestore({ id: doctorId, name: doctorName, period: toggleOffPeriod });
    setShowConfirmRestoreModal(true);
  };

  const reactivateDoctor = async (doctorId: string, doctorName: string) => {
    try {
      const clinicId = effectiveClinicId;
      if (!clinicId) return;

      const newStatus = 'active';

      // Update in clinic's linkedDoctorsDetails
      const clinicRef = doc(db, 'clinics', clinicId);
      const clinicSnap = await getDoc(clinicRef);

      if (clinicSnap.exists()) {
        const data = clinicSnap.data();
        const updatedDoctors = (data.linkedDoctorsDetails || []).map((d: any) => {
          if (d.doctorId === doctorId || d.uid === doctorId) {
            const { toggleOffPeriod, ...rest } = d;
            return { ...rest, status: newStatus };
          }
          return d;
        });

        await updateDoc(clinicRef, {
          linkedDoctorsDetails: updatedDoctors
        });

        // Update local state
        setLinkedDoctors(prev => prev.map(d => {
          if (d.uid === doctorId) {
            const { toggleOffPeriod, ...rest } = d;
            return { ...rest, status: newStatus as 'active' | 'inactive' };
          }
          return d;
        }));

        toast.success(`Dr. ${doctorName} is now ACTIVE`, {
          description: 'Chambers are now accepting bookings',
          duration: 3000
        });

        // Close modal and reset
        setShowConfirmRestoreModal(false);
        setDoctorToRestore(null);
      }
    } catch (error) {
      console.error('Error reactivating doctor:', error);
      toast.error('Failed to reactivate doctor');
    }
  };

  const handleTogglePatientDataAccess = async (doctorId: string, restrict: boolean) => {
    try {
      const clinicId = effectiveClinicId;
      if (!clinicId) return;

      const clinicRef = doc(db, 'clinics', clinicId);
      const clinicSnap = await getDoc(clinicRef);

      if (clinicSnap.exists()) {
        const data = clinicSnap.data();
        const updatedDoctors = (data.linkedDoctorsDetails || []).map((d: any) => {
          if (d.doctorId === doctorId || d.uid === doctorId) {
            return { ...d, restrictPatientDataAccess: restrict };
          }
          return d;
        });

        await updateDoc(clinicRef, {
          linkedDoctorsDetails: updatedDoctors
        });

        // Update local state
        setLinkedDoctors(prev => prev.map(d => {
          if (d.uid === doctorId) {
            return { ...d, restrictPatientDataAccess: restrict };
          }
          return d;
        }));

        const doctor = linkedDoctors.find(d => d.uid === doctorId);
        toast.success(
          restrict
            ? `Patient data access RESTRICTED for Dr. ${doctor?.name}`
            : `Patient data access ENABLED for Dr. ${doctor?.name}`,
          {
            description: restrict
              ? 'Doctor can only see patients from their personal QR'
              : 'Doctor can see all patients at this clinic',
            duration: 3000
          }
        );
      }
    } catch (error) {
      console.error('Error toggling patient data access:', error);
      toast.error('Failed to update patient data access');
    }
  };

  // Save registration number for a doctor
  const handleUpdateRegistrationNumber = async (doctorUid: string, regNumber: string, showOnRX: boolean) => {
    try {
      const doctorRef = doc(db, 'doctors', doctorUid);
      await updateDoc(doctorRef, {
        registrationNumber: regNumber,
        showRegistrationOnRX: showOnRX,
      });

      // Update local state
      setLinkedDoctors(prev => prev.map(d => {
        if (d.uid === doctorUid) {
          return { ...d, registrationNumber: regNumber, showRegistrationOnRX: showOnRX };
        }
        return d;
      }));

      const doctor = linkedDoctors.find(d => d.uid === doctorUid);
      toast.success(`Registration number updated for Dr. ${doctor?.name}`, { duration: 2000 });
    } catch (error) {
      console.error('Error updating registration number:', error);
      toast.error('Failed to update registration number');
    }
  };

  // Save custom footer lines for a doctor
  const handleUpdateFooterLines = async (doctorUid: string, line1: string, line2: string) => {
    try {
      const doctorRef = doc(db, 'doctors', doctorUid);
      await updateDoc(doctorRef, {
        footerLine1: line1,
        footerLine2: line2,
      });

      // Update local state
      setLinkedDoctors(prev => prev.map(d => {
        if (d.uid === doctorUid) {
          return { ...d, footerLine1: line1, footerLine2: line2 };
        }
        return d;
      }));

      const doctor = linkedDoctors.find(d => d.uid === doctorUid);
      toast.success(`Footer lines updated for Dr. ${doctor?.name}`, { duration: 2000 });
    } catch (error) {
      console.error('Error updating footer lines:', error);
      toast.error('Failed to update footer lines');
    }
  };

  const cancelAffectedBookings = async (doctorId: string, startDate: string, endDate: string) => {
    try {
      const { collection, query: fbQuery, where, getDocs } = await import('firebase/firestore');
      const bookingsRef = collection(db, 'bookings');

      // Generate all dates in the blocked range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const blockedDates: string[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        blockedDates.push(dateStr);
      }

      console.log(`📤 Clinic Toggle Off: Blocking dates for doctor ${doctorId}:`, blockedDates);

      // Query bookings for this doctor in the affected date range
      const bookingsQuery = fbQuery(
        bookingsRef,
        where('doctorId', '==', doctorId),
        where('clinicId', '==', effectiveClinicId),
        where('appointmentDate', 'in', blockedDates.slice(0, 10)) // Firestore 'in' limit is 10
      );

      const bookingsSnapshot = await getDocs(bookingsQuery);
      let cancelledCount = 0;

      for (const bookingDoc of bookingsSnapshot.docs) {
        const bookingData = bookingDoc.data();

        // Only cancel if not already cancelled and date is in blocked range
        if (bookingData.status !== 'cancelled' && blockedDates.includes(bookingData.appointmentDate)) {
          await updateDoc(bookingDoc.ref, {
            status: 'cancelled',
            cancellationReason: 'Doctor unavailable - turned off by clinic',
            cancelledAt: new Date().toISOString(),
            cancelledBy: 'clinic'
          });
          cancelledCount++;
          console.log(`❌ Cancelled booking ${bookingDoc.id} for date ${bookingData.appointmentDate}`);
        }
      }

      if (cancelledCount > 0) {
        toast.info(`${cancelledCount} advance booking(s) cancelled`, {
          description: 'Patients will be notified about the cancellation',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error cancelling affected bookings:', error);
    }
  };

  const handleEditSchedule = (doctorId: string, doctorName: string) => {
    // Store selected doctor in localStorage for ClinicScheduleManager to read
    localStorage.setItem('selectedDoctorId', doctorId);
    localStorage.setItem('selectedDoctorName', doctorName);

    // Navigate to schedule manager
    if (onNavigate) {
      onNavigate('schedule', doctorId);
    }

    toast.info(`Opening Schedule Manager for Dr. ${doctorName}`);
  };

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
        activeMenu="doctors"
        onMenuChange={(menu) => {
          if (onNavigate) {
            onNavigate(menu);
          }
        }}
        onLogout={() => {
          auth?.signOut();
          window.location.href = '/';
        }}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="lg:ml-64">
        {/* Header */}
        <div className="bg-gray-800/50 border-b border-gray-700 px-4 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors"
              >
                <Menu className="w-5 h-5 text-blue-500" />
              </button>
              <div>
                <h1 className="text-white text-2xl font-semibold">Manage Doctors</h1>
                <p className="text-gray-400 text-sm">Add and manage doctors linked to your clinic</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setShowLinkModal(true)}
                variant="outline"
                className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Link Existing Doctor
              </Button>
              <Button
                onClick={() => {
                  setSelectedDoctorLocationId(defaultLocationId);
                  setShowAddModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                // disabled={clinicLocations.length === 0}
                // title={clinicLocations.length === 0 ? 'Add a clinic location first' : ''}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add New Doctor
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 lg:px-8 py-8">
          {linkedDoctors.length === 0 ? (
            <Card className="bg-gray-800/50 border-gray-700 p-12">
              <div className="text-center">
                <Stethoscope className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-white text-xl mb-2">No Doctors Linked</h3>
                <p className="text-gray-400 mb-6">
                  Add doctors to your clinic to start managing their schedules and appointments
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => setShowLinkModal(true)}
                    variant="outline"
                    className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Link Existing Doctor
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedDoctorLocationId(defaultLocationId);
                      setShowAddModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={clinicLocations.length === 0}
                    title={clinicLocations.length === 0 ? 'Add a clinic location first' : ''}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add New Doctor
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {linkedDoctors.map((doctor) => (
                <Card
                  key={doctor.uid}
                  className={`bg-gray-800/50 border-gray-700 overflow-hidden ${
                    doctor.status === 'pending_invitation' ? 'opacity-75' : ''
                  }`}
                >
                  {/* Collapsed Header Row - Always visible */}
                  <div
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 cursor-pointer hover:bg-gray-700/30 transition-colors"
                    onClick={() => setExpandedDoctors(prev => {
                      const next = new Set(prev);
                      if (next.has(doctor.uid)) next.delete(doctor.uid);
                      else next.add(doctor.uid);
                      return next;
                    })}
                  >
                    <div className={`w-10 h-10 flex-shrink-0 rounded-full ${
                      doctor.status === 'active' ? 'bg-blue-600' : 'bg-orange-600'
                    } flex items-center justify-center`}>
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-base break-words whitespace-normal">Dr. {doctor.name}</h3>
                      <p className="text-gray-400 text-sm break-words whitespace-normal">
                        {Array.isArray(doctor.specialties)
                          ? doctor.specialties.join(', ')
                          : doctor.specialty || 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {getStatusBadge(doctor.status, doctor)}
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                        expandedDoctors.has(doctor.uid) ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedDoctors.has(doctor.uid) && (
                  <div className="px-6 pb-6 border-t border-gray-700">

                  {/* Activation Note for Pending Doctors */}
                  {doctor.status === 'pending_invitation' && (
                    <div className="mt-4 mb-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                      <p className="text-blue-300 text-xs flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>
                          Share activation link with this doctor via WhatsApp/SMS/Email to grant them access to their own dashboard.
                          Click the <Copy className="w-3 h-3 inline mx-0.5" /> icon above to copy the link.
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="space-y-3 mt-4 mb-4">
                    <div className="flex items-start gap-2 text-gray-300">
                      <Mail className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm break-all">{doctor.email}</span>
                    </div>
                    {doctor.phone && (
                      <div className="flex items-start gap-2 text-gray-300">
                        <Phone className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm break-words">{doctor.phone}</span>
                      </div>
                    )}
                    {doctor.pinCode && (
                      <div className="flex items-start gap-2 text-gray-300">
                        <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm break-words">Pin Code: {doctor.pinCode}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-gray-300">
                      <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm break-all">Doctor Code: {doctor.doctorCode}</span>
                    </div>
                  </div>

                  {/* Schedule Information */}
                  {doctor.chambers && doctor.chambers.length > 0 && (
                    <div className="border-t border-gray-700 pt-4 mb-4">
                      <h4 className="text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Practice Schedule
                      </h4>
                      <div className="space-y-2">
                        {doctor.chambers.map((chamber, index) => (
                          <div
                            key={chamber.id || index}
                            className="bg-gray-900/50 border border-gray-700 rounded-lg p-3"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium break-words">{chamber.chamberName}</p>
                                <p className="text-gray-400 text-xs break-words">{chamber.chamberAddress}</p>
                              </div>
                              <Badge variant={chamber.status === 'active' ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                                {chamber.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  {chamber.frequency === 'Custom'
                                    ? chamber.customDate
                                    : chamber.days.map(d => d.substring(0, 3)).join(', ')
                                  }
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                                <span className="font-medium text-gray-300">{chamber.frequency}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                                <Clock className="w-3 h-3" />
                                <span>{chamber.startTime} - {chamber.endTime}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                                <Users className="w-3 h-3" />
                                <span>{chamber.maxCapacity} patients/day</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {doctor.maxAdvanceBookingDays && (
                        <div className="mt-2 flex items-center gap-2 text-gray-400 text-xs">
                          <Info className="w-3 h-3" />
                          <span>Advance booking: {doctor.maxAdvanceBookingDays} days</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Planned Off Section - Shows for all doctors */}
                  <div className="border-t border-gray-700 pt-4 mb-4">
                    <h4 className="text-gray-300 text-sm font-medium mb-3">Planned Off</h4>

                    {/* Status Indicator */}
                    <div className={`py-2 px-3 ${
                      doctor.toggleOffPeriod
                        ? 'bg-red-500/10 border border-red-500/20'
                        : 'bg-emerald-500/10 border border-emerald-500/20'
                    } rounded-lg mb-3`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          doctor.toggleOffPeriod ? 'bg-red-500' : 'bg-emerald-500'
                        }`}></div>
                        <span className={`text-xs ${
                          doctor.toggleOffPeriod ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                          {doctor.toggleOffPeriod
                            ? `Chamber Off (${doctor.toggleOffPeriod.startDate} to ${doctor.toggleOffPeriod.endDate})`
                            : 'Chamber Active - Accepting Bookings'
                          }
                        </span>
                      </div>
                    </div>

                    {/* Toggle Enable Planned Off - Shows when chamber is ON */}
                    {!doctor.toggleOffPeriod && selectedDoctorForToggle?.id !== doctor.uid && (
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg mb-3">
                        <Label className="text-gray-300 text-xs cursor-pointer">
                          Enable Planned Off
                        </Label>
                        <Switch
                          checked={false}
                          onCheckedChange={() => {
                            setSelectedDoctorForToggle({ id: doctor.uid, name: doctor.name });
                            setToggleOffStartDate(tomorrow.toISOString().split('T')[0]);
                            setToggleOffEndDate(nextWeek.toISOString().split('T')[0]);
                          }}
                        />
                      </div>
                    )}

                    {/* Toggle to Reactivate - Shows when chamber is OFF */}
                    {doctor.toggleOffPeriod && (
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg mb-3">
                        <Label className="text-gray-300 text-xs cursor-pointer">
                          Reactivate Chamber
                        </Label>
                        <Switch
                          checked={false}
                          onCheckedChange={() => handleRequestReactivation(doctor.uid, doctor.name, doctor.toggleOffPeriod)}
                        />
                      </div>
                    )}

                    {/* Toggle Patient Data Access - For linked doctors only */}
                    <div className={`flex items-center justify-between py-2 px-3 rounded-lg mb-3 transition-colors ${
                      !doctor.restrictPatientDataAccess
                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                        : 'bg-red-500/10 border border-red-500/20'
                    }`}>
                      <div className="flex flex-col gap-1">
                        <Label className="text-gray-300 text-xs cursor-pointer">
                          Enable Patient Data Access
                        </Label>
                        <span className={`text-[10px] ${
                          !doctor.restrictPatientDataAccess
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }`}>
                          {!doctor.restrictPatientDataAccess
                            ? '✓ Allowed - Doctor can view patient details'
                            : '✗ Restricted - Doctor can only see personal QR patients'}
                        </span>
                      </div>
                      <Switch
                        checked={!doctor.restrictPatientDataAccess}
                        onCheckedChange={(checked) => handleTogglePatientDataAccess(doctor.uid, !checked)}
                        className={doctor.restrictPatientDataAccess
                          ? 'data-[state=unchecked]:bg-red-500/60'
                          : 'data-[state=checked]:bg-emerald-500'}
                      />
                    </div>

                    {/* Registration Number Section */}
                    <div className="border-t border-gray-700 pt-4 mb-4">
                      <h4 className="text-gray-300 text-sm font-medium mb-3">Additional Information</h4>
                      <p className="text-gray-500 text-xs mb-3">Optional fields</p>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-yellow-400 text-xs font-semibold">Registration Number (Optional)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500">⚡</span>
                            <Input
                              placeholder="Enter your Medical Registration Number"
                              value={doctor.registrationNumber || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLinkedDoctors(prev => prev.map(d =>
                                  d.uid === doctor.uid ? { ...d, registrationNumber: val } : d
                                ));
                              }}
                              onBlur={() => {
                                handleUpdateRegistrationNumber(
                                  doctor.uid,
                                  doctor.registrationNumber || '',
                                  doctor.showRegistrationOnRX ?? true
                                );
                              }}
                              className="bg-gray-900/50 border-gray-700 text-white text-xs h-9 pl-9"
                            />
                          </div>
                        </div>

                        <div className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                          doctor.showRegistrationOnRX
                            ? 'bg-gray-900/30 border border-gray-700'
                            : 'bg-gray-900/30 border border-gray-700'
                        }`}>
                          <div className="flex flex-col gap-1">
                            <Label className="text-gray-300 text-xs cursor-pointer">
                              Show Registration Number on Digital RX
                            </Label>
                            <span className="text-[10px] text-gray-500">
                              When enabled, your registration number will be printed on generated prescriptions for legal compliance.
                            </span>
                          </div>
                          <Switch
                            checked={doctor.showRegistrationOnRX ?? true}
                            onCheckedChange={(checked) => {
                              setLinkedDoctors(prev => prev.map(d =>
                                d.uid === doctor.uid ? { ...d, showRegistrationOnRX: checked } : d
                              ));
                              handleUpdateRegistrationNumber(
                                doctor.uid,
                                doctor.registrationNumber || '',
                                checked
                              );
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Custom Footer Lines Section */}
                    <div className="border-t border-gray-700 pt-4 mb-4">
                      <h4 className="text-gray-300 text-sm font-medium mb-2">Custom RX Footer Lines</h4>
                      <p className="text-gray-500 text-xs mb-3">Add up to 2 custom lines for RX/Diet Chart PDF footers (e.g. emergency contact, medico-legal caution)</p>
                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            placeholder="e.g. In Emergency Contact: XYZ Hospital, Ph: 1234567890"
                            value={doctor.footerLine1 || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLinkedDoctors(prev => prev.map(d =>
                                d.uid === doctor.uid ? { ...d, footerLine1: val } : d
                              ));
                            }}
                            onBlur={() => {
                              handleUpdateFooterLines(
                                doctor.uid,
                                doctor.footerLine1 || '',
                                doctor.footerLine2 || ''
                              );
                            }}
                            className="bg-gray-900/50 border-gray-700 text-white text-xs h-9 pr-14"
                            maxLength={120}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">{(doctor.footerLine1 || '').length}/120</span>
                        </div>
                        <div className="relative">
                          <Input
                            placeholder="e.g. Medico-Legal Notice: This prescription is valid for 30 days only"
                            value={doctor.footerLine2 || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLinkedDoctors(prev => prev.map(d =>
                                d.uid === doctor.uid ? { ...d, footerLine2: val } : d
                              ));
                            }}
                            onBlur={() => {
                              handleUpdateFooterLines(
                                doctor.uid,
                                doctor.footerLine1 || '',
                                doctor.footerLine2 || ''
                              );
                            }}
                            className="bg-gray-900/50 border-gray-700 text-white text-xs h-9 pr-14"
                            maxLength={120}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">{(doctor.footerLine2 || '').length}/120</span>
                        </div>
                      </div>
                    </div>

                    {/* Date Selection UI - Shows when toggle is enabled */}
                    {selectedDoctorForToggle?.id === doctor.uid && !doctor.toggleOffPeriod && (
                        <div className="space-y-3 mt-3">
                          <div className="bg-gray-900/30 border border-gray-700 rounded-lg p-3">
                            <h5 className="text-white text-xs mb-2">Select Off Period</h5>
                            <p className="text-gray-400 text-xs mb-3">
                              Choose the date range when chamber will be closed
                            </p>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                              {/* Start Date */}
                              <div className="space-y-1">
                                <Label className="text-gray-300 text-xs">Start Date</Label>
                                <Input
                                  type="date"
                                  value={toggleOffStartDate}
                                  onChange={(e) => setToggleOffStartDate(e.target.value)}
                                  min={tomorrow}
                                  className="bg-gray-900/50 border-gray-700 text-white text-xs h-8"
                                />
                              </div>

                              {/* End Date */}
                              <div className="space-y-1">
                                <Label className="text-gray-300 text-xs">End Date</Label>
                                <Input
                                  type="date"
                                  value={toggleOffEndDate}
                                  onChange={(e) => setToggleOffEndDate(e.target.value)}
                                  min={toggleOffStartDate || tomorrow}
                                  className="bg-gray-900/50 border-gray-700 text-white text-xs h-8"
                                />
                              </div>
                            </div>

                            {/* Duration Display */}
                            {toggleOffStartDate && toggleOffEndDate && (
                              <p className="text-xs text-gray-400 mb-3">
                                Duration: {Math.ceil((new Date(toggleOffEndDate).getTime() - new Date(toggleOffStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                              </p>
                            )}

                            {/* Reason Selection */}
                            <div className="space-y-1 mb-3">
                              <Label className="text-gray-300 text-xs">Reason</Label>
                              <select
                                value={toggleOffReason}
                                onChange={(e) => setToggleOffReason(e.target.value)}
                                className="w-full bg-gray-900/50 border border-gray-700 text-white text-xs rounded-md h-8 px-2"
                              >
                                <option value="vacation">Vacation</option>
                                <option value="medical">Medical Leave</option>
                                <option value="other">Other</option>
                              </select>
                            </div>

                            {/* Warning */}
                            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded p-2 mb-3">
                              <p className="text-yellow-200 text-xs">
                                ⚠️ All advance bookings will be cancelled
                              </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  setSelectedDoctorForToggle(null);
                                  setToggleOffStartDate(tomorrow.toISOString().split('T')[0]);
                                  setToggleOffEndDate(nextWeek.toISOString().split('T')[0]);
                                  setToggleOffReason('vacation');
                                }}
                                size="sm"
                                variant="outline"
                                className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-900 text-xs h-8"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleTurnOffChamber}
                                size="sm"
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs h-8"
                              >
                                Turn Off Chamber
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Temporary Doctor Access Section */}
                  <div className="border-t border-gray-700 pt-4 mb-4">
                    <h4 className="text-gray-300 text-sm font-medium mb-3 flex items-center gap-2">
                      <Key className="w-4 h-4 text-blue-400" />
                      Temporary Device Access
                    </h4>
                    <p className="text-gray-500 text-xs mb-3">
                      Generate a one-day access link + PIN so this doctor can use any device at the clinic to view today's patients and write Digital RX.
                    </p>

                    {tempAccessData[doctor.uid] ? (
                      <div className="space-y-2">
                        {/* Generated Link */}
                        <div className="bg-gray-900/50 border border-blue-700/30 rounded-lg p-3">
                          <Label className="text-blue-400 text-xs mb-1 block">Access Link</Label>
                          <div className="flex items-center gap-2">
                            <code className="text-gray-300 text-xs flex-1 break-all bg-gray-900/70 rounded px-2 py-1.5 max-h-16 overflow-auto">
                              {tempAccessData[doctor.uid].link}
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyTempField(tempAccessData[doctor.uid].link, `link-${doctor.uid}`)}
                              className="flex-shrink-0 h-8 w-8 p-0"
                            >
                              {copiedTempField === `link-${doctor.uid}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Generated PIN */}
                        <div className="bg-gray-900/50 border border-blue-700/30 rounded-lg p-3">
                          <Label className="text-blue-400 text-xs mb-1 block">Access PIN</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-mono text-lg tracking-[0.3em]">
                              {tempAccessData[doctor.uid].pin}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyTempField(tempAccessData[doctor.uid].pin, `pin-${doctor.uid}`)}
                              className="flex-shrink-0 h-8 w-8 p-0"
                            >
                              {copiedTempField === `pin-${doctor.uid}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Copy both for WhatsApp */}
                        <Button
                          size="sm"
                          onClick={() => {
                            const text = `🏥 Temporary Doctor Access\n\nDr. ${doctor.name}, use this link to access today's patient schedule:\n\n🔗 Link: ${tempAccessData[doctor.uid].link}\n🔑 PIN: ${tempAccessData[doctor.uid].pin}\n\n⏰ Valid today during chamber hours only.`;
                            copyTempField(text, `whatsapp-${doctor.uid}`);
                          }}
                          variant="outline"
                          className="w-full border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/30 text-xs h-8"
                        >
                          <ExternalLink className="w-3 h-3 mr-2" />
                          {copiedTempField === `whatsapp-${doctor.uid}` ? '✓ Copied for sharing!' : 'Copy Link + PIN for WhatsApp/SMS'}
                        </Button>

                        {/* Regenerate */}
                        <Button
                          size="sm"
                          onClick={() => handleGenerateTempAccess(doctor)}
                          variant="ghost"
                          className="w-full text-gray-400 hover:text-white text-xs h-7"
                          disabled={tempAccessLoading === doctor.uid}
                        >
                          Regenerate Access
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleGenerateTempAccess(doctor)}
                        disabled={tempAccessLoading === doctor.uid}
                        className="w-full bg-blue-600/20 border border-blue-600/40 text-blue-400 hover:bg-blue-600/30 text-xs h-9"
                      >
                        {tempAccessLoading === doctor.uid ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>
                            Generating...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Key className="w-3.5 h-3.5" />
                            Generate Temp Access for Today
                          </div>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Actions - Same for all doctors */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleEditSchedule(doctor.uid, doctor.name)}
                      size="sm"
                      variant="outline"
                      className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white flex-1"
                    >
                      <Edit className="w-3 h-3 mr-2" />
                      Edit Schedule
                    </Button>
                    <Button
                      onClick={() => handleUnlinkDoctor(doctor.uid, doctor.name)}
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                    >
                      <UserMinus className="w-3 h-3 mr-2" />
                      Unlink
                    </Button>
                  </div>

                  </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add New Doctor Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl">Add New Doctor</DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a new doctor profile and send an invitation to activate their account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4 overflow-y-auto flex-1 px-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                  placeholder="Enter your full name"
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newDoctor.email}
                  onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                  placeholder="doctor@example.com"
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth" className="text-gray-300">
                  Date of Birth <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={newDoctor.dateOfBirth}
                  onChange={(e) => setNewDoctor({ ...newDoctor, dateOfBirth: e.target.value })}
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>

              {/* Residential Pin Code */}
              <div className="space-y-2">
                <Label htmlFor="pinCode" className="text-gray-300">
                  Residential Pin Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pinCode"
                  type="text"
                  value={newDoctor.pinCode}
                  onChange={(e) => setNewDoctor({ ...newDoctor, pinCode: e.target.value })}
                  placeholder="Enter your pin code"
                  maxLength={6}
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>

              {/* Location (Branch) */}
              <div className="space-y-2">
                <Label className="text-gray-300">
                  Clinic Location <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedDoctorLocationId || defaultLocationId || NO_LOCATION_ID}
                  onValueChange={(value) => setSelectedDoctorLocationId(value)}
                  disabled={clinicLocations.length === 0}
                >
                  <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {clinicLocations.length > 0 ? (
                      clinicLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name} {loc.address ? `(${loc.address})` : ''}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={NO_LOCATION_ID} disabled>
                        No locations configured
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Choose which branch this doctor belongs to. This affects booking availability.
                </p>
              </div>
            </div>

            {/* Medical Specialties - Full Width */}
            <div className="space-y-2">
              <Label htmlFor="specialties" className="text-gray-300">
                Medical Specialties <span className="text-red-500">*</span>
              </Label>
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 min-h-[60px]">
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedSpecialties.map((specialty, index) => (
                    <Badge
                      key={index}
                      className="bg-blue-600 text-white flex items-center gap-1 px-3 py-1"
                    >
                      {specialty}
                      <button
                        onClick={() => setSelectedSpecialties(selectedSpecialties.filter((_, i) => i !== index))}
                        className="ml-1 hover:bg-blue-700 rounded-full p-0.5"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Select
                  value={specialtyInput}
                  onValueChange={(value) => {
                    if (!selectedSpecialties.includes(value)) {
                      setSelectedSpecialties([...selectedSpecialties, value]);
                    }
                    setSpecialtyInput('');
                  }}
                >
                  <SelectTrigger className="bg-transparent border-0 text-gray-400">
                    <SelectValue placeholder="Select specialty..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.filter(s => !selectedSpecialties.includes(s)).map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-start gap-2 py-3 px-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-400 flex-1 min-w-0">
                <p className="font-medium mb-1">Invitation Process:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-400/80">
                  <li className="break-words">Doctor code & QR generated immediately</li>
                  <li className="break-words">Clinic can book appointments right away</li>
                  <li className="break-words">Doctor verifies email to access dashboard</li>
                  <li className="break-words">After activation, key fields are locked</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 flex-shrink-0">
              <Button
                onClick={() => {
                  setShowAddModal(false);
                  setNewDoctor({ email: '', name: '', dateOfBirth: '', pinCode: '' });
                  setSelectedSpecialties([]);
                  setSpecialtyInput('');
                  setSelectedDoctorLocationId(defaultLocationId);
                }}
                variant="outline"
                className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-900"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddNewDoctor}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add Doctor & Send Invitation</span>
                <span className="sm:hidden">Add Doctor</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Existing Doctor Modal */}
      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl">Link Existing Doctor</DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter the doctor's code to link them to your clinic
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4 overflow-y-auto flex-1 px-1">
            <div className="space-y-2">
              <Label htmlFor="doctorCode" className="text-gray-300">
                Doctor Code
              </Label>
              <div className="flex gap-2">
                <Input
                  id="doctorCode"
                  type="text"
                  value={doctorCode}
                  onChange={(e) => setDoctorCode(e.target.value.toUpperCase())}
                  placeholder="DR-123456789"
                  className="bg-gray-900/50 border-gray-700 text-white flex-1"
                />
                <Button
                  onClick={async () => {
                    setSearchLoading(true);
                    setSearchedDoctor(null);
                    try {
                      // Search by doctorCode
                      const doctorsRef = collection(db, 'doctors');
                      const q = query(doctorsRef, where('doctorCode', '==', doctorCode));
                      const snap = await getDocs(q);
                      if (!snap.empty) {
                        setSearchedDoctor({ id: snap.docs[0].id, ...snap.docs[0].data() });
                      } else {
                        toast.error('No doctor found with this code');
                      }
                    } catch (err) {
                      toast.error('Error searching doctor');
                    }
                    setSearchLoading(false);
                  }}
                  disabled={searchLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Search Result */}
            {searchedDoctor && (
              <Card className="bg-gray-900/50 border-gray-700 p-4">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-semibold">{searchedDoctor.name}</h4>
                    <p className="text-gray-400 text-sm">
                      {Array.isArray(searchedDoctor.specialties)
                        ? searchedDoctor.specialties.join(', ')
                        : searchedDoctor.specialty || 'N/A'}
                    </p>
                  </div>
                  {getStatusBadge(searchedDoctor.status)}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>{searchedDoctor.email}</span>
                  </div>
                  {searchedDoctor.phone && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>{searchedDoctor.phone}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4 flex-shrink-0">
              <Button
                onClick={() => {
                  setShowLinkModal(false);
                  setDoctorCode('');
                  setSearchedDoctor(null);
                }}
                variant="outline"
                className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-900"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLinkExistingDoctor}
                disabled={!searchedDoctor}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Link to Clinic
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Turning OFF */}
      <Dialog open={showConfirmOffModal} onOpenChange={setShowConfirmOffModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-center pb-6 border-b border-gray-800">
              Professional Acknowledgment Required
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirm turning off doctor's chamber and review the impact on patient bookings
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
              <h3 className="text-white">Confirm Chamber Off Period</h3>
              <p className="text-gray-300 text-sm">
                You are about to turn off Dr. {selectedDoctorForToggle?.name}'s chamber from{' '}
                <span className="text-emerald-400">{new Date(toggleOffStartDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span> to{' '}
                <span className="text-emerald-400">{new Date(toggleOffEndDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>.
              </p>
            </div>

            {/* Information Points */}
            <div className="space-y-3">
              <p className="text-gray-300 text-sm">For this period:</p>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-gray-500 mt-1">•</span>
                  <span>Doctor's chamber will be blocked</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-500 mt-1">•</span>
                  <span>New bookings will be disabled</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-500 mt-1">•</span>
                  <span>All advance bookings will be cancelled automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-500 mt-1">•</span>
                  <span>Patients will be notified about the cancellation</span>
                </li>
              </ul>
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
              onClick={() => setShowConfirmOffModal(false)}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white min-w-[120px]"
            >
              CANCEL
            </Button>
            <Button
              onClick={handleConfirmToggleOff}
              className="bg-red-600 hover:bg-red-700 text-white min-w-[180px]"
            >
              <Calendar className="w-4 h-4 mr-2" />
              CONFIRM & TURN OFF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Restoration */}
      <Dialog open={showConfirmRestoreModal} onOpenChange={setShowConfirmRestoreModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-center pb-6 border-b border-gray-800">
              Confirm Chamber Reactivation
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirm reactivating doctor's chamber and restoring booking capability
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
                    When a chamber is reactivated, the system will automatically restore booking capability. Patients who received cancellation notices will be informed that the doctor is now available again.
                  </p>
                </div>
              </div>
            </div>

            {/* Date Range Display */}
            {doctorToRestore && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <div className="text-center space-y-2">
                  <p className="text-white font-medium">Dr. {doctorToRestore.name}</p>
                  <p className="text-gray-400 text-sm">
                    Blocked Period: {doctorToRestore.period?.startDate} to {doctorToRestore.period?.endDate}
                  </p>
                  <p className="text-emerald-400 text-sm">
                    Will be reactivated and accepting bookings again
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <Button
              onClick={() => setShowConfirmRestoreModal(false)}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white min-w-[100px]"
            >
              CANCEL
            </Button>
            <Button
              onClick={() => {
                if (doctorToRestore) {
                  reactivateDoctor(doctorToRestore.id, doctorToRestore.name);
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
            >
              REACTIVATE
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageDoctors;

