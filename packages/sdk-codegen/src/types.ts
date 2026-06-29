// Core types and interfaces for the SDK codegen pipeline
import { z } from "zod";

// ---------------------------------------------------------------------------
// Target languages
// ---------------------------------------------------------------------------

export const SdkTargetSchema = z.enum(["typescript", "python", "go"]);
export type SdkTarget = z.infer<typeof SdkTargetSchema>;

// ---------------------------------------------------------------------------
// Code emission units
// ---------------------------------------------------------------------------

export interface EmittedFile {
  readonly path: string;
  readonly content: string;
  readonly language: SdkTarget;
}

// ---------------------------------------------------------------------------
// Generator options
// ---------------------------------------------------------------------------

export const GeneratorOptionsSchema = z.object({
  target: SdkTargetSchema,
  packageName: z.string().min(1),
  packageVersion: z.string().regex(/^\d+\.\d+\.\d+/, "Must be semver"),
  baseUrl: z.string().url(),
  outputDir: z.string().min(1),
  includeDeprecated: z.boolean().default(false),
});

export type GeneratorOptions = z.infer<typeof GeneratorOptionsSchema>;

// ---------------------------------------------------------------------------
// OpenAPI subset types used internally
// ---------------------------------------------------------------------------

export interface SchemaProperty {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly nullable: boolean;
  readonly description: string;
  readonly enumValues: readonly string[] | null;
  readonly arrayItemType: string | null;
  readonly $ref: string | null;
}

export interface ModelDefinition {
  readonly name: string;
  readonly description: string;
  readonly properties: readonly SchemaProperty[];
}

export interface OperationParameter {
  readonly name: string;
  readonly in: "path" | "query" | "header";
  readonly required: boolean;
  readonly type: string;
  readonly description: string;
}

export interface OperationDefinition {
  readonly operationId: string;
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly path: string;
  readonly summary: string;
  readonly description: string;
  readonly parameters: readonly OperationParameter[];
  readonly requestBodyType: string | null;
  readonly responseType: string | null;
  readonly tags: readonly string[];
  readonly deprecated: boolean;
}

export interface ResourceGroup {
  readonly tag: string;
  readonly operations: readonly OperationDefinition[];
}

// ---------------------------------------------------------------------------
// Target descriptor (output of language-specific target modules)
// ---------------------------------------------------------------------------

export interface TargetDescriptor {
  readonly target: SdkTarget;
  readonly files: readonly EmittedFile[];
  readonly packageMeta: PackageMeta;
}

export interface PackageMeta {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly language: SdkTarget;
  readonly repositoryUrl: string | null;
  readonly license: string;
}

// ---------------------------------------------------------------------------
// Intermediate representation shared across all targets
// ---------------------------------------------------------------------------

export interface CodegenIR {
  readonly models: readonly ModelDefinition[];
  readonly resources: readonly ResourceGroup[];
  readonly options: GeneratorOptions;
}
