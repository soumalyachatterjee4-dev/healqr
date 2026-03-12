import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import {
  Download,
  Share2,
  Image as ImageIcon,
  Type,
  Palette,
  Layout,
  Upload,
  RefreshCw,
  Menu
} from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import ClinicSidebar from './ClinicSidebar';

interface ClinicSocialMediaKitProps {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  qrUrl: string;
  clinicLogo: string | null;
  onLogout?: () => void;
  onMenuChange?: (menu: string) => void;
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
  activeAddOns?: string[];
}

type TemplateType = 'story' | 'post' | 'status' | 'health-tip' | 'reel-animated';

interface Template {
  id: string;
  name: string;
  type: TemplateType;
  width: number;
  height: number;
  label: string;
}

export default function ClinicSocialMediaKit({
  clinicName,
  clinicAddress,
  clinicPhone,
  qrUrl,
  clinicLogo,
  onLogout,
  onMenuChange,
  isSidebarCollapsed = false,
  setIsSidebarCollapsed,
  activeAddOns = []
}: ClinicSocialMediaKitProps) {
  const [activeTab, setActiveTab] = useState<TemplateType>('story');
  const [customText, setCustomText] = useState('Book your appointment online!');
  const [accentColor, setAccentColor] = useState('#3b82f6'); // Blue default for clinics
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [offerType, setOfferType] = useState<'regular' | 'discount' | 'camp'>('regular');
  const [discountValue, setDiscountValue] = useState('20%');
  const [expiryDate, setExpiryDate] = useState('');
  const [campDetails, setCampDetails] = useState('Location: Clinic Premises | Date: Coming Sunday');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const templates: Template[] = [
    { id: 'story', name: 'Instagram Story', type: 'story', width: 1080, height: 1920, label: 'Story (9:16)' },
    { id: 'post', name: 'Social Post', type: 'post', width: 1080, height: 1080, label: 'Square Post (1:1)' },
    { id: 'status', name: 'WhatsApp Status', type: 'status', width: 1080, height: 1920, label: 'Status (9:16)' },
    { id: 'health-tip', name: 'Health Tip', type: 'health-tip', width: 1080, height: 1350, label: 'Portrait (4:5)' },
    { id: 'reel-animated', name: 'Video Reel', type: 'reel-animated', width: 1080, height: 1920, label: 'Video (9:16)' },
  ];

  const currentTemplate = templates.find(t => t.type === activeTab) || templates[0];

  // Re-generate preview when dependencies change
  useEffect(() => {
    if (activeTab === 'reel-animated') {
      startTimeRef.current = Date.now();
      const runAnimation = () => {
        generatePreview();
        animationFrameRef.current = requestAnimationFrame(runAnimation);
      };
      runAnimation();
      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
    } else {
      generatePreview();
    }
  }, [activeTab, customText, accentColor, uploadedImage, clinicName, qrUrl, offerType, discountValue, expiryDate, campDetails]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePreview = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = currentTemplate.width;
    canvas.height = currentTemplate.height;
    const { width, height } = currentTemplate;

    // 1. Draw Background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#f3f4f6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const elapsed = (Date.now() - startTimeRef.current) / 1000;

    // 2. Draw Uploaded Image or Placeholder Pattern
    if (uploadedImage) {
      try {
        const img = await loadImage(uploadedImage);
        // Cover fit
        const scale = Math.max(width / img.width, height / img.height);

        // Subtle background zoom for animated reels
        const animScale = activeTab === 'reel-animated' ? 1 + (Math.sin(elapsed * 0.2) * 0.05) : 1;
        const currentScale = scale * animScale;

        const x = (width / 2) - (img.width / 2) * currentScale;
        const y = (height / 2) - (img.height / 2) * currentScale;
        ctx.drawImage(img, x, y, img.width * currentScale, img.height * currentScale);

        // Add overlay for text readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, width, height);
      } catch (e) {
        console.error('Error loading custom image');
      }
    } else {
      // Draw decorative pattern if no image
      ctx.fillStyle = `${accentColor}10`; // Very transparent
      const offset = activeTab === 'reel-animated' ? elapsed * 20 : 0;
      for (let i = 0; i < width + 40; i += 40) {
        for (let j = 0; j < height + 40; j += 40) {
          if ((i + j) % 80 === 0) {
            ctx.beginPath();
            ctx.arc(i, (j + offset) % height, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // 3. Draw Header (Clinic Info)
    const padding = width * 0.08;
    const headerY = padding + 40;

    // Glassmorphism card for header
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    const headerHeight = height * 0.15;

    // Draw rounded rect for header
    roundRect(ctx, padding, headerY, width - (padding * 2), headerHeight, 20);
    ctx.fill();
    ctx.restore();

    // Clinic Image in Header
    const avatarSize = headerHeight * 0.7;
    const avatarX = padding + (headerHeight - avatarSize) / 2;
    const avatarY = headerY + (headerHeight - avatarSize) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
    ctx.clip();

    if (clinicLogo) {
      try {
        const img = await loadImage(clinicLogo);
        ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
      } catch (e) {
        drawAvatarPlaceholder(ctx, avatarX, avatarY, avatarSize, accentColor);
      }
    } else {
      drawAvatarPlaceholder(ctx, avatarX, avatarY, avatarSize, accentColor);
    }
    ctx.restore();

    // Clinic Name & Info
    ctx.fillStyle = '#111827';
    ctx.font = `bold ${width * 0.045}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const textX = avatarX + avatarSize + 20;
    const textY = avatarY + 10;

    ctx.fillText(clinicName, textX, textY);

    ctx.fillStyle = accentColor;
    ctx.font = `600 ${width * 0.03}px sans-serif`;
    ctx.fillText((clinicAddress || clinicPhone || 'HealQR Partner').substring(0, 35), textX, textY + (width * 0.06));

    // 4. Draw Offer Specific Content
    if (offerType === 'discount') {
        const badgeY = headerY + headerHeight + 70;
        ctx.fillStyle = accentColor;
        const badgeWidth = width * 0.45;
        roundRect(ctx, padding, badgeY, badgeWidth, 70, 15);
        ctx.fill();

        ctx.font = `bold ${width * 0.04}px sans-serif`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SPECIAL OFFER', padding + (badgeWidth / 2), badgeY + 35);

        // Discount Circle - Professional styling
        const circleSize = width * 0.28;
        const circleX = width - padding - (circleSize / 2);
        const circleY = badgeY + 130;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 15;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleSize / 2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = accentColor;
        ctx.font = `bold ${width * 0.08}px sans-serif`;
        ctx.fillText(discountValue, circleX, circleY - 10);
        ctx.font = `bold ${width * 0.035}px sans-serif`;
        ctx.fillText('OFF', circleX, circleY + 35);

        if (expiryDate) {
            ctx.fillStyle = uploadedImage ? '#ffffff' : '#4b5563';
            ctx.font = `600 ${width * 0.035}px sans-serif`;
            ctx.textAlign = 'left';
            ctx.fillText(`Valid till: ${expiryDate}`, padding, badgeY + 120);
        }
    } else if (offerType === 'camp') {
        const campY = headerY + headerHeight + 60;
        const campHeight = 180;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        roundRect(ctx, padding, campY, width - (padding * 2), campHeight, 20);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        roundRect(ctx, padding, campY, width - (padding * 2), campHeight, 20);
        ctx.stroke();

        ctx.font = `bold ${width * 0.065}px sans-serif`;
        ctx.fillStyle = accentColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FREE HEALTH CAMP', width / 2, campY + (campHeight * 0.38));

        ctx.font = `600 ${width * 0.035}px sans-serif`;
        ctx.fillStyle = '#334155';
        ctx.fillText(campDetails, width / 2, campY + (campHeight * 0.72));
    } else if (activeTab === 'health-tip') {
        const cardWidth = width - (padding * 2);
        const cardHeight = height * 0.5;
        const cardY = headerY + headerHeight + 50;

        // Medical Card Background
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 15;
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, padding, cardY, cardWidth, cardHeight, 30);
        ctx.fill();
        ctx.restore();

        // Tip Header
        ctx.fillStyle = accentColor;
        ctx.font = `600 ${width * 0.03}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText('HEALTH ADVICE', padding + 40, cardY + 60);

        ctx.fillStyle = '#111827';
        ctx.font = `bold ${width * 0.055}px sans-serif`;
        ctx.fillText('Clinic Tip', padding + 40, cardY + 105);

        // Divider line
        ctx.strokeStyle = `${accentColor}40`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding + 40, cardY + 135);
        ctx.lineTo(padding + 120, cardY + 135);
        ctx.stroke();

        // Tip Content
        ctx.fillStyle = '#374151';
        ctx.font = `500 ${width * 0.045}px sans-serif`;

        const words = customText.split(' ');
        let line = '';
        let y = cardY + 190;
        const lineHeight = width * 0.065;
        const maxWidth = cardWidth - 80;

        for(let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, padding + 40, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, padding + 40, y);

        // Disclaimer
        ctx.fillStyle = '#9ca3af';
        ctx.font = `400 ${width * 0.025}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('Consult for professional advice.', width/2, cardY + cardHeight - 30);
    }

    // 5. Draw Main Custom Text - SKIP FOR HEALTH TIPS (already in card)
    if (activeTab !== 'health-tip') {
      let contentY = headerY + headerHeight + (height * 0.1);

      if (offerType === 'discount') {
          contentY = headerY + headerHeight + (height * 0.25);
      } else if (offerType === 'camp') {
          contentY = headerY + headerHeight + (height * 0.22);
          // Ensure enough space below the camp box for main message
          if (height < 1200) contentY = headerY + headerHeight + 350;
      }

      // Animation: Slide and Fade for Video Reels
      let alpha = 1;
      let xOffset = 0;
      if (activeTab === 'reel-animated') {
          alpha = Math.min(1, elapsed * 1.5);
          xOffset = Math.max(0, 50 - elapsed * 100);
      }

      ctx.fillStyle = uploadedImage ? `rgba(255, 255, 255, ${alpha})` : `rgba(31, 41, 55, ${alpha})`;
      ctx.font = `bold ${width * 0.06}px sans-serif`;
      ctx.textAlign = 'center';

      // Text wrapping
      const maxWidth = width - (padding * 2);
      const words = customText.split(' ');
      let line = '';
      let y = contentY;
      const lineHeight = width * 0.08;

      if (uploadedImage) {
          // Add text shadow for readability over image
          ctx.shadowColor = `rgba(0,0,0,${0.8 * alpha})`;
          ctx.shadowBlur = 10;
      }

      for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, (width/2) + xOffset, y);
          line = words[n] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, (width/2) + xOffset, y);
      ctx.shadowBlur = 0; // Reset shadow
    }

    // 5. Draw QR Code Section (Bottom Card)
    const footerHeight = height * 0.35;
    const footerY = height - footerHeight - padding;

    // Footer Card Background
    ctx.fillStyle = '#ffffff';
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = -5;
    roundRect(ctx, padding, footerY, width - (padding * 2), footerHeight, 20);
    ctx.fill();
    ctx.restore();

    // QR Code Generation & Drawing
    try {
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
            margin: 1,
            color: { dark: accentColor, light: '#ffffff' }
        });
        const qrImg = await loadImage(qrDataUrl);
        const qrSize = footerHeight * 0.65;

        // Pulse animation for QR
        const qrAnim = activeTab === 'reel-animated' ? 1 + (Math.sin(elapsed * 2) * 0.03) : 1;
        const currentQrSize = qrSize * qrAnim;

        const qrX = (width - currentQrSize) / 2;
        const qrY = footerY + (footerHeight - currentQrSize) / 2 - 20;

        ctx.drawImage(qrImg, qrX, qrY, currentQrSize, currentQrSize);

        // "Scan to Book" Text
        ctx.fillStyle = '#374151';
        ctx.font = `600 ${width * 0.035}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('Scan to Book Appointment', width/2, qrY + qrSize + 40);

        // HealQR Branding
        ctx.fillStyle = '#9ca3af';
        ctx.font = `${width * 0.025}px sans-serif`;
        ctx.fillText('Powered by HealQR.com', width/2, height - (padding/2));

    } catch (e) {
        console.error('QR Generation failed', e);
    }

    // Set preview URL for display
    setPreviewUrl(canvas.toDataURL('image/png'));
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const drawAvatarPlaceholder = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
    ctx.fillStyle = `${color}20`;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = color;
    ctx.font = `${size * 0.4}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Clinic', x + size/2, y + size/2);
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.download = `HealQR-Clinic-${activeTab}-${Date.now()}.png`;
    link.href = previewUrl;
    link.click();
    toast.success('Image downloaded!');
  };

  const handleShare = async () => {
    if (!previewUrl) return;

    try {
        const res = await fetch(previewUrl);
        const blob = await res.blob();
        const file = new File([blob], 'share.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: 'Book Appointment',
                text: customText,
                files: [file]
            });
            toast.success('Shared successfully!');
        } else {
            toast.error('Sharing not supported on this device/browser');
            handleDownload(); // Fallback
        }
    } catch (e) {
        console.error('Share failed:', e);
        toast.error('Could not share. Downloading instead.');
        handleDownload();
    }
  };

  const captureVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;

    setIsRecording(true);
    setRecordingProgress(0);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 5000000 // 5Mbps
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `HealQR-Clinic-Reel-${Date.now()}.webm`;
        link.click();
        setIsRecording(false);
        setRecordingProgress(0);
        toast.success('Video Reel exported!');
    };

    mediaRecorder.start();

    let progress = 0;
    const interval = setInterval(() => {
        progress += 2;
        setRecordingProgress(progress);
        if (progress >= 100) {
            clearInterval(interval);
            mediaRecorder.stop();
        }
    }, 100);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      <ClinicSidebar
        activeMenu="social-kit"
        onMenuChange={onMenuChange || (() => {})}
        onLogout={onLogout || (() => {})}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeAddOns={activeAddOns}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed?.(!isSidebarCollapsed)}
      />

      <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} overflow-x-hidden min-w-0`}>
        <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4 sticky top-0 bg-black z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-blue-500 hover:bg-zinc-900 p-2 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Social Kit & Offers</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto p-3 sm:p-6">
      {/* Settings Panel */}
      <div className="w-full lg:w-1/3 space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-500" />
            Customize Design
          </h2>

          <div className="space-y-6">
            {/* Format Selection */}
            <div className="space-y-3">
              <Label className="text-gray-400">Select Format</Label>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TemplateType)} className="w-full">
                <div className="overflow-x-auto">
                  <TabsList className="flex min-w-max bg-black border border-zinc-800 gap-1 p-1">
                    <TabsTrigger value="story" className="text-zinc-400 shrink-0 text-xs px-3">Story</TabsTrigger>
                    <TabsTrigger value="post" className="text-zinc-400 shrink-0 text-xs px-3">Post</TabsTrigger>
                    <TabsTrigger value="status" className="text-zinc-400 shrink-0 text-xs px-3">Status</TabsTrigger>
                    <TabsTrigger value="health-tip" className="text-zinc-400 shrink-0 text-xs px-3">Tip 💡</TabsTrigger>
                    <TabsTrigger value="reel-animated" className="text-blue-400 shrink-0 text-xs px-3">Reel 🎬</TabsTrigger>
                  </TabsList>
                </div>
              </Tabs>
            </div>

            {/* Campaign Type - Hidden for Tips */}
            {activeTab !== 'health-tip' && (
              <div className="space-y-3">
                <Label className="text-gray-400 flex items-center gap-2">
                  <Layout className="w-4 h-4" /> Campaign Type
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['regular', 'discount', 'camp'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setOfferType(type)}
                      className={`px-1 py-2 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase transition-all border truncate ${
                        offerType === type
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'bg-black border-zinc-800 text-gray-500 hover:border-zinc-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {offerType === 'discount' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] text-gray-500 uppercase">Discount</Label>
                  <Input
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="e.g. 20%"
                    className="bg-black border-zinc-800 text-white text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] text-gray-500 uppercase">Valid Till</Label>
                  <Input
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    placeholder="e.g. 28 Feb"
                    className="bg-black border-zinc-800 text-white text-sm"
                  />
                </div>
              </div>
            )}

            {offerType === 'camp' && (
              <div className="space-y-3">
                <Label className="text-gray-400 flex items-center gap-2">
                  <Layout className="w-4 h-4" /> Camp Details
                </Label>
                <Input
                  value={campDetails}
                  onChange={(e) => setCampDetails(e.target.value)}
                  placeholder="Venue and Date..."
                  className="bg-black border-zinc-800 text-white text-sm"
                />
              </div>
            )}

            {/* Custom Text */}
            <div className="space-y-3">
              <Label className="text-gray-400 flex items-center gap-2">
                <Type className="w-4 h-4" /> Message
              </Label>
              {activeTab === 'health-tip' ? (
                <Textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Enter health tip..."
                  className="bg-black border-zinc-800 text-white min-h-[120px]"
                  maxLength={200}
                />
              ) : (
                <Input
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Enter your message..."
                  className="bg-black border-zinc-800 text-white"
                  maxLength={60}
                />
              )}
              <p className="text-xs text-gray-500 text-right">{customText.length}/{activeTab === 'health-tip' ? 200 : 60}</p>
            </div>

            {/* Background Image */}
            <div className="space-y-3">
              <Label className="text-gray-400 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Background Image
              </Label>
              <div className="grid gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-zinc-700 bg-black hover:bg-zinc-900 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadedImage ? 'Change Image' : 'Upload Photo'}
                </Button>
                {uploadedImage && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setUploadedImage(null)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    Remove Image
                  </Button>
                )}
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-3">
              <Label className="text-gray-400 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Theme Color
              </Label>
              <div className="flex gap-2">
                {['#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setAccentColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      accentColor === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <Input
                   type="color"
                   value={accentColor}
                   onChange={(e) => setAccentColor(e.target.value)}
                   className="w-8 h-8 p-0 border-0 rounded-full overflow-hidden cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
          {activeTab === 'reel-animated' ? (
              <Button
                onClick={captureVideo}
                disabled={isRecording}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 col-span-2 relative overflow-hidden"
              >
                {isRecording ? (
                    <>
                        <div className="absolute inset-0 bg-blue-500/20" style={{ width: `${recordingProgress}%` }} />
                        <span className="relative z-10 flex items-center gap-2">
                             <RefreshCw className="w-5 h-5 animate-spin" /> Recording ({recordingProgress}%)
                        </span>
                    </>
                ) : (
                    <span className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5" /> Export Video Reel
                    </span>
                )}
              </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
                <Button
                    onClick={handleShare}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white h-12"
                >
                    <Share2 className="w-5 h-5 mr-2" />
                    Share
                </Button>
                <Button
                    onClick={handleDownload}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-12"
                >
                    <Download className="w-5 h-5 mr-2" />
                    Download
                </Button>
            </div>
          )}
      </div>

      {/* Preview Panel */}
      <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 sm:p-8 flex items-center justify-center min-h-[350px] sm:min-h-[600px] relative overflow-hidden">
        {/* Hidden Canvas for Generation */}
        <canvas ref={canvasRef} className="hidden" />

        <div className="relative shadow-2xl rounded-lg overflow-hidden transition-all duration-300"
             style={{
               width: activeTab === 'post' ? '400px' : '300px',
               aspectRatio: activeTab === 'post' ? '1/1' : '9/16'
             }}>
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-full h-full object-contain bg-white" />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500 animate-pulse">
              Generating...
            </div>
          )}
        </div>

        <div className="absolute bottom-4 right-4 text-xs text-gray-500">
          Preview Scale: 1080px (HD)
        </div>
      </div>
    </div>
    <footer className="py-12 text-center opacity-30 mt-auto">
      <p className="text-[10px] text-gray-500 uppercase tracking-[0.4em]">Integrated Care • HealQR</p>
    </footer>
    </div>
    </div>
  );
}
