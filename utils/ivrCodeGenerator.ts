/**
 * HealQR IVR Code Generator
 *
 * Generates 5-character unique codes for non-smartphone IVR booking.
 * Format: [Initial1][Initial2][3 alphanumeric chars]
 *
 * Example: "Sunil Das" + DOB "1977-12-11" → SD77A
 *
 * IVR-safe characters (no ambiguous chars for voice/DTMF):
 * Letters: A,C,D,E,F,G,H,J,K,L,M,N,P,Q,R,T,U,V,W,X,Y,Z (22)
 * Digits: 2,3,4,6,7,9 (6)
 * Total: 28 chars for positions 3-5
 *
 * Capacity: 26 × 26 × 28³ = ~14.8M unique codes (well over 1M target)
 */

import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase/config';

// IVR-safe characters (avoiding O/0, I/1, B/8, S/5 confusion on phone)
const IVR_SAFE_CHARS = 'ACDEFGHJKLMNPQRTUVWXY234679';

/**
 * Generate a 5-character IVR code from name and DOB
 *
 * @param fullName - Full name of the entity (e.g., "Dr. Sunil Das")
 * @param dob - Date of birth string (e.g., "1977-12-11")
 * @param entityId - Firebase UID of the doctor/clinic/lab
 * @param entityType - Type of entity
 * @returns Promise<string> - 5-character IVR code (e.g., "SD77A")
 */
export async function generateIvrCode(
  fullName: string,
  dob: string,
  entityId: string,
  entityType: 'doctor' | 'clinic' | 'lab' = 'doctor'
): Promise<string> {
  if (!db) throw new Error('Firebase not initialized');

  // Extract initials (strip "Dr." prefix)
  const cleanName = fullName.replace(/^dr\.?\s*/i, '').trim();
  const nameParts = cleanName.split(/\s+/).filter(Boolean);
  const firstInitial = (nameParts[0]?.[0] || 'X').toUpperCase();
  const lastInitial = (nameParts.length > 1
    ? nameParts[nameParts.length - 1][0]
    : nameParts[0]?.[1] || 'X'
  ).toUpperCase();

  // Create seed from DOB for deterministic base
  const dobSeed = hashDob(dob);

  // Try up to 100 attempts to find a unique code
  const maxAttempts = 100;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const suffix = generateSuffix(dobSeed, attempt);
    const code = `${firstInitial}${lastInitial}${suffix}`;

    // Check for collision in Firestore
    const ivrRef = collection(db, 'ivrCodes');
    const q = query(ivrRef, where('code', '==', code));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Code is unique — save it
      await setDoc(doc(db, 'ivrCodes', code), {
        code,
        entityId,
        entityType,
        entityName: fullName,
        dob: dob || '',
        createdAt: serverTimestamp(),
        active: true,
      });
      return code;
    }
  }

  // Fallback: fully random code (extremely rare)
  const fallbackCode = await generateRandomUniqueCode(firstInitial, lastInitial, fullName, dob, entityId, entityType);
  return fallbackCode;
}

/**
 * Hash DOB string to a numeric seed
 */
function hashDob(dob: string): number {
  if (!dob) return Date.now() % 1000000;

  const cleaned = dob.replace(/[^0-9]/g, '');
  let seed = 0;
  for (let i = 0; i < cleaned.length; i++) {
    seed = ((seed << 5) - seed) + cleaned.charCodeAt(i);
    seed = seed & seed; // Convert to 32-bit integer
  }
  return Math.abs(seed);
}

/**
 * Generate 3-char suffix from seed + attempt number using LCG
 */
function generateSuffix(seed: number, attempt: number): string {
  const combined = seed + attempt * 7919; // Prime multiplier for distribution
  let hash = combined;

  let result = '';
  for (let i = 0; i < 3; i++) {
    hash = ((hash * 1103515245 + 12345) >>> 0); // Linear Congruential Generator
    const index = hash % IVR_SAFE_CHARS.length;
    result += IVR_SAFE_CHARS[index];
  }

  return result;
}

/**
 * Generate fully random unique code (fallback)
 */
async function generateRandomUniqueCode(
  init1: string,
  init2: string,
  fullName: string,
  dob: string,
  entityId: string,
  entityType: 'doctor' | 'clinic' | 'lab'
): Promise<string> {
  if (!db) throw new Error('Firebase not initialized');

  for (let i = 0; i < 50; i++) {
    let code = `${init1}${init2}`;
    for (let j = 0; j < 3; j++) {
      code += IVR_SAFE_CHARS[Math.floor(Math.random() * IVR_SAFE_CHARS.length)];
    }

    const ivrRef = collection(db, 'ivrCodes');
    const q = query(ivrRef, where('code', '==', code));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      await setDoc(doc(db, 'ivrCodes', code), {
        code,
        entityId,
        entityType,
        entityName: fullName,
        dob: dob || '',
        createdAt: serverTimestamp(),
        active: true,
      });
      return code;
    }
  }

  // Ultimate fallback with timestamp
  const ts = Date.now().toString(36).slice(-3).toUpperCase();
  const code = `${init1}${init2}${ts}`.slice(0, 5);
  await setDoc(doc(db, 'ivrCodes', code), {
    code,
    entityId,
    entityType,
    entityName: fullName,
    dob: dob || '',
    createdAt: serverTimestamp(),
    active: true,
  });
  return code;
}

/**
 * Lookup entity by IVR code (for IVR system / Cloud Function)
 */
export async function lookupIvrCode(code: string): Promise<{
  entityId: string;
  entityType: string;
  entityName: string;
} | null> {
  if (!db) return null;

  const upperCode = code.toUpperCase().trim();
  const ivrRef = collection(db, 'ivrCodes');
  const q = query(ivrRef, where('code', '==', upperCode), where('active', '==', true));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const data = snapshot.docs[0].data();
  return {
    entityId: data.entityId,
    entityType: data.entityType,
    entityName: data.entityName,
  };
}

/**
 * Validate IVR code format (5 alphanumeric chars, 2 letters + 3 mixed)
 */
export function isValidIvrCode(code: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{3}$/.test(code.toUpperCase().trim());
}
