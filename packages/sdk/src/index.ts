// Public entry-point for @veritas/sdk — re-exports all public symbols.

// Config
export { resolveConfig, SdkConfigSchema } from "./config.js";
export type { SdkConfig, SdkConfigInput } from "./config.js";

// Transport (interface + fetch impl)
export type { Transport, RequestOptions, RawResponse } from "./http/transport.js";
export { FetchTransport } from "./http/fetch-transport.js";

// HTTP errors (low-level)
export {
  SdkHttpError,
  SdkNetworkError,
  SdkTimeoutError,
  SdkRateLimitedError,
  statusToCode,
} from "./http/errors.js";
export type { SdkErrorCode } from "./http/errors.js";

// SDK-level errors (public surface)
export {
  WaitForCompletionTimeoutError,
  ReportParseError,
  CapHireError,
} from "./errors.js";

// Public types
export type {
  Order,
  Delivery,
  VerificationReport,
  Agent,
  Service,
  WaitForCompletionOptions,
  HireResult,
  CapHireOptions,
  CursorPageOptions,
  SdkPage,
} from "./types.js";

// A2A helpers
export { waitForCompletion } from "./a2a/wait-for-completion.js";
export type { OrderFetcher } from "./a2a/wait-for-completion.js";
export { readReport, tryReadReport } from "./a2a/report-reader.js";
