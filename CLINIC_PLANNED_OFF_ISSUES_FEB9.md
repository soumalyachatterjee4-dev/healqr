# Clinic Planned Off - Remaining Issues (Feb 9, 2026)

## STATUS: PARTIAL FIX DEPLOYED - CHAMBER BLOCKING STILL BROKEN

### What Was Fixed Today:
✅ Added clinicId/clinicName tracking to new clinic planned off periods
✅ SelectDate component filters by clinicId when provided (clinic QR booking)
✅ App.tsx filters legacy clinic periods for doctor solo QR calendar
✅ AdvanceBooking.tsx enhanced with legacy period detection logic

### Remaining Issues (Confirmed with Screenshots):

#### Issue 1: Chamber Blocking Not Working
**Problem:** Doctor Amit Shahi's HEALTH POINT chamber shows as available on Feb 21 when clinic is off
- Screenshot SS1 shows: "No clinic planned off periods provided" in console
- HEALTH POINT chamber shows 0/20 bookings (should show "Clinic Closed")
- HOME CHAMBER correctly shows available

**Root Cause:** SelectChamber component is not receiving clinic planned off periods
- Console logs show warnings: "No clinic planned off periods provided"
- The isClinicOffForChamber logic in AdvanceBooking.tsx won't help if data isn't loaded
- Need to trace data flow: App.tsx → SelectChamber component

**Expected Behavior:**
- When doctor solo QR scanned → fetch linked clinic schedules
- Pass clinic planned off periods to SelectChamber
- Apply clinic periods to matching chamber addresses

#### Issue 2: Clinic QR Booking Not Blocking Linked Doctors
**Problem:** When scanning clinic QR → linked doctor chambers not affected by clinic planned off
- User mentioned "clinic QR scan > linked dr having no effect on 21/02/2026"
- Need to verify ClinicBookingFlow passes clinic periods correctly

#### Issue 3: Legacy Periods Still Affecting Unlinked Doctors
**Problem:** Saugata Adak (unlinked from clinic) still has Feb 21 blocked
- Screenshot SS2: Shows ACTIVE "ENTIRE CLINIC" period for Feb 21 (created 09/02/2026)
- Screenshot SS3: Solo QR calendar shows Feb 21 grayed out (disabled)
- Legacy filtering in App.tsx should remove this, but it's still appearing

**Note:** Saugata Adak has the period marked as "ENTIRE CLINIC" - this suggests:
- He may have created this period himself (not inherited from clinic)
- OR the period has appliesTo: 'clinic' but is in his doctor document
- Need to check Firestore data structure

### Technical Analysis:

**Data Flow for Doctor Solo QR:**
```
App.tsx (QR scan)
  ↓ Load doctor document
  ↓ Filter plannedOffPeriods (removes clinic periods)
  ↓ Set doctorData state
  ↓ Pass to SelectChamber component
  ↓ SelectChamber needs clinic schedule data too!
     ↓ Currently missing: Fetch linked clinic schedules
     ↓ Missing: Load clinic plannedOffPeriods
     ↓ Missing: Pass to isClinicOffForChamber check
```

**Data Flow for Clinic QR:**
```
ClinicBookingFlow
  ↓ Load clinic document
  ↓ Load linked doctors
  ↓ Pass clinicId to SelectDate (calendar filtering)
  ↓ Need to verify: Clinic periods passed to chamber selection
```

### Files Modified Today:
1. components/ClinicScheduleManager.tsx (lines 237-252) - Added clinicId/clinicName to new periods
2. components/SelectDate.tsx (lines 103-123) - Filter by clinicId
3. components/ClinicBookingFlow.tsx (line 453) - Pass clinicId to SelectDate
4. components/AdvanceBooking.tsx (lines 90-140) - Enhanced isClinicOffForChamber with legacy detection
5. App.tsx (lines 834-860, 1017-1047) - Filter clinic periods for doctor solo QR

### Tomorrow's Fix Plan:

#### Step 1: Fix Chamber Blocking in Doctor Solo QR
- [ ] Check SelectChamber component data flow
- [ ] Ensure doctor's linked clinic IDs are loaded
- [ ] Fetch clinic schedules for each linked clinic
- [ ] Pass clinic planned off periods to SelectChamber
- [ ] Verify isClinicOffForChamber receives data

#### Step 2: Fix Clinic QR Booking Flow
- [ ] Trace ClinicBookingFlow → doctor selection → chamber selection
- [ ] Ensure clinic planned off periods are passed through
- [ ] Verify chamber blocking works in clinic flow

#### Step 3: Clean Up Legacy Periods
- [ ] Check Saugata Adak's plannedOffPeriods in Firestore
- [ ] Identify why "ENTIRE CLINIC" badge appears for doctor period
- [ ] Fix badge logic or data structure
- [ ] Consider migration script to clean up orphaned clinic periods

#### Step 4: Comprehensive Testing
- [ ] Test doctor solo QR with clinic chamber on planned off date
- [ ] Test clinic QR with linked doctor on planned off date
- [ ] Test unlinked doctor should not see clinic periods
- [ ] Test legacy periods vs new periods
- [ ] Test cross-clinic doctors (multiple clinic links)

### Key Questions for Tomorrow:
1. Where does SelectChamber get clinic schedule data currently?
2. Does doctor document store linkedClinics array or clinicIds?
3. How to fetch multiple clinic schedules efficiently?
4. Should we add clinic periods to doctor's plannedOffPeriods or fetch separately?
5. What's the source of "ENTIRE CLINIC" badge in Saugata's history?

### Console Warnings Observed:
```
No clinic planned off periods provided (SelectChamber.tsx:89)
isClinicOff CHECK START (SelectChamber.tsx:82)
NO FILTERING: Clinic is open or no clinic ID/address provided (SelectChamber.tsx:133)
```

### Expected vs Actual:

**Expected (Feb 21, 2026 - Clinic Off):**
- Amit Shahi solo QR → Calendar shows Feb 21 available ✅
- Select Feb 21 → HEALTH POINT chamber: "Clinic Closed" ❌ (Shows available)
- Select Feb 21 → HOME CHAMBER: Available ✅
- Saugata Adak solo QR → Calendar shows Feb 21 available ❌ (Shows blocked)

**Actual:**
- Chamber blocking not working - console shows no clinic data
- Legacy periods still blocking unlinked doctors

---

## Git Commit:
Committed as: "WIP: Enhanced clinic planned off with legacy period detection (partial fix - chamber blocking issue remains)"
Commit hash: d49d421

## Deployment:
Deployed to: https://teamhealqr.web.app
Status: DEPLOYED BUT INCOMPLETE

## Next Session Priority:
**HIGH PRIORITY:** Fix SelectChamber to load and apply clinic planned off periods
**MEDIUM PRIORITY:** Fix clinic QR flow chamber blocking
**LOW PRIORITY:** Clean up legacy period data in Firestore
