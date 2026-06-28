// Corpus builder: fluent API for assembling a Corpus and its initial CorpusRecords.

import {
  type Result, ok, err, newId, asIsoTimestamp, asScore, clampScore, ValidationError,
} from "@veritas/core";
import type { Source } from "@veritas/contracts";
import { type Corpus, type CreateCorpus } from "./corpus.js";
import { type CorpusRecord } from "./record.js";

interface BuiltCorpus {
  readonly corpus: Corpus;
  readonly records: readonly CorpusRecord[];
}

/** Accumulate sources and build a Corpus + initial CorpusRecord set. */
export class CorpusBuilder {
  private readonly _name: string;
  private readonly _opts: Omit<CreateCorpus, "name">;
  private readonly _entries: Array<{ source: Source; authorityWeight?: number; qualityScore?: number; tags?: string[]; notes?: string | null }>;

  constructor(name: string, opts: Omit<CreateCorpus, "name"> = {}) {
    if (!name.trim()) throw new Error("Corpus name must be non-empty");
    this._name = name;
    this._opts = opts;
    this._entries = [];
  }

  /** Add a source with optional scoring hints. */
  add(
    source: Source,
    meta: { authorityWeight?: number; qualityScore?: number; tags?: string[]; notes?: string | null } = {},
  ): this {
    return new CorpusBuilder(this._name, this._opts).withEntries([...this._entries, { source, ...meta }]) as this;
  }

  private withEntries(entries: typeof this._entries): CorpusBuilder {
    const b = new CorpusBuilder(this._name, this._opts);
    (b as unknown as { _entries: typeof entries })._entries.push(...entries);
    return b;
  }

  /** Materialise into an immutable Corpus + records pair. */
  build(): Result<BuiltCorpus> {
    const now = asIsoTimestamp(new Date().toISOString());
    const corpusId = newId("corpus");

    const corpus: Corpus = {
      id: corpusId,
      name: this._name,
      description: this._opts.description ?? null,
      domain: this._opts.domain ?? null,
      ownerOrgId: this._opts.ownerOrgId ?? null,
      minAuthorityWeight: asScore(this._opts.minAuthorityWeight ?? 0),
      minQualityScore: asScore(this._opts.minQualityScore ?? 0),
      recordCount: this._entries.length,
      isPublic: this._opts.isPublic ?? false,
      tags: this._opts.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };

    const records: CorpusRecord[] = this._entries.map(entry => ({
      id: newId("crec"),
      corpusId,
      source: entry.source,
      authorityWeight: asScore(clampScore(entry.authorityWeight ?? 0.5)),
      qualityScore: asScore(clampScore(entry.qualityScore ?? 0.5)),
      contentHash: entry.source.contentHash ?? null,
      tags: entry.tags ?? [],
      notes: entry.notes ?? null,
      curatedAt: now,
      curatedBy: null,
      createdAt: now,
      updatedAt: now,
    }));

    return ok({ corpus, records });
  }
}

/** Convenience factory for a CorpusBuilder. */
export function createCorpusBuilder(name: string, opts?: Omit<CreateCorpus, "name">): CorpusBuilder {
  return new CorpusBuilder(name, opts);
}
