import { Star, Calendar, AlertCircle, Phone, Share2, MapPin, FlaskConical, ChevronDown, Clock, TestTube, Building2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';

import ReviewCard from './ReviewCard';
import { useState, useEffect } from 'react';
import TemplateDisplay from './TemplateDisplay';
import type { Language } from '../utils/translations';
import healQRLogo from '../assets/healqr.logo.png';
import QRCodeLib from 'qrcode';

interface Review {
  id: number;
  patientName: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
}

interface LabBookingMiniWebsiteProps {
  onBookNow?: () => void;
  onBack?: () => void;
  language?: Language;
}

export default function LabBookingMiniWebsite({
  onBookNow,
  onBack,
  language = 'english',
}: LabBookingMiniWebsiteProps) {
  const [labProfile, setLabProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [allReviewsForStats, setAllReviewsForStats] = useState<Review[]>([]);
  const [emergencyButtonActive, setEmergencyButtonActive] = useState(false);
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [isNavScrolled, setIsNavScrolled] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [profileSlug, setProfileSlug] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    trackQRScan();
    loadLabProfile();
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const trackQRScan = async () => {
    try {
      const bookingLabId = sessionStorage.getItem('booking_lab_id');
      if (!bookingLabId) return;
      const scanTracked = sessionStorage.getItem('lab_qr_scan_tracked');
      if (scanTracked) return;
      const { db } = await import('../lib/firebase/config');
      if (!db) return;
      const { collection, addDoc, doc, updateDoc, serverTimestamp, increment } = await import('firebase/firestore');
      await addDoc(collection(db, 'lab_qr_scans'), {
        labId: bookingLabId,
        scannedAt: serverTimestamp(),
        userAgent: navigator.userAgent,
        referrer: document.referrer || 'direct',
      });
      const labRef = doc(db, 'labs', bookingLabId);
      await updateDoc(labRef, { totalQRScans: increment(1), lastScanAt: serverTimestamp() });
      sessionStorage.setItem('lab_qr_scan_tracked', 'true');
    } catch (error) { console.error('Error tracking lab QR scan:', error); }
  };

  const loadLabProfile = async () => {
    try {
      const bookingLabId = sessionStorage.getItem('booking_lab_id');
      if (!bookingLabId) { setLoadingProfile(false); return; }
      const { db } = await import('../lib/firebase/config');
      if (!db) { setLoadingProfile(false); return; }
      const { doc, getDoc, collection, query, where, getDocs, orderBy, limit } = await import('firebase/firestore');
      const labSnap = await getDoc(doc(db, 'labs', bookingLabId));

      if (labSnap.exists()) {
        const data = labSnap.data();
        setLabProfile({ id: labSnap.id, ...data });
        if (data.labSlug || data.profileSlug) setProfileSlug(data.labSlug || data.profileSlug);

        // Generate QR code
        const slug = data.labSlug || data.profileSlug;
        const qrUrl = slug ? `https://healqr.com/lab/${slug}` : `https://healqr.com?labId=${bookingLabId}`;
        try {
          const dataUrl = await QRCodeLib.toDataURL(qrUrl, { width: 256, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#000000', light: '#ffffff' } });
          setQrDataUrl(dataUrl);
        } catch (e) { console.error('QR gen error:', e); }

        // Emergency
        setEmergencyPhone(data.emergencyPhone || data.phone || '');
        setEmergencyButtonActive(!!data.emergencyButtonActive);

        // Reviews
        try {
          const reviewsQuery = query(
            collection(db, 'reviews'),
            where('labId', '==', bookingLabId),
            where('isApproved', '==', true),
            orderBy('date', 'desc'),
            limit(10)
          );
          const reviewsSnap = await getDocs(reviewsQuery);
          const loaded = reviewsSnap.docs.map((d, i) => ({
            id: i + 1,
            patientName: d.data().patientName || 'Patient',
            rating: d.data().rating || 5,
            date: d.data().date || new Date().toISOString().split('T')[0],
            comment: d.data().comment || '',
            verified: d.data().verified || true,
          }));
          setReviews(loaded.slice(0, 2));
          setAllReviewsForStats(loaded);
        } catch (e) { console.error('Error loading lab reviews:', e); }
      }
    } catch (error) { console.error('Error loading lab profile:', error); }
    finally { setLoadingProfile(false); }
  };

  const handleShare = async () => {
    const url = profileSlug ? `https://healqr.com/lab/${profileSlug}` : window.location.href;
    const name = labProfile?.name || labProfile?.labName || 'Lab';
    if (navigator.share) {
      try { await navigator.share({ title: `${name} - HealQR`, text: `Book a test at ${name}`, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); setShowShareToast(true); setTimeout(() => setShowShareToast(false), 2000); } catch {}
    }
  };

  // Derived
  const labName = labProfile?.name || labProfile?.labName || 'Diagnostic Center';
  const initials = labName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const description = labProfile?.description || labProfile?.bio || '';
  const address = labProfile?.address || '';
  const services = labProfile?.services || labProfile?.testCategories || [];
  const branches = labProfile?.locations || [];
  const profileImage = labProfile?.heroImage || labProfile?.logoUrl || labProfile?.profileImage || '';
  const templates = (labProfile?.personalizedTemplates || []).filter((t: any) => t.isActive);
  const galleryImages = templates
    .filter((t: any) => t.imageUrl || t.image)
    .map((t: any) => ({ url: t.imageUrl || t.image, category: t.category, name: t.name }));
  const testCatalog = labProfile?.testCatalog || [];
  const accreditations = labProfile?.accreditations || [];
  const timings = labProfile?.timings || labProfile?.workingHours || '';

  const avgRating = allReviewsForStats.length > 0
    ? allReviewsForStats.reduce((s, r) => s + r.rating, 0) / allReviewsForStats.length : 0;

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* ═══════════════ FIXED NAVBAR ═══════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isNavScrolled
          ? 'bg-[#0a0f1a]/95 backdrop-blur-md shadow-lg shadow-black/20 border-b border-purple-500/10'
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
            <button onClick={handleShare} className="text-gray-400 hover:text-purple-400 transition-colors p-2 rounded-full hover:bg-white/5" title="Share">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {showShareToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-purple-500 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
          Link copied!
        </div>
      )}

      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <section className="relative pt-20 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center min-h-[70vh] md:min-h-[80vh] py-8 md:py-12">
            {/* Left: Text */}
            <div className="order-2 md:order-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 mb-4">
                <FlaskConical className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300 text-xs font-medium">Diagnostic Center</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-4">{labName}</h1>

              {/* Stats row */}
              <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-4">
                {testCatalog.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1.5">
                    <TestTube className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-purple-300 text-xs font-medium">
                      {testCatalog.length} Tests Available
                    </span>
                  </div>
                )}
                {branches.length > 1 && (
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 text-xs font-medium">
                      {branches.length} Branches
                    </span>
                  </div>
                )}
                {accreditations.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-300 text-xs font-medium">
                      {accreditations.join(' · ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Rating */}
              {allReviewsForStats.length > 0 && (
                <div className="flex items-center gap-2 mb-6 justify-center md:justify-start">
                  <div className="flex">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= Math.floor(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-gray-600'}`} />
                    ))}
                  </div>
                  <span className="text-white text-sm font-medium">{avgRating.toFixed(1)}</span>
                  <span className="text-gray-500 text-sm">({allReviewsForStats.length} reviews)</span>
                </div>
              )}

              {/* Timings */}
              {timings && (
                <div className="flex items-center gap-2 mb-6 justify-center md:justify-start text-gray-400">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span className="text-sm">{timings}</span>
                </div>
              )}

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Button onClick={onBookNow} disabled={!onBookNow}
                  className="h-12 px-8 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-semibold text-base shadow-lg shadow-purple-500/25 transition-all hover:shadow-purple-500/40 disabled:opacity-50">
                  <Calendar className="w-5 h-5 mr-2" />
                  Book a Test Now
                </Button>
                {emergencyButtonActive && emergencyPhone && (
                  <Button onClick={() => setShowEmergencyDialog(true)} className="h-12 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium animate-pulse">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Emergency
                  </Button>
                )}
              </div>
            </div>

            {/* Right: Hero Image */}
            <div className="order-1 md:order-2 flex justify-center md:justify-end">
              <div className="relative w-52 h-52 sm:w-60 sm:h-60 md:w-72 md:h-72">
                {/* Glow ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400/30 to-purple-600/10 blur-xl" />
                <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-purple-500/30 shadow-2xl shadow-purple-500/20">
                  {profileImage ? (
                    <img src={profileImage} alt={labName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1a2332] to-[#0f1620] flex items-center justify-center">
                      <FlaskConical className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-purple-500/40" />
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

      {/* ═══════════════ ABOUT SECTION ═══════════════ */}
      {(description || address) && (
        <section className="py-12 md:py-16 border-t border-gray-800/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">About Us</h2>
              <div className="w-12 h-1 bg-purple-500 rounded-full mx-auto mb-6" />
              {description && <p className="text-gray-300 leading-relaxed text-sm sm:text-base mb-4">"{description}"</p>}
              {address && (
                <div className="flex items-center gap-2 justify-center mt-4 text-gray-400">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  <span className="text-sm">{address}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ TEST CATALOG ═══════════════ */}
      {testCatalog.length > 0 && (
        <section className="py-12 md:py-16 bg-[#0d1220] border-t border-gray-800/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Test Menu</h2>
              <div className="w-12 h-1 bg-purple-500 rounded-full mx-auto mb-3" />
              <p className="text-purple-400 text-sm font-medium">Available Tests & Packages</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
              {testCatalog.slice(0, 9).map((test: any, i: number) => (
                <div key={i} className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-4 hover:border-purple-500/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <TestTube className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{test.name || test}</p>
                      {test.price && (
                        <p className="text-purple-300 text-xs mt-1">₹{test.price}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {testCatalog.length > 9 && (
              <p className="text-center text-purple-400 text-sm mt-4">+ {testCatalog.length - 9} more tests available</p>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════ SERVICES / CATEGORIES ═══════════════ */}
      {services.length > 0 && (
        <section className="py-12 md:py-16 border-t border-gray-800/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Our Services</h2>
              <div className="w-12 h-1 bg-purple-500 rounded-full mx-auto mb-3" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {services.map((service: string, i: number) => (
                <div key={i} className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-4 text-center hover:border-purple-500/40 transition-colors">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-purple-400 text-sm">✓</span>
                  </div>
                  <p className="text-white text-xs sm:text-sm font-medium">{service}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ BRANCHES ═══════════════ */}
      {branches.length > 1 && (
        <section className="py-12 md:py-16 bg-[#0d1220] border-t border-gray-800/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Our Branches</h2>
              <div className="w-12 h-1 bg-purple-500 rounded-full mx-auto" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {branches.map((branch: any, i: number) => (
                <div key={i} className="bg-[#141a28] border border-gray-800 rounded-xl p-4 hover:border-purple-500/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-white text-sm font-semibold">{branch.name}</h3>
                      {branch.landmark && <p className="text-gray-400 text-xs mt-1">{branch.landmark}</p>}
                      {branch.address && <p className="text-gray-400 text-xs mt-1">{branch.address}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ HEALTH TIP ═══════════════ */}
      <section className="py-12 md:py-16 border-t border-gray-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Today's Health Tip</h2>
            <div className="w-12 h-1 bg-purple-500 rounded-full mx-auto" />
          </div>
          <div className="max-w-xl mx-auto">
            <TemplateDisplay placement="booking-mini-website" className="rounded-xl max-w-full" />
          </div>
        </div>
      </section>

      {/* ═══════════════ GALLERY ═══════════════ */}
      {galleryImages.length > 0 && (
        <section className="py-12 md:py-16 bg-[#0d1220] border-t border-gray-800/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Gallery</h2>
              <div className="w-12 h-1 bg-purple-500 rounded-full mx-auto" />
            </div>
            <div className={`grid gap-4 max-w-3xl mx-auto ${galleryImages.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {galleryImages.slice(0, 2).map((img: any, i: number) => (
                <div key={i} className="rounded-xl overflow-hidden border border-gray-800 hover:border-purple-500/30 transition-colors group">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-3 bg-[#141a28]">
                    <span className="text-xs text-purple-400 capitalize">{img.category.replace('-', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ REVIEWS ═══════════════ */}
      {reviews.length > 0 && (
        <section className="py-12 md:py-16 border-t border-gray-800/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">What Our Patients Say</h2>
              <div className="w-12 h-1 bg-purple-500 rounded-full mx-auto" />
            </div>
            <div className={`grid gap-4 max-w-3xl mx-auto ${reviews.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {reviews.slice(0, 2).map((review, i) => (
                <div key={review.id || i} className="w-full flex">
                  <div className="flex-1">
                    <ReviewCard patientName={review.patientName} rating={review.rating} date={review.date} comment={review.comment} verified={review.verified} doctorName={labName} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ CONTACT / QR ═══════════════ */}
      <section className="py-12 md:py-16 bg-[#0d1220] border-t border-gray-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Contact</h2>
            <div className="w-12 h-1 bg-purple-500 rounded-full mx-auto" />
          </div>
          <div className="max-w-sm mx-auto bg-[#141a28] border border-gray-800 rounded-2xl p-6 text-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-40 h-40 mx-auto mb-4 rounded-xl" />
            ) : (
              <div className="w-40 h-40 bg-gray-800 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <p className="text-gray-400 text-sm mb-2">Scan to book a test</p>
            {profileSlug ? (
              <a href={`https://healqr.com/lab/${profileSlug}`} className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors">
                healqr.com/lab/{profileSlug}
              </a>
            ) : (
              <span className="text-purple-400 text-sm font-medium">healqr.com</span>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════ BOOK NOW CTA STRIP ═══════════════ */}
      <section className="py-8 bg-gradient-to-r from-purple-600/20 to-purple-500/10 border-t border-purple-500/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-white text-lg font-semibold mb-4">Ready to book your test?</p>
          <Button onClick={onBookNow} disabled={!onBookNow}
            className="h-12 px-10 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-semibold text-base shadow-lg shadow-purple-500/25">
            <Calendar className="w-5 h-5 mr-2" />
            Book Now
          </Button>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="py-6 border-t border-gray-800/50 bg-[#070b14]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={healQRLogo} alt="HealQR" className="h-5 object-contain" />
            <span className="text-gray-500 text-xs">
              Powered by{' '}
              <a href="https://www.healqr.com" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:text-purple-400 transition-colors">www.healqr.com</a>
            </span>
          </div>
          <p className="text-gray-600 text-[10px]">© {new Date().getFullYear()} HealQR. All rights reserved.</p>
        </div>
      </footer>

      {/* Emergency Dialog */}
      <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-xl text-white flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-500" />
              Emergency Contact
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              You are about to call the lab directly for an emergency.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 my-4">
            <div className="flex gap-3">
              <Phone className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-500 mb-2">Emergency Contact</h4>
                <p className="text-white text-xl mb-2">{emergencyPhone}</p>
                <p className="text-sm text-gray-300">Please explain your situation clearly when someone answers.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmergencyDialog(false)} className="bg-transparent border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </Button>
            <Button onClick={() => { setShowEmergencyDialog(false); window.location.href = `tel:${emergencyPhone}`; }} className="bg-red-600 hover:bg-red-700 text-white">
              <Phone className="w-4 h-4 mr-2" /> Call Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
