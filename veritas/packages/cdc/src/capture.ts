// capture.ts: capture changes from a source and publish to a ChangeStream
import { Result, ok, err, contentHash } from "@veritas/core";
import { CdcEvent, CdcOperation, makeCdcEvent } from "./change-event.js";
import { ChangeStream } from "./stream.js";

/** Descriptor of a raw row change coming from a database or external system */
export interface RawChange {
  readonly table: string;
  readonly schema?: string;
  readonly operation: CdcOperation;
  readonly before?: Record<string, unknown> | null;
  readonly after?: Record<string, unknown> | null;
  readonly pk: Record<string, string | number>;
  readonly txId?: string;
  readonly lsn?: string;
  readonly source: string;
}

/** Options for the change capture pipeline */
export interface CaptureOptions {
  /** Tables to capture; empty/undefined means all */
  readonly includeTables?: readonly string[];
  /** Tables to exclude even if includeTables is empty */
  readonly excludeTables?: readonly string[];
  /** Whether to compute content hash for each event */
  readonly computeHash?: boolean;
}

/** Result of a single capture cycle */
export interface CaptureResult {
  readonly captured: number;
  readonly skipped: number;
  readonly errors: readonly string[];
}

/** Capture pipeline: validates raw changes and publishes CdcEvents to a stream */
export class ChangeCapturer {
  private readonly stream: ChangeStream;
  private readonly opts: CaptureOptions;
  private readonly include: Set<string> | null;
  private readonly exclude: Set<string>;

  constructor(stream: ChangeStream, opts: CaptureOptions = {}) {
    this.stream = stream;
    this.opts = opts;
    this.include =
      opts.includeTables && opts.includeTables.length > 0
        ? new Set(opts.includeTables)
        : null;
    this.exclude = new Set(opts.excludeTables ?? []);
  }

  /** Determine whether a table should be captured */
  private shouldCapture(table: string): boolean {
    if (this.exclude.has(table)) return false;
    if (this.include !== null && !this.include.has(table)) return false;
    return true;
  }

  /** Convert a raw change into a CdcEvent */
  private toEvent(raw: RawChange): CdcEvent {
    const hash = this.opts.computeHash
      ? contentHash(JSON.stringify({ before: raw.before ?? null, after: raw.after ?? null }))
      : undefined;

    return makeCdcEvent(
      raw.table,
      raw.schema ?? "public",
      raw.operation,
      raw.before ?? null,
      raw.after ?? null,
      raw.pk,
      raw.source,
      { txId: raw.txId, lsn: raw.lsn, contentHash: hash }
    );
  }

  /** Process a batch of raw changes; publishes each and returns a summary */
  async capture(changes: readonly RawChange[]): Promise<Result<CaptureResult>> {
    let captured = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const raw of changes) {
      if (!this.shouldCapture(raw.table)) {
        skipped++;
        continue;
      }

      let event: CdcEvent;
      try {
        event = this.toEvent(raw);
      } catch (e) {
        errors.push(`toEvent failed for ${raw.table}: ${String(e)}`);
        continue;
      }

      const result = await this.stream.publish(event);
      if (result.ok) {
        captured++;
      } else {
        errors.push(`publish failed for ${raw.table}[${raw.operation}]: ${String(result.error)}`);
      }
    }

    return ok({ captured, skipped, errors });
  }
}
