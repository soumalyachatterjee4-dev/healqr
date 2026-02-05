/**
 * Phone Number Normalization Utility
 * Handles encrypted/unencrypted phone numbers for patient login
 */

import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'your-encryption-key-here'; // Should match your existing key

/**
 * Normalize phone number to last 10 digits
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  // Get last 10 digits
  return digits.slice(-10);
}

/**
 * Decrypt encrypted phone number
 */
export function decryptPhone(encryptedPhone: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedPhone, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}

/**
 * Get searchable phone from booking document
 * Handles both encrypted and plain text fields
 */
export function getSearchablePhone(bookingData: any): string {
  // Try plain text fields first
  const plainFields = ['whatsappNumber', 'patientPhone', 'phone'];
  for (const field of plainFields) {
    if (bookingData[field]) {
      return normalizePhoneNumber(bookingData[field]);
    }
  }

  // Try encrypted fields
  const encryptedFields = ['whatsappNumber_encrypted', 'patientPhone_encrypted', 'phone_encrypted'];
  for (const field of encryptedFields) {
    if (bookingData[field]) {
      const decrypted = decryptPhone(bookingData[field]);
      if (decrypted) {
        return normalizePhoneNumber(decrypted);
      }
    }
  }

  return '';
}

/**
 * Generate all possible phone format variations for querying
 */
export function generatePhoneFormats(phoneNumber: string): string[] {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized || normalized.length !== 10) {
    return [phoneNumber]; // Return as-is if invalid
  }

  return [
    `+91${normalized}`,     // +919830085061
    normalized,             // 9830085061
    `91${normalized}`,      // 919830085061
    phoneNumber.trim()      // Original input
  ];
}
