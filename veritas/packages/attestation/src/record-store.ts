// In-memory store for attestation records indexed by UID and content hash.

import { ok, err, NotFoundError } from "@veritas/core";
import type { Result, ContentHash } from "@veritas/core";
import type { Attestation } from "./attestation.js";
import type { AttestationUid } from "./uid.js";

/** Read/write port for persisting and querying Attestation records. */
export interface AttestationRecordStore {
  save(attestation: Attestation): Promise<Result<Attestation>>;
  findByUid(uid: AttestationUid): Promise<Result<Attestation>>;
  findByContentHash(hash: ContentHash): Promise<Result<readonly Attestation[]>>;
  findBySchemaUid(schemaUid: string): Promise<Result<readonly Attestation[]>>;
  list(): Promise<Result<readonly Attestation[]>>;
}

/** In-memory implementation of AttestationRecordStore. */
export class InMemoryAttestationRecordStore implements AttestationRecordStore {
  private readonly byUid = new Map<AttestationUid, Attestation>();
  private readonly byHash = new Map<string, Attestation[]>();
  private readonly bySchema = new Map<string, Attestation[]>();

  async save(attestation: Attestation): Promise<Result<Attestation>> {
    const uid = attestation.uid as AttestationUid;
    const existing = this.byUid.get(uid);
    if (existing !== undefined) {
      // Upsert: replace with updated record.
    }
    this.byUid.set(uid, attestation);

    const hashKey = attestation.data.reportHash;
    const hashList = this.byHash.get(hashKey) ?? [];
    const withoutOld = hashList.filter((a) => a.uid !== attestation.uid);
    this.byHash.set(hashKey, [...withoutOld, attestation]);

    const schemaList = this.bySchema.get(attestation.schemaUid) ?? [];
    const withoutOldSchema = schemaList.filter((a) => a.uid !== attestation.uid);
    this.bySchema.set(attestation.schemaUid, [...withoutOldSchema, attestation]);

    return ok(attestation);
  }

  async findByUid(uid: AttestationUid): Promise<Result<Attestation>> {
    const record = this.byUid.get(uid);
    if (record === undefined) {
      return err(new NotFoundError({ message: `Attestation not found: ${uid}` }));
    }
    return ok(record);
  }

  async findByContentHash(hash: ContentHash): Promise<Result<readonly Attestation[]>> {
    const records = this.byHash.get(hash) ?? [];
    return ok(records);
  }

  async findBySchemaUid(schemaUid: string): Promise<Result<readonly Attestation[]>> {
    const records = this.bySchema.get(schemaUid) ?? [];
    return ok(records);
  }

  async list(): Promise<Result<readonly Attestation[]>> {
    return ok([...this.byUid.values()]);
  }

  /** Clear all records (useful between tests). */
  clear(): void {
    this.byUid.clear();
    this.byHash.clear();
    this.bySchema.clear();
  }
}
