// Redaction helpers to strip secrets from logs and error payloads.

import { isObject } from "./guards.js";

/** Default substring keys (case-insensitive) treated as sensitive. */
export const DEFAULT_SENSITIVE_KEYS: readonly string[] = [
  "password",
  "secret",
  "token",
  "apikey",
  "api_key",
  "authorization",
  "privatekey",
  "private_key",
  "mnemonic",
  "seed",
];

const PLACEHOLDER = "[REDACTED]";

/** Mask a string, revealing only the last `visible` characters. */
export function maskString(value: string, visible = 4): string {
  if (value.length <= visible) return PLACEHOLDER;
  return `${PLACEHOLDER}${value.slice(-visible)}`;
}

/**
 * Recursively redact values whose key matches a sensitive substring.
 * Returns a new structure; the input is never mutated.
 */
export function redact(
  value: unknown,
  sensitiveKeys: readonly string[] = DEFAULT_SENSITIVE_KEYS,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, sensitiveKeys));
  }
  if (isObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      out[key] = isSensitiveKey(key, sensitiveKeys)
        ? PLACEHOLDER
        : redact(v, sensitiveKeys);
    }
    return out;
  }
  return value;
}

function isSensitiveKey(key: string, sensitiveKeys: readonly string[]): boolean {
  const lower = key.toLowerCase();
  return sensitiveKeys.some((s) => lower.includes(s));
}
