# CLINIC SECTION DEVELOPMENT PLAN
**Date:** February 8, 2026  
**Priority:** HIGH - Immediate Development  
**Status:** Planning Phase

---

## 🎯 OBJECTIVES

Focus on 4 critical areas:
1. ✅ Doctor-Clinic Linking System
2. ✅ Clinic Booking Flow
3. ✅ Remove Demo/Placeholder Data
4. ✅ All Pages Functionality Check

---

## 📋 TASK 1: DOCTOR-CLINIC LINKING SYSTEM

### Current Status Analysis
**Files Involved:**
- `components/ManageDoctors.tsx` - Manages doctor linking
- `components/ClinicDashboard.tsx` - Shows linked doctors
- `components/ClinicScheduleManager.tsx` - Manages clinic-doctor schedules
- `lib/firebase/db.service.ts` - Database service for linking

### Issues to Fix

#### 1.1 Two-Way Linking
**Problem:** Need bidirectional relationship between Doctor ↔ Clinic

**Current Implementation:**
```
Clinic Document:
- linkedDoctorCodes: string[]
- linkedDoctorsDetails: array of doctor objects

Doctor Document:  
- clinicId: string (optional)
- chambers: array (includes clinicId per chamber)
```

**Required Changes:**
- ✅ When clinic links doctor → Update doctor's document with clinicId
- ✅ When doctor creates chamber with clinicCode → Update clinic's linkedDoctorsDetails
- ✅ When unlinking → Clean both sides
- ✅ Validate clinic exists before linking
- ✅ Prevent duplicate linking

#### 1.2 Doctor Search & Link Flow
**Current:** Search by doctor code only  
**Required:**
- Search by doctor code ✅ (already working)
- Search by doctor name
- Search by specialty
- Show doctor profile before linking
- Confirmation dialog before linking

#### 1.3 Linked Doctor Data Sync
**Problem:** When doctor updates profile, clinic data gets stale

**Solution:**
- Real-time listener for linked doctors
- Auto-update clinic's linkedDoctorsDetails when doctor updates:
  - Name
  - Specialty
  - Profile image
  - Contact details
  - Chamber schedules

#### 1.4 Unlinking Process
**Current:** Basic unlink from clinic side  
**Required:**
- Clean clinic's linkedDoctorsDetails
- Remove clinicId from doctor's chambers at that clinic
- Notify doctor via notification
- Confirmation with warning about impact
- Archive linked data instead of delete (for history)

---

## 📋 TASK 2: CLINIC BOOKING FLOW

### Current Status Analysis
**File:** `components/ClinicBookingFlow.tsx`

### Flow Steps
1. Language Selection ✅
2. Clinic Home Page (show linked doctors)
3. Search by Specialty OR Name
4. Doctor Profile View
5. Select Date
6. Select Chamber (at this clinic only)
7. Patient Details
8. Booking Confirmation

### Issues to Fix

#### 2.1 Clinic Home Page
**Current Issues:**
- May show placeholder data
- Doesn't filter doctors properly
- Missing clinic branding

**Required:**
- Show ONLY linked doctors to this clinic
- Display clinic logo, name, address
- Show doctor cards with:
  - Profile image
  - Name
  - Specialties
  - Experience
  - Available today indicator
  - Rating (from real reviews, not placeholder)
- Search bar for doctor name
- Filter by specialty
- Sort by: Availability, Specialty, Name

#### 2.2 Specialty Search
**Current Issues:**
- May include doctors not linked to clinic
- Placeholder specialties

**Required:**
- Extract specialties ONLY from linked doctors
- Show doctor count per specialty
- Click specialty → Show doctors with that specialty
- All doctors must be linked to current clinic

#### 2.3 Doctor Profile in Clinic Context
**Current Issues:**
- Shows all doctor's chambers (even other clinics)
- Doesn't highlight current clinic

