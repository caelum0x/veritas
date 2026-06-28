// Shared types for the idempotency module.
import type { IdempotencyKey } from "./key.js";

export type IdempotencyStatus = "in_flight" | "complete" | "failed";

export interface IdempotencyRecord {
  readonly key: IdempotencyKey;
  readonly fingerprint: string;
  readonly status: IdempotencyStatus;
  readonly responseStatus: number | undefined;
  readonly responseBody: unknown;
  readonly responseHeaders: Readonly<Record<string, string>>;
  readonly createdAt: number;
  readonly completedAt: number | undefined;
  readonly expiresAt: number | undefined;
}

export interface IdempotencyContext {
  readonly key: IdempotencyKey;
  readonly fingerprint: string;
  readonly record: IdempotencyRecord | undefined;
}

export interface IdempotencyResponse {
  readonly status: number;
  readonly body: unknown;
  readonly headers: Readonly<Record<string, string>>;
}
