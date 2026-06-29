// code.ts: referral code generation and validation utilities.
import { z } from "zod";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export const ReferralCodeSchema = z.string().regex(/^[A-Z2-9]{6,12}$/);
export type ReferralCode = z.infer<typeof ReferralCodeSchema>;

function randomChar(alphabet: string): string {
  const index = Math.floor(Math.random() * alphabet.length);
  return alphabet[index]!;
}

export function generateCode(prefix?: string): ReferralCode {
  const chars = Array.from({ length: CODE_LENGTH }, () => randomChar(CODE_ALPHABET)).join("");
  const code = prefix ? `${prefix.toUpperCase()}${chars}` : chars;
  return code as ReferralCode;
}

export function generateUserCode(userId: string): ReferralCode {
  // Derive a deterministic prefix from userId (last 3 chars uppercased, filtered to alphabet)
  const suffix = userId.slice(-3).toUpperCase().replace(/[^A-Z0-9]/g, "X");
  const randomPart = Array.from({ length: 6 }, () => randomChar(CODE_ALPHABET)).join("");
  return `${suffix}${randomPart}` as ReferralCode;
}

export function isValidCode(code: string): code is ReferralCode {
  return ReferralCodeSchema.safeParse(code).success;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z2-9]/g, "");
}

export function formatCodeDisplay(code: ReferralCode): string {
  // Format as XXXX-XXXX for display readability
  if (code.length === CODE_LENGTH) {
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  }
  return code;
}
