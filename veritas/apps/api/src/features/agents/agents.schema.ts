// Zod schemas for agent HTTP request validation (body, query, params).
import { z } from "zod";
import { CreateAgentSchema, UpdateAgentSchema } from "@veritas/contracts";

export const createAgentBodySchema = CreateAgentSchema;
export type CreateAgentBody = z.infer<typeof createAgentBodySchema>;

export const updateAgentBodySchema = UpdateAgentSchema;
export type UpdateAgentBody = z.infer<typeof updateAgentBodySchema>;

export const listAgentsQuerySchema = z.object({
  trusted: z
    .string()
    .transform((v) => v === "true")
    .pipe(z.boolean())
    .optional(),
  walletAddress: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListAgentsQuery = z.infer<typeof listAgentsQuerySchema>;

export const agentIdParamSchema = z.object({
  id: z.string().min(1, "Agent ID is required"),
});
export type AgentIdParam = z.infer<typeof agentIdParamSchema>;

export const setTrustBodySchema = z.object({
  trusted: z.boolean(),
});
export type SetTrustBody = z.infer<typeof setTrustBodySchema>;
