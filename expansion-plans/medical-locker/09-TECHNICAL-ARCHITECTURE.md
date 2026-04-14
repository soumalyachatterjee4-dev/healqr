# Technical Architecture — Firestore, Storage, Cloud Functions, Security Rules

**Date:** April 13, 2026  
**Stack:** React 18 + TypeScript + Vite 5 + Firebase (Firestore, Auth, Storage, Functions, Hosting)  
**Region:** asia-south1 (Mumbai)

---

## 1. OVERALL SYSTEM ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                      │
│                     healqr.com / teamhealqr.web.app                  │
│                                                                      │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │ Doctor    │  │ Patient      │  │ Medical     │  │ Payment      │ │
│  │ Dashboard │  │ Dashboard    │  │ Locker UI   │  │ Gateway UI   │ │
│  └─────┬────┘  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘ │
└────────┼───────────────┼────────────────┼────────────────┼──────────┘
         │               │                │                │
    ┌────▼───────────────▼────────────────▼────────────────▼──────┐
    │                    FIREBASE SDK (Client)                      │
    │                                                               │
    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
    │  │ Firestore │  │ Auth     │  │ Storage  │  │ Cloud        │ │
    │  │ (data)    │  │ (OTP)    │  │ (files)  │  │ Functions    │ │
    │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │
    └──────────────────────────────────────────────────────────────┘
         │               │                │                │
    ┌────▼───────────────▼────────────────▼────────────────▼──────┐
    │                    FIREBASE BACKEND                           │
    │                                                               │
    │  Firestore DB ──── Security Rules                            │
    │  Cloud Storage ─── Storage Rules                              │
    │  Cloud Functions ─ Scheduled + Triggered                      │
    │  Auth ──────────── Phone OTP                                  │
    └──────────────────────────────────────────────────────────────┘
         │
    ┌────▼──────────────┐
    │  EXTERNAL          │
    │  IOB Payment GW    │
    │  SMS Service       │
    └────────────────────┘
```

---

## 2. URL ROUTING ARCHITECTURE

### Path-Based URLs (Firebase Hosting)

```
healqr.com/                          → Main landing page
healqr.com/admin/*                   → Admin panel
healqr.com/dr/{slug}                 → Doctor mini website (Phase 1 — FREE)
healqr.com/dr/{slug}/appointments    → Doctor appointment page
healqr.com/locker                    → Patient Medical Locker (Phase 3)
healqr.com/locker/share/{grantId}    → Cross-doctor access viewer
healqr.com/pay/patient/{planId}      → Patient payment page
healqr.com/pay/doctor/{planId}       → Doctor payment page
```

### firebase.json Hosting Config
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/dr/**",
        "destination": "/index.html"
      },
      {
        "source": "/locker/**",
        "destination": "/index.html"
      },
      {
        "source": "/pay/**",
        "destination": "/index.html"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### React Router Config
```typescript
// App.tsx routes (additions for Medical Locker)
<Routes>
  {/* Existing routes */}
  <Route path="/" element={<LandingPage />} />
  <Route path="/admin/*" element={<AdminPanel />} />
  
  {/* Phase 1: Doctor Mini Website */}
  <Route path="/dr/:slug" element={<DoctorMiniWebsite />} />
  <Route path="/dr/:slug/appointments" element={<DoctorAppointments />} />
  
  {/* Phase 3: Medical Locker */}
  <Route path="/locker" element={<MedicalLockerDashboard />} />
  <Route path="/locker/files" element={<LockerFileManager />} />
  <Route path="/locker/share/:grantId" element={<LockerSharedView />} />
  <Route path="/locker/settings" element={<LockerSettings />} />
  
  {/* Payment */}
  <Route path="/pay/patient/:planId" element={<PatientPayment />} />
  <Route path="/pay/doctor/:planId" element={<DoctorPayment />} />
