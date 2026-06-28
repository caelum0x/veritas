// CSV claims importer: parses delimited text into RawItems using built-in Node APIs only.

import { type Result, ok, err, ValidationError, tryAsync } from "@veritas/core";
import type { Importer, ImporterConfig, ImportRunResult, ImportSink, RawItem } from "./importer.js";

export interface CsvImporterConfig extends ImporterConfig {
  /** Column delimiter (default: ",""). */
  readonly delimiter?: string;
  /** Column name that holds the URL (default: "url"). */
  readonly urlColumn?: string;
  /** Column name for title (default: "title"). */
  readonly titleColumn?: string;
  /** Column name for publisher (default: "publisher"). */
  readonly publisherColumn?: string;
  /** Column name for publishedAt (default: "publishedAt"). */
  readonly publishedAtColumn?: string;
  /** Column name for excerpt (default: "excerpt"). */
  readonly excerptColumn?: string;
}

function parseCsv(text: string, delimiter: string): readonly Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(delimiter).map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]!] = values[i] ?? "";
    }
    return row;
  });
}

export function createCsvImporter(config: CsvImporterConfig): Importer {
  const delimiter = config.delimiter ?? ",";
  const urlCol = config.urlColumn ?? "url";
  const titleCol = config.titleColumn ?? "title";
  const publisherCol = config.publisherColumn ?? "publisher";
  const publishedAtCol = config.publishedAtColumn ?? "publishedAt";
  const excerptCol = config.excerptColumn ?? "excerpt";
  const maxItems = config.maxItems ?? 0;

  async function fetch(source: string): Promise<Result<readonly RawItem[]>> {
    const fetched = await tryAsync(() =>
      globalThis.fetch(source).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
    );
    if (!fetched.ok) return err(new ValidationError({ message: `CSV fetch failed: ${String(fetched.error)}` }));

    const rows = parseCsv(fetched.value, delimiter);
    const items: RawItem[] = [];
    for (const row of rows) {
      const url = row[urlCol]?.trim();
      if (!url) continue;
      items.push({
        url,
        title: row[titleCol] ?? null,
        publisher: row[publisherCol] ?? null,
        publishedAt: row[publishedAtCol] ?? null,
        excerpt: row[excerptCol] ?? null,
      });
      if (maxItems > 0 && items.length >= maxItems) break;
    }
    return ok(items);
  }

  async function run(source: string, sink: ImportSink): Promise<Result<ImportRunResult>> {
    const result = await fetch(source);
    if (!result.ok) return result as unknown as Result<ImportRunResult>;

    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    for (const item of result.value) {
      const sinkResult = await sink(item);
      if (!sinkResult.ok) {
        errors.push(String(sinkResult.error));
        skipped++;
      } else if (sinkResult.value) {
        imported++;
      } else {
        skipped++;
      }
    }

    return ok({ fetched: result.value.length, imported, skipped, errors });
  }

  return { name: config.name, fetch, run };
}
