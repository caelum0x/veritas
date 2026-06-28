// Skill manifest: a serialisable snapshot of a skill's definition + metadata.
import { z } from "zod";
import { SkillDefinitionSchema } from "./skill.js";

export const SkillManifestSchema = z.object({
  schema: z.literal("veritas-skill/v1"),
  skill: SkillDefinitionSchema,
  registeredAt: z.string().datetime(),
  source: z.enum(["built-in", "loaded", "dynamic"]).default("built-in"),
  loaderPath: z.string().optional(),
});

export type SkillManifest = z.infer<typeof SkillManifestSchema>;

/** Build an immutable manifest for a registered skill. */
export function buildManifest(
  skill: z.infer<typeof SkillDefinitionSchema>,
  source: SkillManifest["source"] = "built-in",
  loaderPath?: string,
): SkillManifest {
  return Object.freeze({
    schema: "veritas-skill/v1" as const,
    skill: Object.freeze(skill),
    registeredAt: new Date().toISOString(),
    source,
    loaderPath,
  });
}

/** Validate and parse a raw object as a SkillManifest. */
export function parseManifest(raw: unknown): SkillManifest {
  return SkillManifestSchema.parse(raw);
}
