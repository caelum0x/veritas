// Public surface of @veritas/encryption-at-rest: envelope encryption, key hierarchy, field-level encryption.

// Types
export type {
  KekId,
  DekId,
  DataKey,
  EncryptedField,
  FieldDescriptor,
  EncryptedRecord,
  EncryptedEnvelope,
  SearchableEncryptionOptions,
  SearchToken,
  RotationPlan,
  RotationResult,
} from "./types.js";
export {
  kekId,
  dekId,
  asSearchToken,
  encryptedEnvelopeSchema,
} from "./types.js";

// Errors
export {
  EncryptionAtRestError,
  KeyHierarchyError,
  EnvelopeDecryptionError,
  FieldEncryptionError,
  KeyRotationError,
  SearchableEncryptionError,
} from "./errors.js";

// Cipher (AES-256-GCM)
export {
  cipherEncrypt,
  cipherDecrypt,
  cipherEncryptString,
  cipherDecryptString,
} from "./cipher.js";

// Data key generation
export {
  generateDataKey,
  deriveSubKey,
  zeroize,
} from "./data-key.js";

// KMS provider port + in-memory mock
export type { KmsProvider } from "./provider.js";
export { InMemoryKmsProvider } from "./provider.js";

// Encrypted value wrapper
export type { EncryptedValue } from "./encrypted-value.js";
export {
  encryptedValue,
  isEncryptedValue,
  encryptedValueSchema,
  serializeEncryptedValue,
  deserializeEncryptedValue,
  getEnvelope,
} from "./encrypted-value.js";

// Key rotation
export {
  createRotationPlan,
  rotateEnvelope,
  rotateBatch,
  validateRotationPlan,
} from "./rotation.js";

// Searchable (deterministic) encryption
export {
  deriveSearchToken,
  deriveSearchTokens,
  matchesSearchToken,
  normalizeForSearch,
  deriveNormalizedSearchToken,
} from "./searchable.js";

// Additional errors
export { KmsProviderError } from "./errors.js";
