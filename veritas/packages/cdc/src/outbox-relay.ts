// outbox-relay.ts: relay outbox records from messaging to a CDC change stream
import { Result, ok, err, IsoTimestamp, epochToIso } from "@veritas/core";
import { OutboxRecord } from "@veritas/messaging";
import { makeCdcEvent } from "./change-event.js";
import { ChangeStream } from "./stream.js";
import { CdcCursor, CursorStore, InMemoryCursorStore, makeCursor, advanceCursor } from "./cursor.js";

/** Configuration for the outbox relay */
export interface OutboxRelayConfig {
  readonly streamId: string;
  readonly source: string;
  /** How long (ms) to wait between relay ticks when idle */
  readonly pollIntervalMs?: number;
  /** Maximum outbox records to relay per tick */
  readonly batchSize?: number;
}

/** Port: fetch pending outbox records from the outbox store */
export interface OutboxFetcher {
  fetchPending(limit: number, after?: string): Promise<OutboxRecord[]>;
  markRelayed(ids: string[]): Promise<void>;
}

/** Result of a single relay tick */
export interface RelayTickResult {
  readonly relayed: number;
  readonly errors: readonly string[];
  readonly cursor: CdcCursor;
}

/** Relay: reads OutboxRecords and publishes them as CdcEvents */
export class OutboxRelay {
  private readonly stream: ChangeStream;
  private readonly fetcher: OutboxFetcher;
  private readonly cursorStore: CursorStore;
  private readonly config: Required<OutboxRelayConfig>;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    stream: ChangeStream,
    fetcher: OutboxFetcher,
    config: OutboxRelayConfig,
    cursorStore: CursorStore = new InMemoryCursorStore()
  ) {
    this.stream = stream;
    this.fetcher = fetcher;
    this.cursorStore = cursorStore;
    this.config = {
      streamId: config.streamId,
      source: config.source,
      pollIntervalMs: config.pollIntervalMs ?? 1000,
      batchSize: config.batchSize ?? 50,
    };
  }

  /** Execute a single relay tick: fetch → publish → ack */
  async tick(): Promise<Result<RelayTickResult>> {
    const current = await this.cursorStore.load(this.config.streamId);
    const afterId = current?.lsn ?? undefined;

    let records: OutboxRecord[];
    try {
      records = await this.fetcher.fetchPending(this.config.batchSize, afterId);
    } catch (e) {
      return err(new Error(`OutboxRelay fetchPending error: ${String(e)}`));
    }

    if (records.length === 0) {
      const cursor =
        current ?? makeCursor(this.config.streamId, "0", 0);
      return ok({ relayed: 0, errors: [], cursor });
    }

    const relayedIds: string[] = [];
    const errors: string[] = [];

    for (const record of records) {
      const event = makeCdcEvent(
        "outbox",
        "messaging",
        "insert",
        null,
        { id: record.id, topic: record.topic, payload: record.payload, status: record.status },
        { id: record.id },
        this.config.source,
        { occurredAt: record.createdAt }
      );

      const result = await this.stream.publish(event);
      if (result.ok) {
        relayedIds.push(record.id);
      } else {
        errors.push(`Failed to relay outbox record ${record.id}: ${String(result.error)}`);
      }
    }

    if (relayedIds.length > 0) {
      try {
        await this.fetcher.markRelayed(relayedIds);
      } catch (e) {
        errors.push(`markRelayed error: ${String(e)}`);
      }
    }

    const lastId = relayedIds[relayedIds.length - 1] ?? (current?.lsn ?? "0");
    const nextCursor = current
      ? advanceCursor(current, lastId, (current.sequence ?? 0) + relayedIds.length)
      : makeCursor(this.config.streamId, lastId, relayedIds.length);

    await this.cursorStore.save(nextCursor);

    return ok({ relayed: relayedIds.length, errors, cursor: nextCursor });
  }

  /** Start the relay loop (non-blocking) */
  start(): void {
    if (this.running) return;
    this.running = true;
    const schedule = (): void => {
      this.timer = setTimeout(async () => {
        if (!this.running) return;
        await this.tick();
        schedule();
      }, this.config.pollIntervalMs);
    };
    schedule();
  }

  /** Stop the relay loop */
  stop(): void {
    this.running = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
