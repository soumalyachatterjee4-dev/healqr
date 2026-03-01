import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Mail, User, Calendar, MapPin, ArrowLeft, CheckCircle2, X, QrCode, Stethoscope, Building2 } from 'lucide-react';
import { useState } from 'react';
import healqrLogo from '../assets/healqr-logo.png';
import DoctorTermsConditions from './DoctorTermsConditions';
import DoctorPrivacyPolicy from './DoctorPrivacyPolicy';
import { auth, db } from '../lib/firebase/config';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import { MEDICAL_SPECIALTIES } from '../utils/medicalSpecialties';
import { Badge } from './ui/badge';

interface SignUpProps {
  onNext: (data: { email: string; name: string; dob: string; specialties: string[]; pinCode: string; qrNumber: string; }) => void;
  onBack: () => void;
  onLogin: () => void;
  onNavigateToLanding?: () => void;
  isDemoMode?: boolean;
}

export default function SignUp({ onNext, onBack, onLogin, onNavigateToLanding, isDemoMode }: SignUpProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [qrType, setQrType] = useState<'preprinted' | 'virtual'>('preprinted'); // NEW: QR type selection
  const [qrNumber, setQrNumber] = useState("");
  const [companyName, setCompanyName] = useState(""); // NEW: Company name for pre-printed QR
  const [division, setDivision] = useState(""); // NEW: Division for pre-printed QR
  const [virtualQrGenerated, setVirtualQrGenerated] = useState(false); // NEW: Track if virtual QR is generated
  const [acceptedTerms, setAcceptedTerms] = useState(true); // Pre-checked
  const [acceptedNotifications, setAcceptedNotifications] = useState(true); // Pre-checked
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const handleRegister = async () => {
    // 🆕 CRITICAL: Clear all premium add-ons for fresh signup (Starter Plan Default)
    localStorage.removeItem('healqr_active_addons');
    localStorage.removeItem('healqr_demo_mode_addons');
    console.log('✅ SIGNUP: Cleared all premium add-ons - Starting with Starter Plan');
    // Extra debug: Log QR number entered
    console.log('🟢 SIGNUP: QR entered:', qrNumber);

    // In demo mode, skip all validations
    if (isDemoMode) {
      onNext({
        email: email || 'demo@healqr.com',
        name: name || 'Dr. Demo User',
        dob: dob || '',
        specialties: specialties.length > 0 ? specialties : ['general_medicine'],
        pinCode: pinCode || '',
        qrNumber: 'QR00001'
      });
      return;
    }

    // Validate required fields
    if (!email || !name || !dob || specialties.length === 0 || !pinCode || !landmark || !acceptedTerms) {
      toast.error('Please fill all required fields and select at least one specialty');
      return;
    }

    // QR Number validation based on type
    if (qrType === 'preprinted') {
      if (!companyName) {
        toast.error('Please enter the company name');
        return;
      }
      if (!division) {
        toast.error('Please enter the division');
        return;
      }
      if (!qrNumber) {
        toast.error('Please enter your pre-printed QR number');
        return;
      }
      // Extra: Ensure QR is not a demo QR
      if (qrNumber.toLowerCase().includes('demo') || qrNumber === 'QR00001') {
        toast.error('Please use a valid admin-generated QR code, not a demo QR.');
        return;
      }
    }

    setLoading(true);

    try {
      // Production Mode: Validate Firebase connection
      if (!auth || !db) {
        toast.error('Service Unavailable', {
          description: 'Please try again later'
        });
        setLoading(false);
        return;
      }


      // Handle QR Code validation based on type
      const { collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp } = await import('firebase/firestore');

      let finalQrNumber = qrNumber;
      let qrDocRef = null;
      let qrData = null;

      if (qrType === 'virtual') {
        // Generate Virtual QR from UNIVERSAL POOL - check BOTH collections for true max
        const qrPoolCollection = collection(db, 'qrPool');
        const qrCodesCollection = collection(db, 'qrCodes'); // Old collection

        const [poolQrs, codesQrs] = await Promise.all([
          getDocs(qrPoolCollection),
          getDocs(qrCodesCollection)
        ]);

        // Find highest HQR number across BOTH collections
        let maxNumber = 0;
        // Check qrPool collection
        poolQrs.forEach(doc => {
          const qrNum = doc.data().qrNumber;
          if (qrNum && qrNum.startsWith('HQR')) {
            const num = parseInt(qrNum.replace('HQR', ''));
            if (!isNaN(num) && num > maxNumber) maxNumber = num;
          }
        });
        // Check old qrCodes collection
        codesQrs.forEach(doc => {
          const qrNum = doc.data().qrNumber;
          if (qrNum && qrNum.startsWith('HQR')) {
            const num = parseInt(qrNum.replace('HQR', ''));
            if (!isNaN(num) && num > maxNumber) maxNumber = num;
          }
        });

        // Generate next HQR number in universal sequence
        finalQrNumber = `HQR${String(maxNumber + 1).padStart(5, '0')}`;
        console.log('🟢 Doctor Virtual QR - Max from both collections:', maxNumber, '→ New:', finalQrNumber);

        // Save Virtual QR to qrPool collection (universal pool)
        await addDoc(qrPoolCollection, {
          qrNumber: finalQrNumber,
          doctorEmail: email,
          doctorName: name,
          status: 'blocked',
          createdAt: serverTimestamp(),
          qrType: 'virtual',
          generatedBy: 'self-signup'
        });

        console.log('✅ Virtual QR Generated from Universal Pool:', finalQrNumber);
        toast.success('Virtual QR Generated: ' + finalQrNumber);
        setQrNumber(finalQrNumber);
        setVirtualQrGenerated(true);

      } else {
        // Pre-printed QR: Validate existing QR Code in BOTH collections
        const poolQuery = query(qrPoolCollection, where('qrNumber', '==', qrNumber));
        const codesQuery = query(qrCodesCollection, where('qrNumber', '==', qrNumber));

        const [poolSnapshot, codesSnapshot] = await Promise.all([
          getDocs(poolQuery),
          getDocs(codesQuery)
        ]);

        if (poolSnapshot.empty && codesSnapshot.empty) {
          toast.error('Invalid QR Code', {
            description: 'This QR code does not exist in our system'
          });
          setLoading(false);
          return;
        }

        // Use whichever collection has the QR
        if (!poolSnapshot.empty) {
          qrDocRef = poolSnapshot.docs[0].ref;
          qrData = poolSnapshot.docs[0].data();
        } else {
          qrDocRef = codesSnapshot.docs[0].ref;
          qrData = codesSnapshot.docs[0].data();
        }
      }

      // Prevent reuse for pre-printed QR only (Virtual QR is already blocked on creation)
      if (qrType === 'preprinted' && qrData) {
        if ((qrData.status === 'active' && qrData.linkedEmail) || qrData.status === 'pending') {
          toast.error('QR Code Already Used', {
            description: 'This QR code is already linked to another or pending account'
          });
          setLoading(false);
          return;
        }

        // Set QR status to pending and store email
        await updateDoc(qrDocRef, {
          status: 'pending',
          linkedEmail: email,
          pendingAt: new Date(),
        });
        // Extra debug: Confirm QR set to pending
        console.log('🟢 QR set to pending for email:', email, 'QR:', qrNumber);
      }

      // Prepare signup data
      const signupData = {
        email,
        name,
        dob,
        specialties,
        pinCode,
        landmark,
        qrNumber: finalQrNumber,
        qrType: qrType, // NEW: Store QR type
        companyName: qrType === 'preprinted' ? companyName : '', // NEW: Store company name for pre-printed QR
        division: qrType === 'preprinted' ? division : '', // NEW: Store division for pre-printed QR
        acceptedNotifications
      };

      // Store signup data in localStorage for retrieval after verification
      localStorage.setItem('healqr_pending_signup', JSON.stringify(signupData));
      localStorage.setItem('healqr_email_for_signin', email);

      console.log('✅ Signup data stored in localStorage:', signupData);

      // Firebase Email Link configuration
      // Encode signup data in URL as backup (for cross-browser/session verification)
      const encodedData = btoa(JSON.stringify(signupData));
      const actionCodeSettings = {
        url: `${window.location.origin}/#verify?data=${encodedData}`,
        handleCodeInApp: true,
      };

      // Send sign-in link to email
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);

      setLinkSent(true);
      toast.success('Verification link sent!', {
        description: `Check your inbox at ${email}`,
      });

    } catch (error: any) {
      console.error('❌ Signup error:', error);
      let errorMessage = 'Failed to send verification link.';
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      }
      toast.error('Signup Failed', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToPricing = () => {
    if (onNavigateToLanding) {
      onNavigateToLanding();
      setTimeout(() => {
        const pricingSection = document.getElementById('pricing');
        if (pricingSection) {
          pricingSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    }
  };

  if (linkSent) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl p-8 border border-zinc-800 relative">
          <button
            onClick={onBack}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="bg-black px-4 py-2 rounded-lg">
              <img src={healqrLogo} alt="HealQR" className="h-12" />
            </div>
          </div>

          {/* Success State */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-full mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>

            <h2 className="text-white mb-3">Verification Link Sent!</h2>

            <p className="text-gray-400 text-sm mb-6">
              We've sent a verification link to:
            </p>

            <div className="bg-zinc-800 rounded-lg p-4 mb-6 border border-zinc-700">
              <p className="text-emerald-500">{email}</p>
            </div>

            <div className="space-y-3 text-sm text-gray-300">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                Check your inbox and click the link to verify
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                Your account will be created automatically
              </p>
            </div>

            {/* Post-link actions */}
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <div className="space-y-3">
                <p className="text-sm text-gray-400 text-center">
                  If the link opened in another browser/tab:
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      window.location.href = '/';
                    }}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => setLinkSent(false)}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm font-medium"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Terms & Conditions Modal */}
      {showTerms && (
        <DoctorTermsConditions
          onClose={() => setShowTerms(false)}
          onNavigateToPricing={handleNavigateToPricing}
        />
      )}

      {/* Privacy Policy Modal */}
      {showPrivacy && <DoctorPrivacyPolicy onClose={() => setShowPrivacy(false)} />}

      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
        {/* Header with Logo */}
        <div className="flex items-center mb-12">
          <img src={healqrLogo} alt="HealQR Logo" className="h-10 w-auto" />
        </div>

        {/* Main Card */}
        <div className="bg-zinc-900 rounded-2xl p-8 md:p-12 border border-zinc-800">
          {/* Title */}
          <h1 className="text-center mb-6">Doctor Registration</h1>

          {/* Subtitle */}
          <p className="text-center text-gray-400 mb-8">
            Create your HealQR account to get started.
          </p>

          {/* Name Field */}
          <div className="mb-6">
            <label className="block mb-3">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="pl-12 bg-black border-zinc-800 text-white h-14 rounded-lg focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Email Field */}
          <div className="mb-6">
            <label className="block mb-3">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@example.com"
                className="pl-12 bg-black border-zinc-800 text-white h-14 rounded-lg focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Date of Birth Field */}
          <div className="mb-6">
            <label className="block mb-3">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="pl-12 bg-black border-zinc-800 text-white h-14 rounded-lg focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Specialty Multi-Select - UPDATED FIELD */}
          <div className="mb-6">
            <label className="block mb-3">
              Medical Specialties <span className="text-red-500">*</span>
            </label>

            {/* Selected Specialties Display */}
            {specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                {specialties.map((spec, index) => (
                  <Badge key={index} variant="secondary" className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1">
                    {MEDICAL_SPECIALTIES.find(s => s.id === spec)?.label || spec}
                    <button
                      type="button"
                      onClick={() => setSpecialties(specialties.filter((_, i) => i !== index))}
                      className="ml-2 hover:text-red-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Preset Specialties Dropdown */}
            <div className="relative mb-3">
              <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !specialties.includes(value)) {
                    setSpecialties([...specialties, value]);
                  }
                }}
              >
                <SelectTrigger className="pl-12 bg-black border-zinc-800 text-white h-14 rounded-lg focus:border-emerald-500">
                  <SelectValue placeholder="Select from preset specialties" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 max-h-[300px]">
                  {MEDICAL_SPECIALTIES.filter(spec => !specialties.includes(spec.id)).map((spec) => (
                    <SelectItem
                      key={spec.id}
                      value={spec.id}
                      className="text-white hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer"
                    >
                      {spec.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Specialty Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  value={customSpecialty}
                  onChange={(e) => setCustomSpecialty(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (customSpecialty.trim() && !specialties.includes(customSpecialty.trim())) {
                        setSpecialties([...specialties, customSpecialty.trim()]);
                        setCustomSpecialty('');
                      }
                    }
                  }}
                  placeholder="Or type custom specialty (e.g., 'Sports Medicine')"
                  className="bg-black border-zinc-800 text-white h-14 rounded-lg focus:border-emerald-500"
                />
              </div>
              <Button
                type="button"
                onClick={() => {
                  if (customSpecialty.trim() && !specialties.includes(customSpecialty.trim())) {
                    setSpecialties([...specialties, customSpecialty.trim()]);
                    setCustomSpecialty('');
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-14 px-6 rounded-lg"
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Select multiple specialties or add custom ones. Example: "General Medicine" + "Pediatrics"
            </p>
          </div>

          {/* Residential Pin Code Field */}
          <div className="mb-6">
            <label className="block mb-3">
              Residential Pin Code <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="Enter your pin code"
                className="pl-12 bg-black border-zinc-800 text-white h-14 rounded-lg focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Clinic Landmark Field */}
          <div className="mb-6">
            <label className="block mb-3">
              Clinic Landmark <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g., Near City Hospital / Opp. Post Office"
                className="pl-12 bg-black border-zinc-800 text-white h-14 rounded-lg focus:border-emerald-500"
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Helps patients find your clinic easily
            </p>
          </div>

          {/* QR Type Selection - NEW */}
          <div className="mb-6">
            <label className="block mb-3">
              QR Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setQrType('preprinted');
                  setQrNumber('');
                  setVirtualQrGenerated(false);
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  qrType === 'preprinted'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-800 bg-black hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <QrCode className={`w-6 h-6 ${qrType === 'preprinted' ? 'text-emerald-400' : 'text-gray-400'}`} />
                  <span className={`font-semibold ${qrType === 'preprinted' ? 'text-emerald-400' : 'text-gray-400'}`}>
                    Pre-Printed QR
                  </span>
                  <span className="text-xs text-gray-500 text-center">
                    Admin-generated QR from MR
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQrType('virtual');
                  setQrNumber('');
                  setVirtualQrGenerated(false);
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  qrType === 'virtual'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-800 bg-black hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Stethoscope className={`w-6 h-6 ${qrType === 'virtual' ? 'text-emerald-400' : 'text-gray-400'}`} />
                  <span className={`font-semibold ${qrType === 'virtual' ? 'text-emerald-400' : 'text-gray-400'}`}>
                    Virtual QR
                  </span>
                  <span className="text-xs text-gray-500 text-center">
                    Self-signup, auto-generated
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* QR Number Field - Conditional based on QR Type */}
          {qrType === 'preprinted' && (
            <>
              <div className="mb-6">
                <label className="block mb-3">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name (e.g., ABC Pharmaceuticals)"
                    className="pl-12 bg-black border-zinc-800 text-white h-14 rounded-lg focus:border-emerald-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Company/Organization that provided the QR standee
                </p>
              </div>

              <div className="mb-6">
                <label className="block mb-3">
                  Division <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    placeholder="Enter division (e.g., North Division)"
                    className="pl-12 bg-black border-zinc-800 text-white h-14 rounded-lg focus:border-emerald-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Specific division or branch of the company
                </p>
              </div>

              <div className="mb-8">
                <label className="block mb-3">
                  QR Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    value={qrNumber}
                    onChange={(e) => setQrNumber(e.target.value.toUpperCase())}
                    placeholder="HQR0001"
                    className="pl-12 bg-black border-zinc-800 text-white h-14 rounded-lg focus:border-emerald-500 font-mono"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Enter the QR number from your printed QR standee (e.g., HQR0001, provided by your MR representative)
                </p>
              </div>
            </>
          )}

          {/* Virtual QR Display - After Generation */}
          {qrType === 'virtual' && virtualQrGenerated && qrNumber && (
            <div className="mb-8">
              <label className="block mb-3">
                Your Virtual QR Number
              </label>
              <div className="relative">
                <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <QrCode className="w-6 h-6 text-emerald-400" />
                      <span className="text-2xl font-bold text-emerald-400 font-mono">{qrNumber}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(qrNumber);
                        alert('Virtual QR number copied to clipboard!');
                      }}
                      className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    ⚠️ Save this number! This Virtual QR is permanently linked to your account.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Virtual QR Info - Before Generation */}
          {qrType === 'virtual' && !virtualQrGenerated && (
            <div className="mb-8">
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Stethoscope className="w-5 h-5 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-300 font-semibold mb-1">Virtual QR Self-Signup</p>
                    <p className="text-xs text-gray-500">
                      A unique Virtual QR number will be automatically generated for you during signup.
                      This number will be permanently linked to your account and cannot be reused.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Terms & Conditions Checkbox */}
          <div className="mb-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked: any) => setAcceptedTerms(checked as boolean)}
                className="mt-0.5 border-zinc-700 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 flex-shrink-0"
              />
              <label htmlFor="terms" className="text-gray-300 cursor-pointer leading-relaxed">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTerms(true);
                  }}
                  className="text-emerald-500 hover:text-emerald-400 transition-colors underline"
                >
                  Terms & Conditions
                </button>
                {' '}and{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPrivacy(true);
                  }}
                  className="text-emerald-500 hover:text-emerald-400 transition-colors underline"
                >
                  Privacy Policy
                </button>
              </label>
            </div>
          </div>

          {/* Notification Permission Checkbox */}
          <div className="mb-8">
            <div className="flex items-start gap-3">
              <Checkbox
                id="notifications"
                checked={acceptedNotifications}
                onCheckedChange={(checked: any) => setAcceptedNotifications(checked as boolean)}
                className="mt-0.5 border-zinc-700 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 flex-shrink-0"
              />
              <label htmlFor="notifications" className="text-gray-300 cursor-pointer leading-relaxed">
                I agree to receive booking alerts and appointment notifications from HealQR
              </label>
            </div>
          </div>

          {/* Register Button */}
          <Button
            onClick={handleRegister}
            disabled={
              !email ||
              !name ||
              !dob ||
              !pinCode ||
              specialties.length === 0 ||
              (qrType === 'preprinted' && !qrNumber) ||
              !acceptedTerms ||
              loading
            }
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-14 rounded-lg mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Sending Link...
              </>
            ) : (
              'Create Account'
            )}
          </Button>

          {/* Back Button */}
          <div className="text-center">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>

        {/* Already have an account */}
        <div className="text-center mt-6">
          <p className="text-gray-400">
            Already have an account?{' '}
            <button
              onClick={onLogin}
              className="text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              log in
            </button>
          </p>
        </div>
        </div>
      </div>
    </>
  );
}
