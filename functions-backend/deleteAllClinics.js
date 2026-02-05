const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// Delete all clinics and related demo/real data
toDelete = async () => {
  // 1. Delete all clinics
  const clinicsSnap = await db.collection('clinics').get();
  for (const doc of clinicsSnap.docs) {
    await doc.ref.delete();
  }

  // 2. Delete all QR codes linked to clinics from qrPool
  const qrSnap = await db.collection('qrPool').get();
  for (const doc of qrSnap.docs) {
    const data = doc.data();
    if (data.clinicEmail || data.clinicName) {
      await doc.ref.delete();
    }
  }

  // 3. Optionally, delete bookings and other related data
  // Uncomment below if you want to remove all bookings
  // const bookingsSnap = await db.collection('bookings').get();
  // for (const doc of bookingsSnap.docs) {
  //   await doc.ref.delete();
  // }

  console.log('All clinic, demo, and related QR data deleted.');
};

// Run the deletion
toDelete();
