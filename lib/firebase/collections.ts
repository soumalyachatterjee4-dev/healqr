/**
 * Firestore Collections Schema
 *
 * This file defines all Firestore collections and their TypeScript interfaces
 * for type-safe database operations.
 */

import { Timestamp } from 'firebase/firestore';

// ============================================
// COLLECTION NAMES
// ============================================

export const COLLECTIONS = {
  DOCTORS: 'doctors',
  PATIENTS: 'patients',
  BOOKINGS: 'bookings',
  TRANSACTIONS: 'transactions',
  NOTIFICATIONS: 'notifications',
  NOTIFICATION_QUEUE: 'notificationQueue',
  SCHEDULED_NOTIFICATIONS: 'scheduledNotifications',
  PATIENT_FCM_TOKENS: 'patientFCMTokens',
  CHAT_ROOMS: 'chatRooms',
  CHAT_MESSAGES: 'chatMessages',
  REVIEWS: 'reviews',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  PRESCRIPTIONS: 'prescriptions',
  VIDEO_CONSULTATIONS: 'videoConsultations',
  LAB_REFERRALS: 'labReferrals',
  TEMPLATES: 'templates',
  VIDEOS: 'videos',
  ASSISTANTS: 'assistants',
  ADMIN_LOGS: 'adminLogs',
  PLATFORM_ANALYTICS: 'platformAnalytics',
  SCHEDULED_TASKS: 'scheduledTasks',
  CLINICS: 'clinics',
} as const;

// ============================================
// DOCTOR SCHEMA
// ============================================

export interface Doctor {
  id: string; // Document ID (auto-generated)
  email: string;
  phoneNumber: string;
  fullName: string;
  doctorCode: string; // Unique 6-digit code
  specialty?: string;
  qualification?: string;
  experience?: string;

  // Profile
  profilePhoto?: string; // Storage URL
  about?: string;
  languages?: string[];

  // Chambers
  chambers: {
    main: {
      active: boolean;
      name: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
      consultationFee: number;
      schedule: {
        [day: string]: { // 'monday', 'tuesday', etc.
          active: boolean;
          slots: string[]; // ['09:00 AM', '10:00 AM', ...]
        };
      };
      upiId?: string;
      qrCode?: string; // Storage URL
    };
    secondary?: {
      active: boolean;
      name: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
      consultationFee: number;
      schedule: {
        [day: string]: {
          active: boolean;
          slots: string[];
        };
      };
      upiId?: string;
      qrCode?: string;
    };
  };

  // Subscription
  subscription: {
    plan: 'starter' | 'growth' | 'scale' | 'pro' | 'summit';
    status: 'active' | 'inactive' | 'cancelled' | 'expired';
    bookingsLimit: number; // 100, 250, 600, 1500, or unlimited (-1)
    bookingsUsed: number;
    topUpVault: number; // Additional bookings purchased
    renewalDate: number; // Day of month (1-31)
    nextRenewalDate: Timestamp;
    billingCycle: 'monthly' | 'yearly';
    razorpaySubscriptionId?: string;
  };

  // Active Premium Add-ons
  activeAddons: string[]; // ['ecommerce-activation', 'doctor-patient-chat', ...]
  addonExpiry: {
    [addonId: string]: Timestamp;
  };

  // Emergency Button
  emergencyButton?: {
    active: boolean;
    phoneNumber: string;
    activatedAt: Timestamp;
  };

  // E-commerce (if addon active)
  ecommerce?: {
    active: boolean;
    razorpayAccountId?: string;
    productsCount: number;
  };

  // Video Consultation (if addon active)
  videoConsultation?: {
    active: boolean;
    meetingRoomId?: string;
  };

  // Assistant Access (if addon active)
  assistants?: string[]; // Array of assistant user IDs

  // Stats
  stats: {
    totalBookings: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
  };

  // Settings
  settings: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    language: 'english' | 'hindi' | 'bengali';
    fcmToken?: string; // For push notifications
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLogin?: Timestamp;
  isActive: boolean;
  isVerified: boolean;
}

// ============================================
// PATIENT SCHEMA
// ============================================

export interface Patient {
  id: string;
  phoneNumber: string;
  fullName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  email?: string;

