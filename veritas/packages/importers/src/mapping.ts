// mapping.ts: transform RawItems into MappedClaim domain objects.

import { type Result, ok, err } from "@veritas/core";
import type { RawItem } from "./importer.js";
import type { MappedClaim } from "./types.js";
import { MappingError } from "./errors.js";

/** Optional per-field overrides when mapping a RawItem. */
export interface MappingOptions {
  /** Fallback publisher when the item has none. */
  readonly defaultPublisher?: string;
  /** Fallback text when excerpt is absent; maps to the title. */
  readonly useTitleAsText?: boolean;
}

/** Derive claim text from the raw item respecting mapping options. */
function resolveText(item: RawItem, opts: MappingOptions): string | null {
  if (item.excerpt && item.excerpt.trim().length > 0) return item.excerpt.trim();
  if (opts.useTitleAsText && item.title && item.title.trim().length > 0) {
    return item.title.trim();
  }
  return null;
}

/** Map a single RawItem to a MappedClaim, returning Err if required fields are absent. */
export function mapRawItem(item: RawItem, opts: MappingOptions = {}): Result<MappedClaim> {
  const text = resolveText(item, opts);
  if (!text) {
    return err(new MappingError("excerpt", "No usable text: excerpt and title are both absent or empty"));
  }

  const sourceUrl = item.url.trim();
  if (!sourceUrl) {
    return err(new MappingError("url", "RawItem url is empty"));
  }

  const claim: MappedClaim = {
    text,
    sourceUrl,
    publisher: item.publisher ?? opts.defaultPublisher ?? null,
    publishedAt: item.publishedAt ?? null,
    rawItem: item,
  };

  return ok(claim);
}

/** Map an array of RawItems, silently collecting errors into the returned tuple. */
export function mapRawItems(
  items: readonly RawItem[],
  opts: MappingOptions = {},
): { claims: readonly MappedClaim[]; errors: readonly string[] } {
  const claims: MappedClaim[] = [];
  const errors: string[] = [];

  for (const item of items) {
    const result = mapRawItem(item, opts);
    if (result.ok) {
      claims.push(result.value);
    } else {
      errors.push(result.error instanceof Error ? result.error.message : String(result.error));
    }
  }

  return { claims, errors };
}
