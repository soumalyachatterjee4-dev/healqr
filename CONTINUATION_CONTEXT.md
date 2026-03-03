# HealQR — Development Continuation Context
## Last Updated: March 3, 2026

---

## PROJECT OVERVIEW
- **App**: HealQR — Healthcare PWA (Progressive Web App)
- **Live URL**: https://teamhealqr.web.app
- **Repo**: https://github.com/soumalyachatterjee4-dev/healqr.git
- **Branch**: `main`
- **Latest Commit**: `27a0c68` — "fix: Firestore rules for tempDoctorAccess subcollection + optimize token lookup"
- **Workspace**: `c:\Projects\healqr 3`

---

## TECH STACK
- React 18.2 + TypeScript 5.3 + Vite 5 + Tailwind CSS 4 + shadcn/ui
- Firebase: Firestore, Auth (email link), Storage, FCM (push notifications), Hosting
- Key libraries: jsPDF, html2canvas, lucide-react, sonner (toasts), recharts
- Dev server: `npm run dev` → localhost:5173

---

## KEY ARCHITECTURE PATTERNS

### 1. resolvedClinicId Pattern
Used in ClinicDashboard for assistant support:
```ts
const resolvedClinicId = isAssistant ? localStorage.getItem('healqr_assistant_doctor_id') : auth?.currentUser?.uid;
```

### 2. Assistant Auth (localStorage keys)
```
healqr_is_assistant = 'true'
healqr_assistant_pages = JSON.stringify(['dashboard', 'schedule', ...])
healqr_assistant_doctor_id = '<clinicOwnerUid>'
healqr_is_clinic = 'true'  // if clinic assistant
healqr_authenticated = 'true'
healqr_user_email, healqr_user_name, healqr_qr_code = 'assistant'
```

### 3. Temp Doctor Auth (localStorage keys)
```
healqr_is_temp_doctor = 'true'
healqr_temp_doctor_clinic_id = '<clinicId>'
healqr_temp_doctor_id = '<doctorId>'
healqr_temp_doctor_name, healqr_temp_doctor_clinic_name
healqr_temp_doctor_chambers = JSON.stringify([...])
healqr_temp_doctor_token, healqr_temp_doctor_expiry
```

### 4. ClinicSidebar Props
```ts
<ClinicSidebar isAssistant={isAssistant} assistantAllowedPages={assistantAllowedPages} />
```
Lock icons on restricted pages for assistants.

### 5. Firestore Collections
- `clinics/{uid}` — clinic profile, `linkedDoctorsDetails[]` array
- `clinics/{uid}/tempDoctorAccess/{id}` — temp doctor tokens (NEW)
- `doctors/{uid}` — doctor profile, `linkedClinics[]`, `chambers[]`
- `assistants/{id}` — assistant tokens with `accessToken`, `accessPin`, `allowedPages`
- `bookings/{id}` — all bookings (QR, walk-in, advance)
- `qrPool/{id}` — QR code pool

### 6. Encryption
Patient data encrypted in Firestore: `patientName_encrypted`, `whatsappNumber_encrypted`, `age_encrypted`, `gender_encrypted`, `purposeOfVisit_encrypted`
Decrypt via: `import { decrypt } from '../utils/encryptionService'`

---

## RECENT COMMITS (last session)

| Commit | Description |
|--------|-------------|
| `27a0c68` | Fix Firestore rules for tempDoctorAccess + optimize token lookup |
| `7fbfeee` | Temporary Doctor Dashboard — device access for non-linked doctors |
| `c266c35` | Wire ALL clinic dashboard features, fix assistant routing, Video Consultation rebuild, mobile responsive |
| `794471b` | Rebuild AI RX Upload Modal — Gemini 2.5 Flash |
| `e183431` | Share PDF via WhatsApp (Web Share API on mobile) |

---

## COMPLETED FEATURES (this session)

### Clinic Dashboard — ALL Sidebar Items Wired
Every sidebar menu in ClinicDashboard is FULLY IMPLEMENTED:
- Dashboard, Profile, QR Manager, Schedule, Today's Schedule
- Manage Doctors, Advance Booking, Assistant Access
- Analytics, Reports, Monthly Planner, Preview Center
- Lab Referral, Personalized Templates, Emergency Button
- AI Diet Chart, AI RX Reader, Video Consultation, Video Library
- Social Media Kit, BrainDeck

### Assistant Access Fixes
- Routing to clinic dashboard with page restrictions (Lock icons)
- Data loading via `resolvedClinicId` pattern
- Link & PIN shown in assistant cards with copy buttons

### Video Consultation Page Rebuild
- `ClinicVideoConsultationManager.tsx` — rebuilt to match DR dashboard design
- Red camera icon header, emerald green filter buttons, consultation records

### Navbar Video Cam → Video Library
- Clinic dashboard navbar cam icon routes to `video-library` (not video-consult)
- VideoLibrary component with `onBack` and `source` props

