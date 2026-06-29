// Public surface of @veritas/secrets — re-exports all secrets subsystem symbols.

export type {
  SecretId,
  SecretVersion,
  SecretValue,
  SecretMetadata,
  SecretEntry,
  SecretRef,
  RotationPolicy,
  AuditEventType,
  SecretAuditEntry,
  CacheEntry,
  VaultConfig,
  EnvAdapterConfig,
} from "./types.js";

export {
  SecretIdSchema,
  SecretVersionSchema,
  SecretValueSchema,
  SecretMetadataSchema,
  SecretEntrySchema,
  SecretRefSchema,
  RotationPolicySchema,
  AuditEventTypeSchema,
  SecretAuditEntrySchema,
  CacheEntrySchema,
  VaultConfigSchema,
  EnvAdapterConfigSchema,
} from "./types.js";

export {
  SecretNotFoundError,
  SecretAccessError,
  SecretRotationError,
  SecretValidationError,
  SecretVersionNotFoundError,
  SecretBackendError,
  SecretResolutionError,
} from "./errors.js";

export type { SecretsError } from "./errors.js";

export type {
  SecretName,
  SecretValue as SecretValueBranded,
  SecretVersion as SecretVersionBranded,
  ResolvedSecret,
} from "./secret.js";

export {
  secretName,
  secretVersion,
  secretValue,
  makeSecretRef,
  toSecretNameStr,
  toSecretVersionStr,
  toSecretValueStr,
  SecretRefSchema as SecretNameRefSchema,
  SecretMetadataSchema as SecretNameMetadataSchema,
  ResolvedSecretSchema,
} from "./secret.js";

export type {
  ListSecretsOptions,
  ListSecretsResult,
  SetSecretOptions,
  SecretsManager,
} from "./manager.js";

export { EnvSecretsManager } from "./env-adapter.js";
export type { EnvAdapterOptions } from "./env-adapter.js";
