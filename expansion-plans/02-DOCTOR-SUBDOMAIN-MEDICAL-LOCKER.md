# 🚀 HealQR Expansion Plan — Doctor Subdomain + Medical Locker System

**Prepared for:** Sumanta Chatterjee  
**Date:** April 2026  
**Purpose:** Execution-ready product roadmap for HealQR Phase Expansion

---

# 🧠 1. CORE VISION

Build **HealQR as a Doctor-Centric Digital Ecosystem** where:

- Every doctor gets a **digital identity (subdomain)**
- Patients get a **secure health data locker**
- Doctors use the platform for:
  - Visibility
  - Patient management
  - Retention
  - Additional income opportunities

---

# 🎯 2. PHASE 1 — DOCTOR DIGITAL IDENTITY (FOUNDATION)

## ✅ Objective

Give every doctor an **instant online presence**

---

## ⚙️ Features

### 🔹 Auto Subdomain Creation

On signup:

- Format: `dr-saikat.healqr.com`

### 🔹 Rules

- Lowercase only
- Spaces → "-"
- Unique name system
- Auto-suggestions if duplicate:
  - `dr-saikat-gurgaon.healqr.com`
  - `dr-saikat-clinic.healqr.com`

---

### 🔹 Mini Website (Free)

Each doctor gets:

- Name + specialization
- Clinic details
- Booking integration (HealQR)
- Basic layout

---

### 🔹 Hosting

- Central hosting via Firebase
- Wildcard domain: `*.healqr.com`

---

## 🌐 Visibility

- Page is instantly live via URL
- SEO indexing will take time (not instant)

---

## 💥 Value Delivered

- Zero effort onboarding
- Instant gratification
- First digital identity

---

## 🔧 Technical Implementation

### Wildcard Domain Setup

```
DNS: *.healqr.com → CNAME → Firebase Hosting
Firebase Hosting: Wildcard routing to single React app
App.tsx: Parse subdomain → fetch doctor profile → render mini website
```

### Subdomain Resolution Logic

```
1. User visits dr-saikat.healqr.com
2. Firebase Hosting serves the HealQR app
3. App detects subdomain from window.location.hostname
4. Queries Firestore: doctors where subdomain == "dr-saikat"
5. Renders public doctor profile page (no login required)
6. "Book Appointment" button → HealQR booking flow
```

### Firestore Schema Addition

```
doctors/{doctorId}
  ├── subdomain: "dr-saikat"          // unique, indexed
  ├── subdomainCreatedAt: timestamp
  ├── miniWebsite: {
  │     enabled: true,
  │     theme: "default" | "premium1" | "premium2",
  │     sections: ["about", "services", "timings", "reviews"],
  │     customSections: [],           // premium only
  │     showBranding: true,           // false for premium
  │     seoTitle: "",                 // premium only
  │     seoDescription: ""           // premium only
  │   }
  └── ...existing fields
```

---

# 💰 3. PHASE 2 — PREMIUM WEBSITE MONETIZATION

## 🎯 Objective

Convert free users → paying users

---

## 💳 Pricing Model

| Tier | Cost | Features |
|---|---|---|
| **Free** | ₹0 | Basic mini website, HealQR branding, standard layout |
| **Premium** | ₹999 one-time + ₹99/month | Full website builder, custom sections, branding removal, better design, SEO, appointment integration |

---

## 🔹 Premium Features Detail

| Feature | Free | Premium |
|---|---|---|
| Subdomain (dr-name.healqr.com) | ✅ | ✅ |
| Name + Specialization | ✅ | ✅ |
| Clinic Address + Map | ✅ | ✅ |
| Basic Appointment Button | ✅ | ✅ |
| Custom Sections (Services, Awards, Gallery) | ❌ | ✅ |
| Theme Selection | ❌ | ✅ (3+ themes) |
| Remove "Powered by HealQR" branding | ❌ | ✅ |
| SEO Meta Tags (title, description) | ❌ | ✅ |
| Google Analytics Integration | ❌ | ✅ |
| Contact Form | ❌ | ✅ |
| Video Introduction | ❌ | ✅ |
| Testimonials Section | ❌ | ✅ |
| Profile View Counter | ❌ | ✅ |

---

## 🎁 Bundle Offer

- **Premium signup → FREE: 2GB Medical Locker for 3 months**
- Creates natural bridge from Phase 2 → Phase 3

---

## 💡 Strategy

👉 **"Free identity → Premium upgrade → Ecosystem lock-in"**

---

## 🔧 Technical Implementation

### Payment Integration

```
Doctor clicks "Upgrade to Premium"
  → Razorpay payment gateway (₹999 one-time)
  → On success: update doctor.miniWebsite.theme = "premium"
  → Enable premium features
  → Start ₹99/month recurring (Razorpay subscription)
  → Auto-activate 2GB Medical Locker (3 months free)
```

