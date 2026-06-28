// Agent capability card — root document describing Veritas as a CROO agent.

import { z } from "zod";
import { CapabilitySchema } from "./capability.js";
import { SkillSchema } from "./skill.js";
import { EndpointSchema } from "./endpoint.js";
import { AuthSchemeSchema } from "./authentication.js";

export const AgentStatusSchema = z.enum(["active", "maintenance", "deprecated", "preview"]);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const AgentContactSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  url: z.string().url().optional(),
});
export type AgentContact = z.infer<typeof AgentContactSchema>;

export const AgentLicenseSchema = z.object({
  name: z.string().min(1),
  url: z.string().url().optional(),
});
export type AgentLicense = z.infer<typeof AgentLicenseSchema>;

export const AgentCardSchema = z.object({
  /** CROO Agent Protocol schema version, e.g. "1.0". */
  schemaVersion: z.string().min(1),
  /** Unique agent identifier, e.g. "veritas". */
  id: z.string().min(1),
  /** Human-readable display name. */
  name: z.string().min(1),
  /** Short description for agent directories. */
  description: z.string().min(1),
  /** Semver string. */
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** Agent homepage or docs URL. */
  url: z.string().url(),
  /** Logo URL (PNG/SVG). */
  logoUrl: z.string().url().optional(),
  /** Contact info for the operator. */
  contact: AgentContactSchema.optional(),
  /** License under which the agent operates. */
  license: AgentLicenseSchema.optional(),
  /** Operational status. */
  status: AgentStatusSchema.default("active"),
  /** Default authentication schemes accepted by the agent. */
  defaultAuth: z.array(AuthSchemeSchema).min(1),
  /** All endpoints this agent exposes. */
  endpoints: z.array(EndpointSchema).min(1),
  /** Atomic skill catalogue. */
  skills: z.array(SkillSchema).min(1),
  /** High-level capability groupings. */
  capabilities: z.array(CapabilitySchema).min(1),
  /** Tags for discovery and filtering. */
  tags: z.array(z.string()).default([]),
  /** ISO-8601 timestamp of when this card was last updated. */
  updatedAt: z.string().datetime(),
  /** Arbitrary extra metadata. */
  metadata: z.record(z.unknown()).default({}),
});
export type AgentCard = z.infer<typeof AgentCardSchema>;

export const CreateAgentCardSchema = AgentCardSchema.omit({
  status: true,
  tags: true,
  metadata: true,
}).extend({
  status: AgentStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateAgentCard = z.infer<typeof CreateAgentCardSchema>;

/** Parse and validate a raw object into an AgentCard, throwing on invalid input. */
export function parseAgentCard(raw: unknown): AgentCard {
  return AgentCardSchema.parse(raw);
}

/** Build a validated AgentCard with defaults applied. */
export function makeAgentCard(input: CreateAgentCard): AgentCard {
  return AgentCardSchema.parse(input);
}
