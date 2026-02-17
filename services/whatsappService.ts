import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { toast } from 'sonner';

export interface PatientListChamber {
  id: string | number;
  name: string;
  clinicPhone: string;
  startTime: string;
  endTime: string;
}

/**
 * Generates a patient list for a specific chamber and opens WhatsApp to send it.
 */
export const sendPatientListViaWhatsApp = async (
  chamber: PatientListChamber,
  doctorName: string
) => {
  if (!chamber.clinicPhone) {
    toast.error('Clinic phone number not found');
    return false;
  }

  try {
    if (!db) {
      toast.error('Firebase DB not initialized');
      return false;
    }

    // 1. Get today's confirmed patients for this chamber
    const today = new Date();
    const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    const bookingsRef = collection(db, 'bookings');
    const numericChamberId = typeof chamber.id === 'string' ? parseInt(chamber.id, 10) : chamber.id;

    // Log the query parameters for debugging
    console.log(`🔍 [WHATSAPP] Fetching patients for chamber: ${chamber.name} (${numericChamberId}) on ${todayStr}`);

    const qrBookingsQuery = query(
      bookingsRef,
      where('chamberId', '==', numericChamberId || -1),
      where('appointmentDate', '==', todayStr)
    );

    const querySnap = await getDocs(qrBookingsQuery);

    const confirmedPatients = querySnap.docs
      .map(doc => doc.data())
      .filter(data => !data.isCancelled && data.status !== 'cancelled')
      .sort((a, b) => (a.serialNo || 0) - (b.serialNo || 0));

    if (confirmedPatients.length === 0) {
      toast.info('No patients booked for this chamber today.');
      return false;
    }

    // 2. Format the message - Structured Card Layout
    const dateDisplay = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = `${chamber.startTime} - ${chamber.endTime}`;

    let message = `🏥 *PATIENT LIST - ${chamber.name.toUpperCase()}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `👨‍⚕️ *Doctor:* ${doctorName.toUpperCase()}\n`;
    message += `📅 *Date:* ${dateDisplay}\n`;
    message += `🕒 *Time:* ${timeStr}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    confirmedPatients.forEach((p, index) => {
      const token = p.tokenNumber || `#${p.serialNo || index + 1}`;
      message += `*${index + 1}.* ${token.padEnd(5)} | *${(p.patientName || 'N/A').toUpperCase()}*\n`;
    });

    message += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `✅ *Total Patients:* ${confirmedPatients.length}\n`;
    message += `📱 _System Generated via HealQR_`;

    // 3. Open WhatsApp link
    const encodedMessage = encodeURIComponent(message);

    // Ensure country code '91' is prefixed if 10 digits
    let cleanPhone = chamber.clinicPhone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank', 'noreferrer');
    toast.success('WhatsApp list generated!', {
      description: 'Opening WhatsApp to send the list to the clinic.'
    });
    return true;
  } catch (error) {
    console.error('Error generating WhatsApp list:', error);
    toast.error('Failed to generate patient list');
    return false;
  }
};
