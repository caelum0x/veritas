// source-sync.ts: scheduled runner that iterates registered source entries and triggers importer runs.

import { type Result, ok, err } from "@veritas/core";
import type { ImportSink, ImportRunResult } from "./importer.js";
import type { ImporterRegistry } from "./registry.js";
import type { ImporterEntry } from "./types.js";

/** Aggregate result for a full sync cycle across all enabled sources. */
export interface SyncCycleResult {
  readonly ran: number;
  readonly failed: number;
  readonly totalFetched: number;
  readonly totalImported: number;
  readonly totalSkipped: number;
  readonly errors: readonly { entryId: string; sourceUrl: string; message: string }[];
}

/** Options controlling a sync run. */
export interface SourceSyncOptions {
  /** Only run entries whose IDs are in this set. Runs all if absent. */
  readonly onlyIds?: ReadonlySet<string>;
}

/** Run a single ImporterEntry through its registered importer. */
async function runEntry(
  registry: ImporterRegistry,
  entry: ImporterEntry,
  sink: ImportSink,
): Promise<Result<ImportRunResult>> {
  const resolvedResult = registry.resolve(entry.kind);
  if (!resolvedResult.ok) return resolvedResult;

  const importer = resolvedResult.value;
  return importer.run(entry.sourceUrl, sink);
}

/** Execute a full sync cycle: run all enabled entries through their importers. */
export async function runSyncCycle(
  registry: ImporterRegistry,
  sink: ImportSink,
  opts: SourceSyncOptions = {},
): Promise<SyncCycleResult> {
  const entries = registry.listSources(true); // enabled only
  const filtered = opts.onlyIds
    ? entries.filter((e) => opts.onlyIds!.has(e.id))
    : entries;

  let ran = 0;
  let failed = 0;
  let totalFetched = 0;
  let totalImported = 0;
  let totalSkipped = 0;
  const errors: { entryId: string; sourceUrl: string; message: string }[] = [];

  for (const entry of filtered) {
    const result = await runEntry(registry, entry, sink);
    if (result.ok) {
      ran++;
      totalFetched += result.value.fetched;
      totalImported += result.value.imported;
      totalSkipped += result.value.skipped;
    } else {
      failed++;
      const message = result.error instanceof Error ? result.error.message : String(result.error);
      errors.push({ entryId: entry.id, sourceUrl: entry.sourceUrl, message });
    }
  }

  return { ran, failed, totalFetched, totalImported, totalSkipped, errors };
}

/** Create a simple interval-based sync scheduler (returns a stop function). */
export function startSyncScheduler(
  registry: ImporterRegistry,
  sink: ImportSink,
  intervalMs: number,
  onResult?: (result: SyncCycleResult) => void,
): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = async (): Promise<void> => {
    const result = await runSyncCycle(registry, sink);
    onResult?.(result);
  };

  timer = setInterval(() => { void tick(); }, intervalMs);

  return () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}
