import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Download,
  Share2,
  Image as ImageIcon,
  Type,
  Palette,
  Layout,
  Upload,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';

interface SocialMediaKitProps {
  doctorName: string;
  degree: string;
  speciality: string;
  qrUrl: string;
  profileImage: string | null;
}

type TemplateType = 'story' | 'post' | 'status';

interface Template {
  id: string;
  name: string;
  type: TemplateType;
  width: number;
  height: number;
  label: string;
}

export default function SocialMediaKit({ doctorName, degree, speciality, qrUrl, profileImage }: SocialMediaKitProps) {
  const [activeTab, setActiveTab] = useState<TemplateType>('story');
  const [customText, setCustomText] = useState('Book your appointment online!');
  const [accentColor, setAccentColor] = useState('#10b981'); // Emerald default
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const templates: Template[] = [
    { id: 'story', name: 'Instagram Story', type: 'story', width: 1080, height: 1920, label: 'Story (9:16)' },
    { id: 'post', name: 'Social Post', type: 'post', width: 1080, height: 1080, label: 'Square Post (1:1)' },
    { id: 'status', name: 'WhatsApp Status', type: 'status', width: 1080, height: 1920, label: 'Status (9:16)' },
  ];

  const currentTemplate = templates.find(t => t.type === activeTab) || templates[0];

  // Re-generate preview when dependencies change
  useEffect(() => {
    generatePreview();
  }, [activeTab, customText, accentColor, uploadedImage, doctorName, qrUrl]);

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
    setIsGenerating(true);
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

    // 2. Draw Uploaded Image or Placeholder Pattern
    if (uploadedImage) {
      try {
        const img = await loadImage(uploadedImage);
        // Cover fit
        const scale = Math.max(width / img.width, height / img.height);
        const x = (width / 2) - (img.width / 2) * scale;
        const y = (height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        // Add overlay for text readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, width, height);
      } catch (e) {
        console.error('Error loading custom image');
      }
    } else {
      // Draw decorative pattern if no image
      ctx.fillStyle = `${accentColor}10`; // Very transparent
      for (let i = 0; i < width; i += 40) {
        for (let j = 0; j < height; j += 40) {
          if ((i + j) % 80 === 0) {
            ctx.beginPath();
            ctx.arc(i, j, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // 3. Draw Header (Doctor Info)
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

    // Doctor Image in Header
    const avatarSize = headerHeight * 0.7;
    const avatarX = padding + (headerHeight - avatarSize) / 2;
    const avatarY = headerY + (headerHeight - avatarSize) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
    ctx.clip();

    if (profileImage) {
      try {
        const img = await loadImage(profileImage);
        ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
      } catch (e) {
        drawAvatarPlaceholder(ctx, avatarX, avatarY, avatarSize, accentColor);
      }
    } else {
      drawAvatarPlaceholder(ctx, avatarX, avatarY, avatarSize, accentColor);
    }
    ctx.restore();

    // Doctor Name & Creds
    ctx.fillStyle = '#111827';
    ctx.font = `bold ${width * 0.045}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const textX = avatarX + avatarSize + 20;
    const textY = avatarY + 10;

    ctx.fillText(doctorName, textX, textY);

    ctx.fillStyle = accentColor;
    ctx.font = `600 ${width * 0.03}px sans-serif`;
    ctx.fillText((degree + ' • ' + speciality).substring(0, 35), textX, textY + (width * 0.06));

    // 4. Draw Main Custom Text
    const contentY = headerY + headerHeight + (height * 0.1);
    ctx.fillStyle = uploadedImage ? '#ffffff' : '#1f2937';
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
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10;
    }

    for(let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, width/2, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, width/2, y);
    ctx.shadowBlur = 0; // Reset shadow

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
        const qrX = (width - qrSize) / 2;
        const qrY = footerY + (footerHeight - qrSize) / 2 - 20;

        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

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
    setIsGenerating(false);
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
    ctx.font = `${size * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DR', x + size/2, y + size/2);
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.download = `HealQR-${activeTab}-${Date.now()}.png`;
    link.href = previewUrl;
    link.click();
    toast.success('Image downloaded!');
  };

  const handleShare = async () => {
    if (!previewUrl) return;

    try {
        // Convert DataURL to Blob
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

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto p-6">
      {/* Settings Panel */}
      <div className="w-full lg:w-1/3 space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Palette className="w-5 h-5 text-emerald-500" />
            Customize Design
          </h2>

          <div className="space-y-6">
            {/* Format Selection */}
            <div className="space-y-3">
              <Label className="text-gray-400">Select Format</Label>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TemplateType)} className="w-full">
                <TabsList className="grid grid-cols-3 bg-black border border-zinc-800">
                  <TabsTrigger value="story">Story</TabsTrigger>
                  <TabsTrigger value="post">Post</TabsTrigger>
                  <TabsTrigger value="status">Status</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Custom Text */}
            <div className="space-y-3">
              <Label className="text-gray-400 flex items-center gap-2">
                <Type className="w-4 h-4" /> Message
              </Label>
              <Input
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Enter your message..."
                className="bg-black border-zinc-800 text-white"
                maxLength={60}
              />
              <p className="text-xs text-gray-500 text-right">{customText.length}/60</p>
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
                {['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'].map((color) => (
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
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={handleShare}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share Now
          </Button>
          <Button
            onClick={handleDownload}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12"
          >
            <Download className="w-5 h-5 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 flex items-center justify-center min-h-[600px] relative overflow-hidden">
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
  );
}
