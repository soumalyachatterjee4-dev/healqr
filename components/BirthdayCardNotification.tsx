import { X, Cake } from 'lucide-react';
import { useState, useEffect } from 'react';

interface BirthdayCardNotificationProps {
  doctorName: string;
  cardImageUrl?: string;
  deliveryTimestamp: string; // ISO timestamp when card was delivered
  onClose?: () => void;
}

export default function BirthdayCardNotification({ 
  doctorName, 
  cardImageUrl, 
  deliveryTimestamp,
  onClose 
}: BirthdayCardNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Calculate if 24 hours have passed
    const deliveryTime = new Date(deliveryTimestamp).getTime();
    const currentTime = new Date().getTime();
    const hoursPassed = (currentTime - deliveryTime) / (1000 * 60 * 60);

    // Auto-hide after 24 hours
    if (hoursPassed >= 24) {
      setIsVisible(false);
      onClose?.();
    } else {
      // Set timeout for remaining time
      const remainingTime = (24 - hoursPassed) * 60 * 60 * 1000;
      const timeout = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, remainingTime);

      return () => clearTimeout(timeout);
    }
  }, [deliveryTimestamp, onClose]);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-br from-pink-900/30 to-purple-900/30 border-2 border-pink-500/50 rounded-xl p-6 mb-6 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>

      {/* Close button */}
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-pink-500/20 p-3 rounded-full">
            <Cake className="w-6 h-6 text-pink-500" />
          </div>
          <div>
            <h3 className="text-white">🎉 Happy Birthday, Dr. {doctorName}! 🎂</h3>
            <p className="text-sm text-gray-400">Wishing you a wonderful day ahead!</p>
          </div>
        </div>

        {/* Birthday Card Image - Only show uploaded image */}
        {cardImageUrl && (
          <div className="rounded-lg overflow-hidden border border-pink-500/30 bg-black/20">
            <img 
              src={cardImageUrl} 
              alt="Birthday Card" 
              className="w-full h-auto object-contain max-h-64"
            />
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            This birthday greeting will automatically disappear after 24 hours
          </p>
        </div>
      </div>
    </div>
  );
}