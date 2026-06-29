// Consent record: create, revoke, and query GDPR consent records with full audit trail.

import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";
import { type IsoTimestamp, epochToIso } from "@veritas/core";
import { type Id, newId } from "@veritas/core";
import { MemoryStore } from "@veritas/persistence";

export type ConsentId = Id<"consent">;
export const newConsentId = (): ConsentId => newId("consent");

export const ConsentPurposeSchema = z.enum([
  "analytics",
  "marketing",
  "functional",
  "research",
  "third_party_sharing",
  "profiling",
]);
export type ConsentPurpose = z.infer<typeof ConsentPurposeSchema>;

export const ConsentStatusSchema = z.enum(["granted", "revoked", "expired"]);
export type ConsentStatus = z.infer<typeof ConsentStatusSchema>;

export const ConsentRecordSchema = z.object({
  id: z.string(),
  subjectId: z.string(),
  purpose: ConsentPurposeSchema,
  status: ConsentStatusSchema,
  legalBasis: z.string(),
  grantedAt: z.string(),
  revokedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  version: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;

export interface GrantConsentInput {
  readonly subjectId: string;
  readonly purpose: ConsentPurpose;
  readonly legalBasis: string;
  readonly expiresAt?: IsoTimestamp;
  readonly version?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ConsentRecordStore {
  grant(input: GrantConsentInput): Result<ConsentRecord>;
  revoke(subjectId: string, purpose: ConsentPurpose): Result<ConsentRecord>;
  findBySubject(subjectId: string): ConsentRecord[];
  findActive(subjectId: string, purpose: ConsentPurpose): ConsentRecord | undefined;
  hasConsent(subjectId: string, purpose: ConsentPurpose): boolean;
}

export class InMemoryConsentStore implements ConsentRecordStore {
  private readonly store = new MemoryStore<ConsentRecord & { readonly id: string }>();

  grant(input: GrantConsentInput): Result<ConsentRecord> {
    const now = epochToIso(Date.now());
    const existing = this.findActive(input.subjectId, input.purpose);
    if (existing !== undefined) {
      // Revoke prior consent before granting new
      this.revoke(input.subjectId, input.purpose);
    }
    const record: ConsentRecord = {
      id: newConsentId(),
      subjectId: input.subjectId,
      purpose: input.purpose,
      status: "granted",
      legalBasis: input.legalBasis,
      grantedAt: now,
      revokedAt: null,
      expiresAt: input.expiresAt ?? null,
      version: input.version ?? "1.0",
      metadata: input.metadata ?? {},
    };
    this.store.set(record);
    return ok(record);
  }

  revoke(subjectId: string, purpose: ConsentPurpose): Result<ConsentRecord> {
    const active = this.findActive(subjectId, purpose);
    if (active === undefined) {
      return err(new Error(`No active consent found for subject ${subjectId} and purpose ${purpose}`));
    }
    const now = epochToIso(Date.now());
    const updated: ConsentRecord = { ...active, status: "revoked", revokedAt: now };
    this.store.set(updated);
    return ok(updated);
  }

  findBySubject(subjectId: string): ConsentRecord[] {
    return this.store.all().filter((r) => r.subjectId === subjectId);
  }

  findActive(subjectId: string, purpose: ConsentPurpose): ConsentRecord | undefined {
    const now = Date.now();
    return this.store.all().find(
      (r) =>
        r.subjectId === subjectId &&
        r.purpose === purpose &&
        r.status === "granted" &&
        (r.expiresAt === null || new Date(r.expiresAt).getTime() > now),
    );
  }

  hasConsent(subjectId: string, purpose: ConsentPurpose): boolean {
    return this.findActive(subjectId, purpose) !== undefined;
  }
}
