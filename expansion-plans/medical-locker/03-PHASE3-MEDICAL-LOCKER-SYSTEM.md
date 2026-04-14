# Phase 3 — Medical Locker System (Core Product)

**Timeline:** 2-3 weeks  
**Revenue:** ₹49/month per patient (₹20 HealQR + ₹29 doctor commission)  
**Revenue:** ₹99/month per doctor (storage subscription)  
**Legal Risk:** MEDIUM (data custody — mitigated by design)  
**Storage:** Firebase Storage (₹2.15/GB/month)  

---

## 1. WHAT IS THE MEDICAL LOCKER?

A **paid, doctor-referred, patient-owned** digital storage space for medical records.

```
Patient pays HealQR ₹49/month → gets 500MB secure cloud storage
Doctor pays HealQR ₹99/month → gets dashboard + upload access + ₹29/patient commission
```

### What Goes in the Locker
| Data Type | Who Uploads | Format |
|---|---|---|
| Prescriptions (Rx) | Doctor (during/after consultation) | Image / PDF |
| Lab Reports | Patient or Doctor | Image / PDF |
| Imaging (X-ray, MRI, Ultrasound) | Patient or Doctor | Image / PDF |
| Vaccination Records | Patient or Doctor | Image / PDF |
| Discharge Summaries | Patient | Image / PDF |
| Insurance Documents | Patient | PDF |
| Any Medical Document | Patient | Image / PDF |

### What Does NOT Go in the Locker
- Non-medical documents (ID cards, bank statements)
- Arbitrary files (videos, executables, archives)
- **Allowed formats only:** JPG, PNG, PDF
- **Max per file:** 10 MB

---

## 2. STORAGE PLANS

### For Doctor (Pays HealQR)
| Plan | Storage | Price | Patients Supported |
|---|---|---|---|
| Basic | 2 GB | ₹99/month | ~200 patients (shared pool) |
| Plus | 5 GB | ₹400/month | ~500 patients |
| Pro | 10 GB | ₹750/month | ~1,000 patients |
| Custom | 10 GB+ | Contact us | Large clinics |

**Note:** Doctor's storage is the UPLOAD POOL. Doctor uploads to patient lockers. The upload bandwidth comes from doctor's pool. Patient's 500MB is THEIR storage limit.

### For Patient (Pays HealQR Directly)
| Plan | Storage | Price |
|---|---|---|
| Standard | 500 MB | ₹49/month |

**500MB per patient is sufficient:**
| File Type | Avg Size | How Many in 500MB |
|---|---|---|
| Rx image (photo) | 1-3 MB | 170-500 prescriptions |
| Lab report PDF | 200 KB - 1 MB | 500-2,500 reports |
| X-ray image | 2-5 MB | 100-250 images |
| Mixed typical usage | ~2 MB avg | **~250 documents** |

A patient visiting 4 doctors, getting 10 documents/year = 40 documents/year. 500MB lasts **6+ years** for typical use.

---

## 3. HOW IT WORKS — STEP BY STEP

### Patient Onboarding
```
1. Doctor recommends Medical Locker to patient (during consultation)
2. Patient opens HealQR app/website → "Medical Locker" section
3. Patient sees: "₹49/month — Secure your medical records forever"
4. Patient enters referral code (doctor's code — auto-filled if booked via HealQR)
5. Patient pays ₹49 via IOB payment gateway
6. 500MB locker created: medical-locker/{patientId}/
7. Doctor gets ₹29 commission credit
8. Doctor can now upload Rx/reports to this patient's locker
```

### Doctor Uploading to Patient Locker
```
1. Doctor opens patient's consultation (existing flow)
2. After writing Rx → new button: "Save to Patient Locker"
3. Doctor uploads Rx image/PDF
4. File saved to: medical-locker/{patientId}/rx/{rxId}.pdf
5. Patient gets notification: "Dr. Saikat saved a new prescription to your locker"
6. Patient can view from their dashboard anytime
```

