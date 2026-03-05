import { Input } from './ui/input';
import { Button } from './ui/button';
import { X, CheckCircle2, Mail, ArrowRight, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import healqrLogo from '../assets/healqr-logo.png';
import { auth } from '../lib/firebase/config';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { toast } from 'sonner';

interface LoginProps {
  onNext: (email: string) => void;
  onSignUp: () => void;
  onClose: () => void;
  isDemoMode?: boolean;
}

export default function Login({ onNext, onSignUp, onClose, isDemoMode }: LoginProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [isAssistantVerified, setIsAssistantVerified] = useState(false);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);

    try {
      if (!auth) {
        throw new Error('Firebase not configured');
      }

      // Normalize email at the start
      const normalizedEmail = email.toLowerCase().trim();

      // Check if this email belongs to a doctor OR assistant
      const { db } = await import('../lib/firebase/config');
      
      if (db) {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        
        // ✅ Check doctors collection FIRST (this is the Doctor Login page)
        const doctorsRef = collection(db, 'doctors');
        const q = query(doctorsRef, where('email', '==', normalizedEmail));
        const existingDocs = await getDocs(q);
        
        if (existingDocs.empty) {
          // Not a doctor — check if they're an assistant as fallback
          try {
            const assistantsRef = collection(db, 'assistants');
            const assistantQuery = query(assistantsRef, where('assistantEmail', '==', normalizedEmail), where('isActive', '==', true));
            const assistantSnap = await getDocs(assistantQuery);
            
            if (!assistantSnap.empty) {
              // This is an assistant - approved to login
              toast.info('Assistant login detected', {
                description: 'Sending magic link to assistant email'
              });
            } else {
              toast.error('Account not found', {
                description: 'This email is not registered as a doctor or assistant. Please sign up.',
              });
              setLoading(false);
              return;
            }
          } catch (assistantError) {
            // If assistant query fails due to permissions, just show account not found
            console.warn('Could not check assistants collection:', assistantError);
            toast.error('Account not found', {
              description: 'This email is not registered as a doctor. Please sign up.',
            });
            setLoading(false);
            return;
          }
        }
        // If doctor exists, proceed directly — no need to check assistants
      }

      // Store email for verification (use normalized email)
      localStorage.setItem('healqr_email_for_signin', normalizedEmail);

      // Firebase Email Link configuration for login
      const actionCodeSettings = {
        url: `${window.location.origin}/verify-login`,
        handleCodeInApp: true,
      };

      // Send sign-in link to email (use normalized email)
      console.log('🔐 Attempting to send magic link to:', normalizedEmail);
      await sendSignInLinkToEmail(auth, normalizedEmail, actionCodeSettings);
      console.log('✅ Magic link sent successfully to:', normalizedEmail);

      setLinkSent(true);
      toast.success('Login link sent!', {
        description: `Check your inbox at ${normalizedEmail}`,
      });
      
      // Auto-close modal after 3 seconds to avoid confusion
      setTimeout(() => {
        onClose();
      }, 3000);
      
    } catch (error: any) {
      console.error('❌ Login link send error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = error.message || 'Please try again';
      
      // Provide specific error messages
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format';
      } else if (error.code === 'auth/missing-android-pkg-name') {
        errorMessage = 'App configuration error. Please contact support.';
      } else if (error.code === 'auth/missing-continue-uri') {
        errorMessage = 'Configuration error. Please contact support.';
      } else if (error.code === 'auth/invalid-continue-uri') {
        errorMessage = 'Invalid redirect URL. Please contact support.';
      } else if (error.code === 'auth/unauthorized-continue-uri') {
        errorMessage = 'Unauthorized redirect URL. Please contact support.';
      }
      
      toast.error('Failed to send login link', {
        description: errorMessage,
      });
      setLoading(false);
    }
  };

  if (linkSent) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-zinc-900 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-zinc-800 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="bg-black px-4 py-2 rounded-lg">
              <img src={healqrLogo} alt="HealQR" className="h-12" />
            </div>
          </div>

          {/* Success State */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-full mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            
            <h2 className="text-white mb-3">Login Link Sent!</h2>
            
            <p className="text-gray-400 text-sm mb-6">
              We've sent a login link to:
            </p>
            
            <div className="bg-zinc-800 rounded-lg p-4 mb-6 border border-zinc-700">
              <p className="text-emerald-500">{email}</p>
            </div>

            <div className="space-y-3 text-sm text-gray-300">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                Check your inbox and click the login link
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                You'll be redirected to your dashboard automatically
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                Link expires in 15 minutes
              </p>
            </div>

            {/* Post-link actions */}
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <div className="space-y-3">
                <p className="text-sm text-gray-400 text-center">
                  If the link opened in another browser/tab:
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // Navigate to root - will redirect to dashboard if logged in
                      window.location.href = '/';
                    }}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-zinc-800 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-300"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-black px-4 py-2 rounded-lg">
            <img src={healqrLogo} alt="HealQR" className="h-12" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-white mb-2">Welcome Back</h2>
          <p className="text-gray-400 text-sm">
            Log in to access your doctor dashboard
          </p>
          {isAssistantVerified && (
            <div className="mt-3 inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full text-xs">
              <Users className="w-3.5 h-3.5" />
              <span>Assistant Verified ✓</span>
            </div>
          )}
        </div>

        {/* Login Form */}
        <form onSubmit={handleSendLink} className="space-y-6">
          {/* Email Input */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <Input
                type="email"
                placeholder={isAssistantVerified ? "Your email address" : "doctor@example.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 h-12 bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500"
                autoFocus
                readOnly={isAssistantVerified && !!email}
              />
            </div>
          </div>

          {/* Send Link Button */}
          <Button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-black h-12 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></span>
                Sending link...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Send Login Link
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-zinc-900 text-gray-400">or</span>
          </div>
        </div>

        {/* Sign Up Link */}
        <button
          onClick={onSignUp}
          className="w-full text-center text-sm text-emerald-500 hover:text-emerald-400"
        >
          Don't have an account? <span className="underline">Sign Up</span>
        </button>

        {/* Info */}
        <div className="mt-6 pt-6 border-t border-zinc-800">
          <p className="text-xs text-gray-400 text-center">
            By logging in, you agree to HealQR's Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}