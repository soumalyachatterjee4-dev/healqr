import { useState } from 'react';
import { X, Wrench } from 'lucide-react';
import { IS_PROTOTYPE_MODE } from '../lib/firebase/config';

export default function PrototypeModeBanner() {
  const [dismissed, setDismissed] = useState(false);

  // Only show if in prototype mode
  if (!IS_PROTOTYPE_MODE || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-orange-600 to-orange-500 text-white px-4 py-2 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Wrench className="h-5 w-5 flex-shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="font-semibold text-sm">
              🚧 PROTOTYPE MODE - Local Testing Environment
            </p>
            <p className="text-xs opacity-90">
              Firebase disconnected. All auth, FCM & translations preserved. 
              Safe to test UI changes without affecting production.
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-white hover:bg-white/20 rounded p-1 transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

