/**
 * Nightly Rx Trends Aggregation — Scheduled Cloud Function
 *
 * Runs daily at 2:00 AM IST (20:30 UTC previous day).
 * Queries rxMoleculeData from the last 24 hours.
 * Aggregates by: date, territory (state), specialty, diagnosis, medicine.
 * Saves daily summary to rxTrends collection.
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

exports.aggregateRxTrends = onSchedule({
  schedule: 'every day 20:30',
  timeZone: 'UTC',
  memory: '512MiB',
  timeoutSeconds: 300,
}, async () => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Date string for the aggregation (IST date)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const dateStr = istDate.toISOString().split('T')[0]; // e.g., "2026-04-05"

  console.log(`📊 Starting Rx Trends aggregation for ${dateStr}`);

  try {
    // Query rxMoleculeData from last 24h
    const snapshot = await db.collection('rxMoleculeData')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(oneDayAgo))
      .get();

    if (snapshot.empty) {
      console.log('No new Rx data in last 24 hours. Skipping aggregation.');
      return;
    }

    const records = snapshot.docs.map(d => d.data());
    console.log(`Found ${records.length} Rx records to aggregate.`);

    // ---- Aggregate by medicine ----
    const medicineMap = {};   // medicineName → { count, states, specialties, diagnoses }
    const stateMap = {};      // state → count
    const specialtyMap = {};  // specialty → count
    const diagnosisMap = {};  // diagnosis → count
    const territoryMap = {};  // territory → { medicines: {name: count}, count }
    let totalRx = 0;
    const uniqueDoctors = new Set();

    for (const rec of records) {
      totalRx++;
      const med = (rec.medicineName || '').trim().toUpperCase();
      const state = (rec.state || '').trim();
      const specialty = (rec.specialty || '').trim();
      const diagnosis = (rec.diagnosis || '').trim();
      const territory = (rec.territory || state || '').trim();
      const doctorId = rec.doctorId || '';

      if (doctorId) uniqueDoctors.add(doctorId);

      // Medicine aggregation
      if (med) {
        if (!medicineMap[med]) {
          medicineMap[med] = { count: 0, states: {}, specialties: {}, diagnoses: {} };
        }
        medicineMap[med].count++;
        if (state) medicineMap[med].states[state] = (medicineMap[med].states[state] || 0) + 1;
        if (specialty) medicineMap[med].specialties[specialty] = (medicineMap[med].specialties[specialty] || 0) + 1;
        if (diagnosis) medicineMap[med].diagnoses[diagnosis] = (medicineMap[med].diagnoses[diagnosis] || 0) + 1;
      }

      // State aggregation
      if (state) stateMap[state] = (stateMap[state] || 0) + 1;

      // Specialty aggregation
      if (specialty) specialtyMap[specialty] = (specialtyMap[specialty] || 0) + 1;

      // Diagnosis aggregation
      if (diagnosis) diagnosisMap[diagnosis] = (diagnosisMap[diagnosis] || 0) + 1;

      // Territory aggregation
      if (territory) {
        if (!territoryMap[territory]) territoryMap[territory] = { count: 0, medicines: {} };
        territoryMap[territory].count++;
        if (med) territoryMap[territory].medicines[med] = (territoryMap[territory].medicines[med] || 0) + 1;
      }
    }

    // Sort medicines by count (top 50)
    const topMedicines = Object.entries(medicineMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 50)
      .map(([name, data]) => ({
        name,
        count: data.count,
        topStates: Object.entries(data.states).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, c]) => ({ state: s, count: c })),
        topSpecialties: Object.entries(data.specialties).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, c]) => ({ specialty: s, count: c })),
        topDiagnoses: Object.entries(data.diagnoses).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([d, c]) => ({ diagnosis: d, count: c })),
      }));

    // Sort diagnoses by count (top 30)
    const topDiagnoses = Object.entries(diagnosisMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([name, count]) => ({ name, count }));

    // Sort states (top 20)
    const topStates = Object.entries(stateMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));

    // Sort specialties
    const topSpecialties = Object.entries(specialtyMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));

    // Territory summaries (top 5 medicines per territory)
    const territorySummaries = Object.entries(territoryMap)
      .map(([territory, data]) => ({
        territory,
        totalRx: data.count,
        topMedicines: Object.entries(data.medicines)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count })),
      }))
      .sort((a, b) => b.totalRx - a.totalRx);

    // Save daily summary
    const summary = {
      date: dateStr,
      totalRx,
      uniqueDoctors: uniqueDoctors.size,
      topMedicines,
      topDiagnoses,
      topStates,
      topSpecialties,
      territorySummaries,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('rxTrends').doc(dateStr).set(summary, { merge: true });

    console.log(`✅ Rx Trends aggregation complete for ${dateStr}: ${totalRx} records, ${topMedicines.length} unique meds, ${uniqueDoctors.size} doctors`);

  } catch (error) {
    console.error('❌ Rx Trends aggregation failed:', error);
    throw error;
  }
});
