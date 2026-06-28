// Partitioning strategies for warehouse tables.
import { z } from "zod";

export const PartitionStrategySchema = z.enum([
  "none",
  "range",
  "list",
  "hash",
]);

export type PartitionStrategy = z.infer<typeof PartitionStrategySchema>;

export const PartitionSchema = z.object({
  strategy: PartitionStrategySchema,
  column: z.string().optional(),
  buckets: z.number().int().positive().optional(),
  values: z.array(z.unknown()).optional(),
});

export type Partition = z.infer<typeof PartitionSchema>;

export const noPartition: Partition = { strategy: "none" };

export function rangePartition(column: string): Partition {
  return PartitionSchema.parse({ strategy: "range", column });
}

export function listPartition(column: string, values: unknown[]): Partition {
  return PartitionSchema.parse({ strategy: "list", column, values });
}

export function hashPartition(column: string, buckets: number): Partition {
  return PartitionSchema.parse({ strategy: "hash", column, buckets });
}

export function resolvePartitionKey(
  row: Record<string, unknown>,
  partition: Partition
): string {
  if (partition.strategy === "none") return "__default__";
  const col = partition.column ?? "";
  const val = row[col];
  switch (partition.strategy) {
    case "range":
      return `range__${String(val)}`;
    case "list":
      return `list__${String(val)}`;
    case "hash": {
      const buckets = partition.buckets ?? 1;
      const hash =
        Math.abs(
          String(val)
            .split("")
            .reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0)
        ) % buckets;
      return `hash__${hash}`;
    }
  }
}
