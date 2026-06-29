// Redact secrets and PII from log fields before they are serialised.

import { redact as coreRedact, DEFAULT_SENSITIVE_KEYS } from "@veritas/core";
import { LogFields } from "./logger.js";

/** Keys treated as sensitive in addition to the core defaults. */
const EXTRA_SENSITIVE_KEYS: ReadonlyArray<string> = [
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "privateKey",
  "mnemonic",
  "seedPhrase",
  "ssn",
  "dob",
  "creditCard",
  "cvv",
];

const ALL_SENSITIVE_KEYS: ReadonlySet<string> = new Set([
  ...DEFAULT_SENSITIVE_KEYS,
  ...EXTRA_SENSITIVE_KEYS,
]);

/**
 * Returns a shallow-redacted copy of `fields` where any key matching a known
 * sensitive pattern is replaced with `[REDACTED]`.  Nested objects are walked
 * one level deep.
 */
export function redactFields(fields: LogFields): LogFields {
  return coreRedact(fields, [...ALL_SENSITIVE_KEYS]) as LogFields;
}

/**
 * Returns true when `key` (case-insensitive) is considered sensitive and
 * should be redacted from log output.
 */
export function isSensitiveKey(key: string): boolean {
  return ALL_SENSITIVE_KEYS.has(key.toLowerCase());
}
