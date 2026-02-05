import { useState } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Mail, ArrowLeft, Shield } from 'lucide-react';
import healqrLogo from '../assets/healqr-logo.png';
import { auth, db } from '../lib/firebase/config';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface AdminLoginProps {
  onSuccess: (email: string) => void;
  onBack: () => void;
}

export default function AdminLogin({ onSuccess, onBack }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async () => {
    setError('');

    // Validate email format
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      if (!db) {
        throw new Error('Firebase not configured');
      }

      // Check admins collection for authorized admin emails
      const adminsCollectionRef = doc(db, 'admins', email.toLowerCase());
      const adminDocSnapshot = await getDoc(adminsCollectionRef);
      
      if (adminDocSnapshot.exists() && adminDocSnapshot.data()?.isAuthorized === true) {
        // Admin is authorized - proceed with login
        console.log('✅ Authorized admin email:', email);
      } else {
        // Check legacy adminProfiles collection as fallback
        const adminProfileRef = doc(db, 'adminProfiles', 'super_admin');
        const adminProfileDoc = await getDoc(adminProfileRef);
        
        if (adminProfileDoc.exists()) {
          const adminData = adminProfileDoc.data();
          const registeredEmail = adminData?.email?.toLowerCase();

          if (registeredEmail !== email.toLowerCase()) {
            setError('⛔ Unauthorized access. This email is not registered as an admin.');
            setLoading(false);
            return;
          }
        } else {
          // No admin profile found - unauthorized
          setError('⛔ Unauthorized access. This email is not registered as an admin.');
          setLoading(false);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking admin email:', error);
      setError('Failed to verify admin credentials. Please check your connection.');
      setLoading(false);
      return;
    }

    try {
      if (!auth) {
        throw new Error('Firebase not configured');
      }

      // Store admin email for verification
      localStorage.setItem('healqr_admin_email_for_signin', email);

      // Firebase Email Link configuration for admin login
      const actionCodeSettings = {
        url: `${window.location.origin}/admin-verify`,
        handleCodeInApp: true,
      };

      // Send sign-in link to admin email
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);

      toast.success('Admin login link sent!', {
        description: `Check your inbox at ${email}`,
      });

      console.log('✅ Admin login link sent to:', email);
      
      // Close modal after sending link
      setTimeout(() => {
        onBack();
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Admin login error:', error);
      setError(error.message || 'Failed to send login link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-zinc-900 rounded-2xl p-8 md:p-12 border border-zinc-800">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="bg-black px-4 py-2 rounded-lg">
              <img src={healqrLogo} alt="HealQR" className="h-12" />
            </div>
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center mb-6">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-full p-4">
              <Shield className="w-8 h-8 text-emerald-500" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-center mb-2">Admin Access</h1>
          <p className="text-center text-gray-400 text-sm mb-8">
            Secure login for authorized administrators only
          </p>

          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-3 mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-2 mb-8">
            <Label htmlFor="email">Admin Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                id="email"
                type="email"
                placeholder="admin@healqr.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleEmailSubmit()}
                className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                disabled={loading}
              />
            </div>
          </div>

          {/* Send Link Button */}
          <Button
            onClick={handleEmailSubmit}
            disabled={loading || !email}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                Sending link...
              </span>
            ) : (
              'Send Link'
            )}
          </Button>
        </div>

        {/* Back Button */}
        <button
          onClick={onBack}
          className="mt-6 flex items-center gap-2 text-gray-400 hover:text-emerald-500 transition-colors mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
      </div>
    </div>
  );
}