# Payment Lifecycle — Non-Payment, Reactivation, Fines

**Date:** April 13, 2026  
**Principle:** Bank Locker Model — you stop paying rent, you get notice, you don't respond, locker is emptied.

---

## 1. PATIENT NON-PAYMENT LADDER

### Timeline

```
ACTIVE ──→ WARNING ──→ FROZEN ──→ SEALED ──→ EXPORT ONLY ──→ ARCHIVED ──→ DELETED
  ↑          1-30d       31-90d    91-180d     181-270d       271-365d     365d+
  │
  └── Patient can REACTIVATE at any stage (except after DELETED)
      by paying ALL dues + ₹9/month fine
```

### Detailed Status Table

| Status | Days Overdue | Patient Can | Patient Cannot | Notification |
|---|---|---|---|---|
| **ACTIVE** | 0 | View, download, upload, share | — | Normal |
| **WARNING** | 1-30 | View, download, upload, share | — | SMS + Push: "Payment overdue" (Day 7, 15, 25) |
| **FROZEN** | 31-90 | **View only** | Download, upload, share | SMS + Push: "Access restricted. Pay to unlock." (Day 35, 50, 75) |
| **SEALED** | 91-180 | **Nothing** | All access blocked | SMS + Push: "Locker sealed. Pay dues to reopen." (Day 95, 120, 150) |
| **EXPORT ONLY** | 181-270 | **Download/export only** (one-time full ZIP) | View in-app, upload, share | SMS + Push + Email: "LAST CHANCE: Download your data. Will be archived soon." (Day 185, 210, 240, 260) |
| **ARCHIVED** | 271-365 | **Contact support only** | All access | SMS + Email: "Data moved to archive. Contact support to retrieve." (Day 275, 300, 330, 350) |
| **DELETED** | 365+ | **Nothing — data permanently gone** | Everything | Final SMS + Email: "Your medical locker data has been permanently deleted as per our Terms of Service." |

### Key Rules
```
1. WARNING phase: FULL access continues (30-day grace — standard SaaS)
2. FROZEN phase: View-only means patient can SEE their records but not download/share
   (This prevents "view everything for free forever" gaming)
3. SEALED phase: Complete lockout — creates urgency to pay
4. EXPORT ONLY phase: Last chance — patient can download everything as ZIP
   (This proves HealQR offered data portability — DPDP compliant)
5. ARCHIVED phase: Data in cold storage — still recoverable by support
6. DELETED phase: Permanent. No recovery. No liability.
```

---

## 2. REACTIVATION (Patient Comes Back)

### Reactivation Cost Formula
```
Reactivation Amount = (Overdue Months × ₹49) + (Overdue Months × ₹9 fine)
                    = Overdue Months × ₹58
```

### Reactivation Table

| Months Absent | Monthly Dues | Monthly Fine | Total to Reopen |
|---|---|---|---|
| 1 | ₹49 | ₹9 | **₹58** |
| 2 | ₹98 | ₹18 | **₹116** |
| 3 | ₹147 | ₹27 | **₹174** |
| 4 | ₹196 | ₹36 | **₹232** |
| 5 | ₹245 | ₹45 | **₹290** |
| 6 | ₹294 | ₹54 | **₹348** |
| 8 | ₹392 | ₹72 | **₹464** |
| 10 | ₹490 | ₹90 | **₹580** |
| 11 (max before archive) | ₹539 | ₹99 | **₹638** |

### Reactivation Payment Split
```
Overdue Dues (₹49 × months):
  ₹29 → Doctor commission? NO. Doctor did not serve during overdue period.
  ₹20 → HealQR (storage cost coverage)
  ₹29 → HealQR (retained — no commission on overdue months)
  Total: ₹49/overdue month → 100% to HealQR

Fine (₹9 × months):
  ₹9 → 100% to HealQR

TOTAL reactivation revenue: 100% to HealQR
Doctor commission resumes ONLY from the reactivation month onwards.
```

### Reactivation Flow
```
Patient opens HealQR → "My Medical Locker"
  → Sees: "Your locker is FROZEN/SEALED. Pay ₹XXX to reactivate."
  → Shows breakdown: Dues + Fine
  → Patient pays via IOB gateway
  → Locker instantly reactivated to ACTIVE
  → Doctor commission resumes from current month
  → Patient gets full access again
```

