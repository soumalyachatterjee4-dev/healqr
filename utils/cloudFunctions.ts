import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Send AI RX Prescription via FCM
 */
export const sendAIRXNotification = async (data: {
  patientId: string;
  patientName: string;
  doctorName: string;
  notificationId: string;
  fcmToken: string;
  imageUrls?: string[];
}): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const functions = getFunctions();
    const sendFn = httpsCallable(functions, 'sendAIRXNotification');

    const result = await sendFn(data);

    return { success: true, messageId: (result.data as any).messageId };
  } catch (error: any) {
    console.error('❌ Error calling sendAIRXNotification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Analyze RX with Gemini 1.5 Flash
 */
export const analyzeRXWithGemini = async (data: {
  imageUrls: string[];
  language: string;
}): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const functions = getFunctions();
    const analyzeFn = httpsCallable(functions, 'analyzeRXWithGemini');

    const result = await analyzeFn(data);

    // onCall result is nested in data property
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('❌ Error calling analyzeRXWithGemini:', error);
    return { success: false, error: error.message };
  }
};
