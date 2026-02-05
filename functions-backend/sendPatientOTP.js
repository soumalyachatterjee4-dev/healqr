const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Cloud Function to send OTP to patient via FCM notification
 * Triggered when a new document is created in patientOtpRequests collection
 */
exports.sendPatientOTP = functions.firestore
  .document('patientOtpRequests/{requestId}')
  .onCreate(async (snap, context) => {
    try {
      const otpData = snap.data();
      const { phoneNumber, otp, status } = otpData;

      // Skip if already processed
      if (status !== 'pending') {
        console.log('OTP request already processed:', context.params.requestId);
        return null;
      }

      // Find patient's FCM token from their health card
      const healthCardsRef = admin.firestore().collection('patientHealthCards');
      const healthCardQuery = await healthCardsRef
        .where('phone', '==', phoneNumber)
        .limit(1)
        .get();

      if (healthCardQuery.empty) {
        console.log('No health card found for phone:', phoneNumber);
        await snap.ref.update({
          status: 'failed',
          failureReason: 'No patient health card found',
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return null;
      }

      const healthCard = healthCardQuery.docs[0].data();
      const fcmToken = healthCard.fcmToken;

      if (!fcmToken) {
        console.log('No FCM token found for patient:', phoneNumber);
        await snap.ref.update({
          status: 'failed',
          failureReason: 'No FCM token found',
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return null;
      }

      // Prepare FCM notification message
      const message = {
        notification: {
          title: '🔐 Your HealQR Login OTP',
          body: `Your one-time password is: ${otp}\n\nValid for 5 minutes. Do not share with anyone.`
        },
        data: {
          type: 'otp_login',
          otp: otp,
          phoneNumber: phoneNumber,
          expiresIn: '5 minutes',
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        token: fcmToken,
        android: {
          priority: 'high',
          notification: {
            channelId: 'otp_notifications',
            priority: 'high',
            sound: 'default',
            defaultSound: true,
            defaultVibrateTimings: true,
            visibility: 'public'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: '🔐 Your HealQR Login OTP',
                body: `Your one-time password is: ${otp}\n\nValid for 5 minutes.`
              },
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      // Send FCM notification
      const response = await admin.messaging().send(message);
      console.log('OTP notification sent successfully:', response);

      // Update OTP request status
      await snap.ref.update({
        status: 'sent',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        fcmMessageId: response,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, messageId: response };
    } catch (error) {
      console.error('Error sending OTP notification:', error);

      // Update OTP request with error status
      await snap.ref.update({
        status: 'failed',
        failureReason: error.message,
        errorDetails: error.toString(),
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: false, error: error.message };
    }
  });
