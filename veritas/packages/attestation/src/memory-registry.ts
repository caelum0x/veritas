// In-memory implementation of AttestationRegistry for testing and local development

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Attestation, CreateAttestation } from "./attestation.js";
import type { AttestationSchema, RegisterSchema } from "./schema.js";
import { deriveSchemaUid } from "./schema.js";
import { deriveUid } from "./uid.js";
import type { AttestationQuery, AttestationRegistry } from "./registry.js";
import { AttestationNotFoundError, AttestationRevokedError, SchemaNotFoundError } from "./errors.js";

export class InMemoryAttestationRegistry implements AttestationRegistry {
  private readonly schemas = new Map<string, AttestationSchema>();
  private readonly attestations = new Map<string, Attestation>();

  async registerSchema(input: RegisterSchema): Promise<Result<AttestationSchema>> {
    const uid = deriveSchemaUid(input);
    if (this.schemas.has(uid)) {
      return ok(this.schemas.get(uid)!);
    }
    const schema: AttestationSchema = {
      ...input,
      uid,
      registeredAt: Math.floor(Date.now() / 1000),
    };
    this.schemas.set(uid, schema);
    return ok(schema);
  }

  async getSchema(uid: string): Promise<Result<AttestationSchema>> {
    const schema = this.schemas.get(uid);
    if (!schema) return err(new SchemaNotFoundError(uid));
    return ok(schema);
  }

  async listSchemas(): Promise<Result<readonly AttestationSchema[]>> {
    return ok(Array.from(this.schemas.values()));
  }

  async attest(input: CreateAttestation): Promise<Result<Attestation>> {
    const now = Math.floor(Date.now() / 1000);
    const uid = deriveUid({
      schemaId: input.schemaUid,
      attester: input.attester,
      recipient: input.recipient ?? "0x0000000000000000000000000000000000000000",
      reportHash: input.data.reportHash,
      time: input.data.issuedAt,
      expirationTime: 0,
      revocable: input.revocable,
      salt: String(input.chainId),
    });
    const record: Attestation = {
      ...input,
      uid,
      status: "active",
      createdAt: now,
    };
    this.attestations.set(uid, record);
    return ok(record);
  }

  async getAttestation(uid: string): Promise<Result<Attestation>> {
    const record = this.attestations.get(uid);
    if (!record) return err(new AttestationNotFoundError(uid));
    return ok(record);
  }

  async queryAttestations(query: AttestationQuery): Promise<Result<readonly Attestation[]>> {
    let results = Array.from(this.attestations.values());

    if (query.attester !== undefined) {
      results = results.filter((a) => a.attester === query.attester);
    }
    if (query.schemaUid !== undefined) {
      results = results.filter((a) => a.schemaUid === query.schemaUid);
    }
    if (query.reportId !== undefined) {
      results = results.filter((a) => a.data.reportId === query.reportId);
    }
    if (query.status !== undefined) {
      results = results.filter((a) => a.status === query.status);
    }

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 100;
    return ok(results.slice(offset, offset + limit));
  }

  async revoke(uid: string, _revoker: string): Promise<Result<Attestation>> {
    const record = this.attestations.get(uid);
    if (!record) return err(new AttestationNotFoundError(uid));
    if (record.status === "revoked") return err(new AttestationRevokedError(uid));

    const revoked: Attestation = {
      ...record,
      status: "revoked",
      revokedAt: Math.floor(Date.now() / 1000),
    };
    this.attestations.set(uid, revoked);
    return ok(revoked);
  }

  /** Utility: clear all state (useful in tests) */
  clear(): void {
    this.schemas.clear();
    this.attestations.clear();
  }
}
