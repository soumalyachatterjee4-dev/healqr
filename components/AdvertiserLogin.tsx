import { useState } from 'react';
import { ArrowLeft, Mail, Lock, ArrowRight, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { AuthService } from '../lib/firebase/auth.service';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import healQRAdsLogo from '../assets/healQRADS_LOGO.svg';

interface AdvertiserLoginProps {
  onBack: () => void;
  onSignUp: () => void;
  onSuccess: () => void;
}

export default function AdvertiserLogin({ onBack, onSignUp, onSuccess }: AdvertiserLoginProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // For Prototype: We will simulate the "Magic Link" flow by using a hardcoded password
      // or checking if the user exists.
      // In a real production app, we would use sendSignInLinkToEmail(auth, email, actionCodeSettings)
      
      // Attempt to login with the "default" password we set in SignUp
      const tempPassword = "HealQRAdsUser2025!";
      
      try {
        const userCredential = await AuthService.login(email, tempPassword);
        const user = userCredential.user;

        // Verify Advertiser Role
        const advertiserDoc = await getDoc(doc(db, 'advertisers', user.uid));
        
        if (!advertiserDoc.exists()) {
           // Fallback: Check if it's a legacy account or error
           throw new Error('Advertiser account not found. Please Sign Up.');
        }

        toast.success('Welcome back!');
        onSuccess();
      } catch (error: any) {
        // If password fails (maybe they changed it?), or user not found
        console.error("Login error:", error);
        toast.error("Login failed. Please check your email or Sign Up.");
      }

    } catch (error: any) {
      console.error('Advertiser login error:', error);
      toast.error(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <h2 className="text-xl font-semibold text-white">Advertiser Login</h2>
            <button
              onClick={onBack}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <div className="flex flex-col items-center mb-8">
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 mb-4 shadow-lg">
                <img src={healQRAdsLogo} alt="HealQR Ads" className="h-14 w-auto" />
              </div>
              <p className="text-slate-400 text-center text-sm">
                Log in to manage your campaigns and track performance
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none h-full">
                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-slate-600"
                    placeholder="company@email.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-lg shadow-lg shadow-emerald-500/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Access Dashboard</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
              <p className="text-slate-400 text-sm">
                Don't have an account?{' '}
                <button 
                  onClick={onSignUp}
                  className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline transition-colors"
                >
                  Create Account
                </button>
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <button 
            onClick={() => {
              setEmail("demo@healqr.ads");
              toast.info("Entering Developer Demo Mode...");
              setTimeout(() => {
                onSuccess();
              }, 1000);
            }}
            className="text-xs text-slate-600 font-mono hover:text-emerald-500 transition-colors cursor-pointer"
          >
            [ Developer Demo Access v2.0 ]
          </button>
        </div>
      </div>
    </div>
  );
}
