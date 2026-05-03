import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from './ui/button';
import healQRLogo from '../assets/healqr.logo.png';
import { Star, Calendar, Phone, Share2, ChevronDown, Stethoscope } from 'lucide-react';
import TemplateDisplay from './TemplateDisplay';
import QRCodeLib from 'qrcode';

const ROLE_LABELS: Record<string, string> = {
  'phlebotomist': 'Phlebotomist',
  'physiotherapist': 'Physiotherapist',
  'nurse': 'Nurse',
  'wound-dresser': 'Wound Dresser',
  'aaya': 'Aaya / Caretaker',
  'home-assistant': 'Home Health Assistant',
};

interface ParamedicalMiniWebsiteProps {
  onBookNow?: () => void;
  onBack?: () => void;
}

export default function ParamedicalMiniWebsite({ onBookNow, onBack }: ParamedicalMiniWebsiteProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isNavScrolled, setIsNavScrolled] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const paraId = sessionStorage.getItem('booking_paramedical_id');
      if (!paraId || !db) { setLoadingProfile(false); return; }
      try {
        let snap = await getDoc(doc(db, 'paramedicals', paraId));
        if (!snap.exists()) {
          // Legacy fallback
          snap = await getDoc(doc(db, 'phlebotomists', paraId));
        }
        if (snap.exists()) {
          setProfile({ uid: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error('Profile load error:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    load();
  }, []);

  // Generate QR code for sharing
  useEffect(() => {
    if (!profile) return;
    const slug = profile.slug || profile.uid;
    const url = `https://healqr.com/para/${slug}`;
    QRCodeLib.toDataURL(url, { width: 240, margin: 1, color: { dark: '#10b981', light: '#0a0f1a' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [profile]);

  // Sticky-nav effect
  useEffect(() => {
    const onScroll = () => setIsNavScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleShare = async () => {
    const slug = profile?.slug || profile?.uid;
    const url = `https://healqr.com/para/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: profile?.name || 'Healthcare Professional', url });
      } else {
        await navigator.clipboard.writeText(url);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
      }
    } catch { /* user cancelled */ }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col items-center justify-center p-6">
        <Stethoscope className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-xl font-bold mb-2">Profile Not Found</h2>
        <p className="text-gray-400 mb-6 text-center">This healthcare professional profile doesn't exist or has been removed.</p>
        {onBack && <Button variant="outline" onClick={onBack} className="border-zinc-700 text-white">Go Back</Button>}
      </div>
    );
  }

  const displayName: string = profile.name || profile.fullName || 'Healthcare Professional';
  const roleName: string = ROLE_LABELS[profile.role] || profile.role || 'Healthcare Professional';
  const experience: string = profile.experience || '';
  const bio: string = profile.bio || '';
  // Service badges (admin-curated, like clinicServices for doctors)
  const services: string[] =
    (Array.isArray(profile.serviceBadges) && profile.serviceBadges) ||
    (Array.isArray(profile.clinicServices) && profile.clinicServices) ||
    [];
  const servicesLabel: string = profile.serviceBadgesLabel || profile.clinicServicesLabel || 'Done Here';
  const profileImage: string = profile.heroImage || profile.profileImage || profile.profilePhoto || '';
  const initials: string = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const avgRating: number = profile.averageRating || 0;
  const totalReviews: number = profile.totalReviews || 0;
  const profileSlug: string = profile.slug || '';

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* ═══════════ FIXED NAVBAR ═══════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isNavScrolled
          ? 'bg-[#0a0f1a]/95 backdrop-blur-md shadow-lg shadow-black/20 border-b border-emerald-500/10'
          : 'bg-transparent'
      }`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={healQRLogo} alt="HealQR" className="h-8 object-contain" />
          </div>
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors text-sm mr-2">← Back</button>
            )}
            <button onClick={handleShare} className="text-gray-400 hover:text-emerald-400 transition-colors p-2 rounded-full hover:bg-white/5" title="Share">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {showShareToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
          Link copied!
        </div>
      )}

      {/* ═══════════ HERO ═══════════ */}
      <section ref={heroRef} className="relative pt-20 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center min-h-[70vh] md:min-h-[80vh] py-8 md:py-12">
            {/* Left: Text */}
            <div className="order-2 md:order-1 text-center md:text-left">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-3">{displayName}</h1>

              <p className="text-emerald-400 font-semibold text-sm sm:text-base tracking-widest uppercase mb-2">
                {roleName}
              </p>

              {experience && (
                <p className="text-gray-500 text-sm mb-4">
                  {experience.toLowerCase().includes('year') || experience.toLowerCase().includes('experience')
                    ? experience
                    : `${experience} Years of Experience`}
                </p>
              )}

              {totalReviews > 0 && (
                <div className="flex items-center gap-2 mb-6 justify-center md:justify-start">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${s <= Math.floor(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-gray-600'}`}
                      />
                    ))}
                  </div>
                  <span className="text-white text-sm font-medium">{avgRating.toFixed(1)}</span>
                  <span className="text-gray-500 text-sm">({totalReviews} reviews)</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Button
                  onClick={onBookNow}
                  disabled={!onBookNow}
                  className="h-12 px-8 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold text-base shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 disabled:opacity-50"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Book Appointment Now
                </Button>
              </div>
            </div>

            {/* Right: Hero Image */}
            <div className="order-1 md:order-2 flex justify-center md:justify-end">
              <div className="relative w-52 h-52 sm:w-60 sm:h-60 md:w-72 md:h-72">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/30 to-emerald-600/10 blur-xl" />
                <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-emerald-500/30 shadow-2xl shadow-emerald-500/20">
                  {profileImage ? (
                    <img src={profileImage} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1a2332] to-[#0f1620] flex items-center justify-center">
                      <span className="text-5xl sm:text-6xl md:text-7xl font-bold text-emerald-500/40">{initials}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center pb-4 md:pb-8 animate-bounce">
            <ChevronDown className="w-5 h-5 text-gray-600" />
          </div>
        </div>
      </section>

      {/* ═══════════ ABOUT ME ═══════════ */}
      {bio && (
        <section className="py-12 md:py-16 border-t border-gray-800/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">About Me</h2>
              <div className="w-12 h-1 bg-emerald-500 rounded-full mx-auto mb-6" />
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">"{bio}"</p>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ SERVICES ═══════════ */}
      {services.length > 0 && (
        <section className="py-12 md:py-16 bg-[#0d1220] border-t border-gray-800/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Services</h2>
              <div className="w-12 h-1 bg-emerald-500 rounded-full mx-auto mb-3" />
              <p className="text-emerald-400 text-sm font-medium">{servicesLabel}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {services.map((service: string, i: number) => (
                <div key={i} className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-4 text-center hover:border-emerald-500/40 transition-colors">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-emerald-400 text-sm">✓</span>
                  </div>
                  <p className="text-white text-xs sm:text-sm font-medium">{service}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ TODAY'S HEALTH TIP ═══════════ */}
      <section className="py-12 md:py-16 border-t border-gray-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Today's Health Tip</h2>
            <div className="w-12 h-1 bg-emerald-500 rounded-full mx-auto" />
          </div>
          <div className="max-w-xl mx-auto">
            <TemplateDisplay placement="booking-mini-website" className="rounded-xl max-w-full" />
          </div>
        </div>
      </section>

      {/* ═══════════ CONTACT / QR ═══════════ */}
      <section className="py-12 md:py-16 border-t border-gray-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Contact</h2>
            <div className="w-12 h-1 bg-emerald-500 rounded-full mx-auto" />
          </div>
          <div className="max-w-sm mx-auto bg-[#141a28] border border-gray-800 rounded-2xl p-6 text-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-40 h-40 mx-auto mb-4 rounded-xl" />
            ) : (
              <div className="w-40 h-40 bg-gray-800 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <p className="text-gray-400 text-sm mb-2">Scan to book an appointment</p>
            {profileSlug ? (
              <a href={`https://healqr.com/para/${profileSlug}`} className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
                healqr.com/para/{profileSlug}
              </a>
            ) : (
              <span className="text-emerald-400 text-sm font-medium">healqr.com</span>
            )}
            {profile.phone && (
              <a
                href={`tel:${profile.phone}`}
                className="mt-4 inline-flex items-center justify-center gap-2 text-gray-300 hover:text-emerald-400 text-sm"
              >
                <Phone className="w-4 h-4" /> {profile.phone}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ BOOK NOW CTA STRIP ═══════════ */}
      <section className="py-8 bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border-t border-emerald-500/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-white text-lg font-semibold mb-4">Ready to book your appointment?</p>
          <Button
            onClick={onBookNow}
            disabled={!onBookNow}
            className="h-12 px-10 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold text-base shadow-lg shadow-emerald-500/25"
          >
            <Calendar className="w-5 h-5 mr-2" /> Book Now
          </Button>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="py-6 border-t border-gray-800/50 bg-[#070b14]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={healQRLogo} alt="HealQR" className="h-5 object-contain" />
            <span className="text-gray-500 text-xs">
              Powered by{' '}
              <a href="https://www.healqr.com" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400 transition-colors">
                www.healqr.com
              </a>
            </span>
          </div>
          <p className="text-gray-600 text-[10px]">© {new Date().getFullYear()} HealQR. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
