# HealQR — 45-Day Launch Plan

**Owner:** Kaushik Mitra (Product) + Cascade AI (Engineering)
**Budget:** ₹15,000 (Play Store + Apple Developer + cloud build services only)
**Team:** AI-only. No external developers or engineers.
**Status:** Web product is launch-ready. Starting hardening + native app.

---

## Goal

Ship a polished, tested, native-ready HealQR within 45 days, then wrap with Capacitor for Android + iOS distribution.

---

## Deliverables (8 tracks)

1. Remaining paramedical (healthcare professional) pages — parity with doctor side.
2. WhatsApp integration for Doctor ↔ Patient communication.
3. Page-wise first-time wizard / guided tour.
4. Inline instruction videos — tap any button → short mobile-screen guide plays.
5. New Appointment Scheduler module (for the one stakeholder type not yet covered).
6. Security testing pass.
7. End-to-end feature testing across all roles.
8. Codebase cleanup + bundle optimization.

**Post-45-days:** Capacitor wrapper (Option A) for Play Store + App Store distribution.

---

## Week 1 (Days 1–7) — Paramedical Polish + WhatsApp

### Day 1–2 — Paramedical parity
- Identify remaining paramedical pages needing parity with doctor side.
- Mirror: Reports, Analytics, Revenue Dashboard, Billing & Receipts, Inventory (as applicable).
- Verify: Today's Schedule, Advance Bookings, History, Patient Retention, Mini-Website, Booking Flow already at parity.

### Day 3–5 — WhatsApp Doctor ↔ Patient
- Phase A: `wa.me/` deep links with pre-filled messages (₹0, instant).
  - Patient card → "WhatsApp" button → opens chat with patient.
  - Booking confirmation → "Send via WhatsApp" for patient.
  - Reminders, follow-ups, prescription links — all via `wa.me/`.
- Phase B (optional, later): WhatsApp Business Cloud API for templated broadcasts (1,000 free conversations/month from Meta).

### Day 6–7 — Buffer + QA

---

## Week 2 (Days 8–14) — Wizard + Instruction Videos

### Day 8–10 — Page-wise Wizard
- Library: `react-joyride` (MIT, free).
- First-login auto-tour per page, skippable.
- Persistent "Take Tour" button on every major page.
- Tour state persisted per user in Firestore (`users/{uid}/tours_completed`).

### Day 11–14 — Instruction Videos
- `<HelpButton>` component — small ❓ icon next to any button.
- Tap → modal plays 15–30 sec vertical screen recording.
- Hosted on Firebase Storage (existing infra).
- Mapping in `public/help/video-map.json` — editable without code changes.
- Kaushik records videos on phone. Cascade integrates them into buttons.

---

## Week 3–4 (Days 15–28) — Appointment Scheduler Module

- **Scope:** TBD with Kaushik (Day 15 kickoff).
  - (a) Personal calendar for doctors/paras to block non-patient time, OR
  - (b) Multi-provider scheduling tool for clinic admins, OR
  - (c) Different interpretation.
- CRUD appointments, notifications, calendar view, conflict detection.
- Reuse existing chamber/slot logic where possible.
- Firestore collection: `appointments/` (separate from `bookings/`).

---

## Week 5 (Days 29–35) — Security Testing

### Firebase Security Rules audit
- Per-collection read/write rules by role (doctor, paramedical, MR, lab, clinic, patient, assistant, advertiser, referrer, admin).
- Verify no cross-role data leaks.
- Rate limits on sensitive writes (bookings, payments).

### Client-side
- No API keys / secrets in bundle.
- Encryption-at-rest for PII (names, phones) — already implemented, verify coverage.
- CSP, CORS, HTTPS headers.

### Auth flows
- Session hijack resistance.
- Role escalation prevention (doctor ↔ para ↔ MR ↔ lab ↔ assistant).
- OTP abuse / brute force throttling.
- Verify-login, verify-email, master-access edge cases.

---

