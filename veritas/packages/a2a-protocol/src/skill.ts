// Advertised skills: schema + helpers for A2A agent capability advertisements.

import { z } from "zod";

/** Input/output mode a skill supports. */
export const SkillModalitySchema = z.enum([
  "text",
  "json",
  "file",
  "structured",
]);
export type SkillModality = z.infer<typeof SkillModalitySchema>;

/** A single capability an agent advertises to peers. */
export const SkillSchema = z.object({
  /** Machine-readable identifier, e.g. "fact-check-claim". */
  id: z.string().min(1),
  /** Human-readable name. */
  name: z.string().min(1),
  /** Short description of what the skill does. */
  description: z.string(),
  /** Semantic version of the skill's interface. */
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "must be semver"),
  /** Supported input/output modalities. */
  inputModes: z.array(SkillModalitySchema).min(1),
  outputModes: z.array(SkillModalitySchema).min(1),
  /**
   * Optional JSON Schema ref ($schema or $id) that callers can use to
   * validate parameters before sending a task.
   */
  inputSchemaRef: z.string().url().optional(),
  outputSchemaRef: z.string().url().optional(),
  /** Arbitrary metadata (pricing hints, SLA, etc.). */
  tags: z.array(z.string()).optional(),
});
export type Skill = z.infer<typeof SkillSchema>;

/** Registry of skills keyed by skill id. */
export type SkillRegistry = ReadonlyMap<string, Skill>;

/** Build an immutable skill registry from an array. */
export function buildSkillRegistry(skills: readonly Skill[]): SkillRegistry {
  return new Map(skills.map((s) => [s.id, s]));
}

/** Look up a skill by id, returning undefined when absent. */
export function findSkill(
  registry: SkillRegistry,
  id: string,
): Skill | undefined {
  return registry.get(id);
}

/** Return all skills that support a given input modality. */
export function filterByInputMode(
  registry: SkillRegistry,
  mode: SkillModality,
): Skill[] {
  return Array.from(registry.values()).filter((s) =>
    s.inputModes.includes(mode),
  );
}
