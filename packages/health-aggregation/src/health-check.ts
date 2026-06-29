// Port interface for executing a single named health check and returning its result.
import type { Result } from "@veritas/core";
import type { HealthStatus, HealthCheckResult } from "./types.js";

/** Port: a named health check that can be executed on demand. */
export interface HealthCheck {
  readonly name: string;
  readonly timeout: number;
  execute(): Promise<Result<HealthCheckResult, Error>>;
}

/** Factory options for building a HealthCheck from a probe function. */
export interface HealthCheckOptions {
  readonly name: string;
  readonly timeout?: number;
  readonly probe: () => Promise<HealthStatus>;
  readonly metadata?: Record<string, unknown>;
}

/** Create a HealthCheck from a probe function with bounded timeout. */
export function createHealthCheck(opts: HealthCheckOptions): HealthCheck {
  const timeout = opts.timeout ?? 5000;

  return {
    name: opts.name,
    timeout,
    async execute(): Promise<Result<HealthCheckResult, Error>> {
      const start = Date.now();
      try {
        const raceResult = await Promise.race([
          opts.probe(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Health check "${opts.name}" timed out after ${timeout}ms`)), timeout)
          ),
        ]);
        const latencyMs = Date.now() - start;
        const result: HealthCheckResult = {
          name: opts.name,
          status: raceResult,
          latencyMs,
          checkedAt: new Date().toISOString(),
          metadata: opts.metadata ?? {},
        };
        return { ok: true, value: result };
      } catch (cause) {
        const latencyMs = Date.now() - start;
        const result: HealthCheckResult = {
          name: opts.name,
          status: "unhealthy",
          latencyMs,
          checkedAt: new Date().toISOString(),
          error: cause instanceof Error ? cause.message : String(cause),
          metadata: opts.metadata ?? {},
        };
        return { ok: true, value: result };
      }
    },
  };
}
