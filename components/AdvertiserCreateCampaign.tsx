import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../lib/firebase/config';
import { MapPin, Stethoscope, X, ArrowRight, Users, Activity, List, LayoutGrid, MonitorPlay, Image as ImageIcon, CheckCircle2, Clock, AlertCircle, Calendar, UploadCloud, CreditCard, FileVideo, FileImage, Trash2, Tag } from 'lucide-react';
import SelectionModal from './SelectionModal';
import { Badge } from './ui/badge';

interface AudienceStats {
  doctorCount: number;
  dailyPatientReach: number;
}

const COMMON_SPECIALTIES = [
  "General Physician", "Cardiologist", "Dermatologist", "Gynecologist",
  "Pediatrician", "Orthopedist", "Neurologist", "Psychiatrist", "Dentist",
  "ENT Specialist", "Ophthalmologist", "Urologist", "Gastroenterologist",
  "Pulmonologist", "Endocrinologist", "Rheumatologist", "Nephrologist",
  "Oncologist", "Surgeon", "Physiotherapist", "Ayurveda", "Homeopathy"
];

const SAMPLE_PINCODES = [
  "400001", "400050", "400099", "110001", "110020", "110099",
  "700001", "700091", "600001", "600040", "560001", "560100",
  "500001", "500081", "380001", "411001"
];

// New Data Structure for Placements (The "Templates" in user terms)
const AD_PLACEMENTS = [
  { id: 'p_confirm', name: 'Booking Confirmation Page', basePrice: 500, demand: 'high' },
  { id: 'p_details', name: 'Patient Details Form', basePrice: 300, demand: 'medium' },
  { id: 'p_date', name: 'Date Selection Page', basePrice: 200, demand: 'medium' },
  { id: 'p_chamber', name: 'Chamber Selection Page', basePrice: 200, demand: 'low' },
  { id: 'p_mini', name: 'Mini Website Page', basePrice: 150, demand: 'low' },
  { id: 'p_lang', name: 'Language Selection Page', basePrice: 100, demand: 'low' },
];

const VIEW_BUNDLES = [
  { value: 1000, label: '1K Views' },
  { value: 5000, label: '5K Views' },
  { value: 10000, label: '10K Views' },
  { value: 25000, label: '25K Views' },
];

