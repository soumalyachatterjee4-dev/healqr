import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Download,
  Palette,
  FlaskConical,
  Image as ImageIcon,
  Zap,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Slider } from './ui/slider';
import QRCode from 'qrcode';
import { toast } from 'sonner';

interface LabQRManagerProps {
  labData: {
    uid: string;
    name: string;
    qrNumber?: string;
    labSlug?: string;
    logoUrl?: string;
  } | null;
}

type DownloadSize = {
  name: string;
  width: number;
  height: number;
  description: string;
};

export default function LabQRManager({ labData }: LabQRManagerProps) {
  const [assignedQrCode, setAssignedQrCode] = useState<string>('');
  const labName = labData?.name || 'Lab Name';
  const labImage = labData?.logoUrl || null;

  // QR Customization
  const [qrSize, setQrSize] = useState(300);
  const [qrColor, setQrColor] = useState('#000000');
  const [qrBackgroundColor] = useState('#ffffff');
  const [qrUrl, setQrUrl] = useState('https://teamhealqr.web.app');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  // Slug registration state
  const [currentSlug, setCurrentSlug] = useState<string>('');
  const [slugInput, setSlugInput] = useState('');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'saving' | 'saved'>('idle');
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const slugCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Initialize from labData
  useEffect(() => {
    if (!labData) return;

    const labId = labData.uid;

    // Set QR URL — prefer slug, fallback to labId param
    if (labData.labSlug) {
      setQrUrl(`https://healqr.com/lab/${labData.labSlug}`);
      setCurrentSlug(labData.labSlug);
      setSlugInput(labData.labSlug);
    } else {
      setQrUrl(`https://teamhealqr.web.app?labId=${labId}`);
    }

    if (labData.qrNumber) {
      setAssignedQrCode(labData.qrNumber);
    }
  }, [labData]);

  // Slug validation
  const isValidSlug = (slug: string): boolean => {
    return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug) && !slug.includes('--');
  };

  const generateSlugFromName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
  };

  // Check slug availability across all entity types
  const checkSlugAvailability = (slug: string) => {
    if (slugCheckTimeout.current) clearTimeout(slugCheckTimeout.current);

    if (!slug || slug === currentSlug) {
      setSlugStatus('idle');
      return;
    }

    if (!isValidSlug(slug)) {
      setSlugStatus('invalid');
      return;
    }

    setSlugStatus('checking');
    slugCheckTimeout.current = setTimeout(async () => {
      try {
        const { db } = await import('../lib/firebase/config');
        if (!db) return;
        const { collection, query, where, getDocs } = await import('firebase/firestore');

        // Check labs
        const labQ = query(collection(db, 'labs'), where('labSlug', '==', slug));
        const labSnap = await getDocs(labQ);
        if (!labSnap.empty) { setSlugStatus('taken'); return; }

        // Check doctors
        const doctorQ = query(collection(db, 'doctors'), where('profileSlug', '==', slug));
        const doctorSnap = await getDocs(doctorQ);
        if (!doctorSnap.empty) { setSlugStatus('taken'); return; }

        // Check clinics
        const clinicQ = query(collection(db, 'clinics'), where('profileSlug', '==', slug));
        const clinicSnap = await getDocs(clinicQ);
        setSlugStatus(clinicSnap.empty ? 'available' : 'taken');
      } catch {
        setSlugStatus('idle');
      }
    }, 500);
  };

  // Save slug to Firestore
  const saveSlug = async () => {
    const slug = slugInput.trim().toLowerCase();
    if (!isValidSlug(slug) || slug === currentSlug) return;

    setSlugStatus('saving');
    try {
      const labId = labData?.uid;
      if (!labId) return;

      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { collection, query, where, getDocs, doc, updateDoc } = await import('firebase/firestore');

      // Double-check availability across all entity types
      const labQ = query(collection(db, 'labs'), where('labSlug', '==', slug));
      const labSnap = await getDocs(labQ);
      if (!labSnap.empty) {
        setSlugStatus('taken');
        toast.error('This URL was just claimed. Try another.');
        return;
      }
      const doctorQ = query(collection(db, 'doctors'), where('profileSlug', '==', slug));
      const doctorSnap = await getDocs(doctorQ);
      if (!doctorSnap.empty) {
        setSlugStatus('taken');
        toast.error('This URL is taken by a doctor. Try another.');
        return;
      }
      const clinicQ = query(collection(db, 'clinics'), where('profileSlug', '==', slug));
      const clinicSnap = await getDocs(clinicQ);
      if (!clinicSnap.empty) {
        setSlugStatus('taken');
        toast.error('This URL is taken by a clinic. Try another.');
        return;
      }

      await updateDoc(doc(db, 'labs', labId), {
        labSlug: slug,
        labSlugCreatedAt: new Date(),
      });

      setCurrentSlug(slug);
      setQrUrl(`https://healqr.com/lab/${slug}`);
      setSlugStatus('saved');
      setIsEditingSlug(false);
      toast.success('Your lab URL has been set!');
    } catch (error) {
      console.error('Error saving slug:', error);
      toast.error('Failed to save URL. Please try again.');
      setSlugStatus('idle');
    }
  };

  // Generate QR Code
  useEffect(() => {
    generateQRCode();
  }, [qrUrl, qrSize, qrColor, qrBackgroundColor]);

  const generateQRCode = async () => {
    try {
      // Render to off-screen canvas so we can overlay the HealQR logo (matches doctor QR)
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, qrUrl, {
        width: qrSize,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: qrColor, light: qrBackgroundColor },
      });

      const ctx = qrCanvas.getContext('2d');
      if (ctx) {
        try {
          const logo = new Image();
          logo.crossOrigin = 'anonymous';
          logo.src = '/icon-192.png';
          await new Promise<void>((resolve, reject) => {
            logo.onload = () => resolve();
            logo.onerror = () => reject();
          });

          const logoSize = qrSize * 0.22;
          const logoX = (qrSize - logoSize) / 2;
          const logoY = (qrSize - logoSize) / 2;

          // White circle background to keep QR scannable
          const circleRadius = logoSize / 2 + 4;
          ctx.fillStyle = qrBackgroundColor;
          ctx.beginPath();
          ctx.arc(qrSize / 2, qrSize / 2, circleRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        } catch {
          // Logo failed to load — QR is still valid without it
        }
      }

      setQrCodeDataUrl(qrCanvas.toDataURL('image/png'));
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleDownloadQR = () => {
    if (qrCodeDataUrl) {
      const link = document.createElement('a');
      link.download = `QR-${labName.replace(/\s+/g, '-')}.png`;
      link.href = qrCodeDataUrl;
      link.click();
    }
  };

  // Draw template — Purple theme for labs
  const drawTemplate = async (
    ctx: CanvasRenderingContext2D,
    qrImg: HTMLImageElement,
    width: number,
    height: number,
  ) => {
    // Load lab image
    let labImageElement: HTMLImageElement | null = null;
    if (labImage) {
      labImageElement = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = labImage;
      });
    }

    // Gradient background — Purple tones
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#faf5ff'); // Very light purple
    gradient.addColorStop(1, '#f3e8ff'); // Slightly darker light purple
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Corner accents
    const cornerSize = width * 0.08;
    const accentColor = '#a855f7'; // Purple-500

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cornerSize, 0);
    ctx.lineTo(0, cornerSize);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(width, height);
    ctx.lineTo(width - cornerSize, height);
    ctx.lineTo(width, height - cornerSize);
    ctx.closePath();
    ctx.fill();

    const padding = width * 0.06;

    // HEADER — White card
    const headerHeight = height * 0.24;
    const headerY = padding;
    const headerWidth = width - (padding * 2);
    const cardRadius = width * 0.02;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(padding, headerY, headerWidth, headerHeight, cardRadius);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Lab circular image
    const imageSize = headerHeight * 0.72;
    const imageX = padding + (width * 0.06);
    const imageY = headerY + (headerHeight - imageSize) / 2;

    if (labImageElement) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(labImageElement, imageX, imageY, imageSize, imageSize);
      ctx.restore();

      const borderGradient = ctx.createLinearGradient(imageX, imageY, imageX + imageSize, imageY + imageSize);
      borderGradient.addColorStop(0, '#a855f7');
      borderGradient.addColorStop(1, '#7c3aed');

      ctx.strokeStyle = borderGradient;
      ctx.lineWidth = Math.max(5, width * 0.006);
      ctx.beginPath();
      ctx.arc(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const placeholderGradient = ctx.createRadialGradient(
        imageX + imageSize / 2, imageY + imageSize / 2, 0,
        imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2,
      );
      placeholderGradient.addColorStop(0, '#f3e8ff');
      placeholderGradient.addColorStop(1, '#e9d5ff');

      ctx.fillStyle = placeholderGradient;
      ctx.beginPath();
      ctx.arc(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = Math.max(5, width * 0.006);
      ctx.beginPath();
      ctx.arc(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#a855f7';
      ctx.font = `${imageSize * 0.4}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔬', imageX + imageSize / 2, imageY + imageSize / 2);
    }

    // Lab name
    const textX = imageX + imageSize + (width * 0.05);
    const headerTextY = headerY + headerHeight * 0.45;
    const maxTextWidth = headerWidth - (textX - padding) - (width * 0.04);

    ctx.fillStyle = '#1f2937';
    const nameFontSize = height * 0.045;
    ctx.font = `bold ${nameFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const nameText = labName.toUpperCase();
    let nameLine1 = nameText;
    let nameLine2 = '';

    const nameMetrics = ctx.measureText(nameText);
    if (nameMetrics.width > maxTextWidth) {
      const words = nameText.split(' ');
      nameLine1 = '';
      nameLine2 = '';
      let currentLine = 1;

      for (const word of words) {
        const testLine = currentLine === 1
          ? (nameLine1 ? nameLine1 + ' ' + word : word)
          : (nameLine2 ? nameLine2 + ' ' + word : word);
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

    // CTA — "BOOK YOUR TEST"
    let currentY = headerY + headerHeight + (height * 0.08);

    ctx.fillStyle = '#1f2937';
    ctx.font = `600 ${height * 0.032}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BOOK YOUR TEST', width / 2, currentY);

    // Decorative line
    currentY += height * 0.05;
    const lineWidth = width * 0.15;
    const lineX = (width - lineWidth) / 2;
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = Math.max(3, width * 0.003);
    ctx.beginPath();
    ctx.moveTo(lineX, currentY);
    ctx.lineTo(lineX + lineWidth, currentY);
    ctx.stroke();

    // SCAN ME
    currentY += height * 0.055;
    ctx.fillStyle = '#7c3aed';
    ctx.font = `bold ${height * 0.068}px system-ui, -apple-system, sans-serif`;
    ctx.fillText('SCAN ME', width / 2, currentY);

    // QR card
    currentY += height * 0.05;
    const footerHeight = height * 0.08;
    const availableHeight = height - currentY - footerHeight - (padding * 2);
    const qrBoxSize = Math.min(width * 0.52, availableHeight);
    const qrX = (width - qrBoxSize) / 2;
    const qrY = currentY;
    const qrCardRadius = width * 0.025;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(qrX, qrY, qrBoxSize, qrBoxSize, qrCardRadius);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = '#f3e8ff';
    ctx.lineWidth = Math.max(2, width * 0.003);
    ctx.beginPath();
    ctx.roundRect(qrX, qrY, qrBoxSize, qrBoxSize, qrCardRadius);
    ctx.stroke();

    const qrPadding = qrBoxSize * 0.12;
    const qrDrawSize = qrBoxSize - (qrPadding * 2);
    ctx.drawImage(qrImg, qrX + qrPadding, qrY + qrPadding, qrDrawSize, qrDrawSize);

    // Footer
    const footerY = height - padding - footerHeight;

    ctx.strokeStyle = '#f3e8ff';
    ctx.lineWidth = Math.max(2, width * 0.002);
    ctx.beginPath();
    ctx.moveTo(padding + width * 0.2, footerY + footerHeight * 0.25);
    ctx.lineTo(width - padding - width * 0.2, footerY + footerHeight * 0.25);
    ctx.stroke();

    ctx.fillStyle = '#6b7280';
    ctx.font = `500 ${height * 0.024}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Powered by', width / 2, footerY + footerHeight * 0.55);

    ctx.fillStyle = '#a855f7';
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
        link.download = `${labName.replace(/\s+/g, '-')}-${size.name.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }, 500);
    };
    qrImg.src = qrCodeDataUrl;
  };

  const colorPresets = [
    { name: 'Black', value: '#000000' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Red', value: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Assigned QR Code Notice */}
      {assignedQrCode && (
        <div className="bg-purple-500/10 border border-purple-500 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white mb-2">Your Activation QR Code</h3>
              <p className="text-3xl font-mono font-bold text-purple-400 mb-2">{assignedQrCode}</p>
              <p className="text-gray-300 text-sm mb-2">
                This code is permanently linked to your lab account. Physical standees with this QR have been provided by your MR representative.
              </p>
              <p className="text-gray-400 text-xs">
                Your QR is pre-printed on standees at your lab. Patients can scan these to book tests instantly.
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
            <h2 className="text-purple-400 mb-6 flex items-center gap-2">
              <FlaskConical className="w-5 h-5" />
              Live Preview
            </h2>

            <div className="bg-white rounded-lg p-8 flex items-center justify-center min-h-[400px]">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="QR Code" className="max-w-full h-auto" />
              ) : (
                <p className="text-gray-500">Generating QR code...</p>
              )}
            </div>

            <div className="mt-6">
              <Button
                onClick={handleDownloadQR}
                className="w-full bg-purple-500 hover:bg-purple-600 h-12 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download QR Only
              </Button>
            </div>
          </div>

          {/* Preset Sizes */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-purple-400 mb-6 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Download Professional Template
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {downloadSizes.map((size) => (
                <Button
                  key={size.name}
                  onClick={() => handleDownloadWithSize(size)}
                  variant="outline"
                  className="h-auto py-3 px-4 flex flex-col items-start border-zinc-700 hover:border-purple-500 hover:bg-purple-500/10"
                >
                  <span className="text-purple-400">{size.name}</span>
                  <span className="text-xs text-gray-400">{size.description}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Phone Booking Code (the HQR number IS the IVR code) */}
          {labData?.qrNumber && (
            <div className="bg-zinc-900 border border-emerald-500/30 rounded-xl p-6">
              <Label className="mb-2 block text-gray-400 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                Phone Booking Code (for non-smartphone users)
              </Label>
              <div className="bg-black border border-emerald-500/30 rounded-lg p-4">
                <p className="text-emerald-400 font-mono text-2xl font-bold tracking-widest">
                  {labData.qrNumber}
                </p>
              </div>
              <p className="text-gray-500 text-xs mt-2">
                Patients without a smartphone can call HealQR&apos;s IVR line and enter the digits of this code (e.g. {labData.qrNumber.replace(/\D/g, '')}) to book.
              </p>
            </div>
          )}

          {/* Your Personal URL */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <Label className="mb-4 block text-gray-400">Your Personal URL</Label>
            <div className="bg-black border border-purple-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-purple-400 break-all flex-1">{qrUrl}</p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(qrUrl);
                      toast.success('URL copied to clipboard!');
                    }}
                    className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 flex-shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(qrUrl, '_blank')}
                    className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 flex-shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" x2="21" y1="14" y2="3" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Claim Your Custom URL */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-purple-400 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              {currentSlug ? 'Your Custom URL' : 'Claim Your Custom URL'}
            </h3>

            {!isEditingSlug && currentSlug ? (
              <div>
                <div className="bg-black border border-purple-500/30 rounded-lg p-4 mb-3">
                  <p className="text-purple-400 text-sm">healqr.com/lab/<span className="font-bold">{currentSlug}</span></p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setIsEditingSlug(true); setSlugStatus('idle'); }}
                  className="text-gray-400 border-zinc-700 hover:bg-zinc-800"
                >
                  Change URL
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-gray-400 text-sm mb-3">
                  Get a clean, shareable URL for your lab.
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-500 text-sm whitespace-nowrap">healqr.com/lab/</span>
                  <Input
                    value={slugInput}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                      setSlugInput(val);
                      checkSlugAvailability(val);
                    }}
                    placeholder={generateSlugFromName(labName)}
                    className="bg-black border-zinc-700 text-white h-9 text-sm"
                    maxLength={50}
                  />
                </div>
                {slugStatus === 'checking' && (
                  <p className="text-yellow-400 text-xs mt-1">Checking availability...</p>
                )}
                {slugStatus === 'available' && (
                  <p className="text-purple-400 text-xs mt-1">✓ Available!</p>
                )}
                {slugStatus === 'taken' && (
                  <p className="text-red-400 text-xs mt-1">✗ Already taken. Try another.</p>
                )}
                {slugStatus === 'invalid' && (
                  <p className="text-red-400 text-xs mt-1">Use only lowercase letters, numbers, and hyphens (3-50 chars).</p>
                )}
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={saveSlug}
                    disabled={slugStatus !== 'available'}
                    className="bg-purple-500 hover:bg-purple-600 disabled:opacity-40 h-9 text-sm"
                  >
                    {slugStatus === 'saving' ? 'Saving...' : 'Claim URL'}
                  </Button>
                  {currentSlug && (
                    <Button
                      variant="ghost"
                      onClick={() => { setIsEditingSlug(false); setSlugInput(currentSlug); setSlugStatus('idle'); }}
                      className="text-gray-400 h-9 text-sm"
                    >
                      Cancel
                    </Button>
                  )}
                  {!currentSlug && !slugInput && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const suggested = generateSlugFromName(labName);
                        setSlugInput(suggested);
                        checkSlugAvailability(suggested);
                      }}
                      className="text-purple-400 h-9 text-sm"
                    >
                      Suggest for me
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* QR Customization */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-purple-400 mb-6 flex items-center gap-2">
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
                  className="w-full [&_[data-slot=slider-range]]:bg-purple-500 [&_[data-slot=slider-thumb]]:border-purple-500"
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
                          ? 'border-purple-500 scale-110'
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
                  placeholder="https://healqr.com/lab/..."
                  className="bg-black border-zinc-800 text-white h-12 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
            <h3 className="text-purple-400 mb-3">Professional Design</h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• Purple header with lab logo & name</li>
              <li>• Large centered QR code</li>
              <li>• Purple footer with HealQR branding</li>
              <li>• 100% match to reference design</li>
              <li>• Perfect for patient presentation</li>
            </ul>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
