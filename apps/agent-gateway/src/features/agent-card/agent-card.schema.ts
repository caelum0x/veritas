// Zod schemas for agent-card feature HTTP request/response validation.

import { z } from "zod";
import {
  AuthSchemeSchema,
  ProtocolSchema,
  ContentTypeSchema,
  CapabilityKindSchema,
  SkillInputModeSchema,
  SkillOutputModeSchema,
  AgentProtocolVersionSchema,
  AgentMaturitySchema,
  AgentRuntimeSchema,
} from "@veritas/agent-card";

/** Request body for building and returning an agent card. */
export const BuildCardRequestSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  protocolVersion: AgentProtocolVersionSchema.optional(),
  maturity: AgentMaturitySchema.optional(),
  runtime: AgentRuntimeSchema.optional(),
  url: z.string().url().optional(),
});
export type BuildCardRequest = z.infer<typeof BuildCardRequestSchema>;

/** Request body for publishing an agent card to a registry. */
export const PublishCardRequestSchema = z.object({
  registryUrl: z.string().url(),
  kind: z.enum(["croo", "custom", "dns-txt"]),
  authToken: z.string().optional(),
});
export type PublishCardRequest = z.infer<typeof PublishCardRequestSchema>;

/** Query params for discovery endpoint. */
export const DiscoveryQuerySchema = z.object({
  capabilities: z.string().optional(),
  tags: z.string().optional(),
});
export type DiscoveryQuery = z.infer<typeof DiscoveryQuerySchema>;

/** Inline endpoint descriptor for dynamic card builds. */
export const EndpointInputSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  protocol: ProtocolSchema,
  contentType: ContentTypeSchema.optional(),
  auth: AuthSchemeSchema,
  description: z.string().optional(),
  streaming: z.boolean().optional(),
});

/** Inline capability descriptor for dynamic card builds. */
export const CapabilityInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  kind: CapabilityKindSchema,
  skillIds: z.array(z.string().min(1)).min(1),
  requiresSubscription: z.boolean().optional(),
  minimumPlan: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/** Inline skill descriptor for dynamic card builds. */
export const SkillInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  inputModes: z.array(SkillInputModeSchema).min(1),
  outputModes: z.array(SkillOutputModeSchema).min(1),
  endpointName: z.string().min(1),
  tags: z.array(z.string()).optional(),
  beta: z.boolean().optional(),
});
