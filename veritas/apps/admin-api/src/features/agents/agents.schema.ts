// Zod schemas for agents feature HTTP request validation.
import { z } from "zod";
import { CreateAgentSchema, UpdateAgentSchema } from "@veritas/contracts";

export const RegisterAgentBodySchema = CreateAgentSchema;
export type RegisterAgentBody = z.infer<typeof RegisterAgentBodySchema>;

export const UpdateAgentBodySchema = UpdateAgentSchema;
export type UpdateAgentBody = z.infer<typeof UpdateAgentBodySchema>;

export const SetAgentTrustBodySchema = z.object({
  trusted: z.boolean(),
});
export type SetAgentTrustBody = z.infer<typeof SetAgentTrustBodySchema>;

export const AgentIdParamSchema = z.object({
  agentId: z.string().min(1),
});
export type AgentIdParam = z.infer<typeof AgentIdParamSchema>;

export const ListAgentsQuerySchema = z.object({
  trusted: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  walletAddress: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListAgentsQuery = z.infer<typeof ListAgentsQuerySchema>;
