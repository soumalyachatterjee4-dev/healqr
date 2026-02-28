const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Scheduled function that runs every minute to process pending notifications.
 * It checks the `scheduledNotifications` collection for any documents where
 * `sendAt` is in the past and `status` is 'pending'.
 */
exports.processScheduledNotifications = onSchedule('* * * * *', async (event) => {
  try {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    // Find all pending notifications that should have been sent by now
    const snapshot = await db.collection('scheduledNotifications')
      .where('status', '==', 'pending')
      .where('sendAt', '<=', now)
      .limit(50) // Process in chunks to avoid timeout
      .get();

    if (snapshot.empty) {
      console.log('No pending scheduled notifications to process.');
      return null;
    }

    console.log(`Processing ${snapshot.size} scheduled notifications...`);

    const batch = db.batch();
    const promises = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const { userId, title, body, data: customData } = data;

      // 1. Fetch user FCM token
      const tokenPromise = db.collection('fcmTokens').doc(userId).get()
        .then(async (tokenDoc) => {
          if (!tokenDoc.exists || !tokenDoc.data().token) {
            console.log(`No FCM token for user ${userId}, marking failed.`);
            batch.update(doc.ref, {
              status: 'failed',
              error: 'No FCM token found',
              processedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return;
          }

          const token = tokenDoc.data().token;

          const message = {
            notification: {
              title,
              body
            },
            data: customData || {},
            token: token
          };

          // 2. Send via FCM
          try {
            await admin.messaging().send(message);
            console.log(`Successfully sent scheduled notification to ${userId}`);

            // Mark as sent
            batch.update(doc.ref, {
              status: 'sent',
              processedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Write to local notifications history box
            const historyRef = db.collection('patientNotifications').doc();
            batch.set(historyRef, {
              userId,
              title,
              message: body,
              type: customData?.type || 'system',
              isRead: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              actionUrl: customData?.actionUrl || null
            });

          } catch (error) {
            console.error(`Error sending message to ${userId}`, error);

            // Increment retry count or mark failed
            const retryCount = (data.retryCount || 0) + 1;
            const status = retryCount >= 3 ? 'failed' : 'pending';

            batch.update(doc.ref, {
              status,
              retryCount,
              error: error.message,
              lastAttempted: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        });

      promises.push(tokenPromise);
    });

    await Promise.all(promises);
    await batch.commit();

    console.log(`Finished processing ${snapshot.size} notifications.`);
    return null;

  } catch (error) {
    console.error('Error in processScheduledNotifications:', error);
    return null;
  }
});
