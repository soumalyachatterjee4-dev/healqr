import { getFunctions, httpsCallable } from 'firebase/functions';
import { Timestamp } from 'firebase/firestore';
import { app } from '../lib/firebase/config';
import { saveNotificationHistory } from './notificationHistoryService';
import { storeNotification as storePatientNotification } from './patientNotificationStorage';
import { translateNotification } from './googleTranslateService';

const functions = getFunctions(app!);

// Ensure patient target format is consistent
const normalizePatientTarget = (phoneOrId: string) => {
  // Strip non-digits conditionally so "patient_..." is handled properly
  const digits = (phoneOrId || '').replace(/\D/g, '');
  const trimmed = digits.replace(/^91/, '');
  const phone10 = trimmed.slice(-10);
  return {
    userId: `patient_${phone10}`,
    phone10
  };
};

const sendFCM = async (payload: { userId: string; title: string; body: string; data?: Record<string, any> }) => {
  try {
    // Auto-translate notification if patient language is not English
    const lang = payload.data?.language;
    if (lang && lang !== 'english') {
      try {
        const translated = await translateNotification(payload.title, payload.body, lang);
        payload = { ...payload, title: translated.title, body: translated.body };
      } catch (e) { /* fallback to English */ }
    }


    const sendFCMNotification = httpsCallable(functions, 'sendFCMNotification');
    const result = await sendFCMNotification(payload);
    const res: any = result.data;

    if (res?.success === false) {
      console.warn('âš ï¸ FCM send failed (patient may not have registered for notifications):', res.error);
      console.warn('ðŸ’¡ To fix: Patient needs to enable notifications after booking. Check BookingConfirmation component.');
      console.warn('ðŸ“‹ Patient ID:', payload.userId);
      return { success: false, error: res.error };
    } else {
      return res;
    }
  } catch (error) {
    console.warn('âš ï¸ FCM notification failed (non-critical):', error);
    console.warn('ðŸ’¡ Patient likely has not registered for notifications. They should see a prompt after booking.');
    return { success: false, error: 'Patient not registered for notifications' };
  }
};

const scheduleFCM = async (payload: { userId: string; title: string; body: string; data?: Record<string, any>; sendAt: Date }) => {
  try {
    // Auto-translate scheduled notification
    const lang = payload.data?.language;
    if (lang && lang !== 'english') {
      try {
        const translated = await translateNotification(payload.title, payload.body, lang);
        payload = { ...payload, title: translated.title, body: translated.body };
      } catch (e) { /* fallback to English */ }
    }

    const schedule = httpsCallable(functions, 'scheduleFCMNotification');
    const result = await schedule({ ...payload, sendAt: payload.sendAt.toISOString() });
    const res: any = result.data;
    if (res?.success === false) {
      console.warn('âš ï¸ Schedule failed (patient may not have registered for notifications):', res.error);
      return { success: false, error: res.error };
    }
    return res;
  } catch (error) {
    console.warn('âš ï¸ FCM schedule failed (non-critical):', error);
    return { success: false, error: 'Patient not registered for notifications' };
  }
};

export const scheduleConsultationConfirmation = async (data: any) => {
  const { userId, phone10 } = normalizePatientTarget(data.patientPhone);
  const now = new Date();
  const scheduledAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now

  const params = new URLSearchParams({
    page: 'consultation-completed',
    bookingId: data.bookingId || '',
    patientName: data.patientName || '',
    doctorName: data.doctorName || '',
    consultationDate: data.consultationDate || '',
    consultationTime: data.consultationTime || '',
    chamber: data.chamber || '',
    language: data.language || 'english'
  });

  const lang = data.language || 'english';
  const { title: tTitle, body: tBody } = await translateNotification(
    'Visit Verified',
    `Your visit with ${data.doctorName} has been verified. Thank you!`,
    lang
  );

  // Schedule FCM notification
  const fcmResult = await scheduleFCM({
    userId,
    sendAt: scheduledAt,
    title: `âœ… ${tTitle}`,
    body: tBody,
    data: {
      type: 'consultation_completed',
      language: data.language || 'english',
      patientName: data.patientName,
      doctorName: data.doctorName,
      consultationDate: data.consultationDate,
      consultationTime: data.consultationTime,
      phone: phone10,
      url: `https://healqr-27726.web.app/?${params.toString()}`,
    },
  });

  // Save to notification history
  await saveNotificationHistory({
    patientPhone: phone10,
    patientName: data.patientName || 'Patient',
    age: data.age !== undefined && data.age !== '' ? String(data.age) : undefined,
    sex: data.sex || undefined,
    purpose: data.purpose || undefined,
    doctorName: data.doctorName || 'Doctor',
    clinicName: data.clinicName,
    chamber: data.chamber,
    notificationType: 'booking_confirmed',
    bookingStatus: 'confirmed',
    notificationStatus: 'pending', // Scheduled
    timestamp: new Date(),
    consultationDate: data.consultationDate || '',
    consultationTime: data.consultationTime || '',
    bookingId: data.bookingId,
    doctorId: data.doctorId,
    isWalkIn: true,
    walkInVerified: true
  });

  return fcmResult;
};

