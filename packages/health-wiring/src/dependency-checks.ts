// Dependency checks: factory helpers for common external dependency health probes.
import type { Logger } from "@veritas/core";
import { withTimeout } from "@veritas/core";
import type { SubsystemProbe } from "./register-checks.js";

/** Options for a TCP reachability dependency check. */
export interface TcpDependencyOptions {
  readonly name: string;
  readonly host: string;
  readonly port: number;
  readonly timeoutMs?: number;
  readonly critical?: boolean;
}

/** Options for an HTTP endpoint dependency check. */
export interface HttpDependencyOptions {
  readonly name: string;
  readonly url: string;
  readonly timeoutMs?: number;
  readonly expectedStatus?: number;
  readonly critical?: boolean;
}

/** Options for a custom dependency check. */
export interface CustomDependencyOptions {
  readonly name: string;
  readonly critical?: boolean;
  readonly timeoutMs?: number;
  readonly probe: () => Promise<boolean>;
  readonly degradedMessage?: string;
  readonly unhealthyMessage?: string;
}

/** Build a SubsystemProbe that checks an HTTP endpoint for an expected status. */
export function httpDependencyProbe(opts: HttpDependencyOptions): SubsystemProbe {
  const timeoutMs = opts.timeoutMs ?? 5000;
  const expectedStatus = opts.expectedStatus ?? 200;

  return {
    name: opts.name,
    critical: opts.critical ?? true,
    degradedMessage: `HTTP dependency "${opts.name}" returned unexpected status`,
    unhealthyMessage: `HTTP dependency "${opts.name}" unreachable`,
    probe: async (): Promise<boolean> => {
      const response = await withTimeout(
        fetch(opts.url, { method: "GET" }),
        timeoutMs,
      );
      return response.status === expectedStatus;
    },
  };
}

/** Build a SubsystemProbe for a custom async probe function. */
export function customDependencyProbe(opts: CustomDependencyOptions): SubsystemProbe {
  const timeoutMs = opts.timeoutMs ?? 5000;

  return {
    name: opts.name,
    critical: opts.critical ?? true,
    degradedMessage: opts.degradedMessage ?? `Dependency "${opts.name}" degraded`,
    unhealthyMessage: opts.unhealthyMessage ?? `Dependency "${opts.name}" unhealthy`,
    probe: (): Promise<boolean> =>
      withTimeout(opts.probe(), timeoutMs),
  };
}

/** Build an always-healthy SubsystemProbe as a placeholder for optional dependencies. */
export function noopDependencyProbe(name: string, critical = false): SubsystemProbe {
  return {
    name,
    critical,
    probe: () => Promise.resolve(true),
  };
}

/** Build a SubsystemProbe that checks process memory usage. */
export function memoryProbe(opts: {
  readonly name?: string;
  readonly maxHeapBytes?: number;
  readonly critical?: boolean;
} = {}): SubsystemProbe {
  const name = opts.name ?? "memory";
  const maxHeapBytes = opts.maxHeapBytes ?? 512 * 1024 * 1024; // 512 MB

  return {
    name,
    critical: opts.critical ?? false,
    degradedMessage: "Heap usage approaching limit",
    unhealthyMessage: "Heap usage exceeds limit",
    probe: (): Promise<boolean> => {
      const used = process.memoryUsage().heapUsed;
      return Promise.resolve(used < maxHeapBytes);
    },
  };
}

/** Build probes for a standard set of named external services. */
export function buildStandardDependencyProbes(
  services: readonly { name: string; url: string; critical?: boolean }[],
  logger: Logger,
): SubsystemProbe[] {
  return services.map((svc) => {
    logger.info("Building HTTP dependency probe", { name: svc.name, url: svc.url });
    return httpDependencyProbe({
      name: svc.name,
      url: svc.url,
      critical: svc.critical ?? true,
    });
  });
}
