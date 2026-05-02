# WhatsApp + FCM Patient Communication Plan

> Spec for the patient communication layer in HealQR.
> Final design after discussion on **May 2, 2026**.
> **Status: Planned. Build last, after current paramedical work is complete.**

---

## Goal (one paragraph)

When a doctor / clinic / lab / paramedical completes any milestone for a patient
(booking confirmed, "now seeing", RX issued, diet chart issued, consultation
completed), HealQR notifies the patient through **WhatsApp** as the primary
channel, with **FCM push notification** as a free fallback layer when the
practitioner does not want to expose any phone number. Each notification
contains a deep link into the patient's own HealQR dashboard
(`healqr.com/p/<encoded>`) where the rich content lives. **Total cost: ₹0.**

---

## 1. Why this design

| Channel | Open rate (India) | Free? | iOS reliable? | Verdict |
|---|---|---|---|---|
| WhatsApp `wa.me` link | ~90% | ✅ | ✅ | **Primary** |
| FCM push | ~40% | ✅ | ❌ flaky on iOS | **Secondary fallback** |
| SMS | ~20% | ✗ paid | ✅ | Not used |
| Email | ~5% | ✅ | ✅ | Not used |
| WhatsApp Cloud API (true automation) | ~95% | ✗ ₹0.30+/msg | ✅ | Phase 3 only |

**Decision:** WhatsApp first via free `wa.me` deep links, FCM only when
practitioner has no patient WhatsApp number on file.

---

## 2. Single-tap doctor flow (from SS1 dialog series)

```
Doctor taps "eye" icon on patient row
  │
  ├─ Cancel → nothing
  │
  ├─ "No, Just Mark Seen"
  │     → status='seen' → dispatchPatientNotification('seen')
  │
  ├─ "Yes, Create Digital RX"
  │   ├─ "No, Send RX Only"
  │   │     → RX PDF saved → dispatchPatientNotification('rx-ready')
  │   │
  │   └─ "Yes, Add AI Diet Chart"
  │         ├─ "Submit & Send via WhatsApp"
  │         │     → RX + Diet saved → dispatchPatientNotification('rx-diet-ready', { force: 'whatsapp' })
  │         │
  │         └─ "Submit & Send to App"
  │               → RX + Diet saved → dispatchPatientNotification('rx-diet-ready', { force: 'fcm' })
```

`dispatchPatientNotification(stage, opts)` is the single dispatcher.
It decides: WhatsApp link (if practitioner has `patientWhatsAppNumber`) **or**
FCM push (if patient has FCM token registered) **or** both.

---

## 3. Number-masking policy

Every practitioner profile (doctor, clinic, lab, paramedical) gets a
**new field**:

```ts
patientWhatsAppNumber?: string;   // optional, separate from personal phone
patientWhatsAppEnabled: boolean;  // toggle
```

Rules:
- If `patientWhatsAppEnabled` and `patientWhatsAppNumber` set → outbound uses this
- If toggle off → fall back to FCM only, never expose any number
- Onboarding tip shown once: *"Use a secondary SIM with WhatsApp Business — keeps your personal number private."*
- Personal phone field stays internal, never used for outbound to patients

---

## 4. Patient-side flow

1. Patient scans practitioner QR → mini website → books appointment
2. Patient confirmation page (already built) shows booking + ad slot
3. **NEW:** "Get in WhatsApp" button at bottom → opens **patient's own** WhatsApp pre-filled with booking details + dashboard deep link → patient sends to themselves (or family) → permanent record
4. Throughout consultation → practitioner taps eye → patient receives WA messages with dashboard deep links
5. After consultation → patient logs into `healqr.com/p/<encoded>`:
   - Mobile + OTP (Firebase Phone Auth, free up to 10K verifications/month)
   - Patient dashboard already exists with: Health Card, History, Live Tracker, Notifications, Find a Doctor

---

## 5. Deep-link URL scheme

```
https://healqr.com/?p=consult&d=<base64payload>
```