### Patient Viewing Own Data
```
1. Patient opens HealQR → "My Medical Locker"
2. Sees all files organized by:
   - By Doctor (tabs for each doctor who uploaded)
   - By Type (Rx / Lab Report / Imaging / Other)
   - By Date (timeline view)
3. Can download any file
4. Can share access with another doctor (see 07-ACCESS-PERMISSIONS.md)
```

---

## 4. CROSS-DOCTOR ACCESS (Critical Feature)

This is the **core value proposition** — one patient, multiple doctors, unified records.

### How It Works
```
Patient sees Dr. Saikat (dentist) → Rx saved in locker
Patient sees Dr. Meera (cardiologist) → Rx saved in locker
Patient sees Dr. Roy (GP) → Rx saved in locker

Dr. Roy wants to see what Dr. Saikat prescribed before referring:

1. Dr. Roy clicks "Request Access" for this patient
2. Patient gets notification: "Dr. Roy wants to view your dental records"
3. Patient chooses:
   - Allow for 1 day / 1 week / 1 month / permanent
   - Allow specific files vs all files
   - Allow view-only vs view+download
4. Dr. Roy gets access within approved scope
5. Access auto-expires after approved duration
6. Every view/download logged in audit trail
```

### Access Levels
| Level | What Doctor Can Do |
|---|---|
| **Own Data** | View always (created by this doctor) |
| **Shared — View Only** | View on screen only (no download, no print) |
| **Shared — View + Download** | View + download (requires explicit patient consent) |

**Full details in `07-ACCESS-PERMISSIONS.md`**

---

## 5. DOCTOR'S DASHBOARD — LOCKER SECTION

### New Section: "Patient Locker" in Doctor Dashboard
```
┌─────────────────────────────────────────────────┐
│  Medical Locker                    Storage: 1.2GB / 2GB
│  ──────────────────────────────────────────────
│  Active Patients: 45    Commission: ₹1,305/month
│  
│  [Search patient name/phone]
│  
│  Patient List (locker-enabled only):
│  ┌────────────────────────────────────────────┐
│  │ ☑ Rahul Das     │ 12 files │ 45MB │ Active │
│  │ ☑ Priya Ghosh   │ 8 files  │ 23MB │ Active │
│  │ ☑ Amit Kumar    │ 3 files  │ 8MB  │ Frozen │
│  │ ☑ Sonia Roy     │ 22 files │ 89MB │ Active │
│  └────────────────────────────────────────────┘
│  
│  Quick Actions:
│  [Upload to Patient] [View Storage Usage] [Commission Report]
└─────────────────────────────────────────────────┘
```

---

## 6. PATIENT'S DASHBOARD — LOCKER SECTION

### New Section: "My Medical Locker" in Patient Dashboard
```
┌──────────────────────────────────────────────────┐
│  My Medical Locker               Used: 67MB / 500MB
│  Subscription: Active (₹49/month, next: May 15)
│  ──────────────────────────────────────────────
│  
│  [By Doctor ▼]  [By Type ▼]  [By Date ▼]  [Upload New]
│  
│  ┌────────────────────────────────────────────────┐
│  │ 📋 Rx — Dr. Saikat Mukherjee                  │
│  │    Date: April 10, 2026 │ 2.3 MB              │
│  │    [View] [Download] [Share with Doctor]       │
│  ├────────────────────────────────────────────────┤
│  │ 🔬 Lab Report — Self-uploaded                  │
│  │    Date: April 5, 2026 │ 890 KB               │
│  │    [View] [Download] [Share with Doctor]       │
│  ├────────────────────────────────────────────────┤
│  │ 📋 Rx — Dr. Meera Chatterjee                  │
│  │    Date: March 28, 2026 │ 1.8 MB              │
│  │    [View] [Download] [Share with Doctor]       │
│  └────────────────────────────────────────────────┘
│  
│  Shared Access:
│  Dr. Roy (GP) — View only — Expires: April 20, 2026
│  
│  [Manage Access] [Export All (ZIP)] [Payment History]
└──────────────────────────────────────────────────┘
```

