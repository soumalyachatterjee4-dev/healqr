import { useState } from 'react';
import { CheckCircle2, Mail, Building2, Phone, MapPin, CreditCard, User, ArrowRight, Loader2, X, ArrowLeft, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { auth, db } from '../lib/firebase/config';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import healQRLogo from '../assets/healqr.logo.png';

interface AdvertiserSignUpProps {
  onBack: () => void;
  onLogin: () => void;
  onSuccess: () => void;
}

export default function AdvertiserSignUp({ onBack, onLogin }: AdvertiserSignUpProps) {
  const [step, setStep] = useState<'email' | 'details'>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  
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
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!db) throw new Error('Database not available');

      // Check if email already exists
      const advRef = collection(db, 'advertisers');
      const q = query(advRef, where('email', '==', email.toLowerCase().trim()));
      const existing = await getDocs(q);

      if (!existing.empty) {
        const existingData = existing.docs[0].data();
        if (existingData.status === 'pending_verification') {
          // Resend verification link for pending accounts
          const actionCodeSettings = {
            url: `${window.location.origin}/?page=advertiser-verify`,
            handleCodeInApp: true,
          };
          await sendSignInLinkToEmail(auth!, email.toLowerCase().trim(), actionCodeSettings);
          localStorage.setItem('healqr_advertiser_email_for_signin', email.toLowerCase().trim());
          setSent(true);
          toast.success('Verification link resent to your email!');
          setLoading(false);
          return;
        }
        setError('This email is already registered. Please login instead.');
        setLoading(false);
        return;
      }

      setStep('details');
      toast.success('Email accepted! Please complete your company details.');
    } catch (err: any) {
      setError(err.message || 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) { setError('Please enter your company name'); return; }
    if (!formData.companyPhone.trim()) { setError('Please enter phone number'); return; }
    if (!formData.companyAddress.trim()) { setError('Please enter company address'); return; }
    if (!formData.gstNo.trim()) { setError('Please enter GST number'); return; }
    if (!formData.affiliatedPersonName.trim()) { setError('Please enter contact person name'); return; }

    setLoading(true);
    setError('');

    try {
      if (!db) throw new Error('Database not available');

      // Create Firestore doc with pending_verification status (no Firebase Auth user)
      await addDoc(collection(db, 'advertisers'), {
        email: email.toLowerCase().trim(),
        ...formData,
        walletBalance: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'pending_verification'
      });

      // Send verification magic link
      const actionCodeSettings = {
        url: `${window.location.origin}/?page=advertiser-verify`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth!, email.toLowerCase().trim(), actionCodeSettings);
      localStorage.setItem('healqr_advertiser_email_for_signin', email.toLowerCase().trim());

      setSent(true);
      toast.success('Verification link sent to your email!');
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
          <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[100px]" />
        </div>
        <div className="w-full max-w-md relative z-10">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden p-8 text-center">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Verify Your Email</h2>
            <p className="text-slate-400 mb-4">
              We've sent a verification link to <span className="text-emerald-400 font-medium">{email}</span>
            </p>
            <p className="text-slate-500 text-sm mb-4">
              Click the link in your email to verify your account. Once verified, your account will be reviewed and activated by our admin team.
            </p>
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mb-6">
              <p className="text-yellow-400 text-xs">
                ⚠️ After email verification, your account will be reviewed by HealQR admin. You'll be able to login once approved.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
              <Mail className="w-4 h-4" />
              <span>Check your inbox and spam folder</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="flex flex-col items-center mb-6">
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 mb-4 shadow-lg">
                <img src={healQRLogo} alt="HealQR Ads" className="h-14 w-auto" />
              </div>
              <p className="text-slate-400 text-center text-sm">
                {step === 'email' 
                  ? 'Start your advertising journey with HealQR' 
                  : 'Complete your profile to start running campaigns'}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2.5 mb-5">
              <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-emerald-400 text-xs">Secure passwordless login via email link</span>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-400 rounded-lg p-3 mb-4 text-sm">
                {error}
              </div>
            )}

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

