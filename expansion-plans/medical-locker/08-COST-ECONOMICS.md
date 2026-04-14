# Cost Economics — Firebase, Margins, Scale Projections, Break-Even

**Date:** April 13, 2026  
**Currency:** INR (₹)  
**Firebase Pricing Region:** asia-south1 (Mumbai)

---

## 1. FIREBASE PRICING BREAKDOWN

### Firebase Storage (Cloud Storage for Firebase)
```
Storage:     ₹2.15/GB/month   ($0.026/GB)
Download:    ₹1.04/GB          ($0.012/GB)
Upload:      FREE (within first 50K operations/day)
Operations:  ₹0.42/100K operations

Source: Firebase pricing page (asia-south1)
Note: Prices may change. Verify before launch.
```

### Firestore
```
Reads:       ₹0.029/100K reads      ($0.00035)
Writes:      ₹0.15/100K writes      ($0.0018)
Deletes:     ₹0.013/100K deletes    ($0.00016)
Storage:     ₹0.15/GB/month         ($0.0018/GB)

Note: Firestore costs are negligible compared to Storage.
Even at 1L patients, Firestore cost < ₹500/month.
```

### Firebase Authentication
```
Phone Auth (OTP): ₹0.50/verification (India rate)
First 10K/month: FREE
After 10K: ₹0.50/verification

Budget impact: At 1,000 patients, ~₹500/month for OTP.
```

### Firebase Hosting
```
Storage:     FREE (first 10GB)
Transfer:    FREE (first 360MB/day)
Beyond:      ₹0.15/GB

Budget impact: Negligible for our use case.
```

### Cloud Functions
```
Invocations: FREE (first 2M/month)
Compute:     ₹0.0000004/100ms (per GB-second)
Networking:  ₹0.10/GB outbound

Budget impact: < ₹500/month even at scale.
```

---

## 2. PER-PATIENT COST ANALYSIS

### Scenario: 1 Patient, 500MB storage, Active for 12 months

| Cost Item | Monthly | Annual |
|---|---|---|
| Storage (500MB = 0.5GB) | ₹1.07 | ₹12.84 |
| Firestore metadata | ₹0.01 | ₹0.12 |
| Download bandwidth (2 downloads/month, 10MB each = 20MB) | ₹0.02 | ₹0.24 |
| Cloud Function invocations (daily check + events) | ₹0.005 | ₹0.06 |
| OTP verifications (1/month average) | ₹0.50 | ₹6.00 |
| **TOTAL per patient** | **₹1.61** | **₹19.26** |

### Revenue vs Cost per Patient

| Item | Monthly | Annual |
|---|---|---|
| Patient pays | ₹49 | ₹588 |
| IOB gateway fee (~1.5%) | -₹0.74 | -₹8.82 |
| GST (18%) | -₹7.49 (collected, remitted to govt) | -₹89.88 |
| Net revenue (excl GST) | ₹41.51 | ₹498.12 |
| Doctor commission | -₹29.00 | -₹348.00 |
| Firebase cost | -₹1.61 | -₹19.26 |
| **HealQR gross profit per patient** | **₹10.90** | **₹130.86** |

### Margin Analysis
```
Gross margin per patient: ₹10.90/month
Gross margin %: ₹10.90 / ₹41.51 = 26.3% (after commission)

If no doctor commission (direct patient):
Gross margin: ₹39.90/month = 96.1%

Blended estimate (70% with doctor, 30% direct):
Weighted margin: (0.7 × ₹10.90) + (0.3 × ₹39.90) = ₹19.60/month per patient
```

---

## 3. PER-DOCTOR COST ANALYSIS

### Scenario: 1 Doctor, 2GB upload pool

| Cost Item | Monthly | Annual |
|---|---|---|
| Storage (2GB) | ₹4.30 | ₹51.60 |
| Firestore (dashboard, patient list, Rx docs) | ₹0.10 | ₹1.20 |
| Cloud Function (daily checks, commission calc) | ₹0.01 | ₹0.12 |
| OTP verifications (login 2x/month) | ₹1.00 | ₹12.00 |
| **TOTAL per doctor** | **₹5.41** | **₹64.92** |