</Routes>
```

---

## 3. FIRESTORE DATABASE SCHEMA

### Collection: `doctors`
```javascript
// doctors/{doctorId}
{
  // Existing fields...
  
  // Phase 1 additions:
  profileSlug: "dr-rajesh-kumar",          // Unique, URL-safe
  profileSlugLower: "dr-rajesh-kumar",     // For case-insensitive lookup
  miniWebsiteEnabled: true,
  miniWebsiteData: {
    displayName: "Dr. Rajesh Kumar",
    specialization: "General Medicine",
    qualifications: "MBBS, MD",
    clinicName: "Kumar Health Clinic",
    clinicAddress: "123 Main Road, Kolkata",
    phone: "+91XXXXXXXXXX",               // Display phone
    timings: "Mon-Sat 10AM-1PM, 5PM-8PM",
    about: "15 years of experience...",
    profilePhoto: "storage://path/to/photo",
    theme: "classic"                       // "classic" | "modern" | "minimal"
  },
  
  // Phase 2 additions:
  premiumWebsite: false,
  premiumPlan: null,                        // "monthly" | "annual"
  premiumExpiresAt: null,
  
  // Phase 3 additions:
  lockerSubscription: {
    status: "active",                       // "active" | "warning" | "restricted" | "suspended" | "terminated"
    plan: "doctor_standard",
    pricePerMonth: 99,
    storageQuotaGB: 2,
    storageUsedMB: 456,
    subscribedAt: Timestamp,
    lastPaymentAt: Timestamp,
    nextPaymentDue: Timestamp,
    paymentFailedAt: null
  },
  
  // Wallet
  wallet: {
    balance: 1250,                          // Current balance in ₹
    totalEarned: 8700,
    totalWithdrawn: 7450,
    totalTDSDeducted: 0,
    lastPayoutAt: Timestamp
  }
}
```

### Collection: `patients` (existing, extended)
```javascript
// patients/{patientId}
{
  // Existing fields...
  
  // Phase 3 additions:
  medicalLocker: {
    enabled: true,
    status: "active",          // "active"|"warning"|"frozen"|"sealed"|"export_only"|"archived"|"deleted"
    plan: "patient_standard",
    pricePerMonth: 49,
    storageQuotaMB: 500,
    storageUsedMB: 234,
    subscribedAt: Timestamp,
    lastPaymentAt: Timestamp,
    nextPaymentDue: Timestamp,
    paymentFailedAt: null,
    referringDoctorId: "doc_456",     // Doctor who onboarded patient
    consentGivenAt: Timestamp,
    consentVersion: "1.0"
  }
}
```

### Collection: `medicalLocker/{patientId}/files`
```javascript
// medicalLocker/{patientId}/files/{fileId}
{
  fileName: "blood_report_jan2026.pdf",
  originalName: "scan_001.pdf",
  fileType: "application/pdf",        // MIME type
  fileSizeMB: 2.3,
  category: "lab_report",             // "prescription"|"lab_report"|"imaging"|"discharge"|"insurance"|"other"
  description: "Complete blood count - Jan 2026",
  
  // Storage reference
  storagePath: "medical-locker/{patientId}/files/{fileId}/{fileName}",
  thumbnailPath: "medical-locker/{patientId}/thumbnails/{fileId}.webp",
  
  // Metadata
  uploadedBy: "doc_456",              // doctor ID or patient ID
  uploadedByRole: "doctor",           // "doctor" | "patient"
  uploadedByName: "Dr. Kumar",
  uploadedAt: Timestamp,
  lastViewedAt: Timestamp,
  viewCount: 12,
  
  // Edit window
  editableUntil: Timestamp,           // uploadedAt + 24 hours (only for doctor uploads)
  
  // Tags
  tags: ["blood", "cbc", "jan-2026"],
  
  // Encryption metadata (future)
  encrypted: false,
  encryptionKeyId: null
}
```

### Collection: `medicalLocker/{patientId}/accessGrants`
```javascript
// medicalLocker/{patientId}/accessGrants/{grantId}
{
  grantedToDoctorId: "doc_789",
  grantedToDoctorName: "Dr. Sharma",
  grantedByPatientId: "pat_123",
  grantedAt: Timestamp,
  expiresAt: Timestamp,               // null = until revoked
  
  accessType: "view_only",            // always view_only
  
  // Scope
  scope: "specific_files",            // "all" | "doctor_specific" | "specific_files"
  scopeDoctorId: null,                // if scope = "doctor_specific", which doctor's uploads
  specificFileIds: ["file_1", "file_2"],
  
  // Status
  status: "active",                   // "active" | "expired" | "revoked"
  revokedAt: null,
  revokedReason: null
}
```

### Collection: `medicalLocker/{patientId}/accessLogs`
```javascript
// medicalLocker/{patientId}/accessLogs/{logId}
{
  action: "view",                     // "view"|"grant"|"revoke"|"expire"|"upload"|"delete"|"download"|"export"
  performedBy: "doc_456",
  performedByRole: "doctor",          // "doctor"|"patient"|"system"
  performedByName: "Dr. Kumar",
  
  targetFileId: "file_1",
  targetFileName: "blood_report_2026.pdf",
  
  timestamp: Timestamp,
  ipAddress: "203.x.x.x",
  userAgent: "Chrome/120 Win10",
  
  accessGrantId: "grant_789",         // which grant authorized this
  
  // Additional context
  details: {}                          // action-specific metadata
}
```

### Collection: `medicalLocker/{patientId}/downloadRequests`
```javascript
// medicalLocker/{patientId}/downloadRequests/{requestId}
{
  requestedBy: "doc_456",
  requestedByName: "Dr. Kumar",
  fileId: "file_1",
  fileName: "blood_report_jan2026.pdf",
  
  requestedAt: Timestamp,
  reason: "Insurance claim processing",
  
  status: "pending",                  // "pending"|"approved"|"denied"|"expired"|"used"
  
  // Approval
  approvedAt: null,
  approvedDurationSeconds: null,       // e.g., 3600 (1 hour)
  expiresAt: null,
  
  // Usage tracking
  downloadedAt: null,
  downloadCount: 0                     // max 1
}
```

### Collection: `payments`
```javascript
// payments/{paymentId}
{
  payerId: "pat_123",
  payerRole: "patient",               // "patient" | "doctor"
  payerName: "Amit Roy",
  
  amount: 49,
  currency: "INR",
  gstAmount: 7.49,
  totalAmount: 57.81,                 // inclusive of GST
  
  gatewayFee: 0.74,
  netAmount: 41.51,                   // after gateway fee, before commission
  
  // Commission (patient payments only)
  doctorCommission: 29,
  doctorId: "doc_456",
  couponApplied: null,
  couponDiscount: 0,
  healqrShare: 20,
  
  // IOB gateway details
  gatewayOrderId: "IOB_xxxxxxxx",
  gatewayPaymentId: "PAY_xxxxxxxx",
  gatewayStatus: "SUCCESS",
  
  // Metadata
  paymentType: "subscription",        // "subscription" | "reactivation" | "premium_upgrade"
  subscriptionMonth: "2026-04",
  createdAt: Timestamp,
  completedAt: Timestamp,
  
  // Invoice
  invoiceNumber: "HQR-2026-04-00123",
  invoiceUrl: "storage://invoices/HQR-2026-04-00123.pdf"
}
```

### Collection: `doctorWallet/{doctorId}/transactions`
```javascript
// doctorWallet/{doctorId}/transactions/{txnId}
{
  type: "commission",                 // "commission"|"subscription_debit"|"payout"|"cashback"|"fine_revenue"|"tds"
  amount: 29,
  direction: "credit",               // "credit" | "debit"
  balanceAfter: 1279,
  
  // Reference
  relatedPaymentId: "pay_xxx",
  relatedPatientId: "pat_123",
  relatedPatientName: "Amit Roy",
  description: "Commission for patient Amit Roy - April 2026",
  
  createdAt: Timestamp
}
```

### Collection: `slugRegistry`
```javascript
// slugRegistry/{slug}
{
  doctorId: "doc_456",
  createdAt: Timestamp,
  isActive: true
}
// Purpose: Fast unique slug lookups. Prevents duplicate slugs.
```

---

## 4. FIREBASE STORAGE STRUCTURE

```
medical-locker/
├── {patientId}/
│   ├── files/
│   │   ├── {fileId}/
│   │   │   └── {originalFileName}     ← actual file (PDF, image, etc.)
│   │   └── ...
│   ├── thumbnails/
│   │   ├── {fileId}.webp              ← auto-generated thumbnail
│   │   └── ...
│   └── exports/
│       └── {exportId}.zip             ← generated ZIP for data export (temp, auto-deleted after 24h)
│
doctor-profiles/
├── {doctorId}/
│   ├── profile-photo.webp
│   ├── clinic-photos/
│   │   └── {photoId}.webp
│   └── certificates/
│       └── {certId}.pdf
│
invoices/
├── {invoiceNumber}.pdf                ← auto-generated invoices
```

---

## 5. FIREBASE SECURITY RULES

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ========== SLUG REGISTRY ==========
    match /slugRegistry/{slug} {
      allow read: if true;  // Public — for checking slug availability
      allow write: if false; // Only Cloud Functions can write
    }
    
    // ========== MEDICAL LOCKER ==========
    match /medicalLocker/{patientId} {
      // Patient can read own locker metadata
      allow read: if request.auth != null && request.auth.uid == patientId;
      allow write: if false; // Managed by Cloud Functions
      
      // Files subcollection
      match /files/{fileId} {
        // Patient can always read own files
        allow read: if request.auth != null && request.auth.uid == patientId;
        
        // Doctor with active grant can read
        allow read: if request.auth != null && hasActiveGrant(patientId, request.auth.uid);
        
        // Patient can upload (if active)
        allow create: if request.auth != null 
          && request.auth.uid == patientId
          && isLockerActive(patientId);
        
        // Doctor can upload (if authorized and subscribed)
        allow create: if request.auth != null
          && isDoctorSubscribed(request.auth.uid)
          && isPatientOfDoctor(patientId, request.auth.uid);
        
        // Patient can delete own files (if active or warning)
        allow delete: if request.auth != null
          && request.auth.uid == patientId
          && isLockerActiveOrWarning(patientId);
        
        // Doctor can NEVER delete patient files
        // No update rule for doctors (handled by Cloud Functions for 24h edit window)
      }
      
      // Access Grants
      match /accessGrants/{grantId} {
        allow read: if request.auth != null 
          && (request.auth.uid == patientId 
              || request.auth.uid == resource.data.grantedToDoctorId);
        allow create: if request.auth != null && request.auth.uid == patientId;
        allow update: if request.auth != null && request.auth.uid == patientId;
        // No delete — grants expire or get revoked (status change)
      }
      
      // Access Logs — immutable audit trail
      match /accessLogs/{logId} {
        allow read: if request.auth != null && request.auth.uid == patientId;
        // Only Cloud Functions write logs (not client)
        allow write: if false;
      }
      
      // Download Requests
      match /downloadRequests/{requestId} {
        allow read: if request.auth != null
          && (request.auth.uid == patientId 
              || request.auth.uid == resource.data.requestedBy);
        allow create: if request.auth != null; // Doctor creates request
        allow update: if request.auth != null && request.auth.uid == patientId; // Patient approves/denies
      }
    }
    
    // ========== DOCTOR WALLET ==========
    match /doctorWallet/{doctorId} {
      allow read: if request.auth != null && request.auth.uid == doctorId;
      allow write: if false; // Only Cloud Functions
      
      match /transactions/{txnId} {
        allow read: if request.auth != null && request.auth.uid == doctorId;
        allow write: if false; // Only Cloud Functions
      }
    }
    
    // ========== PAYMENTS ==========
    match /payments/{paymentId} {
      allow read: if request.auth != null 
        && (request.auth.uid == resource.data.payerId
            || request.auth.uid == resource.data.doctorId);
      allow write: if false; // Only Cloud Functions (after IOB webhook)
    }
    
    // ========== HELPER FUNCTIONS ==========
    function hasActiveGrant(patientId, doctorId) {
      // Check if doctor has an active, non-expired grant
      // Note: This is simplified. In practice, use Cloud Functions for complex checks.
      return exists(/databases/$(database)/documents/medicalLocker/$(patientId)/accessGrants/$(doctorId))
        && get(/databases/$(database)/documents/medicalLocker/$(patientId)/accessGrants/$(doctorId)).data.status == "active";
    }
    
    function isLockerActive(patientId) {
      return get(/databases/$(database)/documents/patients/$(patientId)).data.medicalLocker.status == "active";
    }
    
    function isLockerActiveOrWarning(patientId) {
      let status = get(/databases/$(database)/documents/patients/$(patientId)).data.medicalLocker.status;
      return status == "active" || status == "warning";
    }
    
    function isDoctorSubscribed(doctorId) {
      return get(/databases/$(database)/documents/doctors/$(doctorId)).data.lockerSubscription.status == "active";
    }
    
    function isPatientOfDoctor(patientId, doctorId) {
      return get(/databases/$(database)/documents/patients/$(patientId)).data.medicalLocker.referringDoctorId == doctorId;
    }
  }
}
```

### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Medical Locker files
    match /medical-locker/{patientId}/files/{fileId}/{fileName} {
      // Patient can read/write own files
      allow read: if request.auth != null && request.auth.uid == patientId;
      allow write: if request.auth != null && request.auth.uid == patientId
        && request.resource.size < 25 * 1024 * 1024;  // 25MB max per file
      
      // Doctor upload — verified via custom claims or Firestore check
      allow write: if request.auth != null
        && request.auth.token.role == "doctor"
        && request.resource.size < 25 * 1024 * 1024;
      
      // Doctor read — NOT allowed directly from storage
      // Doctor views via Cloud Function that generates signed URL after permission check
      // This prevents direct storage access bypass
    }
    
    // Thumbnails
    match /medical-locker/{patientId}/thumbnails/{thumbnailName} {
      allow read: if request.auth != null && request.auth.uid == patientId;
      allow write: if false; // Generated by Cloud Functions only
    }
    
    // Exports
    match /medical-locker/{patientId}/exports/{exportFile} {
      allow read: if request.auth != null && request.auth.uid == patientId;
      allow write: if false; // Generated by Cloud Functions only
    }
    
    // Doctor profiles
    match /doctor-profiles/{doctorId}/{allPaths=**} {
      allow read: if true;  // Public — doctor profile is visible to all
      allow write: if request.auth != null && request.auth.uid == doctorId
        && request.resource.size < 5 * 1024 * 1024;  // 5MB max
    }
  }
}
```

---

## 6. CLOUD FUNCTIONS SPECIFICATION

### Function 1: Daily Payment Status Check (Scheduled)
```
Name: checkPaymentStatus
Trigger: Cloud Scheduler — runs daily at 2:00 AM IST
Region: asia-south1