### Premium Website Builder

```
Doctor Dashboard → "My Website" section
  → Drag-and-drop section reorder
  → Add/remove sections
  → Theme picker (live preview)
  → SEO settings form
  → Save → Instant update on dr-name.healqr.com
```

---

# 🧠 4. PHASE 3 — MEDICAL LOCKER SYSTEM (CORE MONETIZATION ENGINE)

## 🎯 Objective

Create recurring revenue + retention system

---

## 🔐 Core Concept

### 👤 Patient

- Owns ALL medical data
- Controls access
- Can share with any doctor

### 👨‍⚕️ Doctor

- Can ALWAYS access own prescriptions (what they wrote)
- Needs PERMISSION for other doctors' data
- Cannot delete patient's data

---

## 🔄 Access Logic

| Data Type | Access | Duration |
|---|---|---|
| Own Rx (doctor wrote it) | Permanent | Lifetime |
| Other doctor's Rx | Permission-based | Time-limited (set by patient) |
| Lab reports | Permission-based | Time-limited |
| Patient medical history | Permission-based | Time-limited |

### Permission Flow

```
Doctor requests access to patient's full medical history
  → Patient gets notification
  → Patient approves with time limit (1 day / 1 week / 1 month)
  → Doctor can view during approved period
  → Auto-expires after time limit
  → Access log recorded (audit trail)
```

---

## 🔐 Security Requirements

| Requirement | Implementation |
|---|---|
| Encryption at rest | Firebase default encryption + custom field-level encryption for sensitive data |
| Encryption in transit | HTTPS (Firebase default) |
| OTP-based login | Firebase Phone Auth (existing) |
| Access logs (audit trail) | Firestore collection: `medicalLocker/{patientId}/accessLogs` |
| Data portability | Export all data as PDF/ZIP |
| Right to erasure | Patient can request full data deletion |
| DPDP Act compliance | Consent-based, purpose-limited, time-bound access |

---

# 💾 5. STORAGE MODEL

## 💳 Doctor Purchases Storage

| Plan | Storage | Cost |
|---|---|---|
| Basic | 2 GB | ₹99/month |
| Add-on | +2 GB each | +₹99/month each |
| Bundle (with Premium Website) | 2 GB | FREE for 3 months |

---

## 📊 Storage Logic

- **Shared pool model** — Doctor buys 2GB, all their patients share from this pool
- NOT per-patient allocation
- Doctor sees: "Used: 1.2 GB / 2.0 GB"

---

## 📈 Capacity Planning

| Metric | Value |
|---|---|
| Average per patient | 5-10 MB (Rx images, lab reports, documents) |
| 2 GB capacity | ~200-400 patients (comfortable) |
| 100-200 active patients | Safe within 2 GB |

---

## 🔧 Technical Implementation

### Storage Architecture

```
Firebase Storage:
  medical-locker/
    {patientId}/
      rx/
        {rxId}.pdf
        {rxId}_thumb.jpg
      lab-reports/
        {reportId}.pdf
      documents/
        {docId}.pdf
      profile/
        photo.jpg

Firestore:
  medicalLocker/{patientId}
    ├── totalSize: 8500000  (bytes — tracked on every upload)
    ├── fileCount: 12
    ├── doctorId: "abc123"  (primary doctor who owns the storage)
    ├── sharedWith: [{ doctorId, accessLevel, expiresAt }]
    │
    ├── files/{fileId}
    │     ├── name, type, size, uploadedAt, uploadedBy
    │     ├── category: "rx" | "lab-report" | "document" | "image"
    │     ├── storagePath
    │     └── metadata: {}
    │
    └── accessLogs/{logId}
          ├── doctorId, action, timestamp
          └── filesAccessed: []

  doctors/{doctorId}
    ├── locker: {
    │     storagePurchased: 2147483648,  // 2GB in bytes
    │     storageUsed: 1258291200,       // tracked
    │     plan: "basic" | "premium",
    │     activeSince: timestamp,
    │     freeTrialEndsAt: timestamp,
    │     patientCount: 145
    │   }
    └── ...existing fields
```

### Storage Tracking

```
On every file upload:
  1. Check doctor's remaining storage (storagePurchased - storageUsed)
  2. If insufficient → prompt upgrade
  3. On upload success → increment doctor.locker.storageUsed
  4. On file delete → decrement doctor.locker.storageUsed
```

---

# 💰 6. DOCTOR MONETIZATION MODEL

## 🎯 Doctor Control

Doctor can:

