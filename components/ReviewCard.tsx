import { Star } from 'lucide-react';

interface ReviewCardProps {
  doctorName: string;
  patientName: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
}

export default function ReviewCard({ doctorName, patientName, rating, date, comment, verified }: ReviewCardProps) {
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`full-${i}`} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative w-6 h-6">
          <Star className="w-6 h-6 text-yellow-400 absolute" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-6 h-6 text-gray-600" />
      );
    }

    return stars;
  };

  return (
    <div 
      id="review-card" 
      className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-gray-700 flex flex-col"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-white text-2xl mb-1">PATIENT REVIEW</h2>
        <div className="w-16 h-1 bg-green-500 mx-auto"></div>
      </div>

      {/* Doctor Info */}
      <div className="mb-6">
        <p className="text-gray-400 text-sm mb-1">Doctor: {doctorName}</p>
        <p className="text-gray-400 text-sm mb-1">Patient: {patientName}</p>
        <p className="text-gray-400 text-sm mb-1">Date: {date}</p>
      </div>

      {/* Rating */}
      <div className="mb-6">
        <p className="text-gray-400 text-sm mb-2">Rating: {rating}/5 Stars</p>
        {verified && (
          <p className="text-green-400 text-sm">Verified: Yes</p>
        )}
      </div>

      {/* Stars */}
      <div className="flex justify-center gap-2 mb-6">
        {renderStars(rating)}
      </div>

      {/* Review */}
      <div className="mb-6 flex-1">
        <p className="text-gray-400 text-sm mb-2">Review:</p>
        <p className="text-white leading-relaxed">{comment}</p>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-700 pt-4 text-center">
        <p className="text-gray-500 text-xs">---</p>
        <p className="text-gray-400 text-sm">Downloaded from HealQR.com</p>
      </div>
    </div>
  );
}

