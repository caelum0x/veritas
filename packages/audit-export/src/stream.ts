// Async audit stream: pull-based iterator yielding batches of audit events with backpressure support.

import { type Logger, noopLogger } from "@veritas/core";
import { type AuditEvent, type ExportFilter, type ExportFormat } from "./types.js";
import { buildPredicate, applyFilter } from "./filter.js";
import { toJsonLines } from "./json-lines.js";
import { toCef } from "./cef.js";
import { toSyslog } from "./syslog.js";

export interface AuditStreamOptions {
  readonly batchSize: number;
  readonly filter?: ExportFilter;
  readonly logger?: Logger;
}

export interface AuditPage {
  readonly events: readonly AuditEvent[];
  readonly cursor: string | null;
  readonly hasMore: boolean;
}

export type AuditPageFetcher = (cursor: string | null, limit: number) => Promise<AuditPage>;

export async function* createAuditStream(
  fetcher: AuditPageFetcher,
  options: AuditStreamOptions,
): AsyncGenerator<AuditEvent[], void, unknown> {
  const { batchSize, filter, logger = noopLogger } = options;
  const predicate = filter ? buildPredicate(filter) : () => true;

  let cursor: string | null = null;
  let hasMore = true;
  let totalYielded = 0;

  while (hasMore) {
    const page = await fetcher(cursor, batchSize);
    const filtered = page.events.filter(predicate);

    if (filtered.length > 0) {
      totalYielded += filtered.length;
      logger.debug("audit-stream: yielding batch", {
        batchSize: filtered.length,
        totalYielded,
        cursor,
      });
      yield filtered;
    }

    cursor = page.cursor;
    hasMore = page.hasMore;
  }

  logger.debug("audit-stream: exhausted", { totalYielded });
}

export async function collectStream(
  fetcher: AuditPageFetcher,
  options: AuditStreamOptions,
): Promise<AuditEvent[]> {
  const collected: AuditEvent[] = [];
  for await (const batch of createAuditStream(fetcher, options)) {
    collected.push(...batch);
  }
  return collected;
}

export function inMemoryFetcher(events: readonly AuditEvent[]): AuditPageFetcher {
  return async (cursor: string | null, limit: number): Promise<AuditPage> => {
    const offset = cursor !== null ? parseInt(cursor, 10) : 0;
    const slice = events.slice(offset, offset + limit);
    const nextOffset = offset + slice.length;
    const hasMore = nextOffset < events.length;
    return {
      events: slice,
      cursor: hasMore ? String(nextOffset) : null,
      hasMore,
    };
  };
}

/** Serialise a batch of audit events to a string in the requested format, optionally filtered. */
export async function formatEvents(
  events: readonly AuditEvent[],
  format: ExportFormat,
  filter?: ExportFilter,
): Promise<string> {
  const filtered = filter ? applyFilter(events, filter) : [...events];
  switch (format) {
    case "JSON_LINES":
      return toJsonLines(filtered);
    case "CEF":
      return filtered.map((e) => toCef(e)).join("\n") + (filtered.length > 0 ? "\n" : "");
    case "SYSLOG":
      return filtered.map((e) => toSyslog(e)).join("\n") + (filtered.length > 0 ? "\n" : "");
    default:
      return assertNeverFormat(format);
  }
}

function assertNeverFormat(format: never): never {
  throw new Error(`Unsupported export format: ${String(format)}`);
}
