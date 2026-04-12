/**
 * Rx Trends API — HTTP Cloud Function
 * 
 * Provides anonymized Rx molecule trend data for authorized pharma partners.
 * 
 * Authentication: API key passed as `x-api-key` header or `apiKey` query param.
 * API keys are stored in Firestore `apiKeys` collection.
 * 
 * Endpoints:
 *   GET /getRxTrendsAPI?type=daily&date=2026-04-12
 *   GET /getRxTrendsAPI?type=summary&days=30
 *   GET /getRxTrendsAPI?type=top-medicines&state=Maharashtra&specialty=Cardiology
 * 
 * Rate limit: 100 requests/day per API key.
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

exports.getRxTrendsAPI = onRequest({
  memory: '256MiB',
  timeoutSeconds: 60,
  maxInstances: 10,
}, (req, res) => {
  cors(req, res, async () => {
    // Only GET
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed. Use GET.' });
    }

    // --- Auth via API key ---
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key. Pass x-api-key header or apiKey query param.' });
    }

    try {
      // Validate API key
      const keySnap = await db.collection('apiKeys')
        .where('key', '==', apiKey)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (keySnap.empty) {
        return res.status(403).json({ error: 'Invalid or inactive API key.' });
      }

      const keyDoc = keySnap.docs[0];
      const keyData = keyDoc.data();

      // Rate limit: 100/day
      const today = new Date().toISOString().split('T')[0];
      const usageField = `usage.${today}`;
      const currentUsage = keyData.usage?.[today] || 0;
      if (currentUsage >= 100) {
        return res.status(429).json({ error: 'Rate limit exceeded (100 requests/day). Try again tomorrow.' });
      }

      // Increment usage
      await keyDoc.ref.update({ [usageField]: admin.firestore.FieldValue.increment(1), lastUsedAt: admin.firestore.FieldValue.serverTimestamp() });

      // --- Route by type ---
      const type = req.query.type || 'daily';

      if (type === 'daily') {
        // Single day trends
        const date = req.query.date || today;
        const doc = await db.collection('rxTrends').doc(date).get();
        if (!doc.exists) {
          return res.status(404).json({ error: `No data for ${date}` });
        }
        const data = doc.data();
        return res.json({
          success: true,
          date: data.date,
          totalRx: data.totalRx,
          uniqueDoctors: data.uniqueDoctors,
          topMedicines: (data.topMedicines || []).slice(0, 20),
          topDiagnoses: (data.topDiagnoses || []).slice(0, 15),
          topStates: data.topStates || [],
          topSpecialties: data.topSpecialties || [],
        });

      } else if (type === 'summary') {
        // Multi-day summary
        const days = Math.min(parseInt(req.query.days) || 7, 30);
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
        const startStr = startDate.toISOString().split('T')[0];

        const snap = await db.collection('rxTrends')
          .where('date', '>=', startStr)
          .orderBy('date', 'desc')
          .limit(days)
          .get();

        const dailySummaries = snap.docs.map(d => {
          const data = d.data();
          return {
            date: data.date,
            totalRx: data.totalRx,
            uniqueDoctors: data.uniqueDoctors,
            topMedicine: data.topMedicines?.[0]?.name || null,
          };
        });

        const totalRx = dailySummaries.reduce((s, d) => s + (d.totalRx || 0), 0);
        return res.json({
          success: true,
          period: { days, from: startStr, to: endDate.toISOString().split('T')[0] },
          totalRx,
          avgDailyRx: Math.round(totalRx / Math.max(dailySummaries.length, 1)),
          dailySummaries,
        });

      } else if (type === 'top-medicines') {
        // Filtered top medicines (from rxMoleculeData)
        const state = req.query.state;
        const specialty = req.query.specialty;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);

        let query = db.collection('rxMoleculeData');
        if (state) query = query.where('state', '==', state);
        if (specialty) query = query.where('specialty', '==', specialty);

        const snap = await query.limit(5000).get();
        const medMap = {};
        snap.docs.forEach(d => {
          const data = d.data();
          const med = (data.medicineName || '').trim().toUpperCase();
          if (med) medMap[med] = (medMap[med] || 0) + 1;
        });

        const topMedicines = Object.entries(medMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([name, count], rank) => ({ rank: rank + 1, name, count }));

        return res.json({
          success: true,
          filters: { state: state || 'all', specialty: specialty || 'all' },
          totalRecords: snap.size,
          medicines: topMedicines,
        });

      } else {
        return res.status(400).json({ error: `Unknown type: ${type}. Use: daily, summary, top-medicines` });
      }

    } catch (err) {
      console.error('Rx Trends API error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});
