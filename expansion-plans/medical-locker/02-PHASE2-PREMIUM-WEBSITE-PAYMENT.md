# Phase 2 — Premium Website + Payment Gateway

**Timeline:** 2-3 weeks  
**Revenue:** ₹999 one-time + ₹99/month per doctor  
**Legal Risk:** MEDIUM (requires business registration + GST — ALREADY DONE)  
**Payment Gateway:** IOB (Indian Overseas Bank) — company bank account  

---

## 1. WHAT THE DOCTOR GETS (PREMIUM UPGRADE)

Doctor upgrades from free mini website to a full professional website at the same URL:
```
healqr.com/dr/saikat-mukherjee  (same URL, premium design)
```

---

## 2. FREE vs PREMIUM COMPARISON

| Feature | Free (Phase 1) | Premium (Phase 2) |
|---|---|---|
| Profile URL (`healqr.com/dr/name`) | ✅ | ✅ |
| Name + Specialization + Photo | ✅ | ✅ |
| Clinic Address + Timings | ✅ | ✅ |
| Book Appointment Button | ✅ | ✅ |
| Bio / About Section | ✅ (basic, 500 chars) | ✅ (extended, 2000 chars) |
| "Powered by HealQR" branding | ✅ Shown (cannot remove) | ✅ **Removed** |
| **Theme Selection** | ❌ Default only | ✅ 3-5 professional themes |
| **Custom Sections: Services** | ❌ | ✅ List of services offered |
| **Custom Sections: Awards/Certifications** | ❌ | ✅ |
| **Custom Sections: Gallery** | ❌ | ✅ Clinic photos (max 10) |
| **Testimonials Section** | ❌ | ✅ Doctor adds patient testimonials |
| **Video Introduction** | ❌ | ✅ YouTube/uploaded video embed |
| **SEO Meta Tags** (custom title, description) | ❌ | ✅ Doctor sets own |
| **Profile View Counter** | ❌ | ✅ "Your profile was viewed X times" |
| **Contact Form** | ❌ | ✅ Patients can send inquiry |
| **Insurance/Panel Info** | ❌ | ✅ List accepted insurance |
| **Medical Locker FREE trial** | ❌ | ✅ **3 months free (Phase 3)** |

---

## 3. PRICING

| Item | Amount | When |
|---|---|---|
| Premium Website activation | ₹999 one-time | On upgrade |
| Monthly subscription | ₹99/month | Recurring from month 2 |
| GST (18%) | Included in price or added | Based on company's GST registration |
| IOB gateway fee | ~1.5-1.8% per transaction | Deducted from payment |

### Annual Cost to Doctor
- Year 1: ₹999 + (₹99 × 11) = **₹2,088**
- Year 2+: ₹99 × 12 = **₹1,188/year**

### HealQR Revenue Per Doctor
| Year | Revenue | Cost (Firebase) | Profit |
|---|---|---|---|
| Year 1 | ₹2,088 | ~₹60 | ₹2,028 |
| Year 2+ | ₹1,188 | ~₹60 | ₹1,128 |

---

## 4. IOB PAYMENT GATEWAY INTEGRATION

### Prerequisites (ALL COMPLETED)
| Requirement | Status |
|---|---|
| Pvt Ltd company registered | ✅ Done |
| IOB bank account | ✅ Done |
| GST registration | ✅ Done (verify) |
| PAN of company | ✅ Done |
| Business proof documents | ✅ Available |

### IOB Payment Gateway Setup
```
1. Apply at IOB branch for payment gateway
2. Submit: Company PAN, GST certificate, bank account details, 
   AOA/MOA, board resolution for gateway
3. KYC verification: 5-7 business days
4. Integration kit received (API credentials)
5. Test mode → Live mode activation
```

### Payment Flow
```
Doctor clicks "Upgrade to Premium"
  → Price shown: ₹999 (one-time)
  → IOB payment gateway opens
  → Doctor pays via UPI / Card / Net Banking
  → Payment success webhook received
  → doctor.premiumWebsite.active = true
  → ₹99/month recurring set up (IOB recurring mandate or monthly reminder)
  → 3-month Medical Locker trial activated automatically
```