---

## 3. DOCTOR NON-PAYMENT LADDER

### Timeline

```
ACTIVE ──→ WARNING ──→ RESTRICTED ──→ SUSPENDED ──→ PATIENTS NOTIFIED ──→ TERMINATED
  ↑          1-30d       31-60d        61-90d         91-180d              180d+
  │
  └── Doctor can REACTIVATE by paying ALL dues + ₹19/month fine
```

### Detailed Status Table

| Status | Days Overdue | Doctor Can | Doctor Cannot | Patient Impact |
|---|---|---|---|---|
| **ACTIVE** | 0 | Everything | — | None |
| **WARNING** | 1-30 | Everything | — | None |
| **RESTRICTED** | 31-60 | View patient list, view own Rx | Upload new files, add new patients | **None — patients unaffected** |
| **SUSPENDED** | 61-90 | View only (read-only dashboard) | Upload, edit, add, commission | **None — patients unaffected** |
| **PATIENTS NOTIFIED** | 91-180 | Nothing (account locked) | All | Patients get: "Your doctor's locker account is inactive. Your data is safe with HealQR." |
| **TERMINATED** | 180+ | Nothing — account closed | All | Doctor's upload access permanently revoked. Existing patient data stays with patients. |

### CRITICAL RULE: Doctor Non-Payment NEVER Affects Patient Data
```
Doctor stops paying → Doctor loses upload access
Patient's data? → UNTOUCHED. Patient paid HealQR directly.
Patient's access? → FULLY INTACT. No change.
Commission? → Paused. Doctor earns nothing while not paying.
```

**This is the core safety of the direct payment model.** Doctor and patient contracts are independent. If doctor defaults, only doctor suffers.

### Doctor Reactivation
```
Doctor Reactivation = (Overdue Months × ₹99) + (Overdue Months × ₹19 fine)
                    = Overdue Months × ₹118

Doctor reactivation fine is ₹19/month (higher than patient's ₹9 — doctor is a business customer).
```

---

## 4. HEALQR SHUTDOWN PROCEDURE

### If HealQR Decides to Shut Down

| Day | Action | Cost |
|---|---|---|
| Day 0 | Public announcement: "HealQR Medical Locker is shutting down" | — |
| Day 0-30 | Email + SMS + Push to ALL users (patients + doctors) | SMS cost |
| Day 0-90 | Full access continues. Export tools prominently displayed. | Storage cost |
| Day 91-150 | Push notifications every week: "Download your data NOW" | SMS cost |
| Day 151-180 | Final notice: "Last 30 days. Export immediately." | Storage cost |
| Day 170-180 | Bulk export option: "Download ALL your data as ZIP" | Bandwidth cost |
| Day 181 | All data permanently deleted. Firebase project closed. | — |

### Shutdown Costs at Scale
| Scale | Storage | 6-Month Hosting Cost | Total Shutdown Cost |
|---|---|---|---|
| 1,000 doctors | 2 TB | ₹25,800 | **₹25,800** (one-time) |
| 10,000 doctors | 20 TB | ₹2,58,000 | **₹2,58,000** (one-time) |
| 1,00,000 doctors | 200 TB | ₹25,80,000 | **₹25,80,000** (one-time) |

**At 1L doctors, shutdown costs ₹25.8L — ONE TIME, not recurring.** After 180 days, everything deleted, zero ongoing liability.

### Legal Protection During Shutdown
```
1. 180-day notice exceeds standard SaaS norms (most give 30-90 days)
2. Full data export offered (DPDP: data portability)
3. Multiple notification channels (email + SMS + push)
4. Documented warnings at 5 intervals (Day 0, 30, 90, 150, 180)
5. Terms of Service stated shutdown procedure from Day 1
6. No data sold/shared during shutdown — only deleted
```

---

## 5. NOTIFICATION TEMPLATES

### Patient Non-Payment Notifications

**Day 7 (WARNING — 1st reminder):**
```
Hi {PatientName}, your Medical Locker payment of ₹49 is overdue. 
Pay now to continue accessing your health records.
[Pay Now] link
```

**Day 35 (FROZEN — access restricted):**
```
Hi {PatientName}, your Medical Locker is now FROZEN due to non-payment.
You can view your records but cannot download or share.
Outstanding: ₹{amount} + ₹{fine} fine.
[Pay & Restore Access] link
```

