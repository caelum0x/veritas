// Exhaustive registry of all message keys used across the Veritas platform

export const MessageKeys = {
  // Common
  COMMON_OK: "common.ok",
  COMMON_CANCEL: "common.cancel",
  COMMON_SAVE: "common.save",
  COMMON_DELETE: "common.delete",
  COMMON_EDIT: "common.edit",
  COMMON_CLOSE: "common.close",
  COMMON_CONFIRM: "common.confirm",
  COMMON_LOADING: "common.loading",
  COMMON_ERROR: "common.error",
  COMMON_SUCCESS: "common.success",
  COMMON_WARNING: "common.warning",
  COMMON_INFO: "common.info",
  COMMON_UNKNOWN: "common.unknown",
  COMMON_NA: "common.na",
  COMMON_YES: "common.yes",
  COMMON_NO: "common.no",
  COMMON_RETRY: "common.retry",
  COMMON_BACK: "common.back",
  COMMON_NEXT: "common.next",
  COMMON_SUBMIT: "common.submit",
  COMMON_SEARCH: "common.search",
  COMMON_FILTER: "common.filter",
  COMMON_RESET: "common.reset",
  COMMON_EXPORT: "common.export",
  COMMON_IMPORT: "common.import",
  COMMON_COPY: "common.copy",
  COMMON_COPIED: "common.copied",
  COMMON_REFRESH: "common.refresh",
  COMMON_VIEW: "common.view",
  COMMON_DOWNLOAD: "common.download",

  // Pagination
  PAGINATION_PREV: "pagination.prev",
  PAGINATION_NEXT: "pagination.next",
  PAGINATION_PAGE: "pagination.page",
  PAGINATION_OF: "pagination.of",
  PAGINATION_RESULTS: "pagination.results",

  // Auth
  AUTH_SIGN_IN: "auth.signIn",
  AUTH_SIGN_OUT: "auth.signOut",
  AUTH_SIGN_UP: "auth.signUp",
  AUTH_EMAIL: "auth.email",
  AUTH_PASSWORD: "auth.password",
  AUTH_FORGOT_PASSWORD: "auth.forgotPassword",
  AUTH_RESET_PASSWORD: "auth.resetPassword",
  AUTH_UNAUTHORIZED: "auth.unauthorized",
  AUTH_FORBIDDEN: "auth.forbidden",
  AUTH_SESSION_EXPIRED: "auth.sessionExpired",
  AUTH_MFA_PROMPT: "auth.mfaPrompt",
  AUTH_MFA_CODE: "auth.mfaCode",

  // Claims
  CLAIM_TITLE: "claim.title",
  CLAIM_TEXT: "claim.text",
  CLAIM_STATUS: "claim.status",
  CLAIM_CREATE: "claim.create",
  CLAIM_UPDATE: "claim.update",
  CLAIM_DELETE: "claim.delete",
  CLAIM_VERIFY: "claim.verify",
  CLAIM_NOT_FOUND: "claim.notFound",
  CLAIM_SUBMITTED: "claim.submitted",
  CLAIM_COUNT: "claim.count",

  // Verdicts
  VERDICT_TRUE: "verdict.true",
  VERDICT_FALSE: "verdict.false",
  VERDICT_UNVERIFIED: "verdict.unverified",
  VERDICT_DISPUTED: "verdict.disputed",
  VERDICT_MISLEADING: "verdict.misleading",
  VERDICT_SATIRE: "verdict.satire",
  VERDICT_LABEL: "verdict.label",
  VERDICT_CONFIDENCE: "verdict.confidence",

  // Orders
  ORDER_TITLE: "order.title",
  ORDER_STATUS: "order.status",
  ORDER_CREATE: "order.create",
  ORDER_CANCEL: "order.cancel",
  ORDER_COMPLETE: "order.complete",
  ORDER_PENDING: "order.pending",
  ORDER_PROCESSING: "order.processing",
  ORDER_FAILED: "order.failed",
  ORDER_NOT_FOUND: "order.notFound",
  ORDER_COUNT: "order.count",

  // Sources
  SOURCE_TITLE: "source.title",
  SOURCE_URL: "source.url",
  SOURCE_TIER: "source.tier",
  SOURCE_ADD: "source.add",
  SOURCE_REMOVE: "source.remove",
  SOURCE_NOT_FOUND: "source.notFound",
  SOURCE_TRUST_SCORE: "source.trustScore",
  SOURCE_COUNT: "source.count",

  // Reports
  REPORT_TITLE: "report.title",
  REPORT_GENERATE: "report.generate",
  REPORT_DOWNLOAD: "report.download",
  REPORT_NOT_FOUND: "report.notFound",
  REPORT_CLAIMS: "report.claims",
  REPORT_SUMMARY: "report.summary",

  // Errors
  ERROR_NOT_FOUND: "error.notFound",
  ERROR_CONFLICT: "error.conflict",
  ERROR_VALIDATION: "error.validation",
  ERROR_UNAUTHORIZED: "error.unauthorized",
  ERROR_FORBIDDEN: "error.forbidden",
  ERROR_RATE_LIMITED: "error.rateLimited",
  ERROR_UNAVAILABLE: "error.unavailable",
  ERROR_INTERNAL: "error.internal",
  ERROR_NETWORK: "error.network",
  ERROR_TIMEOUT: "error.timeout",
  ERROR_UNKNOWN: "error.unknown",

  // Validation
  VALIDATION_REQUIRED: "validation.required",
  VALIDATION_MIN_LENGTH: "validation.minLength",
  VALIDATION_MAX_LENGTH: "validation.maxLength",
  VALIDATION_INVALID_EMAIL: "validation.invalidEmail",
  VALIDATION_INVALID_URL: "validation.invalidUrl",
  VALIDATION_INVALID_FORMAT: "validation.invalidFormat",
  VALIDATION_TOO_SMALL: "validation.tooSmall",
  VALIDATION_TOO_LARGE: "validation.tooLarge",

  // Notifications
  NOTIFICATION_TITLE: "notification.title",
  NOTIFICATION_MARK_READ: "notification.markRead",
  NOTIFICATION_MARK_ALL_READ: "notification.markAllRead",
  NOTIFICATION_EMPTY: "notification.empty",
  NOTIFICATION_COUNT: "notification.count",

  // Billing
  BILLING_PLAN: "billing.plan",
  BILLING_SUBSCRIBE: "billing.subscribe",
  BILLING_CANCEL: "billing.cancel",
  BILLING_INVOICE: "billing.invoice",
  BILLING_PAYMENT_METHOD: "billing.paymentMethod",
  BILLING_NEXT_BILLING: "billing.nextBilling",
  BILLING_AMOUNT_DUE: "billing.amountDue",

  // Organization
  ORG_TITLE: "org.title",
  ORG_MEMBERS: "org.members",
  ORG_INVITE: "org.invite",
  ORG_REMOVE_MEMBER: "org.removeMember",
  ORG_SETTINGS: "org.settings",
  ORG_NOT_FOUND: "org.notFound",

  // Jobs
  JOB_STATUS: "job.status",
  JOB_QUEUED: "job.queued",
  JOB_RUNNING: "job.running",
  JOB_DONE: "job.done",
  JOB_FAILED: "job.failed",
  JOB_CANCELLED: "job.cancelled",
  JOB_COUNT: "job.count",
} as const;

export type MessageKey = (typeof MessageKeys)[keyof typeof MessageKeys];
