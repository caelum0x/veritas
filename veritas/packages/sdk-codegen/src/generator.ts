// SDK generator: validates options, builds the IR, dispatches to the correct target.
import { z } from "zod";
import type {
  CodegenIR,
  GeneratorOptions,
  ModelDefinition,
  OperationDefinition,
  ResourceGroup,
  SdkTarget,
  TargetDescriptor,
} from "./types.js";
import { GeneratorOptionsSchema } from "./types.js";
import { UnsupportedTargetError, InvalidSchemaError } from "./errors.js";
import { generateTypeScriptTarget } from "./typescript-target.js";
import { generatePythonTarget } from "./python-target.js";
import { generateGoTarget } from "./go-target.js";

// ---------------------------------------------------------------------------
// Minimal OpenAPI-like input schema for the generator
// ---------------------------------------------------------------------------

const SchemaPropertyInputSchema = z.object({
  name: z.string().min(1),
  type: z.string().default("string"),
  required: z.boolean().default(true),
  nullable: z.boolean().default(false),
  description: z.string().default(""),
  enumValues: z.array(z.string()).nullable().default(null),
  arrayItemType: z.string().nullable().default(null),
  $ref: z.string().nullable().default(null),
});

const ModelDefinitionInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  properties: z.array(SchemaPropertyInputSchema).default([]),
});

const OperationParameterInputSchema = z.object({
  name: z.string().min(1),
  in: z.enum(["path", "query", "header"]),
  required: z.boolean().default(false),
  type: z.string().default("string"),
  description: z.string().default(""),
});

const OperationDefinitionInputSchema = z.object({
  operationId: z.string().min(1),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().min(1),
  summary: z.string().default(""),
  description: z.string().default(""),
  parameters: z.array(OperationParameterInputSchema).default([]),
  requestBodyType: z.string().nullable().default(null),
  responseType: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
  deprecated: z.boolean().default(false),
});

const ResourceGroupInputSchema = z.object({
  tag: z.string().min(1),
  operations: z.array(OperationDefinitionInputSchema).default([]),
});

const GeneratorInputSchema = z.object({
  options: GeneratorOptionsSchema,
  models: z.array(ModelDefinitionInputSchema).default([]),
  resources: z.array(ResourceGroupInputSchema).default([]),
});

export type GeneratorInput = z.infer<typeof GeneratorInputSchema>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildIR(input: z.infer<typeof GeneratorInputSchema>): CodegenIR {
  const models: ModelDefinition[] = input.models.map((m) => ({
    name: m.name,
    description: m.description,
    properties: m.properties.map((p) => ({
      name: p.name,
      type: p.type,
      required: p.required,
      nullable: p.nullable,
      description: p.description,
      enumValues: p.enumValues,
      arrayItemType: p.arrayItemType,
      $ref: p.$ref,
    })),
  }));

  const resources: ResourceGroup[] = input.resources.map((r) => ({
    tag: r.tag,
    operations: r.operations
      .filter((op) => input.options.includeDeprecated || !op.deprecated)
      .map((op): OperationDefinition => ({
        operationId: op.operationId,
        method: op.method,
        path: op.path,
        summary: op.summary,
        description: op.description,
        parameters: op.parameters.map((p) => ({
          name: p.name,
          in: p.in,
          required: p.required,
          type: p.type,
          description: p.description,
        })),
        requestBodyType: op.requestBodyType,
        responseType: op.responseType,
        tags: op.tags,
        deprecated: op.deprecated,
      })),
  }));

  return { models, resources, options: input.options };
}

function dispatchTarget(target: SdkTarget, ir: CodegenIR): TargetDescriptor {
  switch (target) {
    case "typescript":
      return generateTypeScriptTarget(ir);
    case "python":
      return generatePythonTarget(ir);
    case "go":
      return generateGoTarget(ir);
    default:
      throw new UnsupportedTargetError(target as string);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Validate raw generator input; returns typed input or throws InvalidSchemaError. */
export function validateGeneratorInput(raw: unknown): GeneratorInput {
  const result = GeneratorInputSchema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join(".") ?? "input";
    const msg = first?.message ?? "validation failed";
    throw new InvalidSchemaError(path, msg);
  }
  return result.data;
}

/** Run the generator pipeline for a single target and return the descriptor. */
export function runGenerator(raw: unknown): TargetDescriptor {
  const input = validateGeneratorInput(raw);
  const ir = buildIR(input);
  return dispatchTarget(input.options.target, ir);
}

/** Run the generator for all three targets and return a map of target → descriptor. */
export function runGeneratorAllTargets(
  rawWithoutTarget: Omit<GeneratorInput, "options"> & {
    options: Omit<GeneratorOptions, "target">;
  },
): ReadonlyMap<SdkTarget, TargetDescriptor> {
  const targets: SdkTarget[] = ["typescript", "python", "go"];
  const result = new Map<SdkTarget, TargetDescriptor>();
  for (const target of targets) {
    const merged = { ...rawWithoutTarget, options: { ...rawWithoutTarget.options, target } };
    result.set(target, runGenerator(merged));
  }
  return result;
}