export const sendConsultationCompleted = async (data: any) => {
  const { userId, phone10 } = normalizePatientTarget(data.patientPhone);

  const params = new URLSearchParams({
    page: 'consultation-completed',
    bookingId: data.bookingId || '',
    patientName: data.patientName || '',
    doctorName: data.doctorName || '',
    consultationDate: data.consultationDate || '',
    consultationTime: data.consultationTime || '',
    chamber: data.chamber || '',
    language: data.language || 'english'
  });

  const lang = data.language || 'english';
  const { title: tTitle, body: tBody } = await translateNotification(
    'Consultation Completed',
    `Your consultation with ${data.doctorName} is complete. Thank you for visiting!`,
    lang
  );

  const result = await sendFCM({
    userId,
    title: `âœ… ${tTitle}`,
    body: tBody,
    data: {
      type: 'consultation_completed',
      language: data.language || 'english',
      patientName: data.patientName,
      doctorName: data.doctorName,
      consultationDate: data.consultationDate,
      consultationTime: data.consultationTime,
      phone: phone10,
      url: data.rxUrl || data.dietUrl
        ? `https://teamhealqr.web.app/?page=consultation-completed&bookingId=${data.bookingId}&rxUrl=${encodeURIComponent(data.rxUrl || '')}&dietUrl=${encodeURIComponent(data.dietUrl || '')}&doctorName=${encodeURIComponent(data.doctorName)}&patientName=${encodeURIComponent(data.patientName)}&clinicName=${encodeURIComponent(data.clinicName || '')}&consultationDate=${encodeURIComponent(data.consultationDate || '')}&consultationTime=${encodeURIComponent(data.consultationTime || '')}`
        : `https://healqr-27726.web.app/?${params.toString()}`,
    },
  });

  // ðŸ’¾ ALWAYS STORE IN FIRESTORE (regardless of FCM success/failure)
  try {
    const storeNotification = storePatientNotification;
    await storeNotification({
      patientPhone: phone10,
      patientName: data.patientName || 'Patient',
      patientAge: data.age,
      patientGender: data.sex,
      type: 'consultation_completed',
      title: `âœ… ${tTitle}`,
      message: tBody,
      bookingId: data.bookingId || '',
      doctorId: data.doctorId,
      doctorName: data.doctorName || 'Doctor',
      doctorSpecialty: data.doctorSpecialty,
      doctorPhoto: data.doctorPhoto,
      chamberName: data.clinicName || data.chamber,
      chamberAddress: data.chamberAddress,
      appointmentDate: data.consultationDate,
      appointmentTime: data.consultationTime,
      serialNumber: data.serialNumber,
      purpose: data.purpose,
      fcmAttempted: true,
      fcmSuccess: result?.success !== false,
      fcmError: result?.error,
      metadata: {
        isWalkIn: data.isWalkIn,
        walkInVerified: data.walkInVerified,
        rxUrl: data.rxUrl,
        dietUrl: data.dietUrl,
      },
      // ðŸ†• Store download URLs with 72-hour expiry
      ...(data.rxUrl || data.dietUrl ? {
        downloadUrls: {
          ...(data.rxUrl ? { rxUrl: data.rxUrl } : {}),
          ...(data.dietUrl ? { dietUrl: data.dietUrl } : {}),
          createdAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(new Date(Date.now() + 72 * 60 * 60 * 1000)),
        }
      } : {}),
    });
  } catch (storageError) {
    console.error('âŒ Failed to store notification in Firestore:', storageError);
    // Don't throw - notification storage failure shouldn't break the flow
  }

  // Save to notification history
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 120); // 120 days retention

  await saveNotificationHistory({
    patientPhone: phone10,
    patientName: data.patientName || 'Patient',
    age: data.age !== undefined ? String(data.age) : undefined, // Ensure age is string or '0'
    sex: data.sex,
    purpose: data.purpose,
    doctorName: data.doctorName || 'Doctor',
    clinicName: data.clinicName,
    chamber: data.chamber,
    notificationType: 'consultation_completed',
    bookingStatus: 'completed',
    notificationStatus: result?.success === false ? 'failed' : 'sent',
    messageId: result?.messageId,
    timestamp: new Date(),
    consultationDate: data.consultationDate || '',
    consultationTime: data.consultationTime || '',
    serialNumber: data.serialNumber,
    bookingId: data.bookingId,
    doctorId: data.doctorId,
    isWalkIn: data.isWalkIn,
    walkInVerified: data.walkInVerified,
    nextSteps: [
      'Follow the prescribed medication',
      'Schedule recommended tests',
      'Book follow-up if advised'
    ],
    // ðŸ†• 120-DAY TEMPLATE STORAGE
    templateType: 'consultation_completed',
    templateData: {
      greeting: `Hello ${data.patientName || 'there'}, ðŸ‘‹`,
      mainMessage: `Thank you for visiting ${data.clinicName || 'our clinic'}. Your consultation has been successfully completed.`,
      consultationDetails: {
        date: data.consultationDate || '',
        time: data.consultationTime || '',
        chamber: data.chamber || ''
      },
      nextSteps: [
        'Follow the prescribed medication',
        'Schedule recommended tests',
        'Book follow-up if advised'
      ],
      adBanner: {
        placement: 'notif-consultation-completed'
      }
    },
    doctorSpecialty: data.doctorSpecialty,
    doctorInitials: data.doctorInitials,
    doctorPhoto: data.doctorPhoto,
    expiresAt: expiryDate,
    isExpired: false,
    readStatus: false,
    userActions: {
      opened: false
    }
  });

  return result;
};

