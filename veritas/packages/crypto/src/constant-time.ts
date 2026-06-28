// Constant-time comparison utilities to prevent timing attacks
import { createHash } from "node:crypto";

/**
 * Compare two Uint8Arrays in constant time.
 * Returns true only if both have the same length and identical bytes.
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    // Still iterate to avoid short-circuit timing leak
    let diff = 1;
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
    }
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= (a[i] as number) ^ (b[i] as number);
  }
  return diff === 0;
}

/**
 * Compare two strings in constant time by hashing both first.
 * Safe for secrets, tokens, and digests.
 */
export function constantTimeStringEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return constantTimeEqual(new Uint8Array(ha), new Uint8Array(hb));
}
