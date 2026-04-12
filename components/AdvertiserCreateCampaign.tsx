import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../lib/firebase/config';
import {
  MapPin, ArrowRight, ArrowLeft, Users, Activity,
  CheckCircle2, UploadCloud, CreditCard, FileVideo, FileImage,
  Trash2, Tag, X,
  Clock, Zap, TrendingUp, Sparkles,
  MonitorPlay, Image as ImageIcon,
  BarChart3, ChevronDown, Search, Filter, PartyPopper, Eye
} from 'lucide-react';
import { getSpecialtyLabel } from '../utils/medicalSpecialties';
import { getStateFromPincode, getAllStates } from '../utils/pincodeMapping';
import { toast } from 'sonner';

interface DoctorRecord {
  id: string;
  pincode: string;
  state: string;
  specialties: string[];
}

// ── Placement list (all 43 from AdminTemplateUploader) grouped by advertiser-friendly categories ──
const ALL_PLACEMENTS = [
  // Primary Booking Touch Points (7)
  { id: 'booking-language', label: 'Language Selection Page', category: 'Primary Booking Flow' },
  { id: 'booking-mini-website', label: 'Mini Website Page', category: 'Primary Booking Flow' },
  { id: 'booking-select-date', label: 'Date Selection Page', category: 'Primary Booking Flow' },
  { id: 'booking-select-chamber', label: 'Chamber Selection Page', category: 'Primary Booking Flow' },
  { id: 'booking-patient-details', label: 'Patient Details Form', category: 'Primary Booking Flow' },
  { id: 'booking-confirmation', label: 'Booking Confirmation Page', category: 'Primary Booking Flow' },
  { id: 'booking-location', label: 'Branch Selection Page', category: 'Primary Booking Flow' },
  { id: 'booking-find-doctor', label: 'Find Your Doctor Page', category: 'Primary Booking Flow' },
  { id: 'booking-search-by-name', label: 'Search Doctor by Name', category: 'Primary Booking Flow' },
  // Walk-in Flow (2)
  { id: 'walkin-visit-verification', label: 'Walk-in Visit Verification', category: 'Walk-in Flow' },
  { id: 'walkin-visit-complete', label: 'Walk-in Visit Complete', category: 'Walk-in Flow' },
  // Patient Dashboard (8)
  { id: 'patient-login', label: 'Patient Login', category: 'Patient Dashboard' },
  { id: 'patient-otp', label: 'Patient OTP Verification', category: 'Patient Dashboard' },
  { id: 'patient-dashboard', label: 'Patient Dashboard Home', category: 'Patient Dashboard' },
  { id: 'patient-health-card', label: 'Patient Health Card', category: 'Patient Dashboard' },
  { id: 'patient-history', label: 'Patient History', category: 'Patient Dashboard' },
  { id: 'patient-notifications', label: 'Patient Notifications', category: 'Patient Dashboard' },
  { id: 'patient-live-status', label: 'Patient Live Status', category: 'Patient Dashboard' },
  { id: 'patient-search-dashboard', label: 'Patient Search (Dashboard)', category: 'Patient Dashboard' },
  // Patient Pages (3)
  { id: 'landing-patient-modal', label: 'Landing Patient Modal', category: 'Patient Pages' },
  { id: 'patient-search', label: 'Patient Search', category: 'Patient Pages' },
  { id: 'patient-chat', label: 'Patient Chat', category: 'Patient Pages' },
  // Notifications – Appointment (4)
  { id: 'notif-appointment-reminder', label: 'Appointment Reminder', category: 'Notifications \u2013 Appointment' },
  { id: 'notif-follow-up', label: 'Follow-Up Reminder', category: 'Notifications \u2013 Appointment' },
  { id: 'notif-appointment-cancelled', label: 'Appointment Cancelled', category: 'Notifications \u2013 Cancellation / Restoration' },
  { id: 'notif-appointment-restored', label: 'Appointment Restored', category: 'Notifications \u2013 Cancellation / Restoration' },
  // Notifications – Clinical (5)
  { id: 'notif-consultation-completed', label: 'Consultation Completed', category: 'Notifications \u2013 Clinical' },
  { id: 'notif-rx-updated', label: 'Prescription Updated', category: 'Notifications \u2013 Clinical' },
  { id: 'notif-rx-download', label: 'RX Download', category: 'Notifications \u2013 Clinical' },
  { id: 'notif-ai-rx-analysis', label: 'AI RX Analysis', category: 'Notifications \u2013 Clinical' },
  { id: 'notif-ai-rx-patient', label: 'AI RX Patient Notification', category: 'Notifications \u2013 Clinical' },
  // Notifications – Communication (4)
  { id: 'notif-chat-request', label: 'Chat Request', category: 'Notifications \u2013 Communication' },
  { id: 'notif-chat-link', label: 'Chat Link', category: 'Notifications \u2013 Communication' },
  { id: 'notif-video-consultation', label: 'Video Consultation', category: 'Notifications \u2013 Communication' },
  { id: 'notif-video-link', label: 'Video Consultation Link', category: 'Notifications \u2013 Communication' },
  // Notifications – System / Other (5)
  { id: 'notif-slot-released', label: 'Slot Released', category: 'Notifications \u2013 System' },
  { id: 'notif-admin-alert', label: 'Admin Alert', category: 'Notifications \u2013 System' },
  { id: 'notif-birthday', label: 'Birthday Card', category: 'Notifications \u2013 System' },
  { id: 'notif-plan-change', label: 'Scheduled Plan Change', category: 'Notifications \u2013 System' },
  { id: 'notif-renewal-reminder', label: 'Renewal Reminder', category: 'Notifications \u2013 System' },
  // Master Access (1)
  { id: 'master-access', label: 'Master Access Dashboard', category: 'Master Access' },
];

const PLACEMENT_CATEGORIES = [...new Set(ALL_PLACEMENTS.map(p => p.category))];

