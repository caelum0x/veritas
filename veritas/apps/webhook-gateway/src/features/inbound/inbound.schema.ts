// Zod schemas for inbound webhook receipt and event routing validation.

import { z } from "zod";

/** Headers required on every inbound webhook POST. */
export const InboundHeadersSchema = z.object({
  "x-veritas-signature": z.string().min(1, "Missing signature header"),
  "x-veritas-delivery": z.string().min(1, "Missing delivery-id header"),
  "x-veritas-event": z.string().min(1, "Missing event-type header"),
});
export type InboundHeaders = z.infer<typeof InboundHeadersSchema>;

/** Allowed inbound webhook sources routed by this gateway. */
export const InboundSourceSchema = z.enum(["cap", "payment"]);
export type InboundSource = z.infer<typeof InboundSourceSchema>;

/** Route params for /webhooks/:source */
export const InboundRouteParamsSchema = z.object({
  source: InboundSourceSchema,
});
export type InboundRouteParams = z.infer<typeof InboundRouteParamsSchema>;

/** Minimal shape expected in the webhook payload body. */
export const InboundPayloadSchema = z
  .record(z.string(), z.unknown())
  .refine((v) => typeof v === "object" && v !== null, {
    message: "Payload must be a JSON object",
  });
export type InboundPayload = z.infer<typeof InboundPayloadSchema>;

/** Successful inbound receipt response. */
export const InboundReceiptSchema = z.object({
  accepted: z.literal(true),
  deliveryId: z.string(),
  eventType: z.string(),
});
export type InboundReceipt = z.infer<typeof InboundReceiptSchema>;
