import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase/config';

interface HealthTip {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  isPublished: boolean;
}

export default function HealthTipBanner() {
  const [tip, setTip] = useState<HealthTip | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!db) return;
      try {
        const snap = await getDoc(doc(db, 'adminProfiles', 'super_admin'));
        if (!snap.exists()) return;
        const templates = snap.data().globalTemplates || [];
        const tips = templates.filter(
          (t: any) => t.category === 'health-tip' && t.isPublished
        );
        if (tips.length > 0) {
          // Pick a random published health tip
          setTip(tips[Math.floor(Math.random() * tips.length)]);
        }
      } catch (err) {
        console.error('HealthTip load error:', err);
      }
    };
    load();
  }, []);

  if (!tip) return null;

  return (
    <div className="w-full rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/50">
      {tip.imageUrl ? (
        <img
          src={tip.imageUrl}
          alt={tip.name}
          className="w-full h-auto object-contain"
        />
      ) : (
        <div className="p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-rose-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Heart className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium">{tip.name}</p>
            {tip.description && (
              <p className="text-gray-400 text-xs mt-1 line-clamp-2">{tip.description}</p>
            )}
          </div>
        </div>
      )}
      <div className="px-3 py-1.5 flex items-center justify-between bg-zinc-900/80">
        <span className="text-[9px] text-gray-600">Health Tip</span>
        <Heart className="w-3 h-3 text-rose-400/40" />
      </div>
    </div>
  );
}
