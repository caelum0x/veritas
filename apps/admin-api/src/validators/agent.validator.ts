// Zod validators for agent admin endpoints
import { z } from "zod";

export const listAgentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  organizationId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const getAgentParamsSchema = z.object({
  agentId: z.string().min(1),
});

export const createAgentBodySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  organizationId: z.string().min(1),
  config: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateAgentBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const deleteAgentParamsSchema = z.object({
  agentId: z.string().min(1),
});

export type ListAgentsQuery = z.infer<typeof listAgentsQuerySchema>;
export type GetAgentParams = z.infer<typeof getAgentParamsSchema>;
export type CreateAgentBody = z.infer<typeof createAgentBodySchema>;
export type UpdateAgentBody = z.infer<typeof updateAgentBodySchema>;
export type DeleteAgentParams = z.infer<typeof deleteAgentParamsSchema>;
