// Extractor — implements the Extractor port, reading batches from a DataSource as an async iterable.
import { ok, err, isOk } from "@veritas/core";
import type { Result } from "@veritas/core";
import { ExtractError } from "./errors.js";
import type { DataSource } from "./source.js";
import type { Extractor, ExtractContext, RawRecord } from "./types.js";

export interface BatchExtractorConfig {
  readonly source: DataSource;
  readonly batchSize?: number;
}

export class InMemoryExtractor implements Extractor {
  readonly name: string;
  private readonly source: DataSource;
  private readonly batchSize: number;

  constructor(config: BatchExtractorConfig) {
    this.name = `batch-extractor:${config.source.id}`;
    this.source = config.source;
    this.batchSize = config.batchSize ?? 100;
  }

  async *extract(ctx: ExtractContext): AsyncIterable<Result<RawRecord, ExtractError>> {
    if (!this.source.isConnected()) {
      const connectResult = await this.source.connect();
      if (!isOk(connectResult)) {
        yield err(
          new ExtractError(this.source.id, {
            message: `Failed to connect to source: ${this.source.id}`,
          }),
        );
        return;
      }
    }

    const limit = ctx.limit ?? this.batchSize;
    let cursor: string | null = null;
    let yielded = 0;

    while (true) {
      if (ctx.limit != null && yielded >= ctx.limit) break;
      const batchLimit = ctx.limit != null ? Math.min(this.batchSize, ctx.limit - yielded) : this.batchSize;
      const batchResult = await this.source.fetchBatch(cursor, batchLimit);

      if (!isOk(batchResult)) {
        yield err(
          new ExtractError(this.source.id, {
            message: `Batch fetch failed at cursor ${cursor ?? "start"}`,
            cause: batchResult.error,
          }),
        );
        return;
      }

      const { records, cursor: nextCursor } = batchResult.value;
      for (const record of records) {
        yield ok(record);
        yielded++;
      }

      cursor = nextCursor;
      if (cursor === null) break;
    }
  }
}

export function createExtractor(
  source: DataSource,
  batchSize?: number,
): InMemoryExtractor {
  return new InMemoryExtractor({ source, batchSize });
}
