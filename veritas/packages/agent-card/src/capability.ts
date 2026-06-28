// Capability descriptor — high-level functional grouping of related skills on the agent card.

import { z } from "zod";

export const CapabilityKindSchema = z.enum([
  "verification",
  "sourcing",
  "provenance",
  "billing",
  "discovery",
  "administration",
  "analytics",
  "custom",
]);
export type CapabilityKind = z.infer<typeof CapabilityKindSchema>;

export const CapabilityLimitSchema = z.object({
  /** The metric name being limited, e.g. "requests_per_minute". */
  metric: z.string().min(1),
  /** The numeric ceiling value. */
  limit: z.number().positive(),
  /** Time window in seconds to which the limit applies, if rate-based. */
  windowSeconds: z.number().positive().optional(),
});
export type CapabilityLimit = z.infer<typeof CapabilityLimitSchema>;

export const CapabilitySchema = z.object({
  /** Unique slug, e.g. "fact-verification". */
  id: z.string().min(1),
  /** Display name. */
  name: z.string().min(1),
  /** Short description suitable for agent directories. */
  description: z.string().min(1),
  /** Functional category. */
  kind: CapabilityKindSchema,
  /** Skill IDs (from the card's skills list) that belong to this capability. */
  skillIds: z.array(z.string().min(1)).min(1),
  /** Rate or quota limits imposed on this capability. */
  limits: z.array(CapabilityLimitSchema).default([]),
  /** Whether callers must hold a paid subscription to use this capability. */
  requiresSubscription: z.boolean().default(false),
  /** Minimum plan tier required, if applicable, e.g. "pro". */
  minimumPlan: z.string().optional(),
  /** Arbitrary metadata tags. */
  tags: z.array(z.string()).default([]),
});
export type Capability = z.infer<typeof CapabilitySchema>;

export const CreateCapabilitySchema = CapabilitySchema.omit({
  limits: true,
  requiresSubscription: true,
  tags: true,
}).extend({
  limits: z.array(CapabilityLimitSchema).optional(),
  requiresSubscription: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});
export type CreateCapability = z.infer<typeof CreateCapabilitySchema>;

/** Build a validated Capability with defaults applied. */
export function makeCapability(input: CreateCapability): Capability {
  return CapabilitySchema.parse(input);
}
