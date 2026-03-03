import { useState } from 'react';
import { auth } from '../lib/firebase/config';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { db } from '../lib/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Loader2, ArrowLeft, Shield, Building2, CheckCircle2, Mail } from 'lucide-react';
import healqrLogo from '../assets/healqr-logo.png';
import { toast } from 'sonner';

interface PharmaLoginProps {
  onBack: () => void;
  onSignUp?: () => void;
}

export default function PharmaLogin({ onBack, onSignUp }: PharmaLoginProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!db) throw new Error('Database not available');

      // Verify this email belongs to a pharma company
      const pharmaRef = collection(db, 'pharmaCompanies');
      const q = query(pharmaRef, where('contactEmail', '==', email.toLowerCase().trim()));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError('No distributor account found for this email. Please sign up first.');
        setLoading(false);
        return;
      }

      const companyData = snap.docs[0].data();
      if (companyData.status === 'pending_verification') {
        setError('Your email is not yet verified. Please check your inbox for the verification link we sent during sign up.');
        setLoading(false);
        return;
      }
      if (companyData.status === 'pending_approval') {
        setError('Your account is pending admin approval. You will be able to login once approved.');
        setLoading(false);
        return;
      }
      if (companyData.status === 'suspended') {
        setError('Your account has been suspended. Please contact HealQR support.');
        setLoading(false);
        return;
      }
      if (companyData.status !== 'active') {
        setError('Your account is not active. Please contact HealQR admin.');
        setLoading(false);
        return;
      }

      // Send magic link
      const actionCodeSettings = {
        url: `${window.location.origin}/?page=pharma-verify`,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth!, email.toLowerCase().trim(), actionCodeSettings);
      localStorage.setItem('healqr_pharma_email_for_signin', email.toLowerCase().trim());

      setSent(true);
      toast.success('Login link sent to your email!');
    } catch (err: any) {
      console.error('Pharma login error:', err);
      setError(err.message || 'Failed to send login link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <div className="bg-black px-4 py-2 rounded-lg">
              <img src={healqrLogo} alt="HealQR" className="h-10" />
            </div>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-8 md:p-12 border border-zinc-800 text-center">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Check Your Email</h2>
            <p className="text-gray-400 mb-4">
              We've sent a login link to <span className="text-emerald-500 font-medium">{email}</span>
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Click the link in your email to access the Pharma Portal. The link expires in 1 hour.
            </p>
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
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="bg-black px-4 py-2 rounded-lg">
            <img src={healqrLogo} alt="HealQR" className="h-10" />
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900 rounded-2xl p-8 md:p-12 border border-zinc-800">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-10 h-10 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">healQR Distributors</h1>
            <p className="text-gray-400 text-sm">Login to your distributor company dashboard</p>
          </div>

          {/* Security Badge */}
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2.5 mb-6">
            <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-emerald-400 text-xs">Secure passwordless login via email link</span>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-400 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Company Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="company@example.com"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-colors"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending Login Link...
                </>
              ) : (
                'Send Login Link'
              )}
            </button>
          </form>

          {/* Back */}
          <button
            onClick={onBack}
            className="mt-6 w-full text-center text-gray-400 hover:text-emerald-500 text-sm flex items-center justify-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          {/* Sign Up Link */}
          {onSignUp && (
            <p className="mt-4 text-center text-gray-500 text-sm">
              Don't have an account?{' '}
              <button
                onClick={onSignUp}
                className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
              >
                Sign Up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
