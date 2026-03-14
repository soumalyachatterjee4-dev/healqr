import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase/config';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Stethoscope, Lock, Clock, AlertCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

/**
 * TempDoctorLogin — Login page for temporary doctor access.
 * URL: /temp-doctor-login?token=xxx
 *
 * Flow:
 * 1. Reads `token` from URL params
 * 2. Looks up `tempDoctorAccess` subcollection under the clinic doc
 * 3. Validates PIN entry
 * 4. Checks time window (chamber hours ± 30 min)
 * 5. Sets localStorage keys and redirects to temp-doctor-dashboard
 */
const TempDoctorLogin: React.FC = () => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [tokenData, setTokenData] = useState<any>(null);
  const [error, setError] = useState('');
  const [timeError, setTimeError] = useState('');

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const clinicIdParam = urlParams.get('clinic');

      if (!token) {
        setError('Invalid access link. Please request a new link from the clinic.');
        setLoading(false);
        return;
      }

      let foundData: any = null;
      let foundClinicId = '';
      let foundDocId = '';

      if (clinicIdParam) {
        // Direct lookup using clinicId from URL (fast path)
        const tempAccessRef = collection(db, 'clinics', clinicIdParam, 'tempDoctorAccess');
        const q = query(tempAccessRef, where('accessToken', '==', token), where('isActive', '==', true));
        const snap = await getDocs(q);
        if (!snap.empty) {
          foundData = snap.docs[0].data();
          foundClinicId = clinicIdParam;
          foundDocId = snap.docs[0].id;
        }
      } else {
        // Fallback: Search across all clinics (for old links without clinic param)
        const clinicsRef = collection(db, 'clinics');
        const clinicsSnap = await getDocs(clinicsRef);
        for (const clinicDoc of clinicsSnap.docs) {
          const tempAccessRef = collection(db, 'clinics', clinicDoc.id, 'tempDoctorAccess');
          const q = query(tempAccessRef, where('accessToken', '==', token), where('isActive', '==', true));
          const snap = await getDocs(q);
          if (!snap.empty) {
            foundData = snap.docs[0].data();
            foundClinicId = clinicDoc.id;
            foundDocId = snap.docs[0].id;
            break;
          }
        }
      }

      if (!foundData) {
        setError('This access link has expired or been revoked. Please contact the clinic for a new link.');
        setLoading(false);
        return;
      }

      // Check if access has expired (past the session date)
      const today = new Date().toISOString().split('T')[0];
      if (foundData.expiryDate && foundData.expiryDate < today) {
        setError('This temporary access has expired. Please contact the clinic for a new access link.');
        setLoading(false);
        return;
      }

      setTokenData({ ...foundData, clinicId: foundClinicId, docId: foundDocId });
      setLoading(false);
    } catch (err) {
      console.error('Token validation error:', err);
      setError('Failed to validate access link. Please try again.');
      setLoading(false);
    }
  };

  const checkTimeWindow = (): { allowed: boolean; message: string } => {
    if (!tokenData?.chambers || tokenData.chambers.length === 0) {
      return { allowed: true, message: '' }; // No chamber restriction
    }

    const now = new Date();
    const today = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const BUFFER_MINUTES = 30;

    // Check if any chamber is within time window today
    for (const chamber of tokenData.chambers) {
      // Check if today is a valid day for this chamber
      const isValidDay = chamber.days?.includes(today);
      if (!isValidDay) continue;

      // Parse start/end times (format: "HH:MM" or "H:MM AM/PM")
      const startMinutes = parseTimeToMinutes(chamber.startTime);
      const endMinutes = parseTimeToMinutes(chamber.endTime);

      if (startMinutes === -1 || endMinutes === -1) continue;

      const windowStart = startMinutes - BUFFER_MINUTES;
      const windowEnd = endMinutes + BUFFER_MINUTES;

      if (currentMinutes >= windowStart && currentMinutes <= windowEnd) {
        return { allowed: true, message: '' };
      }
    }

    // Find next valid time window for display
    const nextWindow = getNextTimeWindow(tokenData.chambers);
    return {
      allowed: false,
      message: nextWindow
        ? `Access is only available during chamber hours. Next window: ${nextWindow}`
        : 'No chamber sessions scheduled for today. Access is restricted to chamber hours ± 30 minutes.'
    };
  };

  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return -1;

    // Handle "HH:MM" format
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    }

    // Handle "H:MM AM/PM" format
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match) {
      let h = parseInt(match[1]);
      const m = parseInt(match[2]);
      const period = match[3].toUpperCase();
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    }

    return -1;
  };

  const getNextTimeWindow = (chambers: any[]): string | null => {
    const now = new Date();
    const today = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const chamber of chambers) {
      if (!chamber.days?.includes(today)) continue;
      const startMinutes = parseTimeToMinutes(chamber.startTime);
      if (startMinutes > currentMinutes) {
        return `${chamber.startTime} - ${chamber.endTime} (${chamber.chamberName})`;
      }
    }
    return null;
  };

  const handleLogin = async () => {
    if (!pin || pin.length !== 6) {
      toast.error('Please enter the 6-digit PIN');
      return;
    }

    setVerifying(true);
    setTimeError('');

    try {
      // Verify PIN
      if (pin !== tokenData.accessPin) {
        toast.error('Invalid PIN. Please check and try again.');
        setVerifying(false);
        return;
      }

      // Check time window
      const timeCheck = checkTimeWindow();
      if (!timeCheck.allowed) {
        setTimeError(timeCheck.message);
        setVerifying(false);
        return;
      }

      // Update last login (non-blocking — may fail if unauthenticated, that's OK)
      try {
        const docRef = doc(db, 'clinics', tokenData.clinicId, 'tempDoctorAccess', tokenData.docId);
        await updateDoc(docRef, {
          lastLoginAt: serverTimestamp(),
          loginCount: (tokenData.loginCount || 0) + 1
        });
      } catch (e) {
        // Expected for unauthenticated temp doctors — login tracking is optional
        console.log('Login tracking update skipped (expected for temp access)');
      }

      // Set localStorage for temp doctor session
      localStorage.setItem('healqr_is_temp_doctor', 'true');
      localStorage.setItem('healqr_temp_doctor_clinic_id', tokenData.clinicId);
      localStorage.setItem('healqr_temp_doctor_id', tokenData.doctorId);
      localStorage.setItem('healqr_temp_doctor_name', tokenData.doctorName);
      localStorage.setItem('healqr_temp_doctor_clinic_name', tokenData.clinicName || '');
      localStorage.setItem('healqr_temp_doctor_chambers', JSON.stringify(tokenData.chambers || []));
      localStorage.setItem('healqr_temp_doctor_token', tokenData.accessToken);
      localStorage.setItem('healqr_temp_doctor_expiry', tokenData.expiryDate || '');

      toast.success(`Welcome, Dr. ${tokenData.doctorName}!`);

      // Redirect to temp doctor dashboard
      window.location.href = `${window.location.origin}/?page=temp-doctor-dashboard`;
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Login failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Validating access link...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
        <Card className="bg-gray-800/50 border-red-700/50 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <Button
            onClick={() => window.location.href = window.location.origin}
            className="bg-gray-700 hover:bg-gray-600 text-white"
          >
            Return to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
      <Card className="bg-gray-800/50 border-gray-700 p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Temporary Doctor Access</h1>
          <p className="text-gray-400 text-sm">
            Enter your PIN to access the patient dashboard
          </p>
        </div>

        {/* Doctor Info */}
        {tokenData && (
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">Dr. {tokenData.doctorName}</p>
                <p className="text-gray-400 text-xs">{tokenData.clinicName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>Access valid during chamber hours ± 30 min</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs mt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Scope: Today's Schedule & Patient Details</span>
            </div>
          </div>
        )}

        {/* Time Error */}
        {timeError && (
          <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-xs">{timeError}</p>
            </div>
          </div>
        )}

        {/* PIN Input */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-300 text-sm flex items-center gap-2">
              <Lock className="w-4 h-4" />
              6-Digit Access PIN
            </Label>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="bg-gray-900/50 border-gray-700 text-white text-center text-2xl tracking-[0.5em] h-14"
              autoFocus
            />
          </div>

          <Button
            onClick={handleLogin}
            disabled={verifying || pin.length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base"
          >
            {verifying ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Verifying...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Access Dashboard
              </div>
            )}
          </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-6">
          This is a temporary access session. Your access will automatically expire outside chamber hours.
        </p>
      </Card>
    </div>
  );
};

export default TempDoctorLogin;

