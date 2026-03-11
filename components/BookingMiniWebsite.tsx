import { Star, Lightbulb, Calendar, AlertCircle, Phone, Sparkles, History as HistoryIcon } from 'lucide-react';
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

// Convert slug like "general_medicine" to "General Medicine"
function formatSpecialty(slug: string): string {
  return slug
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
import ReviewCard from './ReviewCard';
import { useState, useEffect } from 'react';
import TemplateDisplay from './TemplateDisplay';
import BookingFlowLayout from './BookingFlowLayout';
import type { Language } from '../utils/translations';
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
  const [cumulativeStats, setCumulativeStats] = useState<{ averageRating: number; totalReviews: number }>({
    averageRating: 0,
    totalReviews: 0
  });

  const [emergencyButtonActive, setEmergencyButtonActive] = useState(false);
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [personalizedTemplates, setPersonalizedTemplates] = useState<Template[]>([]);
  const [emergencyScheduling, setEmergencyScheduling] = useState<any>(null);

  // Booking blocked state
  const [isBookingBlocked, setIsBookingBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  // Track QR scan and load doctor profile
  useEffect(() => {
    trackQRScan();
    loadDoctorProfile();
  }, []);

  // Periodically check emergency button schedule (every minute)
  useEffect(() => {
    if (!emergencyScheduling || !emergencyScheduling.enabled) return;

    const checkSchedule = () => {
      const bookingDoctorId = sessionStorage.getItem('booking_doctor_id');
      if (!bookingDoctorId) return;

      // Re-check if button should be active based on current time
      loadDataFromStorage();
    };

    // Check every 60 seconds
    const interval = setInterval(checkSchedule, 60000);
    return () => clearInterval(interval);
  }, [emergencyScheduling]);

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

      const { collection, addDoc, doc, updateDoc, serverTimestamp, increment } =
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

        // ✅ FETCH ALL PATIENT REVIEWS for accurate stats fallback
        try {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const reviewsRef = collection(db, 'reviews');
          const q = query(reviewsRef, where('doctorId', '==', bookingDoctorId));
          const snapshot = await getDocs(q);
          const patientReviews = snapshot.docs.map(doc => ({ ...doc.data() as any, id: doc.id }) as Review);
          allReviews.push(...patientReviews);
        } catch (error) {
          console.error('❌ Error fetching patient reviews for stats:', error);
        }


        // Load cumulative stats
        if (data.stats) {
          // Use stats field but ensure it's at least the length of what we just loaded
          const localAvg = allReviews.length > 0
            ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
            : 0;

          setCumulativeStats({
            averageRating: (data.stats.averageRating && data.stats.averageRating > 0)
              ? data.stats.averageRating
              : localAvg,
            // STRICT FORMULA: Trust the actual count of loaded reviews
            totalReviews: allReviews.length
          });
        } else {
          // Fallback calculation if stats field is missing
          const total = allReviews.length;
          const avg = total > 0 ? allReviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
          setCumulativeStats({ averageRating: avg, totalReviews: total });
        }

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
            const phone = data.emergencyPhone || '';
            setEmergencyPhone(phone);

            // Load scheduling configuration
            const scheduling = data.emergencyScheduling || null;
            setEmergencyScheduling(scheduling);

            // Check if button should be active based on schedule
            const shouldBeActive = checkEmergencyButtonSchedule(
              data.emergencyButtonActive || false,
              scheduling
            );
            setEmergencyButtonActive(shouldBeActive);
          }
        }
      }
    } catch (error) {
      console.error('Error loading emergency button status:', error);
    }

    // Note: Personalized templates are now loaded directly from Firestore in loadDoctorProfile
    // We no longer load them from localStorage to ensure patients see the correct data
  };

  // Check if emergency button should be shown based on schedule
  const checkEmergencyButtonSchedule = (buttonActive: boolean, scheduling: any): boolean => {
    // If button is not active in Firestore, don't show it
    if (!buttonActive) return false;

    // If no scheduling configured or scheduling disabled, use button state as-is
    if (!scheduling || !scheduling.enabled) return buttonActive;

    // If scheduling is enabled, check if current time is within any time slot
    const timeSlots = scheduling.timeSlots || [];
    if (timeSlots.length === 0) return false;

    const now = new Date();
    const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const slot of timeSlots) {
      if (!slot.days || !slot.days.includes(currentDay)) continue;

      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      // Handle overnight slots
      if (endMinutes < startMinutes) {
        if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
          return true;
        }
      } else {
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
          return true;
        }
      }
    }

    // Not within any time slot
    return false;
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
      doctorSpecialty={formatSpecialty(doctorProfile?.specialties?.[0] || doctorProfile?.specialities?.[0] || '')}
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
                    Booking Unavailable
                  </h4>
                  <p className="text-sm text-gray-300">{blockReason}</p>
                  {doctorProfile?.phone && (
                    <a
                      href={`tel:${doctorProfile.phone}`}
                      className="inline-flex items-center gap-2 mt-3 text-emerald-400 hover:text-emerald-300 text-sm"
                    >
                      <Phone className="w-4 h-4" />
                      Call Clinic
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
                Book Appointment Now
              </Button>

              {onViewHistory && (
                <Button
                  onClick={onViewHistory}
                  variant="outline"
                  className="w-full h-12 mt-3 border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center justify-center gap-2"
                >
                  <HistoryIcon className="w-5 h-5" />
                  View My Visit History
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
              Emergency Consultation
            </Button>
          )}
        </div>

        {/* Know Your Doctor Section */}
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <h3 className="text-white text-base sm:text-lg mb-4">
            Know Your Doctor
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

                  {/* Line 2: Degrees & Specialties */}
                  {((doctorProfile?.degrees && doctorProfile.degrees.length > 0) ||
                    (doctorProfile?.specialties && doctorProfile.specialties.length > 0) ||
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

                      {/* Specialty Badges */}
                      {(doctorProfile?.specialties || doctorProfile?.specialities) && (
                        <>
                          {(doctorProfile.specialties || doctorProfile.specialities).map((specialty: string, index: number) => (
                            <div
                              key={`specialty-${index}`}
                              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg"
                            >
                              {formatSpecialty(specialty)}
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
                      const calculatedRating = cumulativeStats.averageRating;
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
                    {cumulativeStats.averageRating.toFixed(1)}/5
                  </span>
                  <span className="text-sm text-gray-400">
                    {cumulativeStats.totalReviews} reviews
                  </span>
                </div>

                {doctorProfile?.bio ? (
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {doctorProfile.bio}
                  </p>
                ) : doctorProfile?.experience ? (
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {`${doctorProfile.experience} of experience in medical practice.`}
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
                Today's Health Tip
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
                Messages from Doctor
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
                Patient Reviews
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
              Emergency Consultation
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              You are about to call the doctor directly for an emergency consultation.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 my-4">
            <div className="flex gap-3">
              <Phone className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-500 mb-2">
                  Emergency Contact
                </h4>
                <p className="text-white text-xl mb-2">{emergencyPhone}</p>
                <p className="text-sm text-gray-300">
                  Please explain your emergency clearly when the doctor answers.
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
              Cancel
            </Button>
            <Button
              onClick={confirmEmergencyCall}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Phone className="w-4 h-4 mr-2" />
              Call Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BookingFlowLayout>
  );
}
