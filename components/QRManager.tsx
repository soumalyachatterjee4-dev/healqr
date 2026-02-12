import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Menu,
  Download,
  Palette,
  User,
  GraduationCap,
  Stethoscope,
  Image as ImageIcon,
  Zap,
  QrCode
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import DashboardSidebar from './DashboardSidebar';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import SocialMediaKit from './SocialMediaKit';

interface QRManagerProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
  onTestBooking?: () => void;
  profileData?: {
    image: string | null;
    name: string;
    degrees: string[];
    specialities: string[];
  };
  activeAddOns?: string[];
  initialTab?: string;
}

type DownloadSize = {
  name: string;
  width: number;
  height: number;
  description: string;
};

export default function QRManager({ onMenuChange, onLogout, onTestBooking, profileData, activeAddOns = [], initialTab = 'qr-generator' }: QRManagerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Subscription status state
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [assignedQrCode, setAssignedQrCode] = useState<string>('');

  // Doctor Information
  const doctorImage = profileData?.image || null;
  const doctorName = profileData?.name || 'Doctor Name';
  const degree = (profileData?.degrees && profileData.degrees.length > 0) ? profileData.degrees.join(', ') : 'MBBS';
  const speciality = (profileData?.specialities && profileData.specialities.length > 0) ? profileData.specialities.join(', ') : 'General Physician';

  console.log('🩺 QR Manager Profile Data:', {
    hasImage: !!doctorImage,
    imageSrc: doctorImage?.substring(0, 50) + '...',
    name: doctorName,
    degree,
    speciality
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
      // Get user ID from localStorage (works for both doctors and assistants)
      const userId = localStorage.getItem('userId');

      if (!userId) {
        console.log('⚠️ No userId found in localStorage');
        setLoadingSubscription(false);
        return;
      }

      // Set personalized QR URL with doctor UID FIRST (before loading other data)
      const bookingUrl = `https://teamhealqr.web.app?doctorId=${userId}`;
      setQrUrl(bookingUrl);
      console.log('✅ QR URL set to:', bookingUrl);

      const { db } = await import('../lib/firebase/config');
      if (!db) {
        setLoadingSubscription(false);
        return;
      }

      const { doc, getDoc } = await import('firebase/firestore');
      const doctorDocRef = doc(db, 'doctors', userId);
      const doctorDoc = await getDoc(doctorDocRef);

      if (doctorDoc.exists()) {
        const data = doctorDoc.data();
        setSubscriptionData(data);

        // Set assigned activation QR code
        if (data.activationQrCode) {
          setAssignedQrCode(data.activationQrCode);
        }

        // Calculate days remaining
        if (data.trialEndDate) {
          const today = new Date();
          const endDate = data.trialEndDate.toDate();
          const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
          setSubscriptionData({...data, calculatedDaysRemaining: daysLeft});
        }

        console.log('✅ Loaded subscription data:', data);
        console.log('✅ Assigned QR Code:', data.activationQrCode);
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
      });
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleDownloadQR = () => {
    if (qrCodeDataUrl) {
      const link = document.createElement('a');
      link.download = `QR-${doctorName.replace(/\s+/g, '-')}.png`;
      link.href = qrCodeDataUrl;
      link.click();
    }
  };

  // Draw template - Professional Modern Design
  const drawTemplate = async (
    ctx: CanvasRenderingContext2D,
    qrImg: HTMLImageElement,
    width: number,
    height: number
  ) => {
    // Load doctor image first if available
    let doctorImageElement: HTMLImageElement | null = null;
    if (doctorImage) {
      doctorImageElement = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => {
          console.error('❌ Failed to load doctor image');
          resolve(null);
        };
        img.src = doctorImage;
      });
      console.log('✅ Doctor image loaded successfully:', !!doctorImageElement);
    }

    // Gradient background - Modern emerald to teal
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f0fdf4'); // Very light green
    gradient.addColorStop(1, '#ecfdf5'); // Slightly darker light green
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle decorative corner elements
    const cornerSize = width * 0.08;
    const accentColor = '#10b981'; // Emerald-500

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

    // Doctor circular image (left side, larger and more prominent)
    const imageSize = headerHeight * 0.72;
    const imageX = padding + (width * 0.06);
    const imageY = headerY + (headerHeight - imageSize) / 2;

    // Doctor image with professional styling
    if (doctorImageElement) {
      ctx.save();

      // Clip to circle
      ctx.beginPath();
      ctx.arc(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Draw image
      ctx.drawImage(doctorImageElement, imageX, imageY, imageSize, imageSize);
      ctx.restore();

      // Emerald gradient border around image
      const borderGradient = ctx.createLinearGradient(
        imageX, imageY,
        imageX + imageSize, imageY + imageSize
      );
      borderGradient.addColorStop(0, '#10b981');
      borderGradient.addColorStop(1, '#059669');

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
      placeholderGradient.addColorStop(0, '#d1fae5');
      placeholderGradient.addColorStop(1, '#a7f3d0');

      ctx.fillStyle = placeholderGradient;
      ctx.beginPath();
      ctx.arc(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2, 0, Math.PI * 2);
      ctx.fill();

      // Emerald border
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = Math.max(5, width * 0.006);
      ctx.beginPath();
      ctx.arc(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2, 0, Math.PI * 2);
      ctx.stroke();

      // Draw user icon in placeholder
      ctx.fillStyle = '#10b981';
      ctx.font = `${imageSize * 0.4}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👤', imageX + imageSize / 2, imageY + imageSize / 2);
    }

    // Doctor name and credentials (right side, elegant typography)
    const textX = imageX + imageSize + (width * 0.05);
    const headerTextY = headerY + headerHeight * 0.38;
    const maxTextWidth = headerWidth - (textX - padding) - (width * 0.04);

    // Doctor name - Bold, dark gray with text wrapping
    ctx.fillStyle = '#1f2937';
    const nameFontSize = height * 0.045;
    ctx.font = `bold ${nameFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const nameText = doctorName.toUpperCase();
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

    // Credentials - Elegant, emerald color
    const credentialY = nameLine2 ? headerTextY + (height * 0.11) : headerTextY + (height * 0.058);
    ctx.fillStyle = '#059669';
    ctx.font = `600 ${height * 0.026}px system-ui, -apple-system, sans-serif`;
    const credentialsText = degree && speciality ? `${degree.toUpperCase()} • ${speciality.toUpperCase()}` : (degree || speciality).toUpperCase();

    // Wrap credentials if too long
    const credMetrics = ctx.measureText(credentialsText);
    if (credMetrics.width > maxTextWidth) {
      // Truncate with ellipsis
      let truncated = credentialsText;
      while (ctx.measureText(truncated + '...').width > maxTextWidth && truncated.length > 0) {
        truncated = truncated.substring(0, truncated.length - 1);
      }
      ctx.fillText(truncated + '...', textX, credentialY);
    } else {
      ctx.fillText(credentialsText, textX, credentialY);
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
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = Math.max(3, width * 0.003);
    ctx.beginPath();
    ctx.moveTo(lineX, currentY);
    ctx.lineTo(lineX + lineWidth, currentY);
    ctx.stroke();

    // SCAN ME - bold, emerald color
    currentY += height * 0.055;
    ctx.fillStyle = '#059669';
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

    // Subtle emerald border around QR card
    ctx.strokeStyle = '#d1fae5';
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
    ctx.strokeStyle = '#d1fae5';
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

    // HealQR branding - emerald color
    ctx.fillStyle = '#10b981';
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
        link.download = `${doctorName.replace(/\s+/g, '-')}-${size.name.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }, 500);
    };
    qrImg.src = qrCodeDataUrl;
  };

  const colorPresets = [
    { name: 'Black', value: '#000000' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Red', value: '#ef4444' },
  ];

  const [currentTab, setCurrentTab] = useState(initialTab);

  useEffect(() => {
    setCurrentTab(initialTab);
  }, [initialTab]);

  return (
    <div className="min-h-screen bg-black text-white flex">
      <DashboardSidebar
        activeMenu="qr"
        onMenuChange={onMenuChange || (() => {})}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeAddOns={activeAddOns}
      />

      <div className="flex-1 lg:ml-64">
        <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-white hover:text-emerald-500 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1>QR Manager</h1>
        </div>

        <div className="p-6">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <div className="max-w-7xl mx-auto mb-6">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-zinc-900 border border-zinc-800">
                <TabsTrigger
                  value="qr-generator"
                  className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-gray-400"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  QR Generator
                </TabsTrigger>
                <TabsTrigger
                  value="social-media"
                  className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-gray-400"
                >
                  <Palette className="w-4 h-4 mr-2" />
                  Social Media Kit
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="qr-generator" className="mt-0">
              <div className="max-w-7xl mx-auto">
            {/* Assigned QR Code Notice */}
            {assignedQrCode && (
              <div className="mb-6 bg-emerald-500/10 border border-emerald-500 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">Your Activation QR Code</h3>
                    <p className="text-3xl font-mono font-bold text-emerald-400 mb-2">{assignedQrCode}</p>
                    <p className="text-gray-300 text-sm mb-2">
                      This code is permanently linked to your account. Physical standees with this QR have been provided by your MR representative.
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
                  <h2 className="text-emerald-400 mb-6">Live Preview</h2>

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
                      className="w-full bg-emerald-500 hover:bg-emerald-600 h-12 flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download QR Only
                    </Button>
                  </div>
                </div>

                {/* Preset Sizes */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h3 className="text-emerald-400 mb-6 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Download Professional Template
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    {downloadSizes.map((size) => (
                      <Button
                        key={size.name}
                        onClick={() => handleDownloadWithSize(size)}
                        variant="outline"
                        className="h-auto py-3 px-4 flex flex-col items-start border-zinc-700 hover:border-emerald-500 hover:bg-emerald-500/10"
                      >
                        <span className="text-emerald-400">{size.name}</span>
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
                  <div className="bg-black border border-emerald-500/30 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-emerald-400 break-all flex-1">{qrUrl}</p>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(qrUrl);
                            toast.success('URL copied to clipboard!');
                          }}
                          className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 flex-shrink-0"
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
                          className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 flex-shrink-0"
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
                  <h3 className="text-emerald-400 mb-6 flex items-center gap-2">
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
                        className="w-full [&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:border-emerald-500"
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
                                ? 'border-emerald-500 scale-110'
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
                        placeholder="https://healqr.com/dr/..."
                        className="bg-black border-zinc-800 text-white h-12 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
                  <h3 className="text-emerald-400 mb-3">Professional Design</h3>
                  <ul className="text-gray-300 text-sm space-y-2">
                    <li>• Green header with doctor photo & name</li>
                    <li>• Large centered QR code</li>
                    <li>• Green footer with HealQR branding</li>
                    <li>• 100% match to reference image</li>
                    <li>• Perfect for patient presentation</li>
                  </ul>
                </div>

                {/* Test Booking Flow Section */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-emerald-400">Preview Booking Flow</h3>
                  </div>

                  <p className="text-gray-300 text-sm mb-4">
                    Test the patient booking experience that starts when your QR code is scanned
                  </p>

                  <Button
                    onClick={onTestBooking}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-5 h-5" />
                    TEST BOOKING FLOW
                  </Button>

                  <p className="text-emerald-400 text-xs mt-3 text-center">
                    ✓ Preview how patients will book appointments
                  </p>
                </div>
              </div>
            </div>
            </div>
          </TabsContent>

          <TabsContent value="social-media" className="mt-0">
            <SocialMediaKit
              doctorName={doctorName}
              degree={degree}
              speciality={speciality}
              qrUrl={qrUrl}
              profileImage={doctorImage}
            />
          </TabsContent>

        </Tabs>
      </div>
    </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
