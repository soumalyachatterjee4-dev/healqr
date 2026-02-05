# AI RX Notification Cloud Function

## Overview
This Cloud Function sends FCM push notifications when a doctor uploads an AI-decoded prescription for a patient.

## Flow
1. Doctor completes consultation and views patient details
2. Doctor uploads prescription image
3. AI decodes handwriting using OCR
4. Doctor reviews decoded text
5. Doctor clicks "Send to Patient"
6. Frontend saves notification to Firestore
7. Frontend calls `sendAIRXNotification` Cloud Function
8. Function sends FCM push notification to patient's device
9. Patient receives notification with prescription report

## Deployment

### Prerequisites
- Firebase CLI installed: `npm install -g firebase-tools`
- Logged in to Firebase: `firebase login`

### Deploy this function

1. **Copy to functions folder:**
   ```bash
   # From src directory
   cp functions-backend/sendAIRXNotification.js ../functions/lib/
   ```

2. **Update functions/lib/index.js:**
   Add this line:
   ```javascript
   exports.sendAIRXNotification = require('./sendAIRXNotification').sendAIRXNotification;
   ```

3. **Deploy:**
   ```bash
   cd ..  # Go to project root
   firebase deploy --only functions:sendAIRXNotification
   ```

### Test the function

```bash
# Test with curl
curl -X POST https://us-central1-teamhealqr.cloudfunctions.net/sendAIRXNotification \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "test123",
    "patientName": "Test Patient",
    "doctorName": "Dr. Smith",
    "notificationId": "notif123",
    "fcmToken": "patient-fcm-token-here"
  }'
```

## Function Details

### Endpoint
`https://us-central1-teamhealqr.cloudfunctions.net/sendAIRXNotification`

### Method
POST

### Request Body
```json
{
  "patientId": "string",
  "patientName": "string",
  "doctorName": "string",
  "notificationId": "string",
  "fcmToken": "string"
}
```

### Response
```json
{
  "success": true,
  "messageId": "fcm-message-id",
  "message": "AI RX notification sent successfully"
}
```

## Notification Payload

The patient receives:
- **Title**: "🩺 New Prescription from Dr. [Name]"
- **Body**: "Your prescription has been decoded and is ready to view. Tap to download."
- **Data**: notificationId, doctorName, timestamp
- **Action**: Opens prescription report in app

## Testing Flow

1. **Enable FCM on patient device:**
   ```javascript
   // In patient dashboard
   await requestNotificationPermission(userId, 'patient');
   ```

2. **Doctor uploads RX:**
   - Go to patient details
   - Click eye icon (view)
   - Click "Upload RX with AI Analysis"
   - Select prescription image
   - AI will decode
   - Review and click "Send to Patient"

3. **Patient receives notification:**
   - Check notification on device
   - Click to view prescription report
   - Download is one-time only

## Security

- CORS enabled for web app origin
- Validates all required fields
- Checks Firestore for notification data
- Handles invalid/expired FCM tokens gracefully

## Error Codes

- `400`: Missing required fields or invalid FCM token
- `404`: Notification not found in Firestore
- `405`: Method not allowed (only POST accepted)
- `500`: Internal server error

## Logs

View logs in Firebase Console:
```
https://console.firebase.google.com/project/teamhealqr/functions/logs
```

Or via CLI:
```bash
firebase functions:log --only sendAIRXNotification
```
