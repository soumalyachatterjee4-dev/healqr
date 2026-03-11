import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Video, User, AlertCircle, Star, Grid3x3, Smartphone, Clock, FileText, CheckCircle, TrendingUp, Bell, Users, Layout, ShoppingCart, Building2, MessageSquare, MonitorPlay, ShoppingBag, ScanLine, Twitter, Linkedin, Facebook, ArrowLeft, Sparkles } from 'lucide-react';
import { collection, query, where, getDocs, getCountFromServer, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import LandingSupportModal from './LandingSupportModal';
import AdvertiserGatewayModal from './AdvertiserGatewayModal';
import DashboardPromoDisplay from './DashboardPromoDisplay';
import healqrLogo from '../assets/healqr-logo.png';
import doctorsHeroImage from '../assets/healqr-hero.png';

interface DoctorTestimonial {
  id: number;
  doctor: string;
  patient: string;
  rating: number;
  comment: string;
  date: string;
  specialty?: string;
}

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin?: () => void;
  onVideoLibrary?: () => void;
  onPrivacyPolicy?: () => void;
  onTermsOfService?: () => void;
  onRefundPolicy?: () => void;
  onAdminLogin?: () => void;
  onTestTemplateUploader?: () => void;
  isDemoMode?: boolean;
  onBackToAdmin?: () => void;
  uploadedTestimonials?: DoctorTestimonial[];
  onAdvertiserSignUp?: () => void;
  onAdvertiserLogin?: () => void;
  onAdvertiserGateway?: () => void;
  onPharmaLogin?: () => void;
}

