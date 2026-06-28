// Shard descriptor – immutable value object representing a single shard.

import { z } from "zod";

export const ShardStatusSchema = z.enum(["active", "draining", "offline"]);
export type ShardStatus = z.infer<typeof ShardStatusSchema>;

export const ShardSchema = z.object({
  /** Unique logical shard identifier (e.g. "shard-0"). */
  id: z.string().min(1),
  /** Human-readable label for the shard. */
  label: z.string().min(1),
  /** Connection string or DSN for the underlying data store. */
  dsn: z.string().min(1),
  /** Weight relative to peers (default 1). Higher weight receives more slots. */
  weight: z.number().int().positive().default(1),
  /** Operational status of the shard. */
  status: ShardStatusSchema.default("active"),
  /** Arbitrary metadata (region, tier, etc.). */
  meta: z.record(z.string()).default({}),
});

export type Shard = z.infer<typeof ShardSchema>;

/** Construct a new Shard value, applying defaults. */
export function makeShard(input: Omit<Shard, "weight" | "status" | "meta"> & Partial<Pick<Shard, "weight" | "status" | "meta">>): Shard {
  return ShardSchema.parse(input);
}

/** Return true when the shard can accept new writes. */
export function isWritable(shard: Shard): boolean {
  return shard.status === "active";
}

/** Return true when the shard can be read from. */
export function isReadable(shard: Shard): boolean {
  return shard.status === "active" || shard.status === "draining";
}
