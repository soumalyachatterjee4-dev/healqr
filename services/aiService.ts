/**
 * AI SERVICE - Powered by Gemini
 * Handles advanced medical lookups and suggestions
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
// Note: In production, this should be a backend call to keep API Key secure.
// For MVP, we use the key from config if available.
const API_KEY = 'AIzaSyB1AVXeao1bqTah8cD1bGAiAQMbZ5nw0WI'; // Reusing existing key from config

export async function getDrugSuggestionsFromGemini(query: string): Promise<any[]> {
  if (!query || query.length < 3) return [];

  try {
    const prompt = `Acting as a professional medical drug database for India, provide 3 standard medicine suggestions starting with "${query}".
    Return ONLY a valid JSON array of objects: [{"name": String, "type": String, "strength": String, "commonDosage": String}].
    Types include: Tablet, Capsule, Syrup, Injection.
    Strengths should be standard Indian marketplace variants (e.g. 500mg, 625mg DUO).`;

    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // Clean JSON from potential markdown blocks
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Gemini drug lookup failed:', error);
    return [];
  }
}
