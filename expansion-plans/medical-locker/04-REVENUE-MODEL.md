# Revenue Model — Complete Money Flow

**Date:** April 13, 2026  
**Model:** Direct Payment (NO middleman)  

---

## 1. PAYMENT FLOW DIAGRAM

```
                         ₹49/month
    Patient ─────────────────────────→ HealQR (IOB Gateway)
                                         │
                                         ├── ₹29 → Doctor Commission
                                         └── ₹20 → HealQR Revenue
    
                         ₹99/month
    Doctor  ─────────────────────────→ HealQR (IOB Gateway)
                                         │
                                         └── ₹99 → HealQR Revenue
    
    TWO INDEPENDENT CONTRACTS.
    Patient contract is with HealQR.
    Doctor contract is with HealQR.
    Neither depends on the other.
```

---

## 2. ALL REVENUE STREAMS

| Source | Amount | Frequency | Who Pays | HealQR Keeps |
|---|---|---|---|---|
| Doctor Mini Website | ₹0 | — | Nobody | ₹0 (free — adoption) |
| Doctor Premium Website | ₹999 | One-time | Doctor | ~₹999 (minus IOB fee) |
| Doctor Premium Subscription | ₹99/month | Monthly | Doctor | ~₹99 (minus IOB fee) |
| Doctor Locker Subscription | ₹99/month | Monthly | Doctor | ~₹99 (minus IOB fee) |
| Patient Locker Subscription | ₹49/month | Monthly | Patient | ₹20 (after ₹29 doctor commission) |
| Patient Reactivation Fine | ₹9/month overdue | One-time lump | Patient | ₹9 (100% to HealQR) |

---

## 3. DOCTOR COMMISSION STRUCTURE

### Base Commission
| Event | Amount | Funded By |
|---|---|---|
| Patient pays ₹49/month | Doctor gets ₹29/month | Patient's payment (split) |
| Patient stops paying | Commission stops immediately | — |
| Patient reactivates | Commission resumes from reactivation month | — |

### Commission Rules
```
1. Commission = ₹29 per active paying patient per month
2. Commission credited to doctor's HealQR wallet (not bank account)
3. Wallet balance offsets doctor's monthly ₹99 subscription
4. If wallet balance > ₹99 → excess carries forward
5. Doctor can request bank payout when wallet > ₹500
6. Bank payout via IOB NEFT/IMPS (₹5 processing fee per payout)
```

### Commission Example
| Doctor's Paying Patients | Monthly Commission | Doctor's Subscription | Net Cash Flow |
|---|---|---|---|
| 0 | ₹0 | -₹99 | **-₹99** |
| 1 | ₹29 | -₹99 | **-₹70** |
| 4 | ₹116 | -₹99 | **+₹17** (break-even) |
| 10 | ₹290 | -₹99 | **+₹191** |
| 20 | ₹580 | -₹99 | **+₹481** |
| 50 | ₹1,450 | -₹99 | **+₹1,351** |
| 100 | ₹2,900 | -₹99 | **+₹2,801** |

**Doctor breaks even at 4 patients.** From patient 5 onwards, pure profit.

---

## 4. COUPON SYSTEM (Doctor-Funded Discounts)

### How It Works
```
Doctor creates coupon from dashboard:
  Code: "DRSAIKAT20"
  Discount: ₹20 off monthly price
  Valid for: 50 uses (or unlimited)
  Expires: June 30, 2026
```

### Revenue Split with Coupon
| Coupon Discount | Patient Pays | Doctor Gets | HealQR Gets |
|---|---|---|---|
| ₹0 (no coupon) | ₹49 | ₹29 | ₹20 |
| ₹5 off | ₹44 | ₹24 | ₹20 |
| ₹10 off | ₹39 | ₹19 | ₹20 |
| ₹15 off | ₹34 | ₹14 | ₹20 |
| ₹20 off | ₹29 | ₹9 | ₹20 |
| ₹29 off (max) | ₹20 | ₹0 | ₹20 |

### Rules
```
1. Maximum coupon discount = ₹29 (doctor's full commission)
2. HealQR's ₹20 is ALWAYS PROTECTED — coupon cannot reduce it
3. Doctor funds the discount from their own commission
4. Doctor cannot create coupons that make HealQR subsidize
5. Coupon can have usage limit (e.g., first 50 patients)
6. Coupon can have expiry date
7. Multiple coupons per doctor allowed
8. Patient can use only ONE coupon at signup
```

---

## 5. BULK INCENTIVES

### 10+1 Cashback
```
Doctor refers 10 patients who pay for locker in a month
  → Doctor gets ₹99 cashback (one month subscription free)
```

| Patients/Month | Commission | Cashback | Total Doctor Earnings |
|---|---|---|---|
| 9 or fewer | ₹29 × patients | ₹0 | ₹29 × patients |
| 10 | ₹29 × 10 = ₹290 | +₹99 | **₹389** |
| 15 | ₹29 × 15 = ₹435 | +₹99 | **₹534** |
| 20 | ₹29 × 20 = ₹580 | +₹99 | **₹679** |

### Doctor Promotional Bundles (Doctor's Choice)
Doctor can offer patients deals using their own margin:
```
"1 month locker free with vaccination above ₹500"
  → Doctor creates coupon: ₹49 off (patient pays ₹0 for month 1)
  → Doctor absorbs ₹29 commission loss for month 1
  → HealQR absorbs ₹20 for month 1 as customer acquisition cost
  
  SPECIAL CASE: Full-free coupons need HealQR approval
  (because HealQR also loses ₹20)
```

