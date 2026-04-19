import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  Star,
  Share2,
  Video,
  Copy,
  Bell,
  User,
  BarChart3,
  Calendar,
  MessageSquare,
  Lock,
  CalendarDays,
  CheckCircle2,
  Sparkles,
  Menu,
  MapPin,
  Clock,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  MessageCircle,
  BrainCircuit,
  Send,
  Database
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import DashboardSidebar from './DashboardSidebar';
import ContactSupport from './ContactSupport';
import UnifiedChatWidget from './UnifiedChatWidget';
import PatientReviewsPanel from './PatientReviewsPanel';
import NotificationCenter from './NotificationCenter';
import { subscribeToDoctorNotifications, markNotificationRead, markAllNotificationsRead, deleteDoctorNotification, DoctorNotification } from '../services/doctorNotificationService';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import BirthdayCardNotification from './BirthdayCardNotification';
import DashboardPromoDisplay from './DashboardPromoDisplay';
import SocialMediaPromoBanner from './SocialMediaPromoBanner';
import DataExportBanner from './DataExportBanner';
import { sendPatientListViaWhatsApp } from '../services/whatsappService';
import { toast } from 'sonner';

interface Review {
  id: number;
  patientName: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
}

interface DoctorDashboardProps {
  doctorName: string;
  email: string;
  onLogout?: () => void;
  onMenuChange?: (menu: string) => void;
  incomingReviews?: Review[];
  selfCreatedReviews?: Review[];
  uploadedReviews?: Review[];
  onUploadReview?: (review: Review) => void;
  onDeleteReview?: (reviewId: number, source: 'incoming' | 'selfCreated' | 'uploaded') => void;
  onTestReviewSubmission?: () => void;
  onSupportRequest?: (request: { doctorName: string; doctorCode: string; message: string; rating: number }) => void;
  onCreatePlaceholderReview?: () => void;
  chambers?: Array<{
    id: number;
    name: string;
    address: string;
    startTime: string;
    endTime: string;
    schedule: string;
    booked: number;
    capacity: number;
    isActive: boolean;
  }>;
  activeAddOns?: string[];
  subscriptionData?: {
    bookingsCount: number;
    bookingsLimit: number;
    daysRemaining: number;
    trialEndDate: Date | null;
    trialStartDate: Date | null;
  };
  profilePhoto?: string;
  doctorStats?: {
    averageRating: number;
    totalReviews: number;
  };
  useDrPrefix?: boolean;
}

