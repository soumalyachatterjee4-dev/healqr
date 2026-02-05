/**
 * HealQR Encryption Service
 * AES-256 encryption for sensitive patient data
 * 
 * Encrypted Fields: patientName, whatsappNumber, age, gender, purposeOfVisit
 * Plain Fields: bookingId, doctorCode, appointmentDate, time, chamber (for searching)
 */

import CryptoJS from 'crypto-js';

// Encryption key - stored as environment variable in production
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'HealQR-2025-Secure-Patient-Data-Encryption-Key-v1';

/**
 * Encrypt sensitive text using AES-256
 */
export function encrypt(text: string | null | undefined): string {
  if (!text) return '';
  
  try {
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('❌ Encryption error:', error);
    return text; // Fallback to plain text if encryption fails
  }
}

/**
 * Decrypt encrypted text
 */
export function decrypt(encryptedText: string | null | undefined): string {
  if (!encryptedText) return '';
  
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    const plainText = decrypted.toString(CryptoJS.enc.Utf8);
    return plainText || encryptedText; // Return original if decryption fails
  } catch (error) {
    console.error('❌ Decryption error:', error);
    return encryptedText; // Fallback to encrypted text
  }
}

/**
 * Encrypt patient booking data
 * Encrypts sensitive fields, keeps searchable fields plain
 */
export interface PatientBookingData {
  // Sensitive fields (will be encrypted)
  patientName: string;
  whatsappNumber: string;
  age?: number | null;
  gender?: string | null;
  purposeOfVisit?: string | null;
  
  // Searchable fields (remain plain)
  bookingId: string;
  doctorCode: string;
  doctorId: string;
  appointmentDate: string;
  time: string | null;
  chamber: string | null;
  chamberId: number;
  tokenNumber: string;
  serialNo: number;
  status: string;
  type: string;
  [key: string]: any; // Allow other fields
}

export interface EncryptedBookingData extends Omit<PatientBookingData, 'patientName' | 'whatsappNumber' | 'age' | 'gender' | 'purposeOfVisit'> {
  patientName_encrypted: string;
  whatsappNumber_encrypted: string;
  age_encrypted: string;
  gender_encrypted: string;
  purposeOfVisit_encrypted: string;
}

/**
 * Encrypt patient booking data for storage
 */
export function encryptBookingData(data: PatientBookingData): EncryptedBookingData {
  const encrypted: any = { ...data };
  
  // Encrypt sensitive fields
  encrypted.patientName_encrypted = encrypt(data.patientName);
  encrypted.whatsappNumber_encrypted = encrypt(data.whatsappNumber);
  encrypted.age_encrypted = encrypt(data.age?.toString() || '');
  encrypted.gender_encrypted = encrypt(data.gender || '');
  encrypted.purposeOfVisit_encrypted = encrypt(data.purposeOfVisit || '');
  
  // Remove plain text versions
  delete encrypted.patientName;
  delete encrypted.whatsappNumber;
  delete encrypted.age;
  delete encrypted.gender;
  delete encrypted.purposeOfVisit;
  
  return encrypted;
}

/**
 * Decrypt patient booking data for display
 */
export function decryptBookingData(encryptedData: any): PatientBookingData {
  const decrypted: any = { ...encryptedData };
  
  // Decrypt sensitive fields
  decrypted.patientName = decrypt(encryptedData.patientName_encrypted || encryptedData.patientName || '');
  decrypted.whatsappNumber = decrypt(encryptedData.whatsappNumber_encrypted || encryptedData.whatsappNumber || '');
  
  const ageDecrypted = decrypt(encryptedData.age_encrypted || '');
  decrypted.age = ageDecrypted ? parseInt(ageDecrypted) : null;
  
  decrypted.gender = decrypt(encryptedData.gender_encrypted || encryptedData.gender || '');
  decrypted.purposeOfVisit = decrypt(encryptedData.purposeOfVisit_encrypted || encryptedData.purposeOfVisit || '');
  
  // Remove encrypted versions from display object
  delete decrypted.patientName_encrypted;
  delete decrypted.whatsappNumber_encrypted;
  delete decrypted.age_encrypted;
  delete decrypted.gender_encrypted;
  delete decrypted.purposeOfVisit_encrypted;
  
  return decrypted;
}

/**
 * Check if data is encrypted (has _encrypted suffix fields)
 */
export function isEncrypted(data: any): boolean {
  return !!(
    data.patientName_encrypted ||
    data.whatsappNumber_encrypted ||
    data.age_encrypted ||
    data.gender_encrypted ||
    data.purposeOfVisit_encrypted
  );
}

/**
 * Validate encryption key strength
 */
export function validateEncryptionKey(): boolean {
  const minLength = 32; // Minimum 32 characters for strong encryption
  return ENCRYPTION_KEY.length >= minLength;
}

// Log encryption status on import (only in development)
if (import.meta.env.DEV) {
  console.log('🔐 Encryption Service Loaded');
  console.log('🔑 Key Length:', ENCRYPTION_KEY.length);
  console.log('✅ Key Valid:', validateEncryptionKey());
}
