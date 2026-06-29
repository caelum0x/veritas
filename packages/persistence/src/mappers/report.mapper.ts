// Maps Report domain objects to/from persistence rows with clone-on-write semantics.
import type { Report, CreateReport, Provenance } from "@veritas/contracts";
import { newId } from "@veritas/core";
import { epochToIso, asIsoTimestamp } from "@veritas/core";

/** Persistence row shape for a Report. */
export interface ReportRow {
  readonly id: string;
  readonly verificationId: string;
  readonly contentHash: string;
  readonly summary: string;
  readonly trustScore: number;
  readonly counts: {
    readonly supported: number;
    readonly refuted: number;
    readonly unverifiable: number;
  };
  readonly claims: ReadonlyArray<{
    readonly claim: string;
    readonly verdict: string;
    readonly confidence: number;
    readonly reasoning: string;
    readonly citationIds: readonly string[];
  }>;
  readonly provenance: {
    readonly contentHash: string;
    readonly verifier: string;
    readonly verifierVersion: string;
    readonly model: string;
    readonly effort: string;
    readonly createdAt: string;
    readonly claimCount: number;
    readonly sourceCount: number;
  };
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Convert a persistence row to a Report domain object. */
export function rowToReport(row: ReportRow): Report {
  return {
    id: row.id as Report["id"],
    verificationId: row.verificationId as Report["verificationId"],
    contentHash: row.contentHash as Report["contentHash"],
    summary: row.summary,
    trustScore: row.trustScore as Report["trustScore"],
    counts: { ...row.counts },
    claims: row.claims.map((c) => ({
      claim: c.claim,
      verdict: c.verdict as Report["claims"][number]["verdict"],
      confidence: c.confidence as Report["claims"][number]["confidence"],
      reasoning: c.reasoning,
      citationIds: [...c.citationIds] as Report["claims"][number]["citationIds"],
    })),
    provenance: {
      contentHash: row.provenance.contentHash as Provenance["contentHash"],
      verifier: row.provenance.verifier,
      verifierVersion: row.provenance.verifierVersion,
      model: row.provenance.model,
      effort: row.provenance.effort,
      createdAt: asIsoTimestamp(row.provenance.createdAt),
      claimCount: row.provenance.claimCount,
      sourceCount: row.provenance.sourceCount,
    },
    createdAt: row.createdAt as Report["createdAt"],
    updatedAt: row.updatedAt as Report["updatedAt"],
  };
}

/** Convert a CreateReport DTO + generated ID/timestamps into a persistence row. */
export function createDtoToRow(dto: CreateReport, now: string): ReportRow {
  const id = newId("rpt");
  return {
    id,
    verificationId: dto.verificationId,
    contentHash: dto.contentHash,
    summary: dto.summary,
    trustScore: dto.trustScore,
    counts: { ...dto.counts },
    claims: dto.claims.map((c) => ({
      claim: c.claim,
      verdict: c.verdict,
      confidence: c.confidence,
      reasoning: c.reasoning,
      citationIds: [...c.citationIds],
    })),
    provenance: {
      contentHash: dto.provenance.contentHash,
      verifier: dto.provenance.verifier,
      verifierVersion: dto.provenance.verifierVersion,
      model: dto.provenance.model,
      effort: dto.provenance.effort,
      createdAt: now,
      claimCount: dto.provenance.claimCount,
      sourceCount: dto.provenance.sourceCount,
    },
    createdAt: now,
    updatedAt: now,
  };
}

/** Merge an existing row with a partial update, returning a new row. */
export function mergeRow(existing: ReportRow, patch: Partial<CreateReport>, now: string): ReportRow {
  return {
    ...existing,
    ...(patch.summary !== undefined ? { summary: patch.summary } : {}),
    ...(patch.trustScore !== undefined ? { trustScore: patch.trustScore } : {}),
    ...(patch.counts !== undefined ? { counts: { ...patch.counts } } : {}),
    ...(patch.claims !== undefined
      ? {
          claims: patch.claims.map((c) => ({
            claim: c.claim,
            verdict: c.verdict,
            confidence: c.confidence,
            reasoning: c.reasoning,
            citationIds: [...c.citationIds],
          })),
        }
      : {}),
    ...(patch.provenance !== undefined
      ? {
          provenance: {
            contentHash: patch.provenance.contentHash,
            verifier: patch.provenance.verifier,
            verifierVersion: patch.provenance.verifierVersion,
            model: patch.provenance.model,
            effort: patch.provenance.effort,
            createdAt: now,
            claimCount: patch.provenance.claimCount,
            sourceCount: patch.provenance.sourceCount,
          },
        }
      : {}),
    updatedAt: now,
  };
}