// ============================================
// ðŸ“‹ UPDATED PRESCRIPTION NOTIFICATION
// Distinct from consultation_completed â€” tells patient to ignore previous RX
// ============================================
export const sendRxUpdatedNotification = async (data: any) => {
  const { userId, phone10 } = normalizePatientTarget(data.patientPhone);

  const deepLinkUrl = `https://teamhealqr.web.app/?page=rx-updated&rxUrl=${encodeURIComponent(data.rxUrl || '')}&doctorName=${encodeURIComponent(data.doctorName || '')}&patientName=${encodeURIComponent(data.patientName || '')}&clinicName=${encodeURIComponent(data.clinicName || '')}&consultationDate=${encodeURIComponent(data.consultationDate || '')}&consultationTime=${encodeURIComponent(data.consultationTime || '')}&language=${encodeURIComponent(data.language || 'english')}`;

  const result = await sendFCM({
    userId,
    title: 'âš ï¸ Updated Prescription â€” Please Check',
    body: `Dr. ${data.doctorName} has sent an UPDATED prescription. Ignore the previous one & download the latest version.`,
    data: {
      type: 'rx_updated',
      language: data.language || 'english',
      patientName: data.patientName,
      doctorName: data.doctorName,
      phone: phone10,
      url: deepLinkUrl,
    },
  });

  // ðŸ’¾ Store in Firestore for Patient Dashboard > Notifications
  try {
    const storeNotification = storePatientNotification;
    await storeNotification({
      patientPhone: phone10,
      patientName: data.patientName || 'Patient',
      patientAge: data.age,
      patientGender: data.sex,
      type: 'rx_updated',
      title: 'âš ï¸ Updated Prescription',
      message: `Dr. ${data.doctorName} has sent an UPDATED prescription. Please ignore the previous prescription and use this latest version.`,
      bookingId: data.bookingId || '',
      doctorId: data.doctorId,
      doctorName: data.doctorName || 'Doctor',
      doctorSpecialty: data.doctorSpecialty,
      doctorPhoto: data.doctorPhoto,
      chamberName: data.clinicName || data.chamber,
      chamberAddress: data.chamberAddress,
      appointmentDate: data.consultationDate,
      appointmentTime: data.consultationTime,
      fcmAttempted: true,
      fcmSuccess: result?.success !== false,
      fcmError: result?.error,
      metadata: {
        rxUrl: data.rxUrl,
        isUpdated: true,
      },
      // ðŸ†• Store download URL with 72-hour expiry
      ...(data.rxUrl ? {
        downloadUrls: {
          rxUrl: data.rxUrl,
          createdAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(new Date(Date.now() + 72 * 60 * 60 * 1000)),
        }
      } : {}),
    });
  } catch (storageError) {
    console.error('âŒ Failed to store RX Updated notification:', storageError);
  }

  // Save to notification history
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 120);

  await saveNotificationHistory({
    patientPhone: phone10,
    patientName: data.patientName || 'Patient',
    age: data.age !== undefined ? String(data.age) : undefined,
    sex: data.sex,
    purpose: data.purpose,
    doctorName: data.doctorName || 'Doctor',
    clinicName: data.clinicName,
    chamber: data.chamber,
    notificationType: 'rx_updated',
    bookingStatus: 'completed',
    notificationStatus: result?.success === false ? 'failed' : 'sent',
    messageId: result?.messageId,
    timestamp: new Date(),
    consultationDate: data.consultationDate || '',
    consultationTime: data.consultationTime || '',
    bookingId: data.bookingId,
    doctorId: data.doctorId,
    templateType: 'rx_updated',
    templateData: {
      greeting: `Important Update for ${data.patientName || 'Patient'}! ðŸ”„`,
      mainMessage: `Dr. ${data.doctorName} has sent an UPDATED prescription. Please ignore the previous prescription and download the latest version.`,
      warningMessage: 'âš ï¸ Please IGNORE the previous prescription notification',
      consultationDetails: {
        date: data.consultationDate || '',
        time: data.consultationTime || '',
        chamber: data.chamber || ''
      },
      adBanner: {
        placement: 'notif-rx-updated'
      }
    },
    doctorSpecialty: data.doctorSpecialty,
    doctorInitials: data.doctorInitials,
    doctorPhoto: data.doctorPhoto,
    expiresAt: expiryDate,
    isExpired: false,
    readStatus: false,
    userActions: {
      opened: false
    }
  });

  return result;
};

export const scheduleReviewRequest = async (data: any, seenAt: Date) => {
  const { userId, phone10 } = normalizePatientTarget(data.patientPhone);
  const scheduledAt = new Date(seenAt.getTime() + 24 * 60 * 60 * 1000);

  const result = await scheduleFCM({
    userId,
    sendAt: scheduledAt,
    title: 'â­ Share your experience',
    body: `How was your visit with ${data.doctorName}?`,
    data: {
      type: 'review_request',
      language: data.language || 'english',
      bookingId: data.bookingId,
      phone: phone10,
      // Deep link to review request template with language
      url: `https://healqr-27726.web.app/?page=review-request&patientName=${encodeURIComponent(data.patientName)}&doctorName=${encodeURIComponent(data.doctorName)}&date=${encodeURIComponent(data.consultationDate)}&language=${encodeURIComponent(data.language || 'english')}`,
    },
  });

  // Save to notification history with template data
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 120); // 120 days retention

  await saveNotificationHistory({
    patientPhone: phone10,
    patientName: data.patientName || 'Patient',
    age: data.age !== undefined ? String(data.age) : undefined,
    sex: data.sex,
    purpose: data.purpose,
    doctorName: data.doctorName || 'Doctor',
    clinicName: data.clinicName,
    chamber: data.chamber,
    notificationType: 'review_request',
    bookingStatus: 'completed',
    notificationStatus: result?.success === false ? 'failed' : 'pending',
    messageId: result?.messageId,
    timestamp: new Date(),
    consultationDate: data.consultationDate || '',
    consultationTime: data.consultationTime || '',
    bookingId: data.bookingId,
    doctorId: data.doctorId,
    // ðŸ†• 120-DAY TEMPLATE STORAGE
    templateType: 'review_request',
    templateData: {
      greeting: `Hello ${data.patientName || 'there'}, ðŸ‘‹`,
      mainMessage: `We hope you are feeling better after your visit with Dr. ${data.doctorName}.\n\nWould you mind sharing your experience?\nYour feedback helps us improve.`,
      adBanner: {
        placement: 'notif-review-request'
      }
    },
    doctorSpecialty: data.doctorSpecialty,
    doctorInitials: data.doctorInitials,
    doctorPhoto: data.doctorPhoto,
    expiresAt: expiryDate,
    isExpired: false,
    readStatus: false,
    userActions: {
      opened: false,
      reviewSubmitted: false
    }
  });

  return result;
};

