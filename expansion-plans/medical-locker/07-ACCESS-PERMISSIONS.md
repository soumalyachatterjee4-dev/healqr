# Access Permissions Matrix — Who Can Do What

**Date:** April 13, 2026  
**Principle:** Patient owns the data. Everyone else has derived permissions.

---

## 1. MASTER PERMISSION MATRIX

### Patient (Data Owner)

| Action | Own Data | Other Patient's Data |
|---|---|---|
| **View** files | ✅ Always (even FROZEN) | ❌ Never |
| **Download** files | ✅ Active/Warning only | ❌ Never |
| **Upload** files | ✅ Active only | ❌ Never |
| **Delete** individual files | ✅ Active/Warning | ❌ Never |
| **Delete** entire locker | ✅ Always (with OTP + 7-day cool) | ❌ Never |
| **Share** with doctor | ✅ Active only | ❌ Never |
| **Revoke** doctor access | ✅ Always | ❌ Never |
| **Export** all data as ZIP | ✅ All stages up to ARCHIVED | ❌ Never |
| **View** audit log | ✅ Always | ❌ Never |
| **Grant** cross-doctor access | ✅ Active only | ❌ Never |
| **Set** access duration | ✅ Active only | ❌ Never |

### Doctor (Service Provider — Referring Doctor)

| Action | Own Rx (created by this doctor) | Patient's Other Data | Other Doctor's Rx |
|---|---|---|---|
| **View on screen** | ✅ Always (while subscribed) | ❌ Never | ❌ Never |
| **Download** | ❌ Never (without patient consent) | ❌ Never | ❌ Never |
| **Print** | ❌ Never (without patient consent) | ❌ Never | ❌ Never |
| **Upload** new Rx to patient locker | ✅ Active subscription | ❌ N/A | ❌ N/A |
| **Delete** | ❌ Never | ❌ Never | ❌ Never |
| **Edit** uploaded Rx | ⚠️ Within 24 hours only | ❌ Never | ❌ Never |
| **View** patient list | ✅ Own patients only | ❌ Never | ❌ Never |

### Doctor (Cross-Access — Granted by Patient)

| Action | Granted Files | Non-Granted Files |
|---|---|---|
| **View on screen** | ✅ During grant period only | ❌ Never |
| **Download** | ❌ Never | ❌ Never |
| **Print** | ❌ Never | ❌ Never |
| **Upload** new Rx | ✅ To patient's locker (new file, separate from grant) | N/A |
| **Delete** | ❌ Never | ❌ Never |
| **Extend** access period | ❌ Only patient can extend | ❌ N/A |

### HealQR Admin

| Action | Permission | Justification |
|---|---|---|
| **View** patient files | ❌ Never (no admin viewer exists) | Privacy — we are storage, not consumers |
| **Delete** patient files | ❌ Never (only automated lifecycle) | No manual deletion of patient data |
| **View** metadata (file count, storage used) | ✅ For billing + support | Operational need |
| **View** payment status | ✅ Billing + support | Operational need |
| **Trigger** lifecycle state changes | ✅ Automated only (Cloud Function) | Non-payment ladder |
| **Override** freeze/seal | ✅ Support function (with audit log) | Customer support |
| **View** audit logs | ✅ For security + compliance | Regulatory requirement |
| **Export** patient data on behalf of patient | ⚠️ Only with patient's written request + OTP verification | Support function |
| **Send** notifications | ✅ System + lifecycle notifications | Operational need |

---

## 2. ACCESS BY PAYMENT STATE

### Patient States vs Capabilities

| Capability | Active | Warning (1-30d) | Frozen (31-90d) | Sealed (91-180d) | Export Only (181-270d) | Archived (271-365d) | Deleted (365d+) |
|---|---|---|---|---|---|---|---|
| View own files | ✅ | ✅ | ✅ Screen only | ❌ | ❌ | ❌ | N/A |
| Download files | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | N/A |
| Upload files | ✅ | ⚠️ Warning shown | ❌ | ❌ | ❌ | ❌ | N/A |
| Share with doctor | ✅ | ⚠️ Warning shown | ❌ | ❌ | ❌ | ❌ | N/A |
| Export ZIP | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A |
| Delete files | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | N/A |
| Delete account | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A |
| Reactivate | N/A | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Doctor can view | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | N/A |

### Doctor States vs Capabilities

