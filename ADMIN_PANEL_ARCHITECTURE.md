# HealQR Admin Panel — Architecture Plan

## 1. USER HIERARCHY & ACCESS LEVELS

```
┌──────────────────────────────────────────────────────────────┐
│                      SUPER ADMIN                             │
│   Full access to ALL pages, ALL data, ALL controls           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │  SET 1       │    │  SET 2        │    │  SET 3          │ │
│  │  Core Users  │    │  Pharma Co.   │    │  Advertisers    │ │
│  │             │    │  (Distributor)│    │  (3rd Party)    │ │
│  └──────┬──────┘    └──────┬───────┘    └───────┬────────┘  │
│         │                  │                     │           │
│  ┌──────┴──────┐    ┌──────┴───────┐    ┌───────┴────────┐  │
│  │ Doctors     │    │ Company      │    │ Advertiser     │  │
│  │ Clinics     │    │  └─Division  │    │ Account        │  │
│  │ Patients    │    │    └─Region  │    │                │  │
│  └─────────────┘    └──────────────┘    └────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Access Matrix

| Feature                      | Super Admin | Pharma Company | Advertiser |
|------------------------------|:-----------:|:--------------:|:----------:|
| Doctor Management (full)     | ✅          | ❌              | ❌          |
| Patient Management (full)    | ✅          | ❌              | ❌          |
| Clinic Management (full)     | ✅          | ❌              | ❌          |
| Doctor COUNT by region       | ✅          | ✅ (own region)  | ❌          |
| Patient COUNT per chamber    | ✅          | ✅ (own doctors) | ❌          |
| Patient DATA (name/phone)    | ✅          | ❌              | ❌          |
| Doctor NAME + details        | ✅          | ✅ (own doctors) | ❌          |
| Pincode-level aggregate stats| ✅          | ✅              | ✅          |
| Revenue/Billing              | ✅          | ❌              | ❌          |
| QR Generation & Pool         | ✅          | ❌              | ❌          |
| Template: Dashboard Promo    | ✅          | ✅ (upload)      | ❌          |
| Template: Health Tip         | ✅          | ❌              | ✅ (upload)  |
| Template: Birthday Card      | ✅          | ❌              | ❌          |
| Video Uploader               | ✅          | ❌              | ❌          |
| Ad Campaign Management       | ✅          | ❌              | ✅          |
| Page Distribution Manager    | ✅          | ❌              | ❌          |
| Roles & Permissions          | ✅          | ❌              | ❌          |
| Platform Analytics (full)    | ✅          | ❌              | ❌          |

---

## 2. DATA ARCHITECTURE

### 2A. New Firestore Collections

#### `pharmaCompanies/{companyId}`
```typescript
interface PharmaCompany {
  id: string;                    // Auto-generated
  companyName: string;           // "Alkem Laboratories"
  companyCode: string;           // "ALKEM" (unique)
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  gstNo: string;
  divisions: PharmaDivision[];
  status: 'active' | 'suspended' | 'inactive';
  createdAt: Timestamp;
  createdBy: string;             // Super admin ID
  lastLoginAt?: Timestamp;
}

interface PharmaDivision {
  divisionId: string;            // Auto-generated
  divisionName: string;          // "Prima", "Suprima"
  divisionCode: string;          // "PRIMA"
  targetSpecialties: string[];   // ["Dentist", "Cardiologist"]
  targetRegions: PharmaRegion[];
  mrReps: PharmaMR[];            // Medical reps
  status: 'active' | 'inactive';
}

interface PharmaRegion {
  pincodes: string[];            // ["700001", "700002", ...]
  states: string[];              // Derived from pincodes (lookup)
  zones: string[];               // "Eastern", "Western", etc.
  description: string;           // "Eastern India - WB, Odisha"
}

