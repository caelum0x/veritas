// Negotiation entity: CAP price quote/agreement between a buyer agent and Veritas.

import { z } from "zod";
import { idSchema, timestampsSchema, moneySchema } from "./common.js";

export const NegotiationStatusSchema = z.enum([
  "QUOTED",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
]);
export type NegotiationStatus = z.infer<typeof NegotiationStatusSchema>;

export const NegotiationSchema = z
  .object({
    id: idSchema("neg"),
    serviceId: idSchema("svc"),
    buyerAgentId: idSchema("agent"),
    price: moneySchema,
    status: NegotiationStatusSchema,
    quoteHash: z.string(),
    expiresAt: z.string(),
  })
  .merge(timestampsSchema);
export type Negotiation = z.infer<typeof NegotiationSchema>;

export const CreateNegotiationSchema = z.object({
  serviceId: idSchema("svc"),
  buyerAgentId: idSchema("agent"),
  price: moneySchema,
  expiresAt: z.string(),
});
export type CreateNegotiation = z.infer<typeof CreateNegotiationSchema>;

export const UpdateNegotiationSchema = z.object({
  status: NegotiationStatusSchema,
});
export type UpdateNegotiation = z.infer<typeof UpdateNegotiationSchema>;
