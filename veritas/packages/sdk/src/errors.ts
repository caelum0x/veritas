// Public error exports: re-exports HTTP error classes and adds SDK-level error types.
export {
  SdkHttpError,
  SdkNetworkError,
  SdkTimeoutError,
  SdkRateLimitedError,
  statusToCode,
} from "./http/errors.js";
export type { SdkErrorCode } from "./http/errors.js";

/** Thrown when polling for order completion times out. */
export class WaitForCompletionTimeoutError extends Error {
  readonly orderId: string;
  readonly elapsedMs: number;

  constructor(orderId: string, elapsedMs: number) {
    super(
      `Timed out waiting for order ${orderId} to complete after ${elapsedMs}ms`
    );
    this.name = "WaitForCompletionTimeoutError";
    this.orderId = orderId;
    this.elapsedMs = elapsedMs;
  }
}

/** Thrown when a delivered report payload cannot be parsed. */
export class ReportParseError extends Error {
  readonly raw: unknown;

  constructor(message: string, raw: unknown) {
    super(message);
    this.name = "ReportParseError";
    this.raw = raw;
  }
}

/** Thrown when a CAP hire flow encounters an unrecoverable error. */
export class CapHireError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "CapHireError";
    this.cause = cause;
  }
}
