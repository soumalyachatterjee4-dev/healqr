import { Star } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Input } from './ui/input';

interface CreatePlaceholderReviewProps {
  onClose: () => void;
  onSubmit: (review: { 
    id: number;
    patientName: string;
    rating: number; 
    comment: string; 
    date: string;
    verified: boolean;
    isDoctorCreated: boolean;
  }) => void;
}

export default function CreatePlaceholderReview({ onClose, onSubmit }: CreatePlaceholderReviewProps) {
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
      alert('Please enter a name');
      return;
    }

    if (!comment.trim()) {
      alert('Please enter a comment');
      return;
    }

    const reviewData = {
      id: Date.now(),
      patientName: patientName.trim(),
      rating,
      comment: comment.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      verified: false, // Doctor-created reviews are not verified
      isDoctorCreated: true, // Mark as doctor-created placeholder
    };

    onSubmit(reviewData);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-700">
          <div className="mb-6">
            <h2 className="text-white text-2xl mb-2">Create Placeholder Review</h2>
            <p className="text-gray-400 text-sm">
              Create an initial testimonial to showcase on your Mini Website. You can replace this with real patient reviews later.
            </p>
          </div>

          {/* Star Rating */}
          <div className="mb-6">
            <Label className="text-white mb-2">Rating</Label>
            <div className="flex gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-gray-400 text-sm">
                {rating === 5 ? 'Excellent!' :
                 rating === 4 ? 'Great!' :
                 rating === 3 ? 'Good' :
                 rating === 2 ? 'Fair' : 'Poor'}
              </p>
            )}
          </div>

          {/* Name Input */}
          <div className="mb-6">
            <Label htmlFor="name" className="text-white mb-2">
              Patient Name (can be anonymous)
            </Label>
            <Input
              id="name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="e.g., Happy Patient, Satisfied User, etc."
              className="bg-gray-800 text-white border-gray-700 placeholder:text-gray-500"
            />
          </div>

          {/* Comment */}
          <div className="mb-6">
            <Label htmlFor="comment" className="text-white mb-2">
              Review Comment
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a positive testimonial about your service..."
              className="min-h-[120px] resize-none bg-gray-800 text-white border-gray-700 placeholder:text-gray-500"
            />
          </div>

          {/* Notice */}
          <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-xs">
              💡 Tip: This review will be marked as a placeholder. You can replace it with real patient reviews anytime.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white"
            >
              Create Review
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
