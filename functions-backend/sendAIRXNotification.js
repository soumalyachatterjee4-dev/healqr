/**
 * sendAIRXNotification Cloud Function
 * Sends FCM push notification when doctor uploads AI-decoded prescription
 * 
 * Trigger: HTTPS callable
 * Purpose: Send prescription notification to patient's device
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

exports.sendAIRXNotification = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { patientId, patientName, doctorName, notificationId, fcmToken } = req.body;

    // Validate required fields
    if (!patientId || !patientName || !doctorName || !notificationId || !fcmToken) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['patientId', 'patientName', 'doctorName', 'notificationId', 'fcmToken']
      });
    }

    console.log('📤 Sending AI RX notification to patient:', patientId);

    // Fetch notification data from Firestore
    const notificationRef = admin.firestore().collection('notifications').doc(notificationId);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const notificationData = notificationDoc.data();

    // Prepare FCM message
    const message = {
      token: fcmToken,
      notification: {
        title: `🩺 New Prescription from Dr. ${doctorName}`,
        body: `Your prescription has been decoded and is ready to view. Tap to download.`,
      },
      data: {
        type: 'ai_rx_prescription',
        notificationId: notificationId,
        doctorName: doctorName,
        patientName: patientName,
        timestamp: Date.now().toString(),
        clickAction: 'OPEN_AI_RX_REPORT',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'prescriptions',
          icon: 'ic_prescription',
          color: '#10b981',
          sound: 'default',
          tag: `ai_rx_${notificationId}`,
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            category: 'AI_RX_PRESCRIPTION',
          }
        }
      },
      webpush: {
        notification: {
          icon: '/healqr-logo.png',
          badge: '/badge-icon.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          actions: [
            {
              action: 'view',
              title: 'View Prescription'
            },
            {
              action: 'close',
              title: 'Close'
            }
          ]
        },
        fcmOptions: {
          link: `/patient/rx/${notificationId}`
        }
      }
    };

    // Send FCM notification
    const response = await admin.messaging().send(message);
    console.log('✅ FCM notification sent successfully. Message ID:', response);

    // Update notification status in Firestore
    await notificationRef.update({
      status: 'sent',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      fcmMessageId: response,
    });

    return res.status(200).json({
      success: true,
      messageId: response,
      message: 'AI RX notification sent successfully'
    });

  } catch (error) {
    console.error('❌ Error sending AI RX notification:', error);
    
    // Handle specific FCM errors
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      console.error('🚫 Invalid or expired FCM token');
      return res.status(400).json({ 
        error: 'Invalid FCM token',
        code: error.code 
      });
    }

    return res.status(500).json({ 
      error: 'Failed to send notification',
      details: error.message 
    });
  }
});