// Duration options
const DURATION_OPTIONS = [
  { days: 7, label: '7 Days', discount: 1.0, tag: '' },
  { days: 14, label: '14 Days', discount: 0.95, tag: '' },
  { days: 30, label: '30 Days', discount: 0.90, tag: 'POPULAR' },
  { days: 60, label: '60 Days', discount: 0.85, tag: 'BEST VALUE' },
  { days: 90, label: '90 Days', discount: 0.80, tag: '' },
];

const REACH_MARKS = [1000, 2500, 5000, 10000, 25000, 50000, 100000];
const BASE_CPM = 200;

const STEPS = [
  { num: 1, label: 'Territory' },
  { num: 2, label: 'Templates' },
  { num: 3, label: 'Duration & Reach' },
  { num: 4, label: 'Upload & Pay' },
];

export default function AdvertiserCreateCampaign({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [allDoctors, setAllDoctors] = useState<DoctorRecord[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});

  // Step 1: Territory (States -> Pincodes -> Specialties)
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedPincodes, setSelectedPincodes] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [pincodeSearch, setPincodeSearch] = useState('');
  const [specialtySearch, setSpecialtySearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');

  // Step 2: Templates
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);

  // Step 3: Duration & Reach
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [reach, setReach] = useState(5000);

  // Step 4: Upload & Pay
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [adType, setAdType] = useState<'static' | 'video'>('static');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // A/B Testing
  const [abTestEnabled, setAbTestEnabled] = useState(false);
  const [uploadedFileB, setUploadedFileB] = useState<File | null>(null);
  const [previewUrlB, setPreviewUrlB] = useState<string | null>(null);
  const [isDraggingB, setIsDraggingB] = useState(false);
  const fileInputRefB = useRef<HTMLInputElement>(null);

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [verifyingCoupon, setVerifyingCoupon] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [campaignCreated, setCampaignCreated] = useState(false);

  // ── Fetch all doctors + booking counts on mount ──
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const snap = await getDocs(collection(db, 'doctors'));
        const doctors: DoctorRecord[] = snap.docs.map(d => {
          const data = d.data();
          const pincode = data.clinicPincode || data.pincode || data.pinCode ||
            data.chambers?.main?.pincode || '';
          const state = getStateFromPincode(pincode);
          const specs: string[] = Array.isArray(data.specialties) && data.specialties.length > 0
            ? data.specialties
            : (data.specialty ? [data.specialty] : ['other']);
          return { id: d.id, pincode, state, specialties: specs };
        }).filter(d => d.pincode && d.state);
        setAllDoctors(doctors);

        // Real booking counts (last 30 days)
        try {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const isoDate = thirtyDaysAgo.toISOString().split('T')[0];
          const bookingsSnap = await getDocs(collection(db, 'bookings'));
          const counts: Record<string, number> = {};
          bookingsSnap.docs.forEach(bd => {
            const bData = bd.data();
            if (bData.isCancelled || bData.status === 'cancelled') return;
            const apptDate = bData.appointmentDate || bData.date || '';
            const dateStr = typeof apptDate === 'string' ? apptDate :
              (apptDate?.toDate ? apptDate.toDate().toISOString().split('T')[0] : '');
            if (dateStr >= isoDate) {
              const did = bData.doctorId || '';
              if (did) counts[did] = (counts[did] || 0) + 1;
            }
          });
          setBookingCounts(counts);
        } catch (err) {
          console.error('Error fetching bookings:', err);
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
        toast.error('Failed to load doctor data');
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, []);

  // ── Available states (only those with doctors in DB) ──
  const availableStates = useMemo(() => {
    const states = new Set(allDoctors.map(d => d.state).filter(Boolean));
    return [...states].sort();
  }, [allDoctors]);

  // ── Available pincodes for selected states ──
  const availablePincodes = useMemo(() => {
    if (selectedStates.length === 0) return [];
    return [...new Set(
      allDoctors.filter(d => selectedStates.includes(d.state)).map(d => d.pincode).filter(Boolean)
    )].sort();
  }, [allDoctors, selectedStates]);

  // ── Available specialties for selected states + pincodes ──
  const availableSpecialties = useMemo(() => {
    const ids = new Set<string>();
    allDoctors
      .filter(d => {
        if (selectedStates.length > 0 && !selectedStates.includes(d.state)) return false;
        if (selectedPincodes.length > 0 && !selectedPincodes.includes(d.pincode)) return false;
        return true;
      })
      .forEach(d => d.specialties.forEach(s => ids.add(s)));
    return [...ids].sort();
  }, [allDoctors, selectedStates, selectedPincodes]);

  // ── Filtered doctors based on complete selection ──
  const filteredDoctors = useMemo(() => {
    return allDoctors.filter(d => {
      if (selectedStates.length > 0 && !selectedStates.includes(d.state)) return false;
      if (selectedPincodes.length > 0 && !selectedPincodes.includes(d.pincode)) return false;
      if (selectedSpecialties.length > 0) {
        if (!d.specialties.some(s => selectedSpecialties.includes(s))) return false;
      }
      return true;
    });
  }, [allDoctors, selectedStates, selectedPincodes, selectedSpecialties]);

  const doctorCount = filteredDoctors.length;

  // ── Real avg daily bookings ──
  const avgDailyBookings = useMemo(() => {
    const ids = filteredDoctors.map(d => d.id);
    const total30d = ids.reduce((sum, did) => sum + (bookingCounts[did] || 0), 0);
    return Math.round(total30d / 30);
  }, [filteredDoctors, bookingCounts]);

  // ── Total bookings (30 days) for target doctors ──
  const totalBookings30d = useMemo(() => {
    return filteredDoctors.map(d => d.id).reduce((sum, did) => sum + (bookingCounts[did] || 0), 0);
  }, [filteredDoctors, bookingCounts]);

  // ── Real campaign reach metrics ──
  const templateCount = Math.max(selectedTemplateIds.length, 1);
  // Each booking = 1 patient touches each selected template once
  const impressionsPerBooking = templateCount;
  const dailyImpressions = avgDailyBookings * impressionsPerBooking;
  const totalCampaignImpressions = dailyImpressions * selectedDuration;

  // ── Pricing ──
  const durationOption = DURATION_OPTIONS.find(d => d.days === selectedDuration) || DURATION_OPTIONS[2];
  const subtotal = Math.round((reach / 1000) * BASE_CPM * templateCount * durationOption.discount);
  const discountAmount = isCouponApplied ? Math.round(subtotal * discountPercentage / 100) : 0;
  const afterDiscount = subtotal - discountAmount;
  const gstAmount = Math.round(afterDiscount * 0.18);
  const totalAmount = afterDiscount + gstAmount;

  // ── Search filters ──
  const filteredPincodes = availablePincodes.filter(p => p.includes(pincodeSearch));
  const filteredSpecialtiesList = availableSpecialties.filter(s => {
    const label = getSpecialtyLabel(s).toLowerCase();
    return label.includes(specialtySearch.toLowerCase()) || s.includes(specialtySearch.toLowerCase());
  });
  const filteredTemplates = ALL_PLACEMENTS.filter(p =>
    p.label.toLowerCase().includes(templateSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(templateSearch.toLowerCase())
  );

  // ── Coupon ──
  const verifyCoupon = async () => {
    if (!couponCode.trim()) return;
    setVerifyingCoupon(true);
    setCouponError('');
    try {
      const q = query(collection(db, 'discountCards'), where('code', '==', couponCode.trim()));
      const snap = await getDocs(q);
      if (snap.empty) { setCouponError('Invalid coupon code'); setVerifyingCoupon(false); return; }
      const data = snap.docs[0].data();
      if (!data.isActive) { setCouponError('This coupon is no longer active'); setVerifyingCoupon(false); return; }
      if (data.expiryDate) {
        const expiry = data.expiryDate.toDate ? data.expiryDate.toDate() : new Date(data.expiryDate);
        if (expiry < new Date()) { setCouponError('This coupon has expired'); setVerifyingCoupon(false); return; }
      }
      setDiscountPercentage(data.discountPercentage);
      setIsCouponApplied(true);
    } catch { setCouponError('Error verifying coupon'); }
    finally { setVerifyingCoupon(false); }
  };
  const removeCoupon = () => { setCouponCode(''); setDiscountPercentage(0); setIsCouponApplied(false); setCouponError(''); };

  // ── File handling (Variant A) ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadedFile(file); setPreviewUrl(URL.createObjectURL(file));
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) { setUploadedFile(file); setPreviewUrl(URL.createObjectURL(file)); }
  };
  const removeFile = () => { setUploadedFile(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); };

  // ── File handling (Variant B) ──
  const handleFileSelectB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadedFileB(file); setPreviewUrlB(URL.createObjectURL(file));
  };
  const handleDropB = (e: React.DragEvent) => {
    e.preventDefault(); setIsDraggingB(false);
    const file = e.dataTransfer.files[0];
    if (file) { setUploadedFileB(file); setPreviewUrlB(URL.createObjectURL(file)); }
  };
  const removeFileB = () => { setUploadedFileB(null); if (previewUrlB) URL.revokeObjectURL(previewUrlB); setPreviewUrlB(null); };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!uploadedFile) { toast.error('Please upload a creative'); return; }
    if (abTestEnabled && !uploadedFileB) { toast.error('Please upload Variant B creative for A/B test'); return; }
    if (!auth?.currentUser) { toast.error('Please log in to continue'); return; }
    if (!storage) { toast.error('Storage not initialized'); return; }
    setIsSubmitting(true);
    try {
      const storagePath = `campaigns/${auth.currentUser.uid}/${Date.now()}_${uploadedFile.name}`;
      const fileRef = ref(storage, storagePath);
      await uploadBytes(fileRef, uploadedFile);
      const creativeUrl = await getDownloadURL(fileRef);

      // Upload Variant B if A/B test enabled
      let creativeUrlB = '';
      let creativeFileNameB = '';
      if (abTestEnabled && uploadedFileB) {
        const storagePathB = `campaigns/${auth.currentUser.uid}/${Date.now()}_B_${uploadedFileB.name}`;
        const fileRefB = ref(storage, storagePathB);
        await uploadBytes(fileRefB, uploadedFileB);
        creativeUrlB = await getDownloadURL(fileRefB);
        creativeFileNameB = uploadedFileB.name;
      }

      await addDoc(collection(db, 'advertiser_campaigns'), {
        advertiserId: auth.currentUser.uid,
        advertiserEmail: auth.currentUser.email || localStorage.getItem('healqr_advertiser_email') || '',
        createdAt: serverTimestamp(),
        status: 'pending_review',
        states: selectedStates.length > 0 ? selectedStates : ['All States'],
        pincodes: selectedPincodes.length > 0 ? selectedPincodes : availablePincodes,
        specialties: selectedSpecialties.length > 0 ? selectedSpecialties : availableSpecialties,
        templates: selectedTemplateIds,
        duration: selectedDuration,
        totalReach: reach,
        dailyImpressions,
        totalCampaignImpressions,
        adType, creativeUrl, creativeFileName: uploadedFile.name,
        // A/B Testing fields
        abTestEnabled,
        ...(abTestEnabled ? { creativeUrlB, creativeFileNameB, variantAStats: { impressions: 0, clicks: 0 }, variantBStats: { impressions: 0, clicks: 0 } } : {}),
        subtotal,
        discountPercentage: isCouponApplied ? discountPercentage : 0,
        couponCode: isCouponApplied ? couponCode : '',
        discountAmount, gstAmount, totalAmount,
        targetDoctorCount: doctorCount,
        estimatedDailyBookings: avgDailyBookings,
        totalBookings30d,
        stats: { impressions: 0, clicks: 0 },
        reviewedAt: null, reviewedBy: null, startDate: null, endDate: null,
      });
      setCampaignCreated(true);
      toast.success('Campaign submitted for review!');
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to submit campaign. Please try again.');
    } finally { setIsSubmitting(false); }
  };

  // ── Step validation ──
  const canProceed = () => {
    switch (step) {
      case 1: return !loadingDoctors && selectedStates.length > 0;
      case 2: return selectedTemplateIds.length > 0;
      case 3: return reach >= 1000 && selectedDuration > 0;
      case 4: return !!uploadedFile && (!abTestEnabled || !!uploadedFileB);
      default: return false;
    }
  };

  // ── Success screen ──
  if (campaignCreated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 max-w-lg text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
            <PartyPopper className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-bold text-white">Campaign Submitted!</h2>
          <p className="text-zinc-400 leading-relaxed">
            Your campaign is now <span className="text-amber-400 font-semibold">under review</span>.
            Our team will verify your ad creative and targeting within <span className="text-white font-semibold">24 hours</span>.
          </p>
          <div className="bg-black/50 border border-zinc-800 rounded-xl p-4 text-left space-y-2">
            <div className="flex justify-between text-sm"><span className="text-zinc-500">States</span><span className="text-white">{selectedStates.join(', ')}</span></div>
            <div className="flex justify-between text-sm"><span className="text-zinc-500">Target Doctors</span><span className="text-white">{doctorCount}</span></div>
            <div className="flex justify-between text-sm"><span className="text-zinc-500">Templates</span><span className="text-white">{selectedTemplateIds.length}</span></div>
            <div className="flex justify-between text-sm"><span className="text-zinc-500">Duration</span><span className="text-white">{selectedDuration} days</span></div>
            <div className="flex justify-between text-sm"><span className="text-zinc-500">Total Impressions</span><span className="text-white">{totalCampaignImpressions.toLocaleString()}</span></div>
            {abTestEnabled && (
              <div className="flex justify-between text-sm"><span className="text-zinc-500">A/B Testing</span><span className="text-amber-400">Enabled (50/50 split)</span></div>
            )}
            <div className="border-t border-zinc-800 pt-2 mt-2 flex justify-between font-bold">
              <span className="text-white">Amount Paid</span><span className="text-emerald-400">{'\u20B9'}{totalAmount.toLocaleString()}</span>
            </div>
          </div>
          <button onClick={onBack} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors">
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button onClick={onBack} className="text-zinc-500 hover:text-white text-sm mb-2 flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Campaigns
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Create Campaign</h1>
          <p className="text-zinc-400 text-sm mt-1">Self-service ad campaign wizard</p>
        </div>
      </div>

      {/* Step Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step > s.num ? 'bg-emerald-500 text-white' :
                  step === s.num ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/20' :
                  'bg-zinc-800 text-zinc-500'
                }`}>
                  {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                </div>
                <span className={`text-xs mt-1.5 hidden sm:block ${step >= s.num ? 'text-emerald-400' : 'text-zinc-600'}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-16 sm:w-24 h-0.5 mx-2 transition-colors ${step > s.num ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* ═══════ STEP 1: TERRITORY (State → Pincodes → Specialties) ═══════ */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              {/* State Selection */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-500" /> Select States
                </h3>
                <p className="text-zinc-400 text-sm mb-4">Choose one or more states where you want your ads to reach doctors.</p>
                {loadingDoctors ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
                    <span className="ml-3 text-zinc-400">Loading doctor network...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-2">
                        {selectedStates.length > 0 && (
                          <button onClick={() => { setSelectedStates([]); setSelectedPincodes([]); setSelectedSpecialties([]); }} className="text-xs text-red-400 hover:text-red-300 px-2 py-1">Clear</button>
                        )}
                        <button
                          onClick={() => { setSelectedStates(selectedStates.length === availableStates.length ? [] : [...availableStates]); setSelectedPincodes([]); setSelectedSpecialties([]); }}
                          className="text-xs text-emerald-500 hover:text-emerald-400 px-2 py-1"
                        >{selectedStates.length === availableStates.length ? 'Deselect All' : 'Select All'}</button>
                      </div>
                    </div>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input type="text" placeholder="Search states..." value={stateSearch}
                        onChange={(e) => setStateSearch(e.target.value)}
                        className="w-full bg-black border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {availableStates
                        .filter(st => st.toLowerCase().includes(stateSearch.toLowerCase()))
                        .map(st => {
                          const count = allDoctors.filter(d => d.state === st).length;
                          return (
                            <button key={st} onClick={() => { setSelectedStates(prev => prev.includes(st) ? prev.filter(s => s !== st) : [...prev, st]); setSelectedPincodes([]); setSelectedSpecialties([]); }}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedStates.includes(st) ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                              {st} ({count})
                            </button>
                          );
                        })}
                    </div>
                    {selectedStates.length > 0 && <p className="text-xs text-emerald-400 mt-2">{selectedStates.length} of {availableStates.length} states selected</p>}
                  </>
                )}
              </div>

              {/* Pincodes — shown after state selection */}
              {selectedStates.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-in slide-in-from-bottom-3 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-500" /> Available Pincodes in {selectedStates.length === 1 ? selectedStates[0] : `${selectedStates.length} states`}
                    </h3>
                    <div className="flex gap-2">
                      {selectedPincodes.length > 0 && (
                        <button onClick={() => setSelectedPincodes([])} className="text-xs text-red-400 hover:text-red-300 px-2 py-1">Clear</button>
                      )}
                      <button
                        onClick={() => setSelectedPincodes(selectedPincodes.length === availablePincodes.length ? [] : [...availablePincodes])}
                        className="text-xs text-emerald-500 hover:text-emerald-400 px-2 py-1"
                      >{selectedPincodes.length === availablePincodes.length ? 'Deselect All' : 'Select All'}</button>
                    </div>
                  </div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input type="text" placeholder="Search pincodes..." value={pincodeSearch}
                      onChange={(e) => setPincodeSearch(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {filteredPincodes.length === 0
                      ? <p className="text-zinc-500 text-sm py-4 w-full text-center">No pincodes found</p>
                      : filteredPincodes.map(pin => (
                        <button key={pin} onClick={() => setSelectedPincodes(prev => prev.includes(pin) ? prev.filter(p => p !== pin) : [...prev, pin])}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedPincodes.includes(pin) ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                          {pin}
                        </button>
                      ))}
                  </div>
                  {selectedPincodes.length > 0 && <p className="text-xs text-emerald-400 mt-2">{selectedPincodes.length} of {availablePincodes.length} pincodes selected</p>}
                  <p className="text-xs text-zinc-600 mt-1">Leave empty to target all {availablePincodes.length} pincodes</p>
                </div>
              )}

              {/* Specialties — shown after state selection */}
              {selectedStates.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-in slide-in-from-bottom-3 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Filter className="w-5 h-5 text-purple-500" /> Available Specialties
                      {selectedPincodes.length > 0 && <span className="text-xs text-zinc-500 font-normal ml-1">({selectedPincodes.length} pincodes)</span>}
                    </h3>
                    <div className="flex gap-2">
                      {selectedSpecialties.length > 0 && (
                        <button onClick={() => setSelectedSpecialties([])} className="text-xs text-red-400 hover:text-red-300 px-2 py-1">Clear</button>
                      )}
                      <button
                        onClick={() => setSelectedSpecialties(selectedSpecialties.length === availableSpecialties.length ? [] : [...availableSpecialties])}
                        className="text-xs text-purple-500 hover:text-purple-400 px-2 py-1"
                      >{selectedSpecialties.length === availableSpecialties.length ? 'Deselect All' : 'Select All'}</button>
                    </div>
                  </div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input type="text" placeholder="Search specialties..." value={specialtySearch}
                      onChange={(e) => setSpecialtySearch(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {filteredSpecialtiesList.length === 0
                      ? <p className="text-zinc-500 text-sm py-4 w-full text-center">No specialties found</p>
                      : filteredSpecialtiesList.map(specId => (
                        <button key={specId} onClick={() => setSelectedSpecialties(prev => prev.includes(specId) ? prev.filter(s => s !== specId) : [...prev, specId])}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedSpecialties.includes(specId) ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                          {getSpecialtyLabel(specId)}
                        </button>
                      ))}
                  </div>
                  {selectedSpecialties.length > 0 && <p className="text-xs text-purple-400 mt-2">{selectedSpecialties.length} specialties selected</p>}
                  <p className="text-xs text-zinc-600 mt-1">Leave empty to target all specialties</p>
                </div>
              )}

              {/* Stats summary — shown after state selection */}
              {selectedStates.length > 0 && !loadingDoctors && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                      <Users className="w-4 h-4 text-emerald-500" /> Doctors Found
                    </div>
                    <div className="text-4xl font-bold text-white">{doctorCount}</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {selectedStates.join(', ')}{selectedPincodes.length > 0 ? ` \u2022 ${selectedPincodes.length} pincodes` : ''}{selectedSpecialties.length > 0 ? ` \u2022 ${selectedSpecialties.length} specialties` : ''}
                    </div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                    <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                      <Activity className="w-4 h-4 text-blue-500" /> Avg Daily Bookings
                    </div>
                    <div className="text-4xl font-bold text-white">{avgDailyBookings.toLocaleString()}</div>
                    <div className="text-xs text-zinc-500 mt-1">last 30 days ({totalBookings30d.toLocaleString()} total)</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════ STEP 2: TEMPLATES (Dropdown + Cards) ═══════ */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" /> Choose Ad Placements
                </h3>
                <p className="text-zinc-400 text-sm mb-6">
                  Select where your ads will appear. Each placement = 1 impression per patient booking.
                  Based on <span className="text-white font-semibold">{avgDailyBookings}/day</span> bookings, your ad will reach patients in real-time.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* LEFT: Multi-select dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Select Placements ({ALL_PLACEMENTS.length} available)</label>
                    <div className="relative">
                      <div
                        onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
                        className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white cursor-pointer flex items-center justify-between hover:border-zinc-500 transition-colors"
                      >
                        <span className={selectedTemplateIds.length > 0 ? 'text-white' : 'text-zinc-500'}>
                          {selectedTemplateIds.length > 0
                            ? `${selectedTemplateIds.length} placement${selectedTemplateIds.length > 1 ? 's' : ''} selected`
                            : 'Click to select placements...'}
                        </span>
                        <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${templateDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>

                      {templateDropdownOpen && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-h-96 overflow-hidden">
                          <div className="p-3 border-b border-zinc-800">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                              <input type="text" placeholder="Search placements..." value={templateSearch}
                                onChange={(e) => setTemplateSearch(e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
                            </div>
                            <div className="flex justify-between mt-2">
                              <button onClick={() => setSelectedTemplateIds(ALL_PLACEMENTS.map(p => p.id))}
                                className="text-xs text-emerald-500 hover:text-emerald-400">Select All ({ALL_PLACEMENTS.length})</button>
                              <button onClick={() => setSelectedTemplateIds([])}
                                className="text-xs text-red-400 hover:text-red-300">Clear All</button>
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            {PLACEMENT_CATEGORIES.map(cat => {
                              const items = filteredTemplates.filter(p => p.category === cat);
                              if (items.length === 0) return null;
                              const allInCatSelected = items.every(p => selectedTemplateIds.includes(p.id));
                              return (
                                <div key={cat}>
                                  <div className="px-4 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-800/50 flex items-center justify-between">
                                    <span>{cat} ({items.length})</span>
                                    <button onClick={() => {
                                      const catIds = items.map(p => p.id);
                                      if (allInCatSelected) setSelectedTemplateIds(prev => prev.filter(id => !catIds.includes(id)));
                                      else setSelectedTemplateIds(prev => [...new Set([...prev, ...catIds])]);
                                    }} className="text-emerald-500 hover:text-emerald-400 text-[10px]">
                                      {allInCatSelected ? 'Remove' : 'Add all'}
                                    </button>
                                  </div>
                                  {items.map(p => (
                                    <div key={p.id}
                                      onClick={() => setSelectedTemplateIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-zinc-800 transition-colors ${
                                        selectedTemplateIds.includes(p.id) ? 'bg-emerald-500/10' : ''
                                      }`}>
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                        selectedTemplateIds.includes(p.id) ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'
                                      }`}>
                                        {selectedTemplateIds.includes(p.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                      </div>
                                      <span className="text-sm text-white flex-1">{p.label}</span>
                                      <span className="text-xs text-zinc-500">{avgDailyBookings}/day</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedTemplateIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {selectedTemplateIds.map(id => {
                          const p = ALL_PLACEMENTS.find(pl => pl.id === id);
                          return (
                            <span key={id} className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-lg border border-emerald-500/20">
                              {p?.label || id}
                              <X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => setSelectedTemplateIds(prev => prev.filter(i => i !== id))} />
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Selected cards with real reach data */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Selected Placements {selectedTemplateIds.length > 0 && <span className="text-emerald-400">({selectedTemplateIds.length})</span>}
                    </label>
                    <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                      {selectedTemplateIds.length === 0 ? (
                        <div className="bg-black/50 border border-zinc-800 rounded-xl p-6 text-center">
                          <Sparkles className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                          <p className="text-zinc-500 text-sm">Select placements from the dropdown</p>
                        </div>
                      ) : (
                        selectedTemplateIds.map(id => {
                          const p = ALL_PLACEMENTS.find(pl => pl.id === id);
                          return (
                            <div key={id} className="bg-black border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-600 transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-white text-sm truncate">{p?.label || id}</div>
                                <div className="text-[10px] text-zinc-500 mt-0.5">{p?.category}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="flex items-center gap-1.5">
                                  <Eye className="w-4 h-4 text-blue-500" />
                                  <span className="text-lg font-bold text-blue-400">{avgDailyBookings}</span>
                                </div>
                                <div className="text-[10px] text-zinc-500">views/day</div>
                              </div>
                              <button onClick={() => setSelectedTemplateIds(prev => prev.filter(i => i !== id))}
                                className="p-1 text-zinc-500 hover:text-red-400 shrink-0">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Impression summary after selections */}
                {selectedTemplateIds.length > 0 && (
                  <div className="mt-6 bg-emerald-900/20 border border-emerald-500/20 rounded-xl p-5 animate-in fade-in">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xs text-zinc-400 mb-1">Impressions / Booking</div>
                        <div className="text-2xl font-bold text-emerald-400">{impressionsPerBooking}</div>
                        <div className="text-[10px] text-zinc-500">{selectedTemplateIds.length} template{selectedTemplateIds.length > 1 ? 's' : ''} per patient</div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-400 mb-1">Daily Views</div>
                        <div className="text-2xl font-bold text-blue-400">{dailyImpressions.toLocaleString()}</div>
                        <div className="text-[10px] text-zinc-500">{avgDailyBookings} bookings x {impressionsPerBooking} templates</div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-400 mb-1">Est. Campaign Total</div>
                        <div className="text-2xl font-bold text-amber-400">{(dailyImpressions * selectedDuration).toLocaleString()}</div>
                        <div className="text-[10px] text-zinc-500">over {selectedDuration} days</div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTemplateIds.length === 0 && (
                  <p className="text-amber-400 text-sm mt-4 flex items-center gap-1">
                    <Zap className="w-4 h-4" /> Select at least one placement to continue
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ═══════ STEP 3: DURATION & REACH ═══════ */}
          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" /> Campaign Duration
                </h3>
                <p className="text-zinc-400 text-sm mb-6">Longer campaigns get better CPM rates.</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {DURATION_OPTIONS.map(opt => (
                    <button key={opt.days} onClick={() => setSelectedDuration(opt.days)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        selectedDuration === opt.days ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-black hover:border-zinc-600'
                      }`}>
                      {opt.tag && (
                        <div className="text-[10px] font-bold text-emerald-400 mb-1">{'\u2605'} {opt.tag}</div>
                      )}
                      <div className="text-2xl font-bold text-white">{opt.days}</div>
                      <div className="text-xs text-zinc-400">days</div>
                      {opt.discount < 1 && (
                        <div className="text-[11px] text-emerald-400 font-semibold mt-1">{Math.round((1 - opt.discount) * 100)}% off</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" /> Target Reach (Paid Impressions)
                </h3>
                <p className="text-zinc-400 text-sm mb-6">Additional paid impressions on top of organic booking views.</p>

                <div className="text-center mb-6">
                  <div className="text-5xl font-bold text-white">
                    {reach >= 1000 ? `${(reach / 1000).toFixed(reach % 1000 === 0 ? 0 : 1)}K` : reach}
                  </div>
                  <div className="text-sm text-zinc-400 mt-1">paid impressions</div>
                </div>

                <div className="px-2">
                  <input type="range" min="1000" max="100000" step="1000" value={reach}
                    onChange={(e) => setReach(Number(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                      [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:bg-emerald-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none" />
                  <div className="flex justify-between text-xs text-zinc-600 mt-2">
                    <span>1K</span><span>25K</span><span>50K</span><span>75K</span><span>100K</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {REACH_MARKS.map(val => (
                    <button key={val} onClick={() => setReach(val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        reach === val ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}>
                      {val >= 1000 ? `${val / 1000}K` : val}
                    </button>
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="bg-black/50 border border-zinc-800 rounded-xl p-4">
                    <div className="text-xs text-zinc-400 mb-1">Organic Views/Day</div>
                    <div className="text-xl font-bold text-emerald-400">{dailyImpressions.toLocaleString()}</div>
                    <div className="text-[10px] text-zinc-500">from real bookings</div>
                  </div>
                  <div className="bg-black/50 border border-zinc-800 rounded-xl p-4">
                    <div className="text-xs text-zinc-400 mb-1">Organic Total</div>
                    <div className="text-xl font-bold text-blue-400">{totalCampaignImpressions.toLocaleString()}</div>
                    <div className="text-[10px] text-zinc-500">{selectedDuration} days</div>
                  </div>
                  <div className="bg-black/50 border border-zinc-800 rounded-xl p-4">
                    <div className="text-xs text-zinc-400 mb-1">+ Paid Reach</div>
                    <div className="text-xl font-bold text-amber-400">{reach.toLocaleString()}</div>
                    <div className="text-[10px] text-zinc-500">additional impressions</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ STEP 4: UPLOAD & PAY ═══════ */}
          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <MonitorPlay className="w-5 h-5 text-purple-500" /> Ad Format
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    adType === 'static' ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-800 bg-black hover:border-zinc-600'
                  }`}>
                    <input type="radio" checked={adType === 'static'} onChange={() => setAdType('static')} className="hidden" />
                    <ImageIcon className={`w-6 h-6 ${adType === 'static' ? 'text-purple-400' : 'text-zinc-500'}`} />
                    <div><div className="font-medium text-white text-sm">Static Image</div><div className="text-xs text-zinc-400">JPG, PNG banner</div></div>
                  </label>
                  <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    adType === 'video' ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-800 bg-black hover:border-zinc-600'
                  }`}>
                    <input type="radio" checked={adType === 'video'} onChange={() => setAdType('video')} className="hidden" />
                    <MonitorPlay className={`w-6 h-6 ${adType === 'video' ? 'text-purple-400' : 'text-zinc-500'}`} />
                    <div><div className="font-medium text-white text-sm">Video Ad</div><div className="text-xs text-zinc-400">MP4, MOV (max 15s)</div></div>
                  </label>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-emerald-500" /> Upload Creative {abTestEnabled && <span className="text-xs text-amber-400 font-normal">(Variant A)</span>}
                </h3>
                {!uploadedFile ? (
                  <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-700 hover:border-zinc-600 bg-black/50'
                  }`}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}>
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      {adType === 'video' ? <FileVideo className="w-8 h-8 text-zinc-400" /> : <FileImage className="w-8 h-8 text-zinc-400" />}
                    </div>
                    <h4 className="text-lg font-medium text-white mb-2">Drag & drop your {adType === 'video' ? 'video' : 'image'} here</h4>
                    <p className="text-zinc-400 text-sm mb-4">{adType === 'video' ? 'MP4, MOV (Max 15 seconds)' : 'JPG, PNG (Recommended: 728x90 or 300x250)'}</p>
                    <input type="file" ref={fileInputRef} className="hidden" accept={adType === 'video' ? 'video/*' : 'image/*'} onChange={handleFileSelect} />
                    <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors">
                      Browse Files
                    </button>
                  </div>
                ) : (
                  <div className="bg-black border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-800 rounded-lg">
                          {adType === 'video' ? <FileVideo className="w-5 h-5 text-purple-400" /> : <FileImage className="w-5 h-5 text-blue-400" />}
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">{uploadedFile.name}</div>
                          <div className="text-zinc-500 text-xs">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                      </div>
                      <button onClick={removeFile} className="p-2 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    {previewUrl && (
                      <div className="relative aspect-video bg-black flex items-center justify-center">
                        {adType === 'video'
                          ? <video src={previewUrl} controls className="max-h-[300px] w-full object-contain" />
                          : <img src={previewUrl} alt="Preview" className="max-h-[300px] w-full object-contain" />}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* A/B Testing Toggle */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-amber-500" /> A/B Testing
                    </h3>
                    <p className="text-zinc-400 text-sm mt-1">Upload a second creative to split-test which performs better. Traffic is split 50/50.</p>
                  </div>
                  <button
                    onClick={() => { setAbTestEnabled(!abTestEnabled); if (abTestEnabled) removeFileB(); }}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${abTestEnabled ? 'bg-amber-500' : 'bg-zinc-700'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${abTestEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {abTestEnabled && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-amber-400 mb-3">Variant B Creative</label>
                    {!uploadedFileB ? (
                      <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                        isDraggingB ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-700 hover:border-zinc-600 bg-black/50'
                      }`}
                        onDrop={handleDropB}
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingB(true); }}
                        onDragLeave={() => setIsDraggingB(false)}>
                        <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                          {adType === 'video' ? <FileVideo className="w-6 h-6 text-zinc-400" /> : <FileImage className="w-6 h-6 text-zinc-400" />}
                        </div>
                        <p className="text-zinc-400 text-sm mb-3">Upload Variant B {adType === 'video' ? 'video' : 'image'}</p>
                        <input type="file" ref={fileInputRefB} className="hidden" accept={adType === 'video' ? 'video/*' : 'image/*'} onChange={handleFileSelectB} />
                        <button onClick={() => fileInputRefB.current?.click()} className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors">
                          Browse Files
                        </button>
                      </div>
                    ) : (
                      <div className="bg-black border border-amber-500/30 rounded-xl overflow-hidden">
                        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-amber-500/10 rounded-lg">
                              {adType === 'video' ? <FileVideo className="w-4 h-4 text-amber-400" /> : <FileImage className="w-4 h-4 text-amber-400" />}
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm">{uploadedFileB.name}</div>
                              <div className="text-zinc-500 text-xs">{(uploadedFileB.size / 1024 / 1024).toFixed(2)} MB</div>
                            </div>
                          </div>
                          <button onClick={removeFileB} className="p-1.5 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {previewUrlB && (
                          <div className="relative aspect-video bg-black flex items-center justify-center">
                            {adType === 'video'
                              ? <video src={previewUrlB} controls className="max-h-[200px] w-full object-contain" />
                              : <img src={previewUrlB} alt="Variant B Preview" className="max-h-[200px] w-full object-contain" />}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-500" /> Payment
                </h3>
                <div className="mb-6">
                  {!isCouponApplied ? (
                    <div className="flex gap-2">
                      <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Enter Coupon Code"
                        className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500" />
                      <button onClick={verifyCoupon} disabled={verifyingCoupon || !couponCode}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                        {verifyingCoupon ? '...' : 'Apply'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-500 text-sm font-medium">{couponCode} \u2014 {discountPercentage}% OFF</span>
                      </div>
                      <button onClick={removeCoupon} className="text-zinc-500 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                  {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
                </div>

                <div className="bg-black/50 border border-zinc-800 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">{(reach / 1000).toFixed(0)}K paid views x {selectedTemplateIds.length} placement{selectedTemplateIds.length !== 1 ? 's' : ''} x {selectedDuration}d</span>
                    <span className="text-white">{'\u20B9'}{subtotal.toLocaleString()}</span>
                  </div>
                  {durationOption.discount < 1 && (
                    <div className="flex justify-between text-sm text-emerald-400">
                      <span>Duration discount ({Math.round((1 - durationOption.discount) * 100)}%)</span><span>included</span>
                    </div>
                  )}
                  {isCouponApplied && (
                    <div className="flex justify-between text-sm text-emerald-400">
                      <span>Coupon ({discountPercentage}%)</span><span>-{'\u20B9'}{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">GST (18%)</span><span className="text-white">{'\u20B9'}{gstAmount.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-zinc-700 pt-3 flex justify-between font-bold text-lg">
                    <span className="text-white">Total</span><span className="text-emerald-400">{'\u20B9'}{totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-zinc-800 pt-3 text-xs text-zinc-500">
                    + <span className="text-emerald-400 font-semibold">{totalCampaignImpressions.toLocaleString()}</span> organic impressions from real bookings (FREE)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══════ RIGHT SIDEBAR ═══════ */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" /> Campaign Estimator
            </h3>
            <div className="space-y-5">
              <div className="bg-black/50 rounded-xl p-4 border border-zinc-800">
                <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-emerald-500" /><span className="text-zinc-400 text-sm">Target Doctors</span></div>
                <div className="text-3xl font-bold text-white">{loadingDoctors ? '...' : doctorCount}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {selectedStates.length > 0 ? `${selectedStates.length === 1 ? selectedStates[0] : `${selectedStates.length} states`}${selectedPincodes.length > 0 ? ` \u2022 ${selectedPincodes.length} pins` : ''}` : 'Select states'}
                </div>
              </div>

              <div className="bg-black/50 rounded-xl p-4 border border-zinc-800">
                <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-blue-500" /><span className="text-zinc-400 text-sm">Avg Daily Bookings</span></div>
                <div className="text-3xl font-bold text-white">{loadingDoctors ? '...' : avgDailyBookings.toLocaleString()}</div>
                <div className="text-xs text-zinc-500 mt-1">30-day real data</div>
              </div>

              {step >= 2 && selectedTemplateIds.length > 0 && (
                <div className="bg-black/50 rounded-xl p-4 border border-zinc-800 animate-in fade-in">
                  <div className="flex items-center gap-2 mb-2"><Eye className="w-4 h-4 text-amber-500" /><span className="text-zinc-400 text-sm">Daily Views</span></div>
                  <div className="text-2xl font-bold text-white">{dailyImpressions.toLocaleString()}</div>
                  <div className="text-xs text-zinc-500 mt-1">{selectedTemplateIds.length} templates x {avgDailyBookings} bookings</div>
                </div>
              )}

              {step >= 3 && (
                <div className="bg-black/50 rounded-xl p-4 border border-zinc-800 animate-in fade-in">
                  <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-purple-500" /><span className="text-zinc-400 text-sm">Campaign Plan</span></div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-zinc-400">Duration</span><span className="text-white font-medium">{selectedDuration} days</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Organic views</span><span className="text-emerald-400 font-medium">{totalCampaignImpressions.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">+ Paid reach</span><span className="text-amber-400 font-medium">{reach.toLocaleString()}</span></div>
                    <div className="flex justify-between border-t border-zinc-800 pt-1 mt-1"><span className="text-zinc-300 font-medium">Total impressions</span><span className="text-white font-bold">{(totalCampaignImpressions + reach).toLocaleString()}</span></div>
                  </div>
                </div>
              )}

              {step >= 3 && selectedTemplateIds.length > 0 && (
                <div className="bg-emerald-900/20 rounded-xl p-4 border border-emerald-500/30 animate-in fade-in">
                  <div className="text-emerald-400 text-sm font-medium mb-2">Estimated Cost</div>
                  <div className="text-3xl font-bold text-emerald-400">{'\u20B9'}{totalAmount.toLocaleString()}</div>
                  <div className="text-xs text-emerald-500/60 mt-1">incl. 18% GST{isCouponApplied ? ` | ${discountPercentage}% coupon` : ''}</div>
                </div>
              )}

              <div className="pt-4 space-y-3">
                {step < 4 ? (
                  <button onClick={() => setStep(step + 1)} disabled={!canProceed()}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                    {step === 1 ? 'Next: Choose Templates' :
                     step === 2 ? 'Next: Duration & Reach' : 'Next: Upload & Pay'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={!uploadedFile || isSubmitting}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                    {isSubmitting
                      ? <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Submitting...</>
                      : <>Pay {'\u20B9'}{totalAmount.toLocaleString()} & Submit <ArrowRight className="w-4 h-4" /></>}
                  </button>
                )}
                {step > 1 && (
                  <button onClick={() => setStep(step - 1)}
                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}