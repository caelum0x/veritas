// Skill descriptor — a named atomic capability exposed by the agent.

import { z } from "zod";

export const SkillInputModeSchema = z.enum(["text", "json", "binary", "multipart"]);
export type SkillInputMode = z.infer<typeof SkillInputModeSchema>;

export const SkillOutputModeSchema = z.enum(["text", "json", "binary", "stream"]);
export type SkillOutputMode = z.infer<typeof SkillOutputModeSchema>;

export const SkillExampleSchema = z.object({
  title: z.string(),
  input: z.unknown(),
  output: z.unknown(),
});
export type SkillExample = z.infer<typeof SkillExampleSchema>;

export const SkillSchema = z.object({
  /** Unique slug identifier, e.g. "fact-check". */
  id: z.string().min(1),
  /** Human-readable name. */
  name: z.string().min(1),
  /** One-line description surfaced in agent directories. */
  description: z.string().min(1),
  /** Version string following semver conventions. */
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** Accepted input modes. */
  inputModes: z.array(SkillInputModeSchema).min(1),
  /** Produced output modes. */
  outputModes: z.array(SkillOutputModeSchema).min(1),
  /** Optional JSON Schema string describing the input payload. */
  inputSchema: z.string().optional(),
  /** Optional JSON Schema string describing the output payload. */
  outputSchema: z.string().optional(),
  /** Illustrative input/output examples. */
  examples: z.array(SkillExampleSchema).default([]),
  /** Arbitrary tags for filtering/discovery. */
  tags: z.array(z.string()).default([]),
  /** Whether this skill is currently in beta. */
  beta: z.boolean().default(false),
  /** Endpoint name (from the card's endpoints list) that serves this skill. */
  endpointName: z.string().min(1),
});
export type Skill = z.infer<typeof SkillSchema>;

export const CreateSkillSchema = SkillSchema.omit({
  examples: true,
  tags: true,
  beta: true,
}).extend({
  examples: z.array(SkillExampleSchema).optional(),
  tags: z.array(z.string()).optional(),
  beta: z.boolean().optional(),
});
export type CreateSkill = z.infer<typeof CreateSkillSchema>;

/** Build a validated Skill, applying defaults. */
export function makeSkill(input: CreateSkill): Skill {
  return SkillSchema.parse(input);
}
