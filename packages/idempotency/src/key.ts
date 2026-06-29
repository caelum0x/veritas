// Idempotency key parsing, validation, and normalization.
import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";

export const IDEMPOTENCY_KEY_HEADER = "idempotency-key";
export const MAX_KEY_LENGTH = 255;
export const MIN_KEY_LENGTH = 1;

export const idempotencyKeySchema = z
  .string()
  .min(MIN_KEY_LENGTH, "Idempotency key must not be empty")
  .max(MAX_KEY_LENGTH, `Idempotency key must not exceed ${MAX_KEY_LENGTH} characters`)
  .regex(/^[\x20-\x7E]+$/, "Idempotency key must contain only printable ASCII characters");

export type IdempotencyKey = z.infer<typeof idempotencyKeySchema>;

export interface ParsedIdempotencyKey {
  readonly raw: string;
  readonly normalized: string;
}

/** Parse and normalize an idempotency key from a raw string value. */
export function parseIdempotencyKey(raw: unknown): Result<ParsedIdempotencyKey, string> {
  const result = idempotencyKeySchema.safeParse(raw);
  if (!result.success) {
    return err(result.error.issues[0]?.message ?? "Invalid idempotency key");
  }
  const normalized = result.data.trim();
  return ok({ raw: result.data, normalized });
}

/** Extract idempotency key from Express-style request headers. */
export function extractKeyFromHeaders(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  const value = headers[IDEMPOTENCY_KEY_HEADER];
  if (Array.isArray(value)) return value[0];
  return value;
}