interface PharmaMR {
  mrId: string;
  mrName: string;
  mrPhone: string;
  mrEmail: string;
  assignedPincodes: string[];
  assignedDoctors: string[];     // Doctor UIDs
  status: 'active' | 'inactive';
}
```

#### `pharmaCompanies/{companyId}/distributedDoctors/{doctorId}`
```typescript
interface DistributedDoctor {
  doctorId: string;              // Doctor UID
  doctorName: string;            // Cached for quick display
  specialty: string;             // Primary specialty
  pincode: string;               // Doctor's pincode
  divisionId: string;            // Which division distributed
  mrId: string;                  // Which MR assigned
  qrNumber: string;              // QR linked to this doctor
  distributeDate: Timestamp;
  status: 'active' | 'churned' | 'transferred';
}
```

#### `pharmaAnalytics/{companyId}/daily/{YYYY-MM-DD}`
```typescript
// Pre-aggregated daily stats (no patient data exposed)
interface PharmaDailyStats {
  date: string;
  companyId: string;
  divisionId: string;
  totalDoctors: number;
  activeDoctors: number;         // Doctors who had bookings today
  totalBookings: number;         // Sum across all distributed doctors
  bySpecialty: {
    [specialty: string]: {
      doctors: number;
      bookings: number;
    };
  };
  byPincode: {
    [pincode: string]: {
      doctors: number;
      bookings: number;
    };
  };
}
```

#### `advertiserAnalytics/{advertiserId}/pincode/{pincode}`
```typescript
// Aggregated pincode-level stats (NO doctor names, NO patient data)
interface AdvertiserPincodeStats {
  pincode: string;
  totalDoctors: number;          // Count only
  totalBookingsLast30Days: number;
  avgDailyBookings: number;
  bySpecialty: {
    [specialty: string]: {
      doctorCount: number;
      avgDailyBookings: number;
    };
  };
  lastUpdated: Timestamp;
}
```

#### `pageDistribution/{pageId}`
```typescript
// Controls which ad/template shows on which page
interface PageDistribution {
  pageId: string;                // e.g., "booking-language"
  pageName: string;              // "Language Selection"
  pageCategory: 'booking-flow' | 'notification-premium' | 'notification-normal' | 'patient-facing' | 'walkin-flow';
  isPremium: boolean;            // true for 8 premium pages
  currentTemplate?: {
    templateId: string;
    uploadedBy: string;          // advertiser/pharma company ID
    uploadedByType: 'advertiser' | 'pharma' | 'admin';
    startDate: Timestamp;
    endDate: Timestamp;
    impressions: number;
  };
  adSlots: AdSlot[];             // Multiple ad positions per page
}

