/**
 * Platform Health Monitor — Scheduled function checking HealQR vitals
 *
 * Runs every 15 minutes. Checks:
 * - Booking creation rate
 * - Notification delivery health
 * - Active doctor count
 * - Anomaly detection (sudden drops)
 *
 * Stores results in platform_health collection.
 * Creates admin_alerts on critical issues.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Scheduled health check — runs every 15 minutes
 */
exports.monitorPlatformHealth = onSchedule('every 15 minutes', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const issues = [];
    let status = 'healthy';

    try {
      // 1. Count bookings in last hour
      let bookingsLastHour = 0;
      try {
        const bookingsSnap = await db
          .collection('bookings')
          .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(oneHourAgo))
          .count()
          .get();
        bookingsLastHour = bookingsSnap.data().count;
      } catch (e) {
        console.warn('Could not count bookings:', e.message);
      }

      // 2. Count notifications sent in last hour
      let notificationsSentLastHour = 0;
      try {
        const notifsSnap = await db
          .collection('notifications')
          .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(oneHourAgo))
          .count()
          .get();
        notificationsSentLastHour = notifsSnap.data().count;
      } catch (e) {
        console.warn('Could not count notifications:', e.message);
      }

      // 3. Count active doctors today (doctors with bookings today)
      let activeDoctorsToday = 0;
      try {
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const todayBookings = await db
          .collection('bookings')
          .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
          .select('doctorId')
          .limit(500)
          .get();

        const uniqueDoctors = new Set();
        todayBookings.docs.forEach(doc => {
          const doctorId = doc.data().doctorId;
          if (doctorId) uniqueDoctors.add(doctorId);
        });
        activeDoctorsToday = uniqueDoctors.size;
      } catch (e) {
        console.warn('Could not count active doctors:', e.message);
      }

      // 4. Check for stuck scheduled notifications
      let stuckNotifications = 0;
      try {
        const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
        const stuckSnap = await db
          .collection('scheduledNotifications')
          .where('status', '==', 'pending')
          .where('scheduledTime', '<=', admin.firestore.Timestamp.fromDate(thirtyMinAgo))
          .count()
          .get();
        stuckNotifications = stuckSnap.data().count;

        if (stuckNotifications > 5) {
          issues.push(`${stuckNotifications} stuck scheduled notifications (older than 30 min)`);
          status = 'warning';
        }
      } catch (e) {
        console.warn('Could not check stuck notifications:', e.message);
      }

      // 5. Compare with previous period for anomaly detection
      try {
        const prevHealthSnap = await db
          .collection('platform_health')
          .orderBy('timestamp', 'desc')
          .limit(4) // Last hour (4 x 15min checks)
          .get();

        if (!prevHealthSnap.empty) {
          const prevBookings = prevHealthSnap.docs.map(d => d.data().bookingsLastHour || 0);
          const avgPrev = prevBookings.reduce((a, b) => a + b, 0) / prevBookings.length;

          // If we had bookings before but zero now, flag it
          if (avgPrev > 5 && bookingsLastHour === 0) {
            issues.push('Booking rate dropped to zero (previously averaging ' + Math.round(avgPrev) + '/hr)');
            status = 'warning';
          }
        }
      } catch (e) {
        console.warn('Anomaly detection failed:', e.message);
      }

      // 6. Check assistant conversations for high error rate
      try {
        const recentConvs = await db
          .collection('assistant_conversations')
          .where('lastActivity', '>=', admin.firestore.Timestamp.fromDate(oneHourAgo))
          .count()
          .get();

        // Just log for now — useful metric
        console.log(`Assistant conversations in last hour: ${recentConvs.data().count}`);
      } catch (e) {
        // Not critical
      }

      if (issues.length > 0 && status !== 'healthy') {
        status = issues.some(i => i.includes('dropped to zero')) ? 'critical' : 'warning';
      }

      // Store health report
      await db.collection('platform_health').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        bookingsLastHour,
        notificationsSentLastHour,
        activeDoctorsToday,
        stuckNotifications,
        status,
        issues,
      });

      // Create admin alert on critical issues
      if (status === 'critical') {
        await db.collection('admin_alerts').add({
          type: 'platform_health',
          severity: 'critical',
          message: 'Platform health critical: ' + issues.join('; '),
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          resolved: false,
        });
        console.error('CRITICAL HEALTH ALERT:', issues);
      }

      // Cleanup old health reports (keep last 24 hours = 96 reports)
      try {
        const oldReports = await db
          .collection('platform_health')
          .where('timestamp', '<', admin.firestore.Timestamp.fromDate(oneDayAgo))
          .limit(50)
          .get();

        if (!oldReports.empty) {
          const cleanupBatch = db.batch();
          oldReports.docs.forEach(doc => cleanupBatch.delete(doc.ref));
          await cleanupBatch.commit();
        }
      } catch (e) {
        console.warn('Health cleanup failed:', e.message);
      }

      console.log(`Health check complete: ${status} | Bookings/hr: ${bookingsLastHour} | Notifs/hr: ${notificationsSentLastHour} | Doctors: ${activeDoctorsToday} | Issues: ${issues.length}`);

    } catch (error) {
      console.error('Health monitor failed:', error);
    }

    return null;
  });
