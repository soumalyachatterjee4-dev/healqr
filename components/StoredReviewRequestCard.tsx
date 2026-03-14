import { Star, CheckCheck, AlertTriangle, BellOff, Clock } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import TemplateDisplay from './TemplateDisplay';
import type { NotificationRecord } from '../services/notificationHistoryService';
import { toast } from 'sonner';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase/config';

interface StoredReviewRequestCardProps {
  notification: NotificationRecord;
  onMarkRead?: (id: string) => void;
  onReviewSubmit?: (notificationId: string, rating: number, comment: string) => void;
}

export default function StoredReviewRequestCard({
  notification,
  onMarkRead,
  onReviewSubmit
}: StoredReviewRequestCardProps) {
  const {
    id,
    patientName,
    doctorName,
    doctorSpecialty,
    doctorInitials,
    doctorPhoto,
    templateData,
    userActions,
    readStatus,
    timestamp,
    expiresAt
  } = notification;

  const [rating, setRating] = useState(userActions?.reviewRating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState(userActions?.reviewComment || '');
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const alreadyReviewed = userActions?.reviewSubmitted || false;

  // Calculate days until expiry
  const daysUntilExpiry = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30;

  const handleCardClick = () => {
    if (!readStatus && id && onMarkRead) {
      onMarkRead(id);
    }
  };

  const handleRateClick = () => {
    if (!alreadyReviewed) {
      setShowRatingDialog(true);
    }
  };

  const handleSendReview = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!id) {
      toast.error('Invalid notification ID');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if demo mode
      const isDemoMode = id.startsWith('demo-');
      
      if (!isDemoMode) {
        // Save to Firestore only for real notifications
        await updateDoc(doc(db, 'notificationHistory', id), {
          'userActions.reviewSubmitted': true,
          'userActions.reviewRating': rating,
          'userActions.reviewComment': feedback || (rating === 5 ? 'Excellent experience!' : rating >= 4 ? 'Great service!' : 'Good consultation.'),
          'userActions.reviewedAt': serverTimestamp(),
        });
      }

      // Callback for parent component (works for both demo and real)
      if (onReviewSubmit) {
        onReviewSubmit(id, rating, feedback);
      }

      toast.success('Review submitted successfully! Thank you for your feedback.');
      setShowRatingDialog(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIgnore = () => {
    setShowRatingDialog(false);
  };

  // Handle star click
  const handleStarClick = (starIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const starWidth = rect.width;
    
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
      return <Star className="w-10 h-10 text-gray-300" />;
    } else if (fillPercentage === 1) {
      return <Star className="w-10 h-10 text-yellow-400 fill-yellow-400" />;
    } else {
      return (
        <div className="relative w-10 h-10">
          <Star className="absolute inset-0 w-10 h-10 text-gray-300" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercentage * 100}%` }}>
            <Star className="w-10 h-10 text-yellow-400 fill-yellow-400" />
          </div>
        </div>
      );
    }
  };

  return (
    <>
      <Card 
        className={`overflow-hidden cursor-pointer transition-all hover:shadow-md ${!readStatus ? 'bg-blue-50/30 border-blue-200' : 'bg-white'}`}
        onClick={handleCardClick}
      >
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide">
                    Review & Rating
                  </h3>
                  {/* Delivery Status Badge */}
                  {notification.deliveryStatus === 'permission_denied' || notification.deliveryStatus === 'no_token' || notification.deliveryStatus === 'saved_only' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium" title="Push notification not sent - you didn't allow notifications">
                      <BellOff className="w-3 h-3" />
                      Saved Only
                    </span>
                  ) : notification.deliveryStatus === 'push_failed' || notification.notificationStatus === 'failed' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium" title="Push notification failed to send">
                      <AlertTriangle className="w-3 h-3" />
                      Failed
                    </span>
                  ) : notification.deliveryStatus === 'push_sent' || notification.notificationStatus === 'delivered' || notification.notificationStatus === 'sent' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium" title="Push notification sent successfully">
                      <CheckCheck className="w-3 h-3" />
                      Sent
                    </span>
                  ) : notification.notificationStatus === 'pending' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium" title="Push notification pending">
                      <Clock className="w-3 h-3" />
                      Pending
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(timestamp).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            {!readStatus && !alreadyReviewed && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
            )}
          </div>

          {/* Doctor Info */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b">
            {doctorPhoto ? (
              <img 
                src={doctorPhoto} 
                alt={doctorName}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-semibold">
                  {doctorInitials || doctorName?.split(' ').map(n => n[0]).join('') || 'DR'}
                </span>
              </div>
            )}
            <div>
              <h4 className="text-gray-900 font-medium">{doctorName}</h4>
              {doctorSpecialty && (
                <p className="text-gray-500 text-sm">{doctorSpecialty}</p>
              )}
            </div>
          </div>

          {/* Greeting */}
          <p className="text-gray-900 font-medium mb-3">
            {templateData?.greeting || `Hello ${patientName}, 👋`}
          </p>

          {/* Message */}
          <p className="text-gray-700 text-sm mb-4 leading-relaxed whitespace-pre-line">
            {templateData?.mainMessage || `We hope you are feeling better after your visit with Dr. ${doctorName}.\n\nWould you mind sharing your experience?\nYour feedback helps us improve.`}
          </p>

          {/* Already Reviewed Message */}
          {alreadyReviewed && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <p className="text-emerald-700 font-medium">Review Submitted</p>
              </div>
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star}
                    className={`w-4 h-4 ${star <= (userActions?.reviewRating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              {userActions?.reviewComment && (
                <p className="text-gray-600 text-sm italic">"{userActions.reviewComment}"</p>
              )}
              <p className="text-gray-500 text-xs mt-2">
                Submitted {userActions?.reviewedAt ? new Date(userActions.reviewedAt).toLocaleDateString() : 'recently'}
              </p>
            </div>
          )}

          {/* Action Buttons - Only show if not reviewed */}
          {!alreadyReviewed && (
            <>
              <div className="flex gap-3 mb-4">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRateClick();
                  }}
                  variant="outline"
                  className="flex-1 border-blue-300 hover:bg-blue-50"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Rate
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleIgnore();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Ignore
                </Button>
              </div>

              {/* Feedback Textarea */}
              <Textarea
                value={feedback}
                onChange={(e) => {
                  e.stopPropagation();
                  setFeedback(e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="Share your experience... (optional)"
                className="min-h-[80px] resize-none text-sm bg-gray-50 mb-4"
              />
            </>
          )}

          {/* Ad Banner */}
          {templateData?.adBanner && (
            <TemplateDisplay 
              placement={templateData.adBanner.placement || "notif-review-request"} 
              className="mb-4" 
            />
          )}

          {/* Expiry Warning */}
          {isExpiringSoon && daysUntilExpiry && !alreadyReviewed && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
              <p className="text-orange-700 text-xs font-medium">
                ⏰ Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rating Dialog */}
      {showRatingDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={handleIgnore}
        >
          <div 
            className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-gray-900 font-semibold text-center mb-6">
              Rate Your Experience
            </h3>
            
            {/* Star Rating */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <div
                  key={star}
                  className="cursor-pointer relative"
                  onClick={(e) => handleStarClick(star, e)}
                  onMouseMove={(e) => handleStarHover(star, e)}
                  onMouseLeave={() => setHoveredRating(0)}
                >
                  {renderStar(star, hoveredRating > 0 ? hoveredRating : rating)}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleIgnore}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendReview}
                className="flex-1 bg-blue-900 hover:bg-blue-800"
                disabled={isSubmitting || rating === 0}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

