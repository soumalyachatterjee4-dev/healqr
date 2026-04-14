# HealQR Medical Locker — Master Overview

**Prepared for:** Sumanta Chatterjee  
**Date:** April 13, 2026  
**Status:** APPROVED FOR DEVELOPMENT  
**Company:** [Pvt Ltd entity name] | Bank: IOB  

---

## WHAT IS MEDICAL LOCKER?

A **paid digital health record storage system** distributed through doctors. Patients pay HealQR directly for secure cloud storage of their medical records (Rx, lab reports, documents). Doctors earn commission for referring patients.

**It is NOT:**
- A free service (free = valueless, paid = valued)
- A middleman model (HealQR collects directly from patients)
- A standalone product (integrated into HealQR doctor + patient dashboards)
- A government health record (private SaaS, not ABDM alternative)

---

## CORE PRINCIPLE

> **"Like a bank locker — you rent space, you store valuables, you stop paying, you get notice, you don't respond, locker is emptied."**

---

## THREE PHASES

| Phase | What | Dev Time | Revenue |
|---|---|---|---|
| **Phase 1** | Doctor Mini Website at `healqr.com/dr/name` | 3-4 days | ₹0 (free — adoption driver) |
| **Phase 2** | Premium Website + IOB Payment Gateway + ₹999 + ₹99/month | 2-3 weeks | Doctor subscription revenue |
| **Phase 3** | Medical Locker (500MB @ ₹49/month per patient) | 2-3 weeks | Patient storage revenue + doctor commission |
| **Total** | | **~6-8 weeks dev** | |

---

## MONEY FLOW (FINAL MODEL)

```
Patient ──₹49/month──→ HealQR (IOB Gateway)
                          │
                          ├── ₹29 → Doctor (referral commission)
                          └── ₹20 → HealQR (platform fee — ALWAYS PROTECTED)

Doctor ──₹99/month──→ HealQR (IOB Gateway)
                          │
                          └── Dashboard + upload + view access
```

**Two independent contracts. No middleman. No joint liability.**

---

## KEY DESIGN DECISIONS (ALL DOCUMENTED)

| Decision | Rationale | Document |
|---|---|---|
| Patient pays HealQR directly, NOT through doctor | Eliminates joint liability if doctor defaults | `06-LEGAL-COMPLIANCE.md` |
| ₹20 HealQR share is ALWAYS protected (coupons funded by doctor) | HealQR margin cannot be reduced by discounts | `04-REVENUE-MODEL.md` |
| 12-month grace ladder before data deletion | Bank locker model — legally defensible | `05-PAYMENT-LIFECYCLE.md` |
| Reactivation requires ALL dues + ₹9/month fine | Prevents gaming (pay 1 month, skip 8, come back) | `05-PAYMENT-LIFECYCLE.md` |
| Doctor cannot download/print own Rx without patient consent | Rx is patient's property after consultation | `07-ACCESS-PERMISSIONS.md` |
| Doctor cannot delete any data without patient permission | Patient paid for space — it's their property | `07-ACCESS-PERMISSIONS.md` |
| Path-based URLs (`healqr.com/dr/name`) not subdomains | Firebase doesn't support wildcard subdomains | `09-TECHNICAL-ARCHITECTURE.md` |
| Doctor earns ₹29/patient/month commission | Incentivizes promotion without middleman risk | `04-REVENUE-MODEL.md` |
| TDS deduction on commission > ₹15,000/year | IT Act Section 194H compliance | `06-LEGAL-COMPLIANCE.md` |
| Annual cost for 500MB storage = ₹12.84 (Firebase) | Even 1 month of ₹20 covers full year — CANNOT lose money | `08-COST-ECONOMICS.md` |

---

## DOCUMENTS IN THIS FOLDER

| File | Contents |
|---|---|
| `00-OVERVIEW.md` | This file — master overview |
| `01-PHASE1-DOCTOR-MINI-WEBSITE.md` | Free doctor profile page, URL routing, unique name system |
| `02-PHASE2-PREMIUM-WEBSITE-PAYMENT.md` | Premium templates, IOB payment gateway, ₹999 + ₹99/month |
| `03-PHASE3-MEDICAL-LOCKER-SYSTEM.md` | Core locker, 500MB storage, upload/view/share, upgrade plans |
| `04-REVENUE-MODEL.md` | Payment flow, commission split, coupons, bulk incentives, TDS |
| `05-PAYMENT-LIFECYCLE.md` | Non-payment ladder, freeze/seal/archive/delete, reactivation + fines |
| `06-LEGAL-COMPLIANCE.md` | DPDP Act, liability chain, contracts, data ownership, shutdown plan |
| `07-ACCESS-PERMISSIONS.md` | Who can view/upload/download/delete/share, cross-doctor access, audit |
| `08-COST-ECONOMICS.md` | Firebase costs, margins, scale projections, worst-case scenarios |
| `09-TECHNICAL-ARCHITECTURE.md` | Firestore schema, Storage structure, security rules, implementation plan |

---

## RISK SUMMARY

| Risk | Severity | Mitigation | Status |
|---|---|---|---|
| Joint liability (doctor defaults) | HIGH | Direct payment model — eliminated | ✅ Resolved |
| Patient games monthly subscription | MEDIUM | Dues + fine on reactivation | ✅ Resolved |
| Shutdown liability at scale | HIGH | 12-month ladder + 180-day shutdown notice | ✅ Resolved |
| Dead data storage cost | LOW | Max 12 months then delete. Even 1 month payment covers cost | ✅ Resolved |
| DPDP compliance | MEDIUM | Consent + portability + deletion + audit trail | ✅ Designed |
| TDS on doctor commission | LOW | Auto-deduct above ₹15K/year, issue Form 16A | ✅ Designed |
| Firebase wildcard subdomain | HIGH | Path-based URLs instead | ✅ Resolved |
| Doctor downloads/sells patient data | HIGH | Download requires patient consent | ✅ Resolved |

---

## ONE-LINE VISION

> **"Every patient's medical records in one secure paid locker — accessible to any doctor, controlled by the patient, earned by the referring doctor."**
