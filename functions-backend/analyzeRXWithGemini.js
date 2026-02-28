const functions = require('firebase-functions');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDXPNWLk9Brx4nSCy1ov5yvb4AkpEXpcTY";
const genAI = new GoogleGenerativeAI(API_KEY);

exports.analyzeRXWithGemini = functions.https.onCall(async (data, context) => {
  const { imageUrls, language } = data;

  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Image URLs are required');
  }

  try {
    console.log(`🧠 Analyzing ${imageUrls.length} images with Gemini Flash... Target Language: ${language}`);

    // 2. Prepare Images for Gemini
    const imageParts = await Promise.all(imageUrls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = 'image/jpeg';

      console.log(`Input Image: ${url.substring(0, 50)}... | Mime: ${mimeType} | Size: ${buffer.length} bytes`);

      return {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: mimeType,
        },
      };
    }));

    // 3. Construct Prompt
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert Medical Assistant and Pharmacist.
      Task: Decode this handwritten prescription image.

      OUTPUT FORMAT (Strict JSON):
      {
        "medicines": [
          {
            "name": "Meds Name",
            "dosage": "500mg",
            "frequency": "1-0-1",
            "duration": "5 days",
            "instructions": "English instruction",
            "translatedInstructions": "Instruction translated to ${language}"
          }
        ],
        "advice": [
          {
            "english": "Drink water",
            "translated": "Jol khan (${language})"
          }
        ],
        "confidenceScore": 95
      }

      RULES:
      1. Identify medicine names carefully. Correct spelling if obvious.
      2. Decode dosage frequency (OD=Once, BD=Twice, TDS=Thrice, HS=Night).
      3. Translate instructions to ${language} (e.g., 'Take after food' -> 'Khabar por' in Bengali).
      4. If unsure, mark confidence lower.
      5. Return ONLY JSON. No markdown.
    `;

    // 4. Call Gemini
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    console.log('🤖 Gemini Response:', text);

    // 5. Parse JSON
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonResponse = JSON.parse(cleanedText);

    return jsonResponse;

  } catch (error) {
    console.error('❌ Gemini Error:', error);

    // Debug: List available models if verification fails
    try {
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await listResponse.json();
        const modelNames = data.models ? data.models.map(m => m.name).join(', ') : 'No models found';
        console.log('Available Models:', modelNames);
        throw new functions.https.HttpsError('internal', `Analysis failed. Available Models: ${modelNames}. Error: ${error.message}`);
    } catch (listError) {
        throw new functions.https.HttpsError('internal', 'Analysis failed: ' + error.message);
    }
  }
});
