/**
 * AI SERVICE - Powered by Gemini
 * Handles advanced medical lookups and suggestions
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
// Note: In production, this should be a backend call to keep API Key secure.
// For MVP, we use the key from config if available.
const API_KEY = 'AIzaSyAEXO21T32uegMq4U57OnSDuBdA6CC_OOc'; // Gemini API key from AI Studio

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

/**
 * AI Diet Chart generation via Gemini
 */
export interface DietMealItem {
  name: string;
  weight: string;
  kcal: string;
}

export interface DietMeal {
  type: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';
  items: DietMealItem[];
}

export interface DietPlanDay {
  day: number;
  meals: DietMeal[];
}

export async function generateDietPlanWithGemini(params: {
  name: string;
  age: string;
  gender: string;
  weight?: string;
  height?: string;
  activityLevel?: string;
  conditions: string;
  preferences?: string;
  region: string;
  isSmoker: boolean;
  isAlcoholic: boolean;
}): Promise<DietPlanDay[]> {
  const { name, age, gender, weight, height, activityLevel, conditions, preferences, region, isSmoker, isAlcoholic } = params;

  const bmiInfo = weight && height ? `Weight: ${weight}kg, Height: ${height}cm, BMI: ${(parseFloat(weight) / ((parseFloat(height)/100) ** 2)).toFixed(1)}` : '';

  const prompt = `You are a certified clinical nutritionist in India. Generate a personalized 7-day diet plan for this patient.

PATIENT PROFILE:
- Name: ${name}, Age: ${age}, Gender: ${gender}
${bmiInfo ? `- ${bmiInfo}` : ''}
- Activity Level: ${activityLevel || 'moderate'}
- Medical Conditions: ${conditions}
${preferences ? `- Food Preferences: ${preferences}` : ''}
- Region: ${region} (use regional food items common in this area)
- Smoker: ${isSmoker ? 'Yes' : 'No'}, Alcohol: ${isAlcoholic ? 'Yes' : 'No'}

RULES:
1. Each day must have 4 meals: Breakfast, Lunch, Snacks, Dinner
2. Each meal should have 2-4 food items
3. Vary meals across the 7 days - do NOT repeat the same meals every day
4. Respect medical conditions (e.g. low sugar for diabetes, low sodium for hypertension, renal-safe for kidney disease)
5. Respect food preferences (vegetarian, vegan, etc.)
6. Use region-appropriate foods (e.g. rice+fish for Bengal, roti+dal for North India, idli/dosa for South India)
7. Include realistic portion weights in GM/ML/units and calorie estimates in KCAL
8. Target 1500-2200 KCAL/day based on conditions and activity level

Return ONLY a valid JSON array with exactly 7 objects. No other text or explanation.
Format: [{"day":1,"meals":[{"type":"Breakfast","items":[{"name":"Food Name","weight":"50 GM","kcal":"180 KCAL"}]},...]},...] 
The "type" field must be exactly one of: "Breakfast", "Lunch", "Snacks", "Dinner".`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const cleanJson = text.replace(/```json|```/g, '').trim();
    const plan: DietPlanDay[] = JSON.parse(cleanJson);

    // Validate structure
    if (!Array.isArray(plan) || plan.length !== 7) {
      throw new Error('Invalid plan structure');
    }

    for (const day of plan) {
      if (!day.meals || !Array.isArray(day.meals) || day.meals.length < 4) {
        throw new Error('Invalid meal structure');
      }
    }

    return plan;
  } catch (error) {
    console.error('Gemini diet plan generation failed, using fallback:', error);
    return generateFallbackPlan(region);
  }
}

/** Static fallback if Gemini fails */
function generateFallbackPlan(region: string): DietPlanDay[] {
  const days: DietPlanDay[] = [];
  for (let i = 1; i <= 7; i++) {
    days.push({
      day: i,
      meals: [
        {
          type: 'Breakfast',
          items: [
            { name: 'Oats with Milk', weight: '50 GM', kcal: '180 KCAL' },
            { name: 'Boiled Egg', weight: '1 unit', kcal: '70 KCAL' },
          ],
        },
        {
          type: 'Lunch',
          items: region === 'West Bengal'
            ? [
                { name: 'Rice (Red/Brown)', weight: '50 GM', kcal: '100 KCAL' },
                { name: 'Boiled Spinach+Carrot', weight: '100 GM', kcal: '200 KCAL' },
                { name: 'Fish (Steamed/Grilled)', weight: '75 GM', kcal: '200 KCAL' },
              ]
            : [
                { name: 'Multigrain Roti', weight: '2 units', kcal: '140 KCAL' },
                { name: 'Dal (Lentils)', weight: '100 GM', kcal: '120 KCAL' },
                { name: 'Mixed Veggies', weight: '100 GM', kcal: '150 KCAL' },
              ],
        },
        {
          type: 'Snacks',
          items: [
            { name: 'Roasted Foxnuts (Makhana)', weight: '20 GM', kcal: '70 KCAL' },
            { name: 'Green Tea', weight: '1 Cup', kcal: '0 KCAL' },
          ],
        },
        {
          type: 'Dinner',
          items: [
            { name: 'Vegetable Soup', weight: '150 ML', kcal: '90 KCAL' },
            { name: 'Grilled Paneer/Chicken', weight: '50 GM', kcal: '130 KCAL' },
          ],
        },
      ],
    });
  }
  return days;
}
