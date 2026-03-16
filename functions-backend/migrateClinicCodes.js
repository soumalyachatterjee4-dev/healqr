const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Migrate Clinic Codes from Old to New Format (v2)
 * Callable function to update clinic codes from HQR-xxxxxx-xxxx-CLN to HQR-xxxxxx-xxxx-001-CLN
 * Also updates branch codes inside locations[] array
 *
 * This function:
 * 1. Queries all clinics in the 'clinics' collection
 * 2. Identifies codes in old format (missing branch suffix)
 * 3. Updates them to new format by adding '-001' before '-CLN'
 * 4. Also updates branch codes in locations[] array
 * 5. Returns migration statistics
 */
exports.migrateClinicCodes = onCall(async (request) => {
  try {
    const db = admin.firestore();

    console.log('🔄 Starting clinic code migration...');

    // Get all clinics using admin SDK
    const clinicsSnapshot = await db.collection('clinics').get();

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const migratedClinics = [];
    const errors = [];

    console.log(`📊 Found ${clinicsSnapshot.size} clinics to check`);

    const oldFormatRegex = /^HQR-\d{6}-\d{4}-CLN$/;

    // Process each clinic
    for (const clinicDoc of clinicsSnapshot.docs) {
      try {
        const clinicData = clinicDoc.data();
        const currentCode = clinicData.clinicCode || '';
        const updates = {};
        let didUpdate = false;

        // 1. Migrate main clinicCode
        if (currentCode && oldFormatRegex.test(currentCode)) {
          const newCode = currentCode.replace(/-CLN$/, '-001-CLN');
          updates.clinicCode = newCode;
          updates.originalCode = currentCode;
          updates.migratedAt = admin.firestore.FieldValue.serverTimestamp();
          didUpdate = true;

          console.log(`✅ Main code: ${currentCode} → ${newCode}`);

          migratedClinics.push({
            id: clinicDoc.id,
            oldCode: currentCode,
            newCode: newCode,
            clinicName: clinicData.name || clinicData.clinicName || 'Unknown'
          });
        }

        // 2. Migrate branch codes in locations[] array
        const locations = clinicData.locations || [];
        if (locations.length > 0) {
          let locationsChanged = false;
          const updatedLocations = locations.map((loc) => {
            const locCode = loc.clinicCode || '';
            if (locCode && oldFormatRegex.test(locCode)) {
              const newLocCode = locCode.replace(/-CLN$/, `-${loc.id || '001'}-CLN`);
              console.log(`  ✅ Branch ${loc.id}: ${locCode} → ${newLocCode}`);
              locationsChanged = true;
              return { ...loc, clinicCode: newLocCode, originalCode: locCode };
            }
            return loc;
          });

          if (locationsChanged) {
            updates.locations = updatedLocations;
            didUpdate = true;
          }
        }

        // Apply updates
        if (didUpdate) {
          await clinicDoc.ref.update(updates);
          migratedCount++;
        } else {
          skippedCount++;
        }

      } catch (clinicError) {
        console.error(`❌ Error processing clinic ${clinicDoc.id}:`, clinicError);
        errorCount++;
        errors.push({
          clinicId: clinicDoc.id,
          error: clinicError.message
        });
      }
    }

    console.log(`🎉 Migration completed!`);
    console.log(`✅ Migrated: ${migratedCount}`);
    console.log(`⏭️ Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    return {
      success: true,
      statistics: {
        totalClinics: clinicsSnapshot.size,
        migrated: migratedCount,
        skipped: skippedCount,
        errors: errorCount
      },
      migratedClinics: migratedClinics.slice(0, 50),
      errors: errors.slice(0, 10)
    };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw new HttpsError(
      'internal',
      `Clinic code migration failed: ${error.message}`
    );
  }
});