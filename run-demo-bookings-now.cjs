/**
 * One-time trigger: Create demo bookings for today
 * Mirrors the Cloud Function logic but runs locally via Firebase client SDK
 * 
 * Run: node run-demo-bookings-now.cjs
 * Cleanup: node run-demo-bookings-now.cjs --cleanup
 */

const { initializeApp } = require('firebase/app');
const {
  getFirestore, collection, doc, setDoc, getDocs, query, where,
  writeBatch, Timestamp, serverTimestamp, deleteDoc, updateDoc, increment, getDoc
} = require('firebase/firestore');
const CryptoJS = require('crypto-js');

const firebaseConfig = {
  apiKey: 'AIzaSyB1AVXeao1bqTah8cD1bGAiAQMbZ5nw0WI',
  authDomain: 'teamhealqr.firebaseapp.com',
  projectId: 'teamhealqr',
  storageBucket: 'teamhealqr.firebasestorage.app',
  messagingSenderId: '739121123030',
  appId: '1:739121123030:web:37ed6fd7c052277b604377',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ENCRYPTION_KEY = 'HealQR-2025-Secure-Patient-Data-Encryption-Key-v1';

function encrypt(text) {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

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
  return String(Math.floor(Math.random() * 55) + 15);
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

// ─── CLEANUP ───
async function cleanupDemoBookings() {
  console.log('🧹 Cleaning up demo bookings...');
  const snap = await getDocs(query(collection(db, 'bookings'), where('isDemo', '==', true)));
  console.log(`Found ${snap.size} demo bookings to delete`);

  let deleted = 0;
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
    deleted++;
    if (deleted % 50 === 0) console.log(`  Deleted ${deleted}/${snap.size}...`);
  }
  console.log(`✅ Deleted ${deleted} demo bookings`);
  process.exit(0);
}

// ─── MAIN ───
async function createDemoBookings() {
  console.log('🔵 Creating demo bookings for today...\n');

  // Get demo doctors
  const demoDoctorsSnap = await getDocs(
    query(
      collection(db, 'doctors'),
      where('isDemo', '==', true),
      where('bookingBlocked', '==', false)
    )
  );

  if (demoDoctorsSnap.empty) {
    console.log('❌ No active demo doctors found!');
    process.exit(1);
  }

  const demoDoctors = demoDoctorsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`📋 Found ${demoDoctors.length} active demo doctors\n`);

  // 8-12 bookings for natural variation
  const totalBookings = Math.floor(Math.random() * 5) + 8;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Random distribution across doctors
  const assignments = [];
  for (let i = 0; i < totalBookings; i++) {
    const doctor = demoDoctors[Math.floor(Math.random() * demoDoctors.length)];
    assignments.push(doctor);
  }

  // Track per-doctor count
  const bookingsPerDoctor = {};
  let created = 0;

  for (let i = 0; i < assignments.length; i++) {
    const doctor = assignments[i];
    const patientName = PATIENT_NAMES[Math.floor(Math.random() * PATIENT_NAMES.length)];
    const phone = randomPhone();
    const age = randomAge();
    const gender = randomGender();
    const purpose = PURPOSES[Math.floor(Math.random() * PURPOSES.length)];
    const bookingId = generateBookingId();
    const serialNo = i + 1;

    const hour = Math.floor(Math.random() * 9) + 9;
    const minute = Math.random() > 0.5 ? '00' : '30';
    const ampm = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    const timeStr = `${displayHour}:${minute} ${ampm}`;

    const bookingRef = doc(collection(db, 'bookings'));

    const bookingData = {
      bookingId,
      doctorCode: doctor.doctorCode || '',
      tokenNumber: `#${serialNo}`,
      serialNo,

      patientName_encrypted: encrypt(patientName),
      whatsappNumber_encrypted: encrypt(phone),
      age_encrypted: encrypt(age),
      gender_encrypted: encrypt(gender),
      purposeOfVisit_encrypted: encrypt(purpose),

      patientPhone: phone,
      patientName: patientName,
      doctorId: doctor.id,
      doctorName: doctor.name || '',
      doctorSpecialty: (doctor.specialties || ['Homeopathy'])[0],
      bookingDate: todayStr,
      bookingTime: timeStr,
      chamberName: doctor.address || 'Chamber',
      chamberAddress: doctor.address || '',
      date: Timestamp.fromDate(today),
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
      isDemo: true,
      createdAt: serverTimestamp(),
    };

    await setDoc(bookingRef, bookingData);
    created++;

    bookingsPerDoctor[doctor.id] = (bookingsPerDoctor[doctor.id] || 0) + 1;
    console.log(`  ✅ ${bookingId} → ${doctor.doctorCode || doctor.id} (${patientName}, ${purpose})`);
  }

  // Increment each doctor's bookingsCount
  console.log('\n📊 Updating doctor booking counts...');
  for (const [doctorId, count] of Object.entries(bookingsPerDoctor)) {
    try {
      const doctorRef = doc(db, 'doctors', doctorId);
      await updateDoc(doctorRef, {
        bookingsCount: increment(count),
      });
      const doctor = demoDoctors.find(d => d.id === doctorId);
      console.log(`  📈 ${doctor?.doctorCode || doctorId}: +${count}`);
    } catch (err) {
      console.log(`  ⚠️ Could not update bookingsCount for ${doctorId}: ${err.message}`);
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`✅ Created ${created} demo bookings for ${todayStr}`);
  console.log(`   Across ${Object.keys(bookingsPerDoctor).length} doctors`);
  console.log(`═══════════════════════════════════════`);
  
  process.exit(0);
}

// ─── ENTRY ───
if (process.argv.includes('--cleanup')) {
  cleanupDemoBookings();
} else {
  createDemoBookings();
}