| Capability | Active | Warning (1-30d) | Restricted (31-90d) | Suspended (91-180d) | Grace Exit (180d+) |
|---|---|---|---|---|---|
| View own dashboard | ✅ | ✅ | ✅ Read-only | ✅ Read-only | ❌ |
| Upload Rx to patients | ✅ | ⚠️ Warning | ❌ | ❌ | ❌ |
| View own Rx (reference) | ✅ | ✅ | ✅ | ✅ | ✅ (view-only) |
| Earn commission | ✅ | ✅ | ❌ | ❌ | ❌ |
| Withdraw wallet | ✅ | ⚠️ Offset dues first | ❌ | ❌ | Final payout |
| Access patient locker | ✅ | ✅ | ❌ | ❌ | ❌ |

**CRITICAL RULE:** Doctor's non-payment NEVER affects patient data. Patient's locker remains fully functional.

---

## 3. CROSS-DOCTOR ACCESS FLOW

### Step-by-Step: Patient Shares Records with New Doctor

```
Step 1: Patient opens Medical Locker
Step 2: Taps "Share Records"
Step 3: Searches for or selects doctor from HealQR directory
Step 4: Selects WHICH files to share:
        ☐ All files
        ☐ Files from Dr. X
        ☐ Specific files (checkboxes)
Step 5: Sets ACCESS DURATION:
        ○ 24 hours (one-time consultation)
        ○ 7 days
        ○ 30 days
        ○ Until I revoke
Step 6: Confirms with OTP
Step 7: Doctor receives notification: "Patient {name} shared {N} records with you"
Step 8: Doctor views records on screen (NO download)
Step 9: Access auto-expires at set duration OR patient revokes manually
```

### Firestore Access Grant Document
```javascript
// medicalLocker/{patientId}/accessGrants/{grantId}
{
  grantedToDoctorId: "doc_456",
  grantedToDoctorName: "Dr. Sharma",
  grantedByPatientId: "pat_123",
  grantedAt: Timestamp,
  expiresAt: Timestamp,          // null = until revoked
  accessType: "view_only",       // always view_only
  scope: "specific_files",       // "all" | "doctor_specific" | "specific_files"
  scopeDoctorId: null,           // if scope = "doctor_specific"
  specificFileIds: ["file_1", "file_2"],  // if scope = "specific_files"
  status: "active",              // "active" | "expired" | "revoked"
  revokedAt: null,
  revokedReason: null
}
```

### Access Log Entry (Immutable Audit Trail)
```javascript
// medicalLocker/{patientId}/accessLogs/{logId}
{
  action: "view",               // "view" | "grant" | "revoke" | "expire" | "upload" | "delete"
  performedBy: "doc_456",
  performedByRole: "doctor",
  targetFileId: "file_1",
  targetFileName: "blood_report_2026.pdf",
  timestamp: Timestamp,
  ipAddress: "203.x.x.x",       // for security audit
  deviceInfo: "Chrome/Win10",
  accessGrantId: "grant_789"     // which grant authorized this access
}
```

---

## 4. DOWNLOAD & PRINT RESTRICTIONS

### Why Doctors Cannot Download/Print Without Consent

```
Medical record is patient's property after consultation is complete
(Indian Medical Council Regulations, 2002 — Regulation 1.3.2)

Scenario 1: Doctor downloads Rx → Shares with pharma company for kickback
  → VIOLATION of patient privacy
  
Scenario 2: Doctor prints patient data → Leaves printout in clinic
  → PHYSICAL data breach

Scenario 3: Doctor creates Rx → Patient disputes treatment later
  → Doctor needs reference for defense
  → VIEW ON SCREEN is sufficient for reference
  → No need to download or print
```

### Implementation of View-Only Access
```
Technical enforcement:
1. Documents rendered via secure viewer component (e.g., react-pdf)
2. Right-click → "Save As" disabled (CSS: user-select: none on viewer)
3. Print blocked (CSS: @media print { .locker-viewer { display: none; } })
4. Screenshot possible (cannot prevent) → Watermark overlay:
   "Viewed by Dr. {name} on {date} via HealQR — Not for distribution"
5. API returns pre-signed URL with short expiry (5 minutes) for viewing only
6. No download endpoint exposed to doctor role
7. Firebase Storage security rules: doctor role has NO getDownloadURL permission
```

