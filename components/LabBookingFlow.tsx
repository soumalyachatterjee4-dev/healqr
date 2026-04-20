import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  FlaskConical,
  Calendar,
  Clock,
  User,
  Phone,
  Search,
  Check,
  CheckCircle2,
  X,
  Upload,
  Home,
  Building2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Globe,
  UtensilsCrossed,
  Share2,
  Download,
  Eye,
  ExternalLink,
  MapPinned,
  Bell,
  Navigation,
} from 'lucide-react';
import { db } from '../lib/firebase/config';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import TemplateDisplay from './TemplateDisplay';
import type { Language } from '../utils/translations';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// INTERFACES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

interface LabLocation {
  name: string;
  address?: string;
  landmark?: string;
}

interface CollectionSlot {
  id: number;
  slotName: string;
  slotType: 'walk-in' | 'home-collection';
  days: string[];
  startTime: string;
  endTime: string;
  slotDuration: number;
  maxCapacity: number;
  branchName?: string;
  branchAddress?: string;
  isActive: boolean;
}

interface TestItem {
  id: string;
  testName: string;
  testCode: string;
  category: string;
  sampleType: string;
  price: number;
  discountedPrice?: number;
  turnaroundTime: string;
  turnaroundUnit: 'hours' | 'days';
  description?: string;
  preparation?: string;
  isActive: boolean;
  isHomeCollection: boolean;
  homeCollectionCharge?: number;
}

interface LabData {
  uid: string;
  name: string;
  email?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  locations?: LabLocation[];
  collectionSlots?: CollectionSlot[];
  labCode?: string;
  labSlug?: string;
}

type BookingStep = 'language' | 'branch' | 'tests' | 'schedule' | 'details' | 'confirmation';

interface PatientInfo {
  name: string;
  phone: string;
  age: string;
  gender: string;
  doctorName: string;
  lastFoodTime: string;
  rxImageUrl?: string;
}

interface HomeAddress {
  fullAddress: string;
  landmark: string;
  pincode: string;
  locationUrl: string;
}

interface LabBookingFlowProps {
  onBack: () => void;
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CONSTANTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const LANGUAGES: { code: Language; name: string; native: string; section: 'core' | 'indian' | 'intl' }[] = [
  { code: 'english', name: 'English', native: 'English', section: 'core' },
  { code: 'hindi', name: 'Hindi', native: 'हिंदी', section: 'core' },
  { code: 'bengali', name: 'Bengali', native: 'বাংলা', section: 'core' },
  { code: 'marathi', name: 'Marathi', native: 'मराठी', section: 'core' },
  { code: 'tamil', name: 'Tamil', native: 'தமிழ்', section: 'core' },
  { code: 'telugu', name: 'Telugu', native: 'తెలుగు', section: 'core' },
  { code: 'gujarati', name: 'Gujarati', native: 'ગુજરાતી', section: 'core' },
  { code: 'kannada', name: 'Kannada', native: 'ಕನ್ನಡ', section: 'core' },
  { code: 'malayalam', name: 'Malayalam', native: 'മലയാളം', section: 'core' },
  { code: 'punjabi', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', section: 'core' },
  { code: 'assamese', name: 'Assamese', native: 'অসমীয়া', section: 'core' },
  { code: 'odia', name: 'Odia', native: 'ଓଡ଼ିଆ', section: 'indian' },
  { code: 'urdu', name: 'Urdu', native: 'اردو', section: 'indian' },
  { code: 'nepali', name: 'Nepali', native: 'नेपाली', section: 'indian' },
  { code: 'konkani', name: 'Konkani', native: 'कोंकणी', section: 'indian' },
  { code: 'maithili', name: 'Maithili', native: 'मैथिली', section: 'indian' },
  { code: 'dogri', name: 'Dogri', native: 'डोगरी', section: 'indian' },
  { code: 'sindhi', name: 'Sindhi', native: 'سنڌي', section: 'indian' },
  { code: 'bodo', name: 'Bodo', native: 'बड़ो', section: 'indian' },
  { code: 'santali', name: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ', section: 'indian' },
  { code: 'kashmiri', name: 'Kashmiri', native: 'کٲشُر', section: 'indian' },
  { code: 'manipuri', name: 'Manipuri', native: 'মৈতৈলোন্', section: 'indian' },
  { code: 'arabic', name: 'Arabic', native: 'العربية', section: 'intl' },
  { code: 'french', name: 'French', native: 'Français', section: 'intl' },
  { code: 'spanish', name: 'Spanish', native: 'Español', section: 'intl' },
  { code: 'portuguese', name: 'Portuguese', native: 'Português', section: 'intl' },
  { code: 'russian', name: 'Russian', native: 'Русский', section: 'intl' },
  { code: 'chinese', name: 'Chinese', native: '中文', section: 'intl' },
  { code: 'japanese', name: 'Japanese', native: '日本語', section: 'intl' },
  { code: 'korean', name: 'Korean', native: '한국어', section: 'intl' },
  { code: 'german', name: 'German', native: 'Deutsch', section: 'intl' },
];

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// COMMON TESTS (fallback when lab has no catalog)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const COMMON_TESTS: TestItem[] = [
  { id: 'common-cbc', testName: 'Complete Blood Count (CBC)', testCode: 'CBC', category: 'Haematology', sampleType: 'Blood', price: 450, discountedPrice: 299, turnaroundTime: '6', turnaroundUnit: 'hours', description: 'Measures red & white blood cells, platelets, hemoglobin', preparation: '', isActive: true, isHomeCollection: true, homeCollectionCharge: 50 },
  { id: 'common-blood-sugar-f', testName: 'Blood Sugar - Fasting', testCode: 'BSF', category: 'Biochemistry', sampleType: 'Blood', price: 150, discountedPrice: 99, turnaroundTime: '4', turnaroundUnit: 'hours', description: 'Fasting blood glucose level', preparation: '10-12 hours fasting required', isActive: true, isHomeCollection: true, homeCollectionCharge: 50 },
  { id: 'common-lipid', testName: 'Lipid Profile', testCode: 'LIPID', category: 'Biochemistry', sampleType: 'Blood', price: 800, discountedPrice: 499, turnaroundTime: '8', turnaroundUnit: 'hours', description: 'Total cholesterol, LDL, HDL, triglycerides', preparation: '10-12 hours fasting required', isActive: true, isHomeCollection: true, homeCollectionCharge: 50 },
  { id: 'common-thyroid', testName: 'Thyroid Profile (T3, T4, TSH)', testCode: 'THYROID', category: 'Endocrinology', sampleType: 'Blood', price: 900, discountedPrice: 599, turnaroundTime: '12', turnaroundUnit: 'hours', description: 'T3, T4, TSH levels', preparation: '', isActive: true, isHomeCollection: true, homeCollectionCharge: 50 },
  { id: 'common-lft', testName: 'Liver Function Test (LFT)', testCode: 'LFT', category: 'Biochemistry', sampleType: 'Blood', price: 700, discountedPrice: 449, turnaroundTime: '8', turnaroundUnit: 'hours', description: 'SGPT, SGOT, bilirubin, albumin, total protein', preparation: '', isActive: true, isHomeCollection: true, homeCollectionCharge: 50 },
  { id: 'common-kft', testName: 'Kidney Function Test (KFT)', testCode: 'KFT', category: 'Biochemistry', sampleType: 'Blood', price: 700, discountedPrice: 449, turnaroundTime: '8', turnaroundUnit: 'hours', description: 'Creatinine, urea, uric acid, electrolytes', preparation: '', isActive: true, isHomeCollection: true, homeCollectionCharge: 50 },
  { id: 'common-urine', testName: 'Urine Routine & Microscopy', testCode: 'URM', category: 'Pathology', sampleType: 'Urine', price: 200, discountedPrice: 149, turnaroundTime: '4', turnaroundUnit: 'hours', description: 'Color, pH, specific gravity, sugar, protein, microscopy', preparation: 'Midstream clean-catch sample', isActive: true, isHomeCollection: false },
  { id: 'common-hba1c', testName: 'HbA1c (Glycated Hemoglobin)', testCode: 'HBA1C', category: 'Biochemistry', sampleType: 'Blood', price: 600, discountedPrice: 399, turnaroundTime: '6', turnaroundUnit: 'hours', description: '3-month average blood sugar control', preparation: '', isActive: true, isHomeCollection: true, homeCollectionCharge: 50 },
  { id: 'common-vitd', testName: 'Vitamin D (25-OH)', testCode: 'VITD', category: 'Biochemistry', sampleType: 'Blood', price: 1200, discountedPrice: 799, turnaroundTime: '24', turnaroundUnit: 'hours', description: 'Vitamin D3 deficiency check', preparation: '', isActive: true, isHomeCollection: true, homeCollectionCharge: 50 },
  { id: 'common-vitb12', testName: 'Vitamin B12', testCode: 'VITB12', category: 'Biochemistry', sampleType: 'Blood', price: 900, discountedPrice: 599, turnaroundTime: '24', turnaroundUnit: 'hours', description: 'Vitamin B12 level', preparation: '', isActive: true, isHomeCollection: true, homeCollectionCharge: 50 },
  { id: 'common-widal', testName: 'Widal Test (Typhoid)', testCode: 'WIDAL', category: 'Serology', sampleType: 'Blood', price: 350, discountedPrice: 249, turnaroundTime: '4', turnaroundUnit: 'hours', description: 'Typhoid fever detection', preparation: '', isActive: true, isHomeCollection: true, homeCollectionCharge: 50 },
  { id: 'common-dengue', testName: 'Dengue NS1 + IgG/IgM', testCode: 'DENGUE', category: 'Serology', sampleType: 'Blood', price: 1000, discountedPrice: 699, turnaroundTime: '6', turnaroundUnit: 'hours', description: 'Dengue antigen & antibody detection', preparation: '', isActive: true, isHomeCollection: true, homeCollectionCharge: 50 },
];

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// HELPERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function generateLabBookingId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'HQL-';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// COMPONENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export default function LabBookingFlow({ onBack, language = 'english', onLanguageChange }: LabBookingFlowProps) {
  const labId = sessionStorage.getItem('booking_lab_id') || '';

  // Core state
  const [step, setStep] = useState<BookingStep>('language');
  const [labData, setLabData] = useState<LabData | null>(null);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Step: Language
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);
  const [showMoreLanguages, setShowMoreLanguages] = useState(false);