export const sendFollowUp = async (data: any) => {
  const { userId, phone10 } = normalizePatientTarget(data.patientPhone);
  // Send 3 days (72 hours) before follow-up date (or immediately if within 3 days)
  const followUpDate = data.followUpDate ? new Date(data.followUpDate) : null;
  const sendAt = followUpDate
    ? new Date(followUpDate.getTime() - 3 * 24 * 60 * 60 * 1000)
    : new Date();
  const now = new Date();
  const finalSendAt = sendAt.getTime() < now.getTime() ? now : sendAt;

  // âš ï¸ CRITICAL: Follow-up is a PERMANENT COMMITMENT
  // This notification MUST be sent even if doctor's subscription expires
  // The cloud function should bypass subscription checks for follow-up notifications
  const result = await scheduleFCM({
    userId,
    sendAt: finalSendAt,
    title: 'ðŸ“… Follow-up Reminder',
    body: data.customMessage || 'Your doctor has scheduled a follow-up. Please check your appointment.',
    data: {
      type: 'follow_up',
      language: data.language || 'english',
      followUpDate: data.followUpDate || '',
      phone: phone10,
      isPermanentCommitment: 'true', // Flag to bypass subscription checks in cloud function
      doctorId: data.doctorId, // For subscription validation bypass
      // Deep link to follow-up template with language
      url: `https://healqr-27726.web.app/?page=follow-up&doctorId=${data.doctorId}&patientName=${encodeURIComponent(data.patientName)}&doctorName=${encodeURIComponent(data.doctorName)}&message=${encodeURIComponent(data.customMessage || '')}&date=${encodeURIComponent(data.followUpDate)}&language=${encodeURIComponent(data.language || 'english')}`,
    },
  });

  // Save to notification history
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 120); // 120 days retention

  await saveNotificationHistory({
    patientPhone: phone10,
    patientName: data.patientName || 'Patient',
    age: data.age !== undefined ? String(data.age) : undefined,
    sex: data.sex,
    purpose: data.purpose,
    doctorName: data.doctorName || 'Doctor',
    clinicName: data.clinicName,
    chamber: data.chamber,
    notificationType: 'follow_up',
    bookingStatus: 'confirmed',
    notificationStatus: result?.success === false ? 'failed' : 'pending', // Scheduled = pending
    messageId: result?.messageId,
    timestamp: new Date(),
    consultationDate: followUpDate ? followUpDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    consultationTime: followUpDate ? followUpDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
    bookingId: data.bookingId,
    message: data.customMessage,
    doctorId: data.doctorId,
    // ðŸ†• 120-DAY TEMPLATE STORAGE
    templateType: 'follow_up',
    templateData: {
      greeting: `Hello ${data.patientName || 'there'}, ðŸ‘‹`,
      mainMessage: data.customMessage || 'Your doctor has scheduled a follow-up. Please check your appointment.',
      followUpDays: data.followUpDays,
      adBanner: {
        placement: 'notif-follow-up'
      }
    },
    doctorSpecialty: data.doctorSpecialty,
    doctorInitials: data.doctorInitials,
    doctorPhoto: data.doctorPhoto,
    expiresAt: expiryDate,
    isExpired: false,
    readStatus: false,
    userActions: {
      opened: false
    }
  });
  // ðŸ’¾ ALWAYS STORE IN FIRESTORE (regardless of FCM success/failure)
  try {
    const storeNotification = storePatientNotification;
    const followUpParams = new URLSearchParams({
      page: 'follow-up',
      doctorId: data.doctorId || '',
      patientName: data.patientName || '',
      doctorName: data.doctorName || '',
      message: data.customMessage || '',
      date: data.followUpDate || '',
      language: data.language || 'english'
    });

    await storeNotification({
      patientPhone: phone10,
      patientName: data.patientName || 'Patient',
      patientAge: data.age,
      patientGender: data.sex,
      type: 'follow_up',
      title: 'ðŸ“… Follow-up Reminder',
      message: data.customMessage || 'Your doctor has scheduled a follow-up. Please check your appointment.',
      bookingId: data.bookingId || '',
      doctorId: data.doctorId,
      doctorName: data.doctorName || 'Doctor',
      doctorSpecialty: data.doctorSpecialty,
      doctorPhoto: data.doctorPhoto,
      chamberName: data.clinicName || data.chamber,
      chamberAddress: data.chamberAddress,
      appointmentDate: data.followUpDate,
      appointmentTime: '',
      serialNumber: '',
      purpose: data.purpose,
      fcmAttempted: true,
      fcmSuccess: result?.success !== false,
      fcmError: result?.error,
      fcmToken: result?.fcmToken,
      // Store full template URL for viewing
      metadata: {
        templateUrl: `https://healqr-27726.web.app/?${followUpParams.toString()}`,
        followUpMessage: data.customMessage,
        language: data.language || 'english'
      }
    });
  } catch (error) {
    console.error('âŒ Failed to store follow-up notification:', error);
  }
  return result;
};

