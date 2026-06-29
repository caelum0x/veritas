// Public surface re-export for @veritas/gateway-core

export type { HttpMethod, RouteMatch, Route, CreateRoute, RetryPolicy, TimeoutPolicy } from "./route.js";
export { HttpMethodSchema, RouteMatchSchema, RouteSchema, CreateRouteSchema, RetryPolicySchema, TimeoutPolicySchema, rewritePath as rewriteRoutePath } from "./route.js";

export type { Router, IncomingRequest, MatchedRoute } from "./router.js";

export type { ProxyResponse, ProxyRequest, Proxy, ProxyError as ProxyErrorType } from "./proxy.js";
export { toProxyError, mergeHeaders } from "./proxy.js";

export type { Upstream, UpstreamState, LoadBalancingStrategy } from "./upstream.js";
export { UpstreamRegistry, UpstreamSchema, LoadBalancingStrategySchema } from "./upstream.js";

export type { CircuitBreakerOptions, CircuitBreakerError } from "./circuit-breaker.js";
export { CircuitBreaker } from "./circuit-breaker.js";
export type { CircuitState } from "./circuit-breaker.js";

export type { RetryPolicy as GatewayRetryPolicy, AttemptFn, RetryResult } from "./retry.js";
export { withGatewayRetry, isRetryableStatus, DEFAULT_RETRY_POLICY } from "./retry.js";

export type { AggregatorOptions, AggregatedResponse } from "./aggregator.js";
export { aggregate } from "./aggregator.js";

export type { GatewayRequest, GatewayResponse, RequestTransformer, ResponseTransformer, TransformPipeline } from "./transform.js";
export {
  applyRequestTransforms,
  applyResponseTransforms,
  addRequestHeader,
  removeRequestHeader,
  addResponseHeader,
  rewritePath,
  injectBodyField,
  buildPipeline,
} from "./transform.js";

export type { AuthContext, AuthFilterConfig, TokenVerifier, ApiKeyVerifier, AuthFilterDeps } from "./auth-filter.js";
export { runAuthFilter } from "./auth-filter.js";

export type { RateLimitPolicy, RateLimitResult, RateLimitCheck, RateFilterConfig } from "./rate-filter.js";
export { subjectKeyExtractor, ipKeyExtractor, runRateFilter, rateLimitHeaders } from "./rate-filter.js";

export type { CorsOptions, CorsResult } from "./cors.js";
export { CorsOptionsSchema, evaluateCors, defaultCorsOptions } from "./cors.js";

export type { HeaderMutation, HeaderPolicy, HeaderMap } from "./headers.js";
export {
  HeaderMutationSchema,
  HeaderPolicySchema,
  applyMutation,
  applyRequestPolicy,
  applyResponsePolicy,
  securityHeaders,
  defaultHeaderPolicy,
} from "./headers.js";

export {
  GatewayError,
  UpstreamUnavailableError,
  CircuitOpenError,
  UpstreamTimeoutError,
  RouteNotFoundError,
  ProxyError,
  AggregationError,
  isGatewayError,
  isUpstreamUnavailableError,
  isCircuitOpenError,
  isRouteNotFoundError,
} from "./errors.js";