interface AdSlot {
  slotId: string;
  position: 'top' | 'bottom' | 'sidebar' | 'inline';
  size: 'banner' | 'card' | 'full-width';
  assignedTo?: string;           // Campaign ID
  revenue: number;               // Per impression/click rate
}
```

---

## 3. PAGE STRUCTURE

### 3A. Super Admin Panel (Enhanced current AdminPanel)

```
SUPER ADMIN SIDEBAR
├── 📊 Dashboard (overview stats)
├── 👥 User Management
│   ├── Doctor Management        [existing - enhanced]
│   ├── Clinic Management        [existing - enhanced]
│   └── Patient Management       [existing - enhanced]
├── 💊 Pharma Management          [NEW]
│   ├── Companies                [CRUD pharma companies]
│   ├── Divisions & Regions      [Division → Specialty → Pincode mapping]
│   ├── MR Management            [Medical rep assignment]
│   └── Distribution Analytics   [Which company → which doctor → booking counts]
├── 📢 Advertiser Management      [NEW]
│   ├── Advertiser Accounts      [Approve/suspend advertisers]
│   ├── Campaign Review          [Review/approve ad campaigns]
│   └── Ad Performance           [Impressions, clicks, revenue]
├── 📄 Page Distribution          [NEW]
│   ├── Page Map                 [Visual map of all pages + ad slots]
│   ├── Premium Pages (8)        [6 booking + 2 notification]
│   ├── Normal Pages             [Reminder, etc.]
│   └── Slot Assignment          [Assign advertiser → page → slot]
├── 🎯 QR Management
│   ├── QR Generation            [existing - batch from universal pool]
│   ├── QR Inventory             [existing]
│   └── QR Assignment            [Track pre-printed → doctor mapping]
├── 📝 Content Management
│   ├── Template Uploader        [existing - 3 types]
│   │   ├── Dashboard Promo      [Pharma company can also upload]
│   │   ├── Health Tip           [Advertiser can also upload]
│   │   └── Birthday Card        [Super admin only, yearly]
│   ├── Video Uploader           [existing - tutorial/testimonial/feedback]
│   └── Promo Manager            [existing]
├── 💰 Revenue & Finance
│   ├── Revenue Manager          [existing]
│   ├── Balance Sheet            [existing]
│   └── Ad Revenue Tracker       [NEW - from advertiser campaigns]
├── 📈 Analytics
│   ├── Platform Analytics       [existing]
│   ├── Daily Work Reports       [existing]
│   └── Working Diary            [existing]
├── ⚙️ Settings
│   ├── Roles & Permissions      [existing - enhanced for pharma/adv]
│   ├── Notifications            [existing]
│   └── Data Standardization     [existing]
└── 🚪 Logout
```

### 3B. Pharma Company Portal (NEW)

```
PHARMA PORTAL SIDEBAR
├── 📊 Dashboard
│   ├── Total Doctors Distributed (count)
│   ├── Total Bookings Today (count)
│   ├── Active Doctors This Week (count)
│   └── Division-wise Breakdown
├── 👨‍⚕️ My Doctors
│   ├── Doctor List (name + specialty + pincode + QR)
│   ├── Daily Booking Count per Doctor
│   ├── Chamber-wise Patient Count (NO patient data)
│   └── Filter: Division / Specialty / Pincode
├── 📈 Analytics
│   ├── Booking Trends (line chart)
│   ├── Top Performing Doctors (by count)
│   ├── Division Comparison
│   └── Region Heatmap
├── 📝 Dashboard Templates
│   ├── Upload Promo Banner (for doctor dashboard)
│   ├── My Uploaded Templates (status: pending/active/expired)
│   └── Template Guidelines
└── 🚪 Logout
```

**DATA VISIBILITY RULES (Pharma):**
- ✅ Can see: Doctor name, specialty, pincode, QR number
- ✅ Can see: Daily/weekly/monthly BOOKING COUNT per doctor/chamber
- ❌ Cannot see: Patient name, phone, age, gender, or any PII
- ❌ Cannot see: Prescription data, consultation details
- ❌ Cannot see: Revenue/billing data
- ❌ Cannot see: Doctors distributed by OTHER companies

### 3C. Advertiser Portal (ENHANCE existing AdvertiserDashboard)

```
ADVERTISER PORTAL SIDEBAR
├── 📊 Dashboard
│   ├── Active Campaigns
│   ├── Total Impressions
│   ├── Wallet Balance
│   └── Campaign Performance Summary
├── 📢 Campaigns                   [existing - enhanced]
│   ├── Create Campaign
│   ├── My Campaigns (status: pending/active/paused/completed)
│   └── Campaign Analytics
├── 🔍 Market Research              [NEW - Self-Service]
│   ├── Pincode Search
│   │   └── Input: 711110 → Output:
│   │       ├── Total Doctors: 24
│   │       ├── Total Avg Daily Bookings: 150
│   │       └── By Specialty:
│   │           ├── Paediatrics: 12 doctors, 80 bookings/day
│   │           ├── Dentist: 5 doctors, 35 bookings/day
│   │           └── General: 7 doctors, 35 bookings/day
│   ├── Region Overview (pincode range)
│   └── Specialty Analytics
├── 📝 Health Tip Templates         [NEW]
│   ├── Upload Health Tip Banner
│   ├── Target Pages (select from list)
│   ├── Premium Pages (🔒 badge on 8 pages)
│   └── My Templates (status/impressions)
├── 💰 Wallet                       [existing]
│   ├── Balance
│   ├── Add Funds
│   └── Transaction History
├── 📈 Analytics                    [existing - enhanced]
│   ├── Impressions by Page
│   ├── Click-through Rates
│   └── ROI Calculator
└── 🚪 Logout
```

**DATA VISIBILITY RULES (Advertiser):**
- ✅ Can see: Pincode-level AGGREGATED stats (doctor count, booking count)
- ✅ Can see: Specialty-wise breakdown at pincode level
- ❌ Cannot see: Doctor names, phone numbers, or any doctor PII
- ❌ Cannot see: Patient data of any kind
- ❌ Cannot see: Individual doctor booking details
- ❌ Cannot see: Pharma company data

---

## 4. THE 8 PREMIUM AD PAGES

These pages have guaranteed impressions (patients CANNOT skip them):

### Booking Flow (6 pages)
| # | Page ID                | Page Name            | Why Premium                    |
|---|------------------------|----------------------|-------------------------------|
| 1 | `booking-language`     | Language Selection    | First touchpoint              |
| 2 | `booking-mini-website` | Doctor Mini Website   | Highest engagement            |
| 3 | `booking-select-date`  | Date Selection        | Intent confirmed              |
| 4 | `booking-select-chamber`| Chamber Selection    | Location locked               |
| 5 | `booking-patient-details`| Patient Details     | Converting user               |
| 6 | `booking-confirmation` | Booking Confirmation  | Transaction complete          |

### Notification Pages (2 pages)
| # | Page ID                    | Page Name               | Why Premium               |
|---|----------------------------|-------------------------|--------------------------|
| 7 | `consultation-completed`   | Consultation Completed   | Patient returns to app   |
| 8 | `review-request`           | Review Request           | High engagement moment   |

### Normal Pages (non-premium, conditional delivery)
- Appointment Reminder (bell notification)
- Follow-up Reminder
- Appointment Cancelled/Restored
- Birthday Card
- Walk-in Visit Complete
- Patient Chat notification

---

## 5. QR UNIVERSAL POOL ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│                UNIVERSAL QR POOL                     │
│              Collection: qrPool                      │
│                                                      │
│  HQR-700001  →  status: available                   │
│  HQR-700002  →  status: generated (batch #B001)     │
│  HQR-700003  →  status: dispatched (MR: Ravi)       │
│  HQR-700004  →  status: deployed (Dr. Ashok Roy)    │
│  HQR-700005  →  status: virtual_assigned (Dr. X)    │
│  ...                                                 │
└─────────┬───────────────────────────┬───────────────┘
          │                           │
    PRE-PRINTED PATH            VIRTUAL PATH
          │                           │
  ┌───────┴────────┐          ┌──────┴──────────┐
  │ Batch Generate │          │ Doctor Signs Up  │
  │ (Admin Panel)  │          │ with qrType=     │
  │                │          │ "virtual"        │
  │ Print → Send → │          │                  │
  │ MR visits Dr → │          │ System auto-     │
  │ Dr signs up    │          │ assigns next     │
  │ with QR number │          │ available QR     │
  └───────┬────────┘          └──────┬──────────┘
          │                           │
          └─────────┬─────────────────┘
                    │
           Doctor Profile Created
           QR linked to doctor UID
           Pharma company tracked
           (if pre-printed: company + division recorded)
```

