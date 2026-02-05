const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Schedule FCM Notification
 * Callable function to schedule a future notification
 * 
 * Input: 
 * - userId: string (required)
 * - title: string (required)
 * - body: string (required)
 * - sendAt: string (required, ISO date)
 * - data: object (optional)
 */
exports.scheduleFCMNotification = onCall(async (request) => {
  const data = request.data;
  try {
    const { userId, title, body, sendAt, data: customData } = data;

    // Validate input
    if (!userId || !title || !sendAt) {
      console.error('❌ Missing required parameters:', { userId, title, sendAt });
      throw new HttpsError(
        'invalid-argument', 
        'Missing required parameters: userId, title, and sendAt are required.'
      );
    }

    const db = admin.firestore();
    
    // Verify user has a token first (optional, but good for cleanup)
    const tokenDoc = await db.collection('fcmTokens').doc(userId).get();
    if (!tokenDoc.exists) {
        return { success: false, error: 'Patient not registered for notifications' };
    }

    // Parse date
    const scheduledDate = new Date(sendAt);
    if (isNaN(scheduledDate.getTime())) {
        throw new HttpsError('invalid-argument', 'Invalid date format for sendAt');
    }

    // Create scheduled document
    await db.collection('scheduledNotifications').add({
      userId,
      title,
      body: body || '',
      data: customData || {},
      sendAt: admin.firestore.Timestamp.fromDate(scheduledDate),
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      retryCount: 0
    });

    console.log(`✅ Notification scheduled for ${userId} at ${sendAt}`);

    return { success: true, scheduledTime: sendAt };

  } catch (error) {
    console.error('❌ Error scheduling notification:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Error scheduling notification', error);
  }
});