  // Medical History
  medicalHistory?: {
    bloodGroup?: string;
    allergies?: string[];
    chronicConditions?: string[];
  };

  // Bookings
  bookingHistory: string[]; // Array of booking IDs

  // Stats
  stats: {
    totalBookings: number;
    totalSpent: number;
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  language: 'english' | 'hindi' | 'bengali';
}

// ============================================
// BOOKING SCHEMA
// ============================================

export interface Booking {
  id: string;
  bookingNumber: string; // Unique booking number

  // References
  doctorId: string;
  patientId: string;
  doctorCode: string;

  // Patient Details (denormalized for quick access)
  patientName: string;
  patientPhone: string;
  patientAge: number;
  patientGender: 'male' | 'female' | 'other';

  // Booking Details
  chamber: 'main' | 'secondary';
  bookingDate: Timestamp;
  timeSlot: string; // '09:00 AM'
  consultationFee: number;

  // Payment
  paymentStatus: 'pending' | 'paid' | 'verification_pending' | 'failed';
  paymentMethod?: 'upi' | 'card' | 'netbanking' | 'wallet' | 'pay_later';
  paymentId?: string; // Razorpay payment ID
  utrNumber?: string; // For UPI payments

  // Status
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'rescheduled';
  cancelledAt?: Timestamp;
  cancelledBy?: 'doctor' | 'patient';
  cancellationReason?: string;

  // Consultation
  consultationCompleted: boolean;
  consultationNotes?: string;
  prescriptionId?: string; // Reference to prescription document

  // Follow-up
  followUpDate?: Timestamp;
  followUpBookingId?: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  language: 'english' | 'hindi' | 'bengali';
}

// ============================================
// TRANSACTION SCHEMA
// ============================================

export interface Transaction {
  id: string;

  // References
  doctorId: string;
  bookingId?: string; // For consultation payments

  // Transaction Details
  type: 'subscription' | 'addon' | 'topup' | 'consultation' | 'ecommerce' | 'refund';
  amount: number;
  currency: 'INR';

  // Payment Gateway
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;

  // Status
  status: 'pending' | 'completed' | 'failed' | 'refunded';

