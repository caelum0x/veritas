// Shared type aliases and union types used across the consent module.
import { z } from "zod";

/** Identifies the channel through which consent was collected. */
export const ConsentChannelSchema = z.enum([
  "web",
  "mobile",
  "api",
  "email",
  "paper",
]);
export type ConsentChannel = z.infer<typeof ConsentChannelSchema>;

/** Scope of a consent decision relative to a processing purpose. */
export const ConsentScopeSchema = z.enum([
  "global",   // applies to all sub-purposes
  "specific", // applies to the named purpose only
]);
export type ConsentScope = z.infer<typeof ConsentScopeSchema>;

/** Reason a consent record was withdrawn. */
export const WithdrawalReasonSchema = z.enum([
  "user_request",
  "account_deletion",
  "legal_hold",
  "expired",
  "admin_revoke",
]);
export type WithdrawalReason = z.infer<typeof WithdrawalReasonSchema>;

/** Lightweight reference pairing a purpose id with its consent status. */
export const ConsentSummarySchema = z.object({
  purposeId: z.string(),
  purposeName: z.string(),
  status: z.enum(["granted", "denied", "withdrawn", "unknown"]),
  updatedAt: z.string().optional(),
});
export type ConsentSummary = z.infer<typeof ConsentSummarySchema>;

/** Metadata attached to every consent event for audit purposes. */
export const ConsentMetaSchema = z.object({
  channel: ConsentChannelSchema,
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  sessionId: z.string().optional(),
  locale: z.string().optional(),
});
export type ConsentMeta = z.infer<typeof ConsentMetaSchema>;

/** Payload emitted on the event bus when consent changes. */
export const ConsentChangedEventSchema = z.object({
  type: z.literal("consent.changed"),
  consentId: z.string(),
  userId: z.string(),
  purposeId: z.string(),
  previousStatus: z.enum(["granted", "denied", "withdrawn", "unknown"]),
  newStatus: z.enum(["granted", "denied", "withdrawn"]),
  occurredAt: z.string(),
});
export type ConsentChangedEvent = z.infer<typeof ConsentChangedEventSchema>;
