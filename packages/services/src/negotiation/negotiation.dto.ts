// Input/output DTOs for negotiation use-cases in the services layer.
import { z } from "zod";
import {
  CreateNegotiationSchema,
  UpdateNegotiationSchema,
  NegotiationSchema,
  NegotiationStatusSchema,
} from "@veritas/contracts";

/** Input for initiating a new CAP price negotiation. */
export const CreateNegotiationInputSchema = CreateNegotiationSchema;
export type CreateNegotiationInput = z.infer<typeof CreateNegotiationInputSchema>;

/** Input for updating a negotiation status. */
export const UpdateNegotiationInputSchema = UpdateNegotiationSchema;
export type UpdateNegotiationInput = z.infer<typeof UpdateNegotiationInputSchema>;

/** Query parameters for listing negotiations. */
export const ListNegotiationsInputSchema = z.object({
  buyerAgentId: z.string().optional(),
  serviceId: z.string().optional(),
  status: NegotiationStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListNegotiationsInput = z.infer<typeof ListNegotiationsInputSchema>;

/** Single negotiation output DTO. */
export type NegotiationOutput = z.infer<typeof NegotiationSchema>;

/** Canonical negotiation DTO factory from a raw Negotiation record. */
export function toNegotiationOutput(neg: NegotiationOutput): NegotiationOutput {
  return { ...neg };
}
