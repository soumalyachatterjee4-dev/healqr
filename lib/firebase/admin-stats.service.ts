/**
 * Admin Statistics Service
 * 
 * Handles all admin panel statistics queries from Firestore
 */

import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from './config';
import { COLLECTIONS } from './collections';

// ============================================
// ADMIN STATISTICS INTERFACES
// ============================================

export interface AdminStats {
  // Revenue Stats
  totalRevenue: number;
  subscriptionRevenue: number;
  topUpRevenue: number;
  premiumAddOnRevenue: number;
  
  // Booking Stats
  totalBookings: number;
  qrBookings: number;
  walkinBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  
  // Doctor Stats
  totalOnboardDoctors: number;
  lastMonthNewDoctors: number;
  upgradedDoctors: number;
  leftOutDoctors: number;
  
  // Doctors by Plan
  growthDoctors: number;
  scaleDoctors: number;
  proDoctors: number;
  summitDoctors: number;
  
  // Review Stats
  totalReviews: number;
  averageRating: number;
}

export interface BirthdayDoctor {
  id: string;
  name: string;
  email: string;
  specialty: string;
  birthday: string;
  isActive: boolean;
  cardDelivered: boolean;
}

// ============================================
// ADMIN STATISTICS SERVICE
// ============================================

export class AdminStatsService {
  /**
   * Get comprehensive admin statistics with date range filtering
   */
  static async getAdminStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<AdminStats> {
    try {
      const [revenueStats, bookingStats, doctorStats] = await Promise.all([
        this.getRevenueStats(startDate, endDate),
        this.getBookingStats(startDate, endDate),
        this.getDoctorStats(startDate, endDate),
      ]);

      return {
        ...revenueStats,
        ...bookingStats,
        ...doctorStats,
      };
    } catch (error: any) {
      // Handle permission errors gracefully
      if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
        console.warn('⚠️ Permission denied for admin stats - user may not be authenticated');
      } else {
        console.error('❌ Error fetching admin stats:', error);
      }
      throw error;
    }
  }

  /**
   * Calculate revenue statistics from transactions
   */
  private static async getRevenueStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalRevenue: number;
    subscriptionRevenue: number;
    topUpRevenue: number;
    premiumAddOnRevenue: number;
  }> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized');
      }
      
      const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
      const constraints: any[] = [
        where('status', '==', 'success'),
      ];

      // Add date range filters if provided
      if (startDate) {
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(startDate)));
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
      }

      const q = query(transactionsRef, ...constraints);
      const snapshot = await getDocs(q);

      let totalRevenue = 0;
      let subscriptionRevenue = 0;
      let topUpRevenue = 0;
      let premiumAddOnRevenue = 0;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const amount = data.amount || 0;

        totalRevenue += amount;

        // Categorize by transaction type
        const type = data.type || '';
        const description = (data.description || '').toLowerCase();

        if (type === 'subscription' || description.includes('subscription') || description.includes('plan')) {
          subscriptionRevenue += amount;
        } else if (type === 'topup' || description.includes('top-up') || description.includes('topup')) {
          topUpRevenue += amount;
        } else if (type === 'addon' || description.includes('add-on') || description.includes('addon')) {
          premiumAddOnRevenue += amount;
        } else {
          // Default categorization based on amount ranges
          if (amount >= 100000) {
            subscriptionRevenue += amount;
          } else if (amount >= 10000 && amount < 100000) {
            topUpRevenue += amount;
          } else {
            premiumAddOnRevenue += amount;
          }
        }
      });

      return {
        totalRevenue,
        subscriptionRevenue,
        topUpRevenue,
        premiumAddOnRevenue,
      };
    } catch (error: any) {
      // Handle permission errors gracefully
      if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
        console.warn('⚠️ Permission denied for revenue stats - user may not be authenticated');
      } else {
        console.error('❌ Error calculating revenue stats:', error);
      }
      return {
        totalRevenue: 0,
        subscriptionRevenue: 0,
        topUpRevenue: 0,
        premiumAddOnRevenue: 0,
      };
    }
  }

  /**
   * Calculate booking statistics from bookings collection
   */
  private static async getBookingStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalBookings: number;
    qrBookings: number;
    walkinBookings: number;
    completedBookings: number;
    cancelledBookings: number;
  }> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const bookingsRef = collection(db, COLLECTIONS.BOOKINGS);
      const constraints: any[] = [];

      // Add date range filters if provided
      if (startDate) {
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(startDate)));
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
      }

      const q = constraints.length > 0 
        ? query(bookingsRef, ...constraints)
        : query(bookingsRef);
      
      const snapshot = await getDocs(q);

      let totalBookings = 0;
      let qrBookings = 0;
      let walkinBookings = 0;
      let completedBookings = 0;
      let cancelledBookings = 0;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        totalBookings++;

        // Count by booking type
        const bookingType = data.type || data.bookingType || '';
        if (bookingType === 'walkin_booking' || bookingType === 'walk-in') {
          walkinBookings++;
        } else {
          qrBookings++;
        }

        // Count by status
        const status = data.status || '';
        if (status === 'completed' || data.consultationCompleted === true || data.isMarkedSeen === true) {
          completedBookings++;
        } else if (status === 'cancelled' || data.cancelledBy) {
          cancelledBookings++;
        }
      });

      return {
        totalBookings,
        qrBookings,
        walkinBookings,
        completedBookings,
        cancelledBookings,
      };
    } catch (error: any) {
      // Handle permission errors gracefully
      if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
        console.warn('⚠️ Permission denied for booking stats - user may not be authenticated');
      } else {
        console.error('❌ Error calculating booking stats:', error);
      }
      return {
        totalBookings: 0,
        qrBookings: 0,
        walkinBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
      };
    }
  }

  /**
   * Calculate doctor statistics
   */
  private static async getDoctorStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalOnboardDoctors: number;
    lastMonthNewDoctors: number;
    upgradedDoctors: number;
    leftOutDoctors: number;
    growthDoctors: number;
    scaleDoctors: number;
    proDoctors: number;
    summitDoctors: number;
    totalReviews: number;
    averageRating: number;
  }> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized');
      }
      
      const doctorsRef = collection(db, COLLECTIONS.DOCTORS);
      const doctorsSnapshot = await getDocs(doctorsRef);

      let totalOnboardDoctors = 0;
      let lastMonthNewDoctors = 0;
      let upgradedDoctors = 0;
      let leftOutDoctors = 0;
      let growthDoctors = 0;
      let scaleDoctors = 0;
      let proDoctors = 0;
      let summitDoctors = 0;

      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      doctorsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate();
        const subscriptionPlan = data.subscriptionPlan || data.subscription?.plan || '';
        const subscriptionStatus = data.subscriptionStatus || data.subscription?.status || 'trial';
        const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trial';

        // Filter by date range if provided
        if (startDate && createdAt && createdAt < startDate) {
          return;
        }
        if (endDate && createdAt && createdAt > endDate) {
          return;
        }

        // Total onboard doctors
        totalOnboardDoctors++;

        // Last month new doctors
        if (createdAt && createdAt >= oneMonthAgo) {
          lastMonthNewDoctors++;
        }

        // Upgraded doctors (those who moved from trial to paid plan)
        if (subscriptionStatus === 'active' && subscriptionPlan !== 'free' && subscriptionPlan !== 'trial') {
          upgradedDoctors++;
        }

        // Left out doctors (inactive or expired)
        if (subscriptionStatus === 'expired' || subscriptionStatus === 'inactive' || !isActive) {
          leftOutDoctors++;
        }

        // Doctors by plan
        const planLower = subscriptionPlan.toLowerCase();
        if (planLower.includes('growth') || planLower.includes('starter')) {
          growthDoctors++;
        } else if (planLower.includes('scale')) {
          scaleDoctors++;
        } else if (planLower.includes('pro')) {
          proDoctors++;
        } else if (planLower.includes('summit') || planLower.includes('enterprise')) {
          summitDoctors++;
        }
      });

      // Get review statistics from support requests
      const reviewsData = await this.getReviewStats();

      return {
        totalOnboardDoctors,
        lastMonthNewDoctors,
        upgradedDoctors,
        leftOutDoctors,
        growthDoctors,
        scaleDoctors,
        proDoctors,
        summitDoctors,
        ...reviewsData,
      };
    } catch (error: any) {
      // Handle permission errors gracefully
      if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
        console.warn('⚠️ Permission denied for doctor stats - user may not be authenticated');
      } else {
        console.error('❌ Error calculating doctor stats:', error);
      }
      return {
        totalOnboardDoctors: 0,
        lastMonthNewDoctors: 0,
        upgradedDoctors: 0,
        leftOutDoctors: 0,
        growthDoctors: 0,
        scaleDoctors: 0,
        proDoctors: 0,
        summitDoctors: 0,
        totalReviews: 0,
        averageRating: 0,
      };
    }
  }

  /**
   * Get review statistics (from reviews collection or support requests)
   */
  private static async getReviewStats(): Promise<{
    totalReviews: number;
    averageRating: number;
  }> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized');
      }
      
      // Try to get from reviews collection first
      const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
      const reviewsSnapshot = await getDocs(reviewsRef);

      if (reviewsSnapshot.empty) {
        return {
          totalReviews: 0,
          averageRating: 0,
        };
      }

      let totalRating = 0;
      let reviewCount = 0;

      reviewsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const rating = data.rating || data.stars || 0;
        if (rating > 0) {
          totalRating += rating;
          reviewCount++;
        }
      });

      return {
        totalReviews: reviewCount,
        averageRating: reviewCount > 0 ? totalRating / reviewCount : 0,
      };
    } catch (error) {
      console.error('❌ Error calculating review stats:', error);
      return {
        totalReviews: 0,
        averageRating: 0,
      };
    }
  }

  /**
   * Get today's birthday doctors
   */
  static async getTodayBirthdayDoctors(): Promise<BirthdayDoctor[]> {
    try {
      if (!db) {
        throw new Error('Firestore not initialized');
      }
      
      const doctorsRef = collection(db, COLLECTIONS.DOCTORS);
      const doctorsSnapshot = await getDocs(doctorsRef);

      const today = new Date();
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();
      const todayDateString = `${today.getFullYear()}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;

      const birthdayDoctors: BirthdayDoctor[] = [];

      doctorsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const dob = data.dob || data.dateOfBirth;

        if (!dob) return;

        // Parse DOB
        let birthMonth: number;
        let birthDay: number;

        if (dob.includes('-')) {
          const parts = dob.split('-');
          // Handle both DD-MM-YYYY and MM-DD-YYYY formats
          if (parseInt(parts[0]) <= 12) {
            birthMonth = parseInt(parts[0]);
            birthDay = parseInt(parts[1]);
          } else {
            birthDay = parseInt(parts[0]);
            birthMonth = parseInt(parts[1]);
          }
        } else if (dob.includes('/')) {
          const parts = dob.split('/');
          if (parseInt(parts[0]) <= 12) {
            birthMonth = parseInt(parts[0]);
            birthDay = parseInt(parts[1]);
          } else {
            birthDay = parseInt(parts[0]);
            birthMonth = parseInt(parts[1]);
          }
        } else {
          return;
        }

        // Check if today is birthday
        if (todayMonth === birthMonth && todayDay === birthDay) {
          const subscriptionStatus = data.subscriptionStatus || data.subscription?.status || 'trial';
          const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trial';
          const cardDelivered = data.birthdayCardDelivery && data.birthdayCardDelivery.startsWith(todayDateString);

          birthdayDoctors.push({
            id: doc.id,
            name: data.name || 'Unknown Doctor',
            email: data.email || '',
            specialty: data.specialities?.[0] || data.specialty || 'General Practitioner',
            birthday: dob,
            isActive,
            cardDelivered: cardDelivered || false,
          });
        }
      });

      return birthdayDoctors;
    } catch (error) {
      console.error('❌ Error fetching birthday doctors:', error);
      return [];
    }
  }

  /**
   * Get recent support reviews (last 5)
   */
  static async getRecentSupportReviews(limit: number = 5): Promise<any[]> {
    try {
      if (!db) {
        console.warn('⚠️ Firestore not initialized');
        return [];
      }
      
      // Try to get from reviews collection
      const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
      // Note: order by first, then filter to avoid index issues
      const q = query(
        reviewsRef,
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      // Filter for support reviews in memory
      const supportReviews = snapshot.docs
        .filter(doc => doc.data().type === 'support')
        .slice(0, limit)
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            doctorName: data.doctorName || 'Unknown',
            doctorCode: data.doctorId || data.doctorCode || 'N/A',
            message: data.comment || data.message || '',
            rating: data.rating || data.stars || 0,
            date: data.createdAt?.toDate()?.toLocaleDateString() || 'N/A',
            uploaded: data.uploaded || false,
          };
        });
      
      return supportReviews;
    } catch (error: any) {
      // Handle permission errors gracefully
      if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
        console.warn('⚠️ Permission denied for support reviews - user may not be authenticated');
      } else {
        console.error('❌ Error fetching support reviews:', error);
      }
      return [];
    }
  }

  /**
   * Calculate month-over-month growth percentage
   */
  static async getMonthOverMonthGrowth(metric: 'revenue' | 'doctors'): Promise<number> {
    try {
      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      if (metric === 'revenue') {
        const thisMonthStats = await this.getRevenueStats(firstDayThisMonth, now);
        const lastMonthStats = await this.getRevenueStats(firstDayLastMonth, lastDayLastMonth);

        const thisMonthRevenue = thisMonthStats.totalRevenue;
        const lastMonthRevenue = lastMonthStats.totalRevenue;

        if (lastMonthRevenue === 0) return 0;
        return ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
      } else {
        const thisMonthStats = await this.getDoctorStats(firstDayThisMonth, now);
        const lastMonthStats = await this.getDoctorStats(firstDayLastMonth, lastDayLastMonth);

        const thisMonthDoctors = thisMonthStats.lastMonthNewDoctors;
        const lastMonthDoctors = lastMonthStats.lastMonthNewDoctors;

        if (lastMonthDoctors === 0) return 0;
        return ((thisMonthDoctors - lastMonthDoctors) / lastMonthDoctors) * 100;
      }
    } catch (error) {
      console.error('❌ Error calculating growth:', error);
      return 0;
    }
  }

  /**
   * Get detailed revenue manager statistics with monthly breakdown
   */
  static async getRevenueManagerStats(startDate?: Date, endDate?: Date) {
    try {
      // Get basic stats
      const [revenueStats, doctorStats, monthlyData] = await Promise.all([
        this.getRevenueStats(startDate, endDate),
        this.getDoctorStats(startDate, endDate),
        this.getMonthlyRevenueData(),
      ]);

      // Get transaction counts
      const transactionCounts = await this.getTransactionCounts(startDate, endDate);
      
      // Get subscription tier breakdown
      const subscriptionTiers = await this.getSubscriptionTierBreakdown(startDate, endDate);
      
      // Calculate growth rates
      const revenueGrowth = await this.getMonthOverMonthGrowth('revenue');

      return {
        totalRevenue: revenueStats.totalRevenue,
        subscriptionRevenue: revenueStats.subscriptionRevenue,
        topUpRevenue: revenueStats.topUpRevenue,
        premiumAddOnRevenue: revenueStats.premiumAddOnRevenue,
        totalDoctors: doctorStats.totalOnboardDoctors,
        totalTransactions: transactionCounts.total,
        subscriptionTransactions: transactionCounts.subscription,
        topUpTransactions: transactionCounts.topUp,
        premiumTransactions: transactionCounts.premium,
        subscriptionDoctorCount: transactionCounts.subscriptionDoctorCount,
        topUpDoctorCount: transactionCounts.topUpDoctorCount,
        premiumDoctorCount: transactionCounts.premiumDoctorCount,
        overallGrowthRate: Math.round(revenueGrowth),
        monthlyData,
        subscriptionTiers,
      };
    } catch (error) {
      console.error('❌ Error fetching revenue manager stats:', error);
      throw error;
    }
  }

  /**
   * Get transaction counts by type with unique doctor counts
   */
  private static async getTransactionCounts(startDate?: Date, endDate?: Date) {
    try {
      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
      const constraints: any[] = [where('status', '==', 'success')];

      if (startDate) {
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(startDate)));
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
      }

      const q = query(transactionsRef, ...constraints);
      const snapshot = await getDocs(q);

      let subscription = 0, topUp = 0, premium = 0;
      const subscriptionDoctors = new Set<string>();
      const topUpDoctors = new Set<string>();
      const premiumDoctors = new Set<string>();

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const type = data.type || '';
        const description = (data.description || '').toLowerCase();
        const doctorId = data.doctorId || data.userId || '';

        if (type === 'subscription' || description.includes('subscription') || description.includes('plan')) {
          subscription++;
          if (doctorId) subscriptionDoctors.add(doctorId);
        } else if (type === 'topup' || description.includes('top-up') || description.includes('topup')) {
          topUp++;
          if (doctorId) topUpDoctors.add(doctorId);
        } else {
          premium++;
          if (doctorId) premiumDoctors.add(doctorId);
        }
      });

      return {
        total: snapshot.size,
        subscription,
        topUp,
        premium,
        subscriptionDoctorCount: subscriptionDoctors.size,
        topUpDoctorCount: topUpDoctors.size,
        premiumDoctorCount: premiumDoctors.size,
      };
    } catch (error) {
      console.error('❌ Error getting transaction counts:', error);
      return { total: 0, subscription: 0, topUp: 0, premium: 0 };
    }
  }

  /**
   * Get monthly revenue data starting from December 2025 for 12 months
   */
  private static async getMonthlyRevenueData() {
    try {
      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const monthlyData: any[] = [];
      // Start from December 2025
      const startYear = 2025;
      const startMonth = 11; // December (0-indexed)

      // Get data for 12 months starting from December 2025
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(startYear, startMonth + i, 1);
        const monthEnd = new Date(startYear, startMonth + i + 1, 0, 23, 59, 59, 999);

        const stats = await this.getRevenueStats(monthStart, monthEnd);
        const transactionCounts = await this.getTransactionCounts(monthStart, monthEnd);

        const monthName = monthStart.toLocaleString('en-US', { month: 'short' });
        const year = monthStart.getFullYear();

        monthlyData.push({
          month: `${monthName}'${year.toString().slice(-2)}`,
          subscription: stats.subscriptionRevenue,
          topup: stats.topUpRevenue,
          premium: stats.premiumAddOnRevenue,
          total: stats.totalRevenue,
          transactions: transactionCounts.total,
        });
      }

      return monthlyData;
    } catch (error) {
      console.error('❌ Error getting monthly revenue data:', error);
      return [];
    }
  }

  /**
   * Get subscription tier breakdown with doctor counts and revenue
   */
  private static async getSubscriptionTierBreakdown(startDate?: Date, endDate?: Date) {
    try {
      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const doctorsRef = collection(db, COLLECTIONS.DOCTORS);
      const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);

      // Get all active doctors
      const doctorsSnapshot = await getDocs(query(doctorsRef, where('isActive', '==', true)));

      // Initialize tier data
      const tierData: any = {
        Growth: { doctors: 0, revenue: 0 },
        Scale: { doctors: 0, revenue: 0 },
        Pro: { doctors: 0, revenue: 0 },
        Summit: { doctors: 0, revenue: 0 },
      };

      // Count doctors by plan
      doctorsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const plan = data.subscriptionPlan || data.plan || 'Starter';
        
        if (tierData[plan]) {
          tierData[plan].doctors++;
        }
      });

      // Get revenue for each tier
      const constraints: any[] = [
        where('status', '==', 'success'),
        where('type', '==', 'subscription'),
      ];

      if (startDate) {
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(startDate)));
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
      }

      const transactionsSnapshot = await getDocs(query(transactionsRef, ...constraints));

      transactionsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const description = (data.description || '').toLowerCase();
        const amount = data.amount || 0;

        // Match transaction to tier based on description or amount
        if (description.includes('growth') || (amount >= 9999 && amount <= 10999)) {
          tierData.Growth.revenue += amount;
        } else if (description.includes('scale') || (amount >= 19999 && amount <= 20999)) {
          tierData.Scale.revenue += amount;
        } else if (description.includes('pro') || (amount >= 29999 && amount <= 30999)) {
          tierData.Pro.revenue += amount;
        } else if (description.includes('summit') || (amount >= 49999 && amount <= 50999)) {
          tierData.Summit.revenue += amount;
        }
      });

      // Calculate total doctors and revenue for percentages
      const totalDoctors = Object.values(tierData).reduce((sum: number, tier: any) => sum + tier.doctors, 0);

      // Format the data
      return [
        {
          name: 'Growth',
          bookings: '250 Bookings / 30 Days',
          price: 999,
          yearlyPrice: 9999,
          doctors: tierData.Growth.doctors,
          revenue: tierData.Growth.revenue,
          percentage: totalDoctors > 0 ? Math.round((tierData.Growth.doctors / totalDoctors) * 100) : 0,
          isFree: false,
        },
        {
          name: 'Scale',
          bookings: '600 Bookings / 30 Days',
          price: 1999,
          yearlyPrice: 19999,
          doctors: tierData.Scale.doctors,
          revenue: tierData.Scale.revenue,
          percentage: totalDoctors > 0 ? Math.round((tierData.Scale.doctors / totalDoctors) * 100) : 0,
          isFree: false,
          isMostPopular: true,
        },
        {
          name: 'Pro',
          bookings: '1500 Bookings / 30 Days',
          price: 2999,
          yearlyPrice: 29999,
          doctors: tierData.Pro.doctors,
          revenue: tierData.Pro.revenue,
          percentage: totalDoctors > 0 ? Math.round((tierData.Pro.doctors / totalDoctors) * 100) : 0,
          isFree: false,
        },
        {
          name: 'Summit',
          bookings: 'Unlimited / 30 Days',
          price: 4999,
          yearlyPrice: 49999,
          doctors: tierData.Summit.doctors,
          revenue: tierData.Summit.revenue,
          percentage: totalDoctors > 0 ? Math.round((tierData.Summit.doctors / totalDoctors) * 100) : 0,
          isFree: false,
        },
      ];
    } catch (error) {
      console.error('❌ Error getting subscription tier breakdown:', error);
      return [];
    }
  }
}
