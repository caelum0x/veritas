// Input/output DTOs for agent application service use-cases.
import { z } from "zod";
import {
  AgentSchema,
  CreateAgentSchema,
  UpdateAgentSchema,
} from "@veritas/contracts";

/** Input DTO for registering a new CAP agent. */
export const RegisterAgentInputSchema = CreateAgentSchema;
export type RegisterAgentInput = z.infer<typeof RegisterAgentInputSchema>;

/** Input DTO for updating an existing agent's mutable fields. */
export const UpdateAgentInputSchema = UpdateAgentSchema;
export type UpdateAgentInput = z.infer<typeof UpdateAgentInputSchema>;

/** Query options for listing agents. */
export const ListAgentsInputSchema = z.object({
  trusted: z.boolean().optional(),
  walletAddress: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListAgentsInput = z.infer<typeof ListAgentsInputSchema>;

/** Output DTO: a single agent record. */
export const AgentOutputSchema = AgentSchema;
export type AgentOutput = z.infer<typeof AgentOutputSchema>;

/** Output DTO: paginated list of agents. */
export const AgentListOutputSchema = z.object({
  items: z.array(AgentSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type AgentListOutput = z.infer<typeof AgentListOutputSchema>;

/** Input DTO for trust-flag mutation. */
export const SetAgentTrustInputSchema = z.object({
  agentId: z.string().min(1),
  trusted: z.boolean(),
});
export type SetAgentTrustInput = z.infer<typeof SetAgentTrustInputSchema>;
