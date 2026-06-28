// @veritas/rate-limit — public re-exports for the rate-limiting package.
export type { LimitDecision } from "./result.js";
export { allowedDecision, deniedDecision } from "./result.js";

export type { LimiterOptions, RateLimiter } from "./limiter.js";

export { RateLimitError, StorageError } from "./errors.js";

export type { StoreEntry, LimiterStore, StoreOptions } from "./store.js";
export { createLimiterStore } from "./store.js";
