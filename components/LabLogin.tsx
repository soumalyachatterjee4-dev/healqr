import { Input } from './ui/input';
import { Button } from './ui/button';
import { Mail, ArrowLeft, Microscope } from 'lucide-react';
import { useState } from 'react';
import healqrLogo from '../assets/healqr.logo.png';
import { auth } from '../lib/firebase/config';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { toast } from 'sonner';

interface LabLoginProps {
  onBack: () => void;
  onSignUp: () => void;
  onSuccess?: () => void;
}

export default function LabLogin({ onBack, onSignUp, onSuccess }: LabLoginProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const handleLogin = async () => {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);

    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/verify-login?email=${encodeURIComponent(email)}&type=lab`,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('healqr_email_for_signin', email);

      setLinkSent(true);
      toast.success('Login Link Sent', {
        description: 'Check your email to log in.'
      });

    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Login Failed', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (linkSent) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="h-20 w-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
            <Mail className="h-10 w-10 text-purple-500" />
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
        {/* Header with Logo */}
        <div className="flex justify-center mb-8">
          <img src={healqrLogo} alt="HealQR Logo" className="h-10 w-auto" />
        </div>

        {/* Main Card */}
        <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
          <div className="text-center mb-8">
            <div className="h-16 w-16 bg-purple-500/10 rounded-xl flex items-center justify-center mx-auto mb-6">
              <Microscope className="w-8 h-8 text-purple-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Lab / Diagnostic Center Login</h1>
            <p className="text-gray-400">Access your lab dashboard</p>
          </div>

          {/* Email Field */}
          <div className="mb-6">
            <label className="block mb-3">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 bg-black border-zinc-800 text-white h-14 rounded-lg focus:border-purple-500"
                placeholder="lab@example.com"
                type="email"
              />
            </div>
          </div>

          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white h-14 rounded-lg text-lg font-medium mb-6"
          >
            {loading ? 'Sending Link...' : 'Send Login Link'}
          </Button>

          <div className="text-center mb-6">
            <p className="text-gray-400">
              Don't have an account?{' '}
              <button onClick={onSignUp} className="text-purple-500 hover:underline">
                Sign up
              </button>
            </p>
          </div>

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
      </div>
    </div>
  );
}
