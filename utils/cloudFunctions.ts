/**
 * Cloud Functions Helper
 * Utility functions to call Firebase Cloud Functions
 */

const FUNCTIONS_BASE_URL = 'https://us-central1-teamhealqr.cloudfunctions.net';

/**
 * Send AI RX Prescription via FCM
 */
export const sendAIRXNotification = async (data: {
  patientId: string;
  patientName: string;
  doctorName: string;
  notificationId: string;
  fcmToken: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const response = await fetch(`${FUNCTIONS_BASE_URL}/sendAIRXNotification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FCM send failed: ${errorText}`);
    }

    const result = await response.json();
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('❌ Error calling sendAIRXNotification:', error);
    return { success: false, error: error.message };
  }
};
