import { Button } from './ui/button';
import { X, Download, Share2, CheckCircle2, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface QRCodeSuccessProps {
  name: string;
  email: string;
  onProceedToLogin: () => void;
}

export default function QRCodeSuccess({ name, email, onProceedToLogin }: QRCodeSuccessProps) {
  const [showModal, setShowModal] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  
  // Generate QR ID based on email (in real app, this comes from backend)
  const qrId = `VZT-${email.substring(0, 3).toUpperCase()}${Math.floor(Math.random() * 100000)}`;
  
  // Generate doctor profile URL slug from name
  const doctorSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const bookingUrl = `https://healqr.com/dr/${doctorSlug}`;

  // Generate real QR code as data URL
  useEffect(() => {
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
  }, [bookingUrl, name, email]);

  const handleDownload = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.download = `healqr-qr-${doctorSlug}.png`;
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
        const file = new File([blob], `healqr-qr-${doctorSlug}.png`, { type: 'image/png' });
        
        if (navigator.share) {
          await navigator.share({
            title: `Dr. ${name} - HealQR QR Code`,
            text: `Book an appointment with Dr. ${name}`,
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
            Here is your unique QR code. Patients can scan this to book appointments directly with you. Download or share it on your social media!
          </p>

          {/* QR Code Card */}
          <div className="bg-black rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 border border-zinc-800">
            {/* QR Code Image - REAL SCANNABLE QR CODE */}
            <div className="bg-white rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 flex items-center justify-center min-h-[200px] sm:min-h-[240px]">
              {qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code"
                  className="w-40 h-40 sm:w-48 sm:h-48"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div className="text-gray-400 text-sm">
                  Generating QR Code...
                </div>
              )}
            </div>

            {/* Doctor Info */}
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="bg-emerald-500 rounded-full p-2 sm:p-3 flex-shrink-0">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white mb-1 text-sm sm:text-base">
                  {name.toUpperCase()}
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm break-all">
                  {email}
                </p>
                <p className="text-emerald-500 text-xs sm:text-sm mt-1">
                  QR ID: {qrId}
                </p>
                <p className="text-blue-400 text-xs mt-1 sm:mt-2 break-all">
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
              console.log('🔥 PROCEED TO LOGIN CLICKED!');
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
                This QR code is permanently linked to your email address
              </p>
            </div>
            <div className="flex items-start gap-2 sm:gap-3">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                Patients can scan this to book appointments instantly
              </p>
            </div>
            <div className="flex items-start gap-2 sm:gap-3">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                Share on social media to increase your visibility
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
