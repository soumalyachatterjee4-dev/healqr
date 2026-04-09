import { useState, useEffect } from 'react';
import { Database, ArrowRight, X } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase/config';

interface DataExportBannerProps {
  mode: 'doctor' | 'clinic';
  onNavigate: () => void;
}

export default function DataExportBanner({ mode, onNavigate }: DataExportBannerProps) {
  const [show, setShow] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkLastDownload();
  }, []);

  const checkLastDownload = async () => {
    if (!db) return;
    const userId = auth?.currentUser?.uid;
    if (!userId) return;

    try {
      const colPath = mode === 'doctor' ? `doctors/${userId}/downloadHistory` : `clinics/${userId}/downloadHistory`;
      const q = query(collection(db, colPath), orderBy('downloadedAt', 'desc'), limit(1));
      const snap = await getDocs(q);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (snap.empty) {
        // Never downloaded — show banner
        setDaysLeft(0);
        setShow(true);
        return;
      }

      const lastDownload = snap.docs[0].data();
      const lastEndDate = lastDownload.endDate; // e.g. '2026-04-08'
      if (!lastEndDate) { setShow(true); setDaysLeft(0); return; }

      const lastEnd = new Date(lastEndDate + 'T00:00:00');
      const daysSinceLastEnd = Math.floor((today.getTime() - lastEnd.getTime()) / (1000 * 60 * 60 * 24));

      // Data expires after 30 days. Show banner when 25+ days since last export end date.
      if (daysSinceLastEnd >= 25) {
        setDaysLeft(Math.max(0, 30 - daysSinceLastEnd));
        setShow(true);
      }
    } catch {}
  };

  if (!show || dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-amber-500/15 to-emerald-500/15 border border-amber-500/30 rounded-xl p-4 mb-4">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
          <Database className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">
            {daysLeft === 0
              ? 'Download your patient data now!'
              : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left to export your data`
            }
          </p>
          <p className="text-gray-400 text-[10px] mt-0.5">
            {daysLeft === 0
              ? 'Some data may have already expired. Export now to avoid losing records.'
              : 'Data older than 30 days is auto-removed. Download to your Excel file before it expires.'
            }
          </p>
        </div>
        <button
          onClick={onNavigate}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          Export <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
