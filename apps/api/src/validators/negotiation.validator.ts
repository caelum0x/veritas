// Zod validators for negotiation request bodies and query parameters.
import { z } from "zod";
import { CreateNegotiationSchema, UpdateNegotiationSchema } from "@veritas/contracts";
import { paginationSchema } from "@veritas/contracts";

export const createNegotiationBodySchema = CreateNegotiationSchema;

export const updateNegotiationBodySchema = UpdateNegotiationSchema;

export const listNegotiationsQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  orderId: z.string().optional(),
  agentId: z.string().optional(),
});

export const negotiationIdParamSchema = z.object({
  id: z.string().min(1, "Negotiation ID is required"),
});

export type CreateNegotiationBody = z.infer<typeof createNegotiationBodySchema>;
export type UpdateNegotiationBody = z.infer<typeof updateNegotiationBodySchema>;
export type ListNegotiationsQuery = z.infer<typeof listNegotiationsQuerySchema>;
export type NegotiationIdParam = z.infer<typeof negotiationIdParamSchema>;
