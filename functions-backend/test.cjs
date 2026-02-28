const { GoogleGenerativeAI } = require('@google/generative-ai');
const API_KEY = "AIzaSyB1AVXeao1bqTah8cD1bGAiAQMbZ5nw0WI"; // from firebase/config.ts
const genAI = new GoogleGenerativeAI(API_KEY);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello?");
    const response = await result.response;
    console.log("SUCCESS:", response.text());
  } catch (error) {
    console.error("ERROR:", error.message);
  }
}
test();
