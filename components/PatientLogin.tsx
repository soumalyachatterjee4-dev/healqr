import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Phone, Lock, ArrowLeft, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import DashboardPromoDisplay from './DashboardPromoDisplay';

interface PatientLoginProps {
  onSuccess: (patientPhone: string) => void;
  onBack: () => void;
}

export default function PatientLogin({ onSuccess, onBack }: PatientLoginProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasBookings, setHasBookings] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const savedPatient = localStorage.getItem('patient_phone');
    const sessionExpiry = localStorage.getItem('patient_session_expiry');
    
    if (savedPatient && sessionExpiry) {
      const expiryTime = parseInt(sessionExpiry);
      if (Date.now() < expiryTime) {
        // Session still valid
        onSuccess(savedPatient);
      } else {
        // Session expired
        localStorage.removeItem('patient_phone');
        localStorage.removeItem('patient_session_expiry');
      }
    }
  }, [onSuccess]);

  const handlePhoneSubmit = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);

    try {
      // Try multiple phone number formats
      const phone10 = phoneNumber.replace(/\D/g, '').slice(-10); // Last 10 digits
      const formats = [
        `+91${phone10}`,
        phone10,
        `91${phone10}`,
        phoneNumber // Original as-is
      ];



      // Check if patient has any bookings (try all formats and field combinations)
      // Support both plain text and encrypted phone fields
      let querySnapshot = null;
      let matchedFormat = '';
      const phoneFields = [
        'whatsappNumber',           // Plain text (new bookings)
        'patientPhone',             // Plain text (old format)
        'phone',                    // Plain text (alternative)
        'phoneSearchable'           // Normalized field for search
      ];
      const collections = ['bookings', 'appointments']; // Check both collections

      console.log('🔍 Checking phone formats:', formats);
      console.log('📱 Input phone:', phoneNumber);

      for (const collectionName of collections) {
        const collectionRef = collection(db, collectionName);
        
        // Try querying with each field and format combination
        for (const fieldName of phoneFields) {
          for (const format of formats) {
            try {
              console.log(`🔍 Trying ${collectionName}.${fieldName}:`, format);
              const q = query(collectionRef, where(fieldName, '==', format));
              const snapshot = await getDocs(q);
              console.log('📊 Results:', snapshot.size);
              
              if (!snapshot.empty) {
                querySnapshot = snapshot;
                matchedFormat = format;
                console.log('✅ Match found in', collectionName, fieldName, ':', format);
                break;
              }
            } catch (err) {
              console.warn(`⚠️ Query failed for ${fieldName}:`, err);
            }
          }
          if (querySnapshot) break;
        }
        if (querySnapshot) break;
      }

      if (!querySnapshot || querySnapshot.empty) {
        console.error('❌ No bookings found for any format');
        toast.error('No consultation history found. For first-time patients, please book an appointment first.');
        setLoading(false);
        return;
      }

      // Use the format that worked
      const formattedPhone = matchedFormat;

      setHasBookings(true);
      setPhoneNumber(formattedPhone); // Update with matched format

      // Generate 4-digit OTP
      const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(otpCode);

      // Send OTP via FCM notification (Cloud Function will handle it)
      await sendOtpNotification(formattedPhone, otpCode);

      // Move to OTP verification step
      setStep('otp');
      toast.success(`Found ${querySnapshot.size} consultation(s)! OTP sent to your device`);

    } catch (error) {
      console.error('Error checking bookings:', error);
      toast.error('Failed to verify phone number');
    } finally {
      setLoading(false);
    }
  };

  const sendOtpNotification = async (phone: string, otpCode: string) => {
    try {
      // Store OTP in Firestore for backend Cloud Function to send via FCM
      await addDoc(collection(db, 'patientOtpRequests'), {
        phoneNumber: phone,
        otp: otpCode,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)), // 5 minutes
        status: 'pending'
      });

      // Firebase Cloud Function 'sendPatientOTP' will automatically trigger
      // when this document is created and send FCM notification to patient's device
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw error;
    }
  };

  const handleOtpVerify = () => {
    if (!otp || otp.length !== 4) {
      toast.error('Please enter the 4-digit OTP');
      return;
    }

    if (otp !== generatedOtp) {
      toast.error('Invalid OTP. Please try again.');
      return;
    }

    // OTP verified successfully
    const formattedPhone = phoneNumber.startsWith('+91') 
      ? phoneNumber 
      : `+91${phoneNumber}`;

    // Store session (10 years - essentially forever)
    const expiryTime = Date.now() + (10 * 365 * 24 * 60 * 60 * 1000);
    localStorage.setItem('patient_phone', formattedPhone);
    localStorage.setItem('patient_session_expiry', expiryTime.toString());

    toast.success('Login successful!');
    onSuccess(formattedPhone);
  };

  const handleResendOtp = async () => {
    const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(newOtp);
    setOtp('');

    const formattedPhone = phoneNumber.startsWith('+91') 
      ? phoneNumber 
      : `+91${phoneNumber}`;

    await sendOtpNotification(formattedPhone, newOtp);
    toast.success('New OTP sent!');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              onClick={onBack}
              variant="ghost"
              className="text-emerald-500 hover:bg-emerald-500/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Patient Login</h1>
              <p className="text-sm text-gray-400">Access your consultation history</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Health Tip Card */}
        <DashboardPromoDisplay category="health-tip" placement={step === 'otp' ? 'patient-otp' : 'patient-login'} />

        {/* Login Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            {step === 'phone' ? (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Enter Mobile Number</h2>
                  <p className="text-gray-400">We'll send you a verification code</p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      type="tel"
                      placeholder="Enter 10-digit mobile number"
                      className="pl-10 h-14 text-lg bg-zinc-800 border-zinc-700 text-white"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      onKeyPress={(e) => e.key === 'Enter' && handlePhoneSubmit()}
                    />
                  </div>

                  <Button
                    onClick={handlePhoneSubmit}
                    disabled={loading || phoneNumber.length < 10}
                    className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
                  >
                    {loading ? 'Verifying...' : 'Send OTP'}
                  </Button>

                  <div className="flex items-start gap-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <Shield className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-400">
                      <p className="font-medium mb-1">Secure Login</p>
                      <p className="text-blue-400/80">We'll verify your number using OTP sent via notification. Make sure notifications are enabled.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Enter OTP</h2>
                  <p className="text-gray-400">
                    We sent a 4-digit code to
                    <br />
                    <span className="text-white font-medium">+91 {phoneNumber}</span>
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Development OTP Display */}
                  {generatedOtp && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-xs text-yellow-400 mb-1 font-medium">🔧 TEST MODE - OTP:</p>
                      <p className="text-3xl font-bold text-yellow-400 text-center tracking-widest">{generatedOtp}</p>
                      <p className="text-xs text-yellow-400/70 text-center mt-2">Copy this OTP and enter below</p>
                    </div>
                  )}

                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter 4-digit OTP"
                    className="text-center text-2xl tracking-widest h-14 bg-zinc-800 border-zinc-700 text-white"
                    maxLength={4}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    onKeyPress={(e) => e.key === 'Enter' && handleOtpVerify()}
                  />

                  <Button
                    onClick={handleOtpVerify}
                    disabled={otp.length !== 4}
                    className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
                  >
                    Verify & Login
                  </Button>

                  <div className="flex items-center justify-between pt-4">
                    <Button
                      onClick={() => {
                        setStep('phone');
                        setOtp('');
                        setGeneratedOtp('');
                      }}
                      variant="ghost"
                      className="text-gray-400 hover:text-white"
                    >
                      Change Number
                    </Button>
                    <Button
                      onClick={handleResendOtp}
                      variant="ghost"
                      className="text-emerald-500 hover:text-emerald-400"
                    >
                      Resend OTP
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Section */}
        <div className="text-center space-y-2 text-sm text-gray-400">
          <p>Your session will remain active (auto-login enabled)</p>
          <p>Add this page to your home screen for quick access</p>
        </div>
      </div>
    </div>
  );
}
