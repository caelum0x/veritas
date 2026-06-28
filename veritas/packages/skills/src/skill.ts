// Agent skill definition — interface and base value-object for a callable skill.
import { z } from "zod";
import { type Result } from "@veritas/core";
import {
  SkillParameterSchema,
  SkillOutputSchema,
  SkillCategorySchema,
  type SkillInput,
  type SkillResult,
} from "./types.js";
import { type SkillInvocationError, type SkillValidationError } from "./errors.js";

export const SkillDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(1),
  category: SkillCategorySchema,
  parameters: z.array(SkillParameterSchema).default([]),
  output: SkillOutputSchema,
  tags: z.array(z.string()).default([]),
  deprecated: z.boolean().default(false),
  deprecationMessage: z.string().optional(),
});

export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;

export type SkillHandler = (
  input: SkillInput,
) => Promise<Result<SkillResult, SkillInvocationError | SkillValidationError>>;

/** A fully-wired skill: its static definition plus the callable handler. */
export interface Skill {
  readonly definition: SkillDefinition;
  readonly handler: SkillHandler;
}

/** Create an immutable Skill value-object from a definition and handler. */
export function defineSkill(
  definition: SkillDefinition,
  handler: SkillHandler,
): Skill {
  return Object.freeze({ definition: Object.freeze(definition), handler });
}
