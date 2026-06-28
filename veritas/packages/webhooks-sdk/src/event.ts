// Typed webhook event definitions with per-event-type payload schemas.

import { z } from "zod";
import type { WebhookEvent } from "./types.js";

// ── Event type constants ──────────────────────────────────────────────────────

export const WebhookEventType = {
  CLAIM_CREATED: "claim.created",
  CLAIM_UPDATED: "claim.updated",
  CLAIM_DELETED: "claim.deleted",
  VERIFICATION_STARTED: "verification.started",
  VERIFICATION_COMPLETED: "verification.completed",
  VERIFICATION_FAILED: "verification.failed",
  JOB_CREATED: "job.created",
  JOB_STARTED: "job.started",
  JOB_COMPLETED: "job.completed",
  JOB_FAILED: "job.failed",
  ORDER_CREATED: "order.created",
  ORDER_SETTLED: "order.settled",
  ORDER_CANCELLED: "order.cancelled",
  SOURCE_CREATED: "source.created",
  SOURCE_UPDATED: "source.updated",
  SOURCE_DELETED: "source.deleted",
  REPORT_CREATED: "report.created",
  REPORT_UPDATED: "report.updated",
  SETTLEMENT_INITIATED: "settlement.initiated",
  SETTLEMENT_CONFIRMED: "settlement.confirmed",
  SETTLEMENT_FAILED: "settlement.failed",
  USAGE_THRESHOLD_REACHED: "usage.threshold_reached",
  INVOICE_CREATED: "invoice.created",
  INVOICE_PAID: "invoice.paid",
  AGENT_REGISTERED: "agent.registered",
  AGENT_DEREGISTERED: "agent.deregistered",
} as const;

export type WebhookEventType = (typeof WebhookEventType)[keyof typeof WebhookEventType];

export const ALL_WEBHOOK_EVENT_TYPES: readonly WebhookEventType[] = Object.values(WebhookEventType);

export function isWebhookEventType(value: string): value is WebhookEventType {
  return (ALL_WEBHOOK_EVENT_TYPES as readonly string[]).includes(value);
}

// ── Per-event typed payload schemas ──────────────────────────────────────────

export const ClaimEventPayloadSchema = z.object({
  claimId: z.string(),
  text: z.string(),
  organizationId: z.string(),
});

export const VerificationEventPayloadSchema = z.object({
  verificationId: z.string(),
  claimId: z.string(),
  verdict: z.string().optional(),
  confidence: z.number().optional(),
});

export const JobEventPayloadSchema = z.object({
  jobId: z.string(),
  type: z.string(),
  status: z.string(),
  organizationId: z.string(),
});

export const OrderEventPayloadSchema = z.object({
  orderId: z.string(),
  status: z.string(),
  organizationId: z.string(),
  amountUsdc: z.string().optional(),
});

export const SourceEventPayloadSchema = z.object({
  sourceId: z.string(),
  url: z.string().optional(),
  tier: z.string().optional(),
});

export const ReportEventPayloadSchema = z.object({
  reportId: z.string(),
  organizationId: z.string(),
  claimCount: z.number().optional(),
});

export const SettlementEventPayloadSchema = z.object({
  settlementId: z.string(),
  status: z.string(),
  amountUsdc: z.string(),
});

export const UsageEventPayloadSchema = z.object({
  organizationId: z.string(),
  metric: z.string(),
  threshold: z.number(),
  current: z.number(),
});

export const InvoiceEventPayloadSchema = z.object({
  invoiceId: z.string(),
  organizationId: z.string(),
  amountUsdc: z.string(),
  status: z.string(),
});

export const AgentEventPayloadSchema = z.object({
  agentId: z.string(),
  organizationId: z.string(),
  name: z.string().optional(),
});

// ── Typed event wrappers ──────────────────────────────────────────────────────

export type TypedWebhookEvent<T extends WebhookEventType, P> = Omit<WebhookEvent, "type" | "payload"> & {
  type: T;
  payload: P;
};

export type ClaimCreatedEvent = TypedWebhookEvent<"claim.created", z.infer<typeof ClaimEventPayloadSchema>>;
export type ClaimUpdatedEvent = TypedWebhookEvent<"claim.updated", z.infer<typeof ClaimEventPayloadSchema>>;
export type ClaimDeletedEvent = TypedWebhookEvent<"claim.deleted", z.infer<typeof ClaimEventPayloadSchema>>;
export type VerificationCompletedEvent = TypedWebhookEvent<"verification.completed", z.infer<typeof VerificationEventPayloadSchema>>;
export type JobCompletedEvent = TypedWebhookEvent<"job.completed", z.infer<typeof JobEventPayloadSchema>>;
export type OrderSettledEvent = TypedWebhookEvent<"order.settled", z.infer<typeof OrderEventPayloadSchema>>;

export type AnyTypedWebhookEvent =
  | ClaimCreatedEvent
  | ClaimUpdatedEvent
  | ClaimDeletedEvent
  | VerificationCompletedEvent
  | JobCompletedEvent
  | OrderSettledEvent
  | TypedWebhookEvent<WebhookEventType, Record<string, unknown>>;