### Revenue vs Cost per Doctor

| Item | Monthly | Annual |
|---|---|---|
| Doctor subscription | ₹99 | ₹1,188 |
| IOB gateway fee (~1.5%) | -₹1.49 | -₹17.82 |
| GST (18%) | -₹15.10 (remitted) | -₹181.17 |
| Net revenue (excl GST) | ₹83.90 | ₹1,006.83 |
| Firebase cost | -₹5.41 | -₹64.92 |
| **HealQR gross profit per doctor** | **₹78.49** | **₹941.91** |
| **Gross margin %** | **93.6%** | **93.6%** |

---

## 4. COMMISSION ECONOMICS (DOCTOR)

### Doctor Break-Even on Commission

```
Doctor pays: ₹99/month subscription
Doctor earns: ₹29/month per active patient

Break-even: ₹99 / ₹29 = 3.41 patients → 4 patients

At 4 patients: ₹29 × 4 = ₹116 commission → ₹17 profit
At 10 patients: ₹29 × 10 = ₹290 → ₹191 profit
At 10 patients + bonus: ₹290 + ₹99 cashback = ₹389 → ₹290 profit
At 50 patients: ₹29 × 50 = ₹1,450 → ₹1,351 profit/month
```

### TDS Threshold Check
```
Annual commission > ₹15,000 → TDS applicable (5%)

₹15,000 / 12 = ₹1,250/month
₹1,250 / ₹29 = 43.1 patients

So: Doctor with 44+ active patients → TDS kicks in
Most doctors will have < 44 patients initially → No TDS hassle early on
```

---

## 5. SCALE PROJECTIONS

### Tier 1: 100 Doctors, 500 Patients (Month 6)

| Revenue Source | Monthly | Annual |
|---|---|---|
| Doctor subscriptions (100 × ₹99) | ₹9,900 | ₹1,18,800 |
| Patient subscriptions (500 × ₹49) | ₹24,500 | ₹2,94,000 |
| **Gross revenue** | **₹34,400** | **₹4,12,800** |
| Less: Gateway fees (1.5%) | -₹516 | -₹6,192 |
| Less: GST (18%) | -₹5,257 | -₹63,085 |
| Less: Doctor commissions (500 × ₹29) | -₹14,500 | -₹1,74,000 |
| Less: Firebase costs | -₹1,346 | -₹16,150 |
| **Net profit** | **₹12,781** | **₹1,53,373** |

### Tier 2: 1,000 Doctors, 5,000 Patients (Month 18)

| Revenue Source | Monthly | Annual |
|---|---|---|
| Doctor subscriptions (1K × ₹99) | ₹99,000 | ₹11,88,000 |
| Patient subscriptions (5K × ₹49) | ₹2,45,000 | ₹29,40,000 |
| **Gross revenue** | **₹3,44,000** | **₹41,28,000** |
| Less: Gateway fees | -₹5,160 | -₹61,920 |
| Less: GST | -₹52,576 | -₹6,30,908 |
| Less: Doctor commissions | -₹1,45,000 | -₹17,40,000 |
| Less: Firebase costs | -₹13,460 | -₹1,61,520 |
| **Net profit** | **₹1,27,804** | **₹15,33,652** |

### Tier 3: 10,000 Doctors, 50,000 Patients (Month 36)

| Revenue Source | Monthly | Annual |
|---|---|---|
| Doctor subscriptions | ₹9,90,000 | ₹1,18,80,000 |
| Patient subscriptions | ₹24,50,000 | ₹2,94,00,000 |
| **Gross revenue** | **₹34,40,000** | **₹4,12,80,000** |
| Less: Gateway fees | -₹51,600 | -₹6,19,200 |
| Less: GST | -₹5,25,763 | -₹63,09,153 |
| Less: Doctor commissions | -₹14,50,000 | -₹1,74,00,000 |
| Less: Firebase costs | -₹1,34,600 | -₹16,15,200 |
| **Net profit** | **₹12,78,037** | **₹1,53,36,447** |

### Tier 4: 1,00,000 Doctors, 5,00,000 Patients (Year 5 — aspirational)

