import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import DashboardPromoDisplay from './DashboardPromoDisplay';
import { requestNotificationPermission } from '../services/fcm.service';
import { scheduleConsultationConfirmation, scheduleReviewRequest } from '../services/notificationService';
import BookingFlowLayout from './BookingFlowLayout';

interface VerifyWalkinProps {
  bookingId: string;
}

export default function VerifyWalkin({ bookingId }: VerifyWalkinProps) {
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);
  const [doctorData, setDoctorData] = useState<any>(null);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setError('Invalid booking link');
        setLoading(false);
        return;
      }

      try {
        const bookingRef = doc(db, 'bookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);

        if (!bookingSnap.exists()) {
          setError('Booking not found');
        } else {
          const data = bookingSnap.data();
          setBookingData(data);
          if (data.verifiedByPatient) {
            setVerified(true);
          }

          // Fetch Doctor Details if doctorId exists
          if (data.doctorId) {
            try {
              // Try fetching from doctors collection first
              const doctorRef = doc(db, 'doctors', data.doctorId);
              const doctorSnap = await getDoc(doctorRef);
              
              if (doctorSnap.exists()) {
                setDoctorData(doctorSnap.data());
              } else {
                // Fallback to adminProfiles if not found in doctors (for super admin cases)
                const adminRef = doc(db, 'adminProfiles', data.doctorId);
                const adminSnap = await getDoc(adminRef);
                if (adminSnap.exists()) {
                  setDoctorData(adminSnap.data());
                }
              }
            } catch (docErr) {
              console.error('Error fetching doctor details:', docErr);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const handleConfirm = async () => {
    if (!bookingId || !bookingData) return;
    setVerifying(true);

    try {
      // 1. Request Notification Permission (FCM)
      let fcmToken = null;
      try {
        // Normalize phone number for ID
        const rawPhone = bookingData.whatsappNumber || '';
        const digits = rawPhone.replace(/\D/g, '');
        const trimmed = digits.replace(/^91/, '');
        const phone10 = trimmed.slice(-10);
        const userId = `patient_${phone10}`;
        
        fcmToken = await requestNotificationPermission(userId, 'patient');
      } catch (err) {
        console.warn('FCM permission failed or denied:', err);
        // Continue anyway - verification is primary goal
      }

      // 2. Update Firestore
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        verifiedByPatient: true,
        verifiedAt: serverTimestamp(),
        status: 'confirmed', // Ensure status is confirmed
        isVerified: true, // Flag for UI
        fcmToken: fcmToken || null
      });

      setVerified(true);
      toast.success('Visit Confirmed!', {
        description: 'You will now receive your digital prescription and updates.'
      });

      // 3. Trigger Notifications
      try {
        const notificationData = {
          bookingId,
          patientPhone: bookingData.whatsappNumber,
          patientName: bookingData.patientName,
          doctorName: bookingData.doctorName,
          doctorId: bookingData.doctorId,
          consultationDate: new Date().toLocaleDateString(),
          consultationTime: new Date().toLocaleTimeString(),
          chamber: bookingData.chamber || 'Clinic',
          language: 'english', // Default for walk-in
          age: bookingData.age ? String(bookingData.age) : undefined,
          sex: bookingData.gender || undefined,
          purpose: bookingData.purposeOfVisit || undefined
        };

        // Schedule "Eye" Notification (30 mins delay)
        await scheduleConsultationConfirmation(notificationData);
        
        // Schedule "Star" Notification (24 hours delay)
        // Check for Clinic Restrictions
        let isReviewRestricted = false;
        if (bookingData.doctorId) {
          const doctorSnap = await getDoc(doc(db, 'doctors', bookingData.doctorId));
          if (doctorSnap.exists()) {
            const clinicId = doctorSnap.data().clinicId;
            if (clinicId) {
              const clinicSnap = await getDoc(doc(db, 'clinics', clinicId));
              if (clinicSnap.exists() && clinicSnap.data().centralizedReviews) {
                isReviewRestricted = true;
              }
            }
          }
        }

        if (!isReviewRestricted) {
          await scheduleReviewRequest(notificationData, new Date());
        } else {
          console.log('🚫 Review request suppressed by Clinic settings');
        }
        
        console.log('✅ Notifications scheduled successfully');
      } catch (notifErr) {
        console.error('⚠️ Failed to schedule notifications:', notifErr);
        // Non-blocking error
      }
      
    } catch (err) {
      console.error('Verification failed:', err);
      toast.error('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const layoutProps = {
    doctorName: doctorData?.name || bookingData?.doctorName,
    doctorPhoto: doctorData?.image,
    doctorDegrees: doctorData?.degrees || (doctorData?.qualification ? [doctorData.qualification] : []),
    doctorSpecialty: doctorData?.specialities?.[0] || (doctorData?.role === 'super_admin' ? 'Business Associate' : doctorData?.role),
    showHeader: true
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#0f1419] border-red-500/30 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400">{error}</p>
        </Card>
      </div>
    );
  }

  if (verified) {
    return (
      <BookingFlowLayout {...layoutProps}>
        <div className="flex flex-col items-center justify-center w-full">
          <Card className="w-full bg-[#0f1419] border-emerald-500/30 p-8 text-center mb-6">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Visit Confirmed!</h1>
            <p className="text-gray-400 mb-6">
              Thank you for verifying your details. You will receive your digital prescription and updates on your phone.
            </p>
            <div className="bg-gray-800/50 rounded-lg p-4 text-left mb-6">
              <p className="text-sm text-gray-500 mb-1">Patient Name</p>
              <p className="text-white font-medium text-lg mb-3">{bookingData.patientName}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Age</p>
                  <p className="text-white font-medium">{bookingData.age || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Sex</p>
                  <p className="text-white font-medium capitalize">{bookingData.gender || 'N/A'}</p>
                </div>
              </div>

              {bookingData.purposeOfVisit && (
                <div className="mb-3">
                  <p className="text-sm text-gray-500 mb-1">Purpose</p>
                  <p className="text-white font-medium">{bookingData.purposeOfVisit}</p>
                </div>
              )}
              
              <p className="text-sm text-gray-500 mb-1">Doctor</p>
              <p className="text-white font-medium">{bookingData.doctorName}</p>
            </div>
          </Card>

          {/* Ad Display for Revenue */}
          <div className="w-full">
            <DashboardPromoDisplay category="health-tip" placement="walkin-visit-complete" />
          </div>
        </div>
      </BookingFlowLayout>
    );
  }

  return (
    <BookingFlowLayout {...layoutProps}>
      <div className="flex flex-col items-center w-full">
        <div className="w-full mb-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Verify Your Visit</h1>
          <p className="text-gray-400 text-sm">
            Please confirm your details to receive your digital record.
          </p>
        </div>

        <Card className="w-full bg-[#0f1419] border-gray-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-800">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Confirm Details</h2>
              <p className="text-xs text-gray-500">Doctor: {bookingData.doctorName}</p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider">Patient Name</label>
              <p className="text-white text-lg font-medium">{bookingData.patientName}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Phone</label>
                <p className="text-white">{bookingData.whatsappNumber}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Visit Type</label>
                <p className="text-white capitalize">{bookingData.visitType?.replace('-', ' ') || 'Walk-in'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Age</label>
                <p className="text-white">{bookingData.age || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Sex</label>
                <p className="text-white capitalize">{bookingData.gender || 'N/A'}</p>
              </div>
            </div>

            {bookingData.purposeOfVisit && (
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Purpose</label>
                <p className="text-white">{bookingData.purposeOfVisit}</p>
              </div>
            )}
          </div>

          <Button 
            onClick={handleConfirm} 
            disabled={verifying}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-12 text-lg font-medium"
          >
            {verifying ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Confirm & Get Digital Record'
            )}
          </Button>
          
          <p className="text-xs text-gray-500 text-center mt-4">
            By confirming, you agree to receive updates about your appointment.
          </p>
        </Card>

        {/* Ad Display for Revenue */}
        <div className="w-full">
          <DashboardPromoDisplay category="health-tip" placement="walkin-visit-verification" />
        </div>
      </div>
    </BookingFlowLayout>
  );
}
