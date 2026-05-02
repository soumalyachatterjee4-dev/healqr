import { Input } from './ui/input';
import { Button } from './ui/button';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import healqrLogo from '../assets/healqr.logo.png';
import { auth, db } from '../lib/firebase/config';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { toast } from 'sonner';

interface MRLoginProps {
  onBack: () => void;
  onSignUp: () => void;
}

export default function MRLogin({ onBack, onSignUp }: MRLoginProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const handleLogin = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }

    setLoading(true);
    try {
      // Check if MR exists
      const existing = await getDocs(query(collection(db, 'medicalReps'), where('email', '==', email.toLowerCase().trim())));
      if (existing.empty) {
        toast.error('Email not found. Please sign up first.');
        setLoading(false);
        return;
      }

      // Send magic link
      const actionCodeSettings = {
        url: `${window.location.origin}/verify-login?email=${encodeURIComponent(email.toLowerCase().trim())}&type=mr`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email.toLowerCase().trim(), actionCodeSettings);
      window.localStorage.setItem('healqr_email_for_signin', email.toLowerCase().trim());

      setLinkSent(true);
      toast.success('Login link sent!');
    } catch (error: any) {
      console.error('MR login error:', error);
      toast.error('Login failed', { description: error.message });
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
            We've sent a login link to <span className="text-white font-medium">{email}</span>
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
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={healqrLogo} alt="HealQR Logo" className="h-10 w-auto" />
        </div>

        <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">MR Login</h1>
            <p className="text-gray-400">Enter your registered email</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending link...
                </>
              ) : (
                'Send Login Link'
              )}
            </Button>

            <p className="text-center text-sm text-gray-500">
              Not registered?{' '}
              <button onClick={onSignUp} className="text-blue-400 hover:text-blue-300">
                Sign up
              </button>
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mt-6 mx-auto text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
      </div>
    </div>
  );
}