Payload encodes:
```json
{
  "consultationId": "abc123",
  "bookingId": "HQR-...",
  "patientPhone": "+919...",
  "doctorId": "...",
  "stage": "rx-diet-ready"
}
```

Page subscribes via `onSnapshot` to `consultations/abc123` for live status.
Patient logs in → full dashboard. Falls back to login screen if not logged in.

---

## 6. Message templates (plain text only — no rich card)

The "rich health-tip card" slot in messages is REPLACED by 3rd-party ad shown
on the patient confirmation page + dashboard, not in the WhatsApp message
itself. WhatsApp message stays simple plain text — auto-linked URL on its own
line.

### 6.1 Booking confirmed (patient sends to self)
```
✅ *Booking Confirmed* — HealQR

Dr. *<DoctorName>*
📅 *<Date>* · 🕒 *<Time>*
📍 *<Chamber>*
🎟️ Token: *<TokenNumber>*

Open your live dashboard:

https://healqr.com/?p=consult&d=<encoded>

— HealQR
```

### 6.2 Now seeing (mark as seen)
```
🔔 *Now Seeing You* — HealQR

Dr. *<DoctorName>* is now consulting you.

https://healqr.com/?p=consult&d=<encoded>

— HealQR
```

### 6.3 RX ready
```
📄 *Prescription Ready*

Hello *<PatientName>*,
Your digital prescription is ready.

Open & download:

https://healqr.com/?p=consult&d=<encoded>

— Dr. <DoctorName>, via HealQR
```

### 6.4 RX + Diet ready
```
📄 *Prescription + Diet Chart Ready*

Hello *<PatientName>*,
Your digital RX and a 7-day AI diet plan are ready.

Open both here:

https://healqr.com/?p=consult&d=<encoded>

— Dr. <DoctorName>, via HealQR
```

### 6.5 Consultation completed
```
✅ *Consultation Completed*

Hello *<PatientName>*,

Thank you for visiting *<Chamber>*. Your consultation is complete.

Open all documents in your patient portal:

https://healqr.com/?p=consult&d=<encoded>

Login with mobile + OTP.

— Dr. <DoctorName>, via HealQR
```

Rules followed (per Sahahi handoff note):
- URL on its own line, blank lines around
- No `━━━` separators
- `*bold*` emphasis NOT directly adjacent to URL
- ≤ 2000 chars per message
- Always ends with `— Dr. X, via HealQR` for trust

---

## 7. FCM fallback layer

When `patientWhatsAppEnabled === false` OR no patient WhatsApp number set:

- App sends push notification via existing FCM setup
- Notification body = same key info as WhatsApp template
- Tap → opens deep link in installed PWA / browser
- iOS limitation noted — banner on practitioner profile warns:
  *"FCM-only mode is unreliable on iOS patients. Consider enabling Patient WhatsApp."*

This means **WhatsApp is strongly preferred but never forced**.

---

## 8. Files to create

```
src/
  utils/
    whatsapp.ts                 ← sendViaWhatsApp(), buildPatientText(), template fillers
    notification-dispatcher.ts  ← dispatchPatientNotification() — central router (WA | FCM | both)
  components/
    deep-links/
      ConsultationDeepLinkPage.tsx  ← patient lands here, encoded payload + live snapshot
    patient-portal/
      PatientLoginGate.tsx          ← OTP gate before dashboard (already partially built)
      PatientDashboard.tsx          ← already built per SS5
plan/
  01-whatsapp-fcm-communication.md  ← THIS FILE
```

Existing files to modify:
- `components/DoctorDashboard.tsx` — eye-icon dialog series → call `dispatchPatientNotification`
- `components/ClinicDashboard.tsx` — same pattern for clinic-side flows
- `components/LabDashboard.tsx` — same pattern for lab report delivery
- `components/ParamedicalDashboard.tsx` — same pattern for paramedical visit completion
- All four profile pages — add `patientWhatsAppNumber` + `patientWhatsAppEnabled` fields
- `App.tsx` — add `?p=consult&d=...` query-param route handling

