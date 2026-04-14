# 🏫 HealQR SchoolHealth Module — Comprehensive Plan

**Prepared for:** Sumanta Chatterjee  
**Date:** April 2026  
**Purpose:** Execution-ready plan for SchoolHealth module inside HealQR  
**Development Start:** April 14, 2026

---

# 🧠 1. CORE VISION

**Turn every doctor into a school health partner** — Pediatricians, Dentists, and Ophthalmologists partner with schools to digitize student health screening. Parents become HealQR users. Today's child becomes tomorrow's adult patient. Doctors gain lifetime patient retention.

---

# 🎯 2. THE STRATEGY (NOT A STANDALONE PRODUCT)

This is **NOT** a separate SaaS sold to schools.  
This is a **HealQR Doctor Dashboard module** — free to schools, distributed by doctors.

```
Doctor (Paed/Dentist/Ophthalmologist) subscribes to HealQR
        ↓
Doctor partners with 5-10 schools in their area
        ↓
School uses HealQR's SchoolHealth module (FREE to school)
        ↓
Every student's parent downloads/uses HealQR
        ↓
Child gets sick → parent already has the doctor's profile → books via HealQR
        ↓
Child grows up (18+) → continues as the doctor's adult patient
        ↓
5,000 parents per school × 10 schools = 50,000 active HealQR users
        ↓
Advertisers pay HealQR for access to 50,000 health-conscious parents
```

---

# 👥 3. ANCHOR SPECIALTIES (Distribution Partners)

| Specialty | School Role | Patient Acquisition |
|---|---|---|
| **Pediatrician / GP / CP** | General health screening (height, weight, BMI, hemoglobin) | Becomes the family doctor for all childhood illnesses |
| **Dentist** | Dental screening (cavities, alignment, hygiene score) | Every child with a dental issue → parent books appointment |
| **Ophthalmologist** | Vision screening (Snellen chart, color blindness, squint) | Every child with vision issue → parent books eye checkup |

These 3 specialties already visit schools for annual checkups — they just don't have digital tools.

---

# 👤 4. USER ROLES

| Role | Access | Description |
|---|---|---|
| **Doctor** | Doctor Dashboard → "My Schools" | Registers schools, conducts screenings, views student health data |
| **School Admin** | School Portal (web) | Manages student registry, invites doctors, sends outbreak alerts |
| **School Nurse / Staff** | School Portal (limited) | Enters day-to-day health data (sick leave, incidents) |
| **Class Teacher** | School Portal (read-only) | Views class health summary |
| **Parent** | Patient Dashboard (existing) | Views child's health dashboard, vaccination status, screening results |

---

# ⚙️ 5. MVP FEATURE SET (Phase 1)

## 5.1 Doctor Side (Doctor Dashboard)

### "My Schools" Section
- Register a school (name, address, board, principal contact)
- Invite school admin via phone/email
- View all students across registered schools
- Conduct health screening (select school → class → students → enter data)
- View screening history per student
- Refer students with issues to self (auto-creates patient in HealQR)

### Screening Workflow
1. Doctor selects school + class + date
2. Student list appears (pre-loaded by school admin)
3. Doctor enters screening data per student:
   - **General**: Height, Weight, BMI (auto-calculated), Blood group
   - **Dental** (if dentist): Cavities count, alignment, hygiene score (1-5), gum health
   - **Vision** (if ophthalmologist): Left eye, Right eye, Color blindness, Squint
   - **Blood** (if done): Hemoglobin, Blood group
   - **Notes**: Free text observations
4. Save → Data linked to student profile
5. Parent gets notification: "Your child's annual health screening is complete"

---

## 5.2 School Admin Side (School Portal)

### Student Registry
- Bulk upload via CSV (Name, Class, Section, Roll No, DOB, Gender, Parent Phone, Parent Email, Blood Group, Allergies)
- Manual add/edit/delete students
- Promote students annually (Class 5 → Class 6)
- Transfer student to another school (export data)

### Health Dashboard
- Class-wise health summary (% vaccinated, avg BMI, common issues)
- School-wide statistics
- Screening completion tracker (which classes done, pending)

### Vaccination Tracker
- Standard immunization schedule per age
- School-specific vaccinations (flu shots, etc.)
- Mark vaccinated/not vaccinated with date
- Overdue vaccination alerts to parents

### Health Certificate Generation
- Auto-generate per student per year
- PDF format (government-style health certificate)
- Signed by screening doctor (digital signature)

### Outbreak Alert System
- Send FCM push notification to all parents
- Template: "X cases of [dengue/flu/chickenpox] reported. Please take precautions."
- Alert history log

---

## 5.3 Parent Side (Existing Patient Dashboard)

### Child Health Card
- All screening results (year-wise)
- BMI trend chart (age 3 to current)
- Vision trend (if applicable)
- Dental history
- Vaccination status with dates
- Health certificates (downloadable PDF)

### Notifications
- Screening complete notification
- Vaccination reminder
- Outbreak alert from school
- Abnormal value alert ("Your child's BMI is below normal for their age")

---

# 🗄️ 6. DATA ARCHITECTURE (Firestore)