| Action | Details |
|---|---|
| Charge patients | Recommended ₹49/month per patient |
| Offer free trial | 1-3 months (doctor's choice) |
| Bundle with services | "Free locker with annual health check-up package" |
| Set their own price | Platform does not enforce patient pricing |

---

## 💸 Revenue Flow

```
Patient pays Doctor: ₹49/month (doctor sets price)
Doctor pays HealQR: ₹99/month (fixed platform fee for 2GB)
Doctor's margin: Variable (depends on patient count)

Example:
  - Doctor has 100 active patients paying ₹49/month
  - Doctor revenue: ₹4,900/month
  - Doctor pays HealQR: ₹99/month (2GB sufficient)
  - Doctor profit: ₹4,801/month from locker alone
```

---

## ⚠️ Important Rules

- Patient data ownership **ALWAYS** remains with patient
- Doctor is facilitator, NOT data owner
- Patient can leave anytime and take their data
- Doctor cannot hold data hostage

---

# 🎁 7. FREE TRIAL STRATEGY

## 🔹 Trigger-Based Activation

Start 3-month free period when:

- First patient added to locker **OR**
- First file uploaded to locker

NOT on signup — prevents waste of free period.

---

## 🔹 Controlled Free Usage

| Day | Action |
|---|---|
| Day 1 | Free trial starts (on first use) |
| Day 60 | Warning: "30 days remaining in free trial" |
| Day 75 | Warning: "15 days remaining — upgrade to continue" |
| Day 85 | Warning: "5 days remaining" |
| Day 90 | Trial ends → read-only mode (no new uploads, existing data safe) |
| Day 90+ | Upgrade prompt on every login |

### Critical Rule: Data is NEVER deleted on trial expiry
- Read-only mode only
- Patient data must remain accessible
- Doctor just can't add new files until they upgrade

---

# 💥 8. VALUE PROPOSITION SUMMARY

## For Doctor

| Benefit | Impact |
|---|---|
| Digital identity | Instant online presence (subdomain) |
| Professional website | Patient trust + discoverability |
| Patient retention | Health records tied to doctor → patients don't switch |
| Additional income | ₹49/patient/month from locker |
| Data access | View patient's full history (with permission) |
| Competitive edge | "I offer digital health records" — differentiator |

## For Patient

| Benefit | Impact |
|---|---|
| Secure storage | All medical records in one place |
| Easy sharing | Share with any doctor in one tap |
| Lifetime records | From age 3 (SchoolHealth) to lifetime |
| Trend tracking | See health parameters over years |
| Trust via doctor | Doctor recommended → patient trusts it |

## For HealQR

| Benefit | Impact |
|---|---|
| SaaS revenue | ₹99/month per doctor (storage) |
| Website revenue | ₹999 one-time + ₹99/month (premium website) |
| Advertiser revenue | Parent/patient base = premium ad audience |
| Ecosystem lock-in | Doctor + Patient + Data = unbreakable loop |
| Data insights | Anonymized health trends for advertisers (with consent) |

---

# ⚠️ 9. CRITICAL RISKS & MITIGATION

## 🚨 1. Data Privacy (DPDP Act 2023)

| Risk | Mitigation |
|---|---|
| Medical data misuse | Consent-based access, time-limited permissions |
| Unauthorized sharing | Audit logs on every access |
| Data breach | Firebase security rules, field-level encryption |
| Non-compliance | Annual DPDP compliance review, privacy policy updates |

## 🚨 2. Storage Overuse

| Risk | Mitigation |
|---|---|
| Free trial abuse | Trigger-based activation (not on signup) |
| Large file uploads | File size limit: 10 MB per file |
| System overload | Shared pool model with clear limits |
| Cost escalation | Firebase Storage pricing is ₹1.5/GB — margin is huge |

## 🚨 3. Pricing Instability

| Risk | Mitigation |
|---|---|
| Frequent price changes | Lock price for existing users (grandfather clause) |
| Trust loss | Apply new pricing only to new users |
| Competition undercutting | Value is in ecosystem, not storage price — difficult to replicate |

## 🚨 4. Doctor Non-Adoption

| Risk | Mitigation |
|---|---|
| Doctors don't see value | Free subdomain is zero-friction entry point |
| "I don't need a website" | Show patient booking stats from subdomain |
| "Storage is expensive" | ₹99/month is less than a single patient consultation fee |

---

# 📊 10. UNIT ECONOMICS

## Cost Side

| Item | Cost |
|---|---|
| 2GB Firebase Storage | ₹3-5/month |
| Firestore reads/writes per doctor | ₹2-5/month |
| Firebase Hosting (subdomain) | ₹0 (shared hosting) |
| **Total cost per doctor** | **₹5-10/month** |

## Revenue Side

| Source | Revenue per doctor |
|---|---|
| Premium website (₹999 + ₹99/month) | ₹99/month recurring |
| Medical locker (₹99/month for 2GB) | ₹99/month recurring |
| **Total revenue per doctor** | **₹198/month** |

## Margin

| Metric | Value |
|---|---|
| Revenue per doctor | ₹198/month |
| Cost per doctor | ₹10/month |
| **Gross margin** | **~95%** |

## Scale Projections

| Doctors | Monthly Revenue | Monthly Cost | Monthly Profit |
|---|---|---|---|
| 100 | ₹19,800 | ₹1,000 | ₹18,800 |
| 1,000 | ₹1,98,000 | ₹10,000 | ₹1,88,000 |
| 10,000 | ₹19,80,000 | ₹1,00,000 | ₹18,80,000 |
| 1,00,000 | ₹1,98,00,000 | ₹10,00,000 | ₹1,88,00,000 |

---

# 🔥 11. CORE BUSINESS MODEL

## Type: B2B2C SaaS Platform

```
HealQR (Platform)
    ↓ sells to
Doctor (B2B customer)
    ↓ offers to
Patient (End consumer — B2C)
```

- Doctor is the customer AND the distribution channel
- Patient is the end user AND the data source
- HealQR is the platform AND the monetization engine

---

# 🔮 12. FUTURE PHASE HINTS

## Phase 4 — Patient App (Standalone)
- Personal health dashboard
- Direct access to locker (without doctor)
- QR-based sharing with any hospital
- Emergency health card

## Phase 5 — AI Layer
- Lab report AI summary (Gemini)
- Health trend insights ("Your cholesterol is trending up")
- Follow-up suggestions
- Drug interaction alerts

## Phase 6 — Ecosystem Expansion
- Pharmacy integration (Rx → pharmacy → delivery)
- Lab reports auto-sync (lab API integration)
- Insurance linkage (health data → better premiums)
- ABDM/ABHA integration

---

# 🧠 13. GROWTH LOOP

```
1 Doctor → 50 Patients → 50 data points
10 Doctors → 500 Patients → 500 data points
100 Doctors → 5,000 Patients → valuable health dataset
1,000 Doctors → 50,000 Patients → advertiser magnet
10,000 Doctors → 5,00,000 Patients → ecosystem moat
1,00,000 Doctors → 50,00,000 Patients → national health infrastructure
```

👉 **Organic scaling via doctors — zero CAC (customer acquisition cost)**

---

# 🔥 14. CONVERSION FUNNEL

```
Step 1: Doctor signs up → gets FREE subdomain (dr-name.healqr.com)
        ↓ (instant gratification)
Step 2: Doctor sees patient bookings from subdomain → upgrades to Premium Website
        ↓ (₹999 + ₹99/month — clear ROI)
Step 3: Premium includes 3-month FREE Medical Locker → doctor starts using it
        ↓ (habit formed in 3 months)
Step 4: Trial ends → doctor pays ₹99/month to continue → patients pay doctor
        ↓ (revenue flywheel)
Step 5: Doctor recommends HealQR to colleagues → organic growth
        ↓ (network effect)
```

---

# ✅ 15. EXECUTION PRIORITY

| Step | What | Dependencies | Effort |
|---|---|---|---|
| **Step 1** | Subdomain system + mini website | Wildcard DNS setup, Firebase Hosting config | 3-4 days |
| **Step 2** | Premium website upgrade (Razorpay) | Payment gateway integration | 2-3 days |
| **Step 3** | Medical locker — basic version (upload, view, share) | Storage rules, encryption | 4-5 days |
| **Step 4** | Security hardening (audit logs, permissions, encryption) | — | 2-3 days |
| **Step 5** | Advanced features (AI summary, trends, lab sync) | Gemini API | 3-5 days |
| **Total** | | | **~15-20 days** |

---

# 🙌 16. FINAL NOTE

**This is NOT:**
- ❌ A website builder
- ❌ A storage platform
- ❌ A generic health app

**This IS:**

# 💥 "Doctor-Centric Digital Healthcare Ecosystem"

Where the doctor is the anchor, the patient is the beneficiary, and HealQR is the invisible infrastructure that powers everything.

---

# 💡 17. CONNECTION WITH SCHOOLHEALTH MODULE

```
SchoolHealth Module          Medical Locker
       ↓                          ↓
Child (age 3-18)           Patient (age 18+)
       ↓                          ↓
School health records      Adult medical records
       ↓                          ↓
    MERGE at age 18 → Lifetime health profile
```

**The child who enters the SchoolHealth module at age 3 exits into the Medical Locker at age 18 — with 15 years of health data already stored. This is the lifetime patient capture that no competitor can replicate.**

---

**Ready for development with VS Code AI agent.**
