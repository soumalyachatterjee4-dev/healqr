import { useState } from 'react';
import { UserPlus, CheckCircle, SkipForward, ArrowLeft } from 'lucide-react';
import HealthTipBanner from './HealthTipBanner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner';
import { db } from '../lib/firebase/config';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import healqrLogo from '../assets/healqr.logo.png';

interface ReferrerRegistrationProps {
  onSuccess: () => void;
  onSkip: () => void;
  onLoginRedirect: () => void;
}

const REFERRER_ROLES = [
  'Doctor',
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

export default function ReferrerRegistration({ onSuccess, onSkip, onLoginRedirect }: ReferrerRegistrationProps) {
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim()) { toast.error('Enter your name'); return; }
    if (phone.length !== 10) { toast.error('Enter valid 10-digit phone number'); return; }
    if (!role) { toast.error('Select your role'); return; }
    if (!organization.trim()) { toast.error('Enter your organization name'); return; }
    if (!db) { toast.error('Service unavailable'); return; }

    setLoading(true);
    try {
      // Check if already registered
      const existing = query(collection(db, 'referrers'), where('phone', '==', `+91${phone}`));
      const existingSnap = await getDocs(existing);
      if (!existingSnap.empty) {
        toast.info('You are already registered! Please log in to your dashboard.');
        setStep('done');
        return;
      }

      // Create referrer document
      await addDoc(collection(db, 'referrers'), {
        name: name.trim(),
        phone: `+91${phone}`,
        role,
        organization: organization.trim(),
        totalReferrals: 0,
        createdAt: Timestamp.now(),
      });

      setStep('done');
      toast.success('Registration successful!');
      onSuccess();
    } catch (err) {
      console.error('Registration error:', err);
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <button
          onClick={onSkip}
          className="inline-flex items-center gap-1.5 text-gray-400 hover:text-emerald-400 text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <img src={healqrLogo} alt="HealQR" className="h-12 w-auto mx-auto mb-4" />
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Join HealQR Referral Network</h1>
          <p className="text-gray-400 text-sm mt-2">Register as a referrer and help patients book the right doctors</p>
        </div>

        {step === 'form' && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Your Name <span className="text-red-400">*</span></label>
                <Input
                  placeholder="Enter your full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white h-12"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Phone Number <span className="text-red-400">*</span></label>
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
                <label className="text-gray-400 text-xs mb-1.5 block">Your Role <span className="text-red-400">*</span></label>
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
                onClick={handleRegister}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base"
              >
                {loading ? 'Registering...' : 'Register as Referrer'}
              </Button>

              {/* Skip button */}
              <button
                onClick={onSkip}
                className="w-full flex items-center justify-center gap-2 text-gray-400 text-sm hover:text-white transition-colors py-2"
              >
                <SkipForward className="w-4 h-4" /> Skip
              </button>

              {/* Already registered? Login */}
              <div className="text-center pt-2 border-t border-zinc-800">
                <p className="text-gray-500 text-xs mb-2">Already registered?</p>
                <button
                  onClick={onLoginRedirect}
                  className="text-emerald-400 text-sm font-medium hover:text-emerald-300 transition-colors"
                >
                  Login to Referral Dashboard →
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Health Tip Card */}
        <div className="mt-6">
          <HealthTipBanner />
        </div>

        {step === 'done' && (
          <Card className="bg-emerald-950/30 border-emerald-800/50">
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
              <h2 className="text-xl font-bold text-white">Registration Complete!</h2>
              <p className="text-gray-400 text-sm">You're now a registered HealQR referrer.</p>
              <p className="text-gray-500 text-xs">Log in to your dashboard to start creating referral QR codes for patients.</p>

              <Button
                onClick={onLoginRedirect}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base mt-4"
              >
                Go to Referral Dashboard Login →
              </Button>

              <button
                onClick={onSkip}
                className="w-full text-gray-500 text-sm hover:text-gray-400 transition-colors"
              >
                Back to Home
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
