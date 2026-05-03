/**
 * HealQR ID Generation System
 *
 * Format: HQR-PINCODE-SERIAL-TYPE
 *
 * Examples:
 * - Doctor: HQR-711110-0029-DR
 * - Business Associate: HQR-711110-0029-BA
 * - Patient Booking: HQR-711110-251210-0523-P
 */

import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase/config';

/**
 * Generate unique Doctor Code
 * Format: HQR-PINCODE-SERIAL-DR
 *
 * @param pincode - Doctor's residential pincode (6 digits)
 * @returns Promise<string> - Unique doctor code
 *
 * @example
 * generateDoctorCode('711110') -> 'HQR-711110-0029-DR'
 */
export async function generateDoctorCode(pincode: string): Promise<string> {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  // Validate pincode (must be 6 digits)
  if (!/^\d{6}$/.test(pincode)) {
    throw new Error('Invalid pincode. Must be 6 digits.');
  }

  try {
    // Query to find the highest serial number for this pincode
    const doctorsRef = collection(db, 'doctors');
    const prefix = `HQR-${pincode}-`;

    // Get all doctors with this pincode prefix
    const q = query(
      doctorsRef,
      where('doctorCode', '>=', prefix),
      where('doctorCode', '<=', `${prefix}\uf8ff`), // \uf8ff is highest unicode character
      orderBy('doctorCode', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    let nextSerial = 1; // Default: first doctor in this pincode

    if (!snapshot.empty) {
      const lastCode = snapshot.docs[0].data().doctorCode;
      // Extract serial number from: HQR-711110-0029-DR
      const match = lastCode.match(/HQR-\d{6}-(\d{4})-DR/);
      if (match) {
        nextSerial = parseInt(match[1]) + 1;
      }
    }

    // Format serial as 4-digit number (e.g., 0001, 0029, 0150)
    const serialFormatted = nextSerial.toString().padStart(4, '0');

    // Generate final code: HQR-711110-0029-DR
    const doctorCode = `HQR-${pincode}-${serialFormatted}-DR`;


    return doctorCode;

  } catch (error) {
    console.error('❌ Error generating doctor code:', error);
    // Fallback: Generate based on timestamp
    const timestamp = Date.now().toString().slice(-4);
    return `HQR-${pincode}-${timestamp}-DR`;
  }
}

/**
 * Generate unique Business Associate Code
 * Format: HQR-PINCODE-SERIAL-BA
 *
 * @param pincode - BA's operational pincode (6 digits)
 * @returns Promise<string> - Unique BA code
 *
 * @example
 * generateBACode('711110') -> 'HQR-711110-0029-BA'
 */
export async function generateBACode(pincode: string): Promise<string> {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  // Validate pincode (must be 6 digits)
  if (!/^\d{6}$/.test(pincode)) {
    throw new Error('Invalid pincode. Must be 6 digits.');
  }

  try {
    // Query to find the highest serial number for this pincode
    const basRef = collection(db, 'businessAssociates');
    const prefix = `HQR-${pincode}-`;

    // Get all BAs with this pincode prefix
    const q = query(
      basRef,
      where('baCode', '>=', prefix),
      where('baCode', '<=', `${prefix}\uf8ff`),
      orderBy('baCode', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    let nextSerial = 1; // Default: first BA in this pincode

    if (!snapshot.empty) {
      const lastCode = snapshot.docs[0].data().baCode;
      // Extract serial number from: HQR-711110-0029-BA
      const match = lastCode.match(/HQR-\d{6}-(\d{4})-BA/);
      if (match) {
        nextSerial = parseInt(match[1]) + 1;
      }
    }

    // Format serial as 4-digit number
    const serialFormatted = nextSerial.toString().padStart(4, '0');

    // Generate final code: HQR-711110-0029-BA
    const baCode = `HQR-${pincode}-${serialFormatted}-BA`;


    return baCode;

  } catch (error) {
    console.error('❌ Error generating BA code:', error);
    // Fallback: Generate based on timestamp
    const timestamp = Date.now().toString().slice(-4);
    return `HQR-${pincode}-${timestamp}-BA`;
  }
}

/**
 * Generate unique Clinic Code
 * Format: HQR-PINCODE-SERIAL-BRANCH-CLN
 *
 * @param pincode - Clinic's pincode (6 digits)
 * @returns Promise<string> - Unique clinic code
 *
 * @example
 * generateClinicCode('700001') -> 'HQR-700001-0001-001-CLN'
 */
export async function generateClinicCode(pincode: string): Promise<string> {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  // Validate pincode (must be 6 digits)
  if (!/^\d{6}$/.test(pincode)) {
    throw new Error('Invalid pincode. Must be 6 digits.');
  }

  try {
    // Query to find the highest serial number for this pincode
    const clinicsRef = collection(db, 'clinics');
    const prefix = `HQR-${pincode}-`;

    // Get all clinics with this pincode prefix
    const q = query(
      clinicsRef,
      where('clinicCode', '>=', prefix),
      where('clinicCode', '<=', `${prefix}\uf8ff`),
      orderBy('clinicCode', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    let nextSerial = 1; // Default: first clinic in this pincode

    if (!snapshot.empty) {
      const lastCode = snapshot.docs[0].data().clinicCode;
      // Extract serial number from: HQR-700001-0001-001-CLN (new) or HQR-700001-0001-CLN (old)
      const matchNew = lastCode.match(/HQR-\d{6}-(\d{4})-\d{3}-CLN/);
      const matchOld = lastCode.match(/HQR-\d{6}-(\d{4})-CLN/);
      const match = matchNew || matchOld;
      if (match) {
        nextSerial = parseInt(match[1]) + 1;
      }
    }

    // Format serial as 4-digit number
    const serialFormatted = nextSerial.toString().padStart(4, '0');

    // Generate final code: HQR-PINCODE-SERIAL-BRANCH-CLN
    // Branch 001 = main branch (always starts with 001)
    const clinicCode = `HQR-${pincode}-${serialFormatted}-001-CLN`;


    return clinicCode;

  } catch (error) {
    console.error('❌ Error generating clinic code:', error);
    // Fallback: Generate based on timestamp
    const timestamp = Date.now().toString().slice(-4);
    return `HQR-${pincode}-${timestamp}-001-CLN`;
  }
}

/**
 * Generate a location-aware clinic code given a base clinicCode and a locationId.
 * If branchPincode is provided, the branch code will use the branch's own pincode
 * instead of the main clinic's pincode (for geocoding).
 *
 * Example:
 *   base: HQR-700008-0001-001-CLN, locationId: 002, branchPincode: 711110
 *   result: HQR-711110-0001-002-CLN
 */
export function generateClinicLocationCode(clinicCode: string, locationId: string | number): string {
  if (!clinicCode) return clinicCode;
  const branchNum = String(locationId).trim().padStart(3, '0');
  if (!branchNum) return clinicCode;

  // Extract serial from clinic code (both old and new formats)
  const newFormatMatch = clinicCode.match(/^HQR-(\d{6})-(\d{4})-\d{3}-CLN$/);
  const oldFormatMatch = clinicCode.match(/^HQR-(\d{6})-(\d{4})-CLN$/);
  const match = newFormatMatch || oldFormatMatch;

  if (match) {
    const pincode = match[1]; // Always use parent clinic pincode
    const serial = match[2];
    return `HQR-${pincode}-${serial}-${branchNum}-CLN`;
  }

  // Fallback: just append
  if (clinicCode.endsWith('-CLN')) {
    return clinicCode.replace(/-CLN$/, `-${branchNum}-CLN`);
  }
  return `${clinicCode}-${branchNum}`;
}

/**
 * Generate unique Lab/Diagnostic Center Code
 * Format: HQR-PINCODE-SERIAL-LAB
 *
 * @param pincode - 6-digit Indian pincode
 * @returns Promise<string> - Unique lab code
 *
 * @example
 * generateLabCode('700001') -> 'HQR-700001-0001-LAB'
 */
export async function generateLabCode(pincode: string): Promise<string> {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  if (!/^\d{6}$/.test(pincode)) {
    throw new Error('Invalid pincode. Must be 6 digits.');
  }

  try {
    const labsRef = collection(db, 'labs');
    const prefix = `HQR-${pincode}-`;

    const q = query(
      labsRef,
      where('labCode', '>=', prefix),
      where('labCode', '<=', `${prefix}\uf8ff`),
      orderBy('labCode', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    let nextSerial = 1;

    if (!snapshot.empty) {
      const lastCode = snapshot.docs[0].data().labCode;
      const match = lastCode.match(/HQR-\d{6}-(\d{4})-LAB/);
      if (match) {
        nextSerial = parseInt(match[1]) + 1;
      }
    }

    const serialFormatted = nextSerial.toString().padStart(4, '0');
    const labCode = `HQR-${pincode}-${serialFormatted}-LAB`;

    return labCode;

  } catch (error) {
    console.error('❌ Error generating lab code:', error);
    const timestamp = Date.now().toString().slice(-4);
    return `HQR-${pincode}-${timestamp}-LAB`;
  }
}

/**
 * Generate unique Patient Booking ID
 * Format: HQR-DOCTORCODE-YYMMDD-SERIAL-P
 *
 * @param doctorCode - Doctor's unique code (e.g., HQR-711110-0029-DR)
 * @param bookingDate - Date of booking (optional, defaults to today)
 * @returns Promise<string> - Unique booking ID
 *
 * @example
 * generateBookingId('HQR-711110-0029-DR') -> 'HQR-711110-0029-DR-251210-0523-P'
 */
export async function generateBookingId(doctorCode: string, bookingDate?: Date): Promise<string> {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  // Validate doctor code format
  if (!/^HQR-\d{6}-\d{4}-DR$/.test(doctorCode)) {
    throw new Error('Invalid doctor code format. Expected: HQR-PINCODE-SERIAL-DR');
  }

  const date = bookingDate || new Date();

  // Format date as YYMMDD (e.g., 251210 for Dec 10, 2025)
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  try {
    // Query to find the highest serial number for this doctor + date
    const bookingsRef = collection(db, 'bookings');
    const prefix = `${doctorCode}-${dateStr}-`;

    // Get all bookings with this doctor code + date prefix
    const q = query(
      bookingsRef,
      where('bookingId', '>=', prefix),
      where('bookingId', '<=', `${prefix}\uf8ff`),
      orderBy('bookingId', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    let nextSerial = 1; // Default: first booking for this date

    if (!snapshot.empty) {
      const lastId = snapshot.docs[0].data().bookingId;
      // Extract serial number from: HQR-711110-0029-DR-251210-0523-P
      const match = lastId.match(/HQR-\d{6}-\d{4}-DR-\d{6}-(\d{4})-P/);
      if (match) {
        nextSerial = parseInt(match[1]) + 1;
      }
    }

    // Format serial as 4-digit number
    const serialFormatted = nextSerial.toString().padStart(4, '0');

    // Generate final ID: HQR-711110-0029-DR-251210-0523-P
    const bookingId = `${doctorCode}-${dateStr}-${serialFormatted}-P`;


    return bookingId;

  } catch (error) {
    console.error('❌ Error generating booking ID:', error);
    // Fallback: Generate based on timestamp
    const timestamp = Date.now().toString().slice(-4);
    return `${doctorCode}-${dateStr}-${timestamp}-P`;
  }
}

/**
 * Generate unique Paramedical Booking ID (no strict provider-code validation).
 * Format: HQR-PARA-{paramedicalIdShort}-YYMMDD-SERIAL-P
 *
 * Used when provider is a paramedical (different code conventions than doctors).
 */
export async function generateParamedicalBookingId(
  paramedicalId: string,
  bookingDate?: Date,
): Promise<string> {
  if (!db) {
    throw new Error('Firebase not initialized');
  }

  const date = bookingDate || new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const idShort = (paramedicalId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'PARA00';
  const prefix = `HQR-PARA-${idShort}-${dateStr}-`;

  try {
    const bookingsRef = collection(db, 'paramedicalBookings');
    const q = query(
      bookingsRef,
      where('bookingId', '>=', prefix),
      where('bookingId', '<=', `${prefix}\uf8ff`),
      orderBy('bookingId', 'desc'),
      limit(1),
    );
    const snapshot = await getDocs(q);

    let nextSerial = 1;
    if (!snapshot.empty) {
      const lastId = snapshot.docs[0].data().bookingId as string;
      const match = lastId.match(/-(\d{4})-P$/);
      if (match) nextSerial = parseInt(match[1]) + 1;
    }

    const serialFormatted = nextSerial.toString().padStart(4, '0');
    return `${prefix}${serialFormatted}-P`;
  } catch (error) {
    console.error('❌ Error generating paramedical booking ID:', error);
    const ts = Date.now().toString().slice(-4);
    return `${prefix}${ts}-P`;
  }
}

/**
 * Validate Doctor Code format
 * @param code - Code to validate
 * @returns boolean - True if valid
 */
export function isValidDoctorCode(code: string): boolean {
  return /^HQR-\d{6}-\d{4}-DR$/.test(code);
}

/**
 * Validate BA Code format
 * @param code - Code to validate
 * @returns boolean - True if valid
 */
export function isValidBACode(code: string): boolean {
  return /^HQR-\d{6}-\d{4}-BA$/.test(code);
}

/**
 * Validate Booking ID format
 * @param id - ID to validate
 * @returns boolean - True if valid
 */
export function isValidBookingId(id: string): boolean {
  return /^HQR-\d{6}-\d{6}-\d{4}-P$/.test(id);
}

/**
 * Extract pincode from any HQR code
 * @param code - HQR code
 * @returns string | null - Extracted pincode or null if invalid
 */
export function extractPincodeFromCode(code: string): string | null {
  const match = code.match(/^HQR-(\d{6})-/);
  return match ? match[1] : null;
}

/**
 * Extract serial number from any HQR code
 * @param code - HQR code
 * @returns number | null - Extracted serial number or null if invalid
 */
export function extractSerialFromCode(code: string): number | null {
  // For doctor/BA codes: HQR-711110-0029-DR
  let match = code.match(/^HQR-\d{6}-(\d{4})-(DR|BA)$/);
  if (match) return parseInt(match[1]);

  // For booking IDs: HQR-711110-251210-0523-P
  match = code.match(/^HQR-\d{6}-\d{6}-(\d{4})-P$/);
  if (match) return parseInt(match[1]);

  return null;
}

/**
 * Extract date from booking ID
 * @param bookingId - Booking ID
 * @returns Date | null - Extracted date or null if invalid
 */
export function extractDateFromBookingId(bookingId: string): Date | null {
  const match = bookingId.match(/^HQR-\d{6}-(\d{6})-\d{4}-P$/);
  if (!match) return null;

  const dateStr = match[1]; // e.g., 251210
  const year = 2000 + parseInt(dateStr.slice(0, 2)); // 25 -> 2025
  const month = parseInt(dateStr.slice(2, 4)) - 1; // 12 -> 11 (0-indexed)
  const day = parseInt(dateStr.slice(4, 6)); // 10

  return new Date(year, month, day);
}