## Week 6 (Days 36–42) — Feature Testing + Cleanup

### Day 36–39 — Feature regression (all roles)
Checklist by role:
- Doctor (Dashboard, Schedule, Today's Schedule, Advance Bookings, Reports, Analytics, Revenue, Billing, Inventory, Broadcast, Retention, Referral Network, Patient Chat, Paramedical Manager, MR Management, Lab Referral, Profile, QR, BrainDeck, Preview Center, Social Media Kit, Chronic Care, AI Diet, Digital RX, Video Consultation).
- Paramedical (all equivalent pages).
- MR (Dashboard, Visits, Management).
- Lab (Dashboard, Bookings).
- Clinic (Dashboard, Master Access, Queue Display).
- Patient (Dashboard, Booking Flow, Mini-Website, Chat, Retention).
- Assistant (Read-only views, access manager).
- Advertiser, Referrer (if in scope for launch).

### Day 40–42 — Code cleanup
- Remove dead code (`PhlebotomistDashboard` alias, unused components).
- Consolidate duplicated booking flow logic.
- Fix pre-existing TypeScript errors:
  - `decrypt` missing in `TodaysSchedule.tsx:708,711`.
  - `language` field on `PatientFormData` type mismatch.
  - `chamber_rescheduled` notification type union.
  - `location` property on `PatientFormData`.
- Code-split `index-*.js` (currently 1.2 MB) — lazy-load heavy charts/PDF libs.
- Remove unused exports / orphan files.
- Update README + developer docs.

---

## Week 7 (Days 43–45) — Final Polish

- Last-pass UI consistency.
- Performance profiling on slow 3G.
- Error boundaries + better loading/error states.
- Privacy policy, terms of service — final review.
- Go/no-go launch checklist signed off.

---

## Phase 2 — Capacitor Native App (Day 46 onwards)

**Expected duration:** ~4 days of engineering.

### Day 46 — Capacitor setup
- `npm i @capacitor/core @capacitor/cli` + init.
- Android + iOS projects generated.
- App ID: `com.healqr.app`.
- App icons + splash screens.

### Day 47 — Native features
- Push notifications (FCM — already wired for web).
- Camera access (QR scan).
- Share sheet.
- Deep links: `/para/:id`, `/verify-visit/:id`, `/r/:bookingId`, etc.
- Status bar, keyboard, safe-area handling.

### Day 48 — Android build
- Android Studio build → signed `.aab` + `.apk`.
- APK hosted on `healqr.com/download` (immediate, ₹0).
- Play Store submission: ₹2,100 one-time.

### Day 49 — iOS build
- Codemagic/EAS free-tier cloud Mac build.
- Apple Developer enrollment: ₹8,300/year.
- TestFlight → App Store submission.

### Day 50+ — Store review iterations
- Android Play review: 1–3 days typical.
- iOS App Store review: 1–7 days typical, healthcare apps often get follow-up questions.
- Buffer: 1 week for review cycles.

---

## Budget Allocation (₹15,000)

| Item | Cost (₹) | Status |
|---|---|---|
| Google Play Developer | 2,100 | One-time |
| Apple Developer | 8,300 | Annual |
| Buffer (cloud builds, renewals) | 4,600 | As needed |
| **Total** | **15,000** | |

**Zero spending on:** developers, engineers, designers, QA testers. All engineering by Cascade AI.

---

## Principles

- **No external humans.** This product is built 100% with AI. Code ownership stays with the AI+Kaushik team.
- **Realistic over optimistic.** 30→45 day buffer is the plan. Slippage accepted, scope pruned if needed.
- **Ship, then iterate.** Phase 2 (Capacitor) starts even if Phase 1 has minor polish items open.

---

## Progress Tracking

Cascade will maintain a lightweight `progress.txt` updated at end of each working session with:
- Tasks completed today.
- Blockers.
- Next session's focus.

---

**Last updated:** 2026-05-03
**Next session focus:** Day 1 — list remaining paramedical pages, begin parity work.
