# Legal Compliance — DPDP, Liability, Contracts, Data Ownership

**Date:** April 13, 2026  
**Jurisdiction:** India  
**Applicable Laws:** Digital Personal Data Protection Act 2023, IT Act 2000, Indian Contract Act 1872, Income Tax Act 1961  

---

## 1. DATA OWNERSHIP — THE FUNDAMENTAL RULE

```
WHO OWNS THE DATA?

                    ┌─────────────────────────┐
                    │   PATIENT OWNS THE DATA  │
                    │   Always. Non-negotiable. │
                    └─────────────────────────┘

Doctor? → Service provider. Created Rx as part of paid consultation.
           After consultation, Rx belongs to patient.
           Doctor has VIEW-ONLY reference copy.
           
HealQR? → Infrastructure provider. Stores data on behalf of patient.
           Data processor, NOT data controller.
           Cannot use, sell, or share patient data.
```

### Legal Analogy
```
Doctor = Builder who built your house
  → Builder keeps a reference copy of blueprints
  → Builder cannot sell the blueprints
  → Builder cannot demolish your house
  → House belongs to YOU

HealQR = Storage facility (bank locker)
  → Facility stores your valuables
  → Facility cannot open your locker without your key
  → Facility cannot sell your belongings
  → If you stop paying rent, clear procedures apply

Patient = Owner
  → Owns all data
  → Controls who can access
  → Can export anytime
  → Can delete anytime
  → Can leave anytime with their data
```

---

## 2. DPDP ACT 2023 COMPLIANCE

### Key Sections & Our Compliance

| DPDP Requirement | Section | Our Implementation |
|---|---|---|
| **Lawful purpose** | Sec 4 | Medical record storage — clear lawful purpose |
| **Consent** | Sec 6 | Explicit digital consent at locker signup (checkbox + OTP) |
| **Purpose limitation** | Sec 5 | Data used ONLY for storage + retrieval. No analytics, no selling. |
| **Data minimization** | Sec 5 | Only medical documents stored. No unnecessary data collected. |
| **Storage limitation** | Sec 8(7) | Clear retention policy: 12-month ladder → deletion |
| **Right to access** | Sec 11 | Patient can view all data anytime (even in FROZEN state on screen) |
| **Right to correction** | Sec 12 | Patient can update/correct own uploaded data |
| **Right to erasure** | Sec 12 | Patient can delete any file anytime. Full account deletion available. |
| **Data portability** | Sec 12 | Export all data as ZIP. Available at all stages (including EXPORT ONLY phase). |
| **Grievance mechanism** | Sec 8(10) | Designated grievance officer. Contact form on website. |
| **Data breach notification** | Sec 8(6) | Notify Data Protection Board + affected users within 72 hours |
| **Consent withdrawal** | Sec 6(4) | Patient can withdraw consent anytime → data deleted on request |
| **Children's data** | Sec 9 | **NOT APPLICABLE — Medical Locker is for adults (18+).** Minors' records managed by parent's locker. |

### Consent Flow at Signup
```
Patient sees:
┌──────────────────────────────────────────────────────────┐
│ Medical Locker - Consent                                  │
│                                                           │
│ By subscribing, you agree that:                          │
│                                                           │
│ ☐ HealQR will store your medical documents securely      │
│ ☐ You can access, download, and delete your data anytime │
│ ☐ Doctors you authorize can view your records            │
│ ☐ Your data will NOT be sold or shared without consent   │
│ ☐ Non-payment will lead to restricted access per our     │
│   Terms of Service (12-month grace period)               │
│ ☐ I am 18 years or older                                │
│                                                           │
│ [I Agree & Subscribe - ₹49/month]                        │
│                                                           │
│ Read full Terms of Service | Privacy Policy               │
└──────────────────────────────────────────────────────────┘
```

---

## 3. LIABILITY CHAIN — WHO IS LIABLE FOR WHAT

### Three-Party Liability Matrix

