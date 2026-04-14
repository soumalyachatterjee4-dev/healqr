# Phase 1 — Doctor Mini Website (FREE)

**Timeline:** 3-4 days  
**Revenue:** ₹0 (Free — adoption driver)  
**Legal Risk:** LOW

---

## 1. WHAT THE DOCTOR GETS

Every doctor who signs up on HealQR gets a **free, instant, public profile page** at:

```
healqr.com/dr/saikat-mukherjee
```

This page is:
- Publicly accessible (no login needed to view)
- Instantly live on signup
- Shareable via link, QR code, WhatsApp, visiting card
- Bookable (patient can book appointment directly from this page)

---

## 2. URL FORMAT & RULES

### Format
```
healqr.com/dr/{slug}
```

### Slug Generation Rules
| Rule | Example |
|---|---|
| Lowercase only | `Dr. Saikat Mukherjee` → `saikat-mukherjee` |
| Spaces → hyphens | `saikat mukherjee` → `saikat-mukherjee` |
| Special chars removed | `Dr. S.K. Roy` → `sk-roy` |
| Must be unique | Enforced at signup |
| Minimum 3 characters | `sk` → rejected |
| Maximum 40 characters | Truncated if longer |
| No profanity/reserved words | `admin`, `api`, `support` blocked |

### If Name Already Taken
System auto-suggests alternatives:
```
"saikat-mukherjee" is taken. Try:
  → saikat-mukherjee-kolkata
  → saikat-mukherjee-dentist
  → dr-saikat-m
  → saikat-mukherjee-2
```

Doctor can also type custom slug (like Gmail username selection).

---

## 3. WHY PATH-BASED, NOT SUBDOMAIN

| Approach | Technical Feasibility | Cost |
|---|---|---|
| `drsaikat.healqr.com` (subdomain) | ❌ Firebase Hosting does NOT support wildcard subdomains. Would need Cloudflare Workers or Vercel migration. | ₹0-1,600/month |
| `healqr.com/dr/saikat` (path-based) | ✅ Works on Firebase immediately. Single React app, no DNS changes. | ₹0 |

**Decision: Path-based.** Zero additional infrastructure. Works today. Can migrate to subdomain later (Phase 5+) if needed via Cloudflare proxy.

---

## 4. MINI WEBSITE CONTENT

### What's Displayed (Auto-pulled from doctor's existing HealQR profile)

| Section | Source | Editable |
|---|---|---|
| Doctor name + photo | Firestore `doctors/{id}` | Yes (from Doctor Dashboard) |
| Specialization | Existing field | Yes |
| Qualifications / Degrees | Existing field | Yes |
| Clinic name + address | Existing chambers data | Yes |
| Consultation timings | Existing chamber schedule | Yes |
| Consultation fee | Existing field | Yes |
| Phone number (optional) | Doctor chooses to show/hide | Yes |
| "Book Appointment" button | Routes to HealQR booking flow | Automatic |
| Languages spoken | Existing field | Yes |
| About / Bio (short text) | New field (optional) | Yes |

### What's NOT on the free version
- No custom sections
- No testimonials
- No gallery/photos
- No video introduction
- "Powered by HealQR" branding shown
- No SEO meta tags customization
- No analytics (profile view count)

---

## 5. BOOKING FLOW FROM MINI WEBSITE

```
Patient visits healqr.com/dr/saikat-mukherjee
  → Sees doctor profile
  → Clicks "Book Appointment"
  → Selects chamber (if multiple)
  → Selects date
  → Fills booking form (name, phone, purpose)
  → OTP verification
  → Booking confirmed
  → Patient data saved in Firestore (standard booking flow)
```

This is the **existing HealQR booking flow** — no new development needed for booking. Only the entry point (mini website) is new.

---

## 6. TECHNICAL IMPLEMENTATION

### React Routing
```typescript
// App.tsx — detect /dr/ path
const path = window.location.pathname;
if (path.startsWith('/dr/')) {
  const slug = path.split('/dr/')[1]?.replace(/\/$/, '');
  // Render DoctorPublicProfile component with slug
}
```

### Firestore Query
```typescript
// Fetch doctor by slug
const q = query(
  collection(db, 'doctors'),
  where('profileSlug', '==', slug),
  limit(1)
);
const snap = await getDocs(q);
if (snap.empty) → show 404 page
else → render profile
```

### Firestore Schema Addition
```
doctors/{doctorId}
  ├── profileSlug: "saikat-mukherjee"    // unique, indexed
  ├── profileSlugCreatedAt: timestamp
  ├── showPhoneOnProfile: true/false
  ├── profileBio: "10 years experience..."  // optional, max 500 chars
  └── ...existing fields
```

### Firestore Index
```
Collection: doctors
Field: profileSlug (ASC) — unique
```

### Slug Uniqueness Enforcement
```typescript
// On signup or slug change
const existing = await getDocs(
  query(collection(db, 'doctors'), where('profileSlug', '==', newSlug))
);
if (!existing.empty) → suggest alternatives
else → save slug
```

---

## 7. SEO CONSIDERATIONS (FREE TIER)

| Aspect | Status |
|---|---|
| Page is indexable by Google | Yes (public, no auth required) |
| Custom meta title/description | No (free tier — uses default template) |
| Default meta | `"Dr. {Name} - {Specialization} | Book on HealQR"` |
| Open Graph tags | Basic (name + specialization) |
| Google indexing speed | Slow (weeks/months — no sitemap submission on free tier) |

---

## 8. LEGAL RISK ASSESSMENT

| Concern | Risk Level | Notes |
|---|---|---|
| Public doctor profile | LOW | Same as Practo/JustDial — business listing |
| Patient data exposure | NONE | No patient data on public page |
| Doctor impersonation | LOW | Doctor creates own profile, verified by phone OTP |
| Fake doctor listing | LOW | Existing HealQR signup verification applies |
| DPDP compliance | NONE | No personal data collected on public page |

---

## 9. DEVELOPMENT CHECKLIST

| # | Task | Effort |
|---|---|---|
| 1 | Add `profileSlug` field to doctor signup flow | 0.5 day |
| 2 | Build slug validation + uniqueness check + alternatives | 0.5 day |
| 3 | Build `DoctorPublicProfile.tsx` component | 1 day |
| 4 | Add `/dr/` routing in App.tsx | 0.5 day |
| 5 | Build "Edit My Profile" section in Doctor Dashboard | 0.5 day |
| 6 | QR code generation for profile URL | 0.5 day |
| 7 | Mobile responsive testing | 0.5 day |
| **Total** | | **3-4 days** |

---

## 10. SUCCESS METRICS

| Metric | Target (3 months) |
|---|---|
| Doctors with active profile page | 100+ |
| Profile page views | 1,000+/month |
| Bookings from profile page | 50+/month |
| Conversion to Phase 2 (premium) | 5-10% |

---

## 11. EXIT TO PHASE 2

After a doctor has a free mini website and sees patients booking from it, the upsell to Phase 2 (Premium Website) is natural:

```
"Your profile was viewed 47 times this month.
 Upgrade to Premium for ₹999 + ₹99/month:
 ✓ Professional themes
 ✓ Custom sections (services, awards, gallery)
 ✓ Remove HealQR branding
 ✓ SEO optimization
 ✓ 3 months FREE Medical Locker (Phase 3)"
```
