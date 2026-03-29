/**
 * Seed Demo Data: Howrah Homeopathy Doctors & Clinics
 * For pharma company meeting demonstration
 * 
 * Run: node seed-demo-data.cjs
 * Cleanup: node seed-demo-data.cjs --cleanup
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs, query, where, writeBatch, Timestamp, deleteDoc, serverTimestamp } = require('firebase/firestore');

// Firebase config (same as the app)
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

// ─── Howrah Pincodes ───
const HOWRAH_PINCODES = [
  '711101', '711102', '711103', '711104', '711105',
  '711106', '711108', '711109', '711110', '711112',
  '711113', '711114', '711201', '711202', '711203',
  '711204', '711205', '711302', '711303', '711304',
];

// ─── Realistic Bengali Doctor Names (Homeopathy focused) ───
const DOCTORS = [
  // Homeopathy Doctors (22)
  { name: 'Dr. Arindam Bhattacharya', specialty: ['Homeopathy'], pin: '711101', address: 'Shibpur, Howrah' },
  { name: 'Dr. Subhasis Mukherjee', specialty: ['Homeopathy'], pin: '711101', address: '12/3 G.T. Road, Shibpur' },
  { name: 'Dr. Tapan Kumar Das', specialty: ['Homeopathy'], pin: '711102', address: 'Belur, Howrah' },
  { name: 'Dr. Rina Chatterjee', specialty: ['Homeopathy'], pin: '711102', address: '45 Belur Main Road' },
  { name: 'Dr. Prosenjit Roy', specialty: ['Homeopathy'], pin: '711103', address: 'Liluah, Howrah' },
  { name: 'Dr. Swapan Kumar Ghosh', specialty: ['Homeopathy'], pin: '711104', address: 'Bally, Howrah' },
  { name: 'Dr. Anirban Sen', specialty: ['Homeopathy'], pin: '711104', address: '78 Bally Jagachha Road' },
  { name: 'Dr. Sumitra Dey', specialty: ['Homeopathy'], pin: '711105', address: 'Domjur, Howrah' },
  { name: 'Dr. Rajesh Mondal', specialty: ['Homeopathy'], pin: '711106', address: 'Sankrail, Howrah' },
  { name: 'Dr. Debashis Banerjee', specialty: ['Homeopathy'], pin: '711108', address: 'Howrah Maidan, Howrah' },
  { name: 'Dr. Partha Pratim Nath', specialty: ['Homeopathy'], pin: '711109', address: 'Salkia, Howrah' },
  { name: 'Dr. Kakali Sarkar', specialty: ['Homeopathy'], pin: '711109', address: '23 Salkia School Road' },
  { name: 'Dr. Amit Kumar Paul', specialty: ['Homeopathy'], pin: '711110', address: 'Kadamtala, Howrah' },
  { name: 'Dr. Sudip Chakraborty', specialty: ['Homeopathy'], pin: '711112', address: 'Bamunari, Howrah' },
  { name: 'Dr. Manas Kundu', specialty: ['Homeopathy'], pin: '711113', address: 'Uluberia, Howrah' },
  { name: 'Dr. Sarmistha Pal', specialty: ['Homeopathy'], pin: '711114', address: 'Bagnan, Howrah' },
  { name: 'Dr. Biswajit Bose', specialty: ['Homeopathy'], pin: '711201', address: 'Amta, Howrah' },
  { name: 'Dr. Arpita Saha', specialty: ['Homeopathy'], pin: '711202', address: 'Udaynarayanpur, Howrah' },
  { name: 'Dr. Jayanta Mitra', specialty: ['Homeopathy'], pin: '711203', address: 'Shyampur, Howrah' },
  { name: 'Dr. Dipankar Majumdar', specialty: ['Homeopathy'], pin: '711204', address: 'Panchla, Howrah' },
  { name: 'Dr. Ruma Adhikari', specialty: ['Homeopathy'], pin: '711205', address: 'Jagatballavpur, Howrah' },
  { name: 'Dr. Soumyajit Kar', specialty: ['Homeopathy'], pin: '711101', address: '56 Pilkhana Road, Howrah' },

  // A few General/Other specialty doctors (6) for variety
  { name: 'Dr. Abhijit Ganguly', specialty: ['General Physician'], pin: '711101', address: '99 Howrah Station Road' },
  { name: 'Dr. Priya Dasgupta', specialty: ['Pediatrician'], pin: '711103', address: '11 Liluah Station Road' },
  { name: 'Dr. Sabyasachi Dutta', specialty: ['Dermatologist'], pin: '711104', address: '33 Bally Municipality Road' },
  { name: 'Dr. Moumita Halder', specialty: ['General Physician'], pin: '711108', address: '67 Maidan Road, Howrah' },
  { name: 'Dr. Rajarshi Biswas', specialty: ['ENT Specialist'], pin: '711109', address: '15 Salkia Lake Road' },
  { name: 'Dr. Sucheta Gupta', specialty: ['Gynecologist'], pin: '711102', address: '28 Belur Math Road' },
];

// ─── Clinics ───
const CLINICS = [
  {
    name: 'Howrah Homeopathy Clinic',
    address: '25/1 G.T. Road, Shibpur, Howrah',
    pin: '711101',
    doctorIndices: [0, 1, 21, 22], // Indices from DOCTORS array
  },
  {
    name: 'Belur Health Centre',
    address: '78 Belur Main Road, Belur, Howrah',
    pin: '711102',
    doctorIndices: [2, 3, 27],
  },
  {
    name: 'Liluah Homeo Care',
    address: '19 Liluah Bazar Road, Liluah, Howrah',
    pin: '711103',
    doctorIndices: [4, 23],
  },
  {
    name: 'Bally Wellness Polyclinic',
    address: '43 Bally Jagachha, Bally, Howrah',
    pin: '711104',
    doctorIndices: [5, 6, 24],
  },
  {
    name: 'Salkia Homeopathic Centre',
    address: '9 Salkia School Road, Salkia, Howrah',
    pin: '711109',
    doctorIndices: [10, 11, 26],
  },
];

// ─── Helper: Generate doctor slug ───
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/^dr\.\s*/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ─── Helper: Generate random past date (within last 3 months) ───
function randomRecentDate() {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 90) + 7; // 7-97 days ago
  return new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

