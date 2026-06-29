// Loader — implements the Loader port, writing TransformedRecords to a DataSink in batches.
import { ok, err, isOk } from "@veritas/core";
import type { Result } from "@veritas/core";
import { LoadError } from "./errors.js";
import type { DataSink } from "./sink.js";
import type { Loader, LoadContext, TransformedRecord, LoadResult, EtlRecord } from "./types.js";

export class BatchLoader implements Loader {
  readonly name: string;
  private readonly sink: DataSink<EtlRecord>;
  private readonly stopOnError: boolean;

  constructor(sink: DataSink<EtlRecord>, stopOnError = true) {
    this.name = `batch-loader:${sink.id}`;
    this.sink = sink;
    this.stopOnError = stopOnError;
  }

  async load(
    records: readonly TransformedRecord[],
    ctx: LoadContext,
  ): Promise<Result<LoadResult, LoadError>> {
    const batchSize = ctx.batchSize;
    let loaded = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize) as EtlRecord[];
      const writeResult = await this.sink.write(batch);

      if (!isOk(writeResult)) {
        const msg =
          writeResult.error instanceof Error
            ? writeResult.error.message
            : String(writeResult.error);
        errors.push(msg);
        failed += batch.length;

        if (this.stopOnError) {
          await this.sink.flush().catch(() => undefined);
          return err(
            new LoadError(this.sink.id, {
              message: `Write failed for batch at index ${i}: ${msg}`,
            }),
          );
        }
        continue;
      }

      const stats = writeResult.value;
      loaded += stats.written;
      failed += stats.failed;
      skipped += stats.skipped;
    }

    const flushResult = await this.sink.flush();
    if (!isOk(flushResult)) {
      return err(
        new LoadError(this.sink.id, {
          message: "Flush failed after writing all batches",
          cause: flushResult.error,
        }),
      );
    }

    return ok({ loaded, skipped, failed, errors });
  }
}

export function createBatchLoader(
  sink: DataSink<EtlRecord>,
  stopOnError?: boolean,
): BatchLoader {
  return new BatchLoader(sink, stopOnError);
}
