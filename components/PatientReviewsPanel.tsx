import { useState } from 'react';
import { X, Upload, Star, Eye, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import ReviewCard from './ReviewCard';
import { toast } from 'sonner';

interface Review {
  id: number;
  patientName: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
  isDoctorCreated?: boolean; // New field to track placeholder reviews
}

interface PatientReviewsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  doctorName?: string;
  incomingReviews?: Review[]; // Patient-submitted reviews
  selfCreatedReviews?: Review[]; // Doctor-created reviews
  uploadedReviews?: Review[]; // Published on mini website (max 2)
  onUploadReview?: (review: Review) => void;
  onDeleteReview?: (reviewId: number, source: 'incoming' | 'selfCreated' | 'uploaded') => void;
  onViewPreview?: () => void;
  onCreatePlaceholder?: () => void;
  doctorStats?: {
    averageRating: number;
    totalReviews: number;
  };
}

export default function PatientReviewsPanel({ isOpen, onClose, doctorName = 'Dr. Doctor', incomingReviews = [], selfCreatedReviews = [], uploadedReviews = [], onUploadReview, onDeleteReview, onViewPreview, onCreatePlaceholder, doctorStats }: PatientReviewsPanelProps) {
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'incoming' | 'selfCreated' | 'uploaded'>('incoming');

  // Review Limits
  const totalUploadedLimit = 2; // Strict limit for publishing to Mini Website

  // Use doctorStats from props if available, otherwise calculate locally
  // We sum only incoming and selfCreated reviews as they now persist even when uploaded
  const localTotal = incomingReviews.length + selfCreatedReviews.length;
  const totalReviews = Math.max(doctorStats?.totalReviews || 0, localTotal);

  // Calculate average rating with fallback to local calculation if Firestore stats are zero
  const localAllReviews = [...incomingReviews, ...selfCreatedReviews];
  const localAvg = localAllReviews.length > 0
    ? localAllReviews.reduce((sum, r) => sum + r.rating, 0) / localAllReviews.length
    : 0;
  const averageRating = (doctorStats?.averageRating && doctorStats.averageRating > 0)
    ? doctorStats.averageRating
    : localAvg;

  const handleUpload = (review: Review) => {
    // Check total publishing limit
    if (uploadedReviews.length >= totalUploadedLimit) {
      toast.error(`Maximum ${totalUploadedLimit} reviews allowed on Mini Website`, {
        description: 'Please remove an existing review first',
        duration: 3000,
      });
      return;
    }

    if (onUploadReview) {
      setUploadingId(review.id);
      onUploadReview(review);
      setTimeout(() => {
        setUploadingId(null);
        toast.success('✅ Review is now LIVE on your Mini Website!', {
          description: `${review.patientName}'s review is now visible to all patients`,
          duration: 4000,
        });
      }, 500);
    }
  };

  const handleDelete = (reviewId: number, source: 'incoming' | 'selfCreated' | 'uploaded') => {
    if (onDeleteReview) {
      onDeleteReview(reviewId, source);
      const sourceText = source === 'uploaded' ? 'Mini Website' : source === 'selfCreated' ? 'Self-Created list' : 'Incoming list';
      toast.success('Review deleted', {
        description: `Review removed from ${sourceText}`,
        duration: 2000,
      });
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`full-${i}`} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative w-5 h-5">
          <Star className="w-5 h-5 text-yellow-400 absolute" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-5 h-5 text-gray-600" />
      );
    }

    return stars;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-gray-900 z-50 shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-2xl">Patient Reviews</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
          {uploadedReviews.length > 0 && onViewPreview && (
            <Button
              onClick={() => {
                onViewPreview();
                onClose();
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Live on Mini Website Preview
            </Button>
          )}
        </div>

        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex">{renderStars(averageRating)}</div>
            <span className="text-white text-xl">{averageRating.toFixed(1)}/5</span>
            <span className="text-green-400">{totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}</span>
          </div>
          <p className="text-gray-500 text-xs mt-2">Total reviews (Patient + Self-Created)</p>
        </div>

        <div className="border-b border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('incoming')}
              className={`flex-1 px-2 sm:px-4 py-3 text-xs sm:text-base transition-colors ${
                activeTab === 'incoming'
                  ? 'text-white bg-gray-800 border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span className="hidden sm:inline">Patient Reviews</span>
              <span className="sm:hidden">Patient</span>
              <span className="ml-1">({incomingReviews.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('selfCreated')}
              className={`flex-1 px-2 sm:px-4 py-3 text-xs sm:text-base transition-colors ${
                activeTab === 'selfCreated'
                  ? 'text-white bg-gray-800 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span className="hidden sm:inline">Self-Created</span>
              <span className="sm:hidden">Self</span>
              <span className="ml-1">({selfCreatedReviews.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('uploaded')}
              className={`flex-1 px-2 sm:px-4 py-3 text-xs sm:text-base transition-colors ${
                activeTab === 'uploaded'
                  ? 'text-white bg-gray-800 border-b-2 border-green-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span className="hidden sm:inline">Published</span>
              <span className="sm:hidden">Live</span>
              <span className="ml-1">({uploadedReviews.length}/{totalUploadedLimit})</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {activeTab === 'incoming' && (
            <>
              {incomingReviews.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-2">No patient reviews yet</p>
                  <p className="text-gray-500 text-sm">
                    Patient reviews will appear here after they submit their feedback
                  </p>
                </div>
              ) : (
                incomingReviews.map((review) => (
                  <Card key={review.id} className="bg-gray-800 border-gray-700 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-white break-words">{review.patientName}</h3>
                          {review.verified && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded whitespace-nowrap">
                              Verified
                            </span>
                          )}
                          {review.isDoctorCreated && (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded whitespace-nowrap">
                              Self-Created
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">{renderStars(review.rating)}</div>
                          <span className="text-white">{review.rating}/5</span>
                        </div>
                        <p className="text-gray-400 text-sm">{review.date}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          onClick={() => handleUpload(review)}
                          disabled={uploadingId === review.id || uploadedReviews.length >= totalUploadedLimit}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          size="sm"
                          title={uploadedReviews.length >= totalUploadedLimit ? `Maximum ${totalUploadedLimit} reviews reached.` : 'Upload to Mini Website'}
                        >
                          <Upload className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                          <span className="hidden sm:inline">
                            {uploadingId === review.id ? 'Uploading...' : uploadedReviews.length >= totalUploadedLimit ? `Full (${totalUploadedLimit}/${totalUploadedLimit})` : 'Upload'}
                          </span>
                        </Button>
                        <Button
                          onClick={() => handleDelete(review.id, 'incoming')}
                          variant="outline"
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          size="sm"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm break-words">{review.comment}</p>
                  </Card>
                ))
              )}
            </>
          )}

          {activeTab === 'selfCreated' && (
            <>
              {selfCreatedReviews.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-2">No self-created reviews yet</p>
                  <p className="text-gray-500 text-sm">
                    Create placeholder reviews to showcase on your Mini Website
                  </p>
                </div>
              ) : (
                selfCreatedReviews.map((review) => (
                  <Card key={review.id} className="bg-purple-900/20 border-purple-700/50 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-white break-words">{review.patientName}</h3>
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded whitespace-nowrap">
                            Self-Created
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">{renderStars(review.rating)}</div>
                          <span className="text-white">{review.rating}/5</span>
                        </div>
                        <p className="text-gray-400 text-sm">{review.date}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          onClick={() => handleUpload(review)}
                          disabled={uploadingId === review.id || uploadedReviews.length >= totalUploadedLimit}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          size="sm"
                          title={uploadedReviews.length >= totalUploadedLimit ? `Maximum ${totalUploadedLimit} reviews reached.` : 'Upload to Mini Website'}
                        >
                          <Upload className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                          <span className="hidden sm:inline">
                            {uploadingId === review.id
                              ? 'Uploading...'
                              : uploadedReviews.length >= totalUploadedLimit
                              ? `Full (${totalUploadedLimit}/${totalUploadedLimit})`
                              : 'Upload'}
                          </span>
                        </Button>
                        <Button
                          onClick={() => handleDelete(review.id, 'selfCreated')}
                          variant="outline"
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          size="sm"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm break-words">{review.comment}</p>
                  </Card>
                ))
              )}

              {onCreatePlaceholder && (
                <div className="pt-4 mt-4 border-t border-gray-700/50">
                  <Button
                    onClick={onCreatePlaceholder}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="text-sm sm:text-base">Create Self Review</span>
                  </Button>
                  <p className="text-gray-500 text-xs mt-2 text-center">
                    Create a placeholder review to showcase on your website
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'uploaded' && (
            <>
              {uploadedReviews.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-2">No reviews published yet</p>
                  <p className="text-gray-500 text-sm">
                    Upload reviews from the Incoming tab to display them on your Mini Website
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <h3 className="text-green-400 text-sm sm:text-base">Live on Mini Website</h3>
                  </div>
                  <div className="space-y-4">
                    {uploadedReviews.map((review, index) => (
                      <Card key={review.id} className="bg-green-900/20 border-green-700/50 p-4 sm:p-6">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="px-2 py-1 bg-green-600 text-white text-xs rounded whitespace-nowrap">
                                Slot {index + 1}/{totalUploadedLimit}
                              </span>
                              <h3 className="text-white break-words">{review.patientName}</h3>
                              {review.isDoctorCreated && (
                                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded whitespace-nowrap">
                                  Self-Created
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex">{renderStars(review.rating)}</div>
                              <span className="text-white">{review.rating}/5</span>
                            </div>
                            <p className="text-gray-400 text-sm">{review.date}</p>
                          </div>
                          <Button
                            onClick={() => handleDelete(review.id, 'uploaded')}
                            variant="outline"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10 shrink-0"
                            size="sm"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                        <p className="text-gray-300 text-sm break-words">{review.comment}</p>
                      </Card>
                    ))}
                  </div>
                  {uploadedReviews.length < totalUploadedLimit && (
                    <p className="text-gray-500 text-sm mt-4 text-center">
                      {totalUploadedLimit - uploadedReviews.length} more slot{uploadedReviews.length === totalUploadedLimit - 1 ? '' : 's'} available
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