**Required:**
- Show doctor's full profile
- Highlight chambers AT THIS CLINIC only
- Show "Available at THIS CLINIC on: Mon, Wed, Fri"
- Hide other clinic chambers completely
- Show total bookings AT THIS CLINIC
- Show reviews from THIS CLINIC only (future)

#### 2.4 Chamber Selection
**Current Issues:**
- May show chambers from other clinics
- Doesn't filter by clinic

**Required:**
- Show ONLY chambers where chamber.clinicId === currentClinic.id
- If doctor has no chambers at this clinic → Show "Not available at this location"
- Group by date
- Show availability status
- Book button should create booking with clinicId reference

#### 2.5 Booking Creation
**Current Issues:**
- May not properly link booking to clinic
- Missing clinic context in booking

**Required:**
```javascript
Booking Document:
{
  doctorId: string
  patientId: string
  chamberI: string
  date: string
  time: string
  tokenNumber: number
  
  // CLINIC CONTEXT - ADD THESE
  clinicId: string  // ← ADD
  clinicName: string // ← ADD
  clinicQRCode: string // ← ADD (the QR code scanned)
  bookingSource: 'clinic-qr' | 'direct' | 'walkin'
  
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: timestamp
}
```

#### 2.6 QR Code to Clinic Resolution
**Current Implementation:**
```javascript
// From URL: /clinic-booking?qr=ABC123
const loadClinicData = async () => {
  const clinicSnap = await query(
    collection(db, 'clinics'),
    where('qrNumber', '==', qrCode)
  )
}
```

**Issues:**
- Error handling for invalid QR
- Loading states
- QR not found → Show error page

**Required:**
- Validate QR code exists
- Show loading spinner
- QR not found → "Invalid QR Code. Please contact clinic."
- Log QR scan for analytics
- Increment clinic's totalScans counter

---

## 📋 TASK 3: REMOVE DEMO/PLACEHOLDER DATA

### Files to Clean

#### 3.1 ClinicDashboard.tsx
**Search for:**
- Demo data initialization
- Placeholder text
- Sample/mock data

**Check:**
- All data comes from Firestore
- No hardcoded clinic names
- No demo doctors
- No fake booking numbers

#### 3.2 ClinicBookingFlow.tsx
**Found Issues:**
```javascript
placeholderReviews?: any[];  // Line 44
placeholderReviews: fullDoctorData.placeholderReviews,  // Line 170
```

**Action Required:**
- Remove placeholderReviews references
- Use real reviews from database OR hide reviews section
- Remove any demo doctor data
- Ensure all doctors come from linkedDoctorsDetails

#### 3.3 ManageDoctors.tsx
**Check for:**
- Demo doctor accounts
- Sample linking data
- Test doctor codes

#### 3.4 ClinicProfileManager.tsx
**Check for:**
- Demo clinic details
- Placeholder images
- Sample addresses

#### 3.5 ClinicScheduleManager.tsx
**Check for:**
- Demo schedules
- Sample chambers
- Fake doctor names

---

## 📋 TASK 4: ALL PAGES FUNCTIONALITY CHECK

### 4.1 Clinic Sign Up (`ClinicSignUp.tsx`)
**Check:**
- [ ] Email validation works
- [ ] Password strength validation
- [ ] QR code generation works
- [ ] Clinic code generation is unique
- [ ] Firebase auth creates account
- [ ] Firestore document created correctly
- [ ] Redirect to dashboard after signup
- [ ] Error handling for duplicate email
- [ ] Phone number validation

**Test Flow:**
1. Try invalid email → Should show error
2. Try weak password → Should show error  
3. Try valid signup → Should create account
4. Check Firestore → Document should exist
5. QR code should be generated and unique
6. Clinic code should be generated and unique

### 4.2 Clinic Login (`ClinicLogin.tsx`)
**Check:**
- [ ] Email/password validation
- [ ] Firebase auth login works
- [ ] Redirect to dashboard
- [ ] Remember me functionality
- [ ] Password reset link works
- [ ] Error handling for wrong credentials
- [ ] Error handling for non-existent account

