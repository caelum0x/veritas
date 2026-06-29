// English (en) message catalog — default/fallback locale for Veritas
import type { MessageRecord } from "../catalog.js";
import { MessageKeys } from "./keys.js";

export const enMessages: MessageRecord = {
  // Common
  [MessageKeys.COMMON_OK]: "OK",
  [MessageKeys.COMMON_CANCEL]: "Cancel",
  [MessageKeys.COMMON_SAVE]: "Save",
  [MessageKeys.COMMON_DELETE]: "Delete",
  [MessageKeys.COMMON_EDIT]: "Edit",
  [MessageKeys.COMMON_CLOSE]: "Close",
  [MessageKeys.COMMON_CONFIRM]: "Confirm",
  [MessageKeys.COMMON_LOADING]: "Loading…",
  [MessageKeys.COMMON_ERROR]: "Error",
  [MessageKeys.COMMON_SUCCESS]: "Success",
  [MessageKeys.COMMON_WARNING]: "Warning",
  [MessageKeys.COMMON_INFO]: "Info",
  [MessageKeys.COMMON_UNKNOWN]: "Unknown",
  [MessageKeys.COMMON_NA]: "N/A",
  [MessageKeys.COMMON_YES]: "Yes",
  [MessageKeys.COMMON_NO]: "No",
  [MessageKeys.COMMON_RETRY]: "Retry",
  [MessageKeys.COMMON_BACK]: "Back",
  [MessageKeys.COMMON_NEXT]: "Next",
  [MessageKeys.COMMON_SUBMIT]: "Submit",
  [MessageKeys.COMMON_SEARCH]: "Search",
  [MessageKeys.COMMON_FILTER]: "Filter",
  [MessageKeys.COMMON_RESET]: "Reset",
  [MessageKeys.COMMON_EXPORT]: "Export",
  [MessageKeys.COMMON_IMPORT]: "Import",
  [MessageKeys.COMMON_COPY]: "Copy",
  [MessageKeys.COMMON_COPIED]: "Copied!",
  [MessageKeys.COMMON_REFRESH]: "Refresh",
  [MessageKeys.COMMON_VIEW]: "View",
  [MessageKeys.COMMON_DOWNLOAD]: "Download",

  // Pagination
  [MessageKeys.PAGINATION_PREV]: "Previous",
  [MessageKeys.PAGINATION_NEXT]: "Next",
  [MessageKeys.PAGINATION_PAGE]: "Page {{page}}",
  [MessageKeys.PAGINATION_OF]: "of {{total}}",
  [MessageKeys.PAGINATION_RESULTS]: "{{count}} results",

  // Auth
  [MessageKeys.AUTH_SIGN_IN]: "Sign In",
  [MessageKeys.AUTH_SIGN_OUT]: "Sign Out",
  [MessageKeys.AUTH_SIGN_UP]: "Sign Up",
  [MessageKeys.AUTH_EMAIL]: "Email address",
  [MessageKeys.AUTH_PASSWORD]: "Password",
  [MessageKeys.AUTH_FORGOT_PASSWORD]: "Forgot password?",
  [MessageKeys.AUTH_RESET_PASSWORD]: "Reset Password",
  [MessageKeys.AUTH_UNAUTHORIZED]: "You must be signed in to continue.",
  [MessageKeys.AUTH_FORBIDDEN]: "You do not have permission to perform this action.",
  [MessageKeys.AUTH_SESSION_EXPIRED]: "Your session has expired. Please sign in again.",
  [MessageKeys.AUTH_MFA_PROMPT]: "Enter your verification code",
  [MessageKeys.AUTH_MFA_CODE]: "Verification code",

  // Claims
  [MessageKeys.CLAIM_TITLE]: "Claim",
  [MessageKeys.CLAIM_TEXT]: "Claim text",
  [MessageKeys.CLAIM_STATUS]: "Status",
  [MessageKeys.CLAIM_CREATE]: "Create Claim",
  [MessageKeys.CLAIM_UPDATE]: "Update Claim",
  [MessageKeys.CLAIM_DELETE]: "Delete Claim",
  [MessageKeys.CLAIM_VERIFY]: "Verify Claim",
  [MessageKeys.CLAIM_NOT_FOUND]: "Claim not found.",
  [MessageKeys.CLAIM_SUBMITTED]: "Claim submitted successfully.",
  [MessageKeys.CLAIM_COUNT]: "{{count}} claim",

  // Verdicts
  [MessageKeys.VERDICT_TRUE]: "True",
  [MessageKeys.VERDICT_FALSE]: "False",
  [MessageKeys.VERDICT_UNVERIFIED]: "Unverified",
  [MessageKeys.VERDICT_DISPUTED]: "Disputed",
  [MessageKeys.VERDICT_MISLEADING]: "Misleading",
  [MessageKeys.VERDICT_SATIRE]: "Satire",
  [MessageKeys.VERDICT_LABEL]: "Verdict",
  [MessageKeys.VERDICT_CONFIDENCE]: "Confidence: {{value}}%",

  // Orders
  [MessageKeys.ORDER_TITLE]: "Order",
  [MessageKeys.ORDER_STATUS]: "Order status",
  [MessageKeys.ORDER_CREATE]: "Create Order",
  [MessageKeys.ORDER_CANCEL]: "Cancel Order",
  [MessageKeys.ORDER_COMPLETE]: "Complete",
  [MessageKeys.ORDER_PENDING]: "Pending",
  [MessageKeys.ORDER_PROCESSING]: "Processing",
  [MessageKeys.ORDER_FAILED]: "Failed",
  [MessageKeys.ORDER_NOT_FOUND]: "Order not found.",
  [MessageKeys.ORDER_COUNT]: "{{count}} order",

  // Sources
  [MessageKeys.SOURCE_TITLE]: "Source",
  [MessageKeys.SOURCE_URL]: "Source URL",
  [MessageKeys.SOURCE_TIER]: "Tier",
  [MessageKeys.SOURCE_ADD]: "Add Source",
  [MessageKeys.SOURCE_REMOVE]: "Remove Source",
  [MessageKeys.SOURCE_NOT_FOUND]: "Source not found.",
  [MessageKeys.SOURCE_TRUST_SCORE]: "Trust score: {{score}}",
  [MessageKeys.SOURCE_COUNT]: "{{count}} source",

  // Reports
  [MessageKeys.REPORT_TITLE]: "Report",
  [MessageKeys.REPORT_GENERATE]: "Generate Report",
  [MessageKeys.REPORT_DOWNLOAD]: "Download Report",
  [MessageKeys.REPORT_NOT_FOUND]: "Report not found.",
  [MessageKeys.REPORT_CLAIMS]: "{{count}} claim",
  [MessageKeys.REPORT_SUMMARY]: "Summary",

  // Errors
  [MessageKeys.ERROR_NOT_FOUND]: "The requested resource could not be found.",
  [MessageKeys.ERROR_CONFLICT]: "A conflict occurred. The resource may already exist.",
  [MessageKeys.ERROR_VALIDATION]: "One or more fields are invalid.",
  [MessageKeys.ERROR_UNAUTHORIZED]: "Authentication is required.",
  [MessageKeys.ERROR_FORBIDDEN]: "You are not authorised to perform this action.",
  [MessageKeys.ERROR_RATE_LIMITED]: "Too many requests. Please slow down and try again.",
  [MessageKeys.ERROR_UNAVAILABLE]: "The service is temporarily unavailable. Please try again later.",
  [MessageKeys.ERROR_INTERNAL]: "An unexpected error occurred. Our team has been notified.",
  [MessageKeys.ERROR_NETWORK]: "A network error occurred. Check your connection and retry.",
  [MessageKeys.ERROR_TIMEOUT]: "The request timed out. Please try again.",
  [MessageKeys.ERROR_UNKNOWN]: "An unknown error occurred.",

  // Validation
  [MessageKeys.VALIDATION_REQUIRED]: "{{field}} is required.",
  [MessageKeys.VALIDATION_MIN_LENGTH]: "{{field}} must be at least {{min}} characters.",
  [MessageKeys.VALIDATION_MAX_LENGTH]: "{{field}} must be at most {{max}} characters.",
  [MessageKeys.VALIDATION_INVALID_EMAIL]: "Please enter a valid email address.",
  [MessageKeys.VALIDATION_INVALID_URL]: "Please enter a valid URL.",
  [MessageKeys.VALIDATION_INVALID_FORMAT]: "{{field}} has an invalid format.",
  [MessageKeys.VALIDATION_TOO_SMALL]: "{{field}} must be at least {{min}}.",
  [MessageKeys.VALIDATION_TOO_LARGE]: "{{field}} must be at most {{max}}.",

  // Notifications
  [MessageKeys.NOTIFICATION_TITLE]: "Notifications",
  [MessageKeys.NOTIFICATION_MARK_READ]: "Mark as read",
  [MessageKeys.NOTIFICATION_MARK_ALL_READ]: "Mark all as read",
  [MessageKeys.NOTIFICATION_EMPTY]: "No notifications",
  [MessageKeys.NOTIFICATION_COUNT]: "{{count}} notification",

  // Billing
  [MessageKeys.BILLING_PLAN]: "Plan",
  [MessageKeys.BILLING_SUBSCRIBE]: "Subscribe",
  [MessageKeys.BILLING_CANCEL]: "Cancel Subscription",
  [MessageKeys.BILLING_INVOICE]: "Invoice",
  [MessageKeys.BILLING_PAYMENT_METHOD]: "Payment method",
  [MessageKeys.BILLING_NEXT_BILLING]: "Next billing date",
  [MessageKeys.BILLING_AMOUNT_DUE]: "Amount due",

  // Organization
  [MessageKeys.ORG_TITLE]: "Organization",
  [MessageKeys.ORG_MEMBERS]: "Members",
  [MessageKeys.ORG_INVITE]: "Invite Member",
  [MessageKeys.ORG_REMOVE_MEMBER]: "Remove Member",
  [MessageKeys.ORG_SETTINGS]: "Organization Settings",
  [MessageKeys.ORG_NOT_FOUND]: "Organization not found.",

  // Jobs
  [MessageKeys.JOB_STATUS]: "Job status",
  [MessageKeys.JOB_QUEUED]: "Queued",
  [MessageKeys.JOB_RUNNING]: "Running",
  [MessageKeys.JOB_DONE]: "Done",
  [MessageKeys.JOB_FAILED]: "Failed",
  [MessageKeys.JOB_CANCELLED]: "Cancelled",
  [MessageKeys.JOB_COUNT]: "{{count}} job",
};
