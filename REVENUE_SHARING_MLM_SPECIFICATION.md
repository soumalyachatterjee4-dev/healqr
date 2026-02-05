# Revenue Sharing + MLM System - Technical Specification

**Project**: HealQR Platform  
**Feature**: Doctor Revenue Sharing & Multi-Level Marketing  
**Version**: 1.0 (Proposal)  
**Status**: Design Phase - Awaiting Approval  
**Date**: January 26, 2026  

---

## 📋 Table of Contents

1. [Business Model Overview](#business-model-overview)
2. [Commission Tier System](#commission-tier-system)
3. [Revenue Calculation Logic](#revenue-calculation-logic)
4. [Fraud Prevention Strategy](#fraud-prevention-strategy)
5. [Doctor Dashboard Integration](#doctor-dashboard-integration)
6. [Advertiser Dashboard](#advertiser-dashboard)
7. [Referral System (MLM)](#referral-system-mlm)
8. [Database Schema](#database-schema)
9. [API Endpoints](#api-endpoints)
10. [Payment & Payout System](#payment--payout-system)
11. [Implementation Roadmap](#implementation-roadmap)

---

## 1. Business Model Overview

### 1.1 Core Concept

HealQR monetizes through **third-party advertisements** shown during patient booking flow. Revenue is shared with doctors based on their booking volume and referrals.

### 1.2 Revenue Sources

```
Primary: Advertisement Revenue
├── Display Ads (booking flow)
├── Video Ads (pre-consultation)
├── Sponsored Listings (doctor search)
└── Banner Ads (patient dashboard)

Secondary: Premium Features (future)
├── Video Consultation (per session fee)
├── AI RX Reader (subscription)
├── Advanced Analytics (monthly)
└── Priority Support (yearly)
```

### 1.3 Revenue Distribution Model

```
Total Ad Revenue: ₹100
├── HealQR Platform: ₹82-90 (82-90%)
├── Doctor (Direct): ₹8-15 (8-15%)
└── Referrer Doctor: ₹2-5 (2-5%)

Example:
Advertiser pays ₹10,000/month
├── Platform keeps: ₹8,200-9,000
├── Doctor earns: ₹800-1,500
└── Referrer earns: ₹200-500
```

---

## 2. Commission Tier System

### 2.1 Tier Structure

| Tier | Monthly QR Scan Bookings | Direct Commission | Referral Commission |
|------|--------------------------|-------------------|---------------------|
| **Bronze** | 0 - 250 | 8% | 2% |
| **Silver** | 251 - 600 | 12% | 3% |
| **Gold** | 601+ | 15% | 5% |

### 2.2 Tier Qualification Rules

**Counting Method**:
- ✅ Only QR Scan bookings count (not walk-in)
- ✅ Calculated monthly (resets every month)
- ✅ Real-time tier upgrade (effective immediately)
- ✅ No downgrade penalty (locked for current month)

**Example**:
```
Dr. Sharma - January 2026:
Day 1-15: 200 bookings → Bronze (8% + 2%)
Day 16: Crosses 251 → Silver (12% + 3%) ✅ Upgraded
Day 16-31: All new bookings at Silver rate
```

### 2.3 Booking Validation Criteria

**A booking is counted if**:
1. ✅ Booking method = 'qr-scan'
2. ✅ Status = 'completed' (consultation done)
3. ✅ Payment verified (Razorpay webhook OR cash marked)
4. ✅ Created within current calendar month

**NOT counted**:
- ❌ Walk-in appointments
- ❌ Cancelled bookings
- ❌ No-show patients
- ❌ Free consultations (unless explicitly allowed)

---

## 3. Revenue Calculation Logic

### 3.1 Ad Revenue Per Booking

**Average Ad Revenue Sources**:
```typescript
// Per QR scan booking
const adRevenue = {
  displayAd: 5,          // ₹5 per impression
  videoAd: 15,           // ₹15 if video played
  clickthrough: 10,      // ₹10 if ad clicked
  conversion: 50         // ₹50 if product purchased
};

// Average per booking
const avgRevenuePerBooking = 15-25; // ₹15-25 realistic
```

### 3.2 Doctor Earnings Calculation

**Formula**:
```typescript
// Direct Earnings
const directEarnings = (bookingCount * avgAdRevenue * commissionRate);

// Referral Earnings (from referred doctors)
const referralEarnings = (
  referredDoctors.reduce((total, doc) => {
    return total + (doc.bookingCount * doc.avgAdRevenue * referralCommissionRate);
  }, 0)
);

// Total Monthly Earnings
const totalEarnings = directEarnings + referralEarnings;
```

**Example Calculation**:
```
Dr. Sharma (Silver Tier - 400 bookings/month):

Direct Earnings:
400 bookings × ₹20 avg revenue × 12% = ₹960

Referral Earnings (5 referred doctors):
Dr. A: 100 bookings × ₹20 × 3% = ₹60
Dr. B: 200 bookings × ₹20 × 3% = ₹120
Dr. C: 50 bookings × ₹20 × 3% = ₹30
Dr. D: 150 bookings × ₹20 × 3% = ₹90
Dr. E: 80 bookings × ₹20 × 3% = ₹48
Subtotal: ₹348

Total Monthly Earnings: ₹960 + ₹348 = ₹1,308
```

### 3.3 Real-time Tracking

**Database Updates**:
```typescript
// After each completed booking
const updateDoctorEarnings = async (appointmentId) => {
  const appointment = await getAppointment(appointmentId);
  const doctor = await getDoctor(appointment.doctorId);
  const adRevenue = await getAdRevenue(appointmentId);
  
  // Calculate commission
  const tier = calculateTier(doctor.monthlyBookings);
  const directCommission = adRevenue * tier.directRate;
  
  // Update doctor earnings
  await updateDoc(doc(db, 'doctors', doctor.id), {
    'earnings.current': increment(directCommission),
    'earnings.lifetime': increment(directCommission)
  });
  
  // Update referrer earnings (if exists)
  if (doctor.referredBy) {
    const referrer = await getDoctor(doctor.referredBy);
    const referralCommission = adRevenue * tier.referralRate;
    
    await updateDoc(doc(db, 'doctors', referrer.id), {
      'earnings.referral': increment(referralCommission),
      'earnings.lifetime': increment(referralCommission)
    });
  }
};
```

---

## 4. Fraud Prevention Strategy

### 4.1 Practical Approach (Patient-Friendly)

**Philosophy**: Simple, non-intrusive, realistic validation

### 4.2 Validation Layers

#### Layer 1: Phone Number Validation
```typescript
const validatePhone = (phone: string, doctorId: string) => {
  // Basic format check
  if (!/^[6-9]\d{9}$/.test(phone)) return false;
  
  // Prevent obviously fake numbers
  if (/^(\d)\1{9}$/.test(phone)) return false; // 0000000000, 1111111111
  
  // Check booking frequency (per doctor)
  const todayBookings = await countBookings(phone, doctorId, 'today');
  if (todayBookings >= 1) return false; // Max 1/day per doctor
  
  const weekBookings = await countBookings(phone, doctorId, 'week');
  if (weekBookings >= 2) return false; // Max 2/week per doctor
  
  return true;
};
```

**Key Feature**: Limits are **PER DOCTOR**, not global
- ✅ Same phone can book different specialists same day
- ✅ Family can use one number for multiple members
- ✅ Realistic for actual patient behavior

#### Layer 2: Booking Pattern Analysis
```typescript
const analyzeBookingPattern = (doctorId: string) => {
  const recentBookings = await getRecentBookings(doctorId, 1); // Last 1 hour
  
  // Flag if suspicious velocity
  if (recentBookings.length > 10) {
    return { flag: true, reason: 'Too many bookings in short time' };
  }
  
  // Check IP diversity
  const uniqueIPs = new Set(recentBookings.map(b => b.ipAddress));
  if (uniqueIPs.size === 1 && recentBookings.length > 5) {
    return { flag: true, reason: 'All bookings from same IP' };
  }
  
  return { flag: false };
};
```

#### Layer 3: Payment Verification
```typescript
// Only count bookings with payment proof
const isValidForCommission = (appointment: Appointment) => {
  // Must have payment
  if (!appointment.payment) return false;
  
  // Razorpay verified
  if (appointment.payment.method === 'online') {
    return appointment.payment.status === 'captured';
  }
  
  // Cash payment (doctor marked)
  if (appointment.payment.method === 'cash') {
    return appointment.payment.verified === true;
  }
  
  return false;
};
```

#### Layer 4: Manual Review (Admin)
```typescript
// Trigger manual review if:
const needsReview = (doctor: Doctor) => {
  // First time crossing 200 bookings
  if (doctor.monthlyBookings > 200 && doctor.reviewStatus !== 'verified') {
    return true;
  }
  
  // Sudden spike (>50% increase month-over-month)
  if (doctor.monthlyBookings > doctor.lastMonthBookings * 1.5) {
    return true;
  }
  
  // High fraud score from pattern analysis
  if (doctor.fraudScore > 70) {
    return true;
  }
  
  return false;
};
```

### 4.3 Fraud Detection Dashboard (Admin)

**Real-time Alerts**:
- 🚨 Doctor booking velocity > 15/hour
- 🚨 Same IP multiple bookings
- 🚨 Pattern anomaly detected
- 🚨 Payment verification failures
- 🚨 Manual review queue

---

## 5. Doctor Dashboard Integration

### 5.1 Revenue Dashboard Section

**New Tab**: "My Earnings" 💰

#### 5.1.1 Overview Cards
```
┌─────────────────────────────────────────────────────────┐
│  THIS MONTH'S EARNINGS                                  │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Total        │  │ Direct       │  │ Referral     │  │
│  │ ₹1,308       │  │ ₹960         │  │ ₹348         │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### 5.1.2 Tier Status Display
```
┌─────────────────────────────────────────────────────────┐
│  CURRENT TIER: SILVER 🥈                                │
├─────────────────────────────────────────────────────────┤
│  Bookings This Month: 400 / 600                         │
│  [████████████░░░░░] 67%                                │
│                                                          │
│  Next Tier: GOLD (200 more bookings)                    │
│  Commission: 12% → 15% (+3%)                            │
│  Referral: 3% → 5% (+2%)                                │
└─────────────────────────────────────────────────────────┘
```

#### 5.1.3 Earnings Breakdown
```typescript
interface EarningsBreakdown {
  month: string;
  directBookings: number;
  directRevenue: number;
  directCommission: number;
  referralDoctors: {
    name: string;
    bookings: number;
    avgRevenue: number;
    yourCommission: number;
  }[];
  totalReferralCommission: number;
  totalEarnings: number;
  paidOut: boolean;
  payoutDate?: Date;
}
```

**Display**:
```
┌─────────────────────────────────────────────────────────┐
│  JANUARY 2026 EARNINGS                                  │
├─────────────────────────────────────────────────────────┤
│  Direct Revenue                                          │
│  • 400 bookings × ₹20 avg × 12% = ₹960                  │
│                                                          │
│  Referral Revenue (5 doctors)                           │
│  • Dr. Amit Kumar      100 bookings    ₹60              │
│  • Dr. Priya Sharma    200 bookings    ₹120             │
│  • Dr. Rajesh Singh     50 bookings    ₹30              │
│  • Dr. Meera Patel     150 bookings    ₹90              │
│  • Dr. Arjun Reddy      80 bookings    ₹48              │
│  ────────────────────────────────────────               │
│  Subtotal: ₹348                                         │
│                                                          │
│  TOTAL: ₹1,308                                          │
│  Status: Pending Payout (Feb 5, 2026)                   │
└─────────────────────────────────────────────────────────┘
```

#### 5.1.4 Referral Program Section
```
┌─────────────────────────────────────────────────────────┐
│  REFERRAL PROGRAM 🔗                                    │
├─────────────────────────────────────────────────────────┤
│  Your Referral Link:                                    │
│  https://healqr.app/signup?ref=DR-SHARMA-2026          │
│  [Copy Link] [Share WhatsApp] [Share Email]            │
│                                                          │
│  Referred Doctors: 5                                    │
│  Active This Month: 5                                   │
│  Total Referral Earnings: ₹2,450 (lifetime)            │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Component Structure

**File**: `components/DoctorEarningsDashboard.tsx`

```typescript
const DoctorEarningsDashboard = () => {
  const [earnings, setEarnings] = useState<EarningsData>();
  const [tier, setTier] = useState<TierInfo>();
  const [referrals, setReferrals] = useState<ReferralDoctor[]>();
  
  return (
    <div className="earnings-dashboard">
      <EarningsOverview earnings={earnings} />
      <TierStatus tier={tier} />
      <ReferralProgram referrals={referrals} />
      <EarningsHistory />
      <PayoutSection />
    </div>
  );
};
```

---

## 6. Advertiser Dashboard

### 6.1 Advertiser Portal Features

**URL**: `https://healqr.app/advertiser`

#### 6.1.1 Campaign Management
```
┌─────────────────────────────────────────────────────────┐
│  CREATE NEW CAMPAIGN                                    │
├─────────────────────────────────────────────────────────┤
│  Campaign Name: [Winter Health Products 2026]          │
│                                                          │
│  Budget: ₹[50,000] Duration: [30] days                  │
│                                                          │
│  Targeting:                                             │
│  ☑ Specialty: [General Medicine] [Pediatrics]          │
│  ☑ Location: [Mumbai] [Pune] [Bangalore]               │
│  ☑ Age Group: [25-45]                                   │
│  ☑ Gender: [All] [Male] [Female]                       │
│                                                          │
│  Ad Format:                                             │
│  ○ Display Banner (728×90)                              │
│  ● Video Ad (15 sec)                                    │
│  ○ Sponsored Listing                                    │
│                                                          │
│  [Upload Creative] [Preview] [Launch Campaign]         │
└─────────────────────────────────────────────────────────┘
```

#### 6.1.2 Campaign Analytics
```typescript
interface CampaignMetrics {
  campaignId: string;
  impressions: number;           // Total times ad shown
  verifiedImpressions: number;   // After fraud filtering
  clicks: number;
  conversions: number;
  ctr: number;                   // Click-through rate
  conversionRate: number;
  totalSpent: number;
  costPerImpression: number;
  costPerClick: number;
  costPerConversion: number;
  roi: number;
  doctorsReached: number;
  patientsReached: number;
}
```

**Display**:
```
┌─────────────────────────────────────────────────────────┐
│  CAMPAIGN: Winter Health Products 2026                  │
├─────────────────────────────────────────────────────────┤
│  Budget: ₹50,000    Spent: ₹32,450    Remaining: ₹17,550│
│  Duration: Jan 1 - Jan 30 (26 days remaining)          │
│                                                          │
│  PERFORMANCE                                            │
│  • Impressions: 125,000 (verified: 108,500)            │
│  • Clicks: 3,250 (CTR: 2.6%)                           │
│  • Conversions: 185 (Conv Rate: 5.7%)                  │
│  • ROI: 245% (₹79,400 revenue generated)               │
│                                                          │
│  REACH                                                  │
│  • Doctors: 850                                         │
│  • Patients: 18,200                                     │
│  • Top Locations: Mumbai (35%), Pune (28%)             │
│                                                          │
│  [View Detailed Report] [Adjust Budget] [Pause]        │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Ad Delivery Integration

**File**: `components/AdDisplay.tsx`

```typescript
// Show ads during patient booking flow
const AdDisplay = ({ doctorId, specialization }: AdProps) => {
  const [ad, setAd] = useState<Advertisement>();
  const [viewTracked, setViewTracked] = useState(false);
  
  useEffect(() => {
    // Fetch targeted ad
    const fetchAd = async () => {
      const targetedAd = await getTargetedAd({
        doctorSpecialization: specialization,
        patientLocation: await getLocation(),
        timeOfDay: new Date().getHours()
      });
      setAd(targetedAd);
    };
    
    fetchAd();
  }, []);
  
  // Track impression (only if viewed for 3+ seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!viewTracked && ad) {
        trackImpression(ad.id, doctorId);
        setViewTracked(true);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [ad]);
  
  return (
    <div className="ad-container">
      {ad?.type === 'video' ? (
        <VideoAd src={ad.url} onComplete={() => trackCompletion(ad.id)} />
      ) : (
        <BannerAd src={ad.url} onClick={() => trackClick(ad.id)} />
      )}
    </div>
  );
};
```

---

## 7. Referral System (MLM)

### 7.1 Referral Mechanism

**Single-Level Only** (not multi-level pyramid)

#### 7.1.1 Referral Link Generation
```typescript
const generateReferralLink = (doctorId: string, doctorName: string) => {
  const slug = doctorName.toLowerCase().replace(/\s+/g, '-');
  const uniqueCode = `DR-${slug.toUpperCase()}-${Date.now().toString(36)}`;
  
  return {
    code: uniqueCode,
    url: `https://healqr.app/signup?ref=${uniqueCode}`,
    shortUrl: `https://hqr.link/${uniqueCode}`
  };
};
```

#### 7.1.2 Referral Tracking
```typescript
// During signup
const handleSignup = async (signupData) => {
  const urlParams = new URLSearchParams(window.location.search);
  const referralCode = urlParams.get('ref');
  
  if (referralCode) {
    // Find referrer doctor
    const referrer = await findDoctorByReferralCode(referralCode);
    
    if (referrer) {
      signupData.referredBy = referrer.id;
      signupData.referredAt = serverTimestamp();
      
      // Update referrer's count
      await updateDoc(doc(db, 'doctors', referrer.id), {
        'referrals.total': increment(1),
        'referrals.pending': arrayUnion(newDoctorId)
      });
    }
  }
  
  // Continue with signup
  await createDoctor(signupData);
};
```

### 7.2 Referral Earnings Calculation

**Real-time Update**:
```typescript
// When referred doctor completes a booking
const updateReferrerEarnings = async (appointmentId) => {
  const appointment = await getAppointment(appointmentId);
  const doctor = await getDoctor(appointment.doctorId);
  
  if (doctor.referredBy) {
    const referrer = await getDoctor(doctor.referredBy);
    const adRevenue = await getAdRevenue(appointmentId);
    
    // Calculate referral commission based on referrer's tier
    const tier = calculateTier(referrer.monthlyBookings);
    const referralCommission = adRevenue * tier.referralRate;
    
    // Update referrer earnings
    await updateDoc(doc(db, 'doctors', referrer.id), {
      'earnings.referral': increment(referralCommission),
      'earnings.lifetime': increment(referralCommission)
    });
    
    // Log transaction
    await addDoc(collection(db, 'earningsLog'), {
      type: 'referral',
      referrerId: referrer.id,
      referredDoctorId: doctor.id,
      appointmentId: appointmentId,
      amount: referralCommission,
      timestamp: serverTimestamp()
    });
  }
};
```

### 7.3 Referral Dashboard Display

```
┌─────────────────────────────────────────────────────────┐
│  REFERRAL PERFORMANCE - JANUARY 2026                    │
├─────────────────────────────────────────────────────────┤
│  Total Referred: 5 doctors                              │
│  Active This Month: 5                                   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Dr. Amit Kumar       Active      ₹60            │   │
│  │ 100 bookings • Bronze tier                      │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Dr. Priya Sharma     Active      ₹120           │   │
│  │ 200 bookings • Bronze tier                      │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Dr. Rajesh Singh     Active      ₹30            │   │
│  │ 50 bookings • Bronze tier                       │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Dr. Meera Patel      Active      ₹90            │   │
│  │ 150 bookings • Bronze tier                      │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Dr. Arjun Reddy      Active      ₹48            │   │
│  │ 80 bookings • Bronze tier                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Total Referral Earnings: ₹348                          │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Database Schema

### 8.1 Doctor Document Extension

```typescript
// Add to existing doctors collection
interface Doctor {
  // ... existing fields
  
  // Revenue & Earnings
  earnings: {
    current: number;           // This month
    lifetime: number;          // All time
    referral: number;          // From referrals (lifetime)
    lastPayout: Timestamp;
    pendingPayout: number;
  };
  
  // Tier & Commission
  tier: {
    current: 'bronze' | 'silver' | 'gold';
    monthlyBookings: number;   // QR scan only
    directRate: number;        // 0.08, 0.12, 0.15
    referralRate: number;      // 0.02, 0.03, 0.05
    lastCalculated: Timestamp;
  };
  
  // Referral Program
  referrals: {
    code: string;              // Unique referral code
    url: string;               // Full referral URL
    total: number;             // Total doctors referred
    active: number;            // Currently active
    doctorIds: string[];       // Array of referred doctor IDs
  };
  
  // Referred By (if this doctor was referred)
  referredBy?: string;         // Referrer doctor ID
  referredAt?: Timestamp;
  
  // Fraud Prevention
  fraudScore: number;          // 0-100
  reviewStatus: 'pending' | 'verified' | 'flagged';
  lastReviewDate?: Timestamp;
}
```

### 8.2 New Collections

#### 8.2.1 Earnings Log
```typescript
interface EarningsLog {
  id: string;
  type: 'direct' | 'referral';
  doctorId: string;
  appointmentId: string;
  adRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  referredDoctorId?: string;   // If type = 'referral'
  timestamp: Timestamp;
  month: string;               // 'YYYY-MM'
  tier: string;
}
```

#### 8.2.2 Advertisements
```typescript
interface Advertisement {
  id: string;
  advertiserId: string;
  campaignId: string;
  title: string;
  type: 'banner' | 'video' | 'sponsored';
  creativeUrl: string;
  targetUrl: string;
  
  // Targeting
  targeting: {
    specializations: string[];
    locations: string[];
    ageGroups: string[];
    gender: 'all' | 'male' | 'female';
  };
  
  // Budget & Pricing
  budget: number;
  spent: number;
  costPerImpression: number;
  costPerClick: number;
  
  // Metrics
  impressions: number;
  verifiedImpressions: number;
  clicks: number;
  conversions: number;
  
  // Status
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: Timestamp;
  endDate: Timestamp;
  createdAt: Timestamp;
}
```

#### 8.2.3 Ad Impressions
```typescript
interface AdImpression {
  id: string;
  adId: string;
  campaignId: string;
  advertiserId: string;
  doctorId: string;
  appointmentId: string;
  
  // User Data
  patientDeviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  
  // Interaction
  viewDuration: number;        // Milliseconds
  clicked: boolean;
  converted: boolean;
  
  // Revenue
  revenueGenerated: number;
  doctorCommission: number;
  referrerCommission?: number;
  
  // Validation
  verified: boolean;           // Passed fraud checks
  fraudScore: number;
  timestamp: Timestamp;
}
```

#### 8.2.4 Payouts
```typescript
interface Payout {
  id: string;
  doctorId: string;
  month: string;               // 'YYYY-MM'
  
  // Amounts
  directEarnings: number;
  referralEarnings: number;
  totalAmount: number;
  
  // Payment Details
  paymentMethod: 'bank_transfer' | 'upi' | 'razorpay';
  accountDetails: {
    accountNumber?: string;
    ifsc?: string;
    upiId?: string;
  };
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: Timestamp;
  processedAt?: Timestamp;
  completedAt?: Timestamp;
  transactionId?: string;
  
  // Breakdown
  breakdown: {
    totalBookings: number;
    avgRevenuePerBooking: number;
    tier: string;
    directRate: number;
    referralRate: number;
  };
}
```

---

## 9. API Endpoints

### 9.1 Doctor Earnings APIs

```typescript
// Get current month earnings
GET /api/doctor/earnings/current
Response: {
  current: number;
  direct: number;
  referral: number;
  tier: TierInfo;
  breakdown: EarningsBreakdown;
}

// Get earnings history
GET /api/doctor/earnings/history?months=6
Response: {
  months: MonthlyEarnings[];
  totalLifetime: number;
  totalPaidOut: number;
}

// Request payout
POST /api/doctor/payout/request
Body: {
  month: string;
  accountDetails: AccountDetails;
}
Response: {
  payoutId: string;
  status: string;
  estimatedDate: Date;
}
```

### 9.2 Referral APIs

```typescript
// Get referral stats
GET /api/doctor/referrals
Response: {
  code: string;
  url: string;
  total: number;
  active: number;
  doctors: ReferralDoctor[];
  totalEarnings: number;
}

// Generate referral link
POST /api/doctor/referrals/generate
Response: {
  code: string;
  url: string;
  shortUrl: string;
}
```

### 9.3 Advertiser APIs

```typescript
// Create campaign
POST /api/advertiser/campaigns
Body: {
  title: string;
  budget: number;
  duration: number;
  targeting: TargetingOptions;
  creative: CreativeAsset;
}
Response: {
  campaignId: string;
  status: string;
}

// Get campaign metrics
GET /api/advertiser/campaigns/:id/metrics
Response: {
  impressions: number;
  verifiedImpressions: number;
  clicks: number;
  conversions: number;
  spent: number;
  roi: number;
}

// Pause/Resume campaign
PATCH /api/advertiser/campaigns/:id/status
Body: {
  status: 'active' | 'paused';
}
```

### 9.4 Admin APIs

```typescript
// Review queue
GET /api/admin/reviews/pending
Response: {
  doctors: DoctorReview[];
  count: number;
}

// Approve/Reject doctor
POST /api/admin/reviews/:doctorId/approve
POST /api/admin/reviews/:doctorId/reject
Body: {
  reason?: string;
}

// Platform revenue
GET /api/admin/revenue?month=YYYY-MM
Response: {
  totalRevenue: number;
  doctorPayouts: number;
  platformProfit: number;
  activeAdvertisers: number;
  activeDoctors: number;
}
```

---

## 10. Payment & Payout System

### 10.1 Payment Flow (Advertiser → Platform)

```
Advertiser Creates Campaign
       ↓
Sets Budget (e.g., ₹50,000)
       ↓
Razorpay Payment Gateway
       ↓
Amount Held in Platform Account
       ↓
Deducted as Ads are Served
       ↓
Real-time Balance Update
```

### 10.2 Payout Flow (Platform → Doctor)

```
Month Ends (e.g., Jan 31)
       ↓
System Calculates Earnings
       ↓
Doctor Reviews & Confirms
       ↓
Submits Payout Request (Feb 1-5)
       ↓
Admin Reviews & Approves
       ↓
Automated Bank Transfer (Feb 5-7)
       ↓
Doctor Receives Payment
       ↓
Payout Confirmation Email/SMS
```

### 10.3 Payout Rules

**Minimum Payout**: ₹500  
**Payout Frequency**: Monthly  
**Payout Window**: 1st-5th of following month  
**Processing Time**: 2-5 business days  
**Supported Methods**:
- Bank Transfer (NEFT/RTGS)
- UPI
- Razorpay X (instant payout)

### 10.4 Tax Compliance

**TDS Deduction**:
- If annual earnings > ₹5,000: 10% TDS deducted
- TDS certificate provided quarterly
- Annual Form 16A issued

---

## 11. Implementation Roadmap

### 11.1 Phase 1: Foundation (Week 1-2)

**Tasks**:
- [ ] Extend doctor schema with earnings fields
- [ ] Create earnings log collection
- [ ] Implement tier calculation logic
- [ ] Add booking counter (QR scan only)
- [ ] Basic earnings display in dashboard

**Deliverables**:
- Doctor can see tier status
- Basic earnings tracking
- No payout yet (manual)

### 11.2 Phase 2: Advertiser Platform (Week 3-4)

**Tasks**:
- [ ] Build advertiser signup/login
- [ ] Create campaign creation UI
- [ ] Implement ad delivery system
- [ ] Track impressions & clicks
- [ ] Basic fraud prevention (view duration)

**Deliverables**:
- Advertiser can create campaigns
- Ads shown during booking flow
- Basic revenue tracking

### 11.3 Phase 3: Referral System (Week 5)

**Tasks**:
- [ ] Generate unique referral codes
- [ ] Track referral signups
- [ ] Calculate referral commissions
- [ ] Display referral dashboard
- [ ] Share referral link (WhatsApp/Email)

**Deliverables**:
- Full MLM functionality
- Referral earnings calculated
- Transparency in referral stats

### 11.4 Phase 4: Payment Integration (Week 6-7)

**Tasks**:
- [ ] Razorpay integration (advertiser payments)
- [ ] Razorpay X integration (doctor payouts)
- [ ] Payout request workflow
- [ ] Bank account verification
- [ ] TDS calculation & deduction

**Deliverables**:
- Automated payment processing
- Payout requests
- Tax compliance

### 11.5 Phase 5: Advanced Features (Week 8+)

**Tasks**:
- [ ] ML-based fraud detection
- [ ] Advanced analytics dashboard
- [ ] A/B testing for ads
- [ ] Referral leaderboard
- [ ] Gamification (badges, milestones)

---

## 12. Key Decisions Pending

### 12.1 To Discuss (Wednesday Meeting)

1. **Fraud Prevention Approach**
   - Phone validation only?
   - Add OTP verification?
   - Payment-only counting?

2. **Payout Threshold**
   - Minimum ₹500 or ₹1,000?
   - Monthly or bi-weekly?

3. **Commission Rates**
   - Keep 8%/12%/15% or adjust?
   - Referral 2%/3%/5% or higher?

4. **Ad Placement**
   - Only during booking?
   - Also in dashboard?
   - Video ads mandatory or optional?

5. **Tax Handling**
   - TDS deduction automatic?
   - Provide GST invoice to advertisers?

---

## 13. Risk Mitigation

### 13.1 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Fraud bookings | High | Payment verification + pattern analysis |
| Ad blocker usage | Medium | Serve ads server-side, not client-side |
| Platform downtime | High | Firebase 99.95% uptime SLA |
| Payment failures | Medium | Razorpay retry mechanism |

### 13.2 Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Low advertiser interest | High | Start with 2-3 pilot advertisers |
| Doctor hesitation | Medium | Make revenue sharing optional |
| Regulatory compliance | High | Consult legal for healthcare ads |
| Competitor copying | Low | Focus on execution & trust |

---

## 14. Success Metrics

### 14.1 KPIs to Track

**Doctor Engagement**:
- % of doctors opting into revenue sharing
- Average monthly bookings per doctor
- Tier distribution (Bronze/Silver/Gold)
- Referral participation rate

**Advertiser ROI**:
- Cost per verified impression
- Click-through rate (target: >2%)
- Conversion rate (target: >3%)
- Advertiser retention rate

**Platform Revenue**:
- Monthly ad revenue
- Platform profit margin
- Doctor payout ratio
- Growth rate (MoM)

### 14.2 Target Projections (6 Months)

```
Month 1:
- 50 doctors enrolled
- 2 advertisers
- ₹25,000 ad revenue
- ₹2,000 doctor payouts

Month 3:
- 200 doctors
- 5 advertisers
- ₹1,50,000 ad revenue
- ₹15,000 doctor payouts

Month 6:
- 500 doctors
- 15 advertisers
- ₹5,00,000 ad revenue
- ₹50,000 doctor payouts
```

---

## 15. Conclusion

This revenue sharing + MLM system is **technically feasible** with the following approach:

✅ **Simple Fraud Prevention** (patient-friendly)  
✅ **Transparent Earnings** (doctor trust)  
✅ **Advertiser ROI** (verified impressions)  
✅ **Scalable Architecture** (Firebase + Razorpay)  
✅ **Compliance-ready** (TDS, GST)  

**Next Steps**:
1. Finalize fraud prevention strategy (Wednesday meeting)
2. Complete Patient & Clinic modules
3. Decide on implementation timeline
4. Pilot with 2-3 advertisers
5. Monitor & iterate

---

**Status**: Awaiting approval for implementation  
**Prepared by**: HealQR Technical Team  
**Date**: January 26, 2026  
**Version**: 1.0 (Draft)
