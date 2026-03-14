import { X, UserPlus, LogIn } from 'lucide-react';
import healQRAdsLogo from '../assets/healQRADS_LOGO.svg';

interface AdvertiserGatewayProps {
  onBack: () => void;
  onSignUp: () => void;
  onLogin: () => void;
}

export default function AdvertiserGateway({ onBack, onSignUp, onLogin }: AdvertiserGatewayProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <img src={healQRAdsLogo} alt="HealQR Ads" className="h-14 w-auto" />
          <button
            onClick={onBack}
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
              onClick={onSignUp}
              className="flex items-center justify-start gap-4 w-full p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all group"
            >
              <div className="p-2 bg-emerald-700/50 rounded-lg group-hover:bg-emerald-600/50 transition-colors shrink-0">
                <UserPlus className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="font-medium text-lg">Sign Up</div>
                <div className="text-xs text-emerald-100/70">Create a new advertiser account</div>
              </div>
            </button>

            <button
              onClick={onLogin}
              className="flex items-center justify-start gap-4 w-full p-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-all group border border-zinc-700"
            >
              <div className="p-2 bg-zinc-900 rounded-lg group-hover:bg-zinc-800 transition-colors shrink-0">
                <LogIn className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="font-medium text-lg">Login</div>
                <div className="text-xs text-zinc-400">Access your existing dashboard</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