export const sendAppointmentCancelled = async (data: any) => {
  const { userId, phone10 } = normalizePatientTarget(data.patientPhone);

  const params = new URLSearchParams({
    page: 'appointment-cancelled',
    bookingId: data.bookingId || '',
    patientName: data.patientName || '',
    doctorName: data.doctorName || '',
    date: data.appointmentDate || '',
    time: data.appointmentTime || '',
    chamber: data.chamber || '',
    language: data.language || 'english'
  });

  const result = await sendFCM({
    userId,
    title: 'âŒ Appointment Cancelled',
    body: data.message || 'Your appointment has been cancelled. Please contact the clinic for details.',
    data: {
      type: 'cancellation',
      language: data.language || 'english',
      scope: data.scope || 'patient',
      phone: phone10,
      url: `https://healqr-27726.web.app/?${params.toString()}`,
    },
  });

  // Save to notification history
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 120); // 120 days retention

  await saveNotificationHistory({
    patientPhone: phone10,
    patientName: data.patientName || 'Patient',
    age: data.age !== undefined ? String(data.age) : undefined,
    sex: data.sex,
    purpose: data.purpose,
    doctorName: data.doctorName || 'Doctor',
    clinicName: data.clinicName,
    chamber: data.chamber,
    notificationType: 'cancelled',
    bookingStatus: 'cancelled',
    notificationStatus: result?.success === false ? 'failed' : 'sent',
    messageId: result?.messageId,
    timestamp: new Date(),
    consultationDate: data.appointmentDate || '',
    consultationTime: data.appointmentTime || '',
    bookingId: data.bookingId,
    message: data.message,
    doctorId: data.doctorId,
    // ðŸ†• 120-DAY TEMPLATE STORAGE
    templateType: 'appointment_cancelled',
    templateData: {
      greeting: `Hello ${data.patientName || 'there'}, ðŸ‘‹`,
      mainMessage: data.message || 'Your appointment has been cancelled. Please contact the clinic for details.',
      cancellationReason: data.message || 'Cancelled by doctor',
      consultationDetails: {
        date: data.appointmentDate || '',
        time: data.appointmentTime || '',
        chamber: data.chamber || ''
      },
      actionButtons: [
        { type: 'reschedule', label: 'Reschedule', enabled: true }
      ]
    },
    doctorSpecialty: data.doctorSpecialty,
    doctorInitials: data.doctorInitials,
    doctorPhoto: data.doctorPhoto,
    expiresAt: expiryDate,
    isExpired: false,
    readStatus: false,
    userActions: {
      opened: false
    }
  });

  // ðŸ’¾ ALWAYS STORE IN FIRESTORE (regardless of FCM success/failure)
  try {
    const storeNotification = storePatientNotification;
    await storeNotification({
      patientPhone: phone10,
      patientName: data.patientName || 'Patient',
      patientAge: data.age,
      patientGender: data.sex,
      type: 'booking_cancelled',
      title: 'âŒ Appointment Cancelled',
      message: data.message || 'Your appointment has been cancelled. Please contact the clinic for details.',
      bookingId: data.bookingId || '',
      doctorId: data.doctorId,
      doctorName: data.doctorName || 'Doctor',
      doctorSpecialty: data.doctorSpecialty,
      doctorPhoto: data.doctorPhoto,
      chamberName: data.clinicName || data.chamber,
      chamberAddress: data.chamberAddress,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      serialNumber: data.tokenNumber,
      purpose: data.purpose,
      fcmAttempted: true,
      fcmSuccess: result?.success !== false,
      fcmError: result?.error,
      fcmToken: result?.fcmToken,
      // Store full template URL for viewing
      metadata: {
        templateUrl: `https://healqr-27726.web.app/?${params.toString()}`,
        cancellationReason: data.message,
        language: data.language || 'english'
      }
    });
  } catch (error) {
    console.error('âŒ Failed to store cancellation notification:', error);
    // Don't fail the whole operation if storage fails
  }

  return result;
};

export const sendChamberRescheduled = async (data: {
  patientPhone: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty?: string;
  chamberName: string;
  appointmentDate: string;
  originalTime: string;
  newTime: string;
  bookingId: string;
  language?: string;
}) => {
  const { userId, phone10 } = normalizePatientTarget(data.patientPhone);

  const params = new URLSearchParams({
    page: 'chamber-rescheduled',
    patientName: data.patientName || '',
    doctorName: data.doctorName || '',
    specialty: data.doctorSpecialty || '',
    chamber: data.chamberName || '',
    date: data.appointmentDate || '',
    originalTime: data.originalTime || '',
    newTime: data.newTime || '',
    language: data.language || 'english'
  });

  const result = await sendFCM({
    userId,
    title: `Schedule Changed - ${data.chamberName}`,
    body: `Today's timing changed to ${data.newTime}. (Was ${data.originalTime})`,
    data: {
      type: 'chamber_rescheduled',
      language: data.language || 'english',
      scope: 'patient',
      phone: phone10,
      url: `https://teamhealqr.web.app/?${params.toString()}`,
    },
  });

  // Save to notification history
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 120);

  await saveNotificationHistory({
    patientPhone: phone10,
    patientName: data.patientName || 'Patient',
    doctorName: data.doctorName || 'Doctor',
    clinicName: data.chamberName,
    chamber: data.chamberName,
    notificationType: 'rescheduled',
    bookingStatus: 'rescheduled',
    notificationStatus: result?.success === false ? 'failed' : 'sent',
    messageId: result?.messageId,
    timestamp: new Date(),
    consultationDate: data.appointmentDate || '',
    consultationTime: data.newTime || '',
    bookingId: data.bookingId,
    message: `Timing changed from ${data.originalTime} to ${data.newTime}`,
    doctorId: data.doctorId,
    templateType: 'chamber_rescheduled',
    templateData: {
      greeting: `Hello ${data.patientName || 'there'}, 👋`,
      mainMessage: `Your appointment timing has been changed from ${data.originalTime} to ${data.newTime}.`,
      consultationDetails: {
        date: data.appointmentDate || '',
        originalTime: data.originalTime || '',
        newTime: data.newTime || '',
        chamber: data.chamberName || ''
      },
    },
    doctorSpecialty: data.doctorSpecialty,
    expiresAt: expiryDate,
    isExpired: false,
    readStatus: false,
    userActions: { opened: false }
  });

  // Store in patient_notifications collection
  try {
    await storePatientNotification({
      patientPhone: phone10,
      patientName: data.patientName || 'Patient',
      type: 'chamber_rescheduled' as any,
      title: `🔄 Schedule Changed - ${data.chamberName}`,
      message: `Timing changed from ${data.originalTime} to ${data.newTime} for ${data.appointmentDate}`,
      bookingId: data.bookingId || '',
      doctorId: data.doctorId,
      doctorName: data.doctorName || 'Doctor',
      doctorSpecialty: data.doctorSpecialty,
      chamberName: data.chamberName,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.newTime,
      fcmAttempted: true,
      fcmSuccess: result?.success !== false,
      fcmError: result?.error,
      metadata: {
        templateUrl: `https://teamhealqr.web.app/?${params.toString()}`,
        originalTime: data.originalTime,
        newTime: data.newTime,
        language: data.language || 'english'
      }
    });
  } catch (error) {
    console.error('❌ Failed to store reschedule notification:', error);
  }

  return result;
};