---

## 9. Firestore additions

### Collections
- `consultations/{id}` — already exists; add `notificationLog: [{ stage, channel, sentAt, status }]`
- `patientNotifications/{id}` — NEW; queue for FCM-only deliveries
- `doctors/{id}.patientWhatsAppNumber` — NEW field
- `doctors/{id}.patientWhatsAppEnabled` — NEW boolean (default true if number set)
- (same for clinics, labs, paramedicals)

### Rules
- Public read on consultations only via deep-link (read with knowledge of id is fine)
- Write gated by practitioner auth
- `patientNotifications` queue read by FCM Cloud Function (Phase 2 only)

---

## 10. Build phases

### Phase 0 — Plan in repo (this commit)
- Create `plan/` folder + this file
- Git tag backup `pre-whatsapp-plan-2026-05-02`

### Phase 1 — Universal helper
- `utils/whatsapp.ts` (sendViaWhatsApp, template fillers)
- `utils/notification-dispatcher.ts` (router)
- `PORTAL_URL` constant in `lib/firebase/config.ts`

### Phase 2 — Patient deep-link landing page
- `?p=consult&d=<encoded>` route in `App.tsx`
- `ConsultationDeepLinkPage.tsx`
- Live `onSnapshot` on `consultations/{id}`

### Phase 3 — Doctor dashboard wiring
- Eye-icon dialog series → calls dispatcher
- "Submit & Send via WhatsApp" button on AI Diet Chart modal → dispatcher with `force: 'whatsapp'`
- "Submit & Send to App" button → dispatcher with `force: 'fcm'`

### Phase 4 — Profile fields
- Doctor / Clinic / Lab / Paramedical profile pages → "Patient WhatsApp Number" field + toggle
- Onboarding tip banner

### Phase 5 — Patient confirmation page
- "Get in WhatsApp" button at bottom of booking confirmation (SS2 in user's plan)
- Opens patient's OWN WhatsApp pre-filled, sends to themselves

### Phase 6 — FCM fallback
- Check FCM token presence
- Send push when `patientWhatsAppEnabled === false`
- iOS warning banner on practitioner profile

### Phase 7 — Replicate to clinic / lab / paramedical
- Same flow, same dispatcher, different practitioner shape

---

## 11. Cost & scale guard-rails

| Volume | Free? | Notes |
|---|---|---|
| Any volume on `wa.me` (practitioner taps Send) | ✅ | One tap per dispatch — manageable for ≤30 patients/day per doctor |
| FCM push | ✅ | Spark plan free up to project limits |
| Firebase Phone Auth OTP | ✅ first 10K/month, then ₹0.50 each | Tier well above expected MVP load |
| **Central HealQR WhatsApp number** | ❌ paid Cloud API | **NOT in this plan.** Discussed and deferred to Phase 3 (post-revenue) |

---

## 12. Things explicitly NOT in this plan

- Central WhatsApp number for HealQR — deferred (would cost ₹4.5 Cr/month at 50 lakh msgs/day)
- IVR-style "send your code to bot" flow — deferred (needs Cloud API + worsens UX)
- Rich card / button templates — replaced by 3rd-party ad on confirmation page + rich dashboard
- Auto inbound message reading — deferred (needs Cloud API)
- WhatsApp green-tick verification — deferred (needs WABA verification)

---

## 13. Open questions to resolve before build

- [ ] Deep-link target — direct consultation page vs login-first vs hybrid (default: hybrid — public preview + login for full RX)
- [ ] Default toggle state for `patientWhatsAppEnabled` — default `true` if number is filled, `false` otherwise
- [ ] FCM fallback trigger — only when WA disabled, or always parallel?
- [ ] Patient OTP retention — how long is patient logged in (default: 30 days)
- [ ] Prescription PDF hosting — Firebase Storage signed URLs (already used for diet charts)

---

_Drafted May 2, 2026 — implements concepts from `Sahahi Pharma` handoff note,
adapted for HealQR's existing Firestore schema and dashboard architecture._
