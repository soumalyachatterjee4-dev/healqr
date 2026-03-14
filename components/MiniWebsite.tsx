import { Star, Lightbulb, CheckCircle2, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useState, useEffect } from 'react';
import TemplateDisplay from './TemplateDisplay';

interface Template {
  id: string;
  name: string;
  category: 'festival' | 'camp' | 'announcement' | 'other';
  image: string | null;
  message: string;
  createdAt: string;
  uploadedToWebsite: boolean;
}

export default function MiniWebsite() {
  const [personalizedTemplates, setPersonalizedTemplates] = useState<Template[]>([]);

  // Function to load data from localStorage
  const loadDataFromStorage = () => {
    // Load personalized templates from localStorage
    const saved = localStorage.getItem('healqr_personalized_templates');
    if (saved) {
      const allTemplates = JSON.parse(saved);
      // Filter only templates that are uploaded to website (max 2)
      const uploadedTemplates = allTemplates
        .filter((t: Template) => t.uploadedToWebsite)
        .slice(0, 2);
      setPersonalizedTemplates(uploadedTemplates);
    }
  };

  // Existing effect: sync templates/products/payment from localStorage
  useEffect(() => {
    // Load data initially
    loadDataFromStorage();

    // Set up interval to refresh data every 2 seconds (to catch updates from EcommerceManager)
    const interval = setInterval(() => {
      loadDataFromStorage();
    }, 2000);

    // Listen for storage events (works across tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'healqr_personalized_templates') {
        loadDataFromStorage();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white">
      {/* Mobile-optimized container */}
      <div className="max-w-md mx-auto bg-gray-900/50 min-h-screen">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 px-6 py-8 text-center">
          <h1 className="text-white">Doctor Profile</h1>
        </div>

        {/* Know Your Doctor Section */}
        <div className="px-6 py-6 bg-gray-800/50 border-b border-gray-700">
          <h2 className="text-gray-300 mb-4">Know Your Doctor</h2>

          <div className="flex gap-4">
            {/* Avatar */}
            <Avatar className="w-16 h-16 bg-blue-600 text-white flex-shrink-0">
              <AvatarFallback className="bg-blue-600 text-white">
                AS
              </AvatarFallback>
            </Avatar>

            {/* Doctor Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white">Dr. Anika Sharma</h3>
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              </div>

              <p className="text-emerald-400 text-sm mb-1">Cardiologist</p>

              <p className="text-gray-400 text-sm mb-2">Verified, Kolkata</p>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500"
                    />
                  ))}
                </div>
                <span className="text-sm text-white">5.0/5</span>
                <span className="text-sm text-gray-400">(9 reviews)</span>
              </div>

              {/* Description */}
              <p className="text-gray-300 text-sm leading-relaxed">
                Dr. Anika Sharma is a renowned cardiologist with over 15 years
                of experience in treating complex heart conditions and providing
                compassionate care for her patients.
              </p>
            </div>
          </div>
        </div>

        {/* Health Tip Section - Dynamically managed from admin panel */}
        <div className="px-6 py-6 bg-gray-800/30 border-b border-gray-700">
          <TemplateDisplay placement="booking-mini-website" />
        </div>

        {/* E-commerce Products Section - Temporarily disabled */}
        {/* TODO: Implement products state and MiniWebsiteProductDisplay component */}

        {/* Personalized Templates Section - From Doctor's Dashboard */}
        {personalizedTemplates.length > 0 && (
          <div className="px-6 py-6 bg-gray-800/30 border-b border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h2 className="text-gray-300">Messages from Doctor</h2>
            </div>

            <div className="space-y-4">
              {personalizedTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-gradient-to-br from-emerald-600/10 to-blue-600/10 border border-emerald-500/30 rounded-lg p-4"
                >
                  {/* Category Badge */}
                  <span className="inline-block text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full mb-3 capitalize">
                    {template.category}
                  </span>

                  {/* Template Image */}
                  {template.image && (
                    <div className="mb-3 rounded-lg overflow-hidden">
                      <img
                        src={template.image}
                        alt={template.name}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}

                  {/* Template Name */}
                  <h3 className="text-white mb-2">{template.name}</h3>

                  {/* Template Message */}
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {template.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patient Reviews Section */}
        <div className="px-6 py-6 bg-gray-800/50">
          <h2 className="text-gray-300 mb-4">Patient Reviews</h2>

          {/* Review 1 */}
          <div className="mb-6">
            <div className="flex items-start gap-3 mb-2">
              <Avatar className="w-10 h-10 bg-green-600 text-white flex-shrink-0">
                <AvatarFallback className="bg-green-600 text-white">
                  AS
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white text-sm">Dr. Anika Sharma</p>
                </div>
                <p className="text-green-400 text-xs mb-2">Verified Patient</p>
                <div className="flex gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-3 h-3 fill-yellow-500 text-yellow-500"
                    />
                  ))}
                </div>
                <p className="text-gray-300 text-sm">
                  Excellent doctor, very caring and knowledgeable.
                </p>
              </div>
            </div>
          </div>

          {/* Review 2 */}
          <div className="mb-6">
            <div className="flex items-start gap-3 mb-2">
              <Avatar className="w-10 h-10 bg-orange-600 text-white flex-shrink-0">
                <AvatarFallback className="bg-orange-600 text-white">
                  AS
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white text-sm">Dr. Anika Sharma</p>
                </div>
                <p className="text-green-400 text-xs mb-2">Verified Patient</p>
                <div className="flex gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-3 h-3 fill-yellow-500 text-yellow-500"
                    />
                  ))}
                </div>
                <p className="text-gray-300 text-sm">
                  Best cardiologist! Seamless booking flow.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-6 bg-gray-900/80 border-t border-gray-700">
          <p className="text-gray-400 text-sm text-center">
            Powered by <span className="text-emerald-400">www.healqr.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}

