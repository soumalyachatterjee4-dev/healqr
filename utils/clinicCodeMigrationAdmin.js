/*
 * Clinic Code Migration (Admin)
 *
 * This script uses Firebase Admin SDK; run it with a service account JSON
 * and set GOOGLE_APPLICATION_CREDENTIALS to the service account path.
 *
 * Example:
 *   $ export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccount.json"
 *   $ node utils/clinicCodeMigrationAdmin.js
 *
 * (On Windows PowerShell)
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
 *   node utils/clinicCodeMigrationAdmin.js
 */

import admin from 'firebase-admin';

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('❌ Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service account JSON path.');
  process.exit(1);
}

admin.initializeApp();
const db = admin.firestore();

async function migrateClinicCodes() {
  console.log('🔄 Starting clinic code migration (admin)...');

  const clinicsRef = db.collection('clinics');
  const snapshot = await clinicsRef.get();

  let updatedCount = 0;

  for (const clinicDoc of snapshot.docs) {
    const data = clinicDoc.data();
    const currentCode = data.clinicCode;

    if (currentCode && currentCode.match(/^HQR-\d{6}-\d{4}-CLN$/)) {
      const newCode = currentCode.replace(/-CLN$/, '-001-CLN');

      console.log(`📝 Updating clinic ${clinicDoc.id}: ${currentCode} → ${newCode}`);
      await clinicsRef.doc(clinicDoc.id).update({ clinicCode: newCode });
      updatedCount++;
    }
  }

  console.log(`✅ Migration complete. Updated ${updatedCount} clinic codes.`);
}

migrateClinicCodes().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