---

## 7. REFERRAL CODE SYSTEM

Each doctor gets a unique referral code for Medical Locker:

```
Doctor profile → "My Locker Referral Code": DRSAIKAT2026
```

| When Used | Effect |
|---|---|
| Patient enters code at signup | Doctor gets ₹29/month commission |
| Patient booked via HealQR already | Code auto-applied (referring doctor) |
| Patient enters wrong/no code | No commission (patient still gets locker) |
| Patient referred by two doctors | First doctor's code wins |

---

## 8. UPGRADE FLOW

```
Patient on 500MB, reaching limit:
  → Dashboard shows: "Storage 480MB / 500MB — Running low!"
  → Option: "Upgrade to 1GB for ₹89/month"
  → Or: "Delete old files to free space"

Doctor on 2GB, too many patients:
  → Dashboard shows: "Upload pool: 1.8GB / 2GB"
  → Option: "Upgrade to 5GB for ₹400/month"
```

---

## 9. TECHNICAL IMPLEMENTATION

### Firebase Storage Structure
```
medical-locker/
  {patientId}/
    rx/
      {rxId}.pdf
      {rxId}_thumb.jpg      (auto-generated thumbnail)
    lab-reports/
      {reportId}.pdf
    imaging/
      {imageId}.jpg
    documents/
      {docId}.pdf
    profile/
      photo.jpg              (optional patient photo)
```

### Firestore Collections

#### Patient Locker Metadata
```
medicalLocker/{patientId}
  ├── status: "active" | "warning" | "frozen" | "sealed" | "export-only" | "archived"
  ├── storagePurchased: 524288000       // 500MB in bytes
  ├── storageUsed: 70254592             // tracked on every upload/delete
  ├── fileCount: 22
  ├── referringDoctorId: "doc_abc123"
  ├── subscriptionStartDate: timestamp
  ├── lastPaymentDate: timestamp
  ├── lastPaymentAmount: 49
  ├── paymentStatus: "active" | "overdue" | "cancelled"
  ├── overdueMonths: 0
  ├── createdAt: timestamp
  │
  ├── files/{fileId}
  │     ├── name: "prescription_apr10.pdf"
  │     ├── type: "rx" | "lab-report" | "imaging" | "document"
  │     ├── size: 2408448               // bytes
  │     ├── storagePath: "medical-locker/pat123/rx/rx_001.pdf"
  │     ├── thumbnailPath: "medical-locker/pat123/rx/rx_001_thumb.jpg"
  │     ├── uploadedBy: "doc_abc123"    // doctorId or patientId
  │     ├── uploadedByName: "Dr. Saikat"
  │     ├── uploadedAt: timestamp
  │     ├── doctorId: "doc_abc123"      // null if self-uploaded
  │     ├── consultationId: "booking_xyz"  // linked to HealQR booking
  │     └── metadata: { notes: "Follow-up Rx" }
  │
  ├── accessGrants/{grantId}
  │     ├── doctorId: "doc_xyz789"
  │     ├── doctorName: "Dr. Roy"
  │     ├── accessLevel: "view-only" | "view-download"
  │     ├── scope: "all" | "specific"
  │     ├── fileIds: ["file1", "file2"]   // if scope == "specific"
  │     ├── grantedAt: timestamp
  │     ├── expiresAt: timestamp
  │     └── status: "active" | "expired" | "revoked"
  │
  └── accessLogs/{logId}
        ├── doctorId: "doc_xyz789"
        ├── doctorName: "Dr. Roy"
        ├── action: "viewed" | "downloaded" | "requested" | "granted" | "revoked"
        ├── fileId: "file1"             // null for bulk actions
        ├── timestamp: timestamp
        └── ipAddress: "xxx.xxx.xxx.xxx" // optional
```