**Already Built:** QR batch generation, inventory, dispatch tracking, virtual assignment
**Enhancement Needed:** Link QR → pharma company → division during batch creation

---

## 6. TEMPLATE DISTRIBUTION SYSTEM

```
TEMPLATE TYPES & ACCESS
│
├── Dashboard Promo Templates
│   ├── Uploaded by: Super Admin OR Pharma Company
│   ├── Displayed on: Doctor Dashboard, Clinic Dashboard
│   ├── Pharma targets: Their distributed doctors only
│   └── Admin targets: All doctors or filtered
│
├── Health Tip Templates
│   ├── Uploaded by: Super Admin OR Advertiser
│   ├── Displayed on: 30+ placement locations
│   ├── 8 Premium pages: 🔒 Higher rate, guaranteed views
│   ├── Normal pages: Standard rate, conditional views
│   └── Advertiser targets: By pincode/specialty/page
│
└── Birthday Card Templates
    ├── Uploaded by: Super Admin ONLY
    ├── Changed: Once per year (Jan 1)
    └── Displayed: On doctor's birthday notification
```

---

## 7. AUTHENTICATION & LOGIN FLOWS

### Current Auth Methods
- **Super Admin:** Email link (passwordless) → verified against `admins` collection
- **Advertiser:** Email link → verified against `advertisers` collection

### New Auth: Pharma Company
```
Pharma Login Flow:
1. Super Admin creates pharma company account in admin panel
2. System generates login credentials (email-based)
3. Pharma user visits: healqr.com/?page=pharma-login
4. Email link authentication (same as other user types)
5. Verified against `pharmaCompanies` collection
6. Route to Pharma Portal
```

### Login Routes
| User Type       | URL                                    | Auth Method     | Route To          |
|-----------------|----------------------------------------|-----------------|-------------------|
| Super Admin     | `/?page=admin-verify`                  | Email link      | Admin Panel       |
| Pharma Company  | `/?page=pharma-login`                  | Email link      | Pharma Portal     |
| Advertiser      | `/?page=advertiser-login`              | Email link      | Advertiser Portal |
| Doctor          | `/?page=login`                         | Email link      | Doctor Dashboard  |
| Clinic          | `/?page=clinic-login`                  | Email link      | Clinic Dashboard  |
| Patient         | `/?page=patient-login`                 | OTP             | Patient Dashboard |

---

## 8. FIRESTORE SECURITY RULES (New)

