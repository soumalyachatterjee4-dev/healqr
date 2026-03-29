const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const crypto = require('crypto');

if (!admin.apps.length) {
  admin.initializeApp();
}

// AES-256 encryption matching the frontend encryptionService
const ENCRYPTION_KEY = 'HealQR-2025-Secure-Patient-Data-Encryption-Key-v1';

function encrypt(text) {
  if (!text) return '';
  // CryptoJS-compatible AES encryption
  const CryptoJS = require('crypto-js');
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

// Realistic Bengali patient names
const PATIENT_NAMES = [
  'Ananya Ghosh', 'Subrata Das', 'Puja Mondal', 'Ratan Saha', 'Minakshi Roy',
  'Bikram Paul', 'Swati Banerjee', 'Kaushik Nath', 'Tanushree Sen', 'Partha Mitra',
  'Lipika Chatterjee', 'Dipak Adhikari', 'Moumita Bose', 'Tuhin Majumdar', 'Riya Sarkar',
  'Sanjoy Dey', 'Papiya Kundu', 'Avik Halder', 'Shreya Pal', 'Tapas Biswas',
  'Supriya Gupta', 'Arnab Chakraborty', 'Nilanjana Dutta', 'Rikta Mukherjee', 'Suman Kar',
  'Jayashree Bag', 'Sandip Mandal', 'Madhurima Sil', 'Debasish Giri', 'Ankita Barman',
  'Rajib Dhar', 'Piyali Jana', 'Anupam Bera', 'Kasturi Shit', 'Tamal Patra',
  'Rimpa Haldar', 'Soumen Mahato', 'Baishakhi Gayen', 'Ujjwal Rout', 'Pallavi Khatua',
];

const PURPOSES = [
  'General checkup', 'Fever and cold', 'Skin rash', 'Joint pain',
  'Digestive issues', 'Chronic cough', 'Allergy treatment', 'Follow-up visit',
  'Headache', 'Back pain', 'Eye irritation', 'Anxiety/stress',
  'Respiratory issues', 'Blood pressure check', 'Diabetes management', 'Weight management',
];

const PHONE_PREFIXES = ['98', '97', '96', '95', '87', '86', '70', '63', '62', '81'];

function randomPhone() {
  const prefix = PHONE_PREFIXES[Math.floor(Math.random() * PHONE_PREFIXES.length)];
  const rest = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  return `+91${prefix}${rest}`;
}

function randomAge() {
  return String(Math.floor(Math.random() * 55) + 15); // 15-70
}

function randomGender() {
  return Math.random() > 0.5 ? 'Male' : 'Female';
}

function generateBookingId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'HQL-';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

/**
 * Scheduled Cloud Function: Runs daily at 10:00 AM IST (4:30 AM UTC)
 * Creates ~10 demo bookings distributed across demo doctors
 */
exports.generateDemoBookings = onSchedule({
  schedule: '30 4 * * *', // 4:30 AM UTC = 10:00 AM IST
  timeZone: 'Asia/Kolkata',
  region: 'asia-south1',
}, async (event) => {
  const db = admin.firestore();

  try {
    // Get all demo doctors
    const demoDoctorsSnap = await db.collection('doctors')
      .where('isDemo', '==', true)
      .where('bookingBlocked', '==', false)
      .get();

    if (demoDoctorsSnap.empty) {
      console.log('No active demo doctors found. Skipping.');
      return null;
    }

    const demoDoctors = demoDoctorsSnap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    console.log(`Found ${demoDoctors.length} demo doctors`);

    // Distribute ~10 bookings randomly (8-12 range for natural variation)
    const totalBookings = Math.floor(Math.random() * 5) + 8; // 8-12
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // Random distribution: assign each booking to a random demo doctor
    const assignments = [];
    for (let i = 0; i < totalBookings; i++) {
      const doctor = demoDoctors[Math.floor(Math.random() * demoDoctors.length)];
      assignments.push(doctor);
    }

    // Count bookings per doctor for batch increment
    const bookingsPerDoctor = {};
    
    const batch = db.batch();
    let batchCount = 0;

    for (let i = 0; i < assignments.length; i++) {
      const doctor = assignments[i];
      const patientName = PATIENT_NAMES[Math.floor(Math.random() * PATIENT_NAMES.length)];
      const phone = randomPhone();
      const age = randomAge();
      const gender = randomGender();
      const purpose = PURPOSES[Math.floor(Math.random() * PURPOSES.length)];
      const bookingId = generateBookingId();
      const serialNo = i + 1;

      // Random time between 9 AM and 6 PM
      const hour = Math.floor(Math.random() * 9) + 9; // 9-17
      const minute = Math.random() > 0.5 ? '00' : '30';
      const ampm = hour < 12 ? 'AM' : 'PM';
      const displayHour = hour > 12 ? hour - 12 : hour;
      const timeStr = `${displayHour}:${minute} ${ampm}`;

      const bookingRef = db.collection('bookings').doc();

      const bookingData = {
        bookingId,
        doctorCode: doctor.doctorCode || '',
        tokenNumber: `#${serialNo}`,
        serialNo,

        // Encrypted fields
        patientName_encrypted: encrypt(patientName),
        whatsappNumber_encrypted: encrypt(phone),
        age_encrypted: encrypt(age),
        gender_encrypted: encrypt(gender),
        purposeOfVisit_encrypted: encrypt(purpose),

        // Plain searchable fields
        patientPhone: phone,
        patientName: patientName,
        doctorId: doctor.id,
        doctorName: doctor.name || '',
        doctorSpecialty: (doctor.specialties || ['Homeopathy'])[0],
        bookingDate: todayStr,
        bookingTime: timeStr,
        chamberName: doctor.address || 'Chamber',
        chamberAddress: doctor.address || '',
        date: admin.firestore.Timestamp.fromDate(today),
        appointmentDate: todayStr,
        time: timeStr,
        chamber: doctor.address || 'Chamber',
        chamberId: null,
        clinicId: null,
        clinicLocationId: null,
        clinicName: null,
        clinicLocationName: null,
        clinicQRCode: null,
        bookingSource: 'doctor_qr',
        type: 'qr_booking',
        status: 'confirmed',
        paymentStatus: 'not_required',
        utrNumber: null,
        prescriptionUrl: null,
        consultationType: 'in-person',
        language: 'en',
        verificationMethod: 'qr_scan',
        verifiedByPatient: true,
        isWalkIn: false,
        isDemo: true, // Tag for cleanup
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      batch.set(bookingRef, bookingData);
      batchCount++;

      // Track per-doctor count
      bookingsPerDoctor[doctor.id] = (bookingsPerDoctor[doctor.id] || 0) + 1;
    }

    // Increment each doctor's bookingsCount
    for (const [doctorId, count] of Object.entries(bookingsPerDoctor)) {
      const doctorRef = db.collection('doctors').doc(doctorId);
      batch.update(doctorRef, {
        bookingsCount: admin.firestore.FieldValue.increment(count),
      });
      batchCount++;
    }

    await batch.commit();

    console.log(`✅ Created ${assignments.length} demo bookings across ${Object.keys(bookingsPerDoctor).length} doctors`);
    for (const [doctorId, count] of Object.entries(bookingsPerDoctor)) {
      const doctor = demoDoctors.find(d => d.id === doctorId);
      console.log(`  ${doctor?.doctorCode || doctorId}: +${count} bookings`);
    }

    return null;
  } catch (error) {
    console.error('❌ Demo booking generation failed:', error);
    throw error;
  }
});
