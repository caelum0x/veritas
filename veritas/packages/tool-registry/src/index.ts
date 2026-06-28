// @veritas/tool-registry: public surface re-export.

export {
  ToolCategorySchema,
  type ToolCategory,
  TOOL_CATEGORY_LABELS,
  TOOL_CATEGORY_DESCRIPTIONS,
  isToolCategory,
  getLabelForCategory,
  getDescriptionForCategory,
  ALL_TOOL_CATEGORIES,
} from "./category.js";

export {
  ToolNotFoundError,
  ToolAlreadyRegisteredError,
  ToolVersionConflictError,
  InvalidToolDescriptorError,
  ToolPermissionDeniedError,
} from "./errors.js";

export {
  type ParamType,
  type ToolParam,
  type ToolContext,
  toolParamSchema,
  toolContextSchema,
} from "./types.js";

export {
  type SemVer,
  semVerSchema,
  parseSemVer,
  compareSemVer,
  latestVersion,
  type VersionRecord,
  makeVersionRecord,
  deprecateVersionRecord,
} from "./versioning.js";

export {
  manifestEntrySchema,
  type ManifestEntry,
  toolManifestSchema,
  type ToolManifest,
  buildManifest,
  verifyManifest,
} from "./manifest.js";

export {
  toolIdSchema,
  toolVersionSchema,
  toolStatusSchema,
  toolDescriptorSchema,
  createToolDescriptorSchema,
  makeToolDescriptor,
  type ToolId,
  type ToolVersion,
  type ToolStatus,
  type ToolDescriptor,
  type CreateToolDescriptor,
} from "./descriptor.js";

export {
  createToolRegistry,
  type ToolRegistry,
} from "./registry.js";

export {
  searchTools,
  aggregateTags,
  aggregateByCategory,
  aggregateByStatus,
  searchQuerySchema,
  type SearchQuery,
  type SearchResult,
} from "./search.js";

export {
  TOOL_PERMISSIONS,
  permissionSchema,
  makePermissionSet,
  hasPermission,
  hasAllPermissions,
  checkToolPermissions,
  filterByPermissions,
  type BuiltInPermission,
  type Permission,
  type PermissionSet,
} from "./permission.js";
