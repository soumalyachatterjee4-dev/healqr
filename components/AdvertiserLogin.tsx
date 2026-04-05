import { useState } from 'react';
import { Mail, ArrowRight, Loader2, X, CheckCircle2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { auth, db } from '../lib/firebase/config';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import healQRLogo from '../assets/healqr.logo.png';

interface AdvertiserLoginProps {
  onBack: () => void;
  onSignUp: () => void;
  onSuccess: () => void;
}

export default function AdvertiserLogin({ onBack, onSignUp }: AdvertiserLoginProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!db) throw new Error('Database not available');

      // Check if advertiser exists
      const advRef = collection(db, 'advertisers');
      const q = query(advRef, where('email', '==', email.toLowerCase().trim()));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError('No advertiser account found for this email. Please sign up first.');
        setLoading(false);
        return;
      }

      const advData = snap.docs[0].data();
      if (advData.status === 'pending_verification') {
        // Resend verification link for pending accounts
        const actionCodeSettings = {
          url: `${window.location.origin}/?page=advertiser-verify`,
          handleCodeInApp: true,
        };
        await sendSignInLinkToEmail(auth!, email.toLowerCase().trim(), actionCodeSettings);
        localStorage.setItem('healqr_advertiser_email_for_signin', email.toLowerCase().trim());
        setSent(true);
        toast.success('Verification link resent to your email!');
        setLoading(false);
        return;
      }
      if (advData.status === 'pending_approval') {
        setError('Your account is pending admin approval. You will be able to login once approved.');
        setLoading(false);
        return;
      }
      if (advData.status === 'suspended') {
        setError('Your account has been suspended. Please contact HealQR support.');
        setLoading(false);
        return;
      }
      if (advData.status !== 'active') {
        setError('Your account is not active. Please contact HealQR admin.');
        setLoading(false);
        return;
      }

      // Send magic link
      const actionCodeSettings = {
        url: `${window.location.origin}/?page=advertiser-verify`,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth!, email.toLowerCase().trim(), actionCodeSettings);
      localStorage.setItem('healqr_advertiser_email_for_signin', email.toLowerCase().trim());

      setSent(true);
      toast.success('Login link sent to your email!');
    } catch (err: any) {
      console.error('Advertiser login error:', err);
      setError(err.message || 'Failed to send login link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
          <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[100px]" />
        </div>
        <div className="w-full max-w-md relative z-10">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden p-8 text-center">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Check Your Email</h2>
            <p className="text-slate-400 mb-4">
              We've sent a secure login link to <span className="text-emerald-400 font-medium">{email}</span>
            </p>
            <p className="text-slate-500 text-sm mb-6">
              Click the link in your email to access your advertiser dashboard. The link expires in 1 hour.
            </p>
            <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
              <Mail className="w-4 h-4" />
              <span>Check your inbox and spam folder</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <h2 className="text-xl font-semibold text-white">Advertiser Login</h2>
            <button
              onClick={onBack}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <div className="flex flex-col items-center mb-6">
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 mb-4 shadow-lg">
                <img src={healQRLogo} alt="HealQR Ads" className="h-14 w-auto" />
              </div>
              <p className="text-slate-400 text-center text-sm">
                Log in to manage your campaigns and track performance
              </p>
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

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none h-full">
                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-slate-600"
                    placeholder="company@email.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-lg shadow-lg shadow-emerald-500/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending Login Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Login Link</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
              <p className="text-slate-400 text-sm">
                Don't have an account?{' '}
                <button 
                  onClick={onSignUp}
                  className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline transition-colors"
                >
                  Create Account
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