### Recurring Payment Handling
| Method | How |
|---|---|
| **Option A: IOB e-mandate** | Auto-debit ₹99/month from doctor's account (UPI mandate or NACH) |
| **Option B: Monthly reminder** | Push notification + email: "₹99 due. Pay now." with payment link |
| **Recommended** | **Start with Option B** (simpler). Add e-mandate later. |

### Payment Failure Handling
| Event | Action |
|---|---|
| Payment fails (gateway error) | Retry page shown. No data change. |
| Recurring payment missed (1-30 days) | Reminder notifications. Full access continues. |
| Missed 31-60 days | Premium features disabled. Reverts to free mini website. |
| Missed 61-90 days | "Pay ₹99 to restore premium" banner on dashboard. |
| Missed 90+ days | Premium cancelled. Must pay ₹999 again to re-activate. |

---

## 5. PREMIUM WEBSITE BUILDER

### NOT a Custom Builder (Phase 2 MVP)
Do **NOT** build a drag-and-drop website builder. Too complex for MVP. Instead:

### Template-Based System
```
Doctor Dashboard → "My Website" section
  → Select Theme (3-5 pre-built templates)
  → Fill sections:
     - About / Bio (text input, max 2000 chars)
     - Services (add/remove service names)
     - Awards (add/remove with year)
     - Gallery (upload up to 10 photos)
     - Testimonials (add patient name + quote)
     - Video (YouTube URL or upload)
     - Insurance/Panels (checkboxes/text)
     - SEO (custom title, description)
  → Preview
  → Publish
```

### Themes (MVP — 3 themes)
| Theme | Style | Color |
|---|---|---|
| **Classic** | Clean, professional, white background | Blue accents |
| **Modern** | Card-based, dark header, gradient | Purple/violet |
| **Minimal** | Single-page, typography-focused | Black/white |

Doctor can switch themes anytime. Content stays same.

---

## 6. DOCTOR-BUILT EXTERNAL WEBSITE

### Decision: NOT SUPPORTED in Phase 2

| Option | Risk | Decision |
|---|---|---|
| Doctor uploads custom HTML | XSS, malware injection, security nightmare | ❌ Rejected |
| Doctor links external domain | Breaks HealQR ecosystem, loses booking flow | ❌ Rejected |
| Doctor uses HealQR templates only | Safe, controlled, consistent | ✅ Approved |

If doctor wants a fully custom website, they can build it independently and link to `healqr.com/dr/name` for booking. HealQR does not host arbitrary external code.

---

## 7. QR CODE → PREMIUM WEBSITE → BOOKING FLOW

```
Patient scans QR code (on visiting card / clinic wall / prescription)
  → Opens: healqr.com/dr/saikat-mukherjee
  → Sees premium website (theme-styled)
  → Clicks "Book Appointment"
  → Selects language (existing HealQR feature)
  → Selects chamber → date → fills form → OTP → confirmed
  → Patient data saved in Firestore
  → Doctor sees booking in dashboard
```

### Data Extraction from Own Site
```
Doctor visits healqr.com/dr/saikat-mukherjee
  → System detects: logged-in user IS the profile owner
  → Shows "Dashboard" button (top-right)
  → Doctor can view bookings, patient list, analytics directly
  → No need to go to healqr.com separately
```

---

## 8. TECHNICAL IMPLEMENTATION

### Firestore Schema Addition
```
doctors/{doctorId}
  ├── premiumWebsite: {
  │     active: true/false,
  │     activatedAt: timestamp,
  │     theme: "classic" | "modern" | "minimal",
  │     showBranding: false,              // false for premium
  │     sections: {
  │       bio: "10 years of experience...",
  │       services: ["Root Canal", "Braces", "Cleaning"],
  │       awards: [{ title: "Best Dentist", year: 2024 }],
  │       gallery: ["storage-url-1", "storage-url-2"],
  │       testimonials: [{ name: "Rahul", quote: "Great doctor" }],
  │       videoUrl: "https://youtube.com/...",
  │       insurance: ["Star Health", "ICICI Lombard"],
  │       seoTitle: "Dr. Saikat - Best Dentist in Kolkata",
  │       seoDescription: "Book appointment with Dr. Saikat..."
  │     },
  │     viewCount: 1247,
  │     lastPublished: timestamp
  │   }
  ├── subscription: {
  │     plan: "premium",
  │     startDate: timestamp,
  │     lastPaymentDate: timestamp,
  │     lastPaymentAmount: 99,
  │     paymentStatus: "active" | "overdue" | "cancelled",
  │     gatewayTransactionIds: ["txn_123", "txn_456"],
  │     freeLockerTrialEndsAt: timestamp     // 3 months from activation
  │   }
  └── ...existing fields
```