Logic:
1. Query all patients with medicalLocker.enabled == true
2. For each patient:
   a. If nextPaymentDue < today AND status == "active" → set status = "warning"
   b. If paymentFailedAt + 30 days < today AND status == "warning" → set status = "frozen"
   c. If paymentFailedAt + 90 days < today AND status == "frozen" → set status = "sealed"
   d. If paymentFailedAt + 180 days < today AND status == "sealed" → set status = "export_only"
   e. If paymentFailedAt + 270 days < today AND status == "export_only" → set status = "archived"
   f. If paymentFailedAt + 365 days < today AND status == "archived" → TRIGGER DELETION
3. Send appropriate notification at each state change (see 05-PAYMENT-LIFECYCLE.md)

Same logic for doctors with lockerSubscription.
```

### Function 2: Process Payment (IOB Webhook)
```
Name: processPayment
Trigger: HTTPS (called by IOB payment gateway webhook)
Region: asia-south1

Logic:
1. Verify webhook signature (IOB provides HMAC key)
2. Validate payment details
3. Create payment document in payments collection
4. If patient payment:
   a. Update patient.medicalLocker.status = "active"
   b. Update patient.medicalLocker.lastPaymentAt = now
   c. Update patient.medicalLocker.nextPaymentDue = now + 30 days
   d. Calculate commission (₹29 or adjusted for coupon)
   e. Credit doctor wallet
   f. Create wallet transaction entry
