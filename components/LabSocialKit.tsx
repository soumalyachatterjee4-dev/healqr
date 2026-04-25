import { useState, useEffect, useRef } from 'react';
import { Share2, Download, Copy, Image as ImageIcon, Tag, QrCode, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { db } from '../lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import QRCode from 'qrcode';
import { toast } from 'sonner';

interface LabSocialKitProps {
  labId: string;
  labName?: string;
}

type Template = 'offer' | 'qr-poster' | 'festival' | 'tip';

const PALETTES: Record<Template, { from: string; to: string; accent: string }> = {
  offer: { from: '#7c3aed', to: '#3b82f6', accent: '#fbbf24' },
  'qr-poster': { from: '#0f766e', to: '#10b981', accent: '#fde047' },
  festival: { from: '#f97316', to: '#dc2626', accent: '#fde047' },
  tip: { from: '#0ea5e9', to: '#1e40af', accent: '#fbbf24' },
};

export default function LabSocialKit({ labId, labName }: LabSocialKitProps) {
  const [template, setTemplate] = useState<Template>('offer');
  const [headline, setHeadline] = useState('₹999 Full Body Check-up');
  const [subline, setSubline] = useState('Includes 60+ tests · Free home collection');
  const [tagline, setTagline] = useState('Limited time offer');
  const [contact, setContact] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [profileSlug, setProfileSlug] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!labId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'labs', labId));
        if (snap.exists()) {
          const data: any = snap.data();
          setContact(prev => prev || data.phone || data.contactNumber || '');
          const slug = data.profileSlug || data.qrNumber || labId;
          setProfileSlug(slug);
          const url = `https://healqr.com/lab/${slug}`;
          const qr = await QRCode.toDataURL(url, { margin: 1, width: 380, color: { dark: '#000', light: '#fff' } });
          setQrUrl(qr);
        }
      } catch (err) {
        console.error('[LabSocialKit] load:', err);
      }
    })();
  }, [labId]);

  useEffect(() => {
    drawCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, headline, subline, tagline, contact, qrUrl, labName]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1080, H = 1080;
    canvas.width = W; canvas.height = H;
    const palette = PALETTES[template];

    // Background gradient
    const grd = ctx.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, palette.from);
    grd.addColorStop(1, palette.to);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Accent splash
    ctx.beginPath();
    ctx.arc(W * 0.85, H * 0.15, 200, 0, Math.PI * 2);
    ctx.fillStyle = palette.accent + '33';
    ctx.fill();

    // Lab name top
    ctx.font = 'bold 56px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText((labName || 'Your Lab').toUpperCase().slice(0, 26), 80, 130);

    // Tagline pill
    ctx.fillStyle = palette.accent;
    ctx.fillRect(80, 170, 360, 56);
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(tagline.toUpperCase(), 100, 207);

    // Headline (auto-wrap)
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 96px sans-serif';
    wrapText(ctx, headline, 80, 360, W - 160, 110);

    // Subline (auto-wrap)
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '40px sans-serif';
    wrapText(ctx, subline, 80, 640, W - 160, 56);

    // QR card bottom-right
    const qrSize = 280;
    const qrX = W - qrSize - 80;
    const qrY = H - qrSize - 120;
    if (qrUrl) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 60);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SCAN TO BOOK', qrX + qrSize / 2, qrY + qrSize + 28);
      };
      img.src = qrUrl;
    }

    // Bottom-left contact
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'left';
    if (contact) ctx.fillText(`📞 ${contact}`, 80, H - 180);
    ctx.font = '24px sans-serif';
    ctx.fillText('Powered by HealQR', 80, H - 130);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `social_${template}_${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    toast.success('Image downloaded');
  };

  const copyShareLink = async () => {
    const url = `https://healqr.com/lab/${profileSlug || labId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Booking link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const shareToWhatsApp = () => {
    const url = `https://healqr.com/lab/${profileSlug || labId}`;
    const msg = encodeURIComponent(`${headline} — ${subline}\n\nBook now: ${url}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const presets: { template: Template; headline: string; subline: string; tagline: string; label: string; icon: string }[] = [
    { template: 'offer', headline: '₹999 Full Body Check-up', subline: '60+ tests · Free home collection', tagline: 'Limited Offer', label: 'Test Offer', icon: '💸' },
    { template: 'qr-poster', headline: 'Book Your Lab Tests', subline: 'Scan QR · Walk-in or Home Collection', tagline: 'Quick & Easy', label: 'QR Poster', icon: '📱' },
    { template: 'festival', headline: 'Stay Healthy This Diwali', subline: 'Free consult on diabetes screening', tagline: 'Diwali Special', label: 'Festival', icon: '🎉' },
    { template: 'tip', headline: 'Know Your Numbers', subline: 'Annual health check saves lives', tagline: 'Health Tip', label: 'Health Tip', icon: '🩺' },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <h2 className="text-white text-2xl font-bold flex items-center gap-2">
            <Share2 className="w-6 h-6 text-fuchsia-500" /> Social Kit &amp; Offers
          </h2>
          <p className="text-gray-400 text-sm mt-1">Generate share-ready 1080×1080 posters with your QR &amp; offers</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-fuchsia-500" /> Templates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {presets.map(p => (
                <button key={p.template + p.label}
                  onClick={() => { setTemplate(p.template); setHeadline(p.headline); setSubline(p.subline); setTagline(p.tagline); }}
                  className={`p-3 rounded-lg border text-left transition ${template === p.template && headline === p.headline ? 'border-fuchsia-500 bg-fuchsia-500/10' : 'border-zinc-800 hover:border-zinc-700'}`}>
                  <div className="text-2xl">{p.icon}</div>
                  <div className="text-white text-sm font-bold mt-1">{p.label}</div>
                  <div className="text-gray-500 text-[10px] mt-0.5 line-clamp-2">{p.headline}</div>
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-4 border-t border-zinc-800">
              <div>
                <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Headline</label>
                <Input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={50}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Subline</label>
                <Input value={subline} onChange={(e) => setSubline(e.target.value)} maxLength={80}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Tag</label>
                <Input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={20}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Contact</label>
                <Input value={contact} onChange={(e) => setContact(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1" />
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-zinc-800">
              <Button onClick={downloadImage} className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white">
                <Download className="w-4 h-4 mr-1" /> Download PNG
              </Button>
              <Button variant="outline" className="w-full border-zinc-700 text-gray-300" onClick={shareToWhatsApp}>
                <Share2 className="w-4 h-4 mr-1" /> Share via WhatsApp
              </Button>
              <Button variant="outline" className="w-full border-zinc-700 text-gray-300" onClick={copyShareLink}>
                <Copy className="w-4 h-4 mr-1" /> Copy Booking Link
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-3 overflow-hidden min-w-0">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-fuchsia-500" /> Preview (1080 × 1080)
            </CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="bg-zinc-950 p-3 rounded-lg flex items-center justify-center overflow-hidden">
              <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg block" style={{ aspectRatio: '1', maxHeight: '600px' }} />
            </div>
            <p className="text-[11px] text-gray-500 mt-2 text-center break-all px-2">
              QR points to <span className="text-gray-400">https://healqr.com/lab/{profileSlug || labId}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  words.forEach((w, i) => {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineHeight;
    } else {
      line = test;
    }
    if (i === words.length - 1) ctx.fillText(line, x, yy);
  });
}
