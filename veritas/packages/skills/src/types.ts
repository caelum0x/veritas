// Shared value types for the skills package — no business logic here.
import { z } from "zod";

export const SkillParameterSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "object", "array"]),
  description: z.string(),
  required: z.boolean().default(false),
  schema: z.record(z.unknown()).optional(),
});

export type SkillParameter = z.infer<typeof SkillParameterSchema>;

export const SkillOutputSchema = z.object({
  type: z.enum(["string", "number", "boolean", "object", "array"]),
  description: z.string(),
  schema: z.record(z.unknown()).optional(),
});

export type SkillOutput = z.infer<typeof SkillOutputSchema>;

export const SkillCategorySchema = z.enum([
  "verification",
  "sourcing",
  "analysis",
  "reporting",
  "utility",
]);

export type SkillCategory = z.infer<typeof SkillCategorySchema>;

export type SkillInput = Record<string, unknown>;
export type SkillResult = Record<string, unknown>;
