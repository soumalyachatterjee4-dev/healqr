import { Input } from './ui/input';
import { Button } from './ui/button';
import { Mail, ArrowLeft, User, Phone, Building2, Loader2, Briefcase } from 'lucide-react';
import { useState } from 'react';
import healqrLogo from '../assets/healqr.logo.png';
import { auth, db } from '../lib/firebase/config';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

interface MRSignUpProps {
  onBack: () => void;
  onLogin: () => void;
}

export default function MRSignUp({ onBack, onLogin }: MRSignUpProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [division, setDivision] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const handleSignUp = async () => {
    if (!email || !name || !phone || !company || !division) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }

    setLoading(true);
    try {
      // Check if already registered as MR
      const existing = await getDocs(query(collection(db, 'medicalReps'), where('email', '==', email.toLowerCase().trim())));
      if (!existing.empty) {
        toast.error('This email is already registered. Please login instead.');
        setLoading(false);
        return;
      }

      // Create pending signup
      await addDoc(collection(db, 'pending_mr_signups'), {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        phone: phone.trim(),
        company: company.trim(),
        division: division.trim(),
        status: 'pending-verification',
        createdAt: serverTimestamp(),
      });

      // Send magic link
      const actionCodeSettings = {
        url: `${window.location.origin}/verify-login?email=${encodeURIComponent(email.toLowerCase().trim())}&type=mr&signup=true`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email.toLowerCase().trim(), actionCodeSettings);
      window.localStorage.setItem('healqr_email_for_signin', email.toLowerCase().trim());

      setLinkSent(true);
      toast.success('Verification link sent!');
    } catch (error: any) {
      console.error('MR signup error:', error);
      toast.error('Signup failed', { description: error.message });
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
            We've sent a verification link to <span className="text-white font-medium">{email}</span>
          </p>
          <p className="text-gray-500 text-sm">Click the link in the email to complete your registration as a Medical Representative.</p>
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
            <div className="h-16 w-16 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center mx-auto mb-6 ring-2 ring-blue-500/30">
              <Briefcase className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Medical Representative</h1>
            <p className="text-gray-400">Register to connect with doctors</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit phone number"
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Company Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Your pharma company"
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Division</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  placeholder="e.g. Cardiology, Orthopedics"
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <Button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending link...
                </>
              ) : (
                'Get Verification Link'
              )}
            </Button>

            <p className="text-center text-sm text-gray-500">
              Already registered?{' '}
              <button onClick={onLogin} className="text-blue-400 hover:text-blue-300">
                Log in
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
