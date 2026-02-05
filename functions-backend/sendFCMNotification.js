const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const functions = require('firebase-functions'); // Keep for legacy types if needed, but mostly unused now

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Send FCM Notification
 * Callable function to send push notifications to users
 * 
 * Input: 
 * - userId: string (required) - Document ID in fcmTokens collection
 * - title: string (required)
 * - body: string (required)
 * - data: object (optional) - Custom data payload
 */
exports.sendFCMNotification = onCall(async (request) => {
  const data = request.data;
  try {
    const { userId, title, body, data: customData } = data;

    // Validate input
    if (!userId || !title) {
      console.error('❌ Missing required parameters:', { userId, title });
      throw new HttpsError(
        'invalid-argument', 
        'Missing required parameters: userId and title are required.'
      );
    }

    // Get FCM token
    const db = admin.firestore();
    const tokenDoc = await db.collection('fcmTokens').doc(userId).get();

    if (!tokenDoc.exists) {
      console.warn(`⚠️ No FCM token found for user: ${userId}`);
      // Return success: false instead of throwing error to prevent 400/500 on client
      return { 
        success: false, 
        error: 'Patient not registered for notifications (No token found)' 
      };
    }

    const { token } = tokenDoc.data();
    if (!token) {
      console.warn(`⚠️ Empty token for user: ${userId}`);
      return { 
        success: false, 
        error: 'Token is empty' 
      };
    }

    // Construct message
    const message = {
      token: token,
      notification: {
        title: title,
        body: body || ''
      },
      data: customData || {}
    };

    // Ensure all data values are strings (FCM requirement)
    if (message.data) {
      Object.keys(message.data).forEach(key => {
        if (typeof message.data[key] !== 'string') {
          message.data[key] = String(message.data[key]);
        }
      });
    }

    // Send message
    const response = await admin.messaging().send(message);
    console.log(`✅ Notification sent to ${userId}:`, response);

    return { success: true, messageId: response };

  } catch (error) {
    console.error('❌ Error sending notification:', error);
    
    // Handle invalid token error specifically
    if (error.code === 'messaging/registration-token-not-registered') {
        // Remove invalid token
        try {
            await admin.firestore().collection('fcmTokens').doc(data.userId).delete();
            console.log(`🗑️ Deleted invalid token for ${data.userId}`);
        } catch (e) {
            console.error('Failed to delete invalid token', e);
        }
        return { success: false, error: 'Token invalid or expired' };
    }

    // Pass through HttpsError, wrap others
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', 'Error sending notification', error);
  }
});