**Test Flow:**
1. Try wrong password → Should show error
2. Try non-existent email → Should show error
3. Try correct credentials → Should login
4. Should redirect to dashboard
5. Logout → Should return to login

### 4.3 Clinic Dashboard (`ClinicDashboard.tsx`)
**Check:**
- [ ] Loads clinic data from Firestore
- [ ] Shows clinic name, address, QR code
- [ ] Analytics show correct numbers:
  - Total Scans (from linked doctors)
  - Total Bookings (QR + Walk-in)
  - Monthly Bookings
  - Drop outs
  - Cancelled
- [ ] Today's Schedule shows correct chambers
- [ ] Linked doctors list loads correctly
- [ ] All menu items work:
  - Dashboard ✓
  - Manage Doctors
  - Clinic Profile
  - QR Manager
  - Schedule Manager
  - Today's Schedule
- [ ] Logout works
- [ ] Share functionality works

**Test Flow:**
1. Login as clinic
2. Check all numbers match database
3. Click each menu item → Should load component
4. Check today's schedule → Should show today's chambers
5. Logout → Should return to login

### 4.4 Manage Doctors (`ManageDoctors.tsx`)
**Check:**
- [ ] Shows list of linked doctors
- [ ] Search doctor by code works
- [ ] Search doctor by name works
- [ ] Link doctor functionality:
  - Updates clinic document
  - Updates doctor document
  - Shows success message
  - Prevents duplicate linking
- [ ] Unlink doctor functionality:
  - Cleans both documents
  - Shows confirmation dialog
  - Updates UI immediately
- [ ] Shows doctor's chambers at this clinic
- [ ] Shows doctor's schedule
- [ ] Error handling for invalid doctor code

**Test Flow:**
1. Search for existing doctor code
2. Link doctor
3. Check Firestore → Both documents updated
4. Unlink doctor
5. Check Firestore → Both documents cleaned
6. Try linking same doctor again → Should work
7. Try invalid doctor code → Should show error

### 4.5 Clinic Profile (`ClinicProfileManager.tsx`)
**Check:**
- [ ] Load current clinic data
- [ ] Edit clinic name
- [ ] Edit address
- [ ] Edit phone number
- [ ] Upload logo image
- [ ] Save changes to Firestore
- [ ] Form validation works
- [ ] Error handling
- [ ] Image upload size limit
- [ ] Image format validation (jpg, png)

**Test Flow:**
1. Load profile → Should show current data
2. Edit name → Type new name
3. Upload logo → Should upload to storage
4. Save → Should update Firestore
5. Refresh page → Should show updated data

### 4.6 QR Manager (`ClinicQRManager.tsx`)
**Check:**
- [ ] Displays current QR code
- [ ] QR code is scannable
- [ ] Download QR as image
- [ ] Print QR code
- [ ] Regenerate QR (if needed)
- [ ] QR links to correct clinic booking URL
- [ ] Shows QR share options

**Test Flow:**
1. Open QR Manager
2. QR should display
3. Download QR → Should save image
4. Scan QR with phone → Should open clinic booking page
5. Print → Should open print dialog

### 4.7 Schedule Manager (`ClinicScheduleManager.tsx`)
**Check:**
- [ ] Shows linked doctors dropdown
- [ ] Select doctor → Load their chambers
- [ ] Create schedule for doctor at this clinic
- [ ] Sets clinicId correctly in chamber
- [ ] Frequency options work (Weekly, Bi-Weekly, Monthly, Custom)
- [ ] Day selection works
- [ ] Time selection works
- [ ] Max capacity setting works
- [ ] Edit existing schedule
- [ ] Delete schedule
- [ ] Conflict detection works (from previous fix)
- [ ] Updates doctor's chambers array
- [ ] Success/error messages

**Test Flow:**
1. Select a linked doctor
2. Create new schedule
3. Check doctor document → Should have new chamber with clinicId
4. Edit schedule → Should update
5. Try creating conflicting schedule → Should block
6. Delete schedule → Should remove from doctor

