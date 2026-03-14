import { ArrowRight, Instagram, Facebook, Share2, Sparkles } from 'lucide-react';
import { Button } from './ui/button';

interface SocialMediaPromoBannerProps {
  onNavigate: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

export default function SocialMediaPromoBanner({ onNavigate, onDismiss, compact = false }: SocialMediaPromoBannerProps) {
  if (compact) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between h-full w-full gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
             <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-medium backdrop-blur-sm flex items-center gap-1 w-fit shrink-0">
              <Sparkles className="w-3 h-3" />
              New
            </span>
            <h3 className="text-sm sm:text-lg font-bold text-white whitespace-nowrap">Social Media Kit</h3>
          </div>
          <p className="text-emerald-50 text-xs mb-2 leading-relaxed opacity-90">
             Create branded posts for Instagram & WhatsApp.
          </p>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors">
                <Instagram className="w-3 h-3 text-pink-200" />
              </div>
              <div className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors">
                <Facebook className="w-3 h-3 text-blue-200" />
              </div>
              <div className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors">
                <Share2 className="w-3 h-3 text-emerald-200" />
              </div>
            </div>
            <span className="text-[10px] text-emerald-100/70">One-click share</span>
          </div>
        </div>

        <Button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate();
          }}
          className="relative z-50 bg-white text-emerald-600 hover:bg-emerald-50 hover:scale-105 transition-all duration-300 font-bold px-4 py-2 h-auto text-sm shadow-lg whitespace-nowrap cursor-pointer w-fit shrink-0"
        >
          Try Now
          <ArrowRight className="w-3 h-3 ml-1.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 border border-white/10 p-6 md:p-8 shadow-2xl">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/10 text-pink-200 text-xs font-medium border border-white/10 backdrop-blur-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              New Feature
            </span>
            <span className="text-white/60 text-sm">Practice Growth Tools</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
            Grow Your Practice on Social Media 🚀
          </h2>

          <p className="text-gray-300 text-base md:text-lg leading-relaxed">
             Create professional, branded posts for Instagram, Facebook, and WhatsApp in seconds.
             Engage patients and increase bookings with our new <span className="text-white font-semibold">Social Media Kit</span>.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
              <Instagram className="w-5 h-5 text-pink-400" />
            </div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
              <Facebook className="w-5 h-5 text-blue-400" />
            </div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
              <Share2 className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm text-gray-400 ml-1">One-click sharing enabled</span>
          </div>
        </div>

        <div className="flex-shrink-0">
          <Button
            onClick={onNavigate}
            className="bg-white text-purple-900 hover:bg-gray-100 hover:scale-105 transition-all duration-300 font-bold px-6 py-6 h-auto text-lg shadow-lg group"
          >
            Get Social Media Kit
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}

