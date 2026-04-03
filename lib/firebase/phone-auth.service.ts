/**
 * Firebase Phone Authentication Service
 * Handles OTP sending via SMS for patient login
 */

import { auth } from './config';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  ApplicationVerifier 
} from 'firebase/auth';

let recaptchaVerifier: RecaptchaVerifier | null = null;
let confirmationResult: ConfirmationResult | null = null;

/**
 * Initialize reCAPTCHA verifier (invisible mode)
 */
export function initializeRecaptcha(containerId: string = 'recaptcha-container'): ApplicationVerifier {
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }

  // Clear existing verifier
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
  }

  // Create invisible reCAPTCHA
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
    },
    'expired-callback': () => {
      console.warn('⚠️ reCAPTCHA expired');
    }
  });

  return recaptchaVerifier;
}

/**
 * Send OTP to phone number via Firebase Phone Auth
 * @param phoneNumber - Phone number with country code (e.g., +919874114283)
 * @returns Promise<void>
 */
export async function sendOTP(phoneNumber: string): Promise<void> {
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }

  try {
    // Ensure phone number has country code
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;


    // Initialize reCAPTCHA if not already done
    const appVerifier = recaptchaVerifier || initializeRecaptcha();

    // Send OTP
    confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);

  } catch (error: any) {
    console.error('❌ Error sending OTP:', error);
    
    // Clear reCAPTCHA on error
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      recaptchaVerifier = null;
    }

    throw new Error(error.message || 'Failed to send OTP');
  }
}

/**
 * Verify OTP code
 * @param otpCode - 6-digit OTP code entered by user
 * @returns Promise<boolean> - True if verified successfully
 */
export async function verifyOTP(otpCode: string): Promise<boolean> {
  if (!confirmationResult) {
    throw new Error('No OTP request found. Please request OTP first.');
  }

  try {

    // Verify OTP
    const result = await confirmationResult.confirm(otpCode);


    return true;
  } catch (error: any) {
    console.error('❌ OTP verification failed:', error);
    throw new Error(error.message || 'Invalid OTP code');
  }
}

/**
 * Clear reCAPTCHA verifier (cleanup)
 */
export function clearRecaptcha(): void {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
  confirmationResult = null;
}
