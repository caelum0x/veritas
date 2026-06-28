// Importer port: common interface every feed/source importer must implement.

import type { Result } from "@veritas/core";

/** A raw item yielded by any importer before domain mapping. */
export interface RawItem {
  readonly url: string;
  readonly title?: string | null;
  readonly publisher?: string | null;
  readonly publishedAt?: string | null;
  readonly excerpt?: string | null;
  readonly extra?: Readonly<Record<string, unknown>>;
}

/** Summary returned after a full import run. */
export interface ImportRunResult {
  readonly fetched: number;
  readonly imported: number;
  readonly skipped: number;
  readonly errors: readonly string[];
}

/** Config common to all importers. */
export interface ImporterConfig {
  /** Logical name used in logs and registry. */
  readonly name: string;
  /** Max items to process per run (0 = unlimited). */
  readonly maxItems?: number;
}

/** Core port every concrete importer satisfies. */
export interface Importer {
  /** Human-readable name for this importer. */
  readonly name: string;
  /** Fetch raw items from the upstream source. */
  fetch(source: string): Promise<Result<readonly RawItem[]>>;
  /** Full run: fetch + store via provided sink. */
  run(source: string, sink: ImportSink): Promise<Result<ImportRunResult>>;
}

/** Callback that persists a single raw item; returns true if newly created. */
export type ImportSink = (item: RawItem) => Promise<Result<boolean>>;
