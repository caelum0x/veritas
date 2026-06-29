// Bulk loader interface and result types for warehouse ingestion.
import { z } from "zod";
import type { Result } from "@veritas/core";

export const LoadResultSchema = z.object({
  loaded: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
  errors: z.array(z.string()).default([]),
});

export type LoadResult = z.infer<typeof LoadResultSchema>;

export interface BulkLoader {
  load(
    table: string,
    rows: Record<string, unknown>[]
  ): Promise<Result<LoadResult>>;
}

export interface StreamLoader {
  loadStream(
    table: string,
    stream: AsyncIterable<Record<string, unknown>>
  ): Promise<Result<LoadResult>>;
}

export function makeStreamLoader(
  bulkLoader: BulkLoader,
  batchSize = 500
): StreamLoader {
  return {
    async loadStream(table, stream) {
      let batch: Record<string, unknown>[] = [];
      let totalLoaded = 0;
      let totalRejected = 0;
      const allErrors: string[] = [];

      for await (const row of stream) {
        batch.push(row);
        if (batch.length >= batchSize) {
          const res = await bulkLoader.load(table, batch);
          if (!res.ok) return res;
          totalLoaded += res.value.loaded;
          totalRejected += res.value.rejected;
          allErrors.push(...res.value.errors);
          batch = [];
        }
      }

      if (batch.length > 0) {
        const res = await bulkLoader.load(table, batch);
        if (!res.ok) return res;
        totalLoaded += res.value.loaded;
        totalRejected += res.value.rejected;
        allErrors.push(...res.value.errors);
      }

      const { ok } = await import("@veritas/core");
      return ok({
        loaded: totalLoaded,
        rejected: totalRejected,
        errors: allErrors,
      });
    },
  };
}