```javascript
// Pharma company access - only their distributed doctors' COUNT data
match /pharmaCompanies/{companyId} {
  allow read: if isAuthenticated() && (
    isAdmin() ||
    request.auth.uid == resource.data.uid
  );
  allow write: if isAdmin();
}

match /pharmaAnalytics/{companyId}/{document=**} {
  allow read: if isAuthenticated() && (
    isAdmin() ||
    request.auth.uid == resource.data.companyUid
  );
  allow write: if isAdmin(); // Only server/admin writes aggregated data
}

// Advertiser - only pincode-level aggregates
match /advertiserAnalytics/{advertiserId}/{document=**} {
  allow read: if isAuthenticated() && (
    isAdmin() ||
    request.auth.uid == advertiserId
  );
  allow write: if isAdmin();
}

// Page distribution - admin only write, public read for rendering
match /pageDistribution/{pageId} {
  allow read: if true;
  allow write: if isAdmin();
}
```

---

## 9. DATA AGGREGATION STRATEGY

Since pharma and advertisers should NOT access raw data, we use **pre-aggregated collections**:

### Daily Aggregation Job (Cloud Function or Admin Action)
```
Every midnight (or on-demand):
1. Count bookings per doctor per day
2. Group by: doctor → specialty → pincode → pharma company/division
3. Write to pharmaAnalytics/{companyId}/daily/{date}
4. Aggregate pincode stats for advertiserAnalytics/{advertiserId}/pincode/{pincode}
```

### For MVP (No Cloud Functions):
- **Admin Dashboard button:** "Refresh Analytics" → runs aggregation client-side
- **Pharma Portal:** Fetches pre-aggregated data only
- **Advertiser Portal:** Fetches pre-aggregated pincode stats only

---

## 10. IMPLEMENTATION PHASES

### PHASE 1: Foundation (Week 1-2)
- [ ] Create `pharmaCompanies` Firestore collection & security rules
- [ ] Create `pharmaAnalytics` collection
- [ ] Create `advertiserAnalytics` collection
- [ ] Create `pageDistribution` collection
- [ ] Add "state" derivation from pincode (India Post API or local mapping)
- [ ] Pharma Login component (`PharmaLogin.tsx`)
- [ ] Pharma Company CRUD in Admin Panel (`AdminPharmaManagement.tsx`)

### PHASE 2: Pharma Portal (Week 2-3)
- [ ] `PharmaPortal.tsx` — main layout with sidebar
- [ ] `PharmaDashboard.tsx` — overview stats
- [ ] `PharmaMyDoctors.tsx` — doctor list with booking counts
- [ ] `PharmaAnalytics.tsx` — trends and charts
- [ ] `PharmaDashboardTemplates.tsx` — upload/manage dashboard promo
- [ ] Division/region management in admin panel
- [ ] MR assignment and tracking

### PHASE 3: Advertiser Enhancement (Week 3-4)
- [ ] `AdvertiserMarketResearch.tsx` — pincode search + aggregated stats
- [ ] `AdvertiserHealthTipTemplates.tsx` — upload health tip banners
- [ ] Premium page badge system (🔒 on 8 pages)
- [ ] Page targeting for ad campaigns
- [ ] Enhance existing `AdvertiserDashboard` with new tabs

### PHASE 4: Page Distribution (Week 4-5)
- [ ] `AdminPageDistribution.tsx` — visual page map
- [ ] Ad slot system (top/bottom/inline per page)
- [ ] Assign advertiser campaign → page → slot
- [ ] Premium vs normal page pricing
- [ ] Impression tracking integration

### PHASE 5: Analytics & Aggregation (Week 5-6)
- [ ] Admin "Refresh Analytics" button (aggregation job)
- [ ] Pharma daily stats aggregation
- [ ] Advertiser pincode stats aggregation
- [ ] Revenue tracking from ad campaigns
- [ ] Cross-platform reporting

### PHASE 6: Polish & Security (Week 6-7)
- [ ] Firestore security rules for all new collections
- [ ] Storage rules for pharma/advertiser uploads
- [ ] Audit logging for all admin actions
- [ ] Rate limiting for analytics queries
- [ ] Mobile responsive for all new panels

---

## 11. FILE STRUCTURE (New Components)

```
components/
├── admin/                          (enhanced)
│   ├── AdminPanel.tsx              (update sidebar)
│   ├── AdminPharmaManagement.tsx   [NEW]
│   ├── AdminAdvertiserManagement.tsx [NEW]
│   ├── AdminPageDistribution.tsx   [NEW]
│   └── AdminAdRevenue.tsx          [NEW]
│
├── pharma/                         [NEW folder]
│   ├── PharmaLogin.tsx
│   ├── PharmaPortal.tsx            (main layout)
│   ├── PharmaSidebar.tsx
│   ├── PharmaDashboard.tsx
│   ├── PharmaMyDoctors.tsx
│   ├── PharmaAnalytics.tsx
│   ├── PharmaDivisionManager.tsx
│   └── PharmaDashboardTemplates.tsx
│
├── advertiser/                     (enhance existing)
│   ├── AdvertiserDashboard.tsx     (add new tabs)
│   ├── AdvertiserMarketResearch.tsx [NEW]
│   └── AdvertiserHealthTipTemplates.tsx [NEW]
```