export const sendAppointmentRestored = async (data: any) => {
  const { userId, phone10 } = normalizePatientTarget(data.patientPhone);

  const params = new URLSearchParams({
    page: 'appointment-restored',
    bookingId: data.bookingId || '',
    patientName: data.patientName || '',
    doctorName: data.doctorName || '',
    date: data.appointmentDate || '',
    time: data.appointmentTime || '',
    chamber: data.chamber || '',
    serialNo: data.tokenNumber || '',
    uniqueId: data.bookingId || '',
    language: data.language || 'english'
  });

  const result = await sendFCM({
    userId,
    title: 'âœ… Appointment Restored',
    body: data.message || 'Your appointment has been restored and confirmed again.',
    data: {
      type: 'restoration',
      language: data.language || 'english',
      scope: data.scope || 'patient',
      phone: phone10,
      url: `https://healqr-27726.web.app/?${params.toString()}`,
    },
  });

  // Save to notification history
  await saveNotificationHistory({
    patientPhone: phone10,
    patientName: data.patientName || 'Patient',
    age: data.age !== undefined ? String(data.age) : undefined,
    sex: data.sex,
    purpose: data.purpose,
    doctorName: data.doctorName || 'Doctor',
    clinicName: data.clinicName,
    chamber: data.chamber,
    notificationType: 'restored',
    bookingStatus: 'confirmed',
    notificationStatus: result?.success === false ? 'failed' : 'sent',
    messageId: result?.messageId,
    timestamp: new Date(),
    consultationDate: data.appointmentDate || '',
    consultationTime: data.appointmentTime || '',
    serialNumber: data.tokenNumber,
    bookingId: data.bookingId,
    message: data.message || 'Your appointment has been restored',
    doctorId: data.doctorId,
    // 🆕 120-DAY TEMPLATE STORAGE
    templateType: 'appointment_restored',
    templateData: {
      greeting: `Hello ${data.patientName || 'there'}, 👋`,
      mainMessage: data.message || 'Your appointment has been restored and confirmed again.',
      restorationReason: data.message || 'Restored by doctor',
      consultationDetails: {
        date: data.appointmentDate || '',
        time: data.appointmentTime || '',
        chamber: data.chamber || '',
        serialNo: data.tokenNumber || ''
      },
      actionButtons: [
        { type: 'view', label: 'View Appointment', enabled: true }
      ]
    },
    doctorSpecialty: data.doctorSpecialty,
    doctorInitials: data.doctorInitials,
    doctorPhoto: data.doctorPhoto,
    expiresAt: (() => { const d = new Date(); d.setDate(d.getDate() + 120); return d; })(),
    isExpired: false,
    readStatus: false,
    userActions: {
      opened: false
    }
  });

  // ðŸ’¾ ALWAYS STORE IN FIRESTORE (regardless of FCM success/failure)
  try {
    const storeNotification = storePatientNotification;
    await storeNotification({
      patientPhone: phone10,
      patientName: data.patientName || 'Patient',
      patientAge: data.age,
      patientGender: data.sex,
      type: 'booking_restored',
      title: 'âœ… Appointment Restored',
      message: data.message || 'Your appointment has been restored and confirmed again.',
      bookingId: data.bookingId || '',
      doctorId: data.doctorId,
      doctorName: data.doctorName || 'Doctor',
      doctorSpecialty: data.doctorSpecialty,
      doctorPhoto: data.doctorPhoto,
      chamberName: data.clinicName || data.chamber,
      chamberAddress: data.chamberAddress,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      serialNumber: data.tokenNumber,
      purpose: data.purpose,
      fcmAttempted: true,
      fcmSuccess: result?.success !== false,
      fcmError: result?.error,
      fcmToken: result?.fcmToken,
      // Store full template URL for viewing
      metadata: {
        templateUrl: `https://healqr-27726.web.app/?${params.toString()}`,
        restorationReason: data.message,
        language: data.language || 'english'
      }
    });
  } catch (error) {
    console.error('âŒ Failed to store restoration notification:', error);
    // Don't fail the whole operation if storage fails
  }

  return result;
};

export const sendBatchCancellation = async (
  patients: any[],
  doctorInfo: any,
  chamberName: string,
  type: 'chamber' | 'global',
  bookingDetails?: any
) => {
  let sent = 0; let failed = 0;

  // Get today's date
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  for (const p of patients) {
    try {
      await sendAppointmentCancelled({
        patientPhone: p.phone || p.patientPhone,
        patientName: p.name || p.patientName || 'Patient',
        doctorName: doctorInfo?.doctorName || 'Doctor',
        appointmentDate: bookingDetails?.appointmentDate || todayStr,
        appointmentTime: bookingDetails?.appointmentTime || '',
        chamber: chamberName,
        bookingId: bookingDetails?.bookingId || '',
        message: type === 'chamber'
          ? `Your appointment at ${chamberName} has been cancelled by doctor (Chamber Suspended)`
          : `Your appointment has been cancelled by doctor (Global Suspension)`,
        scope: type,
        language: p.language || bookingDetails?.language || 'english'
      });
      sent += 1;
    } catch (err) {
      console.error('âŒ Batch cancellation failed for', p.patientPhone || p.phone, err);
      failed += 1;
    }
  }
  return { sent, failed };
};

