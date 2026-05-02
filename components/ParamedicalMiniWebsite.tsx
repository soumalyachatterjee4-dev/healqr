import { useState, useEffect } from 'react';
import { db } from '../lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Button } from './ui/button';
import healqrLogo from '../assets/healqr.logo.png';
import {
  Loader2, Star, Phone, MapPin, Clock, Calendar, Shield, Award,
  ArrowLeft, Stethoscope, ChevronRight, Sparkles, Heart, Megaphone, X,
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  'phlebotomist': 'Phlebotomist',
  'physiotherapist': 'Physiotherapist',
  'nurse': 'Nurse',
  'wound-dresser': 'Wound Dresser',
  'aaya': 'Aaya / Caretaker',
  'home-assistant': 'Home Health Assistant',
};

const SERVICE_LABELS: Record<string, string> = {
  'phlebotomist': 'Sample Collection',
  'physiotherapist': 'Therapy Session',
  'nurse': 'Nursing Visit',
  'wound-dresser': 'Wound Dressing',
  'aaya': 'Patient Care',
  'home-assistant': 'Home Care Visit',
};

const ROLE_COLORS: Record<string, string> = {
  'phlebotomist': 'from-teal-600 to-cyan-600',
  'physiotherapist': 'from-blue-600 to-indigo-600',
  'nurse': 'from-pink-600 to-rose-600',
  'wound-dresser': 'from-orange-600 to-amber-600',
  'aaya': 'from-purple-600 to-violet-600',
  'home-assistant': 'from-emerald-600 to-green-600',
};

interface ParamedicalMiniWebsiteProps {
  onBookNow?: () => void;
  onBack?: () => void;
}

