import { Star, Lightbulb, Calendar, AlertCircle, Phone, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { t, type Language } from '../utils/translations';
import ReviewCard from './ReviewCard';
import { useState, useEffect } from 'react';
import TemplateDisplay from './TemplateDisplay';
import BookingFlowLayout from './BookingFlowLayout';

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
  imageUrl?: string; // From PersonalizedTemplatesManager
  image?: string | null; // Legacy support
  message?: string;
  isActive?: boolean;
  createdAt?: string;
  uploadDate?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  externalLink?: string;
  stock: number;
  category: string;
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
  // Doctor profile state (loaded from Firestore)
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [firestoreReviews, setFirestoreReviews] = useState<Review[]>([]);
  const [allReviewsForStats, setAllReviewsForStats] = useState<Review[]>([]);

  const [emergencyButtonActive, setEmergencyButtonActive] = useState(false);
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [personalizedTemplates, setPersonalizedTemplates] = useState<Template[]>([]);

  // Booking blocked state
  const [isBookingBlocked, setIsBookingBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  // Track QR scan and load doctor profile
  useEffect(() => {
    trackQRScan();
    loadDoctorProfile();
  }, []);

  // Track QR scan for analytics
  const trackQRScan = async () => {
    try {
      const bookingDoctorId = sessionStorage.getItem('booking_doctor_id');
      if (!bookingDoctorId) return;

      // Check if already tracked in this session
      const scanTracked = sessionStorage.getItem('qr_scan_tracked');
      if (scanTracked) return;

      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp, increment } =
        await import('firebase/firestore');

      // Record scan event in qr_scans collection
      await addDoc(collection(db, 'qr_scans'), {
        doctorId: bookingDoctorId,
        scannedAt: serverTimestamp(),
        userAgent: navigator.userAgent,
        referrer: document.referrer || 'direct',
      });

      // Increment scan counter in doctor document
      const doctorRef = doc(db, 'doctors', bookingDoctorId);
      await updateDoc(doctorRef, {
        totalQRScans: increment(1),
        lastScanAt: serverTimestamp(),
      });

      // Mark as tracked in this session
      sessionStorage.setItem('qr_scan_tracked', 'true');
    } catch (error) {
      // Error tracking QR scan
    }
  };

  const loadDoctorProfile = async () => {
    try {
      const bookingDoctorId = sessionStorage.getItem('booking_doctor_id');

      if (!bookingDoctorId) {
        setLoadingProfile(false);
        return;
      }

      const { db } = await import('../lib/firebase/config');
      if (!db) {
        setLoadingProfile(false);
        return;
      }

      const { doc, getDoc } = await import('firebase/firestore');
      const doctorDocRef = doc(db, 'doctors', bookingDoctorId);
      const doctorDoc = await getDoc(doctorDocRef);

      if (doctorDoc.exists()) {
        const data = doctorDoc.data();
        setDoctorProfile(data);

        if (data.miniWebsiteReviews && Array.isArray(data.miniWebsiteReviews)) {
          setFirestoreReviews(data.miniWebsiteReviews);
        }

        const allReviews: Review[] = [];
        if (data.placeholderReviews && Array.isArray(data.placeholderReviews)) {
          allReviews.push(...data.placeholderReviews);
        }
        setAllReviewsForStats(allReviews);

        // Load Personalized Templates
        if (data.personalizedTemplates && Array.isArray(data.personalizedTemplates)) {
          // Filter only active templates
          const activeTemplates = data.personalizedTemplates.filter((t: any) => t.isActive);
          setPersonalizedTemplates(activeTemplates);
        }

        // Booking blocking removed - project is now free
        setIsBookingBlocked(false);
        setBlockReason('');
      }
    } catch (error) {
      // Error loading doctor profile
    } finally {
      setLoadingProfile(false);
    }
  };

  // Function to load data from localStorage and Firestore
  const loadDataFromStorage = async () => {
    // Load emergency button status from Firestore (not localStorage)
    try {
      const bookingDoctorId = sessionStorage.getItem('booking_doctor_id');
      if (bookingDoctorId) {
        const { db } = await import('../lib/firebase/config');
        if (db) {
          const { doc, getDoc } = await import('firebase/firestore');
          const doctorDoc = await getDoc(doc(db, 'doctors', bookingDoctorId));
          
          if (doctorDoc.exists()) {
            const data = doctorDoc.data();
            const isActive = data.emergencyButtonActive || false;
            const phone = data.emergencyPhone || '';
            setEmergencyButtonActive(isActive);
            setEmergencyPhone(phone);
          }
        }
      }
    } catch (error) {
      console.error('Error loading emergency button status:', error);
    }
    
    // Note: Personalized templates are now loaded directly from Firestore in loadDoctorProfile
    // We no longer load them from localStorage to ensure patients see the correct data
  };

  // Check if emergency button is activated
  useEffect(() => {
    loadDataFromStorage();

    const interval = setInterval(() => {
      loadDataFromStorage();
    }, 2000);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'healqr_personalized_templates') {
        loadDataFromStorage();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleEmergencyCall = () => {
    setShowEmergencyDialog(true);
  };

  const confirmEmergencyCall = () => {
    setShowEmergencyDialog(false);
    window.location.href = `tel:${emergencyPhone}`;
  };

  return (
    <BookingFlowLayout
      onBack={onBack}
      doctorName={doctorProfile?.name}
      doctorPhoto={doctorProfile?.profileImage}
      doctorDegrees={doctorProfile?.degrees}
      doctorSpecialty={doctorProfile?.specialities?.[0]}
      useDrPrefix={doctorProfile?.useDrPrefix !== false}
    >
      <div className="bg-[#1a1f2e] rounded-2xl shadow-xl overflow-hidden max-w-full">
        {/* Book Now Button Section */}
        <div className="bg-gradient-to-br from-gray-700 to-gray-800 px-4 sm:px-6 py-4 sm:py-6">
          {isBookingBlocked ? (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-red-400 font-semibold mb-1">
                    {language === 'english' && 'Booking Unavailable'}
                    {language === 'hindi' && 'बुकिंग अनुपलब्ध'}
                    {language === 'bengali' && 'বুকিং অনুপলব্ধ'}
                  </h4>
                  <p className="text-sm text-gray-300">{blockReason}</p>
                  {doctorProfile?.phone && (
                    <a
                      href={`tel:${doctorProfile.phone}`}
                      className="inline-flex items-center gap-2 mt-3 text-emerald-400 hover:text-emerald-300 text-sm"
                    >
                      <Phone className="w-4 h-4" />
                      {language === 'english' && 'Call Clinic'}
                      {language === 'hindi' && 'क्लिनिक पर कॉल करें'}
                      {language === 'bengali' && 'ক্লিনিকে কল করুন'}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              {isBookingBlocked && blockReason && (
                <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm text-center">{blockReason}</p>
                </div>
              )}
              <Button
                onClick={onBookNow}
                disabled={!onBookNow || isBookingBlocked}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Calendar className="w-5 h-5" />
                {t('bookAppointmentNow', language)}
              </Button>
              
              {onViewHistory && (
                <Button
                  onClick={onViewHistory}
                  variant="outline"
                  className="w-full h-12 mt-3 border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center justify-center gap-2"
                >
                  <History className="w-5 h-5" />
                  {language === 'english' && 'View My Visit History'}
                  {language === 'hindi' && 'अपना विज़िट इतिहास देखें'}
                  {language === 'bengali' && 'আমার ভিজিট ইতিহাস দেখুন'}
                </Button>
              )}
            </div>
          )}

          {emergencyButtonActive && (
            <Button
              onClick={handleEmergencyCall}
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-2 mt-3 animate-pulse"
            >
              <AlertCircle className="w-5 h-5" />
              {language === 'english' && 'Emergency Consultation'}
              {language === 'hindi' && 'आपातकालीन परामर्श'}
              {language === 'bengali' && 'জরুরী পরামর্শ'}
            </Button>
          )}
        </div>

        {/* Know Your Doctor Section */}
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <h3 className="text-white text-base sm:text-lg mb-4">
            {t('knowYourDoctor', language)}
          </h3>

          {loadingProfile ? (
            <div className="text-center py-8 text-gray-400">Loading doctor profile...</div>
          ) : (
            <div className="flex gap-4">
              <Avatar className="w-16 h-16 flex-shrink-0">
                <AvatarImage
                  src={doctorProfile?.profileImage || ''}
                  alt={doctorProfile?.name || 'Doctor'}
                />
                <AvatarFallback className="bg-purple-500 text-white text-xl">
                  {doctorProfile?.name
                    ? doctorProfile.name.charAt(0).toUpperCase()
                    : 'D'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                {/* Verified Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">Verified Doctor</span>
                </div>

                {/* Info Badges */}
                <div className="space-y-2">
                  {/* Line 1: Name Badge (Bigger) */}
                  <div className="flex flex-wrap gap-2">
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                      {doctorProfile?.useDrPrefix !== false ? 'Dr. ' : ''}{doctorProfile?.name || 'Doctor Name'}
                    </div>
                  </div>

                  {/* Line 2: Degrees & Specialities */}
                  {((doctorProfile?.degrees && doctorProfile.degrees.length > 0) || 
                    (doctorProfile?.specialities && doctorProfile.specialities.length > 0)) && (
                    <div className="flex flex-wrap gap-2">
                      {/* Degree Badges */}
                      {doctorProfile?.degrees && doctorProfile.degrees.length > 0 && (
                        <>
                          {doctorProfile.degrees.map((degree: string, index: number) => (
                            <div
                              key={`degree-${index}`}
                              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg"
                            >
                              {degree}
                            </div>
                          ))}
                        </>
                      )}

                      {/* Speciality Badges */}
                      {doctorProfile?.specialities && doctorProfile.specialities.length > 0 && (
                        <>
                          {doctorProfile.specialities.map((speciality: string, index: number) => (
                            <div
                              key={`speciality-${index}`}
                              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg"
                            >
                              {speciality}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}

                  {/* Line 3: Experience Badge */}
                  {doctorProfile?.experience && (
                    <div className="flex flex-wrap gap-2">
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                        {doctorProfile.experience.toLowerCase().includes('year') || doctorProfile.experience.toLowerCase().includes('experience') 
                          ? doctorProfile.experience 
                          : `${doctorProfile.experience} Years of Experience`}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const calculatedRating =
                        allReviewsForStats.length > 0
                          ? allReviewsForStats.reduce(
                              (sum, r) => sum + r.rating,
                              0
                            ) / allReviewsForStats.length
                          : 0;
                      const isFilled = star <= Math.floor(calculatedRating);
                      return (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            isFilled
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'fill-transparent text-gray-600'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <span className="text-sm text-white">
                    {allReviewsForStats.length > 0
                      ? (
                          allReviewsForStats.reduce(
                            (sum, r) => sum + r.rating,
                            0
                          ) / allReviewsForStats.length
                        ).toFixed(1)
                      : '0.0'}
                    /5
                  </span>
                  <span className="text-sm text-gray-400">
                    {allReviewsForStats.length} {t('reviews', language)}
                  </span>
                </div>

                {doctorProfile?.bio ? (
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {doctorProfile.bio}
                  </p>
                ) : doctorProfile?.experience ? (
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {doctorProfile.experience} of experience in medical
                    practice.
                  </p>
                ) : (
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Experienced medical professional dedicated to patient care.
                  </p>
                )}

                {/* Clinic Services/Facilities Badges */}
                {doctorProfile?.clinicServices && doctorProfile.clinicServices.length > 0 && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2">
                      {doctorProfile.clinicServices.map((service: string, index: number) => {
                        const colors = [
                          'bg-gradient-to-r from-blue-500 to-blue-600',
                          'bg-gradient-to-r from-purple-500 to-purple-600',
                          'bg-gradient-to-r from-pink-500 to-pink-600',
                          'bg-gradient-to-r from-emerald-500 to-emerald-600'
                        ];
                        return (
                          <div
                            key={index}
                            className={`${colors[index % colors.length]} text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg flex items-center gap-1.5`}
                          >
                            <span className="text-white/90">✓</span>
                            <span>{service}</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Custom Service Status Label */}
                    <p className="text-sm text-emerald-400 mt-2 font-medium">
                      {doctorProfile?.clinicServicesLabel || 'Done Here'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Today's Health Tip */}
        <div className="px-4 sm:px-6 pb-6">
          <div className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-purple-500/30 rounded-2xl p-4 sm:p-5 overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-purple-400" />
              <h3 className="text-white text-base sm:text-lg">
                {language === 'english' && "Today's Health Tip"}
                {language === 'hindi' && 'आज की स्वास्थ्य सलाह'}
                {language === 'bengali' && 'আজকের স্বাস্থ্য পরামর্শ'}
              </h3>
            </div>
            <TemplateDisplay
              placement="booking-mini-website"
              className="rounded-xl max-w-full"
            />
          </div>
        </div>

        {/* Personalized Templates Section */}
        {personalizedTemplates.length > 0 && (
          <div className="px-4 sm:px-6 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white text-base sm:text-lg">
                {language === 'english' && 'Messages from Doctor'}
                {language === 'hindi' && 'डॉक्टर से संदेश'}
                {language === 'bengali' && 'ডাক্তারের বার্তা'}
              </h3>
            </div>

            <div className="space-y-4">
              {personalizedTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-gradient-to-br from-emerald-600/10 to-blue-600/10 border border-emerald-500/30 rounded-2xl p-4 sm:p-5"
                >
                  <span className="inline-block text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full mb-3 capitalize">
                    {template.category}
                  </span>

                  {/* Image Display - Support both imageUrl and image fields */}
                  {(template.imageUrl || template.image) && (
                    <div className="mb-3 rounded-lg overflow-hidden">
                      <img
                        src={template.imageUrl || template.image || ''}
                        alt={template.name}
                        className="w-full h-auto max-h-[400px] object-contain bg-gradient-to-br from-emerald-900/20 to-blue-900/20"
                      />
                    </div>
                  )}

                  <h4 className="text-white text-base sm:text-lg mb-2">
                    {template.name}
                  </h4>

                  {template.message && (
                    <p className="text-gray-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                      {template.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* E-commerce Products Section - Temporarily disabled */}
        {/* TODO: Implement products state and MiniWebsiteProductDisplay component */}

        {/* Patient Reviews Section */}
        {(() => {
          const reviewsToShow =
            firestoreReviews.length > 0 ? firestoreReviews : uploadedReviews;

          return reviewsToShow.length > 0 ? (
            <div className="px-4 sm:px-6 pb-6">
              <h3 className="text-white text-base sm:text-lg mb-4">
                {t('patientReviews', language)}
              </h3>
              <div className="space-y-4">
                {reviewsToShow.slice(0, 2).map((review, index) => (
                  <div key={review.id || index} className="w-full">
                    <ReviewCard
                      patientName={review.patientName}
                      rating={review.rating}
                      date={review.date}
                      comment={review.comment}
                      verified={review.verified}
                      doctorName={doctorProfile?.name || 'Doctor'}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })()}
      </div>

      {/* Emergency Call Confirmation Dialog */}
      <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-xl text-white flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-500" />
              {language === 'english' && 'Emergency Consultation'}
              {language === 'hindi' && 'आपातकालीन परामर्श'}
              {language === 'bengali' && 'জরুরী পরামর্শ'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {language === 'english' &&
                'You are about to call the doctor directly for an emergency consultation.'}
              {language === 'hindi' &&
                'आप आपातकालीन परामर्श के लिए डॉक्टर को सीधे कॉल करने वाले हैं।'}
              {language === 'bengali' &&
                'আপনি জরুরী পরামর্শের জন্য সরাসরি ডাক্তারকে কল করতে যাচ্ছেন।'}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 my-4">
            <div className="flex gap-3">
              <Phone className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-500 mb-2">
                  {language === 'english' && 'Emergency Contact'}
                  {language === 'hindi' && 'आपातकालीन संपर्क'}
                  {language === 'bengali' && 'জরুরি যোগাযোগ'}
                </h4>
                <p className="text-white text-xl mb-2">{emergencyPhone}</p>
                <p className="text-sm text-gray-300">
                  {language === 'english' &&
                    'Please explain your emergency clearly when the doctor answers.'}
                  {language === 'hindi' &&
                    'जब डॉक्टर उत्तर दें तो कृपया अपनी आपातस्थिति स्पष्ट रूप से समझाएं।'}
                  {language === 'bengali' &&
                    'ডাক্তার উত্তর দিলে আপনার জরুরী অবস্থা স্পষ্টভাবে ব্যাখ্যা করুন।'}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEmergencyDialog(false)}
              className="bg-transparent border-zinc-700 text-white hover:bg-zinc-800"
            >
              {language === 'english' && 'Cancel'}
              {language === 'hindi' && 'रद्द करें'}
              {language === 'bengali' && 'বাতিল'}
            </Button>
            <Button
              onClick={confirmEmergencyCall}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Phone className="w-4 h-4 mr-2" />
              {language === 'english' && 'Call Now'}
              {language === 'hindi' && 'अभी कॉल करें'}
              {language === 'bengali' && 'এখনই কল করুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BookingFlowLayout>
  );
}