| Issue | Patient Liable | Doctor Liable | HealQR Liable |
|---|---|---|---|
| Patient uploads wrong document | ✅ | — | — |
| Doctor uploads wrong Rx | — | ✅ | — |
| Platform data breach | — | — | ✅ |
| Patient shares data with unauthorized person | ✅ | — | — |
| Doctor accesses data beyond permission | — | ✅ | ⚠️ (system should have prevented it) |
| Permission system bug allows unauthorized access | — | — | ✅ |
| Patient stops paying, data frozen | ✅ (own choice) | — | — |
| Doctor stops paying, data affected | — | ✅ | — |
| HealQR shuts down, data lost without notice | — | — | ✅ |
| HealQR shuts down with proper 180-day notice | — | — | — (compliant) |
| Doctor deletes patient data without permission | — | ✅ | ✅ (should have prevented) |
| Data corruption due to Firebase outage | — | — | — (force majeure, Firebase SLA applies) |

### The Critical Protection: No Middleman Liability
```
OLD MODEL (rejected):
  Patient pays Doctor → Doctor pays HealQR
  If Doctor defaults → Patient sues Doctor + HealQR (joint liability)
  
NEW MODEL (approved):
  Patient pays HealQR directly
  Doctor pays HealQR directly
  Two INDEPENDENT contracts
  Doctor's default does NOT affect patient's data
  No joint liability is possible
```

---

## 4. TWO SEPARATE CONTRACTS

### Contract 1: Patient ↔ HealQR (Patient Terms of Service)

| Clause | Content |
|---|---|
| **Service** | HealQR provides 500MB secure cloud storage for medical documents |
| **Price** | ₹49/month, charged via IOB payment gateway |
| **Payment terms** | Monthly. Non-payment triggers 12-month grace ladder (see 05-PAYMENT-LIFECYCLE.md) |
| **Data ownership** | Patient owns all data. HealQR is storage provider only. |
| **Data access** | Patient controls all access permissions |
| **Data portability** | Patient can export all data as ZIP at any time |
| **Data deletion** | Patient can delete any/all data at any time |
| **Non-payment** | View-only → Frozen → Sealed → Export → Archive → Delete (12 months total) |
| **Reactivation** | Pay all dues + ₹9/month fine to reactivate |
| **HealQR's rights** | Store data, maintain infrastructure, send notifications |
| **HealQR's restrictions** | Cannot use, sell, share, analyze, or mine patient data |
| **Refund** | No refund for partial months. Can cancel anytime. |
| **Dispute resolution** | Arbitration under Indian Arbitration Act. Seat: Kolkata. |
| **Governing law** | Laws of India |
| **Termination** | Either party can terminate with 30-day notice |

### Contract 2: Doctor ↔ HealQR (Doctor Terms of Service)

| Clause | Content |
|---|---|
| **Service** | HealQR provides dashboard + upload capability + commission earning |
| **Price** | ₹99/month for 2GB upload pool, charged via IOB payment gateway |
| **Commission** | ₹29/month per active patient referred by doctor |
| **Commission payment** | Credited to HealQR wallet, offset against subscription, payout on request |
| **TDS** | 5% TDS deducted on annual commission > ₹15,000. Form 16A issued. |
| **Doctor's rights** | View own Rx (on-screen only), upload to patient locker, earn commission |
| **Doctor's restrictions** | Cannot download patient data without consent, cannot delete patient data, cannot sell/share data |
| **Non-payment** | Restricted → Suspended → Terminated (180 days) |
| **Patient data protection** | Doctor's non-payment does NOT affect patient data |
| **Data created by doctor** | Doctor retains view-only access to own Rx even after termination |
| **Coupon liability** | Doctor funds coupons from own commission. HealQR's ₹20 is protected. |
| **Dispute resolution** | Arbitration under Indian Arbitration Act. Seat: Kolkata. |

---

## 5. DATA BREACH PROTOCOL

### If a breach occurs:

| Step | Action | Timeline |
|---|---|---|
| 1 | Identify breach scope (which data, which users) | Within 6 hours |
| 2 | Contain breach (revoke access, patch vulnerability) | Within 12 hours |
| 3 | Notify Data Protection Board of India | Within 72 hours (DPDP Sec 8(6)) |
| 4 | Notify affected patients via SMS + email | Within 72 hours |
| 5 | Notify affected doctors | Within 72 hours |
| 6 | Publish incident report on website | Within 7 days |
| 7 | Remediation + audit | Within 30 days |
| 8 | Post-incident review + report to DPB | Within 60 days |

