import { Phone, MapPin, Sparkles, Calendar, Users } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import { t, type Language } from '../utils/translations';

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

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-blue-200">Loading...</p>
        </div>
      </div>
    );
  }

  if (!clinicProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 border border-blue-500/20 rounded-2xl p-8 max-w-md text-center backdrop-blur-sm">
          <div className="text-6xl mb-4">🏥</div>
          <h2 className="text-2xl font-bold text-white mb-2">Clinic Not Found</h2>
          <p className="text-blue-200 mb-6">Unable to load clinic information</p>
        </div>
      </div>
    );
  }

  const { name, clinicCode, address, phone, description, specialties, linkedDoctorsDetails = [] } = clinicProfile;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(59, 130, 246) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 py-12">
          {/* Clinic Logo/Name */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-2xl shadow-blue-500/50 mb-6 transform hover:scale-105 transition-transform">
              <span className="text-4xl font-bold text-white">
                {name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'CL'}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              {name || 'Clinic'}
            </h1>
            {clinicCode && (
              <div className="inline-flex items-center gap-2 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 px-4 py-2 rounded-full">
                <Sparkles className="w-4 h-4 text-blue-300" />
                <span className="text-blue-200 font-medium">{clinicCode}</span>
              </div>
            )}
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {address && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-4 hover:bg-slate-800/70 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-blue-300 mb-1">Location</p>
                    <p className="text-sm text-white font-medium">{address}</p>
                  </div>
                </div>
              </div>
            )}
            {phone && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-4 hover:bg-slate-800/70 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-blue-300 mb-1">Contact</p>
                    <a href={`tel:${phone}`} className="text-sm text-white font-medium hover:text-blue-400">
                      {phone}
                    </a>
                  </div>
                </div>
              </div>
            )}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-4 hover:bg-slate-800/70 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-300 mb-1">Doctors</p>
                  <p className="text-sm text-white font-medium">{linkedDoctorsDetails.length} Available</p>
                </div>
              </div>
            </div>
          </div>

          {/* About Clinic */}
          {description && (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                </div>
                About Us
              </h2>
              <p className="text-blue-100 leading-relaxed">{description}</p>
            </div>
          )}

          {/* Specialties */}
          {specialties && specialties.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 mb-8">
              <h2 className="text-xl font-bold text-white mb-4">Our Specialties</h2>
              <div className="flex flex-wrap gap-2">
                {specialties.map((specialty: string, index: number) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-blue-500/20 border border-blue-400/30 rounded-full text-sm text-blue-200 font-medium"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Book Now Button */}
          <div className="flex flex-col items-center gap-4">
            <Button
              onClick={onBookNow}
              className="w-full max-w-md h-14 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white text-lg font-semibold rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/50 transition-all transform hover:scale-105"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Book Appointment Now
            </Button>
            <p className="text-blue-300 text-sm">Choose from {linkedDoctorsDetails.length} experienced doctors</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 text-center border-t border-blue-500/20">
        <p className="text-blue-300 text-sm">
          Powered by <span className="font-semibold text-blue-400">HealQR</span>
        </p>
      </div>
    </div>
  );
}
