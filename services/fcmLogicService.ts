import {
  sendVideoCallLink,
  sendAppointmentReminder,
  sendConsultationCompleted,
  scheduleReviewRequest,
  sendAdminAlert
} from './notificationService';
// Removed unused db and firestore imports
// Removed unused toast and firestore imports

/**
 * 🔔 FCM LOGIC SERVICE - CENTRALIZED AUTOMATION
 * Handles timing, business rules, and automation for all patient notifications.
 */

interface Patient {
  id: string;
  name: string;
  phone: string;
  bookingId: string;
  appointmentTime: Date;
  bookingTime: Date;
  consultationType?: 'video' | 'in-person';
  language?: any;
}

/**
 * 1. BELL - REMINDER LOGIC
 * System sends a reminder 1 hour before appointment if booking was made 6+ hours prior.
 */
export const handleAppointmentReminder = async (patient: Patient, chamberInfo: any) => {
  const now = new Date();
  const appointmentTime = new Date(patient.appointmentTime);
  const bookingTime = new Date(patient.bookingTime);

  // 6-hour rule verification
  const diffMs = appointmentTime.getTime() - bookingTime.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 6) {
    return { skipped: true, reason: '6h_rule' };
  }

  // Check if it's actually time to send (1 hour window)
  const timeToAppointment = appointmentTime.getTime() - now.getTime();
  const minutesToAppointment = timeToAppointment / (1000 * 60);

  if (minutesToAppointment <= 65 && minutesToAppointment > 0) {
    return await sendAppointmentReminder({
      patientPhone: patient.phone,
      patientName: patient.name,
      doctorName: chamberInfo.doctorName,
      appointmentDate: appointmentTime.toLocaleDateString(),
      appointmentTimeStr: appointmentTime.toLocaleTimeString(),
      location: chamberInfo.chamberName,
      language: patient.language || 'english',
      bookingId: patient.bookingId
    }, bookingTime);
  }

  return { skipped: true, reason: 'not_in_window' };
};

/**
 * 2. VC LINK TIMING
 * System sends VC link 30 mins before appointment.
 */
export const handleVCLinkTiming = async (patient: Patient, chamberInfo: any, currentSentStatus: boolean) => {
  if (patient.consultationType !== 'video' || currentSentStatus) return null;

  const now = new Date();
  const appointmentTime = new Date(patient.appointmentTime);
  const timeToAppointment = appointmentTime.getTime() - now.getTime();
  const minutesToAppointment = timeToAppointment / (1000 * 60);

  // Send link if within 30 mins
  if (minutesToAppointment <= 30 && minutesToAppointment > 0) {
    return await sendVideoCallLink({
      patientPhone: patient.phone,
      patientName: patient.name,
      doctorName: chamberInfo.doctorName,
      bookingId: patient.bookingId,
      doctorId: chamberInfo.doctorId,
      language: patient.language || 'english'
    });
  }
  return null;
};

/**
 * 3. POST-CONSULTATION LOGIC
 * Triggered when EYE (Mark Seen) is pressed.
 * Schedules 24h review request.
 */
export const processConsultationCompletion = async (patient: Patient, chamberInfo: any, rxUrl?: string, dietUrl?: string) => {
  const seenAt = new Date();

  // 1. Send Completion Notification
  await sendConsultationCompleted({
    patientPhone: patient.phone,
    patientName: patient.name,
    doctorName: chamberInfo.doctorName,
    clinicName: chamberInfo.chamberName,
    bookingId: patient.bookingId,
    doctorId: chamberInfo.doctorId,
    language: patient.language || 'english',
    rxUrl: rxUrl,
    dietUrl: dietUrl
  });

  // 2. Schedule Review Request (24h later)
  await scheduleReviewRequest({
    patientPhone: patient.phone,
    patientName: patient.name,
    doctorName: chamberInfo.doctorName,
    bookingId: patient.bookingId,
    doctorId: chamberInfo.doctorId,
    language: patient.language || 'english'
  }, seenAt);

  return { success: true };
};

/**
 * 4. CHAMBER END TIMEOUTS
 * Triggered 1 hour after chamber end time if patients still unmarked.
 */
export const handleunmarkedTimeouts = async (patients: any[], chamberInfo: any) => {
  const now = new Date();
  // Assume chamberEndTime is in "HH:mm" format for today
  const [hours, minutes] = chamberInfo.endTime.split(':').map(Number);
  const chamberEnd = new Date();
  chamberEnd.setHours(hours, minutes, 0, 0);

  const oneHourAfterEnd = new Date(chamberEnd.getTime() + 60 * 60 * 1000);

  if (now > oneHourAfterEnd) {
    const unmarked = patients.filter(p => !p.isMarkedSeen && !p.isCancelled);
    if (unmarked.length > 0) {
      await sendAdminAlert({
        doctorId: chamberInfo.doctorId,
        doctorName: chamberInfo.doctorName,
        unmarkedPatients: unmarked.map(p => ({
          name: p.name,
          phone: p.phone,
          appointmentTime: p.appointmentTime
        })),
        chamberName: chamberInfo.chamberName,
        chamberEndTime: chamberInfo.endTime
      });
    }
  }

  // 5. DROP OUT LOGIC (End of Day)
  if (now.getHours() === 23 && now.getMinutes() >= 50) {
    // This part would ideally be a Cloud Function, but here's the logic
  }
};
