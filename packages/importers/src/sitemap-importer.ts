// Sitemap importer: crawls XML sitemaps (including sitemap index) and yields URL RawItems.

import { type Result, ok, err, ValidationError, tryAsync } from "@veritas/core";
import type { Importer, ImporterConfig, ImportRunResult, ImportSink, RawItem } from "./importer.js";

export interface SitemapImporterConfig extends ImporterConfig {
  /** Optional publisher to stamp on every item. */
  readonly publisher?: string;
  /** Max depth for sitemap index recursion (default: 2). */
  readonly maxDepth?: number;
}

function extractTagAll(xml: string, tag: string): readonly string[] {
  const results: string[] = [];
  const open = `<${tag}`;
  const close = `</${tag}>`;
  let idx = 0;
  while (true) {
    const s = xml.indexOf(open, idx);
    if (s === -1) break;
    const cs = xml.indexOf(">", s);
    if (cs === -1) break;
    const e = xml.indexOf(close, cs);
    if (e === -1) break;
    results.push(xml.slice(cs + 1, e).replace(/<!\[CDATA\[|\]\]>/g, "").trim());
    idx = e + close.length;
  }
  return results;
}

function extractBlocks(xml: string, tag: string): readonly string[] {
  const blocks: string[] = [];
  const open = `<${tag}`;
  const close = `</${tag}>`;
  let idx = 0;
  while (true) {
    const s = xml.indexOf(open, idx);
    if (s === -1) break;
    const e = xml.indexOf(close, s);
    if (e === -1) break;
    blocks.push(xml.slice(s, e + close.length));
    idx = e + close.length;
  }
  return blocks;
}

async function fetchXml(url: string): Promise<Result<string>> {
  return tryAsync(() =>
    globalThis.fetch(url).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
  ).then((r) =>
    r.ok ? r : err(new ValidationError({ message: `Sitemap fetch failed for ${url}: ${String(r.error)}` }))
  );
}

async function crawl(
  url: string,
  publisher: string | null,
  maxDepth: number,
  depth: number,
  maxItems: number,
  collected: RawItem[]
): Promise<void> {
  if (depth > maxDepth) return;
  const xmlResult = await fetchXml(url);
  if (!xmlResult.ok) return;
  const xml = xmlResult.value;

  // Sitemap index: recurse into child sitemaps
  const sitemapBlocks = extractBlocks(xml, "sitemap");
  if (sitemapBlocks.length > 0) {
    for (const block of sitemapBlocks) {
      const locs = extractTagAll(block, "loc");
      for (const loc of locs) {
        if (maxItems > 0 && collected.length >= maxItems) return;
        await crawl(loc, publisher, maxDepth, depth + 1, maxItems, collected);
      }
    }
    return;
  }

  // URL set: collect <url> entries
  const urlBlocks = extractBlocks(xml, "url");
  for (const block of urlBlocks) {
    if (maxItems > 0 && collected.length >= maxItems) return;
    const locs = extractTagAll(block, "loc");
    const loc = locs[0];
    if (!loc) continue;
    const lastmod = extractTagAll(block, "lastmod")[0] ?? null;
    collected.push({ url: loc, publisher, publishedAt: lastmod ?? null });
  }
}

export function createSitemapImporter(config: SitemapImporterConfig): Importer {
  const maxItems = config.maxItems ?? 0;
  const maxDepth = config.maxDepth ?? 2;
  const publisher = config.publisher ?? null;

  async function fetch(source: string): Promise<Result<readonly RawItem[]>> {
    const collected: RawItem[] = [];
    await crawl(source, publisher, maxDepth, 0, maxItems, collected);
    return ok(collected);
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
