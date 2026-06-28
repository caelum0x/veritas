// In-memory shard registry: stores, queries and updates shard descriptors.

import { z } from "zod";
import { ok, err, Result } from "@veritas/core";
import { ShardNotFoundError, ShardRegistryError } from "./errors.js";

export const ShardStatusSchema = z.enum(["active", "draining", "offline", "migrating"]);
export type ShardStatus = z.infer<typeof ShardStatusSchema>;

export const ShardDescriptorSchema = z.object({
  id: z.string().min(1),
  index: z.number().int().min(0),
  nodeId: z.string().min(1),
  status: ShardStatusSchema,
  /** Inclusive lower bound of the key range (hash ring position or range key). */
  rangeStart: z.string().optional(),
  /** Exclusive upper bound. */
  rangeEnd: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ShardDescriptor = z.infer<typeof ShardDescriptorSchema>;

export interface ShardRegistry {
  register(shard: ShardDescriptor): Result<ShardDescriptor, ShardRegistryError>;
  get(shardId: string): Result<ShardDescriptor, ShardNotFoundError>;
  update(shardId: string, patch: Partial<Omit<ShardDescriptor, "id" | "index" | "createdAt">>): Result<ShardDescriptor, ShardNotFoundError | ShardRegistryError>;
  remove(shardId: string): Result<void, ShardNotFoundError>;
  list(): readonly ShardDescriptor[];
  listByNode(nodeId: string): readonly ShardDescriptor[];
  listByStatus(status: ShardStatus): readonly ShardDescriptor[];
  clear(): void;
}

/** Thread-safe (single-threaded JS) in-memory implementation. */
export class InMemoryShardRegistry implements ShardRegistry {
  readonly #shards = new Map<string, ShardDescriptor>();

  register(shard: ShardDescriptor): Result<ShardDescriptor, ShardRegistryError> {
    if (this.#shards.has(shard.id)) {
      return err(new ShardRegistryError(`Shard already registered: ${shard.id}`));
    }
    const parsed = ShardDescriptorSchema.safeParse(shard);
    if (!parsed.success) {
      return err(new ShardRegistryError(parsed.error.message));
    }
    this.#shards.set(shard.id, Object.freeze({ ...parsed.data }));
    return ok(this.#shards.get(shard.id)!);
  }

  get(shardId: string): Result<ShardDescriptor, ShardNotFoundError> {
    const shard = this.#shards.get(shardId);
    return shard ? ok(shard) : err(new ShardNotFoundError(shardId));
  }

  update(
    shardId: string,
    patch: Partial<Omit<ShardDescriptor, "id" | "index" | "createdAt">>,
  ): Result<ShardDescriptor, ShardNotFoundError | ShardRegistryError> {
    const existing = this.#shards.get(shardId);
    if (!existing) return err(new ShardNotFoundError(shardId));
    const merged = { ...existing, ...patch, id: existing.id, index: existing.index, createdAt: existing.createdAt };
    const parsed = ShardDescriptorSchema.safeParse(merged);
    if (!parsed.success) return err(new ShardRegistryError(parsed.error.message));
    this.#shards.set(shardId, Object.freeze(parsed.data));
    return ok(this.#shards.get(shardId)!);
  }

  remove(shardId: string): Result<void, ShardNotFoundError> {
    if (!this.#shards.has(shardId)) return err(new ShardNotFoundError(shardId));
    this.#shards.delete(shardId);
    return ok(undefined);
  }

  list(): readonly ShardDescriptor[] {
    return [...this.#shards.values()];
  }

  listByNode(nodeId: string): readonly ShardDescriptor[] {
    return this.list().filter(s => s.nodeId === nodeId);
  }

  listByStatus(status: ShardStatus): readonly ShardDescriptor[] {
    return this.list().filter(s => s.status === status);
  }

  clear(): void {
    this.#shards.clear();
  }
}
