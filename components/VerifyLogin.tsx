import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase/config';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import healqrLogo from '../assets/healqr-logo.png';

interface VerifyLoginProps {
  onSuccess?: () => void;
  onError?: () => void;
}

export default function VerifyLogin({ onSuccess, onError }: VerifyLoginProps) {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying login...');

  useEffect(() => {
    verifyLoginLink();
  }, []);

  const verifyLoginLink = async () => {
    try {
      if (!auth) {
        throw new Error('Firebase not configured');
      }

      // Check if this is an email link
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setStatus('error');
        setMessage('Invalid login link');
        return;
      }

      // Get email from localStorage (multiple sources)
      let email = localStorage.getItem('healqr_email_for_signin') 
                  || localStorage.getItem('healqr_user_email');
      
      if (!email) {
        // If not in localStorage, ask user to enter their email
        email = window.prompt('Please enter the email address you used to login:');
        
        if (!email || !email.includes('@')) {
          throw new Error('Valid email address is required for login');
        }
        
        // Store for future use (normalized)
        email = email.toLowerCase().trim();
        localStorage.setItem('healqr_email_for_signin', email);
      } else {
        // Normalize email from storage
        email = email.toLowerCase().trim();
      }

      // Sign in with email link
      const result = await signInWithEmailLink(auth, email, window.location.href);
      const user = result.user;

      console.log('✅ Login successful:', user.uid);

      // Quick check for user type (assistant, clinic, or doctor)
      const { db } = await import('../lib/firebase/config');
      if (db) {
        const { collection, query, where, getDocs, limit, doc, getDoc } = await import('firebase/firestore');
        
        // First check if this is an assistant (email-based)
        const assistantsRef = collection(db, 'assistants');
        const assistantQuery = query(
          assistantsRef, 
          where('assistantEmail', '==', email), 
          where('isActive', '==', true),
          limit(1)
        );
        const assistantSnap = await getDocs(assistantQuery);
        
        if (!assistantSnap.empty) {
          // This is an assistant - store minimal data, App.tsx will load full profile
          const assistantData = assistantSnap.docs[0].data();
          localStorage.setItem('healqr_is_assistant', 'true');
          localStorage.setItem('healqr_assistant_pages', JSON.stringify(assistantData.allowedPages || ['dashboard']));
          localStorage.setItem('healqr_assistant_doctor_id', assistantData.doctorId);
          localStorage.setItem('userId', assistantData.doctorId);
          localStorage.setItem('healqr_authenticated', 'true');
          localStorage.setItem('healqr_user_email', email);
          
          console.log('✅ Assistant login detected:', email);
        } else {
          // Check if this is a clinic user (UID-based)
          const clinicDocRef = doc(db, 'clinics', user.uid);
          const clinicDoc = await getDoc(clinicDocRef);
          
          if (clinicDoc.exists()) {
            // This is a clinic - store minimal data
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('healqr_user_email', email);
            localStorage.setItem('healqr_authenticated', 'true');
            localStorage.setItem('healqr_is_clinic', 'true');
            
            console.log('✅ Clinic login detected:', user.uid);
          } else {
            // Regular doctor - store just the UID, App.tsx will load full profile
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('healqr_user_email', email);
            localStorage.setItem('healqr_authenticated', 'true');
            
            console.log('✅ Doctor login detected:', user.uid);
          }
        }
      }

      // Clear temporary data
      localStorage.removeItem('healqr_email_for_signin');

      setStatus('success');
      const isAssistant = localStorage.getItem('healqr_is_assistant');
      const isClinic = localStorage.getItem('healqr_is_clinic');
      setMessage(isAssistant ? 'Assistant access granted!' : isClinic ? 'Clinic login successful!' : 'Login successful!');

      console.log('✅ Login complete, auth session established');

      // Immediately redirect to clean URL - App.tsx will handle routing based on localStorage
      if (onSuccess) {
        onSuccess();
      } else {
        // Clean URL and trigger app state update
        window.history.replaceState({}, '', '/');
        // Force app to re-check auth state
        window.dispatchEvent(new Event('popstate'));
        
        // Show success message briefly
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }

    } catch (error: any) {
      console.error('❌ Login verification error:', error);
      
      // If link is invalid/expired, redirect to landing page
      if (error.code === 'auth/invalid-action-code' || error.code === 'auth/expired-action-code') {
        setStatus('error');
        setMessage('This login link has expired or was already used. Please request a new one.');
        
        // Redirect to landing after 3 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
        return;
      }
      
      setStatus('error');
      setMessage(error.message || 'Failed to verify login');
      if (onError) onError();
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
              <h2 className="text-2xl font-semibold mb-2">Verifying Login</h2>
              <p className="text-gray-400">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2 text-emerald-500">
                Welcome Back! 🎉
              </h2>
              <p className="text-gray-400 mb-6">{message}</p>
              <p className="text-sm text-gray-500">
                Redirecting to dashboard...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2 text-red-500">
                Login Failed
              </h2>
              <p className="text-gray-400 mb-6">{message}</p>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg font-medium"
              >
                Back to Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
