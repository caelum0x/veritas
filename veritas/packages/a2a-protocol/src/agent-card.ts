// A2A agent card: self-description that an agent publishes for discovery.

import { z } from "zod";

export const A2ACapabilitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  inputSchema: z.record(z.string(), z.unknown()).optional(),
  outputSchema: z.record(z.string(), z.unknown()).optional(),
});
export type A2ACapability = z.infer<typeof A2ACapabilitySchema>;

export const A2AAuthMethodSchema = z.enum(["none", "api-key", "jwt", "did"]);
export type A2AAuthMethod = z.infer<typeof A2AAuthMethodSchema>;

export const A2AAgentCardSchema = z.object({
  /** Unique agent identifier (DID or opaque id). */
  agentId: z.string().min(1),
  /** Human-readable agent name. */
  name: z.string().min(1),
  /** Short description of what this agent does. */
  description: z.string(),
  /** Publicly accessible base URL for A2A requests. */
  endpoint: z.string().url(),
  /** Semantic version of the A2A protocol spoken by this agent. */
  protocolVersion: z.string().default("1.0"),
  /** List of task capabilities this agent can fulfill. */
  capabilities: z.array(A2ACapabilitySchema),
  /** Supported authentication methods, in preference order. */
  authMethods: z.array(A2AAuthMethodSchema).default(["api-key"]),
  /** Arbitrary JSON-safe metadata bag. */
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** ISO-8601 timestamp when the card was last updated. */
  updatedAt: z.string().datetime({ offset: true }),
});
export type A2AAgentCard = z.infer<typeof A2AAgentCardSchema>;

/** Produce a minimal agent card with required fields only. */
export function makeAgentCard(
  partial: Omit<A2AAgentCard, "protocolVersion" | "authMethods"> &
    Partial<Pick<A2AAgentCard, "protocolVersion" | "authMethods">>
): A2AAgentCard {
  return A2AAgentCardSchema.parse({
    protocolVersion: "1.0",
    authMethods: ["api-key"],
    ...partial,
  });
}