export const sendBatchRestoration = async (
  patients: any[],
  doctorInfo: any,
  chamberName: string,
  type: 'chamber' | 'global',
  bookingDetails?: any
) => {
  let sent = 0; let failed = 0;

  // Get today's date
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  for (const p of patients) {
    try {
      await sendAppointmentRestored({
        patientPhone: p.phone || p.patientPhone,
        patientName: p.name || p.patientName || 'Patient',
        doctorName: doctorInfo?.doctorName || 'Doctor',
        appointmentDate: bookingDetails?.appointmentDate || todayStr,
        appointmentTime: bookingDetails?.appointmentTime || '',
        chamber: chamberName,
        bookingId: bookingDetails?.bookingId || '',
        tokenNumber: p.tokenNumber || bookingDetails?.tokenNumber || '#1',
        message: type === 'chamber'
          ? `Your appointment at ${chamberName} has been restored and confirmed`
          : `Your appointment has been restored and confirmed (Chamber Reactivated)`,
        scope: type,
        language: p.language || bookingDetails?.language || 'english'
      });
      sent += 1;
    } catch (err) {
      console.error('âŒ Batch restoration failed for', p.patientPhone || p.phone, err);
      failed += 1;
    }
  }
  return { sent, failed };
};

// ðŸ”” SEND APPOINTMENT REMINDER IMMEDIATELY (Manual send by doctor via bell icon)
export const sendAppointmentReminder = async (data: any, bookingCreatedAt: Date) => {
  const { userId, phone10 } = normalizePatientTarget(data.patientPhone);
  const appointmentTime = data.appointmentTime ? new Date(data.appointmentTime) : null;

  // 6-hour rule: only send if created >=6h before appointment
  if (appointmentTime) {
    const diffMs = appointmentTime.getTime() - bookingCreatedAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 6) {
      return { skipped: true } as any;
    }
  }

  // Construct URL parameters matching App.tsx expectations
  const params = new URLSearchParams({
    page: 'appointment-reminder',
    patientName: data.patientName || '',
    doctorName: data.doctorName || '',
    date: data.appointmentDate || '',
    time: data.appointmentTimeStr || '',
    location: data.location || '',
    serialNumber: data.serialNumber || '',
    clinicName: data.clinicName || '',
    language: data.language || 'english'
  });

  const result = await sendFCM({
    userId,
    title: 'â° Appointment Reminder',
    body: `Reminder: Your appointment with ${data.doctorName} is coming up. Please arrive on time.`,
    data: {
      type: 'appointment_reminder',
      language: data.language || 'english',
      appointmentTime: data.appointmentTime || '',
      phone: phone10,
      url: `https://healqr-27726.web.app/?${params.toString()}`,
    },
  });

  // Save to notification history
  await saveNotificationHistory({
    patientPhone: phone10,
    patientName: data.patientName || 'Patient',
    age: data.age !== undefined ? String(data.age) : undefined,
    sex: data.sex,
    purpose: data.purpose,
    doctorName: data.doctorName || 'Doctor',
    clinicName: data.clinicName,
    chamber: data.location,
    notificationType: 'reminder',
    bookingStatus: 'confirmed',
    notificationStatus: result?.success === false ? 'failed' : 'sent',
    timestamp: new Date(),
    consultationDate: data.appointmentDate || '',
    consultationTime: data.appointmentTimeStr || '',
    serialNumber: data.serialNumber,
    bookingId: data.bookingId,
    doctorId: data.doctorId
  });

  return result;
};

export const scheduleBookingReminder = async (data: any) => {
  const { userId, phone10 } = normalizePatientTarget(data.patientPhone);
  const appointmentTime = data.appointmentTime ? new Date(data.appointmentTime) : null;
  const bookingCreatedAt = data.bookingCreatedAt ? new Date(data.bookingCreatedAt) : new Date();

  // 6-hour rule: only send if created >=6h before appointment
  if (appointmentTime) {
    const diffMs = appointmentTime.getTime() - bookingCreatedAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 6) {
      return { skipped: true } as any;
    }
  }

  const sendAt = appointmentTime
    ? new Date(appointmentTime.getTime() - 60 * 60 * 1000)
    : new Date();

  return scheduleFCM({
    userId,
    sendAt,
    title: 'â° Appointment Reminder',
    body: data.body || 'Reminder: your appointment is coming up. Please arrive on time.',
    data: {
      type: 'booking_reminder',
      language: data.language || 'english',
      appointmentTime: data.appointmentTime || '',
      phone: phone10,
      // Deep link to reminder template
      url: `https://healqr-27726.web.app/?page=appointment-reminder&patientName=${encodeURIComponent(data.patientName)}&doctorName=${encodeURIComponent(data.doctorName)}&date=${encodeURIComponent(data.appointmentDate)}&time=${encodeURIComponent(data.appointmentTimeStr || '')}&location=${encodeURIComponent(data.location || '')}`,
    },
  });
};

