// AttestationRegistry port: interface for reading/writing attestations on-chain or in storage

import type { Result } from "@veritas/core";
import type { Attestation, CreateAttestation } from "./attestation.js";
import type { AttestationSchema, RegisterSchema } from "./schema.js";

/** Query options for listing attestations */
export interface AttestationQuery {
  readonly attester?: string;
  readonly schemaUid?: string;
  readonly reportId?: string;
  readonly status?: "active" | "revoked";
  readonly limit?: number;
  readonly offset?: number;
}

/** Port interface for an attestation registry (on-chain or in-memory) */
export interface AttestationRegistry {
  /** Register a new attestation schema; returns the schema with its derived UID */
  registerSchema(input: RegisterSchema): Promise<Result<AttestationSchema>>;

  /** Retrieve a schema by UID */
  getSchema(uid: string): Promise<Result<AttestationSchema>>;

  /** List all registered schemas */
  listSchemas(): Promise<Result<readonly AttestationSchema[]>>;

  /** Create and persist a new attestation; returns the stored record */
  attest(input: CreateAttestation): Promise<Result<Attestation>>;

  /** Retrieve an attestation by its UID */
  getAttestation(uid: string): Promise<Result<Attestation>>;

  /** Query attestations by optional filters */
  queryAttestations(query: AttestationQuery): Promise<Result<readonly Attestation[]>>;

  /** Revoke an existing attestation; returns the updated record */
  revoke(uid: string, revoker: string): Promise<Result<Attestation>>;
}
