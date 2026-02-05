# Patient Search Page - Status & Setup

## ✅ COMPLETED

### 1. Search Page is Live
**URL**: `https://teamhealqr.web.app/?page=patient-search`

**Features**:
- 📍 **Location/Pincode Input** with geocoding API
- 👨‍⚕️ **Doctor Name Search** (optional)
- 🩺 **Specialty Filter** (optional) - 40+ medical specialties
- 🔒 **Lock/Unlock Area** - Lock pincode after geocoding
- 🔍 **Smart Search** - Firestore query combining all filters
- ⭐ **Doctor Cards** - Photo, ratings, specialties, degrees
- 📱 **Mobile Responsive** - Dark theme UI

### 2. Geocoding API Integration
**Status**: ✅ Code Updated (uses Firebase API key)

**API Key**: `AIzaSyB1AVXeao1bqTah8cD1bGAiAQMbZ5nw0WI`

---

## ⚠️ PENDING - REQUIRED ACTION

### Enable Google Geocoding API in Google Cloud Console

**You MUST do this for the pincode field to work:**

1. **Go to**: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com?project=teamhealqr

2. **Click**: "ENABLE" button

3. **Wait**: 5-10 minutes for API to activate

---

## 🎯 How It Works

### User Flow:
```
1. User types area name: "moulali" or "ent dr near moulali"
2. Clicks 🔓 icon (unlock button)
3. Geocoding API converts → "700008" pincode
4. Pincode gets locked with 🔒 icon
5. User can optionally add doctor name/specialty
6. Clicks "Search Doctors" → Firestore query
7. Results show matching doctors
```

### Technical Flow:
```javascript
// Geocoding API Call
fetch('https://maps.googleapis.com/maps/api/geocode/json?address=moulali, India&key=...')
  ↓
// Extract postal_code from address_components
postalCode = "700008"
  ↓
// Lock the area input
setIsAreaLocked(true)
  ↓
// Firestore Query
where('pinCode', '==', '700008')
  ↓
// Filter by specialty (client-side)
doctors.filter(doc => doc.specialities.includes(specialty))
  ↓
// Filter by name (client-side)
doctors.filter(doc => doc.name.includes(doctorName))
```

---

## 🧪 Testing Steps

### Before API Enable (Current State):
1. Visit: `https://teamhealqr.web.app/?page=patient-search`
2. Type area: "moulali"
3. Click 🔓 icon
4. **Result**: Error in console (REQUEST_DENIED)

### After API Enable (Expected):
1. Visit: `https://teamhealqr.web.app/?page=patient-search`
2. Type area: "moulali" or "ballygunge kolkata"
3. Click 🔓 icon
4. **Result**: Shows "moulali (700008)" with 🔒 lock icon
5. Click "Search Doctors"
6. **Result**: Shows doctors with pinCode = "700008"

---

## 📊 Sample Search Scenarios

### Scenario 1: Find Cardiologist in Moulali
```
1. Type area: "moulali"
2. Click unlock → pincode "700008" locked
3. Select specialty: "Cardiology"
4. Click "Search Doctors"
→ Shows: Dr. SOUMALYA CHATTERJEE (Cardiologist, 711110)
```

### Scenario 2: Search Dr. Sharma by Name
```
1. Leave area empty
2. Type doctor name: "sharma"
3. Click "Search Doctors"
→ Shows: All doctors with "sharma" in name
```

### Scenario 3: All Doctors in Area
```
1. Type area: "salt lake kolkata"
2. Click unlock → pincode "700091" locked
3. Leave specialty and name empty
4. Click "Search Doctors"
→ Shows: All doctors in pincode 700091
```

---

## 🔧 API Configuration Details

### Current Settings:
```javascript
// PatientSearch.tsx (Line 46)
const apiKey = 'AIzaSyB1AVXeao1bqTah8cD1bGAiAQMbZ5nw0WI';
const apiUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
```

### Required Google Cloud APIs:
- ✅ Firebase Cloud Messaging API (already enabled)
- ✅ Firebase Installations API (already enabled)
- ✅ Cloud Firestore API (already enabled)
- ❌ **Geocoding API** (NEEDS TO BE ENABLED)

### API Restrictions:
**HTTP Referrers** (already configured):
- `teamhealqr.web.app/*`
- `*.teamhealqr.web.app/*`
- `localhost/*`
- `127.0.0.1/*`

---

## 💰 Cost Analysis

**Google Geocoding API Pricing**:
- **Free Tier**: 40,000 requests/month (included in $200 credit)
- **Paid**: $5 per 1,000 requests after free tier

**Estimated Usage**:
- 100 searches/day × 30 days = **3,000 requests/month**
- **Monthly Cost**: **$0** (well within free tier)

---

## 🚨 Troubleshooting

### Error: "REQUEST_DENIED"
**Cause**: Geocoding API not enabled  
**Fix**: Enable API at https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com?project=teamhealqr

### Error: "Could not find pincode for this area"
**Cause**: Area name too generic or not in India  
**Fix**: User should try more specific location:
- ❌ "moulali" → ✅ "moulali kolkata"
- ❌ "salt lake" → ✅ "salt lake sector 1 kolkata"

### Error: "No doctors found"
**Cause**: No doctors registered in that pincode  
**Fix**: Either:
- Try nearby area
- Remove specialty filter
- Search by doctor name only

---

## 📱 Access Points

### From Landing Page:
1. Click "Find a Doctor" button on homepage
2. Routes to: `/?page=patient-search`

### From Patient Dashboard:
1. Login as patient
2. Click "Find a Doctor" in sidebar
3. Routes to embedded search page

### Direct Link:
`https://teamhealqr.web.app/?page=patient-search`

---

## ✅ Deployment Status

**Build**: ✅ Successful (19.61s)  
**Deploy**: ✅ Complete  
**Live URL**: https://teamhealqr.web.app  
**Search Page**: https://teamhealqr.web.app/?page=patient-search

---

## 📝 Next Steps

### Immediate (Required):
1. ⚠️ **Enable Geocoding API** in Google Cloud Console (5 mins)
2. ✅ Test search page after 10 minutes
3. ✅ Verify pincode conversion works

### Future Enhancements:
- Add autocomplete for popular areas
- Cache pincode results in localStorage
- Add "Current Location" GPS button
- Show map view of doctor locations
- Add distance calculation from user location

---

## 📞 Support

**Issue**: Geocoding API still not working after enabling?  
**Check**:
1. Wait 10-15 minutes for propagation
2. Hard refresh browser (Ctrl+Shift+R)
3. Check browser console for error message
4. Verify API key restrictions allow current domain

**Contact**: Check Firebase Console logs at:  
https://console.firebase.google.com/project/teamhealqr/overview