export const sendVideoCallLink = async (data: any) => {
  const { userId, phone10 } = normalizePatientTarget(data.patientPhone);

  const params = new URLSearchParams({
    page: 'video-call',
    bookingId: data.bookingId || '',
    patientName: data.patientName || '',
    doctorName: data.doctorName || '',
    language: data.language || 'english'
  });

  const result = await sendFCM({
    userId,
    title: 'ðŸŽ¥ Join Video Consultation',
    body: `Dr. ${data.doctorName} is ready for your video consultation. Click to join now!`,
    data: {
      type: 'video_call_link',
      language: data.language || 'english',
      bookingId: data.bookingId,
      phone: phone10,
      url: `https://healqr-27726.web.app/?${params.toString()}`,
    },
  });

  // ðŸ’¾ ALWAYS STORE IN FIRESTORE
  try {
    const storeNotification = storePatientNotification;
    await storeNotification({
      patientPhone: phone10,
      patientName: data.patientName || 'Patient',
      patientAge: data.age,
      patientGender: data.sex,
      type: 'video_call_link',
      title: 'ðŸŽ¥ Join Video Consultation',
      message: `Dr. ${data.doctorName} is ready for your video consultation. Click to join now!`,
      bookingId: data.bookingId || '',
      doctorId: data.doctorId,
      doctorName: data.doctorName || 'Doctor',
      doctorSpecialty: data.doctorSpecialty,
      doctorPhoto: data.doctorPhoto,
      chamberName: data.clinicName || data.chamber,
      chamberAddress: data.chamberAddress,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      serialNumber: data.serialNumber,
      purpose: data.purpose,
      fcmAttempted: true,
      fcmSuccess: result?.success !== false,
      fcmError: result?.error,
      fcmToken: result?.fcmToken,
      metadata: {
        templateUrl: `https://healqr-27726.web.app/?${params.toString()}`,
        language: data.language || 'english'
      }
    });
  } catch (error) {
    console.error('âŒ Failed to store video call notification:', error);
  }

  // Save to notification history
  await saveNotificationHistory({
    patientPhone: phone10,
    patientName: data.patientName || 'Patient',
    doctorName: data.doctorName || 'Doctor',
    notificationType: 'video_call_link',
    bookingStatus: 'confirmed',
    notificationStatus: result?.success === false ? 'failed' : 'sent',
    timestamp: new Date(),
    consultationDate: data.appointmentDate || '',
    consultationTime: data.appointmentTime || '',
    bookingId: data.bookingId,
    doctorId: data.doctorId,
    language: data.language || 'english'
  });

  return result;
};

export const scheduleVideoCallLink = async (data: any, appointmentTime: Date) => {
  const { userId, phone10 } = normalizePatientTarget(data.patientPhone);

  // Schedule 30 minutes before appointment
  const sendAt = new Date(appointmentTime.getTime() - 30 * 60 * 1000);

  // If we are already past the 30-minute mark, just send it immediately by setting sendAt to now
  const now = new Date();
  const finalSendAt = sendAt < now ? now : sendAt;

  const params = new URLSearchParams({
    page: 'video-call',
    bookingId: data.bookingId || '',
    patientName: data.patientName || '',
    doctorName: data.doctorName || '',
    language: data.language || 'english'
  });

  const result = await scheduleFCM({
    userId,
    sendAt: finalSendAt,
    title: 'ðŸŽ¥ Join Video Consultation',
    body: `Dr. ${data.doctorName} will be ready for your video consultation soon. Click inside to get ready!`,
    data: {
      type: 'video_call_link',
      language: data.language || 'english',
      bookingId: data.bookingId,
      phone: phone10,
      url: `https://healqr-27726.web.app/?${params.toString()}`,
    },
  });

  // Store basic info in Firestore that link is scheduled
  try {
    const storeNotification = storePatientNotification;
    await storeNotification({
      patientPhone: phone10,
      patientName: data.patientName || 'Patient',
      type: 'video_call_link',
      title: 'ðŸŽ¥ Video Consultation Scheduled',
      message: `Link automatically scheduled for 30 minutes before your appointment.`,
      bookingId: data.bookingId || '',
      doctorId: data.doctorId,
      doctorName: data.doctorName || 'Doctor',
      chamberName: data.clinicName || data.chamber,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      fcmAttempted: true,
      fcmSuccess: result?.success !== false,
      fcmError: result?.error,
    });
  } catch (error) {
    console.error('âŒ Failed to store scheduled video call notification:', error);
  }

  // Save to notification history
  await saveNotificationHistory({
    patientPhone: phone10,
    patientName: data.patientName || 'Patient',
    doctorName: data.doctorName || 'Doctor',
    notificationType: 'video_call_link', // reusing the type
    bookingStatus: 'confirmed',
    notificationStatus: result?.success === false ? 'failed' : 'pending',
    timestamp: new Date(),
    consultationDate: data.appointmentDate || '',
    consultationTime: data.appointmentTime || '',
    bookingId: data.bookingId,
    doctorId: data.doctorId,
    language: data.language || 'english'
  });

  return result;
};

// ðŸš¨ ADMIN ALERT - Send to Doctor when patients not marked seen after chamber end
export const sendAdminAlert = async (data: {
  doctorId: string;
  doctorName: string;
  eventType?: string;
  severity?: string;
  unmarkedPatients: Array<{ name: string; phone: string; appointmentTime: string }>;
  chamberName: string;
  chamberEndTime: string;
}) => {
  // Send to doctor (not patient)
  const doctorUserId = `doctor_${data.doctorId}`;


  const patientList = data.unmarkedPatients.map(p => p.name).join(', ');

  return sendFCM({
    userId: doctorUserId,
    title: 'ðŸš¨ URGENT ADMIN ALERT',
    body: `${data.unmarkedPatients.length} patient(s) not marked as seen: ${patientList}`,
    data: {
      type: 'admin_alert',
      eventType: data.eventType || 'System Alert',
      severity: data.severity || 'High',
      chamberName: data.chamberName,
      chamberEndTime: data.chamberEndTime,
      unmarkedCount: data.unmarkedPatients.length.toString(),
      unmarkedPatients: JSON.stringify(data.unmarkedPatients),
      // Deep link to admin alert template
      url: `https://healqr-27726.web.app/?page=admin-alert&doctorName=${encodeURIComponent(data.doctorName)}&eventType=${encodeURIComponent(data.eventType || 'System Alert')}&severity=${encodeURIComponent(data.severity || 'High')}`,
    },
  });
};
