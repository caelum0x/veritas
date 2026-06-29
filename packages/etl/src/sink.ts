// Data sink abstraction — receives transformed records and writes to a target system.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import { LoadError } from "./errors.js";
import type { SinkStats, SinkConfig } from "./types.js";

export interface DataSink<T = unknown> {
  readonly id: string;
  readonly name: string;
  write(records: ReadonlyArray<T>): Promise<Result<SinkStats>>;
  flush(): Promise<Result<void>>;
  close(): Promise<Result<void>>;
}

export class InMemorySink<T = unknown> implements DataSink<T> {
  readonly id: string;
  readonly name: string;
  private readonly _records: T[] = [];
  private _closed = false;

  constructor(config: Pick<SinkConfig, "id" | "name">) {
    this.id = config.id;
    this.name = config.name;
  }

  async write(records: ReadonlyArray<T>): Promise<Result<SinkStats>> {
    if (this._closed) {
      return err(new LoadError(this.id, { message: "Sink is already closed" }));
    }
    for (const r of records) {
      this._records.push(r);
    }
    return ok({ written: records.length, failed: 0, skipped: 0 });
  }

  async flush(): Promise<Result<void>> {
    return ok(undefined);
  }

  async close(): Promise<Result<void>> {
    this._closed = true;
    return ok(undefined);
  }

  get records(): ReadonlyArray<T> {
    return this._records;
  }

  get isClosed(): boolean {
    return this._closed;
  }
}

export class NullSink<T = unknown> implements DataSink<T> {
  readonly id = "null";
  readonly name = "Null Sink";

  async write(records: ReadonlyArray<T>): Promise<Result<SinkStats>> {
    return ok({ written: records.length, failed: 0, skipped: 0 });
  }

  async flush(): Promise<Result<void>> {
    return ok(undefined);
  }

  async close(): Promise<Result<void>> {
    return ok(undefined);
  }
}

export function createInMemorySink<T = unknown>(
  config: Pick<SinkConfig, "id" | "name">,
): InMemorySink<T> {
  return new InMemorySink<T>(config);
}
