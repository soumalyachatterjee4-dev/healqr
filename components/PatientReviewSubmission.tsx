import { Star } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Input } from './ui/input';
import type { Language } from '../utils/translations';

interface PatientReviewSubmissionProps {
  language?: Language;
  onSubmit?: (review: { 
    id: number;
    patientName: string;
    rating: number; 
    comment: string; 
    date: string;
    verified: boolean;
  }) => void;
  onClose?: () => void;
}

export default function PatientReviewSubmission({
  language = 'english',
  onSubmit,
  onClose,
}: PatientReviewSubmissionProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [patientName, setPatientName] = useState('');

  const handleSubmit = () => {
    if (rating === 0) {
      alert(language === 'hindi' ? 'कृपया रेटिंग चुनें' : language === 'bengali' ? 'দয়া করে রেটিং নির্বাচন করুন' : 'Please select a rating');
      return;
    }

    if (!patientName.trim()) {
      alert(language === 'hindi' ? 'कृपया अपना नाम दर्ज करें' : language === 'bengali' ? 'দয়া করে আপনার নাম লিখুন' : 'Please enter your name');
      return;
    }

    const reviewData = {
      id: Date.now(), // Unique ID
      patientName: patientName.trim(),
      rating,
      comment: comment.trim() || (rating === 5 ? 'Excellent!' : rating >= 4 ? 'Great!' : 'Good'),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      verified: true,
    };

    if (onSubmit) {
      onSubmit(reviewData);
    }
    
    // Don't call onClose - let the parent (App.tsx) handle navigation after submit
  };

  const translations = {
    english: {
      title: 'Rate Your Experience',
      subtitle: 'How was your consultation?',
      nameLabel: 'Your Name',
      namePlaceholder: 'Enter your name',
      commentLabel: 'Add a comment (optional)',
      commentPlaceholder: 'Share your experience...',
      submit: 'Submit Review',
      cancel: 'Cancel',
    },
    hindi: {
      title: 'अपना अनुभव साझा करें',
      subtitle: 'आपका परामर्श कैसा रहा?',
      nameLabel: 'आपका नाम',
      namePlaceholder: 'अपना नाम दर्ज करें',
      commentLabel: 'टिप्पणी जोड़ें (वैकल्पिक)',
      commentPlaceholder: 'अपना अनुभव साझा करें...',
      submit: 'समीक्षा जमा करें',
      cancel: 'रद्द करें',
    },
    bengali: {
      title: 'আপনার অভিজ্ঞতা শেয়ার করুন',
      subtitle: 'আপনার পরামর্শ কেমন ছিল?',
      nameLabel: 'আপনার নাম',
      namePlaceholder: 'আপনার নাম লিখুন',
      commentLabel: 'মন্তব্য যোগ করুন (ঐচ্ছিক)',
      commentPlaceholder: 'আপনার অভিজ্ঞতা শেয়ার করুন...',
      submit: 'রিভিউ জমা দিন',
      cancel: 'বাতিল',
    },
  };

  const t = translations[language];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-500 to-cyan-400 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-gray-900 mb-2">{t.title}</h2>
          <p className="text-gray-600">{t.subtitle}</p>
        </div>

        {/* Star Rating */}
        <div className="mb-6">
          <div className="flex justify-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110 focus:outline-none"
              >
                <Star
                  className={`w-12 h-12 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-gray-600 text-sm">
              {rating === 5 ? (language === 'hindi' ? 'उत्कृष्ट!' : language === 'bengali' ? 'চমৎকার!' : 'Excellent!') :
               rating === 4 ? (language === 'hindi' ? 'बहुत अच्छा!' : language === 'bengali' ? 'খুব ভাল!' : 'Great!') :
               rating === 3 ? (language === 'hindi' ? 'अच्छा' : language === 'bengali' ? 'ভাল' : 'Good') :
               rating === 2 ? (language === 'hindi' ? 'औसत' : language === 'bengali' ? 'গড়' : 'Fair') :
               (language === 'hindi' ? 'खराब' : language === 'bengali' ? 'খারাপ' : 'Poor')}
            </p>
          )}
        </div>

        {/* Name Input */}
        <div className="mb-6">
          <Label htmlFor="name" className="text-gray-900 mb-2">
            {t.nameLabel}
          </Label>
          <Input
            id="name"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder={t.namePlaceholder}
            className="bg-white text-gray-900 border-gray-300 placeholder:text-gray-400"
          />
        </div>

        {/* Comment */}
        <div className="mb-6">
          <Label htmlFor="comment" className="text-gray-900 mb-2">
            {t.commentLabel}
          </Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t.commentPlaceholder}
            className="min-h-[100px] resize-none bg-white text-gray-900 border-gray-300 placeholder:text-gray-400"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            {t.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
          >
            {t.submit}
          </Button>
        </div>
      </div>
    </div>
  );
}
