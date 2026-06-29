// Coupon code generation and normalization utilities.
import { z } from "zod";

export const COUPON_CODE_REGEX = /^[A-Z0-9_-]{3,32}$/;

export const CouponCodeSchema = z.string().regex(COUPON_CODE_REGEX, {
  message: "Code must be 3-32 uppercase alphanumeric characters, hyphens, or underscores",
});
export type CouponCode = z.infer<typeof CouponCodeSchema>;

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit confusable I,O,1,0

/** Generate a random coupon code of the given length (default 8). */
export function generateCode(length = 8): CouponCode {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return result as CouponCode;
}

/** Normalize raw user input to a canonical coupon code. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "-");
}

/** Parse and validate a coupon code string, returning null on failure. */
export function parseCode(raw: string): CouponCode | null {
  const normalized = normalizeCode(raw);
  const result = CouponCodeSchema.safeParse(normalized);
  return result.success ? result.data : null;
}

/** Generate a prefixed coupon code, e.g. "LAUNCH-XXXXXXXX". */
export function generatePrefixedCode(prefix: string, length = 8): CouponCode {
  const clean = prefix.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
  const suffix = generateCode(length);
  return `${clean}-${suffix}` as CouponCode;
}
