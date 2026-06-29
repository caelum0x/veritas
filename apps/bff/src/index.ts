// Public surface of @veritas/bff — re-exports middleware, view-models, and error types

export { createAuthMiddleware } from "./middleware/auth.js";
export type { BffAuthEnv, AuthMiddlewareDeps } from "./middleware/auth.js";

export { createErrorHandler, errorBoundary } from "./middleware/error.js";
export type { ErrorMiddlewareDeps } from "./middleware/error.js";

export {
  BffError,
  UpstreamApiError,
  BffSessionError,
  BffValidationError,
  BffUpstreamUnavailableError,
  isBffError,
  isUpstreamApiError,
} from "./errors.js";

export {
  toClaimViewModel,
  toSourceViewModel,
  toOrderViewModel,
  toReportViewModel,
  toUsageSummaryViewModel,
  toWebhookViewModel,
  toApiKeyViewModel,
  toAgentViewModel,
  toBillingViewModel,
} from "./view-model.js";

export type {
  ClaimViewModel,
  SourceViewModel,
  OrderViewModel,
  ReportViewModel,
  UsageSummaryViewModel,
  WebhookViewModel,
  ApiKeyViewModel,
  AgentViewModel,
  BillingViewModel,
} from "./view-model.js";
