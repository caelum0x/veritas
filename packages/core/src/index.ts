// @veritas/core: shared kernel re-exporting the public surface.

// Result & Option
export {
  type Result,
  type Ok,
  type Err,
  ok,
  err,
  isOk,
  isErr,
  map,
  mapErr,
  flatMap,
  unwrap,
  unwrapOr,
} from "./result.js";
export {
  type Option,
  type Some,
  type None,
  some,
  none,
  fromNullable,
  isSome,
  isNone,
  mapOption,
  getOr,
  toNullable,
} from "./maybe.js";
export { tryAsync, trySync, collect } from "./result-async.js";

// Errors
export {
  AppError,
  isAppError,
  toAppError,
  NotFoundError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitedError,
  UnavailableError,
  InternalError,
  type AppErrorOptions,
  type ErrorCode,
  type ErrorDetails,
  type FieldIssue,
} from "./errors/index.js";

// Ids & brands
export { type Brand, brand, unbrand } from "./brand.js";
export {
  type Id,
  newId,
  isId,
  asId,
  idSuffix,
  type ClaimId,
  type SourceId,
  type VerificationId,
  type OrderId,
  type JobId,
  type UserId,
  type EventId,
  newClaimId,
  newSourceId,
  newVerificationId,
  newOrderId,
  newJobId,
  newUserId,
  newEventId,
} from "./ids.js";

// Time & ISO
export {
  type Clock,
  systemClock,
  fixedClock,
  mutableClock,
  Duration,
} from "./time.js";
export {
  type IsoTimestamp,
  isIsoTimestamp,
  epochToIso,
  isoToEpoch,
  asIsoTimestamp,
} from "./iso.js";

// JSON & hashing
export { type JsonValue, canonicalize, safeParseJson } from "./json.js";
export {
  type ContentHash,
  sha256Hex,
  contentHash,
  isContentHash,
} from "./hashing.js";

// Money & score
export { Usdc, USDC_DECIMALS } from "./money.js";
export {
  type Score,
  asScore,
  clampScore,
  meanScore,
  formatScorePercent,
} from "./score.js";

// Pagination & API
export {
  type Page,
  type PageRequest,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  toPageRequest,
  encodeCursor,
  decodeCursor,
  makePage,
} from "./pagination.js";
export {
  type ApiResponse,
  type ApiSuccess,
  type ApiFailure,
  type ApiError,
  type ApiPage,
  type PageMeta,
  apiSuccess,
  apiFailure,
  apiPage,
} from "./api-response.js";

// Concurrency, retry, backoff, timeout
export { type Limiter, pLimit, mapWithConcurrency } from "./concurrency.js";
export {
  type BackoffOptions,
  DEFAULT_BACKOFF,
  computeBackoff,
  sleep,
} from "./backoff.js";
export { type RetryOptions, DEFAULT_RETRY, withRetry } from "./retry.js";
export { withTimeout } from "./timeout.js";
export { type Deferred, deferred } from "./deferred.js";

// Assertions & guards
export {
  InvariantError,
  invariant,
  assertDefined,
  assertNever,
} from "./assert.js";
export {
  isObject,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isFunction,
  isNil,
  isDefined,
  hasKey,
} from "./guards.js";

// Enums
export {
  Verdict,
  OrderStatus,
  JobStatus,
  SourceTier,
  isVerdict,
  isOrderStatus,
  isJobStatus,
  isSourceTier,
} from "./enums.js";

// Events
export {
  type DomainEvent,
  type DomainEventInit,
  makeDomainEvent,
  type EventBus,
  type EventHandler,
  type Unsubscribe,
  InMemoryEventBus,
} from "./events/index.js";

// Logger port
export {
  type Logger,
  type LogContext,
  LogLevel,
  noopLogger,
} from "./logger-port.js";

// Zod helpers & schemas
export { safeParse, parseOrThrow, zodIssuesToFieldIssues } from "./zod-helpers.js";
export {
  isoTimestampSchema,
  contentHashSchema,
  scoreSchema,
  verdictSchema,
  orderStatusSchema,
  jobStatusSchema,
  sourceTierSchema,
  usdcBaseUnitsSchema,
} from "./schemas.js";

// Tuples, range, slug, redact, url & misc utils
export {
  type Pair,
  type Triple,
  pair,
  triple,
  fst,
  snd,
  swap,
} from "./tuple.js";
export {
  type Range,
  range,
  contains,
  clamp,
  width,
  lerp,
  UNIT_RANGE,
} from "./range.js";
export { slugify, isSlug, slugifyBounded } from "./slug.js";
export {
  redact,
  maskString,
  DEFAULT_SENSITIVE_KEYS,
} from "./redact.js";
export { parseUrl, hostOf, normalizeUrl, isHttpUrl } from "./url-utils.js";
export { unique, compact, chunk, groupBy, indexBy } from "./array-utils.js";
export { pick, omit, mergeShallow, mapValues } from "./object-utils.js";
export {
  truncate,
  capitalize,
  normalizeWhitespace,
  isBlank,
  ensureSuffix,
} from "./string-utils.js";
export { clampNumber, roundTo, approxEqual } from "./clamp-number.js";
