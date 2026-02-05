import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase/config';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import healqrLogo from '../assets/healqr-logo.png';

interface AdminVerifyLoginProps {
  onSuccess?: (email: string) => void;
  onError?: () => void;
}

export default function AdminVerifyLogin({ onSuccess, onError }: AdminVerifyLoginProps) {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying admin login...');

  useEffect(() => {
    verifyAdminLoginLink();
  }, []);

  const verifyAdminLoginLink = async () => {
    try {
      if (!auth) {
        throw new Error('Firebase not configured');
      }

      // Check if this is an email link
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setStatus('error');
        setMessage('Invalid admin login link');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        return;
      }

      // Get email from localStorage
      let email = localStorage.getItem('healqr_admin_email_for_signin');
      
      if (!email) {
        // Ask user to enter their email
        email = window.prompt('Please enter the admin email address:');
        
        if (!email || !email.includes('@')) {
          throw new Error('Valid email address is required');
        }
      }

      // Verify email is authorized in Firestore admins collection
      if (!db) {
        throw new Error('Firebase not configured');
      }

      const adminsCollectionRef = doc(db, 'admins', email.toLowerCase());
      const adminDocSnapshot = await getDoc(adminsCollectionRef);
      
      if (!adminDocSnapshot.exists() || adminDocSnapshot.data()?.isAuthorized !== true) {
        // Check legacy adminProfiles collection as fallback
        const adminProfileRef = doc(db, 'adminProfiles', 'super_admin');
        const adminProfileDoc = await getDoc(adminProfileRef);
        
        let isAuthorized = false;
        if (adminProfileDoc.exists()) {
          const adminData = adminProfileDoc.data();
          isAuthorized = adminData?.email?.toLowerCase() === email.toLowerCase();
        }

        if (!isAuthorized) {
          setStatus('error');
          setMessage('⛔ Unauthorized. This email is not an approved admin.');
          localStorage.removeItem('healqr_admin_email_for_signin');
          localStorage.removeItem('healqr_admin_email');
          localStorage.removeItem('healqr_admin_authenticated');
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
          return;
        }
      }

      // Sign in with email link
      const result = await signInWithEmailLink(auth, email, window.location.href);
      const user = result.user;

      // Wait for auth state to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      // Store admin session
      localStorage.setItem('healqr_admin_email', email);
      localStorage.setItem('healqr_admin_authenticated', 'true');

      // Clear temporary data
      localStorage.removeItem('healqr_admin_email_for_signin');

      setStatus('success');
      setMessage('Admin login successful!');

      // Redirect to admin panel
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(email);
        } else {
          window.location.href = '/';
        }
      }, 1500);

    } catch (error: any) {
      console.error('❌ Admin login error:', error);
      setStatus('error');
      
      if (error.code === 'auth/invalid-action-code') {
        setMessage('Login link expired or already used. Redirecting...');
      } else {
        setMessage(error.message || 'Admin login failed');
      }
      
      setTimeout(() => {
        if (onError) {
          onError();
        } else {
          window.location.href = '/';
        }
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={healqrLogo} alt="HealQR" className="h-12" />
        </div>

        {/* Card */}
        <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-16 h-16 text-emerald-500 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-semibold mb-2">Verifying Admin</h2>
              <p className="text-gray-400">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2 text-emerald-500">
                Welcome, Admin! 🔐
              </h2>
              <p className="text-gray-400 mb-6">{message}</p>
              <p className="text-sm text-gray-500">
                Redirecting to admin panel...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2 text-red-500">
                Access Denied
              </h2>
              <p className="text-gray-400 mb-6">{message}</p>
              <p className="text-sm text-gray-500">
                Redirecting to home...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
