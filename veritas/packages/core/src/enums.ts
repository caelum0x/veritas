// Shared domain enums and their value-set guards.

/** Outcome of verifying a claim against sources. */
export const Verdict = {
  SUPPORTED: "SUPPORTED",
  REFUTED: "REFUTED",
  UNVERIFIABLE: "UNVERIFIABLE",
} as const;
export type Verdict = (typeof Verdict)[keyof typeof Verdict];

/** Lifecycle of a paid order settled in USDC. */
export const OrderStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FULFILLED: "FULFILLED",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
  FAILED: "FAILED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/** Lifecycle of an asynchronous verification job. */
export const JobStatus = {
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

/** How trustworthy a source is judged to be. */
export const SourceTier = {
  PRIMARY: "PRIMARY",
  SECONDARY: "SECONDARY",
  TERTIARY: "TERTIARY",
  UNKNOWN: "UNKNOWN",
} as const;
export type SourceTier = (typeof SourceTier)[keyof typeof SourceTier];

/** Build a guard that checks membership in an enum's value set. */
function makeGuard<T extends string>(obj: Record<string, T>) {
  const set = new Set<string>(Object.values(obj));
  return (value: unknown): value is T => typeof value === "string" && set.has(value);
}

export const isVerdict = makeGuard(Verdict);
export const isOrderStatus = makeGuard(OrderStatus);
export const isJobStatus = makeGuard(JobStatus);
export const isSourceTier = makeGuard(SourceTier);
