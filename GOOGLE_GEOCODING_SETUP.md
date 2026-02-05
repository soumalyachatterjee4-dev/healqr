# Google Geocoding API Setup

## Current Status
✅ **API Key**: Using existing Firebase API key (`AIzaSyB1AVXeao1bqTah8cD1bGAiAQMbZ5nw0WI`)  
❌ **Geocoding API**: NOT YET ENABLED in Google Cloud Console

## Setup Instructions

### 1. Enable Geocoding API in Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com?project=teamhealqr

2. Click **"ENABLE"** button

### 2. Configure API Key Restrictions

1. Go to: https://console.cloud.google.com/apis/credentials?project=teamhealqr

2. Find API key: `AIzaSyB1AVXeao1bqTah8cD1bGAiAQMbZ5nw0WI`

3. Click **Edit** (pencil icon)

4. Under **"API restrictions"**, ensure these APIs are enabled:
   - ✅ Firebase Cloud Messaging API
   - ✅ Firebase Installations API  
   - ✅ Cloud Firestore API
   - ✅ **Geocoding API** ← ADD THIS

5. Under **"Application restrictions"** → **"HTTP referrers"**, ensure these are added:
   - `teamhealqr.web.app/*`
   - `*.teamhealqr.web.app/*`
   - `localhost/*`
   - `127.0.0.1/*`

6. Click **"SAVE"**

### 3. Wait for Propagation
⏱️ Changes may take **5-10 minutes** to propagate globally

---

## Feature Details

### Patient Search Page
**Route**: `/?page=patient-search`

**Features**:
- 📍 **Location Search** (Area → Pincode conversion using Geocoding API)
  - Example: "ent dr near moulali" → extracts pincode "700008"
  - Lock/Unlock mechanism to change location
- 👨‍⚕️ **Doctor Name Search** (optional)
- 🩺 **Specialty Filter** (optional)
- 🔍 **Smart Firestore Query** combining all filters

**How Geocoding Works**:
```javascript
// User types: "moulali" or "ent dr near moulali"
// API converts to coordinates → extracts postal_code component
// Result: pinCode = "700008"
// Searches Firestore: where('pinCode', '==', '700008')
```

---

## Testing After Setup

1. **Deploy changes**:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

2. **Test Geocoding**:
   - Visit: `https://teamhealqr.web.app/?page=patient-search`
   - Type area name: "moulali" or "ballygunge kolkata"
   - Click 🔓 (unlock icon) → Should convert to pincode
   - Should see pincode locked: "moulali (700008)"

3. **Check Console**:
   - ✅ No errors about "REQUEST_DENIED" or "API_KEY_INVALID"
   - ✅ Should see results: `{status: "OK", results: [...]}`

---

## Troubleshooting

### Error: "REQUEST_DENIED"
**Cause**: Geocoding API not enabled  
**Fix**: Go to step 1 above and enable the API

### Error: "API_KEY_INVALID"  
**Cause**: API key restrictions too strict  
**Fix**: Add current domain to HTTP referrers (step 2.5)

### Error: "ZERO_RESULTS"
**Cause**: Invalid location name  
**Solution**: User should try more specific location like "moulali kolkata" instead of just "moulali"

---

## Cost Estimate

**Google Geocoding API Pricing**:
- First 40,000 requests/month: **FREE** (included in $200 Google Cloud credit)
- After that: $5 per 1,000 requests

**Expected Usage**:
- ~100 searches/day = ~3,000/month
- **Cost**: $0 (well within free tier)

---

## Alternative: Free Nominatim API (No API Key)

If you want to avoid Google Cloud setup entirely, you can use OpenStreetMap's free Nominatim API:

```javascript
// Replace Geocoding API call with:
const response = await fetch(
  `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(areaInput)}, India&format=json&addressdetails=1`,
  {
    headers: {
      'User-Agent': 'HealQR-Patient-Search'
    }
  }
);
const data = await response.json();
const pincode = data[0]?.address?.postcode;
```

**Pros**: No API key needed, completely free  
**Cons**: Rate limited (1 req/sec), less accurate for India

---

## Next Steps

1. ✅ **Immediate**: Enable Geocoding API in Google Cloud Console (5 mins)
2. ✅ **Then**: Deploy updated code  
3. ✅ **Test**: Try searching "moulali" → should get "700008"
4. ⏭️ **Future**: Add autocomplete suggestions for popular areas
