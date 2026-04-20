import { Input } from './ui/input';
import { Button } from './ui/button';
import { Mail, ArrowLeft, Stethoscope, Loader2 } from 'lucide-react';
import { useState } from 'react';
import healqrLogo from '../assets/healqr.logo.png';
import { auth } from '../lib/firebase/config';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { toast } from 'sonner';

interface ParamedicalLoginProps {
  onBack: () => void;
  onSignUp: () => void;
  onSuccess?: () => void;
}

export default function ParamedicalLogin({ onBack, onSignUp, onSuccess }: ParamedicalLoginProps) {
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
      const actionCodeSettings = {
        url: `${window.location.origin}/verify-login?email=${encodeURIComponent(email.toLowerCase().trim())}&type=paramedical`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email.toLowerCase().trim(), actionCodeSettings);
      window.localStorage.setItem('healqr_email_for_signin', email.toLowerCase().trim());
      setLinkSent(true);
      toast.success('Login link sent!');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Failed to send login link', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (linkSent) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="h-20 w-20 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto">
            <Mail className="h-10 w-10 text-teal-500" />
          </div>
          <h2 className="text-3xl font-bold">Check your inbox</h2>
          <p className="text-gray-400">
            We've sent a login link to <span className="text-white font-medium">{email}</span>
          </p>
          <p className="text-gray-500 text-sm">Click the link in the email to access your dashboard.</p>
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
            <h1 className="text-2xl font-bold mb-2">Professional Login</h1>
            <p className="text-gray-400">Sign in to your healthcare professional dashboard</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm text-gray-300">Registered Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input value={email} onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-teal-500"
                  placeholder="email@example.com" type="email"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
              </div>
            </div>
          </div>

          <Button onClick={handleLogin} disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white h-14 rounded-lg text-lg font-medium mt-6 mb-6">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Sending Link...</> : 'Send Login Link'}
          </Button>

          <div className="text-center mb-6">
            <p className="text-gray-400">
              Not registered yet?{' '}
              <button onClick={onSignUp} className="text-teal-500 hover:underline">Sign up</button>
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
