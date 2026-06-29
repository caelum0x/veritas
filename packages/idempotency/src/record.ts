// Idempotency record — serializable snapshot of a completed request/response.
import { z } from "zod";

export const IdempotencyStatus = {
  InFlight: "in_flight",
  Completed: "completed",
  Failed: "failed",
} as const;

export type IdempotencyStatus = (typeof IdempotencyStatus)[keyof typeof IdempotencyStatus];

export const idempotencyStatusSchema = z.enum(["in_flight", "completed", "failed"]);

export const idempotencyRecordSchema = z.object({
  key: z.string(),
  fingerprint: z.string(),
  status: idempotencyStatusSchema,
  statusCode: z.number().int().min(100).max(599).optional(),
  responseBody: z.unknown().optional(),
  responseHeaders: z.record(z.string()).optional(),
  createdAt: z.number(),
  completedAt: z.number().optional(),
  requestPath: z.string(),
  requestMethod: z.string(),
});

export type IdempotencyRecord = z.infer<typeof idempotencyRecordSchema>;

/** Create a new in-flight idempotency record. */
export function createInFlightRecord(params: {
  readonly key: string;
  readonly fingerprint: string;
  readonly requestPath: string;
  readonly requestMethod: string;
}): IdempotencyRecord {
  return {
    key: params.key,
    fingerprint: params.fingerprint,
    status: IdempotencyStatus.InFlight,
    createdAt: Date.now(),
    requestPath: params.requestPath,
    requestMethod: params.requestMethod,
  };
}

/** Return a completed copy of the record with response data. */
export function completeRecord(
  record: IdempotencyRecord,
  params: {
    readonly statusCode: number;
    readonly responseBody: unknown;
    readonly responseHeaders: Record<string, string>;
  },
): IdempotencyRecord {
  return {
    ...record,
    status: IdempotencyStatus.Completed,
    statusCode: params.statusCode,
    responseBody: params.responseBody,
    responseHeaders: params.responseHeaders,
    completedAt: Date.now(),
  };
}

/** Return a failed copy of the record. */
export function failRecord(record: IdempotencyRecord): IdempotencyRecord {
  return { ...record, status: IdempotencyStatus.Failed, completedAt: Date.now() };
}