| Revenue Source | Monthly | Annual |
|---|---|---|
| Doctor subscriptions | ₹99,00,000 | ₹11,88,00,000 |
| Patient subscriptions | ₹2,45,00,000 | ₹29,40,00,000 |
| **Gross revenue** | **₹3,44,00,000** | **₹41,28,00,000** |
| Less: Gateway fees | -₹5,16,000 | -₹61,92,000 |
| Less: GST | -₹52,57,627 | -₹6,30,91,525 |
| Less: Doctor commissions | -₹1,45,00,000 | -₹17,40,00,000 |
| Less: Firebase costs | -₹13,46,000 | -₹1,61,52,000 |
| **Net profit** | **₹1,27,80,373** | **₹15,33,64,475** |

⚠️ **At this scale, Firebase may not be the optimal infrastructure. Consider:**
- GCP direct (Cloud Storage is cheaper at volume)
- Object Lifecycle policies for cold storage
- CDN for frequently accessed files
- Negotiate enterprise pricing with Google

---

## 6. WORST-CASE SCENARIOS

### Scenario A: Patient Pays 1 Month, Stops Paying
```
Revenue:    ₹49 (1 month)
Cost:       ₹1.61/month × 12 months (data stored for 12-month ladder) = ₹19.32
Commission: ₹29 (1 month to doctor)
Gateway:    ₹0.74
GST:        ₹7.49

Net loss:   ₹49 - ₹29 - ₹0.74 - ₹19.32 = ₹-0.06 (BREAKEVEN)

After 12 months, data deleted → no ongoing cost.
Worst case is basically breakeven. The 12-month ladder costs us ~₹19 in storage.
```

### Scenario B: Patient Uses Full 500MB, Active 1 Year
```
Revenue:    ₹588 (12 months × ₹49)
Firebase:   ₹19.26/year (storage + operations)
Commission: ₹348 (12 × ₹29)
Gateway:    ₹8.82
GST:        ₹89.88 (collected, remitted)

Net profit: ₹588 - ₹348 - ₹8.82 - ₹19.26 = ₹211.92
After GST:  ₹130.86

This is a healthy customer.
```

### Scenario C: Doctor Pays But Has 0 Patients
```
Revenue:    ₹1,188/year (₹99 × 12)
Firebase:   ₹64.92/year (2GB pool sits mostly empty)
Commission: ₹0 (no patients)
Gateway:    ₹17.82

Net profit: ₹1,188 - ₹17.82 - ₹64.92 = ₹1,105.26
After GST:  ₹941.91

Doctor with no patients is our MOST profitable customer (no commission payout).
But doctor will churn after 3-6 months. Retention requires patients.
```

### Scenario D: Mass Churn (50% patients leave in Month 2)
```
Month 1: 1,000 patients join → ₹49,000 revenue
Month 2: 500 leave → 500 stay → ₹24,500 revenue
Ongoing: 500 leaving patients cost ₹1.61/month × 12 = ₹9,660 total storage cost

Total cost for churned patients: ₹9,660
Total revenue from churned patients: 500 × ₹49 = ₹24,500
Revenue from remaining: 500 × ₹49 × 11 = ₹2,69,500

Net: Profitable. Churn is manageable because per-patient storage cost is tiny.
```

---

## 7. COUPON IMPACT ON ECONOMICS

### Scenario: Doctor Offers Max ₹29 Coupon

```
Patient pays: ₹49 - ₹29 coupon = ₹20
Doctor commission: ₹29 - ₹29 coupon = ₹0
HealQR receives: ₹20 (ALWAYS PROTECTED)

HealQR cost per patient: ₹1.61/month
HealQR net: ₹20 - ₹1.61 - ₹0.30 (gateway) - ₹3.05 (GST internal) = ₹15.04

Even with maximum coupon, HealQR still earns ₹15.04/patient/month.
```

### Scenario: Doctor Offers ₹15 Coupon (Moderate)
```
Patient pays: ₹49 - ₹15 = ₹34
Doctor commission: ₹29 - ₹15 = ₹14
HealQR receives: ₹20
Gateway: ₹0.51 (1.5% of ₹34)

HealQR net: ₹20 - ₹1.61 - ₹0.51 = ₹17.88
Doctor net per patient: ₹14 (partially subsidizing for patient acquisition)
```

