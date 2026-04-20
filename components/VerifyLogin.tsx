import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase/config';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import healqrLogo from '../assets/healqr.logo.png';

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
      // ✅ CRITICAL: Clear stale session flags BEFORE signing in
      // This prevents onAuthStateChanged from reading leftover flags and routing to wrong dashboard
      localStorage.removeItem('healqr_is_clinic');
      localStorage.removeItem('healqr_is_lab');
      localStorage.removeItem('healqr_is_assistant');
      localStorage.removeItem('healqr_assistant_pages');
      localStorage.removeItem('healqr_assistant_doctor_id');
      localStorage.removeItem('healqr_doctor_stats');
      localStorage.removeItem('healqr_profile_photo');

      const result = await signInWithEmailLink(auth, email, window.location.href);
      const user = result.user;


      // Quick check for user type (assistant, clinic, or doctor)
      const { db } = await import('../lib/firebase/config');
      if (db) {
        const { collection, query, where, getDocs, limit, doc, getDoc } = await import('firebase/firestore');

        // Determine login origin from URL params (Doctor Login vs Clinic Login)
        const searchParams = new URLSearchParams(window.location.search);
        const loginType = searchParams.get('type'); // 'clinic' if from Clinic Login, null if from Doctor Login

        // For clinic logins: check clinic owner / branch manager FIRST, then fall back to assistant
        // For doctor logins: check assistant FIRST (original behavior)
        if (loginType === 'clinic') {
          // ✅ CLINIC LOGIN FLOW: Clinic Owner → Branch Manager → Clinic Assistant (in priority order)
          const clinicDocRef = doc(db, 'clinics', user.uid);
          const clinicDoc = await getDoc(clinicDocRef);

          if (clinicDoc.exists()) {
            // This is a clinic owner - store minimal data
            const clinicData = clinicDoc.data();
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('healqr_user_email', email);
            localStorage.setItem('healqr_authenticated', 'true');
            localStorage.setItem('healqr_is_clinic', 'true');
            localStorage.removeItem('healqr_is_assistant');
            localStorage.removeItem('healqr_is_location_manager');
            localStorage.removeItem('healqr_location_id');
            localStorage.removeItem('healqr_parent_clinic_id');
            if (clinicData.name) {
              localStorage.setItem('healqr_user_name', clinicData.name);
            }

          } else {
            // Not a clinic owner — check if branch location manager
            const clinicsRef = collection(db, 'clinics');
            const branchQuery = query(clinicsRef, where('locationEmails', 'array-contains', email.toLowerCase()));
            const branchSnap = await getDocs(branchQuery);

            if (!branchSnap.empty) {
              const parentClinic = branchSnap.docs[0];
              const parentData = parentClinic.data();
              const matchedLocation = (parentData.locations || []).find(
                (loc: any) => loc.email?.toLowerCase() === email.toLowerCase()
              );

              localStorage.setItem('userId', user.uid);
              localStorage.setItem('healqr_user_email', email);
              localStorage.setItem('healqr_authenticated', 'true');
              localStorage.setItem('healqr_is_clinic', 'true');
              localStorage.setItem('healqr_is_location_manager', 'true');
              localStorage.setItem('healqr_parent_clinic_id', parentClinic.id);
              localStorage.removeItem('healqr_is_assistant');
              if (matchedLocation) {
                localStorage.setItem('healqr_location_id', matchedLocation.id);
                localStorage.setItem('healqr_user_name', matchedLocation.name || parentData.name);
              } else {
                localStorage.setItem('healqr_user_name', parentData.name);
              }

            } else {
              // Not a branch manager either — check if clinic assistant
              const assistantsRef = collection(db, 'assistants');
              const assistantQuery = query(
                assistantsRef,
                where('assistantEmail', '==', email),
                where('isActive', '==', true),
                limit(1)
              );
              const clinicAssistantSnap = await getDocs(assistantQuery);

              if (!clinicAssistantSnap.empty) {
                const assistantData = clinicAssistantSnap.docs[0].data();
                localStorage.setItem('healqr_is_assistant', 'true');
                localStorage.setItem('healqr_assistant_pages', JSON.stringify(assistantData.allowedPages || ['dashboard']));
                localStorage.setItem('healqr_assistant_doctor_id', assistantData.doctorId);
                localStorage.setItem('userId', assistantData.doctorId);
                localStorage.setItem('healqr_authenticated', 'true');
                localStorage.setItem('healqr_user_email', email);
                if (assistantData.isClinic) {
                  localStorage.setItem('healqr_is_clinic', 'true');
                }
                // Pre-fetch clinic name
                try {
                  const clinicRef = doc(db, 'clinics', assistantData.doctorId);
                  const clinicSnap = await getDoc(clinicRef);
                  if (clinicSnap.exists() && clinicSnap.data().name) {
                    localStorage.setItem('healqr_user_name', clinicSnap.data().name);
                  }
                } catch (prefetchErr) {
                  console.warn('Could not pre-fetch clinic name:', prefetchErr);
                }
              } else {
                console.error('❌ User tried to login as clinic but no clinic, branch, or assistant found');
                await auth.signOut();
                throw new Error('This email is not registered as a Clinic, Branch Manager, or Assistant. Please use the Doctor Login or Register as a Clinic.');
              }
            }
          }
        } else if (loginType === 'lab') {
          // ✅ LAB LOGIN FLOW: Lab Owner check
          const labDocRef = doc(db, 'labs', user.uid);
          const labDoc = await getDoc(labDocRef);

          if (labDoc.exists()) {
            const labData = labDoc.data();
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('healqr_user_email', email);
            localStorage.setItem('healqr_authenticated', 'true');
            localStorage.setItem('healqr_is_lab', 'true');
            localStorage.removeItem('healqr_is_clinic');
            localStorage.removeItem('healqr_is_assistant');
            if (labData.name || labData.labName) {
              localStorage.setItem('healqr_user_name', labData.name || labData.labName);
            }
          } else {
            // Not found by UID — fallback: query labs by email (handles edge case where doc ID ≠ uid)
            const labsByEmailQuery = query(collection(db, 'labs'), where('email', '==', email), limit(1));
            const labsByEmailSnap = await getDocs(labsByEmailQuery);

            if (!labsByEmailSnap.empty) {
              const labData = labsByEmailSnap.docs[0].data();
              const labDocId = labsByEmailSnap.docs[0].id;
              localStorage.setItem('userId', labDocId);
              localStorage.setItem('healqr_user_email', email);
              localStorage.setItem('healqr_authenticated', 'true');
              localStorage.setItem('healqr_is_lab', 'true');
              localStorage.removeItem('healqr_is_clinic');
              localStorage.removeItem('healqr_is_assistant');
              if (labData.name || labData.labName) {
                localStorage.setItem('healqr_user_name', labData.name || labData.labName);
              }
            } else {
              // Not a lab owner — check if lab assistant
              const assistantsRef = collection(db, 'assistants');
              const labAssistantQuery = query(
                assistantsRef,
                where('assistantEmail', '==', email),
                where('isActive', '==', true),
                where('isLab', '==', true),
                limit(1)
              );
              const labAssistantSnap = await getDocs(labAssistantQuery);

              if (!labAssistantSnap.empty) {
                const assistantData = labAssistantSnap.docs[0].data();
                localStorage.setItem('healqr_is_assistant', 'true');
                localStorage.setItem('healqr_assistant_pages', JSON.stringify(assistantData.allowedPages || ['dashboard']));
                localStorage.setItem('healqr_assistant_doctor_id', assistantData.doctorId);
                localStorage.setItem('userId', assistantData.doctorId);
                localStorage.setItem('healqr_authenticated', 'true');
                localStorage.setItem('healqr_user_email', email);
                localStorage.setItem('healqr_is_lab', 'true');
                localStorage.removeItem('healqr_is_clinic');
              } else {
                console.warn('⚠️ No lab registration found for this email. Redirecting to lab signup.');
                await auth.signOut();
                setStatus('error');
                setMessage('This email is not yet registered as a Lab. Redirecting you to Lab Sign Up...');
                // Redirect to lab signup instead of dead-ending — don't throw (avoids onError → landing flash)
                setTimeout(() => {
                  window.location.href = '/?page=lab-signup';
                }, 2500);
                return;
              }
            }
          }
        } else if (loginType === 'phlebo') {
          // ✅ PHLEBOTOMIST LOGIN FLOW
          const isSignup = urlParams.get('signup') === 'true';

          // Check phlebotomists collection by uid first
          const phlebDocRef = doc(db, 'phlebotomists', user.uid);
          const phlebDoc = await getDoc(phlebDocRef);

          if (phlebDoc.exists()) {
            const phlebData = phlebDoc.data();
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('healqr_user_email', email);
            localStorage.setItem('healqr_authenticated', 'true');
            localStorage.setItem('healqr_is_phlebo', 'true');
            localStorage.setItem('healqr_phlebo_id', user.uid);
            localStorage.removeItem('healqr_is_clinic');
            localStorage.removeItem('healqr_is_lab');
            localStorage.removeItem('healqr_is_assistant');
            if (phlebData.name) {
              localStorage.setItem('healqr_user_name', phlebData.name);
            }
          } else if (isSignup) {
            // New signup — move from pending_phlebo_signups to phlebotomists
            const pendingQuery = query(collection(db, 'pending_phlebo_signups'), where('email', '==', email), limit(1));
            const pendingSnap = await getDocs(pendingQuery);

            if (!pendingSnap.empty) {
              const pendingData = pendingSnap.docs[0].data();
              const { setDoc, deleteDoc } = await import('firebase/firestore');
              // Create in phlebotomists collection with auth uid as doc ID
              await setDoc(doc(db, 'phlebotomists', user.uid), {
                ...pendingData,
                uid: user.uid,
                verified: true,
                verifiedAt: new Date().toISOString(),
                createdAt: pendingData.createdAt || new Date().toISOString(),
              });
              // Delete pending record
              await deleteDoc(pendingSnap.docs[0].ref);

              localStorage.setItem('userId', user.uid);
              localStorage.setItem('healqr_user_email', email);
              localStorage.setItem('healqr_authenticated', 'true');
              localStorage.setItem('healqr_is_phlebo', 'true');
              localStorage.setItem('healqr_phlebo_id', user.uid);
              localStorage.removeItem('healqr_is_clinic');
              localStorage.removeItem('healqr_is_lab');
              localStorage.removeItem('healqr_is_assistant');
              if (pendingData.name) {
                localStorage.setItem('healqr_user_name', pendingData.name);
              }
            } else {
              await auth.signOut();
              setStatus('error');
              setMessage('No pending signup found for this email. Please sign up first.');
              setTimeout(() => {
                window.location.href = '/?page=phlebo-signup';
              }, 2500);
              return;
            }
          } else {
            // Fallback: query by email
            const phlebByEmailQuery = query(collection(db, 'phlebotomists'), where('email', '==', email), limit(1));
            const phlebByEmailSnap = await getDocs(phlebByEmailQuery);

            if (!phlebByEmailSnap.empty) {
              const phlebData = phlebByEmailSnap.docs[0].data();
              const phlebDocId = phlebByEmailSnap.docs[0].id;
              localStorage.setItem('userId', phlebDocId);
              localStorage.setItem('healqr_user_email', email);
              localStorage.setItem('healqr_authenticated', 'true');
              localStorage.setItem('healqr_is_phlebo', 'true');
              localStorage.setItem('healqr_phlebo_id', phlebDocId);
              localStorage.removeItem('healqr_is_clinic');
              localStorage.removeItem('healqr_is_lab');
              localStorage.removeItem('healqr_is_assistant');
              if (phlebData.name) {
                localStorage.setItem('healqr_user_name', phlebData.name);
              }
            } else {
              await auth.signOut();
              setStatus('error');
              setMessage('This email is not registered as a Phlebotomist. Redirecting to Sign Up...');
              setTimeout(() => {
                window.location.href = '/?page=phlebo-signup';
              }, 2500);
              return;
            }
          }
        } else {
          // ✅ DOCTOR LOGIN FLOW: Assistant check first, then doctor
          const assistantsRef = collection(db, 'assistants');
          const assistantQuery = query(
            assistantsRef,
            where('assistantEmail', '==', email),
            where('isActive', '==', true),
            limit(1)
          );
          const assistantSnap = await getDocs(assistantQuery);

          if (!assistantSnap.empty) {
            // This is an assistant
            const assistantData = assistantSnap.docs[0].data();
            localStorage.setItem('healqr_is_assistant', 'true');
            localStorage.setItem('healqr_assistant_pages', JSON.stringify(assistantData.allowedPages || ['dashboard']));
            localStorage.setItem('healqr_assistant_doctor_id', assistantData.doctorId);
            localStorage.setItem('userId', assistantData.doctorId);
            localStorage.setItem('healqr_authenticated', 'true');
            localStorage.setItem('healqr_user_email', email);

            if (assistantData.isClinic) {
              localStorage.setItem('healqr_is_clinic', 'true');
            } else {
              localStorage.removeItem('healqr_is_clinic');
            }

            // Pre-fetch name
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

          } else {
            // ✅ Not an assistant — check doctors collection
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
              } else {
                // No doctor or clinic doc found
                console.error('❌ No doctor or clinic account found for:', user.uid);
                await auth.signOut();
                throw new Error('This email is not registered. Please sign up first.');
              }
            }
          }
        }
      }

      // Clear temporary data
      localStorage.removeItem('healqr_email_for_signin');

      setStatus('success');
      const isAssistant = localStorage.getItem('healqr_is_assistant');
      const isClinic = localStorage.getItem('healqr_is_clinic');
      const isLab = localStorage.getItem('healqr_is_lab');
      const isPhlebo = localStorage.getItem('healqr_is_phlebo');
      setMessage(isAssistant ? 'Assistant access granted!' : isPhlebo ? 'Phlebotomist login successful!' : isLab ? 'Lab login successful!' : isClinic ? 'Clinic login successful!' : 'Login successful!');


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

