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

        // Determine login origin from URL params (Doctor Login vs Clinic Login)
        const searchParams = new URLSearchParams(window.location.search);
        const loginType = searchParams.get('type'); // 'clinic' if from Clinic Login, null if from Doctor Login

        if (!assistantSnap.empty) {
          // This is an assistant - store minimal data, App.tsx will load full profile
          const assistantData = assistantSnap.docs[0].data();
          localStorage.setItem('healqr_is_assistant', 'true');
          localStorage.setItem('healqr_assistant_pages', JSON.stringify(assistantData.allowedPages || ['dashboard']));
          localStorage.setItem('healqr_assistant_doctor_id', assistantData.doctorId);
          localStorage.setItem('userId', assistantData.doctorId);
          localStorage.setItem('healqr_authenticated', 'true');
          localStorage.setItem('healqr_user_email', email);

          // Check if assistant belongs to a clinic
          if (assistantData.isClinic) {
            localStorage.setItem('healqr_is_clinic', 'true');
          } else {
            localStorage.removeItem('healqr_is_clinic');
          }

          // Pre-fetch doctor/clinic name for instant dashboard display
          try {
            if (assistantData.isClinic) {
              const clinicRef = doc(db, 'clinics', assistantData.doctorId);
              const clinicSnap = await getDoc(clinicRef);
              if (clinicSnap.exists() && clinicSnap.data().name) {
                localStorage.setItem('healqr_user_name', clinicSnap.data().name);
              }
            } else {
              const drRef = doc(db, 'doctors', assistantData.doctorId);
              const drSnap = await getDoc(drRef);
              if (drSnap.exists() && drSnap.data().name) {
                localStorage.setItem('healqr_user_name', drSnap.data().name);
              }
            }
          } catch (prefetchErr) {
            console.warn('Could not pre-fetch profile name:', prefetchErr);
          }

          console.log('✅ Assistant login detected:', email, assistantData.isClinic ? '(clinic)' : '(doctor)');
        } else if (loginType === 'clinic') {
          // ✅ LOGIN CAME FROM CLINIC LOGIN — check clinics collection first
          const clinicDocRef = doc(db, 'clinics', user.uid);
          const clinicDoc = await getDoc(clinicDocRef);

          if (clinicDoc.exists()) {
            // This is a clinic - store minimal data
            const clinicData = clinicDoc.data();
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('healqr_user_email', email);
            localStorage.setItem('healqr_authenticated', 'true');
            localStorage.setItem('healqr_is_clinic', 'true');
            localStorage.removeItem('healqr_is_assistant');
            if (clinicData.name) {
              localStorage.setItem('healqr_user_name', clinicData.name);
            }

            console.log('✅ Clinic login detected:', user.uid);
          } else {
            console.error('❌ User tried to login as clinic but no clinic doc found');
            await auth.signOut();
            throw new Error('This email is not registered as a Clinic. Please use the Doctor Login or Register as a Clinic.');
          }
        } else {
          // ✅ LOGIN CAME FROM DOCTOR LOGIN — check doctors collection FIRST
          const doctorDocRef = doc(db, 'doctors', user.uid);
          const doctorDoc = await getDoc(doctorDocRef);

          if (doctorDoc.exists()) {
            // Regular doctor - load name + profile from Firestore for instant dashboard display
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('healqr_user_email', email);
            localStorage.setItem('healqr_authenticated', 'true');
            localStorage.removeItem('healqr_is_clinic'); // Ensure this is removed
            localStorage.removeItem('healqr_is_assistant');

            // Pre-fetch doctor profile so dashboard shows name immediately
            const doctorData = doctorDoc.data();
            if (doctorData.name) {
              localStorage.setItem('healqr_user_name', doctorData.name);
            }
            if (doctorData.profileImage) {
              localStorage.setItem('healqr_profile_photo', doctorData.profileImage);
            }
            // Pre-cache doctor stats for instant review display
            if (doctorData.stats) {
              localStorage.setItem('healqr_doctor_stats', JSON.stringify({
                averageRating: doctorData.stats.averageRating || 0,
                totalReviews: doctorData.stats.totalReviews || 0
              }));
            }

            console.log('✅ Doctor login detected:', user.uid);
          } else {
            // Doctor doc not found — check if they have a clinic account as fallback
            const clinicDocRef = doc(db, 'clinics', user.uid);
            const clinicDoc = await getDoc(clinicDocRef);

            if (clinicDoc.exists()) {
              const clinicData = clinicDoc.data();
              localStorage.setItem('userId', user.uid);
              localStorage.setItem('healqr_user_email', email);
              localStorage.setItem('healqr_authenticated', 'true');
              localStorage.setItem('healqr_is_clinic', 'true');
              if (clinicData.name) {
                localStorage.setItem('healqr_user_name', clinicData.name);
              }
              console.log('✅ Clinic login detected (fallback from doctor login):', user.uid);
            } else {
              // No doctor or clinic doc found
              console.error('❌ No doctor or clinic account found for:', user.uid);
              await auth.signOut();
              throw new Error('This email is not registered. Please sign up first.');
            }
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
