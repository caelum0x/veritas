// Corpus snapshot: immutable versioned point-in-time capture of a corpus state.

import { z } from "zod";
import {
  type Result, ok, err, newId, asIsoTimestamp, contentHash, ValidationError,
  type IsoTimestamp, type ContentHash,
  isoTimestampSchema, contentHashSchema,
} from "@veritas/core";
import type { Corpus } from "./corpus.js";
import type { CorpusRecord } from "./record.js";

export const CorpusSnapshotSchema = z.object({
  id: z.string().min(1),
  corpusId: z.string().min(1),
  version: z.number().int().positive(),
  label: z.string().nullable(),
  recordCount: z.number().int().nonnegative(),
  contentHash: contentHashSchema,
  createdAt: isoTimestampSchema,
  createdBy: z.string().nullable(),
});

export type CorpusSnapshot = z.infer<typeof CorpusSnapshotSchema>;

/** Derive a stable content hash from a sorted set of record ids. */
function hashRecords(records: readonly CorpusRecord[]): ContentHash {
  const sorted = [...records].sort((a, b) => a.id.localeCompare(b.id));
  const payload = sorted.map(r => `${r.id}:${r.updatedAt}`).join("\n");
  return contentHash(Buffer.from(payload));
}

/** Build a new snapshot for the given corpus and its current records. */
export function buildSnapshot(
  corpus: Corpus,
  records: readonly CorpusRecord[],
  opts: { version: number; label?: string | null; createdBy?: string | null },
): Result<CorpusSnapshot> {
  if (opts.version < 1) {
    return err(new ValidationError({ message: "Snapshot version must be >= 1" }));
  }
  const now = asIsoTimestamp(new Date().toISOString());
  const snapshot: CorpusSnapshot = {
    id: newId("snap"),
    corpusId: corpus.id,
    version: opts.version,
    label: opts.label ?? null,
    recordCount: records.length,
    contentHash: hashRecords(records),
    createdAt: now,
    createdBy: opts.createdBy ?? null,
  };
  return ok(snapshot);
}
