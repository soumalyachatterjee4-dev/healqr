import { useState, useEffect } from 'react';
import { db } from '../lib/firebase/config';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Lock, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import healqrLogo from '../assets/healqr-logo.png';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export default function AssistantLogin() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [assistantData, setAssistantData] = useState<any>(null);

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    try {
      // Get token from URL
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (!token || !db) {
        setTokenValid(false);
        setValidating(false);
        return;
      }

      // Find assistant by token
      const assistantsRef = collection(db, 'assistants');
      const q = query(assistantsRef, where('accessToken', '==', token));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setTokenValid(false);
        setValidating(false);
        toast.error('Invalid access link', {
          description: 'This link is not valid or has been deactivated'
        });
        return;
      }

      const data = snapshot.docs[0].data();

      // Check if assistant is active
      if (!data.isActive) {
        setTokenValid(false);
        setValidating(false);
        toast.error('Access deactivated', {
          description: 'This assistant access has been deactivated by the doctor'
        });
        return;
      }

      setAssistantData({ id: snapshot.docs[0].id, ...data });
      setTokenValid(true);
      setValidating(false);
    } catch (error) {
      console.error('Error validating token:', error);
      setTokenValid(false);
      setValidating(false);
    }
  };

  const handleLogin = async () => {
    if (!pin || pin.length !== 6) {
      toast.error('Please enter the 6-digit PIN');
      return;
    }

    if (!assistantData) {
      toast.error('Session expired', {
        description: 'Please request a new access link'
      });
      return;
    }

    setLoading(true);

    try {
      // Validate PIN
      if (pin !== assistantData.accessPin) {
        toast.error('Incorrect PIN', {
          description: 'Please check the PIN and try again'
        });
        setLoading(false);
        setPin('');
        return;
      }

      // PIN is correct - update last login
      if (db) {
        await updateDoc(doc(db, 'assistants', assistantData.id), {
          lastLoginAt: serverTimestamp()
        });
      }

      // MIGRATION: Convert old page IDs to new format
      const PAGE_ID_MIGRATION: Record<string, string> = {
        'profile-manager': 'profile',
        'qr-manager': 'qr',
        'schedule-manager': 'schedule',
        'preview-center': 'preview',
        'personalized-template': 'personalized-templates',
      };

      const migratePageIds = (pages: string[]): string[] => {
        return pages.map(pageId => PAGE_ID_MIGRATION[pageId] || pageId);
      };

      // Get allowed pages and migrate them
      const rawAllowedPages = assistantData.allowedPages || [];
      const migratedPages = migratePageIds(rawAllowedPages);

      console.log('🔐 LOGIN - Raw pages from DB:', rawAllowedPages);
      console.log('🔐 LOGIN - Migrated pages:', migratedPages);

      // Create localStorage session (compatible with App.tsx expectations)
      localStorage.setItem('healqr_is_assistant', 'true');
      localStorage.setItem('healqr_assistant_pages', JSON.stringify(migratedPages)); // Use migrated pages
      localStorage.setItem('healqr_assistant_doctor_id', assistantData.doctorId);
      localStorage.setItem('userId', assistantData.doctorId);
      localStorage.setItem('healqr_user_email', assistantData.doctorEmail);
      localStorage.setItem('healqr_user_name', assistantData.doctorName); // Doctor's name - FIXED
      localStorage.setItem('healqr_authenticated', 'true'); // Required by App.tsx
      localStorage.setItem('healqr_qr_code', 'assistant'); // Dummy value to pass auth check

      // Check if assistant belongs to a clinic
      if (assistantData.isClinic) {
        localStorage.setItem('healqr_is_clinic', 'true');
      }

      // Mark that profile is loaded so App.tsx goes to dashboard
      localStorage.setItem('healqr_profile_loaded', 'true');

      toast.success('Login successful!', {
        description: `Welcome, ${assistantData.assistantName}`
      });

      // Redirect to appropriate dashboard based on parent type
      setTimeout(() => {
        if (assistantData.isClinic) {
          window.location.href = '/?page=clinic-dashboard';
        } else {
          window.location.href = '/?page=dashboard';
        }
      }, 1000);

    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Login failed', {
        description: error.message || 'Please try again'
      });
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Validating access link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img src={healqrLogo} alt="HealQR" className="h-12" />
          </div>

          <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2 text-red-500">
              Invalid Access Link
            </h2>
            <p className="text-gray-400 mb-6">
              This link is not valid or has been deactivated. Please contact your doctor for a new access link.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg font-medium"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={healqrLogo} alt="HealQR" className="h-12" />
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">
              Assistant Login
            </h2>
            <p className="text-gray-400">
              Welcome, {assistantData?.assistantName}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {assistantData?.assistantEmail}
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="pin">Enter 6-Digit PIN</Label>
              <Input
                id="pin"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pin.length === 6) {
                    handleLogin();
                  }
                }}
                placeholder="000000"
                className="text-center text-2xl tracking-widest font-bold"
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Enter the PIN provided by your doctor
              </p>
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading || pin.length !== 6}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Login
                </>
              )}
            </Button>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-xs text-blue-400">
                💡 <strong>Tip:</strong> Save this link and PIN - you can use them to login anytime!
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Need help? Contact your doctor for assistance.
        </p>
      </div>
    </div>
  );
}
