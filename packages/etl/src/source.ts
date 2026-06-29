// Data source abstraction — yields raw records from an upstream system for extraction.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { RawRecord, ExtractResult, SourceConfig } from "./types.js";

export interface DataSource {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  connect(): Promise<Result<void>>;
  disconnect(): Promise<Result<void>>;
  fetchBatch(cursor: string | null, limit: number): Promise<Result<ExtractResult>>;
  isConnected(): boolean;
}

export class InMemorySource implements DataSource {
  readonly id: string;
  readonly name: string;
  readonly type = "in-memory";
  private _connected = false;
  private readonly _records: ReadonlyArray<RawRecord>;

  constructor(config: SourceConfig, records: ReadonlyArray<RawRecord> = []) {
    this.id = config.id;
    this.name = config.name;
    this._records = records;
  }

  async connect(): Promise<Result<void>> {
    this._connected = true;
    return ok(undefined);
  }

  async disconnect(): Promise<Result<void>> {
    this._connected = false;
    return ok(undefined);
  }

  async fetchBatch(cursor: string | null, limit: number): Promise<Result<ExtractResult>> {
    if (!this._connected) {
      return err(new Error("Source not connected"));
    }
    const offset = cursor != null ? parseInt(cursor, 10) : 0;
    if (isNaN(offset) || offset < 0) {
      return err(new Error(`Invalid cursor: ${cursor}`));
    }
    const slice = this._records.slice(offset, offset + limit);
    const nextOffset = offset + slice.length;
    const nextCursor = nextOffset < this._records.length ? String(nextOffset) : null;
    return ok({
      records: slice,
      cursor: nextCursor,
      total: this._records.length,
    });
  }

  isConnected(): boolean {
    return this._connected;
  }

  get size(): number {
    return this._records.length;
  }
}

export function createInMemorySource(
  config: SourceConfig,
  records: ReadonlyArray<RawRecord> = [],
): InMemorySource {
  return new InMemorySource(config, records);
}

export function makeRawRecord(
  id: string,
  fields: Record<string, unknown>,
  meta: Record<string, unknown> = {},
): RawRecord {
  return Object.freeze({
    id,
    fields: Object.freeze({ ...fields }),
    meta: Object.freeze({ ...meta }),
  });
}
