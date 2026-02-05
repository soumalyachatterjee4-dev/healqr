import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Menu,
  Download,
  Palette,
  Building2,
  Image as ImageIcon,
  Zap
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Slider } from './ui/slider';
import ClinicSidebar from './ClinicSidebar';
import QRCode from 'qrcode';
import { toast } from 'sonner';

interface ClinicQRManagerProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
  profileData?: {
    image: string | null;
    name: string;
  };
}

type DownloadSize = {
  name: string;
  width: number;
  height: number;
  description: string;
};

export default function ClinicQRManager({ onMenuChange, onLogout, profileData }: ClinicQRManagerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Subscription status state
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [assignedQrCode, setAssignedQrCode] = useState<string>('');

  // Clinic Information
  const clinicImage = profileData?.profileImage || profileData?.image || null;
  const clinicName = profileData?.name || 'Clinic Name';
  
  console.log('🏥 QR Manager Profile Data:', {
    hasImage: !!clinicImage,
    imageSrc: clinicImage?.substring(0, 50) + '...',
    name: clinicName
  });

  // QR Customization
  const [qrSize, setQrSize] = useState(300);
  const [qrColor, setQrColor] = useState('#000000');
  const [qrBackgroundColor, setQrBackgroundColor] = useState('#ffffff');
  const [qrUrl, setQrUrl] = useState('https://teamhealqr.web.app');

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Preset download sizes
  const downloadSizes: DownloadSize[] = [
    { name: '1" × 1"', width: 300, height: 300, description: 'Small sticker' },
    { name: '2" × 2"', width: 600, height: 600, description: 'Medium sticker' },
    { name: '4" × 4"', width: 1200, height: 1200, description: 'Large sticker' },
    { name: 'A4 Portrait', width: 2480, height: 3508, description: 'Print quality' },
    { name: 'A4 Landscape', width: 3508, height: 2480, description: 'Print quality' },
    { name: 'FB Post', width: 1200, height: 630, description: 'Facebook' },
    { name: 'IG Story', width: 1080, height: 1920, description: 'Instagram' },
    { name: 'IG Post', width: 1080, height: 1080, description: 'Instagram' },
    { name: 'LinkedIn', width: 1200, height: 627, description: 'LinkedIn' },
    { name: 'Poster', width: 1920, height: 2880, description: 'Large poster' },
  ];

  // Load subscription data from Firestore
  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      // Get user ID from localStorage (works for clinics)
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        console.log('⚠️ No userId found in localStorage');
        setLoadingSubscription(false);
        return;
      }

      // Set personalized QR URL with clinic UID FIRST (before loading other data)
      const bookingUrl = `https://teamhealqr.web.app?clinicId=${userId}`;
      setQrUrl(bookingUrl);
      console.log('✅ QR URL set to:', bookingUrl);

      const { db } = await import('../lib/firebase/config');
      if (!db) {
        setLoadingSubscription(false);
        return;
      }

      const { doc, getDoc } = await import('firebase/firestore');
      const clinicDocRef = doc(db, 'clinics', userId);
      const clinicDoc = await getDoc(clinicDocRef);

      if (clinicDoc.exists()) {
        const data = clinicDoc.data();
        setSubscriptionData(data);
        
        // Set assigned activation QR code
        if (data.qrNumber) {
          setAssignedQrCode(data.qrNumber);
        }
        
        console.log('✅ Loaded subscription data:', data);
        console.log('✅ Assigned QR Code:', data.qrNumber);
      }
    } catch (error) {
      console.error('❌ Error loading subscription data:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  // Generate QR Code
  useEffect(() => {
    generateQRCode();
  }, [qrUrl, qrSize, qrColor, qrBackgroundColor]);

  const generateQRCode = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(qrUrl, {
        width: qrSize,
        margin: 2,
        errorCorrectionLevel: 'H', // High error correction for better scannability
        color: {
          dark: qrColor,
          light: qrBackgroundColor,
        },
        type: 'image/png',
        rendererOpts: {
          quality: 1, // Maximum quality
        },
      });
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleDownloadQR = () => {
    if (qrCodeDataUrl) {
      const link = document.createElement('a');
      link.download = `QR-${clinicName.replace(/\s+/g, '-')}.png`;
      link.href = qrCodeDataUrl;
      link.click();
    }
  };

  // Draw template - Professional Modern Design (Blue theme for clinics)
  const drawTemplate = async (
    ctx: CanvasRenderingContext2D,
    qrImg: HTMLImageElement,
    width: number,
    height: number
  ) => {
    // Load clinic image first if available
    let clinicImageElement: HTMLImageElement | null = null;
    if (clinicImage) {
      clinicImageElement = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => {
          console.error('❌ Failed to load clinic image');
          resolve(null);
        };
        img.src = clinicImage;
      });
      console.log('✅ Clinic image loaded successfully:', !!clinicImageElement);
    }

    // Gradient background - Modern blue tones for clinic
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#eff6ff'); // Very light blue
    gradient.addColorStop(1, '#dbeafe'); // Slightly darker light blue
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle decorative corner elements
    const cornerSize = width * 0.08;
    const accentColor = '#3b82f6'; // Blue-500
    
    // Top-left corner accent
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cornerSize, 0);
    ctx.lineTo(0, cornerSize);
    ctx.closePath();
    ctx.fill();

    // Bottom-right corner accent
    ctx.beginPath();
    ctx.moveTo(width, height);
    ctx.lineTo(width - cornerSize, height);
    ctx.lineTo(width, height - cornerSize);
    ctx.closePath();
    ctx.fill();

    const padding = width * 0.06;

    // HEADER SECTION - Clean white card with shadow effect
    const headerHeight = height * 0.24;
    const headerY = padding;
    const headerWidth = width - (padding * 2);
    const cardRadius = width * 0.02;

    // Shadow effect
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    // White header card
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(padding, headerY, headerWidth, headerHeight, cardRadius);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Clinic circular image (left side, larger and more prominent)
    const imageSize = headerHeight * 0.72;
    const imageX = padding + (width * 0.06);
    const imageY = headerY + (headerHeight - imageSize) / 2;
    
    // Clinic image with professional styling
    if (clinicImageElement) {
      ctx.save();
      
      // Clip to circle
      ctx.beginPath();
      ctx.arc(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      
      // Draw image
      ctx.drawImage(clinicImageElement, imageX, imageY, imageSize, imageSize);
      ctx.restore();

      // Blue gradient border around image
      const borderGradient = ctx.createLinearGradient(
        imageX, imageY,
        imageX + imageSize, imageY + imageSize
      );
      borderGradient.addColorStop(0, '#3b82f6');
      borderGradient.addColorStop(1, '#2563eb');
      
      ctx.strokeStyle = borderGradient;
      ctx.lineWidth = Math.max(5, width * 0.006);
      ctx.beginPath();
      ctx.arc(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Professional placeholder with icon-like appearance
      const placeholderGradient = ctx.createRadialGradient(
        imageX + imageSize / 2, imageY + imageSize / 2, 0,
        imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2
      );
      placeholderGradient.addColorStop(0, '#dbeafe');
      placeholderGradient.addColorStop(1, '#bfdbfe');
      
      ctx.fillStyle = placeholderGradient;
      ctx.beginPath();
      ctx.arc(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Blue border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = Math.max(5, width * 0.006);
      ctx.beginPath();
      ctx.arc(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw building icon in placeholder
      ctx.fillStyle = '#3b82f6';
      ctx.font = `${imageSize * 0.4}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏥', imageX + imageSize / 2, imageY + imageSize / 2);
    }

    // Clinic name (right side, elegant typography)
    const textX = imageX + imageSize + (width * 0.05);
    const headerTextY = headerY + headerHeight * 0.45;
    const maxTextWidth = headerWidth - (textX - padding) - (width * 0.04);

    // Clinic name - Bold, dark gray with text wrapping
    ctx.fillStyle = '#1f2937';
    const nameFontSize = height * 0.045;
    ctx.font = `bold ${nameFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    const nameText = clinicName.toUpperCase();
    let nameLine1 = nameText;
    let nameLine2 = '';
    
    // Check if name needs wrapping
    const nameMetrics = ctx.measureText(nameText);
    if (nameMetrics.width > maxTextWidth) {
      const words = nameText.split(' ');
      nameLine1 = '';
      nameLine2 = '';
      let currentLine = 1;
      
      for (const word of words) {
        const testLine = currentLine === 1 ? 
          (nameLine1 ? nameLine1 + ' ' + word : word) :
          (nameLine2 ? nameLine2 + ' ' + word : word);
        const testMetrics = ctx.measureText(testLine);
        
        if (testMetrics.width > maxTextWidth && currentLine === 1) {
          currentLine = 2;
          nameLine2 = word;
        } else {
          if (currentLine === 1) nameLine1 = testLine;
          else nameLine2 = testLine;
        }
      }
    }
    
    ctx.fillText(nameLine1, textX, headerTextY);
    if (nameLine2) {
      ctx.fillText(nameLine2, textX, headerTextY + (height * 0.048));
    }

    // MIDDLE SECTION - Elegant call to action
    let currentY = headerY + headerHeight + (height * 0.08);
    
    // "BOOK YOUR APPOINTMENT" text - modern typography
    ctx.fillStyle = '#1f2937';
    ctx.font = `600 ${height * 0.032}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BOOK YOUR APPOINTMENT', width / 2, currentY);

    // Decorative line above SCAN ME
    currentY += height * 0.05;
    const lineWidth = width * 0.15;
    const lineX = (width - lineWidth) / 2;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = Math.max(3, width * 0.003);
    ctx.beginPath();
    ctx.moveTo(lineX, currentY);
    ctx.lineTo(lineX + lineWidth, currentY);
    ctx.stroke();

    // SCAN ME - bold, blue color
    currentY += height * 0.055;
    ctx.fillStyle = '#2563eb';
    ctx.font = `bold ${height * 0.068}px system-ui, -apple-system, sans-serif`;
    ctx.fillText('SCAN ME', width / 2, currentY);

    // QR CODE CARD - Modern white card with shadow
    currentY += height * 0.05;
    const footerHeight = height * 0.08;
    const availableHeight = height - currentY - footerHeight - (padding * 2);
    const qrBoxSize = Math.min(width * 0.52, availableHeight);
    const qrX = (width - qrBoxSize) / 2;
    const qrY = currentY;
    const qrCardRadius = width * 0.025;

    // Shadow for QR card
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;

    // White QR card background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(qrX, qrY, qrBoxSize, qrBoxSize, qrCardRadius);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Subtle blue border around QR card
    ctx.strokeStyle = '#dbeafe';
    ctx.lineWidth = Math.max(2, width * 0.003);
    ctx.beginPath();
    ctx.roundRect(qrX, qrY, qrBoxSize, qrBoxSize, qrCardRadius);
    ctx.stroke();

    // Draw QR code inside card
    const qrPadding = qrBoxSize * 0.12;
    const qrDrawSize = qrBoxSize - (qrPadding * 2);
    ctx.drawImage(qrImg, qrX + qrPadding, qrY + qrPadding, qrDrawSize, qrDrawSize);

    // FOOTER - Minimalist branding
    const footerY = height - padding - footerHeight;
    
    // Subtle divider line
    ctx.strokeStyle = '#dbeafe';
    ctx.lineWidth = Math.max(2, width * 0.002);
    ctx.beginPath();
    ctx.moveTo(padding + width * 0.2, footerY + footerHeight * 0.25);
    ctx.lineTo(width - padding - width * 0.2, footerY + footerHeight * 0.25);
    ctx.stroke();

    // Footer text - elegant, small
    ctx.fillStyle = '#6b7280';
    ctx.font = `500 ${height * 0.024}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Powered by', width / 2, footerY + footerHeight * 0.55);
    
    // HealQR branding - blue color
    ctx.fillStyle = '#3b82f6';
    ctx.font = `700 ${height * 0.028}px system-ui, -apple-system, sans-serif`;
    ctx.fillText('HEALQR.COM', width / 2, footerY + footerHeight * 0.82);
  };

  const handleDownloadWithSize = async (size: DownloadSize) => {
    const canvas = canvasRef.current;
    if (!canvas || !qrCodeDataUrl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size.width;
    canvas.height = size.height;

    const qrImg = new Image();
    qrImg.onload = async () => {
      await drawTemplate(ctx, qrImg, size.width, size.height);

      setTimeout(() => {
        const link = document.createElement('a');
        link.download = `${clinicName.replace(/\s+/g, '-')}-${size.name.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }, 500);
    };
    qrImg.src = qrCodeDataUrl;
  };

  const colorPresets = [
    { name: 'Black', value: '#000000' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Red', value: '#ef4444' },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex">
      <ClinicSidebar 
        activeMenu="qr-manager" 
        onMenuChange={onMenuChange || (() => {})}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:ml-64">
        <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-white hover:text-blue-500 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1>QR Manager</h1>
        </div>

        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Assigned QR Code Notice */}
            {assignedQrCode && (
              <div className="mb-6 bg-blue-500/10 border border-blue-500 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">Your Activation QR Code</h3>
                    <p className="text-3xl font-mono font-bold text-blue-400 mb-2">{assignedQrCode}</p>
                    <p className="text-gray-300 text-sm mb-2">
                      This code is permanently linked to your clinic account. Physical standees with this QR have been provided by your MR representative.
                    </p>
                    <p className="text-gray-400 text-xs">
                      Your QR is pre-printed on standees at your clinic. Patients can scan these to book appointments instantly.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* QR Preview */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h2 className="text-blue-400 mb-6">Live Preview</h2>

                  <div className="bg-white rounded-lg p-8 flex items-center justify-center min-h-[400px]">
                    {qrCodeDataUrl ? (
                      <img 
                        src={qrCodeDataUrl} 
                        alt="QR Code" 
                        className="max-w-full h-auto"
                      />
                    ) : (
                      <p className="text-gray-500">Generating QR code...</p>
                    )}
                  </div>

                  <div className="mt-6">
                    <Button
                      onClick={handleDownloadQR}
                      className="w-full bg-blue-500 hover:bg-blue-600 h-12 flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download QR Only
                    </Button>
                  </div>
                </div>

                {/* Preset Sizes */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h3 className="text-blue-400 mb-6 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Download Professional Template
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    {downloadSizes.map((size) => (
                      <Button
                        key={size.name}
                        onClick={() => handleDownloadWithSize(size)}
                        variant="outline"
                        className="h-auto py-3 px-4 flex flex-col items-start border-zinc-700 hover:border-blue-500 hover:bg-blue-500/10"
                      >
                        <span className="text-blue-400">{size.name}</span>
                        <span className="text-xs text-gray-400">{size.description}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Your Personal URL */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <Label className="mb-4 block text-gray-400">Your Personal URL</Label>
                  <div className="bg-black border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-blue-400 break-all flex-1">{qrUrl}</p>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(qrUrl);
                            toast.success('URL copied to clipboard!');
                          }}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 flex-shrink-0"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(qrUrl, '_blank')}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 flex-shrink-0"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" x2="21" y1="14" y2="3" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QR Customization */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h3 className="text-blue-400 mb-6 flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Customize QR Code
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <Label className="mb-3 block">
                        QR Code Size: {qrSize}px
                      </Label>
                      <Slider
                        value={[qrSize]}
                        onValueChange={(value) => setQrSize(value[0])}
                        min={200}
                        max={600}
                        step={50}
                        className="w-full [&_[data-slot=slider-range]]:bg-blue-500 [&_[data-slot=slider-thumb]]:border-blue-500"
                      />
                      <div className="flex justify-between mt-2">
                        <span className="text-xs text-gray-500">200px</span>
                        <span className="text-xs text-gray-500">600px</span>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-3 block">QR Code Color</Label>
                      <div className="flex gap-2 mb-3">
                        {colorPresets.map((preset) => (
                          <button
                            key={preset.value}
                            onClick={() => setQrColor(preset.value)}
                            className={`w-12 h-12 rounded-lg border-2 transition-all ${
                              qrColor === preset.value
                                ? 'border-blue-500 scale-110'
                                : 'border-zinc-700 hover:border-zinc-600'
                            }`}
                            style={{ backgroundColor: preset.value }}
                            title={preset.name}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="color"
                          value={qrColor}
                          onChange={(e) => setQrColor(e.target.value)}
                          className="w-20 h-12 cursor-pointer bg-black border-zinc-800"
                        />
                        <Input
                          type="text"
                          value={qrColor}
                          onChange={(e) => setQrColor(e.target.value)}
                          placeholder="#000000"
                          className="flex-1 bg-black border-zinc-800 text-white h-12 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">QR Code URL</Label>
                      <Input
                        type="text"
                        value={qrUrl}
                        onChange={(e) => setQrUrl(e.target.value)}
                        placeholder="https://healqr.com/clinic/..."
                        className="bg-black border-zinc-800 text-white h-12 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                  <h3 className="text-blue-400 mb-3">Professional Design</h3>
                  <ul className="text-gray-300 text-sm space-y-2">
                    <li>• Blue header with clinic logo & name</li>
                    <li>• Large centered QR code</li>
                    <li>• Blue footer with HealQR branding</li>
                    <li>• 100% match to reference design</li>
                    <li>• Perfect for patient presentation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
