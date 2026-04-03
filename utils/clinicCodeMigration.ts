/**
 * Clinic Code Migration Script
 * Updates old clinic codes (HQR-xxxxxx-xxxx-CLN) to new format (HQR-xxxxxx-xxxx-001-CLN)
 */

import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase/config';

export async function migrateClinicCodes() {
  if (!db) {
    console.error('Firebase not initialized');
    return;
  }

  try {

    const clinicsRef = collection(db, 'clinics');
    const snapshot = await getDocs(clinicsRef);

    let updatedCount = 0;

    for (const clinicDoc of snapshot.docs) {
      const data = clinicDoc.data();
      const currentCode = data.clinicCode;

      if (currentCode && currentCode.match(/^HQR-\d{6}-\d{4}-CLN$/)) {
        // Old format: HQR-xxxxxx-xxxx-CLN
        const newCode = currentCode.replace(/-CLN$/, '-001-CLN');


        await updateDoc(doc(db, 'clinics', clinicDoc.id), {
          clinicCode: newCode
        });

        updatedCount++;
      }
    }


  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Auto-run in Node.js environment
if (typeof window === 'undefined') {
  migrateClinicCodes();
}
