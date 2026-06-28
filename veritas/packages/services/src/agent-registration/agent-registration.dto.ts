// Input/output DTOs for the agent-registration application service use-cases.
import { z } from "zod";
import { AgentSchema, CreateAgentSchema } from "@veritas/contracts";

/** Status of an agent registration lifecycle. */
export const RegistrationStatusSchema = z.enum([
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
  "REVOKED",
]);
export type RegistrationStatus = z.infer<typeof RegistrationStatusSchema>;

/** Input for initiating a new agent registration request. */
export const InitiateRegistrationInputSchema = z.object({
  agent: CreateAgentSchema,
  /** Organisation on whose behalf this agent is being registered. */
  orgId: z.string().min(1),
  /** Optional human-readable reason or description for this registration. */
  reason: z.string().max(500).optional(),
});
export type InitiateRegistrationInput = z.infer<typeof InitiateRegistrationInputSchema>;

/** Input for approving a pending agent registration. */
export const ApproveRegistrationInputSchema = z.object({
  agentId: z.string().min(1),
  /** Notes recorded by the approver. */
  approverNotes: z.string().max(500).optional(),
});
export type ApproveRegistrationInput = z.infer<typeof ApproveRegistrationInputSchema>;

/** Input for suspending an active agent registration. */
export const SuspendRegistrationInputSchema = z.object({
  agentId: z.string().min(1),
  reason: z.string().min(1).max(500),
});
export type SuspendRegistrationInput = z.infer<typeof SuspendRegistrationInputSchema>;

/** Input for revoking (permanently deactivating) an agent registration. */
export const RevokeRegistrationInputSchema = z.object({
  agentId: z.string().min(1),
  reason: z.string().min(1).max(500),
});
export type RevokeRegistrationInput = z.infer<typeof RevokeRegistrationInputSchema>;

/** Input for reactivating a suspended agent registration. */
export const ReactivateRegistrationInputSchema = z.object({
  agentId: z.string().min(1),
  reason: z.string().max(500).optional(),
});
export type ReactivateRegistrationInput = z.infer<typeof ReactivateRegistrationInputSchema>;

/** Query parameters for listing agent registrations. */
export const ListRegistrationsInputSchema = z.object({
  orgId: z.string().optional(),
  status: RegistrationStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListRegistrationsInput = z.infer<typeof ListRegistrationsInputSchema>;

/** Full registration output combining the agent record with its lifecycle metadata. */
export const AgentRegistrationOutputSchema = z.object({
  agent: AgentSchema,
  status: RegistrationStatusSchema,
  orgId: z.string(),
  reason: z.string().nullable(),
  approverNotes: z.string().nullable(),
  registeredAt: z.string().datetime(),
  statusChangedAt: z.string().datetime(),
});
export type AgentRegistrationOutput = z.infer<typeof AgentRegistrationOutputSchema>;

/** Paginated list of agent registration outputs. */
export const AgentRegistrationListOutputSchema = z.object({
  items: z.array(AgentRegistrationOutputSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type AgentRegistrationListOutput = z.infer<typeof AgentRegistrationListOutputSchema>;
