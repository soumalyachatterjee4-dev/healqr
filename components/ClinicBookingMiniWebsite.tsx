import { Lightbulb, Calendar, Phone, Sparkles, MapPin, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useState, useEffect } from 'react';
import { t, type Language } from '../utils/translations';
import TemplateDisplay from './TemplateDisplay';
import BookingFlowLayout from './BookingFlowLayout';

interface ClinicBookingMiniWebsiteProps {
  onBookNow?: () => void;
  onBack?: () => void;
  language?: Language;
}

export default function ClinicBookingMiniWebsite({
  onBookNow,
  onBack,
  language = 'english',
}: ClinicBookingMiniWebsiteProps) {
  const [clinicProfile, setClinicProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    trackQRScan();
    loadClinicProfile();
  }, []);

  // Track QR scan for analytics
  const trackQRScan = async () => {
    try {
      const bookingClinicId = sessionStorage.getItem('booking_clinic_id');
      if (!bookingClinicId) return;

      const scanTracked = sessionStorage.getItem('clinic_qr_scan_tracked');
      if (scanTracked) return;

      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { collection, addDoc, doc, updateDoc, serverTimestamp, increment } =
        await import('firebase/firestore');

      await addDoc(collection(db, 'clinic_qr_scans'), {
        clinicId: bookingClinicId,
        scannedAt: serverTimestamp(),
        userAgent: navigator.userAgent,
        referrer: document.referrer || 'direct',
      });

      const clinicRef = doc(db, 'clinics', bookingClinicId);
      await updateDoc(clinicRef, {
        totalQRScans: increment(1),
        lastScanAt: serverTimestamp(),
      });

      sessionStorage.setItem('clinic_qr_scan_tracked', 'true');
    } catch (error) {
      console.error('Error tracking clinic QR scan:', error);
    }
  };

  const loadClinicProfile = async () => {
    try {
      const bookingClinicId = sessionStorage.getItem('booking_clinic_id');
      if (!bookingClinicId) {
        setLoadingProfile(false);
        return;
      }

      const { db } = await import('../lib/firebase/config');
      if (!db) return;
      
      const { doc, getDoc } = await import('firebase/firestore');

      const clinicRef = doc(db, 'clinics', bookingClinicId);
      const clinicSnap = await getDoc(clinicRef);

      if (clinicSnap.exists()) {
        setClinicProfile({ id: clinicSnap.id, ...clinicSnap.data() });
      }
    } catch (error) {
      console.error('Error loading clinic profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  return (
    <BookingFlowLayout
      onBack={onBack}
      doctorName={clinicProfile?.name}
      doctorPhoto={clinicProfile?.logoUrl}
      useDrPrefix={false}
      themeColor="blue"
    >
      <div className="bg-[#1a1f2e] rounded-2xl shadow-xl overflow-hidden max-w-full">
        {/* Book Now Button Section */}
        <div className="bg-gradient-to-br from-gray-700 to-gray-800 px-4 sm:px-6 py-4 sm:py-6">
          <Button
            onClick={onBookNow}
            disabled={!onBookNow}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calendar className="w-5 h-5" />
            {t('bookAppointmentNow', language)}
          </Button>
        </div>

        {/* Know Your Clinic Section */}
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <h3 className="text-white text-base sm:text-lg mb-4">
            {language === 'english' && 'About Our Clinic'}
            {language === 'hindi' && 'हमारे क्लिनिक के बारे में'}
            {language === 'bengali' && 'আমাদের ক্লিনিক সম্পর্কে'}
            {language === 'marathi' && 'आमच्या क्लिनिकबद्दल'}
          </h3>

          {loadingProfile ? (
            <div className="text-center py-8 text-gray-400">
              {language === 'english' && 'Loading clinic profile...'}
              {language === 'hindi' && 'क्लिनिक प्रोफाइल लोड हो रहा है...'}
              {language === 'bengali' && 'ক্লিনিক প্রোফাইল লোড হচ্ছে...'}
            </div>
          ) : (
            <div className="flex gap-4">
              <Avatar className="w-16 h-16 flex-shrink-0">
                <AvatarImage
                  src={clinicProfile?.logoUrl || ''}
                  alt={clinicProfile?.name || 'Clinic'}
                />
                <AvatarFallback className="bg-blue-500 text-white text-xl">
                  {clinicProfile?.name
                    ? clinicProfile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                    : 'CL'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                {/* Verified Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
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
                  <span className="text-xs text-blue-400 font-medium">
                    {language === 'english' && 'Verified Clinic'}
                    {language === 'hindi' && 'सत्यापित क्लिनिक'}
                    {language === 'bengali' && 'যাচাইকৃত ক্লিনিক'}
                  </span>
                </div>

                {/* Info Badges */}
                <div className="space-y-2">
                  {/* Line 1: Clinic Name Badge (Bigger) */}
                  <div className="flex flex-wrap gap-2">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                      {clinicProfile?.name || 'Clinic Name'}
                    </div>
                  </div>

                  {/* Line 2: Clinic Code & Specialties */}
                  <div className="flex flex-wrap gap-2">
                    {/* Clinic Code Badge */}
                    {clinicProfile?.clinicCode && (
                      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                        {clinicProfile.clinicCode}
                      </div>
                    )}

                    {/* Specialty Badges */}
                    {clinicProfile?.specialties && clinicProfile.specialties.length > 0 && (
                      <>
                        {clinicProfile.specialties.slice(0, 3).map((specialty: string, index: number) => (
                          <div
                            key={`specialty-${index}`}
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg"
                          >
                            {specialty}
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {/* Line 3: Doctors Count */}
                  {clinicProfile?.linkedDoctorsDetails && clinicProfile.linkedDoctorsDetails.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {clinicProfile.linkedDoctorsDetails.length} {language === 'english' ? 'Doctors' : language === 'hindi' ? 'डॉक्टर' : 'ডাক্তার'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {clinicProfile?.description ? (
                  <p className="text-sm text-gray-300 leading-relaxed mt-3">
                    {clinicProfile.description}
                  </p>
                ) : (
                  <p className="text-sm text-gray-300 leading-relaxed mt-3">
                    {language === 'english' && 'Quality healthcare services with experienced medical professionals.'}
                    {language === 'hindi' && 'अनुभवी चिकित्सा पेशेवरों के साथ गुणवत्तापूर्ण स्वास्थ्य सेवाएं।'}
                    {language === 'bengali' && 'অভিজ্ঞ চিকিৎসা পেশাদারদের সাথে মানসম্মত স্বাস্থ্যসেবা সেবা।'}
                  </p>
                )}

                {/* Contact & Location Info */}
                <div className="mt-3 space-y-2">
                  {clinicProfile?.phone && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <Phone className="w-3 h-3 text-blue-400" />
                      </div>
                      <a
                        href={`tel:${clinicProfile.phone}`}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        {clinicProfile.phone}
                      </a>
                    </div>
                  )}
                  {clinicProfile?.address && (
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3 h-3 text-blue-400" />
                      </div>
                      <p className="text-sm text-gray-300 flex-1">
                        {clinicProfile.address}
                      </p>
                    </div>
                  )}
                </div>

                {/* Facilities/Services Badges */}
                {clinicProfile?.facilities && clinicProfile.facilities.length > 0 && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2">
                      {clinicProfile.facilities.map((facility: string, index: number) => {
                        const colors = [
                          'bg-gradient-to-r from-blue-500 to-blue-600',
                          'bg-gradient-to-r from-purple-500 to-purple-600',
                          'bg-gradient-to-r from-pink-500 to-pink-600',
                          'bg-gradient-to-r from-cyan-500 to-cyan-600'
                        ];
                        return (
                          <div
                            key={index}
                            className={`${colors[index % colors.length]} text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg flex items-center gap-1.5`}
                          >
                            <span className="text-white/90">✓</span>
                            <span>{facility}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-sm text-blue-400 mt-2 font-medium">
                      {language === 'english' && 'Available at Clinic'}
                      {language === 'hindi' && 'क्लिनिक में उपलब्ध'}
                      {language === 'bengali' && 'ক্লিনিকে উপলব্ধ'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Today's Health Tip */}
        <div className="px-4 sm:px-6 pb-6">
          <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-2xl p-4 sm:p-5 overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-blue-400" />
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

        {/* Messages from Clinic Section - if personalized templates exist */}
        {clinicProfile?.personalizedTemplates && clinicProfile.personalizedTemplates.length > 0 && (
          <div className="px-4 sm:px-6 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h3 className="text-white text-base sm:text-lg">
                {language === 'english' && 'Messages from Clinic'}
                {language === 'hindi' && 'क्लिनिक से संदेश'}
                {language === 'bengali' && 'ক্লিনিক থেকে বার্তা'}
              </h3>
            </div>

            <div className="space-y-4">
              {clinicProfile.personalizedTemplates.map((template: any) => (
                <div
                  key={template.id}
                  className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-2xl p-4 sm:p-5"
                >
                  <span className="inline-block text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full mb-3 capitalize">
                    {template.category}
                  </span>

                  {(template.imageUrl || template.image) && (
                    <div className="mb-3 rounded-lg overflow-hidden">
                      <img
                        src={template.imageUrl || template.image || ''}
                        alt={template.name}
                        className="w-full h-auto max-h-[400px] object-contain bg-gradient-to-br from-blue-900/20 to-purple-900/20"
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
      </div>
    </BookingFlowLayout>
  );
}
