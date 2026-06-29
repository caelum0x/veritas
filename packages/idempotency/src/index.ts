// Public surface re-export for @veritas/idempotency.
export {
  IDEMPOTENCY_KEY_HEADER,
  MAX_KEY_LENGTH,
  MIN_KEY_LENGTH,
  idempotencyKeySchema,
  parseIdempotencyKey,
  extractKeyFromHeaders,
} from "./key.js";
export type { IdempotencyKey, ParsedIdempotencyKey } from "./key.js";

export {
  IdempotencyStatus,
  idempotencyStatusSchema,
  idempotencyRecordSchema,
  createInFlightRecord,
  completeRecord,
  failRecord,
} from "./record.js";
export type { IdempotencyRecord as IdempotencyRecordDto } from "./record.js";

export type {
  IdempotencyStatus as IdempotencyStatusType,
  IdempotencyRecord,
  IdempotencyContext,
  IdempotencyResponse,
} from "./types.js";