### Watermark Specification
```
When doctor views any patient document:

┌──────────────────────────────────────────┐
│                                          │
│     [Patient's Medical Document]         │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ WATERMARK (diagonal, 30% opacity)  │  │
│  │                                    │  │
│  │  "Viewed by Dr. Rajesh Kumar"      │  │
│  │  "13 Apr 2026, 2:45 PM"           │  │
│  │  "HealQR Medical Locker"          │  │
│  │  "Not for distribution"           │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘

Watermark properties:
- Font: 16px, gray, 30% opacity
- Rotation: -30 degrees (diagonal)
- Repeating pattern across document
- Cannot be removed by screenshot
- Serves as deterrent AND evidence
```

---

## 5. CONSENT-BASED DOWNLOAD (PATIENT → DOCTOR)

### When Doctor Needs to Download

```
Use case: Doctor needs to send Rx to insurance company for patient's claim

Step 1: Doctor clicks "Request Download Permission" on specific file
Step 2: Patient receives notification:
        "Dr. Kumar requests download access to: Blood Report (Jan 2026)"
        [Allow for 1 hour] [Allow for 24 hours] [Deny]
Step 3: Patient approves (OTP verified)
Step 4: Doctor gets download link (valid for approved duration only)
Step 5: Audit log records: who downloaded, when, which file
Step 6: After expiry, download link is invalidated

Firestore document:
medicalLocker/{patientId}/downloadRequests/{requestId}
{
  requestedBy: "doc_456",
  fileId: "file_1",
  fileName: "blood_report_jan2026.pdf",
  requestedAt: Timestamp,
  status: "approved",        // "pending" | "approved" | "denied" | "expired"
  approvedAt: Timestamp,
  approvedDuration: 3600,    // seconds (1 hour)
  expiresAt: Timestamp,
  downloadedAt: null,        // tracks if actually downloaded
  downloadCount: 0           // max 1 download per approval
}
```

---

## 6. EMERGENCY ACCESS

### What If Patient Is Unconscious/Incapacitated?

```
This is a FUTURE consideration (Phase 4+)

Options to evaluate:
1. Emergency contact designation (patient pre-assigns trusted person)
2. Doctor emergency access with hospital verification
3. Government-mandated emergency access (if regulation exists)

For MVP (Phase 3 launch):
- No emergency access feature
- Patient must be conscious and able to grant access
- This is consistent with how bank lockers work (no emergency access)
- We document this limitation clearly in ToS
```

---

## 7. PERMISSION ENFORCEMENT LAYERS

```
Layer 1: UI (React)
  → Buttons/menus hidden based on role + state
  → Download button shown only to patient (or doctor with approved request)
  → Print CSS blocks printing for non-owners

Layer 2: Firestore Security Rules
  → Read rules check: patientId == request.auth.uid OR hasActiveGrant()
  → Write rules check: only patient can delete, only authorized doctor can upload
  → No wildcard collection group queries allowed

Layer 3: Firebase Storage Rules
  → Download blocked for doctor role (no storage.object.get without matching locker permission)
  → Upload allowed only for authorized doctor + patient

Layer 4: Cloud Functions
  → Even if client is compromised, server-side validation enforces:
    - Grant expiry checked server-side
    - Download request validated server-side
    - Audit log written server-side (cannot be tampered by client)

Layer 5: Audit Trail
  → Every access logged immutably
  → Anomaly detection: flag if doctor views 50+ files in 1 hour
  → Alerts for unusual access patterns
```

---

## 8. EDGE CASES & DECISIONS

| Edge Case | Decision | Rationale |
|---|---|---|
| Patient revokes access while doctor is viewing | Doctor's current view session continues (max 30 min). Next view blocked. | Don't interrupt active medical review |
| Doctor terminated from HealQR — can they still view own Rx? | YES — view-only forever (no download) | Medico-legal protection for doctor |
| Patient dies | Data frozen indefinitely. Legal heir can claim with death certificate + inheritance proof. | Legal requirement |
| Doctor's clinic has multiple staff | Only registered doctor can view. Staff access NOT supported in MVP. | Security — reduce attack surface |
| Patient shared "all files" then uploads new file | New file IS included in existing "all" grant | "All" means all current + future during grant period |
| Patient shared specific files then doctor asks for more | Doctor must request. Patient must grant separately. | Explicit consent per file set |
| Access grant expired while doctor is mid-session | Session continues (max 30 min). Extend not auto-applied. | Grace period for active use |
| Patient exports ZIP from frozen account | Allowed — export is always available up to ARCHIVED stage | Data portability right |
| Two doctors share same clinic | Each has separate account, separate permissions | No shared accounts |