export default function ParamedicalMiniWebsite({ onBookNow, onBack }: ParamedicalMiniWebsiteProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const paraId = sessionStorage.getItem('booking_paramedical_id');
      if (!paraId) { setLoading(false); return; }

      try {
        const snap = await getDoc(doc(db, 'paramedicals', paraId));
        if (snap.exists()) {
          setProfile({ uid: snap.id, ...snap.data() });
        } else {
          // Fallback: old phlebotomists collection
          const oldSnap = await getDoc(doc(db, 'phlebotomists', paraId));
          if (oldSnap.exists()) {
            setProfile({ uid: oldSnap.id, ...oldSnap.data() });
          }
        }
      } catch (err) { console.error('Profile load error:', err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
        <Stethoscope className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-xl font-bold mb-2">Profile Not Found</h2>
        <p className="text-gray-400 mb-6">This healthcare professional profile doesn't exist or has been removed.</p>
        {onBack && <Button variant="outline" onClick={onBack} className="border-zinc-700 text-white">Go Back</Button>}
      </div>
    );
  }

  const roleName = ROLE_LABELS[profile.role] || profile.role || 'Healthcare Professional';
  const serviceLabel = SERVICE_LABELS[profile.role] || 'Service';
  const gradientColor = ROLE_COLORS[profile.role] || 'from-teal-600 to-cyan-600';
  const schedules = profile.schedules || [];
  const activeDays = [...new Set(schedules.filter((s: any) => s.isActive).map((s: any) => s.day))];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        {onBack && (
          <button onClick={onBack} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <img src={healqrLogo} alt="HealQR" className="h-7 w-auto" />
        <div className="w-5" />
      </div>

      {/* Hero */}
      <div className={`bg-gradient-to-br ${gradientColor} p-6 pb-8`}>
        <div className="max-w-lg mx-auto text-center">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            {profile.profilePhoto ? (
              <img src={profile.profilePhoto} alt={profile.name} className="w-24 h-24 rounded-full object-cover" />
            ) : (
              <Stethoscope className="w-12 h-12 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold mb-1">{profile.name}</h1>
          <p className="text-white/80 text-sm mb-3">{roleName}</p>
          {profile.experience && (
            <p className="text-white/60 text-xs flex items-center justify-center gap-1">
              <Award className="w-3 h-3" /> {profile.experience} experience
            </p>
          )}
          {profile.verified && (
            <div className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-xs mt-3">
              <Shield className="w-3 h-3" /> Verified Professional
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 space-y-4 pb-24">
        {/* Service Badges (admin-curated, max 4) */}
        {Array.isArray(profile.serviceBadges) && profile.serviceBadges.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex flex-wrap gap-2 justify-center">
              {profile.serviceBadges.map((badge: string, idx: number) => (
                <span
                  key={idx}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-md"
                >
                  {badge}
                </span>
              ))}
            </div>
            <p className="text-center text-teal-400 text-xs mt-3 font-medium">
              {profile.serviceBadgesLabel || 'Done Here'}
            </p>
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-2">About</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Contact & Location */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          {profile.phone && (
            <a href={`tel:${profile.phone}`} className="flex items-center gap-3 text-gray-300 hover:text-teal-400 transition-colors">
              <Phone className="w-4 h-4 text-teal-500" />
              <span className="text-sm">{profile.phone}</span>
            </a>
          )}
          {profile.pincode && (
            <div className="flex items-center gap-3 text-gray-300">
              <MapPin className="w-4 h-4 text-teal-500" />
              <span className="text-sm">Service Area: {profile.pincode}{profile.state ? `, ${profile.state}` : ''}</span>
            </div>
          )}
        </div>

        {/* Available Days */}
        {activeDays.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-500" /> Available Days
            </h3>
            <div className="flex flex-wrap gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(short => {
                const full = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }[short]!;
                const isActive = activeDays.includes(full);
                return (
                  <span key={short} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isActive ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-zinc-800 text-gray-600 border border-zinc-700'}`}>
                    {short}
                  </span>
                );
              })}
            </div>
            {/* Show time slots */}
            <div className="mt-3 space-y-1">
              {schedules.filter((s: any) => s.isActive).map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{s.day}: {s.startTime} - {s.endTime}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services */}
        {profile.services?.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-3">Services Offered</h3>
            <div className="space-y-2">
              {profile.services.map((svc: any) => (
                <div key={svc.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <div>
                    <p className="text-white text-sm">{svc.name}</p>
                    {svc.duration && <p className="text-gray-500 text-xs">{svc.duration}</p>}
                  </div>
                  {svc.price > 0 && <span className="text-teal-400 font-medium text-sm">₹{svc.price}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Camps */}
        {Array.isArray(profile.healthCamps) && (() => {
          const today = new Date().toISOString().slice(0, 10);
          const upcoming = profile.healthCamps
            .filter((c: any) => c?.isActive !== false && c?.date >= today)
            .sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));
          if (upcoming.length === 0) return null;
          return (
            <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl p-5">
              <h3 className="text-orange-400 font-semibold text-sm mb-3 flex items-center gap-2">
                <Megaphone className="w-4 h-4" /> Upcoming Camps
              </h3>
              <div className="space-y-3">
                {upcoming.map((c: any) => (
                  <div key={c.id} className="bg-zinc-900/60 rounded-lg overflow-hidden">
                    {c.bannerUrl && <img src={c.bannerUrl} alt={c.title} className="w-full h-32 object-cover" />}
                    <div className="p-3">
                      <p className="text-white font-medium">{c.title}</p>
                      <p className="text-gray-400 text-xs flex items-center gap-1 mt-1"><Calendar className="w-3 h-3" /> {c.date}{c.startTime ? ` · ${c.startTime}${c.endTime ? `–${c.endTime}` : ''}` : ''}</p>
                      <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {c.location}{c.pincode ? ` · ${c.pincode}` : ''}</p>
                      {c.contactPhone && (
                        <a href={`tel:${c.contactPhone}`} className="text-orange-400 text-xs flex items-center gap-1 mt-0.5 hover:underline">
                          <Phone className="w-3 h-3" /> {c.contactPhone}
                        </a>
                      )}
                      {Array.isArray(c.services) && c.services.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {c.services.slice(0, 6).map((s: string, i: number) => (
                            <span key={i} className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                        </div>
                      )}
                      {c.description && <p className="text-gray-400 text-xs mt-2">{c.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Personalized Templates (health tip + festival wish) */}
        {Array.isArray(profile.personalizedTemplates) && profile.personalizedTemplates.filter((t: any) => t?.isActive !== false && (t?.imageUrl || t?.image)).length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" /> From your professional
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {profile.personalizedTemplates
                .filter((t: any) => t?.isActive !== false && (t?.imageUrl || t?.image))
                .map((t: any) => (
                  <div key={t.id} className="relative aspect-[4/5] rounded-lg overflow-hidden bg-zinc-800">
                    <img src={t.imageUrl || t.image} alt={t.name || ''} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2">
                      {t.category === 'festival-wish'
                        ? <span className="bg-pink-500/80 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><Heart className="w-2.5 h-2.5" /> Wish</span>
                        : <span className="bg-emerald-500/80 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> Health Tip</span>}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* QR Number badge */}
        {profile.qrNumber && (
          <div className="text-center">
            <span className="text-gray-600 text-xs">QR: {profile.qrNumber}</span>
          </div>
        )}
      </div>

      {/* Sticky Book Now */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800 p-4 z-30">
        <div className="max-w-lg mx-auto">
          <Button onClick={onBookNow}
            className={`w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r ${gradientColor} hover:opacity-90 transition-opacity`}>
            Book {serviceLabel} <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