#### Doctor Locker Dashboard
```
doctors/{doctorId}
  ├── locker: {
  │     active: true,
  │     storagePurchased: 2147483648,    // 2GB in bytes
  │     storageUsed: 1258291200,         // tracked
  │     plan: "basic" | "plus" | "pro",
  │     activeSince: timestamp,
  │     freeTrialEndsAt: timestamp,      // if from Phase 2 premium
  │     patientCount: 45,
  │     monthlyCommission: 1305,         // 45 × ₹29
  │     referralCode: "DRSAIKAT2026"
  │   }
  └── ...existing fields
```

### Firestore Security Rules
```
// Patient can read/write own locker
match /medicalLocker/{patientId} {
  allow read: if request.auth.uid == patientId;
  allow write: if request.auth.uid == patientId;
  
  // Files subcollection
  match /files/{fileId} {
    // Patient can read all own files
    allow read: if request.auth.uid == patientId;
    // Patient can delete own files
    allow delete: if request.auth.uid == patientId;
    // Doctor can create (upload) if patient locker is active
    allow create: if isDoctor(request.auth.uid) 
                  && getLockerStatus(patientId) == 'active';
    // Doctor CANNOT delete files (needs patient permission)
    allow delete: if false; // only patient deletes
  }
  
  // Access grants — only patient can manage
  match /accessGrants/{grantId} {
    allow read, write: if request.auth.uid == patientId;
    // Doctor can read grants where they are the grantee
    allow read: if request.auth.uid == resource.data.doctorId;
  }
  
  // Access logs — only patient can read full log
  // Doctor can read logs about themselves
  match /accessLogs/{logId} {
    allow read: if request.auth.uid == patientId 
                || request.auth.uid == resource.data.doctorId;
    allow create: if true; // system logs on any access
  }
}
```

---

## 10. FILE UPLOAD FLOW (Technical)

```
Doctor uploads Rx to patient locker:

1. Frontend: Doctor selects file (max 10MB, JPG/PNG/PDF)
2. Frontend: Check patient locker status == 'active'
3. Frontend: Check patient storageUsed + fileSize <= storagePurchased
4. Frontend: Check doctor storageUsed + fileSize <= doctor.storagePurchased
5. If all pass:
   a. Upload to Firebase Storage: medical-locker/{patientId}/rx/{fileId}.pdf
   b. Generate thumbnail (if image)
   c. Create Firestore: medicalLocker/{patientId}/files/{fileId}
   d. Increment: medicalLocker/{patientId}.storageUsed += fileSize
   e. Increment: doctors/{doctorId}.locker.storageUsed += fileSize
   f. Send notification to patient: "New Rx saved to your locker"
6. If storage full:
   → Show: "Patient's locker is full. Ask patient to upgrade or delete old files."
```

---

## 11. DEVELOPMENT CHECKLIST

| # | Task | Effort |
|---|---|---|
| 1 | Firestore collections + security rules for medicalLocker | 1 day |
| 2 | Firebase Storage structure + upload rules | 0.5 day |
| 3 | Patient locker signup + payment flow (IOB gateway) | 2 days |
| 4 | Patient dashboard: "My Medical Locker" section | 2 days |
| 5 | Doctor dashboard: "Patient Locker" section | 2 days |
| 6 | File upload from doctor → patient locker | 1.5 days |
| 7 | File viewer (PDF/image preview in-browser) | 1 day |
| 8 | Cross-doctor access request + approval flow | 2 days |
| 9 | Access audit logging (Cloud Function) | 1 day |
| 10 | Storage tracking + upgrade prompts | 1 day |
| 11 | Referral code system + commission tracking | 1 day |
| 12 | Export all as ZIP (Cloud Function) | 1 day |
| **Total** | | **~2-3 weeks** |

---

## 12. WHAT THIS IS NOT

| This is NOT | Why |
|---|---|
| An EMR/EHR system | We don't structure medical data — we STORE files |
| A diagnostic tool | No AI analysis on locker data (legal risk) |
| A government health record | Private SaaS, not ABDM |
| A medical advice platform | No treatment recommendations |
| Free storage | Paid service — value in payment |

**Medical Locker = Digital bank locker for health documents. Nothing more, nothing less.**
