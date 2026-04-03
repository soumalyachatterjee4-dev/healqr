import { Button } from './ui/button';
import { X, Download, Share2, CheckCircle2, Building2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface ClinicQRSuccessProps {
  name: string;
  email: string;
  onProceedToLogin: () => void;
}

export default function ClinicQRSuccess({ name, email, onProceedToLogin }: ClinicQRSuccessProps) {
  const [showModal, setShowModal] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [adminQR, setAdminQR] = useState<string>('');
  const [systemCode, setSystemCode] = useState<string>('');

  useEffect(() => {
    // Load clinic data from localStorage
    const qrNumber = localStorage.getItem('healqr_qr_number');
    const clinicCode = localStorage.getItem('healqr_clinic_code');
    
    if (qrNumber) setAdminQR(qrNumber);
    if (clinicCode) setSystemCode(clinicCode);
  }, [email]);
  
  // Generate clinic profile URL slug from name
  const clinicSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const bookingUrl = `https://healqr.com/clinic/${clinicSlug}`;

  // Generate real QR code as data URL
  useEffect(() => {
    if (adminQR) {
      QRCode.toDataURL(bookingUrl, {
        width: 192,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then((url) => {
          setQrCodeUrl(url);
        })
        .catch((error) => {
          console.error('❌ QR Code generation error:', error);
        });
    }
  }, [bookingUrl, adminQR]);

  const handleDownload = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.download = `healqr-clinic-qr-${clinicSlug}.png`;
      link.href = qrCodeUrl;
      link.click();
    }
  };

  const handleShare = async () => {
    if (qrCodeUrl) {
      try {
        // Convert data URL to blob
        const response = await fetch(qrCodeUrl);
        const blob = await response.blob();
        const file = new File([blob], `healqr-clinic-qr-${clinicSlug}.png`, { type: 'image/png' });
        
        if (navigator.share) {
          await navigator.share({
            title: `${name} - HealQR Clinic QR Code`,
            text: `Book an appointment at ${name}`,
            files: [file],
          });
        } else {
          // Fallback: copy link
          await navigator.clipboard.writeText(bookingUrl);
          alert('Booking link copied to clipboard!');
        }
      } catch (error) {
        // Fallback: copy link
        try {
          await navigator.clipboard.writeText(bookingUrl);
          alert('Booking link copied to clipboard!');
        } catch (e) {
          // Silent fail
        }
      }
    }
  };

  const handleClose = () => {
    setShowModal(false);
    onProceedToLogin();
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-md relative my-8">
        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <h1 className="text-emerald-500 text-center mb-3 sm:mb-4 pt-2">
            Registration Successful!
          </h1>

          {/* Description */}
          <p className="text-center text-gray-400 mb-6 sm:mb-8 text-sm leading-relaxed">
            Here are your unique clinic codes. Doctors can use these codes to link to your clinic. Download or share your QR code!
          </p>

          {/* QR Code Card */}
          <div className="bg-black rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 border border-zinc-800">
            {/* QR Code Image */}
            <div className="bg-white rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 flex items-center justify-center min-h-[200px] sm:min-h-[240px]">
              {qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="Clinic QR Code"
                  className="w-40 h-40 sm:w-48 sm:h-48"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div className="text-gray-400 text-sm">
                  Generating QR Code...
                </div>
              )}
            </div>

            {/* Clinic Info */}
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="bg-blue-500 rounded-full p-2 sm:p-3 flex-shrink-0">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white mb-1 text-sm sm:text-base">
                  {name.toUpperCase()}
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm break-all">
                  {email}
                </p>
                <p className="text-blue-400 text-xs sm:text-sm mt-1">
                  Admin QR: {adminQR}
                </p>
                <p className="text-emerald-500 text-xs sm:text-sm mt-1">
                  System Code: {systemCode}
                </p>
                <p className="text-purple-400 text-xs mt-1 sm:mt-2 break-all">
                  🔗 {bookingUrl}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Button 
              onClick={handleDownload}
              variant="outline"
              className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white h-11 sm:h-12 text-sm"
              disabled={!qrCodeUrl}
            >
              <Download className="w-4 h-4 mr-1 sm:mr-2" />
              Download
            </Button>
            <Button 
              onClick={handleShare}
              variant="outline"
              className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white h-11 sm:h-12 text-sm"
              disabled={!qrCodeUrl}
            >
              <Share2 className="w-4 h-4 mr-1 sm:mr-2" />
              Share
            </Button>
          </div>

          {/* Proceed to Login Button */}
          <Button 
            onClick={() => {
              localStorage.removeItem('healqr_pending_clinic_signup');
              onProceedToLogin();
            }}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-12 sm:h-14 rounded-lg mb-4 sm:mb-6"
          >
            Proceed to Log In
          </Button>

          {/* Info Points */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-start gap-2 sm:gap-3">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                These codes are permanently linked to your clinic email
              </p>
            </div>
            <div className="flex items-start gap-2 sm:gap-3">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                Doctors can use these codes to link to your clinic
              </p>
            </div>
            <div className="flex items-start gap-2 sm:gap-3">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                Save these codes securely for clinic management
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

