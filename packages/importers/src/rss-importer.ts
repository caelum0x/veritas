// RSS/news feed importer: fetches Atom/RSS XML and extracts items into RawItems.

import { type Result, ok, err, ValidationError, tryAsync } from "@veritas/core";
import type { Importer, ImporterConfig, ImportRunResult, ImportSink, RawItem } from "./importer.js";

export interface RssImporterConfig extends ImporterConfig {
  /** Optional publisher override; inferred from feed title if absent. */
  readonly publisher?: string;
}

/** Minimal XML text extractor for a named tag. */
function extractTag(xml: string, tag: string): string | null {
  const open = `<${tag}`;
  const close = `</${tag}>`;
  const start = xml.indexOf(open);
  if (start === -1) return null;
  const contentStart = xml.indexOf(">", start);
  if (contentStart === -1) return null;
  const end = xml.indexOf(close, contentStart);
  if (end === -1) return null;
  return xml.slice(contentStart + 1, end).replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "i");
  const m = re.exec(xml);
  return m?.[1] ?? null;
}

function splitItems(xml: string): readonly string[] {
  const items: string[] = [];
  // Support <item> (RSS) and <entry> (Atom)
  for (const tag of ["item", "entry"] as const) {
    const open = `<${tag}`;
    const close = `</${tag}>`;
    let idx = 0;
    while (true) {
      const s = xml.indexOf(open, idx);
      if (s === -1) break;
      const e = xml.indexOf(close, s);
      if (e === -1) break;
      items.push(xml.slice(s, e + close.length));
      idx = e + close.length;
    }
    if (items.length > 0) break;
  }
  return items;
}

function parseItem(xml: string, fallbackPublisher: string | null): RawItem | null {
  // URL: <link> for RSS, <link href="..."> for Atom
  const url =
    extractAttr(xml, "link", "href") ??
    extractTag(xml, "link");
  if (!url?.trim()) return null;

  const title = extractTag(xml, "title");
  const pubDate =
    extractTag(xml, "pubDate") ??
    extractTag(xml, "published") ??
    extractTag(xml, "updated");
  const excerpt =
    extractTag(xml, "description") ??
    extractTag(xml, "summary") ??
    extractTag(xml, "content");

  return {
    url: url.trim(),
    title: title ?? null,
    publisher: fallbackPublisher,
    publishedAt: pubDate ?? null,
    excerpt: excerpt ? excerpt.slice(0, 500) : null,
  };
}

export function createRssImporter(config: RssImporterConfig): Importer {
  const maxItems = config.maxItems ?? 0;

  async function fetch(source: string): Promise<Result<readonly RawItem[]>> {
    const fetched = await tryAsync(() =>
      globalThis.fetch(source).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
    );
    if (!fetched.ok) return err(new ValidationError({ message: `RSS fetch failed: ${String(fetched.error)}` }));

    const xml = fetched.value;
    const feedTitle = extractTag(xml, "title");
    const publisher = config.publisher ?? feedTitle ?? null;

    const rawItems = splitItems(xml);
    const items: RawItem[] = [];
    for (const raw of rawItems) {
      const item = parseItem(raw, publisher);
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
