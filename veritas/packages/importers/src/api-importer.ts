// Generic API importer: polls a JSON REST endpoint and maps response items to RawItems.

import { type Result, ok, err, ValidationError, tryAsync } from "@veritas/core";
import type { Importer, ImporterConfig, ImportRunResult, ImportSink, RawItem } from "./importer.js";

/** Path within the JSON response body that contains the items array (dot notation). */
type JsonPath = string;

export interface ApiImporterConfig extends ImporterConfig {
  /** HTTP method (default: "GET"). */
  readonly method?: "GET" | "POST";
  /** Static request headers (e.g. Authorization). */
  readonly headers?: Readonly<Record<string, string>>;
  /** Dot-path into the JSON response to the items array (e.g. "data.items"). Empty = root array. */
  readonly itemsPath?: JsonPath;
  /** Map from RawItem field -> response item field name. */
  readonly fieldMap?: Readonly<{
    url?: string;
    title?: string;
    publisher?: string;
    publishedAt?: string;
    excerpt?: string;
  }>;
  /** Static publisher override. */
  readonly publisher?: string;
}

function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (typeof cur !== "object" || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : v == null ? null : String(v);
}

function mapItem(
  raw: unknown,
  fieldMap: NonNullable<ApiImporterConfig["fieldMap"]>,
  publisher: string | null
): RawItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const urlField = fieldMap.url ?? "url";
  const url = str(obj[urlField]);
  if (!url?.trim()) return null;
  return {
    url: url.trim(),
    title: str(obj[fieldMap.title ?? "title"]),
    publisher: str(obj[fieldMap.publisher ?? "publisher"]) ?? publisher,
    publishedAt: str(obj[fieldMap.publishedAt ?? "publishedAt"]),
    excerpt: str(obj[fieldMap.excerpt ?? "excerpt"]),
  };
}

export function createApiImporter(config: ApiImporterConfig): Importer {
  const method = config.method ?? "GET";
  const headers = config.headers ?? {};
  const itemsPath = config.itemsPath ?? "";
  const fieldMap = config.fieldMap ?? {};
  const publisher = config.publisher ?? null;
  const maxItems = config.maxItems ?? 0;

  async function fetch(source: string): Promise<Result<readonly RawItem[]>> {
    const fetched = await tryAsync(() =>
      globalThis.fetch(source, {
        method,
        headers: { "Accept": "application/json", ...headers },
      }).then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<unknown>;
      })
    );
    if (!fetched.ok) {
      return err(new ValidationError({ message: `API fetch failed: ${String(fetched.error)}` }));
    }

    const payload = getPath(fetched.value, itemsPath);
    if (!Array.isArray(payload)) {
      return err(new ValidationError({ message: `API response items not an array at path "${itemsPath}"` }));
    }

    const items: RawItem[] = [];
    for (const raw of payload) {
      const item = mapItem(raw, fieldMap, publisher);
      if (!item) continue;
      items.push(item);
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