### 4.8 Today's Schedule (`ClinicTodaysSchedule.tsx`)
**Check:**
- [ ] Shows all chambers scheduled for today
- [ ] Filters by current clinic
- [ ] Shows doctor names correctly
- [ ] Shows chamber details (time, capacity)
- [ ] Shows booking count vs capacity
- [ ] Real-time updates when bookings change
- [ ] Expired chambers marked differently
- [ ] Click chamber → Show bookings list
- [ ] Mark patient as arrived
- [ ] View patient details

**Test Flow:**
1. Open Today's Schedule
2. Should show today's chambers only
3. Create a booking → Count should increase
4. Mark patient as arrived → Status should update
5. Past time chambers → Should show "Expired"

### 4.9 Clinic Booking Flow (`ClinicBookingFlow.tsx`)
**Full End-to-End Test:**

**Test Flow:**
1. Scan clinic QR code
2. Should load clinic data
3. Should show ONLY linked doctors
4. Search by specialty → Should filter
5. Search by name → Should filter
6. Click doctor → Should show profile
7. Profile should show chambers AT THIS CLINIC only
8. Select date → Should show available chambers at clinic
9. Select chamber → Should proceed
10. Fill patient details
11. Submit booking
12. Should create booking with:
    - doctorId
    - clinicId ← CHECK THIS
    - chamberI
    - Correct date/time
    - Token number
13. Confirmation page should show ALL details
14. Doctor's dashboard should show this booking
15. Clinic's today schedule should show this booking

---

## 🔧 TECHNICAL FIXES REQUIRED

### Fix 1: Doctor-Clinic Bidirectional Linking

**File:** `lib/firebase/db.service.ts`

**Add Function:**
```typescript
export const linkDoctorToClinic = async (
  doctorId: string, 
  clinicId: string, 
  chamberData?: any
) => {
  // 1. Get doctor document
  const doctorRef = doc(db, 'doctors', doctorId);
  const doctorSnap = await getDoc(doctorRef);
  
  if (!doctorSnap.exists()) {
    throw new Error('Doctor not found');
  }
  
  const doctorData = doctorSnap.data();
  
  // 2. Get clinic document
  const clinicRef = doc(db, 'clinics', clinicId);
  const clinicSnap = await getDoc(clinicRef);
  
  if (!clinicSnap.exists()) {
    throw new Error('Clinic not found');
  }
  
  const clinicData = clinicSnap.data();
  
  // 3. Update clinic's linkedDoctorsDetails
  const existingLinks = clinicData.linkedDoctorsDetails || [];
  
  // Check if already linked
  if (existingLinks.some(d => d.doctorId === doctorId)) {
    throw new Error('Doctor already linked to this clinic');
  }
  
  const newDoctorLink = {
    doctorId: doctorId,
    doctorCode: doctorData.doctorCode,
    name: doctorData.name,
    email: doctorData.email,
    specialties: doctorData.specialties || [],
    profileImage: doctorData.profileImage || '',
    linkedAt: serverTimestamp()
  };
  
  await updateDoc(clinicRef, {
    linkedDoctorsDetails: [...existingLinks, newDoctorLink],
    updatedAt: serverTimestamp()
  });
  
  // 4. If chamber data provided, add to doctor's chambers with clinicId
  if (chamberData) {
    const chambers = doctorData.chambers || [];
    const newChamber = {
      ...chamberData,
      clinicId: clinicId,
      clinicName: clinicData.name,
      clinicCode: clinicData.clinicCode,
      status: 'active',
      createdAt: serverTimestamp()
    };
    
    await updateDoc(doctorRef, {
      chambers: [...chambers, newChamber],
      updatedAt: serverTimestamp()
    });
  }
  
  return { success: true };
};
```

### Fix 2: Clinic Booking with Clinic Context

**File:** `components/ClinicBookingFlow.tsx`

