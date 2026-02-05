/**
 * VersionChecker Component
 * Shows on-screen confirmation that new AI RX Viewer is loaded
 */
import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

export const VersionChecker: React.FC = () => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Auto-hide after 5 seconds
    const timer = setTimeout(() => {
      setShow(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] animate-in slide-in-from-bottom-5">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-2xl p-4 max-w-md border-2 border-purple-400">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 flex-shrink-0 animate-pulse" />
          <div className="flex-1">
            <div className="font-bold text-xl">✅ v6.3.0 - PREVIEW AUTO-LOAD FIX!</div>
            <div className="text-sm mt-2 text-purple-100 font-semibold">
              ✅ First prescription auto-selects on open<br />
              ✅ Preview shows IMMEDIATELY - no blank screen!<br />
              🖼️ Image loads automatically when you click download
            </div>
            <div className="text-xs mt-3 bg-purple-700/50 p-2 rounded">
              Fixed workflow: Click download → Modal opens with preview loaded!<br />
              No need to manually click prescription card anymore.
            </div>
          </div>
          <button
            onClick={() => setShow(false)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
