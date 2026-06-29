// @veritas/prompt-library — public surface re-export.

export {
  PromptRoleSchema,
  type PromptRole,
  PromptMessageSchema,
  type PromptMessage,
  PromptVariableSchema,
  type PromptVariable,
  PromptMetaSchema,
  type PromptMeta,
  PromptTemplateSchema,
  type PromptTemplate,
  definePrompt,
} from "./prompt.js";

export {
  type VersionInfo,
  type VersionedEntry,
  parseVersion,
  compareVersions,
  isCompatible,
  sortByVersion,
  latestEntry,
} from "./version.js";

export {
  type VariableMap,
  type RenderedPrompt,
  type PromptPartial,
  type RegistryEntry,
  PromptCategorySchema,
  type PromptCategory,
  type PromptEvalMetadata,
  type RenderOptions,
  DEFAULT_RENDER_OPTIONS,
} from "./types.js";

export {
  PromptNotFoundError,
  PromptVersionNotFoundError,
  PromptRenderError,
  PromptValidationError,
  PartialNotFoundError,
  PromptConflictError,
} from "./errors.js";

export {
  type PartialMap,
  registerPartial,
  getPartial,
  listPartials,
  clearPartials,
  resolvePartials,
  BUILTIN_PARTIALS,
} from "./partials.js";

export {
  type RenderInput,
  type RenderOutput,
  renderPrompt,
} from "./render.js";

export {
  verificationPrompt,
  verificationWithContextPrompt,
} from "./library/verification.js";
