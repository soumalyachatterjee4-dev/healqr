import { X, UserPlus, LogIn } from 'lucide-react';
import healQRAdsLogo from '../assets/healQRADS_LOGO.svg';

interface AdvertiserGatewayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignUp: () => void;
  onLogin: () => void;
}

export default function AdvertiserGatewayModal({ open, onOpenChange, onSignUp, onLogin }: AdvertiserGatewayModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <img src={healQRAdsLogo} alt="HealQR Ads" className="h-14 w-auto" />
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-zinc-400 text-sm mb-6">
            Welcome to the Advertiser Portal. Please choose an option to continue.
          </p>

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => {
                onOpenChange(false);
                onSignUp();
              }}
              className="flex items-center justify-center gap-3 w-full p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all group"
            >
              <div className="p-2 bg-emerald-700/50 rounded-lg group-hover:bg-emerald-600/50 transition-colors">
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-medium">Sign Up</div>
                <div className="text-xs text-emerald-100/70">Create a new advertiser account</div>
              </div>
            </button>

            <button
              onClick={() => {
                onOpenChange(false);
                onLogin();
              }}
              className="flex items-center justify-center gap-3 w-full p-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-all group border border-zinc-700"
            >
              <div className="p-2 bg-zinc-900 rounded-lg group-hover:bg-zinc-800 transition-colors">
                <LogIn className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-medium">Login</div>
                <div className="text-xs text-zinc-400">Access your existing dashboard</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

