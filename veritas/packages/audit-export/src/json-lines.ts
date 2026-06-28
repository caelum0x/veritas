// JSONL export — serialises a stream of AuditEvents to newline-delimited JSON (JSON Lines).
import type { AuditEvent, ExportFilter } from "./types.js";
import { applyFilter } from "./filter.js";

/** Options for JSONL serialisation. */
export interface JsonLinesOptions {
  /** If true, each line is pretty-printed (useful for debugging; not valid JSONL). */
  readonly pretty?: boolean;
  /** Fields to omit from each serialised event (e.g. to redact sensitive data). */
  readonly omitFields?: ReadonlyArray<keyof AuditEvent>;
  /** Optional filter applied before serialisation. */
  readonly filter?: ExportFilter;
}

/** Omit selected fields from an event and return a plain object safe for JSON serialisation. */
function prepareEvent(
  event: AuditEvent,
  omitFields: ReadonlyArray<keyof AuditEvent>,
): Record<string, unknown> {
  const record: Record<string, unknown> = { ...event };
  for (const field of omitFields) {
    delete record[field as string];
  }
  return record;
}

/**
 * Serialise an array of AuditEvents to a JSONL string.
 * Each event becomes one line; the result ends with a trailing newline.
 */
export function toJsonLines(events: readonly AuditEvent[], options: JsonLinesOptions = {}): string {
  const { pretty = false, omitFields = [], filter } = options;
  const filtered = filter ? applyFilter(events, filter) : events;

  const lines = filtered.map((event) => {
    const record = prepareEvent(event, omitFields);
    return pretty ? JSON.stringify(record, null, 2) : JSON.stringify(record);
  });

  return lines.join("\n") + (lines.length > 0 ? "\n" : "");
}

/** Parse a JSONL string back to an array of unknown objects (for ingestion / testing). */
export function fromJsonLines(raw: string): unknown[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as unknown);
}

/** Stream a large event array to a WritableStream in JSONL format without building a full string. */
export async function writeJsonLinesStream(
  events: readonly AuditEvent[],
  writable: WritableStream<string>,
  options: JsonLinesOptions = {},
): Promise<number> {
  const { omitFields = [], filter } = options;
  const filtered = filter ? applyFilter(events, filter) : events;
  const writer = writable.getWriter();
  let written = 0;
  try {
    for (const event of filtered) {
      const record = prepareEvent(event, omitFields);
      await writer.write(JSON.stringify(record) + "\n");
      written++;
    }
  } finally {
    writer.releaseLock();
  }
  return written;
}
