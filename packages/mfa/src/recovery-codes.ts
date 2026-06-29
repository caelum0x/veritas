// Recovery code generation, hashing, and single-use verification for MFA fallback.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Default number of recovery codes generated per user. */
export const DEFAULT_RECOVERY_CODE_COUNT = 8;

/** Default byte length for each recovery code (yields 10 hex pairs = 20 hex chars). */
const CODE_BYTE_LENGTH = 10;

/** Format: XXXXX-XXXXX (groups of 5 uppercase hex chars). */
function formatCode(raw: string): string {
  const upper = raw.toUpperCase();
  return `${upper.slice(0, 5)}-${upper.slice(5, 10)}-${upper.slice(10, 15)}-${upper.slice(15)}`;
}

/** Strips formatting from a code for comparison. */
export function normalizeCode(code: string): string {
  return code.replace(/[-\s]/g, "").toUpperCase();
}

/** SHA-256 hash of a normalized code, returned as hex. */
export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(normalizeCode(code)).digest("hex");
}

/** A single recovery code with its pre-computed hash. */
export interface RecoveryCode {
  /** Formatted plaintext code — shown to the user once, then discarded. */
  code: string;
  /** SHA-256 hash stored in the database. */
  hash: string;
  /** Whether this code has been used. */
  used: boolean;
}

/**
 * Generates `count` one-time recovery codes.
 * Callers must persist the hashes immediately; the plaintext codes are ephemeral.
 */
export function generateRecoveryCodes(
  count: number = DEFAULT_RECOVERY_CODE_COUNT
): RecoveryCode[] {
  if (count < 1 || count > 100) {
    throw new RangeError("count must be between 1 and 100");
  }

  return Array.from({ length: count }, () => {
    const raw = randomBytes(CODE_BYTE_LENGTH).toString("hex");
    const code = formatCode(raw);
    return {
      code,
      hash: hashRecoveryCode(code),
      used: false,
    };
  });
}

/** Result of attempting to consume a recovery code. */
export interface RecoveryCodeVerifyResult {
  valid: boolean;
  /** Index of the matched (now-consumed) code within the provided list. */
  matchedIndex?: number;
  /** Updated list with the matched code marked as used. */
  updatedCodes?: RecoveryCode[];
}

/**
 * Verifies a recovery code against a list of stored hashes.
 * Marks the first matching unused code as used.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyRecoveryCode(
  token: string,
  storedCodes: ReadonlyArray<Readonly<RecoveryCode>>
): RecoveryCodeVerifyResult {
  const candidateHash = Buffer.from(hashRecoveryCode(token), "hex");
  let matchedIndex: number | undefined;

  for (let i = 0; i < storedCodes.length; i++) {
    const stored = storedCodes[i] as RecoveryCode;
    if (stored.used) continue;
    const storedHashBuf = Buffer.from(stored.hash, "hex");
    if (
      candidateHash.length === storedHashBuf.length &&
      timingSafeEqual(candidateHash, storedHashBuf)
    ) {
      matchedIndex = i;
      break;
    }
  }

  if (matchedIndex === undefined) {
    return { valid: false };
  }

  const updatedCodes: RecoveryCode[] = storedCodes.map((c, i) =>
    i === matchedIndex ? { ...c, used: true } : { ...c }
  );

  return { valid: true, matchedIndex, updatedCodes };
}

/** Returns the number of remaining (unused) recovery codes. */
export function countRemainingCodes(
  codes: ReadonlyArray<Readonly<RecoveryCode>>
): number {
  return codes.filter((c) => !c.used).length;
}
