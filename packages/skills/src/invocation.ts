// Skill invocation — validates input and delegates to a Skill's handler.
import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import { type Skill } from "./skill.js";
import {
  type SkillRegistry,
  defaultRegistry,
} from "./registry.js";
import { loadSkill, type LoadOptions } from "./loader.js";
import {
  SkillValidationError,
  SkillInvocationError,
  SkillNotFoundError,
} from "./errors.js";
import { type SkillInput, type SkillResult } from "./types.js";

export interface InvokeOptions {
  /** Override registry used for skill lookup. */
  registry?: SkillRegistry;
  /** Dynamic path forwarded to loadSkill when skill not in registry. */
  dynamicPath?: string;
}

export type InvokeError =
  | SkillNotFoundError
  | SkillValidationError
  | SkillInvocationError;

/** Validate raw input against a skill's declared parameter schemas. */
function validateInput(
  skill: Skill,
  input: SkillInput,
): Result<SkillInput, SkillValidationError> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const param of skill.definition.parameters) {
    let fieldSchema: z.ZodTypeAny;

    switch (param.type) {
      case "string":
        fieldSchema = z.string();
        break;
      case "number":
        fieldSchema = z.number();
        break;
      case "boolean":
        fieldSchema = z.boolean();
        break;
      case "array":
        fieldSchema = z.array(z.unknown());
        break;
      case "object":
        fieldSchema = z.record(z.unknown());
        break;
      default:
        fieldSchema = z.unknown();
    }

    shape[param.name] = param.required ? fieldSchema : fieldSchema.optional();
  }

  const parsed = z.object(shape).safeParse(input);
  if (!parsed.success) {
    const msgs = parsed.error.issues.map((i) => i.message).join("; ");
    return err(
      new SkillValidationError(`Invalid input for skill '${skill.definition.id}': ${msgs}`),
    );
  }

  return ok(parsed.data as SkillInput);
}

/** Invoke a skill by id with validated input. */
export async function invokeSkill(
  skillId: string,
  input: SkillInput,
  options: InvokeOptions = {},
): Promise<Result<SkillResult, InvokeError>> {
  const loadOptions: LoadOptions = {
    registry: options.registry ?? defaultRegistry,
    dynamicPath: options.dynamicPath,
  };

  const loadResult = await loadSkill(skillId, loadOptions);
  if (!loadResult.ok) return loadResult;

  const skill = loadResult.value;

  const validationResult = validateInput(skill, input);
  if (!validationResult.ok) return validationResult;

  const handlerResult = await skill.handler(validationResult.value);
  return handlerResult;
}

/** Invoke a pre-loaded Skill directly (no registry lookup). */
export async function invokeSkillDirect(
  skill: Skill,
  input: SkillInput,
): Promise<Result<SkillResult, SkillValidationError | SkillInvocationError>> {
  const validationResult = validateInput(skill, input);
  if (!validationResult.ok) return validationResult;
  return skill.handler(validationResult.value);
}