export default function AdvertiserCreateCampaign({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(1);

  // Step 1 & 2 State
  const [pincodes, setPincodes] = useState<string[]>([]);
  const [specialities, setSpecialities] = useState<string[]>([]);
  const [pincodeInput, setPincodeInput] = useState('');
  const [specialityInput, setSpecialityInput] = useState('');
  const [stats, setStats] = useState<AudienceStats>({ doctorCount: 0, dailyPatientReach: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const [showPincodeModal, setShowPincodeModal] = useState(false);
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);

  // Step 3 State (Revised)
  const [selectedPlacementIds, setSelectedPlacementIds] = useState<string[]>([]);
  const [selectedBundle, setSelectedBundle] = useState<number>(1000);
  const [adType, setAdType] = useState<'static' | 'video'>('static');

  // Step 4 State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queue & Pricing State
  const [queueInfo, setQueueInfo] = useState<{
    position: number;
    estDays: number;
    status: 'available' | 'busy' | 'mixed';
    currentAdProgress?: number; // percentage
    details?: string;
  }>({ position: 0, estDays: 0, status: 'available' });

  const [totalAmount, setTotalAmount] = useState(0);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [verifyingCoupon, setVerifyingCoupon] = useState(false);

  const verifyCoupon = async () => {
    if (!couponCode.trim()) return;

    setVerifyingCoupon(true);
    setCouponError('');

    try {
      if (!db) {
        setCouponError('Database not initialized');
        setVerifyingCoupon(false);
        return;
      }

      const q = query(
        collection(db, 'discountCards'),
        where('code', '==', couponCode.trim())
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setCouponError('Invalid coupon code');
        setVerifyingCoupon(false);
        return;
      }

      const couponData = querySnapshot.docs[0].data();

      if (!couponData.isActive) {
        setCouponError('This coupon is no longer active');
        setVerifyingCoupon(false);
        return;
      }

      // Check expiry if it exists
      if (couponData.expiryDate) {
        const expiry = couponData.expiryDate.toDate ? couponData.expiryDate.toDate() : new Date(couponData.expiryDate);
        if (expiry < new Date()) {
          setCouponError('This coupon has expired');
          setVerifyingCoupon(false);
          return;
        }
      }

      setDiscountPercentage(couponData.discountPercentage);
      setIsCouponApplied(true);
      setCouponError('');

    } catch (error) {
      console.error('Error verifying coupon:', error);
      setCouponError('Error verifying coupon');
    } finally {
      setVerifyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setDiscountPercentage(0);
    setIsCouponApplied(false);
    setCouponError('');
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // addLog removed as debugLog is unused
  const addLog = (_msg: string) => {};

  const handleCreateCampaign = async () => {
    // NON-BLOCKING LOGGING
    addLog("Button clicked - Handler Started");

    // Check dependencies immediately
    addLog(`Storage available: ${!!storage}`);
    addLog(`Auth available: ${!!auth}`);
    addLog(`User: ${auth?.currentUser?.uid || 'None'}`);
    addLog(`File: ${uploadedFile?.name || 'None'}`);

    if (!storage) {
        addLog("CRITICAL ERROR: Firebase Storage is not initialized!");
        return;
    }

    if (!uploadedFile) {
        addLog("Error: No file selected");
        return;
    }
    if (!auth?.currentUser) {
        addLog("Error: No user logged in");
        return;
    }

    setIsSubmitting(true);
    try {
      addLog("Starting upload process...");
      const storagePath = `campaigns/${auth?.currentUser?.uid || 'anonymous'}/${Date.now()}_${uploadedFile.name}`;
      addLog(`Target Path: ${storagePath}`);

      const fileRef = ref(storage, storagePath);
      addLog("Storage Ref created");

      addLog("Uploading bytes...");
      await uploadBytes(fileRef, uploadedFile);
      addLog("Upload complete!");

      addLog("Getting download URL...");
      const downloadUrl = await getDownloadURL(fileRef);
      addLog("Got download URL");

      const campaignData = {
        advertiserId: auth?.currentUser?.uid || 'anonymous',
        createdAt: serverTimestamp(),
        status: 'pending',
        pincodes,
        specialities,
        placements: selectedPlacementIds,
        viewBundle: selectedBundle,
        adType,
        creativeUrl: downloadUrl,
        creativeType: uploadedFile.type,
        totalAmount,
        couponCode: isCouponApplied ? couponCode : null,
        discountAmount: isCouponApplied ? (totalAmount * discountPercentage / 100) : 0,
        stats: {
          impressions: 0,
          clicks: 0
        }
      };

      addLog("Saving to Firestore...");
      if (!db) throw new Error("Firestore not initialized");
      await addDoc(collection(db, 'advertiser_campaigns'), campaignData);
      addLog("Saved to DB! SUCCESS!");

      // Only alert on success
      alert("Campaign Created Successfully!");

      // Short delay to see the success message
      setTimeout(() => {
        onBack();
      }, 2000);

    } catch (error: any) {
      console.error("Error creating campaign:", error);
      addLog(`EXCEPTION: ${error.message || JSON.stringify(error)}`);
      alert(`Error: ${error.message}`);
    } finally {
      // Keep isSubmitting true if successful so user can't double click while redirecting
      // Only set false on error
      // But for now, let's leave it to ensure UI updates
      // setIsSubmitting(false);
    }
  };

  // Calculate Audience Stats
  const calculateStats = async () => {
    setLoadingStats(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    let baseDoctors = 0;

    if (pincodes.length > 0) {
      baseDoctors += pincodes.length * 12;
    }

    if (specialities.length > 0) {
      if (baseDoctors > 0) {
        baseDoctors = Math.floor(baseDoctors * 0.4);
      } else {
        baseDoctors = specialities.length * 50;
      }
    }

    if (pincodes.length === 0 && specialities.length === 0) {
      baseDoctors = 5000;
    }

    const mockReach = baseDoctors * 25;

    setStats({
      doctorCount: baseDoctors,
      dailyPatientReach: mockReach
    });
    setLoadingStats(false);
  };

  useEffect(() => {
    calculateStats();
  }, [pincodes, specialities]);

  // Calculate Queue & Availability when Placement changes
  useEffect(() => {
    if (selectedPlacementIds.length > 0 && step === 3) {
      let maxWaitDays = 0;
      let maxPosition = 0;
      let busyCount = 0;
      let totalProgress = 0;

      selectedPlacementIds.forEach(id => {
        const placement = AD_PLACEMENTS.find(p => p.id === id);
        const isBusy = placement?.demand === 'high' || (placement?.demand === 'medium' && Math.random() > 0.5);

        if (isBusy) {
          busyCount++;
          const currentViews = Math.floor(Math.random() * 9000);
          const targetViews = 10000;
          const remainingViews = targetViews - currentViews;
          const reach = stats.dailyPatientReach || 100;
          const daysToFinish = Math.ceil(remainingViews / reach);
          const totalWait = daysToFinish + 3;

          if (totalWait > maxWaitDays) maxWaitDays = totalWait;
          const pos = Math.floor(Math.random() * 5) + 1;
          if (pos > maxPosition) maxPosition = pos;
          totalProgress += (currentViews / targetViews) * 100;
        } else {
          if (3 > maxWaitDays) maxWaitDays = 3; // Minimum 3 days
        }
      });

      const avgProgress = busyCount > 0 ? totalProgress / busyCount : 0;

      if (busyCount === selectedPlacementIds.length) {
        // All busy
        setQueueInfo({
          status: 'busy',
          position: maxPosition,
          estDays: maxWaitDays,
          currentAdProgress: avgProgress,
          details: 'All selected slots have a queue'
        });
      } else if (busyCount > 0) {
        // Mixed
        setQueueInfo({
          status: 'mixed',
          position: maxPosition,
          estDays: maxWaitDays,
          currentAdProgress: avgProgress,
          details: `${busyCount} of ${selectedPlacementIds.length} slots have a queue`
        });
      } else {
        // All available
        setQueueInfo({
          status: 'available',
          position: 0,
          estDays: 3,
          currentAdProgress: 0,
          details: 'All slots available'
        });
      }
    }
  }, [selectedPlacementIds, step, stats.dailyPatientReach]);

  // Calculate Price
  useEffect(() => {
    if (selectedPlacementIds.length > 0 && step === 3) {
      // Calculate Average Base Price of selected placements
      const selectedPlacements = AD_PLACEMENTS.filter(p => selectedPlacementIds.includes(p.id));
      const avgBasePrice = selectedPlacements.reduce((sum, p) => sum + p.basePrice, 0) / selectedPlacements.length;

      // Formula: (Bundle / 1000) * AvgBasePrice * (VideoMultiplier)
      const bundleMultiplier = selectedBundle / 1000;
      const typeMultiplier = adType === 'video' ? 2 : 1;

      const price = avgBasePrice * bundleMultiplier * typeMultiplier;
      setTotalAmount(Math.round(price)); // Round to nearest integer
    }
  }, [selectedPlacementIds, selectedBundle, adType, step]);

  const togglePlacement = (id: string) => {
    if (selectedPlacementIds.includes(id)) {
      setSelectedPlacementIds(selectedPlacementIds.filter(p => p !== id));
    } else {
      setSelectedPlacementIds([...selectedPlacementIds, id]);
    }
  };

  const toggleAllPlacements = () => {
    if (selectedPlacementIds.length === AD_PLACEMENTS.length) {
      setSelectedPlacementIds([]);
    } else {
      setSelectedPlacementIds(AD_PLACEMENTS.map(p => p.id));
    }
  };

  const addPincode = () => {
    if (pincodeInput && !pincodes.includes(pincodeInput)) {
      setPincodes([...pincodes, pincodeInput]);
      setPincodeInput('');
    }
  };

  const addSpeciality = () => {
    if (specialityInput && !specialities.includes(specialityInput)) {
      setSpecialities([...specialities, specialityInput]);
      setSpecialityInput('');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeFile = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      {/* Modals */}
      <SelectionModal
        isOpen={showPincodeModal}
        onClose={() => setShowPincodeModal(false)}
        title="Available Pincodes"
        items={SAMPLE_PINCODES}
        selectedItems={pincodes}
        onSelect={(item) => {
          if (!pincodes.includes(item)) setPincodes([...pincodes, item]);
        }}
      />
      <SelectionModal
        isOpen={showSpecialtyModal}
        onClose={() => setShowSpecialtyModal(false)}
        title="Available Specialties"
        items={COMMON_SPECIALTIES}
        selectedItems={specialities}
        onSelect={(item) => {
          if (!specialities.includes(item)) setSpecialities([...specialities, item]);
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Create New Campaign</h2>
          <div className="flex items-center gap-2 text-sm mt-1 overflow-x-auto">
            <span className={step >= 1 ? "text-emerald-500 font-medium whitespace-nowrap" : "text-zinc-500 whitespace-nowrap"}>1. Location</span>
            <span className="text-zinc-600">/</span>
            <span className={step >= 2 ? "text-emerald-500 font-medium whitespace-nowrap" : "text-zinc-500 whitespace-nowrap"}>2. Specialty</span>
            <span className="text-zinc-600">/</span>
            <span className={step >= 3 ? "text-emerald-500 font-medium whitespace-nowrap" : "text-zinc-500 whitespace-nowrap"}>3. Placement</span>
            <span className="text-zinc-600">/</span>
            <span className={step >= 4 ? "text-emerald-500 font-medium whitespace-nowrap" : "text-zinc-500 whitespace-nowrap"}>4. Upload & Pay</span>
          </div>
        </div>
        <button onClick={onBack} className="text-zinc-400 hover:text-white">
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Main Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* STEP 1: PINCODES */}
          {step === 1 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-in slide-in-from-left-4 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <MapPin className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Select Target Locations</h3>
                    <p className="text-sm text-zinc-400">Choose pincodes where you want your ad to appear</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPincodeModal(true)}
                  className="text-sm text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
                >
                  <List className="w-4 h-4" />
                  Browse List
                </button>
              </div>

              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={pincodeInput}
                  onChange={(e) => setPincodeInput(e.target.value)}
                  placeholder="Enter Pincode (e.g. 400001)"
                  className="flex-1 bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && addPincode()}
                />
                <button
                  onClick={addPincode}
                  className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors font-medium"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[100px] content-start bg-black/30 p-4 rounded-lg border border-zinc-800/50">
                {pincodes.map(pin => (
                  <span key={pin} className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-800 rounded-full text-sm text-zinc-300 border border-zinc-700 animate-in zoom-in duration-200">
                    {pin}
                    <button onClick={() => setPincodes(pincodes.filter(p => p !== pin))} className="hover:text-red-400 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {pincodes.length === 0 && (
                  <span className="text-zinc-500 text-sm italic w-full text-center py-8">No locations selected yet. Add pincodes to see audience reach.</span>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: SPECIALTIES */}
          {step === 2 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Stethoscope className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Select Medical Specialties</h3>
                    <p className="text-sm text-zinc-400">Target specific types of doctors</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSpecialtyModal(true)}
                  className="text-sm text-blue-500 hover:text-blue-400 flex items-center gap-1"
                >
                  <List className="w-4 h-4" />
                  Browse List
                </button>
              </div>

              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={specialityInput}
                  onChange={(e) => setSpecialityInput(e.target.value)}
                  placeholder="Enter Specialty (e.g. Cardiologist)"
                  className="flex-1 bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && addSpeciality()}
                />
                <button
                  onClick={addSpeciality}
                  className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors font-medium"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[100px] content-start bg-black/30 p-4 rounded-lg border border-zinc-800/50">
                {specialities.map(spec => (
                  <span key={spec} className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-800 rounded-full text-sm text-zinc-300 border border-zinc-700 animate-in zoom-in duration-200">
                    {spec}
                    <button onClick={() => setSpecialities(specialities.filter(s => s !== spec))} className="hover:text-red-400 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {specialities.length === 0 && (
                  <span className="text-zinc-500 text-sm italic w-full text-center py-8">No specialties selected. Campaign will target all doctors in selected locations.</span>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: PLACEMENT & BUNDLE */}
          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">

              {/* 1. Select Placement */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-emerald-500" />
                    1. Select Ad Placement
                  </h3>
                  <button
                    onClick={toggleAllPlacements}
                    className="text-sm text-emerald-500 hover:text-emerald-400 font-medium"
                  >
                    {selectedPlacementIds.length === AD_PLACEMENTS.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AD_PLACEMENTS.map(placement => (
                    <div
                      key={placement.id}
                      onClick={() => togglePlacement(placement.id)}
                      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedPlacementIds.includes(placement.id)
                          ? 'bg-emerald-500/10 border-emerald-500'
                          : 'bg-black border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-white text-sm">{placement.name}</span>
                        {selectedPlacementIds.includes(placement.id) && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={`text-[10px] border-zinc-700 ${
                          placement.demand === 'high' ? 'text-red-400' :
                          placement.demand === 'medium' ? 'text-yellow-400' : 'text-emerald-400'
                        }`}>
                          {placement.demand.toUpperCase()} DEMAND
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Select Bundle */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  2. Select View Bundle
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {VIEW_BUNDLES.map(bundle => (
                    <button
                      key={bundle.value}
                      onClick={() => setSelectedBundle(bundle.value)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        selectedBundle === bundle.value
                          ? 'bg-blue-500/20 border-blue-500 text-white'
                          : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-lg font-bold">{bundle.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Select Format */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <MonitorPlay className="w-5 h-5 text-purple-500" />
                  3. Select Ad Format
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    adType === 'static' ? 'bg-purple-500/10 border-purple-500' : 'bg-black border-zinc-800 hover:border-zinc-700'
                  }`}>
                    <input
                      type="radio"
                      name="adType"
                      checked={adType === 'static'}
                      onChange={() => setAdType('static')}
                      className="w-5 h-5 border-zinc-600 text-purple-500 focus:ring-purple-500 bg-zinc-900"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <ImageIcon className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-white">Static Image</span>
                      </div>
                      <p className="text-xs text-zinc-400">Standard display banner</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    adType === 'video' ? 'bg-purple-500/10 border-purple-500' : 'bg-black border-zinc-800 hover:border-zinc-700'
                  }`}>
                    <input
                      type="radio"
                      name="adType"
                      checked={adType === 'video'}
                      onChange={() => setAdType('video')}
                      className="w-5 h-5 border-zinc-600 text-purple-500 focus:ring-purple-500 bg-zinc-900"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MonitorPlay className="w-4 h-4 text-purple-400" />
                        <span className="font-medium text-white">Video Ad</span>
                      </div>
                      <p className="text-xs text-zinc-400">Premium video placement (2x Cost)</p>
                    </div>
                  </label>
                </div>
              </div>

            </div>
          )}

          {/* STEP 4: UPLOAD & PAY */}
          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">

              {/* Upload Area */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-emerald-500" />
                  Upload Creative
                </h3>

                {!uploadedFile ? (
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                      isDragging
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-zinc-700 hover:border-zinc-600 bg-black/50'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      {adType === 'video' ? (
                        <FileVideo className="w-8 h-8 text-zinc-400" />
                      ) : (
                        <FileImage className="w-8 h-8 text-zinc-400" />
                      )}
                    </div>
                    <h4 className="text-lg font-medium text-white mb-2">
                      Drag & drop your {adType} here
                    </h4>
                    <p className="text-zinc-400 text-sm mb-6">
                      {adType === 'video'
                        ? 'Supports MP4, MOV (Max 15 seconds)'
                        : 'Supports JPG, PNG (Max 6 seconds duration)'}
                    </p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept={adType === 'video' ? "video/*" : "image/*"}
                      onChange={handleFileSelect}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
                    >
                      Browse Files
                    </button>
                  </div>
                ) : (
                  <div className="bg-black border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-800 rounded-lg">
                          {adType === 'video' ? (
                            <FileVideo className="w-5 h-5 text-purple-400" />
                          ) : (
                            <FileImage className="w-5 h-5 text-blue-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">{uploadedFile.name}</div>
                          <div className="text-zinc-500 text-xs">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                      </div>
                      <button
                        onClick={removeFile}
                        className="p-2 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="relative aspect-video bg-black flex items-center justify-center">
                      {previewUrl && (
                        adType === 'video' ? (
                          <video
                            src={previewUrl}
                            controls
                            className="max-h-[400px] w-full object-contain"
                          />
                        ) : (
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-h-[400px] w-full object-contain"
                          />
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Placeholder */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                  Payment Details
                </h3>

                <div className="bg-black/50 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Secure Payment via Razorpay</h4>
                    <p className="text-zinc-400 text-sm">You will be redirected to complete the payment securely.</p>
                  </div>

                  {/* Coupon Input */}
                  <div className="w-full max-w-xs">
                    {!isCouponApplied ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="Enter Coupon Code"
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={verifyCoupon}
                          disabled={verifyingCoupon || !couponCode}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {verifyingCoupon ? '...' : 'Apply'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-500 text-sm font-medium">{couponCode} Applied</span>
                        </div>
                        <button
                          onClick={removeCoupon}
                          className="text-zinc-500 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {couponError && (
                      <p className="text-red-500 text-xs text-left mt-1 ml-1">{couponError}</p>
                    )}
                  </div>

                  <div className="w-full max-w-xs bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-zinc-400">Subtotal</span>
                      <span className="text-white">₹{totalAmount.toLocaleString()}</span>
                    </div>

                    {isCouponApplied && (
                      <div className="flex justify-between text-sm mb-2 text-emerald-500">
                        <span>Discount ({discountPercentage}%)</span>
                        <span>-₹{((totalAmount * discountPercentage) / 100).toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-zinc-400">GST (18%)</span>
                      <span className="text-white">
                        ₹{((totalAmount - (isCouponApplied ? (totalAmount * discountPercentage) / 100 : 0)) * 0.18).toLocaleString()}
                      </span>
                    </div>

                    <div className="border-t border-zinc-700/50 my-2 pt-2 flex justify-between font-bold">
                      <span className="text-white">Total</span>
                      <span className="text-emerald-400">
                        ₹{((totalAmount - (isCouponApplied ? (totalAmount * discountPercentage) / 100 : 0)) * 1.18).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Right Column: The "Pivot Table" / Estimator */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-white mb-6">Campaign Summary</h3>

            <div className="space-y-6">
              {/* Doctor Count */}
              <div className="bg-black/50 rounded-lg p-4 border border-zinc-800">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-emerald-500" />
                  <span className="text-zinc-400 text-sm">Target Doctors</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  {loadingStats ? '...' : stats.doctorCount}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Doctors matching your criteria
                </div>
              </div>

              {/* Patient Reach */}
              <div className="bg-black/50 rounded-lg p-4 border border-zinc-800">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  <span className="text-zinc-400 text-sm">Est. Daily Views</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  {loadingStats ? '...' : stats.dailyPatientReach.toLocaleString()}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Based on average daily footfall
                </div>
              </div>

              {/* Step 3 & 4 Specific Stats: Queue & Price */}
              {step >= 3 && selectedPlacementIds.length > 0 && (
                <>
                  {/* Queue Status */}
                  <div className={`rounded-lg p-4 border animate-in fade-in ${
                    queueInfo.status === 'busy'
                      ? 'bg-orange-900/10 border-orange-500/30'
                      : queueInfo.status === 'mixed'
                      ? 'bg-yellow-900/10 border-yellow-500/30'
                      : 'bg-emerald-900/10 border-emerald-500/30'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className={`w-5 h-5 ${
                        queueInfo.status === 'busy' ? 'text-orange-500' :
                        queueInfo.status === 'mixed' ? 'text-yellow-500' : 'text-emerald-500'
                      }`} />
                      <span className="text-zinc-400 text-sm">Availability Status</span>
                    </div>

                    {queueInfo.status === 'busy' || queueInfo.status === 'mixed' ? (
                      <>
                        <div className={`text-lg font-bold mb-1 ${
                          queueInfo.status === 'busy' ? 'text-orange-400' : 'text-yellow-400'
                        }`}>
                          {queueInfo.status === 'busy' ? 'High Demand' : 'Partial Availability'}
                        </div>
                        <div className="w-full bg-zinc-800 h-1.5 rounded-full mb-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              queueInfo.status === 'busy' ? 'bg-orange-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${queueInfo.currentAdProgress}%` }}
                          />
                        </div>
                        <div className="text-xs text-zinc-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {queueInfo.details}. Max wait: {queueInfo.estDays} days
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-lg font-bold text-emerald-400">
                          Available Now
                        </div>
                        <div className="text-xs text-zinc-400 mt-1">
                          Standard 3-day verification applies
                        </div>
                      </>
                    )}
                  </div>

                  {/* Estimated Start Date */}
                  <div className="bg-black/50 rounded-lg p-4 border border-zinc-800 animate-in fade-in">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-5 h-5 text-zinc-400" />
                      <span className="text-zinc-400 text-sm">Est. Start Date</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                      {new Date(Date.now() + (queueInfo.estDays * 24 * 60 * 60 * 1000)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    {queueInfo.status === 'mixed' && (
                      <div className="text-xs text-zinc-500 mt-1">
                        Some placements may start sooner
                      </div>
                    )}
                  </div>

                  {/* Total Price */}
                  <div className="bg-emerald-900/20 rounded-lg p-4 border border-emerald-500/30 animate-in fade-in">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-emerald-400 text-sm font-medium">Total Amount</span>
                    </div>
                    <div className="text-3xl font-bold text-emerald-400">
                      ₹{totalAmount.toLocaleString()}
                    </div>
                    <div className="text-xs text-emerald-500/60 mt-1">
                      {selectedBundle/1000}k Views • {adType === 'video' ? 'Video' : 'Static'} • {selectedPlacementIds.length} Placements
                    </div>
                  </div>
                </>
              )}

              {/* Navigation Buttons */}
              <div className="pt-4 space-y-3">
                {step < 4 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={
                      loadingStats ||
                      (step === 1 && pincodes.length === 0) ||
                      (step === 3 && selectedPlacementIds.length === 0)
                    }
                  >
                    Next: {step === 1 ? 'Select Specialty' : step === 2 ? 'Select Placement' : 'Upload Creative'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // alert("TEST MODE: Button Clicked Successfully!");
                        handleCreateCampaign();
                      }}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed z-50 relative"
                      disabled={!uploadedFile || isSubmitting}
                    >
                      {isSubmitting ? 'Launching Campaign...' : 'Pay & Launch'}
                      {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                    </button>

                    {/* SUPER VISIBLE DEBUG LOG - COMMENTED OUT FOR NOW
                    <div className="fixed top-0 left-0 w-full h-48 bg-white text-black z-[9999] overflow-y-auto p-4 border-b-4 border-red-600 shadow-2xl opacity-90 pointer-events-none">
                        <h3 className="font-bold text-red-600">DEBUG CONSOLE (Take Screenshot if stuck)</h3>
                        {debugLog.length === 0 && <div className="text-gray-500 italic">Waiting for action...</div>}
                        {debugLog.map((log, i) => (
                          <div key={i} className="border-b border-gray-200 py-1 font-mono text-xs">{log}</div>
                        ))}
                    </div>
                    */}
                  </>
                )}

                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg transition-colors"
                  >
                    Back
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