// ─── Helper: Generate random bookings count ───
function randomBookings() {
  return Math.floor(Math.random() * 45) + 5; // 5-50
}

// ─── MAIN ───
async function seedData() {
  console.log('🔵 Starting demo data seed for Howrah doctors & clinics...\n');

  // Track existing serials per pincode to generate unique doctorCodes
  const pincodeSerials = {};

  // First, check existing doctors to avoid serial collisions
  for (const pin of [...new Set(DOCTORS.map(d => d.pin))]) {
    const q1 = query(collection(db, 'doctors'), where('pinCode', '==', pin));
    const snap = await getDocs(q1);
    
    let maxSerial = 0;
    snap.docs.forEach(d => {
      const code = d.data().doctorCode || '';
      const match = code.match(/HQR-\d{6}-(\d{4})-DR/);
      if (match) maxSerial = Math.max(maxSerial, parseInt(match[1]));
    });
    pincodeSerials[pin] = maxSerial;
  }

  // Also check clinic serials
  const clinicPincodeSerials = {};
  for (const pin of [...new Set(CLINICS.map(c => c.pin))]) {
    const q2 = query(collection(db, 'clinics'), where('pinCode', '==', pin));
    const snap = await getDocs(q2);
    
    let maxSerial = 0;
    snap.docs.forEach(d => {
      const code = d.data().clinicCode || '';
      const match = code.match(/HQR-\d{6}-(\d{4})-\d{3}-CLN/);
      if (match) maxSerial = Math.max(maxSerial, parseInt(match[1]));
    });
    clinicPincodeSerials[pin] = maxSerial;
  }

  const createdDoctors = []; // { id, doctorCode, name, specialties, ... }

  // ─── Create Doctors ───
  console.log(`📋 Creating ${DOCTORS.length} doctors...\n`);

  for (let i = 0; i < DOCTORS.length; i++) {
    const d = DOCTORS[i];
    const pin = d.pin;

    pincodeSerials[pin] = (pincodeSerials[pin] || 0) + 1;
    const serial = String(pincodeSerials[pin]).padStart(4, '0');
    const doctorCode = `HQR-${pin}-${serial}-DR`;
    const slug = slugify(d.name);
    const bookingUrl = `https://healqr.com/book/${slug}`;
    const signupDate = randomRecentDate();
    const trialEnd = new Date(signupDate.getTime() + 9 * 24 * 60 * 60 * 1000);
    const bookingsCount = randomBookings();

    // Use auto-generated ID (like a real UID)
    const docRef = doc(collection(db, 'doctors'));

    const doctorData = {
      uid: docRef.id,
      email: `${slug.replace(/-/g, '.')}@gmail.com`,
      name: d.name,
      specialties: d.specialty,
      dob: '',
      address: d.address,
      pinCode: pin,
      state: 'West Bengal',
      landmark: '',
      qrNumber: `QR-${pin}-${serial}`,
      qrType: 'preprinted',
      companyName: 'Demo Pharma Pvt Ltd',
      division: 'Homeopathy Division',
      qrDocId: '',
      doctorCode: doctorCode,
      baCode: '',
      activationQrCode: '',
      qrCode: '', // No actual QR image for demo
      qrId: `QR-${pin}-${serial}`,
      bookingUrl: bookingUrl,
      doctorSlug: slug,
      createdAt: Timestamp.fromDate(signupDate),
      status: 'active',
      subscriptionPlan: 'starter',
      subscriptionStatus: 'trial',
      trialStartDate: Timestamp.fromDate(signupDate),
      trialEndDate: Timestamp.fromDate(trialEnd),
      bookingsCount: bookingsCount,
      bookingsLimit: 100,
      daysRemaining: Math.max(0, Math.ceil((trialEnd - Date.now()) / (1000 * 60 * 60 * 24))),
      nextBillingDate: null,
      currentPeriodStart: Timestamp.fromDate(signupDate),
      currentPeriodEnd: Timestamp.fromDate(trialEnd),
      bookingBlocked: false,
      blockReason: null,
      isDemo: true, // Flag to identify demo data for easy cleanup
    };

    await setDoc(docRef, doctorData);

    createdDoctors.push({
      id: docRef.id,
      index: i,
      doctorCode,
      name: d.name,
      email: doctorData.email,
      specialties: d.specialty,
      profileImage: '',
    });

    console.log(`  ✅ ${doctorCode} — ${d.name} (${d.specialty.join(', ')})`);
  }

  console.log(`\n📋 Creating ${CLINICS.length} clinics...\n`);

  // ─── Create Clinics ───
  for (let i = 0; i < CLINICS.length; i++) {
    const c = CLINICS[i];
    const pin = c.pin;

    clinicPincodeSerials[pin] = (clinicPincodeSerials[pin] || 0) + 1;
    const serial = String(clinicPincodeSerials[pin]).padStart(4, '0');
    const clinicCode = `HQR-${pin}-${serial}-001-CLN`;
    const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const bookingUrl = `https://healqr.com/clinic/${slug}`;
    const signupDate = randomRecentDate();

    // Build linkedDoctorsDetails from the assigned doctor indices
    const linkedDoctorCodes = [];
    const linkedDoctorsDetails = [];
    for (const di of c.doctorIndices) {
      if (di < createdDoctors.length) {
        const doc = createdDoctors[di];
        linkedDoctorCodes.push(doc.doctorCode);
        linkedDoctorsDetails.push({
          doctorId: doc.id,
          doctorCode: doc.doctorCode,
          name: doc.name,
          email: doc.email,
          specialties: doc.specialties,
          profileImage: '',
          linkedAt: Timestamp.fromDate(signupDate),
        });
      }
    }

    const clinicRef = doc(collection(db, 'clinics'));

    const clinicData = {
      uid: clinicRef.id,
      email: `${slug}@gmail.com`,
      name: c.name,
      clinicName: c.name,
      address: c.address,
      pinCode: pin,
      state: 'West Bengal',
      landmark: '',
      qrNumber: `QR-CLN-${pin}-${serial}`,
      qrType: 'preprinted',
      companyName: 'Demo Pharma Pvt Ltd',
      division: 'Homeopathy Division',
      clinicCode: clinicCode,
      clinicSlug: slug,
      bookingUrl: bookingUrl,
      qrCode: '',
      createdAt: Timestamp.fromDate(signupDate),
      type: 'clinic',
      linkedDoctorCodes: linkedDoctorCodes,
      linkedDoctorsDetails: linkedDoctorsDetails,
      locations: [{ id: '1', name: 'Main Branch', address: c.address }],
      defaultLocationId: '1',
      isDemo: true, // Flag to identify demo data for easy cleanup
    };

    await setDoc(clinicRef, clinicData);

    console.log(`  🏥 ${clinicCode} — ${c.name} (${linkedDoctorCodes.length} doctors linked)`);
    linkedDoctorsDetails.forEach(ld => {
      console.log(`      └─ ${ld.doctorCode} — ${ld.name}`);
    });
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`✅ DONE! Created ${DOCTORS.length} doctors + ${CLINICS.length} clinics`);
  console.log('═══════════════════════════════════════');
  console.log('\n📊 Summary:');
  console.log(`  • Homeopathy doctors: ${DOCTORS.filter(d => d.specialty.includes('Homeopathy')).length}`);
  console.log(`  • Other specialty doctors: ${DOCTORS.filter(d => !d.specialty.includes('Homeopathy')).length}`);
  console.log(`  • Clinics: ${CLINICS.length}`);
  console.log(`  • All located in Howrah, West Bengal`);
  console.log(`  • All tagged with isDemo: true for easy cleanup`);
  console.log('\n🧹 To remove demo data later, run:');
  console.log('   node seed-demo-data.cjs --cleanup\n');
}

// ─── CLEANUP ───
async function cleanupDemoData() {
  console.log('🧹 Cleaning up demo data...\n');

  const q1 = query(collection(db, 'doctors'), where('isDemo', '==', true));
  const q2 = query(collection(db, 'clinics'), where('isDemo', '==', true));
  const doctorsSnap = await getDocs(q1);
  const clinicsSnap = await getDocs(q2);

  console.log(`  Found ${doctorsSnap.size} demo doctors, ${clinicsSnap.size} demo clinics`);

  const batch = writeBatch(db);
  doctorsSnap.docs.forEach(d => batch.delete(d.ref));
  clinicsSnap.docs.forEach(d => batch.delete(d.ref));

  await batch.commit();
  console.log('  ✅ All demo data removed!\n');
}

// ─── Entry Point ───
const args = process.argv.slice(2);
if (args.includes('--cleanup')) {
  cleanupDemoData().catch(err => { console.error('❌ Cleanup failed:', err); process.exit(1); });
} else {
  seedData().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
}