```
schools/{schoolId}
  ├── name, address, board, principalPhone, principalEmail
  ├── createdBy (doctorId who registered)
  ├── doctors[] (array of doctorIds with access)
  │
  ├── students/{studentId}
  │     ├── name, class, section, rollNo, dob, gender
  │     ├── parentPhone, parentEmail, parentUserId (linked HealQR patient)
  │     ├── bloodGroup, allergies[]
  │     │
  │     ├── screenings/{year}
  │     │     ├── date, doctorId, doctorName
  │     │     ├── height, weight, bmi
  │     │     ├── dental: { cavities, alignment, hygieneScore, gumHealth }
  │     │     ├── vision: { leftEye, rightEye, colorBlind, squint }
  │     │     ├── blood: { hemoglobin, bloodGroup }
  │     │     └── notes
  │     │
  │     └── vaccinations/{vaccinationId}
  │           ├── name, date, doneBy, dueDate
  │           └── status (done/pending/overdue)
  │
  └── alerts/{alertId}
        ├── type, message, sentBy, sentAt
        └── recipientCount
```

---

# 💰 7. ECONOMICS

## Cost Per Student

| Data Type | Size | Records (14 years) |
|---|---|---|
| Student profile | ~1 KB | 1 |
| Annual screening | ~2 KB | 14 = 28 KB |
| Vaccination records | ~0.5 KB each | ~15 = 7.5 KB |
| Sick leave / incidents | ~0.3 KB each | ~50 = 15 KB |
| Health certificates | ~1 KB each | 14 = 14 KB |
| **Total per student (14 years)** | | **~65 KB** |

## Infra Cost

| Scale | Students | Storage | Monthly Cost |
|---|---|---|---|
| 10 schools | 5,000 | 325 MB | ₹0 (free tier) |
| 100 schools | 50,000 | 3.25 GB | ~₹55 |
| 1,000 schools | 5,00,000 | 32.5 GB | ~₹550 |
| 10,000 schools | 50,00,000 | 325 GB | ~₹5,500 |

**Cost per student per year: ₹0.10 to ₹0.15**

## Revenue (Not from schools — from HealQR ecosystem)

| Source | How |
|---|---|
| Doctor subscriptions | Doctors pay HealQR; SchoolHealth is a feature that retains them |
| Advertiser revenue | 50,000 parents per school chain = premium ad audience (baby food, supplements, children's insurance) |
| Patient retention | Today's 5-year-old = 60+ years of doctor visits on HealQR |

---

# 🔒 8. DATA RETENTION & PRIVACY

| Period | Policy |
|---|---|
| Age 3-18 (school life) | School + Doctor have access. Parent can view. |
| Age 18 (school exit) | Data transfers to student's own HealQR account. School access ends. |
| 18+ (lifetime) | Student keeps childhood health record forever. Doctor retains access to own prescriptions. |

### DPDP Act Compliance
- Consent-based: Parent gives consent at school registration
- Right to erasure: Parent can request data deletion
- Data portability: Export student health data anytime (PDF/CSV)
- No data selling — ever

---

# 📱 9. TECH STACK (Reuse from HealQR)

| Component | Technology | Status |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite 5 + Tailwind | Existing |
| Backend | Firebase Firestore + Auth + Functions | Existing |
| Notifications | FCM push | Existing |
| PDF generation | jsPDF | Existing |
| AI (future) | Gemini 2.5 Flash (health trend analysis) | Existing |
| Translation | HealQR translation engine (multilingual parent dashboard) | Existing |
| Auth (parent) | Phone OTP via Firebase Auth | Existing |
| Auth (school admin) | Email/password via Firebase Auth | Existing |

**New to build:** School portal UI, screening workflow, student registry, vaccination tracker, health certificate template, BMI chart component

---

# 🚀 10. GO-TO-MARKET

## Phase 1: Private Schools (Immediate — April 14+)
- Doctor registers their associated private schools
- Direct doctor-school collaboration
- No government permission needed
- Target: 5-10 schools per doctor

## Phase 2: School Chains (After 50+ schools)
- Approach chains: DPS, DAV, Ryan International, Amity
- One deal = 50-200 schools
- Use Phase 1 success stories as proof

## Phase 3: Government Schools — KV, Navodaya (After credibility)
- Requires Kendriya Vidyalaya Sangathan collaboration
- 1,200+ KV schools = massive scale
- Use private school data as proof of concept
- Government tender / CSR route

---

# 📊 11. GROWTH FLYWHEEL

```
More Doctors on HealQR
        ↓
More Schools registered
        ↓
More Parents become HealQR users (FREE)
        ↓
More Advertiser revenue (parents = premium ad audience)
        ↓
More features built for doctors
        ↓
More Doctors on HealQR ← (loop)
```

---

# 🔑 12. KEY METRICS TO TRACK

| Metric | Target (6 months) |
|---|---|
| Schools registered | 100+ |
| Students digitized | 50,000+ |
| Parents activated on HealQR | 30,000+ |
| Doctors using SchoolHealth | 50+ |
| Screenings completed | 200+ sessions |

---

# ✅ 13. DEVELOPMENT PRIORITY

| Step | Feature | Effort |
|---|---|---|
| 1 | School registration + student registry (CSV upload) | 2 days |
| 2 | Screening workflow (doctor enters data) | 2 days |
| 3 | Parent notification + child health card in patient dashboard | 1 day |
| 4 | Vaccination tracker | 1 day |
| 5 | Health certificate PDF generation | 1 day |
| 6 | Outbreak alert system | 0.5 day |
| 7 | Class-wise health dashboard (school admin) | 1 day |
| 8 | BMI trend chart | 0.5 day |
| **Total MVP** | | **~9 days** |

---

# 💥 ONE-LINE VISION

**"Every school doctor's clipboard becomes a digital health record that follows the child for life."**

---

**Ready for development with VS Code AI agent — April 14, 2026.**
