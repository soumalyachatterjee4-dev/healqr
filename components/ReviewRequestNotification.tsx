import { Star } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import TemplateDisplay from './TemplateDisplay';

interface ReviewRequestNotificationProps {
  language?: 'en' | 'hi' | 'bn';
  patientName?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorInitials?: string;
  consultationDate?: string;
  onSubmitReview?: (reviewData: {
    patientName: string;
    rating: number;
    comment: string;
    date: string;
  }) => void;
  onIgnore?: () => void;
}

export default function ReviewRequestNotification({
  language = 'en',
  patientName = 'Rahul Kumar',
  doctorName = 'Dr. Anika Sharma',
  doctorSpecialty = 'Cardiologist',
  doctorInitials = 'AS',
  consultationDate = 'October 10, 2025',
  onSubmitReview,
  onIgnore,
}: ReviewRequestNotificationProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showRatingDialog, setShowRatingDialog] = useState(false);

  const translations = {
    en: {
      title: 'Review & Rating',
      subtitle: 'SHARE YOUR FEEDBACK',
      greeting: `Hello ${patientName}, 👋`,
      message: `We hope you are feeling better after your visit with Dr. {{doctorName}}.\n\nWould you mind sharing your experience?\nYour feedback helps us improve.`,
      feedbackPlaceholder: 'Share your experience... (optional)',
      rate: 'Rate',
      ignore: 'Ignore',
      send: 'SEND',
      sponsoredBy: 'Sponsored by Triple',
    },
    hi: {
      title: 'समीक्षा और रेटिंग',
      subtitle: 'अपनी प्रतिक्रिया साझा करें',
      greeting: `नमस्ते ${patientName}, 👋`,
      message: `हम आशा करते हैं कि आप डॉ. {{doctorName}} से मिलने के बाद बेहतर महसूस कर रहे हैं।\n\nक्या आप अपना अनुभव साझा कर सकते हैं?\nआपकी प्रतिक्रिया हमें बेहतर बनाने में मदद करती है।`,
      feedbackPlaceholder: 'अपना अनुभव साझा करें... (वैकल्पिक)',
      rate: 'रेटिंग दें',
      ignore: 'अनदेखा करें',
      send: 'भेजें',
      sponsoredBy: 'Triple द्वारा प्रायोजित',
    },
    bn: {
      title: 'রিভিউ ও রেটিং',
      subtitle: 'আপনার মতামত শেয়ার করুন',
      greeting: `হ্যালো ${patientName}, 👋`,
      message: `আমরা আশা করি আপনি ডাঃ {{doctorName}} এর সাথে দেখা করার পর ভালো অনুভব করছেন।\n\nআপনি কি আপনার অভিজ্ঞতা শেয়ার করতে পারবেন?\nআপনার মতামত আমাদের উন্নতি করতে সাহায্য করে।`,
      feedbackPlaceholder: 'আপনার অভিজ্ঞতা শেয়ার করুন... (ঐচ্ছিক)',
      rate: 'রেটিং দিন',
      ignore: 'উপেক্ষা করুন',
      send: 'পাঠান',
      sponsoredBy: 'Triple দ্বারা স্পন্সর করা',
    },
  };

  const t = translations[language];
  const message = t.message.replace('{{doctorName}}', doctorName);

  const handleRateClick = () => {
    setShowRatingDialog(true);
  };

  const handleSendReview = () => {
    if (rating === 0) {
      alert(language === 'hi' ? 'कृपया रेटिंग चुनें' : language === 'bn' ? 'দয়া করে রেটিং নির্বাচন করুন' : 'Please select a rating');
      return;
    }

    if (onSubmitReview) {
      const reviewData = {
        patientName,
        rating,
        comment: feedback || (rating === 5 ? 'Excellent experience!' : rating >= 4 ? 'Great service!' : 'Good consultation.'),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
      onSubmitReview(reviewData);
    }

    // Reset form
    setRating(0);
    setFeedback('');
    setShowRatingDialog(false);
  };

  const handleIgnore = () => {
    if (onIgnore) {
      onIgnore();
    }
    setShowRatingDialog(false);
  };

  // Handle half-star rating (click on left or right half of star)
  const handleStarClick = (starIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const starWidth = rect.width;
    
    // If clicked on left half, give 0.5, if right half, give 1.0
    const halfStar = clickX < starWidth / 2;
    const newRating = halfStar ? starIndex - 0.5 : starIndex;
    
    setRating(newRating);
  };

  const handleStarHover = (starIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const hoverX = event.clientX - rect.left;
    const starWidth = rect.width;
    
    const halfStar = hoverX < starWidth / 2;
    const newHoveredRating = halfStar ? starIndex - 0.5 : starIndex;
    
    setHoveredRating(newHoveredRating);
  };

  // Render star with half-fill support
  const renderStar = (starIndex: number, currentRating: number) => {
    const fillPercentage = Math.max(0, Math.min(1, currentRating - (starIndex - 1)));
    
    if (fillPercentage === 0) {
      // Empty star
      return <Star className="w-12 h-12 text-gray-300" />;
    } else if (fillPercentage === 1) {
      // Full star
      return <Star className="w-12 h-12 text-yellow-400 fill-yellow-400" />;
    } else {
      // Half star
      return (
        <div className="relative w-12 h-12">
          <Star className="absolute inset-0 w-12 h-12 text-gray-300" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercentage * 100}%` }}>
            <Star className="w-12 h-12 text-yellow-400 fill-yellow-400" />
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex items-center justify-center py-8">
      {/* Phone Mockup with Black Border */}
      <div className="w-full max-w-sm">
        {/* Phone Frame */}
        <div className="bg-gray-900 rounded-3xl p-4 shadow-2xl border-8 border-gray-800">
          {/* Notification Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 text-center relative">
              <p className="text-gray-500 text-sm uppercase tracking-wide mb-1">{t.subtitle}</p>
              <div className="flex items-center justify-center gap-2">
                <Star className="w-5 h-5 text-gray-900" />
                <h2 className="text-gray-900 font-semibold">{t.title}</h2>
              </div>
            </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Doctor Profile */}
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold">{doctorInitials}</span>
            </div>
            <div>
              <h3 className="text-gray-900 font-semibold">{doctorName}</h3>
              <p className="text-gray-600 text-sm">{doctorSpecialty}</p>
            </div>
          </div>

          {/* Message */}
          <div className="mb-6">
            <p className="text-gray-900 font-medium mb-3">{t.greeting}</p>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{message}</p>
          </div>

          {/* Feedback Textarea */}
          <div className="mb-4">
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t.feedbackPlaceholder}
              className="min-h-[80px] resize-none text-sm bg-gray-50 text-gray-900 border-gray-200 placeholder:text-gray-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <Button
              onClick={handleRateClick}
              variant="outline"
              className="flex-1 border-gray-300 hover:bg-gray-50"
            >
              <Star className="w-4 h-4 mr-2" />
              {t.rate}
            </Button>
            <Button
              onClick={handleIgnore}
              variant="outline"
              className="flex-1 border-gray-300 hover:bg-gray-50"
            >
              {t.ignore}
            </Button>
            <Button
              onClick={handleSendReview}
              className="flex-1 bg-blue-900 hover:bg-blue-800 text-white"
            >
              {t.send}
            </Button>
          </div>

          {/* Health Tip Section - Admin-controlled Business Card Placement */}
          <TemplateDisplay placement="notif-review-request" className="mb-4" />

          {/* Footer */}
          <p className="text-gray-400 text-xs text-center">
            {t.sponsoredBy}
          </p>
          </div>
        </div>
      </div>
      
      {/* Rating Dialog Overlay */}
      {showRatingDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
              <h3 className="text-gray-900 font-semibold text-center mb-6">
                {language === 'hi' ? 'रेटिंग दें' : language === 'bn' ? 'রেটিং দিন' : 'Rate Your Experience'}
              </h3>
              
              {/* Star Rating */}
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <div
                    key={star}
                    onClick={(e) => handleStarClick(star, e)}
                    onMouseEnter={(e) => handleStarHover(star, e)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110 focus:outline-none"
                  >
                    {renderStar(star, hoveredRating || rating)}
                  </div>
                ))}
              </div>

              {rating > 0 && (
                <p className="text-center text-gray-600 text-sm mb-6">
                  {rating >= 4.5 ? (language === 'hi' ? 'उत्कृष्ट!' : language === 'bn' ? 'চমৎকার!' : 'Excellent!') :
                   rating >= 3.5 ? (language === 'hi' ? 'बहुत अच्छा!' : language === 'bn' ? 'খুব ভাল!' : 'Great!') :
                   rating >= 2.5 ? (language === 'hi' ? 'अच्छा' : language === 'bn' ? 'ভাল' : 'Good') :
                   rating >= 1.5 ? (language === 'hi' ? 'औसत' : language === 'bn' ? 'গড়' : 'Fair') :
                   (language === 'hi' ? 'खराब' : language === 'bn' ? 'খারাপ' : 'Poor')}
                  {' '}({rating.toFixed(1)} ⭐)
                </p>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowRatingDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  {language === 'hi' ? 'रद्द करें' : language === 'bn' ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  onClick={() => {
                    setShowRatingDialog(false);
                    // Rating is now set, user can click SEND button
                  }}
                  className="flex-1 bg-blue-900 hover:bg-blue-800"
                  disabled={rating === 0}
                >
                  {language === 'hi' ? 'जारी रखें' : language === 'bn' ? 'চালিয়ে যান' : 'Continue'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}