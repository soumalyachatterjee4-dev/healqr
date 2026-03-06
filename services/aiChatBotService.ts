/**
 * AI ChatBot Service — Booking & System Assistant
 *
 * Powered by Gemini 2.0 Flash. Handles ONLY:
 * - Booking guidance (how to book, reschedule, cancel)
 * - Doctor/clinic search help
 * - Platform navigation (prescriptions, notifications, follow-ups, dashboard)
 * - System troubleshooting
 *
 * NEVER provides medical advice. Redirects to "book an appointment" for any health query.
 */

import { aiTranslate, type AILanguage } from './aiTranslationService';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const API_KEY = 'AIzaSyAEXO21T32uegMq4U57OnSDuBdA6CC_OOc';

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

const SYSTEM_PROMPT = `You are HealQR Assistant — a helpful booking and system guide for the HealQR healthcare platform.

STRICT RULES:
1. You ONLY help with platform usage: booking appointments, finding doctors/clinics, navigating the app, understanding prescriptions/notifications/follow-ups, and troubleshooting.
2. You NEVER give medical advice, treatment suggestions, diagnoses, drug recommendations, or health tips.
3. If the user asks ANY medical/health/treatment question (symptoms, medicines, diet, disease), respond EXACTLY: "For proper medical guidance, please book an appointment with your doctor through HealQR. Our qualified doctors will provide the best treatment for you."
4. Keep responses concise (2-4 sentences max).
5. Be friendly, professional, and helpful.
6. If unsure, guide them to contact support or book an appointment.

PLATFORM KNOWLEDGE:
- HealQR is a QR-based healthcare booking platform (100% free for doctors, clinics, and patients)
- Patients scan a QR code or visit a doctor's profile link to book appointments
- Booking flow: Select Language → View Doctor Profile → Select Date → Select Chamber → Fill Details → Confirm (get serial number + QR)
- Patients get push notifications for reminders, consultation updates, RX (prescription) availability, follow-up reminders
- Doctors can share prescriptions digitally (RX PDF) after consultation
- "Find a Doctor" search lets patients search by name, specialty, or location
- Patients can view their consultation history, prescriptions, and health records in their dashboard
- Video consultation is available for remote visits
- Doctors manage their schedule via chambers (locations) with specific time slots
- Clinics can have multiple doctors, each with their own schedule
- Follow-up appointments can be scheduled by the doctor after consultation
- Serial number tells the patient their position in the queue
- Live tracker shows real-time queue position on appointment day`;

// Chat history for context (per session, max 20 messages)
let chatHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [];
const MAX_HISTORY = 20;

/**
 * Send a message to the AI ChatBot and get a response
 */
export async function sendChatMessage(
  userMessage: string,
  language: AILanguage = 'english'
): Promise<string> {
  if (!userMessage.trim()) return '';

  // Translate user message to English for processing (if not English)
  let processMessage = userMessage;
  if (language !== 'english') {
    const translated = await aiTranslate(userMessage, 'english', 'chat');
    if (translated.translated !== userMessage) {
      processMessage = translated.translated;
    }
  }

  // Build conversation with system prompt
  const contents = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\nUser message: ' + processMessage }] },
    { role: 'model', parts: [{ text: 'I understand. I am HealQR Assistant and will only help with booking and platform usage. I will never provide medical advice.' }] },
    ...chatHistory,
    { role: 'user', parts: [{ text: processMessage }] }
  ];

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 300,
        }
      })
    });

    if (!response.ok) {
      return getOfflineResponse(processMessage);
    }

    const data = await response.json();
    let botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || getOfflineResponse(processMessage);

    // Update conversation history
    chatHistory.push(
      { role: 'user', parts: [{ text: processMessage }] },
      { role: 'model', parts: [{ text: botResponse }] }
    );

    // Trim history if too long
    if (chatHistory.length > MAX_HISTORY * 2) {
      chatHistory = chatHistory.slice(-MAX_HISTORY * 2);
    }

    // Translate response to user's language
    if (language !== 'english') {
      const translated = await aiTranslate(botResponse, language, 'chat');
      botResponse = translated.translated;
    }

    return botResponse;
  } catch {
    return getOfflineResponse(processMessage);
  }
}

/**
 * Offline fallback responses for common queries
 */
function getOfflineResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('book') || lower.includes('appointment')) {
    return 'To book an appointment: Scan the doctor\'s QR code or visit their profile link → Select your language → Choose a date → Select chamber → Fill your details → Confirm! You\'ll receive a serial number and QR code.';
  }
  if (lower.includes('find') || lower.includes('search') || lower.includes('doctor')) {
    return 'Use "Find a Doctor" from the patient dashboard to search by doctor name, specialty, or location. You can also scan any HealQR code to directly book with that doctor.';
  }
  if (lower.includes('cancel')) {
    return 'To cancel an appointment, go to your Patient Dashboard → find the appointment → tap Cancel. The doctor will be notified automatically.';
  }
  if (lower.includes('prescription') || lower.includes('rx')) {
    return 'After your consultation, the doctor will share your prescription digitally. You\'ll receive a notification when it\'s ready. View it anytime from your Patient Dashboard → Consultation History.';
  }
  if (lower.includes('notification') || lower.includes('reminder')) {
    return 'HealQR sends push notifications for appointment reminders, consultation updates, prescription availability, and follow-up reminders. Make sure notifications are enabled in your browser.';
  }
  if (lower.includes('queue') || lower.includes('serial') || lower.includes('wait') || lower.includes('position')) {
    return 'Your serial number shows your position in the queue. On appointment day, use the Live Tracker to see real-time queue updates so you know exactly when to arrive.';
  }
  if (lower.includes('video') || lower.includes('online') || lower.includes('virtual')) {
    return 'Video consultations are available if your doctor has enabled them. You\'ll receive a video call link via notification when the doctor is ready for your session.';
  }

  // Medical query catch
  if (lower.includes('medicine') || lower.includes('symptom') || lower.includes('pain') ||
      lower.includes('treatment') || lower.includes('disease') || lower.includes('cure') ||
      lower.includes('tablet') || lower.includes('dosage') || lower.includes('health') ||
      lower.includes('fever') || lower.includes('cold') || lower.includes('cough')) {
    return 'For proper medical guidance, please book an appointment with your doctor through HealQR. Our qualified doctors will provide the best treatment for you.';
  }

  return 'I can help you with booking appointments, finding doctors, navigating your dashboard, and understanding notifications. What would you like help with?';
}

/**
 * Get quick-reply suggestions based on context
 */
export function getQuickReplies(language: AILanguage = 'english'): string[] {
  return [
    'How do I book an appointment?',
    'How to find a doctor near me?',
    'Where are my prescriptions?',
    'How does the queue work?',
    'How to cancel an appointment?',
  ];
}

/**
 * Reset chat history (new conversation)
 */
export function resetChatHistory(): void {
  chatHistory = [];
}
