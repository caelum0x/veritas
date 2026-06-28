// JSON importer: fetches a JSON array from a URL and yields RawItems.

import { type Result, ok, err, isOk } from "@veritas/core";
import type { Importer, ImporterConfig, ImportRunResult, ImportSink, RawItem } from "./importer.js";
import { FetchError, ParseError } from "./errors.js";

function toRawItem(raw: unknown, index: number): Result<RawItem> {
  if (typeof raw !== "object" || raw === null) {
    return err(new ParseError("json", `Item[${index}] is not an object`));
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj["url"] !== "string" || obj["url"].trim() === "") {
    return err(new ParseError("json", `Item[${index}] missing required field: url`));
  }
  const item: RawItem = {
    url: obj["url"].trim(),
    title: typeof obj["title"] === "string" ? obj["title"] : null,
    publisher: typeof obj["publisher"] === "string" ? obj["publisher"] : null,
    publishedAt: typeof obj["publishedAt"] === "string" ? obj["publishedAt"] : null,
    excerpt: typeof obj["excerpt"] === "string" ? obj["excerpt"] : null,
    extra: typeof obj["extra"] === "object" && obj["extra"] !== null
      ? (obj["extra"] as Record<string, unknown>)
      : undefined,
  };
  return ok(item);
}

async function fetchJson(url: string): Promise<Result<unknown>> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch (e) {
    return err(new FetchError(url, e));
  }
  if (!res.ok) {
    return err(new FetchError(url));
  }
  let body: unknown;
  try {
    body = await res.json() as unknown;
  } catch (e) {
    return err(new ParseError("json", `Invalid JSON from ${url}`, e));
  }
  return ok(body);
}

export function createJsonImporter(config: ImporterConfig): Importer {
  const { name, maxItems = 0 } = config;

  async function fetch(source: string): Promise<Result<readonly RawItem[]>> {
    const fetched = await fetchJson(source);
    if (!fetched.ok) return fetched;

    const body = fetched.value;
    const arr = Array.isArray(body) ? body : (typeof body === "object" && body !== null && Array.isArray((body as Record<string, unknown>)["items"]) ? (body as Record<string, unknown>)["items"] as unknown[] : null);
    if (arr === null) {
      return err(new ParseError("json", "JSON root must be an array or { items: [] }"));
    }

    const items: RawItem[] = [];
    const limit = maxItems > 0 ? maxItems : arr.length;
    for (let i = 0; i < Math.min(arr.length, limit); i++) {
      const parsed = toRawItem(arr[i], i);
      if (isOk(parsed)) items.push(parsed.value);
    }
    return ok(items);
  }

  async function run(source: string, sink: ImportSink): Promise<Result<ImportRunResult>> {
    const fetched = await fetch(source);
    if (!fetched.ok) return fetched;

    const items = fetched.value;
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of items) {
      const saved = await sink(item);
      if (!saved.ok) {
        errors.push(saved.error instanceof Error ? saved.error.message : String(saved.error));
        skipped++;
      } else if (saved.value) {
        imported++;
      } else {
        skipped++;
      }
    }

    return ok({ fetched: items.length, imported, skipped, errors });
  }

  return { name, fetch, run };
}
