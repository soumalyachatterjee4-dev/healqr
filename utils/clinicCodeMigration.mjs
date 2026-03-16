import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Using the same Firebase config as the app
const firebaseConfig = {
  apiKey: 'AIzaSyB1AVXeao1bqTah8cD1bGAiAQMbZ5nw0WI',
  authDomain: 'teamhealqr.firebaseapp.com',
  projectId: 'teamhealqr',
  storageBucket: 'teamhealqr.firebasestorage.app',
  messagingSenderId: '739121123030',
  appId: '1:739121123030:web:37ed6fd7c052277b604377',
  measurementId: 'G-6ZZ5HNE1H4',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateClinicCodes() {
  console.log('🔄 Starting clinic code migration...');

  const clinicsRef = collection(db, 'clinics');
  const snapshot = await getDocs(clinicsRef);

  let updatedCount = 0;

  for (const clinicDoc of snapshot.docs) {
    const data = clinicDoc.data();
    const currentCode = data.clinicCode;

    if (currentCode && currentCode.match(/^HQR-\d{6}-\d{4}-CLN$/)) {
      // Old format: HQR-xxxxxx-xxxx-CLN
      const newCode = currentCode.replace(/-CLN$/, '-001-CLN');

      console.log(`📝 Updating clinic ${clinicDoc.id}: ${currentCode} → ${newCode}`);

      await updateDoc(doc(db, 'clinics', clinicDoc.id), {
        clinicCode: newCode
      });

      updatedCount++;
    }
  }

  console.log(`✅ Migration complete. Updated ${updatedCount} clinic codes.`);
}

migrateClinicCodes().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
