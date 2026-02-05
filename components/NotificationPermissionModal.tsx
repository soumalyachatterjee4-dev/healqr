import { Bell, X } from 'lucide-react';

interface NotificationPermissionModalProps {
  onClose: () => void;
}

export default function NotificationPermissionModal({ onClose }: NotificationPermissionModalProps) {
  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-sm bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
              <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-full">
                <Bell className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            Notifications Unavailable
          </h2>
          <p className="text-gray-300 text-sm mb-6">
            Push updates are temporarily disabled while we stabilize the booking flow. We’ll bring this back once it’s fully reliable.
          </p>

          <button
            onClick={handleClose}
            className="w-full py-3 px-6 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-medium rounded-xl transition-all duration-200"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