### Mobile Responsive Fixes
- AI Diet Chart patient assessment form text overflow fixed
- Responsive classes: `text-xs sm:text-sm`, `flex-wrap`, `min-w-0`

### Temporary Doctor Dashboard (NEW FEATURE)
**Purpose**: Non-linked doctors at a clinic need temporary device access to view patients and write Digital RX.

**Components**:
- `TempDoctorLogin.tsx` — Login at `/temp-doctor-login?token=xxx&clinic=yyy`, 6-digit PIN auth
- `TempDoctorDashboard.tsx` — Minimal dashboard: Today's Schedule → Patient Details → Digital RX
- `ManageDoctors.tsx` — "Generate Temp Access for Today" button on every doctor card

**Flow**:
1. Clinic → Manage Doctors → "Generate Temp Access for Today" on any doctor card
2. Link + 6-digit PIN generated, stored in `clinics/{id}/tempDoctorAccess` subcollection
3. Copy link/PIN individually or combined for WhatsApp/SMS
4. Doctor opens link → enters PIN → sees Today's Schedule → Patient Details
5. Time-locked: chamber hours ± 30 min buffer, auto-expires outside window

**Firestore Rules**: `tempDoctorAccess` subcollection — read=public, write=clinic owner only

---

## KEY FILES REFERENCE

### Main Routing
- **App.tsx** (~3230 lines) — All page routing, lazy imports, URL param handling, auth state
  - Page type union at line ~126
  - URL detection at line ~1031 (pathname checks)
  - Auth guard skip at line ~1090
  - Page param routing at line ~631

### Dashboards
- **ClinicDashboard.tsx** (~1062 lines) — Main clinic dashboard, all menu routing via `activeMenu` state
  - `implementedMenus` array contains ALL sidebar IDs
  - VideoLibrary renders with `source="dashboard"`
- **DoctorDashboard.tsx** — Doctor's main dashboard
- **PatientDashboardNew.tsx** — Patient portal

### Key Components
- **ManageDoctors.tsx** (~2280 lines) — Linked/non-linked doctors, chambers, temp access generation
  - `LinkedDoctor` interface with `chambers`, `status`, `restrictPatientDataAccess`
  - `Chamber` interface with `startTime`, `endTime`, `days`, `clinicId`
- **ClinicTodaysSchedule.tsx** (~1282 lines) — Today's patient list per chamber
  - `ChamberPatientDetailsLoader` inner component loads bookings
  - QR bookings + walk-in bookings merged
- **PatientDetails.tsx** — Patient details with Digital RX, diet chart, video call
- **ClinicAssistantAccessManager.tsx** (~621 lines) — Token + PIN generation for assistants
- **AssistantLogin.tsx** (~246 lines) — Token/PIN validation for assistants

### Sidebar
- **ClinicSidebar.tsx** — Clinic sidebar with `isAssistant` + `assistantAllowedPages` props

### Firebase Config
- **lib/firebase/config.ts** — Firebase init (exports `db`, `auth`, `storage`)
  - `db` typed as `Firestore | null` (causes 1100+ TS warnings but Vite builds fine)
- **lib/firebase/db.service.ts** — `DatabaseService` utility class
- **firestore.rules** — Security rules (deployed)
- **storage.rules** — Storage security rules

---

## KNOWN ISSUES / TECH DEBT
1. `db` is `Firestore | null` causing 1100+ TS errors — Vite build ignores these
2. ManageDoctors has pre-existing unused imports (`sendSignInLinkToEmail`, `renderDoctorSearch`, etc.)
3. Large chunk warning for `index-*.js` (1051 KB) — needs manual chunking config
4. Several `_BROKEN`, `_OLD`, `_backup` files in components/ can be cleaned up

---

## DEPLOYMENT
```powershell
# Build
npx vite build

# Deploy hosting only
npx firebase deploy --only hosting

# Deploy Firestore rules only
npx firebase deploy --only firestore:rules

# Deploy everything
npx firebase deploy
```

**Firebase Project**: `teamhealqr`
**Hosting URL**: https://teamhealqr.web.app

---

## USER PREFERENCES / RULES
- User explicitly said **"DONOT DEPLOY IN FIREBASE RIGHT NOW"** in earlier sessions — but later approved deployment in this session
- Dark theme UI (bg-[#0a0f1a], gray-800/50, etc.)
- Blue accent for doctor/clinic features, emerald for active states, red for destructive actions
- Mobile-first responsive design
- Copy-to-clipboard with toast feedback on all shareable content
- User prefers Hindi-speaking context (Indian healthcare app)

---

## WHAT TO TEST (User mentioned testing when back)
The user said they want to test all features when they return. No specific bugs reported yet after the deployment. The Temp Doctor Dashboard was confirmed working visually (screenshot showed the login page rendering correctly with time-lock message).