---

## 8. INFRASTRUCTURE COST SAFETY RAILS

### Monthly Firebase Budget Alerts
```
Set up in Google Cloud Console:
- Alert at ₹5,000/month   → Review usage
- Alert at ₹10,000/month  → Investigate anomalies
- Alert at ₹25,000/month  → Consider optimization
- Alert at ₹50,000/month  → Evaluate GCP direct pricing
- Hard cap at ₹1,00,000/month → Prevent bill shock
```

### Cost Optimization Strategies (When Needed)
```
1. Lifecycle policies: Auto-move files > 6 months old to NEARLINE storage (₹0.85/GB/month)
2. Deduplication: Hash-based detection for identical uploads
3. Compression: Server-side compress images before storing
4. CDN caching: Frequently accessed Rx cached at edge
5. Thumbnail generation: Store low-res preview, full-res on demand
6. Cold storage archival: Files untouched > 1 year → ARCHIVE class (₹0.17/GB/month)
```

---

## 9. OPERATIONAL COSTS (NON-FIREBASE)

| Cost Item | Monthly Estimate | Notes |
|---|---|---|
| Domain (healqr.com) | ₹80 | Annual, amortized monthly |
| SSL Certificate | ₹0 | Free (Firebase default) |
| Email (business email) | ₹150 | Google Workspace or IOB email |
| SMS/OTP | ₹500-₹5,000 | Scale-dependent (Firebase Auth) |
| Error monitoring (Sentry) | ₹0 | Free tier sufficient initially |
| Analytics (Firebase) | ₹0 | Free tier |
| Legal (ongoing) | ₹5,000 | Retainer for contract reviews |
| Accounting/CA | ₹3,000 | GST filing + TDS returns |
| **TOTAL ops cost** | **₹8,730 - ₹13,230** | |

### One-Time Costs Before Launch
| Item | Estimate |
|---|---|
| Legal: Draft ToS + Privacy Policy + Consent Form | ₹15,000 - ₹30,000 |
| TAN registration | ₹1,000 |
| IOB payment gateway setup | ₹0 - ₹5,000 |
| Logo/branding refresh (if needed) | ₹5,000 |
| **TOTAL one-time** | **₹21,000 - ₹41,000** |

---

## 10. BREAK-EVEN ANALYSIS

### When Does Medical Locker Break Even?

```
Fixed monthly costs: ~₹10,000 (ops + CA + legal retainer)
Per-patient net margin: ₹10.90 (with commission) or ₹39.90 (direct)
Per-doctor net margin: ₹78.49

Worst case (all patients via doctors):
Break-even patients: ₹10,000 / ₹10.90 = 918 patients → ~92 doctors with 10 patients each

Best case (30% direct patients):
Blended margin: ₹19.60/patient
Break-even patients: ₹10,000 / ₹19.60 = 511 patients → ~51 doctors with 10 patients each

With doctor subscriptions (50 doctors):
Doctor revenue covers: 50 × ₹78.49 = ₹3,924.50
Remaining to cover: ₹10,000 - ₹3,924.50 = ₹6,075.50
Patient break-even: ₹6,075.50 / ₹10.90 = 558 patients

REALISTIC BREAK-EVEN: ~50 doctors + ~500 patients
```

---

## 11. SHUTDOWN COST AT SCALE (Reference from 05-PAYMENT-LIFECYCLE.md)

| Scale | Data to Maintain (180-day shutdown notice) | Monthly Cost | 6-Month Cost |
|---|---|---|---|
| 100 doctors, 500 patients | 450GB | ₹968 | ₹5,805 |
| 1K doctors, 5K patients | 4.5TB | ₹9,675 | ₹58,050 |
| 10K doctors, 50K patients | 45TB | ₹96,750 | ₹5,80,500 |
| 1L doctors, 5L patients | 450TB | ₹9,67,500 | ₹58,05,000 |

**Mitigation:** Before reaching 10K+ doctor scale, implement cold storage archival to reduce costs by 5-10x.
