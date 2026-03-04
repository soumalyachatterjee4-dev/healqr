import { useState } from 'react';
import { auth, db } from '../lib/firebase/config';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, ArrowLeft, Shield, Building2, CheckCircle2, Mail, ChevronDown, X, MapPin } from 'lucide-react';
import healqrLogo from '../assets/healqr-logo.png';
import { toast } from 'sonner';
import { getAllStates, getStateFromPincode } from '../utils/pincodeMapping';
import { MEDICAL_SPECIALTIES } from '../utils/medicalSpecialties';

const ALL_SPECIALTIES = MEDICAL_SPECIALTIES;


const INDIAN_STATES = getAllStates();

interface PharmaSignUpProps {
  onBack: () => void;
  onLogin?: () => void;
}

export default function PharmaSignUp({ onBack, onLogin }: PharmaSignUpProps) {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [pincode, setPincode] = useState('');
  const [division, setDivision] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [address, setAddress] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false);
  const [territoryStates, setTerritoryStates] = useState<string[]>([]);
  const [showTerritoryDropdown, setShowTerritoryDropdown] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const allSelected = selectedSpecialties.length === ALL_SPECIALTIES.length;
  const allStatesSelected = territoryStates.length === INDIAN_STATES.length;

  const toggleSpecialty = (specialty: string) => {
    setSelectedSpecialties(prev =>
      prev.includes(specialty) ? prev.filter(s => s !== specialty) : [...prev, specialty]
    );
  };

  const toggleSelectAll = () => {
    setSelectedSpecialties(allSelected ? [] : ALL_SPECIALTIES.map(s => s.id));
  };

  const removeSpecialty = (specialty: string) => {
    setSelectedSpecialties(prev => prev.filter(s => s !== specialty));
  };

  const toggleTerritoryState = (state: string) => {
    setTerritoryStates(prev =>
      prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
    );
  };

  const toggleAllStates = () => {
    setTerritoryStates(allStatesSelected ? [] : [...INDIAN_STATES]);
  };

  const removeTerritoryState = (state: string) => {
    setTerritoryStates(prev => prev.filter(s => s !== state));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) { setError('Please enter your company name'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email address'); return; }
    if (!contactPerson.trim()) { setError('Please enter contact person name'); return; }
    if (!contactPhone.trim() || contactPhone.replace(/\D/g, '').length < 10) { setError('Please enter a valid phone number'); return; }
    if (!pincode.trim() || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) { setError('Please enter a valid 6-digit pincode'); return; }
    if (!division.trim()) { setError('Please enter your division'); return; }
    if (selectedSpecialties.length === 0) { setError('Please select at least one specialty'); return; }
    if (territoryStates.length === 0) { setError('Please select at least one territory state'); return; }
    if (!acceptedTerms) { setError('Please accept the Terms & Conditions'); return; }

    setLoading(true);
    setError('');

    try {
      if (!db) throw new Error('Database not available');

      const pharmaRef = collection(db, 'pharmaCompanies');
      const q = query(pharmaRef, where('contactEmail', '==', email.toLowerCase().trim()));
      const existing = await getDocs(q);

      if (!existing.empty) {
        setError('This email is already registered. Please login instead.');
        setLoading(false);
        return;
      }

      // Create doc with pending_verification status
      await addDoc(collection(db, 'pharmaCompanies'), {
        companyName: companyName.trim(),
        contactEmail: email.toLowerCase().trim(),
        contactPerson: contactPerson.trim(),
        contactPhone: contactPhone.trim(),
        registeredOfficePincode: pincode.trim(),
        registeredOfficeState: getStateFromPincode(pincode.trim()), // Auto-derived from pincode
        division: division.trim(),
        gstNumber: gstNumber.trim(),
        address: address.trim(),
        specialties: selectedSpecialties,
        territoryStates: territoryStates, // Territory demarcation — locked after approval
        territoryType: allStatesSelected ? 'all_india' : 'selected_states',
        status: 'pending_verification',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Send verification email
      const actionCodeSettings = {
        url: `${window.location.origin}/?page=pharma-verify`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth!, email.toLowerCase().trim(), actionCodeSettings);
      localStorage.setItem('healqr_pharma_email_for_signin', email.toLowerCase().trim());

      setSent(true);
      toast.success('Verification link sent to your email!');
    } catch (err: any) {
      console.error('Pharma signup error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img src={healqrLogo} alt="HealQR" className="h-10" />
          </div>
          <div className="bg-zinc-900 rounded-2xl p-8 md:p-12 border border-zinc-800 text-center">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Verify Your Email</h2>
            <p className="text-gray-400 mb-4">
              We've sent a verification link to <span className="text-emerald-500 font-medium">{email}</span>
            </p>
            <p className="text-gray-500 text-sm mb-4">
              Click the link in your email to verify your account. Once verified, your account will be reviewed and activated by our admin team.
            </p>
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mb-6">
              <p className="text-yellow-400 text-xs">
                ⚠️ After email verification, your account will be reviewed by HealQR admin. You'll be able to login once approved.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
              <Mail className="w-4 h-4" />
              <span>Check your inbox and spam folder</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-6">
          <img src={healqrLogo} alt="HealQR" className="h-10" />
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 md:p-8 border border-zinc-800">
          <div className="text-center mb-5">
            <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold mb-1">healQR Distributors</h1>
            <p className="text-gray-400 text-sm">Create your distributor company account</p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2.5 mb-5">
            <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-emerald-400 text-xs">Secure passwordless login via email link</span>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-400 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Company Name *</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter your company name"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-colors"
                disabled={loading} />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Email ID *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="company@example.com"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-colors"
                disabled={loading} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Contact Person *</label>
                <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Full name"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-colors"
                  disabled={loading} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Phone *</label>
                <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value.replace(/[^\d+\-\s]/g, '').slice(0, 15))}
                  placeholder="+91 9876543210"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-colors"
                  disabled={loading} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Registered Office Pincode *</label>
                <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit pincode" maxLength={6}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-colors"
                  disabled={loading} />
                {pincode.length === 6 && getStateFromPincode(pincode) !== 'Unknown' && (
                  <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {getStateFromPincode(pincode)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">GST Number</label>
                <input type="text" value={gstNumber} onChange={(e) => setGstNumber(e.target.value.toUpperCase().slice(0, 15))}
                  placeholder="Optional"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-colors"
                  disabled={loading} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Registered Office Address</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-colors"
                disabled={loading} />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Division *</label>
              <input type="text" value={division} onChange={(e) => setDivision(e.target.value)}
                placeholder="e.g. Cardio, Derma, General"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-colors"
                disabled={loading} />
            </div>

            {/* Territory States Multi-Select */}
            <div className="relative">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Territory States * <span className="text-xs text-gray-500 font-normal">(Locked after approval)</span>
              </label>
              {territoryStates.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {allStatesSelected ? (
                    <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-400 text-xs px-2.5 py-1 rounded-full border border-blue-500/30 font-medium">
                      🇮🇳 All India ({INDIAN_STATES.length} states)
                      <button type="button" onClick={() => setTerritoryStates([])} className="hover:text-white transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ) : (
                    territoryStates.map(s => (
                      <span key={s} className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full border border-blue-500/30">
                        {s}
                        <button type="button" onClick={() => removeTerritoryState(s)} className="hover:text-white transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              )}
              <button type="button" onClick={() => setShowTerritoryDropdown(!showTerritoryDropdown)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 flex items-center justify-between focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-colors"
                disabled={loading}>
                <span className={territoryStates.length === 0 ? 'text-gray-500' : 'text-white'}>
                  {territoryStates.length === 0 ? 'Select territory states...' : allStatesSelected ? 'All India' : `${territoryStates.length} state${territoryStates.length > 1 ? 's' : ''} selected`}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTerritoryDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showTerritoryDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                  <button type="button" onClick={toggleAllStates}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-700 transition-colors flex items-center gap-3 border-b border-zinc-700 sticky top-0 bg-zinc-800">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${allStatesSelected ? 'bg-blue-500 border-blue-500' : 'border-zinc-500'}`}>
                      {allStatesSelected && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className="font-medium text-blue-400">🇮🇳 All India (Pan India)</span>
                  </button>
                  {INDIAN_STATES.map(state => (
                    <button type="button" key={state} onClick={() => toggleTerritoryState(state)}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-700 transition-colors flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${territoryStates.includes(state) ? 'bg-blue-500 border-blue-500' : 'border-zinc-500'}`}>
                        {territoryStates.includes(state) && <span className="text-white text-xs">✓</span>}
                      </div>
                      <span className="text-gray-300">{state}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Specialty Multi-Select */}
            <div className="relative">
              <label className="text-sm font-medium text-gray-300 mb-2 block">Specialty *</label>
              {selectedSpecialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedSpecialties.map(sid => {
                    const specialty = ALL_SPECIALTIES.find(s => s.id === sid);
                    return (
                      <span key={sid} className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full border border-emerald-500/30">
                        {specialty?.label || sid}
                        <button type="button" onClick={() => removeSpecialty(sid)} className="hover:text-white transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <button type="button" onClick={() => setShowSpecialtyDropdown(!showSpecialtyDropdown)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 flex items-center justify-between focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-colors"
                disabled={loading}>
                <span className={selectedSpecialties.length === 0 ? 'text-gray-500' : 'text-white'}>
                  {selectedSpecialties.length === 0 ? 'Select specialties...' : `${selectedSpecialties.length} selected`}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showSpecialtyDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showSpecialtyDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                  <button type="button" onClick={toggleSelectAll}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-700 transition-colors flex items-center gap-3 border-b border-zinc-700">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${allSelected ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-500'}`}>
                      {allSelected && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className="font-medium text-emerald-400">Select All</span>
                  </button>
                  {ALL_SPECIALTIES.map(specialty => (
                    <button type="button" key={specialty.id} onClick={() => toggleSpecialty(specialty.id)}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-700 transition-colors flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedSpecialties.includes(specialty.id) ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-500'}`}>
                        {selectedSpecialties.includes(specialty.id) && <span className="text-white text-xs">✓</span>}
                      </div>
                      <span className={specialty.id === 'clinic' ? 'text-blue-400 font-medium' : 'text-gray-300'}>{specialty.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* T&C */}
            <div className="flex items-start gap-3 pt-1">
              <button type="button" onClick={() => setAcceptedTerms(!acceptedTerms)}
                className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${acceptedTerms ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-500 hover:border-zinc-400'}`}>
                {acceptedTerms && <span className="text-white text-xs font-bold">✓</span>}
              </button>
              <span className="text-gray-400 text-sm leading-relaxed">
                I agree to the{' '}
                <a href="/?page=terms-of-service" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400 underline">Terms & Conditions</a>
                {' '}and{' '}
                <a href="/?page=privacy-policy" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400 underline">Privacy Policy</a>
              </span>
            </div>

            <button type="submit"
              disabled={loading || !acceptedTerms || !companyName.trim() || !email.trim() || !contactPerson.trim() || !contactPhone.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? (<><Loader2 className="w-5 h-5 animate-spin" /> Creating Account...</>) : 'Create Account'}
            </button>
          </form>

          <button onClick={onBack}
            className="mt-5 w-full text-center text-gray-400 hover:text-emerald-500 text-sm flex items-center justify-center gap-1 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>

          {onLogin && (
            <p className="mt-3 text-center text-gray-500 text-sm">
              Already have an account?{' '}
              <button onClick={onLogin} className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors">Login</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
