// stream.ts: change stream port interface and in-memory implementation
import { Result, ok, err, IsoTimestamp } from "@veritas/core";
import { CdcEvent } from "./change-event.js";
import { CdcCursor, makeCursor } from "./cursor.js";

/** Options for subscribing to a change stream */
export interface StreamSubscribeOptions {
  /** Tables to include; empty array means all tables */
  readonly tables?: readonly string[];
  /** Start from this cursor (exclusive); null means from now */
  readonly from?: CdcCursor | null;
  /** Maximum number of events to buffer before back-pressure */
  readonly bufferSize?: number;
}

/** A single batch of change events polled from a stream */
export interface StreamBatch {
  readonly events: readonly CdcEvent[];
  readonly cursor: CdcCursor;
  readonly pulledAt: IsoTimestamp;
}

/** Port interface for a change data stream (database WAL, Kafka, etc.) */
export interface ChangeStream {
  /** Unique identifier for this stream */
  readonly streamId: string;
  /** Publish an event onto the stream (used by capture layer) */
  publish(event: CdcEvent): Promise<Result<void>>;
  /** Poll for the next batch of events from a given cursor */
  poll(opts: StreamSubscribeOptions): Promise<Result<StreamBatch>>;
  /** Acknowledge processed cursor, allowing the stream to advance */
  ack(cursor: CdcCursor): Promise<Result<void>>;
}

/** In-memory change stream for testing and local development */
export class InMemoryChangeStream implements ChangeStream {
  readonly streamId: string;
  private readonly buffer: CdcEvent[] = [];
  private offset = 0;

  constructor(streamId: string) {
    this.streamId = streamId;
  }

  async publish(event: CdcEvent): Promise<Result<void>> {
    this.buffer.push(event);
    return ok(undefined);
  }

  async poll(opts: StreamSubscribeOptions): Promise<Result<StreamBatch>> {
    const start = opts.from ? parseInt(opts.from.lsn, 10) + 1 : this.offset;
    const limit = opts.bufferSize ?? 100;
    const tables = opts.tables && opts.tables.length > 0 ? new Set(opts.tables) : null;

    const slice = this.buffer
      .slice(start, start + limit)
      .filter((e) => tables === null || tables.has(e.table));

    const endIndex = start + slice.length - 1;
    const cursor = makeCursor(
      this.streamId,
      String(endIndex >= 0 ? endIndex : start - 1),
      endIndex >= 0 ? endIndex : 0
    );

    const batch: StreamBatch = {
      events: slice,
      cursor,
      pulledAt: new Date().toISOString() as IsoTimestamp,
    };

    return ok(batch);
  }

  async ack(cursor: CdcCursor): Promise<Result<void>> {
    const lsn = parseInt(cursor.lsn, 10);
    if (isNaN(lsn)) {
      return err(new Error(`Invalid LSN: ${cursor.lsn}`));
    }
    this.offset = lsn + 1;
    return ok(undefined);
  }
}
