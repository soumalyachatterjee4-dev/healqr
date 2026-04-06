/**
 * Daily Health Report — Scheduled Cloud Function
 *
 * Runs daily at 10:00 AM IST (04:30 UTC).
 * Aggregates last 24 hours of platform_health data.
 * Sends formatted email report to configured admin email.
 * Reads config from admin_config/dailyReport Firestore doc.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

exports.sendDailyHealthReport = onSchedule(
  { schedule: 'every day 04:30', timeZone: 'Asia/Kolkata' },
  async () => {
    try {
      // 1. Check if daily reports are enabled
      const configDoc = await db.doc('admin_config/dailyReport').get();
      if (!configDoc.exists || !configDoc.data().enabled) {
        console.log('Daily report is disabled. Skipping.');
        return null;
      }

      const config = configDoc.data();
      const recipientEmail = config.email;

      if (!recipientEmail) {
        console.warn('No recipient email configured for daily report.');
        return null;
      }

      // 2. Aggregate last 24 hours of health data
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const healthSnap = await db
        .collection('platform_health')
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(oneDayAgo))
        .orderBy('timestamp', 'desc')
        .get();

      const reports = healthSnap.docs.map(d => d.data());

      // Calculate aggregates
      const totalChecks = reports.length;
      const healthyChecks = reports.filter(r => r.status === 'healthy').length;
      const warningChecks = reports.filter(r => r.status === 'warning').length;
      const criticalChecks = reports.filter(r => r.status === 'critical').length;

      const totalBookings = reports.reduce((sum, r) => sum + (r.bookingsLastHour || 0), 0);
      const avgBookingsPerHour = totalChecks > 0 ? (totalBookings / totalChecks).toFixed(1) : '0';
      const peakBookings = Math.max(...reports.map(r => r.bookingsLastHour || 0), 0);

      const totalNotifications = reports.reduce((sum, r) => sum + (r.notificationsSentLastHour || 0), 0);
      const avgNotifsPerHour = totalChecks > 0 ? (totalNotifications / totalChecks).toFixed(1) : '0';

      const latestReport = reports[0] || {};
      const activeDoctorsToday = latestReport.activeDoctorsToday || 0;

      const allIssues = reports.flatMap(r => r.issues || []);
      const uniqueIssues = [...new Set(allIssues)];

      // 3. Check active alerts
      const alertsSnap = await db
        .collection('admin_alerts')
        .where('resolved', '==', false)
        .get();
      const unresolvedAlerts = alertsSnap.size;

      // 4. Determine overall status
      let overallStatus = 'HEALTHY';
      let statusColor = '#10b981';
      if (criticalChecks > 0) {
        overallStatus = 'CRITICAL';
        statusColor = '#ef4444';
      } else if (warningChecks > 0) {
        overallStatus = 'WARNING';
        statusColor = '#eab308';
      }

      // 5. Build email HTML
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #18181b; color: #e4e4e7; padding: 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #27272a; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 24px; text-align: center;">
      <h1 style="margin: 0; color: #fff; font-size: 22px;">🏥 HealQR Daily Health Report</h1>
      <p style="margin: 8px 0 0; color: #c4b5fd; font-size: 14px;">${dateStr}</p>
    </div>

    <!-- Status Banner -->
    <div style="padding: 16px 24px; background: ${statusColor}22; border-bottom: 2px solid ${statusColor}44;">
      <div style="font-size: 18px; font-weight: bold; color: ${statusColor};">
        Platform Status: ${overallStatus}
      </div>
      <div style="font-size: 13px; color: #a1a1aa; margin-top: 4px;">
        ${totalChecks} health checks in last 24h • ${healthyChecks} healthy • ${warningChecks} warnings • ${criticalChecks} critical
      </div>
    </div>

    <!-- Metrics Grid -->
    <div style="padding: 24px;">
      <h3 style="margin: 0 0 16px; color: #e4e4e7; font-size: 16px;">📊 Key Metrics</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 12px; background: #3f3f46; border-radius: 8px 8px 0 0; color: #a1a1aa; font-size: 13px;">Avg Bookings / Hour</td>
          <td style="padding: 10px 12px; background: #3f3f46; border-radius: 8px 8px 0 0; text-align: right; color: #60a5fa; font-weight: bold;">${avgBookingsPerHour}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; background: #3f3f4688; color: #a1a1aa; font-size: 13px;">Peak Bookings / Hour</td>
          <td style="padding: 10px 12px; background: #3f3f4688; text-align: right; color: #34d399; font-weight: bold;">${peakBookings}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; background: #3f3f46; color: #a1a1aa; font-size: 13px;">Active Doctors Today</td>
          <td style="padding: 10px 12px; background: #3f3f46; text-align: right; color: #34d399; font-weight: bold;">${activeDoctorsToday}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; background: #3f3f4688; color: #a1a1aa; font-size: 13px;">Avg Notifications / Hour</td>
          <td style="padding: 10px 12px; background: #3f3f4688; text-align: right; color: #a78bfa; font-weight: bold;">${avgNotifsPerHour}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; background: #3f3f46; border-radius: 0 0 8px 8px; color: #a1a1aa; font-size: 13px;">Unresolved Alerts</td>
          <td style="padding: 10px 12px; background: #3f3f46; border-radius: 0 0 8px 8px; text-align: right; color: ${unresolvedAlerts > 0 ? '#f87171' : '#34d399'}; font-weight: bold;">${unresolvedAlerts}</td>
        </tr>
      </table>
    </div>

    ${uniqueIssues.length > 0 ? `
    <!-- Issues -->
    <div style="padding: 0 24px 24px;">
      <h3 style="margin: 0 0 12px; color: #fbbf24; font-size: 16px;">⚠️ Issues Detected (${uniqueIssues.length})</h3>
      <div style="background: #3f3f46; border-radius: 8px; padding: 12px;">
        ${uniqueIssues.map(issue => `<div style="padding: 6px 0; color: #fbbf24; font-size: 13px;">• ${issue}</div>`).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div style="padding: 16px 24px; background: #1f1f23; text-align: center; border-top: 1px solid #3f3f46;">
      <p style="margin: 0; color: #71717a; font-size: 12px;">
        HealQR AI PM • Automated Report • <a href="https://healqr.com" style="color: #7c3aed;">healqr.com</a>
      </p>
      <p style="margin: 4px 0 0; color: #52525b; font-size: 11px;">
        To disable these reports, update settings in Admin Panel → AI PM Dashboard → Daily Reports
      </p>
    </div>
  </div>
</body>
</html>`;

      // 6. Send email via SMTP (using Gmail or configured SMTP)
      // Note: For production, set these via Firebase Functions config:
      //   firebase functions:config:set smtp.email="your@gmail.com" smtp.password="app-password"
      const smtpConfig = await db.doc('admin_config/smtp').get();

      if (!smtpConfig.exists || !smtpConfig.data().email) {
        // Fallback: Store report in Firestore for dashboard display
        await db.collection('daily_health_reports').add({
          date: dateStr,
          status: overallStatus,
          metrics: {
            totalChecks,
            healthyChecks,
            warningChecks,
            criticalChecks,
            avgBookingsPerHour: parseFloat(avgBookingsPerHour),
            peakBookings,
            activeDoctorsToday,
            avgNotifsPerHour: parseFloat(avgNotifsPerHour),
            unresolvedAlerts,
          },
          issues: uniqueIssues,
          recipientEmail,
          emailSent: false,
          generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('Daily report generated and stored (no SMTP configured for email delivery).');
        return null;
      }

      // Send via SMTP
      const smtp = smtpConfig.data();
      const transporter = nodemailer.createTransport({
        service: smtp.service || 'gmail',
        auth: { user: smtp.email, pass: smtp.password },
      });

      await transporter.sendMail({
        from: `"HealQR AI PM" <${smtp.email}>`,
        to: recipientEmail,
        subject: `[HealQR] Daily Health Report — ${overallStatus} — ${dateStr}`,
        html: emailHtml,
      });

      // Store report record
      await db.collection('daily_health_reports').add({
        date: dateStr,
        status: overallStatus,
        metrics: {
          totalChecks,
          healthyChecks,
          warningChecks,
          criticalChecks,
          avgBookingsPerHour: parseFloat(avgBookingsPerHour),
          peakBookings,
          activeDoctorsToday,
          avgNotifsPerHour: parseFloat(avgNotifsPerHour),
          unresolvedAlerts,
        },
        issues: uniqueIssues,
        recipientEmail,
        emailSent: true,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Daily health report sent to ${recipientEmail} — Status: ${overallStatus}`);

    } catch (error) {
      console.error('Failed to send daily health report:', error);
    }

    return null;
  }
);