### Breach Prevention Measures
```
1. Firebase Security Rules (Firestore + Storage) — tested and audited
2. HTTPS-only (Firebase default)
3. Firebase Auth (phone OTP) — verified identity
4. Firestore rules enforce:
   - Patient can only access own data
   - Doctor can only view data with active permission grant
   - No wildcard access
5. Audit logging on every data access
6. No patient data in client logs or error reports
7. No patient data in analytics
8. Sentry error monitoring — configured to exclude PII
```

---

## 6. DOCTOR DATA ACCESS — POST-TERMINATION

### What happens when doctor leaves HealQR?

| Data Type | Access After Termination |
|---|---|
| Rx created by this doctor | **View-only (on screen) — forever** |
| Patient data created by other doctors | **Revoked immediately** |
| Commission balance in wallet | **Paid out within 30 days** |
| Upload capability | **Revoked immediately** |
| Dashboard access | **Read-only for 90 days, then revoked** |

### Rationale
```
Doctor created the Rx → Doctor has clinical need to reference it
(e.g., patient complains about treatment, doctor needs records for defense)
View-only access is maintained for medico-legal protection.
But this does NOT include downloading — only screen viewing.
```

---

## 7. PATIENT DATA DELETION — RIGHT TO ERASURE

### When Patient Requests Full Account Deletion

| Step | Action |
|---|---|
| 1 | Patient clicks "Delete My Account" in settings |
| 2 | Confirmation: "This will permanently delete ALL your medical records. This cannot be undone." |
| 3 | OTP verification (phone OTP — confirms identity) |
| 4 | 7-day cooling period: "Your account will be deleted on {date}. Cancel anytime." |
| 5 | After 7 days: |
| 5a | Delete all files from Firebase Storage |
| 5b | Delete all Firestore documents (medicalLocker/{patientId}/*) |
| 5c | Notify referring doctor: "Patient {name} deleted their Medical Locker" |
| 5d | Remove patient from doctor's patient list |
| 5e | Delete audit logs after 90 days (retain for compliance) |
| 6 | Confirmation SMS: "Your Medical Locker has been permanently deleted." |

### What Happens to Doctor's View?
```
Patient deletes locker → Doctor's "own Rx" view-only access is ALSO deleted
Why? Because patient owns the data. Patient's right to erasure is absolute.
Doctor should maintain their own clinical records separately (as per medical ethics).
HealQR is a convenience tool, not the primary medical record system.
```

---

## 8. REGULATORY BODIES & COMPLIANCE CHECKLIST

| Regulatory Body | What We Need | Status |
|---|---|---|
| **Data Protection Board of India** | Register as data processor (when DPB becomes operational) | ⏳ Pending DPB formation |
| **GST Authority** | GST registration + monthly filing | ✅ Done (verify) |
| **Income Tax Department** | TAN for TDS deduction | ⚠️ Need to apply |
| **RBI (via IOB)** | Payment gateway compliance | Handled by IOB |
| **MCA (Ministry of Corporate Affairs)** | Pvt Ltd compliance, annual filings | ✅ Company registered |
| **Medical Council of India** | Not applicable — we don't provide medical services | N/A |

### Legal Documents to Draft Before Launch
| Document | Priority | Status |
|---|---|---|
| Patient Terms of Service | CRITICAL | ❌ Not drafted |
| Doctor Terms of Service | CRITICAL | ❌ Not drafted |
| Privacy Policy (updated for locker) | CRITICAL | ❌ Not drafted |
| Refund & Cancellation Policy | HIGH | ❌ Not drafted |
| Data Retention & Deletion Policy | HIGH | ❌ Not drafted |
| Cookie Policy | MEDIUM | ❌ Not drafted |
| Consent Form (digital) | CRITICAL | ❌ Not drafted |

**⚠️ ALL the above documents should be drafted by a lawyer familiar with DPDP Act before Medical Locker launch.**
