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

exports.sendAIRXNotification = functions.https.onCall(async (data, context) => {
  try {
    const { patientId, patientName, doctorName, notificationId, fcmToken } = data;

    // Validate required fields
    if (!patientId || !patientName || !doctorName || !notificationId || !fcmToken) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    console.log('📤 Sending AI RX notification to patient:', patientId);

    // Fetch notification data from Firestore
    const notificationRef = admin.firestore().collection('notifications').doc(notificationId);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Notification not found');
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

    return {
      success: true,
      messageId: response,
      message: 'AI RX notification sent successfully'
    };

  } catch (error) {
    console.error('❌ Error sending AI RX notification:', error);

    // Handle specific FCM errors
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      console.error('🚫 Invalid or expired FCM token');
      throw new functions.https.HttpsError('failed-precondition', 'Invalid FCM token');
    }

    throw new functions.https.HttpsError('internal', error.message);
  }
});
