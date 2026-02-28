const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Check Video Call Expiry
 * Runs every 5 minutes to check for video consultations that have exceeded the 30-minute waiting window.
 */
exports.checkVideoCallExpiry = onSchedule('every 5 minutes', async (event) => {
  try {
    const db = admin.firestore();
    const now = new Date();
    // 30 minutes in milliseconds
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // We need to look at bookings where type is 'video', status is 'confirmed', and appointmentTime < thirtyMinutesAgo
    // Wait, appointmentTime is stored as a string or timestamp. Usually in HealQR it's a string, e.g., "HH:mm AM" and an appointmentDate string.
    // However, some places store "appointmentTime" as a Firestore Timestamp or full ISO string. Let's fetch all confirmed video bookings for today and check manually to avoid complex queries on potentially string fields.

    // Get today's date in local format (assuming IST/Local the clinic uses, but ISO date string is safer)
    // Actually, getting all 'confirmed' 'video' bookings that are not expired is better.

    const bookingsSnapshot = await db.collection('bookings')
      .where('status', '==', 'confirmed')
      .where('consultationType', '==', 'video')
      .get();

    if (bookingsSnapshot.empty) {
      console.log('No active video consultations to check.');
      return null;
    }

    const promises = [];

    bookingsSnapshot.forEach((doc) => {
      const data = doc.data();
      let appointmentDateObj;

      // Ensure appointmentTime is valid and parse it.
      if (data.appointmentTime && data.appointmentTime.toDate) {
         // Firestore timestamp
         appointmentDateObj = data.appointmentTime.toDate();
      } else if (data.appointmentTime && typeof data.appointmentTime === 'string') {
         // ISO String
         appointmentDateObj = new Date(data.appointmentTime);
      } else {
         // Missing or invalid format, skip or handle differently
         return;
      }

      // Check if the appointment is 30+ minutes in the past
      if (appointmentDateObj && appointmentDateObj < thirtyMinutesAgo) {
        // It has expired. Now check who joined.
        const doctorJoined = data.doctorJoined === true;
        const patientJoined = data.patientJoined === true;

        let doctorMessage = '';
        let patientMessage = '';

        if (!doctorJoined && !patientJoined) {
          doctorMessage = 'Patient didn\'t join up to 30 mins, system blocked the link';
          patientMessage = 'Due to some unavoidable circumstances doctor could not join on time, please reschedule your appointment, sorry for the inconvenience';
        } else if (!doctorJoined) {
          doctorMessage = 'Contact patient personally as he/she was waiting in link';
          patientMessage = 'Due to some unavoidable circumstances doctor could not join on time, please reschedule your appointment, sorry for the inconvenience';
        } else if (!patientJoined) {
          doctorMessage = 'Patient didn\'t join up to 30 mins, system blocked the link';
          patientMessage = 'You failed to join within 30 minutes. Please reschedule your appointment.';
        } else {
            // Both joined?? If both joined, it should probably be marked completed by the doctor in UI.
            // If the doctor forgot to click end call, we can auto-expire it, but let's not send angry messages.
            doctorMessage = 'Video consultation link expired.';
            patientMessage = 'Video consultation link has expired.';
        }

        // Send FCM to Doctor
        if (data.doctorId) {
            promises.push(
                db.collection('scheduledNotifications').add({
                    userId: data.doctorId, // Assuming doctor tokens are keyed by doctorId
                    title: 'Video Consultation Expired',
                    body: doctorMessage,
                    data: { type: 'video_call_expired', bookingId: doc.id },
                    sendAt: admin.firestore.Timestamp.now(),
                    status: 'pending',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    retryCount: 0
                })
            );
        }

        // Send FCM to Patient
        if (data.patientPhone) {
            // patientId is usually patient_ + last 10 digits
            const phoneDigits = data.patientPhone.replace(/\D/g, '');
            const phone10 = phoneDigits.replace(/^91/, '').slice(-10);
            const patientUserId = `patient_${phone10}`;

            promises.push(
                db.collection('scheduledNotifications').add({
                    userId: patientUserId,
                    title: 'Video Consultation Expired',
                    body: patientMessage,
                    data: { type: 'video_call_expired', bookingId: doc.id },
                    sendAt: admin.firestore.Timestamp.now(),
                    status: 'pending',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    retryCount: 0
                })
            );
        }

        // Update the booking status to 'expired'
        promises.push(
            doc.ref.update({
                status: 'expired',
                expiredReason: '30_min_timeout',
                expiredAt: admin.firestore.FieldValue.serverTimestamp()
            })
        );
      }
    });

    if (promises.length > 0) {
      await Promise.all(promises);
      console.log(`Processed timeout for ${promises.length / 3} video consultations.`);
    }

    return null;

  } catch (error) {
    console.error('Error in checkVideoCallExpiry:', error);
    return null;
  }
});
