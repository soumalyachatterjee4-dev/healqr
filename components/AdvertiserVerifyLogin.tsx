import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase/config';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle2, Loader2, XCircle, Clock, ShieldCheck } from 'lucide-react';
import healQRAdsLogo from '../assets/healQRADS_LOGO.svg';

interface AdvertiserVerifyLoginProps {
  onSuccess?: () => void;
  onError?: () => void;
}

export default function AdvertiserVerifyLogin({ onSuccess, onError }: AdvertiserVerifyLoginProps) {
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

      let email = localStorage.getItem('healqr_advertiser_email_for_signin');
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

      // Find the advertiser
      const advRef = collection(db, 'advertisers');
      const q = query(advRef, where('email', '==', email));
      const snap = await getDocs(q);

      if (snap.empty) {
        setStatus('error');
        setMessage('No advertiser account found for this email.');
        return;
      }

      const advDoc = snap.docs[0];
      const advData = advDoc.data();
      const advStatus = advData.status;

      // CASE 1: pending_verification → mark as pending_approval (first time email verify after signup)
      if (advStatus === 'pending_verification' || advStatus === 'pending') {
        await updateDoc(advDoc.ref, {
          status: 'pending_approval',
          emailVerifiedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        localStorage.removeItem('healqr_advertiser_email_for_signin');
        setStatus('pending_approval');
        setMessage('Your email has been verified successfully! Your account is now under review by the HealQR admin team.');
        return;
      }

      // CASE 2: pending_approval → already verified, waiting for admin
      if (advStatus === 'pending_approval') {
        localStorage.removeItem('healqr_advertiser_email_for_signin');
        setStatus('pending_approval');
        setMessage('Your email is already verified. Your account is still under review by the HealQR admin team.');
        return;
      }

      // CASE 3: suspended
      if (advStatus === 'suspended') {
        setStatus('error');
        setMessage('Your account has been suspended. Please contact HealQR support.');
        return;
      }

      // CASE 4: active → login success, go to dashboard
      if (advStatus === 'active') {
        localStorage.setItem('healqr_advertiser_authenticated', 'true');
        localStorage.setItem('healqr_advertiser_id', advDoc.id);
        localStorage.setItem('healqr_advertiser_company', advData.companyName || '');
        localStorage.setItem('healqr_advertiser_email', email);
        localStorage.removeItem('healqr_advertiser_email_for_signin');

        setStatus('login_success');
        setMessage(`Welcome, ${advData.companyName || 'Advertiser'}!`);

        setTimeout(() => {
          onSuccess?.();
        }, 1500);
        return;
      }

      // Unknown status
      setStatus('error');
      setMessage('Unknown account status. Please contact support.');
    } catch (err: any) {
      console.error('Advertiser verify error:', err);
      setStatus('error');
      setMessage(err.message || 'Verification failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 shadow-lg">
              <img src={healQRAdsLogo} alt="HealQR Ads" className="h-12 w-auto" />
            </div>
          </div>

          {status === 'verifying' && (
            <>
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Verifying Your Email</h2>
              <p className="text-slate-400 text-sm">Please wait while we verify your link...</p>
            </>
          )}

          {status === 'login_success' && (
            <>
              <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Login Successful!</h2>
              <p className="text-slate-400 text-sm">{message}</p>
              <p className="text-emerald-400 text-xs mt-3">Redirecting to dashboard...</p>
            </>
          )}

          {status === 'pending_approval' && (
            <>
              <div className="w-20 h-20 bg-yellow-500/10 border border-yellow-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-yellow-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Pending Admin Approval</h2>
              <p className="text-slate-400 text-sm mb-4">{message}</p>
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-400 text-xs">
                  You will receive an email once your account is activated. This typically takes 24-48 hours.
                </p>
              </div>
            </>
          )}

          {status === 'verified' && (
            <>
              <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Email Verified</h2>
              <p className="text-slate-400 text-sm">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Verification Failed</h2>
              <p className="text-red-400 text-sm">{message}</p>
              <button
                onClick={() => window.location.href = window.location.origin}
                className="mt-6 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2.5 rounded-lg text-sm transition-colors"
              >
                Go to Homepage
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
