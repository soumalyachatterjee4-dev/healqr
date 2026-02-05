import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { toast } from 'sonner';
import { Check, AlertCircle, Loader2, Mail, Calendar, MapPin, Edit2 } from 'lucide-react';

interface DoctorActivateProps {
  doctorCode: string;
  email: string;
}

export default function DoctorActivate({ doctorCode, email }: DoctorActivateProps) {
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [doctorData, setDoctorData] = useState<any>(null);
  const [doctorDocId, setDoctorDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);
  
  // Editable fields
  const [editableDob, setEditableDob] = useState('');
  const [editablePinCode, setEditablePinCode] = useState('');

  useEffect(() => {
    loadDoctorData();
  }, [doctorCode, email]);

  const loadDoctorData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Query doctors collection to find doctor by doctorCode field
      const doctorsRef = collection(db, 'doctors');
      const q = query(doctorsRef, where('doctorCode', '==', doctorCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Invalid activation link. Doctor not found.');
        setLoading(false);
        return;
      }

      const doctorDoc = querySnapshot.docs[0];
      const data = doctorDoc.data();
      
      // Verify email matches
      if (data.email !== email) {
        setError('Invalid activation link. Email mismatch.');
        setLoading(false);
        return;
      }

      // Check if already activated
      if (data.status === 'active') {
        setError('This account is already activated. Please proceed to login.');
        setLoading(false);
        return;
      }

      setDoctorDocId(doctorDoc.id);
      setDoctorData(data);
      // Initialize editable fields
      setEditableDob(data.dateOfBirth || '');
      setEditablePinCode(data.pinCode || '');
      setLoading(false);
    } catch (err: any) {
      console.error('Error loading doctor data:', err);
      setError('Failed to load activation data. Please try again.');
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!doctorData || !doctorDocId) return;

    // Validate required fields
    if (!editableDob) {
      toast.error('Please set your Date of Birth');
      return;
    }
    if (!editablePinCode) {
      toast.error('Please set your PIN Code');
      return;
    }

    try {
      setActivating(true);

      // Update doctor document with edited fields and activate
      const doctorRef = doc(db, 'doctors', doctorDocId);
      const batch = writeBatch(db);
      
      batch.update(doctorRef, {
        dateOfBirth: editableDob,
        pinCode: editablePinCode,
        status: 'active',
        activatedAt: new Date(),
        emailVerified: true,
        dashboardAccessEnabled: true,
        profileLocked: true
      });

      await batch.commit();

      toast.success('Account Activated Successfully!');
      setActivated(true);
    } catch (err: any) {
      console.error('Error activating account:', err);
      toast.error('Failed to activate account: ' + err.message);
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#1a1f2e] to-[#0a0f1a] flex items-center justify-center p-4">
        <div className="bg-[#1a1f2e] rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-800">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            <p className="text-white text-lg">Loading activation details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#1a1f2e] to-[#0a0f1a] flex items-center justify-center p-4">
        <div className="bg-[#1a1f2e] rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-800">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white text-center">Activation Failed</h2>
            <p className="text-gray-400 text-center">{error}</p>
            <button
              onClick={() => {
                // Clear sessions and redirect to login with email pre-filled
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = `/?login=true&email=${encodeURIComponent(email)}`;
              }}
              className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activated) {
    const handleProceedToLogin = () => {
      // Clear all existing sessions to prevent wrong user from loading
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to login page with email pre-filled
      window.location.href = `/?login=true&email=${encodeURIComponent(email)}`;
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#1a1f2e] to-[#0a0f1a] flex items-center justify-center p-4">
        <div className="bg-[#1a1f2e] rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-800">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white text-center">Account Activated!</h2>
            <p className="text-gray-400 text-center">
              Welcome, Dr. {doctorData?.name}! Your HealQR doctor account has been successfully activated.
            </p>
            <div className="w-full mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-400 text-center">
                Your clinic can now book appointments on your behalf. Login to manage your schedule and patient records.
              </p>
            </div>
            <button
              onClick={handleProceedToLogin}
              className="mt-4 w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold"
            >
              Proceed to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#1a1f2e] to-[#0a0f1a] flex items-center justify-center p-4">
      <div className="bg-[#1a1f2e] rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-800">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-3xl font-bold text-white">
              {doctorData?.name?.charAt(0) || 'D'}
            </span>
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Activate Your Account</h1>
            <p className="text-gray-400">Welcome to HealQR, Dr. {doctorData?.name}</p>
          </div>

          <div className="w-full space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
              <Mail className="w-5 h-5 text-emerald-500" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Email (locked)</p>
                <p className="text-sm text-white">{doctorData?.email}</p>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-emerald-500 mt-1" />
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    value={editableDob}
                    onChange={(e) => setEditableDob(e.target.value)}
                    className="w-full bg-gray-700/50 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-emerald-500 mt-1" />
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-2">PIN Code *</label>
                  <input
                    type="text"
                    value={editablePinCode}
                    onChange={(e) => setEditablePinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-gray-700/50 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="6-digit PIN code"
                    maxLength={6}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-400 text-center">
              <Edit2 className="w-4 h-4 inline mr-1" />
              You can edit your Date of Birth and PIN Code before activating. 
              These fields will be locked after activation.
            </p>
          </div>

          <button
            onClick={handleActivate}
            disabled={activating}
            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
          >
            {activating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Activating...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Activate Account
              </>
            )}
          </button>

          <button
            onClick={() => window.location.href = '/'}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