**Day 95 (SEALED — no access):**
```
Hi {PatientName}, your Medical Locker is SEALED.
All access is blocked. Pay ₹{totalDues} to reopen.
Your data is safe but inaccessible until payment.
[Pay & Reopen] link
```

**Day 185 (EXPORT ONLY — last chance):**
```
URGENT: Hi {PatientName}, this is your LAST CHANCE to download your medical records.
Your Medical Locker will be permanently archived in {X} days.
[Download All Data as ZIP] link
[Pay ₹{totalDues} to Keep Locker] link
```

**Day 350 (ARCHIVED — final warning):**
```
FINAL NOTICE: Hi {PatientName}, your Medical Locker data will be PERMANENTLY DELETED 
on {deleteDate}. This action is irreversible.
Contact support@healqr.com to retrieve your data before deletion.
```

### Doctor Non-Payment Notifications
Similar structure, professional tone, mentioning commission loss + patient impact.

---

## 6. GAMING PREVENTION

### Scenario: Patient Pays 1 Month, Uploads Everything, Stops Paying

```
Month 1: Pays ₹49, uploads 50 documents.
Month 2: Doesn't pay.
Month 3: Still doesn't pay. FROZEN — view only, no download.
Month 4: Not paying. Still frozen.

Patient thinks: "I can see everything for free, why pay?"

BUT: Cannot download, cannot share with new doctor, cannot upload new records.
This means: Next doctor visit → new Rx cannot be saved to locker.
The locker becomes stale and useless within months.

Month 10: Patient has new diagnosis, needs old records for new doctor.
Must pay: 9 months × ₹58 = ₹522 to reactivate.
Or: Wait until EXPORT ONLY phase, download ZIP, lose locker.
```

**The lock works because the locker's value is ONGOING access + sharing, not one-time storage.**

### Scenario: Patient Reactivates Monthly (Pay 1, Skip 3, Pay 1)

```
Month 1: Pay ₹49 ✅
Month 2-4: Skip ❌ (Dues: ₹147, Fine: ₹27)
Month 5: Pay reactivation ₹174 + current month ₹49 = ₹223 ✅
Month 6-8: Skip ❌ (Dues: ₹147, Fine: ₹27)
Month 9: Pay ₹223 again

Annual cost if gaming: ₹49 + ₹223 + ₹223 = ₹495
Annual cost if paying honestly: ₹49 × 12 = ₹588

Savings from gaming: ₹93/year
BUT: 6 months of frozen/sealed access, can't share with doctors, 
     can't upload new records, hassle of reactivation every time.
```

**Gaming saves ₹93/year but costs 6 months of usability.** Most patients will just pay ₹49/month to avoid the hassle. And HealQR still earns ₹495/year from the gamer vs ₹0 if they quit entirely.

---

## 7. TECHNICAL: STATUS MANAGEMENT

### Cloud Function (runs daily at midnight IST)
```
checkLockerPaymentStatus():
  For each medicalLocker document:
    if lastPaymentDate > 30 days ago AND status == 'active':
      → update status = 'warning', send reminder
    if lastPaymentDate > 60 days ago AND status == 'warning':
      → update status = 'frozen', send notification, block download
    if lastPaymentDate > 120 days ago AND status == 'frozen':
      → update status = 'sealed', send notification, block all access
    if lastPaymentDate > 210 days ago AND status == 'sealed':
      → update status = 'export-only', send URGENT notification
    if lastPaymentDate > 300 days ago AND status == 'export-only':
      → update status = 'archived', move to cold storage
    if lastPaymentDate > 365 days ago AND status == 'archived':
      → delete all files from Storage
      → delete Firestore documents
      → update status = 'deleted'
      → send final notification
```

### Cold Storage (ARCHIVED phase)
```
Firebase Storage standard: ₹2.15/GB/month
Firebase Storage (Nearline — if supported): ₹1.07/GB/month

In ARCHIVED status:
  → Move files from standard to nearline storage class (if available)
  → Or keep in standard (cost difference is minimal at 500MB/patient)
  → 500MB for 3 months (archived period) = ₹0.27 × 3 = ₹0.81 total
  → Negligible cost even without cold storage optimization
```
