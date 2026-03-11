/**
 * Gemini-powered Location → Pincode Resolver
 *
 * Uses Gemini AI to resolve Indian area names, localities, landmarks
 * to their 6-digit pincodes. Works for even small villages and localities
 * that geocoding APIs miss.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

exports.resolveLocationPincode = onCall({ maxInstances: 10, cors: true }, async (request) => {
  const { query } = request.data;

  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    throw new HttpsError('invalid-argument', 'Location query is required');
  }

  const cleanQuery = query.trim().substring(0, 200);

  try {
    const prompt = `You are an Indian postal pincode expert. Given a location name in India, return ONLY the 6-digit pincode. Rules:
- Return ONLY the 6-digit number, nothing else
- If the location has multiple pincodes, return the most common/central one
- If you're not confident about the exact pincode, return your best estimate
- If the input is not a recognizable Indian location, return "UNKNOWN"
- Strip any non-location words like "doctor", "hospital", "clinic", "near", "best", "cardiologist" etc. and focus on the place name

Location: "${cleanQuery}"
Pincode:`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 20,
        },
      }),
    });

    if (!response.ok) {
      console.error('Gemini API error:', await response.text());
      return { pincode: null, source: 'error' };
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Extract 6-digit pincode from response
    const match = text.match(/\b(\d{6})\b/);

    if (match) {
      return { pincode: match[1], source: 'gemini' };
    }

    return { pincode: null, source: 'unknown' };
  } catch (error) {
    console.error('Pincode resolution error:', error);
    return { pincode: null, source: 'error' };
  }
});
