import { Input } from './ui/input';
import { Button } from './ui/button';
import { Mail, ArrowLeft, User, Phone, MapPin, Loader2, Stethoscope, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import healqrLogo from '../assets/healqr.logo.png';
import { auth, db } from '../lib/firebase/config';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { getStateFromPincode } from '../utils/pincodeMapping';

const PARAMEDICAL_ROLES = [
  { value: 'phlebotomist', label: 'Phlebotomist', desc: 'Sample Collection Professional' },
  { value: 'physiotherapist', label: 'Physiotherapist', desc: 'Physical Rehabilitation Specialist' },
  { value: 'nurse', label: 'Nurse', desc: 'Registered / Practicing Nurse' },
  { value: 'wound-dresser', label: 'Wound Dresser', desc: 'Injury & Wound Care Specialist' },
  { value: 'aaya', label: 'Aaya / Caretaker', desc: 'Patient Caretaker & Support' },
  { value: 'home-assistant', label: 'Home Health Assistant', desc: 'Male / Female Home Care Assistant' },
] as const;

export type ParamedicalRole = typeof PARAMEDICAL_ROLES[number]['value'];

interface ParamedicalSignUpProps {
  onBack: () => void;
  onLogin: () => void;
}

export default function ParamedicalSignUp({ onBack, onLogin }: ParamedicalSignUpProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pincode, setPincode] = useState('');
  const [experience, setExperience] = useState('');
  const [role, setRole] = useState<ParamedicalRole | ''>('');
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const handleSignUp = async () => {
    if (!role) {
      toast.error('Please select your profession');
      return;
    }
    if (!email || !name || !phone) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      // Check if already registered in paramedicals
      const existing = await getDocs(query(collection(db, 'paramedicals'), where('email', '==', email.toLowerCase().trim())));
      if (!existing.empty) {
        toast.error('This email is already registered. Please login instead.');
        setLoading(false);
        return;
      }

      // Check by phone
      const existingPhone = await getDocs(query(collection(db, 'paramedicals'), where('phone', '==', phone.trim())));
      if (!existingPhone.empty) {
        toast.error('This phone number is already registered.');
        setLoading(false);
        return;
      }

      // Generate virtual QR number
      const qrPoolCollection = collection(db, 'qrPool');
      const qrCodesCollection = collection(db, 'qrCodes');
      const [poolQrs, codesQrs] = await Promise.all([
        getDocs(qrPoolCollection),
        getDocs(qrCodesCollection)
      ]);

      let maxNumber = 0;
      poolQrs.forEach(d => {
        const qrNum = d.data().qrNumber;
        if (qrNum && qrNum.startsWith('HQR')) {
          const num = parseInt(qrNum.replace('HQR', ''));
          if (!isNaN(num) && num > maxNumber) maxNumber = num;
        }
      });
      codesQrs.forEach(d => {
        const qrNum = d.data().qrNumber;
        if (qrNum && qrNum.startsWith('HQR')) {
          const num = parseInt(qrNum.replace('HQR', ''));
          if (!isNaN(num) && num > maxNumber) maxNumber = num;
        }
      });

      const qrNumber = `HQR${String(maxNumber + 1).padStart(5, '0')}`;

      // Block QR in pool
      await addDoc(qrPoolCollection, {
        qrNumber,
        email: email.toLowerCase().trim(),
        name: name.trim(),
        status: 'blocked',
        createdAt: serverTimestamp(),
        qrType: 'virtual',
        generatedBy: 'paramedical-signup',
        role,
      });

      // Create pending signup
      await addDoc(collection(db, 'pending_paramedical_signups'), {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        phone: phone.trim(),
        pincode: pincode.trim(),
        state: pincode ? getStateFromPincode(pincode.trim()) : '',
        experience: experience.trim(),
        role,
        qrNumber,
        status: 'pending-verification',
        createdAt: serverTimestamp(),
      });

      // Send magic link
      const actionCodeSettings = {
        url: `${window.location.origin}/verify-login?email=${encodeURIComponent(email.toLowerCase().trim())}&type=paramedical&signup=true`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email.toLowerCase().trim(), actionCodeSettings);
      window.localStorage.setItem('healqr_email_for_signin', email.toLowerCase().trim());

      setLinkSent(true);
      toast.success(`QR ${qrNumber} assigned! Verification link sent.`);
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error('Signup failed', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = PARAMEDICAL_ROLES.find(r => r.value === role);

  if (linkSent) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="h-20 w-20 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto">
            <Mail className="h-10 w-10 text-teal-500" />
          </div>
          <h2 className="text-3xl font-bold">Check your inbox</h2>
          <p className="text-gray-400">
            We've sent a verification link to <span className="text-white font-medium">{email}</span>
          </p>
          <p className="text-gray-500 text-sm">Click the link in the email to complete your registration as a <span className="text-teal-400">{selectedRole?.label}</span>.</p>
          <Button variant="outline" onClick={onBack} className="w-full border-zinc-800 text-white hover:bg-zinc-900">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={healqrLogo} alt="HealQR Logo" className="h-10 w-auto" />
        </div>

        <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
          <div className="text-center mb-8">
            <div className="h-16 w-16 bg-teal-500/10 rounded-xl flex items-center justify-center mx-auto mb-6">
              <Stethoscope className="w-8 h-8 text-teal-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Healthcare Professional</h1>
            <p className="text-gray-400">Register as a paramedical professional</p>
          </div>

          <div className="space-y-4">
            {/* Role Selector */}
            <div>
              <label className="block mb-2 text-sm text-gray-300">Your Profession *</label>
              <div className="relative">
                <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as ParamedicalRole)}
                  className="w-full pl-12 pr-10 h-12 bg-black border border-zinc-800 text-white rounded-lg focus:border-teal-500 focus:outline-none appearance-none"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="">Select your profession</option>
                  {PARAMEDICAL_ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block mb-2 text-sm text-gray-300">Full Name *</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input value={name} onChange={(e) => setName(e.target.value)}
                  className="pl-12 bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-teal-500"
                  placeholder="Your full name" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block mb-2 text-sm text-gray-300">Email *</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input value={email} onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-teal-500"
                  placeholder="email@example.com" type="email" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block mb-2 text-sm text-gray-300">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="pl-12 bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-teal-500"
                  placeholder="+91 9876543210" type="tel" />
              </div>
            </div>

            {/* Pincode */}
            <div>
              <label className="block mb-2 text-sm text-gray-300">Service Area Pincode</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input value={pincode} onChange={(e) => setPincode(e.target.value)}
                  className="pl-12 bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-teal-500"
                  placeholder="700001" maxLength={6} />
              </div>
            </div>

            {/* Experience */}
            <div>
              <label className="block mb-2 text-sm text-gray-300">Years of Experience</label>
              <Input value={experience} onChange={(e) => setExperience(e.target.value)}
                className="bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-teal-500"
                placeholder="e.g. 3 years" />
            </div>
          </div>

          <Button onClick={handleSignUp} disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white h-14 rounded-lg text-lg font-medium mt-6 mb-6">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Creating Account...</> : 'Create Account'}
          </Button>

          <div className="text-center mb-6">
            <p className="text-gray-400">
              Already registered?{' '}
              <button onClick={onLogin} className="text-teal-500 hover:underline">Log in</button>
            </p>
          </div>

          <div className="text-center">
            <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