---

## 12. PINCODE → STATE MAPPING

Since "state" is not collected during signup, we derive it from pincode:

**Option A (Recommended):** Local lookup table
```typescript
// utils/pincodeMapping.ts
// First 2-3 digits of Indian pincode → State mapping
const PINCODE_STATE_MAP: Record<string, string> = {
  '70': 'West Bengal',
  '71': 'West Bengal',
  '72': 'West Bengal',
  '73': 'West Bengal',
  '74': 'West Bengal',
  '75': 'Odisha',
  '76': 'Odisha',
  '80': 'Bihar',
  '81': 'Bihar',
  '82': 'Jharkhand',
  '83': 'Jharkhand',
  '11': 'Delhi',
  '12': 'Haryana',
  '13': 'Punjab',
  '14': 'Punjab',
  '15': 'Himachal Pradesh',
  '16': 'Jammu & Kashmir',
  '17': 'Himachal Pradesh',
  '18': 'Jammu & Kashmir',
  '19': 'Jammu & Kashmir',
  '20': 'Uttar Pradesh',
  '21': 'Uttar Pradesh',
  '22': 'Uttar Pradesh',
  '23': 'Uttar Pradesh',
  '24': 'Uttar Pradesh',
  '25': 'Uttar Pradesh',
  '26': 'Uttarakhand',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '30': 'Rajasthan',
  '31': 'Rajasthan',
  '32': 'Rajasthan',
  '33': 'Tamil Nadu',
  '34': 'Tamil Nadu',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Gujarat',
  '39': 'Gujarat',
  '40': 'Maharashtra',
  '41': 'Maharashtra',
  '42': 'Maharashtra',
  '43': 'Maharashtra',
  '44': 'Maharashtra',
  '45': 'Madhya Pradesh',
  '46': 'Madhya Pradesh',
  '47': 'Madhya Pradesh',
  '48': 'Madhya Pradesh',
  '49': 'Chhattisgarh',
  '50': 'Telangana',
  '51': 'Andhra Pradesh',
  '52': 'Andhra Pradesh',
  '53': 'Andhra Pradesh',
  '56': 'Karnataka',
  '57': 'Karnataka',
  '58': 'Karnataka',
  '59': 'Karnataka',
  '60': 'Tamil Nadu',
  '61': 'Tamil Nadu',
  '62': 'Tamil Nadu',
  '63': 'Tamil Nadu',
  '64': 'Tamil Nadu',
  '67': 'Kerala',
  '68': 'Kerala',
  '69': 'Kerala',
  '78': 'Assam',
  '79': 'Northeast',
  '84': 'Bihar',
  '85': 'Bihar',
  '90': 'West Bengal', // Andaman & Nicobar
};

export function getStateFromPincode(pincode: string): string {
  const prefix2 = pincode.substring(0, 2);
  return PINCODE_STATE_MAP[prefix2] || 'Unknown';
}
```

**Option B:** Add optional "state" field to doctor/clinic signup (can be added later without breaking existing accounts — just enrich when available).

---

## 13. SUMMARY OF KEY DECISIONS

| Decision                          | Choice                                      |
|-----------------------------------|---------------------------------------------|
| Pharma data access                | COUNT only, no patient PII                  |
| Advertiser data access            | Pincode aggregate only, no doctor/patient PII|
| State derivation                  | Pincode prefix mapping (no signup change)   |
| Analytics aggregation             | Pre-aggregated collections (not real-time)  |
| Premium pages                     | 8 fixed (6 booking + 2 notification)        |
| Template: Dashboard Promo         | Admin + Pharma upload                       |
| Template: Health Tip              | Admin + Advertiser upload                   |
| Template: Birthday Card           | Admin only, yearly change                   |
| QR pool                           | Single universal pool (existing)            |
| Auth method                       | Email link for all (existing pattern)       |
| Phase 1 priority                  | Pharma company foundation + admin CRUD      |

---

*Created: March 3, 2026*
*Project: HealQR Admin Panel v2.0*
