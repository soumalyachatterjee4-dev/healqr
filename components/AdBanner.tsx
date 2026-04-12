import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { ExternalLink } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import type { Language } from '../utils/translations';

interface Ad {
  id: string;
  imageUrl: string;
  link?: string;
  language: Language | 'all';
  placement: 'booking_flow' | 'dashboard' | 'all';
  isActive: boolean;
  title?: string;
  clicks: number;
  impressions: number;
  // A/B Testing fields
  abTestEnabled?: boolean;
  imageUrlB?: string;
  variantAStats?: { impressions: number; clicks: number };
  variantBStats?: { impressions: number; clicks: number };
}

interface AdBannerProps {
  language?: Language;
  placement?: 'language' | 'specialty' | 'doctor_selection' | 'mini_website' | 'chamber' | 'date' | 'patient_form' | 'confirmation' | 'booking_flow';
  className?: string;
}

export default function AdBanner({ language = 'english', placement = 'booking_flow', className = '' }: AdBannerProps) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeVariant, setActiveVariant] = useState<'A' | 'B'>('A');

  useEffect(() => {
    fetchAd();
  }, [language, placement]);

  const fetchAd = async () => {
    try {
      const adsRef = collection(db, 'advertisements');

      // Query for active ads matching language or 'all'
      const q = query(
        adsRef,
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Filter ads that match language or are for 'all' languages
        const ads = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Ad))
          .filter(ad =>
            (ad.language === language || ad.language === 'all') &&
            (ad.placement === 'all' || ad.placement === 'booking_flow')
          );

        if (ads.length > 0) {
          // Randomly select one ad if multiple available
          const selectedAd = ads[Math.floor(Math.random() * ads.length)];

          // A/B Testing: pick variant randomly (50/50 split)
          const variant: 'A' | 'B' = (selectedAd.abTestEnabled && selectedAd.imageUrlB) ? (Math.random() < 0.5 ? 'A' : 'B') : 'A';
          setActiveVariant(variant);
          setAd(selectedAd);

          // Track impression (overall + per-variant)
          await trackImpression(selectedAd.id, selectedAd.abTestEnabled ? variant : undefined);
        }
      }
    } catch (error) {
      console.error('Error fetching ad:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackImpression = async (adId: string, variant?: 'A' | 'B') => {
    try {
      const adRef = doc(db, 'advertisements', adId);
      const updates: Record<string, any> = { impressions: increment(1) };
      if (variant === 'A') updates['variantAStats.impressions'] = increment(1);
      if (variant === 'B') updates['variantBStats.impressions'] = increment(1);
      await updateDoc(adRef, updates);
    } catch (error) {
      console.error('Error tracking impression:', error);
    }
  };

  const handleAdClick = async () => {
    if (!ad) return;

    try {
      // Track click (overall + per-variant)
      const adRef = doc(db, 'advertisements', ad.id);
      const updates: Record<string, any> = { clicks: increment(1) };
      if (ad.abTestEnabled) {
        if (activeVariant === 'A') updates['variantAStats.clicks'] = increment(1);
        if (activeVariant === 'B') updates['variantBStats.clicks'] = increment(1);
      }
      await updateDoc(adRef, updates);

      // Open link if provided
      if (ad.link) {
        window.open(ad.link, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  if (loading) {
    return (
      <div className={`w-full ${className}`}>
        <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-zinc-800 overflow-hidden">
          <div className="aspect-[2/1] flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading...</div>
          </div>
        </Card>
      </div>
    );
  }

  if (!ad) {
    // Default placeholder if no ad available
    return (
      <div className={`w-full ${className}`}>
        <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-zinc-800 overflow-hidden">
          <div className="aspect-[2/1] flex items-center justify-center">
            <div className="text-center p-6">
              <h3 className="text-xl font-bold text-white mb-2">HealQR - Healthcare Made Simple</h3>
              <p className="text-gray-400 text-sm">Book appointments with QR codes</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <Card
        className="bg-zinc-900 border-zinc-800 overflow-hidden cursor-pointer hover:border-emerald-500/50 transition-all group"
        onClick={handleAdClick}
      >
        <div className="relative">
          <img
            src={activeVariant === 'B' && ad.imageUrlB ? ad.imageUrlB : ad.imageUrl}
            alt={ad.title || "Health Card Advertisement"}
            className="w-full h-auto object-cover"
          />

          {ad.link && (
            <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="w-4 h-4 text-white" />
            </div>
          )}

          {/* Sponsored badge */}
          <div className="absolute bottom-2 left-2">
            <span className="text-xs bg-black/70 text-gray-300 px-2 py-1 rounded">
              Sponsored
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

