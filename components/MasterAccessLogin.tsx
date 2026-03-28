import { useState, useEffect, lazy, Suspense } from 'react';
import { auth, db } from '../lib/firebase/config';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Crown, Loader2, XCircle, ShieldCheck } from 'lucide-react';
import healqrLogo from '../assets/healqr.logo.png';

const ClinicMasterAccess = lazy(() => import('./ClinicMasterAccess'));

export default function MasterAccessLogin() {
  const [status, setStatus] = useState<'verifying' | 'verified' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [clinicId, setClinicId] = useState('');

  useEffect(() => {
    verifyLink();
  }, []);

  const verifyLink = async () => {
    try {
      if (!auth) throw new Error('Firebase not configured');

      const url = window.location.href;
      const params = new URLSearchParams(window.location.search);
      const cId = params.get('clinicId');

      if (!cId) {
        setErrorMsg('Invalid link — missing clinic ID');
        setStatus('error');
        return;
      }

      if (!isSignInWithEmailLink(auth, url)) {
        setErrorMsg('Invalid or expired verification link');
        setStatus('error');
        return;
      }

      // Get the email from the clinic doc's masterAccessEmail
      const clinicRef = doc(db, 'clinics', cId);
      const clinicSnap = await getDoc(clinicRef);
      if (!clinicSnap.exists()) {
        setErrorMsg('Clinic not found');
        setStatus('error');
        return;
      }

      const masterEmail = clinicSnap.data()?.masterAccessEmail;
      if (!masterEmail) {
        setErrorMsg('No Master Access email configured for this clinic');
        setStatus('error');
        return;
      }

      // Sign in with the email link
      await signInWithEmailLink(auth, masterEmail, url);

      setClinicId(cId);
      setStatus('verified');

      // Clean URL
      window.history.replaceState({}, '', '/master-access-login');
    } catch (err: any) {
      console.error('Master Access verification error:', err);
      if (err.code === 'auth/invalid-action-code') {
        setErrorMsg('This link has expired or already been used. Request a new one from the Location Manager.');
      } else {
        setErrorMsg(err.message || 'Verification failed');
      }
      setStatus('error');
    }
  };

  if (status === 'verified' && clinicId) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      }>
        <ClinicMasterAccess
          clinicId={clinicId}
          onBack={() => { window.location.href = '/'; }}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-800 bg-amber-600/10 flex flex-col items-center gap-3">
          <img src={healqrLogo} alt="HealQR" className="h-10" />
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Master Access</h2>
          </div>
        </div>
        <div className="p-8 flex flex-col items-center gap-4">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
              <p className="text-sm text-zinc-400">Verifying your identity...</p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="w-10 h-10 text-red-400" />
              <p className="text-sm text-red-400 text-center">{errorMsg}</p>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="mt-2 px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Go Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
