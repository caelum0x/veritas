// Upstream registry: manages named upstream service definitions and URL resolution.
import { z } from "zod";

export const LoadBalancingStrategySchema = z.enum(["round-robin", "random", "least-connections"]);
export type LoadBalancingStrategy = z.infer<typeof LoadBalancingStrategySchema>;

export const UpstreamSchema = z.object({
  id: z.string().min(1),
  targets: z.array(z.string().url()).min(1),
  strategy: LoadBalancingStrategySchema.default("round-robin"),
  healthCheckPath: z.string().optional(),
  healthCheckIntervalMs: z.number().int().min(1000).default(30000),
  connectTimeoutMs: z.number().int().min(1).default(5000),
  readTimeoutMs: z.number().int().min(1).default(30000),
  metadata: z.record(z.unknown()).optional(),
});
export type Upstream = z.infer<typeof UpstreamSchema>;

export interface UpstreamState {
  readonly upstream: Upstream;
  /** Mutable counters managed by the registry (not part of the immutable config). */
  readonly counters: { roundRobinIndex: number; connectionCounts: Map<string, number> };
}

export class UpstreamRegistry {
  private readonly store = new Map<string, UpstreamState>();

  register(upstream: Upstream): void {
    const validated = UpstreamSchema.parse(upstream);
    this.store.set(validated.id, {
      upstream: Object.freeze(validated),
      counters: {
        roundRobinIndex: 0,
        connectionCounts: new Map(validated.targets.map((t) => [t, 0])),
      },
    });
  }

  get(id: string): Upstream | undefined {
    return this.store.get(id)?.upstream;
  }

  /** Resolve a target URL for the upstream using the configured strategy. */
  resolve(id: string): string | undefined {
    const state = this.store.get(id);
    if (!state) return undefined;
    const { upstream, counters } = state;
    const { targets, strategy } = upstream;

    switch (strategy) {
      case "round-robin": {
        const idx = counters.roundRobinIndex % targets.length;
        counters.roundRobinIndex = (counters.roundRobinIndex + 1) % targets.length;
        return targets[idx];
      }
      case "random": {
        return targets[Math.floor(Math.random() * targets.length)];
      }
      case "least-connections": {
        let minTarget = targets[0] as string;
        let minCount = counters.connectionCounts.get(minTarget) ?? 0;
        for (const t of targets) {
          const c = counters.connectionCounts.get(t) ?? 0;
          if (c < minCount) {
            minCount = c;
            minTarget = t;
          }
        }
        return minTarget;
      }
      default:
        return targets[0];
    }
  }

  incrementConnections(id: string, target: string): void {
    const state = this.store.get(id);
    if (!state) return;
    const current = state.counters.connectionCounts.get(target) ?? 0;
    state.counters.connectionCounts.set(target, current + 1);
  }

  decrementConnections(id: string, target: string): void {
    const state = this.store.get(id);
    if (!state) return;
    const current = state.counters.connectionCounts.get(target) ?? 0;
    state.counters.connectionCounts.set(target, Math.max(0, current - 1));
  }

  remove(id: string): boolean {
    return this.store.delete(id);
  }

  list(): ReadonlyArray<Upstream> {
    return [...this.store.values()].map((s) => s.upstream);
  }
}
