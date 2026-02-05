import { useState } from 'react';
import { X, AlertCircle, TrendingUp, Plus, ShoppingCart, Ban, Lock } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface LowBookingCountAlertProps {
  currentPlan: 'starter' | 'growth' | 'scale' | 'pro' | 'summit'; // Current subscription plan
  remainingBookings: number; // Bookings left in current cycle
  totalBookings: number; // Total bookings in plan
  daysUntilRenewal: number; // Days until next renewal
  renewalDate: string; // e.g., "15th November"
  isSubscriptionActive: boolean; // Is subscription currently active
  vaultBookings?: number; // Top-up vault bookings available (default: 0)
  language?: 'en' | 'hi' | 'bn';
  onDismiss?: () => void;
  onTopUp?: () => void; // Only available for paid plans
  onUpgradePlan?: () => void;
}

export default function LowBookingCountAlert({
  currentPlan,
  remainingBookings,
  totalBookings,
  daysUntilRenewal,
  renewalDate,
  isSubscriptionActive,
  vaultBookings = 0,
  language = 'en',
  onDismiss,
  onTopUp,
  onUpgradePlan,
}: LowBookingCountAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  const isStarterPlan = currentPlan === 'starter';
  const isExpired = !isSubscriptionActive;
  
  // Calculate percentage remaining
  const percentageRemaining = (remainingBookings / totalBookings) * 100;
  
  // Determine urgency level
  const urgencyLevel = remainingBookings === 0 
    ? 'critical' 
    : percentageRemaining <= 10 
    ? 'high' 
    : percentageRemaining <= 25 
    ? 'medium' 
    : 'low';

  const translations = {
    en: {
      criticalTitle: '🚨 No Bookings Left!',
      highTitle: '⚠️ Very Low Booking Count',
      mediumTitle: '⚡ Low Booking Alert',
      lowTitle: '📊 Booking Usage Notice',
      
      criticalSubtitle: 'You have exhausted all bookings for this cycle',
      highSubtitle: `Only ${remainingBookings} bookings remaining!`,
      mediumSubtitle: `${remainingBookings} bookings left until ${renewalDate}`,
      lowSubtitle: `${remainingBookings} of ${totalBookings} bookings remaining`,
      
      bookingsStatus: 'Bookings Status',
      remainingLabel: 'Remaining',
      usedLabel: 'Used',
      vaultLabel: 'Vault Available',
      renewalInfo: 'Renewal Information',
      nextRenewal: 'Next Renewal',
      
      // Starter Plan Messages
      starterTitle: '🚫 Top-up Not Available on Starter Plan',
      starterDesc: 'Starter plan does not support top-up bookings. Please upgrade to a paid plan to access top-up vault and continue accepting bookings.',
      upgradeRequired: 'Upgrade Required',
      
      // Expired Subscription Messages
      expiredTitle: '🔒 Subscription Expired',
      expiredDesc: 'Your subscription has expired. All services are deactivated. Top-up bookings will NOT work without an active subscription. Please renew your subscription to continue.',
      expiredWarning: 'Top-up vault is locked until subscription is renewed',
      renewNow: 'Renew Subscription Now',
      
      // Active Subscription Messages
      topUpAvailable: '💰 Top-up Solution Available',
      topUpDesc: 'Add extra bookings to your vault instantly. These bookings never expire and work alongside your subscription.',
      topUpNow: 'Top-up Now',
      
      upgradePlan: 'Upgrade Plan',
      dismiss: 'Dismiss',
      
      // Special Commitment Notice
      specialCommitment: '📌 Special Commitment',
      followUpActive: 'Follow-up notifications will continue to be delivered even if subscription is deactivated.',
      
      // Warning Messages
      warningNoNewBookings: '⚠️ Cannot accept new patient bookings',
      warningServiceRestricted: 'All services restricted until renewal or top-up',
    },
    hi: {
      criticalTitle: '🚨 कोई बुकिंग शेष नहीं!',
      highTitle: '⚠️ बहुत कम बुकिंग बची है',
      mediumTitle: '⚡ कम बुकिंग चेतावनी',
      lowTitle: '📊 बुकिंग उपयोग सूचना',
      
      criticalSubtitle: 'आपने इस चक्र के लिए सभी बुकिंग समाप्त कर दी हैं',
      highSubtitle: `केवल ${remainingBookings} बुकिंग शेष हैं!`,
      mediumSubtitle: `${renewalDate} तक ${remainingBookings} बुकिंग बची हैं`,
      lowSubtitle: `${totalBookings} में से ${remainingBookings} बुकिंग शेष हैं`,
      
      bookingsStatus: 'बुकिंग स्थिति',
      remainingLabel: 'शेष',
      usedLabel: 'उपयोग किया गया',
      vaultLabel: 'वॉल्ट उपलब्ध',
      renewalInfo: 'नवीनीकरण जानकारी',
      nextRenewal: 'अगला नवीनीकरण',
      
      starterTitle: '🚫 स्टार्टर प्लान पर टॉप-अप उपलब्ध नहीं',
      starterDesc: 'स्टार्टर प्लान टॉप-अप बुकिंग का समर्थन नहीं करता है। टॉप-अप वॉल्ट तक पहुंचने और बुकिंग स्वीकार करना जारी रखने के लिए कृपया एक भुगतान योजना में अपग्रेड करें।',
      upgradeRequired: 'अपग्रेड आवश्यक',
      
      expiredTitle: '🔒 सदस्यता समाप्त',
      expiredDesc: 'आपकी सदस्यता समाप्त हो गई है। सभी सेवाएं निष्क्रिय हैं। सक्रिय सदस्यता के बिना टॉप-अप बुकिंग काम नहीं करेगी। जारी रखने के लिए कृपया अपनी सदस्यता नवीनीकृत करें।',
      expiredWarning: 'सदस्यता नवीनीकृत होने तक टॉप-अप वॉल्ट लॉक है',
      renewNow: 'अभी सदस्यता नवीनीकृत करें',
      
      topUpAvailable: '💰 टॉप-अप समाधान उपलब्ध',
      topUpDesc: 'अपने वॉल्ट में तुरंत अतिरिक्त बुकिंग जोड़ें। ये बुकिंग कभी समाप्त नहीं होती हैं और आपकी सदस्यता के साथ काम करती हैं।',
      topUpNow: 'अभी टॉप-अप करें',
      
      upgradePlan: 'प्लान अपग्रेड करें',
      dismiss: 'खारिज करें',
      
      specialCommitment: '📌 विशेष प्रतिबद्धता',
      followUpActive: 'सदस्यता निष्क्रिय होने पर भी फॉलो-अप सूचनाएं भेजी जाती रहेंगी।',
      
      warningNoNewBookings: '⚠️ नई रोगी बुकिंग स्वीकार नहीं कर सकते',
      warningServiceRestricted: 'नवीनीकरण या टॉप-अप तक सभी सेवाएं प्रतिबंधित',
    },
    bn: {
      criticalTitle: '🚨 কোন বুকিং বাকি নেই!',
      highTitle: '⚠️ খুব কম বুকিং আছে',
      mediumTitle: '⚡ কম বুকিং সতর্কতা',
      lowTitle: '📊 বুকিং ব্যবহার বিজ্ঞপ্তি',
      
      criticalSubtitle: 'আপনি এই চক্রের জন্য সমস্ত বুকিং শেষ করেছেন',
      highSubtitle: `মাত্র ${remainingBookings} বুকিং বাকি আছে!`,
      mediumSubtitle: `${renewalDate} পর্যন্ত ${remainingBookings} বুকিং বাকি`,
      lowSubtitle: `${totalBookings} এর মধ্যে ${remainingBookings} বুকিং বাকি`,
      
      bookingsStatus: 'বুকিং স্থিতি',
      remainingLabel: 'বাকি',
      usedLabel: 'ব্যবহৃত',
      vaultLabel: 'ভল্ট উপলব্ধ',
      renewalInfo: 'নবায়ন তথ্য',
      nextRenewal: 'পরবর্তী নবায়ন',
      
      starterTitle: '🚫 স্টার্টার প্ল্যানে টপ-আপ উপলব্ধ নয়',
      starterDesc: 'স্টার্টার প্ল্যান টপ-আপ বুকিং সমর্থন করে না। টপ-আপ ভল্ট অ্যাক্সেস করতে এবং বুকিং গ্রহণ চালিয়ে যেতে অনুগ্রহ করে একটি পেইড প্ল্যানে আপগ্রেড করুন।',
      upgradeRequired: 'আপগ্রেড প্রয়োজন',
      
      expiredTitle: '🔒 সাবস্ক্রিপশন মেয়াদ শেষ',
      expiredDesc: 'আপনার সাবস্ক্রিপশন মেয়াদ শেষ হয়েছে। সমস্ত সেবা নিষ্ক্রিয়। সক্রিয় সাবস্ক্রিপশন ছাড়া টপ-আপ বুকিং কাজ করবে না। চালিয়ে যেতে অনুগ্রহ করে আপনার সাবস্ক্রিপশন নবায়ন করুন।',
      expiredWarning: 'সাবস্ক্রিপশন নবায়ন না হওয়া পর্যন্ত টপ-আপ ভল্ট লক',
      renewNow: 'এখনই সাবস্ক্রিপশন নবায়ন করুন',
      
      topUpAvailable: '💰 টপ-আপ সমাধান উপলব্ধ',
      topUpDesc: 'আপনার ভল্টে তাৎক্ষণিকভাবে অতিরিক্ত বুকিং যোগ করুন। এই বুকিংগুলি কখনো মেয়াদ শেষ হয় না এবং আপনার সাবস্ক্রিপশনের সাথে কাজ করে।',
      topUpNow: 'এখনই টপ-আপ করুন',
      
      upgradePlan: 'প্ল্যান আপগ্রেড করুন',
      dismiss: 'বাতিল করুন',
      
      specialCommitment: '📌 বিশেষ অঙ্গীকার',
      followUpActive: 'সাবস্ক্রিপশন নিষ্ক্রিয় থাকলেও ফলো-আপ বিজ্ঞপ্তি পাঠানো হবে।',
      
      warningNoNewBookings: '⚠️ নতুন রোগী বুকিং গ্রহণ করতে পারবেন না',
      warningServiceRestricted: 'নবায়ন বা টপ-আপ পর্যন্ত সমস্ত সেবা সীমাবদ্ধ',
    },
  };

  const t = translations[language];
  
  // Select appropriate title and subtitle
  const title = urgencyLevel === 'critical' 
    ? t.criticalTitle 
    : urgencyLevel === 'high' 
    ? t.highTitle 
    : urgencyLevel === 'medium' 
    ? t.mediumTitle 
    : t.lowTitle;
    
  const subtitle = urgencyLevel === 'critical' 
    ? t.criticalSubtitle 
    : urgencyLevel === 'high' 
    ? t.highSubtitle 
    : urgencyLevel === 'medium' 
    ? t.mediumSubtitle 
    : t.lowSubtitle;

  // Determine border and background colors
  const borderColor = urgencyLevel === 'critical' 
    ? 'border-red-600/70' 
    : urgencyLevel === 'high' 
    ? 'border-orange-500/50' 
    : urgencyLevel === 'medium' 
    ? 'border-yellow-500/50' 
    : 'border-blue-500/50';
    
  const bgColor = urgencyLevel === 'critical' 
    ? 'bg-red-500/10' 
    : urgencyLevel === 'high' 
    ? 'bg-orange-500/10' 
    : urgencyLevel === 'medium' 
    ? 'bg-yellow-500/10' 
    : 'bg-blue-500/10';
    
  const iconColor = urgencyLevel === 'critical' 
    ? 'text-red-500' 
    : urgencyLevel === 'high' 
    ? 'text-orange-500' 
    : urgencyLevel === 'medium' 
    ? 'text-yellow-500' 
    : 'text-blue-500';

  return (
    <Card className={`${bgColor} border-2 ${borderColor} shadow-lg mb-4 relative overflow-hidden`}>
      {/* Animated pulse for critical urgency */}
      {urgencyLevel === 'critical' && (
        <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />
      )}

      <div className="p-6 relative">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 rounded-full ${urgencyLevel === 'critical' ? 'bg-red-500/20' : urgencyLevel === 'high' ? 'bg-orange-500/20' : urgencyLevel === 'medium' ? 'bg-yellow-500/20' : 'bg-blue-500/20'}`}>
            <AlertCircle className={`w-6 h-6 ${iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-white mb-1">{title}</h3>
            <p className="text-sm text-gray-400">{subtitle}</p>
          </div>
        </div>

        {/* Bookings Status Card */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-blue-400 mb-3">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-sm">{t.bookingsStatus}</span>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${urgencyLevel === 'critical' ? 'bg-red-500' : urgencyLevel === 'high' ? 'bg-orange-500' : urgencyLevel === 'medium' ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                style={{ width: `${percentageRemaining}%` }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">{t.remainingLabel}</p>
              <p className="text-white">{remainingBookings}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">{t.usedLabel}</p>
              <p className="text-white">{totalBookings - remainingBookings}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">{t.vaultLabel}</p>
              <p className="text-emerald-400">{vaultBookings}</p>
            </div>
          </div>
        </div>

        {/* Renewal Info */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 mb-4 flex items-center justify-between text-sm">
          <span className="text-gray-400">{t.nextRenewal}</span>
          <span className="text-white">{renewalDate} ({daysUntilRenewal} days)</span>
        </div>

        {/* RULE 2: Expired Subscription - Show locked message */}
        {isExpired && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-400 mb-2">{t.expiredTitle}</h4>
                <p className="text-sm text-gray-300 mb-2">{t.expiredDesc}</p>
                <div className="flex items-center gap-2 text-xs text-red-400">
                  <Ban className="w-4 h-4" />
                  <span>{t.expiredWarning}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RULE 1: Starter Plan - No top-up available */}
        {!isExpired && isStarterPlan && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Ban className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-orange-400 mb-2">{t.starterTitle}</h4>
                <p className="text-sm text-gray-300">{t.starterDesc}</p>
              </div>
            </div>
          </div>
        )}

        {/* Active Subscription + Paid Plan - Show top-up option */}
        {!isExpired && !isStarterPlan && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Plus className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-emerald-400 mb-2">{t.topUpAvailable}</h4>
                <p className="text-sm text-gray-300">{t.topUpDesc}</p>
              </div>
            </div>
          </div>
        )}

        {/* RULE 3: Special Commitment - Follow-up notifications continue */}
        {isExpired && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-blue-400 mb-1">{t.specialCommitment}</h4>
                <p className="text-sm text-gray-300">{t.followUpActive}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {/* Expired: Only show renew option */}
          {isExpired && (
            <Button
              onClick={onUpgradePlan}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              {t.renewNow}
            </Button>
          )}

          {/* Starter Plan: Only show upgrade */}
          {!isExpired && isStarterPlan && (
            <Button
              onClick={onUpgradePlan}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              {t.upgradeRequired}
            </Button>
          )}

          {/* Paid Plan (Active): Show both top-up and upgrade */}
          {!isExpired && !isStarterPlan && (
            <>
              <Button
                onClick={onTopUp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t.topUpNow}
              </Button>
              <Button
                onClick={onUpgradePlan}
                variant="outline"
                className="border-zinc-600 text-white hover:bg-zinc-800"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                {t.upgradePlan}
              </Button>
            </>
          )}

          <Button
            onClick={handleDismiss}
            variant="ghost"
            className="text-gray-400 hover:text-white hover:bg-zinc-800"
          >
            {t.dismiss}
          </Button>
        </div>

        {/* Critical Warning - No new bookings possible */}
        {remainingBookings === 0 && !isExpired && (
          <div className="mt-4 bg-red-500/5 border border-red-500/20 rounded p-3">
            <p className="text-xs text-red-400 flex items-center gap-2">
              <Ban className="w-3 h-3" />
              {t.warningNoNewBookings}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