### Firebase Storage for Gallery
```
premium-websites/{doctorId}/gallery/
  ├── img_1.jpg  (max 2MB per image)
  ├── img_2.jpg
  └── ...up to img_10.jpg

premium-websites/{doctorId}/video/
  └── intro.mp4   (max 50MB, or YouTube URL)
```

### Payment Records (Firestore)
```
payments/{paymentId}
  ├── userId: "doctorId"
  ├── type: "premium-website-activation" | "premium-monthly" | "locker-patient" | "locker-doctor"
  ├── amount: 999
  ├── gatewayProvider: "IOB"
  ├── gatewayTransactionId: "txn_xxx"
  ├── status: "success" | "failed" | "pending" | "refunded"
  ├── createdAt: timestamp
  ├── gstAmount: 152.71  (18% of base)
  ├── invoiceNumber: "HQ-2026-0001"
  └── metadata: { plan: "premium", period: "one-time" }
```

---

## 9. INVOICE & GST

| Item | Detail |
|---|---|
| Invoice generated | On every successful payment |
| Format | PDF (auto-generated via jsPDF — already in stack) |
| Contains | Company name, GST number, doctor details, amount, GST breakup, invoice number |
| Downloadable | Yes, from Doctor Dashboard → "My Payments" section |
| **GST rate** | **18% (SAC code: 998314 — IT services)** |
| **GST on ₹999** | ₹152.54 (base ₹846.46 + GST ₹152.54) |
| **GST on ₹99/month** | ₹15.10 (base ₹83.90 + GST ₹15.10) |

---

## 10. LEGAL REQUIREMENTS

| Requirement | Status | Action Needed |
|---|---|---|
| Terms of Service for Premium | Not drafted | Must draft before launch |
| Refund Policy | Not drafted | Must draft (7-day refund for activation, no refund for monthly) |
| Privacy Policy update | Existing | Update to cover premium website data |
| GST registration | ✅ Done | Verify SAC code for IT services |
| IOB gateway agreement | Pending | Apply at bank branch |
| Payment data security (PCI-DSS) | Handled by IOB | Gateway provider handles card data |

---

## 11. DEVELOPMENT CHECKLIST

| # | Task | Effort |
|---|---|---|
| 1 | IOB gateway integration (payment page, webhook handler) | 3-4 days |
| 2 | Payment records Firestore + "My Payments" dashboard section | 1 day |
| 3 | Invoice PDF generation (jsPDF) | 1 day |
| 4 | Premium upgrade flow (button → payment → activation) | 1 day |
| 5 | "My Website" editor in Doctor Dashboard (sections form) | 2-3 days |
| 6 | 3 premium themes (Classic, Modern, Minimal) | 2-3 days |
| 7 | Gallery upload (Firebase Storage + image optimization) | 1 day |
| 8 | Profile view counter | 0.5 day |
| 9 | Monthly payment reminder system (Cloud Function) | 1 day |
| 10 | Premium → Free downgrade on non-payment (Cloud Function) | 0.5 day |
| **Total** | | **2-3 weeks** |

---

## 12. EXIT TO PHASE 3

Premium doctors automatically get 3-month Medical Locker trial:

```
Doctor activates premium website
  → doctor.subscription.freeLockerTrialEndsAt = now + 3 months
  → "Medical Locker" section appears in Doctor Dashboard
  → Doctor can start uploading patient records
  → After 3 months: "Upgrade to Medical Locker for ₹99/month"
  → Natural conversion to Phase 3
```