5. If doctor payment:
   a. Update doctor.lockerSubscription.status = "active"
   b. Update dates
6. Generate invoice PDF
7. Store in Firebase Storage
8. Send confirmation SMS/notification
```

### Function 3: Generate Secure View URL (Callable)
```
Name: getSecureViewUrl
Trigger: Callable (called by frontend when doctor views patient file)
Region: asia-south1

Logic:
1. Verify caller is authenticated
2. Check if caller has active access grant for this patient + file
3. Check grant hasn't expired
4. Generate Firebase Storage signed URL (expiry: 5 minutes)
5. Log access in accessLogs collection
6. Return signed URL to client if all checks pass
7. Return error if access denied
```

### Function 4: Export Patient Data (Callable)
```
Name: exportPatientData
Trigger: Callable (called by patient from UI)
Region: asia-south1

Logic:
1. Verify caller is the patient
2. Collect all files from Storage
3. Create ZIP archive
4. Upload ZIP to exports/ folder
5. Generate download URL (expiry: 24 hours)
6. Send URL to patient via notification
7. Schedule ZIP deletion after 24 hours
8. Log export in accessLogs
```

### Function 5: Process Reactivation Payment (Callable)
```
Name: processReactivation
Trigger: Callable (after IOB payment confirmed)
Region: asia-south1

