import { Star, Presentation, Calendar, Users, TrendingUp, UserPlus, UserMinus, ChevronDown, Upload, Megaphone, Building2, Cake, CheckCircle2, CalendarCheck, QrCode, User, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { AdminStatsService, AdminStats, BirthdayDoctor } from '../lib/firebase/admin-stats.service';

interface DoctorTestimonial {
  id: number;
  doctor: string;
  patient: string;
  rating: number;
  comment: string;
  date: string;
  specialty?: string;
}

interface SupportRequest {
  id: number;
  doctorName: string;
  doctorCode: string;
  message: string;
  rating: number;
  date: string;
  uploaded: boolean;
}

interface AdminDashboardProps {
  adminEmail: string;
  onStartDemo?: () => void;
  uploadedTestimonials?: DoctorTestimonial[];
  onUploadTestimonial?: (request: { id: number; doctorName: string; doctorCode: string; message: string; rating: number; date: string }) => void;
  supportRequests?: SupportRequest[];
  onNavigateToQRGenerator?: () => void;
  onNavigateToQRGeneration?: () => void;
  onNavigateToQRManagement?: () => void;
}

export default function AdminDashboard({ adminEmail, onStartDemo, uploadedTestimonials = [], onUploadTestimonial, supportRequests = [], onNavigateToQRGenerator, onNavigateToQRGeneration, onNavigateToQRManagement }: AdminDashboardProps) {
  const [showReviews, setShowReviews] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    totalReviews: 0,
    averageRating: 0,
    totalRevenue: 0,
    adRevenue: 0,
    pharmaRevenue: 0,
    totalBookings: 0,
    qrBookings: 0,
    walkinBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalOnboardDoctors: 0,
    lastMonthNewDoctors: 0,
    activeDoctors: 0,
    inactiveDoctors: 0,
    totalClinics: 0,
    activeClinics: 0,
    inactiveClinics: 0,
    newClinicsThisMonth: 0,
  });
  const [recentReviews, setRecentReviews] = useState<SupportRequest[]>([]);
  const [revenueGrowth, setRevenueGrowth] = useState<number>(0);
  const [doctorGrowth, setDoctorGrowth] = useState<number>(0);
  const [activeAdvertisers, setActiveAdvertisers] = useState<number>(0);
  const [activePharmaSponsors, setActivePharmaSponsors] = useState<number>(0);

  // Load real-time statistics from Firestore
  useEffect(() => {
    loadAdminStats();
  }, [startDate, endDate]);

  const loadAdminStats = async () => {
    try {
      setLoading(true);

      // Parse date range
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      // Load stats, reviews, and growth in parallel
      const [adminStats, reviews, revGrowth, docGrowth] = await Promise.all([
        AdminStatsService.getAdminStats(start, end),
        AdminStatsService.getRecentSupportReviews(5),
        AdminStatsService.getMonthOverMonthGrowth('revenue'),
        AdminStatsService.getMonthOverMonthGrowth('doctors'),
      ]);

      setStats(adminStats);
      setRecentReviews(reviews);
      setRevenueGrowth(revGrowth);
      setDoctorGrowth(docGrowth);

      // Load advertiser and pharma sponsor counts
      try {
        const { db: fireDb } = await import('../lib/firebase/config');
        const { collection: col, getDocs: gDocs } = await import('firebase/firestore');
        const [advSnap, pharmaSnap] = await Promise.all([
          gDocs(col(fireDb, 'advertisers')),
          gDocs(col(fireDb, 'pharmaCompanies')),
        ]);
        setActiveAdvertisers(advSnap.docs.filter(d => d.data().status === 'active').length);
        setActivePharmaSponsors(pharmaSnap.docs.filter(d => d.data().status === 'active').length);
      } catch (e) {
        console.error('Error loading advertiser/pharma counts:', e);
      }
      
      console.log('✅ Admin stats loaded:', adminStats);
    } catch (error) {
      console.error('❌ Error loading admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Birthday doctors data - load from Firestore
  const [todayBirthdayDoctors, setTodayBirthdayDoctors] = useState<BirthdayDoctor[]>([]);

  useEffect(() => {
    const loadBirthdayDoctors = async () => {
      try {
        const birthdayList = await AdminStatsService.getTodayBirthdayDoctors();
        setTodayBirthdayDoctors(birthdayList);
        console.log('✅ Birthday doctors loaded:', birthdayList.length);
      } catch (error) {
        console.error('❌ Error loading birthday doctors:', error);
      }
    };
    
    loadBirthdayDoctors();
  }, []);

  const handleUploadTestimonial = (request: SupportRequest) => {
    if (onUploadTestimonial) {
      // Maximum 3 testimonials allowed on landing page
      onUploadTestimonial(request);
      console.log('✅ TESTIMONIAL UPLOADED TO LANDING PAGE:', request);
    }
  };

  const isAlreadyUploaded = (requestId: number) => {
    return supportRequests.some(r => r.id === requestId && r.uploaded);
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-black">
      <div className="p-4 md:p-8 max-w-full">
        {/* QR System Quick Access */}
        {(onNavigateToQRGeneration || onNavigateToQRManagement) && (
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {onNavigateToQRGeneration && (
                <Button
                  onClick={onNavigateToQRGeneration}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 h-14"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="5" height="5" x="3" y="3" rx="1"/>
                    <rect width="5" height="5" x="16" y="3" rx="1"/>
                    <rect width="5" height="5" x="3" y="16" rx="1"/>
                    <path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
                    <path d="M21 21v.01"/>
                    <path d="M12 7v3a2 2 0 0 1-2 2H7"/>
                    <path d="M3 12h.01"/>
                    <path d="M12 3h.01"/>
                    <path d="M12 16v.01"/>
                    <path d="M16 12h1"/>
                    <path d="M21 12v.01"/>
                    <path d="M12 21v-1"/>
                  </svg>
                  <div className="text-left">
                    <div className="font-semibold">QR Generation & Inventory</div>
                    <div className="text-xs opacity-80">Create batches, track production to deployment</div>
                  </div>
                </Button>
              )}
              {onNavigateToQRManagement && (
                <Button
                  onClick={onNavigateToQRManagement}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 h-14"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  <div className="text-left">
                    <div className="font-semibold">QR Usage Tracking</div>
                    <div className="text-xs opacity-80">Search QRs, view history & analytics</div>
                  </div>
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* Header Section */}
        <div className="mb-6 md:mb-8 max-w-full">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 justify-between">
              {/* Welcome Message */}
              <div>
                <h1 className="text-2xl md:text-3xl mb-2 text-white">Welcome Admin!</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(stats.averageRating)
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setShowReviews(!showReviews)}
                    className="text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1 text-sm"
                  >
                    {stats.totalReviews} reviews
                    <ChevronDown className={`w-4 h-4 transition-transform ${showReviews ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
              
              {/* Refresh Button */}
              <Button
                onClick={loadAdminStats}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600 text-white h-9"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  'Refresh Stats'
                )}
              </Button>
            </div>

            {/* Date Range Filter - Mobile Optimized */}
            <div className="w-full max-w-full overflow-hidden">
              <div className={`bg-zinc-900 border rounded-lg p-3 transition-colors ${
                (startDate || endDate) ? 'border-emerald-500' : 'border-zinc-700'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-gray-400">Date Range Filter</span>
                  {(startDate || endDate) && (
                    <button
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                      }}
                      className="ml-auto text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="w-full min-w-0">
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full min-w-0 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="w-full min-w-0">
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full min-w-0 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Last 5 Reviews Dropdown */}
          {showReviews && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6 mt-4">
              <h3 className="text-base md:text-lg mb-4">Last 5 Doctor Support Reviews</h3>
              <div className="space-y-3">
                {recentReviews.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No support reviews yet</p>
                ) : (
                  recentReviews.map((request) => (
                    <div key={request.id} className="bg-zinc-800/50 rounded-lg p-3 md:p-4">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <p className="text-sm text-white">{request.doctorName}</p>
                          <p className="text-xs text-gray-400">Code: {request.doctorCode}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < request.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleUploadTestimonial(request)}
                            disabled={isAlreadyUploaded(request.id)}
                            className={`${
                              isAlreadyUploaded(request.id)
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-emerald-500 hover:bg-emerald-600'
                            } text-white px-3 py-1 h-7 text-xs`}
                          >
                            <Upload className="w-3 h-3 mr-1" />
                            {isAlreadyUploaded(request.id) ? 'Uploaded' : 'Upload'}
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{request.message}</p>
                      <p className="text-xs text-gray-500">{request.date}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Big Cards - Advertisers/Pharma, Total Onboard Doctors & Clinics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Active Partners Card */}
          <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-900/20 border border-emerald-700/50 rounded-xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="bg-emerald-500/20 p-3 md:p-4 rounded-xl">
                <Building2 className="w-8 h-8 md:w-10 md:h-10 text-emerald-500" />
              </div>
              <div className="text-right">
                <p className="text-xs md:text-sm text-gray-400 mb-1">Active Partners</p>
                <h2 className="text-3xl md:text-4xl text-emerald-500">{activeAdvertisers + activePharmaSponsors}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-xs md:text-sm">Advertisers + Pharma Sponsors</span>
            </div>
            <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-emerald-700/30">
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                <div className="flex flex-col items-start gap-1">
                  <Megaphone className="w-3 h-3 md:w-4 md:h-4 text-emerald-400" />
                  <span className="text-white text-xs md:text-sm">{activeAdvertisers} Advertisers</span>
                </div>
                <div className="flex flex-col items-start gap-1">
                  <Building2 className="w-3 h-3 md:w-4 md:h-4 text-emerald-400" />
                  <span className="text-white text-xs md:text-sm">{activePharmaSponsors} Pharma</span>
                </div>
              </div>
            </div>
          </div>

          {/* Total Onboard Doctors Card */}
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-900/20 border border-blue-700/50 rounded-xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-blue-500/20 p-3 md:p-4 rounded-xl">
                <Users className="w-8 h-8 md:w-10 md:h-10 text-blue-500" />
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Total Onboard Doctors</p>
                <h2 className="text-4xl md:text-5xl text-blue-500">{stats.totalOnboardDoctors}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2 text-blue-400 mb-6">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">
                {doctorGrowth > 0 ? '+' : ''}{stats.lastMonthNewDoctors} new this month
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-xs text-blue-400 mb-2">Active</p>
                <p className="text-2xl text-white">{stats.activeDoctors}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-red-400 mb-2">Inactive</p>
                <p className="text-2xl text-white">{stats.inactiveDoctors}</p>
              </div>
            </div>
          </div>

          {/* Total Clinics Card - spans full row */}
          <div className="lg:col-span-2 bg-gradient-to-br from-teal-900/40 to-teal-900/20 border border-teal-700/50 rounded-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-8">
              <div className="flex items-center gap-4">
                <div className="bg-teal-500/20 p-3 md:p-4 rounded-xl">
                  <Building2 className="w-8 h-8 md:w-10 md:h-10 text-teal-500" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-400 mb-1">Total Clinics</p>
                  <h2 className="text-3xl md:text-4xl text-teal-500">{stats.totalClinics}</h2>
                </div>
              </div>
              <div className="flex items-center gap-2 text-teal-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs md:text-sm">+{stats.newClinicsThisMonth} new this month</span>
              </div>
              <div className="flex items-center gap-6 md:gap-10">
                <div className="text-center">
                  <p className="text-xs text-teal-400 mb-1">Active</p>
                  <p className="text-2xl text-white">{stats.activeClinics}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-red-400 mb-1">Inactive</p>
                  <p className="text-2xl text-white">{stats.inactiveClinics}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2.5: Total Platform Bookings - Wide Card */}
        <div className="mb-6 md:mb-8">
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-900/20 border-2 border-purple-600 rounded-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="bg-purple-500/20 p-4 rounded-xl">
                  <CalendarCheck className="w-10 h-10 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Platform Bookings</p>
                  <h2 className="text-4xl md:text-5xl text-purple-500">{stats.totalBookings.toLocaleString()}</h2>
                </div>
              </div>
              <div className="text-purple-300 text-sm">
                <p>Across all doctors • All time</p>
              </div>
            </div>
            
            {/* Booking Breakdown */}
            <div className="space-y-4">
              {/* Top Row - Large Boxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total Scan - Large */}
                <div className="bg-purple-800/20 rounded-lg p-6 border border-purple-700/30">
                  <div className="flex items-center gap-3 mb-3">
                    <QrCode className="w-7 h-7 text-cyan-400" />
                    <span className="text-sm text-gray-400">Total Scan</span>
                  </div>
                  <p className="text-4xl text-white font-bold">{stats.qrBookings.toLocaleString()}</p>
                  <p className="text-sm text-cyan-300 mt-2">
                    {stats.totalBookings > 0 ? ((stats.qrBookings / stats.totalBookings) * 100).toFixed(1) : 0}%
                  </p>
                </div>

                {/* Total Bookings - Large */}
                <div className="bg-purple-800/20 rounded-lg p-6 border border-purple-700/30">
                  <div className="flex items-center gap-3 mb-3">
                    <CalendarCheck className="w-7 h-7 text-emerald-400" />
                    <span className="text-sm text-gray-400">Total Bookings</span>
                  </div>
                  <p className="text-4xl text-white font-bold">{stats.totalBookings.toLocaleString()}</p>
                  <p className="text-sm text-emerald-300 mt-2">100%</p>
                </div>
              </div>

              {/* Bottom Row - Small Boxes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* QR Bookings */}
                <div className="bg-purple-800/20 rounded-lg p-4 border border-purple-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <QrCode className="w-5 h-5 text-purple-400" />
                    <span className="text-xs text-gray-400">QR Bookings</span>
                  </div>
                  <p className="text-2xl text-white">{stats.qrBookings.toLocaleString()}</p>
                  <p className="text-xs text-purple-300 mt-1">
                    {stats.totalBookings > 0 ? ((stats.qrBookings / stats.totalBookings) * 100).toFixed(1) : 0}%
                  </p>
                </div>

                {/* Walk-in Bookings */}
                <div className="bg-purple-800/20 rounded-lg p-4 border border-purple-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-purple-400" />
                    <span className="text-xs text-gray-400">Walk-in</span>
                  </div>
                  <p className="text-2xl text-white">{stats.walkinBookings.toLocaleString()}</p>
                  <p className="text-xs text-purple-300 mt-1">
                    {stats.totalBookings > 0 ? ((stats.walkinBookings / stats.totalBookings) * 100).toFixed(1) : 0}%
                  </p>
                </div>

                {/* Cancelled Bookings */}
                <div className="bg-purple-800/20 rounded-lg p-4 border border-purple-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="text-xs text-gray-400">Cancelled</span>
                  </div>
                  <p className="text-2xl text-white">{stats.cancelledBookings.toLocaleString()}</p>
                  <p className="text-xs text-red-300 mt-1">
                    {stats.totalBookings > 0 ? ((stats.cancelledBookings / stats.totalBookings) * 100).toFixed(1) : 0}%
                  </p>
                </div>

                {/* Drop Out */}
                <div className="bg-purple-800/20 rounded-lg p-4 border border-purple-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-orange-400" />
                    <span className="text-xs text-gray-400">Drop Out</span>
                  </div>
                  <p className="text-2xl text-white">0</p>
                  <p className="text-xs text-orange-300 mt-1">0%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Three Cards - New Doctors, Upgraded, Left Out */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* Last Month New Doctors */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-500/10 p-3 rounded-lg">
                <UserPlus className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <h3 className="text-3xl mb-2 text-purple-500">{stats.lastMonthNewDoctors}</h3>
            <p className="text-sm text-gray-400">Last Month New Doctors</p>
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-xs text-gray-500">New registrations in the past 30 days</p>
            </div>
          </div>

          {/* Active Pharma Sponsors */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-emerald-500/10 p-3 rounded-lg">
                <Building2 className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
            <h3 className="text-3xl mb-2 text-emerald-500">{activePharmaSponsors}</h3>
            <p className="text-sm text-gray-400">Active Pharma Sponsors</p>
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-xs text-gray-500">Companies sponsoring free doctor access</p>
            </div>
          </div>

          {/* Inactive Doctors */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-red-500/10 p-3 rounded-lg">
                <UserMinus className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <h3 className="text-3xl mb-2 text-red-500">{stats.inactiveDoctors}</h3>
            <p className="text-sm text-gray-400">Inactive Doctors</p>
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-xs text-gray-500">Doctors no longer active on the platform</p>
            </div>
          </div>
        </div>

        {/* Section 4: Today Birthday */}
        <div className="mt-6 md:mt-8">
          <div className="bg-gradient-to-br from-pink-900/20 to-purple-900/20 border border-pink-700/50 rounded-xl p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <div className="bg-pink-500/20 p-2 md:p-3 rounded-xl">
                <Cake className="w-5 h-5 md:w-6 md:h-6 text-pink-500" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl text-white">🎂 Today's Birthdays</h2>
                <p className="text-xs md:text-sm text-gray-400">Birthday cards delivered to doctors celebrating today</p>
              </div>
            </div>

            {todayBirthdayDoctors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {todayBirthdayDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className={`p-3 md:p-4 rounded-lg border ${
                      doctor.isActive && doctor.cardDelivered
                        ? 'bg-emerald-900/20 border-emerald-700/50'
                        : 'bg-zinc-900/50 border-zinc-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 md:gap-3 flex-1">
                        <div className="relative">
                          <Cake className={`w-4 h-4 md:w-5 md:h-5 ${
                            doctor.isActive && doctor.cardDelivered
                              ? 'text-pink-500'
                              : 'text-gray-500'
                          }`} />
                          {doctor.cardDelivered && doctor.isActive && (
                            <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5">
                              <CheckCircle2 className="w-2 h-2 md:w-3 md:h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm md:text-base text-white">{doctor.name}</p>
                          <p className="text-xs text-gray-400">{doctor.specialty}</p>
                          <div className="mt-1 md:mt-2">
                            {doctor.isActive && doctor.cardDelivered ? (
                              <span className="text-xs text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Card Delivered
                              </span>
                            ) : !doctor.isActive ? (
                              <span className="text-xs text-red-400">
                                Inactive Doctor
                              </span>
                            ) : (
                              <span className="text-xs text-yellow-400">
                                Pending Delivery
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 md:py-8">
                <Cake className="w-10 h-10 md:w-12 md:h-12 text-gray-600 mx-auto mb-2 md:mb-3" />
                <p className="text-sm text-gray-500">No birthdays today</p>
              </div>
            )}

            {/* Birthday Card Template Info */}
            <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-pink-700/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400">
                  <Presentation className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                  <span>Birthday card template can be uploaded via Template Uploader</span>
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  Cards auto-disappear after 24 hours
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

