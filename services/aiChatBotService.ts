/**
 * AI ChatBot Service — HealQR PM Assistant
 *
 * Calls Cloud Function healqrAssistant (Gemini 2.5 Flash, server-side).
 * Handles conversation persistence via Firestore.
 *
 * THREE ABSOLUTE RESTRICTIONS enforced server-side:
 * 🚫 ZERO medical advice
 * 🚫 ZERO data sharing
 * 🚫 ZERO identity trust
 */

import { getFunctions, httpsCallable, type HttpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase/config';

let healqrAssistantFn: HttpsCallable | null = null;

function getAssistantFn(): HttpsCallable {
  if (!healqrAssistantFn) {
    const functions = getFunctions(app!);
    healqrAssistantFn = httpsCallable(functions, 'healqrAssistant');
  }
  return healqrAssistantFn;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export type UserRole = 'patient' | 'doctor' | 'clinic' | 'admin' | 'visitor';

// Active conversation ID (per session)
let currentConversationId: string | null = null;

/**
 * Send a message to the HealQR PM Assistant via Cloud Function
 */
export async function sendChatMessage(
  userMessage: string,
  language: string = 'english',
  userRole: UserRole = 'visitor'
): Promise<string> {
  if (!userMessage.trim()) return '';

  try {
    const fn = getAssistantFn();
    const result = await fn({
      message: userMessage.trim(),
      conversationId: currentConversationId,
      userRole,
      language,
    });

    const data = result.data as { response: string; conversationId: string };

    // Track conversation ID for continuity
    if (data.conversationId) {
      currentConversationId = data.conversationId;
    }

    return data.response || 'I apologize, I couldn\'t process that. Please try again.';
  } catch (error: unknown) {
    console.error('PM Assistant error:', error);
    return getOfflineResponse(userMessage);
  }
}

/**
 * Offline fallback responses when Cloud Function is unavailable
 */
function getOfflineResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('book') || lower.includes('appointment')) {
    return 'To book an appointment: Scan the doctor\'s QR code → Select language → Choose date → Select chamber → Fill details → Confirm. You\'ll get a serial number and QR code.';
  }
  if (lower.includes('find') || lower.includes('search') || lower.includes('doctor')) {
    return 'Use "Find a Doctor" from the patient dashboard to search by name, specialty, or location. You can also scan any HealQR code to book directly.';
  }
  if (lower.includes('cancel')) {
    return 'Go to your Patient Dashboard → find the appointment → tap Cancel. The doctor will be notified automatically.';
  }
  if (lower.includes('prescription') || lower.includes('rx')) {
    return 'After consultation, your doctor shares the prescription digitally. You\'ll get a notification when it\'s ready — view it in your Patient Dashboard.';
  }
  if (lower.includes('notification') || lower.includes('reminder')) {
    return 'HealQR sends push notifications for reminders, prescription availability, and follow-ups. Enable notifications in your browser for the best experience.';
  }
  if (lower.includes('queue') || lower.includes('serial') || lower.includes('wait')) {
    return 'Your serial number shows your queue position. Use the Live Tracker on appointment day to see real-time updates.';
  }
  if (lower.includes('video') || lower.includes('online') || lower.includes('virtual')) {
    return 'Video consultations are available if your doctor has enabled them. You\'ll receive a link via notification when the doctor is ready.';
  }

  // Medical query catch
  if (lower.includes('medicine') || lower.includes('symptom') || lower.includes('pain') ||
      lower.includes('treatment') || lower.includes('disease') || lower.includes('cure') ||
      lower.includes('tablet') || lower.includes('dosage') || lower.includes('fever')) {
    return 'I cannot provide medical advice. Please consult your doctor through HealQR for proper medical guidance. Would you like help booking an appointment?';
  }

  return 'I\'m temporarily offline. I can usually help with booking, finding doctors, navigating your dashboard, and platform features. Please try again shortly.';
}

/**
 * Get quick-reply suggestions based on user role
 */
export function getQuickReplies(userRole: UserRole = 'visitor'): string[] {
  if (userRole === 'doctor') {
    return [
      'How to write a prescription?',
      'How to manage my schedule?',
      'How to generate a diet chart?',
      'How do notifications work?',
      'How to share my QR code?',
    ];
  }

  if (userRole === 'clinic') {
    return [
      'How to add a new doctor?',
      'How to manage chambers?',
      'How to set up clinic profile?',
      'How do patient bookings work?',
    ];
  }

  if (userRole === 'admin') {
    return [
      'Platform health status?',
      'How many bookings today?',
      'Any issues detected?',
      'Active doctor count?',
    ];
  }

  // Patient / Visitor
  return [
    'How do I book an appointment?',
    'How to find a doctor near me?',
    'Where are my prescriptions?',
    'How does the queue work?',
    'How to cancel an appointment?',
  ];
}

/**
 * Reset chat (start new conversation)
 */
export function resetChatHistory(): void {
  currentConversationId = null;
}
