import { Star, Calendar, AlertCircle, Phone, Share2, ExternalLink, Video, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { formatSpecialtyLabel as formatSpecialty } from '../utils/medicalSpecialties';

import ReviewCard from './ReviewCard';
import { useState, useEffect, useRef } from 'react';
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

interface Template {
  id: string;
  name: string;
  category: 'health-tip' | 'festival-wish' | 'festival' | 'camp' | 'announcement' | 'other';
  imageUrl?: string;
  image?: string | null;
  message?: string;
  isActive?: boolean;
  createdAt?: string;
  uploadDate?: string;
}

interface BookingMiniWebsiteProps {
  onBookNow?: () => void;
  onBack?: () => void;
  onViewHistory?: () => void;
  language?: Language;
  uploadedReviews?: Review[];
}

export default function BookingMiniWebsite({
  onBookNow,
  onBack,
  onViewHistory,
  language = 'english',
  uploadedReviews = [],
}: BookingMiniWebsiteProps) {
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [firestoreReviews, setFirestoreReviews] = useState<Review[]>([]);
  const [cumulativeStats, setCumulativeStats] = useState<{ averageRating: number; totalReviews: number }>({
    averageRating: 0, totalReviews: 0
  });
  const [emergencyButtonActive, setEmergencyButtonActive] = useState(false);
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [personalizedTemplates, setPersonalizedTemplates] = useState<Template[]>([]);
  const [patientFeedbackVideoUrl, setPatientFeedbackVideoUrl] = useState('');
  const [emergencyScheduling, setEmergencyScheduling] = useState<any>(null);
  const [isBookingBlocked, setIsBookingBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [isNavScrolled, setIsNavScrolled] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [profileSlug, setProfileSlug] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackQRScan();
    loadDoctorProfile();
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!emergencyScheduling || !emergencyScheduling.enabled) return;
    const interval = setInterval(() => loadDataFromStorage(), 60000);
    return () => clearInterval(interval);
  }, [emergencyScheduling]);

  const trackQRScan = async () => {
    try {
      const bookingDoctorId = sessionStorage.getItem('booking_doctor_id');
      if (!bookingDoctorId) return;
      const scanTracked = sessionStorage.getItem('qr_scan_tracked');
      if (scanTracked) return;
      const { db } = await import('../lib/firebase/config');
      if (!db) return;
      const { collection, addDoc, doc, updateDoc, serverTimestamp, increment } = await import('firebase/firestore');
      await addDoc(collection(db, 'qr_scans'), {
        doctorId: bookingDoctorId,
        scannedAt: serverTimestamp(),
        userAgent: navigator.userAgent,
        referrer: document.referrer || 'direct',
      });
      const doctorRef = doc(db, 'doctors', bookingDoctorId);
      await updateDoc(doctorRef, { totalQRScans: increment(1), lastScanAt: serverTimestamp() });
      sessionStorage.setItem('qr_scan_tracked', 'true');
    } catch (error) { /* silent */ }
  };

  const loadDoctorProfile = async () => {
    try {
      const bookingDoctorId = sessionStorage.getItem('booking_doctor_id');
      if (!bookingDoctorId) { setLoadingProfile(false); return; }
      const { db } = await import('../lib/firebase/config');
      if (!db) { setLoadingProfile(false); return; }
      const { doc, getDoc } = await import('firebase/firestore');
      const doctorDoc = await getDoc(doc(db, 'doctors', bookingDoctorId));

      if (doctorDoc.exists()) {
        const data = doctorDoc.data();
        setDoctorProfile(data);
        if (data.profileSlug) setProfileSlug(data.profileSlug);
        // Generate QR code
        const slug = data.profileSlug;
        const qrUrl = slug ? `https://healqr.com/dr/${slug}` : `https://healqr.com?doctorId=${bookingDoctorId}`;
        try {
          const dataUrl = await QRCodeLib.toDataURL(qrUrl, { width: 256, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#000000', light: '#ffffff' } });
          setQrDataUrl(dataUrl);
        } catch (e) { console.error('QR gen error:', e); }
        if (data.miniWebsiteReviews && Array.isArray(data.miniWebsiteReviews)) {
          setFirestoreReviews(data.miniWebsiteReviews);
        }

        const allReviews: Review[] = [];
        if (data.placeholderReviews && Array.isArray(data.placeholderReviews)) {
          allReviews.push(...data.placeholderReviews);
        }
        try {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const snapshot = await getDocs(query(collection(db, 'reviews'), where('doctorId', '==', bookingDoctorId)));
          allReviews.push(...snapshot.docs.map(d => ({ ...d.data() as any, id: d.id }) as Review));
        } catch (e) { console.error('Error fetching reviews:', e); }

        if (data.stats) {
          const localAvg = allReviews.length > 0 ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length : 0;
          setCumulativeStats({
            averageRating: data.stats.averageRating > 0 ? data.stats.averageRating : localAvg,
            totalReviews: allReviews.length
          });
        } else {
          const total = allReviews.length;
          const avg = total > 0 ? allReviews.reduce((s, r) => s + r.rating, 0) / total : 0;
          setCumulativeStats({ averageRating: avg, totalReviews: total });
        }

        if (data.personalizedTemplates && Array.isArray(data.personalizedTemplates)) {
          setPersonalizedTemplates(data.personalizedTemplates.filter((t: any) => t.isActive));
        }
        if (data.patientFeedbackVideoUrl) setPatientFeedbackVideoUrl(data.patientFeedbackVideoUrl);
        setIsBookingBlocked(false);
        setBlockReason('');
      }
    } catch (error) { /* silent */ }
    finally { setLoadingProfile(false); }
  };

  const loadDataFromStorage = async () => {
    try {
      const bookingDoctorId = sessionStorage.getItem('booking_doctor_id');
      if (!bookingDoctorId) return;
      const { db } = await import('../lib/firebase/config');
      if (!db) return;
      const { doc, getDoc } = await import('firebase/firestore');
      const doctorDoc = await getDoc(doc(db, 'doctors', bookingDoctorId));
      if (doctorDoc.exists()) {
        const data = doctorDoc.data();
        setEmergencyPhone(data.emergencyPhone || '');
        const scheduling = data.emergencyScheduling || null;
        setEmergencyScheduling(scheduling);
        setEmergencyButtonActive(checkEmergencyButtonSchedule(data.emergencyButtonActive || false, scheduling));
      }
    } catch (error) { console.error('Error loading emergency status:', error); }
  };

  const checkEmergencyButtonSchedule = (active: boolean, scheduling: any): boolean => {
    if (!active) return false;
    if (!scheduling || !scheduling.enabled) return active;
    const timeSlots = scheduling.timeSlots || [];
    if (timeSlots.length === 0) return false;
    const now = new Date();
    const day = ['sun','mon','tue','wed','thu','fri','sat'][now.getDay()];
    const mins = now.getHours() * 60 + now.getMinutes();
    for (const slot of timeSlots) {
      if (!slot.days?.includes(day)) continue;
      const [sh, sm] = slot.startTime.split(':').map(Number);
      const [eh, em] = slot.endTime.split(':').map(Number);
      const start = sh * 60 + sm, end = eh * 60 + em;
      if (end < start ? (mins >= start || mins < end) : (mins >= start && mins < end)) return true;
    }
    return false;
  };

  useEffect(() => {
    loadDataFromStorage();
    const interval = setInterval(() => loadDataFromStorage(), 2000);
    const handler = (e: StorageEvent) => { if (e.key === 'healqr_personalized_templates') loadDataFromStorage(); };
    window.addEventListener('storage', handler);
    return () => { clearInterval(interval); window.removeEventListener('storage', handler); };
  }, []);

  const handleShare = async () => {
    const url = profileSlug ? `https://healqr.com/dr/${profileSlug}` : window.location.href;
    const prefix = doctorProfile?.useDrPrefix !== false ? 'Dr. ' : '';
    const name = doctorProfile?.name || 'Doctor';
    if (navigator.share) {
      try { await navigator.share({ title: `${prefix}${name} - HealQR`, text: `Book an appointment with ${prefix}${name}`, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); setShowShareToast(true); setTimeout(() => setShowShareToast(false), 2000); } catch {}
    }
  };

  // Derived data
  const doctorName = doctorProfile?.name || 'Doctor';
  const useDrPrefix = doctorProfile?.useDrPrefix !== false;
  const displayName = `${useDrPrefix ? 'Dr. ' : ''}${doctorName}`;
  const degrees = doctorProfile?.degrees || [];
  const specialties = doctorProfile?.specialties || doctorProfile?.specialities || [];
  const experience = doctorProfile?.experience || '';
  const bio = doctorProfile?.bio || '';
  const services = doctorProfile?.clinicServices || [];
  const servicesLabel = doctorProfile?.clinicServicesLabel || 'Done Here';
  const profileImage = doctorProfile?.heroImage || doctorProfile?.profileImage || '';
  const initials = doctorName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const reviewsToShow = firestoreReviews.length > 0 ? firestoreReviews : uploadedReviews;
  const galleryImages = personalizedTemplates
    .filter(t => t.imageUrl || t.image)
    .map(t => ({ url: t.imageUrl || t.image || '', category: t.category, name: t.name }));

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

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* ═══════════════ FIXED NAVBAR ═══════════════ */}
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

      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <section ref={heroRef} className="relative pt-20 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center min-h-[70vh] md:min-h-[80vh] py-8 md:py-12">
            {/* Left: Text */}
            <div className="order-2 md:order-1 text-center md:text-left">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-3">{displayName}</h1>

              {degrees.length > 0 && (
                <p className="text-emerald-400 font-semibold text-sm sm:text-base tracking-widest uppercase mb-2">
                  {degrees.join(' • ')}
                </p>
              )}

              {specialties.length > 0 && (
                <p className="text-white font-semibold text-sm sm:text-base mb-3">
                  {specialties.map((s: string) => formatSpecialty(s)).join(' | ')}
                </p>
              )}

              {experience && (
                <p className="text-gray-500 text-sm mb-4">
                  {experience.toLowerCase().includes('year') || experience.toLowerCase().includes('experience') ? experience : `${experience} Years of Experience`}
                </p>
              )}

              {cumulativeStats.totalReviews > 0 && (
                <div className="flex items-center gap-2 mb-6 justify-center md:justify-start">
                  <div className="flex">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= Math.floor(cumulativeStats.averageRating) ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-gray-600'}`} />
                    ))}
                  </div>
                  <span className="text-white text-sm font-medium">{cumulativeStats.averageRating.toFixed(1)}</span>
                  <span className="text-gray-500 text-sm">({cumulativeStats.totalReviews} reviews)</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                {isBookingBlocked ? (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-left">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-red-400 font-semibold text-sm mb-1">Booking Unavailable</h4>
                        <p className="text-gray-400 text-xs">{blockReason}</p>
                        {doctorProfile?.phone && (
                          <a href={`tel:${doctorProfile.phone}`} className="inline-flex items-center gap-2 mt-2 text-emerald-400 text-xs">
                            <Phone className="w-3 h-3" /> Call Clinic
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={onBookNow}
                    disabled={!onBookNow || isBookingBlocked}
                    className="h-12 px-8 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold text-base shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 disabled:opacity-50"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Book Appointment Now
                  </Button>
                )}

                {emergencyButtonActive && (
                  <Button onClick={() => setShowEmergencyDialog(true)} className="h-12 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium animate-pulse">
                    <AlertCircle className="w-5 h-5 mr-2" /> Emergency
                  </Button>
                )}
              </div>
            </div>

            {/* Right: Hero Image */}
            <div className="order-1 md:order-2 flex justify-center md:justify-end">
              <div className="relative w-52 h-52 sm:w-60 sm:h-60 md:w-72 md:h-72">
                {/* Glow ring */}
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

      {/* ═══════════════ ABOUT SECTION ═══════════════ */}
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

      {/* ═══════════════ SERVICES SECTION ═══════════════ */}
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

      {/* ═══════════════ HEALTH TIP ═══════════════ */}
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

      {/* ═══════════════ GALLERY ═══════════════ */}
      {galleryImages.length > 0 && (
        <section className="py-12 md:py-16 bg-[#0d1220] border-t border-gray-800/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Gallery</h2>
              <div className="w-12 h-1 bg-emerald-500 rounded-full mx-auto" />
            </div>
            <div className={`grid gap-4 max-w-3xl mx-auto ${galleryImages.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {galleryImages.slice(0, 2).map((img, i) => (
                <div key={i} className="rounded-xl overflow-hidden border border-gray-800 hover:border-emerald-500/30 transition-colors group">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-3 bg-[#141a28]">
                    <span className="text-xs text-emerald-400 capitalize">{img.category.replace('-', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ PATIENT FEEDBACK VIDEO ═══════════════ */}
      {patientFeedbackVideoUrl && (
        <section className="py-12 md:py-16 border-t border-gray-800/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Patient Feedback</h2>
            <div className="w-12 h-1 bg-emerald-500 rounded-full mx-auto mb-4" />
            <p className="text-gray-400 text-sm mb-6">Watch what patients say about their experience</p>
            <a href={patientFeedbackVideoUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium transition-colors">
              <Video className="w-5 h-5" /> Watch Video <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </section>
      )}

      {/* ═══════════════ REVIEWS ═══════════════ */}
      {reviewsToShow.length > 0 && (
        <section className="py-12 md:py-16 bg-[#0d1220] border-t border-gray-800/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">What My Patients Say</h2>
              <div className="w-12 h-1 bg-emerald-500 rounded-full mx-auto" />
            </div>
            <div className={`grid gap-4 max-w-3xl mx-auto ${reviewsToShow.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {reviewsToShow.slice(0, 2).map((review, i) => (
                <div key={review.id || i} className="w-full flex">
                  <div className="flex-1">
                    <ReviewCard patientName={review.patientName} rating={review.rating} date={review.date} comment={review.comment} verified={review.verified} doctorName={doctorName} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ CONTACT / QR ═══════════════ */}
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
              <a href={`https://healqr.com/dr/${profileSlug}`} className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
                healqr.com/dr/{profileSlug}
              </a>
            ) : (
              <span className="text-emerald-400 text-sm font-medium">healqr.com</span>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════ BOOK NOW CTA STRIP ═══════════════ */}
      {!isBookingBlocked && (
        <section className="py-8 bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border-t border-emerald-500/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-white text-lg font-semibold mb-4">Ready to book your appointment?</p>
            <Button onClick={onBookNow} disabled={!onBookNow}
              className="h-12 px-10 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold text-base shadow-lg shadow-emerald-500/25">
              <Calendar className="w-5 h-5 mr-2" /> Book Now
            </Button>
          </div>
        </section>
      )}

      {/* ═══════════════ FOOTER ═══════════════ */}
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

      {/* Emergency Dialog */}
      <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-xl text-white flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-500" /> Emergency Consultation
            </DialogTitle>
            <DialogDescription className="text-gray-400">You are about to call the doctor directly for an emergency consultation.</DialogDescription>
          </DialogHeader>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 my-4">
            <div className="flex gap-3">
              <Phone className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-500 mb-2">Emergency Contact</h4>
                <p className="text-white text-xl mb-2">{emergencyPhone}</p>
                <p className="text-sm text-gray-300">Please explain your emergency clearly when the doctor answers.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmergencyDialog(false)} className="bg-transparent border-zinc-700 text-white hover:bg-zinc-800">Cancel</Button>
            <Button onClick={() => { setShowEmergencyDialog(false); window.location.href = `tel:${emergencyPhone}`; }} className="bg-red-600 hover:bg-red-700 text-white">
              <Phone className="w-4 h-4 mr-2" /> Call Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
