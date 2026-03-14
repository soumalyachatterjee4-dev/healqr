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
      alert('Please select a rating');
      return;
    }

    if (!patientName.trim()) {
      alert('Please enter your name');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-500 to-cyan-400 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-gray-900 mb-2">Rate Your Experience</h2>
          <p className="text-gray-600">How was your consultation?</p>
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
              {rating === 5 ? 'Excellent!' :
               rating === 4 ? 'Great!' :
               rating === 3 ? 'Good' :
               rating === 2 ? 'Fair' :
               'Poor'}
            </p>
          )}
        </div>

        {/* Name Input */}
        <div className="mb-6">
          <Label htmlFor="name" className="text-gray-900 mb-2">
            Your Name
          </Label>
          <Input
            id="name"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Enter your name"
            className="bg-white text-gray-900 border-gray-300 placeholder:text-gray-400"
          />
        </div>

        {/* Comment */}
        <div className="mb-6">
          <Label htmlFor="comment" className="text-gray-900 mb-2">
            Add a comment (optional)
          </Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience..."
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
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
          >
            Submit Review
          </Button>
        </div>
      </div>
    </div>
  );
}

