// Wraps a BaseRepository pair to route reads to replicas and writes to primary.
import { type Result } from "@veritas/core";
import type { BaseRepository } from "@veritas/persistence";
import type { Page } from "@veritas/core";
import type { QueryOptions } from "@veritas/persistence";
import type { ReplicaNode, ConsistencyLevel } from "./types.js";
import { routeRead, routeWrite, type RouterOptions } from "./router.js";
import { NoHealthyReplicaError } from "./errors.js";

export interface ReadWriteSplitConfig {
  nodes: readonly ReplicaNode[];
  consistency: ConsistencyLevel;
  maxAcceptableLagMs: number;
}

type RepoFactory<T> = (node: ReplicaNode) => BaseRepository<T>;

/**
 * Returns a BaseRepository proxy that sends writes to the primary and reads
 * to a replica selected by the router according to the configured consistency level.
 */
export function wrapWithReadWriteSplit<T, C = Omit<T, "id" | "createdAt" | "updatedAt">, U = Partial<C>>(
  config: ReadWriteSplitConfig,
  repoFactory: RepoFactory<T>
): BaseRepository<T, C, U> {
  const routerOpts: RouterOptions = { maxAcceptableLagMs: config.maxAcceptableLagMs };

  function getWriteRepo(): Result<BaseRepository<T>> {
    const decision = routeWrite(config.nodes);
    if (decision.ok) return { ok: true, value: repoFactory(decision.value.node) };
    return decision as unknown as Result<BaseRepository<T>>;
  }

  function getReadRepo(): Result<BaseRepository<T>> {
    const decision = routeRead(config.nodes, config.consistency, routerOpts);
    if (decision.ok) return { ok: true, value: repoFactory(decision.value.node) };
    return decision as unknown as Result<BaseRepository<T>>;
  }

  return {
    async findById(id: string): Promise<Result<T>> {
      const repoResult = getReadRepo();
      if (!repoResult.ok) return repoResult as unknown as Result<T>;
      return repoResult.value.findById(id);
    },

    async list(options?: QueryOptions<T>): Promise<Result<Page<T>>> {
      const repoResult = getReadRepo();
      if (!repoResult.ok) return repoResult as unknown as Result<Page<T>>;
      return repoResult.value.list(options);
    },

    async create(dto: C): Promise<Result<T>> {
      const repoResult = getWriteRepo();
      if (!repoResult.ok) return repoResult as unknown as Result<T>;
      return (repoResult.value as BaseRepository<T, C, U>).create(dto);
    },

    async update(id: string, dto: U): Promise<Result<T>> {
      const repoResult = getWriteRepo();
      if (!repoResult.ok) return repoResult as unknown as Result<T>;
      return (repoResult.value as BaseRepository<T, C, U>).update(id, dto);
    },

    async delete(id: string): Promise<Result<T>> {
      const repoResult = getWriteRepo();
      if (!repoResult.ok) return repoResult as unknown as Result<T>;
      return repoResult.value.delete(id);
    },
  };
}

export { NoHealthyReplicaError };

/** Alias matching the index.ts public surface. */
export const wrapRepositoryWithSplit = wrapWithReadWriteSplit;
