import { useState, useEffect } from 'react';
import { UserPlus, Phone, Shield, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner';
import { db } from '../lib/firebase/config';
import { collection, addDoc, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';

interface ReferrerRegistrationProps {
  referralCode: string;
  onSuccess: (referrerId: string, referrerPhone: string) => void;
  onBack: () => void;
}

const REFERRER_ROLES = [
  'Pharmacist',
  'Receptionist',
  'Physiotherapist',
  'Lab Technician',
  'Nurse',
  'Hospital Staff',
  'Medical Representative',
  'Family / Friend',
  'Health Agent',
  'Other',
];

export default function ReferrerRegistration({ referralCode, onSuccess, onBack }: ReferrerRegistrationProps) {
  const [step, setStep] = useState<'form' | 'otp' | 'done'>('form');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [organization, setOrganization] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkInfo, setLinkInfo] = useState<{ createdByName: string; createdByRole: string } | null>(null);

  // Load referral link info
  useEffect(() => {
    if (!referralCode || !db) return;
    const loadLinkInfo = async () => {
      try {
        const q = query(collection(db!, 'referralLinks'), where('code', '==', referralCode));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setLinkInfo({ createdByName: data.createdByName || 'HealQR User', createdByRole: data.createdByRole || '' });
        }
      } catch {}
    };
    loadLinkInfo();
  }, [referralCode]);

  const handleSendOtp = async () => {
    if (!name.trim()) { toast.error('Enter your name'); return; }
    if (phone.length !== 10) { toast.error('Enter valid 10-digit phone number'); return; }
    if (!role) { toast.error('Select your role'); return; }
    if (!organization.trim()) { toast.error('Enter your organization name'); return; }

    setLoading(true);
    try {
      // Check if already registered
      const existing = query(collection(db!, 'referrers'), where('phone', '==', `+91${phone}`));
      const existingSnap = await getDocs(existing);
      if (!existingSnap.empty) {
        // Already registered — log them in directly
        const existingDoc = existingSnap.docs[0];
        localStorage.setItem('referrer_id', existingDoc.id);
        localStorage.setItem('referrer_phone', `+91${phone}`);
        localStorage.setItem('referrer_name', existingDoc.data().name);
        localStorage.setItem('referrer_role', existingDoc.data().role);
        const expiryTime = Date.now() + (365 * 24 * 60 * 60 * 1000);
        localStorage.setItem('referrer_session_expiry', expiryTime.toString());
        toast.success('Welcome back! Already registered.');
        onSuccess(existingDoc.id, `+91${phone}`);
        return;
      }

      // Generate OTP
      const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(otpCode);

      // Store OTP request in Firestore (Cloud Function sends SMS)
      await addDoc(collection(db!, 'patientOtpRequests'), {
        phoneNumber: `+91${phone}`,
        otp: otpCode,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)),
        status: 'pending',
        purpose: 'referrer-registration',
      });

      setStep('otp');
      toast.success('OTP sent to your phone');
    } catch (err) {
      console.error('OTP send error:', err);
      toast.error('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp !== generatedOtp) {
      toast.error('Invalid OTP. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const referrerDoc = await addDoc(collection(db!, 'referrers'), {
        name: name.trim(),
        phone: `+91${phone}`,
        role,
        organization: organization.trim(),
        registeredViaCode: referralCode,
        registeredViaName: linkInfo?.createdByName || '',
        registeredViaRole: linkInfo?.createdByRole || '',
        totalReferrals: 0,
        createdAt: Timestamp.now(),
      });

      localStorage.setItem('referrer_id', referrerDoc.id);
      localStorage.setItem('referrer_phone', `+91${phone}`);
      localStorage.setItem('referrer_name', name.trim());
      localStorage.setItem('referrer_role', role);
      const expiryTime = Date.now() + (365 * 24 * 60 * 60 * 1000);
      localStorage.setItem('referrer_session_expiry', expiryTime.toString());

      setStep('done');
      toast.success('Registration successful!');

      setTimeout(() => {
        onSuccess(referrerDoc.id, `+91${phone}`);
      }, 1500);
    } catch (err) {
      console.error('Registration error:', err);
      toast.error('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Join HealQR Referral Network</h1>
          <p className="text-gray-400 text-sm mt-2">Register as a referrer and help patients book the right doctors</p>
          {linkInfo && (
            <p className="text-emerald-400 text-xs mt-2">
              Invited by: {linkInfo.createdByName} {linkInfo.createdByRole ? `(${linkInfo.createdByRole})` : ''}
            </p>
          )}
        </div>

        {step === 'form' && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Your Name</label>
                <Input
                  placeholder="Enter your full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white h-12"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">+91</span>
                  <Input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="bg-zinc-800 border-zinc-700 text-white h-12 pl-12"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Your Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-3 text-sm"
                >
                  <option value="">Select your role...</option>
                  {REFERRER_ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Organization <span className="text-red-400">*</span></label>
                <Input
                  placeholder="Hospital / Clinic / Pharmacy name"
                  value={organization}
                  onChange={e => setOrganization(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white h-12"
                />
              </div>

              <Button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base"
              >
                {loading ? 'Sending OTP...' : 'Register & Send OTP'}
              </Button>

              <button onClick={onBack} className="w-full text-center text-gray-500 text-sm hover:text-gray-400 mt-2">
                <ArrowLeft className="w-4 h-4 inline mr-1" /> Go Back
              </button>
            </CardContent>
          </Card>
        )}

        {step === 'otp' && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6 space-y-4">
              <div className="text-center mb-2">
                <Shield className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-white font-medium">Verify Your Phone</p>
                <p className="text-gray-400 text-xs mt-1">OTP sent to +91{phone}</p>
              </div>

              {generatedOtp && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                  <p className="text-xs text-yellow-400/70 mb-1">Dev Mode — OTP</p>
                  <p className="text-2xl font-bold text-yellow-400 tracking-widest">{generatedOtp}</p>
                </div>
              )}

              <Input
                type="text"
                inputMode="numeric"
                placeholder="Enter 4-digit OTP"
                maxLength={4}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                className="text-center text-2xl tracking-widest h-14 bg-zinc-800 border-zinc-700 text-white"
              />

              <Button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 4}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12"
              >
                {loading ? 'Verifying...' : 'Verify & Complete Registration'}
              </Button>

              <button onClick={() => { setStep('form'); setOtp(''); }} className="w-full text-center text-gray-500 text-sm hover:text-gray-400">
                ← Change phone number
              </button>
            </CardContent>
          </Card>
        )}

        {step === 'done' && (
          <Card className="bg-emerald-950/30 border-emerald-800/50">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Welcome, {name}!</h2>
              <p className="text-gray-400 text-sm">You're now a registered HealQR referrer.</p>
              <p className="text-emerald-400 text-xs mt-3">Redirecting to your dashboard...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