export default function LandingPage({
  onGetStarted,
  onLogin,
  onVideoLibrary,
  onPrivacyPolicy,
  onTermsOfService,
  onRefundPolicy,
  onAdminLogin,
  onTestTemplateUploader,
  isDemoMode,
  onBackToAdmin,
  uploadedTestimonials = [],
  onAdvertiserSignUp,
  onAdvertiserLogin,
  onAdvertiserGateway,
  onPharmaLogin
}: LandingPageProps) {
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showAdvertiserModal, setShowAdvertiserModal] = useState(false);
  const [showDoctorOptions, setShowDoctorOptions] = useState(false);
  const [showClinicOptions, setShowClinicOptions] = useState(false);
  const [showAdvertiserOptions, setShowAdvertiserOptions] = useState(false);
  const [showPatientOptions, setShowPatientOptions] = useState(false);
  const [showPharmaOptions, setShowPharmaOptions] = useState(false);

  // Real-time stats
  const [stats, setStats] = useState({
    doctorsCount: 0,
    clinicsCount: 0,
    monthlyBookings: 0,
    averageRating: 0
  });

  // Default testimonials if none uploaded
  const defaultTestimonials: DoctorTestimonial[] = [
    {
      id: 1001,
      doctor: 'Dr. John Doe',
      specialty: 'General Physician',
      patient: 'Rahul K',
      rating: 5,
      comment: 'HealQR has revolutionized my clinic. Patients love the easy booking system, and I\'ve seen a significant reduction in no-shows.',
      date: '2024-10-15'
    },
    {
      id: 1002,
      doctor: 'Dr. Anika Sharma',
      specialty: 'Cardiologist',
      patient: 'Priya S.',
      rating: 5,
      comment: 'The best part is not needing a separate app. My elderly patients find it incredibly simple to use. The analytics are a great bonus!',
      date: '2024-10-14'
    },
    {
      id: 1003,
      doctor: 'Dr. Raj Patel',
      specialty: 'Pediatrician',
      patient: 'Amit Shah',
      rating: 5,
      comment: 'The platform is incredibly intuitive. It has saved my staff so much time on the phone. Highly recommended for any modern practice.',
      date: '2024-10-13'
    }
  ];

  // Use uploaded testimonials if available (max 3), otherwise use defaults
  const displayTestimonials = uploadedTestimonials.length > 0
    ? uploadedTestimonials.slice(0, 3)
    : defaultTestimonials;

  // Fetch real-time stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Count doctors from 'doctors' collection
        const doctorsSnapshot = await getCountFromServer(collection(db, 'doctors'));
        const doctorsCount = doctorsSnapshot.data().count;

        // Count clinics from 'clinics' collection
        const clinicsSnapshot = await getCountFromServer(collection(db, 'clinics'));
        const clinicsCount = clinicsSnapshot.data().count;

        // Count bookings for current month from 'bookings' collection
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('createdAt', '>=', Timestamp.fromDate(firstDayOfMonth))
        );
        const bookingsSnapshot = await getCountFromServer(bookingsQuery);
        const monthlyBookings = bookingsSnapshot.data().count;

        // Calculate average rating from reviews
        const reviewsSnapshot = await getDocs(collection(db, 'reviews'));
        let totalRating = 0;
        let reviewCount = 0;
        reviewsSnapshot.forEach((doc) => {
          const review = doc.data();
          if (review.rating) {
            totalRating += review.rating;
            reviewCount++;
          }
        });
        const averageRating = reviewCount > 0 ? (totalRating / reviewCount).toFixed(1) : '0.0';

        setStats({
          doctorsCount,
          clinicsCount,
          monthlyBookings,
          averageRating: parseFloat(averageRating)
        });

        console.log('✅ Landing page stats loaded:', { doctorsCount, clinicsCount, monthlyBookings, averageRating });
      } catch (error) {
        console.error('❌ Error fetching landing page stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-gray-900">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo & Back Button */}
          <div className="flex items-center gap-4">
            {isDemoMode && onBackToAdmin && (
              <button
                onClick={onBackToAdmin}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Admin
              </button>
            )}
            <img src={healqrLogo} alt="HealQR Logo" className="h-12 w-auto" />
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* Video Library Icon */}
            <button
              onClick={onVideoLibrary}
              className="w-10 h-10 bg-gray-800 rounded-md flex items-center justify-center hover:bg-gray-700 transition-colors"
              title="Video Library"
            >
              <Video className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="max-w-6xl mx-auto">
          {/* Hero Image */}
          <div className="flex justify-center mb-12">
            <img
              src={doctorsHeroImage}
              alt="Healthcare Professionals Team"
              className="w-full max-w-2xl h-auto object-contain"
            />
          </div>

          {/* Hero Content */}
          <div className="text-center">
            {/* Main Heading */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl mb-8">
              <span className="text-white">World's First QR-based</span>
              <br />
              <span className="text-emerald-500">e-Assistant for Doctors</span>
            </h1>

            {/* Description */}
            <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed">
              HealQR is the QR-based doctor booking platform.
              <br />
              Start your practice with instant bookings, patient management, analytics,
              <br />
              multi-language support, and complete patient data ownership.
            </p>

            {/* 3-Way Entry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">

              {/* 1. Doctors */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-emerald-500/50 transition-all group">
                <div className="h-12 w-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                  <User className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">For Doctors</h3>
                <p className="text-gray-400 text-sm mb-6">Your practice with instant QR booking</p>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => setShowDoctorOptions(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Get Started
                  </Button>
                </div>
              </div>

              {/* 2. Clinics */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-blue-500/50 transition-all group">
                <div className="h-12 w-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                  <Building2 className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">For Clinics</h3>
                <p className="text-gray-400 text-sm mb-6">Manage Multiple Doctors under One QR</p>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => setShowClinicOptions(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Get Started
                  </Button>
                </div>
              </div>

              {/* 3. Patients */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-orange-500/50 transition-all group">
                <div className="h-12 w-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-500/20 transition-colors">
                  <Users className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">For Patients</h3>
                <p className="text-gray-400 text-sm mb-6">Find doctors or access your medical locker.</p>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => setShowPatientOptions(true)}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Get Started
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 px-6 bg-black">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Active Doctors */}
            <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-4xl text-center mb-2">{stats.doctorsCount > 0 ? stats.doctorsCount.toLocaleString() : '0'}</h3>
              <p className="text-center text-lg mb-2">Active Doctors</p>
              <p className="text-center text-sm text-gray-400">Across 15+ specialties</p>
            </div>

            {/* Multispeciality Clinics */}
            <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-4xl text-center mb-2">{stats.clinicsCount > 0 ? stats.clinicsCount.toLocaleString() : '0'}</h3>
              <p className="text-center text-lg mb-2">Multispeciality Clinics</p>
              <p className="text-center text-sm text-gray-400">Growing every day</p>
            </div>

            {/* Monthly Bookings */}
            <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-4xl text-center mb-2">{stats.monthlyBookings > 0 ? stats.monthlyBookings.toLocaleString() : '0'}</h3>
              <p className="text-center text-lg mb-2">Bookings This Month</p>
              <p className="text-center text-sm text-gray-400">Real-time data</p>
            </div>

            {/* Platform Rating */}
            <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" fill="white" />
                </div>
              </div>
              <h3 className="text-4xl text-center mb-2">{stats.averageRating > 0 ? `${stats.averageRating}/5` : '0/5'}</h3>
              <p className="text-center text-lg mb-2">Platform Rating</p>
              <p className="text-center text-sm text-gray-400">Live user reviews</p>
            </div>
          </div>
        </div>
      </section>

      {/* Powerful Features Section */}
      <section className="py-20 px-6 bg-black">
        <div className="container mx-auto max-w-7xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-emerald-500 mb-4 text-4xl">Powerful Features</h2>
            <p className="text-gray-400 text-lg">Everything you need to modernize your medical practice</p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* QR-based Booking */}
            <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
              <div className="flex justify-center mb-6">
                <Grid3x3 className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-center mb-3">QR-based Booking</h3>
              <p className="text-center text-sm text-gray-400">Instant patient bookings by scanning QR code. No app downloads required.</p>
            </div>

            {/* No App Needed */}
            <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
              <div className="flex justify-center mb-6">
                <Smartphone className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-center mb-3">No App Needed</h3>
              <p className="text-center text-sm text-gray-400">Patients book directly through web browser. Zero friction booking experience.</p>
            </div>

            {/* Multilingual Support */}
            <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
              <div className="flex justify-center mb-6">
                <Clock className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-center mb-3">Multilingual Support</h3>
              <p className="text-center text-sm text-gray-400">Real-time language support for diverse patient populations.</p>
            </div>

            {/* Doctor Mini-Website */}
            <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
              <div className="flex justify-center mb-6">
                <FileText className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-center mb-3">Doctor Mini-Website</h3>
              <p className="text-center text-sm text-gray-400">Shareable personal website for each doctor with booking integration.</p>
            </div>

            {/* Doctor Data Vault */}
            <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
              <div className="flex justify-center mb-6">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-center mb-3">Doctor Data Vault</h3>
              <p className="text-center text-sm text-gray-400">Securely store and manage patient data with complete privacy.</p>
            </div>

            {/* Data Ownership */}
            <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
              <div className="flex justify-center mb-6">
                <ShoppingBag className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-center mb-3">Data Ownership</h3>
              <p className="text-center text-sm text-gray-400">You own your clinical and patient data, always. Complete control.</p>
            </div>

            {/* Analytics & Reports */}
            <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
              <div className="flex justify-center mb-6">
                <TrendingUp className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-center mb-3">Analytics & Reports</h3>
              <p className="text-center text-sm text-gray-400">Detailed booking analytics and patient insights for better practice management.</p>
            </div>

            {/* Enhanced FCM Notifications */}
            <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
              <div className="flex justify-center mb-6">
                <Bell className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-center mb-3">Enhanced FCM Notifications</h3>
              <p className="text-center text-sm text-gray-400">Rich media push notifications with delivery tracking and analytics.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Add-Ons Section */}
      <section className="py-20 px-6 bg-black">
        <div className="container mx-auto max-w-7xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-emerald-500 mb-4 text-4xl">Premium Add-Ons</h2>
            <p className="text-gray-400 text-lg">All features completely FREE for doctors forever</p>
          </div>

          {/* Assistant Access - Full Width Horizontal */}
          <div className="mb-8 bg-zinc-900 rounded-2xl p-6 md:p-8 border-2 border-purple-500 shadow-lg shadow-purple-500/20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 md:w-7 md:h-7 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-xl md:text-2xl text-white">Assistant Access</h3>
                  <p className="text-gray-400 text-sm md:text-base">Delegate dashboard management to your assistants with specific permissions. Add multiple assistants as needed for your staff.</p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                <span className="bg-emerald-500 text-black px-6 py-3 rounded-full font-bold text-lg">100% FREE</span>
                <button
                  onClick={onGetStarted}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-bold transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 w-full md:w-auto"
                >
                  Activate Now
                </button>
              </div>
            </div>
          </div>

          {/* Grid for 2 core features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            {/* Personalized Templates */}
            <div className="bg-zinc-900 rounded-2xl p-6 border-2 border-orange-500 shadow-lg shadow-orange-500/10">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <Layout className="w-6 h-6 text-orange-500" />
                </div>
              </div>
              <h3 className="text-center mb-2 text-lg font-semibold text-white">Personalized Templates</h3>
              <p className="text-center text-sm text-gray-400 mb-4 min-h-[48px]">Upload custom templates for festival wishes, health tips, and patient engagement.</p>
              <div className="flex justify-center">
                <span className="bg-emerald-500 text-black px-4 py-2 rounded-full font-bold text-sm">100% FREE</span>
              </div>
            </div>

            {/* Lab Referral Tracking */}
            <div className="bg-zinc-900 rounded-2xl p-6 border-2 border-pink-500 shadow-lg shadow-pink-500/10">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-pink-500/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-pink-500" />
                </div>
              </div>
              <h3 className="text-center mb-2 text-lg font-semibold text-white">Lab Referral Tracking</h3>
              <p className="text-center text-sm text-gray-400 mb-4 min-h-[48px]">Professional digital diary for lab referral and commission management.</p>
              <div className="flex justify-center">
                <span className="bg-emerald-500 text-black px-4 py-2 rounded-full font-bold text-sm">100% FREE</span>
              </div>
            </div>
          </div>

          {/* Emergency Button - Full width horizontal */}
          <div className="mb-6">
            <div className="bg-zinc-900 rounded-2xl p-6 border-2 border-red-500 shadow-lg shadow-red-500/10 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-red-500 text-white px-4 py-1 rounded-full text-xs font-bold">
                  EMERGENCY
                </span>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="mb-2 text-xl font-semibold text-white">Emergency Button</h3>
                    <p className="text-sm text-gray-400">Show your phone number to patients during critical emergency situations.</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3 flex-shrink-0">
                  <span className="bg-emerald-500 text-black px-6 py-2 rounded-full font-bold text-sm">100% FREE</span>
                  <button className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-bold transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105">
                    Activate Now
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Multispeciality Clinic - Full width horizontal */}
          <div>
            <div className="bg-zinc-900 rounded-2xl p-6 border-2 border-cyan-500 shadow-lg shadow-cyan-500/10 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold">
                  100% FREE
                </span>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-cyan-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-8 h-8 text-cyan-500" />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="mb-2 text-xl font-semibold text-white">Multispeciality Clinic</h3>
                    <p className="text-sm text-gray-400">One QR, Multiple Doctors. Advanced multi-specialty clinic chain management.</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className="bg-emerald-500 text-white px-6 py-3 rounded-full font-bold text-sm">100% FREE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-6 bg-black">
        <div className="container mx-auto max-w-7xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-emerald-500 mb-4 text-4xl">What Doctors Say About HealQR</h2>
          </div>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayTestimonials.map((testimonial) => (
              <div key={testimonial.id} className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
                {/* Doctor Info */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white">Dr</span>
                  </div>
                  <div>
                    <h3 className="mb-1">{testimonial.doctor}</h3>
                    <p className="text-sm text-gray-400">{testimonial.specialty || 'Physician'}</p>
                  </div>
                </div>

                {/* Verified Patient */}
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-emerald-500">Verified Patient</p>
                  <p className="text-sm text-gray-400">{testimonial.patient}</p>
                </div>

                {/* Stars */}
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < testimonial.rating
                          ? 'text-emerald-500 fill-emerald-500'
                          : 'text-gray-600'
                      }`}
                    />
                  ))}
                </div>

                {/* Testimonial */}
                <p className="text-gray-300 text-sm mb-8">
                  "{testimonial.comment}"
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
                  <p className="text-sm text-emerald-500">Book your appointment hassle free</p>
                  <img src={healqrLogo} alt="HealQR Logo" className="h-6 w-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-black border-t border-zinc-800">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Brand Column */}
            <div className="lg:col-span-2">
              {/* Logo and Brand Name */}
              <div className="mb-4">
                <img src={healqrLogo} alt="HealQR Logo" className="h-8 w-auto" />
              </div>

              {/* Description */}
              <p className="text-gray-400 text-sm mb-4">
                World's first QR-based doctor booking platform. Revolutionizing healthcare accessibility.
              </p>

              {/* Email */}
              <p className="text-gray-400 text-sm mb-4">support@healqr.com</p>

              {/* Hosting Info */}
              <p className="text-emerald-500 text-sm mb-6">
                Securely Hosted on Google Cloud | USA Region
              </p>

              {/* Social Icons */}
              <div className="flex gap-4">
                <a
                  href="https://twitter.com/healqr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-emerald-500 transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="https://linkedin.com/company/healqr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-emerald-500 transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
                <a
                  href="https://facebook.com/healqr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-emerald-500 transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* For Doctors Column */}
            <div>
              <h3 className="mb-4">For Doctors</h3>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={onGetStarted}
                    className="text-gray-400 hover:text-emerald-500 transition-colors text-sm text-left"
                  >
                    Sign Up
                  </button>
                </li>
                <li>
                  <button
                    onClick={onLogin}
                    className="text-gray-400 hover:text-emerald-500 transition-colors text-sm text-left"
                  >
                    Login
                  </button>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-gray-400 hover:text-emerald-500 transition-colors text-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      document.querySelector('#pricing')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <button
                    onClick={() => setShowSupportModal(true)}
                    className="text-gray-400 hover:text-emerald-500 transition-colors text-sm text-left"
                  >
                    Support
                  </button>
                </li>
              </ul>
            </div>

            {/* For Partners Column */}
            <div>
              <h3 className="mb-4">For Partners</h3>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={() => {
                      if (onAdvertiserGateway) {
                        onAdvertiserGateway();
                      } else {
                        setShowAdvertiserModal(true);
                      }
                    }}
                    className="text-gray-400 hover:text-emerald-500 transition-colors text-sm text-left"
                  >
                    Advertiser Gateway
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setShowPharmaOptions(true)}
                    className="text-gray-400 hover:text-emerald-500 transition-colors text-sm text-left"
                  >
                    healQR Distributors
                  </button>
                </li>
                <li>
                  <button
                    onClick={onAdminLogin}
                    className="text-gray-400 hover:text-emerald-500 transition-colors text-sm text-left"
                  >
                    Admin Panel
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setShowSupportModal(true)}
                    className="text-gray-400 hover:text-emerald-500 transition-colors text-sm text-left"
                  >
                    API Docs
                  </button>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h3 className="mb-4">Legal</h3>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={onPrivacyPolicy}
                    className="text-gray-400 hover:text-emerald-500 transition-colors text-sm text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    onClick={onTermsOfService}
                    className="text-gray-400 hover:text-emerald-500 transition-colors text-sm text-left"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button
                    onClick={onRefundPolicy}
                    className="text-gray-400 hover:text-emerald-500 transition-colors text-sm text-left"
                  >
                    Refund Policy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setShowSupportModal(true)}
                    className="text-gray-400 hover:text-emerald-500 transition-colors text-sm text-left"
                  >
                    Contact Us
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      {/* Copyright Strip */}
      <div className="py-4 px-6 bg-zinc-950 border-t border-zinc-800">
        <div className="container mx-auto max-w-7xl">
          <p className="text-center text-gray-400 text-sm">
            © 2025 HealQR.com. All rights reserved.
          </p>
        </div>
      </div>

      {/* Support Modal */}
      <LandingSupportModal
        open={showSupportModal}
        onOpenChange={setShowSupportModal}
      />

      {/* Advertiser Gateway Modal */}
      <AdvertiserGatewayModal
        open={showAdvertiserModal}
        onOpenChange={setShowAdvertiserModal}
        onSignUp={onAdvertiserSignUp || (() => {})}
        onLogin={onAdvertiserLogin || (() => {})}
      />

      {/* Doctor Options Modal */}
      {showDoctorOptions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full relative">
            <button
              onClick={() => setShowDoctorOptions(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="h-16 w-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">For Doctors</h2>
              <p className="text-gray-400">Solo practice management with instant QR booking</p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  setShowDoctorOptions(false);
                  onGetStarted();
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg"
              >
                Sign Up
              </Button>
              <Button
                onClick={() => {
                  setShowDoctorOptions(false);
                  onLogin?.();
                }}
                variant="outline"
                className="w-full border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:text-white py-6 text-lg"
              >
                Log In
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clinic Options Modal */}
      {showClinicOptions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full relative">
            <button
              onClick={() => setShowClinicOptions(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="h-16 w-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">For Clinics</h2>
              <p className="text-gray-400">Manage multiple doctors under one roof</p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  setShowClinicOptions(false);
                  window.location.href = '/?page=clinic-signup';
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
              >
                Sign Up
              </Button>
              <Button
                onClick={() => {
                  setShowClinicOptions(false);
                  window.location.href = '/?page=clinic-login';
                }}
                variant="outline"
                className="w-full border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:text-white py-6 text-lg"
              >
                Log In
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Advertiser Options Modal */}
      {showAdvertiserOptions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full relative">
            <button
              onClick={() => setShowAdvertiserOptions(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="h-16 w-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MonitorPlay className="w-8 h-8 text-purple-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">For Advertisers</h2>
              <p className="text-gray-400">Promote your brand to patients and doctors</p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  setShowAdvertiserOptions(false);
                  onAdvertiserSignUp?.();
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg"
              >
                Sign Up
              </Button>
              <Button
                onClick={() => {
                  setShowAdvertiserOptions(false);
                  onAdvertiserLogin?.();
                }}
                variant="outline"
                className="w-full border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:text-white py-6 text-lg"
              >
                Log In
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Options Modal */}
      {showPatientOptions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full relative">
            <button
              onClick={() => setShowPatientOptions(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="h-16 w-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">For Patients</h2>
              <p className="text-gray-400">Find doctors or access your medical locker</p>
            </div>

            {/* Health Tip Card */}
            <div className="mb-4">
              <DashboardPromoDisplay category="health-tip" placement="landing-patient-modal" />
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  setShowPatientOptions(false);
                  window.location.href = '/?page=patient-search';
                }}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6 text-lg"
              >
                Find Doctor & Visit History
              </Button>
              <Button
                onClick={() => {
                  setShowPatientOptions(false);
                  window.location.href = '/?page=patient-login';
                }}
                variant="outline"
                className="w-full border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:text-white py-6 text-lg"
              >
                Medical Locker
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pharma/Distributor Options Modal */}
      {showPharmaOptions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full relative">
            <button
              onClick={() => setShowPharmaOptions(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="h-16 w-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">For Distributors</h2>
              <p className="text-gray-400">Manage doctors in your territory and scale your business</p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  setShowPharmaOptions(false);
                  window.location.href = '/?page=pharma-signup';
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
              >
                Sign Up
              </Button>
              <Button
                onClick={() => {
                  setShowPharmaOptions(false);
                  onPharmaLogin?.();
                }}
                variant="outline"
                className="w-full border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:text-white py-6 text-lg"
              >
                Log In
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
