import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg transition-all animate-in slide-in-from-bottom-4 duration-300 ${
      isOffline
        ? 'bg-red-500/90 text-white backdrop-blur-sm'
        : 'bg-emerald-500/90 text-white backdrop-blur-sm'
    }`}>
      {isOffline ? (
        <><WifiOff className="w-4 h-4" /> You&apos;re offline — cached data shown</>
      ) : (
        <><Wifi className="w-4 h-4" /> Back online — syncing...</>
      )}
    </div>
  );
}