**Update Booking Creation:**
```typescript
const createBooking = async (patientData: any) => {
  // ... existing validation ...
  
  const bookingData = {
    // Existing fields
    doctorId: selectedDoctor.id,
    patientId: patientData.id,
    chamberId: selectedChamber.id,
    date: selectedDate,
    time: selectedChamber.startTime,
    tokenNumber: nextToken,
    
    // ADD CLINIC CONTEXT
    clinicId: clinic.id,
    clinicName: clinic.name,
    clinicQRCode: clinicQRCode || clinic.qrNumber,
    bookingSource: 'clinic-qr',
    
    // Other fields
    status: 'confirmed',
    createdAt: serverTimestamp(),
    patientName: patientData.name,
    patientPhone: patientData.phone
  };
  
  // Save to bookings collection
  await addDoc(collection(db, 'bookings'), bookingData);
  
  // Increment clinic's totalScans
  await updateDoc(doc(db, 'clinics', clinic.id), {
    totalScans: increment(1),
    lastScanAt: serverTimestamp()
  });
};
```

### Fix 3: Remove Placeholder Reviews

**File:** `components/ClinicBookingFlow.tsx`

**Lines to Remove/Update:**
```typescript
// REMOVE THIS
placeholderReviews?: any[];

// REPLACE WITH
realReviews?: any[];  // Load from reviews collection

// OR simply remove if reviews not implemented yet
```

### Fix 4: Filter Chambers by Clinic

**File:** `components/SelectChamber.tsx`

**Add Filter:**
```typescript
const getAvailableChambers = () => {
  if (!doctor.chambers) return [];
  
  // FILTER by clinicId
  const clinicChambers = doctor.chambers.filter(chamber => 
    chamber.clinicId === currentClinicId &&
    chamber.status === 'active'
  );
  
  return clinicChambers;
};
```

---

## 📊 DATABASE SCHEMA UPDATES

