const { GoogleGenerativeAI } = require('@google/generative-ai');
const API_KEY = "AIzaSyDXPNWLk9Brx4nSCy1ov5yvb4AkpEXpcTY"; // from analyzeRXWithGemini.js
const genAI = new GoogleGenerativeAI(API_KEY);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello, are you alive?");
    const response = await result.response;
    console.log("SUCCESS:", response.text());
  } catch (error) {
    console.error("ERROR:", error.message);
  }
}
test();
