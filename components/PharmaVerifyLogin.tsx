import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase/config';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { db } from '../lib/firebase/config';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle2, Loader2, XCircle, Clock, ShieldCheck } from 'lucide-react';
import healqrLogo from '../assets/healqr.logo.png';

interface PharmaVerifyLoginProps {
  onSuccess?: (companyId: string, companyName: string) => void;
  onError?: () => void;
}

export default function PharmaVerifyLogin({ onSuccess, onError }: PharmaVerifyLoginProps) {
  const [status, setStatus] = useState<'verifying' | 'verified' | 'login_success' | 'pending_approval' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying...');

  useEffect(() => {
    verifyLink();
  }, []);

  const verifyLink = async () => {
    try {
      if (!auth) throw new Error('Firebase not configured');

      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setStatus('error');
        setMessage('Invalid verification link.');
        return;
      }

      let email = localStorage.getItem('healqr_pharma_email_for_signin');
      if (!email) {
        email = window.prompt('Please enter the email address you used:');
        if (!email || !email.includes('@')) {
          throw new Error('Valid email address is required');
        }
        email = email.toLowerCase().trim();
      } else {
        email = email.toLowerCase().trim();
      }

      // Sign in with email link
      await signInWithEmailLink(auth, email, window.location.href);

      if (!db) throw new Error('Database not available');

      // Find the pharma company
      const pharmaRef = collection(db, 'pharmaCompanies');
      const q = query(pharmaRef, where('contactEmail', '==', email));
      const snap = await getDocs(q);

      if (snap.empty) {
        setStatus('error');
        setMessage('No distributor account found for this email.');
        return;
      }

      const companyDoc = snap.docs[0];
      const companyData = companyDoc.data();
      const companyStatus = companyData.status;

      // CASE 1: pending_verification → mark as pending_approval (first time email verify after signup)
      if (companyStatus === 'pending_verification' || companyStatus === 'pending') {
        await updateDoc(doc(db, 'pharmaCompanies', companyDoc.id), {
          status: 'pending_approval',
          emailVerifiedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        localStorage.removeItem('healqr_pharma_email_for_signin');
        setStatus('pending_approval');
        setMessage('Your email has been verified successfully! Your account is now under review by the HealQR admin team.');
        return;
      }

      // CASE 2: pending_approval → already verified, waiting for admin
      if (companyStatus === 'pending_approval') {
        localStorage.removeItem('healqr_pharma_email_for_signin');
        setStatus('pending_approval');
        setMessage('Your email is already verified. Your account is still under review by the HealQR admin team.');
        return;
      }

      // CASE 3: suspended
      if (companyStatus === 'suspended') {
        setStatus('error');
        setMessage('Your account has been suspended. Please contact HealQR support.');
        return;
      }

      // CASE 4: active → login success, go to dashboard
      if (companyStatus === 'active') {
        localStorage.setItem('healqr_pharma_authenticated', 'true');
        localStorage.setItem('healqr_pharma_company_id', companyDoc.id);
        localStorage.setItem('healqr_pharma_company_name', companyData.companyName || '');
        localStorage.setItem('healqr_pharma_email', email);
        localStorage.removeItem('healqr_pharma_email_for_signin');

        setStatus('login_success');
        setMessage(`Welcome, ${companyData.companyName}!`);

        if (onSuccess) {
          setTimeout(() => onSuccess(companyDoc.id, companyData.companyName), 1200);
        } else {
          setTimeout(() => {
            window.history.replaceState({}, '', '/');
            window.location.href = `${window.location.origin}/?page=pharma-portal`;
          }, 1200);
        }
        return;
      }

      // Fallback
      setStatus('error');
      setMessage('Unknown account status. Please contact HealQR support.');
    } catch (error: any) {
      console.error('Pharma verify error:', error);

      if (error.code === 'auth/invalid-action-code' || error.code === 'auth/expired-action-code') {
        setStatus('error');
        setMessage('This link has expired. Please request a new one.');
        return;
      }

      setStatus('error');
      setMessage(error.message || 'Verification failed.');
      if (onError) onError();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={healqrLogo} alt="HealQR" className="h-12" />
        </div>

        <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 text-center">
          {/* Verifying */}
          {status === 'verifying' && (
            <>
              <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-semibold mb-2">Verifying</h2>
              <p className="text-gray-400">{message}</p>
            </>
          )}

          {/* Email verified, pending admin approval */}
          {status === 'pending_approval' && (
            <>
              <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-5">
                <ShieldCheck className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-semibold mb-3 text-emerald-500">Email Verified ✓</h2>
              <p className="text-gray-400 mb-5">{message}</p>
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm font-medium">Awaiting Admin Approval</span>
                </div>
                <p className="text-yellow-400/70 text-xs">
                  You will be able to login once your account is approved. This usually takes 24-48 hours.
                </p>
              </div>
              <button
                onClick={() => { window.history.replaceState({}, '', '/'); window.location.href = '/'; }}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2.5 rounded-lg transition-colors text-sm"
              >
                Return to Home
              </button>
            </>
          )}

          {/* Login success (active account) */}
          {status === 'login_success' && (
            <>
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2 text-emerald-500">Welcome! 🎉</h2>
              <p className="text-gray-400 mb-6">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
            </>
          )}

          {/* Error */}
          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2 text-red-500">Verification Failed</h2>
              <p className="text-gray-400 mb-6">{message}</p>
              <button
                onClick={() => { window.history.replaceState({}, '', '/'); window.location.href = '/'; }}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2.5 rounded-lg transition-colors text-sm"
              >
                Return to Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

