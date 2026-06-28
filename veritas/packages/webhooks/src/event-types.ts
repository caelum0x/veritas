// Enumeration of all supported webhook event type strings for the webhooks package.

export const WebhookEventType = {
  // Claim lifecycle
  CLAIM_CREATED: "claim.created",
  CLAIM_UPDATED: "claim.updated",
  CLAIM_DELETED: "claim.deleted",

  // Verification lifecycle
  VERIFICATION_STARTED: "verification.started",
  VERIFICATION_COMPLETED: "verification.completed",
  VERIFICATION_FAILED: "verification.failed",

  // Job lifecycle
  JOB_CREATED: "job.created",
  JOB_STARTED: "job.started",
  JOB_COMPLETED: "job.completed",
  JOB_FAILED: "job.failed",

  // Order lifecycle
  ORDER_CREATED: "order.created",
  ORDER_SETTLED: "order.settled",
  ORDER_CANCELLED: "order.cancelled",

  // Source lifecycle
  SOURCE_CREATED: "source.created",
  SOURCE_UPDATED: "source.updated",
  SOURCE_DELETED: "source.deleted",

  // Report lifecycle
  REPORT_CREATED: "report.created",
  REPORT_UPDATED: "report.updated",

  // Settlement events
  SETTLEMENT_INITIATED: "settlement.initiated",
  SETTLEMENT_CONFIRMED: "settlement.confirmed",
  SETTLEMENT_FAILED: "settlement.failed",

  // Usage / billing
  USAGE_THRESHOLD_REACHED: "usage.threshold_reached",
  INVOICE_CREATED: "invoice.created",
  INVOICE_PAID: "invoice.paid",

  // Agent / CAP
  AGENT_REGISTERED: "agent.registered",
  AGENT_DEREGISTERED: "agent.deregistered",
} as const;

export type WebhookEventType = (typeof WebhookEventType)[keyof typeof WebhookEventType];

export const ALL_WEBHOOK_EVENT_TYPES: readonly WebhookEventType[] = Object.values(WebhookEventType);

export function isWebhookEventType(value: string): value is WebhookEventType {
  return (ALL_WEBHOOK_EVENT_TYPES as readonly string[]).includes(value);
}
