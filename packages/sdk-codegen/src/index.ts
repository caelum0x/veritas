// Public surface of @veritas/sdk-codegen — re-exports all modules
export * from "./errors.js";
export {
  SdkTargetSchema,
  type SdkTarget,
  type EmittedFile,
  GeneratorOptionsSchema,
  type GeneratorOptions,
  type SchemaProperty,
  type ModelDefinition,
  type OperationParameter,
  type OperationDefinition,
  type ResourceGroup,
  type TargetDescriptor,
  type CodegenIR,
} from "./types.js";
export * from "./naming.js";
export * from "./emitter.js";
export * from "./template.js";
export * from "./model-gen.js";
export * from "./resource-gen.js";
export * from "./package-meta.js";
export * from "./typescript-target.js";
export * from "./python-target.js";
export * from "./go-target.js";
export * from "./generator.js";