Logic:
1. Calculate overdue months
2. Verify payment amount = (overdueMonths × ₹49) + (overdueMonths × ₹9 fine)
3. Process payment
4. Reset status to "active"
5. Fine revenue: credited 100% to HealQR (no doctor commission on overdue months)
6. Regular commission only on current month's ₹49
7. Log reactivation
```

### Function 6: Delete Expired Locker Data (Triggered by Status Check)
```
Name: deleteExpiredLocker
Trigger: Called by checkPaymentStatus when status reaches 365 days overdue
Region: asia-south1

Logic:
1. Final notification: "Your data will be permanently deleted in 24 hours"
2. Wait 24 hours (scheduled)
3. Delete all files from Firebase Storage (medical-locker/{patientId}/*)
4. Delete all Firestore documents (medicalLocker/{patientId}/*)
5. Update patient.medicalLocker.status = "deleted"
6. Retain payment history (for accounting/tax)
7. Retain anonymized usage stats
8. Send final confirmation: "Your Medical Locker data has been permanently deleted"
9. Notify referring doctor
```

### Function 7: Commission Calculation (Monthly — Scheduled)
```
Name: calculateMonthlyCommissions
Trigger: Cloud Scheduler — 1st of every month, 3:00 AM IST
Region: asia-south1

Logic:
1. For each doctor with active subscription:
   a. Count active patients referred by this doctor
   b. Calculate total commission = activePatients × ₹29 (adjusted for coupons)
   c. Credit doctor wallet
   d. Check if annual commission > ₹15,000 → flag for TDS
   e. If 10+ patients this month → add ₹99 cashback bonus
   f. Generate monthly statement
2. For doctors approaching TDS threshold:
   a. Send notification: "Your annual commission is approaching ₹15,000. TDS will apply."
```

### Function 8: Slug Registration (Callable)
```
Name: registerDoctorSlug
Trigger: Callable (doctor registers/claims URL slug)
Region: asia-south1

Logic:
1. Validate slug format (lowercase, alphanumeric + hyphens, 3-50 chars)
2. Check slugRegistry for uniqueness
3. If available:
   a. Create slugRegistry/{slug} document
   b. Update doctor.profileSlug
   c. Return success
4. If taken:
   a. Suggest alternatives: "{slug}-{city}", "{slug}-{specialization}"
   b. Return suggestions
```

---

## 7. FIRESTORE INDEXES

```json
// firestore.indexes.json additions
{
  "indexes": [
    {
      "collectionGroup": "files",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "uploadedBy", "order": "ASCENDING" },
        { "fieldPath": "uploadedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "files",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "uploadedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "accessGrants",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "grantedToDoctorId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "expiresAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "accessLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "performedBy", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "payments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "payerId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 8. NEW REACT COMPONENTS (TO BUILD)

### Phase 1: Doctor Mini Website
```
components/
├── DoctorMiniWebsite.tsx          ← Public doctor profile page
├── DoctorSlugRegistration.tsx     ← Slug claim flow in doctor dashboard
├── DoctorProfileEditor.tsx        ← Edit mini website content
```

### Phase 2: Premium Website + Payment
```
components/
├── DoctorPremiumUpgrade.tsx       ← Upgrade flow + payment
├── DoctorTemplateSelector.tsx     ← Choose theme (classic/modern/minimal)
├── DoctorPremiumEditor.tsx        ← Extended customization
├── PaymentGateway.tsx             ← IOB payment integration component
├── InvoiceViewer.tsx              ← View/download invoices
```

### Phase 3: Medical Locker
```
components/
├── MedicalLockerDashboard.tsx     ← Patient's locker home
├── LockerFileManager.tsx          ← Upload, view, organize files
├── LockerFileViewer.tsx           ← Secure document viewer (with watermark)
├── LockerShareManager.tsx         ← Grant/revoke cross-doctor access
├── LockerAccessLog.tsx            ← View audit trail
├── LockerExport.tsx               ← Export all data as ZIP
├── LockerSettings.tsx             ← Subscription, payment, deletion
├── LockerPaymentStatus.tsx        ← Shows current status + warnings
├── DoctorLockerView.tsx           ← Doctor's view of patient's shared files
├── DoctorUploadToLocker.tsx       ← Doctor uploads Rx to patient locker
├── DownloadRequestHandler.tsx     ← Patient approves/denies doctor download requests
├── LockerSubscriptionFlow.tsx     ← Patient onboarding + consent + payment
```

---

## 9. DEVELOPMENT TIMELINE

### Phase 1: Doctor Mini Website (3-4 days)
```
Day 1: Slug registration (Firestore + Cloud Function + UI)
Day 2: DoctorMiniWebsite component (public profile page)
Day 3: DoctorProfileEditor + routing
Day 4: Testing + deploy
```

### Phase 2: Premium Website + Payment Gateway (2-3 weeks)
```
Week 1: IOB payment gateway integration (sandbox)
         PaymentGateway component
         Invoice generation Cloud Function
Week 2: Premium templates (3 themes)
         DoctorPremiumEditor
         Upgrade flow
Week 3: Testing, payment edge cases, deploy
```

### Phase 3: Medical Locker (3-4 weeks)
```
Week 1: Firestore schema + security rules
         File upload/download flow
         MedicalLockerDashboard + LockerFileManager
Week 2: Cross-doctor access (grants, revocation, expiry)
         LockerShareManager + DoctorLockerView
         Secure viewer with watermark
Week 3: Payment lifecycle (daily check function)
         Non-payment states + reactivation
         Commission calculation + doctor wallet
Week 4: Audit logging, export ZIP, account deletion
         Edge cases, security testing, deploy
```

### Total Estimated Development: 6-8 weeks (Phase 1 → Phase 3)

---

## 10. TESTING CHECKLIST

### Security Tests
- [ ] Patient A cannot access Patient B's files
- [ ] Doctor without grant cannot access patient files
- [ ] Expired grant prevents access
- [ ] Revoked grant prevents access
- [ ] Doctor cannot download without approved request
- [ ] Doctor cannot delete patient files
- [ ] Frozen patient cannot upload/share
- [ ] Sealed patient cannot view files
- [ ] Storage rules prevent direct access bypass
- [ ] Signed URLs expire correctly

### Payment Tests
- [ ] Successful payment updates status to active
- [ ] Failed payment triggers warning state
- [ ] 30-day overdue triggers frozen
- [ ] 90-day overdue triggers sealed
- [ ] Reactivation calculates correct amount (dues + fines)
- [ ] Commission credited correctly to doctor wallet
- [ ] Coupon discount applied correctly
- [ ] HealQR ₹20 minimum protected with max coupon
- [ ] 10+1 cashback triggered at 10 patients
- [ ] TDS flagged at ₹15,000 annual commission

### Data Integrity Tests
- [ ] File upload increments storageUsedMB correctly
- [ ] File delete decrements storageUsedMB
- [ ] Upload blocked when quota exceeded
- [ ] Audit log created for every access
- [ ] Export ZIP contains all files
- [ ] Account deletion removes all files + metadata
- [ ] Payment history retained after deletion
