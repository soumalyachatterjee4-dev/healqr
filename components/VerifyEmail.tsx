import { useEffect, useState, useRef } from 'react';
import { auth } from '../lib/firebase/config';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import healqrLogo from '../assets/healqr-logo.png';
import QRCode from 'qrcode';
import { getStateFromPincode } from '../utils/pincodeMapping';

interface VerifyEmailProps {
  onSuccess?: () => void;
  onError?: () => void;
}

export default function VerifyEmail({ onSuccess, onError }: VerifyEmailProps) {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email...');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [doctorData, setDoctorData] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    verifyEmailLink();
  }, []);

  const verifyEmailLink = async () => {
    try {
      if (!auth) {
        throw new Error('Firebase not configured');
      }

      console.log('🔍 Current URL:', window.location.href);

      // Check if this is an email link
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        console.error('❌ isSignInWithEmailLink returned false');
        setStatus('error');
        setMessage('Invalid verification link. This link may have expired or already been used.');
        return;
      }

      console.log('✅ Valid email link detected');

      // Get email from localStorage
      let email = localStorage.getItem('healqr_email_for_signin');
      console.log('📧 Email from localStorage:', email);

      if (!email) {
        // If not in localStorage, ask user to enter their email
        setStatus('verifying');
        setMessage('Please enter your email address to complete verification');

        email = window.prompt('Please enter the email address you used to sign up:');
        console.log('📧 Email from prompt:', email);

        if (!email || !email.includes('@')) {
          throw new Error('Valid email address is required for verification');
        }
      }

      console.log('🔐 Attempting to sign in with email link...');

      // Sign in with email link
      const result = await signInWithEmailLink(auth, email, window.location.href);
      const user = result.user;

      console.log('✅ Email verified successfully:', user.uid);

      // Wait for auth state to fully propagate before Firestore operations
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get signup data from URL first (works across browsers/sessions), then localStorage as fallback
      let signupData: any;

      // Try URL params first (most reliable for email links)
      console.log('🔍 Looking for signup data in URL...');

      // Try query string first
      let urlParams = new URLSearchParams(window.location.search);
      let encodedData = urlParams.get('data');

      // Fallback to hash parameters (Firebase sometimes uses this)
      if (!encodedData) {
        const hashParams = window.location.hash.split('?')[1];
        if (hashParams) {
          urlParams = new URLSearchParams(hashParams);
          encodedData = urlParams.get('data');
        }
      }

      if (encodedData) {
        try {
          signupData = JSON.parse(atob(encodedData));
          console.log('📦 Loaded signup data from URL:', signupData);
        } catch (e) {
          console.error('❌ Failed to decode URL data:', e);
        }
      }

      // Fallback to localStorage (same browser/session)
      if (!signupData) {
        console.log('🔍 Trying localStorage as fallback...');
        const signupDataStr = localStorage.getItem('healqr_pending_clinic_signup') || localStorage.getItem('healqr_pending_signup');

        if (signupDataStr) {
          try {
            signupData = JSON.parse(signupDataStr);
            console.log('📦 Loaded signup data from localStorage:', signupData);
          } catch (e) {
            console.error('❌ Failed to parse signup data:', e);
          }
        }
      }

      if (!signupData) {
        console.error('❌ No signup data found in URL or localStorage');
        throw new Error('Signup data not found. Please sign up again from the website.');
      }

      // Validate we have the required fields based on type
      const isClinic = signupData.type === 'clinic';
      const nameField = isClinic ? (signupData.name || signupData.clinicName) : signupData.name;

      if (!nameField) {
        console.error('❌ Name is missing from signup data');
        throw new Error('Name is missing. Please sign up again.');
      }

      if (!signupData.email) {
        console.error('❌ Email is missing from signup data');
        throw new Error('Email is missing. Please sign up again.');
      }

      console.log('✅ Signup data validated successfully');

      if (isClinic) {
          // Clinic Registration Logic
          const { db } = await import('../lib/firebase/config');
          if (db) {
            const { doc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc } = await import('firebase/firestore');

            // Check if clinic already exists
            const clinicsRef = collection(db, 'clinics');
            const q = query(clinicsRef, where('email', '==', email));
            const existingDocs = await getDocs(q);

            if (!existingDocs.empty) {
                setStatus('error');
                setMessage('This email is already registered as a clinic.');
                return;
            }

            // Generate Clinic Code
            const { generateClinicCode } = await import('../utils/idGenerator');
            const clinicCode = await generateClinicCode(signupData.pinCode);

            // Generate clinic slug and booking URL
            let clinicSlug = signupData.clinicName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            let bookingUrl = `https://healqr.com/clinic/${clinicSlug}`;
            let qrUrl = '';

            // Generate QR code for clinic
            qrUrl = await QRCode.toDataURL(bookingUrl, {
              width: 300,
              margin: 2,
              color: {dark: '#000000', light: '#FFFFFF'},
            });

            // Create Clinic Doc
            console.log('🔵 Creating clinic doc with UID:', user.uid);
            console.log('🔵 Auth UID:', user.uid);
            console.log('🔵 User email verified:', user.emailVerified);

            await setDoc(doc(db, 'clinics', user.uid), {
                uid: user.uid,
                email: email,
                name: signupData.clinicName,
                address: signupData.address || '',
                pinCode: signupData.pinCode,
                state: signupData.state || getStateFromPincode(signupData.pinCode || ''), // Locked state field
                landmark: signupData.landmark || '',
                qrNumber: signupData.qrNumber,
                qrType: signupData.qrType || 'preprinted',
                companyName: signupData.companyName || '',
                division: signupData.division || '',
                clinicCode: clinicCode,
                clinicSlug: clinicSlug,
                bookingUrl: bookingUrl,
                qrCode: qrUrl,
                createdAt: serverTimestamp(),
                type: 'clinic',
                linkedDoctorCodes: [],
                linkedDoctorsDetails: []
            });

            // Store clinic data in localStorage for direct login
            localStorage.setItem('healqr_clinic_code', clinicCode);
            localStorage.setItem('healqr_user_email', email);
            localStorage.setItem('healqr_user_name', signupData.clinicName);
            localStorage.setItem('healqr_qr_code', qrUrl);
            localStorage.setItem('healqr_qr_id', signupData.qrNumber);
            localStorage.setItem('healqr_booking_url', bookingUrl);
            localStorage.setItem('healqr_authenticated', 'true');
            localStorage.setItem('healqr_is_clinic', 'true'); // CRITICAL: This was missing
            localStorage.setItem('userId', user.uid);

            // Update QR Code in BOTH collections (check which one has it)
            const qrPoolCollection = collection(db, 'qrPool');
            const qrCodesCollection = collection(db, 'qrCodes');
            const poolQuery = query(qrPoolCollection, where('qrNumber', '==', signupData.qrNumber));
            const codesQuery = query(qrCodesCollection, where('qrNumber', '==', signupData.qrNumber));

            const [poolSnapshot, codesSnapshot] = await Promise.all([
              getDocs(poolQuery),
              getDocs(codesQuery)
            ]);

            if (!poolSnapshot.empty) {
                const qrDocRef = poolSnapshot.docs[0].ref;
                await updateDoc(qrDocRef, {
                    status: 'active',
                    linkedEmail: email,
                    clinicId: user.uid,
                    activatedAt: serverTimestamp()
                });
            } else if (!codesSnapshot.empty) {
                const qrDocRef = codesSnapshot.docs[0].ref;
                await updateDoc(qrDocRef, {
                    status: 'active',
                    linkedEmail: email,
                    clinicId: user.uid,
                    activatedAt: serverTimestamp()
                });
            }

            // Clear temporary signup data
            localStorage.removeItem('healqr_pending_clinic_signup');

            // Generate styled QR with clinic info
            const clinicData = {
              name: signupData.clinicName,
              email: email,
              qrNumber: signupData.qrNumber,
              bookingUrl: bookingUrl
            };

            await generateStyledQR(clinicData);
            setDoctorData(clinicData); // Reuse doctorData state for clinic

            setStatus('success');
            setMessage('Clinic verified successfully!');

            console.log('✅ Clinic verification complete');

            // Auto-redirect to clinic dashboard after showing QR briefly
            setTimeout(() => {
                window.location.href = '/?page=clinic-dashboard';
            }, 2000);

            return;
          }
      }

      setDoctorData(signupData);

      // STRICT CHECK: Reject if user already exists (prevent duplicate QR codes & free tier abuse)
      const { db } = await import('../lib/firebase/config');
      if (db) {
        const { collection, query, where, getDocs, doc, setDoc } = await import('firebase/firestore');
        const doctorsRef = collection(db, 'doctors');
        const q = query(doctorsRef, where('email', '==', email));
        const existingDocs = await getDocs(q);

        if (!existingDocs.empty) {
          // User already exists - REJECT signup attempt
          setStatus('error');
          setMessage('This email is already registered. Please use the Login page instead.');

          console.error('❌ Duplicate signup attempt blocked for:', email);

          if (onError) {
            setTimeout(() => onError(), 2000);
          }


          return; // Exit - do NOT create new QR
        }
      }

      // Use provided QR for doctor profile ONLY, never generate fallback/demo QR
      let doctorSlug = signupData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      let bookingUrl = `https://teamhealqr.web.app/book/${doctorSlug}`;
      let qrUrl = '';
      let qrId = '';

      if (signupData.qrNumber) {
        // Generate plain QR for Firestore storage
        qrUrl = await QRCode.toDataURL(bookingUrl, {
          width: 300,
          margin: 2,
          color: {dark: '#000000', light: '#FFFFFF'},
        });
        qrId = signupData.qrNumber;
        console.log('🟢 VERIFY: Using provided QR for doctor:', qrId);
      } else {
        setStatus('error');
        setMessage('No valid QR code found. Please sign up again with a valid admin-generated QR.');
        console.error('❌ VERIFY: No valid QR provided, aborting doctor creation.');
        return;
      }

      // Store doctor data for QR generation (done after Firestore to avoid blocking)
      const tempDoctorData = {
        name: signupData.name,
        email: email,
        qrNumber: qrId,
        bookingUrl: bookingUrl
      };

      // Save doctor data to Firestore (permanent storage) - OPTIMIZE: Run in parallel with QR linking
      if (db) {
        const { doc, setDoc, serverTimestamp, Timestamp } = await import('firebase/firestore');
        const { generateDoctorCode } = await import('../utils/idGenerator');
        const doctorDocRef = doc(db, 'doctors', user.uid);

        const signupDate = new Date();
        const trialEndDate = new Date(signupDate);
        trialEndDate.setDate(trialEndDate.getDate() + 9); // 10 days total (signup day + 9)

        // Generate unique doctor code based on pincode
        const doctorCode = await generateDoctorCode(signupData.pinCode || '000000');
        console.log('✅ Generated Doctor Code:', doctorCode);

        await setDoc(doctorDocRef, {
          uid: user.uid,
          email: email,
          name: signupData.name,
          specialties: signupData.specialties || [], // Medical specialties array for search
          dob: signupData.dob || '',
          address: signupData.address || '',
          pinCode: signupData.pinCode || '',
          state: signupData.state || getStateFromPincode(signupData.pinCode || ''), // Locked state field
          landmark: signupData.landmark || '',
          qrNumber: signupData.qrNumber, // Always store the provided QR
          qrType: signupData.qrType || 'preprinted', // QR type (preprinted or virtual)
          companyName: signupData.companyName || '', // Company name for pre-printed QR
          division: signupData.division || '', // Division for pre-printed QR
          qrDocId: '', // Will be set after QR doc lookup
          doctorCode: doctorCode,
          baCode: signupData.baCode || '',
          activationQrCode: signupData.activationQrCode || '',
          qrCode: qrUrl,
          qrId: qrId,
          bookingUrl: bookingUrl,
          doctorSlug: doctorSlug,
          createdAt: serverTimestamp(),
          status: 'active',
          subscriptionPlan: 'starter',
          subscriptionStatus: 'trial',
          trialStartDate: Timestamp.fromDate(signupDate),
          trialEndDate: Timestamp.fromDate(trialEndDate),
          bookingsCount: 0,
          bookingsLimit: 100,
          daysRemaining: 10,
          nextBillingDate: null,
          currentPeriodStart: Timestamp.fromDate(signupDate),
          currentPeriodEnd: Timestamp.fromDate(trialEndDate),
          bookingBlocked: false,
          blockReason: null,
        });
        // Extra debug: Confirm doctor profile created with QR
        console.log('🟢 DOCTOR PROFILE CREATED with QR:', signupData.qrNumber);

        // OPTIMIZE: Link QR codes in background (non-blocking)
        Promise.all([
          // Link QR code in BOTH collections (check which one has it)
          (async () => {
            if (signupData.qrNumber) {
              const { collection, query, where, getDocs, updateDoc } = await import('firebase/firestore');
              const qrPoolCollection = collection(db, 'qrPool');
              const qrCodesCollection = collection(db, 'qrCodes');
              const poolQuery = query(qrPoolCollection, where('qrNumber', '==', signupData.qrNumber));
              const codesQuery = query(qrCodesCollection, where('qrNumber', '==', signupData.qrNumber));

              const [poolSnapshot, codesSnapshot] = await Promise.all([
                getDocs(poolQuery),
                getDocs(codesQuery)
              ]);

              if (!poolSnapshot.empty) {
                await updateDoc(poolSnapshot.docs[0].ref, {
                  status: 'active',
                  linkedEmail: email,
                  doctorId: user.uid,
                  activatedAt: serverTimestamp()
                });
                await setDoc(doctorDocRef, { qrDocId: poolSnapshot.docs[0].id }, { merge: true });
                console.log('\ud83d\udfe2 QR linked from qrPool:', signupData.qrNumber);
              } else if (!codesSnapshot.empty) {
                await updateDoc(codesSnapshot.docs[0].ref, {
                  status: 'active',
                  linkedEmail: email,
                  doctorId: user.uid,
                  activatedAt: serverTimestamp()
                });
                await setDoc(doctorDocRef, { qrDocId: codesSnapshot.docs[0].id }, { merge: true });
                console.log('\ud83d\udfe2 QR linked from qrCodes:', signupData.qrNumber);
              }
            }
          })(),

          // Link activation code
          (async () => {
            if (signupData.activationQrCode) {
              const { collection, query, where, getDocs, updateDoc } = await import('firebase/firestore');
              const qrCollection = collection(db, 'activationCodes');
              const qrQuery = query(qrCollection, where('code', '==', signupData.activationQrCode));
              const qrSnapshot = await getDocs(qrQuery);
              if (!qrSnapshot.empty) {
                await updateDoc(qrSnapshot.docs[0].ref, {
                  status: 'active',
                  linkedEmail: email,
                  doctorId: user.uid,
                  activatedAt: serverTimestamp()
                });
                console.log('✅ Activation code linked');
              }
            }
          })()
        ]).catch(err => console.error('QR linking error (non-critical):', err));

        console.log('✅ Doctor profile saved to Firestore with trial subscription');
      }

      // Store user data in localStorage for persistence - CRITICAL for auth state
      localStorage.setItem('userId', user.uid);
      localStorage.setItem('healqr_user_email', email);
      localStorage.setItem('healqr_user_name', signupData.name);
      localStorage.setItem('healqr_qr_code', qrUrl);
      localStorage.setItem('healqr_qr_id', qrId);
      localStorage.setItem('healqr_booking_url', bookingUrl);
      localStorage.setItem('healqr_authenticated', 'true');

      // Clear only temporary signup data (not the signin email needed for persistence)
      localStorage.removeItem('healqr_pending_signup');

      // Generate styled QR with doctor name and email
      await generateStyledQR(tempDoctorData);

      setDoctorData(tempDoctorData);
      setStatus('success');
      setMessage('Email verified successfully!');

      console.log('✅ Verification complete');

      // No auto-redirect - user will click "Login to Dashboard" button

    } catch (error: any) {
      console.error('❌ Email verification error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', JSON.stringify(error, null, 2));

      // If link is invalid/expired, redirect to landing page
      if (error.code === 'auth/invalid-action-code' || error.code === 'auth/expired-action-code') {
        setStatus('error');
        setMessage('This verification link has expired or was already used. Please sign up again.');

        // Redirect to landing after 5 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 5000);
        return;
      }

      if (error.code === 'auth/invalid-email') {
        setStatus('error');
        setMessage('Invalid email address. Please check and try again.');
        return;
      }

      setStatus('error');
      setMessage(error.message || 'Failed to verify email. Please try signing up again.');
      if (onError) onError();
    }
  };

  const generateStyledQR = async (data: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 600;
    const height = 750;
    canvas.width = width;
    canvas.height = height;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Generate QR code
    const qrDataUrl = await QRCode.toDataURL(data.bookingUrl, {
      width: 400,
      margin: 2,
      color: {dark: '#000000', light: '#ffffff'},
    });

    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise((resolve) => {
      qrImg.onload = resolve;
    });

    // Draw QR code centered
    const qrSize = 400;
    const qrX = (width - qrSize) / 2;
    const qrY = 80;
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // Doctor name
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(data.name.toUpperCase(), width / 2, 550);

    // Email
    ctx.fillStyle = '#6b7280';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(data.email, width / 2, 590);

    // QR Number
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(`QR: ${data.qrNumber}`, width / 2, 630);

    // HealQR branding
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('HEALQR.COM', width / 2, 700);

    // Set styled QR as download
    setQrCodeUrl(canvas.toDataURL('image/png'));
  };

  const handleDownloadQR = () => {
    if (qrCodeUrl && doctorData) {
      const link = document.createElement('a');
      const doctorSlug = doctorData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      link.download = `healqr-${doctorSlug}.png`;
      link.href = qrCodeUrl;
      link.click();
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
              <h2 className="text-2xl font-semibold mb-2">Verifying Email</h2>
              <p className="text-gray-400">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2 text-emerald-500">
                Email Verified! 🎉
              </h2>
              <p className="text-gray-400 mb-6">{message}</p>

              {qrCodeUrl && (
                <div className="space-y-4">
                  <div className="bg-white p-6 rounded-xl inline-block">
                    <img src={qrCodeUrl} alt="Your QR Code" className="w-full max-w-md" />
                  </div>
                  {doctorData && (
                    <div className="text-center text-sm text-gray-400 space-y-1">
                      <p className="text-white font-semibold">{doctorData.name}</p>
                      <p>{doctorData.email}</p>
                      <p className="text-emerald-400">QR: {doctorData.qrNumber}</p>
                    </div>
                  )}
                  <button
                    onClick={handleDownloadQR}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg font-medium mb-3"
                  >
                    Download QR Code
                  </button>
                  <button
                    onClick={() => window.location.href = '/?page=login'}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-medium"
                  >
                    Login to Dashboard
                  </button>
                </div>
              )}
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2 text-red-500">
                Verification Failed
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
      {/* Hidden canvas for QR generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
