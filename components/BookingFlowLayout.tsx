import { ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';

interface BookingFlowLayoutProps {
  children: ReactNode;
  onBack?: () => void;
  doctorName?: string;
  doctorPhoto?: string;
  doctorDegrees?: string[];
  doctorSpecialty?: string;
  showHeader?: boolean;
  useDrPrefix?: boolean;
  themeColor?: 'emerald' | 'blue';
}

export default function BookingFlowLayout({
  children,
  onBack,
  doctorName,
  doctorPhoto,
  doctorDegrees = [],
  doctorSpecialty,
  showHeader = true,
  useDrPrefix = true,
  themeColor = 'emerald'
}: BookingFlowLayoutProps) {
  const accentColor = themeColor === 'blue' ? 'blue' : 'emerald';
  const borderColor = themeColor === 'blue' ? 'border-blue-500/30' : 'border-emerald-500/30';
  const gradientFrom = themeColor === 'blue' ? 'from-blue-500' : 'from-emerald-500';
  const gradientTo = themeColor === 'blue' ? 'to-blue-600' : 'to-emerald-600';
  const textColor = themeColor === 'blue' ? 'text-blue-400' : 'text-emerald-400';
  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col">
      {/* Fixed Header with Doctor Info */}
      {showHeader && doctorName && (
        <div className="bg-[#1a1f2e] border-b border-gray-800 sticky top-0 z-50 shadow-lg">
          <div className="max-w-md mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Back Button */}
              {onBack && (
                <button 
                  onClick={onBack}
                  className="text-white hover:bg-white/10 rounded-full p-2 transition-colors flex-shrink-0"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              
              {/* Doctor Photo */}
              {doctorPhoto ? (
                <img 
                  src={doctorPhoto} 
                  alt={doctorName} 
                  className={`w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 ${borderColor}`}
                />
              ) : (
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                  {doctorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'DR'}
                </div>
              )}
              
              {/* Doctor Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-base truncate">
                  {useDrPrefix ? 'Dr. ' : ''}{doctorName}
                </h3>
                {doctorDegrees.length > 0 && (
                  <p className="text-xs text-gray-400 truncate">
                    {doctorDegrees.join(', ')}
                  </p>
                )}
                {doctorSpecialty && (
                  <p className={`text-xs ${textColor} truncate`}>
                    {doctorSpecialty}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Back Button for when no header */}
      {!showHeader && onBack && (
        <div className="absolute top-6 left-6 z-10">
          <button 
            onClick={onBack}
            className="text-white hover:bg-white/10 rounded-full p-2 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-start justify-center min-h-full p-4 py-6">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-3 text-center text-xs text-gray-500 border-t border-gray-100">
        Powered by HealQR.com
      </div>

    </div>
  );
}

