// Analytics event definitions for tracking user and system actions
import { z } from "zod";
import { Id, IsoTimestamp, isoTimestampSchema } from "@veritas/core";

export const AnalyticsEventTypeSchema = z.enum([
  "claim.submitted",
  "claim.verified",
  "claim.rejected",
  "source.added",
  "source.trusted",
  "source.distrusted",
  "verification.started",
  "verification.completed",
  "verification.failed",
  "report.generated",
  "report.viewed",
  "user.registered",
  "user.login",
  "api.request",
  "order.created",
  "order.fulfilled",
  "order.cancelled",
  "job.queued",
  "job.completed",
  "job.failed",
]);

export type AnalyticsEventType = z.infer<typeof AnalyticsEventTypeSchema>;

export const AnalyticsEventSchema = z.object({
  id: z.string(),
  type: AnalyticsEventTypeSchema,
  occurredAt: isoTimestampSchema,
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  organizationId: z.string().optional(),
  entityId: z.string().optional(),
  entityType: z.string().optional(),
  properties: z.record(z.unknown()).default({}),
  durationMs: z.number().int().nonnegative().optional(),
  success: z.boolean().optional(),
});

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

export type CreateAnalyticsEvent = Omit<AnalyticsEvent, "id" | "occurredAt" | "properties"> & {
  occurredAt?: IsoTimestamp;
  properties?: Record<string, unknown>;
};
