import { useState } from 'react';
import { LogIn, Shield, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner';
import { db } from '../lib/firebase/config';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import healqrLogo from '../assets/healqr.logo.png';

interface ReferrerLoginProps {
  onLoginSuccess: (referrerId: string, referrerPhone: string) => void;
  onBack: () => void;
  onRegister: () => void;
}

export default function ReferrerLogin({ onLoginSuccess, onBack, onRegister }: ReferrerLoginProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [referrerDocId, setReferrerDocId] = useState('');
  const [referrerData, setReferrerData] = useState<any>(null);

  const handleSendOtp = async () => {
    if (phone.length !== 10) { toast.error('Enter valid 10-digit phone number'); return; }
    if (!db) { toast.error('Service unavailable'); return; }

    setLoading(true);
    try {
      // Check if registered
      const q = query(collection(db, 'referrers'), where('phone', '==', `+91${phone}`));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.error('Phone number not registered. Please register first.');
        setLoading(false);
        return;
      }

      const refDoc = snap.docs[0];
      setReferrerDocId(refDoc.id);
      setReferrerData(refDoc.data());

      // Generate 4-digit OTP
      const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(otpCode);

      // Store OTP in Firestore
      await addDoc(collection(db, 'patientOtpRequests'), {
        phoneNumber: `+91${phone}`,
        otp: otpCode,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)),
        status: 'pending',
        purpose: 'referrer-login',
      });

      setStep('otp');
      toast.success('OTP generated! Enter the code shown below.');
    } catch (err) {
      console.error('OTP send error:', err);
      toast.error('Failed to generate OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = () => {
    if (otp !== generatedOtp) {
      toast.error('Invalid OTP. Please try again.');
      return;
    }

    // Save session
    localStorage.setItem('referrer_id', referrerDocId);
    localStorage.setItem('referrer_phone', `+91${phone}`);
    localStorage.setItem('referrer_name', referrerData?.name || '');
    localStorage.setItem('referrer_role', referrerData?.role || '');
    localStorage.setItem('referrer_organization', referrerData?.organization || '');
    const expiryTime = Date.now() + (365 * 24 * 60 * 60 * 1000);
    localStorage.setItem('referrer_session_expiry', expiryTime.toString());

    toast.success(`Welcome back, ${referrerData?.name || 'Referrer'}!`);
    // Set URL for session persistence on refresh
    const url = new URL(window.location.href);
    url.searchParams.set('page', 'referrer-dashboard');
    window.history.replaceState({}, '', url.toString());
    onLoginSuccess(referrerDocId, `+91${phone}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <img src={healqrLogo} alt="HealQR" className="h-12 w-auto mx-auto mb-4" />
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Referral Dashboard Login</h1>
          <p className="text-gray-400 text-sm mt-2">Enter your registered mobile number to log in</p>
        </div>

        {step === 'phone' && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Registered Mobile Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">+91</span>
                  <Input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                    className="bg-zinc-800 border-zinc-700 text-white h-12 pl-12"
                  />
                </div>
              </div>

              <Button
                onClick={handleSendOtp}
                disabled={loading || phone.length !== 10}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base"
              >
                {loading ? 'Verifying...' : 'Get OTP'}
              </Button>

              <button
                onClick={onBack}
                className="w-full flex items-center justify-center gap-2 text-gray-500 text-sm hover:text-gray-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Home
              </button>

              {/* Not registered? */}
              <div className="text-center pt-2 border-t border-zinc-800">
                <p className="text-gray-500 text-xs mb-2">Not registered yet?</p>
                <button
                  onClick={onRegister}
                  className="text-emerald-400 text-sm font-medium hover:text-emerald-300 transition-colors"
                >
                  Register as Referrer →
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'otp' && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6 space-y-4">
              <div className="text-center mb-2">
                <Shield className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-white font-medium">Verify Your Identity</p>
                <p className="text-gray-400 text-xs mt-1">Enter the OTP shown below for +91{phone}</p>
              </div>

              {/* On-screen OTP display */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
                <p className="text-xs text-emerald-400/70 mb-1">Your Login OTP</p>
                <p className="text-3xl font-bold text-emerald-400 tracking-[0.5em]">{generatedOtp}</p>
              </div>

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
                disabled={otp.length !== 4}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12"
              >
                Verify & Login
              </Button>

              <button
                onClick={() => { setStep('phone'); setOtp(''); setGeneratedOtp(''); }}
                className="w-full text-center text-gray-500 text-sm hover:text-gray-400"
              >
                ← Change phone number
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
