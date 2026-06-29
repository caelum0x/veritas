// Public re-exports for the @veritas/attestation package

// Types
export type {
  AttestationUid,
  AttesterAddress,
  SchemaUid,
  AttestationStatus,
  AttestationRef,
  BatchAnchorRef,
  ReportAttestOptions,
  ReportAttestResult,
} from "./types.js";
export { AttestationStatusSchema, AttestationRefSchema, BatchAnchorRefSchema } from "./types.js";

// Attestation record
export type { Attestation, AttestationData, CreateAttestation } from "./attestation.js";
export { AttestationSchema, AttestationDataSchema, CreateAttestationSchema } from "./attestation.js";

// Schema
export type { AttestationSchema as AttestationSchemaDef, SchemaField, RegisterSchema } from "./schema.js";
export {
  AttestationSchemaSchema,
  SchemaFieldSchema,
  RegisterSchemaSchema,
  deriveSchemaUid,
  VERITAS_REPORT_SCHEMA,
} from "./schema.js";

// UID derivation
export type { UidInput } from "./uid.js";
export { deriveUid, isAttestationUid, ZERO_UID } from "./uid.js";

// Encoder
export type { AttestationPayload } from "./encoder.js";
export {
  encodeContentHashData,
  encodeStringData,
  buildAttestationPayload,
  serializePayload,
} from "./encoder.js";

// Registry port and in-memory implementation
export type { AttestationQuery, AttestationRegistry } from "./registry.js";
export { InMemoryAttestationRegistry } from "./memory-registry.js";

// Record store
export type { AttestationRecordStore } from "./record-store.js";
export { InMemoryAttestationRecordStore } from "./record-store.js";

// On-chain port and mock
export type { AttestTxParams, TxReceipt, OnchainPort } from "./onchain-port.js";
export { MockOnchainPort } from "./mock-onchain.js";

// Anchor
export type { AnchorRequest, AnchorResult } from "./anchor.js";
export { Anchor } from "./anchor.js";

// Report attester
export { ReportAttester, hashReport } from "./report-attester.js";

// Explorer
export type { ExplorerChain, AttestationLinks } from "./explorer.js";
export {
  buildAttestationLinks,
  easExplorerUrl,
  blockExplorerUrl,
  chainIdToExplorerChain,
} from "./explorer.js";

// Errors
export {
  AttestationNotFoundError,
  AttestationRevokedError,
  SchemaNotFoundError,
  AttestationPublishError,
  AnchorError,
  AttestationVerifyError,
  AttestationEncodeError,
  isAttestationError,
} from "./errors.js";
export type { AttestationError } from "./errors.js";