**Alternative (safer):**
```
"₹29 off first month with lab test above ₹999"
  → Patient pays ₹20 (minimum)
  → Doctor gets ₹0 commission for month 1
  → HealQR gets ₹20 (protected)
  → Month 2 onwards: normal ₹49 pricing
```

---

## 6. DOCTOR WALLET SYSTEM

### How the Wallet Works
```
doctors/{doctorId}/wallet
  ├── balance: 1305              // current balance in ₹
  ├── totalEarned: 15660         // all-time earnings
  ├── totalPaidOut: 14355        // all-time payouts
  ├── lastPayoutDate: timestamp
  ├── lastPayoutAmount: 500
  │
  └── transactions/{txnId}
        ├── type: "commission" | "cashback" | "payout" | "subscription-deduct"
        ├── amount: 29
        ├── patientId: "pat_xyz"  // null for non-patient transactions
        ├── description: "Monthly commission — Rahul Das"
        ├── date: timestamp
        └── balance_after: 1334
```

### Monthly Cycle
```
1st of every month:
  1. Calculate commissions for all active patient subscriptions
  2. Credit ₹29 per patient to doctor wallet
  3. If 10+ new patients this month → add ₹99 cashback
  4. Deduct ₹99 subscription from wallet (if balance sufficient)
  5. If wallet < ₹99 → charge IOB gateway for shortfall
  6. Generate monthly statement (PDF)
```

### Payout Rules
| Rule | Detail |
|---|---|
| Minimum payout | ₹500 |
| Payout method | NEFT/IMPS to doctor's registered bank account |
| Processing fee | ₹5 per payout (deducted from amount) |
| Payout frequency | On-demand (doctor requests) or auto-monthly if balance > ₹500 |
| Processing time | 1-3 business days |

---

## 7. TDS (Tax Deduction at Source)

### Applicability
| Doctor's Annual Commission | TDS Rate | Section |
|---|---|---|
| Below ₹15,000/year (~43 patients) | **0% — No TDS** | Section 194H |
| ₹15,000 — ₹10,00,000/year | **5% TDS** | Section 194H |
| Above ₹10,00,000/year | **5% TDS** | Section 194H |

### Implementation
```
At financial year end (March 31):
  1. Calculate total commission paid to each doctor
  2. If total > ₹15,000:
     a. Deduct 5% TDS from pending/future commissions
     b. Deposit TDS with government (quarterly)
     c. Issue Form 16A to doctor
  3. Doctor claims TDS credit in their ITR
```

### Example
| Doctor's Annual Commission | TDS Deducted | Doctor Receives |
|---|---|---|
| ₹10,000 (29 patients avg) | ₹0 | ₹10,000 |
| ₹20,000 (58 patients avg) | ₹1,000 | ₹19,000 |
| ₹50,000 (144 patients avg) | ₹2,500 | ₹47,500 |
| ₹1,00,000 (287 patients avg) | ₹5,000 | ₹95,000 |

### TDS Compliance Checklist
| Task | Frequency |
|---|---|
| Deduct TDS (if applicable) | Monthly |
| Deposit TDS with government | Quarterly (7th of next month after quarter) |
| File TDS return (Form 26Q) | Quarterly |
| Issue Form 16A to doctors | Annual (by June 15) |
| Get TAN (Tax Deduction Account Number) | **One-time — REQUIRED before paying commissions** |

**⚠️ CRITICAL: Apply for TAN before launching Phase 3. Without TAN, you cannot legally deduct TDS.**

---

## 8. GST ON ALL PAYMENTS

### HealQR Charges
| Item | Base | GST (18%) | Total Charged |
|---|---|---|---|
| Premium Website (one-time) | ₹847 | ₹152 | **₹999** |
| Premium Monthly | ₹84 | ₹15 | **₹99** |
| Doctor Locker Subscription | ₹84 | ₹15 | **₹99** |
| Patient Locker Subscription | ₹42 | ₹7 | **₹49** |

### GST Compliance
| Task | Frequency |
|---|---|
| Charge GST on all invoices | Every payment |
| File GSTR-1 (outgoing) | Monthly |
| File GSTR-3B (summary) | Monthly |
| Pay GST to government | Monthly (by 20th of next month) |
| Annual return (GSTR-9) | Annual |

**SAC Code for IT services: 998314**

---

## 9. IOB GATEWAY FEES

| Payment Amount | IOB Fee (~1.5%) | Net to HealQR |
|---|---|---|
| ₹49 (patient) | ~₹0.74 | ₹48.26 |
| ₹99 (doctor) | ~₹1.49 | ₹97.51 |
| ₹999 (premium) | ~₹14.99 | ₹984.01 |

**Gateway fees are negligible and absorbed by HealQR (not passed to customer).**

---

## 10. REACTIVATION REVENUE

When a non-paying patient comes back (detailed in `05-PAYMENT-LIFECYCLE.md`):

| Months Absent | Dues (₹49 × months) | Fine (₹9 × months) | Total | HealQR Share (dues ₹20/m + fine ₹9/m) |
|---|---|---|---|---|
| 2 | ₹98 | ₹18 | ₹116 | ₹58 |
| 4 | ₹196 | ₹36 | ₹232 | ₹116 |
| 6 | ₹294 | ₹54 | ₹348 | ₹174 |
| 8 | ₹392 | ₹72 | ₹464 | ₹232 |
| 11 (max) | ₹539 | ₹99 | ₹638 | ₹319 |

**Fine revenue (₹9/month) goes 100% to HealQR.** Doctor does not get commission on overdue months (they provided no service during that period).