export default function DoctorDashboard({ doctorName, email, onLogout, onMenuChange, incomingReviews = [], selfCreatedReviews = [], uploadedReviews = [], onUploadReview, onDeleteReview, onTestReviewSubmission, onSupportRequest, onCreatePlaceholderReview, chambers = [], activeAddOns = [], subscriptionData, profilePhoto = '', doctorStats, useDrPrefix = true }: DoctorDashboardProps) {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  // Check if user is assistant and get allowed pages
  const isAssistant = !!localStorage.getItem('healqr_is_assistant');
  const assistantPagesStr = localStorage.getItem('healqr_assistant_pages');
  const assistantPages = assistantPagesStr ? JSON.parse(assistantPagesStr) : [];

  const handleDebugCheck = async () => {
    const logs: string[] = [];
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        logs.push('❌ No user logged in');
        setDebugLog(logs);
        return;
      }

      const { db, auth } = await import('../lib/firebase/config');
      const { collection, query, where, getDocs } = await import('firebase/firestore');

      const today = new Date();
      const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

      logs.push(`📅 TODAY'S DATE: ${todayStr}`);
      logs.push(`🕐 CURRENT TIME: ${today.toISOString()}`);
      logs.push(`🌍 TIMEZONE OFFSET: ${today.getTimezoneOffset()} minutes\n`);

      // Get all bookings for today
      const bookingsRef = collection(db!, 'bookings');
      const allTodayBookings = query(
        bookingsRef,
        where('appointmentDate', '==', todayStr)
      );

      const snap = await getDocs(allTodayBookings);
      logs.push(`📊 TOTAL BOOKINGS FOR TODAY: ${snap.size}\n`);

      snap.docs.forEach((doc, idx) => {
        const data = doc.data() as any;
        logs.push(`\n📋 BOOKING ${idx + 1}:`);
        logs.push(`   ID: ${doc.id}`);
        logs.push(`   Patient: ${data.patientName}`);
        logs.push(`   Phone: ${data.phone}`);
        logs.push(`   Chamber ID: ${data.chamberId}`);
        logs.push(`   Doctor ID: ${data.doctorId}`);
        logs.push(`   Date: ${data.appointmentDate}`);
        logs.push(`   Type: ${data.type}`);
        logs.push(`   Status: ${data.status}`);
      });

      // ============================================
      // 🔔 FCM TOKEN STATUS CHECK
      // ============================================
      logs.push(`\n\n🔔 FCM TOKEN STATUS:`);
      logs.push(`════════════════════════════════════════\n`);

      const registrationsRef = collection(db!, 'doctorRegistrations');
      const tokensSnap = await getDocs(registrationsRef);

      if (tokensSnap.empty) {
        logs.push(`⚠️  NO FCM TOKENS REGISTERED`);
        logs.push(`   Patients need to:`);
        logs.push(`   1. Check consent checkbox during booking`);
        logs.push(`   2. Click "Allow" on browser permission popup`);
        logs.push(`   3. Complete booking`);
      } else {
        logs.push(`✅ TOTAL REGISTERED TOKENS: ${tokensSnap.size}\n`);
        tokensSnap.docs.forEach((doc, idx) => {
          const data = doc.data();
          logs.push(`\n📱 TOKEN ${idx + 1}:`);
          logs.push(`   Phone: ${data.patientPhone}`);
          logs.push(`   Device: ${data.deviceType}`);
          logs.push(`   Active: ${data.isActive ? '✅ YES' : '❌ NO'}`);
          logs.push(`   Registered: ${data.createdAt?.toDate?.()?.toLocaleString() || 'N/A'}`);
        });
      }

      setDebugLog(logs);
    } catch (error) {
      logs.push(`❌ ERROR: ${error}`);
      setDebugLog(logs);
    }
  };
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [referralSendingActive, setReferralSendingActive] = useState(true);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // Load referral sending toggle
  useEffect(() => {
    (async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) return;
      const { db: fireDb } = await import('../lib/firebase/config');
      if (!fireDb) return;
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(fireDb, 'doctors', userId));
      if (snap.exists()) {
        setReferralSendingActive(snap.data().referralSendingActive !== false);
      }
    })();
  }, []);

  // Promo state
  const [showSocialKitPromo, setShowSocialKitPromo] = useState(true);

  // Birthday card state
  const [isBirthday, setIsBirthday] = useState(false);
  const [birthdayCardImageUrl, setBirthdayCardImageUrl] = useState('');
  const [birthdayCardDeliveryTime, setBirthdayCardDeliveryTime] = useState('');
  const [doctorBirthday, setDoctorBirthday] = useState('');

  // Dynamic Health Tip
  const [dailyHealthTip, setDailyHealthTip] = useState<any>(null);

  // Chamber state with booking counts
  const [chambersList, setChambersList] = useState<Array<{
    id: number;
    name: string;
    address: string;
    startTime: string;
    endTime: string;
    schedule: string;
    booked: number;
    capacity: number;
    isActive: boolean;
    clinicPhone?: string | null;
    isExpired?: boolean;
    manualClinicId?: string | null;
    clinicCode?: string | null;
    rescheduledStartTime?: string;
    rescheduledEndTime?: string;
  }>>([]);

  // Notifications State
  const [realTimeNotifications, setRealTimeNotifications] = useState<DoctorNotification[]>([]);
  const unreadNotificationCount = realTimeNotifications.filter(n => !n.read).length;

  // Subscribe to real-time notifications
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const unsubscribe = subscribeToDoctorNotifications(userId, (notifications) => {
      setRealTimeNotifications(notifications);
    });

    return () => unsubscribe();
  }, []);

  // Handler for marking notification as read
  const handleMarkNotificationRead = async (id: string) => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    await markNotificationRead(userId, id);
  };

  // Handler for marking all as read
  const handleMarkAllNotificationsRead = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    const unreadIds = realTimeNotifications.filter(n => !n.read).map(n => n.id!);
    if (unreadIds.length > 0) {
      await markAllNotificationsRead(userId, unreadIds);
    }
  };

  // Handler for deleting notification
  const handleDeleteNotification = async (id: string) => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    await deleteDoctorNotification(userId, id);
  };

  const handleGeneratePatientList = async (notificationId: string, metadata: any) => {
    if (!metadata || !metadata.chamberId) {
      console.error('❌ [DASHBOARD] Missing chamberId in metadata:', metadata);
      toast.error('Chamber information missing in notification');
      return;
    }

    // Find the chamber details from our list
    const chamber = chambersList.find(c => c.id === metadata.chamberId);

    if (chamber) {
      await sendPatientListViaWhatsApp({
        id: chamber.id,
        name: chamber.name,
        clinicPhone: chamber.clinicPhone || metadata.clinicPhone || '',
        startTime: chamber.startTime,
        endTime: chamber.endTime
      }, doctorName);
    } else {
      // Fallback: If chamber not in today's list, try to use metadata directly
      if (metadata.clinicName && (metadata.clinicPhone || metadata.clinicId)) {
          await sendPatientListViaWhatsApp({
            id: metadata.chamberId,
            name: metadata.clinicName,
            clinicPhone: metadata.clinicPhone || '',
            startTime: metadata.startTime || 'N/A',
            endTime: metadata.endTime || 'N/A'
          }, doctorName);
      } else {
        toast.error('Chamber details could not be found. Please go to Today\'s Schedule.');
      }
    }
  };

  // Load birthday card data on mount
  useEffect(() => {
    const loadBirthdayData = async () => {
      try {
        // Get userId from localStorage
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        // ============================================
        // 🔔 AUTO-REGISTER DOCTOR FOR FCM NOTIFICATIONS
        // ============================================
        // Run in background to avoid blocking dashboard load
        const registerFCM = async () => {
          try {
            const { requestNotificationPermission } = await import('../services/fcm.service');

            // Check current notification permission status
            const permission = Notification.permission;

            if (permission === 'default') {
              // Not yet asked - prompt the doctor
              await requestNotificationPermission(userId, 'doctor');
            } else if (permission === 'granted') {
              // Already granted - just register token
              await requestNotificationPermission(userId, 'doctor');
            } else {
              // Permission denied - log it
            }
          } catch (fcmError) {
            console.error('❌ FCM auto-registration failed:', fcmError);
          }
        };
        registerFCM(); // Fire and forget

        // Load doctor's DOB from Firestore
        const { db } = await import('../lib/firebase/config');
        const { doc, getDoc, updateDoc } = await import('firebase/firestore');

        const doctorRef = doc(db!, 'doctors', userId);
        const doctorSnap = await getDoc(doctorRef);

        if (!doctorSnap.exists()) return;

        const doctorData = doctorSnap.data();
        const dob = doctorData.dob; // Format: DD-MM-YYYY or MM-DD-YYYY

        if (!dob) return;

        // Parse DOB and check if today is birthday
        const today = new Date();
        const todayMonth = today.getMonth() + 1; // 1-12
        const todayDay = today.getDate(); // 1-31

        // Handle multiple date formats: DD-MM-YYYY, MM-DD-YYYY, YYYY-MM-DD
        let birthMonth: number, birthDay: number;

        if (dob.includes('-')) {
          const parts = dob.split('-');

          // Check if YYYY-MM-DD format (year is 4 digits)
          if (parts[0].length === 4) {
            // YYYY-MM-DD format
            birthMonth = parseInt(parts[1]);
            birthDay = parseInt(parts[2]);
          } else if (parseInt(parts[0]) <= 12) {
            // MM-DD-YYYY format
            birthMonth = parseInt(parts[0]);
            birthDay = parseInt(parts[1]);
          } else {
            // DD-MM-YYYY format
            birthDay = parseInt(parts[0]);
            birthMonth = parseInt(parts[1]);
          }
        } else {
          return; // Invalid format
        }

        const isTodayBirthday = (todayMonth === birthMonth && todayDay === birthDay);
        setIsBirthday(isTodayBirthday);
        setDoctorBirthday(`${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`);

        if (isTodayBirthday) {
          // Load birthday card template from adminProfiles global templates
          let templates: any[] = [];


          try {
            const { doc: firestoreDoc, getDoc: firestoreGetDoc } = await import('firebase/firestore');

            // Load from adminProfiles/super_admin/globalTemplates
            const adminRef = firestoreDoc(db!, 'adminProfiles', 'super_admin');
            const adminSnap = await firestoreGetDoc(adminRef);

            if (adminSnap.exists()) {
              const adminData = adminSnap.data();
              if (adminData.globalTemplates && Array.isArray(adminData.globalTemplates)) {
                templates = adminData.globalTemplates;
              } else {
              }
            } else {
            }
          } catch (e) {
            console.error('❌ Error loading global templates from adminProfiles:', e);
          }

          // Find published birthday card
          const birthdayCard = templates.find(
            (t: any) => t.category === 'birthday-card' && t.isPublished
          );


          if (birthdayCard) {
            setBirthdayCardImageUrl(birthdayCard.imageUrl);
          }

          // Check if card was already delivered today
          const todayDateString = `${today.getFullYear()}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;
          const lastDelivery = doctorData.birthdayCardDelivery;

          if (!lastDelivery || !lastDelivery.startsWith(todayDateString)) {
            // First time showing today - save delivery timestamp
            const deliveryTimestamp = new Date().toISOString();
            setBirthdayCardDeliveryTime(deliveryTimestamp);

            await updateDoc(doctorRef, {
              birthdayCardDelivery: deliveryTimestamp
            });
          } else {
            // Already delivered today - use existing timestamp
            setBirthdayCardDeliveryTime(lastDelivery);
          }
        }
      } catch (error) {
        console.error('Error loading birthday data:', error);
      }
    };

    loadBirthdayData();
  }, []);

  // Load Dynamic Health Tip
  useEffect(() => {
    const loadHealthTip = async () => {
      try {
        const { db } = await import('../lib/firebase/config');
        const { doc, getDoc } = await import('firebase/firestore');

        const adminRef = doc(db!, 'adminProfiles', 'super_admin');
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists()) {
          const data = adminSnap.data();
          const templates = data.globalTemplates || [];

          // Find published health tips
          const healthTips = templates.filter(
            (t: any) => t.category === 'health-tip' && t.isPublished
          );

          if (healthTips.length > 0) {
            // Pick a random one or the latest one
            // Let's pick a random one for variety each reload
            const randomTip = healthTips[Math.floor(Math.random() * healthTips.length)];
            setDailyHealthTip(randomTip);
          }
        }
      } catch (error) {
        console.error('Error loading health tip:', error);
      }
    };
    loadHealthTip();
  }, []);

  // Load Dynamic Health Tip
  useEffect(() => {
    const loadHealthTip = async () => {
      try {
        const { db } = await import('../lib/firebase/config');
        const { doc, getDoc } = await import('firebase/firestore');

        const adminRef = doc(db!, 'adminProfiles', 'super_admin');
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists()) {
          const data = adminSnap.data();
          const templates = data.globalTemplates || [];

          // Find published health tips
          const healthTips = templates.filter(
            (t: any) => t.category === 'health-tip' && t.isPublished
          );

          if (healthTips.length > 0) {
            // Pick a random one or the latest one
            // Let's pick a random one for variety each reload
            const randomTip = healthTips[Math.floor(Math.random() * healthTips.length)];
            setDailyHealthTip(randomTip);
          }
        }
      } catch (error) {
        console.error('Error loading health tip:', error);
      }
    };
    loadHealthTip();
  }, []);

  // Load chambers with booking counts for next 24 hours
  useEffect(() => {
    const loadChambersWithBookings = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          setChambersList([]);
          return;
        }

        const { db } = await import('../lib/firebase/config');
        const { doc, getDoc, collection, query, where, getDocs, deleteDoc } = await import('firebase/firestore');

        // Load doctor's chambers from Firestore
        const doctorRef = doc(db!, 'doctors', userId);
        const doctorSnap = await getDoc(doctorRef);

        if (!doctorSnap.exists()) {
          setChambersList([]);
          return;
        }

        const doctorData = doctorSnap.data();
        const allChambers = doctorData.chambers || [];

        // Get current date and next 24 hours
        const now = new Date();
        const currentDayName = now.toLocaleDateString('en-US', { weekday: 'long' });
        // FIX: Use local timezone, not UTC
        const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

        // Filter chambers for today (show all, isExpired will be marked for display)
        const todaysChambers = allChambers.filter((chamber: any) => {
          // Don't filter by end-time here - we'll show all chambers with CHAMBER TIME OVER badge if expired

          if (chamber.frequency === 'Daily') {
            return true;
          }

          if (chamber.frequency === 'Custom' && chamber.customDate) {
            const customDate = new Date(chamber.customDate);
            const customStr = customDate.toISOString().split('T')[0];
            return customStr === todayStr;
          }

          if (chamber.days && Array.isArray(chamber.days)) {
            return chamber.days.includes(currentDayName);
          }

          return false;
        });

        // Get booking counts for each chamber
        const chambersWithBookings = await Promise.all(
          todaysChambers.map(async (chamber: any) => {
            const bookingsRef = collection(db!, 'bookings');

            // Query 1: QR bookings
            const qrBookingsQuery = query(
              bookingsRef,
              where('chamberId', '==', chamber.id),
              where('appointmentDate', '==', todayStr)
            );

            const qrBookingsSnap = await getDocs(qrBookingsQuery);
            // Count ALL bookings (including cancelled) - cancelled slots are still booked slots
            const qrBookedCount = qrBookingsSnap.size;

            // Only count QR bookings for chamber booking status
            // Walk-in patients are shown separately in "Walk-In Patients" section

            // Determine schedule display text
            let scheduleText = '';
            if (chamber.frequency === 'Daily') {
              scheduleText = 'Every Day';
            } else if (chamber.frequency === 'Custom' && chamber.customDate) {
              const customDate = new Date(chamber.customDate);
              scheduleText = customDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else if (chamber.days && chamber.days.length > 0) {
              scheduleText = chamber.days.join(', ');
            }

            // Convert start time to minutes for sorting
            const [startHour, startMin] = (chamber.startTime || '00:00').split(':').map(Number);
            const startMinutes = startHour * 60 + startMin;

            // Check if chamber is expired
            let isExpired = false;
            if (chamber.endTime) {
              const [endHour, endMin] = chamber.endTime.split(':').map(Number);
              const chamberEndTime = new Date(now);
              chamberEndTime.setHours(endHour, endMin, 0, 0);
              isExpired = chamberEndTime < now;
            }

            // Check for today's reschedule
            let rescheduledStartTime: string | undefined;
            let rescheduledEndTime: string | undefined;
            if (chamber.todayReschedule && chamber.todayReschedule.date === todayStr) {
              rescheduledStartTime = chamber.todayReschedule.startTime;
              rescheduledEndTime = chamber.todayReschedule.endTime;
            }

            // Use effective time for sorting (rescheduled > original)
            const effectiveStart = rescheduledStartTime || chamber.startTime;
            const [effHour, effMin] = (effectiveStart || '00:00').split(':').map(Number);
            const effectiveStartMinutes = effHour * 60 + effMin;

            // Check expiry against effective end time
            if (rescheduledEndTime) {
              const [rEndHour, rEndMin] = rescheduledEndTime.split(':').map(Number);
              const rescheduledEndDate = new Date(now);
              rescheduledEndDate.setHours(rEndHour, rEndMin, 0, 0);
              isExpired = rescheduledEndDate < now;
            }

            return {
              id: chamber.id,
              name: chamber.chamberName,
              address: chamber.chamberAddress,
              startTime: chamber.startTime,
              endTime: chamber.endTime,
              schedule: scheduleText,
              booked: qrBookedCount, // Only QR bookings (Walk-ins shown separately)
              capacity: chamber.maxCapacity,
              isActive: chamber.isActive !== false,
              startMinutes: effectiveStartMinutes, // For sorting
              isExpired, // For sorting expired to bottom
              manualClinicId: chamber.manualClinicId || null,
               clinicCode: chamber.clinicCode || null,
               clinicPhone: chamber.clinicPhone || null,
               rescheduledStartTime,
               rescheduledEndTime
             };
          })
        );

        // Sort chambers: active by start time ascending, then expired by start time ascending at bottom
        const sortedChambers = chambersWithBookings.sort((a, b) => {
          // Expired chambers go to bottom
          if (a.isExpired && !b.isExpired) return 1;
          if (!a.isExpired && b.isExpired) return -1;
          // Both active or both expired: sort by start time ascending
          return (a.startMinutes || 0) - (b.startMinutes || 0);
        });

        // 🚫 FILTER OUT CLINIC CHAMBERS IF CLINIC IS OFF TODAY
        const filteredChambers = [];

        for (const chamber of sortedChambers) {
          const originalChamber = allChambers.find((c: any) => c.id === chamber.id);
          const clinicId = originalChamber?.clinicId;

          if (clinicId) {

            // Load clinic schedule to check if clinic is off today
            try {
              const scheduleDoc = await getDoc(doc(db!, 'clinicSchedules', clinicId));
              if (scheduleDoc.exists()) {
                const scheduleData = scheduleDoc.data();
                const plannedOffPeriods = scheduleData.plannedOffPeriods || [];

                // Check if today falls within any active planned off period
                let isClinicOff = false;
                for (const period of plannedOffPeriods) {
                  if (period.status === 'active') {
                    const periodStart = new Date(period.startDate);
                    const periodEnd = new Date(period.endDate);
                    const today = new Date(todayStr);

                    if (today >= periodStart && today <= periodEnd) {
                      isClinicOff = true;
                      break;
                    }
                  }
                }

                if (!isClinicOff) {
                  filteredChambers.push(chamber);
                }
              } else {
                // No clinic schedule found, include chamber
                filteredChambers.push(chamber);
              }
            } catch (error) {
              console.error(`❌ Error checking clinic schedule for ${clinicId}:`, error);
              // On error, include chamber
              filteredChambers.push(chamber);
            }
          } else {
            // No clinicId (home chamber), always include
            filteredChambers.push(chamber);
          }
        }

        setChambersList(filteredChambers);
      } catch (error) {
        console.error('Error loading chambers:', error);
        setChambersList([]);
      }
    };

    loadChambersWithBookings();
  }, []);

  // 🔔 AUTO-TRIGGER: Expired Clinic Notification (Global)
  useEffect(() => {
    const checkExpiredClinics = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId || chambersList.length === 0) return;

      const todayStr = new Date().toISOString().split('T')[0];

      for (const chamber of chambersList) {
        // Detect session over for non-linked clinics
        if (chamber.manualClinicId && chamber.isExpired) {
          const notificationKey = `healqr_notified_${chamber.manualClinicId}_${todayStr}`;

          if (!localStorage.getItem(notificationKey)) {

            const { addDoctorNotification } = await import('../services/doctorNotificationService');

            await addDoctorNotification(userId, {
              type: 'system',
              category: 'alert',
              title: 'Chamber Session Ended',
              message: `Your session at ${chamber.name} has ended. Please generate and send the patient list to the clinic.`,
              metadata: {
                clinicId: chamber.manualClinicId,
                chamberId: chamber.id,
                clinicName: chamber.name,
                chamberAddress: chamber.address,
                clinicPhone: chamber.clinicPhone || undefined,
                startTime: chamber.startTime,
                endTime: chamber.endTime
              }
            });

            localStorage.setItem(notificationKey, 'true');
          }
        }
      }
    };

    checkExpiredClinics();
    // Re-check periodically or when chamber list updates
    const interval = setInterval(checkExpiredClinics, 60000); // Every minute
    return () => clearInterval(interval);
  }, [chambersList]);

  const handleVideoTutorialClick = () => {
    // Navigate to video library
    if (onMenuChange) {
      onMenuChange('video-library');
    }
  };

  const websiteUrl = 'https://www.healqr.com';

  const handleShare = (platform: string) => {
    const shareText = 'Book your medical appointments online with HealQR - Quick, Easy & Secure';
    const encodedUrl = encodeURIComponent(websiteUrl);
    const encodedText = encodeURIComponent(shareText);

    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodedText}&body=Check out HealQR: ${websiteUrl}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(websiteUrl);
        alert('Link copied to clipboard!');
        setShareMenuOpen(false);
        return;
      case 'referral-link': {
        // Generate referral link for external agents
        setShareMenuOpen(false);
        (async () => {
          try {
            const userId = localStorage.getItem('userId') || '';
            const name = localStorage.getItem('healqr_user_name') || doctorName || 'Doctor';
            const { db: fireDb } = await import('../lib/firebase/config');
            if (!userId || !fireDb) { toast.error('Please log in first'); return; }
            const { collection: col, query: q, where: w, getDocs: gd, addDoc: ad, serverTimestamp: st } = await import('firebase/firestore');
            const existing = await gd(q(col(fireDb, 'referralLinks'), w('createdBy', '==', userId)));
            let code: string;
            if (!existing.empty) {
              code = existing.docs[0].data().code;
            } else {
              code = Math.random().toString(36).substring(2, 8).toUpperCase();
              await ad(col(fireDb, 'referralLinks'), {
                code,
                createdBy: userId,
                createdByName: name,
                createdByRole: 'doctor',
                createdAt: st()
              });
            }
            const link = `${window.location.origin}/?ref=${code}`;
            try {
              await navigator.clipboard.writeText(link);
              toast.success('Referral link copied!', { description: link, duration: 5000 });
            } catch {
              toast('Your referral link:', { description: link, duration: 8000 });
            }
          } catch (err) {
            console.error('Referral link error:', err);
            toast.error('Failed to generate link');
          }
        })();
        return;
      }
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      setShareMenuOpen(false);
    }
  };

  // Reviews data - Use cumulative stats from Firestore via props
  // Compare with local arrays to ensure real-time accuracy and fix 0.0 rating issue
  const localTotal = incomingReviews.length + selfCreatedReviews.length;
  // Use doctorStats.totalReviews as primary (loaded via real-time listener), fallback to local count
  const totalReviews = (doctorStats?.totalReviews && doctorStats.totalReviews > 0)
    ? doctorStats.totalReviews
    : localTotal;

  // Calculate average rating with fallback to local calculation if Firestore stats are zero
  const localAllReviews = [...incomingReviews, ...selfCreatedReviews];
  const localAvg = localAllReviews.length > 0
    ? localAllReviews.reduce((sum, r) => sum + r.rating, 0) / localAllReviews.length
    : 0;
  const averageRating = (doctorStats?.averageRating && doctorStats.averageRating > 0)
    ? doctorStats.averageRating
    : localAvg;

  // 🎯 FREE TRIAL DATA - Using real subscription data from Firestore
  // --- FREE, NO LIMIT, MONTHLY BOOKINGS ---
  // Calculate current month range
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
  const firstOfMonthStr = firstOfMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const lastOfMonthStr = lastOfMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  // Count bookings for current month
  const [monthlyBookings, setMonthlyBookings] = useState(0);
  useEffect(() => {
    const loadMonthlyBookings = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) return;
        const { db } = await import('../lib/firebase/config');
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const bookingsRef = collection(db!, 'bookings');
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const bookingsQuery = query(
          bookingsRef,
          where('doctorId', '==', userId),
          where('createdAt', '>=', start),
          where('createdAt', '<', end)
        );
        const snap = await getDocs(bookingsQuery);
        setMonthlyBookings(snap.size);
      } catch (e) {
        setMonthlyBookings(0);
      }
    };
    loadMonthlyBookings();
  }, []);

  // Practice overview analytics state
  const [analyticsData, setAnalyticsData] = useState<{
    totalScans: number;
    totalBookings: number;
    qrBookings: number;
    walkinBookings: number;
    dropOuts: number;
    cancelled: number;
  }>({
    totalScans: 0,
    totalBookings: 0,
    qrBookings: 0,
    walkinBookings: 0,
    dropOuts: 0,
    cancelled: 0
  });

  // Load practice analytics for current plan period
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const { db } = await import('../lib/firebase/config');
        const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');

        // Calculate current month range
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month at 00:00
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // Last day of current month at 23:59:59

        // Get doctor data for sync check
        const doctorRef = doc(db!, 'doctors', userId);
        const doctorSnap = await getDoc(doctorRef);

        if (!doctorSnap.exists()) return;

        const doctorData = doctorSnap.data();

        // Query bookings collection for all metrics
        const bookingsRef = collection(db!, 'bookings');
        const bookingsQuery = query(
          bookingsRef,
          where('doctorId', '==', userId)
        );

        const bookingsSnap = await getDocs(bookingsQuery);

        let qrBookings = 0;
        let walkinBookings = 0;
        let dropOuts = 0;
        let cancelled = 0;

        let totalScans = 0;

        bookingsSnap.docs.forEach(doc => {
          const data = doc.data() as any;
          const bookingDate = data.createdAt?.toDate() || data.date?.toDate();

          // Only count bookings within current month
          if (bookingDate && bookingDate >= monthStart && bookingDate <= monthEnd) {
            // Count total scans (all QR bookings = scans, regardless of status)
            if (data.type !== 'walkin_booking') {
              totalScans++;
            }

            // Count QR bookings (non-cancelled)
            if (data.type !== 'walkin_booking') {
              if (data.status !== 'cancelled' && !data.isCancelled) {
                qrBookings++;
              }
            }

            // Count walk-in bookings
            if (data.type === 'walkin_booking') {
              if (data.status !== 'cancelled' && !data.isCancelled) {
                walkinBookings++;
              }
            }

            // Count drop-outs (booked but not seen - Eye icon not pressed)
            const appointmentDate = data.appointmentDate || (data.date?.toDate?.() ? (data.date as any).toDate().toISOString().split('T')[0] : null);
            const today = new Date().toISOString().split('T')[0];

            if (appointmentDate && appointmentDate < today) {
              // Past appointments
              if (data.status !== 'cancelled' && !data.isCancelled && !data.isMarkedSeen) {
                dropOuts++;
              }
            }

            // Count cancelled bookings
            if (data.status === 'cancelled' || data.isCancelled === true) {
              cancelled++;
            }
          }
        });

        const totalBookings = qrBookings + walkinBookings;

        // SYNC CHECK: If calculated bookings > stored bookingsCount, update Firestore
        if (doctorData.bookingsCount === undefined || totalBookings > doctorData.bookingsCount) {
          const { updateDoc } = await import('firebase/firestore');
          await updateDoc(doctorRef, {
            bookingsCount: totalBookings
          });
        }

        setAnalyticsData({
          totalScans,
          totalBookings,
          qrBookings,
          walkinBookings,
          dropOuts,
          cancelled
        });

      } catch (error) {
        console.error('❌ Error loading analytics:', error);
      }
    };

    loadAnalytics();
  }, []);

  // Practice overview data - Vibrant colors for black background
  const practiceOverviewData: Array<{ name: string; value: number; fill: string }> = [
    { name: 'Total Visitors', value: analyticsData.totalScans, fill: '#3b82f6' }, // Vibrant Blue
    { name: 'Total Bookings', value: analyticsData.totalBookings, fill: '#10b981' }, // Vibrant Green
    { name: 'QR Bookings', value: analyticsData.qrBookings, fill: '#8b5cf6' }, // Vibrant Purple
    { name: 'Walk-in Bookings', value: analyticsData.walkinBookings, fill: '#6366f1' }, // Vibrant Indigo
    { name: 'Drop Outs', value: analyticsData.dropOuts, fill: '#ef4444' }, // Vibrant Red
    { name: 'Cancelled', value: analyticsData.cancelled, fill: '#374151' }, // Dark Gray
  ];

  // Transform chambers data to upcoming schedule format
  const upcomingChambers = chambersList
    .filter(chamber => chamber.isActive)
    .map(chamber => ({
      id: chamber.id,
      chamberName: chamber.name,
      address: chamber.address,
      startTime: chamber.startTime,
      endTime: chamber.endTime,
      date: 'today',
      booked: chamber.booked,
      capacity: chamber.capacity,
      isExpired: (chamber as any).isExpired,
      rescheduledStartTime: chamber.rescheduledStartTime,
      rescheduledEndTime: chamber.rescheduledEndTime
    }));

  const hasChambers = upcomingChambers.length > 0;

  // usagePercentage for display purposes
  // usagePercentage removed: no longer needed in free mode
  // isBookingBlocked removed: no longer needed in free mode

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Sidebar - Works for both mobile and desktop */}
      <DashboardSidebar
        activeMenu={activeMenu}
        onMenuChange={(menu) => {
          setActiveMenu(menu);
          if (onMenuChange) {
            onMenuChange(menu);
          }
        }}
        onLogout={onLogout}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        activeAddOns={activeAddOns}
        isAssistant={isAssistant}
        assistantAllowedPages={assistantPages}
        // isBookingBlocked removed: no longer needed in free mode
      />

      {/* Main Content Container */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top Header - Fixed */}
        <header className="bg-black border-b border-gray-900 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button - 3 Lines Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
            >
              <Menu className="w-5 h-5 text-emerald-500" />
            </button>
            <h2 className="text-lg md:text-xl">Dashboard</h2>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Share Button with Popover */}
            <Popover open={shareMenuOpen} onOpenChange={setShareMenuOpen}>
              <PopoverTrigger asChild>
                <button className="w-9 h-9 md:w-10 md:h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors">
                  <Share2 className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4 bg-zinc-900 border-zinc-800" align="end">
                <div className="space-y-3">
                  <div className="mb-3">
                    <h3 className="text-white mb-1">Share HealQR</h3>
                    <p className="text-gray-400 text-sm">Share www.healqr.com with others</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleShare('facebook')}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors"
                    >
                      <Facebook className="w-4 h-4" />
                      <span className="text-sm">Facebook</span>
                    </button>

                    <button
                      onClick={() => handleShare('twitter')}
                      className="flex items-center gap-2 px-3 py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 rounded-lg transition-colors"
                    >
                      <Twitter className="w-4 h-4" />
                      <span className="text-sm">Twitter</span>
                    </button>

                    <button
                      onClick={() => handleShare('linkedin')}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-700/20 hover:bg-blue-700/30 text-blue-400 rounded-lg transition-colors"
                    >
                      <Linkedin className="w-4 h-4" />
                      <span className="text-sm">LinkedIn</span>
                    </button>

                    <button
                      onClick={() => handleShare('whatsapp')}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm">WhatsApp</span>
                    </button>

                    <button
                      onClick={() => handleShare('email')}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-700/20 hover:bg-gray-700/30 text-gray-400 rounded-lg transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">Email</span>
                    </button>

                    <button
                      onClick={() => handleShare('copy')}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      <span className="text-sm">Copy Link</span>
                    </button>
                  </div>

                  <div className="pt-3 border-t border-zinc-800">
                    {referralSendingActive && (
                    <button
                      onClick={() => handleShare('referral-link')}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all mb-3"
                      style={{ background: 'linear-gradient(135deg, #92400e 0%, #c2410c 50%, #be123c 100%)', border: '1px solid #f59e0b55' }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.3)' }}>
                        <Send className="w-4 h-4 text-amber-200" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-bold text-amber-100">Generate Referral Link</span>
                        <p className="text-[10px] text-amber-300/80">Share with pharmacists, receptionists & agents</p>
                      </div>
                    </button>
                    )}
                    <div className="flex items-center gap-2 bg-zinc-950 rounded px-3 py-2">
                      <span className="text-gray-400 text-sm flex-1 truncate">{websiteUrl}</span>
                      <button
                        onClick={() => handleShare('copy')}
                        className="text-emerald-500 hover:text-emerald-400"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Video Tutorial Button */}
            <button
              onClick={handleVideoTutorialClick}
              className="w-9 h-9 md:w-10 md:h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
              title="Video Tutorials"
            >
              <Video className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            </button>

            {/* Notification Button */}
            <button
              onClick={() => setNotificationOpen(true)}
              className="w-9 h-9 md:w-10 md:h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors relative"
            >
              <Bell className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-[10px] text-white flex items-center justify-center border-2 border-black">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Profile Button */}
            <div className="w-9 h-9 md:w-10 md:h-10 bg-emerald-500 rounded-full flex items-center justify-center overflow-hidden">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8">
            {/* Welcome Section */}
          <div className="mb-6 md:mb-8">
            {/* 🇮🇳 Indian Tricolor Header: Saffron → White → Green */}
            {/* Saffron: Name */}
            <div className="w-full mb-3">
              <div className="w-full flex items-center justify-center rounded-xl bg-orange-500 text-white font-bold py-3 text-base shadow shadow-orange-200">
                <h1 className="text-lg md:text-xl">
                  Welcome Back, {useDrPrefix ? 'Dr. ' : ''}{doctorName}!
                </h1>
              </div>
            </div>

            {/* White: BrainDeck */}
            <div className="w-full mb-3">
              <button
                onClick={() => onMenuChange?.('braindeck')}
                className="w-full flex items-center justify-center rounded-xl bg-white text-blue-600 font-bold py-3 text-base border border-blue-200 shadow"
                style={{ letterSpacing: '0.02em' }}
              >
                <BrainCircuit className="w-5 h-5 mr-2" />
                healQR BrainDeck
              </button>
            </div>

            {/* Green: Encrypted Badge */}
            <div className="w-full mb-3">
              <div className="w-full flex items-center justify-center rounded-xl bg-green-600 text-white font-bold py-3 text-base shadow shadow-green-200">
                <Lock className="w-5 h-5 mr-2" />
                Data is encrypted
              </div>
            </div>

            {/* Rating & Reviews */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                {[...Array(5)].map((_, i) => {
                  const isFilled = i < Math.floor(averageRating);
                  return (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${isFilled ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'}`}
                    />
                  );
                })}
                <span className="ml-2">{averageRating.toFixed(1)}/5</span>
                <button
                  onClick={() => setReviewsOpen(true)}
                  className="text-emerald-500 text-sm hover:text-emerald-400 hover:underline transition-colors cursor-pointer"
                >
                  {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                </button>
              </div>
            </div>
          </div>

          {/* Single Column Layout */}
          <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">

            {/* Data Export Reminder Banner */}
            <DataExportBanner mode="doctor" onNavigate={() => onMenuChange?.('data-management')} />

            <div style={{ background: 'linear-gradient(to bottom right, rgb(16, 185, 129), rgb(5, 150, 105))' }} className="text-white rounded-xl p-6 relative overflow-hidden">
               <div className="flex flex-col md:flex-row gap-6 md:gap-8 relative z-10">
                 {/* Left Side (40%) - Booking Info */}
                 <div className="md:w-[40%] flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/20 pb-4 md:pb-0 md:pr-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-white/20 text-white border-0 hover:bg-white/30">
                        Free
                      </Badge>
                      <Badge className="bg-green-700 text-white border-0 hover:bg-green-800">
                        Active
                      </Badge>
                    </div>
                    <div>
                      <div className="text-2xl md:text-3xl font-bold mb-1">
                        {analyticsData.totalBookings} Bookings
                      </div>
                      <div className="text-xs text-emerald-100 opacity-80">
                         {firstOfMonthStr} – {lastOfMonthStr}
                      </div>
                    </div>
                 </div>

                 {/* Right Side (60%) - Social Media Promo */}
                 <div className="md:w-[60%] pl-0 md:pl-12">
                    {showSocialKitPromo && (
                      <SocialMediaPromoBanner
                        compact={true}
                        onNavigate={() => {
                          if (onMenuChange) {
                            onMenuChange('social-kit');
                          } else {
                            console.error('❌ onMenuChange is missing!');
                          }
                        }}
                      />
                    )}
                 </div>
               </div>
            </div>

            {/* Birthday Card Notification - Only shows if uploaded image exists, displays for 24 hours */}
            {isBirthday && birthdayCardDeliveryTime && birthdayCardImageUrl && (
              <BirthdayCardNotification
                doctorName={doctorName}
                cardImageUrl={birthdayCardImageUrl}
                deliveryTimestamp={birthdayCardDeliveryTime}
              />
            )}

            {/* Practice Overview Chart */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-500" />
                  <CardTitle className="text-white text-xl">Practice Overview (Current Plan Period)</CardTitle>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Track your practice performance metrics and patient engagement analytics.
                </p>
              </CardHeader>
              <CardContent>
                <div className="bg-black rounded-xl p-6">
                  {/* Custom Bar Chart */}
                  <div className="space-y-6">
                    {practiceOverviewData.map((item, index) => {
                      const maxValue = Math.max(...practiceOverviewData.map(d => d.value), 1);
                      const percentage = (item.value / maxValue) * 100;

                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-white font-semibold text-sm">{item.name}</span>
                            <span className="text-white font-bold text-lg">{item.value}</span>
                          </div>
                          <div className="relative h-8 bg-zinc-900 rounded-lg overflow-hidden">
                            <div
                              className="absolute top-0 left-0 h-full rounded-lg transition-all duration-1000 ease-out"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: item.fill,
                                boxShadow: `0 0 20px ${item.fill}80`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-zinc-800">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{analyticsData.totalScans}</div>
                      <div className="text-xs text-gray-400 mt-1">Total Visitors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{analyticsData.totalBookings}</div>
                      <div className="text-xs text-gray-400 mt-1">Total Bookings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">{analyticsData.cancelled}</div>
                      <div className="text-xs text-gray-400 mt-1">Cancelled</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Promotional Templates - Always show (birthday promo or regular promo) */}
            <DashboardPromoDisplay doctorBirthday={doctorBirthday} hideBirthday={false} doctorId={localStorage.getItem('userId') || undefined} />

            {/* Today's Schedule */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                    <CardTitle className="text-white">Today's Schedule</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" className="text-emerald-500 hover:text-emerald-400">
                    View All
                  </Button>
                </div>
                <p className="text-sm text-gray-400">
                  An overview of your scheduled chambers for today.
                </p>
              </CardHeader>
              <CardContent>
                {!hasChambers ? (
                  // Empty State
                  <div className="py-12 text-center">
                    <CalendarDays className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-400">No chambers scheduled for today</p>
                  </div>
                ) : (
                  // Chambers List - Already sorted: active by time, then expired at bottom
                  <div className="space-y-4">
                    {upcomingChambers.map((chamber) => (
                      <div
                        key={chamber.id}
                        className={`bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-emerald-500/50 transition-colors ${chamber.isExpired ? 'opacity-60' : ''}`}
                      >
                        {/* Chamber Name & Date Badge */}
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-white">{chamber.chamberName}</h3>
                          <Badge
                            className={`${
                              chamber.date === 'today'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            } capitalize shrink-0`}
                          >
                            {chamber.date}
                          </Badge>
                        </div>

                        {/* Chamber Address */}
                        <div className="flex items-start gap-2 mb-3">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          <p className="text-sm text-gray-400">{chamber.address}</p>
                        </div>

                        {/* Schedule Time */}
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                          {chamber.rescheduledStartTime && chamber.rescheduledEndTime ? (
                            <div className="flex flex-col">
                              <p className="text-sm text-red-400 line-through">
                                {chamber.startTime} to {chamber.endTime}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-emerald-400 font-medium">
                                  {chamber.rescheduledStartTime} to {chamber.rescheduledEndTime}
                                </p>
                                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">RESCHEDULED</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-300">
                              {chamber.startTime} to {chamber.endTime}
                            </p>
                          )}
                          {chamber.isExpired && (
                            <Badge className="bg-red-600 text-white text-xs ml-2">CHAMBER TIME OVER</Badge>
                          )}
                        </div>

                        {/* Booking Status */}
                        <div className="flex items-center justify-between pt-3 border-t border-zinc-700">
                          <span className="text-sm text-gray-400">Booking Status</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white">
                              {chamber.booked} / {chamber.capacity}
                            </span>
                            <Badge
                              variant="outline"
                              className={`${
                                chamber.booked >= chamber.capacity
                                  ? 'border-red-500/50 text-red-400'
                                  : chamber.booked / chamber.capacity > 0.7
                                  ? 'border-yellow-500/50 text-yellow-400'
                                  : 'border-emerald-500/50 text-emerald-400'
                              }`}
                            >
                              {chamber.booked >= chamber.capacity ? 'Full' : `${chamber.capacity - chamber.booked} slots left`}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">Powered by HealQR.com</p>
          </div>
          </div>
        </main>
      </div>

      {/* Contact Support Modal */}
      <ContactSupport
        open={supportOpen}
        onOpenChange={setSupportOpen}
        doctorName={doctorName}
        doctorCode="VZT-12345"
        onSubmit={onSupportRequest}
      />

      {/* Patient Reviews Panel */}
      <PatientReviewsPanel
        isOpen={reviewsOpen}
        onClose={() => setReviewsOpen(false)}
        doctorName={doctorName}
        incomingReviews={incomingReviews}
        selfCreatedReviews={selfCreatedReviews}
        uploadedReviews={uploadedReviews}
        onUploadReview={onUploadReview}
        onDeleteReview={onDeleteReview}
        onViewPreview={() => onMenuChange && onMenuChange('preview')}
        onCreatePlaceholder={onCreatePlaceholderReview}
        doctorStats={doctorStats}
      />

      {/* Notification Center */}
      <NotificationCenter
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        notifications={realTimeNotifications}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
        healthTip={dailyHealthTip}
        doctorName={doctorName}
        onGeneratePatientList={handleGeneratePatientList}
        onDelete={handleDeleteNotification}
      />

      {/* Unified AI + Support Chat */}
      <UnifiedChatWidget
        entityType="doctor"
        entityId={localStorage.getItem('userId') || ''}
        entityName={doctorName}
        userRole="doctor"
        collectionName="doctors"
      />
    </div>
  );
}

