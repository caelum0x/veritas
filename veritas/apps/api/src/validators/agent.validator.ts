// Zod validators for agent request bodies and query params
import { z } from "zod";
import { AgentSchema, CreateAgentSchema, UpdateAgentSchema } from "@veritas/contracts";

export const createAgentBodySchema = CreateAgentSchema;
export const updateAgentBodySchema = UpdateAgentSchema;

export const listAgentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  status: z.string().optional(),
  organizationId: z.string().optional(),
});

export const agentIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreateAgentBody = z.infer<typeof createAgentBodySchema>;
export type UpdateAgentBody = z.infer<typeof updateAgentBodySchema>;
export type ListAgentsQuery = z.infer<typeof listAgentsQuerySchema>;
export type AgentIdParam = z.infer<typeof agentIdParamSchema>;
export type Agent = z.infer<typeof AgentSchema>;
