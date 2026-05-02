import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Mail, Building2, MapPin, ArrowLeft, CheckCircle2, X, QrCode, Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import healqrLogo from '../assets/healqr.logo.png';
import { auth, db } from '../lib/firebase/config';
import { sendSignInLinkToEmail, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import { getStateFromPincode } from '../utils/pincodeMapping';
import { formatQR } from '../utils/qrNumber';

interface PharmaCompanyMatch {
  id: string;
  companyName: string;
  division: string;
  territoryStates: string[];
}

interface ClinicSignUpProps {
  onNext?: (data: any) => void; // Optional for now as we might redirect
  onBack: () => void;
  onLogin: () => void;
}

export default function ClinicSignUp({ onBack, onLogin }: ClinicSignUpProps) {
  const [email, setEmail] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [address, setAddress] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [qrType, setQrType] = useState<'preprinted' | 'virtual'>('preprinted');
  const [qrNumber, setQrNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [division, setDivision] = useState("");

  // Company lookup state
  const [companyMatches, setCompanyMatches] = useState<PharmaCompanyMatch[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<PharmaCompanyMatch | null>(null);
  const [companyLookupDone, setCompanyLookupDone] = useState(false);
  const [companyLookupLoading, setCompanyLookupLoading] = useState(false);
  const [availableDivisions, setAvailableDivisions] = useState<PharmaCompanyMatch[]>([]);
  const [territoryValid, setTerritoryValid] = useState<boolean | null>(null);

  // Location landmark for geocoding
  const [newLocationLandmark, setNewLocationLandmark] = useState('');
  const [virtualQrGenerated, setVirtualQrGenerated] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  // Company lookup function
  const lookupCompany = async (name: string) => {
    if (!name.trim() || !db) return;
    setCompanyLookupLoading(true);
    setCompanyLookupDone(false);
    setSelectedCompany(null);
    setAvailableDivisions([]);
    setDivision('');
    setTerritoryValid(null);
    try {
      const pharmaRef = collection(db, 'pharmaCompanies');
      const snap = await getDocs(pharmaRef);
      const matches: PharmaCompanyMatch[] = [];
      const searchLower = name.trim().toLowerCase();
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.status === 'active' && data.companyName?.toLowerCase().includes(searchLower)) {
          matches.push({
            id: d.id,
            companyName: data.companyName,
            division: data.division || '',
            territoryStates: data.territoryStates || [],
          });
        }
      });
      setCompanyMatches(matches);
      setCompanyLookupDone(true);
      if (matches.length === 0) {
        toast.error('Company not found. Ask your distributor to sign up at HealQR Distributor portal first.');
      } else {
        const companyGroups = matches.filter(m => m.companyName.toLowerCase() === searchLower);
        if (companyGroups.length > 0) {
          setCompanyName(companyGroups[0].companyName);
          setAvailableDivisions(companyGroups);
          if (companyGroups.length === 1) {
            setDivision(companyGroups[0].division);
            setSelectedCompany(companyGroups[0]);
          }
        } else {
          setAvailableDivisions(matches);
        }
      }
    } catch (err) {
      console.error('Company lookup error:', err);
    } finally {
      setCompanyLookupLoading(false);
    }
  };

  // Validate territory when pincode changes and company is selected
  const validateTerritory = (pin: string, company: PharmaCompanyMatch | null) => {
    if (!pin || pin.length !== 6 || !company) {
      setTerritoryValid(null);
      return;
    }
    const state = getStateFromPincode(pin);
    if (state === 'Unknown') {
      setTerritoryValid(null);
      return;
    }
    const isValid = company.territoryStates.includes(state);
    setTerritoryValid(isValid);
    if (!isValid) {
      toast.error(`This company/division does not cover ${state}. Contact your distributor.`);
    }
  };

  const handleRegister = async () => {
    // Validate required fields
    if (!email || !clinicName || !address || !pinCode || !newLocationLandmark || !acceptedTerms) {
      toast.error('Please fill all required fields');
      return;
    }

    if (qrType === 'preprinted') {
      if (!selectedCompany) {
        toast.error('Please verify the company name first');
        return;
      }
      if (!division) {
        toast.error('Please select a division');
        return;
      }
      if (territoryValid === false) {
        toast.error('Your pincode is not in this company\'s territory');
        return;
      }
      if (!qrNumber) {
        toast.error('Please enter your pre-printed QR number');
        return;
      }
    }

    setLoading(true);

    try {
      const { collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp } = await import('firebase/firestore');
      let finalQrNumber = qrNumber;
      let qrDocRef = null;
      let qrData = null;
      const qrPoolCollection = collection(db, 'qrPool');
      const qrCodesCollection = collection(db, 'qrCodes'); // Old collection

      if (qrType === 'virtual') {
        // Generate Virtual QR from UNIVERSAL POOL - check BOTH collections for true max
        const [poolQrs, codesQrs] = await Promise.all([
          getDocs(qrPoolCollection),
          getDocs(qrCodesCollection)
        ]);

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

        finalQrNumber = formatQR(maxNumber + 1);
        // Save Virtual QR to qrPool collection
        await addDoc(qrPoolCollection, {
          qrNumber: finalQrNumber,
          clinicEmail: email,
          clinicName: clinicName,
          status: 'blocked',
          createdAt: serverTimestamp(),
          qrType: 'virtual',
          generatedBy: 'clinic-signup'
        });
        setQrNumber(finalQrNumber);
        setVirtualQrGenerated(true);
        toast.success('Virtual QR Generated: ' + finalQrNumber);
      } else {
        // Pre-printed QR: Validate existing QR Code in BOTH collections
        const poolQuery = query(qrPoolCollection, where('qrNumber', '==', qrNumber));
        const codesQuery = query(qrCodesCollection, where('qrNumber', '==', qrNumber));

        const [poolSnapshot, codesSnapshot] = await Promise.all([
          getDocs(poolQuery),
          getDocs(codesQuery)
        ]);

        if (poolSnapshot.empty && codesSnapshot.empty) {
          toast.error('Invalid QR Code', { description: 'This QR code does not exist in the universal pool.' });
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

      // Prevent reuse for pre-printed QR only
      if (qrType === 'preprinted' && qrData) {
        if ((qrData.status === 'active' && qrData.linkedEmail) || qrData.status === 'pending') {
          toast.error('QR Code Already Used', { description: 'This QR code is already linked to another or pending account' });
          setLoading(false);
          return;
        }
        // Set QR status to pending and store email
        await updateDoc(qrDocRef, {
          status: 'pending',
          linkedEmail: email,
          pendingAt: new Date(),
        });
      }

      // Prepare signup data
      const signupData = {
        type: 'clinic',
        email,
        name: clinicName,
        clinicName,
        address,
        pinCode,
        state: getStateFromPincode(pinCode), // Auto-derived from pincode — locked field
        qrNumber: finalQrNumber,
        qrType: qrType,
        companyName: qrType === 'preprinted' ? companyName.trim() : '',
        division: qrType === 'preprinted' ? division.trim() : '',
        locations: [{ id: '001', name: newLocationLandmark.trim(), landmark: newLocationLandmark.trim() }],
      };
      localStorage.setItem('healqr_pending_clinic_signup', JSON.stringify(signupData));
      localStorage.setItem('healqr_email_for_signin', email);

      // Send Magic Link
      const encodedData = btoa(JSON.stringify(signupData));
      const actionCodeSettings = {
        url: `${window.location.origin}/verify-email?type=clinic&data=${encodedData}`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      setLinkSent(true);
      toast.success('Verification Link Sent', { description: 'Check your email to complete registration.' });
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error('Registration Failed', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (linkSent) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="h-20 w-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
            <Mail className="h-10 w-10 text-blue-500" />
          </div>
          <h2 className="text-3xl font-bold">Check your inbox</h2>
          <p className="text-gray-400">
            We've sent a verification link to <span className="text-white font-medium">{email}</span>
          </p>
          <Button variant="outline" onClick={onBack} className="w-full border-zinc-800 text-white hover:bg-zinc-900">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header with Logo */}
        <div className="flex items-center mb-12">
          <img src={healqrLogo} alt="HealQR Logo" className="h-10 w-auto" />
        </div>

        {/* Main Card */}
        <div className="bg-zinc-900 rounded-2xl p-8 md:p-12 border border-zinc-800">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Clinic Registration</h1>
            <p className="text-gray-400">Create your multi-doctor clinic account</p>
          </div>

          {/* Clinic Name */}
          <div className="mb-6">
            <label className="block mb-3">
              Clinic Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="pl-12 bg-black border-zinc-800 text-white h-14 rounded-lg focus:border-blue-500"
                placeholder="e.g. City Care Clinic"
              />
            </div>
          </div>

          {/* Email */}
          <div className="mb-6">
            <label className="block mb-3">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 bg-black border-zinc-800 text-white h-14 rounded-lg focus:border-blue-500"
                placeholder="clinic@example.com"
                type="email"
              />
            </div>
          </div>

          {/* Address */}
          <div className="mb-6">
            <label className="block mb-3">
              Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="pl-12 bg-black border-zinc-800 text-white h-14 rounded-lg focus:border-blue-500"
                placeholder="e.g. 123 Main St, Suite 100"
              />
            </div>
          </div>

          {/* Pincode */}
          <div className="mb-6">
            <label className="block mb-3">
              Pincode <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={pinCode}
                onChange={(e) => {
                  setPinCode(e.target.value);
                  if (e.target.value.length === 6 && selectedCompany) {
                    validateTerritory(e.target.value, selectedCompany);
                  }
                }}
                className="pl-12 bg-black border-zinc-800 text-white h-14 rounded-lg focus:border-blue-500"
                placeholder="e.g. 700001"
              />
            </div>
            {pinCode.length === 6 && getStateFromPincode(pinCode) !== 'Unknown' && (
              <div className="mt-2 flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2">
                <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-blue-400 text-sm font-medium">State: {getStateFromPincode(pinCode)}</span>
                <span className="text-gray-500 text-xs">(auto-detected, locked after signup)</span>
              </div>
            )}
          </div>

          {/* Location / Landmark */}
          <div className="mb-6">
            <label className="block mb-3">
              Location / Landmark <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={newLocationLandmark}
                onChange={(e) => setNewLocationLandmark(e.target.value)}
                placeholder="e.g. Baksara Bazar, Howrah"
                className="pl-12 bg-black border-zinc-800 text-white h-14 rounded-lg focus:border-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Helps patients find your clinic via map. More locations can be added later.
            </p>
          </div>

          {/* QR Type Selection */}
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
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-zinc-800 bg-black hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <QrCode className={`w-6 h-6 ${qrType === 'preprinted' ? 'text-blue-400' : 'text-gray-400'}`} />
                  <span className={`font-semibold ${qrType === 'preprinted' ? 'text-blue-400' : 'text-gray-400'}`}>
                    Pre-Printed QR
                  </span>
                  <span className="text-xs text-gray-500 text-center">
                    Admin-generated QR from universal pool
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
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-zinc-800 bg-black hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <QrCode className={`w-6 h-6 ${qrType === 'virtual' ? 'text-blue-400' : 'text-gray-400'}`} />
                  <span className={`font-semibold ${qrType === 'virtual' ? 'text-blue-400' : 'text-gray-400'}`}>
                    Virtual QR
                  </span>
                  <span className="text-xs text-gray-500 text-center">
                    Self-signup, auto-generated from universal pool
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* QR Number and Company Name Fields - Conditional */}
          {qrType === 'preprinted' && (
            <>
              {/* Company Name + Verify */}
              <div className="mb-6">
                <label className="block mb-3">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      value={companyName}
                      onChange={(e) => {
                        setCompanyName(e.target.value);
                        setCompanyLookupDone(false);
                        setSelectedCompany(null);
                        setAvailableDivisions([]);
                        setDivision('');
                        setTerritoryValid(null);
                      }}
                      className="pl-12 bg-black border-zinc-800 text-white h-14 rounded-lg focus:border-blue-500"
                      placeholder="e.g. Lupin"
                    />
                  </div>
                  <Button
                    onClick={() => lookupCompany(companyName)}
                    disabled={companyLookupLoading || !companyName.trim()}
                    className="h-14 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shrink-0"
                  >
                    {companyLookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span className="ml-2">Verify</span>
                  </Button>
                </div>
                {companyLookupDone && companyMatches.length === 0 && (
                  <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                    <p className="text-red-400 text-sm">Company not registered. Ask your distributor to sign up at HealQR Distributor portal.</p>
                  </div>
                )}
                {companyLookupDone && availableDivisions.length > 0 && (
                  <div className="mt-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                    <p className="text-emerald-400 text-sm flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Company found! {availableDivisions.length > 1 ? 'Select a division below.' : `Division: ${availableDivisions[0].division}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Division Dropdown */}
              {availableDivisions.length > 1 && (
                <div className="mb-6">
                  <label className="block mb-3">
                    Division <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={division}
                    onChange={(e) => {
                      setDivision(e.target.value);
                      const match = availableDivisions.find(d => d.division === e.target.value) || null;
                      setSelectedCompany(match);
                      validateTerritory(pinCode, match);
                    }}
                    className="w-full h-14 px-4 bg-black border border-zinc-800 text-white rounded-lg focus:border-blue-500"
                  >
                    <option value="">Select Division</option>
                    {availableDivisions.map(d => (
                      <option key={d.id} value={d.division}>{d.division}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Territory validation message */}
              {selectedCompany && pinCode.length === 6 && territoryValid !== null && (
                <div className={`mb-6 rounded-lg px-3 py-2 border ${
                  territoryValid
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <p className={`text-sm ${territoryValid ? 'text-emerald-400' : 'text-red-400'}`}>
                    {territoryValid
                      ? `✓ ${getStateFromPincode(pinCode)} is covered by this company/division`
                      : `✗ ${getStateFromPincode(pinCode)} is NOT in this company's territory. Contact your distributor.`
                    }
                  </p>
                </div>
              )}

              {/* QR Number */}
              {selectedCompany && (
                <div className="mb-8">
                  <label className="block mb-3">
                    Clinic QR Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      value={qrNumber}
                      onChange={(e) => setQrNumber(e.target.value.toUpperCase())}
                      className="pl-12 bg-black border-zinc-800 text-white h-14 rounded-lg focus:border-blue-500 font-mono"
                      placeholder="e.g. QR-CLINIC-001"
                    />
                  </div>
                </div>
              )}
            </>
          )}
          {qrType === 'virtual' && virtualQrGenerated && (
            <div className="mb-8">
              <label className="block mb-3">
                Generated Virtual QR
              </label>
              <div className="relative">
                <Input
                  value={qrNumber}
                  readOnly
                  className="pl-12 bg-black border-zinc-800 text-white h-14 rounded-lg font-mono"
                />
              </div>
            </div>
          )}

          {/* Terms */}
          <div className="mb-8">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                className="mt-0.5 border-zinc-700 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 flex-shrink-0"
              />
              <label htmlFor="terms" className="text-gray-300 cursor-pointer leading-relaxed">
                I agree to the Terms of Service and Privacy Policy.
              </label>
            </div>
          </div>

          <Button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 rounded-lg mb-6 text-lg font-medium"
          >
            {loading ? 'Sending Link...' : 'Create Clinic Account'}
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
            <button onClick={onLogin} className="text-blue-500 hover:underline">
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

