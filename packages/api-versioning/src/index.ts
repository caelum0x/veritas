// Re-exports the full public surface of @veritas/api-versioning.

export type { ApiVersion } from "./version.js";
export {
  apiVersion,
  versionString,
  compareVersions,
  V2024_01_01,
  V2024_06_01,
  V2025_01_01,
  V2025_06_01,
  SUPPORTED_VERSIONS,
  LATEST_VERSION,
  MINIMUM_VERSION,
  isSupported,
  isBefore,
  isAfter,
} from "./version.js";

export type {
  NegotiationSource,
  NegotiationResult,
  NegotiatorConfig,
} from "./negotiator.js";
export {
  DEFAULT_NEGOTIATOR_CONFIG,
  negotiate,
} from "./negotiator.js";

export type { DeprecationPolicy } from "./deprecation.js";
export {
  getDeprecationPolicy,
  isDeprecated,
  isSunset,
  allDeprecations,
  activeDeprecations,
} from "./deprecation.js";

export type { SunsetHeaders } from "./sunset.js";
export {
  buildSunsetHeaders,
  applySunsetHeaders,
  sunsetDateOf,
  deprecationDateOf,
} from "./sunset.js";

export type { CompatibilityEntry } from "./compatibility.js";
export {
  compatibilityMatrix,
  getCompatibility,
  isCompatible,
  versionsCompatibleWith,
} from "./compatibility.js";

export type { RouterOptions, VersionRouter } from "./router.js";
export { createVersionRouter, defaultVersionRouter } from "./router.js";

export type { MigrationRegistry } from "./migration.js";
export {
  createMigrationRegistry,
  defaultMigrationRegistry,
} from "./migration.js";

export type { VersionHeaders } from "./header.js";
export {
  extractVersionFromHeader,
  extractVersionFromPath,
  buildVersionResponseHeaders,
  parseAcceptVersionHeader,
  VERSION_HEADER,
  VERSION_ACCEPT_HEADER,
  VERSION_DEPRECATED_HEADER,
  VERSION_SUNSET_HEADER,
  VERSION_LINK_HEADER,
} from "./header.js";

export {
  UnsupportedVersionError,
  DeprecatedVersionError,
  MigrationError,
  VersionNegotiationError,
} from "./errors.js";

export type {
  VersionedRequest,
  VersionedResponse,
  MigrationStep,
  DeprecationInfo,
  RouteVersionConfig,
  VersionNegotiationResult,
} from "./types.js";
export {
  ApiVersionSchema,
  ALL_VERSIONS,
} from "./types.js";
