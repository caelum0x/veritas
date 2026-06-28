// Read/write split — route reads to replicas, writes to primary.
import { ok, err, type Result } from "@veritas/core";
import type { ReplicaNode, ConsistencyLevel, RouteDecision, SplitOptions } from "./types.js";
import { routeRead, routeWrite } from "./router.js";
import type { BaseRepository } from "@veritas/persistence";

export interface ReadWriteSplit {
  /** Select a node for a read operation. */
  selectReadNode(nodes: readonly ReplicaNode[], consistency?: ConsistencyLevel): Result<RouteDecision>;
  /** Select a node for a write operation. */
  selectWriteNode(nodes: readonly ReplicaNode[]): Result<RouteDecision>;
}

/** Create a ReadWriteSplit strategy backed by the router. */
export function createReadWriteSplit(opts: SplitOptions): ReadWriteSplit {
  return {
    selectReadNode(nodes, consistency) {
      const level = consistency ?? opts.defaultConsistency;
      return routeRead(nodes, level, { maxAcceptableLagMs: opts.maxLagMs });
    },
    selectWriteNode(nodes) {
      return routeWrite(nodes);
    },
  };
}

/** Convenience wrappers exported for direct use. */
export { routeRead, routeWrite } from "./router.js";

/** Wrap a repository factory with a read/write split proxy. */
export function wrapRepositoryWithSplit<T, C = Omit<T, "id" | "createdAt" | "updatedAt">, U = Partial<C>>(
  nodes: readonly ReplicaNode[],
  opts: SplitOptions,
  repoFactory: (node: ReplicaNode) => BaseRepository<T, C, U>
): BaseRepository<T, C, U> {
  const split = createReadWriteSplit(opts);

  function readRepo(): Result<BaseRepository<T, C, U>> {
    const r = split.selectReadNode(nodes);
    if (!r.ok) return r as unknown as Result<BaseRepository<T, C, U>>;
    return ok(repoFactory(r.value.node));
  }

  function writeRepo(): Result<BaseRepository<T, C, U>> {
    const r = split.selectWriteNode(nodes);
    if (!r.ok) return r as unknown as Result<BaseRepository<T, C, U>>;
    return ok(repoFactory(r.value.node));
  }

  return {
    async findById(id: string) {
      const r = readRepo();
      if (!r.ok) return r as unknown as ReturnType<BaseRepository<T, C, U>["findById"]>;
      return r.value.findById(id);
    },
    async list(options?: Parameters<BaseRepository<T, C, U>["list"]>[0]) {
      const r = readRepo();
      if (!r.ok) return r as unknown as ReturnType<BaseRepository<T, C, U>["list"]>;
      return r.value.list(options);
    },
    async create(dto: C) {
      const r = writeRepo();
      if (!r.ok) return r as unknown as ReturnType<BaseRepository<T, C, U>["create"]>;
      return r.value.create(dto);
    },
    async update(id: string, dto: U) {
      const r = writeRepo();
      if (!r.ok) return r as unknown as ReturnType<BaseRepository<T, C, U>["update"]>;
      return r.value.update(id, dto);
    },
    async delete(id: string) {
      const r = writeRepo();
      if (!r.ok) return r as unknown as ReturnType<BaseRepository<T, C, U>["delete"]>;
      return r.value.delete(id);
    },
  };
}