  // Step: Branch
  const [selectedBranch, setSelectedBranch] = useState<LabLocation | null>(null);

  // Step: Tests
  const [selectedTests, setSelectedTests] = useState<TestItem[]>([]);
  const [testSearch, setTestSearch] = useState('');
  const [showAllTests, setShowAllTests] = useState(false);
  const [rxUploading, setRxUploading] = useState(false);
  const rxInputRef = useRef<HTMLInputElement>(null);
  const [rxImageUrl, setRxImageUrl] = useState('');

  // Step: Date
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30);
  const [plannedOffPeriods, setPlannedOffPeriods] = useState<Array<{ startDate: string; endDate: string; status: string }>>([]);

  // Step: Slot
  const [collectionType, setCollectionType] = useState<'walk-in' | 'home-collection' | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<CollectionSlot | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Record<string, number>>({});

  // Step: Patient Details
  const [patient, setPatient] = useState<PatientInfo>({
    name: '', phone: '', age: '', gender: '', doctorName: '', lastFoodTime: '', rxImageUrl: '',
  });
  const [doctorSuggestions, setDoctorSuggestions] = useState<Array<{ id: string; name: string; specialties: string[] }>>([]);

  // Step: Patient Details extras
  const [agreedToTerms, setAgreedToTerms] = useState(true); // pre-checked
  const [showRxPreview, setShowRxPreview] = useState(false);
  const [homeAddress, setHomeAddress] = useState<HomeAddress>({ fullAddress: '', landmark: '', pincode: '', locationUrl: '' });
  const [fcmToken, setFcmToken] = useState('');

  // Step: Confirmation
  const [bookingId, setBookingId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serialNo, setSerialNo] = useState(0);

  // â”€â”€â”€ Load lab data + test catalog â”€â”€â”€
  useEffect(() => {
    if (!labId) return;
    const load = async () => {
      try {
        const labDoc = await getDoc(doc(db, 'labs', labId));
        if (!labDoc.exists()) { toast.error('Lab not found'); return; }
        const ld = { uid: labDoc.id, ...labDoc.data() } as LabData;
        setLabData(ld);

        // Auto-select single branch
        if (!ld.locations || ld.locations.length <= 1) {
          setSelectedBranch(ld.locations?.[0] || { name: ld.name, address: ld.address });
        }

        // Load global settings
        if (ld.maxAdvanceBookingDays) setMaxAdvanceDays(Number(ld.maxAdvanceBookingDays));
        if (ld.plannedOffPeriods && Array.isArray(ld.plannedOffPeriods)) {
          setPlannedOffPeriods(ld.plannedOffPeriods.map((p: any) => ({
            startDate: (p.startDate as any)?.toDate ? (p.startDate as any).toDate().toISOString().split('T')[0] : p.startDate,
            endDate: (p.endDate as any)?.toDate ? (p.endDate as any).toDate().toISOString().split('T')[0] : p.endDate,
            status: p.status || 'active',
          })));
        }

        // Load test catalog — fall back to common tests if lab has none
        const q = query(collection(db, 'labs', labId, 'testCatalog'), orderBy('testName', 'asc'));
        const snap = await getDocs(q);
        const labTests = snap.docs.map(d => ({ id: d.id, ...d.data() } as TestItem)).filter(t => t.isActive);
        setTests(labTests.length > 0 ? labTests : COMMON_TESTS);
      } catch (err) {
        console.error('Error loading lab data:', err);
        toast.error('Failed to load lab data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [labId]);

  // â”€â”€â”€ Load booked slot counts for selected date â”€â”€â”€
  useEffect(() => {
    if (!selectedDate || !labId) return;
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    (async () => {
      try {
        const q = query(
          collection(db, 'labBookings'),
          where('labId', '==', labId),
          where('bookingDate', '==', dateStr),
          where('status', 'in', ['confirmed', 'approved', 'sample-collected', 'processing']),
        );
        const snap = await getDocs(q);
        const counts: Record<string, number> = {};
        snap.docs.forEach(d => {
          const data = d.data();
          const key = `${data.slotId}-${data.timeSlot}`;
          counts[key] = (counts[key] || 0) + 1;
        });
        setBookedSlots(counts);
      } catch {}
    })();
  }, [selectedDate, labId]);

  // â”€â”€â”€ Load doctors for dropdown â”€â”€â”€
  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, 'doctors'), orderBy('name', 'asc'));
        const snap = await getDocs(q);
        setDoctorSuggestions(snap.docs.slice(0, 50).map(d => ({
          id: d.id, name: d.data().name || '', specialties: d.data().specialties || [],
        })));
      } catch { setDoctorSuggestions([]); }
    })();
  }, []);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // STEP NAVIGATION
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const hasBranches = labData?.locations && labData.locations.length > 1;
  const allSteps: BookingStep[] = hasBranches
    ? ['language', 'branch', 'tests', 'schedule', 'details', 'confirmation']
    : ['language', 'tests', 'schedule', 'details', 'confirmation'];

  const stepIndex = allSteps.indexOf(step);

  const goNext = () => {
    const next = allSteps[stepIndex + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    if (stepIndex === 0) { onBack(); return; }
    setStep(allSteps[stepIndex - 1]);
  };

  // â”€â”€â”€ Rx upload handler â”€â”€â”€
  const handleRxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large. Max 5MB.'); return; }
    setRxUploading(true);
    try {
      const storage = getStorage();
      const path = `labs/${labId}/rx-uploads/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setRxImageUrl(url);
      toast.success('Prescription uploaded');
    } catch (err) {
      console.error('Rx upload error:', err);
      toast.error('Upload failed');
    } finally {
      setRxUploading(false);
    }
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SUBMIT BOOKING
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const handleSubmit = async () => {
    if (!patient.name.trim() || !patient.phone.trim()) { toast.error('Name and phone number are required'); return; }
    if (patient.phone.length !== 10) { toast.error('Enter a valid 10-digit phone number'); return; }
    if (!patient.age.trim()) { toast.error('Age is required'); return; }
    if (!patient.gender) { toast.error('Gender is required'); return; }
    if (collectionType === 'home-collection' && !homeAddress.fullAddress.trim()) { toast.error('Home address is required for home collection'); return; }
    if (collectionType === 'home-collection' && !homeAddress.pincode.trim()) { toast.error('Pincode is required for home collection'); return; }

    setSubmitting(true);
    try {
      const bid = generateLabBookingId();
      const dateStr = `${selectedDate!.getFullYear()}-${String(selectedDate!.getMonth() + 1).padStart(2, '0')}-${String(selectedDate!.getDate()).padStart(2, '0')}`;

      // Get serial number for walk-in
      let srl = 0;
      if (collectionType === 'walk-in') {
        try {
          const countQ = query(
            collection(db, 'labBookings'),
            where('labId', '==', labId),
            where('bookingDate', '==', dateStr),
            where('slotId', '==', selectedSlot?.id ?? null),
            where('collectionType', '==', 'walk-in'),
          );
          const countSnap = await getDocs(countQ);
          srl = countSnap.size + 1;
        } catch { srl = 1; }
      }

      const totalAmt = selectedTests.reduce((s, t) => s + (t.discountedPrice || t.price), 0);
      const homeCharge = collectionType === 'home-collection'
        ? selectedTests.reduce((s, t) => s + (t.homeCollectionCharge || 0), 0)
        : 0;

      await addDoc(collection(db, 'labBookings'), {
        bookingId: bid,
        labId,
        labName: labData?.name || '',
        branchName: selectedBranch?.name || '',
        branchAddress: selectedBranch?.address || '',
        language: selectedLanguage,

        tests: selectedTests.map(t => ({
          testId: t.id,
          testName: t.testName,
          testCode: t.testCode,
          category: t.category,
          sampleType: t.sampleType,
          price: t.price,
          discountedPrice: t.discountedPrice || null,
          turnaroundTime: t.turnaroundTime,
          turnaroundUnit: t.turnaroundUnit,
          preparation: t.preparation || '',
          isHomeCollection: t.isHomeCollection,
          homeCollectionCharge: t.homeCollectionCharge || null,
        })),
        totalAmount: totalAmt,
        homeCollectionCharges: homeCharge,
        collectionType,

        bookingDate: dateStr,
        slotId: selectedSlot?.id ?? null,
        slotName: selectedSlot?.slotName || '',
        timeSlot: selectedSlot ? `${selectedSlot.startTime}-${selectedSlot.endTime}` : '',

        patientName: patient.name.trim(),
        patientPhone: `+91${patient.phone.trim()}`,
        patientAge: patient.age,
        patientGender: patient.gender,
        referringDoctor: patient.doctorName || '',
        lastFoodTime: patient.lastFoodTime || '',
        rxImageUrl: rxImageUrl || '',

        serialNo: srl,
        status: collectionType === 'home-collection' ? 'pending-phlebotomist' : 'confirmed',
        bookingSource: sessionStorage.getItem('booking_source') || 'lab_qr',
        scanSessionId: sessionStorage.getItem('scan_session_id') || '',
        ...(collectionType === 'home-collection' ? {
          homeAddress: homeAddress.fullAddress,
          homeLandmark: homeAddress.landmark,
          homePincode: homeAddress.pincode,
          homeLocationUrl: homeAddress.locationUrl,
        } : {}),
        fcmToken: fcmToken || '',
        createdAt: serverTimestamp(),
      });

      setBookingId(bid);
      setSerialNo(srl);
      setStep('confirmation');

      // Request FCM push notification permission
      try {
        if ('Notification' in window && Notification.permission !== 'denied') {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            const { getMessaging, getToken: getFCMToken } = await import('firebase/messaging');
            const messaging = getMessaging();
            const token = await getFCMToken(messaging, { vapidKey: 'BJmNGTLMjbSIlYr9Yw7-4n-Rn2p4B8nBzK1mDGxVuUB-CWG8TfY6r7VvdJ6SFndY07E8lqwRPqFNWjdjZNOhqg' });
            setFcmToken(token);
            // Update booking with FCM token
            try {
              const bookingQ = query(collection(db, 'labBookings'), where('bookingId', '==', bid));
              const bookingSnap = await getDocs(bookingQ);
              bookingSnap.docs.forEach(async d => { await updateDoc(d.ref, { fcmToken: token }); });
            } catch {}
          }
        }
      } catch (fcmErr) {
        console.log('FCM not available:', fcmErr);
      }

      // Mark QR scan as completed
      const scanId = sessionStorage.getItem('scan_session_id');
      if (scanId) {
        try {
          const scanQ = query(collection(db, 'qrScans'), where('scanSessionId', '==', scanId));
          const scanSnap = await getDocs(scanQ);
          scanSnap.docs.forEach(async d => { await updateDoc(d.ref, { completed: true }); });
        } catch {}
      }

      toast.success('Booking confirmed!');
    } catch (err) {
      console.error('Booking error:', err);
      toast.error('Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // COMPUTED
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const isUsingDefaults = tests.length > 0 && tests[0].id.startsWith('common-');

  const filteredTests = tests.filter(t => {
    if (testSearch) {
      const s = testSearch.toLowerCase();
      return t.testName.toLowerCase().includes(s) || t.testCode.toLowerCase().includes(s) || t.category.toLowerCase().includes(s);
    }
    return true;
  });

  // Common tests = first 6 (or all if ≤6)
  const commonTests = filteredTests.slice(0, 6);
  const remainingTests = filteredTests.slice(6);

  const totalAmount = selectedTests.reduce((s, t) => s + (t.discountedPrice || t.price), 0);
  const totalHomeCharge = collectionType === 'home-collection'
    ? selectedTests.reduce((s, t) => s + (t.homeCollectionCharge || 0), 0) : 0;

  const getAvailableSlots = (): CollectionSlot[] => {
    if (!selectedDate || !labData?.collectionSlots) return [];
    const dayName = DAY_NAMES[selectedDate.getDay()];
    return labData.collectionSlots.filter(slot => {
      if (!slot.isActive) return false;
      if (!slot.days.includes(dayName)) return false;
      if (selectedBranch && slot.branchName && slot.branchName !== selectedBranch.name) return false;
      return true;
    });
  };

  // Calendar grid helpers
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + maxAdvanceDays);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const calendarDays = getDaysInMonth(currentMonth);
  const calendarDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isDateDisabled = (day: number): boolean => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    date.setHours(0, 0, 0, 0);
    if (date < today) return true;
    if (date > maxDate) return true;
    // Check planned off periods
    for (const p of plannedOffPeriods) {
      if (p.status !== 'active') continue;
      const [sy, sm, sd] = p.startDate.split('-').map(Number);
      const [ey, em, ed] = p.endDate.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd); start.setHours(0, 0, 0, 0);
      const end = new Date(ey, em - 1, ed); end.setHours(0, 0, 0, 0);
      if (date >= start && date <= end) return true;
    }
    return false;
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // LOADING / ERROR STATES
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!labData) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-6">
        <div className="bg-[#1a1f2e] rounded-3xl p-8 max-w-sm w-full text-center border border-gray-700">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">Lab not found</p>
          <Button onClick={onBack} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">Go Back</Button>
        </div>
      </div>
    );
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // RENDER TEST CARD
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const renderTestCard = (test: TestItem) => {
    const isSelected = selectedTests.some(t => t.id === test.id);
    return (
      <button
        key={test.id}
        onClick={() => setSelectedTests(prev => isSelected ? prev.filter(t => t.id !== test.id) : [...prev, test])}
        className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${isSelected
          ? 'bg-purple-500/10 border-purple-500'
          : 'bg-[#0f1419] border-gray-700 hover:border-gray-600'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-600'}`}>
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium leading-tight">{test.testName}</p>
            <p className="text-gray-500 text-xs mt-0.5">{test.category}</p>
            {test.preparation && <p className="text-yellow-500/70 text-[10px] mt-1">⚠ {test.preparation}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            {test.discountedPrice ? (
              <>
                <p className="text-gray-500 text-xs line-through">₹{test.price}</p>
                <p className="text-green-400 text-sm font-bold">₹{test.discountedPrice}</p>
              </>
            ) : (
              <p className="text-white text-sm font-bold">₹{test.price}</p>
            )}
          </div>
        </div>
      </button>
    );
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // MAIN RENDER
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col">

      {/* â”€â”€â”€ Sticky Header (all steps except confirmation) â”€â”€â”€ */}
      {step !== 'confirmation' && (
        <div className="bg-[#1a1f2e] border-b border-gray-800 sticky top-0 z-50 shadow-lg">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={goBack} className="text-white hover:bg-white/10 rounded-full p-2 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              {labData.logoUrl ? (
                <img src={labData.logoUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/30" />
              ) : (
                <FlaskConical className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-base truncate">{labData.name}</p>
              <p className="text-xs text-purple-400 truncate">
                {step === 'language' && 'Choose Language'}
                {step === 'branch' && 'Select Location'}
                {step === 'tests' && 'Select Tests'}
                {step === 'schedule' && 'Choose Date & Slot'}
                {step === 'details' && 'Patient Details'}
              </p>
            </div>
            {/* Progress dots */}
            <div className="flex gap-1">
              {allSteps.filter(s => s !== 'confirmation').map((s, i) => (
                <div key={s} className={`h-1.5 rounded-full transition-all ${i <= stepIndex ? 'bg-purple-500 w-5' : 'bg-gray-700 w-3'}`} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€â”€ Content Area â”€â”€â”€ */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-start justify-center min-h-full p-4 py-6">
          <div className="w-full max-w-md">

        {/* â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
           â•‘   STEP 1: LANGUAGE SELECTION          â•‘
           â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {step === 'language' && (
          <div className="bg-[#1a1f2e] rounded-3xl shadow-2xl p-6 sm:p-8">
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Check className="w-10 h-10 text-white" />
              </div>
            </div>

            <h1 className="text-white text-center text-xl font-bold mb-2">Choose Your Language</h1>
            <p className="text-gray-400 text-center text-sm mb-6">Select your preferred language for all communications</p>

            {/* Core languages */}
            <div className="space-y-2 mb-4">
              {LANGUAGES.filter(l => l.section === 'core').map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { setSelectedLanguage(lang.code); onLanguageChange?.(lang.code); }}
                  className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${selectedLanguage === lang.code
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold ${selectedLanguage === lang.code ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-800 text-gray-400'}`}>
                    {lang.code === 'english' ? 'EN' : lang.code === 'hindi' ? 'IN' : lang.code === 'bengali' ? 'BD' : lang.code.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">{lang.native}</p>
                    <p className="text-sm text-gray-400">{lang.name}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* More languages toggle */}
            <button
              onClick={() => setShowMoreLanguages(!showMoreLanguages)}
              className="w-full py-2 rounded-2xl border-2 border-dashed border-gray-600 hover:border-gray-500 text-gray-400 hover:text-gray-300 text-sm font-medium flex items-center justify-center gap-1 transition-colors mb-4"
            >
              {showMoreLanguages ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showMoreLanguages ? 'Show Less' : '+20 More Languages'}
            </button>

            {showMoreLanguages && (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 pt-2 mb-2">More Indian Languages</p>
                <div className="space-y-2 mb-4">
                  {LANGUAGES.filter(l => l.section === 'indian').map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { setSelectedLanguage(lang.code); onLanguageChange?.(lang.code); }}
                      className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${selectedLanguage === lang.code
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold ${selectedLanguage === lang.code ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-800 text-gray-400'}`}>
                        {lang.code.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">{lang.native}</p>
                        <p className="text-sm text-gray-400">{lang.name}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 pt-2 mb-2">International</p>
                <div className="space-y-2 mb-4">
                  {LANGUAGES.filter(l => l.section === 'intl').map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { setSelectedLanguage(lang.code); onLanguageChange?.(lang.code); }}
                      className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${selectedLanguage === lang.code
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold ${selectedLanguage === lang.code ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-800 text-gray-400'}`}>
                        {lang.code.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">{lang.native}</p>
                        <p className="text-sm text-gray-400">{lang.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Benefits card */}
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
              <p className="text-white text-sm font-semibold mb-2">âœ¨ Your Language Benefits</p>
              <div className="space-y-1.5 text-gray-300 text-xs">
                <p>📋 All messages in your language</p>
                <p>🔔 Notifications translated automatically</p>
                <p>âœ… Booking confirmations in your language</p>
              </div>
            </div>

            {/* Health tip */}
            <TemplateDisplay placement="lab-booking-language" />

            <button
              onClick={goNext}
              className="w-full h-14 mt-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-2xl shadow-lg font-semibold text-base flex items-center justify-center gap-2 transition-all"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
           â•‘   STEP 2: BRANCH / LOCATION           â•‘
           â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {step === 'branch' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold text-lg">Select Location</h2>
            <p className="text-gray-400 text-sm -mt-2">Choose a collection center near you</p>

            <TemplateDisplay placement="lab-booking-branch" />

            <div className="bg-[#1a1f2e] rounded-3xl p-6 shadow-2xl space-y-3">
              {labData.locations?.map((loc, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedBranch(loc); goNext(); }}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${selectedBranch?.name === loc.name
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Building2 className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{loc.name}</p>
                      {loc.address && <p className="text-gray-400 text-sm mt-0.5">{loc.address}</p>}
                      {loc.landmark && <p className="text-gray-500 text-xs mt-0.5">Near {loc.landmark}</p>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
           â•‘   STEP 3: SELECT TESTS                â•‘
           â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {step === 'tests' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold text-lg">Choose Tests</h2>
            <p className="text-gray-400 text-sm -mt-2">Select tests or upload your prescription</p>

            <TemplateDisplay placement="lab-booking-tests" />

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search tests — CBC, thyroid, lipid..."
                value={testSearch}
                onChange={e => setTestSearch(e.target.value)}
                className="pl-9 bg-[#0f1419] border-gray-700 text-white h-11 rounded-xl focus:border-purple-500 focus:ring-purple-500"
              />
              {testSearch && (
                <button onClick={() => setTestSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Popular tests label */}
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-purple-400" />
              <p className="text-gray-300 text-xs font-semibold tracking-wide">POPULAR TESTS</p>
              {isUsingDefaults && <Badge className="bg-purple-500/20 text-purple-300 text-[9px] px-1.5 py-0">Standard Rates</Badge>}
            </div>

            {/* Test cards */}
            {filteredTests.length === 0 ? (
              <div className="bg-[#1a1f2e] rounded-2xl border border-gray-700 p-8 text-center">
                <FlaskConical className="w-10 h-10 text-purple-500/20 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">{testSearch ? 'No matching tests' : 'No tests available'}</p>
                <p className="text-gray-600 text-xs mt-1">{testSearch ? 'Try a different search term' : 'Upload your prescription below'}</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {commonTests.map(renderTestCard)}
                </div>

                {remainingTests.length > 0 && (
                  <>
                    <button
                      onClick={() => setShowAllTests(!showAllTests)}
                      className="w-full py-2.5 rounded-2xl border-2 border-dashed border-gray-600 hover:border-gray-500 text-purple-400 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      {showAllTests ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {showAllTests ? 'Show Less' : `+${remainingTests.length} More Tests`}
                    </button>
                    {showAllTests && (
                      <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                        {remainingTests.map(renderTestCard)}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* OR Upload Rx */}
            <div className="relative flex items-center gap-3 py-2">
              <div className="flex-1 border-t border-gray-700" />
              <span className="text-gray-500 text-xs font-medium">OR</span>
              <div className="flex-1 border-t border-gray-700" />
            </div>

            <input ref={rxInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleRxUpload} />
            {rxImageUrl ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-green-300 text-sm font-medium">Prescription uploaded</p>
                  <p className="text-green-400/50 text-[10px]">Lab will read your Rx and prepare your tests</p>
                </div>
                <button onClick={() => setRxImageUrl('')} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <button
                onClick={() => rxInputRef.current?.click()}
                disabled={rxUploading}
                className="w-full border-2 border-dashed border-purple-500/30 rounded-2xl p-5 text-center hover:border-purple-500/50 hover:bg-purple-500/5 transition-all"
              >
                {rxUploading ? (
                  <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto" />
                ) : (
                  <>
                    <Upload className="w-7 h-7 text-purple-400 mx-auto mb-2" />
                    <p className="text-purple-400 text-sm font-medium">Upload Prescription (Rx)</p>
                    <p className="text-gray-500 text-[10px] mt-0.5">Can't find your test? Upload doctor's prescription</p>
                  </>
                )}
              </button>
            )}

            {/* Selected summary + Next */}
            {(selectedTests.length > 0 || rxImageUrl) && (
              <div className="bg-[#1a1f2e] border border-purple-500/30 rounded-2xl p-4 space-y-3">
                {selectedTests.length > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-white text-sm font-medium">{selectedTests.length} test{selectedTests.length > 1 ? 's' : ''} selected</p>
                      <p className="text-purple-400 font-bold">₹{totalAmount}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedTests.map(t => (
                        <Badge key={t.id} className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 gap-1">
                          {t.testName}
                          <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={(e) => { e.stopPropagation(); setSelectedTests(prev => prev.filter(x => x.id !== t.id)); }} />
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
                {rxImageUrl && selectedTests.length === 0 && (
                  <p className="text-purple-300 text-sm">📋 Prescription uploaded — lab will identify tests</p>
                )}
                <button
                  onClick={goNext}
                  className="w-full h-12 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
           â•‘   STEP 4: DATE + SLOT + TYPE           â•‘
           â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {step === 'schedule' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold text-lg">Select Date</h2>

            {/* Calendar card */}
            <div className="bg-[#1a1f2e] rounded-2xl border border-gray-700 p-6">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
                <h3 className="text-white font-medium">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Days of Week */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {calendarDayNames.map(d => (
                  <div key={d} className="text-center text-sm text-gray-400 py-2">{d}</div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => (
                  <div key={index} className="aspect-square">
                    {day ? (
                      <button
                        onClick={() => {
                          if (!isDateDisabled(day)) {
                            const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                            setSelectedDate(d); setSelectedSlot(null); setCollectionType(null);
                          }
                        }}
                        disabled={isDateDisabled(day)}
                        className={`w-full h-full rounded-lg flex items-center justify-center text-sm transition-colors ${
                          isDateDisabled(day)
                            ? 'bg-red-900/30 text-red-400 cursor-not-allowed opacity-50'
                            : selectedDate?.getDate() === day && selectedDate?.getMonth() === currentMonth.getMonth() && selectedDate?.getFullYear() === currentMonth.getFullYear()
                            ? 'bg-purple-500 text-white font-semibold'
                            : 'text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {day}
                      </button>
                    ) : <div />}
                  </div>
                ))}
              </div>
            </div>

            {/* Health tip */}
            <TemplateDisplay placement="lab-booking-schedule" />

            {/* Slot cards after date selection */}
            {selectedDate && (
              <>
                <h3 className="text-white font-semibold mb-1">Available Slots</h3>
                <p className="text-gray-400 text-xs -mt-1 mb-2">{formatDate(selectedDate)}</p>

                {getAvailableSlots().length === 0 ? (
                  <div className="bg-[#1a1f2e] border border-gray-700 rounded-2xl p-6 text-center">
                    <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No slots available on this day</p>
                    <p className="text-gray-600 text-xs mt-1">Try another date</p>
                  </div>
                ) : (
                  <div className="bg-[#1a1f2e] rounded-3xl p-5 shadow-2xl space-y-3">
                    {getAvailableSlots().map(slot => {
                      const isChosen = selectedSlot?.id === slot.id;
                      return (
                        <button
                          key={slot.id}
                          onClick={() => { setSelectedSlot(slot); setCollectionType(null); }}
                          className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${isChosen
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isChosen ? 'bg-purple-500/20' : 'bg-gray-800'}`}>
                              <Clock className={`w-6 h-6 ${isChosen ? 'text-purple-400' : 'text-gray-500'}`} />
                            </div>
                            <div className="flex-1">
                              <p className="text-white font-semibold">{slot.slotName}</p>
                              <p className="text-gray-400 text-sm">{formatTime(slot.startTime)} — {formatTime(slot.endTime)}</p>
                              {slot.branchName && (
                                <span className="text-gray-500 text-[10px] flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3" />{slot.branchName}
                                </span>
                              )}
                            </div>
                            {isChosen && (
                              <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Walk-in / Home toggle after slot selection */}
            {selectedSlot && (
              <div className="bg-[#1a1f2e] rounded-3xl p-5 shadow-2xl space-y-4">
                <h3 className="text-white font-semibold">Mode of Collection</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCollectionType('walk-in')}
                    className={`rounded-xl p-4 border-2 flex flex-col items-center gap-2 transition-all ${collectionType === 'walk-in'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${collectionType === 'walk-in' ? 'bg-purple-500' : 'bg-gray-700'}`}>
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-sm font-medium ${collectionType === 'walk-in' ? 'text-purple-400' : 'text-gray-400'}`}>Walk-in</span>
                  </button>
                  <button
                    onClick={() => setCollectionType('home-collection')}
                    className={`rounded-xl p-4 border-2 flex flex-col items-center gap-2 transition-all ${collectionType === 'home-collection'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${collectionType === 'home-collection' ? 'bg-purple-500' : 'bg-gray-700'}`}>
                      <Home className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-sm font-medium ${collectionType === 'home-collection' ? 'text-purple-400' : 'text-gray-400'}`}>Home Collection</span>
                  </button>
                </div>

                {collectionType && (
                  <button
                    onClick={goNext}
                    className="w-full h-12 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    Continue to Patient Details <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
           â•‘   STEP 5: PATIENT DETAILS + SUBMIT    â•‘
           â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {step === 'details' && (
          <div className="space-y-4">
            <p className="text-purple-400 text-sm">Please fill in the patient details</p>

            {/* Required Information */}
            <div className="bg-[#1a1f2e] rounded-xl p-6 border border-gray-700">
              <h3 className="text-white font-semibold mb-4">Required Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Patient Name <span className="text-red-400">*</span></label>
                  <Input placeholder="Enter full name" value={patient.name} onChange={e => setPatient(p => ({ ...p, name: e.target.value }))} className="bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500 h-11" />
                </div>
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">WhatsApp Number <span className="text-red-400">*</span></label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 bg-[#0f1419] border border-gray-700 rounded-md text-gray-400 text-sm">+91</div>
                    <Input
                      placeholder="10-digit number"
                      value={patient.phone}
                      onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); setPatient(p => ({ ...p, phone: v })); }}
                      className="bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500 h-11"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Information */}
            <div className="bg-[#1a1f2e] rounded-xl p-6 border border-gray-700">
              <h3 className="text-white font-semibold mb-4">Optional Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Age <span className="text-red-400">*</span></label>
                  <Input
                    placeholder="e.g. 35"
                    value={patient.age}
                    onChange={e => setPatient(p => ({ ...p, age: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                    className="bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500 h-11"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Gender <span className="text-red-400">*</span></label>
                  <select
                    value={patient.gender}
                    onChange={e => setPatient(p => ({ ...p, gender: e.target.value }))}
                    className="w-full bg-[#0f1419] border border-gray-700 text-white rounded-md px-3 h-11 text-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>Meal Taken / Plan to Take Last Meal Before Test
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Last Food / Meal Time</label>
                  <Input
                    type="time"
                    value={patient.lastFoodTime}
                    onChange={e => setPatient(p => ({ ...p, lastFoodTime: e.target.value }))}
                    className="bg-[#0f1419] border-gray-700 text-white focus:border-purple-500 focus:ring-purple-500 h-11"
                  />
                  <p className="text-gray-500 text-[10px] mt-1">Important for fasting tests (e.g. blood sugar, lipid profile)</p>
                </div>
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Referring Doctor</label>
                  <select
                    value={patient.doctorName}
                    onChange={e => setPatient(p => ({ ...p, doctorName: e.target.value }))}
                    className="w-full bg-[#0f1419] border border-gray-700 text-white rounded-md px-3 h-11 text-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="">Select Doctor</option>
                    <option value="Self">Self</option>
                    <option value="Other">Other</option>
                    {doctorSuggestions.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Home Collection Address (only for home collection) */}
            {collectionType === 'home-collection' && (
              <div className="bg-[#1a1f2e] rounded-xl p-6 border border-purple-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <MapPinned className="w-5 h-5 text-purple-400" />
                  <h3 className="text-white font-semibold">Home Collection Address</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Full Address <span className="text-red-400">*</span></label>
                    <textarea
                      placeholder="House/Flat No., Street, Area, City"
                      value={homeAddress.fullAddress}
                      onChange={e => setHomeAddress(a => ({ ...a, fullAddress: e.target.value }))}
                      rows={3}
                      className="w-full bg-[#0f1419] border border-gray-700 text-white placeholder:text-gray-500 rounded-md px-3 py-2 text-sm focus:border-purple-500 focus:ring-purple-500 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Landmark</label>
                      <Input
                        placeholder="Near..."
                        value={homeAddress.landmark}
                        onChange={e => setHomeAddress(a => ({ ...a, landmark: e.target.value }))}
                        className="bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500 h-11"
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Pincode <span className="text-red-400">*</span></label>
                      <Input
                        placeholder="700001"
                        value={homeAddress.pincode}
                        onChange={e => setHomeAddress(a => ({ ...a, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                        className="bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500 h-11"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (pos) => {
                              const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
                              setHomeAddress(a => ({ ...a, locationUrl: url }));
                              toast.success('Location attached!');
                            },
                            () => toast.error('Location access denied'),
                            { enableHighAccuracy: true }
                          );
                        } else {
                          toast.error('Location not supported on this device');
                        }
                      }}
                      className={`w-full h-11 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                        homeAddress.locationUrl
                          ? 'border-green-500/50 bg-green-500/10 text-green-400'
                          : 'border-gray-600 hover:border-purple-500/50 text-gray-400 hover:text-purple-400'
                      }`}
                    >
                      <Navigation className="w-4 h-4" />
                      {homeAddress.locationUrl ? '📍 Location Attached' : 'Attach My Location (Optional)'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Health tip */}
            <TemplateDisplay placement="lab-booking-details" />

            {/* Terms & Conditions */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 accent-purple-500 rounded"
              />
              <span className="text-gray-400 text-xs leading-relaxed">
                I agree to the <span className="text-purple-400 underline">Terms & Conditions</span> and confirm that the information provided is accurate. I consent to sample collection and understand that payment is collected at the lab.
              </span>
            </label>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={goBack}
                className="flex-1 h-12 bg-transparent border border-gray-600 text-white hover:bg-gray-800 rounded-lg font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !patient.name.trim() || !patient.phone.trim() || !patient.age.trim() || !patient.gender || !agreedToTerms}
                className={`flex-1 h-12 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                  submitting || !patient.name.trim() || !patient.phone.trim() || !patient.age.trim() || !patient.gender || !agreedToTerms
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                }`}
              >
                {submitting ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : 'Submit'}
              </button>
            </div>

            <p className="text-gray-500 text-[10px] text-center">
              Payment will be collected at the lab. No online payment required.
            </p>
          </div>
        )}

        {/* â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
           â•‘   STEP 6: CONFIRMATION                â•‘
           â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {step === 'confirmation' && (
          <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
            <div className="w-full max-w-md bg-[#1a1f2e] rounded-3xl shadow-xl p-6 text-white">
              {/* Success icon */}
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              {/* Serial number (walk-in) */}
              {collectionType === 'walk-in' && serialNo > 0 && (
                <p className="text-center text-white text-4xl font-bold mb-1">#{serialNo}</p>
              )}

              <p className="text-center text-purple-400 text-sm mb-5">
                {collectionType === 'home-collection' ? 'Booking Received' : 'Booking Confirmed'}
              </p>

              {/* Patient Details card */}
              <div className="bg-[#0f1419] p-4 rounded-2xl mb-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-3">Patient Details</h3>
                <div className="space-y-1 text-gray-300 text-sm">
                  <p>{patient.name}</p>
                  <p>+91 {patient.phone}</p>
                  {patient.gender && <p>{patient.gender}</p>}
                  {patient.age && <p>Age: {patient.age}</p>}
                  {patient.doctorName && <p>Referred by: <span className="text-purple-400">{patient.doctorName}</span></p>}
                </div>
              </div>

              {/* Appointment Details card */}
              <div className="bg-[#0f1419] p-4 rounded-2xl mb-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-3">Appointment Details</h3>
                <div className="space-y-1 text-gray-300 text-sm">
                  <p>Booking ID: <span className="text-purple-400 font-semibold">{bookingId}</span></p>
                  <p>Lab: {labData.name}</p>
                  {selectedBranch && <p>Branch: {selectedBranch.name}</p>}
                  <p>Date: {selectedDate ? formatDate(selectedDate) : ''}</p>
                  <p>Time: {selectedSlot ? `${formatTime(selectedSlot.startTime)} — ${formatTime(selectedSlot.endTime)}` : ''}</p>
                  <p className="flex items-center gap-1">
                    {collectionType === 'home-collection' ? <Home className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                    Mode: {collectionType === 'home-collection' ? 'Home Collection' : 'Walk-in'}
                  </p>
                </div>
              </div>

              {/* Home collection pending */}
              {collectionType === 'home-collection' && (
                <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/40 rounded-2xl p-4 mb-4">
                  <p className="text-purple-300 text-sm font-semibold mb-2">🎉 Thank you for booking with us!</p>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    Dear <span className="text-white font-medium">{patient.name}</span>, our experienced phlebotomist (blood collector) will arrive at your address on <span className="text-white font-medium">{selectedDate ? formatDate(selectedDate) : ''}</span> during <span className="text-white font-medium">{selectedSlot ? `${formatTime(selectedSlot.startTime)} — ${formatTime(selectedSlot.endTime)}` : ''}</span>.
                  </p>
                  <p className="text-gray-400 text-[10px] mt-2">📲 You will receive a push notification with your phlebotomist's details once confirmed by the lab.</p>
                </div>
              )}

              {/* Walk-in arrival time + reminder */}
              {collectionType === 'walk-in' && selectedSlot && (
                <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/40 rounded-2xl p-4 mb-4 text-center">
                  <p className="text-gray-400 text-xs">You must reach by</p>
                  <p className="text-white text-xl font-bold flex items-center justify-center gap-2 mt-1">
                    <Clock className="w-5 h-5 text-purple-400" />
                    {formatTime(selectedSlot.startTime)}
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <Bell className="w-3 h-3 text-purple-400" />
                    <p className="text-purple-300/80 text-[10px]">You'll get a reminder notification 1 hour before your appointment</p>
                  </div>
                </div>
              )}

              {/* Home address on confirmation */}
              {collectionType === 'home-collection' && homeAddress.fullAddress && (
                <div className="bg-[#0f1419] p-4 rounded-2xl mb-4 border border-gray-700">
                  <h3 className="text-white font-semibold mb-2 flex items-center gap-2"><MapPinned className="w-4 h-4 text-purple-400" /> Collection Address</h3>
                  <div className="space-y-1 text-gray-300 text-sm">
                    <p>{homeAddress.fullAddress}</p>
                    {homeAddress.landmark && <p className="text-gray-400 text-xs">Near {homeAddress.landmark}</p>}
                    <p className="text-gray-400 text-xs">PIN: {homeAddress.pincode}</p>
                  </div>
                  {homeAddress.locationUrl && (
                    <a href={homeAddress.locationUrl} target="_blank" rel="noopener noreferrer" className="text-purple-400 text-xs underline mt-1 inline-flex items-center gap-1">
                      <Navigation className="w-3 h-3" /> View on Map
                    </a>
                  )}
                </div>
              )}

              {/* Total */}
              {selectedTests.length > 0 && (
                <div className="bg-[#0f1419] p-4 rounded-2xl mb-4 border border-gray-700">
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-300">Total</span>
                    <span className="text-purple-400 text-lg">₹{totalAmount + totalHomeCharge}</span>
                  </div>
                  <p className="text-gray-500 text-[10px] mt-1">Pay at the lab · No online payment</p>
                </div>
              )}

              {/* Tests list */}
              {selectedTests.length > 0 && (
                <div className="space-y-1 mb-4">
                  {selectedTests.map(t => (
                    <div key={t.id} className="flex justify-between items-center bg-[#0f1419] rounded-lg px-3 py-2 border border-gray-700/50">
                      <div>
                        <p className="text-white text-xs">{t.testName}</p>
                        {t.preparation && <p className="text-yellow-500/60 text-[10px]">⚠ {t.preparation}</p>}
                      </div>
                      <p className="text-gray-400 text-xs">₹{t.discountedPrice || t.price}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Preparation warnings */}
              {selectedTests.some(t => t.preparation) && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-4">
                  <p className="text-yellow-400 text-xs font-semibold mb-1">⚠ Patient Preparation</p>
                  {selectedTests.filter(t => t.preparation).map(t => (
                    <p key={t.id} className="text-yellow-300/70 text-xs">• <strong>{t.testName}</strong>: {t.preparation}</p>
                  ))}
                </div>
              )}

              {/* Health Tip Image */}
              <TemplateDisplay placement="lab-booking-confirmation" className="mb-4" />

              {/* Open Patient Portal */}
              <div
                onClick={() => { window.location.href = `${window.location.origin}/?page=patient-login&phone=${patient.phone}`; }}
                className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/40 rounded-2xl p-4 mb-4 cursor-pointer hover:border-orange-400 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/30 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-orange-300 font-semibold text-sm">Open Patient Portal</p>
                    <p className="text-gray-400 text-xs">View your bookings, reports & health records</p>
                  </div>
                  <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Track Booking Status */}
              <div
                onClick={() => { window.location.href = `${window.location.origin}/?page=patient-login&phone=${patient.phone}`; }}
                className="bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 border border-cyan-500/40 rounded-2xl p-4 mb-2 cursor-pointer hover:border-cyan-400 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-500/30 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-cyan-300 font-semibold text-sm">Track Your Queue Position</p>
                    <p className="text-gray-400 text-xs">Login to track booking status & queue updates</p>
                  </div>
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <p className="text-center text-xs text-gray-500 mb-4 px-2">
                📱 <span className="text-purple-400/80 font-medium">healqr.com</span> → Login to your patient portal to track bookings & reports
              </p>

              {/* Share & Download */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => {
                    const text = `🧪 Lab Booking Confirmed!\n\nBooking ID: ${bookingId}\nLab: ${labData.name}\n${selectedBranch ? `Branch: ${selectedBranch.name}\n` : ''}Date: ${selectedDate ? formatDate(selectedDate) : ''}\nTime: ${selectedSlot ? `${formatTime(selectedSlot.startTime)} — ${formatTime(selectedSlot.endTime)}` : ''}\nMode: ${collectionType === 'home-collection' ? 'Home Collection' : 'Walk-in'}\n${serialNo > 0 ? `Serial No: #${serialNo}\n` : ''}\nPatient: ${patient.name}\nPhone: +91 ${patient.phone}\n${selectedTests.length > 0 ? `Tests: ${selectedTests.map(t => t.testName).join(', ')}\nTotal: ₹${totalAmount + totalHomeCharge}` : 'Prescription uploaded'}`;
                    if (navigator.share) {
                      navigator.share({ title: 'Lab Booking Confirmation', text });
                    } else {
                      navigator.clipboard.writeText(text);
                      toast.success('Copied to clipboard!');
                    }
                  }}
                  className="flex-1 h-11 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
                <button
                  onClick={() => {
                    const text = `Lab Booking Confirmation\n\nBooking ID: ${bookingId}\nLab: ${labData.name}\n${selectedBranch ? `Branch: ${selectedBranch.name}\n` : ''}Date: ${selectedDate ? formatDate(selectedDate) : ''}\nTime: ${selectedSlot ? `${formatTime(selectedSlot.startTime)} — ${formatTime(selectedSlot.endTime)}` : ''}\nMode: ${collectionType === 'home-collection' ? 'Home Collection' : 'Walk-in'}\n${serialNo > 0 ? `Serial No: #${serialNo}\n` : ''}\nPatient: ${patient.name}\nPhone: +91 ${patient.phone}\n${selectedTests.length > 0 ? `Tests: ${selectedTests.map(t => t.testName).join(', ')}\nTotal: ₹${totalAmount + totalHomeCharge}` : 'Prescription uploaded'}`;
                    const blob = new Blob([text], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `booking-${bookingId}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex-1 h-11 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>

              <button
                onClick={onBack}
                className="w-full text-center text-gray-400 hover:text-white py-2 transition-colors"
              >
                Back to Lab Profile
              </button>
            </div>
          </div>
        )}

          </div>
        </div>
      </div>

    </div>
  );
}