### Clinic Document
```javascript
Collection: clinics/{clinicId}
{
  // Existing fields
  name: string
  email: string
  address: string
  pinCode: string
  phone: string
  qrNumber: string (unique)
  clinicCode: string (unique)
  logoUrl: string
  
  // Linking fields
  linkedDoctorCodes: string[]  // Keep for backward compatibility
  linkedDoctorsDetails: [
    {
      doctorId: string  // ← Use this as primary reference
      doctorCode: string
      name: string
      email: string
      specialties: string[]
      profileImage: string
      linkedAt: timestamp
    }
  ]
  
  // Analytics
  totalScans: number
  totalBookings: number
  lastScanAt: timestamp
  
  // Timestamps
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Doctor Document (Updated)
```javascript
Collection: doctors/{doctorId}
{
  // Existing fields
  name: string
  email: string
  specialties: string[]
  degrees: string[]
  profileImage: string
  doctorCode: string (unique)
  
  // Chambers array
  chambers: [
    {
      id: string
      days: string[]
      frequency: string
      chamberName: string
      chamberAddress: string
      startTime: string
      endTime: string
      maxCapacity: number
      
      // CLINIC LINKING - ADD THESE
      clinicId?: string  // ← If chamber is at a clinic
      clinicName?: string
      clinicCode?: string
      
      status: 'active' | 'inactive'
      createdAt: timestamp
    }
  ]
  
  // Other fields
  bio: string
  experience: string
  phone: string
  
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Booking Document (Updated)
```javascript
Collection: bookings/{bookingId}
{
  // Patient info
  patientId: string
  patientName: string
  patientPhone: string
  patientAge: number
  patientGender: string
  
  // Doctor & Chamber
  doctorId: string
  doctorName: string
  chamberId: string
  
  // Clinic Context - ADD THESE
  clinicId?: string  // ← If booked via clinic
  clinicName?: string
  clinicQRCode?: string  // The QR scanned
  bookingSource: 'direct' | 'clinic-qr' | 'walkin'
  
  // Booking details
  date: string (YYYY-MM-DD)
  time: string (HH:MM)
  tokenNumber: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  
  // Timestamps
  createdAt: timestamp
  arrivalTime?: timestamp
  completedAt?: timestamp
  cancelledAt?: timestamp
}
```

---

## 🧪 TESTING CHECKLIST

### Manual Testing

#### Test Case 1: Doctor-Clinic Linking
- [ ] Clinic links doctor via doctor code
- [ ] Check clinic document → Doctor added to linkedDoctorsDetails
- [ ] Check doctor document → No changes (linking one-way for now)
- [ ] Clinic unlinks doctor
- [ ] Check clinic document → Doctor removed
- [ ] Try linking same doctor again → Should work

#### Test Case 2: Clinic Booking Full Flow
- [ ] Create test clinic account
- [ ] Link 2-3 doctors to clinic
- [ ] Create chambers for doctors at this clinic (via ClinicScheduleManager)
- [ ] Scan clinic QR code (or visit booking URL)
- [ ] Should see ONLY linked doctors
- [ ] Select doctor and date
- [ ] Should see ONLY chambers at this clinic
- [ ] Create booking
- [ ] Check booking document → Has clinicId
- [ ] Check clinic analytics → Booking count increased
- [ ] Check doctor dashboard → Booking appears
- [ ] Check clinic today's schedule → Booking appears

#### Test Case 3: Multi-Clinic Doctor
- [ ] Create Doctor A with chambers at 2 different clinics
- [ ] From Clinic 1 QR → Should see only Clinic 1 chambers
- [ ] From Clinic 2 QR → Should see only Clinic 2 chambers
- [ ] Book at Clinic 1 → Booking has clinicId for Clinic 1
- [ ] Book at Clinic 2 → Booking has clinicId for Clinic 2

#### Test Case 4: Error Scenarios
- [ ] Invalid QR code → Show error page
- [ ] Clinic with no linked doctors → Show "No doctors available"
- [ ] Doctor with no chambers at this clinic → Show "Not available here"
- [ ] Try to link non-existent doctor → Show error
- [ ] Try to link already linked doctor → Show error message

---

## 🚀 IMPLEMENTATION PLAN

### Phase 1: Doctor-Clinic Linking (Day 1-2)
**Priority:** HIGH  
**Files to Modify:**
1. `lib/firebase/db.service.ts`
   - Add linkDoctorToClinic function
   - Add unlinkDoctorFromClinic function
   - Add validation functions

2. `components/ManageDoctors.tsx`
   - Update link/unlink handlers
   - Add confirmation dialogs
   - Improve error handling
   - Add search by name

3. `components/ClinicScheduleManager.tsx`
   - Ensure clinicId is set when creating chamber
   - Validate doctor is linked before creating chamber

**Testing:** Test all linking scenarios

### Phase 2: Clinic Booking Flow (Day 3-4)
**Priority:** HIGH  
**Files to Modify:**
1. `components/ClinicBookingFlow.tsx`
   - Filter doctors by linked status
   - Filter chambers by clinicId
   - Add clinicId to booking creation
   - Remove placeholder data
   - Improve error handling

2. `components/SelectChamber.tsx`
   - Add clinic filter
   - Show only this clinic's chambers

3. `components/BookingConfirmation.tsx`
   - Show clinic details in confirmation

**Testing:** Full end-to-end booking flow

### Phase 3: Remove Demo Data (Day 5)
**Priority:** MEDIUM  
**Files to Clean:**
1. `components/ClinicDashboard.tsx` - Remove any demo data
2. `components/ClinicBookingFlow.tsx` - Remove placeholderReviews
3. `components/ManageDoctors.tsx` - Remove sample data
4. All other clinic components - Search and remove demo/placeholder data

**Testing:** Verify no hardcoded data remains

### Phase 4: Full Functionality Check (Day 6-7)
**Priority:** MEDIUM  
**Test All Pages:**
1. Sign Up - Complete flow
2. Login - Complete flow
3. Dashboard - All widgets and analytics
4. Manage Doctors - Link/unlink
5. Profile Manager - Edit and save
6. QR Manager - Display and download
7. Schedule Manager - Create/edit/delete
8. Today's Schedule - Display and filters
9. Booking Flow - End-to-end

**Testing:** Use testing checklist above

### Phase 5: Bug Fixes & Polish (Day 8)
**Priority:** LOW  
- Fix any bugs found in Phase 4
- Improve error messages
- Add loading states
- Improve UI/UX
- Add success animations

**Testing:** Regression testing

---

## 📁 FILES TO MODIFY

### High Priority (Core Functionality)
1. ✅ `lib/firebase/db.service.ts` - Add linking functions
2. ✅ `components/ManageDoctors.tsx` - Update linking logic
3. ✅ `components/ClinicScheduleManager.tsx` - Add clinicId to chambers
4. ✅ `components/ClinicBookingFlow.tsx` - Filter & add clinic context
5. ✅ `components/SelectChamber.tsx` - Filter by clinic

### Medium Priority (Data Cleanup)
6. ⚠️ `components/ClinicDashboard.tsx` - Remove demo data
7. ⚠️ `components/ClinicProfileManager.tsx` - Verify real data
8. ⚠️ `components/ClinicTodaysSchedule.tsx` - Verify filters

### Low Priority (UI/UX)
9. 📝 `components/ClinicSignUp.tsx` - Improve validation
10. 📝 `components/ClinicLogin.tsx` - Better error handling
11. 📝 `components/ClinicQRManager.tsx` - Add features

---

## ⚠️ KNOWN ISSUES TO FIX

### Issue 1: ClinicBookingFlow.tsx Line 44, 170
```typescript
// REMOVE THESE
placeholderReviews?: any[];
placeholderReviews: fullDoctorData.placeholderReviews,
```

### Issue 2: Chambers Not Filtered by Clinic
**Location:** SelectChamber.tsx, ClinicBookingFlow.tsx  
**Fix:** Add filter for `chamber.clinicId === currentClinicId`

### Issue 3: Booking Missing Clinic Context
**Location:** All booking creation points  
**Fix:** Add clinicId, clinicName, clinicQRCode to booking document

### Issue 4: Multi-Clinic Doctor Confusion
**Location:** Doctor profile displays  
**Fix:** In clinic context, show ONLY chambers at current clinic

### Issue 5: Analytics May Show Wrong Numbers
**Location:** ClinicDashboard.tsx  
**Fix:** Ensure bookings filtered by clinicId when counting

---

## 📈 SUCCESS METRICS

After implementation, verify:
- [ ] Clinic can link/unlink doctors without errors
- [ ] Booking flow shows ONLY linked doctors
- [ ] Booking flow shows ONLY chambers at current clinic
- [ ] All bookings have clinicId when booked via clinic
- [ ] Analytics show correct numbers
- [ ] No demo/placeholder data visible
- [ ] All 9 pages function correctly
- [ ] No console errors
- [ ] Mobile responsive works
- [ ] QR scan to booking works end-to-end

---

## 🎯 COMPLETION CRITERIA

**Definition of Done:**
1. ✅ Doctor-clinic linking works bidirectionally
2. ✅ Clinic booking flow filters correctly
3. ✅ Bookings include clinic context
4. ✅ Zero placeholder/demo data
5. ✅ All 9 pages tested and working
6. ✅ No breaking bugs
7. ✅ Code committed to git
8. ✅ Deployed to production

---

## 🚀 READY TO START?

**Timeline:** 8 days  
**Start Date:** Tomorrow (February 9, 2026)  
**Expected Completion:** February 16, 2026

**Next Steps:**
1. Review this plan
2. Approve priorities
3. Start Phase 1 tomorrow morning
4. Daily progress updates

---

**Created:** February 8, 2026  
**Status:** Awaiting Approval to Start 🎯
