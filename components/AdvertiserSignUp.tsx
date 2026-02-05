import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Mail, Building2, Phone, MapPin, CreditCard, User, Briefcase, ArrowRight, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { AuthService } from '../lib/firebase/auth.service';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import healQRAdsLogo from '../assets/healQRADS_LOGO.svg';

interface AdvertiserSignUpProps {
  onBack: () => void;
  onLogin: () => void;
  onSuccess: () => void;
}

export default function AdvertiserSignUp({ onBack, onLogin, onSuccess }: AdvertiserSignUpProps) {
  const [step, setStep] = useState<'email' | 'details'>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Detailed Form State
  const [formData, setFormData] = useState({
    companyName: '',
    companyPhone: '',
    companyAddress: '',
    gstNo: '',
    bankName: '',
    bankAccountNo: '',
    bankIfsc: '',
    affiliatedPersonName: '',
    affiliatedPersonDesignation: ''
  });

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    // Simulate "Verify" / Magic Link check
    setTimeout(async () => {
      try {
        setStep('details');
        toast.success("Email verified successfully!");
      } catch (error) {
        toast.error("Verification failed");
      } finally {
        setLoading(false);
      }
    }, 1500);
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tempPassword = "HealQRAdsUser2025!"; 
      
      let user;
      try {
        const userCredential = await AuthService.signUp(email, tempPassword);
        user = userCredential.user;
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
           toast.error("Email already registered. Please Log In.");
           onLogin();
           return;
        }
        throw authError;
      }

      await setDoc(doc(db, 'advertisers', user.uid), {
        uid: user.uid,
        email: email,
        ...formData,
        walletBalance: 0,
        createdAt: new Date().toISOString(),
        status: 'pending_approval'
      });

      toast.success("Registration successful!");
      onSuccess();
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[100px]" />
      </div>

      <div className={`w-full ${step === 'details' ? 'max-w-4xl' : 'max-w-md'} relative z-10 transition-all duration-500`}>
        {/* Main Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <h2 className="text-xl font-semibold text-white">
              {step === 'email' ? 'Create Account' : 'Company Details'}
            </h2>
            <button
              onClick={step === 'details' ? () => setStep('email') : onBack}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              {step === 'details' ? <ArrowLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
          </div>

          <div className="p-6">
            <div className="flex flex-col items-center mb-8">
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 mb-4 shadow-lg">
                <img src={healQRAdsLogo} alt="HealQR Ads" className="h-14 w-auto" />
              </div>
              <p className="text-slate-400 text-center text-sm">
                {step === 'email' 
                  ? 'Start your advertising journey with HealQR' 
                  : 'Complete your profile to start running campaigns'}
              </p>
            </div>

            {step === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">Work Email</label>
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
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
                  <p className="text-slate-400 text-sm">
                    Already have an account?{' '}
                    <button 
                      type="button"
                      onClick={onLogin}
                      className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline transition-colors"
                    >
                      Log In
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleDetailsSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Company Info Section */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                      <Building2 className="w-5 h-5" /> Company Information
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Company Name</label>
                        <input
                          name="companyName"
                          value={formData.companyName}
                          onChange={handleChange}
                          className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                          placeholder="Acme Corp Pvt Ltd"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
                          <input
                            name="companyPhone"
                            value={formData.companyPhone}
                            onChange={handleChange}
                            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            placeholder="+91 98765 43210"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Address</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
                          <input
                            name="companyAddress"
                            value={formData.companyAddress}
                            onChange={handleChange}
                            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            placeholder="123 Business Park, Mumbai"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial & Contact Info */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                      <CreditCard className="w-5 h-5" /> Financial Details
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">GST Number</label>
                        <input
                          name="gstNo"
                          value={formData.gstNo}
                          onChange={handleChange}
                          className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                          placeholder="22AAAAA0000A1Z5"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">Bank Name</label>
                          <input
                            name="bankName"
                            value={formData.bankName}
                            onChange={handleChange}
                            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            placeholder="HDFC Bank"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">IFSC Code</label>
                          <input
                            name="bankIfsc"
                            value={formData.bankIfsc}
                            onChange={handleChange}
                            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                            placeholder="HDFC0001234"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2 mt-6">
                      <User className="w-5 h-5" /> Contact Person
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Name</label>
                        <input
                          name="affiliatedPersonName"
                          value={formData.affiliatedPersonName}
                          onChange={handleChange}
                          className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                          placeholder="John Doe"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Designation</label>
                        <input
                          name="affiliatedPersonDesignation"
                          value={formData.affiliatedPersonDesignation}
                          onChange={handleChange}
                          className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                          placeholder="Manager"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-zinc-800">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-8 rounded-lg shadow-lg shadow-emerald-500/20 transition-all duration-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Registration</span>
                        <CheckCircle2 className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
