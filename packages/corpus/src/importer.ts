// Corpus importer: bulk-import Source objects into a corpus, producing CorpusRecords.

import { type Result, ok, err, newId, asIsoTimestamp, asScore, clampScore, ValidationError, isOk } from "@veritas/core";
import { SourceSchema, type Source } from "@veritas/contracts";

import type { CorpusRecord } from "./record.js";

export interface CorpusImportEntry {
  readonly source: unknown;
  readonly authorityWeight?: number;
  readonly qualityScore?: number;
  readonly tags?: string[];
  readonly notes?: string | null;
  readonly curatedBy?: string | null;
}

export interface CorpusImportResult {
  readonly records: readonly CorpusRecord[];
  readonly skipped: readonly { index: number; reason: string }[];
}

/** Validate and parse a raw source value against the Source schema. */
function parseSource(raw: unknown): Result<Source> {
  const parsed = SourceSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    return err(new ValidationError({ message: `Invalid source: ${msg}` }));
  }
  return ok(parsed.data);
}

/**
 * Import an array of raw entries into a corpus, returning validated CorpusRecords.
 * Invalid entries are skipped with an explanatory reason rather than halting the import.
 */
export function importIntoCorpus(
  corpusId: string,
  entries: readonly CorpusImportEntry[],
): CorpusImportResult {
  const now = asIsoTimestamp(new Date().toISOString());
  const records: CorpusRecord[] = [];
  const skipped: { index: number; reason: string }[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const sourceResult = parseSource(entry.source);
    if (!isOk(sourceResult)) {
      const reason = sourceResult.error instanceof Error ? sourceResult.error.message : String(sourceResult.error);
      skipped.push({ index: i, reason });
      continue;
    }
    const source = sourceResult.value;
    const record: CorpusRecord = {
      id: newId("crec"),
      corpusId,
      source,
      authorityWeight: asScore(clampScore(entry.authorityWeight ?? 0.5)),
      qualityScore: asScore(clampScore(entry.qualityScore ?? 0.5)),
      contentHash: source.contentHash ?? null,
      tags: entry.tags ?? [],
      notes: entry.notes ?? null,
      curatedAt: now,
      curatedBy: entry.curatedBy ?? null,
      createdAt: now,
      updatedAt: now,
    };
    records.push(record);
  }

  return { records, skipped };
}

/** Convenience wrapper that accepts pre-validated Source objects directly. */
export function importSourcesIntoCorpus(
  corpusId: string,
  sources: readonly Source[],
  defaults: { authorityWeight?: number; qualityScore?: number; curatedBy?: string | null } = {},
): CorpusImportResult {
  const entries: CorpusImportEntry[] = sources.map(s => ({
    source: s,
    authorityWeight: defaults.authorityWeight,
    qualityScore: defaults.qualityScore,
    curatedBy: defaults.curatedBy ?? null,
  }));
  return importIntoCorpus(corpusId, entries);
}
