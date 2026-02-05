import { Button } from './ui/button';
import { Card } from './ui/card';
import { CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import DashboardPromoDisplay from './DashboardPromoDisplay';
import BookingFlowLayout from './BookingFlowLayout';

interface WalkInPreviewProps {
  mode: 'verification' | 'complete';
}

export default function WalkInPreview({ mode }: WalkInPreviewProps) {
  // Mock Data
  const doctorData = {
    name: 'Dr. Anika Sharma',
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=200&auto=format&fit=crop',
    degrees: ['MBBS', 'MD'],
    specialty: 'Cardiologist',
    role: 'doctor'
  };

  const bookingData = {
    patientName: 'Rahul Kumar',
    whatsappNumber: '+91 98765 43210',
    visitType: 'walk-in',
    purposeOfVisit: 'General Checkup',
    doctorName: 'Dr. Anika Sharma'
  };

  const layoutProps = {
    doctorName: doctorData.name,
    doctorPhoto: doctorData.image,
    doctorDegrees: doctorData.degrees,
    doctorSpecialty: doctorData.specialty,
    showHeader: true
  };

  if (mode === 'complete') {
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

  // Verification Mode
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
                <p className="text-white capitalize">{bookingData.visitType.replace('-', ' ')}</p>
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
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-12 text-lg font-medium"
          >
            Confirm & Get Digital Record
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