  // Details
  description: string;
  metadata?: {
    plan?: string;
    addonId?: string;
    billingCycle?: 'monthly' | 'yearly';
    [key: string]: any;
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// NOTIFICATION SCHEMA
// ============================================

export interface Notification {
  id: string;

  // Recipients
  recipientId: string; // Doctor or Patient ID
  recipientType: 'doctor' | 'patient';

  // Notification Details
  type: string; // 'booking_reminder', 'consultation_completed', etc.
  title: string;
  message: string;
  language: 'english' | 'hindi' | 'bengali';

  // Status
  read: boolean;
  readAt?: Timestamp;

  // Actions
  actionUrl?: string;
  actionData?: any;

  // Delivery
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };

  // Metadata
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

// ============================================
// NOTIFICATION QUEUE SCHEMA
// ============================================

export interface NotificationQueue {
  id: string;

  // Recipient
  recipientPhone: string; // Patient phone number
  recipientType: 'patient' | 'doctor';

  // Notification Details
  type: 'booking_reminder' | 'consultation_completed' | 'follow_up' | 'review_request' |
        'cancellation' | 'restoration' | 'admin_alert' | 'subscription_expiry' | 'booking_limit';
  title: string;
  message: string;
  language: 'english' | 'hindi' | 'bengali';

  // Related Data
  bookingId?: string;
  doctorId?: string;
  chamberId?: string;

  // Rich Notification Data
  richTemplate?: any; // Rich notification template data
  deliveryMethod?: string; // 'rich_notification' | 'simple'

  // Scheduling
  scheduledFor: Timestamp; // When to send

  // Delivery Status
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sentAt?: Timestamp;
  failureReason?: string;
  retryCount: number;

  // Tracking
  impressionRecorded: boolean;
  clickRecorded: boolean;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// PATIENT FCM TOKEN SCHEMA
// ============================================

export interface PatientFCMToken {
  id: string; // document ID (patient phone)
  patientPhone: string;
  fcmToken: string;
  deviceType: 'android' | 'ios' | 'web';
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastUsed: Timestamp;
}

// ============================================
// SCHEDULED NOTIFICATION SCHEMA
// ============================================

export interface ScheduledNotification {
  id: string;

  // Recipient
  recipientPhone: string;
  recipientType: 'patient' | 'doctor';

  // Notification Type
  type: 'follow_up' | 'review_request' | 'subscription_expiry';

  // Trigger Details
  triggerTime: Timestamp;
  relatedBookingId?: string;
  relatedDoctorId?: string;

  // Status
  status: 'scheduled' | 'sent' | 'cancelled';

  // Follow-up specific (permanent commitment)
  isPermanentCommitment?: boolean; // Deliver even if subscription expired
  customMessage?: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// CHAT ROOM SCHEMA
// ============================================

export interface ChatRoom {
  id: string;

  // Participants
  doctorId: string;
  patientId: string;

  // Details
  doctorName: string;
  patientName: string;

  // Status
  status: 'active' | 'closed';

  // Last Message
  lastMessage?: string;
  lastMessageAt?: Timestamp;

  // Unread Count
  unreadCount: {
    doctor: number;
    patient: number;
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// CHAT MESSAGE SCHEMA
// ============================================

export interface ChatMessage {
  id: string;

  // References
  chatRoomId: string;
  senderId: string;
  senderType: 'doctor' | 'patient';

  // Message
  message: string;
  type: 'text' | 'image' | 'file' | 'prescription';

  // Attachments
  attachmentUrl?: string;
  attachmentName?: string;

  // Status
  read: boolean;
  readAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
}

// ============================================
// REVIEW SCHEMA
// ============================================

export interface Review {
  id: string;

  // References
  doctorId: string;
  patientId: string;
  bookingId: string;

  // Review Details
  patientName: string;
  rating: number; // 1-5
  comment: string;

  // Status
  verified: boolean;
  published: boolean;

  // Doctor Response
  doctorResponse?: string;
  respondedAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// PRODUCT SCHEMA (E-commerce)
// ============================================

export interface Product {
  id: string;

  // References
  doctorId: string;

  // Product Details
  name: string;
  description: string;
  category: string;
  price: number;
  mrp: number;
  discount: number; // Percentage

  // Images
  images: string[]; // Array of storage URLs

  // Stock
  inStock: boolean;
  stockQuantity?: number;

  // Status
  active: boolean;
  featured: boolean;

  // Stats
  views: number;
  orders: number;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// PRESCRIPTION SCHEMA
// ============================================

export interface Prescription {
  id: string;

  // References
  doctorId: string;
  patientId: string;
  bookingId: string;

  // Prescription Details
  type: 'old' | 'new'; // OLD = patient uploaded, NEW = doctor uploaded

  // Files
  files: {
    url: string; // Storage URL
    fileName: string;
    fileType: string;
    uploadedAt: Timestamp;
  }[];

  // AI Analysis (for NEW prescriptions)
  aiAnalysis?: {
    extractedText: string;
    translations: {
      english?: string;
      hindi?: string;
      bengali?: string;
    };
    confidence: number;
    analyzedAt: Timestamp;
  };

  // Status
  status: 'uploaded' | 'analyzed' | 'sent_to_patient';

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// ADMIN LOGS SCHEMA
// ============================================

export interface AdminLog {
  id: string;

  // Admin Details
  adminEmail: string;
  adminName: string;

  // Action
  action: string; // 'doctor_approved', 'payment_refunded', etc.
  targetType: 'doctor' | 'patient' | 'booking' | 'transaction' | 'system';
  targetId?: string;

  // Details
  description: string;
  metadata?: any;

  // Metadata
  createdAt: Timestamp;
  ipAddress?: string;
}

// ============================================
// TYPE GUARDS
// ============================================

export const isDoctor = (data: any): data is Doctor => {
  return data && typeof data.doctorCode === 'string' && data.chambers !== undefined;
};

export const isPatient = (data: any): data is Patient => {
  return data && typeof data.phoneNumber === 'string' && data.bookingHistory !== undefined;
};

export const isBooking = (data: any): data is Booking => {
  return data && typeof data.bookingNumber === 'string';
};
