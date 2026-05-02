// Universal HQR number helpers.
//
// New format (April 2026): variable-length, no zero-padding.
//   HQR1, HQR42, HQR380, HQR1024, ..., up to HQR10000000 (1 crore).
//
// Old format (legacy printed standees): zero-padded to 5 digits, e.g. HQR00380.
// We keep backward compatibility on lookup via normaliseQR(), so existing
// physical stickers continue to resolve to the new canonical form.
//
// Rules:
//   - The HQR number IS the IVR code. Patients dial the IVR line and enter
//     the digits (with or without leading zeros — leading zeros are stripped).
//   - Hard cap: 10,000,000 (one crore). Validate before issuing.

export const HQR_PREFIX = 'HQR';
export const MAX_HQR = 10_000_000;

/**
 * Build the canonical, unpadded HQR string for a given integer.
 *   formatQR(380)  -> "HQR380"
 *   formatQR(1)    -> "HQR1"
 */
export function formatQR(n: number): string {
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`formatQR: invalid number ${n}`);
  }
  return `${HQR_PREFIX}${Math.trunc(n)}`;
}

/**
 * Extract the integer from any HQR-ish string. Returns null on garbage.
 *   parseQRNumber("HQR380")    -> 380
 *   parseQRNumber("HQR00380")  -> 380   (legacy padded form)
 *   parseQRNumber("hqr 0380")  -> 380   (whitespace / case-insensitive)
 *   parseQRNumber("380")       -> 380   (digits-only, e.g. IVR keypad input)
 *   parseQRNumber("")          -> null
 */
export function parseQRNumber(input: string): number | null {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

/**
 * Normalise any HQR-ish input to its canonical unpadded form.
 *   normaliseQR("HQR380")    -> "HQR380"
 *   normaliseQR("HQR00380")  -> "HQR380"   (legacy printed standees)
 *   normaliseQR("380")       -> "HQR380"   (IVR keypad input)
 *   normaliseQR("")          -> ""         (let caller decide)
 */
export function normaliseQR(input: string): string {
  const n = parseQRNumber(input);
  return n === null ? '' : formatQR(n);
}
